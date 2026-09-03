class AudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.osc = null;
    this.gain = null;
    this.isPlaying = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
  }

  playTrack(trackId, volume = 0.7, muted = false) {
    if (muted || volume <= 0) {
      this.stop();
      return;
    }
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (!this.osc) {
      const freqMap = { alpine: 220, pulse: 165, tape: 110 };
      const freq = freqMap[trackId] || 220;

      this.osc = this.ctx.createOscillator();
      this.gain = this.ctx.createGain();

      this.osc.type = 'sine';
      this.osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      this.gain.gain.setValueAtTime(volume * 0.15, this.ctx.currentTime);

      this.osc.connect(this.gain);
      this.gain.connect(this.ctx.destination);
      this.osc.start();
      this.isPlaying = true;
    } else {
      this.gain.gain.setValueAtTime(volume * 0.15, this.ctx.currentTime);
    }
  }

  stop() {
    if (this.osc) {
      try {
        this.osc.stop();
        this.osc.disconnect();
      } catch (e) {}
      this.osc = null;
      this.gain = null;
      this.isPlaying = false;
    }
  }
}

export const audioSynth = new AudioSynthesizer();
