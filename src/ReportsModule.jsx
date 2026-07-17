import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Filter, DollarSign, TrendingUp, Users, ShoppingBag, Calendar, Download } from 'lucide-react';

export default function ReportsModule({ sales, b2bOrders, customers, products, employees }) {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [orderType, setOrderType] = useState('all'); // all, pos, b2b

  // Combine and normalize POS and B2B orders
  const allOrders = useMemo(() => {
    const pos = (sales || []).map(s => ({
      ...s,
      type: 'POS Retail',
      date: new Date(s.createdAt?.seconds * 1000 || s.createdAt || Date.now()),
      staff: s.cashierName || 'Admin',
      customer: s.customerName || 'Walk-in',
      invoiceNumber: s.invoiceNumber || s.id.substring(0, 8).toUpperCase()
    }));
    
    const b2b = (b2bOrders || []).filter(o => o.status !== 'rejected').map(o => ({
      ...o,
      type: 'B2B Wholesale',
      date: new Date(o.date || o.createdAt?.seconds * 1000 || Date.now()),
      staff: 'Distributor/Self',
      customer: o.userName || 'B2B Customer',
      invoiceNumber: o.invoiceNumber || o.id.substring(0, 8).toUpperCase()
    }));

    return [...pos, ...b2b].sort((a, b) => b.date - a.date);
  }, [sales, b2bOrders]);

  // Apply Filters
  const filteredOrders = useMemo(() => {
    const result = [];

    for (const order of allOrders) {
      let matches = true;

      // Date Range
      if (dateRange.start && order.date < new Date(dateRange.start)) matches = false;
      if (dateRange.end) {
        const endDay = new Date(dateRange.end);
        endDay.setHours(23, 59, 59, 999);
        if (order.date > endDay) matches = false;
      }

      // Order Type
      if (orderType !== 'all') {
        if (orderType === 'pos' && order.type !== 'POS Retail') matches = false;
        if (orderType === 'b2b' && order.type !== 'B2B Wholesale') matches = false;
      }

      // Customer
      if (selectedCustomer && !order.customer.toLowerCase().includes(selectedCustomer.toLowerCase())) matches = false;

      // Staff
      if (selectedStaff && !order.staff.toLowerCase().includes(selectedStaff.toLowerCase())) matches = false;

      if (!matches) continue;

      let finalOrder = { ...order };

      // Product Filter - isolate the specific item and recalculate total
      if (selectedProduct) {
        const matchingItems = (order.items || []).filter(item => 
          item.productId === selectedProduct || 
          item.name.toLowerCase().includes(selectedProduct.toLowerCase())
        );
        
        if (matchingItems.length === 0) {
          continue; // Skip order if it doesn't contain the product
        }

        finalOrder.items = matchingItems;
        finalOrder.totalAmount = matchingItems.reduce((sum, item) => sum + (Number(item.qty || 1) * Number(item.unitPrice || 0)), 0);
      }

      result.push(finalOrder);
    }

    return result;
  }, [allOrders, dateRange, orderType, selectedCustomer, selectedStaff, selectedProduct]);

  // KPI Calculations
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
  const totalOrderCount = filteredOrders.length;
  const uniqueCustomers = new Set(filteredOrders.map(o => o.customer)).size;
  const avgOrderValue = totalOrderCount > 0 ? totalRevenue / totalOrderCount : 0;
  const avgLtv = uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0; // Average Lifetime Value
  const totalItemsSold = filteredOrders.reduce((sum, order) => {
    const itemsSum = (order.items || []).reduce((itemSum, item) => itemSum + Number(item.qty || 1), 0);
    return sum + itemsSum;
  }, 0);

  const handleExportCsv = () => {
    const headers = ['Invoice Number', 'Date', 'Type', 'Customer', 'Staff', 'Items', 'Total Amount'];
    const rows = filteredOrders.map(order => [
      order.invoiceNumber,
      order.date.toLocaleString(),
      order.type,
      `"${order.customer}"`,
      `"${order.staff}"`,
      `"${(order.items || []).map(i => `${i.qty}x ${i.name}`).join(', ')}"`,
      order.totalAmount
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `sales_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Monthly Chart Data
  const monthlyData = useMemo(() => {
    const monthsMap = {};
    filteredOrders.forEach(order => {
      const monthYear = order.date.toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!monthsMap[monthYear]) {
        monthsMap[monthYear] = { name: monthYear, posSales: 0, b2bSales: 0, total: 0 };
      }
      const amount = Number(order.totalAmount) || 0;
      monthsMap[monthYear].total += amount;
      if (order.type === 'POS Retail') {
        monthsMap[monthYear].posSales += amount;
      } else {
        monthsMap[monthYear].b2bSales += amount;
      }
    });

    // Convert to array and sort chronologically
    return Object.values(monthsMap).sort((a, b) => {
      const dateA = new Date(a.name);
      const dateB = new Date(b.name);
      return dateA - dateB;
    });
  }, [filteredOrders]);

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 md:py-6 shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center z-10 shadow-sm relative gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight">Analytics & Reports</h1>
          <p className="text-slate-500 mt-1 text-xs md:text-base">Track revenue, filter sales by product or customer, and analyze LTV.</p>
        </div>
        <button onClick={handleExportCsv} className="bg-recloud-600 hover:bg-recloud-700 text-white font-bold py-2 px-4 rounded-xl shadow-sm transition-all flex items-center gap-2 text-xs md:text-sm w-full md:w-auto justify-center">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-8">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-8">
          <div className="bg-white p-3 md:p-6 rounded-xl md:rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 md:gap-4 overflow-hidden">
            <div className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] md:text-sm font-bold text-slate-500 uppercase tracking-wider truncate" title="Filtered Revenue">Filtered Revenue</p>
              <p className="text-lg md:text-2xl font-black text-slate-800 truncate" title={`₦${totalRevenue.toLocaleString()}`}>₦{totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
          </div>

          <div className="bg-white p-3 md:p-6 rounded-xl md:rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 md:gap-4 overflow-hidden">
            <div className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-6 h-6 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] md:text-sm font-bold text-slate-500 uppercase tracking-wider truncate" title="Total Items Sold">Total Items Sold</p>
              <p className="text-lg md:text-2xl font-black text-slate-800 truncate" title={totalItemsSold.toLocaleString()}>{totalItemsSold.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white p-3 md:p-6 rounded-xl md:rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 md:gap-4 overflow-hidden">
            <div className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] md:text-sm font-bold text-slate-500 uppercase tracking-wider truncate" title="Avg Order Value">Avg Order Value</p>
              <p className="text-lg md:text-2xl font-black text-slate-800 truncate" title={`₦${avgOrderValue.toLocaleString()}`}>₦{avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
          </div>

          <div className="bg-white p-3 md:p-6 rounded-xl md:rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 md:gap-4 overflow-hidden">
            <div className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] md:text-sm font-bold text-slate-500 uppercase tracking-wider truncate" title="Avg Customer LTV">Avg Customer LTV</p>
              <p className="text-lg md:text-2xl font-black text-slate-800 truncate" title={`₦${avgLtv.toLocaleString()}`}>₦{avgLtv.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>

        {/* Layout Grid for Chart and Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 mb-4 md:mb-8">
          
          {/* Chart Section */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-400" /> Monthly Revenue Trend
            </h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(val) => '₦' + (val/1000) + 'k'} />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="posSales" name="POS Retail Sales" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="b2bSales" name="B2B Wholesale" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Filters Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-400" /> Advanced Filters
            </h3>
            
            <div className="space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Start Date</label>
                  <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-recloud-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">End Date</label>
                  <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-recloud-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Sales Channel</label>
                <select value={orderType} onChange={e => setOrderType(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-recloud-500 outline-none bg-white">
                  <option value="all">All Channels</option>
                  <option value="pos">POS Retail Only</option>
                  <option value="b2b">B2B Wholesale Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Filter by Product</label>
                <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-recloud-500 outline-none bg-white">
                  <option value="">Any Product</option>
                  {(products || []).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Customer Name</label>
                <input type="text" placeholder="Search customer..." value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-recloud-500 outline-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Staff / Cashier</label>
                <input type="text" placeholder="Search staff..." value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-recloud-500 outline-none" />
              </div>
            </div>

            <button onClick={() => {
              setDateRange({start: '', end: ''});
              setSelectedProduct('');
              setSelectedCustomer('');
              setSelectedStaff('');
              setOrderType('all');
            }} className="w-full mt-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors text-sm">
              Reset Filters
            </button>
          </div>
        </div>

        {/* Detailed Records Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-12">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">Filtered Sales Records</h3>
            <span className="text-sm font-bold text-recloud-600 bg-recloud-50 px-3 py-1 rounded-full">{filteredOrders.length} Records Found</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 min-w-[800px]">
              <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-4">Invoice #</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Channel</th>
                  <th className="p-4">Items</th>
                  <th className="p-4 text-right">Total Amount</th>
                  <th className="p-4">Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr><td colSpan="7" className="p-8 text-center text-slate-400">No records match the current filters.</td></tr>
                ) : (
                  filteredOrders.slice(0, 100).map(order => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-800">#{order.invoiceNumber}</td>
                      <td className="p-4 whitespace-nowrap">{order.date.toLocaleDateString()} {order.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                      <td className="p-4 font-bold">{order.customer}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${order.type === 'POS Retail' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {order.type}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-500 max-w-[200px] truncate">
                        {(order.items || []).map(i => `${i.qty}x ${i.name}`).join(', ')}
                      </td>
                      <td className="p-4 text-right font-black text-slate-800">₦{Number(order.totalAmount).toLocaleString()}</td>
                      <td className="p-4">{order.staff}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {filteredOrders.length > 100 && (
              <div className="p-4 text-center text-sm font-bold text-slate-400 bg-slate-50 border-t border-slate-100">
                Showing top 100 recent records out of {filteredOrders.length}.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
