import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, setDoc, deleteDoc, doc } from 'firebase/firestore';

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

async function finishMigration() {
  try {
    const tenantId = 'rons';
    const empRef = collection(db, `organizations/${tenantId}/employees`);
    const empSnap = await getDocs(empRef);
    
    let adminDoc = null;
    for (const d of empSnap.docs) {
      if (d.data().role === 'admin' || d.data().role === 'owner') {
        adminDoc = { id: d.id, ...d.data() };
        break;
      }
    }

    if (!adminDoc) {
      console.log("No admin found to migrate.");
      process.exit(0);
    }

    const authUid = "1Q6res1pDJOIE0Bkaj6wHYnSa672";

    if (adminDoc.password) {
      console.log(`Finishing migration for: ${adminDoc.email}`);
      
      const newAdminDoc = { ...adminDoc, id: authUid };
      delete newAdminDoc.password; // Securely remove plain text password

      const newDocRef = doc(db, `organizations/${tenantId}/employees`, authUid);
      await setDoc(newDocRef, newAdminDoc);

      if (adminDoc.id !== authUid) {
        const oldDocRef = doc(db, `organizations/${tenantId}/employees`, adminDoc.id);
        await deleteDoc(oldDocRef);
      }

      console.log("Admin migration complete!");
    } else {
      console.log("Admin already migrated or has no password.");
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

finishMigration();
