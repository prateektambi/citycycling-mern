import React, { useState } from 'react';
import { MessageSquare, ArrowRight, User, Bike, MapPin, Calendar, Hourglass, HelpCircle, Compass, GraduationCap } from 'lucide-react';
import { STORE_PHONE_NUMBER, getWhatsAppLink } from '../constants';

const WhatsAppForm = ({ title, subtitle }) => {
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    height: '',
    cycleType: '',
    startDate: '',
    duration: '',
    location: '',
    usage: '',
    role: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const selectCycleType = (type) => {
    setFormData((prev) => ({ ...prev, cycleType: type }));
  };

  const selectRole = (role) => {
    setFormData((prev) => ({ ...prev, role }));
  };

  const buildMessage = () => {
    let msg = `Hello, Thank you for reaching to us at City Cycling.\n\nPlease let us know your requirements :\n\n`;
    msg += `Name: ${formData.name || 'Not specified'}\n\n`;
    msg += `How many cycles you need: ${formData.quantity || 'Not specified'}\n\n`;
    msg += `Height of rider(s): ${formData.height || 'Not specified'}\n\n`;
    msg += `Type of cycle-Gear/Non-Gear: ${formData.cycleType || 'Not specified'}\n\n`;
    msg += `When you want the cycles: ${formData.startDate || 'Not specified'}\n\n`;
    msg += `Approx duration: ${formData.duration || 'Not specified'}\n\n`;
    msg += `Where are you located : ${formData.location || 'Not specified'}\n\n`;
    msg += `What is your usage f.e. short or long distances, or kms a day you want to ride?: ${formData.usage || 'Not specified'}\n\n`;
    msg += `Are you Student/Professional ?: ${formData.role || 'Not specified'}`;
    return msg;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formattedMsg = buildMessage();
    const link = getWhatsAppLink(STORE_PHONE_NUMBER, formattedMsg);
    window.open(link, '_blank');
  };

  const handleSkip = () => {
    const link = getWhatsAppLink(STORE_PHONE_NUMBER);
    window.open(link, '_blank');
  };

  return (
    <div className="max-w-3xl mx-auto my-8 p-1">
      <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-2xl rounded-3xl overflow-hidden">
        {/* Decorative Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-10 text-white relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-indigo-500/30 rounded-full blur-xl"></div>
          
          <div className="relative z-10">
            <h2 className="text-3xl font-extrabold tracking-tight mb-2">
              {title || 'Quick Rental Inquiry'}
            </h2>
            <p className="text-blue-100/90 text-sm max-w-xl">
              {subtitle || 'Fill in the details below to format your message automatically, or skip to start chatting directly.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                <User size={16} className="text-blue-500" />
                Name <span className="text-xs text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. John Doe"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50"
              />
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <label htmlFor="quantity" className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Bike size={16} className="text-blue-500" />
                How many cycles you need <span className="text-xs text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="e.g. 1 cycle, 3 cycles"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50"
              />
            </div>

            {/* Height */}
            <div className="space-y-2">
              <label htmlFor="height" className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Compass size={16} className="text-blue-500" />
                Height of rider(s) <span className="text-xs text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                id="height"
                name="height"
                value={formData.height}
                onChange={handleChange}
                placeholder="e.g. 5'8\" or 175cm"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50"
              />
            </div>

            {/* Cycle Type */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                <HelpCircle size={16} className="text-blue-500" />
                Type of cycle <span className="text-xs text-gray-400 font-normal">(Optional)</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Gear', 'Non-Gear', 'Not Sure'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => selectCycleType(type)}
                    className={`py-2 px-3 text-sm font-medium rounded-xl border transition-all ${
                      formData.cycleType === type
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* When you want */}
            <div className="space-y-2">
              <label htmlFor="startDate" className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Calendar size={16} className="text-blue-500" />
                When you want the cycles <span className="text-xs text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                placeholder="e.g. From tomorrow, or June 20th"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50"
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label htmlFor="duration" className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Hourglass size={16} className="text-blue-500" />
                Approx duration <span className="text-xs text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                placeholder="e.g. 1 week, 1 month, 3 days"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50"
              />
            </div>

            {/* Location */}
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="location" className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                <MapPin size={16} className="text-blue-500" />
                Where are you located <span className="text-xs text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. HSR Layout, Bellandur, Indiranagar"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50"
              />
            </div>

            {/* Usage */}
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="usage" className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Compass size={16} className="text-blue-500" />
                What is your usage f.e. short or long distances, or kms a day? <span className="text-xs text-gray-400 font-normal">(Optional)</span>
              </label>
              <textarea
                id="usage"
                name="usage"
                rows={2}
                value={formData.usage}
                onChange={handleChange}
                placeholder="e.g. Daily commute of 10 kms, or weekend long rides..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50 resize-none"
              />
            </div>

            {/* Role (Student/Professional) */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                <GraduationCap size={16} className="text-blue-500" />
                Are you Student/Professional? <span className="text-xs text-gray-400 font-normal">(Optional)</span>
              </label>
              <div className="flex flex-wrap gap-3">
                {['Student', 'Professional', 'Other'].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => selectRole(role)}
                    className={`py-2.5 px-6 text-sm font-medium rounded-xl border transition-all ${
                      formData.role === role
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center gap-4">
            {/* Submit / WhatsApp */}
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-4 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold rounded-2xl flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5 shadow-lg shadow-green-500/20"
            >
              <MessageSquare size={20} />
              Submit & Chat on WhatsApp
            </button>

            {/* Skip Option */}
            <button
              type="button"
              onClick={handleSkip}
              className="w-full sm:w-auto px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all"
            >
              Skip and Chat Immediately
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WhatsAppForm;
