// backend/src/scripts/seed-data.ts
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import csvParser from 'csv-parser';
import { parse } from 'date-fns';
import { connectDB } from '../config/db';
import Subject, { ISubject } from '../models/Subject';
import TestSeries, { ITestSeries } from '../models/TestSeries';
import Quiz, { IQuizModel } from '../models/Quiz';

dotenv.config();

// Connect to MongoDB
connectDB();

// Map to store subjects for reference
const subjectMap: Record<string, mongoose.Types.ObjectId> = {};

// Function to clean up resources and exit
const exitProcess = (): void => {
  mongoose.connection.close();
  process.exit(0);
};

// Function to map topics to subjects
const createSubjectMapping = (topics: string[]): string[] => {
  const topicToSubjectMap: Record<string, string> = {
    // Discrete Mathematics
    'Propositional logic': 'Discrete Mathematics',
    'First order logic': 'Discrete Mathematics',
    'Set Theory': 'Discrete Mathematics',
    'Functions': 'Discrete Mathematics',
    'Relations': 'Discrete Mathematics',
    'Lattices': 'Discrete Mathematics',
    'Group Theory': 'Discrete Mathematics',
    'Combinatorics': 'Discrete Mathematics',
    'Graph Theory': 'Discrete Mathematics',
    
    // Engineering Mathematics
    'Linear Algebra': 'Engineering Mathematics',
    'Probability': 'Engineering Mathematics',
    'Calculus': 'Engineering Mathematics',
    
    // Digital Logic
    'Boolean Algebra': 'Digital Logic',
    'Minimization': 'Digital Logic',
    'Number System': 'Digital Logic',
    'Combinational Circuits': 'Digital Logic',
    'Sequential Circuits': 'Digital Logic',
    
    // Databases
    'Normalization': 'Database Management Systems',
    'ER Model': 'Database Management Systems',
    'Integrity Constraints': 'Database Management Systems',
    'Queries': 'Database Management Systems',
    'SQL': 'Database Management Systems',
    'TRC': 'Database Management Systems',
    'Relational Algebra': 'Database Management Systems',
    'Indexing': 'Database Management Systems',
    'B Tree': 'Database Management Systems',
    'B+ Tree': 'Database Management Systems',
    'Transaction management': 'Database Management Systems',
    
    // C Programming
    'Number Representation': 'C Programming',
    'Control Statements': 'C Programming',
    'Operators': 'C Programming',
    'Compilation system': 'C Programming',
    'Storage class': 'C Programming',
    'Function': 'C Programming',
    'Recursion': 'C Programming',
    'Pointers': 'C Programming',
    'Char array and strings': 'C Programming',
    'Structures': 'C Programming',
    'Dynamic memory allocation': 'C Programming',
    
    // Theory of Computation
    'Finite Automata': 'Theory of Computation',
    'Regular Expression': 'Theory of Computation',
    'CFG': 'Theory of Computation',
    'PDA': 'Theory of Computation',
    'Closure Properties': 'Theory of Computation',
    'language class detction': 'Theory of Computation',
    'Decidability': 'Theory of Computation',
    'Undecidability': 'Theory of Computation',
    
    // Computer Networks
    'IP addessing': 'Computer Networks',
    'Data Link layer': 'Computer Networks',
    'Netwok Layer': 'Computer Networks',
    'Routing algoithms': 'Computer Networks',
    'Transport layer': 'Computer Networks',
    'Application Layer': 'Computer Networks',
    
    // Compiler Design
    'Lexical': 'Compiler Design',
    'Synatx Analysis': 'Compiler Design',
    'Parsers': 'Compiler Design',
    'Semantic Analysis': 'Compiler Design',
    'SDT': 'Compiler Design',
    'SDD': 'Compiler Design',
    'Parser': 'Compiler Design',
    'Intermediate Codes': 'Compiler Design',
    'DAG': 'Compiler Design',
    'SSA': 'Compiler Design',
    'Code Optimisation': 'Compiler Design',
    
    // Computer Organization
    'Basics': 'Computer Organization',
    'Addressing Modes': 'Computer Organization',
    'Control Unit': 'Computer Organization',
    'Pipelining': 'Computer Organization',
    'Cache Memory': 'Computer Organization',
    'I/O Interfacing': 'Computer Organization',
    'Magnetic Disk': 'Computer Organization',
    
    // Operating Systems
    'Scheduling': 'Operating Systems',
    'Synchronisation': 'Operating Systems',
    'Deadlock': 'Operating Systems',
    'Memory Management': 'Operating Systems',
    'File system': 'Operating Systems',
    'Fork': 'Operating Systems',
    'Systems calls': 'Operating Systems',
    
    // Data Structures
    'Linked List': 'Data Structures',
    'Asymptotic Notations': 'Data Structures',
    'Stack and Queue': 'Data Structures',
    'Trees': 'Data Structures',
    'Hashing': 'Data Structures',
    
    // Algorithms
    'Divide and Conquer': 'Algorithms',
    'Recurrence relation': 'Algorithms',
    'Greedy Algorithms': 'Algorithms',
    'Dynamic Programming': 'Algorithms'
  };
  
  let subjectNames = new Set<string>();
  
  // Try to identify subject from topics
  for (const topic of topics) {
    for (const [keyword, subject] of Object.entries(topicToSubjectMap)) {
      if (topic.includes(keyword)) {
        subjectNames.add(subject);
        break;
      }
    }
  }
  
  return Array.from(subjectNames);
};

