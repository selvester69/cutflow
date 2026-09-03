const presetService = require('../services/presetService');

class PresetController {
  getPresets(req, res, next) {
    try {
      const presets = presetService.getPresets();
      res.json(presets);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PresetController();
