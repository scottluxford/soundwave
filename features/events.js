module.exports = (soundwave) => {

    const slackHelpers = require('./slackHelpers')(soundwave);

    soundwave.controller.on('bot_channel_join', function(bot, message) {
        let inviterId = message.inviter;
        let channelId = message.channel;
        var inviter, channel;

        let done = () => {
            if(inviter && channel) {
                slackHelpers.inviteMessage(inviter, channel);
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

    soundwave.controller.on('bot_group_join', function(bot, message) {
        let inviterId = message.inviter;
        let channelId = message.channel;
        var inviter, channel;

        let done = () => {
            if(inviter && channel) {
                slackHelpers.inviteMessage(inviter, channel);
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

};