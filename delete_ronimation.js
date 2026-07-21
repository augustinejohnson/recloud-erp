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

const tenantId = 'ronimationstudios';
const subcollections = [
  'config', 'employees', 'customers', 'deals', 'invoices', 
  'products', 'stockMovements', 'warehouses', 'suppliers', 
  'purchaseOrders', 'branchOrders', 'b2bOrders', 'history', 
  'documents', 'projects'
];

async function deleteTenant() {
  console.log(`Starting deletion for tenant: ${tenantId}...`);

  for (const subName of subcollections) {
    const subColRef = collection(db, `organizations/${tenantId}/${subName}`);
    try {
      const snapshot = await getDocs(subColRef);
      if (!snapshot.empty) {
        console.log(`Deleting ${snapshot.size} documents from subcollection: ${subName}...`);
        for (const document of snapshot.docs) {
          await deleteDoc(doc(db, `organizations/${tenantId}/${subName}/${document.id}`));
        }
        console.log(`Deleted subcollection: ${subName}`);
      } else {
        console.log(`Subcollection ${subName} is already empty.`);
      }
    } catch (e) {
      console.error(`Error deleting subcollection ${subName}:`, e);
    }
  }

  // Delete main tenant doc
  try {
    console.log(`Deleting main tenant document...`);
    await deleteDoc(doc(db, `organizations/${tenantId}`));
    console.log(`Successfully deleted main tenant document.`);
  } catch (e) {
    console.error(`Error deleting main document:`, e);
  }

  console.log(`Deletion script finished.`);
  process.exit(0);
}

deleteTenant();
