// backend/src/scripts/seed-admin.ts
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db';
import User, { IUser } from '../models/User';

dotenv.config();

// Connect to MongoDB
connectDB();

// Function to clean up resources and exit
const exitProcess = (): void => {
  mongoose.connection.close();
  process.exit(0);
};

// Get the JWT_SECRET that will be used for logins
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';
console.log('Using JWT_SECRET from environment, make sure this matches the one used in auth routes');

// Create admin user
const createAdminUser = async (): Promise<void> => {
  console.log('Creating admin user...');
  
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@gateprep.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists.');
      return exitProcess();
    }
    
    // Create admin user with password that will work with the current JWT_SECRET
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@gateprep.com',
      password: hashedPassword,
      role: 'admin',
      deadline: new Date(new Date().setMonth(new Date().getMonth() + 6)), // 6 months from now
      dailyTarget: {
        minimum: 60,
        moderate: 120,
        maximum: 180,
        custom: 90
      },
      selectedPlan: 'moderate',
      streak: 0,
      lastStreakDate: null,
      totalStudyTime: 0
    });
    
    await adminUser.save();
    console.log('Admin user created successfully.');
    
    exitProcess();
  } catch (error) {
    console.error('Error creating admin user:', error);
    exitProcess();
  }
};

// Run the seed process
createAdminUser();