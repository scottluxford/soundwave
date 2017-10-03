/* jshint esversion: 6, node: true */
/* globals console, require, process */

"use strict";

// BANNED WORDS
let bannedWords = [
    'wiggles',
    'bieber'
];

// BANNED USERS
let bannedUsers = [];

// MENUBAR
let menubar = require('menubar');

let mb = menubar({
    width: 128,
    height: 60,
    windowPosition: 'trayLeft',
    preloadWindow: true
});

mb.on('ready', function ready () {
  init();
});

mb.on('after-create-window', function() {
    //mb.window.openDevTools();
});

// IPC
const {ipcMain} = require('electron');

ipcMain.on('reconnect', function() {
    initBot();
    mb.hideWindow();
});

ipcMain.on('quit', function() {
    if(channelId) {
        bot.say({
            text: "Going offline :wave:",
            channel: channelId
        });
    }
    mb.app.quit();
});

let devFlag = process.argv.slice(2);
let setup = require(devFlag[0] === '-dev' ? './bot_setup_dev.js' : './bot_setup.js');

let Botkit = require('botkit');
let Spotify = require('spotify-node-applescript');

let request = require('request');
let os = require('os');
let q = require('q');

let trackFormatSimple = (track) => `_${track.name}_ by *${track.artist}*`;
let trackFormatDetail = (track) => `_${track.name}_ by _${track.artist}_ is from the album *${track.album}*`;
let getArtworkUrlFromTrack = (track, callback) => {
    let trackId = track.id.split(':')[2];

    spotifyApi
      .request('https://api.spotify.com/v1/tracks/' + trackId)
      .then(function(response) {
          if(response && response.album && response.album.images && response.album.images[1]) {
              callback(response.album.images[1].url);
          } else {
              callback('');
          }
      })
      .catch(function(err) {
        console.error('Error occurred getArtworkUrlFromTrack: ' + err);
      });

};

var lastTrackId;
var channelId;
var stopped = false;
var queue = [];

Array.prototype.shuffle = function() {
    var input = this;

    for (var i = input.length-1; i >=0; i--) {

        var randomIndex = Math.floor(Math.random()*(i+1));
        var itemAtIndex = input[randomIndex];

        input[randomIndex] = input[i];
        input[i] = itemAtIndex;
    }
    return input;
};

var controller = Botkit.slackbot({
    debug: false
});

var bot;
var initBot = () => {
    if(bot) bot.closeRTM();
    bot = controller.spawn({
        token: setup.slackBotToken,
        retry: 20
    }).startRTM(function(err,bot,payload) {
        if (err) {
            console.log('Could not connect to Slack:', err);
        }
    });
};

controller.on('rtm_close', function(error) {
    console.log('RTM closed...');
    if (error && error.Error) {
        console.log('RTM closed, reinit');
        initBot();
    }
});

var spotifyApi;
var initSpotify = () => {
    var Spotify = require('node-spotify-api');

    spotifyApi = new Spotify({
      id: setup.spotifyClientId,
      secret: setup.spotifyClientSecret
    });
};

var init = () => {
    initBot();
    initSpotify();

    bot.api.channels.list({}, function(err, response) {
        if(err) {
            throw new Error(err);
        }

        if (response.hasOwnProperty('channels') && response.ok) {
            var total = response.channels.length;
            for (var i = 0; i < total; i++) {
                var channel = response.channels[i];
                if(verifyChannel(channel)) {
                    return;
                }
            }
        }
    });

    bot.api.groups.list({}, function(err, response) {
        if(err) {
            throw new Error(err);
        }

        if (response.hasOwnProperty('groups') && response.ok) {
            var total = response.groups.length;
            for (var i = 0; i < total; i++) {
                var channel = response.groups[i];
                if(verifyChannel(channel)) {
                    return;
                }
            }
        }
    });
};

controller.hears(['^help$'],'direct_message,direct_mention,mention,ambient', function(bot, message) {
    bot.reply(message,'You can say these things to me:\n'+
        'next - Fed up with the track? Skip it.\n'+
        'previous - Want to hear that again? Just ask.\n'+
        'start again/over - Missed the beginning of the track? No problem.\n'+
        'play / pause - plays or pauses the music\n'+
        'volume up / down - increases / decreases the volume\n'+
        'set volume [1-100] - sets the volume\n'+
        'status - I will tell information about the Spotify player\n'+
        'info - I will tell you about this track\n'+
        'detail - I will tell you more about this track\n' +
        'request `track|album|playlist|artist` `name` - `artist` (if track or album)\n' +
        'queue - display the currently queued tracks (alpha feature - won\'t correctly display artist, playlist or album requests in the queue)\n' +
        'shuffle queue - Shuffle the queue'
    );
});

