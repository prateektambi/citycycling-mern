import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Phone, MessageCircle, ChevronRight, User, ShoppingCart } from 'lucide-react';
import { userService } from '../../services/userService';
import { getWhatsAppLink } from '../../constants';

const UserList = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const data = await userService.getAll();
                setUsers(data || []);
            } catch (err) {
                console.error('Error fetching users:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const filteredUsers = users.filter(user => {
        const name = user.profile?.name?.toLowerCase() || '';
        const email = user.email?.toLowerCase() || '';
        const phone = user.profile?.phone || '';
        const term = searchTerm.toLowerCase();
        return name.includes(term) || email.includes(term) || phone.includes(term);
    });

    const handleWhatsAppCredentials = (user) => {
        const name = user.profile?.name || 'Customer';
        const phone = user.profile?.phone || '';
        const email = user.email;
        const siteUrl = window.location.origin;
        
        const message = `Hello ${name},

Your login has been created on CityCycling.

📧 Email: ${email}

🌐 Login at: ${siteUrl}/login
You can view your orders and payment history in your profile.
Thank you!
Team CityCycling`;

        const url = getWhatsAppLink(phone, message, true);
        window.open(url, '_blank');
    };

    const handleViewOrders = (userId) => {
        navigate(`/admin/orders?user=${userId}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-gray-400 font-bold">Loading Users...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-20 p-4 shadow-sm">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-2xl font-black text-gray-900">Users</h1>
                    <p className="text-sm text-gray-500">{users.length} registered users</p>
                </div>
            </div>

            {/* Search */}
            <div className="max-w-4xl mx-auto p-4">
                <div className="relative mb-6">
                    <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                    />
                </div>

                {/* User List */}
                <div className="grid gap-4">
                    {filteredUsers.map(user => (
                        <div key={user._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                            {/* User Info */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                        <User size={24} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">{user.profile?.name || 'No Name'}</p>
                                        <p className="text-sm text-gray-500">{user.email}</p>
                                        <p className="text-xs text-gray-400">{user.profile?.phone || 'No Phone'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                        user.accountStatus === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        {user.accountStatus || 'active'}
                                    </span>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        Joined: {new Date(user.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2 border-t border-gray-100">
                                <a 
                                    href={`tel:${user.profile?.phone}`}
                                    className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-600 py-3 rounded-xl font-bold text-xs hover:bg-blue-100 transition"
                                >
                                    <Phone size={14} /> Call
                                </a>
                                <button 
                                    onClick={() => handleWhatsAppCredentials(user)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-green-50 text-green-600 py-3 rounded-xl font-bold text-xs hover:bg-green-100 transition"
                                >
                                    <MessageCircle size={14} /> Send Credentials
                                </button>
                                <button 
                                    onClick={() => handleViewOrders(user._id)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-purple-50 text-purple-600 py-3 rounded-xl font-bold text-xs hover:bg-purple-100 transition"
                                >
                                    <ShoppingCart size={14} /> View Orders
                                </button>
                            </div>
                        </div>
                    ))}

                    {filteredUsers.length === 0 && (
                        <div className="text-center py-20">
                            <p className="text-gray-400 font-medium italic">No users found matching your search.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserList;
