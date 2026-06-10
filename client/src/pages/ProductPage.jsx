import React, { useState, useEffect, useContext } from 'react';
import { useParams, NavLink, useNavigate } from 'react-router-dom';
import { productService } from '../services/productService';
import Rating from '../components/Rating';
import BookingForm from '../components/BookingForm';
import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';
import { 
    ChevronLeft, 
    ChevronRight, 
    ShieldCheck, 
    Bike, 
    Ruler, 
    Info, 
    CalendarDays, 
    ShoppingCart, 
    Clock, 
    ArrowLeft,
    Users,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';

const ProductPage = () => {
    const { slug } = useParams();
    const [product, setProduct] = useState(null);
    const [error, setError] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // Context and navigation hooks
    const { user } = useContext(AuthContext);
    const { addToCart } = useContext(CartContext);
    const navigate = useNavigate();

    // Cross-sell states
    const [accessories, setAccessories] = useState([]);
    const [selectedStartDate, setSelectedStartDate] = useState('');
    const [selectedEndDate, setSelectedEndDate] = useState('');
    const [addingAccessoryId, setAddingAccessoryId] = useState(null);
    const [accessorySuccessId, setAccessorySuccessId] = useState(null);
    const [accessoryError, setAccessoryError] = useState('');

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await productService.getBySlug(slug);
                setProduct(response);
            } catch (error) {
                setError(error.message);
                console.error("Failed to fetch product:", error);
            }
        };

        fetchProduct();
    }, [slug]);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (product && product.category?.toLowerCase() === 'cycle') {
            const fetchAccessories = async () => {
                try {
                    const allProducts = await productService.getAll();
                    const filtered = allProducts.filter(p => p.category?.toLowerCase() === 'accessory');
                    setAccessories(filtered);
                } catch (err) {
                    console.error("Failed to fetch accessories:", err);
                }
            };
            fetchAccessories();
        } else {
            setAccessories([]);
        }
    }, [product]);

    const handleAddAccessory = async (accessory) => {
        if (!user) {
            navigate(`/login?redirect=/product/${product.slug}`);
            return;
        }
        if (!selectedStartDate || !selectedEndDate) {
            setAccessoryError('Please select rental dates for the cycle first.');
            const dateInput = document.querySelector('input[type="date"]');
            if (dateInput) {
                dateInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                dateInput.focus();
            }
            return;
        }

        setAddingAccessoryId(accessory._id);
        setAccessoryError('');
        setAccessorySuccessId(null);

        const result = await addToCart(accessory._id, 1, selectedStartDate, selectedEndDate);
        if (result.success) {
            setAccessorySuccessId(accessory._id);
            setTimeout(() => setAccessorySuccessId(null), 3000);
        } else {
            setAccessoryError(result.message || 'Failed to add accessory to cart.');
        }
        setAddingAccessoryId(null);
    };

    const getImageUrl = (imageName) => {
        return new URL(`/src/assets/${imageName}`, import.meta.url).href;
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const renderAvailabilityCalendar = () => {
        if (!product) return null;

        const availabilityMap = product.availability || {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const limitDate = new Date();
        limitDate.setDate(today.getDate() + 90);

        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const monthName = currentMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startDayOfWeek = new Date(year, month, 1).getDay();

        const days = [];
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(<div key={`empty-${i}`} className="h-10 md:h-12 text-center"></div>);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const isPast = date < today;
            
            let statusClass = "bg-gray-50 text-gray-300";
            let stockCount = 0;

            if (!isPast) {
                stockCount = availabilityMap[dateKey] !== undefined ? availabilityMap[dateKey] : 1;
                statusClass = stockCount > 0 
                    ? "bg-green-50 text-green-700 border-green-100 hover:bg-green-100 cursor-help" 
                    : "bg-red-50 text-red-500 border-red-100 opacity-50";
            }

            days.push(
                <div key={dateKey} className={`h-10 md:h-12 border rounded-xl flex flex-col items-center justify-center transition-all ${statusClass}`}>
                    <span className="text-xs font-black">{d}</span>
                    {!isPast && (
                        <span className="text-[8px] font-bold uppercase leading-none">{stockCount > 0 ? `${stockCount} Left` : 'Out'}</span>
                    )}
                </div>
            );
        }

        return (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <CalendarDays size={20} />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Availability Calendar</h3>
                </div>

                <div className="flex items-center justify-between mb-8 px-2">
                    <button 
                        onClick={prevMonth} 
                        className="p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-20"
                        disabled={currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear()}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <h4 className="text-lg font-black text-gray-800 uppercase tracking-widest">{monthName}</h4>
                    <button 
                        onClick={nextMonth} 
                        className="p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-20"
                        disabled={currentMonth.getFullYear() > limitDate.getFullYear() || (currentMonth.getFullYear() === limitDate.getFullYear() && currentMonth.getMonth() >= limitDate.getMonth())}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-3 text-center mb-4">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                        <div key={`${day}-${index}`} className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{day}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-3">
                    {days}
                </div>
                    
                <div className="mt-8 flex gap-6 px-2">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-100 rounded-full border border-green-200"></div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-100 rounded-full border border-red-200"></div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Fully Booked</span>
                    </div>
                </div>
            </div>
        );
    };

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center space-y-4">
                    <div className="text-red-500 font-black text-xl uppercase">Error Loading Product</div>
                    <p className="text-gray-500">{error}</p>
                    <NavLink to="/catalogue" className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline">
                        <ArrowLeft size={18} /> Back to Catalogue
                    </NavLink>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-black uppercase tracking-widest text-xs">Fetching Details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen">
            {/* Header / Breadcrumb */}
            <div className="bg-gray-50/50 border-b">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <NavLink to="/catalogue" className="group flex items-center gap-2 text-gray-500 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest transition-colors">
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Back to Catalogue
                    </NavLink>
                    <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest leading-none">
                        Category: {product.type}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-12 md:py-20 lg:py-24">
                <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">
                    
                    {/* Left Column: Image Gallery Placeholder */}
                    <div className="flex-1 space-y-8">
                        <div className="relative aspect-square md:aspect-video lg:aspect-square bg-gray-50 rounded-[3rem] overflow-hidden border-2 border-gray-50 shadow-inner group">
                            {product.imageUrls && product.imageUrls.length > 0 ? (
                                <img 
                                    src={getImageUrl(product.imageUrls[0])} 
                                    alt={product.name} 
                                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-200">
                                    <Bike size={120} />
                                </div>
                            )}
                            <div className="absolute top-8 right-8 bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl text-[10px] font-black text-gray-900 shadow-xl border border-white/50 uppercase tracking-[0.2em]">
                                Premium {product.type}
                            </div>
                        </div>

                        {/* Additional Thumbnails Placeholder */}
                        <div className="flex gap-4">
                             {[1,2,3].map(i => (
                                <div key={i} className="w-20 h-20 bg-gray-50 rounded-2xl border-2 border-gray-100 hover:border-blue-200 transition-colors cursor-pointer"></div>
                             ))}
                        </div>
                    </div>

                    {/* Right Column: Product Details & Booking UI */}
                    <div className="flex-1 space-y-12">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <Rating value={product.averageRating} />
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-none pt-1">45 Reviews</span>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight leading-[1.1] uppercase">
                                {product.name}
                            </h1>
                            <p className="text-xl text-gray-500 font-medium leading-relaxed max-w-xl">
                                {product.description}
                            </p>
                        </div>

                        {/* Pricing Grid - Refined size */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4 pt-4">
                            <div className="bg-white rounded-3xl p-6 border-2 border-gray-50 shadow-sm group hover:border-blue-100 transition-all">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Daily Rate</p>
                                <div className="text-2xl font-black text-gray-900">₹{product.dailyRate}<span className="text-xs text-gray-400 font-bold ml-1">/day</span></div>
                            </div>
                            <div className="bg-white rounded-3xl p-6 border-2 border-gray-50 shadow-sm group hover:border-emerald-100 transition-all">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Weekly Advantage</p>
                                <div className="text-2xl font-black text-emerald-600">₹{product.weeklyRate}<span className="text-xs text-gray-400 font-bold ml-1">/week</span></div>
                            </div>
                        </div>

                        {/* Quick Specs / Meta */}
                        <div className="grid grid-cols-2 gap-8 py-8 border-y border-gray-100">
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
                                    <Ruler size={24}/>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">Frame Size</p>
                                    <p className="text-md font-black text-gray-900 uppercase">Size {product.size}</p>
                                </div>
                             </div>
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-blue-600">
                                    <Users size={24}/>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">Rider Height</p>
                                    <p className="text-md font-black text-gray-900 uppercase">{product.minHeightFt}'{product.minHeightInch}" - {product.maxHeightFt}'{product.maxHeightInch}"</p>
                                </div>
                             </div>
                             
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-blue-600">
                                    <Bike size={24}/>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">Category</p>
                                    <p className="text-md font-black text-gray-900 uppercase">{product.type}</p>
                                </div>
                             </div>
                        </div>

                        {/* Security Deposit & Verification Note */}
                        <div className="bg-orange-50 border-2 border-orange-100/50 rounded-[2rem] p-8 space-y-4">
                            <div className="flex items-center gap-4 text-orange-700">
                                <ShieldCheck size={24} className="shrink-0" />
                                <h4 className="font-black uppercase tracking-tight text-sm">Booking & Verification Policy</h4>
                            </div>
                            <div className="space-y-3">
                                <p className="text-sm text-orange-950/70 font-medium leading-relaxed">
                                    <span className="font-black text-orange-900">Step 1:</span> Pay only the <span className="font-black text-orange-900">₹{product.securityDeposit}</span> refundable security deposit to book. Rentals are deducted later.
                                </p>
                                <p className="text-sm text-orange-950/70 font-medium leading-relaxed flex items-center gap-2">
                                    <span className="font-black text-orange-900">Step 2:</span> Government ID proof is required for verification.
                                </p>
                            </div>
                        </div>

                        {/* Booking Form with Calendar */}
                        <div className="pt-6 space-y-8">
                            {renderAvailabilityCalendar()}
                            <BookingForm 
                                product={product} 
                                onDateSelect={(start, end) => {
                                    setSelectedStartDate(start);
                                    setSelectedEndDate(end);
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Recommended Accessories Section */}
                {product.category?.toLowerCase() === 'cycle' && accessories.length > 0 && (
                    <div className="mt-20 pt-16 border-t border-gray-100">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">
                                    Enhance Your Ride
                                </h2>
                                <p className="text-gray-500 font-medium mt-1">
                                    Add premium accessories matching your rental duration.
                                </p>
                            </div>
                            {accessoryError && (
                                <div className="bg-red-50 border border-red-100 text-red-700 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 animate-bounce">
                                    <AlertCircle size={14} /> {accessoryError}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {accessories.map((accessory) => {
                                const hasSuccess = accessorySuccessId === accessory._id;
                                const isAdding = addingAccessoryId === accessory._id;

                                return (
                                    <div key={accessory._id} className="bg-white border-2 border-gray-50 rounded-[2.5rem] p-6 shadow-sm hover:border-blue-100 hover:shadow-md transition-all group flex flex-col justify-between">
                                        <div>
                                            {/* Accessory Image */}
                                            <div className="aspect-square bg-gray-50 rounded-3xl overflow-hidden border border-gray-100 mb-6 relative">
                                                {accessory.imageUrls && accessory.imageUrls.length > 0 ? (
                                                    <img 
                                                        src={getImageUrl(accessory.imageUrls[0])} 
                                                        alt={accessory.name} 
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                        <Bike size={48} />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Accessory Info */}
                                            <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight mb-2">
                                                {accessory.name}
                                            </h3>
                                            <p className="text-gray-500 text-sm font-medium line-clamp-2 mb-4">
                                                {accessory.description}
                                            </p>
                                        </div>

                                        <div>
                                            {/* Rates & CTA */}
                                            <div className="flex items-center justify-between border-t border-gray-50 pt-4 mt-2">
                                                <div>
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Daily Rate</p>
                                                    <p className="text-lg font-black text-gray-900">₹{accessory.dailyRate}<span className="text-xs text-gray-400 font-bold">/day</span></p>
                                                </div>
                                                <button
                                                    onClick={() => handleAddAccessory(accessory)}
                                                    disabled={isAdding}
                                                    className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
                                                        hasSuccess
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/10 hover:-translate-y-0.5'
                                                    }`}
                                                >
                                                    {isAdding ? (
                                                        <>Adding...</>
                                                    ) : hasSuccess ? (
                                                        <><CheckCircle2 size={14} /> Added</>
                                                    ) : (
                                                        <>Add to Cart</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductPage;
