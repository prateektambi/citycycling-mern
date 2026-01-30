import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Save, Bike, Trash2, Sliders, DollarSign, 
    Image as ImageIcon, Info, Ruler, AlertCircle, ShoppingBag 
} from 'lucide-react';
import { productService } from '../../services/productService';

const ManageProduct = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = id && id !== 'new';

    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        productCode: '',
        slug: '',
        description: '',
        category: 'Cycle',
        type: 'MTB',
        size: 'M',
        minHeightFt: 5,
        minHeightInch: 0,
        maxHeightFt: 6,
        maxHeightInch: 0,
        inventoryCount: 0,
        dailyRate: 0,
        weeklyRate: 0,
        monthlyRate: 0,
        securityDeposit: 500,
        weeklyExtraRates: {
            day1: 0, day2: 0, day3: 0, day4: 0, day5: 0, day6: 0
        },
        imageUrls: [],
        specifications: []
    });

    useEffect(() => {
        if (isEdit) {
            fetchProduct();
        }
    }, [id]);

    const fetchProduct = async () => {
        try {
            const data = await productService.getById(id);
            setFormData({
                ...formData,
                ...data,
                weeklyExtraRates: data.weeklyExtraRates || formData.weeklyExtraRates
            });
            setLoading(false);
        } catch (err) {
            console.error("Error fetching product:", err);
            alert("Failed to load product details.");
            navigate('/admin/products');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('weeklyExtraRates.')) {
            const day = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                weeklyExtraRates: {
                    ...prev.weeklyExtraRates,
                    [day]: value === '' ? '' : Number(value)
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev, 
                [name]: ['dailyRate', 'weeklyRate', 'monthlyRate', 'securityDeposit', 'inventoryCount', 'minHeightFt', 'minHeightInch', 'maxHeightFt', 'maxHeightInch'].includes(name) 
                    ? (value === '' ? '' : Number(value))
                    : value
            }));
        }
    };

    const generateSlug = () => {
        const slug = formData.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
        setFormData(prev => ({ ...prev, slug }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (isEdit) {
                await productService.update(id, formData);
            } else {
                await productService.create(formData);
            }
            alert(`Product ${isEdit ? 'updated' : 'created'} successfully!`);
            navigate('/admin/products');
        } catch (err) {
            console.error("Error saving product:", err);
            alert("Error: " + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this product? This will not delete inventory items but will remove the catalogue entry.")) return;
        try {
            await productService.delete(id);
            alert("Product deleted.");
            navigate('/admin/products');
        } catch (err) {
            console.error("Error deleting product:", err);
            alert("Failed to delete product.");
        }
    };

    if (loading) return <div className="p-10 text-center font-bold text-gray-400">Loading Product Data...</div>;

    return (
        <div className="bg-gray-50 min-h-screen pb-24">
            {/* Sticky Header */}
            <div className="bg-white border-b sticky top-0 z-30 p-4 shadow-sm">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/admin/products')} className="p-2 hover:bg-gray-100 rounded-xl transition">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-2xl font-black text-gray-900">
                            {isEdit ? 'Edit Product' : 'New Catalogue Item'}
                        </h1>
                    </div>
                    <div className="flex gap-3">
                        {isEdit && (
                            <button onClick={handleDelete} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition border border-transparent hover:border-red-100">
                                <Trash2 size={20} />
                            </button>
                        )}
                        <button 
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-black transition shadow-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={18} />
                            {saving ? 'Saving...' : 'Save Product'}
                        </button>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSave} className="max-w-5xl mx-auto p-6 space-y-8">
                {/* 1. Basic Identity */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm space-y-6">
                    <h2 className="text-sm font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Info size={16}/> Basic Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Product Name</label>
                            <input 
                                name="name" value={formData.name} onChange={handleChange} onBlur={generateSlug}
                                className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none transition font-medium"
                                placeholder="e.g. Riverside 500 Hybrid" required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Product Code</label>
                            <input 
                                name="productCode" value={formData.productCode} onChange={handleChange}
                                className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none transition font-mono text-sm"
                                placeholder="RS-500-M" required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">URL Slug</label>
                            <input 
                                name="slug" value={formData.slug} onChange={handleChange}
                                className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none transition text-sm text-gray-500"
                                placeholder="riverside-500-hybrid" required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Category</label>
                            <select 
                                name="category" value={formData.category} onChange={handleChange}
                                className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none transition font-bold"
                            >
                                <option value="Cycle">Cycle</option>
                                <option value="Accessory">Accessory</option>
                                <option value="Service">Service</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Description</label>
                        <textarea 
                            name="description" value={formData.description} onChange={handleChange}
                            className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none transition min-h-[120px]"
                            placeholder="Detailed product features and condition..." required
                        />
                    </div>
                </div>

                {/* 2. Specifications & Sizing */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm space-y-6">
                    <h2 className="text-sm font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Ruler size={16}/> Specifications & Customization
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Bike Type</label>
                            <select name="type" value={formData.type} onChange={handleChange} className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold">
                                <option value="MTB">MTB</option>
                                <option value="Road Bike">Road Bike</option>
                                <option value="Hybrid">Hybrid</option>
                                <option value="Electric">Electric</option>
                                <option value="Kids 3 To 6 Years">Kids 3 To 6 Years</option>
                                <option value="Kids 6 To 10 Years">Kids 6 To 10 Years</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Frame Size</label>
                            <select name="size" value={formData.size} onChange={handleChange} className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold">
                                {['S', 'M', 'L', 'XL', 'Universal', 'Kids1-3', 'Kids3-6', 'Kids6-10'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Inventory Count</label>
                            <div className="flex items-center gap-2">
                                <ShoppingBag className="text-gray-300" size={20} />
                                <input name="inventoryCount" type="number" value={formData.inventoryCount === 0 && formData.inventoryCount !== '' ? '' : formData.inventoryCount} placeholder="0" onChange={handleChange} className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none transition" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50/50 p-6 rounded-3xl space-y-4">
                        <h4 className="text-xs font-black text-blue-900 uppercase">Rider Height Range</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-blue-400 uppercase mb-1">Min Height (Ft)</label>
                                <input name="minHeightFt" type="number" value={formData.minHeightFt === 0 && formData.minHeightFt !== '' ? '' : formData.minHeightFt} placeholder="0" onChange={handleChange} className="w-full p-3 bg-white border border-blue-100 rounded-xl outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-blue-400 uppercase mb-1">Min Height (In)</label>
                                <input name="minHeightInch" type="number" value={formData.minHeightInch === 0 && formData.minHeightInch !== '' ? '' : formData.minHeightInch} placeholder="0" onChange={handleChange} className="w-full p-3 bg-white border border-blue-100 rounded-xl outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-blue-400 uppercase mb-1">Max Height (Ft)</label>
                                <input name="maxHeightFt" type="number" value={formData.maxHeightFt === 0 && formData.maxHeightFt !== '' ? '' : formData.maxHeightFt} placeholder="0" onChange={handleChange} className="w-full p-3 bg-white border border-blue-100 rounded-xl outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-blue-400 uppercase mb-1">Max Height (In)</label>
                                <input name="maxHeightInch" type="number" value={formData.maxHeightInch === 0 && formData.maxHeightInch !== '' ? '' : formData.maxHeightInch} placeholder="0" onChange={handleChange} className="w-full p-3 bg-white border border-blue-100 rounded-xl outline-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Pricing & Bridge Rates */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-2">
                            <DollarSign size={16}/> Base Pricing Tiers
                        </h2>
                        <div className="bg-emerald-50 px-4 py-2 rounded-xl text-[10px] font-black text-emerald-700 uppercase tracking-widest border border-emerald-100">
                            Refundable Deposit: ₹{formData.securityDeposit}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Daily Rate</label>
                            <input name="dailyRate" type="number" value={formData.dailyRate === 0 && formData.dailyRate !== '' ? '' : formData.dailyRate} placeholder="0" onChange={handleChange} className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold" />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Weekly Rate</label>
                            <input name="weeklyRate" type="number" value={formData.weeklyRate === 0 && formData.weeklyRate !== '' ? '' : formData.weeklyRate} placeholder="0" onChange={handleChange} className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-blue-600" />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Monthly Rate</label>
                            <input name="monthlyRate" type="number" value={formData.monthlyRate === 0 && formData.monthlyRate !== '' ? '' : formData.monthlyRate} placeholder="0" onChange={handleChange} className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-indigo-600" />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Deposit</label>
                            <input name="securityDeposit" type="number" value={formData.securityDeposit === 0 && formData.securityDeposit !== '' ? '' : formData.securityDeposit} placeholder="0" onChange={handleChange} className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-orange-600" />
                        </div>
                    </div>

                    {/* NEW BRIDGE RATES SECTION */}
                    <div className="bg-emerald-50/50 p-8 rounded-[2rem] border border-emerald-100/50 space-y-6">
                        <div className="space-y-1">
                            <h4 className="text-sm font-black text-emerald-900 uppercase">Weekly Bridge Rates</h4>
                            <p className="text-xs text-emerald-600/70 font-medium italic">Fixed prices for extra days added after completing a full week (1w + 2d = Weekly Rate + Bridge Day 2)</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                            {[1, 2, 3, 4, 5, 6].map(day => (
                                <div key={day} className="space-y-2">
                                    <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-tighter">Day {day} Extra</label>
                                    <input 
                                        name={`weeklyExtraRates.day${day}`}
                                        type="number"
                                        value={formData.weeklyExtraRates[`day${day}`] === 0 && formData.weeklyExtraRates[`day${day}`] !== '' ? '' : formData.weeklyExtraRates[`day${day}`]}
                                        onChange={handleChange}
                                        className="w-full p-3 bg-white border border-emerald-100 rounded-xl outline-none text-sm font-bold text-emerald-700"
                                        placeholder={`₹${day * formData.dailyRate}`}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="bg-white/60 p-4 rounded-2xl flex items-start gap-3 border border-emerald-50">
                            <AlertCircle className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                            <p className="text-[10px] text-emerald-800 leading-relaxed font-medium">
                                <span className="font-bold">Pro-tip:</span> If you leave these as 0, the system will use pro-rated daily rates. Monthly extra days are automatically pro-rated and rounded to the upper ₹50 as per company policy.
                            </p>
                        </div>
                    </div>
                </div>

                {/* 4. Images & Media Placeholder */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm space-y-6">
                    <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <ImageIcon size={16}/> Media & Specifications
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="aspect-video bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 gap-2">
                            <ImageIcon size={32} />
                            <p className="text-xs font-bold uppercase tracking-widest">Upload Service Coming Soon</p>
                        </div>
                        <div className="space-y-4">
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                                Specifications and image uploads will be enabled in the next version update. For now, please use standard filenames in `/assets`.
                            </p>
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Main Image Filename</label>
                                <input 
                                    name="imageUrls" value={formData.imageUrls[0] || ''} 
                                    onChange={(e) => setFormData({...formData, imageUrls: [e.target.value]})} 
                                    className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-mono text-sm"
                                    placeholder="riverside-500.png"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default ManageProduct;
