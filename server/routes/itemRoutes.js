const express = require('express');
const router = express.Router();
const {
    getItems,
    getItemById,
    updateItemStatus,
    addMaintenance,
    updateItem,
    deleteMaintenance
} = require('../controllers/itemController');

// Get all items (with optional filtering)
router.get('/', getItems);

// Get single item by ID
router.get('/:id', getItemById);

// Update item status
router.patch('/:id/status', updateItemStatus);

// Add maintenance record
router.post('/:id/maintenance', addMaintenance);

// Update item details
router.put('/:id', updateItem);

// Delete maintenance record
router.delete('/:itemId/maintenance/:maintenanceId', deleteMaintenance);

module.exports = router;
