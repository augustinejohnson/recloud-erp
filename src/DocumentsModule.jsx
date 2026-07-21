import React, { useState, useEffect, useRef } from 'react';
import { Folder, FileText, Upload, Plus, Search, Download, Trash2, HardDrive, Filter, Clock, Edit, CheckCircle2, AlertCircle, FolderOpen, X } from 'lucide-react';
import { getFolders, addFolder, updateFolder, deleteFolder, getDocuments, deleteDocument, uploadAndSaveDocument } from './firebase';

const FILE_TYPE_COLORS = {
  pdf: '#ef4444',
  doc: '#3b82f6', docx: '#3b82f6',
  xls: '#10b981', xlsx: '#10b981', csv: '#10b981',
  ppt: '#f59e0b', pptx: '#f59e0b',
  jpg: '#8b5cf6', jpeg: '#8b5cf6', png: '#8b5cf6', gif: '#8b5cf6', webp: '#8b5cf6',
  zip: '#64748b', rar: '#64748b',
  txt: '#0ea5e9', md: '#0ea5e9',
};

export default function DocumentsModule({ currentTenant, currentUser }) {
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Upload state
  const [uploadQueue, setUploadQueue] = useState([]); // [{ name, progress, status, error }]
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  useEffect(() => {
    loadFolders();
    loadDocuments();
  }, [currentTenant]);

  const loadFolders = async () => {
    try {
      const data = await getFolders(currentTenant);
      setFolders(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDocuments = async () => {
    try {
      const data = await getDocuments(currentTenant);
      setDocuments(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFolder = async () => {
    const folderName = prompt('Enter new folder name:');
    if (!folderName || !folderName.trim()) return;
    try {
      await addFolder({
        name: folderName.trim(),
        createdBy: currentUser?.name || 'Admin',
        color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#0ea5e9'][Math.floor(Math.random() * 6)]
      }, currentTenant);
      loadFolders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditFolder = async (folder) => {
    const newName = prompt('Edit folder name:', folder.name);
    if (!newName || !newName.trim() || newName === folder.name) return;
    try {
      await updateFolder(folder.id, { name: newName.trim() }, currentTenant);
      loadFolders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!confirm('Delete this folder? Documents inside will become unorganised but not deleted.')) return;
    try {
      await deleteFolder(folderId, currentTenant);
      if (activeFolder?.id === folderId) setActiveFolder(null);
      loadFolders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!confirm('Permanently delete this document from storage?')) return;
    try {
      await deleteDocument(docId, currentTenant);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Real Firebase Storage Upload ────────────────────────────────────────────
  const uploadFiles = async (files) => {
    const fileArray = Array.from(files);
    // Initialize queue entries
    const queueEntries = fileArray.map(f => ({ name: f.name, progress: 0, status: 'uploading', error: null }));
    setUploadQueue(prev => [...prev, ...queueEntries]);
    const startIdx = uploadQueue.length;

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const queueIdx = startIdx + i;
      try {
        await uploadAndSaveDocument(
          file,
          activeFolder ? activeFolder.id : null,
          currentUser?.name || 'Admin',
          currentTenant,
          (pct) => {
            setUploadQueue(prev => {
              const updated = [...prev];
              if (updated[queueIdx]) updated[queueIdx] = { ...updated[queueIdx], progress: pct };
              return updated;
            });
          }
        );
        setUploadQueue(prev => {
          const updated = [...prev];
          if (updated[queueIdx]) updated[queueIdx] = { ...updated[queueIdx], status: 'done', progress: 100 };
          return updated;
        });
      } catch (err) {
        setUploadQueue(prev => {
          const updated = [...prev];
          if (updated[queueIdx]) updated[queueIdx] = { ...updated[queueIdx], status: 'error', error: err.message };
          return updated;
        });
      }
    }
    // Refresh docs list and clear done items after delay
    loadDocuments();
    setTimeout(() => {
      setUploadQueue(prev => prev.filter(q => q.status !== 'done'));
    }, 3000);
  };

  const handleFileInputChange = (e) => {
    if (e.target.files?.length) {
      uploadFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleFolderInputChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const firstPath = files[0].webkitRelativePath;
    const folderName = firstPath ? firstPath.split('/')[0] : 'Uploaded Folder';
    try {
      const newFolderRef = await addFolder({ name: folderName, createdBy: currentUser?.name || 'Admin', color: '#10b981' }, currentTenant);
      // Set activeFolder context for upload
      const tempFolder = { id: newFolderRef.id, name: folderName };
      setActiveFolder(tempFolder);
      await uploadFiles(files);
      loadFolders();
    } catch (err) {
      console.error(err);
    }
    e.target.value = '';
  };

  // Drag & drop
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files?.length) uploadFiles(files);
  };

  const filteredDocs = documents.filter(d =>
    (!activeFolder || d.folderId === activeFolder.id) &&
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Storage usage — calculate from document sizes stored in Firestore
  const totalSizeBytes = documents.reduce((sum, d) => {
    const s = d.size || '0 KB';
    if (s.includes('MB')) return sum + parseFloat(s) * 1024 * 1024;
    if (s.includes('KB')) return sum + parseFloat(s) * 1024;
    return sum;
  }, 0);
  const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(1);
  const storageLimitGB = 50; // 50 GB for Firebase Blaze plan baseline
  const storageUsedPct = Math.min((totalSizeMB / (storageLimitGB * 1024)) * 100, 100).toFixed(1);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Knowledge Base & Documents</h1>
          <p className="text-sm text-slate-500">Secure cloud storage — files stored on Firebase Storage and accessible anytime</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <input type="file" ref={folderInputRef} onChange={handleFolderInputChange} webkitdirectory="true" directory="true" multiple className="hidden" />
          <input type="file" ref={fileInputRef} onChange={handleFileInputChange} multiple className="hidden" />
          {currentUser?.role === 'admin' && (
            <button onClick={() => folderInputRef.current?.click()} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap">
              <Upload className="w-4 h-4" /> Upload Folder
            </button>
          )}
          <button onClick={handleAddFolder} className="bg-recloud-600 hover:bg-recloud-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-recloud-500/20 flex items-center gap-2 whitespace-nowrap">
            <Plus className="w-4 h-4" /> New Folder
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="bg-recloud-600 hover:bg-recloud-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-recloud-500/20 flex items-center gap-2 whitespace-nowrap transition-all">
            <Upload className="w-4 h-4" /> Upload File
          </button>
        </div>
      </div>

      {/* Upload Progress Queue */}
      {uploadQueue.length > 0 && (
        <div className="mb-4 space-y-2">
          {uploadQueue.map((item, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
              {item.status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
              {item.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
              {item.status === 'uploading' && <div className="w-4 h-4 border-2 border-recloud-600 border-t-transparent rounded-full animate-spin shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-700 truncate">{item.name}</p>
                {item.status === 'uploading' && (
                  <div className="w-full bg-slate-100 rounded-full h-1 mt-1">
                    <div className="bg-recloud-500 h-1 rounded-full transition-all duration-300" style={{ width: `${item.progress}%` }} />
                  </div>
                )}
                {item.status === 'error' && <p className="text-xs text-red-500">{item.error}</p>}
              </div>
              <span className="text-xs text-slate-500 shrink-0">
                {item.status === 'uploading' ? `${item.progress}%` : item.status === 'done' ? 'Done' : 'Failed'}
              </span>
              {item.status !== 'uploading' && (
                <button onClick={() => setUploadQueue(prev => prev.filter((_, idx) => idx !== i))} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col md:flex-row flex-1 gap-6 min-h-0 overflow-y-auto md:overflow-hidden">
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col max-h-[300px] md:max-h-full">
          {/* Storage Widget */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Cloud Storage</h3>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <HardDrive className="w-5 h-5 text-recloud-500" />
                <span className="text-xs font-bold text-slate-500">{storageUsedPct}% Used</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2">
                <div
                  className={`h-1.5 rounded-full transition-all ${parseFloat(storageUsedPct) > 80 ? 'bg-red-500' : parseFloat(storageUsedPct) > 60 ? 'bg-amber-500' : 'bg-recloud-500'}`}
                  style={{ width: `${storageUsedPct}%` }}
                />
              </div>
              <div className="text-xs text-slate-500">{totalSizeMB} MB of {storageLimitGB} GB</div>
              <div className="text-[10px] text-slate-400 mt-1">Firebase Storage · Always-on · Encrypted</div>
            </div>
          </div>

          {/* Folder List */}
          <div className="flex-1 overflow-y-auto">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Folders</h3>
            <button
              onClick={() => setActiveFolder(null)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 mb-1 ${!activeFolder ? 'bg-recloud-100 text-recloud-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <FileText className={`w-4 h-4 ${!activeFolder ? 'text-recloud-500' : 'text-slate-400'}`} />
              All Documents
              <span className="ml-auto text-xs font-bold text-slate-400">{documents.length}</span>
            </button>

            {folders.map(folder => {
              const folderDocCount = documents.filter(d => d.folderId === folder.id).length;
              const isActive = activeFolder?.id === folder.id;
              return (
                <div key={folder.id} className="group relative flex items-center mb-1">
                  <button
                    onClick={() => setActiveFolder(folder)}
                    className={`flex-1 text-left px-3 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${isActive ? 'bg-recloud-100 text-recloud-700' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    {isActive
                      ? <FolderOpen className="w-4 h-4 shrink-0 text-recloud-500" />
                      : <Folder className="w-4 h-4 shrink-0" style={{ color: folder.color || '#94a3b8' }} />
                    }
                    <span className="truncate">{folder.name}</span>
                    <span className="ml-auto text-xs font-bold text-slate-400">{folderDocCount}</span>
                  </button>
                  <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <button onClick={() => handleEditFolder(folder)} className="p-1 text-slate-400 hover:text-blue-500 bg-white hover:bg-blue-50 rounded-md shadow-sm border border-slate-200" title="Rename">
                      <Edit className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleDeleteFolder(folder.id)} className="p-1 text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 rounded-md shadow-sm border border-slate-200" title="Delete Folder">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content Area — Drop Zone */}
        <div
          className={`flex-1 bg-white rounded-2xl shadow-sm border-2 overflow-hidden flex flex-col transition-colors ${isDragging ? 'border-recloud-400 bg-recloud-50' : 'border-slate-100'}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {/* Content Header */}
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
            <div className="flex items-center gap-3">
              {activeFolder
                ? <><FolderOpen className="w-5 h-5 text-recloud-500" /><span className="font-bold text-slate-800">{activeFolder.name}</span></>
                : <><FileText className="w-5 h-5 text-slate-400" /><span className="font-bold text-slate-700">All Documents</span></>
              }
              <span className="text-xs font-bold text-recloud-600 bg-recloud-50 px-2 py-0.5 rounded-full border border-recloud-100">{filteredDocs.length} files</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none w-48 bg-white"
                />
              </div>
              <button className="text-sm font-bold text-slate-500 flex items-center gap-2 hover:text-slate-800 transition-colors bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                <Filter className="w-4 h-4" /> Filter
              </button>
            </div>
          </div>

          {/* Documents Grid */}
          <div className="flex-1 p-6 overflow-y-auto">
            {isDragging ? (
              <div className="h-full flex flex-col items-center justify-center text-recloud-500 pointer-events-none">
                <Upload className="w-16 h-16 mb-4 opacity-60" />
                <p className="text-lg font-bold">Drop files to upload{activeFolder ? ` into "${activeFolder.name}"` : ''}</p>
                <p className="text-sm text-slate-400 mt-1">Files will be stored securely on Firebase Storage</p>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center">
                <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center mb-6">
                  {activeFolder
                    ? <FolderOpen className="w-12 h-12 text-slate-300" />
                    : <FileText className="w-12 h-12 text-slate-300" />
                  }
                </div>
                <p className="text-lg font-bold text-slate-600 mb-1">
                  {activeFolder ? `"${activeFolder.name}" is empty` : 'No documents yet'}
                </p>
                <p className="text-sm text-slate-400 mb-6">
                  {activeFolder ? 'Upload files here or drag & drop them.' : 'Create a folder or upload files to get started.'}
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-recloud-600 hover:bg-recloud-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-recloud-500/20 flex items-center gap-2 transition-all hover:-translate-y-0.5"
                >
                  <Upload className="w-4 h-4" /> Upload File
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredDocs.map(docItem => {
                  const ext = (docItem.type || '').toLowerCase();
                  const color = FILE_TYPE_COLORS[ext] || '#8b5cf6';
                  return (
                    <div key={docItem.id} className="group border border-slate-200 rounded-2xl p-4 hover:border-recloud-300 hover:shadow-lg transition-all bg-white relative animate-in zoom-in-95 cursor-pointer">
                      {/* Actions */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/90 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-slate-100 z-10">
                        {docItem.url && docItem.url !== '#' && (
                          <a
                            href={docItem.url}
                            target="_blank"
                            rel="noreferrer"
                            download={docItem.name}
                            className="p-1.5 text-slate-400 hover:text-recloud-600 rounded-md transition-colors"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {currentUser?.role === 'admin' && (
                          <button onClick={() => handleDeleteDocument(docItem.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-md transition-colors" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* File Icon */}
                      <div
                        className="w-12 h-12 rounded-xl mb-3 flex items-center justify-center text-white font-black text-xs shadow-sm"
                        style={{ background: color }}
                      >
                        {ext.toUpperCase() || 'FILE'}
                      </div>

                      <h4 className="font-bold text-slate-700 text-sm mb-1 truncate leading-tight" title={docItem.name}>{docItem.name}</h4>
                      <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                        <span>{docItem.size}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {docItem.createdAt
                            ? (docItem.createdAt.toDate ? docItem.createdAt.toDate().toLocaleDateString() : new Date(docItem.createdAt).toLocaleDateString())
                            : 'Just now'}
                        </span>
                      </div>
                      {/* Storage badge */}
                      {docItem.url && docItem.url !== '#'
                        ? <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full"><CheckCircle2 className="w-2.5 h-2.5" /> Stored</span>
                        : <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Metadata only</span>
                      }
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
