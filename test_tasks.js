import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

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

async function test() {
  try {
    const tenantId = "tenant_1"; // Or try the actual tenant
    const projectId = "test_project_123";
    const col = collection(db, `organizations/${tenantId}/projects/${projectId}/tasks`);
    console.log("Attempting to add task...");
    const docRef = await addDoc(col, {
      title: "Test Task",
      status: "todo",
      assignee: "Test User",
      priority: "Medium",
      date: "Oct 12",
      rating: 0,
      comment: "",
      createdAt: serverTimestamp()
    });
    console.log("Success! Task ID:", docRef.id);
    process.exit(0);
  } catch (err) {
    console.error("FAILED TO ADD TASK:", err.message);
    process.exit(1);
  }
}

test();
