import React, { useState, useEffect } from 'react';
import { History, RotateCcw, Trash2, Search, AlertCircle } from 'lucide-react';
import { getHistory, restoreFromHistory, permanentlyDeleteFromHistory } from './firebase';

export default function HistoryModule({ currentTenant }) {
  const [historyItems, setHistoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const data = await getHistory(currentTenant);
      // Sort newest deleted first
      data.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
      setHistoryItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [currentTenant]);

  const handleRestore = async (id, name) => {
    if (!window.confirm(`Are you sure you want to restore "${name}"?`)) return;
    try {
      setIsProcessing(true);
      await restoreFromHistory(id, currentTenant);
      await loadHistory();
    } catch (err) {
      console.error(err);
      alert("Error restoring item.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePermanentDelete = async (id, name) => {
    if (!window.confirm(`WARNING: Are you sure you want to PERMANENTLY delete "${name}"? This cannot be undone.`)) return;
    try {
      setIsProcessing(true);
      await permanentlyDeleteFromHistory(id, currentTenant);
      await loadHistory();
    } catch (err) {
      console.error(err);
      alert("Error permanently deleting item.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredItems = historyItems.filter(item => 
    item.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.itemType?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Header */}
      <div className="flex-none p-4 md:p-8 bg-white border-b border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-red-500/20 shrink-0">
              <History className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Recycle Bin</h1>
              <p className="text-xs md:text-sm text-slate-500 font-medium">Restore or permanently delete removed items.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-red-500 text-sm font-medium text-slate-700 bg-slate-50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-slate-500">Loading history...</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <History className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">Recycle Bin is empty</h3>
              <p className="text-slate-500 mt-1">Deleted items will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Item Name</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Deleted At</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-800 text-sm">{item.itemName}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{item.originalId}</div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex px-2 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600">
                          {item.itemType}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium text-slate-600">
                          {new Date(item.deletedAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(item.deletedAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleRestore(item.id, item.itemName)}
                            disabled={isProcessing}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Restore Item"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handlePermanentDelete(item.id, item.itemName)}
                            disabled={isProcessing}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Permanently Delete"
                          >
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
        </div>
        
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong className="font-bold block mb-1">Admin Notice</strong>
            Items in the Recycle Bin are hidden from all other modules. Restoring an item will immediately make it visible again across the system. Permanent deletion cannot be undone.
          </div>
        </div>
      </div>
    </div>
  );
}
