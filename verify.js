#!/usr/bin/env node
'use strict'
const qs = require('querystring')
    , crypto = require('crypto')
    , zlib = require('zlib')
    , fetch = require('node-fetch')
    , split2 = require('split2')
    , isUUID = require('is-uuid');

const config = require('./config');
const {getAccessToken, getConfig} = require('./oauth2');

function token(user, token) {
    return getConfig()
        .then(openidc => {
            const ep = openidc.token_introspection_endpoint;
            return getAccessToken().then(access_token => {
                return fetch(ep, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${access_token}`
                    },
                    body: qs.stringify({token})
                })
            });
        })
        .then(res => res.json())
        .then(introspected => {
            const {
                active,
                scope,
                username,
            } = introspected;
            if (!active)
                return null;

            let scopes = scope.split(' ');
            if (scpes.indexOf(config.scopes.normal) == -1)
                return null;

            if (username != user.username) {
                return null;
            }

            return user;
        });
}

function appPass(user, pass) {
    const h = crypto.createHash('sha256');
    h.update(pass);

    const hashPass = h.digest('hex');

    for (let pass of user.attributes.app_passwords) {
        if (pass == hashPass) {
            return user;
        }
    }

    return null;
}

function saml2(user, assertion) {
    const xml = new Promise((resolve, reject) => {
        zlib.inflate(Buffer(assertion, 'base64'), (err, res) => {
            if (err)
                return reject(err);
            else
                resolve(res.toString('utf-8'));
        });
    });

    xml.then(xml => {
        console.log(xml)
    });
}

module.exports = {
    token,
    appPass,
    saml2,
}
