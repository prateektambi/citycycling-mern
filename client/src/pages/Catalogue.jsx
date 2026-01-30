import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { productService } from '../services/productService';
import { Filter, X, Search, Bike, ChevronDown, Calendar, ArrowRight, SlidersHorizontal, Users, Star } from 'lucide-react';

const bikeTypes = ['MTB', 'Road Bike', 'Hybrid', 'Electric', 'Kids 3 To 6 Years', 'Kids 6 To 10 Years'];

const Catalogue = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    // --- Filter States ---
    const [selectedTypes, setSelectedTypes] = useState(() => {
        const types = searchParams.get('types');
        return types ? types.split(',') : bikeTypes;
    });
    const [heightFt, setHeightFt] = useState(searchParams.get('heightFt') || '');
    const [heightIn, setHeightIn] = useState(searchParams.get('heightIn') || '');
    const [availabilityFilter, setAvailabilityFilter] = useState(searchParams.get('availability') || 'all'); 
    const [showMobileFilters, setShowMobileFilters] = useState(false);

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
        const isAllTypesSelected = selectedTypes.length === bikeTypes.length && selectedTypes.every(t => bikeTypes.includes(t));
        if (!isAllTypesSelected && selectedTypes.length > 0) {
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
        setSelectedTypes(bikeTypes);
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
            {/* Vibrant Hero Section */}
            <div className="bg-gradient-to-br from-blue-50 to-white border-b overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 py-12 md:py-24 flex flex-col md:flex-row items-center gap-12 text-center md:text-left">
                    <div className="flex-1 space-y-8">
                        <span className="inline-block bg-blue-600 text-white text-xs font-black uppercase tracking-[0.3em] px-5 py-2 rounded-full shadow-lg shadow-blue-100">
                            Our Premium Fleet
                        </span>
                        <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight leading-[1.05] uppercase">
                            Discover Your <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">Perfect Ride.</span>
                        </h1>
                        <p className="text-gray-600 text-xl font-medium max-w-lg mx-auto md:mx-0 leading-relaxed">
                            Premium cycles professionally maintained for your Bangalore adventures. Fast, secure, and purely joyful.
                        </p>
                    </div>
                    <div className="flex-1 relative">
                        <div className="absolute -inset-10 bg-blue-400/10 rounded-full blur-[80px]"></div>
                        <img 
                            src="/images/catalogue-hero.png" 
                            alt="Bicycle collection" 
                            className="relative z-10 w-full rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.1)] hover:scale-105 transition-transform duration-700"
                        />
                    </div>
                </div>
            </div>

            {/* Sticky Filter Bar (Vibrant & Legible) */}
            <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm">
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
                                            onClick={() => setSelectedTypes(prev => prev.includes(type) ? (prev.length > 1 ? prev.filter(t => t !== type) : prev) : [...prev, type])}
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

                        {/* Mobile Filter Toggle */}
                        <button 
                            onClick={() => setShowMobileFilters(!showMobileFilters)}
                            className="lg:hidden flex items-center gap-2 bg-white border-2 border-gray-100 px-5 py-3 rounded-2xl text-sm font-bold text-gray-700 active:scale-95 transition-transform"
                        >
                            <SlidersHorizontal size={18} />
                            Filters
                            {(selectedTypes.length !== bikeTypes.length || heightFt || availabilityFilter !== 'all') && (
                                <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                            )}
                        </button>

                        <button 
                            onClick={clearFilters}
                            className="text-sm font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
                        >
                            <X size={16} className="group-hover:rotate-90 transition-transform"/>
                            CLEAR
                        </button>
                    </div>
                </div>

                {/* Mobile Filters Panel */}
                {showMobileFilters && (
                    <div className="lg:hidden bg-white border-t p-8 space-y-10 animate-in slide-in-from-top duration-500">
                        <div className="space-y-4">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Select Bike Types</span>
                            <div className="flex flex-wrap gap-3">
                                {bikeTypes.map(type => (
                                    <button 
                                        key={type}
                                        onClick={() => setSelectedTypes(prev => prev.includes(type) ? (prev.length > 1 ? prev.filter(t => t !== type) : prev) : [...prev, type])}
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
                                            setShowMobileFilters(false);
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
                        <button 
                            onClick={() => setShowMobileFilters(false)}
                            className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-blue-100 active:scale-95 transition-all"
                        >
                            Apply Filters
                        </button>
                    </div>
                )}
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
                    {filteredProducts.map(product => (
                        <Link to={`/product/${product.slug}`} key={product._id} className="group flex flex-col h-full bg-white rounded-[3rem] border-2 border-gray-50 overflow-hidden hover:shadow-[0_50px_100px_rgba(0,0,0,0.12)] hover:border-blue-100 hover:-translate-y-2 transition-all duration-500">
                            <div className="relative aspect-[5/4] overflow-hidden bg-gray-50">
                                {product.imageUrls && product.imageUrls.length > 0 ? (
                                    <img 
                                        src={getImageUrl(product.imageUrls[0])} 
                                        alt={product.name} 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                                        <Bike size={60} />
                                    </div>
                                )}
                                <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl text-[10px] font-black text-gray-900 shadow-xl border border-white/50 uppercase tracking-widest leading-none">
                                    {product.type}
                                </div>
                            </div>
                            
                            <div className="p-10 flex flex-col flex-1 space-y-6">
                                <h3 className="text-xl font-black text-gray-900 tracking-tight leading-tight uppercase group-hover:text-blue-600 transition-colors">
                                    {product.name}
                                </h3>
                                
                                <div className="flex items-center gap-3">
                                    <div className="bg-gray-50 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 uppercase tracking-widest border border-gray-100 flex items-center gap-2">
                                        <Users size={14}/> Size: {product.size}
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-gray-50 mt-auto flex items-center justify-between">
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none">Daily Rate</div>
                                            <div className="text-xl font-black text-gray-900 leading-none">₹{product.dailyRate}<span className="text-[10px] text-gray-400 font-bold ml-1">/DAY</span></div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em] leading-none">Weekly Saver</div>
                                            <div className="text-md font-black text-emerald-600 leading-none">₹{product.weeklyRate}<span className="text-[10px] text-emerald-400 font-bold ml-1">/WEEK</span></div>
                                        </div>
                                    </div>
                                    <div className="w-14 h-14 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white rounded-[1.5rem] flex items-center justify-center transition-all duration-300 shadow-inner group-hover:shadow-blue-200 group-hover:shadow-xl self-end">
                                        <ArrowRight size={24} />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
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