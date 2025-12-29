const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

module.exports = {
    MONGODB_URI: process.env.MONGO_URI,
    PORT: process.env.PORT || 5000
};
