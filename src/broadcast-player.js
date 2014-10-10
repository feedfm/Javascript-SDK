/*global define:false */

define([ 'underscore', 'feed/mic', 'feed/player', 'feed/events' ], function(_, Mic, Player, Events) {

  // When user requests come in from the view to play/pause,
  // try to grab the mic and execute them. If we can't grab
  // it, then forward the commands to the mic holder. If we
  // can grab the mic, then make sure we've got a player
  // instance and we send the command to the player.

  var BroadcastPlayer = function() {
    var bp = this;

    this.player = null;
    this.playerArgs = arguments;

    // assumed state of player in other window
    this.remotePlayerState = {
      state: 'idle',
      maybeCanSkip: false,
      duration: 0,
      position: 0
    };

    // events a new listener should get if just joining up
    this.welcomeMessage = { };

    this.mic = new Mic(_.bind(this.welcomeMessageGenerator, this),
                       _.bind(this.welcomeMessageReceiver, this));

    // capture incoming commands
    this.mic.on('pc', function() {
      bp.onPlayerCommand.apply(bp, Array.prototype.slice.call(arguments, 0));
    });

    // capture incoming events
    this.mic.on('pe', function() {
      bp.onPlayerEvent.apply(bp, Array.prototype.slice.call(arguments, 0));
    });

    // handle and trigger events
    _.extend(this, Events);
  };

  BroadcastPlayer.prototype.onPlayerCommand = function(arg) {
    // if we have the mic, we execute the commands
    //
    console.log('on player command', arg);

    if (this.mic.grab()) {
      var player = this.getPlayer();

      console.log('doing ' + arg.cmd, player);

      switch (arg.cmd) {
        case 'play':    player.play();    break;
        case 'pause':   player.pause();   break;
        case 'like':    player.like();    break;
        case 'unlike':  player.unlike();  break;
        case 'dislike': player.dislike(); break;
        case 'skip':    player.skip();    break;
      }
    }
  };

  BroadcastPlayer.prototype.welcomeMessageGenerator = function() {
    var eventsOrder = [ 'placement-changed', 'placement', 'station-changed', 'stations', 'play-active', 'play-started' ];
    var events = [];

    for (var i = 0; i < eventsOrder.length; i++) {
      if (eventsOrder[i] in this.welcomeMessage) {
        events.push(this.welcomeMessage[eventsOrder[i]]);
      }
    }

    var state = {
      state: this.player.getCurrentState(),
      maybeCanSkip: this.player.maybeCanSkip(),
      position: this.player.getPosition(),
      duration: this.player.getDuration()
    };

    return { state: state, events: events };
  };

  BroadcastPlayer.prototype.welcomeMessageReceiver = function(welcome) {
    console.log('receiving welcome message');

    for (var i = 0; i < welcome.events.length; i++) {
      this.onPlayerEvent({ state: welcome.state, event: welcome.events[i] });
    }
  };

  BroadcastPlayer.prototype.onPlayerEvent = function(arg) {
    // update local state to match actual player, then forward out event to view
    this.remotePlayerState = arg.state;

    // cache the placement/station info and latest active play for welcome message
    switch (arg.event[0]) {
      case 'placement-changed':
      case 'placement':
      case 'station-changed':
      case 'stations':
      case 'play-active':
      case 'play-started':
        this.welcomeMessage[arg.event[0]] = arg.event;
        break;

      case 'play-completed':
        delete this.welcomeMessage['play-completed'];
        delete this.welcomeMessage['play-started'];
        break;
    }

    this.trigger.apply(this, arg.event);
  };

  BroadcastPlayer.prototype.onLocalPlayerEvent = function() {
    console.log('got local player event', arguments);

    // package up display state
    var state = {
      state: this.player.getCurrentState(),
      maybeCanSkip: this.player.maybeCanSkip(),
      position: this.player.getPosition(),
      duration: this.player.getDuration()
    };

    // tell everybody about the event through the mic
    this.mic.speak('pe', { state: state, event: Array.prototype.slice.call(arguments, 0) });
  };

  BroadcastPlayer.prototype.getPlayer = function() {
    var bp = this;

    if (!this.player) {
      if (this.playerArgs.length === 3) {
        this.player = new Player(this.playerArgs[0], this.playerArgs[1], this.playerArgs[2]);

      } else {
        this.player = new Player(this.playerArgs[0], this.playerArgs[1]);
      }

      this.player.on('all', function() {
        bp.onLocalPlayerEvent.apply(bp, Array.prototype.slice.call(arguments, 0));
      });
    }

    return this.player;
  };

  BroadcastPlayer.prototype.tune = function() {
    if (this.mic.grab()) {
      this.getPlayer().tune();
    }
  };

  BroadcastPlayer.prototype.play = function() {
    this.mic.shout('pc', { cmd: 'play' });
  };

  BroadcastPlayer.prototype.pause = function() {
    this.mic.shout('pc', { cmd: 'pause' });
  };

  BroadcastPlayer.prototype.like = function() {
    this.mic.shout('pc', { cmd: 'like' });
  };

  BroadcastPlayer.prototype.unlike = function() {
    this.mic.shout('pc', { cmd: 'unlike' });
  };

  BroadcastPlayer.prototype.dislike = function() {
    this.mic.shout('pc', { cmd: 'dislike' });
  };

  BroadcastPlayer.prototype.skip = function() {
    this.mic.shout('pc', { cmd: 'skip' });
  };

  BroadcastPlayer.prototype.skip = function() {
    this.mic.shout('pc', { cmd: 'skip' });
  };

  BroadcastPlayer.prototype.maybeCanSkip = function() {
    return this.remotePlayerState.maybeCanSkip;
  };

  BroadcastPlayer.prototype.getCurrentState = function() {
    return this.remotePlayerState.state;
  };

  BroadcastPlayer.prototype.getDuration = function() {
    return this.remotePlayerState.duration;
  };

  BroadcastPlayer.prototype.getPosition = function() {
    return this.remotePlayerState.position;
  };

  var bp = this;
  BroadcastPlayer.prototype.session = {
    _deleteStoredCid: function() {
      if (bp.mic.grab()) {
        bp.getPlayer().session._deleteStoredCid();
      }
    }
  };

  return BroadcastPlayer;
});

/*
 * What to do when the original mic holder disappears?
 *
 */
