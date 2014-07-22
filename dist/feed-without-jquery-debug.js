window.SM2_DEFER = true;
/**
 * almond 0.2.6 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        if (config.deps) {
            req(config.deps, config.callback);
        }
        return req;
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("almond", function(){});

//     Underscore.js 1.3.3
//     (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore is freely distributable under the MIT license.
//     Portions of Underscore are inspired or borrowed from Prototype,
//     Oliver Steele's Functional, and John Resig's Micro-Templating.
//     For all details and documentation:
//     http://documentcloud.github.com/underscore

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var slice            = ArrayProto.slice,
      unshift          = ArrayProto.unshift,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) { return new wrapper(obj); };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root['_'] = _;
  }

  // Current version.
  _.VERSION = '1.3.3';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (i in obj && iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    if (obj.length === +obj.length) results.length = obj.length;
    return results;
  };

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError('Reduce of empty array with no initial value');
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var reversed = _.toArray(obj).reverse();
    if (context && !initial) iterator = _.bind(iterator, context);
    return initial ? _.reduce(reversed, iterator, memo, context) : _.reduce(reversed, iterator);
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    each(obj, function(value, index, list) {
      if (!iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if a given value is included in the array or object using `===`.
  // Aliased as `contains`.
  _.include = _.contains = function(obj, target) {
    var found = false;
    if (obj == null) return found;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    found = any(obj, function(value) {
      return value === target;
    });
    return found;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    return _.map(obj, function(value) {
      return (_.isFunction(method) ? method || value : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Return the maximum element or (element-based computation).
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0]) return Math.max.apply(Math, obj);
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0]) return Math.min.apply(Math, obj);
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var shuffled = [], rand;
    each(obj, function(value, index, list) {
      rand = Math.floor(Math.random() * (index + 1));
      shuffled[index] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, val, context) {
    var iterator = _.isFunction(val) ? val : function(obj) { return obj[val]; };
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria, b = right.criteria;
      if (a === void 0) return 1;
      if (b === void 0) return -1;
      return a < b ? -1 : a > b ? 1 : 0;
    }), 'value');
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, val) {
    var result = {};
    var iterator = _.isFunction(val) ? val : function(obj) { return obj[val]; };
    each(obj, function(value, index) {
      var key = iterator(value, index);
      (result[key] || (result[key] = [])).push(value);
    });
    return result;
  };

  // Use a comparator function to figure out at what index an object should
  // be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator) {
    iterator || (iterator = _.identity);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >> 1;
      iterator(array[mid]) < iterator(obj) ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj)                                     return [];
    if (_.isArray(obj))                           return slice.call(obj);
    if (_.isArguments(obj))                       return slice.call(obj);
    if (obj.toArray && _.isFunction(obj.toArray)) return obj.toArray();
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    return _.isArray(obj) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especcialy useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail`.
  // Especially useful on the arguments object. Passing an **index** will return
  // the rest of the values in the array from that index onward. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = function(array, index, guard) {
    return slice.call(array, (index == null) || guard ? 1 : index);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, function(value){ return !!value; });
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return _.reduce(array, function(memo, value) {
      if (_.isArray(value)) return memo.concat(shallow ? value : _.flatten(value));
      memo[memo.length] = value;
      return memo;
    }, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator) {
    var initial = iterator ? _.map(array, iterator) : array;
    var results = [];
    // The `isSorted` flag is irrelevant if the array only contains two elements.
    if (array.length < 3) isSorted = true;
    _.reduce(initial, function (memo, value, index) {
      if (isSorted ? _.last(memo) !== value || !memo.length : !_.include(memo, value)) {
        memo.push(value);
        results.push(array[index]);
      }
      return memo;
    }, []);
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays. (Aliased as "intersect" for back-compat.)
  _.intersection = _.intersect = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = _.flatten(slice.call(arguments, 1), true);
    return _.filter(array, function(value){ return !_.include(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) results[i] = _.pluck(args, "" + i);
    return results;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i, l;
    if (isSorted) {
      i = _.sortedIndex(array, item);
      return array[i] === item ? i : -1;
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item);
    for (i = 0, l = array.length; i < l; i++) if (i in array && array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item) {
    if (array == null) return -1;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) return array.lastIndexOf(item);
    var i = array.length;
    while (i--) if (i in array && array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Binding with arguments is also known as `curry`.
  // Delegates to **ECMAScript 5**'s native `Function.bind` if available.
  // We check for `func.bind` first, to fail fast when `func` is undefined.
  _.bind = function bind(func, context) {
    var bound, args;
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length == 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, throttling, more, result;
    var whenDone = _.debounce(function(){ more = throttling = false; }, wait);
    return function() {
      context = this; args = arguments;
      var later = function() {
        timeout = null;
        if (more) func.apply(context, args);
        whenDone();
      };
      if (!timeout) timeout = setTimeout(later, wait);
      if (throttling) {
        more = true;
      } else {
        result = func.apply(context, args);
      }
      whenDone();
      throttling = true;
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      if (immediate && !timeout) func.apply(context, args);
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      return memo = func.apply(this, arguments);
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func].concat(slice.call(arguments, 0));
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) { return func.apply(this, arguments); }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    return _.map(obj, _.identity);
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var result = {};
    each(_.flatten(slice.call(arguments, 1)), function(key) {
      if (key in obj) result[key] = obj[key];
    });
    return result;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        if (obj[prop] == null) obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function.
  function eq(a, b, stack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a._chain) a = a._wrapped;
    if (b._chain) b = b._wrapped;
    // Invoke a custom `isEqual` method if one is provided.
    if (a.isEqual && _.isFunction(a.isEqual)) return a.isEqual(b);
    if (b.isEqual && _.isFunction(b.isEqual)) return b.isEqual(a);
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = stack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (stack[length] == a) return true;
    }
    // Add the first object to the stack of traversed objects.
    stack.push(a);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          // Ensure commutative equality for sparse arrays.
          if (!(result = size in a == size in b && eq(a[size], b[size], stack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent.
      if ('constructor' in a != 'constructor' in b || a.constructor != b.constructor) return false;
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], stack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    stack.pop();
    return result;
  }

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType == 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Is a given variable an arguments object?
  _.isArguments = function(obj) {
    return toString.call(obj) == '[object Arguments]';
  };
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Is a given value a function?
  _.isFunction = function(obj) {
    return toString.call(obj) == '[object Function]';
  };

  // Is a given value a string?
  _.isString = function(obj) {
    return toString.call(obj) == '[object String]';
  };

  // Is a given value a number?
  _.isNumber = function(obj) {
    return toString.call(obj) == '[object Number]';
  };

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return _.isNumber(obj) && isFinite(obj);
  };

  // Is the given value `NaN`?
  _.isNaN = function(obj) {
    // `NaN` is the only value for which `===` is not reflexive.
    return obj !== obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value a date?
  _.isDate = function(obj) {
    return toString.call(obj) == '[object Date]';
  };

  // Is the given value a regular expression?
  _.isRegExp = function(obj) {
    return toString.call(obj) == '[object RegExp]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Has own property?
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function (n, iterator, context) {
    for (var i = 0; i < n; i++) iterator.call(context, i);
  };

  // Escape a string for HTML interpolation.
  _.escape = function(string) {
    return (''+string).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g,'&#x2F;');
  };

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object, ensuring that
  // they're correctly added to the OOP wrapper as well.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      addToWrapper(name, _[name] = obj[name]);
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = idCounter++;
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /.^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    '\\': '\\',
    "'": "'",
    'r': '\r',
    'n': '\n',
    't': '\t',
    'u2028': '\u2028',
    'u2029': '\u2029'
  };

  for (var p in escapes) escapes[escapes[p]] = p;
  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;
  var unescaper = /\\(\\|'|r|n|t|u2028|u2029)/g;

  // Within an interpolation, evaluation, or escaping, remove HTML escaping
  // that had been previously added.
  var unescape = function(code) {
    return code.replace(unescaper, function(match, escape) {
      return escapes[escape];
    });
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    settings = _.defaults(settings || {}, _.templateSettings);

    // Compile the template source, taking care to escape characters that
    // cannot be included in a string literal and then unescape them in code
    // blocks.
    var source = "__p+='" + text
      .replace(escaper, function(match) {
        return '\\' + escapes[match];
      })
      .replace(settings.escape || noMatch, function(match, code) {
        return "'+\n_.escape(" + unescape(code) + ")+\n'";
      })
      .replace(settings.interpolate || noMatch, function(match, code) {
        return "'+\n(" + unescape(code) + ")+\n'";
      })
      .replace(settings.evaluate || noMatch, function(match, code) {
        return "';\n" + unescape(code) + "\n;__p+='";
      }) + "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __p='';" +
      "var print=function(){__p+=Array.prototype.join.call(arguments, '')};\n" +
      source + "return __p;\n";

    var render = new Function(settings.variable || 'obj', '_', source);
    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for build time
    // precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' +
      source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // The OOP Wrapper
  // ---------------

  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.
  var wrapper = function(obj) { this._wrapped = obj; };

  // Expose `wrapper.prototype` as `_.prototype`
  _.prototype = wrapper.prototype;

  // Helper function to continue chaining intermediate results.
  var result = function(obj, chain) {
    return chain ? _(obj).chain() : obj;
  };

  // A method to easily add functions to the OOP wrapper.
  var addToWrapper = function(name, func) {
    wrapper.prototype[name] = function() {
      var args = slice.call(arguments);
      unshift.call(args, this._wrapped);
      return result(func.apply(_, args), this._chain);
    };
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    wrapper.prototype[name] = function() {
      var wrapped = this._wrapped;
      method.apply(wrapped, arguments);
      var length = wrapped.length;
      if ((name == 'shift' || name == 'splice') && length === 0) delete wrapped[0];
      return result(wrapped, this._chain);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    wrapper.prototype[name] = function() {
      return result(method.apply(this._wrapped, arguments), this._chain);
    };
  });

  // Start chaining a wrapped Underscore object.
  wrapper.prototype.chain = function() {
    this._chain = true;
    return this;
  };

  // Extracts the result from a wrapped and chained object.
  wrapper.prototype.value = function() {
    return this._wrapped;
  };

}).call(this);

define("underscore", (function (global) {
    return function () {
        var ret, fn;
        return ret || global._;
    };
}(this)));

/*global define:false */

define('feed/jquery-external',[],function() {
  return window.jQuery;
});

/*
CryptoJS v3.0.2
code.google.com/p/crypto-js
(c) 2009-2012 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
var CryptoJS=CryptoJS||function(h,i){var e={},f=e.lib={},l=f.Base=function(){function a(){}return{extend:function(j){a.prototype=this;var d=new a;j&&d.mixIn(j);d.$super=this;return d},create:function(){var a=this.extend();a.init.apply(a,arguments);return a},init:function(){},mixIn:function(a){for(var d in a)a.hasOwnProperty(d)&&(this[d]=a[d]);a.hasOwnProperty("toString")&&(this.toString=a.toString)},clone:function(){return this.$super.extend(this)}}}(),k=f.WordArray=l.extend({init:function(a,j){a=
this.words=a||[];this.sigBytes=j!=i?j:4*a.length},toString:function(a){return(a||m).stringify(this)},concat:function(a){var j=this.words,d=a.words,c=this.sigBytes,a=a.sigBytes;this.clamp();if(c%4)for(var b=0;b<a;b++)j[c+b>>>2]|=(d[b>>>2]>>>24-8*(b%4)&255)<<24-8*((c+b)%4);else if(65535<d.length)for(b=0;b<a;b+=4)j[c+b>>>2]=d[b>>>2];else j.push.apply(j,d);this.sigBytes+=a;return this},clamp:function(){var a=this.words,b=this.sigBytes;a[b>>>2]&=4294967295<<32-8*(b%4);a.length=h.ceil(b/4)},clone:function(){var a=
l.clone.call(this);a.words=this.words.slice(0);return a},random:function(a){for(var b=[],d=0;d<a;d+=4)b.push(4294967296*h.random()|0);return k.create(b,a)}}),o=e.enc={},m=o.Hex={stringify:function(a){for(var b=a.words,a=a.sigBytes,d=[],c=0;c<a;c++){var e=b[c>>>2]>>>24-8*(c%4)&255;d.push((e>>>4).toString(16));d.push((e&15).toString(16))}return d.join("")},parse:function(a){for(var b=a.length,d=[],c=0;c<b;c+=2)d[c>>>3]|=parseInt(a.substr(c,2),16)<<24-4*(c%8);return k.create(d,b/2)}},q=o.Latin1={stringify:function(a){for(var b=
a.words,a=a.sigBytes,d=[],c=0;c<a;c++)d.push(String.fromCharCode(b[c>>>2]>>>24-8*(c%4)&255));return d.join("")},parse:function(a){for(var b=a.length,d=[],c=0;c<b;c++)d[c>>>2]|=(a.charCodeAt(c)&255)<<24-8*(c%4);return k.create(d,b)}},r=o.Utf8={stringify:function(a){try{return decodeURIComponent(escape(q.stringify(a)))}catch(b){throw Error("Malformed UTF-8 data");}},parse:function(a){return q.parse(unescape(encodeURIComponent(a)))}},b=f.BufferedBlockAlgorithm=l.extend({reset:function(){this._data=k.create();
this._nDataBytes=0},_append:function(a){"string"==typeof a&&(a=r.parse(a));this._data.concat(a);this._nDataBytes+=a.sigBytes},_process:function(a){var b=this._data,d=b.words,c=b.sigBytes,e=this.blockSize,g=c/(4*e),g=a?h.ceil(g):h.max((g|0)-this._minBufferSize,0),a=g*e,c=h.min(4*a,c);if(a){for(var f=0;f<a;f+=e)this._doProcessBlock(d,f);f=d.splice(0,a);b.sigBytes-=c}return k.create(f,c)},clone:function(){var a=l.clone.call(this);a._data=this._data.clone();return a},_minBufferSize:0});f.Hasher=b.extend({init:function(){this.reset()},
reset:function(){b.reset.call(this);this._doReset()},update:function(a){this._append(a);this._process();return this},finalize:function(a){a&&this._append(a);this._doFinalize();return this._hash},clone:function(){var a=b.clone.call(this);a._hash=this._hash.clone();return a},blockSize:16,_createHelper:function(a){return function(b,d){return a.create(d).finalize(b)}},_createHmacHelper:function(a){return function(b,d){return g.HMAC.create(a,d).finalize(b)}}});var g=e.algo={};return e}(Math);
(function(h){var i=CryptoJS,e=i.lib,f=e.WordArray,e=e.Hasher,l=i.algo,k=[],o=[];(function(){function e(a){for(var b=h.sqrt(a),d=2;d<=b;d++)if(!(a%d))return!1;return!0}function f(a){return 4294967296*(a-(a|0))|0}for(var b=2,g=0;64>g;)e(b)&&(8>g&&(k[g]=f(h.pow(b,0.5))),o[g]=f(h.pow(b,1/3)),g++),b++})();var m=[],l=l.SHA256=e.extend({_doReset:function(){this._hash=f.create(k.slice(0))},_doProcessBlock:function(e,f){for(var b=this._hash.words,g=b[0],a=b[1],j=b[2],d=b[3],c=b[4],h=b[5],l=b[6],k=b[7],n=0;64>
n;n++){if(16>n)m[n]=e[f+n]|0;else{var i=m[n-15],p=m[n-2];m[n]=((i<<25|i>>>7)^(i<<14|i>>>18)^i>>>3)+m[n-7]+((p<<15|p>>>17)^(p<<13|p>>>19)^p>>>10)+m[n-16]}i=k+((c<<26|c>>>6)^(c<<21|c>>>11)^(c<<7|c>>>25))+(c&h^~c&l)+o[n]+m[n];p=((g<<30|g>>>2)^(g<<19|g>>>13)^(g<<10|g>>>22))+(g&a^g&j^a&j);k=l;l=h;h=c;c=d+i|0;d=j;j=a;a=g;g=i+p|0}b[0]=b[0]+g|0;b[1]=b[1]+a|0;b[2]=b[2]+j|0;b[3]=b[3]+d|0;b[4]=b[4]+c|0;b[5]=b[5]+h|0;b[6]=b[6]+l|0;b[7]=b[7]+k|0},_doFinalize:function(){var e=this._data,f=e.words,b=8*this._nDataBytes,
g=8*e.sigBytes;f[g>>>5]|=128<<24-g%32;f[(g+64>>>9<<4)+15]=b;e.sigBytes=4*f.length;this._process()}});i.SHA256=e._createHelper(l);i.HmacSHA256=e._createHmacHelper(l)})(Math);
(function(){var h=CryptoJS,i=h.enc.Utf8;h.algo.HMAC=h.lib.Base.extend({init:function(e,f){e=this._hasher=e.create();"string"==typeof f&&(f=i.parse(f));var h=e.blockSize,k=4*h;f.sigBytes>k&&(f=e.finalize(f));for(var o=this._oKey=f.clone(),m=this._iKey=f.clone(),q=o.words,r=m.words,b=0;b<h;b++)q[b]^=1549556828,r[b]^=909522486;o.sigBytes=m.sigBytes=k;this.reset()},reset:function(){var e=this._hasher;e.reset();e.update(this._iKey)},update:function(e){this._hasher.update(e);return this},finalize:function(e){var f=
this._hasher,e=f.finalize(e);f.reset();return f.finalize(this._oKey.clone().concat(e))}})})();

define("CryptoJS", (function (global) {
    return function () {
        var ret, fn;
        return ret || global.CryptoJS;
    };
}(this)));

/*
 * Copyright 2008 Netflix, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* Here's some JavaScript software for implementing OAuth.

   This isn't as useful as you might hope.  OAuth is based around
   allowing tools and websites to talk to each other.  However,
   JavaScript running in web browsers is hampered by security
   restrictions that prevent code running on one website from
   accessing data stored or served on another.

   Before you start hacking, make sure you understand the limitations
   posed by cross-domain XMLHttpRequest.

   On the bright side, some platforms use JavaScript as their
   language, but enable the programmer to access other web sites.
   Examples include Google Gadgets, and Microsoft Vista Sidebar.
   For those platforms, this library should come in handy.
*/

// The HMAC-SHA1 signature method calls b64_hmac_sha1, defined by
// http://pajhome.org.uk/crypt/md5/sha1.js

/* An OAuth message is represented as an object like this:
   {method: "GET", action: "http://server.com/path", parameters: ...}

   The parameters may be either a map {name: value, name2: value2}
   or an Array of name-value pairs [[name, value], [name2, value2]].
   The latter representation is more powerful: it supports parameters
   in a specific sequence, or several parameters with the same name;
   for example [["a", 1], ["b", 2], ["a", 3]].

   Parameter names and values are NOT percent-encoded in an object.
   They must be encoded before transmission and decoded after reception.
   For example, this message object:
   {method: "GET", action: "http://server/path", parameters: {p: "x y"}}
   ... can be transmitted as an HTTP request that begins:
   GET /path?p=x%20y HTTP/1.0
   (This isn't a valid OAuth request, since it lacks a signature etc.)
   Note that the object "x y" is transmitted as x%20y.  To encode
   parameters, you can call OAuth.addToURL, OAuth.formEncode or
   OAuth.getAuthorization.

   This message object model harmonizes with the browser object model for
   input elements of an form, whose value property isn't percent encoded.
   The browser encodes each value before transmitting it. For example,
   see consumer.setInputs in example/consumer.js.
 */

/* This script needs to know what time it is. By default, it uses the local
   clock (new Date), which is apt to be inaccurate in browsers. To do
   better, you can load this script from a URL whose query string contains
   an oauth_timestamp parameter, whose value is a current Unix timestamp.
   For example, when generating the enclosing document using PHP:

   <script src="oauth.js?oauth_timestamp=<?=time()?>" ...

   Another option is to call OAuth.correctTimestamp with a Unix timestamp.
 */

var OAuth; if (OAuth == null) OAuth = {};

OAuth.setProperties = function setProperties(into, from) {
    if (into != null && from != null) {
        for (var key in from) {
            into[key] = from[key];
        }
    }
    return into;
}

