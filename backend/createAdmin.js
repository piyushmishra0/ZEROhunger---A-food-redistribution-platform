require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

const connectDB = require('./config/db');

// Connect to database
connectDB();

const createAdmin = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@zerohunger.com' });
    if (existingAdmin) {
      console.log('Admin already exists');
      process.exit(1);
    }

    // Create admin
    const admin = await Admin.create({
      name: 'Admin',
      email: 'admin@zerohunger.com',
      password: 'admin123',
      role: 'admin'
    });

    console.log('Admin created successfully');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

createAdmin(); 