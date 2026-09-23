const $ = (id) => document.getElementById(id);

const els = {
  connect: $('connectYoutube'), disconnect: $('disconnectYoutube'), connection: $('youtubeConnectionStatus'),
  refresh: $('refreshChannel'), buildPlan: $('buildGrowthPlan'), loadVideos: $('loadMoreVideos'), autoFixMetadata: $('autoFixMetadata'),
  metricViews: $('metricViews'), metricWatch: $('metricWatchHours'), metricAvg: $('metricAvgDuration'), metricSubs: $('metricNetSubs'),
  snapshot: $('channelSnapshot'), plan: $('growthPlan'), audit: $('videoAuditTable'),
  channelDescription: $('channelDescriptionDraft'), generateDescription: $('generateChannelDescription'), applyDescription: $('applyChannelDescription'), autoOptimizeChannel: $('autoOptimizeChannel'),
  autoTopic: $('autoTopic'), autoFind: $('autoFindCreateUpload'), autoFinderStatus: $('autoFinderStatus'), commonsResults: $('commonsResults'),
  autoLocalFile: $('autoLocalFile'), autoLocalFileLabel: $('autoLocalFileLabel'), autoStartLocal: $('autoStartLocal'),
  autoStatusText: $('autoStatusText'), autoProgressBar: $('autoProgressBar'), autoStatusDetail: $('autoStatusDetail'),
  ccQuery: $('ccSearchQuery'), ccButton: $('ccSearchButton'), ccStatus: $('ccFinderStatus'), ccResults: $('ccResults'),
  uploadFile: $('youtubeUploadFile'), uploadFileLabel: $('youtubeUploadFileLabel'), uploadReady: $('youtubeUploadReady'),
  uploadTitle: $('uploadTitle'), uploadDescription: $('uploadDescription'), uploadTags: $('uploadTags'), uploadPrivacy: $('uploadPrivacy'),
  uploadCategory: $('uploadCategory'), uploadMadeForKids: $('uploadMadeForKids'), uploadPlaylist: $('uploadPlaylist'), uploadCaptions: $('uploadCaptions'), uploadThumbnail: $('uploadThumbnail'), notifySubscribers: $('notifySubscribers'),
  uploadButton: $('uploadToYoutube'), uploadStatus: $('youtubeUploadStatus'), uploadProgress: $('youtubeUploadProgress'),
  clientId: $('googleClientId'), apiKey: $('youtubeApiKey'), saveSettings: $('saveYoutubeSettings'), clearSettings: $('clearYoutubeSettings'), runDiagnostics: $('runDiagnostics'), settingsStatus: $('settingsStatus'), diagnosticsStatus: $('diagnosticsStatus'),
};

const STORAGE_KEY = 'clipfree_youtube_settings_v2';
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.force-ssl',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
].join(' ');

const state = {
  settings: { clientId: '', apiKey: '' },
  accessToken: '',
  expiresAt: 0,
  channel: null,
  videos: [],
  analyticsByVideo: new Map(),
  playlists: [],
  generatedExport: null,
  uploadFile: null,
  autoUploadQueued: false,
  autoLocalSelected: null,
  autoSource: null,
};

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[ch]));
}

function setNotice(el, text, type = '') {
  el.textContent = text;
  el.className = `notice ${type}`.trim();
}

function setAutoStatus(text, progress = null, detail = null, type = 'subtle') {
  if (els.autoStatusText) els.autoStatusText.textContent = text;
  if (progress !== null && els.autoProgressBar) els.autoProgressBar.style.width = `${Math.max(0, Math.min(100, Number(progress) || 0))}%`;
  if (detail && els.autoStatusDetail) setNotice(els.autoStatusDetail, detail, type);
}

function stripHtml(value = '') {
  const box = document.createElement('div');
  box.innerHTML = String(value || '');
  return (box.textContent || box.innerText || '').replace(/\s+/g, ' ').trim();
}

function nfmt(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat(undefined, { notation: n >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(n);
}

function durationFmt(seconds) {
  seconds = Math.max(0, Math.round(Number(seconds || 0)));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
}

function parseIsoDuration(value = '') {
  const m = value.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (Number(m[1] || 0) * 86400) + (Number(m[2] || 0) * 3600) + (Number(m[3] || 0) * 60) + Number(m[4] || 0);
}

function dateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    state.settings.clientId = parsed.clientId || '';
    state.settings.apiKey = parsed.apiKey || '';
  } catch {}
  els.clientId.value = state.settings.clientId;
  els.apiKey.value = state.settings.apiKey;
  updateSettingsStatus();
}

function updateSettingsStatus() {
  if (state.settings.clientId) {
    setNotice(els.settingsStatus, 'OAuth Client ID saved on this device. You can now connect your YouTube channel.', 'good');
  } else {
    setNotice(els.settingsStatus, 'Add a Google OAuth Client ID to connect your channel. An API key is optional.', 'subtle');
  }
}

els.saveSettings.addEventListener('click', () => {
  const clientId = els.clientId.value.trim();
  const apiKey = els.apiKey.value.trim();
  if (clientId && !clientId.endsWith('.apps.googleusercontent.com')) {
    return setNotice(els.settingsStatus, 'That OAuth Client ID does not look valid. It should end in .apps.googleusercontent.com.', 'bad');
  }
  state.settings = { clientId, apiKey };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
  updateSettingsStatus();
  refreshFinderAvailability();
});

els.runDiagnostics.addEventListener('click', async () => {
  els.runDiagnostics.disabled = true;
  els.diagnosticsStatus.classList.remove('hidden');
  setNotice(els.diagnosticsStatus, 'Running checks…');
  const checks = [];
  checks.push(['WebAssembly', typeof WebAssembly !== 'undefined']);
  checks.push(['Web Worker', typeof Worker !== 'undefined']);
  checks.push(['Audio decoding', Boolean(window.AudioContext || window.webkitAudioContext)]);
  checks.push(['Local storage', (() => { try { localStorage.setItem('__clipfree_test','1'); localStorage.removeItem('__clipfree_test'); return true; } catch { return false; } })()]);
  for (const file of ['ffmpeg-worker.js','ffmpeg-const.js','ffmpeg-errors.js']) {
    try { const r = await fetch(new URL(file, window.location.href), { cache:'no-store' }); checks.push([file, r.ok]); } catch { checks.push([file, false]); }
  }
  checks.push(['Google sign-in library', Boolean(window.google?.accounts?.oauth2)]);
  const failed = checks.filter(([,ok]) => !ok);
  const text = checks.map(([name,ok]) => `${ok ? '✓' : '✗'} ${name}`).join(' • ');
  setNotice(els.diagnosticsStatus, text, failed.length ? 'bad' : 'good');
  els.runDiagnostics.disabled = false;
});

