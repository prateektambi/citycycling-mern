
const express = require('express');
const axios = require('axios');
const { parse } = require('csv-parse/sync');
const Product = require('../models/Product');

const router = express.Router();

// --- Seeder Route ---
router.post('/', async (req, res) => {
    console.log('Received request to seed database...');
    try {
        // 1. Fetch and parse data from Google Sheets
        const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ7F-6gbnjfIOvAx6tp8vdCk6wgUXRvwF2nBqHnKVEQytygAE4Yk414ma79QgJT7gOKAXloVxsuB2BU/pub?gid=0&single=true&output=csv";
        console.log('⏳ Fetching CSV data from Google Sheets...');
        const response = await axios.get(SHEET_URL);
        const records = parse(response.data, {
            columns: true,
            skip_empty_lines: true,
        });
        console.log(`✅ Fetched ${records.length} records from CSV.`);
        console.log(records);

        // 2. Prepare products for insertion
        const productsToInsert = records.map(row => ({
            name: row.name,
            slug: row.slug,
            size: row.size,
            minHeightFt: row.minHeightFt ? Number(row.minHeightFt) : undefined,
            minHeightInch: row.minHeightInch ? Number(row.minHeightInch) : undefined,
            maxHeightFt: row.maxHeightFt ? Number(row.maxHeightFt) : undefined,
            maxHeightInch: row.maxHeightInch ? Number(row.maxHeightInch) : undefined,
            category: row.category,
            dailyRate: Number(row.dailyRate) || 0,
            weeklyRate: Number(row.weeklyRate) || 0,
            monthlyRate: Number(row.monthlyRate) || 0,
            type: row.type,
            description: row.description,
            inventoryCount: parseInt(row.inventoryCount) || 0,
            specifications: row.specifications ? row.specifications.split(',').map(s => s.trim()) : [],
            imageUrls: row.imageUrls ? row.imageUrls.split(',').map(s => s.trim()) : [],
            averageRating: Number(row.averageRating) || 0,
        }));

        // 3. Clear existing data and bulk insert new data
        console.log('⏳ Clearing existing products...');
        await Product.deleteMany({});
        console.log('✅ Existing products cleared.');

        console.log('⏳ Inserting new products...');
        await Product.insertMany(productsToInsert);
        console.log(`✅ Successfully imported ${productsToInsert.length} products.`);

        res.status(200).json({
            message: 'Database seeded successfully!',
            importedCount: productsToInsert.length,
        });

    } catch (err) {
        console.error('❌ Seeding failed:', err);
        res.status(500).json({
            message: 'Seeding failed',
            error: err.message,
        });
    }
});

module.exports = router;
