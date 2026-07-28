import React, { useState } from 'react';
import emailjs from '@emailjs/browser';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Building2, Users, Receipt, Search, Plus, Mail, Phone, Calendar, Target, CreditCard, Download, Trash2, Edit, X, Activity, BarChart3, TrendingUp, Briefcase, ArrowRight, ArrowLeft, Eye, FileText, AlertTriangle, Clock, MessageCircle, ExternalLink, ShieldCheck, ShieldOff, UserPlus, CheckCircle2
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell
} from 'recharts';
import { addCustomer, updateCustomer, deleteCustomer, addDeal, updateDealStatus, updateDeal, deleteDeal, addInvoice, updateInvoiceStatus, updateInvoice, deleteInvoice, addEmployee, updateEmployee, deleteEmployee, createAuthUser, getProjects } from './firebase';

export default function CrmModule({ 
  customers = [], deals = [], invoices = [], employees = [], currentTenant, tenantConfig, currentUser, currentIndustry, refreshData 
}) {
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, customers, deals, invoices
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  
  // Modals
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', contactPerson: '', email: '', phone: '', status: 'Active', notes: [] });
  const [newNoteText, setNewNoteText] = useState('');
  const [newActivityType, setNewActivityType] = useState('Note');
  
  const [isAddDealOpen, setIsAddDealOpen] = useState(false);
  const [newDeal, setNewDeal] = useState({ name: '', customerId: '', value: '', stage: 'Lead', expectedClose: '', source: 'Website', tasks: [], nextFollowUp: '' });
  const [dealTaskInput, setDealTaskInput] = useState({});
  const [newDealTaskTexts, setNewDealTaskTexts] = useState({});
  
  const [isAddInvoiceOpen, setIsAddInvoiceOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({ customerId: '', amount: 0, status: 'Draft', type: 'invoice', currency: '$', items: [{ description: '', qty: 1, unitPrice: '' }] });
  const [verifyingInvoice, setVerifyingInvoice] = useState(null);

  const [isEditInvoiceOpen, setIsEditInvoiceOpen] = useState(false);
  const [editInvoiceData, setEditInvoiceData] = useState(null);

  // Advanced CRM States
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callTimer, setCallTimer] = useState(null);
  const [isCustomerDetailsOpen, setIsCustomerDetailsOpen] = useState(false);
  // Law Firm Conflict Check
  const [isConflictCheckOpen, setIsConflictCheckOpen] = useState(false);
  const [conflictSearchName, setConflictSearchName] = useState('');
  const [conflictResults, setConflictResults] = useState([]);
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);

  const runConflictCheck = async () => {
    if (!conflictSearchName.trim()) return;
    setIsCheckingConflict(true);
    try {
      const searchLower = conflictSearchName.toLowerCase();
      const allProjects = await getProjects(currentTenant);
      
      const results = [];
      
      // Check existing clients
      customers.forEach(c => {
        if (c.name.toLowerCase().includes(searchLower)) {
          results.push({ type: 'Client', name: c.name, id: c.id, detail: 'Existing Client' });
        }
      });
      
      // Check projects (cases)
      allProjects.forEach(p => {
        if (p.name.toLowerCase().includes(searchLower)) {
          results.push({ type: 'Case', name: p.name, id: p.id, detail: 'Case Name Match' });
        }
        if (p.opposingParty && p.opposingParty.toLowerCase().includes(searchLower)) {
          results.push({ type: 'Opposing Party', name: p.opposingParty, id: p.id, detail: `Opponent in Case: ${p.name}` });
        }
        if (p.opposingCounsel && p.opposingCounsel.toLowerCase().includes(searchLower)) {
          results.push({ type: 'Opposing Counsel', name: p.opposingCounsel, id: p.id, detail: `Counsel in Case: ${p.name}` });
        }
      });
      
      setConflictResults(results);
    } catch (err) {
      console.error(err);
    }
    setIsCheckingConflict(false);
  };


  const handleOpenEditInvoice = (inv) => {
    const items = inv.items && inv.items.length > 0 ? inv.items : [{ description: inv.description || '', qty: 1, unitPrice: inv.amount || 0 }];
    setEditInvoiceData({ ...inv, items });
    setIsEditInvoiceOpen(true);
  };

  const getFormattedInvoiceId = (inv) => {
    const compName = tenantConfig?.companyName || 'Recloud Enterprise';
    const prefix = compName.substring(0, 2).toUpperCase().padEnd(2, 'A'); // fallback if name is 1 char
    const sortedInvoices = [...invoices].sort((a, b) => new Date(a.date) - new Date(b.date));
    const invoiceIndex = sortedInvoices.findIndex(i => i.id === inv.id);
    const sequentialNumber = invoiceIndex >= 0 ? invoiceIndex + 1 : invoices.length + 1;
    const invIdNum = sequentialNumber.toString().padStart(2, '0');
    return `${prefix}-${invIdNum}`;
  };

  const getDaysInactive = (deal) => {
    const timestamp = deal.updatedAt || deal.createdAt;
    if (!timestamp) return 0;
    const updatedTime = timestamp.seconds ? timestamp.seconds * 1000 : new Date(timestamp).getTime();
    if (isNaN(updatedTime)) return 0;
    return Math.floor((Date.now() - updatedTime) / (1000 * 60 * 60 * 24));
  };

  const getCustomerLeadScore = (cust) => {
    // Score based on: Lifetime Value, Order Count, Recency of last note/activity
    const customerInvoices = invoices.filter(i => i.customerId === cust.id && i.status === 'Paid');
    const totalSpent = customerInvoices.reduce((sum, i) => sum + Number(i.amount), 0);
    const orderCount = customerInvoices.length;
    
    let score = 30; // base score
    if (totalSpent > 1000) score += 20;
    if (totalSpent > 5000) score += 10;
    if (orderCount > 2) score += 15;
    if (orderCount > 5) score += 10;
    
    // Recency of activity
    const lastActivity = cust.notes && cust.notes.length > 0 ? new Date(cust.notes[cust.notes.length - 1].date) : null;
    if (lastActivity) {
      const daysSinceActivity = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceActivity < 7) score += 15;
      else if (daysSinceActivity < 30) score += 5;
    }
    
    return Math.min(100, score);
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      const data = { ...newCustomer };
      if (currentUser?.warehouseId) data.warehouseId = currentUser.warehouseId;
      await addCustomer(data, currentTenant);
      setIsAddCustomerOpen(false);
      setNewCustomer({ name: '', contactPerson: '', email: '', phone: '', status: 'Active' });
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (confirm("Are you sure you want to delete this customer?")) {
      await deleteCustomer(id, currentTenant);
      refreshData();
    }
  };

  const handleAddTag = async (customer, newTag) => {
    if (!newTag.trim()) return;
    const tagFormatted = newTag.trim().toLowerCase();
    const currentTags = customer.tags || [];
    if (currentTags.includes(tagFormatted)) return;
    const updatedCustomer = { ...customer, tags: [...currentTags, tagFormatted] };
    try {
      await updateCustomer(customer.id, updatedCustomer, currentTenant);
      setSelectedCustomer(updatedCustomer);
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveTag = async (customer, tagToRemove) => {
    const updatedCustomer = { ...customer, tags: (customer.tags || []).filter(t => t !== tagToRemove) };
    try {
      await updateCustomer(customer.id, updatedCustomer, currentTenant);
      setSelectedCustomer(updatedCustomer);
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddActivity = async () => {
    if (!newNoteText.trim() || !selectedCustomer) return;
    const note = {
      text: newNoteText,
      type: newActivityType,
      date: new Date().toISOString(),
      author: currentUser?.name || 'Admin'
    };
    const updatedNotes = [...(selectedCustomer.notes || []), note];
    const updatedCustomer = { ...selectedCustomer, notes: updatedNotes };
    
    try {
      await updateCustomer(selectedCustomer.id, updatedCustomer, currentTenant);
      setSelectedCustomer(updatedCustomer);
      setNewNoteText('');
      setNewActivityType('Note');
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDeal = async (e) => {
    e.preventDefault();
    try {
      const data = { ...newDeal };
      if (currentUser?.warehouseId) data.warehouseId = currentUser.warehouseId;
      await addDeal(data, currentTenant);
      setIsAddDealOpen(false);
      setNewDeal({ name: '', customerId: '', value: '', stage: 'Lead', expectedClose: '', source: 'Website', tasks: [], nextFollowUp: '' });
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDealTask = async (deal) => {
    const text = newDealTaskTexts[deal.id];
    if (!text || !text.trim()) return;
    const newTask = { text, done: false, id: Date.now() };
    const updatedTasks = [...(deal.tasks || []), newTask];
    try {
      await updateDeal(deal.id, { tasks: updatedTasks }, currentTenant);
      setDealTaskInput({ ...dealTaskInput, [deal.id]: '' });
      setNewDealTaskTexts({...newDealTaskTexts, [deal.id]: ''});
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTask = async (deal, taskId) => {
    const updatedTasks = (deal.tasks || []).map(t => t.id === taskId ? { ...t, done: !t.done } : t);
    try {
      await updateDeal(deal.id, { tasks: updatedTasks }, currentTenant);
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDealDragStart = (e, dealId) => {
    e.dataTransfer.setData('dealId', dealId);
  };

  const handleDealDrop = async (e, newStage) => {
    const dealId = e.dataTransfer.getData('dealId');
    if (dealId && newStage) {
      try {
        await updateDealStatus(dealId, newStage, currentTenant);
        refreshData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const dealStages = ['Lead', 'Contacted', 'Proposal', 'Won', 'Lost'];

  const handleMoveDeal = async (deal, direction) => {
    const currentIndex = dealStages.indexOf(deal.stage);
    let nextIndex = currentIndex + (direction === 'forward' ? 1 : -1);
    if (nextIndex >= 0 && nextIndex < dealStages.length) {
      try {
        await updateDealStatus(deal.id, dealStages[nextIndex], currentTenant);
        refreshData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAddInvoice = async (e) => {
    e.preventDefault();
    try {
      const totalAmount = newInvoice.items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.unitPrice)), 0);
      const data = { ...newInvoice, amount: totalAmount, date: new Date().toISOString() };
      if (currentUser?.warehouseId) data.warehouseId = currentUser.warehouseId;
      await addInvoice(data, currentTenant);
      setIsAddInvoiceOpen(false);
      setNewInvoice({ customerId: '', amount: 0, status: 'Draft', type: 'invoice', currency: '$', items: [{ description: '', qty: 1, unitPrice: '' }] });
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvertToInvoice = async (quote) => {
    if (confirm("Convert this Quote into an Invoice?")) {
      const invoiceData = { ...quote, type: 'invoice', status: 'Draft', date: new Date().toISOString() };
      delete invoiceData.id;
      if (currentUser?.warehouseId) invoiceData.warehouseId = currentUser.warehouseId;
      try {
        await addInvoice(invoiceData, currentTenant);
        await updateInvoiceStatus(quote.id, 'Accepted', currentTenant);
        refreshData();
        setActiveTab('invoices');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDeleteInvoice = async (id) => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      await deleteInvoice(id, currentTenant);
      refreshData();
    }
  };

  const handleEditInvoiceSubmit = async (e) => {
    e.preventDefault();
    if (!editInvoiceData) return;
    try {
      const totalAmount = editInvoiceData.items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.unitPrice)), 0);
      await updateInvoice(editInvoiceData.id, { ...editInvoiceData, amount: totalAmount }, currentTenant);
      setIsEditInvoiceOpen(false);
      setEditInvoiceData(null);
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateCallStart = () => {
    if (selectedCustomer?.phone) {
      const phoneNumber = selectedCustomer.phone.replace(/[^0-9+]/g, '');
      const a = document.createElement('a');
      a.href = `tel:${phoneNumber}`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setCallDuration(0);
    setIsPhoneModalOpen(true);
    const timer = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    setCallTimer(timer);
  };

  const handleSimulateCallEnd = async () => {
    if (callTimer) clearInterval(callTimer);
    setCallTimer(null);
    setIsPhoneModalOpen(false);
    
    // Log the call
    if (selectedCustomer) {
      const minutes = Math.floor(callDuration / 60);
      const seconds = callDuration % 60;
      const note = {
        text: `Outbound Call (${minutes}m ${seconds}s)`,
        type: 'Call',
        date: new Date().toISOString(),
        author: currentUser?.name || 'Admin'
      };
      const updatedNotes = [...(selectedCustomer.notes || []), note];
      try {
        await updateCustomer(selectedCustomer.id, { notes: updatedNotes }, currentTenant);
        setSelectedCustomer({ ...selectedCustomer, notes: updatedNotes });
        refreshData();
      } catch (err) {
        console.error(err);
      }
    }
    setCallDuration(0);
  };

  const handleSendEmail = async () => {
    if (!selectedCustomer || !emailSubject || !emailBody) return;
    
    if (!selectedCustomer.email) {
      alert("This customer does not have an email address saved.");
      return;
    }
    
    try {
      // Send real email via EmailJS
      const templateParams = {
        subject: emailSubject,
        message: emailBody,
        to_email: selectedCustomer.email,
        company_name: tenantConfig?.companyName || 'Recloud Enterprise'
      };
      
      await emailjs.send(
        'service_frjrxls',
        'template_3o7pzww',
        templateParams,
        'YpGEbA7itkKMIQSl_'
      );

      // Log the email in CRM notes
      const note = {
        text: `Email Sent: ${emailSubject}\n\n${emailBody.substring(0, 50)}...`,
        type: 'Email',
        date: new Date().toISOString(),
        author: currentUser?.name || 'Admin'
      };
      const updatedNotes = [...(selectedCustomer.notes || []), note];
      
      await updateCustomer(selectedCustomer.id, { notes: updatedNotes }, currentTenant);
      setSelectedCustomer({ ...selectedCustomer, notes: updatedNotes });
      setIsEmailModalOpen(false);
      setEmailSubject('');
      setEmailBody('');
      refreshData();
      alert("Email sent successfully!");
    } catch (err) {
      console.error('FAILED to send email...', err);
      alert("Failed to send email. Check console for details.");
    }
  };

  const handleDraftWithAI = () => {
    setEmailSubject('Follow-up: ' + (tenantConfig?.companyName || 'Our Company'));
    setEmailBody(`Hi ${selectedCustomer?.contactPerson || selectedCustomer?.name},\n\nI hope this email finds you well. I'm reaching out to follow up on our previous conversation regarding your recent orders.\n\nPlease let me know if there's anything else we can assist you with this week.\n\nBest regards,\n${currentUser?.name || 'Your Rep'}`);
  };

  const handleGenerateInvoicePDF = (inv) => {
    try {
      const doc = new jsPDF();
      const cust = customers.find(c => c.id === inv.customerId);
      
      const formattedInvId = getFormattedInvoiceId(inv);
      const compName = tenantConfig?.companyName || 'Recloud Enterprise';
      
      const getPdfCurrency = (sym) => {
        if (sym === '₦') return 'NGN ';
        if (sym === '£') return 'GBP ';
        if (sym === '€') return 'EUR ';
        if (sym === '₹') return 'INR ';
        return sym || '$';
      };
      const pdfCurrency = getPdfCurrency(inv.currency || '$');
    
    // Brand Colors
    const primaryColor = [15, 23, 42]; // slate-900
    const secondaryColor = [100, 116, 139]; // slate-500
    const accentColor = [56, 189, 248]; // sky-400 (Recloud Blue)

    // --- Header Section with Colored Bar ---
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F'); // Full width top header banner
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text(compName.toUpperCase(), 14, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 200);
    doc.text(inv.type === 'quote' ? 'OFFICIAL QUOTE' : 'OFFICIAL INVOICE', 160, 25);
    
    // --- Meta Details ---
    doc.setTextColor(...primaryColor);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Summary', 14, 60);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...secondaryColor);
    doc.text(`Invoice Number:`, 14, 68);
    doc.text(`Issue Date:`, 14, 74);
    doc.text(`Payment Status:`, 14, 80);
    
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(formattedInvId, 45, 68);
    doc.text(new Date(inv.date || Date.now()).toLocaleDateString(), 45, 74);
    const statusColor = (inv.status || 'Draft') === 'Paid' ? [16, 185, 129] : [239, 68, 68];
    doc.setTextColor(...statusColor);
    doc.text((inv.status || 'Draft').toUpperCase(), 45, 80);

    // --- Billing Info ---
    doc.setTextColor(...primaryColor);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Billed To', 120, 60);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(cust ? String(cust.name) : 'Unknown Customer', 120, 68);
    doc.setTextColor(...secondaryColor);
    if (cust?.contactPerson) doc.text(`Attn: ${String(cust.contactPerson)}`, 120, 74);
    if (cust?.email) doc.text(String(cust.email), 120, 80);
    if (cust?.phone) doc.text(String(cust.phone), 120, 86);
    
      // --- Items Table ---
      const itemsToRender = (inv.items && inv.items.length > 0) ? inv.items : [{ description: inv.description || 'Professional Services', qty: 1, unitPrice: inv.amount || 0 }];
      const tableBody = itemsToRender.map(item => [
        item.description,
        String(item.qty),
        `${pdfCurrency}${Number(item.unitPrice).toLocaleString(undefined, {minimumFractionDigits: 2})}`,
        `${pdfCurrency}${(Number(item.qty) * Number(item.unitPrice)).toLocaleString(undefined, {minimumFractionDigits: 2})}`
      ]);

      autoTable(doc, {
        startY: 100,
        head: [['Description', 'Qty', 'Unit Price', 'Total']],
        body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
      bodyStyles: { textColor: 50 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 }
    });
    
      // --- Totals Section ---
      const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY : 130;
      
      // Line separator
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.5);
      doc.line(120, finalY + 10, 196, finalY + 10);
      
      doc.setFontSize(11);
      doc.setTextColor(...secondaryColor);
      doc.text('Subtotal:', 140, finalY + 20, { align: 'right' });
      doc.text('Tax (0%):', 140, finalY + 27, { align: 'right' });
      
      doc.setFontSize(16);
      doc.setTextColor(...primaryColor);
      doc.setFont('helvetica', 'bold');
      doc.text('Total Due:', 140, finalY + 37, { align: 'right' });

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`${pdfCurrency}${Number(inv.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}`, 196, finalY + 20, { align: 'right' });
      doc.text(`${pdfCurrency}0.00`, 196, finalY + 27, { align: 'right' });
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...accentColor);
      doc.text(`${pdfCurrency}${Number(inv.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}`, 196, finalY + 37, { align: 'right' });
    
      // --- Footer ---
      doc.setFontSize(9);
      doc.setTextColor(...secondaryColor);
      doc.setFont('helvetica', 'italic');
      doc.text('Thank you for your business. Please remit payment within 30 days.', 14, 280);
      
      // Branding footer
      doc.setFont('helvetica', 'bold');
      doc.text(`Generated by Recloud ERP`, 196, 280, { align: 'right' });
      
      doc.save(`Invoice_${formattedInvId}.pdf`);
    } catch (err) {
      console.error("PDF Generation Error:", err);
      alert("Failed to generate PDF. Make sure all fields are valid.");
    }
  };

  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex flex-col">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6 gap-3">
        <div className="flex gap-1.5 md:gap-2 bg-slate-100 p-1 rounded-2xl overflow-x-auto no-scrollbar w-full md:w-auto">
          <button onClick={() => {setActiveTab('dashboard'); setSelectedCustomer(null);}} className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <BarChart3 className="w-3.5 h-3.5 md:w-4 md:h-4 inline-block mr-1 md:mr-2" /> Dashboard
          </button>
          <button onClick={() => {setActiveTab('customers'); setSelectedCustomer(null);}} className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'customers' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Users className="w-3.5 h-3.5 md:w-4 md:h-4 inline-block mr-1 md:mr-2" /> {currentIndustry === 'law_firm' ? 'Clients' : 'Customers'}
          </button>
          <button onClick={() => {setActiveTab('deals'); setSelectedCustomer(null);}} className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'deals' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Target className="w-3.5 h-3.5 md:w-4 md:h-4 inline-block mr-1 md:mr-2" /> Pipeline
          </button>
          <button onClick={() => {setActiveTab('quotes'); setSelectedCustomer(null);}} className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'quotes' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <FileText className="w-3.5 h-3.5 md:w-4 md:h-4 inline-block mr-1 md:mr-2" /> Quotes
          </button>
          <button onClick={() => {setActiveTab('invoices'); setSelectedCustomer(null);}} className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'invoices' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Receipt className="w-3.5 h-3.5 md:w-4 md:h-4 inline-block mr-1 md:mr-2" /> Invoices
          </button>
          <button onClick={() => {setActiveTab('portal'); setSelectedCustomer(null);}} className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'portal' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <ExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4 inline-block mr-1 md:mr-2" /> Client Portal
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto mt-2 md:mt-0 justify-end">
          {currentIndustry === 'law_firm' && (
            <button onClick={() => setIsConflictCheckOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold shadow-md shadow-amber-500/20 flex items-center gap-1.5 md:gap-2 mr-2">
              <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden sm:inline">Conflict</span> Check
            </button>
          )}
          {activeTab === 'customers' && (
            <button onClick={() => setIsAddCustomerOpen(true)} className="bg-recloud-600 hover:bg-recloud-700 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold shadow-md shadow-recloud-500/20 flex items-center gap-1.5 md:gap-2">
              <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden sm:inline">Add</span> {currentIndustry === 'law_firm' ? 'Client' : 'Customer'}
            </button>
          )}
          {activeTab === 'deals' && (
            <button onClick={() => setIsAddDealOpen(true)} className="bg-recloud-600 hover:bg-recloud-700 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold shadow-md shadow-recloud-500/20 flex items-center gap-1.5 md:gap-2">
              <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden sm:inline">Add</span> Deal
            </button>
          )}
          {activeTab === 'quotes' && (
            <button onClick={() => { setNewInvoice({...newInvoice, type: 'quote'}); setIsAddInvoiceOpen(true); }} className="bg-recloud-600 hover:bg-recloud-700 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold shadow-md shadow-recloud-500/20 flex items-center gap-1.5 md:gap-2">
              <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden sm:inline">Create</span> Quote
            </button>
          )}
          {activeTab === 'invoices' && (
            <button onClick={() => { setNewInvoice({...newInvoice, type: 'invoice'}); setIsAddInvoiceOpen(true); }} className="bg-recloud-600 hover:bg-recloud-700 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold shadow-md shadow-recloud-500/20 flex items-center gap-1.5 md:gap-2">
              <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden sm:inline">Create</span> Invoice
            </button>
          )}
        </div>
      </div>


        {activeTab === 'customers' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto animate-in fade-in mb-6">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-bold border-b border-slate-200">{currentIndustry === 'law_firm' ? 'Client Name' : 'Customer Name'}</th>
                  <th className="p-4 font-bold border-b border-slate-200">Contact</th>
                  <th className="p-4 font-bold border-b border-slate-200">Phone</th>
                  <th className="p-4 font-bold border-b border-slate-200">Email</th>
                  <th className="p-4 font-bold border-b border-slate-200 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.length === 0 ? (
                  <tr><td colSpan="5" className="p-8 text-center text-slate-500 font-medium">{currentIndustry === 'law_firm' ? 'No clients found.' : 'No customers found.'}</td></tr>
                ) : filteredCustomers.map(customer => (
                  <tr key={customer.id} onClick={() => { setSelectedCustomer(customer); setIsCustomerDetailsOpen(true); }} className="hover:bg-slate-50 transition-colors cursor-pointer">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                          {customer.name?.charAt(0)}
                        </div>
                        <p className="font-bold text-slate-800 text-sm truncate max-w-[200px]">{customer.name}</p>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-medium text-slate-700">{customer.contactPerson || '—'}</td>
                    <td className="p-4 text-sm text-slate-600">{customer.phone || '—'}</td>
                    <td className="p-4 text-sm text-slate-600">{customer.email || '—'}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={(e) => { e.stopPropagation(); setSelectedCustomer(customer); setIsEmailModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors tooltip" title="Send Email">
                          <Mail className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedCustomer(customer); setIsPhoneModalOpen(true); }} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors tooltip" title="Log Call">
                          <Phone className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setEditingCustomer(customer); setIsAddCustomerOpen(true); }} className="p-2 text-slate-400 hover:text-recloud-600 hover:bg-recloud-50 rounded-lg transition-colors tooltip" title="Edit Customer">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(customer.id) }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors tooltip" title="Delete Customer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in mb-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500">{currentIndustry === 'law_firm' ? 'Total Clients' : 'Total Customers'}</p>
                <p className="text-2xl font-bold text-slate-800">{customers.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500">Active Deals</p>
                <p className="text-2xl font-bold text-slate-800">{deals.filter(d => d.stage !== 'Won' && d.stage !== 'Lost').length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-recloud-50 flex items-center justify-center text-recloud-600">
                <Target className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500">Total Pipeline</p>
                <p className="text-2xl font-bold text-slate-800">
                  ${deals.filter(d => d.stage !== 'Won' && d.stage !== 'Lost').reduce((s,d) => s + (Number(d.value)||0), 0).toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500">Win Rate</p>
                <p className="text-2xl font-bold text-slate-800">
                  {deals.length > 0 ? Math.round((deals.filter(d => d.stage === 'Won').length / deals.length) * 100) : 0}%
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'deals' && (
          <div className="flex gap-4 h-full overflow-x-auto pb-4 animate-in fade-in">
            {dealStages.map(stage => (
              <div key={stage} 
                   onDragOver={e => e.preventDefault()}
                   onDrop={e => handleDealDrop(e, stage)}
                   className="flex-none w-80 bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-700">{stage}</h3>
                  <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">
                    {deals.filter(d => d.stage === stage).length}
                  </span>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto min-h-[200px]">
                  {deals.filter(d => d.stage === stage).map(deal => {
                    const cust = customers.find(c => c.id === deal.customerId);
                    const daysInactive = getDaysInactive(deal);
                    const isStuck = daysInactive >= 7 && stage !== 'Won' && stage !== 'Lost';
                    
                    return (
                      <div key={deal.id} 
                           draggable
                           onDragStart={e => handleDealDragStart(e, deal.id)}
                           className={`bg-white p-4 rounded-xl shadow-sm border transition-all cursor-grab active:cursor-grabbing ${isStuck ? 'border-red-300 shadow-red-500/10 hover:shadow-md' : 'border-slate-100 hover:border-recloud-300 hover:shadow-md'}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="font-bold text-slate-800 pr-2">{deal.name}</div>
                          {isStuck && (
                            <div className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 tooltip" title={`Inactive for ${daysInactive} days`}>
                              <AlertTriangle className="w-3 h-3" /> Stuck
                            </div>
                          )}
                          {!isStuck && deal.source && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">{deal.source}</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mb-3 flex items-center justify-between">
                          <span>{cust ? cust.name : 'Unknown Customer'}</span>
                          {deal.nextFollowUp && (
                            <span className="text-blue-500 flex items-center gap-1 font-medium bg-blue-50 px-1.5 py-0.5 rounded" title="Scheduled Follow-up">
                              <Clock className="w-3 h-3"/> {new Date(deal.nextFollowUp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                        
                        <div className="bg-slate-50/50 rounded-xl p-3 mb-3 border border-slate-100/50">
                          <div className="text-xs font-bold text-slate-600 mb-2">Tasks ({(deal.tasks||[]).filter(t => t.done).length}/{(deal.tasks||[]).length})</div>
                          <div className="space-y-1 mb-2">
                            {(deal.tasks || []).map(t => (
                              <div key={t.id} className="flex items-start gap-2 group/task">
                                <input type="checkbox" checked={t.done} onChange={() => handleToggleTask(deal, t.id)} className="mt-0.5 rounded text-recloud-600 border-slate-300 focus:ring-recloud-500 cursor-pointer" />
                                <span className={`text-[11px] leading-tight flex-1 ${t.done ? 'line-through text-slate-400' : 'text-slate-600'}`}>{t.text}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2 mt-2">
                            <input type="text" value={newDealTaskTexts[deal.id] || ''} onChange={e => setNewDealTaskTexts({...newDealTaskTexts, [deal.id]: e.target.value})} placeholder="New task..." className="flex-1 text-[11px] px-2 py-1 border border-slate-200 rounded outline-none focus:border-recloud-500" />
                            {currentUser?.role === 'admin' && (
                              <button onClick={() => handleAddDealTask(deal)} className="bg-slate-200 hover:bg-slate-300 text-slate-600 px-2 py-1 rounded transition-colors"><Plus className="w-3 h-3"/></button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                          <div className="flex -space-x-2">
                            {(deal.assignedTo || []).map((userId, idx) => (
                              <div key={idx} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500" title={employees.find(u => u.id === userId)?.name || userId}>
                                {(employees.find(u => u.id === userId)?.name || userId).substring(0, 1).toUpperCase()}
                              </div>
                            ))}
                          </div>
                          {currentUser?.role === 'admin' && (
                            <button onClick={() => { if(window.confirm('Delete deal?')) deleteDeal(deal.id, currentTenant).then(refreshData) }} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
)}
        {activeTab === 'invoices' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto animate-in fade-in">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Invoice ID</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Customer</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Amount</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Date</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.filter(i => i.type !== 'quote').length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-400">No invoices found.</td></tr>
                ) : (
                  [...invoices].filter(i => i.type !== 'quote').sort((a,b) => new Date(b.date) - new Date(a.date)).map(inv => {
                    const cust = customers.find(c => c.id === inv.customerId);
                    return (
                      <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 text-sm font-bold text-slate-700">{getFormattedInvoiceId(inv)}</td>
                        <td className="p-4 font-bold text-slate-800">{cust ? cust.name : 'Unknown'}</td>
                        <td className="p-4 font-bold text-slate-800">{inv.currency || '$'}{Number(inv.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td className="p-4">
                          <select value={inv.status} onChange={async (e) => { await updateInvoiceStatus(inv.id, e.target.value, currentTenant); refreshData(); }} className={`px-2 py-1 rounded-lg text-xs font-bold outline-none border-0 cursor-pointer ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'Pending Verification' ? 'bg-yellow-100 text-yellow-700' : inv.status === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            <option value="Draft">Draft</option>
                            <option value="Sent">Sent</option>
                            <option value="Pending Verification">Pending</option>
                            <option value="Paid">Paid</option>
                            <option value="Overdue">Overdue</option>
                          </select>
                        </td>
                        <td className="p-4 text-sm text-slate-500">{new Date(inv.date || Date.now()).toLocaleDateString()}</td>
                        <td className="p-4 text-right flex justify-end gap-2">
                          {inv.status === 'Pending Verification' && (
                            <button onClick={() => setVerifyingInvoice(inv)} className="p-2 text-yellow-500 hover:text-yellow-700 hover:bg-yellow-50 rounded-lg transition-colors tooltip" title="Review Receipt">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          {(() => {
                            const cust = customers.find(c => c.id === inv.customerId);
                            if (cust && cust.phone) {
                              const amount = Number(inv.amount || inv.totalAmount || 0).toLocaleString();
                              const msg = `Hello ${cust.name}, this is a reminder regarding Invoice #${inv.invoiceNumber || inv.id.substring(0,8)} for the amount of ${inv.currency || '$'}${amount}. You can view and pay it through your secure client portal.`;
                              return (
                                <a href={`https://wa.me/${cust.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer" className="p-2 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors tooltip" title="Send via WhatsApp">
                                  <MessageCircle className="w-4 h-4" />
                                </a>
                              );
                            }
                            return null;
                          })()}
                          <button onClick={() => handleGenerateInvoicePDF(inv)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors tooltip" title="Download PDF">
                            <Download className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleOpenEditInvoice(inv)} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors tooltip" title="Edit Invoice">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteInvoice(inv.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors tooltip" title="Delete Invoice">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'quotes' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto animate-in fade-in">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Quote ID</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Customer</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Amount</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Date</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.filter(i => i.type === 'quote').length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-400">No quotes found.</td></tr>
                ) : (
                  [...invoices].filter(i => i.type === 'quote').sort((a,b) => new Date(b.date) - new Date(a.date)).map(inv => {
                    const cust = customers.find(c => c.id === inv.customerId);
                    return (
                      <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 text-sm font-bold text-slate-700">{getFormattedInvoiceId(inv).replace('INV', 'QT')}</td>
                        <td className="p-4 font-bold text-slate-800">{cust ? cust.name : 'Unknown'}</td>
                        <td className="p-4 font-bold text-slate-800">{inv.currency || '$'}{Number(inv.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td className="p-4">
                          <select value={inv.status} onChange={async (e) => { await updateInvoiceStatus(inv.id, e.target.value, currentTenant); refreshData(); }} className={`px-2 py-1 rounded-lg text-xs font-bold outline-none border-0 cursor-pointer ${inv.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            <option value="Draft">Draft</option>
                            <option value="Sent">Sent</option>
                            <option value="Accepted">Accepted</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </td>
                        <td className="p-4 text-sm text-slate-500">{new Date(inv.date || Date.now()).toLocaleDateString()}</td>
                        <td className="p-4 text-right flex justify-end gap-2">
                          {currentUser?.role === 'admin' && (
<button onClick={() => handleConvertToInvoice(inv)} className="p-2 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors tooltip" title="Convert to Invoice">
                            <Receipt className="w-4 h-4" />
                          </button>
)} 
                          {(() => {
                            const cust = customers.find(c => c.id === inv.customerId);
                            if (cust && cust.phone) {
                              const amount = Number(inv.amount || inv.totalAmount || 0).toLocaleString();
                              const msg = `Hello ${cust.name}, this is a reminder regarding Invoice #${inv.invoiceNumber || inv.id.substring(0,8)} for the amount of ${inv.currency || '$'}${amount}. You can view and pay it through your secure client portal.`;
                              return (
                                <a href={`https://wa.me/${cust.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer" className="p-2 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors tooltip" title="Send via WhatsApp">
                                  <MessageCircle className="w-4 h-4" />
                                </a>
                              );
                            }
                            return null;
                          })()}
                          <button onClick={() => handleGenerateInvoicePDF(inv)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors tooltip" title="Download PDF">
                            <Download className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleOpenEditInvoice(inv)} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors tooltip" title="Edit Quote">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteInvoice(inv.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors tooltip" title="Delete Quote">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}


        {/* Client Portal Management Tab */}
        {activeTab === 'portal' && (() => {
          const clientEmployees = employees.filter(e => e.role === 'client' || e.role === 'deactivated_client');
          
          const getLinkedClient = (customer) => {
            return clientEmployees.find(e => e.linkedCustomerId === customer.id || e.name?.toLowerCase() === customer.name?.toLowerCase());
          };

          const getClientStats = (customer) => {
            const custInvoices = invoices.filter(i => i.customerId === customer.id);
            const unpaid = custInvoices.filter(i => i.status !== 'Paid' && i.status !== 'paid');
            const totalOwed = unpaid.reduce((s, i) => s + (Number(i.amount) || Number(i.totalAmount) || 0), 0);
            return { totalInvoices: custInvoices.length, unpaidCount: unpaid.length, totalOwed };
          };

          const handleCreatePortalAccess = async (customer) => {
            const email = prompt(`Enter login email for "${customer.name}":`);
            if (!email) return;

            try {
              // 1. Create Firebase Auth user & send reset link
              const authUid = await createAuthUser(email, customer.name);

              // 2. Register as 'client' in employees collection using the secure Auth UID
              await addEmployee({
                id: authUid,
                name: customer.name,
                email: email,
                role: 'client',
                department: 'Client',
                status: 'Active',
                linkedCustomerId: customer.id,
                phone: customer.phone || '',
              }, currentTenant);
              
              // 3. Also store the link on the customer side
              await updateCustomer(customer.id, { portalEnabled: true, portalEmail: email }, currentTenant);
              
              alert(`Portal access created for ${customer.name}! A password setup email has been sent to ${email}.`);
              refreshData();
            } catch(err) {
              console.error(err);
              if (err.code === 'auth/email-already-in-use') {
                alert("This email is already registered in the system.");
              } else {
                alert('Failed to create portal access: ' + err.message);
              }
            }
          };

          const handleRevokePortalAccess = async (customer) => {
            if (!confirm(`Revoke portal access for "${customer.name}"? The client will no longer be able to log in.`)) return;
            const linked = getLinkedClient(customer);
            if (linked) {
              try {
                await updateEmployee(linked.id, { role: 'deactivated_client', status: 'Inactive' }, currentTenant);
                await updateCustomer(customer.id, { portalEnabled: false }, currentTenant);
                alert('Portal access revoked.');
                refreshData();
              } catch(err) {
                console.error(err);
                alert('Failed to revoke access: ' + err.message);
              }
            }
          };

          const handleDeleteClientLogin = async (customer) => {
            if (!confirm(`Permanently DELETE the portal login for "${customer.name}"? This cannot be undone.`)) return;
            const linked = getLinkedClient(customer);
            if (linked) {
              try {
                await deleteEmployee(linked.id, currentTenant);
                await updateCustomer(customer.id, { portalEnabled: false, portalEmail: null }, currentTenant);
                alert('Client login deleted permanently.');
                refreshData();
              } catch(err) {
                console.error(err);
                alert('Failed to delete login: ' + err.message);
              }
            }
          };

          return (
            <div className="space-y-6 animate-in fade-in">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
                <h2 className="text-xl font-black mb-1">Client Portal Management</h2>
                <p className="text-blue-100 text-sm">Grant your CRM customers access to a self-service portal where they can view projects, invoices, and make payments.</p>
                <div className="flex gap-6 mt-4">
                  <div className="bg-white/20 rounded-xl px-4 py-2">
                    <p className="text-blue-200 text-[10px] uppercase font-bold tracking-wider">Total Customers</p>
                    <p className="text-2xl font-black">{customers.length}</p>
                  </div>
                  <div className="bg-white/20 rounded-xl px-4 py-2">
                    <p className="text-blue-200 text-[10px] uppercase font-bold tracking-wider">Portal Enabled</p>
                    <p className="text-2xl font-black">{customers.filter(c => getLinkedClient(c)).length}</p>
                  </div>
                  <div className="bg-white/20 rounded-xl px-4 py-2">
                    <p className="text-blue-200 text-[10px] uppercase font-bold tracking-wider">Pending Setup</p>
                    <p className="text-2xl font-black">{customers.filter(c => !getLinkedClient(c)).length}</p>
                  </div>
                </div>
              </div>

              {/* Client List */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">Customer Accounts</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                        <th className="p-4 font-bold">Customer</th>
                        <th className="p-4 font-bold">Contact</th>
                        <th className="p-4 font-bold">Portal Status</th>
                        <th className="p-4 font-bold">Login Email</th>
                        <th className="p-4 font-bold text-center">Invoices</th>
                        <th className="p-4 font-bold text-right">Outstanding</th>
                        <th className="p-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customers.length === 0 ? (
                        <tr><td colSpan="7" className="p-8 text-center text-slate-500">No CRM customers found. Add customers first.</td></tr>
                      ) : customers.map(customer => {
                        const linked = getLinkedClient(customer);
                        const stats = getClientStats(customer);
                        return (
                          <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                  {customer.name?.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800 text-sm">{customer.name}</p>
                                  <p className="text-xs text-slate-400">{customer.contactPerson || ''}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-sm text-slate-600">{customer.email || customer.phone || '—'}</td>
                            <td className="p-4">
                              {linked ? (
                                linked.status === 'Active' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-700">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-100 text-orange-700">
                                    <ShieldOff className="w-3.5 h-3.5" /> Deactivated
                                  </span>
                                )
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-500">
                                  <ShieldOff className="w-3.5 h-3.5" /> No Access
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-sm text-slate-600 font-mono">{linked?.email || '—'}</td>
                            <td className="p-4 text-center">
                              <span className="text-sm font-bold text-slate-800">{stats.totalInvoices}</span>
                              {stats.unpaidCount > 0 && (
                                <span className="ml-1.5 bg-orange-100 text-orange-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{stats.unpaidCount} unpaid</span>
                              )}
                            </td>
                            <td className="p-4 text-right font-black text-sm text-slate-800">
                              {stats.totalOwed > 0 ? `₦${stats.totalOwed.toLocaleString()}` : '—'}
                            </td>
                            <td className="p-4 text-right flex items-center justify-end gap-2">
                              {linked ? (
                                <>
                                  {currentUser?.role === 'admin' && (
                                    <>
                                      {linked.status === 'Active' ? (
                                        <button onClick={() => handleRevokePortalAccess(customer)} className="text-orange-500 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 tooltip" title="Temporarily disable login">
                                          <ShieldOff className="w-3.5 h-3.5" /> Revoke
                                        </button>
                                      ) : (
                                        <button onClick={() => {
                                          updateEmployee(linked.id, { role: 'client', status: 'Active' }, currentTenant).then(() => refreshData());
                                        }} className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 tooltip" title="Reactivate login">
                                          <ShieldCheck className="w-3.5 h-3.5" /> Reactivate
                                        </button>
                                      )}
                                      <button onClick={() => handleDeleteClientLogin(customer)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 tooltip" title="Permanently delete login">
                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                      </button>
                                    </>
                                  )}
                                </>
                              ) : (
                                <button onClick={() => handleCreatePortalAccess(customer)} className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5">
                                  <UserPlus className="w-3.5 h-3.5" /> Grant Access
                                </button>
                              )}
                        </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Customer Details Drawer */}
      {isCustomerDetailsOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end animate-in fade-in">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {selectedCustomer.name?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{selectedCustomer.name}</h3>
                  <p className="text-sm font-medium text-slate-500">{selectedCustomer.contactPerson || 'No primary contact'}</p>
                </div>
              </div>
              <button onClick={() => setIsCustomerDetailsOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Contact Info Card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Contact Information</h4>
                <div className="space-y-3">
                  {selectedCustomer.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><Phone className="w-4 h-4" /></div>
                      <a href={`tel:${selectedCustomer.phone}`} className="font-medium text-slate-700 hover:text-emerald-600">{selectedCustomer.phone}</a>
                    </div>
                  )}
                  {selectedCustomer.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><Mail className="w-4 h-4" /></div>
                      <a href={`mailto:${selectedCustomer.email}`} className="font-medium text-slate-700 hover:text-blue-600">{selectedCustomer.email}</a>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <a href={`tel:${selectedCustomer.phone || ''}`} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-3 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors text-sm">
                  <Phone className="w-4 h-4" /> Call
                </a>
                <a href={`https://wa.me/${(selectedCustomer.phone || '').replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="bg-green-50 hover:bg-green-100 text-green-700 font-bold py-3 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors text-sm">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
                <button onClick={(e) => { e.stopPropagation(); setEmailSubject(''); setEmailBody(''); setIsEmailModalOpen(true); }} className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-3 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors text-sm">
                  <Mail className="w-4 h-4" /> Email
                </button>
              </div>

              {/* Add Note Form */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Add a Note</h4>
                <div className="flex gap-2 mb-2">
                  <select value={newActivityType} onChange={e => setNewActivityType(e.target.value)} className="text-xs font-bold border border-slate-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:border-recloud-500">
                    <option value="Note">Note</option>
                    <option value="Call">Call Log</option>
                    <option value="Email">Email Log</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Follow-up">Follow-up</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={newNoteText}
                    onChange={e => setNewNoteText(e.target.value)}
                    placeholder="Type your note here..."
                    rows="2"
                    className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500 resize-none bg-white"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (!newNoteText.trim() || !selectedCustomer) return;
                    const note = { text: newNoteText, type: newActivityType, date: new Date().toISOString(), author: currentUser?.name || 'Admin' };
                    const updatedNotes = [...(selectedCustomer.notes || []), note];
                    try {
                      await updateCustomer(selectedCustomer.id, { notes: updatedNotes }, currentTenant);
                      setSelectedCustomer({ ...selectedCustomer, notes: updatedNotes });
                      setNewNoteText('');
                      setNewActivityType('Note');
                      refreshData();
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  disabled={!newNoteText.trim()}
                  className="mt-2 w-full bg-recloud-600 hover:bg-recloud-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2 rounded-lg transition-colors text-sm flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Save Note
                </button>
              </div>

              {/* Notes History */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Notes & Activity</h4>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{(selectedCustomer.notes || []).length}</span>
                </div>
                <div className="space-y-3">
                  {selectedCustomer.notes && selectedCustomer.notes.length > 0 ? (
                    [...selectedCustomer.notes].reverse().map((note, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${note?.type === 'Call' ? 'bg-emerald-100 text-emerald-700' : note?.type === 'Email' ? 'bg-blue-100 text-blue-700' : note?.type === 'Meeting' ? 'bg-purple-100 text-purple-700' : 'bg-yellow-100 text-yellow-700'}`}>{note?.type || 'Note'}</span>
                          <span className="text-[10px] text-slate-400">{note?.date ? new Date(note.date).toLocaleDateString() : ''}</span>
                        </div>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{typeof note === 'object' ? (note?.text || '') : String(note)}</p>
                        <p className="text-[10px] text-slate-400 mt-2 text-right">— {note?.author || 'Admin'}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">No notes yet. Add one above!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button onClick={() => { setIsCustomerDetailsOpen(false); setEditingCustomer(selectedCustomer); setIsAddCustomerOpen(true); }} className="w-full bg-white border-2 border-slate-200 hover:border-recloud-500 text-slate-700 hover:text-recloud-600 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2">
                <Edit className="w-4 h-4" /> Edit Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Add Customer</h3>
              <button onClick={() => setIsAddCustomerOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company Name</label>
                <input required type="text" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person</label>
                <input type="text" value={newCustomer.contactPerson} onChange={e => setNewCustomer({...newCustomer, contactPerson: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input type="email" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                  <input type="tel" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" />
                </div>
              </div>
              <button type="submit" className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl mt-4">Save Customer</button>
            </form>
          </div>
        </div>
      )}

      {isAddDealOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Add Deal</h3>
              <button onClick={() => setIsAddDealOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleAddDeal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deal Name</label>
                <input required type="text" value={newDeal.name} onChange={e => setNewDeal({...newDeal, name: e.target.value})} placeholder="e.g. Q3 Software License" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer</label>
                <select required value={newDeal.customerId} onChange={e => setNewDeal({...newDeal, customerId: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500 bg-white">
                  <option value="">Select a customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Value ($)</label>
                  <input required type="number" min="0" value={newDeal.value} onChange={e => setNewDeal({...newDeal, value: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expected Close</label>
                  <input type="date" value={newDeal.expectedClose} onChange={e => setNewDeal({...newDeal, expectedClose: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lead Source</label>
                  <select value={newDeal.source} onChange={e => setNewDeal({...newDeal, source: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500 bg-white">
                    <option value="Website">Website</option>
                    <option value="Referral">Referral</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Cold Call">Cold Call</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Next Follow-Up</label>
                  <input type="date" value={newDeal.nextFollowUp || ''} onChange={e => setNewDeal({...newDeal, nextFollowUp: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" />
                </div>
              </div>
              <button type="submit" className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl mt-4">Save Deal</button>
            </form>
          </div>
        </div>
      )}

      {isAddInvoiceOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Create Invoice</h3>
              <button onClick={() => setIsAddInvoiceOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleAddInvoice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer</label>
                <select required value={newInvoice.customerId} onChange={e => setNewInvoice({...newInvoice, customerId: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500 bg-white">
                  <option value="">Select a customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Currency</label>
                <select value={newInvoice.currency} onChange={e => setNewInvoice({...newInvoice, currency: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none bg-white">
                  <option value="$">USD ($)</option>
                  <option value="₦">NGN (₦)</option>
                  <option value="£">GBP (£)</option>
                  <option value="€">EUR (€)</option>
                  <option value="₹">INR (₹)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Invoice Items</label>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                  {newInvoice.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <input type="text" placeholder="Description" required value={item.description} onChange={(e) => {
                          const newItems = [...newInvoice.items];
                          newItems[idx].description = e.target.value;
                          setNewInvoice({...newInvoice, items: newItems});
                        }} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-recloud-500" />
                      </div>
                      <div className="w-20">
                        <input type="number" placeholder="Qty" required min="1" value={item.qty} onChange={(e) => {
                          const newItems = [...newInvoice.items];
                          newItems[idx].qty = e.target.value;
                          setNewInvoice({...newInvoice, items: newItems});
                        }} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-recloud-500" />
                      </div>
                      <div className="w-24">
                        <input type="number" placeholder="Price" required min="0" value={item.unitPrice} onChange={(e) => {
                          const newItems = [...newInvoice.items];
                          newItems[idx].unitPrice = e.target.value;
                          setNewInvoice({...newInvoice, items: newItems});
                        }} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-recloud-500" />
                      </div>
                      {newInvoice.items.length > 1 && (
                        <button type="button" onClick={() => {
                          const newItems = newInvoice.items.filter((_, i) => i !== idx);
                          setNewInvoice({...newInvoice, items: newItems});
                        }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setNewInvoice({...newInvoice, items: [...newInvoice.items, { description: '', qty: 1, unitPrice: '' }]})} className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"><Plus className="w-3 h-3"/> Add Item</button>
              </div>
              <button type="submit" className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl mt-4">Generate Draft Invoice</button>
            </form>
          </div>
        </div>
      )}

      {isEditInvoiceOpen && editInvoiceData && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Edit Invoice</h3>
              <button onClick={() => { setIsEditInvoiceOpen(false); setEditInvoiceData(null); }} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleEditInvoiceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer</label>
                <select required value={editInvoiceData.customerId} onChange={e => setEditInvoiceData({...editInvoiceData, customerId: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500 bg-white">
                  <option value="">Select a customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Currency</label>
                <select value={editInvoiceData.currency} onChange={e => setEditInvoiceData({...editInvoiceData, currency: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none bg-white">
                  <option value="$">USD ($)</option>
                  <option value="₦">NGN (₦)</option>
                  <option value="£">GBP (£)</option>
                  <option value="€">EUR (€)</option>
                  <option value="₹">INR (₹)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Invoice Items</label>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                  {editInvoiceData.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <input type="text" placeholder="Description" required value={item.description} onChange={(e) => {
                          const newItems = [...editInvoiceData.items];
                          newItems[idx].description = e.target.value;
                          setEditInvoiceData({...editInvoiceData, items: newItems});
                        }} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-recloud-500" />
                      </div>
                      <div className="w-20">
                        <input type="number" placeholder="Qty" required min="1" value={item.qty} onChange={(e) => {
                          const newItems = [...editInvoiceData.items];
                          newItems[idx].qty = e.target.value;
                          setEditInvoiceData({...editInvoiceData, items: newItems});
                        }} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-recloud-500" />
                      </div>
                      <div className="w-24">
                        <input type="number" placeholder="Price" required min="0" value={item.unitPrice} onChange={(e) => {
                          const newItems = [...editInvoiceData.items];
                          newItems[idx].unitPrice = e.target.value;
                          setEditInvoiceData({...editInvoiceData, items: newItems});
                        }} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-recloud-500" />
                      </div>
                      {editInvoiceData.items.length > 1 && (
                        <button type="button" onClick={() => {
                          const newItems = editInvoiceData.items.filter((_, i) => i !== idx);
                          setEditInvoiceData({...editInvoiceData, items: newItems});
                        }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setEditInvoiceData({...editInvoiceData, items: [...editInvoiceData.items, { description: '', qty: 1, unitPrice: '' }]})} className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"><Plus className="w-3 h-3"/> Add Item</button>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl mt-4 shadow-lg shadow-blue-500/30">Save Changes</button>
            </form>
          </div>
        </div>
      )}
      {isEmailModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Mail className="w-5 h-5 text-blue-500" /> Compose Email</h3>
              <button onClick={() => setIsEmailModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">To:</label>
                <input type="text" readOnly value={selectedCustomer?.email} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 text-slate-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subject:</label>
                <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <div className="flex justify-between items-end mb-1">
                  <label className="block text-xs font-bold text-slate-700">Message:</label>
                  <button onClick={handleDraftWithAI} className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 bg-purple-50 px-2 py-1 rounded-lg">
                    ✨ Draft with AI
                  </button>
                </div>
                <textarea rows="6" value={emailBody} onChange={e => setEmailBody(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 resize-none"></textarea>
              </div>
              <button onClick={handleSendEmail} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl mt-4 shadow-lg shadow-blue-500/30 flex justify-center items-center gap-2">
                Send Email <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {isPhoneModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-slate-900 rounded-[2rem] p-8 w-full max-w-sm shadow-2xl border border-slate-700 flex flex-col items-center animate-in zoom-in-95">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl font-black text-white">{selectedCustomer?.name?.charAt(0)}</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">{selectedCustomer?.name}</h3>
            <p className="text-slate-400 font-mono text-sm mb-8">{selectedCustomer?.phone}</p>
            
            <div className="text-4xl font-mono font-light text-emerald-400 mb-12 tracking-widest">
              {Math.floor(callDuration / 60).toString().padStart(2, '0')}:{(callDuration % 60).toString().padStart(2, '0')}
            </div>
            
            <button onClick={handleSimulateCallEnd} className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/20 transition-transform active:scale-95">
              <Phone className="w-6 h-6 text-white transform rotate-[135deg]" />
            </button>
            <p className="text-slate-500 text-xs mt-4 font-bold uppercase tracking-wider">End Call</p>
          </div>
        </div>
      )}

      {/* Payment Verification Modal */}
      {verifyingInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 flex justify-between items-center border-b border-slate-100 bg-slate-50">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-yellow-500" /> Verify Payment Receipt
              </h2>
              <button onClick={() => setVerifyingInvoice(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-100 flex-1 flex flex-col gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Invoice Amount</p>
                  <p className="text-2xl font-black text-slate-800">{verifyingInvoice.currency || '$'}{Number(verifyingInvoice.amount || verifyingInvoice.totalAmount || 0).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase">Invoice ID</p>
                  <p className="text-lg font-bold text-slate-600">#{verifyingInvoice.invoiceNumber || verifyingInvoice.id.substring(0,8)}</p>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
                <div className="p-3 border-b border-slate-100 bg-slate-50">
                  <h3 className="text-sm font-bold text-slate-700">Client Uploaded Receipt</h3>
                </div>
                <div className="p-4 flex-1 flex items-center justify-center min-h-[300px] bg-slate-50">
                  {verifyingInvoice.receiptUrl ? (
                    verifyingInvoice.receiptUrl.toLowerCase().includes('.pdf') ? (
                      <iframe src={verifyingInvoice.receiptUrl} className="w-full h-full min-h-[400px] rounded border" title="Receipt PDF"></iframe>
                    ) : (
                      <img src={verifyingInvoice.receiptUrl} alt="Payment Receipt" className="max-w-full max-h-[60vh] object-contain rounded shadow-sm" />
                    )
                  ) : (
                    <p className="text-slate-400 font-medium">No receipt URL found for this invoice.</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
              <button onClick={() => setVerifyingInvoice(null)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                Close
              </button>
              <button onClick={async () => {
                await updateInvoiceStatus(verifyingInvoice.id, 'Sent', currentTenant);
                await refreshData();
                setVerifyingInvoice(null);
              }} className="px-5 py-2.5 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                Reject (Mark Unpaid)
              </button>
              <button onClick={async () => {
                await updateInvoiceStatus(verifyingInvoice.id, 'Paid', currentTenant);
                await refreshData();
                setVerifyingInvoice(null);
              }} className="px-6 py-2.5 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-md hover:shadow-lg transition-all flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Approve Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Check Modal */}
      {isConflictCheckOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-amber-600"/> Conflict of Interest Check</h3>
                <p className="text-sm text-slate-500 font-medium">Search across all clients, cases, and opposing parties.</p>
              </div>
              <button onClick={() => {setIsConflictCheckOpen(false); setConflictSearchName(''); setConflictResults([]);}} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6"/></button>
            </div>
            
            <div className="p-6 bg-white border-b border-slate-100">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input 
                    type="text" 
                    value={conflictSearchName}
                    onChange={e => setConflictSearchName(e.target.value)}
                    placeholder="Enter name to check (e.g. John Doe)" 
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all font-medium text-slate-800"
                    onKeyDown={e => e.key === 'Enter' && runConflictCheck()}
                  />
                </div>
                <button onClick={runConflictCheck} disabled={isCheckingConflict || !conflictSearchName.trim()} className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold shadow-md shadow-amber-500/20 transition-all">
                  {isCheckingConflict ? 'Checking...' : 'Run Check'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
              {conflictResults.length === 0 && conflictSearchName && !isCheckingConflict ? (
                <div className="text-center py-8">
                  <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-50" />
                  <p className="text-emerald-700 font-bold">No conflicts found.</p>
                  <p className="text-slate-500 text-sm mt-1">Clear to proceed with "{conflictSearchName}".</p>
                </div>
              ) : conflictResults.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4 text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
                    <AlertTriangle className="w-5 h-5" />
                    <p className="font-bold text-sm">Potential Conflicts Found ({conflictResults.length})</p>
                  </div>
                  {conflictResults.map((res, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-800">{res.name}</p>
                        <p className="text-xs text-slate-500 font-medium mt-1">{res.detail}</p>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${res.type === 'Client' ? 'bg-blue-100 text-blue-700' : res.type === 'Case' ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700'}`}>
                        {res.type}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium text-sm">Enter a name and run the check.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
