const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    orderId: { type: String, unique: true, required: true },
    
    // Optional link to registered user
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },

    customer: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        alternatePhone: { type: String },
        address: String,
        pincode: String
    },

    bookings: [{
        product: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Product', 
            required: true 
        },
        productCode: { type: String }, 
        quantity: { type: Number, required: true, default: 1 },
        
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        
        rentalType: { type: String, enum: ['Daily', 'Weekly', 'Monthly'] },
        appliedRate: { type: Number, required: true },
        securityDeposit: { type: Number, required: true },
        durationDays: { type: Number }, // Actual number of days
        totalPrice: { type: Number }, // Pre-calculated total for item

        // Keep for backward compatibility but not used in new flow
        bookingStatus: { 
            type: String, 
            enum: ['Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'], 
            default: 'Pending' 
        },
        weeklyExtraRates: {
            day1: { type: Number, default: 0 },
            day2: { type: Number, default: 0 },
            day3: { type: Number, default: 0 },
            day4: { type: Number, default: 0 },
            day5: { type: Number, default: 0 },
            day6: { type: Number, default: 0 }
        },
        isLastDayAvailable: {
            type: Boolean,
            default: true,
            description: "If true, the end date is not counted as occupied, allowing same-day booking."
        }
    }],

    logistics: {
        delivery: {
            type: { type: String, enum: ['Self-Pickup', 'Home-Delivery'], default: 'Self-Pickup' },
            charges: { type: Number, default: 0 },
            actualCost: { type: Number, default: 0 },
            scheduledDate: { type: Date },
            completedDate: { type: Date }
        },
        return: {
            type: { type: String, enum: ['Self-Drop', 'Home-Collection'], default: 'Self-Drop' },
            charges: { type: Number, default: 0 },
            actualCost: { type: Number, default: 0 },
            scheduledDate: { type: Date },
            completedDate: { type: Date }
        }
    },

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
            method: String,
            note: String
        }],

        paymentStatus: { 
            type: String, 
            enum: ['Unpaid', 'Partial', 'Paid'], 
            default: 'Unpaid' 
        }
    },

    // PRIMARY STATE (The 6 States)
    orderStatus: {
        type: String,
        enum: ['On-Hold', 'Confirmed', 'In-Progress', 'Returned', 'Cancelled', 'Completed'],
        default: 'On-Hold' // Changed from 'Pending'
    },

    // SECONDARY TAGS (The "Issue & Operational" Layer)
    tags: [{
        type: String,
        enum: [
            // Operational Tags (Confirmed stage)
            'Prepped',
            'Delivery-Pending', 
            'Awaiting-Customer-Pickup',
            
            // Issue Tags (In-Progress/Returned)
            'Overdue',
            'Damage-Assessment',
            'Missing-Accessory',
            'Pending-Return-Pickup',
            
            // Accounting Tags
            'Refund-Pending',
            'Pending-Settlement'
        ]
    }],

    // Activity Log for Transparency
    activityLog: [{
        action: { type: String, required: true }, // e.g., "Status Changed", "Tag Added", "Payment Received"
        details: { type: String }, // e.g., "On-Hold → Confirmed"
        performedBy: { type: String }, // Admin name/ID
        timestamp: { type: Date, default: Date.now }
    }],
    
    orderNotes: String,

    // Inventory Block Tracking
    inventoryBlocked: {
        type: Boolean,
        default: false
    },
    inventoryBlockedAt: { type: Date },
    allowPartialRates: {
        type: Boolean,
        default: true
    }

}, { timestamps: true });

// Method to add activity log entry
OrderSchema.methods.addActivity = function(action, details, performedBy = 'System') {
    this.activityLog.push({ action, details, performedBy });
};

// Method to add tag with logging
OrderSchema.methods.addTag = function(tag, performedBy = 'Admin') {
    if (!this.tags.includes(tag)) {
        this.tags.push(tag);
        this.addActivity('Tag Added', `Added: ${tag}`, performedBy);
    }
};

// Method to remove tag with logging
OrderSchema.methods.removeTag = function(tag, performedBy = 'Admin') {
    const index = this.tags.indexOf(tag);
    if (index > -1) {
        this.tags.splice(index, 1);
        this.addActivity('Tag Removed', `Removed: ${tag}`, performedBy);
    }
};

module.exports = mongoose.model('Order', OrderSchema);