controller.hears(['hello','hi','hey','greetings'],'direct_message,direct_mention,mention',function(bot,message) {
    getUser(message.user, function(user) {
        bot.reply(message, 'Hey ' + user.profile.first_name + '!');
    });
});

controller.hears(['^shuffle$'],'direct_message,direct_mention,mention,ambient', function(bot, message) {
    Spotify.toggleShuffling(function() {
        Spotify.isShuffling(function(err, shuffling){
            bot.reply(message, "Shuffle *" + (shuffling ? ':white_check_mark:' : ':no_entry:') + "*");
        });
    });
});

controller.hears(['^repeat$'],'direct_message,direct_mention,mention,ambient', function(bot, message) {
    Spotify.toggleRepeating(function() {
        Spotify.isRepeating(function(err, repeating){
            bot.reply(message, "Repeat *" + (repeating ? ':white_check_mark:' : ':no_entry:') + "*");
        });
    });
});

controller.hears(['what is this','what\'s this','info','playing','what is playing','what\'s playing'],'direct_message,direct_mention,mention', function(bot, message) {
    Spotify.getTrack(function(err, track){
        if(track) {
            lastTrackId = track.id;
            bot.reply(message,'This is ' + trackFormatSimple(track) + '!');
        }
    });
});

controller.hears(['detail'],'direct_message,direct_mention,mention', function(bot, message) {
    Spotify.getTrack(function(err, track){
        if(track) {
            lastTrackId = track.id;
            getArtworkUrlFromTrack(track, function(artworkUrl) {
                bot.reply(message, trackFormatDetail(track)+"\n"+artworkUrl);
            });
        }
    });
});

controller.hears(['^status$'],'direct_message,direct_mention,mention,ambient', function(bot, message) {
    Spotify.getState(function(err, stateResult) {
        q.all([checkRunning(), stateResult, checkRepeating(), checkShuffling()]).then(function(results) {
            var running = results[0],
                state = results[1],
                repeating = results[2],
                shuffling = results[3];

                console.log(results);

            var reply = "Current status:\n";

            if(running && state ) {
                reply += "    Spotify is *running*\n"+
                    "    Repeat: *" + (repeating ? 'On' : 'Off') + "*\n"+
                    "    Shuffle: *" + (shuffling ? 'On' : 'Off') + "*\n"+
                    "    Volume: *" + state.volume + "*\n"+
                    "    Position in track: *" + state.position + "*\n"+
                    "    State: *" + state.state + "*\n";
            }
            else {
                reply += "Spotify is *NOT* running";
            }

            bot.reply(message, reply);
        });
    });
});

controller.hears(['^next','^skip'],'direct_message,direct_mention,mention,ambient', function(bot, message) {
    Spotify.next(function(err, track){
        bot.reply(message, 'Skipping to the next track...');
    });
});

controller.hears(['^previous','^prev'],'direct_message,direct_mention,mention,ambient', function(bot, message) {
    var currentTrack;
    Spotify.getTrack(function(err, track){
        if(track) {
            currentTrack = track.id;

            (function previousTrack() {
    Spotify.previous(function(err, track){
                    Spotify.getTrack(function(err, track){
                        if(track) {
                            if(track.id !== currentTrack) {
        bot.reply(message, 'Skipping back to the previous track...');
                            }
                            else {
                                previousTrack();
                            }
                        }
                    });
                });
            })();
        }
    });
});

controller.hears(['start [again|over]'],'direct_message,direct_mention,mention,ambient', function(bot, message) {
    Spotify.jumpTo(0, function(err, track){
        bot.reply(message, 'Going back to the start of this track...');
    });
});

controller.hears(['^play$','^resume$','^go$'],'direct_message,direct_mention,mention,ambient', function(bot, message) {
    Spotify.getState(function(err, state){
        if(state.state == 'playing') {
            bot.reply(message, 'Already playing...');
            return;
        }

        Spotify.play(function(){
            bot.reply(message, 'Resuming playback...');
        });
    });
});

controller.hears(['^stop','^pause','^shut up'],'direct_message,direct_mention,mention,ambient', function(bot, message) {
    Spotify.getState(function(err, state){
        if(state.state != 'playing') {
            bot.reply(message, 'Not currently playing...');
            return;
        }

        Spotify.pause(function(){
            bot.reply(message, 'Pausing playback...');
        });
    });
});

