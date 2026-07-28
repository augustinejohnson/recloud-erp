import React, { useState, useMemo, useEffect } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle2, AlertCircle, Clock, Package, FileText, Eye, X, Printer } from 'lucide-react';
import { addB2BOrder, updateEmployee, getB2BOrders, getNextInvoiceNumber } from './firebase';

export default function B2bOrderModule({ currentUser, products, currentTenant, tenantConfig }) {
  const [activeView, setActiveView] = useState('shop'); // 'shop' or 'orders'
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('pay_later');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [myOrders, setMyOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [viewOrderDetail, setViewOrderDetail] = useState(null);

  // Fetch this user's orders
  const fetchMyOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const allOrders = await getB2BOrders(currentTenant);
      const mine = allOrders.filter(o => o.userId === currentUser?.id).sort((a, b) => {
        const da = a.date || a.createdAt?.toDate?.()?.toISOString?.() || '';
        const db2 = b.date || b.createdAt?.toDate?.()?.toISOString?.() || '';
        return db2.localeCompare(da);
      });
      setMyOrders(mine);
    } catch (e) {
      console.error('Failed to load orders', e);
    }
    setIsLoadingOrders(false);
  };

  useEffect(() => {
    if (activeView === 'orders') fetchMyOrders();
  }, [activeView]);

  const getPriceForUser = (product) => {
    const role = currentUser?.role || 'b2b_customer';
    if (role === 'staff') return Number(product.priceStaff) || Number(product.priceWholesale) || 0;
    if (role === 'distributor' || role === 'sales_rep') return Number(product.priceDistributor) || Number(product.priceWholesale) || 0;
    return Number(product.priceWholesale) || 0;
  };

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p =>
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => item.productId === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        qty: 1,
        unitPrice: getPriceForUser(product),
        costPrice: product.costPrice || product.priceCost || 0,
        image: product.image
      }];
    });
  };

  const updateQty = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);

  const currentBalance = Number(currentUser?.currentBalance || 0);
  const creditLimit = Number(currentUser?.creditLimit || 0);
  const isB2BRole = ['distributor', 'sales_rep', 'b2b_customer'].includes(currentUser?.role);
  const hasExceededLimit = paymentMethod === 'pay_later' && isB2BRole && creditLimit > 0 && (currentBalance + cartTotal > creditLimit);

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    if (hasExceededLimit) {
      alert("Credit limit exceeded. Please reduce order size or clear pending balances.");
      return;
    }

    setIsSubmitting(true);
    try {
      const invoiceNumber = await getNextInvoiceNumber(currentTenant, tenantConfig?.companyName);
      
      const totalCost = cart.reduce((sum, item) => sum + (Number(item.costPrice || 0) * item.qty), 0);

      const orderData = {
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        items: cart.map(item => ({ ...item, costPrice: Number(item.costPrice || 0) })),
        totalAmount: cartTotal,
        totalCost,
        paymentMethod: paymentMethod,
        paymentStatus: paymentMethod === 'pay_later' ? 'unpaid' : 'paid',
        status: 'pending',
        warehouseId: currentUser.warehouseId || null,
        date: new Date().toISOString(),
        invoiceNumber: invoiceNumber
      };

      await addB2BOrder(orderData, currentTenant);

      if (paymentMethod === 'pay_later') {
        await updateEmployee(currentUser.id, {
          currentBalance: currentBalance + cartTotal
        }, currentTenant);
      }

      setSuccessMsg("Order submitted successfully! It is now pending Head Office approval.");
      setCart([]);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (error) {
      console.error("Order submission failed:", error);
      alert("Failed to submit order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'pending': return { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Clock, label: 'Pending Review' };
      case 'fulfilled': return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2, label: 'Fulfilled' };
      case 'rejected': return { color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle, label: 'Rejected' };
      default: return { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock, label: status || 'Unknown' };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return dateStr; }
  };

  // Print individual order invoice
  const printOrderInvoice = (order) => {
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Invoice #${order.invoiceNumber || order.id?.substring(0, 8).toUpperCase()}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #1e293b; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
        .brand { font-size: 20px; font-weight: 900; color: #6366f1; }
        .invoice-title { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px; }
        .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .detail-box { background: #f8fafc; border-radius: 8px; padding: 12px; border: 1px solid #e2e8f0; }
        .detail-box h4 { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin: 0 0 4px 0; }
        .detail-box p { margin: 2px 0; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; border-bottom: 2px solid #e2e8f0; }
        td { padding: 4px 8px; border-bottom: 1px solid #f1f5f9; font-size: 10px; }
        .total-row { background: #6366f1; color: white; }
        .total-row td { font-weight: 900; font-size: 12px; border: none; }
        .footer { text-align: center; color: #94a3b8; font-size: 9px; margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; }
        .status-badge { display: inline-block; padding: 3px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; }
        @media print { body { padding: 10px; } }
      </style></head><body>
      <div class="header">
        <div>
          <div class="brand">☁ ${tenantConfig?.companyName || 'Recloud ERP'}</div>
          <div class="invoice-title">B2B Wholesale Invoice</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 20px; font-weight: 900; color: #1e293b;">#${order.invoiceNumber || order.id?.substring(0, 8).toUpperCase()}</div>
          <div style="font-size: 13px; color: #64748b;">${formatDate(order.date)}</div>
          <div class="status-badge" style="background: ${order.status === 'fulfilled' ? '#dcfce7' : '#fef3c7'}; color: ${order.status === 'fulfilled' ? '#15803d' : '#b45309'}; margin-top: 8px;">
            ${order.status === 'fulfilled' ? '✓ FULFILLED' : '⏳ PENDING'}
          </div>
        </div>
      </div>
      <div class="details">
        <div class="detail-box">
          <h4>Bill To</h4>
          <p><strong>${order.userName}</strong></p>
          <p style="color: #64748b; text-transform: capitalize;">${order.userRole?.replace('_', ' ') || 'Customer'}</p>
        </div>
        <div class="detail-box">
          <h4>Payment</h4>
          <p><strong>${order.paymentMethod === 'pay_now' ? 'Card Payment' : order.paymentMethod === 'transfer' ? 'Bank Transfer' : 'Invoice (Pay Later)'}</strong></p>
          <p style="color: ${order.paymentStatus === 'paid' ? '#15803d' : '#b45309'};">Status: ${order.paymentStatus === 'paid' ? '✓ Paid' : '⏳ Unpaid'}</p>
        </div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Product</th><th>Qty</th><th>Unit Price</th><th style="text-align:right">Line Total</th></tr></thead>
        <tbody>
          ${(order.items || []).map((item, i) => `
            <tr>
              <td>${i + 1}</td>
              <td><strong>${item.name}</strong></td>
              <td>${item.qty}</td>
              <td>₦${Number(item.unitPrice).toLocaleString()}</td>
              <td style="text-align:right; font-weight:700;">₦${(item.qty * item.unitPrice).toLocaleString()}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="4" style="text-align:right">TOTAL</td>
            <td style="text-align:right">₦${Number(order.totalAmount).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
      <div class="footer">
        <p>Thank you for your business!</p>
        <p>${tenantConfig?.companyName || 'Recloud ERP'} · Generated on ${new Date().toLocaleString()}</p>
      </div>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Wholesale Portal</h1>
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            <button onClick={() => setActiveView('shop')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'shop' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <ShoppingCart className="w-4 h-4 inline mr-1.5" />Shop
            </button>
            <button onClick={() => setActiveView('orders')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'orders' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <FileText className="w-4 h-4 inline mr-1.5" />My Orders
              {myOrders.filter(o => o.status === 'pending').length > 0 && (
                <span className="ml-1.5 bg-orange-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{myOrders.filter(o => o.status === 'pending').length}</span>
              )}
            </button>
          </div>
        </div>
        <p className="text-sm font-medium text-slate-500 capitalize">Welcome, {currentUser?.name} ({currentUser?.role?.replace('_', ' ')})</p>
      </div>

      {/* ===== SHOP VIEW ===== */}
      {activeView === 'shop' && (
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Product Catalog Side */}
          <div className="flex-1 flex flex-col h-full border-r border-slate-200">
            <div className="bg-white p-4 border-b border-slate-100 shadow-sm z-10 shrink-0">
              <div className="relative w-full max-w-lg">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search catalog..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              {successMsg && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-700 font-bold animate-in slide-in-from-top-4">
                  <CheckCircle2 className="w-5 h-5" />
                  {successMsg}
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map(product => {
                  const price = getPriceForUser(product);
                  return (
                    <div key={product.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                      <div className="h-40 bg-slate-100 relative">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-2xl uppercase">
                            {product.name?.substring(0, 2)}
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm text-xs font-bold text-slate-600">
                          {product.category}
                        </div>
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-bold text-slate-800 break-words">{product.name}</h3>
                        <div className="mt-1 flex items-baseline gap-1">
                          <span className="text-lg font-black text-blue-600">₦{price.toLocaleString()}</span>
                        </div>
                        <div className="mt-4 mt-auto">
                          <button
                            onClick={() => addToCart(product)}
                            className="w-full py-2.5 bg-slate-50 hover:bg-blue-50 text-blue-600 font-bold text-sm rounded-xl transition-colors border border-slate-100 hover:border-blue-100"
                          >
                            Add to Order
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cart & Checkout Side */}
          <div className="w-96 bg-white h-full flex flex-col shadow-xl z-20">
            <div className="p-4 border-b border-slate-100 bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black">Current Order</h2>
                  <p className="text-xs font-medium text-slate-400">{cart.length} items selected</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 min-h-0">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-slate-400">
                  <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
                  <p className="font-medium text-sm">Your order cart is empty</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.productId} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                      {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs font-bold">{item.name.substring(0,2)}</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-800 break-words">{item.name}</h4>
                      <p className="text-xs font-semibold text-blue-600">₦{item.unitPrice.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-50 rounded-lg border border-slate-100 p-1">
                      <button onClick={() => updateQty(item.productId, -1)} className="p-1 hover:bg-white rounded shadow-sm text-slate-500"><Minus className="w-3 h-3"/></button>
                      <input type="number" min="1" value={item.qty} onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setCart(prev => prev.map(i => i.productId === item.productId ? { ...i, qty: '' } : i));
                        } else {
                          const newQty = parseInt(val);
                          if (!isNaN(newQty)) {
                            setCart(prev => prev.map(i => i.productId === item.productId ? { ...i, qty: newQty } : i));
                          }
                        }
                      }} onBlur={(e) => {
                        if (!parseInt(e.target.value) || parseInt(e.target.value) < 1) {
                          setCart(prev => prev.map(i => i.productId === item.productId ? { ...i, qty: 1 } : i));
                        }
                      }} className="w-10 text-center text-xs font-bold text-slate-700 bg-transparent outline-none border border-slate-200 rounded hide-spin-button px-0.5" />
                      <button onClick={() => updateQty(item.productId, 1)} className="p-1 hover:bg-white rounded shadow-sm text-slate-500"><Plus className="w-3 h-3"/></button>
                    </div>
                    <button onClick={() => removeFromCart(item.productId)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] overflow-y-auto max-h-[50vh] shrink-0">
              <div className="flex justify-between items-end mb-4">
                <span className="text-sm font-bold text-slate-500">Total Amount</span>
                <span className="text-2xl font-black text-slate-800 tracking-tight">₦{cartTotal.toLocaleString()}</span>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Payment Option</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethod('pay_now')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-colors ${paymentMethod === 'pay_now' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    💳 Card
                  </button>
                  <button
                    onClick={() => setPaymentMethod('transfer')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-colors ${paymentMethod === 'transfer' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    🏦 Transfer
                  </button>
                  <button
                    onClick={() => setPaymentMethod('pay_later')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-colors ${paymentMethod === 'pay_later' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    📄 Invoice
                  </button>
                </div>
              </div>

              {paymentMethod === 'pay_now' && (
                <div className="mb-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Card Payment Details</p>
                  <input type="text" placeholder="Card Number (e.g. 5399 •••• •••• 1234)" className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="MM / YY" className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" />
                    <input type="text" placeholder="CVV" className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" />
                  </div>
                  <input type="text" placeholder="Cardholder Name" className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" />
                </div>
              )}

              {paymentMethod === 'transfer' && (
                <div className="mb-4 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Bank Transfer Details</p>
                  <div className="bg-white rounded-lg p-3 border border-emerald-100 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-medium">Bank Name</span>
                      <span className="text-sm font-bold text-slate-800">{tenantConfig?.bankName || 'Guaranty Trust Bank'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-medium">Account Number</span>
                      <span className="text-sm font-black text-emerald-700 tracking-wider">{tenantConfig?.accountNumber || '0123456789'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-medium">Account Name</span>
                      <span className="text-sm font-bold text-slate-800">{tenantConfig?.accountName || 'Company Enterprises Ltd'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-medium">Amount Due</span>
                      <span className="text-sm font-black text-emerald-700">₦{cartTotal.toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-600 font-medium">Send proof of payment after transfer for order confirmation.</p>
                </div>
              )}

              {isB2BRole && paymentMethod === 'pay_later' && creditLimit > 0 && (
                <div className={`mb-4 p-4 rounded-xl border ${hasExceededLimit ? 'bg-red-50 border-red-200 text-red-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Credit Used: ₦{currentBalance.toLocaleString()}</span>
                    <span>Limit: ₦{creditLimit.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full ${hasExceededLimit ? 'bg-red-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(100, ((currentBalance + cartTotal) / creditLimit) * 100 || 0)}%` }}
                    ></div>
                  </div>
                  {hasExceededLimit && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-red-600">
                      <AlertCircle className="w-3 h-3" />
                      Order exceeds credit limit.
                    </div>
                  )}
                </div>
              )}

              <button
                disabled={cart.length === 0 || hasExceededLimit || isSubmitting}
                onClick={handleSubmitOrder}
                className={`w-full py-3.5 rounded-xl font-black text-base transition-all shadow-lg ${cart.length === 0 || hasExceededLimit || isSubmitting ? 'bg-slate-100 text-slate-400 shadow-none cursor-not-allowed' : paymentMethod === 'pay_now' ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-500/25 active:scale-[0.98]' : paymentMethod === 'transfer' ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-500/25 active:scale-[0.98]' : 'bg-orange-600 text-white hover:bg-orange-700 hover:shadow-orange-500/25 active:scale-[0.98]'}`}
              >
                {isSubmitting ? 'Submitting...' : paymentMethod === 'pay_now' ? '💳 Pay with Card' : paymentMethod === 'transfer' ? '🏦 Confirm Transfer' : '📄 Request Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MY ORDERS VIEW ===== */}
      {activeView === 'orders' && (
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-800">My Order History</h2>
                <p className="text-sm text-slate-500 mt-1">Track all your wholesale orders and their current status</p>
              </div>
              <button onClick={fetchMyOrders} className="text-sm font-bold text-recloud-600 hover:bg-recloud-50 px-4 py-2 rounded-xl transition-colors">
                ↻ Refresh
              </button>
            </div>

            {isLoadingOrders ? (
              <div className="flex items-center justify-center py-20 text-slate-400">
                <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-recloud-500 rounded-full"></div>
                <span className="ml-3 font-medium">Loading orders...</span>
              </div>
            ) : myOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Package className="w-16 h-16 mb-4 opacity-20" />
                <h3 className="text-lg font-bold text-slate-600">No Orders Yet</h3>
                <p className="text-sm mt-1">Your order history will appear here once you place your first order.</p>
                <button onClick={() => setActiveView('shop')} className="mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors">
                  Start Shopping
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myOrders.map(order => {
                  const statusCfg = getStatusConfig(order.status);
                  const StatusIcon = statusCfg.icon;
                  return (
                    <div key={order.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                      <div className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${order.status === 'fulfilled' ? 'bg-emerald-100 text-emerald-600' : order.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                            <StatusIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-slate-800">Order #{order.invoiceNumber || order.id?.substring(0, 8).toUpperCase()}</h4>
                              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusCfg.color}`}>
                                {statusCfg.label}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {formatDate(order.date)} · {order.items?.length || 0} items · 
                              <span className="font-bold text-slate-700 ml-1">₦{Number(order.totalAmount || 0).toLocaleString()}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${order.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                            {order.paymentStatus === 'paid' ? '✓ Paid' : '⏳ Unpaid'}
                          </span>
                          <button onClick={() => setViewOrderDetail(order)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => printOrderInvoice(order)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {/* Compact item list */}
                      <div className="px-5 pb-4">
                        <div className="flex flex-wrap gap-2">
                          {(order.items || []).slice(0, 5).map((item, idx) => (
                            <span key={idx} className="bg-slate-50 text-slate-600 text-xs font-medium px-2.5 py-1 rounded-lg border border-slate-100">
                              {item.name} × {item.qty}
                            </span>
                          ))}
                          {(order.items || []).length > 5 && (
                            <span className="bg-slate-50 text-slate-400 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-100">
                              +{order.items.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {viewOrderDetail && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Order #{viewOrderDetail.invoiceNumber || viewOrderDetail.id?.substring(0, 8).toUpperCase()}</h3>
                <p className="text-sm text-slate-500">{formatDate(viewOrderDetail.date)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => printOrderInvoice(viewOrderDetail)} className="text-sm font-bold text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                  <Printer className="w-4 h-4" /> Print Invoice
                </button>
                <button onClick={() => setViewOrderDetail(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status & Payment */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Order Status</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusConfig(viewOrderDetail.status).color}`}>
                    {getStatusConfig(viewOrderDetail.status).label}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Payment Method</p>
                  <p className="text-sm font-bold text-slate-800">
                    {viewOrderDetail.paymentMethod === 'pay_now' ? '💳 Card' : viewOrderDetail.paymentMethod === 'transfer' ? '🏦 Transfer' : '📄 Invoice'}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Payment Status</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${viewOrderDetail.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {viewOrderDetail.paymentStatus === 'paid' ? '✓ Paid' : '⏳ Unpaid'}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="p-3 font-bold border-b border-slate-200">#</th>
                      <th className="p-3 font-bold border-b border-slate-200">Product</th>
                      <th className="p-3 font-bold border-b border-slate-200 text-center">Qty</th>
                      <th className="p-3 font-bold border-b border-slate-200 text-right">Unit Price</th>
                      <th className="p-3 font-bold border-b border-slate-200 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewOrderDetail.items || []).map((item, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="p-3 text-sm text-slate-400">{i + 1}</td>
                        <td className="p-3 text-sm font-bold text-slate-800">{item.name}</td>
                        <td className="p-3 text-sm text-center font-semibold text-slate-600">{item.qty}</td>
                        <td className="p-3 text-sm text-right text-slate-600">₦{Number(item.unitPrice).toLocaleString()}</td>
                        <td className="p-3 text-sm text-right font-bold text-slate-800">₦{(item.qty * item.unitPrice).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-800 text-white">
                      <td colSpan="4" className="p-4 text-right font-bold text-sm">TOTAL</td>
                      <td className="p-4 text-right font-black text-lg">₦{Number(viewOrderDetail.totalAmount || 0).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
