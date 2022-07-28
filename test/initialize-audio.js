

const iOSp = /(iPhone|iPad)/i.test(navigator.userAgent);
const SILENCE = iOSp ?
  'https://s3.amazonaws.com/feedfm-audio/250-milliseconds-of-silence.mp3' :
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

  
function createAudio() {
  let audio = new Audio(SILENCE);
  audio.crossOrigin = 'anonymous';
  audio.loop = false;
  audio.volume = 1.0;

  return {
    audio: audio,
    pause: null,
    ended: null,
    timeupdate: null
  };
}

function recycleAudio(a, url, speaker) {
  if (a.pause) {
    a.audio.removeEventListener('pause', a.pause);
    a.audio.removeEventListener('ended', a.ended);
    a.audio.removeEventListener('timeupdate', a.timeupdate);
  }

  a.audio.pause();
  a.audio.src = url;
  a.audio.currentTime = 0;

  a.pause = speaker._onAudioPauseEvent.bind(speaker);
  a.ended = speaker._onAudioEndedEvent.bind(speaker);
  a.timeupdate = speaker._onAudioTimeUpdateEvent.bind(speaker);

  a.audio.addEventListener('pause', a.pause);
  a.audio.addEventListener('ended', a.ended);
  a.audio.addEventListener('timeupdate', a.timeupdate);

  return {
    audio: a.audio,
    sound: null,
    gain: null, // (for now)
    volume: 1.0
  };
}

export default function initializeAudio() {
  // capture the click to create audio objects
  var AudioCtor = window.AudioContext || window.webkitAudioContext;
  var context = new AudioCtor();

  let a = createAudio();
  let b = createAudio();
  let c = createAudio();

  // when the individual players are created, they'll recycle the audio
  // elements and context we just created

  Feed.Speaker.prototype.initializeAudio = function () {
    if (this.active === null) {
      console.log('initializing audio!');

      this.audioContext = context;

      this.active = recycleAudio(a, SILENCE, this);
      this.fading = recycleAudio(b, SILENCE, this);
      this.preparing = recycleAudio(c, this.prepareWhenReady ? this.prepareWhenReady : SILENCE, this);

      this.prepareWhenReady = null;
    }
  };
};
