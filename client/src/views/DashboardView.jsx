import React, { useState, useEffect } from 'react';
import { Calendar, Users, IndianRupee, MessageSquare, AlertCircle, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

export default function DashboardView({ onSetActiveTab, onRefreshLogs }) {
  const [stats, setStats] = useState({
    todayTotal: 0,
    completed: 0,
    noShow: 0,
    pendingPayments: 0,
    outstandingAmount: 0,
    whatsappSent: 0
  });
  
  const [todayApts, setTodayApts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overdueFollowups, setOverdueFollowups] = useState([]);

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const allApts = await api.getAppointments();
      const allPatients = await api.getPatients();
      const allBills = await api.getBilling();
      const allLogs = await api.getLogs();

      // Today's appointments
      const todayList = allApts.filter(a => a.date === todayStr);
      setTodayApts(todayList);

      // Calculations
      const completed = todayList.filter(a => a.status === 'Completed').length;
      const noShow = todayList.filter(a => a.status === 'No-Show').length;
      
      const pendingBills = allBills.filter(b => b.status === 'Pending');
      const outstandingAmount = pendingBills.reduce((sum, b) => sum + b.amount, 0);

      // WhatsApp stats
      const totalSent = allLogs.filter(l => l.type === 'outbound').length;

      setStats({
        todayTotal: todayList.length,
        completed,
        noShow,
        pendingPayments: pendingBills.length,
        outstandingAmount,
        whatsappSent: totalSent
      });

      // Overdue Follow-ups (patients with followUpStatus === 'overdue')
      const overdueList = allPatients.filter(p => p.followUpStatus === 'overdue' || p.followUpStatus === 'pending');
      setOverdueFollowups(overdueList);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Poll stats every 5 seconds to show the WhatsApp Delivery status updates!
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (aptId, newStatus) => {
    try {
      await api.updateAppointment(aptId, { status: newStatus });
      fetchDashboardData();
      if (onRefreshLogs) onRefreshLogs();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleTriggerRecall = async (patient) => {
    try {
      // Simulate campaign trigger
      await api.simulateInbound(patient.id, "Hi, I received your recall offer. Can I book this Saturday at 11 AM?");
      alert(`Automated WhatsApp campaign triggered for ${patient.name}! Simulated patient reply received in WhatsApp logs.`);
      fetchDashboardData();
      if (onRefreshLogs) onRefreshLogs();
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  };

  if (loading && todayApts.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Operations Desk</h1>
          <p className="text-slate-500 mt-1">Real-time automation, scheduling activity, and retention pipelines.</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-200">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          WhatsApp Gateway: Active & Connected
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-teal-50 text-teal-600 p-3 rounded-xl">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Today's Visits</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.completed} / {stats.todayTotal}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{stats.noShow} no-shows marked</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-amber-50 text-amber-600 p-3 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Pending Payments</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.pendingPayments} Patients</h3>
            <p className="text-xs text-amber-600 mt-0.5 font-medium">Awaiting checkout settlement</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Outstanding Dues</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">₹{stats.outstandingAmount.toLocaleString('en-IN')}</h3>
            <button onClick={() => onSetActiveTab('billing')} className="text-xs text-teal-600 hover:underline flex items-center gap-1 mt-0.5">
              Open invoices <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-blue-50 text-blue-600 p-3 rounded-xl">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Auto-Notifications</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.whatsappSent} Sent</h3>
            <p className="text-xs text-slate-400 mt-0.5">100% template delivery rate</p>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today's Queue Desk */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Today's Patient Pipeline</h2>
            <button 
              onClick={() => onSetActiveTab('appointments')} 
              className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
            >
              Add Appointment <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {todayApts.length === 0 ? (
              <div className="p-8 text-center">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No appointments scheduled for today.</p>
                <button 
                  onClick={() => onSetActiveTab('appointments')}
                  className="mt-3 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  Schedule First Appointment
                </button>
              </div>
            ) : (
              todayApts.map(apt => (
                <div key={apt.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                        {apt.timeSlot}
                      </span>
                      <h4 className="font-semibold text-slate-800">{apt.patientName}</h4>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>Reason: <strong className="text-slate-700">{apt.reason}</strong></span>
                      <span>•</span>
                      <span>Doctor: <span className="text-slate-600">{apt.doctorName}</span></span>
                    </div>
                    {apt.notes && (
                      <p className="text-xs italic text-slate-400 bg-slate-50 p-2 rounded mt-1 border-l-2 border-slate-200">
                        "{apt.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {/* Status badges */}
                    {apt.status === 'Completed' && (
                      <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Checked Out
                      </span>
                    )}
                    {apt.status === 'No-Show' && (
                      <span className="bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> No-Show
                      </span>
                    )}
                    {apt.status === 'Confirmed' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateStatus(apt.id, 'Completed')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                        >
                          Checkout
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(apt.id, 'No-Show')}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                        >
                          No-Show
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actionable Followups & Recalls */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">Retention Recall Desk</h2>
            <p className="text-xs text-slate-400 mt-0.5">Automated campaigns for inactive or overdue patients.</p>
          </div>

          <div className="p-4 flex-1 space-y-4">
            {overdueFollowups.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <CheckCircle className="w-10 h-10 text-emerald-400 mb-2" />
                <p className="text-sm font-semibold text-slate-700">All caught up!</p>
                <p className="text-xs text-slate-400">No overdue follow-up recalls flagged.</p>
              </div>
            ) : (
              overdueFollowups.map(p => (
                <div key={p.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-3 hover:border-teal-200 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-slate-800 text-sm">{p.name}</h4>
                      <p className="text-xs text-slate-400">{p.phone}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      p.followUpStatus === 'overdue' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}>
                      {p.followUpStatus}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500">
                    Last visit: <span className="font-medium text-slate-700">
                      {p.visitHistory && p.visitHistory.length > 0 ? p.visitHistory[p.visitHistory.length - 1].date : 'N/A'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleTriggerRecall(p)}
                    className="w-full py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold rounded-lg border border-teal-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-teal-600" /> Send Re-engagement Alert
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
