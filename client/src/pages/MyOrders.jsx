import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, Calendar, Truck, Bike, ChevronRight, AlertCircle, ShoppingBag, CreditCard, DollarSign, RefreshCw } from 'lucide-react';
import { orderService } from '../services/orderService';
import { AuthContext } from '../context/AuthContext';

const MyOrders = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await orderService.getAll();
                setOrders(res.data || res);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching my orders:", err);
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    const filteredOrders = (orders || []).filter(order => {
        const search = searchTerm.toLowerCase();
        return order.orderId.toLowerCase().includes(search) ||
               (order.bookings[0]?.productCode || '').toLowerCase().includes(search);
    });

    const getStatusStyle = (s) => {
        switch (s) {
            case 'On-Hold': return 'bg-yellow-50 text-yellow-700 border-yellow-100';
            case 'Confirmed': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'In-Progress': return 'bg-purple-50 text-purple-700 border-purple-100';
            case 'Returned': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
            case 'Completed': return 'bg-green-50 text-green-700 border-green-100';
            case 'Cancelled': return 'bg-red-50 text-red-700 border-red-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };
    
    const getPaymentStatusStyle = (s) => {
        switch (s) {
            case 'Paid': return 'bg-green-100 text-green-800';
            case 'Partial': return 'bg-yellow-100 text-yellow-800';
            case 'Unpaid': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatCurrency = (amount) => `₹${amount.toLocaleString()}`;
    const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });


    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-pulse flex flex-col items-center">
                <div className="w-12 h-12 bg-gray-200 rounded-full mb-4"></div>
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-20 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900">My Orders</h1>
                        <p className="text-gray-500 mt-1">Track and manage your rentals</p>
                    </div>
                    
                    {orders.length > 0 && (
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search Order ID or Bike..." 
                                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-sm transition"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                {/* Orders List */}
                <div className="space-y-4">
                    {filteredOrders.length > 0 ? (
                        filteredOrders.map((order) => (
                            <div key={order._id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                                <div className="p-6">
                                    <div className="flex flex-col md:flex-row gap-6 justify-between">
                                        
                                        {/* Left: Order Info & Status */}
                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-start justify-between md:justify-start md:gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                                        <Package size={24} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-lg text-gray-900">{order.orderId}</h3>
                                                        <p className="text-xs text-gray-400 font-medium">Placed on {formatDate(order.createdAt)}</p>
                                                    </div>
                                                </div>
                                                <span className={`md:hidden px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusStyle(order.orderStatus)}`}>
                                                    {order.orderStatus}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {order.bookings.map((item, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                                                        <Bike size={14} className="text-gray-400"/>
                                                        <span className="text-sm font-bold text-gray-700">{item.quantity}x {item.productCode || 'Bike'}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                                                    <Calendar size={14} />
                                                    <span className="font-semibold text-gray-700">
                                                        {new Date(order.bookings[0]?.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                    <span className="mx-1">→</span>
                                                    <span className="font-semibold text-gray-700">
                                                        {new Date(order.bookings[0]?.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg hidden sm:flex">
                                                    <Truck size={14} />
                                                    <span className="font-medium">{order.logistics.delivery.type}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Status badge (Desktop) & Price */}
                                        <div className="flex flex-row md:flex-col justify-between items-end text-right border-t md:border-t-0 pt-4 md:pt-0 mt-2 md:mt-0 border-gray-100">
                                            <span className={`hidden md:inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wide border ${getStatusStyle(order.orderStatus)}`}>
                                                {order.orderStatus}
                                            </span>
                                            
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs font-bold text-gray-400 uppercase">Total Amount</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${getPaymentStatusStyle(order.financials.paymentStatus)}`}>
                                                        {order.financials.paymentStatus}
                                                    </span>
                                                    <span className="text-2xl font-black text-gray-900">{formatCurrency(order.financials.grandTotal)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Financials Expansion */}
                                    {(order.financials.paymentHistory?.length > 0 || order.financials.refundHistory?.length > 0) && (
                                        <div className="mt-6 border-t border-gray-100 pt-6">
                                            <h4 className="font-bold text-md text-gray-800 mb-4">Financials</h4>
                                            
                                            {/* Payment History */}
                                            {order.financials.paymentHistory?.length > 0 && (
                                                <div className="mb-4">
                                                    <h5 className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-2">
                                                        <CreditCard size={16} /> Payment History
                                                    </h5>
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full text-sm">
                                                            <thead className="text-left text-gray-500">
                                                                <tr>
                                                                    <th className="p-2 font-medium">Date</th>
                                                                    <th className="p-2 font-medium">Amount</th>
                                                                    <th className="p-2 font-medium">Method</th>
                                                                    <th className="p-2 font-medium hidden md:table-cell">Note</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="font-medium text-gray-800">
                                                                {order.financials.paymentHistory.map((p, i) => (
                                                                    <tr key={i} className="border-b border-gray-100 last:border-0">
                                                                        <td className="p-2">{formatDate(p.date)}</td>
                                                                        <td className="p-2 font-bold">{formatCurrency(p.amount)}</td>
                                                                        <td className="p-2">{p.method}</td>
                                                                        <td className="p-2 text-gray-600 hidden md:table-cell">{p.note}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Refund History */}
                                            {order.financials.refundHistory?.length > 0 && (
                                                 <div>
                                                    <h5 className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-2">
                                                        <RefreshCw size={16} /> Refund History
                                                    </h5>
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full text-sm">
                                                            <thead className="text-left text-gray-500">
                                                                <tr>
                                                                    <th className="p-2 font-medium">Date</th>
                                                                    <th className="p-2 font-medium">Amount</th>
                                                                    <th className="p-2 font-medium">Reason</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="font-medium text-gray-800">
                                                                {order.financials.refundHistory.map((r, i) => (
                                                                    <tr key={i} className="border-b border-gray-100 last:border-0">
                                                                        <td className="p-2">{formatDate(r.date)}</td>
                                                                        <td className="p-2 font-bold">{formatCurrency(r.amount)}</td>
                                                                        <td className="p-2">{r.reason}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ShoppingBag size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">No orders found</h3>
                            <p className="text-gray-500 max-w-xs mx-auto mb-6">You haven't placed any orders yet. Check out our catalogue to get started!</p>
                            <button 
                                onClick={() => navigate('/catalogue')}
                                className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition transform"
                            >
                                Browse Bikes
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyOrders;
