/*global it:false, describe:false, beforeEach:false, afterEach:false, chai:false, sinon:false, Feed:false */
/*jshint camelcase:false */

(function() {
  var assert = chai.assert;

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

      server.respondWith('POST', 'http://feed.fm/api/v2/play', function(response) {
        console.log('play');
        requests.push('play');

        var rp = validPlay();
        plays.push(rp.play);

        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, play: rp }));
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
      var player = new Feed.Player('token', 'secret');

      assert.property(player, 'play');
      assert.property(player, 'pause');
      assert.property(player, 'skip');
      assert.property(player, 'setPlacementId');
      assert.property(player, 'setStationId');
      assert.property(player, 'on');
      assert.property(player, 'off');
    });

    it('requires credentials and placement for a play call or will throw', function() {
      var player = new Feed.Player('token', 'secret');

      try {
        player.play();

        assert.fail(null, null, 'should have thrown an exception');

      } catch (e) { }

    });

    it('will start tuning when play is called', function(done) {
      var player = new Feed.Player('token', 'secret');

      var mock = sinon.mock(player);

      player.setPlacementId('10000');

      mock.expects('trigger').withArgs('play-active');
      mock.expects('trigger').withArgs('play-started');

      player.play();

      setTimeout(function() {
        mock.verify();

        player.destroy();

        done();

      }, 100);
    });


    it('will allow us to pause a play', function(done) {
      var player = new Feed.Player('token', 'secret');

      var mock = sinon.mock(player);

      player.setPlacementId('10000');

      mock.expects('trigger').withArgs('play-active');
      mock.expects('trigger').withArgs('play-started');
      mock.expects('trigger').withArgs('play-paused');

      player.play();

      setTimeout(function() {
        player.pause();
      }, 100);

      setTimeout(function() {
        mock.verify();

        player.destroy();

        done();

      }, 200);
    });

    it('will allow us to resume a play', function(done) {
      var player = new Feed.Player('token', 'secret');

      var mock = sinon.mock(player);

      player.setPlacementId('10000');

      mock.expects('trigger').withArgs('play-active');
      mock.expects('trigger').withArgs('play-started');
      mock.expects('trigger').withArgs('play-paused');
      mock.expects('trigger').withArgs('play-resumed');

      player.play();

      setTimeout(function() {
        player.pause();
      }, 100);

      setTimeout(function() {
        player.play();
      }, 150);

      setTimeout(function() {
        mock.verify();

        player.destroy();

        done();

      }, 200);
    });

    it('will allow us to pause, resume, and them pause and resume a play again', function(done) {
      var player = new Feed.Player('token', 'secret');

      var mock = sinon.mock(player);

      player.setPlacementId('10000');

      mock.expects('trigger').withArgs('play-active');
      mock.expects('trigger').withArgs('play-started');
      mock.expects('trigger').withArgs('play-paused');
      mock.expects('trigger').withArgs('play-resumed');
      mock.expects('trigger').withArgs('play-paused');
      mock.expects('trigger').withArgs('play-resumed');

      player.play();

      setTimeout(function() {
        player.pause();
      }, 100);

      setTimeout(function() {
        player.play();
      }, 150);

      setTimeout(function() {
        player.pause();
      }, 200);

      setTimeout(function() {
        player.play();
      }, 250);

      setTimeout(function() {
        mock.verify();

        player.destroy();

        done();

      }, 300);
    });

    it('will finish a play and move on to the next one', function(done) {
      var player = new Feed.Player('token', 'secret');

      var mock = sinon.mock(player);

      player.setPlacementId('10000');

      mock.expects('trigger').withArgs('play-active');
      mock.expects('trigger').withArgs('play-started');
      mock.expects('trigger').withArgs('play-completed');
      mock.expects('trigger').withArgs('play-active');
      mock.expects('trigger').withArgs('play-started');

      player.play();

      setTimeout(function() {
        mock.verify();

        player.destroy();

        done();

      }, 600);
    });

    it('will let us skip a play', function(done) {
      var player = new Feed.Player('token', 'secret');

      var mock = sinon.mock(player);

      player.setPlacementId('10000');

      mock.expects('trigger').withArgs('play-active');
      mock.expects('trigger').withArgs('play-started');
      mock.expects('trigger').withArgs('play-completed');
      mock.expects('trigger').withArgs('play-active');
      mock.expects('trigger').withArgs('play-started');

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
      var player = new Feed.Player('token', 'secret');

      var mock = sinon.mock(player);

      player.setPlacementId('10000');

      mock.expects('trigger').withArgs('play-active');
      mock.expects('trigger').withArgs('play-started');
      mock.expects('trigger').withArgs('play-paused');
      mock.expects('trigger').withArgs('play-completed');
      mock.expects('trigger').withArgs('play-active');
      mock.expects('trigger').withArgs('play-started');

      player.play();

      setTimeout(function() {
        player.pause();
      }, 100);

      setTimeout(function() {
        player.skip();
      }, 150);

      setTimeout(function() {
        mock.verify();

        player.destroy();

        done();

      }, 200);
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
          'url': '/sample/chirp.mp3'
        }
      };
    }
  });
})();
