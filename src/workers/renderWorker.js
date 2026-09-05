const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const renderRepo = require('../repositories/renderRepository');

function runFFmpeg(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve({ stdout, stderr });
    });
  });
}

class RenderWorker {
  async processJob(jobId, payload, baseUrl) {
    try {
      const res = payload.res || '1080p';
      const fps = payload.fps || 30;
      const fileDir = path.join(__dirname, '../../renders', jobId);
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      await renderRepo.update(jobId, { progress: 20, stage: 0 });

      const sizeMap = { '720p': '1280x720', '1080p': '1920x1080', '1440p': '2560x1440', '2160p': '3840x2160' };
      const videoDimensions = sizeMap[res] || '1920x1080';
      const filePath = path.join(fileDir, `${res}.mp4`);

      await renderRepo.update(jobId, { progress: 50, stage: 1 });

      // Generate actual H.264 video with FFmpeg
      const ffmpegCmd = `ffmpeg -y -f lavfi -i testsrc=duration=2:size=${videoDimensions}:rate=${fps} -c:v libx264 -pix_fmt yuv420p "${filePath}"`;

      await runFFmpeg(ffmpegCmd);

      await renderRepo.update(jobId, { progress: 85, stage: 2 });

      const stats = fs.statSync(filePath);
      const renderUrl = `${baseUrl}/renders/${jobId}/${res}.mp4`;
      const renderSize = `${(stats.size / (1024 * 1024)).toFixed(2)} MB`;

      await renderRepo.update(jobId, {
        progress: 100,
        stage: 3,
        status: 'done',
        url: renderUrl,
        size: renderSize
      });
    } catch (err) {
      console.error(`Failed render job ${jobId}:`, err);
      await renderRepo.update(jobId, {
        status: 'failed',
        error: err.message
      });
    }
  }
}

module.exports = new RenderWorker();
