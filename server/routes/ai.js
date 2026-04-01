import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { pool } from '../db.js';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Called internally during sync — not exposed as a route handler
export async function scoreJob(jobId, title, description) {
  if (!process.env.ANTHROPIC_API_KEY) return;
  try {
    const { rows: profileRows } = await pool.query('SELECT target_roles, resume_text FROM profile WHERE id = 1');
    const profile = profileRows[0];
    if (!profile) return;

    const prompt = `You are evaluating job fit for a senior operations leader. Score this job opening.

Candidate profile:
- Target roles: ${profile.target_roles?.join(', ')}
- Background: ${(profile.resume_text || '').slice(0, 800)}

Job: ${title}
Description: ${(description || '').slice(0, 1000)}

Return ONLY valid JSON in this exact format:
{"score": <0-100 integer>, "notes": "<1-2 sentence explanation of fit>"}

Score 80-100: strong match for target roles and seniority. Score 60-79: decent match, some gaps. Score below 60: weak match.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = message.content[0].text.trim();
    const result = JSON.parse(raw);
    if (typeof result.score === 'number' && result.notes) {
      await pool.query('UPDATE jobs SET fit_score = $1, fit_notes = $2 WHERE id = $3', [result.score, result.notes, jobId]);
    }
  } catch (e) {
    // scoring is best-effort
  }
}

// POST /api/ai/discover — suggest companies based on watchlist + profile
router.post('/discover', async (req, res) => {
  try {
    const { rows: profileRows } = await pool.query('SELECT * FROM profile WHERE id = 1');
    const { rows: watchlistRows } = await pool.query(
      "SELECT name, sector, stage FROM companies WHERE on_watchlist = true"
    );

    const profile = profileRows[0] || {};
    const watchlist = watchlistRows.map(c => `${c.name} (${(c.sector || []).join('/')})`).join(', ');
    const sourcesLine = (profile.discovery_sources || []).length
      ? `- Draw from these ecosystems/databases: ${profile.discovery_sources.join(', ')}`
      : '';
    const contextLine = profile.discover_context
      ? `- Additional search context: ${profile.discover_context}`
      : '';

    const prompt = `You are a career research assistant helping a senior operations and strategy leader find mission-aligned companies for their job search.

Candidate profile:
- Target roles: ${(profile.target_roles || []).join(', ')}
- Mission sectors: ${(profile.mission_sectors || []).join(', ')}
- Target company size: ${profile.company_size_min}–${profile.company_size_max} employees
- Target stage: Series B or C
- Base comp floor: $${profile.comp_floor?.toLocaleString()}
- Already watching: ${watchlist || 'none yet'}
${sourcesLine}
${contextLine}

Find 10 mission-aligned companies this person should consider. Requirements:
- In climate tech, health/healthcare access, or education/workforce development
- 50–500 employees (Series B–D stage is ideal)
- "Do no harm" — no ad tech, surveillance, predatory finance, or extractive business models
- Strong equity packages typical (VC-backed growth stage)
- Roles like COO, Chief of Staff, Head of Operations, VP Biz Ops would plausibly exist at this stage
- Don't include companies already on the watchlist

Return ONLY a valid JSON array, no markdown, no explanation:
[
  {
    "name": "Company Name",
    "website": "https://...",
    "description": "One sentence mission description",
    "sector": ["climate"|"health"|"education"],
    "stage": "series-b"|"series-c"|"series-d"|"growth",
    "employee_count": "50-200"|"200-500",
    "ats_type": "greenhouse"|"lever"|"ashby"|"other",
    "ats_slug": "slug-here-or-null",
    "why_recommended": "2-3 sentence explanation of why this is a strong fit for this candidate"
  }
]`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = message.content[0].text.trim();
    const companies = JSON.parse(raw);
    res.json({ companies });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/discover-roles — suggest (company, role) pairings worth investigating
router.post('/discover-roles', async (req, res) => {
  try {
    const { rows: profileRows } = await pool.query('SELECT * FROM profile WHERE id = 1');
    const { rows: watchlistRows } = await pool.query(
      "SELECT name FROM companies WHERE on_watchlist = true"
    );

    const profile = profileRows[0] || {};
    const watching = watchlistRows.map(c => c.name).join(', ');
    const sourcesLine = (profile.discovery_sources || []).length
      ? `- Draw from these ecosystems/databases: ${profile.discovery_sources.join(', ')}`
      : '';
    const contextLine = profile.discover_context
      ? `- Additional search context: ${profile.discover_context}`
      : '';

    const prompt = `You are a career research assistant helping a senior operations and strategy leader find specific roles worth pursuing.

Candidate profile:
- Target roles: ${(profile.target_roles || []).join(', ')}
- Mission sectors: ${(profile.mission_sectors || []).join(', ')}
- Target company size: ${profile.company_size_min}–${profile.company_size_max} employees
- Base comp floor: $${profile.comp_floor?.toLocaleString()}
- Already watching: ${watching || 'none yet'}
${sourcesLine}
${contextLine}

Suggest 10 specific (company, role type) pairings this person should investigate. These are informed recommendations — companies likely to have or regularly post these role types given their stage and growth. Don't suggest roles at companies already on the watchlist.

Requirements:
- Companies in climate tech, health/healthcare access, or education/workforce development
- 50–500 employees (Series B–D stage ideal)
- Role types from their target list: COO, Chief of Staff, Head of Operations, VP Business Operations, Director of Business Operations, Head of Business Operations, VP Operations, Technical Program Manager
- "Do no harm" — no ad tech, surveillance, predatory finance

Return ONLY a valid JSON array, no markdown, no explanation:
[
  {
    "company": "Company Name",
    "role_type": "Chief of Staff",
    "website": "https://...",
    "sector": ["climate"|"health"|"education"],
    "stage": "series-b"|"series-c"|"series-d"|"growth",
    "employee_count": "50-200"|"200-500",
    "ats_type": "greenhouse"|"lever"|"ashby"|"other",
    "ats_slug": "slug-or-null",
    "why": "2-3 sentence explanation of why this role at this company is a strong fit"
  }
]`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = message.content[0].text.trim();
    const roles = JSON.parse(raw);
    res.json({ roles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/lookup-company — given a company name, return mission/ATS info
router.post('/lookup-company', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const prompt = `Research this company for a job seeker: "${name}"

Return ONLY valid JSON with no markdown:
{
  "name": "${name}",
  "website": "https://...",
  "description": "One sentence mission/what they do",
  "sector": ["climate"|"health"|"education"|"other"],
  "stage": "seed"|"series-a"|"series-b"|"series-c"|"series-d"|"growth"|"public"|"unknown",
  "employee_count": "1-50"|"50-200"|"200-500"|"500-1000"|"1000+"|"unknown",
  "ats_type": "greenhouse"|"lever"|"ashby"|"workday"|"other"|"unknown",
  "ats_slug": "the-slug-or-null"
}

For ats_slug: this is the identifier used in their job board URL. For Greenhouse it's in https://boards.greenhouse.io/SLUG, for Lever it's in https://jobs.lever.co/SLUG. If unsure, use null.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = message.content[0].text.trim();
    const result = JSON.parse(raw);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
