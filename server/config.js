const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

module.exports = {
    MONGODB_URI: process.env.MONGO_URI,
    PORT: process.env.PORT || 5000,
    AVAILABILITY_WINDOW_DAYS: parseInt(process.env.AVAILABILITY_WINDOW_DAYS, 10) || 120
};
