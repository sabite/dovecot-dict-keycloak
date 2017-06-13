#!/usr/bin/env node
'use strict'
const qs = require('querystring')
    , fs = require('fse')
    , url = require('url')
    , net = require('net')
    , path = require('path')
    , fetch = require('node-fetch')
    , split2 = require('split2')
    , isUUID = require('is-uuid');

const config = require('./config');
const keycloak = require('./keycloak');
const verify = require('./verify')


function parse(line) {
    return {cmd: line[0], args: line.slice(1).split('\t')}
}

function getUser(email, sock) {
    return keycloak.getUser(email)
        .then(user => {
            if (!user) return null;

            return {
                user: user.id,
                uid: config.user.uid,
                gid: config.user.gid,
                home: `${config.user.home_prefix}/${user.id}`,
            }
        });
}

function checkPassword(id, mech, password, sock) {
    return keycloak.getUser(id)
        .then((user) => {
            switch (mech) {
                case "XOAUTH2":
                case "OAUTHBEARER":
                    return verify.token(user, password);
                case "PLAIN":
                    return verify.appPass(user, password)
                        .then(valid => {
                            if (!valid)
                                return verify.saml2(user, password);

                            return valid;
                        });
                    break;
                default:
                    return Promise.reject(new Error("Unknown auth mech"));
            }
        })
        .then(user => {
            if (!user) return null;

            return {
                user: user.id,
                nopassword: 'y',
                userdb_uid: config.user.uid,
                userdb_gid: config.user.gid,
                userdb_home: `${config.user.home_prefix}/${user.id}`,
            }
        });
}

function lookup(key, sock) {
    const [name, type, rest] = key.split('/', 3);

    let res = null;
    switch (type) {
        case 'userdb':
            res = getUser(rest);
        break;

        case 'passdb':
            let [user, mech, pass ] = rest.split('/', 3);
            console.log("USER: %s, pass: blah", user);
            res = checkPassword(user, mech, pass);
        break;

        default:
            console.log(JSON.stringify([name, type]));
            res = Promise.reject(`unknown key type: ${type}`)
    }
    res.then((res) => {
        if (res) {
            sock.write(`O ${JSON.stringify(res)}\n`)
        } else {
            sock.write('N\n');
        }
    }, (err) => {
        console.log('ERR for key "%s"', key, err);
        sock.write('F\n');
    });
}

const server = net.createServer();
server.on('connection', function(socket) {
    socket.setEncoding('utf-8');

    socket.pipe(split2('\n', parse))
    .on('data', (req) => {
        console.log(JSON.stringify(req))
        switch (req.cmd) {
            case 'H':
                console.log("Got version %d.%d client", ...req.args)
            break;

            case 'L':
                lookup(req.args[0], socket);
            break;
        }
    })
    .on('close', () => socket.end())
});

let ensureParent = null;
if (!fs.exists(path.dirname(config.socket.path))) {
    const dir = path.dirname(config.socket.path);
    ensureParent = fs.mkdir(dir)
    .then(() => {
        return fs.chown(dir, config.socket.user, config.socket.group);
    });
} else {
    ensureParent = Promise.resolve();
}

ensureParent.then(() => {
    server.listen(config.socket.path, function() {
        //process.setgid(config.group)
        //process.setuid(config.user)
        console.log("Listening at %s", config.socket.path)
    })
})
