import React, { useState, useEffect } from 'react';
import { Database, Search, Download, Trash2, RefreshCw, ChevronLeft, ChevronRight, Eye, X, AlertTriangle } from 'lucide-react';
import { db } from './firebase';
import { collection, getDocs, orderBy, query, limit, startAfter, doc } from 'firebase/firestore';
import { moveToHistory } from './firebase';

const COLLECTIONS = [
  { id: 'employees',     label: 'Employees / Staff',      icon: '👤' },
  { id: 'customers',     label: 'Customers / Clients',    icon: '🤝' },
  { id: 'invoices',      label: 'Invoices',               icon: '📄' },
  { id: 'expenses',      label: 'Expenses',               icon: '💸' },
  { id: 'inventory',     label: 'Products / Inventory',   icon: '📦' },
  { id: 'sales',         label: 'Sales (POS)',            icon: '🛒' },
  { id: 'b2bOrders',     label: 'B2B Orders',             icon: '🏭' },
  { id: 'contracts',     label: 'Contracts',              icon: '📋' },
  { id: 'deals',         label: 'CRM Deals',              icon: '💼' },
  { id: 'projects',      label: 'Projects / Cases',       icon: '📁' },
  { id: 'documents',     label: 'Documents',              icon: '🗂️' },
  { id: 'suppliers',     label: 'Suppliers',              icon: '🏪' },
  { id: 'folders',       label: 'Document Folders',       icon: '📂' },
  { id: 'shifts',        label: 'Shifts',                 icon: '🕐' },
  { id: 'payslips',      label: 'Payslips',               icon: '💰' },
];

const PAGE_SIZE = 25;

