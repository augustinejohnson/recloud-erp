import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

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
const db = getFirestore(app);

const tenantId = 'tenant_1';

const collectionsToWipe = [
  'products', 'customers', 'deals', 'invoices', 'ledger', 'expenses', 'sales',
  'b2b_orders', 'stockMovements', 'warehouses', 'suppliers', 'purchaseOrders',
  'branchOrders', 'projects', 'timeEntries', 'chatChannels', 'history', 'shifts',
  'leave_requests', 'payslips', 'documents', 'reviews', 'jobs', 'applicants'
];

async function wipeData() {
  console.log(`Starting test data wipe for ${tenantId}...`);

  for (const colName of collectionsToWipe) {
    const colRef = collection(db, `organizations/${tenantId}/${colName}`);
    const snapshot = await getDocs(colRef);
    let count = 0;
    for (const docSnap of snapshot.docs) {
      await deleteDoc(doc(db, `organizations/${tenantId}/${colName}`, docSnap.id));
      count++;
    }
    console.log(`Deleted ${count} documents from ${colName}`);
  }

  // Handle employees specially (don't delete admins so the user doesn't get locked out)
  const empRef = collection(db, `organizations/${tenantId}/employees`);
  const empSnap = await getDocs(empRef);
  let empCount = 0;
  for (const docSnap of empSnap.docs) {
    const data = docSnap.data();
    if (data.role !== 'admin' && data.role !== 'owner') {
      await deleteDoc(doc(db, `organizations/${tenantId}/employees`, docSnap.id));
      empCount++;
    } else {
      console.log(`Skipped admin employee: ${data.name || docSnap.id} to prevent lockout.`);
    }
  }
  console.log(`Deleted ${empCount} non-admin employees`);

  console.log('Test data wipe completely finished! You are ready to start fresh.');
  process.exit(0);
}

wipeData().catch(err => {
    console.error("Failed to wipe data:", err);
    process.exit(1);
});
