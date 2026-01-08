const Product = require('../models/Product');
const Order = require('../models/Order');
const mongoose = require('mongoose');
const config = require('../config');

/**
 * Recalculates and updates the availability map for a given product.
 * This function should be called after any order creation, update, or cancellation
 * that affects the product's bookings.
 *
 * @param {string | mongoose.Types.ObjectId} productId The ID of the product to update.
 * @param {mongoose.ClientSession} [session] An optional Mongoose session for transactions.
 */
const updateProductAvailability = async (productId, session) => {
    console.log(`[AvailabilityUpdater] Starting update for product: ${productId}`);

    // 1. Find the product
    const product = await Product.findById(productId).session(session);
    if (!product) {
        console.error(`[AvailabilityUpdater] Product with ID ${productId} not found.`);
        throw new Error(`Product not found for availability update.`);
    }
    const totalInventory = product.inventoryCount;
    console.log(`[AvailabilityUpdater] Product "${product.name}" has total inventory: ${totalInventory}`);

    // 2. Initialize the availability map for the next 120 days
    const availabilityMap = new Map();
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    const availabilityWindow = config.AVAILABILITY_WINDOW_DAYS;

    for (let i = 0; i < availabilityWindow; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
        availabilityMap.set(dateString, totalInventory);
    }
    console.log(`[AvailabilityUpdater] Initialized availability map for ${availabilityWindow} days with base inventory.`);

    // 3. Find all relevant bookings for this product (non-cancelled/completed orders)
    const relevantOrders = await Order.find({
        'bookings.product': productId,
        'orderStatus': { $in: ['Pending', 'Confirmed', 'In-Progress'] }
    }).select('bookings.product bookings.startDate bookings.endDate bookings.quantity').session(session);

    console.log(`[AvailabilityUpdater] Found ${relevantOrders.length} relevant orders for this product.`);

    // 4. Decrement availability based on bookings
    for (const order of relevantOrders) {
        for (const booking of order.bookings) {
            if (booking.product.toString() === productId.toString()) {
                for (let d = new Date(booking.startDate); d <= booking.endDate; d.setDate(d.getDate() + 1)) {
                    const dateString = new Date(d).toISOString().split('T')[0];
                    if (availabilityMap.has(dateString)) {
                        availabilityMap.set(dateString, availabilityMap.get(dateString) - booking.quantity);
                    }
                }
            }
        }
    }
    console.log(`[AvailabilityUpdater] Decremented counts based on active bookings.`);

    // 5. Update the product with the new availability map
    product.availability = availabilityMap;
    await product.save({ session });

    console.log(`[AvailabilityUpdater] Successfully updated availability map for product: ${productId}`);
};

module.exports = {
    updateProductAvailability
};
