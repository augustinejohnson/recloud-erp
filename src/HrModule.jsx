import React from 'react';
import { Users, Clock, Calendar, FileText, CheckCircle2, XCircle, Search, Plus, CalendarCheck, Briefcase, Trash2, Banknote, X, Save } from 'lucide-react';

export default function HrModule({
  currentUser,
  currentTenant,
  hrTab,
  setHrTab,
  setIsAddModalOpen,
  visibleEmployees,
  shifts,
  getLocalDateStr,
  setIsLeaveModalOpen,
  filterDept,
  setFilterDept,
  filterBranch,
  setFilterBranch,
  warehouses,
  isLoading,
  handleToggleClock,
  openProfile,
  handleDeleteEmployee,
  currentWeekStart,
  setCurrentWeekStart,
  weekDates,
  visibleShifts,
  handleShiftClick,
  visibleLeaves,
  handleUpdateLeave,
  updateEmployee,
  fetchEmployees,
  setSelectedPayslipEmp,
  setPayslipCurrency,
  setPayslipMonths,
  setPayslipTaxRate,
  setPayslipLineItems,
  setIsPayslipModalOpen,
  handleAddJob,
  newJob,
  setNewJob,
  jobs,
  handleAddApplicant,
  newApplicant,
  setNewApplicant,
  applicants,
  handleUpdateApplicantStatus,
  settingsMessage,
  handleSaveSettings,
  settingsForm,
  setSettingsForm,
  setSettingsMessage
}) {
  return (
    <>
      
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
              <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-400/20 rounded-full blur-[100px] pointer-events-none"></div>
              <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-400/20 rounded-full blur-[100px] pointer-events-none"></div>
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 md:mb-8 relative z-10 gap-3">
                <div>
                  <h2 className="text-xl md:text-4xl font-black text-slate-800 tracking-tight drop-shadow-sm">Human Resources</h2>
                  <p className="text-slate-500 mt-1 md:mt-2 font-medium text-xs md:text-base">Manage employees, shifts, and attendance across the organization.</p>
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className="bg-recloud-600 hover:bg-recloud-700 text-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl shadow-lg shadow-recloud-500/30 font-bold text-xs md:text-sm flex items-center gap-2 transition-all transform hover:-translate-y-0.5 w-full md:w-auto justify-center md:justify-start">
                  <Plus className="w-4 h-4" /> Add Employee
                </button>
              </div>

              {/* HR Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-8 relative z-10">
                <div className="bg-white/70 backdrop-blur-xl p-3 md:p-6 rounded-2xl md:rounded-3xl shadow-xl shadow-indigo-900/5 border border-white/50 flex items-center gap-3 md:gap-4 hover:shadow-2xl transition-all duration-300">
                  <div className="p-3 bg-recloud-50/80 text-recloud-600 rounded-2xl"><Users className="w-6 h-6" /></div>
                  <div>
                    <p className="text-[10px] md:text-sm text-slate-500 font-bold mb-0.5 md:mb-1">Total Staff</p>
                    <h3 className="text-xl md:text-3xl font-black text-slate-800">{visibleEmployees.length}</h3>
                  </div>
                </div>
                <div className="bg-white/70 backdrop-blur-xl p-3 md:p-6 rounded-2xl md:rounded-3xl shadow-xl shadow-indigo-900/5 border border-white/50 flex items-center gap-3 md:gap-4 hover:shadow-2xl transition-all duration-300">
                  <div className="p-3 bg-green-50/80 text-green-600 rounded-2xl"><Clock className="w-6 h-6" /></div>
                  <div>
                    <p className="text-[10px] md:text-sm text-slate-500 font-bold mb-0.5 md:mb-1">Clocked In</p>
                    <h3 className="text-xl md:text-3xl font-black text-slate-800">{visibleEmployees.filter(e => e.status === 'Clocked In').length}</h3>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-xl text-white flex justify-between items-center col-span-2 relative overflow-hidden border border-slate-700">
                  <div className="relative z-10">
                    <p className="text-sm text-slate-300 font-medium mb-1">Tomorrow's Shifts</p>
                    {(() => {
                      const tomorrowStr = getLocalDateStr(new Date(new Date().setDate(new Date().getDate() + 1)));
                      const tomorrowShifts = shifts.filter(s => s.date === tomorrowStr);
                      if (tomorrowShifts.length === 0) {
                        return <h3 className="text-lg font-bold">No shifts scheduled</h3>;
                      }
                      return (
                        <>
                          <h3 className="text-lg font-bold">{tomorrowShifts.length} Staff Scheduled</h3>
                          <p className="text-xs text-slate-400 mt-2">Make sure everyone is ready for tomorrow.</p>
                        </>
                      );
                    })()}
                  </div>
                  <div onClick={() => setHrTab('roster')} className="relative z-10 bg-white/10 p-3 rounded-xl backdrop-blur-md border border-white/10 cursor-pointer hover:bg-white/20 transition-all">
                    <span className="text-sm font-medium">View Roster</span>
                  </div>
                  <div className="absolute right-0 top-0 w-32 h-32 bg-recloud-500 blur-3xl opacity-20 rounded-full translate-x-10 -translate-y-10"></div>
                </div>
              </div>

              {/* HR Navigation */}
              <div className="flex justify-between items-center mb-4 md:mb-6 border-b border-slate-200/50 relative z-10">
                <div className="flex gap-1 md:gap-4 overflow-x-auto no-scrollbar w-full">
                  <button onClick={() => setHrTab('directory')} className={`pb-2 md:pb-3 px-1.5 md:px-2 text-[11px] md:text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${hrTab === 'directory' ? 'border-recloud-600 text-recloud-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    Employee Directory
                  </button>
                  <button onClick={() => setHrTab('roster')} className={`pb-2 md:pb-3 px-1.5 md:px-2 text-[11px] md:text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${hrTab === 'roster' ? 'border-recloud-600 text-recloud-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    Shift Roster
                  </button>
                  <button onClick={() => setHrTab('leaves')} className={`pb-2 md:pb-3 px-1.5 md:px-2 text-[11px] md:text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${hrTab === 'leaves' ? 'border-recloud-600 text-recloud-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    Leave & Absence
                  </button>
                  {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'hr_manager') && (
                    <button onClick={() => setHrTab('payroll')} className={`pb-2 md:pb-3 px-1.5 md:px-2 text-[11px] md:text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${hrTab === 'payroll' ? 'border-recloud-600 text-recloud-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                      Payroll
                    </button>
                  )}
                  <button onClick={() => setHrTab('recruitment')} className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors ${hrTab === 'recruitment' ? 'border-recloud-600 text-recloud-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    Recruitment ATS
                  </button>
                  {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'hr_manager') && (
                    <button onClick={() => setHrTab('settings')} className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors ${hrTab === 'settings' ? 'border-recloud-600 text-recloud-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                      Settings
                    </button>
                  )}
                </div>
                {hrTab === 'leaves' && (
                  <button onClick={() => setIsLeaveModalOpen(true)} className="mb-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl shadow font-bold text-xs flex items-center gap-2 transition-all hover:-translate-y-0.5">
                    <CalendarCheck className="w-3.5 h-3.5" /> Request Leave
                  </button>
                )}
              </div>

              {hrTab === 'directory' ? (
                /* Employee Directory */
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl shadow-indigo-900/5 border border-white/50 overflow-hidden min-h-[300px] animate-in fade-in slide-in-from-bottom-2 duration-300 relative z-10">
                  <div className="p-8 border-b border-white/50 flex justify-between items-center bg-indigo-50/20">
                    <h3 className="text-lg font-bold text-slate-800">Staff List</h3>
                    <div className="flex gap-2">
                      <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-recloud-500/20">
                        <option>All Departments</option>
                        <option>Operations</option>
                        <option>Sales & Marketing</option>
                        <option>IT & Engineering</option>
                        <option>Finance & Legal</option>
                        <option>Human Resources</option>
                      </select>
                      <select value={filterBranch || 'all'} onChange={e => setFilterBranch(e.target.value === 'all' ? '' : e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-recloud-500/20">
                        <option value="all">All Branches</option>
                        <option value="none">Unassigned</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  {isLoading ? (
                    <div className="flex items-center justify-center p-12 text-slate-400">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-recloud-600 mr-3"></div>
                      Loading employees from Firebase...
                    </div>
                  ) : visibleEmployees.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                      <Users className="w-12 h-12 mb-3 text-slate-300" />
                      <p>No employees found in this organization.</p>
                      <button onClick={() => setIsAddModalOpen(true)} className="text-recloud-600 mt-2 text-sm font-bold hover:underline">Add your first employee</button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto w-full no-scrollbar"><table className="w-full min-w-max text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4">Employee</th>
                          <th className="px-6 py-4">Role</th>
                          <th className="px-6 py-4">Department</th>
                          <th className="px-6 py-4">Branch</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {visibleEmployees
                          .filter(emp => filterDept === 'All Departments' || emp.department === filterDept)
                          .filter(emp => !filterBranch || (filterBranch === 'none' ? !emp.warehouseId : emp.warehouseId === filterBranch))
                          .map(emp => {
                          return (
                          <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-recloud-100 text-recloud-700 flex items-center justify-center font-bold text-xs border border-recloud-200 shadow-sm overflow-hidden flex-shrink-0">
                                  {emp.avatar?.startsWith('data:image') || emp.avatar?.startsWith('http') ? (
                                    <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" />
                                  ) : (
                                    emp.avatar
                                  )}
                                </div>
                                <span className="font-semibold text-slate-800">{emp.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-600 font-medium capitalize">{emp.role ? emp.role.replace('_', ' ') : 'Staff'}</td>
                            <td className="px-6 py-4">
                              <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-medium">
                                {emp.department || 'General'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {emp.warehouseId ? (() => {
                                const branch = warehouses.find(w => w.id === emp.warehouseId);
                                return branch ? (
                                  <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-bold border border-emerald-200 inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                    {branch.name}
                                  </span>
                                ) : <span className="text-xs text-slate-400">Unknown</span>;
                              })() : (
                                <span className="text-xs text-slate-400 italic">Global</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${emp.status === 'Clocked In' ? 'bg-green-100 text-green-700' : emp.status === 'Inactive' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'}`}>
                                {emp.status || 'Clocked Out'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleToggleClock(emp)} disabled={emp.status === 'Inactive'} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded text-xs font-bold transition disabled:opacity-50">
                                {emp.status === 'Clocked In' ? 'Clock Out' : 'Clock In'}
                              </button>
                              <button onClick={() => openProfile(emp)} className="text-recloud-600 font-medium text-sm hover:underline">
                                Profile
                              </button>
                              <button onClick={() => handleDeleteEmployee(emp.id)} className="text-red-500 hover:text-red-700 transition-colors p-1" title="Delete Employee">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                        })}
                      </tbody>
                    </table></div>
                  )}
                </div>
              ) : hrTab === 'roster' ? (
                /* Shift Roster UI */
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl shadow-indigo-900/5 border border-white/50 overflow-hidden min-h-[300px] animate-in fade-in slide-in-from-bottom-2 duration-300 relative z-10">
                  <div className="p-8 border-b border-white/50 flex justify-between items-center bg-indigo-50/20">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-recloud-600" /> Weekly Schedule</h3>
                      <p className="text-xs text-slate-500 mt-1">Click any cell to assign or change a shift (Morning → Afternoon → Night → Off)</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { const d = new Date(currentWeekStart); d.setDate(d.getDate() - 7); setCurrentWeekStart(d); }} className="text-sm bg-white border border-slate-200 rounded-lg px-4 py-2 font-medium text-slate-600 hover:bg-slate-50 shadow-sm transition-colors">Previous Week</button>
                      <button onClick={() => { const d = new Date(currentWeekStart); d.setDate(d.getDate() + 7); setCurrentWeekStart(d); }} className="text-sm bg-white border border-slate-200 rounded-lg px-4 py-2 font-medium text-slate-600 hover:bg-slate-50 shadow-sm transition-colors">Next Week</button>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-max text-left text-sm border-collapse whitespace-nowrap">
                      <thead className="bg-slate-100/50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4 border-r border-slate-100 sticky left-0 bg-slate-100/90 backdrop-blur-sm z-10 w-48">Employee</th>
                          {weekDates.map(d => (
                            <th key={d.toISOString()} className="px-3 py-4 text-center min-w-[120px]">
                              {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {visibleEmployees.map(emp => (
                          <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-3 border-r border-slate-100 sticky left-0 bg-white/90 backdrop-blur-sm z-10 font-semibold text-slate-700 flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full bg-recloud-100 text-recloud-700 flex items-center justify-center font-bold text-[10px] overflow-hidden flex-shrink-0">
                                {emp.avatar?.startsWith('data:image') || emp.avatar?.startsWith('http') ? (
                                  <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" />
                                ) : (
                                  emp.avatar
                                )}
                              </div>
                              <span className="truncate w-32">{emp.name}</span>
                            </td>
                            {weekDates.map(d => {
                              const dayStr = getLocalDateStr(d);
                              const shift = visibleShifts.find(s => s.employeeId === emp.id && s.date === dayStr);
                              let cellClass = "cursor-pointer transition-all duration-200 text-center relative group";
                              let shiftBadge = null;
                              
                              if (shift?.shiftType === 'Morning') {
                                cellClass += " bg-blue-50 hover:bg-blue-100";
                                shiftBadge = <span className="inline-block px-2.5 py-1 bg-blue-100 text-blue-700 font-bold text-xs rounded-md shadow-sm border border-blue-200">Morning<br/><span className="font-medium text-[10px] text-blue-500">8am - 4pm</span></span>;
                              } else if (shift?.shiftType === 'Afternoon') {
                                cellClass += " bg-amber-50 hover:bg-amber-100";
                                shiftBadge = <span className="inline-block px-2.5 py-1 bg-amber-100 text-amber-700 font-bold text-xs rounded-md shadow-sm border border-amber-200">Afternoon<br/><span className="font-medium text-[10px] text-amber-500">4pm - 12am</span></span>;
                              } else if (shift?.shiftType === 'Night') {
                                cellClass += " bg-indigo-50 hover:bg-indigo-100";
                                shiftBadge = <span className="inline-block px-2.5 py-1 bg-indigo-100 text-indigo-700 font-bold text-xs rounded-md shadow-sm border border-indigo-200">Night<br/><span className="font-medium text-[10px] text-indigo-500">12am - 8am</span></span>;
                              } else {
                                cellClass += " hover:bg-slate-100";
                                shiftBadge = <span className="text-slate-300 font-medium text-xs group-hover:text-slate-400">Off</span>;
                              }

                              return (
                                <td key={dayStr} className={cellClass} onClick={() => handleShiftClick(emp, dayStr)}>
                                  <div className="w-full h-full p-2 min-h-[64px] flex items-center justify-center">
                                    {shiftBadge}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : hrTab === 'leaves' ? (
                /* Leave Management UI */
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl shadow-indigo-900/5 border border-white/50 overflow-hidden min-h-[300px] animate-in fade-in slide-in-from-bottom-2 duration-300 relative z-10">
                  <div className="p-8 border-b border-white/50 flex justify-between items-center bg-indigo-50/20">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><CalendarCheck className="w-5 h-5 text-recloud-600" /> Leave Requests</h3>
                      <p className="text-xs text-slate-500 mt-1">Review and approve employee time-off requests.</p>
                    </div>
                  </div>
                  
                  {visibleLeaves.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                      <CalendarCheck className="w-12 h-12 mb-3 text-slate-300" />
                      <p>No leave requests found.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-max text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-4">Employee</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4">Dates</th>
                            <th className="px-6 py-4">Reason</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {visibleLeaves.map(req => (
                            <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-semibold text-slate-800">{req.employeeName}</td>
                              <td className="px-6 py-4">
                                <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-medium">{req.type}</span>
                              </td>
                              <td className="px-6 py-4 text-slate-600 font-medium">{req.startDate} to {req.endDate}</td>
                              <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{req.reason}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${req.status === 'Approved' ? 'bg-green-100 text-green-700' : req.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {req.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {req.status === 'Pending' ? (
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => handleUpdateLeave(req.id, 'Approved')} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Approve">
                                      <CheckCircle2 className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleUpdateLeave(req.id, 'Rejected')} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Reject">
                                      <XCircle className="w-5 h-5" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-xs font-medium uppercase">{req.status}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : hrTab === 'payroll' ? (
                /* Payroll Management UI */
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl shadow-indigo-900/5 border border-white/50 overflow-hidden min-h-[300px] animate-in fade-in slide-in-from-bottom-2 duration-300 relative z-10">
                  <div className="p-8 border-b border-white/50 flex justify-between items-center bg-indigo-50/20">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Banknote className="w-5 h-5 text-recloud-600" /> Payroll Management</h3>
                      <p className="text-xs text-slate-500 mt-1">Manage salaries and generate monthly payslips.</p>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-max text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4">Employee</th>
                          <th className="px-6 py-4">Role</th>
                          <th className="px-6 py-4">Annual Base Salary</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {visibleEmployees.map(emp => (
                          <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-slate-800">{emp.name}</td>
                            <td className="px-6 py-4 text-slate-500">{emp.role}</td>
                            <td className="px-6 py-4 font-mono font-medium text-slate-700">
                              {emp.salary ? `$${Number(emp.salary).toLocaleString()}` : <span className="text-slate-400 italic">Not set</span>}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => {
                                  const amount = window.prompt(`Enter new annual salary for ${emp.name} (Numbers only):`, emp.salary || '');
                                  if (amount && !isNaN(amount)) {
                                    updateEmployee(emp.id, { salary: Number(amount) }).then(fetchEmployees);
                                  }
                                }} className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Set Salary</button>
                                
                                <button onClick={() => {
                                  if (!emp.salary) {
                                    alert('Please set a base salary first before generating a payslip.');
                                    return;
                                  }
                                  setSelectedPayslipEmp(emp);
                                  setPayslipCurrency('$');
                                  setPayslipMonths(1);
                                  setPayslipTaxRate(20);
                                  setPayslipLineItems([]);
                                  setIsPayslipModalOpen(true);
                                }} className="px-3 py-1.5 text-xs font-bold text-white bg-recloud-600 hover:bg-recloud-700 rounded-lg shadow transition-colors flex items-center gap-1"><FileText className="w-3.5 h-3.5"/> Issue Payslip</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : hrTab === 'recruitment' ? (
                /* ATS UI */
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl shadow-indigo-900/5 border border-white/50 overflow-hidden min-h-[300px] animate-in fade-in slide-in-from-bottom-2 duration-300 p-8 relative z-10">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Briefcase className="w-5 h-5 text-recloud-600" /> Applicant Tracking System</h3>
                      <p className="text-xs text-slate-500 mt-1">Manage job applicants across the recruitment pipeline.</p>
                    </div>
                  </div>
                  
                  {/* Job Board Management */}
                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 mb-8">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Briefcase className="w-4 h-4 text-recloud-600"/> Public Job Postings</h4>
                    
                    <form onSubmit={handleAddJob} className="flex flex-wrap gap-3 items-end mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                      <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Job Title</label>
                        <input required type="text" value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500" placeholder="e.g. Senior Developer" />
                      </div>
                      <div className="w-[120px]">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Department</label>
                        <select value={newJob.department} onChange={e => setNewJob({...newJob, department: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500 bg-white">
                          <option>Operations</option>
                          <option>Sales & Marketing</option>
                          <option>IT & Engineering</option>
                          <option>Finance & Legal</option>
                          <option>Human Resources</option>
                        </select>
                      </div>
                      <div className="w-[120px]">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Type</label>
                        <select value={newJob.type} onChange={e => setNewJob({...newJob, type: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500 bg-white">
                          <option>Full-time</option>
                          <option>Part-time</option>
                          <option>Contract</option>
                        </select>
                      </div>
                      <div className="w-[120px]">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Location</label>
                        <input required type="text" value={newJob.location} onChange={e => setNewJob({...newJob, location: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500" placeholder="Remote" />
                      </div>
                      <div className="w-full">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
                        <textarea required value={newJob.description} onChange={e => setNewJob({...newJob, description: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500" placeholder="Brief job description..." rows="2"></textarea>
                      </div>
                      <button type="submit" disabled={isLoading} className="bg-recloud-600 hover:bg-recloud-700 disabled:bg-slate-400 text-white font-bold py-2 px-6 rounded-lg text-sm shadow transition-all ml-auto">
                        Post Job
                      </button>
                    </form>

                    {jobs.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {jobs.map(job => (
                          <div key={job.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                            <div>
                              <h5 className="font-bold text-slate-800 text-sm">{job.title}</h5>
                              <p className="text-xs text-slate-500 mb-2">{job.department} • {job.location}</p>
                            </div>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 px-2 py-1 rounded-md">Active</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <hr className="my-8 border-slate-100" />
                  
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">Applicant Pipeline</h4>
                  </div>

                  {/* Add Applicant Form (Manual Entry) */}
                  <form onSubmit={handleAddApplicant} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Applicant Name (Manual Entry)</label>
                      <input required type="text" value={newApplicant.name} onChange={e => setNewApplicant({...newApplicant, name: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500" placeholder="John Doe" />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Applied Role</label>
                      <input required type="text" value={newApplicant.role} onChange={e => setNewApplicant({...newApplicant, role: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500" placeholder="Software Engineer" />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                      <input type="email" value={newApplicant.email} onChange={e => setNewApplicant({...newApplicant, email: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500" placeholder="john@email.com" />
                    </div>
                    <button type="submit" disabled={isLoading} className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-6 rounded-lg text-sm shadow transition-all">Add Manually</button>
                  </form>

                  {/* Kanban Board */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {['Applied', 'Interviewing', 'Offered', 'Hired'].map(status => (
                      <div key={status} className="bg-slate-50 rounded-xl border border-slate-100 p-3 h-[400px] flex flex-col">
                        <h4 className="font-bold text-slate-700 text-sm mb-3 flex justify-between items-center">
                          {status} 
                          <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs">{applicants.filter(a => a.status === status).length}</span>
                        </h4>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                          {applicants.filter(a => a.status === status).map(app => (
                            <div key={app.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                              <p className="font-bold text-sm text-slate-800">{app.name}</p>
                              <p className="text-xs text-slate-500 mb-2">{app.role}</p>
                              <select 
                                value={app.status}
                                onChange={(e) => handleUpdateApplicantStatus(app.id, e.target.value)}
                                className="w-full text-xs border border-slate-200 rounded py-1 px-2 text-slate-600 focus:outline-none"
                              >
                                <option value="Applied">Applied</option>
                                <option value="Interviewing">Interviewing</option>
                                <option value="Offered">Offered</option>
                                <option value="Hired">Hire (Convert)</option>
                                <option value="Rejected">Reject</option>
                              </select>
                            </div>
                          ))}
                          {applicants.filter(a => a.status === status).length === 0 && (
                            <p className="text-center text-slate-400 text-xs italic mt-4">No applicants</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : hrTab === 'settings' ? (
                <div className="animate-in fade-in duration-500">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Company Branding Settings</h3>
                      <p className="text-slate-500 text-sm mt-1">Customize how your company appears on reports, payslips, and the public careers page.</p>
                    </div>
                  </div>
                  
                  {settingsMessage.text && (
                      <div className={`mb-6 p-4 rounded-xl text-sm font-bold border ${settingsMessage.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                        {settingsMessage.text}
                      </div>
                    )}
                  
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-2xl">
                    <form onSubmit={handleSaveSettings} className="space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Company Legal Name</label>
                        <input required type="text" value={settingsForm.companyName} onChange={e => setSettingsForm({...settingsForm, companyName: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none transition-all" placeholder="Acme Corporation" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Company Logo</label>
                        <input type="file" accept="image/*" onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            if (file.size > 1000000) {
                              alert("File too large. Please upload an image under 1MB.");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setSettingsForm({...settingsForm, logoUrl: reader.result});
                            };
                            reader.readAsDataURL(file);
                          }
                        }} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none transition-all" />
                        <p className="text-xs text-slate-400 mt-1">Upload a PNG or JPG image (Max 1MB).</p>
                        {settingsForm.logoUrl && (
                           <div className="mt-4 p-4 border border-slate-200 rounded-xl inline-block bg-slate-50 relative">
                             <img src={settingsForm.logoUrl} alt="Logo Preview" className="h-12 object-contain" onError={(e) => e.target.style.display='none'} />
                             <button type="button" onClick={() => setSettingsForm({...settingsForm, logoUrl: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600">
                               <X className="w-3 h-3" />
                             </button>
                           </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Headquarters Address</label>
                        <textarea rows="3" value={settingsForm.address} onChange={e => setSettingsForm({...settingsForm, address: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none transition-all" placeholder="123 Business Rd&#10;Suite 100&#10;City, State, ZIP"></textarea>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Contact Phone Number</label>
                        <input type="text" value={settingsForm.phone} onChange={e => setSettingsForm({...settingsForm, phone: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none transition-all" placeholder="+1 (555) 123-4567" />
                      </div>
                      <div className="pt-6 mt-6 border-t border-slate-200">
                        <h4 className="text-lg font-bold text-slate-800 mb-4">Payment & Bank Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Bank Name</label>
                            <input type="text" value={settingsForm.bankName} onChange={e => setSettingsForm({...settingsForm, bankName: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none transition-all" placeholder="Guaranty Trust Bank" />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Account Number</label>
                            <input type="text" value={settingsForm.accountNumber} onChange={e => setSettingsForm({...settingsForm, accountNumber: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none transition-all" placeholder="0123456789" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Account Name</label>
</table>
                  </div>
                </div>
              ) : hrTab === 'recruitment' ? (
                /* ATS UI */
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl shadow-indigo-900/5 border border-white/50 overflow-hidden min-h-[300px] animate-in fade-in slide-in-from-bottom-2 duration-300 p-8 relative z-10">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Briefcase className="w-5 h-5 text-recloud-600" /> Applicant Tracking System</h3>
                      <p className="text-xs text-slate-500 mt-1">Manage job applicants across the recruitment pipeline.</p>
                    </div>
                  </div>
                  
                  {/* Job Board Management */}
                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 mb-8">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Briefcase className="w-4 h-4 text-recloud-600"/> Public Job Postings</h4>
                    
                    <form onSubmit={handleAddJob} className="flex flex-wrap gap-3 items-end mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                      <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Job Title</label>
                        <input required type="text" value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500" placeholder="e.g. Senior Developer" />
                      </div>
                      <div className="w-[120px]">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Department</label>
                        <select value={newJob.department} onChange={e => setNewJob({...newJob, department: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500 bg-white">
                          <option>Operations</option>
                          <option>Sales & Marketing</option>
                          <option>IT & Engineering</option>
                          <option>Finance & Legal</option>
                          <option>Human Resources</option>
                        </select>
                      </div>
                      <div className="w-[120px]">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Type</label>
                        <select value={newJob.type} onChange={e => setNewJob({...newJob, type: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500 bg-white">
                          <option>Full-time</option>
                          <option>Part-time</option>
                          <option>Contract</option>
                        </select>
                      </div>
                      <div className="w-[120px]">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Location</label>
                        <input required type="text" value={newJob.location} onChange={e => setNewJob({...newJob, location: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500" placeholder="Remote" />
                      </div>
                      <div className="w-full">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
                        <textarea required value={newJob.description} onChange={e => setNewJob({...newJob, description: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500" placeholder="Brief job description..." rows="2"></textarea>
                      </div>
                      <button type="submit" disabled={isLoading} className="bg-recloud-600 hover:bg-recloud-700 disabled:bg-slate-400 text-white font-bold py-2 px-6 rounded-lg text-sm shadow transition-all ml-auto">
                        Post Job
                      </button>
                    </form>

                    {jobs.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {jobs.map(job => (
                          <div key={job.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                            <div>
                              <h5 className="font-bold text-slate-800 text-sm">{job.title}</h5>
                              <p className="text-xs text-slate-500 mb-2">{job.department} • {job.location}</p>
                            </div>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 px-2 py-1 rounded-md">Active</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <hr className="my-8 border-slate-100" />
                  
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">Applicant Pipeline</h4>
                  </div>

                  {/* Add Applicant Form (Manual Entry) */}
                  <form onSubmit={handleAddApplicant} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Applicant Name (Manual Entry)</label>
                      <input required type="text" value={newApplicant.name} onChange={e => setNewApplicant({...newApplicant, name: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500" placeholder="John Doe" />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Applied Role</label>
                      <input required type="text" value={newApplicant.role} onChange={e => setNewApplicant({...newApplicant, role: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500" placeholder="Software Engineer" />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                      <input type="email" value={newApplicant.email} onChange={e => setNewApplicant({...newApplicant, email: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500" placeholder="john@email.com" />
                    </div>
                    <button type="submit" disabled={isLoading} className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-6 rounded-lg text-sm shadow transition-all">Add Manually</button>
                  </form>

                  {/* Kanban Board */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {['Applied', 'Interviewing', 'Offered', 'Hired'].map(status => (
                      <div key={status} className="bg-slate-50 rounded-xl border border-slate-100 p-3 h-[400px] flex flex-col">
                        <h4 className="font-bold text-slate-700 text-sm mb-3 flex justify-between items-center">
                          {status} 
                          <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs">{applicants.filter(a => a.status === status).length}</span>
                        </h4>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                          {applicants.filter(a => a.status === status).map(app => (
                            <div key={app.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                              <p className="font-bold text-sm text-slate-800">{app.name}</p>
                              <p className="text-xs text-slate-500 mb-2">{app.role}</p>
                              <select 
                                value={app.status}
                                onChange={(e) => handleUpdateApplicantStatus(app.id, e.target.value)}
                                className="w-full text-xs border border-slate-200 rounded py-1 px-2 text-slate-600 focus:outline-none"
                              >
                                <option value="Applied">Applied</option>
                                <option value="Interviewing">Interviewing</option>
                                <option value="Offered">Offered</option>
                                <option value="Hired">Hire (Convert)</option>
                                <option value="Rejected">Reject</option>
                              </select>
                            </div>
                          ))}
                          {applicants.filter(a => a.status === status).length === 0 && (
                            <p className="text-center text-slate-400 text-xs italic mt-4">No applicants</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : hrTab === 'recruitment' ? (
                /* ATS UI */
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl shadow-indigo-900/5 border border-white/50 overflow-hidden min-h-[300px] animate-in fade-in slide-in-from-bottom-2 duration-300 p-8 relative z-10">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Briefcase className="w-5 h-5 text-recloud-600" /> Applicant Tracking System</h3>
                      <p className="text-xs text-slate-500 mt-1">Manage job applicants across the recruitment pipeline.</p>
                    </div>
                  </div>
                  
                  {/* Job Board Management */}
                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 mb-8">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Briefcase className="w-4 h-4 text-recloud-600"/> Public Job Postings</h4>
                    
                    <form onSubmit={handleAddJob} className="flex flex-wrap gap-3 items-end mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                      <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Job Title</label>
                        <input required type="text" value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500" placeholder="e.g. Senior Developer" />
                      </div>
                      <div className="w-[120px]">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Department</label>
                        <select value={newJob.department} onChange={e => setNewJob({...newJob, department: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500 bg-white">
                          <option>Operations</option>
                          <option>Sales & Marketing</option>
                          <option>IT & Engineering</option>
                          <option>Finance & Legal</option>
                          <option>Human Resources</option>
                        </select>
                      </div>
                      <div className="w-[120px]">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Type</label>
                        <select value={newJob.type} onChange={e => setNewJob({...newJob, type: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500 bg-white">
                          <option>Full-time</option>
                          <option>Part-time</option>
                          <option>Contract</option>
                        </select>
                      </div>
                      <div className="w-[120px]">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Location</label>
                        <input required type="text" value={newJob.location} onChange={e => setNewJob({...newJob, location: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500" placeholder="Remote" />
                      </div>
                      <div className="w-full">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
                        <textarea required value={newJob.description} onChange={e => setNewJob({...newJob, description: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500" placeholder="Brief job description..." rows="2"></textarea>
                      </div>
                      <button type="submit" disabled={isLoading} className="bg-recloud-600 hover:bg-recloud-700 disabled:bg-slate-400 text-white font-bold py-2 px-6 rounded-lg text-sm shadow transition-all ml-auto">
                        Post Job
                      </button>
                    </form>

                    {jobs.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {jobs.map(job => (
                          <div key={job.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                            <div>
                              <h5 className="font-bold text-slate-800 text-sm">{job.title}</h5>
                              <p className="text-xs text-slate-500 mb-2">{job.department} • {job.location}</p>
                            </div>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 px-2 py-1 rounded-md">Active</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <hr className="my-8 border-slate-100" />
                  
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">Applicant Pipeline</h4>
                  </div>

                  {/* Add Applicant Form */}
                  <form onSubmit={handleAddApplicant} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Applicant Name</label>
                      <input required type="text" value={newApplicant.name} onChange={e => setNewApplicant({...newApplicant, name: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500" placeholder="John Doe" />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Applied Role</label>
                      <input required type="text" value={newApplicant.role} onChange={e => setNewApplicant({...newApplicant, role: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500" placeholder="Software Engineer" />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                      <input type="email" value={newApplicant.email} onChange={e => setNewApplicant({...newApplicant, email: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500" placeholder="john@email.com" />
                    </div>
                    <button type="submit" disabled={isLoading} className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-6 rounded-lg text-sm shadow transition-all">Add Manually</button>
                  </form>

                  {/* Kanban Board */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {['Applied', 'Interviewing', 'Offered', 'Hired'].map(status => (
                      <div key={status} className="bg-slate-50 rounded-xl border border-slate-100 p-3 h-[400px] flex flex-col">
                        <h4 className="font-bold text-slate-700 text-sm mb-3 flex justify-between items-center">
                          {status} 
                          <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs">{applicants.filter(a => a.status === status).length}</span>
                        </h4>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                          {applicants.filter(a => a.status === status).map(app => (
                            <div key={app.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                              <p className="font-bold text-sm text-slate-800">{app.name}</p>
                              <p className="text-xs text-slate-500 mb-2">{app.role}</p>
                              <select 
                                value={app.status}
                                onChange={(e) => handleUpdateApplicantStatus(app.id, e.target.value)}
                                className="w-full text-xs border border-slate-200 rounded py-1 px-2 text-slate-600 focus:outline-none"
                              >
                                <option value="Applied">Applied</option>
                                <option value="Interviewing">Interviewing</option>
                                <option value="Offered">Offered</option>
                                <option value="Hired">Hire (Convert)</option>
                                <option value="Rejected">Reject</option>
                              </select>
                            </div>
                          ))}
                          {applicants.filter(a => a.status === status).length === 0 && (
                            <p className="text-center text-slate-400 text-xs italic mt-4">No applicants</p>
                         ) : hrTab === 'settings' ? (
                <div className="animate-in fade-in duration-500">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Company Branding Settings</h3>
                      <p className="text-slate-500 text-sm mt-1">Customize how your company appears on reports, payslips, and the public careers page.</p>
                    </div>
                  </div>
                  
                  {settingsMessage.text && (
                    <div className={`mb-6 p-4 rounded-xl text-sm font-bold border ${settingsMessage.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                      {settingsMessage.text}
                    </div>
                  )}
                  
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-2xl">
                    <form onSubmit={handleSaveSettings} className="space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Company Legal Name</label>
                        <input required type="text" value={settingsForm.companyName} onChange={e => setSettingsForm({...settingsForm, companyName: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none transition-all" placeholder="Acme Corporation" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Company Logo</label>
                        <input type="file" accept="image/*" onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            if (file.size > 1000000) {
                              alert("File too large. Please upload an image under 1MB.");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setSettingsForm({...settingsForm, logoUrl: reader.result});
                            };
                            reader.readAsDataURL(file);
                          }
                        }} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none transition-all" />
                        <p className="text-xs text-slate-400 mt-1">Upload a PNG or JPG image (Max 1MB).</p>
                        {settingsForm.logoUrl && (
                          <div className="mt-4 p-4 border border-slate-200 rounded-xl inline-block bg-slate-50 relative">
                            <img src={settingsForm.logoUrl} alt="Logo Preview" className="h-12 object-contain" onError={(e) => e.target.style.display='none'} />
                            <button type="button" onClick={() => setSettingsForm({...settingsForm, logoUrl: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Headquarters Address</label>
                        <textarea rows="3" value={settingsForm.address} onChange={e => setSettingsForm({...settingsForm, address: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none transition-all" placeholder={"123 Business Rd\nSuite 100\nCity, State, ZIP"}></textarea>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Contact Phone Number</label>
                        <input type="text" value={settingsForm.phone} onChange={e => setSettingsForm({...settingsForm, phone: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none transition-all" placeholder="+1 (555) 123-4567" />
                      </div>
                      <div className="pt-6 mt-6 border-t border-slate-200">
                        <h4 className="text-lg font-bold text-slate-800 mb-4">Payment & Bank Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Bank Name</label>
                            <input type="text" value={settingsForm.bankName} onChange={e => setSettingsForm({...settingsForm, bankName: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none transition-all" placeholder="Guaranty Trust Bank" />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Account Number</label>
                            <input type="text" value={settingsForm.accountNumber} onChange={e => setSettingsForm({...settingsForm, accountNumber: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none transition-all" placeholder="0123456789" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Account Name</label>
                            <input type="text" value={settingsForm.accountName} onChange={e => setSettingsForm({...settingsForm, accountName: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none transition-all" placeholder="Company Enterprises Ltd" />
                          </div>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <button type="submit" className="bg-recloud-600 hover:bg-recloud-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all">Save Branding</button>
                        <button type="button" onClick={() => {
                          const link = `${window.location.origin}${window.location.pathname}?org=${currentTenant}`;
                          navigator.clipboard.writeText(link);
                          alert('Staff Portal Link Copied to Clipboard! You can now send this link to your employees.');
                        }} className="text-sm text-recloud-600 font-bold hover:text-recloud-700 transition-colors border border-recloud-200 bg-recloud-50 hover:bg-recloud-100 px-4 py-2 rounded-lg">Copy Staff Portal Link</button>
                      </div>
                    </form>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-4xl">
                    <div className="space-y-3">
                      <h4 className="font-bold text-slate-700 mb-4 text-sm uppercase tracking-wider">Active Branches ({warehouses?.length || 0})</h4>
                      {(!warehouses || warehouses.length === 0) ? (
                        <p className="text-slate-400 text-sm italic p-4 bg-slate-50 rounded-xl border border-slate-100">No branches added yet. Add warehouses in the Inventory module to see them here.</p>
                      ) : (
                        warehouses.map(w => (
                          <div key={w.id} className="flex justify-between items-center p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                <Briefcase className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">{w.name} {w.lat && <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono border border-slate-200">Map Pinned</span>}</p>
                                <p className="text-xs text-slate-500">{w.location || 'No location specified'}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          
    </>
  );
}
