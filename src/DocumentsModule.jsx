import React, { useState, useEffect, useRef } from 'react';
import { Folder, FileText, Upload, Plus, MoreVertical, Search, Download, Trash2, HardDrive, Filter, Clock, Edit } from 'lucide-react';
import { getFolders, addFolder, updateFolder, deleteFolder, getDocuments, addDocument, deleteDocument } from './firebase';

export default function DocumentsModule({ currentTenant, currentUser }) {
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isAddFolderOpen, setIsAddFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const folderInputRef = useRef(null);
  const fileInputRef = useRef(null);

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
    const folderName = prompt("Enter new folder name:");
    if (!folderName || !folderName.trim()) return;
    try {
      await addFolder({
        name: folderName.trim(),
        createdBy: currentUser?.name || 'Admin',
        color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][Math.floor(Math.random() * 4)] // random color
      }, currentTenant);
      loadFolders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadFolderClick = () => {
    folderInputRef.current?.click();
  };

  const handleUploadFolder = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const firstPath = files[0].webkitRelativePath;
    const folderName = firstPath ? firstPath.split('/')[0] : 'Uploaded Folder';

    try {
      // 1. Create the folder
      const newFolderId = await addFolder({
        name: folderName,
        createdBy: currentUser?.name || 'Admin',
        color: '#10b981'
      }, currentTenant);
      
      // 2. Add files inside it
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await addDocument({ 
          name: file.name, 
          folderId: newFolderId.id, 
          type: file.name.split('.').pop() || 'file', 
          size: Math.round(file.size / 1024) + ' KB', 
          uploadedBy: currentUser?.name || 'Admin' 
        }, currentTenant);
      }
      
      loadFolders();
      loadDocuments();
      alert(`Folder '${folderName}' uploaded successfully with ${files.length} files.`);
      
      if (folderInputRef.current) {
        folderInputRef.current.value = '';
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading folder.');
    }
  };

  const handleEditFolder = async (folder) => {
    const newName = prompt("Edit folder name:", folder.name);
    if (!newName || !newName.trim() || newName === folder.name) return;
    try {
      await updateFolder(folder.id, { name: newName.trim() }, currentTenant);
      loadFolders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!confirm("Are you sure you want to delete this folder? All documents inside will be orphaned.")) return;
    try {
      await deleteFolder(folderId, currentTenant);
      if (activeFolder?.id === folderId) setActiveFolder(null);
      loadFolders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await deleteDocument(docId, currentTenant);
      loadDocuments();
    } catch (err) {
      console.error(err);
    }
  };


  const handleSimulateUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSimulateUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await addDocument({
          name: file.name,
          folderId: activeFolder ? activeFolder.id : null,
          type: file.name.split('.').pop() || 'file',
          size: Math.round(file.size / 1024) + ' KB',
          uploadedBy: currentUser?.name || 'Admin',
          url: '#'
        }, currentTenant);
      }
      loadDocuments();
      alert(`Successfully uploaded ${files.length} file(s).`);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading file.');
    }
  };

  const filteredDocs = documents.filter(doc => 
    (!activeFolder || doc.folderId === activeFolder.id) && 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Knowledge Base</h1>
          <p className="text-sm text-slate-500">Manage company documents, SOPs, and assets</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-2 md:pb-0">
          <input 
            type="file" 
            ref={folderInputRef} 
            onChange={handleUploadFolder} 
            webkitdirectory="true" 
            directory="true" 
            multiple 
            className="hidden" 
          />
          {currentUser?.role === 'admin' && (
<button onClick={handleUploadFolderClick} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
            <Upload className="w-4 h-4" /> Upload Folder
          </button>
          )}
          <button onClick={handleAddFolder} className="bg-recloud-600 hover:bg-recloud-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-recloud-500/20 flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Folder
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleSimulateUpload} 
            multiple 
            className="hidden" 
          />
          <button onClick={handleSimulateUploadClick} className="bg-recloud-600 hover:bg-recloud-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-recloud-500/20 flex items-center gap-2 transition-all">
            <Upload className="w-4 h-4" /> Upload File
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 gap-6 min-h-0 overflow-y-auto md:overflow-hidden">
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col max-h-[300px] md:max-h-full">
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Storage</h3>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <HardDrive className="w-5 h-5 text-recloud-500" />
                <span className="text-xs font-bold text-slate-500">45% Used</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2">
                <div className="bg-recloud-500 h-1.5 rounded-full" style={{ width: '45%' }}></div>
              </div>
              <div className="text-xs text-slate-500">4.5 GB of 10 GB</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Folders</h3>
            <button 
              onClick={() => setActiveFolder(null)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 mb-1 ${!activeFolder ? 'bg-recloud-100 text-recloud-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <FileText className={`w-4 h-4 ${!activeFolder ? 'text-recloud-500' : 'text-slate-400'}`} /> 
              All Documents
            </button>
            
            {folders.map(folder => (
              <div key={folder.id} className="group relative flex items-center mb-1">
                <button 
                  onClick={() => setActiveFolder(folder)}
                  className={`flex-1 text-left px-3 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeFolder?.id === folder.id ? 'bg-recloud-100 text-recloud-700' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Folder className="w-4 h-4 shrink-0" style={{ color: activeFolder?.id === folder.id ? '#0ea5e9' : folder.color || '#94a3b8' }} /> 
                  <span className="truncate">{folder.name}</span>
                </button>
                <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <button onClick={() => handleEditFolder(folder)} className="p-1 text-slate-400 hover:text-blue-500 bg-white hover:bg-blue-50 rounded-md shadow-sm border border-slate-200" title="Edit Folder">
                    <Edit className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleDeleteFolder(folder.id)} className="p-1 text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 rounded-md shadow-sm border border-slate-200" title="Delete Folder">
                    <Trash2 className="w-3 h-3" />
                    </button>
                </div>
              </div>
            ))}

          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search documents..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none w-64 bg-white" 
              />
            </div>
            <button className="text-sm font-bold text-slate-500 flex items-center gap-2 hover:text-slate-800 transition-colors bg-white px-3 py-1.5 rounded-lg border border-slate-200">
              <Filter className="w-4 h-4" /> Filter
            </button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            <div className="grid grid-cols-4 gap-4">
              {filteredDocs.length === 0 ? (
                <div className="col-span-4 py-12 text-center text-slate-400">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>No documents found in this view.</p>
                </div>
              ) : (
                filteredDocs.map(doc => (
                  <div key={doc.id} className="group border border-slate-200 rounded-xl p-4 hover:border-recloud-300 hover:shadow-md transition-all bg-white relative animate-in zoom-in-95">
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/90 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-slate-100">
                      <button className="p-1.5 text-slate-400 hover:text-recloud-600 rounded-md transition-colors"><Download className="w-3.5 h-3.5" /></button>
                      {currentUser?.role === 'admin' && (
<button onClick={() => handleDeleteDocument(doc.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-md transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
)}
                    </div>
                    
                    <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-white font-bold text-sm shadow-sm" style={{
                      background: doc.type === 'pdf' ? '#ef4444' : doc.type === 'doc' || doc.type === 'docx' ? '#3b82f6' : doc.type === 'xls' || doc.type === 'xlsx' ? '#10b981' : '#8b5cf6'
                    }}>
                      {doc.type ? doc.type.toUpperCase() : 'FILE'}
                    </div>
                    
                    <h4 className="font-bold text-slate-700 text-sm mb-1 truncate" title={doc.name}>{doc.name}</h4>
                    <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                      <span>{doc.size}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {doc.createdAt ? new Date(doc.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
