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

### Via npm

Install via npm:

```shell
npm install feed-media-audio-player
```

### Use &lt;script&gt; tag

The `dist/feed-media-audio-player.min.js` file in this package is suitable for including
directly in an HTML page. This is a self-executing function that exposes a `Feed` variable
to your javascript. The file has no external dependencies.

### CJS or Modules

Alternatively, if you're using a bundler, add the following to your code:

```javascript
var Feed = require('feed-media-audio-player');
```

or

```javascript
import Feed from 'feed-media-audio-player';
```

Bundler will automatically pull in dependent libraries.

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
to for the player (fully documented [here](https://github.com/feedfm/Javascript-SDK/blob/master/src/player.js)).

Construction of the `Player` instance kicks off communication with the feed.fm servers
to determine what music is available to the client. The player should not be
used until either a 'not-in-us' event or a 'stations' event is triggered, to
indicate that no music is available to the user or to indicate which music stations
can be tuned to.

The basic methods for use on the object are `play()`, `pause()`, `stop()` and
`skip()`, which do what you might expect.

You can adjust and retrieve music volume via `getVolume()` and `setVolume(X)` (where `X` is 
0..100) on the `Player` instance.

Due to auto-play restrictions on browsers, and especially Mobile Safari,
the first call to `play()` on the player object must be made in a user-initiated
event handler. If you don't want to immediately play music on the user event, you
can call `initializeAudio()` in the event handler, and then `play()` at a later
time. Repeated calls to `initializeAudio()` are fine.

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

* music-unavailable - Feed.fm doesn't believe taht the client is located in a region for
  which music is licensed for playback. When this event is emitted, you can assume
  the player will no longer function. This event is only emitted once, shortly
  after construction of the `Player` instance, so register for this event early!
* stations - This event provides the list of stations available to the player, as
  provided by the server. It is triggered before any music starts,
  after the player has contacted feed.fm.  See "Station and Play objects" below for
  details on what the station object looks like.
* play-started - This is sent when playback of a specific song has started.
  Details of the song that has just started are passed as an argument and
  are described in "Station and Play objects" below.
* play-paused - This is sent when playback of the current song is paused.
* play-resumed - This is sent when playback of the current song is resumed after
  pausing.
* play-stopped - This is sent when the 'stop()' method is called in Player
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

### Station and Play objects

A `station` object looks like the following:

```js
  {
    id: "276510",
    name: "90BPM",
    on_demand: 0,
    pre_gain: 11.32,
    options: {
      id: "90BPM"
    },
    last_updated: "2019-04-05T21:49:08.000Z"
  }
```

Some important points:

* The station `id` __will change__ between different sessions - and should not
be used, for instance, to remember a user's favorite station. Instead, you should
use the station's name or a value in the `options` object.
* The `options` object can be any arbitrary JSON object that you provide to feed.fm.
We suggest you use this for storing foreign keys or values that you wish to use
to search for particular stations. Some examples: storing a 'genre' or your own 'id'
or numeric BPM range.
* `last_updated` refers to the last time the contents of a station with this name
were updated.

A `play` object looks like the following:

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
