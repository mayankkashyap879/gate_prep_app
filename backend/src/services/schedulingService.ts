// backend/src/services/schedulingService.ts
import mongoose from 'mongoose';
import Subject, { ISubject } from '../models/Subject';
import User, { IUser, IScheduleItem } from '../models/User';
import Schedule, { ISchedule, IScheduleBase, IPlannedSession } from '../models/Schedule';
import UserProgress, { IUserProgress } from '../models/UserProgress';
import { toObjectId } from '../utils/mongoose-utils';

// Advanced in-memory lock mechanism to prevent concurrent schedule generation
// Stores a map of userId to lock info (locked status and timestamp)
interface LockInfo {
  locked: boolean;
  timestamp: number;
}

const scheduleLocks = new Map<string, LockInfo>();

// Lock timeout in milliseconds (5 minutes - after this, lock is considered stale)
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;

// Helper to acquire a lock for a specific user
const acquireLock = (userId: string): boolean => {
  const now = Date.now();
  const existingLock = scheduleLocks.get(userId);
  
  // If lock exists, check if it's stale
  if (existingLock) {
    if (now - existingLock.timestamp > LOCK_TIMEOUT_MS) {
      // Lock is stale, can be overridden
      console.log(`Overriding stale lock for user ${userId} (created ${(now - existingLock.timestamp) / 1000}s ago)`);
      scheduleLocks.set(userId, { locked: true, timestamp: now });
      return true;
    }
    
    // Lock is still valid
    return false;
  }
  
  // No existing lock, create a new one
  scheduleLocks.set(userId, { locked: true, timestamp: now });
  return true;
};

// Helper to release a lock
const releaseLock = (userId: string): void => {
  scheduleLocks.delete(userId);
};

// Periodically clean up stale locks (runs every minute)
setInterval(() => {
  const now = Date.now();
  let staleLocksRemoved = 0;
  
  for (const [userId, lockInfo] of scheduleLocks.entries()) {
    if (now - lockInfo.timestamp > LOCK_TIMEOUT_MS) {
      scheduleLocks.delete(userId);
      staleLocksRemoved++;
    }
  }
  
  if (staleLocksRemoved > 0) {
    console.log(`Cleaned up ${staleLocksRemoved} stale schedule locks`);
  }
}, 60 * 1000);

interface StudyPlan {
  daysRemaining: number;
  totalRemainingMinutes: number;
  dailyTargets: {
    minimum: number;
    moderate: number;
    maximum: number;
    custom: number;
  };
  selectedPlan: string;
}

interface StudyItem {
  subjectId: mongoose.Types.ObjectId;
  subjectName: string;
  moduleId: mongoose.Types.ObjectId;
  moduleName: string;
  itemId: mongoose.Types.ObjectId;
  itemName: string;
  type: 'lecture' | 'quiz' | 'homework' | 'pyq';
  duration: number;
  priority: number;
  order: number; // To maintain the original sequence
}

interface StreakUpdate {
  streak: number;
  maintained: boolean;
  percentage?: number;
  message: string;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  streak: number;
  totalStudyTime: number;
  totalStudyHours: number;
}

/**
 * Internal version of calculateStudyPlans that doesn't acquire a lock
 * Used when already inside another locked function
 */
