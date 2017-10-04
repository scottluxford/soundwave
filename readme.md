![Soundwave](IconTemplate@2x.png)
# Soundwave
A Slack bot to remotely control Spotify on a Mac

## Configuration
You'll need to provide a Slack channel, Slack bot token and Spotify Web API token to run Soundwave correctly. There are dev and production app configs: `bot_setup_dev.js` and `bot_setup.js`.

```
// Soundwave
// Release Configuration
module.exports = {
  // Slack bot token
  slackBotToken: 'yourSlackBotToken',
  // Slack channel name to post bot feedback into
  slackChannel: 'feed-now-playing',
  // Slack web api token
  slackApiToken: 'yourSpotifyWebApiToken',
  // Spotify Client ID
  spotifyClientId: 'yourSpotifyClientId',
  // Spotify Client Secret
  spotifyClientSecret: 'yourSpotifyClientSecret'
};
```

## Running the dev app from CLI
- `npm install`
- `npm start` to run dev variant app from CLI without building a new version. Uses `bot_setup_dev.js` config.

## Building the release app
- `npm run build` Builds the prod app 
