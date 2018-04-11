/*global module:false */

/*
 * The speaker object encapsulates the SoundManager2 code and boils it down
 * to the following api:
 *
 *    speaker().initializeForMobile: mobile clients can only start using
 *      speaker when handling an 'onClick' event. This call should be made 
 *      at that time to get sound initialized while waiting for details
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
 *          play:           event handler for 'play' event
 *          pause:          event handler for 'pause' event
 *          finish:         event handler for 'finish' event
 *
 *       The returned object emits the following events:
 *         play: the song has started playing or resumed playing after pause
 *         pause: the song has paused playback
 *         finish: the song has completed playback and the song object
 *           is no longer usable and should be destroyed
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
 *   swfBase: URL pointing to directory containing 'soundmanager2.swf' file 
 *            for flash fallback
 *   preferFlash: if true, opt to use the flash plugin rather than the
 *                browser's 'audio' tag
 *   debug: if true, emit debug information to the console
 *   silence: URL to an mp3 with no sound, for initializing mobile clients.
 *            defaults to swfBase + '/silence.mp3'
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
 * This code uses the wonderful SoundManager2 api and falls back to
 * the soundmanager2 flash plugin if HTML5 audio isn't available. 
 *
 */

var _ = require('underscore');
var $ = require('jquery');
var log = require('./nolog');
var Events = require('./events');
var util = require('./util');
var SoundManager = require('soundmanager2');
var version = require('./version');

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

  if (options) {
    if ('startPosition' in options) {
      this.startPosition = options.startPosition;
    }

    if ('endPosition' in options) {
      this.endPosition = options.endPosition;
    }

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

Sound.prototype = {
  play: function() {
    return this.speaker._playSound(this);
  },

  // pause playback of the current sound clip
  pause: function() {
    return this.speaker._pauseSound(this);
  },

  // resume playback of the current sound clip
  resume: function() {
    return this.speaker._playSound(this);
  },

  // elapsed number of milliseconds played
  position: function() {
    return this.speaker._position(this);
  },

  // duration in milliseconds of the song
  // (this may change until the song is full loaded)
  duration: function() {
    return this.speaker._duration(this);
  },

  // stop playing the given sound clip, unload it, and disable events
  destroy: function() {
    this.off();

    log(this.id + ' being called to destroy');
    this.speaker._destroySound(this);
  },

  _nonRepeatTrigger: function(event) {
    if (this.lastTrigger !== event) {
      log('***' + this.id + ':' + event + '***');

      this.lastTrigger = event;
      this.trigger.apply(this, Array.prototype.slice.call(arguments, 0));
    }
  },

  gainAdjustedVolume: function(volume) {
    if (!this.gain) {
      log('no volume adjustment');
      return volume;
    }

    var adjusted = Math.max(Math.min((volume / 100) * (50 * Math.pow(10, this.gain / 20)), 100), 0);

    log('gain adjustment is ' + this.gain + ', and final adjusted volume is ' + adjusted);

    return adjusted;
  }

};

var Speaker = function(options) {
  options = _.extend({ swfBase: '//feed.fm/js/' + version + '/' }, options);

  var speaker = this;

  speaker.onReadyPromise = $.Deferred();

  var config = {
    wmode: 'transparent',
    useHighPerformance: true,
    flashPollingInterval: 500,
    html5PollingInterval: 500,
    debugMode: options.debug || false,
    useConsole: options.debug ? true : false, // feedConsole : null,
    debugFlash: false,
    preferFlash: false,
    url: util.addProtocol(options.swfBase, true),
    onready: function() {
      var preferred;

      if (window.soundManager.canPlayMIME('audio/aac')) {
        // some clients play aac, and we prefer that
        preferred = 'aac,mp3';
      } else {
        // every client plays mp3
        preferred = 'mp3';
      }

      speaker.onReadyPromise.resolve(preferred);
    }
  };

  // The SoundManager library likes to watch for the onpageload
  // event and initialize itself as soon as the page loads. This
  // causes problems when SoundManager is loaded up lazily by requirejs
  // vs packaged with all the Feed SDK. When packaging things up,
  // we prefix all the code with 'window.SM2_DEFER = true;' to prevent
  // the code from initializing on load, but then the SoundManager
  // code doesn't make the 'window.soundManager' singleton, so we do that
  // here
  if (!window.soundManager) {
    window.soundManager = new SoundManager();
  }
  
  window.soundManager.setup(config);

  var s = options.silence;
  if (!s) {
    s = options.swfBase;
    if (s[s.length - 1] !== '/') {
      s += '/';
    }
    s += '5seconds.mp3';
  }

  this.silence = util.addProtocol(s, options.secure);
};

Speaker.prototype = {
  vol: 100,
  outstandingPlays: { },
  onReadyPromise: null,

  sm2Sound: null,      // singleton Soundmanager2 sound object
  currentSound: null,  // currently playing sound
  nextSound: null,     // song to play when current is stopped

  mobileInitialized: false, // true if we've created an audio object

  initializeForMobile: function() {
    // On mobile devices, we need to kick off playback of a sound in
    // response to a user event. This does that.
    if (!this.sm2Sound && !this.currentSound && !this.mobileIntialized) {
      log('initializing for mobile');
      var sound = this.create(this.silence, { });
      sound.play();

      this.mobileInitialized = true;
    } else {
      log('mobile already initialized');
    }
  },

  // Create and return new sound object. This does not auto-player.
  create: function(url, callbacks) {
    var id = _.uniqueId('feed-play-');
    var sound = new Sound(this, callbacks, id, url);

    log('created play ' + id + ' (' + url + ')');

    this.outstandingPlays[sound.id] = sound;

    return sound;
  },

  /*
   * Kick off playback of the requested sound.
   */
  
  _playSound: function(sound) {
    var speaker = this;

    if (!this.sm2Sound) {
      // create the singleton Audio instance for playback
      log('constructing new Audio instance');

      this.currentSound = sound;

      var options = this._sm2options(sound);
      this.sm2Sound = window.soundManager.createSound(options);

      if (sound.startPosition > 0) {
        log(sound.id + ' starting with offset');
        // play will kick off once enough of the song has loaded

      } else {
        log(sound.id + ' starting immediately');
        this.sm2Sound.play();
      }

      return;

    } else if (this.currentSound === sound) {
      if (this.sm2Sound.paused) {
        log(sound.id + ' was paused, so resuming');

        // resume playback
        this.sm2Sound.resume();

      } else {

        // start playback
        var options = this._sm2options(sound);
        if (sound.startPosition > 0) {
          log(sound.id + ' starting with offset');
          this.sm2Sound.load(options); // play will kick off once enough of the song has loaded

        } else {
          log(sound.id + ' starting immediately');
          this.sm2Sound.play(options);

        }

      }

    } else if (!this.currentSound) {
      log(sound.id + ' wants to start; no other active song');

      this.currentSound = sound;

      // start playback
      var options = this._sm2options(sound);
      if (sound.startPosition > 0) {
        log(sound.id + ' starting with offset');
        this.sm2Sound.load(options); // play will kick off once enough of the song has loaded

      } else {
        log(sound.id + ' starting immediately');
        this.sm2Sound.play(options);

      }
 
    } else {
      log(sound.id + ' wants to start; stopping active song');

      speaker.nextSound = sound;

      // stop current sound, and then advance to 'nextSound' upon receiving 'onstop' event
      this.sm2Sound.stop();

    }
  },

  _destroySound: function(sound) {
    log('want to destroy, and current is', sound, this.currentSound);

    if (this.currentSound === sound) {
      log('destroy triggered for current sound', sound.id);
      this.sm2Sound.stop();

    } else {
      log('destroy triggered for inactive sound', sound.id);
      delete speaker.outstandingPlays[this.id];
    }
  },

  _pauseSound: function(sound) {
    if ((sound === this.currentSound) && this.sm2Sound) {
      this.sm2Sound.pause();
    }
  },

  _position: function(sound) {
    if ((sound === this.currentSound) && this.sm2Sound) {
      return this.sm2Sound.position;
    } else {
      return 0;
    }
  },

  _duration: function(sound) {
    if ((sound === this.currentSound) && this.sm2Sound) {
      var d = this.sm2Sound.duration;
      return d ? d : 1;
    } else {
      return 1;
    }
  },

  _sm2options: function(sound) {
    var speaker = this;

    return {
      id: "feed.fm",
      url: sound.url,
      volume: sound.gainAdjustedVolume(speaker.vol),
      autoPlay: false,
      type: 'audio/mp3',
      onfinish: function() {
        // on next run loop, make this not the active sound anymore, and
        // kick off any other sound waiting for our completion
        speaker._finishAndAdvance(sound);
      },

      onid3: function() {
        log(sound.id + ': onid3');
      },

      onstop: function() {
        delete speaker.outstandingPlays[sound.id];

        if (speaker.currentSound == sound) {
          log(sound.id + ' stopped');
          speaker.currentSound = null;

          if (speaker.nextSound) {
            log(sound.id + ' kicking off next sound');
            speaker.currentSound = speaker.nextSound;
            speaker.nextSound = null;

            speaker.currentSound.play();

          } else {
            log('no next song to kick off after stopping ' + sound.id);

          }

        } else {
          log(sound.id + ' stopped, but wasn\' active song, so ignoring');

        }
      },

      onsuspend: function() {
        log(sound.id + ': suspend');
      },

      onresume: function() {
        log(sound.id + ': onresume');
        sound._nonRepeatTrigger('play');
      },

      onplay: function() {
        log(sound.id + ': onplay');
        sound._nonRepeatTrigger('play');
      },

      onpause: function() {
        log(sound.id + ': pause');
        sound._nonRepeatTrigger('pause');
      },

      onload: function(success) {
        log(sound.id + ': onload', success);
        if (!success) {
          log(sound.id + ' load failure!');
          speaker._finishAndAdvance(sound, true);
        }
      },

      ondataerror: function() {
        log(sound.id + ': ondataerror');
        speaker._finishAndAdvance(sound, true);
      },

      onconnect: function() {
        log(sound.id + ': onconnect' );
      },

      onbufferchange: function() {
        log(sound.id + ': onbufferchange');
      },

      whileloading: function() {
        var startPosition = sound.startPosition;

        if ((speaker.currentSound === sound) 
            && (speaker.sm2Sound.playState === 0) 
            && (sound.duration > startPosition)) {
          // start playback as soon as we can
          speaker.sm2Sound.setPosition(startPosition);
          speaker.sm2Sound.play();
        }
      },

      whileplaying: function() {
        if ((sound.position() > 0) && (sound.endPosition > 0)  && (sound.position() >= sound.endPosition)) {
          if (speaker.currentSound === sound) {
            log(sound.id + ': playback hit trim');
            // stop playback, which triggers 'onstop' event, which triggers 'finish' call
            speaker.sm2Sound.stop();

          } else {
            log(sound.id + ': playback hit trim, but it is not current sound, so ignoring');

          }
        } else {
          sound.trigger('elapse');
        }
      }
    };
  },

  _finishAndAdvance: function(sound, err) {
    var speaker = this;

    // send out finish event on next run loop.
    // (next loop prevents error when we re-use the Audio object
    //  before the current sm2Sound fully stops/finishes)
    setTimeout(function() {
      delete speaker.outstandingPlays[sound.id];

      if (speaker.currentSound == sound) {
        log(sound.id + ' no longer active sound');
        speaker.currentSound = null;

        if (speaker.nextSound) {
          log(sound.id + ' kicking off next sound, which techincally shouldn\'t happen');
          speaker.currentSound = speaker.nextSound;
          speaker.nextSound = null;

          speaker.currentSound.play();
        }
      }

      log(sound.id + ' triggering finish');
      sound._nonRepeatTrigger('finish', err);
    }, 1);
  },

  // set or get the volume (0-100)
  setVolume: function(value) {
    if (typeof value !== 'undefined') {
      this.vol = value;

      if (this.sm2Sound && this.currentSound) {
        this.currentSound.setVolume(song.gainAdjustedVolume(value));
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

  if (onReady) {
    speaker.onReadyPromise.then(function(formats) {
      onReady(formats);
    });
  }

  return speaker;
};

