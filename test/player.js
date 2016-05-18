/*global it:false, describe:false, chai:false, sinon:false, Feed:false, beforeEach:false, afterEach:false, $:false, _:false, Events:false */
/*jshint camelcase:false */

(function() {
  var assert = chai.assert;

  describe('player', function() {

    beforeEach(function() {

    });

    afterEach(function() {
      // delete any stored cid
      Feed.Client.deleteClientUUID();
    });

    describe('initialization', function() {

      it('should start out in the uninitialized state', function() {
        sinon.stub(Feed.Speaker, 'getShared', function() {
          var d = $.Deferred();
          d.resolve({ }); // speaker is good

          return d.promise();
        });

        var player = new Feed.Player();
        assert.equal(player.getState(), Feed.Player.PlaybackState.UNINITIALIZED);

        Feed.Speaker.getShared.restore();
      });

      it('should become ready to play after valid session and speaker', function(done) {
        sinon.stub(Feed.Speaker, 'getShared', function() {
          var d = $.Deferred();
          d.resolve({ });  // speaker is good

          return d.promise();
        });

        sinon.stub(Feed.Session.prototype, 'setCredentials', function() {
          var that = this;
          setTimeout(function() {
            // session is good
            that.trigger('session-available');
          }, 10);
        });

        var player = new Feed.Player();

        player.once('playback-state-did-change', function(current, past) {
          assert.equal(current, Feed.Player.PlaybackState.READY_TO_PLAY);
          assert.equal(past, Feed.Player.PlaybackState.UNINITIALIZED);
          assert.equal(player.getState(), Feed.Player.PlaybackState.READY_TO_PLAY);
          
          Feed.Speaker.getShared.restore();
          Feed.Session.prototype.setCredentials.restore();

          done();
        });

        player.setCredentials('a', 'b');
      });
      
      it('should become unavailable after an invalid session response', function(done) {
        sinon.stub(Feed.Speaker, 'getShared', function() {
          var d = $.Deferred();
          d.resolve({ }); // speaker is good

          return d.promise();
        });

        sinon.stub(Feed.Session.prototype, 'setCredentials', function() {
          var that = this;
          setTimeout(function() {
            // session is not good
            that.trigger('session-not-available');
          }, 10);
        });

        var player = new Feed.Player();

        player.once('playback-state-did-change', function(current, past) {
          assert.equal(current, Feed.Player.PlaybackState.UNAVAILABLE);
          assert.equal(past, Feed.Player.PlaybackState.UNINITIALIZED);
          assert.equal(player.getState(), Feed.Player.PlaybackState.UNAVAILABLE);

          Feed.Speaker.getShared.restore();
          Feed.Session.prototype.setCredentials.restore();

          player.destroy();
          done();
        });

        player.setCredentials('a', 'b');
      });

      it('should become unavailable when speaker fails to start', function(done) {
        // stub out speaker
        sinon.stub(Feed.Speaker, 'getShared', function() {
          var d = $.Deferred();
          d.reject();  // speaker is bad

          return d.promise();
        });

        sinon.stub(Feed.Session.prototype, 'setCredentials', function() {
          var that = this;
          setTimeout(function() {
            // session is good
            that.trigger('session-available');
          }, 10);
        });

        var player = new Feed.Player();

        player.once('playback-state-did-change', function(current, past) {
          assert.equal(current, Feed.Player.PlaybackState.UNAVAILABLE);
          assert.equal(past, Feed.Player.PlaybackState.UNINITIALIZED);
          assert.equal(player.getState(), Feed.Player.PlaybackState.UNAVAILABLE);

          Feed.Speaker.getShared.restore();
          Feed.Session.prototype.setCredentials.restore();

          player.destroy();
          done();
        });

        player.setCredentials('a', 'b');
      });

    });

    describe('playback', function() {

      var responses, requests;
      var xhr;
      var onCreateSound;
      var onResponsesComplete;
      var playId;
      var testingComplete;

      function sessionResponse() {
        return {
          success: true,
          session: {
            available: true,
            client_id: 'abc123'
          },
          stations: [
            { id: 'station one id', title: 'station one' },
            { id: 'station two id', title: 'station two' }
          ]
        };
      }

      function playResponse() {
        var play = {
          success: true,
          play: {
            id: 'play id ' + playId,
            audio_file: {
              id: 'audio file id',
              url: 'http://audio.file/' + playId,
              track: {
                id: 'audio file track id',
                title: 'audio file track title'
              },
              release: {
                id: 'audio file release id',
                title: 'audio file release title'
              },
              artist: {
                id: 'audio file artist id',
                title: 'audio file artist title'
              }
            }
          }
        };

        playId++;

        return play;
      }

      function startResponse() {
        return {
          success: true,
          can_skip: true
        };
      }

      function successResponse() {
        return {
          success: true
        };
      }

      beforeEach(function() {
        responses = [];
        requests = [];
        onCreateSound = null;
        onResponsesComplete = null;
        playId = 0;
        testingComplete = false;

        xhr = sinon.useFakeXMLHttpRequest();
        xhr.onCreate = function(xhr) {
          requests.push(xhr);

          if (responses.length > 0) {
            var response = responses.shift();
            var lastResponse = (responses.length === 0);

            setTimeout(function() {
              xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(response));

              if (lastResponse && onResponsesComplete) {
                onResponsesComplete();
              }
            }, 10);
          }
        };

        // Fake speaker that returns a sound object with
        // stubbed out play/pause/position/resume properties.
        sinon.stub(Feed.Speaker, 'getShared', function() {
          var d = $.Deferred();
          var soundId = 0;

          d.resolve({
            create: function(url, options) {
              var sound = _.extend({ 
                id: 'sound id ' + soundId++,
                url: url,

                // any interaction with new fake sound
                // defaults to an error
                play: function()     { assert.fail(); },
                pause: function()    { assert.fail(); },
                position: function() { assert.fail(); },
                resume: function()   { assert.fail(); },
                destroy: function()  { if (!testingComplete) { assert.fail(); } }
              }, Events);

              _.each(['play', 'pause', 'finish', 'elapse'], function(ev) {
                if (ev in options) {
                  sound.on(ev, options[ev]);
                }
              });

              if (onCreateSound) {
                // customize fake sound
                onCreateSound(sound);
              }

              return sound;
            }
          });

          return d.promise();
        });
      });

      afterEach(function() {
        Feed.Speaker.getShared.restore();

        xhr.restore();

      });

      it('should load a song after a prepareToPlay call', function(done) {
        responses.push(sessionResponse());
        responses.push(playResponse());

        onCreateSound = function() {
          setTimeout(function() {
            testingComplete = true; player.destroy();
            done();
          }, 20);
        };

        var player = new Feed.Player();

        player.on('player-available', function() {
          player.prepareToPlay();
        });

        player.setCredentials('a', 'b');
      });

      it('should load and start a song after a play call', function(done) {
        responses.push(sessionResponse());
        responses.push(playResponse());
        responses.push(startResponse());
        responses.push(playResponse());

        onCreateSound = function(sound) {
          sound.play = function() { 
            setTimeout(function() {
              sound.trigger('play');
            }, 1);
          };
        };

        var states = [];

        onResponsesComplete = function() {
          assert.deepEqual(states, [ Feed.Player.PlaybackState.READY_TO_PLAY,
                                     Feed.Player.PlaybackState.WAITING_FOR_ITEM,
                                     Feed.Player.PlaybackState.STALLED,
                                     Feed.Player.PlaybackState.PLAYING ]);
          testingComplete = true; player.destroy();
          done();
        };

        var player = new Feed.Player();

        player.on('player-available', function() {
          player.play();
        });

        player.on('playback-state-did-change', function(newState) {
          states.push(newState);
        });

        player.setCredentials('a', 'b');
      });


      it('should advance to the next song after the first completes', function(done) {
        var first = playResponse();
        var second = playResponse();
        var third = playResponse();

        responses.push(sessionResponse(),
                       first,
                       startResponse(),
                       second,
                       successResponse(),
                       startResponse(),
                       third);

        var destroyCalled = false;
        onCreateSound = function(sound) {

          sound.play = function() { 

            if (sound.url === first.play.audio_file.url) {
              setTimeout(function() {
                sound.trigger('play');

                setTimeout(function() {
                  sound.trigger('finish');
                }, 40);
              }, 1);

            } else if (sound.url === second.play.audio_file.url) {
              setTimeout(function() {
                sound.trigger('play');
              }, 1);

            } else {
              assert.fail();
            }
          };

          sound.destroy = function() {
            if (!testingComplete) {
              assert.equal(sound.url, first.play.audio_file.url);
              destroyCalled = true;
            }
          };
        };

        var states = [];

        onResponsesComplete = function() {
          assert.deepEqual(states, [ Feed.Player.PlaybackState.READY_TO_PLAY,
                                     Feed.Player.PlaybackState.WAITING_FOR_ITEM,
                                     Feed.Player.PlaybackState.STALLED,
                                     Feed.Player.PlaybackState.PLAYING,
                                     Feed.Player.PlaybackState.STALLED,
                                     Feed.Player.PlaybackState.PLAYING ]);
          assert(destroyCalled);
          testingComplete = true; player.destroy();
          done();
        };

        var player = new Feed.Player();

        player.on('player-available', function() {
          player.play();
        });

        player.on('playback-state-did-change', function(newState) {
          states.push(newState);
        });

        player.setCredentials('a', 'b');
      });

      it('should advanced to the next song after the first completes due to error', function(done) {
        var first = playResponse();
        var second = playResponse();
        var third = playResponse();

        responses.push(sessionResponse(),
                       first,
                       startResponse(),
                       second,
                       successResponse(), // ack for 'invalid' notifiation
                       startResponse(),
                       third);

        onCreateSound = function(sound) {

          sound.play = function() { 

            if (sound.url === first.play.audio_file.url) {
              setTimeout(function() {
                sound.trigger('play');

                setTimeout(function() {
                  sound.trigger('finish', true); // signify error completion
                }, 40);
              }, 1);

            } else if (sound.url === second.play.audio_file.url) {
              setTimeout(function() {
                sound.trigger('play');
              }, 1);

            } else {
              assert.fail();
            }
          };

          sound.destroy = function() { };
        };

        var states = [];

        onResponsesComplete = function() {
          assert.deepEqual(states, [ Feed.Player.PlaybackState.READY_TO_PLAY,
                                     Feed.Player.PlaybackState.WAITING_FOR_ITEM,
                                     Feed.Player.PlaybackState.STALLED,
                                     Feed.Player.PlaybackState.PLAYING,
                                     Feed.Player.PlaybackState.STALLED,
                                     Feed.Player.PlaybackState.PLAYING ]);

          assert.match(requests[4].url, /invalidate$/);
          
          testingComplete = true; player.destroy();
          done();
        };

        var player = new Feed.Player();

        player.on('player-available', function() {
          player.play();
        });

        player.on('playback-state-did-change', function(newState) {
          states.push(newState);
        });

        player.setCredentials('a', 'b');
      });

      it('should allow us to pause a playing song', function(done) {
        var first = playResponse();
        var second = playResponse();

        responses.push(sessionResponse(),
                       first,
                       startResponse(),
                       second,
                       successResponse()); // for the elapse call

        onCreateSound = function(sound) {

          sound.play = function() { 

            if (sound.url === first.play.audio_file.url) {
              setTimeout(function() {
                sound.trigger('play');
              }, 1);

            } else {
              assert.fail();
            }
          };

          sound.position = function() {
            assert.equal(sound.url, first.play.audio_file.url);
            return 2000;
          };

          sound.pause = function() {
            if (sound.url === first.play.audio_file.url) {
              setTimeout(function() {
                sound.trigger('pause');
              }, 1);
            }
          };
        };

        var states = [];

        var player = new Feed.Player();

        player.on('player-available', function() {
          player.play();
        });

        player.on('playback-state-did-change', function(newState) {
          states.push(newState);

          if (newState === Feed.Player.PlaybackState.PLAYING) {
            setTimeout(function() {
              player.pause();
            }, 10);

          } else if (newState === Feed.Player.PlaybackState.PAUSED) {
            // success!
            assert.deepEqual(states, [ Feed.Player.PlaybackState.READY_TO_PLAY,
                                       Feed.Player.PlaybackState.WAITING_FOR_ITEM,
                                       Feed.Player.PlaybackState.STALLED,
                                       Feed.Player.PlaybackState.PLAYING,
                                       Feed.Player.PlaybackState.PAUSED,
                                     ]);
            testingComplete = true; player.destroy();
            done();
          }
        });

        player.setCredentials('a', 'b');
      });

      it('should allow us to resume a paused song', function(done) {
        var first = playResponse();
        var second = playResponse();

        responses.push(sessionResponse(),
                       first,
                       startResponse(),
                       second,
                       successResponse()); // for the elapse

        onCreateSound = function(sound) {

          sound._calls = 0;
          sound._playing = false;

          sound.play = function() { 

            if (sound.url === first.play.audio_file.url) {
              assert.equal(sound._playing, false);
              assert.equal(sound._calls, 0);
              sound._playing = true;
              sound._calls++;

              setTimeout(function() {
                sound.trigger('play');
              }, 1);

            } else {
              assert.fail();
            }
          };

          sound.pause = function() {
            if (sound.url === first.play.audio_file.url) {
              assert.equal(sound._playing, true);
              assert.equal(sound._calls, 1);
              sound._playing = false;
              sound._calls++;

              setTimeout(function() {
                sound.trigger('pause');
              }, 1);

            } else {
              assert.fail();
            }
          };

          sound.position = function() {
            assert.equal(sound.url, first.play.audio_file.url);
            return 1000;
          };

          sound.resume = function() {
            if (sound.url === first.play.audio_file.url) {
              assert.equal(sound._playing, false);
              assert.equal(sound._calls, 2);
              sound._playing = true;
              sound._calls++;
              
              setTimeout(function() {
                sound.trigger('play');
              }, 1);
            } else {
              assert.fail();
            }
          };
        };

        var player = new Feed.Player();

        player.on('player-available', function() {
          player.play();
        });

        var states = [];

        player.on('playback-state-did-change', function(newState, oldState) {
          states.push(newState);

          if ((newState === Feed.Player.PlaybackState.PLAYING) &&
              (oldState === Feed.Player.PlaybackState.STALLED)) {
            // pause shortly after playback starts
            setTimeout(function() {
              player.pause();
            }, 10);
          
          } else if ((newState === Feed.Player.PlaybackState.PAUSED) &&
                     (oldState === Feed.Player.PlaybackState.PLAYING)) {
            // resume playback shortly after pause
            setTimeout(function() {
              player.play();
            }, 10);

          } else if ((newState === Feed.Player.PlaybackState.PLAYING) &&
                     (oldState === Feed.Player.PlaybackState.PAUSED)) {
            // success after resuming from pause
            assert.deepEqual(states, [ Feed.Player.PlaybackState.READY_TO_PLAY,
                                       Feed.Player.PlaybackState.WAITING_FOR_ITEM,
                                       Feed.Player.PlaybackState.STALLED,
                                       Feed.Player.PlaybackState.PLAYING,
                                       Feed.Player.PlaybackState.PAUSED,
                                       Feed.Player.PlaybackState.PLAYING
                                     ]);
            testingComplete = true; player.destroy();
            done();
          }
        });

        player.setCredentials('a', 'b');
      });

      it('should allow us to skip a playing song', function(done) {
        var first = playResponse();
        var second = playResponse();
        var third = playResponse();

        responses.push(sessionResponse(),
                       first,
                       startResponse(),
                       second,
                       successResponse(), // elapsed time response
                       successResponse(), // skip response
                       startResponse(),   // start second song response
                       third);            // queue up third song

        onCreateSound = function(sound) {

          sound.play = function() { 
            if (sound.url === first.play.audio_file.url) {
              setTimeout(function() {
                sound.trigger('play');

                setTimeout(function() {
                  player.skip();
                }, 10);
              }, 1);

            } else if (sound.url === second.play.audio_file.url) {
              setTimeout(function() {
                sound.trigger('play');
              }, 1);

            } else {
              assert.fail();
            }
          };

          sound.destroy = function() { 
            if (!testingComplete) {
              assert.equal(sound.url, first.play.audio_file.url);
            }
          };

          sound.position = function() {
            assert.equal(sound.url, first.play.audio_file.url);
          };
        };

        var states = [];

        onResponsesComplete = function() {
          assert.deepEqual(states, [ Feed.Player.PlaybackState.READY_TO_PLAY,
                                     Feed.Player.PlaybackState.WAITING_FOR_ITEM,
                                     Feed.Player.PlaybackState.STALLED,
                                     Feed.Player.PlaybackState.PLAYING,
                                     Feed.Player.PlaybackState.REQUESTING_SKIP,
                                     Feed.Player.PlaybackState.STALLED,
                                     Feed.Player.PlaybackState.PLAYING ]);
          testingComplete = true; player.destroy();
          done();
        };

        var player = new Feed.Player();

        player.on('player-available', function() {
          player.play();
        });

        player.on('playback-state-did-change', function(newState) {
          states.push(newState);
        });

        player.setCredentials('a', 'b');
      });

      it('should allow us to skip a paused song', function(done) {
        var first = playResponse();
        var second = playResponse();
        var third = playResponse();

        responses.push(sessionResponse(),
                       first,
                       startResponse(),
                       second,
                       successResponse(), // elapse response
                       successResponse(), // skip response
                       startResponse(),   // start second song response
                       third);            // queue up third song

        onCreateSound = function(sound) {

          sound.play = function() { 
            if (sound.url === first.play.audio_file.url) {
              setTimeout(function() {
                sound.trigger('play');

                setTimeout(function() {
                  player.pause();

                  setTimeout(function() {
                    player.skip();
                  }, 10);
                }, 10);
              }, 1);

            } else if (sound.url === second.play.audio_file.url) {
              setTimeout(function() {
                sound.trigger('play');
              }, 1);

            } else {
              assert.fail();
            }
          };

          sound.position = function() {
            assert.equal(sound.url, first.play.audio_file.url);

            return 1000;
          };

          sound.pause = function() {
            assert.equal(sound.url, first.play.audio_file.url);

            sound.trigger('pause');
          };

          sound.destroy = function() { 
            if (!testingComplete) {
              assert.equal(sound.url, first.play.audio_file.url);
            }
          };
        };

        var states = [];

        onResponsesComplete = function() {
          assert.deepEqual(states, [ Feed.Player.PlaybackState.READY_TO_PLAY,
                                     Feed.Player.PlaybackState.WAITING_FOR_ITEM,
                                     Feed.Player.PlaybackState.STALLED,
                                     Feed.Player.PlaybackState.PLAYING,
                                     Feed.Player.PlaybackState.PAUSED,
                                     Feed.Player.PlaybackState.REQUESTING_SKIP,
                                     Feed.Player.PlaybackState.STALLED,
                                     Feed.Player.PlaybackState.PLAYING ]);
          testingComplete = true; player.destroy();
          done();
        };

        var player = new Feed.Player();

        player.on('player-available', function() {
          player.play();
        });

        player.on('playback-state-did-change', function(newState) {
          states.push(newState);
        });

        player.setCredentials('a', 'b');
      });

      it('should stop the active song and discard next song, and advance to next song when changing station during playback', function(done) {
        var first = playResponse();
        var second = playResponse();
        var third = playResponse();
        var fourth = playResponse();
        var sess = sessionResponse();

        responses.push(sess,
                       first,
                       startResponse(),
                       second,
                       successResponse(), // record elapse of first play on station change
                       third,
                       successResponse(), // start of third song
                       fourth
                       );

        onCreateSound = function(sound) {

          sound.play = function() { 

            if (first && (sound.url === first.play.audio_file.url)) {
              setTimeout(function() {
                sound.trigger('play');

                setTimeout(function() {
                  player.setStation(sess.stations[1]);
                }, 100);
              }, 1);

            } else if (third && (sound.url === third.play.audio_file.url)) {
              assert.deepEqual(states, [ Feed.Player.PlaybackState.READY_TO_PLAY,
                                         Feed.Player.PlaybackState.WAITING_FOR_ITEM,
                                         Feed.Player.PlaybackState.STALLED,
                                         Feed.Player.PlaybackState.PLAYING,
                                         Feed.Player.PlaybackState.WAITING_FOR_ITEM,
                                         Feed.Player.PlaybackState.STALLED ]);

              assert.isNull(first);
              assert.isNull(second);

              testingComplete = true; player.destroy();
              done();

            } else {
              assert.fail();
            }
          };

          sound.position = function() {
            assert.equal(sound.url, first.play.audio_file.url);
          };

          sound.destroy = function() { 
            if (first && (sound.url === first.play.audio_file.url)) {
              console.log('destroying first');
              first = null;
            } else if (second && (sound.url === second.play.audio_file.url)) {
              console.log('destroying second');
              second = null;
            }
          };
        };

        var player = new Feed.Player();

        player.on('player-available', function() {
          player.play();
        });

        var states = [];
        player.on('playback-state-did-change', function(newState) {
          states.push(newState);
        });

        player.setCredentials('a', 'b');
      });

      it('should send elapse updates while playing a song', function(done) {
        this.timeout(4000);

        var firstPlay = playResponse();

        responses.push(sessionResponse(),
                       firstPlay,
                       startResponse(),
                       playResponse(),
                       successResponse(), // first elapse callback
                       successResponse()); // second elapse callback

        onCreateSound = function(sound) {
          sound.play = function() { 
            setTimeout(function() {
              sound.trigger('play');
            }, 1);
          };

          sound.position = function() {
            assert.equal(sound.url, firstPlay.play.audio_file.url);
          };

        };

        var states = [];

        onResponsesComplete = function() {
          console.log('complete!');
          assert.deepEqual(states, [ Feed.Player.PlaybackState.READY_TO_PLAY,
                                     Feed.Player.PlaybackState.WAITING_FOR_ITEM,
                                     Feed.Player.PlaybackState.STALLED,
                                     Feed.Player.PlaybackState.PLAYING ]);

          
          testingComplete = true; player.destroy();
          done();
        };

        var player = new Feed.Player({
          reportElapseIntervalInMS: 1000
        });

        player.on('player-available', function() {
          player.play();
        });

        player.on('playback-state-did-change', function(newState) {
          states.push(newState);
        });

        player.setCredentials('a', 'b');
      });

      it('should send elapse when pausing a song', function(done) {
        this.timeout(4000);

        var firstPlay = playResponse();

        responses.push(sessionResponse(),
                       firstPlay,
                       startResponse(),
                       playResponse(),
                       successResponse()); // elapse callback

        onCreateSound = function(sound) {
          sound.play = function() { 
            setTimeout(function() {
              sound.trigger('play');
            }, 1);
          };

          sound.position = function() {
            assert.equal(sound.url, firstPlay.play.audio_file.url);
          };

          sound.pause = function() { 
            sound.trigger('pause');
          };
        };

        var states = [];

        var player = new Feed.Player({
          reportElapseIntervalInMS: 1000
        });

        player.on('player-available', function() {
          player.play();
        });

        player.on('playback-state-did-change', function(newState) {
          states.push(newState);

          if (newState === Feed.Player.PlaybackState.PLAYING) {
            setTimeout(function() {
              player.pause();
            }, 500);

          } else if (newState === Feed.Player.PlaybackState.PAUSED) {
            assert.deepEqual(states, [ Feed.Player.PlaybackState.READY_TO_PLAY,
                                       Feed.Player.PlaybackState.WAITING_FOR_ITEM,
                                       Feed.Player.PlaybackState.STALLED,
                                       Feed.Player.PlaybackState.PLAYING,
                                       Feed.Player.PlaybackState.PAUSED ]);

            
            testingComplete = true; player.destroy();
            done();
          }
        });

        player.setCredentials('a', 'b');
      });

      it('will update the elapsed time for the current song before changing stations', function(done) {
        var first = playResponse();
        var second = playResponse();
        var third = playResponse();

        responses.push(sessionResponse(),
                       first,
                       startResponse(),
                       second,
                       successResponse(), // elapsed time response
                       successResponse(), // skip response
                       startResponse(),   // start second song response
                       third);            // queue up third song

        onCreateSound = function(sound) {

          sound.play = function() { 
            if (sound.url === first.play.audio_file.url) {
              setTimeout(function() {
                sound.trigger('play');

                setTimeout(function() {
                  player.skip();
                }, 10);
              }, 1);

            } else if (sound.url === second.play.audio_file.url) {
              setTimeout(function() {
                sound.trigger('play');
              }, 1);

            } else {
              assert.fail();
            }
          };

          sound.destroy = function() { 
            if (!testingComplete) {
              assert.equal(sound.url, first.play.audio_file.url);
            }
          };

          sound.position = function() {
            assert.equal(sound.url, first.play.audio_file.url);
          };
        };

        var states = [];

        onResponsesComplete = function() {
          assert.deepEqual(states, [ Feed.Player.PlaybackState.READY_TO_PLAY,
                                     Feed.Player.PlaybackState.WAITING_FOR_ITEM,
                                     Feed.Player.PlaybackState.STALLED,
                                     Feed.Player.PlaybackState.PLAYING,
                                     Feed.Player.PlaybackState.REQUESTING_SKIP,
                                     Feed.Player.PlaybackState.STALLED,
                                     Feed.Player.PlaybackState.PLAYING ]);
          testingComplete = true; player.destroy();
          done();
        };

        var player = new Feed.Player();

        player.on('player-available', function() {
          player.play();
        });

        player.on('playback-state-did-change', function(newState) {
          states.push(newState);
        });

        player.setCredentials('a', 'b');
      });

    });

  });
})();

