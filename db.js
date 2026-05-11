import { open } from 'react-native-quick-sqlite';

const db = open({ name: 'Journal.db' });

export const initDB = () => {
  db.execute(
    'CREATE TABLE IF NOT EXISTS entries (id TEXT PRIMARY KEY, title TEXT, body TEXT, mood TEXT, date TEXT)',
  );
};

export const getEntriesPaginated = (limit, offset, searchQuery = '') => {
  let query = 'SELECT * FROM entries';
  const params = [];

  if (searchQuery) {
    query += ' WHERE title LIKE ? OR body LIKE ?';
    params.push(`%${searchQuery}%`, `%${searchQuery}%`);
  }

  query += ' ORDER BY date DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = db.execute(query, params);
  return result.rows?._array || [];
};

export const insertOrUpdateEntry = e => {
  db.execute(
    'INSERT OR REPLACE INTO entries (id, title, body, mood, date) VALUES (?, ?, ?, ?, ?)',
    [e.id, e.title, e.body, e.mood, e.date],
  );
};

export const removeEntry = id => {
  db.execute('DELETE FROM entries WHERE id = ?', [id]);
};

export const getAllEntriesForExport = () => {
  const result = db.execute('SELECT * FROM entries ORDER BY date DESC');
  return result.rows?._array || [];
};

export const importEntries = entriesArray => {
  db.execute('BEGIN TRANSACTION');
  try {
    entriesArray.forEach(e => {
      db.execute(
        'INSERT OR REPLACE INTO entries (id, title, body, mood, date) VALUES (?, ?, ?, ?, ?)',
        [e.id, e.title, e.body, e.mood, e.date],
      );
    });
    db.execute('COMMIT');
  } catch (error) {
    db.execute('ROLLBACK');
    throw error;
  }
};