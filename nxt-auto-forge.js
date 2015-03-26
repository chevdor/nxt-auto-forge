#!/usr/local/bin/node

var NXT       = require('nxt-api');
var stdio     = require('stdio');
var date      = new Date();
var fs        = require('fs');
var http      = require('http');
var pjson     = require("./package.json");
var stateFile = process.env.HOME + '/state.json';

require('./lib/array.js');

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

if (ops.version) {
    console.log(pjson.name + ' version ' + pjson.version);
    process.exit(0);
}

var config = require('./config.js');
var t = config.target;
var API = new NXT.API(t.url);

var prevState;
try {
    //console.log('state file: ' + stateFile);
    prevState = require(stateFile);
    //console.log(prevState);
} catch (e) {
    prevState = null;
    console.log(date.toISOString() +
        ' - State could not be loaded. Initialized.');
}


function appendLog(msg, file) {
    fs.appendFile(file, msg + '\n', {
            encoding: 'utf8'
        },
        function(err) {
            if (err) throw err;
        });
}

function webhook(hook) {
    http.get({
        host: hook.url,
        port: hook.port,
        path: hook.path
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

function startForging(dat) {
    API.startForging({
        account: t.account,
        secretPhrase: t.secretPhrase,
        adminPassword: t.adminPassword
    }).then(function() {
        var msg = date.toISOString() +
            ' - HEY! - Good I was there. ' +
            dat.accountRS + ' is forging again!';

        console.log(msg);

        if (config.log.enabled) {
            appendLog(msg, config.log.file);
        }

        if (config.webhookForgingStarted.enabled) {
            webhook(config.webhookForgingStarted);
        }
    });
}

function alreadyForging(dat) {
    var msg = date.toISOString() +
        ' - GOOD - ' + dat.accountRS + ' is already forging. Keep it up!';

    console.log(msg);

    if (config.log.enabled) {
        appendLog(msg, config.log.file);
    }
}

function checkState(curr, prev) { // jshint ignore:line
    if (prev === null) return;

    //console.log('Checking prev' + JSON.stringify(prevState));

    if ((curr.forgedBalanceNQT > prev.forgedBalanceNQT) &&
        config.webhookForgedBlock.enabled) {
        var forgedAmount =
            (curr.forgedBalanceNQT - prev.forgedBalanceNQT) / 1e8;
        console.log(date.toISOString() + ' - You forged ' +
            forgedAmount + ' NXT!');
        if (config.webhookForgedBlock.enabled) {
            webhook(config.webhookForgedBlock);
        }
    }

    if ((!curr.lessorsRS.equals(prev.lessorsRS)) &&
        config.webhookForgedLessorsWarning.enabled) {
        console.log(date.toISOString() + ' - Lessors have changed');
        //console.log(curr.lessorsRS);
        //console.log(prev.lessorsRS);
        if (config.webhookForgedLessorsWarning.enabled) {
            webhook(config.webhookForgedLessorsWarning);
        }
    }
}

API.getAccount({
    account: t.account,
    adminPassword: t.adminPassword
}).then(function(dat) {
        console.log(date.toISOString() + ' - Checking ' + t.url);

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
                startForging(dat);
            } else {
                alreadyForging(dat);
            }
        });
    },
    function(e) {
        console.log(e);
    });
