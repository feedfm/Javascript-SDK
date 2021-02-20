# Changelog

1.99.35

- allow crossfade between stations via Player.setStationId() 

1.99.34

- improve iOS vs Mac detection, and prevent desktop Safari from using AudioContext
  for volume control, which appears to be the cause of music dropping out. 

1.99.33

- trimming is enabled by default
- remove support for mobile web browsers

1.99.32

- handle iPads that identify as Intel Macs

1.99.31

- default to honoring song trim metadata

1.99.30

- update SimulcastPlayer to ignore 'connect()' calls when not idle

1.99.29

- if no 'document' defined then do not use cookies so that react native
  will work with Listner class.

1.99.28

- expose 'Feed.getClientId()' method 

1.99.27

- force SimulcastPlayer to keep retrying after loss of stream

1.99.26

- extra debugging for SimulcastPlayer class

1.99.25

- expose station list via promise in Player instance

1.99.24

- mobile safari 13.5 still needs workaround

1.99.23

- add SimulcastPlayer for shoutcast style stream support.

1.99.21

- expose 'setBaseUrl()' method at package level for internal work

1.99.20

- add 'getVolume()' and 'setVolume(x)' methods to Player class
- update documentation

1.99.19

- add Listener.stop() method
- fix 'music-unavailable' not parsing response correctly

1.99.17

- new support for simulcast overlay streams with the `Listener` class.
- deprecated the 'not-in-us' event, and replaced with 'music-unavailable'

1.99.15

- improved handling of sound destroy() when audio.play() call hasn't returned yet
- destroy all outstanding sounds after stop() call
- reorder event triggers to happen after _all_ internal changes have been completed
- more skip denial tests
- console log error messages when you call play() not from user-initiated event
- improved event handling to prevent some race conditions

1.99.14

- hide 'play-active' and 'prepare-sound' events from player clients
- fix error due to calling 'pause' before play() call returned its promise
- automatically initialize audio when calling play
- throw error if attempting to play with out a valid audio context
- logic fixes to 'stop()' to ensure music stops playback
- update tests

1.99.13

- new 'stop()' call for Player class

1.99.12

- fix NPE when trying to delete sound when no sound is active

1.99.11

- update regex to detect broken webkit

1.99.10

- add brokenWebkitFormats option to select lower volume transcodes
  on broken iOS clients

1.99.8

- fix null dereferences
- add remove logging of start/create/invalidate commands

1.99.6

- fix rending of '.duration' in PlayerView

1.99.0

- update to ES modules
- update to ES2015 syntax
- use rollup/babel to compile
- release via NPM
- remove old tests in anticipation of updated tests

1.10.3-native

- update code to use Web Audio API for mobile Safari
- fix some fade in/out problems when audio was before or after
    fade boundaries.

1.10.2-native

- trim_start wasn't being honored for first song

1.10.1-native

- fix volume adjustment bug

1.10.0-native

- pulled out SoundManager2 and went straight to Audio tag
- added song crossfades
- added initializeAudio() endpoint for mobile support
- tested on iOS
- added 'prepare' event so we can start loading songs in
  the background

1.9.0

- added support for trim_start and trim_end
- export version number on Feed.version
- clean up versioning
- disable console logs
- send out client version in HTTP request headers
