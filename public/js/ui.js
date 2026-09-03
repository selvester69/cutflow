import { ApiService, onApiLog, clearApiLog } from './api.js';
import { audioSynth } from './audio.js';
import { state, RATIOS, DEFAULT_STICKERS_CATALOG, total, clipStart, clipAt, snapshot } from './state.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const p2 = (n) => String(Math.floor(n)).padStart(2, '0');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const seeded = (i) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};
const fmtTC = (t) => `${p2(t / 60)}:${p2(t % 60)}:${p2((t % 1) * 30)}`;
const fmtS = (t) => `${t.toFixed(1)}s`;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let phone, canvas, canvasBg, vtext, stickersLayer, f1, f2, wsBg;
let tlScroll, tlInner, clipsEl, rulerEl, audStrip;
let panel, tabsEl, tabind, tcNow, tcTotal, saveState, saveTxt;
let toastEl, scrim;
let front = 0;
let suppress = false;

const ICO = {
  trim: '<path d="M6 3v12a3 3 0 0 0 3 3h9M6 21v-6M18 3v6"/>',
  text: '<path d="M4 6V4h16v2M12 4v16M9 20h6"/>',
  stickers: '<circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01M9 15c1.5 1.5 4.5 1.5 6 0"/>',
  background: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 15l5-5 4 4 3-3 6 6"/>',
  format: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16M9 4v16"/>',
  filter: '<circle cx="9" cy="9" r="5"/><circle cx="15" cy="15" r="5"/>',
  audio: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  speed: '<path d="M12 20a8 8 0 1 0-8-8"/><path d="M12 12l4-3"/>'
};

const TOOLS = [
  { id: 'trim', label: 'Trim', icon: ICO.trim },
  { id: 'text', label: 'Text', icon: ICO.text },
  { id: 'stickers', label: 'Sticker', icon: ICO.stickers },
  { id: 'background', label: 'BG', icon: ICO.background },
  { id: 'format', label: 'Ratio', icon: ICO.format },
  { id: 'filter', label: 'Grade', icon: ICO.filter },
  { id: 'audio', label: 'Audio', icon: ICO.audio },
  { id: 'speed', label: 'Speed', icon: ICO.speed }
];

export function initUI() {
  phone = $('#phone');
  canvas = $('#canvas');
  canvasBg = $('#canvasBg');
  vtext = $('#vtext');
  stickersLayer = $('#stickersLayer');
  f1 = $('#f1');
  f2 = $('#f2');
  wsBg = $('#wsBg');
  tlScroll = $('#tlScroll');
  tlInner = $('#tlInner');
  clipsEl = $('#clips');
  rulerEl = $('#ruler');
  audStrip = $('#audStrip');
  panel = $('#panel');
  tabsEl = $('#tabs');
  tabind = $('#tabind');
  tcNow = $('#tcNow');
  tcTotal = $('#tcTotal');
  saveState = $('#saveState');
  saveTxt = $('#saveTxt');
  toastEl = $('#toast');
  scrim = $('#scrim');

  buildTabs();
  bindEvents();
  onApiLog(paintLog);
}

function buildTabs() {
  tabsEl.innerHTML = '<div class="tabind" id="tabind"></div>';
  tabind = $('#tabind');
  TOOLS.forEach((t) => {
    const b = document.createElement('button');
    b.className = 'tab' + (t.id === state.tool ? ' on' : '');
    b.dataset.tool = t.id;
    b.innerHTML = `<svg class="icon" viewBox="0 0 24 24">${t.icon}</svg><span>${t.label}</span>`;
    tabsEl.appendChild(b);
  });
}

export function moveIndicator() {
  const el = $(`.tab[data-tool="${state.tool}"]`, tabsEl);
  if (!el || !tabind) return;
  tabind.style.width = el.offsetWidth + 'px';
  tabind.style.transform = `translateX(${el.offsetLeft}px)`;
}

function ensureProjectDefaults(p) {
  if (!p) return;
  if (!p.stickers) p.stickers = [];
  if (!p.background) {
    p.background = {
      mode: 'blur',
      color: '#0a0a0c',
      gradient: 'linear-gradient(135deg, #1f1c2c, #928dab)',
      fit: 'cover',
      blur: 20
    };
  }
}

export function applyProject() {
  if (!state.project) return;
  ensureProjectDefaults(state.project);
  const p = state.project;
  const r = RATIOS.find((x) => x.id === p.ratio) || RATIOS[0];
  canvas.style.aspectRatio = r.css;
  canvas.style.width = r.w;
  $('#ratioChip').textContent = r.chip;

  const bg = p.background;
  canvas.classList.toggle('fit-contain', bg.fit === 'contain');

  const { i } = clipAt(state.time);
  const currentImg = p.clips[i]?.img || '';

  if (bg.mode === 'blur') {
    canvasBg.style.backgroundImage = `url('${currentImg}')`;
    canvasBg.style.backgroundColor = 'transparent';
    canvasBg.style.filter = `blur(${bg.blur || 20}px) brightness(0.85) scale(1.2)`;
  } else if (bg.mode === 'color') {
    canvasBg.style.backgroundImage = 'none';
    canvasBg.style.backgroundColor = bg.color || '#000000';
    canvasBg.style.filter = 'none';
  } else if (bg.mode === 'gradient') {
    canvasBg.style.backgroundImage = bg.gradient || 'linear-gradient(135deg, #ff5a2b, #ffb03a)';
    canvasBg.style.backgroundColor = 'transparent';
    canvasBg.style.filter = 'none';
  }

  const fil = (state.presets?.filters?.find((f) => f.id === p.filter) || { css: 'none' }).css;
  $('.frames', canvas).style.filter = fil;

  const content = p.text.content || '';
  vtext.innerHTML = content.split('\n').map((l) => `<span style="display:block">${l || '&nbsp;'}</span>`).join('');
  vtext.style.fontWeight = p.text.weight || 700;
  vtext.style.color = p.text.color || '#ffffff';
  vtext.style.left = (p.text.x || 50) + '%';
  vtext.style.top = (p.text.y || 50) + '%';
  vtext.style.textTransform = p.text.upper ? 'uppercase' : 'none';

  renderStickersOnCanvas();

  $('#transport').classList.toggle('playing', state.playing);
  phone.classList.toggle('playing', state.playing);

  if (state.playing && p.track && !p.muted) {
    audioSynth.playTrack(p.track, p.volume, p.muted);
  } else {
    audioSynth.stop();
  }
}

