
import Events from './events';
import { getClientId } from './client-id';
import { getBaseUrl } from './base-url';

/**
 * This class connects to a specific simulcast stream and
 * sends out events to indicate when new songs are starting
 * or when music has stopped playing. This listener has a
 * 'state' that is one of 
 * 
 *   'idle' - no music is playing
 *   'playing' - a song is actively playing
 *   'paused' - the current song is paused
 *   'music-unavailable' - no music is available for this client
 * 
 * events:
 *    play-started - indicates a new song has begun playback, or we've
 *        dropped in on an already playing song
 *    music-unavailable - indicates the listener may not listen to music
 *    music-stopped - indicates that music has stopped streaming. This maps
 *        up to the end of a broadcast, and not a 'pause' in music.
 *    state-changed - indicates the state of the player changed
 * 
 * demo: https://jsbin.com/biwogiyewu/edit?html,js,output
 */

class Listener {

  constructor(uuid) {
    Object.assign(this, Events);

    this._uuid = uuid;
    this._state = 'idle';
    //this._activePlay = null;
  }

  listen() {
    if (this._timeout) {
      clearTimeout(this._timeout);
      delete this._timeout;
    }

    getClientId().then((clientId) => {
      this.onTimeout(clientId);
    });
  }

  stop() {
    if (this._timeout) {
      clearTimeout(this._timeout);
      delete this._timeout;
    }

    const previousState = this._state;
    this._state = 'idle';
    delete this._activePlay;

    if (previousState !== 'idle') {
      try {
        this.trigger('state-changed', this._state, previousState);
      } catch (e) {
        /* ignore */
      }
    }
  }

  onTimeout(clientId) {
    fetch(getBaseUrl() + `/api/v2/simulcast/${this._uuid}/listen`, {
      method: 'POST',
      body: JSON.stringify({
        client_id: clientId,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((response) => response.json())
      .then((response) => {
        let delay = 5000;

        if (response.success) {
          const becameIdle = ((response.state === 'idle') && (this._state !== 'idle'));
          const previousPlay = this._activePlay;
          const previousState = this._state;
          const state = this._state = response.state;

          if (state === 'idle') {
            delete this._activePlay;
          } else {
            this._activePlay = response.play;
          }

          if (previousState !== state) {
            try {
              this.trigger('state-changed', state, previousState);
            } catch (e) {
              /* ignore */
            }
          }

          if (state === 'idle') {
            if (becameIdle) {
              try {
                this.trigger('music-stopped');
              } catch (e) { 
                /* ignore */ 
              }
            }

          } else {
            if (!previousPlay || (previousPlay.id !== this._activePlay.id)) {
              try {
                this.trigger('play-started', this._activePlay);
              } catch (e) { 
                /* ignore */ 
              }
            }

            if ((response.seconds_since_start > 20) &&
                ((response.play.duration_in_seconds - response.seconds_since_start) > 20)) {
              delay = 15000;
            }
            
          }

        } else {
          if (response.error && (response.error.code === 19)) {
            this._state = 'music-unavailable';
            this.trigger('music-unavailable');
            
            // don't schedule another update
            return;
          }
        }

        this._timeout = setTimeout(() => {
          this.onTimeout(clientId);
        }, delay);

      })
      .catch((response) => {
        if (response.status === 403) {
          try {
            var fullResponse = JSON.parse(response.responseText);

            if (fullResponse.error && (fullResponse.error.code === 19)) {
              try {
                this._state = 'music-unavailable';

                this.trigger('music-unavailable');
              } catch (e) { 
                /* ignore */ 
              }
              return;
            }            
            
            console.log('unexpected error:', fullResponse);

          } catch (e) {
            // some other response - fall through and try again
            console.log('bad response', e.message);
          }
        } else {
          console.log('odd response', response);
        }

        this._timeout = setTimeout(() => {
          this.onTimeout(clientId);
        }, 15000);
      });
  }

  getCurrentState() {
    return this._state;
  }

  getCurrentPlay() {
    return this._activePlay;
  }

}

export default Listener;
