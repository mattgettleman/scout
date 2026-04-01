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

export async function fetchAshby(company) {
  const url = `https://jobs.ashbyhq.com/api/non-user-facing/job-board/${company.ats_slug}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Ashby API error: ${res.status}`);
  const data = await res.json();

  return (data.jobPostings || [])
    .filter(job => matchesRole(job.title))
    .map(job => ({
      external_id: job.id,
      title: job.title,
      url: `https://jobs.ashbyhq.com/${company.ats_slug}/${job.id}`,
      location: job.locationName || job.location || null,
      remote: /remote/i.test(job.locationName || '') || job.isRemote === true,
      description: null,
      posted_at: job.publishedAt || job.createdAt || null
    }));
}