els.clearSettings.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  state.settings = { clientId: '', apiKey: '' };
  els.clientId.value = '';
  els.apiKey.value = '';
  disconnectYoutube();
  updateSettingsStatus();
  refreshFinderAvailability();
});

async function waitForGoogle(timeout = 10000) {
  const start = Date.now();
  while (!(window.google && google.accounts && google.accounts.oauth2)) {
    if (Date.now() - start > timeout) throw new Error('Google sign-in library did not load. Check your internet connection, disable content blockers for this site, then refresh.');
    await new Promise(r => setTimeout(r, 150));
  }
}

async function requestAccessToken() {
  if (!state.settings.clientId) throw new Error('Add your Google OAuth Client ID in Setup first.');
  await waitForGoogle();
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: state.settings.clientId,
      scope: SCOPES,
      callback: (response) => {
        if (response.error) return reject(new Error(response.error_description || response.error));
        state.accessToken = response.access_token;
        state.expiresAt = Date.now() + Math.max(60, Number(response.expires_in || 3600) - 60) * 1000;
        resolve(state.accessToken);
      },
      error_callback: (error) => reject(new Error(error?.message || error?.type || 'Google sign-in failed.')),
    });
    client.requestAccessToken({ prompt: state.accessToken ? '' : 'consent' });
  });
}

async function ensureToken() {
  if (state.accessToken && Date.now() < state.expiresAt) return state.accessToken;
  return requestAccessToken();
}

async function apiJson(url, options = {}, requireAuth = true) {
  const headers = new Headers(options.headers || {});
  if (requireAuth) headers.set('Authorization', `Bearer ${await ensureToken()}`);
  const response = await fetch(url, { ...options, headers });
  let body = null;
  const text = await response.text();
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!response.ok) {
    const detail = body?.error?.message || body?.error_description || body?.raw || `${response.status} ${response.statusText}`;
    throw new Error(detail);
  }
  return body;
}

function ytUrl(path, params = {}) {
  const u = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  Object.entries(params).forEach(([k,v]) => {
    if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
  });
  return u.toString();
}

async function connectYoutube() {
  try {
    els.connect.disabled = true;
    els.connect.innerHTML = '<span class="spinner"></span>Connecting';
    setNotice(els.connection, 'Opening Google sign-in…');
    await requestAccessToken();
    await refreshAllChannelData();
    els.disconnect.classList.remove('hidden');
    setNotice(els.connection, `Connected to ${state.channel?.snippet?.title || 'your YouTube channel'}.`, 'good');
  } catch (err) {
    console.error(err);
    setNotice(els.connection, err.message || String(err), 'bad');
  } finally {
    els.connect.disabled = false;
    els.connect.textContent = 'Connect YouTube';
  }
}

function disconnectYoutube() {
  const token = state.accessToken;
  state.accessToken = '';
  state.expiresAt = 0;
  state.channel = null;
  state.videos = [];
  state.analyticsByVideo.clear();
  state.playlists = [];
  renderPlaylistOptions();
  if (token && window.google?.accounts?.oauth2?.revoke) {
    try { google.accounts.oauth2.revoke(token, () => {}); } catch {}
  }
  els.disconnect.classList.add('hidden');
  setNotice(els.connection, 'YouTube is not connected. Your saved Client ID remains on this device.', 'subtle');
  setConnectedControls(false);
  resetMetrics();
  els.snapshot.textContent = 'Connect YouTube to load your channel.';
  els.plan.textContent = 'Your plan will be generated from your recent videos and analytics.';
  els.audit.textContent = 'Connect YouTube to audit your videos.';
  refreshUploadState();
}

function setConnectedControls(enabled) {
  [els.refresh, els.buildPlan, els.loadVideos, els.autoFixMetadata, els.autoOptimizeChannel, els.generateDescription, els.applyDescription].filter(Boolean).forEach(el => el.disabled = !enabled);
  refreshUploadState();
}

els.connect.addEventListener('click', connectYoutube);
els.disconnect.addEventListener('click', disconnectYoutube);
els.refresh.addEventListener('click', refreshAllChannelData);
els.loadVideos.addEventListener('click', refreshAllChannelData);
els.buildPlan.addEventListener('click', renderGrowthPlan);

async function refreshAllChannelData() {
  setNotice(els.connection, 'Loading channel, videos and analytics…');
  const channelResponse = await apiJson(ytUrl('channels', {
    part: 'snippet,statistics,contentDetails,brandingSettings',
    mine: 'true',
  }));
  const channel = channelResponse.items?.[0];
  if (!channel) throw new Error('No YouTube channel was found for this Google account.');
  state.channel = channel;

  const uploadsId = channel.contentDetails?.relatedPlaylists?.uploads;
  state.videos = uploadsId ? await fetchUploadVideos(uploadsId, 100) : [];
  state.playlists = await fetchPlaylists().catch(err => { console.warn('Playlists unavailable', err); return []; });
  renderPlaylistOptions();
  await fetchAnalytics().catch(err => {
    console.warn('Analytics unavailable', err);
    resetMetrics();
  });
  renderChannelSnapshot();
  renderVideoAudit();
  renderGrowthPlan();
  if (els.autoTopic && !els.autoTopic.value.trim()) els.autoTopic.value = suggestAutoTopic();
  setConnectedControls(true);
  setNotice(els.connection, `Connected to ${channel.snippet.title}. Loaded ${state.videos.length} recent videos.`, 'good');
}

async function fetchUploadVideos(playlistId, limit = 100) {
  const ids = [];
  let pageToken = '';
  while (ids.length < limit) {
    const data = await apiJson(ytUrl('playlistItems', {
      part: 'contentDetails', playlistId, maxResults: Math.min(50, limit - ids.length), pageToken,
    }));
    for (const item of data.items || []) if (item.contentDetails?.videoId) ids.push(item.contentDetails.videoId);
    pageToken = data.nextPageToken || '';
    if (!pageToken) break;
  }
  const videos = [];
  for (let i = 0; i < ids.length; i += 50) {
    const data = await apiJson(ytUrl('videos', {
      part: 'snippet,contentDetails,statistics,status', id: ids.slice(i, i + 50).join(','), maxResults: 50,
    }));
    videos.push(...(data.items || []));
  }
  const order = new Map(ids.map((id, i) => [id, i]));
  videos.sort((a,b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999));
  return videos;
}

async function fetchPlaylists() {
  const items = [];
  let pageToken = '';
  do {
    const data = await apiJson(ytUrl('playlists', { part: 'snippet,status', mine: 'true', maxResults: 50, pageToken }));
    items.push(...(data.items || []));
    pageToken = data.nextPageToken || '';
  } while (pageToken && items.length < 200);
  return items;
}

