/*global it:false describe:false, player:false, chai:false */

/* 
  assume there's a global Feed.Player instance that has had its
  'initializeAudio()' method called in respond to a user tap.
*/

let initializeAudio = require('./initialize-audio');

let expect = chai.expect;

window.interactiveStart = function() {
  initializeAudio();
};

describe('Feed.Player integration tests', function () {

  var server;

  beforeEach(function () {
    server = sinon.createFakeServer();

    server.respondWith(function (request) {
      console.log('REQUEST: ' + request.method + ' ' + request.url, request);
    });

    Feed.Session.prototype._getClientId = () => Promise.resolve('cookie-value');
  });

  afterEach(function () {
    server.restore();

    Feed.Session.prototype._deleteStoredCid();
  });

  it('will be "idle" before and after a tune call', async function () {
    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('GET', /placement/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
    });
    var playResponse = validPlayResponse();

    server.respondWith('POST', /play$/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    var spy = sinon.spy(player, 'trigger');

    expect(player.getCurrentState()).to.equal('idle');

    player.tune();

    await new Promise((resolve) => {
      player.on('play-active', resolve);
    });

    expect(spy.callCount).to.equal(5);
    expect(spy.getCall(0).calledWith('placement-changed'), 'placement-changed').to.be.true;
    expect(spy.getCall(1).calledWith('placement'), 'placement').to.be.true;
    expect(spy.getCall(2).calledWith('station-changed'), 'station-changed').to.be.true;
    expect(spy.getCall(3).calledWith('stations'), 'stations').to.be.true;
    expect(spy.getCall(4).calledWith('play-active'), 'play-active').to.be.true;

    expect(player.getActivePlay()).to.deep.equal(playResponse.play);

    expect(player.getCurrentState()).to.equal('idle');
  });

  it('will be "idle" until the first song starts, then it will be "playing" after the song starts', async function () {
    this.timeout(10000);

    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('GET', /placement/, function (response) {
      console.log('placement handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
    });

    var playResponses = [];

    server.respondWith('POST', /play$/, function (response) {
      var playResponse = validPlayResponse();
      playResponses.push(playResponse);

      console.log('play handler returning play ' + playResponse.play.id);

      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
    });

    server.respondWith('POST', /start$/, function (response) {
      console.log('start handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    })

    server.respondWith('POST', /elapse$/, function (response) {
      console.log('elapse handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    var spy = sinon.spy(player, 'trigger');

    player.play();

    expect(player.getCurrentState()).to.equal('idle');

    player.on('all', (event) => console.log('player event:', event));

    await new Promise((resolve) => {
      player.on('play-started',  resolve);
    });
    
    expect(player.getCurrentState()).to.equal('playing');

    player.stop();
  });

  it('will be "idle" between the end of one song and the starting of the next song', async function () {
    this.timeout(10000);

    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('GET', /placement/, function (response) {
      console.log('placement handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
    });

    var playResponses = [];

    server.respondWith('POST', /play$/, function (response) {
      var playResponse = validPlayResponse();

      playResponse.play.audio_file.url = 'https://feedfm-audio.s3.amazonaws.com/1409893532-94744.m4a';
      playResponses.push(playResponse);

      console.log('play handler returning play ' + playResponse.play.id);

      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
    });

    server.respondWith('POST', /start$/, function (response) {
      console.log('start handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    })

    server.respondWith('POST', /complete$/, function (response) {
      console.log('complete handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    })

    server.respondWith('POST', /elapse$/, function (response) {
      console.log('elapse handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    var spy = sinon.spy(player, 'trigger');

    player.play();

    expect(player.getCurrentState()).to.equal('idle');

    player.on('all', (event) => console.log('player event:', event));

    await new Promise((resolve) => {
      player.once('play-started', resolve);
    });

    expect(player.getCurrentState()).to.equal('playing');

    await new Promise((resolve) => {
      player.once('play-completed', resolve);
    });

    expect(player.getCurrentState()).to.equal('idle');

    await new Promise((resolve) => {
      player.once('play-started', resolve);
    });

    expect(player.getCurrentState()).to.equal('playing');

    player.stop();
  });

  it('will be "idle" while a play becomes active, before the play starts', async function () {
    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('GET', /placement/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
    });
    var playResponse = validPlayResponse();

    server.respondWith('POST', /play$/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    var spy = sinon.spy(player, 'trigger');

    expect(player.getCurrentState()).to.equal('idle');

    player.play();

    player.on('all', (event) => console.log('player event:', event));

    await new Promise((resolve) => {
      player.on('play-active', resolve);
    });

    expect(spy.callCount).to.equal(5);
    expect(spy.getCall(0).calledWith('placement-changed'), 'placement-changed').to.be.true;
    expect(spy.getCall(1).calledWith('placement'), 'placement').to.be.true;
    expect(spy.getCall(2).calledWith('station-changed'), 'station-changed').to.be.true;
    expect(spy.getCall(3).calledWith('stations'), 'stations').to.be.true;
    expect(spy.getCall(4).calledWith('play-active'), 'play-active').to.be.true;

    expect(player.getActivePlay()).to.deep.equal(playResponse.play);

    expect(player.getCurrentState()).to.equal('idle');

    player.stop();
  });

  it('will continue to be "playing" when changing a station during playback', async function () {
    this.timeout(10000);

    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('GET', /placement/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
    });
    var playResponse = validPlayResponse();

    server.respondWith('POST', /play$/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
    });

    server.respondWith('POST', /start$/, function (response) {
      console.log('start handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    var spy = sinon.spy(player, 'trigger');

    player.play();

    player.on('all', (event) => console.log('player event:', event));

    await new Promise((resolve) => {
      player.once('play-started', () => { setTimeout(resolve, 1000); });
    });

    player.setStationId(STATION_TWO_ID);

    await new Promise((resolve) => {
      player.once('play-started', () => { setTimeout(resolve, 1000); });
    });
    
    expect(player.getCurrentState()).to.equal('playing');

    player.stop();
  });

  it('will not trigger elapse call after calling stop while we have an active play', async function () {
    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('GET', /placement/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
    });
    var playResponse = validPlayResponse();

    server.respondWith('POST', /play$/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
    });

    server.respondWith('POST', /elapse$/, function(response) {
      console.log('BAD ELAPSE!');
      throw new Error('should not elapse the unstarted play!');
    })

    var player = new Feed.Player('demo', 'demo', { debug: true });
    var spy = sinon.spy(player, 'trigger');

    player.tune();

    await new Promise((resolve) => {
      player.on('play-active', resolve);
    });

    player.stop();

    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    })
  });

  it('will send out specific events from initialization to start of playback', async function () {
    this.timeout(4000);

    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('GET', /placement/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
    });
    var playResponse = validPlayResponse();

    server.respondWith('POST', /play$/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
    });

    server.respondWith('POST', /start$/, function (response) {
      console.log('start handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    });

    server.respondWith(function (request) {
      console.log('default response with request', request);
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    var spy = sinon.spy(player, 'trigger');

    player.play();

    player.on('all', (event) => console.log('player event:', event));

    await new Promise((resolve) => {
      player.on('play-started', () => { setTimeout(resolve, 2000) });
    });

    expect(spy.callCount).to.equal(6);
    expect(spy.getCall(0).calledWith('placement-changed'), 'placement-changed').to.be.true;
    expect(spy.getCall(1).calledWith('placement'), 'placement').to.be.true;
    expect(spy.getCall(2).calledWith('station-changed'), 'station-changed').to.be.true;
    expect(spy.getCall(3).calledWith('stations'), 'stations').to.be.true;
    expect(spy.getCall(4).calledWith('play-active'), 'play-active').to.be.true;
    expect(spy.getCall(5).calledWith('play-started'), 'play-started').to.be.true;

    expect(player.getActivePlay()).to.deep.equal(playResponse.play);

    //expect(player.getCurrentState()).to.equal('playing');

    player.stop();
  });

  it('will be in the idle state after calling stop', async function () {
    this.timeout(10000);

    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('GET', /placement/, function (response) {
      console.log('placement handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
    });

    var playResponses = [];

    server.respondWith('POST', /play$/, function (response) {
      var playResponse = validPlayResponse();
      playResponses.push(playResponse);

      console.log('play handler returning play ' + playResponse.play.id);

      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
    });

    server.respondWith('POST', /start$/, function (response) {
      console.log('start handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    })

    server.respondWith('POST', /elapse$/, function (response) {
      console.log('elapse handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    var spy = sinon.spy(player, 'trigger');

    player.play();

    player.on('all', (event) => console.log('player event:', event));

    await new Promise((resolve) => {
      player.on('play-started', () => { setTimeout(resolve, 2000) });
    });

    player.stop();
    
    expect(player.getCurrentState()).to.equal('idle');
  });

  it('will not emit play-completed when we advance past a play we have have not started', async function () {
    this.timeout(4000);

    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('GET', /placement/, function (response) {
      console.log('placement handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
    });

    var playResponses = [];

    server.respondWith('POST', /play$/, function (response) {
      var playResponse = validPlayResponse();
      playResponses.push(playResponse);

      console.log('play handler returning play ' + playResponse.play.id);

      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
    });

    server.respondWith('POST', /start$/, function (response) {
      console.log('start handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    })

    server.respondWith('POST', /elapse$/, function (response) {
      console.log('elapse handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    var spy = sinon.spy(player, 'trigger');


    player.on('all', (event) => console.log('player event:', event));

    player.on('play-completed', () => {
      console.error('completed a play???');
      throw new Error('should not have completed play!');
    });

    player.tune();
    // wait for song to be active
    await new Promise((resolve) => {
      player.once('play-active', () => { setTimeout(resolve, 1000) });
    });

    // change the station
    player.setStationId(STATION_TWO_ID);

    await new Promise((resolve) => {
      player.once('play-active', () => { setTimeout(resolve, 1000) });
    });

    expect(player.getCurrentState()).to.equal('idle');
  });

  it('will not request a "start" on a play even after a tune()', async function () {
    this.timeout(5000);

    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('GET', /placement/, function (response) {
      console.log('placement handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
    });

    var playResponses = [];

    server.respondWith('POST', /play$/, function (response) {
      var playResponse = validPlayResponse();
      playResponses.push(playResponse);

      console.log('play handler returning play ' + playResponse.play.id);
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
    });

    server.respondWith('POST', /start$/, function (response) {
      console.log('play start handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    })

    server.respondWith('POST', /invalidate$/, function (response) {
      throw new Error('invalidate called!');
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    var spy = sinon.spy(player, 'trigger');

    player.on('all', (event) => console.log('player event:', event));

    player.tune();
    console.log('player tuned');

    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });

    console.log('calling play');
    player.play();
    console.log('play called!');
    console.log('setting station');
    player.setStationId(STATION_TWO_ID);
    player.play();
    console.log('did station change');

    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });

    player.stop();

    /*
    // wait for song to be active
    await new Promise((resolve) => {
      player.once('play-active', () => { setTimeout(resolve, 1000) });
    });

    // change the station
    player.setStationId(STATION_TWO_ID);

    await new Promise((resolve) => {
      player.once('play-active', () => { setTimeout(resolve, 1000) });
    });

    expect(player.getCurrentState()).to.equal('idle');
    */
  });



  it('will retry failed play creation calls', async function() {
    this.timeout(4000);

    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('GET', /placement/, function (response) {
      console.log('placement handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
    });

    var playResponses = [];

    server.respondWith('POST', /play$/, function (response) {
      if (playResponses.length === 0) {
        playResponses.push('error!');

        response.respond(500, { 'Content-Type': 'text/plain' }, 'No server!');
        return;

      } else {
        var playResponse = validPlayResponse();
        playResponses.push(playResponse);

        console.log('play handler returning play ' + playResponse.play.id);

        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
      }
    });

    server.respondWith('POST', /start$/, function (response) {
      console.log('start handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    })

    server.respondWith('POST', /elapse$/, function (response) {
      console.log('elapse handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    var spy = sinon.spy(player, 'trigger');

    player.play();

    player.on('all', (event) => console.log('player event:', event));

    await new Promise((resolve) => {
      player.on('play-started', () => { setTimeout(resolve, 2000) });
    });

    player.stop();

    expect(player.getCurrentState()).to.equal('idle');    
  });

  it('will retry play requests multiple times', async function () {
    this.timeout(10000);

    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('GET', /placement/, function (response) {
      console.log('placement handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
    });

    var playResponses = [];

    server.respondWith('POST', /play$/, function (response) {
      if (playResponses.length < 4) {
        playResponses.push('error!');

        response.respond(500, { 'Content-Type': 'text/plain' }, 'No server!');
        return;

      } else {
        var playResponse = validPlayResponse();
        playResponses.push(playResponse);

        console.log('play handler returning play ' + playResponse.play.id);

        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
      }
    });

    server.respondWith('POST', /start$/, function (response) {
      console.log('start handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    })

    server.respondWith('POST', /elapse$/, function (response) {
      console.log('elapse handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    var spy = sinon.spy(player, 'trigger');

    player.play();

    player.on('all', (event) => console.log('player event:', event));

    await new Promise((resolve) => {
      player.once('play-started', () => { setTimeout(resolve, 1000) });
    });

    player.stop();

    expect(player.getCurrentState()).to.equal('idle');
  });

  it('will retry preparing play requests multiple times', async function () {
    this.timeout(10000);

    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('GET', /placement/, function (response) {
      console.log('placement handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
    });

    var playResponses = [];

    server.respondWith('POST', /play$/, function (response) {
      // succeed on the first request, then fail on the next 3, then succeed
      if ((playResponses.length > 0) && (playResponses.length < 4)) {
        playResponses.push('error!');

        response.respond(500, { 'Content-Type': 'text/plain' }, 'No server!');
        return;

      } else {
        var playResponse = validPlayResponse();
        playResponses.push(playResponse);

        console.log('play handler returning play ' + playResponse.play.id);

        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
      }
    });

    server.respondWith('POST', /start$/, function (response) {
      console.log('start handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    })

    server.respondWith('POST', /elapse$/, function (response) {
      console.log('elapse handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    var spy = sinon.spy(player, 'trigger');

    player.play();

    player.on('all', (event) => console.log('player event:', event));

    await new Promise((resolve) => {
      player.once('play-started', () => { setTimeout(resolve, 5000) });
    });

    // 5 seconds have passed since the first song started, so we should have prepared
    // the next play by now
    expect(playResponses.length).to.equal(5);

    player.stop();
  });

  it('will silently invalidate plays that do not play, and will retry and start the next play', async function () {
    this.timeout(20000);

    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('GET', /placement/, function (response) {
      console.log('placement handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
    });

    var playResponses = [];

    server.respondWith('POST', /play$/, function (response) {
      var playResponse = validPlayResponse();

      if (playResponses.length < 1) {
        // first play really won't work
        playResponse.play.audio_file.url = 'https://feed.fm';
      }

      playResponses.push(playResponse);
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
    });

    server.respondWith('POST', /start$/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    })

    server.respondWith('POST', /elapse$/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    });

    server.respondWith('POST', /invalidate$/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    var spy = sinon.spy(player, 'trigger');

    player.play();

    player.on('all', (event) => console.log('player event:', event));

    // play should start
    await new Promise((resolve) => {
      player.once('play-started', () => setTimeout(resolve, 500));
    });
    
    player.stop();
  });


  it('will retry the play start event if it fails', async function () {
    this.timeout(8000);

    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('GET', /placement/, function (response) {
      console.log('placement handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
    });

    var playResponses = [];

    server.respondWith('POST', /play$/, function (response) {
      var playResponse = validPlayResponse();
      playResponses.push(playResponse);
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
    });

    let startCount = 0;
    server.respondWith('POST', /start$/, function (response) {
      if (startCount < 1) {
        response.respond(500, { 'Content-Type': 'text/plain' }, 'Well, that did not work');
      } else {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
      }
    })

    server.respondWith('POST', /elapse$/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    var spy = sinon.spy(player, 'trigger');

    player.play();

    player.on('all', (event) => console.log('player event:', event));

    // play should start
    await new Promise((resolve) => {
      player.once('play-started', () => setTimeout(resolve, 500));
    });

    player.stop();
  })


  it('will gracefully handle sequential play calls', async function () {
    this.timeout(8000);

    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('GET', /placement/, function (response) {
      console.log('placement handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
    });

    var playResponses = [];

    server.respondWith('POST', /play$/, function (response) {
      var playResponse = validPlayResponse();
      playResponses.push(playResponse);
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
    });

    let startCount = 0;
    server.respondWith('POST', /start$/, function (response) {
      if (startCount < 1) {
        response.respond(500, { 'Content-Type': 'text/plain' }, 'Well, that did not work');
      } else {
        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
      }
    })

    server.respondWith('POST', /elapse$/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    var spy = sinon.spy(player, 'trigger');

    player.tune();

    player.on('all', (event) => console.log('player event:', event));

    // wait for play to be available
    await new Promise((resolve) => {
      player.once('play-active', resolve);
    });

    let startedCount = 0;
    player.on('play-started', (play) => {
      startedCount++;

      expect(startedCount).to.below(2);
    });

    // call play twice in a row
    player.play();
    player.play();

    await new Promise((resolve) => {
      setTimeout(resolve, 3000);
    })

    player.stop();
  })
});

function newSessionWithClientAndCredentials() {
  var session = new Feed.Session();

  session._getClientId = () => Promise.resolve('cookie-value');
  
  session.setCredentials('x', 'y');

  return session;
}

const urls = [
  'https://dgase5ckewowv.cloudfront.net/feedfm-audio/1543381635-50459.mp3',
  'https://dgase5ckewowv.cloudfront.net/feedfm-audio/1563964895-88514.mp3'
];

var counter = 0
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
          'title': 'Brass Monkey'
        },
        'release': {
          'id': '1483477',
          'title': 'Licensed to Ill'
        },
        'artist': {
          'id': '766824',
          'name': 'Beastie Boys'
        },
        'codec': 'mp3',
        'bitrate': '128',
        'url': urls[counter % urls.length]
      }
    }
  };
}

const STATION_ONE_ID = '222';
const STATION_TWO_ID = '333';

function validPlacementResponse() {
  return {
    success: true,

    placement: {
      id: '1234',
      name: 'Test station'
    },
    stations: [
      { id: STATION_ONE_ID, name: 'Station 1' },
      { id: STATION_TWO_ID, name: 'Station 2' }
    ]
  };
}