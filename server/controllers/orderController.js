const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const config = require('../config');
const mongoose = require('mongoose');
const { isTotalStockAvailable } = require('../utils/availability');
const { updateProductAvailability } = require('../utils/availabilityUpdater');
const { sendWhatsAppMessage } = require('../utils/whatsappHelper');
const { sendAdminOrderNotification } = require('../utils/emailHelper');


// === CREATE ORDER (With State Management) ===
exports.createOrder = async (req, res) => {
    console.log("Starting createOrder...");
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        let { customer, bookings, logistics, initialPayment } = req.body;

        // Filter out empty bookings (e.g. empty product ID)
        if (bookings && Array.isArray(bookings)) {
            bookings = bookings.filter(b => b.product && b.product.trim() !== '');
        }

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
                const product = await Product.findById(productId).select('name size');
                const pName = product ? `${product.name} (${product.size})` : productId;
                throw new Error(`Stock unavailable for ${pName} on requested dates.`);
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
        // 2. If Admin placing order OR Guest, try to find user by Email first, then Phone Number.
        let userId = null;
        if (req.user && req.user.role === 'user') {
            userId = req.user.id;
        } else if (customer) {
            let existingUser = null;
            
            // Try matching by Email first (more reliable)
            if (customer.email) {
                existingUser = await User.findOne({ email: customer.email.toLowerCase() });
            }
            
            // If not found by email, try matching by phone
            if (!existingUser && customer.phone) {
                existingUser = await User.findOne({ 'profile.phone': customer.phone });
            }

            if (existingUser) {
                userId = existingUser._id;
                console.log(`[createOrder] Linked order to existing user: ${existingUser.email}`);
            } else if (customer.email && customer.name) {
                // AUTO-CREATE USER (Silent Background Registration)
                try {
                    console.log(`[createOrder] Auto-creating user for: ${customer.email}`);
                    const newUser = new User({
                        email: customer.email.toLowerCase(),
                        role: 'user',
                        profile: {
                            name: customer.name,
                            phone: customer.phone,
                            alternatePhone: customer.alternatePhone,
                            address: {
                                street: customer.address || '',
                                pincode: customer.pincode || ''
                            }
                        },
                        accountStatus: 'active',
                        emailVerified: true, // Trusted admin creation
                        authProvider: 'local'
                    });
                    
                    // Note: No password set initially. User must use "Forgot Password" or admin can set it.
                    const savedUser = await newUser.save({ session });
                    userId = savedUser._id;
                    console.log(`[createOrder] Auto-created user: ${savedUser._id}`);
                } catch (userErr) {
                    console.error("[createOrder] User auto-creation failed (non-blocking):", userErr);
                    // We don't throw here to avoid blocking the main order flow
                }
            }
        }

        // Ensure customer email is present for notifications
        if (!customer.email && req.user) {
            try {
                const user = await User.findById(req.user.id);
                if (user && user.email) {
                    customer.email = user.email;
                    console.log(`[createOrder] Populated customer email from user profile: ${customer.email}`);
                }
            } catch (err) {
                console.error('[createOrder] Failed to fetch user email for notification:', err.message);
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

        // Send Email notifications
        const { sendOrderConfirmationEmail } = require('../services/emailService');
        
        // 1. Send to Customer
        if (savedOrder.customer?.email) {
            const customerObj = { 
                email: savedOrder.customer.email, 
                profile: { name: savedOrder.customer.name } 
            };
            sendOrderConfirmationEmail(customerObj, savedOrder).catch(err => 
                console.error(`[EmailService] Customer notification failed:`, err.message)
            );
        }

        // 2. Send to Admins (fire-and-forget)
        sendAdminOrderNotification(savedOrder, 'created').catch(err => 
            console.error(`[EmailHelper] Admin notification failed:`, err.message)
        );

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
            .populate('bookings.product', 'name imageUrls productCode size');
        
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
        let { customer, bookings, logistics, financials, createdAt } = req.body;
        const orderIdStr = req.params.id; // e.g., ORD-123456

        // Filter out empty bookings
        if (bookings && Array.isArray(bookings)) {
            bookings = bookings.filter(b => b.product && b.product.trim() !== '');
        }

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
                const product = await Product.findById(productId).select('name size');
                const pName = product ? `${product.name} (${product.size})` : productId;
                throw new Error(`Stock unavailable for ${pName} on requested dates.`);
            }
        }
        console.log(`[updateOrder] Availability checks passed.`);

        // 3. Perform Update
        console.log(`[updateOrder] Updating document in database for Order ID: ${orderIdStr}`);
        console.log(`[updateOrder] Received createdAt to save: ${createdAt}`);

        const updateObj = { 
            customer, 
            bookings, 
            logistics, 
            financials,
            updatedAt: Date.now() 
        };

        if (createdAt) {
            updateObj.createdAt = new Date(createdAt);
        }

        const updatedOrder = await Order.findOneAndUpdate(
            { orderId: orderIdStr },
            { $set: updateObj },
            { 
                new: true, 
                session,
                timestamps: false // Crucial: Allow manual createdAt update
            }
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
        const orderToCancel = await Order.findOne({ orderId: req.params.id }).session(session);
        if (!orderToCancel) {
            throw new Error('Order not found for cancellation.');
        }

        // 1. Permission Check
        if (req.user && req.user.role !== 'admin') {
            if (!orderToCancel.user || orderToCancel.user.toString() !== req.user.id) {
                throw new Error('Not authorized to cancel this order.');
            }
            // 2. State Check
            if (orderToCancel.orderStatus !== 'On-Hold') {
                throw new Error('Only On-Hold orders can be cancelled directly. Please reach out to us to modify or cancel this order.');
            }
        }

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

        // Send Email notification to Admins (fire-and-forget)
        sendAdminOrderNotification(order, 'cancelled').catch(err => console.error(err));

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
            // Removed: Ensure it's confirmed first check
            
            // Remove operational tags
            order.removeTag('Prepped', performedBy);
            order.removeTag('Awaiting-Pickup', performedBy);
            
            // WhatsApp: Bike Handed Over
            await sendWhatsAppMessage(order, 'bike_handed_over');
            break;

        case 'Returned':
            // Removed: Physical return happened check
            
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

        // ALWAYS trigger availability update for any state change
        // This ensures moving to Returned, Completed, or even In-Progress always refreshes the map
        const productIds = [...new Set(order.bookings.map(b => b.product.toString()))];
        productIds.forEach(productId => {
            updateProductAvailability(productId).catch(err => {
                console.error(`[BACKGROUND_ERROR] Failed to update availability:`, err);
            });
        });

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

// === SEND QUOTATION EMAIL ===
exports.sendQuotationEmail = async (req, res) => {
    try {
        const { toEmail, customerName, quoteNumber, quoteDate, items, transportation, loadingUnloading, startDate, endDate, notes } = req.body;
        
        if (!toEmail) {
            return res.status(400).json({ success: false, message: 'Recipient email address (toEmail) is required.' });
        }

        const { createTransporter, emailConfig } = require('../config/emailConfig');
        const transporter = createTransporter();

        const formatCurrency = (amount) => `₹${(Number(amount) || 0).toLocaleString('en-IN')}`;

        // Calculate totals
        let totalRental = 0;
        let totalDeposit = 0;

        const itemsRows = items.map(item => {
            const qty = Number(item.quantity) || 0;
            const rate = Number(item.rate) || 0;
            const deposit = Number(item.deposit) || 0;
            
            const rentalSubtotal = qty * rate;
            const depositSubtotal = qty * deposit;
            
            totalRental += rentalSubtotal;
            totalDeposit += depositSubtotal;

            return `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${qty}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(rate)}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(rentalSubtotal)}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(deposit)} / cycle</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(depositSubtotal)}</td>
                </tr>
            `;
        }).join('');

        const transportCost = Number(transportation) || 0;
        const loadingCost = Number(loadingUnloading) || 0;
        const grandTotal = totalRental + totalDeposit + transportCost + loadingCost;

        const subject = `Rental Quotation ${quoteNumber ? `#${quoteNumber}` : ''} - CityCycling`;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f5f7; }
                    .container { max-width: 650px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
                    .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px 20px; text-align: center; }
                    .header h1 { margin: 0; font-size: 26px; font-weight: 800; }
                    .header p { margin: 5px 0 0 0; font-size: 14px; opacity: 0.9; text-transform: uppercase; tracking-spacing: 2px; }
                    .content { padding: 30px 25px; }
                    .intro { font-size: 16px; margin-bottom: 20px; }
                    .table-wrapper { width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 25px; }
                    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
                    th { background-color: #f8fafc; padding: 12px 10px; font-weight: 700; color: #475569; border-bottom: 1px solid #e5e7eb; }
                    .financial-summary { margin-left: auto; width: 300px; margin-top: 15px; margin-bottom: 25px; font-size: 14px; }
                    .financial-summary table { width: 100%; }
                    .financial-summary td { padding: 6px 0; }
                    .grand-total { font-size: 18px; font-weight: 800; color: #1d4ed8; }
                    .notes-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 6px; margin-bottom: 25px; font-size: 14px; }
                    .payment-box { background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 20px; border-radius: 8px; margin-bottom: 25px; font-size: 14px; }
                    .payment-box h3 { margin-top: 0; margin-bottom: 15px; color: #1e293b; font-size: 16px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
                    .payment-details { line-height: 1.8; color: #334155; }
                    .footer { text-align: center; padding: 25px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
                    .footer p { margin: 5px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>City Cycling</h1>
                        <p>Cycles Rental Quotation</p>
                    </div>
                    <div class="content">
                        <p class="intro">Hello ${customerName || 'Sir / Madam'},</p>
                        <p class="intro">As discussed, please find below the cycles rental quotation for your reference.</p>
                        
                        <div style="font-size: 13px; color: #64748b; margin-bottom: 15px;">
                            <strong>Quotation No:</strong> ${quoteNumber || 'N/A'} &nbsp;|&nbsp; <strong>Date:</strong> ${quoteDate || new Date().toLocaleDateString('en-IN')}
                            ${startDate && endDate ? `<br/><strong>Event Period:</strong> ${startDate} to ${endDate}` : ''}
                        </div>

                        <div class="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th style="padding: 10px;">Item</th>
                                        <th style="padding: 10px; text-align: center;">Qty</th>
                                        <th style="padding: 10px; text-align: right;">Rate</th>
                                        <th style="padding: 10px; text-align: right;">Rental</th>
                                        <th style="padding: 10px; text-align: right;">Refundable Deposit</th>
                                        <th style="padding: 10px; text-align: right;">Deposit Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsRows}
                                </tbody>
                            </table>
                        </div>

                        <div class="financial-summary">
                            <table>
                                <tr>
                                    <td>Rental Subtotal:</td>
                                    <td style="text-align: right; font-weight: 700;">${formatCurrency(totalRental)}</td>
                                </tr>
                                <tr>
                                    <td>Refundable Security:</td>
                                    <td style="text-align: right; font-weight: 700;">${formatCurrency(totalDeposit)}</td>
                                </tr>
                                <tr>
                                    <td>Transportation (Pick & Drop):</td>
                                    <td style="text-align: right; font-weight: 700;">${formatCurrency(transportCost)}</td>
                                </tr>
                                ${loadingCost > 0 ? `
                                <tr>
                                    <td>Loading/Unloading:</td>
                                    <td style="text-align: right; font-weight: 700;">${formatCurrency(loadingCost)}</td>
                                </tr>
                                ` : ''}
                                <tr style="border-top: 2px solid #e2e8f0;">
                                    <td class="grand-total" style="padding-top: 10px;">Grand Total:</td>
                                    <td class="grand-total" style="text-align: right; padding-top: 10px;">${formatCurrency(grandTotal)}</td>
                                </tr>
                            </table>
                        </div>

                        <div class="notes-box">
                            <strong>Note:</strong> ${notes || 'Usually we refund immediately or by the end of the same day.'}
                        </div>

                        <div class="payment-box">
                            <h3>Payment Details</h3>
                            <div class="payment-details">
                                <strong>Payment mode:</strong><br/>
                                • GPay/Phone Pe: <strong>${config.STORE_GPAY_NUMBER}</strong><br/>
                                • UPI ID: <strong>${config.STORE_UPI_ID}</strong><br/>
                                • Bank Account:<br/>
                                &nbsp;&nbsp;&nbsp;&nbsp;Name: <strong>${config.STORE_ACCOUNT_NAME}</strong><br/>
                                &nbsp;&nbsp;&nbsp;&nbsp;Account Number: <strong>${config.STORE_ACCOUNT_NUMBER}</strong><br/>
                                &nbsp;&nbsp;&nbsp;&nbsp;IFSC Code: <strong>${config.STORE_IFSC}</strong><br/>
                                &nbsp;&nbsp;&nbsp;&nbsp;Bank: <strong>HDFC Bank</strong><br/>
                                <br/>
                                <em>Pls enter first 8 letters of your name in the remarks for the online transaction.</em><br/>
                                <strong>*Please provide the screenshot of the payment once done*.</strong>
                            </div>
                        </div>

                        <p style="font-size: 15px; margin-top: 30px;">Thanks & Regards,<br/><strong>City Cycling</strong></p>
                    </div>
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} CityCycling India. All rights reserved.</p>
                        <p>Need support? Reply to this email or reach us on WhatsApp.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const mailOptions = {
            from: `"${emailConfig.from.name}" <${emailConfig.from.address}>`,
            to: toEmail,
            subject: subject,
            html: html
        };

        console.log(`[QuotationService] Attempting to send quotation to: ${toEmail}`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`[QuotationService] ✅ Quotation email sent successfully: ${info.messageId}`);
        
        res.status(200).json({ success: true, message: `Quotation email successfully sent to ${toEmail}.`, messageId: info.messageId });
    } catch (error) {
        console.error(`[QuotationService] ❌ Failed to send quotation email:`, error);
        res.status(500).json({ success: false, message: `Failed to send email: ${error.message}` });
    }
};


