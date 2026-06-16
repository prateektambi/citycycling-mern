import React from 'react';
import { NavLink } from 'react-router-dom';
import { Bike, Phone, MessageCircle, MapPin } from 'lucide-react';
import { STORE_PHONE_NUMBER, STORE_PHONE_NUMBER_FORMATTED, getWhatsAppLink } from '../constants';

const Footer = () => {
    return (
        <footer className="bg-gray-950 text-gray-400 border-t border-gray-800/50">
            {/* Main Footer */}
            <div className="max-w-7xl mx-auto px-6 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    {/* Brand */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Bike className="text-blue-500" size={24} />
                            <span className="text-white font-black text-lg tracking-tight uppercase">CityCycling</span>
                        </div>
                        <p className="text-sm leading-relaxed opacity-80">
                            Premium cycle rentals for your daily commute, fitness goals, or weekend adventures in Bangalore.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div className="space-y-4">
                        <h4 className="text-white font-bold text-xs uppercase tracking-widest">Quick Links</h4>
                        <ul className="space-y-2">
                            <li><NavLink to="/catalogue" className="text-sm hover:text-blue-400 transition-colors">Book Online</NavLink></li>
                            <li><NavLink to="/how-it-works" className="text-sm hover:text-blue-400 transition-colors">How It Works</NavLink></li>
                            <li><NavLink to="/blog" className="text-sm hover:text-blue-400 transition-colors">Journal</NavLink></li>
                            <li><NavLink to="/leave-request" className="text-sm hover:text-blue-400 transition-colors">Leave a Request</NavLink></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div className="space-y-4">
                        <h4 className="text-white font-bold text-xs uppercase tracking-widest">Contact</h4>
                        <ul className="space-y-3">
                            <li>
                                <a href={`tel:+91${STORE_PHONE_NUMBER}`} className="flex items-center gap-2 text-sm hover:text-blue-400 transition-colors">
                                    <Phone size={14} /> {STORE_PHONE_NUMBER_FORMATTED}
                                </a>
                            </li>
                            <li>
                                <a href={getWhatsAppLink(STORE_PHONE_NUMBER)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm hover:text-green-400 transition-colors">
                                    <MessageCircle size={14} /> WhatsApp Us
                                </a>
                            </li>
                            <li className="flex items-start gap-2 text-sm">
                                <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                                <span>Mayfair Anthem, Marathalli-Bellendur-Outer Ring Road, Bangalore</span>
                            </li>
                        </ul>
                    </div>

                    {/* Find us on KAYAK */}
                    <div className="space-y-4">
                        <h4 className="text-white font-bold text-xs uppercase tracking-widest">Find us on</h4>
                        <a 
                            href="https://www.kayak.co.uk/Bengaluru.14559.guide" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-block group"
                        >
                            <img 
                                src="https://content.r9cdn.net/rimg/seo/badges/v1/DARK_LARGE_LOGO_KAYAK.png" 
                                alt="Find us on KAYAK" 
                                className="h-10 opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                            />
                        </a>
                        <p className="text-xs leading-relaxed opacity-70">
                            Planning your next trip? Search and compare flights, hotels, and more.
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                            <a 
                                href="https://www.kayak.co.uk/flights" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:text-blue-400 transition-colors"
                            >
                                Search Flights
                            </a>
                            <a 
                                href="https://www.kayak.co.uk/Bengaluru.14559.guide" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:text-blue-400 transition-colors"
                            >
                                Discover Bengaluru
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-gray-800/50">
                <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">
                        Quality · Reliability · Freedom
                    </p>
                    <p className="text-[11px] opacity-50">
                        &copy; {new Date().getFullYear()} CityCycling Bangalore. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