function renderStickersOnCanvas() {
  if (!stickersLayer || !state.project) return;
  const stickers = state.project.stickers || [];
  stickersLayer.innerHTML = stickers
    .map((s) => {
      const isSel = s.id === state.selectedStickerId;
      return `<div class="vsticker${isSel ? ' sel' : ''}" data-stk-id="${s.id}" style="left:${s.x}%;top:${s.y}%;transform:translate(-50%,-50%) scale(${s.scale || 1}) rotate(${s.rotate || 0}deg)">
        ${s.emoji}
        <span class="stk-del" data-act="del-stk" data-id="${s.id}">×</span>
      </div>`;
    })
    .join('');
}

export function renderTimeline() {
  if (!state.project || !state.project.clips) return;
  const T = total();
  const W = T * state.pps + 120;
  tlInner.style.width = W + 'px';

  let rh = '';
  for (let s = 0; s <= Math.ceil(T); s += 1) {
    if (s % 2 === 0) rh += `<span style="left:${s * state.pps}px">${p2(s / 60)}:${p2(s % 60)}</span>`;
  }
  rulerEl.innerHTML = rh;
  rulerEl.style.backgroundSize = `${state.pps}px 7px`;

  clipsEl.innerHTML = state.project.clips
    .map(
      (c, i) => `
    <button class="clip${i === state.selected ? ' on' : ''}" data-i="${i}" style="--i:${i};width:${Math.max(26, c.dur * state.pps - 4)}px;background-image:url('${c.img}')">
      <span class="fx"></span><span class="cd mono">${c.dur.toFixed(1)}s</span><span class="cn">${c.name}</span>
    </button>`
    )
    .join('');

  const bars = Math.round(T * 7);
  let ah = '';
  for (let i = 0; i < bars; i++) {
    const h = 18 + seeded(i) * 76;
    ah += `<i style="height:${h}%;--b:${i % 9}"></i>`;
  }
  audStrip.innerHTML = ah;
  tcTotal.textContent = fmtTC(T);
  updatePlayhead();
}

export function updatePlayhead() {
  if (!state.project || !tlScroll) return;
  const vw = tlScroll.clientWidth;
  tlScroll.scrollLeft = state.time * state.pps - vw / 2;
}

export function seek(t, { scroll = true } = {}) {
  state.time = clamp(t, 0, total());
  if (scroll) {
    suppress = true;
    updatePlayhead();
    clearTimeout(seek._t);
    seek._t = setTimeout(() => (suppress = false), 140);
  }
  syncPreview();
}

export function syncPreview() {
  if (!state.project || !state.project.clips || state.project.clips.length === 0) return;
  const p = state.project;
  const T = total();
  tcNow.textContent = fmtTC(state.time);
  const { i, local } = clipAt(state.time);
  const c = p.clips[i];
  if (!c) return;

  if (f1.dataset.i != i && f2.dataset.i != i) {
    const back = 1 - front;
    const imgs = [f1, f2];
    imgs[back].src = c.img;
    imgs[back].dataset.i = i;
    imgs[back].classList.add('show');
    imgs[front].classList.remove('show');
    front = back;
    if (state.selected !== i) {
      state.selected = i;
      $$('.clip', clipsEl).forEach((el) => el.classList.toggle('on', +el.dataset.i === i));
    }
    if (p.text?.anim === 'pop' && !reduceMotion) {
      vtext.classList.remove('pop');
      void vtext.offsetWidth;
      vtext.classList.add('pop');
    }
  }

  const active = [f1, f2][front];
  if (!reduceMotion && active) {
    const lp = local / c.dur;
    active.style.transform = `scale(${(1.03 + lp * 0.09).toFixed(3)}) translate3d(${((lp - 0.5) * -1.4).toFixed(2)}%,${((lp - 0.5) * -1).toFixed(2)}%,0)`;
  }
  if (wsBg) wsBg.style.backgroundImage = `url('${c.img}')`;
  if (p.background?.mode === 'blur' && canvasBg) {
    canvasBg.style.backgroundImage = `url('${c.img}')`;
  }
  const off = (-state.time / (T || 1)) * 14;
  if (wsBg) wsBg.style.transform = `scale(1.14) translate3d(${off}px,0,0)`;
}