controller.hears(['^louder( \\d+)?','^volume up( \\d+)?','^pump it( \\d+)?'],'direct_message,direct_mention,mention,ambient', function(bot, message) {
    var increase = message.match ? parseInt(message.match[1], 10) : undefined;
    Spotify.getState(function(err, state){
        var volume = state.volume;

        if(volume == 100) {
            bot.reply(message, 'Already playing at maximum volume!');
            return;
        }

        var newVolume = increase ? volume + increase : volume + 10;
        if(!newVolume) {
            return;
        }
        else if(newVolume > 100) {
            newVolume = 100;
        }

        addReaction('metal', message, bot);

        Spotify.setVolume(newVolume, function(){
            bot.reply(message, `Increased volume from ${volume} to ${newVolume}`);
        });
    });
});

controller.hears(['^quieter( \\d+)?','^volume down( \\d+)?','^shhh( \\d+)?'],'direct_message,direct_mention,mention,ambient', function(bot, message) {
    var decrease = message.match ? parseInt(message.match[1], 10) : undefined;
    Spotify.getState(function(err, state){
        var volume = state.volume;

        if(volume === 0) {
            bot.reply(message, 'I can\'t go any lower...');
            return;
        }

        var newVolume = decrease ? volume - decrease : volume - 10;
        if(!newVolume && newVolume !== 0) {
            return;
        }
        else if(newVolume < 0) {
            newVolume = 0;
        }

        addReaction('trollface', message, bot);

        Spotify.setVolume(newVolume, function(){
            bot.reply(message, `Decreased volume from ${volume} to ${newVolume}`);
        });
    });
});

controller.hears('^set volume (\\d+)','direct_message,direct_mention,mention,ambient', function(bot, message) {
    console.log('set vol', message);
    var volume = message.match ? parseInt(message.match[1], 10) : undefined;
    Spotify.getState(function(err, state){
        var oldVolume = state.volume;

        if(volume !== undefined && volume >= 0 && volume <= 100) {
            Spotify.setVolume(volume, function(){
                bot.reply(message, `Changed volume from ${oldVolume} to ${volume}`);
            });
            return;
        }

        addReaction('trollface', message, bot);

        bot.reply(message, 'Volume can be set from 0-100');
    });
});

controller.hears('^queue', 'direct_message,direct_mention,mention,ambient', function(bot, message) {
    if(!queue.length) {
        bot.reply(message, 'The queue is empty!');
        return;
    }

    var list = '';
    for(var i=0; i < queue.length; i++) {
        if(queue[i].type == 'track' ) {
            list += i+1 +'. ' + queue[i].name + ' - ' + queue[i].artists[0].name + "\n";
        } else {
            list += i+1 +'. ' + queue[i].name + " ("+queue[i].type+")\n";
        }
    }

    bot.say({
        channel: channelId,
        text: list
    });
});

