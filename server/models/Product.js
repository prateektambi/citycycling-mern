const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
}, {
    timestamps: true,
});

const ProductSchema = new mongoose.Schema({
    // --- Identification and Core Details ---
    name: {
        type: String,
        required: [true, 'A product name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    slug: {
        type: String,
        unique: true, 
        required: true 
    },
    productCode: { 
        type: String, 
        unique: true, 
        required: true, 
        trim: true 
    },
    description: {
        type: String,
        required: true
    },

    category: {
        type: String,
        // Allows filtering between main rental items and accessories
        enum: ['Cycle', 'Accessory', 'Service'], 
        required: true
    },
    type: {
        type: String,
        // Examples: For 'Cycle': 'Mountain', 'Road', 'Electric'. 
        // For 'Accessory': 'Helmet', 'Lock', 'Rack'.
        required: true 
    },
    size: {
        type: String, 
        required: [true, 'Size is required for cycles'],
        enum: ['S', 'M', 'L', 'XL', 'Universal',  'Kids1-3', 'Kids3-6', 'Kids6-10'],
        trim: true
    },
    minHeightFt: { type: Number },
    minHeightInch: { type: Number },
    maxHeightFt: { type: Number },
    maxHeightInch: { type: Number },
    inventoryCount: {
        type: Number,
        min: [0, 'Inventory count cannot be negative'],
        default: 0
    },
    dailyRate: {
        type: Number,
        required: [true, 'Daily rental price is required'],
        min: [0, 'Rate cannot be negative']
    },
    weeklyRate: {
        type: Number,
        required: [true, 'Weekly rental price is required'],
        min: [0, 'Rate cannot be negative']
    },
    monthlyRate: {
        type: Number,
        required: [true, 'Monthly rental price is required'],
        min: [0, 'Rate cannot be negative']
    },
    weeklyExtraRates: {
        day1: { type: Number, default: 0 },
        day2: { type: Number, default: 0 },
        day3: { type: Number, default: 0 },
        day4: { type: Number, default: 0 },
        day5: { type: Number, default: 0 },
        day6: { type: Number, default: 0 }
    },
    securityDeposit: {
        type: Number,
        default: 500
    },
    
    // --- Visuals and Ratings ---
    imageUrls: {
        type: [String], // Array of URLs (hosted on Render, Cloudinary, etc.)
        default: []
    },
    specifications: {
        type: [String],
        default: []
    },
    averageRating: {
        type: Number,
        default: 0
    },
    numReviews: {
        type: Number,
        default: 0
    },
    reviews: [ReviewSchema],

    /**
     * A map to store daily availability counts.
     * Key: Date string in 'YYYY-MM-DD' format.
     * Value: Number of available units for that day.
     * This will be pre-populated and updated to optimize availability checks.
     */
    availability: {
        type: Map,
        of: Number,
        default: {}
    },

    enableDisplay: {
        type: Boolean,
        default: true
    },

    displayOrder: {
        type: Number,
        default: 100
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create and export the model
module.exports = mongoose.model('Product', ProductSchema);