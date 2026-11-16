const ROOT = 'https://make.fun/api';
const memory = new Map();

async function get(path) {
  const prior = memory.get(path), headers = {};
  if (prior && Date.now() - prior.time < 30000) return prior.data;
  if (prior?.etag) headers['If-None-Match'] = prior.etag;
  const response = await fetch(ROOT + path, { headers });
  if (response.status === 304 && prior) { prior.time = Date.now(); return prior.data; }
  if (!response.ok) throw new Error(`make.fun returned ${response.status}`);
  const data = await response.json();
  memory.set(path, { data, etag: response.headers.get('ETag'), time: Date.now() });
  return data;
}

export const listBounties = () => get('/competitions?status=open&activity=times');
export const bounty = slug => get(`/competitions/${encodeURIComponent(slug)}?submissions=summary`);
export const leaderboard = slug => get(`/competitions/${encodeURIComponent(slug)}/leaderboard?rows=first&ties=runs`);
export const profile = handle => get(`/profiles/${encodeURIComponent(handle.replace(/^@/, ''))}`);
