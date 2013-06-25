/*
    json2.js
    2012-10-08

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

    See http://www.JSON.org/js.html


    This code should be minified before deployment.
    See http://javascript.crockford.com/jsmin.html

    USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
    NOT CONTROL.


    This file creates a global JSON object containing two methods: stringify
    and parse.

        JSON.stringify(value, replacer, space)
            value       any JavaScript value, usually an object or array.

            replacer    an optional parameter that determines how object
                        values are stringified for objects. It can be a
                        function or an array of strings.

            space       an optional parameter that specifies the indentation
                        of nested structures. If it is omitted, the text will
                        be packed without extra whitespace. If it is a number,
                        it will specify the number of spaces to indent at each
                        level. If it is a string (such as '\t' or '&nbsp;'),
                        it contains the characters used to indent at each level.

            This method produces a JSON text from a JavaScript value.

            When an object value is found, if the object contains a toJSON
            method, its toJSON method will be called and the result will be
            stringified. A toJSON method does not serialize: it returns the
            value represented by the name/value pair that should be serialized,
            or undefined if nothing should be serialized. The toJSON method
            will be passed the key associated with the value, and this will be
            bound to the value

            For example, this would serialize Dates as ISO strings.

                Date.prototype.toJSON = function (key) {
                    function f(n) {
                        // Format integers to have at least two digits.
                        return n < 10 ? '0' + n : n;
                    }

                    return this.getUTCFullYear()   + '-' +
                         f(this.getUTCMonth() + 1) + '-' +
                         f(this.getUTCDate())      + 'T' +
                         f(this.getUTCHours())     + ':' +
                         f(this.getUTCMinutes())   + ':' +
                         f(this.getUTCSeconds())   + 'Z';
                };

            You can provide an optional replacer method. It will be passed the
            key and value of each member, with this bound to the containing
            object. The value that is returned from your method will be
            serialized. If your method returns undefined, then the member will
            be excluded from the serialization.

            If the replacer parameter is an array of strings, then it will be
            used to select the members to be serialized. It filters the results
            such that only members with keys listed in the replacer array are
            stringified.

            Values that do not have JSON representations, such as undefined or
            functions, will not be serialized. Such values in objects will be
            dropped; in arrays they will be replaced with null. You can use
            a replacer function to replace those with JSON values.
            JSON.stringify(undefined) returns undefined.

            The optional space parameter produces a stringification of the
            value that is filled with line breaks and indentation to make it
            easier to read.

            If the space parameter is a non-empty string, then that string will
            be used for indentation. If the space parameter is a number, then
            the indentation will be that many spaces.

            Example:

            text = JSON.stringify(['e', {pluribus: 'unum'}]);
            // text is '["e",{"pluribus":"unum"}]'


            text = JSON.stringify(['e', {pluribus: 'unum'}], null, '\t');
            // text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

            text = JSON.stringify([new Date()], function (key, value) {
                return this[key] instanceof Date ?
                    'Date(' + this[key] + ')' : value;
            });
            // text is '["Date(---current time---)"]'


        JSON.parse(text, reviver)
            This method parses a JSON text to produce an object or array.
            It can throw a SyntaxError exception.

            The optional reviver parameter is a function that can filter and
            transform the results. It receives each of the keys and values,
            and its return value is used instead of the original value.
            If it returns what it received, then the structure is not modified.
            If it returns undefined then the member is deleted.

            Example:

            // Parse the text. Values that look like ISO date strings will
            // be converted to Date objects.

            myData = JSON.parse(text, function (key, value) {
                var a;
                if (typeof value === 'string') {
                    a =
/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
                    if (a) {
                        return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
                            +a[5], +a[6]));
                    }
                }
                return value;
            });

            myData = JSON.parse('["Date(09/09/2001)"]', function (key, value) {
                var d;
                if (typeof value === 'string' &&
                        value.slice(0, 5) === 'Date(' &&
                        value.slice(-1) === ')') {
                    d = new Date(value.slice(5, -1));
                    if (d) {
                        return d;
                    }
                }
                return value;
            });


    This is a reference implementation. You are free to copy, modify, or
    redistribute.
*/

/*jslint evil: true, regexp: true */

/*members "", "\b", "\t", "\n", "\f", "\r", "\"", JSON, "\\", apply,
    call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
    getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
    lastIndex, length, parse, prototype, push, replace, slice, stringify,
    test, toJSON, toString, valueOf
*/


// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

if (typeof JSON !== 'object') {
    JSON = {};
}

