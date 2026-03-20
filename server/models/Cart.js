const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 1
    }
}, { _id: true }); // Each item gets a unique _id for update/delete

const CartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true // One cart per user
    },
    items: [CartItemSchema]
}, {
    timestamps: true
});


module.exports = mongoose.model('Cart', CartSchema);
