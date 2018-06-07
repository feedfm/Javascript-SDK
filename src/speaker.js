/*global module:false */

/*
 * The speaker object encapsulates the SoundManager2 code and boils it down
 * to the following api:
 *
 *    speaker().initializeAudio(): many clients can only start using
 *      speaker when handling an 'onClick' event. This call should be made 
 *      at that time to get audio initialized while waiting for details
 *      of what to play from the server. 
 *
 *    speaker().setVolume(value): set the volume from 0 (mute) - 100 (full volume)
 *
 *    var sound = speaker().create(url, optionsAndEvents): create a new sound from the
 *       given url and return a 'song' object that can be used to pause/play/
 *       destroy the song and receive trigger events as the song plays/stops. 
 *
 *       The 'optionsAndEvents' is an object that lets you specify event
 *       handlers and options:
 *
 *          startPosition:  specifies the time offset (in milliseconds) that the
 *                          sound should begin playback at when we begin playback.
 *          endPosition:    specifies the time offset (in milliseconds) that the
 *                          sound should stop playback 
 *          fadeInSeconds:  # of seconds to fade in audio
 *          fadeOutSeconds: # of seconds to fade out audio
 *          play:           event handler for 'play' event
 *          pause:          event handler for 'pause' event
 *          finish:         event handler for 'finish' event
 *          elapse:         event handler for 'elapse' event
 *
 *       The returned object emits the following events:
 *         play: the song has started playing or resumed playing after pause
 *         pause: the song has paused playback
 *         finish: the song has completed playback and the song object
 *           is no longer usable and should be destroyed
 *         elapse: song playback has elapsed
 *
 *       The events should be received in this order only:
 *         ( play -> ( pause | play )* -> )? finish
 *
 *       Note that I represent play failures as a 'finish' call, so if
 *       we can't load a song, it will just get a 'finish' and no 'play'.
 *       The 'finish' event will have a 'true' argument passed to it on
 *       some kind of error, so you can treat those differently.
 *
 *       The returned song object has this following api:
 *         play: start playback (at the 'startPosition', if specified)
 *         pause: pause playback
 *         resume: resume playback
 *         destroy: stop playback, prevent any future playback, and free up memory
 *
 * This module returns a function that returns a speaker singleton so everybody
 * is using the same instance.
 *
 * Proper usage looks like this:
 *
 *   require([ 'feed/speaker' ], function(speaker) {
 *     var mySpeaker = speaker(options, onReady);
 *   });
 *
 * That will make sure that all code uses the same speaker instance. 'options'
 * is optional, and is an object with any of the following keys:
 *
 *   debug: if true, emit debug information to the console
 *
 * 'onReady' is also optional, and is a callback that will be called as
 * soon as the sond system is initialized (or immediately if it was already
 * initialized) and it will be given a string that lists supported
 * audio formats, suitable for passing to Feed.Session.setFormats().
 *
 * The first function call to 'speaker()' is what configures and defines the
 * speaker - and subsequent calls just return the already-created instance.
 * I think this is a poor interface, but I don't have a better one at the
 * moment.
 *
 */

var _ = require('underscore');
var $ = require('jquery');
var log = require('./log');
var Events = require('./events');
var util = require('./util');
var version = require('./version');

var SILENCE ='data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';


// fake console to redirect soundmanager2 to the feed logger
var feedConsole = {
  log: log,
  info: log,
  warn: log,
  error: log
};

var Sound = function(speaker, options, id, url) { 
  var obj = _.extend(this, Events);

  obj.id = id;
  obj.url = url;
  obj.speaker = speaker;
  obj.loaded = false;

  if (options) {
    this.startPosition = options.startPosition;
    this.endPosition = options.endPosition;
    this.fadeInSeconds = options.fadeInSeconds;
    this.fadeOutSeconds = options.fadeOutSeconds;

    _.each(['play', 'pause', 'finish', 'elapse'], function(ev) {
      if (ev in options) {
        obj.on(ev, options[ev]);
      }
    });

    this.gain = options.gain || 0;

  } else {
    this.gain = 0;

  }

  return obj;
};

function d(audio) {
  return ' src = ' + audio.src + ', time = ' + audio.currentTime + ', paused = ' + audio.paused + ', duration = ' + audio.duration + ', readyState = ' + audio.readyState;
}