function renderPlaylistOptions() {
  if (!els.uploadPlaylist) return;
  const current = els.uploadPlaylist.value;
  els.uploadPlaylist.innerHTML = '<option value="">No playlist</option>' + state.playlists.map(p => `<option value="${esc(p.id)}">${esc(p.snippet?.title || 'Untitled playlist')}</option>`).join('');
  if ([...els.uploadPlaylist.options].some(o => o.value === current)) els.uploadPlaylist.value = current;
  else {
    const shortList = state.playlists.find(p => /shorts?/i.test(p.snippet?.title || ''));
    if (shortList && state.generatedExport) els.uploadPlaylist.value = shortList.id;
  }
}

async function fetchAnalytics() {
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - 27);
  const baseParams = {
    ids: 'channel==MINE', startDate: dateString(start), endDate: dateString(end),
  };
  const summaryUrl = new URL('https://youtubeanalytics.googleapis.com/v2/reports');
  Object.entries({ ...baseParams, metrics: 'views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost' }).forEach(([k,v]) => summaryUrl.searchParams.set(k,v));
  const summary = await apiJson(summaryUrl.toString());
  const summaryRow = rowObject(summary.columnHeaders, summary.rows?.[0] || []);
  els.metricViews.textContent = nfmt(summaryRow.views || 0);
  els.metricWatch.textContent = `${nfmt((Number(summaryRow.estimatedMinutesWatched || 0) / 60).toFixed(1))} h`;
  els.metricAvg.textContent = durationFmt(summaryRow.averageViewDuration || 0);
  const net = Number(summaryRow.subscribersGained || 0) - Number(summaryRow.subscribersLost || 0);
  els.metricSubs.textContent = `${net > 0 ? '+' : ''}${nfmt(net)}`;

  const topUrl = new URL('https://youtubeanalytics.googleapis.com/v2/reports');
  Object.entries({
    ...baseParams,
    metrics: 'views,estimatedMinutesWatched,averageViewDuration,subscribersGained',
    dimensions: 'video', sort: '-estimatedMinutesWatched', maxResults: '50',
  }).forEach(([k,v]) => topUrl.searchParams.set(k,v));
  const top = await apiJson(topUrl.toString());
  state.analyticsByVideo.clear();
  for (const row of top.rows || []) {
    const obj = rowObject(top.columnHeaders, row);
    if (obj.video) state.analyticsByVideo.set(obj.video, obj);
  }
}

function rowObject(headers = [], row = []) {
  const out = {};
  headers.forEach((h, i) => out[h.name] = row[i]);
  return out;
}

function resetMetrics() {
  els.metricViews.textContent = '—';
  els.metricWatch.textContent = '—';
  els.metricAvg.textContent = '—';
  els.metricSubs.textContent = '—';
}

function renderChannelSnapshot() {
  const c = state.channel;
  if (!c) return;
  const thumb = c.snippet?.thumbnails?.default?.url || '';
  const stats = c.statistics || {};
  els.snapshot.innerHTML = `
    <div class="channel-title">
      ${thumb ? `<img src="${esc(thumb)}" alt="" />` : ''}
      <div><h3>${esc(c.snippet.title)}</h3><p>${esc(c.snippet.customUrl || c.id)}</p></div>
    </div>
    <div class="snapshot-grid" style="margin-top:14px">
      <div><small>Subscribers</small><strong>${stats.hiddenSubscriberCount ? 'Hidden' : nfmt(stats.subscriberCount || 0)}</strong></div>
      <div><small>Total views</small><strong>${nfmt(stats.viewCount || 0)}</strong></div>
      <div><small>Public videos</small><strong>${nfmt(stats.videoCount || 0)}</strong></div>
      <div><small>Recent videos loaded</small><strong>${state.videos.length}</strong></div>
    </div>`;
  els.channelDescription.value = c.brandingSettings?.channel?.description || c.snippet?.description || '';
}

