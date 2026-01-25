import React, { useEffect } from 'react';
import { Search, Phone, MessageSquare, Clock, CreditCard, Truck, Store, MessageCircle, ArrowRight } from 'lucide-react';

const HowItWorks = () => {
    useEffect(() => {
        document.title = 'City Cycling | How It Works';
        window.scrollTo(0, 0);
    }, []);

    const steps = [
        {
            title: "Check Availability",
            description: "Browse our collection online. Check real-time availability on our website or reach out via Call or WhatsApp for personalized assistance.",
            icon: <Search className="text-blue-600" size={32} />,
            color: "bg-blue-50"
        },
        {
            title: "Choose Your Plan",
            description: "Whether you need a ride for a day or a week, we've got you covered with flexible Daily and Weekly rates designed to fit your schedule.",
            icon: <Clock className="text-purple-600" size={32} />,
            color: "bg-purple-50"
        },
        {
            title: "Secure Your Booking",
            description: "Complete your booking with a small security deposit. Our transparent pricing ensures no hidden costs—details are clearly listed on every product page.",
            icon: <CreditCard className="text-green-600" size={32} />,
            color: "bg-green-50"
        },
        {
            title: "Get Riding",
            description: "Pick up your bike from our hub or opt for doorstep delivery. The choice is yours! Simply provide your ID, and you're ready to explore.",
            icon: <Truck className="text-orange-600" size={32} />,
            color: "bg-orange-50"
        }
    ];

    return (
        <div className="bg-white min-h-screen">
            {/* Hero Section */}
            <div className="relative h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden">
                <img 
                    src="/images/hero.png" 
                    alt="Cycling in city" 
                    className="absolute inset-0 w-full h-full object-cover brightness-[0.4]"
                />
                <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
                    <h1 className="text-4xl md:text-6xl font-black text-white mb-6 drop-shadow-2xl">
                        Simple. Secure. <br/>
                        <span className="text-blue-400">Pure Joy of Cycling.</span>
                    </h1>
                    <p className="text-lg md:text-xl text-gray-200 font-medium mb-8 drop-shadow-md max-w-2xl mx-auto leading-relaxed">
                        Experience Bangalore on two wheels effortlessly. Here's your guide to getting on the road with CityCycling.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <a href="/catalogue" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full font-bold transition-all shadow-xl hover:scale-105 flex items-center gap-2">
                            Explore Catalogue <ArrowRight size={18} />
                        </a>
                        <a href="https://wa.me/918971552453" target="_blank" rel="noreferrer" className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/30 px-8 py-4 rounded-full font-bold transition-all">
                            Chat with us
                        </a>
                    </div>
                </div>
            </div>

            {/* How It Works Steps */}
            <div className="max-w-7xl mx-auto px-6 py-24">
                <div className="text-center mb-20">
                    <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 tracking-tight">THE RENTAL JOURNEY</h2>
                    <div className="w-20 h-1.5 bg-blue-600 mx-auto rounded-full"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {steps.map((step, index) => (
                        <div key={index} className="relative group p-8 rounded-[2.5rem] border border-gray-100 bg-white hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-500">
                            <div className={`w-16 h-16 ${step.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
                                {step.icon}
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-3">{step.title}</h3>
                            <p className="text-gray-600 leading-relaxed text-sm">
                                {step.description}
                            </p>
                            <div className="absolute top-6 right-8 text-gray-50 font-black text-7xl -z-10 group-hover:text-gray-100 transition-colors duration-500">
                                {index + 1}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Delivery vs Pick-up Section */}
            <div className="bg-gray-50/50 py-24 border-y border-gray-100">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col lg:flex-row items-center gap-16 md:gap-24">
                        <div className="flex-1 space-y-8">
                            <h2 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight">
                                Delivering Convenience <br/>
                                <span className="text-blue-600">To Your Doorstep</span>
                            </h2>
                            <p className="text-lg text-gray-600 leading-relaxed">
                                We've simplified logistics so you can focus on the ride. Choose the option that fits your schedule best.
                            </p>
                            
                            <div className="space-y-6">
                                <div className="flex items-start gap-5 p-6 bg-white rounded-3xl shadow-sm border border-gray-50 hover:shadow-md transition-shadow">
                                    <div className="flex-shrink-0 bg-blue-50 p-3 rounded-xl">
                                        <Store className="text-blue-600" size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 mb-1">Self Pick-up</h4>
                                        <p className="text-sm text-gray-600">Pick up directly from our hub in Bangalore. It's free of charge and gives you a chance to meet our team.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-5 p-6 bg-white rounded-3xl shadow-sm border border-gray-50 hover:shadow-md transition-shadow">
                                    <div className="flex-shrink-0 bg-orange-50 p-3 rounded-xl">
                                        <Truck className="text-orange-600" size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 mb-1">Hassle-Free Delivery</h4>
                                        <p className="text-sm text-gray-600">Get your bike delivered to your home or office. We offer delivery and pickup at nominal charges across the city.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 relative">
                            <div className="absolute -inset-10 bg-blue-200/20 rounded-full blur-3xl"></div>
                            <img 
                                src="/images/delivery.png" 
                                alt="Delivery illustration" 
                                className="relative z-10 w-full max-w-lg mx-auto drop-shadow-2xl rounded-[3rem]"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Support CTA */}
            <div className="max-w-7xl mx-auto px-6 py-24">
                <div className="bg-gray-900 rounded-[3rem] p-10 md:p-20 text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-3xl group-hover:bg-blue-600/30 transition-colors duration-700"></div>
                    
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <h2 className="text-3xl md:text-5xl font-black mb-8">Need custom assistance?</h2>
                        <p className="text-gray-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
                            Not sure which bike or plan is right for you? Our experts are available on Call and WhatsApp to guide you.
                        </p>
                        <div className="flex flex-wrap justify-center gap-6">
                            <a href="tel:+918971552453" className="bg-white text-gray-900 px-10 py-5 rounded-2xl font-black flex items-center gap-3 transition-all hover:scale-105 shadow-[0_10px_30px_rgba(255,255,255,0.2)]">
                                <Phone size={24} /> Call Now
                            </a>
                            <a href="https://wa.me/918971552453" target="_blank" rel="noreferrer" className="bg-[#25D366] text-white px-10 py-5 rounded-2xl font-black flex items-center gap-3 transition-all hover:scale-105 shadow-[0_10px_30px_rgba(37,211,102,0.3)]">
                                <MessageCircle size={24} /> WhatsApp Us
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Pricing Note */}
            <div className="pb-16 text-center px-6">
                <p className="text-gray-400 text-sm italic font-medium">
                    * Security deposit and rental rates vary by bike model. Please refer to individual product pages for the specific security deposit clause.
                </p>
            </div>
        </div>
    );
};

export default HowItWorks;
