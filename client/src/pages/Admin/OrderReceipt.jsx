import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Bike } from 'lucide-react';
import { orderService } from '../../services/orderService';

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

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans sm:p-8 flex items-start justify-center">
            <div className="w-full max-w-3xl bg-white sm:border border-gray-200 sm:shadow-lg sm:rounded-2xl p-6 sm:p-10">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-gray-100 pb-6 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center text-white">
                            <Bike size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-gray-900">CityCycling</h1>
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
                        <p className="text-sm font-medium text-gray-600 mb-1">Status: <strong className="text-gray-900">{order.orderStatus}</strong></p>
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
                                        <p className="font-bold text-gray-900">{booking.name || booking.productCode}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Qty: {booking.quantity}</p>
                                    </td>
                                    <td className="p-4">
                                        <p className="font-medium text-gray-800">{formatDate(booking.startDate)} → {formatDate(booking.endDate)}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {booking.unitsCharged || booking.durationDays} {booking.unitsCharged ? '' : 'Days'} ({booking.rentalType})
                                        </p>
                                    </td>
                                    <td className="p-4 font-medium text-gray-800">
                                        {formatCurrency(booking.appliedRate)}<span className="text-xs text-gray-400">/{booking.rentalType === 'Daily' ? 'day' : booking.rentalType === 'Weekly' ? 'wk' : 'mo'}</span>
                                    </td>
                                    <td className="p-4 font-bold text-gray-900 text-right">
                                        {formatCurrency(booking.totalPrice || (booking.appliedRate * booking.quantity))}
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
