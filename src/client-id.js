
import { getCookie, setCookie, removeCookie } from 'tiny-cookie';
import log from './log';
import { repeatAfter } from './util';
import { getBaseUrl } from './base-url';

const cookieName = 'cid';
let clientPromise;

const noDocument = (typeof(document) === 'undefined');
let noDocumentClientId = null;

function _getStoredCid() {
  if (noDocument) {
    return noDocumentClientId;
  } else {
    return getCookie(cookieName);
  }
}

function _setStoredCid(value) {
  if (noDocument) {
    noDocumentClientId = value;
  } else {
    setCookie(cookieName, value, { expires: 3650, path: '/' });
  }
}

function _deleteStoredCid() {
  if (noDocument) {
    noDocumentClientId = null;
  } else {
    removeCookie(cookieName);
  }
}

// hit the server up for a client id and return it to the callback
function _requestClientId(onSuccess, delay) {
  // see if we've got a cookie
  var clientId = _getStoredCid();

  if (clientId) {
    return onSuccess(clientId);
  } else {
    fetch(getBaseUrl() + '/api/v2/client', {
      method: 'POST',
    })
      .then((response) => response.json())
      .then(function (response) {
        if (response.success) {
          onSuccess(response.client_id);
        } else {
          repeatAfter(delay, 2000, function (newDelay) {
            // retry until the end of time
            _requestClientId(onSuccess, newDelay);
          });
        }
      })
      .catch(function (response) {
        if (response.status === 403) {
          try {
            var fullResponse = JSON.parse(response.responseText);
            log('error trying to get client id:', fullResponse);

          } catch (e) {
            // some other response - fall through and try again
            log('unknown response for client id request', e.message);
          }
        } else {
          log('unknown client id response status', response.status);
        }

        repeatAfter(delay, 2000, function (newDelay) {
          // retry until the end of time
          _requestClientId(onSuccess, newDelay);
        });
      });
  }
}

export function getClientId() {
  if (!clientPromise) {
    clientPromise = new Promise((resolve) => {
      _requestClientId((clientId) => {
        _setStoredCid(clientId);

        resolve(clientId);
      });
    });
  }

  return clientPromise;
}

export let getStoredClientId = _getStoredCid;
export let setStoredClientId = _setStoredCid;

export function deleteClientId() {
  _deleteStoredCid();

  clientPromise = null;
}


