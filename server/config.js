const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

module.exports = {
    MONGODB_URI: process.env.MONGO_URI,
    PORT: process.env.PORT || 5000,
    AVAILABILITY_WINDOW_DAYS: parseInt(process.env.AVAILABILITY_WINDOW_DAYS, 10) || 120,
    AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://127.0.0.1:8003',
    AI_SERVICE_TOKEN: process.env.AI_SERVICE_TOKEN || ''
};
