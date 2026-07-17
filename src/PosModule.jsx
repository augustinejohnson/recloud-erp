import React, { useState, useEffect } from 'react';
import { ShoppingCart, User, Plus, Minus, Trash2, Search, Package, CheckCircle2, AlertCircle, Banknote, PauseCircle, CreditCard, Receipt } from 'lucide-react';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export default function PosModule({ currentTenant, currentUser }) {
  const [cart, setCart] = useState([]);
  const [heldCarts, setHeldCarts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [manualCustomerPhone, setManualCustomerPhone] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [mobileView, setMobileView] = useState('products');
  const [isProcessing, setIsProcessing] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  
  // Payment Modal States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [splitAmounts, setSplitAmounts] = useState({ cash: '', card: '', transfer: '' });
  const [showStartShift, setShowStartShift] = useState(false);
  const [showEndShift, setShowEndShift] = useState(false);
  const [activeShift, setActiveShift] = useState(null);
  const [actualCash, setActualCash] = useState('');

  useEffect(() => {
    const savedShift = localStorage.getItem('activeShift');
    if (savedShift) {
      setActiveShift(JSON.parse(savedShift));
    } else {
      setShowStartShift(true);
    }
  }, []);

  useEffect(() => {
    if (!currentTenant) return;
    const unsubProducts = onSnapshot(collection(db, `organizations/${currentTenant}/inventory`), snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubCustomers = onSnapshot(collection(db, `organizations/${currentTenant}/customers`), snap => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubProducts(); unsubCustomers(); };
  }, [currentTenant]);

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) return alert('Cannot add more than available stock.');
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      if (product.stock < 1) return alert('Out of stock!');
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        if (newQ > item.stock) { alert('Exceeds stock!'); return item; }
        if (newQ < 1) return item;
        return { ...item, quantity: newQ };
      }
      return item;
    }));
  };

  const removeFromCart = (id) => setCart(cart.filter(item => item.id !== id));
  const holdCart = () => alert('Cart on hold functionality not fully implemented.');
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = cartTotal - (cartTotal * (Number(discountPercent)||0) / 100) + (cartTotal * (Number(taxPercent)||0) / 100);

  const simulateTerminalSync = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      handleCheckout();
    }, 2000);
  };

  const handleCheckout = async (e) => {
    if (e) e.preventDefault();
    if (cart.length === 0) return alert('Cart is empty.');
    setIsProcessing(true);
    try {
      const invRef = collection(db, `organizations/${currentTenant}/invoices`);
      const invoiceData = {
        customerName: selectedCustomer ? selectedCustomer.name : (manualCustomerName || 'Walk-in'),
        customerPhone: selectedCustomer ? selectedCustomer.phone : manualCustomerPhone,
        items: cart,
        totalAmount: cartTotal,
        paymentMethod: paymentMethod,
        splitAmounts: paymentMethod === 'Split' ? splitAmounts : null,
        date: new Date().toISOString(),
        timestamp: serverTimestamp(),
        createdBy: currentUser.name,
        status: 'Paid',
        type: 'Sales Receipt'
      };
      await addDoc(invRef, invoiceData);

      // Deduct stock
      for (const item of cart) {
        if (item.id) {
          const prodRef = doc(db, `organizations/${currentTenant}/inventory`, item.id);
          await updateDoc(prodRef, {
            stock: item.stock - item.quantity
          });
        }
      }

      alert('Checkout successful!');
      setCart([]);
      setSelectedCustomer(null);
      setManualCustomerName('');
      setManualCustomerPhone('');
      setShowPaymentModal(false);
      setPaymentMethod('Cash');
      setSplitAmounts({ cash: '', card: '', transfer: '' });
    } catch (err) {
      console.error(err);
      alert('Error processing checkout: ' + err.message);
    }
    setIsProcessing(false);
  };

  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = activeCategory === 'All' || p.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="flex flex-col-reverse md:flex-row h-full bg-slate-50 relative overflow-hidden">
      
      {/* Mobile Toggle Tabs */}
      <div className="md:hidden flex border-t border-slate-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20 sticky bottom-0">
        <button 
          onClick={() => setMobileView('products')} 
          className={`flex-1 py-3 text-sm font-bold text-center border-r border-slate-100 flex justify-center items-center gap-2 ${mobileView === 'products' ? 'text-recloud-600 bg-recloud-50' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Package className="w-4 h-4" /> Products
        </button>
        <button 
          onClick={() => setMobileView('cart')} 
          className={`flex-1 py-3 text-sm font-bold text-center flex justify-center items-center gap-2 ${mobileView === 'cart' ? 'text-recloud-600 bg-recloud-50' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <ShoppingCart className="w-4 h-4" /> 
          Cart <span className="bg-recloud-600 text-white px-2 py-0.5 rounded-full text-[10px]">{`${cart.length}`}</span>
        </button>
      </div>

      {/* LEFT PANEL: CART & CHECKOUT */}
      <div className={`w-full md:w-[450px] bg-white border-r border-slate-200 flex-col shadow-2xl z-10 h-full ${mobileView === 'cart' ? 'flex' : 'hidden md:flex'}`}>
        
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-bold text-slate-800 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-recloud-500" /> Current Order</h2>
          <div className="flex gap-2">
            {cart.length > 0 && (
              <button onClick={holdCart} className="text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                <PauseCircle className="w-4 h-4" /> Hold
              </button>
            )}
            <button onClick={() => setCart([])} className="text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">Clear</button>
          </div>
        </div>

        {/* Customer Selection */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
            <User className="w-4 h-4" /> Customer
          </div>
          <select 
            value={selectedCustomer ? selectedCustomer.id : ''} 
            onChange={e => {
              const c = customers.find(x => x.id === e.target.value);
              setSelectedCustomer(c || null);
            }} 
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500 mb-2"
          >
            <option value="">Walk-in / Manual Entry</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
            ))}
          </select>
          {!selectedCustomer && (
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Name (Optional)" value={manualCustomerName} onChange={e => setManualCustomerName(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500" />
              <input type="text" placeholder="Phone (Optional)" value={manualCustomerPhone} onChange={e => setManualCustomerPhone(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-recloud-500" />
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-slate-400">
              <ShoppingCart className="w-12 h-12 mb-2 opacity-20" />
              <p className="text-sm font-medium">Cart is empty</p>
              <p className="text-xs mt-1 text-slate-300">Select products from the right to add</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between hover:border-slate-200 transition-colors shadow-sm">
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="font-bold text-slate-800 text-sm break-words">{item.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-recloud-600 font-bold">₦{item.price.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1 border border-slate-100">
                  <button onClick={() => updateQuantity(item.id, -1)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-white rounded transition-colors"><Minus className="w-4 h-4" /></button>
                  <input type="number" min="1" value={item.quantity} onChange={(e) => {
                    const newQty = parseInt(e.target.value);
                    if (!isNaN(newQty)) {
                      setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i));
                    }
                  }} onBlur={(e) => {
                    if (!parseInt(e.target.value) || parseInt(e.target.value) < 1) {
                      setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: 1 } : i));
                    }
                  }} className="w-10 text-center text-sm font-bold text-slate-700 bg-transparent outline-none border border-slate-200 rounded hide-spin-button px-0.5" />
                  <button onClick={() => updateQuantity(item.id, 1)} className="p-1 text-slate-400 hover:text-emerald-500 hover:bg-white rounded transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="w-20 text-right font-bold text-slate-800 pl-2">
                  ₦{(item.quantity * item.price).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Checkout */}
        <div className="bg-slate-50 border-t border-slate-200 p-4">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Subtotal</span>
              <span className="text-slate-800 font-bold">₦{cartTotal.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Discount (%)</span>
              <input type="number" min="0" max="100" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} className="w-16 text-right border border-slate-200 rounded px-2 py-0.5 outline-none focus:border-recloud-500" />
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Tax/VAT (%)</span>
              <input type="number" min="0" max="100" value={taxPercent} onChange={e => setTaxPercent(e.target.value)} className="w-16 text-right border border-slate-200 rounded px-2 py-0.5 outline-none focus:border-recloud-500" />
            </div>
            <div className="h-px bg-slate-200 w-full my-2"></div>
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-slate-800">Total</span>
              <span className="text-2xl font-black text-emerald-600">₦{total.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
            </div>
          </div>
          
          <button onClick={() => setShowPaymentModal(true)} disabled={cart.length === 0} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl shadow-lg transition-colors flex items-center justify-center gap-2 text-lg">
            <CreditCard className="w-6 h-6" /> Charge ₦{total.toLocaleString(undefined, {minimumFractionDigits:2})}
          </button>
        </div>
      </div>

      {/* RIGHT PANEL: PRODUCTS LIST */}
      <div className={`flex-1 flex-col h-full bg-slate-50/50 ${mobileView === 'products' ? 'flex' : 'hidden md:flex'}`}>
        
        {/* Top Header & Search */}
        <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input type="text" placeholder="Search product name, SKU, or subcategory..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-recloud-500 shadow-inner font-medium text-slate-700" />
          </div>
          
          <button onClick={() => setShowEndShift(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors">
            End Shift
          </button>
          
          {heldCarts.length > 0 && (
            <div className="relative group">
              <button className="bg-orange-100 text-orange-600 px-4 py-3 rounded-xl font-bold flex items-center gap-2">
                <PauseCircle className="w-5 h-5"/> {heldCarts.length} Held
              </button>
              <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="p-2 border-b border-slate-100 font-bold text-slate-700 text-sm bg-slate-50">Held Transactions</div>
                {heldCarts.map(hc => (
                  <button key={hc.id} onClick={() => resumeCart(hc.id)} className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-50 flex items-center justify-between group/btn">
                    <div>
                      <div className="font-bold text-sm text-slate-800">{hc.name}</div>
                      <div className="text-xs text-slate-500">{hc.cart.length} items</div>
                    </div>
                    <PlayCircle className="w-5 h-5 text-recloud-500 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Categories Bar */}
        <div className="px-4 py-3 bg-white border-b border-slate-100 overflow-x-auto no-scrollbar flex gap-2">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${activeCategory === cat ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-20">
            {filteredProducts.map(product => {
              const stock = getFilteredStock(product);
              const isLow = stock > 0 && stock <= (Number(product.minStockLevel) || 10);
              const isOut = stock <= 0;
              return (
                <button 
                  key={product.id} 
                  onClick={() => addToCart(product)}
                  disabled={isOut}
                  className={`bg-white rounded-2xl p-3 border-2 transition-all flex flex-col items-center text-center relative overflow-hidden group ${isOut ? 'border-slate-100 opacity-50 cursor-not-allowed' : 'border-transparent hover:border-recloud-400 hover:shadow-lg shadow-sm'}`}
                >
                  <div className={`absolute top-2 right-2 text-[10px] font-black px-2 py-0.5 rounded-full ${isOut ? 'bg-red-100 text-red-600' : isLow ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {stock} left
                  </div>
                  <div className="w-full aspect-square bg-slate-50 rounded-xl mb-3 flex items-center justify-center p-2">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-contain mix-blend-multiply" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center text-xs font-bold">{product.name.substring(0,2).toUpperCase()}</div>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm leading-tight mb-1 break-words">{product.name}</h3>
                  <div className="text-xs text-slate-400 font-semibold mb-2">{product.sku || '-'}</div>
                  <div className="mt-auto text-lg font-black text-recloud-600">
                    ₦{Number(product.priceWholesale || 0).toLocaleString()}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl w-[500px] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 bg-emerald-600 text-white text-center">
              <h2 className="text-xl font-medium opacity-90 mb-1">Total to Pay</h2>
              <div className="text-5xl font-black tracking-tight">₦{total.toLocaleString(undefined, {minimumFractionDigits:2})}</div>
            </div>
            <div className="p-6">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Select Payment Method</h3>
              <div className="grid grid-cols-4 gap-3 mb-6">
                <button onClick={() => setPaymentMethod('Cash')} className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 border-2 transition-all ${paymentMethod === 'Cash' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-500 hover:border-slate-300'}`}>
                  <Banknote className="w-8 h-8" />
                  <span className="font-bold">Cash</span>
                </button>
                <button onClick={() => setPaymentMethod('POS / Card')} className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 border-2 transition-all ${paymentMethod === 'POS / Card' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-500 hover:border-slate-300'}`}>
                  <CreditCard className="w-8 h-8" />
                  <span className="font-bold">Card</span>
                </button>
                <button onClick={() => setPaymentMethod('Transfer')} className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 border-2 transition-all ${paymentMethod === 'Transfer' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-500 hover:border-slate-300'}`}>
                  <Receipt className="w-8 h-8" />
                  <span className="font-bold text-[11px]">Transfer</span>
                </button>
                <button onClick={() => setPaymentMethod('Split')} className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 border-2 transition-all ${paymentMethod === 'Split' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-500 hover:border-slate-300'}`}>
                  <div className="flex -space-x-2"><Banknote className="w-5 h-5" /><CreditCard className="w-5 h-5" /></div>
                  <span className="font-bold text-[11px]">Split Pay</span>
                </button>
              </div>

              {paymentMethod === 'Split' && (
                <div className="mb-6 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-sm font-bold text-slate-600 mb-2">Enter Split Amounts</div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Cash (₦)</span>
                    <input type="number" value={splitAmounts.cash} onChange={e => setSplitAmounts({...splitAmounts, cash: e.target.value})} className="w-32 border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Card (₦)</span>
                    <input type="number" value={splitAmounts.card} onChange={e => setSplitAmounts({...splitAmounts, card: e.target.value})} className="w-32 border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Transfer (₦)</span>
                    <input type="number" value={splitAmounts.transfer} onChange={e => setSplitAmounts({...splitAmounts, transfer: e.target.value})} className="w-32 border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500" />
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-2 border-t border-slate-200 font-bold text-emerald-700">
                    <span>Split Total</span>
                    <span>₦{(Number(splitAmounts.cash) + Number(splitAmounts.card) + Number(splitAmounts.transfer)).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col gap-3">
                {paymentMethod === 'POS / Card' && (
                  <button onClick={simulateTerminalSync} disabled={isProcessing} className="w-full py-3 font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 hover:bg-emerald-200 disabled:opacity-50 rounded-2xl transition-colors flex items-center justify-center gap-2">
                    {isProcessing ? 'Waiting for Terminal Tap...' : <><CreditCard className="w-5 h-5"/> Sync Smart Terminal & Pay</>}
                  </button>
                )}
                <div className="flex gap-3">
                  <button onClick={() => setShowPaymentModal(false)} disabled={isProcessing} className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-colors">Cancel</button>
                  <button onClick={(e) => handleCheckout(e)} disabled={isProcessing} className="flex-[2] py-4 font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-2xl transition-colors flex items-center justify-center gap-2">
                    {isProcessing ? 'Processing...' : <><CheckCircle2 className="w-5 h-5"/> Complete Sale (Manual)</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Shift Management Modals */}
      {showStartShift && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl w-[400px] shadow-2xl p-6">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Start Shift</h2>
            <p className="text-sm text-slate-500 mb-6">Enter your opening cash float to begin.</p>
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">Opening Cash (₦)</label>
              <input type="number" value={openingFloat} onChange={e => setOpeningFloat(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-recloud-500 text-lg font-bold" placeholder="e.g. 5000" autoFocus />
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowStartShift(false)}
                className="w-1/3 py-4 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-lg"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (!openingFloat) return alert("Please enter opening float");
                  const shiftData = { startTime: Date.now(), openingFloat: Number(openingFloat), cashSales: 0, cardSales: 0, transferSales: 0 };
                  setActiveShift(shiftData);
                  localStorage.setItem('activeShift', JSON.stringify(shiftData));
                  setShowStartShift(false);
                }}
                className="flex-1 py-4 font-bold text-white bg-recloud-600 hover:bg-recloud-700 rounded-xl transition-colors text-lg"
              >
                Open Register
              </button>
            </div>
          </div>
        </div>
      )}

      {showEndShift && activeShift && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in overflow-y-auto py-10">
          <div className="bg-white rounded-3xl w-[450px] shadow-2xl p-6 my-auto">
            <h2 className="text-2xl font-black text-slate-800 mb-2">End of Shift (Z-Report)</h2>
            <p className="text-sm text-slate-500 mb-6">Declare your cash drawer to close out the shift.</p>
            
            <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3 border border-slate-200">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Opening Float</span>
                <span className="font-bold">₦{activeShift.openingFloat.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Cash Sales</span>
                <span className="font-bold text-emerald-600">+ ₦{activeShift.cashSales.toLocaleString()}</span>
              </div>
              <div className="h-px bg-slate-200 w-full"></div>
              <div className="flex justify-between text-base">
                <span className="font-bold text-slate-700">Expected Cash in Drawer</span>
                <span className="font-black text-slate-800">₦{(activeShift.openingFloat + activeShift.cashSales).toLocaleString()}</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">Actual Cash Counted (₦)</label>
              <input type="number" value={actualCash} onChange={e => setActualCash(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 text-lg font-bold" placeholder="Enter counted cash" autoFocus />
              
              {actualCash !== '' && (
                <div className={`mt-2 text-sm font-bold ${Number(actualCash) === (activeShift.openingFloat + activeShift.cashSales) ? 'text-emerald-600' : 'text-red-500'}`}>
                  Difference: ₦{(Number(actualCash) - (activeShift.openingFloat + activeShift.cashSales)).toLocaleString()}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowEndShift(false)} className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
              <button 
                onClick={() => {
                  if (actualCash === '') return alert("Please enter actual cash");
                  if (!window.confirm("Close out this shift? You will need to start a new shift to use the POS.")) return;
                  
                  // In a real app we would save this to firebase
                  console.log("Shift Closed", { ...activeShift, actualCash: Number(actualCash), difference: Number(actualCash) - (activeShift.openingFloat + activeShift.cashSales) });
                  
                  setActiveShift(null);
                  localStorage.removeItem('activeShift');
                  setActualCash('');
                  setShowEndShift(false);
                  setShowStartShift(true);
                }}
                className="flex-[2] py-4 font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors text-lg"
              >
                Close Register
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
