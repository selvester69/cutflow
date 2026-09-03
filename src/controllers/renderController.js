const renderService = require('../services/renderService');

class RenderController {
  async createRender(req, res, next) {
    try {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const job = await renderService.createRender(req.body, baseUrl);
      res.status(201).json(job);
    } catch (err) {
      next(err);
    }
  }

  async getRender(req, res, next) {
    try {
      const { id } = req.params;
      const job = await renderService.getRender(id);
      res.json(job);
    } catch (err) {
      next(err);
    }
  }

  async cancelRender(req, res, next) {
    try {
      const { id } = req.params;
      const result = await renderService.cancelRender(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RenderController();
