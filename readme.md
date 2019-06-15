<div><img src="assets/Icon.png" alt="Soundwave icon; robot face" width="140" height="140"></div>

# Soundwave
A Slack bot to remotely control Spotify on a Mac using Applescript. Runs as a menubar app.

## Features
- Basic transport functions: ▶️ play, ⏸ pause, ⏮ rewind, ⏭ skip
- Volume control 🔉🤫 / 🔊🤘
- Toggle 🔀 shuffle & 🔁 repeat
- 🎤 Requests for tracks, artists, albums and playlists, with queue and queue shuffle
- Posts currently playing songs (with artwork) and feedback to a Slack channel of your choosing; `#feed-now-playing` by default
- Configurable banned words to crudely prevent any unwanted requests, and prevent those Slack users from making subsequent requests, until the app is restarted.

## Requirements
- A  Mac with Spotify running
- A Slack App with bot (see configuration below)
- Your song requests

## Configuration
You'll need to create a Slack App with a bot to act as your DJ. Then install the bot in your Slack workspace and configure Soundwave with a signing secret, App Bot token and Oauth API token.

You'll also need to grab a Spotify Web API client ID and secret.

There are dev and production app configs: `config_dev.js` and `config.js` to help with configuration.

## Running the dev app from CLI
- `npm install`
- `npm start` to run dev variant app from CLI without building a new version. Uses `config_dev.js` config.

## Building the release app
- `npm run build` Builds the prod app. Uses `config.js` config.

## Cheers!
Originally forked and inspired by https://github.com/markstickley/spotifyslackbot