function formatValue(val, key) {
  if (val === null || val === undefined) return <span className="text-slate-300 italic">—</span>;
  if (typeof val === 'boolean') return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${val ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{val ? 'Yes' : 'No'}</span>;
  if (val?.toDate) return <span className="text-slate-600 text-xs">{val.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>;
  if (typeof val === 'number') {
    const isAmount = ['amount', 'price', 'total', 'salary', 'balance', 'cost', 'fee', 'revenue'].some(k => key?.toLowerCase().includes(k));
    if (isAmount) return <span className="font-bold text-slate-800">₦{val.toLocaleString()}</span>;
    return <span className="text-slate-700">{val.toLocaleString()}</span>;
  }
  if (typeof val === 'object') return <span className="text-xs text-slate-400 italic">[object]</span>;
  const str = String(val);
  if (str.length > 60) return <span className="text-slate-700 text-sm" title={str}>{str.substring(0, 57)}…</span>;
  return <span className="text-slate-700 text-sm">{str}</span>;
}

function getDisplayColumns(docs) {
  if (!docs.length) return [];
  // Priority fields to show first
  const priority = ['name', 'email', 'phone', 'customerName', 'title', 'description', 'status', 'role', 'amount', 'totalAmount', 'price', 'type', 'category', 'createdAt'];
  const allKeys = new Set();
  docs.forEach(d => Object.keys(d).forEach(k => allKeys.add(k)));
  allKeys.delete('id');

  const ordered = [];
  priority.forEach(k => { if (allKeys.has(k)) { ordered.push(k); allKeys.delete(k); } });
  // Add remaining, but cap at 8 columns
  Array.from(allKeys).forEach(k => { if (!['__isNew__', 'key', 'storagePath', 'url', 'updatedAt'].includes(k)) ordered.push(k); });
  return ordered.slice(0, 8);
}

function colLabel(col) {
  return col
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .replace('At', 'At')
    .trim();
}

export default function BackendModule({ currentTenant, currentUser }) {
  const [selectedCol, setSelectedCol] = useState(COLLECTIONS[0]);
  const [docs, setDocs] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedDoc, setSelectedDoc] = useState(null); // JSON viewer
  const [deletingId, setDeletingId] = useState(null);
  const [columns, setColumns] = useState([]);

  useEffect(() => {
    loadCollection();
  }, [selectedCol, currentTenant]);

  useEffect(() => {
    const q = searchQuery.toLowerCase();
    const filtered = q
      ? docs.filter(d => Object.values(d).some(v => String(v).toLowerCase().includes(q)))
      : docs;
    setFilteredDocs(filtered);
    setPage(0);
    setTotal(filtered.length);
  }, [searchQuery, docs]);

  const loadCollection = async () => {
    setIsLoading(true);
    setSearchQuery('');
    setSelectedDoc(null);
    try {
      const col = collection(db, `organizations/${currentTenant}/${selectedCol.id}`);
      let q;
      try {
        q = query(col, orderBy('createdAt', 'desc'), limit(500));
      } catch {
        q = query(col, limit(500));
      }
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => {
        const raw = d.data();
        return { id: d.id, ...raw };
      });
      setDocs(data);
      setFilteredDocs(data);
      setTotal(data.length);
      setColumns(getDisplayColumns(data));
      setPage(0);
    } catch (err) {
      console.error(err);
      setDocs([]);
      setFilteredDocs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (docId, docName) => {
    if (!confirm(`Move "${docName || docId}" to Recycle Bin?`)) return;
    setDeletingId(docId);
    try {
      await moveToHistory(selectedCol.id, docId, selectedCol.label, docName || docId, currentTenant);
      setDocs(prev => prev.filter(d => d.id !== docId));
      if (selectedDoc?.id === docId) setSelectedDoc(null);
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const exportCsv = () => {
    if (!filteredDocs.length) return;
    const allCols = columns;
    const header = ['id', ...allCols].join(',');
    const rows = filteredDocs.map(d =>
      ['id', ...allCols].map(k => {
        let v = d[k];
        if (v?.toDate) v = v.toDate().toISOString();
        if (typeof v === 'object') v = JSON.stringify(v);
        return `"${String(v ?? '').replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedCol.id}_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const pageDocs = filteredDocs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-0">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <Database className="w-6 h-6 text-recloud-600" /> Backend Manager
        </h1>
        <p className="text-sm text-slate-500 mt-1">Browse, search, and manage your database directly — no technical knowledge required.</p>
      </div>

      <div className="flex flex-col md:flex-row flex-1 gap-5 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <div className="w-full md:w-56 shrink-0 bg-white rounded-2xl shadow-sm border border-slate-100 p-3 flex flex-col overflow-y-auto max-h-[220px] md:max-h-full">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">Collections</p>
          {COLLECTIONS.map(col => (
            <button
              key={col.id}
              onClick={() => setSelectedCol(col)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2.5 mb-0.5 ${selectedCol.id === col.id ? 'bg-recloud-600 text-white shadow-md shadow-recloud-500/20' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <span>{col.icon}</span>
              <span className="truncate">{col.label}</span>
            </button>
          ))}
        </div>

        {/* Main Table */}
        <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Table toolbar */}
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row items-start md:items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{selectedCol.icon}</span>
              <div>
                <h3 className="font-black text-slate-800 leading-tight">{selectedCol.label}</h3>
                <p className="text-xs text-slate-400">{total} record{total !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:flex-none">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search all fields..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none w-full md:w-52 bg-white"
                />
              </div>
              <button onClick={loadCollection} className="p-2 text-slate-500 hover:text-recloud-600 hover:bg-recloud-50 rounded-xl border border-slate-200 transition-colors" title="Refresh">
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={exportCsv} disabled={!filteredDocs.length} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white text-sm font-bold rounded-xl transition-colors whitespace-nowrap">
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin mr-3" /> Loading...
              </div>
            ) : pageDocs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                <Database className="w-12 h-12 text-slate-200" />
                <p className="font-bold">{searchQuery ? 'No results match your search' : 'This collection is empty'}</p>
              </div>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-black text-slate-500 uppercase tracking-wider w-8">#</th>
                    {columns.map(col => (
                      <th key={col} className="text-left px-4 py-3 text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {colLabel(col)}
                      </th>
                    ))}
                    <th className="text-right px-4 py-3 text-xs font-black text-slate-500 uppercase tracking-wider w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageDocs.map((d, i) => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-3 text-xs text-slate-400">{page * PAGE_SIZE + i + 1}</td>
                      {columns.map(col => (
                        <td key={col} className="px-4 py-3 max-w-[200px]">
                          {formatValue(d[col], col)}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setSelectedDoc(d)} className="p-1.5 text-slate-400 hover:text-recloud-600 hover:bg-recloud-50 rounded-lg transition-colors" title="View full record">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {currentUser?.role === 'admin' && (
                            <button
                              onClick={() => handleDelete(d.id, d.name || d.customerName || d.title || d.email)}
                              disabled={deletingId === d.id}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Move to Recycle Bin"
                            >
                              {deletingId === d.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <p className="text-xs text-slate-500">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => p - 1)} disabled={page === 0} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-600">Page {page + 1} of {totalPages}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* JSON Viewer Drawer */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelectedDoc(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-black text-slate-800">Record Details</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedCol.id}/{selectedDoc.id}</p>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {/* Key-value table */}
              <table className="w-full text-sm border-collapse">
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(selectedDoc).map(([k, v]) => (
                    <tr key={k}>
                      <td className="py-2.5 pr-4 font-bold text-slate-500 text-xs w-40 align-top">{colLabel(k)}</td>
                      <td className="py-2.5 text-slate-800 break-all">
                        {v?.toDate
                          ? v.toDate().toLocaleString('en-GB')
                          : typeof v === 'object' && v !== null
                            ? <pre className="text-xs font-mono text-slate-600 bg-slate-50 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(v, null, 2)}</pre>
                            : String(v ?? '—')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 flex gap-2">
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2 rounded-xl flex-1">
                <AlertTriangle className="w-4 h-4 shrink-0" /> To edit this record, go to the relevant module (e.g. HR for employees, Clients for customers).
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