Sound.prototype = {
  play: function() {
    log(this.id + ' sound play');
    return this.speaker._playSound(this);
  },

  // pause playback of the current sound clip
  pause: function() {
    log(this.id + ' sound pause');
    return this.speaker._pauseSound(this);
  },

  // resume playback of the current sound clip
  resume: function() {
    log(this.id + ' sound resume');
    return this.speaker._playSound(this);
  },

  // elapsed number of milliseconds played
  position: function() {
    log(this.id + ' sound position');
    return this.speaker._position(this);
  },

  // duration in milliseconds of the song
  // (this may change until the song is full loaded)
  duration: function() {
    log(this.id + ' sound duration');
    return this.speaker._duration(this);
  },

  // stop playing the given sound clip, unload it, and disable events
  destroy: function() {
    log(this.id + ' being called to destroy');
    this.speaker._destroySound(this);
  },

  gainAdjustedVolume: function(volume) {
    if (!this.gain) {
      log('no volume adjustment');
      return volume / 100;
    }

    var adjusted = Math.max(Math.min((volume / 100) * (50 * Math.pow(10, this.gain / 20)), 100), 0) / 100;

    log('gain adjustment is ' + this.gain + ', and final adjusted volume is ' + adjusted);

    return adjusted;
  }

};

var Speaker = function(options) {
  var speaker = this;

  var aTest = document.createElement('audio');
  if (document.createElement('audio').canPlayType('audio/aac')) {
    this.preferred = 'aac,mp3';
  } else {
    this.preferred = 'mp3';
  }
};

