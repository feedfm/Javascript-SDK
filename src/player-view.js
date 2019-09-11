/*
 *  Feed Media Player View
 *
 *  This class will respond to events from an instance of Feed.Player
 *  and pass on user requests to the instance.
 *
 *  Create this with:
 *
 *    player = new Feed.Player(token, secret);
 *    playerView = new Feed.PlayerView(id, player);
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
 *
 *    <button class='pause-button button-disabled'>Pause</button>
 *    <button class='skip-button button-disabled'>Skip</button>
 *    <button class='like-button button-disabled'>Like</button>
 *    <button class='dislike-button button-disabled'>Dislike</button>
 *  </div>
 *
 *  The buttons should all be 'button-disabled' except for the play
 *  button. As the player changes state, it will change the
 *  'button-disabled' classes to 'button-enabled'.
 *
 *  Note that the 'play-button' is visible before any playback starts,
 *  and while playback is paused. If you want a button that is only visible
 *  before any playback has started, then create a 'start-button'. If you
 *  want a button that is only visible when playback is paused, then
 *  create a 'resume-button'.
 *
 *  The 'like' button has an additional 'liked' class that is added to
 *  it when the current song has been liked. Likewise, the 'dislike' button
 *  has a 'disliked' class added to it when the current song has been
 *  disliked.
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
 *  The top level player element will have one of four classes set at
 *  all times: 'state-playing', 'state-idle', 'state-paused', or 'state-suspended'
 *
 */

import log from './log';

// make sure NodeList has forEach, since we use it below
if (window.NodeList && !NodeList.prototype.forEach) {
  NodeList.prototype.forEach = function (callback, thisArg) {
    thisArg = thisArg || window;
    for (var i = 0; i < this.length; i++) {
      callback.call(thisArg, this[i], i, this);
    }
  };
}

var PlayerView = function (id, player) {
  this.id = id;
  this.alertId = null;
  this.durationId = null;
  this.startedPlayback = false;

  this.$el = document.getElementById(id);
  this.player = player;

  this.player.on('placement', this._onPlacement, this);
  this.player.on('play-started', this._onPlayStarted, this);
  this.player.on('play-paused', this._onPlayPaused, this);
  this.player.on('play-resumed', this._onPlayResumed, this);
  this.player.on('play-completed', this._onPlayCompleted, this);
  this.player.on('play-liked', this._onPlayLiked, this);
  this.player.on('play-unliked', this._onPlayUnliked, this);
  this.player.on('play-disliked', this._onPlayDisliked, this);
  this.player.on('plays-exhausted', this._onPlaysExhausted, this);
  this.player.on('skip-denied', this._onSkipDenied, this);
  this.player.on('suspend', this._onSuspend, this);

  this._enableButtonsBasedOnState();
  this.displayText = this.originalDisplayText = document.querySelector('.status').innerHTML;
  this.renderStatus();

  document.querySelectorAll('.status').forEach(status => {
    status.addEventListener('click', this._onStatusClick.bind(this));
  });

  document.querySelectorAll('.play-button, .start-button, .resume-button').forEach(button => {
    button.addEventListener('click', this._onPlayButtonClick.bind(this));
  });

  document.querySelectorAll('.pause-button').forEach(pause => {
    pause.addEventListener('click', this._onPauseButtonClick.bind(this));
  });

  document.querySelectorAll('.skip-button').forEach(skip => {
    skip.addEventListener('click', this._onSkipButtonClick.bind(this));
  });

  document.querySelectorAll('.like-button').forEach(like => {
    like.addEventListener('click', this._onLikeButtonClick.bind(this));
  });

  document.querySelectorAll('.dislike-button').forEach(dislike => {
    dislike.addEventListener('click', this._onDislikeButtonClick.bind(this));
  });

};

PlayerView.prototype._onStatusClick = function () {
  var state = this.player.getCurrentState();

  if (state === 'playing') {
    this._onPauseButtonClick();

  } else {
    this._onPlayButtonClick();

  }
};

PlayerView.prototype._onPlayButtonClick = function () {
  this.player.initializeAudio();
  this.player.play();
};

PlayerView.prototype._onPauseButtonClick = function () {
  this.player.pause();
};

PlayerView.prototype._onSkipButtonClick = function () {
  this.player.skip();
};

PlayerView.prototype._onLikeButtonClick = function (event) {
  log('like button clicked!', event.target, this);

  if (event.target.classList.contains('liked')) {
    this.player.unlike();
  } else {
    this.player.like();
  }
};

PlayerView.prototype._onDislikeButtonClick = function () {
  this.player.dislike();
};

PlayerView.prototype.$ = function (arg) {
  return this.$el.find(arg);
};

PlayerView.prototype._onPlacement = function (placement) {
  if (!this.originalDisplayText) {
    this.originalDisplayText = this.formatPlacement(placement);

    this.renderStatus(this.originalDisplayText);
  }
};

PlayerView.prototype.formatPlacement = function (placement) {
  return 'Tune in to <em class=\'placement\'>' + placement.name + '</em>';
};

PlayerView.prototype._onPlayStarted = function (play) {
  this.startedPlayback = true;

  this.renderStatus(this.formatPlay(play));
  this._enableButtonsBasedOnState();
  this._setLikeStatus(play.liked);
  this._enablePositionTracker();
};

PlayerView.prototype._enablePositionTracker = function () {
  var playerView = this;

  if (!this.durationId) {
    this.durationId = window.setInterval(function () {
      playerView.renderPosition(playerView.player.getPosition(), playerView.player.getDuration());
    }, 500);
  }
};

