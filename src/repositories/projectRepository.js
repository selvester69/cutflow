const { getQuery, runQuery } = require('../db/database');

class ProjectRepository {
  async findById(id) {
    const row = await getQuery('SELECT * FROM projects WHERE id = ?', [id]);
    if (!row) return null;
    const project = JSON.parse(row.data);
    project.rev = row.rev;
    project.updatedAt = row.updated_at;
    return project;
  }

  async save(id, projectData) {
    const existing = await this.findById(id);
    const newRev = existing ? existing.rev + 1 : 1;
    const updatedAt = Date.now();

    const fullData = existing
      ? { ...existing, ...projectData, rev: newRev, updatedAt }
      : { ...projectData, rev: newRev, updatedAt };

    if (existing) {
      await runQuery(
        'UPDATE projects SET title = ?, rev = ?, updated_at = ?, data = ? WHERE id = ?',
        [fullData.title || existing.title, newRev, updatedAt, JSON.stringify(fullData), id]
      );
    } else {
      await runQuery(
        'INSERT INTO projects (id, title, rev, updated_at, data) VALUES (?, ?, ?, ?, ?)',
        [id, fullData.title || 'Untitled', newRev, updatedAt, JSON.stringify(fullData)]
      );
    }

    return { rev: newRev, updatedAt, bytes: JSON.stringify(fullData).length };
  }
}

module.exports = new ProjectRepository();
