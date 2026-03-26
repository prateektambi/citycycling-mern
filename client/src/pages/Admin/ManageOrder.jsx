import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
    ChevronLeft, User, Trash2, Plus, CreditCard, Truck, Calendar, History, Wallet, Ban, Tag, AlertCircle, ArrowRight, MessageCircle, FileText
} from 'lucide-react';
import { productService } from '../../services/productService';
import { orderService } from '../../services/orderService';

const ALL_STATUSES = ['On-Hold', 'Confirmed', 'In-Progress', 'Returned', 'Completed', 'Cancelled'];

const AVAILABLE_TAGS = [
    'Prepped', 'Delivery-Pending', 'Awaiting-Customer-Pickup', 'Pending-Return-Pickup', // Ops
    'Overdue', 'Damage-Assessment', 'Missing-Accessory', // Issues
    'Refund-Pending', 'Pending-Settlement' // Finance
];

const AVAILABLE_WHATSAPP_TEMPLATES = [
    { label: 'Booking Confirmed', value: 'booking_confirmed' },
    { label: 'Bike Handed Over', value: 'bike_handed_over' },
    { label: 'Return Received', value: 'return_received' },
    { label: 'Order Completed', value: 'order_completed' },
    { label: 'Payment Due Reminder', value: 'payment_due' },
    { label: 'Pickup Reminder', value: 'pickup_reminder' },
    { label: 'Delivery Coordination', value: 'delivery_coordination' },
    { label: 'Extension Check', value: 'extension_check' }
];

