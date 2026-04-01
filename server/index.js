import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDB } from './db.js';
import profileRouter from './routes/profile.js';
import companiesRouter from './routes/companies.js';
import jobsRouter from './routes/jobs.js';
import syncRouter from './routes/sync.js';
import aiRouter from './routes/ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(express.json());

app.use('/api/profile', profileRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/sync', syncRouter);
app.use('/api/ai', aiRouter);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

if (isProd) {
  const buildPath = path.join(__dirname, '../client/dist');
  app.use(express.static(buildPath));
  app.get('*', (req, res) => res.sendFile(path.join(buildPath, 'index.html')));
}

initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Scout server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize DB:', err);
  process.exit(1);
});
