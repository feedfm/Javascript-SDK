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

Before you begin, you should have an account at feed.fm where you've created a set of 
authentication credentials and set up at least one *placement*
If you have not already done so, please go to [http://feed.fm/][2]. 

Definitions
===========

*Placement*: A placement is a source of music. You must have one or more placements in your app.
You can manage your placements at [http://feed.fm/][2].

*Client Token* and *Client Secret*: When you create an account at [http://feed.fm/][3], you are issued a unique client token and secret. These keys are used to identify your app to the Feed Media API.

1 Minute Guide to Creating a Player and Streaming Music
=======================================================

1) Include the 'dist/feed-with-jquery.js' source in your HTML - either directly from
your website or from feed.fm:

<script type='application/javascript' src='//feed.fm/js/feed-with-jquery.js'></script>

2) Enter the minimal HTML to display the player:

<div id="player-view-div">
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

  var playerView = new Feed.PlayerView(player, 'player-view-div');

  player.tune();
</script>

The user can now start/stop music via the player interface!

[1]: http://feed.fm/documentation
[2]: http://feed.fm/dashboard
[3]: http://feed.fm/
