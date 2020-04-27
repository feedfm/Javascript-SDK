import { addProtocol } from './util';

let baseUrl = 'https://feed.fm';

export function getBaseUrl() {
  return baseUrl;
}

export function setBaseUrl(url) {
  baseUrl = addProtocol(url);
}
