import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    AlertTriangle, Clock, Truck, Package, Calendar, RefreshCw, 
    Phone, MessageCircle, ChevronRight, ChevronDown, ChevronUp,
    Wallet, CheckCircle, RotateCcw
} from 'lucide-react';
import { orderService } from '../../services/orderService';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedSections, setExpandedSections] = useState({
        overdue: true, overdueReturns: true, pendingSettlement: true,
        deliveries: true, pickups: true, returns: true, 
        upcoming: true, needsPrep: true, refunds: true
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await orderService.getAll();
                setOrders(res.data || res);
            } catch (err) {
                console.error("Error fetching orders:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    // ========== CALCULATION HELPERS ==========
    const calculateNetDue = (order) => {
        const currentCost = (order.bookings || []).reduce((sum, item) => {
            if (!item.startDate || !item.product) return sum;
            const start = new Date(item.startDate);
            start.setHours(0, 0, 0, 0);
            if (today < start) return sum;

            const diffTime = Math.abs(today - start);
            const daysTillNow = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            let itemCost = 0;
            const rate = Number(item.appliedRate) || 0;
            const qty = Number(item.quantity) || 1;

            if (item.rentalType === 'Weekly') {
                if (daysTillNow <= 7) {
                    itemCost = rate * qty;
                } else {
                    const weeks = Math.floor(daysTillNow / 7);
                    const extraDays = daysTillNow % 7;
                    const ceilingCost = Math.ceil(daysTillNow / 7) * rate * qty;
                    
                    let extraCost = 0;
                    if (extraDays > 0) {
                        const extraRates = item.weeklyExtraRates || {};
                        for (let i = 1; i <= extraDays; i++) {
                            extraCost += Number(extraRates[`day${i}`] || 0);
                        }
                        const mixedCost = (weeks * rate * qty) + (extraCost * qty);
                        itemCost = extraCost === 0 ? ceilingCost : Math.min(ceilingCost, mixedCost);
                    } else {
                        itemCost = weeks * rate * qty;
                    }
                }
            } else if (item.rentalType === 'Monthly') {
                itemCost = Math.ceil(daysTillNow / 30) * rate * qty;
            } else {
                itemCost = daysTillNow * rate * qty;
            }
            return sum + itemCost;
        }, 0);

        const logistics = (Number(order.logistics?.delivery?.charges) || 0) + (Number(order.logistics?.return?.charges) || 0);
        const totalCost = currentCost + logistics;
        const totalPaid = (order.financials.paymentHistory || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
        const totalRefunded = (order.financials.refundHistory || []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
        const netPaid = totalPaid - totalRefunded;

        return totalCost - netPaid;
    };

    const isWithinDays = (dateStr, days) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
        return d >= today && d <= new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    };

    const isToday = (dateStr) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
    };

    const isPastDue = (dateStr) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
        return d < today;
    };

    // ========== FILTERS ==========
    const overdueOrders = orders.filter(o => o.orderStatus === 'In-Progress' && calculateNetDue(o) > 0);
    const overdueReturns = orders.filter(o => o.orderStatus === 'In-Progress' && o.bookings.some(b => isPastDue(b.endDate)));
    const pendingSettlement = orders.filter(o => o.orderStatus === 'Returned');
    const upcomingDeliveries = orders.filter(o => o.orderStatus === 'Confirmed' && isWithinDays(o.logistics?.delivery?.scheduledDate, 7));
    const upcomingPickups = orders.filter(o => o.logistics?.return?.type === 'Pickup' && isWithinDays(o.logistics?.return?.scheduledDate, 7) && ['Confirmed', 'In-Progress'].includes(o.orderStatus));
    const upcomingReturns = orders.filter(o => isWithinDays(o.logistics?.return?.scheduledDate, 7) && ['In-Progress'].includes(o.orderStatus));
    const upcomingOrders = orders.filter(o => o.bookings.some(b => isWithinDays(b.startDate, 7)) && ['On-Hold', 'Confirmed'].includes(o.orderStatus));
    const needsPrep = orders.filter(o => o.orderStatus === 'Confirmed' && !(o.tags || []).includes('Prepped'));
    const pendingRefunds = orders.filter(o => (o.tags || []).includes('Refund-Pending'));

    // ========== ACTIONS ==========
    const handleWhatsApp = (order) => {
        const phone = order.customer?.phone?.replace(/\D/g, '');
        const msg = `Hello ${order.customer?.name}, regarding your order #${order.orderId}`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            await orderService.changeState(orderId, newStatus);
            setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, orderStatus: newStatus } : o));
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const handleTagToggle = async (orderId, tag, currentTags) => {
        const action = currentTags.includes(tag) ? 'remove' : 'add';
        try {
            await orderService.manageTags(orderId, tag, action);
            setOrders(prev => prev.map(o => {
                if (o.orderId !== orderId) return o;
                const newTags = action === 'add' ? [...(o.tags || []), tag] : (o.tags || []).filter(t => t !== tag);
                return { ...o, tags: newTags };
            }));
        } catch (err) {
            alert('Failed to update tag');
        }
    };

    const toggleSection = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

    // ========== RENDER HELPERS ==========
    const SectionHeader = ({ title, icon: Icon, count, sectionKey, color = 'blue' }) => (
        <button 
            onClick={() => toggleSection(sectionKey)}
            className={`w-full flex items-center justify-between p-4 bg-${color}-50 rounded-xl border border-${color}-100 mb-2`}
        >
            <div className="flex items-center gap-3">
                <Icon size={20} className={`text-${color}-600`} />
                <span className="font-bold text-gray-800">{title}</span>
                <span className={`bg-${color}-600 text-white text-xs px-2 py-0.5 rounded-full font-bold`}>{count}</span>
            </div>
            {expandedSections[sectionKey] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
    );

    const OrderCard = ({ order, showOverdue = false, showDate = null }) => {
        const netDue = showOverdue ? calculateNetDue(order) : 0;
        const isTodayDate = showDate && isToday(showDate);

        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">#{order.orderId}</p>
                        <p className="font-bold text-gray-900">{order.customer?.name}</p>
                        <p className="text-xs text-gray-500">{order.customer?.phone}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getStatusStyle(order.orderStatus)}`}>
                            {order.orderStatus}
                        </span>
                        {isTodayDate && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700">TODAY</span>}
                    </div>
                </div>

                {/* Overdue Amount */}
                {showOverdue && netDue > 0 && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-2 flex justify-between items-center">
                        <span className="text-xs font-bold text-red-600">Overdue</span>
                        <span className="font-black text-red-700">₹{netDue.toLocaleString()}</span>
                    </div>
                )}

                {/* Products */}
                <div className="flex flex-wrap gap-1">
                    {order.bookings.map((b, i) => (
                        <span key={i} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">
                            {b.quantity}x {b.productCode}
                        </span>
                    ))}
                </div>

                {/* Quick Tags */}
                <div className="flex flex-wrap gap-1">
                    {['Prepped', 'Overdue'].map(tag => (
                        <button
                            key={tag}
                            onClick={() => handleTagToggle(order.orderId, tag, order.tags || [])}
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border transition ${
                                (order.tags || []).includes(tag) 
                                    ? 'bg-green-100 text-green-700 border-green-200' 
                                    : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            {(order.tags || []).includes(tag) ? '✓ ' : ''}{tag}
                        </button>
                    ))}
                </div>

                {/* Quick Status */}
                <select
                    value={order.orderStatus}
                    onChange={(e) => handleStatusChange(order.orderId, e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-gray-50"
                >
                    {['On-Hold', 'Confirmed', 'In-Progress', 'Returned', 'Completed', 'Cancelled'].map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>

                {/* Actions */}
                <div className="flex gap-2">
                    <a href={`tel:${order.customer?.phone}`} className="flex-1 flex items-center justify-center gap-1 bg-blue-50 text-blue-600 py-2 rounded-lg font-bold text-xs">
                        <Phone size={14} /> Call
                    </a>
                    <button onClick={() => handleWhatsApp(order)} className="flex-1 flex items-center justify-center gap-1 bg-green-50 text-green-600 py-2 rounded-lg font-bold text-xs">
                        <MessageCircle size={14} /> WhatsApp
                    </button>
                    <button onClick={() => navigate(`/admin/orders/${order.orderId}`)} className="flex-1 flex items-center justify-center gap-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-bold text-xs">
                        <ChevronRight size={14} /> View
                    </button>
                </div>
            </div>
        );
    };

    if (loading) return <div className="p-10 text-center font-bold text-gray-400">Loading Dashboard...</div>;

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-20 p-4 shadow-sm">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-2xl font-black text-gray-900">Good Morning ☀️</h1>
                    <p className="text-sm text-gray-500">{today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
            </div>

            {/* Summary Bar */}
            <div className="max-w-4xl mx-auto p-4">
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-6">
                    {[
                        { label: 'Overdue', count: overdueOrders.length, color: 'red' },
                        { label: 'Deliveries', count: upcomingDeliveries.length, color: 'blue' },
                        { label: 'Returns', count: upcomingReturns.length, color: 'purple' },
                        { label: 'Settlement', count: pendingSettlement.length, color: 'indigo' },
                        { label: 'Refunds', count: pendingRefunds.length, color: 'orange' },
                    ].map(item => (
                        <div key={item.label} className={`bg-${item.color}-50 border border-${item.color}-100 rounded-xl p-3 text-center`}>
                            <p className={`text-2xl font-black text-${item.color}-600`}>{item.count}</p>
                            <p className="text-[10px] font-bold text-gray-500 uppercase">{item.label}</p>
                        </div>
                    ))}
                </div>

                {/* Sections */}
                <div className="space-y-4">
                    {/* Overdue Orders */}
                    <div>
                        <SectionHeader title="Overdue Orders" icon={AlertTriangle} count={overdueOrders.length} sectionKey="overdue" color="red" />
                        {expandedSections.overdue && (
                            <div className="grid gap-3">
                                {overdueOrders.map(o => <OrderCard key={o._id} order={o} showOverdue />)}
                                {overdueOrders.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No overdue orders 🎉</p>}
                            </div>
                        )}
                    </div>

                    {/* Overdue Returns */}
                    <div>
                        <SectionHeader title="Overdue Returns" icon={RotateCcw} count={overdueReturns.length} sectionKey="overdueReturns" color="orange" />
                        {expandedSections.overdueReturns && (
                            <div className="grid gap-3">
                                {overdueReturns.map(o => <OrderCard key={o._id} order={o} />)}
                                {overdueReturns.length === 0 && <p className="text-center text-gray-400 text-sm py-4">All returns on time 👍</p>}
                            </div>
                        )}
                    </div>

                    {/* Pending Settlement */}
                    <div>
                        <SectionHeader title="Pending Settlement" icon={Wallet} count={pendingSettlement.length} sectionKey="pendingSettlement" color="indigo" />
                        {expandedSections.pendingSettlement && (
                            <div className="grid gap-3">
                                {pendingSettlement.map(o => <OrderCard key={o._id} order={o} />)}
                                {pendingSettlement.length === 0 && <p className="text-center text-gray-400 text-sm py-4">All settled 💯</p>}
                            </div>
                        )}
                    </div>

                    {/* Upcoming Deliveries */}
                    <div>
                        <SectionHeader title="Upcoming Deliveries (7 Days)" icon={Truck} count={upcomingDeliveries.length} sectionKey="deliveries" color="blue" />
                        {expandedSections.deliveries && (
                            <div className="grid gap-3">
                                {upcomingDeliveries.map(o => <OrderCard key={o._id} order={o} showDate={o.logistics?.delivery?.scheduledDate} />)}
                                {upcomingDeliveries.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No upcoming deliveries</p>}
                            </div>
                        )}
                    </div>

                    {/* Upcoming Pickups */}
                    <div>
                        <SectionHeader title="Upcoming Pickups (7 Days)" icon={Package} count={upcomingPickups.length} sectionKey="pickups" color="purple" />
                        {expandedSections.pickups && (
                            <div className="grid gap-3">
                                {upcomingPickups.map(o => <OrderCard key={o._id} order={o} showDate={o.logistics?.return?.scheduledDate} />)}
                                {upcomingPickups.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No upcoming pickups</p>}
                            </div>
                        )}
                    </div>

                    {/* Upcoming Returns */}
                    <div>
                        <SectionHeader title="Upcoming Returns (7 Days)" icon={RotateCcw} count={upcomingReturns.length} sectionKey="returns" color="teal" />
                        {expandedSections.returns && (
                            <div className="grid gap-3">
                                {upcomingReturns.map(o => <OrderCard key={o._id} order={o} showDate={o.logistics?.return?.scheduledDate} />)}
                                {upcomingReturns.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No upcoming returns</p>}
                            </div>
                        )}
                    </div>

                    {/* Upcoming Orders */}
                    <div>
                        <SectionHeader title="Upcoming Orders (7 Days)" icon={Calendar} count={upcomingOrders.length} sectionKey="upcoming" color="cyan" />
                        {expandedSections.upcoming && (
                            <div className="grid gap-3">
                                {upcomingOrders.map(o => <OrderCard key={o._id} order={o} showDate={o.bookings[0]?.startDate} />)}
                                {upcomingOrders.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No upcoming orders</p>}
                            </div>
                        )}
                    </div>

                    {/* Needs Prep */}
                    <div>
                        <SectionHeader title="Needs Prep" icon={CheckCircle} count={needsPrep.length} sectionKey="needsPrep" color="yellow" />
                        {expandedSections.needsPrep && (
                            <div className="grid gap-3">
                                {needsPrep.map(o => <OrderCard key={o._id} order={o} />)}
                                {needsPrep.length === 0 && <p className="text-center text-gray-400 text-sm py-4">All prepped! 🚴</p>}
                            </div>
                        )}
                    </div>

                    {/* Pending Refunds */}
                    <div>
                        <SectionHeader title="Pending Refunds" icon={RefreshCw} count={pendingRefunds.length} sectionKey="refunds" color="orange" />
                        {expandedSections.refunds && (
                            <div className="grid gap-3">
                                {pendingRefunds.map(o => <OrderCard key={o._id} order={o} />)}
                                {pendingRefunds.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No pending refunds</p>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
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

export default AdminDashboard;
