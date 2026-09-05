const { runQuery, getQuery } = require('../db/database');

class UserRepository {
  async findById(id) {
    const row = await getQuery('SELECT * FROM users WHERE id = ?', [id]);
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.created_at
    };
  }

  async findByEmail(email) {
    const row = await getQuery('SELECT * FROM users WHERE email = ?', [email]);
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      name: row.name,
      createdAt: row.created_at
    };
  }

  async create(user) {
    await runQuery(
      'INSERT INTO users (id, email, password, name, created_at) VALUES (?, ?, ?, ?, ?)',
      [user.id, user.email, user.password, user.name, user.createdAt || Date.now()]
    );
    return this.findById(user.id);
  }
}

module.exports = new UserRepository();
