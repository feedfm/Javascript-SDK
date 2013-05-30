/*global it:false describe:false, $:false, chai:false */

(function() {
  var assert = chai.assert;

  describe('Mocha/Expect setup', function() {

    it('successfully passes this no-op test', function() {
      assert.equal(1, 1, 'one should equal 1');
    });

    it('detects a missing page', function(done) {
      $.getJSON('/missing/page')
      .fail(function() {
        done();
      });
    }, 2000);

    it('passes an async test', function(done) {
      setTimeout(function() {
        assert.equal(1, 1, 'no-op');
        done();
      }, 1000);
    });

  });
})();
