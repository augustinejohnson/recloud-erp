import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, setDoc, getDoc, writeBatch, runTransaction } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD7-2eUXiARjiM0jx8cwPk7Kug7_zVCIPk",
  authDomain: "recloud-erp.firebaseapp.com",
  projectId: "recloud-erp",
  storageBucket: "recloud-erp.firebasestorage.app",
  messagingSenderId: "966817109587",
  appId: "1:966817109587:web:cf13129b554de24f9e98a6",
  measurementId: "G-HJZYKHHE8N"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    throw error;
  }
};

// Secondary app for creating users without logging out current user
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

// Auth Helpers
export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const resetUserPassword = async (email) => {
  await sendPasswordResetEmail(auth, email);
};

export const addUserWorkspace = async (uid, tenantId, companyName, role) => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  let workspaces = [];
  if (userSnap.exists()) {
    workspaces = userSnap.data().workspaces || [];
  }
  if (!workspaces.find(w => w.id === tenantId)) {
    workspaces.push({ id: tenantId, name: companyName, role });
    await setDoc(userRef, { workspaces }, { merge: true });
  }
};


export const removeUserWorkspace = async (uid, tenantId) => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    let workspaces = userSnap.data().workspaces || [];
    workspaces = workspaces.filter(w => w.id !== tenantId);
    await setDoc(userRef, { workspaces }, { merge: true });
  }
};

export const getUserWorkspaces = async (uid) => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return userSnap.data().workspaces || [];
  }
  return [];
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const createAuthUser = async (email, name) => {
  // Generate a random 16-char password
  const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
  const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, tempPassword);
  await updateProfile(userCredential.user, { displayName: name });
  await sendPasswordResetEmail(auth, email);
  await signOut(secondaryAuth);
  return userCredential.user.uid;
};

export const uploadFile = async (file, path, onProgress) => {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress) {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(pct);
        }
      },
      (error) => reject(error),
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
};

// Upload a real file to Firebase Storage and store metadata in Firestore
export const uploadAndSaveDocument = async (file, folderId, uploadedBy, tenantId = "tenant_1", onProgress) => {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `organizations/${tenantId}/documents/${folderId || 'root'}/${Date.now()}_${safeName}`;
  const downloadURL = await uploadFile(file, storagePath, onProgress);
  const docsCol = collection(db, `organizations/${tenantId}/documents`);
  const docRef = await addDoc(docsCol, {
    name: file.name,
    folderId: folderId || null,
    type: file.name.split('.').pop().toLowerCase() || 'file',
    size: file.size < 1024 * 1024
      ? Math.round(file.size / 1024) + ' KB'
      : (file.size / (1024 * 1024)).toFixed(2) + ' MB',
    url: downloadURL,
    storagePath,
    uploadedBy,
    createdAt: serverTimestamp()
  });
  return docRef;
};

// --- MULTI-TENANT CONFIG ---


