import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/feed', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT j.*, c.name as company_name, c.sector as company_sector, c.stage as company_stage
      FROM jobs j
      JOIN companies c ON j.company_id = c.id
      WHERE j.seen = false AND j.dismissed = false AND c.on_watchlist = true
      ORDER BY j.fit_score DESC NULLS LAST, j.fetched_at DESC
      LIMIT 100
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { company_id, seen, dismissed, saved } = req.query;
    const conditions = [];
    const params = [];
    let i = 1;
    if (company_id) { conditions.push(`j.company_id = $${i++}`); params.push(company_id); }
    if (seen !== undefined) { conditions.push(`j.seen = $${i++}`); params.push(seen === 'true'); }
    if (dismissed !== undefined) { conditions.push(`j.dismissed = $${i++}`); params.push(dismissed === 'true'); }
    if (saved !== undefined) { conditions.push(`j.saved = $${i++}`); params.push(saved === 'true'); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(`
      SELECT j.*, c.name as company_name, c.sector as company_sector
      FROM jobs j JOIN companies c ON j.company_id = c.id
      ${where}
      ORDER BY j.fit_score DESC NULLS LAST, j.posted_at DESC NULLS LAST
    `, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['seen', 'dismissed', 'saved'];
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
      `UPDATE jobs SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      params
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
