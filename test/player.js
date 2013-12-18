/*global it:false, describe:false, beforeEach:false, afterEach:false, chai:false, sinon:false, Feed:false */
/*jshint camelcase:false */

(function() {
  var assert = chai.assert,
      speakerOptions = { swfBase: '../dist' };

  describe('player', function() {
    var server, requests, plays;

    beforeEach(function() {
      server = sinon.fakeServer.create();
      server.autoRespond = true;
      server.autoRespondAfter = 10;

      requests = [];
      plays = [];

      server.respondWith('GET', 'http://feed.fm/api/v2/oauth/time', function(response) {
        console.log('oauth/time');
        requests.push('oauth/time');

        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ 
          success: true, 
          time: Math.floor(Date.now() / 1000) 
        }));
      });

      server.respondWith('POST', 'http://feed.fm/api/v2/client', function(response) {
        console.log('client');
        requests.push('client');

        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          success: true,
          client_id: 'client_id'
        }));
      });
      
      server.respondWith('GET', 'http://feed.fm/api/v2/placement/10000', function(response) {
        console.log('placement');
        requests.push('placement');

        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          success: true,
          placement: {
            id: '10000',
            name: 'placmeent'
          },
          stations: [
            { id: '222', name: 'station 222' },
            { id: '333', name: 'station 333' },
            { id: '444', name: 'station 444' },
          ]
        }));
      });

      server.respondWith('GET', 'http://feed.fm/missing', function(response) {
        console.log('missing');

        response.respond(404,  { }, 'Sorry, that is missing');
      });

      server.respondWith('GET', 'http://feed.fm/api/v2/placement', function(response) {
        console.log('placement');
        requests.push('placement');

        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          success: true,
          placement: {
            id: '1234',
            name: 'placmeent'
          },
          stations: [
            { id: '222', name: 'station 222' },
            { id: '333', name: 'station 333' },
            { id: '444', name: 'station 444' },
          ]
        }));
      });

      server.respondWith('POST', 'http://feed.fm/api/v2/play', function(response) {
        console.log('play');
        requests.push('play');

        var rp = plays.shift();

        if (rp) {
          response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, play: rp }));
        } else {
          response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false, error: { code: 9, message: 'no more plays' } }));
        }
      });

      server.respondWith('POST', /http:\/\/feed\.fm\/api\/v2\/play\/\d+\/start/, function(response) {
        console.log('start');
        requests.push('start');

        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, can_skip: true }));
      });

      server.respondWith('POST', /http:\/\/feed\.fm\/api\/v2\/play\/\d+\/complete/, function(response) {
        console.log('complete');
        requests.push('complete');

        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
      });

      server.respondWith('POST', /http:\/\/feed\.fm\/api\/v2\/play\/\d+\/skip/, function(response) {
        console.log('skip');
        requests.push('skip');

        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
      });

      server.respondWith('POST', /http:\/\/feed\.fm\/api\/v2\/play\/\d+\/invalidate/, function(response) {
        console.log('invalidate');
        requests.push('invalidate');

        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
      });
    });

    afterEach(function() {
      server.restore();

      Feed.Session.prototype._deleteStoredCid();
    });

    it('exports the base API', function() {
      var player = new Feed.Player('token', 'secret', speakerOptions);

      assert.property(player, 'play');
      assert.property(player, 'tune');
      assert.property(player, 'pause');
      assert.property(player, 'skip');
      assert.property(player, 'setPlacementId');
      assert.property(player, 'setStationId');
      assert.property(player, 'on');
      assert.property(player, 'off');
    });

    it('will start tuning when play is called', function(done) {
      var player = new Feed.Player('token', 'secret', speakerOptions);

      var mock = sinon.mock(player);
      
      mock.expects('trigger').withArgs('placement-changed');
      mock.expects('trigger').withArgs('placement');
      mock.expects('trigger').withArgs('station-changed');
      mock.expects('trigger').withArgs('stations');
      mock.expects('trigger').withArgs('play-active');
      mock.expects('trigger').withArgs('play-started');

      player.setPlacementId('10000');

      plays.push(validPlay());

      player.play();

      setTimeout(function() {
        mock.verify();

        player.destroy();

        done();

      }, 100);
    });


    it('will allow us to pause a play', function(done) {
      var player = new Feed.Player('token', 'secret', speakerOptions);

      var mock = sinon.mock(player);

      mock.expects('trigger').withArgs('placement-changed');
      mock.expects('trigger').withArgs('placement');
      mock.expects('trigger').withArgs('station-changed');
      mock.expects('trigger').withArgs('stations');
      mock.expects('trigger').withArgs('play-active');
      mock.expects('trigger').withArgs('play-started');
      mock.expects('trigger').withArgs('play-paused');

      player.setPlacementId('10000');

      plays.push(validPlay());

      player.play();

      setTimeout(function() {
        player.pause();
      }, 300);

      setTimeout(function() {
        mock.verify();

        player.destroy();

        done();

      }, 400);
    });

    it('will allow us to resume a play', function(done) {
      var player = new Feed.Player('token', 'secret', speakerOptions);

      var mock = sinon.mock(player);

      mock.expects('trigger').withArgs('placement-changed');
      mock.expects('trigger').withArgs('placement');
      mock.expects('trigger').withArgs('station-changed');
      mock.expects('trigger').withArgs('stations');
      mock.expects('trigger').withArgs('play-active');
      mock.expects('trigger').withArgs('play-started');
      mock.expects('trigger').withArgs('play-paused');
      mock.expects('trigger').withArgs('play-resumed');

      player.setPlacementId('10000');

      plays.push(validPlay());

      player.play();

      setTimeout(function() {
        player.pause();
      }, 200);

      setTimeout(function() {
        player.play();
      }, 350);

      setTimeout(function() {
        mock.verify();

        player.destroy();

        done();

      }, 500);
    });

    it('will allow us to pause, resume, and then pause and resume a play again', function(done) {
      var player = new Feed.Player('token', 'secret', speakerOptions);
      player.setPlacementId('10000');

      plays.push(validPlay());
      plays.push(validPlay());

      player.on('play-completed', function() {
        // this has to be done after we've loaded the swf, or we have timing issues
        var mock = sinon.mock(player);

        mock.expects('trigger').withArgs('play-active');
        mock.expects('trigger').withArgs('play-started');
        mock.expects('trigger').withArgs('play-paused');
        mock.expects('trigger').withArgs('play-resumed');
        mock.expects('trigger').withArgs('play-paused');
        mock.expects('trigger').withArgs('play-resumed');

        player.play();

        setTimeout(function() {
          console.log('about to pause');
          player.pause();
        }, 200);

        setTimeout(function() {
          console.log('about to play');
          player.play();
        }, 250);

        setTimeout(function() {
          console.log('about to pause again');
          player.pause();
        }, 300);

        setTimeout(function() {
          console.log('about to play again');
          player.play();
        }, 350);

        setTimeout(function() {
          console.log('verifying');
          mock.verify();

          player.destroy();

          done();

        }, 500);
      });

      player.play();

    });

    it('will finish a play and move on to the next one', function(done) {
      var player = new Feed.Player('token', 'secret', speakerOptions);

      var mock = sinon.mock(player);

      // queue up two plays for the test
      plays.push(validPlay());
      plays.push(validPlay());

      mock.expects('trigger').withArgs('placement-changed');
      mock.expects('trigger').withArgs('placement');
      mock.expects('trigger').withArgs('station-changed');
      mock.expects('trigger').withArgs('stations');
      mock.expects('trigger').withArgs('play-active');
      mock.expects('trigger').withArgs('play-started');
      mock.expects('trigger').withArgs('play-completed');
      mock.expects('trigger').withArgs('play-active');
      mock.expects('trigger').withArgs('play-started');
      mock.expects('trigger').withArgs('play-completed');
      mock.expects('trigger').withArgs('plays-exhausted');

      player.setPlacementId('10000'); 

      player.play();

      setTimeout(function() {
        mock.verify();

        player.destroy();

        done();

      }, 1900);
    });

    it('will let us skip a play', function(done) {
      var player = new Feed.Player('token', 'secret', speakerOptions);

      var mock = sinon.mock(player);

      plays.push(validPlay());
      plays.push(validPlay());

      mock.expects('trigger').withArgs('placement-changed');
      mock.expects('trigger').withArgs('placement');
      mock.expects('trigger').withArgs('station-changed');
      mock.expects('trigger').withArgs('stations');
      mock.expects('trigger').withArgs('play-active');
      mock.expects('trigger').withArgs('play-started');
      mock.expects('trigger').withArgs('play-completed');
      mock.expects('trigger').withArgs('play-active');
      mock.expects('trigger').withArgs('play-started');

      player.setPlacementId('10000');

      player.play();

      setTimeout(function() {
        player.skip();

      }, 200);

      setTimeout(function() {
        mock.verify();

        player.destroy();

        done();

      }, 600);
    });

    it('if we skip a play that is being paused, it will start up the next play immediately', function(done) {
      var player = new Feed.Player('token', 'secret', speakerOptions);

      var mock = sinon.mock(player);

      plays.push(validPlay());
      plays.push(validPlay());

      mock.expects('trigger').withArgs('placement-changed');
      mock.expects('trigger').withArgs('placement');
      mock.expects('trigger').withArgs('station-changed');
      mock.expects('trigger').withArgs('stations');
      mock.expects('trigger').withArgs('play-active');
      mock.expects('trigger').withArgs('play-started');
      mock.expects('trigger').withArgs('play-paused');
      mock.expects('trigger').withArgs('play-completed');
      mock.expects('trigger').withArgs('play-active');
      mock.expects('trigger').withArgs('play-started');

      player.setPlacementId('10000');

      player.play();

      setTimeout(function() {
        player.pause();
      }, 300);

      setTimeout(function() {
        player.skip();
      }, 350);

      setTimeout(function() {
        mock.verify();

        player.destroy();

        done();

      }, 600);
    });

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

        state.play.audio_file.url = 'http://feed.fm/missing';

        var newPlayer = new Feed.Player('token', 'secret', speakerOptions);

        // try to resume playback of the 'missing' song, which will fail
        newPlayer.unsuspend(state, true);

        newPlayer.on('play-started', function(play) {
          // confirm that the next song starts up
          assert.notEqual(play.audio_file.url, 'http://feed.fm/missing', 'should start next song after old one failed to start');

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
})();
