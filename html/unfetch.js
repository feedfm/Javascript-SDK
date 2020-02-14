/**
 * This file swaps out the default browser 'fetch' with code that uses XMLHttpRequest,
 * so that we can stub out the server for testing with sinon's fakeServer.
 * 
 * @param {String} url endpoint to fetch
 * @param {Object} options basic fetch options
 */

function unfetch(url, options) {
	options = options || {};
	return new Promise( (resolve, reject) => {
console.log('new fetch with', XMLHttpRequest);

		const request = new XMLHttpRequest();
		const keys = [];
		const all = [];
		const headers = {};

		const response = () => ({
			ok: (request.status/100|0) == 2,		// 200-299
			statusText: request.statusText,
			status: request.status,
			url: request.responseURL,
			text: () => Promise.resolve(request.responseText),
			json: () => Promise.resolve(JSON.parse(request.responseText)),
			blob: () => Promise.resolve(new Blob([request.response])),
			clone: response,
			headers: {
				keys: () => keys,
				entries: () => all,
				get: n => headers[n.toLowerCase()],
				has: n => n.toLowerCase() in headers
			}
		});

		console.log('running fake request', url);
		request.open(options.method || 'get', url, true);

		request.onload = () => {
			request.getAllResponseHeaders().replace(/^(.*?):[^\S\n]*([\s\S]*?)$/gm, (m, key, value) => {
				keys.push(key = key.toLowerCase());
				all.push([key, value]);
				headers[key] = headers[key] ? `${headers[key]},${value}` : value;
			});
			resolve(response());
		};

		request.onerror = reject;

		request.withCredentials = options.credentials=='include';

		for (const i in options.headers) {
			request.setRequestHeader(i, options.headers[i]);
		}

		request.send(options.body || null);
	});
}

window.fetch = unfetch;