OAuth.setProperties(OAuth, // utility functions
{
    percentEncode: function percentEncode(s) {
        if (s == null) {
            return "";
        }
        if (s instanceof Array) {
            var e = "";
            for (var i = 0; i < s.length; ++s) {
                if (e != "") e += '&';
                e += OAuth.percentEncode(s[i]);
            }
            return e;
        }
        s = encodeURIComponent(s);
        // Now replace the values which encodeURIComponent doesn't do
        // encodeURIComponent ignores: - _ . ! ~ * ' ( )
        // OAuth dictates the only ones you can ignore are: - _ . ~
        // Source: http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:Global_Functions:encodeURIComponent
        s = s.replace(/\!/g, "%21");
        s = s.replace(/\*/g, "%2A");
        s = s.replace(/\'/g, "%27");
        s = s.replace(/\(/g, "%28");
        s = s.replace(/\)/g, "%29");
        return s;
    }
,
    decodePercent: function decodePercent(s) {
        if (s != null) {
            // Handle application/x-www-form-urlencoded, which is defined by
            // http://www.w3.org/TR/html4/interact/forms.html#h-17.13.4.1
            s = s.replace(/\+/g, " ");
        }
        return decodeURIComponent(s);
    }
,
    /** Convert the given parameters to an Array of name-value pairs. */
    getParameterList: function getParameterList(parameters) {
        if (parameters == null) {
            return [];
        }
        if (typeof parameters != "object") {
            return OAuth.decodeForm(parameters + "");
        }
        if (parameters instanceof Array) {
            return parameters;
        }
        var list = [];
        for (var p in parameters) {
            list.push([p, parameters[p]]);
        }
        return list;
    }
,
    /** Convert the given parameters to a map from name to value. */
    getParameterMap: function getParameterMap(parameters) {
        if (parameters == null) {
            return {};
        }
        if (typeof parameters != "object") {
            return OAuth.getParameterMap(OAuth.decodeForm(parameters + ""));
        }
        if (parameters instanceof Array) {
            var map = {};
            for (var p = 0; p < parameters.length; ++p) {
                var key = parameters[p][0];
                if (map[key] === undefined) { // first value wins
                    map[key] = parameters[p][1];
                }
            }
            return map;
        }
        return parameters;
    }
,
    getParameter: function getParameter(parameters, name) {
        if (parameters instanceof Array) {
            for (var p = 0; p < parameters.length; ++p) {
                if (parameters[p][0] == name) {
                    return parameters[p][1]; // first value wins
                }
            }
        } else {
            return OAuth.getParameterMap(parameters)[name];
        }
        return null;
    }
,
    formEncode: function formEncode(parameters) {
        var form = "";
        var list = OAuth.getParameterList(parameters);
        for (var p = 0; p < list.length; ++p) {
            var value = list[p][1];
            if (value == null) value = "";
            if (form != "") form += '&';
            form += OAuth.percentEncode(list[p][0])
              +'='+ OAuth.percentEncode(value);
        }
        return form;
    }
,
    decodeForm: function decodeForm(form) {
        var list = [];
        var nvps = form.split('&');
        for (var n = 0; n < nvps.length; ++n) {
            var nvp = nvps[n];
            if (nvp == "") {
                continue;
            }
            var equals = nvp.indexOf('=');
            var name;
            var value;
            if (equals < 0) {
                name = OAuth.decodePercent(nvp);
                value = null;
            } else {
                name = OAuth.decodePercent(nvp.substring(0, equals));
                value = OAuth.decodePercent(nvp.substring(equals + 1));
            }
            list.push([name, value]);
        }
        return list;
    }
,
    setParameter: function setParameter(message, name, value) {
        var parameters = message.parameters;
        if (parameters instanceof Array) {
            for (var p = 0; p < parameters.length; ++p) {
                if (parameters[p][0] == name) {
                    if (value === undefined) {
                        parameters.splice(p, 1);
                    } else {
                        parameters[p][1] = value;
                        value = undefined;
                    }
                }
            }
            if (value !== undefined) {
                parameters.push([name, value]);
            }
        } else {
            parameters = OAuth.getParameterMap(parameters);
            parameters[name] = value;
            message.parameters = parameters;
        }
    }
,
    setParameters: function setParameters(message, parameters) {
        var list = OAuth.getParameterList(parameters);
        for (var i = 0; i < list.length; ++i) {
            OAuth.setParameter(message, list[i][0], list[i][1]);
        }
    }
,
    /** Fill in parameters to help construct a request message.
        This function doesn't fill in every parameter.
        The accessor object should be like:
        {consumerKey:'foo', consumerSecret:'bar', accessorSecret:'nurn', token:'krelm', tokenSecret:'blah'}
        The accessorSecret property is optional.
     */
    completeRequest: function completeRequest(message, accessor) {
        if (message.method == null) {
            message.method = "GET";
        }
        var map = OAuth.getParameterMap(message.parameters);
        if (map.oauth_consumer_key == null) {
            OAuth.setParameter(message, "oauth_consumer_key", accessor.consumerKey || "");
        }
        if (map.oauth_token == null && accessor.token != null) {
            OAuth.setParameter(message, "oauth_token", accessor.token);
        }
        if (map.oauth_version == null) {
            OAuth.setParameter(message, "oauth_version", "1.0");
        }
        if (map.oauth_timestamp == null) {
            OAuth.setParameter(message, "oauth_timestamp", OAuth.timestamp());
        }
        if (map.oauth_nonce == null) {
            OAuth.setParameter(message, "oauth_nonce", OAuth.nonce(6));
        }
        OAuth.SignatureMethod.sign(message, accessor);
    }
,
    setTimestampAndNonce: function setTimestampAndNonce(message) {
        OAuth.setParameter(message, "oauth_timestamp", OAuth.timestamp());
        OAuth.setParameter(message, "oauth_nonce", OAuth.nonce(6));
    }
,
    addToURL: function addToURL(url, parameters) {
        newURL = url;
        if (parameters != null) {
            var toAdd = OAuth.formEncode(parameters);
            if (toAdd.length > 0) {
                var q = url.indexOf('?');
                if (q < 0) newURL += '?';
                else       newURL += '&';
                newURL += toAdd;
            }
        }
        return newURL;
    }
,
    /** Construct the value of the Authorization header for an HTTP request. */
    getAuthorizationHeader: function getAuthorizationHeader(realm, parameters) {
        var header = 'OAuth realm="' + OAuth.percentEncode(realm) + '"';
        var list = OAuth.getParameterList(parameters);
        for (var p = 0; p < list.length; ++p) {
            var parameter = list[p];
            var name = parameter[0];
            if (name.indexOf("oauth_") == 0) {
                header += ',' + OAuth.percentEncode(name) + '="' + OAuth.percentEncode(parameter[1]) + '"';
            }
        }
        return header;
    }
,
    /** Correct the time using a parameter from the URL from which the last script was loaded. */
    correctTimestampFromSrc: function correctTimestampFromSrc(parameterName) {
        parameterName = parameterName || "oauth_timestamp";
        var scripts = document.getElementsByTagName('script');
        if (scripts == null || !scripts.length) return;
        var src = scripts[scripts.length-1].src;
        if (!src) return;
        var q = src.indexOf("?");
        if (q < 0) return;
        parameters = OAuth.getParameterMap(OAuth.decodeForm(src.substring(q+1)));
        var t = parameters[parameterName];
        if (t == null) return;
        OAuth.correctTimestamp(t);
    }
,
    /** Generate timestamps starting with the given value. */
    correctTimestamp: function correctTimestamp(timestamp) {
        OAuth.timeCorrectionMsec = (timestamp * 1000) - (new Date()).getTime();
    }
,
    /** The difference between the correct time and my clock. */
    timeCorrectionMsec: 0
,
    timestamp: function timestamp() {
        var t = (new Date()).getTime() + OAuth.timeCorrectionMsec;
        return Math.floor(t / 1000);
    }
,
    nonce: function nonce(length) {
        var chars = OAuth.nonce.CHARS;
        var result = "";
        for (var i = 0; i < length; ++i) {
            var rnum = Math.floor(Math.random() * chars.length);
            result += chars.substring(rnum, rnum+1);
        }
        return result;
    }
});

OAuth.nonce.CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";

/** Define a constructor function,
    without causing trouble to anyone who was using it as a namespace.
    That is, if parent[name] already existed and had properties,
    copy those properties into the new constructor.
 */
OAuth.declareClass = function declareClass(parent, name, newConstructor) {
    var previous = parent[name];
    parent[name] = newConstructor;
    if (newConstructor != null && previous != null) {
        for (var key in previous) {
            if (key != "prototype") {
                newConstructor[key] = previous[key];
            }
        }
    }
    return newConstructor;
}

/** An abstract algorithm for signing messages. */
OAuth.declareClass(OAuth, "SignatureMethod", function OAuthSignatureMethod(){});

OAuth.setProperties(OAuth.SignatureMethod.prototype, // instance members
{
    /** Add a signature to the message. */
    sign: function sign(message) {
        var baseString = OAuth.SignatureMethod.getBaseString(message);
        var signature = this.getSignature(baseString);
        OAuth.setParameter(message, "oauth_signature", signature);
        return signature; // just in case someone's interested
    }
,
    /** Set the key string for signing. */
    initialize: function initialize(name, accessor) {
        var consumerSecret;
        if (accessor.accessorSecret != null
            && name.length > 9
            && name.substring(name.length-9) == "-Accessor")
        {
            consumerSecret = accessor.accessorSecret;
        } else {
            consumerSecret = accessor.consumerSecret;
        }
        this.key = OAuth.percentEncode(consumerSecret)
             +"&"+ OAuth.percentEncode(accessor.tokenSecret);
    }
});

/* SignatureMethod expects an accessor object to be like this:
   {tokenSecret: "lakjsdflkj...", consumerSecret: "QOUEWRI..", accessorSecret: "xcmvzc..."}
   The accessorSecret property is optional.
 */
// Class members:
OAuth.setProperties(OAuth.SignatureMethod, // class members
{
    sign: function sign(message, accessor) {
        var name = OAuth.getParameterMap(message.parameters).oauth_signature_method;
        if (name == null || name == "") {
            name = "HMAC-SHA1";
            OAuth.setParameter(message, "oauth_signature_method", name);
        }
        OAuth.SignatureMethod.newMethod(name, accessor).sign(message);
    }
,
    /** Instantiate a SignatureMethod for the given method name. */
    newMethod: function newMethod(name, accessor) {
        var impl = OAuth.SignatureMethod.REGISTERED[name];
        if (impl != null) {
            var method = new impl();
            method.initialize(name, accessor);
            return method;
        }
        var err = new Error("signature_method_rejected");
        var acceptable = "";
        for (var r in OAuth.SignatureMethod.REGISTERED) {
            if (acceptable != "") acceptable += '&';
            acceptable += OAuth.percentEncode(r);
        }
        err.oauth_acceptable_signature_methods = acceptable;
        throw err;
    }
,
    /** A map from signature method name to constructor. */
    REGISTERED : {}
,
    /** Subsequently, the given constructor will be used for the named methods.
        The constructor will be called with no parameters.
        The resulting object should usually implement getSignature(baseString).
        You can easily define such a constructor by calling makeSubclass, below.
     */
    registerMethodClass: function registerMethodClass(names, classConstructor) {
        for (var n = 0; n < names.length; ++n) {
            OAuth.SignatureMethod.REGISTERED[names[n]] = classConstructor;
        }
    }
,
    /** Create a subclass of OAuth.SignatureMethod, with the given getSignature function. */
    makeSubclass: function makeSubclass(getSignatureFunction) {
        var superClass = OAuth.SignatureMethod;
        var subClass = function() {
            superClass.call(this);
        };
        subClass.prototype = new superClass();
        // Delete instance variables from prototype:
        // delete subclass.prototype... There aren't any.
        subClass.prototype.getSignature = getSignatureFunction;
        subClass.prototype.constructor = subClass;
        return subClass;
    }
,
    getBaseString: function getBaseString(message) {
        var URL = message.action;
        var q = URL.indexOf('?');
        var parameters;
        if (q < 0) {
            parameters = message.parameters;
        } else {
            // Combine the URL query string with the other parameters:
            parameters = OAuth.decodeForm(URL.substring(q + 1));
            var toAdd = OAuth.getParameterList(message.parameters);
            for (var a = 0; a < toAdd.length; ++a) {
                parameters.push(toAdd[a]);
            }
        }
        return OAuth.percentEncode(message.method.toUpperCase())
         +'&'+ OAuth.percentEncode(OAuth.SignatureMethod.normalizeUrl(URL))
         +'&'+ OAuth.percentEncode(OAuth.SignatureMethod.normalizeParameters(parameters));
    }
,
    normalizeUrl: function normalizeUrl(url) {
        var uri = OAuth.SignatureMethod.parseUri(url);
        var scheme = uri.protocol.toLowerCase();
        var authority = uri.authority.toLowerCase();
        var dropPort = (scheme == "http" && uri.port == 80)
                    || (scheme == "https" && uri.port == 443);
        if (dropPort) {
            // find the last : in the authority
            var index = authority.lastIndexOf(":");
            if (index >= 0) {
                authority = authority.substring(0, index);
            }
        }
        var path = uri.path;
        if (!path) {
            path = "/"; // conforms to RFC 2616 section 3.2.2
        }
        // we know that there is no query and no fragment here.
        return scheme + "://" + authority + path;
    }
,
    parseUri: function parseUri (str) {
        /* This function was adapted from parseUri 1.2.1
           http://stevenlevithan.com/demo/parseuri/js/assets/parseuri.js
         */
        var o = {key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
                 parser: {strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@\/]*):?([^:@\/]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/ }};
        var m = o.parser.strict.exec(str);
        var uri = {};
        var i = 14;
        while (i--) uri[o.key[i]] = m[i] || "";
        return uri;
    }
,
    normalizeParameters: function normalizeParameters(parameters) {
        if (parameters == null) {
            return "";
        }
        var list = OAuth.getParameterList(parameters);
        var sortable = [];
        for (var p = 0; p < list.length; ++p) {
            var nvp = list[p];
            if (nvp[0] != "oauth_signature") {
                sortable.push([ OAuth.percentEncode(nvp[0])
                              + " " // because it comes before any character that can appear in a percentEncoded string.
                              + OAuth.percentEncode(nvp[1])
                              , nvp]);
            }
        }
        sortable.sort(function(a,b) {
                          if (a[0] < b[0]) return  -1;
                          if (a[0] > b[0]) return 1;
                          return 0;
                      });
        var sorted = [];
        for (var s = 0; s < sortable.length; ++s) {
            sorted.push(sortable[s][1]);
        }
        return OAuth.formEncode(sorted);
    }
});

OAuth.SignatureMethod.registerMethodClass(["PLAINTEXT", "PLAINTEXT-Accessor"],
    OAuth.SignatureMethod.makeSubclass(
        function getSignature(baseString) {
            return this.key;
        }
    ));

OAuth.SignatureMethod.registerMethodClass(["HMAC-SHA1", "HMAC-SHA1-Accessor"],
    OAuth.SignatureMethod.makeSubclass(
        function getSignature(baseString) {
            b64pad = '=';
            var signature = b64_hmac_sha1(this.key, baseString);
            return signature;
        }
    ));

try {
    OAuth.correctTimestampFromSrc();
} catch(e) {
}
;
define("OAuth", (function (global) {
    return function () {
        var ret, fn;
        return ret || global.OAuth;
    };
}(this)));

/*global console:true, define:false, feedLogger:false */

/**
 * Console wrapper.
 *
 * Originally from 
 *
 *   https://github.com/cpatik/console.log-wrapper
 *
 * by Craig Patik
 *
 * MIT License ----
 *
 * Copyright (c) 2012 Craig Patik
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 **/

define('feed/log',[],function() {
  // allow external code to swap in their own logger
  if (typeof feedLogger === 'function') {
    return feedLogger;
  }

  // Tell IE9 to use its built-in console
  if (Function.prototype.bind && (typeof console === 'object' || typeof console === 'function') && typeof console.log === 'object') {
    var fields = ['log','info','warn','error','assert','dir','clear','profile','profileEnd'];
    for (var x = 0; x < fields.length; x++) {
      var method = fields[x];

      console[method] = Function.prototype.bind.call(console, console[method]);
    }
  }

  // log() -- The complete, cross-browser (we don't judge!) console.log wrapper for his or her logging pleasure
  var log = function () {
    log.history = log.history || [];  // store logs to an array for reference
    log.history.push(arguments);
    // Modern browsers
    if (typeof console !== 'undefined' && typeof console.log === 'function') { // Opera 11
      if (window.opera) {
        var i = 0;
        while (i < arguments.length) {
          console.log('Item ' + (i+1) + ': ' + arguments[i]);
          i++;
        }
      }

      // All other modern browsers
      else if ((Array.prototype.slice.call(arguments)).length === 1 && typeof Array.prototype.slice.call(arguments)[0] === 'string') {
        console.log( (Array.prototype.slice.call(arguments)).toString() );
      }
      else {
        console.log.apply( console, Array.prototype.slice.call(arguments) );
      }

    }

    // IE8
    else if (!Function.prototype.bind && typeof console !== 'undefined' && typeof console.log === 'object') {
      Function.prototype.call.call(console.log, console, Array.prototype.slice.call(arguments));
    }

    // IE7 and lower, and other old browsers
    else {
      // Inject Firebug lite
      if (!document.getElementById('firebug-lite')) {
        // Include the script
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.id = 'firebug-lite';
        // If you run the script locally, point to /path/to/firebug-lite/build/firebug-lite.js
        script.src = 'https://getfirebug.com/firebug-lite.js';
        // If you want to expand the console window by default, uncomment this line
        //document.getElementsByTagName('HTML')[0].setAttribute('debug','true');
        document.getElementsByTagName('HEAD')[0].appendChild(script);
        setTimeout(function () { log( Array.prototype.slice.call(arguments) ); }, 2000);
      }
      else {
        // FBL was included but it hasn't finished loading yet, so try again momentarily
        setTimeout(function () { log( Array.prototype.slice.call(arguments) ); }, 500);
      }
    }
  };

  return log;

});


/*global define:false */

/*
 *  Events mixin from Backbone 
 *
 *  Backbone.js 1.0.0
 *
 *  (c) 2010-2013 Jeremy Ashkenas, DocumentCloud Inc.
 *  Backbone may be freely distributed under the MIT license.
 *  For all details and documentation:
 *  http:*backbonejs.org
 *
 *  A module that can be mixed in to *any object* in order to provide it with
 *  custom events. You may bind with `on` or remove with `off` callback functions
 *  to an event; trigger`-ing an event fires all callbacks in succession.
 *
 *  var object = {};
 *  _.extend(object, Backbone.Events);
 *  object.on('expand', function(){ alert('expanded'); });
 *  object.trigger('expand');
 */

define('feed/events',[ 'underscore' ], function(_) {
  var slice = Array.prototype.slice;

  var Events = {

    // Bind an event to a `callback` function. Passing `"all"` will bind
    // the callback to all events fired.
    on: function(name, callback, context) {
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) { return this; }
      if (!this._events) { this._events = {}; }
      var events = this._events[name] || (this._events[name] = []);
      events.push({callback: callback, context: context, ctx: context || this});
      return this;
    },

    // Bind an event to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    once: function(name, callback, context) {
      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) { return this; }
      var self = this;
      var once = _.once(function() {
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
    off: function(name, callback, context) {
      var retain, ev, events, names, i, l, j, k;
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) { return this; }
      if (!name && !callback && !context) {
        this._events = {};
        return this;
      }

      names = name ? [name] : _.keys(this._events);
      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        if (events = this._events[name]) {
          this._events[name] = retain = [];
          if (callback || context) {
            for (j = 0, k = events.length; j < k; j++) {
              ev = events[j];
              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                  (context && context !== ev.context)) {
                retain.push(ev);
              }
            }
          }
          if (!retain.length) { delete this._events[name]; }
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(name) {
      if (!this._events) { return this; }
      var args = slice.call(arguments, 1);
      if (!eventsApi(this, 'trigger', name, args)) { return this; }
      var events = this._events[name];
      var allEvents = this._events.all;
      if (events) { triggerEvents(events, args); }
      if (allEvents) { triggerEvents(allEvents, arguments); }
      return this;
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function(obj, name, callback) {
      var listeners = this._listeners;
      if (!listeners) { return this; }
      var deleteListener = !name && !callback;
      if (typeof name === 'object') { callback = this; }
      if (obj) { (listeners = {})[obj._listenerId] = obj; }
      /*jshint forin:false */
      for (var id in listeners) {
        listeners[id].off(name, callback, this);
        if (deleteListener) { delete this._listeners[id]; }
      }
      return this;
    }

  };

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  var eventsApi = function(obj, action, name, rest) {
    if (!name) { return true; }

    // Handle event maps.
    if (typeof name === 'object') {
      /*jshint forin:false */
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
      return false;
    }

    // Handle space separated event names.
    if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);
      for (var i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
      return false;
    }

    return true;
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0: while (++i < l) { (ev = events[i]).callback.call(ev.ctx); } return;
      case 1: while (++i < l) { (ev = events[i]).callback.call(ev.ctx, a1); } return;
      case 2: while (++i < l) { (ev = events[i]).callback.call(ev.ctx, a1, a2); } return;
      case 3: while (++i < l) { (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); } return;
      default: while (++i < l) { (ev = events[i]).callback.apply(ev.ctx, args); }
    }
  };

  var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

  // Inversion-of-control versions of `on` and `once`. Tell *this* object to
  // listen to an event in another object ... keeping track of what it's
  // listening to.
  _.each(listenMethods, function(implementation, method) {
    Events[method] = function(obj, name, callback) {
      var listeners = this._listeners || (this._listeners = {});
      var id = obj._listenerId || (obj._listenerId = _.uniqueId('l'));
      listeners[id] = obj;
      if (typeof name === 'object') { callback = this; }
      obj[implementation](name, callback, this);
      return this;
    };
  });

  return Events;

});


/*global define:false */

define('feed/util',[],function() {

  var util = { };

  util.addProtocol = function(url, secure) {
    // handle '//somewhere.com/' url's
    if (url.slice(0, 2) === '//') {
      if (secure === true) {
        url = 'https:' + url;

      } else if (secure === false) {
        url = 'http:' + url;
      
      } else {
        url = window.location.protocol + url;
      }
    }
    
    return url;
  };

  return util;

});

/*!
 * jQuery Cookie Plugin v1.3.1
 * https://github.com/carhartl/jquery-cookie
 *
 * Copyright 2013 Klaus Hartl
 * Released under the MIT license
 */
(function (factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as anonymous module.
		define('jquery.cookie',['jquery'], factory);
	} else {
		// Browser globals.
		factory(jQuery);
	}
}(function ($) {

	var pluses = /\+/g;

	function raw(s) {
		return s;
	}

	function decoded(s) {
		return decodeURIComponent(s.replace(pluses, ' '));
	}

	function converted(s) {
		if (s.indexOf('"') === 0) {
			// This is a quoted cookie as according to RFC2068, unescape
			s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
		}
		try {
			return config.json ? JSON.parse(s) : s;
		} catch(er) {}
	}

	var config = $.cookie = function (key, value, options) {

		// write
		if (value !== undefined) {
			options = $.extend({}, config.defaults, options);

			if (typeof options.expires === 'number') {
				var days = options.expires, t = options.expires = new Date();
				t.setDate(t.getDate() + days);
			}

			value = config.json ? JSON.stringify(value) : String(value);

			return (document.cookie = [
				config.raw ? key : encodeURIComponent(key),
				'=',
				config.raw ? value : encodeURIComponent(value),
				options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
				options.path    ? '; path=' + options.path : '',
				options.domain  ? '; domain=' + options.domain : '',
				options.secure  ? '; secure' : ''
			].join(''));
		}

		// read
		var decode = config.raw ? raw : decoded;
		var cookies = document.cookie.split('; ');
		var result = key ? undefined : {};
		for (var i = 0, l = cookies.length; i < l; i++) {
			var parts = cookies[i].split('=');
			var name = decode(parts.shift());
			var cookie = decode(parts.join('='));

			if (key && key === name) {
				result = converted(cookie);
				break;
			}

			if (!key) {
				result[name] = converted(cookie);
			}
		}

		return result;
	};

	config.defaults = {};

	$.removeCookie = function (key, options) {
		if ($.cookie(key) !== undefined) {
			$.cookie(key, '', $.extend(options, { expires: -1 }));
			return true;
		}
		return false;
	};

}));

/*
CryptoJS v3.0.2
code.google.com/p/crypto-js
(c) 2009-2012 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
(function () {
    // Shortcuts
    var C = CryptoJS;
    var C_lib = C.lib;
    var WordArray = C_lib.WordArray;
    var C_enc = C.enc;

    /**
     * Base64 encoding strategy.
     */
    var Base64 = C_enc.Base64 = {
        /**
         * Converts a word array to a Base64 string.
         *
         * @param {WordArray} wordArray The word array.
         *
         * @return {string} The Base64 string.
         *
         * @static
         *
         * @example
         *
         *     var base64String = CryptoJS.enc.Base64.stringify(wordArray);
         */
        stringify: function (wordArray) {
            // Shortcuts
            var words = wordArray.words;
            var sigBytes = wordArray.sigBytes;
            var map = this._map;

            // Clamp excess bits
            wordArray.clamp();

            // Convert
            var base64Chars = [];
            for (var i = 0; i < sigBytes; i += 3) {
                var byte1 = (words[i >>> 2]       >>> (24 - (i % 4) * 8))       & 0xff;
                var byte2 = (words[(i + 1) >>> 2] >>> (24 - ((i + 1) % 4) * 8)) & 0xff;
                var byte3 = (words[(i + 2) >>> 2] >>> (24 - ((i + 2) % 4) * 8)) & 0xff;

                var triplet = (byte1 << 16) | (byte2 << 8) | byte3;

                for (var j = 0; (j < 4) && (i + j * 0.75 < sigBytes); j++) {
                    base64Chars.push(map.charAt((triplet >>> (6 * (3 - j))) & 0x3f));
                }
            }

            // Add padding
            var paddingChar = map.charAt(64);
            if (paddingChar) {
                while (base64Chars.length % 4) {
                    base64Chars.push(paddingChar);
                }
            }

            return base64Chars.join('');
        },

        /**
         * Converts a Base64 string to a word array.
         *
         * @param {string} base64Str The Base64 string.
         *
         * @return {WordArray} The word array.
         *
         * @static
         *
         * @example
         *
         *     var wordArray = CryptoJS.enc.Base64.parse(base64String);
         */
        parse: function (base64Str) {
            // Ignore whitespaces
            base64Str = base64Str.replace(/\s/g, '');

            // Shortcuts
            var base64StrLength = base64Str.length;
            var map = this._map;

            // Ignore padding
            var paddingChar = map.charAt(64);
            if (paddingChar) {
                var paddingIndex = base64Str.indexOf(paddingChar);
                if (paddingIndex != -1) {
                    base64StrLength = paddingIndex;
                }
            }

            // Convert
            var words = [];
            var nBytes = 0;
            for (var i = 0; i < base64StrLength; i++) {
                if (i % 4) {
                    var bitsHigh = map.indexOf(base64Str.charAt(i - 1)) << ((i % 4) * 2);
                    var bitsLow  = map.indexOf(base64Str.charAt(i)) >>> (6 - (i % 4) * 2);
                    words[nBytes >>> 2] |= (bitsHigh | bitsLow) << (24 - (nBytes % 4) * 8);
                    nBytes++;
                }
            }

            return WordArray.create(words, nBytes);
        },

        _map: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
    };
}());

define("enc-base64", function(){});

/*global define:false */
/*jshint camelcase:false */

