import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { productService } from '../services/productService';
import { Filter, X, Search, Bike, ChevronDown, Calendar, ArrowRight, Users, Star } from 'lucide-react';

const bikeTypes = ['MTB', 'Road Bike', 'Hybrid', 'Electric', 'Kids 3 To 6 Years', 'Kids 6 To 10 Years'];

const Catalogue = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    // --- Filter States ---
    const [selectedTypes, setSelectedTypes] = useState(() => {
        const types = searchParams.get('types');
        return types ? types.split(',') : [];
    });
    const [heightFt, setHeightFt] = useState(searchParams.get('heightFt') || '');
    const [heightIn, setHeightIn] = useState(searchParams.get('heightIn') || '');
    const [availabilityFilter, setAvailabilityFilter] = useState(searchParams.get('availability') || 'all'); 


    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await productService.getAll();
                setProducts(response);
                setLoading(false);
            } catch (error) {
                setError(error.message);
                setLoading(false);
                console.error("Failed to fetch products:", error);
            }
        };
        fetchProducts();
    }, []);

    // Sync filters to URL
    useEffect(() => {
        const params = new URLSearchParams();
        if (selectedTypes.length > 0) {
            params.set('types', selectedTypes.join(','));
        }
        if (heightFt) params.set('heightFt', heightFt);
        if (heightIn) params.set('heightIn', heightIn);
        if (availabilityFilter !== 'all') params.set('availability', availabilityFilter);

        if (searchParams.toString() !== params.toString()) {
            setSearchParams(params, { replace: true });
        }
    }, [selectedTypes, heightFt, heightIn, availabilityFilter, setSearchParams, searchParams]);

    // Helpers for Filtering
    const checkStockInRange = (product, days) => {
        const today = new Date();
        for (let i = 0; i < days; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            if (product.availability && product.availability[dateStr] > 0) return true;
        }
        return false;
    };

    const checkStockOnDates = (product, dates) => {
        return dates.some(date => {
            const dateStr = date.toISOString().split('T')[0];
            return product.availability && product.availability[dateStr] > 0;
        });
    };

    const filteredProducts = useMemo(() => {
        let weekendDates = [];
        if (availabilityFilter === 'weekend') {
            const today = new Date();
            const day = today.getDay();
            if (day === 5) {
                weekendDates.push(new Date(today));
                const sat = new Date(today); sat.setDate(today.getDate() + 1); weekendDates.push(sat);
                const sun = new Date(today); sun.setDate(today.getDate() + 2); weekendDates.push(sun);
            } else if (day === 6) {
                weekendDates.push(new Date(today));
                const sun = new Date(today); sun.setDate(today.getDate() + 1); weekendDates.push(sun);
            } else if (day === 0) {
                weekendDates.push(new Date(today));
            } else {
                const diff = 5 - day;
                const nextFriday = new Date(today);
                nextFriday.setDate(today.getDate() + diff);
                weekendDates.push(new Date(nextFriday));
                const sat = new Date(nextFriday); sat.setDate(nextFriday.getDate() + 1); weekendDates.push(sat);
                const sun = new Date(nextFriday); sun.setDate(nextFriday.getDate() + 2); weekendDates.push(sun);
            }
        }

        return products.filter(product => {
            const matchesType = selectedTypes.length === 0 || selectedTypes.includes(product.type);
            let matchesHeight = true;
            if (heightFt !== '') {
                const riderTotalInches = (parseInt(heightFt) * 12) + (parseInt(heightIn) || 0);
                const minInches = (product.minHeightFt * 12) + (product.minHeightInch || 0);
                const maxInches = (product.maxHeightFt * 12) + (product.maxHeightInch || 0);
                matchesHeight = riderTotalInches >= minInches && riderTotalInches <= maxInches;
            }
            let matchesAvailability = true;
            if (availabilityFilter === 'today') {
                matchesAvailability = checkStockInRange(product, 2);
            } else if (availabilityFilter === 'weekend') {
                matchesAvailability = checkStockOnDates(product, weekendDates);
            } else if (availabilityFilter === '7Day') {
                matchesAvailability = checkStockInRange(product, 7);
            }
            return matchesType && matchesHeight && matchesAvailability;
        });
    }, [products, selectedTypes, heightFt, heightIn, availabilityFilter]);

    const getImageUrl = (imageName) => {
        return new URL(`/src/assets/${imageName}`, import.meta.url).href;
    };

    const clearFilters = () => {
        setSelectedTypes([]);
        setHeightFt('');
        setHeightIn('');
        setAvailabilityFilter('all');
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 font-black uppercase tracking-widest text-xs">Loading Fleet...</p>
            </div>
        </div>
    );

    if (error) return <div className="p-20 text-center text-red-500 font-bold">Error: {error}</div>;

    return (
        <div className="bg-white min-h-screen pb-20">
            <div className="bg-gradient-to-br from-blue-50 to-white border-b overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 py-12 md:py-24 flex flex-col items-center text-center">
                    <div className="space-y-8">
                        <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight leading-[1.05] uppercase">
                            Discover Your <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">Perfect Ride.</span>
                        </h1>
                    </div>
                </div>
            </div>

            <div className="lg:sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-5">
                    <div className="flex items-center justify-between gap-6">
                        <div className="hidden lg:flex items-center gap-10">
                            {/* Type Filter */}
                            <div className="flex flex-col gap-2">
                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none">Bike Types</span>
                                <div className="flex gap-2">
                                    {bikeTypes.map(type => (
                                        <button 
                                            key={type}
                                            onClick={() => setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                                                selectedTypes.includes(type) ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white border-gray-100 text-gray-600 hover:border-blue-200'
                                            }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="h-10 w-px bg-gray-100"></div>

                            {/* Height Filter */}
                            <div className="flex flex-col gap-2">
                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none">Your Height</span>
                                <div className="flex gap-2">
                                    <select 
                                        value={heightFt} 
                                        onChange={(e) => setHeightFt(e.target.value)}
                                        className="bg-gray-50 border-2 border-gray-100 text-sm font-bold rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 hover:border-blue-200 transition-colors outline-none cursor-pointer"
                                    >
                                        <option value="">Feet</option>
                                        {[3, 4, 5, 6].map(ft => <option key={ft} value={ft}>{ft} ft</option>)}
                                    </select>
                                    <select 
                                        value={heightIn} 
                                        onChange={(e) => setHeightIn(e.target.value)}
                                        className="bg-gray-50 border-2 border-gray-100 text-sm font-bold rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 hover:border-blue-200 transition-colors outline-none cursor-pointer"
                                    >
                                        <option value="0">Inches</option>
                                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(inch => (
                                            <option key={inch} value={inch}>{inch} in</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="h-10 w-px bg-gray-100"></div>

                            {/* Availability Filter */}
                            <div className="flex flex-col gap-2">
                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none">When?</span>
                                <div className="flex bg-gray-50 p-1.5 rounded-2xl border-2 border-gray-100">
                                    {[
                                        { id: 'all', label: 'Anytime' },
                                        { id: 'today', label: 'Now' },
                                        { id: 'weekend', label: 'Weekend' }
                                    ].map(opt => (
                                        <button 
                                            key={opt.id}
                                            onClick={() => setAvailabilityFilter(opt.id)}
                                            className={`px-5 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                                                availabilityFilter === opt.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={clearFilters}
                            className="text-sm font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
                        >
                            <X size={16} className="group-hover:rotate-90 transition-transform"/>
                            CLEAR
                        </button>
                    </div>
                </div>

                <div className="lg:hidden bg-white border-t p-8 space-y-10">
                    <div className="space-y-4">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Select Bike Types</span>
                        <div className="flex flex-wrap gap-3">
                            {bikeTypes.map(type => (
                                <button 
                                    key={type}
                                    onClick={() => setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])}
                                    className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all border-2 ${
                                        selectedTypes.includes(type) ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-600'
                                    }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Rider Height</span>
                            <select 
                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-400 transition-colors"
                                value={heightFt}
                                onChange={(e) => setHeightFt(e.target.value)}
                            >
                                <option value="">Feet</option>
                                {[3, 4, 5, 6].map(ft => <option key={ft} value={ft}>{ft} ft</option>)}
                            </select>
                        </div>
                        <div className="space-y-4">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest opacity-0">Inches</span>
                            <select 
                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-400 transition-colors"
                                value={heightIn}
                                onChange={(e) => setHeightIn(e.target.value)}
                            >
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(inch => <option key={inch} value={inch}>{inch} in</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Timeframe</span>
                        <div className="grid grid-cols-3 bg-gray-50 p-2 rounded-[2rem] border-2 border-gray-100">
                            {['all', 'today', 'weekend'].map(opt => (
                                <button 
                                    key={opt}
                                    onClick={() => {
                                        setAvailabilityFilter(opt);
                                    }}
                                    className={`py-3 rounded-2xl text-xs font-black uppercase transition-all ${
                                        availabilityFilter === opt ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500'
                                    }`}
                                >
                                    {opt === 'today' ? 'Now' : opt}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Product Grid (Modern & Colorful Cards) */}
            <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
                <div className="flex items-center justify-between mb-12">
                    <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">
                        Our <span className="text-blue-600">Fleet</span>
                    </h2>
                    <div className="hidden md:flex items-center gap-3 text-gray-400">
                        <Star size={16} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-black uppercase tracking-widest">Top Rated Collections</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 md:gap-12">
                    {filteredProducts.map(product => {
                        // Define distinct, elegant color themes for each bike type (Cool & Premium Palette)
                        const typeThemes = {
                            'MTB': {
                                bg: 'from-slate-50 to-gray-50/30',
                                border: 'group-hover:border-slate-300',
                                text: 'text-slate-800',
                                badge: 'bg-slate-50/80 text-slate-700 border-slate-200',
                                accent: 'text-slate-700',
                                icon: 'bg-slate-50 group-hover:bg-slate-700 group-hover:text-white group-hover:shadow-slate-200',
                                shadow: 'hover:shadow-[0_20px_40px_-15px_rgba(71,85,105,0.15)]' // Slate tint
                            },
                            'Road Bike': {
                                bg: 'from-sky-50 to-blue-50/30',
                                border: 'group-hover:border-sky-300',
                                text: 'text-sky-900',
                                badge: 'bg-sky-50/80 text-sky-700 border-sky-200',
                                accent: 'text-sky-700',
                                icon: 'bg-sky-50 group-hover:bg-sky-600 group-hover:text-white group-hover:shadow-sky-200',
                                shadow: 'hover:shadow-[0_20px_40px_-15px_rgba(14,165,233,0.15)]' // Sky tint
                            },
                            'Hybrid': {
                                bg: 'from-cyan-50 to-teal-50/30',
                                border: 'group-hover:border-cyan-300',
                                text: 'text-cyan-900',
                                badge: 'bg-cyan-50/80 text-cyan-700 border-cyan-200',
                                accent: 'text-cyan-700',
                                icon: 'bg-cyan-50 group-hover:bg-cyan-600 group-hover:text-white group-hover:shadow-cyan-200',
                                shadow: 'hover:shadow-[0_20px_40px_-15px_rgba(6,182,212,0.15)]' // Cyan tint
                            },
                            'Electric': {
                                bg: 'from-indigo-50 to-blue-50/30',
                                border: 'group-hover:border-indigo-300',
                                text: 'text-indigo-900',
                                badge: 'bg-indigo-50/80 text-indigo-700 border-indigo-200',
                                accent: 'text-indigo-700',
                                icon: 'bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-indigo-200',
                                shadow: 'hover:shadow-[0_20px_40px_-15px_rgba(99,102,241,0.15)]' // Indigo tint
                            },
                            'Kids 3 To 6 Years': {
                                bg: 'from-teal-50 to-emerald-50/30',
                                border: 'group-hover:border-teal-300',
                                text: 'text-teal-900',
                                badge: 'bg-teal-50/80 text-teal-700 border-teal-200',
                                accent: 'text-teal-700',
                                icon: 'bg-teal-50 group-hover:bg-teal-600 group-hover:text-white group-hover:shadow-teal-200',
                                shadow: 'hover:shadow-[0_20px_40px_-15px_rgba(20,184,166,0.15)]' // Teal tint
                            },
                            'Kids 6 To 10 Years': {
                                bg: 'from-teal-50 to-emerald-50/30',
                                border: 'group-hover:border-teal-300',
                                text: 'text-teal-900',
                                badge: 'bg-teal-50/80 text-teal-700 border-teal-200',
                                accent: 'text-teal-700',
                                icon: 'bg-teal-50 group-hover:bg-teal-600 group-hover:text-white group-hover:shadow-teal-200',
                                shadow: 'hover:shadow-[0_20px_40px_-15px_rgba(20,184,166,0.15)]' // Teal tint
                            }
                        };

                        const defaultTheme = {
                            bg: 'from-gray-50 to-slate-50/30',
                            border: 'group-hover:border-gray-200',
                            text: 'text-gray-900',
                            badge: 'bg-gray-50/80 text-gray-700 border-gray-100',
                            accent: 'text-gray-600',
                            icon: 'bg-gray-50 group-hover:bg-gray-800 group-hover:text-white group-hover:shadow-gray-200',
                            shadow: 'hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]'
                        };

                        const theme = typeThemes[product.type] || defaultTheme;

                        return (
                            <Link 
                                to={`/product/${product.slug}`} 
                                key={product._id} 
                                className={`group flex flex-col h-full bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden hover:-translate-y-2 transition-all duration-500 relative ${theme.border} ${theme.shadow}`}
                            >
                                {/* Image Container with Subtle Gradient Background */}
                                <div className={`relative aspect-[5/4] overflow-hidden bg-gradient-to-br ${theme.bg} p-6`}>
                                    {product.imageUrls && product.imageUrls.length > 0 ? (
                                        <img 
                                            src={getImageUrl(product.imageUrls[0])} 
                                            alt={product.name} 
                                            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-700 ease-out drop-shadow-sm"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <Bike size={60} strokeWidth={1.5} />
                                        </div>
                                    )}
                                    
                                    {/* Elegant Backdrop Badge */}
                                    <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border backdrop-blur-sm shadow-sm ${theme.badge}`}>
                                        {product.type}
                                    </div>
                                </div>
                                
                                <div className="p-8 flex flex-col flex-1 gap-6">
                                    <div className="space-y-2">
                                        <h3 className={`text-lg font-bold tracking-tight leading-tight uppercase ${theme.text}`}>
                                            {product.name}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <div className="bg-gray-50 px-2.5 py-1 rounded-lg text-[10px] font-bold text-gray-500 uppercase tracking-wider border border-gray-100 flex items-center gap-1.5">
                                                <Users size={12}/> {product.size}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto border-t border-gray-50 pt-5 flex items-end justify-between">

                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-baseline gap-1">
                                                <div className={`text-lg font-black leading-none ${theme.accent}`}>
                                                    ₹{product.dailyRate}
                                                </div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">/ day</div>
                                            </div>
                                            {product.weeklyRate && (
                                                <div className="flex items-baseline gap-1">
                                                    <div className={`text-lg font-black leading-none ${theme.text}`}>
                                                        ₹{product.weeklyRate}
                                                    </div>
                                                    <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">/ week</div>
                                                </div>
                                            )}
                                        </div>

                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm ${theme.icon}`}>
                                            <ArrowRight size={20} strokeWidth={2.5} />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {filteredProducts.length === 0 && (
                    <div className="bg-gradient-to-br from-white to-blue-50 rounded-[4rem] border-2 border-blue-50 p-24 text-center space-y-8 shadow-2xl shadow-blue-100/20">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto text-blue-600 shadow-xl border border-blue-50">
                            <Search size={48} className="animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-gray-900 uppercase">No Bikes Found</h3>
                            <p className="text-gray-500 mt-3 text-lg font-medium max-w-sm mx-auto opacity-80">Adjust your height or select more categories to see what we have available.</p>
                        </div>
                        <button 
                            onClick={clearFilters}
                            className="bg-blue-600 text-white px-12 py-5 rounded-[2rem] font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 hover:scale-105 active:scale-95"
                        >
                            CLEAR ALL FILTERS
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Catalogue;