/*
 *  tests from the previous iteration of the player:

    it('will allow us to suspend and unsuspend the player while playing a song', function(done) {
      // run player.play(). wait for 3 seconds. then suspend. then create a new
      // player. unsuspend it (with play = true). pause it after a fraction of
      // a second, then confirm our time offset is > 3 seconds.
  
      this.timeout(4000);

      var player = new Feed.Player('token', 'secret', speakerOptions);
      player.setPlacementId('10000');

      // play a long clip so we can test out timing
      var hutz = validPlay();
      hutz.audio_file.url = 'hutz.mp3';
      plays.push(hutz);

      // the player should request the next song twice
      var queued = validPlay();
      plays.push(queued);
      plays.push(queued);

      player.play();

      // wait three seconds
      setTimeout(function() {
        var state = player.suspend();

        var newPlayer = new Feed.Player('token', 'secret', speakerOptions);

        newPlayer.unsuspend(state, true);

        setTimeout(function() {
          newPlayer.pause();

          assert.equal(newPlayer.getPosition() > 2000, true, 'should be past 2 seconds in unsuspended play');
          done();

        }, 800);
      }, 2000);
    });

    it('will will skip over missing/bad files when unsuspending', function(done) {
      // run player.play(). wait for 2 seconds. then suspend. swap the valid mp3
      // url in the suspended state with a missing url. then create a new
      // player. unsuspend it (with play = true). wait for a second. confirm
      // we're playing the next song.
  
      this.timeout(4000);

      var player = new Feed.Player('token', 'secret', speakerOptions);
      player.setPlacementId('10000');

      // play a long clip so we can test out timing
      var hutz = validPlay();
      hutz.audio_file.url = 'hutz.mp3';
      plays.push(hutz);

      // the player should request the next song twice
      var queued = validPlay();
      plays.push(queued);
      plays.push(queued);

      // this will be the next queued up song
      plays.push(validPlay());

      player.play();

      // wait 
      setTimeout(function() {
        var state = player.suspend();

        state.play.audio_file.url = 'https://feed.fm/missing';

        var newPlayer = new Feed.Player('token', 'secret', speakerOptions);

        // try to resume playback of the 'missing' song, which will fail
        newPlayer.unsuspend(state, true);

        newPlayer.on('play-started', function(play) {
          // confirm that the next song starts up
          assert.notEqual(play.audio_file.url, 'https://feed.fm/missing', 'should start next song after old one failed to start');

          newPlayer.pause();

          done();
        });

      }, 1000);
    });

    var counter = 0;
    function validPlay(id) {
      if (!id) { id = counter++; }

      return {
        'id': '' + id,
        'station': {
          'id': '599',
          'name': 'East Bay'
        },
        'audio_file': {
          'id': '665',
          'duration_in_seconds': '300',
          'track': {
              'id': '15224887',
              'title': '3030'
          },
          'release': {
              'id': '1483477',
              'title': 'Deltron 3030'
          },
          'artist': {
              'id': '766824',
              'name': 'Del the Funky Homosapien'
          },
          'codec': 'mp3',
          'bitrate': '128',
          'url': 'chirp.mp3'
        }
      };
    }
  });
  */

