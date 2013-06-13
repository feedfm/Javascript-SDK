/*global _:false, $:false, SoundManager:false */

/*
 * The speaker object encapsulates the SoundManager2 code and boils it down
 * to the following api:
 *
 *    Feed.speaker.initializeForMobile: mobile clients can only start using
 *      speaker when handling an 'onClick' event. This call should be made 
 *      at that time to get sound initialized while waiting for details
 *      of what to play from the server.
 *
 *    Feed.speaker.setVolume(value): set the volume from 0 (mute) - 100 (full volume)
 *
 *    var sound = Feed.speaker.create(url, eventHandlerMap): create a new sound from the
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
 */

(function() {
  var log = window.Feed.log;

  var Sound = function(callbacks) { 
    var obj = _.extend(this, window.Feed.Events);

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
  
  var speaker = {
    vol: 100,
    outstandingPlays: { },
    mobileInitialized: false,
    initializationPromise: $.Deferred(),

    createSongObject: function(options) { 
      // this is replaced with a real call to SoundManager upon initialization
      return { 
        fake: true,
        options: options,
        setVolume: function() { },
        play: function() { },
        pause: function() { },
        resume: function() { },
        destruct: function() { }
      };
    },

    initializeForMobile: function() {
      if (!this.mobileInitialized) {
        // Just play a blank mp3 file that we know the location of, presumably
        // while we ping the server for the song we want
        var sound = this.createSongObject({
          id: 'silence',
          url: '/sample/5seconds.mp3',
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

      this.outstandingPlays[sound.id] = sound;

      sound.songObject = this.createSongObject({
        id: sound.id,
        url: url,
        volume: speaker.vol,
        autoPlay: false,
        type: 'audio/mp3',
        onfinish: function() {
          this.destruct();
          delete speaker.outstandingPlays[sound.id];
          sound._nonRepeatTrigger('finish');
        },
        onid3: function() {
          //log(sound.id + ": onid3");
        },
        onstop: function() {
          //log(sound.id + ": onstop");
        },
        onsuspend: function() {
          //log(sound.id + ": suspend");
        },
        onresume: function() {
          //log(sound.id + ": onresume");
          sound._nonRepeatTrigger('play');
        },
        onplay: function() {
          //log(sound.id + ": onplay");
          sound._nonRepeatTrigger('play');
        },
        onpause: function() {
          //log(sound.id + ": pause");
          sound._nonRepeatTrigger('pause');
        },
        onload: function(success) {
          //log(sound.id + ": onload", success);
          if (!success) {
            sound._nonRepeatTrigger('finish');
            // consider this a failure
            sound.destroy();
          }
        },
        ondataerror: function() {
          //log(sound.id + ": ondataerror");
          sound._nonRepeatTrigger('finish');
          sound.destroy();
        },
        onconnect: function() {
          //log(sound.id + ": onconnect" );
        },
        onbufferchange: function() {
          //log(sound.id + ": onbufferchange");
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
  _.extend(speaker, window.Feed.Events);

  function onready() {
    // swap in the true sound object creation function
    speaker.createSongObject = function(options) {
      return window.soundManager.createSound(options);
    };

    // pretend each existing clip has finished
    _.each(speaker.outstandingPlays, function(song) {
      song.songObject.options.onfinish.call(song.songObject);
    });

    speaker.initializationPromise.resolve();
  }

  // create instance of SoundManager
  // (note that we hacked it so that it doesn't build itself on load)
  window.soundManager = new SoundManager();
  window.soundManager.url = '/swf/four';
  window.soundManager.wmode = 'transparent';
  window.soundManager.debugMode = false;
  window.soundManager.debugFlash = false;
  window.soundManager.useHighPerformance = true;
  window.soundManager.preferFlash = false;
  window.soundManager.flashPollingInterval = 500;
  window.soundManager.html5PollingInterval = 500;
  window.soundManager.onready(onready);

  window.soundManager.beginDelayedInit();

  window.Feed = window.Feed || {};
  window.Feed.speaker = speaker;

})();
