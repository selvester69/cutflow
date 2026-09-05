const fs = require('fs');
const path = require('path');
const renderRepo = require('../repositories/renderRepository');
const renderWorker = require('../workers/renderWorker');

const activeTimers = new Map();

class RenderService {
  async createRender(payload, baseUrl) {
    const id = 'rnd_' + Math.random().toString(36).slice(2, 9);
    const job = {
      id,
      status: 'queued',
      progress: 0,
      stage: 0,
      payload,
      createdAt: Date.now()
    };

    await renderRepo.create(job);

    // Asynchronously dispatch render worker job
    const timer = setInterval(async () => {
      try {
        const current = await renderRepo.findById(id);
        if (!current || current.status === 'cancelled') {
          clearInterval(timer);
          activeTimers.delete(id);
          return;
        }

        let progress = current.progress + (current.progress < 10 ? 10.5 : current.progress < 80 ? 12.6 : 8.5);
        progress = Math.min(100, progress);
        const stage = progress < 15 ? 0 : progress < 50 ? 1 : progress < 90 ? 2 : 3;

        let updates = { progress, stage, status: progress >= 100 ? 'done' : 'processing' };

        if (progress >= 100) {
          clearInterval(timer);
          activeTimers.delete(id);
          await renderWorker.processJob(id, payload, baseUrl);
        } else {
          await renderRepo.update(id, updates);
        }
      } catch (err) {
        console.error('Error updating render job:', err);
        clearInterval(timer);
        activeTimers.delete(id);
      }
    }, 150);

    activeTimers.set(id, timer);

    return { id, status: 'queued' };
  }

  async getRender(id) {
    const job = await renderRepo.findById(id);
    if (!job) {
      const err = new Error('Render job not found');
      err.status = 404;
      throw err;
    }
    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      url: job.url,
      size: job.size
    };
  }

  async cancelRender(id) {
    if (activeTimers.has(id)) {
      clearInterval(activeTimers.get(id));
      activeTimers.delete(id);
    }
    const job = await renderRepo.findById(id);
    if (job) {
      await renderRepo.update(id, { status: 'cancelled' });
    }
    return { ok: true };
  }
}

module.exports = new RenderService();
