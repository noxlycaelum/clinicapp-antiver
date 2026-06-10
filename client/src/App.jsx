import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Calendar, Users, IndianRupee, MessageSquare, 
  Settings, Menu, X, PhoneCall, ChevronRight, Send, HelpCircle, 
  Activity, Sparkles, User, Bell, Smartphone, LogOut, UserPlus, Copy
} from 'lucide-react';

import { api } from './services/api';
import DashboardView from './views/DashboardView';
import AppointmentsView from './views/AppointmentsView';
import PatientsView from './views/PatientsView';
import BillingView from './views/BillingView';
import AutomationView from './views/AutomationView';
import LoginView from './views/LoginView';
import OnboardingView from './views/OnboardingView';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(true);
  
  // Auth state
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  // WhatsApp simulator state
  const [whatsappLogs, setWhatsappLogs] = useState([]);
  const [selectedSimPatient, setSelectedSimPatient] = useState('');
  const [simPatientsList, setSimPatientsList] = useState([]);
  const [simText, setSimText] = useState('');

  // Invite modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  // Capture invite ID from query parameter and store it in localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteClinicId = params.get('invite');
    if (inviteClinicId) {
      localStorage.setItem('clinicos_invite_clinic_id', inviteClinicId);
      // Remove query param from browser URL for cleaner layout
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Check active JWT session on startup
  useEffect(() => {
    const checkAuth = () => {
      const user = api.getUser();
      const token = api.getToken();
      if (user && token) {
        setCurrentUser(user);
      }
      setIsAuthLoading(false);
    };
    checkAuth();
  }, []);

  const fetchLogsAndPatients = async () => {
    if (!currentUser) return;
    try {
      const logsData = await api.getLogs();
      setWhatsappLogs(logsData);
      
      const patientsData = await api.getPatients();
      setSimPatientsList(patientsData);
      
      // Auto select first patient
      if (!selectedSimPatient && patientsData.length > 0) {
        setSelectedSimPatient(patientsData[0].id);
      }
    } catch (err) {
      console.error('Failed to load logs/patients:', err);
      // If server returns unauthorized (401/403), clear local session
      if (err.message.includes('expired') || err.message.includes('token') || err.message.includes('Please log in')) {
        handleLogout();
      }
    }
  };

  useEffect(() => {
    fetchLogsAndPatients();
    const interval = setInterval(fetchLogsAndPatients, 3000);
    return () => clearInterval(interval);
  }, [selectedSimPatient, currentUser]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setWhatsappLogs([]);
    setSimPatientsList([]);
    setSelectedSimPatient('');
  };

  const handleSimInboundSubmit = async (e) => {
    e.preventDefault();
    if (!simText || !selectedSimPatient) return;

    try {
      await api.simulateInbound(selectedSimPatient, simText);
      setSimText('');
      fetchLogsAndPatients();
    } catch (err) {
      alert(err.message);
    }
  };

  const currentSimPatientObj = simPatientsList.find(p => p.id === selectedSimPatient);
  const filteredSimLogs = whatsappLogs.filter(l => l.patientId === selectedSimPatient);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  // Secure redirect overlay
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Clinic onboarding redirect overlay
  if (currentUser && !currentUser.clinicId) {
    return (
      <OnboardingView 
        currentUser={currentUser} 
        onOnboardingSuccess={(updatedUser) => {
          setCurrentUser(updatedUser);
        }} 
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      
      {/* 1. Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 bg-slate-900 text-slate-300 w-64 transform ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 transition-transform duration-200 ease-in-out z-30 flex flex-col border-r border-slate-800`}>
        
        {/* Sidebar Header branding */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <div className="flex items-center gap-2.5">
            <span className="h-9 w-9 rounded-xl bg-teal-500 text-white flex items-center justify-center font-extrabold text-lg shadow-teal-500/20 shadow-md">
              C
            </span>
            <div>
              <h2 className="font-extrabold text-white text-base tracking-tight leading-none">ClinicOS</h2>
              <span className="text-[10px] text-teal-400 font-bold tracking-widest uppercase mt-0.5 block">MVP V1.0</span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 hover:bg-slate-800 rounded text-slate-400 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation items */}
        <nav className="p-4 flex-1 space-y-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'dashboard' ? 'bg-teal-600 text-white font-bold shadow-teal-600/10 shadow-md' : 'hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> Operations Desk
          </button>

          <button 
            onClick={() => setActiveTab('appointments')}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'appointments' ? 'bg-teal-600 text-white font-bold shadow-teal-600/10 shadow-md' : 'hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" /> Scheduler Grid
          </button>

          <button 
            onClick={() => setActiveTab('patients')}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'patients' ? 'bg-teal-600 text-white font-bold shadow-teal-600/10 shadow-md' : 'hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <Users className="w-4 h-4" /> Patients Directory
          </button>

          <button 
            onClick={() => setActiveTab('billing')}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'billing' ? 'bg-teal-600 text-white font-bold shadow-teal-600/10 shadow-md' : 'hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <IndianRupee className="w-4 h-4" /> Billing Ledger
          </button>

          <button 
            onClick={() => setActiveTab('automation')}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'automation' ? 'bg-teal-600 text-white font-bold shadow-teal-600/10 shadow-md' : 'hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Automation Studio
          </button>
        </nav>

        {/* User Details & Logout footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8.5 w-8.5 rounded-full bg-slate-850 flex items-center justify-center font-bold text-xs border border-slate-700 shrink-0 select-none">
              <User className="w-4 h-4 text-teal-400" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[11px] text-white truncate">{currentUser?.name}</p>
              <p className="text-[9px] text-slate-500 font-medium truncate capitalize mt-0.5">{currentUser?.role} Desk</p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            title="Secure Logout"
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </aside>

      {/* 2. Top Header and Main Content */}
      <div className={`flex-1 flex flex-col min-h-screen lg:pl-64 transition-all duration-200 ${
        isSimulatorOpen ? 'xl:pr-[380px]' : ''
      }`}>
        
        {/* Top Navigation Header bar */}
        <header className="sticky top-0 bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer">
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold text-slate-700 uppercase tracking-wider bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg">
              {currentUser?.clinicName || 'Apex Dental & Skin Care'}
            </span>
            {currentUser?.clinicId && (
              <button
                onClick={() => {
                  setIsInviteModalOpen(true);
                  setInviteCopied(false);
                }}
                className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-teal-200 shadow-xs animate-fade-in"
              >
                <UserPlus className="w-4 h-4 text-teal-600" /> Add Admin
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Quick WhatsApp Drawer toggler */}
            <button 
              onClick={() => setIsSimulatorOpen(!isSimulatorOpen)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isSimulatorOpen 
                  ? 'bg-teal-50 text-teal-700 border border-teal-200' 
                  : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 shadow-xs'
              }`}
            >
              <Smartphone className="w-4 h-4" /> 
              {isSimulatorOpen ? 'Hide simulator' : 'Open WhatsApp simulator'}
            </button>

            <span className="h-8 w-px bg-slate-200"></span>

            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">SECURE DESK</span>
            </div>
          </div>
        </header>

        {/* View container */}
        <main className="p-6 flex-1 max-w-5xl w-full mx-auto pb-12 animate-fade-in">
          {activeTab === 'dashboard' && (
            <DashboardView 
              onSetActiveTab={setActiveTab} 
              onRefreshLogs={fetchLogsAndPatients} 
              onInviteAdmin={() => {
                setIsInviteModalOpen(true);
                setInviteCopied(false);
              }}
            />
          )}
          {activeTab === 'appointments' && (
            <AppointmentsView 
              onRefreshLogs={fetchLogsAndPatients} 
            />
          )}
          {activeTab === 'patients' && (
            <PatientsView 
              onRefreshLogs={fetchLogsAndPatients} 
            />
          )}
          {activeTab === 'billing' && (
            <BillingView 
              onRefreshLogs={fetchLogsAndPatients} 
            />
          )}
          {activeTab === 'automation' && (
            <AutomationView 
              logs={whatsappLogs} 
              onRefreshLogs={fetchLogsAndPatients} 
            />
          )}
        </main>

      </div>

      {/* 3. The WhatsApp Live Mobile Phone Simulator Drawer */}
      <aside className={`fixed right-0 top-0 bottom-0 bg-slate-900 border-l border-slate-800 w-[380px] z-20 flex-col shadow-2xl transition-transform duration-300 ${
        isSimulatorOpen ? 'translate-x-0 flex' : 'translate-x-full hidden'
      }`}>
        
        {/* Simulator Phone Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="font-bold text-xs tracking-tight uppercase">Live Gateway Simulator</h3>
              <p className="text-[9px] text-slate-400 leading-none">Simulating WhatsApp alerts & replies</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSimulatorOpen(false)}
            className="p-1 hover:bg-slate-800 rounded-full text-slate-400 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected patient selector in mockup phone */}
        <div className="p-3 bg-slate-900 border-b border-slate-800/60 shrink-0">
          <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Active Chat Context
          </label>
          <select
            value={selectedSimPatient}
            onChange={(e) => setSelectedSimPatient(e.target.value)}
            className="w-full bg-slate-950 text-xs font-semibold text-white px-2.5 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
          >
            {simPatientsList.length === 0 ? (
              <option value="">No patients available</option>
            ) : (
              simPatientsList.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.phone})
                </option>
              ))
            )}
          </select>
        </div>

        {/* WhatsApp Mobile UI Screen Wrapper */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#ebe3d9] relative">
          
          {/* Phone header background green */}
          <div className="px-3 py-2 bg-[#075e54] text-white flex items-center gap-2 shadow-sm shrink-0">
            <div className="h-8 w-8 rounded-full bg-slate-200/30 text-white font-extrabold flex items-center justify-center text-xs shrink-0 select-none">
              {currentSimPatientObj ? currentSimPatientObj.name.charAt(0) : 'P'}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-xs truncate leading-snug">{currentSimPatientObj?.name || 'Select Patient'}</h4>
              <p className="text-[9px] text-slate-100 opacity-90 font-medium">online</p>
            </div>
          </div>

          {/* Messages Wallpaper scrollable panel */}
          <div 
            className="flex-1 p-3 overflow-y-auto space-y-2.5 flex flex-col justify-end"
            style={{
              backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
              backgroundSize: 'contain'
            }}
          >
            {filteredSimLogs.length === 0 ? (
              <div className="my-auto text-center px-4">
                <div className="bg-white/95 text-slate-600 text-xs p-3.5 rounded-2xl shadow-sm border border-slate-200/40">
                  <p className="font-semibold text-slate-800">WhatsApp Workspace Session</p>
                  <p className="text-[10px] text-slate-400 mt-1">Actions taken in ClinicOS (such as creating appointments, settlements or checkouts) will generate simulated alerts here.</p>
                </div>
              </div>
            ) : (
              filteredSimLogs.map(log => {
                const isInbound = log.type === 'inbound';
                return (
                  <div 
                    key={log.id} 
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs shadow-xs leading-relaxed relative w-max ${
                      isInbound 
                        ? 'bg-white text-slate-800 mr-auto rounded-tl-none border border-slate-200/50' 
                        : 'bg-[#dcf8c6] text-slate-800 ml-auto rounded-tr-none'
                    }`}
                  >
                    <div className="whitespace-pre-line text-[11px] font-medium leading-snug">
                      {log.message}
                    </div>

                    <div className="text-[9px] text-slate-400 text-right mt-1.5 flex items-center justify-end gap-1 select-none">
                      <span>{new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      {!isInbound && (
                        <>
                          {log.status === 'Sent' && (
                            <span className="text-slate-400">✓</span>
                          )}
                          {log.status === 'Delivered' && (
                            <span className="text-slate-400">✓✓</span>
                          )}
                          {log.status === 'Read' && (
                            <span className="text-blue-500 font-extrabold">✓✓</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Simulated WhatsApp Reply textbox inputs */}
          <form onSubmit={handleSimInboundSubmit} className="p-2 bg-[#f0f0f0] border-t border-slate-300 flex items-center gap-1.5 shrink-0">
            <input
              type="text"
              placeholder={`Reply as ${currentSimPatientObj?.name || 'Patient'}...`}
              value={simText}
              onChange={(e) => setSimText(e.target.value)}
              className="flex-1 bg-white text-xs px-3.5 py-2.5 rounded-full border border-slate-300/80 focus:outline-none focus:ring-1 focus:ring-teal-600 font-medium"
            />
            <button 
              type="submit"
              className="h-9 w-9 bg-[#075e54] hover:bg-[#054d44] text-white flex items-center justify-center rounded-full shrink-0 shadow-sm transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>

        </div>

      </aside>

      {/* Invite Admin Modal overlay */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 transform scale-100 transition-transform">
            
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Add Desk Admin</h3>
                <p className="text-xs text-slate-400 mt-0.5">Invite a member to manage {currentUser?.clinicName}</p>
              </div>
              <button 
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Share this secure onboarding invite link. When they visit this URL and log in or register, they will be granted full administrative access to your clinic desk.
              </p>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Shareable Invite Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/?invite=${currentUser?.clinicId}`}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/?invite=${currentUser?.clinicId}`);
                      setInviteCopied(true);
                      setTimeout(() => setInviteCopied(false), 2000);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer text-white shrink-0 ${
                      inviteCopied ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-teal-600 hover:bg-teal-700'
                    }`}
                  >
                    {inviteCopied ? 'Copied!' : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                </div>
              </div>
              
              <div className="p-3 bg-teal-50 border border-teal-100 rounded-2xl text-[11px] text-teal-800 leading-relaxed">
                <strong>Invite Code:</strong> {currentUser?.clinicId}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close Panel
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
