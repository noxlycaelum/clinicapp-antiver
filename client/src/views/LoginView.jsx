import React, { useState } from 'react';
import { Smartphone, Lock, User, PlusCircle, LogIn, ShieldAlert, Sparkles, Building } from 'lucide-react';
import { api } from '../services/api';

export default function LoginView({ onLoginSuccess }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration fields
  const [name, setName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [clinicType, setClinicType] = useState('Dental Clinic');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Please provide both username and password.');
      return;
    }

    try {
      setLoading(true);
      if (isRegisterMode) {
        if (!name || !clinicName) {
          setError('Please provide your name and clinic name.');
          setLoading(false);
          return;
        }
        const data = await api.signup(username, password, name, clinicName, clinicType);
        onLoginSuccess(data.user);
      } else {
        const data = await api.login(username, password);
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setError('');
    setUsername('');
    setPassword('');
    setName('');
    setClinicName('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden"
         style={{
           backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(13, 148, 136, 0.15) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(20, 184, 166, 0.15) 0%, transparent 40%)'
         }}>
      
      {/* Background visual element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] bg-teal-500/5 blur-[120px] rounded-full select-none pointer-events-none"></div>

      <div className="max-w-md w-full z-10 space-y-6">
        
        {/* Branding header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-teal-500 text-white items-center justify-center font-extrabold text-2xl shadow-lg shadow-teal-500/25 animate-scale-in">
            C
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mt-3">ClinicOS</h1>
          <p className="text-teal-400/80 text-xs font-semibold uppercase tracking-widest">WhatsApp-First Workflow Automation</p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-800/80 backdrop-blur-md rounded-3xl p-8 border border-slate-700/60 shadow-2xl animate-fade-in">
          
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">
              {isRegisterMode ? 'Register Clinic Account' : 'Login to Desk'}
            </h2>
            <button
              onClick={handleToggleMode}
              className="text-xs text-teal-400 hover:text-teal-300 font-bold transition-colors cursor-pointer hover:underline"
            >
              {isRegisterMode ? 'Already have account?' : 'Create Clinic Account'}
            </button>
          </div>

          {/* Validation Alert */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {isRegisterMode && (
              <>
                {/* Full name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. Pooja Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700/60 text-white rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                    />
                  </div>
                </div>

                {/* Clinic Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Clinic Name</label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. Apex Dental & Skin Care"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700/60 text-white rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                    />
                  </div>
                </div>

                {/* Clinic Type */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Specialty Practice</label>
                  <select
                    value={clinicType}
                    onChange={(e) => setClinicType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/60 text-white rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 font-semibold"
                  >
                    <option value="Dental Clinic">Dental Clinic (Dentists)</option>
                    <option value="Skin Clinic">Skin Care (Dermatology)</option>
                    <option value="Physiotherapy Clinic">Physiotherapy & Spine Care</option>
                  </select>
                </div>
              </>
            )}

            {/* Username */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Username</label>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder={isRegisterMode ? "Choose login username" : "Username: e.g. receptionist"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700/60 text-white rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Security Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700/60 text-white rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-teal-600/10 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4.5 w-4.5 border-t-2 border-b-2 border-white"></div>
              ) : isRegisterMode ? (
                <>
                  <PlusCircle className="w-4 h-4" /> Initialize Clinic Desk
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> Log In securely
                </>
              )}
            </button>
          </form>

          {/* Seeded Credentials Helper Dialog */}
          {!isRegisterMode && (
            <div className="mt-6 p-4 bg-teal-900/20 border border-teal-500/20 text-teal-300 rounded-2xl text-[11px] space-y-2 leading-relaxed">
              <p className="font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" /> Preseeded Demo Logins (ACID SQL):
              </p>
              <div className="space-y-1 font-mono text-[10px]">
                <div className="flex justify-between border-b border-teal-800/40 pb-1">
                  <span>Username: <strong className="text-white">receptionist</strong></span>
                  <span>Password: <strong className="text-white">admin123</strong></span>
                </div>
                <div className="flex justify-between">
                  <span>Username: <strong className="text-white">doctor</strong></span>
                  <span>Password: <strong className="text-white">doc123</strong></span>
                </div>
              </div>
              <p className="text-slate-400 text-[9px] italic border-t border-teal-800/40 pt-1 mt-1">
                Both profiles are preconfigured with patient queue histories.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
