const mongoose = require('mongoose');
const config = require('./config');
const Order = require('./models/Order');
const Product = require('./models/Product');

const checkAvailability = async () => {
    try {
        console.log('1. Connecting to MongoDB...');
        await mongoose.connect(config.MONGODB_URI);
        console.log('Connected.');

        const orderId = 'CC-2026-6633';
        const targetProductId = '6966050aee78d13f823c31ea'; 

        console.log(`2. Fetching Order: ${orderId}...`);
        const order = await Order.findOne({ orderId });

        if (!order) {
            console.error('Order not found!');
            return;
        }
        console.log('Order found. Status:', order.orderStatus);
        
        // Find the booking
        const booking = order.bookings.find(b => b.product.toString() === targetProductId || (b.product._id && b.product._id.toString() === targetProductId));
        
        let productToFetchId = targetProductId;

        if (booking) {
            console.log(`3. Booking found for product ${targetProductId}:`);
            console.log(`   Start: ${booking.startDate}`);
            console.log(`   End:   ${booking.endDate}`);
            console.log(`   Qty:   ${booking.quantity}`);
            productToFetchId = booking.product.toString(); // Ensure we use the ID from the booking
        } else {
            console.log(`3. Product ${targetProductId} NOT found in order bookings.`);
            console.log('   Bookings:', order.bookings.map(b => b.product.toString()));
        }

        console.log(`4. Fetching Product: ${productToFetchId}...`);
        const product = await Product.findById(productToFetchId);

        if (product) {
            console.log(`5. Product Details:`);
            console.log(`   Name: ${product.name}`);
            console.log(`   Total Inventory: ${product.inventoryCount}`);
            
            if (product.availability) {
                console.log('   Availability Map (Snapshot):', JSON.stringify(Object.fromEntries(product.availability), null, 2));
            } else {
                console.log('   Availability Map is undefined/null');
            }

            if (booking) {
                console.log('\n6. Analysis for Booking Dates:');
                const start = new Date(booking.startDate);
                const end = new Date(booking.endDate);
                
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const dateStr = d.toISOString().split('T')[0];
                    const availableRaw = product.availability ? product.availability.get(dateStr) : 'N/A';
                     // If existing map doesn't have the key, it typically assumes max inventory, OR it might be 0? 
                     // Usually maps store *booked* count or *available* count. 
                     // Product.js comment says: "Value: Number of available units for that day."
                     // If key is missing, it usually means FULL inventory is available (unless logic says otherwise).
                    console.log(`   ${dateStr}: Map Value = ${availableRaw} (Undefined usually means ${product.inventoryCount})`);
                }
            }
        } else {
            console.error('Product not found in DB.');
        }

        console.log('\n7. Checking for conflicting active orders...');
        const conflictingOrders = await Order.find({
            'bookings.product': targetProductId,
            'orderStatus': { $in: ['On-Hold', 'Confirmed', 'In-Progress'] },
            '_id': { $ne: order._id } // Exclude the current order
        }).select('orderId orderStatus bookings');

        if (conflictingOrders.length === 0) {
            console.log('   NO conflicting active orders found!');
            console.log('   conclusion: The availability map is likely STALE, but updateOrder check should pass if logic is correct.');
        } else {
            console.log(`   Found ${conflictingOrders.length} conflicting active orders:`);
            conflictingOrders.forEach(o => {
                const b = o.bookings.find(bk => bk.product.toString() === targetProductId);
                console.log(`   - ${o.orderId} (${o.orderStatus}): ${b ? b.startDate.toISOString().split('T')[0] + ' to ' + b.endDate.toISOString().split('T')[0] : 'No booking details'}`);
            });
        }

    } catch (error) {
        console.error('ERROR in script:', error);
    } finally {
        console.log('\n8. Disconnecting...');
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
};

checkAvailability();