export function renderPanel() {
  if (!state.project || !state.presets) return;
  ensureProjectDefaults(state.project);
  const p = state.project;
  panel.style.animation = 'none';
  void panel.offsetWidth;
  panel.style.animation = '';
  let html = '';

  const rng = (pct) => `style="--p:${pct}%"`;

  if (state.tool === 'trim') {
    const c = p.clips[state.selected] || p.clips[0];
    if (!c) return;
    const maxStart = Math.max(0.2, c.orig - 0.6);
    html = `
      <div class="plabel" style="--i:0">Clip ${state.selected + 1} / ${p.clips.length}</div>
      <div class="prow" style="--i:1">
        <div class="clip" style="width:46px;height:52px;background-image:url('${c.img}');pointer-events:none"><span class="cd mono">${c.dur.toFixed(1)}s</span></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12.5px;font-weight:700;letter-spacing:-.01em">${c.name}</div>
          <div class="hint" style="margin-top:3px">Source ${c.orig.toFixed(1)}s · in ${c.in.toFixed(1)}s · out ${(c.in + c.dur).toFixed(1)}s</div>
        </div>
      </div>
      <div style="--i:2"><div class="psub"><span>In point</span><b class="mono" id="inVal">${c.in.toFixed(1)}s</b></div>
        <input type="range" id="inR" min="0" max="${maxStart.toFixed(2)}" step="0.1" value="${c.in}" ${rng((c.in / maxStart) * 100)}></div>
      <div style="--i:3"><div class="psub"><span>Duration</span><b class="mono" id="durVal">${c.dur.toFixed(1)}s</b></div>
        <input type="range" id="durR" min="0.6" max="${(c.orig - c.in).toFixed(2)}" step="0.1" value="${c.dur}" ${rng((c.dur / (c.orig - c.in)) * 100)}></div>
      <div class="chips" style="--i:4;margin-top:4px">
        <button class="chip accent" data-act="split">Split at playhead</button>
        <button class="chip" data-act="dup">Duplicate</button>
        <button class="chip" data-act="del">Delete</button>
        <button class="chip ghost" data-act="undo">Undo</button>
      </div>`;
  }
  if (state.tool === 'text') {
    const t = p.text || { content: '', weight: 700, color: '#fff', anim: 'none' };
    html = `
      <div class="plabel" style="--i:0">Title layer</div>
      <input class="tinput" id="txtIn" style="--i:1" value="${(t.content || '').replace(/"/g, '&quot;')}" placeholder="Type a title…">
      <div class="psub" style="--i:2;margin-top:10px"><span>Weight</span><b>${t.weight}</b></div>
      <div class="chips" style="--i:3">
        ${[500, 700, 900].map((w) => `<button class="chip${t.weight === w ? ' on' : ''}" data-act="w" data-v="${w}">${w}</button>`).join('')}
        <button class="chip${t.upper ? ' on' : ''}" data-act="upper">UPPERCASE</button>
      </div>
      <div class="psub" style="--i:4;margin-top:10px"><span>Colour</span><span class="hint">drag on preview to reposition</span></div>
      <div class="sw" style="--i:5">
        ${['#ffffff', '#0b0b0e', '#ff5a2b', '#ffb03a', '#c6f24e', '#5fd7d2'].map((c) => `<button class="swatch${t.color === c ? ' on' : ''}" data-act="col" data-v="${c}" style="background:${c}"></button>`).join('')}
      </div>
      <div class="psub" style="--i:6;margin-top:10px"><span>Entrance</span></div>
      <div class="chips" style="--i:7">
        ${['pop', 'fade', 'none'].map((a) => `<button class="chip${t.anim === a ? ' on' : ''}" data-act="anim" data-v="${a}">${a}</button>`).join('')}
      </div>`;
  }
  if (state.tool === 'stickers') {
    const activeSticker = p.stickers.find((s) => s.id === state.selectedStickerId);
    html = `
      <div class="plabel" style="--i:0">Stickers & Overlays</div>
      <div class="stk-grid" style="--i:1">
        ${DEFAULT_STICKERS_CATALOG.map((st) => `<button class="stk-btn" data-act="add-stk" data-emoji="${st.emoji}">${st.emoji}<span>${st.label}</span></button>`).join('')}
      </div>`;
    if (activeSticker) {
      const scalePct = ((activeSticker.scale - 0.5) / 1.5) * 100;
      const rotPct = ((activeSticker.rotate + 180) / 360) * 100;
      html += `
        <div style="--i:2;margin-top:10px"><div class="psub"><span>Size (${activeSticker.emoji})</span><b class="mono">${activeSticker.scale.toFixed(1)}x</b></div>
          <input type="range" id="stkScaleR" min="0.5" max="2.0" step="0.1" value="${activeSticker.scale}" ${rng(scalePct)}></div>
        <div style="--i:3"><div class="psub"><span>Rotation</span><b class="mono">${activeSticker.rotate}°</b></div>
          <input type="range" id="stkRotR" min="-180" max="180" step="5" value="${activeSticker.rotate}" ${rng(rotPct)}></div>
        <div class="chips" style="--i:4;margin-top:6px">
          <button class="chip accent" data-act="del-active-stk">Remove ${activeSticker.emoji} sticker</button>
        </div>`;
    } else {
      html += `<div class="stat" style="--i:2;margin-top:10px">
        <span class="dot"></span><span>Tap any sticker above to add, or select on video canvas to scale/rotate.</span>
      </div>`;
    }
  }
  if (state.tool === 'background') {
    const bg = p.background;
    html = `
      <div class="plabel" style="--i:0">Video Background</div>
      <div class="chips" style="--i:1">
        <button class="chip${bg.mode === 'blur' ? ' on' : ''}" data-act="bg-mode" data-v="blur">Video Blur</button>
        <button class="chip${bg.mode === 'color' ? ' on' : ''}" data-act="bg-mode" data-v="color">Solid Color</button>
        <button class="chip${bg.mode === 'gradient' ? ' on' : ''}" data-act="bg-mode" data-v="gradient">Gradient</button>
      </div>
      <div class="psub" style="--i:2;margin-top:10px"><span>Frame Fit Mode</span><b>${bg.fit === 'contain' ? 'Fit (Contain)' : 'Fill (Cover)'}</b></div>
      <div class="chips" style="--i:3">
        <button class="chip${bg.fit === 'cover' ? ' on' : ''}" data-act="bg-fit" data-v="cover">Cover (Crop)</button>
        <button class="chip${bg.fit === 'contain' ? ' on' : ''}" data-act="bg-fit" data-v="contain">Contain (Pillarbox)</button>
      </div>`;

    if (bg.mode === 'blur') {
      const blurPct = ((bg.blur - 5) / 45) * 100;
      html += `
        <div style="--i:4;margin-top:8px"><div class="psub"><span>Blur Intensity</span><b class="mono">${bg.blur}px</b></div>
          <input type="range" id="bgBlurR" min="5" max="50" step="1" value="${bg.blur}" ${rng(blurPct)}></div>`;
    } else if (bg.mode === 'color') {
      const colors = ['#0a0a0c', '#181824', '#ff5a2b', '#102a43', '#1e4620', '#2d1b4e'];
      html += `
        <div class="psub" style="--i:4;margin-top:10px"><span>Background Color</span></div>
        <div class="sw" style="--i:5">
          ${colors.map((c) => `<button class="swatch${bg.color === c ? ' on' : ''}" data-act="bg-color" data-v="${c}" style="background:${c}"></button>`).join('')}
        </div>`;
    } else if (bg.mode === 'gradient') {
      const grads = [
        { id: 'linear-gradient(135deg, #1f1c2c, #928dab)', label: 'Twilight' },
        { id: 'linear-gradient(135deg, #ff5a2b, #ffb03a)', label: 'Sunset' },
        { id: 'linear-gradient(135deg, #0575e6, #00f260)', label: 'Cyber' },
        { id: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)', label: 'Neon' }
      ];
      html += `
        <div class="chips" style="--i:4;margin-top:10px">
          ${grads.map((g) => `<button class="chip${bg.gradient === g.id ? ' on' : ''}" data-act="bg-grad" data-v="${g.id}">${g.label}</button>`).join('')}
        </div>`;
    }
  }
  if (state.tool === 'format') {
    html = `
      <div class="plabel" style="--i:0">Target Aspect Ratio</div>
      <div class="chips scroll" style="--i:1">
        ${RATIOS.map((r) => `<button class="chip accent${p.ratio === r.id ? ' on' : ''}" data-act="set-ratio" data-v="${r.id}">${r.name} (${r.css})</button>`).join('')}
      </div>
      <div class="stat" style="--i:2;margin-top:10px">
        <svg class="icon" viewBox="0 0 24 24" style="width:15px;height:15px;color:var(--lime)">${ICO.format}</svg>
        <span>Optimizes output resolution for TikTok, Instagram, YouTube Shorts, and Cinema.</span>
      </div>`;
  }
  if (state.tool === 'filter') {
    const img = p.clips[0]?.img || '';
    html = `<div class="plabel" style="--i:0">LUT pack · /v1/presets</div>
      <div class="ftiles" style="--i:1">
        ${state.presets.filters
          .map(
            (f) => `
          <button class="ftile${p.filter === f.id ? ' on' : ''}" data-act="filter" data-v="${f.id}">
            <span class="im" style="background-image:url('${img}');filter:${f.css}"></span><span>${f.name}</span>
          </button>`
          )
          .join('')}
      </div>
      <div class="stat" style="--i:2;margin-top:8px">
        <span class="dot"></span><span>Applied globally · rendering in real time on GPU</span>
      </div>`;
  }
  if (state.tool === 'audio') {
    html = `<div class="plabel" style="--i:0">Soundtrack</div>
      ${state.presets.audio
        .map(
          (a) => `
        <div class="acard${p.track === a.id ? ' on' : ''}" data-act="track" data-v="${a.id}" style="--i:1">
          <div class="pl"><svg class="icon" viewBox="0 0 24 24" style="width:14px;height:14px">${ICO.audio}</svg></div>
          <div class="nm"><b>${a.name}</b><small class="mono">${a.len} · ${a.bpm} BPM</small></div>
          <div class="awave">${Array.from({ length: 11 }, (_, i) => `<i style="height:${30 + seeded(i + a.bpm) * 65}%;--b:${i}"></i>`).join('')}</div>
        </div>`
        )
        .join('')}
      <div style="--i:2;margin-top:6px"><div class="psub"><span>Volume</span><b class="mono" id="volVal">${Math.round(p.volume * 100)}%</b></div>
        <input type="range" id="volR" min="0" max="100" value="${p.volume * 100}" ${rng(p.volume * 100)}></div>
      <div class="chips" style="--i:3">
        <button class="chip${p.muted ? '' : ' on'}" data-act="mute">${p.muted ? 'Muted' : 'Audible'}</button>
        <button class="chip" data-act="duck">Auto-duck on dialogue</button>
      </div>`;
  }
  if (state.tool === 'speed') {
    html = `<div class="plabel" style="--i:0">Retiming</div>
      <div class="chips" style="--i:1">
        ${[0.5, 0.75, 1, 1.5, 2].map((s) => `<button class="chip accent${p.speed === s ? ' on' : ''}" data-act="speed" data-v="${s}">${s}×</button>`).join('')}
      </div>
      <div style="--i:2;margin-top:14px"><div class="psub"><span>Playback rate</span><b class="mono">${p.speed.toFixed(2)}×</b></div>
        <div class="pbar" style="background:rgba(255,255,255,.08)"><i style="width:${(p.speed / 2) * 100}%;background:linear-gradient(90deg,var(--cyan),var(--lime))"></i></div></div>
      <div class="stat" style="--i:3;margin-top:12px">
        <svg class="icon" viewBox="0 0 24 24" style="width:15px;height:15px;color:var(--cyan)">${ICO.speed}</svg>
        <span>Optical-flow interpolation keeps motion smooth above 1.5×.</span>
      </div>
      <div class="chips" style="--i:4;margin-top:10px">
        <button class="chip" data-act="ramp">Smooth ramp to 2×</button>
        <button class="chip" data-act="freeze">Freeze frame here</button>
      </div>`;
  }
  panel.innerHTML = html;
}

