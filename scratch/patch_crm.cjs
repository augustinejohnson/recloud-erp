const fs = require('fs');
let content = fs.readFileSync('src/CrmModule.jsx', 'utf8');

// 1. Add state
content = content.replace(
  'const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);',
  'const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);\n  const [isCustomerDetailsOpen, setIsCustomerDetailsOpen] = useState(false);'
);

// 2. Add onClick to row
content = content.replace(
  '<tr key={customer.id} className="hover:bg-slate-50 transition-colors">',
  '<tr key={customer.id} onClick={() => { setSelectedCustomer(customer); setIsCustomerDetailsOpen(true); }} className="hover:bg-slate-50 transition-colors cursor-pointer group">'
);

// 3. Stop buttons from bubbling event
content = content.replace(
  /onClick=\{\(\) => \{ setSelectedCustomer\(customer\); setIsEmailModalOpen\(true\); \}\}/g,
  'onClick={(e) => { e.stopPropagation(); setSelectedCustomer(customer); setIsEmailModalOpen(true); }}'
);
content = content.replace(
  /onClick=\{\(\) => \{ setSelectedCustomer\(customer\); setIsPhoneModalOpen\(true\); \}\}/g,
  'onClick={(e) => { e.stopPropagation(); setSelectedCustomer(customer); setIsPhoneModalOpen(true); }}'
);
content = content.replace(
  /onClick=\{\(\) => \{ setEditingCustomer\(customer\); setIsAddCustomerOpen\(true\); \}\}/g,
  'onClick={(e) => { e.stopPropagation(); setEditingCustomer(customer); setIsAddCustomerOpen(true); }}'
);
content = content.replace(
  /onClick=\{\(\) => handleDeleteCustomer\(customer\.id\)\}/g,
  'onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(customer.id); }}'
);

// 4. Add the modal UI before the last closing div
const modalCode = `
      {isCustomerDetailsOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end animate-in fade-in" onClick={() => setIsCustomerDetailsOpen(false)}>
          <div className="w-[450px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{selectedCustomer.name}</h2>
                <p className="text-sm text-slate-500">{selectedCustomer.contactPerson || 'No contact person'}</p>
              </div>
              <button onClick={() => setIsCustomerDetailsOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Quick Actions */}
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => { setIsCustomerDetailsOpen(false); setIsEmailModalOpen(true); }} className="flex flex-col items-center justify-center p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors">
                  <Mail className="w-5 h-5 mb-1" />
                  <span className="text-xs font-bold">Email</span>
                </button>
                <button onClick={() => { setIsCustomerDetailsOpen(false); setIsPhoneModalOpen(true); }} className="flex flex-col items-center justify-center p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors">
                  <Phone className="w-5 h-5 mb-1" />
                  <span className="text-xs font-bold">Call</span>
                </button>
                <a href={selectedCustomer.phone ? \`https://wa.me/\${selectedCustomer.phone.replace(/[^0-9]/g, '')}\` : '#'} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors">
                  <MessageCircle className="w-5 h-5 mb-1" />
                  <span className="text-xs font-bold">WhatsApp</span>
                </a>
              </div>

              {/* Info */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">{selectedCustomer.email || '—'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">{selectedCustomer.phone || '—'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">{selectedCustomer.address || '—'}</span>
                </div>
              </div>

              {/* Notes & Activity Log */}
              <div>
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-recloud-500"/> Activity & Notes</h3>
                
                <form onSubmit={handleAddNote} className="mb-4">
                  <div className="flex gap-2">
                    <input type="text" value={newNoteText} onChange={e => setNewNoteText(e.target.value)} placeholder="Add a quick note..." className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-recloud-500" />
                    <button type="submit" className="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-900 transition-colors">Add</button>
                  </div>
                </form>

                <div className="space-y-3">
                  {(!selectedCustomer.notes || selectedCustomer.notes.length === 0) && (
                    <p className="text-sm text-slate-400 italic text-center py-4">No notes or activity logged yet.</p>
                  )}
                  {selectedCustomer.notes?.slice().reverse().map((note, idx) => (
                    <div key={idx} className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm flex items-start gap-3">
                      <div className="mt-0.5">
                        {note.type === 'email' ? <Mail className="w-4 h-4 text-blue-500"/> :
                         note.type === 'call' ? <Phone className="w-4 h-4 text-emerald-500"/> :
                         <StickyNote className="w-4 h-4 text-recloud-500"/>}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-700">{note.text}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">{new Date(note.date).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

content = content.replace('    </div>\n  );\n}', modalCode);

// Add missing icon imports if needed
if (!content.includes('MessageCircle')) {
  content = content.replace('Mail, ', 'Mail, MessageCircle, StickyNote, MapPin, Clock, ');
}

fs.writeFileSync('src/CrmModule.jsx', content);
console.log('Successfully added Customer Details Drawer');
