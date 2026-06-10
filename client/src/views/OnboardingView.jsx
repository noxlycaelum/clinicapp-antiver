import React, { useState, useEffect } from 'react';
import { Building, UserPlus, ArrowRight, ShieldAlert, Sparkles, LogOut, CheckCircle, HeartHandshake, User, Users, Phone } from 'lucide-react';
import { api } from '../services/api';

export default function OnboardingView({ currentUser, onOnboardingSuccess, onLogout }) {
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'join'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Clinic Details
  const [clinicName, setClinicName] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');

  // Doctor Details
  const [docName, setDocName] = useState('');
  const [docSpecialty, setDocSpecialty] = useState('Dentist');
  const [docPhone, setDocPhone] = useState('');

  // Patient Details
  const [patName, setPatName] = useState('');
  const [patPhone, setPatPhone] = useState('');
  const [patEmail, setPatEmail] = useState('');
  const [patGender, setPatGender] = useState('Female');
  const [patAge, setPatAge] = useState('');

  // Join clinic state
  const [inviteCodeOrUrl, setInviteCodeOrUrl] = useState('');
  
  // Pending invitation from localStorage
  const [pendingInviteId, setPendingInviteId] = useState('');
  const [pendingInviteName, setPendingInviteName] = useState('');
  const [fetchingInviteName, setFetchingInviteName] = useState(false);

  useEffect(() => {
    const checkPendingInvite = async () => {
      const inviteId = localStorage.getItem('clinicos_invite_clinic_id');
      if (inviteId) {
        setPendingInviteId(inviteId);
        try {
          setFetchingInviteName(true);
          const name = await api.getPublicClinicName(inviteId);
          setPendingInviteName(name);
        } catch (err) {
          console.error('Failed to resolve pending invite clinic name:', err);
          setPendingInviteName('a clinic');
        } finally {
          setFetchingInviteName(false);
        }
      }
    };
    checkPendingInvite();
  }, []);

  const handleCreateClinic = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!clinicName) {
      setError('Clinic name is required.');
      return;
    }

    const payload = {
      name: clinicName,
      gstin,
      address,
      phone: clinicPhone,
      doctor: docName ? { name: docName, specialty: docSpecialty, phone: docPhone } : null,
      patient: patName && patPhone ? { name: patName, phone: patPhone, email: patEmail, gender: patGender, age: patAge } : null
    };

    try {
      setLoading(true);
      const data = await api.createClinic(payload);
      setSuccess('Clinic created successfully! Redirecting...');
      setTimeout(() => {
        onOnboardingSuccess(data.user);
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to create clinic. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClinic = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    let clinicIdToJoin = inviteCodeOrUrl.trim();
    if (!clinicIdToJoin) {
      setError('Please provide an invite link or invite code.');
      return;
    }

    // Parse clinicId if they pasted the entire link: e.g. http://localhost:3000/?invite=c_xxxx
    try {
      if (clinicIdToJoin.includes('?invite=')) {
        const urlParams = new URLSearchParams(clinicIdToJoin.split('?')[1]);
        const parsedId = urlParams.get('invite');
        if (parsedId) {
          clinicIdToJoin = parsedId;
        }
      }
    } catch (urlErr) {
      console.error('Error parsing pasted URL:', urlErr);
    }

    try {
      setLoading(true);
      const data = await api.joinClinic(clinicIdToJoin);
      setSuccess('Successfully joined the clinic! Redirecting...');
      localStorage.removeItem('clinicos_invite_clinic_id');
      setTimeout(() => {
        onOnboardingSuccess(data.user);
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to join clinic. Please verify the code/link.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptPendingInvite = async () => {
    setError('');
    setSuccess('');
    try {
      setLoading(true);
      const data = await api.joinClinic(pendingInviteId);
      setSuccess(`Joined ${pendingInviteName || 'clinic'} successfully! Redirecting...`);
      localStorage.removeItem('clinicos_invite_clinic_id');
      setTimeout(() => {
        onOnboardingSuccess(data.user);
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to join the invited clinic.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeclinePendingInvite = () => {
    localStorage.removeItem('clinicos_invite_clinic_id');
    setPendingInviteId('');
    setPendingInviteName('');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6 relative overflow-hidden"
         style={{
           backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(13, 148, 136, 0.12) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(20, 184, 166, 0.12) 0%, transparent 40%)'
         }}>
      
      {/* Background blur decorative element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] bg-teal-500/5 blur-[120px] rounded-full select-none pointer-events-none"></div>

      <div className="max-w-4xl w-full z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Onboarding left branding context panel */}
        <div className="lg:col-span-5 space-y-6 self-center text-left">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-teal-500 text-white items-center justify-center font-extrabold text-2xl shadow-lg shadow-teal-500/20">
            C
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Setup Practice Desk</h1>
            <p className="text-teal-400 text-xs font-semibold uppercase tracking-wider mt-1.5">Welcome to ClinicOS, {currentUser?.name}</p>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">
            Initialize your clinical workspace. Set up a secure database tenant with automated workflows, WhatsApp retention campaigns, and invoice journals.
          </p>

          <div className="space-y-4 pt-2">
            <div className="flex gap-3 items-start text-xs">
              <span className="h-5 w-5 bg-teal-900/40 text-teal-400 border border-teal-800 rounded-md flex items-center justify-center font-semibold shrink-0 mt-0.5">1</span>
              <div>
                <p className="font-bold text-slate-200">Configure Clinic Identity</p>
                <p className="text-slate-400 mt-0.5">Define GSTIN ledger, contact profile, and address tags.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start text-xs">
              <span className="h-5 w-5 bg-teal-900/40 text-teal-400 border border-teal-800 rounded-md flex items-center justify-center font-semibold shrink-0 mt-0.5">2</span>
              <div>
                <p className="font-bold text-slate-200">Populate Initial Profiles</p>
                <p className="text-slate-400 mt-0.5">Seed your active practitioner roster and your first patient context.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start text-xs">
              <span className="h-5 w-5 bg-teal-900/40 text-teal-400 border border-teal-800 rounded-md flex items-center justify-center font-semibold shrink-0 mt-0.5">3</span>
              <div>
                <p className="font-bold text-slate-200">Launch Automated Studio</p>
                <p className="text-slate-400 mt-0.5">Instantly launch preseeded WhatsApp alert rules out of the box.</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ClinicOS v1.0.0</span>
            <button 
              onClick={onLogout}
              className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1.5 hover:underline cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out of account
            </button>
          </div>
        </div>

        {/* Onboarding right tabbed content panel */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Pending invitation alert */}
          {pendingInviteId && (
            <div className="p-4 bg-teal-950/40 border border-teal-500/20 text-teal-300 rounded-3xl text-xs flex flex-col md:flex-row items-center justify-between gap-3 animate-fade-in shadow-lg">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-teal-400 shrink-0" />
                <div>
                  <p className="font-bold text-slate-200">Pending Clinic Invitation</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    {fetchingInviteName ? 'Fetching clinic info...' : `You have been invited to join "${pendingInviteName}" as an Admin.`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={handleAcceptPendingInvite}
                  disabled={loading}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-[11px] transition-colors cursor-pointer disabled:bg-teal-800"
                >
                  Accept & Join
                </button>
                <button
                  onClick={handleDeclinePendingInvite}
                  disabled={loading}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-[11px] transition-colors cursor-pointer border border-slate-700"
                >
                  Ignore
                </button>
              </div>
            </div>
          )}

          {/* Tab Selector container */}
          <div className="bg-slate-800/80 backdrop-blur-md rounded-3xl p-6 border border-slate-700/60 shadow-2xl flex flex-col min-h-[500px]">
            
            <div className="flex gap-2 p-1 bg-slate-900 rounded-xl mb-6">
              <button
                onClick={() => { setActiveTab('create'); setError(''); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'create' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Create a New Clinic
              </button>
              <button
                onClick={() => { setActiveTab('join'); setError(''); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'join' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Join Clinic as Admin
              </button>
            </div>

            {/* Validation Banner Alerts */}
            {error && (
              <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl text-xs flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-2xl text-xs flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {activeTab === 'create' ? (
              // CREATE CLINIC FLOW
              <form onSubmit={handleCreateClinic} className="space-y-5 flex-1 flex flex-col justify-between">
                
                {/* Form Sections scrollable area */}
                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                  
                  {/* Clinic Info */}
                  <div className="space-y-3.5">
                    <h3 className="text-xs font-extrabold uppercase text-teal-400 tracking-wider flex items-center gap-1.5">
                      <Building className="w-4 h-4" /> 1. Clinic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wide">Clinic Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Apollo Dental Hub"
                          value={clinicName}
                          onChange={(e) => setClinicName(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/60 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-white font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wide">Clinic GSTIN</label>
                        <input
                          type="text"
                          placeholder="e.g. 22AAAAA0000A1Z5"
                          value={gstin}
                          onChange={(e) => setGstin(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/60 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-white font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wide">Practice Phone</label>
                        <input
                          type="text"
                          placeholder="e.g. +91 98765 43210"
                          value={clinicPhone}
                          onChange={(e) => setClinicPhone(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/60 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wide">Physical Address</label>
                        <input
                          type="text"
                          placeholder="e.g. Connaught Place, New Delhi"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/60 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-white font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Doctor Info */}
                  <div className="space-y-3.5 border-t border-slate-800/80 pt-4">
                    <h3 className="text-xs font-extrabold uppercase text-teal-400 tracking-wider flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4" /> 2. Primary Doctor
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wide">Doctor Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Dr. Aditya Verma"
                          value={docName}
                          onChange={(e) => setDocName(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/60 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-white font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wide">Specialty Practice</label>
                        <select
                          value={docSpecialty}
                          onChange={(e) => setDocSpecialty(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/60 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-white font-semibold"
                        >
                          <option value="Dentist">Dental & Surgery (Dentist)</option>
                          <option value="Dermatologist">Skin & Cosmetic (Dermatologist)</option>
                          <option value="Physiotherapist">Orthopedics & Spine (Physiotherapist)</option>
                          <option value="General Physician">General Practice Physician</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div className="space-y-3.5 border-t border-slate-800/80 pt-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-extrabold uppercase text-teal-400 tracking-wider flex items-center gap-1.5">
                        <Users className="w-4 h-4" /> 3. Add First Patient Profile (Optional)
                      </h3>
                      <span className="text-[9px] bg-slate-900 text-slate-500 border border-slate-800 px-1.5 py-0.5 rounded-md font-semibold tracking-wider">OPTIONAL</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      <div className="space-y-1 md:col-span-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wide">Patient Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Kabir Mehta"
                          value={patName}
                          onChange={(e) => setPatName(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/60 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-white font-medium"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wide">WhatsApp Phone</label>
                        <input
                          type="text"
                          placeholder="e.g. +91 99999 88888"
                          value={patPhone}
                          onChange={(e) => setPatPhone(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/60 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-white"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wide">Patient Email</label>
                        <input
                          type="email"
                          placeholder="e.g. patient@test.com"
                          value={patEmail}
                          onChange={(e) => setPatEmail(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/60 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wide">Gender</label>
                        <select
                          value={patGender}
                          onChange={(e) => setPatGender(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/60 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-white font-semibold"
                        >
                          <option value="Female">Female</option>
                          <option value="Male">Male</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wide">Age</label>
                        <input
                          type="number"
                          placeholder="e.g. 29"
                          value={patAge}
                          onChange={(e) => setPatAge(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/60 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Admin Assignment Disclaimer */}
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl text-[11px] text-slate-400 flex items-start gap-2 leading-relaxed">
                    <Sparkles className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                    <span>
                      You will be designated as the primary **Clinic Administrator**. You can generate invite links to add additional desk admins, doctor accounts, or receptionists later.
                    </span>
                  </div>

                </div>

                {/* Submission buttons */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 mt-4 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-teal-600/10 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4.5 w-4.5 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    <>
                      Create Clinic Workspace <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

              </form>
            ) : (
              // JOIN CLINIC FLOW
              <form onSubmit={handleJoinClinic} className="space-y-5 flex-1 flex flex-col justify-between">
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-widest">Invite Link / Clinic Invite Code</label>
                    <input
                      type="text"
                      placeholder="Paste invite link (http://...) or enter Code (e.g. c_l12345)"
                      value={inviteCodeOrUrl}
                      onChange={(e) => setInviteCodeOrUrl(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700/60 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-white font-medium"
                    />
                  </div>

                  <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl text-xs space-y-2 text-slate-400 leading-relaxed">
                    <p className="font-bold text-slate-200">How do invitations work?</p>
                    <ul className="list-disc pl-4 space-y-1 text-[11px]">
                      <li>An administrator from an active clinic sends you an invite link.</li>
                      <li>Pasting the URL or inputting the code assigns you to their staff registry.</li>
                      <li>Once joined, you will receive full workspace permissions.</li>
                    </ul>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-teal-600/10 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4.5 w-4.5 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    <>
                      Join Clinic Workspace <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

              </form>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