const calculateStudyPlansInternal = async (userId: string): Promise<StudyPlan> => {
  try {
    // Validate userId
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // Get user and their deadline
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    if (!user.deadline) {
      throw new Error(`User with ID ${userId} has no deadline set. Please update user settings.`);
    }
    
    // Same logic as the public version below...
    const today = new Date();
    const deadline = new Date(user.deadline);
    const daysRemaining = Math.max(1, Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Get selected subjects or all subjects if none selected
    let subjects: ISubject[] = [];
    
    if (user.selectedSubjects && user.selectedSubjects.length > 0) {
      // Get only the subjects the user has selected
      subjects = await Subject.find({
        _id: { $in: user.selectedSubjects }
      });
      console.log(`Found ${subjects.length} selected subjects for calculating study plans`);
    } else {
      // Fallback: If no subjects are selected, use all subjects
      subjects = await Subject.find({});
      console.log(`No selected subjects found, using all ${subjects.length} subjects for calculation`);
    }
    
    // Calculate total remaining duration
    let totalRemainingMinutes = 0;
    
    // We already have the user object from earlier, no need to fetch again
    // Just double check the contentProgress field
    if (!user || !user.contentProgress) {
      console.log("User or user's content progress not found, assuming all content is remaining");
      // If user has no progress, assume all content is remaining
      for (const subject of subjects) {
        totalRemainingMinutes += subject.totalDuration;
      }
    } else {
      // For each subject, calculate remaining time
      for (const subject of subjects) {
        // Create a map of completed items from user's contentProgress
        const completedItemsMap = new Map<string, boolean>();
        const subjectIdStr = subject._id ? subject._id.toString() : '';
        
        user.contentProgress.forEach(item => {
          if (subjectIdStr && item.subjectId.toString() === subjectIdStr && item.completed) {
            const key = `${item.moduleId}-${item.itemId}-${item.type}`;
            completedItemsMap.set(key, true);
          }
        });
        
        // Calculate completed duration
        let completedDuration = 0;
        
        // Check each module's content items
        subject.modules.forEach(module => {
          module.content.forEach(item => {
            const key = `${module._id}-${item._id}-${item.type}`;
            if (completedItemsMap.has(key)) {
              completedDuration += item.durationMinutes;
            }
          });
        });
        
        // Check PYQs
        const pyqKey = `pyq-pyq-pyq`;
        if (subject.pyqs.count > 0 && completedItemsMap.has(pyqKey)) {
          completedDuration += subject.pyqs.estimatedDuration;
        }
        
        // Add remaining duration to total
        totalRemainingMinutes += (subject.totalDuration - completedDuration);
      }
    }
    
    // Calculate daily targets based on days left and total remaining content
    // The minimum intensity is whatever time is needed to complete everything by the deadline
    const minimumDailyMinutes = Math.max(120, Math.ceil(totalRemainingMinutes / daysRemaining)); 
    
    // Moderate is minimum + 1 hour
    const moderateDailyMinutes = minimumDailyMinutes + 60; 
    
    // Maximum is minimum + 2 hours
    const maximumDailyMinutes = minimumDailyMinutes + 120;
    
    // Preserve user's custom setting, but make sure it's at least minimum and at most 16 hours
    const customDailyMinutes = Math.min(
      960, // 16 hours max
      Math.max(minimumDailyMinutes, user.dailyTarget.custom || minimumDailyMinutes + 60)
    );
    
    // Update user's daily targets
    user.dailyTarget = {
      minimum: minimumDailyMinutes,
      moderate: moderateDailyMinutes,
      maximum: maximumDailyMinutes,
      custom: customDailyMinutes
    };
    
    console.log('Updated user daily targets:', user.dailyTarget);
    
    // Add retry mechanism for saving to avoid version errors 
    let savedSuccessfully = false;
    let retries = 0;
    const MAX_RETRIES = 3;
    
    while (!savedSuccessfully && retries < MAX_RETRIES) {
      try {
        // Use updateOne instead of save to avoid version conflicts
        await User.updateOne(
          { _id: user._id },
          { 
            $set: { 
              dailyTarget: user.dailyTarget 
            }
          }
        );
        savedSuccessfully = true;
      } catch (saveError: any) {
        retries++;
        console.error(`Error saving user daily targets (attempt ${retries}):`, saveError);
        if (retries >= MAX_RETRIES) {
          throw saveError;
        }
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 100 * retries));
      }
    }
    
    return {
      daysRemaining,
      totalRemainingMinutes,
      dailyTargets: user.dailyTarget,
      selectedPlan: user.selectedPlan
    };
  } catch (error: any) {
    console.error('Error in internal calculation of study plans:', error);
    throw error;
  }
};

/**
 * Calculate study plans based on user's deadline and remaining content
 * Public version that acquires a lock
 */
