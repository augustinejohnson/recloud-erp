const fs = require('fs');
let content = fs.readFileSync('src/CrmModule.jsx', 'utf8');

const drawerJSX = `
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
                      <a href={\`mailto:\${selectedCustomer.email}\`} className="font-medium text-slate-700 hover:text-blue-600">{selectedCustomer.email}</a>
                    </div>
                  )}
                  {selectedCustomer.address && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-slate-700">{selectedCustomer.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => {setIsPhoneModalOpen(true); startCallSimulation();}} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors">
                  <Phone className="w-5 h-5" /> Call
                </button>
                <button onClick={() => { setEmailSubject(''); setEmailBody(''); setIsEmailModalOpen(true); }} className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors">
                  <Mail className="w-5 h-5" /> Email
                </button>
              </div>

              {/* Notes Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Notes & Activity</h4>
                  <button onClick={() => setIsAddNoteOpen(true)} className="text-xs font-bold text-recloud-600 hover:text-recloud-700 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Note
                  </button>
                </div>
                <div className="space-y-3">
                  {selectedCustomer.notes && selectedCustomer.notes.length > 0 ? (
                    selectedCustomer.notes.map((note, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-yellow-700 uppercase tracking-wider">{note?.type || 'Note'}</span>
                          <span className="text-[10px] text-slate-400">{note?.date ? new Date(note.date).toLocaleDateString() : ''}</span>
                        </div>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{typeof note === 'object' ? (note?.text || '') : note}</p>
                        <p className="text-[10px] text-slate-400 mt-2 text-right">- {note?.author || 'Admin'}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
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

const endOfFile = "    </div>\n  );\n}";
const endOfFileCRLF = "    </div>\r\n  );\r\n}";

if (content.includes(endOfFile)) {
    content = content.replace(endOfFile, drawerJSX + '\n' + endOfFile);
} else if (content.includes(endOfFileCRLF)) {
    content = content.replace(endOfFileCRLF, drawerJSX + '\r\n' + endOfFileCRLF);
} else {
    console.error("Could not find end of file signature!");
}

fs.writeFileSync('src/CrmModule.jsx', content);
console.log("Safely patched CrmModule.jsx!");