const STOP = new Set('the a an and or but to of in on for with from this that these those my your our you i we it is are was were be been being video videos short shorts youtube new more about how why what when where who at by as'.split(/\s+/));
function keywords(text, max = 10) {
  const words = String(text).toLowerCase().replace(/[^a-z0-9\s-]/g,' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w));
  const f = new Map(); words.forEach(w => f.set(w, (f.get(w)||0)+1));
  return [...f.entries()].sort((a,b)=>b[1]-a[1] || b[0].length-a[0].length).map(([w])=>w).slice(0,max);
}

function limitTagList(rawTags) {
  const tags = [];
  let total = 0;
  for (const raw of rawTags) {
    const tag = String(raw || '').trim().slice(0, 80);
    if (!tag || tags.includes(tag)) continue;
    const cost = tag.length + (tags.length ? 1 : 0);
    if (total + cost > 430) break;
    tags.push(tag); total += cost;
    if (tags.length >= 40) break;
  }
  return tags;
}

function channelTopics() {
  const text = state.videos.slice(0, 30).map(v => `${v.snippet?.title || ''} ${v.snippet?.tags?.join(' ') || ''}`).join(' ');
  return keywords(text, 6);
}

function suggestAutoTopic() {
  const topics = channelTopics();
  if (topics.length) return topics.slice(0, 3).join(' ');
  const title = (state.channel?.snippet?.title || '')
    .replace(/\b(tv|official|channel|youtube)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return title || 'wildlife animals';
}

function renderGrowthPlan() {
  if (!state.channel) return;
  const videos = state.videos;
  const topics = channelTopics();
  const ranked = [...videos].map(v => ({ v, a: state.analyticsByVideo.get(v.id) }))
    .filter(x => x.a).sort((a,b) => Number(b.a.estimatedMinutesWatched || 0) - Number(a.a.estimatedMinutesWatched || 0));
  const top = ranked.slice(0, 3);
  const lowMeta = videos.filter(v => metadataHealth(v).score < 70).length;
  const shortCount = videos.filter(v => parseIsoDuration(v.contentDetails?.duration) <= 60).length;
  const items = [];
  if (top.length) {
    items.push({
      title: 'Repeat the themes already earning watch time',
      body: `Your strongest recent watch-time videos include ${top.map(x => `“${x.v.snippet.title}”`).join(', ')}. Build follow-ups around the same viewer promise instead of copying the exact video.`,
    });
  }
  if (topics.length) items.push({ title: 'Keep channel topics clear', body: `Frequent themes in your recent uploads are ${topics.join(', ')}. Use clear titles and thumbnails that immediately tell viewers which of these topics the video delivers.` });
  if (lowMeta) items.push({ title: 'Fix incomplete metadata', body: `${lowMeta} of the ${videos.length} recent videos loaded have missing or very thin titles, descriptions or tags. Use “Fill missing metadata” in the table without replacing already-good text.` });
  if (shortCount) items.push({ title: 'Connect Shorts to longer viewing', body: `${shortCount} loaded videos are 60 seconds or shorter. When relevant, use descriptions, playlists and follow-up videos to give interested viewers a next video to watch.` });
  items.push({ title: 'Optimize for viewers, not fake engagement', body: 'The dashboard tracks views, watch time and subscribers, but it never buys, bots or fabricates engagement. Sustainable growth depends on content people choose to watch and keep watching.' });
  els.plan.className = 'card-body';
  els.plan.innerHTML = `<div class="plan-list">${items.map(x => `<div class="plan-item"><strong>${esc(x.title)}</strong><p>${esc(x.body)}</p></div>`).join('')}</div>`;
}

function metadataHealth(v) {
  const title = (v.snippet?.title || '').trim();
  const desc = (v.snippet?.description || '').trim();
  const tags = v.snippet?.tags || [];
  let score = 0;
  if (title.length >= 20 && title.length <= 75) score += 35; else if (title.length >= 10) score += 20;
  if (desc.length >= 150) score += 35; else if (desc.length >= 60) score += 22; else if (desc.length) score += 10;
  if (tags.length >= 3) score += 15; else if (tags.length) score += 8;
  const upperWords = title.split(/\s+/).filter(w => w.length > 2 && w === w.toUpperCase()).length;
  if (upperWords <= 2) score += 10;
  if (v.snippet?.thumbnails?.high || v.snippet?.thumbnails?.maxres) score += 5;
  const tips = [];
  if (title.length < 20) tips.push('Title is very short');
  if (title.length > 75) tips.push('Title may be harder to scan');
  if (desc.length < 60) tips.push('Description is thin');
  if (tags.length < 3) tips.push('Few tags');
  if (!tips.length) tips.push('Metadata is reasonably complete');
  return { score: Math.min(100, score), tips };
}

function renderVideoAudit() {
  if (!state.videos.length) {
    els.audit.textContent = 'No videos found.';
    return;
  }
  els.audit.className = 'table-wrap';
  const rows = state.videos.map(v => {
    const h = metadataHealth(v);
    const a = state.analyticsByVideo.get(v.id);
    const seconds = parseIsoDuration(v.contentDetails?.duration);
    const labelClass = h.score >= 80 ? 'good' : h.score >= 60 ? '' : 'warn';
    return `<tr>
      <td><strong>${esc(v.snippet.title)}</strong><div class="kpi-note">${esc(h.tips.join(' • '))}</div></td>
      <td>${durationFmt(seconds)}${seconds <= 60 ? '<div class="kpi-note">Short-form length</div>' : ''}</td>
      <td>${nfmt(v.statistics?.viewCount || 0)}</td>
      <td>${a ? `${nfmt((Number(a.estimatedMinutesWatched || 0)/60).toFixed(1))} h` : '<span class="muted-cell">—</span>'}</td>
      <td><span class="health-pill ${labelClass}">${h.score}% complete</span></td>
      <td><div class="mini-actions"><button data-action="fill" data-video="${esc(v.id)}">Fill missing metadata</button><a href="https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}" target="_blank" rel="noopener">Open</a></div></td>
    </tr>`;
  }).join('');
  els.audit.innerHTML = `<table class="audit-table"><thead><tr><th>Video</th><th>Length</th><th>Total views</th><th>28-day watch</th><th>Metadata</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>`;
  els.audit.querySelectorAll('[data-action="fill"]').forEach(btn => btn.addEventListener('click', () => fillMissingMetadata(btn.dataset.video, btn)));
}

function buildFilledSnippet(v) {
  const title = (v.snippet.title || '').trim();
  let description = (v.snippet.description || '').trim();
  const topicWords = keywords(`${title} ${description}`, 10);
  const rawTags = [...new Set([...(v.snippet.tags || []), ...topicWords, state.channel?.snippet?.title || ''])].filter(Boolean);
  const tags = limitTagList(rawTags).slice(0, 25);
  if (description.length < 60) {
    const hash = topicWords.slice(0, 3).map(w => `#${w.replace(/[^a-z0-9]/gi,'')}`).filter(x => x.length > 1).join(' ');
    description = `${description}${description ? '\n\n' : ''}${title}\n\nMore videos from ${state.channel.snippet.title}.${hash ? `\n\n${hash}` : ''}`.trim();
  }
  const snippet = { title, description: description.slice(0, 5000), categoryId: v.snippet.categoryId || '22', tags };
  if (v.snippet.defaultLanguage) snippet.defaultLanguage = v.snippet.defaultLanguage;
  if (v.snippet.defaultAudioLanguage) snippet.defaultAudioLanguage = v.snippet.defaultAudioLanguage;
  return snippet;
}

async function updateVideoSnippet(v) {
  const snippet = buildFilledSnippet(v);
  await apiJson(ytUrl('videos', { part: 'snippet' }), {
    method: 'PUT', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ id: v.id, snippet }),
  });
  v.snippet = { ...v.snippet, ...snippet };
}

async function fillMissingMetadata(videoId, button) {
  const v = state.videos.find(x => x.id === videoId);
  if (!v) return;
  const old = button.textContent;
  button.disabled = true; button.textContent = 'Updating…';
  try {
    await updateVideoSnippet(v);
    renderVideoAudit();
    renderGrowthPlan();
  } catch (err) {
    alert(`YouTube could not update this video.\n\n${err.message || err}`);
  } finally {
    button.disabled = false; button.textContent = old;
  }
}

els.autoFixMetadata.addEventListener('click', async () => {
  const targets = state.videos.filter(v => metadataHealth(v).score < 60);
  if (!targets.length) return alert('No recent videos need the conservative metadata fill.');
  if (!confirm(`Auto-fill missing metadata on ${targets.length} recent video${targets.length === 1 ? '' : 's'}? Existing titles are preserved.`)) return;
  const old = els.autoFixMetadata.textContent;
  els.autoFixMetadata.disabled = true;
  let done = 0;
  const failures = [];
  try {
    for (const v of targets) {
      els.autoFixMetadata.textContent = `Updating ${done + 1}/${targets.length}`;
      try { await updateVideoSnippet(v); done++; } catch (err) { failures.push(`${v.snippet.title}: ${err.message || err}`); }
    }
    renderVideoAudit();
    renderGrowthPlan();
    alert(`Finished. Updated ${done} video${done === 1 ? '' : 's'}${failures.length ? `; ${failures.length} could not be updated.` : '.'}`);
  } finally {
    els.autoFixMetadata.textContent = old;
    els.autoFixMetadata.disabled = false;
  }
});

