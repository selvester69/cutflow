const { runQuery, getQuery, allQuery } = require('../db/database');

class MediaRepository {
  async create(asset) {
    await runQuery(
      'INSERT INTO media_assets (id, user_id, filename, mimetype, size, path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [asset.id, asset.userId, asset.filename, asset.mimetype, asset.size, asset.path, asset.createdAt || Date.now()]
    );
    return this.findById(asset.id);
  }

  async findById(id) {
    const row = await getQuery('SELECT * FROM media_assets WHERE id = ?', [id]);
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      filename: row.filename,
      mimetype: row.mimetype,
      size: row.size,
      path: row.path,
      createdAt: row.created_at
    };
  }

  async listByUser(userId) {
    const rows = await allQuery('SELECT * FROM media_assets WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      filename: r.filename,
      mimetype: r.mimetype,
      size: r.size,
      path: r.path,
      createdAt: r.created_at
    }));
  }
}

module.exports = new MediaRepository();
