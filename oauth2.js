'use strict'
const qs = require('querystring')
    , url = require('url')
    , fetch = require('node-fetch');

const config = require('./config');

const getConfig = (function() {
    let promised = null;

    return function getConfig() {
        if (promised) return promised;

        const res = fetch(config.openid_configuration)
        .then(res => res.json());

        //res.then((openid_config) => {
        //    _config = openid_config;
        //});
        return res;
    }
})();

const getTokens = function getTokens() {
    return getConfig().then((openid_config, b) => {
        const u = url.parse(openid_config.token_endpoint);
        u.auth = `${config.client_id}:${config.client_secret}`

        const body = qs.stringify({
            grant_type: "client_credentials",
            //scope: "offline_access",
        });

        const headers = {
            "Content-type": "application/x-www-form-urlencoded"
        };

        const now = Date.now();
        return fetch(u, {method: "POST", body, headers})
        .then(res => res.json())
        .then(tokens => {
            tokens.expires_at = tokens.expires_in*1000 + now;
            if (tokens.refresh_expires_in) {
                tokens.refresh_expires_at = tokens.refresh_expires_in*1000 + now;
            } else {
                tokens.refresh_expires_at = Infinity
            }

            return tokens
        })
    });
}

const refreshTokens = function refreshTokens(refresh_token) {
    const now = Date.now();

    return getConfig()
    .then(openid_config => {
        const body = qs.stringify({
            grant_type: "refresh_token",
            client_id: config.client_id,
            client_secret: config.client_secret,
            refresh_token: refresh_token,
        });

        const headers = {
            "Content-type": "application/x-www-form-urlencoded"
        };

        return fetch(openid_config.token_endpoint, {method: "POST", body, headers})
    })
    .then(res => res.json())
    .then(tokens => {
        tokens.expires_at = tokens.expires_in*1000 + now;
        if (tokens.refresh_expires_in) {
            tokens.refresh_expires_at = tokens.refresh_expires_in*1000 + now;
        } else {
            tokens.refresh_expires_at = Infinity
        }

        return tokens
    });
}

const getAccessToken = (function() {
    let tokens = null;

    return function getAccessToken() {
        if (tokens == null) {
            tokens = getTokens()
        }

        return tokens.then(({access_token, refresh_token, expires_at, refresh_expires_at})  => {
            if (expires_at < Date.now()) {
                if (refresh_expires_at < Date.now()) {
                    tokens = getTokens();
                } else {
                    tokens = refreshTokens(refresh_token)
                }
                return tokens.then(tokens => tokens.access_token)
            }
            console.log('got')
            return access_token
        })
    }
})();


module.exports = {
    getAccessToken,
    getConfig
}
