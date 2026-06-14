import React, { useState, useEffect } from 'react';
import { 
  Users, Search, UserPlus, X, Phone, Briefcase, Mail, Shield, 
  Trash2, AlertTriangle, UserCheck, ShieldCheck, CheckCircle 
} from 'lucide-react';
import { api } from '../services/api';

export default function StaffView({ currentUser }) {
  const [activeSubTab, setActiveSubTab] = useState('doctors'); // 'doctors' | 'admins'
  const [doctors, setDoctors] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Add Doctor Form State
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false);
  const [docName, setDocName] = useState('');
  const [docSpecialty, setDocSpecialty] = useState('General Practitioner');
  const [customSpecialty, setCustomSpecialty] = useState('');
  const [docPhone, setDocPhone] = useState('');

  // Confirmation Modal State
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    type: '', // 'doctor' | 'admin'
    item: null
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeSubTab === 'doctors') {
        const docsData = await api.getDoctors();
        setDoctors(docsData);
      } else {
        const adminsData = await api.getAdmins();
        setAdmins(adminsData);
      }
    } catch (err) {
      console.error('Failed to fetch staff data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeSubTab]);

  const handleAddDoctorSubmit = async (e) => {
    e.preventDefault();
    if (!docName.trim()) {
      alert('Doctor name is required.');
      return;
    }

    const finalSpecialty = docSpecialty === 'Custom' ? customSpecialty.trim() : docSpecialty;
    if (docSpecialty === 'Custom' && !finalSpecialty) {
      alert('Please enter a custom specialty.');
      return;
    }

    try {
      await api.addDoctor({
        name: docName.trim(),
        specialty: finalSpecialty || 'General Practitioner',
        phone: docPhone.trim()
      });

      setIsAddDoctorOpen(false);
      setDocName('');
      setDocSpecialty('General Practitioner');
      setCustomSpecialty('');
      setDocPhone('');
      
      fetchData();
    } catch (err) {
      alert('Failed to add doctor: ' + err.message);
    }
  };

  const openDeleteConfirm = (type, item) => {
    setDeleteConfirm({
      isOpen: true,
      type,
      item
    });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({
      isOpen: false,
      type: '',
      item: null
    });
  };

  const handleDeleteExecute = async () => {
    const { type, item } = deleteConfirm;
    if (!item) return;

    try {
      if (type === 'doctor') {
        await api.removeDoctor(item.id);
      } else if (type === 'admin') {
        await api.removeAdmin(item.id);
      }
      closeDeleteConfirm();
      fetchData();
    } catch (err) {
      alert(`Failed to remove ${type}: ${err.message}`);
    }
  };

  // Filters based on search query
  const filteredDoctors = doctors.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.specialty && doc.specialty.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (doc.phone && doc.phone.includes(searchQuery))
  );

  const filteredAdmins = admins.filter(adm => 
    adm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    adm.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    adm.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Staff Management</h1>
          <p className="text-slate-500 mt-1">Manage practicing clinicians, update consulting profiles, and authorize admin access keys.</p>
        </div>
        {activeSubTab === 'doctors' && (
          <button
            onClick={() => setIsAddDoctorOpen(true)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Add Practicing Doctor
          </button>
        )}
      </div>

      {/* Tabs list & Search bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Toggle subtabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => {
              setActiveSubTab('doctors');
              setSearchQuery('');
            }}
            className={`flex-1 md:flex-initial px-5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'doctors' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" /> 
            Doctors ({doctors.length})
          </button>
          <button
            onClick={() => {
              setActiveSubTab('admins');
              setSearchQuery('');
            }}
            className={`flex-1 md:flex-initial px-5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'admins' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Clinic Admins ({admins.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder={activeSubTab === 'doctors' ? "Search doctor name, specialty..." : "Search admin name, email..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 focus:bg-white rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
          />
        </div>
      </div>

      {/* Main List Table */}
      {loading ? (
        <div className="flex justify-center items-center h-60">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      ) : activeSubTab === 'doctors' ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Clinician Name</th>
                  <th className="px-6 py-4">Contact phone</th>
                  <th className="px-6 py-4">Specialty</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredDoctors.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-10 text-center text-slate-400">
                      <Briefcase className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      No doctors registered.
                    </td>
                  </tr>
                ) : (
                  filteredDoctors.map(doc => (
                    <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Name Details */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm border border-teal-100">
                            {doc.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">{doc.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">ID: {doc.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-6 py-4">
                        <div className="text-slate-600 flex items-center gap-1.5 font-medium">
                          <Phone className="w-3.5 h-3.5 text-slate-300" /> {doc.phone || 'No phone added'}
                        </div>
                      </td>

                      {/* Specialty */}
                      <td className="px-6 py-4">
                        <span className="text-[11px] font-bold bg-teal-50 border border-teal-100 text-teal-700 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {doc.specialty}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openDeleteConfirm('doctor', doc)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Remove Doctor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Administrator</th>
                  <th className="px-6 py-4">Email Address</th>
                  <th className="px-6 py-4">Security Role</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredAdmins.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-10 text-center text-slate-400">
                      <Shield className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      No clinic administrators found.
                    </td>
                  </tr>
                ) : (
                  filteredAdmins.map(adm => {
                    const isSelf = adm.id === currentUser?.id;
                    return (
                      <tr key={adm.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Name */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm border border-slate-200">
                              {adm.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                {adm.name}
                                {isSelf && (
                                  <span className="text-[9px] font-bold bg-teal-500 text-white px-1.5 py-0.5 rounded-md">You</span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">ID: {adm.id}</div>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-6 py-4">
                          <div className="text-slate-600 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-300" /> {adm.email}
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            {adm.role === 'admin' ? (
                              <span className="text-[10px] font-bold bg-slate-900 text-white border border-slate-900 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-teal-400" /> Clinic Admin
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <UserCheck className="w-3 h-3 text-slate-400" /> Staff Member
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          {isSelf ? (
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                              Primary Session
                            </span>
                          ) : (
                            <button
                              onClick={() => openDeleteConfirm('admin', adm)}
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Revoke Clinic Access"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Doctor Modal */}
      {isAddDoctorOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Register Clinician</h3>
                <p className="text-xs text-slate-400 mt-0.5">Adds a doctor profile for scheduler assignments</p>
              </div>
              <button 
                onClick={() => setIsAddDoctorOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddDoctorSubmit} className="p-6 space-y-4">
              
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Doctor Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Aditya Verma"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-600"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contact Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={docPhone}
                  onChange={(e) => setDocPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Clinical Specialty</label>
                <select
                  value={docSpecialty}
                  onChange={(e) => setDocSpecialty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-600"
                >
                  <option value="General Practitioner">General Practitioner</option>
                  <option value="Dermatologist">Dermatologist (Skin Care)</option>
                  <option value="Orthodontist">Orthodontist (Dentistry)</option>
                  <option value="Pediatrician">Pediatrician (Kids Clinic)</option>
                  <option value="Physiotherapist">Physiotherapist (Spine/Rehab)</option>
                  <option value="Cardiologist">Cardiologist (Heart Care)</option>
                  <option value="Custom">-- Custom Specialty --</option>
                </select>
              </div>

              {docSpecialty === 'Custom' && (
                <div className="animate-fade-in">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Enter Custom Specialty</label>
                  <input
                    type="text"
                    placeholder="e.g. Endodontist"
                    value={customSpecialty}
                    onChange={(e) => setCustomSpecialty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-600"
                    required
                  />
                </div>
              )}

              {/* Footer */}
              <div className="flex gap-2 border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAddDoctorOpen(false)}
                  className="flex-1 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm cursor-pointer"
                >
                  Save Clinician
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Confirmation Delete Dialog */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-6 text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="font-bold text-slate-950 text-lg">
                  {deleteConfirm.type === 'doctor' ? 'Remove Practicing Clinician?' : 'Revoke Administrator Access?'}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  {deleteConfirm.type === 'doctor' 
                    ? `Are you sure you want to remove ${deleteConfirm.item?.name} from the practice? This cannot be undone and they will not appear in scheduling selectors.`
                    : `Are you sure you want to disassociate ${deleteConfirm.item?.name} (${deleteConfirm.item?.email}) from the clinic? They will immediately lose access to the patients database, scheduler, and ledger logs.`
                  }
                </p>
              </div>

              <div className="flex gap-2 border-t border-slate-100 pt-4 mt-2">
                <button
                  onClick={closeDeleteConfirm}
                  className="flex-1 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteExecute}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm cursor-pointer"
                >
                  Yes, Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
