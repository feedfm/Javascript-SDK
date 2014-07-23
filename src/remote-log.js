/*global JSON:false, define:false*/

define([ 'jquery' ], function($) {

  // https://github.com/Eccenux/JSON-js/blob/master/cycle.js
  if (typeof JSON.decycle !== 'function') {
  (function(){

    function stringifyNode(node) {
      var text = '';
      if (node.nodeType === node.ELEMENT_NODE) {
        text = node.nodeName.toLowerCase();
        if (node.id.length) {
          text += '#' + node.id;
        }
        else {
          if (node.className.length) {
            text += '.' + node.className.replace(/ /, '.');
          }
          if ('textContent' in node) {
            text += '{textContent:' + (node.textContent.length < 20 ? node.textContent : node.textContent.substr(0, 20) + '...') + '}'
            ;
          }
        }
      } else {
      // info on values: http://www.w3.org/TR/DOM-Level-2-Core/core.html#ID-1841493061
        text = node.nodeName;
        if (node.nodeValue !== null) {
          text += '{value:' + (node.nodeValue.length < 20 ? node.nodeValue : node.nodeValue.substr(0, 20) + '...') + '}'
          ;
        }
      }
      return text;
    }

      JSON.decycle = function decycle(object, stringifyNodes) {
          'use strict';

          var objects = [],   // Keep a reference to each unique object or array
              paths = [];     // Keep the path to each unique object or array

          stringifyNodes = typeof(stringifyNodes) === 'undefined' ? false : stringifyNodes;

          return (function derez(value, path) {

  // The derez recurses through the object, producing the deep copy.

              var i,          // The loop counter
                  name,       // Property name
                  nu;         // The new object or array

  // if we have a DOM Element/Node convert it to textual info.

        if (stringifyNodes && typeof value === 'object' && value !== null && 'nodeType' in value) {
          return stringifyNode(value);
        }

  // typeof null === 'object', so go on if this value is really an object but not
  // one of the weird builtin objects.

              if (typeof value === 'object' && value !== null &&
                      !(value instanceof Boolean) &&
                      !(value instanceof Date)    &&
                      !(value instanceof Number)  &&
                      !(value instanceof RegExp)  &&
                      !(value instanceof String)) {

  // If the value is an object or array, look to see if we have already
  // encountered it. If so, return a $ref/path object. This is a hard way,
  // linear search that will get slower as the number of unique objects grows.

                  for (i = 0; i < objects.length; i += 1) {
                      if (objects[i] === value) {
                          return {$ref: paths[i]};
                      }
                  }

  // Otherwise, accumulate the unique value and its path.

                  objects.push(value);
                  paths.push(path);

  // If it is an array, replicate the array.

                  if (Object.prototype.toString.apply(value) === '[object Array]') {
                      nu = [];
                      for (i = 0; i < value.length; i += 1) {
                          nu[i] = derez(value[i], path + '[' + i + ']');
                      }
                  } else {

  // If it is an object, replicate the object.

                      nu = {};
                      for (name in value) {
                          if (Object.prototype.hasOwnProperty.call(value, name)) {
                              nu[name] = derez(value[name],
                                  path + '[' + JSON.stringify(name) + ']');
                          }
                      }
                  }
                  return nu;
              }
              return value;
          }(object, '$'));
      };
  })();
  }

  var buffer;

  function initializeBuffer() {
    buffer = [
      navigator.userAgent
    ];
  }

  initializeBuffer();

  function now() {
    var date = new Date();

    return date.toString() + '.' + date.getMilliseconds();
  }

  function log() {
    var entry = now() + ': ' + arguments[0];

    for (var x = 1; x < arguments.length; x++) {
      entry += ' ' + JSON.stringify(JSON.decycle(arguments[x], true));
    }

    buffer.push(entry);
  }

  log.submit = function() {
    var message = '';
    for (var x = 0; x < buffer.length; x++) {
      message += buffer[x] + '\n';
    }

    $.ajax({
      type: 'POST',
      url: 'https://feed.fm/api/v2/internal/log',
      contentType: 'text/plain',
      data: message
    });

    initializeBuffer();
  };

  return log;

});

