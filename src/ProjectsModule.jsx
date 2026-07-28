import React, { useState, useEffect } from 'react';
import { Plus, MoreHorizontal, User, Calendar, AlignLeft, Star, MessageSquare, ChevronLeft, ChevronRight, Trash2, LayoutGrid, Clock, PlayCircle, StopCircle } from 'lucide-react';
import { getProjects, addProject, updateProject, deleteProject, getTasks, addTask, updateTask, deleteTask, getEmployees, getTimeEntries, addTimeEntry, deleteTimeEntry } from './firebase';

export default function ProjectsModule({ currentTenant, currentUser, customers = [], currentIndustry }) {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [viewMode, setViewMode] = useState('kanban');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editingProjectData, setEditingProjectData] = useState({ name: '', description: '', clientId: '', clientName: '', startDate: '', endDate: '', status: 'Active', opposingParty: '', opposingCounsel: '', courtDate: '', statuteOfLimitations: '' });
  
  const [timeEntries, setTimeEntries] = useState([]);
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [newTimeEntry, setNewTimeEntry] = useState({ description: '', hours: '', rate: 250, date: new Date().toISOString().split('T')[0] });

  
  const [newTaskStatus, setNewTaskStatus] = useState('todo');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  
  const [activeRatingTaskId, setActiveRatingTaskId] = useState(null);
  const [ratingComment, setRatingComment] = useState('');
  const [activeTimers, setActiveTimers] = useState({});

  const toggleTimer = async (taskId) => {
    const now = Date.now();
    if (activeTimers[taskId]) {
      const startTime = activeTimers[taskId];
      const timeSpentSecs = Math.floor((now - startTime) / 1000);
      const task = tasks.find(t => t.id === taskId);
      const newTotalTime = (task.timeSpent || 0) + timeSpentSecs;
      
      setTasks(tasks.map(t => t.id === taskId ? { ...t, timeSpent: newTotalTime } : t));
      const newTimers = { ...activeTimers };
      delete newTimers[taskId];
      setActiveTimers(newTimers);

      try {
        await updateTask(activeProject.id, taskId, { timeSpent: newTotalTime }, currentTenant);
      } catch (err) {
        console.error("Failed to save time tracking:", err);
      }
    } else {
      setActiveTimers({ ...activeTimers, [taskId]: now });
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0h 0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  useEffect(() => {
    if (currentTenant) {
      loadInitialData();
    }
  }, [currentTenant]);

  useEffect(() => {
    if (activeProject) {
      loadTasks(activeProject.id);
      if (currentIndustry === 'law_firm') loadTimeEntries(activeProject.id);
    } else {
      setTasks([]);
      setTimeEntries([]);
    }
  }, [activeProject]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const projs = await getProjects(currentTenant);
      setProjects(projs);
      
      const emps = await getEmployees(currentTenant);
      setEmployees(emps);
      
      if (projs.length > 0) {
        setActiveProject(projs[0]);
      }
    } catch (err) {
      console.error("Error loading projects:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTasks = async (projectId) => {
    try {
      const fetchedTasks = await getTasks(projectId, currentTenant);
      setTasks(fetchedTasks);
    } catch (err) {
      console.error("Error loading tasks:", err);
    }
  };

  const loadTimeEntries = async (projectId) => {
    try {
      const entries = await getTimeEntries(currentTenant);
      setTimeEntries(entries.filter(e => e.projectId === projectId));
    } catch (err) {
      console.error("Error loading time entries:", err);
    }
  };

  const handleCreateProject = () => {
    setEditingProjectData({ name: '', description: '', clientId: '', clientName: '', startDate: '', endDate: '', status: 'Active', opposingParty: '', opposingCounsel: '', courtDate: '', statuteOfLimitations: '' });
    setIsEditingProject(true);
  };

  const handleEditProject = () => {
    if (!activeProject) return;
    setEditingProjectData({ 
      id: activeProject.id,
      name: activeProject.name || '', 
      description: activeProject.description || '', 
      clientId: activeProject.clientId || '', 
      clientName: activeProject.clientName || '',
      startDate: activeProject.startDate || '',
      endDate: activeProject.endDate || '',
      status: activeProject.status || 'Active',
      opposingParty: activeProject.opposingParty || '',
      opposingCounsel: activeProject.opposingCounsel || '',
      courtDate: activeProject.courtDate || '',
      statuteOfLimitations: activeProject.statuteOfLimitations || ''
    });
    setIsEditingProject(true);
  };

  const saveProject = async () => {
    if (!editingProjectData.name) return alert("Project name is required.");
    try {
      if (activeProject && editingProjectData.id === activeProject.id) {
        // Update existing
        await updateProject(activeProject.id, editingProjectData, currentTenant);
        const updated = { ...activeProject, ...editingProjectData };
        setProjects(projects.map(p => p.id === activeProject.id ? updated : p));
        setActiveProject(updated);
      } else {
        // Create new
        const newProjData = { ...editingProjectData, createdBy: currentUser.email || 'Admin' };
        if (!newProjData.status) newProjData.status = 'Active';
        const docRef = await addProject(newProjData, currentTenant);
        const newProj = { id: docRef.id, ...newProjData };
        setProjects([...projects, newProj]);
        setActiveProject(newProj);
      }
      setIsEditingProject(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save project.");
    }
  };

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = async (e, status) => {
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId && activeProject) {
      // Optimistic UI update
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status } : t));
      
      try {
        await updateTask(activeProject.id, taskId, { status }, currentTenant);
      } catch (err) {
        console.error("Error updating task status:", err);
        // Revert on error
        loadTasks(activeProject.id);
      }
    }
  };

  const handleAddTask = async (e, status) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !activeProject) return;
    
    const assignedEmployee = employees.find(emp => emp.id === newTaskAssignee);
    const assigneeName = (assignedEmployee && assignedEmployee.name) ? assignedEmployee.name : (currentUser && currentUser.name ? currentUser.name : 'Unassigned');

    const newTaskData = {
      title: newTaskTitle,
      status: status,
      assignee: assigneeName,
      priority: 'Medium',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      rating: 0,
      comment: ''
    };

    setIsAddingTask(false);
    setNewTaskTitle('');
    setNewTaskAssignee('');

    try {
      const docRef = await addTask(activeProject.id, newTaskData, currentTenant);
      setTasks([...tasks, { id: docRef.id, ...newTaskData }]);
    } catch (err) {
      console.error("Error adding task:", err);
      alert("Failed to add task");
    }
  };

  const moveTask = async (taskId, currentStatus, direction) => {
    const statuses = ['todo', 'in-progress', 'review', 'done'];
    const currentIndex = statuses.indexOf(currentStatus);
    const nextIndex = direction === 'right' ? currentIndex + 1 : currentIndex - 1;
    
    if (nextIndex >= 0 && nextIndex < statuses.length && activeProject) {
      const newStatus = statuses[nextIndex];
      // Optimistic UI update
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      
      try {
        await updateTask(activeProject.id, taskId, { status: newStatus }, currentTenant);
      } catch (err) {
        console.error("Error moving task:", err);
        alert("Failed to move task");
        loadTasks(activeProject.id);
      }
    }
  };
  
  const handleSaveRating = async (taskId, rating) => {
    if (!activeProject) return;
    
    // Optimistic UI
    setTasks(tasks.map(t => t.id === taskId ? { ...t, rating, comment: ratingComment } : t));
    setActiveRatingTaskId(null);
    setRatingComment('');

    try {
      await updateTask(activeProject.id, taskId, { rating, comment: ratingComment }, currentTenant);
    } catch (err) {
      console.error("Error rating task:", err);
    }
  };

  const columns = [
    { id: 'todo', label: 'To Do', color: 'bg-slate-200' },
    { id: 'in-progress', label: 'In Progress', color: 'bg-blue-200' },
    { id: 'review', label: 'Review', color: 'bg-orange-200' },
    { id: 'done', label: 'Done', color: 'bg-green-200' }
  ];

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">{currentIndustry === 'law_firm' ? 'Loading cases...' : 'Loading projects...'}</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">{currentIndustry === 'law_firm' ? 'Case Management' : 'Project Tracker'}</h1>
          <p className="text-sm text-slate-500">{currentIndustry === 'law_firm' ? 'Track case details, manage team matters, and billable time' : 'Track tasks, manage team projects, and review performance'}</p>
        </div>
        
        {activeProject && currentIndustry === 'law_firm' && (
          <div className="hidden lg:flex items-center gap-4 text-xs bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl">
            {activeProject.opposingParty && (
              <div className="border-r border-slate-200 pr-4">
                <span className="text-slate-400 font-bold uppercase tracking-wider block">Opposing Party</span>
                <span className="font-medium text-slate-700">{activeProject.opposingParty}</span>
              </div>
            )}
            {activeProject.courtDate && (
              <div className="border-r border-slate-200 pr-4">
                <span className="text-slate-400 font-bold uppercase tracking-wider block">Court Date</span>
                <span className={`font-medium ${new Date(activeProject.courtDate) < new Date(Date.now() + 30*24*60*60*1000) ? 'text-red-600 font-bold' : 'text-slate-700'}`}>{new Date(activeProject.courtDate).toLocaleDateString()}</span>
              </div>
            )}
            {activeProject.statuteOfLimitations && (
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider block">SOL Deadline</span>
                <span className={`font-medium ${new Date(activeProject.statuteOfLimitations) < new Date(Date.now() + 30*24*60*60*1000) ? 'text-red-600 font-bold' : 'text-slate-700'}`}>{new Date(activeProject.statuteOfLimitations).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 items-center">
          <div className="hidden sm:flex bg-slate-200 p-1 rounded-xl">
            {currentUser?.role === 'admin' && (
              <>
                <button onClick={() => setViewMode('kanban')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === 'kanban' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                  <LayoutGrid className="w-3.5 h-3.5" /> Kanban
                </button>
                <button onClick={() => setViewMode('calendar')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === 'calendar' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Calendar className="w-3.5 h-3.5" /> Calendar
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={activeProject?.id || ''} 
              onChange={(e) => {
                const found = projects.find(p => p.id === e.target.value);
                if (found) setActiveProject(found);
              }}
              className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none"
            >
              {projects.length === 0 && <option value="">No projects</option>}
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {activeProject && (
              <>
                <button onClick={handleEditProject} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-sm font-bold transition-all" title="Edit Project">
                  Edit
                </button>
                <button onClick={async () => {
                  if (confirm(`Are you sure you want to completely delete "${activeProject.name}"? This cannot be undone.`)) {
                    await deleteProject(activeProject.id, currentTenant);
                    const remaining = projects.filter(p => p.id !== activeProject.id);
                    setProjects(remaining);
                    setActiveProject(remaining.length > 0 ? remaining[0] : null);
                  }
                }} className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-xl text-sm font-bold transition-all" title="Delete Project">
                  <Trash2 className="w-4 h-4" />
                  </button>
              </>
            )}
          </div>

          {currentIndustry === 'law_firm' && activeProject && (
            <button onClick={() => setIsTimeModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all">
              <Clock className="w-4 h-4" /> Time & Billing
            </button>
          )}

          {currentUser?.role === 'admin' && (
<button onClick={handleCreateProject} className="bg-recloud-600 hover:bg-recloud-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-recloud-500/20 flex items-center gap-2 transition-all">
            <Plus className="w-4 h-4" /> {currentIndustry === 'law_firm' ? 'New Case' : 'New Project'}
          </button>
)}
        </div>
      </div>

      {!activeProject ? (
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center p-8">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
            <AlignLeft className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-700 mb-2">{currentIndustry === 'law_firm' ? 'No Cases Yet' : 'No Projects Yet'}</h2>
          <p className="text-slate-500 mb-6 max-w-md text-center">{currentIndustry === 'law_firm' ? 'Create a new case to start tracking matters and collaborating with your firm.' : 'Create a new project to start tracking tasks and collaborating with your team.'}</p>
          <button onClick={handleCreateProject} className="bg-recloud-600 hover:bg-recloud-700 text-white px-6 py-3 rounded-xl font-bold shadow-md shadow-recloud-500/20 flex items-center gap-2 transition-all">
            <Plus className="w-5 h-5" /> {currentIndustry === 'law_firm' ? 'Create First Case' : 'Create First Project'}
          </button>
        </div>
      ) : viewMode === 'calendar' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
            <div className="flex gap-2">
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600"><ChevronLeft className="w-5 h-5"/></button>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600"><ChevronRight className="w-5 h-5"/></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden min-w-[700px]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="bg-slate-50 p-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">{day}</div>
            ))}
            {Array.from({ length: 35 }).map((_, i) => {
              const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
              const date = i - firstDay + 1;
              const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
              const isValidDate = date > 0 && date <= daysInMonth;
              const dateObj = isValidDate ? new Date(currentMonth.getFullYear(), currentMonth.getMonth(), date) : null;
              const dateStr = dateObj ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
              
              const dayTasks = isValidDate ? tasks.filter(t => t.date === dateStr) : [];
              
              return (
                <div key={i} className={`bg-white min-h-[120px] p-2 ${isValidDate ? 'hover:bg-slate-50 cursor-pointer' : 'opacity-50'}`}>
                  {isValidDate && (
                    <>
                      <span className={`text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center ${new Date().getDate() === date && new Date().getMonth() === currentMonth.getMonth() && new Date().getFullYear() === currentMonth.getFullYear() ? 'bg-blue-600 text-white shadow-md' : 'text-slate-700'}`}>
                        {date}
                      </span>
                      <div className="mt-2 space-y-1.5">
                        {dayTasks.map(t => (
                          <div key={t.id} className={`text-[10px] px-2 py-1.5 rounded-md font-bold truncate border shadow-sm ${t.status === 'done' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                            {t.title}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-100 flex-1 p-4 md:p-6 overflow-x-auto flex gap-6">
          {columns.map(col => (
            <div 
              key={col.id} 
              className="flex-none w-[280px] md:w-80 flex flex-col bg-slate-100/50 rounded-2xl p-4 border border-slate-200"
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, col.id)}
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${col.color}`}></div>
                  <h3 className="font-bold text-slate-700">{col.label}</h3>
                  <span className="text-xs font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full shadow-sm">
                    {tasks.filter(t => t.status === col.id).length}
                  </span>
                </div>
                <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal className="w-4 h-4" /></button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pb-4">
                {tasks.filter(t => t.status === col.id).map(task => (
                  <div 
                    key={task.id} 
                    draggable
                    onDragStart={e => handleDragStart(e, task.id)}
                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:border-recloud-300 hover:shadow-md transition-all group relative"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {col.id !== 'todo' && (
                          <button onClick={() => moveTask(task.id, col.id, 'left')} className="p-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-500 shadow-sm md:hidden">
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        )}
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm ${task.priority === 'Critical' ? 'bg-red-100 text-red-600' : task.priority === 'High' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                          {task.priority || 'Medium'}
                        </span>
                        {col.id !== 'done' && (
                          <button onClick={() => moveTask(task.id, col.id, 'right')} className="p-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-500 shadow-sm md:hidden">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <button onClick={async () => {
                        if(confirm('Delete this task?')) {
                           await deleteTask(activeProject.id, task.id, currentTenant);
                           setTasks(tasks.filter(t => t.id !== task.id));
                        }
                      }} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded-md transition-colors shadow-sm" title="Delete Task">
                        <Trash2 className="w-4 h-4" />
                  </button>
                    </div>
                    <h4 className="font-bold text-slate-700 text-sm mb-3 leading-snug">{task.title}</h4>
                    
                    <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-slate-50">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-medium bg-slate-100 px-2 py-1 rounded-md text-slate-600" title="Assignee">
                          <User className="w-3.5 h-3.5" /> {task.assignee}
                        </span>
                        <div className="flex items-center gap-1 text-slate-400 font-medium">
                          <Calendar className="w-3.5 h-3.5" /> {task.date}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md text-xs text-slate-600 w-full justify-between">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            <span className="font-mono font-medium">{formatTime((task.timeSpent || 0) + (activeTimers[task.id] ? Math.floor((Date.now() - activeTimers[task.id]) / 1000) : 0))}</span>
                          </div>
                          <button onClick={() => toggleTimer(task.id)} className={`hover:scale-110 transition-transform ${activeTimers[task.id] ? 'text-red-500' : 'text-emerald-500'}`}>
                            {activeTimers[task.id] ? <StopCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Review & Rating Section for Review/Done Columns */}
                    {(col.id === 'review' || col.id === 'done') && (
                      <div className="mt-4 pt-3 border-t border-dashed border-slate-200">
                        {activeRatingTaskId === task.id ? (
                          <div className="flex flex-col gap-2">
                            <textarea 
                              className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-recloud-500 resize-none" 
                              placeholder="Manager Comment..."
                              value={ratingComment}
                              onChange={e => setRatingComment(e.target.value)}
                              rows="2"
                            />
                            <div className="flex items-center justify-between">
                              <div className="flex gap-1">
                                {[1,2,3,4,5].map(star => (
                                  <button key={star} onClick={() => handleSaveRating(task.id, star)} className="text-slate-300 hover:text-amber-400 focus:text-amber-400 transition-colors">
                                    <Star className="w-4 h-4 fill-current" />
                                  </button>
                                ))}
                              </div>
                              <button onClick={() => setActiveRatingTaskId(null)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Performance</span>
                              {task.rating ? (
                                <div className="flex gap-0.5">
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`w-3.5 h-3.5 ${i < task.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} />
                                  ))}
                                </div>
                              ) : (
                                <button onClick={() => { setActiveRatingTaskId(task.id); setRatingComment(task.comment || ''); }} className="text-[10px] font-bold text-recloud-600 hover:underline bg-recloud-50 px-2 py-0.5 rounded">Rate Task</button>
                              )}
                            </div>
                            
                            {task.comment && (
                              <div className="bg-amber-50 p-2 rounded-lg text-xs text-amber-900 border border-amber-100 flex items-start gap-2">
                                <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-amber-600 shrink-0" />
                                <p className="italic leading-snug">{task.comment}</p>
                              </div>
                            )}

                            {task.rating > 0 && (
                               <button onClick={() => { setActiveRatingTaskId(task.id); setRatingComment(task.comment || ''); }} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 text-right w-full">Edit Review</button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                ))}
                
                {isAddingTask && newTaskStatus === col.id ? (
                  <form onSubmit={e => handleAddTask(e, col.id)} className="bg-white p-3 rounded-xl shadow-md border border-recloud-300 transform transition-all scale-105 z-10 relative">
                    <textarea 
                      autoFocus
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      placeholder="What needs to be done?"
                      className="w-full text-sm outline-none resize-none bg-transparent font-medium text-slate-700"
                      rows="2"
                    />
                    <div className="mt-2 mb-3">
                       <select 
                         value={newTaskAssignee} 
                         onChange={e => setNewTaskAssignee(e.target.value)}
                         className="w-full text-xs border border-slate-200 rounded p-1.5 outline-none text-slate-600"
                       >
                         <option value="">Assign to...</option>
                         {employees.map(emp => (
                           <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                         ))}
                       </select>
                    </div>
                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-2">
                      <button type="button" onClick={() => setIsAddingTask(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                      <button type="submit" className="px-4 py-1.5 text-xs font-bold text-white bg-recloud-600 hover:bg-recloud-700 rounded-lg shadow-sm transition-colors">Save Task</button>
                    </div>
                  </form>
                ) : (
                  <button 
                    onClick={() => { setIsAddingTask(true); setNewTaskStatus(col.id); setNewTaskTitle(''); setNewTaskAssignee(''); }} 
                    className="w-full py-2.5 text-sm font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-all flex items-center justify-center gap-2 border-2 border-transparent border-dashed hover:border-slate-300"
                  >
                    <Plus className="w-4 h-4" /> Add Task
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create Project Modal */}
      {isEditingProject && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-black text-slate-800">{activeProject && editingProjectData.id === activeProject.id ? (currentIndustry === 'law_firm' ? 'Edit Case' : 'Edit Project') : (currentIndustry === 'law_firm' ? 'Create Case' : 'Create Project')}</h3>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{currentIndustry === 'law_firm' ? 'Case Name' : 'Project Name'}</label>
                <input type="text" value={editingProjectData.name} onChange={e => setEditingProjectData({...editingProjectData, name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium text-slate-800" placeholder={currentIndustry === 'law_firm' ? 'e.g. Smith v. Jones' : 'e.g. Website Redesign'} />
              </div>
              
              {currentIndustry === 'law_firm' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Opposing Party</label>
                      <input type="text" value={editingProjectData.opposingParty} onChange={e => setEditingProjectData({...editingProjectData, opposingParty: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium text-slate-800" placeholder="e.g. Jane Doe" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Opposing Counsel</label>
                      <input type="text" value={editingProjectData.opposingCounsel} onChange={e => setEditingProjectData({...editingProjectData, opposingCounsel: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium text-slate-800" placeholder="e.g. Bob Smith, Esq." />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-red-600">Court Date</label>
                      <input type="date" value={editingProjectData.courtDate} onChange={e => setEditingProjectData({...editingProjectData, courtDate: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-red-600">Statute of Limitations</label>
                      <input type="date" value={editingProjectData.statuteOfLimitations} onChange={e => setEditingProjectData({...editingProjectData, statuteOfLimitations: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium text-slate-800" />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                <textarea value={editingProjectData.description} onChange={e => setEditingProjectData({...editingProjectData, description: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium text-slate-800 h-20 resize-none" placeholder="Brief project description..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Start Date</label>
                  <input type="date" value={editingProjectData.startDate} onChange={e => setEditingProjectData({...editingProjectData, startDate: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium text-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">End Date</label>
                  <input type="date" value={editingProjectData.endDate} onChange={e => setEditingProjectData({...editingProjectData, endDate: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium text-slate-800" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                  <select value={editingProjectData.status} onChange={e => setEditingProjectData({...editingProjectData, status: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium text-slate-800">
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Link to Client</label>
                  <select value={editingProjectData.clientId} onChange={e => {
                    const cust = customers.find(c => c.id === e.target.value);
                    setEditingProjectData({...editingProjectData, clientId: cust ? cust.id : '', clientName: cust ? cust.name : ''});
                  }} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium text-slate-800">
                    <option value="">No Client (Internal)</option>
                    {customers && customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsEditingProject(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
              <button onClick={saveProject} className="px-5 py-2.5 bg-blue-600 text-white font-bold hover:bg-blue-700 hover:shadow-md rounded-xl transition-all">{currentIndustry === 'law_firm' ? 'Save Case' : 'Save Project'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Time & Billing Modal */}
      {isTimeModalOpen && activeProject && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-black text-slate-800">Time & Billing</h3>
                <p className="text-sm text-slate-500 font-medium">{activeProject.name}</p>
              </div>
              <button onClick={() => setIsTimeModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="w-6 h-6"/></button>
            </div>
            
            <div className="p-6 bg-white border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-700 mb-3">Log New Time</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <input type="text" value={newTimeEntry.description} onChange={e => setNewTimeEntry({...newTimeEntry, description: e.target.value})} placeholder="Description (e.g. Client call)" className="w-full text-sm border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500" />
                </div>
                <div>
                  <input type="number" step="0.1" value={newTimeEntry.hours} onChange={e => setNewTimeEntry({...newTimeEntry, hours: e.target.value})} placeholder="Hours (e.g. 1.5)" className="w-full text-sm border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500" />
                </div>
                <div>
                  <input type="number" value={newTimeEntry.rate} onChange={e => setNewTimeEntry({...newTimeEntry, rate: e.target.value})} placeholder="Rate (₦/hr)" className="w-full text-sm border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="flex justify-between items-center mt-3">
                <input type="date" value={newTimeEntry.date} onChange={e => setNewTimeEntry({...newTimeEntry, date: e.target.value})} className="text-sm border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500" />
                <button onClick={async () => {
                  if (!newTimeEntry.description || !newTimeEntry.hours || !newTimeEntry.rate) return alert("Please fill all fields");
                  const entryData = {
                    ...newTimeEntry,
                    hours: parseFloat(newTimeEntry.hours),
                    rate: parseFloat(newTimeEntry.rate),
                    projectId: activeProject.id,
                    projectName: activeProject.name,
                    clientId: activeProject.clientId || '',
                    billed: false
                  };
                  try {
                    const docRef = await addTimeEntry(entryData, currentTenant);
                    setTimeEntries([{ id: docRef.id, ...entryData }, ...timeEntries]);
                    setNewTimeEntry({ description: '', hours: '', rate: newTimeEntry.rate, date: new Date().toISOString().split('T')[0] });
                  } catch (err) {
                    console.error(err);
                  }
                }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add Time
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
              <h4 className="text-sm font-bold text-slate-700 mb-3">Time Entries</h4>
              {timeEntries.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-4">No time logged yet.</p>
              ) : (
                <div className="space-y-2">
                  {timeEntries.sort((a,b) => new Date(b.date) - new Date(a.date)).map(entry => (
                    <div key={entry.id} className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{entry.description}</p>
                        <p className="text-xs text-slate-500 font-medium">{entry.date} &bull; {entry.hours} hrs @ ₦{entry.rate}/hr</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-slate-700">₦{(entry.hours * entry.rate).toLocaleString()}</span>
                        {entry.billed ? (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold uppercase">Billed</span>
                        ) : (
                          <button onClick={async () => {
                            if(confirm("Delete entry?")) {
                              await deleteTimeEntry(entry.id, currentTenant);
                              setTimeEntries(timeEntries.filter(e => e.id !== entry.id));
                            }
                          }} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-white flex justify-between items-center">
              <div className="text-sm">
                <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Unbilled Total</span>
                <span className="font-black text-xl text-slate-800">
                  ₦{timeEntries.filter(e => !e.billed).reduce((sum, e) => sum + (e.hours * e.rate), 0).toLocaleString()}
                </span>
              </div>
              {/* Note: Invoicing will be handled in AccountingModule, but for ease, a hint could be placed here, or a button to push to Accounting. */}
              <p className="text-xs text-slate-400 italic">Bill these hours via the Accounting Module.</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
