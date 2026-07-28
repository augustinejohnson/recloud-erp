const fs = require('fs');
let content = fs.readFileSync('src/PosModule.jsx', 'utf8');

if (!content.includes('const [warehouses, setWarehouses]')) {
  // Add warehouses state
  content = content.replace('const [customers, setCustomers] = useState([]);', 'const [customers, setCustomers] = useState([]);\n  const [warehouses, setWarehouses] = useState([]);');

  // Add fetch warehouses
  content = content.replace('const unsubCustomers = onSnapshot(collection(db, `organizations/${currentTenant}/customers`), snap => {', 'const unsubWarehouses = onSnapshot(collection(db, `organizations/${currentTenant}/warehouses`), snap => {\n      setWarehouses(snap.docs.map(d => ({ id: d.id, ...d.data() })));\n    });\n    const unsubCustomers = onSnapshot(collection(db, `organizations/${currentTenant}/customers`), snap => {');

  content = content.replace('return () => { unsubProducts(); unsubCustomers(); };', 'return () => { unsubProducts(); unsubCustomers(); unsubWarehouses(); };');

  // Helper for active warehouse
  const activeW = `
  const activeWarehouseId = currentUser?.warehouseId || (warehouses.length > 0 ? warehouses[0].id : null);
  
  const getFilteredStock = (product) => {
    if (!activeWarehouseId) return Object.values(product.stockByWarehouse || {}).reduce((sum, val) => sum + (Number(val) || 0), 0) || Number(product.stock || 0);
    const branchStock = product.stockByWarehouse || {};
    return Number(branchStock[activeWarehouseId] || 0);
  };`;

  content = content.replace(/const getFilteredStock = \([\s\S]*?\};\n/, activeW + '\n');

  // Replace deduction logic in handleCheckout
  const oldDeduct = `          if (currentUser?.warehouseId) {
             const currentBranchStock = Number(item.stockByWarehouse?.[currentUser.warehouseId] || 0);
             const updatedStockByWarehouse = { 
               ...(item.stockByWarehouse || {}), 
               [currentUser.warehouseId]: currentBranchStock - item.quantity 
             };
             await updateDoc(prodRef, { stockByWarehouse: updatedStockByWarehouse });
             
             // Optionally record movement (basic)
             const movementsRef = collection(db, \`organizations/\${currentTenant}/stockMovements\`);
             await addDoc(movementsRef, {
               productId: item.id,
               type: 'out',
               qty: item.quantity,
               warehouseId: currentUser.warehouseId,
               note: \`POS Sale (Invoice)\`,
               date: new Date().toISOString()
             });
          } else {
             await updateDoc(prodRef, { stock: Number(item.stock || 0) - item.quantity });
             const movementsRef = collection(db, \`organizations/\${currentTenant}/stockMovements\`);
             await addDoc(movementsRef, {
               productId: item.id,
               type: 'out',
               qty: item.quantity,
               warehouseId: 'HQ',
               note: \`POS Sale (Invoice)\`,
               date: new Date().toISOString()
             });
          }`;

  const newDeduct = `          if (activeWarehouseId) {
             const currentBranchStock = Number(item.stockByWarehouse?.[activeWarehouseId] || 0);
             const updatedStockByWarehouse = { 
               ...(item.stockByWarehouse || {}), 
               [activeWarehouseId]: currentBranchStock - item.quantity 
             };
             await updateDoc(prodRef, { stockByWarehouse: updatedStockByWarehouse });
             
             const movementsRef = collection(db, \`organizations/\${currentTenant}/stockMovements\`);
             await addDoc(movementsRef, {
               productId: item.id,
               type: 'out',
               qty: item.quantity,
               warehouseId: activeWarehouseId,
               note: \`POS Sale (Invoice)\`,
               date: new Date().toISOString()
             });
          } else {
             await updateDoc(prodRef, { stock: Number(item.stock || 0) - item.quantity });
          }`;

  content = content.replace(oldDeduct, newDeduct);
  
  fs.writeFileSync('src/PosModule.jsx', content);
  console.log('Patched POS Stock logic');
} else {
  console.log('Already patched POS');
}
