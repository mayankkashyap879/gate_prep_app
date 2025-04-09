// backend/src/server.ts
/// <reference path="./types/global.d.ts" />

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import passport from 'passport';
import path from 'path';

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

// Import routes
import authRoutes from './routes/auth';
import subjectsRoutes from './routes/subjects';
import progressRoutes from './routes/progress';
import scheduleRoutes from './routes/schedule';
import adminRoutes from './routes/admin';
import quizzesRoutes from './routes/quizzes';
import testsRoutes from './routes/tests';

// Initialize express
const app = express();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// Configure CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  exposedHeaders: ['x-auth-token'],
  optionsSuccessStatus: 204,
  preflightContinue: false
}));

// Handle OPTIONS preflight requests 
// The main CORS middleware above will handle this automatically

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Initialize Passport
app.use(passport.initialize());

// Define routes
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/quizzes', quizzesRoutes);
app.use('/api/tests', testsRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Static files
const publicPath = path.join(__dirname, '../public');
app.use('/api/public', express.static(publicPath));
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));

// Add route for OAuth success page
app.get('/auth/success', (req, res) => {
  res.sendFile(path.join(publicPath, 'oauth-success.html'));
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

export default app;