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
      
      if (!payload.clinicId) {
        console.warn(`[SQL Automation Engine] Cannot trigger event ${triggerEvent}: clinicId is missing in payload.`);
        return;
      }

      // Query active workflows for this event and clinic
      const rules = await db.all(
        'SELECT * FROM workflows WHERE trigger_event = ? AND is_active = 1 AND clinic_id = ?',
        [triggerEvent, payload.clinicId]
      );

      if (rules.length === 0) {
        console.log(`No active SQLite workflow rules found for event: ${triggerEvent} in clinic ${payload.clinicId}`);
        return;
      }

      // Look up clinic name if not provided
      let dbClinicName = payload.clinicName;
      if (!dbClinicName) {
        const clinic = await db.get('SELECT name FROM clinics WHERE id = ?', [payload.clinicId]);
        if (clinic) {
          dbClinicName = clinic.name;
        }
      }

      for (const rule of rules) {
        let messageText = rule.template_text;
        
        // Render variables
        const variables = {
          patientName: payload.patientName || 'Patient',
          clinicName: dbClinicName || 'Apex Dental & Skin Care',
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

        // Meta Graph API Integration
        const token = process.env.WHATSAPP_TOKEN;
        const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        let initialStatus = 'Sent';

        if (token && phoneId) {
          // Sanitise phone number: remove all non-digit characters
          const cleanedPhone = (payload.phone || '').replace(/\D/g, '');
          
          if (cleanedPhone) {
            try {
              console.log(`[WhatsApp Engine] Dispatching real WhatsApp message via Meta Graph API to ${cleanedPhone}...`);
              const response = await fetch(
                `https://graph.facebook.com/v20.0/${phoneId}/messages`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: cleanedPhone,
                    type: 'text',
                    text: {
                      preview_url: false,
                      body: messageText
                    }
                  })
                }
              );

              if (response.ok) {
                const resData = await response.json();
                console.log(`[WhatsApp Engine] Meta API Success response:`, resData);
              } else {
                const resErr = await response.json();
                console.error(`[WhatsApp Engine] Meta API Error status ${response.status}:`, resErr);
                initialStatus = 'Failed';
              }
            } catch (fetchErr) {
              console.error(`[WhatsApp Engine] Failed to dispatch via Meta API:`, fetchErr);
              initialStatus = 'Failed';
            }
          } else {
            console.warn(`[WhatsApp Engine] Recipient phone number is empty. Cannot dispatch to Meta API.`);
            initialStatus = 'Failed';
          }
        } else {
          console.log(`[WhatsApp Engine] Meta Graph API credentials not configured. Simulating delivery locally.`);
        }

        // Insert log into SQLite
        await db.run(
          `INSERT INTO whatsapp_logs (id, patient_id, patient_name, phone, message, trigger_event, status, timestamp, type, clinic_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            logId,
            payload.patientId || null,
            variables.patientName,
            payload.phone || '+91 99999 99999',
            messageText,
            triggerEvent,
            initialStatus,
            timestamp,
            'outbound',
            payload.clinicId
          ]
        );
        
        console.log(`[SQL WhatsApp Engine] Logged message status: "${initialStatus}" for rule: "${rule.name}" to ${variables.patientName}`);

        if (initialStatus === 'Sent') {
          // Kick off delivery status updates in the background
          AutomationEngine.simulateStatusDelivery(logId);
        }
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
