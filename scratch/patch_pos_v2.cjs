const fs = require('fs');
let content = fs.readFileSync('src/PosModule.jsx', 'utf8');

// 1. Add warehouses state
if (!content.includes('warehouses')) {
  content = content.replace('const [customers, setCustomers] = useState([]);', 'const [customers, setCustomers] = useState([]);\n  const [warehouses, setWarehouses] = useState([]);');

  // 2. Fetch warehouses
  content = content.replace('const unsubCustomers = onSnapshot(collection(db, `organizations/${currentTenant}/customers`), snap => {', 'const unsubWarehouses = onSnapshot(collection(db, `organizations/${currentTenant}/warehouses`), snap => {\n      setWarehouses(snap.docs.map(d => ({ id: d.id, ...d.data() })));\n    });\n    const unsubCustomers = onSnapshot(collection(db, `organizations/${currentTenant}/customers`), snap => {');

  // 3. Update return cleanup
  content = content.replace('return () => { unsubProducts(); unsubCustomers(); };', 'return () => { unsubProducts(); unsubCustomers(); unsubWarehouses(); };');
}

// 4. Update getFilteredStock logic
const oldGetFiltered = `  const getFilteredStock = (product) => {
    if (!currentUser?.warehouseId) return Number(product.stock || 0);
    const branchStock = product.stockByWarehouse || {};
    return Number(branchStock[currentUser.warehouseId] || 0);
  };`;

const newGetFiltered = `  const activeWarehouseId = currentUser?.warehouseId || (warehouses.length > 0 ? warehouses[0].id : null);
  
  const getFilteredStock = (product) => {
    if (!activeWarehouseId) return Object.values(product.stockByWarehouse || {}).reduce((sum, val) => sum + (Number(val) || 0), 0) || Number(product.stock || 0);
    const branchStock = product.stockByWarehouse || {};
    return Number(branchStock[activeWarehouseId] || 0);
  };`;

content = content.replace(oldGetFiltered, newGetFiltered);

// 5. Replace deduction logic in handleCheckout
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

// Fix 6: The left panel "shrink" issue in POS.
// It seems the left panel might be shrinking because of flexbox. 
// Old: className={`w-full md:w-[450px] bg-white border-r border-slate-200 flex-col shadow-2xl z-10 h-full \${mobileView === 'cart' ? 'flex' : 'hidden md:flex'}`}
// New: className={`w-full md:w-[450px] shrink-0 bg-white border-r border-slate-200 flex-col shadow-2xl z-10 h-full \${mobileView === 'cart' ? 'flex' : 'hidden md:flex'}`}
const oldPanel = `className={\`w-full md:w-[450px] bg-white border-r border-slate-200 flex-col shadow-2xl z-10 h-full \${mobileView === 'cart' ? 'flex' : 'hidden md:flex'}\`}`;
const newPanel = `className={\`w-full md:w-[450px] shrink-0 bg-white border-r border-slate-200 flex-col shadow-2xl z-10 h-full \${mobileView === 'cart' ? 'flex' : 'hidden md:flex'}\`}`;
content = content.replace(oldPanel, newPanel);

fs.writeFileSync('src/PosModule.jsx', content);
console.log('PosModule patched successfully!');
