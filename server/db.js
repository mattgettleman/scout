import pg from 'pg';
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const RESUME_TEXT = `Product and business operations leader with 15+ years driving complex transformation at growth-stage and scaling companies. Trusted advisor to Product, Engineering, and Executive leaders, operating at the intersection of product strategy, systems design, and execution in highly ambiguous environments. Designs and scales operating systems, decision frameworks, and accountability models that align business and technology organizations. Proven record of leading multi-million-dollar programs that accelerate delivery, reduce risk, and drive measurable business impact.

Director, Product Operations at Guild (Series F EdTech) — May 2024–Present. Led $10M backend data infrastructure transformation across 35 engineers and 25 cross-functional stakeholders. Led $6M marketing automation platform migration from Marketo to Iterable.

Director, Business Operations at Guild — June 2022–May 2024. Turned around stalled $10M Salesforce transformation, leading 30+ person team across 10 functions. Built Member Compliance function from the ground up.

Chief Operating Officer at Waste Farmers (CPG startup) — Nov 2016–Nov 2019. Led operations for 20-person team with $3M budget. Redesigned sales organization, launched 2 new products generating $1M+ in first-year revenue.

Founder & Director at Longspoon Consulting — organization design and leadership development for growth-stage companies.

MBA, Sustainable Business & Finance — University of Colorado Leeds School of Business. B.S. Environmental Science — Colorado College.`;

export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      website TEXT,
      description TEXT,
      sector TEXT[] DEFAULT '{}',
      stage TEXT,
      employee_count TEXT,
      ats_type TEXT,
      ats_slug TEXT,
      career_page_url TEXT,
      on_watchlist BOOLEAN DEFAULT false,
      ai_suggested BOOLEAN DEFAULT false,
      ai_reason TEXT,
      added_at TIMESTAMPTZ DEFAULT NOW(),
      last_synced TIMESTAMPTZ
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id SERIAL PRIMARY KEY,
      company_id INT REFERENCES companies(id) ON DELETE CASCADE,
      external_id TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      location TEXT,
      remote BOOLEAN DEFAULT false,
      salary_text TEXT,
      description TEXT,
      posted_at TIMESTAMPTZ,
      fetched_at TIMESTAMPTZ DEFAULT NOW(),
      fit_score INT,
      fit_notes TEXT,
      seen BOOLEAN DEFAULT false,
      dismissed BOOLEAN DEFAULT false,
      saved BOOLEAN DEFAULT false,
      manual BOOLEAN DEFAULT false,
      UNIQUE(company_id, external_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS profile (
      id INT DEFAULT 1 PRIMARY KEY,
      target_roles TEXT[] DEFAULT '{}',
      mission_sectors TEXT[] DEFAULT '{}',
      comp_floor INT DEFAULT 200000,
      company_size_min INT DEFAULT 50,
      company_size_max INT DEFAULT 200,
      resume_text TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Seed profile if empty
  const { rows: profileRows } = await pool.query('SELECT id FROM profile WHERE id = 1');
  if (!profileRows.length) {
    await pool.query(`
      INSERT INTO profile (id, target_roles, mission_sectors, comp_floor, company_size_min, company_size_max, resume_text)
      VALUES (1,
        ARRAY['Chief of Staff', 'Head of Operations', 'COO', 'VP Business Operations', 'Director of Business Operations', 'Head of Business Operations', 'VP Operations', 'Technical Program Manager'],
        ARRAY['climate', 'health', 'education'],
        200000, 50, 200, $1
      )
    `, [RESUME_TEXT]);
  }

  // Seed companies if empty
  const { rows: companyRows } = await pool.query('SELECT id FROM companies LIMIT 1');
  if (!companyRows.length) {
    await seedCompanies();
  }

  // Migrations
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS manual BOOLEAN DEFAULT false`);
  await pool.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS role_filter TEXT[] DEFAULT '{}'`);

  // Patch incorrect ATS slugs from initial seed
  const slugFixes = [
    { name: 'Watershed',      ats_slug: 'watershed',        ats_type: 'greenhouse' },
    { name: 'Color Health',   ats_slug: 'colorgenomics',    ats_type: 'greenhouse' },
    { name: 'Cityblock Health', ats_slug: 'cityblock',      ats_type: 'greenhouse' },
    { name: 'Devoted Health', ats_slug: 'devoted',          ats_type: 'greenhouse' },
    { name: 'Handshake',      ats_slug: 'handshake',        ats_type: 'greenhouse' },
    { name: 'Noodle',         ats_slug: 'noodle',           ats_type: 'greenhouse' },
    { name: 'Raptor Maps',    ats_slug: 'raptormaps',       ats_type: 'greenhouse' },
    { name: 'Nava',           ats_slug: 'navapbc',          ats_type: 'lever' },
    { name: 'Coursera',       ats_slug: 'coursera',         ats_type: 'lever' },
    { name: 'Duolingo',       ats_slug: 'duolingo',         ats_type: 'lever' },
    { name: 'Pachama',        ats_slug: 'pachama',          ats_type: 'lever' },
    { name: 'Arcadia',        ats_slug: 'arcadia',          ats_type: 'greenhouse' },
  ];
  for (const fix of slugFixes) {
    await pool.query(
      'UPDATE companies SET ats_slug = $1, ats_type = $2 WHERE name = $3',
      [fix.ats_slug, fix.ats_type, fix.name]
    );
  }

  console.log('DB initialized');
}

