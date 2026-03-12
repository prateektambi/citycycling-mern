import React, { useEffect, useState } from 'react';
import { Search, Calendar, ShoppingBag, ShieldCheck, Truck, ArrowRight, Phone, MessageCircle, FileText, CreditCard, Store, Clock, MapPin, Package, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import API from '../api/axiosConfig';

const HowItWorks = () => {
    useEffect(() => {
        document.title = 'City Cycling | How It Works';
        window.scrollTo(0, 0);
    }, []);

    // Pincode lookup state
    const [pincode, setPincode] = useState('');
    const [lookupResult, setLookupResult] = useState(null); // { areas, slab, cost, pincode } or null
    const [lookupError, setLookupError] = useState('');
    const [isLooking, setIsLooking] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const slabConfig = {
        "0–5 km":   { color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "Nearby" },
        "5–10 km":  { color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500", label: "Close" },
        "10–15 km": { color: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500", label: "Moderate" },
        "15–25 km": { color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", label: "Far" },
        "25–35 km": { color: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500", label: "Outskirts" },
    };

    const handleLookup = async (e) => {
        e.preventDefault();
        const trimmed = pincode.trim();
        if (!trimmed || trimmed.length < 6) return;

        setIsLooking(true);
        setLookupResult(null);
        setLookupError('');
        setHasSearched(true);

        try {
            const { data } = await API.get(`/api/shipping/lookup/${trimmed}`);
            setLookupResult(data);
        } catch (err) {
            if (err.response?.status === 404) {
                setLookupError('This pincode is not in our delivery zones yet. Please contact us for custom delivery options.');
            } else {
                setLookupError('Something went wrong. Please try again.');
            }
        } finally {
            setIsLooking(false);
        }
    };

    const handleReset = () => {
        setPincode('');
        setLookupResult(null);
        setLookupError('');
        setHasSearched(false);
    };

    const steps = [
        {
            title: "Check Availability",
            description: "Browse our collection online. Check real-time availability on our website or reach out via Call or WhatsApp for instant confirmation.",
            icon: <Search className="text-blue-600" size={32} />,
            color: "bg-blue-50"
        },
        {
            title: "Choose Dates & Plan",
            description: "Pick your rental dates. Our system automatically calculates the best Daily or Weekly rates based on your duration.",
            icon: <Calendar className="text-purple-600" size={32} />,
            color: "bg-purple-50"
        },
        {
            title: "Make the Booking",
            description: "Complete the online checkout to reserve your bike instantly. It's fast, secure, and hassle-free.",
            icon: <ShoppingBag className="text-green-600" size={32} />,
            color: "bg-green-50"
        },
        {
            title: "Docs & Deposit",
            description: "Pay the refundable security deposit and send over your ID documents. This completes your verification process.",
            icon: <ShieldCheck className="text-orange-600" size={32} />,
            color: "bg-orange-50"
        }
    ];

    return (
        <div className="bg-white min-h-screen">
            {/* High-Impact Hero Section (Restored Aesthetic) */}
            <div className="relative h-[60vh] min-h-[500px] flex items-center justify-center overflow-hidden">
                <img 
                    src="/images/hero.png" 
                    alt="Cycling in city" 
                    className="absolute inset-0 w-full h-full object-cover brightness-[0.4]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
                    <span className="inline-block bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-6">
                        Step-by-Step Guide
                    </span>
                    <h1 className="text-5xl md:text-7xl font-black text-white mb-6 drop-shadow-2xl tracking-tight leading-[1.1]">
                        The Road to Your <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">Perfect Ride.</span>
                    </h1>
                    <p className="text-lg md:text-xl text-gray-200 font-medium mb-10 drop-shadow-md max-w-2xl mx-auto leading-relaxed opacity-90">
                        Experience Bangalore on two wheels effortlessly. Here is our direct, simple process to get you on the road today.
                    </p>
                    <div className="flex flex-wrap justify-center gap-5">
                        <a href="/catalogue" className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-3xl font-bold transition-all shadow-xl hover:scale-105 flex items-center gap-2 group">
                            Explore Catalogue <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </a>
                        <a href="https://wa.me/918971552453" target="_blank" rel="noreferrer" className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/30 px-10 py-5 rounded-3xl font-bold transition-all">
                            Chat with us
                        </a>
                    </div>
                </div>
            </div>

            {/* Direct Process Steps (Grid Layout) */}
            <div className="max-w-7xl mx-auto px-6 py-24 md:py-32">
                <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight uppercase">How It Works</h2>
                    <p className="text-gray-500 font-medium max-w-xl mx-auto">Follow these 4 simple steps to book your bike online. Finalize your ride with either Pickup or Delivery.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {steps.map((step, index) => (
                        <div key={index} className="relative group p-8 rounded-[3rem] border border-gray-100 bg-white hover:shadow-[0_30px_60px_rgba(0,0,0,0.06)] hover:-translate-y-2 transition-all duration-500">
                            <div className="flex justify-between items-start mb-8">
                                <div className={`w-16 h-16 ${step.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-sm`}>
                                    {step.icon}
                                </div>
                                <span className="text-5xl font-black text-gray-50 opacity-20 group-hover:opacity-40 transition-opacity">0{index + 1}</span>
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-4 tracking-tight uppercase">{step.title}</h3>
                            <p className="text-gray-600 leading-relaxed text-sm font-medium">
                                {step.description}
                            </p>
                            {index === 3 && (
                                <div className="mt-6 flex flex-wrap gap-2">
                                    <span className="bg-orange-50 text-orange-700 px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5">
                                        <CreditCard size={12}/> DEPOSIT
                                    </span>
                                    <span className="bg-orange-50 text-orange-700 px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5">
                                        <FileText size={12}/> ID PROOF
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Final Step: Pickup vs Delivery (Restored Detail & Illustration) */}
            <div className="bg-gray-50/80 py-24 md:py-32 border-y border-gray-100">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col lg:flex-row items-center gap-16 md:gap-24">
                        <div className="flex-1 space-y-10">
                            <div>
                                <span className="inline-block bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-6">
                                    Step 05: Final Step
                                </span>
                                <h2 className="text-4xl md:text-6xl font-black text-gray-900 leading-[1.05] tracking-tight">
                                    Get & Return <br/>
                                    <span className="text-blue-600">the cycle</span>
                                </h2>
                            </div>
                            <p className="text-xl text-gray-600 leading-relaxed font-medium">
                                We've made logistics easy. Choose how you want to receive and return your ride.
                            </p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
                                <div className="flex items-start gap-6 p-8 bg-white rounded-[2.5rem] shadow-sm border border-gray-50 hover:shadow-xl hover:border-blue-100 transition-all group">
                                    <div className="flex-shrink-0 bg-blue-50 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                                        <Store className="text-blue-600" size={30} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-gray-900 text-lg mb-2 uppercase tracking-tight">Self Pick-up & Drop</h4>
                                        <p className="text-gray-500 font-medium leading-normal">Pick up and return directly at our hub in Bangalore. It is free, fast, and convenient.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-6 p-8 bg-white rounded-[2.5rem] shadow-sm border border-gray-50 hover:shadow-xl hover:border-orange-100 transition-all group">
                                    <div className="flex-shrink-0 bg-orange-50 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                                        <Truck className="text-orange-600" size={30} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-gray-900 text-lg mb-2 uppercase tracking-tight">Home Delivery & Return</h4>
                                        <p className="text-gray-500 font-medium leading-normal">Get the cycle delivered and picked up from your doorstep. Nominal delivery charges apply.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 relative">
                            <div className="absolute -inset-16 bg-blue-200/20 rounded-full blur-[100px]"></div>
                            <img 
                                src="/images/delivery.png" 
                                alt="Delivery illustration" 
                                className="relative z-10 w-full max-w-lg mx-auto drop-shadow-[0_50px_50px_rgba(0,0,0,0.15)] rounded-[4rem]"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Delivery Cost Checker */}
            <div className="max-w-7xl mx-auto px-6 py-24 md:py-32">
                <div className="text-center mb-16">
                    <span className="inline-block bg-orange-100 text-orange-700 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-6">
                        Delivery Zones
                    </span>
                    <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight uppercase">Check Delivery Cost</h2>
                    <p className="text-gray-500 font-medium max-w-2xl mx-auto">
                        Enter your pincode to instantly find out the delivery charge to your area.
                    </p>
                </div>

                {/* Pincode Search Card */}
                <div className="max-w-xl mx-auto">
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_30px_80px_rgba(0,0,0,0.06)] p-8 md:p-10">
                        <form onSubmit={handleLookup} className="flex gap-3">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                    <MapPin className="text-gray-400" size={20} />
                                </div>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    placeholder="Enter 6-digit pincode"
                                    value={pincode}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setPincode(val);
                                        if (hasSearched) {
                                            setHasSearched(false);
                                            setLookupResult(null);
                                            setLookupError('');
                                        }
                                    }}
                                    className="w-full pl-14 pr-4 py-5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 font-bold text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={pincode.trim().length < 6 || isLooking}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-5 rounded-2xl font-black transition-all hover:scale-105 disabled:hover:scale-100 flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:shadow-none"
                            >
                                {isLooking ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    <Search size={20} />
                                )}
                                <span className="hidden sm:inline">Check</span>
                            </button>
                        </form>

                        {/* Result: Success */}
                        {lookupResult && (
                            <div className="mt-8 animate-[fadeIn_0.4s_ease-out]">
                                <div className={`rounded-2xl border-2 ${slabConfig[lookupResult.slab]?.color || 'bg-gray-50 text-gray-700 border-gray-200'} p-6 md:p-8`}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <CheckCircle2 size={24} className="text-emerald-500 flex-shrink-0" />
                                        <p className="font-bold text-gray-900 text-sm">We deliver to your area!</p>
                                    </div>
                                    
                                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                                        <div className="space-y-2">
                                            <p className="text-gray-600 text-sm font-medium">{lookupResult.areas}</p>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-mono font-bold text-gray-900 bg-white/60 px-3 py-1 rounded-lg text-sm">{lookupResult.pincode}</span>
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold ${slabConfig[lookupResult.slab]?.color}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${slabConfig[lookupResult.slab]?.dot}`}></span>
                                                    {lookupResult.slab}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Delivery Cost</p>
                                            <p className="text-4xl font-black text-gray-900">₹{lookupResult.cost}</p>
                                            <p className="text-[10px] text-gray-400 font-medium mt-1">one-way</p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleReset}
                                    className="mt-4 text-sm text-gray-400 hover:text-gray-600 font-bold transition-colors mx-auto block"
                                >
                                    Check another pincode →
                                </button>
                            </div>
                        )}

                        {/* Result: Not Found */}
                        {lookupError && (
                            <div className="mt-8 animate-[fadeIn_0.4s_ease-out]">
                                <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-6 md:p-8 text-center">
                                    <XCircle size={32} className="text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-600 font-medium text-sm mb-4">{lookupError}</p>
                                    <a
                                        href="https://wa.me/918971552453"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-xl font-bold text-sm hover:scale-105 transition-all"
                                    >
                                        <MessageCircle size={16} /> WhatsApp Us
                                    </a>
                                </div>

                                <button
                                    onClick={handleReset}
                                    className="mt-4 text-sm text-gray-400 hover:text-gray-600 font-bold transition-colors mx-auto block"
                                >
                                    Try another pincode →
                                </button>
                            </div>
                        )}

                        {/* Default hint (before search) */}
                        {!hasSearched && (
                            <p className="mt-6 text-center text-gray-400 text-xs font-medium">
                                Self pickup & drop from our hub is always <span className="text-emerald-600 font-bold">FREE</span>
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Location & Timings Section */}
            <div className="max-w-7xl mx-auto px-6 py-24 border-t border-gray-100">
                <div className="flex flex-col lg:flex-row gap-12 items-center">
                    <div className="flex-1 space-y-6">
                        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                            Our Location
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight uppercase">Visit Our Hub</h2>
                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="mt-1 bg-gray-100 p-2 rounded-lg text-gray-600">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900">Operating Hours</h4>
                                    <p className="text-gray-600">6:00 AM — 9:00 PM (Daily)</p>
                                    <p className="text-orange-600 font-bold text-sm mt-1 flex items-center gap-1">
                                        <MessageCircle size={14} /> Please Call or WhatsApp before coming!
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="mt-1 bg-gray-100 p-2 rounded-lg text-gray-600">
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900">Address</h4>
                                    <p className="text-gray-600 leading-relaxed">
                                        Mayfair Anthem, Marathalli-Bellendur-Outer Ring Road, <br/>
                                        Bangalore, Karnataka 560103
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1 italic">Behind Embassy Tech Village (Wells Fargo, Flipkart)</p>
                                    <a 
                                        href="https://www.google.com/maps/place/City+Cycling/@12.9269647,77.6923447,17z" 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 text-blue-600 font-bold text-sm mt-3 hover:underline"
                                    >
                                        Open in Google Maps <ArrowRight size={14} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 w-full h-[300px] md:h-[400px] bg-gray-100 rounded-[3rem] overflow-hidden shadow-inner border border-gray-200 relative">
                        {/* Static Map Aesthetic - Using a placeholder or styled div as a map representatiton */}
                        <div className="absolute inset-0 bg-[#e5e7eb] flex items-center justify-center p-8">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl animate-bounce">
                                    <MapPin size={32} />
                                </div>
                                <p className="font-black text-gray-400 uppercase tracking-widest text-sm">Bellandur, Bangalore</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Support Section */}
            <div className="max-w-7xl mx-auto px-6 py-24 md:py-32">
                <div className="bg-gray-900 rounded-[4rem] p-10 md:p-24 text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] group-hover:bg-blue-600/30 transition-colors duration-1000"></div>
                    
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tight">Need help booking?</h2>
                        <p className="text-gray-400 text-xl md:text-2xl mb-14 max-w-3xl mx-auto leading-relaxed font-light">
                            Our team is standing by to help you choose the right bike or custom plan.
                        </p>
                        <div className="flex flex-wrap justify-center gap-6">
                            <a href="tel:+918971552453" className="bg-white text-gray-900 px-12 py-6 rounded-[2rem] font-black flex items-center gap-3 transition-all hover:scale-105 shadow-[0_20px_50px_rgba(255,255,255,0.1)]">
                                <Phone size={24} /> CALL SUPPORT
                            </a>
                            <a href="https://wa.me/918971552453" target="_blank" rel="noreferrer" className="bg-[#25D366] text-white px-12 py-6 rounded-[2rem] font-black flex items-center gap-3 transition-all hover:scale-105 shadow-[0_20px_50px_rgba(37,211,102,0.2)]">
                                <MessageCircle size={24} /> WHATSAPP US
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Final Footer Note */}
            <div className="pb-24 text-center px-6">
                <p className="text-gray-400 text-sm font-bold uppercase tracking-widest opacity-60">
                    * Rates and security deposits are specific to each model. Please check product pages for details.
                </p>
            </div>
        </div>
    );
};

export default HowItWorks;
