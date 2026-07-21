import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { productService } from '../../services/productService';
import { orderService } from '../../services/orderService';
import { userService } from '../../services/userService';
import { 
    ChevronLeft, User, Trash2, Plus, CreditCard, Truck, Calendar, MapPin, Phone, Search, Loader2 
} from 'lucide-react';

const CreateOrder = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [availableProducts, setAvailableProducts] = useState([]);
    const [orderData, setOrderData] = useState({
        customer: { name: '', email: '', phone: '', alternatePhone: '', address: '', pincode: '' },
        bookings: [],
        logistics: {
            delivery: { type: 'Self-Pickup', charges: 0 },
            return: { type: 'Self-Drop', charges: 0 }
        },
        initialPayment: { amount: 0, method: 'Cash', transactionId: '', note: '' },
        financials: {
            totalRental: 0,
            totalLogistics: 0,
            totalDeposit: 0,
            grandTotal: 0,
            paymentStatus: 'Unpaid'
        },
        orderStatus: 'Pending',
        allowPartialRates: false
    });
    const [searchEmail, setSearchEmail] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchStatus, setSearchStatus] = useState({ type: '', message: '' });

    useEffect(() => {
        productService.getAll(true).then(data => setAvailableProducts(data || []));

        if (location.state?.prefillCustomer) {
            const pre = location.state.prefillCustomer;
            setOrderData(prev => ({
                ...prev,
                customer: {
                    ...prev.customer,
                    name: pre.name || prev.customer.name,
                    email: pre.email || prev.customer.email,
                    phone: pre.phone || prev.customer.phone,
                    alternatePhone: pre.alternatePhone || prev.customer.alternatePhone,
                    address: pre.address || prev.customer.address,
                    pincode: pre.pincode || prev.customer.pincode,
                },
                initialPayment: {
                    ...prev.initialPayment,
                    amount: pre.amountReceived || prev.initialPayment.amount,
                    note: pre.paymentNote || prev.initialPayment.note,
                }
            }));
            if (pre.email) {
                setSearchEmail(pre.email);
            }
        }
    }, [location.state]);

    // --- RENTAL CALCULATION LOGIC ---
    useEffect(() => {
        let rentalTotal = 0;
        let depositTotal = 0;
        let bookingsChanged = false;

        const updatedBookings = orderData.bookings.map(item => {
            if (!item.startDate || !item.endDate || !item.product) return item;

            const product = availableProducts.find(p => p._id === item.product);
            const start = new Date(item.startDate);
            const end = new Date(item.endDate);
            const diffMs = end.getTime() - start.getTime();
            if (isNaN(diffMs)) return item;
            const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

            let itemRental = 0;
            let unitsChargedLabel = "";

            const safeNum = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };
            const rate = safeNum(item.appliedRate);
            const qty = safeNum(item.quantity);
            const dep = safeNum(item.securityDeposit);

            let breakdown = "";

            if (item.rentalType === 'Weekly') {
                const weeks = Math.floor(diffDays / 7);
                const extraDays = diffDays % 7;

                if (orderData.allowPartialRates) {
                    const itemExtraRates = item.weeklyExtraRates || (product?.weeklyExtraRates || {});
                    const extraDayVal = itemExtraRates[`day${extraDays}`];
                    const extraRate = (extraDayVal !== undefined && extraDayVal !== null && extraDayVal !== '') ? Number(extraDayVal) : 0;

                    itemRental = (weeks * rate * qty) + (extraRate * qty);
                    unitsChargedLabel = extraDays > 0 ? `${weeks}w ${extraDays}d` : `${weeks} weeks`;

                    if (extraDays > 0) {
                        breakdown = `${qty}x [(${weeks}w * ₹${rate}) + ₹${extraRate}]`;
                    } else {
                        breakdown = `${qty}x (${weeks}w * ₹${rate})`;
                    }
                } else {
                    const chargedWeeks = Math.ceil(diffDays / 7);
                    itemRental = chargedWeeks * rate * qty;
                    unitsChargedLabel = `${chargedWeeks} weeks`;
                    breakdown = `${qty}x (${chargedWeeks}w * ₹${rate})`;
                }
            } else if (item.rentalType === 'Monthly') {
                const months = Math.floor(diffDays / 30);
                const extraDays = diffDays % 30;

                if (orderData.allowPartialRates) {
                    const baseMonthly = months * rate;
                    const dailyProrated = (rate / 30) * extraDays;
                    const roundedExtra = Math.ceil(dailyProrated / 50) * 50;
                    itemRental = (baseMonthly + roundedExtra) * qty;
                    unitsChargedLabel = extraDays > 0 ? `${months}m ${extraDays}d` : `${months} months`;

                    if (extraDays > 0) {
                        breakdown = `${qty}x [(${months}m * ₹${rate}) + ₹${roundedExtra}]`;
                    } else {
                        breakdown = `${qty}x (${months}m * ₹${rate})`;
                    }
                } else {
                    const chargedMonths = Math.ceil(diffDays / 30);
                    itemRental = chargedMonths * rate * qty;
                    unitsChargedLabel = `${chargedMonths} months`;
                    breakdown = `${qty}x (${chargedMonths}m * ₹${rate})`;
                }
            } else {
                itemRental = diffDays * rate * qty;
                unitsChargedLabel = `${diffDays} days`;
                breakdown = `${qty}x (${diffDays}d * ₹${rate})`;
            }

            const itemDeposit = dep * qty;
            rentalTotal += itemRental;
            depositTotal += itemDeposit;

            if (item.durationDays !== diffDays ||
                item.totalPrice !== itemRental ||
                item.breakdown !== breakdown) {
                bookingsChanged = true;
            }
            return { ...item, durationDays: diffDays, unitsCharged: unitsChargedLabel, totalPrice: itemRental, breakdown };
        });

        const safeNum = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };
        const logisticsTotal = safeNum(orderData.logistics.delivery.charges) +
            safeNum(orderData.logistics.return.charges);
        const grandTotal = rentalTotal + logisticsTotal;

        const financialsChanged =
            orderData.financials.totalRental !== rentalTotal ||
            orderData.financials.totalDeposit !== depositTotal ||
            orderData.financials.totalLogistics !== logisticsTotal ||
            orderData.financials.grandTotal !== grandTotal;

        if (bookingsChanged || financialsChanged) {
            setOrderData(prev => ({
                ...prev,
                bookings: updatedBookings,
                financials: {
                    ...prev.financials,
                    totalRental: rentalTotal,
                    totalDeposit: depositTotal,
                    totalLogistics: logisticsTotal,
                    grandTotal: grandTotal
                }
            }));
        }
    }, [orderData.bookings, orderData.logistics, orderData.financials]);

    // --- HANDLERS ---
    const addNewRow = () => {
        const today = new Date().toISOString().split('T')[0];
        setOrderData(prev => ({
            ...prev,
            bookings: [{
                product: '', productCode: '', name: '', quantity: 1,
                startDate: today, endDate: today,
                rentalType: 'Daily', appliedRate: 0, securityDeposit: 0,
                unitsCharged: 0, durationDays: 0,
                isLastDayAvailable: true,
                weeklyExtraRates: { day1: 0, day2: 0, day3: 0, day4: 0, day5: 0, day6: 0 }
            }, ...prev.bookings]
        }));
    };

    const handleProductSelect = (index, productId) => {
        const product = availableProducts.find(p => p._id === productId);
        if (!product) return;

        const newBookings = [...orderData.bookings];
        const currentType = newBookings[index].rentalType;

        let rate = product.dailyRate;
        if (currentType === 'Weekly') rate = product.weeklyRate;
        if (currentType === 'Monthly') rate = product.monthlyRate || (product.weeklyRate * 4);

        newBookings[index] = {
            ...newBookings[index],
            product: product._id,
            productCode: product.productCode,
            name: `${product.name} (${product.size})`,
            appliedRate: rate,
            securityDeposit: product.securityDeposit || 500,
            weeklyExtraRates: product.weeklyExtraRates || { day1: 0, day2: 0, day3: 0, day4: 0, day5: 0, day6: 0 }
        };
        setOrderData({ ...orderData, bookings: newBookings });
    };

    const updateBookingField = (index, field, value) => {
        const newBookings = [...orderData.bookings];

        if (field === 'rentalType' && newBookings[index].product) {
            const product = availableProducts.find(p => p._id === newBookings[index].product);
            if (value === 'Weekly') newBookings[index].appliedRate = product.weeklyRate;
            else if (value === 'Monthly') newBookings[index].appliedRate = product.monthlyRate || (product.weeklyRate * 4);
            else newBookings[index].appliedRate = product.dailyRate;
        }

        if (field.startsWith('weeklyExtraRates.')) {
            const day = field.split('.')[1];
            const numVal = value === '' ? 0 : Number(value);
            newBookings[index].weeklyExtraRates = {
                ...newBookings[index].weeklyExtraRates,
                [day]: isNaN(numVal) ? 0 : numVal
            };
        } else if (['appliedRate', 'quantity', 'securityDeposit'].includes(field)) {
            const numVal = value === '' ? 0 : Number(value);
            newBookings[index][field] = isNaN(numVal) ? 0 : numVal;
        } else {
            newBookings[index][field] = value;
        }

        setOrderData({ ...orderData, bookings: newBookings });
    };

    const updateCustomerField = (field, value) => {
        setOrderData(prev => ({
            ...prev,
            customer: { ...prev.customer, [field]: value }
        }));
    };

    const updatePaymentField = (field, value) => {
        setOrderData(prev => ({
            ...prev,
            initialPayment: { ...prev.initialPayment, [field]: value }
        }));
    };

    const updateLogisticsField = (category, field, value) => {
        setOrderData(prev => ({
            ...prev,
            logistics: {
                ...prev.logistics,
                [category]: { ...prev.logistics[category], [field]: value }
            }
        }));
    };

    const handleUserSearch = async () => {
        if (!searchEmail) return;
        setSearchLoading(true);
        setSearchStatus({ type: '', message: '' });
        try {
            const user = await userService.findByEmail(searchEmail);
            if (user && user.profile) {
                const { profile } = user;
                // Format full address
                const addr = profile.address || {};
                const fullAddr = [addr.street, addr.area, addr.city, addr.state].filter(Boolean).join(', ');
                
                setOrderData(prev => ({
                    ...prev,
                    customer: {
                        name: profile.name || '',
                        email: user.email || searchEmail,
                        phone: profile.phone || '',
                        alternatePhone: profile.alternatePhone || '',
                        address: fullAddr || '',
                        pincode: addr.pincode || ''
                    }
                }));
                setSearchStatus({ type: 'success', message: 'User found and details populated!' });
            }
        } catch (err) {
            console.error("Search failed:", err);
            setSearchStatus({ type: 'error', message: err.response?.status === 404 ? 'User not found.' : 'Search failed.' });
        } finally {
            setSearchLoading(false);
        }
    };

    const handleSaveOrder = async () => {
        if (!orderData.customer.name || orderData.bookings.length === 0) {
            alert("Missing required fields."); return;
        }

        const safeNum = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };

        // Double-ensure numbers before sending
        const finalData = {
            ...orderData,
            financials: {
                ...orderData.financials,
                totalRental: safeNum(orderData.financials.totalRental),
                totalDeposit: safeNum(orderData.financials.totalDeposit),
                totalLogistics: safeNum(orderData.financials.totalLogistics),
                grandTotal: safeNum(orderData.financials.grandTotal)
            },
            logistics: {
                delivery: { ...orderData.logistics.delivery, charges: safeNum(orderData.logistics.delivery.charges) },
                return: { ...orderData.logistics.return, charges: safeNum(orderData.logistics.return.charges) }
            },
            initialPayment: {
                ...orderData.initialPayment,
                amount: safeNum(orderData.initialPayment.amount)
            },
            bookings: orderData.bookings.map(b => ({
                ...b,
                appliedRate: safeNum(b.appliedRate),
                quantity: safeNum(b.quantity),
                securityDeposit: safeNum(b.securityDeposit),
                totalPrice: safeNum(b.totalPrice),
                durationDays: safeNum(b.durationDays)
            }))
        };

        try {
            await orderService.create(finalData);
            navigate('/admin/orders');
        } catch (err) {
            console.error(err);
            const errorMessage = err.response?.data?.message || err.message || "Save failed.";
            alert(`Error: ${errorMessage}`);
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen pb-24">
            {/* Header */}
            <div className="bg-white p-4 border-b flex justify-between sticky top-0 z-30">
                <div className="flex items-center">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft /></button>
                    <h1 className="text-xl font-bold ml-2">New Rental Order</h1>
                </div>
                <div className="text-xs font-mono bg-gray-100 p-2 rounded">{orderData.orderId}</div>
            </div>

            <div className="max-w-7xl mx-auto p-6 space-y-6">
                {/* 1. Customer Section */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center">
                        <h2 className="font-bold flex items-center gap-2"><User size={18} /> Customer Information</h2>
                        
                        {/* Search Box */}
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Search by Email..." 
                                    className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all w-64"
                                    value={searchEmail}
                                    onChange={(e) => setSearchEmail(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleUserSearch()}
                                />
                            </div>
                            <button 
                                onClick={handleUserSearch}
                                disabled={searchLoading || !searchEmail}
                                className="bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-black disabled:opacity-50 transition-all"
                            >
                                {searchLoading ? <Loader2 className="animate-spin" size={14} /> : 'Search'}
                            </button>
                        </div>
                    </div>

                    {searchStatus.message && (
                        <div className={`text-xs p-3 rounded-xl flex items-center gap-2 ${searchStatus.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            {searchStatus.message}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                        <input 
                            placeholder="Full Name" 
                            className="border p-3 rounded-xl" 
                            value={orderData.customer.name}
                            onChange={(e) => updateCustomerField('name', e.target.value)} 
                        />
                        <input 
                            placeholder="Customer Email" 
                            className="border p-3 rounded-xl" 
                            value={orderData.customer.email}
                            onChange={(e) => updateCustomerField('email', e.target.value)} 
                        />
                        <input 
                            placeholder="Primary Phone" 
                            className="border p-3 rounded-xl" 
                            value={orderData.customer.phone}
                            onChange={(e) => updateCustomerField('phone', e.target.value)} 
                        />
                        <input 
                            placeholder="Alternate Phone" 
                            className="border p-3 rounded-xl" 
                            value={orderData.customer.alternatePhone}
                            onChange={(e) => updateCustomerField('alternatePhone', e.target.value)} 
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input 
                            placeholder="Address" 
                            className="md:col-span-3 border p-3 rounded-xl" 
                            value={orderData.customer.address}
                            onChange={(e) => updateCustomerField('address', e.target.value)} 
                        />
                        <input 
                            placeholder="Pincode" 
                            className="border p-3 rounded-xl" 
                            value={orderData.customer.pincode}
                            onChange={(e) => updateCustomerField('pincode', e.target.value)} 
                        />
                    </div>
                </div>

                {/* 2. Inventory Section */}
                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="p-6 border-b flex justify-between items-center bg-white">
                        <h2 className="font-bold">Inventory & Duration</h2>
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div
                                    onClick={() => setOrderData(prev => ({ ...prev, allowPartialRates: !prev.allowPartialRates }))}
                                    className={`w-12 h-6 rounded-full transition-all relative ${orderData.allowPartialRates ? 'bg-blue-600' : 'bg-gray-200'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${orderData.allowPartialRates ? 'left-7' : 'left-1'}`}></div>
                                </div>
                                <span className="text-xs font-black text-gray-500 uppercase tracking-widest group-hover:text-blue-600 transition-colors">Split/Bridge Pricing</span>
                            </label>
                            <button onClick={addNewRow} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition">
                                <Plus size={16} /> Add Bike
                            </button>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        {orderData.bookings.length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm">No items added yet. Click "Add Bike" to start.</div>
                        )}
                        {orderData.bookings.map((item, idx) => (
                            <div key={idx} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 relative group transition hover:shadow-md">
                                <button
                                    onClick={() => setOrderData({ ...orderData, bookings: orderData.bookings.filter((_, i) => i !== idx) })}
                                    className="absolute top-2 right-2 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition"
                                    title="Remove Item"
                                >
                                    <Trash2 size={16} />
                                </button>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
                                    {/* Product */}
                                    <div className="lg:col-span-3">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Bike Details</label>
                                        <select className="w-full border border-gray-200 p-2.5 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-100 outline-none" value={item.product} onChange={(e) => handleProductSelect(idx, e.target.value)}>
                                            <option value="">-- Select Product --</option>
                                            {availableProducts.map(p => <option key={p._id} value={p._id}>{p.name} ({p.size})</option>)}
                                        </select>
                                    </div>

                                    {/* Rate Type */}
                                    <div className="lg:col-span-2">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Rate Type</label>
                                        <select className="w-full border border-blue-100 p-2.5 rounded-xl text-sm font-bold text-blue-600 bg-blue-50 focus:ring-2 focus:ring-blue-100 outline-none" value={item.rentalType} onChange={(e) => updateBookingField(idx, 'rentalType', e.target.value)}>
                                            <option value="Daily">Daily</option>
                                            <option value="Weekly">Weekly</option>
                                            <option value="Monthly">Monthly</option>
                                        </select>
                                    </div>

                                    {/* Rate Input */}
                                    <div className="lg:col-span-2">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Rate (₹)</label>
                                        <input type="number" min="0" value={item.appliedRate || ''} placeholder="0" className="w-full border border-gray-200 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 outline-none" onChange={(e) => updateBookingField(idx, 'appliedRate', e.target.value)} />
                                    </div>

                                    {/* Quantity */}
                                    <div className="lg:col-span-1">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Qty</label>
                                        <input type="number" min="1" value={item.quantity} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 outline-none" onChange={(e) => updateBookingField(idx, 'quantity', e.target.value)} />
                                    </div>

                                    {/* Dates */}
                                    <div className="lg:col-span-4">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Duration</label>
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <input type="date" value={item.startDate} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 outline-none" onChange={(e) => updateBookingField(idx, 'startDate', e.target.value)} />
                                                <span className="text-gray-300">-</span>
                                                <input type="date" value={item.endDate} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 outline-none" onChange={(e) => updateBookingField(idx, 'endDate', e.target.value)} />
                                            </div>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={item.isLastDayAvailable || false}
                                                    onChange={(e) => updateBookingField(idx, 'isLastDayAvailable', e.target.checked)}
                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                                />
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Free up Return Date?</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Footer Info Row */}
                                    <div className="lg:col-span-12 flex flex-col space-y-3 bg-white p-3 rounded-xl border border-gray-100 mt-1">
                                        <div className="flex flex-wrap justify-between items-center">
                                            <div className="text-[10px] text-gray-500 flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-gray-100 px-2 py-1 rounded font-bold text-gray-700">{item.unitsCharged || '0 days'}</span>
                                                    <span className="text-gray-300">|</span>
                                                    <span>{item.durationDays || 0} days total</span>
                                                </div>
                                                <div className="mt-1 text-[9px] font-mono text-gray-400">
                                                    {item.breakdown}
                                                </div>
                                            </div>
                                            <div className="font-bold text-gray-800">
                                                ₹{(item.totalPrice || 0).toLocaleString()}
                                            </div>
                                        </div>

                                        {/* Bridge Rates Adjustment UI */}
                                        {item.rentalType === 'Weekly' && orderData.allowPartialRates && (() => {
                                            const start = new Date(item.startDate);
                                            const end = new Date(item.endDate);
                                            const diffDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
                                            const extraDays = diffDays % 7;

                                            if (extraDays === 0) return null;

                                            return (
                                                <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                                                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Adjust {extraDays} Extra Day(s) Price</p>
                                                    <div className="w-32">
                                                        <input
                                                            type="number"
                                                            value={item.weeklyExtraRates && item.weeklyExtraRates[`day${extraDays}`] !== 0 ? item.weeklyExtraRates[`day${extraDays}`] : ''}
                                                            placeholder="0"
                                                            className="w-full border border-gray-100 p-1.5 rounded-lg text-[10px] font-bold text-emerald-700 outline-none focus:border-emerald-200 bg-emerald-50/30"
                                                            onChange={(e) => updateBookingField(idx, `weeklyExtraRates.day${extraDays}`, e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Logistics & Totals */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                            <h3 className="font-bold flex items-center gap-2"><Truck size={18} /> Logistics Charges</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Delivery Type</label>
                                        <select className="border p-3 rounded-xl w-full text-sm bg-white" value={orderData.logistics.delivery.type} onChange={(e) => updateLogisticsField('delivery', 'type', e.target.value)}>
                                            <option value="Self-Pickup">Self Pickup</option>
                                            <option value="Home-Delivery">Home Delivery</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Charge (₹)</label>
                                        <input type="number" placeholder="0" value={orderData.logistics.delivery.charges || ''} className="border p-3 rounded-xl w-full text-sm" onChange={(e) => updateLogisticsField('delivery', 'charges', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-orange-400 uppercase ml-1" title="Actual Cost">Actual (₹)</label>
                                        <input type="number" placeholder="0" value={orderData.logistics.delivery.actualCost || ''} className="border border-orange-200 bg-orange-50 p-3 rounded-xl w-full text-sm" onChange={(e) => updateLogisticsField('delivery', 'actualCost', e.target.value)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Return Type</label>
                                        <select className="border p-3 rounded-xl w-full text-sm bg-white" value={orderData.logistics.return.type} onChange={(e) => updateLogisticsField('return', 'type', e.target.value)}>
                                            <option value="Self-Drop">Self Drop</option>
                                            <option value="Home-Collection">Home Collection</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Charge (₹)</label>
                                        <input type="number" placeholder="0" value={orderData.logistics.return.charges || ''} className="border p-3 rounded-xl w-full text-sm" onChange={(e) => updateLogisticsField('return', 'charges', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-orange-400 uppercase ml-1" title="Actual Cost">Actual (₹)</label>
                                        <input type="number" placeholder="0" value={orderData.logistics.return.actualCost || ''} className="border border-orange-200 bg-orange-50 p-3 rounded-xl w-full text-sm" onChange={(e) => updateLogisticsField('return', 'actualCost', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                            <h3 className="font-bold flex items-center gap-2"><CreditCard size={18} /> Initial Payment</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Amount Received</label>
                                    <input type="number" placeholder="0" value={orderData.initialPayment.amount || ''} className="border p-3 rounded-xl w-full text-sm" onChange={(e) => updatePaymentField('amount', e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Payment Method</label>
                                    <select className="border p-3 rounded-xl w-full text-sm bg-white" value={orderData.initialPayment.method} onChange={(e) => updatePaymentField('method', e.target.value)}>
                                        <option value="Cash">Cash</option>
                                        <option value="UPI">UPI</option>
                                        <option value="Card">Card</option>
                                        <option value="Bank-Transfer">Bank Transfer</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Transaction ID / Note</label>
                                    <input type="text" placeholder="Optional Transaction Ref" value={orderData.initialPayment.transactionId} className="border p-3 rounded-xl w-full text-sm" onChange={(e) => updatePaymentField('transactionId', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-xl">Order Summary</h3>
                            <CreditCard />
                        </div>
                        <div className="space-y-1 text-sm opacity-80 font-medium">
                            <div className="flex justify-between"><span>Rental</span><span>₹{orderData.financials.totalRental.toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>Transportation Cost</span><span>₹{orderData.financials.totalLogistics.toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>Security Deposit (Refundable)</span><span>₹{orderData.financials.totalDeposit.toLocaleString()}</span></div>
                        </div>
                        <div className="pt-4 border-t border-white/20 flex justify-between items-center text-white">
                            <span className="text-xl font-bold">Total Cost</span>
                            <span className="text-4xl font-black">₹{orderData.financials.grandTotal.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t flex justify-center z-40">
                <button onClick={handleSaveOrder} className="w-full max-w-xl bg-gray-900 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-black transition transform active:scale-95">
                    Save Order
                </button>
            </div>
        </div>
    );
};

export default CreateOrder;