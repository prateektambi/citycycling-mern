import React, { useState, useContext, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { orderService } from '../services/orderService';
import authService from '../services/authService';
import API from '../api/axiosConfig';
import {
    CalendarDays,
    Truck,
    MapPin,
    ShieldCheck,
    Loader2,
    CheckCircle2,
    Copy,
    ArrowRight,
    Info,
    Package,
    Bike,
    AlertCircle
} from 'lucide-react';

// ─── Rate Calculator ───────────────────────────────────────
function calculateRental(totalDays, product) {
    if (totalDays <= 0) return { rentalType: null, appliedRate: 0, totalRental: 0, label: '' };
    if (totalDays === 1) {
        return {
            rentalType: 'Daily',
            appliedRate: product.dailyRate,
            totalRental: product.dailyRate,
            label: '1 day',
            weeks: 0
        };
    }
    const weeks = Math.ceil(totalDays / 7);
    return {
        rentalType: 'Weekly',
        appliedRate: product.weeklyRate,
        totalRental: weeks * product.weeklyRate,
        label: `${weeks} week${weeks > 1 ? 's' : ''} (${totalDays} days)`,
        weeks
    };
}

// ─── Day difference (endDate excluded per system convention) ─
function daysBetween(start, end) {
    const s = new Date(start);
    const e = new Date(end);
    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);
    return Math.round((e - s) / (1000 * 60 * 60 * 24));
}

// ─── Format date to YYYY-MM-DD ─────────────────────────────
function toDateKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Format date for display ────────────────────────────────
function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
}

