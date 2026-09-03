class PresetRepository {
  getPresets() {
    return {
      filters: [
        { id: 'none', name: 'Original', css: 'none' },
        { id: 'kodak', name: 'Kodak 2383', css: 'contrast(1.12) saturate(1.26) sepia(.16) brightness(1.03)' },
        { id: 'teal', name: 'Teal/Orange', css: 'contrast(1.16) saturate(1.4) hue-rotate(-6deg)' },
        { id: 'noir', name: 'Noir 400', css: 'grayscale(1) contrast(1.3) brightness(.95)' },
        { id: 'fade', name: 'Faded 35mm', css: 'saturate(.72) contrast(.92) brightness(1.09) sepia(.14)' },
        { id: 'bleach', name: 'Bleach Bypass', css: 'saturate(.5) contrast(1.42) brightness(1.04)' }
      ],
      audio: [
        { id: 'alpine', name: 'Alpine Ambient', len: '2:14', bpm: 84 },
        { id: 'pulse', name: 'Night Pulse', len: '1:48', bpm: 122 },
        { id: 'tape', name: 'Tape Hiss Loop', len: '0:58', bpm: 96 }
      ],
      codecs: [
        { id: 'h264', name: 'H.264' },
        { id: 'hevc', name: 'HEVC' },
        { id: 'prores', name: 'ProRes 422' }
      ]
    };
  }
}

module.exports = new PresetRepository();
