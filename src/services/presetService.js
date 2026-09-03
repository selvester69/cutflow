const presetRepo = require('../repositories/presetRepository');

class PresetService {
  getPresets() {
    return presetRepo.getPresets();
  }
}

module.exports = new PresetService();
