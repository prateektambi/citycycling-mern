const mongoose = require('mongoose');
const OrderSchema = new mongoose.Schema({
    orderId: { type: String, unique: true }, // e.g., CC-2024-001
    
    customer: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        address: { type: String }, 
        pincode: { type: String },
    },

    // --- Items Array with Rental Type ---
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
        
        // Locked-in rental type for this specific item in this order
        rentalType: { 
            type: String, 
            enum: ['Daily', 'Weekly', 'Monthly'], 
            required: true 
        },
        
        appliedRate: { type: Number, required: true }, // Price based on the rentalType
        securityDeposit: { type: Number, required: true } // Deposit for THIS item
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

    financials: {
        totalRental: { type: Number, required: true },
        totalLogistics: { type: Number, default: 0 },
        totalDeposit: { type: Number, required: true },
        grandTotal: { type: Number, required: true }, // (Rental + Logistics)

        // PAYMENT HISTORY (Ledger)
        paymentHistory: [{
            amount: Number,
            date: { type: Date, default: Date.now },
            method: { type: String, enum: ['Cash', 'UPI', 'Card'] },
            note: String
        }],
        
        // REFUND HISTORY (For Deposits)
        refundHistory: [{
            amount: Number,
            date: { type: Date, default: Date.now },
            reason: String, // e.g., "Full security deposit return"
            status: { type: String, enum: ['Pending', 'Completed'], default: 'Completed' }
        }]
    },

    orderNotes: { type: String },
    orderStatus: {
        type: String,
        enum: ['Booked', 'Active', 'Completed', 'Cancelled'],
        default: 'Booked'
    }
});

// Create and export the model
module.exports = mongoose.model('Order', OrderSchema);