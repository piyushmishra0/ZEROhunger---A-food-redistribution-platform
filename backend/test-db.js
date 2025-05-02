const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Successfully connected to MongoDB!');
        
        // Test if we can perform a simple operation
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Available collections:', collections.map(c => c.name));
        
    } catch (error) {
        console.error('❌ Error connecting to MongoDB:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('Connection closed');
    }
}

testConnection(); 