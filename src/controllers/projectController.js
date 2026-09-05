const projectService = require('../services/projectService');

class ProjectController {
  async getProject(req, res, next) {
    try {
      const { id } = req.params;
      const project = await projectService.getProject(id);
      res.json(project);
    } catch (err) {
      next(err);
    }
  }

  async saveProject(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user ? req.user.id : 'usr_default';
      const result = await projectService.saveProject(id, req.body, userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getVersions(req, res, next) {
    try {
      const { id } = req.params;
      const versions = await projectService.getVersions(id);
      res.json(versions);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProjectController();
