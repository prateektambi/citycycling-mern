import React, { useState, useEffect } from 'react';
import logo from '../../assets/logo.png';
import { orderService } from '../../services/orderService';
import { Printer, Mail, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

const QuotationGenerator = () => {
    // State for Quotation Info
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [quoteNumber, setQuoteNumber] = useState('');
    const [quoteDate, setQuoteDate] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // Items state: Defaults to Cycles and Helmets
    const [items, setItems] = useState([
        { id: 1, name: 'Cycles', quantity: 10, rate: 400, deposit: 1000 },
        { id: 2, name: 'Helmets', quantity: 0, rate: 50, deposit: 0 }
    ]);
    
    const [transportation, setTransportation] = useState(2000);
    const [loadingUnloading, setLoadingUnloading] = useState(0);
    const [notes, setNotes] = useState('Usually we refund immediately or by the end of the same day.');

    // Status/Notification states
    const [loadingEmail, setLoadingEmail] = useState(false);
    const [emailSuccess, setEmailSuccess] = useState('');
    const [emailError, setEmailError] = useState('');

    // Generate defaults on mount
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setQuoteDate(today);
        const randomId = Math.floor(1000 + Math.random() * 9000);
        setQuoteNumber(`QT-${new Date().getFullYear()}-${randomId}`);
    }, []);

    // Add item row
    const addItem = () => {
        setItems([...items, { id: Date.now(), name: '', quantity: 1, rate: 0, deposit: 0 }]);
    };

    // Remove item row
    const removeItem = (id) => {
        setItems(items.filter(item => item.id !== id));
    };

    // Handle item cell change
    const handleItemChange = (id, field, value) => {
        setItems(items.map(item => {
            if (item.id === id) {
                return { 
                    ...item, 
                    [field]: field === 'name' ? value : Number(value) || 0 
                };
            }
            return item;
        }));
    };

    // Format currency
    const formatCurrency = (amount) => `₹${(Number(amount) || 0).toLocaleString('en-IN')}`;

    // Calculations
    const rentalSubtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const depositSubtotal = items.reduce((sum, item) => sum + (item.quantity * item.deposit), 0);
    const grandTotal = rentalSubtotal + depositSubtotal + Number(transportation) + Number(loadingUnloading);

    // Send Email Handler
    const handleSendEmail = async () => {
        if (!customerEmail) {
            setEmailError('Please enter a recipient email address.');
            return;
        }
        
        setLoadingEmail(true);
        setEmailSuccess('');
        setEmailError('');

        try {
            const payload = {
                toEmail: customerEmail,
                customerName: customerName || 'Sir / Madam',
                quoteNumber,
                quoteDate: quoteDate ? new Date(quoteDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
                startDate: startDate ? new Date(startDate).toLocaleDateString('en-IN') : '',
                endDate: endDate ? new Date(endDate).toLocaleDateString('en-IN') : '',
                items: items.filter(item => item.name && item.quantity > 0),
                transportation: Number(transportation) || 0,
                loadingUnloading: Number(loadingUnloading) || 0,
                notes
            };

            const response = await orderService.sendQuotationEmail(payload);
            
            if (response.success) {
                setEmailSuccess(`Quotation sent successfully to ${customerEmail}!`);
            } else {
                setEmailError(response.message || 'Failed to send email.');
            }
        } catch (err) {
            console.error('Email send error:', err);
            setEmailError(err.response?.data?.message || 'Error occurred while sending email.');
        } finally {
            setLoadingEmail(false);
        }
    };

    // Print Handler
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8">
            {/* Custom Print CSS to hide Sidebars / Footers / Admin Headers */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .no-print, aside, header, footer { display: none !important; }
                    .print-full-width { width: 100% !important; max-width: 100% !important; border: none !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
                    .min-h-screen { background: white !important; padding: 0 !important; min-height: auto !important; }
                    main { padding: 0 !important; margin: 0 !important; }
                }
            `}} />

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Left Side: Form Inputs */}
                <div className="bg-white rounded-2xl shadow-md p-6 md:p-8 no-print">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-100 flex items-center gap-2">
                        Quotation Builder
                    </h2>

                    {/* Alert Notifications */}
                    {emailSuccess && (
                        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center gap-2 text-sm font-semibold">
                            <CheckCircle2 size={18} />
                            {emailSuccess}
                        </div>
                    )}
                    {emailError && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2 text-sm font-semibold">
                            <AlertCircle size={18} />
                            {emailError}
                        </div>
                    )}

                    <div className="space-y-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Customer Name</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500 focus:bg-white"
                                    placeholder="Enter Customer Name"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Customer Email</label>
                                <input 
                                    type="email" 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500 focus:bg-white"
                                    placeholder="email@example.com"
                                    value={customerEmail}
                                    onChange={(e) => setCustomerEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Quote Number</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500 focus:bg-white font-mono"
                                    value={quoteNumber}
                                    onChange={(e) => setQuoteNumber(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Quote Date</label>
                                <input 
                                    type="date" 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500 focus:bg-white"
                                    value={quoteDate}
                                    onChange={(e) => setQuoteDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Event Start Date</label>
                                <input 
                                    type="date" 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500 focus:bg-white"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Event End Date</label>
                                <input 
                                    type="date" 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500 focus:bg-white"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Dynamic Items Table */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Items List</h3>
                            <button 
                                onClick={addItem}
                                className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                <Plus size={14} /> Add Item
                            </button>
                        </div>
                        <div className="space-y-3">
                            {items.map((item, index) => (
                                <div key={item.id} className="flex gap-2 items-center bg-gray-50 border border-gray-150 p-3 rounded-xl">
                                    <div className="flex-1 grid grid-cols-12 gap-2">
                                        <div className="col-span-5">
                                            <input 
                                                type="text"
                                                className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs focus:outline-none focus:border-blue-500"
                                                placeholder="Item Name (e.g. Cycles)"
                                                value={item.name}
                                                onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <input 
                                                type="number"
                                                className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-center focus:outline-none focus:border-blue-500"
                                                placeholder="Qty"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <input 
                                                type="number"
                                                className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-right focus:outline-none focus:border-blue-500"
                                                placeholder="Rate"
                                                value={item.rate}
                                                onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <input 
                                                type="number"
                                                className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-right focus:outline-none focus:border-blue-500"
                                                placeholder="Deposit"
                                                value={item.deposit}
                                                onChange={(e) => handleItemChange(item.id, 'deposit', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => removeItem(item.id)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                        title="Remove Item"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Logistics and Notes */}
                    <div className="space-y-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Transportation Cost</label>
                                <input 
                                    type="number" 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500 focus:bg-white"
                                    value={transportation}
                                    onChange={(e) => setTransportation(Number(e.target.value) || 0)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Loading/Unloading Charges</label>
                                <input 
                                    type="number" 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500 focus:bg-white"
                                    value={loadingUnloading}
                                    onChange={(e) => setLoadingUnloading(Number(e.target.value) || 0)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Refund / Terms Note</label>
                            <textarea 
                                rows={2}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500 focus:bg-white"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex gap-4">
                        <button 
                            onClick={handlePrint}
                            className="flex-1 bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow transition-all active:scale-95 text-sm"
                        >
                            <Printer size={16} /> Print PDF
                        </button>
                        <button 
                            onClick={handleSendEmail}
                            disabled={loadingEmail}
                            className={`flex-1 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow transition-all active:scale-95 text-sm ${
                                loadingEmail ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                        >
                            <Mail size={16} />
                            {loadingEmail ? 'Sending Email...' : 'Send via Email'}
                        </button>
                    </div>
                </div>

                {/* Right Side: Live Premium Invoice Preview */}
                <div className="print-full-width bg-white sm:border border-gray-200 sm:shadow-lg sm:rounded-2xl p-6 sm:p-10 flex flex-col justify-between">
                    <div>
                        {/* Header */}
                        <div className="flex justify-between items-start border-b border-gray-100 pb-6 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 flex items-center justify-center">
                                    <img src={logo} alt="City Cycling Logo" className="w-full h-full object-contain" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black tracking-tight text-gray-900">City Cycling</h1>
                                    <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Premium Rentals</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Quotation</h2>
                                <div className="font-mono text-base font-bold bg-gray-50 px-3 py-1 rounded inline-block border border-gray-100">
                                    {quoteNumber || 'QT-XXXX'}
                                </div>
                            </div>
                        </div>

                        {/* Customer Info */}
                        <div className="grid grid-cols-2 gap-8 mb-6 text-sm">
                            <div>
                                <h3 className="text-[10px] font-black tracking-widest text-gray-400 uppercase mb-2">Reference To</h3>
                                <p className="font-bold text-base text-gray-800">{customerName || 'Valued Customer'}</p>
                                {customerEmail && <p className="text-gray-500 mt-1">{customerEmail}</p>}
                            </div>
                            <div className="text-right text-xs">
                                <h3 className="text-[10px] font-black tracking-widest text-gray-400 uppercase mb-2">Quotation Details</h3>
                                <p className="text-gray-600">Date: <strong className="text-gray-900">{quoteDate ? new Date(quoteDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today'}</strong></p>
                                {startDate && endDate && (
                                    <p className="text-gray-600 mt-1">Event Period: <strong className="text-gray-900">{new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} → {new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></p>
                                )}
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                                    <tr>
                                        <th className="p-3 border-b border-gray-200">Item Name</th>
                                        <th className="p-3 border-b border-gray-200 text-center">Qty</th>
                                        <th className="p-3 border-b border-gray-200 text-right">Rate</th>
                                        <th className="p-3 border-b border-gray-200 text-right">Subtotal</th>
                                        <th className="p-3 border-b border-gray-200 text-right">Caution Deposit</th>
                                        <th className="p-3 border-b border-gray-200 text-right">Deposit Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-gray-700 text-xs">
                                    {items.filter(item => item.name && item.quantity > 0).map((item, idx) => (
                                        <tr key={item.id || idx} className="bg-white">
                                            <td className="p-3 font-bold text-gray-900">{item.name}</td>
                                            <td className="p-3 text-center">{item.quantity}</td>
                                            <td className="p-3 text-right">{formatCurrency(item.rate)}</td>
                                            <td className="p-3 text-right font-bold text-gray-900">{formatCurrency(item.quantity * item.rate)}</td>
                                            <td className="p-3 text-right">{formatCurrency(item.deposit)}/cycle</td>
                                            <td className="p-3 text-right font-bold text-gray-900">{formatCurrency(item.quantity * item.deposit)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Financial Summaries */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm mb-6">
                            <div>
                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-amber-800 text-xs leading-relaxed">
                                    <strong className="block text-amber-900 font-bold uppercase tracking-wider text-[10px] mb-1">Refund Notice</strong>
                                    {notes}
                                </div>
                            </div>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between pb-1.5 border-b border-gray-100">
                                    <span className="text-gray-500">Rental Subtotal</span>
                                    <span className="font-bold text-gray-900">{formatCurrency(rentalSubtotal)}</span>
                                </div>
                                <div className="flex justify-between pb-1.5 border-b border-gray-100">
                                    <span className="text-gray-500">Caution Deposit (Refundable)</span>
                                    <span className="font-bold text-gray-900">{formatCurrency(depositSubtotal)}</span>
                                </div>
                                <div className="flex justify-between pb-1.5 border-b border-gray-100">
                                    <span className="text-gray-500">Transportation (Approx)</span>
                                    <span className="font-bold text-gray-900">{formatCurrency(transportation)}</span>
                                </div>
                                {loadingUnloading > 0 && (
                                    <div className="flex justify-between pb-1.5 border-b border-gray-100">
                                        <span className="text-gray-500">Loading/Unloading</span>
                                        <span className="font-bold text-gray-900">{formatCurrency(loadingUnloading)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-sm font-black text-gray-900 uppercase">Grand Total</span>
                                    <span className="text-lg font-black text-blue-600">{formatCurrency(grandTotal)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Information */}
                        <div className="border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50 text-xs">
                            <h4 className="font-bold text-gray-900 uppercase tracking-widest text-[10px] mb-2 border-b pb-1">Payment Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 leading-relaxed text-gray-700">
                                <div>
                                    <p>• GPay/Phone Pe: <strong className="text-gray-900">8971552453</strong></p>
                                    <p>• UPI ID: <strong className="text-gray-900">citycycling1@ybl</strong></p>
                                </div>
                                <div>
                                    <p>• Name: <strong className="text-gray-900">Kanika Khandelwal</strong></p>
                                    <p>• Account Number: <strong className="text-gray-900">50200007734914</strong></p>
                                    <p>• IFSC: <strong className="text-gray-900">HDFC0001048</strong> (HDFC Bank)</p>
                                </div>
                            </div>
                            <div className="mt-3 pt-2 border-t border-gray-150 text-[10px] text-gray-500 italic">
                                Pls enter first 8 letters of your name in the remarks for the online transaction.<br/>
                                <strong className="text-red-500">*Please provide the screen shot of the payment once done*.</strong>
                            </div>
                        </div>
                    </div>

                    {/* Regards Footer */}
                    <div className="mt-8 pt-4 border-t border-gray-100 text-center">
                        <p className="text-xs font-bold text-gray-400">Thanks & Regards</p>
                        <p className="text-sm font-black text-blue-600">City Cycling</p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default QuotationGenerator;
