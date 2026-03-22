const express = require('express');
const Product = require('../models/Product');
const router = express.Router();

// @route   GET /api/products
// @desc    Get all products
// @access  Public
router.get('/', async (req, res) => {
    try {
        let filter = {};
        if (req.query.admin !== 'true') {
            filter.enableDisplay = { $ne: false }; // This allows missing fields to mean true as well
        }
        const products = await Product.find(filter).sort({ displayOrder: 1, createdAt: -1 });
        res.json(products);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/products/:slug
// @desc    Get a single product by slug
// @access  Public
router.get('/:slug', async (req, res) => {
    try {
        const product = await Product.findOne({ slug: req.params.slug });
        if (!product) {
            return res.status(404).json({ msg: 'Product not found' });
        }
        
        // Hide disabled products from public view (slug route is primarily public)
        if (product.enableDisplay === false && req.query.admin !== 'true') {
             return res.status(404).json({ msg: 'Product not found or unavailable' });
        }

        res.json(product);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/products/id/:id
// @desc    Get a single product by id
// @access  Private (Admin)
router.get('/id/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ msg: 'Product not found' });
        }
        res.json(product);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/products
// @desc    Create a product
// @access  Private (Admin)
router.post('/', async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        res.status(201).json(product);
    } catch (err) {
        console.error(err.message);
        res.status(400).json({ message: err.message });
    }
});

// @route   PUT /api/products/:id
// @desc    Update a product
// @access  Private (Admin)
router.put('/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!product) {
            return res.status(404).json({ msg: 'Product not found' });
        }
        res.json(product);
    } catch (err) {
        console.error(err.message);
        res.status(400).json({ message: err.message });
    }
});

// @route   DELETE /api/products/:id
// @desc    Delete a product
// @access  Private (Admin)
router.delete('/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ msg: 'Product not found' });
        }
        res.json({ msg: 'Product removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/products/repair/:id
// @desc    Repair availability map and inventory count for a product
// @access  Private (Admin)
router.post('/repair/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        const Item = require('../models/Item');
        const { updateProductAvailability } = require('../utils/availabilityUpdater');

        // 1. Recalculate true inventory from physical items
        const availableItemsCount = await Item.countDocuments({
            product: productId,
            status: 'available'
        });

        // 2. Update the product's base inventory count
        await Product.findByIdAndUpdate(productId, { inventoryCount: availableItemsCount });

        // 3. Recalculate the 120-day availability map (subtracting active orders)
        await updateProductAvailability(productId);

        res.json({ 
            success: true, 
            message: 'Product availability and inventory repaired successfully',
            newInventoryCount: availableItemsCount
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Repair failed', error: err.message });
    }
});

module.exports = router;