export const calculateStudyPlans = async (userId: string): Promise<StudyPlan> => {
  if (!acquireLock(userId)) {
    // Get how long the lock has been held
    const lockInfo = scheduleLocks.get(userId);
    const lockAgeSeconds = lockInfo ? Math.round((Date.now() - lockInfo.timestamp) / 1000) : 0;
    
    throw new Error(`Another schedule operation is in progress for user ${userId} (started ${lockAgeSeconds}s ago)`);
  }
  
  console.log(`Successfully acquired lock for user ${userId}'s study plan calculation`);
  
  try {
    return await calculateStudyPlansInternal(userId);
  } catch (error: any) {
    console.error('Error calculating study plans:', error);
    throw error;
  } finally {
    // Always release the lock, even if there was an error
    releaseLock(userId);
  }
};

/**
 * Generate a study schedule for the user
 */
export const generateSchedule = async (
  userId: string, 
  startDate: Date = new Date(), 
  days: number = 30
): Promise<ISchedule[]> => {
  // Acquire a lock to prevent concurrent schedule generation
  if (!acquireLock(userId)) {
    const lockInfo = scheduleLocks.get(userId);
    const lockAgeSeconds = lockInfo ? Math.round((Date.now() - lockInfo.timestamp) / 1000) : 0;
    throw new Error(
      `Another schedule operation is in progress for user ${userId} (started ${lockAgeSeconds}s ago)`
    );
  }
  
  console.log(`Successfully acquired lock for user ${userId}'s schedule generation`);
  
  try {
    // First, update the study plans so we have up-to-date daily targets
    try {
      await calculateStudyPlansInternal(userId);
    } catch (error: any) {
      console.error('Error calculating study plans during schedule generation:', error);
      throw new Error(`Failed to update study plans: ${error.message || 'Unknown error'}`);
    }
    
    // Get the user document
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Determine the daily target minutes based on user's selected plan
    const selectedPlan = user.selectedPlan || 'moderate';
    let dailyTargetMinutes = user.dailyTarget[selectedPlan as keyof typeof user.dailyTarget];
    if (!dailyTargetMinutes || dailyTargetMinutes <= 0) {
      console.warn(
        `Invalid daily target for user ${userId}, plan: ${selectedPlan}. Using fallback value.`
      );
      dailyTargetMinutes = user.dailyTarget.moderate || user.dailyTarget.minimum || 120;
    }
    
    // FIX: If no subjects are selected, return an empty schedule.
    if (!user.selectedSubjects || user.selectedSubjects.length === 0) {
      console.log("User has not selected any subjects; returning an empty schedule.");
      return [];
    }
    
    // Get only the subjects the user has selected
    const userSelectedSubjects = await Subject.find({
      _id: { $in: user.selectedSubjects }
    });
    console.log(`Found ${userSelectedSubjects.length} selected subjects for user`);
    if (userSelectedSubjects.length === 0) {
      console.log("No matching selected subjects found; returning an empty schedule.");
      return [];
    }
    
    // Get all completed items for this user from progress
    const completedItems = await UserProgress.find({
      userId: userId,
      completed: true
    });
    const completedItemsMap = new Map<string, boolean>();
    completedItems.forEach(item => {
      const key = `${item.subjectId}-${item.moduleId}-${item.itemId}-${item.type}`;
      completedItemsMap.set(key, true);
    });
    
    // Build a prioritized list of study items to schedule
    interface StudyItem {
      subjectId: mongoose.Types.ObjectId;
      subjectName: string;
      moduleId: mongoose.Types.ObjectId;
      moduleName: string;
      itemId: mongoose.Types.ObjectId;
      itemName: string;
      type: 'lecture' | 'quiz' | 'homework' | 'pyq';
      duration: number;
      priority: number;
      order: number;
    }
    const studyItems: StudyItem[] = [];
    let orderCounter = 0;
    const uniqueStudyItemMap = new Map<string, boolean>();
    
    // Process each selected subject
    userSelectedSubjects.forEach(subject => {
      // Default priority for subject is 5 unless overridden by user
      let subjectPriority = 5;
      const subjectIdStr = subject._id?.toString();
      if (user.subjectPriorities && subjectIdStr && user.subjectPriorities[subjectIdStr]) {
        subjectPriority = user.subjectPriorities[subjectIdStr];
      }
      
      // Process each module in the subject
      subject.modules.forEach(module => {
        module.content.forEach(item => {
          const key = `${subject._id}-${module._id}-${item._id}-${item.type}`;
          if (!completedItemsMap.has(key) && !uniqueStudyItemMap.has(key)) {
            uniqueStudyItemMap.set(key, true);
            studyItems.push({
              subjectId: toObjectId(subject._id),
              subjectName: subject.name,
              moduleId: toObjectId(module._id),
              moduleName: module.name,
              itemId: toObjectId(item._id),
              itemName: item.name,
              type: item.type as 'lecture' | 'quiz' | 'homework',
              duration: item.durationMinutes,
              priority: subjectPriority,
              order: orderCounter++
            });
          }
        });
      });
      
      // Process PYQs if available
      if (
        subject.pyqs &&
        subject.pyqs.count > 0 &&
        !completedItemsMap.has(`${subject._id}-pyq-pyq-pyq`) &&
        !uniqueStudyItemMap.has(`${subject._id}-pyq-pyq-pyq`)
      ) {
        uniqueStudyItemMap.set(`${subject._id}-pyq-pyq-pyq`, true);
        const totalPyqDuration = subject.pyqs.estimatedDuration;
        const maxPyqSessionMinutes = 180; // Maximum 3 hours per session
        const numberOfSessions = Math.ceil(totalPyqDuration / maxPyqSessionMinutes);
        const durationPerSession = Math.ceil(totalPyqDuration / numberOfSessions);
        for (let i = 0; i < numberOfSessions; i++) {
          const pyqId = new mongoose.Types.ObjectId();
          const sessionNumber = numberOfSessions > 1 ? ` (Part ${i + 1}/${numberOfSessions})` : '';
          const pyqPartKey = `${subject._id}-pyq-${i}-pyq`;
          if (!uniqueStudyItemMap.has(pyqPartKey)) {
            uniqueStudyItemMap.set(pyqPartKey, true);
            studyItems.push({
              subjectId: toObjectId(subject._id),
              subjectName: subject.name,
              moduleId: new mongoose.Types.ObjectId(), // Special ID for PYQs
              moduleName: 'Previous Year Questions',
              itemId: pyqId,
              itemName: `${subject.name} PYQs${sessionNumber}`,
              type: 'pyq',
              duration: durationPerSession,
              priority: subjectPriority,
              order: orderCounter + 1000 + i
            });
          }
        }
        orderCounter++;
      }
    });
    
    // Group study items by subject for sorting by priority
    const subjectGroups = new Map<string, StudyItem[]>();
    studyItems.forEach(item => {
      const subjectId = item.subjectId.toString();
      if (!subjectGroups.has(subjectId)) {
        subjectGroups.set(subjectId, []);
      }
      subjectGroups.get(subjectId)?.push(item);
    });
    // Sort subjects in descending order of priority
    const sortedSubjectIds = [...subjectGroups.keys()].sort((a, b) => {
      const aItems = subjectGroups.get(a) || [];
      const bItems = subjectGroups.get(b) || [];
      const aPriority = aItems.length > 0 ? aItems[0].priority : 0;
      const bPriority = bItems.length > 0 ? bItems[0].priority : 0;
      return bPriority - aPriority;
    });
    // Sort items within each group by their original order
    sortedSubjectIds.forEach(subjectId => {
      const subjectItems = subjectGroups.get(subjectId) || [];
      subjectItems.sort((a, b) => a.order - b.order);
    });
    // Rebuild the studyItems array in sorted order
    studyItems.length = 0;
    sortedSubjectIds.forEach(subjectId => {
      const subjectItems = subjectGroups.get(subjectId) || [];
      studyItems.push(...subjectItems);
    });
    
    // Generate daily schedule items
    const userScheduleItems: IScheduleItem[] = [];
    let currentDate = new Date(startDate);
    let itemIndex = 0;
    
    for (let day = 0; day < days; day++) {
      if (itemIndex >= studyItems.length) break;
      
      const currentDayPlannedSessions: IPlannedSession[] = [];
      let dailyMinutesScheduled = 0;
      const maxDailyMinutes = dailyTargetMinutes * 1.1; // Allow up to 10% over target
      let currentSubjectId: string | null = null;
      
      while (itemIndex < studyItems.length && dailyMinutesScheduled < dailyTargetMinutes) {
        const item = studyItems[itemIndex];
        if (currentSubjectId !== item.subjectId.toString()) {
          if (dailyMinutesScheduled > dailyTargetMinutes * 0.7 && dailyMinutesScheduled > 60) {
            break;
          }
          currentSubjectId = item.subjectId.toString();
        }
        if (dailyMinutesScheduled + item.duration > maxDailyMinutes && currentDayPlannedSessions.length > 0) {
          break;
        }
        
        const plannedSession: IPlannedSession = {
          subjectId: item.subjectId,
          moduleId: item.moduleId,
          itemId: item.itemId,
          type: item.type,
          duration: item.duration,
          completed: false,
          name: item.itemName,
          moduleName: item.moduleName,
          subjectName: item.subjectName
        };
        
        // Check for duplicates in the current day's sessions
        const isSessionDuplicate = currentDayPlannedSessions.some(session => 
          session.itemId.toString() === plannedSession.itemId.toString() &&
          session.type === plannedSession.type
        );
        if (!isSessionDuplicate) {
          currentDayPlannedSessions.push(plannedSession);
        }
        dailyMinutesScheduled += item.duration;
        
        const userScheduleItem: IScheduleItem = {
          date: new Date(currentDate),
          subjectId: item.subjectId,
          moduleId: item.moduleId,
          itemId: item.itemId,
          type: item.type,
          name: item.itemName,
          moduleName: item.moduleName,
          subjectName: item.subjectName,
          duration: item.duration,
          completed: false
        };
        const isItemDuplicate = userScheduleItems.some(existingItem => 
          existingItem.itemId.toString() === userScheduleItem.itemId.toString() &&
          existingItem.type === userScheduleItem.type &&
          existingItem.date.toISOString().split('T')[0] === userScheduleItem.date.toISOString().split('T')[0]
        );
        if (!isItemDuplicate) {
          userScheduleItems.push(userScheduleItem);
        }
        itemIndex++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Save schedule items to the user's document
    if (userScheduleItems.length > 0) {
      console.log(`Saving ${userScheduleItems.length} schedule items to user document`);
      try {
        await User.updateOne(
          { _id: toObjectId(userId), schedule: { $exists: false } },
          { $set: { schedule: [] } }
        );
        await User.updateOne(
          { _id: toObjectId(userId) },
          { $pull: { schedule: { date: { $gte: startDate } } } }
        );
        
        // Deduplicate based on a key including itemId, type, and date
        const uniqueItems: Map<string, IScheduleItem> = new Map();
        userScheduleItems.forEach(item => {
          const dateStr = item.date.toISOString().split('T')[0];
          const key = `${item.itemId.toString()}-${item.type}-${dateStr}`;
          if (!uniqueItems.has(key)) {
            uniqueItems.set(key, item);
          }
        });
        const deduplicatedItems = Array.from(uniqueItems.values());
        const BATCH_SIZE = 100;
        const batches: IScheduleItem[][] = [];
        for (let i = 0; i < deduplicatedItems.length; i += BATCH_SIZE) {
          batches.push(deduplicatedItems.slice(i, i + BATCH_SIZE));
        }
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          await User.updateOne(
            { _id: toObjectId(userId) },
            { $push: { schedule: { $each: batch } } }
          );
        }
        console.log(`Successfully added ${deduplicatedItems.length} schedule items to user ${userId}`);
      } catch (updateError: any) {
        console.error('Error updating user schedule:', updateError);
      }
    }
    
    // Group schedule items by date to return an aggregated schedule
    const schedulesMap = new Map<string, IScheduleBase>();
    if (userScheduleItems.length > 0) {
      userScheduleItems.forEach(item => {
        const dateKey = new Date(item.date).toISOString().split('T')[0];
        if (!schedulesMap.has(dateKey)) {
          schedulesMap.set(dateKey, {
            userId: toObjectId(userId),
            date: new Date(item.date),
            plannedSessions: [],
            totalPlannedDuration: 0,
            totalCompletedDuration: 0
          });
        }
        const scheduleForDay = schedulesMap.get(dateKey);
        if (scheduleForDay) {
          const session: IPlannedSession = {
            subjectId: item.subjectId,
            moduleId: item.moduleId,
            itemId: item.itemId,
            type: item.type,
            name: item.name,
            moduleName: item.moduleName || '',
            subjectName: item.subjectName || '',
            duration: item.duration,
            completed: item.completed
          };
          scheduleForDay.plannedSessions.push(session);
          scheduleForDay.totalPlannedDuration += item.duration;
          if (item.completed) {
            scheduleForDay.totalCompletedDuration += item.duration;
          }
        }
      });
    }
    
    return Array.from(schedulesMap.values()) as unknown as ISchedule[];
  } catch (error: any) {
    console.error('Error generating schedule:', error);
    throw error;
  } finally {
    releaseLock(userId);
  }
};

/**
 * Update user streak based on today's progress
 * A streak is maintained if the user completes at least 80% of their daily target
 */
export const updateUserStreak = async (userId: string): Promise<StreakUpdate> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate target completion percentage based on user's selected plan
    let dailyTargetMinutes = 120; // Default to 2 hours if no plan is set
    
    if (user.selectedPlan && user.dailyTarget) {
      dailyTargetMinutes = user.dailyTarget[user.selectedPlan as keyof typeof user.dailyTarget] || 120;
    }
    
    // Get all study sessions from today from the user's studySessions array
    const todaySessions = user.studySessions?.filter(session => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= today && sessionDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
    }) || [];
    
    // Calculate total minutes studied today from study sessions
    const sessionMinutes = todaySessions.reduce((sum, session) => sum + session.duration, 0);
    
    // Log for debugging
    console.log(`User ${userId} has ${todaySessions.length} sessions today with ${sessionMinutes} minutes studied`); 
    
    // Also check user's contentProgress for any items completed today
    const todayProgressItems = user.contentProgress?.filter(item => {
      if (!item.completedDate) return false;
      const completedDate = new Date(item.completedDate);
      return completedDate >= today && completedDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
    }) || [];
    
    // Sum minutes from progress items - this might include some duplication with study sessions
    // but we're mainly concerned if the user has met the 80% threshold
    const progressMinutes = todayProgressItems.reduce((sum, item) => sum + (item.timeSpent || 0), 0);
    
    // Use the higher value of the two to account for any tracking discrepancies
    const totalStudiedMinutes = Math.max(sessionMinutes, progressMinutes);
    
    // Check if the user met at least 80% of their daily target
    const targetPercentage = (totalStudiedMinutes / dailyTargetMinutes) * 100;
    const metTarget = targetPercentage >= 80;
    
    // Update user's streak
    if (metTarget) {
      // Check if the last streak date was yesterday or today
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      let newStreak = 1; // Default to 1 if streak is starting fresh
      
      if (user.lastStreakDate) {
        const lastStreakDay = new Date(user.lastStreakDate);
        
        if (lastStreakDay.toDateString() === yesterday.toDateString()) {
          // Last streak was yesterday, so increment streak
          newStreak = user.streak + 1;
        } else if (lastStreakDay.toDateString() === today.toDateString()) {
          // Already updated today, maintain current streak
          newStreak = user.streak;
        }
      }
      
      // Update using updateOne to avoid version conflicts
      // We don't need to increment totalStudyTime here since it's already updated
      // when adding a study session to the user
      await User.updateOne(
        { _id: user._id },
        { 
          $set: { 
            lastStreakDate: today,
            streak: newStreak
          }
        }
      );
      
      return {
        streak: newStreak,
        maintained: true,
        percentage: targetPercentage,
        message: `Streak maintained! You've completed ${targetPercentage.toFixed(1)}% of your daily target.`
      };
    } else {
      // Did not meet 80% target - no streak update needed
      // We don't need to update totalStudyTime here either since it's already 
      // updated when adding a study session to the user
      
      return {
        streak: user.streak, // Keep current streak - don't reset until next day
        maintained: false,
        percentage: targetPercentage,
        message: `Warning: You've only completed ${targetPercentage.toFixed(1)}% of your daily target. You need at least 80% to maintain your streak.`
      };
    }
  } catch (error: any) {
    console.error('Error updating user streak:', error);
    throw error;
  }
};

