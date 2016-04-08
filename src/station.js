/*global module:false*/

var _ = require('underscore');

/**
 * @classdesc
 *
 * Class to wrap a 'station' representation returned from
 * a REST call. A typical value looks like:
 *
 * ```
 * var station = {
 *   id: '123',
 *   name: 'name of station',
 *   on_demand: false,
 *   options: {
 *     // arbitrary json
 *   }
 * };
 * ```
 *
 * @constructor
 */

var Station = function(stationJson) {
  _.extend(this, stationJson);
};

module.exports = Station;
