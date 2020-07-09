
import Events from './events';
import { getBaseUrl } from './base-url';
import Speaker from './speaker';
import log from './log';
import { version as FEED_VERSION } from '../package.json';

const METADATA_TIMEOUT = 10000;

/**
 * This class connects to a specific simulcast stream and
 * sends out events to indicate when new songs are starting
 * or when music has stopped playing. This class exposes 
 * 'connect' and 'disconnect' methods to turn on the audio or stop
 * the audio.
 * 
 *   initializeAudio
 *   connect
 *   disconnect
 *   getVolume
 *   setVolume
 * 
 * The player has a state, returned from getCurrentState():
 * 
 *   'idle'       - class hasn't attempted to connect to the stream, or we've
 *                  disconnected from a stream.
 *   'connecting' - we're conneting to the stream (this is set when a
 *                  call to 'connect()' is made)
 *   'connected'  - we have connected to the stream and are playing music (or silence)
 *   'music-unavailable' - no music is available for this client for this stream
 * 
 * The audio volume can be adjusted with setVolume() and retrieved with
 * getVolume().
 * 
 * The player triggers the following events:
 *    play-started - indicates a new song has begun playback, or we've
 *        dropped in on an already playing song. The 'play' that represents
 *        the song is passed as an argument. The 'play' value may be null, 
 *        which indicates silence is playing right now.
 *    music-unavailable - indicates the listener may not listen to music
 *    state-changed - indicates the state of the player changed
 * 
 * Upon a call to 'connect', the client can expect either a 'play-started'
 * event or a 'music-unavailable' event.
 */

class SimulcastPlayer {

  // var _uuid;     // uuid of stream
  // var _speaker;  // Speaker instance

  // var _streamUrl; // stream we're connecting to
  // var _activePlay; // currently playing song, or null
  // var _activeSound; // if we're playing, this holds the sound
  // var _metadataTimeout; // timeout for retrieving updated metadata
  // var _tryingToPlay = false; // true if we want to play/hear music
  // var _retries; // number of times we've retried playing music

  constructor(uuid) {
    Object.assign(this, Events);

    this._speaker = new Speaker();

    this._uuid = uuid;
    this._state = 'idle';

    this._activePlay = null;
    this._activeSound = null;
    this._metadataTimeout = null;
    this._tryingToPlay = false;
    this._retries = 0;
  }

  initializeAudio() {
    log('INTIALIZE AUDIO');
    this._speaker.initializeAudio();
  }

  connect() {
    log(`CONNECT to ${this._uuid}`);

    if (this._tryingToPlay) {
      log(`ignoring pointless connect to ${this._uuid}`);
      return;
    }

    this._tryingToPlay = true;

    // initialize speaker,
    this._speaker.initializeAudio();

    this._setState('connecting');

    // this should ask the API server for a URL, really
    const baseApiUrl = new URL(getBaseUrl());
    this._streamUrl = 'https://cast.' + baseApiUrl.hostname + '/' + this._uuid;
 
    this._requestStream();
  }

  _onSoundPlay() {
    // we've just connected to the stream.
    log('sound play!');

    // reset retry count
    this._retries = 0;

    // starting point to watch for stalls
    this._lastElapsedAt = Date.now();

    if (this._state === 'connecting') {
      this._setState('connected');

      // get details about the play
      fetch(this._streamUrl + '/play?elapsed=' + this._elapsed)
        .then((res) => res.json())
        .then((res) => {
          if (res.success) {
            this._activePlay = res.play;

            this.trigger('play-started', this._activePlay);

            this._metadataTimeout = setTimeout(() => {
              this._onMetadataTimeout();
            }, METADATA_TIMEOUT);

          } else {
            // try again in 3 seconds
            this._metadataTimeout = setTimeout(() => {
              this._onSoundPlay();
            }, 3000);
          }
        })
        .catch(() => {
          // try again in 2 seconds
          this._metadataTimeout = setTimeout(() => {
            this._onSoundPlay();
          }, 2000);
        });

    } else if (!this._metadataTimeout) {
      this._metadataTimeout = setTimeout(() => {
        this._onMetadataTimeout();
      }, METADATA_TIMEOUT);

    }
  }

  _onSoundElapse() {
    if (this._activeSound) {
      const oldElapsed = this._elapsed;
      const newlyElapsed = this._elapsed = this._activeSound.position();

      if ((newlyElapsed - oldElapsed) > 0) {
        this._lastElapsedAt = Date.now();
      }
    }
  }

