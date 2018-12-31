/*global it:false describe:false, chai:false */

let assert = chai.assert;

describe('Mocha/Expect setup', function() {

  it('successfully passes this no-op test', function() {
    assert.equal(1, 1, 'one should equal 1');
  });

  it('passes an async test', async function(done) {
    let foo = new Promise((resolve) => {
      setTimeout(function() {
        assert.equal(1, 1, 'no-op');
        resolve(true);
      }, 1000);
    });

    await foo;

    done();
  });

});
