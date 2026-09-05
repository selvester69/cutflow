const { getQuery, runQuery, allQuery } = require('../db/database');

class ProjectRepository {
  async findById(id) {
    const row = await getQuery('SELECT * FROM projects WHERE id = ?', [id]);
    if (!row) return null;
    const project = JSON.parse(row.data);
    project.rev = row.rev;
    project.updatedAt = row.updated_at;
    project.userId = row.user_id;
    return project;
  }

  async save(id, projectData, userId = 'usr_default') {
    const existing = await this.findById(id);
    const newRev = existing ? existing.rev + 1 : 1;
    const updatedAt = Date.now();

    const fullData = existing
      ? { ...existing, ...projectData, rev: newRev, updatedAt }
      : { ...projectData, rev: newRev, updatedAt };

    const dataJson = JSON.stringify(fullData);

    if (existing) {
      await runQuery(
        'UPDATE projects SET title = ?, rev = ?, updated_at = ?, data = ? WHERE id = ?',
        [fullData.title || existing.title, newRev, updatedAt, dataJson, id]
      );
    } else {
      await runQuery(
        'INSERT INTO projects (id, user_id, title, rev, updated_at, data) VALUES (?, ?, ?, ?, ?, ?)',
        [id, userId, fullData.title || 'Untitled', newRev, updatedAt, dataJson]
      );
    }

    // Insert version history snapshot
    const versionId = `ver_${id}_r${newRev}`;
    await runQuery(
      'INSERT INTO project_versions (id, project_id, rev, data, created_at) VALUES (?, ?, ?, ?, ?)',
      [versionId, id, newRev, dataJson, updatedAt]
    );

    return { rev: newRev, updatedAt, bytes: dataJson.length };
  }

  async getVersions(projectId) {
    const rows = await allQuery(
      'SELECT id, rev, created_at FROM project_versions WHERE project_id = ? ORDER BY rev DESC',
      [projectId]
    );
    return rows;
  }
}

module.exports = new ProjectRepository();
