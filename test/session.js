/*global it:false, describe:false, beforeEach:false, afterEach:false, chai:false, sinon:false, Feed:false */
/*jshint camelcase:false */

(function() {
  var assert = chai.assert;

  describe('session', function() {

    var server;

    beforeEach(function() {
      server = sinon.fakeServer.create();

    });

    afterEach(function() {
      server.restore();

      Feed.Session.prototype._deleteStoredCid();
    });

    it('exports the base API', function() {
      var session = new Feed.Session();

      assert.property(session, 'setCredentials');
      assert.property(session, 'setPlacementId');
      assert.property(session, 'setStationId');
      assert.property(session, 'setFormats');
      assert.property(session, 'reportPlayStarted');
      assert.property(session, 'reportPlayCompleted');
      assert.property(session, 'tune');
      assert.property(session, 'on');
      assert.property(session, 'off');
      assert.property(session, 'trigger');
    });

    it('requires credentials and placement for a tune call or will throw', function() {
      var session = new Feed.Session();

      try {
        session.tune();

        assert.fail(null, null, 'should have thrown an exception');

      } catch (e) { }

      session.setCredentials('x', 'y');

      try {
        session.tune();

        assert.fail(null, null, 'should have thrown an exception');

      } catch (e) { }
    });

    it('will request a play from the server when tune is called', function() {
      var playResponse = validPlayResponse();

      server.respondWith('POST', 'http://feed.fm/api/v2/play', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
      });
      
      var session = newSessionWithClientAndCredentials();
      var mock = sinon.mock(session);
      mock.expects('trigger').withArgs('play-active');

      session.tune();

      server.respond();

      mock.verify();

      assert.deepEqual(session.getActivePlay(), playResponse.play, 'should return play we got from server');
    });

    it('will request and cache new client id when creating first play', function() {
      var playResponse = validPlayResponse(),
          gotClient = false,
          clientId = 'this is the client id';

      server.respondWith('GET', 'http://feed.fm/api/v2/oauth/time', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, time: Math.floor(Date.now() / 1000) }));
      });

      server.respondWith('POST', 'http://feed.fm/api/v2/play', function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
      });

      server.respondWith('POST', 'http://feed.fm/api/v2/client', function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');

        gotClient = true;
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          success: true,
          client_id: clientId
        }));
      });

      var session = new Feed.Session();
      var mock = sinon.mock(session);

      mock.expects('trigger').withArgs('placement-changed');

      mock.expects('_getStoredCid').returns(null);
      mock.expects('_setStoredCid').withArgs(clientId).returns(null);

      mock.expects('trigger').withArgs('play-active');

      session.setCredentials('x', 'y');
      session.setPlacementId('1234');

      session.tune();

      server.respond();

      mock.verify();

      assert(gotClient, true, 'should have made request for client id');
    });

    it('will begin looking for a second song once the first has started', function() {
      var playResponses = [],
          mock;

      server.respondWith('POST', 'http://feed.fm/api/v2/play', function(response) {
        var pr = validPlayResponse();
        playResponses.push(pr);
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(pr));
      });

      server.respondWith('POST', /http:\/\/feed\.fm\/api\/v2\/play\/\d+\/start/, function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, can_skip: true }));
      });

      var session = newSessionWithClientAndCredentials();
      mock = sinon.mock(session);
      mock.expects('trigger').withArgs('play-active');

      session.tune();

      server.respond();

      mock.verify();

      assert.deepEqual(session.getActivePlay(), playResponses[0].play, 'should return play we got from server');
      assert.isNull(session.config.pendingPlay, 'nothing queued up yet');

      mock = sinon.mock(session);
      mock.expects('trigger').withArgs('play-started');

      session.reportPlayStarted();

      server.respond();

      mock.verify();

      assert.isNotNull(session.config.pendingPlay, 'should have a pending play now');
      assert.deepEqual(session.config.pendingPlay, playResponses[1].play, 'should return second play we got from server');

    });

    it('will continue pulling plays as they are started', function() {
      var playResponses = [],
          mock;

      server.respondWith('POST', 'http://feed.fm/api/v2/play', function(response) {
        var pr = validPlayResponse();
        playResponses.push(pr);
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(pr));
      });

      server.respondWith('POST', /http:\/\/feed\.fm\/api\/v2\/play\/\d+\/start/, function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, can_skip: true }));
      });

      server.respondWith('POST', /http:\/\/feed\.fm\/api\/v2\/play\/\d+\/complete/, function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
      });

      var session = newSessionWithClientAndCredentials();
      mock = sinon.mock(session);
      mock.expects('trigger').withArgs('play-active');

      // tune to station, get an active play
      session.tune();

      server.respond();

      mock.verify();

      assert.deepEqual(session.getActivePlay(), playResponses[0].play, 'should return play we got from server');

      mock = sinon.mock(session);
      mock.expects('trigger').withArgs('play-started');

      // start playing the active play
      session.reportPlayStarted();

      server.respond();

      mock.verify();

      assert.isNotNull(session.config.pendingPlay, 'should have a pending play now');
      assert.deepEqual(session.config.pendingPlay, playResponses[1].play, 'should return second play we got from server');

      mock = sinon.mock(session);
      mock.expects('trigger').withArgs('play-completed');
      mock.expects('trigger').withArgs('play-active');

      // complete playing the active play, and get a new active play
      session.reportPlayCompleted();

      server.respond();

      mock.verify();

      assert.isNull(session.config.pendingPlay, 'no pending play any more');
      assert.deepEqual(session.getActivePlay(), playResponses[1].play, 'second song should be active now');

      mock = sinon.mock(session);
      mock.expects('trigger').withArgs('play-started');

      // start playing the next play...
      session.reportPlayStarted();

      server.respond();

      mock.verify();

      assert.isNotNull(session.config.pendingPlay, 'should have a pending play again');
      assert.deepEqual(session.config.pendingPlay, playResponses[2].play, 'should return third play we got from server');
    });

    it('will emit plays-exhausted when the first play cannot satisfy DMCA rules', function() {
      var playResponse = {
        success: false,
        error: {
          code: 9,
          message: 'no more muzak!'
        }
      };

      server.respondWith('POST', 'http://feed.fm/api/v2/play', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
      });
      
      var session = newSessionWithClientAndCredentials();
      var mock = sinon.mock(session);
      mock.expects('trigger').withArgs('plays-exhausted');

      session.tune();

      server.respond();

      mock.verify();

      assert.isNull(session.getActivePlay(), 'should return play we got from server');
    });

    it('will emit plays-exhausted when the second play cannot satisfy DMCA rules', function() {
      var playResponses = [
            validPlayResponse(),
            {
              success: false,
              error: {
                code: 9,
                message: 'no more muzak!'
              }
            }
          ],
        mock;

      var i = 0;
      server.respondWith('POST', 'http://feed.fm/api/v2/play', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponses[i++]));
      });

      server.respondWith('POST', /http:\/\/feed\.fm\/api\/v2\/play\/\d+\/start/, function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, can_skip: true }));
      });

      var session = newSessionWithClientAndCredentials();
      mock = sinon.mock(session);
      mock.expects('trigger').withArgs('play-active');

      session.tune();

      server.respond();

      mock.verify();

      assert.deepEqual(session.getActivePlay(), playResponses[0].play, 'should return play we got from server');

      mock = sinon.mock(session);
      mock.expects('trigger').withArgs('play-started');

      session.reportPlayStarted();

      server.respond();

      mock.verify();

      assert.isNull(session.config.pendingPlay, 'should have no pending play');

      mock = sinon.mock(session);
      mock.expects('trigger').withArgs('play-completed');
      mock.expects('trigger').withArgs('plays-exhausted');

      session.reportPlayCompleted();

      server.respond();

      mock.verify();
    });

    it('will successfully skip a song', function() {
      var playResponses = [
            validPlayResponse(),
            validPlayResponse()
          ],
        mock;

      var i = 0;
      server.respondWith('POST', 'http://feed.fm/api/v2/play', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponses[i++]));
      });

      server.respondWith('POST', /http:\/\/feed\.fm\/api\/v2\/play\/\d+\/start/, function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, can_skip: true }));
      });

      server.respondWith('POST', /http:\/\/feed\.fm\/api\/v2\/play\/\d+\/skip/, function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
      });

      var session = newSessionWithClientAndCredentials();
      mock = sinon.mock(session);
      mock.expects('trigger').withArgs('play-active');

      session.tune();

      server.respond();

      mock.verify();

      assert.deepEqual(session.getActivePlay(), playResponses[0].play, 'should return play we got from server');

      mock = sinon.mock(session);
      mock.expects('trigger').withArgs('play-started');

      session.reportPlayStarted();

      server.respond();

      mock.verify();

      assert.deepEqual(session.config.pendingPlay, playResponses[1].play, 'should have pending play');

      mock = sinon.mock(session);
      mock.expects('trigger').withArgs('play-completed');
      mock.expects('trigger').withArgs('play-active');

      session.requestSkip();

      server.respond();

      mock.verify();

      assert.deepEqual(session.getActivePlay(), playResponses[1].play, 'should return next play we got from server');
    });

    it('will not skip a song is has no permission to skip', function() {
      var playResponses = [
            validPlayResponse(),
            validPlayResponse()
          ],
        mock;

      var i = 0;
      server.respondWith('POST', 'http://feed.fm/api/v2/play', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponses[i++]));
      });

      server.respondWith('POST', /http:\/\/feed\.fm\/api\/v2\/play\/\d+\/start/, function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, can_skip: false }));
      });

      var session = newSessionWithClientAndCredentials();
      mock = sinon.mock(session);
      mock.expects('trigger').withArgs('play-active');

      session.tune();

      server.respond();

      mock.verify();

      assert.deepEqual(session.getActivePlay(), playResponses[0].play, 'should return play we got from server');

      mock = sinon.mock(session);
      mock.expects('trigger').withArgs('play-started');

      session.reportPlayStarted();

      server.respond();

      mock.verify();

      assert.deepEqual(session.config.pendingPlay, playResponses[1].play, 'should have pending play');

      mock = sinon.mock(session);
      mock.expects('trigger').withArgs('skip-denied');

      session.requestSkip();

      server.respond();

      mock.verify();

      assert.deepEqual(session.getActivePlay(), playResponses[0].play, 'should return original play we got from server');
    });

    it('will not skip a song if the server denies the skip', function() {
      var playResponses = [
            validPlayResponse(),
            validPlayResponse()
          ],
        mock;

      var i = 0;
      server.respondWith('POST', 'http://feed.fm/api/v2/play', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponses[i++]));
      });

      server.respondWith('POST', /http:\/\/feed\.fm\/api\/v2\/play\/\d+\/start/, function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, can_skip: true }));
      });

      server.respondWith('POST', /http:\/\/feed\.fm\/api\/v2\/play\/\d+\/skip/, function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false, error: { code: 7, message: 'skip limit reached' } }));
      });

      var session = newSessionWithClientAndCredentials();
      mock = sinon.mock(session);
      mock.expects('trigger').withArgs('play-active');

      session.tune();

      server.respond();

      mock.verify();

      assert.deepEqual(session.getActivePlay(), playResponses[0].play, 'should return play we got from server');

      mock = sinon.mock(session);
      mock.expects('trigger').withArgs('play-started');

      session.reportPlayStarted();

      server.respond();

      mock.verify();

      assert.deepEqual(session.config.pendingPlay, playResponses[1].play, 'should have pending play');

      mock = sinon.mock(session);
      mock.expects('trigger').withArgs('skip-denied');

      session.requestSkip();

      server.respond();

      mock.verify();

      assert.deepEqual(session.getActivePlay(), playResponses[0].play, 'should return original play we got from server');
    });

    it('will not let you skip a song the song is not playing', function() {
      var playResponses = [ validPlayResponse() ],
        mock;

      var i = 0;
      server.respondWith('POST', 'http://feed.fm/api/v2/play', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponses[i++]));
      });

      server.respondWith('POST', /http:\/\/feed\.fm\/api\/v2\/play\/\d+\/start/, function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, can_skip: true }));
      });

      server.respondWith('POST', /http:\/\/feed\.fm\/api\/v2\/play\/\d+\/skip/, function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false, error: { code: 7, message: 'skip limit reached' } }));
      });

      var session = newSessionWithClientAndCredentials();
      mock = sinon.mock(session);
      mock.expects('trigger').withArgs('play-active');

      session.tune();

      server.respond();

      mock.verify();

      assert.deepEqual(session.getActivePlay(), playResponses[0].play, 'should return play we got from server');

      try {
        session.requestSkip();

        assert.fail(null, null, 'should not be able to skip a song if not playing it');

      } catch (e) {
        // success!
      }
    });

    it('will let you invalidate an active (and not playing) song', function() {
      var playResponses = [ validPlayResponse(), validPlayResponse() ],
        mock;

      var i = 0;
      server.respondWith('POST', 'http://feed.fm/api/v2/play', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponses[i++]));
      });

      server.respondWith('POST', /http:\/\/feed\.fm\/api\/v2\/play\/\d+\/start/, function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, can_skip: true }));
      });

      server.respondWith('POST', /http:\/\/feed\.fm\/api\/v2\/play\/\d+\/invalidate/, function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
      });

      var session = newSessionWithClientAndCredentials();
      mock = sinon.mock(session);
      mock.expects('trigger').withArgs('play-active');

      session.tune();

      server.respond();

      mock.verify();

      assert.deepEqual(session.getActivePlay(), playResponses[0].play, 'should return play we got from server');

      mock = sinon.mock(session);
      mock.expects('trigger').withArgs('play-completed');
      mock.expects('trigger').withArgs('play-active');

      session.requestInvalidate();

      server.respond();

      mock.verify();

      assert.deepEqual(session.getActivePlay(), playResponses[1].play, 'should return play we got from server');
    });

    it('will let you invalidate a playing song', function() {
      var playResponses = [ validPlayResponse(), validPlayResponse(), validPlayResponse() ],
        mock;

      var i = 0;
      server.respondWith('POST', 'http://feed.fm/api/v2/play', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponses[i++]));
      });

      server.respondWith('POST', /http:\/\/feed\.fm\/api\/v2\/play\/\d+\/start/, function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, can_skip: true }));
      });

      server.respondWith('POST', /http:\/\/feed\.fm\/api\/v2\/play\/\d+\/invalidate/, function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
      });

      var session = newSessionWithClientAndCredentials();
      mock = sinon.mock(session);
      mock.expects('trigger').withArgs('play-active');

      session.tune();

      server.respond();

      mock.verify();

      assert.deepEqual(session.getActivePlay(), playResponses[0].play, 'should return play we got from server');

      mock = sinon.mock(session);
      mock.expects('trigger').withArgs('play-started');

      session.reportPlayStarted();

      server.respond();

      mock.verify();

      mock = sinon.mock(session);
      mock.expects('trigger').withArgs('play-completed');
      mock.expects('trigger').withArgs('play-active');

      session.requestInvalidate();

      server.respond();

      mock.verify();

      assert.deepEqual(session.getActivePlay(), playResponses[1].play, 'should return play we got from server');
    });

    it('will let you report the elapsed playback time', function() {
      var playResponses = [ validPlayResponse(), validPlayResponse() ],
          mock;

      var i = 0;
      server.respondWith('POST', 'http://feed.fm/api/v2/play', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponses[i++]));
      });

      server.respondWith('POST', /http:\/\/feed\.fm\/api\/v2\/play\/\d+\/start/, function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, can_skip: true }));
      });

      server.respondWith('POST', /http:\/\/feed\.fm\/api\/v2\/play\/\d+\/elapse/, function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
      });

      var session = newSessionWithClientAndCredentials();
      mock = sinon.mock(session);
      mock.expects('trigger').withArgs('play-active');

      session.tune();

      server.respond();

      mock.verify();

      assert.deepEqual(session.getActivePlay(), playResponses[0].play, 'should return play we got from server');
      assert.isNull(session.config.pendingPlay, 'nothing queued up yet');

      mock = sinon.mock(session);
      mock.expects('trigger').withArgs('play-started');

      session.reportPlayStarted();

      server.respond();

      mock.verify();

      session.reportPlayElapsed(10);

      server.respond();

    });

    it('trying to do anything without an active play will throw an exception', function() {
      var session = newSessionWithClientAndCredentials();

      try {
        session.reportPlayStarted();

        assert.fail(null, null, 'should throw exception when there is no active play');
      } catch (e) { }

      try {
        session.reportPlayElapsed();

        assert.fail(null, null, 'should throw exception when there is no active play');
      } catch (e) { }

      try {
        session.reportPlayCompleted();

        assert.fail(null, null, 'should throw exception when there is no active play');
      } catch (e) { }

      try {
        session.requestSkip();

        assert.fail(null, null, 'should throw exception when there is no active play');
      } catch (e) { }

      try {
        session.requestInvalidate();

        assert.fail(null, null, 'should throw exception when there is no active play');
      } catch (e) { }

    });

    function newSessionWithClientAndCredentials() {
      var session = new Feed.Session();

      session._requestServerTime = function(deferred) { deferred.resolve(100); };
      session._requestClientId = function(deferred)   { deferred.resolve('cookie-value'); };

      session.setCredentials('x', 'y');
      session.setPlacementId('1234');

      return session;
    }

    var counter = 0;
    function validPlayResponse(id) {
      if (!id) { id = counter++; }

      return {
        'success': true,
        'play': {
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
            'codec': 'aac',
            'bitrate': '128',
            'url': 'http://feed.fm/audiofile-665-original.aac'
          }
        }
      };
    }

  });
})();
