import React, { useState, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';
import {
    CalendarDays,
    Loader2,
    CheckCircle2,
    ArrowRight,
    Bike,
    AlertCircle,
    ShoppingCart
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
// ADD TO CART FORM COMPONENT
// ═══════════════════════════════════════════════════════════
const BookingForm = ({ product, onDateSelect }) => {
    const { user } = useContext(AuthContext);
    const { addToCart } = useContext(CartContext);
    const navigate = useNavigate();

    // ── Form State ──
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // ── UI State ──
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [addedToCart, setAddedToCart] = useState(false);

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

        const result = await addToCart(product._id, startDate, endDate);
        if (result.success) {
            setAddedToCart(true);
        } else {
            setSubmitError(result.message);
        }
        setIsSubmitting(false);
    };

    // ─── SUCCESS SCREEN ──────────────────────────────────────
    if (addedToCart) {
        return (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_30px_80px_rgba(0,0,0,0.06)] p-8 md:p-10 space-y-6 text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 size={32} className="text-emerald-500" />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-2">Added to Cart!</h3>
                    <p className="text-gray-500 font-medium text-sm">
                        {product.name} has been added to your cart.
                    </p>
                </div>
                
                <div className="space-y-3 pt-4">
                    <button
                        onClick={() => navigate('/cart')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 hover:-translate-y-1"
                    >
                        View Cart <ShoppingCart size={18} />
                    </button>
                    <button
                        onClick={() => setAddedToCart(false)}
                        className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 py-3.5 rounded-2xl font-bold transition-all text-sm"
                    >
                        Continue Shopping
                    </button>
                </div>
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
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 hover:-translate-y-1"
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
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Select Dates</h3>
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

                {/* ── Rental Summary ── */}
                {totalDays > 0 && !availabilityIssue && (
                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 font-medium">Duration</span>
                            <span className="text-sm font-black text-gray-900">{rental.label}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-blue-100/50 pt-3">
                            <span className="text-sm text-gray-600 font-medium">
                                Rental Amount
                            </span>
                            <span className="text-lg font-black text-gray-900">₹{rental.totalRental}</span>
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
                    disabled={!startDate || !endDate || totalDays <= 0 || !!availabilityIssue || isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 hover:-translate-y-1 disabled:hover:translate-y-0 disabled:shadow-none"
                >
                    {isSubmitting ? (
                        <><Loader2 size={20} className="animate-spin" /> Adding...</>
                    ) : (
                        <>Add to Cart <ShoppingCart size={18} /></>
                    )}
                </button>
            </form>
        </div>
    );
};

export default BookingForm;
