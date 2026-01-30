const Item = require('../models/Item');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const { updateProductAvailability } = require('../utils/availabilityUpdater');


// Helper to sync product inventory
const syncProductInventory = async (productId, oldStatus, newStatus) => {
    if (oldStatus === newStatus) return;

    let updated = false;

    // Transition: Available -> Unavailable (Maintenance/Retired)
    if (oldStatus === 'available' && newStatus !== 'available') {
        await Product.findByIdAndUpdate(productId, { $inc: { inventoryCount: -1 } });
        updated = true;
    }
    
    // Transition: Unavailable (Maintenance/Retired) -> Available
    else if (oldStatus !== 'available' && newStatus === 'available') {
        await Product.findByIdAndUpdate(productId, { $inc: { inventoryCount: 1 } });
        updated = true;
    }

    // Refresh availability map if inventory changed
    if (updated) {
        await updateProductAvailability(productId);
    }
};

// === GET ALL ITEMS (with filtering) ===
const getItems = async (req, res) => {
    try {
        const { status, search } = req.query;
        
        let filter = {};
        
        // Filter by status
        if (status && status !== 'all') {
            filter.status = status;
        }
        
        // Search by item number or chassis number
        if (search) {
            filter.$or = [
                { itemNumber: { $regex: search, $options: 'i' } },
                { chassisNumber: { $regex: search, $options: 'i' } }
            ];
        }
        
        const items = await Item.find(filter)
            .populate('product', 'name code')
            .sort({ createdAt: -1 });
        
        res.json(items);
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ message: 'Error fetching items', error: error.message });
    }
};

// === GET SINGLE ITEM BY ID ===
const getItemById = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id)
            .populate('product', 'name code category size');
        
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        
        res.json(item);
    } catch (error) {
        console.error('Error fetching item:', error);
        res.status(500).json({ message: 'Error fetching item', error: error.message });
    }
};

// === UPDATE ITEM STATUS ===
const updateItemStatus = async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!['available', 'maintenance', 'retired'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        
        const item = await Item.findById(req.params.id);
        
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        
        const oldStatus = item.status;
        item.status = status;
        await item.save();

        // Sync inventory
        await syncProductInventory(item.product, oldStatus, status);
        
        res.json({ message: 'Item status updated successfully', item });
    } catch (error) {
        console.error('Error updating item status:', error);
        res.status(500).json({ message: 'Error updating item status', error: error.message });
    }
};

// === ADD MAINTENANCE RECORD ===
const addMaintenance = async (req, res) => {
    try {
        const { startDate, endDate, description, cost } = req.body;
        
        if (!startDate || !description) {
            return res.status(400).json({ message: 'Start Date and description are required' });
        }
        
        const item = await Item.findById(req.params.id);
        
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        
        // Add maintenance record
        item.maintenanceHistory.push({
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : null,
            description,
            cost: cost || 0,
            addedBy: req.user?.name || 'Admin' 
        });
        
        await item.save();
        
        res.json({ message: 'Maintenance record added successfully', item });
    } catch (error) {
        console.error('Error adding maintenance record:', error);
        res.status(500).json({ message: 'Error adding maintenance record', error: error.message });
    }
};

// === UPDATE ITEM DETAILS ===
const updateItem = async (req, res) => {
    try {
        const { chassisNumber, purchaseDetails, status } = req.body;
        
        const item = await Item.findById(req.params.id);
        
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        
        // Update chassis number if provided
        if (chassisNumber !== undefined) {
            item.chassisNumber = chassisNumber;
        }
        
        // Update purchase details if provided
        if (purchaseDetails) {
            item.purchaseDetails = {
                ...item.purchaseDetails,
                ...purchaseDetails
            };
        }
        
        // Update status if provided
        if (status && ['available', 'maintenance', 'retired'].includes(status)) {
            const oldStatus = item.status;
            item.status = status;
            if (oldStatus !== status) {
                await syncProductInventory(item.product, oldStatus, status);
            }
        }
        
        await item.save();
        
        res.json({ message: 'Item updated successfully', item });
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({ message: 'Error updating item', error: error.message });
    }
};

// === DELETE MAINTENANCE RECORD ===
const deleteMaintenance = async (req, res) => {
    try {
        const { itemId, maintenanceId } = req.params;
        
        const item = await Item.findById(itemId);
        
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        
        // Remove maintenance record
        item.maintenanceHistory = item.maintenanceHistory.filter(
            m => m._id.toString() !== maintenanceId
        );
        
        await item.save();
        
        res.json({ message: 'Maintenance record deleted successfully', item });
    } catch (error) {
        console.error('Error deleting maintenance record:', error);
        res.status(500).json({ message: 'Error deleting maintenance record', error: error.message });
    }
};

// === CREATE NEW ITEM ===
const createItem = async (req, res) => {
    try {
        const { product, chassisNumber, purchaseDetails, status } = req.body;
        
        if (!product) {
            return res.status(400).json({ message: 'Product is required' });
        }
        
        const newItem = new Item({
            product,
            chassisNumber,
            purchaseDetails,
            status: status || 'available'
        });
        
        await newItem.save();
        
        // If the new item is 'available', increment the product's inventoryCount
        if (newItem.status === 'available') {
            await Product.findByIdAndUpdate(product, { $inc: { inventoryCount: 1 } });
            await updateProductAvailability(product);
        }
        
        res.status(201).json({ message: 'Item created successfully', item: newItem });
    } catch (error) {
        console.error('Error creating item:', error);
        res.status(500).json({ message: 'Error creating item', error: error.message });
    }
};

module.exports = {
    getItems,
    getItemById,
    updateItemStatus,
    addMaintenance,
    updateItem,
    deleteMaintenance,
    createItem
};
