import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Plus, Bike, Tag, Calendar, Package } from 'lucide-react';
import { productService } from '../../services/productService';

const ProductList = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const data = await productService.getAll(true); // admin = true
            setProducts(data || []);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching products:", err);
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(product => {
        return (
            product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.productCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.type?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    if (loading) return <div className="p-10 text-center font-bold text-gray-400">Loading Fleet...</div>;

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-20 p-4 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 justify-between items-center">
                    <h1 className="text-2xl font-black text-gray-900">Catalogue Management</h1>
                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search products..." 
                                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button 
                            onClick={() => navigate('/admin/products/new')} 
                            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-100"
                        >
                            <Plus size={18} />
                            Add Product
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProducts.map((product) => (
                        <div key={product._id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300 overflow-hidden flex flex-col">
                            {/* Card Top: Image/Icon */}
                            <div className="aspect-video bg-gray-50 flex items-center justify-center border-b border-gray-50">
                                {product.imageUrls && product.imageUrls[0] ? (
                                    <img 
                                        src={new URL(`/src/assets/${product.imageUrls[0]}`, import.meta.url).href} 
                                        alt={product.name} 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Bike size={48} className="text-gray-200" />
                                )}
                            </div>

                            {/* Card Body */}
                            <div className="p-6 flex-1 space-y-4">
                                <div>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">{product.type}</span>
                                        <div className="flex items-center gap-2">
                                            {product.enableDisplay === false && (
                                                <span className="text-[9px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase tracking-widest">Hidden</span>
                                            )}
                                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded" title="Display Order">Ord: {product.displayOrder || 0}</span>
                                            <span className="text-[10px] font-mono text-gray-400">{product.productCode}</span>
                                        </div>
                                    </div>
                                    <h3 className="font-black text-gray-900 text-lg uppercase leading-tight">{product.name}</h3>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-gray-50 p-3 rounded-2xl">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Daily</p>
                                        <p className="font-bold text-gray-900">₹{product.dailyRate}</p>
                                    </div>
                                    <div className="bg-emerald-50 p-3 rounded-2xl">
                                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Weekly</p>
                                        <p className="font-bold text-emerald-700">₹{product.weeklyRate}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                                    <div className="flex items-center gap-1.5">
                                        <Package size={14} className="text-gray-400" />
                                        Stock: {product.inventoryCount}
                                    </div>
                                    {(product.category === 'Cycle' || (product.size && product.size !== 'Universal')) && (
                                        <div className="flex items-center gap-1.5">
                                            <Tag size={14} className="text-gray-400" />
                                            Size: {product.size}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Card Footer */}
                            <div className="p-6 border-t border-gray-50 bg-gray-50/30">
                                <button 
                                    onClick={() => navigate(`/admin/products/${product._id}`)}
                                    className="w-full py-3 bg-white border border-gray-200 rounded-2xl text-gray-900 font-bold hover:bg-gray-900 hover:text-white transition shadow-sm flex items-center justify-center gap-2 group"
                                >
                                    Manage Details
                                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredProducts.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-200 mt-6">
                        <Package size={64} className="mx-auto text-gray-100 mb-4" />
                        <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest">No Products Found</h3>
                        <p className="text-gray-400 mt-1">Try adjusting your search or add a new product</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductList;