/*
 *  Feed Media Session API
 *
 *  This manages all communication with the server and is the single point
 *  of truth for a client to manage what is actively being played. It
 *  should be created with:
 *
 *  var session = new Feed.Session(token, secret[, options]);
 *
 *  Then you attach event listeners to the session:
 *
 *  session.on('play-active', someHandler);
 *
 *  Then you can optionally set a placement and a station:
 *
 *  session.setPlacementId(placementId);
 *  session.setStationId(stationId);
 *
 *  If any of the above calls are made while we're actively tuning (we've
 *  got an active song or a pending song), then any currently active song
 *  will be marked as 'completed' and a new song will be requested from
 *  the server.
 *
 *  Then you tell the session to start maintaining a queue of 
 *  music to play:
 *
 *  session.tune();
 *
 *  The session will now emit the following events:
 *
 *  not-in-us: if feed can't determine that the user is in the US, then
 *    the user won't be allowed to play any music. This check is made
 *    every time we try to retrieve a song. Once you get this event, you
 *    should assume nothing further will work.
 *  invalid-credentials: the token and secret passed to this function
 *    are not valid.
 *  placement: after we tune in to a placement or station,
 *    this passes on information about the placement we
 *    tuned in to.
 *  stations: after tuning to a specific placement, the server returns a
 *    list of available stations. This is that list.
 *  station-changed: emitted after a 'setStation' call, and passed the
 *    ID of the station
 *  placement-changed: emitted after a 'setPlacement' call, and passed the
 *    ID of the placement
 *  play-active: when the session has a play ready for playback
 *  play-started: when the active play has started playback (as
 *    a result of a call to reportPlayStarted)
 *  play-completed: when the session has successfully told the server
 *    that the current play has completed, been skipped (after a 
 *    call to reportPlayCompleted), or been invalidated
 *  skip-denied: when the session has been told by the server that the
 *    skip cannot be performed (after a call to requestSkip)
 *  plays-exhausted: when the server can find no more music in the
 *    current station that satisfies DMCA constraints (this will
 *    be either the first event after a 'tune' call, or after a
 *    play-completed event). The client must make another call to
 *    tune() to begin pulling in more music.
 *
 *  Clients that use the session object should tell the session about
 *  the status of the current play as it progresses:
 *
 *  session.reportPlayStarted(): tell the server we have begun playback of the
 *    current song to the end user.
 *  session.reportPlayElapsed(seconds): tell the server how many elapsed seconds
 *    of the song have been played since it started.
 *  session.reportPlayCompleted(): tell the server that we have completed 
 *    playing the current song. This will cause the session object
 *    to emit a 'play-completed' event followed by a 'play-active' when
 *    the next song is ready for playback
 *
 *  session.requestSkip(): ask the server if we can skip playback of the current
 *    song. If the skip is denied, a 'skip-denied' event will be triggered,
 *    otherwise a 'play-completed' will be triggered.
 *  session.requestInvalidate(): tell the server that we're unable to play the
 *    current song for some reason, and the server should stop playback
 *    of the song (if started) and give us a new song. The session will
 *    trigger a 'play-completed' event after this call.
 *
 *  Data held by the session can be retrieved with:
 *
 *  session.getActivePlay(): returns the currently active play, if any, or null
 *  session.isTuned(): true if the session has active plays available or is awaiting
 *    plays from the server
 *  session.hasActivePlayStarted(): returns true if the active play is playing now
 *  session.maybeCanSkip(): returns true if there is a song being played now and 
 *    we believe we can skip it (this might not hold true, and the server can
 *    override this)
 *
 *  Other misc calls:
 *  
 *  session.likePlay(), session.unlikePlay(), session.dislikePlay(): like handling
 *  session.setFormats(formats): comma separated list of audio formats to 
 *                               request, i.e.: 'mp3', 'aac', 'aac,mp3'. Defaults to
 *                               'mp3,aac'
 *
 *  The optional 'options' argument passed to the constructor can have the following
 *  attributes:
 *
 *    secure: if true, the default URLs for accessing the feed API will be
 *       over 'https' rather than 'http' (the default).
 *    baseUrl: defines the base host that responds to API calls - defaults
 *       to '//feed.fm'. Really only used with local testing.
 */

define('feed/session',[ 'underscore', 'jquery', 'CryptoJS', 'OAuth', 'feed/log', 'feed/events', 'feed/util', 'jquery.cookie', 'enc-base64' ], function(_, $, CryptoJS, OAuth, log, Events, util) {

  // use SHA256 for encryption
  OAuth.SignatureMethod.registerMethodClass(['HMAC-SHA256', 'HMAC-SHA256-Accessor'],
    OAuth.SignatureMethod.makeSubclass(
      function getSignature(baseString) {
        var hash = CryptoJS.HmacSHA256(baseString, this.key);
        var signature = hash.toString(CryptoJS.enc.Base64);

        return signature;
      }
    ));

  var Session = function(token, secret, options) {
    options = options || { };

    this.config = {
      // token
      // secret
      // placementId
      // placement
      // stationId
      // stations
      // clientId
      baseUrl: util.addProtocol(options.baseUrl || '//feed.fm', options.secure),
      formats: 'mp3,aac',
      maxBitrate: 128,
      timeOffset: 0,

      // Represent the active 'play' or null if there is no active play. This should
      // only be null before the first tune() call or after the server tells us there
      // is no more music available.
      current: null, /* {
                          play:  play object we're currently playing
                          started: defaults to false
                          canSkip: defaults to false
                          retryCount: number of times we've tried to tell server we started this
                         }, */

      // Details of any 'POST /play' request we're awaiting a response for. If this
      // is null, then we're not waiting for the server to give us a play
      pendingRequest: null, /* {
                                 ajax:       form data we sent to request a play, copied
                                             here so we can retry it if it fails
                                 retryCount: number of times we've retried 
                               }, */
      
      // Once a play has been created and then started, the server will let us
      // create a new play. This holds a reference to the next play that will
      // be active on completion of the current play
      pendingPlay: null // play object we'll start upon completion of current
                        //   sound 
    };

    _.extend(this, Events);

    if (token && secret) {
      this.setCredentials(token, secret);
    }
  };

  Session.prototype.setBaseUrl = function(baseUrl) {
    this.config.baseUrl = util.addProtocol(baseUrl);
  };

  Session.prototype.setCredentials = function(token, secret) {
    this.config.token = token;
    this.config.secret = secret;
  };

  Session.prototype._synchronizeClock = function() {
    var self = this;

    this._ajax({
      url: this.config.baseUrl + '/api/v2/oauth/time',
      type: 'GET'
    }).then(function(response) {
      if (response && response.success) {
        var serverTime = response.result,
            localTime = (Date.now() / 1000);

        self.config.timeSkew = serverTime - localTime;
      }

    }).fail(function() {
      log('clock synchronization failed');
    });
  };

  Session.prototype.setPlacementId = function(placementId) {
    this.config.placementId = placementId;
    this.trigger('placement-changed', placementId);

    this._retune();
  };

  Session.prototype.setStationId = function(stationId) {
    this.config.stationId = stationId;
    this.trigger('station-changed', stationId);

    this._retune();
  };

  Session.prototype.setFormats = function(formats) {
    this.config.formats = formats;

    this._retune();
  };

  Session.prototype.setMaxBitrate = function(maxBitrate) {
    this.config.maxBitrate = maxBitrate;
  };

  // tune
  Session.prototype.tune = function() {
    if (!this.config.token) {
      throw new Error('no token set with setCredentials()');
    }

    if (!this.config.secret) {
      throw new Error('no secret set with setCredentials()');
    }

    // abort any pending requests or plays
    this.config.pendingRequest = null;
    this.config.pendingPlay = null;

    // stop playback of any current song, and set
    // the status to waiting
    this._assignCurrentPlay(null, true);

    // pull information in about the placement, followed by
    // a request for the next play
    if (!this.config.placementId) {
      this._getDefaultPlacementInformation();
    } else {
      this._getPlacementInformation();
    }
  };

  // _getDefaultPlacementInformation
  Session.prototype._getDefaultPlacementInformation = function(delay) {
    var self = this;

    if (this.config.placementId && this.config.placement && (this.config.placement.id === this.config.placementId)) {
      // already have placement info
      return;
    }

    var ajax = { 
      url: self.config.baseUrl + '/api/v2/placement',
      type: 'GET',
      dataType: 'json',
      timeout: 6000
    };

    // request placement info from server
    log('requesting default placement information from server');
    self._signedAjax(ajax)
      .done(_.bind(self._receiveDefaultPlacementInformation, self))
      .fail(_.bind(self._failedDefaultPlacementInformation, self, delay));
  };

  Session.prototype._receiveDefaultPlacementInformation = function(placementInformation) {
    if (placementInformation && placementInformation.success && placementInformation.placement) {
      this.config.placement = placementInformation.placement;
      this.config.stations = placementInformation.stations;

      this.config.placementId = placementInformation.placement.id;
      this.trigger('placement-changed', this.config.placementId);

      this.trigger('placement', placementInformation.placement);

      if (!('stationId' in this.config) && (placementInformation.stations.length > 0)) {
        this.config.stationId = placementInformation.stations[0].id;
        this.trigger('station-changed', this.config.stationId);
      }

      this.trigger('stations', placementInformation.stations);

      // kick off request for next play
      this._requestNextPlay();
    }
  };

  Session.prototype._failedDefaultPlacementInformation = function(delay, response) {
    if (response.status === 401) {
      try {
        var fullResponse = $.parseJSON(response.responseText);
        if (fullResponse.error && fullResponse.error.code === 5) {
          this.trigger('invalid-credentials');
          return;
        }
      } catch (e) {
        // ignore
      }
    }

    // otherwise, try again in a bit
    delay = delay ? (delay * 2) : 500;
    _.delay(_.bind(this._getDefaultPlacementInformation, this, delay), delay);
  };

  // _getPlacementInformation
  Session.prototype._getPlacementInformation = function(delay) {
    var self = this;

    if (!this.config.placementId) {
      throw new Error('no placementId set');
    }

    if (this.config.placement && (this.config.placement.id === this.config.placementId)) {
      // already have placement info
      // kick off request for next play
      this._requestNextPlay();
      return;
    }

    var ajax = { 
      url: self.config.baseUrl + '/api/v2/placement/' + self.config.placementId,
      type: 'GET',
      dataType: 'json',
      timeout: 6000
    };

    // request placement info from server
    log('requesting placement information from server');
    self._signedAjax(ajax)
      .done(_.bind(self._receivePlacementInformation, self))
      .fail(_.bind(self._failedPlacementInformation, self, delay, ajax));
  };

  Session.prototype._receivePlacementInformation = function(placementInformation) {
    if (placementInformation && placementInformation.success && placementInformation.placement) {
      this.config.placement = placementInformation.placement;
      this.config.stations = placementInformation.stations;

      this.trigger('placement', placementInformation.placement);

      if (!('stationId' in this.config) && (placementInformation.stations.length > 0)) {
        this.config.stationId = placementInformation.stations[0].id;
        this.trigger('station-changed', this.config.stationId);
      }

      this.trigger('stations', placementInformation.stations);

      // kick off request for next play
      this._requestNextPlay();
    }
  };

  Session.prototype._failedPlacementInformation = function(delay) {
    delay = delay ? (delay * 2) : 500;
    _.delay(_.bind(this._getPlacementInformation, this, delay), delay);
  };

  Session.prototype.getActivePlacement = function() {
    if (this.config.placement) {
      return this.config.placement;
    } else {
      return null;
    }
  };

  Session.prototype.getActivePlay = function() { 
    if (this.config.current) {
      return this.config.current.play;
    } else {
      return null;
    }
  };

  Session.prototype.isTuned = function() {
    return this.config.current || this.config.pendingRequest;
  };

  Session.prototype.hasActivePlayStarted = function() {
    return this.config.current && this.config.current.started;
  };

  // re-tune
  Session.prototype._retune = function() {
    // if we're not actively playing anything, nothing needs to be sent
    if (!this.isTuned()) {
      return;
    }

    this.tune();
  };

  Session.prototype.reportPlayStarted = function() {
    if (!this.config.current) {
      throw new Error('attempt to report a play started, but there is no active play');
    }

    this._startPlay(this.config.current.play);
  };

  Session.prototype.reportPlayElapsed = function(seconds) {
    if (!this.config.current) {
      throw new Error('attempt to report elapsed play time, but the play hasn\'t started');
    }

    this._signedAjax({
      url: this.config.baseUrl + '/api/v2/play/' + this.config.current.play.id + '/elapse', 
      type: 'POST',
      data: {
        seconds: seconds
      }
    });
  };

  Session.prototype.reportPlayCompleted = function() {
    var self = this;

    if (this.config.current && (this.config.current.started)) {
      this._signedAjax({
        url: this.config.baseUrl + '/api/v2/play/' + this.config.current.play.id + '/complete',
        type: 'POST'

      }).always(_.bind(self._receivePlayCompleted, self));

    } else {
      log('finish on non-active or playing song');
      throw new Error('no active or playing song');
    }
  };

  Session.prototype._receivePlayCompleted = function() {
    if (!this.config.pendingRequest) {
      log('song finished, and no outstanding request, so playing pendingPlay');
      // if we're not waiting for an incoming request, then we must
      // have the next play queued up, so play it:
      var pendingPlay = this.config.pendingPlay;
      this.config.pendingPlay = null;

      this._assignCurrentPlay(pendingPlay);

    } else {
      log('song finished, but we\'re still waiting for next one to return');

      // we're waiting for a request to come in, so kill the current
      // song and announce that we're waiting
      this._assignCurrentPlay(null, true);
    }
  };

  Session.prototype.requestSkip = function() {
    if (!this.config.current) {
      throw new Error('No song being played');
    }

    if (!this.config.current.started) {
      throw new Error('No song has been started');
    }

    if (!this.config.current.canSkip) {
      this.trigger('skip-denied');
      return;
    }

    this._signedAjax({
      url: this.config.baseUrl + '/api/v2/play/' + this.config.current.play.id + '/skip',
      type: 'POST'
    })
      .done(_.bind(this._receiveSkip, this, this.config.current.play))
      .fail(_.bind(this._failSkip, this, this.config.current.play));
  };

  Session.prototype.requestInvalidate = function() {
    if (!this.config.current) {
      throw new Error('No active song to invalidate!');
    }

    this._sendInvalidate(this.config.current.play);
  };

  Session.prototype._sendInvalidate = function(play, delay) {
    this._signedAjax({
      url: this.config.baseUrl + '/api/v2/play/' + play.id + '/invalidate',
      type: 'POST'
    })
      .done(_.bind(this._receiveInvalidate, this, play))
      .fail(_.bind(this._failInvalidate, this, delay, play));
  };

  Session.prototype._failInvalidate = function(delay, play, response) {
    var self = this;

    delay = (delay ? delay * 2 : 200);

    if (delay < 3000) {
      _.delay(function() {
        self._sendInvalidate(play);
      }, delay);

    } else {
      log('gave up trying to invalidate play', response);

    }
  };

  Session.prototype._receiveInvalidate = function(play, response) {
    if (!this.config.current || (this.config.current.play !== play)) {
      // not holding this song any more - just ignore it
      return;
    }

    if (!response.success) {
      log('failed invalidate! - technically this is impossible');
      return;
    }

    if (this.config.pendingPlay) {
      log('invalidating to song already queued up');
      // skip to play already queued up
      var pendingPlay = this.config.pendingPlay;
      this.config.pendingPlay = null;
      this._assignCurrentPlay(pendingPlay);

    } else {
      log('invalidating current song');
      this._assignCurrentPlay(null, true);
    
      if (!this.config.pendingRequest) {
        log('queueing up new song');
        this._requestNextPlay();

      }
    }
  };

  Session.prototype._failSkip = function(play) {
    if (!this.config.current || (this.config.current.play !== play)) {
      // not playing this song any more - just ignore it
      return;
    }
    // technically the skip wasn't denied - we just couldn't confirm wether
    // it was ok, but this is the best we can return at the moment
    this.trigger('skip-denied');
  };

  Session.prototype._receiveSkip = function(play, response) {
    if (!this.config.current || (this.config.current.play !== play)) {
      // not playing this song any more - just ignore it
      return;
    }

    if (!response.success) {
      log('failed skip!');
      this.trigger('skip-denied');
      return;
    }

    if (this.config.pendingPlay) {
      log('skipping to song already queued up');
      // skip to play already queued up
      var pendingPlay = this.config.pendingPlay;
      this.config.pendingPlay = null;
      this._assignCurrentPlay(pendingPlay);

    } else if (this.config.pendingRequest) {
      log('skipping to what is queued up');
      // we're waiting for a request - so just wait for that to show up
      this._assignCurrentPlay(null, true);

    } else {
      log('skipping to what is queued up');
      // nothing queued up and nothing being requested - we're outta music!
      this._assignCurrentPlay(null);

    }
  };

  Session.prototype._startPlay = function(play) {
    if (this.config.current.retryCount > 2) {
      // fuck it - let the user hear the song
      this._receiveStartPlay(play, { success: true, can_skip: true });

    } else {
      log('telling server we\'re starting the play', play);

      // tell the server that we're going to start this song
      this._signedAjax({
        url: this.config.baseUrl + '/api/v2/play/' + play.id + '/start',
        type: 'POST',
        dataType: 'json',
        timeout: 3000
      })
        .done(_.bind(this._receiveStartPlay, this, play))
        .fail(_.bind(this._failStartPlay, this, play));
    }
  };

  Session.prototype._receiveStartPlay = function(play, response) {
    if (response.success) {

      if (this.config.current && (this.config.current.play === play)) {
        this.config.current.canSkip = response.can_skip;
        this.config.current.started = true;

        this.trigger('play-started', play);

        // since we're ok to start this song, we can start looking for the
        // next song
        this._requestNextPlay();

      } else {
        log('received start play, but not waiting any more');
      }

    } else {
      log('received failed start success');
    }
  };

  Session.prototype._failStartPlay = function(play, response) {
    // only process if we're still actually waiting for this
    if (this.config.current && (this.config.current.play === play)) {

      if (response.status === 403) {
        try {
          var fullResponse = $.parseJSON(response.responseText);

          if (fullResponse.error && fullResponse.error.code === 20) {
            // we seem to have missed the response to the original start, so
            // let's assume the start was good and the song is skippable
            return this._receiveStartPlay(play, { success: true, can_skip: true });
          }
        } catch (e) {
          // ignore
          log('unable to parse start play response', e.message);
        }
      }

      log('request failed - trying again in 1 second', response.status);

      this.config.current.retryCount++;

      // wait a second and try again
      _.delay(_.bind(this._startPlay, this, play), 1000);

    } else {
      log('startPlay failed, but we don\'t care any more');
    }
  };

  // start playing the given song
  Session.prototype._assignCurrentPlay = function(play, waitingIfEmpty) {
    // remove any existing play
    if (this.config.current) {
      this.trigger('play-completed', this.config.current.play);
      this.config.current = null;
    }
    if (play === null) {
      // nothing to play right now

      if (waitingIfEmpty) {
        //this.config.status = 'waiting';
        log('nothing to play... waiting');

      } else {
        //this.config.status = 'idle';
        log('nothing to play from the current station');
        this.trigger('plays-exhausted');
      }

    } else {
      // we're starting this song, so note that
      this.config.current = {
        play: play,
        canSkip: false,
        started: false,
        retryCount: 0
      };

      //this.config.status = 'active';

      log('activated new song');
      this.trigger('play-active', play);

    }
  };

  Session.prototype._requestNextPlay = function(delay) {
    var self = this;

    this._getClientId().then(function() {
      if (self.config.pendingRequest) {
        if (!delay) {
          log('already waiting for a request to finish');
          return;

        } else if (delay > 60000) {
          log('giving up on retrieving next play');

          // we already retried this - let's give up
          self.config.pendingRequest = null;

          if (self.config.current == null) {
            // we're not playing anything, so we're waiting. 
            // set assign play to null again to trigger empty/idle
            self._assignCurrentPlay(null);
          }
          return;

        } else {
          log('retrying pending request');

          // retry the request
          self.config.pendingRequest.retryCount++;

          self._signedAjax(self.config.pendingRequest.ajax)
            .done(_.bind(self._receiveNextPlay, self, self.config.pendingRequest.ajax))
            .fail(_.bind(self._failedNextPlay, self, delay, self.config.pendingRequest.ajax));
          return;
        }
        
      } else {
        // create a new request

        var ajax = { 
          url: self.config.baseUrl + '/api/v2/play',
          type: 'POST',
          dataType: 'json',
          timeout: 6000,
          data: {
            formats: self.config.formats,
            client_id: self.config.clientId,
            max_bitrate: self.config.maxBitrate
          }
        };

        if (self.config.placementId) {
          ajax.data.placement_id = self.config.placementId;
        }

        if (self.config.stationId) {
          ajax.data.station_id = self.config.stationId;
        }

        self.config.pendingRequest = {
          ajax: ajax,
          retryCount: 0
        };

        // request new play from server
        log('requesting new play from server');
        self._signedAjax(ajax)
          .done(_.bind(self._receiveNextPlay, self, ajax))
          .fail(_.bind(self._failedNextPlay, self, delay, ajax));
      }
    });
  };

  // we received a song to play from the server
  Session.prototype._receiveNextPlay = function(ajax, response) {
    // only process if we're still actually waiting for this
    if (this.config.pendingRequest && (this.config.pendingRequest.ajax === ajax)) {
      // this isn't pending any more
      this.config.pendingRequest = null;

      if (response.success) {
        if (this.config.current) {
          log('received play, but we\'re already playing, so queueing up', response.play);

          // play this when the current song is complete
          this.config.pendingPlay = response.play;

        } else {
          log('received play and no current song, so playing now', response.play);

          // start playing this right now, since nothing else is playing
          this._assignCurrentPlay(response.play);

        }

      } else if (response.error && response.error.code === 9) {
        if (this.config.current) {
          log('ran out of music to play, but we\'re already playing');

          this.config.pendingPlay = null;

        } else {
          log('ran out of music, and nothing playing now');

          this.trigger('plays-exhausted');
        }

      } else {
        log('unsuccessful response', response);
      }

    } else {
      log('nextPlay succeeded, but we don\'t care');
    }
  };

  // server returned an error when we requested the next song
  Session.prototype._failedNextPlay = function(delay, ajax, response) {
    // only process if we're still actually waiting for this
    if (this.config.pendingRequest && (this.config.pendingRequest.ajax === ajax)) {

      if (response.status === 403) {
        try {
          var fullResponse = $.parseJSON(response.responseText);

          if (fullResponse.error && fullResponse.error.code === 19) {
            // user isn't in the US any more, so let the call fail
            this.trigger('not-in-us', fullResponse.error.message);
            return;
          }
        } catch (e) {
          // some other response - fall through and try again
          log('problem parsing 403 response', e.message);
        }
      }

      log('request failed - trying again', response.status);

      delay = delay ? (delay * 2) : 500;
      _.delay(_.bind(this._requestNextPlay, this, delay), delay);

    } else {
      log('nextPlay failed, but we don\'t care');
    }
  };

  Session.prototype._synchronizeServerTime = function() {
    if (this.timePromise) {
      return this.timePromise;
    }

    var timeDeferred = $.Deferred();
    this.timePromise = timeDeferred.promise();

    var self = this;
    timeDeferred.then(function(serverTime) {
      var localTime = self._unixTime();

      self.config.timeOffset = serverTime - localTime;
    });

    this._requestServerTime(timeDeferred);

    return this.timePromise;
  };

  // hit the server up for the time and return via the passed-in Deferred object
  Session.prototype._requestServerTime = function(deferred, delay) {
    var self = this;

    this._ajax({
      url: self.config.baseUrl + '/api/v2/oauth/time',
      type: 'GET'

    }).done(function(response) {
      if (response.success) {
        deferred.resolve(response.time);

      } else {
        repeatAfter(delay, 2000, function(newDelay) { 
          self._requestServerTime(deferred, newDelay);
        });
      }

    }).fail(function() {
      repeatAfter(delay, 2000, function(newDelay) { 
        self._requestServerTime(deferred, newDelay);
      });
    });
  };

  Session.prototype._getClientId = function() {
    if (this.clientPromise) {
      return this.clientPromise;
    }
    var clientDeferred = new $.Deferred();
    this.clientPromise = clientDeferred.promise();

    var self = this;

    this._requestClientId(function(clientId) {
      // once we've got a clientId, stick it in the config
      self.config.clientId = clientId;

      self._setStoredCid(self.config.clientId);

      clientDeferred.resolve(clientId);
    });

    return this.clientPromise;
  };

  // hit the server up for a client id and return it via the passed in deferred
  Session.prototype._requestClientId = function(saveClientId, delay) {
    // see if we've got a cookie
    var clientId = this._getStoredCid();

    if (clientId) {
      return saveClientId(clientId);

    } else {
      var self = this;

      this._signedAjax({
        url: self.config.baseUrl + '/api/v2/client',
        type: 'POST'

      }).done(function(response) {
        if (response.success) {
          saveClientId(response.client_id);

        } else {
          repeatAfter(delay, 2000, function(newDelay) { 
            // retry until the end of time
            self._requestClientId(saveClientId, newDelay);
          });
        }

      }).fail(function(response) {
        if (response.status === 403) {
          try {
            var fullResponse = $.parseJSON(response.responseText);

            if (fullResponse.error && fullResponse.error.code === 19) {
              // user isn't in the US any more, so let the call fail
              self.trigger('not-in-us', fullResponse.error.message);
              return;
            }
          } catch (e) {
            // some other response - fall through and try again
            log('unknown response for client id request', e.message);
          }

        } else {
          log('unknown client id response status', response.status);
        }

        repeatAfter(delay, 2000, function(newDelay) { 
          // retry until the end of time
          self._requestClientId(saveClientId, newDelay);
        });
      });
    }
  };

  function repeatAfter(delay, max, cb) {
    delay = delay ? (2 * delay) : 200;

    if (delay > max) {
      delay = max;
    }

    setTimeout(function() {
      cb(delay);
    }, delay);

  }

  Session.prototype.maybeCanSkip = function() {
    return this.config.current && this.config.current.started && this.config.current.canSkip;
  };

  Session.prototype.likePlay = function(playId) {
    this._signedAjax({
      url: this.config.baseUrl + '/api/v2/play/' + playId + '/like',
      type: 'POST'
    });

    if (this.config.current && (this.config.current.play.id === playId)) {
      this.config.current.play.liked = true;
    }
  };

  Session.prototype.unlikePlay = function(playId) {
    this._signedAjax({
      url: this.config.baseUrl + '/api/v2/play/' + playId + '/like',
      type: 'DELETE'
    });

    if (this.config.current && (this.config.current.play.id === playId)) {
      delete this.config.current.play['liked'];
    }
  };

  Session.prototype.dislikePlay = function(playId) {
    this._signedAjax({
      url: this.config.baseUrl + '/api/v2/play/' + playId + '/dislike',
      type: 'POST'
    });

    if (this.config.current && (this.config.current.play.id === playId)) {
      this.config.current.play.liked = false;
    }
  };

  /*
   * Save the current state of the session, so we can recreate
   * our current state in the future. The object returned
   * is what should be passed to 'unsuspend'. The 'startPosition'
   * should be the current playback offset for the active play, 
   * in milliseconds.
   */

  Session.prototype.suspend = function(startPosition) {
    var saved = { };

    if (this.config.placementId) {
      saved.placementId = this.config.placementId;
    }

    if (this.config.stationId) {
      saved.stationId = this.config.stationId;
    }

    if (this.config.current && this.config.current.started) {
      // only save the active play if we've actually started
      // playing it (otherwise the next call to create a play
      // will return the same data)
      saved.placement = this.config.placement;
      saved.stations = this.config.stations;
      saved.play = _.clone(this.config.current.play);
      saved.play.startPosition = startPosition;
      saved.canSkip = this.config.current.canSkip;
    }

    return saved;
  };

  /*
   * Use the saved session passed in to restore the player to
   * the state it was in previously. This method will make sure
   * all the necessary events are triggered so that any
   * object observing events from this session will believe a
   * 'session.tune()' call was made.
   */

  Session.prototype.unsuspend = function(saved) {
    if (this.getActivePlay()) {
      throw new Error('You cannot unsuspend after running tune()');
    }

    if ('placementId' in saved) {
      this.config.placementId = saved.placementId;
      this.trigger('placement-changed', this.config.placementId);
    }

    if ('stationId' in saved) {
      this.config.stationId = saved.stationId;
      this.trigger('station-changed', this.config.stationId);
    }

    if ('play' in saved) {
      this.config.placement = saved.placement;
      this.config.stations = saved.stations;

      this.trigger('placement', this.config.placement);
      this.trigger('stations', this.config.stations);

      // emit the 'play-active' event
      this._assignCurrentPlay(saved.play);

      // make a fake start response from the server, emit
      // a 'play-start' event, and then start queueing
      // up the next song to play
      this._receiveStartPlay(saved.play, { success: true, can_skip: saved.canSkip });

      return saved.play;

    } else {
      this.tune();

      return null;
    }
  };

  function supports_html5_storage() {
    try {
      return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
      log('browser does not support html5 localstorage', e.message);
      return false;
    }
  }

  var cookieName = 'cid';
  Session.prototype._getStoredCid = function() {
    if (supports_html5_storage()) {
      return localStorage[cookieName];
    } else {
      return $.cookie(cookieName);
    }
  };

  Session.prototype._setStoredCid = function(value) {
    if (supports_html5_storage()) {
      localStorage[cookieName] = value;
    } else {
      $.cookie(cookieName, value, { expires: 3650, path: '/' });
    }
  };

  Session.prototype._deleteStoredCid = function() {
    if (supports_html5_storage()) {
      localStorage.removeItem(cookieName);
    } else {
      $.removeCookie(cookieName, { path: '/' });
    }
  };

  Session.prototype._unixTime = function() {
    return Math.floor( Date.now() / 1000 );
  };

  Session.prototype._makeNonce = function() {
    return Math.random().toString(36).substring(8);
  };

  Session.prototype._sign = function(request) {
    var authorization;

    if (request.url.slice(0, 5) === 'https') {
      // use Basic auth for HTTPS
      authorization = 'Basic ' + CryptoJS.enc.Base64.stringify(
                        CryptoJS.enc.Latin1.parse(
                          this.config.token + ':' + this.config.secret
                        )
                      );

    } else {
      // use OAuth for HTTP

      var message = {
        action: request.url,
        method: request.type,
        parameters: {
          oauth_timestamp: this._unixTime() + this.config.timeOffset,
          oauth_nonce: this._makeNonce(), 
          oauth_signature_method: 'HMAC-SHA256'
        }
      };

      $.extend(message.parameters, request.data);

      OAuth.completeRequest(message, {
        consumerKey:    this.config.token,
        consumerSecret: this.config.secret
      });

      authorization = OAuth.getAuthorizationHeader('Feed.fm', message.parameters);
    }

    request.headers = {
      Authorization: authorization
    };

    return request;
  };

  Session.prototype._signedAjax = function(request) {
    var self = this,
        deferred = $.Deferred();

    // synch the clock before signing anything
    this._synchronizeServerTime()
      .then(function() {
        self._ajax(self._sign(request))
          .then(function(response) { deferred.resolve(response); })
          .fail(function(err) { deferred.reject(err); });
      });

    return deferred;
  };

  Session.prototype._ajax = function(request) {
    return $.ajax(request);
  };

  return Session;

});


