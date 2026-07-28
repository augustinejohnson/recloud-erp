const fs = require('fs');
let content = fs.readFileSync('src/CrmModule.jsx', 'utf8');

const searchStr = `                  <span className="text-xs font-bold">Send Email</span>
                </button>
              <button onClick={() => { setIsCustomerDetailsOpen(false); setEditingCustomer(selectedCustomer); setIsAddCustomerOpen(true); }} className="w-full bg-white border-2 border-slate-200 hover:border-recloud-500 text-slate-700 hover:text-recloud-600 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2">
                <Edit className="w-4 h-4" /> Edit Details
              </button>`;

const replaceStr = `                  <span className="text-xs font-bold">Send Email</span>
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
                          <span className="text-[10px] font-bold text-yellow-700 uppercase tracking-wider">{note.type}</span>
                          <span className="text-[10px] text-slate-400">{new Date(note.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{note.text}</p>
                        <p className="text-[10px] text-slate-400 mt-2 text-right">- {note.author}</p>
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
              </button>`;

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync('src/CrmModule.jsx', content);
  console.log('Successfully repaired CrmModule.jsx notes logic!');
} else {
  console.log('Failed to find replacement string.');
}
