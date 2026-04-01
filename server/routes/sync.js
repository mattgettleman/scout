import { Router } from 'express';
import { pool } from '../db.js';
import { fetchGreenhouse } from '../fetchers/greenhouse.js';
import { fetchLever } from '../fetchers/lever.js';
import { fetchAshby } from '../fetchers/ashby.js';
import { scoreJob } from './ai.js';

const router = Router();

async function syncCompany(company) {
  if (!company.ats_slug || !company.ats_type || company.ats_type === 'other') {
    return { company: company.name, skipped: true, reason: 'No ATS configured' };
  }

  let jobs = [];
  try {
    if (company.ats_type === 'greenhouse') jobs = await fetchGreenhouse(company);
    else if (company.ats_type === 'lever') jobs = await fetchLever(company);
    else if (company.ats_type === 'ashby') jobs = await fetchAshby(company);
    else return { company: company.name, skipped: true, reason: `Unsupported ATS: ${company.ats_type}` };
  } catch (err) {
    return { company: company.name, error: err.message };
  }

  let added = 0;
  for (const job of jobs) {
    try {
      const { rows, rowCount } = await pool.query(`
        INSERT INTO jobs (company_id, external_id, title, url, location, remote, description, posted_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (company_id, external_id) DO NOTHING
        RETURNING id, title, description
      `, [company.id, job.external_id, job.title, job.url, job.location, job.remote, job.description, job.posted_at]);

      if (rowCount > 0 && rows[0]) {
        added++;
        // Score the new job async (don't block sync)
        scoreJob(rows[0].id, rows[0].title, rows[0].description).catch(() => {});
      }
    } catch (e) {
      // skip bad rows
    }
  }

  await pool.query('UPDATE companies SET last_synced = NOW() WHERE id = $1', [company.id]);
  return { company: company.name, fetched: jobs.length, added };
}

router.post('/', async (req, res) => {
  try {
    const { rows: companies } = await pool.query(
      'SELECT * FROM companies WHERE on_watchlist = true'
    );
    if (!companies.length) return res.json({ results: [], message: 'No companies on watchlist' });

    const results = await Promise.allSettled(companies.map(syncCompany));
    const output = results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason?.message });
    const totalAdded = output.reduce((sum, r) => sum + (r.added || 0), 0);

    res.json({ total_added: totalAdded, results: output });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM companies WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Company not found' });
    const result = await syncCompany(rows[0]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
