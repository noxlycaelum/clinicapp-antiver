import { getDb } from './db.js';
import { seed } from './seed.js';

async function reset() {
  console.log('Resetting SQLite tables...');
  const db = await getDb();
  
  await db.exec('PRAGMA foreign_keys = OFF;');
  await db.exec('DROP TABLE IF EXISTS whatsapp_logs;');
  await db.exec('DROP TABLE IF EXISTS workflows;');
  await db.exec('DROP TABLE IF EXISTS billing;');
  await db.exec('DROP TABLE IF EXISTS appointments;');
  await db.exec('DROP TABLE IF EXISTS patients;');
  await db.exec('DROP TABLE IF EXISTS users;');
  await db.exec('DROP TABLE IF EXISTS doctors;');
  await db.exec('DROP TABLE IF EXISTS clinics;');
  await db.exec('PRAGMA foreign_keys = ON;');
  
  console.log('Tables dropped. Re-running seeder schema bootstrapping...');
  await seed();
  console.log('Database successfully reset and empty schemas bootstrapped!');
}

reset().then(() => process.exit(0)).catch(err => {
  console.error('Reset failed:', err);
  process.exit(1);
});
