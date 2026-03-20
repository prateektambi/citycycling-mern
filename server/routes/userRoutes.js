const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// GET /api/users - List all users (admin only)
router.get('/', protect, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const users = await User.find({ role: 'user' })
            .select('email profile.name profile.phone createdAt accountStatus')
            .sort({ createdAt: -1 });

        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
});

// GET /api/users/find/:email - Find a user by email for order pre-population (admin only)
router.get('/find/:email', protect, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const email = req.params.email;
        const user = await User.findOne({ email: email.toLowerCase() })
            .select('profile email');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error finding user:', error);
        res.status(500).json({ message: 'Error finding user' });
    }
});

module.exports = router;
