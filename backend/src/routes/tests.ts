// backend/src/routes/tests.ts
import express, { Request, Response } from 'express';
import auth from '../middleware/auth';
import TestSeries from '../models/TestSeries';
import mongoose from 'mongoose';

// Create TestProgress model for tracking user progress on tests
const TestProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestSeries',
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  maxScore: {
    type: Number,
    required: true
  },
  timeSpent: {
    type: Number,
    required: true
  },
  completedDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  }
}, { timestamps: true });

// Create a compound index to ensure a user doesn't have duplicate test attempts
TestProgressSchema.index({ userId: 1, testId: 1 }, { unique: true });

const TestProgress = mongoose.model('TestProgress', TestProgressSchema);

const router = express.Router();

// @route   GET api/tests
// @desc    Get all tests
// @access  Private
router.get('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const tests = await TestSeries.find()
      .populate('relatedSubjects', 'name')
      .sort({ date: 1, name: 1 });
    
    // If user is authenticated, attach progress information
    if (req.user && req.user.id) {
      const testProgresses = await TestProgress.find({
        userId: req.user.id
      });
      
      // Create a map of test IDs to progress
      const progressMap = new Map();
      testProgresses.forEach(progress => {
        progressMap.set(progress.testId.toString(), {
          isCompleted: true,
          score: progress.score,
          maxScore: progress.maxScore,
          timeSpent: progress.timeSpent,
          completedDate: progress.completedDate
        });
      });
      
      // Attach progress to tests
      const testsWithProgress = tests.map(test => {
        const testObj: any = test.toObject();
        const progress = progressMap.get(testObj._id.toString());
        if (progress) {
          return { ...testObj, ...progress };
        }
        return testObj;
      });
      
      res.json(testsWithProgress);
    } else {
      res.json(tests);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/tests/completed
// @desc    Get completed tests
// @access  Private
router.get('/completed', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ msg: 'User not authenticated' });
      return;
    }
    
    // Find all completed tests for the user
    const completedTests = await TestProgress.find({
      userId: req.user.id
    }).populate({
      path: 'testId',
      populate: {
        path: 'relatedSubjects',
        select: 'name'
      }
    });
    
    // Format the response
    const tests = completedTests.map(progress => {
      const test = progress.testId as any;
      return {
        ...test.toObject(),
        isCompleted: true,
        score: progress.score,
        maxScore: progress.maxScore,
        timeSpent: progress.timeSpent,
        completedDate: progress.completedDate,
        notes: progress.notes
      };
    });
    
    res.json(tests);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});


// @route   POST api/tests/:id/complete
// @desc    Mark a test as completed
// @access  Private
router.post('/:id/complete', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { score, maxScore, timeSpent, notes } = req.body;
    
    if (!req.user || !req.user.id) {
      res.status(401).json({ msg: 'User not authenticated' });
      return;
    }
    
    // Check if test exists
    const test = await TestSeries.findById(req.params.id);
    if (!test) {
      res.status(404).json({ msg: 'Test not found' });
      return;
    }
    
    // Check if test is already completed
    let progress = await TestProgress.findOne({
      userId: req.user.id,
      testId: req.params.id
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
      progress = new TestProgress({
        userId: req.user.id,
        testId: req.params.id,
        score,
        maxScore,
        timeSpent,
        completedDate: new Date(),
        notes
      });
      
      await progress.save();
    }
    
    // Return the updated test with progress
    const testObj = test.toObject();
    res.json({
      ...testObj,
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

// @route   GET api/tests/subject/:subjectId
// @desc    Get tests by subject
// @access  Private
router.get('/subject/:subjectId', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const tests = await TestSeries.find({ relatedSubjects: req.params.subjectId })
      .populate('relatedSubjects', 'name')
      .sort({ date: 1, name: 1 });
    
    // If user is authenticated, attach progress information
    if (req.user && req.user.id) {
      const testIds = tests.map(test => test._id as mongoose.Types.ObjectId);
      const testProgresses = await TestProgress.find({
        userId: req.user.id,
        testId: { $in: testIds }
      });
      
      // Create a map of test IDs to progress
      const progressMap = new Map();
      testProgresses.forEach(progress => {
        progressMap.set(progress.testId.toString(), {
          isCompleted: true,
          score: progress.score,
          maxScore: progress.maxScore,
          timeSpent: progress.timeSpent,
          completedDate: progress.completedDate
        });
      });
      
      // Attach progress to tests
      const testsWithProgress = tests.map(test => {
        const testObj: any = test.toObject();
        const progress = progressMap.get(testObj._id.toString());
        if (progress) {
          return { ...testObj, ...progress };
        }
        return testObj;
      });
      
      res.json(testsWithProgress);
    } else {
      res.json(tests);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/tests/upcoming
// @desc    Get upcoming tests
// @access  Private
router.get('/upcoming', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const currentDate = new Date();
    const tests = await TestSeries.find({ date: { $gte: currentDate } })
      .populate('relatedSubjects', 'name')
      .sort({ date: 1, name: 1 });
    res.json(tests);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/tests/unattempted
// @desc    Get tests not yet attempted by the user
// @access  Private
router.get('/unattempted', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ msg: 'User not authenticated' });
      return;
    }
    
    // Find all completed test IDs for the user
    const completedTests = await TestProgress.find({ userId: req.user.id });
    const completedTestIds = completedTests.map(test => test.testId);
    
    // Find all tests that are not in the completed list
    // Handle empty completedTestIds case differently to avoid MongoDB error
    let query;
    if (completedTestIds.length > 0) {
      query = TestSeries.find({ _id: { $nin: completedTestIds } });
    } else {
      query = TestSeries.find();
    }
    
    const unattemptedTests = await query
      .populate('relatedSubjects', 'name')
      .sort({ date: 1, name: 1 });
    
    res.json(unattemptedTests);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/tests/practice
// @desc    Get practice tests
// @access  Private
router.get('/practice', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const tests = await TestSeries.find({ testType: 'practice' })
      .populate('relatedSubjects', 'name')
      .sort({ date: 1, name: 1 });
    
    // If user is authenticated, attach progress information
    if (req.user && req.user.id) {
      const testIds = tests.map(test => test._id);
      const testProgresses = await TestProgress.find({
        userId: req.user.id,
        testId: { $in: testIds }
      });
      
      // Create a map of test IDs to progress
      const progressMap = new Map();
      testProgresses.forEach(progress => {
        progressMap.set(progress.testId.toString(), {
          isCompleted: true,
          score: progress.score,
          maxScore: progress.maxScore,
          timeSpent: progress.timeSpent,
          completedDate: progress.completedDate
        });
      });
      
      // Attach progress to tests
      const testsWithProgress = tests.map(test => {
        const testObj: any = test.toObject();
        const progress = progressMap.get(testObj._id.toString());
        if (progress) {
          return { ...testObj, ...progress };
        }
        return testObj;
      });
      
      res.json(testsWithProgress);
    } else {
      res.json(tests);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/tests/:id
// @desc    Get test by ID
// @access  Private
router.get('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const test = await TestSeries.findById(req.params.id).populate('relatedSubjects', 'name');
    if (!test) {
      res.status(404).json({ msg: 'Test not found' });
      return;
    }
    
    // If user is authenticated, get progress information
    if (req.user && req.user.id) {
      const progress = await TestProgress.findOne({
        userId: req.user.id,
        testId: req.params.id
      });
      
      if (progress) {
        const testObj = test.toObject();
        res.json({
          ...testObj,
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
    
    res.json(test);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Export router
export default router;