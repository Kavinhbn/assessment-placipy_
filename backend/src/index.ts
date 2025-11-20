// @ts-nocheck
const dotenv = require('dotenv');

// Load environment variables first
dotenv.config();



const app = require('./app');

// Use port from environment or default to 3005
const PORT = process.env.PORT || 3005;


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});