(function () {
    'use strict';

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function (key) {

            return isFinite(this.valueOf())
                ? this.getUTCFullYear()     + '-' +
                    f(this.getUTCMonth() + 1) + '-' +
                    f(this.getUTCDate())      + 'T' +
                    f(this.getUTCHours())     + ':' +
                    f(this.getUTCMinutes())   + ':' +
                    f(this.getUTCSeconds())   + 'Z'
                : null;
        };

        String.prototype.toJSON      =
            Number.prototype.toJSON  =
            Boolean.prototype.toJSON = function (key) {
                return this.valueOf();
            };
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        escapable.lastIndex = 0;
        return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
            var c = meta[a];
            return typeof c === 'string'
                ? c
                : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

        case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

            if (!value) {
                return 'null';
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0
                    ? '[]'
                    : gap
                    ? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']'
                    : '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === 'string') {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0
                ? '{}'
                : gap
                ? '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}'
                : '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== 'function') {
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = '';
            indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === 'string') {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                    typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

            return str('', {'': value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            text = String(text);
            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with '()' and 'new'
// because they can cause invocation, and '=' because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

            if (/^[\],:{}\s]*$/
                    .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                        .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                        .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval('(' + text + ')');

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return typeof reviver === 'function'
                    ? walk({'': j}, '')
                    : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError('JSON.parse');
        };
    }
}());

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
		define(['jquery'], factory);
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
 * V2.97a.20111220
 */

/*global window, SM2_DEFER, sm2Debugger, console, document, navigator, setTimeout, setInterval, clearInterval, Audio */
/* jslint regexp: true, sloppy: true, white: true, nomen: true, plusplus: true */

/**
 * About this file
 * ---------------
 * This is the fully-commented source version of the SoundManager 2 API,
 * recommended for use during development and testing.
 *
 * See soundmanager2-nodebug-jsmin.js for an optimized build (~10KB with gzip.)
 * http://schillmania.com/projects/soundmanager2/doc/getstarted/#basic-inclusion
 * Alternately, serve this file with gzip for 75% compression savings (~30KB over HTTP.)
 *
 * You may notice <d> and </d> comments in this source; these are delimiters for
 * debug blocks which are removed in the -nodebug builds, further optimizing code size.
 *
 * Also, as you may note: Whoa, reliable cross-platform/device audio support is hard! ;)
 */

(function(window) {

var soundManager = null;

/**
 * The SoundManager constructor.
 *
 * @constructor
 * @param {string} smURL Optional: Path to SWF files
 * @param {string} smID Optional: The ID to use for the SWF container element
 * @this {SoundManager}
 * @return {SoundManager} The new SoundManager instance
 */

function SoundManager(smURL, smID) {

  // Top-level configuration options

  this.flashVersion = 8;             // flash build to use (8 or 9.) Some API features require 9.
  this.debugMode = true;             // enable debugging output (console.log() with HTML fallback)
  this.debugFlash = false;           // enable debugging output inside SWF, troubleshoot Flash/browser issues
  this.useConsole = true;            // use console.log() if available (otherwise, writes to #soundmanager-debug element)
  this.consoleOnly = true;           // if console is being used, do not create/write to #soundmanager-debug
  this.waitForWindowLoad = false;    // force SM2 to wait for window.onload() before trying to call soundManager.onload()
  this.bgColor = '#ffffff';          // SWF background color. N/A when wmode = 'transparent'
  this.useHighPerformance = false;   // position:fixed flash movie can help increase js/flash speed, minimize lag
  this.flashPollingInterval = null;  // msec affecting whileplaying/loading callback frequency. If null, default of 50 msec is used.
  this.html5PollingInterval = null;  // msec affecting whileplaying() for HTML5 audio, excluding mobile devices. If null, native HTML5 update events are used.
  this.flashLoadTimeout = 1000;      // msec to wait for flash movie to load before failing (0 = infinity)
  this.wmode = null;                 // flash rendering mode - null, 'transparent', or 'opaque' (last two allow z-index to work)
  this.allowScriptAccess = 'always'; // for scripting the SWF (object/embed property), 'always' or 'sameDomain'
  this.useFlashBlock = false;        // *requires flashblock.css, see demos* - allow recovery from flash blockers. Wait indefinitely and apply timeout CSS to SWF, if applicable.
  this.useHTML5Audio = true;         // use HTML5 Audio() where API is supported (most Safari, Chrome versions), Firefox (no MP3/MP4.) Ideally, transparent vs. Flash API where possible.
  this.html5Test = /^(probably|maybe)$/i; // HTML5 Audio() format support test. Use /^probably$/i; if you want to be more conservative.
  this.preferFlash = true;           // overrides useHTML5audio. if true and flash support present, will try to use flash for MP3/MP4 as needed since HTML5 audio support is still quirky in browsers.
  this.noSWFCache = false;           // if true, appends ?ts={date} to break aggressive SWF caching.

  this.audioFormats = {

    /**
     * determines HTML5 support + flash requirements.
     * if no support (via flash and/or HTML5) for a "required" format, SM2 will fail to start.
     * flash fallback is used for MP3 or MP4 if HTML5 can't play it (or if preferFlash = true)
     * multiple MIME types may be tested while trying to get a positive canPlayType() response.
     */

    'mp3': {
      'type': ['audio/mpeg; codecs="mp3"', 'audio/mpeg', 'audio/mp3', 'audio/MPA', 'audio/mpa-robust'],
      'required': true
    },

    'mp4': {
      'related': ['aac','m4a'], // additional formats under the MP4 container
      'type': ['audio/mp4; codecs="mp4a.40.2"', 'audio/aac', 'audio/x-m4a', 'audio/MP4A-LATM', 'audio/mpeg4-generic'],
      'required': false
    },

    'ogg': {
      'type': ['audio/ogg; codecs=vorbis'],
      'required': false
    },

    'wav': {
      'type': ['audio/wav; codecs="1"', 'audio/wav', 'audio/wave', 'audio/x-wav'],
      'required': false
    }

  };

  this.defaultOptions = {

    /**
     * the default configuration for sound objects made with createSound() and related methods
     * eg., volume, auto-load behaviour and so forth
     */

    'autoLoad': false,        // enable automatic loading (otherwise .load() will be called on demand with .play(), the latter being nicer on bandwidth - if you want to .load yourself, you also can)
    'autoPlay': false,        // enable playing of file as soon as possible (much faster if "stream" is true)
    'from': null,             // position to start playback within a sound (msec), default = beginning
    'loops': 1,               // how many times to repeat the sound (position will wrap around to 0, setPosition() will break out of loop when >0)
    'onid3': null,            // callback function for "ID3 data is added/available"
    'onload': null,           // callback function for "load finished"
    'whileloading': null,     // callback function for "download progress update" (X of Y bytes received)
    'onplay': null,           // callback for "play" start
    'onpause': null,          // callback for "pause"
    'onresume': null,         // callback for "resume" (pause toggle)
    'whileplaying': null,     // callback during play (position update)
    'onposition': null,       // object containing times and function callbacks for positions of interest
    'onstop': null,           // callback for "user stop"
    'onfailure': null,        // callback function for when playing fails
    'onfinish': null,         // callback function for "sound finished playing"
    'multiShot': true,        // let sounds "restart" or layer on top of each other when played multiple times, rather than one-shot/one at a time
    'multiShotEvents': false, // fire multiple sound events (currently onfinish() only) when multiShot is enabled
    'position': null,         // offset (milliseconds) to seek to within loaded sound data.
    'pan': 0,                 // "pan" settings, left-to-right, -100 to 100
    'stream': true,           // allows playing before entire file has loaded (recommended)
    'to': null,               // position to end playback within a sound (msec), default = end
    'type': null,             // MIME-like hint for file pattern / canPlay() tests, eg. audio/mp3
    'usePolicyFile': false,   // enable crossdomain.xml request for audio on remote domains (for ID3/waveform access)
    'volume': 100             // self-explanatory. 0-100, the latter being the max.

  };

  this.flash9Options = {

    /**
     * flash 9-only options,
     * merged into defaultOptions if flash 9 is being used
     */

    'isMovieStar': null,      // "MovieStar" MPEG4 audio mode. Null (default) = auto detect MP4, AAC etc. based on URL. true = force on, ignore URL
    'usePeakData': false,     // enable left/right channel peak (level) data
    'useWaveformData': false, // enable sound spectrum (raw waveform data) - NOTE: May increase CPU load.
    'useEQData': false,       // enable sound EQ (frequency spectrum data) - NOTE: May increase CPU load.
    'onbufferchange': null,   // callback for "isBuffering" property change
    'ondataerror': null       // callback for waveform/eq data access error (flash playing audio in other tabs/domains)

  };

  this.movieStarOptions = {

    /**
     * flash 9.0r115+ MPEG4 audio options,
     * merged into defaultOptions if flash 9+movieStar mode is enabled
     */

    'bufferTime': 3,          // seconds of data to buffer before playback begins (null = flash default of 0.1 seconds - if AAC playback is gappy, try increasing.)
    'serverURL': null,        // rtmp: FMS or FMIS server to connect to, required when requesting media via RTMP or one of its variants
    'onconnect': null,        // rtmp: callback for connection to flash media server
    'duration': null          // rtmp: song duration (msec)

  };

  // HTML attributes (id + class names) for the SWF container

  this.movieID = 'sm2-container';
  this.id = (smID || 'sm2movie');

  this.debugID = 'soundmanager-debug';
  this.debugURLParam = /([#?&])debug=1/i;

  // dynamic attributes

  this.versionNumber = 'V2.97a.20111220';
  this.version = null;
  this.movieURL = null;
  this.url = (smURL || null);
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

  // support indicators, set at init

  this.features = {

    'buffering': false,
    'peakData': false,
    'waveformData': false,
    'eqData': false,
    'movieStar': false

  };

  // flash sandbox info, used primarily in troubleshooting

  this.sandbox = {

    // <d>
    'type': null,
    'types': {
      'remote': 'remote (domain-based) rules',
      'localWithFile': 'local with file access (no internet access)',
      'localWithNetwork': 'local with network (internet access only, no local access)',
      'localTrusted': 'local, trusted (local+internet access)'
    },
    'description': null,
    'noRemote': null,
    'noLocal': null
    // </d>

  };

  /**
   * basic HTML5 Audio() support test
   * try...catch because of IE 9 "not implemented" nonsense
   * https://github.com/Modernizr/Modernizr/issues/224
   */

  this.hasHTML5 = (function() {
    try {
      return (typeof Audio !== 'undefined' && typeof new Audio().canPlayType !== 'undefined');
    } catch(e) {
      return false;
    }
  }());

  /**
   * format support (html5/flash)
   * stores canPlayType() results based on audioFormats.
   * eg. { mp3: boolean, mp4: boolean }
   * treat as read-only.
   */

  this.html5 = {
    'usingFlash': null // set if/when flash fallback is needed
  };

  this.flash = {}; // file type support hash

  this.html5Only = false;   // determined at init time
  this.ignoreFlash = false; // used for special cases (eg. iPad/iPhone/palm OS?)

  /**
   * a few private internals (OK, a lot. :D)
   */

  var SMSound,
  _s = this, _flash = null, _sm = 'soundManager', _smc = _sm+'::', _h5 = 'HTML5::', _id, _ua = navigator.userAgent, _win = window, _wl = _win.location.href.toString(), _doc = document, _doNothing, _init, _fV, _on_queue = [], _debugOpen = true, _debugTS, _didAppend = false, _appendSuccess = false, _didInit = false, _disabled = false, _windowLoaded = false, _wDS, _wdCount = 0, _initComplete, _mixin, _addOnEvent, _processOnEvents, _initUserOnload, _delayWaitForEI, _waitForEI, _setVersionInfo, _handleFocus, _strings, _initMovie, _domContentLoaded, _winOnLoad, _didDCLoaded, _getDocument, _createMovie, _catchError, _setPolling, _initDebug, _debugLevels = ['log', 'info', 'warn', 'error'], _defaultFlashVersion = 8, _disableObject, _failSafely, _normalizeMovieURL, _oRemoved = null, _oRemovedHTML = null, _str, _flashBlockHandler, _getSWFCSS, _swfCSS, _toggleDebug, _loopFix, _policyFix, _complain, _idCheck, _waitingForEI = false, _initPending = false, _smTimer, _onTimer, _startTimer, _stopTimer, _timerExecute, _h5TimerCount = 0, _h5IntervalTimer = null, _parseURL,
  _needsFlash = null, _featureCheck, _html5OK, _html5CanPlay, _html5Ext, _html5Unload, _domContentLoadedIE, _testHTML5, _event, _slice = Array.prototype.slice, _useGlobalHTML5Audio = false, _hasFlash, _detectFlash, _badSafariFix, _html5_events, _showSupport,
  _is_iDevice = _ua.match(/(ipad|iphone|ipod)/i), _is_firefox = _ua.match(/firefox/i), _is_android = _ua.match(/droid/i), _isIE = _ua.match(/msie/i), _isWebkit = _ua.match(/webkit/i), _isSafari = (_ua.match(/safari/i) && !_ua.match(/chrome/i)), _isOpera = (_ua.match(/opera/i)), 
  _likesHTML5 = (_ua.match(/(mobile|pre\/|xoom)/i) || _is_iDevice),
  _isBadSafari = (!_wl.match(/usehtml5audio/i) && !_wl.match(/sm2\-ignorebadua/i) && _isSafari && !_ua.match(/silk/i) && _ua.match(/OS X 10_6_([3-7])/i)), // Safari 4 and 5 (excluding Kindle Fire, "Silk") occasionally fail to load/play HTML5 audio on Snow Leopard 10.6.3 through 10.6.7 due to bug(s) in QuickTime X and/or other underlying frameworks. :/ Confirmed bug. https://bugs.webkit.org/show_bug.cgi?id=32159
  _hasConsole = (typeof console !== 'undefined' && typeof console.log !== 'undefined'), _isFocused = (typeof _doc.hasFocus !== 'undefined'?_doc.hasFocus():null), _tryInitOnFocus = (_isSafari && typeof _doc.hasFocus === 'undefined'), _okToDisable = !_tryInitOnFocus, _flashMIME = /(mp3|mp4|mpa)/i,
  _emptyURL = 'about:blank', // safe URL to unload, or load nothing from (flash 8 + most HTML5 UAs)
  _overHTTP = (_doc.location?_doc.location.protocol.match(/http/i):null),
  _http = (!_overHTTP ? 'http:/'+'/' : ''),
  // mp3, mp4, aac etc.
  _netStreamMimeTypes = /^\s*audio\/(?:x-)?(?:mpeg4|aac|flv|mov|mp4||m4v|m4a|mp4v|3gp|3g2)\s*(?:$|;)/i,
  // Flash v9.0r115+ "moviestar" formats
  _netStreamTypes = ['mpeg4', 'aac', 'flv', 'mov', 'mp4', 'm4v', 'f4v', 'm4a', 'mp4v', '3gp', '3g2'],
  _netStreamPattern = new RegExp('\\.(' + _netStreamTypes.join('|') + ')(\\?.*)?$', 'i');

  this.mimePattern = /^\s*audio\/(?:x-)?(?:mp(?:eg|3))\s*(?:$|;)/i; // default mp3 set

  // use altURL if not "online"
  this.useAltURL = !_overHTTP;
  this._global_a = null;

  _swfCSS = {

    'swfBox': 'sm2-object-box',
    'swfDefault': 'movieContainer',
    'swfError': 'swf_error', // SWF loaded, but SM2 couldn't start (other error)
    'swfTimedout': 'swf_timedout',
    'swfLoaded': 'swf_loaded',
    'swfUnblocked': 'swf_unblocked', // or loaded OK
    'sm2Debug': 'sm2_debug',
    'highPerf': 'high_performance',
    'flashDebug': 'flash_debug'

  };

  if (_likesHTML5) {

    // prefer HTML5 for mobile + tablet-like devices, probably more reliable vs. flash at this point.
    _s.useHTML5Audio = true;
    _s.preferFlash = false;

    if (_is_iDevice) {
      // by default, use global feature. iOS onfinish() -> next may fail otherwise.
      _s.ignoreFlash = true;
      _useGlobalHTML5Audio = true;
    }

  }

  /**
   * Public SoundManager API
   * -----------------------
   */

  this.ok = function() {

    return (_needsFlash?(_didInit && !_disabled):(_s.useHTML5Audio && _s.hasHTML5));

  };

  this.supported = this.ok; // legacy

  this.getMovie = function(smID) {

    // safety net: some old browsers differ on SWF references, possibly related to ExternalInterface / flash version
    return _id(smID) || _doc[smID] || _win[smID];

  };

  /**
   * Creates a SMSound sound object instance.
   *
   * @param {object} oOptions Sound options (at minimum, id and url are required.)
   * @return {object} SMSound The new SMSound object.
   */

  this.createSound = function(oOptions) {

    var _cs, _cs_string,
    thisOptions = null, oSound = null, _tO = null;

    // <d>
    _cs = _sm+'.createSound(): ';
    _cs_string = _cs + _str(!_didInit?'notReady':'notOK');
    // </d>

    if (!_didInit || !_s.ok()) {
      _complain(_cs_string);
      return false;
    }

    if (arguments.length === 2) {
      // function overloading in JS! :) ..assume simple createSound(id,url) use case
      oOptions = {
        'id': arguments[0],
        'url': arguments[1]
      };
    }

    // inherit from defaultOptions
    thisOptions = _mixin(oOptions);

    thisOptions.url = _parseURL(thisOptions.url);

    // local shortcut
    _tO = thisOptions;

    // <d>
    if (_tO.id.toString().charAt(0).match(/^[0-9]$/)) {
      _s._wD(_cs + _str('badID', _tO.id), 2);
    }

    _s._wD(_cs + _tO.id + ' (' + _tO.url + ')', 1);
    // </d>

    if (_idCheck(_tO.id, true)) {
      _s._wD(_cs + _tO.id + ' exists', 1);
      return _s.sounds[_tO.id];
    }

    function make() {

      thisOptions = _loopFix(thisOptions);
      _s.sounds[_tO.id] = new SMSound(_tO);
      _s.soundIDs.push(_tO.id);
      return _s.sounds[_tO.id];

    }

    if (_html5OK(_tO)) {

      oSound = make();
      _s._wD('Loading sound '+_tO.id+' via HTML5');
      oSound._setup_html5(_tO);

    } else {

      if (_fV > 8) {
        if (_tO.isMovieStar === null) {
          // attempt to detect MPEG-4 formats
          _tO.isMovieStar = (_tO.serverURL || (_tO.type ? _tO.type.match(_netStreamMimeTypes) : false) || _tO.url.match(_netStreamPattern));
        }
        // <d>
        if (_tO.isMovieStar) {
          _s._wD(_cs + 'using MovieStar handling');
        }
        // </d>
        if (_tO.isMovieStar) {
          if (_tO.usePeakData) {
            _wDS('noPeak');
            _tO.usePeakData = false;
          }
          // <d>
          if (_tO.loops > 1) {
            _wDS('noNSLoop');
          }
          // </d>
        }
      }

      _tO = _policyFix(_tO, _cs);
      oSound = make();

      if (_fV === 8) {
        _flash._createSound(_tO.id, _tO.loops||1, _tO.usePolicyFile);
      } else {
        _flash._createSound(_tO.id, _tO.url, _tO.usePeakData, _tO.useWaveformData, _tO.useEQData, _tO.isMovieStar, (_tO.isMovieStar?_tO.bufferTime:false), _tO.loops||1, _tO.serverURL, _tO.duration||null, _tO.autoPlay, true, _tO.autoLoad, _tO.usePolicyFile);
        if (!_tO.serverURL) {
          // We are connected immediately
          oSound.connected = true;
          if (_tO.onconnect) {
            _tO.onconnect.apply(oSound);
          }
        }
      }

      if (!_tO.serverURL && (_tO.autoLoad || _tO.autoPlay)) {
        // call load for non-rtmp streams
        oSound.load(_tO);
      }

    }

    // rtmp will play in onconnect
    if (!_tO.serverURL && _tO.autoPlay) {
      oSound.play();
    }

    return oSound;

  };

  /**
   * Destroys a SMSound sound object instance.
   *
   * @param {string} sID The ID of the sound to destroy
   */

  this.destroySound = function(sID, _bFromSound) {

    // explicitly destroy a sound before normal page unload, etc.

    if (!_idCheck(sID)) {
      return false;
    }

    var oS = _s.sounds[sID], i;

    // Disable all callbacks while the sound is being destroyed
    oS._iO = {};

    oS.stop();
    oS.unload();

    for (i = 0; i < _s.soundIDs.length; i++) {
      if (_s.soundIDs[i] === sID) {
        _s.soundIDs.splice(i, 1);
        break;
      }
    }

    if (!_bFromSound) {
      // ignore if being called from SMSound instance
      oS.destruct(true);
    }

    oS = null;
    delete _s.sounds[sID];

    return true;

  };

  /**
   * Calls the load() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @param {object} oOptions Optional: Sound options
   */

  this.load = function(sID, oOptions) {

    if (!_idCheck(sID)) {
      return false;
    }
    return _s.sounds[sID].load(oOptions);

  };

  /**
   * Calls the unload() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   */

  this.unload = function(sID) {

    if (!_idCheck(sID)) {
      return false;
    }
    return _s.sounds[sID].unload();

  };

  /**
   * Calls the onPosition() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @param {number} nPosition The position to watch for
   * @param {function} oMethod The relevant callback to fire
   * @param {object} oScope Optional: The scope to apply the callback to
   * @return {SMSound} The SMSound object
   */

  this.onPosition = function(sID, nPosition, oMethod, oScope) {

    if (!_idCheck(sID)) {
      return false;
    }
    return _s.sounds[sID].onposition(nPosition, oMethod, oScope);

  };

  // legacy/backwards-compability: lower-case method name
  this.onposition = this.onPosition;

  /**
   * Calls the clearOnPosition() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @param {number} nPosition The position to watch for
   * @param {function} oMethod Optional: The relevant callback to fire
   * @return {SMSound} The SMSound object
   */

  this.clearOnPosition = function(sID, nPosition, oMethod) {

    if (!_idCheck(sID)) {
      return false;
    }
    return _s.sounds[sID].clearOnPosition(nPosition, oMethod);

  };

  /**
   * Calls the play() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @param {object} oOptions Optional: Sound options
   * @return {SMSound} The SMSound object
   */

  this.play = function(sID, oOptions) {

    if (!_didInit || !_s.ok()) {
      _complain(_sm+'.play(): ' + _str(!_didInit?'notReady':'notOK'));
      return false;
    }

    if (!_idCheck(sID)) {
      if (!(oOptions instanceof Object)) {
        // overloading use case: play('mySound','/path/to/some.mp3');
        oOptions = {
          url: oOptions
        };
      }
      if (oOptions && oOptions.url) {
        // overloading use case, create+play: .play('someID',{url:'/path/to.mp3'});
        _s._wD(_sm+'.play(): attempting to create "' + sID + '"', 1);
        oOptions.id = sID;
        return _s.createSound(oOptions).play();
      } else {
        return false;
      }
    }

    return _s.sounds[sID].play(oOptions);

  };

  this.start = this.play; // just for convenience

  /**
   * Calls the setPosition() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @param {number} nMsecOffset Position (milliseconds)
   * @return {SMSound} The SMSound object
   */

  this.setPosition = function(sID, nMsecOffset) {

    if (!_idCheck(sID)) {
      return false;
    }
    return _s.sounds[sID].setPosition(nMsecOffset);

  };

  /**
   * Calls the stop() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @return {SMSound} The SMSound object
   */

  this.stop = function(sID) {

    if (!_idCheck(sID)) {
      return false;
    }

    _s._wD(_sm+'.stop(' + sID + ')', 1);
    return _s.sounds[sID].stop();

  };

  /**
   * Stops all currently-playing sounds.
   */

  this.stopAll = function() {

    var oSound;
    _s._wD(_sm+'.stopAll()', 1);

    for (oSound in _s.sounds) {
      if (_s.sounds.hasOwnProperty(oSound)) {
        // apply only to sound objects
        _s.sounds[oSound].stop();
      }
    }

  };

  /**
   * Calls the pause() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @return {SMSound} The SMSound object
   */

  this.pause = function(sID) {

    if (!_idCheck(sID)) {
      return false;
    }
    return _s.sounds[sID].pause();

  };

  /**
   * Pauses all currently-playing sounds.
   */

  this.pauseAll = function() {

    var i;
    for (i = _s.soundIDs.length; i--;) {
      _s.sounds[_s.soundIDs[i]].pause();
    }

  };

  /**
   * Calls the resume() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @return {SMSound} The SMSound object
   */

  this.resume = function(sID) {

    if (!_idCheck(sID)) {
      return false;
    }
    return _s.sounds[sID].resume();

  };

  /**
   * Resumes all currently-paused sounds.
   */

  this.resumeAll = function() {

    var i;
    for (i = _s.soundIDs.length; i--;) {
      _s.sounds[_s.soundIDs[i]].resume();
    }

  };

  /**
   * Calls the togglePause() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @return {SMSound} The SMSound object
   */

  this.togglePause = function(sID) {

    if (!_idCheck(sID)) {
      return false;
    }
    return _s.sounds[sID].togglePause();

  };

  /**
   * Calls the setPan() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @param {number} nPan The pan value (-100 to 100)
   * @return {SMSound} The SMSound object
   */

  this.setPan = function(sID, nPan) {

    if (!_idCheck(sID)) {
      return false;
    }
    return _s.sounds[sID].setPan(nPan);

  };

  /**
   * Calls the setVolume() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @param {number} nVol The volume value (0 to 100)
   * @return {SMSound} The SMSound object
   */

  this.setVolume = function(sID, nVol) {

    if (!_idCheck(sID)) {
      return false;
    }
    return _s.sounds[sID].setVolume(nVol);

  };

  /**
   * Calls the mute() method of either a single SMSound object by ID, or all sound objects.
   *
   * @param {string} sID Optional: The ID of the sound (if omitted, all sounds will be used.)
   */

  this.mute = function(sID) {

    var i = 0;

    if (typeof sID !== 'string') {
      sID = null;
    }

    if (!sID) {
      _s._wD(_sm+'.mute(): Muting all sounds');
      for (i = _s.soundIDs.length; i--;) {
        _s.sounds[_s.soundIDs[i]].mute();
      }
      _s.muted = true;
    } else {
      if (!_idCheck(sID)) {
        return false;
      }
      _s._wD(_sm+'.mute(): Muting "' + sID + '"');
      return _s.sounds[sID].mute();
    }

    return true;

  };

  /**
   * Mutes all sounds.
   */

  this.muteAll = function() {

    _s.mute();

  };

  /**
   * Calls the unmute() method of either a single SMSound object by ID, or all sound objects.
   *
   * @param {string} sID Optional: The ID of the sound (if omitted, all sounds will be used.)
   */

  this.unmute = function(sID) {

    var i;

    if (typeof sID !== 'string') {
      sID = null;
    }

    if (!sID) {

      _s._wD(_sm+'.unmute(): Unmuting all sounds');
      for (i = _s.soundIDs.length; i--;) {
        _s.sounds[_s.soundIDs[i]].unmute();
      }
      _s.muted = false;

    } else {

      if (!_idCheck(sID)) {
        return false;
      }
      _s._wD(_sm+'.unmute(): Unmuting "' + sID + '"');
      return _s.sounds[sID].unmute();

    }

    return true;

  };

  /**
   * Unmutes all sounds.
   */

  this.unmuteAll = function() {

    _s.unmute();

  };

  /**
   * Calls the toggleMute() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @return {SMSound} The SMSound object
   */

  this.toggleMute = function(sID) {

    if (!_idCheck(sID)) {
      return false;
    }
    return _s.sounds[sID].toggleMute();

  };

  /**
   * Retrieves the memory used by the flash plugin.
   *
   * @return {number} The amount of memory in use
   */

  this.getMemoryUse = function() {

    // flash-only
    var ram = 0;

    if (_flash && _fV !== 8) {
      ram = parseInt(_flash._getMemoryUse(), 10);
    }

    return ram;

  };

  /**
   * Undocumented: NOPs soundManager and all SMSound objects.
   */

  this.disable = function(bNoDisable) {

    // destroy all functions
    var i;

    if (typeof bNoDisable === 'undefined') {
      bNoDisable = false;
    }

    if (_disabled) {
      return false;
    }

    _disabled = true;
    _wDS('shutdown', 1);

    for (i = _s.soundIDs.length; i--;) {
      _disableObject(_s.sounds[_s.soundIDs[i]]);
    }

    // fire "complete", despite fail
    _initComplete(bNoDisable);
    _event.remove(_win, 'load', _initUserOnload);

    return true;

  };

  /**
   * Determines playability of a MIME type, eg. 'audio/mp3'.
   */

  this.canPlayMIME = function(sMIME) {

    var result;

    if (_s.hasHTML5) {
      result = _html5CanPlay({type:sMIME});
    }

    if (!_needsFlash || result) {
      // no flash, or OK
      return result;
    } else {
      // if flash 9, test netStream (movieStar) types as well.
      return (sMIME ? !!((_fV > 8 ? sMIME.match(_netStreamMimeTypes) : null) || sMIME.match(_s.mimePattern)) : null);
    }

  };

  /**
   * Determines playability of a URL based on audio support.
   *
   * @param {string} sURL The URL to test
   * @return {boolean} URL playability
   */

  this.canPlayURL = function(sURL) {

    var result;

    if (_s.hasHTML5) {
      result = _html5CanPlay({url: sURL});
    }

    if (!_needsFlash || result) {
      // no flash, or OK
      return result;
    } else {
      return (sURL ? !!(sURL.match(_s.filePattern)) : null);
    }

  };

  /**
   * Determines playability of an HTML DOM &lt;a&gt; object (or similar object literal) based on audio support.
   *
   * @param {object} oLink an HTML DOM &lt;a&gt; object or object literal including href and/or type attributes
   * @return {boolean} URL playability
   */

  this.canPlayLink = function(oLink) {

    if (typeof oLink.type !== 'undefined' && oLink.type) {
      if (_s.canPlayMIME(oLink.type)) {
        return true;
      }
    }

    return _s.canPlayURL(oLink.href);

  };

  /**
   * Retrieves a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @return {SMSound} The SMSound object
   */

  this.getSoundById = function(sID, _suppressDebug) {

    if (!sID) {
      throw new Error(_sm+'.getSoundById(): sID is null/undefined');
    }

    var result = _s.sounds[sID];

    // <d>
    if (!result && !_suppressDebug) {
      _s._wD('"' + sID + '" is an invalid sound ID.', 2);
    }
    // </d>

    return result;

  };

  /**
   * Queues a callback for execution when SoundManager has successfully initialized.
   *
   * @param {function} oMethod The callback method to fire
   * @param {object} oScope Optional: The scope to apply to the callback
   */

  this.onready = function(oMethod, oScope) {

    var sType = 'onready';

    if (oMethod && oMethod instanceof Function) {

      // <d>
      if (_didInit) {
        _s._wD(_str('queue', sType));
      }
      // </d>

      if (!oScope) {
        oScope = _win;
      }

      _addOnEvent(sType, oMethod, oScope);
      _processOnEvents();

      return true;

    } else {

      throw _str('needFunction', sType);

    }

  };

  /**
   * Queues a callback for execution when SoundManager has failed to initialize.
   *
   * @param {function} oMethod The callback method to fire
   * @param {object} oScope Optional: The scope to apply to the callback
   */

  this.ontimeout = function(oMethod, oScope) {

    var sType = 'ontimeout';

    if (oMethod && oMethod instanceof Function) {

      // <d>
      if (_didInit) {
        _s._wD(_str('queue', sType));
      }
      // </d>

      if (!oScope) {
        oScope = _win;
      }

      _addOnEvent(sType, oMethod, oScope);
      _processOnEvents({type:sType});

      return true;

    } else {

      throw _str('needFunction', sType);

    }

  };

  /**
   * Writes console.log()-style debug output to a console or in-browser element.
   * Applies when SoundManager.debugMode = true
   *
   * @param {string} sText The console message
   * @param {string} sType Optional: Log type of 'info', 'warn' or 'error'
   * @param {object} Optional: The scope to apply to the callback
   */

  this._writeDebug = function(sText, sType, _bTimestamp) {

    // pseudo-private console.log()-style output
    // <d>

    var sDID = 'soundmanager-debug', o, oItem, sMethod;

    if (!_s.debugMode) {
      return false;
    }

    if (typeof _bTimestamp !== 'undefined' && _bTimestamp) {
      sText = sText + ' | ' + new Date().getTime();
    }

    if (_hasConsole && _s.useConsole) {
      sMethod = _debugLevels[sType];
      if (typeof console[sMethod] !== 'undefined') {
        console[sMethod](sText);
      } else {
        console.log(sText);
      }
      if (_s.consoleOnly) {
        return true;
      }
    }

    try {

      o = _id(sDID);

      if (!o) {
        return false;
      }

      oItem = _doc.createElement('div');

      if (++_wdCount % 2 === 0) {
        oItem.className = 'sm2-alt';
      }

      if (typeof sType === 'undefined') {
        sType = 0;
      } else {
        sType = parseInt(sType, 10);
      }

      oItem.appendChild(_doc.createTextNode(sText));

      if (sType) {
        if (sType >= 2) {
          oItem.style.fontWeight = 'bold';
        }
        if (sType === 3) {
          oItem.style.color = '#ff3333';
        }
      }

      // top-to-bottom
      // o.appendChild(oItem);

      // bottom-to-top
      o.insertBefore(oItem, o.firstChild);

    } catch(e) {
      // oh well
    }

    o = null;
    // </d>

    return true;

  };

  // alias
  this._wD = this._writeDebug;

  /**
   * Provides debug / state information on all SMSound objects.
   */

  this._debug = function() {

    // <d>
    var i, j;
    _wDS('currentObj', 1);

    for (i = 0, j = _s.soundIDs.length; i < j; i++) {
      _s.sounds[_s.soundIDs[i]]._debug();
    }
    // </d>

  };

  /**
   * Restarts and re-initializes the SoundManager instance.
   */

  this.reboot = function() {

    // attempt to reset and init SM2
    _s._wD(_sm+'.reboot()');

    // <d>
    if (_s.soundIDs.length) {
      _s._wD('Destroying ' + _s.soundIDs.length + ' SMSound objects...');
    }
    // </d>

    var i, j;

    for (i = _s.soundIDs.length; i--;) {
      _s.sounds[_s.soundIDs[i]].destruct();
    }

    // trash ze flash

    try {
      if (_isIE) {
        _oRemovedHTML = _flash.innerHTML;
      }
      _oRemoved = _flash.parentNode.removeChild(_flash);
      _s._wD('Flash movie removed.');
    } catch(e) {
      // uh-oh.
      _wDS('badRemove', 2);
    }

    // actually, force recreate of movie.
    _oRemovedHTML = _oRemoved = _needsFlash = null;

    _s.enabled = _didDCLoaded = _didInit = _waitingForEI = _initPending = _didAppend = _appendSuccess = _disabled = _s.swfLoaded = false;
    _s.soundIDs = _s.sounds = [];
    _flash = null;

    for (i in _on_queue) {
      if (_on_queue.hasOwnProperty(i)) {
        for (j = _on_queue[i].length; j--;) {
          _on_queue[i][j].fired = false;
        }
      }
    }

    _s._wD(_sm + ': Rebooting...');
    _win.setTimeout(_s.beginDelayedInit, 20);

  };

  /**
   * Undocumented: Determines the SM2 flash movie's load progress.
   *
   * @return {number or null} Percent loaded, or if invalid/unsupported, null.
   */

  this.getMoviePercent = function() {

    return (_flash && typeof _flash.PercentLoaded !== 'undefined' ? _flash.PercentLoaded() : null);

  };

  /**
   * Additional helper for manually invoking SM2's init process after DOM Ready / window.onload().
   */

  this.beginDelayedInit = function() {

    _windowLoaded = true;
    _domContentLoaded();

    setTimeout(function() {

      if (_initPending) {
        return false;
      }

      _createMovie();
      _initMovie();
      _initPending = true;

      return true;

    }, 20);

    _delayWaitForEI();

  };

  /**
   * Destroys the SoundManager instance and all SMSound instances.
   */

  this.destruct = function() {

    _s._wD(_sm+'.destruct()');
    _s.disable(true);

  };

  /**
   * SMSound() (sound object) constructor
   * ------------------------------------
   *
   * @param {object} oOptions Sound options (id and url are required attributes)
   * @return {SMSound} The new SMSound object
   */

  SMSound = function(oOptions) {

    var _t = this, _resetProperties, _add_html5_events, _remove_html5_events, _stop_html5_timer, _start_html5_timer, _attachOnPosition, _onplay_called = false, _onPositionItems = [], _onPositionFired = 0, _detachOnPosition, _applyFromTo, _lastURL = null;

    var _lastHTML5State = {
      // tracks duration + position (time)
      duration: null,
      time: null
    };

    this.sID = oOptions.id;
    this.url = oOptions.url;
    this.options = _mixin(oOptions);

    // per-play-instance-specific options
    this.instanceOptions = this.options;

    // short alias
    this._iO = this.instanceOptions;

    // assign property defaults
    this.pan = this.options.pan;
    this.volume = this.options.volume;
    this.isHTML5 = false;
    this._a = null;

    /**
     * SMSound() public methods
     * ------------------------
     */

    this.id3 = {};

    /**
     * Writes SMSound object parameters to debug console
     */

    this._debug = function() {

      // <d>
      // pseudo-private console.log()-style output

      if (_s.debugMode) {

        var stuff = null, msg = [], sF, sfBracket, maxLength = 64;

        for (stuff in _t.options) {
          if (_t.options[stuff] !== null) {
            if (_t.options[stuff] instanceof Function) {
              // handle functions specially
              sF = _t.options[stuff].toString();
              // normalize spaces
              sF = sF.replace(/\s\s+/g, ' ');
              sfBracket = sF.indexOf('{');
              msg.push(' ' + stuff + ': {' + sF.substr(sfBracket + 1, (Math.min(Math.max(sF.indexOf('\n') - 1, maxLength), maxLength))).replace(/\n/g, '') + '... }');
            } else {
              msg.push(' ' + stuff + ': ' + _t.options[stuff]);
            }
          }
        }

        _s._wD('SMSound() merged options: {\n' + msg.join(', \n') + '\n}');

      }
      // </d>

    };

    // <d>
    this._debug();
    // </d>

    /**
     * Begins loading a sound per its *url*.
     *
     * @param {object} oOptions Optional: Sound options
     * @return {SMSound} The SMSound object
     */

    this.load = function(oOptions) {

      var oS = null, _iO;

      if (typeof oOptions !== 'undefined') {
        _t._iO = _mixin(oOptions, _t.options);
        _t.instanceOptions = _t._iO;
      } else {
        oOptions = _t.options;
        _t._iO = oOptions;
        _t.instanceOptions = _t._iO;
        if (_lastURL && _lastURL !== _t.url) {
          _wDS('manURL');
          _t._iO.url = _t.url;
          _t.url = null;
        }
      }

      if (!_t._iO.url) {
        _t._iO.url = _t.url;
      }

      _t._iO.url = _parseURL(_t._iO.url);

      _s._wD('SMSound.load(): ' + _t._iO.url, 1);

      if (_t._iO.url === _t.url && _t.readyState !== 0 && _t.readyState !== 2) {
        _wDS('onURL', 1);
        // if loaded and an onload() exists, fire immediately.
        if (_t.readyState === 3 && _t._iO.onload) {
          // assume success based on truthy duration.
          _t._iO.onload.apply(_t, [(!!_t.duration)]);
        }
        return _t;
      }

      // local shortcut
      _iO = _t._iO;

      _lastURL = _t.url;
      _t.loaded = false;
      _t.readyState = 1;
      _t.playState = 0;

      // TODO: If switching from HTML5 -> flash (or vice versa), stop currently-playing audio.

      if (_html5OK(_iO)) {

        oS = _t._setup_html5(_iO);

        if (!oS._called_load) {

          _s._wD(_h5+'load: '+_t.sID);
          _t._html5_canplay = false;

          // given explicit load call, try to get whole file.
          // early HTML5 implementation (non-standard)
          _t._a.autobuffer = 'auto';
          // standard
          _t._a.preload = 'auto';

          oS.load();
          oS._called_load = true;

          if (_iO.autoPlay) {
            _t.play();
          }

        } else {
          _s._wD(_h5+'ignoring request to load again: '+_t.sID);
        }

      } else {

        try {
          _t.isHTML5 = false;
          _t._iO = _policyFix(_loopFix(_iO));
          // re-assign local shortcut
          _iO = _t._iO;
          if (_fV === 8) {
            _flash._load(_t.sID, _iO.url, _iO.stream, _iO.autoPlay, (_iO.whileloading?1:0), _iO.loops||1, _iO.usePolicyFile);
          } else {
            _flash._load(_t.sID, _iO.url, !!(_iO.stream), !!(_iO.autoPlay), _iO.loops||1, !!(_iO.autoLoad), _iO.usePolicyFile);
          }
        } catch(e) {
          _wDS('smError', 2);
          _debugTS('onload', false);
          _catchError({type:'SMSOUND_LOAD_JS_EXCEPTION', fatal:true});

        }

      }

      return _t;

    };

    /**
     * Unloads a sound, canceling any open HTTP requests.
     *
     * @return {SMSound} The SMSound object
     */

    this.unload = function() {

      // Flash 8/AS2 can't "close" a stream - fake it by loading an empty URL
      // Flash 9/AS3: Close stream, preventing further load
      // HTML5: Most UAs will use empty URL

      if (_t.readyState !== 0) {

        _s._wD('SMSound.unload(): "' + _t.sID + '"');

        if (!_t.isHTML5) {
          if (_fV === 8) {
            _flash._unload(_t.sID, _emptyURL);
          } else {
            _flash._unload(_t.sID);
          }
        } else {
          _stop_html5_timer();
          if (_t._a) {
            _t._a.pause();
            _html5Unload(_t._a);
          }
        }

        // reset load/status flags
        _resetProperties();

      }

      return _t;

    };

    /**
     * Unloads and destroys a sound.
     */

    this.destruct = function(_bFromSM) {

      _s._wD('SMSound.destruct(): "' + _t.sID + '"');

      if (!_t.isHTML5) {

        // kill sound within Flash
        // Disable the onfailure handler
        _t._iO.onfailure = null;
        _flash._destroySound(_t.sID);

      } else {

        _stop_html5_timer();

        if (_t._a) {
          _t._a.pause();
          _html5Unload(_t._a);
          if (!_useGlobalHTML5Audio) {
            _remove_html5_events();
          }
          // break obvious circular reference
          _t._a._t = null;
          _t._a = null;
        }

      }

      if (!_bFromSM) {
        // ensure deletion from controller
        _s.destroySound(_t.sID, true);

      }

    };

    /**
     * Begins playing a sound.
     *
     * @param {object} oOptions Optional: Sound options
     * @return {SMSound} The SMSound object
     */

    this.play = function(oOptions, _updatePlayState) {

      var fN, allowMulti, a, onready;

      // <d>
      fN = 'SMSound.play(): ';
      // </d>

      _updatePlayState = _updatePlayState === undefined ? true : _updatePlayState; // default to true

      if (!oOptions) {
        oOptions = {};
      }

      _t._iO = _mixin(oOptions, _t._iO);
      _t._iO = _mixin(_t._iO, _t.options);
      _t._iO.url = _parseURL(_t._iO.url);
      _t.instanceOptions = _t._iO;

      // RTMP-only
      if (_t._iO.serverURL && !_t.connected) {
        if (!_t.getAutoPlay()) {
          _s._wD(fN+' Netstream not connected yet - setting autoPlay');
          _t.setAutoPlay(true);
        }
        // play will be called in _onconnect()
        return _t;
      }

      if (_html5OK(_t._iO)) {
        _t._setup_html5(_t._iO);
        _start_html5_timer();
      }

      if (_t.playState === 1 && !_t.paused) {
        allowMulti = _t._iO.multiShot;
        if (!allowMulti) {
          _s._wD(fN + '"' + _t.sID + '" already playing (one-shot)', 1);
          return _t;
        } else {
          _s._wD(fN + '"' + _t.sID + '" already playing (multi-shot)', 1);
        }
      }

      if (!_t.loaded) {

        if (_t.readyState === 0) {

          _s._wD(fN + 'Attempting to load "' + _t.sID + '"', 1);

          // try to get this sound playing ASAP
          if (!_t.isHTML5) {
            // assign directly because setAutoPlay() increments the instanceCount
            _t._iO.autoPlay = true;
          }

          _t.load(_t._iO);

        } else if (_t.readyState === 2) {

          _s._wD(fN + 'Could not load "' + _t.sID + '" - exiting', 2);
          return _t;

        } else {

          _s._wD(fN + '"' + _t.sID + '" is loading - attempting to play..', 1);

        }

      } else {

        _s._wD(fN + '"' + _t.sID + '"');

      }

      if (!_t.isHTML5 && _fV === 9 && _t.position > 0 && _t.position === _t.duration) {
        // flash 9 needs a position reset if play() is called while at the end of a sound.
        _s._wD(fN + '"' + _t.sID + '": Sound at end, resetting to position:0');
        oOptions.position = 0;
      }

      /**
       * Streams will pause when their buffer is full if they are being loaded.
       * In this case paused is true, but the song hasn't started playing yet.
       * If we just call resume() the onplay() callback will never be called.
       * So only call resume() if the position is > 0.
       * Another reason is because options like volume won't have been applied yet.
       */

      if (_t.paused && _t.position && _t.position > 0) {

        // https://gist.github.com/37b17df75cc4d7a90bf6
        _s._wD(fN + '"' + _t.sID + '" is resuming from paused state',1);
        _t.resume();

      } else {

        _t._iO = _mixin(oOptions, _t._iO);

        // apply from/to parameters, if they exist (and not using RTMP)
        if (_t._iO.from !== null && _t._iO.to !== null && _t.instanceCount === 0 && _t.playState === 0 && !_t._iO.serverURL) {

          onready = function() {
            // sound "canplay" or onload()
            // re-apply from/to to instance options, and start playback
            _t._iO = _mixin(oOptions, _t._iO);
            _t.play(_t._iO);
          };

          // HTML5 needs to at least have "canplay" fired before seeking.
          if (_t.isHTML5 && !_t._html5_canplay) {

            // this hasn't been loaded yet. load it first, and then do this again.
            _s._wD(fN+'Beginning load of "'+ _t.sID+'" for from/to case');

            _t.load({
              _oncanplay: onready
            });

            return false;

          } else if (!_t.isHTML5 && !_t.loaded && (!_t.readyState || _t.readyState !== 2)) {

            // to be safe, preload the whole thing in Flash.

            _s._wD(fN+'Preloading "'+ _t.sID+'" for from/to case');

            _t.load({
              onload: onready
            });

            return false;

          }

          // otherwise, we're ready to go. re-apply local options, and continue

          _t._iO = _applyFromTo();

        }

        _s._wD(fN+'"'+ _t.sID+'" is starting to play');

        if (!_t.instanceCount || _t._iO.multiShotEvents || (!_t.isHTML5 && _fV > 8 && !_t.getAutoPlay())) {
          _t.instanceCount++;
        }

        // if first play and onposition parameters exist, apply them now
        if (_t.playState === 0 && _t._iO.onposition) {
          _attachOnPosition(_t);
        }

        _t.playState = 1;
        _t.paused = false;

        _t.position = (typeof _t._iO.position !== 'undefined' && !isNaN(_t._iO.position) ? _t._iO.position : 0);

        if (!_t.isHTML5) {
          _t._iO = _policyFix(_loopFix(_t._iO));
        }

        if (_t._iO.onplay && _updatePlayState) {
          _t._iO.onplay.apply(_t);
          _onplay_called = true;
        }

        _t.setVolume(_t._iO.volume, true);
        _t.setPan(_t._iO.pan, true);

        if (!_t.isHTML5) {

          _flash._start(_t.sID, _t._iO.loops || 1, (_fV === 9?_t._iO.position:_t._iO.position / 1000));

        } else {

          _start_html5_timer();
          a = _t._setup_html5();
          _t.setPosition(_t._iO.position);
          a.play();

        }

      }

      return _t;

    };

    // just for convenience
    this.start = this.play;

    /**
     * Stops playing a sound (and optionally, all sounds)
     *
     * @param {boolean} bAll Optional: Whether to stop all sounds
     * @return {SMSound} The SMSound object
     */

    this.stop = function(bAll) {

      var _iO = _t._iO, _oP;

      if (_t.playState === 1) {

        _t._onbufferchange(0);
        _t._resetOnPosition(0);
        _t.paused = false;

        if (!_t.isHTML5) {
          _t.playState = 0;
        }

        // remove onPosition listeners, if any
        _detachOnPosition();

        // and "to" position, if set
        if (_iO.to) {
          _t.clearOnPosition(_iO.to);
        }

        if (!_t.isHTML5) {

          _flash._stop(_t.sID, bAll);

          // hack for netStream: just unload
          if (_iO.serverURL) {
            _t.unload();
          }

        } else {

          if (_t._a) {

            _oP = _t.position;

            // act like Flash, though
            _t.setPosition(0);

            // hack: reflect old position for onstop() (also like Flash)
            _t.position = _oP;

            // html5 has no stop()
            // NOTE: pausing means iOS requires interaction to resume.
            _t._a.pause();

            _t.playState = 0;

            // and update UI
            _t._onTimer();

            _stop_html5_timer();

          }

        }

        _t.instanceCount = 0;
        _t._iO = {};

        if (_iO.onstop) {
          _iO.onstop.apply(_t);
        }

      }

      return _t;

    };

    /**
     * Undocumented/internal: Sets autoPlay for RTMP.
     *
     * @param {boolean} autoPlay state
     */

    this.setAutoPlay = function(autoPlay) {

      _s._wD('sound '+_t.sID+' turned autoplay ' + (autoPlay ? 'on' : 'off'));
      _t._iO.autoPlay = autoPlay;

      if (!_t.isHTML5) {
        _flash._setAutoPlay(_t.sID, autoPlay);
        if (autoPlay) {
          // only increment the instanceCount if the sound isn't loaded (TODO: verify RTMP)
          if (!_t.instanceCount && _t.readyState === 1) {
            _t.instanceCount++;
            _s._wD('sound '+_t.sID+' incremented instance count to '+_t.instanceCount);
          }
        }
      }

    };

    /**
     * Undocumented/internal: Returns the autoPlay boolean.
     *
     * @return {boolean} The current autoPlay value
     */

    this.getAutoPlay = function() {

      return _t._iO.autoPlay;

    };

    /**
     * Sets the position of a sound.
     *
     * @param {number} nMsecOffset Position (milliseconds)
     * @return {SMSound} The SMSound object
     */

    this.setPosition = function(nMsecOffset) {

      if (nMsecOffset === undefined) {
        nMsecOffset = 0;
      }

      var original_pos,
          position, position1K,
          // Use the duration from the instance options, if we don't have a track duration yet.
          // position >= 0 and <= current available (loaded) duration
          offset = (_t.isHTML5 ? Math.max(nMsecOffset,0) : Math.min(_t.duration || _t._iO.duration, Math.max(nMsecOffset, 0)));

      original_pos = _t.position;
      _t.position = offset;
      position1K = _t.position/1000;
      _t._resetOnPosition(_t.position);
      _t._iO.position = offset;

      if (!_t.isHTML5) {

        position = (_fV === 9 ? _t.position : position1K);
        if (_t.readyState && _t.readyState !== 2) {
          // if paused or not playing, will not resume (by playing)
          _flash._setPosition(_t.sID, position, (_t.paused || !_t.playState));
        }

      } else if (_t._a) {

        // Set the position in the canplay handler if the sound is not ready yet
        if (_t._html5_canplay) {
          if (_t._a.currentTime !== position1K) {
            /**
             * DOM/JS errors/exceptions to watch out for:
             * if seek is beyond (loaded?) position, "DOM exception 11"
             * "INDEX_SIZE_ERR": DOM exception 1
             */
            _s._wD('setPosition('+position1K+'): setting position');
            try {
              _t._a.currentTime = position1K;
              if (_t.playState === 0 || _t.paused) {
                // allow seek without auto-play/resume
                _t._a.pause();
              }
            } catch(e) {
              _s._wD('setPosition('+position1K+'): setting position failed: '+e.message, 2);
            }
          }
        } else {
          _s._wD('setPosition('+position1K+'): delaying, sound not ready');
        }

      }

      if (_t.isHTML5) {
        if (_t.paused) {
          // if paused, refresh UI right away
          // force update
          _t._onTimer(true);
        }
      }

      return _t;

    };

    /**
     * Pauses sound playback.
     *
     * @return {SMSound} The SMSound object
     */

    this.pause = function(_bCallFlash) {

      if (_t.paused || (_t.playState === 0 && _t.readyState !== 1)) {
        return _t;
      }

      _s._wD('SMSound.pause()');
      _t.paused = true;

      if (!_t.isHTML5) {
        if (_bCallFlash || _bCallFlash === undefined) {
          _flash._pause(_t.sID);
        }
      } else {
        _t._setup_html5().pause();
        _stop_html5_timer();
      }

      if (_t._iO.onpause) {
        _t._iO.onpause.apply(_t);
      }

      return _t;

    };

    /**
     * Resumes sound playback.
     *
     * @return {SMSound} The SMSound object
     */

    /**
     * When auto-loaded streams pause on buffer full they have a playState of 0.
     * We need to make sure that the playState is set to 1 when these streams "resume".
     * When a paused stream is resumed, we need to trigger the onplay() callback if it
     * hasn't been called already. In this case since the sound is being played for the
     * first time, I think it's more appropriate to call onplay() rather than onresume().
     */

    this.resume = function() {

      var _iO = _t._iO;

      if (!_t.paused) {
        return _t;
      }

      _s._wD('SMSound.resume()');
      _t.paused = false;
      _t.playState = 1;

      if (!_t.isHTML5) {
        if (_iO.isMovieStar && !_iO.serverURL) {
          // Bizarre Webkit bug (Chrome reported via 8tracks.com dudes): AAC content paused for 30+ seconds(?) will not resume without a reposition.
          _t.setPosition(_t.position);
        }
        // flash method is toggle-based (pause/resume)
        _flash._pause(_t.sID);
      } else {
        _t._setup_html5().play();
        _start_html5_timer();
      }

      if (_onplay_called && _iO.onplay) {
        _iO.onplay.apply(_t);
        _onplay_called = true;
      } else if (_iO.onresume) {
        _iO.onresume.apply(_t);
      }

      return _t;

    };

    /**
     * Toggles sound playback.
     *
     * @return {SMSound} The SMSound object
     */

    this.togglePause = function() {

      _s._wD('SMSound.togglePause()');

      if (_t.playState === 0) {
        _t.play({
          position: (_fV === 9 && !_t.isHTML5 ? _t.position : _t.position / 1000)
        });
        return _t;
      }

      if (_t.paused) {
        _t.resume();
      } else {
        _t.pause();
      }

      return _t;

    };

    /**
     * Sets the panning (L-R) effect.
     *
     * @param {number} nPan The pan value (-100 to 100)
     * @return {SMSound} The SMSound object
     */

    this.setPan = function(nPan, bInstanceOnly) {

      if (typeof nPan === 'undefined') {
        nPan = 0;
      }

      if (typeof bInstanceOnly === 'undefined') {
        bInstanceOnly = false;
      }

      if (!_t.isHTML5) {
        _flash._setPan(_t.sID, nPan);
      } // else { no HTML5 pan? }

      _t._iO.pan = nPan;

      if (!bInstanceOnly) {
        _t.pan = nPan;
        _t.options.pan = nPan;
      }

      return _t;

    };

    /**
     * Sets the volume.
     *
     * @param {number} nVol The volume value (0 to 100)
     * @return {SMSound} The SMSound object
     */

    this.setVolume = function(nVol, _bInstanceOnly) {

      /**
       * Note: Setting volume has no effect on iOS "special snowflake" devices.
       * Hardware volume control overrides software, and volume
       * will always return 1 per Apple docs. (iOS 4 + 5.)
       * http://developer.apple.com/library/safari/documentation/AudioVideo/Conceptual/HTML-canvas-guide/AddingSoundtoCanvasAnimations/AddingSoundtoCanvasAnimations.html
       */

      if (typeof nVol === 'undefined') {
        nVol = 100;
      }

      if (typeof _bInstanceOnly === 'undefined') {
        _bInstanceOnly = false;
      }

      if (!_t.isHTML5) {
        _flash._setVolume(_t.sID, (_s.muted && !_t.muted) || _t.muted?0:nVol);
      } else if (_t._a) {
        // valid range: 0-1
        _t._a.volume = Math.max(0, Math.min(1, nVol/100));
      }

      _t._iO.volume = nVol;

      if (!_bInstanceOnly) {
        _t.volume = nVol;
        _t.options.volume = nVol;
      }

      return _t;

    };

    /**
     * Mutes the sound.
     *
     * @return {SMSound} The SMSound object
     */

    this.mute = function() {

      _t.muted = true;

      if (!_t.isHTML5) {
        _flash._setVolume(_t.sID, 0);
      } else if (_t._a) {
        _t._a.muted = true;
      }

      return _t;

    };

    /**
     * Unmutes the sound.
     *
     * @return {SMSound} The SMSound object
     */

    this.unmute = function() {

      _t.muted = false;
      var hasIO = typeof _t._iO.volume !== 'undefined';

      if (!_t.isHTML5) {
        _flash._setVolume(_t.sID, hasIO?_t._iO.volume:_t.options.volume);
      } else if (_t._a) {
        _t._a.muted = false;
      }

      return _t;

    };

    /**
     * Toggles the muted state of a sound.
     *
     * @return {SMSound} The SMSound object
     */

    this.toggleMute = function() {

      return (_t.muted?_t.unmute():_t.mute());

    };

    /**
     * Registers a callback to be fired when a sound reaches a given position during playback.
     *
     * @param {number} nPosition The position to watch for
     * @param {function} oMethod The relevant callback to fire
     * @param {object} oScope Optional: The scope to apply the callback to
     * @return {SMSound} The SMSound object
     */

    this.onPosition = function(nPosition, oMethod, oScope) {

      // TODO: basic dupe checking?

      _onPositionItems.push({
        position: nPosition,
        method: oMethod,
        scope: (typeof oScope !== 'undefined' ? oScope : _t),
        fired: false
      });

      return _t;

    };

    // legacy/backwards-compability: lower-case method name
    this.onposition = this.onPosition;

    /**
     * Removes registered callback(s) from a sound, by position and/or callback.
     *
     * @param {number} nPosition The position to clear callback(s) for
     * @param {function} oMethod Optional: Identify one callback to be removed when multiple listeners exist for one position
     * @return {SMSound} The SMSound object
     */

    this.clearOnPosition = function(nPosition, oMethod) {

      var i;

      nPosition = parseInt(nPosition, 10);

      if (isNaN(nPosition)) {
        // safety check
        return false;
      }

      for (i=0; i < _onPositionItems.length; i++) {

        if (nPosition === _onPositionItems[i].position) {
          // remove this item if no method was specified, or, if the method matches
          if (!oMethod || (oMethod === _onPositionItems[i].method)) {
            if (_onPositionItems[i].fired) {
              // decrement "fired" counter, too
              _onPositionFired--;
            }
            _onPositionItems.splice(i, 1);
          }
        }

      }

    };

    this._processOnPosition = function() {

      var i, item, j = _onPositionItems.length;

      if (!j || !_t.playState || _onPositionFired >= j) {
        return false;
      }

      for (i=j; i--;) {
        item = _onPositionItems[i];
        if (!item.fired && _t.position >= item.position) {
          item.fired = true;
          _onPositionFired++;
          item.method.apply(item.scope, [item.position]);
        }
      }

      return true;

    };

    this._resetOnPosition = function(nPosition) {

      // reset "fired" for items interested in this position
      var i, item, j = _onPositionItems.length;

      if (!j) {
        return false;
      }

      for (i=j; i--;) {
        item = _onPositionItems[i];
        if (item.fired && nPosition <= item.position) {
          item.fired = false;
          _onPositionFired--;
        }
      }

      return true;

    };

    /**
     * SMSound() private internals
     * --------------------------------
     */

    _applyFromTo = function() {

      var _iO = _t._iO,
          f = _iO.from,
          t = _iO.to,
          start, end;

      end = function() {

        // end has been reached.
        _s._wD(_t.sID + ': "to" time of ' + t + ' reached.');

        // detach listener
        _t.clearOnPosition(t, end);

        // stop should clear this, too
        _t.stop();

      };

      start = function() {

        _s._wD(_t.sID + ': playing "from" ' + f);

        // add listener for end
        if (t !== null && !isNaN(t)) {
          _t.onPosition(t, end);
        }

      };

      if (f !== null && !isNaN(f)) {

        // apply to instance options, guaranteeing correct start position.
        _iO.position = f;

        // multiShot timing can't be tracked, so prevent that.
        _iO.multiShot = false;

        start();

      }

      // return updated instanceOptions including starting position
      return _iO;

    };

    _attachOnPosition = function() {

      var op = _t._iO.onposition;

      // attach onposition things, if any, now.

      if (op) {

        var item;

        for (item in op) {
          if (op.hasOwnProperty(item)) {
            _t.onPosition(parseInt(item, 10), op[item]); 
          }
        }

      }

    };

    _detachOnPosition = function() {

      var op = _t._iO.onposition;

      // detach any onposition()-style listeners.

      if (op) {

        var item;

        for (item in op) {
          if (op.hasOwnProperty(item)) {
            _t.clearOnPosition(parseInt(item, 10));
          }
        }

      }

    };

    _start_html5_timer = function() {

      if (_t.isHTML5) {
        _startTimer(_t);
      }

    };

    _stop_html5_timer = function() {

      if (_t.isHTML5) {
        _stopTimer(_t);
      }

    };

    _resetProperties = function() {

      _onPositionItems = [];
      _onPositionFired = 0;
      _onplay_called = false;

      _t._hasTimer = null;
      _t._a = null;
      _t._html5_canplay = false;
      _t.bytesLoaded = null;
      _t.bytesTotal = null;
      _t.duration = (_t._iO && _t._iO.duration ? _t._iO.duration : null);
      _t.durationEstimate = null;

      // legacy: 1D array
      _t.eqData = [];

      _t.eqData.left = [];
      _t.eqData.right = [];

      _t.failures = 0;
      _t.isBuffering = false;
      _t.instanceOptions = {};
      _t.instanceCount = 0;
      _t.loaded = false;
      _t.metadata = {};

      // 0 = uninitialised, 1 = loading, 2 = failed/error, 3 = loaded/success
      _t.readyState = 0;

      _t.muted = false;
      _t.paused = false;

      _t.peakData = {
        left: 0,
        right: 0
      };

      _t.waveformData = {
        left: [],
        right: []
      };

      _t.playState = 0;
      _t.position = null;

    };

    _resetProperties();

    /**
     * Pseudo-private SMSound internals
     * --------------------------------
     */

    this._onTimer = function(bForce) {

      /**
       * HTML5-only _whileplaying() etc.
       * called from both HTML5 native events, and polling/interval-based timers
       * mimics flash and fires only when time/duration change, so as to be polling-friendly
       */

      var duration, isNew = false, time, x = {};

      if (_t._hasTimer || bForce) {

        // TODO: May not need to track readyState (1 = loading)

        if (_t._a && (bForce || ((_t.playState > 0 || _t.readyState === 1) && !_t.paused))) {

          duration = _t._get_html5_duration();

          if (duration !== _lastHTML5State.duration) {

            _lastHTML5State.duration = duration;
            _t.duration = duration;
            isNew = true;

          }

          // TODO: investigate why this goes wack if not set/re-set each time.
          _t.durationEstimate = _t.duration;

          time = (_t._a.currentTime * 1000 || 0);

          if (time !== _lastHTML5State.time) {

            _lastHTML5State.time = time;
            isNew = true;

          }

          if (isNew || bForce) {

            _t._whileplaying(time,x,x,x,x);

          }

          return isNew;

        } else {

          // _s._wD('_onTimer: Warn for "'+_t.sID+'": '+(!_t._a?'Could not find element. ':'')+(_t.playState === 0?'playState bad, 0?':'playState = '+_t.playState+', OK'));

          return false;

        }

      }

    };

    this._get_html5_duration = function() {

      var _iO = _t._iO,
          d = (_t._a ? _t._a.duration*1000 : (_iO ? _iO.duration : undefined)),
          result = (d && !isNaN(d) && d !== Infinity ? d : (_iO ? _iO.duration : null));

      return result;

    };

    this._setup_html5 = function(oOptions) {

      var _iO = _mixin(_t._iO, oOptions), d = decodeURI,
          _a = _useGlobalHTML5Audio ? _s._global_a : _t._a,
          _dURL = d(_iO.url),
          _oldIO = (_a && _a._t ? _a._t.instanceOptions : null);

      if (_a) {

        if (_a._t) {

          if (!_useGlobalHTML5Audio && _dURL === d(_lastURL)) {
            // same url, ignore request
            return _a; 
          } else if (_useGlobalHTML5Audio && _oldIO.url === _iO.url && (!_lastURL || (_lastURL === _oldIO.url))) {
            // iOS-type reuse case
            return _a;
          }

        }

        _s._wD('setting new URL on existing object: ' + _dURL + (_lastURL ? ', old URL: ' + _lastURL : ''));

        /**
         * "First things first, I, Poppa.." (reset the previous state of the old sound, if playing)
         * Fixes case with devices that can only play one sound at a time
         * Otherwise, other sounds in mid-play will be terminated without warning and in a stuck state
         */

        if (_useGlobalHTML5Audio && _a._t && _a._t.playState && _iO.url !== _oldIO.url) {
          _a._t.stop();
        }

        // new URL, so reset load/playstate and so on
        _resetProperties();

        _a.src = _iO.url;
        _t.url = _iO.url;
        _lastURL = _iO.url;
        _a._called_load = false;

      } else {

        _s._wD('creating HTML5 Audio() element with URL: '+_dURL);
        _a = new Audio(_iO.url);

        _a._called_load = false;

        // android (seen in 2.3/Honeycomb) sometimes fails first .load() -> .play(), results in playback failure and ended() events?
        if (_is_android) {
          _a._called_load = true;
        }

        if (_useGlobalHTML5Audio) {
          _s._global_a = _a;
        }

      }

      _t.isHTML5 = true;

      // store a ref on the track
      _t._a = _a;

      // store a ref on the audio
      _a._t = _t;

      _add_html5_events();
      _a.loop = (_iO.loops>1?'loop':'');

      if (_iO.autoLoad || _iO.autoPlay) {

        _t.load();

      } else {

        // early HTML5 implementation (non-standard)
        _a.autobuffer = false;

        // standard
        _a.preload = 'none';

      }

      // boolean instead of "loop", for webkit? - spec says string. http://www.w3.org/TR/html-markup/audio.html#audio.attrs.loop
      _a.loop = (_iO.loops > 1 ? 'loop' : '');

      return _a;

    };

    _add_html5_events = function() {

      if (_t._a._added_events) {
        return false;
      }

      var f;

      function add(oEvt, oFn, bCapture) {
        return _t._a ? _t._a.addEventListener(oEvt, oFn, bCapture||false) : null;
      }

      _s._wD(_h5+'adding event listeners: '+_t.sID);
      _t._a._added_events = true;

      for (f in _html5_events) {
        if (_html5_events.hasOwnProperty(f)) {
          add(f, _html5_events[f]);
        }
      }

      return true;

    };

    _remove_html5_events = function() {

      // Remove event listeners

      var f;

      function remove(oEvt, oFn, bCapture) {
        return (_t._a ? _t._a.removeEventListener(oEvt, oFn, bCapture||false) : null);
      }

      _s._wD(_h5+'removing event listeners: '+_t.sID);
      _t._a._added_events = false;

      for (f in _html5_events) {
        if (_html5_events.hasOwnProperty(f)) {
          remove(f, _html5_events[f]);
        }
      }

    };

    /**
     * Pseudo-private event internals
     * ------------------------------
     */

    this._onload = function(nSuccess) {


      var fN, loadOK = !!(nSuccess);
      fN = 'SMSound._onload(): ';
      _s._wD(fN + '"' + _t.sID + '"' + (loadOK?' loaded.':' failed to load? - ' + _t.url), (loadOK?1:2));

      // <d>
      if (!loadOK && !_t.isHTML5) {
        if (_s.sandbox.noRemote === true) {
          _s._wD(fN + _str('noNet'), 1);
        }
        if (_s.sandbox.noLocal === true) {
          _s._wD(fN + _str('noLocal'), 1);
        }
      }
      // </d>

      _t.loaded = loadOK;
      _t.readyState = loadOK?3:2;
      _t._onbufferchange(0);

      if (_t._iO.onload) {
        _t._iO.onload.apply(_t, [loadOK]);
      }

      return true;

    };

    this._onbufferchange = function(nIsBuffering) {

      if (_t.playState === 0) {
        // ignore if not playing
        return false;
      }

      if ((nIsBuffering && _t.isBuffering) || (!nIsBuffering && !_t.isBuffering)) {
        return false;
      }

      _t.isBuffering = (nIsBuffering === 1);
      if (_t._iO.onbufferchange) {
        _s._wD('SMSound._onbufferchange(): ' + nIsBuffering);
        _t._iO.onbufferchange.apply(_t);
      }

      return true;

    };

    /**
     * Notify Mobile Safari that user action is required
     * to continue playing / loading the audio file.
     */

    this._onsuspend = function() {

      if (_t._iO.onsuspend) {
        _s._wD('SMSound._onsuspend()');
        _t._iO.onsuspend.apply(_t);
      }

      return true;

    };

    /**
     * flash 9/movieStar + RTMP-only method, should fire only once at most
     * at this point we just recreate failed sounds rather than trying to reconnect
     */

    this._onfailure = function(msg, level, code) {

      _t.failures++;
      _s._wD('SMSound._onfailure(): "'+_t.sID+'" count '+_t.failures);

      if (_t._iO.onfailure && _t.failures === 1) {
        _t._iO.onfailure(_t, msg, level, code);
      } else {
        _s._wD('SMSound._onfailure(): ignoring');
      }

    };

    this._onfinish = function() {

      // store local copy before it gets trashed..
      var _io_onfinish = _t._iO.onfinish;

      _t._onbufferchange(0);
      _t._resetOnPosition(0);

      // reset some state items
      if (_t.instanceCount) {

        _t.instanceCount--;

        if (!_t.instanceCount) {

          // remove onPosition listeners, if any
          _detachOnPosition();

          // reset instance options
          _t.playState = 0;
          _t.paused = false;
          _t.instanceCount = 0;
          _t.instanceOptions = {};
          _t._iO = {};
          _stop_html5_timer();

        }

        if (!_t.instanceCount || _t._iO.multiShotEvents) {
          // fire onfinish for last, or every instance
          if (_io_onfinish) {
            _s._wD('SMSound._onfinish(): "' + _t.sID + '"');
            _io_onfinish.apply(_t);
          }
        }

      }

    };

    this._whileloading = function(nBytesLoaded, nBytesTotal, nDuration, nBufferLength) {

      var _iO = _t._iO;

      _t.bytesLoaded = nBytesLoaded;
      _t.bytesTotal = nBytesTotal;
      _t.duration = Math.floor(nDuration);
      _t.bufferLength = nBufferLength;

      if (!_iO.isMovieStar) {

        if (_iO.duration) {
          // use options, if specified and larger
          _t.durationEstimate = (_t.duration > _iO.duration) ? _t.duration : _iO.duration;
        } else {
          _t.durationEstimate = parseInt((_t.bytesTotal / _t.bytesLoaded) * _t.duration, 10);

        }

        if (_t.durationEstimate === undefined) {
          _t.durationEstimate = _t.duration;
        }

        if (_t.readyState !== 3 && _iO.whileloading) {
          _iO.whileloading.apply(_t);
        }

      } else {

        _t.durationEstimate = _t.duration;
        if (_t.readyState !== 3 && _iO.whileloading) {
          _iO.whileloading.apply(_t);
        }

      }

    };

    this._whileplaying = function(nPosition, oPeakData, oWaveformDataLeft, oWaveformDataRight, oEQData) {

      var _iO = _t._iO;

      if (isNaN(nPosition) || nPosition === null) {
        // flash safety net
        return false;
      }

      _t.position = nPosition;
      _t._processOnPosition();

      if (!_t.isHTML5 && _fV > 8) {

        if (_iO.usePeakData && typeof oPeakData !== 'undefined' && oPeakData) {
          _t.peakData = {
            left: oPeakData.leftPeak,
            right: oPeakData.rightPeak
          };
        }

        if (_iO.useWaveformData && typeof oWaveformDataLeft !== 'undefined' && oWaveformDataLeft) {
          _t.waveformData = {
            left: oWaveformDataLeft.split(','),
            right: oWaveformDataRight.split(',')
          };
        }

        if (_iO.useEQData) {
          if (typeof oEQData !== 'undefined' && oEQData && oEQData.leftEQ) {
            var eqLeft = oEQData.leftEQ.split(',');
            _t.eqData = eqLeft;
            _t.eqData.left = eqLeft;
            if (typeof oEQData.rightEQ !== 'undefined' && oEQData.rightEQ) {
              _t.eqData.right = oEQData.rightEQ.split(',');
            }
          }
        }

      }

      if (_t.playState === 1) {

        // special case/hack: ensure buffering is false if loading from cache (and not yet started)
        if (!_t.isHTML5 && _fV === 8 && !_t.position && _t.isBuffering) {
          _t._onbufferchange(0);
        }

        if (_iO.whileplaying) {
          // flash may call after actual finish
          _iO.whileplaying.apply(_t);
        }

      }

      return true;

    };

    this._onmetadata = function(oMDProps, oMDData) {

      /**
       * internal: flash 9 + NetStream (MovieStar/RTMP-only) feature
       * RTMP may include song title, MovieStar content may include encoding info
       * 
       * @param {array} oMDProps (names)
       * @param {array} oMDData (values)
       */

      _s._wD('SMSound._onmetadata(): "' + this.sID + '" metadata received.');

      var oData = {}, i, j;

      for (i = 0, j = oMDProps.length; i < j; i++) {
        oData[oMDProps[i]] = oMDData[i];
      }
      _t.metadata = oData;

      if (_t._iO.onmetadata) {
        _t._iO.onmetadata.apply(_t);
      }

	};

    this._onid3 = function(oID3Props, oID3Data) {

      /**
       * internal: flash 8 + flash 9 ID3 feature
       * may include artist, song title etc.
       * 
       * @param {array} oID3Props (names)
       * @param {array} oID3Data (values)
       */

      _s._wD('SMSound._onid3(): "' + this.sID + '" ID3 data received.');

      var oData = [], i, j;

      for (i = 0, j = oID3Props.length; i < j; i++) {
        oData[oID3Props[i]] = oID3Data[i];
      }
      _t.id3 = _mixin(_t.id3, oData);

      if (_t._iO.onid3) {
        _t._iO.onid3.apply(_t);
      }

    };

    // flash/RTMP-only

    this._onconnect = function(bSuccess) {

      bSuccess = (bSuccess === 1);
      _s._wD('SMSound._onconnect(): "'+_t.sID+'"'+(bSuccess?' connected.':' failed to connect? - '+_t.url), (bSuccess?1:2));
      _t.connected = bSuccess;

      if (bSuccess) {

        _t.failures = 0;

        if (_idCheck(_t.sID)) {
          if (_t.getAutoPlay()) {
            // only update the play state if auto playing
            _t.play(undefined, _t.getAutoPlay());
          } else if (_t._iO.autoLoad) {
            _t.load();
          }
        }

        if (_t._iO.onconnect) {
          _t._iO.onconnect.apply(_t, [bSuccess]);
        }

      }

    };

    this._ondataerror = function(sError) {

      // flash 9 wave/eq data handler
      // hack: called at start, and end from flash at/after onfinish()
      if (_t.playState > 0) {
        _s._wD('SMSound._ondataerror(): ' + sError);
        if (_t._iO.ondataerror) {
          _t._iO.ondataerror.apply(_t);
        }
      }

    };

  }; // SMSound()

  /**
   * Private SoundManager internals
   * ------------------------------
   */

  _getDocument = function() {

    return (_doc.body || _doc._docElement || _doc.getElementsByTagName('div')[0]);

  };

  _id = function(sID) {

    return _doc.getElementById(sID);

  };

  _mixin = function(oMain, oAdd) {

    // non-destructive merge
    var o1 = {}, i, o2, o;

    // clone c1
    for (i in oMain) {
      if (oMain.hasOwnProperty(i)) {
        o1[i] = oMain[i];
      }
    }

    o2 = (typeof oAdd === 'undefined'?_s.defaultOptions:oAdd);
    for (o in o2) {
      if (o2.hasOwnProperty(o) && typeof o1[o] === 'undefined') {
        o1[o] = o2[o];
      }
    }
    return o1;

  };

  _event = (function() {

    var old = (_win.attachEvent),
    evt = {
      add: (old?'attachEvent':'addEventListener'),
      remove: (old?'detachEvent':'removeEventListener')
    };

    function getArgs(oArgs) {

      var args = _slice.call(oArgs), len = args.length;

      if (old) {
        // prefix
        args[1] = 'on' + args[1];
        if (len > 3) {
          // no capture
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

  /**
   * Internal HTML5 event handling
   * -----------------------------
   */

  function _html5_event(oFn) {

    // wrap html5 event handlers so we don't call them on destroyed sounds

    return function(e) {

      var t = this._t;

      if (!t || !t._a) {
        // <d>
        if (t && t.sID) {
          _s._wD(_h5+'ignoring '+e.type+': '+t.sID);
        } else {
          _s._wD(_h5+'ignoring '+e.type);
        }
        // </d>
        return null;
      } else {
        return oFn.call(this, e);
      }

    };

  }

  _html5_events = {

    // HTML5 event-name-to-handler map

    abort: _html5_event(function(e) {

      _s._wD(_h5+'abort: '+this._t.sID);

    }),

    // enough has loaded to play

    canplay: _html5_event(function(e) {

      var t = this._t;

      if (t._html5_canplay) {
        // this event has already fired. ignore.
        return true;
      }

      t._html5_canplay = true;
      _s._wD(_h5+'canplay: '+t.sID+', '+t.url);
      t._onbufferchange(0);
      var position1K = (!isNaN(t.position)?t.position/1000:null);

      // set the position if position was set before the sound loaded
      if (t.position && this.currentTime !== position1K) {
        _s._wD(_h5+'canplay: setting position to '+position1K);
        try {
          this.currentTime = position1K;
        } catch(ee) {
          _s._wD(_h5+'setting position failed: '+ee.message, 2);
        }
      }

      // hack for HTML5 from/to case
      if (t._iO._oncanplay) {
        t._iO._oncanplay();
      }

    }),

    load: _html5_event(function(e) {

      var t = this._t;

      if (!t.loaded) {
        t._onbufferchange(0);
        // should be 1, and the same
        t._whileloading(t.bytesTotal, t.bytesTotal, t._get_html5_duration());
        t._onload(true);
      }

    }),

    emptied: _html5_event(function(e) {

      _s._wD(_h5+'emptied: '+this._t.sID);

    }),

    ended: _html5_event(function(e) {

      var t = this._t;

      _s._wD(_h5+'ended: '+t.sID);
      t._onfinish();

    }),

    error: _html5_event(function(e) {

      _s._wD(_h5+'error: '+this.error.code);
      // call load with error state?
      this._t._onload(false);

    }),

    loadeddata: _html5_event(function(e) {

      var t = this._t,
          // at least 1 byte, so math works
          bytesTotal = t.bytesTotal || 1;

      _s._wD(_h5+'loadeddata: '+this._t.sID);

      // safari seems to nicely report progress events, eventually totalling 100%
      if (!t._loaded && !_isSafari) {
        t.duration = t._get_html5_duration();
        // fire whileloading() with 100% values
        t._whileloading(bytesTotal, bytesTotal, t._get_html5_duration());
        t._onload(true);
      }

    }),

    loadedmetadata: _html5_event(function(e) {

      _s._wD(_h5+'loadedmetadata: '+this._t.sID);

    }),

    loadstart: _html5_event(function(e) {

      _s._wD(_h5+'loadstart: '+this._t.sID);
      // assume buffering at first
      this._t._onbufferchange(1);

    }),

    play: _html5_event(function(e) {

      _s._wD(_h5+'play: '+this._t.sID+', '+this._t.url);
      // once play starts, no buffering
      this._t._onbufferchange(0);

    }),

    playing: _html5_event(function(e) {

      _s._wD(_h5+'playing: '+this._t.sID);

      // once play starts, no buffering
      this._t._onbufferchange(0);

    }),

    progress: _html5_event(function(e) {

      var t = this._t;

      if (t.loaded) {
        return false;
      }

      var i, j, str, buffered = 0,
          isProgress = (e.type === 'progress'),
          ranges = e.target.buffered,

          // firefox 3.6 implements e.loaded/total (bytes)
          loaded = (e.loaded||0),

          total = (e.total||1);

      if (ranges && ranges.length) {

        // if loaded is 0, try TimeRanges implementation as % of load
        // https://developer.mozilla.org/en/DOM/TimeRanges

        for (i=ranges.length; i--;) {
          buffered = (ranges.end(i) - ranges.start(i));
        }

        // linear case, buffer sum; does not account for seeking and HTTP partials / byte ranges
        loaded = buffered/e.target.duration;

        // <d>
        if (isProgress && ranges.length > 1) {
          str = [];
          j = ranges.length;
          for (i=0; i<j; i++) {
            str.push(e.target.buffered.start(i) +'-'+ e.target.buffered.end(i));
          }
          _s._wD(_h5+'progress: timeRanges: '+str.join(', '));
        }

        if (isProgress && !isNaN(loaded)) {
          _s._wD(_h5+'progress: '+t.sID+': ' + Math.floor(loaded*100)+'% loaded');
        }
        // </d>

      }

      if (!isNaN(loaded)) {

        // if progress, likely not buffering
        t._onbufferchange(0);
        t._whileloading(loaded, total, t._get_html5_duration());
        if (loaded && total && loaded === total) {
          // in case "onload" doesn't fire (eg. gecko 1.9.2)
          _html5_events.load.call(this, e);
        }

      }

    }),

    ratechange: _html5_event(function(e) {

      _s._wD(_h5+'ratechange: '+this._t.sID);

    }),

    suspend: _html5_event(function(e) {

      // download paused/stopped, may have finished (eg. onload)
      var t = this._t;

      _s._wD(_h5+'suspend: '+t.sID);
      _html5_events.progress.call(this, e);
      t._onsuspend();

    }),

    stalled: _html5_event(function(e) {

      _s._wD(_h5+'stalled: '+this._t.sID);

    }),

    timeupdate: _html5_event(function(e) {

      this._t._onTimer();

    }),

    waiting: _html5_event(function(e) {

      var t = this._t;

      // see also: seeking
      _s._wD(_h5+'waiting: '+t.sID);

      // playback faster than download rate, etc.
      t._onbufferchange(1);

    })

  };

  _html5OK = function(iO) {

    // Use type, if specified. If HTML5-only mode, no other options, so just give 'er
    return (!iO.serverURL && (iO.type?_html5CanPlay({type:iO.type}):_html5CanPlay({url:iO.url})||_s.html5Only));

  };

  _html5Unload = function(oAudio) {

    /**
     * Internal method: Unload media, and cancel any current/pending network requests.
     * Firefox can load an empty URL, which allegedly destroys the decoder and stops the download.
     * https://developer.mozilla.org/En/Using_audio_and_video_in_Firefox#Stopping_the_download_of_media
     * Other UA behaviour is unclear, so everyone else gets an about:blank-style URL.
     */

    if (oAudio) {
      // Firefox likes '' for unload, most other UAs don't and fail to unload.
      oAudio.src = (_is_firefox ? '' : _emptyURL);
    }

  };

  _html5CanPlay = function(o) {

    /**
     * Try to find MIME, test and return truthiness
     * o = {
     *  url: '/path/to/an.mp3',
     *  type: 'audio/mp3'
     * }
     */

    if (!_s.useHTML5Audio || !_s.hasHTML5) {
      return false;
    }

    var url = (o.url || null),
        mime = (o.type || null),
        aF = _s.audioFormats,
        result,
        offset,
        fileExt,
        item;

    function preferFlashCheck(kind) {

      // whether flash should play a given type
      return (_s.preferFlash && _hasFlash && !_s.ignoreFlash && (typeof _s.flash[kind] !== 'undefined' && _s.flash[kind]));

    }

    // account for known cases like audio/mp3

    if (mime && _s.html5[mime] !== 'undefined') {
      return (_s.html5[mime] && !preferFlashCheck(mime));
    }

    if (!_html5Ext) {
      _html5Ext = [];
      for (item in aF) {
        if (aF.hasOwnProperty(item)) {
          _html5Ext.push(item);
          if (aF[item].related) {
            _html5Ext = _html5Ext.concat(aF[item].related);
          }
        }
      }
      _html5Ext = new RegExp('\\.('+_html5Ext.join('|')+')(\\?.*)?$','i');
    }

    // TODO: Strip URL queries, etc.
    fileExt = (url ? url.toLowerCase().match(_html5Ext) : null);

    if (!fileExt || !fileExt.length) {
      if (!mime) {
        return false;
      } else {
        // audio/mp3 -> mp3, result should be known
        offset = mime.indexOf(';');
        // strip "audio/X; codecs.."
        fileExt = (offset !== -1?mime.substr(0,offset):mime).substr(6);
      }
    } else {
      // match the raw extension name - "mp3", for example
      fileExt = fileExt[1];
    }

    if (fileExt && typeof _s.html5[fileExt] !== 'undefined') {
      // result known
      return (_s.html5[fileExt] && !preferFlashCheck(fileExt));
    } else {
      mime = 'audio/'+fileExt;
      result = _s.html5.canPlayType({type:mime});
      _s.html5[fileExt] = result;
      // _s._wD('canPlayType, found result: '+result);
      return (result && _s.html5[mime] && !preferFlashCheck(mime));
    }

  };

  _testHTML5 = function() {

    if (!_s.useHTML5Audio || typeof Audio === 'undefined') {
      return false;
    }

    // double-whammy: Opera 9.64 throws WRONG_ARGUMENTS_ERR if no parameter passed to Audio(), and Webkit + iOS happily tries to load "null" as a URL. :/
    var a = (typeof Audio !== 'undefined' ? (_isOpera ? new Audio(null) : new Audio()) : null),
        item, support = {}, aF, i;

    function _cp(m) {

      var canPlay, i, j, isOK = false;

      if (!a || typeof a.canPlayType !== 'function') {
        return false;
      }

      if (m instanceof Array) {
        // iterate through all mime types, return any successes
        for (i=0, j=m.length; i<j && !isOK; i++) {
          if (_s.html5[m[i]] || a.canPlayType(m[i]).match(_s.html5Test)) {
            isOK = true;
            _s.html5[m[i]] = true;

            // if flash can play and preferred, also mark it for use.
            _s.flash[m[i]] = !!(_s.preferFlash && _hasFlash && m[i].match(_flashMIME));

          }
        }
        return isOK;
      } else {
        canPlay = (a && typeof a.canPlayType === 'function' ? a.canPlayType(m) : false);
        return !!(canPlay && (canPlay.match(_s.html5Test)));
      }

    }

    // test all registered formats + codecs

    aF = _s.audioFormats;

    for (item in aF) {
      if (aF.hasOwnProperty(item)) {
        support[item] = _cp(aF[item].type);

        // write back generic type too, eg. audio/mp3
        support['audio/'+item] = support[item];

        // assign flash
        if (_s.preferFlash && !_s.ignoreFlash && item.match(_flashMIME)) {
          _s.flash[item] = true;
        } else {
          _s.flash[item] = false;
        }

        // assign result to related formats, too
        if (aF[item] && aF[item].related) {
          for (i=aF[item].related.length; i--;) {
            // eg. audio/m4a
            support['audio/'+aF[item].related[i]] = support[item];
            _s.html5[aF[item].related[i]] = support[item];
            _s.flash[aF[item].related[i]] = support[item];
          }
        }
      }
    }

    support.canPlayType = (a?_cp:null);
    _s.html5 = _mixin(_s.html5, support);

    return true;

  };

  _strings = {

    // <d>
    notReady: 'Not loaded yet - wait for soundManager.onload()/onready()',
    notOK: 'Audio support is not available.',
    domError: _smc + 'createMovie(): appendChild/innerHTML call failed. DOM not ready or other error.',
    spcWmode: _smc + 'createMovie(): Removing wmode, preventing known SWF loading issue(s)',
    swf404: _sm + ': Verify that %s is a valid path.',
    tryDebug: 'Try ' + _sm + '.debugFlash = true for more security details (output goes to SWF.)',
    checkSWF: 'See SWF output for more debug info.',
    localFail: _sm + ': Non-HTTP page (' + _doc.location.protocol + ' URL?) Review Flash player security settings for this special case:\nhttp://www.macromedia.com/support/documentation/en/flashplayer/help/settings_manager04.html\nMay need to add/allow path, eg. c:/sm2/ or /users/me/sm2/',
    waitFocus: _sm + ': Special case: Waiting for focus-related event..',
    waitImpatient: _sm + ': Getting impatient, still waiting for Flash%s...',
    waitForever: _sm + ': Waiting indefinitely for Flash (will recover if unblocked)...',
    needFunction: _sm + ': Function object expected for %s',
    badID: 'Warning: Sound ID "%s" should be a string, starting with a non-numeric character',
    currentObj: '--- ' + _sm + '._debug(): Current sound objects ---',
    waitEI: _smc + 'initMovie(): Waiting for ExternalInterface call from Flash..',
    waitOnload: _sm + ': Waiting for window.onload()',
    docLoaded: _sm + ': Document already loaded',
    onload: _smc + 'initComplete(): calling soundManager.onload()',
    onloadOK: _sm + '.onload() complete',
    init: _smc + 'init()',
    didInit: _smc + 'init(): Already called?',
    flashJS: _sm + ': Attempting to call Flash from JS..',
    secNote: 'Flash security note: Network/internet URLs will not load due to security restrictions. Access can be configured via Flash Player Global Security Settings Page: http://www.macromedia.com/support/documentation/en/flashplayer/help/settings_manager04.html',
    badRemove: 'Warning: Failed to remove flash movie.',
    noPeak: 'Warning: peakData features unsupported for movieStar formats',
    shutdown: _sm + '.disable(): Shutting down',
    queue: _sm + ': Queueing %s handler',
    smFail: _sm + ': Failed to initialise.',
    smError: 'SMSound.load(): Exception: JS-Flash communication failed, or JS error.',
    fbTimeout: 'No flash response, applying .'+_swfCSS.swfTimedout+' CSS..',
    fbLoaded: 'Flash loaded',
    fbHandler: _smc+'flashBlockHandler()',
    manURL: 'SMSound.load(): Using manually-assigned URL',
    onURL: _sm + '.load(): current URL already assigned.',
    badFV: _sm + '.flashVersion must be 8 or 9. "%s" is invalid. Reverting to %s.',
    as2loop: 'Note: Setting stream:false so looping can work (flash 8 limitation)',
    noNSLoop: 'Note: Looping not implemented for MovieStar formats',
    needfl9: 'Note: Switching to flash 9, required for MP4 formats.',
    mfTimeout: 'Setting flashLoadTimeout = 0 (infinite) for off-screen, mobile flash case',
    mfOn: 'mobileFlash::enabling on-screen flash repositioning',
    policy: 'Enabling usePolicyFile for data access'
    // </d>

  };

  _str = function() {

    // internal string replace helper.
    // arguments: o [,items to replace]
    // <d>

    // real array, please
    var args = _slice.call(arguments),

    // first arg
    o = args.shift(),

    str = (_strings && _strings[o]?_strings[o]:''), i, j;
    if (str && args && args.length) {
      for (i = 0, j = args.length; i < j; i++) {
        str = str.replace('%s', args[i]);
      }
    }

    return str;
    // </d>

  };

  _loopFix = function(sOpt) {

    // flash 8 requires stream = false for looping to work
    if (_fV === 8 && sOpt.loops > 1 && sOpt.stream) {
      _wDS('as2loop');
      sOpt.stream = false;
    }

    return sOpt;

  };

  _policyFix = function(sOpt, sPre) {

    if (sOpt && !sOpt.usePolicyFile && (sOpt.onid3 || sOpt.usePeakData || sOpt.useWaveformData || sOpt.useEQData)) {
      _s._wD((sPre || '') + _str('policy'));
      sOpt.usePolicyFile = true;
    }

    return sOpt;

  };

  _complain = function(sMsg) {

    // <d>
    if (typeof console !== 'undefined' && typeof console.warn !== 'undefined') {
      console.warn(sMsg);
    } else {
      _s._wD(sMsg);
    }
    // </d>

  };

  _doNothing = function() {

    return false;

  };

  _disableObject = function(o) {

    var oProp;

    for (oProp in o) {
      if (o.hasOwnProperty(oProp) && typeof o[oProp] === 'function') {
        o[oProp] = _doNothing;
      }
    }

    oProp = null;

  };

  _failSafely = function(bNoDisable) {

    // general failure exception handler

    if (typeof bNoDisable === 'undefined') {
      bNoDisable = false;
    }

    if (_disabled || bNoDisable) {
      _wDS('smFail', 2);
      _s.disable(bNoDisable);
    }

  };

  _normalizeMovieURL = function(smURL) {

    var urlParams = null, url;

    if (smURL) {
      if (smURL.match(/\.swf(\?.*)?$/i)) {
        urlParams = smURL.substr(smURL.toLowerCase().lastIndexOf('.swf?') + 4);
        if (urlParams) {
          // assume user knows what they're doing
          return smURL;
        }
      } else if (smURL.lastIndexOf('/') !== smURL.length - 1) {
        // append trailing slash, if needed
        smURL += '/';
      }
    }

    url = (smURL && smURL.lastIndexOf('/') !== - 1 ? smURL.substr(0, smURL.lastIndexOf('/') + 1) : './') + _s.movieURL;

    if (_s.noSWFCache) {
      url += ('?ts=' + new Date().getTime());
    }

    return url;

  };

  _setVersionInfo = function() {

    // short-hand for internal use

    _fV = parseInt(_s.flashVersion, 10);

    if (_fV !== 8 && _fV !== 9) {
      _s._wD(_str('badFV', _fV, _defaultFlashVersion));
      _s.flashVersion = _fV = _defaultFlashVersion;
    }

    // debug flash movie, if applicable

    var isDebug = (_s.debugMode || _s.debugFlash?'_debug.swf':'.swf');

    if (_s.useHTML5Audio && !_s.html5Only && _s.audioFormats.mp4.required && _fV < 9) {
      _s._wD(_str('needfl9'));
      _s.flashVersion = _fV = 9;
    }

    _s.version = _s.versionNumber + (_s.html5Only?' (HTML5-only mode)':(_fV === 9?' (AS3/Flash 9)':' (AS2/Flash 8)'));

    // set up default options
    if (_fV > 8) {
      // +flash 9 base options
      _s.defaultOptions = _mixin(_s.defaultOptions, _s.flash9Options);
      _s.features.buffering = true;
      // +moviestar support
      _s.defaultOptions = _mixin(_s.defaultOptions, _s.movieStarOptions);
      _s.filePatterns.flash9 = new RegExp('\\.(mp3|' + _netStreamTypes.join('|') + ')(\\?.*)?$', 'i');
      _s.features.movieStar = true;
    } else {
      _s.features.movieStar = false;
    }

    // regExp for flash canPlay(), etc.
    _s.filePattern = _s.filePatterns[(_fV !== 8?'flash9':'flash8')];

    // if applicable, use _debug versions of SWFs
    _s.movieURL = (_fV === 8?'soundmanager2.swf':'soundmanager2_flash9.swf').replace('.swf', isDebug);

    _s.features.peakData = _s.features.waveformData = _s.features.eqData = (_fV > 8);

  };

  _setPolling = function(bPolling, bHighPerformance) {

    if (!_flash) {
      return false;
    }

    _flash._setPolling(bPolling, bHighPerformance);

  };

  _initDebug = function() {

    // starts debug mode, creating output <div> for UAs without console object

    // allow force of debug mode via URL
    if (_s.debugURLParam.test(_wl)) {
      _s.debugMode = true;
    }

    // <d>
    if (_id(_s.debugID)) {
      return false;
    }

    var oD, oDebug, oTarget, oToggle, tmp;

    if (_s.debugMode && !_id(_s.debugID) && (!_hasConsole || !_s.useConsole || !_s.consoleOnly)) {

      oD = _doc.createElement('div');
      oD.id = _s.debugID + '-toggle';

      oToggle = {
        'position': 'fixed',
        'bottom': '0px',
        'right': '0px',
        'width': '1.2em',
        'height': '1.2em',
        'lineHeight': '1.2em',
        'margin': '2px',
        'textAlign': 'center',
        'border': '1px solid #999',
        'cursor': 'pointer',
        'background': '#fff',
        'color': '#333',
        'zIndex': 10001
      };

      oD.appendChild(_doc.createTextNode('-'));
      oD.onclick = _toggleDebug;
      oD.title = 'Toggle SM2 debug console';

      if (_ua.match(/msie 6/i)) {
        oD.style.position = 'absolute';
        oD.style.cursor = 'hand';
      }

      for (tmp in oToggle) {
        if (oToggle.hasOwnProperty(tmp)) {
          oD.style[tmp] = oToggle[tmp];
        }
      }

      oDebug = _doc.createElement('div');
      oDebug.id = _s.debugID;
      oDebug.style.display = (_s.debugMode?'block':'none');

      if (_s.debugMode && !_id(oD.id)) {
        try {
          oTarget = _getDocument();
          oTarget.appendChild(oD);
        } catch(e2) {
          throw new Error(_str('domError')+' \n'+e2.toString());
        }
        oTarget.appendChild(oDebug);
      }

    }

    oTarget = null;
    // </d>

  };

  _idCheck = this.getSoundById;

  // <d>
  _wDS = function(o, errorLevel) {

    if (!o) {
      return '';
    } else {
      return _s._wD(_str(o), errorLevel);
    }

  };

  // last-resort debugging option

  if (_wl.indexOf('sm2-debug=alert') + 1 && _s.debugMode) {
    _s._wD = function(sText) {window.alert(sText);};
  }

  _toggleDebug = function() {

    var o = _id(_s.debugID),
    oT = _id(_s.debugID + '-toggle');

    if (!o) {
      return false;
    }

    if (_debugOpen) {
      // minimize
      oT.innerHTML = '+';
      o.style.display = 'none';
    } else {
      oT.innerHTML = '-';
      o.style.display = 'block';
    }

    _debugOpen = !_debugOpen;

  };

  _debugTS = function(sEventType, bSuccess, sMessage) {

    // troubleshooter debug hooks

    if (typeof sm2Debugger !== 'undefined') {
      try {
        sm2Debugger.handleEvent(sEventType, bSuccess, sMessage);
      } catch(e) {
        // oh well
      }
    }

    return true;

  };
  // </d>

  _getSWFCSS = function() {

    var css = [];

    if (_s.debugMode) {
      css.push(_swfCSS.sm2Debug);
    }

    if (_s.debugFlash) {
      css.push(_swfCSS.flashDebug);
    }

    if (_s.useHighPerformance) {
      css.push(_swfCSS.highPerf);
    }

    return css.join(' ');

  };

  _flashBlockHandler = function() {

    // *possible* flash block situation.

    var name = _str('fbHandler'),
        p = _s.getMoviePercent(),
        css = _swfCSS,
        error = {type:'FLASHBLOCK'};

    if (_s.html5Only) {
      return false;
    }

    if (!_s.ok()) {

      if (_needsFlash) {
        // make the movie more visible, so user can fix
        _s.oMC.className = _getSWFCSS() + ' ' + css.swfDefault + ' ' + (p === null?css.swfTimedout:css.swfError);
        _s._wD(name+': '+_str('fbTimeout')+(p?' ('+_str('fbLoaded')+')':''));
      }

      _s.didFlashBlock = true;

      // fire onready(), complain lightly
      _processOnEvents({type:'ontimeout', ignoreInit:true, error:error});
      _catchError(error);

    } else {

      // SM2 loaded OK (or recovered)

      // <d>
      if (_s.didFlashBlock) {
        _s._wD(name+': Unblocked');
      }
      // </d>

      if (_s.oMC) {
        _s.oMC.className = [_getSWFCSS(), css.swfDefault, css.swfLoaded + (_s.didFlashBlock?' '+css.swfUnblocked:'')].join(' ');
      }

    }

  };

  _addOnEvent = function(sType, oMethod, oScope) {

    if (typeof _on_queue[sType] === 'undefined') {
      _on_queue[sType] = [];
    }

    _on_queue[sType].push({
      'method': oMethod,
      'scope': (oScope || null),
      'fired': false
    });

  };

  _processOnEvents = function(oOptions) {

    // assume onready, if unspecified

    if (!oOptions) {
      oOptions = {
        type: 'onready'
      };
    }

    if (!_didInit && oOptions && !oOptions.ignoreInit) {
      // not ready yet.
      return false;
    }

    if (oOptions.type === 'ontimeout' && _s.ok()) {
      // invalid case
      return false;
    }

    var status = {
          success: (oOptions && oOptions.ignoreInit?_s.ok():!_disabled)
        },

        // queue specified by type, or none
        srcQueue = (oOptions && oOptions.type?_on_queue[oOptions.type]||[]:[]),

        queue = [], i, j,
        args = [status],
        canRetry = (_needsFlash && _s.useFlashBlock && !_s.ok());

    if (oOptions.error) {
      args[0].error = oOptions.error;
    }

    for (i = 0, j = srcQueue.length; i < j; i++) {
      if (srcQueue[i].fired !== true) {
        queue.push(srcQueue[i]);
      }
    }

    if (queue.length) {
      _s._wD(_sm + ': Firing ' + queue.length + ' '+oOptions.type+'() item' + (queue.length === 1?'':'s'));
      for (i = 0, j = queue.length; i < j; i++) {
        if (queue[i].scope) {
          queue[i].method.apply(queue[i].scope, args);
        } else {
          queue[i].method.apply(this, args);
        }
        if (!canRetry) {
          // flashblock case doesn't count here
          queue[i].fired = true;
        }
      }
    }

    return true;

  };

  _initUserOnload = function() {

    _win.setTimeout(function() {

      if (_s.useFlashBlock) {
        _flashBlockHandler();
      }

      _processOnEvents();

      // call user-defined "onload", scoped to window

      if (_s.onload instanceof Function) {
        _wDS('onload', 1);
        _s.onload.apply(_win);
        _wDS('onloadOK', 1);
      }

      if (_s.waitForWindowLoad) {
        _event.add(_win, 'load', _initUserOnload);
      }

    },1);

  };

  _detectFlash = function() {

    // hat tip: Flash Detect library (BSD, (C) 2007) by Carl "DocYes" S. Yestrau - http://featureblend.com/javascript-flash-detection-library.html / http://featureblend.com/license.txt

    if (_hasFlash !== undefined) {
      // this work has already been done.
      return _hasFlash;
    }

    var hasPlugin = false, n = navigator, nP = n.plugins, obj, type, types, AX = _win.ActiveXObject;

    if (nP && nP.length) {
      type = 'application/x-shockwave-flash';
      types = n.mimeTypes;
      if (types && types[type] && types[type].enabledPlugin && types[type].enabledPlugin.description) {
        hasPlugin = true;
      }
    } else if (typeof AX !== 'undefined') {
      try {
        obj = new AX('ShockwaveFlash.ShockwaveFlash');
      } catch(e) {
        // oh well
      }
      hasPlugin = (!!obj);
    }

    _hasFlash = hasPlugin;

    return hasPlugin;

  };

  _featureCheck = function() {

    var needsFlash, item,

        // iPhone <= 3.1 has broken HTML5 audio(), but firmware 3.2 (iPad) + iOS4 works.
        isSpecial = (_is_iDevice && !!(_ua.match(/os (1|2|3_0|3_1)/i)));

    if (isSpecial) {

      // has Audio(), but is broken; let it load links directly.
      _s.hasHTML5 = false;

      // ignore flash case, however
      _s.html5Only = true;

      if (_s.oMC) {
        _s.oMC.style.display = 'none';
      }

      return false;

    }

    if (_s.useHTML5Audio) {

      if (!_s.html5 || !_s.html5.canPlayType) {
        _s._wD('SoundManager: No HTML5 Audio() support detected.');
        _s.hasHTML5 = false;
        return true;
      } else {
        _s.hasHTML5 = true;
      }
      if (_isBadSafari) {
        _s._wD(_smc+'Note: Buggy HTML5 Audio in Safari on this OS X release, see https://bugs.webkit.org/show_bug.cgi?id=32159 - '+(!_hasFlash?' would use flash fallback for MP3/MP4, but none detected.':'will use flash fallback for MP3/MP4, if available'),1);
        if (_detectFlash()) {
          return true;
        }
      }
    } else {

      // flash needed (or, HTML5 needs enabling.)
      return true;

    }

    for (item in _s.audioFormats) {
      if (_s.audioFormats.hasOwnProperty(item)) {
        if ((_s.audioFormats[item].required && !_s.html5.canPlayType(_s.audioFormats[item].type)) || _s.flash[item] || _s.flash[_s.audioFormats[item].type]) {
          // flash may be required, or preferred for this format
          needsFlash = true;
        }
      }
    }

    // sanity check..
    if (_s.ignoreFlash) {
      needsFlash = false;
    }

    _s.html5Only = (_s.hasHTML5 && _s.useHTML5Audio && !needsFlash);

    return (!_s.html5Only);

  };

  _parseURL = function(url) {

    /**
     * Internal: Finds and returns the first playable URL (or failing that, the first URL.)
     * @param {string or array} url A single URL string, OR, an array of URL strings or {url:'/path/to/resource', type:'audio/mp3'} objects.
     */

    var i, j, result = 0;

    if (url instanceof Array) {

      // find the first good one
      for (i=0, j=url.length; i<j; i++) {

        if (url[i] instanceof Object) {
          // MIME check
          if (_s.canPlayMIME(url[i].type)) {
            result = i;
            break;
          }

        } else if (_s.canPlayURL(url[i])) {
          // URL string check
          result = i;
          break;
        }

      }

      // normalize to string
      if (url[result].url) {
        url[result] = url[result].url;
      }

      return url[result];

    } else {

      // single URL case
      return url;

    }

  };


  _startTimer = function(oSound) {

    /**
     * attach a timer to this sound, and start an interval if needed
     */

    if (!oSound._hasTimer) {

      oSound._hasTimer = true;

      if (!_likesHTML5 && _s.html5PollingInterval) {

        if (_h5IntervalTimer === null && _h5TimerCount === 0) {

          _h5IntervalTimer = window.setInterval(_timerExecute, _s.html5PollingInterval);
   
        }

        _h5TimerCount++;

      }

    }

  };

  _stopTimer = function(oSound) {

    /**
     * detach a timer
     */

    if (oSound._hasTimer) {

      oSound._hasTimer = false;

      if (!_likesHTML5 && _s.html5PollingInterval) {

        // interval will stop itself at next execution.

        _h5TimerCount--;

      }

    }

  };

  _timerExecute = function() {

    /**
     * manual polling for HTML5 progress events, ie., whileplaying() (can achieve greater precision than conservative default HTML5 interval)
     */

    var i, j;

    if (_h5IntervalTimer !== null && !_h5TimerCount) {

      // no active timers, stop polling interval.

      window.clearInterval(_h5IntervalTimer);

      _h5IntervalTimer = null;

      return false;

    }

    // check all HTML5 sounds with timers

    for (i = _s.soundIDs.length; i--;) {

      if (_s.sounds[_s.soundIDs[i]].isHTML5 && _s.sounds[_s.soundIDs[i]]._hasTimer) {

        _s.sounds[_s.soundIDs[i]]._onTimer();

      }

    }

  };

  _catchError = function(options) {

    options = (typeof options !== 'undefined' ? options : {});

    if (_s.onerror instanceof Function) {
      _s.onerror.apply(_win, [{type:(typeof options.type !== 'undefined' ? options.type : null)}]);
    }

    if (typeof options.fatal !== 'undefined' && options.fatal) {
      _s.disable();
    }

  };

  _badSafariFix = function() {

    // special case: "bad" Safari (OS X 10.3 - 10.7) must fall back to flash for MP3/MP4
    if (!_isBadSafari || !_detectFlash()) {
      // doesn't apply
      return false;
    }

    var aF = _s.audioFormats, i, item;

    for (item in aF) {
      if (aF.hasOwnProperty(item)) {
        if (item === 'mp3' || item === 'mp4') {
          _s._wD(_sm+': Using flash fallback for '+item+' format');
          _s.html5[item] = false;
          // assign result to related formats, too
          if (aF[item] && aF[item].related) {
            for (i = aF[item].related.length; i--;) {
              _s.html5[aF[item].related[i]] = false;
            }
          }
        }
      }
    }

  };

  /**
   * Pseudo-private flash/ExternalInterface methods
   * ----------------------------------------------
   */

  this._setSandboxType = function(sandboxType) {

    // <d>
    var sb = _s.sandbox;

    sb.type = sandboxType;
    sb.description = sb.types[(typeof sb.types[sandboxType] !== 'undefined'?sandboxType:'unknown')];

    _s._wD('Flash security sandbox type: ' + sb.type);

    if (sb.type === 'localWithFile') {

      sb.noRemote = true;
      sb.noLocal = false;
      _wDS('secNote', 2);

    } else if (sb.type === 'localWithNetwork') {

      sb.noRemote = false;
      sb.noLocal = true;

    } else if (sb.type === 'localTrusted') {

      sb.noRemote = false;
      sb.noLocal = false;

    }
    // </d>

  };

  this._externalInterfaceOK = function(flashDate, swfVersion) {

    // flash callback confirming flash loaded, EI working etc.
    // flashDate = approx. timing/delay info for JS/flash bridge
    // swfVersion: SWF build string

    if (_s.swfLoaded) {
      return false;
    }

    var e, eiTime = new Date().getTime();

    _s._wD(_smc+'externalInterfaceOK()' + (flashDate?' (~' + (eiTime - flashDate) + ' ms)':''));
    _debugTS('swf', true);
    _debugTS('flashtojs', true);
    _s.swfLoaded = true;
    _tryInitOnFocus = false;

    if (_isBadSafari) {
      _badSafariFix();
    }

    // complain if JS + SWF build/version strings don't match, excluding +DEV builds
    // <d>
    if (!swfVersion || swfVersion.replace(/\+dev/i,'') !== _s.versionNumber.replace(/\+dev/i, '')) {

      e = _sm + ': Fatal: JavaScript file build "' + _s.versionNumber + '" does not match Flash SWF build "' + swfVersion + '" at ' + _s.url + '. Ensure both are up-to-date.';

      // escape flash -> JS stack so this error fires in window.
      setTimeout(function versionMismatch() {
        throw new Error(e);
      }, 0);

      // exit, init will fail with timeout
      return false;

    }
    // </d>

    if (_isIE) {
      // IE needs a timeout OR delay until window.onload - may need TODO: investigating
      setTimeout(_init, 100);
    } else {
      _init();
    }

  };

  /**
   * Private initialization helpers
   * ------------------------------
   */

  _createMovie = function(smID, smURL) {

    if (_didAppend && _appendSuccess) {
      // ignore if already succeeded
      return false;
    }

    function _initMsg() {
      _s._wD('-- SoundManager 2 ' + _s.version + (!_s.html5Only && _s.useHTML5Audio?(_s.hasHTML5?' + HTML5 audio':', no HTML5 audio support'):'') + (!_s.html5Only ? (_s.useHighPerformance?', high performance mode, ':', ') + (( _s.flashPollingInterval ? 'custom (' + _s.flashPollingInterval + 'ms)' : 'normal') + ' polling') + (_s.wmode?', wmode: ' + _s.wmode:'') + (_s.debugFlash?', flash debug mode':'') + (_s.useFlashBlock?', flashBlock mode':'') : '') + ' --', 1);
    }

    if (_s.html5Only) {

      // 100% HTML5 mode
      _setVersionInfo();

      _initMsg();
      _s.oMC = _id(_s.movieID);
      _init();

      // prevent multiple init attempts
      _didAppend = true;

      _appendSuccess = true;

      return false;

    }

    // flash path
    var remoteURL = (smURL || _s.url),
    localURL = (_s.altURL || remoteURL),
    swfTitle = 'JS/Flash audio component (SoundManager 2)',
    oEmbed, oMovie, oTarget = _getDocument(), tmp, movieHTML, oEl, extraClass = _getSWFCSS(),
    s, x, sClass, side = 'auto', isRTL = null,
    html = _doc.getElementsByTagName('html')[0];

    isRTL = (html && html.dir && html.dir.match(/rtl/i));
    smID = (typeof smID === 'undefined'?_s.id:smID);

    function param(name, value) {
      return '<param name="'+name+'" value="'+value+'" />';
    }

    // safety check for legacy (change to Flash 9 URL)
    _setVersionInfo();
    _s.url = _normalizeMovieURL(_overHTTP?remoteURL:localURL);
    smURL = _s.url;

    _s.wmode = (!_s.wmode && _s.useHighPerformance ? 'transparent' : _s.wmode);

    if (_s.wmode !== null && (_ua.match(/msie 8/i) || (!_isIE && !_s.useHighPerformance)) && navigator.platform.match(/win32|win64/i)) {
      /**
       * extra-special case: movie doesn't load until scrolled into view when using wmode = anything but 'window' here
       * does not apply when using high performance (position:fixed means on-screen), OR infinite flash load timeout
       * wmode breaks IE 8 on Vista + Win7 too in some cases, as of January 2011 (?)
       */
      _wDS('spcWmode');
      _s.wmode = null;
    }

    oEmbed = {
      'name': smID,
      'id': smID,
      'src': smURL,
      'width': side,
      'height': side,
      'quality': 'high',
      'allowScriptAccess': _s.allowScriptAccess,
      'bgcolor': _s.bgColor,
      'pluginspage': _http+'www.macromedia.com/go/getflashplayer',
      'title': swfTitle,
      'type': 'application/x-shockwave-flash',
      'wmode': _s.wmode,
      // http://help.adobe.com/en_US/as3/mobile/WS4bebcd66a74275c36cfb8137124318eebc6-7ffd.html
      'hasPriority': 'true'
    };

    if (_s.debugFlash) {
      oEmbed.FlashVars = 'debug=1';
    }

    if (!_s.wmode) {
      // don't write empty attribute
      delete oEmbed.wmode;
    }

    if (_isIE) {

      // IE is "special".
      oMovie = _doc.createElement('div');
      movieHTML = [
        '<object id="' + smID + '" data="' + smURL + '" type="' + oEmbed.type + '" title="' + oEmbed.title +'" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" codebase="' + _http+'download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=6,0,40,0" width="' + oEmbed.width + '" height="' + oEmbed.height + '">',
        param('movie', smURL),
        param('AllowScriptAccess', _s.allowScriptAccess),
        param('quality', oEmbed.quality),
        (_s.wmode? param('wmode', _s.wmode): ''),
        param('bgcolor', _s.bgColor),
        param('hasPriority', 'true'),
        (_s.debugFlash ? param('FlashVars', oEmbed.FlashVars) : ''),
        '</object>'
      ].join('');

    } else {

      oMovie = _doc.createElement('embed');
      for (tmp in oEmbed) {
        if (oEmbed.hasOwnProperty(tmp)) {
          oMovie.setAttribute(tmp, oEmbed[tmp]);
        }
      }

    }

    _initDebug();
    extraClass = _getSWFCSS();
    oTarget = _getDocument();

    if (oTarget) {

      _s.oMC = (_id(_s.movieID) || _doc.createElement('div'));

      if (!_s.oMC.id) {

        _s.oMC.id = _s.movieID;
        _s.oMC.className = _swfCSS.swfDefault + ' ' + extraClass;
        s = null;
        oEl = null;

        if (!_s.useFlashBlock) {
          if (_s.useHighPerformance) {
            // on-screen at all times
            s = {
              'position': 'fixed',
              'width': '8px',
              'height': '8px',
              // >= 6px for flash to run fast, >= 8px to start up under Firefox/win32 in some cases. odd? yes.
              'bottom': '0px',
              'left': '0px',
              'overflow': 'hidden'
            };
          } else {
            // hide off-screen, lower priority
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

        if (_isWebkit) {
          // soundcloud-reported render/crash fix, safari 5
          _s.oMC.style.zIndex = 10000;
        }

        if (!_s.debugFlash) {
          for (x in s) {
            if (s.hasOwnProperty(x)) {
              _s.oMC.style[x] = s[x];
            }
          }
        }

        try {
          if (!_isIE) {
            _s.oMC.appendChild(oMovie);
          }
          oTarget.appendChild(_s.oMC);
          if (_isIE) {
            oEl = _s.oMC.appendChild(_doc.createElement('div'));
            oEl.className = _swfCSS.swfBox;
            oEl.innerHTML = movieHTML;
          }
          _appendSuccess = true;
        } catch(e) {
          throw new Error(_str('domError')+' \n'+e.toString());
        }

      } else {

        // SM2 container is already in the document (eg. flashblock use case)
        sClass = _s.oMC.className;
        _s.oMC.className = (sClass?sClass+' ':_swfCSS.swfDefault) + (extraClass?' '+extraClass:'');
        _s.oMC.appendChild(oMovie);
        if (_isIE) {
          oEl = _s.oMC.appendChild(_doc.createElement('div'));
          oEl.className = _swfCSS.swfBox;
          oEl.innerHTML = movieHTML;
        }
        _appendSuccess = true;

      }

    }

    _didAppend = true;
    _initMsg();
    _s._wD(_smc+'createMovie(): Trying to load ' + smURL + (!_overHTTP && _s.altURL?' (alternate URL)':''), 1);

    return true;

  };

  _initMovie = function() {

    if (_s.html5Only) {
      _createMovie();
      return false;
    }

    // attempt to get, or create, movie
    // may already exist
    if (_flash) {
      return false;
    }

    // inline markup case
    _flash = _s.getMovie(_s.id);

    if (!_flash) {
      if (!_oRemoved) {
        // try to create
        _createMovie(_s.id, _s.url);
      } else {
        // try to re-append removed movie after reboot()
        if (!_isIE) {
          _s.oMC.appendChild(_oRemoved);
        } else {
          _s.oMC.innerHTML = _oRemovedHTML;
        }
        _oRemoved = null;
        _didAppend = true;
      }
      _flash = _s.getMovie(_s.id);
    }

    // <d>
    if (_flash) {
      _wDS('waitEI');
    }
    // </d>

    if (_s.oninitmovie instanceof Function) {
      setTimeout(_s.oninitmovie, 1);
    }

    return true;

  };

  _delayWaitForEI = function() {

    setTimeout(_waitForEI, 1000);

  };

  _waitForEI = function() {

    if (_waitingForEI) {
      return false;
    }

    _waitingForEI = true;
    _event.remove(_win, 'load', _delayWaitForEI);

    if (_tryInitOnFocus && !_isFocused) {
      // giant Safari 3.1 hack - assume mousemove = focus given lack of focus event
      _wDS('waitFocus');
      return false;
    }

    var p;
    if (!_didInit) {
      p = _s.getMoviePercent();
      _s._wD(_str('waitImpatient', (p === 100?' (SWF loaded)':(p > 0?' (SWF ' + p + '% loaded)':''))));
    }

    setTimeout(function() {

      p = _s.getMoviePercent();

      // <d>
      if (!_didInit) {
        _s._wD(_sm + ': No Flash response within expected time.\nLikely causes: ' + (p === 0?'Loading ' + _s.movieURL + ' may have failed (and/or Flash ' + _fV + '+ not present?), ':'') + 'Flash blocked or JS-Flash security error.' + (_s.debugFlash?' ' + _str('checkSWF'):''), 2);
        if (!_overHTTP && p) {
          _wDS('localFail', 2);
          if (!_s.debugFlash) {
            _wDS('tryDebug', 2);
          }
        }
        if (p === 0) {
          // if 0 (not null), probably a 404.
          _s._wD(_str('swf404', _s.url));
        }
        _debugTS('flashtojs', false, ': Timed out' + _overHTTP?' (Check flash security or flash blockers)':' (No plugin/missing SWF?)');
      }
      // </d>

      // give up / time-out, depending

      if (!_didInit && _okToDisable) {
        if (p === null) {
          // SWF failed. Maybe blocked.
          if (_s.useFlashBlock || _s.flashLoadTimeout === 0) {
            if (_s.useFlashBlock) {
              _flashBlockHandler();
            }
            _wDS('waitForever');
          } else {
            // old SM2 behaviour, simply fail
            _failSafely(true);
          }
        } else {
          // flash loaded? Shouldn't be a blocking issue, then.
          if (_s.flashLoadTimeout === 0) {
             _wDS('waitForever');
          } else {
            _failSafely(true);
          }
        }
      }

    }, _s.flashLoadTimeout);

  };

  _handleFocus = function() {

    function cleanup() {
      _event.remove(_win, 'focus', _handleFocus);
      _event.remove(_win, 'load', _handleFocus);
    }

    if (_isFocused || !_tryInitOnFocus) {
      cleanup();
      return true;
    }

    _okToDisable = true;
    _isFocused = true;
    _s._wD(_smc+'handleFocus()');

    if (_isSafari && _tryInitOnFocus) {
      _event.remove(_win, 'mousemove', _handleFocus);
    }

    // allow init to restart
    _waitingForEI = false;

    cleanup();
    return true;

  };

  _showSupport = function() {

    var item, tests = [];

    if (_s.useHTML5Audio && _s.hasHTML5) {
      for (item in _s.audioFormats) {
        if (_s.audioFormats.hasOwnProperty(item)) {
          tests.push(item + ': ' + _s.html5[item] + (!_s.html5[item] && _hasFlash && _s.flash[item] ? ' (using flash)' : (_s.preferFlash && _s.flash[item] && _hasFlash ? ' (preferring flash)': (!_s.html5[item] ? ' (' + (_s.audioFormats[item].required ? 'required, ':'') + 'and no flash support)' : ''))));
        }
      }
      _s._wD('-- SoundManager 2: HTML5 support tests ('+_s.html5Test+'): '+tests.join(', ')+' --',1);
    }

  };

  _initComplete = function(bNoDisable) {

    if (_didInit) {
      return false;
    }

    if (_s.html5Only) {
      // all good.
      _s._wD('-- SoundManager 2: loaded --');
      _didInit = true;
      _initUserOnload();
      _debugTS('onload', true);
      return true;
    }

    var wasTimeout = (_s.useFlashBlock && _s.flashLoadTimeout && !_s.getMoviePercent()),
        error;

    if (!wasTimeout) {
      _didInit = true;
      if (_disabled) {
        error = {type: (!_hasFlash && _needsFlash ? 'NO_FLASH' : 'INIT_TIMEOUT')};
      }
    }

    _s._wD('-- SoundManager 2 ' + (_disabled?'failed to load':'loaded') + ' (' + (_disabled?'security/load error':'OK') + ') --', 1);

    if (_disabled || bNoDisable) {
      if (_s.useFlashBlock && _s.oMC) {
        _s.oMC.className = _getSWFCSS() + ' ' + (_s.getMoviePercent() === null?_swfCSS.swfTimedout:_swfCSS.swfError);
      }
      _processOnEvents({type:'ontimeout', error:error});
      _debugTS('onload', false);
      _catchError(error);
      return false;
    } else {
      _debugTS('onload', true);
    }

    if (_s.waitForWindowLoad && !_windowLoaded) {
      _wDS('waitOnload');
      _event.add(_win, 'load', _initUserOnload);
      return false;
    } else {
      // <d>
      if (_s.waitForWindowLoad && _windowLoaded) {
        _wDS('docLoaded');
      }
      // </d>
      _initUserOnload();
    }

    return true;

  };

  _init = function() {

    _wDS('init');

    // called after onload()

    if (_didInit) {
      _wDS('didInit');
      return false;
    }

    function _cleanup() {
      _event.remove(_win, 'load', _s.beginDelayedInit);
    }

    if (_s.html5Only) {
      if (!_didInit) {
        // we don't need no steenking flash!
        _cleanup();
        _s.enabled = true;
        _initComplete();
      }
      return true;
    }

    // flash path
    _initMovie();

    try {

      _wDS('flashJS');

      // attempt to talk to Flash
      _flash._externalInterfaceTest(false);

      // apply user-specified polling interval, OR, if "high performance" set, faster vs. default polling
      // (determines frequency of whileloading/whileplaying callbacks, effectively driving UI framerates)
      _setPolling(true, (_s.flashPollingInterval || (_s.useHighPerformance ? 10 : 50)));

      if (!_s.debugMode) {
        // stop the SWF from making debug output calls to JS
        _flash._disableDebug();
      }

      _s.enabled = true;
      _debugTS('jstoflash', true);

      if (!_s.html5Only) {
        // prevent browser from showing cached page state (or rather, restoring "suspended" page state) via back button, because flash may be dead
        // http://www.webkit.org/blog/516/webkit-page-cache-ii-the-unload-event/
        _event.add(_win, 'unload', _doNothing);
      }

    } catch(e) {

      _s._wD('js/flash exception: ' + e.toString());
      _debugTS('jstoflash', false);
      _catchError({type:'JS_TO_FLASH_EXCEPTION', fatal:true});
      // don't disable, for reboot()
      _failSafely(true);
      _initComplete();

      return false;

    }

    _initComplete();

    // disconnect events
    _cleanup();

    return true;

  };

  _domContentLoaded = function() {

    if (_didDCLoaded) {
      return false;
    }

    _didDCLoaded = true;
    _initDebug();

    /**
     * Temporary feature: allow force of HTML5 via URL params: sm2-usehtml5audio=0 or 1
     * Ditto for sm2-preferFlash, too.
     */
    // <d>
    (function(){

      var a = 'sm2-usehtml5audio=', l = _wl.toLowerCase(), b = null,
      a2 = 'sm2-preferflash=', b2 = null, hasCon = (typeof console !== 'undefined' && typeof console.log !== 'undefined');

      if (l.indexOf(a) !== -1) {
        b = (l.charAt(l.indexOf(a)+a.length) === '1');
        if (hasCon) {
          console.log((b?'Enabling ':'Disabling ')+'useHTML5Audio via URL parameter');
        }
        _s.useHTML5Audio = b;
      }

      if (l.indexOf(a2) !== -1) {
        b2 = (l.charAt(l.indexOf(a2)+a2.length) === '1');
        if (hasCon) {
          console.log((b2?'Enabling ':'Disabling ')+'preferFlash via URL parameter');
        }
        _s.preferFlash = b2;
      }

    }());
    // </d>

    if (!_hasFlash && _s.hasHTML5) {
      _s._wD('SoundManager: No Flash detected'+(!_s.useHTML5Audio?', enabling HTML5.':'. Trying HTML5-only mode.'));
      _s.useHTML5Audio = true;
      // make sure we aren't preferring flash, either
      // TODO: preferFlash should not matter if flash is not installed. Currently, stuff breaks without the below tweak.
      _s.preferFlash = false;
    }

    _testHTML5();
    _s.html5.usingFlash = _featureCheck();
    _needsFlash = _s.html5.usingFlash;
    _showSupport();

    if (!_hasFlash && _needsFlash) {
      _s._wD('SoundManager: Fatal error: Flash is needed to play some required formats, but is not available.');
      // TODO: Fatal here vs. timeout approach, etc.
      // hack: fail sooner.
      _s.flashLoadTimeout = 1;
    }

    if (_doc.removeEventListener) {
      _doc.removeEventListener('DOMContentLoaded', _domContentLoaded, false);
    }

    _initMovie();
    return true;

  };

  _domContentLoadedIE = function() {

    if (_doc.readyState === 'complete') {
      _domContentLoaded();
      _doc.detachEvent('onreadystatechange', _domContentLoadedIE);
    }

    return true;

  };

  _winOnLoad = function() {
    // catch edge case of _initComplete() firing after window.load()
    _windowLoaded = true;
    _event.remove(_win, 'load', _winOnLoad);
  };

  // sniff up-front
  _detectFlash();

  // focus and window load, init (primarily flash-driven)
  _event.add(_win, 'focus', _handleFocus);
  _event.add(_win, 'load', _handleFocus);
  _event.add(_win, 'load', _delayWaitForEI);
  _event.add(_win, 'load', _winOnLoad);


  if (_isSafari && _tryInitOnFocus) {
    // massive Safari 3.1 focus detection hack
    _event.add(_win, 'mousemove', _handleFocus);
  }

  if (_doc.addEventListener) {

    _doc.addEventListener('DOMContentLoaded', _domContentLoaded, false);

  } else if (_doc.attachEvent) {

    _doc.attachEvent('onreadystatechange', _domContentLoadedIE);

  } else {

    // no add/attachevent support - safe to assume no JS -> Flash either
    _debugTS('onload', false);
    _catchError({type:'NO_DOM2_EVENTS', fatal:true});

  }

  if (_doc.readyState === 'complete') {
    // DOMReady has already happened.
    setTimeout(_domContentLoaded,100);
  }

} // SoundManager()

// SM2_DEFER details: http://www.schillmania.com/projects/soundmanager2/doc/getstarted/#lazy-loading

/*
if (typeof SM2_DEFER === 'undefined' || !SM2_DEFER) {
  soundManager = new SoundManager();
}
*/

/**
 * SoundManager public interfaces
 * ------------------------------
 */

window.SoundManager = SoundManager; // constructor
window.soundManager = soundManager; // public API, flash callbacks etc.

}(window));

/*global _:false */

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

(function() {

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

  window.Feed = window.Feed || {};
  window.Feed.Events = Events;

})();


(function() {
  // no loggy!
  window.Feed = window.Feed || {};
  window.Feed.log = function() { };

})();


/*global _:false, SoundManager:false */

/*
 * The speaker object encapsulates the SoundManager2 code and boils it down
 * to the following api:
 *
 *    speaker.initializeForMobile: mobile clients can only start using
 *      speaker when handling an 'onClick' event. This call should be made 
 *      at that time to get sound initialized while waiting for details
 *      of what to play from the server. 
 *
 *    speaker.setVolume(value): set the volume from 0 (mute) - 100 (full volume)
 *
 *    var sound = speaker.create(url, eventHandlerMap): create a new sound from the
 *       given url and return a 'song' object that can be used to pause/play/
 *       destroy the song and receive trigger events as the song plays/stops. 
 *
 *       The 'eventHandlerMap' is an object that maps events emitted from the
 *       returned object to handler functions. If you don't provide the
 *       callbacks here, you can do "sound.on('event', function() { ... })"
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
 *         play: start playback
 *         pause: pause playback
 *         resume: resume playback
 *         destroy: stop playback, prevent any future playback, and free up memory
 *
 * You shouldn't directly create an instance of the speaker - instead use this:
 *
 *   var speaker = Feed.getSpeaker(options);
 *
 * That will make sure that all code uses the same instance of 'speaker'. 'options'
 * is optional, and is an object with any of the following keys:
 *
 *   swfBase: URL pointing to directory containing 'soundmanager2.swf' file 
 *            for flash fallback
 *   preferFlash: if true, opt to use the flash plugin rather than the
 *                browser's 'audio' tag
 *   debug: if true, emit debug information to the console
 *   silence: URL to an mp3 with no sound, for initializing mobile clients
 *
 * This code uses the wonderful SoundManager2 api and falls back to
 * the soundmanager2 flash plugin if HTML5 audio isn't available. 
 *
 */

(function() {
  var log = window.Feed.log;

  var Sound = function(callbacks) { 
    var obj = _.extend(this, window.Feed.Events);

    if (callbacks) {
      _.each(callbacks, function(cb, ev) {
        obj.on(ev, cb);
      });
    }

    return obj;
  };

  Sound.prototype = {
    play: function() {
      if (this.songObject) {
        this.songObject.play();
      }
    },

    // pause playback of the current sound clip
    pause: function() {
      if (this.songObject) {
        this.songObject.pause();
      }
    },

    // resume playback of the current sound clip
    resume: function() {
      if (this.songObject) {
        this.songObject.resume();
      }
    },

    // elapsed number of milliseconds played
    position: function() {
      if (this.songObject) {
        return this.songObject.position;
      } else {
        return 0;
      }
    },

    // duration in milliseconds of the song
    // (this may change until the song is full loaded)
    duration: function() {
      if (this.songObject) {
        var d = this.songObject.duration;
        return d ? d : 1;
      } else {
        return 1;
      }
    },

    // stop playing the given sound clip, unload it, and disable events
    destroy: function() {
      log('destroy triggered for', this.id);

      if (this.songObject) {
        delete speaker.outstandingPlays[this.id];
        this.songObject.destruct();
        this.songObject = null;
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

    window.soundManager = new SoundManager();
    window.soundManager.wmode = 'transparent';
    window.soundManager.useHighPerformance = true;
    window.soundManager.flashPollingInterval = 500;
    window.soundManager.html5PollingInterval = 500;

    options = options || {};
    window.soundManager.debugMode = options.debug || false;
    window.soundManager.debugFlash = options.debug || false;
    window.soundManager.preferFlash = options.preferFlash || false;
    window.soundManager.url = options.swfBase || '';

    window.soundManager.onready(function() {
      // swap in the true sound object creation function
      speaker.createSongObject = function(songOptions) {
        return window.soundManager.createSound(songOptions);
      };

      // create actual sound objects for sounds already queued up
      _.each(speaker.outstandingPlays, function(sound) {
        var playing = sound.songObject.playing;

        speaker._assignSongObject(sound);

        if (playing) {
          sound.songObject.play();
        }
      });
    });

    this.silence = options.silence || '/sample/5seconds.mp3';

    window.soundManager.beginDelayedInit();
  };
  
  Speaker.prototype = {
    vol: 100,
    outstandingPlays: { },
    mobileInitialized: false,

    createSongObject: function(options) { 
      // this is replaced with a real call to SoundManager upon initialization
      return { 
        fake: true,
        playing: false,
        options: options,
        setVolume: function() { },
        play: function() { this.playing = true; },
        pause: function() { this.playing = false; },
        resume: function() { this.playing = true; },
        destruct: function() { }
      };
    },

    initializeForMobile: function() {
      if (!this.mobileInitialized) {
        // Just play a blank mp3 file that we know the location of, presumably
        // while we ping the server for the song we want
        var sound = this.createSongObject({
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

      this._assignSongObject(sound);

      return sound;
    },

    _assignSongObject: function(sound) {
      sound.songObject = this.createSongObject({
        id: sound.id,
        url: sound.url,
        volume: speaker.vol,
        autoPlay: false,
        type: 'audio/mp3',
        onfinish: function() {
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
        }
      });

      return sound;
    },

    // set or get the volume (0-100)
    setVolume: function(value) {
      if (typeof value !== 'undefined') {
        this.vol = value;

        _.each(this.outstandingPlays, function(song) {
          song.songObject.setVolume(value);
        });

        this.trigger('volume', value);
      }

      return this.vol;
    }

  };

  // add events to speaker class
  _.extend(Speaker.prototype, window.Feed.Events);

  window.Feed = window.Feed || {};

  var speaker = null;

  // there should only ever be a single instance of 'Speaker'
  window.Feed.getSpeaker = function(options) {
    if (speaker === null) {
      speaker = new Speaker(options);
    }

    return speaker;
  };

})();

/*global _:false, $:false, CryptoJS:false, OAuth:false */
/*jshint camelcase:false */

/*
 *  Feed Media Session API
 *
 *  This manages all communication with the server and is the single point
 *  of truth for a client to manage what is actively being played. It
 *  should be created with:
 *
 *  var session = new Feed.Session(token, secret);
 *
 *  Then you need to set a placement and optionally a station:
 *
 *  session.setPlacementId(placementId);
 *  session.setStationId(stationId);
 *  session.setFormats(formats); // "mp3", "aac", "mp3,aac"
 *
 *  If any of the above calls are made while we're actively tuning (we've
 *  got an active song or a pending song), then any currently active song
 *  will be marked as 'completed' and a new song will be requested from
 *  the server.
 *
 *  Then you attach event listeners to the session:
 *
 *  session.on('play-active', someHandler);
 *
 *  Then you optionally ask the server for information about the station we're
 *  tuning to:
 *
 *  session.getStationInformation(function(stationInfo) { console.log(stationInfo); });
 *
 *  Then you tell the session to start maintaining a queue of 
 *  music to play:
 *
 *  session.tune();
 *
 *  The session will now emit the following events:
 *
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
 */

(function() {
  var log = window.Feed.log;

  // use SHA256 for encryption
  OAuth.SignatureMethod.registerMethodClass(['HMAC-SHA256', 'HMAC-SHA256-Accessor'],
    OAuth.SignatureMethod.makeSubclass(
      function getSignature(baseString) {
        var hash = CryptoJS.HmacSHA256(baseString, this.key);
        var signature = hash.toString(CryptoJS.enc.Base64);
        return signature;
      }
    ));

  var Session = function(token, secret) {
    this.config = {
      // token
      // secret
      // placementId
      // stationId
      // clientId
      baseUrl: 'http://feed.fm',
      formats: 'mp3,aac',
      maxBitrate: 128,
      timeOffset: 0,
      current: null, /* {
                          play:  play object we're currently playing
                          started: defaults to false
                          canSkip: defaults to false
                         }, */
      pendingRequest: null, /* {
                                 ajax:       form data we sent to request a play
                                 retryCount: number of times we've retried 
                               }, */
      
      pendingPlay: null // play object we'll start upon completion of current
                        //   sound 
    };

    _.extend(this, window.Feed.Events);

    if (token && secret) {
      this.setCredentials(token, secret);
    }
  };

  Session.prototype.setBaseUrl = function(baseUrl) {
    this.config.baseUrl = baseUrl;
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

    if (!this.config.placementId) {
      throw new Error('no placementId set');
    }

    // abort any pending requests or plays
    this.config.pendingRequest = null;
    this.config.pendingPlay = null;

    // stop playback of any current song, and set
    // the status to waiting
    this._assignCurrentPlay(null, true);

    // kick off request for next play
    this._requestNextPlay();
  };

  // getStationInformation
  Session.prototype.getStationInformation = function(stationInformationCallback, delay) {
    var self = this;

    if (!this.config.placementId) {
      throw new Error('no placementId set');
    }

    this._getClientId().then(function() {
      var ajax = { 
        url: self.config.baseUrl + '/api/v2/placement/' + self.config.placementId + '/station',
        type: 'GET',
        dataType: 'json',
        timeout: 6000,
        data: {
          client_id: self.config.clientId
        }
      };

      if (self.config.stationId) {
        ajax.data.station_id = self.config.stationId;
      }

      // request new play from server
      log('requesting station information from server');
      self._signedAjax(ajax)
        .done(_.bind(self._receiveStationInformation, self, stationInformationCallback))
        .fail(_.bind(self._failedStationInformation, self, delay, ajax, stationInformationCallback));
    });
  };

  Session.prototype._receiveStationInformation = function(stationInformationCallback, stationInformation) {
    if (stationInformation && stationInformation.success && (stationInformation.stations.length > 0)) {
      stationInformationCallback(stationInformation.stations[0]);
    }
  };

  Session.prototype._failedStationInformation = function(delay, ajax, stationInformationCallback) {
    delay = delay ? (delay * 2) : 500;
    _.delay(_.bind(this.getStationInformation, this, stationInformationCallback, delay), delay);
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
      url: this.config.baseUrl + '/api/v2/play/' + this.config.current.play.id + 'elapse', 
      type: 'POST',
      data: {
        seconds: seconds
      }
    });
  };

  Session.prototype.reportPlayCompleted = function() {
    if (this.config.current && (this.config.current.started)) {
      this._signedAjax({
        url: this.config.baseUrl + '/api/v2/play/' + this.config.current.play.id + '/complete',
        type: 'POST'
      });

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

    } else {
      log('finish on non-active or playing song');
      throw new Error('no active or playing song');
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
    if (this.config.current && (this.config.current.play !== play)) {
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
    if (this.config.current && (this.config.current.play !== play)) {
      // not playing this song any more - just ignore it
      return;
    }
    // technically the skip wasn't denied - we just couldn't confirm wether
    // it was ok, but this is the best we can return at the moment
    this.trigger('skip-denied');
  };

  Session.prototype._receiveSkip = function(play, response) {
    if (this.config.current && (this.config.current.play !== play)) {
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
      this._receiveStartPlay(play, false);

    } else {
      log('telling server we\'re starting the play', play);

      // tell the server that we're going to start this song
      this._signedAjax({
        url: this.config.baseUrl + '/api/v2/play/' + play.id + '/start',
        type: 'POST',
        dataType: 'json',
        timeout: 3000,
        data: { id: play.id }
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

  Session.prototype._failStartPlay = function(play) {
    // only process if we're still actually waiting for this
    if (this.config.current && (this.config.current.play === play)) {
      log('request failed - trying again in 1 second');

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
    if (this.config.pendingRequest) {
      if (this.config.pendingRequest.inprogress) {
        log('tried to get another play while we\'re loading one up');

        // request is currently in progress
        return;
      
      } else if (delay > 60000) {
        log('giving up on retrieving next play');

        // we already retried this - let's give up
        this.config.pendingRequest = null;

        if (this.config.current == null) {
          // we're not playing anything, so we're waiting. 
          // set assign play to null again to trigger empty/idle
          this._assignCurrentPlay(null);
        }
        return;

      } else {
        // retry the request
        this.config.pendingRequest.retryCount++;

        this._signedAjax(this.config.pendingRequest.ajax)
          .done(_.bind(this._receiveNextPlay, this, this.config.pendingRequest.ajax))
          .fail(_.bind(this._failedNextPlay, this, delay, this.config.pendingRequest.ajax));
        return;
      }
      
    } else {
      var self = this;

      self.config.pendingRequest = {
        inprogress: true
      };

      this._getClientId().then(function() {
        if (!self.config.pendingRequest || !self.config.pendingRequest.inprogress) {
          // don't get a new song if we've aborted things
          return;
        }
        
        var ajax = { 
          url: self.config.baseUrl + '/api/v2/play',
          type: 'POST',
          dataType: 'json',
          timeout: 6000,
          data: {
            placement_id: self.config.placementId,
            formats: self.config.formats,
            client_id: self.config.clientId,
            max_bitrate: self.config.maxBitrate
          }
        };

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
      });
    }
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
  Session.prototype._failedNextPlay = function(delay, ajax) {
    // only process if we're still actually waiting for this
    if (this.config.pendingRequest && (this.config.pendingRequest.ajax === ajax)) {
      log('request failed - trying again');

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
    this.clientPromise.then(function(clientId) {
      // once we've got a clientId, stick it in the config
      self.config.clientId = clientId;

      self._setStoredCid(self.config.clientId);
    });

    this._requestClientId(clientDeferred);

    return this.clientPromise;
  };

  // hit the server up for a client id and return it via the passed in deferred
  Session.prototype._requestClientId = function(deferred, delay) {
    // see if we've got a cookie
    var clientId = this._getStoredCid();

    if (clientId) {
      return deferred.resolve(clientId);

    } else {
      var self = this;

      this._signedAjax({
        url: self.config.baseUrl + '/api/v2/client',
        type: 'POST'

      }).done(function(response) {
        if (response.success) {
          deferred.resolve(response.client_id);

        } else {
          repeatAfter(delay, 2000, function(newDelay) { 
            // retry until the end of time
            self._requestClientId(deferred, newDelay);
          });
        }

      }).fail(function() {
        repeatAfter(delay, 2000, function(newDelay) { 
          // retry until the end of time
          self._requestClientId(deferred, newDelay);
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

  function supports_html5_storage() {
    try {
      return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
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
    // sign the form if oauth is requested
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

    request.headers = {
      Authorization: OAuth.getAuthorizationHeader('Feed.fm', message.parameters)
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

  window.Feed = window.Feed || {};
  window.Feed.Session = Session;

})();


/*global _:false */
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
 *    player = new Feed.Player(token, secret)
 *
 *  Then set the placement (and optionally station) that we're pulling
 *  from:
 *
 *    player.setPlacementId(xxx);
 *      set placement on session, which should stop any current plays
 *    player.setStationId(xxx);
 *      set station on session, which should stop any current plays
 *
 *  Optionally get information about the station we're tuning in to:
 *
 *    player.getStationInformation(function(stationInfo) { console.log(stationInfo); });
 *      ask the server about the station we're about to tune to.
 *
 *  Then control playback with:
 *
 *    tune() - load up the first song from the current placement/station, but
 *      don't actually start playing it.
 *    play() - start playing the current placement/station or resume the current song
 *    pause() - pause playback of the current song, if any
 *    skip() - request to skip the current song
 *
 *  player has a current state that can be queried with 'getCurrentState()':
 *    playing - if session.hasActivePlayStarted() and we're not paused
 *    paused -  if session.hasActivePlayStarted() and we're paused
 *    waiting - if session.waitingForRequest() or session.hasActivePlayStarted() and we're
 *       still loading an mp3
 *    idle - if !session.hasActivePlayStarted()
 *
 *  session events are proxied via the play object:
 *    play-active - this play is queued up and ready for playback
 *    play-started - this play has begun playback
 *    play-completed  - this play has completed playback
 *    plays-exhausted - there are no more plays available from this placement/station combo
 *    skip-denied - the given song could not be skipped due to DMCA rules
 *  
 *  and the play object adds some new events:
 *    play-paused - the currently playing song was paused
 *    play-resumed - the currently playing song was resumed
 *
 *  Some misc methods:
 *
 *    setMuted(muted)
 *
 */

(function() {
  var log = window.Feed.log;

  function supports_html5_storage() {
    try {
      return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
      return false;
    }
  }

  var Player = function(token, secret, options) {
    this.state = {
      paused: true
      // activePlay
    };

    options = options || {};

    _.extend(this, window.Feed.Events);

    this.session = new window.Feed.Session(token, secret);
    this.session.on('play-active', this._onPlayActive, this);
    this.session.on('play-completed', this._onPlayCompleted, this);
    this.session.on('plays-exhausted', this._onPlaysExhausted, this);

    this.speaker = window.Feed.getSpeaker(options);
    this.setMuted(this.isMuted());

    this.session.on('all', function() {
      log('proxying from', this, arguments);
      // propagate all events out to everybody else
      this.trigger.apply(this, Array.prototype.slice.call(arguments, 0));
    }, this);
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
    this.state.activePlay = {
      id: play.id,
      sound: this.speaker.create(play.audio_file.url, {
        play: _.bind(this._onSoundPlay, this),
        pause: _.bind(this._onSoundPause, this),
        finish:  _.bind(this._onSoundFinish, this)
      }),
      playCount: 0
    };
    // if we're not paused, then start it
    if (!this.state.paused) {
      this.state.activePlay.sound.play();
    }
  };

  Player.prototype._onSoundPlay = function() {
    // sound started playing
    if (!this.state.activePlay) {
      throw new Error('got an onSoundPlay, but no active play?');
    }
    
    this.state.activePlay.playCount++;

    this.state.paused = false;

    // on the first play, tell the server we're good to go
    if (this.state.activePlay.playCount === 1) {
      return this.session.reportPlayStarted();
    }

    // subsequent plays are considered 'resumed' events
    this.trigger('play-resumed', this.session.getActivePlay());
  };

  Player.prototype._onSoundPause = function() {
    // sound paused playback
    if (!this.state.activePlay) {
      throw new Error('got an onSoundPause, but no active play?');
    }
    
    this.state.paused = true;

    this.trigger('play-paused', this.session.getActivePlay());
  };

  Player.prototype._onSoundFinish = function() {
    if (!this.state.activePlay) {
      throw new Error('got an onSoundFinished, but no active play?');
    }

    this.session.reportPlayCompleted();
  };

  Player.prototype._onPlayCompleted = function() {
    if (!this.state.activePlay) {
      throw new Error('got onPlayCompleted, but no active play!');
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
    if (!this.session.isTuned()) {
      this.session.tune();
    }
  };

  Player.prototype.play = function() {
    this.speaker.initializeForMobile();

    if (!this.session.isTuned()) {
      // not currently playing music
      this.state.paused = false;

      return this.session.tune();

    } else if (this.session.getActivePlay && this.state.activePlay && this.state.paused) {
      // resume playback of song
      if (this.state.activePlay.playCount > 1) {
        this.state.activePlay.sound.resume();

      } else {
        this.state.activePlay.sound.play();
      }
    } else {
      log('state', this.state);
    }

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
    if (!this.session.hasActivePlayStarted()) {
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

  window.Feed = window.Feed || {};
  window.Feed.Player = Player;
})();


/*global _:false, $:false */
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
 *    playerView = new Feed.PlayerView(player, id);
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
 *    <button class='pause-button button-disabled'>Pause</button>
 *    <button class='skip-button button-disabled'>Skip</button>
 *  </div>
 *
 *  The buttons should all be 'button-disabled' except for the play
 *  button. As the player changes state, it will change the enabled
 *  status of each button.
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
 */

(function() {
  var PlayerView = function(id, player) {
    var playerView = this;

    this.id = id;
    this.alertId = null;
    this.durationId = null;
    this.startedPlayback = false;

    this.$el = $('#' + id);
    this.player = player;

    
    this.player.on('play-started', this._onPlayStarted, this);
    this.player.on('play-paused', this._onPlayPaused, this);
    this.player.on('play-resumed', this._onPlayResumed, this);
    this.player.on('play-completed', this._onPlayCompleted, this);
    this.player.on('plays-exhausted', this._onPlaysExhausted, this);
    this.player.on('skip-denied', this._onSkipDenied, this);
    this.player.on('muted', _.bind(this.renderMute, this, true));
    this.player.on('unmuted', _.bind(this.renderMute, this, false));

    this._enableButtonsBasedOnState();
    this.displayText = this.originalDisplayText = this.$('.status').html();
    this.renderStatus();

    this.player.getStationInformation(function(station) {
      playerView.originalDisplayText = playerView.formatStation(station);
      playerView.renderStatus(playerView.originalDisplayText);
    });

    this.renderMute(this.player.isMuted());

    this.$('.play-button').on('click', _.bind(this._onPlayButtonClick, this));
    this.$('.pause-button').on('click', _.bind(this._onPauseButtonClick, this));
    this.$('.skip-button').on('click', _.bind(this._onSkipButtonClick, this));
    this.$('.mute-button').on('click', _.bind(this._onMuteButtonClick, this));
    this.$('.un-mute-button').on('click', _.bind(this._onUnMuteButtonClick, this));
  };

  PlayerView.prototype._onMuteButtonClick = function() {
    this.player.setMuted(true);
  };

  PlayerView.prototype._onUnMuteButtonClick = function() {
    this.player.setMuted(false);
  };

  PlayerView.prototype.renderMute = function(isMuted) {
    if (isMuted) {
      this.$('.mute-button').removeClass('button-enabled').addClass('button-disabled');
      this.$('.un-mute-button').removeClass('button-disabled').addClass('button-enabled');
    } else {
      this.$('.mute-button').removeClass('button-disabled').addClass('button-enabled');
      this.$('.un-mute-button').removeClass('button-enabled').addClass('button-disabled');
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

  PlayerView.prototype.$ = function(arg) {
    return this.$el.find(arg);
  };

  PlayerView.prototype._onPlayStarted = function(play) {
    this.renderStatus(this.formatPlay(play));
    this._enableButtonsBasedOnState();
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
    this.renderStatus(this.originalDisplayText);
    this.renderPosition(0, 0);
    this._enableButtonsBasedOnState();
  };

  PlayerView.prototype._onPlaysExhausted = function() {
    this.renderAlert('There is no more music to play in this station!');

    this._enableButtonsBasedOnState();
  };

  PlayerView.prototype._onSkipDenied = function() {
    this.renderAlert('Sorry you\'ve temporarily run out of skips!');
  };

  PlayerView.prototype.formatPlay = function(play) {
    return '<span class=\'track\'>' + play.audio_file.track.title +
       '</span> by <span class=\'artist\'>' + play.audio_file.artist.name +
       '</span> on <span class=\'release\'>' + play.audio_file.release.title + '</span>';
  };

  PlayerView.prototype.formatStation = function(station) {
    return '<span class=\'station\'>' + station.name + '</span>';
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

  PlayerView.prototype._enableButtonsBasedOnState = function() {
    var state = this.player.getCurrentState();

    switch (state) {
      case 'playing':
        this.$('.play-button').removeClass('button-enabled').addClass('button-disabled').attr('disabled', 'true');
        this.$('.pause-button').removeClass('button-disabled').addClass('button-enabled').removeAttr('disabled');
        if (this.player.maybeCanSkip()) {
          this.$('.skip-button').removeClass('button-disabled').addClass('button-enabled').removeAttr('disabled');
        } else {
          this.$('.skip-button').removeClass('button-enabled').addClass('button-disabled').attr('disabled', 'true');
        }
        break;

      case 'paused':
        this.$('.play-button').removeClass('button-disabled').addClass('button-enabled').removeAttr('disabled');
        this.$('.pause-button').removeClass('button-enabled').addClass('button-disabled').attr('disabled', 'true');
        if (this.player.maybeCanSkip()) {
          this.$('.skip-button').removeClass('button-disabled').addClass('button-enabled').removeAttr('disabled');
        } else {
          this.$('.skip-button').removeClass('button-enabled').addClass('button-disabled').attr('disabled', 'true');
        }
        break;

      /* case 'idle': */
      default:
        this.$('.play-button').removeClass('button-disabled').addClass('button-enabled').removeAttr('disabled');
        this.$('.pause-button').removeClass('button-enabled').addClass('button-disabled').attr('disabled', 'true');
        this.$('.skip-button').removeClass('button-enabled').addClass('button-disabled').attr('disabled', 'true');
        break;
    }
  };

  window.Feed = window.Feed || {};
  window.Feed.PlayerView = PlayerView;

})();

