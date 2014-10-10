/*global define:false */

define([ 'intercom' ], function(Intercom) {

  var Mic = function(audienceOfOne, welcomeMessageGenerator, welcomeMessageReceiver, micDropReceiver) {
    var intercom = Intercom.getInstance();

    var id = (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    console.log('I am', id);

    /*
     * Among all the windows, only one window can have the mic.
     * This code broadcasts a 'micCheck' on startup to see if anybody 
     * immediately responds with an 'iHaveMic' response. We assume somebody
     * has the mic until we get no response after some timeout. When
     * somebody does have the mic, they proactively send out an 'iHaveMic'
     * message to let everybody else know.
     */

    var activeMic = 'checking',
        activeMicTimestamp = new Date().getTime(),
        startupCheckCompleted = false;

    function onMicCheck() {
      if (activeMic && iHaveMic()) {
        intercom.emit('iHaveMic', { id: id, welcome: welcomeMessageGenerator() });
      }
    }
    intercom.on('micCheck', onMicCheck);

    function iHaveMic() {
      console.log('active, my id', activeMic, id);
      return activeMic === id;
    }

    var receivedWelcome = false;
    function onIHaveMic(message) {
      activeMicTimestamp = new Date().getTime();

      // somebody just got the mic or is telling us they still have it
      if (activeMic !== message.id) {
        console.log(message.id + ' has the mic!');
        activeMic = message.id;

        if (iHaveMic()) {
          console.log('I just grabbed the mic');
          // make sure to keep telling everybody I've got it
          setTimeout(repeatIHaveMic, MIC_TIMEOUT - 500);

          // no point in a welcome if we're the first with the mic
          receivedWelcome = true;

        }
      }

      // pass on the welcome message if it is our first
      if (!receivedWelcome && message.welcome) {
        console.log('just got a welcome message', message.welcome);
        receivedWelcome = true;

        welcomeMessageReceiver(message.welcome);
      }
    }

    // see if somebody is using the mic
    intercom.on('iHaveMic', onIHaveMic);
    intercom.emit('micCheck');

    function onStartupIHaveMicTimeout() {
      startupCheckCompleted = true;

      if (activeMic && (activeMic !== 'checking')) {
        console.log('the mic is held at startup by ', activeMic);

      } else {
        console.log('nobody seems to have the mic at startup', new Date().getTime());
        activeMic = false;
        activeMicTimestamp = 0;

        audienceOfOne();

      }
    }
    console.log('startup check', new Date().getTime());
    setTimeout(onStartupIHaveMicTimeout, 900);

    /*
     * Periodically see if the person with the mic has disappeared.
     */

    var MIC_TIMEOUT = 4000;
    function onIHaveMicTimeout() {
      if (activeMic) {
        var expires = new Date().getTime() - MIC_TIMEOUT;

        if (activeMicTimestamp < expires) {
          // timeout - nobody claims to have the mic in MIC_TIMEOUT ms
          activeMic = false;
          activeMicTimestamp = 0;

          console.log('mic holder has gone away!');
          micDropReceiver();
        }
      }
    }
    setInterval(onIHaveMicTimeout, 2000);

    /*
     * If I have the mic, there has to be a message from me at least
     * every MIC_TIMEOUT ms so everybody knows I haven't gone away.
     * This function just makes sure of that.
     */

    function repeatIHaveMic() {
console.log('testing for mic');
      if (iHaveMic()) {
console.log('seem to have the mic');
        var elapsed = new Date().getTime() - activeMicTimestamp;

        if (elapsed > (MIC_TIMEOUT / 2)) {
          console.log('I have the mic, dude!', new Date().getTime());
          intercom.emit('iHaveMic', { id: id });
          setTimeout(repeatIHaveMic, MIC_TIMEOUT / 2);
          
        } else {
          setTimeout(repeatIHaveMic, (MIC_TIMEOUT / 2) - elapsed);
        }
      }
    }
    setTimeout(repeatIHaveMic, MIC_TIMEOUT / 2);

    this.grab = function() {
      if (iHaveMic()) {
        return true;
      }

      if (activeMic) {
        return false;
      }

      // announce that I'm taking the mic
      intercom.emit('iHaveMic', { id: id });

      return true;
    };

    this.inHand = function() {
      return iHaveMic();
    };

    this.on = function(name, func) {
      intercom.on(name, func);
    };

    this.off = function(name, func) {
      intercom.off(name, func);
    };

    this.shout = function(name, msg) {
      intercom.emit(name, msg);
    };

    this.speak = function(name, msg) {
      intercom.emit(name, msg);
    };

    this.isStartupCheckCompleted = function() {
      return startupCheckCompleted;
    };

  };

  return Mic;

});
