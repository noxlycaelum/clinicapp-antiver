import bcrypt from 'bcryptjs';
import { getDb } from './db.js';

export async function seed() {
  const db = await getDb();

  console.log('Bootstrapping SQL database tables...');

  // 1. Create Users Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      clinic_name TEXT,
      clinic_type TEXT
    );
  `);

  // 2. Create Patients Table
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
      created_at TEXT
    );
  `);

  // 3. Create Appointments Table
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
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );
  `);

  // 4. Create Billing Table
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
      FOREIGN KEY(appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );
  `);

  // 5. Create Workflows Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trigger_event TEXT NOT NULL,
      delay_minutes INTEGER DEFAULT 0,
      template_text TEXT NOT NULL,
      is_active INTEGER DEFAULT 1, -- boolean 0 or 1
      category TEXT
    );
  `);

  // 6. Create WhatsApp Logs Table
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
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE SET NULL
    );
  `);

  // Check if users exist already
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  
  if (userCount.count > 0) {
    console.log('Database already initialized. Skipping seeder...');
    return;
  }

  console.log('Seeding relational tables with clinic data...');

  // Hashing default credentials securely
  const salt = await bcrypt.genSalt(10);
  const receptionistHash = await bcrypt.hash('admin123', salt);
  const doctorHash = await bcrypt.hash('doc123', salt);

  // Insert Users
  await db.run(
    `INSERT INTO users (id, username, password_hash, name, role, clinic_name, clinic_type) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['u1', 'receptionist', receptionistHash, 'Pooja Sharma', 'receptionist', 'Apex Dental & Skin Care', 'Dental & Skin Clinic']
  );
  await db.run(
    `INSERT INTO users (id, username, password_hash, name, role, clinic_name, clinic_type) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['u2', 'doctor', doctorHash, 'Dr. Aditya Verma (MDS)', 'doctor', 'Apex Dental & Skin Care', 'Dental & Skin Clinic']
  );

  // Insert Patients
  const patientsSeed = [
    {
      id: 'p1',
      name: 'Aarav Mehta',
      phone: '+91 98234 56789',
      email: 'aarav.mehta@gmail.com',
      gender: 'Male',
      age: 29,
      tags: JSON.stringify(['Regular', 'Orthodontic']),
      visit_history: JSON.stringify([
        { date: '2026-05-10', reason: 'Root Canal Consultation', notes: 'X-ray done. Prescribed pain relief. Advised treatment next week.' },
        { date: '2026-05-17', reason: 'Root Canal Treatment - Phase 1', notes: 'Pulpectomy completed. Temporary dressing applied.' }
      ]),
      follow_up_status: 'active',
      recall_interval_months: 6,
      created_at: '2026-05-10T10:15:30Z'
    },
    {
      id: 'p2',
      name: 'Ananya Iyer',
      phone: '+91 91678 12345',
      email: 'ananya.iyer@yahoo.com',
      gender: 'Female',
      age: 34,
      tags: JSON.stringify(['Dermatology', 'Acne Treatment']),
      visit_history: JSON.stringify([
        { date: '2026-04-20', reason: 'Acne Scar Consultation', notes: 'Prescribed topical retinoids and chemical peel preparation.' },
        { date: '2026-05-18', reason: 'Chemical Peel - Session 1', notes: 'Salicylic acid peel performed. Post-peel sunscreen advised.' }
      ]),
      follow_up_status: 'pending',
      recall_interval_months: 3,
      created_at: '2026-04-20T11:00:00Z'
    },
    {
      id: 'p3',
      name: 'Kabir Malhotra',
      phone: '+91 99876 54321',
      email: 'kabir.m@outlook.com',
      gender: 'Male',
      age: 42,
      tags: JSON.stringify(['Physiotherapy', 'Spine Care']),
      visit_history: JSON.stringify([
        { date: '2026-05-05', reason: 'Lower Back Pain Assessment', notes: 'L4-L5 compression. Started decompression therapy & core exercises.' },
        { date: '2026-05-12', reason: 'Physiotherapy Session 2', notes: 'Decreased pain levels. Added electrotherapy.' }
      ]),
      follow_up_status: 'overdue',
      recall_interval_months: 1,
      created_at: '2026-05-05T09:30:00Z'
    },
    {
      id: 'p4',
      name: 'Riya Kapoor',
      phone: '+91 98333 99999',
      email: 'riya.kapoor@gmail.com',
      gender: 'Female',
      age: 26,
      tags: JSON.stringify(['New Patient', 'Teeth Whitening']),
      visit_history: '[]',
      follow_up_status: 'none',
      recall_interval_months: 12,
      created_at: '2026-05-23T14:45:00Z'
    },
    {
      id: 'p5',
      name: 'Dr. Vikram Sen',
      phone: '+91 97654 32109',
      email: 'vikram.sen@rediffmail.com',
      gender: 'Male',
      age: 58,
      tags: JSON.stringify(['Senior Citizen', 'Dental Crown']),
      visit_history: JSON.stringify([
        { date: '2026-05-01', reason: 'Crown Prep & Impression', notes: 'Tooth #46 prepared. Impression sent to lab.' }
      ]),
      follow_up_status: 'active',
      recall_interval_months: 6,
      created_at: '2026-05-01T10:00:00Z'
    }
  ];

  for (const p of patientsSeed) {
    await db.run(
      `INSERT INTO patients (id, name, phone, email, gender, age, tags, visit_history, follow_up_status, recall_interval_months, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.name, p.phone, p.email, p.gender, p.age, p.tags, p.visit_history, p.follow_up_status, p.recall_interval_months, p.created_at]
    );
  }

  // Insert Appointments
  const appointmentsSeed = [
    {
      id: 'a1',
      patientId: 'p1',
      doctorName: 'Dr. Aditya Verma',
      date: '2026-05-24',
      timeSlot: '10:30 AM',
      reason: 'Root Canal Final Obturation',
      status: 'Completed',
      notes: 'Obturation finished. Composite build-up done. Patient satisfied.',
      createdAt: '2026-05-17T11:30:00Z'
    },
    {
      id: 'a2',
      patientId: 'p2',
      doctorName: 'Dr. Aditya Verma',
      date: '2026-05-24',
      timeSlot: '11:30 AM',
      reason: 'Acne Progress Checkup',
      status: 'Confirmed',
      notes: 'Follow up review for peeling irritation.',
      createdAt: '2026-05-18T12:00:00Z'
    },
    {
      id: 'a3',
      patientId: 'p3',
      doctorName: 'Dr. Aditya Verma',
      date: '2026-05-24',
      timeSlot: '04:30 PM',
      reason: 'Spine Traction Session 3',
      status: 'Confirmed',
      notes: 'Adjust decompression machine weight to 18kg.',
      createdAt: '2026-05-12T17:00:00Z'
    },
    {
      id: 'a4',
      patientId: 'p4',
      doctorName: 'Dr. Aditya Verma',
      date: '2026-05-25',
      timeSlot: '12:00 PM',
      reason: 'Teeth Whitening Procedure',
      status: 'Confirmed',
      notes: 'Pre-procedure polishing required.',
      createdAt: '2026-05-23T15:00:00Z'
    },
    {
      id: 'a5',
      patientId: 'p5',
      doctorName: 'Dr. Aditya Verma',
      date: '2026-05-23',
      timeSlot: '03:00 PM',
      reason: 'Crown Placement #46',
      status: 'No-Show',
      notes: 'Called patient twice, went to voicemail. Reschedule needed.',
      createdAt: '2026-05-19T09:00:00Z'
    }
  ];

  for (const a of appointmentsSeed) {
    await db.run(
      `INSERT INTO appointments (id, patient_id, doctor_name, date, time_slot, reason, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [a.id, a.patientId, a.doctorName, a.date, a.timeSlot, a.reason, a.status, a.notes, a.createdAt]
    );
  }

  // Insert Billing records
  const billingSeed = [
    {
      id: 'b1',
      appointmentId: 'a1',
      patientId: 'p1',
      patientName: 'Aarav Mehta',
      date: '2026-05-24',
      treatment: 'Root Canal Therapy (Obturation + Composite)',
      amount: 4500,
      status: 'Paid',
      paymentMethod: 'UPI (GPay)',
      receiptNo: 'APEX-2026-0814',
      createdAt: '2026-05-24T11:00:00Z'
    },
    {
      id: 'b2',
      appointmentId: 'a2',
      patientId: 'p2',
      patientName: 'Ananya Iyer',
      date: '2026-05-24',
      treatment: 'Chemical Peel Progress consultation',
      amount: 1200,
      status: 'Pending',
      paymentMethod: '',
      receiptNo: '',
      createdAt: '2026-05-24T11:45:00Z'
    },
    {
      id: 'b3',
      appointmentId: 'a5',
      patientId: 'p5',
      patientName: 'Dr. Vikram Sen',
      date: '2026-05-23',
      treatment: 'Zirconia Crown Fitting - #46',
      amount: 9000,
      status: 'Pending',
      paymentMethod: '',
      receiptNo: '',
      createdAt: '2026-05-23T15:15:00Z'
    }
  ];

  for (const b of billingSeed) {
    await db.run(
      `INSERT INTO billing (id, appointment_id, patient_id, patient_name, date, treatment, amount, status, payment_method, receipt_no, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [b.id, b.appointmentId, b.patientId, b.patientName, b.date, b.treatment, b.amount, b.status, b.paymentMethod, b.receiptNo, b.createdAt]
    );
  }

  // Insert Workflows templates
  const workflowsSeed = [
    {
      id: 'wf_booking',
      name: 'Booking Confirmation',
      triggerEvent: 'APPOINTMENT_CREATED',
      delayMinutes: 0,
      templateText: 'Hello *{{patientName}}*,\n\nYour appointment at *{{clinicName}}* has been successfully scheduled! 🎉\n\n📅 *Date:* {{date}}\n⏰ *Time:* {{time}}\n👨‍⚕️ *Doctor:* {{doctorName}}\n📝 *Reason:* {{reason}}\n\nNeed to reschedule? Reply to this message directly. See you soon!',
      isActive: 1,
      category: 'instant'
    },
    {
      id: 'wf_reminder',
      name: 'Pre-Visit Reminder',
      triggerEvent: 'APPOINTMENT_REMINDER_DUE',
      delayMinutes: 120,
      templateText: 'Hi *{{patientName}}*,\n\nThis is a friendly reminder for your upcoming appointment today at *{{clinicName}}*:\n\n⏰ *Time:* {{time}}\n👨‍⚕️ *Doctor:* {{doctorName}}\n\nPlease try to arrive 10 minutes prior to your slot. See you soon! 😊',
      isActive: 1,
      category: 'scheduled'
    },
    {
      id: 'wf_checkout',
      name: 'Post-Visit Follow-up',
      triggerEvent: 'VISIT_CHECKOUT',
      delayMinutes: 60,
      templateText: 'Dear *{{patientName}}*,\n\nThank you for visiting *{{clinicName}}* today. We hope you had a comfortable experience! ❤️\n\n💊 *Follow-up Advice:* Keep the area clean and follow the doctor\'s prescription.\n📞 *Support:* For any emergency discomfort, call us directly at 98765-XXXXX.\n📅 We have marked a tentative follow-up review for you. We will confirm the slot shortly.',
      isActive: 1,
      category: 'instant'
    },
    {
      id: 'wf_payment',
      name: 'Payment Received',
      triggerEvent: 'PAYMENT_RECEIVED',
      delayMinutes: 0,
      templateText: 'Dear *{{patientName}}*,\n\nThank you! We have received your payment of *₹{{amount}}* for *{{treatment}}* at *{{clinicName}}*.\n\n📄 *Receipt Status:* Mark Paid\n🧾 *Receipt No:* {{receiptNo}}\n\nHave a great day!',
      isActive: 1,
      category: 'instant'
    },
    {
      id: 'wf_recall',
      name: 'Re-engagement Campaign',
      triggerEvent: 'RECALL_DUE',
      delayMinutes: 0,
      templateText: 'Hello *{{patientName}}*,\n\nIt has been a while since your last check-up at *{{clinicName}}*! 🩺\n\nRegular dental & skin reviews help prevent larger issues down the line. We are offering a complimentary consultation check-up this week for our returning patients!\n\nWould you like us to block a slot for you this Saturday? Reply \'YES\' to book! 🌟',
      isActive: 1,
      category: 'campaign'
    }
  ];

  for (const wf of workflowsSeed) {
    await db.run(
      `INSERT INTO workflows (id, name, trigger_event, delay_minutes, template_text, is_active, category)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [wf.id, wf.name, wf.triggerEvent, wf.delayMinutes, wf.templateText, wf.isActive, wf.category]
    );
  }

  // Insert WhatsApp Logs
  const logsSeed = [
    {
      id: 'log1',
      patientId: 'p1',
      patientName: 'Aarav Mehta',
      phone: '+91 98234 56789',
      message: 'Hello *Aarav Mehta*,\n\nYour appointment at *Apex Dental & Skin Care* has been successfully scheduled! 🎉\n\n📅 *Date:* 2026-05-24\n⏰ *Time:* 10:30 AM\n👨‍⚕️ *Doctor:* Dr. Aditya Verma\n\nNeed to reschedule? Reply to this message directly. See you soon!',
      triggerEvent: 'APPOINTMENT_CREATED',
      status: 'Read',
      timestamp: '2026-05-17T11:31:12Z',
      type: 'outbound'
    },
    {
      id: 'log2',
      patientId: 'p1',
      patientName: 'Aarav Mehta',
      phone: '+91 98234 56789',
      message: 'Hi *Aarav Mehta*,\n\nThis is a friendly reminder for your upcoming appointment today at *Apex Dental & Skin Care*:\n\n⏰ *Time:* 10:30 AM\n👨‍⚕️ *Doctor:* Dr. Aditya Verma\n\nPlease try to arrive 10 minutes prior to your slot. See you soon! 😊',
      triggerEvent: 'APPOINTMENT_REMINDER_DUE',
      status: 'Read',
      timestamp: '2026-05-24T08:30:00Z',
      type: 'outbound'
    },
    {
      id: 'log3',
      patientId: 'p1',
      patientName: 'Aarav Mehta',
      phone: '+91 98234 56789',
      message: 'Thank you, doctor, the pain is fully resolved. Will arrive on time for the obturation phase.',
      triggerEvent: 'INBOUND_REPLY',
      status: 'Received',
      timestamp: '2026-05-24T08:45:22Z',
      type: 'inbound'
    }
  ];

  for (const l of logsSeed) {
    await db.run(
      `INSERT INTO whatsapp_logs (id, patient_id, patient_name, phone, message, trigger_event, status, timestamp, type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [l.id, l.patientId, l.patientName, l.phone, l.message, l.triggerEvent, l.status, l.timestamp, l.type]
    );
  }

  console.log('SQLite Relational Database initialized and seeded successfully!');
}

// Run seeder if executed directly
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seed().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
