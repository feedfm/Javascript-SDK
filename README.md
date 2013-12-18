Feed Media SDK for Javascript Quickstart Guide

Introduction
============

The Feed Media SDK for Javascript allows you to play DMCA compliant radio within your browser.
You can read more about the Feed Media API at [http://feed.fm/][1]. The primary object used
to communicate with the Feed API is the `Feed.Session` class, which handles authentication
and interfaces with the Feed REST endpoints. You probably won't use that, however. You'll
use an instance of the `Feed.Player` class, which hides the complexity of requesting new
songs from the server via Feed.Session, and just exports a simple API for starting/stopping
music playback and getting updates on the status. The `Feed.PlayerView`
is an example class that makes use fo the `Feed.Player` to visualize a simple HTML player.

This javascript library requires a browser that can do CORS (Firefox 3.5+, Safari 4+, Chrome 3+,
IE 10+).

Before you begin, you should have an account at feed.fm where you've created a set of 
authentication credentials (*token* and *secret*) and set up at least one *placement*
If you have not already done so, please go to [http://feed.fm/][2]. 

1 Minute Guide to Creating a Player and Streaming Music
=======================================================

0) Pull up *[this jsbin](http://jsbin.com/uweSavU/5/edit?html,output)* page so you don't have to
type anything.

1) Include the 'dist/feed.js' source in your HTML - either directly from
your website or from feed.fm:

```html
<script type='application/javascript' src='http://feed.fm/js/latest/feed.js'></script>
```

If you've already got jQuery in your page, you can use 'js/latest/feed-without-jquery.js' and
the player will use the global window.jQuery object.

2) Enter the minimal HTML to display the player:

```html
<div id="player-view-div">
  <div class='status'></div>
  <button class="play-button">play</button>
  <button class="pause-button">pause</button>
  <button class="skip-button">skip</button>
</div>
```

3) Create an instance of the player and the player view:

```js
  var player = new Feed.Player('your-token', 'your-secret', { secure: true });

  var playerView = new Feed.PlayerView('player-view-div', player);

  player.tune(); // or player.play() to auto-play immediately
```

The user can now start/stop music via the simple player interface.

Working with Feed.PlayerView
============================

Feed.PlayerView should be given the ID of an element in the page and
a reference to a Feed.Player instance, and it will update child elements
based on player events and listen to user clicks to tell the Feed.Player
to pause/play/skip. Child elements are identified by their class
name and are used as described below:

* status - This is updated to display the song currently being played,
  or the name of the placement that we're streaming from. The 
  'formatPlay(play)' method can be overridden to change how the current
  song is formatted, and the 'formatPlacement(placement)' method can
  be overriden to change how the placement is formatted. Also, if
  there are errors or alerts that need to be displayed, those are
  placed here and an 'alert' class is added to this element. After
  displaying an alert, the status is automatically reverted back to
  the song or placement text after a few seconds.
* elapsed - As a song is playing, the text of this element is updated
  with the elapsed playback time in the format '0:00'.
* duration - When a song starts playing, the text of this element
  is set to the total duration of the song in the format '0:00'.
* progress - While a song is playing the 'width' of this element is
  changed from 0% to 100%.
* play-button - When clicked, this will start playback. This button
  may be disabled (for instance, when a song is already playing). The
  button is enabled by adding a 'button-enabled' class. The button
  is disabled by adding a 'button-disabled' class and setting the
  'disabled' attribute to true.
* pause-button - When clicked, this will pause playback. This button
  may be disabled (for instance, when a song is already paused). The
  button is enabled by adding a 'button-enabled' class. The button
  is disabled by adding a 'button-disabled' class and setting the
  'disabled' attribute to true.
* skip-button - When clicked, this will request a song skip. This button
  may be disabled (for instance, when a song may not be skipped). The
  button is enabled by adding a 'button-enabled' class. The button
  is disabled by adding a 'button-disabled' class and setting the
  'disabled' attribute to true.

