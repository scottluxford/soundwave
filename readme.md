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
  token: 'slackBotToken',
  // Slack channel name to post bot feedback into
  channel: 'feed-now-playing',
  // Spotify web api token
  apiToken: 'spotifyWebApiToken'
};
```

## Running the dev app from CLI
- `npm install`
- `npm start` to run dev variant app from CLI without building a new version. Uses `bot_setup_dev.js` config.

## Building the release app
- `npm run build` Increments and builds a patch release
- `npm run build-minor` Increments and builds a minor release
- `npm run build-major` Increments and builds a major release
