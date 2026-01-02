const Order = require('../models/Order');
const Product = require('../models/Product');

/**
 * Checks if a product can accommodate ALL requested lines in a single order request.
 */
const isTotalStockAvailable = async (productId, requestedBookings, session = null) => {
    const product = await Product.findById(productId).session(session);
    if (!product) throw new Error(`Product ${productId} not found.`);

    const totalInventory = product.inventoryCount;

    // Find the total date range for this product across all requested lines
    const allDates = requestedBookings.flatMap(b => [new Date(b.startDate), new Date(b.endDate)]);
    const minStart = new Date(Math.min(...allDates));
    const maxEnd = new Date(Math.max(...allDates));

    // Get existing bookings from DB that overlap with this entire range
    const existingOrders = await Order.find({
        orderStatus: { $in: ['Pending', 'Confirmed', 'In-Progress'] },
        bookings: {
            $elemMatch: {
                product: productId,
                startDate: { $lte: maxEnd },
                endDate: { $gte: minStart },
                bookingStatus: { $ne: 'Cancelled' }
            }
        }
    }).session(session);

    // Day-by-Day Occupancy Check
    for (let d = new Date(minStart); d <= maxEnd; d.setDate(d.getDate() + 1)) {
        const currentDay = new Date(d);
        currentDay.setHours(0, 0, 0, 0); // Normalize time to midnight

        let dailyOccupancy = 0;

        // 1. Sum up DB occupancy for this day
        existingOrders.forEach(order => {
            order.bookings.forEach(b => {
                if (b.product.toString() === productId.toString() &&
                    b.bookingStatus !== 'Cancelled' &&
                    new Date(b.startDate) <= currentDay && 
                    new Date(b.endDate) >= currentDay) {
                    dailyOccupancy += b.quantity;
                }
            });
        });

        // 2. Sum up New Order occupancy for this day
        requestedBookings.forEach(b => {
            if (new Date(b.startDate) <= currentDay && 
                new Date(b.endDate) >= currentDay) {
                dailyOccupancy += b.quantity;
            }
        });

        if (dailyOccupancy > totalInventory) return false;
    }
    return true;
};

module.exports = { isTotalStockAvailable };