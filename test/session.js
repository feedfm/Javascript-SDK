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
      Feed.Client.deleteClientUUID();
    });

    describe('base API', function() {
      var api = ['playStarted', 'updatePlay', 'playCompleted',
                 'requestSkip', 'rejectPlay', 'requestLike', 'requestUnlike',
                 'requestDislike' ];

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
      session.on('session-available', function() {
        done();
      });

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

    it('will tell us when next play is received', function(done) {
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
        session.requestNextPlay();
      });

      session.once('next-play-available', function(nextPlay) {
        assert.isNotNull(nextPlay);
        assert.equal(nextPlay.id, play.play.id, 'play id passed in should match what server returned');

        assert.equal(session.nextPlay.id, nextPlay.id, 'nextPlay held by session should match play');

        done();
      });

      session.setCredentials('x', 'y');
    });
    
    it('will make multiple requests to get a play when the first attempts fail', function(done) {
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
        session.requestNextPlay();
      });

      session.once('next-play-available', function(nextPlay) {
        assert.isNotNull(nextPlay);

        done();
      });

      session.setCredentials('x', 'y');
    });

    // TODO: what alternate errors can come back from the server when
    //       requesting a play, and how do we handle those?

    it('will not re-request a nextPlay when one exists', function(done) {
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
        session.requestNextPlay();
      });

      session.on('next-play-available', function(nextPlay) {
        assert.isNotNull(nextPlay);
        assert.equal(nextPlay.id, play.play.id, 'play id passed in should match what server returned');

        assert.equal(session.nextPlay.id, nextPlay.id, 'nextPlay held by session should match play');

        // should be ignored
        session.requestNextPlay();

        // give code a chance to call requestNextPlay again
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
        session.requestNextPlay();
      });

      session.once('next-play-available', function(nextPlay) {
        assert.isNotNull(nextPlay);

        session.playStarted();
      });

      session.once('current-play-did-change', function(nowPlaying) {
        assert.isNotNull(nowPlaying);

        assert(plays.length > 0, 'should have served up at least one play');
        assert.equal(plays[0].play.id, nowPlaying.id, 'current play should be the first one generated');
        assert.equal(nowPlaying.id, session.currentPlay.id, 'current play should match');

        done();
      });

      session.setCredentials('x', 'y');
    });

    it('after a play is started, a request goes out for the next play automatically', function(done) {
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
        session.requestNextPlay();
      });
      
      var startCount = 0;
      session.on('next-play-available', function() {
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

    it('after a play is completed, the current play is set to null', function(done) {
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

      server.respondWith('POST', /https:\/\/feed.fm\/api\/v2\/play\/\d+\/complete/, function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          success: true,
          can_skip: false
        }));
      });

      var session = new Feed.Session();
      session.once('session-available', function() {
        session.requestNextPlay();
      });
      
      var startCount = 0;
      session.on('next-play-available', function() {
        startCount++;

        if (startCount === 1) {
          // start playback of first incoming play
          session.playStarted();

        } // don't care about subsequent plays at the moment
      });

      var currentCount = 0;
      session.on('current-play-did-change', function() {
        currentCount++;

        if (currentCount === 1) {
          assert.isNotNull(session.currentPlay, 'should have a current play now');

          setTimeout(function() {
            // report this play as completed after a bit
            session.playCompleted();
          }, 10);

        } else if (currentCount === 2) {
          // after the first play completes, currentPlay will be set to null
          assert.isNull(session.currentPlay, 'should clear out current play upon song completion');

          done();

        } else {
          assert.fail('should not have changed current play again');

        }

      });

      session.setCredentials('x', 'y');
    });

    it('will trigger the active-station-did-change event after changing the station', function(done) {
      server.autoRespond = true;

      server.respondWith('POST', 'https://feed.fm/api/v2/session', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
      });

      var session = new Feed.Session();
      session.once('session-available', function() {
        session.setStation(session.stations[1].id);
      });

      session.once('active-station-did-change', function(station) {
        assert.equal(session.stations[1], station);
        assert.equal(session.activeStation, station);

        done();
      });
      
      session.setCredentials('x', 'y');
    });

    it('will reset the current and next plays after changing the station', function(done) {
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

      server.respondWith('POST', /https:\/\/feed.fm\/api\/v2\/play\/\d+\/complete/, function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          success: true,
          can_skip: false
        }));
      });

      var session = new Feed.Session();
      session.once('session-available', function() {
        session.requestNextPlay();
      });
      
      var startCount = 0;
      session.on('next-play-available', function() {
        startCount++;

        if (startCount === 1) {
          // start playback of first incoming play and kick off
          // request for a new next-play
          session.playStarted();

        } else {
          // second play has been queued up - now change the station
          session.setStation(session.stations[1].id);

        }
      });

      var discardCalled = false;
      session.on('discard-next-play', function(next) {
        assert.isNotNull(next);
        discardCalled = true;
      });

      session.on('active-station-did-change', function() {
        assert.isNull(session.currentPlay);
        assert.isNull(session.nextPlay);
        assert.isTrue(discardCalled, true);

        done();
      });

      session.setCredentials('x', 'y');
    });

    it('will send out a skip-status event when the skip status changes', function(done) {
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
          can_skip: true    // should trigger skip status change
        }));
      });

      var session = new Feed.Session();
      session.once('session-available', function() {
        session.requestNextPlay();
      });
      
      var startCount = 0;
      session.on('next-play-available', function() {
        startCount++;

        if (startCount === 1) {
          // start playback of first incoming play
          session.playStarted();

        } // don't care about subsequent plays at the moment
      });

      session.on('skip-status-did-change', function() {
        assert.isTrue(session.canSkip);

        done();
      });

      session.setCredentials('x', 'y');
    });

    it('will send out a no-more-music event when a play request says we have no more music to give out', function(done) {
      server.autoRespond = true;

      server.respondWith('POST', 'https://feed.fm/api/v2/session', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
      });

      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(response) {
        response.respond(500, { 'Content-Type': 'application/json' }, JSON.stringify({
          success: false, 
          error: {
            code: 9,
            message: 'There is no more music available',
            status: 500
          }
        }));
      });

      var session = new Feed.Session();
      session.once('session-available', function() {
        session.requestNextPlay();
      });
      
      session.on('no-more-music', function() {
        // success!
        done();
      });

      session.setCredentials('x', 'y');
    });

    it('will only send out a no-more-music event when the current play has completed', function(done) {
      server.autoRespond = true;

      server.respondWith('POST', 'https://feed.fm/api/v2/session', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
      });

      var playCount = 0;
      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(response) {
        playCount++;

        if (playCount === 1) {
          response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlayResponse()));

        } else {
          response.respond(500, { 'Content-Type': 'application/json' }, JSON.stringify({
            success: false, 
            error: {
              code: 9,
              message: 'There is no more music available',
              status: 500
            }
          }));
        }
      });

      server.respondWith('POST', /https:\/\/feed.fm\/api\/v2\/play\/\d+\/start/, function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          success: true,
          can_skip: false
        }));
      });

      server.respondWith('POST', /https:\/\/feed.fm\/api\/v2\/play\/\d+\/complete/, function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          success: true
        }));
      });

      var session = new Feed.Session();
      session.once('session-available', function() {
        session.requestNextPlay();
      });

      session.on('next-play-available', function() {
        if (!session.currentPlay) {
          session.playStarted();
        }
      });

      session.on('current-play-did-change', function(play) {
        if (play !== null) {
          // report play completed after the session should have received
          // word that there is no more music available.
          setTimeout(function() {
            session.playCompleted();
          }, 500);
        }
      });
      
      session.on('no-more-music', function() {
        // success!
        assert.isNull(session.currentPlay, 'no-more-music should only be emitted after current song completed');

        done();
      });

      session.setCredentials('x', 'y');
    });

    it('will set current play to null when a skip request succeeds', function(done) {
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

      server.respondWith('POST', /https:\/\/feed.fm\/api\/v2\/play\/\d+\/skip/, function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          success: true
        }));
      });

      var session = new Feed.Session();
      session.once('session-available', function() {
        session.requestNextPlay();
      });
      
      var startCount = 0;
      session.on('next-play-available', function() {
        startCount++;

        if (startCount === 1) {
          // start playback of first incoming play
          session.playStarted();

        } // don't care about subsequent plays at the moment
      });

      var currentCount = 0;
      session.on('current-play-did-change', function() {
        currentCount++;

        if (currentCount === 1) {
          assert.isNotNull(session.currentPlay, 'should have a current play now');

          setTimeout(function() {
            // ask to skip this song
            session.requestSkip();
          }, 10);

        } else if (currentCount === 2) {
          // after the first play is skipped, currentPlay will be set to null
          assert.isNull(session.currentPlay, 'should clear out current play upon successful skip');

          done();

        } else {
          assert.fail('should not have changed current play again');

        }

      });

      session.setCredentials('x', 'y');
    });

    it('will mark a skip as due to a dislike', function(done) {
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

      server.respondWith('POST', /https:\/\/feed.fm\/api\/v2\/play\/\d+\/skip/, function(response) {
        assert.match(response.requestBody, new RegExp('dislike=true'), 'request should be reported as due to a dislike');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          success: true
        }));
      });

      var session = new Feed.Session();
      session.once('session-available', function() {
        session.requestNextPlay();
      });
      
      var startCount = 0;
      session.on('next-play-available', function() {
        startCount++;

        if (startCount === 1) {
          // start playback of first incoming play
          session.playStarted();

        } // don't care about subsequent plays at the moment
      });

      var currentCount = 0;
      session.on('current-play-did-change', function() {
        currentCount++;

        if (currentCount === 1) {
          assert.isNotNull(session.currentPlay, 'should have a current play now');

          setTimeout(function() {
            // ask to skip this song and attribute it to a dislike
            session.requestSkip(true);
          }, 10);

        } else if (currentCount === 2) {
          // after the first play is skipped, currentPlay will be set to null
          assert.isNull(session.currentPlay, 'should clear out current play upon successful skip');

          done();

        } else {
          assert.fail('should not have changed current play again');

        }

      });

      session.setCredentials('x', 'y');
    });

    it('will not update currentPlay when the current song may not be skipped, but it will change skip status', function(done) {
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
          can_skip: true  // when we got the song, a skip was ok
        }));
      });

      server.respondWith('POST', /https:\/\/feed.fm\/api\/v2\/play\/\d+\/skip/, function(response) {
      console.log('responding to post');
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          success: false, // no skippy
          error: {
            code: 9,
            message: 'no more skips!',
            status: 500
          }
        }));
      });

      var session = new Feed.Session();
      session.once('session-available', function() {
        session.requestNextPlay();
      });
      
      var startCount = 0;
      session.on('next-play-available', function() {
        startCount++;

        if (startCount === 1) {
          // start playback of first incoming play
          session.playStarted();

        } // don't care about subsequent plays at the moment
      });

      var currentCount = 0;
      session.on('current-play-did-change', function() {
        currentCount++;

        if (currentCount === 1) {
          assert.isNotNull(session.currentPlay, 'should have a current play now');

          setTimeout(function() {
            // ask to skip this song
            session.requestSkip();
          }, 10);

        } else {
          assert.fail('when the skip fails, the currentPlay should not be updated');
        }

      });

      var skipChangeCount = 0;
      session.on('skip-status-did-change', function() {
        skipChangeCount++;

        // first change is canSkip value going from initial value of false to true (from start)
        // second change is canSkip value going from true to false

        if (skipChangeCount === 2) {
          assert.isFalse(session.canSkip, 'user may not skip!');
          done();
        }
      });

      session.setCredentials('x', 'y');
    });


    it('will set the next play to null and request a new play when the next play is rejected', function(done) {
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

      server.respondWith('POST', /https:\/\/feed.fm\/api\/v2\/play\/\d+\/invalid/, function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          success: true
        }));
      });

      var session = new Feed.Session();
      session.once('session-available', function() {
        session.requestNextPlay();
      });
      
      var startCount = 0;
      session.on('next-play-available', function() {
        startCount++;

        if (startCount === 1) {
          // reject this song - we can't play it
          session.rejectPlay();

        } else if (startCount === 2) {
          // we rejected the first play and got a new one - win!
          assert.isNull(session.currentPlay);
          assert.isNotNull(session.nextPlay);

          done();
        }
      });

      session.setCredentials('x', 'y');
    });

    it('will swallow a \'play already started\' error', function(done) {
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
        response.respond(403, { 'Content-Type': 'application/json' }, JSON.stringify({
          success: false,
          error: {
            code: 20,
            message: 'Playback already started!',
            status: 403
          }
        }));
      });

      var session = new Feed.Session();
      session.once('session-available', function() {
        session.requestNextPlay();
      });

      session.once('next-play-available', function(nextPlay) {
        assert.isNotNull(nextPlay);

        session.playStarted();
      });

      session.once('current-play-did-change', function(nowPlaying) {
        assert.isNotNull(nowPlaying, 'should have swallowed the start error');

        done();
      });

      session.setCredentials('x', 'y');
    });

    it('will allow us to report elapsed playback time', function(done) {
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

      server.respondWith('POST', /https:\/\/feed.fm\/api\/v2\/play\/\d+\/elapse/, function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          success: true
        }));

        // this is what we wanted!
        done();
      });

      var session = new Feed.Session();
      session.once('session-available', function() {
        session.requestNextPlay();
      });
      
      session.once('next-play-available', function() {
        // start playback of first incoming play
        session.playStarted();
      });

      var elapsed = Math.floor(Math.random() * 1000);

      session.once('current-play-did-change', function() {
        assert.isNotNull(session.currentPlay, 'should have a current play now');

        // report this play as completed
        session.updatePlay(elapsed);
      });

      session.setCredentials('x', 'y');
    });

    it('will emit unexpected-error when all play attempts fail', function(done) {
      this.timeout(5000);
      server.autoRespond = true;

      server.respondWith('POST', 'https://feed.fm/api/v2/session', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
      });

      var requestCount = 0;
      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(response) {
        requestCount++;

        // all responses are bad
        response.respond(500, { 'Content-Type': 'text/html' }, 'not a good response!');
      });

      var session = new Feed.Session();
      session.once('session-available', function() {
        session.requestNextPlay();
      });

      session.on('all', function() {
        console.log('event ', arguments);
      });

      session.once('unexpected-error', function(err) {
        assert.isNotNull(err);

        done();
      });

      session.setCredentials('x', 'y');
    });

    it('will request a specific audio file', function(done) {
      server.autoRespond = true;

      var sr = validSessionResponse();

      server.respondWith('POST', 'https://feed.fm/api/v2/session', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(sr));
      });

      var afId = sr.stations[1].audio_files[0].id;
      var af = new Feed.AudioFile({ id: afId });

      var plays = [];
      var requests = [];

      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(xhr) {
        requests.push(xhr);

        var play = validPlayResponse();
        plays.push(play);

        xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(play));
      });

      var session = new Feed.Session();
      session.once('session-available', function() {
        session.requestPlay(af.id);
      });

      session.once('next-play-available', function() {
        // make sure the play request included the audio file id
        assert(requests.length > 0, 'should be at least one request');
        assert.match(requests[0].requestBody, new RegExp('audio_file_id=' + afId), 'request should include audio file id');

        done();
      });

      session.setCredentials('x', 'y');
    });

    it('will cancel current and next plays before getting specific audio file', function(done) {
      server.autoRespond = true;

      var sr = validSessionResponse();

      server.respondWith('POST', 'https://feed.fm/api/v2/session', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(sr));
      });

      var afId = sr.stations[1].audio_files[0].id;
      var af = new Feed.AudioFile({ id: afId });

      var plays = [];
      var requests = [];

      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(xhr) {
        requests.push(xhr);

        var play = validPlayResponse();
        plays.push(play);

        xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(play));
      });

      server.respondWith('POST', /https:\/\/feed.fm\/api\/v2\/play\/\d+\/start/, function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          success: true,
          can_skip: false
        }));
      });

      var session = new Feed.Session();
      session.once('session-available', function() {
        // get nextPlay
        session.requestNextPlay();
      });

      var currentPlayRemoved = false;
      session.on('current-play-did-change', function(currentPlay) {
        if (currentPlay === null) {
          currentPlayRemoved = true;
        }
      });

      var nextPlayDiscarded = false;
      session.on('discard-next-play', function() {
        nextPlayDiscarded = true;
      });

      var nextPlays = [];
      session.on('next-play-available', function(nextPlay) {
        nextPlays.push(nextPlay);

        if (nextPlays.length === 1) {
          session.playStarted();

        } else if (nextPlays.length === 2) {
          // we've now got a currentPlay and a nextPlay
          session.requestPlay(af.id);
          
        } else if (nextPlays.length === 3) {
          assert(nextPlayDiscarded);
          assert(currentPlayRemoved);
          assert.isNull(session.currentPlay);
          assert.match(requests[2].requestBody, new RegExp('audio_file_id=' + afId), 'final request should include audio file id');

          done();
  
        }
      });