/**
 * Get leaderboard based on streak and study time
 */
// Define interfaces for different timeframes
interface TimeframeFilter {
  startTime?: {
    $gte: Date;
    $lt?: Date;
  };
}

export const getLeaderboard = async (
  limit: number = 10, 
  timeFrame: 'daily' | 'weekly' | 'monthly' | 'overall' = 'overall'
): Promise<LeaderboardEntry[]> => {
  try {
    // Get current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Define date filters for different timeframes
    let startDate: Date | null = null;
    
    switch (timeFrame) {
      case 'daily':
        // Just today's study time
        startDate = today;
        break;
        
      case 'weekly':
        // Last 7 days
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
        break;
        
      case 'monthly':
        // Last 30 days
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 30);
        break;
        
      case 'overall':
      default:
        // All time - no date filter needed
        break;
    }
    
    // Base query for overall leaderboard - use user stats directly
    if (timeFrame === 'overall') {
      // For overall stats, directly use the user model's totalStudyTime
      const leaderboard = await User.find({})
        .select('name streak totalStudyTime')
        .sort({ streak: -1, totalStudyTime: -1 })
        .limit(limit);
      
      return leaderboard.map((user, index) => ({
        rank: index + 1,
        name: user.name,
        streak: user.streak,
        totalStudyTime: user.totalStudyTime,
        totalStudyHours: Math.floor(user.totalStudyTime / 60)
      }));
    } else {
      // For time-filtered stats, use study sessions in user documents
      
      // Get all users with their study sessions
      const users = await User.find({}).select('_id name streak studySessions');
      
      // Calculate total study time for each user within the timeframe
      const userTimeMap = new Map<string, { 
        userId: string;
        name: string; 
        streak: number; 
        totalStudyTime: number; 
      }>();
      
      users.forEach(user => {
        if (!user.studySessions || user.studySessions.length === 0 || !user._id) return;
        
        // Filter sessions within the timeframe
        const timeframeFilteredSessions = startDate 
          ? user.studySessions.filter(session => new Date(session.startTime) >= startDate!)
          : user.studySessions;
        
        // Calculate total duration from filtered sessions
        const totalStudyTime = timeframeFilteredSessions.reduce((sum, session) => sum + session.duration, 0);
        
        const userId = user._id.toString();
        
        if (totalStudyTime > 0) {
          userTimeMap.set(userId, {
            userId,
            name: user.name,
            streak: user.streak,
            totalStudyTime
          });
        }
      });
      
      // Convert map to array
      const userTimes = Array.from(userTimeMap.values());
      
      // Sort by study time (descending)
      userTimes.sort((a, b) => b.totalStudyTime - a.totalStudyTime);
      
      // Limit to requested number of users
      const limitedUserTimes = userTimes.slice(0, limit);
      
      // Format response
      return limitedUserTimes.map((userData, index) => ({
        rank: index + 1,
        name: userData.name,
        streak: userData.streak,
        totalStudyTime: userData.totalStudyTime,
        totalStudyHours: Math.floor(userData.totalStudyTime / 60)
      }));
    }
  } catch (error: any) {
    console.error('Error getting leaderboard:', error);
    throw error;
  }
};