// ==================== HISTORY / RECYCLE BIN ====================
export const getHistory = async (tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/history`);
  const snapshot = await getDocs(col);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const moveToHistory = async (collectionName, docId, itemType, itemName, tenantId = "tenant_1") => {
  try {
    const docRef = doc(db, `organizations/${tenantId}/${collectionName}`, docId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return false;
    
    const data = docSnap.data();
    const historyCol = collection(db, `organizations/${tenantId}/history`);
    
    await addDoc(historyCol, {
      originalCollection: collectionName,
      originalId: docId,
      itemType: itemType,
      itemName: itemName || 'Unknown Item',
      deletedAt: new Date().toISOString(),
      data: data
    });
    
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error("Error moving to history:", err);
    throw err;
  }
};

export const restoreFromHistory = async (historyDocId, tenantId = "tenant_1") => {
  const historyRef = doc(db, `organizations/${tenantId}/history`, historyDocId);
  const historySnap = await getDoc(historyRef);
  if (!historySnap.exists()) throw new Error("History record not found");
  
  const historyData = historySnap.data();
  const targetRef = doc(db, `organizations/${tenantId}/${historyData.originalCollection}`, historyData.originalId);
  
  await setDoc(targetRef, historyData.data);
  await deleteDoc(historyRef);
};

export const permanentlyDeleteFromHistory = async (historyDocId, tenantId = "tenant_1") => {
  const historyRef = doc(db, `organizations/${tenantId}/history`, historyDocId);
  await deleteDoc(historyRef);
};

export const registerTenant = async (companyName, workspaceSlug, adminEmail, adminPassword, address = '', phone = '', logoUrl = '', industry = 'retail') => {
  // Check if workspace exists
  const configRef = doc(db, `organizations/${workspaceSlug}/config`, 'settings');
  const configSnap = await getDoc(configRef);
  if (configSnap.exists()) {
    throw new Error('Workspace slug is already taken. Please choose another.');
  }

  // Create or Login Firebase Auth User for the Admin using the main auth instance
  let adminUid;
  let currentUser = auth.currentUser;
  
  if (currentUser && currentUser.email === adminEmail) {
    adminUid = currentUser.uid;
  } else {
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      } else {
        throw err;
      }
    }
    adminUid = userCredential.user.uid;
    currentUser = userCredential.user;
  }
  
  await updateProfile(currentUser, { displayName: 'Admin' });

  // Create the Organization document in the config subcollection
  await setDoc(configRef, {
    companyName,
    address,
    phone,
    logoUrl,
    industry,
    createdAt: serverTimestamp()
  });

  // Create the Admin Employee for this organization using their actual UID
  const employeeRef = doc(db, `organizations/${workspaceSlug}/employees`, adminUid);
  await setDoc(employeeRef, {
    name: 'Admin',
    email: adminEmail,
    role: 'admin',
    department: 'Management',
    status: 'Clocked Out',
    createdAt: serverTimestamp()
  });

  // Add workspace to the global user's workspaces
  await addUserWorkspace(adminUid, workspaceSlug, companyName, 'admin');

  return workspaceSlug;
};

export const getTenantConfig = async (tenantId) => {
  if (!tenantId) return null;
  const configRef = doc(db, `organizations/${tenantId}/config`, 'settings');
  const configSnap = await getDoc(configRef);
  if (configSnap.exists()) {
    return { id: tenantId, ...configSnap.data() };
  }
  return null;
};

export const updateTenantConfig = async (tenantId, configData) => {
  const safeTenant = tenantId || "tenant_1";
  const configRef = doc(db, `organizations/${safeTenant}/config`, 'settings');
  await setDoc(configRef, {
    ...configData,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const getNextInvoiceNumber = async (tenantId, companyName) => {
  const safeTenant = tenantId || "tenant_1";
  const prefix = companyName ? companyName.substring(0, 2).toUpperCase() : 'RE';
  const counterRef = doc(db, `organizations/${safeTenant}/config`, 'invoiceCounter');

  try {
    const newCount = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let count = 1;
      if (counterDoc.exists() && counterDoc.data().count) {
        count = counterDoc.data().count + 1;
      }
      transaction.set(counterRef, { count }, { merge: true });
      return count;
    });

    const numericPart = String(newCount).padStart(6, '0');
    return `${prefix}-${numericPart}`;
  } catch (error) {
    console.error("Transaction failed: ", error);
    const fallbackId = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `${prefix}-${fallbackId}`;
  }
};

export const getEmployees = async (tenantId = "tenant_1") => {
  const employeesCol = collection(db, `organizations/${tenantId}/employees`);
  const snapshot = await getDocs(employeesCol);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addEmployee = async (employeeData, tenantId = "tenant_1") => {
  const empRef = doc(db, `organizations/${tenantId}/employees`, employeeData.id);
  await setDoc(empRef, {
    ...employeeData,
    status: 'Clocked Out', // Default status
    createdAt: serverTimestamp(),
  });
  
  const tenantConfig = await getTenantConfig(tenantId);
  const companyName = tenantConfig?.companyName || tenantId;
  await addUserWorkspace(employeeData.id, tenantId, companyName, employeeData.role);
};

export const clockIn = async (employeeId, tenantId = "tenant_1") => {
  const employeeRef = doc(db, `organizations/${tenantId}/employees`, employeeId);
  await updateDoc(employeeRef, {
    status: 'Clocked In',
    lastClockIn: serverTimestamp()
  });
};

export const clockOut = async (employeeId, tenantId = "tenant_1") => {
  const employeeRef = doc(db, `organizations/${tenantId}/employees`, employeeId);
  await updateDoc(employeeRef, {
    status: 'Clocked Out',
    lastClockOut: serverTimestamp()
  });
};

export const updateEmployee = async (employeeId, updatedData, tenantId = "tenant_1") => {
  const employeeRef = doc(db, `organizations/${tenantId}/employees`, employeeId);
  await updateDoc(employeeRef, {
    ...updatedData,
    updatedAt: serverTimestamp()
  });
};

export const deactivateEmployee = async (employeeId, tenantId = "tenant_1") => {
  const employeeRef = doc(db, `organizations/${tenantId}/employees`, employeeId);
  await updateDoc(employeeRef, {
    status: 'Inactive',
    updatedAt: serverTimestamp()
  });
};

export const deleteEmployee = async (employeeId, tenantId = "tenant_1") => {
  const employeeRef = doc(db, `organizations/${tenantId}/employees`, employeeId);
  await deleteDoc(employeeRef);
  await removeUserWorkspace(employeeId, tenantId);
};

export const activateEmployee = async (employeeId, tenantId = "tenant_1") => {
  const employeeRef = doc(db, `organizations/${tenantId}/employees`, employeeId);
  await updateDoc(employeeRef, {
    status: 'Clocked Out', // Default active state
    updatedAt: serverTimestamp()
  });
};

// --- SHIFT MANAGEMENT ---

export const getShifts = async (tenantId = "tenant_1") => {
  const shiftsCol = collection(db, `organizations/${tenantId}/shifts`);
  const snapshot = await getDocs(shiftsCol);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const assignShift = async (shiftData, tenantId = "tenant_1") => {
  const shiftsCol = collection(db, `organizations/${tenantId}/shifts`);
  return await addDoc(shiftsCol, {
    ...shiftData,
    createdAt: serverTimestamp()
  });
};

export const removeShift = async (shiftId, tenantId = "tenant_1") => {
  const shiftRef = doc(db, `organizations/${tenantId}/shifts`, shiftId);
  await deleteDoc(shiftRef);
};

// --- LEAVE MANAGEMENT ---

export const getLeaveRequests = async (tenantId = "tenant_1") => {
  const leaveCol = collection(db, `organizations/${tenantId}/leave_requests`);
  const snapshot = await getDocs(leaveCol);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const submitLeaveRequest = async (requestData, tenantId = "tenant_1") => {
  const leaveCol = collection(db, `organizations/${tenantId}/leave_requests`);
  await addDoc(leaveCol, {
    ...requestData,
    status: 'Pending',
    createdAt: serverTimestamp()
  });
};

export const updateLeaveStatus = async (requestId, status, tenantId = "tenant_1") => {
  const leaveRef = doc(db, `organizations/${tenantId}/leave_requests`, requestId);
  await updateDoc(leaveRef, {
    status: status,
    updatedAt: serverTimestamp()
  });
};

// --- PAYROLL MANAGEMENT ---

export const getPayslips = async (tenantId = "tenant_1") => {
  const psCol = collection(db, `organizations/${tenantId}/payslips`);
  const snapshot = await getDocs(psCol);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const generatePayslip = async (payslipData, tenantId = "tenant_1") => {
  const psCol = collection(db, `organizations/${tenantId}/payslips`);
  await addDoc(psCol, {
    ...payslipData,
    status: 'Issued',
    createdAt: serverTimestamp()
  });
};

// --- DOCUMENT VAULT ---

export const getDocuments = async (tenantId = "tenant_1") => {
  const docsCol = collection(db, `organizations/${tenantId}/documents`);
  const snapshot = await getDocs(docsCol);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addDocument = async (docData, tenantId = "tenant_1") => {
  const docsCol = collection(db, `organizations/${tenantId}/documents`);
  await addDoc(docsCol, {
    ...docData,
    createdAt: serverTimestamp()
  });
};

// --- PERFORMANCE REVIEWS ---

export const getReviews = async (tenantId = "tenant_1") => {
  const reviewsCol = collection(db, `organizations/${tenantId}/reviews`);
  const snapshot = await getDocs(reviewsCol);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// --- APPLICANT TRACKING SYSTEM (ATS) & RECRUITMENT ---

export const getJobs = async (tenantId = "tenant_1") => {
  const jobsCol = collection(db, `organizations/${tenantId}/jobs`);
  const snapshot = await getDocs(jobsCol);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addJob = async (jobData, tenantId = "tenant_1") => {
  const jobsCol = collection(db, `organizations/${tenantId}/jobs`);
  return await addDoc(jobsCol, {
    ...jobData,
    createdAt: serverTimestamp()
  });
};

export const getApplicants = async (tenantId = "tenant_1") => {
  const applicantsCol = collection(db, `organizations/${tenantId}/applicants`);
  const snapshot = await getDocs(applicantsCol);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addApplicant = async (applicantData, tenantId = "tenant_1") => {
  const applicantsCol = collection(db, `organizations/${tenantId}/applicants`);
  return await addDoc(applicantsCol, {
    ...applicantData,
    createdAt: serverTimestamp()
  });
};

export const updateApplicantStatus = async (applicantId, newStatus, tenantId = "tenant_1") => {
  const applicantRef = doc(db, `organizations/${tenantId}/applicants`, applicantId);
  await updateDoc(applicantRef, {
    status: newStatus,
    updatedAt: serverTimestamp()
  });
};

export const addReview = async (reviewData, tenantId = "tenant_1") => {
  const revsCol = collection(db, `organizations/${tenantId}/reviews`);
  await addDoc(revsCol, {
    ...reviewData,
    createdAt: serverTimestamp()
  });
};

// --- CRM (Customer Relationship Management) & INVOICING ---

export const getCustomers = async (tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/customers`);
  const snapshot = await getDocs(col);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addCustomer = async (customerData, tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/customers`);
  return await addDoc(col, {
    ...customerData,
    createdAt: serverTimestamp()
  });
};

export const updateCustomer = async (customerId, updateData, tenantId = "tenant_1") => {
  const ref = doc(db, `organizations/${tenantId}/customers`, customerId);
  await updateDoc(ref, {
    ...updateData,
    updatedAt: serverTimestamp()
  });
};

export const deleteCustomer = async (customerId, tenantId = "tenant_1") => {
  await moveToHistory('customers', customerId, 'Customer', 'Deleted Customer', tenantId);
};

export const getDeals = async (tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/deals`);
  const snapshot = await getDocs(col);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addDeal = async (dealData, tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/deals`);
  return await addDoc(col, {
    ...dealData,
    createdAt: serverTimestamp()
  });
};

export const updateDealStatus = async (dealId, newStatus, tenantId = "tenant_1") => {
  const ref = doc(db, `organizations/${tenantId}/deals`, dealId);
  await updateDoc(ref, {
    stage: newStatus,
    updatedAt: serverTimestamp()
  });
};

export const updateDeal = async (dealId, updatedData, tenantId = "tenant_1") => {
  const ref = doc(db, `organizations/${tenantId}/deals`, dealId);
  await updateDoc(ref, {
    ...updatedData,
    updatedAt: serverTimestamp()
  });
};

export const getInvoices = async (tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/invoices`);
  const snapshot = await getDocs(col);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addInvoice = async (invoiceData, tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/invoices`);
  return await addDoc(col, {
    ...invoiceData,
    createdAt: serverTimestamp()
  });
};

export const updateInvoiceStatus = async (invoiceId, newStatus, tenantId = "tenant_1", extraData = {}) => {
  const ref = doc(db, `organizations/${tenantId}/invoices`, invoiceId);
  const snap = await getDoc(ref);
  const invoiceData = snap.data();

  if ((newStatus === 'Paid' || newStatus === 'paid') && invoiceData?.status !== 'Paid' && invoiceData?.status !== 'paid') {
    const batch = writeBatch(db);
    batch.update(ref, { status: newStatus, updatedAt: serverTimestamp(), ...extraData });
    
    const ledgerCol = collection(db, `organizations/${tenantId}/ledger`);
    const newLedgerRef = doc(ledgerCol);
    batch.set(newLedgerRef, {
      date: new Date().toISOString(),
      description: `Invoice Paid: ${invoiceData.invoiceNumber || invoiceId}`,
      referenceId: invoiceId,
      type: 'Revenue',
      amount: invoiceData.amount || invoiceData.totalAmount || 0,
      taxCollected: invoiceData.taxAmount || 0,
      paymentMethod: 'Bank Transfer / Cash',
      createdBy: 'System (Invoice)',
      createdAt: serverTimestamp()
    });
    
    await batch.commit();
  } else {
    await updateDoc(ref, {
      status: newStatus,
      updatedAt: serverTimestamp(),
      ...extraData
    });
  }
};

export const updateInvoice = async (invoiceId, updateData, tenantId = "tenant_1") => {
  const ref = doc(db, `organizations/${tenantId}/invoices`, invoiceId);
  await updateDoc(ref, {
    ...updateData,
    updatedAt: serverTimestamp()
  });
};

export const deleteInvoice = async (invoiceId, tenantId = "tenant_1") => {
  await moveToHistory('invoices', invoiceId, 'Invoice', 'Deleted Invoice', tenantId);
};

// ==================== INVENTORY: PRODUCTS ====================
export const getProducts = async (tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/products`);
  const snapshot = await getDocs(col);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addProduct = async (productData, tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/products`);
  return await addDoc(col, { ...productData, createdAt: serverTimestamp() });
};

export const updateProduct = async (productId, updateData, tenantId = "tenant_1") => {
  const ref = doc(db, `organizations/${tenantId}/products`, productId);
  await updateDoc(ref, { ...updateData, updatedAt: serverTimestamp() });
};

export const deleteProduct = async (productId, tenantId = "tenant_1") => {
  await moveToHistory('products', productId, 'Product', 'Deleted Product', tenantId);
};

// ==================== INVENTORY: STOCK MOVEMENTS ====================
export const getStockMovements = async (tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/stockMovements`);
  const snapshot = await getDocs(col);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addStockMovement = async (movementData, tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/stockMovements`);
  return await addDoc(col, { ...movementData, createdAt: serverTimestamp() });
};



export const deleteDocument = async (documentId, tenantId = "tenant_1") => {
  // Try to delete from Storage first if storagePath exists
  try {
    const docSnap = await getDoc(doc(db, `organizations/${tenantId}/documents`, documentId));
    if (docSnap.exists() && docSnap.data().storagePath) {
      const storageRef = ref(storage, docSnap.data().storagePath);
      await deleteObject(storageRef).catch(() => {}); // ignore if already gone
    }
  } catch {}
  await moveToHistory('documents', documentId, 'Document', 'Deleted Document', tenantId);
};

export const deleteApiKey = async (keyId) => {
  await deleteDoc(doc(db, 'api_keys', keyId));
};

// ==================== INVENTORY: WAREHOUSES ====================
export const getWarehouses = async (tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/warehouses`);
  const snapshot = await getDocs(col);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addWarehouse = async (warehouseData, tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/warehouses`);
  return await addDoc(col, { ...warehouseData, createdAt: serverTimestamp() });
};

export const deleteWarehouse = async (warehouseId, tenantId = "tenant_1") => {
  await moveToHistory('warehouses', warehouseId, 'Warehouse', 'Deleted Warehouse', tenantId);
};

// ==================== INVENTORY: SUPPLIERS ====================
export const getSuppliers = async (tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/suppliers`);
  const snapshot = await getDocs(col);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addSupplier = async (supplierData, tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/suppliers`);
  return await addDoc(col, { ...supplierData, createdAt: serverTimestamp() });
};

export const deleteSupplier = async (supplierId, tenantId = "tenant_1") => {
  await moveToHistory('suppliers', supplierId, 'Supplier', 'Deleted Supplier', tenantId);
};

// ==================== INVENTORY: PURCHASE ORDERS ====================
export const getPurchaseOrders = async (tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/purchaseOrders`);
  const snapshot = await getDocs(col);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addPurchaseOrder = async (poData, tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/purchaseOrders`);
  return await addDoc(col, { ...poData, createdAt: serverTimestamp() });
};

export const updatePurchaseOrder = async (poId, updateData, tenantId = "tenant_1") => {
  const ref = doc(db, `organizations/${tenantId}/purchaseOrders`, poId);
  await updateDoc(ref, { ...updateData, updatedAt: serverTimestamp() });
};

export const deletePurchaseOrder = async (poId, tenantId = "tenant_1") => {
  await moveToHistory('purchaseOrders', poId, 'Purchase Order', 'Deleted Purchase Order', tenantId);
};

// ==================== POINT OF SALE (POS) ====================
export const getSales = async (tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/sales`);
  const snapshot = await getDocs(col);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addSale = async (saleData, tenantId = "tenant_1") => {
  const batch = writeBatch(db);
  const salesCol = collection(db, `organizations/${tenantId}/sales`);
  const newSaleRef = doc(salesCol);
  
  // Create sale record
  batch.set(newSaleRef, { ...saleData, createdAt: serverTimestamp() });

  // Decrement stock for each item in the sale
  saleData.items.forEach(item => {
    // We assume saleData provides the warehouseId where the sale happened
    const movementCol = collection(db, `organizations/${tenantId}/stockMovements`);
    const newMovementRef = doc(movementCol);
    batch.set(newMovementRef, {
      productId: item.productId,
      warehouseId: saleData.warehouseId,
      type: 'out',
      qty: item.qty,
      note: `POS Sale: ${newSaleRef.id}`,
      createdAt: serverTimestamp()
    });
  });

  // Create Ledger Entry for the sale
  const ledgerCol = collection(db, `organizations/${tenantId}/ledger`);
  const newLedgerRef = doc(ledgerCol);
  batch.set(newLedgerRef, {
    date: new Date().toISOString(),
    description: `POS Sale: ${newSaleRef.id}`,
    referenceId: newSaleRef.id,
    type: 'Revenue',
    amount: saleData.totalAmount,
    taxCollected: saleData.taxAmount || 0,
    paymentMethod: saleData.paymentMethod,
    createdBy: saleData.cashierName || 'System',
    createdAt: serverTimestamp()
  });

  await batch.commit();
  return newSaleRef;
};

