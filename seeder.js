// seeder.js
const axios = require('axios');
const { parse } = require('csv-parse/sync');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Product = require('./server/models/Product');

dotenv.config({ path: path.resolve(__dirname, '.env') });

if (!process.env.MONGO_URI) {
    console.error('❌ FATAL ERROR: MONGO_URI is not defined in your .env file.');
    process.exit(1);
}

// 💡 REPLACE THIS with your "Publish to Web" CSV Link from Google Sheets
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ7F-6gbnjfIOvAx6tp8vdCk6wgUXRvwF2nBqHnKVEQytygAE4Yk414ma79QgJT7gOKAXloVxsuB2BU/pub?gid=0&single=true&output=csv";

mongoose.set('debug', true);
const importData = async () => {
    try {
        console.log('⏳ Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('📡 Connected to MongoDB successfully.');

        // 1. Fetch and parse data from Google Sheets
        console.log('⏳ Fetching CSV data from Google Sheets...');
        const response = await axios.get(SHEET_URL);
        const records = parse(response.data, {
            columns: true,
            skip_empty_lines: true,
        });
        console.log(`✅ Fetched ${records.length} records from CSV.`);

        // 2. Prepare products for insertion
        const productsToInsert = records.map((row, index) => {
            const product = {
                name: row.name,
                slug: row.slug,
                size: row.size,
                category: row.category,
                dailyRate: Number(row.dailyRate) || 0,
                weeklyRate: Number(row.weeklyRate) || 0,
                monthlyRate: Number(row.monthlyRate) || 0,
                type: row.type,
                description: row.description,
                inventoryCount: parseInt(row.inventoryCount) || 0,
                reviews: [],
                numReviews: 0,
                averageRating: 0
            };

            if (index < 3) {
                product.reviews = [
                    { name: 'John Doe', rating: 4, comment: 'Great bike!' },
                    { name: 'Jane Doe', rating: 5, comment: 'Amazing experience!' }
                ];
                product.numReviews = product.reviews.length;
                const totalRating = product.reviews.reduce((acc, item) => item.rating + acc, 0);
                product.averageRating = totalRating / product.numReviews;
            }
            
            if (index >= 3 && index < 6) {
                product.reviews = [
                    { name: 'Peter Pan', rating: 3, comment: 'Good bike!' },
                    { name: 'Wendy', rating: 4, comment: 'Nice bike!' }
                ];
                product.numReviews = product.reviews.length;
                const totalRating = product.reviews.reduce((acc, item) => item.rating + acc, 0);
                product.averageRating = totalRating / product.numReviews;
            }

            return product;
        });

        // 3. Clear existing data and bulk insert new data
        console.log('⏳ Clearing existing products...');
        await Product.deleteMany({});
        console.log('✅ Existing products cleared.');

        console.log('⏳ Inserting new products...');
        await Product.insertMany(productsToInsert);
        console.log(`✅ Successfully imported ${productsToInsert.length} products.`);

    } catch (err) {
        console.error('❌ Import failed:', err.message);
        if (err.name === 'MongooseServerSelectionError') {
            console.error('❌ Could not connect to MongoDB. Please check your MONGO_URI and network settings.');
        }
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB.');
        process.exit();
    }
};

// Start the import process
importData();