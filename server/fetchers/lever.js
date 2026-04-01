const ROLE_KEYWORDS = [
  'chief of staff', 'coo', 'chief operating', 'head of operations', 'head of business',
  'vp of operations', 'vp operations', 'director of operations', 'director, operations',
  'business operations', 'product operations', 'technical program', 'program manager',
  'strategy', 'head of strategy', 'general manager', 'operations lead', 'ops lead'
];

function matchesRole(title) {
  const t = title.toLowerCase();
  return ROLE_KEYWORDS.some(k => t.includes(k));
}

export async function fetchLever(company) {
  const url = `https://api.lever.co/v0/postings/${company.ats_slug}?mode=json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (res.status === 404) return []; // slug is wrong or company not on Lever
  if (!res.ok) throw new Error(`Lever API error: ${res.status}`);
  const jobs = await res.json();

  return (Array.isArray(jobs) ? jobs : [])
    .filter(job => matchesRole(job.text))
    .map(job => {
      const loc = job.categories?.location || job.workplaceType || '';
      const descText = [
        job.descriptionPlain,
        ...(job.lists || []).map(l => l.content?.replace(/<[^>]+>/g, ' ') || '')
      ].join(' ').replace(/\s+/g, ' ').trim().slice(0, 2000);

      return {
        external_id: job.id,
        title: job.text,
        url: job.hostedUrl || `https://jobs.lever.co/${company.ats_slug}/${job.id}`,
        location: loc || null,
        remote: /remote/i.test(loc) || job.workplaceType === 'remote',
        description: descText || null,
        posted_at: job.createdAt ? new Date(job.createdAt).toISOString() : null
      };
    });
}
