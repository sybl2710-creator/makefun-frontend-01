import { bounty, leaderboard, listBounties, profile } from './api.js';

let routeVersion = 0;
const root = document.querySelector('#app');
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);
const first = (...values) => values.find(value => value !== undefined && value !== null && value !== '');
const money = value => {
  if (value == null || value === '') return '—';
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toLocaleString('en-US', { style:'currency', currency:'USD', maximumFractionDigits: amount % 1 ? 2 : 0 }) : esc(value);
};
const date = value => value ? new Date(value).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric', timeZone:'UTC' }) : 'Not set';
function left(value) {
  const ms = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(ms)) return 'Deadline not set';
  if (ms <= 0) return 'Closed';
  const days = Math.floor(ms / 86400000), hours = Math.floor(ms % 86400000 / 3600000);
  return days ? `${days}d ${hours}h left` : `${Math.max(1, Math.floor(ms / 3600000))}h left`;
}
const deadline = b => first(b.deadline, b.deadlineAt, b.endsAt, b.endAt);
const slug = b => first(b.slug, b.id, '');
const title = b => first(b.title, b.name, 'Untitled bounty');
const pot = b => money(first(b.potUsd, b.livePotUsd, b.prizePoolUsd, b.rewardAmount, b.prizeUsd));
const itemsOf = data => Array.isArray(data) ? data : first(data?.items, data?.entries, data?.submissions, data?.leaderboard, data?.results, []);
const handleOf = item => first(item.handle, item.username, item.user?.handle, item.user?.username, item.account?.handle);
const cardHeading = (eyebrow, heading, extra = '') => `<div class="pagehead"><div><div class="eyebrow">${eyebrow}</div><h1>${heading}</h1></div>${extra}</div>`;
const crumb = (label, href) => `<a class="crumb" href="${href}">← ${label}</a>`;

function board(data) {
  const all = itemsOf(data).slice().sort((a,b) => {
    const av = new Date(deadline(a)).getTime() - Date.now(), bv = new Date(deadline(b)).getTime() - Date.now();
    return (av > 0 ? 0 : 1) - (bv > 0 ? 0 : 1) || av - bv;
  });
  const page = Number(new URLSearchParams(location.hash.split('?')[1] || '').get('page')) || 1;
  const per = 12, shown = all.slice((page - 1) * per, page * per);
  const rows = shown.map((b, index) => {
    const closed = new Date(deadline(b)).getTime() <= Date.now();
    return `<a class="bounty-row" href="#/bounty/${encodeURIComponent(slug(b))}"><span class="row-index">${String((page - 1) * per + index + 1).padStart(2,'0')}</span><span class="row-title"><strong>${esc(title(b))}</strong><small>${esc(first(b.category, b.type, 'Open competition'))}</small></span><span class="metric"><small>LIVE POT</small><strong>${pot(b)}</strong></span><span class="metric fee"><small>ENTRY</small><strong>${b.entryFeeUsd ? money(b.entryFeeUsd) : 'Free'}</strong></span><span class="metric deadline ${closed ? 'muted' : ''}"><small>${closed ? 'STATUS' : 'TIME LEFT'}</small><strong>${esc(left(deadline(b)))}</strong></span><span class="metric entries"><small>ENTRIES</small><strong>${Number(first(b.submissionCount,b.entryCount,b.entriesCount,0)).toLocaleString()}</strong></span><span class="arrow">↗</span></a>`;
  }).join('');
  const pages = Math.max(1, Math.ceil(all.length / per));
  return `${cardHeading('MAKE.FUN / BOUNTY BOARD', 'Open calls', `<span class="count">${all.length} competitions</span>`)}<p class="lede">A live index of competitions, prize pools and closing dates.</p><div class="table-label"><span>COMPETITION</span><span>LIVE POT</span><span>ENTRY</span><span>DEADLINE</span><span>ENTRIES</span></div><section class="rows">${rows || '<div class="empty">No competitions are available right now.</div>'}</section>${pages > 1 ? `<div class="pagination"><span>Page ${page} of ${pages}</span><div>${page > 1 ? `<a href="#/?page=${page - 1}">← Previous</a>` : ''}${page < pages ? `<a href="#/?page=${page + 1}">Next →</a>` : ''}</div></div>` : ''}`;
}

