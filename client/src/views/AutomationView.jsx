import React, { useState, useEffect } from 'react';
import { Settings2, Play, ToggleLeft, ToggleRight, FileEdit, Check, CheckCheck, Clock, MessageSquare, AlertCircle, X } from 'lucide-react';
import { api } from '../services/api';

export default function AutomationView({ logs, onRefreshLogs }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Rule editing state
  const [editingRule, setEditingRule] = useState(null);
  const [editedText, setEditedText] = useState('');

  const fetchRules = async () => {
    try {
      setLoading(true);
      const data = await api.getRules();
      setRules(data);
    } catch (err) {
      console.error('Failed to load rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggleRule = async (rule) => {
    try {
      const updated = await api.updateRule(rule.id, { isActive: !rule.isActive });
      setRules(rules.map(r => r.id === rule.id ? updated : r));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenEditModal = (rule) => {
    setEditingRule(rule);
    setEditedText(rule.templateText);
  };

  const handleSaveTemplateText = async (e) => {
    e.preventDefault();
    if (!editingRule) return;

    try {
      const updated = await api.updateRule(editingRule.id, { templateText: editedText });
      setRules(rules.map(r => r.id === editingRule.id ? updated : r));
      setEditingRule(null);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Automation Studio</h1>
          <p className="text-slate-500 mt-1">Configure communication triggers, modify automated templates, and monitor outgoing patient touchpoints.</p>
        </div>
      </div>

      {/* Rules Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-1.5">
          <Settings2 className="w-5 h-5 text-teal-600" /> Active Trigger Workflows
        </h2>

        {loading && rules.length === 0 ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rules.map(rule => (
              <div 
                key={rule.id} 
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between h-56 ${
                  rule.isActive 
                    ? 'bg-white border-slate-200 shadow-xs' 
                    : 'bg-slate-50 border-slate-200 opacity-70'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-800 text-sm tracking-tight">{rule.name}</h3>
                    <button 
                      onClick={() => handleToggleRule(rule)}
                      className="text-slate-400 hover:text-teal-600 transition-colors cursor-pointer"
                    >
                      {rule.isActive ? (
                        <ToggleRight className="w-9 h-9 text-teal-600" />
                      ) : (
                        <ToggleLeft className="w-9 h-9 text-slate-400" />
                      )}
                    </button>
                  </div>
                  
                  <span className="text-[9px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100 uppercase tracking-wider mt-1 inline-block">
                    Event: {rule.triggerEvent}
                  </span>

                  <p className="text-[11px] text-slate-400 mt-3 line-clamp-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100/70 font-medium italic">
                    "{rule.templateText}"
                  </p>
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-100/70 mt-3">
                  <button
                    onClick={() => handleOpenEditModal(rule)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <FileEdit className="w-3.5 h-3.5" /> Customize Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* WhatsApp Outbound Ledger */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-1.5">
          <MessageSquare className="w-5 h-5 text-teal-600" /> Dispatch Communications Ledger
        </h2>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Recipient Name</th>
                  <th className="px-6 py-4">Trigger Event</th>
                  <th className="px-6 py-4">Custom Content Sent</th>
                  <th className="px-6 py-4">Dispatch Time</th>
                  <th className="px-6 py-4 text-right">Delivery Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400 text-sm">
                      <Clock className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      No messages dispatched today.
                    </td>
                  </tr>
                ) : (
                  [...logs].reverse().map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Name */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{log.patientName}</div>
                        <div className="text-slate-400 text-[10px] mt-0.5">{log.phone}</div>
                      </td>

                      {/* Event */}
                      <td className="px-6 py-4 font-semibold text-slate-500">
                        {log.triggerEvent}
                      </td>

                      {/* Content */}
                      <td className="px-6 py-4 font-medium text-slate-600 max-w-sm">
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 line-clamp-2">
                          {log.message}
                        </div>
                      </td>

                      {/* Time */}
                      <td className="px-6 py-4 text-slate-400 font-medium">
                        {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>

                      {/* Status Checkmarks */}
                      <td className="px-6 py-4 text-right">
                        {log.type === 'inbound' ? (
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-semibold text-[10px]">
                            INBOUND REPLY
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className="text-[10px] text-slate-400 font-medium">
                              {log.status}
                            </span>
                            {log.status === 'Sent' && (
                              <Check className="w-4 h-4 text-slate-300" />
                            )}
                            {log.status === 'Delivered' && (
                              <CheckCheck className="w-4 h-4 text-slate-400" />
                            )}
                            {log.status === 'Read' && (
                              <CheckCheck className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Template Modal */}
      {editingRule && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl overflow-hidden">
            
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Customize WhatsApp Template</h3>
                <p className="text-xs text-slate-400 mt-0.5">Modifying {editingRule.name}</p>
              </div>
              <button onClick={() => setEditingRule(null)} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplateText} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Message Body</label>
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  rows="6"
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-600 font-medium"
                />
              </div>

              {/* Variable tips list */}
              <div className="bg-teal-50/50 p-4 rounded-2xl border border-teal-100 text-[11px] text-teal-800 space-y-2">
                <p className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-teal-600" /> Supported Template Variables:
                </p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[10px]">
                  <span>{"{{patientName}}"}</span>
                  <span>{"{{doctorName}}"}</span>
                  <span>{"{{clinicName}}"}</span>
                  <span>{"{{date}}"}</span>
                  <span>{"{{time}}"}</span>
                  <span>{"{{amount}}"}</span>
                  <span>{"{{treatment}}"}</span>
                  <span>{"{{receiptNo}}"}</span>
                </div>
                <p className="text-slate-400 text-[10px] italic pt-1 border-t border-teal-100/60 mt-1">Use double brackets exactly as shown above.</p>
              </div>

              <div className="flex gap-2 border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="flex-1 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
