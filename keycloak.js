#!/opt/local/bin/node
'use strict'
const qs = require('querystring')
    , fetch = require('node-fetch')
    , isUUID = require('is-uuid').anyNonNil
    , isEmail = require('nice-is-email');

const config = require('./config');

const getAccessToken = require('./oauth2').getAccessToken;


function fetchApi(path, init) {
    return getAccessToken()
    .then(access_token => {
        if(!init) init = {headers: {}};
        init.headers.Authorization = `Bearer ${access_token}`
        return fetch(`${config.base_url}/${path}`, init);
    })
}

function parse(line) {
    return {cmd: line[0], args: line.slice(1).split('\t')}
}

function getOne(many) {
    if (many.length == 0) {
        return null;
    } else if (many.length == 1) {
        return many[0];
    } else {
        throw new Error("Got more than one");
    }
}

function getUserById(uuid, sock) {
    return fetchApi(`users/${uuid}`)
        .then(res => res.json())
}
function getUserByEmail(email, sock) {
    return fetchApi(`users?${qs.stringify({email})}`)
        .then(res => res.json())
        .then(users => getOne(users));
}
function getUserByUsername(username, sock) {
    return fetchApi(`users?${qs.stringify({username})}`)
        .then(res => res.json())
        .then(users => getOne(users));
}

function getUser(userMailOrId) {
    if (isUUID(userMailOrId))
        return getUserById(userMailOrId);
    else if (isEmail(userMailOrId))
        return getUserByEmail(userMailOrId);
    else return getUserByUsername(userMailOrId);
}

module.exports = {
    getUserById,
    getUserByEmail,
    getUserByUsername,
    getUser,
}

