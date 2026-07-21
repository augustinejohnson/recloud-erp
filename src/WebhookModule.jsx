import React, { useState, useEffect } from 'react';
import { Webhook, Plus, Trash2, CheckCircle2, ShieldAlert, PauseCircle, PlayCircle, Link2, Activity, Clock } from 'lucide-react';
import { db } from './firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';

const EVENTS = [
  { id: 'customers.created', label: 'New Customer Created' },
  { id: 'customers.updated', label: 'Customer Updated' },
  { id: 'customers.deleted', label: 'Customer Deleted' },
  
  { id: 'invoices.created', label: 'New Invoice Created' },
  { id: 'invoices.updated', label: 'Invoice Updated' },
  { id: 'invoices.deleted', label: 'Invoice Deleted' },
  
  { id: 'projects.created', label: 'New Project/Case Created' },
  { id: 'projects.updated', label: 'Project/Case Updated' },
  { id: 'projects.deleted', label: 'Project/Case Deleted' },

  { id: 'employees.created', label: 'New Employee Hired' },
];

export default function WebhookModule({ currentTenant }) {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newWebhook, setNewWebhook] = useState({ targetUrl: '', event: 'customers.created', isActive: true });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentTenant?.id) return;
    
    const q = query(collection(db, 'webhooks'), where('tenantId', '==', currentTenant.id));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const hooks = [];
      snapshot.forEach((doc) => {
        hooks.push({ id: doc.id, ...doc.data() });
      });
      // Sort by creation date descending
      hooks.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setWebhooks(hooks);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching webhooks:', err);
      setError('Failed to load webhooks. Please check your permissions.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentTenant]);

  const handleCreateWebhook = async (e) => {
    e.preventDefault();
    if (!newWebhook.targetUrl.startsWith('https://') && !newWebhook.targetUrl.startsWith('http://')) {
      setError('Target URL must be a valid HTTP or HTTPS URL.');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      await addDoc(collection(db, 'webhooks'), {
        tenantId: currentTenant.id,
        targetUrl: newWebhook.targetUrl,
        event: newWebhook.event,
        isActive: newWebhook.isActive,
        createdAt: serverTimestamp(),
        lastTriggered: null
      });
      setIsCreating(false);
      setNewWebhook({ targetUrl: '', event: 'customers.created', isActive: true });
    } catch (err) {
      console.error(err);
      setError('Failed to create webhook.');
    }
    setLoading(false);
  };

  const toggleWebhookStatus = async (webhookId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'webhooks', webhookId), {
        isActive: !currentStatus
      });
    } catch (err) {
      console.error('Error toggling webhook status:', err);
    }
  };

  const deleteWebhook = async (webhookId) => {
    if (!window.confirm('Are you sure you want to delete this webhook? It will stop sending data immediately.')) return;
    try {
      await deleteDoc(doc(db, 'webhooks', webhookId));
    } catch (err) {
      console.error('Error deleting webhook:', err);
    }
  };

  const getEventLabel = (eventId) => {
    return EVENTS.find(e => e.id === eventId)?.label || eventId;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header section */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Webhook className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Webhooks & Integrations</h1>
              <p className="text-slate-500 mt-1">Push real-time data to Odoo, Zapier, Make, and external apps.</p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-medium transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" /> Create Webhook
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 border border-red-100">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Creation Form */}
      {isCreating && (
        <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl relative overflow-hidden">
          {/* Decorative background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-20 -mr-32 -mt-32"></div>
          
          <div className="relative z-10">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-indigo-400" /> Register New Endpoint
            </h2>
            
            <form onSubmit={handleCreateWebhook} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Event Trigger</label>
                  <select 
                    value={newWebhook.event}
                    onChange={e => setNewWebhook({...newWebhook, event: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  >
                    {EVENTS.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.label} ({ev.id})</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Target URL (e.g. Zapier Webhook URL)</label>
                  <input 
                    type="url"
                    required
                    value={newWebhook.targetUrl}
                    onChange={e => setNewWebhook({...newWebhook, targetUrl: e.target.value})}
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-3 py-2">
                <input 
                  type="checkbox" 
                  id="isActive" 
                  checked={newWebhook.isActive}
                  onChange={e => setNewWebhook({...newWebhook, isActive: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-indigo-500 focus:ring-indigo-500 bg-slate-800"
                />
                <label htmlFor="isActive" className="text-slate-300 select-none">Active immediately</label>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setIsCreating(false)}
                  className="px-5 py-2.5 text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Webhook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Webhooks List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" /> Active Integrations
          </h2>
        </div>
        
        {loading && webhooks.length === 0 && (
          <div className="p-12 text-center text-slate-400">Loading webhooks...</div>
        )}
        
        {!loading && webhooks.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Webhook className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-slate-800 font-medium text-lg">No webhooks configured</h3>
            <p className="text-slate-500 mt-1 max-w-sm mx-auto">Create a webhook to automatically send your ERP data to external applications when events occur.</p>
          </div>
        )}
        
        {webhooks.length > 0 && (
          <div className="divide-y divide-slate-100">
            {webhooks.map((hook) => (
              <div key={hook.id} className={`p-6 transition-colors ${!hook.isActive ? 'bg-slate-50/50' : 'hover:bg-slate-50/50'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider
                        ${hook.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                        {hook.isActive ? <CheckCircle2 className="w-3 h-3" /> : <PauseCircle className="w-3 h-3" />}
                        {hook.isActive ? 'Active' : 'Paused'}
                      </span>
                      <span className="font-semibold text-slate-900 bg-slate-100 px-3 py-1 rounded-md font-mono text-sm">
                        {hook.event}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-slate-600 truncate font-mono bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                      {hook.targetUrl}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-l border-slate-100 pl-6 shrink-0">
                    <button 
                      onClick={() => toggleWebhookStatus(hook.id, hook.isActive)}
                      className={`p-2.5 rounded-lg border transition-colors flex items-center gap-2 ${
                        hook.isActive 
                          ? 'text-amber-600 border-amber-200 hover:bg-amber-50 bg-white' 
                          : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50 bg-white'
                      }`}
                      title={hook.isActive ? 'Pause Webhook' : 'Activate Webhook'}
                    >
                      {hook.isActive ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                      <span className="text-sm font-medium hidden sm:inline">{hook.isActive ? 'Pause' : 'Activate'}</span>
                    </button>
                    
                    <button 
                      onClick={() => deleteWebhook(hook.id)}
                      className="p-2.5 text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition-colors flex items-center gap-2 bg-white"
                      title="Delete Webhook"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm font-medium hidden sm:inline">Delete</span>
                    </button>
                  </div>
                  
                </div>
                
                {hook.lastTriggered && (
                  <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />
                    Last triggered: {hook.lastTriggered.toDate ? hook.lastTriggered.toDate().toLocaleString() : 'Recently'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
