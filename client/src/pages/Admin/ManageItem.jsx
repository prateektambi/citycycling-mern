import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Wrench, Trash2, Plus, Calendar, DollarSign, FileText, CheckCircle, AlertCircle, Archive, Package } from 'lucide-react';
import axios from 'axios';

const ManageItem = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = id && id !== 'new';

    const [item, setItem] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Form states
    const [productId, setProductId] = useState('');
    const [chassisNumber, setChassisNumber] = useState('');
    const [status, setStatus] = useState('available');
    const [purchaseDetails, setPurchaseDetails] = useState({
        price: 0,
        date: '',
        vendor: '',
        additionalInfo: '',
        expectedSellingPrice: 0
    });

    // Maintenance form
    const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
    const [maintenanceForm, setMaintenanceForm] = useState({
        startDate: '',
        endDate: '',
        description: '',
        cost: 0
    });

    useEffect(() => {
        if (isEdit) {
            fetchItem();
        } else {
            fetchProducts();
            setLoading(false);
        }
    }, [id]);

    const fetchItem = async () => {
        try {
            const res = await axios.get(`/api/items/${id}`);
            const itemData = res.data;
            setItem(itemData);
            setProductId(itemData.product?._id || '');
            setChassisNumber(itemData.chassisNumber || '');
            setStatus(itemData.status || 'available');
            setPurchaseDetails({
                price: itemData.purchaseDetails?.price || 0,
                date: itemData.purchaseDetails?.date ? new Date(itemData.purchaseDetails.date).toISOString().split('T')[0] : '',
                vendor: itemData.purchaseDetails?.vendor || '',
                additionalInfo: itemData.purchaseDetails?.additionalInfo || '',
                expectedSellingPrice: itemData.purchaseDetails?.expectedSellingPrice || 0
            });
            setLoading(false);
        } catch (err) {
            console.error("Error fetching item:", err);
            setLoading(false);
            alert("Failed to load item details.");
            navigate('/admin/items');
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await axios.get('/api/products');
            setProducts(res.data || []);
        } catch (err) {
            console.error("Error fetching products:", err);
        }
    };

    const handleSaveItem = async () => {
        if (!productId && !isEdit) {
            alert('Please select a product');
            return;
        }

        setSaving(true);
        try {
            if (isEdit) {
                await axios.put(`/api/items/${id}`, {
                    chassisNumber,
                    status,
                    purchaseDetails
                });
                alert('Item updated successfully!');
                fetchItem();
            } else {
                await axios.post('/api/items', {
                    product: productId,
                    chassisNumber,
                    status,
                    purchaseDetails
                });
                alert('Item created successfully!');
                navigate('/admin/items');
            }
        } catch (err) {
            console.error("Error saving item:", err);
            alert('Error saving item: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleAddMaintenance = async (e) => {
        e.preventDefault();
        if (!maintenanceForm.startDate || !maintenanceForm.description) {
            alert('Start Date and description are required');
            return;
        }

        try {
            await axios.post(`/api/items/${id}/maintenance`, maintenanceForm);
            alert('Maintenance record added successfully!');
            setMaintenanceForm({ startDate: '', endDate: '', description: '', cost: 0 });
            setShowMaintenanceForm(false);
            fetchItem();
        } catch (err) {
            console.error("Error adding maintenance:", err);
            alert('Error adding maintenance: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDeleteMaintenance = async (maintenanceId) => {
        if (!window.confirm('Are you sure you want to delete this maintenance record?')) return;

        try {
            await axios.delete(`/api/items/${id}/maintenance/${maintenanceId}`);
            alert('Maintenance record deleted successfully!');
            fetchItem();
        } catch (err) {
            console.error("Error deleting maintenance:", err);
            alert('Error deleting maintenance: ' + (err.response?.data?.message || err.message));
        }
    };

    const getStatusIcon = (s) => {
        switch (s) {
            case 'available': return <CheckCircle size={20} />;
            case 'maintenance': return <Wrench size={20} />;
            case 'retired': return <Archive size={20} />;
            default: return <AlertCircle size={20} />;
        }
    };

    const getStatusStyle = (s) => {
        switch (s) {
            case 'available': return 'bg-green-100 text-green-700 border-green-200';
            case 'maintenance': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'retired': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    if (loading) return <div className="p-10 text-center font-bold text-gray-400">Loading...</div>;

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-20 p-4 shadow-sm">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/admin/items')} className="p-2 hover:bg-gray-100 rounded-xl transition">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900">
                                {isEdit ? (
                                    `${item?.product?.category} #${item?.itemNumber}: ${item?.product?.name} (${item?.product?.size})`
                                ) : (
                                    'Add New Physical Item'
                                )}
                            </h1>
                        </div>
                    </div>
                    <button 
                        onClick={handleSaveItem}
                        disabled={saving}
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100 flex items-center gap-2 disabled:opacity-50"
                    >
                        <Save size={18} />
                        {saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Item')}
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
                {!isEdit && (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                        <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                            <Package size={20} className="text-blue-500" />
                            Select Product Catalogue Unit
                        </h2>
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Catalogue Product</label>
                            <select 
                                value={productId}
                                onChange={(e) => setProductId(e.target.value)}
                                className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none transition font-bold"
                            >
                                <option value="">-- Choose from Catalogue --</option>
                                {products.map(p => (
                                    <option key={p._id} value={p._id}>{p.name} ({p.size}) - {p.productCode}</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-gray-400 font-medium italic">This physical item will be linked to the selected catalogue product.</p>
                        </div>
                    </div>
                )}

                {/* Status Card */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-lg font-black text-gray-900 mb-4">Item Status</h2>
                    <div className="flex flex-wrap gap-3">
                        {['available', 'maintenance', 'retired'].map(s => (
                            <button
                                key={s}
                                onClick={() => setStatus(s)}
                                className={`px-4 py-2 rounded-xl font-bold text-sm border-2 transition flex items-center gap-2 ${
                                    status === s 
                                        ? getStatusStyle(s) + ' shadow-md' 
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                {getStatusIcon(s)}
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Basic Details Card */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-lg font-black text-gray-900 mb-4">Basic Details</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Chassis Number</label>
                            <input 
                                type="text"
                                value={chassisNumber}
                                onChange={(e) => setChassisNumber(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-mono"
                                placeholder="Enter chassis number / Serial number"
                            />
                        </div>
                    </div>
                </div>

                {/* Purchase Details Card */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-lg font-black text-gray-900 mb-4">Purchase & Finance Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Purchase Price (₹)</label>
                            <input 
                                type="number"
                                value={purchaseDetails.price}
                                onChange={(e) => setPurchaseDetails({...purchaseDetails, price: parseFloat(e.target.value) || 0})}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-bold"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Purchase Date</label>
                            <input 
                                type="date"
                                value={purchaseDetails.date}
                                onChange={(e) => setPurchaseDetails({...purchaseDetails, date: e.target.value})}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Vendor/Source</label>
                            <input 
                                type="text"
                                value={purchaseDetails.vendor}
                                onChange={(e) => setPurchaseDetails({...purchaseDetails, vendor: e.target.value})}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                placeholder="Vendor name"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Expected Resale/Selling Price</label>
                            <input 
                                type="number"
                                value={purchaseDetails.expectedSellingPrice}
                                onChange={(e) => setPurchaseDetails({...purchaseDetails, expectedSellingPrice: parseFloat(e.target.value) || 0})}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                placeholder="0"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Additional Info</label>
                            <textarea 
                                value={purchaseDetails.additionalInfo}
                                onChange={(e) => setPurchaseDetails({...purchaseDetails, additionalInfo: e.target.value})}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                                placeholder="Bill numbers, warranty info, condition at purchase, etc."
                                rows="3"
                            />
                        </div>
                    </div>
                </div>

                {/* Maintenance History Card - Only show in Edit mode */}
                {isEdit && (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <Wrench size={20} />
                                Maintenance History
                            </h2>
                            <button 
                                onClick={() => setShowMaintenanceForm(!showMaintenanceForm)}
                                className="bg-orange-600 text-white px-4 py-2 rounded-xl hover:bg-orange-700 transition shadow-lg shadow-orange-100 flex items-center gap-2 text-sm font-bold"
                            >
                                <Plus size={16} />
                                Add Maintenance
                            </button>
                        </div>

                        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-6 flex items-start gap-3 shadow-sm">
                            <AlertCircle className="text-orange-600 mt-0.5 shrink-0" size={18} />
                            <p className="text-sm text-orange-800 leading-relaxed">
                                <span className="font-bold">Admin Note:</span> Adding a maintenance record here <span className="italic underline">does not</span> affect the status and availability. Update the <span className="font-bold underline cursor-pointer hover:text-orange-900 transition" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>Item Status</span> manually to reflect its current state.
                            </p>
                        </div>

                        {showMaintenanceForm && (
                            <form onSubmit={handleAddMaintenance} className="bg-orange-50 p-4 rounded-2xl border border-orange-100 mb-4 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Start Date *</label>
                                        <input 
                                            type="date"
                                            value={maintenanceForm.startDate}
                                            onChange={(e) => setMaintenanceForm({...maintenanceForm, startDate: e.target.value})}
                                            className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg focus:ring-2 focus:orange-500 transition text-sm"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">End Date</label>
                                        <input 
                                            type="date"
                                            value={maintenanceForm.endDate}
                                            onChange={(e) => setMaintenanceForm({...maintenanceForm, endDate: e.target.value})}
                                            className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg focus:ring-2 focus:orange-500 transition text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Cost (₹)</label>
                                        <input 
                                            type="number"
                                            value={maintenanceForm.cost}
                                            onChange={(e) => setMaintenanceForm({...maintenanceForm, cost: parseFloat(e.target.value) || 0})}
                                            className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg focus:ring-2 focus:orange-500 transition text-sm"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="md:col-span-3 flex justify-end">
                                        <button 
                                            type="submit"
                                            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition font-bold text-sm"
                                        >
                                            Add Record
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Description *</label>
                                    <textarea 
                                        value={maintenanceForm.description}
                                        onChange={(e) => setMaintenanceForm({...maintenanceForm, description: e.target.value})}
                                        className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg focus:ring-2 focus:orange-500 transition text-sm"
                                        placeholder="Describe the maintenance work..."
                                        rows="2"
                                        required
                                    />
                                </div>
                            </form>
                        )}

                        <div className="space-y-3">
                            {item?.maintenanceHistory && item.maintenanceHistory.length > 0 ? (
                                item.maintenanceHistory
                                    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
                                    .map((record) => (
                                        <div key={record._id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 hover:border-orange-200 transition">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                                            <Calendar size={14} className="text-gray-400" />
                                                            {new Date(record.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                            {record.endDate && (
                                                                <> - {new Date(record.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                                                            )}
                                                        </div>
                                                        {record.cost > 0 && (
                                                            <div className="flex items-center gap-1 text-sm font-bold text-orange-600">
                                                                <DollarSign size={14} />
                                                                ₹{record.cost.toLocaleString()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-700">{record.description}</p>
                                                    <p className="text-xs text-gray-400 mt-2">
                                                        Added by {record.addedBy} on {new Date(record.addedAt).toLocaleDateString('en-IN')}
                                                    </p>
                                                </div>
                                                <button 
                                                    onClick={() => handleDeleteMaintenance(record._id)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                            ) : (
                                <p className="text-center text-gray-400 py-8 italic">No maintenance records yet</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageItem;
