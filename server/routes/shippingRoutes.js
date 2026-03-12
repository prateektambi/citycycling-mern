const express = require('express');
const ShippingZone = require('../models/ShippingZone');
const router = express.Router();

// @route   GET /api/shipping
// @desc    Get all shipping zones sorted by cost
// @access  Public
router.get('/', async (req, res) => {
    try {
        const zones = await ShippingZone.find().sort({ cost: 1, pincode: 1 });
        res.json(zones);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/shipping/lookup/:pincode
// @desc    Look up shipping cost by pincode
// @access  Public
router.get('/lookup/:pincode', async (req, res) => {
    try {
        const zone = await ShippingZone.findOne({ pincode: req.params.pincode.trim() });
        if (!zone) {
            return res.status(404).json({ msg: 'Pincode not found in our delivery zones' });
        }
        res.json(zone);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
