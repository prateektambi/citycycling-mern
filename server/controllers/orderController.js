const Order = require('../models/Order');
const mongoose = require('mongoose');
const { isTotalStockAvailable } = require('../utils/availability');

exports.createOrder = async (req, res) => {
    console.log("Starting createOrder...");
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { customer, bookings, logistics, initialPayment } = req.body;
        console.log("Request body parsed. Bookings count:", bookings?.length);

        if (!bookings || !Array.isArray(bookings) || bookings.length === 0) {
            throw new Error("Order must contain at least one booking.");
        }

        // --- 1. VALIDATION: GROUP BY PRODUCT ---
        console.log("Grouping bookings by product for validation...");
        const groupedByProduct = bookings.reduce((acc, b) => {
            acc[b.product] = acc[b.product] || [];
            acc[b.product].push(b);
            return acc;
        }, {});

        for (const productId in groupedByProduct) {
            console.log(`Checking availability for product: ${productId}`);
            const available = await isTotalStockAvailable(
                productId, 
                groupedByProduct[productId], 
                null,
                session
            );
            if (!available) {
                console.error(`Stock unavailable for product: ${productId}`);
                throw new Error(`Stock unavailable for some requested dates.`);
            }
        }

        // --- 2. FINANCIAL CALCULATIONS ---
        console.log("Calculating financials...");
        const totalRental = bookings.reduce((sum, b) => {
            const units = b.unitsCharged || 1;
            return sum + (b.appliedRate * b.quantity * units);
        }, 0);
        const totalDeposit = bookings.reduce((sum, b) => sum + (b.securityDeposit * b.quantity), 0);
        const totalLogistics = Number(logistics.delivery?.charges || 0) + Number(logistics.return?.charges || 0);
        const grandTotal = Number(totalRental) + Number(totalLogistics);

        // --- 3. PAYMENT LEDGER ---
        console.log("Processing payment ledger...");
        const paymentHistory = [];
        let paymentStatus = 'Unpaid';

        if (initialPayment?.amount > 0) {
            paymentHistory.push({
                ...initialPayment,
                date: new Date(),
                note: initialPayment.note || "Initial Payment"
            });
            paymentStatus = initialPayment.amount >= grandTotal ? 'Fully-Paid' : 'Partially-Paid';
        }

        // --- 4. CREATE ORDER ---
        const orderId = `CC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        console.log(`Generated Order ID: ${orderId}. Creating Order instance...`);

        const newOrder = new Order({
            orderId,
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
            orderStatus: 'Pending'
        });

        const savedOrder = await newOrder.save({ session });
        console.log("Order saved to database. Committing transaction...");

        await session.commitTransaction();
        console.log("Transaction committed successfully.");
        res.status(201).json({ success: true, order: savedOrder });

    } catch (error) {
        console.error("Error in createOrder. Aborting transaction. Error:", error.message);
        await session.abortTransaction();
        res.status(400).json({ success: false, message: error.message });
    } finally {
        session.endSession();
        console.log("Session ended.");
    }
};

// Get all orders with optional filtering (e.g., status)
exports.getOrders = async (req, res) => {
    try {
        // 1. Check if there is a 'status' in the URL (e.g., ?status=Pending)
        const { status } = req.query;

        // 2. Build a query object
        // If status exists, filter by it. If not, get everything.
        const query = status ? { orderStatus: status } : {};

        // 3. Execute the find with the query
        const orders = await Order.find(query).sort({ createdAt: -1 });
        
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: "Error fetching orders", error });
    }
};

// Get a single order by ID (for the "Edit Order" page)
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.id }).populate('bookings.product');
        if (!order) return res.status(404).json({ message: "Order not found" });
        res.status(200).json(order);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { customer, bookings, logistics, financials } = req.body;
        const orderIdStr = req.params.id; // e.g., ORD-123456

        // 1. Find existing order
        const existingOrder = await Order.findOne({ orderId: orderIdStr }).session(session);
        if (!existingOrder) throw new Error("Order not found");

        // 2. Availability Check (Excluding this order)
        const groupedByProduct = bookings.reduce((acc, b) => {
            acc[b.product] = acc[b.product] || [];
            acc[b.product].push(b);
            return acc;
        }, {});

        for (const productId in groupedByProduct) {
            const available = await isTotalStockAvailable(
                productId, 
                groupedByProduct[productId], 
                existingOrder._id, // Pass the internal ID to exclude it
                session
            );
            if (!available) {
                throw new Error(`Stock unavailable for product ${productId} on requested dates.`);
            }
        }

        // 3. Perform Update
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

        await session.commitTransaction();
        res.json(updatedOrder);

    } catch (err) {
        await session.abortTransaction();
        console.error("Update Error:", err.message);
        res.status(400).json({ message: err.message });
    } finally {
        session.endSession();
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
    try {
        const order = await Order.findOneAndUpdate(
            { orderId: req.params.id },
            { 
                $set: { 
                    orderStatus: 'Cancelled',
                    'bookings.$[].bookingStatus': 'Cancelled' // Cancel all child items
                } 
            },
            { new: true }
        );
        res.json({ message: "Order cancelled and inventory released", order });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};