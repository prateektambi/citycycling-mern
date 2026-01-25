import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Filter, X, Bike, Wrench, Archive, CheckCircle } from 'lucide-react';
import axios from 'axios';

const ItemList = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [showFilters, setShowFilters] = useState(false);

    const ALL_STATUSES = ['all', 'available', 'maintenance', 'retired'];

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            const res = await axios.get('/api/items');
            setItems(res.data || []);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching items:", err);
            setLoading(false);
        }
    };

    const filteredItems = (items || []).filter(item => {
        const matchesSearch = 
            item.itemNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.chassisNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.product?.code?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;

        return matchesSearch && matchesStatus;
    });

    const getStatusIcon = (status) => {
        switch (status) {
            case 'available': return <CheckCircle size={16} />;
            case 'maintenance': return <Wrench size={16} />;
            case 'retired': return <Archive size={16} />;
            default: return <Bike size={16} />;
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'available': return 'bg-green-100 text-green-700 border-green-200';
            case 'maintenance': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'retired': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    if (loading) return <div className="p-10 text-center font-bold text-gray-400">Loading Items...</div>;

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Header & Filters */}
            <div className="bg-white border-b sticky top-0 z-20 p-4 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <h1 className="text-2xl font-black text-gray-900">Inventory Items</h1>
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Search Item/Chassis/Product..." 
                                    className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={() => setShowFilters(!showFilters)} 
                                className={`p-2.5 rounded-xl transition border ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-500'}`}
                            >
                                <Filter size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Filter Panel */}
                    {showFilters && (
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4 animate-in slide-in-from-top-2">
                            <div className="space-y-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filter by Status</span>
                                <div className="flex flex-wrap gap-2">
                                    {ALL_STATUSES.map(status => (
                                        <button 
                                            key={status}
                                            onClick={() => setSelectedStatus(status)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-2 ${
                                                selectedStatus === status ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            {selectedStatus === status && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {selectedStatus !== 'all' && (
                                <button 
                                    onClick={() => setSelectedStatus('all')}
                                    className="text-xs text-red-500 font-bold hover:underline flex items-center gap-1"
                                >
                                    <X size={12}/> Clear Filters
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredItems.map((item) => (
                        <div key={item._id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300 overflow-hidden group">
                            {/* Card Top: Item Number & Status */}
                            <div className="p-5 flex justify-between items-start border-b border-gray-50">
                                <div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Item #</span>
                                    <h3 className="font-mono font-bold text-gray-900 text-xl">{item.itemNumber}</h3>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter border flex items-center gap-1.5 ${getStatusStyle(item.status)}`}>
                                    {getStatusIcon(item.status)}
                                    {item.status}
                                </span>
                            </div>

                            {/* Card Body */}
                            <div className="p-5 space-y-4">
                                {/* Product Info */}
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Product</p>
                                    <p className="font-bold text-gray-900">{item.product?.name || 'N/A'}</p>
                                    <p className="text-xs text-gray-500 font-mono">{item.product?.code || 'N/A'}</p>
                                </div>

                                {/* Chassis Number */}
                                {item.chassisNumber && (
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Chassis</p>
                                        <p className="text-sm font-mono text-gray-700">{item.chassisNumber}</p>
                                    </div>
                                )}

                                {/* Maintenance Count */}
                                {item.maintenanceHistory && item.maintenanceHistory.length > 0 && (
                                    <div className="bg-orange-50 p-2 rounded-xl flex items-center gap-2">
                                        <Wrench size={14} className="text-orange-600" />
                                        <span className="text-[10px] font-bold text-orange-700">
                                            {item.maintenanceHistory.length} Maintenance Record{item.maintenanceHistory.length > 1 ? 's' : ''}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Card Footer: Action */}
                            <div className="p-5 bg-gray-50/50 flex items-center justify-between border-t border-gray-100 mt-auto">
                                <div className="text-xs text-gray-500">
                                    Added {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </div>
                                <button 
                                    onClick={() => navigate(`/admin/items/${item._id}`)}
                                    className="p-3 bg-white border border-gray-200 rounded-xl text-gray-900 hover:bg-gray-900 hover:text-white transition shadow-sm"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Empty State */}
            {filteredItems.length === 0 && (
                <div className="text-center py-20">
                    <p className="text-gray-400 font-medium italic">No items found matching your search.</p>
                </div>
            )}
        </div>
    );
};

export default ItemList;