  _requestStream() {
    log('requesting stream');

    if (!this._tryingToPlay) {
      return;
    }

    if (this._activeSound) {
      this._activeSound.destroy();
      this._activeSound = null;
    }

    // don't query for metadata while we are trying to stream again
    if (this._metadataTimeout) {
      clearTimeout(this._metadataTimeout);
      this._metadataTimeout = null;
    }

    this._activePlay = null;

    // keep retrying until we reconnect (but increase space between retries)
    this._activeSound = this._speaker.create(this._streamUrl, {
      play: this._onSoundPlay.bind(this),
      finish: this._onSoundFinish.bind(this),
      elapse: this._onSoundElapse.bind(this)
    });

    this._activeSound.play();

    this._elapsed = 0;
    this._lastElapsedAt = Date.now();
  }

  _onMetadataTimeout() {
    // check for update of current song
    fetch(this._streamUrl + '/play?elapsed=' + this._elapsed)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          if (((res.play === null) && (this._activePlay !== null)) ||
              ((res.play !== null) && (this._activePlay === null)) ||
              ((res.play !== null) && (this._activePlay !== null) && (res.play.audio_file.id !== this._activePlay.audio_file.id))) {
            this._activePlay = res.play;

            log('current play updated', this._activePlay);
            this.trigger('play-started', this._activePlay);
          }
        }

        this._metadataTimeout = setTimeout(() => {
          this._onMetadataTimeout();
        }, METADATA_TIMEOUT);
      })
      .catch(() => {
        this._metadataTimeout = setTimeout(() => {
          this._onMetadataTimeout();
        }, METADATA_TIMEOUT);
      });

    if ((Date.now() - this._lastElapsedAt) > 4000) {
      // try reconnecting if we've been down for a while
      this._requestStream();
    }
  }

  _onSoundFinish(error) {
    log('sound finished', this.toObject());

    if ((this._state === 'connecting') && error) {
      // we weren't granted access to stream
      this._tryingToPlay = false;

      this._setState('music-unavailable');
      this.trigger('music-unavailable');

    } else {
      log('reconnecting after stream ended', error);

      // we must have lost the stream during playback. try
      // reconnecting. 
      if (this._activeSound) {
        this._activeSound.destroy();
        this._activeSound = null;
      }

      // don't query for metadata while we are trying to stream again
      if (this._metadataTimeout) {
        clearTimeout(this._metadataTimeout);
        this._metadataTimeout = null;
      }

      this._activePlay = null;

      // keep retrying until we reconnect (but increase space between retries)
      this._retries += 1;
      setTimeout(() => {
        if (this._tryingToPlay) {
          this._requestStream();
        }
  
      }, Math.pow(2, this._retries));
    }

    // help us narrow down streaming issues
    this._logEvents();
  }

  disconnect() {
    log('DISCONNECT', this.toObject());

    if (!this._tryingToPlay) {
      return;
    }

    this._tryingToPlay = false;
    this._activePlay = null;
    this._elapsed = 0;

    if (this._metadataTimeout) {
      clearTimeout(this._metadataTimeout);
      this._metadataTimeout = null;
    }

    // stop and destroy our sound object
    if (this._activeSound) {
      this._activeSound.destroy();
      this._activeSound = null;
    }

    this._setState('idle');

    this._logEvents();
  }

  getVolume() {
    return this._speaker.getVolume();
  }

  setVolume(vol) {
    this._speaker.setVolume(vol);
  }

  _setState(newState) {
    if (this._state !== newState) {
      log(`state transition ${this._state} -> ${newState}`);
      this._state = newState;
      this.trigger('state-changed', this._state);
    }
  }

  getCurrentState() {
    return this._state;
  }

  getCurrentPlay() {
    return this._activePlay;
  }

  _logEvents() {
    let history = log.reset();

    return fetch(getBaseUrl() + '/api/v2/session/event', {
      method: 'POST',
      body: JSON.stringify({
        event: 'playerHistory',
        parameters: history
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-Feed-SDK': FEED_VERSION + ' js'
      }
    });
  }

  toObject() {
    return {
      state: this._state,
      activePlay: this._activePlay,
      uuid: this._uuid,
      metadataTimeoutIsNull: (this._metadataTimeout === null),
      tryingToPlay: this._tryingToPlay,
      elapsed: this._elapsed,
      retries: this._retries
    };
  }

  toString() {
    return JSON.stringify(this.toString());
  }

}

export default SimulcastPlayer;
