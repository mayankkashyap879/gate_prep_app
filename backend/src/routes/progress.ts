// backend/src/routes/progress.ts
import express, { Request, Response } from 'express';
import { check, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import User from '../models/User';
import Subject from '../models/Subject';
import auth from '../middleware/auth';
import { toObjectId } from '../utils/mongoose-utils';

const router = express.Router();

// @route   GET api/progress
// @desc    Get user's progress
// @access  Private
router.get('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ msg: 'User ID not found' });
      return;
    }
    
    // Get the user with progress data
    const user = await User.findById(req.user.id).select('contentProgress');
    
    if (!user) {
      res.status(404).json({ msg: 'User not found' });
      return;
    }
    
    // Return the user's content progress
    res.json(user.contentProgress || []);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   POST api/progress
// @desc    Mark item as completed
// @access  Private
router.post(
  '/',
  [
    auth,
    check('subjectId', 'Subject ID is required').not().isEmpty(),
    check('moduleId', 'Module ID is required').not().isEmpty(),
    check('itemId', 'Item ID is required').not().isEmpty(),
    check('type', 'Type is required').isIn(['lecture', 'quiz', 'homework', 'pyq', 'test']),
    check('completed', 'Completed status is required').isBoolean(),
    check('duration', 'Duration is required').isNumeric()
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    
    const { subjectId, moduleId, itemId, type, completed, duration, notes } = req.body;
    
    try {
      if (!req.user?.id) {
        res.status(401).json({ msg: 'User ID not found' });
        return;
      }
      
      // Check if subject exists
      const subject = await Subject.findById(subjectId);
      if (!subject) {
        res.status(404).json({ msg: 'Subject not found' });
        return;
      }
      
      const User = mongoose.model('User');
      
      // Get the user first
      const user = await User.findById(req.user.id);
      
      if (!user) {
        res.status(404).json({ msg: 'User not found' });
        return;
      }
      
      // Check if progress already exists
      const existingProgress = user.contentProgress?.find(
        (item: { subjectId: mongoose.Types.ObjectId; moduleId: mongoose.Types.ObjectId; itemId: mongoose.Types.ObjectId; type: string; }) => 
          item.subjectId.toString() === subjectId.toString() &&
          item.moduleId.toString() === moduleId.toString() &&
          item.itemId.toString() === itemId.toString() &&
          item.type === type
      );
      
      // Parse duration as integer
      const durationInt = parseInt(duration.toString());
      
      // Create a study session to track this progress
      const now = new Date();
      const startTime = new Date(now.getTime() - (durationInt * 60 * 1000)); // Calculate start time based on duration
      
      // Add study session to user's studySessions array
      await User.updateOne(
        { _id: toObjectId(req.user.id) },
        { 
          $push: { 
            studySessions: {
              subjectId: toObjectId(subjectId),
              moduleId: toObjectId(moduleId),
              itemId: toObjectId(itemId),
              type: type,
              startTime: startTime,
              endTime: now,
              duration: durationInt,
              notes: notes || 'Marked as completed from progress'
            }
          },
          $inc: { totalStudyTime: durationInt }
        }
      );
      
      // Get the updated user to return content progress
      const updatedUser = await User.findById(req.user.id);
      const updatedProgress = updatedUser?.contentProgress?.find(
        (item: { subjectId: mongoose.Types.ObjectId; moduleId: mongoose.Types.ObjectId; itemId: mongoose.Types.ObjectId; type: string; }) => 
          item.subjectId.toString() === subjectId.toString() &&
          item.moduleId.toString() === moduleId.toString() &&
          item.itemId.toString() === itemId.toString() &&
          item.type === type
      );
      
      res.json(updatedProgress || {
        subjectId: toObjectId(subjectId),
        moduleId: toObjectId(moduleId),
        itemId: toObjectId(itemId),
        type: type,
        completed: true,
        completedDate: new Date(),
        timeSpent: durationInt
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  }
);

// @route   GET api/progress/summary
// @desc    Get summary of user's progress
// @access  Private
router.get('/summary', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ msg: 'User ID not found' });
      return;
    }
    
    // Get the user with content progress
    const user = await User.findById(req.user.id).select('contentProgress');
    
    if (!user) {
      res.status(404).json({ msg: 'User not found' });
      return;
    }
    
    // Get all subjects
    const subjects = await Subject.find({});
    
    // Create a map for quick lookup of completed items
    const progressMap = new Map<string, boolean>();
    
    if (user.contentProgress && user.contentProgress.length > 0) {
      user.contentProgress.forEach((item: any) => {
        if (item.completed) {
          const key = `${item.subjectId}-${item.moduleId}-${item.itemId}-${item.type}`;
          progressMap.set(key, true);
        }
      });
    }
    
    // Calculate overall stats
    let totalItems = 0;
    let completedItems = 0;
    let totalDuration = 0;
    let completedDuration = 0;
    
    // Calculate per-subject stats
    const subjectStats: any[] = [];
    
    // Process each subject independently
    subjects.forEach(subject => {
      // Skip placeholder subjects or any with "Previous Year Questions" in name
      if (subject.name.includes('Previous Year Questions')) {
        return;
      }
      
      let subjectTotalItems = 0;
      let subjectCompletedItems = 0;
      let subjectTotalDuration = 0;
      let subjectCompletedDuration = 0;
      
      // Process modules (with content items: lectures, quizzes, homework)
      subject.modules.forEach(module => {
        // Process content items
        module.content.forEach(item => {
          subjectTotalItems++;
          totalItems++;
          
          subjectTotalDuration += item.durationMinutes;
          totalDuration += item.durationMinutes;
          
          const key = `${subject._id}-${module._id}-${item._id}-${item.type}`;
          if (progressMap.has(key)) {
            subjectCompletedItems++;
            completedItems++;
            
            subjectCompletedDuration += item.durationMinutes;
            completedDuration += item.durationMinutes;
          }
        });
      });
      
      // Process PYQs
      if (subject.pyqs && subject.pyqs.count > 0) {
        subjectTotalItems++;
        totalItems++;
        
        subjectTotalDuration += subject.pyqs.estimatedDuration;
        totalDuration += subject.pyqs.estimatedDuration;
        
        const pyqKey = `${subject._id}-pyq-pyq-pyq`;
        if (progressMap.has(pyqKey)) {
          subjectCompletedItems++;
          completedItems++;
          
          subjectCompletedDuration += subject.pyqs.estimatedDuration;
          completedDuration += subject.pyqs.estimatedDuration;
        }
      }
      
      // Only add to subjects array if it has content
      if (subjectTotalItems > 0) {
        subjectStats.push({
          _id: subject._id,
          name: subject.name,
          totalItems: subjectTotalItems,
          completedItems: subjectCompletedItems,
          percentComplete: subjectTotalItems > 0 ? (subjectCompletedItems / subjectTotalItems) * 100 : 0,
          totalDuration: subjectTotalDuration,
          completedDuration: subjectCompletedDuration
        });
      }
    });
    
    // Return summary with subjects
    res.json({
      overall: {
        totalItems,
        completedItems,
        percentComplete: totalItems > 0 ? (completedItems / totalItems) * 100 : 0,
        totalDuration,
        completedDuration,
        percentDurationComplete: totalDuration > 0 ? (completedDuration / totalDuration) * 100 : 0
      },
      subjects: subjectStats
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

export default router;