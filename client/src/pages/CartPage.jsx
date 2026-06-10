import React, { useState, useContext, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';
import { orderService } from '../services/orderService';
import authService from '../services/authService';
import { productService } from '../services/productService';
import API from '../api/axiosConfig';
import {
    Trash2,
    CalendarDays,
    Truck,
    MapPin,
    ShieldCheck,
    Loader2,
    CheckCircle2,
    Copy,
    ArrowRight,
    Info,
    AlertCircle,
    ShoppingCart,
    Bike,
    Clock
} from 'lucide-react';

const CartPage = () => {
    const { user } = useContext(AuthContext);
    const { cart, cartCount, loading: cartLoading, removeFromCart, clearCart, refreshCart, updateQuantity, addToCart } = useContext(CartContext);
    const navigate = useNavigate();

    // ── Cross-sell accessories ──
    const [accessories, setAccessories] = useState([]);
    const [addingAccessoryId, setAddingAccessoryId] = useState(null);
    const [accessorySuccessId, setAccessorySuccessId] = useState(null);
    const [accessoryError, setAccessoryError] = useState('');

    // ── Form State ──
    const [deliveryType, setDeliveryType] = useState('Self-Pickup');
    const [returnType, setReturnType] = useState('Self-Drop');
    const [deliveryCost, setDeliveryCost] = useState(0);
    const [returnCost, setReturnCost] = useState(0);

    // Customer Info
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [customerPincode, setCustomerPincode] = useState('');

    // ── UI State ──
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [orderResult, setOrderResult] = useState(null);
    const [shippingLookup, setShippingLookup] = useState(null);
    const [shippingError, setShippingError] = useState('');
    const [copied, setCopied] = useState(false);

    // ── Fetch user profile for customer info ──
    useEffect(() => {
        if (user) {
            authService.getProfile().then(data => {
                if (data.profile) {
                    setCustomerName(data.profile.name || user.name || '');
                    setCustomerPhone(data.profile.phone || '');

                    if (data.profile.address) {
                        const addrParts = [];
                        if (data.profile.address.street) addrParts.push(data.profile.address.street);
                        if (data.profile.address.area) addrParts.push(data.profile.address.area);
                        if (data.profile.address.city) addrParts.push(data.profile.address.city);
                        setCustomerAddress(addrParts.join(', '));
                        setCustomerPincode(data.profile.address.pincode || '');
                    }
                }
            }).catch(() => { });
        } else {
            navigate('/login?redirect=/cart');
        }

        // Refresh cart on mount to ensure availability check is up to date
        refreshCart();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Fetch accessories if a cycle is in the cart
    useEffect(() => {
        const hasCycle = cart.items?.some(item => item.product?.category?.toLowerCase() === 'cycle');
        if (hasCycle) {
            const fetchAccessories = async () => {
                try {
                    const allProducts = await productService.getAll();
                    // Filter out accessories that are already in the cart
                    const inCartIds = new Set(cart.items.map(item => item.product?._id));
                    const filtered = allProducts.filter(
                        p => p.category?.toLowerCase() === 'accessory' && !inCartIds.has(p._id)
                    );
                    setAccessories(filtered);
                } catch (err) {
                    console.error("Failed to fetch accessories:", err);
                }
            };
            fetchAccessories();
        } else {
            setAccessories([]);
        }
    }, [cart.items]);

    const handleAddAccessory = async (accessory) => {
        const firstCycle = cart.items?.find(item => item.product?.category?.toLowerCase() === 'cycle');
        if (!firstCycle) {
            setAccessoryError('Renting an accessory requires a cycle in the cart first.');
            return;
        }

        setAddingAccessoryId(accessory._id);
        setAccessoryError('');
        setAccessorySuccessId(null);

        const result = await addToCart(accessory._id, 1, firstCycle.startDate, firstCycle.endDate);
        if (result.success) {
            setAccessorySuccessId(accessory._id);
            setTimeout(() => setAccessorySuccessId(null), 3000);
        } else {
            setAccessoryError(result.message || 'Failed to add accessory.');
        }
        setAddingAccessoryId(null);
    };

    const getImageUrl = (imageName) => {
        return new URL(`/src/assets/${imageName}`, import.meta.url).href;
    };

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
        } else if (customerPincode.length !== 6) {
            setShippingLookup(null);
            if (deliveryType === 'Home-Delivery') setDeliveryCost(0);
            if (returnType === 'Home-Collection') setReturnCost(0);
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

    // ── Cart Calculations ──
    const { totalRental, totalDeposit, hasAvailabilityIssues } = useMemo(() => {
        let rental = 0;
        let deposit = 0;
        let hasIssue = false;

        cart.items?.forEach(item => {
            rental += item.totalRental;
            if (item.product?.securityDeposit) {
                deposit += item.product.securityDeposit;
            }
            if (!item.isAvailable) hasIssue = true;
        });

        return { totalRental: rental, totalDeposit: deposit, hasAvailabilityIssues: hasIssue };
    }, [cart.items]);

    // ── Format date for display ──
    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    // ── Handle submit ──
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;

        setIsSubmitting(true);
        setSubmitError('');

        try {
            // Validate form
            if (!customerName || !customerPhone || !customerAddress) {
                throw new Error("Please fill in all customer details.");
            }

            const customerData = {
                name: customerName,
                email: user.email,
                phone: customerPhone,
                address: customerAddress,
                pincode: customerPincode
            };

            const bookingData = cart.items.map(item => ({
                product: item.product._id,
                productCode: item.product.productCode,
                quantity: item.quantity || 1,
                startDate: new Date(item.startDate).toISOString(),
                endDate: new Date(item.endDate).toISOString(),
                rentalType: item.rentalType,
                appliedRate: item.appliedRate,
                securityDeposit: item.product.securityDeposit,
                totalPrice: item.totalRental,
                isLastDayAvailable: true
            }));

            // Use the earliest start date and latest end date for logistics scheduled dates 
            // as an approximation, or default to now if cart is empty.
            let earliestStart = new Date();
            let latestEnd = new Date();
            if (cart.items.length > 0) {
                earliestStart = new Date(Math.min(...cart.items.map(i => new Date(i.startDate))));
                latestEnd = new Date(Math.max(...cart.items.map(i => new Date(i.endDate))));
            }

            const logisticsData = {
                delivery: {
                    type: deliveryType,
                    charges: deliveryCost,
                    scheduledDate: earliestStart.toISOString()
                },
                return: {
                    type: returnType,
                    charges: returnCost,
                    scheduledDate: latestEnd.toISOString()
                }
            };

            const result = await orderService.create({
                customer: customerData,
                bookings: bookingData,
                logistics: logisticsData,
                allowPartialRates: false
            });

            setOrderResult(result.order || result);
            // Clear cart on success
            await clearCart();
        } catch (err) {
            setSubmitError(err.response?.data?.message || err.message || 'Failed to place order. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Copy UPI ID ──
    const copyUPI = () => {
        navigator.clipboard.writeText('citycycling.in-3.@okicici');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (cartLoading && !cart.items?.length) {
        return (
            <div className="container mx-auto px-4 py-20 flex justify-center items-center">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    // ─── CONFIRMATION SCREEN ─────────────────────────────────
    if (orderResult) {
        return (
            <div className="container mx-auto px-4 py-12 max-w-2xl text-left">
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_30px_80px_rgba(0,0,0,0.06)] p-8 md:p-10 space-y-8">
                    {/* Success Header */}
                    <div className="text-center space-y-3">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 size={32} className="text-emerald-500" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Order Placed!</h3>
                        <p className="text-gray-500 font-medium text-sm">
                            Order <span className="font-mono font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{orderResult.orderId}</span> has been created.
                        </p>
                    </div>

                    {/* Status Note */}
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-start gap-3">
                        <Info size={18} className="text-blue-600 mt-0.5 shrink-0" />
                        <div className="text-sm text-blue-900">
                            <p className="font-bold mb-1">What happens next?</p>
                            <p className="text-blue-800/70 font-medium">Our team will call you to confirm availability and finalise your booking. Your order is currently <span className="font-bold border-b border-blue-300">On-Hold</span>.</p>
                        </div>
                    </div>

                    {/* Payment Details / Deposit Education Reminder */}
                    <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <ShieldCheck size={20} className="text-orange-600" />
                            <h4 className="font-black text-orange-900 text-sm uppercase tracking-tight">Security Deposit</h4>
                        </div>

                        <div className="text-sm text-orange-800/80 font-medium mb-2 border-l-2 border-orange-300 pl-3">
                            <p className="mb-1"><strong>Remember:</strong> This is a fully refundable deposit.</p>
                            <p>Your rental charges will be deducted from this amount at the end of the rental period. The balance will be refunded upon return.</p>
                        </div>

                        <p className="text-3xl font-black text-gray-900">₹{orderResult.financials?.totalDeposit || totalDeposit}</p>
                        <p className="text-sm text-orange-800/70 font-medium">Pay the security deposit upfront to confirm your booking:</p>

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
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gpay/PhonePe</p>
                            <div className="text-sm text-gray-700 font-medium space-y-1">
                                <p><span className="text-gray-400">A/C:</span> <span className="font-bold text-gray-900">8971552453</span></p>
                            </div>
                        </div>
                    </div>

                    {/* CTA */}
                    <button
                        onClick={() => navigate('/my-orders')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black transition-all hover:-translate-y-1 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                    >
                        View My Orders <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        );
    }

    // ─── EMPTY CART ──────────────────────────────────────────
    if (cartCount === 0) {
        return (
            <div className="container mx-auto px-4 py-16 max-w-4xl text-left">
                <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight mb-8">Your Cart</h1>

                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_30px_80px_rgba(0,0,0,0.06)] p-12 text-center flex flex-col items-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-6">
                        <ShoppingCart size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 uppercase mb-3">Cart is Empty</h2>
                    <p className="text-gray-500 font-medium mb-8 max-w-sm">
                        You have no cycles in your cart. Head over to our catalogue to find your perfect ride!
                    </p>
                    <Link
                        to="/catalogue"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black transition-all hover:-translate-y-1 shadow-lg shadow-blue-600/20"
                    >
                        Browse Catalogue
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-12 max-w-6xl text-left">
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 uppercase tracking-tight mb-8 flex items-center gap-3">
                <ShoppingCart size={32} className="text-blue-600" /> Your Cart
            </h1>

            <div className="flex flex-col lg:flex-row gap-8">

                {/* ── LEFT COLUMN: Cart Items + Customer Form ── */}
                <div className="w-full lg:w-2/3 space-y-8">

                    {/* Items List */}
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_30px_80px_rgba(0,0,0,0.06)] p-8">
                        <h2 className="text-xl font-black text-gray-900 border-b border-gray-100 pb-4 mb-6 uppercase">Bookings ({cartCount})</h2>

                        <div className="space-y-6">
                            {cart.items.map((item) => (
                                <div key={item._id} className="flex flex-col sm:flex-row gap-5 p-5 bg-gray-50 rounded-2xl border border-gray-100 relative">
                                    <button
                                        onClick={() => removeFromCart(item._id)}
                                        className="absolute top-4 right-4 text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors"
                                        title="Remove item"
                                    >
                                        <Trash2 size={18} />
                                    </button>

                                    <div className="w-full sm:w-32 h-24 bg-white rounded-xl border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                                        {item.product.imageUrl ? (
                                            <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Bike className="text-gray-300" size={32} />
                                        )}
                                    </div>

                                    <div className="flex-1 pr-8">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="bg-blue-100 text-blue-800 text-[10px] uppercase font-black px-2 py-0.5 rounded-md tracking-wider">
                                                {item.product.category}
                                            </span>
                                        </div>
                                        <h3 className="font-black text-gray-900 text-lg mb-2">{item.product.name}</h3>

                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-gray-600 font-medium">
                                            <div className="flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-1.5 rounded-lg text-xs md:text-sm">
                                                <CalendarDays size={14} className="text-blue-500" />
                                                {formatDate(item.startDate)} → {formatDate(item.endDate)}
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-lg text-xs md:text-sm">
                                                <Clock size={14} className="text-gray-500" />
                                                {item.rentalLabel}
                                            </div>
                                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
                                                <button
                                                    type="button"
                                                    onClick={() => updateQuantity(item._id, Math.max(1, (item.quantity || 1) - 1))}
                                                    className="w-6 h-6 flex items-center justify-center rounded bg-gray-50 hover:bg-gray-100 text-gray-600"
                                                >-</button>
                                                <span className="text-xs font-bold w-4 text-center">{item.quantity || 1}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => updateQuantity(item._id, (item.quantity || 1) + 1)}
                                                    className="w-6 h-6 flex items-center justify-center rounded bg-gray-50 hover:bg-gray-100 text-gray-600"
                                                >+</button>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex flex-col sm:flex-row justify-between sm:items-end w-full gap-3">
                                            {item.isAvailable ? (
                                                <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-lg inline-flex max-w-max border border-emerald-100">
                                                    <CheckCircle2 size={14} /> Available
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-red-600 font-bold text-xs bg-red-50 px-3 py-1.5 rounded-lg inline-flex max-w-max border border-red-100">
                                                    <AlertCircle size={14} /> Not Available on {formatDate(item.unavailableDate)}
                                                </div>
                                            )}

                                            <div className="text-right">
                                                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-0.5">Rental</div>
                                                <div className="text-xl font-black text-gray-900">₹{item.totalRental}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Cross-Sell Accessories */}
                    {accessories.length > 0 && (
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_30px_80px_rgba(0,0,0,0.06)] p-8">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-gray-100 pb-4">
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 uppercase">Enhance Your Booking</h2>
                                    <p className="text-gray-400 text-xs font-bold mt-1">Recommended accessories for your rented cycles (auto-matched rental dates)</p>
                                </div>
                                {accessoryError && (
                                    <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
                                        <AlertCircle size={14} /> {accessoryError}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {accessories.map(accessory => {
                                    const hasSuccess = accessorySuccessId === accessory._id;
                                    const isAdding = addingAccessoryId === accessory._id;

                                    return (
                                        <div key={accessory._id} className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 items-center">
                                            <div className="w-20 h-20 bg-white rounded-xl border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                                                {accessory.imageUrls?.[0] ? (
                                                    <img src={getImageUrl(accessory.imageUrls[0])} alt={accessory.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Bike className="text-gray-300" size={24} />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-black text-gray-900 text-sm truncate uppercase tracking-tight">{accessory.name}</h3>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">₹{accessory.dailyRate}/day</p>
                                                
                                                <button
                                                    onClick={() => handleAddAccessory(accessory)}
                                                    disabled={isAdding}
                                                    className={`mt-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                                        hasSuccess
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:-translate-y-0.5'
                                                    }`}
                                                >
                                                    {isAdding ? (
                                                        <>Adding...</>
                                                    ) : hasSuccess ? (
                                                        <><CheckCircle2 size={12} /> Added</>
                                                    ) : (
                                                        <>Add to Cart</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Customer Details Form */}
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_30px_80px_rgba(0,0,0,0.06)] p-8">
                        <h2 className="text-xl font-black text-gray-900 border-b border-gray-100 pb-4 mb-6 uppercase flex items-center gap-2">
                            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">1</span> Customer Details
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Phone Number *</label>
                                <input
                                    type="tel"
                                    required
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Address *</label>
                                <textarea
                                    required
                                    rows="2"
                                    value={customerAddress}
                                    onChange={(e) => setCustomerAddress(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Logistics selector */}
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_30px_80px_rgba(0,0,0,0.06)] p-8">
                        <h2 className="text-xl font-black text-gray-900 border-b border-gray-100 pb-4 mb-6 uppercase flex items-center gap-2">
                            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">2</span> Delivery & Return
                        </h2>

                        <div className="space-y-6">
                            {/* Delivery Type */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">How should we get the cycles to you?</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setDeliveryType('Self-Pickup')}
                                        className={`p-4 rounded-xl border-2 text-center transition-all flex flex-col items-center gap-2 ${deliveryType === 'Self-Pickup'
                                            ? 'border-blue-500 bg-blue-50/50 text-blue-900'
                                            : 'border-gray-100 text-gray-500 hover:border-gray-200'
                                            }`}
                                    >
                                        <div className="font-bold text-sm">Self Pickup</div>
                                        <div className="text-[10px] font-black text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded border border-emerald-100">FREE</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDeliveryType('Home-Delivery')}
                                        className={`p-4 rounded-xl border-2 text-center transition-all flex flex-col items-center gap-2 ${deliveryType === 'Home-Delivery'
                                            ? 'border-blue-500 bg-blue-50/50 text-blue-900'
                                            : 'border-gray-100 text-gray-500 hover:border-gray-200'
                                            }`}
                                    >
                                        <div className="font-bold text-sm">Home Delivery</div>
                                        {deliveryCost > 0 && <div className="text-[10px] font-black text-gray-600 uppercase tracking-wider bg-gray-100 px-2 py-1 rounded">₹{deliveryCost}</div>}
                                    </button>
                                </div>
                            </div>

                            {/* Return Type */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">How will you return the cycles?</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setReturnType('Self-Drop')}
                                        className={`p-4 rounded-xl border-2 text-center transition-all flex flex-col items-center gap-2 ${returnType === 'Self-Drop'
                                            ? 'border-blue-500 bg-blue-50/50 text-blue-900'
                                            : 'border-gray-100 text-gray-500 hover:border-gray-200'
                                            }`}
                                    >
                                        <div className="font-bold text-sm">Self Drop</div>
                                        <div className="text-[10px] font-black text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded border border-emerald-100">FREE</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setReturnType('Home-Collection')}
                                        className={`p-4 rounded-xl border-2 text-center transition-all flex flex-col items-center gap-2 ${returnType === 'Home-Collection'
                                            ? 'border-blue-500 bg-blue-50/50 text-blue-900'
                                            : 'border-gray-100 text-gray-500 hover:border-gray-200'
                                            }`}
                                    >
                                        <div className="font-bold text-sm">Home Collection</div>
                                        {returnCost > 0 && <div className="text-[10px] font-black text-gray-600 uppercase tracking-wider bg-gray-100 px-2 py-1 rounded">₹{returnCost}</div>}
                                    </button>
                                </div>
                            </div>

                            {/* Pincode Input */}
                            {(deliveryType === 'Home-Delivery' || returnType === 'Home-Collection') && (
                                <div className="pt-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Delivery Pincode *</label>
                                    <div className="relative">
                                        <MapPin size={18} className="absolute left-4 top-3.5 text-blue-500" />
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={6}
                                            placeholder="Enter 6-digit Pincode"
                                            value={customerPincode}
                                            onChange={(e) => setCustomerPincode(e.target.value.replace(/\D/g, ''))}
                                            className="w-full pl-12 pr-4 py-3 bg-blue-50/30 border border-blue-200 rounded-xl text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all shadow-inner"
                                        />
                                    </div>
                                    {shippingError && (
                                        <p className="text-red-600 text-xs font-bold mt-2 flex items-center gap-1">
                                            <AlertCircle size={14} /> {shippingError}
                                        </p>
                                    )}
                                    {shippingLookup && (
                                        <p className="text-emerald-700 text-sm font-bold mt-3 bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-center gap-2">
                                            <CheckCircle2 size={16} /> Delivering to: {shippingLookup.areas}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── RIGHT COLUMN: Order Summary ── */}
                <div className="w-full lg:w-1/3">
                    <div className="sticky top-24 space-y-6">
                        {/* Deposit Summary & Edu - Placed Above to emphasize the process */}
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200 shadow-lg shadow-orange-100/50 rounded-[2rem] p-8">
                            <h2 className="text-lg font-black text-orange-950 flex items-center gap-2 mb-4 uppercase tracking-tight">
                                <ShieldCheck size={22} className="text-orange-500" /> Upfront Payable
                            </h2>

                            <div className="bg-white rounded-xl p-4 border border-orange-100 mb-6 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
                                <h3 className="text-xs font-black text-orange-800 uppercase tracking-widest mb-1 flex items-center gap-1.5 ">
                                    <Info size={12} /> How Deposit Works
                                </h3>
                                <p className="text-[13px] text-gray-600 font-medium leading-relaxed">
                                    This is a fully refundable security deposit. Your rental charges will be deducted from this amount at the end of the rental period.
                                    <br /><br />
                                    <strong>The balance will be refunded</strong> after you return the cycle(s).
                                </p>
                            </div>

                            <div className="flex justify-between items-end border-t border-orange-200/60 pt-5">
                                <div className="text-sm font-bold text-orange-900">Total Deposit</div>
                                <div className="text-3xl font-black text-gray-900">₹{totalDeposit}</div>
                            </div>
                            <div className="text-[10px] text-right text-orange-700/70 font-bold uppercase tracking-wider mt-1">(Payable now)</div>
                        </div>

                        {/* Order Summary */}
                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-[0_30px_80px_rgba(0,0,0,0.06)] p-8">
                            <h2 className="text-lg font-black text-gray-900 border-b border-gray-100 pb-4 mb-5 uppercase tracking-tight">Order Summary</h2>

                            <div className="space-y-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 font-bold">Total Rental</span>
                                    <span className="text-gray-900 font-black text-lg">₹{totalRental}</span>
                                </div>

                                {(deliveryCost + returnCost) > 0 && (
                                    <div className="flex justify-between text-sm items-center pb-2">
                                        <span className="text-gray-500 font-bold flex items-center gap-1.5"><Truck size={14} /> Logistics</span>
                                        <span className="text-gray-900 font-black border border-gray-200 rounded px-2 py-0.5 shadow-sm text-sm">₹{deliveryCost + returnCost}</span>
                                    </div>
                                )}

                                <div className="bg-gray-50 -mx-8 px-8 py-4 border-t border-b border-gray-100 flex justify-between items-center my-2">
                                    <span className="text-gray-900 font-black">Total Expected Cost</span>
                                    <span className="text-2xl font-black text-gray-900">₹{totalRental + deliveryCost + returnCost}</span>
                                </div>
                                <div className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0">
                                    Will be deducted from deposit
                                </div>
                            </div>

                            {/* Submit Error */}
                            {submitError && (
                                <div className="mt-6 bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3">
                                    <AlertCircle size={18} className="text-red-500 shrink-0" />
                                    <p className="text-red-700 text-sm font-medium">{submitError}</p>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                onClick={handleSubmit}
                                disabled={
                                    hasAvailabilityIssues ||
                                    isSubmitting ||
                                    (deliveryType === 'Home-Delivery' && (!shippingLookup || customerPincode.length !== 6)) ||
                                    !customerName || !customerPhone || !customerAddress
                                }
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded-xl font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 hover:-translate-y-1 disabled:hover:translate-y-0 disabled:shadow-none mt-6"
                            >
                                {isSubmitting ? (
                                    <><Loader2 size={20} className="animate-spin" /> Placing Order...</>
                                ) : (
                                    <>Place Order <ArrowRight size={18} /></>
                                )}
                            </button>

                            {hasAvailabilityIssues && (
                                <p className="text-center text-red-500 text-xs font-bold mt-3">
                                    Please remove unavailable items to continue.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartPage;