// Create basic subjects without mock data
const createSubjects = async (): Promise<void> => {
  console.log('Creating subjects...');
  
  const subjects = [
    {
      name: 'Discrete Mathematics',
      description: 'Includes topics like logic, set theory, graph theory, and combinatorics.',
      totalDuration: 0,
      priority: 9,
      modules: [],
      pyqs: {
        count: 0,
        estimatedDuration: 0
      }
    },
    {
      name: 'Database Management Systems',
      description: 'Covers database design, SQL, transactions, and more.',
      totalDuration: 0,
      priority: 8,
      modules: [],
      pyqs: {
        count: 0,
        estimatedDuration: 0
      }
    },
    {
      name: 'Operating Systems',
      description: 'Covers process management, memory management, file systems, and more.',
      totalDuration: 0,
      priority: 8,
      modules: [],
      pyqs: {
        count: 0,
        estimatedDuration: 0
      }
    },
    {
      name: 'Engineering Mathematics',
      description: 'Includes topics like linear algebra, calculus, and probability.',
      totalDuration: 0,
      priority: 7,
      modules: [],
      pyqs: {
        count: 0,
        estimatedDuration: 0
      }
    },
    {
      name: 'Digital Logic',
      description: 'Covers boolean algebra, combinational and sequential circuits.',
      totalDuration: 0,
      priority: 7,
      modules: [],
      pyqs: {
        count: 0,
        estimatedDuration: 0
      }
    },
    {
      name: 'C Programming',
      description: 'Covers C programming concepts, memory management, and more.',
      totalDuration: 0,
      priority: 6,
      modules: [],
      pyqs: {
        count: 0,
        estimatedDuration: 0
      }
    },
    {
      name: 'Theory of Computation',
      description: 'Includes automata theory, formal languages, and computability.',
      totalDuration: 0,
      priority: 8,
      modules: [],
      pyqs: {
        count: 0,
        estimatedDuration: 0
      }
    },
    {
      name: 'Computer Networks',
      description: 'Covers network protocols, architectures, and applications.',
      totalDuration: 0,
      priority: 7,
      modules: [],
      pyqs: {
        count: 0,
        estimatedDuration: 0
      }
    },
    {
      name: 'Compiler Design',
      description: 'Covers lexical analysis, parsing, and code optimization.',
      totalDuration: 0,
      priority: 6,
      modules: [],
      pyqs: {
        count: 0,
        estimatedDuration: 0
      }
    },
    {
      name: 'Computer Organization',
      description: 'Covers computer architecture, memory systems, and I/O.',
      totalDuration: 0,
      priority: 7,
      modules: [],
      pyqs: {
        count: 0,
        estimatedDuration: 0
      }
    },
    {
      name: 'Data Structures',
      description: 'Covers arrays, linked lists, trees, and more.',
      totalDuration: 0,
      priority: 9,
      modules: [],
      pyqs: {
        count: 0,
        estimatedDuration: 0
      }
    },
    {
      name: 'Algorithms',
      description: 'Covers algorithm design paradigms and analysis.',
      totalDuration: 0,
      priority: 9,
      modules: [],
      pyqs: {
        count: 0,
        estimatedDuration: 0
      }
    }
  ];
  
  try {
    // Clear existing subjects
    await Subject.deleteMany({});
    
    // Insert new subjects
    for (const subject of subjects) {
      const createdSubject = await Subject.create(subject);
      // Fix TypeScript error by casting the _id to mongoose.Types.ObjectId
      subjectMap[createdSubject.name] = createdSubject._id as mongoose.Types.ObjectId;
      console.log(`Created subject: ${createdSubject.name}`);
    }
    
    console.log('Subjects created successfully.');
  } catch (error) {
    console.error('Error creating subjects:', error);
  }
};

