import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, collection, getDocs, setDoc, deleteDoc } from 'firebase/firestore';

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
const auth = getAuth(app);
const db = getFirestore(app);

async function migrateAdmin() {
  try {
    const tenantId = 'rons';
    const empRef = collection(db, `organizations/${tenantId}/employees`);
    const empSnap = await getDocs(empRef);
    
    let adminDoc = null;
    for (const doc of empSnap.docs) {
      if (doc.data().role === 'admin' || doc.data().role === 'owner') {
        adminDoc = { id: doc.id, ...doc.data() };
        break;
      }
    }

    if (!adminDoc) {
      console.log("No admin found to migrate.");
      process.exit(0);
    }

    if (adminDoc.password) {
      console.log(`Found admin: ${adminDoc.email}. Migrating to Firebase Auth...`);
      try {
        const userCred = await createUserWithEmailAndPassword(auth, adminDoc.email, adminDoc.password);
        console.log(`Firebase Auth user created with UID: ${userCred.user.uid}`);
        
        // Recreate the document with the new UID
        const newAdminDoc = { ...adminDoc, id: userCred.user.uid };
        delete newAdminDoc.password; // Securely remove plain text password

        const newDocRef = doc(db, `organizations/${tenantId}/employees`, userCred.user.uid);
        await setDoc(newDocRef, newAdminDoc);

        // Delete the old document
        const oldDocRef = doc(db, `organizations/${tenantId}/employees`, adminDoc.id);
        await deleteDoc(oldDocRef);

        console.log("Admin migration complete!");
      } catch (err) {
        console.error("Error creating auth user. Maybe already exists? ", err.message);
      }
    } else {
      console.log("Admin already migrated or has no password.");
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

migrateAdmin();