PlayerView.prototype._setLikeStatus = function (liked) {
  const likes = document.querySelectorAll('.like-button');
  const dislikes = document.querySelectorAll('.dislike-button');

  if (liked === true) {
    // highlight the like button
    likes.forEach(element => {
      element.classList.add('liked');
    });
    dislikes.forEach(element => {
      element.classList.remove('disliked');
    });

  } else if (liked === false) {
    // highlight the dislike button
    likes.forEach(element => {
      element.classList.remove('liked');
    });
    dislikes.forEach(element => {
      element.classList.add('disliked');
    });
    
  } else {
    // nobody gets highlighted
    likes.forEach(element => {
      element.classList.remove('liked');
    });
    dislikes.forEach(element => {
      element.classList.remove('disliked');
    });

  }
};

PlayerView.prototype._disablePositionTracker = function () {
  if (this.durationId) {
    window.clearInterval(this.durationId);
    this.durationId = null;
  }
};

PlayerView.prototype._onPlayResumed = function () {
  this._enablePositionTracker();

  this._enableButtonsBasedOnState();
};

PlayerView.prototype._onPlayPaused = function () {
  this._disablePositionTracker();

  this._enableButtonsBasedOnState();
};

PlayerView.prototype._onPlayCompleted = function () {
  this.renderPosition(0, 0);
  this._enableButtonsBasedOnState();
};

PlayerView.prototype._onPlaysExhausted = function () {
  this.renderStatus(this.originalDisplayText);
  this.renderAlert('There is no more music to play in this station!');

  this._enableButtonsBasedOnState();
};

PlayerView.prototype._onPlayLiked = function () {
  this._setLikeStatus(true);
};

PlayerView.prototype._onPlayDisliked = function () {
  this._setLikeStatus(false);
};

PlayerView.prototype._onPlayUnliked = function () {
  this._setLikeStatus();
};

PlayerView.prototype._onSkipDenied = function () {
  this.renderAlert('Sorry you\'ve temporarily run out of skips!');
};

PlayerView.prototype.formatPlay = function (play) {
  return '<span class=\'track\'>' + play.audio_file.track.title +
    '</span> by <span class=\'artist\'>' + play.audio_file.artist.name +
    '</span> on <span class=\'release\'>' + play.audio_file.release.title + '</span>';
};

PlayerView.prototype.renderStatus = function (displayText) {
  if (displayText !== undefined) {
    this.displayText = displayText;
  }

  if (!this.alertId) {
    document.querySelectorAll('.status').forEach(status => {
      status.innerHTML = this.displayText;
      status.classList.remove('alert');
    });
  }
};

PlayerView.prototype.renderPosition = function (position, duration) {

  document.querySelectorAll('.elapsed').forEach(elapsed => {
    elapsed.innerHTML = formatTime(position);
  });
  document.querySelectorAll('.duration').forEach(dur => {
    dur.innerHTML = formatTime(duration);
  });

  if (duration === 0) {
    document.querySelectorAll('.progress').forEach(progress => {
      progress.style.width = '0';
    });

  } else {
    var elapsed = Math.round((position + 1000) / duration * 100);
    elapsed = (elapsed > 100) ? 100 : elapsed;

    document.querySelectorAll('.progress').forEach(progress => {
      progress.style.width = elapsed + '%';
    });
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

PlayerView.prototype.renderAlert = function (alertText) {
  if (this.alertId) {
    window.clearTimeout(this.alertId);
  }

  document.querySelectorAll('.status').forEach(status => {
    status.innerHTML = alertText;
    status.classList.add('alert');
  });

  var playerView = this;
  this.alertId = window.setTimeout(function () {
    playerView.alertId = null;
    playerView.renderStatus();
  }, 3000);
};

PlayerView.prototype._onSuspend = function () {
  this._enableButtonsBasedOnState();
};

PlayerView.prototype._enableButtonsBasedOnState = function () {
  var state = this.player.getCurrentState(),
    toEnable,
    toDisable;

  switch (state) {
  case 'playing':
    toEnable = ['.pause-button', '.like-button', '.dislike-button'];
    toDisable = ['.play-button', '.start-button', '.resume-button'];

    if (this.player.maybeCanSkip()) {
      toEnable.push('.skip-button');
    } else {
      toDisable.push('.skip-button');
    }
    break;

  case 'paused':
    toEnable = ['.play-button', '.resume-button', '.like-button', '.dislike-button'];
    toDisable = ['.pause-button', '.start-button'];

    if (this.player.maybeCanSkip()) {
      toEnable.push('.skip-button');
    } else {
      toDisable.push('.skip-button');
    }
    break;

  case 'suspended':
    toEnable = [];
    toDisable = ['.play-button', '.resume-button', '.like-button', '.dislike-button', '.pause-button', '.start-button', '.skip-button'];

    break;


  /* case 'idle': */
  default:
    toEnable = ['.play-button', '.start-button'];
    toDisable = ['.resume-button', '.pause-button', '.like-button', '.dislike-button', '.skip-button'];
    break;
  }

  for (let item of toDisable) {
    document.querySelectorAll(item).forEach(element => {
      element.classList.remove('button-enabled');
      element.classList.add('button-disabled');
      element.disabled = true;
    });
  }

  for (let item of toEnable) {
    document.querySelectorAll(item).forEach(element => {
      element.classList.remove('button-disabled');
      element.classList.add('button-enabled');
      element.disabled = false;
    });
  }

  const classes = this.$el.classList;
  classes.remove('state-playing');
  classes.remove('state-paused');
  classes.remove('state-idle');
  classes.remove('state-suspended');
  classes.add('state-' + state);
};

export default PlayerView;


