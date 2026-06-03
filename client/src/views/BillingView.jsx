import React, { useState, useEffect } from 'react';
import { IndianRupee, FileText, CheckCircle, Clock, Search, X, Printer, Check, CreditCard, Tag } from 'lucide-react';
import { api } from '../services/api';

export default function BillingView({ onRefreshLogs }) {
  const [billingRecords, setBillingRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Payment settlement state
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI (GPay)');
  const [customAmount, setCustomAmount] = useState('');

  // Receipt viewing state
  const [viewingReceipt, setViewingReceipt] = useState(null);

  const fetchBilling = async () => {
    try {
      setLoading(true);
      const data = await api.getBilling();
      setBillingRecords(data);
    } catch (err) {
      console.error('Failed to load billing ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  const handleOpenPaymentModal = (bill) => {
    setSelectedBill(bill);
    setCustomAmount(bill.amount);
    setPaymentMethod('UPI (GPay)');
  };

  const handleSettlePayment = async (e) => {
    e.preventDefault();
    if (!selectedBill) return;

    try {
      await api.payBill(selectedBill.id, paymentMethod, customAmount);
      setSelectedBill(null);
      fetchBilling();
      if (onRefreshLogs) onRefreshLogs();
    } catch (err) {
      alert('Failed to record payment: ' + err.message);
    }
  };

  const filteredBills = billingRecords.filter(b => 
    b.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.treatment.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.receiptNo && b.receiptNo.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Billing Ledger</h1>
          <p className="text-slate-500 mt-1">Audit daily cash flows, process settlements, and distribute automated WhatsApp receipt logs.</p>
        </div>
      </div>

      {/* Filter and Search Section */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search patient, invoice receipt number, or treatment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 focus:bg-white rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
          />
        </div>
      </div>

      {/* Table Ledger */}
      {loading && billingRecords.length === 0 ? (
        <div className="flex justify-center items-center h-60">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Receipt No / Date</th>
                  <th className="px-6 py-4">Patient Name</th>
                  <th className="px-6 py-4">Treatment / Procedure</th>
                  <th className="px-6 py-4">Settled Amount</th>
                  <th className="px-6 py-4">Payment Method</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">
                      <IndianRupee className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      No billing records found.
                    </td>
                  </tr>
                ) : (
                  filteredBills.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                      
                      {/* Receipt & Date */}
                      <td className="px-6 py-4 font-medium text-slate-700">
                        {b.receiptNo ? (
                          <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded text-xs border border-teal-100/50">
                            {b.receiptNo}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs font-mono">DRAFT</span>
                        )}
                        <div className="text-slate-400 text-[10px] mt-1">{b.date}</div>
                      </td>

                      {/* Patient Name */}
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {b.patientName}
                      </td>

                      {/* Treatment */}
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {b.treatment}
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 font-bold text-slate-800">
                        ₹{b.amount.toLocaleString('en-IN')}
                      </td>

                      {/* Method */}
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {b.paymentMethod || <span className="text-slate-300 italic text-xs">Unsettled</span>}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase flex items-center gap-1 w-max ${
                          b.status === 'Paid' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {b.status === 'Paid' ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" /> Settled
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 animate-pulse" /> Pending
                            </>
                          )}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="px-6 py-4 text-right">
                        {b.status === 'Pending' ? (
                          <button
                            onClick={() => handleOpenPaymentModal(b)}
                            className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                          >
                            Collect cash
                          </button>
                        ) : (
                          <button
                            onClick={() => setViewingReceipt(b)}
                            className="text-xs text-slate-500 hover:text-teal-600 font-semibold flex items-center gap-1 ml-auto hover:underline cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" /> View Receipt
                          </button>
                        )}
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settle Payment Modal */}
      {selectedBill && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-100 shadow-2xl overflow-hidden">
            
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Collect & Settle Invoice</h3>
                <p className="text-xs text-slate-400 mt-0.5">Settle dues for {selectedBill.patientName}</p>
              </div>
              <button onClick={() => setSelectedBill(null)} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSettlePayment} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Treatment Performed</label>
                <p className="text-sm font-semibold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {selectedBill.treatment}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Settlement Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-600"
                >
                  <option value="UPI (GPay)">UPI (Google Pay / PhonePe)</option>
                  <option value="UPI (Paytm)">UPI (Paytm / BHIM)</option>
                  <option value="Cash">Physical Cash Payment</option>
                  <option value="Credit Card">Credit / Debit Card swipe</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Amount Collected (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                </div>
              </div>

              <div className="flex gap-2 border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBill(null)}
                  className="flex-1 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm cursor-pointer"
                >
                  Confirm & Send Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Viewing Receipt Drawer */}
      {viewingReceipt && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white max-w-md w-full shadow-2xl rounded-3xl overflow-hidden border border-slate-100 flex flex-col p-6 animate-slide-in">
            {/* Stamp Logo banner */}
            <div className="text-center pb-4 border-b border-dashed border-slate-200 space-y-1">
              <h3 className="font-extrabold text-teal-800 text-xl tracking-tight">APEX DENTAL & SKIN</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Sector 4, Dwarka, New Delhi • Tel: 98765-XXXXX</p>
            </div>

            {/* Receipt Body metadata */}
            <div className="py-4 space-y-3.5 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Receipt Number:</span>
                <span className="font-mono font-bold text-slate-700">{viewingReceipt.receiptNo}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Payment Date:</span>
                <span className="font-medium text-slate-700">{viewingReceipt.date}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Patient Account:</span>
                <span className="font-bold text-slate-700">{viewingReceipt.patientName}</span>
              </div>
              
              {/* Receipt items list */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-2">
                <div className="flex justify-between font-bold text-slate-800 border-b border-slate-200/50 pb-2 mb-2 text-xs">
                  <span>Description</span>
                  <span>Amount</span>
                </div>
                <div className="flex justify-between text-slate-600 text-xs">
                  <span className="max-w-[70%]">{viewingReceipt.treatment}</span>
                  <span className="font-bold text-slate-800">₹{viewingReceipt.amount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Transaction Method */}
              <div className="flex justify-between items-center pt-2 text-xs">
                <span className="text-slate-400">Settled Via:</span>
                <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
                  {viewingReceipt.paymentMethod}
                </span>
              </div>

              {/* Big bold total */}
              <div className="flex justify-between items-center pt-4 border-t border-dashed border-slate-200 text-sm">
                <span className="font-bold text-slate-800">Grand Total Settled:</span>
                <span className="font-extrabold text-teal-800 text-lg">₹{viewingReceipt.amount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Stamp Image simulation */}
            <div className="relative h-14 flex items-center justify-center">
              <span className="border-2 border-emerald-600/70 text-[10px] font-extrabold tracking-widest text-emerald-600/70 uppercase px-3 py-1 rotate-[-4deg] rounded opacity-75 select-none">
                ✓ RECEIVED & SETTLED
              </span>
            </div>

            {/* Close */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setViewingReceipt(null)}
                className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
