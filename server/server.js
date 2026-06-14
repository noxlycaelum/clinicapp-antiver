import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './db/db.js';
import { seed } from './db/seed.js';
import { AutomationEngine } from './services/automationEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'clinicos_secure_jwt_secret_9876543210';

app.use(cors());
app.use(express.json());

// Bootstrapping: initialize SQL database and seed default values
async function bootstrap() {
  const db = await getDb();
  await seed();
}

bootstrap().then(() => {
  console.log('SQL Database initialized successfully.');
}).catch(err => {
  console.error('Failed to initialize SQLite database:', err);
});

// --- JWT AUTHENTICATION MIDDLEWARE ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <TOKEN>
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired or invalid token.' });
    }
    
    try {
      const db = await getDb();
      // Fetch full user record joining with clinic name
      const user = await db.get(
        `SELECT u.*, c.name as clinic_name 
         FROM users u 
         LEFT JOIN clinics c ON u.clinic_id = c.id 
         WHERE u.id = ?`,
        [decoded.id]
      );

      if (!user) {
        return res.status(404).json({ error: 'Authenticated user not found.' });
      }

      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        clinicId: user.clinic_id,
        clinicName: user.clinic_name
      };
      next();
    } catch (dbErr) {
      res.status(500).json({ error: dbErr.message });
    }
  });
}

// --- OPEN API ENDPOINTS (AUTH) ---

