import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Bike, Clock, MapPin, ArrowRight, Phone, MessageCircle, Star, CheckCircle2 } from 'lucide-react';

const HomePage = () => {
    useEffect(() => {
        document.title = 'City Cycling | Premium Cycle Rentals Bangalore';
        window.scrollTo(0, 0);
    }, []);

    const features = [
        {
            title: "Premium Fleet",
            description: "From lightweight hybrids to rugged MTBs, our cycles are professionally maintained for the best riding experience.",
            icon: <Bike className="text-blue-600" size={30} />,
            color: "bg-blue-50"
        },
        {
            title: "Unbeatable Rates",
            description: "No hidden charges. Transparent daily and weekly plans with a security deposit that is easy on your pocket.",
            icon: <CheckCircle2 className="text-green-600" size={30} />,
            color: "bg-green-50"
        },
        {
            title: "Doorstep Delivery",
            description: "Choose your bike online and we will deliver it to your home or office. Or pick it up for free from our hub.",
            icon: <Clock className="text-purple-600" size={30} />,
            color: "bg-purple-50"
        }
    ];

    const stats = [
        { label: "Google Rating", value: "4.9/5", icon: <Star size={20}/> },
    ];

    return (
        <div className="bg-white min-h-screen">
            {/* World-Class Hero Section */}
            <div className="relative h-[85vh] min-h-[600px] flex items-center overflow-hidden">
                <img 
                    src="/images/home-hero.png" 
                    alt="Happy couple cycling in lush greenery" 
                    className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Modern Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
                
                <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
                    <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
                        <span className="inline-block bg-blue-600 text-white text-xs font-black uppercase tracking-[0.3em] px-5 py-2 rounded-full shadow-lg">
                            Bangalore's #1 Cycle Rental
                        </span>
                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[1.05] tracking-tight">
                            Feel the <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-300">Freedom</span> <br/>
                            on Two Wheels.
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-200 font-medium max-w-xl leading-relaxed opacity-90 drop-shadow-md">
                            Premium cycle rentals for your daily commute, fitness goals, or weekend adventures. Simple, secure, and purely joyful.
                        </p>
                        <div className="flex flex-wrap gap-5 pt-4">
                            <NavLink to="/catalogue" className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-2xl font-black transition-all shadow-2xl hover:scale-105 flex items-center gap-2 group">
                                BOOK A RIDE <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                            </NavLink>
                            <NavLink to="/how-it-works" className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/30 px-10 py-5 rounded-2xl font-black transition-all hover:border-white/60">
                                HOW IT WORKS
                            </NavLink>
                        </div>
                    </div>
                </div>
            </div>

            {/* High-Concept Features Section */}
            <div className="max-w-7xl mx-auto px-6 py-24 md:py-32">
                <div className="flex flex-col lg:flex-row items-end justify-between mb-20 gap-8">
                    <div className="max-w-2xl">
                        <div className="text-blue-600 font-black tracking-widest text-xs uppercase mb-4">Why CityCycling?</div>
                        <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-none uppercase">
                            Designed for the <br/>
                            Modern Rider.
                        </h2>
                    </div>
                    <p className="text-gray-500 text-lg font-medium max-w-md lg:text-right">
                        We don't just rent bikes; we provide an ecosystem of health, convenience, and exploration. 
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <div key={index} className="group p-10 rounded-[3rem] border border-gray-100 bg-white hover:shadow-[0_40px_80px_rgba(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-500">
                            <div className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500`}>
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-4 uppercase tracking-tight">{feature.title}</h3>
                            <p className="text-gray-500 leading-relaxed font-medium text-sm">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Trust Stats Row */}
            <div className="bg-gray-50 border-y border-gray-100">
                <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-8 sm:gap-16">
                        {/* Google Rating */}
                        {stats.map((stat, i) => (
                            <div key={i} className="space-y-2 group">
                                <div className="flex items-center justify-center gap-2 text-blue-600 mb-1">
                                    {stat.icon}
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-blue-500 transition-colors">{stat.label}</span>
                                </div>
                                <div className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">{stat.value}</div>
                            </div>
                        ))}

                        {/* Divider */}
                        <div className="hidden sm:block w-px h-16 bg-gray-200"></div>
                        <div className="block sm:hidden w-32 h-px bg-gray-200"></div>

                        {/* Find us on KAYAK */}
                        <a 
                            href="https://www.kayak.co.uk/Bengaluru.14559.guide" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="group flex flex-col items-center gap-2"
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-blue-500 transition-colors">Find us on</span>
                            <img 
                                src="https://content.r9cdn.net/rimg/seo/badges/v1/DARK_LARGE_LOGO_KAYAK.png" 
                                alt="Find us on KAYAK" 
                                className="h-8 md:h-10 opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                            />
                        </a>
                    </div>
                </div>
            </div>

            {/* Informational Hub Section */}
            <div className="bg-gray-900 py-24 md:py-32 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-600/10 blur-[150px] rounded-full"></div>
                <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col lg:flex-row items-center gap-20">
                    <div className="flex-1 space-y-8">
                        <div className="text-blue-500 font-black tracking-widest text-xs uppercase">The Cycle Hub</div>
                        <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight uppercase leading-[0.95]">
                            Find Us in <br/>
                            <span className="text-blue-500">The Heart</span> <br/>
                            of Bangalore.
                        </h2>
                        <div className="space-y-6 pt-4">
                            <div className="flex items-start gap-5">
                                <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-blue-400">
                                    <MapPin size={24}/>
                                </div>
                                <div className="text-gray-300">
                                    <div className="font-bold text-white mb-1">Address</div>
                                    <p className="text-sm font-medium leading-relaxed opacity-80">
                                        Mayfair Anthem, Marathalli-Bellendur-Outer Ring Road, <br/>
                                        Bangalore, 560103. Behind Embassy Tech Village.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-5">
                                <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-blue-400">
                                    <Clock size={24}/>
                                </div>
                                <div className="text-gray-300">
                                    <div className="font-bold text-white mb-1">Timings</div>
                                    <p className="text-sm font-medium opacity-80">6:00 AM — 9:00 PM (Everyday)</p>
                                    <div className="text-[10px] text-orange-400 font-black tracking-widest uppercase mt-2">Call/WhatsApp before coming!</div>
                                </div>
                            </div>
                        </div>
                        <div className="pt-6">
                            <a href="https://www.google.com/maps/place/City+Cycling/@12.9269647,77.6923447,17z" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-white font-black hover:text-blue-400 border-b-2 border-white/20 hover:border-blue-400 pb-2 transition-all uppercase tracking-widest text-sm">
                                Open Google Maps <ArrowRight size={16}/>
                            </a>
                        </div>
                    </div>
                    <div className="flex-1 w-full bg-white/5 border border-white/10 rounded-[3rem] p-4 group">
                        <div className="relative aspect-video rounded-[2.5rem] overflow-hidden bg-gray-800">
                           {/* Decorative Map Placeholder */}
                           <div className="absolute inset-0 flex items-center justify-center opacity-40 group-hover:opacity-60 transition-opacity">
                                <MapPin size={100} className="text-blue-500 animate-pulse" />
                           </div>
                           <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent"></div>
                           <div className="absolute bottom-10 left-10">
                                <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Live Hub</span>
                                <h4 className="text-white text-2xl font-black mt-2 tracking-tight uppercase">Bellandur Center</h4>
                           </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Support CTA Section */}
            <div className="max-w-7xl mx-auto px-6 py-24 md:py-32">
                <div className="flex flex-col lg:flex-row items-center gap-12 p-10 md:p-20 bg-blue-600 rounded-[4rem] text-white shadow-3xl">
                    <div className="flex-1 text-center lg:text-left space-y-6">
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight uppercase">
                            Ready for your <br/> next adventure?
                        </h2>
                        <p className="text-blue-100 text-lg font-medium opacity-90 max-w-xl mx-auto lg:mx-0">
                            Book online now or talk to our experts if you need a custom fleet for events or long-term rentals.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-6">
                        <a href="tel:+918971552453" className="bg-white text-blue-600 px-10 py-5 rounded-2xl font-black flex items-center gap-3 transition-all hover:scale-105 shadow-xl">
                            <Phone size={22} /> CALL US
                        </a>
                        <a href="https://wa.me/918971552453" target="_blank" rel="noreferrer" className="bg-[#25D366] text-white px-10 py-5 rounded-2xl font-black flex items-center gap-3 transition-all hover:scale-105 shadow-xl">
                            <MessageCircle size={22} /> WHATSAPP
                        </a>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default HomePage;
