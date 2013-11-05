/*global it:false, describe:false, chai:false, sinon:false, Feed:false, _:false */
/*jshint camelcase:false */

(function() {

  var assert = chai.assert;

  describe('session authentication', function() {

    it('has a private ajax signing, nonce creation, and timestamp functions', function() {
      var session = new Feed.Session();

      assert.property(session, '_sign');
      assert.property(session, '_unixTime');
      assert.property(session, '_makeNonce');
    });

    it('generates a known signature', function() {
      var session = new Feed.Session();

      session._unixTime = function() { return 1367683295; };
      session._makeNonce = function() { return 'oefufvfgvi'; };
      session.setCredentials('3d3eac0db16c1f3fae94fe0d0e5698238306bfda', 'c7afd83121b0362aab0852c88095735ee2d0a810');

      var request = {
        url: 'http://feed.localdomain/api/v2/play',
        type: 'POST',
        data: {
          client_id: '65bhd9e7mdg9cnmi4z6agz7',
          placement_id: '10000',
          station_id: '',
          formats: '',
          max_bitrates: ''
        }
      };

      request = session._sign(request);

      assert.equal(request.headers.Authorization, 'OAuth realm="Feed.fm",oauth_timestamp="1367683295",oauth_nonce="oefufvfgvi",oauth_signature_method="HMAC-SHA256",oauth_consumer_key="3d3eac0db16c1f3fae94fe0d0e5698238306bfda",oauth_version="1.0",oauth_signature="gOTbVtxmTXou%2B3GUaXnGDR1IdgqPy%2BG7luL6dL84evk%3D"', 'Should have computed proper signature');
    });

    it('adjusts local time to server time for signed requests', function() {
      var server = sinon.fakeServer.create();

      server.respondWith('POST', '/test', function(response) {
        var auth = response.requestHeaders.Authorization.split(',');

        var time = _.find(auth, function(i) {
          return i.slice(0, 15) === 'oauth_timestamp';
        });

        assert.equal(time, 'oauth_timestamp="20"', 'current time should be same as server == 20');

        response.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
      });

      var session = new Feed.Session();
      session._requestClientId = function(cb) { cb.resolve('cookie-value'); };
      session._requestServerTime = function(deferred) { deferred.resolve(20); };

      session.setCredentials('x', 'y');
      session.setPlacementId('1234');

      session._unixTime = function() { return 100; };

      session._signedAjax({
        url: '/test',
        type: 'POST'
      });

      server.respond();

      // (all the testing is done in the '/test' handler)

      server.restore();
    });

  });
})();