async function seedCompanies() {
  const companies = [
    // Education
    { name: 'Handshake', website: 'https://joinhandshake.com', description: 'Career network connecting college students with employers for early career opportunities.', sector: ['education'], stage: 'series-e', employee_count: '500-1000', ats_type: 'greenhouse', ats_slug: 'handshake', on_watchlist: true },
    { name: 'Duolingo', website: 'https://duolingo.com', description: 'Free language learning platform making education accessible globally.', sector: ['education'], stage: 'public', employee_count: '500-1000', ats_type: 'lever', ats_slug: 'duolingo', on_watchlist: true },
    { name: 'Coursera', website: 'https://coursera.org', description: 'Online learning platform offering courses and degrees from top universities.', sector: ['education'], stage: 'public', employee_count: '1000+', ats_type: 'lever', ats_slug: 'coursera', on_watchlist: false },
    { name: 'Noodle', website: 'https://noodle.com', description: 'Platform helping people find the right higher education programs.', sector: ['education'], stage: 'series-b', employee_count: '50-200', ats_type: 'greenhouse', ats_slug: 'noodle-partners', on_watchlist: false },
    // Climate
    { name: 'Watershed', website: 'https://watershed.com', description: 'Enterprise climate platform helping companies measure, report, and reduce carbon emissions.', sector: ['climate'], stage: 'series-c', employee_count: '200-500', ats_type: 'greenhouse', ats_slug: 'watershedclimate', on_watchlist: true },
    { name: 'Arcadia', website: 'https://arcadia.com', description: 'Clean energy platform connecting households and businesses to renewable energy.', sector: ['climate'], stage: 'series-d', employee_count: '200-500', ats_type: 'greenhouse', ats_slug: 'arcadia', on_watchlist: true },
    { name: 'Pachama', website: 'https://pachama.com', description: 'Using AI and satellite data to verify and scale forest carbon projects.', sector: ['climate'], stage: 'series-b', employee_count: '50-200', ats_type: 'lever', ats_slug: 'pachama', on_watchlist: false },
    { name: 'Raptor Maps', website: 'https://raptormaps.com', description: 'Solar energy operations platform — software for solar asset management.', sector: ['climate'], stage: 'series-b', employee_count: '50-200', ats_type: 'greenhouse', ats_slug: 'raptormaps', on_watchlist: false },
    // Health
    { name: 'Nava', website: 'https://navapbc.com', description: 'Public benefit corporation building better government services for health and benefits programs.', sector: ['health'], stage: 'growth', employee_count: '200-500', ats_type: 'lever', ats_slug: 'nava', on_watchlist: true },
    { name: 'Color Health', website: 'https://color.com', description: 'Population health company focused on preventive care and genetic testing at scale.', sector: ['health'], stage: 'series-e', employee_count: '200-500', ats_type: 'greenhouse', ats_slug: 'color', on_watchlist: true },
    { name: 'Cityblock Health', website: 'https://cityblock.com', description: 'Tech-driven healthcare for underserved urban communities.', sector: ['health'], stage: 'series-d', employee_count: '500-1000', ats_type: 'greenhouse', ats_slug: 'cityblock-health', on_watchlist: false },
    { name: 'Devoted Health', website: 'https://devoted.com', description: 'Health insurance and care coordination for seniors, focused on Medicare Advantage.', sector: ['health'], stage: 'series-d', employee_count: '500-1000', ats_type: 'greenhouse', ats_slug: 'devoted-health', on_watchlist: false },
  ];

  for (const c of companies) {
    await pool.query(`
      INSERT INTO companies (name, website, description, sector, stage, employee_count, ats_type, ats_slug, on_watchlist)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [c.name, c.website, c.description, c.sector, c.stage, c.employee_count, c.ats_type, c.ats_slug, c.on_watchlist]);
  }
}
