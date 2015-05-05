'use-strict';

var fs = require('fs'),
    http = require('http');
var config = JSON.parse(fs.readFileSync('config.json', 'UTF-8'));
var pastebin = require('pastebin')(config.pastebin.dev_key);

function pastebinPost(ip, done) {
    pastebin.login(config.pastebin.user, config.pastebin.pass, function(err, user_key) {
        if (err) {
            done(new Error("Could not log in to pastebin."));
            return;
        }
        pastebin.new({
            title: config.server_name + "'s IP Address",
            content: ip,
            user_key: user_key,
            privacy: 2
        }, function(err, ret) {
            if (err) {
                done(new Error("Could not create pastebin post."));
                return;
            }
            done();
        });
    });
}

var lastKnownIP = null;

function getExternalIp(cb) {
    var options = {
        host: 'icanhazip.com',
        path: ''
    };

    var callback = function(response) {
        var str = '';

        response.on('data', function(chunk) {
            str += chunk;
        });

        response.on('error', function() {
            cb(new Error("HTTP Request Failed."));
        });

        response.on('end', function() {
            cb(null, str.trim());
        });
    };

    http.request(options, callback).end();
}

var elapsedTime = 0;
var interval = 1000;

function scheduleNextIteration() {
    elapsedTime = 0;
    timer();
}

function timer() {
    if (elapsedTime >= config.check_every_seconds * 1000) {
        iteration();
        return;
    }
    elapsedTime += interval;
    setTimeout(timer, interval);
}

function iteration() {
    getExternalIp(function(err, ip) {
        if (err) {
            console.log(err);
            scheduleNextIteration();
            return;
        }
        if (!!lastKnownIP && lastKnownIP === ip) {
            scheduleNextIteration();
            return;
        }
        lastKnownIP = ip;
        pastebinPost(ip, function(err) {
            if (err) {
                console.log(err);
            }
            scheduleNextIteration();
        });
    });
}

iteration();