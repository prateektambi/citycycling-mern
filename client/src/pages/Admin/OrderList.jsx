import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, Phone, ChevronRight, Plus, Filter, Calendar } from 'lucide-react';

const OrderList = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                // Adjust the URL to your backend API
                const res = await axios.get(`http://localhost:5000/api/orders?status=${statusFilter}`);
                setOrders(res.data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching orders:", err);
                setLoading(false);
            }
        };
        fetchOrders();
    }, [statusFilter]);

    const filteredOrders = orders.filter(order => 
        order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer.phone.includes(searchTerm) ||
        order.orderId.includes(searchTerm)
    );

    if (loading) return <div className="p-10 text-center">Loading Dashboard...</div>;

    return (
        <div className="bg-gray-50 min-h-screen pb-24">
            {/* Sticky Header */}
            <div className="sticky top-0 bg-white shadow-sm z-20">
                <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h1 className="text-xl font-bold text-gray-800">Rental Dashboard</h1>
                    
                    <div className="flex gap-2 flex-1 md:max-w-md">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                            <input 
                                type="text"
                                placeholder="Search Name or Phone..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select 
                            className="bg-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none"
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All</option>
                            <option value="Pending">Pending</option>
                            <option value="In-Progress">Active</option>
                            <option value="Completed">Done</option>
                        </select>
                    </div>

                    <button 
                        onClick={() => navigate('/admin/orders/new')}
                        className="hidden md:flex bg-blue-600 text-white px-6 py-2 rounded-xl font-bold items-center gap-2 hover:bg-blue-700 transition"
                    >
                        <Plus size={18} /> Create Order
                    </button>
                </div>
            </div>

            {/* Responsive Grid List */}
            <div className="max-w-7xl mx-auto p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredOrders.map(order => (
                        <div key={order._id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{order.orderId}</span>
                                        <h3 className="font-bold text-gray-900 text-lg leading-tight">{order.customer.name}</h3>
                                    </div>
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${getStatusStyle(order.orderStatus)}`}>
                                        {order.orderStatus}
                                    </span>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <div className="p-2 bg-gray-50 rounded-lg"><Calendar size={16}/></div>
                                        <span>{order.bookings.length} Items Rented</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <div className="p-2 bg-gray-50 rounded-lg"><Phone size={16}/></div>
                                        <span>{order.customer.phone}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-50 mt-auto">
                                <div className="flex justify-between items-end mb-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Grand Total</p>
                                        <p className="text-xl font-black text-gray-900">₹{order.financials.grandTotal}</p>
                                    </div>
                                    <div className={`text-xs font-bold ${getPaymentColor(order.financials.paymentStatus)}`}>
                                        ● {order.financials.paymentStatus}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <a href={`tel:${order.customer.phone}`} className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200">
                                        <Phone size={18} />
                                    </a>
                                    <button 
                                        onClick={() => navigate(`/admin/orders/${order.orderId}`)}
                                        className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition"
                                    >
                                        Manage Order <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Floating Mobile Create Button (hidden on desktop) */}
            <button 
                onClick={() => navigate('/admin/orders/new')}
                className="md:hidden fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-2xl z-30 active:scale-90 transition"
            >
                <Plus size={28} />
            </button>
        </div>
    );
};

// Helper functions for styles
const getStatusStyle = (s) => {
    if (s === 'In-Progress') return 'bg-blue-100 text-blue-600';
    if (s === 'Pending') return 'bg-orange-100 text-orange-600';
    if (s === 'Completed') return 'bg-green-100 text-green-600';
    return 'bg-gray-100 text-gray-600';
};

const getPaymentColor = (s) => {
    if (s === 'Fully-Paid') return 'text-green-600';
    if (s === 'Partially-Paid') return 'text-orange-500';
    return 'text-red-500';
};

export default OrderList;