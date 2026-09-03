const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../cutflow.db');

let dbInstance = null;

function getDbConnection() {
  if (dbInstance) return dbInstance;

  dbInstance = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('Failed to connect to SQLite database:', err.message);
    }
  });

  return dbInstance;
}

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDbConnection();
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDbConnection();
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDbConnection();
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function initDb() {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      rev INTEGER NOT NULL DEFAULT 1,
      updated_at INTEGER NOT NULL,
      data TEXT NOT NULL
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS renders (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      status TEXT NOT NULL,
      progress REAL NOT NULL DEFAULT 0,
      stage INTEGER NOT NULL DEFAULT 0,
      url TEXT,
      size TEXT,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  // Seed default project if not existing
  const existingProject = await getQuery('SELECT id FROM projects WHERE id = ?', ['cf_8241']);
  if (!existingProject) {
    const IMG = (n) => `https://images.unsplash.com/photo-${n}?auto=format&fit=crop&w=640&q=70`;
    const defaultProjectData = {
      id: 'cf_8241',
      title: 'Kyoto — Cut 02',
      rev: 11,
      updatedAt: Date.now(),
      clips: [
        { id: 'k1', name: 'Dawn Ridge', img: IMG('1500530855697-b586d89ba3ee'), orig: 4.2, in: 0, dur: 3.4 },
        { id: 'k2', name: 'Fog Line', img: IMG('1470071459604-3b5ec3a7fe05'), orig: 3.8, in: 0, dur: 2.8 },
        { id: 'k3', name: 'Pine Road', img: IMG('1441974231531-c6227db76b6e'), orig: 4.6, in: 0, dur: 3.6 },
        { id: 'k4', name: 'Still Lake', img: IMG('1506905925346-21bda4d32df4'), orig: 4.0, in: 0, dur: 3.0 },
        { id: 'k5', name: 'Night Peak', img: IMG('1519681393784-d120267933ba'), orig: 3.5, in: 0, dur: 2.6 },
        { id: 'k6', name: 'Coast Line', img: IMG('1505142468610-359e7d316be0'), orig: 4.4, in: 0, dur: 3.2 }
      ],
      text: { content: 'CHASING\nDAYLIGHT', x: 50, y: 66, weight: 900, color: '#ffffff', align: 'center', anim: 'pop' },
      filter: 'kodak',
      speed: 1,
      ratio: 'portrait',
      track: 'alpine',
      volume: 0.72,
      muted: false
    };

    await runQuery(
      'INSERT INTO projects (id, title, rev, updated_at, data) VALUES (?, ?, ?, ?, ?)',
      ['cf_8241', defaultProjectData.title, defaultProjectData.rev, defaultProjectData.updatedAt, JSON.stringify(defaultProjectData)]
    );
  }
}

function closeDb() {
  return new Promise((resolve) => {
    if (dbInstance) {
      dbInstance.close(() => {
        dbInstance = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  getDbConnection,
  runQuery,
  getQuery,
  allQuery,
  initDb,
  closeDb
};
