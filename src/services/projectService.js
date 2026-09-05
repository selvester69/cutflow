const projectRepo = require('../repositories/projectRepository');

class ProjectService {
  async getProject(id) {
    const project = await projectRepo.findById(id);
    if (!project) {
      const err = new Error('Project not found');
      err.status = 404;
      throw err;
    }
    return project;
  }

  async saveProject(id, data, userId = 'usr_default') {
    if (!data) {
      const err = new Error('Invalid project payload');
      err.status = 400;
      throw err;
    }
    return await projectRepo.save(id, data, userId);
  }

  async getVersions(id) {
    await this.getProject(id);
    return await projectRepo.getVersions(id);
  }
}

module.exports = new ProjectService();
