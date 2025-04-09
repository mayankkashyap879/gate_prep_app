// Modified version of subjects.ts that avoids using req.user.id entirely

import express, { Request, Response } from 'express';
import Subject from '../models/Subject';
import User from '../models/User';
import auth from '../middleware/auth';
import mongoose from 'mongoose';

const router = express.Router();

// @route   GET api/subjects
// @desc    Get all subjects
// @access  Private
router.get('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    // Get all subjects
    const subjects = await Subject.find({});
    
    // Get user with content progress - use _id directly from user object
    if (!req.user) {
      // No user in request, just return subjects without progress
      res.json(subjects);
      return;
    }
    
    // Use _id directly instead of id to avoid TypeScript errors
    const user = await User.findById(req.user._id).select('contentProgress');
    
    if (!user) {
      // Return subjects without progress data
      res.json(subjects);
      return;
    }
    
    // Create a map for quick lookup of completed items
    const progressMap = new Map<string, boolean>();
    
    if (user.contentProgress && user.contentProgress.length > 0) {
      user.contentProgress.forEach((item: any) => {
        if (item.completed) {
          const key = `${item.subjectId}-${item.type}`;
          progressMap.set(key, true);
        }
      });
    }
    
    // Enhance subjects with progress information
    const enhancedSubjects = subjects.map(subject => {
      // Calculate total items and completed items
      let totalItems = 0;
      let completedItems = 0;
      
      // Count items and check progress in modules
      subject.modules.forEach((module: any) => {
        module.content.forEach((item: any) => {
          totalItems++;
          
          const key = `${subject._id}-${item.type}`;
          if (progressMap.has(key)) {
            completedItems++;
          }
        });
      });
      
      // Calculate progress percentage
      const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      
      // Return subject with progress information
      return {
        ...subject.toObject(),
        progress,
        completedItems,
        totalItems
      };
    });
    
    res.json(enhancedSubjects);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/subjects/:id
// @desc    Get subject by ID
// @access  Private
router.get('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const subjectId = req.params.id;
    
    // Find subject by ID
    const subject = await Subject.findById(subjectId);
    
    if (!subject) {
      res.status(404).json({ msg: 'Subject not found' });
      return;
    }
    
    // Get user with content progress - use _id directly to avoid TypeScript issues
    if (!req.user) {
      // No user in request, just return subject without progress
      res.json(subject);
      return;
    }
    
    // Use _id directly instead of id
    const user = await User.findById(req.user._id).select('contentProgress');
    
    if (!user) {
      // Return subject without progress data
      res.json(subject);
      return;
    }
    
    // Create a map for quick lookup of completed items
    const progressMap = new Map<string, boolean>();
    
    if (user.contentProgress && user.contentProgress.length > 0) {
      user.contentProgress.forEach((item: any) => {
        if (item.completed && item.subjectId.toString() === subjectId) {
          const key = `${item.moduleId}-${item.itemId}-${item.type}`;
          progressMap.set(key, true);
        }
      });
    }
    
    // Calculate module level completion
    const enhancedModules = subject.modules.map((module: any) => {
      // Count total and completed items
      let totalItems = module.content.length;
      let completedItems = 0;
      
      // Track completed items
      module.content.forEach((item: any) => {
        const key = `${module._id}-${item._id}-${item.type}`;
        if (progressMap.has(key)) {
          completedItems++;
        }
      });
      
      // Calculate progress percentage
      const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      
      // Enhance content items with completion status
      const enhancedContent = module.content.map((item: any) => {
        const key = `${module._id}-${item._id}-${item.type}`;
        return {
          ...item,
          completed: progressMap.has(key)
        };
      });
      
      // Add progress info and return
      return {
        ...module,
        progress,
        completedItems,
        totalItems,
        content: enhancedContent
      };
    });
    
    // Calculate PYQ completion
    const pyqKey = `pyq-pyq-pyq`;
    const pyqProgress = progressMap.has(pyqKey) ? 100 : 0;
    
    // Calculate overall subject progress
    let totalItemsCount = subject.modules.reduce((total: number, module: any) => total + module.content.length, 0);
    if (subject.pyqs && subject.pyqs.count > 0) totalItemsCount++;
    
    let completedItemsCount = enhancedModules.reduce((total: number, module: any) => total + module.completedItems, 0);
    if (pyqProgress === 100) completedItemsCount++;
    
    const subjectProgress = totalItemsCount > 0 ? Math.round((completedItemsCount / totalItemsCount) * 100) : 0;
    
    // Return the subject with progress info
    res.json({
      ...subject.toObject(),
      modules: enhancedModules,
      pyqs: {
        ...subject.pyqs,
        progress: pyqProgress
      },
      progress: subjectProgress
    });
  } catch (err) {
    console.error(err);
    
    if (err instanceof mongoose.Error.CastError) {
      res.status(404).json({ msg: 'Subject not found' });
      return;
    }
    
    res.status(500).send('Server error');
  }
});

// Routes for admin to add/update subjects would go here

export default router;