export function toast(msg) {
  let toastT;
  toastEl.textContent = msg;
  toastEl.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => toastEl.classList.remove('on'), 1900);
}

let saveT = null;
export function scheduleSave() {
  clearTimeout(saveT);
  saveState.classList.add('saving');
  saveTxt.textContent = 'Saving…';
  saveT = setTimeout(async () => {
    try {
      const r = await ApiService.saveProject('cf_8241', state.project);
      state.rev = r.rev;
      saveState.classList.remove('saving');
      saveTxt.textContent = `Saved · rev ${r.rev} · ${(r.bytes / 1024).toFixed(1)} KB`;
      setTimeout(() => {
        if (!saveState.classList.contains('saving')) saveTxt.textContent = 'All changes saved';
      }, 2600);
    } catch (e) {
      saveState.classList.remove('saving');
      saveTxt.textContent = 'Offline — changes queued';
    }
  }, 850);
}

function openSheet(el) {
  scrim.classList.add('on');
  el.classList.add('open');
}

function closeSheets() {
  scrim.classList.remove('on');
  $$('.sheet').forEach((s) => s.classList.remove('open'));
  if (state.job && state.job.poll) {
    clearInterval(state.job.poll);
    state.job = null;
  }
}

const STAGES = ['Preparing media', 'Rendering effects', 'Encoding H.264', 'Packaging'];
function estSize() {
  const o = state.exportOpts;
  const mult = o.res === '2160p' ? 4.1 : o.res === '1440p' ? 2.2 : 1;
  return ((total() * o.bitrate) / 8 * mult).toFixed(1);
}

