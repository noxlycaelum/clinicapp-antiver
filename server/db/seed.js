import bcrypt from 'bcryptjs';
import { getDb } from './db.js';

export async function seed() {
  const db = await getDb();

  console.log('Bootstrapping SQL database tables...');

  // 1. Create Clinics Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS clinics (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      gstin TEXT,
      address TEXT,
      phone TEXT
    );
  `);

  // 2. Create Doctors Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS doctors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      specialty TEXT,
      phone TEXT,
      clinic_id TEXT,
      FOREIGN KEY(clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
    );
  `);

  // 3. Create Users Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      clinic_id TEXT,
      FOREIGN KEY(clinic_id) REFERENCES clinics(id) ON DELETE SET NULL
    );
  `);

  // 4. Create Patients Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      gender TEXT,
      age INTEGER,
      tags TEXT, -- JSON string representing array of tags
      visit_history TEXT DEFAULT '[]', -- JSON string representing visit log entries
      follow_up_status TEXT DEFAULT 'none',
      recall_interval_months INTEGER DEFAULT 6,
      created_at TEXT,
      clinic_id TEXT,
      FOREIGN KEY(clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
    );
  `);

  // 5. Create Appointments Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      doctor_name TEXT,
      date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'Confirmed',
      notes TEXT,
      created_at TEXT,
      clinic_id TEXT,
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY(clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
    );
  `);

  // 6. Create Billing Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS billing (
      id TEXT PRIMARY KEY,
      appointment_id TEXT,
      patient_id TEXT NOT NULL,
      patient_name TEXT,
      date TEXT NOT NULL,
      treatment TEXT,
      amount REAL,
      status TEXT DEFAULT 'Pending',
      payment_method TEXT,
      receipt_no TEXT,
      created_at TEXT,
      clinic_id TEXT,
      FOREIGN KEY(appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY(clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
    );
  `);

  // 7. Create Workflows Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trigger_event TEXT NOT NULL,
      delay_minutes INTEGER DEFAULT 0,
      template_text TEXT NOT NULL,
      is_active INTEGER DEFAULT 1, -- boolean 0 or 1
      category TEXT,
      clinic_id TEXT,
      FOREIGN KEY(clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
    );
  `);

  // 8. Create WhatsApp Logs Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS whatsapp_logs (
      id TEXT PRIMARY KEY,
      patient_id TEXT,
      patient_name TEXT,
      phone TEXT NOT NULL,
      message TEXT NOT NULL,
      trigger_event TEXT,
      status TEXT DEFAULT 'Sent',
      timestamp TEXT,
      type TEXT DEFAULT 'outbound',
      clinic_id TEXT,
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE SET NULL,
      FOREIGN KEY(clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
    );
  `);

  console.log('SQLite Relational Database schema initialized successfully!');
}

// Run seeder if executed directly
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seed().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