function rewards(b) {
  const tiers = first(b.rewardsNow, b.rewards, b.prizes, b.payouts, b.rewardTiers, []);
  if (Array.isArray(tiers) && tiers.length) return tiers.map((r,i) => `<tr><td>${esc(first(r.place, r.rank, `#${i + 1}`))}</td><td>${esc(first(r.label, r.title, 'Winner'))}</td><td>${money(first(r.amountUsd,r.rewardUsd,r.amount,r.value))}</td></tr>`).join('');
  return `<tr><td>Prize pool</td><td>Live pot</td><td>${pot(b)}</td></tr>`;
}
function detail(b) {
  const id = slug(b), end = deadline(b), closed = new Date(end).getTime() <= Date.now();
  return `${crumb('All bounties', '#/')}${cardHeading('COMPETITION / OVERVIEW', title(b), `<span class="status ${closed ? 'closed' : ''}">${closed ? 'Deadline passed' : 'Accepting entries'}</span>`)}<p class="lede detail-lede">${esc(first(b.summary, b.subtitle, 'Build, submit and compete for the live prize pool.'))}</p><div class="stats"><div><small>LIVE POT</small><strong>${pot(b)}</strong></div><div><small>ENTRY FEE</small><strong>${b.entryFeeUsd ? money(b.entryFeeUsd) : 'Free'}</strong></div><div><small>ENTRIES</small><strong>${Number(first(b.submissionCount,b.entryCount,0)).toLocaleString()}</strong></div><div><small>DEADLINE</small><strong>${esc(left(end))}</strong><span>${date(end)}</span></div></div><div class="detail-grid"><section class="prose"><h2>About this bounty</h2><p>${esc(first(b.description,b.summary,'No description provided.'))}</p>${b.rules ? `<h2>Rules</h2><p>${esc(b.rules)}</p>` : ''}</section><aside class="side-panel"><div class="section-title"><h2>Rewards</h2><span>USD</span></div><table><thead><tr><th>PLACE</th><th>AWARD</th><th>VALUE</th></tr></thead><tbody>${rewards(b)}</tbody></table><div class="dates"><div><span>Opens</span><strong>${date(first(b.opensAt,b.startsAt,b.startAt,b.openedAt,b.publishedAt))}</strong></div><div><span>Closes</span><strong>${date(end)}</strong></div></div><a class="primary" href="#/bounty/${encodeURIComponent(id)}/leaderboard">View leaderboard <span>→</span></a></aside></div>`;
}

function leaderboardView(data, b) {
  const all = [...itemsOf(data), ...(data.rest || [])];
  const page = Number(new URLSearchParams(location.hash.split('?')[1] || '').get('page')) || 1;
  const entries = all.slice((page - 1) * 10, page * 10);
  const column = data.columns?.find(c => c.key === data.rank_key);
  const micro = column?.source?.endsWith('_micro');
  const display = value => value == null ? '—' : micro ? (Number(value)/1000000).toFixed(6) : esc(value);
  const rows = entries.map((entry, i) => {
    const handle = handleOf(entry), name = first(entry.title,entry.name,entry.agent?.name,entry.submission?.title, handle, `Entry ${i + 1}`);
    const place = first(entry.place,entry.rank,entry.position,i + 1);
    const rate = first(entry.values?.[data.rank_key],entry.display?.[data.rank_key],entry.value,entry.rate,entry.winRate);
    const rateText = display(rate);
    const interval = entry.interval ? `<small class="interval">${display(entry.interval.low)} – ${display(entry.interval.high)}</small>` : '';
    return `<tr><td class="place">${String(place).startsWith('#') ? esc(place) : `#${esc(place)}`}</td><td><strong>${esc(name)}</strong>${handle ? `<a class="subhandle" href="#/profile/${encodeURIComponent(handle)}">@${esc(handle)}</a>` : ''}</td><td>${rateText}${interval}</td><td>${esc(first(entry.judge?.provisional ? 'Provisional' : '',entry.status,'')) || '—'}</td><td>${esc(first(entry.display?.bytes,entry.values?.bytes,'')) || '—'}</td></tr>`;
  }).join('');
  const section = data?.items || data?.entries || data?.submissions || data?.leaderboard || data?.results;
  const available = Boolean(section || Array.isArray(data));
  return `${crumb(title(b), `#/bounty/${encodeURIComponent(slug(b))}`)}${cardHeading('COMPETITION / RANKINGS', 'Leaderboard', `<span class="count">${all.length.toLocaleString()} ranked entries</span>`)}<p class="lede detail-lede">${esc(title(b))} <span class="dot">·</span> ${esc(data.phase?.title || 'Current results')} · ${data.phase?.placements_held ? 'Unofficial places' : 'Published places'}</p><div class="rank-wrap"><table class="rank-table"><thead><tr><th>PLACE</th><th>ENTRY / ACCOUNT</th><th>${esc(column?.title || 'SCORE')}</th><th>STATUS</th><th>SIZE / BYTES</th></tr></thead><tbody>${rows}</tbody></table>${!entries.length ? `<div class="empty">${available ? 'No ranked entries yet.' : 'This competition has no published leaderboard data.'}</div>` : ''}</div>${all.length > 10 ? `<div class="pagination"><span>Page ${page} of ${Math.ceil(all.length/10)}</span><div>${page > 1 ? `<a href="#/bounty/${encodeURIComponent(slug(b))}/leaderboard?page=${page-1}">← Previous</a>` : ''}${page*10 < all.length ? `<a href="#/bounty/${encodeURIComponent(slug(b))}/leaderboard?page=${page+1}">Next →</a>` : ''}</div></div>` : ''}`;
}

function profileView(data, requested) {
  const p = data?.profile ?? data?.user ?? data?.account ?? data;
  const handle = first(p.handle,p.username,requested).replace(/^@/,'');
  const entries = p.solutions || [], payouts = p.payouts || [], record = p.record || {};
  const avatar = first(p.avatar?.url,p.image,p.avatarUrl);
  const display = first(p.display_name,p.displayName,p.name,handle);
  const page = Math.max(1, Number(new URLSearchParams(location.hash.split('?')[1] || '').get('page')) || 1);
  const entryRows = entries.slice((page - 1) * 8, page * 8).map(item => `<a class="profile-row" href="#/bounty/${encodeURIComponent(item.competition?.slug || '')}"><span><strong>${esc(item.title || 'Competition entry')}</strong><small>${esc(item.competition?.title)}</small></span><b>${item.placement ? `#${esc(item.placement)}` : '—'}</b></a>`).join('');
  const payoutRows = payouts.map(item => `<div class="prize-row"><span>${esc(item.competition?.title || 'Payout')}<small class="subhandle">${date(item.paid_at)}${item.place ? ` · #${esc(item.place)}` : ''}</small></span><strong>${money(item.amount_usd)}</strong></div>`).join('');
  return `${crumb('All bounties','#/')}${cardHeading('MAKE.FUN / ACCOUNT', `@${esc(handle)}`)}<section class="profile-head">${avatar ? `<img crossorigin="anonymous" src="${esc(avatar)}" alt="">` : `<div class="avatar-fallback">${esc(display.slice(0,1).toUpperCase())}</div>`}<div><h2>${esc(display)}</h2><span>@${esc(handle)}</span></div></section><p class="bio">${esc(first(p.bio,'No bio provided.'))}</p><div class="stats"><div><small>COMPETITIONS</small><strong>${esc(record.competitions_entered ?? '—')}</strong></div><div><small>PLACED</small><strong>${esc(record.competitions_placed ?? '—')}</strong><span>Best placement: ${record.best_placement ? `#${esc(record.best_placement)}` : '—'}</span></div><div><small>WON</small><strong>${esc(record.competitions_won ?? '—')}</strong></div><div><small>PRIZES PAID</small><strong>${money(record.prize_usd)}</strong></div></div><div class="profile-grid"><section><div class="section-title"><h2>Solutions</h2><span>${entries.length}</span></div>${entryRows || '<div class="empty compact">No public solutions.</div>'}${entries.length > 8 ? `<div class="pagination"><span>Page ${page} of ${Math.ceil(entries.length/8)}</span><div>${page > 1 ? `<a href="#/profile/${encodeURIComponent(handle)}?page=${page-1}">← Previous</a>` : ''}${page*8 < entries.length ? `<a href="#/profile/${encodeURIComponent(handle)}?page=${page+1}">Next →</a>` : ''}</div></div>` : ''}</section><section><div class="section-title"><h2>Payouts</h2><span>${payouts.length}</span></div>${payoutRows || '<div class="empty compact">No public payouts.</div>'}</section></div>`;
}

async function render() {
  const version = ++routeVersion;
  window.__shotReady = false;
  const route = decodeURIComponent((location.hash.slice(1) || '/').split('?')[0]);
  root.innerHTML = '<div class="loading"><span class="pulse"></span> Loading live make.fun data…</div>';
  try {
    const match = route.match(/^\/bounty\/([^/]+)(?:\/(leaderboard))?$/);
    const person = route.match(/^\/profile\/([^/]+)$/);
    if (match) {
      const b = await bounty(match[1]);
      document.title = `${title(b)} / make.fun`;
      const html = match[2] ? leaderboardView(await leaderboard(match[1]), b) : detail(b);
      if (version !== routeVersion) return;
      root.innerHTML = html;
    } else if (person) {
      document.title = `@${person[1]} / make.fun`;
      const html = profileView(await profile(person[1]), person[1]);
      if (version !== routeVersion) return;
      root.innerHTML = html;
    } else {
      document.title = 'Open calls / make.fun';
      const html = board(await listBounties());
      if (version !== routeVersion) return;
      root.innerHTML = html;
    }
    window.scrollTo(0,0);
  } catch (error) {
    if (version !== routeVersion) return;
    root.innerHTML = `<section class="error"><div class="eyebrow">CONNECTION ISSUE</div><h1>Data didn’t load</h1><p>${esc(error.message || 'The make.fun API could not be reached.')}</p><button id="retry" type="button">Try again</button></section>`;
    document.querySelector('#retry').addEventListener('click', render);
  }
  window.__shotReady = true;
}

window.addEventListener('hashchange', render);
render();
