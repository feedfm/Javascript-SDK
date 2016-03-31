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

      // delete the stored cid
      Feed.Auth.deleteClientUUID();
    });

    describe('base API', function() {
      var api = ['playStarted', 'updatePlay', 'playCompleted',
                 'requestSkip', 'rejectItem', 'requestLike', 'requestUnlike',
                 'requestDislike', 'resetAndRequestNextItem' ];

      it('exports the base API', function() {
        var session = new Feed.Session();

        assert.property(session, 'setCredentials');

        for (var i = 0; i < api.length; i++) {
          assert.property(session, api[i]);
        }
      });

      it('requires credentials or will throw', function() {
        var session = new Feed.Session(),
            exceptionThrown = false;

        for (var i = 0; i < api.length; i++) {
          try {
            session[api[i]]();

            exceptionThrown = false;

          } catch (e) { 
            exceptionThrown = true;
          }

          assert.equal(exceptionThrown, true, api[i] + ' should require credentials');
        }
      });
    });

    it('will trigger a session-available event after setting credentials', function(done) {
      server.autoRespond = true;

      server.respondWith('POST', 'https://feed.fm/api/v2/session', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ 
          success: true, 
          session: {
            available: true,
            client_id: 'client id',
            timestamp: Math.floor(Date.now() / 1000)
          },
          stations: [
            { id: 'first-station', name: 'first station' }
          ]
        }));
      });

      var session = new Feed.Session();
      session.on('session-available', done);

      session.setCredentials('x', 'y');
    });

    it('will trigger a session-not-available event when the server says no session is available', function(done) {
      server.autoRespond = true;

      server.respondWith('POST', 'https://feed.fm/api/v2/session', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ 
          success: true, 
          session: {
            available: false,
            client_id: 'client id',
            timestamp: Math.floor(Date.now() / 1000)
          }
        }));
      });

      var session = new Feed.Session();
      session.on('session-not-available', done);

      session.setCredentials('x', 'y');
    });

    it('will trigger a session-not-available event when the server returns an unsuccessful response', function(done) {
      server.autoRespond = true;

      server.respondWith('POST', 'https://feed.fm/api/v2/session', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ 
          success: false, 
          error: {
            message: 'just testing',
            code: 123
          }
        }));
      });

      var session = new Feed.Session();
      session.on('session-not-available', done);

      session.setCredentials('x', 'y');
    });

    it('will return a session-not-available event when the server returns an error', function(done) {
      this.timeout(5000);
      server.autoRespond = true;

      server.respondWith('POST', 'https://feed.fm/api/v2/session', function(response) {
        response.respond(500, { 'Content-Type': 'text/html' }, 'nothing good!');
      });

      var session = new Feed.Session();
      session.on('session-not-available', done);

      session.setCredentials('x', 'y');
    });

    it('will tell us when next item is received', function(done) {
      server.autoRespond = true;

      server.respondWith('POST', 'https://feed.fm/api/v2/session', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
      });

      var play = validPlayResponse();
      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(play));
      });

      var session = new Feed.Session();
      session.once('session-available', function() {
        session.requestNextItem();
      });

      session.once('next-item-available', function(nextPlay) {
        assert.isNotNull(nextPlay);
        assert.equal(nextPlay.id, play.play.id, 'play id passed in should match what server returned');

        assert.equal(session.nextItem.id, nextPlay.id, 'nextItem held by session should match play');

        done();
      });

      session.setCredentials('x', 'y');
    });
    
    it('will make multiple requests to get a play when the first attemps fail', function(done) {
      this.timeout(5000);
      server.autoRespond = true;

      server.respondWith('POST', 'https://feed.fm/api/v2/session', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
      });

      var play = validPlayResponse();
      var requestCount = 0;
      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(response) {
        requestCount++;

        if (requestCount <= 2) {
          // first two responses are bad
          response.respond(500, { 'Content-Type': 'text/html' }, 'not a good response!');
        } else {
          response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(play));
        }
      });

      var session = new Feed.Session();
      session.once('session-available', function() {
        session.requestNextItem();
      });

      session.once('next-item-available', function(nextPlay) {
        assert.isNotNull(nextPlay);

        done();
      });

      session.setCredentials('x', 'y');
    });

    // TODO: what alternate errors can come back from the server when
    //       requesting a play, and how do we handle those?

    it('will not re-request a nextItem when one exists', function(done) {
      server.autoRespond = true;

      server.respondWith('POST', 'https://feed.fm/api/v2/session', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ 
          success: true, 
          session: {
            available: true,
            client_id: 'client id',
            timestamp: Math.floor(Date.now() / 1000)
          },
          stations: [
            { id: 'first-station', name: 'first station' }
          ]
        }));
      });

      var play = validPlayResponse();
      var playCount = 0;
      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(response) {
        playCount++;

        assert(playCount < 2, 'should only make one play');

        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(play));

      });

      var session = new Feed.Session();
      session.on('session-available', function() {
        session.requestNextItem();
      });

      session.on('next-item-available', function(nextPlay) {
        assert.isNotNull(nextPlay);
        assert.equal(nextPlay.id, play.play.id, 'play id passed in should match what server returned');

        assert.equal(session.nextItem.id, nextPlay.id, 'nextItem held by session should match play');

        // should be ignored
        session.requestNextItem();

        // give code a chance to call requestNextItem again
        setTimeout(done, 1000);
      });

      session.setCredentials('x', 'y');
    });


    it('will promote a play from next to current when reported as started', function(done) {
      server.autoRespond = true;

      server.respondWith('POST', 'https://feed.fm/api/v2/session', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
      });

      var plays = [];
      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(response) {
        var play = validPlayResponse();
        plays.push(play);

        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(play));
      });

      var session = new Feed.Session();
      session.once('session-available', function() {
        session.requestNextItem();
      });

      session.once('next-item-available', function(nextPlay) {
        assert.isNotNull(nextPlay);

        session.playStarted();
      });

      session.once('current-item-did-change', function(nowPlaying) {
        assert.isNotNull(nowPlaying);

        assert(plays.length > 0, 'should have served up at least one play');
        assert.equal(plays[0].play.id, nowPlaying.id, 'current play should be the first one generated');
        assert.equal(nowPlaying.id, session.currentItem.id, 'current item should match');

        done();
      });

      session.setCredentials('x', 'y');
    });

    it.only('after a play is started, a request goes out for the next play', function(done) {
      server.autoRespond = true;

      server.respondWith('POST', 'https://feed.fm/api/v2/session', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
      });

      var plays = [];
      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(response) {
        var play = validPlayResponse();
        plays.push(play);

        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(play));
      });

      server.respondWith('POST', /https:\/\/feed.fm\/api\/v2\/play\/\d+\/start/, function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          success: true,
          can_skip: false
        }));
      });

      var session = new Feed.Session();
      session.once('session-available', function() {
        session.requestNextItem();
      });
      
      var startCount = 0;
      session.on('next-item-available', function() {
        startCount++;

        if (startCount <= 1) {
          session.playStarted();

        } else {
          // we got to the second song!
          done();
        }
      });

      session.setCredentials('x', 'y');
    });

    /*** check the session request to make sure it has cookies/auth stuff ****/

