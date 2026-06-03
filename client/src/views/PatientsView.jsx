import React, { useState, useEffect } from 'react';
import { Users, Search, UserPlus, FileText, ChevronRight, X, Phone, Tag, Calendar, Check, MessageSquare } from 'lucide-react';
import { api } from '../services/api';

export default function PatientsView({ onRefreshLogs }) {
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Detail drawer & Create modal state
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);

  // Add Patient Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Female');
  const [recallInterval, setRecallInterval] = useState('6');
  const [tagInput, setTagInput] = useState('');

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const data = await api.getPatients(searchQuery);
      setPatients(data);
    } catch (err) {
      console.error('Failed to load patients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [searchQuery]);

  const handleAddPatientSubmit = async (e) => {
    e.preventDefault();
    if (!name || !phone) {
      alert('Name and WhatsApp phone number are required.');
      return;
    }

    try {
      // Split tags by comma
      const tags = tagInput 
        ? tagInput.split(',').map(t => t.trim()).filter(Boolean) 
        : ['New Patient'];

      await api.createPatient({
        name,
        phone,
        email,
        age: parseInt(age) || 30,
        gender,
        recallIntervalMonths: parseInt(recallInterval) || 6,
        tags
      });

      setIsAddPatientOpen(false);
      
      // Reset form fields
      setName('');
      setPhone('');
      setEmail('');
      setAge('');
      setGender('Female');
      setRecallInterval('6');
      setTagInput('');

      fetchPatients();
    } catch (err) {
      alert('Failed to save patient: ' + err.message);
    }
  };

  const handleTriggerManualOutreach = async (patient) => {
    try {
      await api.simulateInbound(patient.id, "Hello pooja, I got the follow-up reminder. Please schedule my review session.");
      alert(`Automated WhatsApp campaign triggered for ${patient.name}! Simulated patient reply received in WhatsApp logs.`);
      fetchPatients();
      if (onRefreshLogs) onRefreshLogs();
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Patient Database</h1>
          <p className="text-slate-500 mt-1">Audit profiles, trace chronic treatment pipelines, and re-engage drop-offs.</p>
        </div>
        <button
          onClick={() => setIsAddPatientOpen(true)}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          <UserPlus className="w-4 h-4" /> Add New Profile
        </button>
      </div>

      {/* Filter and Search Section */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search patient name, phone number, treatment tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 focus:bg-white rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
          />
        </div>
      </div>

      {/* Main List */}
      {loading && patients.length === 0 ? (
        <div className="flex justify-center items-center h-60">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Patient Details</th>
                  <th className="px-6 py-4">Demographics</th>
                  <th className="px-6 py-4">Outreach Interval</th>
                  <th className="px-6 py-4">Retention Status</th>
                  <th className="px-6 py-4">Tags</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {patients.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400">
                      <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      No patients matching criteria found.
                    </td>
                  </tr>
                ) : (
                  patients.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Name & Phone */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{p.name}</div>
                        <div className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-300" /> {p.phone}
                        </div>
                      </td>

                      {/* Age & Gender */}
                      <td className="px-6 py-4 text-slate-600">
                        {p.age} y/o • <span className="text-slate-400">{p.gender}</span>
                      </td>

                      {/* Recall Period */}
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        Every {p.recallIntervalMonths} Months
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                          p.followUpStatus === 'active' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : p.followUpStatus === 'overdue'
                              ? 'bg-rose-50 text-rose-700 border-rose-100'
                              : p.followUpStatus === 'pending'
                                ? 'bg-amber-50 text-amber-700 border-amber-100'
                                : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                          {p.followUpStatus}
                        </span>
                      </td>

                      {/* Tags */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {p.tags && p.tags.map(tag => (
                            <span key={tag} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium border border-slate-200/50 flex items-center gap-0.5">
                              <Tag className="w-2.5 h-2.5 text-slate-400" /> {tag}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedPatient(p)}
                          className="text-xs text-teal-600 hover:text-teal-700 font-bold flex items-center gap-0.5 ml-auto hover:underline cursor-pointer"
                        >
                          View History <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Patient Detail Drawer */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-end z-50 animate-fade-in">
          <div className="bg-white max-w-lg w-full h-full shadow-2xl overflow-y-auto flex flex-col animate-slide-in">
            {/* Drawer Header */}
            <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Patient Clinical Record</h3>
                <p className="text-xs text-slate-400 mt-0.5">System Reference: #{selectedPatient.id}</p>
              </div>
              <button 
                onClick={() => setSelectedPatient(null)}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Profile Content */}
            <div className="p-6 flex-1 space-y-6">
              
              {/* Profile Block */}
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="h-12 w-12 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-lg">
                  {selectedPatient.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">{selectedPatient.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedPatient.phone} • {selectedPatient.email || 'No email registered'}</p>
                </div>
              </div>

              {/* Patient Core Configs */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-semibold block">Age & Gender</span>
                  <span className="font-bold text-slate-700 mt-1 block">{selectedPatient.age} Years Old • {selectedPatient.gender}</span>
                </div>
                <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-semibold block">Recall Recurrence</span>
                  <span className="font-bold text-slate-700 mt-1 block">Every {selectedPatient.recallIntervalMonths} Months</span>
                </div>
              </div>

              {/* Outreach Simulation Button */}
              {selectedPatient.followUpStatus === 'overdue' && (
                <div className="p-4 bg-rose-50 text-rose-800 rounded-2xl border border-rose-100 space-y-3">
                  <div className="flex gap-2">
                    <FileText className="w-5 h-5 text-rose-500 shrink-0" />
                    <div>
                      <p className="font-bold text-xs">Recall Campaign Recommendation</p>
                      <p className="text-[11px] text-rose-600/90 mt-0.5">This patient hasn't visited in {selectedPatient.recallIntervalMonths} months. Trigger active re-engagement outreach.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTriggerManualOutreach(selectedPatient)}
                    className="w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Simulate WhatsApp Overdue Campaign
                  </button>
                </div>
              )}

              {/* Visit History Chronology */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-teal-600" /> Consultations & History
                </h4>

                {selectedPatient.visitHistory && selectedPatient.visitHistory.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                    No completed consult history recorded for this patient.
                  </div>
                ) : (
                  <div className="relative border-l border-slate-200 ml-3 pl-4 space-y-5">
                    {selectedPatient.visitHistory && selectedPatient.visitHistory.map((h, i) => (
                      <div key={i} className="relative space-y-1">
                        {/* Dot indicator */}
                        <span className="absolute -left-[21px] top-1.5 bg-teal-600 h-2.5 w-2.5 rounded-full border-2 border-white ring-4 ring-teal-50"></span>
                        
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            {h.date}
                          </span>
                        </div>
                        
                        <h5 className="font-semibold text-slate-800 text-xs mt-1">{h.reason}</h5>
                        <p className="text-slate-500 text-xs mt-1 bg-slate-50 p-2.5 rounded border-l-2 border-teal-500 italic">
                          "{h.notes}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Add Patient Modal */}
      {isAddPatientOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Create Patient Profile</h3>
                <p className="text-xs text-slate-400 mt-0.5">Enrolls patient to active WhatsApp automation queue</p>
              </div>
              <button 
                onClick={() => setIsAddPatientOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddPatientSubmit} className="p-6 space-y-4">
              
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Priyanjali Sen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">WhatsApp Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +91 91234 56789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Age</label>
                  <input
                    type="number"
                    placeholder="34"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-600"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="name@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Outreach Recall Cycle</label>
                <select
                  value={recallInterval}
                  onChange={(e) => setRecallInterval(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-600"
                >
                  <option value="1">1 Month (Physiotherapy / Spine review)</option>
                  <option value="3">3 Months (Dermatology / Chemical peels)</option>
                  <option value="6">6 Months (Regular Dental cleaning)</option>
                  <option value="12">12 Months (Annual body consult)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tags (Comma Separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Regular, Orthodontic, Senior Citizen"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              {/* Footer */}
              <div className="flex gap-2 border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPatientOpen(false)}
                  className="flex-1 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm cursor-pointer"
                >
                  Register Profile
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
