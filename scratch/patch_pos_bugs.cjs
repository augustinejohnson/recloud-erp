const fs = require('fs');
let content = fs.readFileSync('src/PosModule.jsx', 'utf8');

// 1. Fix inventory -> products
if (content.includes('organizations/${currentTenant}/inventory')) {
  content = content.replace('organizations/${currentTenant}/inventory', 'organizations/${currentTenant}/products');
  console.log('Fixed inventory -> products collection!');
}

// 2. Fix getFilteredStock
const getFilteredStockOld = `  const getFilteredStock = (product) => {
    if (!currentUser?.warehouseId) return Number(product.stock || 0);
    const branchStock = product.stockByWarehouse || {};
    return Number(branchStock[currentUser.warehouseId] || 0);
  };`;

const getFilteredStockNew = `  const getFilteredStock = (product) => {
    if (!currentUser?.warehouseId) {
      return Object.values(product.stockByWarehouse || {}).reduce((sum, val) => sum + (Number(val) || 0), 0) || Number(product.stock || 0);
    }
    const branchStock = product.stockByWarehouse || {};
    return Number(branchStock[currentUser.warehouseId] || 0);
  };`;

if (content.includes(getFilteredStockOld)) {
  content = content.replace(getFilteredStockOld, getFilteredStockNew);
  console.log('Fixed getFilteredStock!');
} else {
  // Try CRLF
  const getFilteredStockOldCRLF = getFilteredStockOld.replace(/\n/g, '\r\n');
  if (content.includes(getFilteredStockOldCRLF)) {
    content = content.replace(getFilteredStockOldCRLF, getFilteredStockNew.replace(/\n/g, '\r\n'));
    console.log('Fixed getFilteredStock (CRLF)!');
  } else {
    console.log('Could not find getFilteredStock to patch!');
  }
}

fs.writeFileSync('src/PosModule.jsx', content);
