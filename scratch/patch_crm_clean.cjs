const fs = require('fs');
let c = fs.readFileSync('src/CrmModule.jsx', 'utf8');

// ── 1. Add isCustomerDetailsOpen state + helper functions after line 43 (callTimer) ──
const anchor1 = '  const [callTimer, setCallTimer] = useState(null);\r\n';
const inject1 = `  const [isCustomerDetailsOpen, setIsCustomerDetailsOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);

  const startCallSimulation = () => {
    setCallDuration(0);
    const interval = setInterval(() => { setCallDuration(prev => prev + 1); }, 1000);
    window._callInterval = interval;
  };

  const handleSimulateCallEnd = () => {
    clearInterval(window._callInterval);
    setIsPhoneModalOpen(false);
    const note = { type: 'Call', text: \`Call ended after \${Math.floor(callDuration / 60)}m \${callDuration % 60}s\`, date: new Date().toISOString(), author: currentUser?.name || 'Admin' };
    const updatedNotes = [...(selectedCustomer?.notes || []), note];
    setSelectedCustomer({ ...selectedCustomer, notes: updatedNotes });
    if (selectedCustomer?.id) updateCustomer(selectedCustomer.id, { notes: updatedNotes }, currentTenant);
  };

  const handleSendEmail = async () => {
    if (!emailSubject || !emailBody) { alert('Subject and Body are required.'); return; }
    const note = { type: 'Email', text: \`Subject: \${emailSubject}\\n\\n\${emailBody}\`, date: new Date().toISOString(), author: currentUser?.name || 'Admin' };
    const updatedNotes = [...(selectedCustomer?.notes || []), note];
    setSelectedCustomer({ ...selectedCustomer, notes: updatedNotes });
    if (selectedCustomer?.id) await updateCustomer(selectedCustomer.id, { notes: updatedNotes }, currentTenant);
    setIsEmailModalOpen(false);
  };

  const handleDraftWithAI = () => {
    setEmailBody(\`Dear \${selectedCustomer?.name || 'Customer'},\\n\\nI hope this email finds you well. I am following up regarding our previous conversation. Please let me know if you need any further assistance.\\n\\nBest regards,\\n\${currentUser?.name || 'Admin'}\`);
  };

`;

if (!c.includes(anchor1)) {
  console.error('ANCHOR1 not found!'); process.exit(1);
}
c = c.replace(anchor1, anchor1 + inject1);
console.log('1. Injected isCustomerDetailsOpen + helper functions');

// ── 2. Make customer name clickable in the table ──
// Find where customers are rendered - look for the Eye button
const eyeAnchor = `onClick={() => { setSelectedCustomer(customer); setIsEmailModalOpen(true); }}`;
// We want to add an onClick to the customer name cell. Let's find the customer card/row.
// Actually let's add a dedicated "View" button or make the name clickable
// Find the customer name display in the table
const nameDisplay = `<p className="font-bold text-slate-800">{customer.name}</p>`;
const nameDisplayClickable = `<p className="font-bold text-slate-800 cursor-pointer hover:text-recloud-600 transition-colors" onClick={() => { setSelectedCustomer(customer); setIsCustomerDetailsOpen(true); }}>{customer.name}</p>`;

if (c.includes(nameDisplay)) {
  c = c.replace(nameDisplay, nameDisplayClickable);
  console.log('2. Made customer name clickable');
} else {
  console.log('2. SKIP: customer name display not found (may be different format)');
}

// ── 3. Add Drawer JSX before the closing </div> ──
const closingPattern = '    </div>\r\n  );\r\n}\r\n';
const drawerJSX = `
      {/* Customer Details Drawer */}
      {isCustomerDetailsOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex justify-end animate-in fade-in" onClick={(e) => { if (e.target === e.currentTarget) setIsCustomerDetailsOpen(false); }}>
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-recloud-500 to-recloud-600 flex items-center justify-center text-white font-bold shadow-sm">
                  {selectedCustomer.name?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 leading-tight">{selectedCustomer.name}</h3>
                  <p className="text-xs font-medium text-slate-500">{currentIndustry === 'law_firm' ? 'Client' : 'Customer'} Details</p>
                </div>
              </div>
              <button onClick={() => setIsCustomerDetailsOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Contact Information</h4>
                <div className="space-y-3">
                  {selectedCustomer.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><Phone className="w-4 h-4" /></div>
                      <a href={\`tel:\${selectedCustomer.phone}\`} className="font-medium text-slate-700 hover:text-emerald-600">{selectedCustomer.phone}</a>
                    </div>
                  )}
                  {selectedCustomer.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><Mail className="w-4 h-4" /></div>
                      <a href={\`mailto:\${selectedCustomer.email}\`} className="font-medium text-slate-700 hover:text-blue-600">{selectedCustomer.email}</a>
                    </div>
                  )}
                  {selectedCustomer.address && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0"><MapPin className="w-4 h-4" /></div>
                      <span className="font-medium text-slate-700">{selectedCustomer.address}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setIsPhoneModalOpen(true); startCallSimulation(); }} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors">
                  <Phone className="w-5 h-5" /> Call
                </button>
                <button onClick={() => { setEmailSubject(''); setEmailBody(''); setIsEmailModalOpen(true); }} className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors">
                  <Mail className="w-5 h-5" /> Email
                </button>
              </div>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Notes & Activity</h4>
                </div>
                <div className="space-y-3">
                  {selectedCustomer.notes && selectedCustomer.notes.length > 0 ? (
                    selectedCustomer.notes.map((note, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-yellow-700 uppercase tracking-wider">{note?.type || 'Note'}</span>
                          <span className="text-[10px] text-slate-400">{note?.date ? new Date(note.date).toLocaleDateString() : ''}</span>
                        </div>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{typeof note === 'object' ? (note?.text || '') : String(note)}</p>
                        <p className="text-[10px] text-slate-400 mt-2 text-right">- {note?.author || 'Admin'}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">No notes yet.</p>
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

`;

if (!c.includes(closingPattern)) {
  console.error('CLOSING PATTERN not found!'); process.exit(1);
}
c = c.replace(closingPattern, drawerJSX + closingPattern);
console.log('3. Injected Drawer JSX');

// ── 4. Add MapPin to imports if missing ──
if (!c.includes('MapPin')) {
  c = c.replace(
    "ShieldOff, UserPlus, CheckCircle2\r\n} from 'lucide-react';",
    "ShieldOff, UserPlus, CheckCircle2, MapPin\r\n} from 'lucide-react';"
  );
  console.log('4. Added MapPin import');
}

// ── 5. Add editingCustomer state if missing ──
if (!c.includes('editingCustomer')) {
  c = c.replace(
    '  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);\r\n',
    '  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);\r\n  const [editingCustomer, setEditingCustomer] = useState(null);\r\n'
  );
  console.log('5. Added editingCustomer state');
} else {
  console.log('5. editingCustomer already exists');
}

fs.writeFileSync('src/CrmModule.jsx', c);
console.log('\\nDONE - CrmModule.jsx patched cleanly!');
