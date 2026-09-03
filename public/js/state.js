export const RATIOS = [
  { id: 'portrait', name: 'Reels / TikTok', css: '9 / 16', chip: '9:16 · Reels', w: 'min(64%,250px)' },
  { id: 'ig_portrait', name: 'Instagram Post', css: '4 / 5', chip: '4:5 · IG Post', w: 'min(72%,280px)' },
  { id: 'square', name: 'Square Feed', css: '1 / 1', chip: '1:1 · Square', w: 'min(84%,320px)' },
  { id: 'landscape', name: 'YouTube / TV', css: '16 / 9', chip: '16:9 · YouTube', w: '92%' },
  { id: 'cinema', name: 'Ultrawide Cinema', css: '21 / 9', chip: '21:9 · Cinema', w: '96%' },
  { id: 'classic', name: 'Classic SD', css: '4 / 3', chip: '4:3 · Classic', w: '84%' }
];

export const DEFAULT_STICKERS_CATALOG = [
  { id: 's_fire', emoji: '🔥', label: 'Fire' },
  { id: 's_sparkles', emoji: '✨', label: 'Sparkles' },
  { id: 's_heart', emoji: '❤️', label: 'Heart' },
  { id: 's_camera', emoji: '🎬', label: 'Clapper' },
  { id: 's_star', emoji: '⭐', label: 'Star' },
  { id: 's_zap', emoji: '⚡', label: 'Zap' },
  { id: 's_100', emoji: '💯', label: '100' },
  { id: 's_cool', emoji: '😎', label: 'Cool' },
  { id: 's_pin', emoji: '📍', label: 'Location' },
  { id: 's_music', emoji: '🎵', label: 'Music' }
];

export const state = {
  project: null,
  presets: null,
  rev: 0,
  time: 0,
  playing: false,
  tool: 'trim',
  selected: 0,
  selectedStickerId: null,
  pps: 52,
  undo: [],
  redo: [],
  exportOpts: { res: '1080p', fps: 30, bitrate: 14, clean: true },
  job: null
};

export const total = () => (state.project ? state.project.clips.reduce((s, c) => s + c.dur, 0) : 0);

export function clipStart(i) {
  let s = 0;
  for (let k = 0; k < i; k++) s += state.project.clips[k].dur;
  return s;
}

export function clipAt(t) {
  if (!state.project) return { i: 0, local: 0, start: 0 };
  const cs = state.project.clips;
  let s = 0;
  for (let i = 0; i < cs.length; i++) {
    if (t < s + cs[i].dur || i === cs.length - 1) return { i, local: Math.max(0, Math.min(t - s, cs[i].dur)), start: s };
    s += cs[i].dur;
  }
  return { i: 0, local: 0, start: 0 };
}

export function snapshot() {
  state.undo.push(JSON.stringify(state.project));
  if (state.undo.length > 40) state.undo.shift();
  state.redo.length = 0;
}
