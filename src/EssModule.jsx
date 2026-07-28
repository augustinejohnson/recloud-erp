import React from 'react';
import { Clock, CalendarCheck, Receipt, FileText, Download, Briefcase, CheckCircle2, Banknote } from 'lucide-react';

export default function EssModule({
  currentUser,
  handleStaffClock,
  setIsLeaveModalOpen,
  setActiveTab,
  getLocalDateStr,
  shifts,
  leaves,
  searchQuery,
  payslips,
  downloadPayslipPDF,
  newDoc,
  setNewDoc,
  handleUploadDocument,
  handleFileChange,
  documents,
  handleDownloadDocument,
  reviews
}) {
  return (
    <>
      
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Self Service Portal</h2>
                <p className="text-slate-500 mt-1">Welcome back, {currentUser.name}. Manage your time and schedules here.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
                  <Clock className="w-12 h-12 text-recloud-500 mb-4" />
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Time & Attendance</h3>
                  <p className="text-slate-500 text-sm mb-6">Log your hours for today's shift.</p>
                  <div className="flex gap-4">
                    <button onClick={() => handleStaffClock('Clock In')} disabled={currentUser.status === 'Clocked In'} className="bg-recloud-600 hover:bg-recloud-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all text-sm">Clock In</button>
                    <button onClick={() => handleStaffClock('Clock Out')} disabled={currentUser.status !== 'Clocked In'} className="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-bold py-3 px-6 rounded-xl transition-all text-sm">Clock Out</button>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center relative overflow-hidden">
                  <CalendarCheck className="w-12 h-12 text-amber-500 mb-4 relative z-10" />
                  <h3 className="text-xl font-bold text-slate-800 mb-2 relative z-10">Time Off</h3>
                  <p className="text-slate-500 text-sm mb-6 relative z-10">Request vacation or sick leave.</p>
                  <button onClick={() => setIsLeaveModalOpen(true)} className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all relative z-10 text-sm">Request Leave</button>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500 blur-3xl opacity-10 rounded-full translate-x-10 -translate-y-10"></div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center relative overflow-hidden">
                  <Receipt className="w-12 h-12 text-emerald-500 mb-4 relative z-10" />
                  <h3 className="text-xl font-bold text-slate-800 mb-2 relative z-10">Expenses</h3>
                  <p className="text-slate-500 text-sm mb-6 relative z-10">Submit claims and requests.</p>
                  <button onClick={() => setActiveTab('taxes')} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all relative z-10 text-sm">My Expenses</button>
                  <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500 blur-3xl opacity-10 rounded-full -translate-x-10 -translate-y-10"></div>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                <h3 className="text-lg font-bold text-slate-800 mb-6">My Upcoming Shifts</h3>
                <div className="space-y-3">
                  {(() => {
                    const todayStr = getLocalDateStr(new Date());
                    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
                    const upcoming = shifts
                      .filter(s => s.employeeId === currentUser.id && isoRegex.test(s.date) && s.date >= todayStr)
                      .sort((a,b) => new Date(a.date) - new Date(b.date))
                      .slice(0, 5);
                      
                    if (upcoming.length === 0) {
                      return <p className="text-slate-500 italic text-sm">No upcoming shifts scheduled.</p>;
                    }
                    
                    return upcoming.map(shift => {
                      const d = new Date(shift.date);
                      return (
                        <div key={shift.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex flex-col items-center justify-center leading-none">
                              <span className="text-xs font-bold uppercase">{d.toLocaleDateString('en-US', {weekday: 'short'})}</span>
                              <span className="text-lg font-black">{d.getDate()}</span>
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{shift.shiftType} Shift</p>
                              <p className="text-sm text-slate-500">
                                {shift.shiftType === 'Morning' ? '8:00 AM - 4:00 PM' : shift.shiftType === 'Afternoon' ? '4:00 PM - 12:00 AM' : '12:00 AM - 8:00 AM'}
                              </p>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-white border border-slate-200 text-slate-500 text-xs font-bold rounded-lg">{shift.date === todayStr ? 'Today' : 'Upcoming'}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <div id="ess-leaves" className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mt-8">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-recloud-500" /> My Leave Requests
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Dates</th>
                        <th className="px-4 py-3">Reason</th>
                        <th className="px-4 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leaves.filter(l => l.employeeId === currentUser.id && (l.type.toLowerCase().includes(searchQuery.toLowerCase()) || l.reason.toLowerCase().includes(searchQuery.toLowerCase()))).length === 0 ? (
                        <tr>
                          <td colSpan="4" className="px-4 py-8 text-center text-slate-400">You have no matching leave requests.</td>
                        </tr>
                      ) : (
                        leaves.filter(l => l.employeeId === currentUser.id && (l.type.toLowerCase().includes(searchQuery.toLowerCase()) || l.reason.toLowerCase().includes(searchQuery.toLowerCase()))).map(req => (
                          <tr key={req.id}>
                            <td className="px-4 py-3 font-medium text-slate-700">{req.type}</td>
                            <td className="px-4 py-3 text-slate-500">{req.startDate} to {req.endDate}</td>
                            <td className="px-4 py-3 text-slate-500 truncate max-w-[200px]" title={req.reason}>{req.reason}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${req.status === 'Approved' ? 'bg-green-100 text-green-700' : req.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                {req.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div id="ess-payslips" className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mt-8">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-green-500" /> My Payslips
                </h3>
                <div className="space-y-3">
                  {payslips.filter(p => p.employeeId === currentUser.id && p.period.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                    <p className="text-center text-slate-400 py-4">No matching payslips.</p>
                  ) : (
                    payslips.filter(p => p.employeeId === currentUser.id && p.period.toLowerCase().includes(searchQuery.toLowerCase())).map(ps => (
                      <div key={ps.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center hover:bg-slate-100 transition-colors cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600 shadow-sm">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">Payslip - {ps.period}</p>
                            <p className="text-xs text-green-600 font-bold">Net Pay: {ps.currency || '$'}{Number(ps.netAmount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                          </div>
                        </div>
                        <button onClick={() => downloadPayslipPDF(ps)} className="text-recloud-600 font-semibold text-sm hover:underline flex items-center gap-1"><Download className="w-4 h-4"/> Download PDF</button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div id="ess-documents" className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mt-8">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-recloud-500" /> My Vault
                </h3>
                
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-6">
                  <h4 className="font-bold text-sm text-slate-800 mb-3">Share Document with HR</h4>
                  <form onSubmit={(e) => handleUploadDocument(e, currentUser.id, 'Staff')} className="flex flex-col md:flex-row gap-3">
                    <input required type="text" placeholder="Document Name (e.g. Passport)" value={newDoc.name} onChange={e => setNewDoc({...newDoc, name: e.target.value})} className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500" />
                    <select value={newDoc.type} onChange={e => setNewDoc({...newDoc, type: e.target.value})} className="text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none bg-white">
                      <option>Personal ID</option>
                      <option>Certificate</option>
                      <option>Tax Form</option>
                      <option>Other</option>
                    </select>
                    <input required type="file" onChange={handleFileChange} className="flex-1 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-recloud-50 file:text-recloud-700 hover:file:bg-recloud-100"/>
                    <button type="submit" className="bg-recloud-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-recloud-700 transition-colors">Upload</button>
                  </form>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-slate-800 mb-3">Your Documents</h4>
                  {documents.filter(d => d.employeeId === currentUser.id && d.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                    <p className="text-center text-slate-400 py-4">No matching documents.</p>
                  ) : (
                    documents.filter(d => d.employeeId === currentUser.id && d.name.toLowerCase().includes(searchQuery.toLowerCase())).map(doc => (
                      <div key={doc.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center hover:bg-slate-100 transition-colors cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600 shadow-sm">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{doc.name}</p>
                            <p className="text-xs text-slate-500 font-bold">{doc.type} • Uploaded by {doc.uploadedBy || 'HR'} on {new Date(doc.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <button onClick={() => handleDownloadDocument(doc)} className="text-recloud-600 font-semibold text-sm hover:underline flex items-center gap-1"><Download className="w-4 h-4"/> Download</button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div id="ess-performance" className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mt-8">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-amber-500" /> Performance Reviews
                </h3>
                <div className="space-y-4">
                  {reviews.filter(r => r.employeeId === currentUser.id && (r.comments.toLowerCase().includes(searchQuery.toLowerCase()) || r.reviewerName.toLowerCase().includes(searchQuery.toLowerCase()))).length === 0 ? (
                    <p className="text-center text-slate-400 py-4">No matching performance reviews.</p>
                  ) : (
                    reviews.filter(r => r.employeeId === currentUser.id && (r.comments.toLowerCase().includes(searchQuery.toLowerCase()) || r.reviewerName.toLowerCase().includes(searchQuery.toLowerCase()))).sort((a,b) => new Date(b.date) - new Date(a.date)).map(rev => (
                      <div key={rev.id} className="p-5 rounded-xl border border-slate-100 bg-slate-50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex text-amber-400 text-xl mb-1">
                              {'★'.repeat(rev.score)}{'☆'.repeat(5 - rev.score)}
                            </div>
                            <p className="text-xs text-slate-500">Reviewed by {rev.reviewerName} on {new Date(rev.date).toLocaleDateString()}</p>
                          </div>
                          <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-slate-600 border border-slate-200 shadow-sm">Score: {rev.score}/5</span>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed mb-3">{rev.comments}</p>
                        {rev.goals && (
                          <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-900 border border-blue-100 shadow-sm">
                            <span className="font-bold block mb-1">Goals for Next Quarter:</span> {rev.goals}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          
    </>
  );
}
