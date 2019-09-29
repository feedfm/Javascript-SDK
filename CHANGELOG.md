
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