// Import test series from CSV
const importTestSeries = async (): Promise<void> => {
  console.log('Importing test series data...');
  
  try {
    // Clear existing test series
    await TestSeries.deleteMany({});
    
    const results: any[] = [];
    const csvPath = path.join(__dirname, '../../data/GATE 2026 CS TEST SERIES  text MConverter.eu.csv.csv');
    
    // Read CSV file
    const parseCSV = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        fs.createReadStream(csvPath)
          .pipe(csvParser())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve())
          .on('error', (error) => reject(error));
      });
    };
    
    await parseCSV();
    
    const testSeries: Partial<ITestSeries>[] = [];
    
    for (const row of results) {
      const topics = row.Topics ? row.Topics.split(',').map((t: string) => t.trim()) : [];
      const subjectNames = createSubjectMapping(topics);
      const relatedSubjects: mongoose.Types.ObjectId[] = [];
      
      // Find subject IDs
      for (const name of subjectNames) {
        if (subjectMap[name]) {
          relatedSubjects.push(subjectMap[name]);
        }
      }
      
      // Parse date
      let date;
      try {
        date = parse(row['Exam Date'], 'MMMM dd, yyyy', new Date());
      } catch (error) {
        // Default to a future date if parsing fails
        date = new Date();
        date.setMonth(date.getMonth() + 1);
      }
      
      testSeries.push({
        name: row['Exam Name'],
        link: row['Test Link'],
        date,
        topics,
        relatedSubjects
      });
    }
    
    // Insert test series
    if (testSeries.length > 0) {
      await TestSeries.insertMany(testSeries as ITestSeries[]);
      console.log(`Imported ${testSeries.length} test series.`);
    } else {
      console.log('No test series to import.');
    }
    
    // Continue with quiz import
    await importQuizzes();
  } catch (error) {
    console.error('Error importing test series:', error);
    await importQuizzes(); // Continue with quiz import even if test series import fails
  }
};

// Import quizzes from CSV
const importQuizzes = async (): Promise<void> => {
  console.log('Importing quizzes data...');
  
  try {
    // Clear existing quizzes
    await Quiz.deleteMany({});
    
    const results: any[] = [];
    const csvPath = path.join(__dirname, '../../data/Quizzes  2025.csv');
    
    // Read CSV file
    const parseCSV = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        fs.createReadStream(csvPath)
          .pipe(csvParser())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve())
          .on('error', (error) => reject(error));
      });
    };
    
    await parseCSV();
    
    const quizzes: Partial<IQuizModel>[] = [];
    
    for (const row of results) {
      const topics = row.Topics ? row.Topics.split(',').map((t: string) => t.trim()) : [];
      const subjectNames = createSubjectMapping(topics);
      const relatedSubjects: mongoose.Types.ObjectId[] = [];
      
      // Find subject IDs
      for (const name of subjectNames) {
        if (subjectMap[name]) {
          relatedSubjects.push(subjectMap[name]);
        }
      }
      
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
      
      // Parse date
      let date;
      try {
        date = parse(row['Exam Date'], 'EEEE, d MMMM yyyy', new Date());
      } catch (error) {
        try {
          // Try alternative format
          date = parse(row['Exam Date'], 'MMMM dd, yyyy', new Date());
        } catch (error) {
          // Default to a future date if parsing fails
          date = new Date();
          date.setDate(date.getDate() + 7);
        }
      }
      
      quizzes.push({
        name: row['Exam Name'],
        link: row['Quiz Links'],
        date,
        subject: subjectName,
        topics,
        remarks: row.Remaks || '',
        relatedSubjects
      });
    }
    
    // Insert quizzes
    if (quizzes.length > 0) {
      await Quiz.insertMany(quizzes as IQuizModel[]);
      console.log(`Imported ${quizzes.length} quizzes.`);
    } else {
      console.log('No quizzes to import.');
    }
    
    // Exit after all imports are done
    exitProcess();
  } catch (error) {
    console.error('Error importing quizzes:', error);
    exitProcess();
  }
};

// Run the seed process
const seedAll = async (): Promise<void> => {
  try {
    await createSubjects();
    await importTestSeries();
    // importQuizzes will be called by importTestSeries on completion
  } catch (error) {
    console.error('Error in seed process:', error);
    exitProcess();
  }
};

seedAll();