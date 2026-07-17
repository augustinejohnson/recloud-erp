import React, { useState, useEffect } from 'react';
import { FileText, Download, CreditCard, CheckCircle2, Clock, Calendar as CalendarIcon, Briefcase, LogOut, ExternalLink, Activity, AlertCircle, UploadCloud, X } from 'lucide-react';
import { getInvoices, getProjects, updateInvoiceStatus, uploadFile } from './firebase';

export default function ClientPortalModule({ currentUser, currentTenant, tenantConfig, setCurrentUser }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Payment Modal State
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [paymentFile, setPaymentFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const allInvoices = await getInvoices(currentTenant);
      const allProjects = await getProjects(currentTenant);
      
      // The client user may have a linkedCustomerId that maps to CRM customer IDs
      const linkedCustId = currentUser?.linkedCustomerId;
      const userName = currentUser?.name?.toLowerCase();
      const userId = currentUser?.id;
      
      // Filter invoices: match by linkedCustomerId (CRM bridge), clientId (direct), or customerName (fallback)
      const myInvoices = allInvoices.filter(inv => {
        if (linkedCustId && inv.customerId === linkedCustId) return true;
        if (inv.clientId === userId) return true;
        if (inv.customerName?.toLowerCase() === userName) return true;
        return false;
      });
      
      // Filter projects: same multi-match logic
      const myProjects = allProjects.filter(proj => {
        if (linkedCustId && proj.clientId === linkedCustId) return true;
        if (proj.clientId === userId) return true;
        if (proj.clientName?.toLowerCase() === userName) return true;
        return false;
      });

      setInvoices(myInvoices);
      setProjects(myProjects);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [currentTenant]);

  const handlePayInvoice = async (invoice) => {
    setPaymentInvoice(invoice);
    setPaymentFile(null);
  };

  const submitPayment = async () => {
    if (!paymentFile) return alert("Please upload your payment receipt first.");
    setIsUploading(true);
    try {
      // 1. Upload the receipt file
      const ext = paymentFile.name.split('.').pop();
      const path = `receipts/${currentTenant}/${paymentInvoice.id}_${Date.now()}.${ext}`;
      const receiptUrl = await uploadFile(paymentFile, path);
      
      // 2. Update invoice status to 'Pending Verification' and attach receiptUrl
      await updateInvoiceStatus(paymentInvoice.id, 'Pending Verification', currentTenant, { receiptUrl });
      
      // 3. Refresh and close
      await loadData();
      setPaymentInvoice(null);
      setPaymentFile(null);
      alert('Receipt uploaded successfully! The accountant will verify it shortly.');
    } catch (err) {
      console.error(err);
      alert('Failed to upload receipt. Please try again.');
    }
    setIsUploading(false);
  };

  const printInvoice = (invoice) => {
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Invoice #${invoice.invoiceNumber || invoice.id.substring(0,8)}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #1e293b; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
        .brand { font-size: 20px; font-weight: 900; color: #3b82f6; }
        .invoice-title { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
        td { padding: 4px 8px; border-bottom: 1px solid #f1f5f9; font-size: 10px; }
        .total-row { background: #3b82f6; color: white; }
        .total-row td { font-weight: 900; font-size: 12px; }
      </style></head><body>
      <div class="header">
        <div>
          <div class="brand">☁ ${tenantConfig?.companyName || 'Recloud Services'}</div>
          <div class="invoice-title">Client Invoice</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 20px; font-weight: 900; color: #1e293b;">#${invoice.invoiceNumber || invoice.id.substring(0,8)}</div>
          <div style="font-size: 13px; color: #64748b;">${invoice.date}</div>
        </div>
      </div>
      <p><strong>Bill To:</strong> ${invoice.customerName}</p>
      <table>
        <thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Price</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>
          ${(invoice.items||[]).map((it, i) => `<tr><td>${i+1}</td><td><strong>${it.name}</strong></td><td>${it.qty}</td><td>₦${Number(it.unitPrice).toLocaleString()}</td><td style="text-align:right">₦${(it.qty*it.unitPrice).toLocaleString()}</td></tr>`).join('')}
          <tr class="total-row"><td colspan="4" style="text-align:right">TOTAL</td><td style="text-align:right">₦${Number(invoice.totalAmount).toLocaleString()}</td></tr>
        </tbody>
      </table>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  // Normalize: CRM uses 'amount' + statuses like 'Draft/Sent/Paid', Portal uses 'totalAmount' + 'paid/unpaid'
  const getInvoiceAmount = (inv) => Number(inv.totalAmount || inv.amount || 0);
  const isUnpaid = (inv) => inv.status !== 'Paid' && inv.status !== 'paid' && inv.status !== 'Pending Verification';
  const isPending = (inv) => inv.status === 'Pending Verification';
  const outstandingTotal = invoices.filter(isUnpaid).reduce((sum, i) => sum + getInvoiceAmount(i), 0);

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Top Navbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 leading-tight">{tenantConfig?.companyName || 'Company'} Portal</h1>
            </div>
          </div>
          
          <div className="hidden md:flex bg-slate-100 p-1 rounded-xl gap-1">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Dashboard</button>
            <button onClick={() => setActiveTab('projects')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'projects' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>My Projects</button>
            <button onClick={() => setActiveTab('invoices')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'invoices' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              Invoices
              {invoices.filter(isUnpaid).length > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{invoices.filter(isUnpaid).length}</span>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-800">{currentUser?.name}</p>
            <p className="text-xs font-medium text-slate-500">Client Account</p>
          </div>
          <button onClick={() => setCurrentUser(null)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <div className="md:hidden flex bg-white border-b border-slate-200 overflow-x-auto">
        <button onClick={() => setActiveTab('dashboard')} className={`flex-1 py-3 text-sm font-bold border-b-2 whitespace-nowrap px-4 ${activeTab === 'dashboard' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>Dashboard</button>
        <button onClick={() => setActiveTab('projects')} className={`flex-1 py-3 text-sm font-bold border-b-2 whitespace-nowrap px-4 ${activeTab === 'projects' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>Projects</button>
        <button onClick={() => setActiveTab('invoices')} className={`flex-1 py-3 text-sm font-bold border-b-2 whitespace-nowrap px-4 ${activeTab === 'invoices' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>Invoices</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full"></div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
            
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                      <Activity className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase">Active Projects</p>
                      <h3 className="text-2xl font-black text-slate-800">{projects.length}</h3>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase">Unpaid Invoices</p>
                      <h3 className="text-2xl font-black text-slate-800">{invoices.filter(isUnpaid).length}</h3>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase">Outstanding Balance</p>
                      <h3 className="text-2xl font-black text-red-600">₦{outstandingTotal.toLocaleString()}</h3>
                    </div>
                  </div>
                </div>

                {outstandingTotal > 0 && (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3 text-red-800">
                      <AlertCircle className="w-5 h-5" />
                      <div>
                        <h4 className="font-bold text-sm">Action Required</h4>
                        <p className="text-xs opacity-90">You have ₦{outstandingTotal.toLocaleString()} in unpaid invoices.</p>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('invoices')} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-red-700 transition-colors">
                      View Invoices
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Projects Tab */}
            {activeTab === 'projects' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-800">My Service Projects</h3>
                </div>
                {projects.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No active projects found.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {projects.map(p => (
                      <div key={p.id} className="p-5 hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-slate-800 text-lg">{p.name}</h4>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${p.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                            {p.status || 'Active'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-4">{p.description || 'No description provided.'}</p>
                        <div className="flex gap-4 text-xs font-medium text-slate-500">
                          <span className="flex items-center gap-1.5"><CalendarIcon className="w-4 h-4"/> Start: {p.startDate || 'N/A'}</span>
                          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4"/> End: {p.endDate || 'N/A'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-800">Billing & Invoices</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                        <th className="p-4 font-bold">Invoice ID</th>
                        <th className="p-4 font-bold">Date</th>
                        <th className="p-4 font-bold text-right">Amount</th>
                        <th className="p-4 font-bold">Status</th>
                        <th className="p-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.length === 0 ? (
                        <tr><td colSpan="5" className="p-8 text-center text-slate-500">No invoices found.</td></tr>
                      ) : (
                        invoices.map(inv => (
                          <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 text-sm font-bold text-slate-800">#{inv.invoiceNumber || inv.id.substring(0,6)}</td>
                            <td className="p-4 text-sm text-slate-600">{inv.date ? new Date(inv.date).toLocaleDateString() : '—'}</td>
                            <td className="p-4 text-sm font-black text-slate-800 text-right">₦{getInvoiceAmount(inv).toLocaleString()}</td>
                            <td className="p-4">
                              {isPending(inv) ? (
                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-yellow-100 text-yellow-700">PENDING VERIFICATION</span>
                              ) : (
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${!isUnpaid(inv) ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                  {!isUnpaid(inv) ? 'PAID' : 'UNPAID'}
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right flex items-center justify-end gap-2">
                              {isUnpaid(inv) && (
                                <button 
                                  onClick={() => handlePayInvoice(inv)}
                                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                                >
                                  <CreditCard className="w-3.5 h-3.5" /> Pay Now
                                </button>
                              )}
                              <button onClick={() => printInvoice(inv)} className="text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5">
                                <Download className="w-3.5 h-3.5" /> PDF
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
          </div>
        )}
      </div>

      {/* Payment Upload Modal */}
      {paymentInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" /> Complete Payment
              </h2>
              <button onClick={() => setPaymentInvoice(null)} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1.5 shadow-sm">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-center">
                <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Amount Due</p>
                <h3 className="text-3xl font-black text-blue-700">₦{getInvoiceAmount(paymentInvoice).toLocaleString()}</h3>
                <p className="text-sm text-blue-600 mt-1 font-medium">Invoice #{paymentInvoice.invoiceNumber || paymentInvoice.id.substring(0,8)}</p>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Bank Transfer Details</h4>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500 font-medium">Bank Name</span>
                    <span className="text-sm font-bold text-slate-800">{tenantConfig?.bankName || 'Not configured'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500 font-medium">Account Name</span>
                    <span className="text-sm font-bold text-slate-800">{tenantConfig?.accountName || 'Not configured'}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                    <span className="text-sm text-slate-500 font-medium">Account Number</span>
                    <span className="text-lg font-black text-slate-800 tracking-wider">{tenantConfig?.accountNumber || 'Not configured'}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2 text-center">Please make a transfer to the account above and upload the receipt below.</p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Upload Receipt</h4>
                <label className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <UploadCloud className={`w-8 h-8 mb-2 ${paymentFile ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <span className="text-sm font-bold text-slate-700 text-center">
                    {paymentFile ? paymentFile.name : 'Click to upload proof of payment'}
                  </span>
                  <span className="text-xs text-slate-500 mt-1">Image or PDF</span>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*,.pdf"
                    onChange={(e) => setPaymentFile(e.target.files[0])}
                  />
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setPaymentInvoice(null)} 
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={submitPayment} 
                disabled={!paymentFile || isUploading}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all flex items-center gap-2 ${(!paymentFile || isUploading) ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'}`}
              >
                {isUploading ? 'Uploading...' : 'Submit Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
