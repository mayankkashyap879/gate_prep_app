// backend/src/scripts/migrate-study-sessions.ts
// Script to migrate study sessions from the separate StudySession collection to the User model
import mongoose from 'mongoose';
import User from '../models/User';
import StudySession from '../models/StudySession';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gate_prep_app';
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// Function to migrate study sessions
const migrateStudySessions = async () => {
  try {
    console.log('Starting study session migration...');

    // Get all study sessions
    const studySessions = await StudySession.find({});
    console.log(`Found ${studySessions.length} study sessions to migrate`);

    if (studySessions.length === 0) {
      console.log('No study sessions to migrate. Exiting...');
      return;
    }

    // Group sessions by user
    const sessionsByUser = new Map<string, any[]>();
    
    studySessions.forEach(session => {
      const userId = session.userId.toString();
      
      if (!sessionsByUser.has(userId)) {
        sessionsByUser.set(userId, []);
      }
      
      sessionsByUser.get(userId)?.push({
        subjectId: session.subjectId,
        moduleId: session.moduleId,
        itemId: session.itemId,
        type: session.type,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        notes: session.notes || 'Migrated from StudySession collection'
      });
    });

    console.log(`Sessions grouped for ${sessionsByUser.size} users`);

    // Process each user's sessions
    for (const [userId, sessions] of sessionsByUser.entries()) {
      const user = await User.findById(userId);
      
      if (!user) {
        console.log(`User ${userId} not found, skipping ${sessions.length} sessions`);
        continue;
      }
      
      console.log(`Migrating ${sessions.length} sessions for user ${userId} (${user.name})`);
      
      try {
        // Update user document to add study sessions
        await User.updateOne(
          { _id: userId },
          { $push: { studySessions: { $each: sessions } } }
        );
        
        console.log(`Successfully migrated sessions for user ${userId}`);
      } catch (userUpdateError) {
        console.error(`Error updating user ${userId}:`, userUpdateError);
        
        // If array is too large, try to add in smaller batches
        if (sessions.length > 50) {
          console.log(`Trying to add sessions in batches for user ${userId}`);
          
          // Split into batches of 50
          const BATCH_SIZE = 50;
          const batches: any[][] = [];
          
          for (let i = 0; i < sessions.length; i += BATCH_SIZE) {
            batches.push(sessions.slice(i, i + BATCH_SIZE));
          }
          
          // Process each batch
          for (let i = 0; i < batches.length; i++) {
            try {
              await User.updateOne(
                { _id: userId },
                { $push: { studySessions: { $each: batches[i] } } }
              );
              console.log(`Batch ${i+1}/${batches.length} processed for user ${userId}`);
            } catch (batchError) {
              console.error(`Error processing batch ${i+1} for user ${userId}:`, batchError);
            }
          }
        }
      }
    }

    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration error:', error);
  }
};

// Main function
const run = async () => {
  try {
    await connectDB();
    await migrateStudySessions();
    
    console.log('Migration script completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration script failed:', error);
    process.exit(1);
  }
};

// Run the script
run();