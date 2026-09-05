const fs = require('fs');
const path = require('path');
const mediaRepository = require('../repositories/mediaRepository');

class MediaService {
  async saveAsset(userId, fileData) {
    if (!fileData || !fileData.filename) {
      const err = new Error('Invalid file payload');
      err.status = 400;
      throw err;
    }

    const id = 'ast_' + Math.random().toString(36).slice(2, 9);
    const uploadDir = path.join(__dirname, '../../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, `${id}_${fileData.filename}`);
    let fileBuffer;
    if (Buffer.isBuffer(fileData.buffer)) {
      fileBuffer = fileData.buffer;
    } else if (fileData.base64) {
      fileBuffer = Buffer.from(fileData.base64, 'base64');
    } else if (typeof fileData.content === 'string') {
      fileBuffer = Buffer.from(fileData.content, 'utf-8');
    } else {
      fileBuffer = Buffer.from('RIFF....WAVEfmt ....data....', 'binary');
    }

    fs.writeFileSync(filePath, fileBuffer);

    const asset = await mediaRepository.create({
      id,
      userId: userId || 'usr_default',
      filename: fileData.filename,
      mimetype: fileData.mimetype || 'video/mp4',
      size: fileBuffer.length,
      path: `/uploads/${id}_${fileData.filename}`,
      createdAt: Date.now()
    });

    return asset;
  }

  async listAssets(userId) {
    return await mediaRepository.listByUser(userId || 'usr_default');
  }

  async getAsset(id) {
    const asset = await mediaRepository.findById(id);
    if (!asset) {
      const err = new Error('Asset not found');
      err.status = 404;
      throw err;
    }
    return asset;
  }
}

module.exports = new MediaService();
