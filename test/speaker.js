/*global it:false, describe:false, chai:false, Feed:false, beforeEach:false */
/*jshint camelcase:false */

(function() {
  var assert = chai.assert,
      speakerOptions = { swfBase: '../../dist' };

  describe('speaker', function() {

    describe('static interface', function() {
      it('exports the static factory API', function() {
        assert.property(Feed, 'Speaker');
        assert.property(Feed.Speaker, 'getShared');
      });

      it('will return a promise with getShared', function(done) {
        var promise = Feed.Speaker.getShared(speakerOptions);

        assert.property(promise, 'promise');

        done();
      });
        
      it('will return a promise that returns a speaker instance', function(done) {
        Feed.Speaker.getShared(speakerOptions).then(function(speaker) {
          assert.property(speaker, 'create');
          assert.property(speaker, 'initializeForMobile');
          assert.property(speaker, 'setVolume');

          done();
        });
      });
    });

    describe('instance interface', function() {
      var speaker;

      beforeEach(function(done) {
        Feed.Speaker.getShared(speakerOptions).then(function(sp) {
          // get speaker reference
          speaker = sp;
          done();
        });
      });

      it('will create a song object, if requested to', function() {
        var song = speaker.create('chirp.mp3', { });

        assert.isNotNull(song);
        console.log('song is ', song);

        song.destroy();
      });

      it('will play a song object and trigger play and finish events', function(done) {
        var playCalled = false;

        var song = speaker.create('chirp.mp3', { 
          play: function() { playCalled = true; },
          finish: function() {
            assert.equal(playCalled, true, 'should have triggered play event');

            song.destroy();

            done();
          }
        });

        song.play();

        assert.isNotNull(song);
      });

      it('will play a bad song object and trigger a finish event with failure', function(done) {
        var playCalled = false;

        var song = speaker.create('bad.m4a', { 
          play: function() { playCalled = true; },
          finish: function(withError) {
            assert.equal(playCalled, true, 'should have triggered play event');
            assert.equal(withError, true, 'should have reported a finish error');

            song.destroy();

            done();
          }
        });

        song.play();

        assert.isNotNull(song);
      });

      it('will play a missing song object and trigger play and finish events', function(done) {
        var playCalled = false;

        var song = speaker.create('filedoesnotexist.m4a', { 
          play: function() { playCalled = true; },
          finish: function(withError) {
            assert.equal(playCalled, true, 'should have triggered play event');
            assert.equal(withError, true, 'should have reported a finish error');

            song.destroy();

            done();
          }
        });

        song.play();

        assert.isNotNull(song);
      });

      it('will play a long song object and respond to pause events', function(done) {
        var playCalled = false;

        var song = speaker.create('hutz.mp3', { 
          play: function() { 
            playCalled = true; 
          },
          pause: function() {
            song.destroy();
            done();
          },
          finish: function() {
            assert.fail(null, null, 'should not have finished this play');
          }
        });

        assert.isNotNull(song);

        song.play();

        setTimeout(function() {
          song.pause();
        }, 1500);

      });

      it('will play a long song object with a start offset', function(done) {
        var playCalled = false;

        var song = speaker.create('hutz.mp3', { 
          play: function() { 
            playCalled = true; 
          },
          pause: function() {
            song.destroy();
            done();
          },
          finish: function() {
            assert.fail(null, null, 'should not have finished this play');
          },

          // start 3 seconds in
          startPosition: 3000
        });

        assert.isNotNull(song);

        song.play();

        setTimeout(function() {
          song.pause();
        }, 1500);

      });

      it('will play a long song object and respond to pause and unpause events', function(done) {
        var playCount = 0, pauseCount = 0;

        var song = speaker.create('hutz.mp3', { 
          play: function() { 
            playCount++;
          },
          pause: function() {
            pauseCount++;
          },
          finish: function() {
            assert.fail(null, null, 'should not have finished this play');
          }
        });

        assert.isNotNull(song);

        song.play();

        setTimeout(function() {
          song.pause();
        }, 1000);

        setTimeout(function() {
          song.resume();
        }, 1200);

        setTimeout(function() {
          assert.equal(playCount, 2, 'should have 2 play events');
          assert.equal(pauseCount, 1, 'should have 1 pause event');

          song.destroy();

          done();
        }, 1400);
      });

      it('will not trigger finish event if playing song is destroyed', function(done) {
        var song = speaker.create('hutz.mp3', { 
          play: function() { 
            setTimeout(function() {
              song.destroy();

              setTimeout(function() {
                // finish was not called!
                done();
              }, 200);

            }, 200);
          },
          pause: function() {
            assert.fail();
          },
          finish: function() {
            assert.fail();
          }
        });

        assert.isNotNull(song);

        song.play();
      });
    });
  });
})();
