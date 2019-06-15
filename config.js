// Soundwave
// Release Configuration
module.exports = {

    slack: {
        // Slack Signing Secret
        signingSecret: '',
        // Slack bot API token
        botToken: '',
        // Slack web api token
        oauthToken: '',
        // Slack channel name to post bot feedback into
        channel: 'feed-now-playing'
    },

    spotify: {
        // Spotify Client ID
        clientId: '',
        // Spotify Client Secret
        clientSecret: '',
        // Market to search in
        market: 'AU'
    },

    bannedWords: [
        'wiggles',
        'bieber'
    ]

};