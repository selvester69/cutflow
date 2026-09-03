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
      const result = await projectService.saveProject(id, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProjectController();
