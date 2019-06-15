const spotify = require('spotify-node-applescript');

module.exports = (soundwave) => {

    const spotifyHelpers = require('./spotifyHelpers')(soundwave);

    return {
        getUser: (userId, callback) => {
            soundwave.controller.storage.users.get(userId, function(err, user) {
                if (user) {
                    console.log('Already have info for', userId);
                    callback(user);
                } else {
                    console.log('Getting info for', userId);
                    soundwave.bot.api.users.info({
                        token: soundwave.config.slack.oauthToken,
                        user: userId
                    }, function(err, userInfo) {
                        if(userInfo.ok) {
                            soundwave.controller.storage.users.save(userInfo.user, function() {
                                callback(userInfo.user);
                            });
                        } else {
                            console.log(err);
                        }
                    });
                }
            });
        },

        inviteMessage: (inviter, channel) => {
            spotify.getTrack(function(err, track){
                let welcomeText = `Thanks for inviting me, ${inviter.name}! Good to be here :)\n`;

                if(track) {
                    lastTrackId = track.id;
                    spotifyHelpers.getArtworkUrlFromTrack(track, function(artworkUrl) {
                        soundwave.bot.say({
                            text: welcomeText+'Currently playing: '+trackFormatSimple(track),
                            channel: channel.id
                        });
                    });
                }
                else {
                    soundwave.bot.say({
                        text: welcomeText+'There is nothing currently playing',
                        channel: channel.id
                    });
                }
            });
        },

        formatUptime: (uptime) => {
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
        },

        addReaction: (reactionName, message, bot) => {
            bot.api.reactions.add({
                timestamp: message.ts,
                channel: message.channel,
                name: reactionName,
            }, function(err,res) {
                if (err) {
                    bot.botkit.log("Failed to add emoji reaction :(",err);
                }
            });
        },

        verifyChannel: (channel) => {
            if(channel && channel.name && channel.id && soundwave.config.slack.channel && channel.name == soundwave.config.slack.channel) {
                soundwave.channelId = channel.id;
                console.log('** ...chilling out on #' + channel.name);
                return true;
            }

            return false;
        }
    }

};