const ManageOrder = () => {
    const { id } = useParams(); 
    const navigate = useNavigate();
    const [availableProducts, setAvailableProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [newPayment, setNewPayment] = useState({
        amount: '', method: 'UPI', transactionId: '', date: new Date().toISOString().split('T')[0], note: ''
    });
    const [newRefund, setNewRefund] = useState({
        amount: '', method: 'UPI', transactionId: '', date: new Date().toISOString().split('T')[0], note: ''
    });

    const [orderData, setOrderData] = useState({
        customer: { name: '', phone: '', alternatePhone: '', address: '', pincode: '' },
        bookings: [],
        logistics: {
            delivery: { type: 'Self-Pickup', charges: 0 },
            return: { type: 'Self-Drop', charges: 0 }
        },
        financials: {
            totalRental: 0,
            totalLogistics: 0,
            totalDeposit: 0,
            totalPaid: 0,
            totalRefunded: 0,
            balance: 0,
            grandTotal: 0,
            paymentHistory: [],
            refundHistory: [],
            paymentStatus: 'Unpaid'
        },
        orderStatus: 'On-Hold',
        tags: [],
        allowPartialRates: true
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const [products, order] = await Promise.all([
                    productService.getAll(true),
                    orderService.getById(id)
                ]);

                const fetchedOrder = order.data || order;

                const normalizedBookings = fetchedOrder.bookings.map(b => ({
                    ...b,
                    product: typeof b.product === 'object' ? b.product._id : b.product,
                    startDate: b.startDate ? b.startDate.split('T')[0] : '',
                    endDate: b.endDate ? b.endDate.split('T')[0] : ''
                }));

                setAvailableProducts(products || []);
                setOrderData({ 
                    ...fetchedOrder, 
                    bookings: normalizedBookings, 
                    financials: {
                        ...fetchedOrder.financials,
                        paymentHistory: fetchedOrder.financials?.paymentHistory || [],
                        refundHistory: fetchedOrder.financials?.refundHistory || []
                    }
                });
                setLoading(false);
            } catch (err) {
                console.error("Error loading order:", err);
                navigate('/admin/orders');
            }
        };
        loadData();
    }, [id, navigate]);

    useEffect(() => {
        if (!orderData) return;
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
        const logiCharges = safeNum(orderData.logistics.delivery.charges) + 
                           safeNum(orderData.logistics.return.charges);

        const newGrandTotal = rentalTotal + logiCharges;
        
        // Calculate Payments
        const totalPaid = (orderData.financials.paymentHistory || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const totalRefunded = (orderData.financials.refundHistory || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        const netPaid = totalPaid - totalRefunded;
        const balance = newGrandTotal - netPaid;

        let paymentStatus = 'Unpaid';
        if (balance <= 0) paymentStatus = 'Paid';
        else if (netPaid > 0) paymentStatus = 'Partial';

        const financialsChanged = newGrandTotal !== orderData.financials.grandTotal || 
                                  rentalTotal !== orderData.financials.totalRental ||
                                  totalPaid !== orderData.financials.totalPaid ||
                                  totalRefunded !== orderData.financials.totalRefunded;

        if (bookingsChanged || financialsChanged) {
            setOrderData(prev => ({
                ...prev,
                bookings: updatedBookings,
                financials: {
                    ...prev.financials,
                    totalRental: rentalTotal,
                    totalDeposit: depositTotal,
                    totalLogistics: logiCharges,
                    grandTotal: newGrandTotal,
                    totalPaid,
                    totalRefunded,
                    balance,
                    paymentHistory: prev.financials.paymentHistory,
                    refundHistory: prev.financials.refundHistory,
                    paymentStatus
                }
            }));
        }
    }, [orderData.bookings, orderData.logistics, orderData.financials]);

    const handleAddPayment = () => {
        if (!newPayment.amount || Number(newPayment.amount) <= 0) return alert("Enter valid amount");
        setOrderData(prev => ({
            ...prev,
            financials: {
                ...prev.financials,
                paymentHistory: [{ ...newPayment, amount: Number(newPayment.amount) }, ...prev.financials.paymentHistory]
            }
        }));
        setNewPayment({ amount: '', method: 'UPI', transactionId: '', date: new Date().toISOString().split('T')[0], note: '' });
    };

    const handleAddRefund = () => {
        if (!newRefund.amount || Number(newRefund.amount) <= 0) return alert("Enter valid amount");
        setOrderData(prev => ({
            ...prev,
            financials: {
                ...prev.financials,
                refundHistory: [{ ...newRefund, amount: Number(newRefund.amount) }, ...prev.financials.refundHistory]
            }
        }));
        setNewRefund({ amount: '', method: 'UPI', transactionId: '', date: new Date().toISOString().split('T')[0], note: '' });
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

    const handleCancelOrder = async () => {
        if (!window.confirm("Are you sure you want to cancel this order? Inventory will be released.")) return;
        try {
            await orderService.cancel(id);
            setOrderData(prev => ({ ...prev, orderStatus: 'Cancelled' }));
            alert("Order cancelled successfully.");
        } catch (err) {
            alert(err.response?.data?.message || "Error cancelling order.");
        }
    };

    const handleUpdateOrder = async () => {
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
            bookings: orderData.bookings.map(b => ({
                ...b,
                appliedRate: safeNum(b.appliedRate),
                quantity: safeNum(b.quantity),
                securityDeposit: safeNum(b.securityDeposit),
                totalPrice: safeNum(b.totalPrice)
            }))
        };

        try {
            await orderService.update(id, finalData);
            alert("Order updated successfully!");
            navigate('/admin/orders');
        } catch (err) {
            alert(err.response?.data?.message || "Error updating order.");
        }
    };

    const handleStateChange = async (newState) => {
        if (!window.confirm(`Change status to ${newState}?`)) return;
        try {
            const res = await orderService.changeState(orderData.orderId, newState, 'Admin');
            // Update local state with the returned order to reflect side-effects
            setOrderData(prev => ({
                ...prev, 
                orderStatus: res.order.orderStatus, 
                tags: res.order.tags, 
                inventoryBlocked: res.order.inventoryBlocked,
                activityLog: res.order.activityLog
            }));
        } catch (err) {
            alert(err.response?.data?.message || "Error changing state");
        }
    };

    const handleTagAction = async (action, tag) => {
        try {
            const res = await orderService.manageTag(orderData.orderId, action, tag, 'Admin');
            setOrderData(prev => ({...prev, tags: res.order.tags}));
        } catch (err) {
             alert(err.response?.data?.message || "Error managing tags");
        }
    };

    const handleWhatsAppSend = async (template) => {
        try {
            const res = await orderService.getWhatsAppLink(orderData.orderId, template);
            if (res.url) window.open(res.url, '_blank');
        } catch (err) {
            alert(err.response?.data?.message || "Error generating WhatsApp link");
        }
    };

    if (loading || !orderData) return <div className="p-20 text-center font-bold text-gray-400">Loading Order Details...</div>;

    return (
        <div className="bg-gray-50 min-h-screen pb-32">
            {/* Header */}
            <div className="bg-white p-4 border-b flex justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition"><ChevronLeft /></button>
                    <h1 className="text-xl font-bold ml-2">Edit Order</h1>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        orderData.orderStatus === 'Cancelled' ? 'bg-red-100 text-red-600' : 
                        orderData.orderStatus === 'Completed' ? 'bg-green-100 text-green-600' : 
                        'bg-yellow-100 text-yellow-700'
                    }`}>
                        {orderData.orderStatus}
                    </span>
                    <div className="flex flex-col items-end">
                        <div className="text-xs font-mono bg-gray-100 p-2 rounded border font-bold text-gray-600 leading-none">{orderData.orderId}</div>
                        {orderData.createdAt && (
                            <div className="flex flex-col items-end mt-1">
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Order Date</span>
                                <input 
                                    type="datetime-local" 
                                    className="text-[10px] font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 outline-none focus:border-blue-400"
                                    value={new Date(new Date(orderData.createdAt).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16)}
                                    onChange={(e) => {
                                        const newDate = new Date(e.target.value);
                                        if(!isNaN(newDate.getTime())) {
                                            setOrderData(prev => ({...prev, createdAt: newDate.toISOString()}));
                                        }
                                    }}
                                />
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={() => window.open(`/orders/${orderData.orderId}/receipt`, '_blank')}
                        className="p-2 ml-2 bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100 rounded-lg transition" 
                        title="Print/Screenshot Receipt"
                    >
                        <FileText size={18} />
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
                
                {/* 0. State & Tags Management */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                            <h2 className="font-bold flex items-center gap-2 text-gray-700 text-lg">
                                <AlertCircle size={20} className="text-blue-600"/> 
                                Order Status: <span className="text-blue-600 uppercase">{orderData.orderStatus}</span>
                            </h2>
                            <p className="text-xs text-gray-400 mt-1">Manage the lifecycle of this order.</p>
                        </div>
                        
                        {/* Transition Dropdown */}
                        <div className="w-full md:w-auto">
                            <select
                                className="w-full md:w-48 border-2 border-blue-100 p-2.5 rounded-xl text-sm font-bold bg-blue-50 text-blue-700 cursor-pointer hover:border-blue-300 transition outline-none"
                                onChange={(e) => {
                                    if(e.target.value) {
                                        handleStateChange(e.target.value);
                                        e.target.value = ""; // Reset
                                    }
                                }}
                            >
                                <option value="">Move to...</option>
                                {ALL_STATUSES
                                    .filter(status => status !== orderData.orderStatus)
                                    .map(nextState => (
                                        <option key={nextState} value={nextState}>
                                            {nextState}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 w-full"></div>

                    {/* Tags Management */}
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1 space-y-3">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                <Tag size={12}/> Active Tags
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {orderData.tags?.length > 0 ? orderData.tags.map((tag, idx) => (
                                    <span key={idx} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 flex items-center gap-2">
                                        {tag}
                                        <button onClick={() => handleTagAction('remove', tag)} className="text-gray-400 hover:text-red-500"><Trash2 size={12}/></button>
                                    </span>
                                )) : <span className="text-xs text-gray-300 italic">No active tags.</span>}
                            </div>
                        </div>

                        <div className="w-full md:w-64 space-y-2">
                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Add Tag</span>
                            <select 
                                className="w-full border p-2.5 rounded-xl text-sm bg-gray-50 font-medium"
                                onChange={(e) => {
                                    if(e.target.value) {
                                        handleTagAction('add', e.target.value);
                                        e.target.value = ""; // Reset
                                    }
                                }}
                            >
                                <option value="">+ Select Tag...</option>
                                {AVAILABLE_TAGS.filter(t => !orderData.tags?.includes(t)).map(tag => (
                                    <option key={tag} value={tag}>{tag}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 w-full"></div>

                    {/* WhatsApp Communication */}
                    <div className="flex flex-col md:flex-row gap-6 items-center">
                        <div className="flex-1">
                             <h4 className="font-bold flex items-center gap-2 text-gray-700 text-sm">
                                <MessageCircle size={16} className="text-green-600"/> 
                                Customer Communication
                            </h4>
                            <p className="text-xs text-gray-400 mt-1">Send pre-filled WhatsApp messages for updates.</p>
                        </div>
                        <div className="w-full md:w-auto flex flex-wrap gap-2">
                            <select 
                                className="border p-2.5 rounded-xl text-xs font-bold bg-green-50 text-green-700 border-green-200 hover:bg-green-100 transition cursor-pointer outline-none"
                                onChange={(e) => {
                                    if(e.target.value) {
                                        handleWhatsAppSend(e.target.value);
                                        e.target.value = "";
                                    }
                                }}
                            >
                                <option value="">Select Message Template...</option>
                                {AVAILABLE_WHATSAPP_TEMPLATES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* 1. Customer Section */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="font-bold flex items-center gap-2 text-gray-700"><User size={18}/> Customer Details</h2>
                        {orderData.user && (
                            <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100 flex items-center gap-2">
                                <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                                Registered: {orderData.user.profile?.name || 'User'} 
                                <span className="font-normal opacity-75">({orderData.user.email})</span>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input value={orderData.customer.name} placeholder="Name" className="border p-3 rounded-xl text-sm" onChange={(e) => setOrderData({...orderData, customer: {...orderData.customer, name: e.target.value}})} />
                        <input value={orderData.customer.phone} placeholder="Phone" className="border p-3 rounded-xl text-sm" onChange={(e) => setOrderData({...orderData, customer: {...orderData.customer, phone: e.target.value}})} />
                        <input value={orderData.customer.alternatePhone} placeholder="Alternate Phone" className="border p-3 rounded-xl text-sm" onChange={(e) => setOrderData({...orderData, customer: {...orderData.customer, alternatePhone: e.target.value}})} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input value={orderData.customer.address} placeholder="Full Address" className="md:col-span-3 border p-3 rounded-xl text-sm" onChange={(e) => setOrderData({...orderData, customer: {...orderData.customer, address: e.target.value}})} />
                        <input value={orderData.customer.pincode} placeholder="Pincode" className="border p-3 rounded-xl text-sm" onChange={(e) => setOrderData({...orderData, customer: {...orderData.customer, pincode: e.target.value}})} />
                    </div>
                </div>

                {/* 2. Inventory Section (Card Style like CreateOrder) */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <h2 className="font-bold text-gray-700 flex items-center gap-2"><Calendar size={18}/> Booked Inventory</h2>
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
                            <button 
                                onClick={() => setOrderData({...orderData, bookings: [{ product: '', productCode: '', name: '', quantity: 1, startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], rentalType: 'Daily', appliedRate: 0, securityDeposit: 0, isLastDayAvailable: true, weeklyExtraRates: { day1: 0, day2: 0, day3: 0, day4: 0, day5: 0, day6: 0 } }, ...orderData.bookings]})}
                                className="bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
                            >
                                <Plus size={14}/> Add Bike
                            </button>
                        </div>
                    </div>

                    {orderData.bookings.map((item, idx) => (
                        <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative group">
                            <button 
                                onClick={() => setOrderData({...orderData, bookings: orderData.bookings.filter((_, i) => i !== idx)})}
                                className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition"
                            >
                                <Trash2 size={20}/>
                            </button>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Select Bike</label>
                                    <select 
                                        className="w-full border p-3 rounded-xl text-sm bg-gray-50" 
                                        value={item.product || ""} 
                                        onChange={(e) => handleProductSelect(idx, e.target.value)}
                                    >
                                        <option value="" disabled>Choose Bike...</option>
                                        {availableProducts.map(p => <option key={p._id} value={p._id}>{p.name} ({p.size})</option>)}
                                    </select>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Plan</label>
                                            <select className="w-full border p-3 rounded-xl text-sm font-bold text-blue-600" value={item.rentalType} onChange={(e) => updateBookingField(idx, 'rentalType', e.target.value)}>
                                                <option value="Daily">Daily</option>
                                                <option value="Weekly">Weekly</option>
                                                <option value="Monthly">Monthly</option>
                                            </select>
                                        </div>
                                        <div className="w-24">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Qty</label>
                                            <input type="number" value={item.quantity} className="w-full border p-3 rounded-xl text-sm" onChange={(e) => updateBookingField(idx, 'quantity', e.target.value)} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Rental Period</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="date" value={item.startDate} className="border p-3 rounded-xl text-xs" onChange={(e) => updateBookingField(idx, 'startDate', e.target.value)} />
                                        <input type="date" value={item.endDate} className="border p-3 rounded-xl text-xs" onChange={(e) => updateBookingField(idx, 'endDate', e.target.value)} />
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                                        <input 
                                            type="checkbox" 
                                            checked={item.isLastDayAvailable || false}
                                            onChange={(e) => updateBookingField(idx, 'isLastDayAvailable', e.target.checked)}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                        />
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Free up Return Date?</span>
                                    </label>
                                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600 space-y-1">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span>Duration:</span>
                                            <span>{item.durationDays || 0} Days ({item.unitsCharged || 0})</span>
                                        </div>
                                        <div className="text-[9px] font-mono opacity-70">
                                            {item.breakdown}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-2xl flex flex-col justify-center">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Rate & Deposit</span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-sm font-bold text-gray-700">₹</p>
                                        <input 
                                            type="number" 
                                            value={item.appliedRate || ''} 
                                            placeholder="0"
                                            className="w-20 bg-transparent border-b border-gray-200 text-sm font-bold text-gray-700 outline-none focus:border-blue-400"
                                            onChange={(e) => updateBookingField(idx, 'appliedRate', e.target.value)}
                                        />
                                        <p className="text-xs text-gray-400">/ {item.rentalType}</p>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Security: ₹{item.securityDeposit} / qty</p>
                                    
                                    <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col gap-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-xl font-black text-gray-900">₹{(item.totalPrice || 0).toLocaleString()}</span>
                                        </div>
                                    </div>
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
                                    <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Adjust {extraDays} Extra Day(s) Price</p>
                                        <div className="w-32">
                                            <input 
                                                type="number" 
                                                value={item.weeklyExtraRates && item.weeklyExtraRates[`day${extraDays}`] !== 0 ? item.weeklyExtraRates[`day${extraDays}`] : ''} 
                                                placeholder="0"
                                                className="w-full bg-emerald-50/50 border border-emerald-100 p-2 rounded-xl text-sm font-bold text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-200"
                                                onChange={(e) => updateBookingField(idx, `weeklyExtraRates.day${extraDays}`, e.target.value)}
                                            />
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    ))}
                </div>

                {/* 3. Logistics & Financial Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                        <h3 className="font-bold flex items-center gap-2 text-gray-700"><Truck size={18}/> Logistics Management</h3>
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Outward (Delivery)</span>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Type</label>
                                        <select className="border p-2.5 w-full rounded-xl text-sm bg-white" value={orderData.logistics.delivery.type} onChange={(e) => setOrderData({...orderData, logistics: {...orderData.logistics, delivery: {...orderData.logistics.delivery, type: e.target.value}}})}>
                                            <option value="Self-Pickup">Self-Pickup</option>
                                            <option value="Home-Delivery">Home-Delivery</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Billed (₹)</label>
                                        <input type="number" value={orderData.logistics.delivery.charges || ''} placeholder="0" className="border w-full p-2.5 rounded-xl text-sm" onChange={(e) => setOrderData({...orderData, logistics: {...orderData.logistics, delivery: {...orderData.logistics.delivery, charges: e.target.value}}})} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-orange-400 uppercase ml-1" title="Actual Cost for P&L">Actual (₹)</label>
                                        <input type="number" value={orderData.logistics.delivery.actualCost || ''} placeholder="0" className="border border-orange-200 bg-orange-50 w-full p-2.5 rounded-xl text-sm" onChange={(e) => setOrderData({...orderData, logistics: {...orderData.logistics, delivery: {...orderData.logistics.delivery, actualCost: e.target.value}}})} />
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Inward (Return)</span>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-blue-400 uppercase ml-1">Type</label>
                                        <select className="border p-2.5 w-full rounded-xl text-sm bg-white" value={orderData.logistics.return.type} onChange={(e) => setOrderData({...orderData, logistics: {...orderData.logistics, return: {...orderData.logistics.return, type: e.target.value}}})}>
                                            <option value="Self-Drop">Self-Drop</option>
                                            <option value="Home-Collection">Home-Collection</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-blue-400 uppercase ml-1">Billed (₹)</label>
                                        <input type="number" value={orderData.logistics.return.charges || ''} placeholder="0" className="border w-full p-2.5 rounded-xl text-sm" onChange={(e) => setOrderData({...orderData, logistics: {...orderData.logistics, return: {...orderData.logistics.return, charges: e.target.value}}})} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-orange-400 uppercase ml-1" title="Actual Cost for P&L">Actual (₹)</label>
                                        <input type="number" value={orderData.logistics.return.actualCost || ''} placeholder="0" className="border border-orange-200 bg-orange-50 w-full p-2.5 rounded-xl text-sm" onChange={(e) => setOrderData({...orderData, logistics: {...orderData.logistics, return: {...orderData.logistics.return, actualCost: e.target.value}}})} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment & Refund History Section */}
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                            <h3 className="font-bold flex items-center gap-2 text-gray-700"><History size={18}/> Payments & Refunds</h3>
                            
                            <div className="space-y-2">
                                {/* Payments */}
                                {orderData.financials.paymentHistory?.map((pay, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                                        <div>
                                            <p className="text-xs font-bold text-gray-700">Received: {new Date(pay.date).toLocaleDateString()}</p>
                                            <p className="text-[10px] text-gray-500">{pay.method} • {pay.transactionId || 'No Ref'} {pay.note && `• ${pay.note}`}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-green-600">+₹{Number(pay.amount).toLocaleString()}</span>
                                            <button onClick={() => setOrderData(prev => ({...prev, financials: {...prev.financials, paymentHistory: prev.financials.paymentHistory.filter((_, i) => i !== idx)}}))} className="text-gray-300 hover:text-red-500"><Trash2 size={14}/></button>
                                        </div>
                                    </div>
                                ))}
                                
                                {/* Refunds */}
                                {orderData.financials.refundHistory?.map((ref, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-red-50 rounded-xl border border-red-100 group">
                                        <div>
                                            <p className="text-xs font-bold text-red-700">Refunded: {new Date(ref.date).toLocaleDateString()}</p>
                                            <p className="text-[10px] text-red-500">{ref.method} • {ref.transactionId || 'No Ref'} {ref.note && `• ${ref.note}`}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-red-600">-₹{Number(ref.amount).toLocaleString()}</span>
                                            <button onClick={() => setOrderData(prev => ({...prev, financials: {...prev.financials, refundHistory: prev.financials.refundHistory.filter((_, i) => i !== idx)}}))} className="text-gray-300 hover:text-red-500"><Trash2 size={14}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Add Payment Form */}
                            <div className="pt-4 border-t border-gray-100">
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Payment Input */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-green-600 uppercase block">Add Payment</label>
                                        <input type="date" value={newPayment.date} onChange={e => setNewPayment({...newPayment, date: e.target.value})} className="w-full border p-2 rounded-lg text-xs" />
                                        <select value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value})} className="w-full border p-2 rounded-lg text-xs bg-white">
                                            <option value="Cash">Cash</option> <option value="UPI">UPI</option> <option value="Card">Card</option> <option value="Bank-Transfer">Bank Transfer</option>
                                        </select>
                                        <input type="number" placeholder="Amount" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value})} className="w-full border p-2 rounded-lg text-xs" />
                                        <input type="text" placeholder="Ref / Note" value={newPayment.note} onChange={e => setNewPayment({...newPayment, note: e.target.value})} className="w-full border p-2 rounded-lg text-xs" />
                                        <button onClick={handleAddPayment} className="w-full bg-green-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-green-700">Record Payment</button>
                                    </div>

                                    {/* Refund Input */}
                                    <div className="space-y-2 border-l pl-4 border-gray-100">
                                        <label className="text-[10px] font-bold text-red-500 uppercase block">Issue Refund</label>
                                        <input type="date" value={newRefund.date} onChange={e => setNewRefund({...newRefund, date: e.target.value})} className="w-full border p-2 rounded-lg text-xs" />
                                        <select value={newRefund.method} onChange={e => setNewRefund({...newRefund, method: e.target.value})} className="w-full border p-2 rounded-lg text-xs bg-white">
                                            <option value="Cash">Cash</option> <option value="UPI">UPI</option> <option value="Card">Card</option> <option value="Bank-Transfer">Bank Transfer</option>
                                        </select>
                                        <input type="number" placeholder="Amount" value={newRefund.amount} onChange={e => setNewRefund({...newRefund, amount: e.target.value})} className="w-full border p-2 rounded-lg text-xs" />
                                        <input type="text" placeholder="Ref / Note" value={newRefund.note} onChange={e => setNewRefund({...newRefund, note: e.target.value})} className="w-full border p-2 rounded-lg text-xs" />
                                        <button onClick={handleAddRefund} className="w-full bg-red-50 text-red-600 border border-red-100 py-2 rounded-lg text-xs font-bold hover:bg-red-100">Record Refund</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary Card - Fixed to your Colors */}
                    <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-xl">Order Summary</h3>
                            <CreditCard />
                        </div>
                         <div className="space-y-1 text-sm opacity-80 font-medium">
                            <div className="flex justify-between"><span>Rental</span><span>₹{orderData.financials.totalRental.toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>Transportation Cost</span><span>₹{orderData.financials.totalLogistics.toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>Security Deposit (Refundable)</span><span>₹{orderData.financials.totalDeposit.toLocaleString()}</span></div>
                            
                            <div className="flex justify-between text-white">
                                <span>Net Paid to Date</span>
                                <span>₹{((orderData.financials.totalPaid || 0) - (orderData.financials.totalRefunded || 0)).toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-white/20 flex justify-between items-center text-white">
                            <span className="text-xl font-bold">Total Cost</span>
                            <span className="text-4xl font-black">₹{orderData.financials.grandTotal.toLocaleString()}</span>
                        </div>
                        
                        {/* Dynamic Current Balance Calculation */}
                        {(() => {
                            if (orderData.orderStatus !== 'In-Progress') return null;

                            const today = new Date();
                            today.setHours(0, 0, 0, 0);

                            const currentCost = orderData.bookings.reduce((sum, item) => {
                                if (!item.startDate || !item.product) return sum;
                                const start = new Date(item.startDate);
                                start.setHours(0, 0, 0, 0);
                                
                                // Identify if usage has started
                                if (today < start) return sum; 

                                // Calculate days till today (inclusive or till now)
                                // User said "Calculate costs till today", implies usage includes today if item is active.
                                // Typically rental is counted by nights or 24h blocks, but simpler daily logic:
                                // If I took it yesterday and checking today, it's 2 days usage if I count today.
                                const diffTime = Math.abs(today - start);
                                const daysTillNow = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 

                                let itemCurrentCost = 0;
                                const rate =  Number(item.appliedRate) || 0;
                                const qty = Number(item.quantity) || 1;

                                if (item.rentalType === 'Weekly') {
                                    // User requirement: 
                                    // 1. < 7 days -> 1 Week cost (Min 1 week)
                                    // 2. 20 days -> 3 Weeks (Ceiling)
                                    // 3. 22 days -> 3w + 1d (Mixed)
                                    
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
                                            
                                            itemCurrentCost = Math.min(ceilingCost, mixedCost);
                                            
                                            // Safety: if extra rates are missing (0), fallback to ceiling
                                            if (extraCost === 0) itemCurrentCost = ceilingCost;
                                        } else {
                                            itemCurrentCost = weeks * rate * qty;
                                        }
                                    }
                                } else if (item.rentalType === 'Monthly') {
                                    // Basic pro-rata or ceiling logic for month
                                    const months = Math.ceil(daysTillNow / 30);
                                    itemCurrentCost = months * rate * qty;
                                } else {
                                    // Daily
                                    itemCurrentCost = daysTillNow * rate * qty;
                                }
                                return sum + itemCurrentCost;
                            }, 0);

                            // Add Logistics
                            const logisticsCost = (Number(orderData.logistics?.delivery?.charges) || 0) + (Number(orderData.logistics?.return?.charges) || 0);
                            
                            // Total Expected till Today
                            const totalTillToday = currentCost + logisticsCost; // Note: Deposit is usually not "consumed", but user asked for "costs". Refundable deposit is strictly separate.
                            
                            // Net Paid
                            const netPaid = (orderData.financials.totalPaid || 0) - (orderData.financials.totalRefunded || 0);
                            const currentBalance = totalTillToday - netPaid;
                            
                            return (
                                <div className="mt-4 pt-4 border-t border-white/20">
                                    <h4 className="font-bold text-white/90 text-sm uppercase flex items-center gap-2">
                                        <Wallet size={16} /> Cost Till Today ({today.toLocaleDateString()})
                                    </h4>
                                    <div className="flex justify-between items-end mt-1">
                                        <div className="text-right flex-1">
                                            <div className="text-xs text-blue-200">Usage + Logistics</div>
                                            <div className="font-bold text-xl">₹{totalTillToday.toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center mt-3 bg-white/10 p-2 rounded-lg">
                                        <span className="text-xs font-bold text-blue-100">Net Due Now</span>
                                        <span className={`text-lg font-black ${currentBalance > 0 ? 'text-amber-300' : 'text-green-300'}`}>
                                            {currentBalance > 0 ? `To Pay: ₹${currentBalance.toLocaleString()}` : `Credit: ₹${Math.abs(currentBalance).toLocaleString()}`}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-blue-200 mt-1 italic leading-tight">
                                        * Calculated based on elapsed days, applying weekly ceiling/extra rules. Excludes deposit.
                                    </p>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t flex justify-center gap-4 z-10">
                {orderData.orderStatus !== 'Cancelled' && (
                    <button 
                        onClick={handleCancelOrder}
                        className="bg-red-50 text-red-600 px-6 py-4 rounded-2xl font-bold text-lg hover:bg-red-100 transition flex items-center gap-2"
                    >
                        <Ban size={20} /> Cancel
                    </button>
                )}
                <button 
                    onClick={handleUpdateOrder} 
                    className="flex-1 max-w-xl bg-gray-900 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-black transition transform active:scale-95"
                >
                    Update Order Details
                </button>
            </div>
        </div>
    );
};

export default ManageOrder;