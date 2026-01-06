import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ChevronLeft, User, Trash2, Plus, CreditCard, Truck, Calendar, MapPin, Phone
} from 'lucide-react';
import { productService } from '../../services/productService';
import { orderService } from '../../services/orderService';

const CreateOrder = () => {
    const navigate = useNavigate();
    const [availableProducts, setAvailableProducts] = useState([]);
    const [orderData, setOrderData] = useState({
        // orderId: `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
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
            grandTotal: 0,
            paymentStatus: 'Unpaid'
        },
        orderStatus: 'Pending'
    });

    useEffect(() => {
        productService.getAll().then(data => setAvailableProducts(data || []));
    }, []);

    // --- RENTAL CALCULATION LOGIC ---
    useEffect(() => {
        let rentalTotal = 0;
        let depositTotal = 0;
        let bookingsChanged = false;

        const updatedBookings = orderData.bookings.map(item => {
            // Safety check: if dates or product aren't selected yet, return item as is
            if (!item.startDate || !item.endDate || !item.product) return item;

            const start = new Date(item.startDate);
            const end = new Date(item.endDate);
            
            // Calculate days (minimum 1 day)
            const diffDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
            
            let unitsToCharge = 0;
            if (item.rentalType === 'Weekly') {
                unitsToCharge = Math.ceil(diffDays / 7);
            } else if (item.rentalType === 'Monthly') {
                unitsToCharge = Math.ceil(diffDays / 30);
            } else {
                unitsToCharge = diffDays;
            }

            // Ensure we use Numbers to prevent NaN
            const rate = Number(item.appliedRate) || 0;
            const qty = Number(item.quantity) || 0;
            const dep = Number(item.securityDeposit) || 0;

            const itemRental = unitsToCharge * rate * qty;
            const itemDeposit = dep * qty;
            
            rentalTotal += itemRental;
            depositTotal += itemDeposit;

            // Check if calculated values differ from current state to avoid infinite loops
            if (item.durationDays !== diffDays || item.unitsCharged !== unitsToCharge) {
                bookingsChanged = true;
            }

            return { ...item, durationDays: diffDays, unitsCharged: unitsToCharge };
        });

        const logisticsTotal = (Number(orderData.logistics.delivery.charges) || 0) + 
                               (Number(orderData.logistics.return.charges) || 0);
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
            bookings: [...prev.bookings, {
                product: '', name: '', quantity: 1, 
                startDate: today, endDate: today, 
                rentalType: 'Daily', appliedRate: 0, securityDeposit: 0,
                unitsCharged: 0, durationDays: 0 // Initialize to 0 to prevent render errors
            }]
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
            name: `${product.name} (${product.size})`,
            appliedRate: rate,
            securityDeposit: product.securityDeposit || 500
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

        newBookings[index][field] = value;
        setOrderData({ ...orderData, bookings: newBookings });
    };

    const updateCustomerField = (field, value) => {
        setOrderData(prev => ({
            ...prev,
            customer: { ...prev.customer, [field]: value }
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

    const handleSaveOrder = async () => {
        if (!orderData.customer.name || orderData.bookings.length === 0) {
            alert("Missing required fields."); return;
        }
        try {
            await orderService.create(orderData);
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
                {/* 1. Customer Section (Added requested fields) */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 space-y-4 shadow-sm">
                    <h2 className="font-bold flex items-center gap-2"><User size={18}/> Customer Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input placeholder="Full Name" className="border p-3 rounded-xl" onChange={(e) => updateCustomerField('name', e.target.value)} />
                        <input placeholder="Primary Phone" className="border p-3 rounded-xl" onChange={(e) => updateCustomerField('phone', e.target.value)} />
                        <input placeholder="Alternate Phone" className="border p-3 rounded-xl" onChange={(e) => updateCustomerField('alternatePhone', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input placeholder="Address" className="md:col-span-3 border p-3 rounded-xl" onChange={(e) => updateCustomerField('address', e.target.value)} />
                        <input placeholder="Pincode" className="border p-3 rounded-xl" onChange={(e) => updateCustomerField('pincode', e.target.value)} />
                    </div>
                </div>

                {/* 2. Inventory Section (Multi-Row Table) */}
                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="p-6 border-b flex justify-between items-center bg-white">
                        <h2 className="font-bold">Inventory & Duration</h2>
                        <button onClick={addNewRow} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition">
                            <Plus size={16}/> Add Bike
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-[10px] uppercase font-black text-gray-400">
                                <tr>
                                    <th className="p-4">Bike Details</th>
                                    <th className="p-4">Rate Type</th>
                                    <th className="p-4">Qty</th>
                                    <th className="p-4">Dates</th>
                                    <th className="p-4">Calculation</th>
                                    <th className="p-4">Subtotal</th>
                                    <th className="p-4 text-center">Delete</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orderData.bookings.map((item, idx) => (
                                    <tr key={idx} className="border-t border-gray-50 hover:bg-gray-50 transition">
                                        <td className="p-4 min-w-[200px]">
                                            <select className="w-full border p-2 rounded-lg text-sm bg-white" value={item.product} onChange={(e) => handleProductSelect(idx, e.target.value)}>
                                                <option value="">-- Select Product --</option>
                                                {availableProducts.map(p => <option key={p._id} value={p._id}>{p.name} ({p.size})</option>)}
                                            </select>
                                        </td>
                                        <td className="p-4">
                                            <select className="border p-2 rounded-lg text-sm font-bold text-blue-600 bg-blue-50" value={item.rentalType} onChange={(e) => updateBookingField(idx, 'rentalType', e.target.value)}>
                                                <option value="Daily">Daily</option>
                                                <option value="Weekly">Weekly</option>
                                                <option value="Monthly">Monthly</option>
                                            </select>
                                        </td>
                                        <td className="p-4">
                                            <input type="number" min="1" value={item.quantity} className="w-16 border p-2 rounded-lg text-sm" onChange={(e) => updateBookingField(idx, 'quantity', e.target.value)} />
                                        </td>
                                        <td className="p-4 min-w-[300px]">
                                            <div className="flex items-center gap-2">
                                                <input type="date" value={item.startDate} className="border p-2 rounded-lg text-xs" onChange={(e) => updateBookingField(idx, 'startDate', e.target.value)} />
                                                <span className="text-gray-400">-</span>
                                                <input type="date" value={item.endDate} className="border p-2 rounded-lg text-xs" onChange={(e) => updateBookingField(idx, 'endDate', e.target.value)} />
                                            </div>
                                        </td>
                                        <td className="p-4 text-[10px] text-gray-500 italic">
                                            {item.unitsCharged || 0} {item.rentalType}(s) <br/> 
                                            ({item.durationDays || 0} days)
                                        </td>
                                        <td className="p-4 font-bold text-sm text-gray-800">
                                            ₹{((item.unitsCharged || 0) * (item.appliedRate || 0) * (item.quantity || 0)).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button onClick={() => setOrderData({...orderData, bookings: orderData.bookings.filter((_, i) => i !== idx)})} className="text-red-300 hover:text-red-500">
                                                <Trash2 size={18}/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 3. Logistics & Totals */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                        <h3 className="font-bold flex items-center gap-2"><Truck size={18}/> Logistics Charges</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Delivery Charge</label>
                                <input type="number" placeholder="0" className="border p-3 rounded-xl w-full text-sm" onChange={(e) => updateLogisticsField('delivery', 'charges', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Return Charge</label>
                                <input type="number" placeholder="0" className="border p-3 rounded-xl w-full text-sm" onChange={(e) => updateLogisticsField('return', 'charges', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-xl">Order Summary</h3>
                            <CreditCard />
                        </div>
                        <div className="space-y-1 text-sm opacity-80">
                            <div className="flex justify-between"><span>Rental Subtotal</span><span>₹{orderData.financials.totalRental.toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>Security Deposits</span><span>₹{orderData.financials.totalDeposit.toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>Logistics Fees</span><span>₹{orderData.financials.totalLogistics.toLocaleString()}</span></div>
                        </div>
                        <div className="pt-4 border-t border-white/20 flex justify-between text-4xl font-black">
                            <span>₹{orderData.financials.grandTotal.toLocaleString()}</span>
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