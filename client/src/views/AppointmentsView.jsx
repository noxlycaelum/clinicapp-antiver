import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Search, ChevronLeft, ChevronRight, X, UserPlus, Check, HelpCircle } from 'lucide-react';
import { api } from '../services/api';

export default function AppointmentsView({ onRefreshLogs }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modals state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  
  // Form fields
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [doctorName, setDoctorName] = useState('Dr. Aditya Verma');
  const [reason, setReason] = useState('Consultation');
  const [notes, setNotes] = useState('');
  const [newPatientForm, setNewPatientForm] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');

  // 11 Core Indian Clinic Time Slots
  const timeSlots = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM',
    '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM'
  ];

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await api.getAppointments(selectedDate);
      setAppointments(data);
      const patientsData = await api.getPatients();
      setPatients(patientsData);
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  const handlePrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next.toISOString().split('T')[0]);
  };

  const handleOpenBookModal = (slot) => {
    setSelectedSlot(slot);
    setIsBookModalOpen(true);
    setSearchQuery('');
    setSelectedPatientId('');
    setNewPatientForm(false);
    setNewPatientName('');
    setNewPatientPhone('');
    setNotes('');
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    try {
      let finalPatientId = selectedPatientId;
      
      if (newPatientForm) {
        if (!newPatientName || !newPatientPhone) {
          alert('New patient name and phone are required.');
          return;
        }
        // 1. Create patient first
        const p = await api.createPatient({
          name: newPatientName,
          phone: newPatientPhone,
          tags: ['First Visit']
        });
        finalPatientId = p.id;
      }

      if (!finalPatientId) {
        alert('Please select or create a patient.');
        return;
      }

      // 2. Create appointment
      await api.createAppointment({
        patientId: finalPatientId,
        doctorName,
        date: selectedDate,
        timeSlot: selectedSlot,
        reason,
        notes,
        status: 'Confirmed'
      });

      setIsBookModalOpen(false);
      fetchAppointments();
      if (onRefreshLogs) onRefreshLogs();
    } catch (err) {
      alert('Error creating booking: ' + err.message);
    }
  };

  const handleCancelApt = async (aptId) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.updateAppointment(aptId, { status: 'Cancelled' });
      fetchAppointments();
      if (onRefreshLogs) onRefreshLogs();
    } catch (err) {
      alert(err.message);
    }
  };

  // Filters patients in dropdown list
  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Scheduler</h1>
          <p className="text-slate-500 mt-1">Book slots, reschedule times, and audit daily patient pipelines.</p>
        </div>
        
        {/* Date Selector Navigation */}
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
          <button onClick={handlePrevDay} className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold text-slate-700 px-2 min-w-[120px] text-center">
            {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
          <button onClick={handleNextDay} className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Grid of slots */}
      {loading ? (
        <div className="flex justify-center items-center h-80">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {timeSlots.map(slot => {
            // Find if slot has active appointment
            const slotApt = appointments.find(a => a.timeSlot === slot && a.status !== 'Cancelled');
            
            return (
              <div 
                key={slot} 
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between h-44 ${
                  slotApt 
                    ? slotApt.status === 'Completed' 
                      ? 'bg-emerald-50/30 border-emerald-100'
                      : slotApt.status === 'No-Show'
                        ? 'bg-rose-50/30 border-rose-100'
                        : 'bg-teal-50/20 border-teal-100'
                    : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                {/* Upper row */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-semibold tracking-wide text-slate-500">{slot}</span>
                  </div>
                  
                  {slotApt && (
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      slotApt.status === 'Completed' 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : slotApt.status === 'No-Show'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-teal-100 text-teal-800 border border-teal-200'
                    }`}>
                      {slotApt.status}
                    </span>
                  )}
                </div>

                {/* Body row */}
                <div className="my-3">
                  {slotApt ? (
                    <div>
                      <h4 className="font-bold text-slate-800 text-base line-clamp-1">{slotApt.patientName}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {slotApt.reason} • <span className="text-slate-600">{slotApt.doctorName}</span>
                      </p>
                      {slotApt.notes && (
                        <p className="text-[11px] italic text-slate-400 mt-1 line-clamp-1">"{slotApt.notes}"</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-400 text-xs italic">
                      Slot is empty. Available for patient check-in.
                    </div>
                  )}
                </div>

                {/* Actions row */}
                <div className="flex justify-end border-t border-slate-100/60 pt-3">
                  {slotApt ? (
                    <div className="flex gap-2">
                      {slotApt.status === 'Confirmed' && (
                        <button
                          onClick={() => handleCancelApt(slotApt.id)}
                          className="px-2 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-slate-100 hover:border-rose-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenBookModal(slot)}
                      className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Book Slot
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Modal */}
      {isBookModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 transform scale-100 transition-transform">
            
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Book Appointment Slot</h3>
                <p className="text-xs text-slate-400 mt-0.5">Scheduling for {selectedSlot} on {selectedDate}</p>
              </div>
              <button 
                onClick={() => setIsBookModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateAppointment} className="p-6 space-y-4">
              
              {/* Toggle new/existing */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setNewPatientForm(false)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${!newPatientForm ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Search Database
                </button>
                <button
                  type="button"
                  onClick={() => setNewPatientForm(true)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${newPatientForm ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <span className="flex items-center justify-center gap-1">
                    <UserPlus className="w-3.5 h-3.5" /> New Patient
                  </span>
                </button>
              </div>

              {newPatientForm ? (
                // New Patient Form
                <div className="space-y-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 animate-slide-in">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Profile Create</h4>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={newPatientName}
                      onChange={(e) => setNewPatientName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">WhatsApp Mobile Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 98765 43210"
                      value={newPatientPhone}
                      onChange={(e) => setNewPatientPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-600"
                    />
                  </div>
                </div>
              ) : (
                // Search Patient Form
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Patient</label>
                  
                  {/* Searchbox input */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search patient name or mobile..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-600"
                    />
                  </div>

                  {/* Patients list box */}
                  <div className="border border-slate-100 rounded-xl max-h-36 overflow-y-auto divide-y divide-slate-50 bg-white">
                    {filteredPatients.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No patients matching criteria.
                      </div>
                    ) : (
                      filteredPatients.map(p => {
                        const isSelected = selectedPatientId === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelectedPatientId(p.id)}
                            className={`w-full p-2.5 text-left text-xs flex justify-between items-center transition-colors cursor-pointer ${
                              isSelected ? 'bg-teal-50 text-teal-800' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div>
                              <p className="font-semibold">{p.name}</p>
                              <p className="text-slate-400 text-[10px] mt-0.5">{p.phone}</p>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-teal-600" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Doctor */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assign Doctor</label>
                <select
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-600"
                >
                  <option value="Dr. Aditya Verma">Dr. Aditya Verma (MDS - Dentist)</option>
                  <option value="Dr. Pooja Sen">Dr. Pooja Sen (MD - Dermatologist)</option>
                  <option value="Dr. Hari Prasad">Dr. Hari Prasad (BPT - Physiotherapist)</option>
                </select>
              </div>

              {/* Treatment Reason */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reason for Visit</label>
                <input
                  type="text"
                  placeholder="e.g. Root Canal Phase 2, Acne Peel consultation"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Internal Notes</label>
                <textarea
                  placeholder="Provide temporary assessment details or patient requests..."
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-600 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="flex-1 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm cursor-pointer"
                >
                  Confirm Booking
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
