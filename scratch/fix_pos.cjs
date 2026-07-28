const fs = require('fs');
let content = fs.readFileSync('src/PosModule.jsx', 'utf8');

const searchStr = `    const unsubWarehouses = onSnapshot(collection(db, \`organizations/\${currentTenant}/warehouses\`), snap => {
      setWarehouses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    if (existing) {`;

const replaceStr = `    const unsubWarehouses = onSnapshot(collection(db, \`organizations/\${currentTenant}/warehouses\`), snap => {
      setWarehouses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubCustomers = onSnapshot(collection(db, \`organizations/\${currentTenant}/customers\`), snap => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubProducts(); unsubCustomers(); unsubWarehouses(); };
  }, [currentTenant]);

  const getFilteredStock = (product) => {
    if (!currentUser?.warehouseId) {
      return Object.values(product.stockByWarehouse || {}).reduce((sum, val) => sum + (Number(val) || 0), 0) || Number(product.stock || 0);
    }
    const branchStock = product.stockByWarehouse || {};
    return Number(branchStock[currentUser.warehouseId] || 0);
  };

  const addToCart = (product) => {
    const availableStock = getFilteredStock(product);
    const existing = cart.find(item => item.id === product.id);
    if (existing) {`;

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync('src/PosModule.jsx', content);
  console.log('PosModule restored successfully.');
} else {
  console.log('Could not find search string in PosModule.jsx!');
}
