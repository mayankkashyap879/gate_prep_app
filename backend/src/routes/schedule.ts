// backend/src/routes/schedule.ts
import express, { Request, Response } from 'express';
import { check, validationResult } from 'express-validator';
import Schedule from '../models/Schedule';
import User, { IScheduleItem } from '../models/User';
import auth from '../middleware/auth';
import * as schedulingService from '../services/schedulingService';
import mongoose from 'mongoose';
import { toObjectId } from '../utils/mongoose-utils';

const router = express.Router();

// @route   GET api/schedule
// @desc    Get user's schedule for a date range
// @access  Private
router.get('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    let { startDate, endDate } = req.query;
    const parsedStartDate = startDate ? new Date(startDate as string) : new Date();
    parsedStartDate.setHours(0, 0, 0, 0);
    
    const parsedEndDate = endDate ? new Date(endDate as string) : new Date(parsedStartDate);
    parsedEndDate.setDate(parsedEndDate.getDate() + 30); // Default to 30 days from start
    parsedEndDate.setHours(23, 59, 59, 999);
    
    // Get the user document with the schedule
    const user = await User.findById(req.user?.id);
    
    if (!user) {
      res.status(404).json({ msg: 'User not found' });
      return;
    }
    
    if (!user.schedule || user.schedule.length === 0) {
      // No schedule exists, try to generate one
      try {
        await schedulingService.generateSchedule(user._id ? user._id.toString() : user.id, parsedStartDate, 30);
        // Get the updated user with the new schedule
        const updatedUser = await User.findById(user._id ? user._id : user.id);
        if (!updatedUser || !updatedUser.schedule || updatedUser.schedule.length === 0) {
          // Still no schedule, return empty array
          res.json([]);
          return;
        }
        
        // Use the updated user's schedule
        user.schedule = updatedUser.schedule;
      } catch (genError: any) {
        console.error("Error generating schedule:", genError);
        res.json([]);
        return;
      }
    }
    
    // Group the schedule items by date to create daily schedules
    const schedulesByDate = new Map<string, any>();
    
    user.schedule.forEach(item => {
      const itemDate = new Date(item.date);
      // Only include items in the requested date range
      if (itemDate >= parsedStartDate && itemDate <= parsedEndDate) {
        const dateStr = itemDate.toISOString().split('T')[0]; // YYYY-MM-DD
        
        if (!schedulesByDate.has(dateStr)) {
          // Create a new schedule for this date
          schedulesByDate.set(dateStr, {
            date: itemDate,
            plannedSessions: [],
            totalPlannedDuration: 0,
            totalCompletedDuration: 0
          });
        }
        
        // Add this item to the day's schedule
        const daySchedule = schedulesByDate.get(dateStr);
        daySchedule.plannedSessions.push(item);
        daySchedule.totalPlannedDuration += item.duration;
        if (item.completed) {
          daySchedule.totalCompletedDuration += item.duration;
        }
      }
    });
    
    // Convert the map to an array and sort by date
    const schedules = Array.from(schedulesByDate.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    res.json(schedules);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/schedule/date/:date
// @desc    Get user's schedule for a specific date
// @access  Private
router.get('/date/:date', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const dateStr = req.params.date;
    const date = new Date(dateStr);
    
    // Make sure we have a valid date
    if (isNaN(date.getTime())) {
      res.status(400).json({ msg: 'Invalid date format. Use YYYY-MM-DD.' });
      return;
    }
    
    // Set to start of day
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // Get schedule from user document
    const user = await User.findById(req.user?.id);
    
    if (user && user.schedule && user.schedule.length > 0) {
      // Filter schedule items for the requested date
      const dateItems = user.schedule.filter((item: IScheduleItem) => {
        const itemDate = new Date(item.date);
        return itemDate >= date && itemDate < nextDay;
      });
      
      if (dateItems.length > 0) {
        // Calculate completed duration
        const completedDuration = dateItems.reduce((sum: number, item: IScheduleItem) => {
          return item.completed ? sum + item.duration : sum;
        }, 0);
        
        // Calculate total duration
        const totalDuration = dateItems.reduce((sum: number, item: IScheduleItem) => sum + item.duration, 0);
        
        // Return formatted response
        res.json({
          date: date.toISOString(),
          plannedSessions: dateItems,
          totalPlannedDuration: totalDuration,
          totalCompletedDuration: completedDuration
        });
        return;
      }
    }
    
    // If no schedule exists for this date, generate one if it's today or the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Only generate for today or future dates
    if (date.getTime() >= today.getTime() && req.user?.id) {
      const schedules = await schedulingService.generateSchedule(req.user.id, date, 7); // Generate a week ahead
      
      // Try to get the new schedule again from user document
      const updatedUser = await User.findById(req.user.id);
      
      if (updatedUser && updatedUser.schedule && updatedUser.schedule.length > 0) {
        // Filter schedule items for the requested date
        const dateItems = updatedUser.schedule.filter((item: IScheduleItem) => {
          const itemDate = new Date(item.date);
          return itemDate >= date && itemDate < nextDay;
        });
        
        if (dateItems.length > 0) {
          // Calculate completed duration
          const completedDuration = dateItems.reduce((sum: number, item: IScheduleItem) => {
            return item.completed ? sum + item.duration : sum;
          }, 0);
          
          // Calculate total duration
          const totalDuration = dateItems.reduce((sum: number, item: IScheduleItem) => sum + item.duration, 0);
          
          // Return formatted response
          res.json({
            date: date.toISOString(),
            plannedSessions: dateItems,
            totalPlannedDuration: totalDuration,
            totalCompletedDuration: completedDuration
          });
          return;
        }
      }
      
      // If schedules were generated and returned in the expected format
      if (schedules && schedules.length > 0) {
        res.json(schedules[0]);
        return;
      }
    }
    
    // Return empty schedule for past dates or if generation failed
    res.json({
      date: date.toISOString(),
      plannedSessions: [],
      totalPlannedDuration: 0,
      totalCompletedDuration: 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/schedule/today
// @desc    Get user's schedule for today
// @access  Private
router.get('/today', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ msg: 'User ID not found' });
      return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // First try to get schedule from user document (new approach)
    const user = await User.findById(req.user.id);
    
    if (user && user.schedule && user.schedule.length > 0) {
      // Filter schedule items for today
      const todayItems = user.schedule.filter((item: IScheduleItem) => {
        const itemDate = new Date(item.date);
        return itemDate >= today && itemDate < tomorrow;
      });
      
      if (todayItems.length > 0) {
        // Calculate completed duration
        const completedDuration = todayItems.reduce((sum: number, item: IScheduleItem) => {
          return item.completed ? sum + item.duration : sum;
        }, 0);
        
        // Calculate total duration
        const totalDuration = todayItems.reduce((sum: number, item: IScheduleItem) => sum + item.duration, 0);
        
        // Return formatted response
        res.json({
          date: today.toISOString(),
          plannedSessions: todayItems,
          totalPlannedDuration: totalDuration,
          totalCompletedDuration: completedDuration
        });
        return;
      }
    }
    
    // If no schedule exists for today, generate one
    const schedules = await schedulingService.generateSchedule(req.user.id, today, 7); // Generate a week ahead
    
    // Try to get the new schedule again (now from user document)
    const updatedUser = await User.findById(req.user.id);
    
    if (updatedUser && updatedUser.schedule && updatedUser.schedule.length > 0) {
      // Filter schedule items for today
      const todayItems = updatedUser.schedule.filter((item: IScheduleItem) => {
        const itemDate = new Date(item.date);
        return itemDate >= today && itemDate < tomorrow;
      });
      
      if (todayItems.length > 0) {
        // Calculate completed duration
        const completedDuration = todayItems.reduce((sum: number, item: IScheduleItem) => {
          return item.completed ? sum + item.duration : sum;
        }, 0);
        
        // Calculate total duration
        const totalDuration = todayItems.reduce((sum: number, item: IScheduleItem) => sum + item.duration, 0);
        
        // Return formatted response
        res.json({
          date: today.toISOString(),
          plannedSessions: todayItems,
          totalPlannedDuration: totalDuration,
          totalCompletedDuration: completedDuration
        });
        return;
      }
    }
    
    // If schedules were generated and returned in the expected format
    if (schedules && schedules.length > 0) {
      res.json(schedules[0]);
      return;
    }
    
    // Create a default empty schedule response object as last resort
    res.json({
      date: today.toISOString(),
      plannedSessions: [],
      totalPlannedDuration: 0,
      totalCompletedDuration: 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   POST api/schedule/generate
// @desc    Generate or regenerate schedule
// @access  Private
router.post(
  '/generate',
  [
    auth,
    check('startDate', 'Start date is required').optional().isISO8601(),
    check('days', 'Days must be a positive number').optional().isInt({ min: 1, max: 365 }),
    check('regenerate', 'Regenerate flag must be a boolean').optional().isBoolean()
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    
    try {
      if (!req.user?.id) {
        res.status(401).json({ msg: 'User ID not found' });
        return;
      }
      
      const startDate = req.body.startDate ? new Date(req.body.startDate) : new Date();
      const days = req.body.days || 30;
      const regenerate = req.body.regenerate === true;
      
      console.log(`Processing schedule generation for user ${req.user.id}:`, {
        startDate,
        days,
        regenerate
      });
      
      // If regenerating, we'll first clean up existing schedules
      if (regenerate) {
        console.log(`Regenerating schedule for user ${req.user.id}, clearing existing schedules`);
        await Schedule.deleteMany({ 
          userId: toObjectId(req.user.id),
          date: { $gte: startDate }
        });
      }
      
      try {
        // Step 1: Check if user exists and has valid settings
        const user = await User.findById(req.user.id);
        if (!user) {
          res.status(404).json({ error: 'User not found' });
          return;
        }
        
        // Step 2: Check if user has a deadline set
        if (!user.deadline) {
          res.status(400).json({ 
            error: 'Deadline not set', 
            details: 'Please set a deadline in your settings before generating a schedule' 
          });
          return;
        }
        
        // Step 3: Check if user has selected subjects
        if (!user.selectedSubjects || user.selectedSubjects.length === 0) {
          res.status(400).json({ 
            error: 'No subjects selected', 
            details: 'Please select at least one subject in your settings before generating a schedule' 
          });
          return;
        }
        
        // Step 4: Generate schedule (this will automatically recalculate study plans internally)
        console.log('Generating schedule for user:', req.user.id);
        const schedules = await schedulingService.generateSchedule(req.user.id, startDate, days);
        
        // Step 6: Return the result with some stats
        const scheduleStats = {
          scheduleCount: schedules.length,
          totalSessions: schedules.reduce((count, schedule) => count + schedule.plannedSessions.length, 0),
          totalDuration: schedules.reduce((total, schedule) => total + schedule.totalPlannedDuration, 0),
          startDate: startDate.toISOString(),
          endDate: schedules.length > 0 ? schedules[schedules.length - 1].date.toISOString() : startDate.toISOString()
        };
        
        console.log('Schedule generation successful with stats:', scheduleStats);
        res.json({
          success: true,
          schedules,
          stats: scheduleStats
        });
      } catch (error: any) {
        console.error('Error in schedule generation process:', error);
        
        // Provide a more detailed error response
        let statusCode = 500;
        let errorMessage = 'Failed to generate schedule';
        let errorDetails = error.message || 'Unknown error';
        
        // Check for specific error types to provide better error messages
        if (errorDetails.includes('User not found') || errorDetails.includes('User ID')) {
          statusCode = 404;
          errorMessage = 'User not found';
        } else if (errorDetails.includes('deadline not found') || errorDetails.includes('has no deadline')) {
          statusCode = 400;
          errorMessage = 'Deadline not set';
        } else if (errorDetails.includes('document size limit')) {
          statusCode = 500;
          errorMessage = 'Schedule too large';
          errorDetails = 'The generated schedule is too large. Try selecting fewer subjects or a shorter schedule period.';
        }
        
        res.status(statusCode).json({ 
          error: errorMessage,
          details: errorDetails,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
    } catch (err: any) {
      console.error('Unexpected error in schedule generation:', err);
      res.status(500).json({
        error: 'Server error',
        details: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  }
);

// @route   PUT api/schedule/session/:sessionId
// @desc    Mark a session as completed
// @access  Private
router.put(
  '/session/:sessionId',
  [
    auth,
    check('completed', 'Completed status is required').isBoolean()
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    
    try {
      if (!req.user?.id) {
        res.status(401).json({ msg: 'User ID not found' });
        return;
      }
      
      // Get the user and their schedule
      const user = await User.findById(req.user.id);
      
      if (!user) {
        res.status(404).json({ msg: 'User not found' });
        return;
      }
      
      if (!user.schedule || user.schedule.length === 0) {
        res.status(404).json({ msg: 'No schedule found for user' });
        return;
      }
      
      // Find the session in the user's schedule
      const sessionId = req.params.sessionId;
      let updateResult;
      
      try {
        // First try to update by _id
        updateResult = await User.updateOne(
          { 
            _id: user._id ? user._id : user.id,
            'schedule._id': toObjectId(sessionId)
          },
          { 
            $set: { 
              'schedule.$.completed': req.body.completed,
              'schedule.$.completedDate': req.body.completed ? new Date() : null
            } 
          }
        );
        
        // If no documents matched, try to see if the sessionId is actually an itemId
        if (updateResult.matchedCount === 0) {
          console.log('No match by _id, trying to match by itemId...');
          updateResult = await User.updateOne(
            { 
              _id: user._id ? user._id : user.id,
              'schedule.itemId': toObjectId(sessionId)
            },
            { 
              $set: { 
                'schedule.$.completed': req.body.completed,
                'schedule.$.completedDate': req.body.completed ? new Date() : null
              } 
            }
          );
        }
        
        // If that still didn't work and sessionId contains dashes, try to parse it
        if (updateResult.matchedCount === 0 && sessionId.includes('-')) {
          console.log('No match by itemId, trying to parse compound ID...');
          const [subjectId, moduleId, itemId] = sessionId.split('-');
          
          if (subjectId && moduleId && itemId) {
            // Try to match by the combination of subject, module, and item IDs
            updateResult = await User.updateOne(
              { 
                _id: user._id ? user._id : user.id,
                'schedule.subjectId': toObjectId(subjectId),
                'schedule.moduleId': toObjectId(moduleId),
                'schedule.itemId': toObjectId(itemId) 
              },
              { 
                $set: { 
                  'schedule.$.completed': req.body.completed,
                  'schedule.$.completedDate': req.body.completed ? new Date() : null
                } 
              }
            );
          }
        }
      } catch (err) {
        console.error('Error updating schedule session:', err);
        res.status(500).send('Error updating session');
        return;
      }
      
      if (updateResult.matchedCount === 0) {
        res.status(404).json({ msg: 'Session not found in user schedule' });
        return;
      }
      
      // Get the updated item from the schedule
      const updatedUser = await User.findById(user._id ? user._id : user.id);
      const updatedSession = updatedUser?.schedule?.find(
        item => item._id && item._id.toString() === sessionId
      );
      
      // Also create a study session and update user streak when item is completed
      if (req.body.completed && updatedSession) {
        try {
          // Extract the duration from request body or from session
          const duration = req.body.duration ? parseInt(req.body.duration.toString()) : updatedSession.duration;
          
          // Create a study session record
          const now = new Date();
          const startTime = new Date(now.getTime() - (duration * 60 * 1000)); // Calculate start time based on duration
          
          // IMPORTANT: We're only updating the study session here, NOT updating contentProgress
          // This fixes the duplicate progress issue by keeping track of the study time
          // without duplicating the content progress entry
          
          // Check if content is already marked as completed in contentProgress
          const userWithProgress = await User.findById(req.user.id);
          
          if (!userWithProgress) {
            console.error('User not found when checking for existing progress');
            throw new Error('User not found');
          }
          
          const existingProgress = userWithProgress.contentProgress?.find(
            (item: any) => {
              return item.subjectId.toString() === updatedSession.subjectId.toString() &&
                     item.moduleId.toString() === updatedSession.moduleId.toString() &&
                     item.itemId.toString() === updatedSession.itemId.toString() &&
                     item.type === updatedSession.type;
            }
          );
          
          if (!existingProgress) {
            // Only add to contentProgress if it doesn't exist
            await User.updateOne(
              { _id: userWithProgress._id },
              { 
                $push: { 
                  studySessions: {
                    subjectId: updatedSession.subjectId,
                    moduleId: updatedSession.moduleId,
                    itemId: updatedSession.itemId,
                    type: updatedSession.type,
                    startTime: startTime,
                    endTime: now,
                    duration: duration,
                    notes: req.body.notes || 'Marked as completed from schedule'
                  },
                  contentProgress: {
                    subjectId: updatedSession.subjectId,
                    moduleId: updatedSession.moduleId,
                    itemId: updatedSession.itemId,
                    type: updatedSession.type,
                    completed: true,
                    completedDate: now,
                    timeSpent: duration,
                    notes: req.body.notes || 'Marked as completed from schedule'
                  }
                },
                $inc: { totalStudyTime: duration }
              }
            );
          } else {
            // Just add study session record and update total time
            await User.updateOne(
              { _id: userWithProgress._id },
              { 
                $push: { 
                  studySessions: {
                    subjectId: updatedSession.subjectId,
                    moduleId: updatedSession.moduleId,
                    itemId: updatedSession.itemId,
                    type: updatedSession.type,
                    startTime: startTime,
                    endTime: now,
                    duration: duration,
                    notes: req.body.notes || 'Marked as completed from schedule'
                  }
                },
                $inc: { totalStudyTime: duration }
              }
            );
            
            console.log('Content already marked as completed, only adding study session');
          }
          
        } catch (error) {
          console.error('Error creating study session:', error);
          // Continue without failing the whole request
        }
        
        // Update user streak
        await schedulingService.updateUserStreak(req.user.id);
      }
      
      // Return the updated session
      res.json({
        success: true,
        message: req.body.completed ? 'Session marked as completed' : 'Session marked as incomplete',
        session: updatedSession
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  }
);

// @route   DELETE api/schedule/reset
// @desc    Reset user's schedule (delete all scheduled items)
// @access  Private
router.delete('/reset', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ msg: 'User ID not found' });
      return;
    }
    
    // Clear the schedule array in the user document
    await User.updateOne(
      { _id: toObjectId(req.user.id) },
      { $set: { schedule: [] } }
    );
    
    res.json({ success: true, msg: 'Schedule reset successfully' });
  } catch (err) {
    console.error('Error resetting schedule:', err);
    res.status(500).send('Server error');
  }
});

export default router;