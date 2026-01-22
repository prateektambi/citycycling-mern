const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

// Protect all routes defined after this middleware
router.use(protect);

// 1. CREATE: The "One-Shot" Create with availability check
router.post('/', orderController.createOrder);

// 2. READ: Get all orders (with search/filter support)
router.get('/', orderController.getOrders);

// 3. READ: Get a single order by its ID (e.g., CC-2026-1234)
router.get('/:id', orderController.getOrderById);

// 4. UPDATE: Modify order details or bookings
router.put('/:id', orderController.updateOrder);

// 5. UPDATE: Specifically add a payment to the ledger
router.patch('/:id/payment', orderController.addPayment);

// 6. UPDATE: Change Order State
router.patch('/:id/state', orderController.changeOrderState);

// 7. UPDATE: Manage Tags
router.patch('/:id/tags', orderController.manageTags);

// 8. DELETE: Cancel order (releases inventory via the $[ ] operator)
router.delete('/:id', orderController.cancelOrder);

// 9. UTILS: Generate WhatsApp Link
router.post('/:id/whatsapp', orderController.generateWhatsApp);

module.exports = router;