async function applyChannelDescriptionValue(description) {
  if (!state.channel || !description) return;
  const currentChannelBranding = state.channel.brandingSettings?.channel || {};
  const preservedChannelBranding = {};
  for (const key of ['country','defaultLanguage','keywords','trackingAnalyticsAccountId','unsubscribedTrailer']) {
    if (currentChannelBranding[key] !== undefined) preservedChannelBranding[key] = currentChannelBranding[key];
  }
  preservedChannelBranding.description = description.slice(0, 1000);
  const brandingSettings = { channel: preservedChannelBranding };
  await apiJson(ytUrl('channels', { part: 'brandingSettings' }), {
    method: 'PUT', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ id: state.channel.id, brandingSettings }),
  });
  state.channel.brandingSettings = { ...(state.channel.brandingSettings || {}), channel: { ...currentChannelBranding, description: preservedChannelBranding.description } };
  els.channelDescription.value = preservedChannelBranding.description;
}

async function autoOptimizeConnectedChannel() {
  if (!state.channel) return;
  const button = els.autoOptimizeChannel;
  const old = button?.textContent || 'Auto-optimize channel';
  if (button) { button.disabled = true; button.textContent = 'Optimizing…'; }
  let updated = 0;
  const failures = [];
  try {
    const targets = state.videos.filter(v => metadataHealth(v).score < 60);
    for (let i = 0; i < targets.length; i++) {
      if (button) button.textContent = `Metadata ${i + 1}/${targets.length}`;
      try { await updateVideoSnippet(targets[i]); updated++; } catch (err) { failures.push(err.message || String(err)); }
    }
    const existingDescription = (state.channel.brandingSettings?.channel?.description || state.channel.snippet?.description || '').trim();
    if (existingDescription.length < 80) {
      const topics = channelTopics();
      const title = state.channel.snippet.title;
      const topicLine = topics.length ? topics.slice(0, 5).join(', ') : 'videos, Shorts and new uploads';
      const draft = `${title} shares ${topicLine}.\n\nSubscribe for new videos and Shorts. Explore the channel for the latest uploads from ${title}.`;
      try { await applyChannelDescriptionValue(draft); } catch (err) { failures.push(err.message || String(err)); }
    }
    renderVideoAudit();
    renderGrowthPlan();
    renderChannelSnapshot();
    setNotice(els.connection, `Channel optimization finished. ${updated} incomplete video${updated === 1 ? '' : 's'} updated${failures.length ? `; ${failures.length} item${failures.length === 1 ? '' : 's'} could not be changed.` : '.'}`, failures.length ? 'subtle' : 'good');
  } finally {
    if (button) { button.textContent = old; button.disabled = false; }
  }
}

if (els.autoOptimizeChannel) els.autoOptimizeChannel.addEventListener('click', autoOptimizeConnectedChannel);

els.generateDescription.addEventListener('click', () => {
  if (!state.channel) return;
  const topics = channelTopics();
  const title = state.channel.snippet.title;
  const topicLine = topics.length ? topics.slice(0, 5).join(', ') : 'videos, Shorts and new uploads';
  els.channelDescription.value = `${title} shares ${topicLine}.\n\nSubscribe for new videos and Shorts. Explore the channel to find the latest uploads and more from ${title}.`;
});

els.applyDescription.addEventListener('click', async () => {
  if (!state.channel) return;
  const description = els.channelDescription.value.trim();
  if (!description) return alert('Enter a channel description first.');
  if (!confirm('Apply this channel description to your YouTube channel?')) return;
  els.applyDescription.disabled = true;
  try {
    await applyChannelDescriptionValue(description);
    alert('Channel description updated.');
  } catch (err) {
    alert(`YouTube could not update the channel description.\n\n${err.message || err}`);
  } finally {
    els.applyDescription.disabled = false;
  }
});

function refreshFinderAvailability() {
  if (state.accessToken || state.settings.apiKey) setNotice(els.ccStatus, 'Ready. Results are filtered to YouTube Creative Commons videos.', 'good');
  else setNotice(els.ccStatus, 'Connect YouTube or add an API key in Setup to search.', 'subtle');
}

els.ccButton.addEventListener('click', searchCreativeCommons);
els.ccQuery.addEventListener('keydown', e => { if (e.key === 'Enter') searchCreativeCommons(); });

async function searchCreativeCommons() {
  const q = els.ccQuery.value.trim();
  if (!q) return setNotice(els.ccStatus, 'Type a topic to search.', 'bad');
  if (!state.accessToken && !state.settings.apiKey) return setNotice(els.ccStatus, 'Connect YouTube or add an API key in Setup first.', 'bad');
  els.ccButton.disabled = true;
  els.ccButton.innerHTML = '<span class="spinner"></span>Searching';
  try {
    const params = {
      part: 'snippet', type: 'video', q, maxResults: 12, order: 'relevance', videoLicense: 'creativeCommon', videoEmbeddable: 'true', videoSyndicated: 'true', safeSearch: 'moderate',
    };
    if (!state.accessToken && state.settings.apiKey) params.key = state.settings.apiKey;
    const finderToken = state.accessToken ? await ensureToken() : '';
    const headers = finderToken ? { Authorization: `Bearer ${finderToken}` } : {};
    const response = await fetch(ytUrl('search', params), { headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || `${response.status} ${response.statusText}`);
    const ids = (data.items || []).map(x => x.id?.videoId).filter(Boolean);
    let details = [];
    if (ids.length) {
      const detailParams = { part: 'snippet,status,contentDetails', id: ids.join(',') };
      if (!state.accessToken && state.settings.apiKey) detailParams.key = state.settings.apiKey;
      const detailRes = await fetch(ytUrl('videos', detailParams), { headers });
      const detailData = await detailRes.json();
      if (!detailRes.ok) throw new Error(detailData?.error?.message || 'Could not verify video licenses.');
      details = detailData.items || [];
    }
    renderCreativeCommons(details.filter(v => v.status?.license === 'creativeCommon'));
    setNotice(els.ccStatus, `Found ${details.filter(v => v.status?.license === 'creativeCommon').length} Creative Commons results. Always review attribution and usage rights before publishing.`, 'good');
  } catch (err) {
    console.error(err);
    setNotice(els.ccStatus, err.message || String(err), 'bad');
  } finally {
    els.ccButton.disabled = false;
    els.ccButton.textContent = 'Find Creative Commons videos';
  }
}

function renderCreativeCommons(items) {
  if (!items.length) {
    els.ccResults.innerHTML = '<div class="notice subtle">No Creative Commons results found for that search.</div>';
    return;
  }
  els.ccResults.innerHTML = items.map(v => {
    const thumb = v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url || '';
    const link = `https://www.youtube.com/watch?v=${v.id}`;
    const attribution = `“${v.snippet.title}” by ${v.snippet.channelTitle}, marked Creative Commons on YouTube: ${link}`;
    return `<article class="video-result">
      ${thumb ? `<img src="${esc(thumb)}" alt="" loading="lazy" />` : ''}
      <div class="result-body"><h3>${esc(v.snippet.title)}</h3><p>${esc(v.snippet.channelTitle)} • ${durationFmt(parseIsoDuration(v.contentDetails?.duration))}</p>
      <div class="result-actions"><a href="${esc(link)}" target="_blank" rel="noopener">Open on YouTube</a><button data-attribution="${encodeURIComponent(attribution)}">Copy attribution</button></div></div>
    </article>`;
  }).join('');
  els.ccResults.querySelectorAll('[data-attribution]').forEach(btn => btn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(decodeURIComponent(btn.dataset.attribution));
    const old = btn.textContent; btn.textContent = 'Copied'; setTimeout(() => btn.textContent = old, 1200);
  }));
}

