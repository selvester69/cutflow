const { getQuery, runQuery } = require('../db/database');

class RenderRepository {
  async findById(id) {
    const row = await getQuery('SELECT * FROM renders WHERE id = ?', [id]);
    if (!row) return null;
    return {
      id: row.id,
      projectId: row.project_id,
      status: row.status,
      progress: row.progress,
      stage: row.stage,
      url: row.url,
      size: row.size,
      payload: JSON.parse(row.payload),
      createdAt: row.created_at
    };
  }

  async create(job) {
    await runQuery(
      'INSERT INTO renders (id, project_id, status, progress, stage, url, size, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        job.id,
        job.payload.projectId || 'cf_8241',
        job.status,
        job.progress || 0,
        job.stage || 0,
        job.url || null,
        job.size || null,
        JSON.stringify(job.payload),
        job.createdAt || Date.now()
      ]
    );
    return job;
  }

  async update(id, updates) {
    const existing = await this.findById(id);
    if (!existing) return null;

    const status = updates.status !== undefined ? updates.status : existing.status;
    const progress = updates.progress !== undefined ? updates.progress : existing.progress;
    const stage = updates.stage !== undefined ? updates.stage : existing.stage;
    const url = updates.url !== undefined ? updates.url : existing.url;
    const size = updates.size !== undefined ? updates.size : existing.size;

    await runQuery(
      'UPDATE renders SET status = ?, progress = ?, stage = ?, url = ?, size = ? WHERE id = ?',
      [status, progress, stage, url, size, id]
    );

    return { ...existing, status, progress, stage, url, size };
  }
}

module.exports = new RenderRepository();