function exportForm() {
  const o = state.exportOpts;
  $('#expTitle').textContent = 'Export cut';
  $('#expSub').textContent = `POST /v1/renders · ${state.project.clips.length} clips · ${fmtS(total())}`;
  $('#expBody').innerHTML = `
    <div class="opt"><div class="plabel">Resolution</div>
      <div class="chips">${['720p', '1080p', '1440p', '2160p'].map((r) => `<button class="chip accent${o.res === r ? ' on' : ''}" data-o="res" data-v="${r}">${r}</button>`).join('')}</div></div>
    <div class="opt"><div class="plabel">Frame rate</div>
      <div class="chips">${[24, 30, 60].map((f) => `<button class="chip accent${o.fps === f ? ' on' : ''}" data-o="fps" data-v="${f}">${f} fps</button>`).join('')}</div></div>
    <div class="opt"><div class="plabel">Codec</div>
      <div class="chips">${state.presets.codecs.map((c) => `<button class="chip${(o.codec || 'h264') === c.id ? ' on' : ''}" data-o="codec" data-v="${c.id}">${c.name}</button>`).join('')}</div></div>
    <div class="opt"><div class="psub"><span>Bitrate</span><b class="mono" id="brVal">${o.bitrate} Mbps</b></div>
      <input type="range" id="brR" min="4" max="45" value="${o.bitrate}" style="--p:${(o.bitrate / 45) * 100}%">
      <div class="psub" style="margin-top:8px"><span>Estimated size</span><b class="mono" id="sizeVal">${estSize()} MB</b></div></div>
    <div class="opt"><div class="acard${o.clean ? ' on' : ''}" data-o="clean" style="cursor:pointer">
      <div class="nm"><b>Remove watermark</b><small>Available on Studio plan</small></div>
      <div class="toggle${o.clean ? ' on' : ''}"></div></div></div>
    <button class="bigbtn" id="startRender">Start render · ${estSize()} MB</button>`;
}

function exportProgress() {
  $('#expTitle').textContent = 'Rendering';
  $('#expSub').textContent = 'background job · poll /v1/renders';
  $('#expBody').innerHTML = `
    <div class="ring">
      <svg width="92" height="92"><defs><linearGradient id="gr" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ff5a2b"/><stop offset="1" stop-color="#ffb03a"/></linearGradient></defs>
        <circle class="bgc" cx="46" cy="46" r="39" fill="none" stroke-width="7"/>
        <circle class="fgc" id="ringFg" cx="46" cy="46" r="39" fill="none" stroke-width="7" stroke-dasharray="245" stroke-dashoffset="245"/>
      </svg><div class="val mono" id="ringVal">0%</div></div>
    <div class="pbar"><i id="pbar"></i></div>
    <div class="stages" id="stages">${STAGES.map((s, i) => `<div class="stage-i" data-s="${i}"><span class="bx"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span>${s}</span></div>`).join('')}</div>
    <button class="bigbtn ghostbtn" id="cancelRender">Cancel render</button>
    <div class="rlog" id="rlog"></div>`;
}

function exportDone(job) {
  $('#expTitle').textContent = 'Render complete';
  $('#expSub').textContent = `job ${job.id} · ${job.size}`;
  $('#expBody').innerHTML = `
    <div style="display:grid;place-items:center;padding:6px 0 14px">
      <div style="width:64px;height:64px;border-radius:50%;background:var(--lime);display:grid;place-items:center;box-shadow:0 0 0 0 rgba(198,242,78,.5);animation:handle 1.8s infinite">
        <svg class="icon" viewBox="0 0 24 24" style="width:28px;height:28px;stroke:#12120a;stroke-width:3"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
      </div>
      <div style="margin-top:11px;font-size:14px;font-weight:800;letter-spacing:-.02em">${state.exportOpts.res} · ${state.exportOpts.fps} fps · ${state.exportOpts.codec || 'h264'}</div>
      <div class="hint" style="margin-top:4px">Signed URL expires in 24 h</div>
    </div>
    <div class="linkbox"><span>${job.url}</span><button class="chip" id="copyLink" style="padding:5px 9px">Copy</button></div>
    <div class="chips" style="margin:12px 0 14px">
      <button class="chip on" data-act2="photos">Save to Photos</button>
      <button class="chip" data-act2="reel">Post to Reels</button>
      <button class="chip" data-act2="link">Share link</button>
    </div>
    <button class="bigbtn" data-act2="done">Back to timeline</button>`;
}

