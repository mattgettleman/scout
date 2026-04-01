import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM profile WHERE id = 1');
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', async (req, res) => {
  try {
    const { target_roles, mission_sectors, comp_floor, company_size_min, company_size_max, resume_text } = req.body;
    const { rows } = await pool.query(`
      INSERT INTO profile (id, target_roles, mission_sectors, comp_floor, company_size_min, company_size_max, resume_text, updated_at)
      VALUES (1, $1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (id) DO UPDATE SET
        target_roles = EXCLUDED.target_roles,
        mission_sectors = EXCLUDED.mission_sectors,
        comp_floor = EXCLUDED.comp_floor,
        company_size_min = EXCLUDED.company_size_min,
        company_size_max = EXCLUDED.company_size_max,
        resume_text = COALESCE(EXCLUDED.resume_text, profile.resume_text),
        updated_at = NOW()
      RETURNING *
    `, [target_roles, mission_sectors, comp_floor, company_size_min, company_size_max, resume_text ?? null]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
