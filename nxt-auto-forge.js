#!/usr/local/bin/node

var NXT    = require('nxt-api');
var config = require('./config.js');
var t      = config.target;
var API    = new NXT.API(t.url);
var stdio  = require('stdio');
var date   = new Date();
var fs     = require('fs');
var http   = require('http');

var ops = stdio.getopt({
    'status': {
        key: 's',
        args: 1
    }
});

var options = {
    host: config.webhook.url,
    port: config.webhook.port,
    path: config.webhook.path
};

function appendLog(msg, file) {
    fs.appendFile('nxt-auto-forge.log', msg + '\n', encoding = 'utf8', function(err) {
        if (err) throw err;
    });
}

function webhook() {
    http.get(options, function(res) {
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

API.getAccount({
    account: t.account
}).then(function(dat) {
        var forged = dat.forgedBalanceNQT / 1e8;

        if (ops.status) {
            //console.log(dat);
            console.log('Account:            ' + dat.accountRS + ' / ' + dat.account);
            console.log('Effective balance:  ' + dat.effectiveBalanceNXT + ' NXT');
            console.log('Forged balance:     ' + forged + ' NXT');
            console.log('Lessors:            ' + JSON.stringify(dat.lessorsRS));
            console.log();
        }
        API.getForging({
            account: t.account
        }).then(function(data) {
            var forging = data.generators.length > 0;
            var msg;

            //console.log(data);
            //console.log('Forging: ' + forging);

            if (!forging) {
                API.startForging({
                    account: t.account,
                    secretPhrase: t.secretPhrase
                }).then(function(fdata) {
                    msg = date.toISOString() + ' - HEY! - Good I was there. You are forging again! You forged ' + forged + ' NXT so far.';

                    console.log(msg);

                    if (config.log.enabled) {
                        appendLog(msg, config.log.file);
                    }

                    if (config.webhook.enabled) {
                        webhook();
                    }
                });
            } else {
                msg = date.toISOString() + ' - GOOD - You are already forging. Keep it up! You forged ' + forged + ' NXT so far.';
                console.log(msg);

                if (config.log.enabled) {
                    appendLog(msg, config.log.file);
                }
            }
        });
    },
    function(e) {
        console.log(rs + ' unknown.');
    });
