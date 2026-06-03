import { getDb } from '../db/db.js';

export class AutomationEngine {
  /**
   * Triggers an automation workflow based on an event.
   * Reads from the SQLite workflows table and inserts logs.
   * @param {string} triggerEvent - The event code (e.g. 'APPOINTMENT_CREATED')
   * @param {object} payload - Data dictionary to fill the template variables
   */
  static async trigger(triggerEvent, payload) {
    try {
      const db = await getDb();
      
      // Query active workflows for this event
      const rules = await db.all(
        'SELECT * FROM workflows WHERE trigger_event = ? AND is_active = 1',
        [triggerEvent]
      );

      if (rules.length === 0) {
        console.log(`No active SQLite workflow rules found for event: ${triggerEvent}`);
        return;
      }

      for (const rule of rules) {
        let messageText = rule.template_text;
        
        // Render variables
        const variables = {
          patientName: payload.patientName || 'Patient',
          clinicName: payload.clinicName || 'Apex Dental & Skin Care',
          date: payload.date || new Date().toLocaleDateString('en-IN'),
          time: payload.time || 'N/A',
          doctorName: payload.doctorName || 'Dr. Aditya Verma',
          reason: payload.reason || 'General consultation',
          amount: payload.amount || '0',
          receiptNo: payload.receiptNo || 'N/A',
          treatment: payload.treatment || 'Check-up',
          ...payload
        };

        Object.entries(variables).forEach(([key, val]) => {
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
          messageText = messageText.replace(regex, val);
        });

        // Autogenerate unique ID
        const logId = 'log_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
        const timestamp = new Date().toISOString();

        // Insert log into SQLite
        await db.run(
          `INSERT INTO whatsapp_logs (id, patient_id, patient_name, phone, message, trigger_event, status, timestamp, type)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            logId,
            payload.patientId || null,
            variables.patientName,
            payload.phone || '+91 99999 99999',
            messageText,
            triggerEvent,
            'Sent',
            timestamp,
            'outbound'
          ]
        );
        
        console.log(`[SQL WhatsApp Simulator] Sent: "${rule.name}" to ${variables.patientName}`);

        // Kick off delivery status updates in the background
        AutomationEngine.simulateStatusDelivery(logId);
      }
    } catch (err) {
      console.error('Error in SQLite automation engine:', err);
    }
  }

  /**
   * Updates delivery checks in SQLite
   * Sent -> Delivered (1s) -> Read (3s)
   */
  static simulateStatusDelivery(logId) {
    setTimeout(async () => {
      try {
        const db = await getDb();
        const log = await db.get('SELECT status FROM whatsapp_logs WHERE id = ?', [logId]);
        
        if (log && log.status === 'Sent') {
          await db.run('UPDATE whatsapp_logs SET status = ? WHERE id = ?', ['Delivered', logId]);
          
          setTimeout(async () => {
            try {
              const logRead = await db.get('SELECT status FROM whatsapp_logs WHERE id = ?', [logId]);
              if (logRead && logRead.status === 'Delivered') {
                await db.run('UPDATE whatsapp_logs SET status = ? WHERE id = ?', ['Read', logId]);
              }
            } catch (err) {
              console.error('Error simulating Read in SQL:', err);
            }
          }, 2500);
        }
      } catch (err) {
        console.error('Error simulating Delivered in SQL:', err);
      }
    }, 1000);
  }
}
