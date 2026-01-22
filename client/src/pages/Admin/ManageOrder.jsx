import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
    ChevronLeft, User, Trash2, Plus, CreditCard, Truck, Calendar, History, Wallet, Ban, Tag, AlertCircle, ArrowRight, MessageCircle
} from 'lucide-react';
import { productService } from '../../services/productService';
import { orderService } from '../../services/orderService';

const ALLOWED_TRANSITIONS = {
    'On-Hold': ['Confirmed', 'Cancelled'],
    'Confirmed': ['In-Progress', 'Cancelled'],
    'In-Progress': ['Returned', 'Cancelled'],
    'Returned': ['Completed', 'Cancelled'],
    'Cancelled': ['On-Hold'],
    'Completed': ['On-Hold']
};

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
        tags: []
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const [products, order] = await Promise.all([
                    productService.getAll(),
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

            const start = new Date(item.startDate);
            const end = new Date(item.endDate);
            const diffDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

            let unitsToCharge = 0;
            if (item.rentalType === 'Weekly') unitsToCharge = Math.ceil(diffDays / 7);
            else if (item.rentalType === 'Monthly') unitsToCharge = Math.ceil(diffDays / 30);
            else unitsToCharge = diffDays;

            const rate = Number(item.appliedRate) || 0;
            const qty = Number(item.quantity) || 0;
            const dep = Number(item.securityDeposit) || 0;

            rentalTotal += (unitsToCharge * rate * qty);
            depositTotal += (dep * qty);

            if (item.durationDays !== diffDays || item.unitsCharged !== unitsToCharge) {
                bookingsChanged = true;
            }

            return { ...item, durationDays: diffDays, unitsCharged: unitsToCharge };
        });

        const logiCharges = (Number(orderData.logistics.delivery.charges) || 0) + 
                           (Number(orderData.logistics.return.charges) || 0);

        const newGrandTotal = rentalTotal + depositTotal + logiCharges;
        
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
                paymentHistory: [...prev.financials.paymentHistory, { ...newPayment, amount: Number(newPayment.amount) }]
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
                refundHistory: [...prev.financials.refundHistory, { ...newRefund, amount: Number(newRefund.amount) }]
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
            name: `${product.name} (${product.size})`,
            appliedRate: rate,
            securityDeposit: product.securityDeposit || 500
        };
        setOrderData({ ...orderData, bookings: newBookings });
    };

    const updateBookingField = (index, field, value) => {
        const newBookings = [...orderData.bookings];
        newBookings[index][field] = value;
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
        try {
            await orderService.update(id, orderData);
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
            <div className="bg-white p-4 border-b flex justify-between sticky top-0 z-30 shadow-sm">
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
                    <div className="text-xs font-mono bg-gray-100 p-2 rounded border font-bold text-gray-600">{orderData.orderId}</div>
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
                                {(() => {
                                    const allowedTransitions = ALLOWED_TRANSITIONS[orderData.orderStatus] || [];
                                    const transitions = [...allowedTransitions];
                                    
                                    // Always add 'On-Hold' as fallback if not already present and not current state
                                    if (orderData.orderStatus !== 'On-Hold' && !transitions.includes('On-Hold')) {
                                        transitions.push('On-Hold');
                                    }
                                    
                                    return transitions.map(nextState => (
                                        <option key={nextState} value={nextState}>
                                            {nextState}
                                        </option>
                                    ));
                                })()}
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
                    <h2 className="font-bold flex items-center gap-2 text-gray-700"><User size={18}/> Customer Details</h2>
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
                        <button 
                            onClick={() => setOrderData({...orderData, bookings: [...orderData.bookings, { product: '', quantity: 1, startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], rentalType: 'Daily', appliedRate: 0, securityDeposit: 0 }]})}
                            className="bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
                        >
                            <Plus size={14}/> Add Bike
                        </button>
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
                                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600 text-xs font-bold flex justify-between">
                                        <span>Duration:</span>
                                        <span>{item.durationDays || 0} Days ({item.unitsCharged || 0} Unit/s)</span>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-2xl flex flex-col justify-center">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Rate & Deposit</span>
                                    <p className="text-sm font-bold text-gray-700 mt-1">₹{item.appliedRate} / {item.rentalType}</p>
                                    <p className="text-xs text-gray-400">Security: ₹{item.securityDeposit} per bike</p>
                                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-end">
                                        <span className="text-xs font-bold text-gray-400">SUBTOTAL</span>
                                        <span className="text-xl font-black text-gray-900">₹{(Number(item.appliedRate) * Number(item.quantity) * (item.unitsCharged || 0)).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
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
                                <div className="grid grid-cols-2 gap-4">
                                    <select className="border p-2.5 rounded-xl text-sm bg-white" value={orderData.logistics.delivery.type} onChange={(e) => setOrderData({...orderData, logistics: {...orderData.logistics, delivery: {...orderData.logistics.delivery, type: e.target.value}}})}>
                                        <option value="Self-Pickup">Self-Pickup</option>
                                        <option value="Home-Delivery">Home-Delivery</option>
                                    </select>
                                    <input type="number" value={orderData.logistics.delivery.charges} className="border p-2.5 rounded-xl text-sm" onChange={(e) => setOrderData({...orderData, logistics: {...orderData.logistics, delivery: {...orderData.logistics.delivery, charges: e.target.value}}})} />
                                </div>
                            </div>
                            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Inward (Return)</span>
                                <div className="grid grid-cols-2 gap-4">
                                    <select className="border p-2.5 rounded-xl text-sm bg-white" value={orderData.logistics.return.type} onChange={(e) => setOrderData({...orderData, logistics: {...orderData.logistics, return: {...orderData.logistics.return, type: e.target.value}}})}>
                                        <option value="Self-Drop">Self-Drop</option>
                                        <option value="Home-Collection">Home-Collection</option>
                                    </select>
                                    <input type="number" value={orderData.logistics.return.charges} className="border p-2.5 rounded-xl text-sm" onChange={(e) => setOrderData({...orderData, logistics: {...orderData.logistics, return: {...orderData.logistics.return, charges: e.target.value}}})} />
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
                            <div className="flex justify-between"><span>Rental Subtotal</span><span>₹{orderData.financials.totalRental.toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>Security Deposits</span><span>₹{orderData.financials.totalDeposit.toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>Logistics Fees</span><span>₹{orderData.financials.totalLogistics.toLocaleString()}</span></div>
                            <div className="pt-2 mt-2 border-t border-white/10 flex justify-between text-white">
                                <span>Net Paid</span>
                                <span>₹{((orderData.financials.totalPaid || 0) - (orderData.financials.totalRefunded || 0)).toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-white/20 flex justify-between text-4xl font-black">
                            <span>₹{orderData.financials.grandTotal.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t flex justify-center gap-4 z-40">
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
                    disabled={orderData.orderStatus === 'Cancelled'}
                    className={`flex-1 max-w-xl text-white py-4 rounded-2xl font-black text-lg shadow-xl transition transform active:scale-95 ${orderData.orderStatus === 'Cancelled' ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-black'}`}
                >
                    Update Order Details
                </button>
            </div>
        </div>
    );
};

export default ManageOrder;