import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';

import db from './db/index.js';
import autoCleanup from './jobs/autoCleanup.js';
import startConnectionMonitor from './jobs/connectionMonitor.js';

// Route imports
import authRoutes from './routes/auth.js';
import billRoutes from './routes/bills.js';
import itemRoutes from './routes/items.js';
import statisticsRoutes from './routes/statistics.js';
import settingsRoutes from './routes/settings.js';
import gatePassRoutes from './routes/gatePasses.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config({ path: '../.env' }); 

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/gatepasses', gatePassRoutes);

// Error Handler
app.use(errorHandler);

cron.schedule('0 0 * * *', () => {
  console.log('Running daily 5-year data cleanup job...');
  autoCleanup();
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  try {
    await db.query('SELECT 1');
    console.log('✅ Successfully connected to the PostgreSQL database.');
  } catch (error) {
    console.error('❌ Failed to connect to the database on startup:', error.message);
  }
  
  startConnectionMonitor(60000); 
});