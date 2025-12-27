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
        required: true 
    },
    chassisNumber: {
        type: String,
        unique: true,
        sparse: true 
    },
    status: {
        type: String,
        enum: ['Available', 'InPickup', 'Rented', 'Maintenance', 'Retired'],
        default: 'Available'
    },

    // --- Combined Purchase Info ---
    purchaseDetails: {
        price: { type: Number, default: 0 },
        date: { type: Date },
        vendor: { type: String },
        additionalInfo: { type: String }, // For bill numbers, warranty, etc.
        expectedSellingPrice: { type: Number, default: 0 }
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Auto-increment logic
ItemSchema.pre('save', async function (next) {
    if (!this.isNew) return next();
    try {
        const lastItem = await mongoose.model('Item').findOne().sort({ itemNumber: -1 });
        let nextNum = lastItem ? parseInt(lastItem.itemNumber) + 1 : 1;
        this.itemNumber = nextNum.toString().padStart(3, '0');
        next();
    } catch (err) {
        next(err);
    }
});

module.exports = mongoose.model('Item', ItemSchema);