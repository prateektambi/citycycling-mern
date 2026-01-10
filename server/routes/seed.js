
const express = require('express');
const axios = require('axios');
const { parse } = require('csv-parse/sync');
const Product = require('../models/Product');
const Item = require('../models/Item');
const { updateProductAvailability } = require('../utils/availabilityUpdater');

const router = express.Router();

// --- Seeder Route ---
router.post('/', async (req, res) => {
    console.log('Received request to seed database...');
    try {
        // 1. Fetch and parse data from Google Sheets
        const BASE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ7F-6gbnjfIOvAx6tp8vdCk6wgUXRvwF2nBqHnKVEQytygAE4Yk414ma79QgJT7gOKAXloVxsuB2BU/pub?output=csv";
        const PRODUCT_SHEET_URL = `${BASE_URL}&gid=0`; 
        const ITEM_SHEET_URL = `${BASE_URL}&gid=978514315`; // Replace with your Items tab GID
        console.log('⏳ Fetching CSV data from Google Sheets...');
        console.log(`Fetching Products from: ${PRODUCT_SHEET_URL}`);
        const productResponse = await axios.get(PRODUCT_SHEET_URL);
        const productRecords = parse(productResponse.data, {
            columns: true,
            skip_empty_lines: true,
        });
        console.log(`✅ Fetched ${productRecords.length} product records from CSV.`);

        let itemRecords = [];
        if (ITEM_SHEET_URL && ITEM_SHEET_URL.startsWith('http')) {
            console.log(`Fetching Items from: ${ITEM_SHEET_URL}`);
            const itemResponse = await axios.get(ITEM_SHEET_URL);
            itemRecords = parse(itemResponse.data, {
                columns: true,
                skip_empty_lines: true,
            });
            console.log(`✅ Fetched ${itemRecords.length} item records from CSV.`);
        }

        // 2. Update or Insert Products
        console.log('⏳ Updating/Inserting products...');
        const productMap = new Map();
        const processedProducts = [];

        for (const row of productRecords) {
            const productData = {
                name: row.name,
                slug: row.slug,
                productCode: row.productCode,
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
                securityDeposit: Number(row.securityDeposit) || 0,
            };

            let product = await Product.findOne({ productCode: row.productCode });
            if (product) {
                Object.assign(product, productData);
                await product.save();
                console.log(`   -> Updated Product: ${product.name}`);
            } else {
                product = new Product(productData);
                await product.save();
                console.log(`   -> Created Product: ${product.name}`);
            }
            productMap.set(product.productCode, product);
            processedProducts.push(product);
        }

        // 3. Process and insert/update items
        if (itemRecords.length > 0) {
            console.log('⏳ Processing items...');

            for (const row of itemRecords) {
                const product = productMap.get(row.productCode);
                if (product) {
                    let item = await Item.findOne({ chassisNumber: row.chassisNumber });
                    
                    const itemData = {
                        product: product._id,
                        status: row.status,
                        purchaseDetails: {
                            price: Number(row.price) || 0,
                            date: row.date ? new Date(row.date) : undefined,
                            vendor: row.vendor,
                            additionalInfo: row.additionalInfo,
                            expectedSellingPrice: Number(row.expectedSellingPrice) || 0
                        }
                    };

                    if (item) {
                        Object.assign(item, itemData);
                        await item.save();
                        console.log(`   -> Updated Item: ${row.chassisNumber}`);
                    } else {
                        const newItem = new Item({
                            ...itemData,
                            chassisNumber: row.chassisNumber,
                        });
                        await newItem.save();
                        console.log(`   -> Created Item: ${row.chassisNumber}`);
                    }
                }
            }

            // Update inventory counts based on actual items in DB
            console.log('Updating product inventory counts...');
            for (const product of productMap.values()) {
                const count = await Item.countDocuments({ product: product._id });
                product.inventoryCount = count;
                await product.save();
            }
        }

        console.log('⏳ Initializing availability maps...');
        await Promise.all(processedProducts.map(p => updateProductAvailability(p._id)));
        console.log('✅ Availability maps initialized.');

        res.status(200).json({
            message: 'Database synced successfully!',
            productCount: processedProducts.length,
            itemCount: itemRecords.length,
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
