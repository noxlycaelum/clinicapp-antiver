import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDb } from './db/db.js';
import { seed } from './db/seed.js';
import { AutomationEngine } from './services/automationEngine.js';

const app = express();
const PORT = 5000;
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

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired or invalid token.' });
    }
    req.user = user;
    next();
  });
}

// --- OPEN API ENDPOINTS (AUTH) ---

// 1. SIGNUP
app.post('/api/auth/signup', async (req, res) => {
  const { username, password, name, clinicName, clinicType } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Username, password, and name are required.' });
  }

  try {
    const db = await getDb();
    
    // Check if user exists
    const existing = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(400).json({ error: 'Username is already registered.' });
    }

    // Hash password with bcryptjs
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    const userId = 'u_' + Date.now().toString(36);

    // Insert user into SQLite
    await db.run(
      `INSERT INTO users (id, username, password_hash, name, role, clinic_name, clinic_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, username, hash, name, 'receptionist', clinicName || 'Apex Clinic', clinicType || 'General Clinic']
    );

    const userPayload = { id: userId, username, name, role: 'receptionist', clinicName, clinicType };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({ success: true, token, user: userPayload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. LOGIN
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username. Please sign up first.' });
    }

    // Compare bcrypt hashes
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    const userPayload = { 
      id: user.id, 
      username: user.username, 
      name: user.name, 
      role: user.role, 
      clinicName: user.clinic_name, 
      clinicType: user.clinic_type 
    };
    
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '24h' });

    res.json({ success: true, token, user: userPayload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- PROTECTED API ENDPOINTS (REQUIRE JWT) ---

// 3. GET PATIENTS
app.get('/api/patients', authenticateToken, async (req, res) => {
  const { q } = req.query;
  try {
    const db = await getDb();
    let patients;

    if (q) {
      const searchStr = `%${q.toLowerCase()}%`;
      patients = await db.all(
        `SELECT * FROM patients 
         WHERE LOWER(name) LIKE ? OR phone LIKE ? OR LOWER(tags) LIKE ?`,
        [searchStr, searchStr, searchStr]
      );
    } else {
      patients = await db.all('SELECT * FROM patients');
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
  try {
    const db = await getDb();
    const p = await db.get('SELECT * FROM patients WHERE id = ?', [req.params.id]);
    
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
      `INSERT INTO patients (id, name, phone, email, gender, age, tags, visit_history, follow_up_status, recall_interval_months, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, phone, email || '', gender || 'Female', parseInt(age) || 30, tagsStr, historyStr, 'none', parseInt(recallIntervalMonths) || 6, createdAt]
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
  const { date } = req.query;
  try {
    const db = await getDb();
    let query = `
      SELECT a.*, p.name as patientName, p.phone as patientPhone 
      FROM appointments a 
      JOIN patients p ON a.patient_id = p.id
    `;
    
    let appointments;
    if (date) {
      query += ` WHERE a.date = ?`;
      appointments = await db.all(query, [date]);
    } else {
      appointments = await db.all(query);
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
  const { patientId, doctorName, date, timeSlot, reason, notes } = req.body;
  if (!patientId || !date || !timeSlot) {
    return res.status(400).json({ error: 'Patient ID, date, and timeslot are required.' });
  }

  try {
    const db = await getDb();
    const id = 'a_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const createdAt = new Date().toISOString();

    await db.run(
      `INSERT INTO appointments (id, patient_id, doctor_name, date, time_slot, reason, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, patientId, doctorName || 'Dr. Aditya Verma', date, timeSlot, reason || 'Consultation', 'Confirmed', notes || '', createdAt]
    );

    // Retrieve patient phone and name
    const patient = await db.get('SELECT name, phone FROM patients WHERE id = ?', [patientId]);

    if (patient) {
      // Trigger confirmation rule
      await AutomationEngine.trigger('APPOINTMENT_CREATED', {
        patientId,
        patientName: patient.name,
        phone: patient.phone,
        date,
        time: timeSlot,
        doctorName: doctorName || 'Dr. Aditya Verma',
        reason: reason || 'Consultation'
      });
    }

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
  try {
    const db = await getDb();
    const oldApt = await db.get('SELECT * FROM appointments WHERE id = ?', [req.params.id]);

    if (!oldApt) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    const { status, timeSlot, notes } = req.body;
    
    // Perform SQLite Update
    const updatedStatus = status || oldApt.status;
    const updatedSlot = timeSlot || oldApt.time_slot;
    const updatedNotes = notes !== undefined ? notes : oldApt.notes;

    await db.run(
      `UPDATE appointments SET status = ?, time_slot = ?, notes = ? WHERE id = ?`,
      [updatedStatus, updatedSlot, updatedNotes, req.params.id]
    );

    const updated = await db.get('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
    const patient = await db.get('SELECT * FROM patients WHERE id = ?', [updated.patient_id]);

    if (patient) {
      // Transitioning status to Completed (Checkout flow)
      if (updatedStatus === 'Completed' && oldApt.status !== 'Completed') {
        const billId = 'b_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
        const billDate = new Date().toISOString().split('T')[0];
        const amount = updated.reason.toLowerCase().includes('root canal') ? 4500 : 1500;

        // Insert pending bill in SQL table
        await db.run(
          `INSERT INTO billing (id, appointment_id, patient_id, patient_name, date, treatment, amount, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [billId, updated.id, patient.id, patient.name, billDate, updated.reason, amount, 'Pending', new Date().toISOString()]
        );

        // Update Patient consult history
        const parsedHistory = patient.visit_history ? JSON.parse(patient.visit_history) : [];
        parsedHistory.push({
          date: billDate,
          reason: updated.reason,
          notes: updatedNotes || 'Routine checkup completed successfully.'
        });

        await db.run(
          `UPDATE patients SET visit_history = ?, follow_up_status = 'active' WHERE id = ?`,
          [JSON.stringify(parsedHistory), patient.id]
        );

        // Trigger checkout WhatsApp
        await AutomationEngine.trigger('VISIT_CHECKOUT', {
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
  try {
    const db = await getDb();
    const ledger = await db.all('SELECT * FROM billing ORDER BY created_at DESC');
    
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
  const { paymentMethod, amount } = req.body;
  try {
    const db = await getDb();
    const bill = await db.get('SELECT * FROM billing WHERE id = ?', [req.params.id]);

    if (!bill) {
      return res.status(404).json({ error: 'Invoice billing details not found.' });
    }

    const receiptNo = 'APEX-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
    const finalAmount = parseFloat(amount) || bill.amount;

    await db.run(
      `UPDATE billing SET status = 'Paid', payment_method = ?, receipt_no = ?, amount = ? WHERE id = ?`,
      [paymentMethod || 'Cash', receiptNo, finalAmount, req.params.id]
    );

    const updatedBill = await db.get('SELECT * FROM billing WHERE id = ?', [req.params.id]);
    const patient = await db.get('SELECT * FROM patients WHERE id = ?', [bill.patient_id]);

    if (patient) {
      // Trigger receipt WhatsApp notification
      await AutomationEngine.trigger('PAYMENT_RECEIVED', {
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
  try {
    const db = await getDb();
    const workflows = await db.all('SELECT * FROM workflows');
    
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
  const { templateText, isActive } = req.body;
  try {
    const db = await getDb();
    const rule = await db.get('SELECT * FROM workflows WHERE id = ?', [req.params.id]);

    if (!rule) {
      return res.status(404).json({ error: 'Automation trigger workflow not found.' });
    }

    const updatedText = templateText !== undefined ? templateText : rule.template_text;
    
    let updatedActive = rule.is_active;
    if (isActive !== undefined) {
      updatedActive = isActive ? 1 : 0;
    }

    await db.run(
      `UPDATE workflows SET template_text = ?, is_active = ? WHERE id = ?`,
      [updatedText, updatedActive, req.params.id]
    );

    const updated = await db.get('SELECT * FROM workflows WHERE id = ?', [req.params.id]);
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
  try {
    const db = await getDb();
    const logs = await db.all('SELECT * FROM whatsapp_logs ORDER BY timestamp ASC');
    
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
  const { patientId, message } = req.body;
  if (!patientId || !message) {
    return res.status(400).json({ error: 'Patient ID and message text are required.' });
  }

  try {
    const db = await getDb();
    const patient = await db.get('SELECT name, phone FROM patients WHERE id = ?', [patientId]);

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    const logId = 'log_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const timestamp = new Date().toISOString();

    // Insert inbound message into logs
    await db.run(
      `INSERT INTO whatsapp_logs (id, patient_id, patient_name, phone, message, trigger_event, status, timestamp, type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [logId, patientId, patient.name, patient.phone, message, 'INBOUND_REPLY', 'Received', timestamp, 'inbound']
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

app.listen(PORT, () => {
  console.log(`ClinicOS Relational & Secure API Server listening at http://localhost:${PORT}`);
});