// --- B2B ORDERS ---
export const getB2BOrders = async (tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/b2b_orders`);
  const snapshot = await getDocs(col);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addB2BOrder = async (orderData, tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/b2b_orders`);
  return await addDoc(col, { ...orderData, createdAt: serverTimestamp() });
};

export const updateB2BOrder = async (orderId, updates, tenantId = "tenant_1") => {
  const orderRef = doc(db, `organizations/${tenantId}/b2b_orders`, orderId);
  await updateDoc(orderRef, updates);
};

// ==================== ACCOUNTING & FINANCE ====================

// --- LEDGER ENTRIES ---
export const getLedgerEntries = async (tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/ledger`);
  const snapshot = await getDocs(col);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addLedgerEntry = async (entryData, tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/ledger`);
  return await addDoc(col, { ...entryData, createdAt: serverTimestamp() });
};

// --- EXPENSES ---
export const getExpenses = async (tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/expenses`);
  const snapshot = await getDocs(col);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addExpense = async (expenseData, tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/expenses`);
  return await addDoc(col, { ...expenseData, createdAt: serverTimestamp() });
};

export const updateExpense = async (expenseId, updateData, tenantId = "tenant_1") => {
  const ref = doc(db, `organizations/${tenantId}/expenses`, expenseId);
  const snap = await getDoc(ref);
  const expenseData = snap.data();

  if (updateData.status === 'Approved' && expenseData?.status !== 'Approved') {
    const batch = writeBatch(db);
    batch.update(ref, { ...updateData, updatedAt: serverTimestamp() });
    
    const ledgerCol = collection(db, `organizations/${tenantId}/ledger`);
    const newLedgerRef = doc(ledgerCol);
    batch.set(newLedgerRef, {
      date: new Date().toISOString(),
      description: `Approved Expense: ${expenseData.description}`,
      referenceId: expenseId,
      type: 'Expense',
      amount: expenseData.amount,
      taxCollected: 0,
      paymentMethod: 'Bank Transfer / Cash',
      createdBy: updateData.approvedBy || 'System',
      createdAt: serverTimestamp()
    });
    
    await batch.commit();
  } else {
    await updateDoc(ref, { ...updateData, updatedAt: serverTimestamp() });
  }
};

