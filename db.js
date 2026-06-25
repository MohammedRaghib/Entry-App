import { open } from 'react-native-quick-sqlite';

const db = open({ name: 'Journal.db' });

const TARGET_DB_VERSION = 1;

const MIGRATIONS = {
  1: () => {
    db.execute(
      'CREATE TABLE IF NOT EXISTS moods (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, emoji TEXT)',
    );

    const defaultMoods = [
      { name: 'Happy', emoji: '🙂' },
      { name: 'Sad', emoji: '😭' },
      { name: 'Neutral', emoji: '😐' },
      { name: 'Excited', emoji: '😎' },
    ];

    defaultMoods.forEach(m => {
      db.execute(
        'INSERT OR IGNORE INTO moods (name, emoji) VALUES (?, ?)',
        [m.name, m.emoji],
      );
    });

    let tableCheck = db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='entries'");
    
    if (tableCheck.rows?._array?.length > 0) {
      let columnCheck = db.execute("PRAGMA table_info(entries)");
      let columns = columnCheck.rows?._array || [];
      let isIdText = columns.some(col => col.name === 'id' && col.type.toUpperCase() === 'TEXT');

      if (isIdText) {
        db.execute('ALTER TABLE entries RENAME TO old_entries');

        db.execute(
          'CREATE TABLE entries (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, body TEXT, mood_id INTEGER, date TEXT)',
        );

        db.execute(`
          INSERT INTO entries (title, body, date, mood_id)
          SELECT 
            o.title, 
            o.body, 
            o.date,
            CASE 
              WHEN o.mood = 'happy' THEN 1
              WHEN o.mood = 'sad' THEN 2
              WHEN o.mood = 'neutral' THEN 3
              WHEN o.mood = 'excited' THEN 4
              ELSE 3
            END
          FROM old_entries o
        `);

        db.execute('DROP TABLE old_entries');
        return;
      }
    }

    db.execute(
      'CREATE TABLE IF NOT EXISTS entries (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, body TEXT, mood_id INTEGER, date TEXT)',
    );
  },
  2: () => {
    db.execute(`
      CREATE TABLE IF NOT EXISTS attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_id INTEGER,
        filename TEXT,
        FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
      )
    `);
  },
};

export const initDB = () => {
  db.execute('PRAGMA foreign_keys = ON;');

  let currentVersionResult = db.execute('PRAGMA user_version');
  let currentVersion = currentVersionResult.rows?._array[0]?.user_version || 0;

  if (currentVersion < TARGET_DB_VERSION) {
    db.execute('BEGIN TRANSACTION');
    try {
      for (let v = currentVersion + 1; v <= TARGET_DB_VERSION; v++) {
        if (MIGRATIONS[v]) {
          MIGRATIONS[v]();
        }
      }
      db.execute(`PRAGMA user_version = ${TARGET_DB_VERSION}`);
      db.execute('COMMIT');
    } catch (error) {
      db.execute('ROLLBACK');
      throw error;
    }
  }
};

export const getEntriesPaginated = (limit, offset, searchQuery = '') => {
  let query = `
    SELECT e.*, m.emoji as mood_emoji, m.name as mood_name 
    FROM entries e
    LEFT JOIN moods m ON e.mood_id = m.id
  `;
  const params = [];

  if (searchQuery) {
    query += ' WHERE e.title LIKE ? OR e.body LIKE ?';
    params.push(`%${searchQuery}%`, `%${searchQuery}%`);
  }

  query += ' ORDER BY e.date DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = db.execute(query, params);
  return result.rows?._array || [];
};

export const getAllMoods = () => {
  const result = db.execute('SELECT * FROM moods ORDER BY id ASC');
  return result.rows?._array || [];
};

export const insertOrUpdateEntry = e => {
  if (e.id && typeof e.id === 'number') {
    db.execute(
      'INSERT OR REPLACE INTO entries (id, title, body, mood_id, date) VALUES (?, ?, ?, ?, ?)',
      [e.id, e.title, e.body, e.mood_id, e.date],
    );
  } else {
    db.execute(
      'INSERT INTO entries (title, body, mood_id, date) VALUES (?, ?, ?, ?)',
      [e.title, e.body, e.mood_id, e.date],
    );
  }
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
      if (e.id && typeof e.id === 'number') {
        db.execute(
          'INSERT OR REPLACE INTO entries (id, title, body, mood_id, date) VALUES (?, ?, ?, ?, ?)',
          [e.id, e.title, e.body, e.mood_id, e.date],
        );
      } else {
        db.execute(
          'INSERT INTO entries (title, body, mood_id, date) VALUES (?, ?, ?, ?)',
          [e.title, e.body, e.mood_id, e.date],
        );
      }
    });
    db.execute('COMMIT');
  } catch (error) {
    db.execute('ROLLBACK');
    throw error;
  }
};

export const importMoods = (mood) => {
  db.execute(
    'INSERT OR IGNORE INTO moods (name, emoji) VALUES (?, ?)',
    [mood.name, mood.emoji]
  );
  
  const result = db.execute('SELECT id FROM moods WHERE name = ?', [mood.name]);
  return result.rows?._array[0]?.id;
};

export const importAttachment = (attachment) => {
  db.execute(
    'INSERT OR IGNORE INTO attachments (entry_id, filename) VALUES (?, ?)',
    [attachment.entry_id, attachment.filename]
  );
  
  const result = db.execute(
    'SELECT id FROM attachments WHERE entry_id = ? AND filename = ?', 
    [attachment.entry_id, attachment.filename]
  );
  return result.rows?._array[0]?.id;
};

export const getAttachmentsForEntry = (entryId) => {
  const result = db.execute('SELECT filename FROM attachments WHERE entry_id = ?', [entryId]);
  return result.rows?._array.map(a => a.filename) || [];
};

export const removeAttachment = (Id) => {
  db.execute('DELETE FROM attachments WHERE id = ?', [Id]);
};