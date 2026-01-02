import React, { useState } from 'react';
import { ChevronLeft, User, Phone, MapPin, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CreateOrder = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [orderData, setOrderData] = useState({
        customer: { name: '', phone: '', address: '', pincode: '' },
        bookings: [],
        logistics: { delivery: { type: 'Self-Pickup', charges: 0 } },
        initialPayment: { amount: 0, method: 'Cash' }
    });

    // Handle nested state updates for customer
    const handleCustomerChange = (e) => {
        const { name, value } = e.target;
        setOrderData({
            ...orderData,
            customer: { ...orderData.customer, [name]: value }
        });
    };

    return (
        <div className="bg-white min-h-screen flex flex-col">
            {/* Header */}
            <div className="p-4 flex items-center border-b">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-xl font-bold ml-2">New Order</h1>
                <div className="ml-auto text-xs font-bold text-gray-400">STEP {step} / 3</div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1 bg-gray-100">
                <div 
                    className="h-full bg-blue-600 transition-all duration-300" 
                    style={{ width: `${(step / 3) * 100}%` }}
                />
            </div>

            <div className="p-6 flex-1">
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Customer Info</h2>
                            <p className="text-gray-500 text-sm">Enter the renter's basic details</p>
                        </div>

                        {/* Name Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-gray-400 flex items-center gap-1">
                                <User size={14} /> Full Name
                            </label>
                            <input 
                                type="text"
                                name="name"
                                value={orderData.customer.name}
                                onChange={handleCustomerChange}
                                placeholder="John Doe"
                                className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 text-lg"
                            />
                        </div>

                        {/* Phone Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-gray-400 flex items-center gap-1">
                                <Phone size={14} /> Phone Number
                            </label>
                            <input 
                                type="tel"
                                name="phone"
                                value={orderData.customer.phone}
                                onChange={handleCustomerChange}
                                placeholder="9876543210"
                                className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 text-lg"
                            />
                        </div>

                        {/* Address Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-gray-400 flex items-center gap-1">
                                <MapPin size={14} /> Delivery Address
                            </label>
                            <textarea 
                                name="address"
                                rows="3"
                                value={orderData.customer.address}
                                onChange={handleCustomerChange}
                                placeholder="House no, Street name..."
                                className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 text-lg"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Navigation Button */}
            <div className="p-4 border-t bg-white">
                <button 
                    onClick={() => setStep(2)}
                    disabled={!orderData.customer.name || !orderData.customer.phone}
                    className="w-full bg-blue-600 disabled:bg-gray-300 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition"
                >
                    Next: Select Bikes <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default CreateOrder;