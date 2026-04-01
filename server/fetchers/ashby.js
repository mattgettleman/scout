import { matchesRole } from './keywords.js';

export async function fetchAshby(company) {
  const url = `https://jobs.ashbyhq.com/api/non-user-facing/job-board/${company.ats_slug}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (res.status === 404) return [];
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
