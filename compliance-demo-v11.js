/* ClipFree AI — YouTube API Compliance Recording Mode v11
   Real-data recording helper. It does not fake analytics, sources, metadata or uploads.
*/
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const qs = new URLSearchParams(location.search);
  const auditMode = qs.get('audit') === '1' || qs.get('compliance') === '1';
  if (auditMode) window.CLIPFREE_COMPLIANCE_RECORDING_MODE = true;

  let lastExport = null;
  let lastUpload = null;

  function esc(value='') {
    return String(value).replace(/[&<>"']/g, ch => (
      {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]
    ));
  }

  function sourceSummary(detail) {
    const source = detail?.source || detail || {};
    const list = Array.isArray(source.sources) ? source.sources : [];
    const first = list[0] || {};
    return {
      title: first.title || source.title || 'Waiting for a generated Short',
      creator: first.creator || '',
      license: first.license || source.license || 'Waiting for source',
      url: first.sourceUrl || source.sourceUrl || '',
      attribution: source.attribution || detail?.attribution || ''
    };
  }

  function snapshot() {
    try {
      return window.ClipFreeYouTube?.getComplianceSnapshot?.() || {};
    } catch {
      return {};
    }
  }

  function render() {
    const panel = $('clipfreeCompliancePanel');
    if (!panel) return;

    const snap = snapshot();
    const src = sourceSummary(lastExport || window.ClipFreeExport || {});
    const detail = lastExport || window.ClipFreeExport || {};
    const upload = snap.lastUpload || lastUpload || {};
    const limit = snap.uploadLimit || {};

    const connected = snap.connected
      ? `✅ Connected to ${esc(snap.channelTitle || 'YouTube channel')}`
      : '⚠️ YouTube is not connected yet';

    const analytics = snap.connected
      ? `Views ${esc(snap.analytics?.views || '—')} • Watch time ${esc(snap.analytics?.watchHours || '—')} • Avg view ${esc(snap.analytics?.averageViewDuration || '—')} • Net subs ${esc(snap.analytics?.netSubscribers || '—')}`
      : 'Connect YouTube, then press Refresh YouTube + Analytics.';

    const limitText = limit.active
      ? `⚠️ Known daily upload-limit cooldown until about ${esc(limit.untilText)}`
      : '✅ No remembered upload-limit cooldown';

    const videoLink = upload.videoId
      ? `https://www.youtube.com/watch?v=${encodeURIComponent(upload.videoId)}`
      : '';

    panel.querySelector('[data-audit-connection]').innerHTML = connected;
    panel.querySelector('[data-audit-analytics]').textContent = analytics;
    panel.querySelector('[data-audit-limit]').textContent = limitText;

    panel.querySelector('[data-audit-source]').innerHTML = `
      <strong>${esc(src.title)}</strong><br>
      ${src.creator ? `Creator: ${esc(src.creator)}<br>` : ''}
      Rights: ${esc(src.license || '—')}<br>
      ${src.url ? `<span class="audit-wrap">${esc(src.url)}</span>` : 'Source URL will appear after creation.'}
    `;

    panel.querySelector('[data-audit-meta]').innerHTML = `
      <strong>Title:</strong> ${esc(detail.title || $('uploadTitle')?.value || 'Waiting for metadata')}<br>
      <strong>Description:</strong> ${esc((detail.description || $('uploadDescription')?.value || '—').slice(0,260))}<br>
      <strong>Tags:</strong> ${esc(detail.tags || $('uploadTags')?.value || '—')}<br>
      <strong>Hashtags:</strong> ${esc(detail.hashtags || $('seoHashtags')?.value || '—')}
    `;

    const generatedSource = detail?.source || detail || {};
    const generatedCaptions = Array.isArray(detail?.captions)
      ? detail.captions
      : Array.isArray(generatedSource?.captions) ? generatedSource.captions : [];
    const originalVoice = Boolean(
      detail?.originalVoiceover ||
      generatedSource?.originalVoiceover ||
      detail?.audioType === 'original-ai-voiceover' ||
      generatedSource?.audioType === 'original-ai-voiceover'
    );
    const thumbReady = Boolean(detail?.thumbnailBlob || window.ClipFreeExport?.thumbnailBlob);
    const duration = Number(detail?.targetDuration || generatedSource?.targetDuration || $('simpleDuration')?.value || 0);
    panel.querySelector('[data-audit-generated]').innerHTML = `
      <strong>Duration:</strong> ${duration ? `${esc(duration)} seconds` : 'Waiting'}<br>
      <strong>9:16 video:</strong> ${detail?.blob ? '✅ Rendered' : 'Waiting'}<br>
      <strong>Original AI voiceover:</strong> ${originalVoice ? '✅ Included' : 'Waiting'}<br>
      <strong>Captions:</strong> ${generatedCaptions.length ? `✅ ${generatedCaptions.length} generated` : 'Waiting'}<br>
      <strong>Thumbnail/cover:</strong> ${thumbReady ? '✅ Generated' : 'Waiting'}
    `;

    panel.querySelector('[data-audit-upload]').innerHTML = upload.videoId
      ? `✅ Real YouTube video ID: <strong>${esc(upload.videoId)}</strong><br>
         Requested visibility: ${esc(upload.requestedPrivacy || '—')} •
         Actual visibility: ${esc(upload.actualPrivacy || 'processing')} •
         Processing: ${esc(upload.processingStatus || 'pending')}
         ${videoLink ? `<br><a href="${videoLink}" target="_blank" rel="noopener">Open uploaded video</a>` : ''}`
      : 'Waiting for the real YouTube upload result.';

    const status = panel.querySelector('[data-audit-ready]');
    if (snap.connected && detail.title && src.url && upload.videoId) {
      status.textContent = '✅ Full recording evidence captured: connection + analytics + source + metadata + YouTube video ID.';
      status.className = 'audit-ready good';
    } else {
      status.textContent = 'Recording checklist is not complete yet. Work through the steps below.';
      status.className = 'audit-ready';
    }
  }

  async function refreshYoutube() {
    const button = $('auditRefresh');
    if (button) button.disabled = true;
    try {
      if (!window.ClipFreeYouTube?.isConnected?.()) {
        await window.ClipFreeYouTube?.connectYoutube?.();
      }
      await window.ClipFreeYouTube?.refreshAllChannelData?.();
    } catch (err) {
      const box = $('clipfreeCompliancePanel')?.querySelector('[data-audit-ready]');
      if (box) box.textContent = `YouTube refresh needs attention: ${err?.message || err}`;
    } finally {
      if (button) button.disabled = false;
      render();
    }
  }

  function prepareOneShort() {
    const set = (id, value) => {
      const el = $(id);
      if (!el) return;
      el.value = String(value);
      el.dispatchEvent(new Event('change', {bubbles:true}));
      el.dispatchEvent(new Event('input', {bubbles:true}));
    };

    set('simpleTopic', 'lions');
    set('simpleCount', 1);
    set('simpleDuration', 10);
    set('simplePrivacy', 'private');
    window.CLIPFREE_COMPLIANCE_EXACT_ANIMAL = 'lion';

    const rights = $('simpleRights');
    if (rights) rights.checked = false;

    $('simpleRights')?.scrollIntoView({behavior:'smooth',block:'center'});
    render();
  }

  function buildPanel() {
    if ($('clipfreeCompliancePanel')) return;

    const style = document.createElement('style');
    style.id = 'clipfreeComplianceCssV9';
    style.textContent = `
      #clipfreeCompliancePanel{max-width:820px;margin:16px auto 22px;padding:18px;border:1px solid #6756c7;border-radius:18px;background:#10101a;color:#f5f3ff;font:14px/1.45 system-ui,sans-serif}
      #clipfreeCompliancePanel h2{margin:0 0 6px;font-size:1.25rem}
      #clipfreeCompliancePanel p{color:#c8c3dc}
      .audit-grid{display:grid;gap:10px}
      .audit-card{padding:12px;border:1px solid #2e2a43;border-radius:12px;background:#171622}
      .audit-card small{display:block;color:#9f97c2;margin-bottom:5px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}
      .audit-actions{display:flex;flex-wrap:wrap;gap:9px;margin:12px 0}
      .audit-actions button,.audit-actions a{border:0;border-radius:10px;padding:10px 12px;background:#6f49ff;color:white;font-weight:800;text-decoration:none}
      .audit-actions a{background:#26213d}
      .audit-ready{padding:10px;border-radius:10px;background:#261e32;color:#ffd3e0;margin:12px 0}
      .audit-ready.good{background:#153124;color:#bdf4d2}
      .audit-wrap{overflow-wrap:anywhere}
      .audit-checklist{margin:8px 0 0;padding-left:20px;color:#ddd7ef}
      body.clipfree-simple-mode #clipfreeCompliancePanel{display:block!important}
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'clipfreeCompliancePanel';
    panel.innerHTML = `
      <h2>🎥 YouTube API Compliance Recording Mode</h2>
      <p>This panel shows <strong>real</strong> data from the connected API workflow. It does not fake analytics, media sources, metadata or upload IDs.</p>

      <div class="audit-actions">
        <button id="auditRefresh" type="button">1. Refresh YouTube + Analytics</button>
        <button id="auditPrepare" type="button">2. Set up 1 Private 10-second Short</button>
        <a href="https://studio.youtube.com/" target="_blank" rel="noopener">Open YouTube Studio</a>
      </div>

      <div data-audit-ready class="audit-ready">Preparing recording checks…</div>

      <div class="audit-grid">
        <div class="audit-card"><small>API Client / Connection</small>
          <div><strong>ClipFree AI • coreyvibe.org</strong><br>Google Cloud project: bebo-472207<br>Scopes used: youtube.force-ssl + yt-analytics.readonly</div>
          <div data-audit-connection style="margin-top:7px"></div>
          <div data-audit-limit style="margin-top:4px;color:#ffd58a"></div>
        </div>

        <div class="audit-card"><small>YouTube Analytics — real authorized data</small>
          <div data-audit-analytics>Waiting for YouTube refresh.</div>
        </div>

        <div class="audit-card"><small>Reusable Media / Rights Source</small>
          <div data-audit-source>Waiting for a generated Short.</div>
        </div>

        <div class="audit-card"><small>Generated Short / Audio / Captions / Cover</small>
          <div data-audit-generated>Waiting for the Short to be created.</div>
        </div>

        <div class="audit-card"><small>Generated Metadata</small>
          <div data-audit-meta>Waiting for metadata.</div>
        </div>

        <div class="audit-card"><small>YouTube Upload Proof</small>
          <div data-audit-upload>Waiting for upload.</div>
        </div>
      </div>

      <strong style="display:block;margin-top:14px">Record these steps in one take:</strong>
      <ol class="audit-checklist">
        <li>Show this connection + analytics panel after Refresh.</li>
        <li>Press “Set up 1 Private 10-second Short”.</li>
        <li>Show the source/rights workflow, then manually tick the rights confirmation.</li>
        <li>Create exactly 1 Short and show the generated title/description/tags.</li>
        <li>Wait until this panel shows a real YouTube video ID.</li>
        <li>Open YouTube Studio and show the same uploaded Short.</li>
      </ol>
    `;

    const main = document.querySelector('main') || document.body;
    const studio = $('clipfreeSimpleStudio');
    if (studio?.parentNode === main) main.insertBefore(panel, studio);
    else main.insertBefore(panel, main.firstChild);

    $('auditRefresh')?.addEventListener('click', refreshYoutube);
    $('auditPrepare')?.addEventListener('click', prepareOneShort);

    render();
  }

  window.addEventListener('clipfree-export-ready', event => {
    const detail = event.detail || window.ClipFreeExport;
    if (!detail) return;
    lastExport = detail;
    setTimeout(render, 20);
  }, true);

  window.addEventListener('clipfree-youtube-state', () => setTimeout(render, 30));
  window.addEventListener('clipfree-youtube-upload-transferred', event => {
    lastUpload = {
      ...(lastUpload || {}),
      ...(event.detail || {}),
      processingStatus:'pending'
    };
    setTimeout(render, 20);
  });
  window.addEventListener('clipfree-youtube-upload-confirmed', event => {
    lastUpload = {
      ...(lastUpload || {}),
      ...(event.detail || {}),
      actualPrivacy:event.detail?.privacy || '',
      processingStatus:'succeeded'
    };
    setTimeout(render, 20);
  });
  window.addEventListener('clipfree-youtube-upload-failed', event => {
    lastUpload = {
      ...(lastUpload || {}),
      ...(event.detail || {}),
      processingStatus:'failed'
    };
    setTimeout(render, 20);
  });

  if (auditMode) {
    buildPanel();
    setTimeout(() => {
      prepareOneShort();
      render();
    }, 700);
    setInterval(render, 2500);
  }

  window.ClipFreeComplianceDemo = {
    version:'11.0',
    open() {
      buildPanel();
      document.getElementById('clipfreeCompliancePanel')?.scrollIntoView({behavior:'smooth',block:'start'});
    },
    refresh: render
  };
})();
/* ==========================================================================
   ClipFree AI — Mobile YouTube Connect + Analytics v12
   Adds a separate, non-uploading YouTube connection/analytics control to the
   one-screen mobile studio. Pressing this button NEVER creates/downloads media.
   ========================================================================== */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  let busy = false;

  function metric(id, fallback = '—') {
    const value = $(id)?.textContent?.trim();
    return value || fallback;
  }

  function isConnected() {
    try { return Boolean(window.ClipFreeYouTube?.isConnected?.()); }
    catch { return false; }
  }

  function channelTitle() {
    try { return window.ClipFreeYouTube?.getChannelTitle?.() || 'YouTube'; }
    catch { return 'YouTube'; }
  }

  function renderMobileAnalytics(message = '') {
    const card = $('mobileYoutubeAnalyticsCard');
    if (!card) return;

    const connected = isConnected();
    const button = $('mobileYoutubeAnalyticsButton');
    const state = $('mobileYoutubeAnalyticsState');

    if (button && !busy) {
      button.textContent = connected
        ? '↻ Refresh YouTube + Analytics'
        : '▶ Connect YouTube + Load Analytics';
    }

    const views = metric('metricViews');
    const watch = metric('metricWatchHours');
    const avg = metric('metricAvgDuration');
    const subs = metric('metricNetSubs');

    const map = {
      mobileMetricViews: views,
      mobileMetricWatch: watch,
      mobileMetricAvg: avg,
      mobileMetricSubs: subs
    };
    for (const [id, value] of Object.entries(map)) {
      const el = $(id);
      if (el) el.textContent = value;
    }

    if (state) {
      if (message) {
        state.textContent = message;
        state.className = 'mobile-analytics-state';
      } else if (connected) {
        state.textContent = `✅ Connected to ${channelTitle()}. Analytics shown below are read from the authorized YouTube Analytics API.`;
        state.className = 'mobile-analytics-state good';
      } else {
        state.textContent = 'YouTube is not connected yet. Tap the button above. This does not create or upload a Short.';
        state.className = 'mobile-analytics-state';
      }
    }

    const simpleConnection = $('simpleConnection');
    if (simpleConnection) {
      if (connected) {
        simpleConnection.style.color = '#8ce3aa';
        simpleConnection.innerHTML = `<span class="simple-dot"></span><span>${channelTitle()} connected ✓</span>`;
      } else {
        simpleConnection.style.color = '#ffbc76';
        simpleConnection.innerHTML = '<span class="simple-dot"></span><span>YouTube not connected — use the separate Connect + Analytics button below.</span>';
      }
    }
  }

  async function connectAndRefreshOnly() {
    if (busy) return;
    const button = $('mobileYoutubeAnalyticsButton');
    busy = true;
    if (button) {
      button.disabled = true;
      button.textContent = isConnected() ? 'Refreshing analytics…' : 'Connecting YouTube…';
    }

    try {
      const yt = window.ClipFreeYouTube;
      if (!yt) throw new Error('YouTube tools are still loading. Wait a few seconds and try again.');

      if (!yt.isConnected?.()) {
        renderMobileAnalytics('Opening Google sign-in. After approval, ClipFree will load analytics only — it will not start a Short.');
        await yt.connectYoutube?.();
      }

      if (!yt.isConnected?.()) {
        throw new Error('Google sign-in did not finish. Approve YouTube access, then tap this button again.');
      }

      renderMobileAnalytics(`Connected to ${channelTitle()}. Loading real YouTube analytics…`);
      await yt.refreshAllChannelData?.();

      // Allow the hidden dashboard metric nodes to finish painting.
      await sleep(120);
      renderMobileAnalytics();
    } catch (err) {
      const state = $('mobileYoutubeAnalyticsState');
      if (state) {
        state.textContent = `⚠️ ${err?.message || err}`;
        state.className = 'mobile-analytics-state bad';
      }
    } finally {
      busy = false;
      if (button) button.disabled = false;
      renderMobileAnalytics();
    }
  }

  function buildMobileAnalyticsCard() {
    if ($('mobileYoutubeAnalyticsCard')) {
      renderMobileAnalytics();
      return true;
    }

    const studio = $('clipfreeSimpleStudio');
    if (!studio) return false;

    const head = studio.querySelector('.simple-head');
    if (!head) return false;

    if (!$('mobileYoutubeAnalyticsCss')) {
      const style = document.createElement('style');
      style.id = 'mobileYoutubeAnalyticsCss';
      style.textContent = `
        #mobileYoutubeAnalyticsCard{
          margin-top:14px;padding:14px;border:1px solid #4f3ea7;border-radius:14px;
          background:linear-gradient(145deg,#151324,#0f0e18);color:#fff
        }
        #mobileYoutubeAnalyticsCard h3{margin:0 0 5px;font-size:1rem}
        #mobileYoutubeAnalyticsCard p{margin:0 0 10px;color:#bbb5d4;font-size:.82rem;line-height:1.45}
        #mobileYoutubeAnalyticsButton{
          width:100%;min-height:50px;border:0;border-radius:12px;
          background:linear-gradient(135deg,#7d5cff,#5a39dd);color:#fff;
          font:inherit;font-weight:900;font-size:.95rem;padding:11px 13px
        }
        #mobileYoutubeAnalyticsButton:disabled{opacity:.65}
        .mobile-analytics-state{margin-top:9px;color:#ffd293;font-size:.78rem;line-height:1.4}
        .mobile-analytics-state.good{color:#9ae6b4}
        .mobile-analytics-state.bad{color:#ff9d9d}
        .mobile-analytics-grid{
          display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:11px
        }
        .mobile-analytics-grid div{
          padding:10px;border-radius:10px;background:#0d0c13;border:1px solid #29243d
        }
        .mobile-analytics-grid small{display:block;color:#9991b8;font-size:.67rem;margin-bottom:3px}
        .mobile-analytics-grid strong{font-size:1rem;color:#fff}
      `;
      document.head.appendChild(style);
    }

    const card = document.createElement('div');
    card.id = 'mobileYoutubeAnalyticsCard';
    card.innerHTML = `
      <h3>📊 YouTube Connection + Analytics</h3>
      <p>Use this first for your YouTube API review. It only connects/refreshes your channel and analytics. It does <strong>not</strong> find media, download footage, create a Short or upload anything.</p>
      <button id="mobileYoutubeAnalyticsButton" type="button">▶ Connect YouTube + Load Analytics</button>
      <div id="mobileYoutubeAnalyticsState" class="mobile-analytics-state">Ready to connect.</div>
      <div class="mobile-analytics-grid">
        <div><small>Views · last 28 days</small><strong id="mobileMetricViews">—</strong></div>
        <div><small>Estimated watch hours</small><strong id="mobileMetricWatch">—</strong></div>
        <div><small>Average view duration</small><strong id="mobileMetricAvg">—</strong></div>
        <div><small>Net subscribers</small><strong id="mobileMetricSubs">—</strong></div>
      </div>
    `;

    head.appendChild(card);
    $('mobileYoutubeAnalyticsButton')?.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      connectAndRefreshOnly();
    });

    renderMobileAnalytics();
    return true;
  }

  const timer = setInterval(() => {
    if (buildMobileAnalyticsCard()) clearInterval(timer);
  }, 200);
  setTimeout(() => clearInterval(timer), 30000);

  window.addEventListener('clipfree-youtube-state', () => {
    setTimeout(() => {
      buildMobileAnalyticsCard();
      renderMobileAnalytics();
    }, 100);
  });

  setInterval(() => {
    if ($('mobileYoutubeAnalyticsCard')) renderMobileAnalytics();
  }, 1800);
})();
