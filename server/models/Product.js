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
        unique: true, // Used for creating clean URLs like /catalogue/helmet-standard-M
        required: true 
    },
    description: {
        type: String,
        required: true
    },

    // --- Categorization (The Key Change) ---
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
        required: true,
        min: [0, 'Inventory count cannot be negative'],
        default: 1
    },
    dailyRate: {
        type: Number,
        required: [true, 'Daily rental price is required'],
        min: [0.01, 'Rate must be positive']
    },
    weeklyRate: {
        type: Number,
        required: [true, 'Weekly rental price is required'],
        min: [0.01, 'Rate must be positive']
    },
    monthlyRate: {
        type: Number,
        required: [true, 'Monthly rental price is required'],
        min: [0.01, 'Rate must be positive']
    },
    
    // --- Visuals and Ratings ---
    imageUrls: {
        type: [String], // Array of URLs (hosted on Render, Cloudinary, etc.)
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

    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create and export the model
module.exports = mongoose.model('Product', ProductSchema);