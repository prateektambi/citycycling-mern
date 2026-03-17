const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const { protect } = require('../middleware/authMiddleware');

// All cart routes require authentication
router.use(protect);

// GET /api/cart — Get user's cart with populated product details
router.get('/', async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user.id }).populate({
            path: 'items.product',
            select: 'name slug productCode imageUrls size dailyRate weeklyRate securityDeposit availability inventoryCount category type'
        });

        if (!cart) {
            return res.json({ items: [] });
        }

        // Enrich each item with availability status and rental calculation
        const enrichedItems = cart.items.map(item => {
            const product = item.product;
            if (!product) return null; // Product may have been deleted

            const start = new Date(item.startDate);
            const end = new Date(item.endDate);
            const totalDays = Math.round((end - start) / (1000 * 60 * 60 * 24));

            // Calculate rental
            const quantity = item.quantity || 1;
            let rentalType, appliedRate, totalRental, rentalLabel;
            if (totalDays === 1) {
                rentalType = 'Daily';
                appliedRate = product.dailyRate;
                totalRental = product.dailyRate * quantity;
                rentalLabel = '1 day';
            } else if (totalDays > 1) {
                const weeks = Math.ceil(totalDays / 7);
                rentalType = 'Weekly';
                appliedRate = product.weeklyRate;
                totalRental = (weeks * product.weeklyRate) * quantity;
                rentalLabel = `${weeks} week${weeks > 1 ? 's' : ''} (${totalDays} days)`;
            } else {
                rentalType = null;
                appliedRate = 0;
                totalRental = 0;
                rentalLabel = 'Invalid dates';
            }

            // Check availability for each day
            let isAvailable = true;
            let unavailableDate = null;
            const avail = product.availability || new Map();
            for (let i = 0; i < totalDays; i++) {
                const d = new Date(start);
                d.setDate(d.getDate() + i);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const stock = avail.get ? avail.get(key) : avail[key];
                if (stock !== undefined && stock < quantity) {
                    isAvailable = false;
                    unavailableDate = key;
                    break;
                }
            }

            return {
                _id: item._id,
                product: {
                    _id: product._id,
                    name: product.name,
                    slug: product.slug,
                    productCode: product.productCode,
                    imageUrl: product.imageUrls?.[0] || '',
                    size: product.size,
                    dailyRate: product.dailyRate,
                    weeklyRate: product.weeklyRate,
                    securityDeposit: product.securityDeposit,
                    category: product.category,
                    type: product.type
                },
                startDate: item.startDate,
                endDate: item.endDate,
                totalDays,
                rentalType,
                appliedRate,
                quantity,
                totalRental,
                rentalLabel,
                isAvailable,
                unavailableDate
            };
        }).filter(Boolean); // Remove null items

        res.json({ items: enrichedItems });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ message: 'Error fetching cart' });
    }
});

// POST /api/cart/add — Add item to cart
router.post('/add', async (req, res) => {
    try {
        const { productId, startDate, endDate, quantity } = req.body;

        if (!productId || !startDate || !endDate) {
            return res.status(400).json({ message: 'Product ID, start date, and end date are required' });
        }

        if (new Date(startDate) >= new Date(endDate)) {
            return res.status(400).json({ message: 'End date must be after start date' });
        }

        let cart = await Cart.findOne({ user: req.user.id });

        if (!cart) {
            cart = new Cart({ user: req.user.id, items: [] });
        }

        cart.items.push({
            product: productId,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            quantity: quantity || 1
        });

        await cart.save();

        res.status(201).json({ 
            message: 'Added to cart', 
            cartCount: cart.items.length 
        });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ message: 'Error adding to cart' });
    }
});

// PUT /api/cart/item/:itemId — Update dates for a specific cart item
router.put('/item/:itemId', async (req, res) => {
    try {
        const { startDate, endDate, quantity } = req.body;
        const { itemId } = req.params;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Start date and end date are required' });
        }

        if (new Date(startDate) >= new Date(endDate)) {
            return res.status(400).json({ message: 'End date must be after start date' });
        }

        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const item = cart.items.id(itemId);
        if (!item) {
            return res.status(404).json({ message: 'Cart item not found' });
        }

        item.startDate = new Date(startDate);
        item.endDate = new Date(endDate);
        if (quantity !== undefined) {
             item.quantity = quantity;
        }
        await cart.save();

        res.json({ message: 'Cart item updated' });
    } catch (error) {
        console.error('Error updating cart item:', error);
        res.status(500).json({ message: 'Error updating cart item' });
    }
});

// DELETE /api/cart/item/:itemId — Remove a specific item from cart
router.delete('/item/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        const cart = await Cart.findOne({ user: req.user.id });

        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        cart.items = cart.items.filter(item => item._id.toString() !== itemId);
        await cart.save();

        res.json({ 
            message: 'Item removed from cart', 
            cartCount: cart.items.length 
        });
    } catch (error) {
        console.error('Error removing cart item:', error);
        res.status(500).json({ message: 'Error removing cart item' });
    }
});

// DELETE /api/cart — Clear entire cart
router.delete('/', async (req, res) => {
    try {
        await Cart.findOneAndDelete({ user: req.user.id });
        res.json({ message: 'Cart cleared' });
    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({ message: 'Error clearing cart' });
    }
});

module.exports = router;
