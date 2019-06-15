const os = require('os');
const spotify = require('spotify-node-applescript');
const request = require('request');

module.exports = (soundwave) => {

    const slackHelpers = require('./slackHelpers')(soundwave);

    // BANNED WORDS
    let bannedWords = soundwave.config.bannedWords;

    // BANNED USERS
    let bannedUsers = [];

    soundwave.controller.hears(['^help$'],'direct_message,direct_mention,mention,ambient', function(bot, message) {
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

    soundwave.controller.hears(['hello','hi','hey','greetings'],'direct_message,direct_mention,mention',function(bot,message) {
        slackHelpers.getUser(message.user, function(user) {
            bot.reply(message, 'Hey ' + user.profile.first_name + '!');
        });
    });

    soundwave.controller.hears(['^shuffle$'],'direct_message,direct_mention,mention,ambient', function(bot, message) {
        spotify.toggleShuffling(function() {
            spotify.isShuffling(function(err, shuffling){
                slackHelpers.addReaction(shuffling ? 'twisted_rightwards_arrows' : 'no_entry', message, bot);
            });
        });
    });

    soundwave.controller.hears(['^repeat$'],'direct_message,direct_mention,mention,ambient', function(bot, message) {
        spotify.toggleRepeating(function() {
            spotify.isRepeating(function(err, repeating){
                slackHelpers.addReaction(repeating ? 'repeat' : 'no_entry', message, bot);
            });
        });
    });

    soundwave.controller.hears(['what is this','what\'s this','info','playing','what is playing','what\'s playing'],'direct_message,direct_mention,mention', function(bot, message) {
        spotify.getTrack(function(err, track){
            if(track) {
                lastTrackId = track.id;
                bot.reply(message,'This is ' + trackFormatSimple(track) + '!');
            }
        });
    });

    soundwave.controller.hears(['detail'],'direct_message,direct_mention,mention', function(bot, message) {
        spotify.getTrack(function(err, track){
            if(track) {
                lastTrackId = track.id;
                getArtworkUrlFromTrack(track, function(artworkUrl) {
                    bot.reply(message, trackFormatDetail(track)+"\n"+artworkUrl);
                });
            }
        });
    });

    soundwave.controller.hears(['^status$'],'direct_message,direct_mention,mention,ambient', function(bot, message) {
        spotify.getState(function(err, stateResult) {
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

    soundwave.controller.hears(['^next','^skip'],'direct_message,direct_mention,mention,ambient', function(bot, message) {
        spotify.next(function(err, track){
            bot.reply(message, 'Skipping to the next track...');
        });
    });

    soundwave.controller.hears(['^previous','^prev'],'direct_message,direct_mention,mention,ambient', function(bot, message) {
        var currentTrack;
        spotify.getTrack(function(err, track){
            if(track) {
                currentTrack = track.id;

                (function previousTrack() {
        spotify.previous(function(err, track){
                        spotify.getTrack(function(err, track){
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

    soundwave.controller.hears(['start [again|over]'],'direct_message,direct_mention,mention,ambient', function(bot, message) {
        spotify.jumpTo(0, function(err, track){
            bot.reply(message, 'Going back to the start of this track...');
        });
    });

    soundwave.controller.hears(['^play$','^resume$','^go$'],'direct_message,direct_mention,mention,ambient', function(bot, message) {
        spotify.getState(function(err, state){
            if(state.state == 'playing') {
                bot.reply(message, 'Already playing...');
                return;
            }

            spotify.play(function(){
                bot.reply(message, 'Resuming playback...');
            });
        });
    });

    soundwave.controller.hears(['^stop','^pause','^shut up'],'direct_message,direct_mention,mention,ambient', function(bot, message) {
        spotify.getState(function(err, state){
            if(state.state != 'playing') {
                bot.reply(message, 'Not currently playing...');
                return;
            }

            spotify.pause(function(){
                bot.reply(message, 'Pausing playback...');
            });
        });
    });

    soundwave.controller.hears(['^louder( \\d+)?','^volume up( \\d+)?','^pump it( \\d+)?'],'direct_message,direct_mention,mention,ambient', function(bot, message) {
        var increase = message.match ? parseInt(message.match[1], 10) : undefined;
        spotify.getState(function(err, state){
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

            slackHelpers.addReaction('metal', message, bot);

            spotify.setVolume(newVolume, function(){
                bot.reply(message, `Increased volume from ${volume} to ${newVolume}`);
            });
        });
    });

    soundwave.controller.hears(['^quieter( \\d+)?','^volume down( \\d+)?','^shhh( \\d+)?'],'direct_message,direct_mention,mention,ambient', function(bot, message) {
        var decrease = message.match ? parseInt(message.match[1], 10) : undefined;
        spotify.getState(function(err, state){
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

            slackHelpers.addReaction('trollface', message, bot);

            spotify.setVolume(newVolume, function(){
                bot.reply(message, `Decreased volume from ${volume} to ${newVolume}`);
            });
        });
    });

    soundwave.controller.hears('^set volume (\\d+)','direct_message,direct_mention,mention,ambient', function(bot, message) {
        console.log('set vol', message);
        var volume = message.match ? parseInt(message.match[1], 10) : undefined;
        spotify.getState(function(err, state){
            var oldVolume = state.volume;

            if(volume !== undefined && volume >= 0 && volume <= 100) {
                spotify.setVolume(volume, function(){
                    bot.reply(message, `Changed volume from ${oldVolume} to ${volume}`);
                });
                return;
            }

            slackHelpers.addReaction('trollface', message, bot);

            bot.reply(message, 'Volume can be set from 0-100');
        });
    });

    soundwave.controller.hears('^queue', 'direct_message,direct_mention,mention,ambient', function(bot, message) {
        if(!soundwave.queue.length) {
            bot.reply(message, 'The queue is empty!');
            return;
        }

        var list = '';
        for(var i=0; i < soundwave.queue.length; i++) {
            if(soundwave.queue[i].type == 'track' ) {
                list += i+1 +'. ' + soundwave.queue[i].name + ' - ' + soundwave.queue[i].artists[0].name + "\n";
            } else {
                list += i+1 +'. ' + soundwave.queue[i].name + " ("+soundwave.queue[i].type+")\n";
            }
        }

        bot.say({
            channel: soundwave.channelId,
            text: list
        });
    });

    soundwave.controller.hears(['^remove (\\d+)', '^delete (\\d+)'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {
        if(!soundwave.queue.length) {
            bot.reply(message, "There's nothing to remove from the queue!");
            return;
        }

        var queueIndex = message.match[1] - 1;

        if(queueIndex < 0) {
            bot.reply(message, "Don't mess with me!");
            return;
        }

        if(queueIndex <= soundwave.queue.length - 1) {

            bot.say({
                channel: soundwave.channelId,
                text: "Removed *" + soundwave.queue[queueIndex].name + '*' + (soundwave.queue[queueIndex].type == 'track' ? (' - ' + soundwave.queue[queueIndex].artists[0].name ) : '') + " from the queue."
            });

            soundwave.queue.splice(queueIndex, 1);

        } else {
            bot.reply(message, "There are only " + queue.length + " items in the queue, silly!");
        }
    });

    soundwave.controller.hears(['^shuffle queue'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {
        if(soundwave.queue.length) {
            soundwave.queue.shuffle();
            bot.reply(message, 'The queue has been shuffled');
        }
    });

    soundwave.controller.hears('request (track|artist|album|playlist) (.*)', 'direct_message,direct_mention,mention,ambient', function(bot, message) {
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
                slackHelpers.getUser(message.user, function(userInfo) {
                    var messageTxt = userInfo.profile.first_name + ', you are BANNED!';

                    bot.say({
                        channel: soundwave.channelId,
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
                if( message.text.toLowerCase.indexOf(bannedWords[i].toLowerCase()) > -1 ) banned = true;
            }

            if(banned) {
                bannedUsers.push(message.user);
                slackHelpers.getUser(message.user, function(userInfo) {
                    var messageTxt = userInfo.profile.first_name + ' has been banned for a dud request: ' + requestName.trim() + (artist && artist.length ? ' - '+artist.trim() : '');

                    bot.say({
                        channel: soundwave.channelId,
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
            var query = encodeURI(requestType + ':'+ requestName.trim() + ((artist && artist.length) ? ' artist:'+artist.trim() : ''));

            console.log(requestType, ':', requestName, ',', artist || 'no artist', ':::', query);

            soundwave.spotifyApi.request(`https://api.spotify.com/v1/search?market=${soundwave.config.spotify.market}&type=${requestType}&query=${query}`).then(function(response) {
                var parsed = response[requestType+"s"];

                if(parsed.items.length && parsed.items[0].uri) {

                    console.log('Found track:', parsed.items[0]);

                    var spotifyUri = parsed.items[0].uri;
                    spotify.getState(function(err, state) {
                        console.log('Play or queue state', state);

                        if(state.state !== 'playing') {
                            spotify.playTrack(spotifyUri, function(){
                                slackHelpers.getUser(message.user, function(userInfo) {
                                    bot.reply(message, 'Coming right up, ' + userInfo.profile.first_name + '!');
                                });
                            });
                        } else {
                            // Add to queue
                            soundwave.queue.push(parsed.items[0]);
                            slackHelpers.addReaction('white_check_mark', message, bot);
                        }
                    });

                } else {
                    slackHelpers.addReaction('no_entry', message, bot);
                }
            }).catch(function(err) {
                console.log(err);
            });

        } else {
            bot.reply(message, 'Sorry, you need to send your request as request track `Track` - `Artist`');
        }
    });

    soundwave.controller.hears('request uri <(.*)>', 'direct_message,direct_mention,mention,ambient', function(bot, message) {
    var spotifyUri = message.match[1];

    // Validate the Spotify URI
    if(spotifyUri && spotifyUri.split(':').length === 3) {

        spotify.getState(function(err, state) {

            console.log('Play or queue state', state);

            if(state.state !== 'playing') {

                spotify.playTrack(spotifyUri, function(){
                    helpers.getUser(message.user, function(user) {
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

    soundwave.controller.hears(['uptime','identify yourself','who are you','what is your name'],'direct_message,direct_mention,mention',function(bot,message) {
        var hostname = os.hostname();
        var uptime = slackHelpers.formatUptime(process.uptime());

        bot.reply(message,':robot_face: I am a bot named <@' + bot.identity.name +'>. I have been running for ' + uptime + ' on ' + hostname + ".");
    });

};