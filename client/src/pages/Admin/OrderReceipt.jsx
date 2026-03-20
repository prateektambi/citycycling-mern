import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { orderService } from '../../services/orderService';
import { Printer, ChevronLeft } from 'lucide-react';

const OrderReceipt = () => {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                // Determine if ID is mongo ID or CC- ID and fetch accordingly
                // Admin fetch should use getById
                const response = await orderService.getById(id);
                setOrder(response.data || response);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching order:", err);
                setError('Failed to load order.');
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id]);

    if (loading) return <div className="p-10 text-center text-gray-400 font-mono">Loading Receipt...</div>;
    if (error || !order) return <div className="p-10 text-center text-red-500 font-mono">{error || 'Order not found'}</div>;

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatCurrency = (amount) => `₹${(Number(amount) || 0).toLocaleString()}`;

    // Calculate totals based on the arrays
    const totalPaid = order.financials?.paymentHistory?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
    const balanceDue = Math.max(0, (order.financials?.grandTotal || 0) - totalPaid);

    const calculateDuration = (start, end, type, allowPartial) => {
        if (!start || !end) return '';
        const s = new Date(start);
        const e = new Date(end);
        s.setHours(0,0,0,0);
        e.setHours(0,0,0,0);
        const diffDays = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));

        let display = `${diffDays} Days`;

        if (type === 'Weekly') {
            if (!allowPartial) {
                const chargedWeeks = Math.ceil(diffDays / 7);
                display += ` / ${chargedWeeks} Weeks`;
            } else {
                const weeks = Math.floor(diffDays / 7);
                const extra = diffDays % 7;
                display += extra > 0 ? ` / ${weeks}W ${extra}D` : ` / ${weeks} Weeks`;
            }
        } else if (type === 'Monthly') {
            if (!allowPartial) {
                const chargedMonths = Math.ceil(diffDays / 30);
                display += ` / ${chargedMonths} Months`;
            } else {
                const months = Math.floor(diffDays / 30);
                const extra = diffDays % 30;
                display += extra > 0 ? ` / ${months}M ${extra}D` : ` / ${months} Months`;
            }
        }
        return display;
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans sm:p-8 flex flex-col items-center">
            {/* Print & Action Bar - Hidden during print */}
            <div className="w-full max-w-3xl mb-6 flex justify-between items-center print:hidden px-4 sm:px-0">
                <button 
                    onClick={() => window.close()} 
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-bold text-sm transition-colors"
                >
                    <ChevronLeft size={18} /> Close Tab
                </button>
                <button 
                    onClick={() => window.print()} 
                    className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
                >
                    <Printer size={18} /> Print Receipt
                </button>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { margin: 1.5cm; }
                    body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .min-h-screen { background: white !important; padding: 0 !important; margin: 0 !important; display: block !important; }
                    .max-w-3xl { max-width: 100% !important; border: none !important; shadow: none !important; margin: 0 !important; padding: 0 !important; }
                    .bg-white, .bg-gray-50, .bg-gray-900, .bg-blue-50 { background: white !important; color: black !important; }
                    .text-gray-400, .text-gray-500, .text-gray-600, .text-blue-600 { color: black !important; }
                    .border, .border-gray-100, .border-gray-200 { border-color: #eee !important; }
                    .shadow-lg, .shadow-sm { box-shadow: none !important; }
                    button, .print\\:hidden { display: none !important; }
                    h1, h2, h3, p, span, td, th { color: black !important; -webkit-print-color-adjust: economy !important; }
                    .font-mono { background: transparent !important; border: 1px solid #eee !important; }
                    .divide-y > * + * { border-top-color: #eee !important; }
                }
            `}} />

            <div className="w-full max-w-3xl bg-white sm:border border-gray-200 sm:shadow-lg sm:rounded-2xl p-6 sm:p-10 mb-20 print:m-0 print:shadow-none print:border-none">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-gray-100 pb-6 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 flex items-center justify-center">
                            <img src={logo} alt="City Cycling Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-gray-900">City Cycling</h1>
                            <p className="text-xs font-bold text-gray-400 tracking-widest uppercase">Premium Rentals</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Receipt</h2>
                        <div className="font-mono text-xl font-bold bg-gray-50 px-3 py-1 rounded inline-block border border-gray-100">{order.orderId}</div>
                    </div>
                </div>

                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <h3 className="text-[10px] font-black tracking-widest text-gray-400 uppercase mb-2">Billed To</h3>
                        <p className="font-bold text-lg">{order.customer?.name}</p>
                        <p className="text-gray-500 text-sm mt-1">{order.customer?.phone}</p>
                        {order.customer?.email && <p className="text-gray-500 text-sm">{order.customer?.email}</p>}
                    </div>
                    <div className="text-right">
                        <h3 className="text-[10px] font-black tracking-widest text-gray-400 uppercase mb-2">Order Details</h3>
                        {order.createdAt && <p className="text-sm font-medium text-gray-600">Date: <strong className="text-gray-900">{formatDate(order.createdAt)}</strong></p>}
                    </div>
                </div>

                {/* Bookings Table */}
                <div className="mb-8 border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                            <tr>
                                <th className="p-4 border-b border-gray-200">Item Details</th>
                                <th className="p-4 border-b border-gray-200">Duration</th>
                                <th className="p-4 border-b border-gray-200">Rate</th>
                                <th className="p-4 border-b border-gray-200 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {order.bookings?.map((booking, idx) => (
                                <tr key={idx} className="bg-white">
                                    <td className="p-4">
                                        <p className="font-bold text-gray-900">
                                            {booking.product?.name ? `${booking.product.name} (Size ${booking.product.size})` : (booking.name || booking.productCode)}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">Qty: {booking.quantity}</p>
                                    </td>
                                    <td className="p-4">
                                        <p className="font-medium text-gray-800">{formatDate(booking.startDate)} → {formatDate(booking.endDate)}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {calculateDuration(booking.startDate, booking.endDate, booking.rentalType, order.allowPartialRates !== false)}
                                        </p>
                                    </td>
                                    <td className="p-4 text-gray-800">
                                        <div className="flex flex-col">
                                            <span className="font-medium">{formatCurrency(booking.appliedRate)}<span className="text-xs text-gray-400">/{booking.rentalType === 'Daily' ? 'day' : booking.rentalType === 'Weekly' ? 'wk' : 'mo'}</span></span>
                                            {(() => {
                                                const s = new Date(booking.startDate);
                                                const e = new Date(booking.endDate);
                                                s.setHours(0,0,0,0);
                                                e.setHours(0,0,0,0);
                                                const actualDiffDays = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
                                                
                                                if (order.allowPartialRates !== false && booking.rentalType === 'Weekly' && (actualDiffDays % 7 > 0)) {
                                                    const extraDays = actualDiffDays % 7;
                                                    const extraRate = booking.weeklyExtraRates?.[`day${extraDays}`] || 0;
                                                    return (
                                                        <span className="text-[10px] text-gray-400 leading-none mt-1">
                                                            + {formatCurrency(extraRate)} / {extraDays} Extra Days
                                                        </span>
                                                    );
                                                }
                                                if (order.allowPartialRates !== false && booking.rentalType === 'Monthly' && (actualDiffDays % 30 > 0)) {
                                                    const extraDays = actualDiffDays % 30;
                                                    const extraRate = Math.ceil(((booking.appliedRate / 30) * extraDays) / 50) * 50;
                                                    return (
                                                        <span className="text-[10px] text-gray-400 leading-none mt-1">
                                                            + {formatCurrency(extraRate)} / {extraDays} Extra Days
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    </td>
                                    <td className="p-4 font-bold text-gray-900 text-right">
                                        {(() => {
                                            const s = new Date(booking.startDate);
                                            const e = new Date(booking.endDate);
                                            s.setHours(0,0,0,0);
                                            e.setHours(0,0,0,0);
                                            const actualDiffDays = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
                                            const qty = Number(booking.quantity) || 1;
                                            
                                            let basePrice = 0;
                                            if (booking.rentalType === 'Weekly') {
                                                if (order.allowPartialRates !== false) {
                                                    const weeks = Math.floor(actualDiffDays / 7);
                                                    const extraDays = actualDiffDays % 7;
                                                    const extraRate = booking.weeklyExtraRates?.[`day${extraDays}`] || 0;
                                                    basePrice = (weeks * booking.appliedRate) + extraRate;
                                                } else {
                                                    basePrice = Math.ceil(actualDiffDays / 7) * booking.appliedRate;
                                                }
                                            } else if (booking.rentalType === 'Monthly') {
                                                if (order.allowPartialRates !== false) {
                                                    const months = Math.floor(actualDiffDays / 30);
                                                    const extraDays = actualDiffDays % 30;
                                                    const extraRate = Math.ceil(((booking.appliedRate / 30) * extraDays) / 50) * 50;
                                                    basePrice = (months * booking.appliedRate) + extraRate;
                                                } else {
                                                    basePrice = Math.ceil(actualDiffDays / 30) * booking.appliedRate;
                                                }
                                            } else {
                                                basePrice = actualDiffDays * booking.appliedRate;
                                            }
                                            
                                            return formatCurrency(booking.totalPrice || (basePrice * qty));
                                        })()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Extra Notes / Logistics details */}
                    <div className="space-y-4">
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <h3 className="text-[10px] font-black tracking-widest text-gray-400 uppercase mb-3">Logistics Info</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Outward ({order.logistics?.delivery?.type || 'Self-Pickup'})</span>
                                    <span className="font-bold">{formatCurrency(order.logistics?.delivery?.charges)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Inward ({order.logistics?.return?.type || 'Self-Drop'})</span>
                                    <span className="font-bold">{formatCurrency(order.logistics?.return?.charges)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm items-center pb-2 border-b border-gray-100">
                            <span className="text-gray-500 font-medium">Rental Subtotal</span>
                            <span className="font-bold text-gray-900">{formatCurrency(order.financials?.totalRental)}</span>
                        </div>
                        <div className="flex justify-between text-sm items-center pb-2 border-b border-gray-100">
                            <span className="text-gray-500 font-medium">Transportation</span>
                            <span className="font-bold text-gray-900">{formatCurrency(order.financials?.totalLogistics)}</span>
                        </div>
                        <div className="flex justify-between text-sm items-center pb-2 border-b border-gray-100">
                            <span className="text-gray-500 font-medium flex items-center gap-1">Refundable Security</span>
                            <span className="font-bold text-gray-900">{formatCurrency(order.financials?.totalDeposit)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2">
                            <span className="text-lg font-black text-gray-900 uppercase">Grand Total</span>
                            <span className="text-2xl font-black text-blue-600">{formatCurrency(order.financials?.grandTotal)}</span>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4 mt-2 border border-gray-100">
                            <div className="flex justify-between text-sm items-center mb-1">
                                <span className="text-gray-500">Paid Till Now</span>
                                <span className="font-bold text-emerald-600">{formatCurrency(totalPaid)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                                <span className="font-bold text-gray-900">Balance Due</span>
                                <span className={`font-black ${balanceDue > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                    {formatCurrency(balanceDue)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-12 pt-6 border-t border-gray-100 text-center space-y-2">
                    <p className="text-xs font-bold text-gray-400">Thank you for choosing CityCycling.</p>
                </div>
            </div>
        </div>
    );
};

export default OrderReceipt;
