#!/usr/local/bin/node

var NXT = require('nxt-api');
var config = require('./config.js');
var t = config.target;
var API = new NXT.API(t.url);
var stdio = require('stdio');
var date = new Date();
var fs = require('fs');
var http = require('http');
var pjson = require("./package.json");
var stateFile = 'state.json';

var ops = stdio.getopt({
    'status': {
        key: 's',
        args: 1
    },
    'version': {
        key: 'v',
        args: 1
    }
});

var prevState;
try {
    prevState = require(stateFile);
} catch (e) {
    prevState = null;
}

function appendLog(msg, file) {
    fs.appendFile(file, msg + '\n', {
            encoding: 'utf8'
        },
        function(err) {
            if (err) throw err;
        });
}

function webhook() {
    http.get({
        host: config.webhookForgingStarted.url,
        port: config.webhookForgingStarted.port,
        path: config.webhookForgingStarted.path
    }, function(res) {
        if (res.statusCode !== 200) {
            console.log("Got response: " + res.statusCode);
            res.on("data", function(chunk) {
                console.log("BODY: " + chunk);
            });
        }
    }).on('error', function(e) {
        console.log("Got error: " + e.message);
    });
}

function logStatus(dat) {
    var forged = dat.forgedBalanceNQT / 1e8;
    //console.log(dat);
    console.log('Account:            ' + dat.accountRS + ' / ' + dat.account);
    console.log('Effective balance:  ' + dat.effectiveBalanceNXT + ' NXT');
    console.log('Forged balance:     ' + forged + ' NXT');
    console.log('Lessors:            ' + JSON.stringify(dat.lessorsRS));
    console.log();
}

function startForging() {
    API.startForging({
        account: t.account,
        secretPhrase: t.secretPhrase,
        adminPassword: t.adminPassword
    }).then(function() {
        var msg = date.toISOString() +
            ' - HEY! - Good I was there. You are forging again!';

        console.log(msg);

        if (config.log.enabled) {
            appendLog(msg, config.log.file);
        }

        if (config.webhookForgingStarted.enabled) {
            webhook();
        }
    });
}

function alreadyForging() {
    var msg = date.toISOString() +
        ' - GOOD - You are already forging. Keep it up!';

    console.log(msg);

    if (config.log.enabled) {
        appendLog(msg, config.log.file);
    }
}

function checkState(curr, prev) {
    if (prev === null) return;

    if ((curr.forgedBalanceNQT > prev.forgedBalanceNQT) &&
        config.webhookForgedBlock.enabled) {
        console.log('you forged!');
    }

    if ((curr.lessorsRS !== prev.lessorsRS) &&
        config.webhookForgedLessorsWarning.enabled) {
        console.log('lessors have changed');
    }
}

if (ops.version) {
    console.log(pjson.name + ' version ' + pjson.version);
    process.exit(0);
}

API.getAccount({
    account: t.account,
    adminPassword: t.adminPassword
}).then(function(dat) {
        if (ops.status) {
            logStatus(dat);
        }

        fs.writeFile(stateFile, JSON.stringify(dat),
            function(err) {
                if (err) throw err;
            });

        checkState(dat, prevState);

        API.getForging({
            account: t.account,
            adminPassword: t.adminPassword
        }).then(function(data) {
            if (data.generators.length <= 0) {
                startForging();
            } else {
                alreadyForging();
            }
        });
    },
    function(e) {
        console.log(e);
    });