/*
        // make sure the play request included the audio file id
        assert(requests.length > 0, 'should be at least one request');
        assert.match(requests[0].requestBody, /audio_file_id=af\+1/, 'request should include audio file id');

        done();
      });
      */

      session.setCredentials('x', 'y');
    });

    it('after a play is started, we can like it', function(done) {
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

      var like = /https:\/\/feed.fm\/api\/v2\/play\/(\d+)\/like/;
      server.respondWith('POST', like, function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          success: true
        }));

        var match = like.exec(response.url);

        assert.equal(match[1], plays[0].play.id, 'play should be current one');
        done();
      });

      var session = new Feed.Session();
      session.once('session-available', function() {
        session.requestNextPlay();
      });
      
      var startCount = 0;
      session.on('next-play-available', function() {
        startCount++;

        if (startCount <= 1) {
          session.playStarted();

        }
      });

      session.on('current-play-did-change', function() {
        session.requestLike();
      });

      session.setCredentials('x', 'y');
    });

    it('we can like a random play id', function(done) {
      server.autoRespond = true;

      var playId = '123123';

      server.respondWith('POST', 'https://feed.fm/api/v2/session', function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
      });

      var like = /https:\/\/feed.fm\/api\/v2\/play\/(\d+)\/like/;
      server.respondWith('POST', like, function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          success: true
        }));

        var match = like.exec(response.url);

        assert.equal(match[1], playId, 'play should be requested one');
        done();
      });

      var session = new Feed.Session();
      session.once('session-available', function() {
        session.requestLike(playId);
      });
      
      session.setCredentials('x', 'y');
    });

    it('after a play is started, we can dislike it', function(done) {
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

      var like = /https:\/\/feed.fm\/api\/v2\/play\/(\d+)\/dislike/;
      server.respondWith('POST', like, function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          success: true
        }));

        var match = like.exec(response.url);

        assert.equal(match[1], plays[0].play.id, 'play should be current one');
        done();
      });

      var session = new Feed.Session();
      session.once('session-available', function() {
        session.requestNextPlay();
      });
      
      var startCount = 0;
      session.on('next-play-available', function() {
        startCount++;

        if (startCount <= 1) {
          session.playStarted();

        }
      });

      session.on('current-play-did-change', function() {
        session.requestDislike();
      });

      session.setCredentials('x', 'y');
    });

    it('after a play is started, we can unlike it', function(done) {
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

      var like = /https:\/\/feed.fm\/api\/v2\/play\/(\d+)\/like/;
      server.respondWith('DELETE', like, function(response) {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          success: true
        }));

        var match = like.exec(response.url);

        assert.equal(match[1], plays[0].play.id, 'play should be current one');
        done();
      });

      var session = new Feed.Session();
      session.once('session-available', function() {
        session.requestNextPlay();
      });
      
      var startCount = 0;
      session.on('next-play-available', function() {
        startCount++;

        if (startCount <= 1) {
          session.playStarted();

        }
      });

      session.on('current-play-did-change', function() {
        session.requestUnlike();
      });

      session.setCredentials('x', 'y');
    });

    var counter = 0;
    function validPlayResponse(id) {
      if (!id) { id = counter++; }

      var station = validStation(0);

      return {
        'success': true,
        'play': {
          'id': '' + id,
          'station': station,
          'audio_file': validAudioFile(id)
        }
      };
    }

    function validStation(id, audioFiles) {
      var station = {
        'id': 'station ' + id,
        'name': 'station name ' + id
      };

      if (audioFiles) {
        station.audio_files = audioFiles;
        station.on_demand = true;
      }

      return station;
    }

    function validAudioFile(id) {
      return {
        'id': '' + id,
        'duration_in_seconds': '300',
        'track': {
            'id': 'track id for af ' + id,
            'title': 'track for af ' + id
        },
        'release': {
            'id': 'release id for af ' + id,
            'title': 'release for af ' + id
        },
        'artist': {
            'id': 'artist id for af ' + id,
            'name': 'artist for af ' + id
        },
        'codec': 'aac',
        'bitrate': '128',
        'url': 'https://feed.fm/audiofile-' + id + '.aac'
      };
    }

    function validSessionResponse() {
      var odStation = validStation('od-station', [
        validAudioFile(0),
        validAudioFile(1),
        validAudioFile(2)
      ]);

      return {
        success: true, 
        session: {
          available: true,
          client_id: 'client id',
          timestamp: Math.floor(Date.now() / 1000)
        },
        placement: {
          id: 'placement-id'
        },
        stations: [
          { id: 'first-station', name: 'first station' },
          odStation
        ]
      };
    }
  });
})();
