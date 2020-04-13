export function addProtocol(url, secure) {
  // handle '//somewhere.com/' url's
  if (url.slice(0, 2) === '//') {
    if (secure === true) {
      url = 'https:' + url;

    } else if (secure === false) {
      url = 'http:' + url;

    } else if (window.location.protocol.substr(0, 4) === 'http') {
      url = window.location.protocol + url;

    } else {
      url = 'http';
    }
  }

  return url;
}

/**
  * The below are adapted from the Underscore library:
  *     Underscore.js 1.5.2
  *     http://underscorejs.org
  *   (c) 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
  *   Underscore may be freely distributed under the MIT license.
  */

let idCounter = 0;
export function uniqueId(prefix) {
  var id = ++idCounter;
  return prefix + id;
}

const nativeIndexOf = Array.prototype.indexOf;

function contains(obj, target) {
  if (obj === null) return false;
  if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
  return obj.some(function (value) {
    return value === target;
  });
}

function uniq(array, isSorted, iterator, context) {
  if (typeof isSorted === 'function') {
    context = iterator;
    iterator = isSorted;
    isSorted = false;
  }
  var initial = iterator ? array.map(iterator, context) : array;
  var results = [];
  var seen = [];
  initial.forEach(function (value, index) {
    if (isSorted ? (!index || seen[seen.length - 1] !== value) : !contains(seen, value)) {
      seen.push(value);
      results.push(array[index]);
    }
  });
  return results;
}

export function intersection(alpha, tests) {
  let retests = tests.map((test) => new RegExp(test));

  return uniq(alpha).filter(function (item) {
    return retests.find((other) => other.test(item));
  });
}

export function once (func) {
  var ran = false, memo;
  return function () {
    if (ran) return memo;
    ran = true;
    memo = func.apply(this, arguments);
    func = null;
    return memo;
  };
}

export function repeatAfter(delay, max, cb) {
  delay = delay ? 2 * delay : 200;

  if (delay > max) {
    delay = max;
  }

  setTimeout(function () {
    cb(delay);
  }, delay);
}
