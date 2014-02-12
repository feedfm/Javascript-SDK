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
      var session = new Feed.Session(),
          exceptionThrown = false;

      try {
        session.tune();

        exceptionThrown = false;

      } catch (e) { 
        exceptionThrown = true;
      }

      assert.equal(exceptionThrown, true, 'tune requires credentials');

      session.setCredentials('x', 'y');

      try {
        session.tune();

        exceptionThrown = true;


      } catch (e) { 
        exceptionThrown = false;
      
      }

      assert.equal(exceptionThrown, true, 'should have thrown an exception with bad credentials');
    });

    it('will request a play from the server when tune is called', function() {
      server.respondWith('GET', 'http://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

      var playResponse = validPlayResponse();

      server.respondWith('POST', 'http://feed.fm/api/v2/play', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
      });
      
      var session = newSessionWithClientAndCredentials();
      var mock = sinon.mock(session);

      mock.expects('trigger').withArgs('placement');
      mock.expects('trigger').withArgs('station-changed');
      mock.expects('trigger').withArgs('stations');
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

      server.respondWith('GET', 'http://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
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
      mock.expects('trigger').withArgs('placement');
      mock.expects('trigger').withArgs('station-changed');
      mock.expects('trigger').withArgs('stations');

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

      server.respondWith('GET', 'http://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

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
      mock.expects('trigger').withArgs('placement');
      mock.expects('trigger').withArgs('station-changed');
      mock.expects('trigger').withArgs('stations');
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

      server.respondWith('GET', 'http://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

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
      mock.expects('trigger').withArgs('placement');
      mock.expects('trigger').withArgs('station-changed');
      mock.expects('trigger').withArgs('stations');
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

      server.respondWith('GET', 'http://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

      server.respondWith('POST', 'http://feed.fm/api/v2/play', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
      });
      
      var session = newSessionWithClientAndCredentials();
      var mock = sinon.mock(session);
      mock.expects('trigger').withArgs('placement');
      mock.expects('trigger').withArgs('station-changed');
      mock.expects('trigger').withArgs('stations');
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

      server.respondWith('GET', 'http://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

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
      mock.expects('trigger').withArgs('placement');
      mock.expects('trigger').withArgs('station-changed');
      mock.expects('trigger').withArgs('stations');
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
      server.respondWith('GET', 'http://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

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
      mock.expects('trigger').withArgs('placement');
      mock.expects('trigger').withArgs('station-changed');
      mock.expects('trigger').withArgs('stations');
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
      server.respondWith('GET', 'http://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

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
      mock.expects('trigger').withArgs('placement');
      mock.expects('trigger').withArgs('station-changed');
      mock.expects('trigger').withArgs('stations');
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
      server.respondWith('GET', 'http://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

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
      mock.expects('trigger').withArgs('placement');
      mock.expects('trigger').withArgs('station-changed');
      mock.expects('trigger').withArgs('stations');
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
      server.respondWith('GET', 'http://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

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
      mock.expects('trigger').withArgs('placement');
      mock.expects('trigger').withArgs('station-changed');
      mock.expects('trigger').withArgs('stations');
      mock.expects('trigger').withArgs('play-active');

      session.tune();

      server.respond();

      mock.verify();

      assert.deepEqual(session.getActivePlay(), playResponses[0].play, 'should return play we got from server');

      var thrown = false;

      try {
        session.requestSkip();

        thrown = false;


      } catch (e) {
        // success!
        thrown = true;
      }

      assert.equal(thrown, true, 'should not be able to skip a song if not playing it');
    });

    it('will let you invalidate an active (and not playing) song', function() {
      server.respondWith('GET', 'http://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

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
      mock.expects('trigger').withArgs('placement');
      mock.expects('trigger').withArgs('station-changed');
      mock.expects('trigger').withArgs('stations');
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
      server.respondWith('GET', 'http://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

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
      mock.expects('trigger').withArgs('placement');
      mock.expects('trigger').withArgs('station-changed');
      mock.expects('trigger').withArgs('stations');
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
      server.respondWith('GET', 'http://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

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
      mock.expects('trigger').withArgs('placement');
      mock.expects('trigger').withArgs('station-changed');
      mock.expects('trigger').withArgs('stations');
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

    it.only('will handle a "started playback already" error properly', function(done) {
      // need some extra time due to retry timeouts
      this.timeout(4000);

      server.respondWith('GET', 'http://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

      var playResponses = [ validPlayResponse(), validPlayResponse() ],
          mock;

      var i = 0;
      server.respondWith('POST', 'http://feed.fm/api/v2/play', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponses[i++]));
      });

      // simulate a failed 'start' request
      server.respondWith('POST', /http:\/\/feed\.fm\/api\/v2\/play\/\d+\/start/, function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(500, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false, error: { code: 500, message: 'internal error' } }));
      });

      var session = newSessionWithClientAndCredentials();
      mock = sinon.mock(session);
      mock.expects('trigger').withArgs('placement');
      mock.expects('trigger').withArgs('station-changed');
      mock.expects('trigger').withArgs('stations');
      mock.expects('trigger').withArgs('play-active');

      session.tune();

      server.respond();

      mock.verify();

      assert.deepEqual(session.getActivePlay(), playResponses[0].play, 'should return play we got from server');
      assert.isNull(session.config.pendingPlay, 'nothing queued up yet');

      session.reportPlayStarted();
      // respond to first failed 'start' request
      server.respond();

      // swap in the successful start response
      server.restore();

      server = sinon.fakeServer.create();
      
      // hey - we started already!
      server.respondWith('POST', /http:\/\/feed\.fm\/api\/v2\/play\/\d+\/start/, function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(403, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false, error: { code: 20, message: 'already started' } }));
      });

      server.respondWith('POST', 'http://feed.fm/api/v2/play', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponses[i++]));
      });

      // wait 2 seconds for the 'start' retry to happen
      setTimeout(function() {
        mock = sinon.mock(session);
        mock.expects('trigger').withArgs('play-started');

        // respond to second 'start' request
        server.respond();

        mock.verify();

        done();
      }, 2000);

    });

    it('trying to do anything without an active play will throw an exception', function() {
      var session = newSessionWithClientAndCredentials(),
          exceptionThrown = false;

      try {
        session.reportPlayStarted();

        exceptionThrown = false;

      } catch (e) { 
        exceptionThrown = true;
      }

      assert.equal(exceptionThrown, true, 'should throw exception when there is no active play');

      try {
        session.reportPlayElapsed();

        exceptionThrown = false;

      } catch (e) { 
        exceptionThrown = true;
      }

      assert.equal(exceptionThrown, true, 'should throw exception when there is no active play');

      try {
        session.reportPlayCompleted();

        exceptionThrown = false;

      } catch (e) { 
        exceptionThrown = true;
      }

      assert.equal(exceptionThrown, true, 'should throw exception when there is no active play');

      try {
        session.requestSkip();

        exceptionThrown = false;

      } catch (e) { 
        exceptionThrown = true;
      }

      assert.equal(exceptionThrown, true, 'should throw exception when there is no active play');

      try {
        session.requestInvalidate();

        exceptionThrown = false;

      } catch (e) { 
        exceptionThrown = true;
      }

      assert.equal(exceptionThrown, true, 'should throw exception when there is no active play');
    });

    it('can suspend itself and unsuspend to the same state', function() {
      var playResponses = [],
          mock;

      server.respondWith('GET', 'http://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

      server.respondWith('POST', 'http://feed.fm/api/v2/play', function(response) {
        var pr = validPlayResponse();
        playResponses.push(pr);
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(pr));
      });

      var session = newSessionWithClientAndCredentials();
      session.tune();

      server.respond();

      var state = session.suspend(123);

      var secondSession = newSessionWithClientAndCredentials();

      mock = sinon.mock(secondSession);
      mock.expects('trigger').withArgs('placement-changed');
      mock.expects('trigger').withArgs('station-changed');
      mock.expects('trigger').withArgs('placement');
      mock.expects('trigger').withArgs('stations');
      mock.expects('trigger').withArgs('play-active');

      secondSession.unsuspend(state);

      server.respond();

      mock.verify();
    });

    it('can suspend itself and unsuspend to the same state after a play has started', function() {
      var playResponses = [],
          mock;

      server.respondWith('GET', 'http://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

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
      session.tune();

      server.respond();

      session.reportPlayStarted();

      server.respond();

      var state = session.suspend(123);

      var secondSession = newSessionWithClientAndCredentials();

      mock = sinon.mock(secondSession);
      mock.expects('trigger').withArgs('placement-changed');
      mock.expects('trigger').withArgs('station-changed');
      mock.expects('trigger').withArgs('placement');
      mock.expects('trigger').withArgs('stations');
      mock.expects('trigger').withArgs('play-active');
      mock.expects('trigger').withArgs('play-started');

      secondSession.unsuspend(state);

      server.respond();

      mock.verify();
    });

    function newSessionWithClientAndCredentials() {
      var session = new Feed.Session();

      session._requestServerTime = function(deferred) { deferred.resolve(100); };
      session._requestClientId = function(cb)   { cb('cookie-value'); };

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

    function validPlacementResponse() {
      return {
        success: true,

        placement: {
          id: '1234',
          name: 'Test station'
        },
        stations: [
          { id: '222', name: 'Station 1' },
          { id: '333', name: 'Station 2' }
        ]
      };
    }

  });
})();
