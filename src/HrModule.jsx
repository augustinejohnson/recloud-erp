import React from 'react';
import { Users, Clock, Calendar, FileText, CheckCircle2, XCircle, Search, Plus, CalendarCheck, Briefcase } from 'lucide-react';

export default function HrModule({
  employees,
  shifts,
  leaves,
  payslips,
  applicants,
  jobs,
  warehouses,
  currentUser,
  currentTenant,
  handleDeleteEmployee,
  handleAddJob,
  handleAddApplicant,
  handleUpdateApplicantStatus,
  getLocalDateStr,
  setIsAddModalOpen,
  setNewJob,
  newJob,
  setNewApplicant,
  newApplicant
}) {
  return (
    <>
          {activeTab === 'hr' && (

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

              <div className="flex justify-between items-end mb-8">

                <div>

                  <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Human Resources</h2>

                  <p className="text-slate-500 mt-1">Manage employees, shifts, and attendance across the organization.</p>

                </div>

                <button onClick={() => setIsAddModalOpen(true)} className="bg-recloud-600 hover:bg-recloud-700 text-white px-5 py-2.5 rounded-lg shadow-lg shadow-recloud-500/30 font-medium text-sm flex items-center gap-2 transition-all transform hover:scale-105">

                  <Plus className="w-4 h-4" /> Add Employee

                </button>

              </div>



              {/* HR Stats */}

              <div classNam
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

                      <div className="pt-4 border-t border-slate