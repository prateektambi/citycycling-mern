import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, Calendar, Truck, Bike, ChevronRight, AlertCircle, ShoppingBag, CreditCard, DollarSign, RefreshCw, MapPin, Clock } from 'lucide-react';
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

    const handleCancelOrder = async (orderId) => {
        if (!window.confirm("Are you sure you want to cancel this order?")) return;
        try {
            await orderService.cancel(orderId);
            alert("Order cancelled successfully.");
            setLoading(true);
            const res = await orderService.getAll();
            setOrders(res.data || res);
            setLoading(false);
        } catch (err) {
            alert(err.response?.data?.message || err.message || "Failed to cancel order.");
        }
    };

    const filteredOrders = (orders || []).filter(order => {
        const search = searchTerm.toLowerCase();
        return order.orderId.toLowerCase().includes(search) ||
               order.bookings.some(b => 
                   (b.productCode || '').toLowerCase().includes(search) || 
                   (b.product?.name || '').toLowerCase().includes(search)
               );
    });

    const getStatusStyle = (s) => {
        switch (s) {
            case 'On-Hold': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            case 'Confirmed': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'In-Progress': return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'Returned': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
            case 'Completed': return 'bg-green-50 text-green-700 border-green-200';
            case 'Cancelled': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };
    
    const getPaymentStatusStyle = (s) => {
        switch (s) {
            case 'Paid': return 'bg-green-100 text-green-800 border-green-200';
            case 'Partial': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Unpaid': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString()}`;
    
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getImageUrl = (imageName) => {
        if (!imageName) return null;
        return new URL(`../assets/${imageName}`, import.meta.url).href;
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-pulse flex flex-col items-center">
                <div className="w-12 h-12 bg-gray-200 rounded-full mb-4"></div>
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto space-y-8">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">My Orders</h1>
                        <p className="text-gray-500 mt-1">Track upcoming rentals across the city.</p>
                    </div>
                    
                    {orders.length > 0 && (
                        <div className="relative w-full md:w-80 group">
                            <Search className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search by Order ID or Bike Name..." 
                                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none shadow-sm transition"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                {/* Orders List */}
                <div className="space-y-6">
                    {filteredOrders.length > 0 ? (
                        filteredOrders.map((order) => (
                            <div key={order._id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
                                
                                {/* Order Header */}
                                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl border ${getStatusStyle(order.orderStatus)} bg-opacity-20`}>
                                            <Package size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-gray-900 text-lg">{order.orderId}</h3>
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusStyle(order.orderStatus)}`}>
                                                    {order.orderStatus}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 font-medium mt-0.5">
                                                Placed on {formatDate(order.createdAt)} • {formatTime(order.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right hidden sm:block">
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Amount</p>
                                        <p className="text-xl font-black text-gray-900">{formatCurrency(order.financials.grandTotal)}</p>
                                    </div>
                                </div>

                                <div className="p-6 space-y-8">
                                    
                                    {/* Bookings Section */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                            <Bike size={16} /> Booking Details
                                        </h4>
                                        <div className="grid gap-4">
                                            {order.bookings.map((booking, idx) => (
                                                <div key={idx} className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 items-start sm:items-center">
                                                    {/* Image */}
                                                    <div className="w-16 h-16 bg-white rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                                                        {booking.product?.imageUrls?.[0] ? (
                                                            <img 
                                                                src={getImageUrl(booking.product.imageUrls[0])} 
                                                                alt={booking.product.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                                <Bike size={24} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Details */}
                                                    <div className="flex-1 min-w-0">
                                                        <h5 className="font-bold text-gray-900 truncate">
                                                            {booking.product?.name || booking.productCode || 'Unknown Product'}
                                                        </h5>
                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-600">
                                                            <span className="bg-white px-2 py-0.5 rounded border border-gray-200 text-xs font-semibold">
                                                                Qty: {booking.quantity}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Calendar size={12} className="text-gray-400"/>
                                                                {formatDate(booking.startDate)} <span className="text-gray-300">→</span> {formatDate(booking.endDate)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Price Breakdown */}
                                                    <div className="text-left sm:text-right shrink-0">
                                                        <p className="font-bold text-gray-900">{formatCurrency(booking.appliedRate)} <span className="text-xs font-normal text-gray-500">/day</span></p>
                                                        <p className="text-xs text-gray-500">Deposit: {formatCurrency(booking.securityDeposit)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Logistics & Locations */}
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                <Truck size={16} /> Delivery / Pickup
                                            </h4>
                                            <div className="p-4 rounded-2xl border border-gray-100 space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-gray-700">{order.logistics.delivery.type}</span>
                                                    <span className="text-sm font-semibold">{formatCurrency(order.logistics.delivery.charges)}</span>
                                                </div>
                                                {order.logistics.delivery.scheduledDate && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <Calendar size={14} className="text-blue-500"/>
                                                        <span>Scheduled: {formatDate(order.logistics.delivery.scheduledDate)}</span>
                                                    </div>
                                                )}
                                                {/* Customer Address if Delivery */}
                                                {order.logistics.delivery.type === 'Home-Delivery' && order.customer.address && (
                                                    <div className="flex items-start gap-2 text-sm text-gray-600 border-t border-gray-100 pt-2 mt-2">
                                                        <MapPin size={14} className="text-red-500 shrink-0 mt-0.5"/>
                                                        <span className="line-clamp-2">{order.customer.address}, {order.customer.pincode}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                <RefreshCw size={16} /> Return
                                            </h4>
                                            <div className="p-4 rounded-2xl border border-gray-100 space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-gray-700">{order.logistics.return.type}</span>
                                                    <span className="text-sm font-semibold">{formatCurrency(order.logistics.return.charges)}</span>
                                                </div>
                                                {order.logistics.return.scheduledDate && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <Clock size={14} className="text-orange-500"/>
                                                        <span>Scheduled: {formatDate(order.logistics.return.scheduledDate)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Financial Summary */}
                                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase">Rental Total</p>
                                                <p className="text-lg font-bold text-gray-900">{formatCurrency(order.financials.totalRental)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase">Logistics</p>
                                                <p className="text-lg font-bold text-gray-900">{formatCurrency(order.financials.totalLogistics)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase">Security Deposit</p>
                                                <p className="text-lg font-bold text-gray-900">{formatCurrency(order.financials.totalDeposit)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase">Grand Total</p>
                                                <p className="text-2xl font-black text-blue-600">{formatCurrency(order.financials.grandTotal)}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col md:flex-row items-center justify-between pt-6 border-t border-gray-200 gap-4">
                                            <div className="flex flex-col gap-2 w-full md:w-auto">
                                                <div className="flex items-center justify-between md:justify-start gap-4">
                                                    <span className="text-sm font-bold text-gray-600">Payment Status:</span>
                                                    <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase border ${getPaymentStatusStyle(order.financials.paymentStatus)}`}>
                                                        {order.financials.paymentStatus}
                                                    </span>
                                                </div>
                                                {(order.financials.paymentHistory?.length > 0) && (
                                                    <div className="text-xs text-gray-500 font-medium whitespace-nowrap">
                                                       Last Payment: {formatDate(order.financials.paymentHistory[order.financials.paymentHistory.length - 1].date)}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
                                                {order.orderStatus === 'On-Hold' ? (
                                                    <button 
                                                        onClick={() => handleCancelOrder(order.orderId)}
                                                        className="w-full md:w-auto px-6 py-2.5 bg-white border-2 border-red-100 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 hover:border-red-200 transition"
                                                    >
                                                        Cancel Order
                                                    </button>
                                                ) : !['Cancelled', 'Completed'].includes(order.orderStatus) ? (
                                                    <div className="w-full md:w-auto bg-blue-50 text-blue-700 px-4 py-2 bg-opacity-70 rounded-xl text-xs font-medium border border-blue-100 flex items-center justify-center gap-2">
                                                        <AlertCircle size={14} className="text-blue-500"/>
                                                        Reach out to us to modify or cancel
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>

                                        {/* Payment History Expandable (Simplification: Just show if exists) */}
                                        {order.financials.paymentHistory?.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-gray-200">
                                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Transaction History</p>
                                                <div className="space-y-2">
                                                    {order.financials.paymentHistory.map((ph, pi) => (
                                                        <div key={pi} className="flex justify-between items-center text-sm">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                                <span className="text-gray-700">Paid via {ph.method}</span>
                                                            </div>
                                                            <span className="font-bold text-gray-900">{formatCurrency(ph.amount)}</span>
                                                        </div>
                                                    ))}
                                                    {/* Refund History */}
                                                    {order.financials.refundHistory?.map((rh, ri) => (
                                                        <div key={ri} className="flex justify-between items-center text-sm">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                                                <span className="text-gray-700">Refunded ({rh.reason})</span>
                                                            </div>
                                                            <span className="font-bold text-red-600">-{formatCurrency(rh.amount)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm">
                            <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <ShoppingBag size={32} />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-2">No active orders</h3>
                            <p className="text-gray-500 max-w-sm mx-auto mb-8">You haven't placed any bookings yet. Browse our premium collection and start your journey today!</p>
                            <button 
                                onClick={() => navigate('/catalogue')}
                                className="bg-gray-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-gray-800 hover:scale-105 transition-all transform shadow-xl shadow-gray-200"
                            >
                                Explore Bikes
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyOrders;
