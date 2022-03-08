

/**
 * Test to see if browser supports blob URLs
 * 
 * adapted from https://github.com/ssorallen/blob-feature-check/blob/master/blob-feature-check.js
 **/

let blobSupport = false;

function fixBinary (bin) {
  var length = bin.length;
  var buf = new ArrayBuffer(length);
  var arr = new Uint8Array(buf);
  for (var i = 0; i < length; i++) {
    arr[i] = bin.charCodeAt(i);
  }
  return buf;
}

var binary = fixBinary(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGP6DwABBQECz6AuzQAAAABJRU5ErkJggg=='));
var png = new Blob([binary], {type: 'image/png'});

try {
  if (URL && URL.createObjectURL) {
    var objectUrl = URL.createObjectURL(png);

    if (/^blob:/.exec(objectUrl) !== null) {

      var img = new Image();
      img.onload = function() { 
        blobSupport = true; 
        URL.revokeObjectURL(objectUrl); 
      };
      img.onerror = function() { 
        blobSupport = false;
      };
      img.src = objectUrl;
    }
  }

} catch (e) {
  /* ignore - no blob support */
}

export default () => blobSupport;

