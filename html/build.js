(function () {
  'use strict';

  /* eslint-disable no-console */
  // log() -- The complete, cross-browser (we don't judge!) console.log wrapper for his or her logging pleasure
  var log = function log() {
    console.log.apply(console, [...arguments]);
  };

  var _isObject = function (it) {
    return typeof it === 'object' ? it !== null : typeof it === 'function';
  };

  var _anObject = function (it) {
    if (!_isObject(it)) throw TypeError(it + ' is not an object!');
    return it;
  };

  var _fails = function (exec) {
    try {
      return !!exec();
    } catch (e) {
      return true;
    }
  };

  // Thank's IE8 for his funny defineProperty
  var _descriptors = !_fails(function () {
    return Object.defineProperty({}, 'a', { get: function () { return 7; } }).a != 7;
  });

  var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function createCommonjsModule(fn, module) {
  	return module = { exports: {} }, fn(module, module.exports), module.exports;
  }

  var _global = createCommonjsModule(function (module) {
  // https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
  var global = module.exports = typeof window != 'undefined' && window.Math == Math
    ? window : typeof self != 'undefined' && self.Math == Math ? self
    // eslint-disable-next-line no-new-func
    : Function('return this')();
  if (typeof __g == 'number') __g = global; // eslint-disable-line no-undef
  });

  var document$1 = _global.document;
  // typeof document.createElement is 'object' in old IE
  var is = _isObject(document$1) && _isObject(document$1.createElement);
  var _domCreate = function (it) {
    return is ? document$1.createElement(it) : {};
  };

  var _ie8DomDefine = !_descriptors && !_fails(function () {
    return Object.defineProperty(_domCreate('div'), 'a', { get: function () { return 7; } }).a != 7;
  });

  // 7.1.1 ToPrimitive(input [, PreferredType])

  // instead of the ES6 spec version, we didn't implement @@toPrimitive case
  // and the second argument - flag - preferred type is a string
  var _toPrimitive = function (it, S) {
    if (!_isObject(it)) return it;
    var fn, val;
    if (S && typeof (fn = it.toString) == 'function' && !_isObject(val = fn.call(it))) return val;
    if (typeof (fn = it.valueOf) == 'function' && !_isObject(val = fn.call(it))) return val;
    if (!S && typeof (fn = it.toString) == 'function' && !_isObject(val = fn.call(it))) return val;
    throw TypeError("Can't convert object to primitive value");
  };

  var dP = Object.defineProperty;

  var f = _descriptors ? Object.defineProperty : function defineProperty(O, P, Attributes) {
    _anObject(O);
    P = _toPrimitive(P, true);
    _anObject(Attributes);
    if (_ie8DomDefine) try {
      return dP(O, P, Attributes);
    } catch (e) { /* empty */ }
    if ('get' in Attributes || 'set' in Attributes) throw TypeError('Accessors not supported!');
    if ('value' in Attributes) O[P] = Attributes.value;
    return O;
  };

  var _objectDp = {
  	f: f
  };

  var _propertyDesc = function (bitmap, value) {
    return {
      enumerable: !(bitmap & 1),
      configurable: !(bitmap & 2),
      writable: !(bitmap & 4),
      value: value
    };
  };

  var _hide = _descriptors ? function (object, key, value) {
    return _objectDp.f(object, key, _propertyDesc(1, value));
  } : function (object, key, value) {
    object[key] = value;
    return object;
  };

  var hasOwnProperty = {}.hasOwnProperty;
  var _has = function (it, key) {
    return hasOwnProperty.call(it, key);
  };

  var id = 0;
  var px = Math.random();
  var _uid = function (key) {
    return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
  };

  var _core = createCommonjsModule(function (module) {
  var core = module.exports = { version: '2.5.7' };
  if (typeof __e == 'number') __e = core; // eslint-disable-line no-undef
  });
  var _core_1 = _core.version;

  var _redefine = createCommonjsModule(function (module) {
  var SRC = _uid('src');
  var TO_STRING = 'toString';
  var $toString = Function[TO_STRING];
  var TPL = ('' + $toString).split(TO_STRING);

  _core.inspectSource = function (it) {
    return $toString.call(it);
  };

  (module.exports = function (O, key, val, safe) {
    var isFunction = typeof val == 'function';
    if (isFunction) _has(val, 'name') || _hide(val, 'name', key);
    if (O[key] === val) return;
    if (isFunction) _has(val, SRC) || _hide(val, SRC, O[key] ? '' + O[key] : TPL.join(String(key)));
    if (O === _global) {
      O[key] = val;
    } else if (!safe) {
      delete O[key];
      _hide(O, key, val);
    } else if (O[key]) {
      O[key] = val;
    } else {
      _hide(O, key, val);
    }
  // add fake Function#toString for correct work wrapped methods / constructors with methods like LoDash isNative
  })(Function.prototype, TO_STRING, function toString() {
    return typeof this == 'function' && this[SRC] || $toString.call(this);
  });
  });

  // 7.2.1 RequireObjectCoercible(argument)
  var _defined = function (it) {
    if (it == undefined) throw TypeError("Can't call method on  " + it);
    return it;
  };

  var _library = false;

  var _shared = createCommonjsModule(function (module) {
  var SHARED = '__core-js_shared__';
  var store = _global[SHARED] || (_global[SHARED] = {});

  (module.exports = function (key, value) {
    return store[key] || (store[key] = value !== undefined ? value : {});
  })('versions', []).push({
    version: _core.version,
    mode: _library ? 'pure' : 'global',
    copyright: '© 2018 Denis Pushkarev (zloirock.ru)'
  });
  });

  var _wks = createCommonjsModule(function (module) {
  var store = _shared('wks');

  var Symbol = _global.Symbol;
  var USE_SYMBOL = typeof Symbol == 'function';

  var $exports = module.exports = function (name) {
    return store[name] || (store[name] =
      USE_SYMBOL && Symbol[name] || (USE_SYMBOL ? Symbol : _uid)('Symbol.' + name));
  };

  $exports.store = store;
  });

  var _fixReWks = function (KEY, length, exec) {
    var SYMBOL = _wks(KEY);
    var fns = exec(_defined, SYMBOL, ''[KEY]);
    var strfn = fns[0];
    var rxfn = fns[1];
    if (_fails(function () {
      var O = {};
      O[SYMBOL] = function () { return 7; };
      return ''[KEY](O) != 7;
    })) {
      _redefine(String.prototype, KEY, strfn);
      _hide(RegExp.prototype, SYMBOL, length == 2
        // 21.2.5.8 RegExp.prototype[@@replace](string, replaceValue)
        // 21.2.5.11 RegExp.prototype[@@split](string, limit)
        ? function (string, arg) { return rxfn.call(string, this, arg); }
        // 21.2.5.6 RegExp.prototype[@@match](string)
        // 21.2.5.9 RegExp.prototype[@@search](string)
        : function (string) { return rxfn.call(string, this); }
      );
    }
  };

  var toString = {}.toString;

  var _cof = function (it) {
    return toString.call(it).slice(8, -1);
  };

  // 7.2.8 IsRegExp(argument)


  var MATCH = _wks('match');
  var _isRegexp = function (it) {
    var isRegExp;
    return _isObject(it) && ((isRegExp = it[MATCH]) !== undefined ? !!isRegExp : _cof(it) == 'RegExp');
  };

  // @@split logic
  _fixReWks('split', 2, function (defined, SPLIT, $split) {
    var isRegExp = _isRegexp;
    var _split = $split;
    var $push = [].push;
    var $SPLIT = 'split';
    var LENGTH = 'length';
    var LAST_INDEX = 'lastIndex';
    if (
      'abbc'[$SPLIT](/(b)*/)[1] == 'c' ||
      'test'[$SPLIT](/(?:)/, -1)[LENGTH] != 4 ||
      'ab'[$SPLIT](/(?:ab)*/)[LENGTH] != 2 ||
      '.'[$SPLIT](/(.?)(.?)/)[LENGTH] != 4 ||
      '.'[$SPLIT](/()()/)[LENGTH] > 1 ||
      ''[$SPLIT](/.?/)[LENGTH]
    ) {
      var NPCG = /()??/.exec('')[1] === undefined; // nonparticipating capturing group
      // based on es5-shim implementation, need to rework it
      $split = function (separator, limit) {
        var string = String(this);
        if (separator === undefined && limit === 0) return [];
        // If `separator` is not a regex, use native split
        if (!isRegExp(separator)) return _split.call(string, separator, limit);
        var output = [];
        var flags = (separator.ignoreCase ? 'i' : '') +
                    (separator.multiline ? 'm' : '') +
                    (separator.unicode ? 'u' : '') +
                    (separator.sticky ? 'y' : '');
        var lastLastIndex = 0;
        var splitLimit = limit === undefined ? 4294967295 : limit >>> 0;
        // Make `global` and avoid `lastIndex` issues by working with a copy
        var separatorCopy = new RegExp(separator.source, flags + 'g');
        var separator2, match, lastIndex, lastLength, i;
        // Doesn't need flags gy, but they don't hurt
        if (!NPCG) separator2 = new RegExp('^' + separatorCopy.source + '$(?!\\s)', flags);
        while (match = separatorCopy.exec(string)) {
          // `separatorCopy.lastIndex` is not reliable cross-browser
          lastIndex = match.index + match[0][LENGTH];
          if (lastIndex > lastLastIndex) {
            output.push(string.slice(lastLastIndex, match.index));
            // Fix browsers whose `exec` methods don't consistently return `undefined` for NPCG
            // eslint-disable-next-line no-loop-func
            if (!NPCG && match[LENGTH] > 1) match[0].replace(separator2, function () {
              for (i = 1; i < arguments[LENGTH] - 2; i++) if (arguments[i] === undefined) match[i] = undefined;
            });
            if (match[LENGTH] > 1 && match.index < string[LENGTH]) $push.apply(output, match.slice(1));
            lastLength = match[0][LENGTH];
            lastLastIndex = lastIndex;
            if (output[LENGTH] >= splitLimit) break;
          }
          if (separatorCopy[LAST_INDEX] === match.index) separatorCopy[LAST_INDEX]++; // Avoid an infinite loop
        }
        if (lastLastIndex === string[LENGTH]) {
          if (lastLength || !separatorCopy.test('')) output.push('');
        } else output.push(string.slice(lastLastIndex));
        return output[LENGTH] > splitLimit ? output.slice(0, splitLimit) : output;
      };
    // Chakra, V8
    } else if ('0'[$SPLIT](undefined, 0)[LENGTH]) {
      $split = function (separator, limit) {
        return separator === undefined && limit === 0 ? [] : _split.call(this, separator, limit);
      };
    }
    // 21.1.3.17 String.prototype.split(separator, limit)
    return [function split(separator, limit) {
      var O = defined(this);
      var fn = separator == undefined ? undefined : separator[SPLIT];
      return fn !== undefined ? fn.call(separator, O, limit) : $split.call(String(O), separator, limit);
    }, $split];
  });

  /** Detect free variable `global` from Node.js. */
  var freeGlobal = typeof commonjsGlobal == 'object' && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;

  var _freeGlobal = freeGlobal;

  /** Detect free variable `self`. */
  var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

  /** Used as a reference to the global object. */
  var root = _freeGlobal || freeSelf || Function('return this')();

  var _root = root;

  /** Built-in value references. */
  var Symbol = _root.Symbol;

  var _Symbol = Symbol;

  /**
   * A specialized version of `_.map` for arrays without support for iteratee
   * shorthands.
   *
   * @private
   * @param {Array} [array] The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns the new mapped array.
   */
  function arrayMap(array, iteratee) {
    var index = -1,
        length = array == null ? 0 : array.length,
        result = Array(length);

    while (++index < length) {
      result[index] = iteratee(array[index], index, array);
    }
    return result;
  }

  var _arrayMap = arrayMap;

  /**
   * Checks if `value` is classified as an `Array` object.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an array, else `false`.
   * @example
   *
   * _.isArray([1, 2, 3]);
   * // => true
   *
   * _.isArray(document.body.children);
   * // => false
   *
   * _.isArray('abc');
   * // => false
   *
   * _.isArray(_.noop);
   * // => false
   */
  var isArray = Array.isArray;

  var isArray_1 = isArray;

  /** Used for built-in method references. */
  var objectProto = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty$1 = objectProto.hasOwnProperty;

  /**
   * Used to resolve the
   * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
   * of values.
   */
  var nativeObjectToString = objectProto.toString;

  /** Built-in value references. */
  var symToStringTag = _Symbol ? _Symbol.toStringTag : undefined;

  /**
   * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
   *
   * @private
   * @param {*} value The value to query.
   * @returns {string} Returns the raw `toStringTag`.
   */
  function getRawTag(value) {
    var isOwn = hasOwnProperty$1.call(value, symToStringTag),
        tag = value[symToStringTag];

    try {
      value[symToStringTag] = undefined;
    } catch (e) {}

    var result = nativeObjectToString.call(value);
    {
      if (isOwn) {
        value[symToStringTag] = tag;
      } else {
        delete value[symToStringTag];
      }
    }
    return result;
  }

  var _getRawTag = getRawTag;

  /** Used for built-in method references. */
  var objectProto$1 = Object.prototype;

  /**
   * Used to resolve the
   * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
   * of values.
   */
  var nativeObjectToString$1 = objectProto$1.toString;

  /**
   * Converts `value` to a string using `Object.prototype.toString`.
   *
   * @private
   * @param {*} value The value to convert.
   * @returns {string} Returns the converted string.
   */
  function objectToString(value) {
    return nativeObjectToString$1.call(value);
  }

  var _objectToString = objectToString;

  /** `Object#toString` result references. */
  var nullTag = '[object Null]',
      undefinedTag = '[object Undefined]';

  /** Built-in value references. */
  var symToStringTag$1 = _Symbol ? _Symbol.toStringTag : undefined;

  /**
   * The base implementation of `getTag` without fallbacks for buggy environments.
   *
   * @private
   * @param {*} value The value to query.
   * @returns {string} Returns the `toStringTag`.
   */
  function baseGetTag(value) {
    if (value == null) {
      return value === undefined ? undefinedTag : nullTag;
    }
    return (symToStringTag$1 && symToStringTag$1 in Object(value))
      ? _getRawTag(value)
      : _objectToString(value);
  }

  var _baseGetTag = baseGetTag;

  /**
   * Checks if `value` is object-like. A value is object-like if it's not `null`
   * and has a `typeof` result of "object".
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
   * @example
   *
   * _.isObjectLike({});
   * // => true
   *
   * _.isObjectLike([1, 2, 3]);
   * // => true
   *
   * _.isObjectLike(_.noop);
   * // => false
   *
   * _.isObjectLike(null);
   * // => false
   */
  function isObjectLike(value) {
    return value != null && typeof value == 'object';
  }

  var isObjectLike_1 = isObjectLike;

  /** `Object#toString` result references. */
  var symbolTag = '[object Symbol]';

  /**
   * Checks if `value` is classified as a `Symbol` primitive or object.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
   * @example
   *
   * _.isSymbol(Symbol.iterator);
   * // => true
   *
   * _.isSymbol('abc');
   * // => false
   */
  function isSymbol(value) {
    return typeof value == 'symbol' ||
      (isObjectLike_1(value) && _baseGetTag(value) == symbolTag);
  }

  var isSymbol_1 = isSymbol;

  /** Used as references for various `Number` constants. */
  var INFINITY = 1 / 0;

  /** Used to convert symbols to primitives and strings. */
  var symbolProto = _Symbol ? _Symbol.prototype : undefined,
      symbolToString = symbolProto ? symbolProto.toString : undefined;

  /**
   * The base implementation of `_.toString` which doesn't convert nullish
   * values to empty strings.
   *
   * @private
   * @param {*} value The value to process.
   * @returns {string} Returns the string.
   */
  function baseToString(value) {
    // Exit early for strings to avoid a performance hit in some environments.
    if (typeof value == 'string') {
      return value;
    }
    if (isArray_1(value)) {
      // Recursively convert values (susceptible to call stack limits).
      return _arrayMap(value, baseToString) + '';
    }
    if (isSymbol_1(value)) {
      return symbolToString ? symbolToString.call(value) : '';
    }
    var result = (value + '');
    return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
  }

  var _baseToString = baseToString;

  /**
   * Converts `value` to a string. An empty string is returned for `null`
   * and `undefined` values. The sign of `-0` is preserved.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to convert.
   * @returns {string} Returns the converted string.
   * @example
   *
   * _.toString(null);
   * // => ''
   *
   * _.toString(-0);
   * // => '-0'
   *
   * _.toString([1, 2, 3]);
   * // => '1,2,3'
   */
  function toString$1(value) {
    return value == null ? '' : _baseToString(value);
  }

  var toString_1 = toString$1;

  /** Used to generate unique IDs. */
  var idCounter = 0;

  /**
   * Generates a unique ID. If `prefix` is given, the ID is appended to it.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Util
   * @param {string} [prefix=''] The value to prefix the ID with.
   * @returns {string} Returns the unique ID.
   * @example
   *
   * _.uniqueId('contact_');
   * // => 'contact_104'
   *
   * _.uniqueId();
   * // => '105'
   */
  function uniqueId(prefix) {
    var id = ++idCounter;
    return toString_1(prefix) + id;
  }

  var uniqueId_1 = uniqueId;

  /**
   * A specialized version of `_.forEach` for arrays without support for
   * iteratee shorthands.
   *
   * @private
   * @param {Array} [array] The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns `array`.
   */
  function arrayEach(array, iteratee) {
    var index = -1,
        length = array == null ? 0 : array.length;

    while (++index < length) {
      if (iteratee(array[index], index, array) === false) {
        break;
      }
    }
    return array;
  }

  var _arrayEach = arrayEach;

  /**
   * Creates a base function for methods like `_.forIn` and `_.forOwn`.
   *
   * @private
   * @param {boolean} [fromRight] Specify iterating from right to left.
   * @returns {Function} Returns the new base function.
   */
  function createBaseFor(fromRight) {
    return function(object, iteratee, keysFunc) {
      var index = -1,
          iterable = Object(object),
          props = keysFunc(object),
          length = props.length;

      while (length--) {
        var key = props[fromRight ? length : ++index];
        if (iteratee(iterable[key], key, iterable) === false) {
          break;
        }
      }
      return object;
    };
  }

  var _createBaseFor = createBaseFor;

  /**
   * The base implementation of `baseForOwn` which iterates over `object`
   * properties returned by `keysFunc` and invokes `iteratee` for each property.
   * Iteratee functions may exit iteration early by explicitly returning `false`.
   *
   * @private
   * @param {Object} object The object to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @param {Function} keysFunc The function to get the keys of `object`.
   * @returns {Object} Returns `object`.
   */
  var baseFor = _createBaseFor();

  var _baseFor = baseFor;

  /**
   * The base implementation of `_.times` without support for iteratee shorthands
   * or max array length checks.
   *
   * @private
   * @param {number} n The number of times to invoke `iteratee`.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns the array of results.
   */
  function baseTimes(n, iteratee) {
    var index = -1,
        result = Array(n);

    while (++index < n) {
      result[index] = iteratee(index);
    }
    return result;
  }

  var _baseTimes = baseTimes;

  /** `Object#toString` result references. */
  var argsTag = '[object Arguments]';

  /**
   * The base implementation of `_.isArguments`.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an `arguments` object,
   */
  function baseIsArguments(value) {
    return isObjectLike_1(value) && _baseGetTag(value) == argsTag;
  }

  var _baseIsArguments = baseIsArguments;

  /** Used for built-in method references. */
  var objectProto$2 = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty$2 = objectProto$2.hasOwnProperty;

  /** Built-in value references. */
  var propertyIsEnumerable = objectProto$2.propertyIsEnumerable;

  /**
   * Checks if `value` is likely an `arguments` object.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an `arguments` object,
   *  else `false`.
   * @example
   *
   * _.isArguments(function() { return arguments; }());
   * // => true
   *
   * _.isArguments([1, 2, 3]);
   * // => false
   */
  var isArguments = _baseIsArguments(function() { return arguments; }()) ? _baseIsArguments : function(value) {
    return isObjectLike_1(value) && hasOwnProperty$2.call(value, 'callee') &&
      !propertyIsEnumerable.call(value, 'callee');
  };

  var isArguments_1 = isArguments;

  /**
   * This method returns `false`.
   *
   * @static
   * @memberOf _
   * @since 4.13.0
   * @category Util
   * @returns {boolean} Returns `false`.
   * @example
   *
   * _.times(2, _.stubFalse);
   * // => [false, false]
   */
  function stubFalse() {
    return false;
  }

  var stubFalse_1 = stubFalse;

  var isBuffer_1 = createCommonjsModule(function (module, exports) {
  /** Detect free variable `exports`. */
  var freeExports = exports && !exports.nodeType && exports;

  /** Detect free variable `module`. */
  var freeModule = freeExports && 'object' == 'object' && module && !module.nodeType && module;

  /** Detect the popular CommonJS extension `module.exports`. */
  var moduleExports = freeModule && freeModule.exports === freeExports;

  /** Built-in value references. */
  var Buffer = moduleExports ? _root.Buffer : undefined;

  /* Built-in method references for those with the same name as other `lodash` methods. */
  var nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined;

  /**
   * Checks if `value` is a buffer.
   *
   * @static
   * @memberOf _
   * @since 4.3.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
   * @example
   *
   * _.isBuffer(new Buffer(2));
   * // => true
   *
   * _.isBuffer(new Uint8Array(2));
   * // => false
   */
  var isBuffer = nativeIsBuffer || stubFalse_1;

  module.exports = isBuffer;
  });

  /** Used as references for various `Number` constants. */
  var MAX_SAFE_INTEGER = 9007199254740991;

  /** Used to detect unsigned integer values. */
  var reIsUint = /^(?:0|[1-9]\d*)$/;

  /**
   * Checks if `value` is a valid array-like index.
   *
   * @private
   * @param {*} value The value to check.
   * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
   * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
   */
  function isIndex(value, length) {
    var type = typeof value;
    length = length == null ? MAX_SAFE_INTEGER : length;

    return !!length &&
      (type == 'number' ||
        (type != 'symbol' && reIsUint.test(value))) &&
          (value > -1 && value % 1 == 0 && value < length);
  }

  var _isIndex = isIndex;

  /** Used as references for various `Number` constants. */
  var MAX_SAFE_INTEGER$1 = 9007199254740991;

  /**
   * Checks if `value` is a valid array-like length.
   *
   * **Note:** This method is loosely based on
   * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
   * @example
   *
   * _.isLength(3);
   * // => true
   *
   * _.isLength(Number.MIN_VALUE);
   * // => false
   *
   * _.isLength(Infinity);
   * // => false
   *
   * _.isLength('3');
   * // => false
   */
  function isLength(value) {
    return typeof value == 'number' &&
      value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER$1;
  }

  var isLength_1 = isLength;

  /** `Object#toString` result references. */
  var argsTag$1 = '[object Arguments]',
      arrayTag = '[object Array]',
      boolTag = '[object Boolean]',
      dateTag = '[object Date]',
      errorTag = '[object Error]',
      funcTag = '[object Function]',
      mapTag = '[object Map]',
      numberTag = '[object Number]',
      objectTag = '[object Object]',
      regexpTag = '[object RegExp]',
      setTag = '[object Set]',
      stringTag = '[object String]',
      weakMapTag = '[object WeakMap]';

  var arrayBufferTag = '[object ArrayBuffer]',
      dataViewTag = '[object DataView]',
      float32Tag = '[object Float32Array]',
      float64Tag = '[object Float64Array]',
      int8Tag = '[object Int8Array]',
      int16Tag = '[object Int16Array]',
      int32Tag = '[object Int32Array]',
      uint8Tag = '[object Uint8Array]',
      uint8ClampedTag = '[object Uint8ClampedArray]',
      uint16Tag = '[object Uint16Array]',
      uint32Tag = '[object Uint32Array]';

  /** Used to identify `toStringTag` values of typed arrays. */
  var typedArrayTags = {};
  typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
  typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
  typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
  typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
  typedArrayTags[uint32Tag] = true;
  typedArrayTags[argsTag$1] = typedArrayTags[arrayTag] =
  typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
  typedArrayTags[dataViewTag] = typedArrayTags[dateTag] =
  typedArrayTags[errorTag] = typedArrayTags[funcTag] =
  typedArrayTags[mapTag] = typedArrayTags[numberTag] =
  typedArrayTags[objectTag] = typedArrayTags[regexpTag] =
  typedArrayTags[setTag] = typedArrayTags[stringTag] =
  typedArrayTags[weakMapTag] = false;

  /**
   * The base implementation of `_.isTypedArray` without Node.js optimizations.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
   */
  function baseIsTypedArray(value) {
    return isObjectLike_1(value) &&
      isLength_1(value.length) && !!typedArrayTags[_baseGetTag(value)];
  }

  var _baseIsTypedArray = baseIsTypedArray;

  /**
   * The base implementation of `_.unary` without support for storing metadata.
   *
   * @private
   * @param {Function} func The function to cap arguments for.
   * @returns {Function} Returns the new capped function.
   */
  function baseUnary(func) {
    return function(value) {
      return func(value);
    };
  }

  var _baseUnary = baseUnary;

  var _nodeUtil = createCommonjsModule(function (module, exports) {
  /** Detect free variable `exports`. */
  var freeExports = exports && !exports.nodeType && exports;

  /** Detect free variable `module`. */
  var freeModule = freeExports && 'object' == 'object' && module && !module.nodeType && module;

  /** Detect the popular CommonJS extension `module.exports`. */
  var moduleExports = freeModule && freeModule.exports === freeExports;

  /** Detect free variable `process` from Node.js. */
  var freeProcess = moduleExports && _freeGlobal.process;

  /** Used to access faster Node.js helpers. */
  var nodeUtil = (function() {
    try {
      // Use `util.types` for Node.js 10+.
      var types = freeModule && freeModule.require && freeModule.require('util').types;

      if (types) {
        return types;
      }

      // Legacy `process.binding('util')` for Node.js < 10.
      return freeProcess && freeProcess.binding && freeProcess.binding('util');
    } catch (e) {}
  }());

  module.exports = nodeUtil;
  });

  /* Node.js helper references. */
  var nodeIsTypedArray = _nodeUtil && _nodeUtil.isTypedArray;

  /**
   * Checks if `value` is classified as a typed array.
   *
   * @static
   * @memberOf _
   * @since 3.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
   * @example
   *
   * _.isTypedArray(new Uint8Array);
   * // => true
   *
   * _.isTypedArray([]);
   * // => false
   */
  var isTypedArray = nodeIsTypedArray ? _baseUnary(nodeIsTypedArray) : _baseIsTypedArray;

  var isTypedArray_1 = isTypedArray;

  /** Used for built-in method references. */
  var objectProto$3 = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty$3 = objectProto$3.hasOwnProperty;

  /**
   * Creates an array of the enumerable property names of the array-like `value`.
   *
   * @private
   * @param {*} value The value to query.
   * @param {boolean} inherited Specify returning inherited property names.
   * @returns {Array} Returns the array of property names.
   */
  function arrayLikeKeys(value, inherited) {
    var isArr = isArray_1(value),
        isArg = !isArr && isArguments_1(value),
        isBuff = !isArr && !isArg && isBuffer_1(value),
        isType = !isArr && !isArg && !isBuff && isTypedArray_1(value),
        skipIndexes = isArr || isArg || isBuff || isType,
        result = skipIndexes ? _baseTimes(value.length, String) : [],
        length = result.length;

    for (var key in value) {
      if ((inherited || hasOwnProperty$3.call(value, key)) &&
          !(skipIndexes && (
             // Safari 9 has enumerable `arguments.length` in strict mode.
             key == 'length' ||
             // Node.js 0.10 has enumerable non-index properties on buffers.
             (isBuff && (key == 'offset' || key == 'parent')) ||
             // PhantomJS 2 has enumerable non-index properties on typed arrays.
             (isType && (key == 'buffer' || key == 'byteLength' || key == 'byteOffset')) ||
             // Skip index properties.
             _isIndex(key, length)
          ))) {
        result.push(key);
      }
    }
    return result;
  }

  var _arrayLikeKeys = arrayLikeKeys;

  /** Used for built-in method references. */
  var objectProto$4 = Object.prototype;

  /**
   * Checks if `value` is likely a prototype object.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
   */
  function isPrototype(value) {
    var Ctor = value && value.constructor,
        proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto$4;

    return value === proto;
  }

  var _isPrototype = isPrototype;

  /**
   * Creates a unary function that invokes `func` with its argument transformed.
   *
   * @private
   * @param {Function} func The function to wrap.
   * @param {Function} transform The argument transform.
   * @returns {Function} Returns the new function.
   */
  function overArg(func, transform) {
    return function(arg) {
      return func(transform(arg));
    };
  }

  var _overArg = overArg;

  /* Built-in method references for those with the same name as other `lodash` methods. */
  var nativeKeys = _overArg(Object.keys, Object);

  var _nativeKeys = nativeKeys;

  /** Used for built-in method references. */
  var objectProto$5 = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty$4 = objectProto$5.hasOwnProperty;

  /**
   * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names.
   */
  function baseKeys(object) {
    if (!_isPrototype(object)) {
      return _nativeKeys(object);
    }
    var result = [];
    for (var key in Object(object)) {
      if (hasOwnProperty$4.call(object, key) && key != 'constructor') {
        result.push(key);
      }
    }
    return result;
  }

  var _baseKeys = baseKeys;

  /**
   * Checks if `value` is the
   * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
   * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an object, else `false`.
   * @example
   *
   * _.isObject({});
   * // => true
   *
   * _.isObject([1, 2, 3]);
   * // => true
   *
   * _.isObject(_.noop);
   * // => true
   *
   * _.isObject(null);
   * // => false
   */
  function isObject(value) {
    var type = typeof value;
    return value != null && (type == 'object' || type == 'function');
  }

  var isObject_1 = isObject;

  /** `Object#toString` result references. */
  var asyncTag = '[object AsyncFunction]',
      funcTag$1 = '[object Function]',
      genTag = '[object GeneratorFunction]',
      proxyTag = '[object Proxy]';

  /**
   * Checks if `value` is classified as a `Function` object.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a function, else `false`.
   * @example
   *
   * _.isFunction(_);
   * // => true
   *
   * _.isFunction(/abc/);
   * // => false
   */
  function isFunction(value) {
    if (!isObject_1(value)) {
      return false;
    }
    // The use of `Object#toString` avoids issues with the `typeof` operator
    // in Safari 9 which returns 'object' for typed arrays and other constructors.
    var tag = _baseGetTag(value);
    return tag == funcTag$1 || tag == genTag || tag == asyncTag || tag == proxyTag;
  }

  var isFunction_1 = isFunction;

  /**
   * Checks if `value` is array-like. A value is considered array-like if it's
   * not a function and has a `value.length` that's an integer greater than or
   * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
   * @example
   *
   * _.isArrayLike([1, 2, 3]);
   * // => true
   *
   * _.isArrayLike(document.body.children);
   * // => true
   *
   * _.isArrayLike('abc');
   * // => true
   *
   * _.isArrayLike(_.noop);
   * // => false
   */
  function isArrayLike(value) {
    return value != null && isLength_1(value.length) && !isFunction_1(value);
  }

  var isArrayLike_1 = isArrayLike;

  /**
   * Creates an array of the own enumerable property names of `object`.
   *
   * **Note:** Non-object values are coerced to objects. See the
   * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
   * for more details.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Object
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names.
   * @example
   *
   * function Foo() {
   *   this.a = 1;
   *   this.b = 2;
   * }
   *
   * Foo.prototype.c = 3;
   *
   * _.keys(new Foo);
   * // => ['a', 'b'] (iteration order is not guaranteed)
   *
   * _.keys('hi');
   * // => ['0', '1']
   */
  function keys(object) {
    return isArrayLike_1(object) ? _arrayLikeKeys(object) : _baseKeys(object);
  }

  var keys_1 = keys;

  /**
   * The base implementation of `_.forOwn` without support for iteratee shorthands.
   *
   * @private
   * @param {Object} object The object to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Object} Returns `object`.
   */
  function baseForOwn(object, iteratee) {
    return object && _baseFor(object, iteratee, keys_1);
  }

  var _baseForOwn = baseForOwn;

  /**
   * Creates a `baseEach` or `baseEachRight` function.
   *
   * @private
   * @param {Function} eachFunc The function to iterate over a collection.
   * @param {boolean} [fromRight] Specify iterating from right to left.
   * @returns {Function} Returns the new base function.
   */
  function createBaseEach(eachFunc, fromRight) {
    return function(collection, iteratee) {
      if (collection == null) {
        return collection;
      }
      if (!isArrayLike_1(collection)) {
        return eachFunc(collection, iteratee);
      }
      var length = collection.length,
          index = fromRight ? length : -1,
          iterable = Object(collection);

      while ((fromRight ? index-- : ++index < length)) {
        if (iteratee(iterable[index], index, iterable) === false) {
          break;
        }
      }
      return collection;
    };
  }

  var _createBaseEach = createBaseEach;

  /**
   * The base implementation of `_.forEach` without support for iteratee shorthands.
   *
   * @private
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array|Object} Returns `collection`.
   */
  var baseEach = _createBaseEach(_baseForOwn);

  var _baseEach = baseEach;

  /**
   * This method returns the first argument it receives.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Util
   * @param {*} value Any value.
   * @returns {*} Returns `value`.
   * @example
   *
   * var object = { 'a': 1 };
   *
   * console.log(_.identity(object) === object);
   * // => true
   */
  function identity(value) {
    return value;
  }

  var identity_1 = identity;

  /**
   * Casts `value` to `identity` if it's not a function.
   *
   * @private
   * @param {*} value The value to inspect.
   * @returns {Function} Returns cast function.
   */
  function castFunction(value) {
    return typeof value == 'function' ? value : identity_1;
  }

  var _castFunction = castFunction;

  /**
   * Iterates over elements of `collection` and invokes `iteratee` for each element.
   * The iteratee is invoked with three arguments: (value, index|key, collection).
   * Iteratee functions may exit iteration early by explicitly returning `false`.
   *
   * **Note:** As with other "Collections" methods, objects with a "length"
   * property are iterated like arrays. To avoid this behavior use `_.forIn`
   * or `_.forOwn` for object iteration.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @alias each
   * @category Collection
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} [iteratee=_.identity] The function invoked per iteration.
   * @returns {Array|Object} Returns `collection`.
   * @see _.forEachRight
   * @example
   *
   * _.forEach([1, 2], function(value) {
   *   console.log(value);
   * });
   * // => Logs `1` then `2`.
   *
   * _.forEach({ 'a': 1, 'b': 2 }, function(value, key) {
   *   console.log(key);
   * });
   * // => Logs 'a' then 'b' (iteration order is not guaranteed).
   */
  function forEach(collection, iteratee) {
    var func = isArray_1(collection) ? _arrayEach : _baseEach;
    return func(collection, _castFunction(iteratee));
  }

  var forEach_1 = forEach;

  var each = forEach_1;

  /** Used as references for various `Number` constants. */
  var NAN = 0 / 0;

  /** Used to match leading and trailing whitespace. */
  var reTrim = /^\s+|\s+$/g;

  /** Used to detect bad signed hexadecimal string values. */
  var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

  /** Used to detect binary string values. */
  var reIsBinary = /^0b[01]+$/i;

  /** Used to detect octal string values. */
  var reIsOctal = /^0o[0-7]+$/i;

  /** Built-in method references without a dependency on `root`. */
  var freeParseInt = parseInt;

  /**
   * Converts `value` to a number.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to process.
   * @returns {number} Returns the number.
   * @example
   *
   * _.toNumber(3.2);
   * // => 3.2
   *
   * _.toNumber(Number.MIN_VALUE);
   * // => 5e-324
   *
   * _.toNumber(Infinity);
   * // => Infinity
   *
   * _.toNumber('3.2');
   * // => 3.2
   */
  function toNumber(value) {
    if (typeof value == 'number') {
      return value;
    }
    if (isSymbol_1(value)) {
      return NAN;
    }
    if (isObject_1(value)) {
      var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
      value = isObject_1(other) ? (other + '') : other;
    }
    if (typeof value != 'string') {
      return value === 0 ? value : +value;
    }
    value = value.replace(reTrim, '');
    var isBinary = reIsBinary.test(value);
    return (isBinary || reIsOctal.test(value))
      ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
      : (reIsBadHex.test(value) ? NAN : +value);
  }

  var toNumber_1 = toNumber;

  /** Used as references for various `Number` constants. */
  var INFINITY$1 = 1 / 0,
      MAX_INTEGER = 1.7976931348623157e+308;

  /**
   * Converts `value` to a finite number.
   *
   * @static
   * @memberOf _
   * @since 4.12.0
   * @category Lang
   * @param {*} value The value to convert.
   * @returns {number} Returns the converted number.
   * @example
   *
   * _.toFinite(3.2);
   * // => 3.2
   *
   * _.toFinite(Number.MIN_VALUE);
   * // => 5e-324
   *
   * _.toFinite(Infinity);
   * // => 1.7976931348623157e+308
   *
   * _.toFinite('3.2');
   * // => 3.2
   */
  function toFinite(value) {
    if (!value) {
      return value === 0 ? value : 0;
    }
    value = toNumber_1(value);
    if (value === INFINITY$1 || value === -INFINITY$1) {
      var sign = (value < 0 ? -1 : 1);
      return sign * MAX_INTEGER;
    }
    return value === value ? value : 0;
  }

  var toFinite_1 = toFinite;

  /**
   * Converts `value` to an integer.
   *
   * **Note:** This method is loosely based on
   * [`ToInteger`](http://www.ecma-international.org/ecma-262/7.0/#sec-tointeger).
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to convert.
   * @returns {number} Returns the converted integer.
   * @example
   *
   * _.toInteger(3.2);
   * // => 3
   *
   * _.toInteger(Number.MIN_VALUE);
   * // => 0
   *
   * _.toInteger(Infinity);
   * // => 1.7976931348623157e+308
   *
   * _.toInteger('3.2');
   * // => 3
   */
  function toInteger(value) {
    var result = toFinite_1(value),
        remainder = result % 1;

    return result === result ? (remainder ? result - remainder : result) : 0;
  }

  var toInteger_1 = toInteger;

  /** Error message constants. */
  var FUNC_ERROR_TEXT = 'Expected a function';

  /**
   * Creates a function that invokes `func`, with the `this` binding and arguments
   * of the created function, while it's called less than `n` times. Subsequent
   * calls to the created function return the result of the last `func` invocation.
   *
   * @static
   * @memberOf _
   * @since 3.0.0
   * @category Function
   * @param {number} n The number of calls at which `func` is no longer invoked.
   * @param {Function} func The function to restrict.
   * @returns {Function} Returns the new restricted function.
   * @example
   *
   * jQuery(element).on('click', _.before(5, addContactToList));
   * // => Allows adding up to 4 contacts to the list.
   */
  function before(n, func) {
    var result;
    if (typeof func != 'function') {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    n = toInteger_1(n);
    return function() {
      if (--n > 0) {
        result = func.apply(this, arguments);
      }
      if (n <= 1) {
        func = undefined;
      }
      return result;
    };
  }

  var before_1 = before;

  /**
   * Creates a function that is restricted to invoking `func` once. Repeat calls
   * to the function return the value of the first invocation. The `func` is
   * invoked with the `this` binding and arguments of the created function.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Function
   * @param {Function} func The function to restrict.
   * @returns {Function} Returns the new restricted function.
   * @example
   *
   * var initialize = _.once(createApplication);
   * initialize();
   * initialize();
   * // => `createApplication` is invoked once
   */
  function once(func) {
    return before_1(2, func);
  }

  var once_1 = once;

  var slice = Array.prototype.slice;
  var Events = {
    // Bind an event to a `callback` function. Passing `"all"` will bind
    // the callback to all events fired.
    on: function on(name, callback, context) {
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) {
        return this;
      }

      if (!this._events) {
        this._events = {};
      }

      var events = this._events[name] || (this._events[name] = []);
      events.push({
        callback: callback,
        context: context,
        ctx: context || this
      });
      return this;
    },
    // Bind an event to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    once: function once(name, callback, context) {
      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) {
        return this;
      }

      var self = this;

      var once = once_1(function () {
        self.off(name, once);
        callback.apply(this, arguments);
      });

      once._callback = callback;
      return this.on(name, once, context);
    },
    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `name` is null, removes all bound
    // callbacks for all events.
    off: function off(name, callback, context) {
      var retain, ev, events, names, i, l, j, k;

      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) {
        return this;
      }

      if (!name && !callback && !context) {
        this._events = {};
        return this;
      }

      names = name ? [name] : keys_1(this._events);

      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];

        if (events = this._events[name]) {
          // eslint-disable-line no-cond-assign
          this._events[name] = retain = [];

          if (callback || context) {
            for (j = 0, k = events.length; j < k; j++) {
              ev = events[j];

              if (callback && callback !== ev.callback && callback !== ev.callback._callback || context && context !== ev.context) {
                retain.push(ev);
              }
            }
          }

          if (!retain.length) {
            delete this._events[name];
          }
        }
      }

      return this;
    },
    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function trigger(name) {
      if (!this._events) {
        return this;
      }

      var args = slice.call(arguments, 1);

      if (!eventsApi(this, 'trigger', name, args)) {
        return this;
      }

      var events = this._events[name];
      var allEvents = this._events.all;

      if (events) {
        triggerEvents(events, args);
      }

      if (allEvents) {
        triggerEvents(allEvents, arguments);
      }

      return this;
    },
    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function stopListening(obj, name, callback) {
      var listeners = this._listeners;

      if (!listeners) {
        return this;
      }

      var deleteListener = !name && !callback;

      if (typeof name === 'object') {
        callback = this;
      }

      if (obj) {
        (listeners = {})[obj._listenerId] = obj;
      }
      /*jshint forin:false */


      for (var id in listeners) {
        listeners[id].off(name, callback, this);

        if (deleteListener) {
          delete this._listeners[id];
        }
      }

      return this;
    }
  }; // Regular expression used to split event strings.

  var eventSplitter = /\s+/; // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.

  var eventsApi = function eventsApi(obj, action, name, rest) {
    if (!name) {
      return true;
    } // Handle event maps.


    if (typeof name === 'object') {
      /*jshint forin:false */
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }

      return false;
    } // Handle space separated event names.


    if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);

      for (var i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }

      return false;
    }

    return true;
  }; // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).


  var triggerEvents = function triggerEvents(events, args) {
    var ev,
        i = -1,
        l = events.length,
        a1 = args[0],
        a2 = args[1],
        a3 = args[2];

    switch (args.length) {
      case 0:
        while (++i < l) {
          (ev = events[i]).callback.call(ev.ctx);
        }

        return;

      case 1:
        while (++i < l) {
          (ev = events[i]).callback.call(ev.ctx, a1);
        }

        return;

      case 2:
        while (++i < l) {
          (ev = events[i]).callback.call(ev.ctx, a1, a2);
        }

        return;

      case 3:
        while (++i < l) {
          (ev = events[i]).callback.call(ev.ctx, a1, a2, a3);
        }

        return;

      default:
        while (++i < l) {
          (ev = events[i]).callback.apply(ev.ctx, args);
        }

    }
  };

  var listenMethods = {
    listenTo: 'on',
    listenToOnce: 'once'
  }; // Inversion-of-control versions of `on` and `once`. Tell *this* object to
  // listen to an event in another object ... keeping track of what it's
  // listening to.

  each(listenMethods, function (implementation, method) {
    Events[method] = function (obj, name, callback) {
      var listeners = this._listeners || (this._listeners = {});

      var id = obj._listenerId || (obj._listenerId = uniqueId_1('l'));

      listeners[id] = obj;

      if (typeof name === 'object') {
        callback = this;
      }

      obj[implementation](name, callback, this);
      return this;
    };
  });

  const version="2.0.0";

  let idCounter$1 = 0;
  function uniqueId$1(prefix) {
    var id = ++idCounter$1;
    return prefix + id;
  }

  /*
   * The speaker object encapsulates the SoundManager2 code and boils it down
   * to the following api:
   *
   *    speaker().initializeAudio(): many clients can only start using
   *      speaker when handling an 'onClick' event. This call should be made 
   *      at that time to get audio initialized while waiting for details
   *      of what to play from the server. 
   *
   *    speaker().setVolume(value): set the volume from 0 (mute) - 100 (full volume)
   *
   *    var sound = speaker().create(url, optionsAndEvents): create a new sound from the
   *       given url and return a 'song' object that can be used to pause/play/
   *       destroy the song and receive trigger events as the song plays/stops. 
   *
   *       The 'optionsAndEvents' is an object that lets you specify event
   *       handlers and options:
   *
   *          startPosition:  specifies the time offset (in milliseconds) that the
   *                          sound should begin playback at when we begin playback.
   *          endPosition:    specifies the time offset (in milliseconds) that the
   *                          sound should stop playback 
   *          fadeInSeconds:  # of seconds to fade in audio
   *          fadeOutSeconds: # of seconds to fade out audio
   *          play:           event handler for 'play' event
   *          pause:          event handler for 'pause' event
   *          finish:         event handler for 'finish' event
   *          elapse:         event handler for 'elapse' event
   *
   *       The returned object emits the following events:
   *         play: the song has started playing or resumed playing after pause
   *         pause: the song has paused playback
   *         finish: the song has completed playback and the song object
   *           is no longer usable and should be destroyed
   *         elapse: song playback has elapsed
   *
   *       The events should be received in this order only:
   *         ( play -> ( pause | play )* -> )? finish
   *
   *       Note that I represent play failures as a 'finish' call, so if
   *       we can't load a song, it will just get a 'finish' and no 'play'.
   *       The 'finish' event will have a 'true' argument passed to it on
   *       some kind of error, so you can treat those differently.
   *
   *       The returned song object has this following api:
   *         play: start playback (at the 'startPosition', if specified)
   *         pause: pause playback
   *         resume: resume playback
   *         destroy: stop playback, prevent any future playback, and free up memory
   *
   * This module returns a function that returns a speaker singleton so everybody
   * is using the same instance.
   *
   * Proper usage looks like this:
   *
   *   require([ 'feed/speaker' ], function(speaker) {
   *     var mySpeaker = speaker(options, onReady);
   *   });
   *
   * That will make sure that all code uses the same speaker instance. 'options'
   * is optional, and is an object with any of the following keys:
   *
   *   debug: if true, emit debug information to the console
   *
   * The first function call to 'speaker()' is what configures and defines the
   * speaker - and subsequent calls just return the already-created instance.
   * I think this is a poor interface, but I don't have a better one at the
   * moment.
   *
   */
  const iOSp = /(iPhone|iPad)/i.test(navigator.userAgent);
  const SILENCE = iOSp ? 'https://u9e9h7z5.map2.ssl.hwcdn.net/feedfm-audio/250-milliseconds-of-silence.mp3' : 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

  var Sound = function Sound(speaker, options, id, url) {
    var obj = Object.assign(this, Events);
    obj.id = id; //url = url.replace('u9e9h7z5.map2.ssl.hwcdn.net', 's3.amazonaws.com');

    obj.url = url;
    obj.speaker = speaker;
    obj.loaded = false;

    if (options) {
      this.startPosition = +options.startPosition;
      this.endPosition = +options.endPosition;
      this.fadeInSeconds = +options.fadeInSeconds;

      if (this.fadeInSeconds) {
        this.fadeInStart = this.startPosition ? this.startPosition / 1000 : 0;
        this.fadeInEnd = this.fadeInStart + this.fadeInSeconds;
      } else {
        this.fadeInStart = 0;
        this.fadeInEnd = 0;
      }

      this.fadeOutSeconds = +options.fadeOutSeconds;

      if (this.fadeOutSeconds) {
        if (this.endPosition) {
          this.fadeOutStart = this.endPosition / 1000 - this.fadeOutSeconds;
          this.fadeOutEnd = this.endPosition / 1000;
        } else {
          this.fadeOutStart = 0;
          this.fadeOutEnd = 0;
        }
      }

      var _arr = ['play', 'pause', 'finish', 'elapse'];

      for (var _i = 0; _i < _arr.length; _i++) {
        let ev = _arr[_i];

        if (ev in options) {
          obj.on(ev, options[ev]);
        }
      }

      this.gain = options.gain || 0;
    } else {
      this.gain = 0;
    }

    return obj;
  };

  function d(audio) {
    return ' src = ' + audio.src + ', time = ' + audio.currentTime + ', paused = ' + audio.paused + ', duration = ' + audio.duration + ', readyState = ' + audio.readyState;
  }

  Sound.prototype = {
    play: function play() {
      log(this.id + ' sound play');
      return this.speaker._playSound(this);
    },
    // pause playback of the current sound clip
    pause: function pause() {
      log(this.id + ' sound pause');
      return this.speaker._pauseSound(this);
    },
    // resume playback of the current sound clip
    resume: function resume() {
      log(this.id + ' sound resume');
      return this.speaker._playSound(this);
    },
    // elapsed number of milliseconds played
    position: function position() {
      //log(this.id + ' sound position');
      return this.speaker._position(this);
    },
    // duration in milliseconds of the song
    // (this may change until the song is full loaded)
    duration: function duration() {
      //log(this.id + ' sound duration');
      return this.speaker._duration(this);
    },
    // stop playing the given sound clip, unload it, and disable events
    destroy: function destroy() {
      log(this.id + ' being called to destroy');

      this.speaker._destroySound(this);
    },
    gainAdjustedVolume: function gainAdjustedVolume(volume) {
      if (!this.gain) {
        log('no volume adjustment');
        return volume / 100;
      }

      var adjusted = Math.max(Math.min(volume / 100 * (50 * Math.pow(10, this.gain / 20)), 100), 0) / 100; //log('gain adjustment is ' + this.gain + ', and final adjusted volume is ' + adjusted);

      return adjusted;
    }
  };

  var Speaker = function Speaker() {};

  function createAudioContext() {
    var AudioCtor = window.AudioContext || window.webkitAudioContext;
    let desiredSampleRate = 44100;
    var context = new AudioCtor(); // Check if hack is necessary. Only occurs in iOS6+ devices
    // and only when you first boot the iPhone, or play a audio/video
    // with a different sample rate

    if (context.sampleRate !== desiredSampleRate) {
      var buffer = context.createBuffer(1, 1, desiredSampleRate);
      var dummy = context.createBufferSource();
      dummy.buffer = buffer;
      dummy.connect(context.destination);
      dummy.start(0);
      dummy.disconnect();
      context.close(); // dispose old context

      context = new AudioCtor();
    }

    return context;
  }

  Speaker.prototype = {
    vol: 100,
    // 0..100
    outstandingPlays: {},
    audioContext: null,
    // for mobile safari
    active: null,
    // active audio element, sound, and gain node
    fading: null,
    // fading audio element, sound, and gain node
    preparing: null,
    // preparing audio element, sound, and gain node
    prepareWhenReady: null,
    // url to prepare when active player is fully loaded
    initializeAudio: function initializeAudio() {
      // On mobile devices, we need to kick off playback of a sound in
      // response to a user event. This does that.
      if (this.active === null) {
        log('initializing for mobile');
        this.audioContext = createAudioContext();
        this.active = this._createAudio(SILENCE);
        this.fading = this._createAudio(SILENCE);
        this.preparing = this._createAudio(this.prepareWhenReady ? this.prepareWhenReady : SILENCE);
        this.prepareWhenReady = null;
      } else {
        log('mobile already initialized');
      }
    },
    getSupportedFormats: function getSupportedFormats() {
      if (document.createElement('audio').canPlayType('audio/aac')) {
        return 'aac,mp3';
      } else {
        return 'mp3';
      }
    },
    _createAudioGainNode: function _createAudioGainNode(audio) {
      var source = this.audioContext.createMediaElementSource(audio);
      var gainNode = this.audioContext.createGain();
      gainNode.gain.value = 1.0;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      return gainNode.gain;
    },
    _createAudio: function _createAudio(url) {
      var DEFAULT_VOLUME = 1.0;
      var audio = new Audio(url);
      audio.crossOrigin = 'anonymous';
      audio.loop = false;
      audio.volume = DEFAULT_VOLUME;

      this._addEventListeners(audio); // iOS volume adjustment


      var gain = null;

      if (iOSp) {
        var source = this.audioContext.createMediaElementSource(audio);
        var gainNode = this.audioContext.createGain();
        gainNode.gain.value = DEFAULT_VOLUME;
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        gain = gainNode.gain;
      }

      return {
        audio: audio,
        sound: null,
        gain: gain,
        volume: DEFAULT_VOLUME
      };
    },
    _addEventListeners: function _addEventListeners(audio) {
      audio.addEventListener('pause', this._onAudioPauseEvent.bind(this));
      audio.addEventListener('ended', this._onAudioEndedEvent.bind(this));
      audio.addEventListener('timeupdate', this._onAudioTimeUpdateEvent.bind(this)); //this._debugAudioObject(audio);
    },
    _onAudioPauseEvent: function _onAudioPauseEvent(event) {
      var audio = event.currentTarget;

      if (audio.src === SILENCE) {
        return;
      }

      if (audio !== this.active.audio || audio.currentTime === audio.duration) {
        return;
      }

      if (!this.active.sound || this.active.sound.url !== audio.src) {
        log('active audio pause, but no matching sound');
        return;
      }

      this.active.sound.trigger('pause');
    },
    _onAudioEndedEvent: function _onAudioEndedEvent(event) {
      var audio = event.currentTarget;

      if (audio.src === SILENCE) {
        return;
      }

      if (audio === this.fading.audio) {
        audio.src = SILENCE;
        this.fading.sound = null;
        return;
      }

      if (audio !== this.active.audio) {
        return;
      }

      if (!this.active.sound || this.active.sound.url !== audio.src) {
        log('active audio ended, but no matching sound', audio.src);
        return;
      }

      log('active audio ended');
      var sound = this.active.sound;
      this.active.sound = null;
      sound.trigger('finish');
    },
    _onAudioTimeUpdateEvent: function _onAudioTimeUpdateEvent(event) {
      var audio = event.currentTarget;

      if (audio.src === SILENCE) {
        return;
      }

      if (audio === this.fading.audio && this.fading.sound) {
        if (this.fading.sound.endPosition && audio.currentTime >= this.fading.sound.endPosition / 1000) {
          this.fading.sound = null;
          this.fading.audio.src = SILENCE;
        } else {
          this._setVolume(this.fading);
        }

        return;
      }

      if (audio !== this.active.audio) {
        return;
      }

      if (!this.active.sound || this.active.sound.url !== audio.src) {
        log('active audio elapsed, but it no matching sound');
        return;
      }

      if (this.active.sound.endPosition && this.active.sound.endPosition / 1000 <= audio.currentTime) {
        // song reached end of play
        var sound = this.active.sound;
        this.active.sound = null;
        this.active.audio.src = SILENCE;
        sound.trigger('finish');
      } else if (this.active.sound.fadeOutEnd && audio.currentTime >= this.active.sound.fadeOutStart) {
        // song hit start of fade out
        this._setVolume(this.active); // active becomes fading, and fading becomes active


        var fading = this.fading;
        this.fading = this.active;
        this.active = fading;
        this.active.sound = null; // not used any more
        // pretend the song finished

        this.fading.sound.trigger('finish');
      } else {
        log('elapse volume');

        this._setVolume(this.active);

        this.active.sound.trigger('elapse');
      }

      if (this.prepareWhenReady) {
        this.prepare(this.prepareWhenReady);
      }
    },
    _setVolume: function _setVolume(audioGroup, sound) {
      if (!sound) {
        sound = audioGroup.sound;
      }

      var currentTime = audioGroup.audio.currentTime;
      var currentVolume = audioGroup.volume;
      var calculatedVolume = sound.gainAdjustedVolume(this.vol);

      if (sound.fadeInStart != sound.fadeInEnd && currentTime < sound.fadeInStart) {
        calculatedVolume = 0;
        log('pre-fade-in volume is 0');
      } else if (sound.fadeInStart != sound.fadeInEnd && currentTime >= sound.fadeInStart && currentTime <= sound.fadeInEnd) {
        // ramp up from 0 - 100%
        calculatedVolume = (currentTime - sound.fadeInStart) / (sound.fadeInEnd - sound.fadeInStart) * calculatedVolume;
        log('ramping ▲ volume', {
          currentTime: currentTime,
          currentVolume: currentVolume,
          calculatedVolume: calculatedVolume,
          sound: sound
        });
      } else if (sound.fadeOutStart != sound.fadeOutEnd && currentTime > sound.fadeOutEnd) {
        calculatedVolume = 0;
        log('post-fade-out volume is 0');
      } else if (sound.fadeOutStart != sound.fadeOutEnd && currentTime >= sound.fadeOutStart && currentTime <= sound.fadeOutEnd) {
        // ramp down from 100% to 0
        calculatedVolume = (1 - (currentTime - sound.fadeOutStart) / (sound.fadeOutEnd - sound.fadeOutStart)) * calculatedVolume;
        log('ramping ▼ volume', {
          currentTime: currentTime,
          currentVolume: currentVolume,
          calculatedVolume: calculatedVolume,
          sound: sound
        });
      } else {
        log('updating volume', {
          currentTime: currentTime,
          currentVolume: currentVolume,
          calculatedVolume: calculatedVolume,
          sound: sound
        });
      }

      if (currentVolume != calculatedVolume) {
        if (iOSp) {
          audioGroup.gain.value = calculatedVolume;
        } else {
          audioGroup.audio.volume = calculatedVolume;
        }

        audioGroup.volume = calculatedVolume;
      }
    },
    _debugAudioObject: function _debugAudioObject(object) {
      var events = ['abort', 'load', 'loadend', 'loadstart', 'loadeddata', 'loadedmetadata', 'canplay', 'canplaythrough', 'seeked', 'seeking', 'stalled', 'timeupdate', 'volumechange', 'waiting', 'durationchange', 'progress', 'emptied', 'ended', 'play', 'pause'];
      var speaker = this;

      for (var i = 0; i < events.length; i++) {
        object.addEventListener(events[i], function (event) {
          var audio = event.currentTarget;
          var name = audio === speaker.active.audio ? 'active' : audio === speaker.preparing.audio ? 'preparing' : 'fading';
          log(name + ': ' + event.type);
          log('    active: ' + d(speaker.active.audio));
          log('    preparing: ' + d(speaker.preparing.audio));
          log('    fading: ' + d(speaker.fading.audio));

          if (audio.src === SILENCE) {
            return;
          }
        });
      }
    },
    // Create and return new sound object. This throws the song into
    // the preparing audio instance.
    create: function create(url, optionsAndCallbacks) {
      var id = uniqueId$1('feed-play-');
      var sound = new Sound(this, optionsAndCallbacks, id, url);
      log('created play ' + id + ' (' + url + ')', optionsAndCallbacks);
      this.outstandingPlays[sound.id] = sound; // start loading sound, if we can

      if (!this.active.audio) {
        this.prepareWhenReady = sound.url;
      } else {
        this._prepare(sound.url, sound.startPosition);
      }

      return sound;
    },
    prepare: function prepare(url) {
      if (!this.active.audio) {
        this.prepareWhenReady = url;
        return;
      }

      var ranges = this.active.audio.buffered;

      if (ranges.length > 0 && ranges.end(ranges.length - 1) >= this.active.audio.duration) {
        return this._prepare(url, 0);
      }

      if (this.active.audio.url === SILENCE) {
        return this._prepare(url, 0);
      } // still loading primary audio - so hold off for now


      this.prepareWhenReady = url;
    },
    _prepare: function _prepare(url, startPosition) {
      // empty out any pending request
      this.prepareWhenReady = null;

      if (this.preparing.audio.src !== url) {
        log('preparing ' + url);
        this.preparing.audio.src = url;
      }

      if (startPosition && this.preparing.audio.currentTime !== startPosition) {
        log('advancing preparing audio to', startPosition / 1000);
        this.preparing.audio.currentTime = startPosition / 1000;
      }
    },

    /*
     * Kick off playback of the requested sound.
     */
    _playSound: function _playSound(sound) {
      var speaker = this;

      if (!this.active.audio) {
        console.error('**** player.initializeAudio() *** not called');
        return;
      }

      if (this.active.sound === sound) {
        if (this.active.audio.paused) {
          log(sound.id + ' was paused, so resuming'); // resume playback

          this.active.audio.play().then(function () {
            log('resumed playback');
            sound.trigger('play');
          }).catch(function () {
            log('error resuming playback');
            speaker.active.sound = null;
            sound.trigger('finish');
          });

          if (this.fading.sound) {
            this.fading.audio.play().then(function () {
              log('resumed fading playback');
            }).catch(function () {
              log('error resuming fading playback');
              speaker.fading.sound = null;
              speaker.fading.audio.src = SILENCE;
            });
          }
        } else {
          log(sound.id + ' is already playing');
        }
      } else {
        if (this.preparing.audio.src !== sound.url) {
          this._prepare(sound.url, sound.startPosition);
          /*
                } else if (sound.startPosition && (this.preparing.audio.currentTime !== sound.startPosition)) {
                  log('advancing prepared audio to', sound.startPosition / 1000);
                  this.preparing.audio.currentTime = sound.startPosition / 1000;
                  */

        } // swap prepared -> active


        var active = this.active;
        this.active = this.preparing;
        this.preparing = active; // don't throw sound object in active until playback starts (below)

        this.active.sound = null;

        this._setVolume(this.active, sound); // reset audio element for finished song


        this.preparing.audio.src = SILENCE; // notify clients that whatever was previously playing has finished

        if (this.preparing.sound) {
          var finishedSound = this.preparing.sound;
          this.preparing.sound = null;
          finishedSound.trigger('finish');
        }

        log(sound.id + ' starting');
        this.active.audio.play().then(function () {
          log('success starting playback');
          speaker.active.sound = sound; // configure fade-out now that metadata is loaded

          if (sound.fadeOutSeconds && sound.fadeOutEnd === 0) {
            sound.fadeOutStart = speaker.active.audio.duration - sound.fadeOutSeconds;
            sound.fadeOutEnd = speaker.active.audio.duration;
          }

          if (sound.startPosition) {
            log('updating start position');
            speaker.active.audio.currentTime = sound.startPosition / 1000;
            log('updated');
          }

          var paused = speaker.active.audio.paused;
          sound.trigger('play');

          if (paused) {
            sound.trigger('pause');
          }
        }).catch(function (error) {
          log('error starting playback', error);
          sound.trigger('finish', error);
        });
      }
    },
    _destroySound: function _destroySound(sound) {
      log('want to destroy, and current is', sound, this.active.sound);
      sound.off();

      if (this.active.sound === sound) {
        log('destroy triggered for current sound', sound.id);
        this.active.audio.pause();
      }

      delete this.outstandingPlays[this.id];
    },
    _pauseSound: function _pauseSound(sound) {
      if (sound != null && sound !== this.active.sound) {
        return;
      }

      this.active.audio.pause();

      if (this.fading.sound) {
        this.fading.audio.pause();
      }
    },
    _position: function _position(sound) {
      if (sound === this.active.sound) {
        if (sound.url !== this.active.audio.src) {
          log('trying to get current song position, but it is not in the active audio player');
        }

        return Math.floor(this.active.audio.currentTime * 1000);
      } else {
        return 0;
      }
    },
    _duration: function _duration(sound) {
      if (sound === this.active.sound) {
        if (sound.url !== this.active.audio.src) {
          log('trying to get current song duration, but it is not in the active audio player');
        }

        var d = this.active.audio.duration;
        return isNaN(d) ? 0 : Math.floor(d * 1000);
      } else {
        return 0;
      }
    },
    // set the volume (0-100)
    setVolume: function setVolume(value) {
      if (typeof value !== 'undefined') {
        this.vol = value;

        if (this.active && this.active.sound) {
          this._setVolume(this.active);
        }

        this.trigger('volume', value);
      }

      return this.vol;
    }
  }; // add events to speaker class

  Object.assign(Speaker.prototype, Events);

  log('this is a test!');
  let foo = Object.assign({}, Events);
  foo.on('blah', () => {
    log('got a blah event!');
  });
  foo.trigger('blah');
  let speaker = new Speaker();
  log('we can play', speaker.getSupportedFormats());
  log('version is ' + version);

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGQuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy9sb2cuanMiLCIuLi9ub2RlX21vZHVsZXMvY29yZS1qcy9tb2R1bGVzL19pcy1vYmplY3QuanMiLCIuLi9ub2RlX21vZHVsZXMvY29yZS1qcy9tb2R1bGVzL19hbi1vYmplY3QuanMiLCIuLi9ub2RlX21vZHVsZXMvY29yZS1qcy9tb2R1bGVzL19mYWlscy5qcyIsIi4uL25vZGVfbW9kdWxlcy9jb3JlLWpzL21vZHVsZXMvX2Rlc2NyaXB0b3JzLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NvcmUtanMvbW9kdWxlcy9fZ2xvYmFsLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NvcmUtanMvbW9kdWxlcy9fZG9tLWNyZWF0ZS5qcyIsIi4uL25vZGVfbW9kdWxlcy9jb3JlLWpzL21vZHVsZXMvX2llOC1kb20tZGVmaW5lLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NvcmUtanMvbW9kdWxlcy9fdG8tcHJpbWl0aXZlLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NvcmUtanMvbW9kdWxlcy9fb2JqZWN0LWRwLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NvcmUtanMvbW9kdWxlcy9fcHJvcGVydHktZGVzYy5qcyIsIi4uL25vZGVfbW9kdWxlcy9jb3JlLWpzL21vZHVsZXMvX2hpZGUuanMiLCIuLi9ub2RlX21vZHVsZXMvY29yZS1qcy9tb2R1bGVzL19oYXMuanMiLCIuLi9ub2RlX21vZHVsZXMvY29yZS1qcy9tb2R1bGVzL191aWQuanMiLCIuLi9ub2RlX21vZHVsZXMvY29yZS1qcy9tb2R1bGVzL19jb3JlLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NvcmUtanMvbW9kdWxlcy9fcmVkZWZpbmUuanMiLCIuLi9ub2RlX21vZHVsZXMvY29yZS1qcy9tb2R1bGVzL19kZWZpbmVkLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NvcmUtanMvbW9kdWxlcy9fbGlicmFyeS5qcyIsIi4uL25vZGVfbW9kdWxlcy9jb3JlLWpzL21vZHVsZXMvX3NoYXJlZC5qcyIsIi4uL25vZGVfbW9kdWxlcy9jb3JlLWpzL21vZHVsZXMvX3drcy5qcyIsIi4uL25vZGVfbW9kdWxlcy9jb3JlLWpzL21vZHVsZXMvX2ZpeC1yZS13a3MuanMiLCIuLi9ub2RlX21vZHVsZXMvY29yZS1qcy9tb2R1bGVzL19jb2YuanMiLCIuLi9ub2RlX21vZHVsZXMvY29yZS1qcy9tb2R1bGVzL19pcy1yZWdleHAuanMiLCIuLi9ub2RlX21vZHVsZXMvY29yZS1qcy9tb2R1bGVzL2VzNi5yZWdleHAuc3BsaXQuanMiLCIuLi9ub2RlX21vZHVsZXMvbG9kYXNoL19mcmVlR2xvYmFsLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2xvZGFzaC9fcm9vdC5qcyIsIi4uL25vZGVfbW9kdWxlcy9sb2Rhc2gvX1N5bWJvbC5qcyIsIi4uL25vZGVfbW9kdWxlcy9sb2Rhc2gvX2FycmF5TWFwLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2xvZGFzaC9pc0FycmF5LmpzIiwiLi4vbm9kZV9tb2R1bGVzL2xvZGFzaC9fZ2V0UmF3VGFnLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2xvZGFzaC9fb2JqZWN0VG9TdHJpbmcuanMiLCIuLi9ub2RlX21vZHVsZXMvbG9kYXNoL19iYXNlR2V0VGFnLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2xvZGFzaC9pc09iamVjdExpa2UuanMiLCIuLi9ub2RlX21vZHVsZXMvbG9kYXNoL2lzU3ltYm9sLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2xvZGFzaC9fYmFzZVRvU3RyaW5nLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2xvZGFzaC90b1N0cmluZy5qcyIsIi4uL25vZGVfbW9kdWxlcy9sb2Rhc2gvdW5pcXVlSWQuanMiLCIuLi9ub2RlX21vZHVsZXMvbG9kYXNoL19hcnJheUVhY2guanMiLCIuLi9ub2RlX21vZHVsZXMvbG9kYXNoL19jcmVhdGVCYXNlRm9yLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2xvZGFzaC9fYmFzZUZvci5qcyIsIi4uL25vZGVfbW9kdWxlcy9sb2Rhc2gvX2Jhc2VUaW1lcy5qcyIsIi4uL25vZGVfbW9kdWxlcy9sb2Rhc2gvX2Jhc2VJc0FyZ3VtZW50cy5qcyIsIi4uL25vZGVfbW9kdWxlcy9sb2Rhc2gvaXNBcmd1bWVudHMuanMiLCIuLi9ub2RlX21vZHVsZXMvbG9kYXNoL3N0dWJGYWxzZS5qcyIsIi4uL25vZGVfbW9kdWxlcy9sb2Rhc2gvaXNCdWZmZXIuanMiLCIuLi9ub2RlX21vZHVsZXMvbG9kYXNoL19pc0luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL2xvZGFzaC9pc0xlbmd0aC5qcyIsIi4uL25vZGVfbW9kdWxlcy9sb2Rhc2gvX2Jhc2VJc1R5cGVkQXJyYXkuanMiLCIuLi9ub2RlX21vZHVsZXMvbG9kYXNoL19iYXNlVW5hcnkuanMiLCIuLi9ub2RlX21vZHVsZXMvbG9kYXNoL19ub2RlVXRpbC5qcyIsIi4uL25vZGVfbW9kdWxlcy9sb2Rhc2gvaXNUeXBlZEFycmF5LmpzIiwiLi4vbm9kZV9tb2R1bGVzL2xvZGFzaC9fYXJyYXlMaWtlS2V5cy5qcyIsIi4uL25vZGVfbW9kdWxlcy9sb2Rhc2gvX2lzUHJvdG90eXBlLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2xvZGFzaC9fb3ZlckFyZy5qcyIsIi4uL25vZGVfbW9kdWxlcy9sb2Rhc2gvX25hdGl2ZUtleXMuanMiLCIuLi9ub2RlX21vZHVsZXMvbG9kYXNoL19iYXNlS2V5cy5qcyIsIi4uL25vZGVfbW9kdWxlcy9sb2Rhc2gvaXNPYmplY3QuanMiLCIuLi9ub2RlX21vZHVsZXMvbG9kYXNoL2lzRnVuY3Rpb24uanMiLCIuLi9ub2RlX21vZHVsZXMvbG9kYXNoL2lzQXJyYXlMaWtlLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2xvZGFzaC9rZXlzLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2xvZGFzaC9fYmFzZUZvck93bi5qcyIsIi4uL25vZGVfbW9kdWxlcy9sb2Rhc2gvX2NyZWF0ZUJhc2VFYWNoLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2xvZGFzaC9fYmFzZUVhY2guanMiLCIuLi9ub2RlX21vZHVsZXMvbG9kYXNoL2lkZW50aXR5LmpzIiwiLi4vbm9kZV9tb2R1bGVzL2xvZGFzaC9fY2FzdEZ1bmN0aW9uLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2xvZGFzaC9mb3JFYWNoLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2xvZGFzaC9lYWNoLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2xvZGFzaC90b051bWJlci5qcyIsIi4uL25vZGVfbW9kdWxlcy9sb2Rhc2gvdG9GaW5pdGUuanMiLCIuLi9ub2RlX21vZHVsZXMvbG9kYXNoL3RvSW50ZWdlci5qcyIsIi4uL25vZGVfbW9kdWxlcy9sb2Rhc2gvYmVmb3JlLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2xvZGFzaC9vbmNlLmpzIiwiLi4vc3JjL2V2ZW50cy5qcyIsIi4uL3NyYy91dGlsLmpzIiwiLi4vc3JjL3NwZWFrZXIuanMiLCIuLi9zcmMvZGV2LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUgKi9cblxuLy8gbG9nKCkgLS0gVGhlIGNvbXBsZXRlLCBjcm9zcy1icm93c2VyICh3ZSBkb24ndCBqdWRnZSEpIGNvbnNvbGUubG9nIHdyYXBwZXIgZm9yIGhpcyBvciBoZXIgbG9nZ2luZyBwbGVhc3VyZVxudmFyIGxvZyA9IGZ1bmN0aW9uICgpIHtcbiAgY29uc29sZS5sb2cuYXBwbHkoIGNvbnNvbGUsIFsgLi4uYXJndW1lbnRzIF0pO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgbG9nO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoaXQpIHtcbiAgcmV0dXJuIHR5cGVvZiBpdCA9PT0gJ29iamVjdCcgPyBpdCAhPT0gbnVsbCA6IHR5cGVvZiBpdCA9PT0gJ2Z1bmN0aW9uJztcbn07XG4iLCJ2YXIgaXNPYmplY3QgPSByZXF1aXJlKCcuL19pcy1vYmplY3QnKTtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGl0KSB7XG4gIGlmICghaXNPYmplY3QoaXQpKSB0aHJvdyBUeXBlRXJyb3IoaXQgKyAnIGlzIG5vdCBhbiBvYmplY3QhJyk7XG4gIHJldHVybiBpdDtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChleGVjKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuICEhZXhlYygpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn07XG4iLCIvLyBUaGFuaydzIElFOCBmb3IgaGlzIGZ1bm55IGRlZmluZVByb3BlcnR5XG5tb2R1bGUuZXhwb3J0cyA9ICFyZXF1aXJlKCcuL19mYWlscycpKGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh7fSwgJ2EnLCB7IGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gNzsgfSB9KS5hICE9IDc7XG59KTtcbiIsIi8vIGh0dHBzOi8vZ2l0aHViLmNvbS96bG9pcm9jay9jb3JlLWpzL2lzc3Vlcy84NiNpc3N1ZWNvbW1lbnQtMTE1NzU5MDI4XG52YXIgZ2xvYmFsID0gbW9kdWxlLmV4cG9ydHMgPSB0eXBlb2Ygd2luZG93ICE9ICd1bmRlZmluZWQnICYmIHdpbmRvdy5NYXRoID09IE1hdGhcbiAgPyB3aW5kb3cgOiB0eXBlb2Ygc2VsZiAhPSAndW5kZWZpbmVkJyAmJiBzZWxmLk1hdGggPT0gTWF0aCA/IHNlbGZcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLW5ldy1mdW5jXG4gIDogRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKTtcbmlmICh0eXBlb2YgX19nID09ICdudW1iZXInKSBfX2cgPSBnbG9iYWw7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tdW5kZWZcbiIsInZhciBpc09iamVjdCA9IHJlcXVpcmUoJy4vX2lzLW9iamVjdCcpO1xudmFyIGRvY3VtZW50ID0gcmVxdWlyZSgnLi9fZ2xvYmFsJykuZG9jdW1lbnQ7XG4vLyB0eXBlb2YgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCBpcyAnb2JqZWN0JyBpbiBvbGQgSUVcbnZhciBpcyA9IGlzT2JqZWN0KGRvY3VtZW50KSAmJiBpc09iamVjdChkb2N1bWVudC5jcmVhdGVFbGVtZW50KTtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGl0KSB7XG4gIHJldHVybiBpcyA/IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoaXQpIDoge307XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSAhcmVxdWlyZSgnLi9fZGVzY3JpcHRvcnMnKSAmJiAhcmVxdWlyZSgnLi9fZmFpbHMnKShmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBPYmplY3QuZGVmaW5lUHJvcGVydHkocmVxdWlyZSgnLi9fZG9tLWNyZWF0ZScpKCdkaXYnKSwgJ2EnLCB7IGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gNzsgfSB9KS5hICE9IDc7XG59KTtcbiIsIi8vIDcuMS4xIFRvUHJpbWl0aXZlKGlucHV0IFssIFByZWZlcnJlZFR5cGVdKVxudmFyIGlzT2JqZWN0ID0gcmVxdWlyZSgnLi9faXMtb2JqZWN0Jyk7XG4vLyBpbnN0ZWFkIG9mIHRoZSBFUzYgc3BlYyB2ZXJzaW9uLCB3ZSBkaWRuJ3QgaW1wbGVtZW50IEBAdG9QcmltaXRpdmUgY2FzZVxuLy8gYW5kIHRoZSBzZWNvbmQgYXJndW1lbnQgLSBmbGFnIC0gcHJlZmVycmVkIHR5cGUgaXMgYSBzdHJpbmdcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGl0LCBTKSB7XG4gIGlmICghaXNPYmplY3QoaXQpKSByZXR1cm4gaXQ7XG4gIHZhciBmbiwgdmFsO1xuICBpZiAoUyAmJiB0eXBlb2YgKGZuID0gaXQudG9TdHJpbmcpID09ICdmdW5jdGlvbicgJiYgIWlzT2JqZWN0KHZhbCA9IGZuLmNhbGwoaXQpKSkgcmV0dXJuIHZhbDtcbiAgaWYgKHR5cGVvZiAoZm4gPSBpdC52YWx1ZU9mKSA9PSAnZnVuY3Rpb24nICYmICFpc09iamVjdCh2YWwgPSBmbi5jYWxsKGl0KSkpIHJldHVybiB2YWw7XG4gIGlmICghUyAmJiB0eXBlb2YgKGZuID0gaXQudG9TdHJpbmcpID09ICdmdW5jdGlvbicgJiYgIWlzT2JqZWN0KHZhbCA9IGZuLmNhbGwoaXQpKSkgcmV0dXJuIHZhbDtcbiAgdGhyb3cgVHlwZUVycm9yKFwiQ2FuJ3QgY29udmVydCBvYmplY3QgdG8gcHJpbWl0aXZlIHZhbHVlXCIpO1xufTtcbiIsInZhciBhbk9iamVjdCA9IHJlcXVpcmUoJy4vX2FuLW9iamVjdCcpO1xudmFyIElFOF9ET01fREVGSU5FID0gcmVxdWlyZSgnLi9faWU4LWRvbS1kZWZpbmUnKTtcbnZhciB0b1ByaW1pdGl2ZSA9IHJlcXVpcmUoJy4vX3RvLXByaW1pdGl2ZScpO1xudmFyIGRQID0gT2JqZWN0LmRlZmluZVByb3BlcnR5O1xuXG5leHBvcnRzLmYgPSByZXF1aXJlKCcuL19kZXNjcmlwdG9ycycpID8gT2JqZWN0LmRlZmluZVByb3BlcnR5IDogZnVuY3Rpb24gZGVmaW5lUHJvcGVydHkoTywgUCwgQXR0cmlidXRlcykge1xuICBhbk9iamVjdChPKTtcbiAgUCA9IHRvUHJpbWl0aXZlKFAsIHRydWUpO1xuICBhbk9iamVjdChBdHRyaWJ1dGVzKTtcbiAgaWYgKElFOF9ET01fREVGSU5FKSB0cnkge1xuICAgIHJldHVybiBkUChPLCBQLCBBdHRyaWJ1dGVzKTtcbiAgfSBjYXRjaCAoZSkgeyAvKiBlbXB0eSAqLyB9XG4gIGlmICgnZ2V0JyBpbiBBdHRyaWJ1dGVzIHx8ICdzZXQnIGluIEF0dHJpYnV0ZXMpIHRocm93IFR5cGVFcnJvcignQWNjZXNzb3JzIG5vdCBzdXBwb3J0ZWQhJyk7XG4gIGlmICgndmFsdWUnIGluIEF0dHJpYnV0ZXMpIE9bUF0gPSBBdHRyaWJ1dGVzLnZhbHVlO1xuICByZXR1cm4gTztcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChiaXRtYXAsIHZhbHVlKSB7XG4gIHJldHVybiB7XG4gICAgZW51bWVyYWJsZTogIShiaXRtYXAgJiAxKSxcbiAgICBjb25maWd1cmFibGU6ICEoYml0bWFwICYgMiksXG4gICAgd3JpdGFibGU6ICEoYml0bWFwICYgNCksXG4gICAgdmFsdWU6IHZhbHVlXG4gIH07XG59O1xuIiwidmFyIGRQID0gcmVxdWlyZSgnLi9fb2JqZWN0LWRwJyk7XG52YXIgY3JlYXRlRGVzYyA9IHJlcXVpcmUoJy4vX3Byb3BlcnR5LWRlc2MnKTtcbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9fZGVzY3JpcHRvcnMnKSA/IGZ1bmN0aW9uIChvYmplY3QsIGtleSwgdmFsdWUpIHtcbiAgcmV0dXJuIGRQLmYob2JqZWN0LCBrZXksIGNyZWF0ZURlc2MoMSwgdmFsdWUpKTtcbn0gOiBmdW5jdGlvbiAob2JqZWN0LCBrZXksIHZhbHVlKSB7XG4gIG9iamVjdFtrZXldID0gdmFsdWU7XG4gIHJldHVybiBvYmplY3Q7XG59O1xuIiwidmFyIGhhc093blByb3BlcnR5ID0ge30uaGFzT3duUHJvcGVydHk7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChpdCwga2V5KSB7XG4gIHJldHVybiBoYXNPd25Qcm9wZXJ0eS5jYWxsKGl0LCBrZXkpO1xufTtcbiIsInZhciBpZCA9IDA7XG52YXIgcHggPSBNYXRoLnJhbmRvbSgpO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoa2V5KSB7XG4gIHJldHVybiAnU3ltYm9sKCcuY29uY2F0KGtleSA9PT0gdW5kZWZpbmVkID8gJycgOiBrZXksICcpXycsICgrK2lkICsgcHgpLnRvU3RyaW5nKDM2KSk7XG59O1xuIiwidmFyIGNvcmUgPSBtb2R1bGUuZXhwb3J0cyA9IHsgdmVyc2lvbjogJzIuNS43JyB9O1xuaWYgKHR5cGVvZiBfX2UgPT0gJ251bWJlcicpIF9fZSA9IGNvcmU7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tdW5kZWZcbiIsInZhciBnbG9iYWwgPSByZXF1aXJlKCcuL19nbG9iYWwnKTtcbnZhciBoaWRlID0gcmVxdWlyZSgnLi9faGlkZScpO1xudmFyIGhhcyA9IHJlcXVpcmUoJy4vX2hhcycpO1xudmFyIFNSQyA9IHJlcXVpcmUoJy4vX3VpZCcpKCdzcmMnKTtcbnZhciBUT19TVFJJTkcgPSAndG9TdHJpbmcnO1xudmFyICR0b1N0cmluZyA9IEZ1bmN0aW9uW1RPX1NUUklOR107XG52YXIgVFBMID0gKCcnICsgJHRvU3RyaW5nKS5zcGxpdChUT19TVFJJTkcpO1xuXG5yZXF1aXJlKCcuL19jb3JlJykuaW5zcGVjdFNvdXJjZSA9IGZ1bmN0aW9uIChpdCkge1xuICByZXR1cm4gJHRvU3RyaW5nLmNhbGwoaXQpO1xufTtcblxuKG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKE8sIGtleSwgdmFsLCBzYWZlKSB7XG4gIHZhciBpc0Z1bmN0aW9uID0gdHlwZW9mIHZhbCA9PSAnZnVuY3Rpb24nO1xuICBpZiAoaXNGdW5jdGlvbikgaGFzKHZhbCwgJ25hbWUnKSB8fCBoaWRlKHZhbCwgJ25hbWUnLCBrZXkpO1xuICBpZiAoT1trZXldID09PSB2YWwpIHJldHVybjtcbiAgaWYgKGlzRnVuY3Rpb24pIGhhcyh2YWwsIFNSQykgfHwgaGlkZSh2YWwsIFNSQywgT1trZXldID8gJycgKyBPW2tleV0gOiBUUEwuam9pbihTdHJpbmcoa2V5KSkpO1xuICBpZiAoTyA9PT0gZ2xvYmFsKSB7XG4gICAgT1trZXldID0gdmFsO1xuICB9IGVsc2UgaWYgKCFzYWZlKSB7XG4gICAgZGVsZXRlIE9ba2V5XTtcbiAgICBoaWRlKE8sIGtleSwgdmFsKTtcbiAgfSBlbHNlIGlmIChPW2tleV0pIHtcbiAgICBPW2tleV0gPSB2YWw7XG4gIH0gZWxzZSB7XG4gICAgaGlkZShPLCBrZXksIHZhbCk7XG4gIH1cbi8vIGFkZCBmYWtlIEZ1bmN0aW9uI3RvU3RyaW5nIGZvciBjb3JyZWN0IHdvcmsgd3JhcHBlZCBtZXRob2RzIC8gY29uc3RydWN0b3JzIHdpdGggbWV0aG9kcyBsaWtlIExvRGFzaCBpc05hdGl2ZVxufSkoRnVuY3Rpb24ucHJvdG90eXBlLCBUT19TVFJJTkcsIGZ1bmN0aW9uIHRvU3RyaW5nKCkge1xuICByZXR1cm4gdHlwZW9mIHRoaXMgPT0gJ2Z1bmN0aW9uJyAmJiB0aGlzW1NSQ10gfHwgJHRvU3RyaW5nLmNhbGwodGhpcyk7XG59KTtcbiIsIi8vIDcuMi4xIFJlcXVpcmVPYmplY3RDb2VyY2libGUoYXJndW1lbnQpXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChpdCkge1xuICBpZiAoaXQgPT0gdW5kZWZpbmVkKSB0aHJvdyBUeXBlRXJyb3IoXCJDYW4ndCBjYWxsIG1ldGhvZCBvbiAgXCIgKyBpdCk7XG4gIHJldHVybiBpdDtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZhbHNlO1xuIiwidmFyIGNvcmUgPSByZXF1aXJlKCcuL19jb3JlJyk7XG52YXIgZ2xvYmFsID0gcmVxdWlyZSgnLi9fZ2xvYmFsJyk7XG52YXIgU0hBUkVEID0gJ19fY29yZS1qc19zaGFyZWRfXyc7XG52YXIgc3RvcmUgPSBnbG9iYWxbU0hBUkVEXSB8fCAoZ2xvYmFsW1NIQVJFRF0gPSB7fSk7XG5cbihtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gIHJldHVybiBzdG9yZVtrZXldIHx8IChzdG9yZVtrZXldID0gdmFsdWUgIT09IHVuZGVmaW5lZCA/IHZhbHVlIDoge30pO1xufSkoJ3ZlcnNpb25zJywgW10pLnB1c2goe1xuICB2ZXJzaW9uOiBjb3JlLnZlcnNpb24sXG4gIG1vZGU6IHJlcXVpcmUoJy4vX2xpYnJhcnknKSA/ICdwdXJlJyA6ICdnbG9iYWwnLFxuICBjb3B5cmlnaHQ6ICfCqSAyMDE4IERlbmlzIFB1c2hrYXJldiAoemxvaXJvY2sucnUpJ1xufSk7XG4iLCJ2YXIgc3RvcmUgPSByZXF1aXJlKCcuL19zaGFyZWQnKSgnd2tzJyk7XG52YXIgdWlkID0gcmVxdWlyZSgnLi9fdWlkJyk7XG52YXIgU3ltYm9sID0gcmVxdWlyZSgnLi9fZ2xvYmFsJykuU3ltYm9sO1xudmFyIFVTRV9TWU1CT0wgPSB0eXBlb2YgU3ltYm9sID09ICdmdW5jdGlvbic7XG5cbnZhciAkZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgcmV0dXJuIHN0b3JlW25hbWVdIHx8IChzdG9yZVtuYW1lXSA9XG4gICAgVVNFX1NZTUJPTCAmJiBTeW1ib2xbbmFtZV0gfHwgKFVTRV9TWU1CT0wgPyBTeW1ib2wgOiB1aWQpKCdTeW1ib2wuJyArIG5hbWUpKTtcbn07XG5cbiRleHBvcnRzLnN0b3JlID0gc3RvcmU7XG4iLCIndXNlIHN0cmljdCc7XG52YXIgaGlkZSA9IHJlcXVpcmUoJy4vX2hpZGUnKTtcbnZhciByZWRlZmluZSA9IHJlcXVpcmUoJy4vX3JlZGVmaW5lJyk7XG52YXIgZmFpbHMgPSByZXF1aXJlKCcuL19mYWlscycpO1xudmFyIGRlZmluZWQgPSByZXF1aXJlKCcuL19kZWZpbmVkJyk7XG52YXIgd2tzID0gcmVxdWlyZSgnLi9fd2tzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKEtFWSwgbGVuZ3RoLCBleGVjKSB7XG4gIHZhciBTWU1CT0wgPSB3a3MoS0VZKTtcbiAgdmFyIGZucyA9IGV4ZWMoZGVmaW5lZCwgU1lNQk9MLCAnJ1tLRVldKTtcbiAgdmFyIHN0cmZuID0gZm5zWzBdO1xuICB2YXIgcnhmbiA9IGZuc1sxXTtcbiAgaWYgKGZhaWxzKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgTyA9IHt9O1xuICAgIE9bU1lNQk9MXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDc7IH07XG4gICAgcmV0dXJuICcnW0tFWV0oTykgIT0gNztcbiAgfSkpIHtcbiAgICByZWRlZmluZShTdHJpbmcucHJvdG90eXBlLCBLRVksIHN0cmZuKTtcbiAgICBoaWRlKFJlZ0V4cC5wcm90b3R5cGUsIFNZTUJPTCwgbGVuZ3RoID09IDJcbiAgICAgIC8vIDIxLjIuNS44IFJlZ0V4cC5wcm90b3R5cGVbQEByZXBsYWNlXShzdHJpbmcsIHJlcGxhY2VWYWx1ZSlcbiAgICAgIC8vIDIxLjIuNS4xMSBSZWdFeHAucHJvdG90eXBlW0BAc3BsaXRdKHN0cmluZywgbGltaXQpXG4gICAgICA/IGZ1bmN0aW9uIChzdHJpbmcsIGFyZykgeyByZXR1cm4gcnhmbi5jYWxsKHN0cmluZywgdGhpcywgYXJnKTsgfVxuICAgICAgLy8gMjEuMi41LjYgUmVnRXhwLnByb3RvdHlwZVtAQG1hdGNoXShzdHJpbmcpXG4gICAgICAvLyAyMS4yLjUuOSBSZWdFeHAucHJvdG90eXBlW0BAc2VhcmNoXShzdHJpbmcpXG4gICAgICA6IGZ1bmN0aW9uIChzdHJpbmcpIHsgcmV0dXJuIHJ4Zm4uY2FsbChzdHJpbmcsIHRoaXMpOyB9XG4gICAgKTtcbiAgfVxufTtcbiIsInZhciB0b1N0cmluZyA9IHt9LnRvU3RyaW5nO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChpdCkge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbChpdCkuc2xpY2UoOCwgLTEpO1xufTtcbiIsIi8vIDcuMi44IElzUmVnRXhwKGFyZ3VtZW50KVxudmFyIGlzT2JqZWN0ID0gcmVxdWlyZSgnLi9faXMtb2JqZWN0Jyk7XG52YXIgY29mID0gcmVxdWlyZSgnLi9fY29mJyk7XG52YXIgTUFUQ0ggPSByZXF1aXJlKCcuL193a3MnKSgnbWF0Y2gnKTtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGl0KSB7XG4gIHZhciBpc1JlZ0V4cDtcbiAgcmV0dXJuIGlzT2JqZWN0KGl0KSAmJiAoKGlzUmVnRXhwID0gaXRbTUFUQ0hdKSAhPT0gdW5kZWZpbmVkID8gISFpc1JlZ0V4cCA6IGNvZihpdCkgPT0gJ1JlZ0V4cCcpO1xufTtcbiIsIi8vIEBAc3BsaXQgbG9naWNcbnJlcXVpcmUoJy4vX2ZpeC1yZS13a3MnKSgnc3BsaXQnLCAyLCBmdW5jdGlvbiAoZGVmaW5lZCwgU1BMSVQsICRzcGxpdCkge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciBpc1JlZ0V4cCA9IHJlcXVpcmUoJy4vX2lzLXJlZ2V4cCcpO1xuICB2YXIgX3NwbGl0ID0gJHNwbGl0O1xuICB2YXIgJHB1c2ggPSBbXS5wdXNoO1xuICB2YXIgJFNQTElUID0gJ3NwbGl0JztcbiAgdmFyIExFTkdUSCA9ICdsZW5ndGgnO1xuICB2YXIgTEFTVF9JTkRFWCA9ICdsYXN0SW5kZXgnO1xuICBpZiAoXG4gICAgJ2FiYmMnWyRTUExJVF0oLyhiKSovKVsxXSA9PSAnYycgfHxcbiAgICAndGVzdCdbJFNQTElUXSgvKD86KS8sIC0xKVtMRU5HVEhdICE9IDQgfHxcbiAgICAnYWInWyRTUExJVF0oLyg/OmFiKSovKVtMRU5HVEhdICE9IDIgfHxcbiAgICAnLidbJFNQTElUXSgvKC4/KSguPykvKVtMRU5HVEhdICE9IDQgfHxcbiAgICAnLidbJFNQTElUXSgvKCkoKS8pW0xFTkdUSF0gPiAxIHx8XG4gICAgJydbJFNQTElUXSgvLj8vKVtMRU5HVEhdXG4gICkge1xuICAgIHZhciBOUENHID0gLygpPz8vLmV4ZWMoJycpWzFdID09PSB1bmRlZmluZWQ7IC8vIG5vbnBhcnRpY2lwYXRpbmcgY2FwdHVyaW5nIGdyb3VwXG4gICAgLy8gYmFzZWQgb24gZXM1LXNoaW0gaW1wbGVtZW50YXRpb24sIG5lZWQgdG8gcmV3b3JrIGl0XG4gICAgJHNwbGl0ID0gZnVuY3Rpb24gKHNlcGFyYXRvciwgbGltaXQpIHtcbiAgICAgIHZhciBzdHJpbmcgPSBTdHJpbmcodGhpcyk7XG4gICAgICBpZiAoc2VwYXJhdG9yID09PSB1bmRlZmluZWQgJiYgbGltaXQgPT09IDApIHJldHVybiBbXTtcbiAgICAgIC8vIElmIGBzZXBhcmF0b3JgIGlzIG5vdCBhIHJlZ2V4LCB1c2UgbmF0aXZlIHNwbGl0XG4gICAgICBpZiAoIWlzUmVnRXhwKHNlcGFyYXRvcikpIHJldHVybiBfc3BsaXQuY2FsbChzdHJpbmcsIHNlcGFyYXRvciwgbGltaXQpO1xuICAgICAgdmFyIG91dHB1dCA9IFtdO1xuICAgICAgdmFyIGZsYWdzID0gKHNlcGFyYXRvci5pZ25vcmVDYXNlID8gJ2knIDogJycpICtcbiAgICAgICAgICAgICAgICAgIChzZXBhcmF0b3IubXVsdGlsaW5lID8gJ20nIDogJycpICtcbiAgICAgICAgICAgICAgICAgIChzZXBhcmF0b3IudW5pY29kZSA/ICd1JyA6ICcnKSArXG4gICAgICAgICAgICAgICAgICAoc2VwYXJhdG9yLnN0aWNreSA/ICd5JyA6ICcnKTtcbiAgICAgIHZhciBsYXN0TGFzdEluZGV4ID0gMDtcbiAgICAgIHZhciBzcGxpdExpbWl0ID0gbGltaXQgPT09IHVuZGVmaW5lZCA/IDQyOTQ5NjcyOTUgOiBsaW1pdCA+Pj4gMDtcbiAgICAgIC8vIE1ha2UgYGdsb2JhbGAgYW5kIGF2b2lkIGBsYXN0SW5kZXhgIGlzc3VlcyBieSB3b3JraW5nIHdpdGggYSBjb3B5XG4gICAgICB2YXIgc2VwYXJhdG9yQ29weSA9IG5ldyBSZWdFeHAoc2VwYXJhdG9yLnNvdXJjZSwgZmxhZ3MgKyAnZycpO1xuICAgICAgdmFyIHNlcGFyYXRvcjIsIG1hdGNoLCBsYXN0SW5kZXgsIGxhc3RMZW5ndGgsIGk7XG4gICAgICAvLyBEb2Vzbid0IG5lZWQgZmxhZ3MgZ3ksIGJ1dCB0aGV5IGRvbid0IGh1cnRcbiAgICAgIGlmICghTlBDRykgc2VwYXJhdG9yMiA9IG5ldyBSZWdFeHAoJ14nICsgc2VwYXJhdG9yQ29weS5zb3VyY2UgKyAnJCg/IVxcXFxzKScsIGZsYWdzKTtcbiAgICAgIHdoaWxlIChtYXRjaCA9IHNlcGFyYXRvckNvcHkuZXhlYyhzdHJpbmcpKSB7XG4gICAgICAgIC8vIGBzZXBhcmF0b3JDb3B5Lmxhc3RJbmRleGAgaXMgbm90IHJlbGlhYmxlIGNyb3NzLWJyb3dzZXJcbiAgICAgICAgbGFzdEluZGV4ID0gbWF0Y2guaW5kZXggKyBtYXRjaFswXVtMRU5HVEhdO1xuICAgICAgICBpZiAobGFzdEluZGV4ID4gbGFzdExhc3RJbmRleCkge1xuICAgICAgICAgIG91dHB1dC5wdXNoKHN0cmluZy5zbGljZShsYXN0TGFzdEluZGV4LCBtYXRjaC5pbmRleCkpO1xuICAgICAgICAgIC8vIEZpeCBicm93c2VycyB3aG9zZSBgZXhlY2AgbWV0aG9kcyBkb24ndCBjb25zaXN0ZW50bHkgcmV0dXJuIGB1bmRlZmluZWRgIGZvciBOUENHXG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWxvb3AtZnVuY1xuICAgICAgICAgIGlmICghTlBDRyAmJiBtYXRjaFtMRU5HVEhdID4gMSkgbWF0Y2hbMF0ucmVwbGFjZShzZXBhcmF0b3IyLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmb3IgKGkgPSAxOyBpIDwgYXJndW1lbnRzW0xFTkdUSF0gLSAyOyBpKyspIGlmIChhcmd1bWVudHNbaV0gPT09IHVuZGVmaW5lZCkgbWF0Y2hbaV0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgaWYgKG1hdGNoW0xFTkdUSF0gPiAxICYmIG1hdGNoLmluZGV4IDwgc3RyaW5nW0xFTkdUSF0pICRwdXNoLmFwcGx5KG91dHB1dCwgbWF0Y2guc2xpY2UoMSkpO1xuICAgICAgICAgIGxhc3RMZW5ndGggPSBtYXRjaFswXVtMRU5HVEhdO1xuICAgICAgICAgIGxhc3RMYXN0SW5kZXggPSBsYXN0SW5kZXg7XG4gICAgICAgICAgaWYgKG91dHB1dFtMRU5HVEhdID49IHNwbGl0TGltaXQpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzZXBhcmF0b3JDb3B5W0xBU1RfSU5ERVhdID09PSBtYXRjaC5pbmRleCkgc2VwYXJhdG9yQ29weVtMQVNUX0lOREVYXSsrOyAvLyBBdm9pZCBhbiBpbmZpbml0ZSBsb29wXG4gICAgICB9XG4gICAgICBpZiAobGFzdExhc3RJbmRleCA9PT0gc3RyaW5nW0xFTkdUSF0pIHtcbiAgICAgICAgaWYgKGxhc3RMZW5ndGggfHwgIXNlcGFyYXRvckNvcHkudGVzdCgnJykpIG91dHB1dC5wdXNoKCcnKTtcbiAgICAgIH0gZWxzZSBvdXRwdXQucHVzaChzdHJpbmcuc2xpY2UobGFzdExhc3RJbmRleCkpO1xuICAgICAgcmV0dXJuIG91dHB1dFtMRU5HVEhdID4gc3BsaXRMaW1pdCA/IG91dHB1dC5zbGljZSgwLCBzcGxpdExpbWl0KSA6IG91dHB1dDtcbiAgICB9O1xuICAvLyBDaGFrcmEsIFY4XG4gIH0gZWxzZSBpZiAoJzAnWyRTUExJVF0odW5kZWZpbmVkLCAwKVtMRU5HVEhdKSB7XG4gICAgJHNwbGl0ID0gZnVuY3Rpb24gKHNlcGFyYXRvciwgbGltaXQpIHtcbiAgICAgIHJldHVybiBzZXBhcmF0b3IgPT09IHVuZGVmaW5lZCAmJiBsaW1pdCA9PT0gMCA/IFtdIDogX3NwbGl0LmNhbGwodGhpcywgc2VwYXJhdG9yLCBsaW1pdCk7XG4gICAgfTtcbiAgfVxuICAvLyAyMS4xLjMuMTcgU3RyaW5nLnByb3RvdHlwZS5zcGxpdChzZXBhcmF0b3IsIGxpbWl0KVxuICByZXR1cm4gW2Z1bmN0aW9uIHNwbGl0KHNlcGFyYXRvciwgbGltaXQpIHtcbiAgICB2YXIgTyA9IGRlZmluZWQodGhpcyk7XG4gICAgdmFyIGZuID0gc2VwYXJhdG9yID09IHVuZGVmaW5lZCA/IHVuZGVmaW5lZCA6IHNlcGFyYXRvcltTUExJVF07XG4gICAgcmV0dXJuIGZuICE9PSB1bmRlZmluZWQgPyBmbi5jYWxsKHNlcGFyYXRvciwgTywgbGltaXQpIDogJHNwbGl0LmNhbGwoU3RyaW5nKE8pLCBzZXBhcmF0b3IsIGxpbWl0KTtcbiAgfSwgJHNwbGl0XTtcbn0pO1xuIiwiLyoqIERldGVjdCBmcmVlIHZhcmlhYmxlIGBnbG9iYWxgIGZyb20gTm9kZS5qcy4gKi9cbnZhciBmcmVlR2xvYmFsID0gdHlwZW9mIGdsb2JhbCA9PSAnb2JqZWN0JyAmJiBnbG9iYWwgJiYgZ2xvYmFsLk9iamVjdCA9PT0gT2JqZWN0ICYmIGdsb2JhbDtcblxubW9kdWxlLmV4cG9ydHMgPSBmcmVlR2xvYmFsO1xuIiwidmFyIGZyZWVHbG9iYWwgPSByZXF1aXJlKCcuL19mcmVlR2xvYmFsJyk7XG5cbi8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZSBgc2VsZmAuICovXG52YXIgZnJlZVNlbGYgPSB0eXBlb2Ygc2VsZiA9PSAnb2JqZWN0JyAmJiBzZWxmICYmIHNlbGYuT2JqZWN0ID09PSBPYmplY3QgJiYgc2VsZjtcblxuLyoqIFVzZWQgYXMgYSByZWZlcmVuY2UgdG8gdGhlIGdsb2JhbCBvYmplY3QuICovXG52YXIgcm9vdCA9IGZyZWVHbG9iYWwgfHwgZnJlZVNlbGYgfHwgRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKTtcblxubW9kdWxlLmV4cG9ydHMgPSByb290O1xuIiwidmFyIHJvb3QgPSByZXF1aXJlKCcuL19yb290Jyk7XG5cbi8qKiBCdWlsdC1pbiB2YWx1ZSByZWZlcmVuY2VzLiAqL1xudmFyIFN5bWJvbCA9IHJvb3QuU3ltYm9sO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN5bWJvbDtcbiIsIi8qKlxuICogQSBzcGVjaWFsaXplZCB2ZXJzaW9uIG9mIGBfLm1hcGAgZm9yIGFycmF5cyB3aXRob3V0IHN1cHBvcnQgZm9yIGl0ZXJhdGVlXG4gKiBzaG9ydGhhbmRzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0FycmF5fSBbYXJyYXldIFRoZSBhcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSBUaGUgZnVuY3Rpb24gaW52b2tlZCBwZXIgaXRlcmF0aW9uLlxuICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSBuZXcgbWFwcGVkIGFycmF5LlxuICovXG5mdW5jdGlvbiBhcnJheU1hcChhcnJheSwgaXRlcmF0ZWUpIHtcbiAgdmFyIGluZGV4ID0gLTEsXG4gICAgICBsZW5ndGggPSBhcnJheSA9PSBudWxsID8gMCA6IGFycmF5Lmxlbmd0aCxcbiAgICAgIHJlc3VsdCA9IEFycmF5KGxlbmd0aCk7XG5cbiAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICByZXN1bHRbaW5kZXhdID0gaXRlcmF0ZWUoYXJyYXlbaW5kZXhdLCBpbmRleCwgYXJyYXkpO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYXJyYXlNYXA7XG4iLCIvKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGNsYXNzaWZpZWQgYXMgYW4gYEFycmF5YCBvYmplY3QuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSAwLjEuMFxuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gYXJyYXksIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc0FycmF5KFsxLCAyLCAzXSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc0FycmF5KGRvY3VtZW50LmJvZHkuY2hpbGRyZW4pO1xuICogLy8gPT4gZmFsc2VcbiAqXG4gKiBfLmlzQXJyYXkoJ2FiYycpO1xuICogLy8gPT4gZmFsc2VcbiAqXG4gKiBfLmlzQXJyYXkoXy5ub29wKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcblxubW9kdWxlLmV4cG9ydHMgPSBpc0FycmF5O1xuIiwidmFyIFN5bWJvbCA9IHJlcXVpcmUoJy4vX1N5bWJvbCcpO1xuXG4vKiogVXNlZCBmb3IgYnVpbHQtaW4gbWV0aG9kIHJlZmVyZW5jZXMuICovXG52YXIgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKiogVXNlZCB0byBjaGVjayBvYmplY3RzIGZvciBvd24gcHJvcGVydGllcy4gKi9cbnZhciBoYXNPd25Qcm9wZXJ0eSA9IG9iamVjdFByb3RvLmhhc093blByb3BlcnR5O1xuXG4vKipcbiAqIFVzZWQgdG8gcmVzb2x2ZSB0aGVcbiAqIFtgdG9TdHJpbmdUYWdgXShodHRwOi8vZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi83LjAvI3NlYy1vYmplY3QucHJvdG90eXBlLnRvc3RyaW5nKVxuICogb2YgdmFsdWVzLlxuICovXG52YXIgbmF0aXZlT2JqZWN0VG9TdHJpbmcgPSBvYmplY3RQcm90by50b1N0cmluZztcblxuLyoqIEJ1aWx0LWluIHZhbHVlIHJlZmVyZW5jZXMuICovXG52YXIgc3ltVG9TdHJpbmdUYWcgPSBTeW1ib2wgPyBTeW1ib2wudG9TdHJpbmdUYWcgOiB1bmRlZmluZWQ7XG5cbi8qKlxuICogQSBzcGVjaWFsaXplZCB2ZXJzaW9uIG9mIGBiYXNlR2V0VGFnYCB3aGljaCBpZ25vcmVzIGBTeW1ib2wudG9TdHJpbmdUYWdgIHZhbHVlcy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gcXVlcnkuXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSByYXcgYHRvU3RyaW5nVGFnYC5cbiAqL1xuZnVuY3Rpb24gZ2V0UmF3VGFnKHZhbHVlKSB7XG4gIHZhciBpc093biA9IGhhc093blByb3BlcnR5LmNhbGwodmFsdWUsIHN5bVRvU3RyaW5nVGFnKSxcbiAgICAgIHRhZyA9IHZhbHVlW3N5bVRvU3RyaW5nVGFnXTtcblxuICB0cnkge1xuICAgIHZhbHVlW3N5bVRvU3RyaW5nVGFnXSA9IHVuZGVmaW5lZDtcbiAgICB2YXIgdW5tYXNrZWQgPSB0cnVlO1xuICB9IGNhdGNoIChlKSB7fVxuXG4gIHZhciByZXN1bHQgPSBuYXRpdmVPYmplY3RUb1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgaWYgKHVubWFza2VkKSB7XG4gICAgaWYgKGlzT3duKSB7XG4gICAgICB2YWx1ZVtzeW1Ub1N0cmluZ1RhZ10gPSB0YWc7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlbGV0ZSB2YWx1ZVtzeW1Ub1N0cmluZ1RhZ107XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0UmF3VGFnO1xuIiwiLyoqIFVzZWQgZm9yIGJ1aWx0LWluIG1ldGhvZCByZWZlcmVuY2VzLiAqL1xudmFyIG9iamVjdFByb3RvID0gT2JqZWN0LnByb3RvdHlwZTtcblxuLyoqXG4gKiBVc2VkIHRvIHJlc29sdmUgdGhlXG4gKiBbYHRvU3RyaW5nVGFnYF0oaHR0cDovL2VjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNy4wLyNzZWMtb2JqZWN0LnByb3RvdHlwZS50b3N0cmluZylcbiAqIG9mIHZhbHVlcy5cbiAqL1xudmFyIG5hdGl2ZU9iamVjdFRvU3RyaW5nID0gb2JqZWN0UHJvdG8udG9TdHJpbmc7XG5cbi8qKlxuICogQ29udmVydHMgYHZhbHVlYCB0byBhIHN0cmluZyB1c2luZyBgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZ2AuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNvbnZlcnQuXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSBjb252ZXJ0ZWQgc3RyaW5nLlxuICovXG5mdW5jdGlvbiBvYmplY3RUb1N0cmluZyh2YWx1ZSkge1xuICByZXR1cm4gbmF0aXZlT2JqZWN0VG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gb2JqZWN0VG9TdHJpbmc7XG4iLCJ2YXIgU3ltYm9sID0gcmVxdWlyZSgnLi9fU3ltYm9sJyksXG4gICAgZ2V0UmF3VGFnID0gcmVxdWlyZSgnLi9fZ2V0UmF3VGFnJyksXG4gICAgb2JqZWN0VG9TdHJpbmcgPSByZXF1aXJlKCcuL19vYmplY3RUb1N0cmluZycpO1xuXG4vKiogYE9iamVjdCN0b1N0cmluZ2AgcmVzdWx0IHJlZmVyZW5jZXMuICovXG52YXIgbnVsbFRhZyA9ICdbb2JqZWN0IE51bGxdJyxcbiAgICB1bmRlZmluZWRUYWcgPSAnW29iamVjdCBVbmRlZmluZWRdJztcblxuLyoqIEJ1aWx0LWluIHZhbHVlIHJlZmVyZW5jZXMuICovXG52YXIgc3ltVG9TdHJpbmdUYWcgPSBTeW1ib2wgPyBTeW1ib2wudG9TdHJpbmdUYWcgOiB1bmRlZmluZWQ7XG5cbi8qKlxuICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYGdldFRhZ2Agd2l0aG91dCBmYWxsYmFja3MgZm9yIGJ1Z2d5IGVudmlyb25tZW50cy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gcXVlcnkuXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSBgdG9TdHJpbmdUYWdgLlxuICovXG5mdW5jdGlvbiBiYXNlR2V0VGFnKHZhbHVlKSB7XG4gIGlmICh2YWx1ZSA9PSBudWxsKSB7XG4gICAgcmV0dXJuIHZhbHVlID09PSB1bmRlZmluZWQgPyB1bmRlZmluZWRUYWcgOiBudWxsVGFnO1xuICB9XG4gIHJldHVybiAoc3ltVG9TdHJpbmdUYWcgJiYgc3ltVG9TdHJpbmdUYWcgaW4gT2JqZWN0KHZhbHVlKSlcbiAgICA/IGdldFJhd1RhZyh2YWx1ZSlcbiAgICA6IG9iamVjdFRvU3RyaW5nKHZhbHVlKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBiYXNlR2V0VGFnO1xuIiwiLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBvYmplY3QtbGlrZS4gQSB2YWx1ZSBpcyBvYmplY3QtbGlrZSBpZiBpdCdzIG5vdCBgbnVsbGBcbiAqIGFuZCBoYXMgYSBgdHlwZW9mYCByZXN1bHQgb2YgXCJvYmplY3RcIi5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDQuMC4wXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBvYmplY3QtbGlrZSwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzT2JqZWN0TGlrZSh7fSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdExpa2UoWzEsIDIsIDNdKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0TGlrZShfLm5vb3ApO1xuICogLy8gPT4gZmFsc2VcbiAqXG4gKiBfLmlzT2JqZWN0TGlrZShudWxsKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0TGlrZSh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgIT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCc7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaXNPYmplY3RMaWtlO1xuIiwidmFyIGJhc2VHZXRUYWcgPSByZXF1aXJlKCcuL19iYXNlR2V0VGFnJyksXG4gICAgaXNPYmplY3RMaWtlID0gcmVxdWlyZSgnLi9pc09iamVjdExpa2UnKTtcblxuLyoqIGBPYmplY3QjdG9TdHJpbmdgIHJlc3VsdCByZWZlcmVuY2VzLiAqL1xudmFyIHN5bWJvbFRhZyA9ICdbb2JqZWN0IFN5bWJvbF0nO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGNsYXNzaWZpZWQgYXMgYSBgU3ltYm9sYCBwcmltaXRpdmUgb3Igb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgNC4wLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgc3ltYm9sLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNTeW1ib2woU3ltYm9sLml0ZXJhdG9yKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzU3ltYm9sKCdhYmMnKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzU3ltYm9sKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ3N5bWJvbCcgfHxcbiAgICAoaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBiYXNlR2V0VGFnKHZhbHVlKSA9PSBzeW1ib2xUYWcpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzU3ltYm9sO1xuIiwidmFyIFN5bWJvbCA9IHJlcXVpcmUoJy4vX1N5bWJvbCcpLFxuICAgIGFycmF5TWFwID0gcmVxdWlyZSgnLi9fYXJyYXlNYXAnKSxcbiAgICBpc0FycmF5ID0gcmVxdWlyZSgnLi9pc0FycmF5JyksXG4gICAgaXNTeW1ib2wgPSByZXF1aXJlKCcuL2lzU3ltYm9sJyk7XG5cbi8qKiBVc2VkIGFzIHJlZmVyZW5jZXMgZm9yIHZhcmlvdXMgYE51bWJlcmAgY29uc3RhbnRzLiAqL1xudmFyIElORklOSVRZID0gMSAvIDA7XG5cbi8qKiBVc2VkIHRvIGNvbnZlcnQgc3ltYm9scyB0byBwcmltaXRpdmVzIGFuZCBzdHJpbmdzLiAqL1xudmFyIHN5bWJvbFByb3RvID0gU3ltYm9sID8gU3ltYm9sLnByb3RvdHlwZSA6IHVuZGVmaW5lZCxcbiAgICBzeW1ib2xUb1N0cmluZyA9IHN5bWJvbFByb3RvID8gc3ltYm9sUHJvdG8udG9TdHJpbmcgOiB1bmRlZmluZWQ7XG5cbi8qKlxuICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8udG9TdHJpbmdgIHdoaWNoIGRvZXNuJ3QgY29udmVydCBudWxsaXNoXG4gKiB2YWx1ZXMgdG8gZW1wdHkgc3RyaW5ncy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gcHJvY2Vzcy5cbiAqIEByZXR1cm5zIHtzdHJpbmd9IFJldHVybnMgdGhlIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gYmFzZVRvU3RyaW5nKHZhbHVlKSB7XG4gIC8vIEV4aXQgZWFybHkgZm9yIHN0cmluZ3MgdG8gYXZvaWQgYSBwZXJmb3JtYW5jZSBoaXQgaW4gc29tZSBlbnZpcm9ubWVudHMuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgLy8gUmVjdXJzaXZlbHkgY29udmVydCB2YWx1ZXMgKHN1c2NlcHRpYmxlIHRvIGNhbGwgc3RhY2sgbGltaXRzKS5cbiAgICByZXR1cm4gYXJyYXlNYXAodmFsdWUsIGJhc2VUb1N0cmluZykgKyAnJztcbiAgfVxuICBpZiAoaXNTeW1ib2wodmFsdWUpKSB7XG4gICAgcmV0dXJuIHN5bWJvbFRvU3RyaW5nID8gc3ltYm9sVG9TdHJpbmcuY2FsbCh2YWx1ZSkgOiAnJztcbiAgfVxuICB2YXIgcmVzdWx0ID0gKHZhbHVlICsgJycpO1xuICByZXR1cm4gKHJlc3VsdCA9PSAnMCcgJiYgKDEgLyB2YWx1ZSkgPT0gLUlORklOSVRZKSA/ICctMCcgOiByZXN1bHQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYmFzZVRvU3RyaW5nO1xuIiwidmFyIGJhc2VUb1N0cmluZyA9IHJlcXVpcmUoJy4vX2Jhc2VUb1N0cmluZycpO1xuXG4vKipcbiAqIENvbnZlcnRzIGB2YWx1ZWAgdG8gYSBzdHJpbmcuIEFuIGVtcHR5IHN0cmluZyBpcyByZXR1cm5lZCBmb3IgYG51bGxgXG4gKiBhbmQgYHVuZGVmaW5lZGAgdmFsdWVzLiBUaGUgc2lnbiBvZiBgLTBgIGlzIHByZXNlcnZlZC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDQuMC4wXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY29udmVydC5cbiAqIEByZXR1cm5zIHtzdHJpbmd9IFJldHVybnMgdGhlIGNvbnZlcnRlZCBzdHJpbmcuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8udG9TdHJpbmcobnVsbCk7XG4gKiAvLyA9PiAnJ1xuICpcbiAqIF8udG9TdHJpbmcoLTApO1xuICogLy8gPT4gJy0wJ1xuICpcbiAqIF8udG9TdHJpbmcoWzEsIDIsIDNdKTtcbiAqIC8vID0+ICcxLDIsMydcbiAqL1xuZnVuY3Rpb24gdG9TdHJpbmcodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlID09IG51bGwgPyAnJyA6IGJhc2VUb1N0cmluZyh2YWx1ZSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdG9TdHJpbmc7XG4iLCJ2YXIgdG9TdHJpbmcgPSByZXF1aXJlKCcuL3RvU3RyaW5nJyk7XG5cbi8qKiBVc2VkIHRvIGdlbmVyYXRlIHVuaXF1ZSBJRHMuICovXG52YXIgaWRDb3VudGVyID0gMDtcblxuLyoqXG4gKiBHZW5lcmF0ZXMgYSB1bmlxdWUgSUQuIElmIGBwcmVmaXhgIGlzIGdpdmVuLCB0aGUgSUQgaXMgYXBwZW5kZWQgdG8gaXQuXG4gKlxuICogQHN0YXRpY1xuICogQHNpbmNlIDAuMS4wXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IFV0aWxcbiAqIEBwYXJhbSB7c3RyaW5nfSBbcHJlZml4PScnXSBUaGUgdmFsdWUgdG8gcHJlZml4IHRoZSBJRCB3aXRoLlxuICogQHJldHVybnMge3N0cmluZ30gUmV0dXJucyB0aGUgdW5pcXVlIElELlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLnVuaXF1ZUlkKCdjb250YWN0XycpO1xuICogLy8gPT4gJ2NvbnRhY3RfMTA0J1xuICpcbiAqIF8udW5pcXVlSWQoKTtcbiAqIC8vID0+ICcxMDUnXG4gKi9cbmZ1bmN0aW9uIHVuaXF1ZUlkKHByZWZpeCkge1xuICB2YXIgaWQgPSArK2lkQ291bnRlcjtcbiAgcmV0dXJuIHRvU3RyaW5nKHByZWZpeCkgKyBpZDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB1bmlxdWVJZDtcbiIsIi8qKlxuICogQSBzcGVjaWFsaXplZCB2ZXJzaW9uIG9mIGBfLmZvckVhY2hgIGZvciBhcnJheXMgd2l0aG91dCBzdXBwb3J0IGZvclxuICogaXRlcmF0ZWUgc2hvcnRoYW5kcy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtBcnJheX0gW2FycmF5XSBUaGUgYXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gaXRlcmF0ZWUgVGhlIGZ1bmN0aW9uIGludm9rZWQgcGVyIGl0ZXJhdGlvbi5cbiAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyBgYXJyYXlgLlxuICovXG5mdW5jdGlvbiBhcnJheUVhY2goYXJyYXksIGl0ZXJhdGVlKSB7XG4gIHZhciBpbmRleCA9IC0xLFxuICAgICAgbGVuZ3RoID0gYXJyYXkgPT0gbnVsbCA/IDAgOiBhcnJheS5sZW5ndGg7XG5cbiAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICBpZiAoaXRlcmF0ZWUoYXJyYXlbaW5kZXhdLCBpbmRleCwgYXJyYXkpID09PSBmYWxzZSkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIHJldHVybiBhcnJheTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBhcnJheUVhY2g7XG4iLCIvKipcbiAqIENyZWF0ZXMgYSBiYXNlIGZ1bmN0aW9uIGZvciBtZXRob2RzIGxpa2UgYF8uZm9ySW5gIGFuZCBgXy5mb3JPd25gLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtmcm9tUmlnaHRdIFNwZWNpZnkgaXRlcmF0aW5nIGZyb20gcmlnaHQgdG8gbGVmdC5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGJhc2UgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUJhc2VGb3IoZnJvbVJpZ2h0KSB7XG4gIHJldHVybiBmdW5jdGlvbihvYmplY3QsIGl0ZXJhdGVlLCBrZXlzRnVuYykge1xuICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICBpdGVyYWJsZSA9IE9iamVjdChvYmplY3QpLFxuICAgICAgICBwcm9wcyA9IGtleXNGdW5jKG9iamVjdCksXG4gICAgICAgIGxlbmd0aCA9IHByb3BzLmxlbmd0aDtcblxuICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgdmFyIGtleSA9IHByb3BzW2Zyb21SaWdodCA/IGxlbmd0aCA6ICsraW5kZXhdO1xuICAgICAgaWYgKGl0ZXJhdGVlKGl0ZXJhYmxlW2tleV0sIGtleSwgaXRlcmFibGUpID09PSBmYWxzZSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVCYXNlRm9yO1xuIiwidmFyIGNyZWF0ZUJhc2VGb3IgPSByZXF1aXJlKCcuL19jcmVhdGVCYXNlRm9yJyk7XG5cbi8qKlxuICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYGJhc2VGb3JPd25gIHdoaWNoIGl0ZXJhdGVzIG92ZXIgYG9iamVjdGBcbiAqIHByb3BlcnRpZXMgcmV0dXJuZWQgYnkgYGtleXNGdW5jYCBhbmQgaW52b2tlcyBgaXRlcmF0ZWVgIGZvciBlYWNoIHByb3BlcnR5LlxuICogSXRlcmF0ZWUgZnVuY3Rpb25zIG1heSBleGl0IGl0ZXJhdGlvbiBlYXJseSBieSBleHBsaWNpdGx5IHJldHVybmluZyBgZmFsc2VgLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gaXRlcmF0ZSBvdmVyLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gaXRlcmF0ZWUgVGhlIGZ1bmN0aW9uIGludm9rZWQgcGVyIGl0ZXJhdGlvbi5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGtleXNGdW5jIFRoZSBmdW5jdGlvbiB0byBnZXQgdGhlIGtleXMgb2YgYG9iamVjdGAuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIGBvYmplY3RgLlxuICovXG52YXIgYmFzZUZvciA9IGNyZWF0ZUJhc2VGb3IoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBiYXNlRm9yO1xuIiwiLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy50aW1lc2Agd2l0aG91dCBzdXBwb3J0IGZvciBpdGVyYXRlZSBzaG9ydGhhbmRzXG4gKiBvciBtYXggYXJyYXkgbGVuZ3RoIGNoZWNrcy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtudW1iZXJ9IG4gVGhlIG51bWJlciBvZiB0aW1lcyB0byBpbnZva2UgYGl0ZXJhdGVlYC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIFRoZSBmdW5jdGlvbiBpbnZva2VkIHBlciBpdGVyYXRpb24uXG4gKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgdGhlIGFycmF5IG9mIHJlc3VsdHMuXG4gKi9cbmZ1bmN0aW9uIGJhc2VUaW1lcyhuLCBpdGVyYXRlZSkge1xuICB2YXIgaW5kZXggPSAtMSxcbiAgICAgIHJlc3VsdCA9IEFycmF5KG4pO1xuXG4gIHdoaWxlICgrK2luZGV4IDwgbikge1xuICAgIHJlc3VsdFtpbmRleF0gPSBpdGVyYXRlZShpbmRleCk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBiYXNlVGltZXM7XG4iLCJ2YXIgYmFzZUdldFRhZyA9IHJlcXVpcmUoJy4vX2Jhc2VHZXRUYWcnKSxcbiAgICBpc09iamVjdExpa2UgPSByZXF1aXJlKCcuL2lzT2JqZWN0TGlrZScpO1xuXG4vKiogYE9iamVjdCN0b1N0cmluZ2AgcmVzdWx0IHJlZmVyZW5jZXMuICovXG52YXIgYXJnc1RhZyA9ICdbb2JqZWN0IEFyZ3VtZW50c10nO1xuXG4vKipcbiAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLmlzQXJndW1lbnRzYC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhbiBgYXJndW1lbnRzYCBvYmplY3QsXG4gKi9cbmZ1bmN0aW9uIGJhc2VJc0FyZ3VtZW50cyh2YWx1ZSkge1xuICByZXR1cm4gaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBiYXNlR2V0VGFnKHZhbHVlKSA9PSBhcmdzVGFnO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJhc2VJc0FyZ3VtZW50cztcbiIsInZhciBiYXNlSXNBcmd1bWVudHMgPSByZXF1aXJlKCcuL19iYXNlSXNBcmd1bWVudHMnKSxcbiAgICBpc09iamVjdExpa2UgPSByZXF1aXJlKCcuL2lzT2JqZWN0TGlrZScpO1xuXG4vKiogVXNlZCBmb3IgYnVpbHQtaW4gbWV0aG9kIHJlZmVyZW5jZXMuICovXG52YXIgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKiogVXNlZCB0byBjaGVjayBvYmplY3RzIGZvciBvd24gcHJvcGVydGllcy4gKi9cbnZhciBoYXNPd25Qcm9wZXJ0eSA9IG9iamVjdFByb3RvLmhhc093blByb3BlcnR5O1xuXG4vKiogQnVpbHQtaW4gdmFsdWUgcmVmZXJlbmNlcy4gKi9cbnZhciBwcm9wZXJ0eUlzRW51bWVyYWJsZSA9IG9iamVjdFByb3RvLnByb3BlcnR5SXNFbnVtZXJhYmxlO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGxpa2VseSBhbiBgYXJndW1lbnRzYCBvYmplY3QuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSAwLjEuMFxuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gYGFyZ3VtZW50c2Agb2JqZWN0LFxuICogIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc0FyZ3VtZW50cyhmdW5jdGlvbigpIHsgcmV0dXJuIGFyZ3VtZW50czsgfSgpKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzQXJndW1lbnRzKFsxLCAyLCAzXSk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG52YXIgaXNBcmd1bWVudHMgPSBiYXNlSXNBcmd1bWVudHMoZnVuY3Rpb24oKSB7IHJldHVybiBhcmd1bWVudHM7IH0oKSkgPyBiYXNlSXNBcmd1bWVudHMgOiBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBoYXNPd25Qcm9wZXJ0eS5jYWxsKHZhbHVlLCAnY2FsbGVlJykgJiZcbiAgICAhcHJvcGVydHlJc0VudW1lcmFibGUuY2FsbCh2YWx1ZSwgJ2NhbGxlZScpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBpc0FyZ3VtZW50cztcbiIsIi8qKlxuICogVGhpcyBtZXRob2QgcmV0dXJucyBgZmFsc2VgLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgNC4xMy4wXG4gKiBAY2F0ZWdvcnkgVXRpbFxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy50aW1lcygyLCBfLnN0dWJGYWxzZSk7XG4gKiAvLyA9PiBbZmFsc2UsIGZhbHNlXVxuICovXG5mdW5jdGlvbiBzdHViRmFsc2UoKSB7XG4gIHJldHVybiBmYWxzZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzdHViRmFsc2U7XG4iLCJ2YXIgcm9vdCA9IHJlcXVpcmUoJy4vX3Jvb3QnKSxcbiAgICBzdHViRmFsc2UgPSByZXF1aXJlKCcuL3N0dWJGYWxzZScpO1xuXG4vKiogRGV0ZWN0IGZyZWUgdmFyaWFibGUgYGV4cG9ydHNgLiAqL1xudmFyIGZyZWVFeHBvcnRzID0gdHlwZW9mIGV4cG9ydHMgPT0gJ29iamVjdCcgJiYgZXhwb3J0cyAmJiAhZXhwb3J0cy5ub2RlVHlwZSAmJiBleHBvcnRzO1xuXG4vKiogRGV0ZWN0IGZyZWUgdmFyaWFibGUgYG1vZHVsZWAuICovXG52YXIgZnJlZU1vZHVsZSA9IGZyZWVFeHBvcnRzICYmIHR5cGVvZiBtb2R1bGUgPT0gJ29iamVjdCcgJiYgbW9kdWxlICYmICFtb2R1bGUubm9kZVR5cGUgJiYgbW9kdWxlO1xuXG4vKiogRGV0ZWN0IHRoZSBwb3B1bGFyIENvbW1vbkpTIGV4dGVuc2lvbiBgbW9kdWxlLmV4cG9ydHNgLiAqL1xudmFyIG1vZHVsZUV4cG9ydHMgPSBmcmVlTW9kdWxlICYmIGZyZWVNb2R1bGUuZXhwb3J0cyA9PT0gZnJlZUV4cG9ydHM7XG5cbi8qKiBCdWlsdC1pbiB2YWx1ZSByZWZlcmVuY2VzLiAqL1xudmFyIEJ1ZmZlciA9IG1vZHVsZUV4cG9ydHMgPyByb290LkJ1ZmZlciA6IHVuZGVmaW5lZDtcblxuLyogQnVpbHQtaW4gbWV0aG9kIHJlZmVyZW5jZXMgZm9yIHRob3NlIHdpdGggdGhlIHNhbWUgbmFtZSBhcyBvdGhlciBgbG9kYXNoYCBtZXRob2RzLiAqL1xudmFyIG5hdGl2ZUlzQnVmZmVyID0gQnVmZmVyID8gQnVmZmVyLmlzQnVmZmVyIDogdW5kZWZpbmVkO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgYnVmZmVyLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgNC4zLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgYnVmZmVyLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNCdWZmZXIobmV3IEJ1ZmZlcigyKSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc0J1ZmZlcihuZXcgVWludDhBcnJheSgyKSk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG52YXIgaXNCdWZmZXIgPSBuYXRpdmVJc0J1ZmZlciB8fCBzdHViRmFsc2U7XG5cbm1vZHVsZS5leHBvcnRzID0gaXNCdWZmZXI7XG4iLCIvKiogVXNlZCBhcyByZWZlcmVuY2VzIGZvciB2YXJpb3VzIGBOdW1iZXJgIGNvbnN0YW50cy4gKi9cbnZhciBNQVhfU0FGRV9JTlRFR0VSID0gOTAwNzE5OTI1NDc0MDk5MTtcblxuLyoqIFVzZWQgdG8gZGV0ZWN0IHVuc2lnbmVkIGludGVnZXIgdmFsdWVzLiAqL1xudmFyIHJlSXNVaW50ID0gL14oPzowfFsxLTldXFxkKikkLztcblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBhIHZhbGlkIGFycmF5LWxpa2UgaW5kZXguXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHBhcmFtIHtudW1iZXJ9IFtsZW5ndGg9TUFYX1NBRkVfSU5URUdFUl0gVGhlIHVwcGVyIGJvdW5kcyBvZiBhIHZhbGlkIGluZGV4LlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYSB2YWxpZCBpbmRleCwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc0luZGV4KHZhbHVlLCBsZW5ndGgpIHtcbiAgdmFyIHR5cGUgPSB0eXBlb2YgdmFsdWU7XG4gIGxlbmd0aCA9IGxlbmd0aCA9PSBudWxsID8gTUFYX1NBRkVfSU5URUdFUiA6IGxlbmd0aDtcblxuICByZXR1cm4gISFsZW5ndGggJiZcbiAgICAodHlwZSA9PSAnbnVtYmVyJyB8fFxuICAgICAgKHR5cGUgIT0gJ3N5bWJvbCcgJiYgcmVJc1VpbnQudGVzdCh2YWx1ZSkpKSAmJlxuICAgICAgICAodmFsdWUgPiAtMSAmJiB2YWx1ZSAlIDEgPT0gMCAmJiB2YWx1ZSA8IGxlbmd0aCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaXNJbmRleDtcbiIsIi8qKiBVc2VkIGFzIHJlZmVyZW5jZXMgZm9yIHZhcmlvdXMgYE51bWJlcmAgY29uc3RhbnRzLiAqL1xudmFyIE1BWF9TQUZFX0lOVEVHRVIgPSA5MDA3MTk5MjU0NzQwOTkxO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgdmFsaWQgYXJyYXktbGlrZSBsZW5ndGguXG4gKlxuICogKipOb3RlOioqIFRoaXMgbWV0aG9kIGlzIGxvb3NlbHkgYmFzZWQgb25cbiAqIFtgVG9MZW5ndGhgXShodHRwOi8vZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi83LjAvI3NlYy10b2xlbmd0aCkuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSA0LjAuMFxuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYSB2YWxpZCBsZW5ndGgsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc0xlbmd0aCgzKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzTGVuZ3RoKE51bWJlci5NSU5fVkFMVUUpO1xuICogLy8gPT4gZmFsc2VcbiAqXG4gKiBfLmlzTGVuZ3RoKEluZmluaXR5KTtcbiAqIC8vID0+IGZhbHNlXG4gKlxuICogXy5pc0xlbmd0aCgnMycpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNMZW5ndGgodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnbnVtYmVyJyAmJlxuICAgIHZhbHVlID4gLTEgJiYgdmFsdWUgJSAxID09IDAgJiYgdmFsdWUgPD0gTUFYX1NBRkVfSU5URUdFUjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpc0xlbmd0aDtcbiIsInZhciBiYXNlR2V0VGFnID0gcmVxdWlyZSgnLi9fYmFzZUdldFRhZycpLFxuICAgIGlzTGVuZ3RoID0gcmVxdWlyZSgnLi9pc0xlbmd0aCcpLFxuICAgIGlzT2JqZWN0TGlrZSA9IHJlcXVpcmUoJy4vaXNPYmplY3RMaWtlJyk7XG5cbi8qKiBgT2JqZWN0I3RvU3RyaW5nYCByZXN1bHQgcmVmZXJlbmNlcy4gKi9cbnZhciBhcmdzVGFnID0gJ1tvYmplY3QgQXJndW1lbnRzXScsXG4gICAgYXJyYXlUYWcgPSAnW29iamVjdCBBcnJheV0nLFxuICAgIGJvb2xUYWcgPSAnW29iamVjdCBCb29sZWFuXScsXG4gICAgZGF0ZVRhZyA9ICdbb2JqZWN0IERhdGVdJyxcbiAgICBlcnJvclRhZyA9ICdbb2JqZWN0IEVycm9yXScsXG4gICAgZnVuY1RhZyA9ICdbb2JqZWN0IEZ1bmN0aW9uXScsXG4gICAgbWFwVGFnID0gJ1tvYmplY3QgTWFwXScsXG4gICAgbnVtYmVyVGFnID0gJ1tvYmplY3QgTnVtYmVyXScsXG4gICAgb2JqZWN0VGFnID0gJ1tvYmplY3QgT2JqZWN0XScsXG4gICAgcmVnZXhwVGFnID0gJ1tvYmplY3QgUmVnRXhwXScsXG4gICAgc2V0VGFnID0gJ1tvYmplY3QgU2V0XScsXG4gICAgc3RyaW5nVGFnID0gJ1tvYmplY3QgU3RyaW5nXScsXG4gICAgd2Vha01hcFRhZyA9ICdbb2JqZWN0IFdlYWtNYXBdJztcblxudmFyIGFycmF5QnVmZmVyVGFnID0gJ1tvYmplY3QgQXJyYXlCdWZmZXJdJyxcbiAgICBkYXRhVmlld1RhZyA9ICdbb2JqZWN0IERhdGFWaWV3XScsXG4gICAgZmxvYXQzMlRhZyA9ICdbb2JqZWN0IEZsb2F0MzJBcnJheV0nLFxuICAgIGZsb2F0NjRUYWcgPSAnW29iamVjdCBGbG9hdDY0QXJyYXldJyxcbiAgICBpbnQ4VGFnID0gJ1tvYmplY3QgSW50OEFycmF5XScsXG4gICAgaW50MTZUYWcgPSAnW29iamVjdCBJbnQxNkFycmF5XScsXG4gICAgaW50MzJUYWcgPSAnW29iamVjdCBJbnQzMkFycmF5XScsXG4gICAgdWludDhUYWcgPSAnW29iamVjdCBVaW50OEFycmF5XScsXG4gICAgdWludDhDbGFtcGVkVGFnID0gJ1tvYmplY3QgVWludDhDbGFtcGVkQXJyYXldJyxcbiAgICB1aW50MTZUYWcgPSAnW29iamVjdCBVaW50MTZBcnJheV0nLFxuICAgIHVpbnQzMlRhZyA9ICdbb2JqZWN0IFVpbnQzMkFycmF5XSc7XG5cbi8qKiBVc2VkIHRvIGlkZW50aWZ5IGB0b1N0cmluZ1RhZ2AgdmFsdWVzIG9mIHR5cGVkIGFycmF5cy4gKi9cbnZhciB0eXBlZEFycmF5VGFncyA9IHt9O1xudHlwZWRBcnJheVRhZ3NbZmxvYXQzMlRhZ10gPSB0eXBlZEFycmF5VGFnc1tmbG9hdDY0VGFnXSA9XG50eXBlZEFycmF5VGFnc1tpbnQ4VGFnXSA9IHR5cGVkQXJyYXlUYWdzW2ludDE2VGFnXSA9XG50eXBlZEFycmF5VGFnc1tpbnQzMlRhZ10gPSB0eXBlZEFycmF5VGFnc1t1aW50OFRhZ10gPVxudHlwZWRBcnJheVRhZ3NbdWludDhDbGFtcGVkVGFnXSA9IHR5cGVkQXJyYXlUYWdzW3VpbnQxNlRhZ10gPVxudHlwZWRBcnJheVRhZ3NbdWludDMyVGFnXSA9IHRydWU7XG50eXBlZEFycmF5VGFnc1thcmdzVGFnXSA9IHR5cGVkQXJyYXlUYWdzW2FycmF5VGFnXSA9XG50eXBlZEFycmF5VGFnc1thcnJheUJ1ZmZlclRhZ10gPSB0eXBlZEFycmF5VGFnc1tib29sVGFnXSA9XG50eXBlZEFycmF5VGFnc1tkYXRhVmlld1RhZ10gPSB0eXBlZEFycmF5VGFnc1tkYXRlVGFnXSA9XG50eXBlZEFycmF5VGFnc1tlcnJvclRhZ10gPSB0eXBlZEFycmF5VGFnc1tmdW5jVGFnXSA9XG50eXBlZEFycmF5VGFnc1ttYXBUYWddID0gdHlwZWRBcnJheVRhZ3NbbnVtYmVyVGFnXSA9XG50eXBlZEFycmF5VGFnc1tvYmplY3RUYWddID0gdHlwZWRBcnJheVRhZ3NbcmVnZXhwVGFnXSA9XG50eXBlZEFycmF5VGFnc1tzZXRUYWddID0gdHlwZWRBcnJheVRhZ3Nbc3RyaW5nVGFnXSA9XG50eXBlZEFycmF5VGFnc1t3ZWFrTWFwVGFnXSA9IGZhbHNlO1xuXG4vKipcbiAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLmlzVHlwZWRBcnJheWAgd2l0aG91dCBOb2RlLmpzIG9wdGltaXphdGlvbnMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYSB0eXBlZCBhcnJheSwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBiYXNlSXNUeXBlZEFycmF5KHZhbHVlKSB7XG4gIHJldHVybiBpc09iamVjdExpa2UodmFsdWUpICYmXG4gICAgaXNMZW5ndGgodmFsdWUubGVuZ3RoKSAmJiAhIXR5cGVkQXJyYXlUYWdzW2Jhc2VHZXRUYWcodmFsdWUpXTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBiYXNlSXNUeXBlZEFycmF5O1xuIiwiLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy51bmFyeWAgd2l0aG91dCBzdXBwb3J0IGZvciBzdG9yaW5nIG1ldGFkYXRhLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byBjYXAgYXJndW1lbnRzIGZvci5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGNhcHBlZCBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gYmFzZVVuYXJ5KGZ1bmMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIGZ1bmModmFsdWUpO1xuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJhc2VVbmFyeTtcbiIsInZhciBmcmVlR2xvYmFsID0gcmVxdWlyZSgnLi9fZnJlZUdsb2JhbCcpO1xuXG4vKiogRGV0ZWN0IGZyZWUgdmFyaWFibGUgYGV4cG9ydHNgLiAqL1xudmFyIGZyZWVFeHBvcnRzID0gdHlwZW9mIGV4cG9ydHMgPT0gJ29iamVjdCcgJiYgZXhwb3J0cyAmJiAhZXhwb3J0cy5ub2RlVHlwZSAmJiBleHBvcnRzO1xuXG4vKiogRGV0ZWN0IGZyZWUgdmFyaWFibGUgYG1vZHVsZWAuICovXG52YXIgZnJlZU1vZHVsZSA9IGZyZWVFeHBvcnRzICYmIHR5cGVvZiBtb2R1bGUgPT0gJ29iamVjdCcgJiYgbW9kdWxlICYmICFtb2R1bGUubm9kZVR5cGUgJiYgbW9kdWxlO1xuXG4vKiogRGV0ZWN0IHRoZSBwb3B1bGFyIENvbW1vbkpTIGV4dGVuc2lvbiBgbW9kdWxlLmV4cG9ydHNgLiAqL1xudmFyIG1vZHVsZUV4cG9ydHMgPSBmcmVlTW9kdWxlICYmIGZyZWVNb2R1bGUuZXhwb3J0cyA9PT0gZnJlZUV4cG9ydHM7XG5cbi8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZSBgcHJvY2Vzc2AgZnJvbSBOb2RlLmpzLiAqL1xudmFyIGZyZWVQcm9jZXNzID0gbW9kdWxlRXhwb3J0cyAmJiBmcmVlR2xvYmFsLnByb2Nlc3M7XG5cbi8qKiBVc2VkIHRvIGFjY2VzcyBmYXN0ZXIgTm9kZS5qcyBoZWxwZXJzLiAqL1xudmFyIG5vZGVVdGlsID0gKGZ1bmN0aW9uKCkge1xuICB0cnkge1xuICAgIC8vIFVzZSBgdXRpbC50eXBlc2AgZm9yIE5vZGUuanMgMTArLlxuICAgIHZhciB0eXBlcyA9IGZyZWVNb2R1bGUgJiYgZnJlZU1vZHVsZS5yZXF1aXJlICYmIGZyZWVNb2R1bGUucmVxdWlyZSgndXRpbCcpLnR5cGVzO1xuXG4gICAgaWYgKHR5cGVzKSB7XG4gICAgICByZXR1cm4gdHlwZXM7XG4gICAgfVxuXG4gICAgLy8gTGVnYWN5IGBwcm9jZXNzLmJpbmRpbmcoJ3V0aWwnKWAgZm9yIE5vZGUuanMgPCAxMC5cbiAgICByZXR1cm4gZnJlZVByb2Nlc3MgJiYgZnJlZVByb2Nlc3MuYmluZGluZyAmJiBmcmVlUHJvY2Vzcy5iaW5kaW5nKCd1dGlsJyk7XG4gIH0gY2F0Y2ggKGUpIHt9XG59KCkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5vZGVVdGlsO1xuIiwidmFyIGJhc2VJc1R5cGVkQXJyYXkgPSByZXF1aXJlKCcuL19iYXNlSXNUeXBlZEFycmF5JyksXG4gICAgYmFzZVVuYXJ5ID0gcmVxdWlyZSgnLi9fYmFzZVVuYXJ5JyksXG4gICAgbm9kZVV0aWwgPSByZXF1aXJlKCcuL19ub2RlVXRpbCcpO1xuXG4vKiBOb2RlLmpzIGhlbHBlciByZWZlcmVuY2VzLiAqL1xudmFyIG5vZGVJc1R5cGVkQXJyYXkgPSBub2RlVXRpbCAmJiBub2RlVXRpbC5pc1R5cGVkQXJyYXk7XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgY2xhc3NpZmllZCBhcyBhIHR5cGVkIGFycmF5LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMy4wLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgdHlwZWQgYXJyYXksIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc1R5cGVkQXJyYXkobmV3IFVpbnQ4QXJyYXkpO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNUeXBlZEFycmF5KFtdKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbnZhciBpc1R5cGVkQXJyYXkgPSBub2RlSXNUeXBlZEFycmF5ID8gYmFzZVVuYXJ5KG5vZGVJc1R5cGVkQXJyYXkpIDogYmFzZUlzVHlwZWRBcnJheTtcblxubW9kdWxlLmV4cG9ydHMgPSBpc1R5cGVkQXJyYXk7XG4iLCJ2YXIgYmFzZVRpbWVzID0gcmVxdWlyZSgnLi9fYmFzZVRpbWVzJyksXG4gICAgaXNBcmd1bWVudHMgPSByZXF1aXJlKCcuL2lzQXJndW1lbnRzJyksXG4gICAgaXNBcnJheSA9IHJlcXVpcmUoJy4vaXNBcnJheScpLFxuICAgIGlzQnVmZmVyID0gcmVxdWlyZSgnLi9pc0J1ZmZlcicpLFxuICAgIGlzSW5kZXggPSByZXF1aXJlKCcuL19pc0luZGV4JyksXG4gICAgaXNUeXBlZEFycmF5ID0gcmVxdWlyZSgnLi9pc1R5cGVkQXJyYXknKTtcblxuLyoqIFVzZWQgZm9yIGJ1aWx0LWluIG1ldGhvZCByZWZlcmVuY2VzLiAqL1xudmFyIG9iamVjdFByb3RvID0gT2JqZWN0LnByb3RvdHlwZTtcblxuLyoqIFVzZWQgdG8gY2hlY2sgb2JqZWN0cyBmb3Igb3duIHByb3BlcnRpZXMuICovXG52YXIgaGFzT3duUHJvcGVydHkgPSBvYmplY3RQcm90by5oYXNPd25Qcm9wZXJ0eTtcblxuLyoqXG4gKiBDcmVhdGVzIGFuIGFycmF5IG9mIHRoZSBlbnVtZXJhYmxlIHByb3BlcnR5IG5hbWVzIG9mIHRoZSBhcnJheS1saWtlIGB2YWx1ZWAuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHF1ZXJ5LlxuICogQHBhcmFtIHtib29sZWFufSBpbmhlcml0ZWQgU3BlY2lmeSByZXR1cm5pbmcgaW5oZXJpdGVkIHByb3BlcnR5IG5hbWVzLlxuICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSBhcnJheSBvZiBwcm9wZXJ0eSBuYW1lcy5cbiAqL1xuZnVuY3Rpb24gYXJyYXlMaWtlS2V5cyh2YWx1ZSwgaW5oZXJpdGVkKSB7XG4gIHZhciBpc0FyciA9IGlzQXJyYXkodmFsdWUpLFxuICAgICAgaXNBcmcgPSAhaXNBcnIgJiYgaXNBcmd1bWVudHModmFsdWUpLFxuICAgICAgaXNCdWZmID0gIWlzQXJyICYmICFpc0FyZyAmJiBpc0J1ZmZlcih2YWx1ZSksXG4gICAgICBpc1R5cGUgPSAhaXNBcnIgJiYgIWlzQXJnICYmICFpc0J1ZmYgJiYgaXNUeXBlZEFycmF5KHZhbHVlKSxcbiAgICAgIHNraXBJbmRleGVzID0gaXNBcnIgfHwgaXNBcmcgfHwgaXNCdWZmIHx8IGlzVHlwZSxcbiAgICAgIHJlc3VsdCA9IHNraXBJbmRleGVzID8gYmFzZVRpbWVzKHZhbHVlLmxlbmd0aCwgU3RyaW5nKSA6IFtdLFxuICAgICAgbGVuZ3RoID0gcmVzdWx0Lmxlbmd0aDtcblxuICBmb3IgKHZhciBrZXkgaW4gdmFsdWUpIHtcbiAgICBpZiAoKGluaGVyaXRlZCB8fCBoYXNPd25Qcm9wZXJ0eS5jYWxsKHZhbHVlLCBrZXkpKSAmJlxuICAgICAgICAhKHNraXBJbmRleGVzICYmIChcbiAgICAgICAgICAgLy8gU2FmYXJpIDkgaGFzIGVudW1lcmFibGUgYGFyZ3VtZW50cy5sZW5ndGhgIGluIHN0cmljdCBtb2RlLlxuICAgICAgICAgICBrZXkgPT0gJ2xlbmd0aCcgfHxcbiAgICAgICAgICAgLy8gTm9kZS5qcyAwLjEwIGhhcyBlbnVtZXJhYmxlIG5vbi1pbmRleCBwcm9wZXJ0aWVzIG9uIGJ1ZmZlcnMuXG4gICAgICAgICAgIChpc0J1ZmYgJiYgKGtleSA9PSAnb2Zmc2V0JyB8fCBrZXkgPT0gJ3BhcmVudCcpKSB8fFxuICAgICAgICAgICAvLyBQaGFudG9tSlMgMiBoYXMgZW51bWVyYWJsZSBub24taW5kZXggcHJvcGVydGllcyBvbiB0eXBlZCBhcnJheXMuXG4gICAgICAgICAgIChpc1R5cGUgJiYgKGtleSA9PSAnYnVmZmVyJyB8fCBrZXkgPT0gJ2J5dGVMZW5ndGgnIHx8IGtleSA9PSAnYnl0ZU9mZnNldCcpKSB8fFxuICAgICAgICAgICAvLyBTa2lwIGluZGV4IHByb3BlcnRpZXMuXG4gICAgICAgICAgIGlzSW5kZXgoa2V5LCBsZW5ndGgpXG4gICAgICAgICkpKSB7XG4gICAgICByZXN1bHQucHVzaChrZXkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFycmF5TGlrZUtleXM7XG4iLCIvKiogVXNlZCBmb3IgYnVpbHQtaW4gbWV0aG9kIHJlZmVyZW5jZXMuICovXG52YXIgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGxpa2VseSBhIHByb3RvdHlwZSBvYmplY3QuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYSBwcm90b3R5cGUsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gaXNQcm90b3R5cGUodmFsdWUpIHtcbiAgdmFyIEN0b3IgPSB2YWx1ZSAmJiB2YWx1ZS5jb25zdHJ1Y3RvcixcbiAgICAgIHByb3RvID0gKHR5cGVvZiBDdG9yID09ICdmdW5jdGlvbicgJiYgQ3Rvci5wcm90b3R5cGUpIHx8IG9iamVjdFByb3RvO1xuXG4gIHJldHVybiB2YWx1ZSA9PT0gcHJvdG87XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaXNQcm90b3R5cGU7XG4iLCIvKipcbiAqIENyZWF0ZXMgYSB1bmFyeSBmdW5jdGlvbiB0aGF0IGludm9rZXMgYGZ1bmNgIHdpdGggaXRzIGFyZ3VtZW50IHRyYW5zZm9ybWVkLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byB3cmFwLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gdHJhbnNmb3JtIFRoZSBhcmd1bWVudCB0cmFuc2Zvcm0uXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gb3ZlckFyZyhmdW5jLCB0cmFuc2Zvcm0pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGFyZykge1xuICAgIHJldHVybiBmdW5jKHRyYW5zZm9ybShhcmcpKTtcbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBvdmVyQXJnO1xuIiwidmFyIG92ZXJBcmcgPSByZXF1aXJlKCcuL19vdmVyQXJnJyk7XG5cbi8qIEJ1aWx0LWluIG1ldGhvZCByZWZlcmVuY2VzIGZvciB0aG9zZSB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgb3RoZXIgYGxvZGFzaGAgbWV0aG9kcy4gKi9cbnZhciBuYXRpdmVLZXlzID0gb3ZlckFyZyhPYmplY3Qua2V5cywgT2JqZWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBuYXRpdmVLZXlzO1xuIiwidmFyIGlzUHJvdG90eXBlID0gcmVxdWlyZSgnLi9faXNQcm90b3R5cGUnKSxcbiAgICBuYXRpdmVLZXlzID0gcmVxdWlyZSgnLi9fbmF0aXZlS2V5cycpO1xuXG4vKiogVXNlZCBmb3IgYnVpbHQtaW4gbWV0aG9kIHJlZmVyZW5jZXMuICovXG52YXIgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKiogVXNlZCB0byBjaGVjayBvYmplY3RzIGZvciBvd24gcHJvcGVydGllcy4gKi9cbnZhciBoYXNPd25Qcm9wZXJ0eSA9IG9iamVjdFByb3RvLmhhc093blByb3BlcnR5O1xuXG4vKipcbiAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLmtleXNgIHdoaWNoIGRvZXNuJ3QgdHJlYXQgc3BhcnNlIGFycmF5cyBhcyBkZW5zZS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIHF1ZXJ5LlxuICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSBhcnJheSBvZiBwcm9wZXJ0eSBuYW1lcy5cbiAqL1xuZnVuY3Rpb24gYmFzZUtleXMob2JqZWN0KSB7XG4gIGlmICghaXNQcm90b3R5cGUob2JqZWN0KSkge1xuICAgIHJldHVybiBuYXRpdmVLZXlzKG9iamVjdCk7XG4gIH1cbiAgdmFyIHJlc3VsdCA9IFtdO1xuICBmb3IgKHZhciBrZXkgaW4gT2JqZWN0KG9iamVjdCkpIHtcbiAgICBpZiAoaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIGtleSkgJiYga2V5ICE9ICdjb25zdHJ1Y3RvcicpIHtcbiAgICAgIHJlc3VsdC5wdXNoKGtleSk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYmFzZUtleXM7XG4iLCIvKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIHRoZVxuICogW2xhbmd1YWdlIHR5cGVdKGh0dHA6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi83LjAvI3NlYy1lY21hc2NyaXB0LWxhbmd1YWdlLXR5cGVzKVxuICogb2YgYE9iamVjdGAuIChlLmcuIGFycmF5cywgZnVuY3Rpb25zLCBvYmplY3RzLCByZWdleGVzLCBgbmV3IE51bWJlcigwKWAsIGFuZCBgbmV3IFN0cmluZygnJylgKVxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMC4xLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzT2JqZWN0KHt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KFsxLCAyLCAzXSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdChfLm5vb3ApO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3QobnVsbCk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xuICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcbiAgcmV0dXJuIHZhbHVlICE9IG51bGwgJiYgKHR5cGUgPT0gJ29iamVjdCcgfHwgdHlwZSA9PSAnZnVuY3Rpb24nKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpc09iamVjdDtcbiIsInZhciBiYXNlR2V0VGFnID0gcmVxdWlyZSgnLi9fYmFzZUdldFRhZycpLFxuICAgIGlzT2JqZWN0ID0gcmVxdWlyZSgnLi9pc09iamVjdCcpO1xuXG4vKiogYE9iamVjdCN0b1N0cmluZ2AgcmVzdWx0IHJlZmVyZW5jZXMuICovXG52YXIgYXN5bmNUYWcgPSAnW29iamVjdCBBc3luY0Z1bmN0aW9uXScsXG4gICAgZnVuY1RhZyA9ICdbb2JqZWN0IEZ1bmN0aW9uXScsXG4gICAgZ2VuVGFnID0gJ1tvYmplY3QgR2VuZXJhdG9yRnVuY3Rpb25dJyxcbiAgICBwcm94eVRhZyA9ICdbb2JqZWN0IFByb3h5XSc7XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgY2xhc3NpZmllZCBhcyBhIGBGdW5jdGlvbmAgb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMC4xLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgZnVuY3Rpb24sIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc0Z1bmN0aW9uKF8pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNGdW5jdGlvbigvYWJjLyk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKHZhbHVlKSB7XG4gIGlmICghaXNPYmplY3QodmFsdWUpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIC8vIFRoZSB1c2Ugb2YgYE9iamVjdCN0b1N0cmluZ2AgYXZvaWRzIGlzc3VlcyB3aXRoIHRoZSBgdHlwZW9mYCBvcGVyYXRvclxuICAvLyBpbiBTYWZhcmkgOSB3aGljaCByZXR1cm5zICdvYmplY3QnIGZvciB0eXBlZCBhcnJheXMgYW5kIG90aGVyIGNvbnN0cnVjdG9ycy5cbiAgdmFyIHRhZyA9IGJhc2VHZXRUYWcodmFsdWUpO1xuICByZXR1cm4gdGFnID09IGZ1bmNUYWcgfHwgdGFnID09IGdlblRhZyB8fCB0YWcgPT0gYXN5bmNUYWcgfHwgdGFnID09IHByb3h5VGFnO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzRnVuY3Rpb247XG4iLCJ2YXIgaXNGdW5jdGlvbiA9IHJlcXVpcmUoJy4vaXNGdW5jdGlvbicpLFxuICAgIGlzTGVuZ3RoID0gcmVxdWlyZSgnLi9pc0xlbmd0aCcpO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGFycmF5LWxpa2UuIEEgdmFsdWUgaXMgY29uc2lkZXJlZCBhcnJheS1saWtlIGlmIGl0J3NcbiAqIG5vdCBhIGZ1bmN0aW9uIGFuZCBoYXMgYSBgdmFsdWUubGVuZ3RoYCB0aGF0J3MgYW4gaW50ZWdlciBncmVhdGVyIHRoYW4gb3JcbiAqIGVxdWFsIHRvIGAwYCBhbmQgbGVzcyB0aGFuIG9yIGVxdWFsIHRvIGBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUmAuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSA0LjAuMFxuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYXJyYXktbGlrZSwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzQXJyYXlMaWtlKFsxLCAyLCAzXSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc0FycmF5TGlrZShkb2N1bWVudC5ib2R5LmNoaWxkcmVuKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzQXJyYXlMaWtlKCdhYmMnKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzQXJyYXlMaWtlKF8ubm9vcCk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0FycmF5TGlrZSh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgIT0gbnVsbCAmJiBpc0xlbmd0aCh2YWx1ZS5sZW5ndGgpICYmICFpc0Z1bmN0aW9uKHZhbHVlKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpc0FycmF5TGlrZTtcbiIsInZhciBhcnJheUxpa2VLZXlzID0gcmVxdWlyZSgnLi9fYXJyYXlMaWtlS2V5cycpLFxuICAgIGJhc2VLZXlzID0gcmVxdWlyZSgnLi9fYmFzZUtleXMnKSxcbiAgICBpc0FycmF5TGlrZSA9IHJlcXVpcmUoJy4vaXNBcnJheUxpa2UnKTtcblxuLyoqXG4gKiBDcmVhdGVzIGFuIGFycmF5IG9mIHRoZSBvd24gZW51bWVyYWJsZSBwcm9wZXJ0eSBuYW1lcyBvZiBgb2JqZWN0YC5cbiAqXG4gKiAqKk5vdGU6KiogTm9uLW9iamVjdCB2YWx1ZXMgYXJlIGNvZXJjZWQgdG8gb2JqZWN0cy4gU2VlIHRoZVxuICogW0VTIHNwZWNdKGh0dHA6Ly9lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzcuMC8jc2VjLW9iamVjdC5rZXlzKVxuICogZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBAc3RhdGljXG4gKiBAc2luY2UgMC4xLjBcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgT2JqZWN0XG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gcXVlcnkuXG4gKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgdGhlIGFycmF5IG9mIHByb3BlcnR5IG5hbWVzLlxuICogQGV4YW1wbGVcbiAqXG4gKiBmdW5jdGlvbiBGb28oKSB7XG4gKiAgIHRoaXMuYSA9IDE7XG4gKiAgIHRoaXMuYiA9IDI7XG4gKiB9XG4gKlxuICogRm9vLnByb3RvdHlwZS5jID0gMztcbiAqXG4gKiBfLmtleXMobmV3IEZvbyk7XG4gKiAvLyA9PiBbJ2EnLCAnYiddIChpdGVyYXRpb24gb3JkZXIgaXMgbm90IGd1YXJhbnRlZWQpXG4gKlxuICogXy5rZXlzKCdoaScpO1xuICogLy8gPT4gWycwJywgJzEnXVxuICovXG5mdW5jdGlvbiBrZXlzKG9iamVjdCkge1xuICByZXR1cm4gaXNBcnJheUxpa2Uob2JqZWN0KSA/IGFycmF5TGlrZUtleXMob2JqZWN0KSA6IGJhc2VLZXlzKG9iamVjdCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ga2V5cztcbiIsInZhciBiYXNlRm9yID0gcmVxdWlyZSgnLi9fYmFzZUZvcicpLFxuICAgIGtleXMgPSByZXF1aXJlKCcuL2tleXMnKTtcblxuLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5mb3JPd25gIHdpdGhvdXQgc3VwcG9ydCBmb3IgaXRlcmF0ZWUgc2hvcnRoYW5kcy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIFRoZSBmdW5jdGlvbiBpbnZva2VkIHBlciBpdGVyYXRpb24uXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIGBvYmplY3RgLlxuICovXG5mdW5jdGlvbiBiYXNlRm9yT3duKG9iamVjdCwgaXRlcmF0ZWUpIHtcbiAgcmV0dXJuIG9iamVjdCAmJiBiYXNlRm9yKG9iamVjdCwgaXRlcmF0ZWUsIGtleXMpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJhc2VGb3JPd247XG4iLCJ2YXIgaXNBcnJheUxpa2UgPSByZXF1aXJlKCcuL2lzQXJyYXlMaWtlJyk7XG5cbi8qKlxuICogQ3JlYXRlcyBhIGBiYXNlRWFjaGAgb3IgYGJhc2VFYWNoUmlnaHRgIGZ1bmN0aW9uLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBlYWNoRnVuYyBUaGUgZnVuY3Rpb24gdG8gaXRlcmF0ZSBvdmVyIGEgY29sbGVjdGlvbi5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW2Zyb21SaWdodF0gU3BlY2lmeSBpdGVyYXRpbmcgZnJvbSByaWdodCB0byBsZWZ0LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgYmFzZSBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlQmFzZUVhY2goZWFjaEZ1bmMsIGZyb21SaWdodCkge1xuICByZXR1cm4gZnVuY3Rpb24oY29sbGVjdGlvbiwgaXRlcmF0ZWUpIHtcbiAgICBpZiAoY29sbGVjdGlvbiA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gY29sbGVjdGlvbjtcbiAgICB9XG4gICAgaWYgKCFpc0FycmF5TGlrZShjb2xsZWN0aW9uKSkge1xuICAgICAgcmV0dXJuIGVhY2hGdW5jKGNvbGxlY3Rpb24sIGl0ZXJhdGVlKTtcbiAgICB9XG4gICAgdmFyIGxlbmd0aCA9IGNvbGxlY3Rpb24ubGVuZ3RoLFxuICAgICAgICBpbmRleCA9IGZyb21SaWdodCA/IGxlbmd0aCA6IC0xLFxuICAgICAgICBpdGVyYWJsZSA9IE9iamVjdChjb2xsZWN0aW9uKTtcblxuICAgIHdoaWxlICgoZnJvbVJpZ2h0ID8gaW5kZXgtLSA6ICsraW5kZXggPCBsZW5ndGgpKSB7XG4gICAgICBpZiAoaXRlcmF0ZWUoaXRlcmFibGVbaW5kZXhdLCBpbmRleCwgaXRlcmFibGUpID09PSBmYWxzZSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNvbGxlY3Rpb247XG4gIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlQmFzZUVhY2g7XG4iLCJ2YXIgYmFzZUZvck93biA9IHJlcXVpcmUoJy4vX2Jhc2VGb3JPd24nKSxcbiAgICBjcmVhdGVCYXNlRWFjaCA9IHJlcXVpcmUoJy4vX2NyZWF0ZUJhc2VFYWNoJyk7XG5cbi8qKlxuICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8uZm9yRWFjaGAgd2l0aG91dCBzdXBwb3J0IGZvciBpdGVyYXRlZSBzaG9ydGhhbmRzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0FycmF5fE9iamVjdH0gY29sbGVjdGlvbiBUaGUgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSBUaGUgZnVuY3Rpb24gaW52b2tlZCBwZXIgaXRlcmF0aW9uLlxuICogQHJldHVybnMge0FycmF5fE9iamVjdH0gUmV0dXJucyBgY29sbGVjdGlvbmAuXG4gKi9cbnZhciBiYXNlRWFjaCA9IGNyZWF0ZUJhc2VFYWNoKGJhc2VGb3JPd24pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGJhc2VFYWNoO1xuIiwiLyoqXG4gKiBUaGlzIG1ldGhvZCByZXR1cm5zIHRoZSBmaXJzdCBhcmd1bWVudCBpdCByZWNlaXZlcy5cbiAqXG4gKiBAc3RhdGljXG4gKiBAc2luY2UgMC4xLjBcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgVXRpbFxuICogQHBhcmFtIHsqfSB2YWx1ZSBBbnkgdmFsdWUuXG4gKiBAcmV0dXJucyB7Kn0gUmV0dXJucyBgdmFsdWVgLlxuICogQGV4YW1wbGVcbiAqXG4gKiB2YXIgb2JqZWN0ID0geyAnYSc6IDEgfTtcbiAqXG4gKiBjb25zb2xlLmxvZyhfLmlkZW50aXR5KG9iamVjdCkgPT09IG9iamVjdCk7XG4gKiAvLyA9PiB0cnVlXG4gKi9cbmZ1bmN0aW9uIGlkZW50aXR5KHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpZGVudGl0eTtcbiIsInZhciBpZGVudGl0eSA9IHJlcXVpcmUoJy4vaWRlbnRpdHknKTtcblxuLyoqXG4gKiBDYXN0cyBgdmFsdWVgIHRvIGBpZGVudGl0eWAgaWYgaXQncyBub3QgYSBmdW5jdGlvbi5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gaW5zcGVjdC5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyBjYXN0IGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiBjYXN0RnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnZnVuY3Rpb24nID8gdmFsdWUgOiBpZGVudGl0eTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjYXN0RnVuY3Rpb247XG4iLCJ2YXIgYXJyYXlFYWNoID0gcmVxdWlyZSgnLi9fYXJyYXlFYWNoJyksXG4gICAgYmFzZUVhY2ggPSByZXF1aXJlKCcuL19iYXNlRWFjaCcpLFxuICAgIGNhc3RGdW5jdGlvbiA9IHJlcXVpcmUoJy4vX2Nhc3RGdW5jdGlvbicpLFxuICAgIGlzQXJyYXkgPSByZXF1aXJlKCcuL2lzQXJyYXknKTtcblxuLyoqXG4gKiBJdGVyYXRlcyBvdmVyIGVsZW1lbnRzIG9mIGBjb2xsZWN0aW9uYCBhbmQgaW52b2tlcyBgaXRlcmF0ZWVgIGZvciBlYWNoIGVsZW1lbnQuXG4gKiBUaGUgaXRlcmF0ZWUgaXMgaW52b2tlZCB3aXRoIHRocmVlIGFyZ3VtZW50czogKHZhbHVlLCBpbmRleHxrZXksIGNvbGxlY3Rpb24pLlxuICogSXRlcmF0ZWUgZnVuY3Rpb25zIG1heSBleGl0IGl0ZXJhdGlvbiBlYXJseSBieSBleHBsaWNpdGx5IHJldHVybmluZyBgZmFsc2VgLlxuICpcbiAqICoqTm90ZToqKiBBcyB3aXRoIG90aGVyIFwiQ29sbGVjdGlvbnNcIiBtZXRob2RzLCBvYmplY3RzIHdpdGggYSBcImxlbmd0aFwiXG4gKiBwcm9wZXJ0eSBhcmUgaXRlcmF0ZWQgbGlrZSBhcnJheXMuIFRvIGF2b2lkIHRoaXMgYmVoYXZpb3IgdXNlIGBfLmZvckluYFxuICogb3IgYF8uZm9yT3duYCBmb3Igb2JqZWN0IGl0ZXJhdGlvbi5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDAuMS4wXG4gKiBAYWxpYXMgZWFjaFxuICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtpdGVyYXRlZT1fLmlkZW50aXR5XSBUaGUgZnVuY3Rpb24gaW52b2tlZCBwZXIgaXRlcmF0aW9uLlxuICogQHJldHVybnMge0FycmF5fE9iamVjdH0gUmV0dXJucyBgY29sbGVjdGlvbmAuXG4gKiBAc2VlIF8uZm9yRWFjaFJpZ2h0XG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uZm9yRWFjaChbMSwgMl0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gKiAgIGNvbnNvbGUubG9nKHZhbHVlKTtcbiAqIH0pO1xuICogLy8gPT4gTG9ncyBgMWAgdGhlbiBgMmAuXG4gKlxuICogXy5mb3JFYWNoKHsgJ2EnOiAxLCAnYic6IDIgfSwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICogICBjb25zb2xlLmxvZyhrZXkpO1xuICogfSk7XG4gKiAvLyA9PiBMb2dzICdhJyB0aGVuICdiJyAoaXRlcmF0aW9uIG9yZGVyIGlzIG5vdCBndWFyYW50ZWVkKS5cbiAqL1xuZnVuY3Rpb24gZm9yRWFjaChjb2xsZWN0aW9uLCBpdGVyYXRlZSkge1xuICB2YXIgZnVuYyA9IGlzQXJyYXkoY29sbGVjdGlvbikgPyBhcnJheUVhY2ggOiBiYXNlRWFjaDtcbiAgcmV0dXJuIGZ1bmMoY29sbGVjdGlvbiwgY2FzdEZ1bmN0aW9uKGl0ZXJhdGVlKSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZm9yRWFjaDtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9mb3JFYWNoJyk7XG4iLCJ2YXIgaXNPYmplY3QgPSByZXF1aXJlKCcuL2lzT2JqZWN0JyksXG4gICAgaXNTeW1ib2wgPSByZXF1aXJlKCcuL2lzU3ltYm9sJyk7XG5cbi8qKiBVc2VkIGFzIHJlZmVyZW5jZXMgZm9yIHZhcmlvdXMgYE51bWJlcmAgY29uc3RhbnRzLiAqL1xudmFyIE5BTiA9IDAgLyAwO1xuXG4vKiogVXNlZCB0byBtYXRjaCBsZWFkaW5nIGFuZCB0cmFpbGluZyB3aGl0ZXNwYWNlLiAqL1xudmFyIHJlVHJpbSA9IC9eXFxzK3xcXHMrJC9nO1xuXG4vKiogVXNlZCB0byBkZXRlY3QgYmFkIHNpZ25lZCBoZXhhZGVjaW1hbCBzdHJpbmcgdmFsdWVzLiAqL1xudmFyIHJlSXNCYWRIZXggPSAvXlstK10weFswLTlhLWZdKyQvaTtcblxuLyoqIFVzZWQgdG8gZGV0ZWN0IGJpbmFyeSBzdHJpbmcgdmFsdWVzLiAqL1xudmFyIHJlSXNCaW5hcnkgPSAvXjBiWzAxXSskL2k7XG5cbi8qKiBVc2VkIHRvIGRldGVjdCBvY3RhbCBzdHJpbmcgdmFsdWVzLiAqL1xudmFyIHJlSXNPY3RhbCA9IC9eMG9bMC03XSskL2k7XG5cbi8qKiBCdWlsdC1pbiBtZXRob2QgcmVmZXJlbmNlcyB3aXRob3V0IGEgZGVwZW5kZW5jeSBvbiBgcm9vdGAuICovXG52YXIgZnJlZVBhcnNlSW50ID0gcGFyc2VJbnQ7XG5cbi8qKlxuICogQ29udmVydHMgYHZhbHVlYCB0byBhIG51bWJlci5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDQuMC4wXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gcHJvY2Vzcy5cbiAqIEByZXR1cm5zIHtudW1iZXJ9IFJldHVybnMgdGhlIG51bWJlci5cbiAqIEBleGFtcGxlXG4gKlxuICogXy50b051bWJlcigzLjIpO1xuICogLy8gPT4gMy4yXG4gKlxuICogXy50b051bWJlcihOdW1iZXIuTUlOX1ZBTFVFKTtcbiAqIC8vID0+IDVlLTMyNFxuICpcbiAqIF8udG9OdW1iZXIoSW5maW5pdHkpO1xuICogLy8gPT4gSW5maW5pdHlcbiAqXG4gKiBfLnRvTnVtYmVyKCczLjInKTtcbiAqIC8vID0+IDMuMlxuICovXG5mdW5jdGlvbiB0b051bWJlcih2YWx1ZSkge1xuICBpZiAodHlwZW9mIHZhbHVlID09ICdudW1iZXInKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG4gIGlmIChpc1N5bWJvbCh2YWx1ZSkpIHtcbiAgICByZXR1cm4gTkFOO1xuICB9XG4gIGlmIChpc09iamVjdCh2YWx1ZSkpIHtcbiAgICB2YXIgb3RoZXIgPSB0eXBlb2YgdmFsdWUudmFsdWVPZiA9PSAnZnVuY3Rpb24nID8gdmFsdWUudmFsdWVPZigpIDogdmFsdWU7XG4gICAgdmFsdWUgPSBpc09iamVjdChvdGhlcikgPyAob3RoZXIgKyAnJykgOiBvdGhlcjtcbiAgfVxuICBpZiAodHlwZW9mIHZhbHVlICE9ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIHZhbHVlID09PSAwID8gdmFsdWUgOiArdmFsdWU7XG4gIH1cbiAgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKHJlVHJpbSwgJycpO1xuICB2YXIgaXNCaW5hcnkgPSByZUlzQmluYXJ5LnRlc3QodmFsdWUpO1xuICByZXR1cm4gKGlzQmluYXJ5IHx8IHJlSXNPY3RhbC50ZXN0KHZhbHVlKSlcbiAgICA/IGZyZWVQYXJzZUludCh2YWx1ZS5zbGljZSgyKSwgaXNCaW5hcnkgPyAyIDogOClcbiAgICA6IChyZUlzQmFkSGV4LnRlc3QodmFsdWUpID8gTkFOIDogK3ZhbHVlKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB0b051bWJlcjtcbiIsInZhciB0b051bWJlciA9IHJlcXVpcmUoJy4vdG9OdW1iZXInKTtcblxuLyoqIFVzZWQgYXMgcmVmZXJlbmNlcyBmb3IgdmFyaW91cyBgTnVtYmVyYCBjb25zdGFudHMuICovXG52YXIgSU5GSU5JVFkgPSAxIC8gMCxcbiAgICBNQVhfSU5URUdFUiA9IDEuNzk3NjkzMTM0ODYyMzE1N2UrMzA4O1xuXG4vKipcbiAqIENvbnZlcnRzIGB2YWx1ZWAgdG8gYSBmaW5pdGUgbnVtYmVyLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgNC4xMi4wXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY29udmVydC5cbiAqIEByZXR1cm5zIHtudW1iZXJ9IFJldHVybnMgdGhlIGNvbnZlcnRlZCBudW1iZXIuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8udG9GaW5pdGUoMy4yKTtcbiAqIC8vID0+IDMuMlxuICpcbiAqIF8udG9GaW5pdGUoTnVtYmVyLk1JTl9WQUxVRSk7XG4gKiAvLyA9PiA1ZS0zMjRcbiAqXG4gKiBfLnRvRmluaXRlKEluZmluaXR5KTtcbiAqIC8vID0+IDEuNzk3NjkzMTM0ODYyMzE1N2UrMzA4XG4gKlxuICogXy50b0Zpbml0ZSgnMy4yJyk7XG4gKiAvLyA9PiAzLjJcbiAqL1xuZnVuY3Rpb24gdG9GaW5pdGUodmFsdWUpIHtcbiAgaWYgKCF2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZSA9PT0gMCA/IHZhbHVlIDogMDtcbiAgfVxuICB2YWx1ZSA9IHRvTnVtYmVyKHZhbHVlKTtcbiAgaWYgKHZhbHVlID09PSBJTkZJTklUWSB8fCB2YWx1ZSA9PT0gLUlORklOSVRZKSB7XG4gICAgdmFyIHNpZ24gPSAodmFsdWUgPCAwID8gLTEgOiAxKTtcbiAgICByZXR1cm4gc2lnbiAqIE1BWF9JTlRFR0VSO1xuICB9XG4gIHJldHVybiB2YWx1ZSA9PT0gdmFsdWUgPyB2YWx1ZSA6IDA7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdG9GaW5pdGU7XG4iLCJ2YXIgdG9GaW5pdGUgPSByZXF1aXJlKCcuL3RvRmluaXRlJyk7XG5cbi8qKlxuICogQ29udmVydHMgYHZhbHVlYCB0byBhbiBpbnRlZ2VyLlxuICpcbiAqICoqTm90ZToqKiBUaGlzIG1ldGhvZCBpcyBsb29zZWx5IGJhc2VkIG9uXG4gKiBbYFRvSW50ZWdlcmBdKGh0dHA6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi83LjAvI3NlYy10b2ludGVnZXIpLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgNC4wLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjb252ZXJ0LlxuICogQHJldHVybnMge251bWJlcn0gUmV0dXJucyB0aGUgY29udmVydGVkIGludGVnZXIuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8udG9JbnRlZ2VyKDMuMik7XG4gKiAvLyA9PiAzXG4gKlxuICogXy50b0ludGVnZXIoTnVtYmVyLk1JTl9WQUxVRSk7XG4gKiAvLyA9PiAwXG4gKlxuICogXy50b0ludGVnZXIoSW5maW5pdHkpO1xuICogLy8gPT4gMS43OTc2OTMxMzQ4NjIzMTU3ZSszMDhcbiAqXG4gKiBfLnRvSW50ZWdlcignMy4yJyk7XG4gKiAvLyA9PiAzXG4gKi9cbmZ1bmN0aW9uIHRvSW50ZWdlcih2YWx1ZSkge1xuICB2YXIgcmVzdWx0ID0gdG9GaW5pdGUodmFsdWUpLFxuICAgICAgcmVtYWluZGVyID0gcmVzdWx0ICUgMTtcblxuICByZXR1cm4gcmVzdWx0ID09PSByZXN1bHQgPyAocmVtYWluZGVyID8gcmVzdWx0IC0gcmVtYWluZGVyIDogcmVzdWx0KSA6IDA7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdG9JbnRlZ2VyO1xuIiwidmFyIHRvSW50ZWdlciA9IHJlcXVpcmUoJy4vdG9JbnRlZ2VyJyk7XG5cbi8qKiBFcnJvciBtZXNzYWdlIGNvbnN0YW50cy4gKi9cbnZhciBGVU5DX0VSUk9SX1RFWFQgPSAnRXhwZWN0ZWQgYSBmdW5jdGlvbic7XG5cbi8qKlxuICogQ3JlYXRlcyBhIGZ1bmN0aW9uIHRoYXQgaW52b2tlcyBgZnVuY2AsIHdpdGggdGhlIGB0aGlzYCBiaW5kaW5nIGFuZCBhcmd1bWVudHNcbiAqIG9mIHRoZSBjcmVhdGVkIGZ1bmN0aW9uLCB3aGlsZSBpdCdzIGNhbGxlZCBsZXNzIHRoYW4gYG5gIHRpbWVzLiBTdWJzZXF1ZW50XG4gKiBjYWxscyB0byB0aGUgY3JlYXRlZCBmdW5jdGlvbiByZXR1cm4gdGhlIHJlc3VsdCBvZiB0aGUgbGFzdCBgZnVuY2AgaW52b2NhdGlvbi5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDMuMC4wXG4gKiBAY2F0ZWdvcnkgRnVuY3Rpb25cbiAqIEBwYXJhbSB7bnVtYmVyfSBuIFRoZSBudW1iZXIgb2YgY2FsbHMgYXQgd2hpY2ggYGZ1bmNgIGlzIG5vIGxvbmdlciBpbnZva2VkLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gcmVzdHJpY3QuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyByZXN0cmljdGVkIGZ1bmN0aW9uLlxuICogQGV4YW1wbGVcbiAqXG4gKiBqUXVlcnkoZWxlbWVudCkub24oJ2NsaWNrJywgXy5iZWZvcmUoNSwgYWRkQ29udGFjdFRvTGlzdCkpO1xuICogLy8gPT4gQWxsb3dzIGFkZGluZyB1cCB0byA0IGNvbnRhY3RzIHRvIHRoZSBsaXN0LlxuICovXG5mdW5jdGlvbiBiZWZvcmUobiwgZnVuYykge1xuICB2YXIgcmVzdWx0O1xuICBpZiAodHlwZW9mIGZ1bmMgIT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoRlVOQ19FUlJPUl9URVhUKTtcbiAgfVxuICBuID0gdG9JbnRlZ2VyKG4pO1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgaWYgKC0tbiA+IDApIHtcbiAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgaWYgKG4gPD0gMSkge1xuICAgICAgZnVuYyA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBiZWZvcmU7XG4iLCJ2YXIgYmVmb3JlID0gcmVxdWlyZSgnLi9iZWZvcmUnKTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgZnVuY3Rpb24gdGhhdCBpcyByZXN0cmljdGVkIHRvIGludm9raW5nIGBmdW5jYCBvbmNlLiBSZXBlYXQgY2FsbHNcbiAqIHRvIHRoZSBmdW5jdGlvbiByZXR1cm4gdGhlIHZhbHVlIG9mIHRoZSBmaXJzdCBpbnZvY2F0aW9uLiBUaGUgYGZ1bmNgIGlzXG4gKiBpbnZva2VkIHdpdGggdGhlIGB0aGlzYCBiaW5kaW5nIGFuZCBhcmd1bWVudHMgb2YgdGhlIGNyZWF0ZWQgZnVuY3Rpb24uXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSAwLjEuMFxuICogQGNhdGVnb3J5IEZ1bmN0aW9uXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byByZXN0cmljdC5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IHJlc3RyaWN0ZWQgZnVuY3Rpb24uXG4gKiBAZXhhbXBsZVxuICpcbiAqIHZhciBpbml0aWFsaXplID0gXy5vbmNlKGNyZWF0ZUFwcGxpY2F0aW9uKTtcbiAqIGluaXRpYWxpemUoKTtcbiAqIGluaXRpYWxpemUoKTtcbiAqIC8vID0+IGBjcmVhdGVBcHBsaWNhdGlvbmAgaXMgaW52b2tlZCBvbmNlXG4gKi9cbmZ1bmN0aW9uIG9uY2UoZnVuYykge1xuICByZXR1cm4gYmVmb3JlKDIsIGZ1bmMpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IG9uY2U7XG4iLCIvKlxuICogIEV2ZW50cyBtaXhpbiBmcm9tIEJhY2tib25lIFxuICpcbiAqICBCYWNrYm9uZS5qcyAxLjAuMFxuICpcbiAqICAoYykgMjAxMC0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBJbmMuXG4gKiAgQmFja2JvbmUgbWF5IGJlIGZyZWVseSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG4gKiAgRm9yIGFsbCBkZXRhaWxzIGFuZCBkb2N1bWVudGF0aW9uOlxuICogIGh0dHA6KmJhY2tib25lanMub3JnXG4gKlxuICogIEEgbW9kdWxlIHRoYXQgY2FuIGJlIG1peGVkIGluIHRvICphbnkgb2JqZWN0KiBpbiBvcmRlciB0byBwcm92aWRlIGl0IHdpdGhcbiAqICBjdXN0b20gZXZlbnRzLiBZb3UgbWF5IGJpbmQgd2l0aCBgb25gIG9yIHJlbW92ZSB3aXRoIGBvZmZgIGNhbGxiYWNrIGZ1bmN0aW9uc1xuICogIHRvIGFuIGV2ZW50OyB0cmlnZ2VyYC1pbmcgYW4gZXZlbnQgZmlyZXMgYWxsIGNhbGxiYWNrcyBpbiBzdWNjZXNzaW9uLlxuICpcbiAqICB2YXIgb2JqZWN0ID0ge307XG4gKiAgXy5leHRlbmQob2JqZWN0LCBCYWNrYm9uZS5FdmVudHMpO1xuICogIG9iamVjdC5vbignZXhwYW5kJywgZnVuY3Rpb24oKXsgYWxlcnQoJ2V4cGFuZGVkJyk7IH0pO1xuICogIG9iamVjdC50cmlnZ2VyKCdleHBhbmQnKTtcbiAqL1xuXG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuXG52YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG5cbnZhciBFdmVudHMgPSB7XG5cbiAgLy8gQmluZCBhbiBldmVudCB0byBhIGBjYWxsYmFja2AgZnVuY3Rpb24uIFBhc3NpbmcgYFwiYWxsXCJgIHdpbGwgYmluZFxuICAvLyB0aGUgY2FsbGJhY2sgdG8gYWxsIGV2ZW50cyBmaXJlZC5cbiAgb246IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgaWYgKCFldmVudHNBcGkodGhpcywgJ29uJywgbmFtZSwgW2NhbGxiYWNrLCBjb250ZXh0XSkgfHwgIWNhbGxiYWNrKSB7IHJldHVybiB0aGlzOyB9XG4gICAgaWYgKCF0aGlzLl9ldmVudHMpIHsgdGhpcy5fZXZlbnRzID0ge307IH1cbiAgICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdIHx8ICh0aGlzLl9ldmVudHNbbmFtZV0gPSBbXSk7XG4gICAgZXZlbnRzLnB1c2goe2NhbGxiYWNrOiBjYWxsYmFjaywgY29udGV4dDogY29udGV4dCwgY3R4OiBjb250ZXh0IHx8IHRoaXN9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvLyBCaW5kIGFuIGV2ZW50IHRvIG9ubHkgYmUgdHJpZ2dlcmVkIGEgc2luZ2xlIHRpbWUuIEFmdGVyIHRoZSBmaXJzdCB0aW1lXG4gIC8vIHRoZSBjYWxsYmFjayBpcyBpbnZva2VkLCBpdCB3aWxsIGJlIHJlbW92ZWQuXG4gIG9uY2U6IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgaWYgKCFldmVudHNBcGkodGhpcywgJ29uY2UnLCBuYW1lLCBbY2FsbGJhY2ssIGNvbnRleHRdKSB8fCAhY2FsbGJhY2spIHsgcmV0dXJuIHRoaXM7IH1cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG9uY2UgPSBfLm9uY2UoZnVuY3Rpb24oKSB7XG4gICAgICBzZWxmLm9mZihuYW1lLCBvbmNlKTtcbiAgICAgIGNhbGxiYWNrLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfSk7XG4gICAgb25jZS5fY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICByZXR1cm4gdGhpcy5vbihuYW1lLCBvbmNlLCBjb250ZXh0KTtcbiAgfSxcblxuICAvLyBSZW1vdmUgb25lIG9yIG1hbnkgY2FsbGJhY2tzLiBJZiBgY29udGV4dGAgaXMgbnVsbCwgcmVtb3ZlcyBhbGxcbiAgLy8gY2FsbGJhY2tzIHdpdGggdGhhdCBmdW5jdGlvbi4gSWYgYGNhbGxiYWNrYCBpcyBudWxsLCByZW1vdmVzIGFsbFxuICAvLyBjYWxsYmFja3MgZm9yIHRoZSBldmVudC4gSWYgYG5hbWVgIGlzIG51bGwsIHJlbW92ZXMgYWxsIGJvdW5kXG4gIC8vIGNhbGxiYWNrcyBmb3IgYWxsIGV2ZW50cy5cbiAgb2ZmOiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgIHZhciByZXRhaW4sIGV2LCBldmVudHMsIG5hbWVzLCBpLCBsLCBqLCBrO1xuICAgIGlmICghdGhpcy5fZXZlbnRzIHx8ICFldmVudHNBcGkodGhpcywgJ29mZicsIG5hbWUsIFtjYWxsYmFjaywgY29udGV4dF0pKSB7IHJldHVybiB0aGlzOyB9XG4gICAgaWYgKCFuYW1lICYmICFjYWxsYmFjayAmJiAhY29udGV4dCkge1xuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBuYW1lcyA9IG5hbWUgPyBbbmFtZV0gOiBfLmtleXModGhpcy5fZXZlbnRzKTtcbiAgICBmb3IgKGkgPSAwLCBsID0gbmFtZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBuYW1lID0gbmFtZXNbaV07XG4gICAgICBpZiAoZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tY29uZC1hc3NpZ25cbiAgICAgICAgdGhpcy5fZXZlbnRzW25hbWVdID0gcmV0YWluID0gW107XG4gICAgICAgIGlmIChjYWxsYmFjayB8fCBjb250ZXh0KSB7XG4gICAgICAgICAgZm9yIChqID0gMCwgayA9IGV2ZW50cy5sZW5ndGg7IGogPCBrOyBqKyspIHtcbiAgICAgICAgICAgIGV2ID0gZXZlbnRzW2pdO1xuICAgICAgICAgICAgaWYgKChjYWxsYmFjayAmJiBjYWxsYmFjayAhPT0gZXYuY2FsbGJhY2sgJiYgY2FsbGJhY2sgIT09IGV2LmNhbGxiYWNrLl9jYWxsYmFjaykgfHxcbiAgICAgICAgICAgICAgICAoY29udGV4dCAmJiBjb250ZXh0ICE9PSBldi5jb250ZXh0KSkge1xuICAgICAgICAgICAgICByZXRhaW4ucHVzaChldik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghcmV0YWluLmxlbmd0aCkgeyBkZWxldGUgdGhpcy5fZXZlbnRzW25hbWVdOyB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLy8gVHJpZ2dlciBvbmUgb3IgbWFueSBldmVudHMsIGZpcmluZyBhbGwgYm91bmQgY2FsbGJhY2tzLiBDYWxsYmFja3MgYXJlXG4gIC8vIHBhc3NlZCB0aGUgc2FtZSBhcmd1bWVudHMgYXMgYHRyaWdnZXJgIGlzLCBhcGFydCBmcm9tIHRoZSBldmVudCBuYW1lXG4gIC8vICh1bmxlc3MgeW91J3JlIGxpc3RlbmluZyBvbiBgXCJhbGxcImAsIHdoaWNoIHdpbGwgY2F1c2UgeW91ciBjYWxsYmFjayB0b1xuICAvLyByZWNlaXZlIHRoZSB0cnVlIG5hbWUgb2YgdGhlIGV2ZW50IGFzIHRoZSBmaXJzdCBhcmd1bWVudCkuXG4gIHRyaWdnZXI6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cykgeyByZXR1cm4gdGhpczsgfVxuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIGlmICghZXZlbnRzQXBpKHRoaXMsICd0cmlnZ2VyJywgbmFtZSwgYXJncykpIHsgcmV0dXJuIHRoaXM7IH1cbiAgICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdO1xuICAgIHZhciBhbGxFdmVudHMgPSB0aGlzLl9ldmVudHMuYWxsO1xuICAgIGlmIChldmVudHMpIHsgdHJpZ2dlckV2ZW50cyhldmVudHMsIGFyZ3MpOyB9XG4gICAgaWYgKGFsbEV2ZW50cykgeyB0cmlnZ2VyRXZlbnRzKGFsbEV2ZW50cywgYXJndW1lbnRzKTsgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8vIFRlbGwgdGhpcyBvYmplY3QgdG8gc3RvcCBsaXN0ZW5pbmcgdG8gZWl0aGVyIHNwZWNpZmljIGV2ZW50cyAuLi4gb3JcbiAgLy8gdG8gZXZlcnkgb2JqZWN0IGl0J3MgY3VycmVudGx5IGxpc3RlbmluZyB0by5cbiAgc3RvcExpc3RlbmluZzogZnVuY3Rpb24ob2JqLCBuYW1lLCBjYWxsYmFjaykge1xuICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9saXN0ZW5lcnM7XG4gICAgaWYgKCFsaXN0ZW5lcnMpIHsgcmV0dXJuIHRoaXM7IH1cbiAgICB2YXIgZGVsZXRlTGlzdGVuZXIgPSAhbmFtZSAmJiAhY2FsbGJhY2s7XG4gICAgaWYgKHR5cGVvZiBuYW1lID09PSAnb2JqZWN0JykgeyBjYWxsYmFjayA9IHRoaXM7IH1cbiAgICBpZiAob2JqKSB7IChsaXN0ZW5lcnMgPSB7fSlbb2JqLl9saXN0ZW5lcklkXSA9IG9iajsgfVxuICAgIC8qanNoaW50IGZvcmluOmZhbHNlICovXG4gICAgZm9yICh2YXIgaWQgaW4gbGlzdGVuZXJzKSB7XG4gICAgICBsaXN0ZW5lcnNbaWRdLm9mZihuYW1lLCBjYWxsYmFjaywgdGhpcyk7XG4gICAgICBpZiAoZGVsZXRlTGlzdGVuZXIpIHsgZGVsZXRlIHRoaXMuX2xpc3RlbmVyc1tpZF07IH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxufTtcblxuLy8gUmVndWxhciBleHByZXNzaW9uIHVzZWQgdG8gc3BsaXQgZXZlbnQgc3RyaW5ncy5cbnZhciBldmVudFNwbGl0dGVyID0gL1xccysvO1xuXG4vLyBJbXBsZW1lbnQgZmFuY3kgZmVhdHVyZXMgb2YgdGhlIEV2ZW50cyBBUEkgc3VjaCBhcyBtdWx0aXBsZSBldmVudFxuLy8gbmFtZXMgYFwiY2hhbmdlIGJsdXJcImAgYW5kIGpRdWVyeS1zdHlsZSBldmVudCBtYXBzIGB7Y2hhbmdlOiBhY3Rpb259YFxuLy8gaW4gdGVybXMgb2YgdGhlIGV4aXN0aW5nIEFQSS5cbnZhciBldmVudHNBcGkgPSBmdW5jdGlvbihvYmosIGFjdGlvbiwgbmFtZSwgcmVzdCkge1xuICBpZiAoIW5hbWUpIHsgcmV0dXJuIHRydWU7IH1cblxuICAvLyBIYW5kbGUgZXZlbnQgbWFwcy5cbiAgaWYgKHR5cGVvZiBuYW1lID09PSAnb2JqZWN0Jykge1xuICAgIC8qanNoaW50IGZvcmluOmZhbHNlICovXG4gICAgZm9yICh2YXIga2V5IGluIG5hbWUpIHtcbiAgICAgIG9ialthY3Rpb25dLmFwcGx5KG9iaiwgW2tleSwgbmFtZVtrZXldXS5jb25jYXQocmVzdCkpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBIYW5kbGUgc3BhY2Ugc2VwYXJhdGVkIGV2ZW50IG5hbWVzLlxuICBpZiAoZXZlbnRTcGxpdHRlci50ZXN0KG5hbWUpKSB7XG4gICAgdmFyIG5hbWVzID0gbmFtZS5zcGxpdChldmVudFNwbGl0dGVyKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IG5hbWVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgb2JqW2FjdGlvbl0uYXBwbHkob2JqLCBbbmFtZXNbaV1dLmNvbmNhdChyZXN0KSk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuLy8gQSBkaWZmaWN1bHQtdG8tYmVsaWV2ZSwgYnV0IG9wdGltaXplZCBpbnRlcm5hbCBkaXNwYXRjaCBmdW5jdGlvbiBmb3Jcbi8vIHRyaWdnZXJpbmcgZXZlbnRzLiBUcmllcyB0byBrZWVwIHRoZSB1c3VhbCBjYXNlcyBzcGVlZHkgKG1vc3QgaW50ZXJuYWxcbi8vIEJhY2tib25lIGV2ZW50cyBoYXZlIDMgYXJndW1lbnRzKS5cbnZhciB0cmlnZ2VyRXZlbnRzID0gZnVuY3Rpb24oZXZlbnRzLCBhcmdzKSB7XG4gIHZhciBldiwgaSA9IC0xLCBsID0gZXZlbnRzLmxlbmd0aCwgYTEgPSBhcmdzWzBdLCBhMiA9IGFyZ3NbMV0sIGEzID0gYXJnc1syXTtcbiAgc3dpdGNoIChhcmdzLmxlbmd0aCkge1xuICBjYXNlIDA6IHdoaWxlICgrK2kgPCBsKSB7IChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suY2FsbChldi5jdHgpOyB9IHJldHVybjtcbiAgY2FzZSAxOiB3aGlsZSAoKytpIDwgbCkgeyAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4LCBhMSk7IH0gcmV0dXJuO1xuICBjYXNlIDI6IHdoaWxlICgrK2kgPCBsKSB7IChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suY2FsbChldi5jdHgsIGExLCBhMik7IH0gcmV0dXJuO1xuICBjYXNlIDM6IHdoaWxlICgrK2kgPCBsKSB7IChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suY2FsbChldi5jdHgsIGExLCBhMiwgYTMpOyB9IHJldHVybjtcbiAgZGVmYXVsdDogd2hpbGUgKCsraSA8IGwpIHsgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5hcHBseShldi5jdHgsIGFyZ3MpOyB9XG4gIH1cbn07XG5cbnZhciBsaXN0ZW5NZXRob2RzID0ge2xpc3RlblRvOiAnb24nLCBsaXN0ZW5Ub09uY2U6ICdvbmNlJ307XG5cbi8vIEludmVyc2lvbi1vZi1jb250cm9sIHZlcnNpb25zIG9mIGBvbmAgYW5kIGBvbmNlYC4gVGVsbCAqdGhpcyogb2JqZWN0IHRvXG4vLyBsaXN0ZW4gdG8gYW4gZXZlbnQgaW4gYW5vdGhlciBvYmplY3QgLi4uIGtlZXBpbmcgdHJhY2sgb2Ygd2hhdCBpdCdzXG4vLyBsaXN0ZW5pbmcgdG8uXG5fLmVhY2gobGlzdGVuTWV0aG9kcywgZnVuY3Rpb24oaW1wbGVtZW50YXRpb24sIG1ldGhvZCkge1xuICBFdmVudHNbbWV0aG9kXSA9IGZ1bmN0aW9uKG9iaiwgbmFtZSwgY2FsbGJhY2spIHtcbiAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzIHx8ICh0aGlzLl9saXN0ZW5lcnMgPSB7fSk7XG4gICAgdmFyIGlkID0gb2JqLl9saXN0ZW5lcklkIHx8IChvYmouX2xpc3RlbmVySWQgPSBfLnVuaXF1ZUlkKCdsJykpO1xuICAgIGxpc3RlbmVyc1tpZF0gPSBvYmo7XG4gICAgaWYgKHR5cGVvZiBuYW1lID09PSAnb2JqZWN0JykgeyBjYWxsYmFjayA9IHRoaXM7IH1cbiAgICBvYmpbaW1wbGVtZW50YXRpb25dKG5hbWUsIGNhbGxiYWNrLCB0aGlzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBFdmVudHM7XG4iLCJleHBvcnQgZnVuY3Rpb24gYWRkUHJvdG9jb2wodXJsLCBzZWN1cmUpIHtcbiAgLy8gaGFuZGxlICcvL3NvbWV3aGVyZS5jb20vJyB1cmwnc1xuICBpZiAodXJsLnNsaWNlKDAsIDIpID09PSAnLy8nKSB7XG4gICAgaWYgKHNlY3VyZSA9PT0gdHJ1ZSkge1xuICAgICAgdXJsID0gJ2h0dHBzOicgKyB1cmw7XG5cbiAgICB9IGVsc2UgaWYgKHNlY3VyZSA9PT0gZmFsc2UpIHtcbiAgICAgIHVybCA9ICdodHRwOicgKyB1cmw7XG5cbiAgICB9IGVsc2UgaWYgKHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbC5zdWJzdHIoMCwgNCkgPT09ICdodHRwJykge1xuICAgICAgdXJsID0gd2luZG93LmxvY2F0aW9uLnByb3RvY29sICsgdXJsO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIHVybCA9ICdodHRwJztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdXJsO1xufVxuXG5sZXQgaWRDb3VudGVyID0gMDtcbmV4cG9ydCBmdW5jdGlvbiB1bmlxdWVJZChwcmVmaXgpIHtcbiAgdmFyIGlkID0gKytpZENvdW50ZXI7XG4gIHJldHVybiBwcmVmaXggKyBpZDtcbn1cblxuIiwiLypcbiAqIFRoZSBzcGVha2VyIG9iamVjdCBlbmNhcHN1bGF0ZXMgdGhlIFNvdW5kTWFuYWdlcjIgY29kZSBhbmQgYm9pbHMgaXQgZG93blxuICogdG8gdGhlIGZvbGxvd2luZyBhcGk6XG4gKlxuICogICAgc3BlYWtlcigpLmluaXRpYWxpemVBdWRpbygpOiBtYW55IGNsaWVudHMgY2FuIG9ubHkgc3RhcnQgdXNpbmdcbiAqICAgICAgc3BlYWtlciB3aGVuIGhhbmRsaW5nIGFuICdvbkNsaWNrJyBldmVudC4gVGhpcyBjYWxsIHNob3VsZCBiZSBtYWRlIFxuICogICAgICBhdCB0aGF0IHRpbWUgdG8gZ2V0IGF1ZGlvIGluaXRpYWxpemVkIHdoaWxlIHdhaXRpbmcgZm9yIGRldGFpbHNcbiAqICAgICAgb2Ygd2hhdCB0byBwbGF5IGZyb20gdGhlIHNlcnZlci4gXG4gKlxuICogICAgc3BlYWtlcigpLnNldFZvbHVtZSh2YWx1ZSk6IHNldCB0aGUgdm9sdW1lIGZyb20gMCAobXV0ZSkgLSAxMDAgKGZ1bGwgdm9sdW1lKVxuICpcbiAqICAgIHZhciBzb3VuZCA9IHNwZWFrZXIoKS5jcmVhdGUodXJsLCBvcHRpb25zQW5kRXZlbnRzKTogY3JlYXRlIGEgbmV3IHNvdW5kIGZyb20gdGhlXG4gKiAgICAgICBnaXZlbiB1cmwgYW5kIHJldHVybiBhICdzb25nJyBvYmplY3QgdGhhdCBjYW4gYmUgdXNlZCB0byBwYXVzZS9wbGF5L1xuICogICAgICAgZGVzdHJveSB0aGUgc29uZyBhbmQgcmVjZWl2ZSB0cmlnZ2VyIGV2ZW50cyBhcyB0aGUgc29uZyBwbGF5cy9zdG9wcy4gXG4gKlxuICogICAgICAgVGhlICdvcHRpb25zQW5kRXZlbnRzJyBpcyBhbiBvYmplY3QgdGhhdCBsZXRzIHlvdSBzcGVjaWZ5IGV2ZW50XG4gKiAgICAgICBoYW5kbGVycyBhbmQgb3B0aW9uczpcbiAqXG4gKiAgICAgICAgICBzdGFydFBvc2l0aW9uOiAgc3BlY2lmaWVzIHRoZSB0aW1lIG9mZnNldCAoaW4gbWlsbGlzZWNvbmRzKSB0aGF0IHRoZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgIHNvdW5kIHNob3VsZCBiZWdpbiBwbGF5YmFjayBhdCB3aGVuIHdlIGJlZ2luIHBsYXliYWNrLlxuICogICAgICAgICAgZW5kUG9zaXRpb246ICAgIHNwZWNpZmllcyB0aGUgdGltZSBvZmZzZXQgKGluIG1pbGxpc2Vjb25kcykgdGhhdCB0aGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VuZCBzaG91bGQgc3RvcCBwbGF5YmFjayBcbiAqICAgICAgICAgIGZhZGVJblNlY29uZHM6ICAjIG9mIHNlY29uZHMgdG8gZmFkZSBpbiBhdWRpb1xuICogICAgICAgICAgZmFkZU91dFNlY29uZHM6ICMgb2Ygc2Vjb25kcyB0byBmYWRlIG91dCBhdWRpb1xuICogICAgICAgICAgcGxheTogICAgICAgICAgIGV2ZW50IGhhbmRsZXIgZm9yICdwbGF5JyBldmVudFxuICogICAgICAgICAgcGF1c2U6ICAgICAgICAgIGV2ZW50IGhhbmRsZXIgZm9yICdwYXVzZScgZXZlbnRcbiAqICAgICAgICAgIGZpbmlzaDogICAgICAgICBldmVudCBoYW5kbGVyIGZvciAnZmluaXNoJyBldmVudFxuICogICAgICAgICAgZWxhcHNlOiAgICAgICAgIGV2ZW50IGhhbmRsZXIgZm9yICdlbGFwc2UnIGV2ZW50XG4gKlxuICogICAgICAgVGhlIHJldHVybmVkIG9iamVjdCBlbWl0cyB0aGUgZm9sbG93aW5nIGV2ZW50czpcbiAqICAgICAgICAgcGxheTogdGhlIHNvbmcgaGFzIHN0YXJ0ZWQgcGxheWluZyBvciByZXN1bWVkIHBsYXlpbmcgYWZ0ZXIgcGF1c2VcbiAqICAgICAgICAgcGF1c2U6IHRoZSBzb25nIGhhcyBwYXVzZWQgcGxheWJhY2tcbiAqICAgICAgICAgZmluaXNoOiB0aGUgc29uZyBoYXMgY29tcGxldGVkIHBsYXliYWNrIGFuZCB0aGUgc29uZyBvYmplY3RcbiAqICAgICAgICAgICBpcyBubyBsb25nZXIgdXNhYmxlIGFuZCBzaG91bGQgYmUgZGVzdHJveWVkXG4gKiAgICAgICAgIGVsYXBzZTogc29uZyBwbGF5YmFjayBoYXMgZWxhcHNlZFxuICpcbiAqICAgICAgIFRoZSBldmVudHMgc2hvdWxkIGJlIHJlY2VpdmVkIGluIHRoaXMgb3JkZXIgb25seTpcbiAqICAgICAgICAgKCBwbGF5IC0+ICggcGF1c2UgfCBwbGF5ICkqIC0+ICk/IGZpbmlzaFxuICpcbiAqICAgICAgIE5vdGUgdGhhdCBJIHJlcHJlc2VudCBwbGF5IGZhaWx1cmVzIGFzIGEgJ2ZpbmlzaCcgY2FsbCwgc28gaWZcbiAqICAgICAgIHdlIGNhbid0IGxvYWQgYSBzb25nLCBpdCB3aWxsIGp1c3QgZ2V0IGEgJ2ZpbmlzaCcgYW5kIG5vICdwbGF5Jy5cbiAqICAgICAgIFRoZSAnZmluaXNoJyBldmVudCB3aWxsIGhhdmUgYSAndHJ1ZScgYXJndW1lbnQgcGFzc2VkIHRvIGl0IG9uXG4gKiAgICAgICBzb21lIGtpbmQgb2YgZXJyb3IsIHNvIHlvdSBjYW4gdHJlYXQgdGhvc2UgZGlmZmVyZW50bHkuXG4gKlxuICogICAgICAgVGhlIHJldHVybmVkIHNvbmcgb2JqZWN0IGhhcyB0aGlzIGZvbGxvd2luZyBhcGk6XG4gKiAgICAgICAgIHBsYXk6IHN0YXJ0IHBsYXliYWNrIChhdCB0aGUgJ3N0YXJ0UG9zaXRpb24nLCBpZiBzcGVjaWZpZWQpXG4gKiAgICAgICAgIHBhdXNlOiBwYXVzZSBwbGF5YmFja1xuICogICAgICAgICByZXN1bWU6IHJlc3VtZSBwbGF5YmFja1xuICogICAgICAgICBkZXN0cm95OiBzdG9wIHBsYXliYWNrLCBwcmV2ZW50IGFueSBmdXR1cmUgcGxheWJhY2ssIGFuZCBmcmVlIHVwIG1lbW9yeVxuICpcbiAqIFRoaXMgbW9kdWxlIHJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSBzcGVha2VyIHNpbmdsZXRvbiBzbyBldmVyeWJvZHlcbiAqIGlzIHVzaW5nIHRoZSBzYW1lIGluc3RhbmNlLlxuICpcbiAqIFByb3BlciB1c2FnZSBsb29rcyBsaWtlIHRoaXM6XG4gKlxuICogICByZXF1aXJlKFsgJ2ZlZWQvc3BlYWtlcicgXSwgZnVuY3Rpb24oc3BlYWtlcikge1xuICogICAgIHZhciBteVNwZWFrZXIgPSBzcGVha2VyKG9wdGlvbnMsIG9uUmVhZHkpO1xuICogICB9KTtcbiAqXG4gKiBUaGF0IHdpbGwgbWFrZSBzdXJlIHRoYXQgYWxsIGNvZGUgdXNlcyB0aGUgc2FtZSBzcGVha2VyIGluc3RhbmNlLiAnb3B0aW9ucydcbiAqIGlzIG9wdGlvbmFsLCBhbmQgaXMgYW4gb2JqZWN0IHdpdGggYW55IG9mIHRoZSBmb2xsb3dpbmcga2V5czpcbiAqXG4gKiAgIGRlYnVnOiBpZiB0cnVlLCBlbWl0IGRlYnVnIGluZm9ybWF0aW9uIHRvIHRoZSBjb25zb2xlXG4gKlxuICogVGhlIGZpcnN0IGZ1bmN0aW9uIGNhbGwgdG8gJ3NwZWFrZXIoKScgaXMgd2hhdCBjb25maWd1cmVzIGFuZCBkZWZpbmVzIHRoZVxuICogc3BlYWtlciAtIGFuZCBzdWJzZXF1ZW50IGNhbGxzIGp1c3QgcmV0dXJuIHRoZSBhbHJlYWR5LWNyZWF0ZWQgaW5zdGFuY2UuXG4gKiBJIHRoaW5rIHRoaXMgaXMgYSBwb29yIGludGVyZmFjZSwgYnV0IEkgZG9uJ3QgaGF2ZSBhIGJldHRlciBvbmUgYXQgdGhlXG4gKiBtb21lbnQuXG4gKlxuICovXG5cbmltcG9ydCBsb2cgZnJvbSAnLi9sb2cnO1xuaW1wb3J0IEV2ZW50cyBmcm9tICcuL2V2ZW50cyc7XG5pbXBvcnQgeyB1bmlxdWVJZCB9IGZyb20gJy4vdXRpbCc7XG5cbmNvbnN0IGlPU3AgPSAvKGlQaG9uZXxpUGFkKS9pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCk7XG5cbmNvbnN0IFNJTEVOQ0UgPSBpT1NwID9cbiAgJ2h0dHBzOi8vdTllOWg3ejUubWFwMi5zc2wuaHdjZG4ubmV0L2ZlZWRmbS1hdWRpby8yNTAtbWlsbGlzZWNvbmRzLW9mLXNpbGVuY2UubXAzJyA6XG4gICdkYXRhOmF1ZGlvL3dhdjtiYXNlNjQsVWtsR1JpZ0FBQUJYUVZaRlptMTBJQklBQUFBQkFBRUFSS3dBQUloWUFRQUNBQkFBQUFCa1lYUmhBZ0FBQUFFQSc7XG5cbnZhciBTb3VuZCA9IGZ1bmN0aW9uIChzcGVha2VyLCBvcHRpb25zLCBpZCwgdXJsKSB7XG4gIHZhciBvYmogPSBPYmplY3QuYXNzaWduKHRoaXMsIEV2ZW50cyk7XG5cbiAgb2JqLmlkID0gaWQ7XG5cbiAgLy91cmwgPSB1cmwucmVwbGFjZSgndTllOWg3ejUubWFwMi5zc2wuaHdjZG4ubmV0JywgJ3MzLmFtYXpvbmF3cy5jb20nKTtcblxuICBvYmoudXJsID0gdXJsO1xuICBvYmouc3BlYWtlciA9IHNwZWFrZXI7XG4gIG9iai5sb2FkZWQgPSBmYWxzZTtcblxuICBpZiAob3B0aW9ucykge1xuICAgIHRoaXMuc3RhcnRQb3NpdGlvbiA9ICtvcHRpb25zLnN0YXJ0UG9zaXRpb247XG4gICAgdGhpcy5lbmRQb3NpdGlvbiA9ICtvcHRpb25zLmVuZFBvc2l0aW9uO1xuXG4gICAgdGhpcy5mYWRlSW5TZWNvbmRzID0gK29wdGlvbnMuZmFkZUluU2Vjb25kcztcbiAgICBpZiAodGhpcy5mYWRlSW5TZWNvbmRzKSB7XG4gICAgICB0aGlzLmZhZGVJblN0YXJ0ID0gdGhpcy5zdGFydFBvc2l0aW9uID8gKHRoaXMuc3RhcnRQb3NpdGlvbiAvIDEwMDApIDogMDtcbiAgICAgIHRoaXMuZmFkZUluRW5kID0gdGhpcy5mYWRlSW5TdGFydCArIHRoaXMuZmFkZUluU2Vjb25kcztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5mYWRlSW5TdGFydCA9IDA7XG4gICAgICB0aGlzLmZhZGVJbkVuZCA9IDA7XG4gICAgfVxuXG4gICAgdGhpcy5mYWRlT3V0U2Vjb25kcyA9ICtvcHRpb25zLmZhZGVPdXRTZWNvbmRzO1xuICAgIGlmICh0aGlzLmZhZGVPdXRTZWNvbmRzKSB7XG4gICAgICBpZiAodGhpcy5lbmRQb3NpdGlvbikge1xuICAgICAgICB0aGlzLmZhZGVPdXRTdGFydCA9ICh0aGlzLmVuZFBvc2l0aW9uIC8gMTAwMCkgLSB0aGlzLmZhZGVPdXRTZWNvbmRzO1xuICAgICAgICB0aGlzLmZhZGVPdXRFbmQgPSB0aGlzLmVuZFBvc2l0aW9uIC8gMTAwMDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZmFkZU91dFN0YXJ0ID0gMDtcbiAgICAgICAgdGhpcy5mYWRlT3V0RW5kID0gMDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGxldCBldiBvZiBbJ3BsYXknLCAncGF1c2UnLCAnZmluaXNoJywgJ2VsYXBzZSddKSB7XG4gICAgICBpZiAoZXYgaW4gb3B0aW9ucykge1xuICAgICAgICBvYmoub24oZXYsIG9wdGlvbnNbZXZdKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmdhaW4gPSBvcHRpb25zLmdhaW4gfHwgMDtcblxuICB9IGVsc2Uge1xuICAgIHRoaXMuZ2FpbiA9IDA7XG5cbiAgfVxuXG4gIHJldHVybiBvYmo7XG59O1xuXG5mdW5jdGlvbiBkKGF1ZGlvKSB7XG4gIHJldHVybiAnIHNyYyA9ICcgKyBhdWRpby5zcmMgKyAnLCB0aW1lID0gJyArIGF1ZGlvLmN1cnJlbnRUaW1lICsgJywgcGF1c2VkID0gJyArIGF1ZGlvLnBhdXNlZCArICcsIGR1cmF0aW9uID0gJyArIGF1ZGlvLmR1cmF0aW9uICsgJywgcmVhZHlTdGF0ZSA9ICcgKyBhdWRpby5yZWFkeVN0YXRlO1xufVxuXG5Tb3VuZC5wcm90b3R5cGUgPSB7XG4gIHBsYXk6IGZ1bmN0aW9uICgpIHtcbiAgICBsb2codGhpcy5pZCArICcgc291bmQgcGxheScpO1xuICAgIHJldHVybiB0aGlzLnNwZWFrZXIuX3BsYXlTb3VuZCh0aGlzKTtcbiAgfSxcblxuICAvLyBwYXVzZSBwbGF5YmFjayBvZiB0aGUgY3VycmVudCBzb3VuZCBjbGlwXG4gIHBhdXNlOiBmdW5jdGlvbiAoKSB7XG4gICAgbG9nKHRoaXMuaWQgKyAnIHNvdW5kIHBhdXNlJyk7XG4gICAgcmV0dXJuIHRoaXMuc3BlYWtlci5fcGF1c2VTb3VuZCh0aGlzKTtcbiAgfSxcblxuICAvLyByZXN1bWUgcGxheWJhY2sgb2YgdGhlIGN1cnJlbnQgc291bmQgY2xpcFxuICByZXN1bWU6IGZ1bmN0aW9uICgpIHtcbiAgICBsb2codGhpcy5pZCArICcgc291bmQgcmVzdW1lJyk7XG4gICAgcmV0dXJuIHRoaXMuc3BlYWtlci5fcGxheVNvdW5kKHRoaXMpO1xuICB9LFxuXG4gIC8vIGVsYXBzZWQgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBwbGF5ZWRcbiAgcG9zaXRpb246IGZ1bmN0aW9uICgpIHtcbiAgICAvL2xvZyh0aGlzLmlkICsgJyBzb3VuZCBwb3NpdGlvbicpO1xuICAgIHJldHVybiB0aGlzLnNwZWFrZXIuX3Bvc2l0aW9uKHRoaXMpO1xuICB9LFxuXG4gIC8vIGR1cmF0aW9uIGluIG1pbGxpc2Vjb25kcyBvZiB0aGUgc29uZ1xuICAvLyAodGhpcyBtYXkgY2hhbmdlIHVudGlsIHRoZSBzb25nIGlzIGZ1bGwgbG9hZGVkKVxuICBkdXJhdGlvbjogZnVuY3Rpb24gKCkge1xuICAgIC8vbG9nKHRoaXMuaWQgKyAnIHNvdW5kIGR1cmF0aW9uJyk7XG4gICAgcmV0dXJuIHRoaXMuc3BlYWtlci5fZHVyYXRpb24odGhpcyk7XG4gIH0sXG5cbiAgLy8gc3RvcCBwbGF5aW5nIHRoZSBnaXZlbiBzb3VuZCBjbGlwLCB1bmxvYWQgaXQsIGFuZCBkaXNhYmxlIGV2ZW50c1xuICBkZXN0cm95OiBmdW5jdGlvbiAoKSB7XG4gICAgbG9nKHRoaXMuaWQgKyAnIGJlaW5nIGNhbGxlZCB0byBkZXN0cm95Jyk7XG4gICAgdGhpcy5zcGVha2VyLl9kZXN0cm95U291bmQodGhpcyk7XG4gIH0sXG5cbiAgZ2FpbkFkanVzdGVkVm9sdW1lOiBmdW5jdGlvbiAodm9sdW1lKSB7XG4gICAgaWYgKCF0aGlzLmdhaW4pIHtcbiAgICAgIGxvZygnbm8gdm9sdW1lIGFkanVzdG1lbnQnKTtcbiAgICAgIHJldHVybiB2b2x1bWUgLyAxMDA7XG4gICAgfVxuXG4gICAgdmFyIGFkanVzdGVkID0gTWF0aC5tYXgoTWF0aC5taW4oKHZvbHVtZSAvIDEwMCkgKiAoNTAgKiBNYXRoLnBvdygxMCwgdGhpcy5nYWluIC8gMjApKSwgMTAwKSwgMCkgLyAxMDA7XG5cbiAgICAvL2xvZygnZ2FpbiBhZGp1c3RtZW50IGlzICcgKyB0aGlzLmdhaW4gKyAnLCBhbmQgZmluYWwgYWRqdXN0ZWQgdm9sdW1lIGlzICcgKyBhZGp1c3RlZCk7XG5cbiAgICByZXR1cm4gYWRqdXN0ZWQ7XG4gIH1cblxufTtcblxudmFyIFNwZWFrZXIgPSBmdW5jdGlvbiAoKSB7XG5cbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZUF1ZGlvQ29udGV4dCgpIHtcbiAgdmFyIEF1ZGlvQ3RvciA9IHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDtcblxuICBsZXQgZGVzaXJlZFNhbXBsZVJhdGUgPSA0NDEwMDtcbiAgdmFyIGNvbnRleHQgPSBuZXcgQXVkaW9DdG9yKCk7XG5cbiAgLy8gQ2hlY2sgaWYgaGFjayBpcyBuZWNlc3NhcnkuIE9ubHkgb2NjdXJzIGluIGlPUzYrIGRldmljZXNcbiAgLy8gYW5kIG9ubHkgd2hlbiB5b3UgZmlyc3QgYm9vdCB0aGUgaVBob25lLCBvciBwbGF5IGEgYXVkaW8vdmlkZW9cbiAgLy8gd2l0aCBhIGRpZmZlcmVudCBzYW1wbGUgcmF0ZVxuICBpZiAoY29udGV4dC5zYW1wbGVSYXRlICE9PSBkZXNpcmVkU2FtcGxlUmF0ZSkge1xuICAgIHZhciBidWZmZXIgPSBjb250ZXh0LmNyZWF0ZUJ1ZmZlcigxLCAxLCBkZXNpcmVkU2FtcGxlUmF0ZSk7XG4gICAgdmFyIGR1bW15ID0gY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgICBkdW1teS5idWZmZXIgPSBidWZmZXI7XG4gICAgZHVtbXkuY29ubmVjdChjb250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgICBkdW1teS5zdGFydCgwKTtcbiAgICBkdW1teS5kaXNjb25uZWN0KCk7XG5cbiAgICBjb250ZXh0LmNsb3NlKCk7IC8vIGRpc3Bvc2Ugb2xkIGNvbnRleHRcbiAgICBjb250ZXh0ID0gbmV3IEF1ZGlvQ3RvcigpO1xuICB9XG5cbiAgcmV0dXJuIGNvbnRleHQ7XG59XG5cblNwZWFrZXIucHJvdG90eXBlID0ge1xuICB2b2w6IDEwMCwgIC8vIDAuLjEwMFxuICBvdXRzdGFuZGluZ1BsYXlzOiB7fSxcblxuICBhdWRpb0NvbnRleHQ6IG51bGwsIC8vIGZvciBtb2JpbGUgc2FmYXJpXG5cbiAgYWN0aXZlOiBudWxsLCAvLyBhY3RpdmUgYXVkaW8gZWxlbWVudCwgc291bmQsIGFuZCBnYWluIG5vZGVcbiAgZmFkaW5nOiBudWxsLCAvLyBmYWRpbmcgYXVkaW8gZWxlbWVudCwgc291bmQsIGFuZCBnYWluIG5vZGVcbiAgcHJlcGFyaW5nOiBudWxsLCAvLyBwcmVwYXJpbmcgYXVkaW8gZWxlbWVudCwgc291bmQsIGFuZCBnYWluIG5vZGVcblxuICBwcmVwYXJlV2hlblJlYWR5OiBudWxsLCAvLyB1cmwgdG8gcHJlcGFyZSB3aGVuIGFjdGl2ZSBwbGF5ZXIgaXMgZnVsbHkgbG9hZGVkXG5cbiAgaW5pdGlhbGl6ZUF1ZGlvOiBmdW5jdGlvbiAoKSB7XG4gICAgLy8gT24gbW9iaWxlIGRldmljZXMsIHdlIG5lZWQgdG8ga2ljayBvZmYgcGxheWJhY2sgb2YgYSBzb3VuZCBpblxuICAgIC8vIHJlc3BvbnNlIHRvIGEgdXNlciBldmVudC4gVGhpcyBkb2VzIHRoYXQuXG4gICAgaWYgKHRoaXMuYWN0aXZlID09PSBudWxsKSB7XG4gICAgICBsb2coJ2luaXRpYWxpemluZyBmb3IgbW9iaWxlJyk7XG5cbiAgICAgIHRoaXMuYXVkaW9Db250ZXh0ID0gY3JlYXRlQXVkaW9Db250ZXh0KCk7XG5cbiAgICAgIHRoaXMuYWN0aXZlID0gdGhpcy5fY3JlYXRlQXVkaW8oU0lMRU5DRSk7XG4gICAgICB0aGlzLmZhZGluZyA9IHRoaXMuX2NyZWF0ZUF1ZGlvKFNJTEVOQ0UpO1xuICAgICAgdGhpcy5wcmVwYXJpbmcgPSB0aGlzLl9jcmVhdGVBdWRpbyh0aGlzLnByZXBhcmVXaGVuUmVhZHkgPyB0aGlzLnByZXBhcmVXaGVuUmVhZHkgOiBTSUxFTkNFKTtcblxuICAgICAgdGhpcy5wcmVwYXJlV2hlblJlYWR5ID0gbnVsbDtcblxuICAgIH0gZWxzZSB7XG4gICAgICBsb2coJ21vYmlsZSBhbHJlYWR5IGluaXRpYWxpemVkJyk7XG4gICAgfVxuICB9LFxuXG4gIGdldFN1cHBvcnRlZEZvcm1hdHM6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYXVkaW8nKS5jYW5QbGF5VHlwZSgnYXVkaW8vYWFjJykpIHtcbiAgICAgIHJldHVybiAnYWFjLG1wMyc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAnbXAzJztcbiAgICB9XG4gIH0sXG5cbiAgX2NyZWF0ZUF1ZGlvR2Fpbk5vZGU6IGZ1bmN0aW9uIChhdWRpbykge1xuICAgIHZhciBzb3VyY2UgPSB0aGlzLmF1ZGlvQ29udGV4dC5jcmVhdGVNZWRpYUVsZW1lbnRTb3VyY2UoYXVkaW8pO1xuICAgIHZhciBnYWluTm9kZSA9IHRoaXMuYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICBnYWluTm9kZS5nYWluLnZhbHVlID0gMS4wO1xuXG4gICAgc291cmNlLmNvbm5lY3QoZ2Fpbk5vZGUpO1xuICAgIGdhaW5Ob2RlLmNvbm5lY3QodGhpcy5hdWRpb0NvbnRleHQuZGVzdGluYXRpb24pO1xuXG4gICAgcmV0dXJuIGdhaW5Ob2RlLmdhaW47XG4gIH0sXG5cbiAgX2NyZWF0ZUF1ZGlvOiBmdW5jdGlvbiAodXJsKSB7XG4gICAgdmFyIERFRkFVTFRfVk9MVU1FID0gMS4wO1xuXG4gICAgdmFyIGF1ZGlvID0gbmV3IEF1ZGlvKHVybCk7XG4gICAgYXVkaW8uY3Jvc3NPcmlnaW4gPSAnYW5vbnltb3VzJztcbiAgICBhdWRpby5sb29wID0gZmFsc2U7XG4gICAgYXVkaW8udm9sdW1lID0gREVGQVVMVF9WT0xVTUU7XG5cbiAgICB0aGlzLl9hZGRFdmVudExpc3RlbmVycyhhdWRpbyk7XG5cbiAgICAvLyBpT1Mgdm9sdW1lIGFkanVzdG1lbnRcbiAgICB2YXIgZ2FpbiA9IG51bGw7XG4gICAgaWYgKGlPU3ApIHtcbiAgICAgIHZhciBzb3VyY2UgPSB0aGlzLmF1ZGlvQ29udGV4dC5jcmVhdGVNZWRpYUVsZW1lbnRTb3VyY2UoYXVkaW8pO1xuICAgICAgdmFyIGdhaW5Ob2RlID0gdGhpcy5hdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgICAgZ2Fpbk5vZGUuZ2Fpbi52YWx1ZSA9IERFRkFVTFRfVk9MVU1FO1xuXG4gICAgICBzb3VyY2UuY29ubmVjdChnYWluTm9kZSk7XG4gICAgICBnYWluTm9kZS5jb25uZWN0KHRoaXMuYXVkaW9Db250ZXh0LmRlc3RpbmF0aW9uKTtcblxuICAgICAgZ2FpbiA9IGdhaW5Ob2RlLmdhaW47XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGF1ZGlvOiBhdWRpbyxcbiAgICAgIHNvdW5kOiBudWxsLFxuICAgICAgZ2FpbjogZ2FpbixcbiAgICAgIHZvbHVtZTogREVGQVVMVF9WT0xVTUVcbiAgICB9O1xuICB9LFxuXG4gIF9hZGRFdmVudExpc3RlbmVyczogZnVuY3Rpb24gKGF1ZGlvKSB7XG4gICAgYXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigncGF1c2UnLCB0aGlzLl9vbkF1ZGlvUGF1c2VFdmVudC5iaW5kKHRoaXMpKTtcbiAgICBhdWRpby5hZGRFdmVudExpc3RlbmVyKCdlbmRlZCcsIHRoaXMuX29uQXVkaW9FbmRlZEV2ZW50LmJpbmQodGhpcykpO1xuICAgIGF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLl9vbkF1ZGlvVGltZVVwZGF0ZUV2ZW50LmJpbmQodGhpcykpO1xuICAgIC8vdGhpcy5fZGVidWdBdWRpb09iamVjdChhdWRpbyk7XG4gIH0sXG5cbiAgX29uQXVkaW9QYXVzZUV2ZW50OiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB2YXIgYXVkaW8gPSBldmVudC5jdXJyZW50VGFyZ2V0O1xuXG4gICAgaWYgKGF1ZGlvLnNyYyA9PT0gU0lMRU5DRSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICgoYXVkaW8gIT09IHRoaXMuYWN0aXZlLmF1ZGlvKSB8fCAoYXVkaW8uY3VycmVudFRpbWUgPT09IGF1ZGlvLmR1cmF0aW9uKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5hY3RpdmUuc291bmQgfHwgKHRoaXMuYWN0aXZlLnNvdW5kLnVybCAhPT0gYXVkaW8uc3JjKSkge1xuICAgICAgbG9nKCdhY3RpdmUgYXVkaW8gcGF1c2UsIGJ1dCBubyBtYXRjaGluZyBzb3VuZCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuYWN0aXZlLnNvdW5kLnRyaWdnZXIoJ3BhdXNlJyk7XG4gIH0sXG5cbiAgX29uQXVkaW9FbmRlZEV2ZW50OiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB2YXIgYXVkaW8gPSBldmVudC5jdXJyZW50VGFyZ2V0O1xuXG4gICAgaWYgKGF1ZGlvLnNyYyA9PT0gU0lMRU5DRSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChhdWRpbyA9PT0gdGhpcy5mYWRpbmcuYXVkaW8pIHtcbiAgICAgIGF1ZGlvLnNyYyA9IFNJTEVOQ0U7XG4gICAgICB0aGlzLmZhZGluZy5zb3VuZCA9IG51bGw7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGF1ZGlvICE9PSB0aGlzLmFjdGl2ZS5hdWRpbykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5hY3RpdmUuc291bmQgfHwgKHRoaXMuYWN0aXZlLnNvdW5kLnVybCAhPT0gYXVkaW8uc3JjKSkge1xuICAgICAgbG9nKCdhY3RpdmUgYXVkaW8gZW5kZWQsIGJ1dCBubyBtYXRjaGluZyBzb3VuZCcsIGF1ZGlvLnNyYyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbG9nKCdhY3RpdmUgYXVkaW8gZW5kZWQnKTtcbiAgICB2YXIgc291bmQgPSB0aGlzLmFjdGl2ZS5zb3VuZDtcbiAgICB0aGlzLmFjdGl2ZS5zb3VuZCA9IG51bGw7XG4gICAgc291bmQudHJpZ2dlcignZmluaXNoJyk7XG4gIH0sXG5cbiAgX29uQXVkaW9UaW1lVXBkYXRlRXZlbnQ6IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHZhciBhdWRpbyA9IGV2ZW50LmN1cnJlbnRUYXJnZXQ7XG5cbiAgICBpZiAoYXVkaW8uc3JjID09PSBTSUxFTkNFKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKChhdWRpbyA9PT0gdGhpcy5mYWRpbmcuYXVkaW8pICYmIHRoaXMuZmFkaW5nLnNvdW5kKSB7XG4gICAgICBpZiAodGhpcy5mYWRpbmcuc291bmQuZW5kUG9zaXRpb24gJiYgKGF1ZGlvLmN1cnJlbnRUaW1lID49ICh0aGlzLmZhZGluZy5zb3VuZC5lbmRQb3NpdGlvbiAvIDEwMDApKSkge1xuICAgICAgICB0aGlzLmZhZGluZy5zb3VuZCA9IG51bGw7XG4gICAgICAgIHRoaXMuZmFkaW5nLmF1ZGlvLnNyYyA9IFNJTEVOQ0U7XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3NldFZvbHVtZSh0aGlzLmZhZGluZyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoYXVkaW8gIT09IHRoaXMuYWN0aXZlLmF1ZGlvKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmFjdGl2ZS5zb3VuZCB8fCAodGhpcy5hY3RpdmUuc291bmQudXJsICE9PSBhdWRpby5zcmMpKSB7XG4gICAgICBsb2coJ2FjdGl2ZSBhdWRpbyBlbGFwc2VkLCBidXQgaXQgbm8gbWF0Y2hpbmcgc291bmQnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5hY3RpdmUuc291bmQuZW5kUG9zaXRpb24gJiYgKCh0aGlzLmFjdGl2ZS5zb3VuZC5lbmRQb3NpdGlvbiAvIDEwMDApIDw9IGF1ZGlvLmN1cnJlbnRUaW1lKSkge1xuICAgICAgLy8gc29uZyByZWFjaGVkIGVuZCBvZiBwbGF5XG4gICAgICB2YXIgc291bmQgPSB0aGlzLmFjdGl2ZS5zb3VuZDtcblxuICAgICAgdGhpcy5hY3RpdmUuc291bmQgPSBudWxsO1xuXG4gICAgICB0aGlzLmFjdGl2ZS5hdWRpby5zcmMgPSBTSUxFTkNFO1xuXG4gICAgICBzb3VuZC50cmlnZ2VyKCdmaW5pc2gnKTtcblxuICAgIH0gZWxzZSBpZiAodGhpcy5hY3RpdmUuc291bmQuZmFkZU91dEVuZCAmJiAoYXVkaW8uY3VycmVudFRpbWUgPj0gdGhpcy5hY3RpdmUuc291bmQuZmFkZU91dFN0YXJ0KSkge1xuICAgICAgLy8gc29uZyBoaXQgc3RhcnQgb2YgZmFkZSBvdXRcbiAgICAgIHRoaXMuX3NldFZvbHVtZSh0aGlzLmFjdGl2ZSk7XG5cbiAgICAgIC8vIGFjdGl2ZSBiZWNvbWVzIGZhZGluZywgYW5kIGZhZGluZyBiZWNvbWVzIGFjdGl2ZVxuICAgICAgdmFyIGZhZGluZyA9IHRoaXMuZmFkaW5nO1xuICAgICAgdGhpcy5mYWRpbmcgPSB0aGlzLmFjdGl2ZTtcbiAgICAgIHRoaXMuYWN0aXZlID0gZmFkaW5nO1xuXG4gICAgICB0aGlzLmFjdGl2ZS5zb3VuZCA9IG51bGw7IC8vIG5vdCB1c2VkIGFueSBtb3JlXG5cbiAgICAgIC8vIHByZXRlbmQgdGhlIHNvbmcgZmluaXNoZWRcbiAgICAgIHRoaXMuZmFkaW5nLnNvdW5kLnRyaWdnZXIoJ2ZpbmlzaCcpO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZygnZWxhcHNlIHZvbHVtZScpO1xuICAgICAgdGhpcy5fc2V0Vm9sdW1lKHRoaXMuYWN0aXZlKTtcblxuICAgICAgdGhpcy5hY3RpdmUuc291bmQudHJpZ2dlcignZWxhcHNlJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucHJlcGFyZVdoZW5SZWFkeSkge1xuICAgICAgdGhpcy5wcmVwYXJlKHRoaXMucHJlcGFyZVdoZW5SZWFkeSk7XG4gICAgfVxuICB9LFxuXG4gIF9zZXRWb2x1bWU6IGZ1bmN0aW9uIChhdWRpb0dyb3VwLCBzb3VuZCkge1xuICAgIGlmICghc291bmQpIHsgc291bmQgPSBhdWRpb0dyb3VwLnNvdW5kOyB9XG5cbiAgICB2YXIgY3VycmVudFRpbWUgPSBhdWRpb0dyb3VwLmF1ZGlvLmN1cnJlbnRUaW1lO1xuICAgIHZhciBjdXJyZW50Vm9sdW1lID0gYXVkaW9Hcm91cC52b2x1bWU7XG5cbiAgICB2YXIgY2FsY3VsYXRlZFZvbHVtZSA9IHNvdW5kLmdhaW5BZGp1c3RlZFZvbHVtZSh0aGlzLnZvbCk7XG5cbiAgICBpZiAoKHNvdW5kLmZhZGVJblN0YXJ0ICE9IHNvdW5kLmZhZGVJbkVuZCkgJiYgKGN1cnJlbnRUaW1lIDwgc291bmQuZmFkZUluU3RhcnQpKSB7XG4gICAgICBjYWxjdWxhdGVkVm9sdW1lID0gMDtcblxuICAgICAgbG9nKCdwcmUtZmFkZS1pbiB2b2x1bWUgaXMgMCcpO1xuXG4gICAgfSBlbHNlIGlmICgoc291bmQuZmFkZUluU3RhcnQgIT0gc291bmQuZmFkZUluRW5kKSAmJiAoY3VycmVudFRpbWUgPj0gc291bmQuZmFkZUluU3RhcnQpICYmIChjdXJyZW50VGltZSA8PSBzb3VuZC5mYWRlSW5FbmQpKSB7XG4gICAgICAvLyByYW1wIHVwIGZyb20gMCAtIDEwMCVcbiAgICAgIGNhbGN1bGF0ZWRWb2x1bWUgPSAoY3VycmVudFRpbWUgLSBzb3VuZC5mYWRlSW5TdGFydCkgLyAoc291bmQuZmFkZUluRW5kIC0gc291bmQuZmFkZUluU3RhcnQpICogY2FsY3VsYXRlZFZvbHVtZTtcblxuICAgICAgbG9nKCdyYW1waW5nIOKWsiB2b2x1bWUnLCB7IGN1cnJlbnRUaW1lOiBjdXJyZW50VGltZSwgY3VycmVudFZvbHVtZTogY3VycmVudFZvbHVtZSwgY2FsY3VsYXRlZFZvbHVtZTogY2FsY3VsYXRlZFZvbHVtZSwgc291bmQ6IHNvdW5kIH0pO1xuXG4gICAgfSBlbHNlIGlmICgoc291bmQuZmFkZU91dFN0YXJ0ICE9IHNvdW5kLmZhZGVPdXRFbmQpICYmIChjdXJyZW50VGltZSA+IHNvdW5kLmZhZGVPdXRFbmQpKSB7XG4gICAgICBjYWxjdWxhdGVkVm9sdW1lID0gMDtcblxuICAgICAgbG9nKCdwb3N0LWZhZGUtb3V0IHZvbHVtZSBpcyAwJyk7XG5cbiAgICB9IGVsc2UgaWYgKChzb3VuZC5mYWRlT3V0U3RhcnQgIT0gc291bmQuZmFkZU91dEVuZCkgJiYgKGN1cnJlbnRUaW1lID49IHNvdW5kLmZhZGVPdXRTdGFydCkgJiYgKGN1cnJlbnRUaW1lIDw9IHNvdW5kLmZhZGVPdXRFbmQpKSB7XG4gICAgICAvLyByYW1wIGRvd24gZnJvbSAxMDAlIHRvIDBcbiAgICAgIGNhbGN1bGF0ZWRWb2x1bWUgPSAoMSAtIChjdXJyZW50VGltZSAtIHNvdW5kLmZhZGVPdXRTdGFydCkgLyAoc291bmQuZmFkZU91dEVuZCAtIHNvdW5kLmZhZGVPdXRTdGFydCkpICogY2FsY3VsYXRlZFZvbHVtZTtcblxuICAgICAgbG9nKCdyYW1waW5nIOKWvCB2b2x1bWUnLCB7IGN1cnJlbnRUaW1lOiBjdXJyZW50VGltZSwgY3VycmVudFZvbHVtZTogY3VycmVudFZvbHVtZSwgY2FsY3VsYXRlZFZvbHVtZTogY2FsY3VsYXRlZFZvbHVtZSwgc291bmQ6IHNvdW5kIH0pO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZygndXBkYXRpbmcgdm9sdW1lJywgeyBjdXJyZW50VGltZTogY3VycmVudFRpbWUsIGN1cnJlbnRWb2x1bWU6IGN1cnJlbnRWb2x1bWUsIGNhbGN1bGF0ZWRWb2x1bWU6IGNhbGN1bGF0ZWRWb2x1bWUsIHNvdW5kOiBzb3VuZCB9KTtcbiAgICB9XG5cbiAgICBpZiAoY3VycmVudFZvbHVtZSAhPSBjYWxjdWxhdGVkVm9sdW1lKSB7XG4gICAgICBpZiAoaU9TcCkge1xuICAgICAgICBhdWRpb0dyb3VwLmdhaW4udmFsdWUgPSBjYWxjdWxhdGVkVm9sdW1lO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXVkaW9Hcm91cC5hdWRpby52b2x1bWUgPSBjYWxjdWxhdGVkVm9sdW1lO1xuICAgICAgfVxuICAgICAgYXVkaW9Hcm91cC52b2x1bWUgPSBjYWxjdWxhdGVkVm9sdW1lO1xuICAgIH1cbiAgfSxcblxuICBfZGVidWdBdWRpb09iamVjdDogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgIHZhciBldmVudHMgPSBbJ2Fib3J0JywgJ2xvYWQnLCAnbG9hZGVuZCcsICdsb2Fkc3RhcnQnLCAnbG9hZGVkZGF0YScsICdsb2FkZWRtZXRhZGF0YScsICdjYW5wbGF5JywgJ2NhbnBsYXl0aHJvdWdoJywgJ3NlZWtlZCcsICdzZWVraW5nJywgJ3N0YWxsZWQnLCAndGltZXVwZGF0ZScsICd2b2x1bWVjaGFuZ2UnLCAnd2FpdGluZycsICdkdXJhdGlvbmNoYW5nZScsICdwcm9ncmVzcycsICdlbXB0aWVkJywgJ2VuZGVkJywgJ3BsYXknLCAncGF1c2UnXTtcbiAgICB2YXIgc3BlYWtlciA9IHRoaXM7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGV2ZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgb2JqZWN0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRzW2ldLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgdmFyIGF1ZGlvID0gZXZlbnQuY3VycmVudFRhcmdldDtcbiAgICAgICAgdmFyIG5hbWUgPSAoYXVkaW8gPT09IHNwZWFrZXIuYWN0aXZlLmF1ZGlvKSA/ICdhY3RpdmUnIDpcbiAgICAgICAgICAoYXVkaW8gPT09IHNwZWFrZXIucHJlcGFyaW5nLmF1ZGlvKSA/ICdwcmVwYXJpbmcnIDpcbiAgICAgICAgICAgICdmYWRpbmcnO1xuXG4gICAgICAgIGxvZyhuYW1lICsgJzogJyArIGV2ZW50LnR5cGUpO1xuICAgICAgICBsb2coJyAgICBhY3RpdmU6ICcgKyBkKHNwZWFrZXIuYWN0aXZlLmF1ZGlvKSk7XG4gICAgICAgIGxvZygnICAgIHByZXBhcmluZzogJyArIGQoc3BlYWtlci5wcmVwYXJpbmcuYXVkaW8pKTtcbiAgICAgICAgbG9nKCcgICAgZmFkaW5nOiAnICsgZChzcGVha2VyLmZhZGluZy5hdWRpbykpO1xuXG4gICAgICAgIGlmIChhdWRpby5zcmMgPT09IFNJTEVOQ0UpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuICAvLyBDcmVhdGUgYW5kIHJldHVybiBuZXcgc291bmQgb2JqZWN0LiBUaGlzIHRocm93cyB0aGUgc29uZyBpbnRvXG4gIC8vIHRoZSBwcmVwYXJpbmcgYXVkaW8gaW5zdGFuY2UuXG4gIGNyZWF0ZTogZnVuY3Rpb24gKHVybCwgb3B0aW9uc0FuZENhbGxiYWNrcykge1xuICAgIHZhciBpZCA9IHVuaXF1ZUlkKCdmZWVkLXBsYXktJyk7XG4gICAgdmFyIHNvdW5kID0gbmV3IFNvdW5kKHRoaXMsIG9wdGlvbnNBbmRDYWxsYmFja3MsIGlkLCB1cmwpO1xuXG4gICAgbG9nKCdjcmVhdGVkIHBsYXkgJyArIGlkICsgJyAoJyArIHVybCArICcpJywgb3B0aW9uc0FuZENhbGxiYWNrcyk7XG5cbiAgICB0aGlzLm91dHN0YW5kaW5nUGxheXNbc291bmQuaWRdID0gc291bmQ7XG5cbiAgICAvLyBzdGFydCBsb2FkaW5nIHNvdW5kLCBpZiB3ZSBjYW5cbiAgICBpZiAoIXRoaXMuYWN0aXZlLmF1ZGlvKSB7XG4gICAgICB0aGlzLnByZXBhcmVXaGVuUmVhZHkgPSBzb3VuZC51cmw7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3ByZXBhcmUoc291bmQudXJsLCBzb3VuZC5zdGFydFBvc2l0aW9uKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc291bmQ7XG4gIH0sXG5cbiAgcHJlcGFyZTogZnVuY3Rpb24gKHVybCkge1xuICAgIGlmICghdGhpcy5hY3RpdmUuYXVkaW8pIHtcbiAgICAgIHRoaXMucHJlcGFyZVdoZW5SZWFkeSA9IHVybDtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgcmFuZ2VzID0gdGhpcy5hY3RpdmUuYXVkaW8uYnVmZmVyZWQ7XG4gICAgaWYgKChyYW5nZXMubGVuZ3RoID4gMCkgJiYgKHJhbmdlcy5lbmQocmFuZ2VzLmxlbmd0aCAtIDEpID49IHRoaXMuYWN0aXZlLmF1ZGlvLmR1cmF0aW9uKSkge1xuICAgICAgcmV0dXJuIHRoaXMuX3ByZXBhcmUodXJsLCAwKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5hY3RpdmUuYXVkaW8udXJsID09PSBTSUxFTkNFKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcHJlcGFyZSh1cmwsIDApO1xuICAgIH1cblxuICAgIC8vIHN0aWxsIGxvYWRpbmcgcHJpbWFyeSBhdWRpbyAtIHNvIGhvbGQgb2ZmIGZvciBub3dcbiAgICB0aGlzLnByZXBhcmVXaGVuUmVhZHkgPSB1cmw7XG4gIH0sXG5cbiAgX3ByZXBhcmU6IGZ1bmN0aW9uICh1cmwsIHN0YXJ0UG9zaXRpb24pIHtcbiAgICAvLyBlbXB0eSBvdXQgYW55IHBlbmRpbmcgcmVxdWVzdFxuICAgIHRoaXMucHJlcGFyZVdoZW5SZWFkeSA9IG51bGw7XG5cbiAgICBpZiAodGhpcy5wcmVwYXJpbmcuYXVkaW8uc3JjICE9PSB1cmwpIHtcbiAgICAgIGxvZygncHJlcGFyaW5nICcgKyB1cmwpO1xuICAgICAgdGhpcy5wcmVwYXJpbmcuYXVkaW8uc3JjID0gdXJsO1xuICAgIH1cblxuICAgIGlmIChzdGFydFBvc2l0aW9uICYmICh0aGlzLnByZXBhcmluZy5hdWRpby5jdXJyZW50VGltZSAhPT0gc3RhcnRQb3NpdGlvbikpIHtcbiAgICAgIGxvZygnYWR2YW5jaW5nIHByZXBhcmluZyBhdWRpbyB0bycsIHN0YXJ0UG9zaXRpb24gLyAxMDAwKTtcbiAgICAgIHRoaXMucHJlcGFyaW5nLmF1ZGlvLmN1cnJlbnRUaW1lID0gc3RhcnRQb3NpdGlvbiAvIDEwMDA7XG4gICAgfVxuICB9LFxuXG4gIC8qXG4gICAqIEtpY2sgb2ZmIHBsYXliYWNrIG9mIHRoZSByZXF1ZXN0ZWQgc291bmQuXG4gICAqL1xuXG4gIF9wbGF5U291bmQ6IGZ1bmN0aW9uIChzb3VuZCkge1xuICAgIHZhciBzcGVha2VyID0gdGhpcztcblxuICAgIGlmICghdGhpcy5hY3RpdmUuYXVkaW8pIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyoqKiogcGxheWVyLmluaXRpYWxpemVBdWRpbygpICoqKiBub3QgY2FsbGVkJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuYWN0aXZlLnNvdW5kID09PSBzb3VuZCkge1xuICAgICAgaWYgKHRoaXMuYWN0aXZlLmF1ZGlvLnBhdXNlZCkge1xuICAgICAgICBsb2coc291bmQuaWQgKyAnIHdhcyBwYXVzZWQsIHNvIHJlc3VtaW5nJyk7XG5cbiAgICAgICAgLy8gcmVzdW1lIHBsYXliYWNrXG4gICAgICAgIHRoaXMuYWN0aXZlLmF1ZGlvLnBsYXkoKVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGxvZygncmVzdW1lZCBwbGF5YmFjaycpO1xuICAgICAgICAgICAgc291bmQudHJpZ2dlcigncGxheScpO1xuXG5cbiAgICAgICAgICB9KVxuICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBsb2coJ2Vycm9yIHJlc3VtaW5nIHBsYXliYWNrJyk7XG4gICAgICAgICAgICBzcGVha2VyLmFjdGl2ZS5zb3VuZCA9IG51bGw7XG4gICAgICAgICAgICBzb3VuZC50cmlnZ2VyKCdmaW5pc2gnKTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICBpZiAodGhpcy5mYWRpbmcuc291bmQpIHtcbiAgICAgICAgICB0aGlzLmZhZGluZy5hdWRpby5wbGF5KClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgbG9nKCdyZXN1bWVkIGZhZGluZyBwbGF5YmFjaycpO1xuXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgbG9nKCdlcnJvciByZXN1bWluZyBmYWRpbmcgcGxheWJhY2snKTtcbiAgICAgICAgICAgICAgc3BlYWtlci5mYWRpbmcuc291bmQgPSBudWxsO1xuICAgICAgICAgICAgICBzcGVha2VyLmZhZGluZy5hdWRpby5zcmMgPSBTSUxFTkNFO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfVxuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2coc291bmQuaWQgKyAnIGlzIGFscmVhZHkgcGxheWluZycpO1xuICAgICAgfVxuXG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0aGlzLnByZXBhcmluZy5hdWRpby5zcmMgIT09IHNvdW5kLnVybCkge1xuICAgICAgICB0aGlzLl9wcmVwYXJlKHNvdW5kLnVybCwgc291bmQuc3RhcnRQb3NpdGlvbik7XG5cbiAgICAgICAgLypcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChzb3VuZC5zdGFydFBvc2l0aW9uICYmICh0aGlzLnByZXBhcmluZy5hdWRpby5jdXJyZW50VGltZSAhPT0gc291bmQuc3RhcnRQb3NpdGlvbikpIHtcbiAgICAgICAgICAgICAgICBsb2coJ2FkdmFuY2luZyBwcmVwYXJlZCBhdWRpbyB0bycsIHNvdW5kLnN0YXJ0UG9zaXRpb24gLyAxMDAwKTtcbiAgICAgICAgICAgICAgICB0aGlzLnByZXBhcmluZy5hdWRpby5jdXJyZW50VGltZSA9IHNvdW5kLnN0YXJ0UG9zaXRpb24gLyAxMDAwO1xuICAgICAgICAgICAgICAgICovXG4gICAgICB9XG5cbiAgICAgIC8vIHN3YXAgcHJlcGFyZWQgLT4gYWN0aXZlXG4gICAgICB2YXIgYWN0aXZlID0gdGhpcy5hY3RpdmU7XG4gICAgICB0aGlzLmFjdGl2ZSA9IHRoaXMucHJlcGFyaW5nO1xuICAgICAgdGhpcy5wcmVwYXJpbmcgPSBhY3RpdmU7XG5cbiAgICAgIC8vIGRvbid0IHRocm93IHNvdW5kIG9iamVjdCBpbiBhY3RpdmUgdW50aWwgcGxheWJhY2sgc3RhcnRzIChiZWxvdylcbiAgICAgIHRoaXMuYWN0aXZlLnNvdW5kID0gbnVsbDtcbiAgICAgIHRoaXMuX3NldFZvbHVtZSh0aGlzLmFjdGl2ZSwgc291bmQpO1xuXG4gICAgICAvLyByZXNldCBhdWRpbyBlbGVtZW50IGZvciBmaW5pc2hlZCBzb25nXG4gICAgICB0aGlzLnByZXBhcmluZy5hdWRpby5zcmMgPSBTSUxFTkNFO1xuXG4gICAgICAvLyBub3RpZnkgY2xpZW50cyB0aGF0IHdoYXRldmVyIHdhcyBwcmV2aW91c2x5IHBsYXlpbmcgaGFzIGZpbmlzaGVkXG4gICAgICBpZiAodGhpcy5wcmVwYXJpbmcuc291bmQpIHtcbiAgICAgICAgdmFyIGZpbmlzaGVkU291bmQgPSB0aGlzLnByZXBhcmluZy5zb3VuZDtcbiAgICAgICAgdGhpcy5wcmVwYXJpbmcuc291bmQgPSBudWxsO1xuICAgICAgICBmaW5pc2hlZFNvdW5kLnRyaWdnZXIoJ2ZpbmlzaCcpO1xuICAgICAgfVxuXG4gICAgICBsb2coc291bmQuaWQgKyAnIHN0YXJ0aW5nJyk7XG4gICAgICB0aGlzLmFjdGl2ZS5hdWRpby5wbGF5KClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGxvZygnc3VjY2VzcyBzdGFydGluZyBwbGF5YmFjaycpO1xuICAgICAgICAgIHNwZWFrZXIuYWN0aXZlLnNvdW5kID0gc291bmQ7XG5cbiAgICAgICAgICAvLyBjb25maWd1cmUgZmFkZS1vdXQgbm93IHRoYXQgbWV0YWRhdGEgaXMgbG9hZGVkXG4gICAgICAgICAgaWYgKHNvdW5kLmZhZGVPdXRTZWNvbmRzICYmIChzb3VuZC5mYWRlT3V0RW5kID09PSAwKSkge1xuICAgICAgICAgICAgc291bmQuZmFkZU91dFN0YXJ0ID0gc3BlYWtlci5hY3RpdmUuYXVkaW8uZHVyYXRpb24gLSBzb3VuZC5mYWRlT3V0U2Vjb25kcztcbiAgICAgICAgICAgIHNvdW5kLmZhZGVPdXRFbmQgPSBzcGVha2VyLmFjdGl2ZS5hdWRpby5kdXJhdGlvbjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoc291bmQuc3RhcnRQb3NpdGlvbikge1xuICAgICAgICAgICAgbG9nKCd1cGRhdGluZyBzdGFydCBwb3NpdGlvbicpO1xuICAgICAgICAgICAgc3BlYWtlci5hY3RpdmUuYXVkaW8uY3VycmVudFRpbWUgPSBzb3VuZC5zdGFydFBvc2l0aW9uIC8gMTAwMDtcbiAgICAgICAgICAgIGxvZygndXBkYXRlZCcpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBwYXVzZWQgPSBzcGVha2VyLmFjdGl2ZS5hdWRpby5wYXVzZWQ7XG5cbiAgICAgICAgICBzb3VuZC50cmlnZ2VyKCdwbGF5Jyk7XG5cbiAgICAgICAgICBpZiAocGF1c2VkKSB7XG4gICAgICAgICAgICBzb3VuZC50cmlnZ2VyKCdwYXVzZScpO1xuICAgICAgICAgIH1cblxuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgbG9nKCdlcnJvciBzdGFydGluZyBwbGF5YmFjaycsIGVycm9yKTtcbiAgICAgICAgICBzb3VuZC50cmlnZ2VyKCdmaW5pc2gnLCBlcnJvcik7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuICBfZGVzdHJveVNvdW5kOiBmdW5jdGlvbiAoc291bmQpIHtcbiAgICBsb2coJ3dhbnQgdG8gZGVzdHJveSwgYW5kIGN1cnJlbnQgaXMnLCBzb3VuZCwgdGhpcy5hY3RpdmUuc291bmQpO1xuICAgIHNvdW5kLm9mZigpO1xuXG4gICAgaWYgKHRoaXMuYWN0aXZlLnNvdW5kID09PSBzb3VuZCkge1xuICAgICAgbG9nKCdkZXN0cm95IHRyaWdnZXJlZCBmb3IgY3VycmVudCBzb3VuZCcsIHNvdW5kLmlkKTtcbiAgICAgIHRoaXMuYWN0aXZlLmF1ZGlvLnBhdXNlKCk7XG4gICAgfVxuXG4gICAgZGVsZXRlIHRoaXMub3V0c3RhbmRpbmdQbGF5c1t0aGlzLmlkXTtcbiAgfSxcblxuICBfcGF1c2VTb3VuZDogZnVuY3Rpb24gKHNvdW5kKSB7XG4gICAgaWYgKChzb3VuZCAhPSBudWxsKSAmJiAoc291bmQgIT09IHRoaXMuYWN0aXZlLnNvdW5kKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuYWN0aXZlLmF1ZGlvLnBhdXNlKCk7XG5cbiAgICBpZiAodGhpcy5mYWRpbmcuc291bmQpIHtcbiAgICAgIHRoaXMuZmFkaW5nLmF1ZGlvLnBhdXNlKCk7XG4gICAgfVxuICB9LFxuXG4gIF9wb3NpdGlvbjogZnVuY3Rpb24gKHNvdW5kKSB7XG4gICAgaWYgKHNvdW5kID09PSB0aGlzLmFjdGl2ZS5zb3VuZCkge1xuICAgICAgaWYgKHNvdW5kLnVybCAhPT0gdGhpcy5hY3RpdmUuYXVkaW8uc3JjKSB7XG4gICAgICAgIGxvZygndHJ5aW5nIHRvIGdldCBjdXJyZW50IHNvbmcgcG9zaXRpb24sIGJ1dCBpdCBpcyBub3QgaW4gdGhlIGFjdGl2ZSBhdWRpbyBwbGF5ZXInKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIE1hdGguZmxvb3IodGhpcy5hY3RpdmUuYXVkaW8uY3VycmVudFRpbWUgKiAxMDAwKTtcblxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gMDtcblxuICAgIH1cbiAgfSxcblxuICBfZHVyYXRpb246IGZ1bmN0aW9uIChzb3VuZCkge1xuICAgIGlmIChzb3VuZCA9PT0gdGhpcy5hY3RpdmUuc291bmQpIHtcbiAgICAgIGlmIChzb3VuZC51cmwgIT09IHRoaXMuYWN0aXZlLmF1ZGlvLnNyYykge1xuICAgICAgICBsb2coJ3RyeWluZyB0byBnZXQgY3VycmVudCBzb25nIGR1cmF0aW9uLCBidXQgaXQgaXMgbm90IGluIHRoZSBhY3RpdmUgYXVkaW8gcGxheWVyJyk7XG4gICAgICB9XG4gICAgICB2YXIgZCA9IHRoaXMuYWN0aXZlLmF1ZGlvLmR1cmF0aW9uO1xuICAgICAgcmV0dXJuIGlzTmFOKGQpID8gMCA6IE1hdGguZmxvb3IoZCAqIDEwMDApO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAwO1xuXG4gICAgfVxuICB9LFxuXG4gIC8vIHNldCB0aGUgdm9sdW1lICgwLTEwMClcbiAgc2V0Vm9sdW1lOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgdGhpcy52b2wgPSB2YWx1ZTtcblxuICAgICAgaWYgKHRoaXMuYWN0aXZlICYmIHRoaXMuYWN0aXZlLnNvdW5kKSB7XG4gICAgICAgIHRoaXMuX3NldFZvbHVtZSh0aGlzLmFjdGl2ZSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMudHJpZ2dlcigndm9sdW1lJywgdmFsdWUpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnZvbDtcbiAgfVxuXG59O1xuXG4vLyBhZGQgZXZlbnRzIHRvIHNwZWFrZXIgY2xhc3Ncbk9iamVjdC5hc3NpZ24oU3BlYWtlci5wcm90b3R5cGUsIEV2ZW50cyk7XG5cbmV4cG9ydCBkZWZhdWx0IFNwZWFrZXI7XG4iLCJcbmltcG9ydCBsb2cgZnJvbSAnLi9sb2cnO1xuaW1wb3J0IEV2ZW50cyBmcm9tICcuL2V2ZW50cyc7XG5pbXBvcnQgeyB2ZXJzaW9uIH0gZnJvbSAnLi4vcGFja2FnZS5qc29uJztcblxubG9nKCd0aGlzIGlzIGEgdGVzdCEnKTtcblxubGV0IGZvbyA9IE9iamVjdC5hc3NpZ24oe30sIEV2ZW50cyk7XG5cbmZvby5vbignYmxhaCcsICgpID0+IHsgbG9nKCdnb3QgYSBibGFoIGV2ZW50IScpOyB9KTtcblxuZm9vLnRyaWdnZXIoJ2JsYWgnKTtcblxuaW1wb3J0IFNwZWFrZXIgZnJvbSAnLi9zcGVha2VyJztcblxubGV0IHNwZWFrZXIgPSBuZXcgU3BlYWtlcigpO1xuXG5sb2coJ3dlIGNhbiBwbGF5Jywgc3BlYWtlci5nZXRTdXBwb3J0ZWRGb3JtYXRzKCkpO1xuXG5sb2coJ3ZlcnNpb24gaXMgJyArIHZlcnNpb24pO1xuIl0sIm5hbWVzIjpbImxvZyIsImNvbnNvbGUiLCJhcHBseSIsImFyZ3VtZW50cyIsImlzT2JqZWN0IiwicmVxdWlyZSQkMCIsImRvY3VtZW50IiwicmVxdWlyZSQkMSIsInJlcXVpcmUkJDIiLCJhbk9iamVjdCIsInRvUHJpbWl0aXZlIiwiSUU4X0RPTV9ERUZJTkUiLCJkUCIsImNyZWF0ZURlc2MiLCJoYXMiLCJoaWRlIiwiZ2xvYmFsIiwiY29yZSIsInVpZCIsIndrcyIsImRlZmluZWQiLCJmYWlscyIsInJlZGVmaW5lIiwiY29mIiwiZnJlZUdsb2JhbCIsInJvb3QiLCJoYXNPd25Qcm9wZXJ0eSIsIlN5bWJvbCIsIm9iamVjdFByb3RvIiwibmF0aXZlT2JqZWN0VG9TdHJpbmciLCJzeW1Ub1N0cmluZ1RhZyIsImdldFJhd1RhZyIsIm9iamVjdFRvU3RyaW5nIiwiaXNPYmplY3RMaWtlIiwiYmFzZUdldFRhZyIsImlzQXJyYXkiLCJhcnJheU1hcCIsImlzU3ltYm9sIiwidG9TdHJpbmciLCJiYXNlVG9TdHJpbmciLCJjcmVhdGVCYXNlRm9yIiwiYmFzZUlzQXJndW1lbnRzIiwic3R1YkZhbHNlIiwiTUFYX1NBRkVfSU5URUdFUiIsImFyZ3NUYWciLCJpc0xlbmd0aCIsIm5vZGVVdGlsIiwiYmFzZVVuYXJ5IiwiYmFzZUlzVHlwZWRBcnJheSIsImlzQXJndW1lbnRzIiwiaXNCdWZmZXIiLCJpc1R5cGVkQXJyYXkiLCJiYXNlVGltZXMiLCJpc0luZGV4Iiwib3ZlckFyZyIsImlzUHJvdG90eXBlIiwibmF0aXZlS2V5cyIsImZ1bmNUYWciLCJpc0Z1bmN0aW9uIiwiaXNBcnJheUxpa2UiLCJhcnJheUxpa2VLZXlzIiwiYmFzZUtleXMiLCJiYXNlRm9yIiwia2V5cyIsImNyZWF0ZUJhc2VFYWNoIiwiYmFzZUZvck93biIsImlkZW50aXR5IiwiYXJyYXlFYWNoIiwiYmFzZUVhY2giLCJjYXN0RnVuY3Rpb24iLCJJTkZJTklUWSIsInRvTnVtYmVyIiwidG9GaW5pdGUiLCJ0b0ludGVnZXIiLCJiZWZvcmUiLCJzbGljZSIsIkFycmF5IiwicHJvdG90eXBlIiwiRXZlbnRzIiwib24iLCJuYW1lIiwiY2FsbGJhY2siLCJjb250ZXh0IiwiZXZlbnRzQXBpIiwiX2V2ZW50cyIsImV2ZW50cyIsInB1c2giLCJjdHgiLCJvbmNlIiwic2VsZiIsIl9vbmNlIiwib2ZmIiwiX2NhbGxiYWNrIiwicmV0YWluIiwiZXYiLCJuYW1lcyIsImkiLCJsIiwiaiIsImsiLCJfa2V5cyIsImxlbmd0aCIsInRyaWdnZXIiLCJhcmdzIiwiY2FsbCIsImFsbEV2ZW50cyIsImFsbCIsInRyaWdnZXJFdmVudHMiLCJzdG9wTGlzdGVuaW5nIiwib2JqIiwibGlzdGVuZXJzIiwiX2xpc3RlbmVycyIsImRlbGV0ZUxpc3RlbmVyIiwiX2xpc3RlbmVySWQiLCJpZCIsImV2ZW50U3BsaXR0ZXIiLCJhY3Rpb24iLCJyZXN0Iiwia2V5IiwiY29uY2F0IiwidGVzdCIsInNwbGl0IiwiYTEiLCJhMiIsImEzIiwibGlzdGVuTWV0aG9kcyIsImxpc3RlblRvIiwibGlzdGVuVG9PbmNlIiwiX2VhY2giLCJpbXBsZW1lbnRhdGlvbiIsIm1ldGhvZCIsIl91bmlxdWVJZCIsImlkQ291bnRlciIsInVuaXF1ZUlkIiwicHJlZml4IiwiaU9TcCIsIm5hdmlnYXRvciIsInVzZXJBZ2VudCIsIlNJTEVOQ0UiLCJTb3VuZCIsInNwZWFrZXIiLCJvcHRpb25zIiwidXJsIiwiT2JqZWN0IiwiYXNzaWduIiwibG9hZGVkIiwic3RhcnRQb3NpdGlvbiIsImVuZFBvc2l0aW9uIiwiZmFkZUluU2Vjb25kcyIsImZhZGVJblN0YXJ0IiwiZmFkZUluRW5kIiwiZmFkZU91dFNlY29uZHMiLCJmYWRlT3V0U3RhcnQiLCJmYWRlT3V0RW5kIiwiZ2FpbiIsImQiLCJhdWRpbyIsInNyYyIsImN1cnJlbnRUaW1lIiwicGF1c2VkIiwiZHVyYXRpb24iLCJyZWFkeVN0YXRlIiwicGxheSIsIl9wbGF5U291bmQiLCJwYXVzZSIsIl9wYXVzZVNvdW5kIiwicmVzdW1lIiwicG9zaXRpb24iLCJfcG9zaXRpb24iLCJfZHVyYXRpb24iLCJkZXN0cm95IiwiX2Rlc3Ryb3lTb3VuZCIsImdhaW5BZGp1c3RlZFZvbHVtZSIsInZvbHVtZSIsImFkanVzdGVkIiwiTWF0aCIsIm1heCIsIm1pbiIsInBvdyIsIlNwZWFrZXIiLCJjcmVhdGVBdWRpb0NvbnRleHQiLCJBdWRpb0N0b3IiLCJ3aW5kb3ciLCJBdWRpb0NvbnRleHQiLCJ3ZWJraXRBdWRpb0NvbnRleHQiLCJkZXNpcmVkU2FtcGxlUmF0ZSIsInNhbXBsZVJhdGUiLCJidWZmZXIiLCJjcmVhdGVCdWZmZXIiLCJkdW1teSIsImNyZWF0ZUJ1ZmZlclNvdXJjZSIsImNvbm5lY3QiLCJkZXN0aW5hdGlvbiIsInN0YXJ0IiwiZGlzY29ubmVjdCIsImNsb3NlIiwidm9sIiwib3V0c3RhbmRpbmdQbGF5cyIsImF1ZGlvQ29udGV4dCIsImFjdGl2ZSIsImZhZGluZyIsInByZXBhcmluZyIsInByZXBhcmVXaGVuUmVhZHkiLCJpbml0aWFsaXplQXVkaW8iLCJfY3JlYXRlQXVkaW8iLCJnZXRTdXBwb3J0ZWRGb3JtYXRzIiwiY3JlYXRlRWxlbWVudCIsImNhblBsYXlUeXBlIiwiX2NyZWF0ZUF1ZGlvR2Fpbk5vZGUiLCJzb3VyY2UiLCJjcmVhdGVNZWRpYUVsZW1lbnRTb3VyY2UiLCJnYWluTm9kZSIsImNyZWF0ZUdhaW4iLCJ2YWx1ZSIsIkRFRkFVTFRfVk9MVU1FIiwiQXVkaW8iLCJjcm9zc09yaWdpbiIsImxvb3AiLCJfYWRkRXZlbnRMaXN0ZW5lcnMiLCJzb3VuZCIsImFkZEV2ZW50TGlzdGVuZXIiLCJfb25BdWRpb1BhdXNlRXZlbnQiLCJiaW5kIiwiX29uQXVkaW9FbmRlZEV2ZW50IiwiX29uQXVkaW9UaW1lVXBkYXRlRXZlbnQiLCJldmVudCIsImN1cnJlbnRUYXJnZXQiLCJfc2V0Vm9sdW1lIiwicHJlcGFyZSIsImF1ZGlvR3JvdXAiLCJjdXJyZW50Vm9sdW1lIiwiY2FsY3VsYXRlZFZvbHVtZSIsIl9kZWJ1Z0F1ZGlvT2JqZWN0Iiwib2JqZWN0IiwidHlwZSIsImNyZWF0ZSIsIm9wdGlvbnNBbmRDYWxsYmFja3MiLCJfcHJlcGFyZSIsInJhbmdlcyIsImJ1ZmZlcmVkIiwiZW5kIiwiZXJyb3IiLCJ0aGVuIiwiY2F0Y2giLCJmaW5pc2hlZFNvdW5kIiwiZmxvb3IiLCJpc05hTiIsInNldFZvbHVtZSIsImZvbyIsInZlcnNpb24iXSwibWFwcGluZ3MiOiI7OztFQUFBO0VBRUE7RUFDQSxJQUFJQSxHQUFHLEdBQUcsU0FBTkEsR0FBTSxHQUFZO0VBQ3BCQyxFQUFBQSxPQUFPLENBQUNELEdBQVIsQ0FBWUUsS0FBWixDQUFtQkQsT0FBbkIsRUFBNEIsQ0FBRSxHQUFHRSxTQUFMLENBQTVCO0VBQ0QsQ0FGRDs7RUNIQSxhQUFjLEdBQUcsVUFBVSxFQUFFLEVBQUU7SUFDN0IsT0FBTyxPQUFPLEVBQUUsS0FBSyxRQUFRLEdBQUcsRUFBRSxLQUFLLElBQUksR0FBRyxPQUFPLEVBQUUsS0FBSyxVQUFVLENBQUM7R0FDeEUsQ0FBQzs7RUNERixhQUFjLEdBQUcsVUFBVSxFQUFFLEVBQUU7SUFDN0IsSUFBSSxDQUFDQyxTQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxTQUFTLENBQUMsRUFBRSxHQUFHLG9CQUFvQixDQUFDLENBQUM7SUFDOUQsT0FBTyxFQUFFLENBQUM7R0FDWCxDQUFDOztFQ0pGLFVBQWMsR0FBRyxVQUFVLElBQUksRUFBRTtJQUMvQixJQUFJO01BQ0YsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLENB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