function commonsFilePageUrl(title) {
  return `https://commons.wikimedia.org/wiki/${encodeURIComponent(String(title || '').replace(/ /g, '_')).replace(/%2F/g, '/')}`;
}

function commonsMetaValue(meta, key) {
  return stripHtml(meta?.[key]?.value || '');
}

function commonsAttribution(page) {
  const info = page.imageinfo?.[0] || {};
  const meta = info.extmetadata || {};
  const title = String(page.title || 'Wikimedia Commons video').replace(/^File:/i, '');
  const creator = commonsMetaValue(meta, 'Artist') || commonsMetaValue(meta, 'Credit') || 'Wikimedia Commons contributor';
  const license = commonsMetaValue(meta, 'LicenseShortName') || commonsMetaValue(meta, 'UsageTerms') || 'See source page for licence';
  const licenseUrl = commonsMetaValue(meta, 'LicenseUrl');
  const sourceUrl = commonsFilePageUrl(page.title);
  return {
    title,
    creator,
    license,
    licenseUrl,
    sourceUrl,
    fileUrl: info.url || '',
    thumbUrl: info.thumburl || '',
    mime: info.mime || 'video/webm',
    size: Number(info.size || 0),
    provider: 'Wikimedia Commons',
    attribution: `“${title}” — ${creator}. Source: Wikimedia Commons. Licence: ${license}${licenseUrl ? ` (${licenseUrl})` : ''}. ${sourceUrl}`,
  };
}

async function searchCommonsDownloadable(query, limit = 12) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  const params = {
    action: 'query',
    generator: 'search',
    gsrsearch: `${query} filetype:video filesize:<81920`,
    gsrnamespace: '6',
    gsrlimit: String(Math.max(1, Math.min(20, limit))),
    prop: 'imageinfo',
    iiprop: 'url|size|mime|mediatype|extmetadata',
    iiurlwidth: '640',
    format: 'json',
    formatversion: '2',
    origin: '*',
  };
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v));
  const response = await fetch(url.toString(), { mode: 'cors', cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) throw new Error(data?.error?.info || `Wikimedia search failed (${response.status}).`);
  const pages = data?.query?.pages || [];
  return pages
    .filter(page => page.imageinfo?.[0]?.url && String(page.imageinfo?.[0]?.mime || '').startsWith('video/'))
    .map(commonsAttribution)
    .filter(item => {
      if (!item.fileUrl || (item.size && item.size > 80 * 1024 * 1024)) return false;
      const license = String(item.license || '').toLowerCase();
      const simpleReuse = license.includes('public domain') || license.includes('cc0') ||
        ((license.includes('cc by') || license.includes('creative commons attribution')) && !license.includes('by-sa') && !license.includes('share alike'));
      return simpleReuse;
    });
}

function renderCommonsResults(items) {
  if (!els.commonsResults) return;
  if (!items.length) {
    els.commonsResults.innerHTML = '<div class="notice subtle">No manageable open-licensed videos were found for that topic. Try a broader search.</div>';
    return;
  }
  window.__clipfreeCommonsResults = items;
  els.commonsResults.innerHTML = items.map((item, index) => `
    <article class="video-result">
      ${item.thumbUrl ? `<img src="${esc(item.thumbUrl)}" alt="" loading="lazy" />` : ''}
      <div class="result-body">
        <h3>${esc(item.title)}</h3>
        <p>${esc(item.creator)} • ${esc(item.license)}${item.size ? ` • ${(item.size / 1024 / 1024).toFixed(1)} MB` : ''}</p>
        <div class="result-actions">
          <button data-commons-use="${index}">Use + FULL AUTO</button>
          <a href="${esc(item.sourceUrl)}" target="_blank" rel="noopener">Open source</a>
        </div>
      </div>
    </article>`).join('');
  els.commonsResults.querySelectorAll('[data-commons-use]').forEach(btn => btn.addEventListener('click', async () => {
    const item = window.__clipfreeCommonsResults?.[Number(btn.dataset.commonsUse)];
    if (item) await useCommonsVideo(item);
  }));
}

async function ensureFullAutoConnection() {
  setAutoStatus('Connecting YouTube', 3, 'Checking your YouTube connection…');
  await ensureToken();
  if (!state.channel) await refreshAllChannelData();
}

function chooseAutoCategory(source = null) {
  const text = `${source?.title || ''} ${source?.attribution || ''} ${els.autoTopic?.value || ''}`.toLowerCase();
  if (/animal|wildlife|lion|tiger|elephant|bird|pet|dog|cat|nature/.test(text) && [...els.uploadCategory.options].some(o => o.value === '15')) return '15';
  return '22';
}

async function ensureAutoPlaylist() {
  if (!state.channel) return '';
  let playlist = state.playlists.find(p => /shorts?/i.test(p.snippet?.title || ''));
  if (playlist) return playlist.id;
  const base = (state.channel.snippet?.title || 'Channel').replace(/\b(tv|official|channel)\b/gi, ' ').replace(/\s+/g, ' ').trim() || 'Channel';
  const title = `${base} Shorts`.slice(0, 150);
  const created = await apiJson(ytUrl('playlists', { part: 'snippet,status' }), {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({
      snippet: { title, description: `Short-form videos from ${state.channel.snippet?.title || base}.` },
      status: { privacyStatus: 'public' },
    }),
  });
  if (created?.id) {
    state.playlists.unshift(created);
    renderPlaylistOptions();
    return created.id;
  }
  return '';
}

