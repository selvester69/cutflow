import { ApiService } from './api.js';
import { state } from './state.js';
import { initUI, moveIndicator, applyProject, renderTimeline, renderPanel, syncPreview, loop, updatePlayhead } from './ui.js';

const $ = (s, r = document) => r.querySelector(s);
const p2 = (n) => String(Math.floor(n)).padStart(2, '0');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function tickClock() {
  const clockEl = $('#clock');
  if (clockEl) {
    const d = new Date();
    clockEl.textContent = (d.getHours() % 12 || 12) + ':' + p2(d.getMinutes());
  }
}

async function boot() {
  tickClock();
  setInterval(tickClock, 10000);

  initUI();
  requestAnimationFrame(moveIndicator);

  window.addEventListener('resize', () => {
    moveIndicator();
    updatePlayhead();
  });

  try {
    const [proj, pres] = await Promise.all([ApiService.getProject('cf_8241'), ApiService.getPresets()]);
    state.project = proj;
    state.presets = pres;
    state.rev = proj.rev || 1;
  } catch (err) {
    state.project = {
      id: 'cf_8241',
      title: 'Offline draft',
      rev: 1,
      clips: [],
      text: { content: 'OFFLINE', x: 50, y: 66, weight: 900, color: '#fff' },
      filter: 'none',
      speed: 1,
      ratio: 'portrait',
      track: null,
      volume: 0.7,
      muted: false
    };
    state.presets = {
      filters: [{ id: 'none', name: 'Original', css: 'none' }],
      audio: [],
      codecs: [{ id: 'h264', name: 'H.264' }]
    };
  }

  $('#projTitle').textContent = state.project.title;
  $('#saveTxt').textContent = `Loaded · rev ${state.rev}`;
  $('#bootTxt').textContent = 'GET /v1/projects/cf_8241 → 200';

  if (state.project.clips && state.project.clips.length > 0) {
    state.project.clips.forEach((c) => {
      const im = new Image();
      im.src = c.img;
    });
    $('#f1').src = state.project.clips[0].img;
    $('#f1').dataset.i = 0;
  }

  applyProject();
  renderTimeline();
  renderPanel();
  syncPreview();

  requestAnimationFrame(loop);

  await sleep(560);
  $('#phone')?.classList.add('ready');
  const bootEl = $('#boot');
  if (bootEl) {
    bootEl.classList.add('off');
    setTimeout(() => bootEl.remove(), 600);
  }
  setTimeout(() => {
    if ($('#saveTxt')) $('#saveTxt').textContent = 'All changes saved';
  }, 1400);
  setTimeout(moveIndicator, 120);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
