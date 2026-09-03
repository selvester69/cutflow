const fs = require('fs');
const path = require('path');
const renderRepo = require('../repositories/renderRepository');

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

    const timer = setInterval(async () => {
      try {
        const current = await renderRepo.findById(id);
        if (!current || current.status === 'cancelled') {
          clearInterval(timer);
          activeTimers.delete(id);
          return;
        }

        let progress = current.progress + (current.progress < 6 ? 4.5 : current.progress < 78 ? 2.6 : 1.5) + Math.random() * 1.4;
        progress = Math.min(100, progress);
        const stage = progress < 8 ? 0 : progress < 58 ? 1 : progress < 93 ? 2 : 3;

        let updates = { progress, stage };

        if (progress >= 100) {
          clearInterval(timer);
          activeTimers.delete(id);

          const res = payload.res || '1080p';
          const fileDir = path.join(__dirname, '../../renders', id);
          if (!fs.existsSync(fileDir)) {
            fs.mkdirSync(fileDir, { recursive: true });
          }
          const filePath = path.join(fileDir, `${res}.mp4`);
          const fileContent = `Rendered video output for job ${id}\nResolution: ${res}\nFPS: ${payload.fps || 30}\nCodec: ${payload.codec || 'h264'}\nTimestamp: ${new Date().toISOString()}`;
          fs.writeFileSync(filePath, fileContent);

          const renderUrl = `${baseUrl}/renders/${id}/${res}.mp4`;
          const mult = res === '2160p' ? 2.9 : 1;
          const renderSize = `${Math.round(28 + mult * 46)} MB`;

          updates = {
            progress: 100,
            stage: 3,
            status: 'done',
            url: renderUrl,
            size: renderSize
          };
        }

        await renderRepo.update(id, updates);
      } catch (err) {
        console.error('Error updating render job:', err);
        clearInterval(timer);
        activeTimers.delete(id);
      }
    }, 240);

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
