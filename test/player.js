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

  it('will be in idle state after a tune call', async function () {
    server.autoRespondAfter = 1;
    server.autoRespond = true;

    server.respondWith('GET', /placement/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(validPlacementResponse()));
    });
    var playResponse = validPlayResponse();

    server.respondWith('POST', /play$/, function (response) {
      response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(playResponse));
    });

    var player = new Feed.Player('demo', 'demo');
    var spy = sinon.spy(player, 'trigger');

    player.tune();

    await new Promise((resolve) => {
      player.on('play-active', resolve);
    });

    expect(spy.getCall(0).calledWith('placement-changed'), 'placement-changed').to.be.true;
    expect(spy.getCall(1).calledWith('placement'), 'placement').to.be.true;
    expect(spy.getCall(2).calledWith('station-changed'), 'station-changed').to.be.true;
    expect(spy.getCall(3).calledWith('stations'), 'stations').to.be.true;
    expect(spy.getCall(4).calledWith('prepare-sound'), 'prepare-sound').to.be.true;
    expect(spy.getCall(5).calledWith('play-active'), 'play-active').to.be.true;

    expect(player.getActivePlay()).to.deep.equal(playResponse.play);

    expect(player.getCurrentState()).to.equal('idle');
  });

  it.only('will not trigger elapse call after calling stop while we have an active play', async function () {
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

    var player = new Feed.Player('demo', 'demo');
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

  it('will send out specific events after starting playback, and end up in playing state', async function () {
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

    expect(spy.callCount).to.equal(8);
    expect(spy.getCall(0).calledWith('placement-changed'), 'placement-changed').to.be.true;
    expect(spy.getCall(1).calledWith('placement'), 'placement').to.be.true;
    expect(spy.getCall(2).calledWith('station-changed'), 'station-changed').to.be.true;
    expect(spy.getCall(3).calledWith('stations'), 'stations').to.be.true;
    expect(spy.getCall(4).calledWith('prepare-sound'), 'prepare-sound').to.be.true;
    expect(spy.getCall(5).calledWith('play-active'), 'play-active').to.be.true;
    expect(spy.getCall(6).calledWith('play-started'), 'play-started').to.be.true;
    expect(spy.getCall(7).calledWith('prepare-sound'), 'prepare-sound').to.be.true;

    expect(player.getActivePlay()).to.deep.equal(playResponse.play);

    expect(player.getCurrentState()).to.equal('playing');

    player.stop();
  });

  it('will be idle before playback starts', async function () {
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

    expect(spy.callCount).to.equal(6);
    expect(spy.getCall(0).calledWith('placement-changed'), 'placement-changed').to.be.true;
    expect(spy.getCall(1).calledWith('placement'), 'placement').to.be.true;
    expect(spy.getCall(2).calledWith('station-changed'), 'station-changed').to.be.true;
    expect(spy.getCall(3).calledWith('stations'), 'stations').to.be.true;
    expect(spy.getCall(4).calledWith('prepare-sound'), 'prepare-sound').to.be.true;
    expect(spy.getCall(5).calledWith('play-active'), 'play-active').to.be.true;

    expect(player.getActivePlay()).to.deep.equal(playResponse.play);

    expect(player.getCurrentState()).to.equal('idle');

    player.stop();
  });

  it('will be in the idle state after calling stop', async function () {
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

    player.play();

    player.on('all', (event) => console.log('player event:', event));

    await new Promise((resolve) => {
      player.on('play-started', () => { setTimeout(resolve, 2000) });
    });

    player.stop();
    
    expect(player.getCurrentState()).to.equal('idle');
  });

});


function newSessionWithClientAndCredentials() {
  var session = new Feed.Session();

  session._getClientId = () => Promise.resolve('cookie-value');
  
  session.setCredentials('x', 'y');

  return session;
}

const urls = [
  'http://s3.amazonaws.com/feedfm-audio/1409079709-81815.mp3',
  'https://dgase5ckewowv.cloudfront.net/feedfm-audio/1412033146-28533.mp3'
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