/*global define:false */

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
 *    var sound = speaker().create(url, eventHandlerMap): create a new sound from the
 *       given url and return a 'song' object that can be used to pause/play/
 *       destroy the song and receive trigger events as the song plays/stops. 
 *
 *       The 'eventHandlerMap' is an object that maps events emitted from the
 *       returned object to handler functions. If you don't provide the
 *       callbacks here, you can do "sound.on('event', function() { ... })"
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
 *       we can't load a song, it will just get a 'finish' and no 'play'
 *
 *       The returned song object has this following api:
 *         play: start playback
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
 *     var mySpeaker = speaker(options);
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
 *   silence: URL to an mp3 with no sound, for initializing mobile clients
 *   secure: if true, default URLs for the soundmanager2.swf and silence mp3
 *                will come from 'https' locations
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

define([ 'underscore', 'feed/log', 'feed/events', 'feed/util', 'Soundmanager' ], function(_, log, Events, util, SoundManager) {

  var Sound = function(callbacks) { 
    var obj = _.extend(this, Events);

    if (callbacks) {
      _.each(callbacks, function(cb, ev) {
        obj.on(ev, cb);
      });
    }

    return obj;
  };

  Sound.prototype = {
    play: function() {
      if (this.songObject) {
        this.songObject.play();
      }
    },

    // pause playback of the current sound clip
    pause: function() {
      if (this.songObject) {
        this.songObject.pause();
      }
    },

    // resume playback of the current sound clip
    resume: function() {
      if (this.songObject) {
        this.songObject.resume();
      }
    },

    // elapsed number of milliseconds played
    position: function() {
      if (this.songObject) {
        return this.songObject.position;
      } else {
        return 0;
      }
    },

    // duration in milliseconds of the song
    // (this may change until the song is full loaded)
    duration: function() {
      if (this.songObject) {
        var d = this.songObject.duration;
        return d ? d : 1;
      } else {
        return 1;
      }
    },

    // stop playing the given sound clip, unload it, and disable events
    destroy: function() {
      log('destroy triggered for', this.id);

      if (this.songObject) {
        delete speaker.outstandingPlays[this.id];
        this.songObject.destruct();
        this.songObject = null;
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

  var Speaker = function(options) {
    var speaker = this;

    options = options || {};

    var config = {
      wmode: 'transparent',
      useHighPerformance: true,
      flashPollingInterval: 500,
      html5PollingInterval: 500,
      debugMode: options.debug || false,
      debugFlash: options.debug || false,
      preferFlash: options.preferFlash || false,
      url: util.addProtocol(options.swfBase || '//feed.fm/js/latest/', options.secure),
      onready: function() {
        // swap in the true sound object creation function
        speaker.createSongObject = function(songOptions) {
          return window.soundManager.createSound(songOptions);
        };

        // create actual sound objects for sounds already queued up
        _.each(speaker.outstandingPlays, function(sound) {
          var playing = sound.songObject.playing;

          speaker._assignSongObject(sound);

          if (playing) {
            log('playing already created sound');
            sound.songObject.play();
          }
        });
      }
    };

    var soundManager = window.soundManager = new SoundManager();
    
    soundManager.setup(config);

    this.silence = util.addProtocol(options.silence || '//feed.fm/js/latest/5seconds.mp3', options.secure);

  };

  Speaker.prototype = {
    vol: 100,
    outstandingPlays: { },
    mobileInitialized: false,

    createSongObject: function(options) { 
      // this is replaced with a real call to SoundManager upon initialization
      return { 
        fake: true,
        playing: false,
        options: options,
        setVolume: function() { },
        play: function() { this.playing = true; },
        pause: function() { this.playing = false; },
        resume: function() { this.playing = true; },
        destruct: function() { }
      };
    },

    initializeForMobile: function() {
      if (!this.mobileInitialized) {
        // Just play a blank mp3 file that we know the location of, presumably
        // while we ping the server for the song we want
        var sound = this.createSongObject({
          id: 'silence',
          url: this.silence,
          volume: 0,
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

      this._assignSongObject(sound);

      return sound;
    },

    _assignSongObject: function(sound) {
      var speaker = this;

      sound.songObject = this.createSongObject({
        id: sound.id,
        url: sound.url,
        volume: speaker.vol,
        autoPlay: false,
        type: 'audio/mp3',
        onfinish: function() {
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
            sound._nonRepeatTrigger('finish');
            // consider this a failure
            sound.destroy();
          }
        },
        ondataerror: function() {
          log(sound.id + ': ondataerror');
          sound._nonRepeatTrigger('finish');
          sound.destroy();
        },
        onconnect: function() {
          log(sound.id + ': onconnect' );
        },
        onbufferchange: function() {
          log(sound.id + ': onbufferchange');
        }
      });

      return sound;
    },

    // set or get the volume (0-100)
    setVolume: function(value) {
      if (typeof value !== 'undefined') {
        this.vol = value;

        _.each(this.outstandingPlays, function(song) {
          song.songObject.setVolume(value);
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
  return function(options) {
    if (speaker === null) {
      speaker = new Speaker(options);
    }

    return speaker;
  };

});
