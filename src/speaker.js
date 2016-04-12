/*global module:false */

var _ = require('underscore');
var $ = require('jquery');
var log = require('./log');
var Events = require('./events');
var util = require('./util');
var SoundManager = require('soundmanager2');


/**
 * The song has started playback or resumed playback
 * after a pause.
 *
 * @event Sound#play
 */

/**
 * The song has paused playback.
 *
 * @event Sound#pause
 */

/**
 * The song has finished playback, is no
 * longer usable, and should be destroyed. If
 * an argument of 'true' is passed with the
 * event, then the song didn't complete normally.
 *
 * @event Sound#finish
 */

/**
 *
 * @classdesc
 *
 * This class represents an audio object we
 * want to play. It emits a set of events
 * in a specific order:
 *
 * ( {@link Sound#event.play} -> ( {@link Sound#event.pause} | {@link Sound#event.play} )* -> )? {@link Sound#event.finish} )
 *
 * @constructor
 * @mixes Events
 */

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
  }

  return obj;
};

Sound.prototype = {

  /**
   * Start playback. If the sound object
   * was created via {@link Speaker#create} with a
   * `startPosition` option, then the first call
   * to play will start audio at that playback
   * position.
   *
   * This method should only be called once, to
   * start playback. Use {@link Sound#resume} to
   * resume playback.
   */

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

  /**
   * Pause playback of the current song
   */

  pause: function() {
    if (this.sm2Sound) {
      this.sm2Sound.pause();
    }
  },

  /**
   * Resume playback of the current song
   */

  resume: function() {
    if (this.sm2Sound) {
      this.sm2Sound.resume();
    }
  },

  /**
   * @return elapsed number of milliseconds of playback
   */

  position: function() {
    if (this.sm2Sound) {
      return this.sm2Sound.position;
    } else {
      return 0;
    }
  },

  /**
   * @return Duration of the audio clip, in milliseconds. Note
   *   that this might change while we are loading the song
   */

  duration: function() {
    if (this.sm2Sound) {
      var d = this.sm2Sound.duration;
      return d ? d : 1;
    } else {
      return 1;
    }
  },

  /**
   * stop playing the given sound clip, unload it,
   * and disable any attached event handlers.
   */

  destroy: function() {
    log('destroy triggered for', this.id);

    if (this.sm2Sound) {
      delete this.outstandingPlays[this.id];
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
  }
};

/**
 * Create a new Speaker object. __This class is intended to be a
 * singleton, so don't use this constructor__ - instead use the
 * {@link Speaker.getShared} method.
 *
 * @classdesc
 *
 * The speaker object encapsulates and simplifies the
 * SoundManager2 code to just give us what is needed for
 * radio music playback.
 *
 *
 * This code uses the wonderful SoundManager2 api and falls back to
 * the soundmanager2 flash plugin if HTML5 audio isn't available. 
 *
 * @param {object} options - configuration options
 * @param {string} [options.swfBase=./] - URL that points to a directory
 *           containing `soundmanager2.swf` file for flash fallback.
 * @param {boolean} [options.preferFlash=false] - if true, try to use the
 *           flash player for audio rather than HTML5
 * @param {boolean} [options.debug=false] - if true, emit debugging
 *           to the console
 * @param {string} [options.silence=options.swfBase + '/silence.mp3'] - URL to an
 *           mp3 with no sound, for initializing mobile clients
 *
 * @constructor
 */

var Speaker = function(options) {
  var speaker = this;

  options = _.extend({ swfBase: '//feed.fm/js/latest/' }, options);

  var d = $.Deferred();
  this.onReadyPromise = d.promise();

  /**
   * @readonly
   * @member {string} - comma separated string of formats
   *   the audio system prefers to play.
   */
  this.preferred = '';

  var config = {
    wmode: 'transparent',
    useHighPerformance: true,
    flashPollingInterval: 500,
    html5PollingInterval: 500,
    debugMode: options.debug || false,
    useConsole: options.debug ? true : false,
    debugFlash: options.debug || false,
    preferFlash: options.preferFlash || false,
    url: util.addProtocol(options.swfBase, true),
    onready: function() {

      if (window.soundManager.canPlayMIME('audio/aac')) {
        // some clients play aac, and we prefer that
        speaker.preferred = 'aac,mp3';
      } else {
        // every client plays mp3
        speaker.preferred = 'mp3';
      }

      d.resolve(speaker);
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

  /**
   * Mobile clients can only start using speaker when
   * handling an `onClick` event. This call should be made 
   * at that time to get sound initialized in case we
   * have to wait for details of what to play from
   * the server.
   */
 
  initializeForMobile: function() {
    if (!this.mobileInitialized) {
      // Just play a blank mp3 file that we know the location of, presumably
      // while we ping the server for the song we want
      var sound = this._createSM2Sound({
        id: 'silence',
        url: this.silence,
        volume: 0,
        autoPlay: true,
        type: 'audio/mp3'
      });

      this.mobileInitialized = !sound.fake;
    }
  },

  /**
   * Create and return a new Sound object
   *
   * @param {string} url - url to audio file
   * @param {object} optionsAndEvents - options for sound object
   * @param {number} optionsAndEvents.startPosition - time offset
   *               (in milliseconds) that the sound should begin
   *               playback at when we begin playback
   * @param {function} optionsAndEvents.play - function that will
   *               be called on {@link Sound#event:play} events
   * @param {function} optionsAndEvents.pause - function that will
   *               be called on {@link Sound#event:pause} events
   * @param {function} optionsAndEvents.finish - function that will
   *               be called on {@link Sound#event:finish} events
   * @return {Sound} new sound object
   */

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
      volume: speaker.vol,
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

  /**
   * Set or get the volume. This adjusts any sound
   * objects already created as well as future sound
   * objects.
   *
   * @param {number} volume New volume level 
   *           (0 = silent, 100 = full volume)
   */

  setVolume: function(value) {
    if (typeof value !== 'undefined') {
      this.vol = value;

      _.each(this.outstandingPlays, function(song) {
        song.sm2Sound.setVolume(value);
      });

      this.trigger('volume', value);
    }

    return this.vol;
  }

};

// add events to speaker class
_.extend(Speaker.prototype, Events);

// global shared instance
var speaker = null;

/**
 * This callback is passed a reference to the
 * speaker that became ready.
 *
 * @callback speakerReadyCallback
 * @param {Speaker} speaker - a ref to the ready
 *   speaker instance
 */

/**
 * Return a promise for a shared speaker instance.
 * 
 * @param {object} options - options sent to the Speaker
 *     constructor. See {@link Speaker}.
 * @param {speakerReadyCallback} [onReady] - a optional function
 *     that will be called after the music subsystem is
 *     initialized.
 * @return {Promise} a promise that yields a
 *   reference to the initialized shared speaker.
 */

Speaker.getShared = function(options, onReady) {
  if (!speaker) {
    speaker = new Speaker(options);
  }

  return speaker.onReadyPromise.then(function(s) {
    if (onReady) {
      onReady(s);
    }

    return s;
  });
};


// there should only ever be a single instance of 'Speaker'
module.exports = Speaker;

