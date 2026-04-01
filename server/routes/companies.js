import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*,
        COUNT(j.id) FILTER (WHERE j.dismissed = false) as job_count,
        COUNT(j.id) FILTER (WHERE j.seen = false AND j.dismissed = false) as unseen_count
      FROM companies c
      LEFT JOIN jobs j ON j.company_id = c.id
      GROUP BY c.id
      ORDER BY c.on_watchlist DESC, c.name ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, website, description, sector, stage, employee_count, ats_type, ats_slug, career_page_url, on_watchlist, ai_suggested, ai_reason } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const { rows } = await pool.query(`
      INSERT INTO companies (name, website, description, sector, stage, employee_count, ats_type, ats_slug, career_page_url, on_watchlist, ai_suggested, ai_reason)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
    `, [name, website, description, sector || [], stage, employee_count, ats_type, ats_slug, career_page_url, on_watchlist ?? false, ai_suggested ?? false, ai_reason]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows: companies } = await pool.query('SELECT * FROM companies WHERE id = $1', [req.params.id]);
    if (!companies.length) return res.status(404).json({ error: 'Not found' });
    const { rows: jobs } = await pool.query(
      'SELECT * FROM jobs WHERE company_id = $1 AND dismissed = false ORDER BY fit_score DESC NULLS LAST, posted_at DESC NULLS LAST',
      [req.params.id]
    );
    res.json({ ...companies[0], jobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['name', 'website', 'description', 'sector', 'stage', 'employee_count', 'ats_type', 'ats_slug', 'career_page_url', 'on_watchlist'];
    const updates = [];
    const params = [];
    let i = 1;
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates.push(`${key} = $${i++}`);
        params.push(req.body[key]);
      }
    }
    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
    params.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE companies SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      params
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM companies WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
