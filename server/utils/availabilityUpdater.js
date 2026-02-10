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
        return; // Don't throw to avoid crashing background processes
    }
    const totalInventory = product.inventoryCount;
    console.log(`[AvailabilityUpdater] Product "${product.name}" has total inventory: ${totalInventory}`);

    // 2. Initialize the availability map for the next window
    const availabilityMap = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    
    const availabilityWindow = config.AVAILABILITY_WINDOW_DAYS || 120;

    for (let i = 0; i < availabilityWindow; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        // Use local date string YYYY-MM-DD to match frontend and avoid UTC shifts
        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        availabilityMap[dateString] = totalInventory;
    }

    // 3. Find all relevant bookings for this product (non-cancelled/completed orders)
    const relevantOrders = await Order.find({
        'bookings.product': productId,
        'orderStatus': { $in: ['On-Hold', 'Confirmed', 'In-Progress'] }
    }).select('bookings.product bookings.startDate bookings.endDate bookings.quantity').session(session);

    console.log(`[AvailabilityUpdater] Found ${relevantOrders.length} relevant orders.`);

    // 4. Decrement availability based on bookings
    for (const order of relevantOrders) {
        for (const booking of order.bookings) {
            if (booking.product.toString() === productId.toString()) {
                const start = new Date(booking.startDate);
                const end = new Date(booking.endDate);
                
                // If isLastDayAvailable is true, we consider the bike free on the return date (e.g. returns at 10 AM, rents at 2 PM)
                // So we do not block the endDate.
                const effectiveEnd = new Date(end);
                if (booking.isLastDayAvailable) {
                    effectiveEnd.setDate(effectiveEnd.getDate() - 1);
                }

                for (let d = new Date(start); d <= effectiveEnd; d.setDate(d.getDate() + 1)) {
                    const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    if (availabilityMap[dateString] !== undefined) {
                        availabilityMap[dateString] -= booking.quantity;
                    }
                }
            }
        }
    }

    // 5. Update the product with the new availability map
    product.availability = availabilityMap;
    // For Mongoose Maps, we need to tell it it's modified if we assign a plain object
    product.markModified('availability');
    await product.save({ session });

    console.log(`[AvailabilityUpdater] Successfully updated availability map for product: ${productId}`);
};

module.exports = {
    updateProductAvailability
};
