import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';

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

async function killGhosts() {
  console.log('Checking all users for ghost workspaces...');
  const usersRef = collection(db, 'users');
  const snap = await getDocs(usersRef);
  
  for (const userDoc of snap.docs) {
    const data = userDoc.data();
    if (data.workspaces && data.workspaces.length > 0) {
      let originalLen = data.workspaces.length;
      let validWorkspaces = [];
      
      for (const ws of data.workspaces) {
        // Only keep the workspace if the employee document exists!
        const empRef = doc(db, `organizations/${ws.id}/employees`, userDoc.id);
        const empSnap = await getDoc(empRef);
        if (empSnap.exists()) {
            validWorkspaces.push(ws);
        } else {
            console.log(`User ${userDoc.id} has ghost workspace ${ws.id}. Removing it!`);
        }
      }
      
      if (validWorkspaces.length !== originalLen) {
        await setDoc(userDoc.ref, { workspaces: validWorkspaces }, { merge: true });
        console.log(`Updated user ${userDoc.id} workspaces list.`);
      }
    }
  }
  console.log('Ghost cleanup complete!');
  process.exit(0);
}

killGhosts().catch(console.error);