// --- BRANCH ORDERS (REQUISITIONS) ---
export const getBranchOrders = async (tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/branchOrders`);
  const snapshot = await getDocs(col);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addBranchOrder = async (orderData, tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/branchOrders`);
  return await addDoc(col, { ...orderData, status: 'Pending', createdAt: serverTimestamp() });
};

export const updateBranchOrder = async (orderId, updateData, tenantId = "tenant_1") => {
  const ref = doc(db, `organizations/${tenantId}/branchOrders`, orderId);
  await updateDoc(ref, { ...updateData, updatedAt: serverTimestamp() });
};

export const deleteBranchOrder = async (orderId, tenantId = "tenant_1") => {
  await moveToHistory('branchOrders', orderId, 'Branch Order', 'Deleted Branch Order', tenantId);
};

// ==================== DISCUSS (INTERNAL CHAT) ====================
export const getChatChannels = async (tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/chatChannels`);
  const snapshot = await getDocs(col);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addChatChannel = async (channelData, tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/chatChannels`);
  return await addDoc(col, { ...channelData, createdAt: serverTimestamp() });
};

export const getChatMessages = async (channelId, tenantId = "tenant_1") => {
  if (!channelId) return [];
  const col = collection(db, `organizations/${tenantId}/chatChannels/${channelId}/messages`);
  const snapshot = await getDocs(col);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addChatMessage = async (channelId, messageData, tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/chatChannels/${channelId}/messages`);
  return await addDoc(col, { ...messageData, timestamp: serverTimestamp() });
};

// ==================== KNOWLEDGE BASE (DOCUMENTS) ====================
export const getFolders = async (tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/folders`);
  const snapshot = await getDocs(col);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addFolder = async (folderData, tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/folders`);
  return await addDoc(col, { ...folderData, createdAt: serverTimestamp() });
};

// Note: getDocuments and addDocument already exist above (line 220), 
// but we might need to update them for folders. We can reuse them.

// ==================== PROJECTS & TASKS (KANBAN) ====================
export const getProjects = async (tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/projects`);
  const snapshot = await getDocs(col);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addProject = async (projectData, tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/projects`);
  return await addDoc(col, { ...projectData, createdAt: serverTimestamp() });
};

export const updateProject = async (projectId, updateData, tenantId = "tenant_1") => {
  const ref = doc(db, `organizations/${tenantId}/projects`, projectId);
  await updateDoc(ref, { ...updateData, updatedAt: serverTimestamp() });
};

export const deleteProject = async (projectId, tenantId = "tenant_1") => {
  await moveToHistory('projects', projectId, 'Project', 'Deleted Project', tenantId);
};
export const updateFolder = async (folderId, data, tenantId = "tenant_1") => {
  const docRef = doc(db, `organizations/${tenantId}/folders`, folderId);
  await updateDoc(docRef, data);
};

export const deleteFolder = async (folderId, tenantId = "tenant_1") => {
  const docRef = doc(db, `organizations/${tenantId}/folders`, folderId);
  await deleteDoc(docRef);
};

export const getTasks = async (projectId, tenantId = "tenant_1") => {
  if (!projectId) return [];
  const col = collection(db, `organizations/${tenantId}/projects/${projectId}/tasks`);
  const snapshot = await getDocs(col);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addTask = async (projectId, taskData, tenantId = "tenant_1") => {
  if (!projectId) throw new Error("Project ID is required");
  const col = collection(db, `organizations/${tenantId}/projects/${projectId}/tasks`);
  return await addDoc(col, { ...taskData, createdAt: serverTimestamp() });
};

export const updateTask = async (projectId, taskId, updateData, tenantId = "tenant_1") => {
  const ref = doc(db, `organizations/${tenantId}/projects/${projectId}/tasks`, taskId);
  await updateDoc(ref, { ...updateData, updatedAt: serverTimestamp() });
};

export const deleteTask = async (projectId, taskId, tenantId = "tenant_1") => {
  await moveToHistory(`projects/${projectId}/tasks`, taskId, 'Task', 'Deleted Task', tenantId);
};

export const getContracts = async (tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/contracts`);
  const snapshot = await getDocs(col);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addContract = async (contractData, tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/contracts`);
  return await addDoc(col, { ...contractData, createdAt: serverTimestamp() });
};

export const updateContract = async (contractId, updateData, tenantId = "tenant_1") => {
  const ref = doc(db, `organizations/${tenantId}/contracts`, contractId);
  await updateDoc(ref, { ...updateData, updatedAt: serverTimestamp() });
};

export const deleteContract = async (contractId, tenantId = "tenant_1") => {
  await moveToHistory('contracts', contractId, 'Contract', 'Deleted Contract', tenantId);
};

// --- LAW FIRM: TIME TRACKING ---
export const getTimeEntries = async (tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/time_entries`);
  const snapshot = await getDocs(col);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addTimeEntry = async (entryData, tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/time_entries`);
  return await addDoc(col, { ...entryData, createdAt: serverTimestamp() });
};

export const updateTimeEntry = async (entryId, updateData, tenantId = "tenant_1") => {
  const ref = doc(db, `organizations/${tenantId}/time_entries`, entryId);
  await updateDoc(ref, { ...updateData, updatedAt: serverTimestamp() });
};

export const deleteTimeEntry = async (entryId, tenantId = "tenant_1") => {
  const ref = doc(db, `organizations/${tenantId}/time_entries`, entryId);
  await deleteDoc(ref);
};

// --- LAW FIRM: TRUST ACCOUNTING ---
export const getTrustTransactions = async (tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/trust_transactions`);
  const snapshot = await getDocs(col);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addTrustTransaction = async (transactionData, tenantId = "tenant_1") => {
  const col = collection(db, `organizations/${tenantId}/trust_transactions`);
  return await addDoc(col, { ...transactionData, createdAt: serverTimestamp() });
};