// ═══════════════════════════════════════════════════════════
// BOOKING FORM COMPONENT
// ═══════════════════════════════════════════════════════════
const BookingForm = ({ product, onDateSelect }) => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    // ── Form State ──
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [deliveryType, setDeliveryType] = useState('Self-Pickup');
    const [returnType, setReturnType] = useState('Self-Drop');
    const [deliveryCost, setDeliveryCost] = useState(0);
    const [returnCost, setReturnCost] = useState(0);
    const [customerPincode, setCustomerPincode] = useState('');

    // ── UI State ──
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [orderResult, setOrderResult] = useState(null); // holds created order
    const [profile, setProfile] = useState(null);
    const [shippingLookup, setShippingLookup] = useState(null);
    const [shippingError, setShippingError] = useState('');
    const [copied, setCopied] = useState(false);

    // ── Fetch user profile for customer info ──
    useEffect(() => {
        if (user) {
            authService.getProfile().then(data => {
                setProfile(data);
                if (data.profile?.address?.pincode) {
                    setCustomerPincode(data.profile.address.pincode);
                }
            }).catch(() => {});
        }
    }, [user]);

    // ── Shipping lookup when pincode changes & delivery type is Home-Delivery ──
    useEffect(() => {
        if (customerPincode.length === 6 && (deliveryType === 'Home-Delivery' || returnType === 'Home-Collection')) {
            setShippingError('');
            API.get(`/api/shipping/lookup/${customerPincode}`)
                .then(res => {
                    setShippingLookup(res.data);
                    if (deliveryType === 'Home-Delivery') setDeliveryCost(res.data.cost);
                    if (returnType === 'Home-Collection') setReturnCost(res.data.cost);
                })
                .catch(() => {
                    setShippingLookup(null);
                    setShippingError('Pincode not in our delivery zone. Please choose Self-Pickup.');
                    if (deliveryType === 'Home-Delivery') setDeliveryCost(0);
                    if (returnType === 'Home-Collection') setReturnCost(0);
                });
        }
    }, [customerPincode, deliveryType, returnType]);

    // ── Handle delivery type changes ──
    useEffect(() => {
        if (deliveryType === 'Self-Pickup') setDeliveryCost(0);
        else if (shippingLookup) setDeliveryCost(shippingLookup.cost);
    }, [deliveryType, shippingLookup]);

    useEffect(() => {
        if (returnType === 'Self-Drop') setReturnCost(0);
        else if (shippingLookup) setReturnCost(shippingLookup.cost);
    }, [returnType, shippingLookup]);

    // ── Rental calculation ──
    const totalDays = useMemo(() => {
        if (!startDate || !endDate) return 0;
        return daysBetween(startDate, endDate);
    }, [startDate, endDate]);

    const rental = useMemo(() => {
        return calculateRental(totalDays, product);
    }, [totalDays, product]);

    // ── Availability check ──
    const availabilityIssue = useMemo(() => {
        if (!startDate || !endDate || totalDays <= 0) return null;
        const avail = product.availability || {};
        for (let i = 0; i < totalDays; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const key = toDateKey(d);
            const stock = avail[key] !== undefined ? avail[key] : 1;
            if (stock <= 0) {
                return `Not available on ${formatDate(d)}`;
            }
        }
        return null;
    }, [startDate, endDate, totalDays, product.availability]);

    // ── Min date (today) ──
    const today = toDateKey(new Date());

    // ── Handle submit ──
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            navigate(`/login?redirect=/product/${product.slug}`);
            return;
        }
        setIsSubmitting(true);
        setSubmitError('');

        try {
            const customerData = {
                name: profile?.profile?.name || user.name || '',
                phone: profile?.profile?.phone || '',
                address: profile?.profile?.address
                    ? `${profile.profile.address.street || ''}, ${profile.profile.address.area || ''}, ${profile.profile.address.city || ''}`
                    : '',
                pincode: customerPincode
            };

            const bookingData = [{
                product: product._id,
                productCode: product.productCode,
                quantity: 1,
                startDate: new Date(startDate).toISOString(),
                endDate: new Date(endDate).toISOString(),
                rentalType: rental.rentalType,
                appliedRate: rental.appliedRate,
                securityDeposit: product.securityDeposit,
                totalPrice: rental.totalRental,
                isLastDayAvailable: true
            }];

            const logisticsData = {
                delivery: {
                    type: deliveryType,
                    charges: deliveryCost,
                    scheduledDate: new Date(startDate).toISOString()
                },
                return: {
                    type: returnType,
                    charges: returnCost,
                    scheduledDate: new Date(endDate).toISOString()
                }
            };

            const result = await orderService.create({
                customer: customerData,
                bookings: bookingData,
                logistics: logisticsData
                // No initialPayment — order starts unpaid in On-Hold
            });

            setOrderResult(result.order || result);
        } catch (err) {
            setSubmitError(err.response?.data?.message || err.message || 'Failed to create booking. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Copy UPI ID ──
    const copyUPI = () => {
        navigator.clipboard.writeText('citycycling@upi');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ─── CONFIRMATION SCREEN ─────────────────────────────────
    if (orderResult) {
        return (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_30px_80px_rgba(0,0,0,0.06)] p-8 md:p-10 space-y-8">
                {/* Success Header */}
                <div className="text-center space-y-3">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 size={32} className="text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Booking Placed!</h3>
                    <p className="text-gray-500 font-medium text-sm">
                        Order <span className="font-mono font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{orderResult.orderId}</span> has been created.
                    </p>
                </div>

                {/* Status Note */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-start gap-3">
                    <Info size={18} className="text-blue-600 mt-0.5 shrink-0" />
                    <div className="text-sm text-blue-900">
                        <p className="font-bold mb-1">What happens next?</p>
                        <p className="text-blue-800/70 font-medium">Our team will call you to confirm availability and finalise your booking. Your order is currently <span className="font-bold">On-Hold</span>.</p>
                    </div>
                </div>

                {/* Payment Details */}
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <ShieldCheck size={20} className="text-orange-600" />
                        <h4 className="font-black text-orange-900 text-sm uppercase tracking-tight">Security Deposit</h4>
                    </div>
                    <p className="text-3xl font-black text-gray-900">₹{orderResult.financials?.totalDeposit || product.securityDeposit}</p>
                    <p className="text-sm text-orange-800/70 font-medium">Pay the refundable security deposit to confirm your booking:</p>

                    {/* UPI */}
                    <div className="bg-white rounded-xl p-4 border border-orange-100 space-y-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">UPI ID</p>
                        <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-gray-900 text-lg">citycycling@upi</span>
                            <button onClick={copyUPI} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Copy">
                                {copied ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} className="text-gray-400" />}
                            </button>
                        </div>
                    </div>

                    {/* Bank Details */}
                    <div className="bg-white rounded-xl p-4 border border-orange-100 space-y-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bank Transfer</p>
                        <div className="text-sm text-gray-700 font-medium space-y-1">
                            <p><span className="text-gray-400">A/C:</span> <span className="font-bold text-gray-900">1234567890</span></p>
                            <p><span className="text-gray-400">IFSC:</span> <span className="font-bold text-gray-900">SBIN0001234</span></p>
                            <p><span className="text-gray-400">Name:</span> <span className="font-bold text-gray-900">City Cycling</span></p>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <button
                    onClick={() => navigate('/my-orders')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black transition-all hover:scale-[1.02] flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                >
                    View My Orders <ArrowRight size={18} />
                </button>
            </div>
        );
    }

    // ─── NOT LOGGED IN ───────────────────────────────────────
    if (!user) {
        return (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_30px_80px_rgba(0,0,0,0.06)] p-8 md:p-10 text-center space-y-6">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto text-blue-600">
                    <Bike size={28} />
                </div>
                <div>
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">Ready to Ride?</h3>
                    <p className="text-gray-500 font-medium text-sm">Login to book this cycle and hit the road.</p>
                </div>
                <button
                    onClick={() => navigate(`/login?redirect=/product/${product.slug}`)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black transition-all hover:scale-[1.02] flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                >
                    Login to Book <ArrowRight size={18} />
                </button>
            </div>
        );
    }

    // ─── BOOKING FORM ────────────────────────────────────────
    return (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_30px_80px_rgba(0,0,0,0.06)] p-8 md:p-10">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                    <CalendarDays size={20} />
                </div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Book This Cycle</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* ── Date Selection ── */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Start Date</label>
                        <input
                            type="date"
                            required
                            min={today}
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                if (endDate && e.target.value >= endDate) setEndDate('');
                                if (onDateSelect) onDateSelect(e.target.value, endDate);
                            }}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">End Date</label>
                        <input
                            type="date"
                            required
                            min={startDate || today}
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                if (onDateSelect) onDateSelect(startDate, e.target.value);
                            }}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        />
                    </div>
                </div>

                {/* ── Availability Warning ── */}
                {availabilityIssue && (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3">
                        <AlertCircle size={18} className="text-red-500 shrink-0" />
                        <p className="text-red-700 text-sm font-medium">{availabilityIssue}</p>
                    </div>
                )}

                {/* ── Rental Summary (appears after dates selected) ── */}
                {totalDays > 0 && !availabilityIssue && (
                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 font-medium">Duration</span>
                            <span className="text-sm font-black text-gray-900">{rental.label}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 font-medium">
                                {rental.rentalType === 'Daily' ? 'Daily Rate' : `Weekly Rate × ${rental.weeks}`}
                            </span>
                            <span className="text-sm font-black text-gray-900">₹{rental.totalRental}</span>
                        </div>
                    </div>
                )}

                {/* ── Logistics ── */}
                {totalDays > 0 && !availabilityIssue && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Truck size={16} className="text-gray-400" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Delivery & Return</span>
                        </div>

                        {/* Delivery Type */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setDeliveryType('Self-Pickup')}
                                className={`p-3 rounded-xl border-2 text-center transition-all text-sm font-bold ${
                                    deliveryType === 'Self-Pickup'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-100 text-gray-500 hover:border-gray-200'
                                }`}
                            >
                                Self Pickup
                                <span className="block text-[10px] font-bold text-emerald-600 mt-0.5">FREE</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeliveryType('Home-Delivery')}
                                className={`p-3 rounded-xl border-2 text-center transition-all text-sm font-bold ${
                                    deliveryType === 'Home-Delivery'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-100 text-gray-500 hover:border-gray-200'
                                }`}
                            >
                                Home Delivery
                                {deliveryCost > 0 && <span className="block text-[10px] font-bold text-gray-500 mt-0.5">₹{deliveryCost}</span>}
                            </button>
                        </div>

                        {/* Return Type */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setReturnType('Self-Drop')}
                                className={`p-3 rounded-xl border-2 text-center transition-all text-sm font-bold ${
                                    returnType === 'Self-Drop'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-100 text-gray-500 hover:border-gray-200'
                                }`}
                            >
                                Self Drop
                                <span className="block text-[10px] font-bold text-emerald-600 mt-0.5">FREE</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setReturnType('Home-Collection')}
                                className={`p-3 rounded-xl border-2 text-center transition-all text-sm font-bold ${
                                    returnType === 'Home-Collection'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-100 text-gray-500 hover:border-gray-200'
                                }`}
                            >
                                Home Collection
                                {returnCost > 0 && <span className="block text-[10px] font-bold text-gray-500 mt-0.5">₹{returnCost}</span>}
                            </button>
                        </div>

                        {/* Pincode input for home delivery */}
                        {(deliveryType === 'Home-Delivery' || returnType === 'Home-Collection') && (
                            <div>
                                <div className="relative">
                                    <MapPin size={16} className="absolute left-4 top-3.5 text-gray-400" />
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        placeholder="Your 6-digit pincode"
                                        value={customerPincode}
                                        onChange={(e) => setCustomerPincode(e.target.value.replace(/\D/g, ''))}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    />
                                </div>
                                {shippingError && (
                                    <p className="text-red-600 text-xs font-medium mt-2 flex items-center gap-1">
                                        <AlertCircle size={12} /> {shippingError}
                                    </p>
                                )}
                                {shippingLookup && (
                                    <p className="text-emerald-600 text-xs font-medium mt-2">
                                        ✓ {shippingLookup.areas} — ₹{shippingLookup.cost} per trip
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Order Summary ── */}
                {totalDays > 0 && !availabilityIssue && (
                    <div className="border-t border-gray-100 pt-6 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 font-medium">Rental</span>
                            <span className="text-gray-900 font-bold">₹{rental.totalRental}</span>
                        </div>
                        {(deliveryCost + returnCost) > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500 font-medium">Logistics</span>
                                <span className="text-gray-900 font-bold">₹{deliveryCost + returnCost}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 font-medium">Security Deposit <span className="text-[10px] text-gray-400">(refundable)</span></span>
                            <span className="text-gray-900 font-bold">₹{product.securityDeposit}</span>
                        </div>
                        <div className="border-t border-gray-100 pt-3 flex justify-between">
                            <span className="text-gray-900 font-black">Total</span>
                            <span className="text-xl font-black text-gray-900">₹{rental.totalRental + deliveryCost + returnCost + product.securityDeposit}</span>
                        </div>
                    </div>
                )}

                {/* ── Submit Error ── */}
                {submitError && (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3">
                        <AlertCircle size={18} className="text-red-500 shrink-0" />
                        <p className="text-red-700 text-sm font-medium">{submitError}</p>
                    </div>
                )}

                {/* ── Submit Button ── */}
                <button
                    type="submit"
                    disabled={!startDate || !endDate || totalDays <= 0 || !!availabilityIssue || isSubmitting || (deliveryType === 'Home-Delivery' && !shippingLookup)}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-black transition-all hover:scale-[1.02] disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:shadow-none"
                >
                    {isSubmitting ? (
                        <><Loader2 size={20} className="animate-spin" /> Placing Order...</>
                    ) : (
                        <>Book Now <ArrowRight size={18} /></>
                    )}
                </button>

                <p className="text-center text-[10px] text-gray-400 font-medium">
                    No payment required now. Pay security deposit after confirmation.
                </p>
            </form>
        </div>
    );
};

export default BookingForm;
