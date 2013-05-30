/*global it:false, describe:false, chai:false, Feed:false */
/*jshint camelcase:false */

(function() {
  var assert = chai.assert;

  describe('speaker', function() {

    it('exports the base API', function() {
      assert.property(Feed.speaker, 'create');
    });

    it('will create a song object, if requested to', function() {
      var song = Feed.speaker.create('chirp.mp3', { });

      assert.isNotNull(song);

      song.destroy();
    });

    it('will play a song object and trigger play and finish events', function(done) {
      var playCalled = false;

      var song = Feed.speaker.create('chirp.mp3', { 
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

    it('will play a long song object and respond to pause events', function(done) {
      var playCalled = false;

      var song = Feed.speaker.create('hutz.mp3', { 
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

    it('will play a long song object and respond to pause and unpause events', function(done) {
      var playCount = 0, pauseCount = 0;

      var song = Feed.speaker.create('hutz.mp3', { 
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
  });
})();
