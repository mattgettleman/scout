import { matchesRole } from './keywords.js';

export async function fetchGreenhouse(company) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${company.ats_slug}/jobs?content=true`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Greenhouse API error: ${res.status}`);
  const data = await res.json();

  return (data.jobs || [])
    .filter(job => matchesRole(job.title))
    .map(job => ({
      external_id: String(job.id),
      title: job.title,
      url: job.absolute_url,
      location: job.location?.name || null,
      remote: /remote/i.test(job.location?.name || '') || /remote/i.test(job.title),
      description: job.content
        ? job.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000)
        : null,
      posted_at: job.updated_at || null
    }));
}
