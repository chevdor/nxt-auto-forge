#!/usr/local/bin/node

var NXT       = require('nxt-api');
var config    = require('./config.js');
var t         = config.target;
var API       = new NXT.API(t.url);
var stdio     = require('stdio');
var date      = new Date();
var fs        = require('fs');
var http      = require('http');
var pjson     = require("./package.json");
var stateFile = './state.json';

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

Array.prototype.equals = function(array) { // jshint ignore:line
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time 
    if (this.length !== array.length)
        return false;

    for (var i = 0, l = this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i]))
                return false;
        } else if (this[i] !== array[i]) {
            // Warning - two different object instances 
            // will never be equal: {x:20} != {x:20}
            return false;
        }
    }
    return true;
};

Array.prototype.contains = function(obj) { // jshint ignore:line
    var i = this.length;
    while (i--) {
        if (this[i] === obj) {
            return true;
        }
    }
    return false;
};

Array.prototype.same = function(obj) { // jshint ignore:line
    var i = this.length;
    while (i--) {
        if (obj.contains(this[i])) {
            // todo
        }
    }
    return false;
};

Array.prototype.remove = function(elem) { // jshint ignore:line
    var index = this.indexOf(elem);
    if (index > -1) {
        this.splice(index, 1);
    }
};

if (ops.version) {
    console.log(pjson.name + ' version ' + pjson.version);
    process.exit(0);
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