async function startRender() {
  const payload = {
    projectId: 'cf_8241',
    clips: state.project.clips,
    text: state.project.text,
    stickers: state.project.stickers,
    background: state.project.background,
    filter: state.project.filter,
    ratio: state.project.ratio,
    speed: state.project.speed,
    ...state.exportOpts
  };
  exportProgress();
  const rlog = $('#rlog');
  const addLog = (html) => {
    const d = document.createElement('div');
    d.innerHTML = html;
    rlog.prepend(d);
    while (rlog.children.length > 6) rlog.lastChild.remove();
  };

  try {
    const { id } = await ApiService.createRender(payload);
    addLog(`<b>POST</b> /v1/renders → <em>201</em> ${id}`);
    state.job = { id, poll: null };
    const ring = $('#ringFg');
    const val = $('#ringVal');
    const bar = $('#pbar');
    const stages = $('#stages');
    let lastStage = -1;

    state.job.poll = setInterval(async () => {
      try {
        const j = await ApiService.getRender(id);
        if (!document.body.contains(val)) return;
        const pct = Math.round(j.progress);
        ring.style.strokeDashoffset = 245 - (245 * pct) / 100;
        val.textContent = pct + '%';
        bar.style.width = pct + '%';
        $$('.stage-i', stages).forEach((el, i) => {
          el.classList.toggle('act', i === j.stage);
          el.classList.toggle('done', i < j.stage || j.status === 'done');
        });
        if (j.stage !== lastStage) {
          addLog(`<b>POLL</b> /v1/renders/${id.slice(0, 8)}… → <em>200</em> ${pct}% · ${STAGES[j.stage]}`);
          lastStage = j.stage;
        }
        if (j.status === 'done') {
          clearInterval(state.job.poll);
          state.job = null;
          await sleep(420);
          exportDone(j);
        }
      } catch (err) {}
    }, 520);
  } catch (e) {
    toast('Render service unreachable');
    exportForm();
  }
}

async function cancelRender() {
  if (state.job) {
    clearInterval(state.job.poll);
    await ApiService.cancelRender(state.job.id);
    state.job = null;
  }
  toast('Render cancelled');
  exportForm();
}

function openExport() {
  exportForm();
  openSheet($('#exportSheet'));
}

function paintLog(log) {
  const clog = $('#clog');
  if (!clog) return;
  clog.innerHTML = log
    .map((e, i) => {
      const t = new Date(e.at || Date.now());
      const time = p2(t.getHours()) + ':' + p2(t.getMinutes()) + ':' + (e.status === 'pending' ? '··' : p2(t.getSeconds()));
      return `<div class="clog-row" style="animation-delay:${Math.min(i * 18, 220)}ms">
      <span class="t mono">${time}</span>
      <span class="m ${e.method}">${e.method}</span>
      <span class="p">${e.path}</span>
      <span class="s ${e.status === 'pending' ? 'pend' : ''} mono">${e.status === 'pending' ? '<span class="cdot"></span>' : e.status + ' · ' + e.ms + 'ms'}</span>
    </div>`;
    })
    .join('');
}