controller.hears(['^remove (\\d+)', '^delete (\\d+)'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {
    if(!queue.length) {
        bot.reply(message, "There's nothing to remove from the queue!");
        return;
    }

    var queueIndex = message.match[1] - 1;

    if(queueIndex < 0) {
        bot.reply(message, "Don't mess with me!");
        return;
    }

    if(queueIndex <= queue.length - 1) {

        bot.say({
            channel: channelId,
            text: "Removed *" + queue[queueIndex].name + '*' + (queue[queueIndex].type == 'track' ? (' - ' + queue[queueIndex].artists[0].name ) : '') + " from the queue."
        });

        queue.splice(queueIndex, 1);

    } else {
        bot.reply(message, "There are only " + queue.length + " items in the queue, silly!");
    }
});

controller.hears(['^shuffle queue'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {
    if(queue.length) {
        queue.shuffle();
        bot.reply(message, 'The queue has been shuffled');
    }
});

controller.hears('request (track|artist|album|playlist) (.*)', 'direct_message,direct_mention,mention,ambient', function(bot, message) {
  var requestType = message.match[1];
  var requestName = message.match[2];
  var artist = null;

  if(requestName.includes(" - ")) {
      var split = requestName.split("-");
      requestName = split[0];
      artist = split[1];
  }

  if(requestType && requestName) {

    // Check ban list
    var banned = false;

    // Check user
    for(var i=0; i < bannedUsers.length; i++) {
        if( message.user === bannedUsers[i] ) banned = true;
    }

    if(banned) {
        getUser(message.user, function(userInfo) {
            var messageTxt = userInfo.profile.first_name + ', you are BANNED!';

            bot.say({
                channel: channelId,
                attachments: [{
                    "fallback": messageTxt,
                    "color": "#FF0000",
                    "username": 'soundwave',
                    "title": "STILL BANNED",
                    "text": messageTxt
                }]
            });

        });
        return;
    }

    // Check list
    for(var i=0; i < bannedWords.length; i++) {
        if( message.text.indexOf(bannedWords[i]) > -1 ) banned = true;
    }

    if(banned) {
        bannedUsers.push(message.user);
        getUser(message.user, function(userInfo) {
            var messageTxt = userInfo.profile.first_name + ' has been banned for a dud request: ' + requestName.trim() + (artist && artist.length ? ' - '+artist.trim() : '');

            bot.say({
                channel: channelId,
                attachments: [{
                    "fallback": messageTxt,
                    "color": "#FF0000",
                    "username": 'soundwave',
                    "title": "DUD REQUEST",
                    "text": messageTxt,
                    "image_url": "http://www.reactiongifs.com/r/2013/09/Dwight-Schrute-Shakes-Head-and-Rolls-Eyes.gif",
                }]
            });

        });
        return;
    }

    // Let's search
    var query = encodeURI(requestType + ':'+ requestName.trim() + ((artist && artist.length) ? ' artist:'+artist.trim() : '')+'&market=AU');

    console.log(requestType, ':', requestName, ',', artist || 'no artist', ':::', query);

    spotifyApi.search({
          type: requestType,
          query: query
      }).then(function(response) {
          var parsed = response[requestType+"s"];

          if(parsed.items.length && parsed.items[0].uri) {

              console.log('Found track:', parsed.items[0]);

              var spotifyUri = parsed.items[0].uri;
              Spotify.getState(function(err, state) {
                  console.log('Play or queue state', state);

                  if(state.state !== 'playing') {
                      Spotify.playTrack(spotifyUri, function(){
                          getUser(message.user, function(userInfo) {
                              bot.reply(message, 'Coming right up, ' + userInfo.profile.first_name + '!');
                          });
                      });
                  } else {
                      // Add to queue
                      queue.push(parsed.items[0]);
                      addReaction('white_check_mark', message, bot);
                  }
              });

          } else {
              addReaction('no_entry', message, bot);
          }
      }).catch(function(err) {
          console.log(err);
      });

  } else {
    bot.reply(message, 'Sorry, you need to send your request as request track `Track` - `Artist`');
  }
});

controller.hears('request uri <(.*)>', 'direct_message,direct_mention,mention,ambient', function(bot, message) {
  var spotifyUri = message.match[1];

  // Validate the Spotify URI
  if(spotifyUri && spotifyUri.split(':').length === 3) {

      Spotify.getState(function(err, state) {

          console.log('Play or queue state', state);

          if(state.state !== 'playing') {

              Spotify.playTrack(spotifyUri, function(){
                  getUser(message.user, function(user) {
                      bot.reply(message, 'Coming right up' + user.profile.first_name + '!');
                  });
              });

          } else {

              // Add to queue
              //queue.push(parsed.items[0]);

              //bot.reply(message, "I've added that "+requestType+" to the queue");

              //addReaction('white_check_mark', message, bot);
          }
      });


  } else {
    bot.reply(message, 'Sorry, you need to send your request as a Spotify URI');
  }
});

controller.hears(['uptime','identify yourself','who are you','what is your name'],'direct_message,direct_mention,mention',function(bot,message) {
    var hostname = os.hostname();
    var uptime = formatUptime(process.uptime());

    bot.reply(message,':robot_face: I am a bot named <@' + bot.identity.name +'>. I have been running for ' + uptime + ' on ' + hostname + ".");
});

controller.on('bot_channel_join', function(bot, message) {
    let inviterId = message.inviter;
    let channelId = message.channel;
    var inviter, channel;

    let done = () => {
        if(inviter && channel) {
            inviteMessage(inviter, channel);
            verifyChannel(channel);
        }
    };

    bot.api.channels.info({channel: channelId}, function(err, response) {
        if(response && !err) {
            channel = response.channel;
            done();
        }
    });

    bot.api.users.info({user: inviterId}, function(err, response) {
        if(response && !err) {
            inviter = response.user;
            done();
        }
    });
});

controller.on('bot_group_join', function(bot, message) {
    let inviterId = message.inviter;
    let channelId = message.channel;
    var inviter, channel;

    let done = () => {
        if(inviter && channel) {
            inviteMessage(inviter, channel);
            verifyChannel(channel);
        }
    };

    bot.api.groups.info({channel: channelId}, function(err, response) {
        if(response && !err) {
            channel = response.group;
            done();
        }
    });

    bot.api.users.info({user:  inviterId}, function(err, response) {
        if(response && !err) {
            inviter = response.user;
            done();
        }
    });
});

function getUser(userId, callback) {
    controller.storage.users.get(userId, function(err, user) {
        if (user) {
            console.log('Already have info for', userId);
            callback(user);
        } else {
            console.log('Getting info for', userId);
            bot.api.users.info({
                token: setup.slackApiToken,
                user: userId
            }, function(err, userInfo) {
                if(userInfo.ok) {
                    controller.storage.users.save(userInfo.user, function(err) {
                        callback(userInfo.user);
                    });
                }
            });
        }
    });
}

function inviteMessage(inviter, channel) {
    Spotify.getTrack(function(err, track){
        var nowPlaying;
        let welcomeText = `Thanks for inviting me, ${inviter.name}! Good to be here :)\n`;

        if(track) {
            lastTrackId = track.id;
            getArtworkUrlFromTrack(track, function(artworkUrl) {
                bot.say({
                    text: welcomeText+'Currently playing: '+trackFormatSimple(track),
                    channel: channel.id
                });
            });
        }
        else {
            bot.say({
                text: welcomeText+'There is nothing currently playing',
                channel: channel.id
            });
        }
    });
}

setInterval(() => {
    checkRunning()
    .then(function(running) {
        if(running) {
            checkForTrackChange();
        } else {
            if(lastTrackId !== null) {
                bot.say({
                    text: 'Oh no! Where did Spotify go? It doesn\'t seem to be running 😨',
                    channel: channelId
                });
                lastTrackId = null;
            }
        }
    });
}, 5000);

setInterval(() => {
    console.log('Reconnecting to Slack RTM for good measure');
    initBot();
}, 1200000);

function checkForTrackChange() {
    Spotify.getState(function(err, state) {
      if(typeof(state) !== 'undefined' && state.state && state.state !== 'playing') {
          console.log('Not playing, checking queue');
          if(queue.length) {
              console.log('Playing first track off queue');
              Spotify.playTrack(queue[0].uri);
              queue.shift();
          }
          return;
      }
    });

    Spotify.getTrack(function(err, track) {
        if(track && (track.id !== lastTrackId)) {
            if(!channelId) return;

            Spotify.getState(function(err, state) {
              if(typeof(state) == 'undefined' || state.state !== 'playing') {
                  return;
              }

              lastTrackId = track.id;

              getArtworkUrlFromTrack(track, function(artworkUrl) {
                  bot.say({
                      channel: channelId,
                      attachments: [{
                          "fallback": `Now playing: ${track.name} - ${track.album}`,
                          //"color": "#AAE651",
                          "username": 'soundwave',
                          "title": track.name,
                          "title_link": 'https://open.spotify.com/track/'+track.id.replace('spotify:track:', ''),
                          "text": `*${track.artist}*\n${track.album}${track.album_artist !== track.artist ? "\n_" + track.album_artist + "_" : ""}`,
                          "thumb_url": artworkUrl,
                          "mrkdwn_in": ["text"]
                      }]
                  }, function(err, resp) {
                    if(err) console.error('checkForTrackChange', err, resp);
                  });
              });


            });
        }
    });
}

function formatUptime(uptime) {
    var unit = 'second';
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'minute';
    }
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'hour';
    }
    if (uptime != 1) {
        unit = unit +'s';
    }

    uptime = uptime + ' ' + unit;
    return uptime;
}

