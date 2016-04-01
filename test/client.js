/*global it:false, describe:false, beforeEach:false, afterEach:false, chai:false, sinon:false, Feed:false */
/*jshint camelcase:false */

(function() {
  var assert = chai.assert;
  var origCookieCheck;

  describe('client', function() {

    beforeEach(function() {
      origCookieCheck = Feed.Client.cookiesEnabled;
    });

    afterEach(function() {
      Feed.Client.cookiesEnabled = origCookieCheck;
    });

    it('will save the cid as a cookie', function() {
      if (Feed.Client.cookiesEnabled()) {
        var cid = 'cid-with-cookie-' + Math.random();

        Feed.Client.setClientUUID(cid);

        assert.include(document.cookie, cid, 'document cookies should include what we just set');

        var saved = Feed.Client.getClientUUID();

        assert.equal(saved, cid, 'should have saved cid');

      } else {
        console.log('skipping cookie test, as cookies are not enabled');
      }
    });

    it('will save the cid as a local variable when cookies are disabled', function() {
      Feed.Client.cookiesEnabled = function() { return false; };

      var cid = 'cid-with-no-cookie-' + Math.random();

      Feed.Client.setClientUUID(cid);

      var saved = Feed.Client.getClientUUID();

      assert.equal(saved, cid, 'should have saved cid, even with no cookies');
    });

  });
})();
