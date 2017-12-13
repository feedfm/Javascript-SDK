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
var log = require('./log');
var Events = require('./events');
var util = require('./util');
var SoundManager = require('soundmanager2');

// fake console to redirect soundmanager2 to the feed logger
var feedConsole = {
  log: log,
  info: log,
  warn: log,
  error: log
};

var Sound = function(options) { 
  var obj = _.extend(this, Events);

  if (options) {
    if ('startPosition' in options) {
      this.startPosition = options.startPosition;
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
    var sound = this;

    if (this.sm2Sound) {
      if (!this.sm2Sound.fake && this.startPosition) {
        var startPosition = this.startPosition;

        this.sm2Sound.load({
          whileloading: function() {
            if ((this.playState === 0) && (this.duration > startPosition)) {
              // start playback as soon as we can
              this.setPosition(startPosition);
              this.play();
            }
          }
        });
      } else if (this.sm2Sound.isHTML5) {
        this.sm2Sound.play();
      } else {
        // deal with Flash callback issues
        setTimeout(function() {
          sound.sm2Sound.play();
        }, 1);
      }
    }
  },

  // pause playback of the current sound clip
  pause: function() {
    if (this.sm2Sound) {
      this.sm2Sound.pause();
    }
  },

  // resume playback of the current sound clip
  resume: function() {
    if (this.sm2Sound) {
      this.sm2Sound.resume();
    }
  },

  // elapsed number of milliseconds played
  position: function() {
    if (this.sm2Sound) {
      return this.sm2Sound.position;
    } else {
      return 0;
    }
  },

  // duration in milliseconds of the song
  // (this may change until the song is full loaded)
  duration: function() {
    if (this.sm2Sound) {
      var d = this.sm2Sound.duration;
      return d ? d : 1;
    } else {
      return 1;
    }
  },

  // stop playing the given sound clip, unload it, and disable events
  destroy: function() {
    log('destroy triggered for', this.id);

    if (this.sm2Sound) {
      delete speaker.outstandingPlays[this.id];
      this.sm2Sound.destruct();
      this.sm2Sound = null;
    }

    this.off();
  },

  _nonRepeatTrigger: function(event) {
    if (this.lastTrigger !== event) {
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
  var speaker = this;

  options = _.extend({ swfBase: '//feed.fm/js/latest/' }, options);

  this.onReadyPromise = $.Deferred();

  var config = {
    wmode: 'transparent',
    useHighPerformance: true,
    flashPollingInterval: 500,
    html5PollingInterval: 500,
    debugMode: options.debug || false,
    useConsole: options.debug ? true : false, // feedConsole : null,
    debugFlash: options.debug || false,
    preferFlash: options.preferFlash || false,
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
  mobileInitialized: false,
  onReadyPromise: null,

  initializeForMobile: function() {
    if (!this.mobileInitialized) {
      // Just play a blank mp3 file that we know the location of, presumably
      // while we ping the server for the song we want
      var sound = this._createSM2Sound({
        id: 'silence',
        url: this.silence,
        volume: 1,
        autoPlay: true,
        type: 'audio/mp3'
      });

      this.mobileInitialized = !sound.fake;
    }
  },

  // start playing the given clip and return sound object
  create: function(url, callbacks) {
    var sound = new Sound(callbacks);
    sound.id = _.uniqueId('play');
    sound.url = url;

    this.outstandingPlays[sound.id] = sound;

    this._createAndAssignSM2Sound(sound);

    return sound;
  },

  _createSM2Sound: function(options) { 
    return window.soundManager.createSound(options);
  },

  _createAndAssignSM2Sound: function(sound) {
    var speaker = this;

    sound.sm2Sound = this._createSM2Sound({
      id: sound.id,
      url: sound.url,
      volume: sound.gainAdjustedVolume(speaker.vol),
      autoPlay: false,
      type: 'audio/mp3',
      onfinish: function() {
        log(sound.id + ': onfinish');
        this.destruct();
        delete speaker.outstandingPlays[sound.id];
        sound._nonRepeatTrigger('finish');
      },
      onid3: function() {
        log(sound.id + ': onid3');
      },
      onstop: function() {
        log(sound.id + ': onstop');
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
         log(sound.id + ' failure!');
          sound._nonRepeatTrigger('finish', true);
          // consider this a failure
          log('destroying after onload failure');
          sound.destroy();
        }
      },
      ondataerror: function() {
        log(sound.id + ': ondataerror');
        sound._nonRepeatTrigger('finish', true);
        log('destroying after ondataerr');
        sound.destroy();
      },
      onconnect: function() {
        log(sound.id + ': onconnect' );
      },
      onbufferchange: function() {
        log(sound.id + ': onbufferchange');
      },
      whileplaying: function() {
        sound.trigger('elapse');
      }
    });

    return sound;
  },

  // set or get the volume (0-100)
  setVolume: function(value) {
    if (typeof value !== 'undefined') {
      this.vol = value;

      _.each(this.outstandingPlays, function(song) {
        song.sm2Sound.setVolume(song.gainAdjustedVolume(value));
      });

      this.trigger('volume', value);
    }

    return this.vol;
  }

};

// add events to speaker class
_.extend(Speaker.prototype, Events);

var speaker = null;

// there should only ever be a single instance of 'Speaker'
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

