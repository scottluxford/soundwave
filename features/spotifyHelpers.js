const spotify = require('spotify-node-applescript');
const q = require('q');

module.exports = (soundwave) => {

    return {
        trackFormatSimple: (track) => `_${track.name}_ by *${track.artist}*`,
        trackFormatDetail: (track) => `_${track.name}_ by _${track.artist}_ is from the album *${track.album}*`,

        getArtworkUrlFromTrack: getArtworkUrlFromTrack,
        checkForTrackChange: checkForTrackChange,
        getState: getState,
        checkRunning: checkRunning
    };

    function getArtworkUrlFromTrack(track, callback) {
        let trackId = track.id.split(':')[2];

        soundwave.spotifyApi
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

    }

    function checkForTrackChange() {
        spotify.getState(function(err, state) {
            if(err) console.log(err);

            if(typeof(state) !== 'undefined' && state.state && state.state !== 'playing') {
                console.log('Not playing, checking queue');
                if(soundwave.queue.length) {
                    console.log('Playing first track off queue');
                    spotify.playTrack(soundwave.queue[0].uri);
                    soundwave.queue.shift();
                }
                return;
            }
        });

        spotify.getTrack(function(err, track) {
            if(track && (track.id !== soundwave.lastTrackId)) {
                if(!soundwave.channelId) return;

                spotify.getState(function(err, state) {
                if(typeof(state) == 'undefined' || state.state !== 'playing') {
                    return;
                }

                soundwave.lastTrackId = track.id;

                getArtworkUrlFromTrack(track, function(artworkUrl) {
                    soundwave.bot.say({
                        channel: soundwave.channelId,
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

    function getState() {
        var deferred = q.defer();

        spotify.getState(function(err, state) {
            if(err || !state) {
                return deferred.resolve(false);
            }

            return deferred.resolve(state);
        });

        return deferred.promise;
    }

    function checkRunning() {
        var deferred = q.defer();

        spotify.isRunning(function(err, isRunning) {
            if(err || !isRunning) {
                return deferred.resolve(false);
            }

            return deferred.resolve(true);
        });

        return deferred.promise;
    }


};