async function downloadCommonsFile(item) {
  setAutoStatus('Downloading free source', 10, `Downloading “${item.title}” from Wikimedia Commons…`);
  const response = await fetch(item.fileUrl, { mode: 'cors' });
  if (!response.ok) throw new Error(`Could not download the Commons video (${response.status}).`);
  const blob = await response.blob();
  if (blob.size > 90 * 1024 * 1024) throw new Error('This source video is too large for reliable phone processing. Choose a smaller result.');
  const raw = item.title || 'commons-video.webm';
  const ext = raw.match(/\.([a-z0-9]{2,5})$/i)?.[1] || (item.mime.includes('mp4') ? 'mp4' : item.mime.includes('ogg') ? 'ogv' : 'webm');
  const base = raw.replace(/\.[^.]+$/, '').replace(/[^a-z0-9 _.-]+/gi, '').trim().slice(0, 90) || 'commons-video';
  return new File([blob], `${base}.${ext}`, { type: item.mime || blob.type || 'video/webm' });
}

async function startFullAutoWithFile(file, source = null) {
  if (!file) throw new Error('No video file was selected.');
  if (!window.ClipFreeAutomation?.loadVideoFile) throw new Error('ClipFree video engine has not loaded yet. Refresh the page and try again.');
  await ensureFullAutoConnection();
  state.autoUploadQueued = true;
  state.autoSource = source;
  els.uploadPrivacy.value = 'private';
  els.uploadMadeForKids.value = 'false';
  els.uploadCaptions.checked = true;
  if (els.uploadThumbnail) els.uploadThumbnail.checked = true;
  els.notifySubscribers.checked = false;
  els.uploadCategory.value = chooseAutoCategory(source);
  setAutoStatus('AI processing', 20, 'Transcribing, finding the strongest moment, creating a 9:16 Short, captions, thumbnail and YouTube SEO. Keep this tab open.', 'good');
  await window.ClipFreeAutomation.loadVideoFile(file, source, true);
  document.querySelector('#studio')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function useCommonsVideo(item) {
  try {
    const file = await downloadCommonsFile(item);
    await startFullAutoWithFile(file, item);
  } catch (err) {
    console.error(err);
    state.autoUploadQueued = false;
    setAutoStatus('FULL AUTO stopped', 0, err.message || String(err), 'bad');
  }
}

if (els.autoFind) els.autoFind.addEventListener('click', async () => {
  const topic = (els.autoTopic?.value || '').trim() || suggestAutoTopic();
  if (els.autoTopic && !els.autoTopic.value.trim()) els.autoTopic.value = topic;
  els.autoFind.disabled = true;
  try {
    setAutoStatus('Finding free video', 5, `Searching Wikimedia Commons for “${topic}”…`);
    setNotice(els.autoFinderStatus, 'Searching open-licensed downloadable videos…');
    const items = await searchCommonsDownloadable(topic, 12);
    renderCommonsResults(items);
    if (!items.length) throw new Error('No suitable open-licensed video was found. Try another topic.');
    setNotice(els.autoFinderStatus, `Found ${items.length} open-licensed downloadable video${items.length === 1 ? '' : 's'}. FULL AUTO is using the first suitable result.`, 'good');
    await useCommonsVideo(items[0]);
  } catch (err) {
    console.error(err);
    state.autoUploadQueued = false;
    setNotice(els.autoFinderStatus, err.message || String(err), 'bad');
    setAutoStatus('FULL AUTO stopped', 0, err.message || String(err), 'bad');
  } finally {
    els.autoFind.disabled = false;
  }
});

if (els.autoLocalFile) els.autoLocalFile.addEventListener('change', async () => {
  const file = els.autoLocalFile.files?.[0];
  if (!file) return;
  state.autoLocalSelected = file;
  els.autoLocalFileLabel.textContent = `${file.name} — starting automatically…`;
  els.autoStartLocal.disabled = false;
  try { await startFullAutoWithFile(file, null); }
  catch (err) { console.error(err); setAutoStatus('FULL AUTO stopped', 0, err.message || String(err), 'bad'); }
});

if (els.autoStartLocal) els.autoStartLocal.addEventListener('click', async () => {
  if (!state.autoLocalSelected) return;
  try { await startFullAutoWithFile(state.autoLocalSelected, null); }
  catch (err) { console.error(err); setAutoStatus('FULL AUTO stopped', 0, err.message || String(err), 'bad'); }
});

window.addEventListener('clipfree-export-ready', async (event) => {
  state.generatedExport = event.detail || window.ClipFreeExport;
  state.uploadFile = state.generatedExport?.blob || null;
  prefillUploadFromExport();
  renderPlaylistOptions();
  refreshUploadState();

  if (!state.autoUploadQueued) return;
  try {
    setAutoStatus('Preparing YouTube upload', 76, 'Clip created. Preparing captions, thumbnail, attribution and Shorts playlist…', 'good');
    const playlistId = await ensureAutoPlaylist().catch(err => { console.warn('Playlist setup failed', err); return ''; });
    renderPlaylistOptions();
    if (playlistId) els.uploadPlaylist.value = playlistId;
    els.uploadPrivacy.value = 'private';
    els.uploadCaptions.checked = true;
    if (els.uploadThumbnail) els.uploadThumbnail.checked = true;
    setAutoStatus('Uploading to YouTube', 80, 'Uploading the finished Short to your channel. New/unverified API projects may force it to Private.', 'good');
    const result = await uploadToYouTube({ rethrow: true });
    state.autoUploadQueued = false;
    const link = result?.id ? `https://www.youtube.com/watch?v=${result.id}` : '';
    setAutoStatus('FULL AUTO complete', 100, `Finished: clip, captions, thumbnail, SEO, attribution, upload${playlistId ? ' and playlist' : ''}.${link ? ' The video is now on your YouTube channel.' : ''}`, 'good');
  } catch (err) {
    console.error(err);
    state.autoUploadQueued = false;
    setAutoStatus('Upload needs attention', 75, err.message || String(err), 'bad');
  }
});

function prefillUploadFromExport() {
  const x = state.generatedExport;
  if (!x) return;
  els.uploadFileLabel.textContent = x.filename || 'Generated ClipFree clip';
  els.uploadTitle.value = x.title || els.uploadTitle.value;
  els.uploadDescription.value = x.description || els.uploadDescription.value;
  els.uploadTags.value = x.tags || els.uploadTags.value;
  setNotice(els.uploadReady, `Generated clip ready: ${x.filename || 'video.mp4'}`, 'good');
}

els.uploadFile.addEventListener('change', () => {
  const file = els.uploadFile.files?.[0];
  if (!file) return;
  state.uploadFile = file;
  els.uploadFileLabel.textContent = file.name;
  setNotice(els.uploadReady, `Selected ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB).`, 'good');
  refreshUploadState();
});

function refreshUploadState(preserveStatus = false) {
  const connected = Boolean(state.accessToken);
  const fileReady = Boolean(state.uploadFile || state.generatedExport?.blob || window.ClipFreeExport?.blob);
  els.uploadButton.disabled = !(connected && fileReady);
  if (!preserveStatus) {
    if (!connected) setNotice(els.uploadStatus, 'Connect YouTube before uploading.', 'subtle');
    else if (!fileReady) setNotice(els.uploadStatus, 'YouTube connected. Export a ClipFree video or choose a video file.', 'subtle');
    else setNotice(els.uploadStatus, 'Ready to upload. Private is recommended for the first test.', 'good');
  }
}

els.uploadButton.addEventListener('click', () => uploadToYouTube());

function multipartBlob(metadata, mediaBlob, mediaType, boundary) {
  return new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
    JSON.stringify(metadata),
    `\r\n--${boundary}\r\nContent-Type: ${mediaType || 'application/octet-stream'}\r\n\r\n`,
    mediaBlob,
    `\r\n--${boundary}--\r\n`,
  ], { type: `multipart/related; boundary=${boundary}` });
}

