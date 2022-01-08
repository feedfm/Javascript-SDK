/*global it:false describe:false, chai:false, beforeEach:false, afterEach:false, sinon:false, require:false, Feed:false */

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

    server.respondWith('GET', /feedfm-audio/, function (response) {
      console.log('retrieving song');
      
      response.responseType = 'arraybuffer';
      response.respond(200, { 'Content-Type': 'audio/mpeg' }, SILENT_MP3_ARRAY);
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

    server.respondWith('POST', /session/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
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

    expect(spy.getCall(0).calledWith('placement'), 'placement').to.be.true;
    expect(spy.getCall(1).calledWith('station-changed'), 'station-changed').to.be.true;
    expect(spy.getCall(2).calledWith('stations'), 'stations').to.be.true;
    expect(spy.getCall(3).calledWith('play-active'), 'play-active').to.be.true;
    expect(spy.callCount).to.equal(4);

    expect(player.getActivePlay()).to.deep.equal(playResponse.play);

    expect(player.getCurrentState()).to.equal('idle');
  });

  it('will be "idle" until the first song starts, then it will be "playing" after the song starts', async function () {
    this.timeout(10000);

    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('POST', /session/, function (response) {
      console.log('placement handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
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
    });

    server.respondWith('POST', /elapse$/, function (response) {
      console.log('elapse handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    sinon.spy(player, 'trigger');

    player.play();

    expect(player.getCurrentState()).to.equal('idle');

    player.on('all', (event) => console.log('player event:', event));

    await new Promise((resolve) => {
      player.on('play-started',  resolve);
    });
    
    expect(player.getCurrentState()).to.equal('playing');

    player.stop();
  });



  it('will fire a no-music-available event when out of the US', async function () {
    this.timeout(10000);

    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('POST', /session/, function (response) {
      console.log('placement handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ 
        success: true,
        session: {
          available: false,
          client_id: '123',
          message: 'Sorry, there is no music available for your client',
          time: 123123123
        }
      }));
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });

    player.tune();

    await new Promise((resolve) => {
      player.once('music-unavailable', resolve);
    });
  });

  it('will be "idle" between the end of one song and the starting of the next song', async function () {
    this.timeout(10000);

    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('POST', /session/, function (response) {
      console.log('placement handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
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
    });

    server.respondWith('POST', /complete$/, function (response) {
      console.log('complete handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    });

    server.respondWith('POST', /elapse$/, function (response) {
      console.log('elapse handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    sinon.spy(player, 'trigger');

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

    server.respondWith('POST', /session/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
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

    expect(spy.getCall(0).calledWith('placement'), 'placement').to.be.true;
    expect(spy.getCall(1).calledWith('station-changed'), 'station-changed').to.be.true;
    expect(spy.getCall(2).calledWith('stations'), 'stations').to.be.true;
    expect(spy.getCall(3).calledWith('play-active'), 'play-active').to.be.true;
    expect(spy.callCount).to.equal(4);

    expect(player.getActivePlay()).to.deep.equal(playResponse.play);

    expect(player.getCurrentState()).to.equal('idle');

    player.stop();
  });

  it('will continue to be "playing" when changing a station during playback', async function () {
    this.timeout(10000);

    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('POST', /session/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
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
    sinon.spy(player, 'trigger');

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

    server.respondWith('POST', /session/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
    });
    var playResponse = validPlayResponse();

    server.respondWith('POST', /play$/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
    });

    server.respondWith('POST', /elapse$/, function() {
      console.log('BAD ELAPSE!');
      throw new Error('should not elapse the unstarted play!');
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    sinon.spy(player, 'trigger');

    player.tune();

    await new Promise((resolve) => {
      player.on('play-active', resolve);
    });

    player.stop();

    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  });

  it('will send out specific events from initialization to start of playback', async function () {
    this.timeout(4000);

    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('POST', /session/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
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
      player.on('play-started', () => { setTimeout(resolve, 2000); });
    });

    expect(spy.getCall(0).calledWith('placement'), 'placement').to.be.true;
    expect(spy.getCall(1).calledWith('station-changed'), 'station-changed').to.be.true;
    expect(spy.getCall(2).calledWith('stations'), 'stations').to.be.true;
    expect(spy.getCall(3).calledWith('play-active'), 'play-active').to.be.true;
    expect(spy.getCall(4).calledWith('play-started'), 'play-started').to.be.true;
    expect(spy.callCount).to.equal(5);

    expect(player.getActivePlay()).to.deep.equal(playResponse.play);

    //expect(player.getCurrentState()).to.equal('playing');

    player.stop();
  });

  it('will be in the idle state after calling stop', async function () {
    this.timeout(10000);

    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('POST', /session/, function (response) {
      console.log('placement handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
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
    });

    server.respondWith('POST', /elapse$/, function (response) {
      console.log('elapse handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    sinon.spy(player, 'trigger');

    player.play();

    player.on('all', (event) => console.log('player event:', event));

    await new Promise((resolve) => {
      player.on('play-started', () => { setTimeout(resolve, 2000); });
    });

    player.stop();
    
    expect(player.getCurrentState()).to.equal('idle');
  });

  it('will not emit play-completed when we advance past a play we have have not started', async function () {
    this.timeout(4000);

    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('POST', /session/, function (response) {
      console.log('placement handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
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
    });

    server.respondWith('POST', /elapse$/, function (response) {
      console.log('elapse handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    sinon.spy(player, 'trigger');


    player.on('all', (event) => console.log('player event:', event));

    player.on('play-completed', () => {
      throw new Error('should not have completed play!');
    });

    player.tune();
    // wait for song to be active
    await new Promise((resolve) => {
      player.once('play-active', () => { setTimeout(resolve, 1000); });
    });

    // change the station
    player.setStationId(STATION_TWO_ID);

    await new Promise((resolve) => {
      player.once('play-active', () => { setTimeout(resolve, 1000); });
    });

    expect(player.getCurrentState()).to.equal('idle');
  });

  it('will not request a "start" on a play even after a tune()', async function () {
    this.timeout(5000);

    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('POST', /session/, function (response) {
      console.log('placement handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
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
    });

    server.respondWith('POST', /invalidate$/, function () {
      throw new Error('invalidate called!');
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    sinon.spy(player, 'trigger');

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

    server.respondWith('POST', /session/, function (response) {
      console.log('placement handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
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
    });

    server.respondWith('POST', /elapse$/, function (response) {
      console.log('elapse handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    sinon.spy(player, 'trigger');

    player.play();

    player.on('all', (event) => console.log('player event:', event));

    await new Promise((resolve) => {
      player.on('play-started', () => { setTimeout(resolve, 2000); });
    });

    player.stop();

    expect(player.getCurrentState()).to.equal('idle');    
  });

  it('will retry play requests multiple times', async function () {
    this.timeout(10000);

    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('POST', /session/, function (response) {
      console.log('placement handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
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
    });

    server.respondWith('POST', /elapse$/, function (response) {
      console.log('elapse handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    sinon.spy(player, 'trigger');

    player.play();

    player.on('all', (event) => console.log('player event:', event));

    await new Promise((resolve) => {
      player.once('play-started', () => { setTimeout(resolve, 1000); });
    });

    player.stop();

    expect(player.getCurrentState()).to.equal('idle');
  });

  it('will retry preparing play requests multiple times', async function () {
    this.timeout(10000);

    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('POST', /session/, function (response) {
      console.log('placement handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
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
    });

    server.respondWith('POST', /elapse$/, function (response) {
      console.log('elapse handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    sinon.spy(player, 'trigger');

    player.play();

    player.on('all', (event) => console.log('player event:', event));

    await new Promise((resolve) => {
      player.once('play-started', () => { setTimeout(resolve, 5000); });
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

    server.respondWith('POST', /session/, function (response) {
      console.log('placement handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
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
    });

    server.respondWith('POST', /elapse$/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    });

    server.respondWith('POST', /invalidate$/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    sinon.spy(player, 'trigger');

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

    server.respondWith('POST', /session/, function (response) {
      console.log('placement handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
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
    });

    server.respondWith('POST', /elapse$/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    sinon.spy(player, 'trigger');

    player.play();

    player.on('all', (event) => console.log('player event:', event));

    // play should start
    await new Promise((resolve) => {
      player.once('play-started', () => setTimeout(resolve, 500));
    });

    player.stop();
  });


  it('will gracefully handle sequential play calls', async function () {
    this.timeout(8000);

    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('POST', /session/, function (response) {
      console.log('placement handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
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
    });

    server.respondWith('POST', /elapse$/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    sinon.spy(player, 'trigger');

    player.tune();

    player.on('all', (event) => console.log('player event:', event));

    // wait for play to be available
    await new Promise((resolve) => {
      player.once('play-active', resolve);
    });

    let startedCount = 0;
    player.on('play-started', () => {
      startedCount++;

      expect(startedCount).to.below(2);
    });

    // call play twice in a row
    player.play();
    player.play();

    await new Promise((resolve) => {
      setTimeout(resolve, 3000);
    });

    player.stop();
  });

  it('will emit skip-denied message when a skip is disallowed', async function () {
    this.timeout(4000);

    server.autoRespondAfter = 10;
    server.autoRespond = true;

    server.respondWith('POST', /session/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
    });
    var playResponse = validPlayResponse();

    server.respondWith('POST', /play$/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
    });

    server.respondWith('POST', /start$/, function (response) {
      console.log('start handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, can_skip: true }));
    });

    server.respondWith('POST', /skip$/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false }));
    });

    server.respondWith(function (request) {
      console.log('default response with request', request);
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    player.play();

    player.on('all', (event) => console.log('player event:', event));

    await new Promise((resolve) => {
      player.on('play-started', () => setTimeout(resolve, 1000));
    });

    player.skip();

    await new Promise((resolve) => {
      console.log('on skip dewnied');
      player.on('skip-denied', resolve);
    });

    //expect(player.getCurrentState()).to.equal('playing');

    player.stop();
  });

  it('will will properly report a song being skippable', async function () {
    this.timeout(4000);

    server.autoRespondAfter = 10;
    server.autoRespond = true;

    server.respondWith('POST', /session/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
    });
    var playResponse = validPlayResponse();

    server.respondWith('POST', /play$/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
    });

    server.respondWith('POST', /start$/, function (response) {
      console.log('start handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, can_skip: true }));
    });

    server.respondWith('POST', /skip$/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false }));
    });

    server.respondWith(function (request) {
      console.log('default response with request', request);
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });

    expect(player.maybeCanSkip()).to.equal(false);

    player.play();

    player.on('all', (event) => console.log('player event:', event));

    await new Promise((resolve) => {
      player.on('play-started', resolve);
    });

    expect(player.maybeCanSkip()).to.equal(true);

    player.stop();
  });

  it('will will properly report a song not being skippable', async function () {
    this.timeout(4000);

    server.autoRespondAfter = 10;
    server.autoRespond = true;

    server.respondWith('POST', /session/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
    });
    var playResponse = validPlayResponse();

    server.respondWith('POST', /play$/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
    });

    server.respondWith('POST', /start$/, function (response) {
      console.log('start handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, can_skip: false }));
    });

    server.respondWith('POST', /skip$/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false }));
    });

    server.respondWith(function (request) {
      console.log('default response with request', request);
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });

    expect(player.maybeCanSkip()).to.equal(false);

    player.play();

    player.on('all', (event) => console.log('player event:', event));

    await new Promise((resolve) => {
      player.on('play-started', resolve);
    });

    expect(player.maybeCanSkip()).to.equal(false);

    player.stop();
  });


  it('will invalidate play that does not prepare and advance to next play', async function () {
    this.timeout(8000);

    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('POST', /session/, function (response) {
      console.log('placement handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
    });

    var playResponses = [];

    let playRequestIndex = 0;
    server.respondWith('POST', /play$/, function (response) {
      var playResponse = validPlayResponse();

      if (playRequestIndex++ < 2) {
        // first play is bad
        playResponse.play.audio_file.url = 'http://foo.bar';
      }
      
      playResponses.push(playResponse);
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
    });

    server.respondWith('POST', /invalidate$/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    });

    var player = new Feed.Player('demo', 'demo', { debug: true, maxRetries: 2 });
    sinon.spy(player, 'trigger');

    player.on('all', (event) => console.log('player event:', event));

    player.prepare();

    // despite first song being invalid, we should eventually become ready
    await new Promise((resolve) => {
      player.on('prepared', resolve);
    });
  });

  it('will play our fake mp3 file', async function () {
    let speaker = new Feed.Speaker();
    speaker.initializeAudio();

    const blob = new Blob([ SILENT_MP3_BLOB ], { type: 'audio/mpeg' });
    const blobUrl = URL.createObjectURL(blob);

    let promise = new Promise((resolve) => {
      let sound = speaker.create(blobUrl, {
        finish: (err) => { if (!err) { resolve(); } }
      });

      sound.play();
    });

    await promise;
  });

  it('will invalidate incoming play that does not prepare while current play is active', async function () {
    this.timeout(12000);

    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('POST', /session/, function (response) {
      console.log('placement handler');
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validSessionResponse()));
    });

    var playResponses = [];

    let playRequestIndex = 0;
    server.respondWith('POST', /play$/, function (response) {
      var playResponse = validPlayResponse();

      if (playRequestIndex === 0) {
        // first play is 4 seconds long
        playResponse.play.audio_file.url = 'https://dgase5ckewowv.cloudfront.net/feedfm-audio/1625474777-10706.mp3';
        playResponse.play.audio_file.duration_in_seconds = '4';

      } else if (playRequestIndex === 1) {
        // second play is bad
        playResponse.play.audio_file.url = 'http://foo.bar';
      
      } // subsequent songs are silence mp3s
      
      playRequestIndex++;
      
      playResponses.push(playResponse);
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
    });

    server.respondWith('POST', /start$/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, can_skip: false }));
    });

    server.respondWith('POST', /invalidate$/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
    });

    var player = new Feed.Player('demo', 'demo', { debug: true });
    sinon.spy(player, 'trigger');

    player.on('all', (event) => console.log('player event:', event));

    player.play();

    // we're good once the player has started the second song
    await new Promise((resolve) => {
      let count = 0;
      
      player.on('play-started', () => {
        count++;
        if (count === 2) {
          setTimeout(() => {
            player.stop();
            resolve();
          }, 1000);
        }
      });
    });
  });
});


const urls = [
  'https://dgase5ckewowv.cloudfront.net/feedfm-audio/1543381635-50459.mp3',
  'https://dgase5ckewowv.cloudfront.net/feedfm-audio/1563964895-88514.mp3'
];

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

function validSessionResponse() {
  
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


const silence = 'SUQzAwAAAAAAWFRBTEIAAAAMAAAAQmxhbmsgQXVkaW9USVQyAAAAHAAAADI1MCBNaWxsaXNlY29uZHMgb2YgU2lsZW5jZVRQRTEAAAASAAAAQW5hciBTb2Z0d2FyZSBMTEP/4xjEAAkzUfwIAE1NDwAzHwL+Y8gLIC/G5v+BEBSX///8bmN4Bjze/xjEAAg0ECEGaR+v///P////////+tk5/CLN2hyWE+D/4xjEFgkLZiQIAEdKDgZi0BBxxIIxYGALaBuq/+1/BSrxfylOzt5F7v///79f6+yGfIjsRzncM7CHmHFJcpIsUAi2Kh19f/7/4xjELAnTXhgAAEUt309f//////qq8zIhdkYopjjygKIZxYwnDwysg5EpI5HSYAJAlQ4f+an//D0ImhEa//////l6k4mYZCH/4xjEPwobYiQIAI1PMRo2HCoKhrRJMFEhYMof//8yL//MjP+Rf/+Z/5f/zVpZ9lkMjJlDBQYR1VUVP9pEVUxBTUUzLjk4LjL/4xjEUQjbVhgIAEdNVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/4xjEaAiLJawIAEdJVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/4xjEgAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=';

const b64toBlob = (b64Data, contentType='', sliceSize=512) => {
  const byteCharacters = atob(b64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays, {type: contentType});
  return blob;
};

const SILENT_MP3_BLOB = b64toBlob(silence);

function b64toArray(base64) {
  var binary_string = window.atob(base64);
  var len = binary_string.length;
  var bytes = new Uint8Array(len);
  for (var i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

const SILENT_MP3_ARRAY = b64toArray(silence);