/**** HERE ******/
 
    it('will request a play from the server when tune is called', function() {
      server.respondWith('GET', 'https://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

      var playResponse = validPlayResponse();

      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(response) {
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

      server.respondWith('GET', 'https://feed.fm/api/v2/oauth/time', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, time: Math.floor(Date.now() / 1000) }));
      });

      server.respondWith('GET', 'https://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
      });

      server.respondWith('POST', 'https://feed.fm/api/v2/client', function(response) {
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

      server.respondWith('GET', 'https://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(response) {
        var pr = validPlayResponse();
        playResponses.push(pr);
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(pr));
      });

      server.respondWith('POST', /https:\/\/feed\.fm\/api\/v2\/play\/\d+\/start/, function(response) {
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

      server.respondWith('GET', 'https://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(response) {
        var pr = validPlayResponse();
        playResponses.push(pr);
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(pr));
      });

      server.respondWith('POST', /https:\/\/feed\.fm\/api\/v2\/play\/\d+\/start/, function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, can_skip: true }));
      });

      server.respondWith('POST', /https:\/\/feed\.fm\/api\/v2\/play\/\d+\/complete/, function(response) {
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

      server.respondWith('GET', 'https://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(response) {
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

      server.respondWith('GET', 'https://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

      var i = 0;
      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponses[i++]));
      });

      server.respondWith('POST', /https:\/\/feed\.fm\/api\/v2\/play\/\d+\/start/, function(response) {
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
      server.respondWith('GET', 'https://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

      var playResponses = [
            validPlayResponse(),
            validPlayResponse()
          ],
        mock;

      var i = 0;
      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponses[i++]));
      });

      server.respondWith('POST', /https:\/\/feed\.fm\/api\/v2\/play\/\d+\/start/, function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, can_skip: true }));
      });

      server.respondWith('POST', /https:\/\/feed\.fm\/api\/v2\/play\/\d+\/skip/, function(response) {
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
      server.respondWith('GET', 'https://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

      var playResponses = [
            validPlayResponse(),
            validPlayResponse()
          ],
        mock;

      var i = 0;
      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponses[i++]));
      });

      server.respondWith('POST', /https:\/\/feed\.fm\/api\/v2\/play\/\d+\/start/, function(response) {
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
      server.respondWith('GET', 'https://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

      var playResponses = [
            validPlayResponse(),
            validPlayResponse()
          ],
        mock;

      var i = 0;
      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponses[i++]));
      });

      server.respondWith('POST', /https:\/\/feed\.fm\/api\/v2\/play\/\d+\/start/, function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, can_skip: true }));
      });

      server.respondWith('POST', /https:\/\/feed\.fm\/api\/v2\/play\/\d+\/skip/, function(response) {
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
      server.respondWith('GET', 'https://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

      var playResponses = [ validPlayResponse() ],
        mock;

      var i = 0;
      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponses[i++]));
      });

      server.respondWith('POST', /https:\/\/feed\.fm\/api\/v2\/play\/\d+\/start/, function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, can_skip: true }));
      });

      server.respondWith('POST', /https:\/\/feed\.fm\/api\/v2\/play\/\d+\/skip/, function(response) {
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
      server.respondWith('GET', 'https://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

      var playResponses = [ validPlayResponse(), validPlayResponse() ],
        mock;

      var i = 0;
      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponses[i++]));
      });

      server.respondWith('POST', /https:\/\/feed\.fm\/api\/v2\/play\/\d+\/start/, function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, can_skip: true }));
      });

      server.respondWith('POST', /https:\/\/feed\.fm\/api\/v2\/play\/\d+\/invalidate/, function(response) {
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
      server.respondWith('GET', 'https://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

      var playResponses = [ validPlayResponse(), validPlayResponse(), validPlayResponse() ],
        mock;

      var i = 0;
      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponses[i++]));
      });

      server.respondWith('POST', /https:\/\/feed\.fm\/api\/v2\/play\/\d+\/start/, function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, can_skip: true }));
      });

      server.respondWith('POST', /https:\/\/feed\.fm\/api\/v2\/play\/\d+\/invalidate/, function(response) {
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
      server.respondWith('GET', 'https://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

      var playResponses = [ validPlayResponse(), validPlayResponse() ],
          mock;

      var i = 0;
      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponses[i++]));
      });

      server.respondWith('POST', /https:\/\/feed\.fm\/api\/v2\/play\/\d+\/start/, function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, can_skip: true }));
      });

      server.respondWith('POST', /https:\/\/feed\.fm\/api\/v2\/play\/\d+\/elapse/, function(response) {
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

    it('will handle a "started playback already" error properly', function(done) {
      // need some extra time due to retry timeouts
      this.timeout(4000);

      server.respondWith('GET', 'https://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

      var playResponses = [ validPlayResponse(), validPlayResponse() ],
          mock;

      var i = 0;
      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponses[i++]));
      });

      // simulate a failed 'start' request
      server.respondWith('POST', /https:\/\/feed\.fm\/api\/v2\/play\/\d+\/start/, function(response) {
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
      server.respondWith('POST', /https:\/\/feed\.fm\/api\/v2\/play\/\d+\/start/, function(response) {
        assert.deepProperty(response, 'requestHeaders.Authorization', 'Request should be signed');
        response.respond(403, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false, error: { code: 20, message: 'already started' } }));
      });

      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(response) {
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

      server.respondWith('GET', 'https://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(response) {
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

      server.respondWith('GET', 'https://feed.fm/api/v2/placement/1234', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
      });

      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(response) {
        var pr = validPlayResponse();
        playResponses.push(pr);
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(pr));
      });

      server.respondWith('POST', /https:\/\/feed\.fm\/api\/v2\/play\/\d+\/start/, function(response) {
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
            'url': 'https://feed.fm/audiofile-665-original.aac'
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

    function validSessionResponse() {
      return {
        success: true, 
        session: {
          available: true,
          client_id: 'client id',
          timestamp: Math.floor(Date.now() / 1000)
        },
        stations: [
          { id: 'first-station', name: 'first station' }
        ]
      };
    }
  });
})();
