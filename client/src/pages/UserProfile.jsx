import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import authService from '../services/authService';
import { User, Phone, MapPin, Mail, Save, Loader, AlertCircle, CheckCircle } from 'lucide-react';

const UserProfile = () => {
  const { user: contextUser, login, logout } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsappNumber: '',
    address: {
      street: '',
      area: '',
      city: '',
      pincode: ''
    }
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await authService.getProfile();
      setProfile(data);
      
      // Initialize form data
      setFormData({
        name: data.profile?.name || '',
        phone: data.profile?.phone || '',
        whatsappNumber: data.profile?.whatsappNumber || '',
        alternatePhone: data.profile?.alternatePhone || '',
        address: {
          street: data.profile?.address?.street || '',
          area: data.profile?.address?.area || '',
          city: data.profile?.address?.city || '',
          pincode: data.profile?.address?.pincode || ''
        }
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      if (error.response && error.response.status === 401) {
        // Token expired or invalid
        logout(); // Auto logout using context
        window.location.href = '/login';
        return;
      }
      setMessage({ type: 'error', text: 'Failed to load profile data.' });
      setLoading(false);
    }
  };

  // ... (rest of component)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }
  
  // If profile failed to load (and we didn't redirect), show error
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col mt-16 text-center px-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
           <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to load profile</h2>
        <p className="text-gray-500 mb-6 max-w-md">We couldn't retrieve your user details. Please try logging in again.</p>
        <button 
          onClick={() => { logout(); window.location.href = '/login'; }}
          className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition"
        >
          Back to Login
        </button>
      </div>
    );
  }
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('addr_')) {
      const addressField = name.split('_')[1];
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, [addressField]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const updatedUser = await authService.updateProfile(formData);
      setProfile(updatedUser);
      // Preserve the token from the existing session so we don't get logged out
      login({ ...updatedUser, token: contextUser.token });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // Clear success message after 3s
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold">
              {profile.profile?.name ? profile.profile.name.charAt(0).toUpperCase() : <User />}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{profile.profile?.name || 'User'}</h1>
              <div className="flex items-center gap-2 text-gray-500">
                <Mail size={16} />
                <span>{profile.email}</span>
                {profile.emailVerified ? (
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <CheckCircle size={12} /> Verified
                  </span>
                ) : (
                  <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <AlertCircle size={12} /> Unverified
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`p-4 rounded-xl flex items-center gap-2 ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Main Info Column */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <User className="text-blue-500" /> Personal Details
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 text-gray-400" size={18} />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alternate / Emergency Contact</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 text-gray-400" size={18} />
                      <input
                        type="tel"
                        name="alternatePhone"
                        value={formData.alternatePhone || ''}
                        onChange={handleChange}
                        placeholder="Optional"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                      />
                    </div>
                  </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">WhatsApp Number</label>
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, whatsappNumber: prev.phone }))}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                            Use Primary Phone
                        </button>
                    </div>
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400">📱</span>
                      <input
                        type="tel"
                        name="whatsappNumber"
                        value={formData.whatsappNumber}
                        onChange={handleChange}
                        placeholder="For delivery updates"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                      />
                    </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <MapPin className="text-blue-500" /> Address Details
              </h2>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street Address / Apt</label>
                  <input
                    type="text"
                    name="addr_street"
                    value={formData.address.street}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Area / Locality</label>
                    <input
                      type="text"
                      name="addr_area"
                      value={formData.address.area}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      name="addr_city"
                      value={formData.address.city}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    name="addr_pincode"
                    value={formData.address.pincode}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar / Actions */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-24">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Actions</h3>
              
              <button
                type="button"
                onClick={() => window.location.href = '/my-orders'}
                className="w-full bg-white text-gray-900 border-2 border-gray-100 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:border-gray-300 hover:bg-gray-50 transition mb-3"
              >
                 <span className="text-xl">📦</span> My Orders
              </button>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition disabled:opacity-70 shadow-lg shadow-blue-200"
              >
                {saving ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};

export default UserProfile;
