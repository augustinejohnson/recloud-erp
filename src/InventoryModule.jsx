import React, { useState } from 'react';
import { 
  Package, LayoutGrid, List, ArrowRightLeft, Tags, Building, 
  Search, Plus, Trash2, Edit, X, TrendingUp, AlertTriangle, 
  Download, Filter, ChevronDown, Check, Truck, ShoppingCart, CheckCircle2, XCircle, UploadCloud, DownloadCloud
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { addProduct, updateProduct, deleteProduct, addStockMovement, addWarehouse, deleteWarehouse, addSupplier, deleteSupplier, addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, updateEmployee, addBranchOrder, updateBranchOrder, deleteBranchOrder, updateB2BOrder } from './firebase';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function InventoryModule({ 
  products = [], 
  stockMovements = [], 
  warehouses = [], 
  suppliers = [],
  purchaseOrders = [],
  branchOrders = [],
  b2bOrders = [],
  currentTenant, 
  tenantConfig,
  currentUser,
  refreshData 
}) {
  const isBranchRestricted = currentUser?.role?.toLowerCase() !== 'admin' && currentUser?.warehouseId;
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, products, stock, movements, categories, warehouses
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(isBranchRestricted ? currentUser.warehouseId : 'all');


  // Modals state
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [isBulkPriceEditOpen, setIsBulkPriceEditOpen] = useState(false);
  const [bulkPrices, setBulkPrices] = useState({});
  const [bulkPriceSearchQuery, setBulkPriceSearchQuery] = useState('');
  const [selectedBulkProducts, setSelectedBulkProducts] = useState(new Set());
  const [isStockMovementOpen, setIsStockMovementOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAddWarehouseOpen, setIsAddWarehouseOpen] = useState(false);
  const [isCreatePOOpen, setIsCreatePOOpen] = useState(false);
  const [isCreateBranchOrderOpen, setIsCreateBranchOrderOpen] = useState(false);
  const [isBulkReceiveOpen, setIsBulkReceiveOpen] = useState(false);
  const [selectedB2BOrder, setSelectedB2BOrder] = useState(null);

  // Form states
  const initialProductState = { name: '', genericName: '', description: '', category: '', subCategory: '', sku: '', costPrice: '', priceStaff: '', priceDistributor: '', priceWholesale: '', batchNumber: '', expiryDate: '', image: '', stockByWarehouse: {}, minStockLevel: '10', supplierId: '', initialQty: '', initialWarehouseId: '' };
  const [newProduct, setNewProduct] = useState(initialProductState);
  const [editProductData, setEditProductData] = useState(null);
  
  const [movementForm, setMovementForm] = useState({ productId: '', type: 'in', qty: '', warehouseId: '', note: '', category: '', subCategory: '' });
  const [transferForm, setTransferForm] = useState({ productId: '', fromWarehouseId: '', toWarehouseId: '', qty: '', note: '' });
  const [newWarehouse, setNewWarehouse] = useState({ name: '', location: '' });
  const [newSupplier, setNewSupplier] = useState({ name: '', contactName: '', phone: '', email: '', address: '' });
  
  const [newPO, setNewPO] = useState({ supplierId: '', expectedDate: '', destinationWarehouseId: '', note: '', items: [] });
  const [poCurrentItem, setPoCurrentItem] = useState({ productId: '', qty: '', unitCost: '' });
  
  const [newBranchOrder, setNewBranchOrder] = useState({ requestedWarehouseId: isBranchRestricted ? currentUser.warehouseId : '', expectedDate: '', note: '', items: [] });
  const [branchOrderCurrentItem, setBranchOrderCurrentItem] = useState({ productId: '', qty: '' });

  const [bulkReceiveForm, setBulkReceiveForm] = useState({ month: new Date().toLocaleString('default', { month: 'long' }), year: String(new Date().getFullYear()), day: String(new Date().getDate()), waybill: '', items: {} });

  // Unique categories derived from products
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const subCategories = [...new Set(products.map(p => p.subCategory).filter(Boolean))];

  // Helpers
  const getProductTotalStock = (product) => {
    if (!product.stockByWarehouse) return 0;
    return Object.values(product.stockByWarehouse).reduce((sum, val) => sum + (Number(val) || 0), 0);
  };

  const getFilteredStock = (product) => {
    if (selectedWarehouseId === 'all') return getProductTotalStock(product);
    return Number(product.stockByWarehouse?.[selectedWarehouseId]) || 0;
  };

  const totalInventoryValue = products.reduce((sum, p) => sum + (getFilteredStock(p) * (Number(p.priceWholesale) || 0)), 0);
  const lowStockProducts = products.filter(p => {
    const minStock = Number(p.minStockLevel) || 10;
    return getFilteredStock(p) <= minStock && getFilteredStock(p) > 0;
  });
  const criticalStockProducts = products.filter(p => getFilteredStock(p) <= 0);
  
  const expiringSoonCount = products.filter(p => {
    if (!p.expiryDate) return false;
    const daysToExpiry = (new Date(p.expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
    return daysToExpiry > 0 && daysToExpiry <= 90;
  }).length;

  // Handlers
  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const { initialQty, initialWarehouseId, ...productData } = newProduct;
      if (Number(initialQty) > 0 && initialWarehouseId) {
        productData.stockByWarehouse = { [initialWarehouseId]: Number(initialQty) };
      }
      
      const docRef = await addProduct(productData, currentTenant);
      
      if (Number(initialQty) > 0 && initialWarehouseId) {
        await addStockMovement({
          productId: docRef.id,
          type: 'in',
          qty: Number(initialQty),
          warehouseId: initialWarehouseId,
          note: 'Initial Stock',
          previousStock: 0,
          newStock: Number(initialQty),
          date: new Date().toISOString()
        }, currentTenant);
      }

      setIsAddProductOpen(false);
      setNewProduct(initialProductState);
      refreshData();
    } catch (err) { console.error(err); }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    try {
      const { id, ...data } = editProductData;
      await updateProduct(id, data, currentTenant);
      setIsEditProductOpen(false);
      refreshData();
    } catch (err) { console.error(err); }
  };

  const handleDeleteProduct = async (id) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id, currentTenant);
        refreshData();
      } catch (err) { console.error(err); }
    }
  };

  const handleStockMovement = async (e) => {
    e.preventDefault();
    try {
      const prod = products.find(p => p.id === movementForm.productId);
      if (!prod) return;
      
      const qty = Number(movementForm.qty);
      const currentStock = Number(prod.stockByWarehouse?.[movementForm.warehouseId] || 0);
      const newStock = movementForm.type === 'in' ? currentStock + qty : currentStock - qty;

      if (movementForm.type === 'out' && newStock < 0) {
        alert('Insufficient stock at this warehouse.');
        return;
      }

      await addStockMovement({
        ...movementForm, qty, previousStock: currentStock, newStock, date: new Date().toISOString()
      }, currentTenant);

      const updatedStockByWarehouse = { ...(prod.stockByWarehouse || {}), [movementForm.warehouseId]: newStock };
      const updatedProductData = { stockByWarehouse: updatedStockByWarehouse };
      if (movementForm.type === 'in') {
        if (movementForm.category) updatedProductData.category = movementForm.category;
        if (movementForm.subCategory) updatedProductData.subCategory = movementForm.subCategory;
      }
      await updateProduct(prod.id, updatedProductData, currentTenant);

      setIsStockMovementOpen(false);
      setMovementForm({ productId: '', type: 'in', qty: '', warehouseId: isBranchRestricted ? currentUser.warehouseId : '', note: '', category: '', subCategory: '' });
      refreshData();
    } catch (err) { console.error(err); }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    try {
      if (transferForm.fromWarehouseId === transferForm.toWarehouseId) {
        alert("Source and destination cannot be the same.");
        return;
      }

      const prod = products.find(p => p.id === transferForm.productId);
      if (!prod) return;

      const qty = Number(transferForm.qty);
      const fromCurrent = Number(prod.stockByWarehouse?.[transferForm.fromWarehouseId] || 0);
      const toCurrent = Number(prod.stockByWarehouse?.[transferForm.toWarehouseId] || 0);

      if (fromCurrent < qty) {
        alert("Insufficient stock at source warehouse.");
        return;
      }

      // Log out
      await addStockMovement({
        productId: prod.id, type: 'transfer-out', qty, warehouseId: transferForm.fromWarehouseId,
        note: `Transfer to warehouse: ${transferForm.toWarehouseId} - ${transferForm.note}`,
        previousStock: fromCurrent, newStock: fromCurrent - qty, date: new Date().toISOString()
      }, currentTenant);

      // Log in
      await addStockMovement({
        productId: prod.id, type: 'transfer-in', qty, warehouseId: transferForm.toWarehouseId,
        note: `Transfer from warehouse: ${transferForm.fromWarehouseId} - ${transferForm.note}`,
        previousStock: toCurrent, newStock: toCurrent + qty, date: new Date().toISOString()
      }, currentTenant);

      const updatedStockByWarehouse = { 
        ...(prod.stockByWarehouse || {}), 
        [transferForm.fromWarehouseId]: fromCurrent - qty,
        [transferForm.toWarehouseId]: toCurrent + qty
      };
      await updateProduct(prod.id, { stockByWarehouse: updatedStockByWarehouse }, currentTenant);

      setIsTransferOpen(false);
      setTransferForm({ productId: '', fromWarehouseId: '', toWarehouseId: '', qty: '', note: '' });
      refreshData();
    } catch (err) { console.error(err); }
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // We only process CSV for simplicity.
    const text = await file.text();
    // basic CSV regex to ignore commas inside quotes
    const re = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
    const rows = text.split('\n').filter(row => row.trim().length > 0);
    if (rows.length < 2) {
      alert("Invalid CSV or empty file.");
      return;
    }

    const headers = rows[0].split(re).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
    
    const nameIdx = headers.findIndex(h => h.includes('brand') || h.includes('name'));
    const genericIdx = headers.findIndex(h => h.includes('generic'));
    const staffPriceIdx = headers.findIndex(h => h.includes('staff'));
    const wholesalePriceIdx = headers.findIndex(h => h.includes('wholesale'));
    const distPriceIdx = headers.findIndex(h => h.includes('distributor'));
    const catIdx = headers.findIndex(h => h.includes('category') && !h.includes('sub'));
    const subCatIdx = headers.findIndex(h => h.includes('sub') && h.includes('category'));

    if (nameIdx === -1) {
      alert("Could not find a 'Brand Name' or 'Name' column in the CSV.");
      return;
    }

    let successCount = 0;
    // We won't block UI entirely, but we'll show a quick alert after it's done.
    // For large files, we might want a loading spinner. The app doesn't have a global loader here but we can rely on standard alerts.
    for (let i = 1; i < rows.length; i++) {
       const cols = rows[i].split(re).map(col => col.replace(/^"|"$/g, '').trim());
       if (cols.length < 2 || !cols[nameIdx]) continue;
       
       const p = {
         ...initialProductState,
         name: cols[nameIdx] || '',
         genericName: genericIdx !== -1 ? cols[genericIdx] : '',
         category: catIdx !== -1 ? cols[catIdx] : 'Imported',
         subCategory: subCatIdx !== -1 ? cols[subCatIdx] : '',
         costPrice: staffPriceIdx !== -1 ? cols[staffPriceIdx].replace(/[^\d.]/g, '') || '0' : '0', // Fallback for old CSVs, ideally should have a costPrice col
         priceStaff: staffPriceIdx !== -1 ? cols[staffPriceIdx].replace(/[^\d.]/g, '') || '0' : '0',
         priceWholesale: wholesalePriceIdx !== -1 ? cols[wholesalePriceIdx].replace(/[^\d.]/g, '') || '0' : '0',
         priceDistributor: distPriceIdx !== -1 ? cols[distPriceIdx].replace(/[^\d.]/g, '') : (wholesalePriceIdx !== -1 ? cols[wholesalePriceIdx].replace(/[^\d.]/g, '') || '0' : '0'),
       };
       try {
         await addProduct(p, currentTenant);
         successCount++;
       } catch(e) {
         console.error("Failed to import row", i, e);
       }
    }
    
    alert(`Successfully imported ${successCount} products from CSV!`);
    refreshData();
    // reset input
    e.target.value = null;
  };

  const handleReverseStockMovement = async (movement) => {
    if (!confirm('Are you sure you want to reverse this stock movement?')) return;
    try {
      const prod = products.find(p => p.id === movement.productId);
      if (!prod) return;

      const reverseType = movement.type === 'in' ? 'out' : 'in';
      const qty = Number(movement.qty);
      const currentStock = Number(prod.stockByWarehouse?.[movement.warehouseId] || 0);
      const newStock = reverseType === 'in' ? currentStock + qty : currentStock - qty;

      if (reverseType === 'out' && newStock < 0) {
        alert('Cannot reverse this Stock In because it would result in negative stock.');
        return;
      }

      await addStockMovement({
        productId: movement.productId,
        type: reverseType,
        qty,
        warehouseId: movement.warehouseId,
        note: `REVERSAL of Movement #${movement.id?.slice(-6) || 'Unknown'} - ${movement.note}`,
        previousStock: currentStock,
        newStock,
        date: new Date().toISOString(),
        isReversal: true,
        originalMovementId: movement.id
      }, currentTenant);

      const updatedStockByWarehouse = { ...(prod.stockByWarehouse || {}), [movement.warehouseId]: newStock };
      await updateProduct(movement.productId, { stockByWarehouse: updatedStockByWarehouse }, currentTenant);
      
      // Optionally mark original movement as reversed if we added an update function for movements
      // But adding an opposite movement is standard accounting practice.

      refreshData();
      alert('Movement reversed successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to reverse stock movement.');
    }
  };

  const handleBulkReceiveStock = async (e) => {
    e.preventDefault();
    try {
      const itemsToReceive = Object.entries(bulkReceiveForm.items).filter(([id, qty]) => Number(qty) > 0);
      if (itemsToReceive.length === 0) {
        alert("No quantities entered.");
        return;
      }
      if (isBranchRestricted && !currentUser.warehouseId) {
        alert("You must be assigned to a warehouse to receive stock.");
        return;
      }

      const targetWarehouse = isBranchRestricted ? currentUser.warehouseId : (warehouses.length > 0 ? warehouses[0].id : '');
      if (!targetWarehouse && !isBranchRestricted && warehouses.length === 0) {
          alert("Create a warehouse first.");
          return;
      }

      let successCount = 0;
      for (const [productId, qtyStr] of itemsToReceive) {
        const qty = Number(qtyStr);
        const prod = products.find(p => p.id === productId);
        if (!prod) continue;
        
        const currentStock = Number(prod.stockByWarehouse?.[targetWarehouse] || 0);
        const newStock = currentStock + qty;

        await addStockMovement({
          productId, 
          type: 'in', 
          qty, 
          warehouseId: targetWarehouse, 
          note: `Bulk Receive ${bulkReceiveForm.waybill ? 'INV: '+bulkReceiveForm.waybill : ''}`, 
          previousStock: currentStock, 
          newStock, 
          date: new Date(`${bulkReceiveForm.year}-${bulkReceiveForm.month}-${bulkReceiveForm.day}`).toISOString()
        }, currentTenant);

        const updatedStockByWarehouse = { ...(prod.stockByWarehouse || {}), [targetWarehouse]: newStock };
        await updateProduct(productId, { stockByWarehouse: updatedStockByWarehouse }, currentTenant);
        successCount++;
      }

      setIsBulkReceiveOpen(false);
      setBulkReceiveForm({ month: new Date().toLocaleString('default', { month: 'long' }), year: String(new Date().getFullYear()), day: String(new Date().getDate()), waybill: '', items: {} });
      refreshData();
      alert(`Successfully received ${successCount} items!`);
    } catch (err) {
      console.error(err);
      alert("Failed to bulk receive stock");
    }
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!newSupplier.name) return;
    try {
      await addSupplier(newSupplier, currentTenant);
      setNewSupplier({ name: '', contactName: '', phone: '', email: '', address: '' });
      refreshData();
    } catch (err) {
      console.error(err);
      alert("Failed to add supplier");
    }
  };

  const handleCreateBranchOrder = async (e) => {
    e.preventDefault();
    if (newBranchOrder.items.length === 0) {
      alert("Please add items to the requisition.");
      return;
    }
    try {
      await addBranchOrder({
        ...newBranchOrder,
        requestingWarehouseId: currentUser.warehouseId,
        requestingUser: currentUser.name || currentUser.email,
        orderDate: new Date().toISOString()
      }, currentTenant);
      
      setNewBranchOrder({ requestedWarehouseId: isBranchRestricted ? currentUser.warehouseId : '', expectedDate: '', note: '', items: [] });
      setIsCreateBranchOrderOpen(false);
      refreshData();
      alert("Branch Requisition submitted successfully!");
    } catch(err) { console.error(err); alert("Failed to submit requisition."); }
  };

  const handleFulfillBranchOrder = async (order) => {
    if (!confirm('Are you sure you want to fulfill this requisition? This will transfer stock from Global/HQ to the requesting branch.')) return;
    try {
      // Create transfers for each item
      const hqWarehouseId = warehouses[0]?.id || 'global';
      for (const item of order.items) {
        const prod = products.find(p => p.id === item.productId);
        if (!prod) continue;
        const qty = Number(item.qty);
        const fromStock = Number(prod.stockByWarehouse?.[hqWarehouseId] || 0);
        const toStock = Number(prod.stockByWarehouse?.[order.requestingWarehouseId] || 0);

        if (fromStock < qty) {
           alert(`Insufficient HQ stock for ${prod.name}. Expected ${qty}, got ${fromStock}. Fulfilling what we can or skipping.`);
        }

        await addStockMovement({
          productId: prod.id, type: 'transfer-out', qty, warehouseId: hqWarehouseId,
          note: `Fulfill Requisition #${order.id.slice(-6)} to Branch`, previousStock: fromStock, newStock: fromStock - qty, date: new Date().toISOString()
        }, currentTenant);

        await addStockMovement({
          productId: prod.id, type: 'transfer-in', qty, warehouseId: order.requestingWarehouseId,
          note: `Receive Requisition #${order.id.slice(-6)} from HQ`, previousStock: toStock, newStock: toStock + qty, date: new Date().toISOString()
        }, currentTenant);

        const updatedStockByWarehouse = { ...(prod.stockByWarehouse || {}), [hqWarehouseId]: fromStock - qty, [order.requestingWarehouseId]: toStock + qty };
        await updateProduct(prod.id, { stockByWarehouse: updatedStockByWarehouse }, currentTenant);
      }

      await updateBranchOrder(order.id, { status: 'Fulfilled', fulfilledDate: new Date().toISOString() }, currentTenant);
      refreshData();
      alert("Requisition fulfilled successfully!");
    } catch(err) { console.error(err); alert("Failed to fulfill requisition."); }
  };

  const handleAddWarehouse = async (e) => {
    e.preventDefault();
    try {
      await addWarehouse(newWarehouse, currentTenant);
      setNewWarehouse({ name: '', location: '' });
      setIsAddWarehouseOpen(false);
      refreshData();
    } catch (err) { console.error(err); alert("Failed to add warehouse"); }
  };

  const handleAddPOItem = () => {
    if (!poCurrentItem.productId || !poCurrentItem.qty || !poCurrentItem.unitCost) return;
    setNewPO({
      ...newPO,
      items: [...newPO.items, { ...poCurrentItem }]
    });
    setPoCurrentItem({ productId: '', qty: '', unitCost: '' });
  };

  const handleCreatePO = async (e) => {
    e.preventDefault();
    if (newPO.items.length === 0) return alert("Add at least one item to the PO");
    try {
      await addPurchaseOrder({
        ...newPO,
        status: 'pending',
        totalAmount: newPO.items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.unitCost)), 0)
      }, currentTenant);
      setNewPO({ supplierId: '', expectedDate: '', destinationWarehouseId: '', note: '', items: [] });
      setIsCreatePOOpen(false);
      refreshData();
    } catch (err) { console.error(err); alert("Failed to create PO"); }
  };

  const handleUpdatePOStatus = async (po, newStatus) => {
    try {
      if (newStatus === 'delivered') {
        // Automatically receive stock for all items
        for (const item of po.items) {
          await addStockMovement({
            productId: item.productId,
            type: 'in',
            qty: Number(item.qty),
            warehouseId: po.destinationWarehouseId,
            note: `Received from PO: ${po.id}`
          }, currentTenant);
        }
      }
      await updatePurchaseOrder(po.id, { status: newStatus }, currentTenant);
      refreshData();
    } catch (err) { console.error(err); alert("Failed to update PO status"); }
  };

  const generateLPOPdf = (po) => {
    const doc = new jsPDF();
    const supplier = suppliers.find(s => s.id === po.supplierId);
    const destWarehouse = warehouses.find(w => w.id === po.destinationWarehouseId);
    
    // Top Left: Company
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(tenantConfig?.companyName || 'Our Company', 14, 20);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(destWarehouse ? `Branch: ${destWarehouse.name}` : 'Main Branch', 14, 25);
    if(destWarehouse?.location) doc.text(destWarehouse.location, 14, 30);

    // Top Right: Title and Meta
    doc.setFontSize(22);
    doc.setFont("helvetica", "normal");
    doc.text("Purchase Order", 130, 20);
    
    doc.setFontSize(8);
    doc.text(`DATE: ${new Date(po.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString('en-GB')}`, 150, 28);
    doc.text(`PO #: ${po.id.substring(0, 5).toUpperCase()}`, 150, 32);
    doc.text(`Prepared By: ${currentUser?.name || 'Admin'}`, 150, 36);

    // Bill From Section
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Bill From:", 14, 45);
    doc.setFont("helvetica", "normal");
    doc.text(`Name    : ${supplier ? supplier.name : 'Unknown'}`, 14, 52);
    doc.text(`Address : ${supplier?.address || ''}`, 14, 57);
    doc.text(`Phone   : ${supplier?.phone || ''}`, 14, 62);
    doc.text(`Terms   : ${po.note || 'Payment on Delivery'}`, 14, 67);

    // Table
    const tableColumn = ["Code", "Description", "Qty", "Unit Price", "Disc.", "Total Price"];
    const tableRows = [];
    let totalQty = 0;

    po.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      totalQty += Number(item.qty);
      const rowData = [
        product?.sku || product?.id?.substring(0, 6).toUpperCase() || 'N/A',
        product ? product.name : 'Unknown Product',
        item.qty,
        Number(item.unitCost).toLocaleString(undefined, { minimumFractionDigits: 2 }),
        "0.00 %",
        (Number(item.qty) * Number(item.unitCost)).toLocaleString(undefined, { minimumFractionDigits: 2 })
      ];
      tableRows.push(rowData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 75,
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 30 },
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' }
      }
    });

    // Totals Section
    const finalY = doc.lastAutoTable.finalY;
    const grossTotal = po.totalAmount || 0;
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Total Qty", 100, finalY + 6);
    doc.text(totalQty.toString(), 125, finalY + 6, { align: "right" });
    
    doc.text("Gross Total", 150, finalY + 6);
    doc.text(grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }), 195, finalY + 6, { align: "right" });
    
    doc.setFont("helvetica", "normal");
    doc.text("Discount", 150, finalY + 11);
    doc.text("0.00", 195, finalY + 11, { align: "right" });
    
    doc.text("VAT 0%", 150, finalY + 16);
    doc.text("0.00", 195, finalY + 16, { align: "right" });
    
    doc.setFont("helvetica", "bold");
    doc.text("NET Total", 150, finalY + 21);
    doc.text(grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }), 195, finalY + 21, { align: "right" });

    // Signature & Footer
    doc.setLineWidth(0.5);
    doc.line(14, finalY + 40, 60, finalY + 40); // Signature line
    
        doc.setFont("helvetica", "bold");
    doc.text("THANK YOU FOR YOUR BUSINESS!", 105, finalY + 50, { align: "center" });

    doc.save(`PO_${po.id.substring(0, 8).toUpperCase()}.pdf`);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Top Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4 w-full">
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-full lg:w-auto shrink-0 overflow-x-auto no-scrollbar">
          {[
            { id: 'dashboard', icon: LayoutGrid, label: 'Dashboard' },
            { id: 'products', icon: Package, label: 'Products' },
            { id: 'stock', icon: List, label: 'Stock' },
            { id: 'movements', icon: ArrowRightLeft, label: 'Movements' },
            { id: 'purchasing', icon: ShoppingCart, label: 'Purchasing (LPO)' },
            { id: 'b2b_orders', icon: ShoppingCart, label: 'B2B Wholesale Orders' },
            { id: 'warehouses', icon: Building, label: 'Warehouses' },
            { id: 'branch_orders', icon: Truck, label: 'Branch Requisitions' },
            { id: 'suppliers', icon: Truck, label: 'Suppliers' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 md:flex-none text-center px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <tab.icon className="w-3.5 h-3.5 md:w-4 md:h-4 inline-block mr-1.5" /> <span className="hidden sm:inline">{tab.label}</span><span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
        
        <div className="flex gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar pb-2 lg:pb-0">
          {warehouses.length > 0 && (
            <select value={selectedWarehouseId} onChange={(e) => setSelectedWarehouseId(e.target.value)} className="bg-white border border-slate-200 text-slate-700 text-sm font-bold px-4 py-2 rounded-xl outline-none shadow-sm">
              <option value="all">Global Inventory (All Branches)</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          )}
          {activeTab === 'products' && (
            <div className="flex flex-wrap gap-1 md:gap-2 items-center">
              <a href="product_import_template.csv" download className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-2 md:px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold shadow-sm flex items-center gap-1 md:gap-2 transition-colors">
                <DownloadCloud className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden sm:inline">Template</span>
              </a>
              <div className="relative overflow-hidden cursor-pointer group">
                <button className="bg-slate-800 group-hover:bg-slate-900 text-white px-2 md:px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold shadow-sm flex items-center gap-1 md:gap-2 pointer-events-none transition-colors">
                  <UploadCloud className="w-3 h-3 md:w-3.5 md:h-3.5" /> <span className="hidden sm:inline">Import</span>
                </button>
                <input type="file" accept=".csv" onChange={handleImportCSV} className="absolute inset-0 opacity-0 cursor-pointer" title="Import from CSV" />
              </div>
              {currentUser?.role === 'admin' && (
                <button onClick={() => {
                  const initialPrices = {};
                  products.forEach(p => {
                    initialPrices[p.id] = {
                      costPrice: p.costPrice || 0,
                      priceStaff: p.priceStaff || 0,
                      priceDistributor: p.priceDistributor || 0,
                      priceWholesale: p.priceWholesale || 0,
                      stockLevel: getFilteredStock(p)
                    };
                  });
                  setBulkPrices(initialPrices);
                  setIsBulkPriceEditOpen(true);
                }} className="bg-orange-500 hover:bg-orange-600 text-white px-2 md:px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold shadow-md shadow-orange-500/20 flex items-center gap-1 md:gap-2">
                  <Edit className="w-3 h-3 md:w-3.5 md:h-3.5" /> <span className="hidden sm:inline">Bulk Edit</span>
                </button>
              )}
              <button onClick={() => setIsAddProductOpen(true)} className="bg-recloud-600 hover:bg-recloud-700 text-white px-2 md:px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold shadow-md shadow-recloud-500/20 flex items-center gap-1 md:gap-2">
                <Plus className="w-3 h-3 md:w-3.5 md:h-3.5" /> <span className="hidden sm:inline">Add</span>
              </button>
            </div>
          )}
          {activeTab === 'stock' && (
            <div className="flex flex-wrap gap-2 items-center">
              <button onClick={() => setIsBulkReceiveOpen(true)} className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-bold shadow-md flex items-center gap-1 md:gap-2">
                <List className="w-3.5 h-3.5 md:w-4 md:h-4" /> Bulk Receive
              </button>
              <button onClick={() => { setMovementForm({...movementForm, type: 'in', warehouseId: isBranchRestricted ? currentUser.warehouseId : ''}); setIsStockMovementOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1 md:gap-2">
                <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" /> Receive Item
              </button>
            </div>
          )}
          {activeTab === 'warehouses' && (
            <button onClick={() => setIsTransferOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" /> Stock Transfer
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-slate-500 text-sm font-bold mb-1">Total Products</p>
                  <h3 className="text-3xl font-black text-slate-800">{products.length}</h3>
                </div>
                <div className="bg-blue-100 text-blue-600 p-4 rounded-xl"><Package className="w-6 h-6" /></div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-slate-500 text-sm font-bold mb-1">Asset Value</p>
                  <h3 className="text-3xl font-black text-slate-800">₦{totalInventoryValue.toLocaleString()}</h3>
                </div>
                <div className="bg-emerald-100 text-emerald-600 p-4 rounded-xl"><TrendingUp className="w-6 h-6" /></div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer hover:border-red-200 transition-colors" onClick={() => setActiveTab('stock')}>
                <div>
                  <p className="text-slate-500 text-sm font-bold mb-1">Low / Critical</p>
                  <h3 className="text-3xl font-black text-slate-800">{lowStockProducts.length + criticalStockProducts.length}</h3>
                </div>
                <div className="bg-red-100 text-red-600 p-4 rounded-xl"><AlertTriangle className="w-6 h-6" /></div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-slate-500 text-sm font-bold mb-1">Expiring Soon</p>
                  <h3 className="text-3xl font-black text-slate-800">{expiringSoonCount}</h3>
                </div>
                <div className="bg-orange-100 text-orange-600 p-4 rounded-xl"><Check className="w-6 h-6" /></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-auto lg:h-96">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                <h3 className="font-bold text-slate-800 mb-6">Stock Value by Category</h3>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categories.map(c => ({ 
                      name: c || 'Uncategorized', 
                      value: products.filter(p => p.category === c).reduce((sum, p) => sum + (getFilteredStock(p) * (Number(p.priceWholesale) || 0)), 0) 
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={val => `₦${val/1000}k`} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                        {categories.map((entry, index) => <Cell key={`cell-${index}`} fill={['#60a5fa', '#34d399', '#a78bfa', '#fb923c', '#f87171'][index % 5]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {(lowStockProducts.length > 0 || criticalStockProducts.length > 0) && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-500"/> Action Required: Low Stock</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...criticalStockProducts, ...lowStockProducts].map(p => {
                    const stock = getFilteredStock(p);
                    const minStock = Number(p.minStockLevel) || 10;
                    const isCritical = stock <= 0;
                    return (
                      <div key={p.id} className={`p-4 rounded-xl border ${isCritical ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'} flex items-start gap-4`}>
                        <div className={`p-3 rounded-lg ${isCritical ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                          <Package className="w-5 h-5"/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-800 break-words">{p.name}</h4>
                          <p className="text-xs text-slate-500 mb-2">Min Threshold: {minStock}</p>
                          <div className={`font-black text-lg ${isCritical ? 'text-red-600' : 'text-orange-600'}`}>
                            {stock} In Stock
                          </div>
                        </div>
                        <button onClick={() => { setActiveTab('movements'); }} className="text-xs font-bold bg-white shadow-sm border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900">Restock</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input type="text" placeholder="Search products, SKU..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl outline-none focus:border-recloud-500 shadow-sm text-sm" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku?.toLowerCase().includes(searchQuery.toLowerCase())).map(product => (
                <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:border-recloud-300 transition-all flex flex-col group relative">
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {currentUser?.role === 'admin' && (
                      <>
                        <button onClick={() => { setEditProductData(product); setIsEditProductOpen(true); }} className="p-2 bg-white rounded-lg shadow border border-slate-100 text-blue-500 hover:bg-blue-50"><Edit className="w-3 h-3"/></button>
                        {currentUser?.role === 'admin' && (
<button onClick={() => { if(window.confirm('Delete product?')) handleDeleteProduct(product.id); }} className="p-2 bg-white rounded-lg shadow border border-slate-100 text-red-500 hover:bg-red-50"><Trash2 className="w-3 h-3"/></button>
)}
                      </>
                    )}
                  </div>
                  <div className="h-32 bg-slate-50 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                    {product.image ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" /> : <Package className="w-10 h-10 text-slate-300" />}
                  </div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {product.category && <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{product.category}</span>}
                    {product.subCategory && <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">{product.subCategory}</span>}
                  </div>
                  <h3 className="font-bold text-slate-800 leading-tight mb-1">{product.name}</h3>
                  {product.genericName && <p className="text-[10px] text-slate-400 font-medium mb-1 uppercase italic tracking-wide">{product.genericName}</p>}
                  <p className="text-xs text-slate-500 mb-4 line-clamp-2">{product.description || 'No description'}</p>
                  
                  <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between items-end">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Wholesale</div>
                      <div className="font-bold text-slate-800">₦{Number(product.priceWholesale).toLocaleString()}</div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Stock</div>
                        <div 
                          className={`font-bold ${getFilteredStock(product) < 10 ? 'text-red-500' : getFilteredStock(product) < 50 ? 'text-orange-500' : 'text-emerald-500'} ${currentUser?.role === 'admin' ? 'cursor-pointer hover:underline' : ''}`}
                          onClick={async () => {
                            if (currentUser?.role !== 'admin') return;
                            const activeWarehouse = selectedWarehouseId === 'all' ? (warehouses[0]?.id || 'global') : selectedWarehouseId;
                            const currentStock = Number(product.stockByWarehouse?.[activeWarehouse]) || 0;
                            const newStockStr = window.prompt(`Enter new stock for ${product.name} at ${warehouses.find(w => w.id === activeWarehouse)?.name || 'Default'}: (Currently ${currentStock})`, currentStock);
                            if (newStockStr !== null && newStockStr !== '') {
                              const newStock = Number(newStockStr);
                              if (!isNaN(newStock) && newStock >= 0) {
                                try {
                                  const difference = newStock - currentStock;
                                  if (difference !== 0) {
                                    await addStockMovement({
                                      productId: product.id,
                                      type: difference > 0 ? 'in' : 'out',
                                      qty: Math.abs(difference),
                                      warehouseId: activeWarehouse,
                                      note: 'Manual Adjustment',
                                      previousStock: currentStock,
                                      newStock: newStock,
                                      date: new Date().toISOString()
                                    }, currentTenant);
                                    
                                    const updatedStockByWarehouse = { ...(product.stockByWarehouse || {}), [activeWarehouse]: newStock };
                                    await updateProduct(product.id, { stockByWarehouse: updatedStockByWarehouse }, currentTenant);
                                    refreshData();
                                  }
                                } catch (error) {
                                  console.error(error);
                                  alert("Failed to adjust stock.");
                                }
                              } else {
                                alert("Invalid stock value.");
                              }
                            }
                          }}
                          title={currentUser?.role === 'admin' ? "Click to adjust stock" : ""}
                        >
                          {getFilteredStock(product)}
                        </div>
                      {isBranchRestricted && (
                        <div className="text-[9px] font-bold text-slate-400 mt-0.5">
                          HQ: {Object.values(product.stockByWarehouse || {}).reduce((a,b)=>a+Number(b||0),0)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stock' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Product</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">SKU</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Batch / Expiry</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Stock Level</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr><td colSpan="5" className="p-8 text-center text-slate-400">No products found.</td></tr>
                ) : (
                  products.map(p => {
                    const stock = getFilteredStock(p);
                    const isExpiring = p.expiryDate && (new Date(p.expiryDate) - new Date()) / (1000 * 60 * 60 * 24) <= 90;
                    return (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-800">{p.name}</div>
                          {p.genericName && <div className="text-[10px] text-slate-400 italic mb-1">{p.genericName}</div>}
                          <div className="text-xs text-slate-500">{p.category}</div>
                        </td>
                        <td className="p-4 text-sm text-slate-600">{p.sku || '-'}</td>
                        <td className="p-4">
                          <div className="text-sm text-slate-700">{p.batchNumber || '-'}</div>
                          <div className={`text-xs font-bold ${isExpiring ? 'text-red-500' : 'text-slate-500'}`}>{p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : '-'}</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${stock < 10 ? 'bg-red-100 text-red-700' : stock < 50 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {stock} in stock
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {currentUser?.role === 'admin' && (
                            <>
                              <button onClick={() => { setMovementForm({...movementForm, productId: p.id, type: 'in', warehouseId: isBranchRestricted ? currentUser.warehouseId : ''}); setIsStockMovementOpen(true); }} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg mr-2">Stock In</button>
                              <button onClick={() => { setMovementForm({...movementForm, productId: p.id, type: 'out', warehouseId: isBranchRestricted ? currentUser.warehouseId : ''}); setIsStockMovementOpen(true); }} className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 px-3 py-1 rounded-lg">Stock Out</button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {activeTab === 'movements' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Date</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Product</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Type</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Warehouse</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Qty</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Note</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const visibleMovements = isBranchRestricted ? stockMovements.filter(m => m.warehouseId === currentUser.warehouseId) : stockMovements;
                  return visibleMovements.length === 0 ? (
                  <tr><td colSpan="7" className="p-8 text-center text-slate-400">No movements recorded.</td></tr>
                ) : (
                  [...visibleMovements].sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0)).map(m => {
                    const prod = products.find(p => p.id === m.productId);
                    const wh = warehouses.find(w => w.id === m.warehouseId);
                    return (
                      <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="p-4 text-sm text-slate-600">{new Date(m.date).toLocaleString()}</td>
                        <td className="p-4 font-bold text-slate-800">{prod?.name || 'Unknown'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${m.type.includes('in') ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{m.type}</span>
                          {m.isReversal && <span className="ml-2 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase bg-slate-200 text-slate-600">Reversal</span>}
                        </td>
                        <td className="p-4 text-sm text-slate-600">{wh?.name || 'Main Warehouse'}</td>
                        <td className="p-4 font-bold text-slate-800">{m.type.includes('in') ? '+' : '-'}{m.qty}</td>
                        <td className="p-4 text-sm text-slate-500 max-w-xs truncate">{m.note || '-'}</td>
                        <td className="p-4 text-right">
                          {!m.isReversal && (
                            <button onClick={() => handleReverseStockMovement(m)} className="text-xs font-bold text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors">
                              Reverse
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                );
                })()}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'warehouses' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">Warehouse Locations</h3>
              {!isBranchRestricted && (
                <button onClick={() => { setEditWarehouseData(null); setIsCreateWarehouseOpen(true); }} className="bg-recloud-600 hover:bg-recloud-700 text-white px-2 md:px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold shadow-md shadow-recloud-500/20 flex items-center gap-1 md:gap-2">
                  <Plus className="w-4 h-4" /> Add Branch
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(isBranchRestricted ? warehouses.filter(w => w.id === currentUser.warehouseId) : warehouses).map(w => (
                <div key={w.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative group">
                  {!isBranchRestricted && currentUser?.role === 'admin' && (
                    <button onClick={() => deleteWarehouse(w.id, currentTenant).then(refreshData)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4"/></button>
                  )}
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4"><Building className="w-6 h-6"/></div>
                  <h4 className="font-bold text-slate-800 text-lg mb-1">{w.name}</h4>
                  <p className="text-sm text-slate-500 mb-4">{w.location || 'No address specified'}</p>
                  <div className="text-xs font-bold text-slate-400 uppercase">Total Items</div>
                  <div className="font-bold text-slate-700">{products.reduce((sum, p) => sum + (Number(p.stockByWarehouse?.[w.id]) || 0), 0)} units</div>
                </div>
              ))}
              {(isBranchRestricted ? warehouses.filter(w => w.id === currentUser.warehouseId) : warehouses).length === 0 && (
                <div className="col-span-full p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold">
                  No branch locations found.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'b2b_orders' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">B2B Wholesale Orders</h3>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Order ID</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Customer</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Date</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Items</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Total Amount</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Payment</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const visibleB2BOrders = isBranchRestricted ? b2bOrders.filter(o => o.warehouseId === currentUser.warehouseId) : b2bOrders;
                    return visibleB2BOrders.length === 0 ? (
                    <tr><td colSpan="8" className="p-8 text-center text-slate-400">No B2B orders recorded.</td></tr>
                  ) : (
                    visibleB2BOrders.sort((a, b) => {
                      const da = a.date || ''; const db2 = b.date || '';
                      return db2.localeCompare(da);
                    }).map(order => (
                      <React.Fragment key={order.id}>
                        <tr className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer" onClick={() => setSelectedB2BOrder(selectedB2BOrder?.id === order.id ? null : order)}>
                          <td className="p-4 text-sm font-bold text-slate-700">#{order.invoiceNumber || order.id.substring(0, 8).toUpperCase()}</td>
                          <td className="p-4">
                            <div className="font-bold text-slate-800">{order.userName}</div>
                            <div className="text-xs text-slate-500 capitalize">{order.userRole?.replace('_', ' ')}</div>
                          </td>
                          <td className="p-4 text-xs text-slate-500">{order.date ? new Date(order.date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</td>
                          <td className="p-4 text-sm text-slate-600">{order.items?.length || 0} items</td>
                          <td className="p-4 font-bold text-slate-800">₦{(Number(order.totalAmount) || 0).toLocaleString()}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {order.paymentStatus === 'paid' ? '✓ Paid' : '⏳ Unpaid'}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-1 capitalize">{order.paymentMethod === 'pay_now' ? 'Card' : order.paymentMethod === 'transfer' ? 'Transfer' : 'Invoice'}</div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${order.status === 'pending' ? 'bg-orange-100 text-orange-700' : order.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {order.status || 'pending'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                              {order.paymentMethod === 'pay_later' && order.paymentStatus !== 'paid' && (
                                <button onClick={async () => {
                                  if(!window.confirm("Mark as paid? This will restore their credit balance.")) return;
                                  try {
                                    const { getEmployees } = await import('./firebase');
                                    const allEmps = await getEmployees(currentTenant);
                                    const buyer = allEmps.find(e => e.id === order.userId);
                                    if(buyer) {
                                      await updateEmployee(buyer.id, { currentBalance: Math.max(0, (Number(buyer.currentBalance) || 0) - Number(order.totalAmount)) }, currentTenant);
                                    }
                                    await updateB2BOrder(order.id, { paymentStatus: 'paid' }, currentTenant);
                                    refreshData();
                                  } catch(err) { console.error(err); alert("Failed to mark paid"); }
                                }} className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg border border-blue-200">
                                  Mark Paid
                                </button>
                              )}
                              {order.status === 'pending' && (
                                <>
                                  <button onClick={async () => {
                                    if(!window.confirm("Approve this order and deduct stock?")) return;
                                    try {
                                      for(const item of order.items) {
                                        const prod = products.find(p => p.id === item.productId);
                                        if (!prod) continue;
                                        
                                        const activeWarehouseId = order.warehouseId || (warehouses[0]?.id || 'global');
                                        const currentStock = Number(prod.stockByWarehouse?.[activeWarehouseId] || 0);
                                        const newStock = currentStock - Number(item.qty);

                                        await addStockMovement({ 
                                          productId: item.productId, 
                                          type: 'out', 
                                          qty: Number(item.qty), 
                                          warehouseId: activeWarehouseId, 
                                          note: `B2B Order Fulfillment: ${order.id}`,
                                          previousStock: currentStock,
                                          newStock: newStock,
                                          date: new Date().toISOString()
                                        }, currentTenant);

                                        const updatedStockByWarehouse = { ...(prod.stockByWarehouse || {}), [activeWarehouseId]: newStock };
                                        await updateProduct(prod.id, { stockByWarehouse: updatedStockByWarehouse }, currentTenant);
                                      }
                                      await updateB2BOrder(order.id, { status: 'fulfilled', fulfilledAt: new Date().toISOString() }, currentTenant);
                                      refreshData();
                                    } catch(err) { console.error(err); alert("Failed to fulfill"); }
                                  }} className="text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                                    ✓ Approve
                                  </button>
                                  <button onClick={async () => {
                                    const reason = window.prompt("Reason for rejecting this order:");
                                    if (reason === null) return;
                                    try {
                                      await updateB2BOrder(order.id, { status: 'rejected', rejectionReason: reason, rejectedAt: new Date().toISOString() }, currentTenant);
                                      refreshData();
                                    } catch(err) { console.error(err); alert("Failed to reject"); }
                                  }} className="text-xs font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg border border-red-200">
                                    ✗ Reject
                                  </button>
                                </>
                              )}
                              <button onClick={() => {
                                const win = window.open('', '_blank');
                                const fmtDate = order.date ? new Date(order.date).toLocaleDateString('en-NG', { year:'numeric', month:'long', day:'numeric' }) : 'N/A';
                                win.document.write(`<html><head><title>Invoice #${order.invoiceNumber || order.id?.substring(0,8).toUpperCase()}</title>
                                <style>
                                  body{font-family:'Segoe UI',Arial,sans-serif;padding:20px;color:#1e293b}
                                  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;border-bottom:2px solid #6366f1;padding-bottom:10px}
                                  .brand{font-size:20px;font-weight:900;color:#6366f1}
                                  .details{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
                                  .detail-box{background:#f8fafc;border-radius:8px;padding:12px;border:1px solid #e2e8f0}
                                  .detail-box h4{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin:0 0 4px 0}
                                  .detail-box p{margin:2px 0;font-size:11px}
                                  table{width:100%;border-collapse:collapse;margin:10px 0}
                                  th{background:#f1f5f9;padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;color:#64748b;letter-spacing:1px;border-bottom:2px solid #e2e8f0}
                                  td{padding:4px 8px;border-bottom:1px solid #f1f5f9;font-size:10px}
                                  .total-row{background:#6366f1;color:white}
                                  .total-row td{font-weight:900;font-size:12px;border:none}
                                  .footer{text-align:center;color:#94a3b8;font-size:9px;margin-top:20px;padding-top:10px;border-top:1px solid #e2e8f0}
                                  @media print{body{padding:10px}}
                                </style></head><body>
                                <div class="header"><div><div class="brand">☁ ${tenantConfig?.companyName || 'Recloud ERP'}</div><div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:2px;margin-top:5px">B2B Invoice</div></div><div style="text-align:right"><div style="font-size:16px;font-weight:900">#${order.invoiceNumber || order.id?.substring(0,8).toUpperCase()}</div><div style="font-size:11px;color:#64748b">${fmtDate}</div></div></div>
                                <div class="details"><div class="detail-box"><h4>Bill To</h4><p><strong>${order.userName}</strong></p><p style="color:#64748b;text-transform:capitalize">${order.userRole?.replace('_',' ')||'Customer'}</p></div><div class="detail-box"><h4>Payment</h4><p><strong>${order.paymentMethod==='pay_now'?'Card':order.paymentMethod==='transfer'?'Bank Transfer':'Invoice'}</strong></p><p style="color:${order.paymentStatus==='paid'?'#15803d':'#b45309'}">Status: ${order.paymentStatus==='paid'?'Paid':'Unpaid'}</p></div></div>
                                <table><thead><tr><th>#</th><th>Product</th><th>Qty</th><th>Unit Price</th><th style="text-align:right">Total</th></tr></thead><tbody>
                                ${(order.items||[]).map((it,i)=>`<tr><td>${i+1}</td><td><strong>${it.name}</strong></td><td>${it.qty}</td><td>₦${Number(it.unitPrice).toLocaleString()}</td><td style="text-align:right;font-weight:700">₦${(it.qty*it.unitPrice).toLocaleString()}</td></tr>`).join('')}
                                <tr class="total-row"><td colspan="4" style="text-align:right">TOTAL</td><td style="text-align:right">₦${Number(order.totalAmount).toLocaleString()}</td></tr>
                                </tbody></table>
                                <div class="footer"><p>Thank you for your business!</p><p>${tenantConfig?.companyName || 'Recloud ERP'} · Generated on ${new Date().toLocaleString()}</p></div>
                                </body></html>`);
                                win.document.close();
                                setTimeout(() => win.print(), 500);
                              }} className="text-xs font-bold text-slate-500 hover:bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                                🖨 Invoice
                              </button>
                            </div>
                          </td>
                        </tr>
                        {/* Expanded order details */}
                        {selectedB2BOrder?.id === order.id && (
                          <tr>
                            <td colSpan="8" className="p-0">
                              <div className="bg-slate-50 p-5 border-t border-slate-200">
                                <div className="flex items-center gap-2 mb-3">
                                  <Package className="w-4 h-4 text-slate-500" />
                                  <h4 className="text-sm font-bold text-slate-700">Order Items Breakdown</h4>
                                </div>
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                  <table className="w-full text-left border-collapse">
                                    <thead>
                                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                        <th className="p-3 font-bold border-b border-slate-200">#</th>
                                        <th className="p-3 font-bold border-b border-slate-200">Product Name</th>
                                        <th className="p-3 font-bold border-b border-slate-200 text-center">Quantity</th>
                                        <th className="p-3 font-bold border-b border-slate-200 text-right">Unit Price</th>
                                        <th className="p-3 font-bold border-b border-slate-200 text-right">Line Total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(order.items || []).map((item, idx) => (
                                        <tr key={idx} className="border-b border-slate-50">
                                          <td className="p-3 text-sm text-slate-400">{idx + 1}</td>
                                          <td className="p-3 text-sm font-bold text-slate-800">{item.name}</td>
                                          <td className="p-3 text-sm text-center font-semibold">{item.qty}</td>
                                          <td className="p-3 text-sm text-right text-slate-600">₦{Number(item.unitPrice).toLocaleString()}</td>
                                          <td className="p-3 text-sm text-right font-bold text-slate-800">₦{(item.qty * item.unitPrice).toLocaleString()}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot>
                                      <tr className="bg-slate-800 text-white">
                                        <td colSpan="4" className="p-3 text-right font-bold text-sm">ORDER TOTAL</td>
                                        <td className="p-3 text-right font-black">₦{Number(order.totalAmount).toLocaleString()}</td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                                {order.rejectionReason && (
                                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                    <span className="font-bold">Rejection Reason:</span> {order.rejectionReason}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      ))
                    );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
        )}

        {activeTab === 'purchasing' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">Purchase Orders (LPO)</h3>
              <button onClick={() => setIsCreatePOOpen(true)} className="bg-recloud-600 hover:bg-recloud-700 text-white px-2 md:px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold shadow-md shadow-recloud-500/20 flex items-center gap-1 md:gap-2">
                <Plus className="w-4 h-4" /> Create LPO
              </button>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase">PO Number</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase">Date</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase">Supplier</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase">Total Amount</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const visiblePOs = isBranchRestricted ? purchaseOrders.filter(po => po.destinationWarehouseId === currentUser.warehouseId) : purchaseOrders;
                      if (visiblePOs.length === 0) {
                        return (
                          <tr>
                            <td colSpan="6" className="p-8 text-center text-slate-400 font-bold">No purchase orders found.</td>
                          </tr>
                        );
                      }
                      return visiblePOs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).map(po => {
                        const supplier = suppliers.find(s => s.id === po.supplierId);
                        return (
                          <tr key={po.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 text-sm font-bold text-slate-800">#{po.id.substring(0, 8).toUpperCase()}</td>
                            <td className="p-4 text-sm text-slate-600">{new Date(po.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}</td>
                            <td className="p-4 text-sm text-slate-800">{supplier ? supplier.name : 'Unknown Supplier'}</td>
                            <td className="p-4 text-sm font-bold text-slate-800">₦{po.totalAmount?.toLocaleString()}</td>
                            <td className="p-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${po.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : po.status === 'approved' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                {po.status === 'delivered' ? 'Delivered' : po.status === 'approved' ? 'Approved' : 'Pending'}
                              </span>
                            </td>
                            <td className="p-4 text-right flex justify-end gap-2">
                              <button onClick={() => generateLPOPdf(po)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Download PDF"><Download className="w-4 h-4"/></button>
                              {po.status === 'pending' && currentUser?.role === 'admin' && (
                                <button onClick={() => handleUpdatePOStatus(po, 'approved')} className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="Approve PO"><CheckCircle2 className="w-4 h-4"/></button>
                              )}
                              {po.status === 'approved' && (
                                <button onClick={() => handleUpdatePOStatus(po, 'delivered')} className="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors">Mark Delivered</button>
                              )}
                              {currentUser?.role === 'admin' && (
<button onClick={() => { if(window.confirm('Delete this PO?')) { deletePurchaseOrder(po.id, currentTenant).then(refreshData) } }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete PO"><Trash2 className="w-4 h-4"/></button>
)}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'branch_orders' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">Branch Requisitions</h3>
              {isBranchRestricted && (
                <button onClick={() => setIsCreateBranchOrderOpen(true)} className="bg-recloud-600 hover:bg-recloud-700 text-white px-2 md:px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold shadow-md shadow-recloud-500/20 flex items-center gap-1 md:gap-2">
                  <Plus className="w-4 h-4" /> Request Stock from HQ
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase">Date</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase">Requisition #</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase">Requesting Branch</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase">Items</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(isBranchRestricted ? branchOrders.filter(o => o.requestingWarehouseId === currentUser.warehouseId) : branchOrders)
                    .sort((a,b) => new Date(b.createdAt?.seconds*1000 || 0) - new Date(a.createdAt?.seconds*1000 || 0))
                    .map(order => {
                      const requestingWh = warehouses.find(w => w.id === order.requestingWarehouseId);
                      return (
                        <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="p-4 text-sm text-slate-600">{new Date(order.createdAt?.seconds * 1000 || order.orderDate).toLocaleDateString()}</td>
                          <td className="p-4 text-sm font-bold text-slate-800">REQ-{order.id.slice(-6).toUpperCase()}</td>
                          <td className="p-4 text-sm text-slate-700">{requestingWh?.name || 'Unknown'}</td>
                          <td className="p-4 text-sm text-slate-600">{order.items.length} items</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${order.status === 'Fulfilled' ? 'bg-emerald-100 text-emerald-700' : order.status === 'Pending' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>
                              {order.status || 'Pending'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              {!isBranchRestricted && order.status !== 'Fulfilled' && (
                                <button onClick={() => handleFulfillBranchOrder(order)} className="text-xs font-bold text-recloud-600 hover:text-recloud-700 bg-recloud-50 hover:bg-recloud-100 px-3 py-1.5 rounded-lg transition-colors">
                                  Fulfill
                                </button>
                              )}
                              {order.status === 'Pending' && isBranchRestricted && (
                                <button onClick={() => deleteBranchOrder(order.id, currentTenant).then(refreshData)} className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">
                                  Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {branchOrders.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-400 font-bold">No branch requisitions found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'suppliers' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">Supplier Directory</h3>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
              <h4 className="font-bold text-slate-800 mb-4">Add New Supplier</h4>
              <form onSubmit={handleAddSupplier} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                <div className="col-span-1 md:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company Name</label>
                  <input required type="text" value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" placeholder="Acme Corp" />
                </div>
                <div className="col-span-1 md:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Location / Branch</label>
                  <select value={newSupplier.warehouseId || ''} onChange={e => setNewSupplier({...newSupplier, warehouseId: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500">
                    <option value="">Global (All Branches)</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="col-span-1 md:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Name</label>
                  <input type="text" value={newSupplier.contactName} onChange={e => setNewSupplier({...newSupplier, contactName: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" placeholder="Jane Doe" />
                </div>
                <div className="col-span-1 md:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                  <input type="text" value={newSupplier.phone} onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" placeholder="+123456789" />
                </div>
                <div className="col-span-1 md:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input type="email" value={newSupplier.email} onChange={e => setNewSupplier({...newSupplier, email: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" placeholder="sales@acme.com" />
                </div>
                <div className="col-span-1 md:col-span-1">
                  <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4"/> Add Supplier
                  </button>
                </div>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(isBranchRestricted ? suppliers.filter(s => s.warehouseId === currentUser.warehouseId || !s.warehouseId) : suppliers).map(s => (
                <div key={s.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative group">
                  {currentUser?.role === 'admin' && (
<button onClick={() => deleteSupplier(s.id, currentTenant).then(refreshData)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4"/></button>
)}
                  <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center mb-4"><Truck className="w-6 h-6"/></div>
                  <h4 className="font-bold text-slate-800 text-lg mb-1">{s.name}</h4>
                  <p className="text-sm text-slate-500 mb-1"><span className="font-bold">Contact:</span> {s.contactName || 'N/A'}</p>
                  <p className="text-sm text-slate-500 mb-1"><span className="font-bold">Phone:</span> {s.phone || 'N/A'}</p>
                  <p className="text-sm text-slate-500 mb-1"><span className="font-bold">Email:</span> {s.email || 'N/A'}</p>
                  <p className="text-sm text-slate-500 mb-4"><span className="font-bold">Location/Branch:</span> {warehouses.find(w => w.id === s.warehouseId)?.name || 'Global'}</p>
                </div>
              ))}
              {(isBranchRestricted ? suppliers.filter(s => s.warehouseId === currentUser.warehouseId || !s.warehouseId) : suppliers).length === 0 && (
                <div className="col-span-full p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold">
                  No suppliers found. Create one above to manage vendors.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bulk Price Edit Modal */}
      {isBulkPriceEditOpen && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Bulk Product Management</h3>
                <p className="text-sm font-medium text-slate-500">Update prices, stock levels, or delete products in bulk</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search products..." value={bulkPriceSearchQuery} onChange={e => setBulkPriceSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-recloud-500/20 outline-none w-64" />
                </div>
                {currentUser?.role === 'admin' && (
<button onClick={() => setIsBulkPriceEditOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
)}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="p-3 font-bold border-b border-slate-200 w-10">
                        <input type="checkbox" onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBulkProducts(new Set(products.filter(p => p.name.toLowerCase().includes(bulkPriceSearchQuery.toLowerCase()) || p.category?.toLowerCase().includes(bulkPriceSearchQuery.toLowerCase())).map(p => p.id)));
                          } else {
                            setSelectedBulkProducts(new Set());
                          }
                        }} checked={selectedBulkProducts.size > 0 && selectedBulkProducts.size === products.filter(p => p.name.toLowerCase().includes(bulkPriceSearchQuery.toLowerCase()) || p.category?.toLowerCase().includes(bulkPriceSearchQuery.toLowerCase())).length} className="w-4 h-4 rounded border-slate-300 text-recloud-600 focus:ring-recloud-500" />
                      </th>
                      <th className="p-3 font-bold border-b border-slate-200">Product Name</th>
                      <th className="p-3 font-bold border-b border-slate-200">Cost Price (₦)</th>
                      <th className="p-3 font-bold border-b border-slate-200">Staff Price (₦)</th>
                      <th className="p-3 font-bold border-b border-slate-200">Distributor (₦)</th>
                      <th className="p-3 font-bold border-b border-slate-200">Wholesale (₦)</th>
                      <th className="p-3 font-bold border-b border-slate-200">Stock Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.filter(p => p.name.toLowerCase().includes(bulkPriceSearchQuery.toLowerCase()) || p.category?.toLowerCase().includes(bulkPriceSearchQuery.toLowerCase())).map(p => (
                      <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="p-3">
                          <input type="checkbox" checked={selectedBulkProducts.has(p.id)} onChange={(e) => {
                            const newSet = new Set(selectedBulkProducts);
                            if (e.target.checked) newSet.add(p.id);
                            else newSet.delete(p.id);
                            setSelectedBulkProducts(newSet);
                          }} className="w-4 h-4 rounded border-slate-300 text-recloud-600 focus:ring-recloud-500" />
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.category}</p>
                        </td>
                        <td className="p-3">
                          <input type="number" value={bulkPrices[p.id]?.costPrice || ''} onChange={e => setBulkPrices({...bulkPrices, [p.id]: {...bulkPrices[p.id], costPrice: e.target.value}})} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-recloud-500" />
                        </td>
                        <td className="p-3">
                          <input type="number" value={bulkPrices[p.id]?.priceStaff || ''} onChange={e => setBulkPrices({...bulkPrices, [p.id]: {...bulkPrices[p.id], priceStaff: e.target.value}})} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-recloud-500" />
                        </td>
                        <td className="p-3">
                          <input type="number" value={bulkPrices[p.id]?.priceDistributor || ''} onChange={e => setBulkPrices({...bulkPrices, [p.id]: {...bulkPrices[p.id], priceDistributor: e.target.value}})} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-recloud-500" />
                        </td>
                        <td className="p-3">
                          <input type="number" value={bulkPrices[p.id]?.priceWholesale || ''} onChange={e => setBulkPrices({...bulkPrices, [p.id]: {...bulkPrices[p.id], priceWholesale: e.target.value}})} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-recloud-500" />
                        </td>
                        <td className="p-3">
                          <input type="number" value={bulkPrices[p.id]?.stockLevel || ''} onChange={e => setBulkPrices({...bulkPrices, [p.id]: {...bulkPrices[p.id], stockLevel: e.target.value}})} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-recloud-500" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-white flex justify-between items-center gap-3">
              <div>
                {selectedBulkProducts.size > 0 && (
                  <button onClick={async () => {
                    if (!window.confirm(`Are you sure you want to delete ${selectedBulkProducts.size} products?`)) return;
                    const { deleteProduct } = await import('./firebase');
                    try {
                      await Promise.all(Array.from(selectedBulkProducts).map(id => deleteProduct(id, currentTenant)));
                      refreshData();
                      setSelectedBulkProducts(new Set());
                    } catch(e) {
                      console.error(e);
                      alert('Error deleting products');
                    }
                  }} className="text-red-600 font-bold hover:bg-red-50 px-4 py-2 rounded-xl transition-colors text-sm flex items-center gap-2">
                    <Trash2 className="w-4 h-4" /> Delete {selectedBulkProducts.size} Selected
                  </button>
                  )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsBulkPriceEditOpen(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button onClick={async () => {
                  const { updateProduct, addStockMovement } = await import('./firebase');
                  try {
                    const updates = Object.entries(bulkPrices).map(async ([id, prices]) => {
                      const existingProduct = products.find(p => p.id === id);
                      const warehouseKey = selectedWarehouseId === 'all' ? (existingProduct?.initialWarehouseId || 'global') : selectedWarehouseId;
                      const currentStock = Number(existingProduct?.stockByWarehouse?.[warehouseKey]) || 0;
                      const newStock = Number(prices.stockLevel) || 0;
                      
                      if (newStock !== currentStock) {
                        const difference = newStock - currentStock;
                        await addStockMovement({
                          productId: id,
                          type: difference > 0 ? 'in' : 'out',
                          qty: Math.abs(difference),
                          warehouseId: warehouseKey,
                          note: 'Bulk Manual Adjustment',
                          previousStock: currentStock,
                          newStock: newStock,
                          date: new Date().toISOString()
                        }, currentTenant);
                      }
                      
                      return updateProduct(id, {
                        costPrice: Number(prices.costPrice) || 0,
                        priceStaff: Number(prices.priceStaff) || 0,
                        priceDistributor: Number(prices.priceDistributor) || 0,
                        priceWholesale: Number(prices.priceWholesale) || 0,
                        stockByWarehouse: { ...(existingProduct?.stockByWarehouse || {}), [warehouseKey]: newStock }
                      }, currentTenant);
                    });
                    await Promise.all(updates);
                    refreshData();
                    setIsBulkPriceEditOpen(false);
                  } catch(e) {
                    console.error(e);
                    alert('Error updating prices');
                  }
                }} className="bg-recloud-600 hover:bg-recloud-700 text-white px-6 py-2 rounded-xl font-bold shadow-md transition-all">
                  Save All Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Add/Edit Modal */}
      {(isAddProductOpen || isEditProductOpen) && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">{isEditProductOpen ? 'Edit Product' : 'Add Product'}</h3>
              <button onClick={() => { setIsAddProductOpen(false); setIsEditProductOpen(false); }} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={isEditProductOpen ? handleEditProduct : handleAddProduct} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Brand Name</label>
                  <input required type="text" value={isEditProductOpen ? editProductData.name : newProduct.name} onChange={e => isEditProductOpen ? setEditProductData({...editProductData, name: e.target.value}) : setNewProduct({...newProduct, name: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Generic Name</label>
                  <input type="text" value={isEditProductOpen ? editProductData.genericName : newProduct.genericName} onChange={e => isEditProductOpen ? setEditProductData({...editProductData, genericName: e.target.value}) : setNewProduct({...newProduct, genericName: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <input required type="text" list="categories-list" value={isEditProductOpen ? editProductData.category : newProduct.category} onChange={e => isEditProductOpen ? setEditProductData({...editProductData, category: e.target.value}) : setNewProduct({...newProduct, category: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" placeholder="e.g. Pharmaceuticals" />
                  <datalist id="categories-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sub-Category</label>
                  <input type="text" list="subcategories-list" value={isEditProductOpen ? editProductData.subCategory : newProduct.subCategory} onChange={e => isEditProductOpen ? setEditProductData({...editProductData, subCategory: e.target.value}) : setNewProduct({...newProduct, subCategory: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" placeholder="e.g. Tablets" />
                  <datalist id="subcategories-list">{subCategories.map(c => <option key={c} value={c} />)}</datalist>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea rows="2" value={isEditProductOpen ? editProductData.description : newProduct.description} onChange={e => isEditProductOpen ? setEditProductData({...editProductData, description: e.target.value}) : setNewProduct({...newProduct, description: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cost Price (₦)</label>
                  <input type="number" value={isEditProductOpen ? editProductData.costPrice : newProduct.costPrice} onChange={e => isEditProductOpen ? setEditProductData({...editProductData, costPrice: e.target.value}) : setNewProduct({...newProduct, costPrice: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 bg-emerald-50/30 font-semibold" required placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Staff Price (₦)</label>
                  <input required type="number" value={isEditProductOpen ? editProductData.priceStaff : newProduct.priceStaff} onChange={e => isEditProductOpen ? setEditProductData({...editProductData, priceStaff: e.target.value}) : setNewProduct({...newProduct, priceStaff: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Distributor Price (₦)</label>
                  <input required type="number" value={isEditProductOpen ? editProductData.priceDistributor : newProduct.priceDistributor} onChange={e => isEditProductOpen ? setEditProductData({...editProductData, priceDistributor: e.target.value}) : setNewProduct({...newProduct, priceDistributor: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Wholesale Price (₦)</label>
                  <input required type="number" value={isEditProductOpen ? editProductData.priceWholesale : newProduct.priceWholesale} onChange={e => isEditProductOpen ? setEditProductData({...editProductData, priceWholesale: e.target.value}) : setNewProduct({...newProduct, priceWholesale: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Batch Number</label>
                  <input type="text" value={isEditProductOpen ? editProductData.batchNumber : newProduct.batchNumber} onChange={e => isEditProductOpen ? setEditProductData({...editProductData, batchNumber: e.target.value}) : setNewProduct({...newProduct, batchNumber: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SKU / Barcode</label>
                  <input type="text" value={isEditProductOpen ? editProductData.sku : newProduct.sku} onChange={e => isEditProductOpen ? setEditProductData({...editProductData, sku: e.target.value}) : setNewProduct({...newProduct, sku: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expiry Date</label>
                  <input type="date" value={isEditProductOpen ? editProductData.expiryDate : newProduct.expiryDate} onChange={e => isEditProductOpen ? setEditProductData({...editProductData, expiryDate: e.target.value}) : setNewProduct({...newProduct, expiryDate: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" />
                </div>
              </div>
              {!isEditProductOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Initial Stock Quantity</label>
                    <input type="number" min="0" value={newProduct.initialQty || ''} onChange={e => setNewProduct({...newProduct, initialQty: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" placeholder="e.g. 100" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Store at Warehouse</label>
                    <select value={newProduct.initialWarehouseId || ''} onChange={e => setNewProduct({...newProduct, initialWarehouseId: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500 bg-white">
                      <option value="">Global / Unassigned</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Product Image URL</label>
                <input type="url" placeholder="https://example.com/image.jpg" value={isEditProductOpen ? editProductData.image : newProduct.image} onChange={e => isEditProductOpen ? setEditProductData({...editProductData, image: e.target.value}) : setNewProduct({...newProduct, image: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Min Stock Level (Alerts)</label>
                  <input required type="number" value={isEditProductOpen ? editProductData.minStockLevel : newProduct.minStockLevel} onChange={e => isEditProductOpen ? setEditProductData({...editProductData, minStockLevel: e.target.value}) : setNewProduct({...newProduct, minStockLevel: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Primary Supplier</label>
                  <select value={isEditProductOpen ? editProductData.supplierId : newProduct.supplierId} onChange={e => isEditProductOpen ? setEditProductData({...editProductData, supplierId: e.target.value}) : setNewProduct({...newProduct, supplierId: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500 bg-white">
                    <option value="">No Supplier Selected</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              {!isEditProductOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 mt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Initial Stock Qty (Optional)</label>
                    <input type="number" min="0" value={newProduct.initialQty} onChange={e => setNewProduct({...newProduct, initialQty: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" placeholder="e.g. 100" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Receive at Warehouse</label>
                    <select disabled={!newProduct.initialQty || newProduct.initialQty === '0'} value={newProduct.initialWarehouseId} onChange={e => setNewProduct({...newProduct, initialWarehouseId: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500 bg-white disabled:bg-slate-50 disabled:text-slate-400">
                      <option value="">Select Warehouse...</option>
                      {isBranchRestricted && currentUser.warehouseId ? (
                         warehouses.filter(w => w.id === currentUser.warehouseId).map(w => <option key={w.id} value={w.id}>{w.name}</option>)
                      ) : (
                         warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)
                      )}
                    </select>
                  </div>
                </div>
              )}
              <button type="submit" className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl mt-4">Save Product</button>
            </form>
          </div>
        </div>
      )}

      {isStockMovementOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Record Stock {movementForm.type === 'in' ? 'In' : 'Out'}</h3>
              <button onClick={() => setIsStockMovementOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleStockMovement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Product</label>
                <select required value={movementForm.productId} onChange={e => {
                  const selectedProd = products.find(p => p.id === e.target.value);
                  setMovementForm({...movementForm, productId: e.target.value, category: selectedProd?.category || '', subCategory: selectedProd?.subCategory || ''});
                }} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500 bg-white">
                  <option value="">Select a product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              
              {movementForm.type === 'in' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                    <input type="text" list="categories-list" value={movementForm.category || ''} onChange={e => setMovementForm({...movementForm, category: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" placeholder="e.g. Pharmaceuticals" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Sub-Category</label>
                    <input type="text" list="subcategories-list" value={movementForm.subCategory || ''} onChange={e => setMovementForm({...movementForm, subCategory: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" placeholder="e.g. Tablets" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Warehouse / Branch</label>
                <select required value={movementForm.warehouseId} disabled={isBranchRestricted} onChange={e => setMovementForm({...movementForm, warehouseId: e.target.value})} className={`w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500 ${isBranchRestricted ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'}`}>
                  <option value="">Select a location</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quantity</label>
                <input required type="number" min="1" value={movementForm.qty} onChange={e => setMovementForm({...movementForm, qty: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Note / Invoice #</label>
                <input type="text" value={movementForm.note} onChange={e => setMovementForm({...movementForm, note: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" />
              </div>
              <button type="submit" className={`w-full font-bold py-3 rounded-xl mt-4 text-white ${movementForm.type === 'in' ? 'bg-emerald-600' : 'bg-red-600'}`}>Save Movement</button>
            </form>
          </div>
        </div>
      )}

      {isTransferOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Transfer Stock</h3>
              <button onClick={() => setIsTransferOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Product</label>
                <select required value={transferForm.productId} onChange={e => setTransferForm({...transferForm, productId: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500 bg-white">
                  <option value="">Select a product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">From Warehouse</label>
                  <select required value={transferForm.fromWarehouseId} onChange={e => setTransferForm({...transferForm, fromWarehouseId: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500 bg-white">
                    <option value="">Select source</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">To Warehouse</label>
                  <select required value={transferForm.toWarehouseId} onChange={e => setTransferForm({...transferForm, toWarehouseId: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500 bg-white">
                    <option value="">Select destination</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quantity</label>
                <input required type="number" min="1" value={transferForm.qty} onChange={e => setTransferForm({...transferForm, qty: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Note</label>
                <input type="text" value={transferForm.note} onChange={e => setTransferForm({...transferForm, note: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl mt-4">Execute Transfer</button>
            </form>
          </div>
        </div>
      )}

      {isAddWarehouseOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Add Branch Location</h3>
              <button onClick={() => setIsAddWarehouseOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleAddWarehouse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Branch Name</label>
                <input required type="text" value={newWarehouse.name} onChange={e => setNewWarehouse({...newWarehouse, name: e.target.value})} placeholder="e.g. Lagos HQ" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Address / Location</label>
                <input required type="text" value={newWarehouse.location} onChange={e => setNewWarehouse({...newWarehouse, location: e.target.value})} placeholder="e.g. 123 Main St" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" />
              </div>
              <button type="submit" className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl mt-4">Save Branch</button>
            </form>
          </div>
        </div>
      )}

      {isCreatePOOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in overflow-y-auto p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-4xl shadow-2xl animate-in zoom-in-95 my-8">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-800">Create Purchase Order (LPO)</h3>
              <button onClick={() => setIsCreatePOOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCreatePO} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Supplier</label>
                  <select required value={newPO.supplierId} onChange={e => setNewPO({...newPO, supplierId: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500 bg-white">
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Destination Branch</label>
                  <select required value={newPO.destinationWarehouseId} onChange={e => setNewPO({...newPO, destinationWarehouseId: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500 bg-white">
                    <option value="">-- Choose Branch --</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expected Delivery Date</label>
                  <input required type="date" value={newPO.expectedDate} onChange={e => setNewPO({...newPO, expectedDate: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-800 mb-4">Add Line Items</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Product</label>
                    <select value={poCurrentItem.productId} onChange={e => setPoCurrentItem({...poCurrentItem, productId: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500 bg-white">
                      <option value="">-- Choose Product --</option>
                      {products.filter(p => p.supplierId === newPO.supplierId || !newPO.supplierId).map(p => (
                        <option key={p.id} value={p.id}>{p.name} (In stock: {getProductTotalStock(p)})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Quantity</label>
                    <input type="number" min="1" value={poCurrentItem.qty} onChange={e => setPoCurrentItem({...poCurrentItem, qty: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Unit Cost (₦)</label>
                    <input type="number" min="0" value={poCurrentItem.unitCost} onChange={e => setPoCurrentItem({...poCurrentItem, unitCost: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" placeholder="0" />
                  </div>
                </div>
                <button type="button" onClick={handleAddPOItem} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-2 rounded-xl text-sm transition-colors w-full md:w-auto">
                  + Add to Order
                </button>
              </div>

              {newPO.items.length > 0 && (
                <div>
                  <table className="w-full text-left border-collapse bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="p-3 text-xs font-bold text-slate-600">Product</th>
                        <th className="p-3 text-xs font-bold text-slate-600">Qty</th>
                        <th className="p-3 text-xs font-bold text-slate-600">Unit Cost</th>
                        <th className="p-3 text-xs font-bold text-slate-600">Total</th>
                        <th className="p-3 text-xs font-bold text-slate-600"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {newPO.items.map((item, idx) => {
                        const prod = products.find(p => p.id === item.productId);
                        return (
                          <tr key={idx} className="border-t border-slate-100">
                            <td className="p-3 text-sm font-bold text-slate-800">{prod?.name || 'Unknown'}</td>
                            <td className="p-3 text-sm text-slate-600">{item.qty}</td>
                            <td className="p-3 text-sm text-slate-600">₦{Number(item.unitCost).toLocaleString()}</td>
                            <td className="p-3 text-sm font-bold text-slate-800">₦{(Number(item.qty) * Number(item.unitCost)).toLocaleString()}</td>
                            <td className="p-3 text-right">
                              <button type="button" onClick={() => setNewPO({...newPO, items: newPO.items.filter((_, i) => i !== idx)})} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4"/></button>
                            </td>
                          </tr>
                        )
                      })}
                      <tr className="bg-slate-50 border-t border-slate-200">
                        <td colSpan="3" className="p-4 text-right font-bold text-slate-600">Grand Total:</td>
                        <td colSpan="2" className="p-4 font-black text-xl text-slate-800">
                          ₦{newPO.items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.unitCost)), 0).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Terms</label>
                <textarea rows="2" value={newPO.note} onChange={e => setNewPO({...newPO, note: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" placeholder="Delivery instructions..."></textarea>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsCreatePOOpen(false)} className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-900">Create PO</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreateBranchOrderOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in overflow-y-auto p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-4xl shadow-2xl animate-in zoom-in-95 my-8">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-800">Request Stock from HQ (Requisition)</h3>
              <button onClick={() => setIsCreateBranchOrderOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCreateBranchOrder} className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-800 mb-4">Add Items to Request</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Product</label>
                    <select value={branchOrderCurrentItem.productId} onChange={e => setBranchOrderCurrentItem({...branchOrderCurrentItem, productId: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500 bg-white">
                      <option value="">-- Choose Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Global Stock: {p.stockByWarehouse?.[warehouses[0]?.id] || 0})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Quantity Needed</label>
                    <input type="number" min="1" value={branchOrderCurrentItem.qty} onChange={e => setBranchOrderCurrentItem({...branchOrderCurrentItem, qty: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" placeholder="0" />
                  </div>
                </div>
                <button type="button" onClick={() => {
                  if(!branchOrderCurrentItem.productId || !branchOrderCurrentItem.qty) return;
                  setNewBranchOrder({...newBranchOrder, items: [...newBranchOrder.items, branchOrderCurrentItem]});
                  setBranchOrderCurrentItem({ productId: '', qty: '' });
                }} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-2 rounded-xl text-sm transition-colors w-full md:w-auto">
                  + Add Item
                </button>
              </div>

              {newBranchOrder.items.length > 0 && (
                <div>
                  <table className="w-full text-left border-collapse bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="p-3 text-xs font-bold text-slate-600">Product</th>
                        <th className="p-3 text-xs font-bold text-slate-600">Qty Needed</th>
                        <th className="p-3 text-xs font-bold text-slate-600"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {newBranchOrder.items.map((item, idx) => {
                        const prod = products.find(p => p.id === item.productId);
                        return (
                          <tr key={idx} className="border-t border-slate-100">
                            <td className="p-3 text-sm font-bold text-slate-800">{prod?.name || 'Unknown'}</td>
                            <td className="p-3 text-sm text-slate-600">{item.qty}</td>
                            <td className="p-3 text-right">
                              <button type="button" onClick={() => setNewBranchOrder({...newBranchOrder, items: newBranchOrder.items.filter((_, i) => i !== idx)})} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4"/></button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                <textarea rows="2" value={newBranchOrder.note} onChange={e => setNewBranchOrder({...newBranchOrder, note: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-recloud-500" placeholder="Reason for request..."></textarea>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsCreateBranchOrderOpen(false)} className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-900">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBulkReceiveOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in overflow-y-auto p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-5xl shadow-2xl animate-in zoom-in-95 my-8">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-800">Bulk Stock Received</h3>
              <button onClick={() => setIsBulkReceiveOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleBulkReceiveStock}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Month</label>
                  <select value={bulkReceiveForm.month} onChange={e => setBulkReceiveForm({...bulkReceiveForm, month: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500">
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Day</label>
                  <input type="number" min="1" max="31" value={bulkReceiveForm.day} onChange={e => setBulkReceiveForm({...bulkReceiveForm, day: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Year</label>
                  <input type="number" value={bulkReceiveForm.year} onChange={e => setBulkReceiveForm({...bulkReceiveForm, year: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Waybill No.</label>
                  <input type="text" value={bulkReceiveForm.waybill} onChange={e => setBulkReceiveForm({...bulkReceiveForm, waybill: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500" placeholder="Optional" />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden mb-6 max-h-[50vh] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 sticky top-0 z-10">
                    <tr>
                      <th className="p-3 text-xs font-bold text-slate-600">Product Name</th>
                      <th className="p-3 text-xs font-bold text-slate-600">Category</th>
                      <th className="p-3 text-xs font-bold text-slate-600">Current Stock</th>
                      <th className="p-3 text-xs font-bold text-slate-600 w-32">Qty Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => {
                      const currentStock = getFilteredStock(p);
                      return (
                        <tr key={p.id} className="border-b border-slate-200 hover:bg-white">
                          <td className="p-3">
                            <div className="font-bold text-slate-800 text-sm">{p.name}</div>
                            {p.genericName && <div className="text-xs text-slate-500 italic">{p.genericName}</div>}
                          </td>
                          <td className="p-3 text-sm text-slate-600">{p.category}</td>
                          <td className="p-3 text-sm text-slate-600">{currentStock}</td>
                          <td className="p-3">
                            <input 
                              type="number" 
                              min="0"
                              placeholder="0"
                              value={bulkReceiveForm.items[p.id] || ''} 
                              onChange={e => setBulkReceiveForm({
                                ...bulkReceiveForm, 
                                items: { ...bulkReceiveForm.items, [p.id]: e.target.value }
                              })} 
                              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-emerald-500" 
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-4">
                <button type="button" onClick={() => setIsBulkReceiveOpen(false)} className="bg-white border border-slate-200 text-slate-600 font-bold py-3 px-6 rounded-xl hover:bg-slate-50">Cancel</button>
                <button type="submit" className="bg-emerald-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5"/> Process Bulk Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
