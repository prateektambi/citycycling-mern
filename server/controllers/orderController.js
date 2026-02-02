const Order = require('../models/Order');
const User = require('../models/User');
const mongoose = require('mongoose');
const { isTotalStockAvailable } = require('../utils/availability');
const { updateProductAvailability } = require('../utils/availabilityUpdater');
const { sendWhatsAppMessage } = require('../utils/whatsappHelper');


// === CREATE ORDER (With State Management) ===
exports.createOrder = async (req, res) => {
    console.log("Starting createOrder...");
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { customer, bookings, logistics, initialPayment } = req.body;

        if (!bookings || !Array.isArray(bookings) || bookings.length === 0) {
            throw new Error("Order must contain at least one booking.");
        }

        // VALIDATE AVAILABILITY (Check stock before blocking)
        const groupedByProduct = bookings.reduce((acc, b) => {
            acc[b.product] = acc[b.product] || [];
            acc[b.product].push(b);
            return acc;
        }, {});

        console.log("Validating stock availability for new order...");
        for (const productId in groupedByProduct) {
            const available = await isTotalStockAvailable(
                productId, 
                groupedByProduct[productId], 
                null,
                session
            );
            if (!available) {
                console.error(`Stock unavailable for product: ${productId}`);
                throw new Error(`Stock unavailable for product ${productId} on requested dates.`);
            }
        }

        // Financial calculations
        const safeNum = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };
        
        const totalRental = bookings.reduce((sum, b) => {
            // Note: In some scenarios unitsCharged might be a string like "1w 2d", 
            // but the backend should rely on actual numeric daily count if needed, 
            // or trust the frontend's pre-calculated totalPrice per item if we decide to change the structure.
            // For now, we will use provided values but ensure they are numbers.
            const rate = safeNum(b.appliedRate);
            const qty = safeNum(b.quantity);
            const itemTotal = safeNum(b.totalPrice);
            
            // If the frontend passed totalPrice, use it. Otherwise calculate.
            if (itemTotal > 0) return sum + itemTotal;
            
            // Fallback for older clients or if totalPrice is missing
            return sum + (rate * qty);
        }, 0);

        const totalDeposit = bookings.reduce((sum, b) => sum + (safeNum(b.securityDeposit) * safeNum(b.quantity)), 0);
        const totalLogistics = safeNum(logistics.delivery?.charges) + safeNum(logistics.return?.charges);
        const grandTotal = totalRental + totalLogistics;

        // Payment ledger
        const paymentHistory = [];
        let paymentStatus = 'Unpaid';

        if (initialPayment?.amount > 0) {
            paymentHistory.push({
                ...initialPayment,
                date: new Date(),
                note: initialPayment.note || "Initial Payment"
            });
            paymentStatus = initialPayment.amount >= grandTotal ? 'Paid' : 'Partial';
        }

        // --- 4. CREATE ORDER ---
        const orderId = `CC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        // Match User Logic:
        // 1. If req.user exists (Authenticated Request) and they are NOT admin (User placing order), link directly.
        // 2. If Admin placing order OR Guest, try to find user by Phone Number.
        let userId = null;
        if (req.user && req.user.role === 'user') {
            userId = req.user.id;
        } else if (customer && customer.phone) {
            // Admin created or Guest -> Try to match phone
            const existingUser = await User.findOne({ 'profile.phone': customer.phone });
            if (existingUser) {
                userId = existingUser._id;
                console.log(`[createOrder] Linked order to existing user: ${existingUser.email}`);
            }
        }

        const newOrder = new Order({
            orderId,
            user: userId,
            customer,
            bookings,
            logistics,
            financials: {
                totalRental,
                totalDeposit,
                totalLogistics,
                grandTotal,
                paymentHistory,
                paymentStatus
            },
            orderStatus: 'On-Hold', // Default state
            inventoryBlocked: true,  // Block inventory immediately
            inventoryBlockedAt: new Date()
        });

        newOrder.addActivity('Order Created', `New order in On-Hold state - inventory blocked`, 'System');

        const savedOrder = await newOrder.save({ session });
        
        // Trigger availability update (inventory is now blocked)
        const productIds = [...new Set(savedOrder.bookings.map(b => b.product.toString()))];
        console.log('[createOrder] Triggering availability updates for products:', productIds);
        
        await session.commitTransaction();
        
        // Fire-and-forget availability updates AFTER commit
        productIds.forEach(productId => {
            updateProductAvailability(productId).catch(err => {
                console.error(`[BACKGROUND_ERROR] Failed to update availability:`, err);
            });
        });

        // Send WhatsApp notification
        await sendWhatsAppMessage(savedOrder, 'order_created');

        res.status(201).json({ success: true, order: savedOrder });

    } catch (error) {
        console.error("Error in createOrder:", error.message);
        await session.abortTransaction();
        res.status(400).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

// Get all orders with optional filtering (e.g., status)
exports.getOrders = async (req, res) => {
    try {
        // 1. Check if there is a 'status' in the URL (e.g., ?status=Pending)
        const { status } = req.query;

        // 2. Build a query object
        // If status exists, filter by it. If not, get everything.
        let query = status ? { orderStatus: status } : {};

        // 3. User Role Filtering
        // If logged in User is NOT admin, they can only see their own orders
        if (req.user && req.user.role === 'user') {
            query.user = req.user.id;
        }

        // 4. Execute the find with the query
        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .populate('user', 'email profile.name')
            .populate('bookings.product', 'name imageUrls productCode');
        
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: "Error fetching orders", error });
    }
};

// Get a single order by ID (for the "Edit Order" page)
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.id })
            .populate('bookings.product')
            .populate('user', 'email profile.name profile.phone');
        if (!order) return res.status(404).json({ message: "Order not found" });

        // Security Check: Only Admin or Order Owner can view
        if (req.user.role !== 'admin') {
            // If user is not admin, they must own the order
            if (!order.user || order.user.toString() !== req.user.id) {
                return res.status(403).json({ message: "Not authorized to view this order" });
            }
        }

        res.status(200).json(order);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateOrder = async (req, res) => {
    console.log(`[updateOrder] Request received for Order ID: ${req.params.id}`);
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { customer, bookings, logistics, financials } = req.body;
        const orderIdStr = req.params.id; // e.g., ORD-123456

        console.log(`[updateOrder] Payload Data:`, JSON.stringify({
            customer: customer?.name,
            bookingsCount: bookings?.length,
            logisticsType: logistics?.delivery?.type,
            financialsTotal: financials?.grandTotal
        }, null, 2));

        // 1. Find existing order
        const existingOrder = await Order.findOne({ orderId: orderIdStr }).session(session);
        if (!existingOrder) {
            console.warn(`[updateOrder] Order not found in DB: ${orderIdStr}`);
            throw new Error("Order not found");
        }
        console.log(`[updateOrder] Existing order found (Internal ID: ${existingOrder._id}). Proceeding to validation.`);

        // Collect all product IDs involved, before and after the update, for later recalculation.
        const productIdsBefore = existingOrder.bookings.map(b => b.product.toString());
        const productIdsAfter = bookings.map(b => b.product.toString());
        const allProductIds = [...new Set([...productIdsBefore, ...productIdsAfter])];

        // 2. Availability Check (Excluding this order)
        const groupedByProduct = bookings.reduce((acc, b) => {
            acc[b.product] = acc[b.product] || [];
            acc[b.product].push(b);
            return acc;
        }, {});

        console.log(`[updateOrder] Validating stock availability for ${Object.keys(groupedByProduct).length} products...`);

        for (const productId in groupedByProduct) {
            console.log(`[updateOrder] Checking product: ${productId}`);
            const available = await isTotalStockAvailable(
                productId, 
                groupedByProduct[productId], 
                existingOrder._id, // Pass the internal ID to exclude it
                session
            );
            if (!available) {
                console.error(`[updateOrder] Stock unavailable for product: ${productId}`);
                throw new Error(`Stock unavailable for product ${productId} on requested dates.`);
            }
        }
        console.log(`[updateOrder] Availability checks passed.`);

        // 3. Perform Update
        console.log(`[updateOrder] Updating document in database...`);
        const updatedOrder = await Order.findOneAndUpdate(
            { orderId: orderIdStr },
            { 
                $set: { 
                    customer, 
                    bookings, 
                    logistics, 
                    financials,
                    updatedAt: Date.now() 
                } 
            },
            { new: true, session }
        );

        console.log(`[updateOrder] Update successful. Committing transaction...`);
        await session.commitTransaction();
        console.log(`[updateOrder] Transaction committed. Sending response.`);

        // Fire-and-forget availability updates
        console.log('[updateOrder] Triggering availability updates for products:', allProductIds);
        allProductIds.forEach(productId => {
            updateProductAvailability(productId).catch(err => {
                console.error(`[BACKGROUND_ERROR] Failed to update availability for product ${productId} after order update:`, err);
            });
        });

        res.json(updatedOrder);

    } catch (err) {
        console.error(`[updateOrder] Error encountered:`, err.message);
        await session.abortTransaction();
        console.log(`[updateOrder] Transaction aborted.`);
        res.status(400).json({ message: err.message });
    } finally {
        session.endSession();
        console.log(`[updateOrder] Session ended.`);
    }
};

exports.addPayment = async (req, res) => {
    try {
        const { amount, method, transactionId, note } = req.body;
        const order = await Order.findOne({ orderId: req.params.id });

        order.financials.paymentHistory.push({ amount, method, transactionId, note });
        
        // Recalculate Payment Status
        const totalPaid = order.financials.paymentHistory.reduce((sum, p) => sum + p.amount, 0);
        if (totalPaid >= order.financials.grandTotal) {
            order.financials.paymentStatus = 'Fully-Paid';
        } else if (totalPaid > 0) {
            order.financials.paymentStatus = 'Partially-Paid';
        }

        await order.save();
        res.json(order);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.cancelOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const order = await Order.findOneAndUpdate(
            { orderId: req.params.id },
            { 
                $set: { 
                    orderStatus: 'Cancelled',
                    'bookings.$[].bookingStatus': 'Cancelled'
                } 
            },
            { new: true, session }
        );

        if (!order) {
            throw new Error('Order not found for cancellation.');
        }

        await session.commitTransaction();
        console.log(`[cancelOrder] Order ${order.orderId} cancelled. Transaction committed.`);

        // Fire-and-forget availability updates
        const productIdsToUpdate = [...new Set(order.bookings.map(b => b.product.toString()))];
        console.log('[cancelOrder] Triggering availability updates for products:', productIdsToUpdate);
        productIdsToUpdate.forEach(productId => {
            updateProductAvailability(productId).catch(err => {
                console.error(`[BACKGROUND_ERROR] Failed to update availability for product ${productId} after order cancellation:`, err);
            });
        });

        res.json({ message: "Order cancelled and inventory released", order });
    } catch (err) {
        await session.abortTransaction();
        console.error(`[cancelOrder] Error: ${err.message}. Transaction aborted.`);
        res.status(500).json({ message: err.message });
    } finally {
        session.endSession();
        console.log('[cancelOrder] Session ended.');
    }
};


// === STATE TRANSITION HANDLER ===
// This function manages state changes and triggers necessary side effects
async function handleStateTransition(order, newState, performedBy = 'Admin', session = null) {
    const oldState = order.orderStatus;
    
    // Prevent invalid transitions
    if (oldState === newState) {
        throw new Error(`Order is already in ${newState} state`);
    }

    console.log(`[StateTransition] ${oldState} → ${newState} for Order ${order.orderId}`);
    
    // STATE-SPECIFIC LOGIC
    switch(newState) {
        case 'Confirmed':
            // Inventory already blocked from On-Hold, just update state
            // Remove inquiry-stage tags
            order.removeTag('Delivery-Pending', performedBy);
            
            // WhatsApp: Booking Confirmed
            await sendWhatsAppMessage(order, 'booking_confirmed');
            break;

        case 'In-Progress':
            // Ensure it's confirmed first
            if (oldState !== 'Confirmed') {
                throw new Error('Can only move to In-Progress from Confirmed state');
            }
            
            // Remove operational tags
            order.removeTag('Prepped', performedBy);
            order.removeTag('Awaiting-Pickup', performedBy);
            
            // WhatsApp: Bike Handed Over
            await sendWhatsAppMessage(order, 'bike_handed_over');
            break;

        case 'Returned':
            // Physical return happened
            if (oldState !== 'In-Progress') {
                throw new Error('Can only mark as Returned from In-Progress state');
            }
            
            // Check if overdue and auto-tag
            const now = new Date();
            const endDate = new Date(order.bookings[0]?.endDate);
            if (now > endDate) {
                order.addTag('Overdue', performedBy);
            }
            
            // WhatsApp: Return Received
            await sendWhatsAppMessage(order, 'return_received');
            break;

        case 'Cancelled':
            // Release inventory
            if (order.inventoryBlocked) {
                order.inventoryBlocked = false;
                console.log(`[StateTransition] Inventory RELEASED for cancelled Order ${order.orderId}`);
            }
            
            // Auto-tag if refund needed (only if payment was made)
            const totalPaid = order.financials.paymentHistory.reduce((sum, p) => sum + p.amount, 0);
            if (totalPaid > 0) {
                order.addTag('Refund-Pending', performedBy);
            }
            
            // WhatsApp: Cancellation Notice
            await sendWhatsAppMessage(order, 'order_cancelled');
            break;

        case 'Completed':
            // Final settlement must be done
            if (order.financials.paymentStatus !== 'Paid') {
                throw new Error('Cannot complete order with outstanding balance');
            }
            
            // Clear all tags
            order.tags = [];
            
            // Release inventory (safety check)
            order.inventoryBlocked = false;
            
            // WhatsApp: Order Completed
            await sendWhatsAppMessage(order, 'order_completed');
            break;

        default:
            break;
    }

    // Update state and log
    order.orderStatus = newState;
    order.addActivity('Status Changed', `${oldState} → ${newState}`, performedBy);
    
    return order;
}

// === CHANGE ORDER STATE ===
exports.changeOrderState = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { newState, performedBy } = req.body;
        const order = await Order.findOne({ orderId: req.params.id }).session(session);

        if (!order) {
            throw new Error('Order not found');
        }

        // Handle state transition
        await handleStateTransition(order, newState, performedBy, session);

        // If moving from Confirmed/In-Progress to Cancelled, release inventory
        if (newState === 'Cancelled' && ['On-Hold', 'Confirmed', 'In-Progress'].includes(order.orderStatus)) {
            const productIds = [...new Set(order.bookings.map(b => b.product.toString()))];
            productIds.forEach(productId => {
                updateProductAvailability(productId).catch(err => {
                    console.error(`[BACKGROUND_ERROR] Failed to update availability:`, err);
                });
            });
        }

        await order.save({ session });
        await session.commitTransaction();

        res.json({ success: true, order });

    } catch (error) {
        console.error('Error in changeOrderState:', error.message);
        await session.abortTransaction();
        res.status(400).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

// === ADD/REMOVE TAGS ===
exports.manageTags = async (req, res) => {
    try {
        const { action, tag, performedBy } = req.body; // action: 'add' or 'remove'
        const order = await Order.findOne({ orderId: req.params.id });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (action === 'add') {
            order.addTag(tag, performedBy);
            
            // Trigger WhatsApp for specific tags
            if (tag === 'Damage-Assessment') {
                await sendWhatsAppMessage(order, 'damage_reported');
            }
        } else if (action === 'remove') {
            order.removeTag(tag, performedBy);
        }

        await order.save();
        res.json({ success: true, order });

    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// === GENERATE WHATSAPP LINK ===
exports.generateWhatsApp = async (req, res) => {
    try {
        const { template } = req.body;
        const order = await Order.findOne({ orderId: req.params.id }).populate('bookings.product');
        
        if (!order) return res.status(404).json({ message: 'Order not found' });

        const { getWhatsAppLinkForUI } = require('../utils/whatsappHelper');
        const url = getWhatsAppLinkForUI(order, template);

        if (!url) return res.status(400).json({ message: 'Invalid template or error generating link' });

        res.json({ success: true, url });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};