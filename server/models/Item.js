// server/models/Item.js
const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    itemNumber: { 
        type: String, 
        unique: true, 
    },
    chassisNumber: {
        type: String,
        unique: true,
        sparse: true 
    },
    status: {
        type: String,
        enum: ['available', 'maintenance', 'retired'],
        default: 'available'
    },

    // --- Combined Purchase Info ---
    purchaseDetails: {
        price: { type: Number, default: 0 },
        date: { type: Date },
        vendor: { type: String },
        additionalInfo: { type: String }, // For bill numbers, warranty, etc.
        expectedSellingPrice: { type: Number, default: 0 }
    },

    // --- Maintenance History ---
    maintenanceHistory: [{
        startDate: { type: Date, required: true },
        endDate: { type: Date }, // Optional (if ongoing)
        description: { type: String, required: true },
        cost: { type: Number, default: 0 },
        addedAt: { type: Date, default: Date.now },
        addedBy: { type: String, default: 'Admin' }
    }],

    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Auto-increment logic
ItemSchema.pre('save', async function () {
    if (!this.isNew) return;
    
    const lastItem = await mongoose.model('Item').findOne().sort({ itemNumber: -1 });
    let nextNum = lastItem ? parseInt(lastItem.itemNumber) + 1 : 1;
    this.itemNumber = nextNum.toString().padStart(3, '0');
});

module.exports = mongoose.model('Item', ItemSchema);