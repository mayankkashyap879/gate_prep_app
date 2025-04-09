// backend/src/scripts/reset-admin.ts
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db';
import User from '../models/User';

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

// Reset admin user password
const resetAdminPassword = async (): Promise<void> => {
  console.log('Resetting admin user password...');
  
  try {
    // Find admin user
    const admin = await User.findOne({ email: 'admin@gateprep.com' });
    
    if (!admin) {
      console.log('Admin user not found. Create one with npm run seed:admin');
      return exitProcess();
    }
    
    // Update password using the same JWT_SECRET as the auth system
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    admin.password = hashedPassword;
    await admin.save();
    
    console.log('Admin password reset successfully to "admin123"');
    exitProcess();
  } catch (error) {
    console.error('Error resetting admin password:', error);
    exitProcess();
  }
};

// Run the reset process
resetAdminPassword();