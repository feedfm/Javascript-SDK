/*global _:false, $:false */
/*jshint camelcase:false */

/*
 *  Feed Media Player View
 *
 *  This class will respond to events from an instance of Feed.Player
 *  and pass on user requests to the instance.
 *
 *  Create this with:
 *
 *    player = new Feed.Player(token, secret);
 *    playerView = new Feed.PlayerView(player, id);
 *
 *  Where 'id' is the ID of the DOM element containing the player.
 *  The player should have the following elements in it:
 *
 *  <div id='player-view'>
 *    <div>
 *      <div class='position'><div class='progress'></div></div> 
 *      <span class='status'>
 *        <span class='track'>track</span> by <span class='artist'>artist</span> on <span class='release'>release</span>
 *      </span>
 *    </div>
 *    <div class='elapsed'></div>
 *    <div class='duration'></div>
 *    <button class='play-button button-enabled'>Play</button>
 *    <button class='pause-button button-disabled'>Pause</button>
 *    <button class='skip-button button-disabled'>Skip</button>
 *  </div>
 *
 *  The buttons should all be 'button-disabled' except for the play
 *  button. As the player changes state, it will change the enabled
 *  status of each button.
 *
 *  The 'status' section will display the current song and the 'position'
 *  section will display the elapsed time played and duration of the
 *  song while it is playing. Additionally, error messages (like 'out of
 *  music' or 'can't skip') will be displayed for a few seconds in the
 *  status section as well.
 *
 *  The rendering of the status can be changed by overriding
 *  the renderStatus(statusText) method, and the rendering of the position
 *  can be changed by overriding the renderPosition(positionInMillis, durationInMillis)
 *  methods. If you just want to override how the title of a song is
 *  rendered, then the formatPlay(play) method should be overridden.
 *
 */

