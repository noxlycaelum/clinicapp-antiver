import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, 'clinicos.db');

let dbInstance = null;

/**
 * Initializes and retrieves the SQL database connection singleton.
 * Configures SQLite to enforce standard foreign keys constraints.
 */
export async function getDb() {
  if (dbInstance) return dbInstance;
  
  try {
    dbInstance = await open({
      filename: DB_FILE,
      driver: sqlite3.Database
    });
    
    // Enable foreign keys
    await dbInstance.exec('PRAGMA foreign_keys = ON;');
    
    return dbInstance;
  } catch (err) {
    console.error('Failed to open SQL database clinicos.db:', err);
    throw err;
  }
}
