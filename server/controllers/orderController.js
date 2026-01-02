const Order = require('../models/Order');
const mongoose = require('mongoose');
const { isTotalStockAvailable } = require('../utils/availability');

exports.createOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { customer, bookings, logistics, initialPayment } = req.body;

        // --- 1. VALIDATION: GROUP BY PRODUCT ---
        const groupedByProduct = bookings.reduce((acc, b) => {
            acc[b.product] = acc[b.product] || [];
            acc[b.product].push(b);
            return acc;
        }, {});

        for (const productId in groupedByProduct) {
            const available = await isTotalStockAvailable(
                productId, 
                groupedByProduct[productId], 
                session
            );
            if (!available) {
                throw new Error(`Stock unavailable for some requested dates.`);
            }
        }

        // --- 2. FINANCIAL CALCULATIONS ---
        const totalRental = bookings.reduce((sum, b) => sum + (b.appliedRate * b.quantity), 0);
        const totalDeposit = bookings.reduce((sum, b) => sum + (b.securityDeposit * b.quantity), 0);
        const totalLogistics = (logistics.delivery?.charges || 0) + (logistics.return?.charges || 0);
        const grandTotal = totalRental + totalDeposit + totalLogistics;

        // --- 3. PAYMENT LEDGER ---
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

        await session.commitTransaction();
        res.status(201).json({ success: true, order: savedOrder });

    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

// Get all orders with optional filtering (e.g., status)
exports.getOrders = async (req, res) => {
    try {
        const { status, phone } = req.query;
        let query = {};
        if (status) query.orderStatus = status;
        if (phone) query['customer.phone'] = phone;

        const orders = await Order.find(query).sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
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
        const { id } = req.params;
        const updates = req.body;

        // If dates or quantities changed, re-run the availability check
        if (updates.bookings) {
            // ... Call a modified isTotalStockAvailable that ignores THIS orderId ...
        }

        const updatedOrder = await Order.findOneAndUpdate(
            { orderId: id },
            { $set: updates },
            { new: true, session }
        );

        await session.commitTransaction();
        res.json(updatedOrder);
    } catch (err) {
        await session.abortTransaction();
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