The sample [jsbin](http://jsbin.com/uweSavU/5/edit?html,output) has a function to
display in the javascript console all the events that the player emits.

When creating your own player skin, most everything can be stylized
without having to edit javascript. For most projects, you should be able
to fully customize the player using only CSS rules that take into account
the 'button-enabled' and 'button-disabled' classes, along with the state
of the player that is attached as a class to the top level HTML element
of the player.


Working with Feed.Player
========================

The Feed.Player class retrieves music from the Feed.fm servers and
sends them to the browser for playback. The class requires a 
token and secret in order to create an instance of the player:

```js
  var player = new Feed.Player('token', 'secret', { secure: true });
```

The final argument is optional and lets you specify some extra parameters
to for the player (fully documented [here](https://github.com/fuzz-radio/Javascript-SDK/blob/master/src/player.js)).

The player should be started with a call to `tune()` or `play()`.
`tune()` will cause the player to load up information about the current
placement, and `play()` will cause the player to `tune()` and then immediately
start playing music.

Music can be paused with a call to `pause()`, or skipped with a call
to `skip()`, or resumed/started with a call to `play()`.

The player emits named events that you can attach to in order to
follow the state of the player. To follow an event, use the `on()`
method, and to stop following an event use the `off()` method.
Event handling comes from the BackBone.js project. Some example usage:

```js
  // simple callback
  player.on('play-completed', function() { console.log('a play completed!'); });

  // third argument sets 'this' for callback function
  player.on('play-started', handler.someFunction, handler);

  // passing 'all' as the event will cause all events to be sent to this callback
  player.on('all', function(event) { console.log('received: ', event); });

  // turn off all handlers for this event
  player.off('play-completed');

  // turn off a specific handler for this event
  player.off('play-started', handler.someFunction);
```

The player emits the following events:

* not-in-us - Feed.fm doesn't think the client is located in the US, and so it
  will refuse to serve up music. When this event is emitted, you can assume
  the player will no longer function.

* placement - This event provides information about the placement 
  that music is being pulled from. This is called before any music starts,
  and also after a call to change the current placement via `setPlacementId()`.
  This includes information about the placement that was retrieved from the feed.fm
  servers. At this point, only the name and id of the placement are
  returned:

  ```js
    player.on('placement', function(placement) {
      console.log('the placement id is ' + placement.id + ' and name ' + placement.name);
    });
  ```

* stations - This event provides the list of stations associated with the
  placement we are pulling music from. It is triggered before any music starts,
  and also after a call to change the current placement via `setPlacementId()`.

  ```js
    player.on('stations', function(stations) {
      console.log('there are ' + stations.length + ' stations. The first is named ' + stations[0].name);
    });

* play-started - This is sent when playback of a specific song has started.
  Details of the song that has just started are passed as an argument and
  look like the following:

  ```json
  {
    "id":"132459570",
    "station": { 
      "id":"727",
      "name":"Pretty Lights Music"
    },
    "audio_file": {
      "id":"8707",
      "duration_in_seconds":349,
      "track": { 
        "id":"15226435",
        "title":"Starve the Ego, Feed the Soul"
      },
      "release": {
        "id":"1550367",
        "title":"Drink the Sea"
      },
      "artist": {
        "id":"1176632",
        "name":"The Glitch Mob"
      },
      "codec":"mp3",
      "url":"http://stor02.fuzzcdn.com/path/to/mp3"
    }
  }
  ```
* play-paused - This is sent when playback of the current song is paused.
* play-resumed - This is sent when playback of the current song is resumed after
  pausing.
* play-completed - This is sent when playback of the current song is complete or
  is aborted (due to a skip, for instance).
* plays-exhausted - If there are no more songs that a user can listen to, this
  event is triggered.
* skip-denied - If a call was made to `skip()` to skip the current song, but the
  server denied it (due to skip restrctions), then this event will be emitted.

In addition to responding to events, the current state of the player
can be queried with `getCurrentState()`. That call will return one of the
following strings:

* playing - the player is currently playing a song
* paused - the player is paused
* idle - the player has no song actively playing or paused

Because mobile clients require audio playback to begin only during a user-initiated
event, the player should only be initialized with `tune()` on a mobile device, and
`play()` should be called in a `click` event handler.

Go Deeper
=========

The Feed.Player class is built on top of a Feed.Session class that manages
authentication and low level communication with the feed server. In the normal
state of events, you shouldn't need to work at this low of a level. If you do,
feel free to contact eric@feed.fm for details.

The Feed.Player class makes use of the exceptional
[SoundManager2](http://www.schillmania.com/projects/soundmanager2/) library. Details
can be found in the `speaker.js` file, which encapsulates our usage of SM2.


[1]: http://feed.fm/documentation
[2]: http://feed.fm/dashboard
[3]: http://feed.fm/