(function() {
  var PlayerView = function(id, player) {
    this.id = id;
    this.alertId = null;
    this.durationId = null;
    this.startedPlayback = false;

    this.$el = $('#' + id);
    this.player = player;

    
    this.player.on('play-started', this._onPlayStarted, this);
    this.player.on('play-paused', this._onPlayPaused, this);
    this.player.on('play-resumed', this._onPlayResumed, this);
    this.player.on('play-completed', this._onPlayCompleted, this);
    this.player.on('plays-exhausted', this._onPlaysExhausted, this);
    this.player.on('skip-denied', this._onSkipDenied, this);
    this.player.on('muted', _.bind(this.renderMute, this, true));
    this.player.on('unmuted', _.bind(this.renderMute, this, false));

    this.player.on('all', function() {
      console.log('seeing', arguments);
    });

    this._enableButtonsBasedOnState();
    this.displayText = this.originalDisplayText = this.$('.status').html();
    this.renderStatus();

    this.renderMute(this.player.isMuted());

    this.$('.play-button').on('click', _.bind(this._onPlayButtonClick, this));
    this.$('.pause-button').on('click', _.bind(this._onPauseButtonClick, this));
    this.$('.skip-button').on('click', _.bind(this._onSkipButtonClick, this));
    this.$('.mute-button').on('click', _.bind(this._onMuteButtonClick, this));
    this.$('.un-mute-button').on('click', _.bind(this._onUnMuteButtonClick, this));
  };

  PlayerView.prototype._onMuteButtonClick = function() {
    this.player.setMuted(true);
  };

  PlayerView.prototype._onUnMuteButtonClick = function() {
    this.player.setMuted(false);
  };

  PlayerView.prototype.renderMute = function(isMuted) {
    if (isMuted) {
      this.$('.mute-button').removeClass('button-enabled').addClass('button-disabled');
      this.$('.un-mute-button').removeClass('button-disabled').addClass('button-enabled');
    } else {
      this.$('.mute-button').removeClass('button-disabled').addClass('button-enabled');
      this.$('.un-mute-button').removeClass('button-enabled').addClass('button-disabled');
    }
  };

  PlayerView.prototype._onPlayButtonClick = function() {
    this.player.play();
  };

  PlayerView.prototype._onPauseButtonClick = function() {
    this.player.pause();
  };

  PlayerView.prototype._onSkipButtonClick = function() {
    this.player.skip();
  };

  PlayerView.prototype.$ = function(arg) {
    return this.$el.find(arg);
  };

  PlayerView.prototype._onPlayStarted = function(play) {
    this.renderStatus(this.formatPlay(play));
    this._enableButtonsBasedOnState();
    this._enablePositionTracker();
  };

  PlayerView.prototype._enablePositionTracker = function() {
    var playerView = this;

    if (!this.durationId) {
      this.durationId = window.setInterval(function() {
        playerView.renderPosition(playerView.player.getPosition(), playerView.player.getDuration());
      }, 500);
    }
  };

  PlayerView.prototype._disablePositionTracker = function() {
    if (this.durationId) {
      window.clearInterval(this.durationId);
      this.durationId = null;
    }
  };

  PlayerView.prototype._onPlayResumed = function() {
    this._enablePositionTracker();
    
    this._enableButtonsBasedOnState();
  };

  PlayerView.prototype._onPlayPaused = function() {
    this._disablePositionTracker();

    this._enableButtonsBasedOnState();
  };

  PlayerView.prototype._onPlayCompleted = function() {
    this.renderStatus(this.originalDisplayText);
    this.renderPosition(0, 0);
    this._enableButtonsBasedOnState();
  };

  PlayerView.prototype._onPlaysExhausted = function() {
    this.renderAlert('There is no more music to play in this station!');

    this._enableButtonsBasedOnState();
  };

  PlayerView.prototype._onSkipDenied = function() {
    this.renderAlert('Sorry you\'ve temporarily run out of skips!');
  };

  PlayerView.prototype.formatPlay = function(play) {
    return '<span class=\'track\'>' + play.audio_file.track.title +
       '</span> by <span class=\'artist\'>' + play.audio_file.artist.name +
       '</span> on <span class=\'release\'>' + play.audio_file.release.title + '</span>';
  };

  PlayerView.prototype.formatStation = function(station) {
    return '<span class=\'station\'>' + station.name + '</span>';
  };

  PlayerView.prototype.renderStatus = function(displayText) {
    if (displayText !== undefined) {
      this.displayText = displayText;
    }

    if (!this.alertId) {
      this.$('.status').html(this.displayText).removeClass('alert');
    }
  };

  PlayerView.prototype.renderPosition = function(position, duration) {
    this.$('.elapsed').html(formatTime(position));
    this.$('.duration').html(formatTime(duration));


    if (duration === 0) {
      this.$('.progress').css('width', '0');
    } else {
      var elapsed = Math.round((position + 1000) / duration * 100);
      elapsed = (elapsed > 100) ? 100 : elapsed;
      this.$('.progress').css('width', elapsed + '%');
    }
  };

  function formatTime(millis) {
    var asSeconds = Math.floor(millis / 1000),
        secondsPart = (asSeconds % 60),
        minutesPart = Math.floor(asSeconds / 60);

    if (secondsPart < 10) {
      secondsPart = '0' + secondsPart;
    }

    return minutesPart + ':' + secondsPart;
  }

  PlayerView.prototype.renderAlert = function(alertText) {
    if (this.alertId) {
      window.clearTimeout(this.alertId);
    }

    this.$('.status').html(alertText).addClass('alert');

    var playerView = this;
    this.alertId = window.setTimeout(function() {
      playerView.alertId = null;
      playerView.renderStatus();
    }, 3000);
  };

  PlayerView.prototype._enableButtonsBasedOnState = function() {
    var state = this.player.getCurrentState();

    switch (state) {
      case 'playing':
        this.$('.play-button').removeClass('button-enabled').addClass('button-disabled').attr('disabled', 'true');
        this.$('.pause-button').removeClass('button-disabled').addClass('button-enabled').removeAttr('disabled');
        if (this.player.maybeCanSkip()) {
          this.$('.skip-button').removeClass('button-disabled').addClass('button-enabled').removeAttr('disabled');
        } else {
          this.$('.skip-button').removeClass('button-enabled').addClass('button-disabled').attr('disabled', 'true');
        }
        break;

      case 'paused':
        this.$('.play-button').removeClass('button-disabled').addClass('button-enabled').removeAttr('disabled');
        this.$('.pause-button').removeClass('button-enabled').addClass('button-disabled').attr('disabled', 'true');
        if (this.player.maybeCanSkip()) {
          this.$('.skip-button').removeClass('button-disabled').addClass('button-enabled').removeAttr('disabled');
        } else {
          this.$('.skip-button').removeClass('button-enabled').addClass('button-disabled').attr('disabled', 'true');
        }
        break;

      /* case 'idle': */
      default:
        this.$('.play-button').removeClass('button-disabled').addClass('button-enabled').removeAttr('disabled');
        this.$('.pause-button').removeClass('button-enabled').addClass('button-disabled').attr('disabled', 'true');
        this.$('.skip-button').removeClass('button-enabled').addClass('button-disabled').attr('disabled', 'true');
        break;
    }
  };

  window.Feed = window.Feed || {};
  window.Feed.PlayerView = PlayerView;

})();

