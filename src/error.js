/*global module:false */

// error codes returned from Feed servers:
module.exports = {
  badCredentials: { id: 5, message: 'Invalid credentials, The provided credentials are invalid.', status: 401 },
  forbidden: { id: 6, message: 'Access forbidden', status: 403 },
  skipDenied: { id: 7, message: 'User may not skip current song', status: 200 },

  noMoreMusic: { id: 9, message: 'There is no more music that can be played for this client and this station right now.' },

  playNotActive: { id: 12, message: 'The specified play isn\'t being played, so it can\'t be skipped' },

  invalidParameter: { id: 15, message: 'Invalid parameter value', status: 400 },
  missingParameter: { id: 16, message: 'Missing parameter', status: 400 },
  missingObject:    { id: 17, message: 'No such object', status: 404 },
  internalError:    { id: 18, message: 'Unhandled internal error', status: 500 },
  notUS:            { id: 19, message: 'Non-US client', status: 403 },
  playbackStarted: { id: 20, message: 'Playback was already started for this play', status: 403 },
  playbackComplete: { id: 21, message: 'This play has already complete playback', status: 403 },
  throttled:        { id: 22, message: 'You have exceeded normal request limits and are being throttled', status:429 },
  notOnDemand:      { id: 23, message: 'This station is not on-demand', status: 403 },
  formatUnavailable:  { id: 24, message: 'Unable to find a version of this file that meets format and bitrate constriants' }
};

