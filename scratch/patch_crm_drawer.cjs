const fs = require('fs');
let content = fs.readFileSync('src/CrmModule.jsx', 'utf8');

// 1. Add User import
if (!content.includes('User, UserPlus')) {
  content = content.replace('ShieldOff, UserPlus, CheckCircle2', 'ShieldOff, User, UserPlus, CheckCircle2');
}

const drawerUI = `
      {/* Customer Details Drawer */}
      {isCustomerDetailsOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex justify-end animate-in fade-in">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
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

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Contact Info Card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Contact Information</h4>
                <div className="space-y-3">
                  {selectedCustomer.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <a href={\`tel:\${selectedCustomer.phone}\`} className="font-medium text-slate-700 hover:text-emerald-600">{selectedCustomer.phone}</a>
                    </div>
                  )}
                  {selectedCustomer.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <a href={\`mailto:\${selectedCustomer.email}\`} className="font-medium text-slate-700 hover:text-blue-600 truncate">{selectedCustomer.email}</a>
                    </div>
                  )}
                  {selectedCustomer.contactPerson && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-slate-700">{selectedCustomer.contactPerson}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setIsCustomerDetailsOpen(false); setIsEmailModalOpen(true); }} className="bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md text-slate-700 p-3 rounded-xl flex flex-col items-center gap-2 transition-all group">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold">Send Email</span>
                </button>
                <button onClick={() => { setIsCustomerDetailsOpen(false); setIsPhoneModalOpen(true); }} className="bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-md text-slate-700 p-3 rounded-xl flex flex-col items-center gap-2 transition-all group">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <Phone className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold">Log Call</span>
                </button>
              </div>

              {/* Notes Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Notes & Activity</h4>
                </div>
                <div className="space-y-3">
                  {selectedCustomer.notes && selectedCustomer.notes.length > 0 ? (
                    selectedCustomer.notes.map((note, idx) => (
                      <div key={idx} className="bg-yellow-50/50 rounded-xl p-3 border border-yellow-100/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-yellow-700 uppercase tracking-wider">{note?.type || 'Note'}</span>
                          <span className="text-[10px] text-slate-400">{note?.date ? new Date(note.date).toLocaleDateString() : ''}</span>
                        </div>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{note?.text || note}</p>
                        <p className="text-[10px] text-slate-400 mt-2 text-right">- {note?.author || 'Admin'}</p>
                      </div>
                    ))
                  ) : (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                      <p className="text-sm text-slate-500">No notes available for this customer.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Action */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button onClick={() => { setIsCustomerDetailsOpen(false); setEditingCustomer(selectedCustomer); setIsAddCustomerOpen(true); }} className="w-full bg-white border-2 border-slate-200 hover:border-recloud-500 text-slate-700 hover:text-recloud-600 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2">
                <Edit className="w-4 h-4" /> Edit Details
              </button>
            </div>
          </div>
        </div>
      )}
`;

if (!content.includes('Customer Details Drawer')) {
  // Insert before the last closing </div> element
  const index = content.lastIndexOf('    </div>\n  );\n}');
  if (index !== -1) {
    content = content.slice(0, index) + drawerUI + content.slice(index);
    fs.writeFileSync('src/CrmModule.jsx', content);
    console.log('CRM Drawer re-patched successfully!');
  } else {
    console.log('Could not find insertion point.');
  }
} else {
  console.log('CRM Drawer already patched.');
}
