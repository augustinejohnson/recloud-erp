import { initializeApp } from 'firebase/app';
import { getFirestore, collectionGroup, getDocs } from 'firebase/firestore';

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

async function findData() {
  const productsGroup = collectionGroup(db, 'products');
  try {
      const snap = await getDocs(productsGroup);
      const paths = new Set();
      snap.docs.forEach(doc => {
          const path = doc.ref.path;
          paths.add(path.split('/')[1]); // organizations / [tenantId] / products
      });
      console.log("Tenants with products:");
      console.log(Array.from(paths));
  } catch (err) {
      console.error(err);
  }
  process.exit(0);
}

findData();
