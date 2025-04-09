// backend/src/routes/quizzes.ts
import express, { Request, Response } from 'express';
import auth from '../middleware/auth';
import Quiz from '../models/Quiz';
import QuizProgress from '../models/QuizProgress';
import mongoose from 'mongoose';

const router = express.Router();

// @route   GET api/quizzes
// @desc    Get all quizzes
// @access  Private
router.get('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const quizzes = await Quiz.find()
      .populate('relatedSubjects', 'name')
      .sort({ date: 1, name: 1 });
    
    // If user is authenticated, attach progress information
    if (req.user && req.user.id) {
      const quizProgresses = await QuizProgress.find({
        userId: req.user.id
      });
      
      // Create a map of quiz IDs to progress
      const progressMap = new Map();
      quizProgresses.forEach(progress => {
        progressMap.set(progress.quizId.toString(), {
          isCompleted: true,
          score: progress.score,
          maxScore: progress.maxScore,
          timeSpent: progress.timeSpent,
          completedDate: progress.completedDate
        });
      });
      
      // Attach progress to quizzes
      const quizzesWithProgress = quizzes.map(quiz => {
        const quizObj: any = quiz.toObject();
        const progress = progressMap.get(quizObj._id.toString());
        if (progress) {
          return { ...quizObj, ...progress };
        }
        return quizObj;
      });
      
      res.json(quizzesWithProgress);
    } else {
      res.json(quizzes);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/quizzes/completed
// @desc    Get completed quizzes
// @access  Private
router.get('/completed', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ msg: 'User not authenticated' });
      return;
    }
    
    // Find all completed quizzes for the user
    const completedQuizzes = await QuizProgress.find({
      userId: req.user.id
    }).populate({
      path: 'quizId',
      populate: {
        path: 'relatedSubjects',
        select: 'name'
      }
    });
    
    // Format the response
    const quizzes = completedQuizzes.map(progress => {
      const quiz = progress.quizId as any;
      return {
        ...quiz.toObject(),
        isCompleted: true,
        score: progress.score,
        maxScore: progress.maxScore,
        timeSpent: progress.timeSpent,
        completedDate: progress.completedDate,
        notes: progress.notes
      };
    });
    
    res.json(quizzes);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/quizzes/:id
// @desc    Get quiz by ID
// @access  Private
router.get('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('relatedSubjects', 'name');
    if (!quiz) {
      res.status(404).json({ msg: 'Quiz not found' });
      return;
    }
    
    // If user is authenticated, get progress information
    if (req.user && req.user.id) {
      const progress = await QuizProgress.findOne({
        userId: req.user.id,
        quizId: req.params.id
      });
      
      if (progress) {
        const quizObj = quiz.toObject();
        res.json({
          ...quizObj,
          isCompleted: true,
          score: progress.score,
          maxScore: progress.maxScore,
          timeSpent: progress.timeSpent,
          completedDate: progress.completedDate,
          notes: progress.notes
        });
        return;
      }
    }
    
    res.json(quiz);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   POST api/quizzes/:id/complete
// @desc    Mark a quiz as completed
// @access  Private
router.post('/:id/complete', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { score, maxScore, timeSpent, notes } = req.body;
    
    if (!req.user || !req.user.id) {
      res.status(401).json({ msg: 'User not authenticated' });
      return;
    }
    
    // Check if quiz exists
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      res.status(404).json({ msg: 'Quiz not found' });
      return;
    }
    
    // Check if quiz is already completed
    let progress = await QuizProgress.findOne({
      userId: req.user.id,
      quizId: req.params.id
    });
    
    if (progress) {
      // Update existing progress
      progress.score = score;
      progress.maxScore = maxScore;
      progress.timeSpent = timeSpent;
      progress.completedDate = new Date();
      if (notes) progress.notes = notes;
      
      await progress.save();
    } else {
      // Create new progress
      progress = new QuizProgress({
        userId: req.user.id,
        quizId: req.params.id,
        score,
        maxScore,
        timeSpent,
        completedDate: new Date(),
        notes
      });
      
      await progress.save();
    }
    
    // Return the updated quiz with progress
    const quizObj = quiz.toObject();
    res.json({
      ...quizObj,
      isCompleted: true,
      score,
      maxScore,
      timeSpent,
      completedDate: progress.completedDate,
      notes: progress.notes
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/quizzes/subject/:subjectId
// @desc    Get quizzes by subject
// @access  Private
router.get('/subject/:subjectId', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const quizzes = await Quiz.find({ relatedSubjects: req.params.subjectId })
      .populate('relatedSubjects', 'name')
      .sort({ date: 1, name: 1 });
    
    // If user is authenticated, attach progress information
    if (req.user && req.user.id) {
      const quizIds = quizzes.map(quiz => quiz._id as mongoose.Types.ObjectId);
      const quizProgresses = await QuizProgress.find({
        userId: req.user.id,
        quizId: { $in: quizIds }
      });
      
      // Create a map of quiz IDs to progress
      const progressMap = new Map();
      quizProgresses.forEach(progress => {
        progressMap.set(progress.quizId.toString(), {
          isCompleted: true,
          score: progress.score,
          maxScore: progress.maxScore,
          timeSpent: progress.timeSpent,
          completedDate: progress.completedDate
        });
      });
      
      // Attach progress to quizzes
      const quizzesWithProgress = quizzes.map(quiz => {
        const quizObj: any = quiz.toObject();
        const progress = progressMap.get(quizObj._id.toString());
        if (progress) {
          return { ...quizObj, ...progress };
        }
        return quizObj;
      });
      
      res.json(quizzesWithProgress);
    } else {
      res.json(quizzes);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/quizzes/upcoming
// @desc    Get upcoming quizzes
// @access  Private
router.get('/upcoming', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const currentDate = new Date();
    const quizzes = await Quiz.find({ date: { $gte: currentDate } })
      .populate('relatedSubjects', 'name')
      .sort({ date: 1, name: 1 });
    res.json(quizzes);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Export router
export default router;