export const api = {
  // Local storage authentication managers
  setToken: (token) => localStorage.setItem('clinicos_token', token),
  getToken: () => localStorage.getItem('clinicos_token'),
  clearToken: () => localStorage.removeItem('clinicos_token'),
  
  setUser: (user) => localStorage.setItem('clinicos_user', JSON.stringify(user)),
  getUser: () => {
    const u = localStorage.getItem('clinicos_user');
    return u ? JSON.parse(u) : null;
  },
  clearUser: () => localStorage.removeItem('clinicos_user'),

  /**
   * Safe centralized requester that automatically injects JWT Authorization headers.
   */
  request: async (url, options = {}) => {
    const token = api.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const res = await fetch(url, {
      ...options,
      headers
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Server request failed.');
    }
    
    return res.json();
  },

  // --- AUTH SERVICES ---

  signup: async (email, password, name) => {
    const data = await api.request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name })
    });
    
    if (data.token) {
      api.setToken(data.token);
      api.setUser(data.user);
    }
    return data;
  },

  login: async (email, password) => {
    const data = await api.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    if (data.token) {
      api.setToken(data.token);
      api.setUser(data.user);
    }
    return data;
  },

  logout: () => {
    api.clearToken();
    api.clearUser();
  },

  // --- PATIENTS DIRECTORY ---
  
  getPatients: async (query = '') => {
    const url = query ? `/api/patients?q=${encodeURIComponent(query)}` : '/api/patients';
    return api.request(url);
  },
  
  createPatient: async (patient) => {
    return api.request('/api/patients', {
      method: 'POST',
      body: JSON.stringify(patient)
    });
  },
  
  getPatientById: async (id) => {
    return api.request(`/api/patients/${id}`);
  },

  // --- SCHEDULER APPOINTMENTS ---

  getAppointments: async (date = '') => {
    const url = date ? `/api/appointments?date=${date}` : '/api/appointments';
    return api.request(url);
  },
  
  createAppointment: async (apt) => {
    return api.request('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(apt)
    });
  },
  
  updateAppointment: async (id, updateData) => {
    return api.request(`/api/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  },

  // --- BILLING LEDGER ---

  getBilling: async () => {
    return api.request('/api/billing');
  },
  
  payBill: async (id, paymentMethod, amount) => {
    return api.request(`/api/billing/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify({ paymentMethod, amount })
    });
  },

  // --- AUTOMATION TRIGGERS & LOGS ---

  getRules: async () => {
    return api.request('/api/automation/rules');
  },
  
  updateRule: async (id, ruleData) => {
    return api.request(`/api/automation/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(ruleData)
    });
  },
  
  getLogs: async () => {
    return api.request('/api/automation/logs');
  },
  
  simulateInbound: async (patientId, message) => {
    return api.request('/api/automation/simulate-inbound', {
      method: 'POST',
      body: JSON.stringify({ patientId, message })
    });
  },

  // --- CLINIC & DOCTOR MANAGEMENT ---

  createClinic: async (clinicData) => {
    const data = await api.request('/api/clinics', {
      method: 'POST',
      body: JSON.stringify(clinicData)
    });
    if (data.user) {
      api.setUser(data.user);
    }
    return data;
  },

  joinClinic: async (clinicId) => {
    const data = await api.request('/api/clinics/join', {
      method: 'POST',
      body: JSON.stringify({ clinicId })
    });
    if (data.user) {
      api.setUser(data.user);
    }
    return data;
  },

  getPublicClinicName: async (clinicId) => {
    const data = await api.request(`/api/clinics/public/${clinicId}`);
    return data.name;
  },

  getDoctors: async () => {
    return api.request('/api/doctors');
  },

  addDoctor: async (doctorData) => {
    return api.request('/api/staff/doctors', {
      method: 'POST',
      body: JSON.stringify(doctorData)
    });
  },

  removeDoctor: async (id) => {
    return api.request(`/api/staff/doctors/${id}`, {
      method: 'DELETE'
    });
  },

  getAdmins: async () => {
    return api.request('/api/staff/admins');
  },

  removeAdmin: async (id) => {
    return api.request(`/api/staff/admins/${id}`, {
      method: 'DELETE'
    });
  }
};
