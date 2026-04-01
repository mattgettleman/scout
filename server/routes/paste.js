import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { pool } from '../db.js';
import { scoreJob } from './ai.js';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Try to fetch URL and extract text content
async function fetchUrlText(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  // Strip tags, collapse whitespace, take first 4000 chars
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000);
}

// Use Claude to extract structured job details from raw text
async function extractJobDetails(text, originalUrl) {
  const prompt = `Extract job posting details from this text. Return ONLY valid JSON, no markdown.

Text:
${text}

JSON format:
{
  "title": "exact job title",
  "company": "company name",
  "location": "city/state or null",
  "remote": true or false,
  "salary_text": "salary range as string or null",
  "description": "job summary in 2-3 sentences",
  "url": "${originalUrl || 'null'}"
}

If you cannot find a clear job title or company name, set them to null.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  });

  return JSON.parse(message.content[0].text.trim());
}

// Find or create a company record for a manually pasted job
async function findOrCreateCompany(companyName, jobUrl) {
  if (!companyName) {
    // Use a catch-all "Manually Added" company
    const { rows } = await pool.query(
      `INSERT INTO companies (name, on_watchlist) VALUES ('Manually Added', false)
       ON CONFLICT DO NOTHING RETURNING id`
    );
    if (rows.length) return rows[0].id;
    const { rows: existing } = await pool.query(`SELECT id FROM companies WHERE name = 'Manually Added' LIMIT 1`);
    return existing[0]?.id;
  }

  // Check if company already exists (case-insensitive)
  const { rows: existing } = await pool.query(
    'SELECT id FROM companies WHERE lower(name) = lower($1) LIMIT 1',
    [companyName]
  );
  if (existing.length) return existing[0].id;

  // Create minimal company record
  const domain = jobUrl ? (() => { try { return new URL(jobUrl).origin; } catch { return null; } })() : null;
  const { rows: created } = await pool.query(
    `INSERT INTO companies (name, website, on_watchlist, ai_suggested)
     VALUES ($1, $2, false, false) RETURNING id`,
    [companyName, domain]
  );
  return created[0].id;
}

// POST /api/paste
// Body: { url?, text? }
// Returns: { job, extracted } or { needs_text: true, error, partial_text? }
router.post('/', async (req, res) => {
  try {
    const { url, text } = req.body;
    if (!url && !text) return res.status(400).json({ error: 'url or text required' });

    let rawText = text || '';
    let fetchFailed = false;
    let fetchError = null;

    // Step 1: Try to fetch URL content
    if (url && !text) {
      try {
        rawText = await fetchUrlText(url);
      } catch (err) {
        fetchFailed = true;
        fetchError = err.message;
        // Return signal to client to ask for text instead
        return res.json({
          needs_text: true,
          error: `Couldn't fetch that URL (${fetchError}). Paste the job text below instead.`
        });
      }
    }

    if (!rawText.trim()) {
      return res.status(400).json({ error: 'No content to parse' });
    }

    // Step 2: Extract structured details with Claude
    let extracted;
    try {
      extracted = await extractJobDetails(rawText, url);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to extract job details: ' + err.message });
    }

    if (!extracted.title || !extracted.company) {
      return res.json({ needs_text: true, error: "Couldn't find a job title or company name. Try pasting the job text directly." });
    }

    // Step 3: Find or create company
    const companyId = await findOrCreateCompany(extracted.company, extracted.url || url);

    // Step 4: Save job
    const externalId = extracted.url || url || `manual-${Date.now()}`;
    const { rows } = await pool.query(`
      INSERT INTO jobs (company_id, external_id, title, url, location, remote, salary_text, description, manual)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      ON CONFLICT (company_id, external_id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        manual = true
      RETURNING *
    `, [
      companyId,
      externalId,
      extracted.title,
      extracted.url || url || '',
      extracted.location,
      extracted.remote || false,
      extracted.salary_text,
      extracted.description
    ]);

    const job = rows[0];

    // Step 5: Score async
    scoreJob(job.id, job.title, job.description).catch(() => {});

    // Return job with company info for immediate display
    const { rows: companyRows } = await pool.query('SELECT name, sector FROM companies WHERE id = $1', [companyId]);
    res.json({
      job: {
        ...job,
        company_name: companyRows[0]?.name,
        company_sector: companyRows[0]?.sector || []
      },
      extracted
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
