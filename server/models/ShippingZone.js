const mongoose = require('mongoose');

const ShippingZoneSchema = new mongoose.Schema({
    pincode: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    areas: {
        type: String,
        required: true,
        trim: true
    },
    slab: {
        type: String,
        required: true,
        enum: ['0–5 km', '5–10 km', '10–15 km', '15–25 km', '25–35 km']
    },
    cost: {
        type: Number,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('ShippingZone', ShippingZoneSchema);
