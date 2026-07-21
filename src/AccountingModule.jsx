import React, { useState } from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, FileText, CheckCircle2, XCircle, Calculator, Package, AlertTriangle 
} from 'lucide-react';
import { addExpense, updateExpense, getContracts, addContract, updateContract, deleteContract, addInvoice, addLedgerEntry, getTimeEntries, updateTimeEntry } from './firebase';
import { PlusCircle, RefreshCw, Landmark, ArrowRightLeft, Trash2 } from 'lucide-react';

export default function AccountingModule({ 
  ledger = [], 
  expenses = [], 
  sales = [],
  b2bOrders = [],
  purchaseOrders = [],
  invoices = [],
  payslips = [],
  currentTenant,
  currentUser,
  currentIndustry,
  refreshData
}) {
  const isAdminOrAccountant = ['admin', 'super_admin', 'accountant'].includes(currentUser?.role);
  const [activeTab, setActiveTab] = useState(isAdminOrAccountant ? 'pl' : 'expenses'); // pl, arap, ledger, expenses, taxes

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: '',
    category: 'Office Supplies',
    status: isAdminOrAccountant ? 'Approved' : 'Pending',
    items: [{ desc: '', amount: '' }]
  });

  const [contracts, setContracts] = useState([]);
  const [isContractsLoading, setIsContractsLoading] = useState(false);

  React.useEffect(() => {
    if (activeTab === 'contracts' && isAdminOrAccountant) {
      loadContracts();
    }
    if (activeTab === 'arap' && currentIndustry === 'law_firm') {
      loadUnbilledTime();
    }
  }, [activeTab, currentTenant, currentIndustry]);

  const [unbilledTimeEntries, setUnbilledTimeEntries] = useState([]);
  const loadUnbilledTime = async () => {
    try {
      const entries = await getTimeEntries(currentTenant);
      setUnbilledTimeEntries(entries.filter(e => !e.billed));
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateInvoiceFromTime = async (projectId) => {
    const entries = unbilledTimeEntries.filter(e => e.projectId === projectId);
    if(entries.length === 0) return;
    const totalAmount = entries.reduce((s, e) => s + (e.hours * e.rate), 0);
    const invoiceData = {
      clientId: entries[0].clientId || '',
      customerName: entries[0].projectName,
      date: new Date().toLocaleDateString('en-US'),
      dueDate: new Date(Date.now() + 14 * 86400000).toLocaleDateString('en-US'),
      items: entries.map(e => ({ name: `${e.description} (${e.date})`, qty: e.hours, unitPrice: e.rate })),
      amount: totalAmount,
      status: 'Sent',
      type: 'invoice',
      notes: `Generated for Case: ${entries[0].projectName}`
    };
    
    try {
      await addInvoice(invoiceData, currentTenant);
      for (const e of entries) {
        await updateTimeEntry(e.id, { billed: true }, currentTenant);
      }
      loadUnbilledTime();
      refreshData();
      alert("Invoice generated successfully.");
    } catch(err) {
      console.error(err);
      alert("Failed to generate invoice.");
    }
  };

  const loadContracts = async () => {
    setIsContractsLoading(true);
    try {
      const data = await getContracts(currentTenant);
      setContracts(data);
    } catch (err) {
      console.error(err);
    }
    setIsContractsLoading(false);
  };

  const handleRunBilling = async () => {
    if (confirm("Generate invoices for all active contracts?")) {
      for (const contract of contracts.filter(c => c.status === 'Active')) {
        const invoiceData = {
          clientId: contract.clientId || '',
          customerName: contract.customerName,
          date: new Date().toLocaleDateString('en-US'),
          dueDate: new Date(Date.now() + 14 * 86400000).toLocaleDateString('en-US'),
          items: [{ name: contract.serviceName, qty: 1, unitPrice: contract.amount }],
          totalAmount: contract.amount,
          status: 'unpaid',
          type: 'recurring_contract'
        };
        await addInvoice(invoiceData, currentTenant);
      }
      alert("Billing cycle completed!");
      refreshData();
    }
  };

  // Derived Data for P&L
  const posSalesTotal = sales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
  const posCogsTotal = sales.reduce((sum, s) => sum + (Number(s.totalCost) || 0), 0);
  
  const b2bSalesTotal = b2bOrders.filter(o => o.status !== 'rejected').reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const b2bCogsTotal = b2bOrders.filter(o => o.status !== 'rejected').reduce((sum, o) => sum + (Number(o.totalCost) || 0), 0);

  const crmSalesTotal = (invoices || []).filter(i => i.status === 'Paid' && i.type !== 'quote').reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  const totalGrossRevenue = posSalesTotal + b2bSalesTotal + crmSalesTotal;
  const totalCOGS = posCogsTotal + b2bCogsTotal;
  const grossProfit = totalGrossRevenue - totalCOGS;

  const operatingLedger = ledger.filter(l => l.accountType !== 'trust');
  const trustLedger = ledger.filter(l => l.accountType === 'trust');

  const approvedExpenses = expenses.filter(e => e.status === 'Approved').reduce((sum, e) => sum + Number(e.amount), 0);
  const ledgerExpenses = operatingLedger.filter(l => l.type === 'Expense').reduce((sum, l) => sum + Number(l.amount), 0);
  const payrollExpenses = (payslips || []).filter(p => p.status === 'Paid').reduce((sum, p) => sum + Number(p.netPay || 0), 0);

  const totalOperatingExpenses = approvedExpenses + ledgerExpenses + payrollExpenses;
  
  const netIncome = grossProfit - totalOperatingExpenses;
  
  const totalTaxCollected = sales.reduce((sum, s) => sum + Number(s.taxAmount || 0), 0) + operatingLedger.reduce((sum, l) => sum + Number(l.taxCollected || 0), 0);

  // Derived Data for AR / AP
  const b2bReceivable = b2bOrders.filter(o => o.paymentStatus !== 'paid' && o.status !== 'rejected').reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const crmReceivable = (invoices || []).filter(i => (i.status === 'Sent' || i.status === 'Overdue' || i.status === 'Pending Verification') && i.type !== 'quote').reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const accountsReceivable = b2bReceivable + crmReceivable;
  
  const accountsPayable = (purchaseOrders || []).filter(o => o.status !== 'Paid').reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const validItems = newExpense.items.filter(i => i.desc && i.amount);
    if (validItems.length === 0 || !newExpense.description) return alert("Please enter a description and at least one item.");

    const totalAmount = validItems.reduce((sum, item) => sum + Number(item.amount), 0);

    try {
      await addExpense({
        description: newExpense.description,
        category: newExpense.category,
        status: newExpense.status,
        amount: totalAmount,
        items: validItems,
        submittedBy: currentUser?.name || 'Unknown',
        submittedAt: new Date().toISOString()
      }, currentTenant);

      setIsExpenseModalOpen(false);
      setNewExpense({ description: '', category: 'Office Supplies', status: isAdminOrAccountant ? 'Approved' : 'Pending', items: [{ desc: '', amount: '' }] });
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveExpense = async (expenseId) => {
    try {
      await updateExpense(expenseId, { status: 'Approved', approvedBy: currentUser?.name, approvedAt: new Date().toISOString() }, currentTenant);
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectExpense = async (expenseId) => {
    try {
      await updateExpense(expenseId, { status: 'Rejected', rejectedBy: currentUser?.name, rejectedAt: new Date().toISOString() }, currentTenant);
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const renderPLStatement = () => (
    <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto relative z-10">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Profit & Loss Statement</h2>
          <p className="text-slate-500 font-medium text-sm">Real-time aggregate of all revenues and expenses</p>
        </div>
        <button className="bg-recloud-600 hover:bg-recloud-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-recloud-500/20 flex gap-2 transition-all hover:-translate-y-0.5"><FileText className="w-4 h-4"/> Export PDF</button>
      </div>

      <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl shadow-indigo-900/5 border border-white/50 overflow-hidden text-sm">
        <div className="p-6 border-b border-white/50 bg-indigo-50/30 flex justify-between items-center">
          <span className="font-bold text-slate-600 uppercase tracking-wider">Gross Revenue</span>
          <span className="text-xl font-black text-slate-800">₦{totalGrossRevenue.toLocaleString()}</span>
        </div>
        {currentIndustry !== 'law_firm' && (
          <>
            <div className="p-4 flex justify-between items-center border-b border-slate-100 pl-10 bg-white">
              <span className="text-slate-600 font-medium">POS Retail Sales</span>
              <span className="font-bold text-slate-800">₦{posSalesTotal.toLocaleString()}</span>
            </div>
            <div className="p-4 flex justify-between items-center border-b border-slate-100 pl-10 bg-white">
              <span className="text-slate-600 font-medium">B2B Wholesale Orders</span>
              <span className="font-bold text-slate-800">₦{b2bSalesTotal.toLocaleString()}</span>
            </div>
          </>
        )}
        <div className="p-4 flex justify-between items-center border-b border-slate-200 pl-10 bg-white">
          <span className="text-slate-600 font-medium">CRM Invoices (Paid)</span>
          <span className="font-bold text-slate-800">₦{crmSalesTotal.toLocaleString()}</span>
        </div>

        {currentIndustry !== 'law_firm' && (
          <>
            <div className="p-6 border-b border-slate-200 bg-red-50/30 flex justify-between items-center">
              <span className="font-bold text-slate-600 uppercase tracking-wider">Cost of Goods Sold (COGS)</span>
              <span className="text-xl font-black text-red-600">-₦{totalCOGS.toLocaleString()}</span>
            </div>
            <div className="p-4 flex justify-between items-center border-b border-slate-100 pl-10 bg-white">
              <span className="text-slate-600 font-medium">POS Inventory Cost</span>
              <span className="font-bold text-slate-800">₦{posCogsTotal.toLocaleString()}</span>
            </div>
            <div className="p-4 flex justify-between items-center border-b border-slate-200 pl-10 bg-white">
              <span className="text-slate-600 font-medium">B2B Inventory Cost</span>
              <span className="font-bold text-slate-800">₦{b2bCogsTotal.toLocaleString()}</span>
            </div>
            <div className="p-6 border-b border-slate-200 bg-emerald-50/50 flex justify-between items-center">
              <span className="font-black text-emerald-800 text-lg uppercase tracking-wider">Gross Profit</span>
              <span className="text-2xl font-black text-emerald-600">₦{grossProfit.toLocaleString()}</span>
            </div>
          </>
        )}

        <div className="p-6 border-b border-slate-200 bg-orange-50/30 flex justify-between items-center">
          <span className="font-bold text-slate-600 uppercase tracking-wider">Operating Expenses</span>
          <span className="text-xl font-black text-orange-600">-₦{totalOperatingExpenses.toLocaleString()}</span>
        </div>
        <div className="p-4 flex justify-between items-center border-b border-slate-100 pl-10 bg-white">
          <span className="text-slate-600 font-medium">Approved Staff Expenses</span>
          <span className="font-bold text-slate-800">₦{approvedExpenses.toLocaleString()}</span>
        </div>
        <div className="p-4 flex justify-between items-center border-b border-slate-100 pl-10 bg-white">
          <span className="text-slate-600 font-medium">Manual Ledger Expenses</span>
          <span className="font-bold text-slate-800">₦{ledgerExpenses.toLocaleString()}</span>
        </div>
        <div className="p-4 flex justify-between items-center border-b border-slate-200 pl-10 bg-white">
          <span className="text-slate-600 font-medium">HR Payroll (Paid)</span>
          <span className="font-bold text-slate-800">₦{payrollExpenses.toLocaleString()}</span>
        </div>

        <div className={`p-8 flex justify-between items-center ${netIncome >= 0 ? 'bg-gradient-to-r from-recloud-800 to-recloud-600 text-white' : 'bg-gradient-to-r from-red-800 to-red-600 text-white'}`}>
          <span className="font-black text-2xl uppercase tracking-wider">Net Income</span>
          <span className="text-4xl font-black drop-shadow-md">₦{netIncome.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );

  const renderARAP = () => (
    <div className="space-y-6 animate-in fade-in relative z-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white/70 backdrop-blur-xl p-8 rounded-3xl shadow-xl shadow-blue-900/5 border border-white/50 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><TrendingUp className="w-5 h-5"/></div>
            <h3 className="text-lg font-bold text-slate-800">Accounts Receivable</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">Money owed to you by customers (Unpaid B2B Orders).</p>
          <h2 className="text-4xl font-black text-blue-600 mb-6">₦{accountsReceivable.toLocaleString()}</h2>
          <div className="border-t border-slate-100 pt-4 overflow-y-auto max-h-64 pr-2">
            {currentIndustry !== 'law_firm' && b2bOrders.filter(o => o.paymentStatus !== 'paid' && o.status !== 'rejected').map(order => (
              <div key={order.id} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
                <div>
                  <p className="font-bold text-slate-800 text-sm">{order.userName || 'B2B Customer'}</p>
                  <p className="text-xs font-mono text-slate-400">INV-{order.invoiceNumber || order.id.slice(-6).toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800 text-sm">₦{Number(order.totalAmount).toLocaleString()}</p>
                  <p className="text-xs font-bold text-amber-600">Pending</p>
                </div>
              </div>
            ))}
            {currentIndustry === 'law_firm' && (invoices || []).filter(i => i.status === 'Sent' || i.status === 'Overdue').map(inv => (
              <div key={inv.id} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
                <div>
                  <p className="font-bold text-slate-800 text-sm">{inv.customerName}</p>
                  <p className="text-xs font-mono text-slate-400">{inv.invoiceNumber || inv.id.slice(-6).toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800 text-sm">₦{Number(inv.amount).toLocaleString()}</p>
                  <p className="text-xs font-bold text-amber-600">{inv.status}</p>
                </div>
              </div>
            ))}
            {((currentIndustry !== 'law_firm' && b2bOrders.filter(o => o.paymentStatus !== 'paid' && o.status !== 'rejected').length === 0) || (currentIndustry === 'law_firm' && (invoices || []).filter(i => i.status === 'Sent' || i.status === 'Overdue').length === 0)) && (
              <p className="text-sm text-slate-400 text-center py-4 font-medium">All invoices are paid.</p>
            )}
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl p-8 rounded-3xl shadow-xl shadow-red-900/5 border border-white/50 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-lg text-red-600"><TrendingDown className="w-5 h-5"/></div>
            <h3 className="text-lg font-bold text-slate-800">Accounts Payable</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">Money you owe to suppliers (Unpaid Purchase Orders).</p>
          <h2 className="text-4xl font-black text-red-600 mb-6">₦{accountsPayable.toLocaleString()}</h2>
          <div className="border-t border-slate-100 pt-4 overflow-y-auto max-h-64 pr-2">
            {(purchaseOrders || []).filter(o => o.status !== 'Paid').map(order => (
              <div key={order.id} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
                <div>
                  <p className="font-bold text-slate-800 text-sm">Supplier ID: {order.supplierId}</p>
                  <p className="text-xs font-mono text-slate-400">PO-{order.id.slice(-6).toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800 text-sm">₦{Number(order.totalAmount).toLocaleString()}</p>
                  <p className="text-xs font-bold text-red-600">Owed</p>
                </div>
              </div>
            ))}
            {(purchaseOrders || []).filter(o => o.status !== 'Paid').length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4 font-medium">No outstanding purchase orders.</p>
            )}
          </div>
        </div>
      </div>

      {currentIndustry === 'law_firm' && (
        <div className="bg-white/70 backdrop-blur-xl p-8 rounded-3xl shadow-xl shadow-slate-900/5 border border-white/50 mt-8">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Unbilled Time (Ready for Invoicing)</h3>
          {unbilledTimeEntries.length === 0 ? (
            <p className="text-sm text-slate-500 font-medium">No unbilled time entries.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(unbilledTimeEntries.reduce((acc, curr) => {
                if(!acc[curr.projectId]) acc[curr.projectId] = { projectName: curr.projectName, entries: [], total: 0 };
                acc[curr.projectId].entries.push(curr);
                acc[curr.projectId].total += (curr.hours * curr.rate);
                return acc;
              }, {})).map(([projectId, data]) => (
                <div key={projectId} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div>
                    <h4 className="font-bold text-slate-800">{data.projectName}</h4>
                    <p className="text-xs text-slate-500">{data.entries.length} entries totaling ₦{data.total.toLocaleString()}</p>
                  </div>
                  <button onClick={() => handleGenerateInvoiceFromTime(projectId)} className="bg-recloud-600 hover:bg-recloud-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-recloud-500/20 transition-all flex items-center gap-2">
                    <FileText className="w-4 h-4"/> Generate Invoice
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderLedger = () => (
    <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl shadow-indigo-900/5 border border-white/50 overflow-hidden animate-in fade-in relative z-10">
      <div className="p-8 border-b border-white/50 bg-indigo-50/20">
        <h3 className="text-lg font-bold text-slate-800">General Ledger</h3>
        <p className="text-sm text-slate-500">Automated double-entry records.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-bold">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Reference</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Author</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {operatingLedger.sort((a,b) => new Date(b.date) - new Date(a.date)).map(entry => (
              <tr key={entry.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-slate-600">{new Date(entry.date).toLocaleString()}</td>
                <td className="px-6 py-4 font-mono text-xs text-slate-400">{entry.referenceId || '-'}</td>
                <td className="px-6 py-4 text-slate-800 font-medium">{entry.description}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${entry.type === 'Revenue' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {entry.type}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-slate-800">₦{Number(entry.amount).toLocaleString()}</td>
                <td className="px-6 py-4 text-slate-500">{entry.createdBy}</td>
              </tr>
            ))}
            {operatingLedger.length === 0 && (
              <tr><td colSpan="6" className="p-8 text-center text-slate-500">No ledger entries found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const trustBalance = trustLedger.reduce((sum, l) => sum + (l.type === 'Revenue' ? Number(l.amount) : -Number(l.amount)), 0);

  const renderTrustAccounts = () => (
    <div className="space-y-6 animate-in fade-in relative z-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3"><Landmark className="w-8 h-8 text-emerald-600"/> Trust Accounting</h2>
          <p className="text-slate-500 font-medium text-sm">Strictly separate client retainers from firm operating funds.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={async () => {
            const client = prompt("Client Name (for Retainer):");
            if (!client) return;
            const amount = parseFloat(prompt("Deposit Amount (₦):"));
            if (amount) {
              await addLedgerEntry({
                description: `Retainer Deposit - ${client}`,
                type: 'Revenue',
                amount: amount,
                date: new Date().toISOString(),
                accountType: 'trust',
                createdBy: currentUser?.name || 'Admin'
              }, currentTenant);
              refreshData();
            }
          }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all hover:-translate-y-0.5">
            <PlusCircle className="w-4 h-4"/> Log Trust Deposit
          </button>
          
          <button onClick={async () => {
            if (trustBalance <= 0) return alert("No funds in Trust Account.");
            const amount = parseFloat(prompt(`Transfer Amount (Max ₦${trustBalance.toLocaleString()}):`));
            if (amount && amount <= trustBalance) {
               // Deduct from Trust
               await addLedgerEntry({
                 description: `Transfer to Operating - Earned Fees`,
                 type: 'Expense',
                 amount: amount,
                 date: new Date().toISOString(),
                 accountType: 'trust',
                 createdBy: currentUser?.name || 'Admin'
               }, currentTenant);
               // Add to Operating
               await addLedgerEntry({
                 description: `Transfer from Trust - Earned Fees`,
                 type: 'Revenue',
                 amount: amount,
                 date: new Date().toISOString(),
                 accountType: 'operating',
                 createdBy: currentUser?.name || 'Admin'
               }, currentTenant);
               refreshData();
            } else if (amount > trustBalance) {
               alert("Insufficient Trust funds.");
            }
          }} className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-all">
            <ArrowRightLeft className="w-4 h-4"/> Transfer to Operating
          </button>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-xl p-10 rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/50 flex flex-col md:flex-row gap-8 mb-6">
        <div className="flex-1 bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
          <p className="text-emerald-700 font-bold uppercase tracking-wider text-xs mb-1">Total Trust Liability</p>
          <h3 className="text-5xl font-black text-emerald-600">₦{trustBalance.toLocaleString()}</h3>
          <p className="text-emerald-600/70 text-sm mt-2 font-medium">Unearned client funds held in trust.</p>
        </div>
        <div className="flex-1 bg-blue-50 rounded-2xl p-6 border border-blue-100">
          <p className="text-blue-700 font-bold uppercase tracking-wider text-xs mb-1">Total Operating Revenue</p>
          <h3 className="text-5xl font-black text-blue-600">₦{totalGrossRevenue.toLocaleString()}</h3>
          <p className="text-blue-600/70 text-sm mt-2 font-medium">Earned funds available for firm operations.</p>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-white">
          <h3 className="font-bold text-slate-800">Trust Ledger Activity</h3>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-bold">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4">Action</th>
              <th className="px-6 py-4">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {trustLedger.sort((a,b) => new Date(b.date) - new Date(a.date)).map(entry => (
              <tr key={entry.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-slate-600">{new Date(entry.date).toLocaleString()}</td>
                <td className="px-6 py-4 text-slate-800 font-medium">{entry.description}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${entry.type === 'Revenue' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                    {entry.type === 'Revenue' ? 'Deposit' : 'Transfer Out'}
                  </span>
                </td>
                <td className={`px-6 py-4 font-black ${entry.type === 'Revenue' ? 'text-emerald-600' : 'text-orange-600'}`}>
                  {entry.type === 'Revenue' ? '+' : '-'}₦{Number(entry.amount).toLocaleString()}
                </td>
              </tr>
            ))}
            {trustLedger.length === 0 && (
              <tr><td colSpan="4" className="p-8 text-center text-slate-500">No trust activity found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderContracts = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Service Contracts</h2>
          <p className="text-slate-500">Manage recurring billing and client retainers.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={async () => {
            const name = prompt("Client Name:");
            if (!name) return;
            const service = prompt("Service Name:");
            if (!service) return;
            const amountStr = prompt("Monthly Amount (₦):");
            if (!amountStr) return;
            
            // Clean up the string to remove commas before parsing
            const amount = parseFloat(amountStr.replace(/,/g, ''));
            if (isNaN(amount) || amount <= 0) {
              alert("Please enter a valid numeric amount (e.g. 50000).");
              return;
            }
            
            try {
              await addContract({ customerName: name, serviceName: service, amount, status: 'Active' }, currentTenant);
              loadContracts();
              alert("Contract created successfully!");
            } catch (err) {
              console.error(err);
              alert("Failed to create contract: " + err.message);
            }
          }} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 flex items-center gap-2">
            <PlusCircle className="w-4 h-4" /> New Contract
          </button>
          <button onClick={handleRunBilling} className="bg-recloud-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-recloud-500/20 hover:bg-recloud-700 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Run Billing Cycle
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
              <th className="p-4 font-bold">Client</th>
              <th className="p-4 font-bold">Service</th>
              <th className="p-4 font-bold">Amount</th>
              <th className="p-4 font-bold">Status</th>
              <th className="p-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isContractsLoading ? (
               <tr><td colSpan="5" className="p-8 text-center text-slate-500">Loading contracts...</td></tr>
            ) : contracts.length === 0 ? (
               <tr><td colSpan="5" className="p-8 text-center text-slate-500">No active contracts found.</td></tr>
            ) : contracts.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-bold text-slate-800">{c.customerName}</td>
                <td className="p-4 text-slate-600">{c.serviceName}</td>
                <td className="p-4 font-black text-slate-800">₦{Number(c.amount).toLocaleString()}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${c.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {c.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {c.status === 'Active' && (
                      <button onClick={async () => {
                        if(confirm("Cancel this contract?")) {
                          await updateContract(c.id, { status: 'Cancelled' }, currentTenant);
                          loadContracts();
                        }
                      }} className="text-orange-500 hover:text-orange-700 text-xs font-bold bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition-colors">Cancel</button>
                    )}
                    <button onClick={async () => {
                      if(confirm("Delete this contract permanently?")) {
                        await deleteContract(c.id, currentTenant);
                        loadContracts();
                      }
                    }} className="text-red-500 hover:text-red-700 text-xs font-bold bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5 inline-block mb-0.5" /> Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderExpenses = () => {
    // Filter expenses if not admin/accountant
    const visibleExpenses = isAdminOrAccountant ? expenses : expenses.filter(e => e.submittedBy === currentUser?.name);

    return (
      <div className="space-y-6 animate-in fade-in relative z-10">
        <div className="flex justify-between items-center">
          <h3 className="text-3xl font-black text-slate-800 tracking-tight">Expense Requests</h3>
          <button onClick={() => setIsExpenseModalOpen(true)} className="bg-recloud-600 hover:bg-recloud-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-recloud-500/20 transition-all hover:-translate-y-0.5">
            + Request Expense
          </button>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl shadow-indigo-900/5 border border-white/50 overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[800px]">
            <thead className="bg-slate-50 text-slate-500 font-bold">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Submitted By</th>
                <th className="px-6 py-4">Status</th>
                {isAdminOrAccountant && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleExpenses.sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt)).map(exp => (
                <tr key={exp.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-slate-600">{new Date(exp.submittedAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-slate-800 font-medium">{exp.description}</td>
                  <td className="px-6 py-4 text-slate-500">{exp.category}</td>
                  <td className="px-6 py-4 font-bold text-slate-800">₦{Number(exp.amount).toLocaleString()}</td>
                  <td className="px-6 py-4 text-slate-500">{exp.submittedBy}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      exp.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                      exp.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {exp.status}
                    </span>
                  </td>
                  {isAdminOrAccountant && (
                    <td className="px-6 py-4 text-right space-x-2">
                      {exp.status === 'Pending' && (
                        <>
                          <button onClick={() => handleApproveExpense(exp.id)} className="text-emerald-600 hover:text-emerald-800 font-bold"><CheckCircle2 className="w-5 h-5"/></button>
                          <button onClick={() => handleRejectExpense(exp.id)} className="text-red-600 hover:text-red-800 font-bold"><XCircle className="w-5 h-5"/></button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {visibleExpenses.length === 0 && (
                <tr><td colSpan={isAdminOrAccountant ? "7" : "6"} className="p-8 text-center text-slate-500">No expenses found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const taxableSalesAmount = sales.filter(s => s.taxPercent > 0).reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
  const nonTaxableSalesAmount = sales.filter(s => !s.taxPercent || s.taxPercent === 0).reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0) + b2bOrders.filter(o => o.status !== 'rejected').reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

  const renderTaxes = () => (
    <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto relative z-10">
      <div className="bg-white/70 backdrop-blur-xl p-10 rounded-3xl shadow-xl shadow-indigo-900/5 border border-white/50">
        <h3 className="text-2xl font-black text-slate-800 mb-2 flex items-center gap-3"><Calculator className="w-8 h-8 text-recloud-600"/> Tax Filing Summary</h3>
        <p className="text-slate-500 text-sm mb-8">This aggregates all taxes manually inputted during POS checkout or invoiced to B2B customers. Use this for your monthly or quarterly VAT filings.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <p className="text-slate-500 font-bold mb-1">Total Taxable Sales</p>
            <h3 className="text-3xl font-black text-slate-800">₦{taxableSalesAmount.toLocaleString()}</h3>
          </div>
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <p className="text-slate-500 font-bold mb-1">Total Non-Taxable / Exempt Sales</p>
            <h3 className="text-3xl font-black text-slate-800">₦{nonTaxableSalesAmount.toLocaleString()}</h3>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
            <span className="font-bold text-slate-700">Total Tax Collected (Output Tax)</span>
            <span className="font-black text-2xl text-slate-800">₦{totalTaxCollected.toLocaleString()}</span>
          </div>
          
          <div className="flex justify-between items-center p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
            <span className="font-bold text-slate-500">Tax Deductible on Expenses (Input Tax)</span>
            <span className="font-black text-2xl text-slate-400">₦0.00</span>
          </div>

          <div className="flex justify-between items-center p-6 bg-recloud-50 rounded-xl border border-recloud-200 mt-6">
            <span className="font-black text-recloud-900 text-xl uppercase tracking-wider">Net Tax Payable</span>
            <span className="font-black text-4xl text-recloud-600">₦{totalTaxCollected.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/50">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="glass border-b border-white/50 px-4 md:px-8 py-4 flex-shrink-0 z-10 flex flex-col md:flex-row justify-between items-start md:items-center sticky top-0 gap-4">
        <div className="flex gap-2 md:gap-4 overflow-x-auto no-scrollbar w-full md:w-auto pb-1 md:pb-0">
          {isAdminOrAccountant && <button onClick={() => setActiveTab('pl')} className={`px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'pl' ? 'bg-recloud-600 text-white shadow-md shadow-recloud-500/20' : 'text-slate-600 hover:bg-white/50'}`}>P&L Statement</button>}
          {isAdminOrAccountant && currentIndustry === 'law_firm' && (
            <button onClick={() => setActiveTab('trust')} className={`px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'trust' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'text-slate-600 hover:bg-white/50'}`}>Trust Accounts</button>
          )}
          {isAdminOrAccountant && <button onClick={() => setActiveTab('arap')} className={`px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'arap' ? 'bg-recloud-600 text-white shadow-md shadow-recloud-500/20' : 'text-slate-600 hover:bg-white/50'}`}>AR/AP Tracker</button>}
          {isAdminOrAccountant && <button onClick={() => setActiveTab('ledger')} className={`px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'ledger' ? 'bg-recloud-600 text-white shadow-md shadow-recloud-500/20' : 'text-slate-600 hover:bg-white/50'}`}>General Ledger</button>}
          {isAdminOrAccountant && <button onClick={() => setActiveTab('contracts')} className={`px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'contracts' ? 'bg-recloud-600 text-white shadow-md shadow-recloud-500/20' : 'text-slate-600 hover:bg-white/50'}`}>Service Contracts</button>}
          <button onClick={() => setActiveTab('expenses')} className={`px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'expenses' ? 'bg-recloud-600 text-white shadow-md shadow-recloud-500/20' : 'text-slate-600 hover:bg-white/50'}`}>Expenses</button>
          {isAdminOrAccountant && <button onClick={() => setActiveTab('taxes')} className={`px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'taxes' ? 'bg-recloud-600 text-white shadow-md shadow-recloud-500/20' : 'text-slate-600 hover:bg-white/50'}`}>Taxes</button>}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8 relative z-10 scrollbar-hide">
        {activeTab === 'pl' && isAdminOrAccountant && renderPLStatement()}
        {activeTab === 'trust' && isAdminOrAccountant && renderTrustAccounts()}
        {activeTab === 'arap' && isAdminOrAccountant && renderARAP()}
        {activeTab === 'ledger' && isAdminOrAccountant && renderLedger()}
        {activeTab === 'contracts' && isAdminOrAccountant && renderContracts()}
        {activeTab === 'expenses' && renderExpenses()}
        {activeTab === 'taxes' && isAdminOrAccountant && renderTaxes()}
      </div>

      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Request Expense</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Overall Title / Reason</label>
                <input required type="text" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" placeholder="e.g. Monthly Office Supplies" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500 bg-white">
                  <option>Office Supplies</option>
                  <option>Rent & Utilities</option>
                  <option>Travel & Meals</option>
                  <option>Maintenance</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Expense Items</label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {newExpense.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input required type="text" value={item.desc} onChange={e => {
                        const newItems = [...newExpense.items];
                        newItems[idx].desc = e.target.value;
                        setNewExpense({...newExpense, items: newItems});
                      }} className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-recloud-500" placeholder="Item details" />
                      <input required type="number" min="0" value={item.amount} onChange={e => {
                        const newItems = [...newExpense.items];
                        newItems[idx].amount = e.target.value;
                        setNewExpense({...newExpense, items: newItems});
                      }} className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-recloud-500" placeholder="₦0.00" />
                      <button type="button" onClick={() => {
                        const newItems = newExpense.items.filter((_, i) => i !== idx);
                        setNewExpense({...newExpense, items: newItems});
                      }} className="p-2 text-slate-400 hover:text-red-500"><XCircle className="w-4 h-4"/></button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setNewExpense({...newExpense, items: [...newExpense.items, { desc: '', amount: '' }]})} className="mt-2 text-xs font-bold text-recloud-600 hover:text-recloud-700">+ Add Line Item</button>
              </div>
              {!isAdminOrAccountant && (
                <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex gap-2 items-start mt-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">Your request will be marked as <strong>Pending</strong> until approved by an administrator.</p>
                </div>
              )}
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-3 rounded-xl mt-4 text-white">Submit Request</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
