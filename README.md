Feed Media SDK for Javascript Quickstart Guide

Introduction
============

The Feed Media SDK for Javascript allows you to play DMCA compliant radio within your browser.
You can read more about the Feed Media API at [http://feed.fm/][1]. The primary object used
to communicate with the Feed API is the `Feed.Session` class, which handles authentication
and interfaces with the Feed REST endpoints. You can use an instance of that class directly,
or use an instance of the `Feed.Player` class to play the retrieved audio. The `Feed.PlayerView`
is an example of how to visualize the state of the `Feed.Player`.

Before you begin, you should have an account at feed.fm and set up at least one *placement*
and *station*. If you have not already done so, please go to [http://feed.fm/][2]. 

Definitions
===========

*Placement*: A placement is a way to identify a location to play music in. It consists of one or more stations to pull music from, and budget rules to limit how much music to serve (on a per user or per placement basis). You may have one or more placements in your app. You can manage your placements at [http://feed.fm/][2].

*Station*: A station is a collection of music that you select using the dashboard at [http://feed.fm/][2]. One station can be assigned to multiple placements.

*Client Token* and *Client Secret*: When you create an account at [http://feed.fm/][3], you are issued a unique client token and secret. These keys are used to identify your app to the Feed Media API.

Creating a Player and Streaming Music
=====================================

1) Include the 'dist/feed-with-jquery.js' source in your HTML - either directly from
your website or from feed.fm:

<script type='application/javascript' src='//feed.fm/js/feed-with-jquery.js'></script>

2) Enter the minimal HTML to display the player:

<div id="player-view">
  <div>
    <span class='position'></span> <span class='status'></span>
  </div>
  <button class="play-button">play</button>
  <button class="pause-button">pause</button>
  <button class="skip-button">skip</button>
</div>

3) Create an instance of the player and the player view:

<script>
  var player = new Feed.Player('your-token', 'your-secret');

  player.setPlacementId(your-placement-id);

  var playerView = new Feed.PlayerView(player, 'player-view');
</script>

The user can now start/stop music via the player interface!

For complete documentation on the various classes, see [http://feed.fm/][1]
or look at the documentation in the source code for `Feed.PlayerView`,
`Feed.Player`, and `Feed.Session` classes.

[1]: http://feed.fm/documentation
[2]: http://feed.fm/dashboard
[3]: http://feed.fm/
