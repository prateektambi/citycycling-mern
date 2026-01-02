const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    orderId: { type: String, unique: true, required: true },
    
    customer: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        address: String,
        pincode: String
    },

    // --- Simplified Bookings (Quantity Based) ---
    bookings: [{
        product: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Product', 
            required: true 
        },
        quantity: { type: Number, required: true, default: 1 },
        
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        
        rentalType: { type: String, enum: ['Daily', 'Weekly', 'Monthly'] },
        appliedRate: { type: Number, required: true }, // Price per unit
        securityDeposit: { type: Number, required: true }, // Deposit per unit

        bookingStatus: { 
            type: String, 
            enum: ['Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'], 
            default: 'Pending' 
        }
    }],

    logistics: {
        delivery: {
            type: { type: String, enum: ['Self-Pickup', 'Home-Delivery'], default: 'Self-Pickup' },
            charges: { type: Number, default: 0 }
        },
        return: {
            type: { type: String, enum: ['Self-Drop', 'Home-Collection'], default: 'Self-Drop' },
            charges: { type: Number, default: 0 }
        }
    },

    // --- Detailed Financials (Kept from previous version) ---
    financials: {
        totalRental: { type: Number, required: true },
        totalLogistics: { type: Number, default: 0 },
        totalDeposit: { type: Number, required: true },
        grandTotal: { type: Number, required: true },

        paymentHistory: [{
            amount: Number,
            date: { type: Date, default: Date.now },
            method: { type: String, enum: ['Cash', 'UPI', 'Card', 'Bank-Transfer'] },
            transactionId: String,
            note: String
        }],
        
        refundHistory: [{
            amount: Number,
            date: { type: Date, default: Date.now },
            reason: String,
            method: String
        }],

        paymentStatus: { 
            type: String, 
            enum: ['Unpaid', 'Partially-Paid', 'Fully-Paid'], 
            default: 'Unpaid' 
        }
    },

    orderStatus: {
        type: String,
        enum: ['Pending', 'Confirmed', 'In-Progress', 'Completed', 'Cancelled'],
        default: 'Pending'
    },
    
    orderNotes: String
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);