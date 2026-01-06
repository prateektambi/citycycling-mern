
const express = require('express');
const axios = require('axios');
const { parse } = require('csv-parse/sync');
const Product = require('../models/Product');
const Item = require('../models/Item');

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

        // 2. Prepare products for insertion
        console.log('Mapping product CSV rows to database schema...');
        const productsToInsert = productRecords.map(row => ({
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
        }));

        // 3. Clear existing data and bulk insert new data
        console.log('⏳ Clearing existing data...');
        await Item.deleteMany({});
        await Product.deleteMany({});
        console.log('✅ Existing data cleared.');

        console.log('⏳ Inserting new products...');
        productsToInsert.forEach(p => console.log(`   -> Product: ${p.name} (${p.productCode}) ${p.inventoryCount}`));
        const insertedProducts = await Product.insertMany(productsToInsert);
        // console.log(`✅ Successfully imported ${insertedProducts.length} products.`);
        // console.log(`insertedProdcuts: ${JSON.stringify(insertedProducts)}`);

        // 4. Process and insert items
        if (itemRecords.length > 0) {
            console.log('⏳ Processing items...');
            const productMap = new Map();
            console.log('Building product map for item association...');
            insertedProducts.forEach(p => console.log(`   -> Product: ${p.name} (${p.productCode}) ${p.inventoryCount}`));
            insertedProducts.forEach(p => productMap.set(p.productCode, p));
            console.log(`productMap: ${JSON.stringify(productMap)}`);

            const productsUpdated = new Set();

            const itemsToInsert = [];
            let itemCounter = 1;

            for (const row of itemRecords) {
                console.log(`${row.productCode}`);
                const product = productMap.get(row.productCode);
                if (product) {
                    console.log(`Found product: ${product.productCode}`);
                    // Reset inventory count if this is the first item seen for this product
                    if (!productsUpdated.has(product.productCode)) {
                        product.inventoryCount = 0;
                        productsUpdated.add(product.productCode);
                    }

                    itemsToInsert.push({
                        product: product._id,
                        itemNumber: String(itemCounter++).padStart(3, '0'),
                        chassisNumber: row.chassisNumber,
                        status: row.status,
                        purchaseDetails: {
                            price: Number(row.price) || 0,
                            date: row.date ? new Date(row.date) : undefined,
                            vendor: row.vendor,
                            additionalInfo: row.additionalInfo,
                            expectedSellingPrice: Number(row.expectedSellingPrice) || 0
                        }
                    });
                    // Update inventory count for the product
                    product.inventoryCount += 1;
                    console.log(`product.inventoryCount: ${product.inventoryCount}`);
                }
            }

            console.log(`Prepared ${itemsToInsert.length} items for insertion.`);
            itemsToInsert.forEach(i => console.log(`   -> Item: #${i.itemNumber}`));
            await Item.insertMany(itemsToInsert);
            console.log(`✅ Successfully imported ${itemsToInsert.length} items.`);

            // Save updated product inventory counts
            console.log('Updating product inventory counts based on items...');
            const updatePromises = Array.from(productsUpdated).map(code => {
                return productMap.get(code).save();
            });
            await Promise.all(updatePromises);
            console.log('✅ Product inventory counts updated.');
        }

        res.status(200).json({
            message: 'Database seeded successfully!',
            productCount: insertedProducts.length,
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
