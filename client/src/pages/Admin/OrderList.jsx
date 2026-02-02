import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Phone, ChevronRight, Plus, Calendar, Truck, Bike, MessageCircle, Filter, X, User } from 'lucide-react';
import { orderService } from '../../services/orderService';

const OrderList = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStates, setSelectedStates] = useState(new Set());
    const [selectedTags, setSelectedTags] = useState(new Set());
    const [showFilters, setShowFilters] = useState(false);

    const ALL_STATES = ['On-Hold', 'Confirmed', 'In-Progress', 'Returned', 'Completed', 'Cancelled'];
    const ALL_TAGS = ['Prepped', 'Delivery-Pending', 'Awaiting-Customer-Pickup', 'Pending-Return-Pickup', 'Overdue', 'Damage-Assessment', 'Missing-Accessory', 'Refund-Pending', 'Pending-Settlement'];

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await orderService.getAll();
                setOrders(res.data || res);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching orders:", err);
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    const filteredOrders = (orders || []).filter(order => {
        const matchesSearch = order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              order.customer.phone.includes(searchTerm) ||
                              order.orderId.includes(searchTerm);
        
        const matchesState = selectedStates.size === 0 || selectedStates.has(order.orderStatus);
        
        const matchesTags = selectedTags.size === 0 || 
                            (order.tags && order.tags.some(tag => selectedTags.has(tag)));

        return matchesSearch && matchesState && matchesTags;
    });

    const toggleFilter = (set, value) => {
        const newSet = new Set(set);
        if (newSet.has(value)) newSet.delete(value);
        else newSet.add(value);
        return newSet;
    };

    const handleWhatsAppClick = (phone, name, orderId) => {
        const cleanPhone = phone?.replace(/\D/g, '');
        const message = `Hello ${name}, regarding your order #${orderId}`;
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const calculateNetDueOrOverdue = (order) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const currentCost = (order.bookings || []).reduce((sum, item) => {
            if (!item.startDate || !item.product) return sum;
            const start = new Date(item.startDate);
            start.setHours(0, 0, 0, 0);
            
            if (today < start) return sum; 

            const diffTime = Math.abs(today - start);
            const daysTillNow = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 

            let itemCurrentCost = 0;
            const rate =  Number(item.appliedRate) || 0;
            const qty = Number(item.quantity) || 1;

            if (item.rentalType === 'Weekly') {
                // User requirement: 
                // 1. < 7 days (e.g. 4th day) -> Show 1 Week cost (Min 1 week)
                // 2. 20 days (2w + 6d) -> Show 3 Weeks (Ceiling logic usually cheaper)
                // 3. 22 days (3w + 1d) -> Show 3w + 1d (Mixed logic usually cheaper)
                
                if (daysTillNow <= 7) {
                     itemCurrentCost = rate * qty;
                } else {
                    const weeks = Math.floor(daysTillNow / 7);
                    const extraDays = daysTillNow % 7;
                    
                    const ceilingCost = Math.ceil(daysTillNow / 7) * rate * qty;
                    
                    let extraCost = 0;
                    if (extraDays > 0) {
                        const extraRates = item.weeklyExtraRates || {};
                        for(let i=1; i<=extraDays; i++) {
                            extraCost += Number(extraRates[`day${i}`] || 0);
                        }
                        const baseCost = (weeks * rate * qty);
                        const mixedCost = baseCost + (extraCost * qty);
                        
                        // Take the cheaper option (e.g. 3W vs 2W+6D)
                        itemCurrentCost = Math.min(ceilingCost, mixedCost);
                        
                        // Safety: if extra rates are missing (0), fallback to ceiling to avoid undercharging
                        if (extraCost === 0) itemCurrentCost = ceilingCost;
                    } else {
                        // Exact week boundary
                        itemCurrentCost = weeks * rate * qty;
                    }
                }
            } else if (item.rentalType === 'Monthly') {
                const months = Math.ceil(daysTillNow / 30);
                itemCurrentCost = months * rate * qty;
            } else {
                itemCurrentCost = daysTillNow * rate * qty;
            }
            return sum + itemCurrentCost;
        }, 0);

        const logisticsCost = (Number(order.logistics?.delivery?.charges) || 0) + (Number(order.logistics?.return?.charges) || 0);
        const totalTillToday = currentCost + logisticsCost;
        
        const totalPaid = (order.financials.paymentHistory || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const totalRefunded = (order.financials.refundHistory || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        const netPaid = totalPaid - totalRefunded;
        
        const currentBalance = totalTillToday - netPaid;

        return { currentBalance, totalTillToday };
    };

    if (loading) return <div className="p-10 text-center font-bold text-gray-400">Loading Dashboard...</div>;

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Header & Filters */}
            <div className="bg-white border-b sticky top-0 z-20 p-4 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <h1 className="text-2xl font-black text-gray-900">Rental Orders</h1>
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Search Name/Phone/ID..." 
                                    className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={() => setShowFilters(!showFilters)} 
                                className={`p-2.5 rounded-xl transition border ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-500'}`}
                            >
                                <Filter size={20} />
                            </button>
                            <button onClick={() => navigate('/admin/orders/new')} className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-100">
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Filter Panel */}
                    {showFilters && (
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4 animate-in slide-in-from-top-2">
                            {/* State Filters */}
                            <div className="space-y-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filter by Status</span>
                                <div className="flex flex-wrap gap-2">
                                    {ALL_STATES.map(state => (
                                        <label key={state} className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-2 ${
                                            selectedStates.has(state) ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                        }`}>
                                            <input 
                                                type="checkbox" 
                                                className="hidden" 
                                                checked={selectedStates.has(state)}
                                                onChange={() => setSelectedStates(toggleFilter(selectedStates, state))}
                                            />
                                            {selectedStates.has(state) && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                            {state}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Tag Filters */}
                            <div className="space-y-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filter by Tags</span>
                                <div className="flex flex-wrap gap-2">
                                    {ALL_TAGS.map(tag => (
                                        <label key={tag} className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-2 ${
                                            selectedTags.has(tag) ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                        }`}>
                                            <input 
                                                type="checkbox" 
                                                className="hidden" 
                                                checked={selectedTags.has(tag)}
                                                onChange={() => setSelectedTags(toggleFilter(selectedTags, tag))}
                                            />
                                            {selectedTags.has(tag) && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                            {tag}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {(selectedStates.size > 0 || selectedTags.size > 0) && (
                                <button 
                                    onClick={() => { setSelectedStates(new Set()); setSelectedTags(new Set()); }}
                                    className="text-xs text-red-500 font-bold hover:underline flex items-center gap-1"
                                >
                                    <X size={12}/> Clear All Filters
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredOrders.map((order) => (
                        <div key={order._id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300 overflow-hidden group">
                            {/* Card Top: Status & ID */}
                            <div className="p-5 flex justify-between items-start border-b border-gray-50">
                                <div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order ID</span>
                                    <h3 className="font-mono font-bold text-gray-900">{order.orderId}</h3>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${getStatusStyle(order.orderStatus)}`}>
                                    {order.orderStatus}
                                </span>
                            </div>

                            {/* Tags Section */}
                            {order.tags && order.tags.length > 0 && (
                                <div className="px-5 pt-2 flex flex-wrap gap-1">
                                    {order.tags.map((tag, tIdx) => (
                                        <span key={tIdx} className={`text-[9px] px-2 py-0.5 rounded border font-bold ${
                                            tag === 'Overdue' ? 'bg-red-50 text-red-600 border-red-100' :
                                            tag === 'Refund-Pending' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                            'bg-gray-50 text-gray-500 border-gray-100'
                                        }`}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Card Body */}
                            <div className="p-5 space-y-4">
                                {/* Customer Info */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${order.user ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                            {order.user ? <User size={20} /> : order.customer.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 leading-none">{order.customer.name}</p>
                                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Phone size={12}/> {order.customer.phone}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <a href={`tel:${order.customer.phone}`} className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition" title="Call">
                                            <Phone size={16} />
                                        </a>
                                        <button 
                                            onClick={() => handleWhatsAppClick(order.customer.phone, order.customer.name, order.orderId)}
                                            className="p-2 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition" 
                                            title="WhatsApp"
                                        >
                                            <MessageCircle size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* PRODUCTS SECTION (The Request) */}
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                        <Bike size={12}/> Booked Equipment
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {order.bookings.map((item, idx) => (
                                            <div key={idx} className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-blue-100">
                                                {item.quantity}x {item.productCode}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Logistics Snippet */}
                                <div className="grid grid-cols-2 gap-2 pt-2">
                                    <div className="bg-gray-50 p-2 rounded-xl flex items-center gap-2">
                                        <Calendar size={14} className="text-gray-400" />
                                        <span className="text-[10px] font-bold text-gray-600">
                                            {new Date(order.bookings[0]?.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}-
                                            {new Date(order.bookings[0]?.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                        </span>
                                    </div>
                                    <div className="bg-gray-50 p-2 rounded-xl flex items-center gap-2">
                                        <Truck size={14} className="text-gray-400" />
                                        <span className="text-[10px] font-bold text-gray-600 truncate">{order.logistics.delivery.type}-{order.logistics.return.type}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer: Financials & Action */}
                            <div className="p-5 bg-gray-50/50 flex items-center justify-between border-t border-gray-100 mt-auto">
                                <div className="space-y-1">
                                    <div className="flex flex-col">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase leading-tight">Total Cost</p>
                                        <p className="text-sm font-bold text-gray-700 leading-tight">₹{order.financials.grandTotal.toLocaleString()}</p>
                                    </div>
                                    <div className="pt-1">
                                        {(() => {
                                            const totalPaid = (order.financials.paymentHistory || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                                            const totalRefunded = (order.financials.refundHistory || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
                                            const netPaid = totalPaid - totalRefunded;
                                            
                                            // Check if we should show "Due Now" logic (active rentals)
                                            if (order.orderStatus === 'In-Progress') {
                                                const { currentBalance } = calculateNetDueOrOverdue(order);
                                                if (currentBalance > 0) {
                                                     return (
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black text-red-500 uppercase leading-tight">Overdue</span>
                                                            <span className="text-base font-black text-red-600 leading-tight">₹{currentBalance.toLocaleString()}</span>
                                                        </div>
                                                    );
                                                } else if (currentBalance < 0) {
                                                     return (
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black text-green-500 uppercase leading-tight">Balance</span>
                                                            <span className="text-base font-black text-green-600 leading-tight">₹{Math.abs(currentBalance).toLocaleString()}</span>
                                                        </div>
                                                    );
                                                }
                                            }

                                            // Fallback to Standard Balance Logic (Completed/Confirmed/Cancelled)
                                            const balance = (order.financials.grandTotal || 0) - netPaid;

                                            // For Cancelled orders, don't show balance as "due" - show special status
                                            if (order.orderStatus === 'Cancelled') {
                                                if (balance <= 0) {
                                                    return <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-black border border-gray-200 uppercase tracking-tighter">Cancelled</span>;
                                                }
                                                // Cancelled with pending refund
                                                if ((order.tags || []).includes('Refund-Pending')) {
                                                    return <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-black border border-orange-100 uppercase tracking-tighter">Refund Pending</span>;
                                                }
                                                return <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-black border border-gray-200 uppercase tracking-tighter">Cancelled</span>;
                                            }

                                            if (balance <= 0) {
                                                if (order.orderStatus === 'Completed') {
                                                    return <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-black border border-green-100 uppercase tracking-tighter">Settled</span>;
                                                }
                                                return <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-black border border-green-100 uppercase tracking-tighter">Paid</span>;
                                            }
                                            return (
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-red-300 uppercase leading-tight">Total Due</span>
                                                    <span className="text-base font-black text-red-400 leading-tight">₹{balance.toLocaleString()}</span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => navigate(`/admin/orders/${order.orderId}`)}
                                    className="p-3 bg-white border border-gray-200 rounded-xl text-gray-900 hover:bg-gray-900 hover:text-white transition shadow-sm"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Empty State */}
            {filteredOrders.length === 0 && (
                <div className="text-center py-20">
                    <p className="text-gray-400 font-medium italic">No orders found matching your search.</p>
                </div>
            )}
        </div>
    );
};

const getStatusStyle = (s) => {
    switch (s) {
        case 'On-Hold': return 'bg-yellow-100 text-yellow-700';
        case 'Confirmed': return 'bg-blue-100 text-blue-700';
        case 'In-Progress': return 'bg-purple-100 text-purple-700';
        case 'Returned': return 'bg-indigo-100 text-indigo-700';
        case 'Completed': return 'bg-green-100 text-green-700';
        case 'Cancelled': return 'bg-red-100 text-red-700';
        default: return 'bg-gray-100 text-gray-700';
    }
};

export default OrderList;