// 1. SIGNUP
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required.' });
  }

  try {
    const db = await getDb();
    
    // Check if user exists
    const existing = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ error: 'Email address is already registered.' });
    }

    // Hash password with bcryptjs
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    const userId = 'u_' + Date.now().toString(36);

    // Insert user into SQLite (with no clinic associated initially)
    await db.run(
      `INSERT INTO users (id, email, password_hash, name, role, clinic_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, email, hash, name, 'admin', null]
    );

    const userPayload = { id: userId, email, name, role: 'admin', clinicId: null, clinicName: null };
    const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({ success: true, token, user: userPayload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. LOGIN
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const db = await getDb();
    const user = await db.get(
      `SELECT u.*, c.name as clinic_name 
       FROM users u 
       LEFT JOIN clinics c ON u.clinic_id = c.id 
       WHERE u.email = ?`,
      [email]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid email address. Please sign up first.' });
    }

    // Compare bcrypt hashes
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    const userPayload = { 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      role: user.role, 
      clinicId: user.clinic_id, 
      clinicName: user.clinic_name
    };
    
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    res.json({ success: true, token, user: userPayload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Public endpoint to resolve clinic name by ID (for invites)
app.get('/api/clinics/public/:id', async (req, res) => {
  try {
    const db = await getDb();
    const clinic = await db.get('SELECT name FROM clinics WHERE id = ?', [req.params.id]);
    if (!clinic) {
      return res.status(404).json({ error: 'Clinic not found.' });
    }
    res.json({ name: clinic.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- PROTECTED API ENDPOINTS (REQUIRE JWT) ---

// Create Clinic Endpoint
app.post('/api/clinics', authenticateToken, async (req, res) => {
  const { name, gstin, address, phone, patient, doctor } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Clinic name is required.' });
  }

  if (req.user.clinicId) {
    return res.status(400).json({ error: 'User is already associated with a clinic.' });
  }

  try {
    const db = await getDb();
    const clinicId = 'c_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);

    // 1. Insert Clinic
    await db.run(
      `INSERT INTO clinics (id, name, gstin, address, phone) VALUES (?, ?, ?, ?, ?)`,
      [clinicId, name, gstin || '', address || '', phone || '']
    );

    // 2. Associate current user with this clinic
    await db.run(`UPDATE users SET clinic_id = ? WHERE id = ?`, [clinicId, req.user.id]);

    // 3. Insert Initial Doctor details (if provided)
    if (doctor && doctor.name) {
      const doctorId = 'd_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
      await db.run(
        `INSERT INTO doctors (id, name, specialty, phone, clinic_id) VALUES (?, ?, ?, ?, ?)`,
        [doctorId, doctor.name, doctor.specialty || 'General Practitioner', doctor.phone || '', clinicId]
      );
    }

    // 4. Insert Initial Patient details (if provided)
    if (patient && patient.name && patient.phone) {
      const patientId = 'p_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
      const createdAt = new Date().toISOString();
      await db.run(
        `INSERT INTO patients (id, name, phone, email, gender, age, tags, visit_history, follow_up_status, recall_interval_months, created_at, clinic_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          patientId,
          patient.name,
          patient.phone,
          patient.email || '',
          patient.gender || 'Female',
          parseInt(patient.age) || 30,
          JSON.stringify(['New Patient']),
          '[]',
          'none',
          6,
          createdAt,
          clinicId
        ]
      );
    }

    // 5. Seed default workflows for this clinic
    const defaultWorkflows = [
      {
        id: 'wf_booking_' + clinicId,
        name: 'Booking Confirmation',
        triggerEvent: 'APPOINTMENT_CREATED',
        delayMinutes: 0,
        templateText: 'Hello *{{patientName}}*,\n\nYour appointment at *{{clinicName}}* has been successfully scheduled! 🎉\n\n📅 *Date:* {{date}}\n⏰ *Time:* {{time}}\n👨‍⚕️ *Doctor:* {{doctorName}}\n📝 *Reason:* {{reason}}\n\nNeed to reschedule? Reply to this message directly. See you soon!',
        category: 'instant'
      },
      {
        id: 'wf_reminder_' + clinicId,
        name: 'Pre-Visit Reminder',
        triggerEvent: 'APPOINTMENT_REMINDER_DUE',
        delayMinutes: 120,
        templateText: 'Hi *{{patientName}}*,\n\nThis is a friendly reminder for your upcoming appointment today at *{{clinicName}}*:\n\n⏰ *Time:* {{time}}\n👨‍⚕️ *Doctor:* {{doctorName}}\n\nPlease try to arrive 10 minutes prior to your slot. See you soon! 😊',
        category: 'scheduled'
      },
      {
        id: 'wf_checkout_' + clinicId,
        name: 'Post-Visit Follow-up',
        triggerEvent: 'VISIT_CHECKOUT',
        delayMinutes: 60,
        templateText: 'Dear *{{patientName}}*,\n\nThank you for visiting *{{clinicName}}* today. We hope you had a comfortable experience! ❤️\n\n💊 *Follow-up Advice:* Keep the area clean and follow the doctor\'s prescription.\n📞 *Support:* For any emergency discomfort, call us directly at 98765-XXXXX.\n📅 We have marked a tentative follow-up review for you. We will confirm the slot shortly.',
        category: 'instant'
      },
      {
        id: 'wf_payment_' + clinicId,
        name: 'Payment Received',
        triggerEvent: 'PAYMENT_RECEIVED',
        delayMinutes: 0,
        templateText: 'Dear *{{patientName}}*,\n\nThank you! We have received your payment of *₹{{amount}}* for *{{treatment}}* at *{{clinicName}}*.\n\n📄 *Receipt Status:* Mark Paid\n🧾 *Receipt No:* {{receiptNo}}\n\nHave a great day!',
        category: 'instant'
      },
      {
        id: 'wf_recall_' + clinicId,
        name: 'Re-engagement Campaign',
        triggerEvent: 'RECALL_DUE',
        delayMinutes: 0,
        templateText: 'Hello *{{patientName}}*,\n\nIt has been a while since your last check-up at *{{clinicName}}*! 🩺\n\nRegular dental & skin reviews help prevent larger issues down the line. We are offering a complimentary consultation check-up this week for our returning patients!\n\nWould you like us to block a slot for you this Saturday? Reply \'YES\' to book! 🌟',
        category: 'campaign'
      }
    ];

    for (const wf of defaultWorkflows) {
      await db.run(
        `INSERT INTO workflows (id, name, trigger_event, delay_minutes, template_text, is_active, category, clinic_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [wf.id, wf.name, wf.triggerEvent, wf.delayMinutes, wf.templateText, 1, wf.category, clinicId]
      );
    }

    // Fetch updated user payload
    const updatedUser = await db.get(
      `SELECT u.*, c.name as clinic_name 
       FROM users u 
       JOIN clinics c ON u.clinic_id = c.id 
       WHERE u.id = ?`,
      [req.user.id]
    );

    const userPayload = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      clinicId: updatedUser.clinic_id,
      clinicName: updatedUser.clinic_name
    };

    res.status(201).json({ success: true, user: userPayload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Join Clinic Endpoint
app.post('/api/clinics/join', authenticateToken, async (req, res) => {
  const { clinicId } = req.body;
  if (!clinicId) {
    return res.status(400).json({ error: 'Clinic ID is required.' });
  }

  if (req.user.clinicId) {
    return res.status(400).json({ error: 'User is already associated with a clinic.' });
  }

  try {
    const db = await getDb();
    
    // Check if clinic exists
    const clinic = await db.get('SELECT * FROM clinics WHERE id = ?', [clinicId]);
    if (!clinic) {
      return res.status(404).json({ error: 'The invited clinic does not exist.' });
    }

    // Update user
    await db.run(`UPDATE users SET clinic_id = ? WHERE id = ?`, [clinicId, req.user.id]);

    // Fetch updated user details
    const updatedUser = await db.get(
      `SELECT u.*, c.name as clinic_name 
       FROM users u 
       JOIN clinics c ON u.clinic_id = c.id 
       WHERE u.id = ?`,
      [req.user.id]
    );

    const userPayload = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      clinicId: updatedUser.clinic_id,
      clinicName: updatedUser.clinic_name
    };

    res.json({ success: true, user: userPayload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get doctors Endpoint
app.get('/api/doctors', authenticateToken, async (req, res) => {
  if (!req.user.clinicId) {
    return res.status(400).json({ error: 'Clinic context required.' });
  }

  try {
    const db = await getDb();
    const doctors = await db.all('SELECT * FROM doctors WHERE clinic_id = ?', [req.user.clinicId]);
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Staff Management Endpoints

// 1. GET ADMINS/STAFF
app.get('/api/staff/admins', authenticateToken, async (req, res) => {
  if (!req.user.clinicId) {
    return res.status(400).json({ error: 'Clinic context required.' });
  }

  try {
    const db = await getDb();
    const admins = await db.all(
      'SELECT id, email, name, role FROM users WHERE clinic_id = ?',
      [req.user.clinicId]
    );
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. DISASSOCIATE ADMIN FROM CLINIC
app.delete('/api/staff/admins/:id', authenticateToken, async (req, res) => {
  if (!req.user.clinicId) {
    return res.status(400).json({ error: 'Clinic context required.' });
  }

  const { id } = req.params;
  if (id === req.user.id) {
    return res.status(400).json({ error: 'Self-removal from the clinic is not permitted.' });
  }

  try {
    const db = await getDb();
    
    // Check if target admin exists and belongs to the same clinic
    const targetAdmin = await db.get('SELECT clinic_id FROM users WHERE id = ?', [id]);
    if (!targetAdmin) {
      return res.status(404).json({ error: 'Administrator not found.' });
    }
    if (targetAdmin.clinic_id !== req.user.clinicId) {
      return res.status(403).json({ error: 'You do not have permission to remove this administrator.' });
    }

    await db.run('UPDATE users SET clinic_id = NULL WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. CREATE DOCTOR
app.post('/api/staff/doctors', authenticateToken, async (req, res) => {
  if (!req.user.clinicId) {
    return res.status(400).json({ error: 'Clinic context required.' });
  }

  const { name, specialty, phone } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Doctor name is required.' });
  }

  try {
    const db = await getDb();
    const doctorId = 'd_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    
    await db.run(
      `INSERT INTO doctors (id, name, specialty, phone, clinic_id) VALUES (?, ?, ?, ?, ?)`,
      [doctorId, name, specialty || 'General Practitioner', phone || '', req.user.clinicId]
    );

    const newDoctor = {
      id: doctorId,
      name,
      specialty: specialty || 'General Practitioner',
      phone: phone || '',
      clinic_id: req.user.clinicId
    };

    res.status(201).json(newDoctor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. DELETE DOCTOR
app.delete('/api/staff/doctors/:id', authenticateToken, async (req, res) => {
  if (!req.user.clinicId) {
    return res.status(400).json({ error: 'Clinic context required.' });
  }

  const { id } = req.params;

  try {
    const db = await getDb();
    
    // Check if target doctor exists and belongs to the same clinic
    const targetDoctor = await db.get('SELECT clinic_id FROM doctors WHERE id = ?', [id]);
    if (!targetDoctor) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }
    if (targetDoctor.clinic_id !== req.user.clinicId) {
      return res.status(403).json({ error: 'You do not have permission to remove this doctor.' });
    }

    await db.run('DELETE FROM doctors WHERE id = ? AND clinic_id = ?', [id, req.user.clinicId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GET PATIENTS
app.get('/api/patients', authenticateToken, async (req, res) => {
  if (!req.user.clinicId) {
    return res.status(400).json({ error: 'Clinic context required. Please create or join a clinic.' });
  }

  const { q } = req.query;
  try {
    const db = await getDb();
    let patients;

    if (q) {
      const searchStr = `%${q.toLowerCase()}%`;
      patients = await db.all(
        `SELECT * FROM patients 
         WHERE clinic_id = ? AND (LOWER(name) LIKE ? OR phone LIKE ? OR LOWER(tags) LIKE ?)`,
        [req.user.clinicId, searchStr, searchStr, searchStr]
      );
    } else {
      patients = await db.all('SELECT * FROM patients WHERE clinic_id = ?', [req.user.clinicId]);
    }

    // Deserialize JSON fields (tags and visit history)
    const processed = patients.map(p => ({
      ...p,
      tags: p.tags ? JSON.parse(p.tags) : [],
      visitHistory: p.visit_history ? JSON.parse(p.visit_history) : [],
      recallIntervalMonths: p.recall_interval_months,
      followUpStatus: p.follow_up_status,
      createdAt: p.created_at
    }));

    res.json(processed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. GET PATIENT BY ID
app.get('/api/patients/:id', authenticateToken, async (req, res) => {
  if (!req.user.clinicId) {
    return res.status(400).json({ error: 'Clinic context required.' });
  }

  try {
    const db = await getDb();
    const p = await db.get('SELECT * FROM patients WHERE id = ? AND clinic_id = ?', [req.params.id, req.user.clinicId]);
    
    if (!p) return res.status(404).json({ error: 'Patient profile not found.' });

    const processed = {
      ...p,
      tags: p.tags ? JSON.parse(p.tags) : [],
      visitHistory: p.visit_history ? JSON.parse(p.visit_history) : [],
      recallIntervalMonths: p.recall_interval_months,
      followUpStatus: p.follow_up_status,
      createdAt: p.created_at
    };

    res.json(processed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. CREATE PATIENT
app.post('/api/patients', authenticateToken, async (req, res) => {
  if (!req.user.clinicId) {
    return res.status(400).json({ error: 'Clinic context required.' });
  }

  const { name, phone, email, gender, age, tags, recallIntervalMonths } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required.' });
  }

  try {
    const db = await getDb();
    const id = 'p_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const createdAt = new Date().toISOString();
    
    const tagsStr = JSON.stringify(tags || ['New Patient']);
    const historyStr = '[]';

    await db.run(
      `INSERT INTO patients (id, name, phone, email, gender, age, tags, visit_history, follow_up_status, recall_interval_months, created_at, clinic_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, phone, email || '', gender || 'Female', parseInt(age) || 30, tagsStr, historyStr, 'none', parseInt(recallIntervalMonths) || 6, createdAt, req.user.clinicId]
    );

    const inserted = {
      id, name, phone, email, gender, age, tags: tags || ['New Patient'], visitHistory: [], followUpStatus: 'none', recallIntervalMonths, createdAt
    };

    res.status(201).json(inserted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. GET APPOINTMENTS
app.get('/api/appointments', authenticateToken, async (req, res) => {
  if (!req.user.clinicId) {
    return res.status(400).json({ error: 'Clinic context required.' });
  }

  const { date } = req.query;
  try {
    const db = await getDb();
    let query = `
      SELECT a.*, p.name as patientName, p.phone as patientPhone 
      FROM appointments a 
      JOIN patients p ON a.patient_id = p.id
      WHERE a.clinic_id = ?
    `;
    
    let appointments;
    if (date) {
      query += ` AND a.date = ?`;
      appointments = await db.all(query, [req.user.clinicId, date]);
    } else {
      appointments = await db.all(query, [req.user.clinicId]);
    }

    const processed = appointments.map(apt => ({
      ...apt,
      patientId: apt.patient_id,
      doctorName: apt.doctor_name,
      timeSlot: apt.time_slot,
      createdAt: apt.created_at
    }));

    res.json(processed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. CREATE APPOINTMENT & TRIGGER WHATSAPP CONFIRMATION
app.post('/api/appointments', authenticateToken, async (req, res) => {
  if (!req.user.clinicId) {
    return res.status(400).json({ error: 'Clinic context required.' });
  }

  const { patientId, doctorName, date, timeSlot, reason, notes } = req.body;
  if (!patientId || !date || !timeSlot) {
    return res.status(400).json({ error: 'Patient ID, date, and timeslot are required.' });
  }

  try {
    const db = await getDb();

    // Verify patient belongs to user's clinic
    const patient = await db.get('SELECT name, phone FROM patients WHERE id = ? AND clinic_id = ?', [patientId, req.user.clinicId]);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found in your clinic.' });
    }

    const id = 'a_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const createdAt = new Date().toISOString();

    await db.run(
      `INSERT INTO appointments (id, patient_id, doctor_name, date, time_slot, reason, status, notes, created_at, clinic_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, patientId, doctorName || 'Dr. Aditya Verma', date, timeSlot, reason || 'Consultation', 'Confirmed', notes || '', createdAt, req.user.clinicId]
    );

    // Trigger confirmation rule
    await AutomationEngine.trigger('APPOINTMENT_CREATED', {
      clinicId: req.user.clinicId,
      patientId,
      patientName: patient.name,
      phone: patient.phone,
      date,
      time: timeSlot,
      doctorName: doctorName || 'Dr. Aditya Verma',
      reason: reason || 'Consultation'
    });

    const inserted = {
      id, patientId, doctorName, date, timeSlot, reason, status: 'Confirmed', notes, createdAt
    };

    res.status(201).json(inserted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. UPDATE APPOINTMENT (Completing Checkout & Rescheduling SQL operations)
app.put('/api/appointments/:id', authenticateToken, async (req, res) => {
  if (!req.user.clinicId) {
    return res.status(400).json({ error: 'Clinic context required.' });
  }

  try {
    const db = await getDb();
    const oldApt = await db.get('SELECT * FROM appointments WHERE id = ? AND clinic_id = ?', [req.params.id, req.user.clinicId]);

    if (!oldApt) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    const { status, timeSlot, notes } = req.body;
    
    // Perform SQLite Update
    const updatedStatus = status || oldApt.status;
    const updatedSlot = timeSlot || oldApt.time_slot;
    const updatedNotes = notes !== undefined ? notes : oldApt.notes;

    await db.run(
      `UPDATE appointments SET status = ?, time_slot = ?, notes = ? WHERE id = ? AND clinic_id = ?`,
      [updatedStatus, updatedSlot, updatedNotes, req.params.id, req.user.clinicId]
    );

    const updated = await db.get('SELECT * FROM appointments WHERE id = ? AND clinic_id = ?', [req.params.id, req.user.clinicId]);
    const patient = await db.get('SELECT * FROM patients WHERE id = ? AND clinic_id = ?', [updated.patient_id, req.user.clinicId]);

    if (patient) {
      // Transitioning status to Completed (Checkout flow)
      if (updatedStatus === 'Completed' && oldApt.status !== 'Completed') {
        const billId = 'b_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
        const billDate = new Date().toISOString().split('T')[0];
        const amount = updated.reason.toLowerCase().includes('root canal') ? 4500 : 1500;

        // Insert pending bill in SQL table
        await db.run(
          `INSERT INTO billing (id, appointment_id, patient_id, patient_name, date, treatment, amount, status, created_at, clinic_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [billId, updated.id, patient.id, patient.name, billDate, updated.reason, amount, 'Pending', new Date().toISOString(), req.user.clinicId]
        );

        // Update Patient consult history
        const parsedHistory = patient.visit_history ? JSON.parse(patient.visit_history) : [];
        parsedHistory.push({
          date: billDate,
          reason: updated.reason,
          notes: updatedNotes || 'Routine checkup completed successfully.'
        });

        await db.run(
          `UPDATE patients SET visit_history = ?, follow_up_status = 'active' WHERE id = ? AND clinic_id = ?`,
          [JSON.stringify(parsedHistory), patient.id, req.user.clinicId]
        );

        // Trigger checkout WhatsApp
        await AutomationEngine.trigger('VISIT_CHECKOUT', {
          clinicId: req.user.clinicId,
          patientId: patient.id,
          patientName: patient.name,
          phone: patient.phone,
          date: updated.date,
          time: updated.time_slot,
          doctorName: updated.doctor_name,
          reason: updated.reason
        });
      }

      // Reschedule Trigger
      if (timeSlot && timeSlot !== oldApt.time_slot) {
        await AutomationEngine.trigger('APPOINTMENT_CREATED', {
          clinicId: req.user.clinicId,
          patientId: patient.id,
          patientName: patient.name,
          phone: patient.phone,
          date: updated.date,
          time: updated.time_slot,
          doctorName: updated.doctor_name,
          reason: updated.reason + ' (RESCHEDULED)'
        });
      }
    }

    res.json({
      ...updated,
      patientId: updated.patient_id,
      doctorName: updated.doctor_name,
      timeSlot: updated.time_slot,
      createdAt: updated.created_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. GET BILLING
app.get('/api/billing', authenticateToken, async (req, res) => {
  if (!req.user.clinicId) {
    return res.status(400).json({ error: 'Clinic context required.' });
  }

  try {
    const db = await getDb();
    const ledger = await db.all('SELECT * FROM billing WHERE clinic_id = ? ORDER BY created_at DESC', [req.user.clinicId]);
    
    const processed = ledger.map(b => ({
      ...b,
      appointmentId: b.appointment_id,
      patientId: b.patient_id,
      patientName: b.patient_name,
      paymentMethod: b.payment_method,
      receiptNo: b.receipt_no,
      createdAt: b.created_at
    }));

    res.json(processed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. RECORD PAYMENTS & GENERATE RECEIPT ALERTS
app.post('/api/billing/:id/pay', authenticateToken, async (req, res) => {
  if (!req.user.clinicId) {
    return res.status(400).json({ error: 'Clinic context required.' });
  }

  const { paymentMethod, amount } = req.body;
  try {
    const db = await getDb();
    const bill = await db.get('SELECT * FROM billing WHERE id = ? AND clinic_id = ?', [req.params.id, req.user.clinicId]);

    if (!bill) {
      return res.status(404).json({ error: 'Invoice billing details not found.' });
    }

    const receiptNo = 'APEX-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
    const finalAmount = parseFloat(amount) || bill.amount;

    await db.run(
      `UPDATE billing SET status = 'Paid', payment_method = ?, receipt_no = ?, amount = ? WHERE id = ? AND clinic_id = ?`,
      [paymentMethod || 'Cash', receiptNo, finalAmount, req.params.id, req.user.clinicId]
    );

    const updatedBill = await db.get('SELECT * FROM billing WHERE id = ? AND clinic_id = ?', [req.params.id, req.user.clinicId]);
    const patient = await db.get('SELECT * FROM patients WHERE id = ? AND clinic_id = ?', [bill.patient_id, req.user.clinicId]);

    if (patient) {
      // Trigger receipt WhatsApp notification
      await AutomationEngine.trigger('PAYMENT_RECEIVED', {
        clinicId: req.user.clinicId,
        patientId: patient.id,
        patientName: patient.name,
        phone: patient.phone,
        amount: finalAmount,
        treatment: updatedBill.treatment,
        receiptNo
      });
    }

    res.json({
      ...updatedBill,
      appointmentId: updatedBill.appointment_id,
      patientId: updatedBill.patient_id,
      patientName: updatedBill.patient_name,
      paymentMethod: updatedBill.payment_method,
      receiptNo: updatedBill.receipt_no,
      createdAt: updatedBill.created_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. GET AUTOMATION RULES
app.get('/api/automation/rules', authenticateToken, async (req, res) => {
  if (!req.user.clinicId) {
    return res.status(400).json({ error: 'Clinic context required.' });
  }

  try {
    const db = await getDb();
    const workflows = await db.all('SELECT * FROM workflows WHERE clinic_id = ?', [req.user.clinicId]);
    
    // Map SQLite boolean integers back to React boolean attributes
    const processed = workflows.map(wf => ({
      id: wf.id,
      name: wf.name,
      triggerEvent: wf.trigger_event,
      delayMinutes: wf.delay_minutes,
      templateText: wf.template_text,
      isActive: wf.is_active === 1,
      category: wf.category
    }));

    res.json(processed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. UPDATE WORKFLOW TEMPLATES
app.put('/api/automation/rules/:id', authenticateToken, async (req, res) => {
  if (!req.user.clinicId) {
    return res.status(400).json({ error: 'Clinic context required.' });
  }

  const { templateText, isActive } = req.body;
  try {
    const db = await getDb();
    const rule = await db.get('SELECT * FROM workflows WHERE id = ? AND clinic_id = ?', [req.params.id, req.user.clinicId]);

    if (!rule) {
      return res.status(404).json({ error: 'Automation trigger workflow not found.' });
    }

    const updatedText = templateText !== undefined ? templateText : rule.template_text;
    
    let updatedActive = rule.is_active;
    if (isActive !== undefined) {
      updatedActive = isActive ? 1 : 0;
    }

    await db.run(
      `UPDATE workflows SET template_text = ?, is_active = ? WHERE id = ? AND clinic_id = ?`,
      [updatedText, updatedActive, req.params.id, req.user.clinicId]
    );

    const updated = await db.get('SELECT * FROM workflows WHERE id = ? AND clinic_id = ?', [req.params.id, req.user.clinicId]);
    res.json({
      id: updated.id,
      name: updated.name,
      triggerEvent: updated.trigger_event,
      delayMinutes: updated.delay_minutes,
      templateText: updated.template_text,
      isActive: updated.is_active === 1,
      category: updated.category
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 13. GET DISPATCHED MESSAGES (Simulated logs)
app.get('/api/automation/logs', authenticateToken, async (req, res) => {
  if (!req.user.clinicId) {
    return res.status(400).json({ error: 'Clinic context required.' });
  }

  try {
    const db = await getDb();
    const logs = await db.all('SELECT * FROM whatsapp_logs WHERE clinic_id = ? ORDER BY timestamp ASC', [req.user.clinicId]);
    
    const processed = logs.map(l => ({
      id: l.id,
      patientId: l.patient_id,
      patientName: l.patient_name,
      phone: l.phone,
      message: l.message,
      triggerEvent: l.trigger_event,
      status: l.status,
      timestamp: l.timestamp,
      type: l.type
    }));

    res.json(processed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 14. SIMULATE INBOUND RESPONSES FROM PATIENTS
app.post('/api/automation/simulate-inbound', authenticateToken, async (req, res) => {
  if (!req.user.clinicId) {
    return res.status(400).json({ error: 'Clinic context required.' });
  }

  const { patientId, message } = req.body;
  if (!patientId || !message) {
    return res.status(400).json({ error: 'Patient ID and message text are required.' });
  }

  try {
    const db = await getDb();
    const patient = await db.get('SELECT name, phone FROM patients WHERE id = ? AND clinic_id = ?', [patientId, req.user.clinicId]);

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    const logId = 'log_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const timestamp = new Date().toISOString();

    // Insert inbound message into logs
    await db.run(
      `INSERT INTO whatsapp_logs (id, patient_id, patient_name, phone, message, trigger_event, status, timestamp, type, clinic_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [logId, patientId, patient.name, patient.phone, message, 'INBOUND_REPLY', 'Received', timestamp, 'inbound', req.user.clinicId]
    );

    const inserted = {
      id: logId,
      patientId,
      patientName: patient.name,
      phone: patient.phone,
      message,
      triggerEvent: 'INBOUND_REPLY',
      status: 'Received',
      timestamp,
      type: 'inbound'
    };

    res.status(201).json(inserted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`ClinicOS Relational & Secure API Server listening at http://localhost:${PORT}`);
});
