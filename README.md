# Feed Media SDK for Javascript Quickstart Guide

## Introduction

The Feed Media SDK for Javascript allows you to play DMCA compliant radio within your browser.
You can read more about the Feed Media API at [https://feed.fm/][1]. This library includes
a `Feed.Player` class, which offers a simple interface starting and stopping audio
playback, and `Feed.PlayerView`, which offers a simple way to render a music player in HTML.

This javascript library makes use of the `Audio` element and works with all browsers
that support it: IE 11+, Edge 17+, Firefox 61+, Chrome 49+, and Mobile Safari 11.2+
and Safari 11.1+.

This library will work with the default demo credentials built into it, but you will
need to get a set of production credentials from your contact at Feed.fm.

## Installation

### Via <script> tag

The `dist/feed-media-audio-player.min.js` file in this package is suitable for including
directly in an HTML page. This is a self-executing function that exposes a `Feed` variable
to your javascript. The file has no external dependencies.

### Via npm

Install via npm:

```shell
npm install feed-media-audio-player
```

Then, in your javascript code, add:

```javascript
var Feed = require('feed-media-audio-player');
```

or

```javascript
import Feed from 'feed-media-audio-player';
```

Your javascript bundler will automatically pull in dependant libraries.

## Basic music player with UI

To create a simple player and work with the `Player` and `PlayerView` objects, 
create a web page with the following content
(or start with *[this jsbin](https://jsbin.com/qilapifosa/1/edit?html,output)*):

```html
<div id="player-view-div">
  <div class='status'></div>
  <button class="play-button">play</button>
  <button class="pause-button">pause</button>
  <button class="skip-button">skip</button>
</div>

<script src="feed-media-audio-player.min.js"></script>
<script>
  var player = new Feed.Player('demo', 'demo');
  
  // Display all the events the player triggers
  player.on('all', function(event) {
    console.log('player triggered event \'' + event + '\' with arguments:', Array.prototype.splice.call(arguments, 1));
  });
  
  var playerView = new Feed.PlayerView('player-view-div', player);
  
  player.tune();
</script>
```

When the page is run, the user will be able to start and stop music playback,
and skip songs. The control buttons enable and disable themselves based on the
state of the player.

## Working with Feed.Player

The Feed.Player class retrieves music from the Feed.fm servers and
sends them to the browser for playback. The methods on instances
of this class are mostly asynchronous, and events (that can be
subscribed to with simple `on()` and `off()` methods) indicate
player activity.

The class requires a token and secret in order to create an instance of the player:

```js
  var player = new Feed.Player('token', 'secret' /*, options */);
```

The final argument is optional and lets you specify some extra parameters
to for the player (fully documented [here](https://github.com/fuzz-radio/Javascript-SDK/blob/master/src/player.js)).

Construction of the `Player` instance kicks off communication with the feed.fm servers
to determine what music is available to the client. The player should not be
used until either a 'not-in-us' event or a 'stations' event is triggered, to
indicate that no music is available to the user or to indicate which music stations
can be tuned to.

The basic methods for use on the object are `play()`, `pause()`, and
`skip()`, which do what you might expect.

Due to auto-play restrictions on browsers, a call must be made to `initializeAudio()`
on the player object in response to a user-intiated `click` event. This call may be
made any number of times, but must be done before ever calling `play()`, or the
browser may not play any audio.

The player emits named events that you can attach to in order to
follow the state of the player. To follow an event, use the `on(event, callback, context)`
method, and to stop following an event use the `off(event)` method.
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
  the player will no longer function. This event is only emitted once, shortly
  after construction of the `Player` instance.

* stations - This event provides the list of stations associated with the
  placement we are pulling music from. It is triggered before any music starts,
  once the player has contacted feed.fm and retrieved a list of stations.

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
      }
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

## Working with Feed.PlayerView

Feed.PlayerView should be given the ID of an element in the page and
a reference to a Feed.Player instance, and it will update child elements
based on player events and listen to user clicks to tell the Feed.Player
to pause/play/skip. Child elements are identified by their *class*
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

The sample [jsbin](https://jsbin.com/qilapifosa/1/edit?html,output) has a function to
display in the javascript console all the events that the player emits.

When creating your own player skin, most everything can be stylized
without having to edit javascript. For most projects, you should be able
to fully customize the player using only CSS rules that take into account
the 'button-enabled' and 'button-disabled' classes, along with the state
of the player that is attached as a class to the top level HTML element
of the player.


[1]: http://feed.fm/documentation
