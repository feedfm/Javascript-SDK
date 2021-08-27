

/**
 * Test to see if browser supports blob URLs
 * 
 * adapted from https://github.com/ssorallen/blob-feature-check/blob/master/blob-feature-check.js
 **/

let blobSupport = false;

try {
  var svg = new Blob(
    ['<svg xmlns=\'http://www.w3.org/2000/svg\'></svg>'],
    {type: 'image/svg+xml;charset=utf-8'}
  );

  if (URL && URL.createObjectURL) {
    var objectUrl = URL.createObjectURL(svg);

    if (/^blob:/.exec(objectUrl) !== null) {
      var img = new Image();
      img.onload = function() { 
        blobSupport = true; 
        console.log('we have blob support!');
        URL.revokeObjectURL(objectUrl); 
      };
      img.onerror = function() { 
        blobSupport = false;
        console.log('no blob support!');
      };
      img.src = objectUrl;
    }
  }

} catch (e) {
  /* ignore - no blob support */
}

export default () => blobSupport;