function bindEvents() {
  scrim.addEventListener('click', closeSheets);
  $$('[data-close]').forEach((b) => b.addEventListener('click', closeSheets));

  $('#exportBtn').addEventListener('click', openExport);
  $('#consoleBtn').addEventListener('click', () => openSheet($('#consoleSheet')));
  $('#clearLog').addEventListener('click', () => {
    clearApiLog();
    $('#clog').innerHTML = '<div class="hint" style="padding:8px 2px">Log cleared — new requests will appear here.</div>';
  });

  tlScroll.addEventListener(
    'scroll',
    () => {
      if (suppress) return;
      const vw = tlScroll.clientWidth;
      state.time = clamp((tlScroll.scrollLeft + vw / 2) / state.pps, 0, total());
      syncPreview();
    },
    { passive: true }
  );

  clipsEl.addEventListener('click', (e) => {
    const b = e.target.closest('.clip');
    if (!b) return;
    const i = +b.dataset.i;
    state.selected = i;
    $$('.clip', clipsEl).forEach((c) => c.classList.toggle('on', +c.dataset.i === i));
    seek(clipStart(i) + 0.02);
    if (state.tool === 'trim' || state.tool === 'filter') renderPanel();
  });

  $('#playBtn').addEventListener('click', () => setPlaying(!state.playing));
  $('#prevBtn').addEventListener('click', () => {
    const i = clipAt(state.time).i;
    seek(clipStart(Math.max(0, i - 1)) + 0.02);
  });
  $('#nextBtn').addEventListener('click', () => {
    const i = clipAt(state.time).i;
    seek(clipStart(Math.min(state.project.clips.length - 1, i + 1)) + 0.02);
  });

  let drag = null;
  vtext.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    vtext.setPointerCapture(e.pointerId);
    vtext.classList.add('sel');
    const r = canvas.getBoundingClientRect();
    drag = { type: 'text', r, dx: e.clientX - (r.left + (r.width * state.project.text.x) / 100), dy: e.clientY - (r.top + (r.height * state.project.text.y) / 100) };
  });
  vtext.addEventListener('pointermove', (e) => {
    if (!drag || drag.type !== 'text') return;
    const x = clamp(((e.clientX - drag.dx - drag.r.left) / drag.r.width) * 100, 10, 90);
    const y = clamp(((e.clientY - drag.dy - drag.r.top) / drag.r.height) * 100, 8, 92);
    state.project.text.x = x;
    state.project.text.y = y;
    vtext.style.left = x + '%';
    vtext.style.top = y + '%';
  });
  ['pointerup', 'pointercancel'].forEach((ev) =>
    vtext.addEventListener(ev, () => {
      if (drag && drag.type === 'text') {
        drag = null;
        vtext.classList.remove('sel');
        scheduleSave();
      }
    })
  );

  let stkDrag = null;
  stickersLayer.addEventListener('pointerdown', (e) => {
    const stkEl = e.target.closest('.vsticker');
    if (!stkEl) return;
    const id = stkEl.dataset.stkId;
    if (e.target.classList.contains('stk-del')) {
      snapshot();
      state.project.stickers = state.project.stickers.filter((s) => s.id !== id);
      if (state.selectedStickerId === id) state.selectedStickerId = null;
      applyProject();
      renderPanel();
      scheduleSave();
      return;
    }

    e.preventDefault();
    stkEl.setPointerCapture(e.pointerId);
    state.selectedStickerId = id;
    applyProject();
    if (state.tool === 'stickers') renderPanel();

    const sticker = state.project.stickers.find((s) => s.id === id);
    const r = canvas.getBoundingClientRect();
    stkDrag = { sticker, r, dx: e.clientX - (r.left + (r.width * sticker.x) / 100), dy: e.clientY - (r.top + (r.height * sticker.y) / 100) };
  });

  stickersLayer.addEventListener('pointermove', (e) => {
    if (!stkDrag) return;
    const x = clamp(((e.clientX - stkDrag.dx - stkDrag.r.left) / stkDrag.r.width) * 100, 5, 95);
    const y = clamp(((e.clientY - stkDrag.dy - stkDrag.r.top) / stkDrag.r.height) * 100, 5, 95);
    stkDrag.sticker.x = x;
    stkDrag.sticker.y = y;
    applyProject();
  });

  ['pointerup', 'pointercancel'].forEach((ev) =>
    stickersLayer.addEventListener(ev, () => {
      if (stkDrag) {
        stkDrag = null;
        scheduleSave();
      }
    })
  );

  $('#guideBtn').addEventListener('click', (e) => {
    const on = canvas.classList.toggle('guides-on');
    e.currentTarget.classList.toggle('on', on);
    toast(on ? 'Safe zones on' : 'Safe zones off');
  });
  $('#ratioBtn').addEventListener('click', () => {
    snapshot();
    const i = RATIOS.findIndex((r) => r.id === state.project.ratio);
    state.project.ratio = RATIOS[(i + 1) % RATIOS.length].id;
    applyProject();
    if (state.tool === 'format') renderPanel();
    scheduleSave();
    toast(RATIOS[(i + 1) % RATIOS.length].chip);
  });
  $('#fullBtn').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else phone.requestFullscreen?.().catch(() => toast('Fullscreen unavailable'));
  });

  tabsEl.addEventListener('click', (e) => {
    const t = e.target.closest('.tab');
    if (!t) return;
    state.tool = t.dataset.tool;
    $$('.tab', tabsEl).forEach((x) => x.classList.toggle('on', x === t));
    moveIndicator();
    renderPanel();
  });

  panel.addEventListener('input', (e) => {
    const el = e.target;
    const p = state.project;
    if (el.id === 'inR') {
      const c = p.clips[state.selected];
      c.in = +el.value;
      c.dur = Math.min(c.dur, c.orig - c.in);
      if (c.dur < 0.6) c.dur = 0.6;
      el.style.setProperty('--p', (c.in / Math.max(0.2, c.orig - 0.6)) * 100 + '%');
      $('#inVal').textContent = c.in.toFixed(1) + 's';
      $('#durVal').textContent = c.dur.toFixed(1) + 's';
      renderTimeline();
      syncPreview();
      scheduleSave();
    }
    if (el.id === 'durR') {
      const c = p.clips[state.selected];
      c.dur = clamp(+el.value, 0.6, c.orig - c.in);
      el.style.setProperty('--p', (c.dur / (c.orig - c.in)) * 100 + '%');
      $('#durVal').textContent = c.dur.toFixed(1) + 's';
      renderTimeline();
      syncPreview();
      scheduleSave();
    }
    if (el.id === 'volR') {
      p.volume = +el.value / 100;
      el.style.setProperty('--p', el.value + '%');
      $('#volVal').textContent = el.value + '%';
      applyProject();
      scheduleSave();
    }
    if (el.id === 'txtIn') {
      p.text.content = el.value || ' ';
      applyProject();
      scheduleSave();
    }
    if (el.id === 'stkScaleR') {
      const activeSticker = p.stickers.find((s) => s.id === state.selectedStickerId);
      if (activeSticker) {
        activeSticker.scale = +el.value;
        applyProject();
        scheduleSave();
      }
    }
    if (el.id === 'stkRotR') {
      const activeSticker = p.stickers.find((s) => s.id === state.selectedStickerId);
      if (activeSticker) {
        activeSticker.rotate = +el.value;
        applyProject();
        scheduleSave();
      }
    }
    if (el.id === 'bgBlurR') {
      p.background.blur = +el.value;
      applyProject();
      scheduleSave();
    }
  });

  panel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const p = state.project;
    const act = b.dataset.act;
    const v = b.dataset.v;

    if (act === 'add-stk') {
      const emoji = b.dataset.emoji;
      snapshot();
      const newStk = {
        id: 'stk_' + Math.random().toString(36).slice(2, 7),
        emoji,
        x: 50,
        y: 50,
        scale: 1,
        rotate: 0
      };
      if (!p.stickers) p.stickers = [];
      p.stickers.push(newStk);
      state.selectedStickerId = newStk.id;
      applyProject();
      renderPanel();
      toast(`Added ${emoji} sticker`);
      scheduleSave();
    }
    if (act === 'del-active-stk') {
      if (state.selectedStickerId) {
        snapshot();
        p.stickers = p.stickers.filter((s) => s.id !== state.selectedStickerId);
        state.selectedStickerId = null;
        applyProject();
        renderPanel();
        toast('Sticker removed');
        scheduleSave();
      }
    }
    if (act === 'bg-mode') {
      snapshot();
      p.background.mode = v;
      applyProject();
      renderPanel();
      scheduleSave();
    }
    if (act === 'bg-fit') {
      snapshot();
      p.background.fit = v;
      applyProject();
      renderPanel();
      scheduleSave();
    }
    if (act === 'bg-color') {
      snapshot();
      p.background.color = v;
      applyProject();
      renderPanel();
      scheduleSave();
    }
    if (act === 'bg-grad') {
      snapshot();
      p.background.gradient = v;
      applyProject();
      renderPanel();
      scheduleSave();
    }
    if (act === 'set-ratio') {
      snapshot();
      p.ratio = v;
      applyProject();
      renderPanel();
      const r = RATIOS.find((x) => x.id === v);
      toast(r ? r.chip : 'Aspect ratio changed');
      scheduleSave();
    }
    if (act === 'split') {
      const { i, local } = clipAt(state.time);
      const c = p.clips[i];
      const frac = local / c.dur;
      if (frac < 0.12 || frac > 0.88) {
        toast('Move the playhead into the middle of the clip');
        return;
      }
      snapshot();
      const a = { ...c, id: c.id + 'a', dur: +(c.dur * frac).toFixed(2) };
      const bb = { ...c, id: c.id + 'b', in: +(c.in + c.dur * frac).toFixed(2), dur: +(c.dur * (1 - frac)).toFixed(2) };
      p.clips.splice(i, 1, a, bb);
      state.selected = i;
      renderTimeline();
      renderPanel();
      toast('Clip split at ' + fmtS(state.time));
      scheduleSave();
    }
    if (act === 'dup') {
      snapshot();
      p.clips.splice(state.selected + 1, 0, { ...p.clips[state.selected], id: 'c' + Date.now() });
      renderTimeline();
      renderPanel();
      toast('Clip duplicated');
      scheduleSave();
    }
    if (act === 'del') {
      if (p.clips.length <= 1) {
        toast('A timeline needs at least one clip');
        return;
      }
      snapshot();
      p.clips.splice(state.selected, 1);
      state.selected = clamp(state.selected, 0, p.clips.length - 1);
      seek(Math.min(state.time, total()));
      renderTimeline();
      renderPanel();
      toast('Clip removed');
      scheduleSave();
    }
    if (act === 'undo') {
      if (!state.undo.length) {
        toast('Nothing to undo');
        return;
      }
      state.redo.push(JSON.stringify(state.project));
      state.project = JSON.parse(state.undo.pop());
      state.selected = clamp(state.selected, 0, state.project.clips.length - 1);
      applyProject();
      renderTimeline();
      renderPanel();
      toast('Undo');
      scheduleSave();
    }
    if (act === 'w') {
      snapshot();
      p.text.weight = +v;
      applyProject();
      renderPanel();
      scheduleSave();
    }
    if (act === 'upper') {
      snapshot();
      p.text.upper = !p.text.upper;
      applyProject();
      renderPanel();
      scheduleSave();
    }
    if (act === 'col') {
      snapshot();
      p.text.color = v;
      applyProject();
      renderPanel();
      scheduleSave();
    }
    if (act === 'anim') {
      snapshot();
      p.text.anim = v;
      applyProject();
      renderPanel();
      scheduleSave();
    }
    if (act === 'filter') {
      snapshot();
      p.filter = v;
      applyProject();
      renderPanel();
      const f = state.presets.filters.find((x) => x.id === v);
      toast(f.name + ' applied');
      scheduleSave();
    }
    if (act === 'track') {
      snapshot();
      p.track = p.track === v ? null : v;
      applyProject();
      renderPanel();
      toast(p.track ? state.presets.audio.find((a) => a.id === p.track).name + ' linked' : 'Track removed');
      scheduleSave();
    }
    if (act === 'mute') {
      snapshot();
      p.muted = !p.muted;
      applyProject();
      renderPanel();
      scheduleSave();
    }
    if (act === 'duck') {
      toast('Dialogue ducking enabled');
      scheduleSave();
    }
    if (act === 'speed') {
      snapshot();
      p.speed = +v;
      applyProject();
      renderPanel();
      toast('Speed ' + v + '×');
      scheduleSave();
    }
    if (act === 'ramp') {
      snapshot();
      p.speed = 2;
      applyProject();
      renderPanel();
      toast('Ramped to 2× over 12 frames');
      scheduleSave();
    }
    if (act === 'freeze') {
      toast('Freeze frame added at ' + fmtS(state.time));
    }
  });

  $('#expBody').addEventListener('click', (e) => {
    const o = e.target.closest('[data-o]');
    if (o) {
      const k = o.dataset.o;
      const v = o.dataset.v;
      state.exportOpts[k] = k === 'clean' ? !state.exportOpts.clean : k === 'fps' ? +v : v;
      exportForm();
      return;
    }
    if (e.target.id === 'startRender') {
      startRender();
      return;
    }
    if (e.target.id === 'cancelRender') {
      cancelRender();
      return;
    }
    if (e.target.id === 'copyLink') {
      const txt = $('.linkbox span')?.textContent || '';
      navigator.clipboard?.writeText(txt).then(() => toast('Link copied')).catch(() => toast('Copy blocked by browser'));
      return;
    }
    const a = e.target.closest('[data-act2]');
    if (a) {
      const k = a.dataset.act2;
      if (k === 'done') {
        closeSheets();
        return;
      }
      toast(k === 'photos' ? 'Saved to Photos' : k === 'reel' ? 'Queued for Reels' : 'Share sheet opened');
    }
  });

  $('#expBody').addEventListener('input', (e) => {
    if (e.target.id === 'brR') {
      state.exportOpts.bitrate = +e.target.value;
      e.target.style.setProperty('--p', ((e.target.value - 4) / 41) * 100 + '%');
      $('#brVal').textContent = e.target.value + ' Mbps';
      $('#sizeVal').textContent = estSize() + ' MB';
      const b = $('#startRender');
      if (b) b.textContent = `Start render · ${estSize()} MB`;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') {
      e.preventDefault();
      setPlaying(!state.playing);
    }
    if (e.key === 'ArrowLeft') seek(state.time - 0.2);
    if (e.key === 'ArrowRight') seek(state.time + 0.2);
    if (e.key.toLowerCase() === 'e') openExport();
  });
}

export function setPlaying(v) {
  state.playing = v;
  $('#playIcon').innerHTML = v ? '<path d="M8 5h3v14H8zM13 5h3v14h-3z"/>' : '<path d="M7 4.5v15l13-7.5z"/>';
  $('#transport').classList.toggle('playing', v);
  phone.classList.toggle('playing', v);

  if (v && state.project && state.project.track && !state.project.muted) {
    audioSynth.playTrack(state.project.track, state.project.volume, state.project.muted);
  } else {
    audioSynth.stop();
  }
}

let last = 0;
export function loop(ts) {
  if (state.playing && state.project) {
    const dt = Math.min(0.1, (ts - last) / 1000);
    let t = state.time + dt * state.project.speed;
    if (t >= total()) {
      t = 0;
    }
    state.time = t;
    updatePlayhead();
    syncPreview();
  }
  last = ts;
  requestAnimationFrame(loop);
}