/*global define:false */
/*jshint camelcase:false */

/*
 *  Feed Media Player View
 *
 *  This class will respond to events from an instance of Feed.Player
 *  and pass on user requests to the instance.
 *
 *  Create this with:
 *
 *    player = new Feed.Player(token, secret);
 *    playerView = new Feed.PlayerView(id, player);
 *
 *  Where 'id' is the ID of the DOM element containing the player.
 *  The player should have the following elements in it:
 *
 *  <div id='player-view'>
 *    <div>
 *      <div class='position'><div class='progress'></div></div> 
 *      <span class='status'>
 *        <span class='track'>track</span> by <span class='artist'>artist</span> on <span class='release'>release</span>
 *      </span>
 *    </div>
 *    <div class='elapsed'></div>
 *    <div class='duration'></div>
 *    <button class='play-button button-enabled'>Play</button>
 *
 *    <button class='pause-button button-disabled'>Pause</button>
 *    <button class='skip-button button-disabled'>Skip</button>
 *    <button class='like-button button-disabled'>Like</button>
 *    <button class='dislike-button button-disabled'>Dislike</button>
 *  </div>
 *
 *  The buttons should all be 'button-disabled' except for the play
 *  button. As the player changes state, it will change the
 *  'button-disabled' classes to 'button-enabled'.
 *
 *  Note that the 'play-button' is visible before any playback starts,
 *  and while playback is paused. If you want a button that is only visible
 *  before any playback has started, then create a 'start-button'. If you
 *  want a button that is only visible when playback is paused, then
 *  create a 'resume-button'.
 *
 *  The 'like' button has an additional 'liked' class that is added to
 *  it when the current song has been liked. Likewise, the 'dislike' button
 *  has a 'disliked' class added to it when the current song has been
 *  disliked.
 *
 *  The 'status' section will display the current song and the 'position'
 *  section will display the elapsed time played and duration of the
 *  song while it is playing. Additionally, error messages (like 'out of
 *  music' or 'can't skip') will be displayed for a few seconds in the
 *  status section as well.
 *
 *  The rendering of the status can be changed by overriding
 *  the renderStatus(statusText) method, and the rendering of the position
 *  can be changed by overriding the renderPosition(positionInMillis, durationInMillis)
 *  methods. If you just want to override how the title of a song is
 *  rendered, then the formatPlay(play) method should be overridden.
 *
 *  The top level player element will have one of four classes set at
 *  all times: 'state-playing', 'state-idle', 'state-paused', or 'state-suspended'
 *
 */

define('feed/player-view',[ 'underscore', 'jquery' ], function(_, $) {

  var PlayerView = function(id, player) {
    this.id = id;
    this.alertId = null;
    this.durationId = null;
    this.startedPlayback = false;

    this.$el = $('#' + id);
    this.player = player;

    this.player.on('placement', this._onPlacement, this);
    this.player.on('play-started', this._onPlayStarted, this);
    this.player.on('play-paused', this._onPlayPaused, this);
    this.player.on('play-resumed', this._onPlayResumed, this);
    this.player.on('play-completed', this._onPlayCompleted, this);
    this.player.on('play-liked', this._onPlayLiked, this);
    this.player.on('play-unliked', this._onPlayUnliked, this);
    this.player.on('play-disliked', this._onPlayDisliked, this);
    this.player.on('plays-exhausted', this._onPlaysExhausted, this);
    this.player.on('skip-denied', this._onSkipDenied, this);
    this.player.on('suspend', this._onSuspend, this);

    this._enableButtonsBasedOnState();
    this.displayText = this.originalDisplayText = this.$('.status').html();
    this.renderStatus();

    this.$el.on('click', '.status', _.bind(this._onStatusClick, this));
    this.$el.on('click', '.play-button, .start-button, .resume-button', _.bind(this._onPlayButtonClick, this));
    this.$el.on('click', '.pause-button', _.bind(this._onPauseButtonClick, this));
    this.$el.on('click', '.skip-button', _.bind(this._onSkipButtonClick, this));
    this.$el.on('click', '.like-button', _.bind(this._onLikeButtonClick, this));
    this.$el.on('click', '.dislike-button', _.bind(this._onDislikeButtonClick, this));
  };

  PlayerView.prototype._onStatusClick = function() {
    var state = this.player.getCurrentState();

    if (state === 'playing') {
      this._onPauseButtonClick();

    } else {
      this._onPlayButtonClick();

    }
  };

  PlayerView.prototype._onPlayButtonClick = function() {
    this.player.play();
  };

  PlayerView.prototype._onPauseButtonClick = function() {
    this.player.pause();
  };

  PlayerView.prototype._onSkipButtonClick = function() {
    this.player.skip();
  };

  PlayerView.prototype._onLikeButtonClick = function(e) {
    if ($(e.target).closest('.like-button').is('.liked')) {
      this.player.unlike();

    } else {
      this.player.like();

    }
  };

  PlayerView.prototype._onDislikeButtonClick = function() {
    this.player.dislike();
  };

  PlayerView.prototype.$ = function(arg) {
    return this.$el.find(arg);
  };

  PlayerView.prototype._onPlacement = function(placement) {
    if (!this._originalDisplayText) {
      this.originalDisplayText = this.formatPlacement(placement);

      this.renderStatus(this.originalDisplayText);
    }
  };

  PlayerView.prototype.formatPlacement = function(placement) {
    return 'Tune in to <em class=\'placement\'>' + placement.name + '</em>';
  };

  PlayerView.prototype._onPlayStarted = function(play) {
    this.startedPlayback = true;

    this.renderStatus(this.formatPlay(play));
    this._enableButtonsBasedOnState();
    this._setLikeStatus(play.liked);
    this._enablePositionTracker();
  };

  PlayerView.prototype._enablePositionTracker = function() {
    var playerView = this;

    if (!this.durationId) {
      this.durationId = window.setInterval(function() {
        playerView.renderPosition(playerView.player.getPosition(), playerView.player.getDuration());
      }, 500);
    }
  };

  PlayerView.prototype._setLikeStatus = function(liked) {
    if (liked === true) {
      // highlight the like button
      this.$('.like-button').addClass('liked');
      this.$('.dislike-button').removeClass('disliked');
 
    } else if (liked === false) {
      // highlight the dislike button
      this.$('.like-button').removeClass('liked');
      this.$('.dislike-button').addClass('disliked');

    } else {
      // nobody gets highlighted
      this.$('.like-button').removeClass('liked');
      this.$('.dislike-button').removeClass('disliked');

    }
  };

  PlayerView.prototype._disablePositionTracker = function() {
    if (this.durationId) {
      window.clearInterval(this.durationId);
      this.durationId = null;
    }
  };

  PlayerView.prototype._onPlayResumed = function() {
    this._enablePositionTracker();
    
    this._enableButtonsBasedOnState();
  };

  PlayerView.prototype._onPlayPaused = function() {
    this._disablePositionTracker();

    this._enableButtonsBasedOnState();
  };

  PlayerView.prototype._onPlayCompleted = function() {
    this.renderPosition(0, 0);
    this._enableButtonsBasedOnState();
  };

  PlayerView.prototype._onPlaysExhausted = function() {
    this.renderStatus(this.originalDisplayText);
    this.renderAlert('There is no more music to play in this station!');

    this._enableButtonsBasedOnState();
  };

  PlayerView.prototype._onPlayLiked = function() {
    this._setLikeStatus(true);
  };

  PlayerView.prototype._onPlayDisliked = function() {
    this._setLikeStatus(false);
  };

  PlayerView.prototype._onPlayUnliked = function() {
    this._setLikeStatus();
  };

  PlayerView.prototype._onSkipDenied = function() {
    this.renderAlert('Sorry you\'ve temporarily run out of skips!');
  };

  PlayerView.prototype.formatPlay = function(play) {
    return '<span class=\'track\'>' + play.audio_file.track.title +
       '</span> by <span class=\'artist\'>' + play.audio_file.artist.name +
       '</span> on <span class=\'release\'>' + play.audio_file.release.title + '</span>';
  };

  PlayerView.prototype.renderStatus = function(displayText) {
    if (displayText !== undefined) {
      this.displayText = displayText;
    }

    if (!this.alertId) {
      this.$('.status').html(this.displayText).removeClass('alert');
    }
  };

  PlayerView.prototype.renderPosition = function(position, duration) {
    this.$('.elapsed').html(formatTime(position));
    this.$('.duration').html(formatTime(duration));

    if (duration === 0) {
      this.$('.progress').css('width', '0');
    } else {
      var elapsed = Math.round((position + 1000) / duration * 100);
      elapsed = (elapsed > 100) ? 100 : elapsed;
      this.$('.progress').css('width', elapsed + '%');
    }
  };

  function formatTime(millis) {
    var asSeconds = Math.floor(millis / 1000),
        secondsPart = (asSeconds % 60),
        minutesPart = Math.floor(asSeconds / 60);

    if (secondsPart < 10) {
      secondsPart = '0' + secondsPart;
    }

    return minutesPart + ':' + secondsPart;
  }

  PlayerView.prototype.renderAlert = function(alertText) {
    if (this.alertId) {
      window.clearTimeout(this.alertId);
    }

    this.$('.status').html(alertText).addClass('alert');

    var playerView = this;
    this.alertId = window.setTimeout(function() {
      playerView.alertId = null;
      playerView.renderStatus();
    }, 3000);
  };

  PlayerView.prototype._onSuspend = function() {
    this._enableButtonsBasedOnState();
  };

  PlayerView.prototype._enableButtonsBasedOnState = function() {
    var state = this.player.getCurrentState(),
        toEnable,
        toDisable;

    switch (state) {
      case 'playing':
        toEnable = '.pause-button, .like-button, .dislike-button';
        toDisable = '.play-button, .start-button, .resume-button';

        if (this.player.maybeCanSkip()) {
          toEnable += ', .skip-button';
        } else {
          toDisable += ', .skip-button';
        }
        break;

      case 'paused':
        toEnable = '.play-button, .resume-button, .like-button, .dislike-button';
        toDisable = '.pause-button, .start-button';

        if (this.player.maybeCanSkip()) {
          toEnable += ', .skip-button';
        } else {
          toDisable += ', .skip-button';
        }
        break;

      case 'suspended':
        toEnable = '';
        toDisable = '.play-button, .resume-button, .like-button, .dislike-button, .pause-button, .start-button, .skip-button';

        break;


      /* case 'idle': */
      default:
        toEnable = '.play-button, .start-button';
        toDisable = '.resume-button, .pause-button, .like-button, .dislike-button, .skip-button';
        break;
    }

    this.$(toDisable)
      .removeClass('button-enabled')
      .addClass('button-disabled')
      .attr('disabled', 'true');

    if (toEnable) {
      this.$(toEnable)
        .removeClass('button-disabled')
        .addClass('button-enabled')
        .removeAttr('disabled');
    }

    this.$el
      .removeClass('state-playing state-paused state-idle state-suspended')
      .addClass('state-' + state);

  };

  return PlayerView;

});


/** @license
 *
 * SoundManager 2: JavaScript Sound for the Web
 * ----------------------------------------------
 * http://schillmania.com/projects/soundmanager2/
 *
 * Copyright (c) 2007, Scott Schiller. All rights reserved.
 * Code provided under the BSD License:
 * http://schillmania.com/projects/soundmanager2/license.txt
 *
 * V2.97a.20131201
 */

/*global window, SM2_DEFER, sm2Debugger, console, document, navigator, setTimeout, setInterval, clearInterval, Audio, opera */
/*jslint regexp: true, sloppy: true, white: true, nomen: true, plusplus: true, todo: true */

