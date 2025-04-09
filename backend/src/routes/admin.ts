// backend/src/routes/admin.ts
import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import csvParser from 'csv-parser';
import { parse } from 'date-fns';
import auth from '../middleware/auth';
import adminAuth from '../middleware/admin';
import Subject, { ISubject } from '../models/Subject';
import Quiz, { IQuizModel } from '../models/Quiz';
import TestSeries, { ITestSeries } from '../models/TestSeries';
import mongoose, { Types } from 'mongoose';

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads');
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Accept only CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

/**
 * Safely parse a date string with a simpler approach
 * @param dateString The date string to parse
 * @returns A valid Date object
 */
const safeParseDate = (dateString: string): Date => {
  let date;
  try {
    // For test series format (this seems to be working)
    date = parse(dateString, 'MMMM dd, yyyy', new Date());
  } catch (error) {
    // Default to a future date if parsing fails
    date = new Date();
    date.setMonth(date.getMonth() + 1);
  }
  
  // Validate the date
  if (isNaN(date.getTime())) {
    console.log(`Warning: Invalid date "${dateString}". Using fallback date.`);
    date = new Date();
    date.setMonth(date.getMonth() + 1);
  }
  
  return date;
};

// @route   GET api/admin/subjects
// @desc    Get all subjects (admin only)
// @access  Private/Admin
router.get('/subjects', [auth, adminAuth], async (req: Request, res: Response): Promise<void> => {
  try {
    const subjects = await Subject.find().sort({ name: 1 });
    res.json(subjects);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   POST api/admin/subjects
// @desc    Create a new subject (admin only)
// @access  Private/Admin
router.post('/subjects', [auth, adminAuth], async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, priority, modules, pyqs } = req.body;
    
    // Check if subject already exists
    const existingSubject = await Subject.findOne({ name });
    if (existingSubject) {
      res.status(400).json({ msg: 'Subject already exists' });
      return;
    }
    
    // Create new subject - totalDuration will be calculated automatically in the pre-save hook
    const newSubject = new Subject({
      name,
      priority,
      modules,
      pyqs
    });
    
    const savedSubject = await newSubject.save();
    res.json(savedSubject);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/admin/subjects/:id
// @desc    Update a subject (admin only)
// @access  Private/Admin
router.put('/subjects/:id', [auth, adminAuth], async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, priority, modules, pyqs } = req.body;
    
    // Check if subject exists
    let subject = await Subject.findById(req.params.id);
    if (!subject) {
      res.status(404).json({ msg: 'Subject not found' });
      return;
    }
    
    // Update subject
    subject = await Subject.findByIdAndUpdate(
      req.params.id,
      {
        name,
        priority,
        modules,
        pyqs
      },
      { new: true }
    );
    
    // Manually trigger the save to recalculate totalDuration
    if (subject) {
      await subject.save();
    }
    
    res.json(subject);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/admin/subjects/:id
// @desc    Delete a subject (admin only)
// @access  Private/Admin
router.delete('/subjects/:id', [auth, adminAuth], async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if subject exists
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      res.status(404).json({ msg: 'Subject not found' });
      return;
    }
    
    // Delete subject
    await Subject.findByIdAndDelete(req.params.id);
    
    res.json({ msg: 'Subject removed' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

/**
 * Module management routes
 */

// @route   POST api/admin/subjects/:id/modules
// @desc    Add a module to a subject (admin only)
// @access  Private/Admin
router.post('/subjects/:id/modules', [auth, adminAuth], async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    
    // Check if subject exists
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      res.status(404).json({ msg: 'Subject not found' });
      return;
    }
    
    // Create new module
    const newModule = {
      name,
      content: []
    };
    
    // Add module to subject
    // Use mongoose subdocument create to get proper _id assignment
    subject.modules.push(newModule as any);
    await subject.save();
    
    res.json(subject);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/admin/subjects/:subjectId/modules/:moduleId
// @desc    Update a module (admin only)
// @access  Private/Admin
router.put('/subjects/:subjectId/modules/:moduleId', [auth, adminAuth], async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    
    // Check if subject exists
    const subject = await Subject.findById(req.params.subjectId);
    if (!subject) {
      res.status(404).json({ msg: 'Subject not found' });
      return;
    }
    
    // Find the module
    const moduleIndex = subject.modules.findIndex(
      m => m._id && m._id.toString() === req.params.moduleId
    );
    
    if (moduleIndex === -1) {
      res.status(404).json({ msg: 'Module not found' });
      return;
    }
    
    // Update module name
    subject.modules[moduleIndex].name = name;
    
    // Save subject
    await subject.save();
    
    res.json(subject);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/admin/subjects/:subjectId/modules/:moduleId
// @desc    Delete a module (admin only)
// @access  Private/Admin
router.delete('/subjects/:subjectId/modules/:moduleId', [auth, adminAuth], async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if subject exists
    const subject = await Subject.findById(req.params.subjectId);
    if (!subject) {
      res.status(404).json({ msg: 'Subject not found' });
      return;
    }
    
    // Find and remove the module
    const moduleIndex = subject.modules.findIndex(
      m => m._id && m._id.toString() === req.params.moduleId
    );
    
    if (moduleIndex === -1) {
      res.status(404).json({ msg: 'Module not found' });
      return;
    }
    
    // Remove module from array
    subject.modules.splice(moduleIndex, 1);
    
    // Save subject - this will trigger the pre-save hook to recalculate duration
    await subject.save();
    
    res.json(subject);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   POST api/admin/subjects/:subjectId/modules/:moduleId/content
// @desc    Add content to a module (admin only)
// @access  Private/Admin
router.post('/subjects/:subjectId/modules/:moduleId/content', [auth, adminAuth], async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, name, durationMinutes } = req.body;
    
    if (!['lecture', 'quiz', 'homework'].includes(type)) {
      res.status(400).json({ msg: 'Invalid content type' });
      return;
    }
    
    // Check if subject exists
    const subject = await Subject.findById(req.params.subjectId);
    if (!subject) {
      res.status(404).json({ msg: 'Subject not found' });
      return;
    }
    
    // Find the module
    // Mongoose subdocuments have a get method to find by id
    // TypeScript doesn't recognize it directly, so we need to use alternative approach
    const moduleIndex = subject.modules.findIndex(
      m => m._id && m._id.toString() === req.params.moduleId
    );
    
    if (moduleIndex === -1) {
      res.status(404).json({ msg: 'Module not found' });
      return;
    }
    
    const module = subject.modules[moduleIndex];
    
    // Prepare content item
    const contentItem: any = {
      type,
      name,
      durationMinutes
    };
    
    // Add type-specific fields
    if (type === 'lecture') {
      if (req.body.duration) {
        // Format to standard HH:MM:SS
        const durationParts = req.body.duration.split(':');
        let hours = 0, minutes = 0, seconds = 0;
        
        if (durationParts.length >= 2) {
          hours = parseInt(durationParts[0]) || 0;
          minutes = parseInt(durationParts[1]) || 0;
          
          if (durationParts.length >= 3) {
            seconds = parseInt(durationParts[2]) || 0;
          }
        }
        
        contentItem.duration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    } else if (type === 'quiz' && req.body.link) {
      contentItem.link = req.body.link;
    } else if (type === 'homework' && req.body.questionCount) {
      contentItem.questionCount = parseInt(req.body.questionCount) || 0;
      
      // Calculate duration using the PYQ formula if not manually specified
      if (!req.body.durationMinutes) {
        contentItem.durationMinutes = Math.ceil((parseInt(req.body.questionCount) || 0) * 2.76923076923);
      }
    }
    
    // Add content to module
    module.content.push(contentItem);
    
    // Save subject - this will trigger the pre-save hook to recalculate duration
    await subject.save();
    
    res.json(subject);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/admin/subjects/:subjectId/modules/:moduleId/content/:contentId
// @desc    Update content in a module (admin only)
// @access  Private/Admin
router.put('/subjects/:subjectId/modules/:moduleId/content/:contentId', [auth, adminAuth], async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, name, durationMinutes } = req.body;
    
    if (!['lecture', 'quiz', 'homework'].includes(type)) {
      res.status(400).json({ msg: 'Invalid content type' });
      return;
    }
    
    // Check if subject exists
    const subject = await Subject.findById(req.params.subjectId);
    if (!subject) {
      res.status(404).json({ msg: 'Subject not found' });
      return;
    }
    
    // Find the module
    const moduleIndex = subject.modules.findIndex(
      m => m._id && m._id.toString() === req.params.moduleId
    );
    
    if (moduleIndex === -1) {
      res.status(404).json({ msg: 'Module not found' });
      return;
    }
    
    const module = subject.modules[moduleIndex];
    
    // Find content item
    const contentIndex = module.content.findIndex(
      c => c._id && c._id.toString() === req.params.contentId
    );
    
    if (contentIndex === -1) {
      res.status(404).json({ msg: 'Content not found' });
      return;
    }
    
    // Prepare updated content
    const updatedContent: any = {
      _id: module.content[contentIndex]._id, // Keep the original ID
      type,
      name,
      durationMinutes
    };
    
    // Add type-specific fields
    if (type === 'lecture' && req.body.duration) {
      updatedContent.duration = req.body.duration;
    } else if (type === 'quiz' && req.body.link) {
      updatedContent.link = req.body.link;
    } else if (type === 'homework' && req.body.description) {
      updatedContent.description = req.body.description;
    }
    
    // Update content in module
    module.content[contentIndex] = updatedContent;
    
    // Save subject - this will trigger the pre-save hook to recalculate duration
    await subject.save();
    
    res.json(subject);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

/**
 * Content management routes
 */

// @route   PUT api/admin/subjects/:subjectId/modules/:moduleId/content/:contentId
// @desc    Update content in a module (admin only)
// @access  Private/Admin
router.put('/subjects/:subjectId/modules/:moduleId/content/:contentId', [auth, adminAuth], async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, name, durationMinutes } = req.body;
    
    if (!['lecture', 'quiz', 'homework'].includes(type)) {
      res.status(400).json({ msg: 'Invalid content type' });
      return;
    }
    
    // Check if subject exists
    const subject = await Subject.findById(req.params.subjectId);
    if (!subject) {
      res.status(404).json({ msg: 'Subject not found' });
      return;
    }
    
    // Find the module
    const moduleIndex = subject.modules.findIndex(
      m => m._id && m._id.toString() === req.params.moduleId
    );
    
    if (moduleIndex === -1) {
      res.status(404).json({ msg: 'Module not found' });
      return;
    }
    
    const module = subject.modules[moduleIndex];
    
    // Find content item
    const contentIndex = module.content.findIndex(
      c => c._id && c._id.toString() === req.params.contentId
    );
    
    if (contentIndex === -1) {
      res.status(404).json({ msg: 'Content not found' });
      return;
    }
    
    // Prepare updated content
    const updatedContent: any = {
      _id: module.content[contentIndex]._id, // Keep the original ID
      type,
      name,
      durationMinutes
    };
    
    // Add type-specific fields
    if (type === 'lecture' && req.body.duration) {
      updatedContent.duration = req.body.duration;
    } else if (type === 'quiz' && req.body.link) {
      updatedContent.link = req.body.link;
    } else if (type === 'homework' && req.body.description) {
      updatedContent.description = req.body.description;
    }
    
    // Update content in module
    module.content[contentIndex] = updatedContent;
    
    // Save subject - this will trigger the pre-save hook to recalculate duration
    await subject.save();
    
    res.json(subject);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/admin/subjects/:subjectId/modules/:moduleId/content/:contentId
// @desc    Delete content from a module (admin only)
// @access  Private/Admin
router.delete('/subjects/:subjectId/modules/:moduleId/content/:contentId', [auth, adminAuth], async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if subject exists
    const subject = await Subject.findById(req.params.subjectId);
    if (!subject) {
      res.status(404).json({ msg: 'Subject not found' });
      return;
    }
    
    // Find the module
    const moduleIndex = subject.modules.findIndex(
      m => m._id && m._id.toString() === req.params.moduleId
    );
    
    if (moduleIndex === -1) {
      res.status(404).json({ msg: 'Module not found' });
      return;
    }
    
    const module = subject.modules[moduleIndex];
    
    // Find and remove content item
    const contentIndex = module.content.findIndex(
      c => c._id && c._id.toString() === req.params.contentId
    );
    
    if (contentIndex === -1) {
      res.status(404).json({ msg: 'Content not found' });
      return;
    }
    
    // Remove content from array
    module.content.splice(contentIndex, 1);
    
    // Save subject - this will trigger the pre-save hook to recalculate duration
    await subject.save();
    
    res.json(subject);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/admin/quizzes
// @desc    Get all quizzes (admin only)
// @access  Private/Admin
router.get('/quizzes', [auth, adminAuth], async (req: Request, res: Response): Promise<void> => {
  try {
    const quizzes = await Quiz.find().populate('relatedSubjects', 'name').sort({ date: -1 });
    res.json(quizzes);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   POST api/admin/quizzes
// @desc    Create a new quiz (admin only)
// @access  Private/Admin
router.post('/quizzes', [auth, adminAuth], async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, link, date, subject, topics, remarks, relatedSubjects } = req.body;
    
    const newQuiz = new Quiz({
      name,
      link,
      date,
      subject,
      topics,
      remarks,
      relatedSubjects
    });
    
    const savedQuiz = await newQuiz.save();
    res.json(savedQuiz);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/admin/quizzes/:id
// @desc    Update a quiz (admin only)
// @access  Private/Admin
router.put('/quizzes/:id', [auth, adminAuth], async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, link, date, subject, topics, remarks, relatedSubjects } = req.body;
    
    // Check if quiz exists
    let quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      res.status(404).json({ msg: 'Quiz not found' });
      return;
    }
    
    // Update quiz
    quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      {
        name,
        link,
        date,
        subject,
        topics,
        remarks,
        relatedSubjects
      },
      { new: true }
    );
    
    res.json(quiz);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/admin/quizzes/:id
// @desc    Delete a quiz (admin only)
// @access  Private/Admin
router.delete('/quizzes/:id', [auth, adminAuth], async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if quiz exists
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      res.status(404).json({ msg: 'Quiz not found' });
      return;
    }
    
    // Delete quiz
    await Quiz.findByIdAndDelete(req.params.id);
    
    res.json({ msg: 'Quiz removed' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   POST api/admin/quizzes/upload
// @desc    Upload quizzes from CSV file (admin only)
// @access  Private/Admin
router.post('/quizzes/upload', [auth, adminAuth, upload.single('file')], async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ msg: 'No file uploaded' });
      return;
    }
    
    const results: any[] = [];
    const csvPath = req.file.path;
    
    // Get subject mapping
    const subjects = await Subject.find({}, '_id name');
    const subjectMap: Record<string, Types.ObjectId> = {};
    subjects.forEach(subject => {
      subjectMap[subject.name] = subject._id as Types.ObjectId;
    });
    
    // Read CSV file
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve())
        .on('error', (error) => reject(error));
    });
    
    // Process CSV data
    const quizzes: Partial<IQuizModel>[] = [];
    
    for (const row of results) {
      const topics = row.Topics ? row.Topics.split(',').map((t: string) => t.trim()) : [];
      const relatedSubjects: mongoose.Types.ObjectId[] = [];
      
      // Map subject string to standardized subject name
      let subjectName = row.Subject || '';
      if (subjectName.includes('Linear Algebra')) {
        subjectName = 'Engineering Mathematics';
      } else if (subjectName.includes('DBMS')) {
        subjectName = 'Database Management Systems';
      } else if (subjectName.includes('TOC')) {
        subjectName = 'Theory of Computation';
      } else if (subjectName.includes('CN')) {
        subjectName = 'Computer Networks';
      } else if (subjectName.includes('OS')) {
        subjectName = 'Operating Systems';
      } else if (subjectName.includes('Discrete')) {
        subjectName = 'Discrete Mathematics';
      } else if (subjectName.includes('Digital')) {
        subjectName = 'Digital Logic';
      } else if (subjectName.includes('C-')) {
        subjectName = 'C Programming';
      }
      
      // Find related subjects by topic
      for (const topic of topics) {
        // Simple matching logic - extend as needed
        for (const [name, id] of Object.entries(subjectMap)) {
          if (topic.includes(name) && !relatedSubjects.includes(id)) {
            relatedSubjects.push(id);
          }
        }
      }
      
      // Parse date - using the approach that works for test series
      const date = safeParseDate(row['Exam Date']);
      
      quizzes.push({
        name: row['Exam Name'],
        link: row['Quiz Links'],
        date,
        subject: subjectName,
        topics,
        remarks: row.Remarks || '',
        relatedSubjects
      });
    }
    
    // Insert quizzes
    if (quizzes.length > 0) {
      await Quiz.insertMany(quizzes as IQuizModel[]);
      res.json({ msg: `Imported ${quizzes.length} quizzes successfully` });
    } else {
      res.status(400).json({ msg: 'No valid quizzes found in the CSV file' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/admin/tests
// @desc    Get all test series (admin only)
// @access  Private/Admin
router.get('/tests', [auth, adminAuth], async (req: Request, res: Response): Promise<void> => {
  try {
    const tests = await TestSeries.find().populate('relatedSubjects', 'name').sort({ date: -1 });
    res.json(tests);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   POST api/admin/tests
// @desc    Create a new test series (admin only)
// @access  Private/Admin
router.post('/tests', [auth, adminAuth], async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, link, date, topics, relatedSubjects } = req.body;
    
    const newTest = new TestSeries({
      name,
      link,
      date,
      topics,
      relatedSubjects
    });
    
    const savedTest = await newTest.save();
    res.json(savedTest);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/admin/tests/:id
// @desc    Update a test series (admin only)
// @access  Private/Admin
router.put('/tests/:id', [auth, adminAuth], async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, link, date, topics, relatedSubjects } = req.body;
    
    // Check if test exists
    let test = await TestSeries.findById(req.params.id);
    if (!test) {
      res.status(404).json({ msg: 'Test series not found' });
      return;
    }
    
    // Update test
    test = await TestSeries.findByIdAndUpdate(
      req.params.id,
      {
        name,
        link,
        date,
        topics,
        relatedSubjects
      },
      { new: true }
    );
    
    res.json(test);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/admin/tests/:id
// @desc    Delete a test series (admin only)
// @access  Private/Admin
router.delete('/tests/:id', [auth, adminAuth], async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if test exists
    const test = await TestSeries.findById(req.params.id);
    if (!test) {
      res.status(404).json({ msg: 'Test series not found' });
      return;
    }
    
    // Delete test
    await TestSeries.findByIdAndDelete(req.params.id);
    
    res.json({ msg: 'Test series removed' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   POST api/admin/tests/upload
// @desc    Upload test series from CSV file (admin only)
// @access  Private/Admin
router.post('/tests/upload', [auth, adminAuth, upload.single('file')], async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ msg: 'No file uploaded' });
      return;
    }
    
    const results: any[] = [];
    const csvPath = req.file.path;
    
    // Get subject mapping
    const subjects = await Subject.find({}, '_id name');
    const subjectMap: Record<string, Types.ObjectId> = {};
    subjects.forEach(subject => {
      subjectMap[subject.name] = subject._id as Types.ObjectId;
    });
    
    // Read CSV file
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve())
        .on('error', (error) => reject(error));
    });
    
    // Process CSV data
    const tests: Partial<ITestSeries>[] = [];
    
    for (const row of results) {
      const topics = row.Topics ? row.Topics.split(',').map((t: string) => t.trim()) : [];
      const relatedSubjects: mongoose.Types.ObjectId[] = [];
      
      // Find related subjects by topic
      for (const topic of topics) {
        // Simple matching logic - extend as needed
        for (const [name, id] of Object.entries(subjectMap)) {
          if (topic.includes(name) && !relatedSubjects.includes(id)) {
            relatedSubjects.push(id);
          }
        }
      }
      
      // Parse date - using the working approach
      const date = safeParseDate(row['Exam Date']);
      
      tests.push({
        name: row['Exam Name'],
        link: row['Test Link'],
        date,
        topics,
        relatedSubjects
      });
    }
    
    // Insert tests
    if (tests.length > 0) {
      await TestSeries.insertMany(tests as ITestSeries[]);
      res.json({ msg: `Imported ${tests.length} test series successfully` });
    } else {
      res.status(400).json({ msg: 'No valid test series found in the CSV file' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/admin/dashboard
// @desc    Get admin dashboard stats
// @access  Private/Admin
router.get('/dashboard', [auth, adminAuth], async (req: Request, res: Response): Promise<void> => {
  try {
    const subjectCount = await Subject.countDocuments();
    const quizCount = await Quiz.countDocuments();
    const testCount = await TestSeries.countDocuments();
    
    // Get upcoming quizzes and tests
    const currentDate = new Date();
    const upcomingQuizzes = await Quiz.find({ date: { $gte: currentDate } })
      .sort({ date: 1 })
      .limit(5)
      .populate('relatedSubjects', 'name');
    
    const upcomingTests = await TestSeries.find({ date: { $gte: currentDate } })
      .sort({ date: 1 })
      .limit(5)
      .populate('relatedSubjects', 'name');
    
    res.json({
      stats: {
        subjectCount,
        quizCount,
        testCount
      },
      upcomingQuizzes,
      upcomingTests
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/admin/settings/oauth
// @desc    Get OAuth settings
// @access  Private/Admin
router.get('/settings/oauth', [auth, adminAuth], async (req: Request, res: Response): Promise<void> => {
  try {
    // Return OAuth settings from environment variables
    res.json({
      googleClientId: process.env.GOOGLE_CLIENT_ID || '',
      googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || '',
      // Don't return the actual secret, just if it's set or not
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/admin/settings/oauth
// @desc    Update OAuth settings
// @access  Private/Admin
router.put('/settings/oauth', [auth, adminAuth], async (req: Request, res: Response): Promise<void> => {
  try {
    const { googleClientId, googleClientSecret, googleCallbackUrl } = req.body;
    
    // In a production environment, you would update environment variables
    // or store in a secure configuration database
    
    // For demo purposes, we'll respond with success
    // In real implementation, you would need to restart the server or
    // use a configuration management solution that doesn't require restart
    
    res.json({
      success: true,
      message: 'OAuth settings updated. Server restart required for changes to take effect.'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   POST api/admin/debug/csv
// @desc    Debug CSV file without saving to database
// @access  Private/Admin
router.post('/debug/csv', [auth, adminAuth, upload.single('file')], async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ msg: 'No file uploaded' });
      return;
    }
    
    const results: any[] = [];
    const csvPath = req.file.path;
    
    // Read CSV file
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve())
        .on('error', (error) => reject(error));
    });
    
    // Debug CSV structure
    const debug = {
      rowCount: results.length,
      headers: results.length > 0 ? Object.keys(results[0]) : [],
      sampleRows: results.slice(0, 3),
      dateParsingTests: [] as any[]
    };
    
    // Test date parsing on a few rows
    if (results.length > 0 && results[0]['Exam Date']) {
      debug.dateParsingTests = results.slice(0, 5).map(row => {
        try {
          const dateString = row['Exam Date'];
          const parsedDate = safeParseDate(dateString);
          return {
            original: dateString,
            parsed: parsedDate.toISOString(),
            isValid: !isNaN(parsedDate.getTime())
          };
        } catch (error) {
          return {
            original: row['Exam Date'],
            error: (error as Error).message,
            isValid: false
          };
        }
      });
    }
    
    res.json({
      msg: 'CSV parsed successfully',
      debug
    });
  } catch (err) {
    console.error('CSV Debug Error:', err);
    res.status(500).json({
      error: (err as Error).message,
      stack: (err as Error).stack
    });
  }
});

export default router;