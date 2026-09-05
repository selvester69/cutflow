const mediaService = require('../services/mediaService');

class MediaController {
  async upload(req, res, next) {
    try {
      const userId = req.user ? req.user.id : 'usr_default';
      const fileData = req.body || { filename: 'sample_media.mp4', mimetype: 'video/mp4' };
      const asset = await mediaService.saveAsset(userId, fileData);
      res.status(201).json(asset);
    } catch (err) {
      next(err);
    }
  }

  async list(req, res, next) {
    try {
      const userId = req.user ? req.user.id : 'usr_default';
      const assets = await mediaService.listAssets(userId);
      res.json(assets);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const asset = await mediaService.getAsset(req.params.id);
      res.json(asset);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new MediaController();