function verifyChannel(channel) {
    if(channel && channel.name && channel.id && setup.slackChannel && channel.name == setup.slackChannel) {
        channelId = channel.id;
        console.log('** ...chilling out on #' + channel.name);
        return true;
    }

    return false;
}

function addReaction(reactionName, message, bot) {
    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: reactionName,
    }, function(err,res) {
        if (err) {
            bot.botkit.log("Failed to add emoji reaction :(",err);
        }
    });
}

function getState() {
    var deferred = q.defer();

    Spotify.getState(function(err, state) {
        if(err || !state) {
            return deferred.resolve(false);
        }

        return deferred.resolve(state);
    });

    return deferred.promise;
}

function checkRunning() {
    var deferred = q.defer();

    Spotify.isRunning(function(err, isRunning) {
        if(err || !isRunning) {
            return deferred.resolve(false);
        }

        return deferred.resolve(true);
    });

    return deferred.promise;
}

function checkShuffling() {
    var deferred = q.defer();

    Spotify.isShuffling(function(err, isShuffling) {
        if(err) {
            return deferred.reject(err);
        }

        return deferred.resolve(isShuffling);
    });

    return deferred.promise;
}

function checkRepeating() {
    var deferred = q.defer();

    Spotify.isRepeating(function(err, isRepeating) {
        if(err) {
            return deferred.reject(err);
        }

        return deferred.resolve(isRepeating);
    });

    return deferred.promise;
}
