/* jshint esversion: 6, node: true */
/* globals console, require, process */

"use strict";

Array.prototype.shuffle = () => {
    var input = this;

    for (var i = input.length-1; i >=0; i--) {

        var randomIndex = Math.floor(Math.random()*(i+1));
        var itemAtIndex = input[randomIndex];

        input[randomIndex] = input[i];
        input[i] = itemAtIndex;
    }
    return input;
};

const Botkit = require('botkit');
const Spotify = require('node-spotify-api');

const devFlag = process.argv.slice(2)[0] === '-dev';
const config = require(devFlag ? './config_dev.js' : './config.js');

// SOUNDWAVE
var soundwave = {
    config: config,
    controller: null,
    bot: null,
    spotifyApi: null,
    poll: null,
    wakeUp: null,
    channelId: null,
    lastTrackId: null,
    queue: [],
};

// MENUBAR
const { menubar } = require('menubar');
const { app, Menu, Tray } = require('electron');
const path = require('path');

const iconPath = path.join(__dirname, 'assets/IconTemplate.png');

var mb;

app.on('ready', () => {

    const tray = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([{
        label: 'Reconnect',
        click: () => reconnect()
    },
    {
        label:'Quit',
        click: () => quit()
    }]);

    tray.setContextMenu(contextMenu);

    mb = menubar({
        tray
    });

    mb.on('ready', () => {
        console.log('Menubar app is ready.');
        init();
    });

});

function reconnect() {
    initBot();
    mb.hideWindow();
}

async function quit() {
    await soundwave.bot.say({
        text: ":robot_face: Going offline",
        channel: soundwave.channelId
    }, () => app.quit());
}



soundwave.controller = Botkit.slackbot({
    debug: devFlag,
    clientSigningSecret: soundwave.config.slack.signingSecret
});

soundwave.controller.on('rtm_open', () => {
    console.log('RTM open...');
    const spotifyHelpers = require('./features/spotifyHelpers')(soundwave);
    require('./features/commands')(soundwave);
    require('./features/events')(soundwave);

    // Poll track change
    if(soundwave.poll) clearInterval(soundwave.poll);
    soundwave.poll = setInterval(() => {
        spotifyHelpers.checkRunning().then(function(running) {
            if(running) {
                spotifyHelpers.checkForTrackChange();
            } else {
                if(soundwave.lastTrackId !== null) {
                    bot.say({
                        text: 'Oh no! Where did Spotify go? It doesn\'t seem to be running 😨',
                        channel: soundwave.channelId
                    });
                    soundwave.lastTrackId = null;
                }
            }
        });
    }, 5000);

    // Wake up!
    if(soundwave.wakeUp) clearInterval(soundwave.wakeUp);
    soundwave.wakeUp = setInterval(() => {
        console.log('Reconnecting to Slack RTM for good measure');
        initBot();
    }, 1200000);
});

soundwave.controller.on('rtm_close', (error) => {
    console.log('RTM closed...');
    if (error && error.Error) {
        console.log('RTM closed, reinit');
        initBot();
    }
});

function initBot() {
    if(soundwave.bot) soundwave.bot.closeRTM();
    soundwave.bot = soundwave.controller.spawn({
        token: soundwave.config.slack.botToken,
        retry: 20
    }).startRTM(function(err) {
        if (err) {
            console.log('Could not connect to Slack:', err);
        }
    });
}

function initSpotify() {
    soundwave.spotifyApi = new Spotify({
      id: soundwave.config.spotify.clientId,
      secret: soundwave.config.spotify.clientSecret
    });
}

function init() {
    initBot();
    initSpotify();

    const slackHelpers = require('./features/slackHelpers')(soundwave);

    soundwave.bot.api.channels.list({}, function(err, response) {
        if(err) {
            throw new Error(err);
        }

        if (response.hasOwnProperty('channels') && response.ok) {
            var total = response.channels.length;
            for (var i = 0; i < total; i++) {
                var channel = response.channels[i];
                if(slackHelpers.verifyChannel(channel)) {
                    soundwave.bot.say({
                        text: ":robot_face: Online",
                        channel: soundwave.channelId
                    });
                    return;
                }
            }
        }
    });

    soundwave.bot.api.groups.list({}, function(err, response) {
        if(err) {
            throw new Error(err);
        }

        if (response.hasOwnProperty('groups') && response.ok) {
            var total = response.groups.length;
            for (var i = 0; i < total; i++) {
                var channel = response.groups[i];
                if(slackHelpers.verifyChannel(channel)) {
                    return;
                }
            }
        }
    });
}