async function xhrUpload(url, body, token, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Content-Type', body.type);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      let data = {}; try { data = JSON.parse(xhr.responseText || '{}'); } catch { data = { raw: xhr.responseText }; }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data?.error?.message || data?.raw || `${xhr.status} ${xhr.statusText}`));
    };
    xhr.onerror = () => reject(new Error('Network error while uploading to YouTube.'));
    xhr.send(body);
  });
}

async function uploadToYouTube(options = {}) {
  const media = state.uploadFile || state.generatedExport?.blob || window.ClipFreeExport?.blob;
  if (!media) return alert('Choose or generate a video first.');
  const title = els.uploadTitle.value.trim();
  if (!title) return alert('Enter a YouTube title first.');
  const description = els.uploadDescription.value.trim();
  const tags = limitTagList(els.uploadTags.value.split(',').map(x => x.trim()).filter(Boolean));
  els.uploadButton.disabled = true;
  els.uploadProgress.style.width = '2%';
  setNotice(els.uploadStatus, 'Preparing YouTube upload…');
  try {
    const token = await ensureToken();
    const metadata = {
      snippet: { title: title.slice(0,100), description, categoryId: els.uploadCategory.value },
      status: { privacyStatus: els.uploadPrivacy.value, selfDeclaredMadeForKids: els.uploadMadeForKids.value === 'true' },
    };
    if (tags.length) metadata.snippet.tags = tags;
    const boundary = `clipfree_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const videoBlob = media instanceof Blob ? media : new Blob([media], { type: 'video/mp4' });
    const body = multipartBlob(metadata, videoBlob, videoBlob.type || 'video/mp4', boundary);
    const url = new URL('https://www.googleapis.com/upload/youtube/v3/videos');
    url.searchParams.set('uploadType', 'multipart');
    url.searchParams.set('part', 'snippet,status');
    url.searchParams.set('notifySubscribers', els.notifySubscribers.checked ? 'true' : 'false');
    const result = await xhrUpload(url.toString(), body, token, p => {
      els.uploadProgress.style.width = `${Math.max(2, Math.min(95, Math.round(p * 95)))}%`;
      setNotice(els.uploadStatus, `Uploading to YouTube… ${Math.round(p * 100)}%`);
      if (state.autoUploadQueued) setAutoStatus('Uploading to YouTube', 80 + Math.round(p * 18), `Upload ${Math.round(p * 100)}% complete…`, 'good');
    });
    els.uploadProgress.style.width = '96%';
    if (els.uploadCaptions.checked) {
      const srt = state.generatedExport?.srt || window.ClipFreeExport?.srt || '';
      if (srt && result.id) {
        setNotice(els.uploadStatus, 'Video uploaded. Adding captions…');
        await uploadCaption(result.id, srt, token).catch(err => console.warn('Caption upload failed', err));
      }
    }
    if (els.uploadThumbnail?.checked) {
      const thumb = state.generatedExport?.thumbnailBlob || window.ClipFreeExport?.thumbnailBlob || null;
      if (thumb && result.id) {
        setNotice(els.uploadStatus, 'Adding automatic thumbnail…');
        await uploadThumbnail(result.id, thumb, token).catch(err => console.warn('Thumbnail upload failed', err));
      }
    }
    if (els.uploadPlaylist?.value && result.id) {
      setNotice(els.uploadStatus, 'Adding video to playlist…');
      await addVideoToPlaylist(result.id, els.uploadPlaylist.value).catch(err => console.warn('Playlist add failed', err));
    }
    els.uploadProgress.style.width = '100%';
    const watchLink = `https://www.youtube.com/watch?v=${result.id}`;
    els.uploadStatus.className = 'notice good';
    els.uploadStatus.innerHTML = `Upload complete. <a href="${esc(watchLink)}" target="_blank" rel="noopener">Open the video on YouTube</a>. New/unverified API projects may force uploads to Private.`;
    setTimeout(() => refreshAllChannelData().catch(console.warn), 1500);
    return result;
  } catch (err) {
    console.error(err);
    els.uploadProgress.style.width = '0%';
    setNotice(els.uploadStatus, err.message || String(err), 'bad');
    if (options?.rethrow) throw err;
    return null;
  } finally {
    refreshUploadState(true);
  }
}

async function uploadCaption(videoId, srt, token) {
  const metadata = { snippet: { videoId, language: 'en', name: 'ClipFree AI captions', isDraft: false } };
  const boundary = `caption_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const body = multipartBlob(metadata, new Blob([srt], { type:'application/x-subrip' }), 'application/x-subrip', boundary);
  const url = new URL('https://www.googleapis.com/upload/youtube/v3/captions');
  url.searchParams.set('uploadType', 'multipart');
  url.searchParams.set('part', 'snippet');
  const response = await fetch(url.toString(), {
    method:'POST', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':body.type }, body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || 'Caption upload failed.');
  return data;
}

async function uploadThumbnail(videoId, thumbnailBlob, token) {
  const url = new URL('https://www.googleapis.com/upload/youtube/v3/thumbnails/set');
  url.searchParams.set('videoId', videoId);
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': thumbnailBlob.type || 'image/jpeg' },
    body: thumbnailBlob,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || 'Thumbnail upload failed.');
  return data;
}

async function addVideoToPlaylist(videoId, playlistId) {
  return apiJson(ytUrl('playlistItems', { part: 'snippet' }), {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ snippet: { playlistId, resourceId: { kind: 'youtube#video', videoId } } }),
  });
}

window.ClipFreeYouTube = {
  connectYoutube,
  refreshAllChannelData,
  autoOptimizeConnectedChannel,
  searchCommonsDownloadable,
  startFullAutoWithFile,
  uploadToYouTube,
};

loadSettings();
refreshFinderAvailability();
refreshUploadState();
if (window.ClipFreeExport) {
  state.generatedExport = window.ClipFreeExport;
  state.uploadFile = window.ClipFreeExport.blob;
  prefillUploadFromExport();
  refreshUploadState();
}