Speaker.prototype = {
  vol: 100,  // 0..100
  outstandingPlays: { },

  activeAudio: null,  // Audio element that we play music with
  fadingAudio: null,  // Audio element that holds music fading out
  preparingAudio: null, // Audio element holding music we are queueing up

  prepareWhenReady: null, // url to prepare when active player is fully loaded

  currentSound: null,  // currently playing sound. when a sound finishes, it is removed from this

  initializeAudio: function() {
    // On mobile devices, we need to kick off playback of a sound in
    // response to a user event. This does that.
    if (!this.activeAudio) {
      log('initializing for mobile');

      this.activeAudio = new Audio(SILENCE);
      this._addEventListeners(this.activeAudio);
      this.activeAudio.loop = false;

      this.fadingAudio = new Audio(SILENCE);
      this._addEventListeners(this.fadingAudio);
      this.fadingAudio.loop = false;

      this.preparingAudio = this.prepareWhenReady ? new Audio(this.prepareWhenReady) : new Audio(SILENCE);
      this.prepareWhenReady = null;
      this._addEventListeners(this.preparingAudio);
      this.preparingAudio.loop = false;

    } else {
      log('mobile already initialized');
    }
  },

  _addEventListeners: function(audio) {
    audio.addEventListener('pause', _.bind(this._onAudioPauseEvent, this));
    audio.addEventListener('ended', _.bind(this._onAudioEndedEvent, this));
    audio.addEventListener('timeupdate', _.bind(this._onAudioTimeUpdateEvent, this));
    //this._debugAudioObject(audio);
  },

  _onAudioPauseEvent: function(event) {
    var audio = event.currentTarget;

    if (audio.src === SILENCE) {
      return;
    }

    if ((audio !== this.activeAudio) || (audio.currentTime === audio.duration)) {
      return;
    }

    if (!this.currentSound || (this.currentSound.url !== audio.src)) {
      log('active audio pause, but it isn\'t current');
      return;
    }

    this.currentSound.trigger('pause');
  },

  _onAudioEndedEvent: function(event) {
    var audio = event.currentTarget;

    if (audio.src === SILENCE) {
      return;
    }

    if (audio !== this.activeAudio) {
      return;
    }

    if (!this.currentSound || (this.currentSound.url !== audio.src)) {
      log('active audio ended, but it isn\'t current', audio.src);
      return;
    }

    log('active audio ended');
    var sound = this.currentSound;
    this.currentSound = null;
    sound.trigger('finish');
  },

  _onAudioTimeUpdateEvent: function(event) {
    var audio = event.currentTarget;

    if (audio.src === SILENCE) {
      return;
    }

    if (audio !== this.activeAudio) {
      return;
    }

    if (!this.currentSound || (this.currentSound.url !== audio.src)) {
      log('active audio elapsed, but it isn\'t current');
      return;
    }

    this.currentSound.trigger('elapse');

    if (this.prepareWhenReady) {
      this.prepare(this.prepareWhenReady);
    }
  },

  _debugAudioObject: function(object) {
    var events = [ 'abort', 'load', 'loadend', 'loadstart', 'loadeddata', 'loadedmetadata', 'canplay', 'canplaythrough', 'seeked', 'seeking', 'stalled', 'timeupdate', 'volumechange', 'waiting', 'durationchange', 'progress', 'emptied', 'ended', 'play', 'pause'  ];
    var speaker = this;

    for (var i = 0; i < events.length; i++) {
      object.addEventListener(events[i], function(event) {
        var audio = event.currentTarget;
        var name = (audio === speaker.activeAudio) ?    'active' :
                   (audio === speaker.preparingAudio) ? 'preparing' :
                                           'fading';

        log(name + ': ' + event.type);
        log('    active: ' + d(speaker.activeAudio));
        log('    preparing: ' + d(speaker.preparingAudio));
        log('    fading: ' + d(speaker.fadingAudio));

        if (audio.src === SILENCE) {
          return;
        }
      });
    }
  },

  // Create and return new sound object. This throws the song into
  // the preparing audio instance.
  create: function(url, optionsAndCallbacks) {
    var id = _.uniqueId('feed-play-');
    var sound = new Sound(this, optionsAndCallbacks, id, url);

    log('created play ' + id + ' (' + url + ')', optionsAndCallbacks);

    this.outstandingPlays[sound.id] = sound;

    // start loading sound, if we can
    if (!this.activeAudio) {
      this.prepareWhenReady = sound.url;
    } else {
      this._prepare(sound.url, sound.startPosition);
    }

    return sound;
  },
  
  prepare: function(url) {
    if (!this.activeAudio) {
      this.prepareWhenReady = url;
      return;
    }

    var ranges = this.activeAudio.buffered;
    if ((ranges.length > 0) && (ranges.end(ranges.length - 1) >= this.activeAudio.duration)) {
      return this._prepare(url, 0);
    }

    if (this.activeAudio.url === SILENCE) {
      return this._prepare(url, 0);
    }

    // still loading primary audio - so hold off for now
    this.prepareWhenReady = url;
  },

  _prepare: function(url, startPosition) {
    // empty out any pending request
    this.prepareWhenReady = null;

    if (this.preparingAudio.src !== url) {
      log('preparing ' + url);
      this.preparingAudio.src = url;
    }

    if (startPosition && (this.preparingAudio.currentTime !== startPosition)) {
      log('advancing preparing audio to', startPosition / 1000);
      this.preparingAudio.currentTime = startPosition / 1000;
    }
  },

  /*
   * Kick off playback of the requested sound.
   */
  
  _playSound: function(sound) {
    var speaker = this;

    if (!this.activeAudio) {
      console.log('**** player.initializeAudio() *** not called');
      return;
    }

    if (this.currentSound === sound) {
      if (this.activeAudio.paused) {
        log(sound.id + ' was paused, so resuming');

        // resume playback
        this.activeAudio.play()
          .then(function() {
            log('resumed playback');
            sound.trigger('play');
        
          })
          .catch(function(error) { 
            log('error resuming playback');
            speaker.currentSound = null;
            sound.trigger('finish');
          });

      } else {
        log(sound.id + ' is already playing');
      }

    } else {
      if (this.preparingAudio.src !== sound.url) {
        this._prepare(sound.url, sound.startPosition);
      }

      // move prepared sound into active player
      var oldActiveAudio = this.activeAudio;
      this.activeAudio = this.preparingAudio;
      this.preparingAudio = oldActiveAudio;

      this.activeAudio.volume = sound.gainAdjustedVolume(this.vol);
      this.preparingAudio.src = SILENCE;

      var existingSound = this.currentSound;
      this.currentSound = null;
      if (existingSound) {
        existingSound.trigger('finish');
      }
      
      log(sound.id + ' starting');
      this.activeAudio.play()
        .then(function() {
          log('success starting playback');
          speaker.currentSound = sound;
          sound.trigger('play');
        })
        .catch(function(error) {
          log('error starting playback', error);
          sound.trigger('finish', error);
        })
    }
  },

  _destroySound: function(sound) {
    log('want to destroy, and current is', sound, this.currentSound);
    sound.off();

    if (this.currentSound === sound) {
      log('destroy triggered for current sound', sound.id);
      this.activeAudio.pause();
    }

    delete speaker.outstandingPlays[this.id];
  },

  _pauseSound: function(sound) {
    if (sound !== this.currentSound) {
      return;
    }

    if (sound.url !== this.activeAudio.src) {
      log('trying to pause current song, but it is not in the active audio player');
      return;
    }

    this.activeAudio.pause();
  },

  _position: function(sound) {
    if (sound === this.currentSound) {
      if (sound.url !== this.activeAudio.src) {
        log('trying to get current song position, but it is not in the active audio player');
      }
      
      return this.activeAudio.currentTime;

    } else {
      return 0;

    }
  },

  _duration: function(sound) {
    if (sound === this.currentSound) {
      if (sound.url !== this.activeAudio.src) {
        log('trying to get current song duration, but it is not in the active audio player');
      }
      var d = this.activeAudio.duration;
      return isNaN(d) ? 0 : d;

    } else {
      return 0;

    }
  },

  // set the volume (0-100)
  setVolume: function(value) {
    if (typeof value !== 'undefined') {
      this.vol = value;

      if (this.currentSound) {
        this.activeAudio.volume = song.gainAdjustedVolume(value);
      }

      this.trigger('volume', value);
    }

    return this.vol;
  }

};

// add events to speaker class
_.extend(Speaker.prototype, Events);

var speaker = null;

// only export a single speaker
module.exports = function(options, onReady) {
  if (speaker === null) {
    speaker = new Speaker(options);
  }

  onReady(speaker.preferred);

  return speaker;
};