(function(window, _undefined) {

var soundManager = null;
function SoundManager(smURL, smID) {
  this.setupOptions = {
    'url': (smURL || null),
    'flashVersion': 8,
    'debugMode': true,
    'debugFlash': false,
    'useConsole': true,
    'consoleOnly': true,
    'waitForWindowLoad': false,
    'bgColor': '#ffffff',
    'useHighPerformance': false,
    'flashPollingInterval': null,
    'html5PollingInterval': null,
    'flashLoadTimeout': 1000,
    'wmode': null,
    'allowScriptAccess': 'always',
    'useFlashBlock': false,
    'useHTML5Audio': true,
    'html5Test': /^(probably|maybe)$/i,
    'preferFlash': false,
    'noSWFCache': false,
    'idPrefix': 'sound'
  };
  this.defaultOptions = {
    'autoLoad': false,
    'autoPlay': false,
    'from': null,
    'loops': 1,
    'onid3': null,
    'onload': null,
    'whileloading': null,
    'onplay': null,
    'onpause': null,
    'onresume': null,
    'whileplaying': null,
    'onposition': null,
    'onstop': null,
    'onfailure': null,
    'onfinish': null,
    'multiShot': true,
    'multiShotEvents': false,
    'position': null,
    'pan': 0,
    'stream': true,
    'to': null,
    'type': null,
    'usePolicyFile': false,
    'volume': 100
  };
  this.flash9Options = {
    'isMovieStar': null,
    'usePeakData': false,
    'useWaveformData': false,
    'useEQData': false,
    'onbufferchange': null,
    'ondataerror': null
  };
  this.movieStarOptions = {
    'bufferTime': 3,
    'serverURL': null,
    'onconnect': null,
    'duration': null
  };
  this.audioFormats = {
    'mp3': {
      'type': ['audio/mpeg; codecs="mp3"', 'audio/mpeg', 'audio/mp3', 'audio/MPA', 'audio/mpa-robust'],
      'required': true
    },
    'mp4': {
      'related': ['aac','m4a','m4b'],
      'type': ['audio/mp4; codecs="mp4a.40.2"', 'audio/aac', 'audio/x-m4a', 'audio/MP4A-LATM', 'audio/mpeg4-generic'],
      'required': false
    },
    'ogg': {
      'type': ['audio/ogg; codecs=vorbis'],
      'required': false
    },
    'opus': {
      'type': ['audio/ogg; codecs=opus', 'audio/opus'],
      'required': false
    },
    'wav': {
      'type': ['audio/wav; codecs="1"', 'audio/wav', 'audio/wave', 'audio/x-wav'],
      'required': false
    }
  };
  this.movieID = 'sm2-container';
  this.id = (smID || 'sm2movie');
  this.debugID = 'soundmanager-debug';
  this.debugURLParam = /([#?&])debug=1/i;
  this.versionNumber = 'V2.97a.20131201';
  this.version = null;
  this.movieURL = null;
  this.altURL = null;
  this.swfLoaded = false;
  this.enabled = false;
  this.oMC = null;
  this.sounds = {};
  this.soundIDs = [];
  this.muted = false;
  this.didFlashBlock = false;
  this.filePattern = null;
  this.filePatterns = {
    'flash8': /\.mp3(\?.*)?$/i,
    'flash9': /\.mp3(\?.*)?$/i
  };
  this.features = {
    'buffering': false,
    'peakData': false,
    'waveformData': false,
    'eqData': false,
    'movieStar': false
  };
  this.sandbox = {
  };
  this.html5 = {
    'usingFlash': null
  };
  this.flash = {};
  this.html5Only = false;
  this.ignoreFlash = false;
  var SMSound,
  sm2 = this, globalHTML5Audio = null, flash = null, sm = 'soundManager', smc = sm + ': ', h5 = 'HTML5::', id, ua = navigator.userAgent, wl = window.location.href.toString(), doc = document, doNothing, setProperties, init, fV, on_queue = [], debugOpen = true, debugTS, didAppend = false, appendSuccess = false, didInit = false, disabled = false, windowLoaded = false, _wDS, wdCount = 0, initComplete, mixin, assign, extraOptions, addOnEvent, processOnEvents, initUserOnload, delayWaitForEI, waitForEI, rebootIntoHTML5, setVersionInfo, handleFocus, strings, initMovie, preInit, domContentLoaded, winOnLoad, didDCLoaded, getDocument, createMovie, catchError, setPolling, initDebug, debugLevels = ['log', 'info', 'warn', 'error'], defaultFlashVersion = 8, disableObject, failSafely, normalizeMovieURL, oRemoved = null, oRemovedHTML = null, str, flashBlockHandler, getSWFCSS, swfCSS, toggleDebug, loopFix, policyFix, complain, idCheck, waitingForEI = false, initPending = false, startTimer, stopTimer, timerExecute, h5TimerCount = 0, h5IntervalTimer = null, parseURL, messages = [],
  canIgnoreFlash, needsFlash = null, featureCheck, html5OK, html5CanPlay, html5Ext, html5Unload, domContentLoadedIE, testHTML5, event, slice = Array.prototype.slice, useGlobalHTML5Audio = false, lastGlobalHTML5URL, hasFlash, detectFlash, badSafariFix, html5_events, showSupport, flushMessages, wrapCallback, idCounter = 0,
  is_iDevice = ua.match(/(ipad|iphone|ipod)/i), isAndroid = ua.match(/android/i), isIE = ua.match(/msie/i), isWebkit = ua.match(/webkit/i), isSafari = (ua.match(/safari/i) && !ua.match(/chrome/i)), isOpera = (ua.match(/opera/i)),
  mobileHTML5 = (ua.match(/(mobile|pre\/|xoom)/i) || is_iDevice || isAndroid),
  isBadSafari = (!wl.match(/usehtml5audio/i) && !wl.match(/sm2\-ignorebadua/i) && isSafari && !ua.match(/silk/i) && ua.match(/OS X 10_6_([3-7])/i)),
  hasConsole = (window.console !== _undefined && console.log !== _undefined), isFocused = (doc.hasFocus !== _undefined?doc.hasFocus():null), tryInitOnFocus = (isSafari && (doc.hasFocus === _undefined || !doc.hasFocus())), okToDisable = !tryInitOnFocus, flashMIME = /(mp3|mp4|mpa|m4a|m4b)/i, msecScale = 1000,
  emptyURL = 'about:blank',
  emptyWAV = 'data:audio/wave;base64,/UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQIAAAD//w==',
  overHTTP = (doc.location?doc.location.protocol.match(/http/i):null),
  http = (!overHTTP ? 'http:/'+'/' : ''),
  netStreamMimeTypes = /^\s*audio\/(?:x-)?(?:mpeg4|aac|flv|mov|mp4||m4v|m4a|m4b|mp4v|3gp|3g2)\s*(?:$|;)/i,
  netStreamTypes = ['mpeg4', 'aac', 'flv', 'mov', 'mp4', 'm4v', 'f4v', 'm4a', 'm4b', 'mp4v', '3gp', '3g2'],
  netStreamPattern = new RegExp('\\.(' + netStreamTypes.join('|') + ')(\\?.*)?$', 'i');
  this.mimePattern = /^\s*audio\/(?:x-)?(?:mp(?:eg|3))\s*(?:$|;)/i;
  this.useAltURL = !overHTTP;
  swfCSS = {
    'swfBox': 'sm2-object-box',
    'swfDefault': 'movieContainer',
    'swfError': 'swf_error',
    'swfTimedout': 'swf_timedout',
    'swfLoaded': 'swf_loaded',
    'swfUnblocked': 'swf_unblocked',
    'sm2Debug': 'sm2_debug',
    'highPerf': 'high_performance',
    'flashDebug': 'flash_debug'
  };
  this.hasHTML5 = (function() {
    try {
      return (Audio !== _undefined && (isOpera && opera !== _undefined && opera.version() < 10 ? new Audio(null) : new Audio()).canPlayType !== _undefined);
    } catch(e) {
      return false;
    }
  }());
  this.setup = function(options) {
    var noURL = (!sm2.url);
    if (options !== _undefined && didInit && needsFlash && sm2.ok() && (options.flashVersion !== _undefined || options.url !== _undefined || options.html5Test !== _undefined)) {
    }
    assign(options);
    if (options) {
      if (noURL && didDCLoaded && options.url !== _undefined) {
        sm2.beginDelayedInit();
      }
      if (!didDCLoaded && options.url !== _undefined && doc.readyState === 'complete') {
        setTimeout(domContentLoaded, 1);
      }
    }
    return sm2;
  };
  this.ok = function() {
    return (needsFlash ? (didInit && !disabled) : (sm2.useHTML5Audio && sm2.hasHTML5));
  };
  this.supported = this.ok;
  this.getMovie = function(smID) {
    return id(smID) || doc[smID] || window[smID];
  };
  this.createSound = function(oOptions, _url) {
    var cs, cs_string, options, oSound = null;
    if (!didInit || !sm2.ok()) {
      return false;
    }
    if (_url !== _undefined) {
      oOptions = {
        'id': oOptions,
        'url': _url
      };
    }
    options = mixin(oOptions);
    options.url = parseURL(options.url);
    if (options.id === undefined) {
      options.id = sm2.setupOptions.idPrefix + (idCounter++);
    }
    if (idCheck(options.id, true)) {
      return sm2.sounds[options.id];
    }
    function make() {
      options = loopFix(options);
      sm2.sounds[options.id] = new SMSound(options);
      sm2.soundIDs.push(options.id);
      return sm2.sounds[options.id];
    }
    if (html5OK(options)) {
      oSound = make();
      oSound._setup_html5(options);
    } else {
      if (sm2.html5Only) {
        return make();
      }
      if (sm2.html5.usingFlash && options.url && options.url.match(/data\:/i)) {
        return make();
      }
      if (fV > 8) {
        if (options.isMovieStar === null) {
          options.isMovieStar = !!(options.serverURL || (options.type ? options.type.match(netStreamMimeTypes) : false) || (options.url && options.url.match(netStreamPattern)));
        }
      }
      options = policyFix(options, cs);
      oSound = make();
      if (fV === 8) {
        flash._createSound(options.id, options.loops||1, options.usePolicyFile);
      } else {
        flash._createSound(options.id, options.url, options.usePeakData, options.useWaveformData, options.useEQData, options.isMovieStar, (options.isMovieStar?options.bufferTime:false), options.loops||1, options.serverURL, options.duration||null, options.autoPlay, true, options.autoLoad, options.usePolicyFile);
        if (!options.serverURL) {
          oSound.connected = true;
          if (options.onconnect) {
            options.onconnect.apply(oSound);
          }
        }
      }
      if (!options.serverURL && (options.autoLoad || options.autoPlay)) {
        oSound.load(options);
      }
    }
    if (!options.serverURL && options.autoPlay) {
      oSound.play();
    }
    return oSound;
  };
  this.destroySound = function(sID, _bFromSound) {
    if (!idCheck(sID)) {
      return false;
    }
    var oS = sm2.sounds[sID], i;
    oS._iO = {};
    oS.stop();
    oS.unload();
    for (i = 0; i < sm2.soundIDs.length; i++) {
      if (sm2.soundIDs[i] === sID) {
        sm2.soundIDs.splice(i, 1);
        break;
      }
    }
    if (!_bFromSound) {
      oS.destruct(true);
    }
    oS = null;
    delete sm2.sounds[sID];
    return true;
  };
  this.load = function(sID, oOptions) {
    if (!idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].load(oOptions);
  };
  this.unload = function(sID) {
    if (!idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].unload();
  };
  this.onPosition = function(sID, nPosition, oMethod, oScope) {
    if (!idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].onposition(nPosition, oMethod, oScope);
  };
  this.onposition = this.onPosition;
  this.clearOnPosition = function(sID, nPosition, oMethod) {
    if (!idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].clearOnPosition(nPosition, oMethod);
  };
  this.play = function(sID, oOptions) {
    var result = null,
        overloaded = (oOptions && !(oOptions instanceof Object));
    if (!didInit || !sm2.ok()) {
      return false;
    }
    if (!idCheck(sID, overloaded)) {
      if (!overloaded) {
        return false;
      }
      if (overloaded) {
        oOptions = {
          url: oOptions
        };
      }
      if (oOptions && oOptions.url) {
        oOptions.id = sID;
        result = sm2.createSound(oOptions).play();
      }
    } else if (overloaded) {
      oOptions = {
        url: oOptions
      };
    }
    if (result === null) {
      result = sm2.sounds[sID].play(oOptions);
    }
    return result;
  };
  this.start = this.play;
  this.setPosition = function(sID, nMsecOffset) {
    if (!idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].setPosition(nMsecOffset);
  };
  this.stop = function(sID) {
    if (!idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].stop();
  };
  this.stopAll = function() {
    var oSound;
    for (oSound in sm2.sounds) {
      if (sm2.sounds.hasOwnProperty(oSound)) {
        sm2.sounds[oSound].stop();
      }
    }
  };
  this.pause = function(sID) {
    if (!idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].pause();
  };
  this.pauseAll = function() {
    var i;
    for (i = sm2.soundIDs.length-1; i >= 0; i--) {
      sm2.sounds[sm2.soundIDs[i]].pause();
    }
  };
  this.resume = function(sID) {
    if (!idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].resume();
  };
  this.resumeAll = function() {
    var i;
    for (i = sm2.soundIDs.length-1; i >= 0; i--) {
      sm2.sounds[sm2.soundIDs[i]].resume();
    }
  };
  this.togglePause = function(sID) {
    if (!idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].togglePause();
  };
  this.setPan = function(sID, nPan) {
    if (!idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].setPan(nPan);
  };
  this.setVolume = function(sID, nVol) {
    if (!idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].setVolume(nVol);
  };
  this.mute = function(sID) {
    var i = 0;
    if (sID instanceof String) {
      sID = null;
    }
    if (!sID) {
      for (i = sm2.soundIDs.length-1; i >= 0; i--) {
        sm2.sounds[sm2.soundIDs[i]].mute();
      }
      sm2.muted = true;
    } else {
      if (!idCheck(sID)) {
        return false;
      }
      return sm2.sounds[sID].mute();
    }
    return true;
  };
  this.muteAll = function() {
    sm2.mute();
  };
  this.unmute = function(sID) {
    var i;
    if (sID instanceof String) {
      sID = null;
    }
    if (!sID) {
      for (i = sm2.soundIDs.length-1; i >= 0; i--) {
        sm2.sounds[sm2.soundIDs[i]].unmute();
      }
      sm2.muted = false;
    } else {
      if (!idCheck(sID)) {
        return false;
      }
      return sm2.sounds[sID].unmute();
    }
    return true;
  };
  this.unmuteAll = function() {
    sm2.unmute();
  };
  this.toggleMute = function(sID) {
    if (!idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].toggleMute();
  };
  this.getMemoryUse = function() {
    var ram = 0;
    if (flash && fV !== 8) {
      ram = parseInt(flash._getMemoryUse(), 10);
    }
    return ram;
  };
  this.disable = function(bNoDisable) {
    var i;
    if (bNoDisable === _undefined) {
      bNoDisable = false;
    }
    if (disabled) {
      return false;
    }
    disabled = true;
    for (i = sm2.soundIDs.length-1; i >= 0; i--) {
      disableObject(sm2.sounds[sm2.soundIDs[i]]);
    }
    initComplete(bNoDisable);
    event.remove(window, 'load', initUserOnload);
    return true;
  };
  this.canPlayMIME = function(sMIME) {
    var result;
    if (sm2.hasHTML5) {
      result = html5CanPlay({type:sMIME});
    }
    if (!result && needsFlash) {
      result = (sMIME && sm2.ok() ? !!((fV > 8 ? sMIME.match(netStreamMimeTypes) : null) || sMIME.match(sm2.mimePattern)) : null);
    }
    return result;
  };
  this.canPlayURL = function(sURL) {
    var result;
    if (sm2.hasHTML5) {
      result = html5CanPlay({url: sURL});
    }
    if (!result && needsFlash) {
      result = (sURL && sm2.ok() ? !!(sURL.match(sm2.filePattern)) : null);
    }
    return result;
  };
  this.canPlayLink = function(oLink) {
    if (oLink.type !== _undefined && oLink.type) {
      if (sm2.canPlayMIME(oLink.type)) {
        return true;
      }
    }
    return sm2.canPlayURL(oLink.href);
  };
  this.getSoundById = function(sID, _suppressDebug) {
    if (!sID) {
      return null;
    }
    var result = sm2.sounds[sID];
    return result;
  };
  this.onready = function(oMethod, oScope) {
    var sType = 'onready',
        result = false;
    if (typeof oMethod === 'function') {
      if (!oScope) {
        oScope = window;
      }
      addOnEvent(sType, oMethod, oScope);
      processOnEvents();
      result = true;
    } else {
      throw str('needFunction', sType);
    }
    return result;
  };
  this.ontimeout = function(oMethod, oScope) {
    var sType = 'ontimeout',
        result = false;
    if (typeof oMethod === 'function') {
      if (!oScope) {
        oScope = window;
      }
      addOnEvent(sType, oMethod, oScope);
      processOnEvents({type:sType});
      result = true;
    } else {
      throw str('needFunction', sType);
    }
    return result;
  };
  this._writeDebug = function(sText, sTypeOrObject) {
    return true;
  };
  this._wD = this._writeDebug;
  this._debug = function() {
  };
  this.reboot = function(resetEvents, excludeInit) {
    var i, j, k;
    for (i = sm2.soundIDs.length-1; i >= 0; i--) {
      sm2.sounds[sm2.soundIDs[i]].destruct();
    }
    if (flash) {
      try {
        if (isIE) {
          oRemovedHTML = flash.innerHTML;
        }
        oRemoved = flash.parentNode.removeChild(flash);
      } catch(e) {
      }
    }
    oRemovedHTML = oRemoved = needsFlash = flash = null;
    sm2.enabled = didDCLoaded = didInit = waitingForEI = initPending = didAppend = appendSuccess = disabled = useGlobalHTML5Audio = sm2.swfLoaded = false;
    sm2.soundIDs = [];
    sm2.sounds = {};
    idCounter = 0;
    if (!resetEvents) {
      for (i in on_queue) {
        if (on_queue.hasOwnProperty(i)) {
          for (j = 0, k = on_queue[i].length; j < k; j++) {
            on_queue[i][j].fired = false;
          }
        }
      }
    } else {
      on_queue = [];
    }
    sm2.html5 = {
      'usingFlash': null
    };
    sm2.flash = {};
    sm2.html5Only = false;
    sm2.ignoreFlash = false;
    window.setTimeout(function() {
      preInit();
      if (!excludeInit) {
        sm2.beginDelayedInit();
      }
    }, 20);
    return sm2;
  };
  this.reset = function() {
    return sm2.reboot(true, true);
  };
  this.getMoviePercent = function() {
    return (flash && 'PercentLoaded' in flash ? flash.PercentLoaded() : null);
  };
  this.beginDelayedInit = function() {
    windowLoaded = true;
    domContentLoaded();
    setTimeout(function() {
      if (initPending) {
        return false;
      }
      createMovie();
      initMovie();
      initPending = true;
      return true;
    }, 20);
    delayWaitForEI();
  };
  this.destruct = function() {
    sm2.disable(true);
  };
  SMSound = function(oOptions) {
    var s = this, resetProperties, add_html5_events, remove_html5_events, stop_html5_timer, start_html5_timer, attachOnPosition, onplay_called = false, onPositionItems = [], onPositionFired = 0, detachOnPosition, applyFromTo, lastURL = null, lastHTML5State, urlOmitted;
    lastHTML5State = {
      duration: null,
      time: null
    };
    this.id = oOptions.id;
    this.sID = this.id;
    this.url = oOptions.url;
    this.options = mixin(oOptions);
    this.instanceOptions = this.options;
    this._iO = this.instanceOptions;
    this.pan = this.options.pan;
    this.volume = this.options.volume;
    this.isHTML5 = false;
    this._a = null;
    urlOmitted = (this.url ? false : true);
    this.id3 = {};
    this._debug = function() {
    };
    this.load = function(oOptions) {
      var oSound = null, instanceOptions;
      if (oOptions !== _undefined) {
        s._iO = mixin(oOptions, s.options);
      } else {
        oOptions = s.options;
        s._iO = oOptions;
        if (lastURL && lastURL !== s.url) {
          s._iO.url = s.url;
          s.url = null;
        }
      }
      if (!s._iO.url) {
        s._iO.url = s.url;
      }
      s._iO.url = parseURL(s._iO.url);
      s.instanceOptions = s._iO;
      instanceOptions = s._iO;
      if (!instanceOptions.url && !s.url) {
        return s;
      }
      if (instanceOptions.url === s.url && s.readyState !== 0 && s.readyState !== 2) {
        if (s.readyState === 3 && instanceOptions.onload) {
          wrapCallback(s, function() {
            instanceOptions.onload.apply(s, [(!!s.duration)]);
          });
        }
        return s;
      }
      s.loaded = false;
      s.readyState = 1;
      s.playState = 0;
      s.id3 = {};
      if (html5OK(instanceOptions)) {
        oSound = s._setup_html5(instanceOptions);
        if (!oSound._called_load) {
          s._html5_canplay = false;
          if (s.url !== instanceOptions.url) {
            s._a.src = instanceOptions.url;
            s.setPosition(0);
          }
          s._a.autobuffer = 'auto';
          s._a.preload = 'auto';
          s._a._called_load = true;
        } else {
        }
      } else {
        if (sm2.html5Only) {
          return s;
        }
        if (s._iO.url && s._iO.url.match(/data\:/i)) {
          return s;
        }
        try {
          s.isHTML5 = false;
          s._iO = policyFix(loopFix(instanceOptions));
          instanceOptions = s._iO;
          if (fV === 8) {
            flash._load(s.id, instanceOptions.url, instanceOptions.stream, instanceOptions.autoPlay, instanceOptions.usePolicyFile);
          } else {
            flash._load(s.id, instanceOptions.url, !!(instanceOptions.stream), !!(instanceOptions.autoPlay), instanceOptions.loops||1, !!(instanceOptions.autoLoad), instanceOptions.usePolicyFile);
          }
        } catch(e) {
          catchError({type:'SMSOUND_LOAD_JS_EXCEPTION', fatal:true});
        }
      }
      s.url = instanceOptions.url;
      return s;
    };
    this.unload = function() {
      if (s.readyState !== 0) {
        if (!s.isHTML5) {
          if (fV === 8) {
            flash._unload(s.id, emptyURL);
          } else {
            flash._unload(s.id);
          }
        } else {
          stop_html5_timer();
          if (s._a) {
            s._a.pause();
            lastURL = html5Unload(s._a);
          }
        }
        resetProperties();
      }
      return s;
    };
    this.destruct = function(_bFromSM) {
      if (!s.isHTML5) {
        s._iO.onfailure = null;
        flash._destroySound(s.id);
      } else {
        stop_html5_timer();
        if (s._a) {
          s._a.pause();
          html5Unload(s._a);
          if (!useGlobalHTML5Audio) {
            remove_html5_events();
          }
          s._a._s = null;
          s._a = null;
        }
      }
      if (!_bFromSM) {
        sm2.destroySound(s.id, true);
      }
    };
    this.play = function(oOptions, _updatePlayState) {
      var fN, allowMulti, a, onready,
          audioClone, onended, oncanplay,
          startOK = true,
          exit = null;
      _updatePlayState = (_updatePlayState === _undefined ? true : _updatePlayState);
      if (!oOptions) {
        oOptions = {};
      }
      if (s.url) {
        s._iO.url = s.url;
      }
      s._iO = mixin(s._iO, s.options);
      s._iO = mixin(oOptions, s._iO);
      s._iO.url = parseURL(s._iO.url);
      s.instanceOptions = s._iO;
      if (!s.isHTML5 && s._iO.serverURL && !s.connected) {
        if (!s.getAutoPlay()) {
          s.setAutoPlay(true);
        }
        return s;
      }
      if (html5OK(s._iO)) {
        s._setup_html5(s._iO);
        start_html5_timer();
      }
      if (s.playState === 1 && !s.paused) {
        allowMulti = s._iO.multiShot;
        if (!allowMulti) {
          if (s.isHTML5) {
            s.setPosition(s._iO.position);
          }
          exit = s;
        } else {
        }
      }
      if (exit !== null) {
        return exit;
      }
      if (oOptions.url && oOptions.url !== s.url) {
        if (!s.readyState && !s.isHTML5 && fV === 8 && urlOmitted) {
          urlOmitted = false;
        } else {
          s.load(s._iO);
        }
      }
      if (!s.loaded) {
        if (s.readyState === 0) {
          if (!s.isHTML5 && !sm2.html5Only) {
            s._iO.autoPlay = true;
            s.load(s._iO);
          } else if (s.isHTML5) {
            s.load(s._iO);
          } else {
            exit = s;
          }
          s.instanceOptions = s._iO;
        } else if (s.readyState === 2) {
          exit = s;
        } else {
        }
      } else {
      }
      if (exit !== null) {
        return exit;
      }
      if (!s.isHTML5 && fV === 9 && s.position > 0 && s.position === s.duration) {
        oOptions.position = 0;
      }
      if (s.paused && s.position >= 0 && (!s._iO.serverURL || s.position > 0)) {
        s.resume();
      } else {
        s._iO = mixin(oOptions, s._iO);
        if (s._iO.from !== null && s._iO.to !== null && s.instanceCount === 0 && s.playState === 0 && !s._iO.serverURL) {
          onready = function() {
            s._iO = mixin(oOptions, s._iO);
            s.play(s._iO);
          };
          if (s.isHTML5 && !s._html5_canplay) {
            s.load({
              _oncanplay: onready
            });
            exit = false;
          } else if (!s.isHTML5 && !s.loaded && (!s.readyState || s.readyState !== 2)) {
            s.load({
              onload: onready
            });
            exit = false;
          }
          if (exit !== null) {
            return exit;
          }
          s._iO = applyFromTo();
        }
        if (!s.instanceCount || s._iO.multiShotEvents || (s.isHTML5 && s._iO.multiShot && !useGlobalHTML5Audio) || (!s.isHTML5 && fV > 8 && !s.getAutoPlay())) {
          s.instanceCount++;
        }
        if (s._iO.onposition && s.playState === 0) {
          attachOnPosition(s);
        }
        s.playState = 1;
        s.paused = false;
        s.position = (s._iO.position !== _undefined && !isNaN(s._iO.position) ? s._iO.position : 0);
        if (!s.isHTML5) {
          s._iO = policyFix(loopFix(s._iO));
        }
        if (s._iO.onplay && _updatePlayState) {
          s._iO.onplay.apply(s);
          onplay_called = true;
        }
        s.setVolume(s._iO.volume, true);
        s.setPan(s._iO.pan, true);
        if (!s.isHTML5) {
          startOK = flash._start(s.id, s._iO.loops || 1, (fV === 9 ? s.position : s.position / msecScale), s._iO.multiShot || false);
          if (fV === 9 && !startOK) {
            if (s._iO.onplayerror) {
              s._iO.onplayerror.apply(s);
            }
          }
        } else {
          if (s.instanceCount < 2) {
            start_html5_timer();
            a = s._setup_html5();
            s.setPosition(s._iO.position);
            a.play();
          } else {
            audioClone = new Audio(s._iO.url);
            onended = function() {
              event.remove(audioClone, 'ended', onended);
              s._onfinish(s);
              html5Unload(audioClone);
              audioClone = null;
            };
            oncanplay = function() {
              event.remove(audioClone, 'canplay', oncanplay);
              try {
                audioClone.currentTime = s._iO.position/msecScale;
              } catch(err) {
              }
              audioClone.play();
            };
            event.add(audioClone, 'ended', onended);
            if (s._iO.volume !== undefined) {
              audioClone.volume = Math.max(0, Math.min(1, s._iO.volume/100));
            }
            if (s.muted) {
              audioClone.muted = true;
            }
            if (s._iO.position) {
              event.add(audioClone, 'canplay', oncanplay);
            } else {
              audioClone.play();
            }
          }
        }
      }
      return s;
    };
    this.start = this.play;
    this.stop = function(bAll) {
      var instanceOptions = s._iO,
          originalPosition;
      if (s.playState === 1) {
        s._onbufferchange(0);
        s._resetOnPosition(0);
        s.paused = false;
        if (!s.isHTML5) {
          s.playState = 0;
        }
        detachOnPosition();
        if (instanceOptions.to) {
          s.clearOnPosition(instanceOptions.to);
        }
        if (!s.isHTML5) {
          flash._stop(s.id, bAll);
          if (instanceOptions.serverURL) {
            s.unload();
          }
        } else {
          if (s._a) {
            originalPosition = s.position;
            s.setPosition(0);
            s.position = originalPosition;
            s._a.pause();
            s.playState = 0;
            s._onTimer();
            stop_html5_timer();
          }
        }
        s.instanceCount = 0;
        s._iO = {};
        if (instanceOptions.onstop) {
          instanceOptions.onstop.apply(s);
        }
      }
      return s;
    };
    this.setAutoPlay = function(autoPlay) {
      s._iO.autoPlay = autoPlay;
      if (!s.isHTML5) {
        flash._setAutoPlay(s.id, autoPlay);
        if (autoPlay) {
          if (!s.instanceCount && s.readyState === 1) {
            s.instanceCount++;
          }
        }
      }
    };
    this.getAutoPlay = function() {
      return s._iO.autoPlay;
    };
    this.setPosition = function(nMsecOffset) {
      if (nMsecOffset === _undefined) {
        nMsecOffset = 0;
      }
      var position, position1K,
          offset = (s.isHTML5 ? Math.max(nMsecOffset, 0) : Math.min(s.duration || s._iO.duration, Math.max(nMsecOffset, 0)));
      s.position = offset;
      position1K = s.position/msecScale;
      s._resetOnPosition(s.position);
      s._iO.position = offset;
      if (!s.isHTML5) {
        position = (fV === 9 ? s.position : position1K);
        if (s.readyState && s.readyState !== 2) {
          flash._setPosition(s.id, position, (s.paused || !s.playState), s._iO.multiShot);
        }
      } else if (s._a) {
        if (s._html5_canplay) {
          if (s._a.currentTime !== position1K) {
            try {
              s._a.currentTime = position1K;
              if (s.playState === 0 || s.paused) {
                s._a.pause();
              }
            } catch(e) {
            }
          }
        } else if (position1K) {
          return s;
        }
        if (s.paused) {
          s._onTimer(true);
        }
      }
      return s;
    };
    this.pause = function(_bCallFlash) {
      if (s.paused || (s.playState === 0 && s.readyState !== 1)) {
        return s;
      }
      s.paused = true;
      if (!s.isHTML5) {
        if (_bCallFlash || _bCallFlash === _undefined) {
          flash._pause(s.id, s._iO.multiShot);
        }
      } else {
        s._setup_html5().pause();
        stop_html5_timer();
      }
      if (s._iO.onpause) {
        s._iO.onpause.apply(s);
      }
      return s;
    };
    this.resume = function() {
      var instanceOptions = s._iO;
      if (!s.paused) {
        return s;
      }
      s.paused = false;
      s.playState = 1;
      if (!s.isHTML5) {
        if (instanceOptions.isMovieStar && !instanceOptions.serverURL) {
          s.setPosition(s.position);
        }
        flash._pause(s.id, instanceOptions.multiShot);
      } else {
        s._setup_html5().play();
        start_html5_timer();
      }
      if (!onplay_called && instanceOptions.onplay) {
        instanceOptions.onplay.apply(s);
        onplay_called = true;
      } else if (instanceOptions.onresume) {
        instanceOptions.onresume.apply(s);
      }
      return s;
    };
    this.togglePause = function() {
      if (s.playState === 0) {
        s.play({
          position: (fV === 9 && !s.isHTML5 ? s.position : s.position / msecScale)
        });
        return s;
      }
      if (s.paused) {
        s.resume();
      } else {
        s.pause();
      }
      return s;
    };
    this.setPan = function(nPan, bInstanceOnly) {
      if (nPan === _undefined) {
        nPan = 0;
      }
      if (bInstanceOnly === _undefined) {
        bInstanceOnly = false;
      }
      if (!s.isHTML5) {
        flash._setPan(s.id, nPan);
      }
      s._iO.pan = nPan;
      if (!bInstanceOnly) {
        s.pan = nPan;
        s.options.pan = nPan;
      }
      return s;
    };
    this.setVolume = function(nVol, _bInstanceOnly) {
      if (nVol === _undefined) {
        nVol = 100;
      }
      if (_bInstanceOnly === _undefined) {
        _bInstanceOnly = false;
      }
      if (!s.isHTML5) {
        flash._setVolume(s.id, (sm2.muted && !s.muted) || s.muted?0:nVol);
      } else if (s._a) {
        if (sm2.muted && !s.muted) {
          s.muted = true;
          s._a.muted = true;
        }
        s._a.volume = Math.max(0, Math.min(1, nVol/100));
      }
      s._iO.volume = nVol;
      if (!_bInstanceOnly) {
        s.volume = nVol;
        s.options.volume = nVol;
      }
      return s;
    };
    this.mute = function() {
      s.muted = true;
      if (!s.isHTML5) {
        flash._setVolume(s.id, 0);
      } else if (s._a) {
        s._a.muted = true;
      }
      return s;
    };
    this.unmute = function() {
      s.muted = false;
      var hasIO = (s._iO.volume !== _undefined);
      if (!s.isHTML5) {
        flash._setVolume(s.id, hasIO?s._iO.volume:s.options.volume);
      } else if (s._a) {
        s._a.muted = false;
      }
      return s;
    };
    this.toggleMute = function() {
      return (s.muted?s.unmute():s.mute());
    };
    this.onPosition = function(nPosition, oMethod, oScope) {
      onPositionItems.push({
        position: parseInt(nPosition, 10),
        method: oMethod,
        scope: (oScope !== _undefined ? oScope : s),
        fired: false
      });
      return s;
    };
    this.onposition = this.onPosition;
    this.clearOnPosition = function(nPosition, oMethod) {
      var i;
      nPosition = parseInt(nPosition, 10);
      if (isNaN(nPosition)) {
        return false;
      }
      for (i=0; i < onPositionItems.length; i++) {
        if (nPosition === onPositionItems[i].position) {
          if (!oMethod || (oMethod === onPositionItems[i].method)) {
            if (onPositionItems[i].fired) {
              onPositionFired--;
            }
            onPositionItems.splice(i, 1);
          }
        }
      }
    };
    this._processOnPosition = function() {
      var i, item, j = onPositionItems.length;
      if (!j || !s.playState || onPositionFired >= j) {
        return false;
      }
      for (i=j-1; i >= 0; i--) {
        item = onPositionItems[i];
        if (!item.fired && s.position >= item.position) {
          item.fired = true;
          onPositionFired++;
          item.method.apply(item.scope, [item.position]);
		  j = onPositionItems.length;
        }
      }
      return true;
    };
    this._resetOnPosition = function(nPosition) {
      var i, item, j = onPositionItems.length;
      if (!j) {
        return false;
      }
      for (i=j-1; i >= 0; i--) {
        item = onPositionItems[i];
        if (item.fired && nPosition <= item.position) {
          item.fired = false;
          onPositionFired--;
        }
      }
      return true;
    };
    applyFromTo = function() {
      var instanceOptions = s._iO,
          f = instanceOptions.from,
          t = instanceOptions.to,
          start, end;
      end = function() {
        s.clearOnPosition(t, end);
        s.stop();
      };
      start = function() {
        if (t !== null && !isNaN(t)) {
          s.onPosition(t, end);
        }
      };
      if (f !== null && !isNaN(f)) {
        instanceOptions.position = f;
        instanceOptions.multiShot = false;
        start();
      }
      return instanceOptions;
    };
    attachOnPosition = function() {
      var item,
          op = s._iO.onposition;
      if (op) {
        for (item in op) {
          if (op.hasOwnProperty(item)) {
            s.onPosition(parseInt(item, 10), op[item]);
          }
        }
      }
    };
    detachOnPosition = function() {
      var item,
          op = s._iO.onposition;
      if (op) {
        for (item in op) {
          if (op.hasOwnProperty(item)) {
            s.clearOnPosition(parseInt(item, 10));
          }
        }
      }
    };
    start_html5_timer = function() {
      if (s.isHTML5) {
        startTimer(s);
      }
    };
    stop_html5_timer = function() {
      if (s.isHTML5) {
        stopTimer(s);
      }
    };
    resetProperties = function(retainPosition) {
      if (!retainPosition) {
        onPositionItems = [];
        onPositionFired = 0;
      }
      onplay_called = false;
      s._hasTimer = null;
      s._a = null;
      s._html5_canplay = false;
      s.bytesLoaded = null;
      s.bytesTotal = null;
      s.duration = (s._iO && s._iO.duration ? s._iO.duration : null);
      s.durationEstimate = null;
      s.buffered = [];
      s.eqData = [];
      s.eqData.left = [];
      s.eqData.right = [];
      s.failures = 0;
      s.isBuffering = false;
      s.instanceOptions = {};
      s.instanceCount = 0;
      s.loaded = false;
      s.metadata = {};
      s.readyState = 0;
      s.muted = false;
      s.paused = false;
      s.peakData = {
        left: 0,
        right: 0
      };
      s.waveformData = {
        left: [],
        right: []
      };
      s.playState = 0;
      s.position = null;
      s.id3 = {};
    };
    resetProperties();
    this._onTimer = function(bForce) {
      var duration, isNew = false, time, x = {};
      if (s._hasTimer || bForce) {
        if (s._a && (bForce || ((s.playState > 0 || s.readyState === 1) && !s.paused))) {
          duration = s._get_html5_duration();
          if (duration !== lastHTML5State.duration) {
            lastHTML5State.duration = duration;
            s.duration = duration;
            isNew = true;
          }
          s.durationEstimate = s.duration;
          time = (s._a.currentTime * msecScale || 0);
          if (time !== lastHTML5State.time) {
            lastHTML5State.time = time;
            isNew = true;
          }
          if (isNew || bForce) {
            s._whileplaying(time,x,x,x,x);
          }
        }
        return isNew;
      }
    };
    this._get_html5_duration = function() {
      var instanceOptions = s._iO,
          d = (s._a && s._a.duration ? s._a.duration*msecScale : (instanceOptions && instanceOptions.duration ? instanceOptions.duration : null)),
          result = (d && !isNaN(d) && d !== Infinity ? d : null);
      return result;
    };
    this._apply_loop = function(a, nLoops) {
      a.loop = (nLoops > 1 ? 'loop' : '');
    };
    this._setup_html5 = function(oOptions) {
      var instanceOptions = mixin(s._iO, oOptions),
          a = useGlobalHTML5Audio ? globalHTML5Audio : s._a,
          dURL = decodeURI(instanceOptions.url),
          sameURL;
      if (useGlobalHTML5Audio) {
        if (dURL === decodeURI(lastGlobalHTML5URL)) {
          sameURL = true;
        }
      } else if (dURL === decodeURI(lastURL)) {
        sameURL = true;
      }
      if (a) {
        if (a._s) {
          if (useGlobalHTML5Audio) {
            if (a._s && a._s.playState && !sameURL) {
              a._s.stop();
            }
          } else if (!useGlobalHTML5Audio && dURL === decodeURI(lastURL)) {
            s._apply_loop(a, instanceOptions.loops);
            return a;
          }
        }
        if (!sameURL) {
          if (lastURL) {
            resetProperties(false);
          }
          a.src = instanceOptions.url;
          s.url = instanceOptions.url;
          lastURL = instanceOptions.url;
          lastGlobalHTML5URL = instanceOptions.url;
          a._called_load = false;
        }
      } else {
        if (instanceOptions.autoLoad || instanceOptions.autoPlay) {
          s._a = new Audio(instanceOptions.url);
          s._a.load();
        } else {
          s._a = (isOpera && opera.version() < 10 ? new Audio(null) : new Audio());
        }
        a = s._a;
        a._called_load = false;
        if (useGlobalHTML5Audio) {
          globalHTML5Audio = a;
        }
      }
      s.isHTML5 = true;
      s._a = a;
      a._s = s;
      add_html5_events();
      s._apply_loop(a, instanceOptions.loops);
      if (instanceOptions.autoLoad || instanceOptions.autoPlay) {
        s.load();
      } else {
        a.autobuffer = false;
        a.preload = 'auto';
      }
      return a;
    };
    add_html5_events = function() {
      if (s._a._added_events) {
        return false;
      }
      var f;
      function add(oEvt, oFn, bCapture) {
        return s._a ? s._a.addEventListener(oEvt, oFn, bCapture||false) : null;
      }
      s._a._added_events = true;
      for (f in html5_events) {
        if (html5_events.hasOwnProperty(f)) {
          add(f, html5_events[f]);
        }
      }
      return true;
    };
    remove_html5_events = function() {
      var f;
      function remove(oEvt, oFn, bCapture) {
        return (s._a ? s._a.removeEventListener(oEvt, oFn, bCapture||false) : null);
      }
      s._a._added_events = false;
      for (f in html5_events) {
        if (html5_events.hasOwnProperty(f)) {
          remove(f, html5_events[f]);
        }
      }
    };
    this._onload = function(nSuccess) {
      var fN,
          loadOK = !!nSuccess || (!s.isHTML5 && fV === 8 && s.duration);
      s.loaded = loadOK;
      s.readyState = loadOK?3:2;
      s._onbufferchange(0);
      if (s._iO.onload) {
        wrapCallback(s, function() {
          s._iO.onload.apply(s, [loadOK]);
        });
      }
      return true;
    };
    this._onbufferchange = function(nIsBuffering) {
      if (s.playState === 0) {
        return false;
      }
      if ((nIsBuffering && s.isBuffering) || (!nIsBuffering && !s.isBuffering)) {
        return false;
      }
      s.isBuffering = (nIsBuffering === 1);
      if (s._iO.onbufferchange) {
        s._iO.onbufferchange.apply(s);
      }
      return true;
    };
    this._onsuspend = function() {
      if (s._iO.onsuspend) {
        s._iO.onsuspend.apply(s);
      }
      return true;
    };
    this._onfailure = function(msg, level, code) {
      s.failures++;
      if (s._iO.onfailure && s.failures === 1) {
        s._iO.onfailure(s, msg, level, code);
      } else {
      }
    };
    this._onfinish = function() {
      var io_onfinish = s._iO.onfinish;
      s._onbufferchange(0);
      s._resetOnPosition(0);
      if (s.instanceCount) {
        s.instanceCount--;
        if (!s.instanceCount) {
          detachOnPosition();
          s.playState = 0;
          s.paused = false;
          s.instanceCount = 0;
          s.instanceOptions = {};
          s._iO = {};
          stop_html5_timer();
          if (s.isHTML5) {
            s.position = 0;
          }
        }
        if (!s.instanceCount || s._iO.multiShotEvents) {
          if (io_onfinish) {
            wrapCallback(s, function() {
              io_onfinish.apply(s);
            });
          }
        }
      }
    };
    this._whileloading = function(nBytesLoaded, nBytesTotal, nDuration, nBufferLength) {
      var instanceOptions = s._iO;
      s.bytesLoaded = nBytesLoaded;
      s.bytesTotal = nBytesTotal;
      s.duration = Math.floor(nDuration);
      s.bufferLength = nBufferLength;
      if (!s.isHTML5 && !instanceOptions.isMovieStar) {
        if (instanceOptions.duration) {
          s.durationEstimate = (s.duration > instanceOptions.duration) ? s.duration : instanceOptions.duration;
        } else {
          s.durationEstimate = parseInt((s.bytesTotal / s.bytesLoaded) * s.duration, 10);
        }
      } else {
        s.durationEstimate = s.duration;
      }
      if (!s.isHTML5) {
        s.buffered = [{
          'start': 0,
          'end': s.duration
        }];
      }
      if ((s.readyState !== 3 || s.isHTML5) && instanceOptions.whileloading) {
        instanceOptions.whileloading.apply(s);
      }
    };
    this._whileplaying = function(nPosition, oPeakData, oWaveformDataLeft, oWaveformDataRight, oEQData) {
      var instanceOptions = s._iO,
          eqLeft;
      if (isNaN(nPosition) || nPosition === null) {
        return false;
      }
      s.position = Math.max(0, nPosition);
      s._processOnPosition();
      if (!s.isHTML5 && fV > 8) {
        if (instanceOptions.usePeakData && oPeakData !== _undefined && oPeakData) {
          s.peakData = {
            left: oPeakData.leftPeak,
            right: oPeakData.rightPeak
          };
        }
        if (instanceOptions.useWaveformData && oWaveformDataLeft !== _undefined && oWaveformDataLeft) {
          s.waveformData = {
            left: oWaveformDataLeft.split(','),
            right: oWaveformDataRight.split(',')
          };
        }
        if (instanceOptions.useEQData) {
          if (oEQData !== _undefined && oEQData && oEQData.leftEQ) {
            eqLeft = oEQData.leftEQ.split(',');
            s.eqData = eqLeft;
            s.eqData.left = eqLeft;
            if (oEQData.rightEQ !== _undefined && oEQData.rightEQ) {
              s.eqData.right = oEQData.rightEQ.split(',');
            }
          }
        }
      }
      if (s.playState === 1) {
        if (!s.isHTML5 && fV === 8 && !s.position && s.isBuffering) {
          s._onbufferchange(0);
        }
        if (instanceOptions.whileplaying) {
          instanceOptions.whileplaying.apply(s);
        }
      }
      return true;
    };
    this._oncaptiondata = function(oData) {
      s.captiondata = oData;
      if (s._iO.oncaptiondata) {
        s._iO.oncaptiondata.apply(s, [oData]);
      }
    };
    this._onmetadata = function(oMDProps, oMDData) {
      var oData = {}, i, j;
      for (i = 0, j = oMDProps.length; i < j; i++) {
        oData[oMDProps[i]] = oMDData[i];
      }
      s.metadata = oData;
      if (s._iO.onmetadata) {
        s._iO.onmetadata.apply(s);
      }
    };
    this._onid3 = function(oID3Props, oID3Data) {
      var oData = [], i, j;
      for (i = 0, j = oID3Props.length; i < j; i++) {
        oData[oID3Props[i]] = oID3Data[i];
      }
      s.id3 = mixin(s.id3, oData);
      if (s._iO.onid3) {
        s._iO.onid3.apply(s);
      }
    };
    this._onconnect = function(bSuccess) {
      bSuccess = (bSuccess === 1);
      s.connected = bSuccess;
      if (bSuccess) {
        s.failures = 0;
        if (idCheck(s.id)) {
          if (s.getAutoPlay()) {
            s.play(_undefined, s.getAutoPlay());
          } else if (s._iO.autoLoad) {
            s.load();
          }
        }
        if (s._iO.onconnect) {
          s._iO.onconnect.apply(s, [bSuccess]);
        }
      }
    };
    this._ondataerror = function(sError) {
      if (s.playState > 0) {
        if (s._iO.ondataerror) {
          s._iO.ondataerror.apply(s);
        }
      }
    };
  };
  getDocument = function() {
    return (doc.body || doc.getElementsByTagName('div')[0]);
  };
  id = function(sID) {
    return doc.getElementById(sID);
  };
  mixin = function(oMain, oAdd) {
    var o1 = (oMain || {}), o2, o;
    o2 = (oAdd === _undefined ? sm2.defaultOptions : oAdd);
    for (o in o2) {
      if (o2.hasOwnProperty(o) && o1[o] === _undefined) {
        if (typeof o2[o] !== 'object' || o2[o] === null) {
          o1[o] = o2[o];
        } else {
          o1[o] = mixin(o1[o], o2[o]);
        }
      }
    }
    return o1;
  };
  wrapCallback = function(oSound, callback) {
    if (!oSound.isHTML5 && fV === 8) {
      window.setTimeout(callback, 0);
    } else {
      callback();
    }
  };
  extraOptions = {
    'onready': 1,
    'ontimeout': 1,
    'defaultOptions': 1,
    'flash9Options': 1,
    'movieStarOptions': 1
  };
  assign = function(o, oParent) {
    var i,
        result = true,
        hasParent = (oParent !== _undefined),
        setupOptions = sm2.setupOptions,
        bonusOptions = extraOptions;
    for (i in o) {
      if (o.hasOwnProperty(i)) {
        if (typeof o[i] !== 'object' || o[i] === null || o[i] instanceof Array || o[i] instanceof RegExp) {
          if (hasParent && bonusOptions[oParent] !== _undefined) {
            sm2[oParent][i] = o[i];
          } else if (setupOptions[i] !== _undefined) {
            sm2.setupOptions[i] = o[i];
            sm2[i] = o[i];
          } else if (bonusOptions[i] === _undefined) {
            result = false;
          } else {
            if (sm2[i] instanceof Function) {
              sm2[i].apply(sm2, (o[i] instanceof Array? o[i] : [o[i]]));
            } else {
              sm2[i] = o[i];
            }
          }
        } else {
          if (bonusOptions[i] === _undefined) {
            result = false;
          } else {
            return assign(o[i], i);
          }
        }
      }
    }
    return result;
  };
  function preferFlashCheck(kind) {
    return (sm2.preferFlash && hasFlash && !sm2.ignoreFlash && (sm2.flash[kind] !== _undefined && sm2.flash[kind]));
  }
  event = (function() {
    var old = (window.attachEvent),
    evt = {
      add: (old?'attachEvent':'addEventListener'),
      remove: (old?'detachEvent':'removeEventListener')
    };
    function getArgs(oArgs) {
      var args = slice.call(oArgs),
          len = args.length;
      if (old) {
        args[1] = 'on' + args[1];
        if (len > 3) {
          args.pop();
        }
      } else if (len === 3) {
        args.push(false);
      }
      return args;
    }
    function apply(args, sType) {
      var element = args.shift(),
          method = [evt[sType]];
      if (old) {
        element[method](args[0], args[1]);
      } else {
        element[method].apply(element, args);
      }
    }
    function add() {
      apply(getArgs(arguments), 'add');
    }
    function remove() {
      apply(getArgs(arguments), 'remove');
    }
    return {
      'add': add,
      'remove': remove
    };
  }());
  function html5_event(oFn) {
    return function(e) {
      var s = this._s,
          result;
      if (!s || !s._a) {
        result = null;
      } else {
        result = oFn.call(this, e);
      }
      return result;
    };
  }
  html5_events = {
    abort: html5_event(function() {
    }),
    canplay: html5_event(function() {
      var s = this._s,
          position1K;
      if (s._html5_canplay) {
        return true;
      }
      s._html5_canplay = true;
      s._onbufferchange(0);
      position1K = (s._iO.position !== _undefined && !isNaN(s._iO.position)?s._iO.position/msecScale:null);
      if (s.position && this.currentTime !== position1K) {
        try {
          this.currentTime = position1K;
        } catch(ee) {
        }
      }
      if (s._iO._oncanplay) {
        s._iO._oncanplay();
      }
    }),
    canplaythrough: html5_event(function() {
      var s = this._s;
      if (!s.loaded) {
        s._onbufferchange(0);
        s._whileloading(s.bytesLoaded, s.bytesTotal, s._get_html5_duration());
        s._onload(true);
      }
    }),
    ended: html5_event(function() {
      var s = this._s;
      s._onfinish();
    }),
    error: html5_event(function() {
      this._s._onload(false);
    }),
    loadeddata: html5_event(function() {
      var s = this._s;
      if (!s._loaded && !isSafari) {
        s.duration = s._get_html5_duration();
      }
    }),
    loadedmetadata: html5_event(function() {
    }),
    loadstart: html5_event(function() {
      this._s._onbufferchange(1);
    }),
    play: html5_event(function() {
      this._s._onbufferchange(0);
    }),
    playing: html5_event(function() {
      this._s._onbufferchange(0);
    }),
    progress: html5_event(function(e) {
      var s = this._s,
          i, j, progStr, buffered = 0,
          isProgress = (e.type === 'progress'),
          ranges = e.target.buffered,
          loaded = (e.loaded||0),
          total = (e.total||1);
      s.buffered = [];
      if (ranges && ranges.length) {
        for (i=0, j=ranges.length; i<j; i++) {
          s.buffered.push({
            'start': ranges.start(i) * msecScale,
            'end': ranges.end(i) * msecScale
          });
        }
        buffered = (ranges.end(0) - ranges.start(0)) * msecScale;
        loaded = Math.min(1, buffered/(e.target.duration*msecScale));
      }
      if (!isNaN(loaded)) {
        s._onbufferchange(0);
        s._whileloading(loaded, total, s._get_html5_duration());
        if (loaded && total && loaded === total) {
          html5_events.canplaythrough.call(this, e);
        }
      }
    }),
    ratechange: html5_event(function() {
    }),
    suspend: html5_event(function(e) {
      var s = this._s;
      html5_events.progress.call(this, e);
      s._onsuspend();
    }),
    stalled: html5_event(function() {
    }),
    timeupdate: html5_event(function() {
      this._s._onTimer();
    }),
    waiting: html5_event(function() {
      var s = this._s;
      s._onbufferchange(1);
    })
  };
  html5OK = function(iO) {
    var result;
    if (!iO || (!iO.type && !iO.url && !iO.serverURL)) {
      result = false;
    } else if (iO.serverURL || (iO.type && preferFlashCheck(iO.type))) {
      result = false;
    } else {
      result = ((iO.type ? html5CanPlay({type:iO.type}) : html5CanPlay({url:iO.url}) || sm2.html5Only || iO.url.match(/data\:/i)));
    }
    return result;
  };
  html5Unload = function(oAudio) {
    var url;
    if (oAudio) {
      url = (isSafari ? emptyURL : (sm2.html5.canPlayType('audio/wav') ? emptyWAV : emptyURL));
      oAudio.src = url;
      if (oAudio._called_unload !== undefined) {
        oAudio._called_load = false;
      }
    }
    if (useGlobalHTML5Audio) {
      lastGlobalHTML5URL = null;
    }
    return url;
  };
  html5CanPlay = function(o) {
    if (!sm2.useHTML5Audio || !sm2.hasHTML5) {
      return false;
    }
    var url = (o.url || null),
        mime = (o.type || null),
        aF = sm2.audioFormats,
        result,
        offset,
        fileExt,
        item;
    if (mime && sm2.html5[mime] !== _undefined) {
      return (sm2.html5[mime] && !preferFlashCheck(mime));
    }
    if (!html5Ext) {
      html5Ext = [];
      for (item in aF) {
        if (aF.hasOwnProperty(item)) {
          html5Ext.push(item);
          if (aF[item].related) {
            html5Ext = html5Ext.concat(aF[item].related);
          }
        }
      }
      html5Ext = new RegExp('\\.('+html5Ext.join('|')+')(\\?.*)?$','i');
    }
    fileExt = (url ? url.toLowerCase().match(html5Ext) : null);
    if (!fileExt || !fileExt.length) {
      if (!mime) {
        result = false;
      } else {
        offset = mime.indexOf(';');
        fileExt = (offset !== -1?mime.substr(0,offset):mime).substr(6);
      }
    } else {
      fileExt = fileExt[1];
    }
    if (fileExt && sm2.html5[fileExt] !== _undefined) {
      result = (sm2.html5[fileExt] && !preferFlashCheck(fileExt));
    } else {
      mime = 'audio/'+fileExt;
      result = sm2.html5.canPlayType({type:mime});
      sm2.html5[fileExt] = result;
      result = (result && sm2.html5[mime] && !preferFlashCheck(mime));
    }
    return result;
  };
  testHTML5 = function() {
    if (!sm2.useHTML5Audio || !sm2.hasHTML5) {
      sm2.html5.usingFlash = true;
      needsFlash = true;
      return false;
    }
    var a = (Audio !== _undefined ? (isOpera && opera.version() < 10 ? new Audio(null) : new Audio()) : null),
        item, lookup, support = {}, aF, i;
    function cp(m) {
      var canPlay, j,
          result = false,
          isOK = false;
      if (!a || typeof a.canPlayType !== 'function') {
        return result;
      }
      if (m instanceof Array) {
        for (i=0, j=m.length; i<j; i++) {
          if (sm2.html5[m[i]] || a.canPlayType(m[i]).match(sm2.html5Test)) {
            isOK = true;
            sm2.html5[m[i]] = true;
            sm2.flash[m[i]] = !!(m[i].match(flashMIME));
          }
        }
        result = isOK;
      } else {
        canPlay = (a && typeof a.canPlayType === 'function' ? a.canPlayType(m) : false);
        result = !!(canPlay && (canPlay.match(sm2.html5Test)));
      }
      return result;
    }
    aF = sm2.audioFormats;
    for (item in aF) {
      if (aF.hasOwnProperty(item)) {
        lookup = 'audio/' + item;
        support[item] = cp(aF[item].type);
        support[lookup] = support[item];
        if (item.match(flashMIME)) {
          sm2.flash[item] = true;
          sm2.flash[lookup] = true;
        } else {
          sm2.flash[item] = false;
          sm2.flash[lookup] = false;
        }
        if (aF[item] && aF[item].related) {
          for (i=aF[item].related.length-1; i >= 0; i--) {
            support['audio/'+aF[item].related[i]] = support[item];
            sm2.html5[aF[item].related[i]] = support[item];
            sm2.flash[aF[item].related[i]] = support[item];
          }
        }
      }
    }
    support.canPlayType = (a?cp:null);
    sm2.html5 = mixin(sm2.html5, support);
    sm2.html5.usingFlash = featureCheck();
    needsFlash = sm2.html5.usingFlash;
    return true;
  };
  strings = {
  };
  str = function() {
  };
  loopFix = function(sOpt) {
    if (fV === 8 && sOpt.loops > 1 && sOpt.stream) {
      sOpt.stream = false;
    }
    return sOpt;
  };
  policyFix = function(sOpt, sPre) {
    if (sOpt && !sOpt.usePolicyFile && (sOpt.onid3 || sOpt.usePeakData || sOpt.useWaveformData || sOpt.useEQData)) {
      sOpt.usePolicyFile = true;
    }
    return sOpt;
  };
  complain = function(sMsg) {
  };
  doNothing = function() {
    return false;
  };
  disableObject = function(o) {
    var oProp;
    for (oProp in o) {
      if (o.hasOwnProperty(oProp) && typeof o[oProp] === 'function') {
        o[oProp] = doNothing;
      }
    }
    oProp = null;
  };
  failSafely = function(bNoDisable) {
    if (bNoDisable === _undefined) {
      bNoDisable = false;
    }
    if (disabled || bNoDisable) {
      sm2.disable(bNoDisable);
    }
  };
  normalizeMovieURL = function(smURL) {
    var urlParams = null, url;
    if (smURL) {
      if (smURL.match(/\.swf(\?.*)?$/i)) {
        urlParams = smURL.substr(smURL.toLowerCase().lastIndexOf('.swf?') + 4);
        if (urlParams) {
          return smURL;
        }
      } else if (smURL.lastIndexOf('/') !== smURL.length - 1) {
        smURL += '/';
      }
    }
    url = (smURL && smURL.lastIndexOf('/') !== - 1 ? smURL.substr(0, smURL.lastIndexOf('/') + 1) : './') + sm2.movieURL;
    if (sm2.noSWFCache) {
      url += ('?ts=' + new Date().getTime());
    }
    return url;
  };
  setVersionInfo = function() {
    fV = parseInt(sm2.flashVersion, 10);
    if (fV !== 8 && fV !== 9) {
      sm2.flashVersion = fV = defaultFlashVersion;
    }
    var isDebug = (sm2.debugMode || sm2.debugFlash?'_debug.swf':'.swf');
    if (sm2.useHTML5Audio && !sm2.html5Only && sm2.audioFormats.mp4.required && fV < 9) {
      sm2.flashVersion = fV = 9;
    }
    sm2.version = sm2.versionNumber + (sm2.html5Only?' (HTML5-only mode)':(fV === 9?' (AS3/Flash 9)':' (AS2/Flash 8)'));
    if (fV > 8) {
      sm2.defaultOptions = mixin(sm2.defaultOptions, sm2.flash9Options);
      sm2.features.buffering = true;
      sm2.defaultOptions = mixin(sm2.defaultOptions, sm2.movieStarOptions);
      sm2.filePatterns.flash9 = new RegExp('\\.(mp3|' + netStreamTypes.join('|') + ')(\\?.*)?$', 'i');
      sm2.features.movieStar = true;
    } else {
      sm2.features.movieStar = false;
    }
    sm2.filePattern = sm2.filePatterns[(fV !== 8?'flash9':'flash8')];
    sm2.movieURL = (fV === 8?'soundmanager2.swf':'soundmanager2_flash9.swf').replace('.swf', isDebug);
    sm2.features.peakData = sm2.features.waveformData = sm2.features.eqData = (fV > 8);
  };
  setPolling = function(bPolling, bHighPerformance) {
    if (!flash) {
      return false;
    }
    flash._setPolling(bPolling, bHighPerformance);
  };
  initDebug = function() {
  };
  idCheck = this.getSoundById;
  getSWFCSS = function() {
    var css = [];
    if (sm2.debugMode) {
      css.push(swfCSS.sm2Debug);
    }
    if (sm2.debugFlash) {
      css.push(swfCSS.flashDebug);
    }
    if (sm2.useHighPerformance) {
      css.push(swfCSS.highPerf);
    }
    return css.join(' ');
  };
  flashBlockHandler = function() {
    var name = str('fbHandler'),
        p = sm2.getMoviePercent(),
        css = swfCSS,
        error = {type:'FLASHBLOCK'};
    if (sm2.html5Only) {
      return false;
    }
    if (!sm2.ok()) {
      if (needsFlash) {
        sm2.oMC.className = getSWFCSS() + ' ' + css.swfDefault + ' ' + (p === null?css.swfTimedout:css.swfError);
      }
      sm2.didFlashBlock = true;
      processOnEvents({type:'ontimeout', ignoreInit:true, error:error});
      catchError(error);
    } else {
      if (sm2.oMC) {
        sm2.oMC.className = [getSWFCSS(), css.swfDefault, css.swfLoaded + (sm2.didFlashBlock?' '+css.swfUnblocked:'')].join(' ');
      }
    }
  };
  addOnEvent = function(sType, oMethod, oScope) {
    if (on_queue[sType] === _undefined) {
      on_queue[sType] = [];
    }
    on_queue[sType].push({
      'method': oMethod,
      'scope': (oScope || null),
      'fired': false
    });
  };
  processOnEvents = function(oOptions) {
    if (!oOptions) {
      oOptions = {
        type: (sm2.ok() ? 'onready' : 'ontimeout')
      };
    }
    if (!didInit && oOptions && !oOptions.ignoreInit) {
      return false;
    }
    if (oOptions.type === 'ontimeout' && (sm2.ok() || (disabled && !oOptions.ignoreInit))) {
      return false;
    }
    var status = {
          success: (oOptions && oOptions.ignoreInit?sm2.ok():!disabled)
        },
        srcQueue = (oOptions && oOptions.type?on_queue[oOptions.type]||[]:[]),
        queue = [], i, j,
        args = [status],
        canRetry = (needsFlash && !sm2.ok());
    if (oOptions.error) {
      args[0].error = oOptions.error;
    }
    for (i = 0, j = srcQueue.length; i < j; i++) {
      if (srcQueue[i].fired !== true) {
        queue.push(srcQueue[i]);
      }
    }
    if (queue.length) {
      for (i = 0, j = queue.length; i < j; i++) {
        if (queue[i].scope) {
          queue[i].method.apply(queue[i].scope, args);
        } else {
          queue[i].method.apply(this, args);
        }
        if (!canRetry) {
          queue[i].fired = true;
        }
      }
    }
    return true;
  };
  initUserOnload = function() {
    window.setTimeout(function() {
      if (sm2.useFlashBlock) {
        flashBlockHandler();
      }
      processOnEvents();
      if (typeof sm2.onload === 'function') {
        sm2.onload.apply(window);
      }
      if (sm2.waitForWindowLoad) {
        event.add(window, 'load', initUserOnload);
      }
    },1);
  };
  detectFlash = function() {
    if (hasFlash !== _undefined) {
      return hasFlash;
    }
    var hasPlugin = false, n = navigator, nP = n.plugins, obj, type, types, AX = window.ActiveXObject;
    if (nP && nP.length) {
      type = 'application/x-shockwave-flash';
      types = n.mimeTypes;
      if (types && types[type] && types[type].enabledPlugin && types[type].enabledPlugin.description) {
        hasPlugin = true;
      }
    } else if (AX !== _undefined && !ua.match(/MSAppHost/i)) {
      try {
        obj = new AX('ShockwaveFlash.ShockwaveFlash');
      } catch(e) {
        obj = null;
      }
      hasPlugin = (!!obj);
      obj = null;
    }
    hasFlash = hasPlugin;
    return hasPlugin;
  };
  featureCheck = function() {
    var flashNeeded,
        item,
        formats = sm2.audioFormats,
        isSpecial = (is_iDevice && !!(ua.match(/os (1|2|3_0|3_1)/i)));
    if (isSpecial) {
      sm2.hasHTML5 = false;
      sm2.html5Only = true;
      if (sm2.oMC) {
        sm2.oMC.style.display = 'none';
      }
    } else {
      if (sm2.useHTML5Audio) {
        if (!sm2.html5 || !sm2.html5.canPlayType) {
          sm2.hasHTML5 = false;
        }
      }
    }
    if (sm2.useHTML5Audio && sm2.hasHTML5) {
      canIgnoreFlash = true;
      for (item in formats) {
        if (formats.hasOwnProperty(item)) {
          if (formats[item].required) {
            if (!sm2.html5.canPlayType(formats[item].type)) {
              canIgnoreFlash = false;
              flashNeeded = true;
            } else if (sm2.preferFlash && (sm2.flash[item] || sm2.flash[formats[item].type])) {
              flashNeeded = true;
            }
          }
        }
      }
    }
    if (sm2.ignoreFlash) {
      flashNeeded = false;
      canIgnoreFlash = true;
    }
    sm2.html5Only = (sm2.hasHTML5 && sm2.useHTML5Audio && !flashNeeded);
    return (!sm2.html5Only);
  };
  parseURL = function(url) {
    var i, j, urlResult = 0, result;
    if (url instanceof Array) {
      for (i=0, j=url.length; i<j; i++) {
        if (url[i] instanceof Object) {
          if (sm2.canPlayMIME(url[i].type)) {
            urlResult = i;
            break;
          }
        } else if (sm2.canPlayURL(url[i])) {
          urlResult = i;
          break;
        }
      }
      if (url[urlResult].url) {
        url[urlResult] = url[urlResult].url;
      }
      result = url[urlResult];
    } else {
      result = url;
    }
    return result;
  };
  startTimer = function(oSound) {
    if (!oSound._hasTimer) {
      oSound._hasTimer = true;
      if (!mobileHTML5 && sm2.html5PollingInterval) {
        if (h5IntervalTimer === null && h5TimerCount === 0) {
          h5IntervalTimer = setInterval(timerExecute, sm2.html5PollingInterval);
        }
        h5TimerCount++;
      }
    }
  };
  stopTimer = function(oSound) {
    if (oSound._hasTimer) {
      oSound._hasTimer = false;
      if (!mobileHTML5 && sm2.html5PollingInterval) {
        h5TimerCount--;
      }
    }
  };
  timerExecute = function() {
    var i;
    if (h5IntervalTimer !== null && !h5TimerCount) {
      clearInterval(h5IntervalTimer);
      h5IntervalTimer = null;
      return false;
    }
    for (i = sm2.soundIDs.length-1; i >= 0; i--) {
      if (sm2.sounds[sm2.soundIDs[i]].isHTML5 && sm2.sounds[sm2.soundIDs[i]]._hasTimer) {
        sm2.sounds[sm2.soundIDs[i]]._onTimer();
      }
    }
  };
  catchError = function(options) {
    options = (options !== _undefined ? options : {});
    if (typeof sm2.onerror === 'function') {
      sm2.onerror.apply(window, [{type:(options.type !== _undefined ? options.type : null)}]);
    }
    if (options.fatal !== _undefined && options.fatal) {
      sm2.disable();
    }
  };
  badSafariFix = function() {
    if (!isBadSafari || !detectFlash()) {
      return false;
    }
    var aF = sm2.audioFormats, i, item;
    for (item in aF) {
      if (aF.hasOwnProperty(item)) {
        if (item === 'mp3' || item === 'mp4') {
          sm2.html5[item] = false;
          if (aF[item] && aF[item].related) {
            for (i = aF[item].related.length-1; i >= 0; i--) {
              sm2.html5[aF[item].related[i]] = false;
            }
          }
        }
      }
    }
  };
  this._setSandboxType = function(sandboxType) {
  };
  this._externalInterfaceOK = function(swfVersion) {
    if (sm2.swfLoaded) {
      return false;
    }
    var e;
    sm2.swfLoaded = true;
    tryInitOnFocus = false;
    if (isBadSafari) {
      badSafariFix();
    }
    setTimeout(init, isIE ? 100 : 1);
  };
  createMovie = function(smID, smURL) {
    if (didAppend && appendSuccess) {
      return false;
    }
    function initMsg() {
    }
    if (sm2.html5Only) {
      setVersionInfo();
      initMsg();
      sm2.oMC = id(sm2.movieID);
      init();
      didAppend = true;
      appendSuccess = true;
      return false;
    }
    var remoteURL = (smURL || sm2.url),
    localURL = (sm2.altURL || remoteURL),
    swfTitle = 'JS/Flash audio component (SoundManager 2)',
    oTarget = getDocument(),
    extraClass = getSWFCSS(),
    isRTL = null,
    html = doc.getElementsByTagName('html')[0],
    oEmbed, oMovie, tmp, movieHTML, oEl, s, x, sClass;
    isRTL = (html && html.dir && html.dir.match(/rtl/i));
    smID = (smID === _undefined?sm2.id:smID);
    function param(name, value) {
      return '<param name="'+name+'" value="'+value+'" />';
    }
    setVersionInfo();
    sm2.url = normalizeMovieURL(overHTTP?remoteURL:localURL);
    smURL = sm2.url;
    sm2.wmode = (!sm2.wmode && sm2.useHighPerformance ? 'transparent' : sm2.wmode);
    if (sm2.wmode !== null && (ua.match(/msie 8/i) || (!isIE && !sm2.useHighPerformance)) && navigator.platform.match(/win32|win64/i)) {
       messages.push(strings.spcWmode);
      sm2.wmode = null;
    }
    oEmbed = {
      'name': smID,
      'id': smID,
      'src': smURL,
      'quality': 'high',
      'allowScriptAccess': sm2.allowScriptAccess,
      'bgcolor': sm2.bgColor,
      'pluginspage': http+'www.macromedia.com/go/getflashplayer',
      'title': swfTitle,
      'type': 'application/x-shockwave-flash',
      'wmode': sm2.wmode,
      'hasPriority': 'true'
    };
    if (sm2.debugFlash) {
      oEmbed.FlashVars = 'debug=1';
    }
    if (!sm2.wmode) {
      delete oEmbed.wmode;
    }
    if (isIE) {
      oMovie = doc.createElement('div');
      movieHTML = [
        '<object id="' + smID + '" data="' + smURL + '" type="' + oEmbed.type + '" title="' + oEmbed.title +'" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" codebase="' + http+'download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=6,0,40,0">',
        param('movie', smURL),
        param('AllowScriptAccess', sm2.allowScriptAccess),
        param('quality', oEmbed.quality),
        (sm2.wmode? param('wmode', sm2.wmode): ''),
        param('bgcolor', sm2.bgColor),
        param('hasPriority', 'true'),
        (sm2.debugFlash ? param('FlashVars', oEmbed.FlashVars) : ''),
        '</object>'
      ].join('');
    } else {
      oMovie = doc.createElement('embed');
      for (tmp in oEmbed) {
        if (oEmbed.hasOwnProperty(tmp)) {
          oMovie.setAttribute(tmp, oEmbed[tmp]);
        }
      }
    }
    initDebug();
    extraClass = getSWFCSS();
    oTarget = getDocument();
    if (oTarget) {
      sm2.oMC = (id(sm2.movieID) || doc.createElement('div'));
      if (!sm2.oMC.id) {
        sm2.oMC.id = sm2.movieID;
        sm2.oMC.className = swfCSS.swfDefault + ' ' + extraClass;
        s = null;
        oEl = null;
        if (!sm2.useFlashBlock) {
          if (sm2.useHighPerformance) {
            s = {
              'position': 'fixed',
              'width': '8px',
              'height': '8px',
              'bottom': '0px',
              'left': '0px',
              'overflow': 'hidden'
            };
          } else {
            s = {
              'position': 'absolute',
              'width': '6px',
              'height': '6px',
              'top': '-9999px',
              'left': '-9999px'
            };
            if (isRTL) {
              s.left = Math.abs(parseInt(s.left,10))+'px';
            }
          }
        }
        if (isWebkit) {
          sm2.oMC.style.zIndex = 10000;
        }
        if (!sm2.debugFlash) {
          for (x in s) {
            if (s.hasOwnProperty(x)) {
              sm2.oMC.style[x] = s[x];
            }
          }
        }
        try {
          if (!isIE) {
            sm2.oMC.appendChild(oMovie);
          }
          oTarget.appendChild(sm2.oMC);
          if (isIE) {
            oEl = sm2.oMC.appendChild(doc.createElement('div'));
            oEl.className = swfCSS.swfBox;
            oEl.innerHTML = movieHTML;
          }
          appendSuccess = true;
        } catch(e) {
          throw new Error(str('domError')+' \n'+e.toString());
        }
      } else {
        sClass = sm2.oMC.className;
        sm2.oMC.className = (sClass?sClass+' ':swfCSS.swfDefault) + (extraClass?' '+extraClass:'');
        sm2.oMC.appendChild(oMovie);
        if (isIE) {
          oEl = sm2.oMC.appendChild(doc.createElement('div'));
          oEl.className = swfCSS.swfBox;
          oEl.innerHTML = movieHTML;
        }
        appendSuccess = true;
      }
    }
    didAppend = true;
    initMsg();
    return true;
  };
  initMovie = function() {
    if (sm2.html5Only) {
      createMovie();
      return false;
    }
    if (flash) {
      return false;
    }
    if (!sm2.url) {
       return false;
    }
    flash = sm2.getMovie(sm2.id);
    if (!flash) {
      if (!oRemoved) {
        createMovie(sm2.id, sm2.url);
      } else {
        if (!isIE) {
          sm2.oMC.appendChild(oRemoved);
        } else {
          sm2.oMC.innerHTML = oRemovedHTML;
        }
        oRemoved = null;
        didAppend = true;
      }
      flash = sm2.getMovie(sm2.id);
    }
    if (typeof sm2.oninitmovie === 'function') {
      setTimeout(sm2.oninitmovie, 1);
    }
    return true;
  };
  delayWaitForEI = function() {
    setTimeout(waitForEI, 1000);
  };
  rebootIntoHTML5 = function() {
    window.setTimeout(function() {
      sm2.setup({
        preferFlash: false
      }).reboot();
      sm2.didFlashBlock = true;
      sm2.beginDelayedInit();
    }, 1);
  };
  waitForEI = function() {
    var p,
        loadIncomplete = false;
    if (!sm2.url) {
      return false;
    }
    if (waitingForEI) {
      return false;
    }
    waitingForEI = true;
    event.remove(window, 'load', delayWaitForEI);
    if (hasFlash && tryInitOnFocus && !isFocused) {
      return false;
    }
    if (!didInit) {
      p = sm2.getMoviePercent();
      if (p > 0 && p < 100) {
        loadIncomplete = true;
      }
    }
    setTimeout(function() {
      p = sm2.getMoviePercent();
      if (loadIncomplete) {
        waitingForEI = false;
        window.setTimeout(delayWaitForEI, 1);
        return false;
      }
      if (!didInit && okToDisable) {
        if (p === null) {
          if (sm2.useFlashBlock || sm2.flashLoadTimeout === 0) {
            if (sm2.useFlashBlock) {
              flashBlockHandler();
            }
          } else {
            if (!sm2.useFlashBlock && canIgnoreFlash) {
              rebootIntoHTML5();
            } else {
              processOnEvents({type:'ontimeout', ignoreInit: true, error: {type: 'INIT_FLASHBLOCK'}});
            }
          }
        } else {
          if (sm2.flashLoadTimeout === 0) {
          } else {
            if (!sm2.useFlashBlock && canIgnoreFlash) {
              rebootIntoHTML5();
            } else {
              failSafely(true);
            }
          }
        }
      }
    }, sm2.flashLoadTimeout);
  };
  handleFocus = function() {
    function cleanup() {
      event.remove(window, 'focus', handleFocus);
    }
    if (isFocused || !tryInitOnFocus) {
      cleanup();
      return true;
    }
    okToDisable = true;
    isFocused = true;
    waitingForEI = false;
    delayWaitForEI();
    cleanup();
    return true;
  };
  flushMessages = function() {
  };
  showSupport = function() {
  };
  initComplete = function(bNoDisable) {
    if (didInit) {
      return false;
    }
    if (sm2.html5Only) {
      didInit = true;
      initUserOnload();
      return true;
    }
    var wasTimeout = (sm2.useFlashBlock && sm2.flashLoadTimeout && !sm2.getMoviePercent()),
        result = true,
        error;
    if (!wasTimeout) {
      didInit = true;
    }
    error = {type: (!hasFlash && needsFlash ? 'NO_FLASH' : 'INIT_TIMEOUT')};
    if (disabled || bNoDisable) {
      if (sm2.useFlashBlock && sm2.oMC) {
        sm2.oMC.className = getSWFCSS() + ' ' + (sm2.getMoviePercent() === null?swfCSS.swfTimedout:swfCSS.swfError);
      }
      processOnEvents({type:'ontimeout', error:error, ignoreInit: true});
      catchError(error);
      result = false;
    } else {
    }
    if (!disabled) {
      if (sm2.waitForWindowLoad && !windowLoaded) {
        event.add(window, 'load', initUserOnload);
      } else {
        initUserOnload();
      }
    }
    return result;
  };
  setProperties = function() {
    var i,
        o = sm2.setupOptions;
    for (i in o) {
      if (o.hasOwnProperty(i)) {
        if (sm2[i] === _undefined) {
          sm2[i] = o[i];
        } else if (sm2[i] !== o[i]) {
          sm2.setupOptions[i] = sm2[i];
        }
      }
    }
  };
  init = function() {
    if (didInit) {
      return false;
    }
    function cleanup() {
      event.remove(window, 'load', sm2.beginDelayedInit);
    }
    if (sm2.html5Only) {
      if (!didInit) {
        cleanup();
        sm2.enabled = true;
        initComplete();
      }
      return true;
    }
    initMovie();
    try {
      flash._externalInterfaceTest(false);
      setPolling(true, (sm2.flashPollingInterval || (sm2.useHighPerformance ? 10 : 50)));
      if (!sm2.debugMode) {
        flash._disableDebug();
      }
      sm2.enabled = true;
      if (!sm2.html5Only) {
        event.add(window, 'unload', doNothing);
      }
    } catch(e) {
      catchError({type:'JS_TO_FLASH_EXCEPTION', fatal:true});
      failSafely(true);
      initComplete();
      return false;
    }
    initComplete();
    cleanup();
    return true;
  };
  domContentLoaded = function() {
    if (didDCLoaded) {
      return false;
    }
    didDCLoaded = true;
    setProperties();
    initDebug();
    if (!hasFlash && sm2.hasHTML5) {
      sm2.setup({
        'useHTML5Audio': true,
        'preferFlash': false
      });
    }
    testHTML5();
    if (!hasFlash && needsFlash) {
      messages.push(strings.needFlash);
      sm2.setup({
        'flashLoadTimeout': 1
      });
    }
    if (doc.removeEventListener) {
      doc.removeEventListener('DOMContentLoaded', domContentLoaded, false);
    }
    initMovie();
    return true;
  };
  domContentLoadedIE = function() {
    if (doc.readyState === 'complete') {
      domContentLoaded();
      doc.detachEvent('onreadystatechange', domContentLoadedIE);
    }
    return true;
  };
  winOnLoad = function() {
    windowLoaded = true;
    domContentLoaded();
    event.remove(window, 'load', winOnLoad);
  };
  preInit = function() {
    if (mobileHTML5) {
      sm2.setupOptions.useHTML5Audio = true;
      sm2.setupOptions.preferFlash = false;
      if (is_iDevice || (isAndroid && !ua.match(/android\s2\.3/i))) {
        if (is_iDevice) {
          sm2.ignoreFlash = true;
        }
        useGlobalHTML5Audio = true;
      }
    }
  };
  preInit();
  detectFlash();
  event.add(window, 'focus', handleFocus);
  event.add(window, 'load', delayWaitForEI);
  event.add(window, 'load', winOnLoad);
  if (doc.addEventListener) {
    doc.addEventListener('DOMContentLoaded', domContentLoaded, false);
  } else if (doc.attachEvent) {
    doc.attachEvent('onreadystatechange', domContentLoadedIE);
  } else {
    catchError({type:'NO_DOM2_EVENTS', fatal:true});
  }
}
// SM2_DEFER details: http://www.schillmania.com/projects/soundmanager2/doc/getstarted/#lazy-loading
if (window.SM2_DEFER === undefined || !SM2_DEFER) {
  soundManager = new SoundManager();
}
window.SoundManager = SoundManager;
window.soundManager = soundManager;
}(window));

define("Soundmanager", (function (global) {
    return function () {
        var ret, fn;
        return ret || global.SoundManager;
    };
}(this)));

/*global define:false */

/*
 * The speaker object encapsulates the SoundManager2 code and boils it down
 * to the following api:
 *
 *    speaker().initializeForMobile: mobile clients can only start using
 *      speaker when handling an 'onClick' event. This call should be made 
 *      at that time to get sound initialized while waiting for details
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
 *          play:           event handler for 'play' event
 *          pause:          event handler for 'pause' event
 *          finish:         event handler for 'finish' event
 *
 *       The returned object emits the following events:
 *         play: the song has started playing or resumed playing after pause
 *         pause: the song has paused playback
 *         finish: the song has completed playback and the song object
 *           is no longer usable and should be destroyed
 *
 *       The events should be received in this order only:
 *         ( play -> ( pause | play )* -> )? finish
 *
 *       Note that I represent play failures as a 'finish' call, so if
 *       we can't load a song, it will just get a 'finish' and no 'play'
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
 *   swfBase: URL pointing to directory containing 'soundmanager2.swf' file 
 *            for flash fallback
 *   preferFlash: if true, opt to use the flash plugin rather than the
 *                browser's 'audio' tag
 *   debug: if true, emit debug information to the console
 *   silence: URL to an mp3 with no sound, for initializing mobile clients
 *   secure: if true, default URLs for the soundmanager2.swf and silence mp3
 *                will come from 'https' locations
 *
 * 'onReady' is also optional, and is a callback that will be called as
 * soon as the sond system is initialized (or immediately if it was already
 * initialized) and it will be given a string that lists supported
 * audio formats, suitable for passing to Feed.Session.setFormats().
 *
 * The first function call to 'speaker()' is what configures and defines the
 * speaker - and subsequent calls just return the already-created instance.
 * I think this is a poor interface, but I don't have a better one at the
 * moment.
 *
 * This code uses the wonderful SoundManager2 api and falls back to
 * the soundmanager2 flash plugin if HTML5 audio isn't available. 
 *
 */

define('feed/speaker',[ 'underscore', 'jquery', 'feed/log', 'feed/events', 'feed/util', 'Soundmanager' ], function(_, $, log, Events, util, SoundManager) {

  var Sound = function(options) { 
    var obj = _.extend(this, Events);

    if (options) {
      if ('startPosition' in options) {
        this.startPosition = options.startPosition;
      }

      _.each(['play', 'pause', 'finish', 'elapse'], function(ev) {
        if (ev in options) {
          obj.on(ev, options[ev]);
        }
      });
    }

    return obj;
  };

  Sound.prototype = {
    play: function() {
      if (this.sm2Sound) {
        if (!this.sm2Sound.fake && this.startPosition) {
          var startPosition = this.startPosition;

          this.sm2Sound.load({
            whileloading: function() {
              if ((this.playState === 0) && (this.duration > startPosition)) {
                // start playback as soon as we can
                this.setPosition(startPosition);
                this.play();
              }
            }
          });
        } else {
          this.sm2Sound.play();
        }
      }
    },

    // pause playback of the current sound clip
    pause: function() {
      if (this.sm2Sound) {
        this.sm2Sound.pause();
      }
    },

    // resume playback of the current sound clip
    resume: function() {
      if (this.sm2Sound) {
        this.sm2Sound.resume();
      }
    },

    // elapsed number of milliseconds played
    position: function() {
      if (this.sm2Sound) {
        return this.sm2Sound.position;
      } else {
        return 0;
      }
    },

    // duration in milliseconds of the song
    // (this may change until the song is full loaded)
    duration: function() {
      if (this.sm2Sound) {
        var d = this.sm2Sound.duration;
        return d ? d : 1;
      } else {
        return 1;
      }
    },

    // stop playing the given sound clip, unload it, and disable events
    destroy: function() {
      log('destroy triggered for', this.id);

      if (this.sm2Sound) {
        delete speaker.outstandingPlays[this.id];
        this.sm2Sound.destruct();
        this.sm2Sound = null;
      }

      this.off();
    },

    _nonRepeatTrigger: function(event) {
      if (this.lastTrigger !== event) {
        this.lastTrigger = event;
        this.trigger.apply(this, Array.prototype.slice.call(arguments, 0));
      }
    }
  };

  var Speaker = function(options) {
    var speaker = this;

    options = options || {};

    this.onReadyPromise = $.Deferred();

    var config = {
      wmode: 'transparent',
      useHighPerformance: true,
      flashPollingInterval: 500,
      html5PollingInterval: 500,
      debugMode: options.debug || false,
      debugFlash: options.debug || false,
      preferFlash: options.preferFlash || false,
      url: util.addProtocol(options.swfBase || '//feed.fm/js/latest/', options.secure),
      onready: function() {
        var preferred;

        if (window.soundManager.canPlayMIME('audio/aac')) {
          // some clients play aac, and we prefer that
          preferred = 'aac,mp3';
        } else {
          // every client plays mp3
          preferred = 'mp3';
        }

        speaker.onReadyPromise.resolve(preferred);
      }
    };

    // The SoundManager library likes to watch for the onpageload
    // event and initialize itself as soon as the page loads. This
    // causes problems when SoundManager is loaded up lazily by requirejs
    // vs packaged with all the Feed SDK. When packaging things up,
    // we prefix all the code with 'window.SM2_DEFER = true;' to prevent
    // the code from initializing on load, but then the SoundManager
    // code doesn't make the 'window.soundManager' singleton, so we do that
    // here
    if (!window.soundManager) {
      window.soundManager = new SoundManager();
    }
    
    window.soundManager.setup(config);

    this.silence = util.addProtocol(options.silence || '//feed.fm/js/latest/5seconds.mp3', options.secure);

  };

  Speaker.prototype = {
    vol: 100,
    outstandingPlays: { },
    mobileInitialized: false,
    onReadyPromise: null,

    initializeForMobile: function() {
      if (!this.mobileInitialized) {
        // Just play a blank mp3 file that we know the location of, presumably
        // while we ping the server for the song we want
        var sound = this._createSM2Sound({
          id: 'silence',
          url: this.silence,
          volume: 0,
          autoPlay: true,
          type: 'audio/mp3'
        });

        this.mobileInitialized = !sound.fake;
      }
    },

    // start playing the given clip and return sound object
    create: function(url, callbacks) {
      var sound = new Sound(callbacks);
      sound.id = _.uniqueId('play');
      sound.url = url;

      this.outstandingPlays[sound.id] = sound;

      this._createAndAssignSM2Sound(sound);

      return sound;
    },

    _createSM2Sound: function(options) { 
      return window.soundManager.createSound(options);
    },

    _createAndAssignSM2Sound: function(sound) {
      var speaker = this;

      sound.sm2Sound = this._createSM2Sound({
        id: sound.id,
        url: sound.url,
        volume: speaker.vol,
        autoPlay: false,
        type: 'audio/mp3',
        onfinish: function() {
          log(sound.id + ': onfinish');
          this.destruct();
          delete speaker.outstandingPlays[sound.id];
          sound._nonRepeatTrigger('finish');
        },
        onid3: function() {
          log(sound.id + ': onid3');
        },
        onstop: function() {
          log(sound.id + ': onstop');
        },
        onsuspend: function() {
          log(sound.id + ': suspend');
        },
        onresume: function() {
          log(sound.id + ': onresume');
          sound._nonRepeatTrigger('play');
        },
        onplay: function() {
          log(sound.id + ': onplay');
          sound._nonRepeatTrigger('play');
        },
        onpause: function() {
          log(sound.id + ': pause');
          sound._nonRepeatTrigger('pause');
        },
        onload: function(success) {
          log(sound.id + ': onload', success);
          if (!success) {
           log(sound.id + ' failure!');
            sound._nonRepeatTrigger('finish');
            // consider this a failure
            sound.destroy();
          }
        },
        ondataerror: function() {
          log(sound.id + ': ondataerror');
          sound._nonRepeatTrigger('finish');
          sound.destroy();
        },
        onconnect: function() {
          log(sound.id + ': onconnect' );
        },
        onbufferchange: function() {
          log(sound.id + ': onbufferchange');
        },
        whileplaying: function() {
          sound.trigger('elapse');
        }
      });

      return sound;
    },

    // set or get the volume (0-100)
    setVolume: function(value) {
      if (typeof value !== 'undefined') {
        this.vol = value;

        _.each(this.outstandingPlays, function(song) {
          song.sm2Sound.setVolume(value);
        });

        this.trigger('volume', value);
      }

      return this.vol;
    }

  };

  // add events to speaker class
  _.extend(Speaker.prototype, Events);

  var speaker = null;

  // there should only ever be a single instance of 'Speaker'
  return function(options, onReady) {
    if (speaker === null) {
      speaker = new Speaker(options);
    }

    if (onReady) {
      speaker.onReadyPromise.then(function(formats) {
        onReady(formats);
      });
    }

    return speaker;
  };

});

/*global define:false */
/*jshint camelcase:false */

/*
 *  Feed Media Player
 *
 *  This class requests and plays audio files from the feed servers. It
 *  makes use of the Session class to communicate with the server. There
 *  should technically only ever be one instance of this class in a page.
 *  This class does no UI - that should be handled by Feed.PlayerView 
 *  or similar.
 *
 *  Create this with:
 *    player = new Feed.Player(token, secret[, options])
 *
 *  (where 'options' is an optional object that is passed to the
 *   feed/speaker function and the feed/session constructor. Normally
 *   you'd only use a value of '{ secure: true }' to use HTTPS for all
 *   communications)
 *
 *  Then set the optional placement and station that we're pulling
 *  from:
 *
 *    player.setPlacementId(xxx);
 *      set placement on session, which should stop any current plays
 *    player.setStationId(xxx);
 *      set station on session, which should stop any current plays
 *
 *  Then control playback with:
 *
 *    tune() - load up information about the current placement, but
 *      don't actually start playing it.
 *    play() - start playing the current placement/station or resume the current song
 *    pause() - pause playback of the current song, if any
 *    like() - tell the server we like this song
 *    unlike() - tell the server to remove the 'like' for this song
 *    dislike() - tell the server we dislike this song, and skip to the next one
 *    skip() - request to skip the current song
 *
 *  player has a current state that can be queried with 'getCurrentState()':
 *    playing - if session.hasActivePlayStarted() and we're not paused
 *    paused -  if session.hasActivePlayStarted() and we're paused
 *    idle - if !session.hasActivePlayStarted()
 *    suspended - if player.suspend() has been called (ie - the player has
 *      been popped out into a new window)
 *
 *  session events are proxied via the play object:
 *    not-in-us - user isn't located in the US and can't play music
 *    placement - information about the placement we just tuned to
 *    play-active - this play is queued up and ready for playback
 *    play-started - this play has begun playback
 *    play-completed  - this play has completed playback
 *    plays-exhausted - there are no more plays available from this placement/station combo
 *    skip-denied - the given song could not be skipped due to DMCA rules
 *  
 *  and the play object adds some new events:
 *    play-paused - the currently playing song was paused
 *    play-resumed - the currently playing song was resumed
 *    play-liked - the currently playing song was liked
 *    play-unliked - the currently playing song had it's 'like' status removed
 *    play-disliked - the currently playing song was disliked
 *    suspend - player.suspend() was called, and the player should stop playback
 *
 *  Some misc methods:
 *
 *    setMuted(muted)
 *    suspend - this returns the state of the player a an object that can be passed
 *      to the unsuspend() call.
 *    unsuspend(state, [startPlay]) - this call takes the state of a previously suspended player
 *      instance and makes this player match that one. These calls allow you to suspend
 *      the player, open up a new window, create a new player instance, and resume playback
 *      where you left off. This call should be made in place of a tune() or play() call.
 *
 */

define('feed/player',[ 'underscore', 'jquery', 'feed/log', 'feed/speaker', 'feed/events', 'feed/session' ], function(_, $, log, getSpeaker, Events, Session) {

  function supports_html5_storage() {
    try {
      return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
      return false;
    }
  }

  var Player = function(token, secret, options) {
    this.state = {
      paused: true,
      suspended: false
      // activePlay
    };

    options = options || {};

    _.extend(this, Events);

    var session = this.session = new Session(token, secret, options);
    this.session.on('play-active', this._onPlayActive, this);
    this.session.on('play-started', this._onPlayStarted, this);
    this.session.on('play-completed', this._onPlayCompleted, this);
    this.session.on('plays-exhausted', this._onPlaysExhausted, this);

    this.session.on('all', function() {
      // propagate all events out to everybody else
      this.trigger.apply(this, Array.prototype.slice.call(arguments, 0));
    }, this);

    // create 'speakerInitialized' promise so we can delay things until
    // the audio subsystem is set up.
    var initializeSpeaker = this.initializeSpeaker = $.Deferred();

    this.speaker = getSpeaker(options, function(formats) {
      session.setFormats(formats);
      initializeSpeaker.resolve();
    });

    this.setMuted(this.isMuted());
  };

  Player.prototype.setPlacementId = function(placementId) {
    this.session.setPlacementId(placementId);
  };

  Player.prototype.setStationId = function(stationId) {
    this.session.setStationId(stationId);
  };

  Player.prototype.setBaseUrl = function(baseUrl) {
    this.session.setBaseUrl(baseUrl);
  };

  Player.prototype._onPlayActive = function(play) {
    // create a new sound object
    var options = {
      play: _.bind(this._onSoundPlay, this, play.id),
      pause: _.bind(this._onSoundPause, this, play.id),
      finish:  _.bind(this._onSoundFinish, this, play.id),
      elapse: _.bind(this._onSoundElapse, this, play.id)
    };

    if (play.startPosition) {
      options.startPosition = play.startPosition;
    }

    var sound = this.speaker.create(play.audio_file.url, options);

    this.state.activePlay = {
      id: play.id,
      sound: sound,
      startReportedToServer: false, // wether we got a 'play-started' event from session
      soundCompleted: false,        // wether the sound object told us it finished playback
      playStarted: false,           // wether playback started on the sound object yet
      previousPosition: 0           // last time we got an 'elapse' callback
    };

    // if we're not paused, then start it
    if (!this.state.paused) {
      var s = this.state.activePlay.sound;
      // flash freaks if you do this in the finish handler for a sound, so
      // schedule it for the next event loop
      setTimeout(function() {
        s.play();
      }, 1);
    }
  };

  Player.prototype._onSoundPlay = function(playId) {
    // sound started playing
    if (!this.state.activePlay || (this.state.activePlay.id !== playId)) {
      return;
    }
    
    this.state.paused = false;
    this.state.activePlay.playStarted = true;

    // on the first play, tell the server we're good to go
    if (!this.state.activePlay.startReportedToServer) {
      return this.session.reportPlayStarted();
    }

    // subsequent plays are considered 'resumed' events
    this.trigger('play-resumed', this.session.getActivePlay());
  };

  Player.prototype.getActivePlay = function() {
    return this.session.getActivePlay();
  };

  Player.prototype.hasActivePlayStarted = function() {
    return this.session.hasActivePlayStarted();
  };

  Player.prototype.getActivePlacement = function() {
    return this.session.getActivePlacement();
  };

  Player.prototype._onSoundPause = function(playId) {
    // sound paused playback
    if (!this.state.activePlay || (this.state.activePlay.id !== playId)) {
      return;
    }
    
    this.state.paused = true;

    this.trigger('play-paused', this.session.getActivePlay());
  };

  Player.prototype._onSoundFinish = function(playId) {
    if (!this.state.activePlay || (this.state.activePlay.id !== playId)) {
      return;
    }

    log('completed playback of', playId);
    this.state.activePlay.soundCompleted = true;

    if (!this.state.activePlay.playStarted) {
      // never reported this as started...  mark it as invalidated so
      // we can advance.
      this.session.requestInvalidate();

      return;
    }

    if (!this.state.activePlay.startReportedToServer) {
      // if the song failed before we recieved start response, wait
      // until word from the server that we started before we say
      // that we completed the song
      return;
    }

    this.session.reportPlayCompleted();
  };

  Player.prototype._onSoundElapse = function(playId) {
    if (!this.state.activePlay || (this.state.activePlay.id !== playId)) {
      return;
    }

    var sound = this.state.activePlay.sound,
        position = sound.position(),
        interval = 30 * 1000,  // ping server every 30 seconds
        previousCount = Math.floor(this.state.activePlay.previousPosition / interval),
        currentCount = Math.floor(position / interval);

    this.state.activePlay.previousPosition = position;

    if (currentCount !== previousCount) {
      this.session.reportPlayElapsed(Math.floor(position / 1000));
    }
  };

  Player.prototype._onPlayStarted = function(play) {
    var session = this.session;

    if (!this.state.activePlay || (this.state.activePlay.id !== play.id)) {
      log('received play started, but it does not match active play', play, this.state.activePlay);
      return;
    }

    this.state.activePlay.startReportedToServer = true;

    if (this.state.activePlay.soundCompleted) {
      // the sound completed before the session announced the play started
      log('sound completed before we finished reporting start', this.state.activePlay);
      _.defer(function() {
        session.reportPlayCompleted();
      });
    }
  };

  Player.prototype._onPlayCompleted = function(play) {
    if (!this.state.activePlay || (this.state.activePlay.id !== play.id)) {
      log('received play completed, but it does not match active play', play, this.state.activePlay);
      return;
    }

    this.state.activePlay.sound.destroy();
    delete this.state.activePlay;

    // Force us into play mode in case we were paused and hit
    // skip to complete the current song.
    this.state.paused = false;
  };

  Player.prototype._onPlaysExhausted = function() {
    this.state.paused = false;
  };

  Player.prototype.isPaused = function() {
    return this.session.isTuned() && this.state.paused;
  };

  Player.prototype.getStationInformation = function(stationInformationCallback) {
    return this.session.getStationInformation(stationInformationCallback);
  };

  Player.prototype.tune = function() {
    var player = this;

    this.initializeSpeaker.then(function() {
      if (!player.session.isTuned()) {
        player.session.tune();
      }
    });
  };

  Player.prototype.play = function() {
    var player = this;

    this.initializeSpeaker.then(function() {
      player.speaker.initializeForMobile();

      if (!player.session.isTuned()) {
        // not currently playing music
        player.state.paused = false;

        return player.session.tune();

      } else if (player.session.getActivePlay() && player.state.activePlay && player.state.paused) {
        // resume playback of song
        if (player.state.activePlay.playStarted) {
          player.state.activePlay.sound.resume();

        } else {
          player.state.activePlay.sound.play();
        }
      }
    });
  };

  Player.prototype.pause = function() {
    if (!this.session.hasActivePlayStarted() || 
        !this.state.activePlay ||
        this.state.paused) {
      return;
    }

    // pause current song
    this.state.activePlay.sound.pause();
  };

  Player.prototype.like = function() {
    if (!this.session.hasActivePlayStarted()) {
      return;
    }

    this.session.likePlay(this.state.activePlay.id);

    this.trigger('play-liked');
  };

  Player.prototype.unlike = function() {
    if (!this.session.hasActivePlayStarted()) {
      return;
    }

    this.session.unlikePlay(this.state.activePlay.id);

    this.trigger('play-unliked');
  };

  Player.prototype.dislike = function() {
    if (!this.session.hasActivePlayStarted()) {
      return;
    }

    this.session.dislikePlay(this.state.activePlay.id);

    this.trigger('play-disliked');

    this.skip();
  };

  Player.prototype.skip = function() {
    if (!this.session.hasActivePlayStarted()) {
      // can't skip non-playing song
      return;
    }

    this.session.requestSkip();
  };

  Player.prototype.destroy = function() {
    this.session = null;

    if (this.state.activePlay && this.state.activePlay.sound) {
      this.state.activePlay.sound.destroy();
    }
  };

  Player.prototype.getCurrentState = function() {
    if (this.state.suspended) {
      return 'suspended';

    } else if (!this.session.hasActivePlayStarted()) {
      // nothing started, so we're idle
      return 'idle';

    } else {
      if (this.state.paused) {
        return 'paused';

      } else {
        return 'playing';
      }
    }
  };

  Player.prototype.getPosition = function() {
    if (this.state.activePlay && this.state.activePlay.sound) {
      return this.state.activePlay.sound.position();

    } else {
      return 0;
    }
  };

  Player.prototype.getDuration = function() {
    if (this.state.activePlay && this.state.activePlay.sound) {
      return this.state.activePlay.sound.duration();

    } else {
      return 0;
    }
  };

  Player.prototype.maybeCanSkip = function() {
    return this.session.maybeCanSkip();
  };

  var mutedKey = 'muted';
  Player.prototype.isMuted = function() {
    if (supports_html5_storage()) {
      if (mutedKey in localStorage) {
        return localStorage[mutedKey] === 'true';
      }
    }

    return false;
  };

  Player.prototype.setMuted = function(isMuted) {
    if (isMuted) {
      this.speaker.setVolume(0);
      
      if (supports_html5_storage()) {
        localStorage[mutedKey] = true;
      }

      this.trigger('muted');

    } else {
      this.speaker.setVolume(100);

      if (supports_html5_storage()) {
        localStorage[mutedKey] = false;
      }

      this.trigger('unmuted');
    }
  };

  Player.prototype.suspend = function() {
    var playing = (this.state.activePlay && this.state.activePlay.sound),
        state = this.session.suspend(playing ? this.state.activePlay.sound.position() : 0);

    this.pause();

    this.state.suspended = true;
    this.trigger('suspend');

    return state;
  };

  Player.prototype.unsuspend = function(state, startPlayback) {
    this.session.unsuspend(state);

    if (startPlayback) {
      this.play();
    }
  };

  return Player;

});


/*global define:false */

/*! A Feed.fm joint: github.com/fuzz-radio/Javascript-SDK */

/*
 * This is the object we export as 'Feed' when everything is bundled up.
 */

define('feed/feed',[ 'feed/session', 'feed/log', 'feed/player-view', 'feed/player', 'feed/speaker' ], function(Session, log, PlayerView, Player, getSpeaker) {

  return {
    Session: Session,
    Player: Player,
    PlayerView: PlayerView,
    log: log,

    // this is only sticking around for legacy reasons.
    getSpeaker: getSpeaker
  };

});
require.config({ map: {"*":{"jquery":"feed/jquery-external"}} }); window.Feed = require("feed/feed");