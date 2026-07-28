import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

import { 
  Building2, Users, Receipt, LayoutDashboard, Settings, 
  Search, Plus, Bell, ChevronDown, Package, Clock, X, Phone, Mail, MapPin, Briefcase, Calendar, CalendarCheck, CheckCircle2, XCircle, Banknote, FileText, Download, Trash2, PieChart, MessageCircle, FolderOpen, Kanban, Sparkles, Menu
, History, Database, Webhook, ShieldCheck, Landmark, Lock } from 'lucide-react';
import { getEmployees, addEmployee, clockIn, clockOut, updateEmployee, deactivateEmployee, activateEmployee, deleteEmployee, getShifts, assignShift, removeShift, getLeaveRequests, submitLeaveRequest,  updateLeaveStatus,
  getPayslips,
  generatePayslip,
  getDocuments,
  addDocument,
  getReviews,
  addReview,
  getApplicants,
  addApplicant,
  updateApplicantStatus,
  getJobs,
  addJob,
  registerTenant,
  getTenantConfig,
  updateTenantConfig,
  getCustomers,
  addCustomer,
  updateCustomer,
  deleteCustomer,
  getDeals,
  addDeal,
  updateDealStatus,
  getInvoices,
  addInvoice,
  updateInvoiceStatus,
  getProducts,
  getStockMovements,
  getWarehouses,
  addWarehouse,
  getSuppliers,
  getPurchaseOrders,
  getSales,
  getB2BOrders,
  updateB2BOrder,
  getLedgerEntries,
  addLedgerEntry,
  getExpenses,
  addExpense,
  updateExpense,
  getBranchOrders,
  addBranchOrder,
  updateBranchOrder,
  deleteBranchOrder,
  loginUser,
  resetUserPassword,
  logoutUser,
  createAuthUser,
  loginWithGoogle,
  getUserWorkspaces,
  removeUserWorkspace,
  db,
  auth
} from './firebase';
import { collection, doc, onSnapshot, getDoc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
const CrmModule = React.lazy(() => import('./CrmModule'));
const InventoryModule = React.lazy(() => import('./InventoryModule'));
const PosModule = React.lazy(() => import('./PosModule'));
const B2bOrderModule = React.lazy(() => import('./B2bOrderModule'));
const ReportsModule = React.lazy(() => import('./ReportsModule'));
const AccountingModule = React.lazy(() => import('./AccountingModule'));
const DiscussModule = React.lazy(() => import('./DiscussModule'));
const DocumentsModule = React.lazy(() => import('./DocumentsModule'));
const ProjectsModule = React.lazy(() => import('./ProjectsModule'));
const LawModule = React.lazy(() => import('./LawModule'));
const AiAssistantModule = React.lazy(() => import('./AiAssistantModule'));
const HistoryModule = React.lazy(() => import('./HistoryModule'));
const ClientPortalModule = React.lazy(() => import('./ClientPortalModule'));
const ApiSettingsModule = React.lazy(() => import('./ApiSettingsModule'));
const BackendModule = React.lazy(() => import('./BackendModule'));
const WebhookModule = React.lazy(() => import('./WebhookModule'));
import { validateEmailRealtime } from './utils/emailValidator';

function LocationSelector({ newBranch, setNewBranch }) {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setNewBranch(prev => ({ ...prev, lat, lng }));
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        if (data && data.display_name) {
          const addressParts = [];
          if(data.address.city || data.address.town || data.address.village) addressParts.push(data.address.city || data.address.town || data.address.village);
          if(data.address.state) addressParts.push(data.address.state);
          if(data.address.country) addressParts.push(data.address.country);
          const simpleAddress = addressParts.length > 0 ? addressParts.join(', ') : data.display_name;
          setNewBranch(prev => ({ ...prev, lat, lng, location: simpleAddress }));
        }
      } catch (err) {
        console.error("Geocoding failed", err);
      }
    },
  });

  return newBranch.lat && newBranch.lng ? (
    <Marker position={[Number(newBranch.lat), Number(newBranch.lng)]}>
      <Popup>New Branch Pin</Popup>
    </Marker>
  ) : null;
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div className="p-4 bg-red-50 text-red-500 rounded-xl"><h1>Something went wrong.</h1><pre>{this.state.error?.toString()}</pre></div>;
    }
    return this.props.children; 
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('hr');
  const [publicView, setPublicView] = useState('landing'); // 'landing', 'login', or 'careers'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [currentTenant, setCurrentTenant] = useState(new URLSearchParams(window.location.search).get('org') || null);
  const [tenantConfig, setTenantConfig] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  const urlOrg = new URLSearchParams(window.location.search).get('org');
  const [loginWorkspace, setLoginWorkspace] = useState(urlOrg || 'tenant_1');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // New auth states for multi-tenant login
  const [availableWorkspaces, setAvailableWorkspaces] = useState([]);
  const [tempAuthUser, setTempAuthUser] = useState(null);
  const [showWorkspaceSelect, setShowWorkspaceSelect] = useState(false);

  const [regCompany, setRegCompany] = useState('');
  const [regWorkspace, setRegWorkspace] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regIndustry, setRegIndustry] = useState('retail');
  
  const [hrTab, setHrTab] = useState('directory'); // 'directory', 'roster', 'leaves', or 'payroll'
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [selectedPayslipEmp, setSelectedPayslipEmp] = useState(null);
  
  // Dynamic Payslip Config
  const [payslipCurrency, setPayslipCurrency] = useState('$');
  const [b2bOrders, setB2BOrders] = useState([]);
  const [payslipPeriod, setPayslipPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [payslipTaxRate, setPayslipTaxRate] = useState(20);
  const [payslipLineItems, setPayslipLineItems] = useState([]);

  const [filterDept, setFilterDept] = useState('All Departments');
  const [filterBranch, setFilterBranch] = useState('');

  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileTab, setProfileTab] = useState('overview');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState(null);

  const [documents, setDocuments] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [jobs, setJobs] = useState([]);
  
  // CRM State
  const [customers, setCustomers] = useState([]);
  const [deals, setDeals] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [activeCrmTab, setActiveCrmTab] = useState('customers'); // 'customers', 'deals', 'invoices'

  // Inventory State
  const [products, setProducts] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [branchOrders, setBranchOrders] = useState([]);
  const [sales, setSales] = useState([]);
  
  // Accounting State
  const [ledger, setLedger] = useState([]);
  const [expenses, setExpenses] = useState([]);
  
  // HR Branch State
  const [newBranch, setNewBranch] = useState({ name: '', location: '' });
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const currentIndustry = tenantConfig?.industry || 'retail';
  const isModuleEnabled = (moduleName) => {
    if (currentIndustry === 'law_firm') {
      if (['inventory', 'pos', 'b2b'].includes(moduleName)) return false;
    }
    return true;
  };
  
  const [settingsForm, setSettingsForm] = useState({ companyName: '', logoUrl: '', address: '', phone: '', bankName: '', accountName: '', accountNumber: '', industry: 'retail' });

  const [settingsMessage, setSettingsMessage] = useState({ type: '', text: '' });

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsMessage({ type: '', text: '' });
    setIsLoading(true);
    try {
      await updateTenantConfig(currentTenant, settingsForm);
      setSettingsMessage({ type: 'success', text: 'Company branding settings updated successfully!' });
      setTimeout(() => setSettingsMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error(err);
      setSettingsMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    }
    setIsLoading(false);
  };

  const handleAddBranch = async (e) => {
    e.preventDefault();
    if (!newBranch.name) return;
    setIsLoading(true);
    try {
      await addWarehouse(newBranch, currentTenant);
      setNewBranch({ name: '', location: '', lat: null, lng: null });
      await fetchData(currentTenant);
    } catch (err) {
      console.error("Error adding branch:", err);
      alert("Failed to add branch");
    }
    setIsLoading(false);
  };
  
  // Calendar Pagination State
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1); // Start on Monday
    d.setHours(0,0,0,0);
    return d;
  });

  const getLocalDateStr = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getWeekDates = (startDate) => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  };
  
  const weekDates = getWeekDates(currentWeekStart);
  const [newEmployee, setNewEmployee] = useState({ name: '', role: 'staff', department: '', status: 'Clocked Out', phone: '', email: '', password: '', creditLimit: '0', currentBalance: 0 });
  const [newLeave, setNewLeave] = useState({ employeeId: '', employeeName: '', type: 'Vacation', startDate: '', endDate: '', reason: '' });

  const [newDoc, setNewDoc] = useState({ name: '', type: 'Personal ID', fileData: null, fileName: '' });
  const [newReview, setNewReview] = useState({ score: 5, comments: '', goals: '' });
  const [newApplicant, setNewApplicant] = useState({ name: '', role: '', phone: '', email: '', status: 'Applied' });
  const [newJob, setNewJob] = useState({ title: '', department: 'Operations', location: 'Remote', type: 'Full-time', description: '' });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewDoc(prev => ({ ...prev, fileData: reader.result, fileName: file.name }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadDocument = async (e, targetEmployeeId, uploaderRole) => {
    e.preventDefault();
    if(!newDoc.name || !newDoc.fileData) {
      alert("Please provide a document name and select a file to upload.");
      return;
    }
    
    // Check if the file is too large for Firestore document (limit ~1MB)
    if (newDoc.fileData.length > 1000000) {
       alert("File is too large for this prototype database. Please upload a smaller file (under 700KB).");
       return;
    }

    await addDocument({
      employeeId: targetEmployeeId,
      name: newDoc.name,
      type: newDoc.type,
      fileData: newDoc.fileData,
      fileName: newDoc.fileName,
      uploadedBy: uploaderRole,
      date: new Date().toISOString()
    }, currentTenant);
    setNewDoc({ name: '', type: 'Personal ID', fileData: null, fileName: '' });
    fetchData(); 
  };

  const handleDownloadDocument = (doc) => {
    if (!doc.fileData) {
      alert("This document is a legacy record and contains no physical file data.");
      return;
    }
    const link = document.createElement('a');
    link.href = doc.fileData;
    link.download = doc.fileName || `${doc.name}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if(!newReview.comments) return;

    await addReview({
      employeeId: selectedProfile.id,
      reviewerName: currentUser.name,
      ...newReview,
      date: new Date().toISOString()
    }, currentTenant);
    setNewReview({ score: 5, comments: '', goals: '' });
    fetchData();
  };

  const handleAddApplicant = async (e) => {
    e.preventDefault();
    if (!newApplicant.name || !newApplicant.role) return;
    setIsLoading(true);
    try {
      await addApplicant(newApplicant, currentTenant);
      setNewApplicant({ name: '', role: '', phone: '', email: '', status: 'Applied' });
      const appData = await getApplicants(currentTenant);
      setApplicants(appData);
      
      // If applying from external careers page, we don't fetch all private HR data
      if (activeTab === 'careers') {
        alert("Application submitted successfully!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddJob = async (e) => {
    e.preventDefault();
    if (!newJob.title) return;
    setIsLoading(true);
    try {
      await addJob(newJob, currentTenant);
      setNewJob({ title: '', department: 'Operations', location: 'Remote', type: 'Full-time', description: '' });
      const jobData = await getJobs(currentTenant);
      setJobs(jobData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateApplicantStatus = async (id, newStatus) => {
    setApplicants(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    try {
      await updateApplicantStatus(id, newStatus, currentTenant);
      const appData = await getApplicants(currentTenant);
      setApplicants(appData);
      
      if (newStatus === 'Hired') {
        const hiredApp = applicants.find(a => a.id === id) || appData.find(a => a.id === id);
        if (hiredApp) {
          setNewEmployee({ ...newEmployee, name: hiredApp.name, role: hiredApp.role, phone: hiredApp.phone, email: hiredApp.email });
          setIsAddModalOpen(true);
        }
      }
    } catch (err) {
      console.error(err);
      const appData = await getApplicants(currentTenant);
      setApplicants(appData);
    }
  };


  // Handle role-based default tabs
  useEffect(() => {
    if (currentUser?.role === 'staff') {
      setActiveTab('ess');
    } else if (currentUser?.role === 'cashier') {
      setActiveTab('pos');
    } else if (currentUser?.role === 'client') {
      setActiveTab('client_portal');
    } else if (['distributor', 'sales_rep', 'b2b_customer'].includes(currentUser?.role)) {
      setActiveTab('b2b');
    } else if (currentUser?.role === 'admin') {
      setActiveTab('hr');
      setHrTab('directory');
    }
  }, [currentUser]);

  // Fetch employees and shifts on load
  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const fetchData = async (tenant = currentTenant) => {
    if (!tenant) {
      setIsLoading(false);
      return;
    }
    try {
      const [empData, shiftData, leaveData, payslipData, docData, revData, appData, jobData, custData, dealData, invData, prodData, moveData, whData, supData, poData, branchOrdersData, salesData, b2bOrdersData, ledgerData, expData] = await Promise.all([
        getEmployees(tenant),
        getShifts(tenant),
        getLeaveRequests(tenant),
        getPayslips(tenant),
        getDocuments(tenant),
        getReviews(tenant),
        getApplicants(tenant),
        getJobs(tenant),
        getCustomers(tenant),
        getDeals(tenant),
        getInvoices(tenant),
        getProducts(tenant),
        getStockMovements(tenant),
        getWarehouses(tenant),
        getSuppliers(tenant),
        getPurchaseOrders(tenant),
        getBranchOrders(tenant),
        getSales(tenant),
        getB2BOrders(tenant),
        getLedgerEntries(tenant),
        getExpenses(tenant)
      ]);
      setEmployees(empData);
      setShifts(shiftData);
      setLeaves(leaveData);
      setPayslips(payslipData);
      setDocuments(docData);
      setReviews(revData);
      setApplicants(appData);
      setJobs(jobData);
      setCustomers(custData);
      setDeals(dealData);
      setInvoices(invData);
      setProducts(prodData);
      setStockMovements(moveData);
      setWarehouses(whData);
      setSuppliers(supData);
      setPurchaseOrders(poData);
      setBranchOrders(branchOrdersData);
      setSales(salesData);
      setB2BOrders(b2bOrdersData);
      setLedger(ledgerData);
      setExpenses(expData);
    } catch (error) {
      console.error("Error fetching data: ", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentTenant) {
      getTenantConfig(currentTenant).then(configData => {
        if (configData) {
          setTenantConfig(configData);
          setSettingsForm({
            companyName: configData.companyName || '',
            logoUrl: configData.logoUrl || '',
            address: configData.address || '',
            phone: configData.phone || '',
            bankName: configData.bankName || '',
            accountName: configData.accountName || '',
            accountNumber: configData.accountNumber || '',
            industry: configData.industry || 'retail',
          });
        }
      });
    }
  }, [currentTenant]);

  useEffect(() => {
    if (publicView === 'careers' && !currentUser && currentTenant) {
      getJobs(currentTenant).then(data => setJobs(data)).catch(console.error);
    }
  }, [publicView, currentUser, currentTenant]);

  // Compute notifications dynamically
  const getNotifications = () => {
    let notifs = [];
    if (currentUser?.role === 'admin') {
      documents.forEach(doc => {
        if (doc.uploadedBy === 'Staff') {
          const emp = employees.find(e => e.id === doc.employeeId);
          notifs.push({
            id: `doc_${doc.id}`,
            type: 'doc',
            employeeId: doc.employeeId,
            text: `${emp?.name || 'A staff member'} uploaded a document: ${doc.name}`,
            date: doc.date
          });
        }
      });
      leaves.forEach(l => {
        if (l.status === 'Pending') {
          notifs.push({
            id: `leave_${l.id}`,
            type: 'leave',
            employeeId: l.employeeId,
            text: `${l.employeeName} submitted a new ${l.type} request.`,
            date: l.createdAt?.toDate ? l.createdAt.toDate().toISOString() : new Date().toISOString()
          });
        }
      });
    } else if (currentUser?.role === 'staff') {
      documents.forEach(doc => {
        if (doc.uploadedBy === 'HR Admin' && doc.employeeId === currentUser.id) {
          notifs.push({
            id: `doc_${doc.id}`,
            type: 'doc',
            text: `HR shared a document with you: ${doc.name}`,
            date: doc.date
          });
        }
      });
      reviews.forEach(r => {
        if (r.employeeId === currentUser.id) {
          notifs.push({
            id: `rev_${r.id}`,
            type: 'rev',
            text: `New performance review from ${r.reviewerName}`,
            date: r.date
          });
        }
      });
      payslips.forEach(p => {
        if (p.employeeId === currentUser.id) {
          notifs.push({
            id: `ps_${p.id}`,
            type: 'ps',
            text: `Payslip available for ${p.month}`,
            date: p.date || new Date().toISOString()
          });
        }
      });
      expenses.forEach(e => {
        if (e.submittedBy === currentUser.name && (e.status === 'Approved' || e.status === 'Rejected')) {
          notifs.push({
            id: `exp_${e.id}`,
            type: 'expense',
            text: `Your expense request for ₦${Number(e.amount).toLocaleString()} was ${e.status}.`,
            date: e.updatedAt || e.approvedAt || e.rejectedAt || e.submittedAt || new Date().toISOString()
          });
        }
      });
    }
    return notifs.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
  };

  const handleNotificationClick = (n) => {
    setShowNotifications(false);
    if (currentUser?.role === 'admin') {
      if (n.employeeId) {
        const emp = employees.find(e => e.id === n.employeeId);
        if (emp) {
          setActiveTab('hr');
          setSelectedProfile(emp);
          setProfileTab(n.type === 'doc' ? 'documents' : 'overview');
        }
      }
    } else {
      setActiveTab('ess');
      setTimeout(() => {
        if (n.type === 'doc') document.getElementById('ess-documents')?.scrollIntoView({ behavior: 'smooth' });
        else if (n.type === 'rev') document.getElementById('ess-performance')?.scrollIntoView({ behavior: 'smooth' });
        else if (n.type === 'ps') document.getElementById('ess-payslips')?.scrollIntoView({ behavior: 'smooth' });
        else if (n.type === 'leave') document.getElementById('ess-leaves')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const fetchShifts = async () => {
    try {
      const data = await getShifts(currentTenant);
      setShifts(data);
    } catch (error) {
      console.error("Error fetching shifts:", error);
    }
  };

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const data = await getEmployees(currentTenant);
      setEmployees(data);
      if (currentUser) {
        const updatedMe = data.find(e => e.id === currentUser.id);
        if (updatedMe) setCurrentUser(updatedMe);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
    setIsLoading(false);
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newEmployee.name || !newEmployee.role) return;
    
    if (newEmployee.email) {
      const emailValidation = await validateEmailRealtime(newEmployee.email);
      if (!emailValidation.isValid) {
        alert(emailValidation.message);
        return;
      }
    } else {
        alert("An email address is required for notifications.");
        return;
    }

    // Generate simple initials avatar
    const initials = newEmployee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    try {
      // 1. Create the Firebase Auth User & send password reset
      const authUid = await createAuthUser(newEmployee.email, newEmployee.name);
      
      // 2. Add the employee to Firestore using the generated Auth UID
      await addEmployee({ ...newEmployee, id: authUid, avatar: initials }, currentTenant);
      
      setIsAddModalOpen(false);
      setNewEmployee({ name: '', role: '', department: '', status: 'Clocked Out', phone: '', email: '', creditLimit: '0', currentBalance: 0 });
      fetchEmployees(); // Refresh list
      alert("Employee created successfully! A password setup email has been sent to them.");
    } catch (error) {
      console.error("Error adding employee:", error);
      if (error.code === 'auth/email-already-in-use') {
        alert("This email is already registered in the system.");
      } else {
        alert("Failed to create employee: " + error.message);
      }
    }
  };

  const handleToggleClock = async (emp) => {
    const nextStatus = emp.status === 'Clocked In' ? 'Clocked Out' : 'Clocked In';
    setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, status: nextStatus } : e));
    try {
      if (emp.status === 'Clocked In') {
        await clockOut(emp.id, currentTenant);
      } else {
        await clockIn(emp.id, currentTenant);
      }
      fetchEmployees();
    } catch (error) {
      console.error("Error toggling clock status:", error);
      fetchEmployees();
    }
  };

  const handleDeleteEmployee = async (empId) => {
    if (window.confirm("Are you sure you want to permanently delete this employee? This cannot be undone.")) {
      try {
        await deleteEmployee(empId, currentTenant);
        fetchEmployees();
      } catch (error) {
        console.error("Error deleting employee:", error);
        alert("Failed to delete employee.");
      }
    }
  };

  const handleUpdateProfile = async () => {
    if (!editedProfile) return;
    try {
      await updateEmployee(editedProfile.id, editedProfile, currentTenant);
      setSelectedProfile(editedProfile);
      setIsEditingProfile(false);
      fetchEmployees();
    } catch (error) {
      console.error("Error updating employee:", error);
    }
  };

  const handleToggleActive = async () => {
    if (!selectedProfile) return;
    const isDeactivating = selectedProfile.status !== 'Inactive';
    const actionText = isDeactivating ? 'deactivate' : 'reactivate';
    const confirm = window.confirm(`Are you sure you want to ${actionText} ${selectedProfile.name}?`);
    
    if (confirm) {
      try {
        if (isDeactivating) {
          await deactivateEmployee(selectedProfile.id, currentTenant);
        } else {
          await activateEmployee(selectedProfile.id, currentTenant);
        }
        setSelectedProfile(null);
        fetchEmployees();
      } catch (error) {
        console.error(`Error ${actionText}ing employee:`, error);
      }
    }
  };

  const openProfile = (emp) => {
    setSelectedProfile(emp);
    setEditedProfile(emp);
    setIsEditingProfile(false);
  };

  const downloadPayslipPDF = (ps) => {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text(tenantConfig?.companyName || 'Recloud Enterprise', 14, 20);
      
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text('Statement of Account / Payslip', 14, 28);

      if (tenantConfig?.address) {
        doc.setFontSize(8);
        const addressLines = doc.splitTextToSize(tenantConfig.address, 80);
        doc.text(addressLines, 14, 34);
      }
      
      // Document Date
      let issueDate = new Date().toLocaleDateString();
      if (ps.createdAt && ps.createdAt.seconds) {
        issueDate = new Date(ps.createdAt.seconds * 1000).toLocaleDateString();
      } else if (typeof ps.createdAt === 'string') {
        issueDate = new Date(ps.createdAt).toLocaleDateString();
      }

      // Employee Details
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text(`Employee: ${ps.employeeName}`, 14, 48);
      doc.text(`Period: ${ps.period}`, 14, 55);
      doc.text(`Issue Date: ${issueDate}`, 14, 62);
      
      const currency = ps.currency || '$';
      const getPdfCurrency = (sym) => {
        if (sym === '₦') return 'NGN ';
        if (sym === '£') return 'GBP ';
        if (sym === '€') return 'EUR ';
        if (sym === '₹') return 'INR ';
        return sym || '$';
      };
      const pdfCurrency = getPdfCurrency(currency);
      const baseAmt = ps.baseAmount !== undefined ? ps.baseAmount : (ps.grossAmount || 0);
      const taxAmt = ps.taxAmount !== undefined ? ps.taxAmount : ((ps.grossAmount || 0) - (ps.netAmount || 0));
      const taxRate = ps.taxRate !== undefined ? ps.taxRate : 20;
      
      let currentY = 75;

      // --- ADDITIONS TABLE ---
      doc.setFontSize(14);
      doc.setTextColor(22, 163, 74); // green-600
      doc.text('Additions (Earnings)', 14, currentY);
      
      const additionsData = [];
      additionsData.push(['Base Salary', `${pdfCurrency}${Number(baseAmt).toLocaleString(undefined, {minimumFractionDigits: 2})}`]);
      
      let totalAdditions = Number(baseAmt);

      if (ps.lineItems && ps.lineItems.length > 0) {
        ps.lineItems.filter(item => item.type === 'Earning').forEach(item => {
          totalAdditions += Number(item.amount);
          additionsData.push([item.description, `${pdfCurrency}${Number(item.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}`]);
        });
      }
      
      additionsData.push(['Total Additions', `${pdfCurrency}${totalAdditions.toLocaleString(undefined, {minimumFractionDigits: 2})}`]);

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Description', 'Amount']],
        body: additionsData,
        theme: 'striped',
        headStyles: { fillColor: [22, 163, 74] }, // green header
        styles: { font: 'helvetica', fontSize: 10 },
        columnStyles: { 1: { halign: 'right' } }
      });

      currentY = doc.lastAutoTable.finalY + 15;

      // --- DEDUCTIONS TABLE ---
      doc.setFontSize(14);
      doc.setTextColor(220, 38, 38); // red-600
      doc.text('Deductions', 14, currentY);
      
      const deductionsData = [];
      let totalDeductions = Number(taxAmt);
      
      if (ps.lineItems && ps.lineItems.length > 0) {
        ps.lineItems.filter(item => item.type === 'Deduction').forEach(item => {
          totalDeductions += Number(item.amount);
          deductionsData.push([item.description, `${pdfCurrency}${Number(item.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}`]);
        });
      }
      deductionsData.push([`Income Tax (${taxRate}%)`, `${pdfCurrency}${Number(taxAmt).toLocaleString(undefined, {minimumFractionDigits: 2})}`]);
      deductionsData.push(['Total Deductions', `${pdfCurrency}${totalDeductions.toLocaleString(undefined, {minimumFractionDigits: 2})}`]);

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Description', 'Amount']],
        body: deductionsData,
        theme: 'striped',
        headStyles: { fillColor: [220, 38, 38] }, // red header
        styles: { font: 'helvetica', fontSize: 10 },
        columnStyles: { 1: { halign: 'right' } }
      });

      currentY = doc.lastAutoTable.finalY + 15;
      
      // Totals
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`Net Pay / Final Amount: ${pdfCurrency}${Number(ps.netAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`, 14, currentY);
      
      doc.save(`Statement_of_Account_${ps.employeeName}_${ps.period}.pdf`);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      alert("There was an error generating the PDF. Please try generating a new payslip first.");
    }
  };

  const handleAddLeave = async (e) => {
    e.preventDefault();
    let finalLeave = { ...newLeave };
    
    // Auto-fill employee details if a staff member is requesting for themselves
    if (currentUser.role === 'staff') {
      finalLeave.employeeId = currentUser.id;
      finalLeave.employeeName = currentUser.name;
    }

    if (!finalLeave.employeeId || !finalLeave.startDate || !finalLeave.endDate) return;
    try {
      await submitLeaveRequest(finalLeave, currentTenant);
      setIsLeaveModalOpen(false);
      setNewLeave({ employeeId: '', employeeName: '', type: 'Vacation', startDate: '', endDate: '', reason: '' });
      fetchLeaves();
      if (currentUser.role === 'staff') {
        alert("Leave Request Submitted! Your manager has been notified.");
      }
    } catch (error) {
      console.error("Error submitting leave:", error);
    }
  };

  const handleStaffClock = async (action) => {
    if (!currentUser.id) return;
    try {
      if (action === 'Clock In') {
        await clockIn(currentUser.id, currentTenant);
        setCurrentUser({...currentUser, status: 'Clocked In'});
      } else {
        await clockOut(currentUser.id, currentTenant);
        setCurrentUser({...currentUser, status: 'Clocked Out'});
      }
      fetchEmployees();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLeaves = async () => {
    try {
      const data = await getLeaveRequests(currentTenant);
      setLeaves(data);
    } catch (error) {
      console.error("Error fetching leaves:", error);
    }
  };

  const handleUpdateLeave = async (id, status) => {
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    try {
      await updateLeaveStatus(id, status, currentTenant);
      fetchLeaves();
    } catch (error) {
      console.error("Error updating leave:", error);
      fetchLeaves();
    }
  };

  const handleShiftClick = async (emp, dayStr) => {
    const existing = shifts.find(s => s.employeeId === emp.id && s.date === dayStr);
    let nextShiftType = null;
    if (existing) {
      if (existing.shiftType === 'Morning') nextShiftType = 'Afternoon';
      else if (existing.shiftType === 'Afternoon') nextShiftType = 'Night';
    } else {
      nextShiftType = 'Morning';
    }

    let optimShifts = [...shifts];
    if (existing) optimShifts = optimShifts.filter(s => s.id !== existing.id);
    if (nextShiftType) optimShifts.push({ id: 'temp_' + Date.now(), employeeId: emp.id, date: dayStr, shiftType: nextShiftType });
    setShifts(optimShifts);

    try {
      if (existing) {
        await removeShift(existing.id, currentTenant);
        if (nextShiftType) await assignShift({ employeeId: emp.id, date: dayStr, shiftType: nextShiftType }, currentTenant);
      } else {
        await assignShift({ employeeId: emp.id, date: dayStr, shiftType: 'Morning' }, currentTenant);
      }
      fetchShifts();
    } catch (error) {
      console.error("Error toggling shift:", error);
      fetchShifts();
    }
  };

  const [authMessage, setAuthMessage] = useState({ type: '', text: '' });
  const [error, setError] = useState('');

  const loadWorkspace = async (workspaceId, userUid) => {
    try {
      const empRef = doc(db, `organizations/${workspaceId}/employees`, userUid);
      const empSnap = await getDoc(empRef);

      if (empSnap.exists()) {
        const empData = empSnap.data();
        if (empData.status !== 'Inactive') {
          setCurrentTenant(workspaceId);
          setCurrentUser({ id: empSnap.id, ...empData });
        } else {
          await logoutUser();
          setError('Your account is inactive. Please contact your administrator.');
        }
      } else {
        // Auto-cleanup ghost workspace
        await removeUserWorkspace(userUid, workspaceId);
        await logoutUser();
        setShowWorkspaceSelect(false);
        setAvailableWorkspaces([]);
        setTempAuthUser(null);
        setError('No employee record found for this account in the selected workspace. Invalid workspace removed.');
      }
    } catch (err) {
      console.error("Error loading workspace:", err);
      setError('Error connecting to workspace.');
    }
  };

  const processUserWorkspaces = async (user) => {
    const rawWorkspaces = await getUserWorkspaces(user.uid);
    
    // Auto-verify workspaces to prevent ghosts from showing up
    const verifiedWorkspaces = [];
    for (const ws of rawWorkspaces) {
      try {
        const empRef = doc(db, `organizations/${ws.id}/employees`, user.uid);
        const empSnap = await getDoc(empRef);
        if (empSnap.exists()) {
          verifiedWorkspaces.push(ws);
        } else {
          // If the employee doc doesn't exist, this is a ghost workspace. Remove it.
          await removeUserWorkspace(user.uid, ws.id);
        }
      } catch (err) {
        console.error('Error verifying workspace:', err);
      }
    }

    if (verifiedWorkspaces.length === 0) {
      setPublicView('register');
      setRegEmail(user.email || '');
      setAuthMessage({ type: 'error', text: 'You need to register a workspace first to continue.' });
    } else if (verifiedWorkspaces.length === 1) {
      await loadWorkspace(verifiedWorkspaces[0].id, user.uid);
    } else {
      // Multiple valid workspaces, show selection UI
      setAvailableWorkspaces(verifiedWorkspaces);
      setTempAuthUser(user);
      setShowWorkspaceSelect(true);
    }
  };

  const handleWorkspaceSelect = async (workspaceId) => {
    setError('');
    setIsLoading(true);
    if (tempAuthUser) {
      await loadWorkspace(workspaceId, tempAuthUser.uid);
    }
    setIsLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!loginEmail || !loginPassword) {
        throw new Error("Email and password are required");
      }
      const user = await loginUser(loginEmail, loginPassword);
      await processUserWorkspaces(user);
    } catch (err) {
      console.error("Login error:", err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else {
        setError(err.message || 'An error occurred during login.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      const user = await loginWithGoogle();
      await processUserWorkspaces(user);
    } catch (err) {
      console.error("Google Login error:", err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'An error occurred during Google login.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!loginEmail) {
      setError('Please enter your email address first to reset your password.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await resetUserPassword(loginEmail);
      setError('Password reset email sent! Check your inbox.');
    } catch (err) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthMessage({ type: '', text: '' });
    
    // Only require password if they aren't already authenticated for this email
    const isAlreadyAuthenticated = auth.currentUser != null && auth.currentUser.email === regEmail;
    
    if (!regCompany || !regWorkspace || !regEmail) return;
    if (!isAlreadyAuthenticated && !regPassword) return;

    setIsLoading(true);
    
    // Validate Email
    const emailValidation = await validateEmailRealtime(regEmail);
    if (!emailValidation.isValid) {
      setAuthMessage({ type: 'error', text: emailValidation.message });
      setIsLoading(false);
      return;
    }

    try {
      const slug = regWorkspace.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!slug) {
        throw new Error("Invalid Workspace ID. Please use alphanumeric characters.");
      }
      await registerTenant(regCompany, slug, regEmail, regPassword, '', '', '', regIndustry);
      
      setLoginWorkspace(slug);
      setLoginEmail(regEmail);
      
      // Clear forms
      setRegCompany('');
      setRegWorkspace('');
      setRegEmail('');
      setRegPassword('');
      setRegIndustry('retail');
      
      setAuthMessage({ type: 'success', text: `Successfully registered workspace: ${slug}!` });
      setPublicView('login');
    } catch (err) {
      setAuthMessage({ type: 'error', text: err.message || 'Error registering tenant.' });
      console.error("Registration Error: ", err);
    }
    setIsLoading(false);
  };

  if (!currentUser) {
    if (publicView === 'landing') {
      return (
        <div className="min-h-screen bg-slate-50 font-sans flex flex-col h-screen overflow-y-auto">
          {/* Header */}
          <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-tr from-recloud-600 to-recloud-400 p-2 rounded-xl shadow-lg shadow-recloud-500/30">
                  <Building2 className="text-white w-5 h-5"/>
                </div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">Recloud ERP</h1>
              </div>
              <div className="flex gap-4 items-center">
                <button onClick={() => setPublicView('login')} className="text-sm font-bold text-slate-600 hover:text-recloud-600 transition-colors">Sign In</button>
              </div>
            </div>
          </div>

          {/* Hero */}
          <div className="flex-1 flex flex-col lg:flex-row items-center max-w-6xl mx-auto px-6 py-12 gap-12">
            <div className="flex-1 space-y-6">
              <h1 className="text-5xl md:text-6xl font-bold text-slate-800 tracking-tight leading-tight">
                The Operating System for <span className="text-transparent bg-clip-text bg-gradient-to-r from-recloud-600 to-blue-500">Modern Teams</span>.
              </h1>
              <p className="text-xl text-slate-500 leading-relaxed max-w-lg">
                Manage HR, Shifts, Payroll, and Recruitment in one unified workspace. Start your free organization today.
              </p>
              <div className="pt-4 flex gap-4">
                <button onClick={() => {
                  document.getElementById('register-form').scrollIntoView({ behavior: 'smooth' });
                }} className="bg-recloud-600 hover:bg-recloud-700 text-white font-bold py-4 px-8 rounded-xl shadow-xl shadow-recloud-500/30 transition-all transform hover:scale-105 text-lg">
                  Register Your Company
                </button>
                <button onClick={() => setPublicView('careers')} className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-4 px-8 rounded-xl shadow-sm transition-all text-lg">
                  View Demo Careers
                </button>
              </div>
            </div>
            
            {/* Registration Form */}
            <div id="register-form" className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Create a Workspace</h3>
              <p className="text-slate-500 text-sm mb-6">Set up your company's isolated environment.</p>
              
              {authMessage.text && authMessage.type === 'error' && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100">
                  {authMessage.text}
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company Name</label>
                  <input required type="text" value={regCompany} onChange={e => setRegCompany(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none transition-all bg-slate-50" placeholder="Acme Corp" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Workspace ID (URL Slug)</label>
                  <div className="flex items-center">
                    <span className="bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl px-3 py-3 text-sm text-slate-500 font-mono">recloud.com/</span>
                    <input required type="text" value={regWorkspace} onChange={e => setRegWorkspace(e.target.value)} className="w-full border border-slate-200 rounded-r-xl px-4 py-3 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none transition-all bg-slate-50 font-mono text-recloud-600 font-bold" placeholder="acme" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Admin Email</label>
                  <input required type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none transition-all bg-slate-50" placeholder="admin@acme.com" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Industry / App Mode</label>
                  <select value={regIndustry} onChange={e => setRegIndustry(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none transition-all bg-slate-50">
                    <option value="retail">Retail & General</option>
                    <option value="law_firm">Law Firm & Legal Practice</option>
                  </select>
                </div>
                {(!auth.currentUser || auth.currentUser.email !== regEmail) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Admin Password</label>
                    <input required type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none transition-all bg-slate-50" placeholder="••••••••" />
                  </div>
                )}
                <button type="submit" disabled={isLoading} className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all mt-2 flex justify-center items-center gap-2">
                  {isLoading ? 'Creating Workspace...' : 'Launch Workspace'}
                </button>
              </form>
            </div>
          </div>
          
          {/* Features Section */}
          <div className="bg-white border-y border-slate-200 py-24 mt-12">
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-slate-800 tracking-tight">Everything you need to run your business</h2>
                <p className="text-slate-500 mt-4 text-xl">Now featuring a robust suite of tools tailored specifically for Law Firms & Legal Practices.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Feature 1 */}
                <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
                  <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Briefcase className="w-7 h-7" /></div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3">Advanced Case Management</h3>
                  <p className="text-slate-600 leading-relaxed font-medium">Track opposing parties, counsels, court dates, and statutes of limitations with automated deadline indicators.</p>
                </div>
                {/* Feature 2 */}
                <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Clock className="w-7 h-7" /></div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3">Time Tracking & Billing</h3>
                  <p className="text-slate-600 leading-relaxed font-medium">Log billable hours by task and rate. Automatically generate professional invoices for unbilled time with one click.</p>
                </div>
                {/* Feature 3 */}
                <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
                  <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Landmark className="w-7 h-7" /></div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3">Trust Accounting (IOLTA)</h3>
                  <p className="text-slate-600 leading-relaxed font-medium">Manage client retainers compliantly. Track trust liabilities separately and transfer earned fees to operations securely.</p>
                </div>
                {/* Feature 4 */}
                <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
                  <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><ShieldCheck className="w-7 h-7" /></div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3">Global Conflict Checker</h3>
                  <p className="text-slate-600 leading-relaxed font-medium">Maintain ethical compliance by deep-searching across all clients, cases, and opposing parties before taking a matter.</p>
                </div>
                {/* Feature 5 */}
                <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
                  <div className="w-14 h-14 bg-recloud-100 text-recloud-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Users className="w-7 h-7" /></div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3">Retail & General ERP</h3>
                  <p className="text-slate-600 leading-relaxed font-medium">Not a law firm? Manage HR, Shifts, Payroll, B2B Inventory, and general Accounting in one unified workspace.</p>
                </div>
                {/* Feature 6 */}
                <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
                  <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Lock className="w-7 h-7" /></div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3">Enterprise Security</h3>
                  <p className="text-slate-600 leading-relaxed font-medium">Tenant-isolated architecture with granular role-based access control and firestore security rules to protect your data.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (publicView === 'careers') {
      return (
        <div className="min-h-screen bg-slate-50 font-sans h-screen overflow-y-auto pb-20">
          <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
            <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setPublicView('landing')} title="Back to Landing Page">
                {tenantConfig?.logoUrl ? (
                  <img src={tenantConfig.logoUrl} alt="Logo" className="h-8 object-contain group-hover:opacity-90 transition-opacity" />
                ) : (
                  <div className="bg-recloud-600 p-2 rounded-xl group-hover:opacity-90 transition-opacity"><Building2 className="text-white w-5 h-5"/></div>
                )}
                <h1 className="text-xl font-bold text-slate-800 tracking-tight group-hover:text-recloud-600 transition-colors">{tenantConfig?.companyName || 'Recloud'} Careers</h1>
              </div>
              <button onClick={() => setPublicView('login')} className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">Employee Portal</button>
            </div>
          </div>

          <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-slate-800 tracking-tight mb-4">Join Our Team</h2>
              <p className="text-slate-500 max-w-xl mx-auto text-lg">We're looking for passionate individuals to help us build the future of enterprise software. Browse our open positions below.</p>
            </div>

            <div className="space-y-6">
              {jobs.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
                  <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-700">No Open Positions</h3>
                  <p className="text-slate-500">Check back later for new opportunities!</p>
                </div>
              ) : (
                jobs.map(job => (
                  <div key={job.id} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">{job.title}</h3>
                        <div className="flex flex-wrap gap-2">
                          <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">{job.department}</span>
                          <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><MapPin className="w-3 h-3"/> {job.location}</span>
                          <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Clock className="w-3 h-3"/> {job.type}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setNewApplicant({...newApplicant, role: job.title});
                          setActiveTab('careers'); // Helps identify public application in handleAddApplicant
                          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                        }}
                        className="bg-recloud-600 hover:bg-recloud-700 text-white font-bold py-2 px-6 rounded-xl shadow transition-colors whitespace-nowrap"
                      >
                        Apply Now
                      </button>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">{job.description}</p>
                  </div>
                ))
              )}
            </div>

            {/* Application Form */}
            {newApplicant.role && (
              <div className="mt-16 bg-white p-8 rounded-3xl shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-8">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-2xl font-bold text-slate-800">Apply for {newApplicant.role}</h3>
                  <button onClick={() => setNewApplicant({...newApplicant, role: ''})} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X className="w-5 h-5"/></button>
                </div>
                <p className="text-slate-500 text-sm mb-6">Fill out the form below and our HR team will get back to you.</p>
                
                <form onSubmit={handleAddApplicant} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                      <input required type="text" value={newApplicant.name} onChange={e => setNewApplicant({...newApplicant, name: e.target.value})} className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-recloud-500 focus:ring-2 focus:ring-recloud-500/20" placeholder="John Doe" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
                      <input required type="email" value={newApplicant.email} onChange={e => setNewApplicant({...newApplicant, email: e.target.value})} className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-recloud-500 focus:ring-2 focus:ring-recloud-500/20" placeholder="john@email.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Phone Number</label>
                      <input required type="tel" value={newApplicant.phone} onChange={e => setNewApplicant({...newApplicant, phone: e.target.value})} className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-recloud-500 focus:ring-2 focus:ring-recloud-500/20" placeholder="+1 (555) 000-0000" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">LinkedIn URL</label>
                      <input type="url" className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-recloud-500 focus:ring-2 focus:ring-recloud-500/20" placeholder="https://linkedin.com/in/johndoe" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Cover Letter (Optional)</label>
                    <textarea rows="4" className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-recloud-500 focus:ring-2 focus:ring-recloud-500/20" placeholder="Tell us why you're a great fit..."></textarea>
                  </div>
                  <button type="submit" disabled={isLoading} className="w-full bg-recloud-600 hover:bg-recloud-700 disabled:bg-slate-400 text-white font-bold py-4 rounded-xl shadow-lg transition-all text-lg mt-4">
                    {isLoading ? 'Submitting...' : 'Submit Application'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-[100dvh] w-full bg-slate-50 items-center justify-center font-sans relative overflow-y-auto py-12">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-recloud-500 rounded-full blur-[120px] opacity-20"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500 rounded-full blur-[120px] opacity-20"></div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-white/50 animate-in fade-in slide-in-from-bottom-8 duration-700 mx-4 my-auto">
          <div className="flex justify-between items-start mb-6">
            <div 
              onClick={() => setPublicView('landing')}
              className="bg-gradient-to-tr from-recloud-600 to-recloud-400 p-2.5 rounded-2xl shadow-lg shadow-recloud-500/30 cursor-pointer hover:opacity-90 transition-opacity tooltip"
              title="Back to Landing Page"
            >
              <Building2 className="text-white w-6 h-6" />
            </div>
            <button onClick={() => setPublicView('careers')} className="text-[11px] font-bold text-recloud-600 hover:text-recloud-700 bg-recloud-50 px-2.5 py-1.5 rounded-lg transition-colors">
              View Careers
            </button>
          </div>
          <div className="text-left mb-6">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Welcome to Recloud</h1>
            <p className="text-slate-500 text-xs mt-1">Sign in to your enterprise workspace</p>
          </div>

          {showWorkspaceSelect ? (
            <div className="space-y-4">
              <p className="text-slate-600 text-sm mb-4">You have access to multiple workspaces. Please select one to continue.</p>
              {availableWorkspaces.map(ws => (
                <button 
                  key={ws.id} 
                  onClick={() => handleWorkspaceSelect(ws.id)}
                  className="w-full text-left px-4 py-3 border border-slate-200 rounded-xl hover:bg-recloud-50 hover:border-recloud-200 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-slate-800">{ws.name}</div>
                    <div className="text-xs text-slate-500 font-mono">Role: {ws.role}</div>
                  </div>
                  <div className="text-recloud-600 bg-recloud-50 px-2 py-1 rounded text-xs font-bold">Select</div>
                </button>
              ))}
              <button 
                onClick={() => { setShowWorkspaceSelect(false); logoutUser(); }}
                className="w-full text-center text-sm font-semibold text-slate-500 hover:text-slate-700 mt-4 py-2"
              >
                Cancel and Log Out
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">Email Address</label>
                <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none transition-all bg-white/50" placeholder="name@company.com" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[13px] font-semibold text-slate-700">Password</label>
                  <button type="button" onClick={handleForgotPassword} className="text-xs text-recloud-600 hover:text-recloud-700 font-semibold transition-colors">Forgot Password?</button>
                </div>
                <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none transition-all bg-white/50" placeholder="••••••••" />
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-recloud-600 hover:bg-recloud-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-recloud-500/30 transition-all transform hover:scale-[1.02] mt-2">
                {isLoading ? 'Logging in...' : 'Sign In'}
              </button>
              {error && <div className="text-red-500 text-sm mt-2 text-center">{error}</div>}
              
              <div className="relative mt-4 mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-500">Or continue with</span>
                </div>
              </div>

              <button 
                type="button"
                onClick={handleGoogleLogin} 
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl shadow-sm transition-all transform hover:scale-[1.02] mt-2"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                Sign in with Google
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Global Search Filtering
  const filterBySearch = (item, fields) => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return fields.some(field => item[field]?.toString().toLowerCase().includes(lowerQuery));
  };

  const visibleEmployees = employees.filter(e => {
    // 1. Hide admins/super_admins from non-admins
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin' && (e.role === 'admin' || e.role === 'super_admin')) {
      return false;
    }
    // 2. Hide clients and B2B customers from the employee directory
    if (e.role === 'client' || e.role === 'b2b_customer' || e.role === 'deactivated_client') {
      return false;
    }
    // 3. If user is assigned to a specific branch, only show employees in that branch
    if (currentUser?.warehouseId && e.warehouseId !== currentUser.warehouseId) {
      return false;
    }
    // 4. Apply search filter
    return filterBySearch(e, ['name', 'department', 'role', 'email']);
  });
  const visibleLeaves = leaves.filter(l => filterBySearch(l, ['employeeName', 'type', 'status']));
  const visibleShifts = shifts; // Shifts could be filtered if needed
  const notifications = currentUser ? getNotifications() : [];

  return (
    <div className="flex h-[100dvh] w-full bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-hidden font-sans relative">
      {/* Background ambient orbs */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-purple-200/40 rounded-full blur-[120px] pointer-events-none -z-10 mix-blend-multiply"></div>
      <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-blue-200/40 rounded-full blur-[120px] pointer-events-none -z-10 mix-blend-multiply"></div>
      
      {/* SIDEBAR (Ultra Premium Glassmorphism) */}
      {activeTab !== 'launcher' && activeTab !== 'client_portal' && (
      <>
        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
        <aside className={`fixed md:relative top-0 left-0 h-full w-72 md:w-64 bg-slate-800 transform text-slate-300 flex flex-col justify-between shadow-2xl z-[60] md:z-10 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-recloud-600 rounded-full blur-[100px] opacity-20"></div>
        </div>

        <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
          <div 
            onClick={() => {
              const role = currentUser.role?.toLowerCase() || '';
              if (['admin', 'hr_manager', 'sales_manager', 'inventory_manager', 'accountant'].includes(role)) setActiveTab('launcher');
              else if (role === 'staff') setActiveTab('ess');
              else if (['distributor', 'sales_rep', 'b2b_customer'].includes(role)) setActiveTab('b2b');
              else setActiveTab('pos');
            }}
            className="p-6 flex items-center gap-3 border-b border-slate-700/50 mb-6 cursor-pointer hover:bg-slate-800/30 transition-colors"
          >
            <div className="bg-gradient-to-tr from-recloud-600 to-recloud-400 p-2 rounded-xl shadow-lg shadow-recloud-500/30">
              <Building2 className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl tracking-tight leading-none">Recloud</h1>
              <p className="text-[10px] text-recloud-300 uppercase tracking-widest font-semibold mt-1">ERP Platform</p>
            </div>
          </div>

          <div className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Modules</div>
          <nav className="px-3 space-y-1">
            <button onClick={() => { setIsMobileMenuOpen(false); setActiveTab('launcher'); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-white bg-white/10 hover:bg-white/20 transition-all duration-200 mb-2 border border-white/5">
              <div className="w-5 h-5 flex flex-wrap gap-0.5 items-center justify-center">
                <div className="w-2 h-2 bg-purple-400 rounded-sm"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-sm"></div>
                <div className="w-2 h-2 bg-emerald-400 rounded-sm"></div>
                <div className="w-2 h-2 bg-pink-400 rounded-sm"></div>
              </div>
              App Launcher
            </button>
            {['admin', 'hr_manager', 'sales_manager', 'inventory_manager', 'accountant'].includes(currentUser.role) && (
              <button onClick={() => { setIsMobileMenuOpen(false); setActiveTab('analytics'); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'analytics' ? 'bg-recloud-500/20 text-recloud-300 shadow-inner' : 'hover:bg-slate-800/50 hover:text-white'}`}>
                <LayoutDashboard className="w-5 h-5" /> Executive Dashboard
              </button>
            )}
            
            {['admin', 'hr_manager'].includes(currentUser.role) && (
              <button onClick={() => { setIsMobileMenuOpen(false); setActiveTab('hr'); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'hr' ? 'bg-recloud-500/20 text-recloud-300 shadow-inner border border-recloud-500/20' : 'hover:bg-slate-800/50 hover:text-white'}`}>
                <Users className="w-5 h-5" /> Human Resources
              </button>
            )}

            {['admin', 'sales_manager'].includes(currentUser.role) && isModuleEnabled('crm') && (
              <button onClick={() => { setIsMobileMenuOpen(false); setActiveTab('crm'); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'crm' ? 'bg-recloud-500/20 text-recloud-300 shadow-inner' : 'hover:bg-slate-800/50 hover:text-white'}`}>
                <Building2 className="w-5 h-5" /> {currentIndustry === 'law_firm' ? 'Client Intake & CRM' : 'CRM & Sales'}
              </button>
            )}

            {['admin', 'inventory_manager'].includes(currentUser.role) && isModuleEnabled('inventory') && (
              <button onClick={() => { setIsMobileMenuOpen(false); setActiveTab('inventory'); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'inventory' ? 'bg-recloud-500/20 text-recloud-300 shadow-inner' : 'hover:bg-slate-800/50 hover:text-white'}`}>
                <Package className="w-5 h-5" /> Inventory
              </button>
            )}

            {['admin', 'sales_manager', 'cashier', 'sales_rep'].includes(currentUser.role) && isModuleEnabled('pos') && (
              <button onClick={() => { setIsMobileMenuOpen(false); setActiveTab('pos'); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'pos' ? 'bg-recloud-500/20 text-recloud-300 shadow-inner' : 'hover:bg-slate-800/50 hover:text-white'}`}>
                <Banknote className="w-5 h-5" /> Point of Sale
              </button>
            )}

            {['admin', 'accountant'].includes(currentUser.role) && (
              <>
                <button onClick={() => { setIsMobileMenuOpen(false); setActiveTab('accounting'); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'accounting' ? 'bg-recloud-500/20 text-recloud-300 shadow-inner' : 'hover:bg-slate-800/50 hover:text-white'}`}>
                  <Receipt className="w-5 h-5" /> Accounting & Tax
                </button>
                <button onClick={() => { setIsMobileMenuOpen(false); setActiveTab('analytics'); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'analytics' ? 'bg-recloud-500/20 text-recloud-300 shadow-inner' : 'hover:bg-slate-800/50 hover:text-white'}`}>
                  <PieChart className="w-5 h-5" /> Analytics & Reports
                </button>
              </>
            )}

            {['admin', 'hr_manager', 'sales_manager', 'inventory_manager', 'accountant', 'staff'].includes(currentUser.role) && (
              <>
                <button onClick={() => { setIsMobileMenuOpen(false); setActiveTab('documents'); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'documents' ? 'bg-recloud-500/20 text-recloud-300 shadow-inner' : 'hover:bg-slate-800/50 hover:text-white'}`}>
                  <FolderOpen className="w-5 h-5" /> Documents
                </button>
                <button onClick={() => { setIsMobileMenuOpen(false); setActiveTab('projects'); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'projects' ? 'bg-recloud-500/20 text-recloud-300 shadow-inner' : 'hover:bg-slate-800/50 hover:text-white'}`}>
                  <Kanban className="w-5 h-5" /> {currentIndustry === 'law_firm' ? 'Cases & Matters' : 'Projects'}
                </button>
                <button onClick={() => { setIsMobileMenuOpen(false); setActiveTab('discuss'); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'discuss' ? 'bg-recloud-500/20 text-recloud-300 shadow-inner' : 'hover:bg-slate-800/50 hover:text-white'}`}>
                  <MessageCircle className="w-5 h-5" /> Discuss
                </button>
              </>
            )}

            {['admin', 'super_admin'].includes(currentUser.role) && (
              <>
                {['admin', 'super_admin'].includes(currentUser?.role) && (
                  <>
                    <button onClick={() => { setIsMobileMenuOpen(false); setActiveTab('history'); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'history' ? 'bg-recloud-500/20 text-recloud-300 shadow-inner' : 'hover:bg-slate-800/50 hover:text-white'}`}>
                      <History className={`w-5 h-5 ${activeTab === 'history' ? 'text-recloud-400' : 'text-slate-400'}`} /> Recycle Bin
                    </button>
                    <button onClick={() => { setIsMobileMenuOpen(false); setActiveTab('api'); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'api' ? 'bg-recloud-500/20 text-recloud-300 shadow-inner' : 'hover:bg-slate-800/50 hover:text-white'}`}>
                      <Settings className={`w-5 h-5 ${activeTab === 'api' ? 'text-recloud-400' : 'text-slate-400'}`} /> API Settings
                    </button>
                    <button onClick={() => { setIsMobileMenuOpen(false); setActiveTab('backend'); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'backend' ? 'bg-recloud-500/20 text-recloud-300 shadow-inner' : 'hover:bg-slate-800/50 hover:text-white'}`}>
                      <Database className={`w-5 h-5 ${activeTab === 'backend' ? 'text-recloud-400' : 'text-slate-400'}`} /> Backend Manager
                    </button>
                    <button onClick={() => { setIsMobileMenuOpen(false); setActiveTab('webhooks'); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'webhooks' ? 'bg-recloud-500/20 text-recloud-300 shadow-inner' : 'hover:bg-slate-800/50 hover:text-white'}`}>
                      <Webhook className={`w-5 h-5 ${activeTab === 'webhooks' ? 'text-recloud-400' : 'text-slate-400'}`} /> Webhooks
                    </button>
                  </>
                )}
                <button onClick={() => { setIsMobileMenuOpen(false); setActiveTab('ai'); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'ai' ? 'bg-recloud-500/20 text-recloud-300 shadow-inner' : 'hover:bg-slate-800/50 hover:text-white'}`}>
                  <Sparkles className="w-5 h-5 text-purple-400" /> AI Assistant
                </button>
              </>
            )}

            {currentUser.role === 'staff' && (
              <button onClick={() => { setIsMobileMenuOpen(false); setActiveTab('ess'); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'ess' ? 'bg-recloud-500/20 text-recloud-300 shadow-inner border border-recloud-500/20' : 'hover:bg-slate-800/50 hover:text-white'}`}>
                <Users className="w-5 h-5" /> Employee Portal
              </button>
              )}

            {['distributor', 'sales_rep', 'b2b_customer'].includes(currentUser.role) && isModuleEnabled('b2b') && (
              <button onClick={() => { setIsMobileMenuOpen(false); setActiveTab('b2b'); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'b2b' ? 'bg-recloud-500/20 text-recloud-300 shadow-inner border border-recloud-500/20' : 'hover:bg-slate-800/50 hover:text-white'}`}>
                <Package className="w-5 h-5" /> B2B Order Portal
              </button>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-700/50">
          {['admin', 'super_admin'].includes(currentUser.role) && (
            <button onClick={() => { setActiveTab('hr'); setHrTab('settings'); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800/50 hover:text-white transition-all">
              <Settings className="w-5 h-5" /> Settings
            </button>
          )}
          <div className="mt-4 flex items-center gap-3 px-3">
            <div className="w-8 h-8 rounded-full bg-recloud-500 flex items-center justify-center text-white font-bold text-xs shadow-md">A1</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{tenantConfig?.companyName || 'Adamz Pharmacy'}</p>
              {currentUser.warehouseId ? (() => {
                const sb = warehouses.find(w => w.id === currentUser.warehouseId);
                return sb ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                    <p className="text-xs text-emerald-400 truncate font-semibold">{sb.name}</p>
                  </div>
                ) : <p className="text-xs text-slate-400 truncate">Tenant #1</p>;
              })() : (
                <p className="text-xs text-slate-400 truncate">Global Access</p>
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </div>
        </div>
      </aside>
      </>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-transparent relative">

        {activeTab !== 'launcher' && (
        <header className="h-16 shrink-0 glass flex items-center justify-between px-4 md:px-8 z-10 gap-2 md:gap-4">
          <div className="flex items-center gap-2 md:gap-4 flex-1 md:flex-none md:w-[500px] relative">
            <button 
              className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 focus:outline-none rounded-lg hover:bg-slate-100"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-4 w-full md:w-96 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={`Search ${activeTab.toUpperCase()}...`} className="w-full bg-white/50 border border-slate-200 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 transition-all shadow-sm"/>
            </div>
            {currentUser.role === 'staff' ? (
              <span className="hidden md:inline-block bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-full tracking-widest uppercase shadow-sm">Employee Portal</span>
            ) : (
              <span className="hidden md:inline-block bg-recloud-100 text-recloud-700 text-[10px] font-bold px-3 py-1.5 rounded-full tracking-widest uppercase shadow-sm border border-recloud-200">Management Portal</span>
            )}
            {currentUser.warehouseId && (() => {
              const userBranch = warehouses.find(w => w.id === currentUser.warehouseId);
              return userBranch ? (
                <span className="hidden md:flex bg-emerald-100 text-emerald-700 text-[10px] font-bold px-3 py-1.5 rounded-full tracking-widest uppercase shadow-sm border border-emerald-200 items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  {userBranch.name}
                </span>
              ) : null;
            })()}
          </div>
          <div className="flex items-center gap-2 md:gap-4 relative">
            <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 text-slate-400 hover:text-recloud-600 transition-colors focus:outline-none">
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-50"></span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute top-12 right-48 w-80 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4">
                <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-800">Notifications</h4>
                  <span className="text-xs bg-recloud-100 text-recloud-700 font-bold px-2 py-0.5 rounded-full">{notifications.length} New</span>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-sm">No new notifications.</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} onClick={() => handleNotificationClick(n)} className="p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer">
                        <p className="text-sm text-slate-700 font-medium leading-tight">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{new Date(n.date).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
            <div className="flex items-center gap-1.5 md:gap-3 group">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-bold text-slate-700 leading-none">{currentUser.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-recloud-600 uppercase tracking-wider">{currentUser.role}</span>
                  {currentUser.warehouseId && (() => {
                    const ub = warehouses.find(w => w.id === currentUser.warehouseId);
                    return ub ? <span className="text-[10px] font-semibold text-emerald-600">· {ub.name}</span> : null;
                  })()}
                </div>
              </div>
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-recloud-100 flex items-center justify-center text-recloud-700 font-bold text-[10px] md:text-xs shadow-sm ring-2 ring-transparent group-hover:ring-recloud-500 transition-all cursor-pointer">
                {currentUser.initials}
              </div>
              <button onClick={() => { setCurrentUser(null); setLoginEmail(''); setLoginPassword(''); localStorage.removeItem('activeShift'); }} className="text-[10px] md:text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors px-1.5 md:px-2 py-1 rounded hover:bg-red-50">Logout</button>
            </div>
          </div>
        </header>
        )}

        <div className="flex-1 flex flex-col overflow-y-auto p-3 pb-24 md:p-8 md:pb-8 relative">
          
          {activeTab === 'launcher' && (
            <div className="w-full h-full min-h-[80vh] flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
              <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-purple-300 rounded-full blur-[150px] opacity-20 pointer-events-none mix-blend-multiply"></div>
              <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-300 rounded-full blur-[150px] opacity-20 pointer-events-none mix-blend-multiply"></div>
              
              <div className="text-center mb-8 md:mb-16 z-10 px-4">
                <h1 className="text-2xl md:text-5xl font-black text-slate-800 tracking-tight mb-2 md:mb-4 drop-shadow-sm">
                  Good afternoon, <span className="text-transparent bg-clip-text bg-gradient-to-r from-recloud-600 to-purple-600">{currentUser.name.split(' ')[0]}</span>
                </h1>
                <p className="text-sm md:text-lg text-slate-500 font-medium">What would you like to focus on today?</p>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-8 max-w-6xl w-full z-10 px-2 md:px-8">
                
                {['admin', 'hr_manager', 'sales_manager', 'inventory_manager', 'accountant'].includes(currentUser.role) && (
                  <div onClick={() => setActiveTab('analytics')} className="group flex flex-col items-center gap-2 md:gap-4 cursor-pointer">
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] bg-white/70 backdrop-blur-xl shadow-xl shadow-indigo-900/5 flex items-center justify-center border border-white/50 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-indigo-900/10 transition-all duration-300 group-hover:scale-105">
                      <LayoutDashboard className="w-7 h-7 md:w-10 md:h-10 text-indigo-500" />
                    </div>
                    <span className="font-bold text-xs md:text-base text-slate-700 group-hover:text-indigo-600 transition-colors text-center leading-tight">Dashboard</span>
                  </div>
                )}

                {['admin', 'sales_manager'].includes(currentUser.role) && isModuleEnabled('crm') && (
                  <div onClick={() => setActiveTab('crm')} className="group flex flex-col items-center gap-2 md:gap-4 cursor-pointer">
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] bg-white/70 backdrop-blur-xl shadow-xl shadow-pink-900/5 flex items-center justify-center border border-white/50 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-pink-900/10 transition-all duration-300 group-hover:scale-105">
                      <Building2 className="w-7 h-7 md:w-10 md:h-10 text-pink-500" />
                    </div>
                    <span className="font-bold text-xs md:text-base text-slate-700 group-hover:text-pink-600 transition-colors text-center leading-tight">
                      {currentIndustry === 'law_firm' ? 'Client Intake' : 'CRM'}
                    </span>
                  </div>
                )}

                {['admin', 'inventory_manager'].includes(currentUser.role) && isModuleEnabled('inventory') && (
                  <div onClick={() => setActiveTab('inventory')} className="group flex flex-col items-center gap-2 md:gap-4 cursor-pointer">
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] bg-white/70 backdrop-blur-xl shadow-xl shadow-orange-900/5 flex items-center justify-center border border-white/50 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-orange-900/10 transition-all duration-300 group-hover:scale-105">
                      <Package className="w-7 h-7 md:w-10 md:h-10 text-orange-500" />
                    </div>
                    <span className="font-bold text-xs md:text-base text-slate-700 group-hover:text-orange-600 transition-colors text-center leading-tight">Inventory</span>
                  </div>
                )}

                {['admin', 'sales_manager', 'cashier', 'sales_rep'].includes(currentUser.role) && isModuleEnabled('pos') && (
                  <div onClick={() => setActiveTab('pos')} className="group flex flex-col items-center gap-2 md:gap-4 cursor-pointer">
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] bg-white/70 backdrop-blur-xl shadow-xl shadow-emerald-900/5 flex items-center justify-center border border-white/50 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-emerald-900/10 transition-all duration-300 group-hover:scale-105">
                      <Banknote className="w-7 h-7 md:w-10 md:h-10 text-emerald-500" />
                    </div>
                    <span className="font-bold text-xs md:text-base text-slate-700 group-hover:text-emerald-600 transition-colors text-center leading-tight">POS</span>
                  </div>
                )}

                {['admin', 'accountant'].includes(currentUser.role) && (
                  <div onClick={() => setActiveTab('accounting')} className="group flex flex-col items-center gap-2 md:gap-4 cursor-pointer">
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] bg-white/70 backdrop-blur-xl shadow-xl shadow-blue-900/5 flex items-center justify-center border border-white/50 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-blue-900/10 transition-all duration-300 group-hover:scale-105">
                      <Receipt className="w-7 h-7 md:w-10 md:h-10 text-blue-500" />
                    </div>
                    <span className="font-bold text-xs md:text-base text-slate-700 group-hover:text-blue-600 transition-colors text-center leading-tight">Accounting</span>
                  </div>
                )}

                {['admin', 'hr_manager'].includes(currentUser.role) && (
                  <div onClick={() => setActiveTab('hr')} className="group flex flex-col items-center gap-2 md:gap-4 cursor-pointer">
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] bg-white/70 backdrop-blur-xl shadow-xl shadow-purple-900/5 flex items-center justify-center border border-white/50 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-purple-900/10 transition-all duration-300 group-hover:scale-105">
                      <Users className="w-7 h-7 md:w-10 md:h-10 text-purple-500" />
                    </div>
                    <span className="font-bold text-xs md:text-base text-slate-700 group-hover:text-purple-600 transition-colors text-center leading-tight">HR</span>
                  </div>
                )}

                {/* NEW MODULE SCAFFOLDS */}
                <div onClick={() => setActiveTab('discuss')} className="group flex flex-col items-center gap-2 md:gap-4 cursor-pointer">
                  <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] bg-white/70 backdrop-blur-xl shadow-xl shadow-sky-900/5 flex items-center justify-center border border-white/50 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-sky-900/10 transition-all duration-300 group-hover:scale-105 relative">
                    <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white"></div>
                    <MessageCircle className="w-7 h-7 md:w-10 md:h-10 text-sky-500" />
                  </div>
                  <span className="font-bold text-xs md:text-base text-slate-700 group-hover:text-sky-600 transition-colors text-center leading-tight">Discuss</span>
                </div>

                <div onClick={() => setActiveTab('documents')} className="group flex flex-col items-center gap-2 md:gap-4 cursor-pointer">
                  <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] bg-white/70 backdrop-blur-xl shadow-xl shadow-amber-900/5 flex items-center justify-center border border-white/50 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-amber-900/10 transition-all duration-300 group-hover:scale-105">
                    <FolderOpen className="w-7 h-7 md:w-10 md:h-10 text-amber-500" />
                  </div>
                  <span className="font-bold text-xs md:text-base text-slate-700 group-hover:text-amber-600 transition-colors text-center leading-tight">Documents</span>
                </div>

                <div onClick={() => setActiveTab('projects')} className="group flex flex-col items-center gap-2 md:gap-4 cursor-pointer">
                  <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] bg-white/70 backdrop-blur-xl shadow-xl shadow-teal-900/5 flex items-center justify-center border border-white/50 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-teal-900/10 transition-all duration-300 group-hover:scale-105">
                    <Kanban className="w-7 h-7 md:w-10 md:h-10 text-teal-500" />
                  </div>
                  <span className="font-bold text-xs md:text-base text-slate-700 group-hover:text-teal-600 transition-colors text-center leading-tight">
                    {currentIndustry === 'law_firm' ? 'Cases & Matters' : 'Projects'}
                  </span>
                </div>

                {['admin', 'super_admin'].includes(currentUser.role) && (
                  <div onClick={() => setActiveTab('ai')} className="group flex flex-col items-center gap-2 md:gap-4 cursor-pointer">
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] bg-white/70 backdrop-blur-xl shadow-xl shadow-indigo-900/5 flex items-center justify-center border border-white/50 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-indigo-900/10 transition-all duration-300 group-hover:scale-105 relative">
                      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 rounded-[2rem]"></div>
                      <Sparkles className="w-7 h-7 md:w-10 md:h-10 text-indigo-500" />
                    </div>
                    <span className="font-bold text-xs md:text-base text-slate-700 group-hover:text-indigo-600 transition-colors">AI</span>
                  </div>
                )}

              </div>
            </div>
          )}
          
          {activeTab === 'hr' && (
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
                              {emp.salary != null && emp.salary !== '' ? `$${Number(emp.salary).toLocaleString()}` : <span className="text-slate-400 italic">Not set</span>}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => {
                                  const amount = window.prompt(`Enter new annual salary for ${emp.name} (Numbers only):`, emp.salary || '');
                                  if (amount && !isNaN(amount)) {
                                    updateEmployee(emp.id, { salary: Number(amount) }, currentTenant).then(fetchEmployees);
                                  }
                                }} className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Set Salary</button>
                                
                                <button onClick={() => {
                                  if (emp.salary == null || emp.salary === '') {
                                    alert('Please set a base salary first before generating a payslip.');
                                    return;
                                  }
                                  setSelectedPayslipEmp(emp);
                                  const empPayslips = payslips.filter(p => p.employeeId === emp.id).sort((a,b) => new Date(b.createdAt?.seconds ? b.createdAt.seconds * 1000 : b.createdAt) - new Date(a.createdAt?.seconds ? a.createdAt.seconds * 1000 : a.createdAt));
                                  const lastPayslip = empPayslips.length > 0 ? empPayslips[0] : null;
                                  setPayslipCurrency(lastPayslip?.currency || '$');
                                  setPayslipPeriod(new Date().toISOString().slice(0, 7));
                                  setPayslipTaxRate(lastPayslip?.taxRate !== undefined ? lastPayslip.taxRate : 20);
                                  setPayslipLineItems(lastPayslip?.lineItems || []);
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
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Industry / App Mode</label>
                        <select value={settingsForm.industry} onChange={e => setSettingsForm({...settingsForm, industry: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none transition-all">
                          <option value="retail">Retail & General</option>
                          <option value="law_firm">Law Firm & Legal Practice</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-1">This setting adjusts the available modules and terminology to match your business.</p>
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

                  {/* Branch Locations Management */}
                  <div className="mt-8 flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Branch Locations</h3>
                      <p className="text-slate-500 text-sm mt-1">Manage physical branches and offices. This automatically syncs with Inventory warehouses.</p>
                    </div>
                  </div>
                  
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-4xl">
                    <div className="mb-6 h-[400px] w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner z-0 relative">
                      <ErrorBoundary>
                        <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                          <LocationSelector newBranch={newBranch} setNewBranch={setNewBranch} />
                          {warehouses.map(w => w.lat && w.lng ? (
                            <Marker key={w.id} position={[Number(w.lat), Number(w.lng)]}>
                              <Popup>
                                <strong>{w.name}</strong><br/>
                                <span className="text-xs text-slate-500">{w.location}</span>
                              </Popup>
                            </Marker>
                          ) : null)}
                        </MapContainer>
                      </ErrorBoundary>
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 text-xs font-semibold text-slate-600 z-[400] pointer-events-none">
                        Click anywhere on the map to place a pin
                      </div>
                    </div>
                    
                    <form onSubmit={handleAddBranch} className="space-y-4 mb-8 pb-8 border-b border-slate-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Branch Name</label>
                          <input required type="text" value={newBranch.name} onChange={e => setNewBranch({...newBranch, name: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none transition-all" placeholder="e.g. Lagos HQ" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Geo-Location / Address</label>
                          <input type="text" value={newBranch.location} onChange={e => setNewBranch({...newBranch, location: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none transition-all" placeholder="e.g. Ikeja, Lagos State" />
                        </div>
                      </div>
                      <button type="submit" disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-all flex items-center gap-2 text-sm">
                        <Plus className="w-4 h-4" /> Add Branch
                      </button>
                    </form>

                    <div className="space-y-3">
                      <h4 className="font-bold text-slate-700 mb-4 text-sm uppercase tracking-wider">Active Branches ({warehouses.length})</h4>
                      {warehouses.length === 0 ? (
                        <p className="text-slate-400 text-sm italic p-4 bg-slate-50 rounded-xl border border-slate-100">No branches added yet. Create one above.</p>
                      ) : (
                        warehouses.map(w => (
                          <div key={w.id} className="flex justify-between items-center p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                <MapPin className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">{w.name} {w.lat && <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono border border-slate-200">Map Pinned</span>}</p>
                                <p className="text-xs text-slate-500">{w.location || 'No location specified'}</p>
                              </div>
                            </div>
                            <button onClick={async () => {
                              if(window.confirm(`Are you sure you want to delete ${w.name}? This will remove the branch for all employees and inventory items.`)) {
                                setIsLoading(true);
                                await deleteWarehouse(w.id, currentTenant);
                                await fetchData(currentTenant);
                                setIsLoading(false);
                              }
                            }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2" title="Delete Branch">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {activeTab === 'ess' && (
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
                  <form onSubmit={(e) => handleUploadDocument(e, currentUser.id, 'Staff')} className="flex flex-col gap-3">
                    <div className="flex flex-col md:flex-row gap-3">
                      <input required type="text" placeholder="Document Name (e.g. Passport)" value={newDoc.name} onChange={e => setNewDoc({...newDoc, name: e.target.value})} className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500" />
                      <select value={newDoc.type} onChange={e => setNewDoc({...newDoc, type: e.target.value})} className="text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none bg-white">
                        <option>Personal ID</option>
                        <option>Certificate</option>
                        <option>Tax Form</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="flex flex-col md:flex-row gap-3 items-center">
                      <input required type="file" onChange={handleFileChange} className="w-full md:flex-1 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-recloud-50 file:text-recloud-700 hover:file:bg-recloud-100"/>
                      <button type="submit" className="w-full md:w-auto bg-recloud-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-recloud-700 transition-colors whitespace-nowrap">Upload</button>
                    </div>
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
          )}

          <React.Suspense fallback={<div className="h-full flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-200"><div className="w-12 h-12 border-4 border-recloud-600 border-t-transparent rounded-full animate-spin"></div></div>}>
            {activeTab === 'analytics' && (
              <div className="flex flex-col flex-1 bg-slate-50 p-0 overflow-hidden rounded-2xl shadow-sm border border-slate-200">
                <ReportsModule 
                  sales={sales}
                  b2bOrders={b2bOrders}
                  customers={customers}
                  products={products}
                  employees={employees}
                  invoices={invoices}
                  currentIndustry={currentIndustry}
                />
              </div>
            )}

            {activeTab === 'accounting' && (
              <div className="flex flex-col flex-1 w-full bg-slate-50 p-0 overflow-hidden rounded-2xl shadow-sm border border-slate-200">
                <ErrorBoundary><AccountingModule 
                  ledger={ledger} expenses={expenses} sales={sales} b2bOrders={b2bOrders} purchaseOrders={purchaseOrders} invoices={invoices} payslips={payslips} currentTenant={currentTenant} currentUser={currentUser} currentIndustry={currentIndustry} refreshData={() => fetchData(currentTenant)}
                /></ErrorBoundary>
              </div>
            )}

            {activeTab === 'client_portal' && (
              <div className="h-screen w-full bg-slate-50 p-0 overflow-hidden">
                <ErrorBoundary><ClientPortalModule 
                  currentUser={currentUser} currentTenant={currentTenant} tenantConfig={tenantConfig} setCurrentUser={setCurrentUser}
                /></ErrorBoundary>
              </div>
            )}

            {activeTab === 'crm' && (
              <div className="flex flex-col flex-1 w-full bg-slate-50 p-0 overflow-hidden rounded-2xl shadow-sm border border-slate-200">
                <ErrorBoundary><CrmModule 
                  customers={customers} deals={deals} invoices={invoices} employees={employees} currentTenant={currentTenant} tenantConfig={tenantConfig} currentUser={currentUser} currentIndustry={currentIndustry} refreshData={() => fetchData(currentTenant)}
                /></ErrorBoundary>
              </div>
            )}

            {activeTab === 'inventory' && isModuleEnabled('inventory') && (
              <div className="flex flex-col flex-1 w-full bg-slate-50 p-0 overflow-hidden rounded-2xl shadow-sm border border-slate-200">
                <ErrorBoundary><InventoryModule 
                  products={products} stockMovements={stockMovements} warehouses={warehouses} suppliers={suppliers} purchaseOrders={purchaseOrders} branchOrders={branchOrders} employees={employees} currentUser={currentUser} currentTenant={currentTenant} b2bOrders={b2bOrders} refreshData={() => fetchData(currentTenant)}
                /></ErrorBoundary>
              </div>
            )}

            {activeTab === 'pos' && isModuleEnabled('pos') && (
              <div className="flex flex-col flex-1 w-full bg-slate-50 p-0 overflow-hidden rounded-2xl shadow-sm border border-slate-200">
                <ErrorBoundary><PosModule 
                  products={products} customers={customers} sales={sales} warehouses={warehouses} currentTenant={currentTenant} tenantConfig={tenantConfig} currentUser={currentUser} refreshData={() => fetchData(currentTenant)}
                /></ErrorBoundary>
              </div>
            )}

            {activeTab === 'b2b' && isModuleEnabled('b2b') && (
              <div className="flex flex-col flex-1 w-full bg-slate-50 p-0 overflow-hidden rounded-2xl shadow-sm border border-slate-200">
                <ErrorBoundary><B2bOrderModule 
                  currentUser={currentUser} products={products} currentTenant={currentTenant} tenantConfig={tenantConfig}
                /></ErrorBoundary>
              </div>
            )}

            {activeTab === 'discuss' && ['admin', 'hr_manager', 'sales_manager', 'inventory_manager', 'accountant', 'staff'].includes(currentUser.role) && (
              <div className="flex flex-col flex-1 w-full bg-slate-50 p-0 overflow-hidden rounded-2xl shadow-sm border border-slate-200">
                <ErrorBoundary><DiscussModule currentUser={currentUser} currentTenant={currentTenant} /></ErrorBoundary>
              </div>
            )}

            {activeTab === 'documents' && ['admin', 'hr_manager', 'sales_manager', 'inventory_manager', 'accountant', 'staff'].includes(currentUser.role) && (
              <div className="flex flex-col flex-1 w-full bg-slate-50 p-0 overflow-hidden rounded-2xl shadow-sm border border-slate-200">
                <ErrorBoundary><DocumentsModule currentUser={currentUser} currentTenant={currentTenant} /></ErrorBoundary>
              </div>
            )}

            {activeTab === 'projects' && ['admin', 'hr_manager', 'sales_manager', 'inventory_manager', 'accountant', 'staff'].includes(currentUser.role) && (
              <div className="flex flex-col flex-1 w-full bg-slate-50 p-0 overflow-hidden rounded-2xl shadow-sm border border-slate-200">
                <ErrorBoundary>
                  {currentIndustry === 'law_firm' ? (
                    <LawModule currentUser={currentUser} currentTenant={currentTenant} customers={customers} />
                  ) : (
                    <ProjectsModule currentUser={currentUser} currentTenant={currentTenant} customers={customers} currentIndustry={currentIndustry} />
                  )}
                </ErrorBoundary>
              </div>
            )}

            
            {activeTab === 'history' && currentUser?.role === 'admin' && (
              <React.Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
                <ErrorBoundary><HistoryModule currentTenant={currentTenant} /></ErrorBoundary>
              </React.Suspense>
            )}

            {activeTab === 'api' && currentUser?.role === 'admin' && (
              <React.Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
                <ErrorBoundary><ApiSettingsModule currentTenant={currentTenant} /></ErrorBoundary>
              </React.Suspense>
            )}

            {activeTab === 'backend' && ['admin', 'super_admin'].includes(currentUser?.role) && (
              <React.Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
                <ErrorBoundary><BackendModule currentTenant={currentTenant} currentUser={currentUser} /></ErrorBoundary>
              </React.Suspense>
            )}

            {activeTab === 'webhooks' && ['admin', 'super_admin'].includes(currentUser?.role) && (
              <React.Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
                <ErrorBoundary><WebhookModule currentTenant={currentTenant} /></ErrorBoundary>
              </React.Suspense>
            )}
{activeTab === 'ai' && (
              <div className="flex flex-col flex-1 w-full bg-slate-50 p-0 overflow-hidden rounded-2xl shadow-sm border border-slate-200">
                <ErrorBoundary><AiAssistantModule currentUser={currentUser} /></ErrorBoundary>
              </div>
            )}
          </React.Suspense>


          {activeTab !== 'hr' && activeTab !== 'ess' && activeTab !== 'crm' && activeTab !== 'inventory' && activeTab !== 'pos' && activeTab !== 'b2b' && activeTab !== 'analytics' && activeTab !== 'discuss' && activeTab !== 'documents' && activeTab !== 'projects' && activeTab !== 'ai' && activeTab !== 'launcher' && activeTab !== 'accounting' && activeTab !== 'history' && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 animate-in fade-in duration-500">
              <Building2 className="w-16 h-16 mb-4 opacity-20" />
              <h3 className="text-xl font-bold text-slate-600">{activeTab.toUpperCase()} Module</h3>
              <p className="mt-2 text-sm">This module is currently under construction in the Recloud ERP.</p>
            </div>
          )}
        </div>
      </main>

      {/* PAYSLIP MODAL */}
      {isPayslipModalOpen && selectedPayslipEmp && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">Generate Payslip</h3>
              <button onClick={() => setIsPayslipModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-recloud-100 text-recloud-600 rounded-full flex items-center justify-center font-bold text-xl shadow-inner border border-recloud-200">
                  {selectedPayslipEmp.name.substring(0,2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-lg">{selectedPayslipEmp.name}</h4>
                  <p className="text-slate-500 text-sm">Annual Salary: <span className="font-mono font-medium">{payslipCurrency}{Number(selectedPayslipEmp.salary).toLocaleString()}</span></p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
                  <select value={payslipCurrency} onChange={e => setPayslipCurrency(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none bg-white">
                    <option value="$">USD ($)</option>
                    <option value="₦">NGN (₦)</option>
                    <option value="£">GBP (£)</option>
                    <option value="€">EUR (€)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Period (Month/Year)</label>
                  <input type="month" value={payslipPeriod} onChange={e => setPayslipPeriod(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none bg-white" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Percentage (%)</label>
                  <input type="number" min="0" max="100" value={payslipTaxRate} onChange={e => setPayslipTaxRate(Number(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none bg-white" />
                </div>
              </div>
              
              {/* Dynamic Line Items Section */}
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-slate-700">Custom Line Items</label>
                <div className="flex gap-2">
                  <button onClick={() => {
                    const desc = window.prompt('Earning Description (e.g. Q3 Bonus):');
                    if (!desc) return;
                    const amount = window.prompt(`Amount in ${payslipCurrency}:`);
                    if (!amount || isNaN(amount)) return;
                    setPayslipLineItems([...payslipLineItems, { id: Date.now(), description: desc, type: 'Earning', amount: Number(amount) }]);
                  }} className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">+ Add Earning</button>
                  <button onClick={() => {
                    const desc = window.prompt('Deduction Description (e.g. Health Insurance):');
                    if (!desc) return;
                    const amount = window.prompt(`Amount in ${payslipCurrency}:`);
                    if (!amount || isNaN(amount)) return;
                    setPayslipLineItems([...payslipLineItems, { id: Date.now(), description: desc, type: 'Deduction', amount: Number(amount) }]);
                  }} className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">+ Add Deduction</button>
                </div>
              </div>

              {payslipLineItems.length > 0 && (
                <div className="mb-4 space-y-1">
                  {payslipLineItems.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-xs p-2 bg-slate-50 border border-slate-100 rounded-lg">
                      <span className="font-medium text-slate-600">{item.description}</span>
                      <div className="flex items-center gap-3">
                        <span className={`font-mono font-bold ${item.type === 'Earning' ? 'text-green-600' : 'text-red-500'}`}>
                          {item.type === 'Earning' ? '+' : '-'}{payslipCurrency}{item.amount.toLocaleString()}
                        </span>
                        <button onClick={() => setPayslipLineItems(payslipLineItems.filter(i => i.id !== item.id))} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3"/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-inner">
                {(() => {
                  const baseMonthly = Number(selectedPayslipEmp.salary) / 12;
                  const baseGrossPay = baseMonthly; // Always 1 month
                  
                  const totalCustomEarnings = payslipLineItems.filter(i => i.type === 'Earning').reduce((acc, curr) => acc + curr.amount, 0);
                  const totalCustomDeductions = payslipLineItems.filter(i => i.type === 'Deduction').reduce((acc, curr) => acc + curr.amount, 0);
                  
                  const taxableGross = baseGrossPay + totalCustomEarnings;
                  const taxDeduction = taxableGross * (payslipTaxRate / 100);
                  
                  const netPay = taxableGross - taxDeduction - totalCustomDeductions;
                  const d = new Date(payslipPeriod + '-01T00:00:00');
                  const periodName = d.toLocaleString('default', { month: 'long', year: 'numeric' });

                  return (
                    <>
                      <div className="flex justify-between text-sm font-bold text-slate-800">
                        <span>Base Salary ({periodName})</span>
                        <span className="font-mono text-slate-800">{payslipCurrency}{baseGrossPay.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                      </div>
                      
                      {totalCustomEarnings > 0 && (
                        <div className="flex justify-between text-sm font-medium text-green-600 pt-1">
                          <span>Total Custom Earnings</span>
                          <span className="font-mono">+{payslipCurrency}{totalCustomEarnings.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                      )}
                      
                      {totalCustomDeductions > 0 && (
                        <div className="flex justify-between text-sm font-medium text-red-500 pt-1">
                          <span>Total Custom Deductions</span>
                          <span className="font-mono">-{payslipCurrency}{totalCustomDeductions.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-sm font-medium text-red-500 pt-1">
                        <span>Tax Deduction ({payslipTaxRate}%)</span>
                        <span className="font-mono">-{payslipCurrency}{taxDeduction.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                      </div>
                      <div className="flex justify-between text-base font-black text-green-600 pt-3 border-t border-slate-200">
                        <span>Net Payable Amount</span>
                        <span className="font-mono">{payslipCurrency}{netPay.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              <button onClick={async () => {
                const baseMonthly = Number(selectedPayslipEmp.salary) / 12;
                const baseGrossPay = baseMonthly; // Always 1 month
                
                const totalCustomEarnings = payslipLineItems.filter(i => i.type === 'Earning').reduce((acc, curr) => acc + curr.amount, 0);
                const totalCustomDeductions = payslipLineItems.filter(i => i.type === 'Deduction').reduce((acc, curr) => acc + curr.amount, 0);
                
                const taxableGross = baseGrossPay + totalCustomEarnings;
                const taxDeduction = taxableGross * (payslipTaxRate / 100);
                const netPay = taxableGross - taxDeduction - totalCustomDeductions;
                
                const d = new Date(payslipPeriod + '-01T00:00:00');
                const periodStr = d.toLocaleString('default', { month: 'long', year: 'numeric' });
                
                await generatePayslip({
                  employeeId: selectedPayslipEmp.id,
                  employeeName: selectedPayslipEmp.name,
                  period: periodStr,
                  currency: payslipCurrency,
                  taxRate: payslipTaxRate,
                  baseAmount: baseGrossPay,
                  taxAmount: taxDeduction,
                  lineItems: payslipLineItems,
                  grossAmount: taxableGross,
                  netAmount: netPay
                }, currentTenant);
                
                setIsPayslipModalOpen(false);
                fetchData(currentTenant);
                alert(`Official Payslip generated and saved!`);
              }} className="w-full bg-recloud-600 hover:bg-recloud-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-recloud-500/20 transition-all transform hover:scale-[1.02]">
                Issue Official Payslip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REQUEST LEAVE MODAL */}
      {isLeaveModalOpen && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">Request Time Off</h3>
              <button onClick={() => setIsLeaveModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddLeave} className="p-6 space-y-4">
              {currentUser.role !== 'staff' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Employee</label>
                  <select required value={newLeave.employeeId} onChange={(e) => {
                    const emp = visibleEmployees.find(emp => emp.id === e.target.value);
                    setNewLeave({...newLeave, employeeId: emp?.id || '', employeeName: emp?.name || ''});
                  }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none bg-white">
                    <option value="">Select Employee...</option>
                    {visibleEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Leave Type</label>
                <select required value={newLeave.type} onChange={e => setNewLeave({...newLeave, type: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none bg-white">
                  <option value="Vacation">Vacation</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Maternity / Paternity">Maternity / Paternity</option>
                  <option value="Unpaid Leave">Unpaid Leave</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Start Date</label>
                  <input required type="date" value={newLeave.startDate} onChange={e => setNewLeave({...newLeave, startDate: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none"/>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">End Date</label>
                  <input required type="date" value={newLeave.endDate} onChange={e => setNewLeave({...newLeave, endDate: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Reason</label>
                <textarea required value={newLeave.reason} onChange={e => setNewLeave({...newLeave, reason: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none h-24 resize-none" placeholder="Details about this request..."></textarea>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsLeaveModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-recloud-600 hover:bg-recloud-700 rounded-lg shadow-md transition-colors">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD EMPLOYEE MODAL */}
      {isAddModalOpen && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">Add New Employee</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                <input required type="text" value={newEmployee.name} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none" placeholder="e.g. John Doe"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">System Role</label>
                  <select required value={newEmployee.role} onChange={e => setNewEmployee({...newEmployee, role: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none bg-white">
                    <option value="staff">Standard Staff (ESS Only)</option>
                    {currentIndustry !== 'law_firm' && <option value="cashier">Cashier (POS Only)</option>}
                    {currentIndustry !== 'law_firm' && <option value="distributor">Distributor / Partner</option>}
                    {currentIndustry !== 'law_firm' && <option value="sales_rep">Field Sales Rep</option>}
                    {currentIndustry !== 'law_firm' && <option value="b2b_customer">Wholesale Customer</option>}
                    <option value="client">Client (Service Portal)</option>
                    <option value="hr_manager">HR Manager</option>
                    {currentIndustry !== 'law_firm' && <option value="sales_manager">Sales Manager (CRM)</option>}
                    {currentIndustry !== 'law_firm' && <option value="inventory_manager">Inventory Manager</option>}
                    <option value="accountant">Accountant (Tax)</option>
                    <option value="admin">System Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Branch / Location</label>
                  <select value={newEmployee.warehouseId || ''} onChange={e => setNewEmployee({...newEmployee, warehouseId: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none bg-white">
                    <option value="">Global (All Branches)</option>
                    {warehouses && warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Department</label>
                  <select value={newEmployee.department} onChange={e => setNewEmployee({...newEmployee, department: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none bg-white">
                    <option value="">Select...</option>
                    <option value="Operations">Operations</option>
                    <option value="Sales & Marketing">Sales & Marketing</option>
                    <option value="IT & Engineering">IT & Engineering</option>
                    <option value="Finance & Legal">Finance & Legal</option>
                    <option value="Human Resources">Human Resources</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input type="text" value={newEmployee.phone} onChange={e => setNewEmployee({...newEmployee, phone: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none" placeholder="+1 234 567 8900"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email (Login ID)</label>
                  <input required type="email" value={newEmployee.email} onChange={e => setNewEmployee({...newEmployee, email: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none" placeholder="name@company.com"/>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Set Password</label>
                  <input type="password" value={newEmployee.password || ''} onChange={e => setNewEmployee({...newEmployee, password: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none" placeholder="Leave blank for none"/>
                </div>
              </div>
              {currentIndustry !== 'law_firm' && ['distributor', 'sales_rep', 'b2b_customer'].includes(newEmployee.role) && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Credit Limit (₦)</label>
                  <input required type="number" value={newEmployee.creditLimit} onChange={e => setNewEmployee({...newEmployee, creditLimit: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-recloud-500/20 focus:border-recloud-500 outline-none" placeholder="e.g. 500000"/>
                  <p className="text-xs text-slate-500 mt-1">Maximum unpaid order balance allowed.</p>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-recloud-600 hover:bg-recloud-700 rounded-lg shadow-md transition-colors">Save Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMPLOYEE PROFILE MODAL */}
      {selectedProfile && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50 relative">
              <div className="flex gap-4 items-center w-full pr-8">
                <div className="w-16 h-16 rounded-full bg-recloud-100 text-recloud-700 flex items-center justify-center font-bold text-2xl border-4 border-white shadow-md flex-shrink-0 overflow-hidden relative group">
                  {isEditingProfile ? (
                    editedProfile?.avatar?.startsWith('data:image') || editedProfile?.avatar?.startsWith('http') ? (
                      <img src={editedProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      editedProfile?.avatar
                    )
                  ) : (
                    selectedProfile?.avatar?.startsWith('data:image') || selectedProfile?.avatar?.startsWith('http') ? (
                      <img src={selectedProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      selectedProfile?.avatar
                    )
                  )}
                  
                  {isEditingProfile && (
                    <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                      <span>Change</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setEditedProfile({...editedProfile, avatar: reader.result});
                          };
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </label>
                  )}
                </div>
                <div className="w-full">
                  {isEditingProfile ? (
                    <div className="space-y-2">
                      <input type="text" value={editedProfile.name} onChange={e => setEditedProfile({...editedProfile, name: e.target.value})} className="w-full border-b border-slate-300 text-xl font-bold text-slate-800 bg-transparent focus:outline-none focus:border-recloud-500" placeholder="Full Name"/>
                      <select value={editedProfile.role || 'staff'} onChange={e => setEditedProfile({...editedProfile, role: e.target.value})} className="w-full border-b border-slate-300 text-sm font-semibold text-recloud-600 bg-transparent focus:outline-none focus:border-recloud-500 pb-1">
                        <option value="staff">Standard Staff (ESS Only)</option>
                        {currentIndustry !== 'law_firm' && <option value="cashier">Cashier (POS Only)</option>}
                        {currentIndustry !== 'law_firm' && <option value="distributor">Distributor / Partner</option>}
                        {currentIndustry !== 'law_firm' && <option value="sales_rep">Field Sales Rep</option>}
                        {currentIndustry !== 'law_firm' && <option value="b2b_customer">Wholesale Customer</option>}
                        <option value="client">Client (Service Portal)</option>
                        <option value="hr_manager">HR Manager</option>
                        {currentIndustry !== 'law_firm' && <option value="sales_manager">Sales Manager (CRM)</option>}
                        {currentIndustry !== 'law_firm' && <option value="inventory_manager">Inventory Manager</option>}
                        <option value="accountant">Accountant (Tax)</option>
                        <option value="admin">System Administrator</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">{selectedProfile.name}</h3>
                      <p className="text-recloud-600 font-semibold text-sm capitalize">{selectedProfile.role ? selectedProfile.role.replace('_', ' ') : 'Staff'}</p>
                      {selectedProfile.warehouseId && (() => {
                        const pb = warehouses.find(w => w.id === selectedProfile.warehouseId);
                        return pb ? (
                          <span className="mt-1 inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                            {pb.name}
                          </span>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedProfile(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex border-b border-slate-200 shrink-0">
              <button onClick={() => setProfileTab('overview')} className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${profileTab === 'overview' ? 'border-recloud-600 text-recloud-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Overview</button>
              <button onClick={() => setProfileTab('documents')} className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${profileTab === 'documents' ? 'border-recloud-600 text-recloud-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Documents</button>
              <button onClick={() => setProfileTab('performance')} className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${profileTab === 'performance' ? 'border-recloud-600 text-recloud-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Performance</button>
            </div>
            <div className="flex-1 overflow-y-auto">
            
            {profileTab === 'overview' && (
              <div className="p-6 space-y-6 animate-in fade-in">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <Briefcase className="w-5 h-5 text-slate-400" />
                    <div className="w-full">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Department</p>
                      {isEditingProfile ? (
                        <select value={editedProfile.department} onChange={e => setEditedProfile({...editedProfile, department: e.target.value})} className="w-full text-sm font-medium bg-transparent border-b border-slate-300 focus:outline-none focus:border-recloud-500">
                          <option value="Operations">Operations</option>
                          <option value="Sales & Marketing">Sales & Marketing</option>
                          <option value="IT & Engineering">IT & Engineering</option>
                          <option value="Finance & Legal">Finance & Legal</option>
                          <option value="Human Resources">Human Resources</option>
                          <option value="">General</option>
                        </select>
                      ) : (
                        <p className="text-sm font-medium">{selectedProfile.department || 'General'}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <Clock className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status</p>
                      <p className="text-sm font-medium">
                        <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${selectedProfile.status === 'Clocked In' ? 'bg-green-500' : selectedProfile.status === 'Inactive' ? 'bg-red-500' : 'bg-slate-400'}`}></span>
                        {selectedProfile.status || 'Clocked Out'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <Mail className="w-5 h-5 text-slate-400" />
                    <div className="w-full overflow-hidden">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email</p>
                      {isEditingProfile ? (
                         <input type="email" value={editedProfile.email || ''} onChange={e => setEditedProfile({...editedProfile, email: e.target.value})} className="w-full text-sm font-medium bg-transparent border-b border-slate-300 focus:outline-none focus:border-recloud-500" placeholder="Email"/>
                      ) : (
                        <p className="text-sm font-medium truncate" title={selectedProfile.email}>{selectedProfile.email || 'N/A'}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <Phone className="w-5 h-5 text-slate-400" />
                    <div className="w-full overflow-hidden">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Phone</p>
                      {isEditingProfile ? (
                         <input type="tel" value={editedProfile.phone || ''} onChange={e => setEditedProfile({...editedProfile, phone: e.target.value})} className="w-full text-sm font-medium bg-transparent border-b border-slate-300 focus:outline-none focus:border-recloud-500" placeholder="Phone"/>
                      ) : (
                        <p className="text-sm font-medium truncate">{selectedProfile.phone || 'N/A'}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 text-slate-600 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                    <MapPin className="w-5 h-5 text-emerald-500" />
                    <div className="w-full">
                      <p className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Assigned Branch</p>
                      {isEditingProfile ? (
                        <select value={editedProfile.warehouseId || ''} onChange={e => setEditedProfile({...editedProfile, warehouseId: e.target.value || null})} className="w-full text-sm font-medium bg-transparent border-b border-emerald-300 focus:outline-none focus:border-emerald-500">
                          <option value="">Global (All Branches)</option>
                          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                      ) : (
                        <p className="text-sm font-bold text-emerald-700">
                          {selectedProfile.warehouseId ? (() => {
                            const profBranch = warehouses.find(w => w.id === selectedProfile.warehouseId);
                            return profBranch ? profBranch.name : 'Unknown';
                          })() : 'Global Access'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                    <Briefcase className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">System Access</p>
                      <p className="text-sm font-bold text-blue-700 capitalize">{selectedProfile.role ? selectedProfile.role.replace('_', ' ') : 'Staff'}</p>
                    </div>
                  </div>
                </div>
                
                {isEditingProfile && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="w-full">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Reset Password</p>
                        <input type="password" value={editedProfile.password || ''} onChange={e => setEditedProfile({...editedProfile, password: e.target.value})} className="w-full text-sm font-medium bg-transparent border-b border-slate-300 focus:outline-none focus:border-recloud-500" placeholder="Leave blank to keep current"/>
                      </div>
                    </div>
                    {['distributor', 'sales_rep', 'b2b_customer'].includes(editedProfile.role) && (
                      <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="w-full">
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Credit Limit (₦)</p>
                          <input type="number" value={editedProfile.creditLimit || ''} onChange={e => setEditedProfile({...editedProfile, creditLimit: e.target.value})} className="w-full text-sm font-medium bg-transparent border-b border-slate-300 focus:outline-none focus:border-recloud-500" placeholder="e.g. 500000"/>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="pt-4 border-t border-slate-100 flex justify-between">
                  {isEditingProfile ? (
                    <>
                      <button onClick={() => setIsEditingProfile(false)} className="text-slate-500 font-semibold text-sm hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors">Cancel</button>
                      <button onClick={handleUpdateProfile} className="bg-recloud-600 text-white font-bold text-sm px-6 py-2 rounded-lg hover:bg-recloud-700 shadow-md">Save Changes</button>
                    </>
                  ) : (
                    <>
                      <button onClick={handleToggleActive} className={`${selectedProfile.status === 'Inactive' ? 'text-green-600 hover:bg-green-50' : 'text-red-500 hover:bg-red-50'} font-semibold text-sm px-4 py-2 rounded-lg transition-colors`}>
                        {selectedProfile.status === 'Inactive' ? 'Activate Staff' : 'Deactivate Staff'}
                      </button>
                      <button onClick={() => setIsEditingProfile(true)} className="bg-recloud-600 text-white font-bold text-sm px-6 py-2 rounded-lg hover:bg-recloud-700 shadow-md">Edit Profile</button>
                    </>
                  )}
                </div>
              </div>
            )}

            {profileTab === 'documents' && (
              <div className="p-6 space-y-6 animate-in fade-in">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h4 className="font-bold text-sm text-slate-800 mb-3">Upload Document to Vault</h4>
                  <form onSubmit={(e) => handleUploadDocument(e, selectedProfile.id, 'HR Admin')} className="flex flex-col gap-3">
                    <div className="flex flex-col md:flex-row gap-3">
                      <input required type="text" placeholder="Document Name (e.g. Passport)" value={newDoc.name} onChange={e => setNewDoc({...newDoc, name: e.target.value})} className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500" />
                      <select value={newDoc.type} onChange={e => setNewDoc({...newDoc, type: e.target.value})} className="text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none bg-white">
                        <option>Contract</option>
                        <option>Personal ID</option>
                        <option>Certificate</option>
                        <option>Tax Form</option>
                      </select>
                    </div>
                    <div className="flex flex-col md:flex-row gap-3 items-center">
                      <input required type="file" onChange={handleFileChange} className="w-full md:flex-1 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-recloud-50 file:text-recloud-700 hover:file:bg-recloud-100"/>
                      <button type="submit" className="w-full md:w-auto bg-slate-800 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors whitespace-nowrap">Upload File</button>
                    </div>
                  </form>
                </div>
                
                <div>
                  <h4 className="font-bold text-sm text-slate-800 mb-3">Vault Records</h4>
                  <div className="space-y-2">
                    {documents.filter(d => d.employeeId === selectedProfile.id).length === 0 ? (
                      <p className="text-sm text-slate-500 italic">No documents uploaded yet.</p>
                    ) : (
                      documents.filter(d => d.employeeId === selectedProfile.id).map(doc => (
                        <div key={doc.id} className="flex justify-between items-center bg-white border border-slate-100 p-3 rounded-lg shadow-sm">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-recloud-500" />
                            <div>
                              <p className="text-sm font-bold text-slate-800">{doc.name}</p>
                              <p className="text-xs text-slate-500">{doc.type} • Uploaded by {doc.uploadedBy || 'HR'} on {new Date(doc.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <button onClick={() => handleDownloadDocument(doc)} className="text-recloud-600 hover:bg-recloud-50 p-2 rounded-lg"><Download className="w-4 h-4"/></button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {profileTab === 'performance' && (
              <div className="p-6 space-y-6 animate-in fade-in h-[400px] overflow-y-auto">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h4 className="font-bold text-sm text-slate-800 mb-3">Log Performance Review</h4>
                  <form onSubmit={handleSubmitReview} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Rating (1-5)</label>
                      <input type="number" min="1" max="5" required value={newReview.score} onChange={e => setNewReview({...newReview, score: Number(e.target.value)})} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Manager Comments</label>
                      <textarea required value={newReview.comments} onChange={e => setNewReview({...newReview, comments: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500 h-20 resize-none"></textarea>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Goals for Next Quarter</label>
                      <textarea value={newReview.goals} onChange={e => setNewReview({...newReview, goals: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500 h-16 resize-none"></textarea>
                    </div>
                    <button type="submit" className="w-full bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors">Submit Review</button>
                  </form>
                </div>
                
                <div>
                  <h4 className="font-bold text-sm text-slate-800 mb-3">Past Reviews</h4>
                  <div className="space-y-3">
                    {reviews.filter(r => r.employeeId === selectedProfile.id).length === 0 ? (
                      <p className="text-sm text-slate-500 italic">No reviews logged yet.</p>
                    ) : (
                      reviews.filter(r => r.employeeId === selectedProfile.id).sort((a,b) => new Date(b.date) - new Date(a.date)).map(rev => (
                        <div key={rev.id} className="bg-white border border-slate-100 p-4 rounded-lg shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="flex text-amber-400 text-lg">
                                {'★'.repeat(rev.score)}{'☆'.repeat(5 - rev.score)}
                              </div>
                              <p className="text-xs text-slate-500">By {rev.reviewerName} on {new Date(rev.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <p className="text-sm text-slate-700 mb-2">{rev.comments}</p>
                          {rev.goals && (
                            <div className="bg-blue-50 p-2 rounded text-xs text-blue-800 border border-blue-100">
                              <span className="font-bold">Goals:</span> {rev.goals}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

          

            </div>
          </div>
        </div>
      )}

    </div>
  );
}