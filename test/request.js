/*global it:false, describe:false, beforeEach:false, afterEach:false, chai:false, sinon:false, Feed:false */
/*jshint camelcase:false */

(function() {
  var assert = chai.assert;

  describe('request', function() {

    var server;
    var clientCookiesEnabled;

    beforeEach(function() {
      server = sinon.fakeServer.create();

      clientCookiesEnabled = Feed.Client.cookiesEnabled;
    });

    afterEach(function() {
      server.restore();
      
      Feed.Client.cookiesEnabled = clientCookiesEnabled;

      // delete the stored cid
      Feed.Client.deleteClientUUID();
    });

    it('will send the cid as a parameter if cookies are not enabled', function(done) {
      var cid = 'CIDVALUE' + Math.random();

      server.autoRespond = true;

      server.respondWith('POST', 'https://feed.fm/api/v2/play', function(request) {
        assert.include(request.requestBody, 'client_id=' + cid, 'request should contain cid since we disabled cookies');

        request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          success: true
        }));
      });

      Feed.Client.cookiesEnabled = function() { return false; };
      Feed.Client.setClientUUID(cid);

      var play = Feed.Request.requestPlay('1', 'mp3', 128);
      play.success = function() {
        done();
      };
      play.send();
    });

  });
})();
