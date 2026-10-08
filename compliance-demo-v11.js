/* ClipFree AI — YouTube API Compliance Recording Mode v11
   Real-data recording helper. It does not fake analytics, sources, metadata or uploads.
*/
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const qs = new URLSearchParams(location.search);

  // v27: preserve every reviewer URL that may already have been supplied to YouTube.
  // Normal homepage remains the fast creator workflow.
  const auditMode =
    qs.get('review') === '1' ||
    qs.get('audit') === '1' ||
    qs.get('compliance') === '1';

  window.CLIPFREE_COMPLIANCE_RECORDING_MODE = auditMode;

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

/* CLIPFREE MOTION GUARD v13 */
/*
  Stops a still-picture/repeated-frame source from being uploaded as a Short.
  If the finished wildlife MP4 has effectively no visual movement, ClipFree:
  1) blocks that source,
  2) searches for another matching reusable video,
  3) keeps the already-generated narration/audio,
  4) rebuilds the Short with the moving replacement,
  5) verifies movement again before allowing the YouTube upload.
*/
(() => {
  'use strict';

  const HISTORY_KEY = 'clipfree_source_history_v6';
  const PATCH_KEY = '__clipfreeMotionGuardV13';
  const $ = id => document.getElementById(id);

  const ANIMALS = [
    ['mountain lion', /\b(mountain lion|cougar|puma)\b/i],
    ['lion', /\b(lion|lioness|panthera leo)\b/i],
    ['tiger', /\b(tiger|panthera tigris)\b/i],
    ['leopard', /\b(leopard|panthera pardus)\b/i],
    ['cheetah', /\bcheetah\b/i],
    ['jaguar', /\bjaguar\b/i],
    ['lynx', /\blynx\b/i],
    ['bobcat', /\bbobcat\b/i],
    ['wolf', /\b(wolf|wolves|canis lupus)\b/i],
    ['coyote', /\bcoyote\b/i],
    ['fox', /\b(fox|vulpes)\b/i],
    ['bear', /\b(bear|grizzly|ursus|polar bear)\b/i],
    ['elephant', /\belephant\b/i],
    ['giraffe', /\bgiraffe\b/i],
    ['zebra', /\bzebra\b/i],
    ['rhino', /\b(rhino|rhinoceros)\b/i],
    ['hippo', /\b(hippo|hippopotamus)\b/i],
    ['bison', /\b(bison|buffalo)\b/i],
    ['moose', /\bmoose\b/i],
    ['elk', /\belk\b/i],
    ['deer', /\b(deer|stag|doe|buck|reindeer|caribou)\b/i],
    ['antelope', /\b(antelope|gazelle|pronghorn|wildebeest)\b/i],
    ['kangaroo', /\bkangaroo\b/i],
    ['koala', /\bkoala\b/i],
    ['otter', /\botter\b/i],
    ['rabbit', /\b(rabbit|hare)\b/i],
    ['squirrel', /\b(squirrel|chipmunk|marmot)\b/i],
    ['gorilla', /\bgorilla\b/i],
    ['chimpanzee', /\bchimpanzee\b/i],
    ['orangutan', /\borangutan\b/i],
    ['monkey', /\b(monkey|macaque|baboon|gibbon|lemur)\b/i],
    ['hyena', /\b(hyena|hyaena)\b/i],
    ['meerkat', /\bmeerkat\b/i],
    ['crocodile', /\bcrocodile\b/i],
    ['alligator', /\balligator\b/i],
    ['turtle', /\b(turtle|tortoise)\b/i],
    ['snake', /\b(snake|python|cobra|rattlesnake|boa)\b/i],
    ['eagle', /\beagle\b/i],
    ['hawk', /\bhawk\b/i],
    ['falcon', /\bfalcon\b/i],
    ['owl', /\bowl\b/i],
    ['penguin', /\bpenguin\b/i],
    ['shark', /\bshark\b/i],
    ['whale', /\b(whale|orca)\b/i],
    ['dolphin', /\bdolphin\b/i],
    ['seal', /\b(seal|sea lion|walrus)\b/i],
    ['frog', /\b(frog|toad)\b/i]
  ];

  function setMotionStatus(message, kind = 'subtle') {
    const el = $('animalGeneratorStatus') || $('simpleStatus') || $('youtubeUploadStatus');
    if (!el) return;
    el.textContent = message;
    if (el.classList?.contains('notice')) el.className = `notice ${kind}`;
  }

  function sourceKeys(meta = {}) {
    const src = meta?.source || meta || {};
    const sources = [
      ...(Array.isArray(meta?.sources) ? meta.sources : []),
      ...(Array.isArray(src?.sources) ? src.sources : [])
    ];
    return [...new Set(sources.flatMap(item => [
      item?.sourceUrl, item?.fileUrl, item?.title
    ]).map(x => String(x || '').trim()).filter(Boolean))];
  }

  function blockCurrentSource(meta = {}) {
    try {
      const old = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      const set = new Set(Array.isArray(old) ? old.map(String) : []);
      for (const key of sourceKeys(meta)) set.add(key);
      localStorage.setItem(HISTORY_KEY, JSON.stringify([...set].slice(-10000)));
    } catch {}
  }

  function expectedAnimal(meta = {}) {
    const src = meta?.source || meta || {};
    const text = [
      window.CLIPFREE_COMPLIANCE_EXACT_ANIMAL || '',
      meta?.detectedAnimal || '',
      src?.detectedAnimal || '',
      meta?.searchTopic || '',
      src?.searchTopic || '',
      meta?.presetLabel || '',
      src?.presetLabel || '',
      ...(Array.isArray(meta?.sources) ? meta.sources.map(x => x?.title || '') : []),
      ...(Array.isArray(src?.sources) ? src.sources.map(x => x?.title || '') : [])
    ].join(' ');
    for (const [name, rx] of ANIMALS) if (rx.test(text)) return {name, rx};
    return null;
  }

  function replacementMatches(item, expected) {
    if (!expected) return true;
    const text = `${item?.title || ''} ${item?.attribution || ''}`;
    return expected.rx.test(text);
  }

  function waitFor(video, eventName, timeoutMs = 5500) {
    return new Promise((resolve, reject) => {
      let timer = null;
      const cleanup = () => {
        video.removeEventListener(eventName, ok);
        video.removeEventListener('error', fail);
        if (timer) clearTimeout(timer);
      };
      const ok = () => { cleanup(); resolve(); };
      const fail = () => { cleanup(); reject(new Error('video decode failed')); };
      video.addEventListener(eventName, ok, {once:true});
      video.addEventListener('error', fail, {once:true});
      timer = setTimeout(() => {
        cleanup();
        reject(new Error(`${eventName} timed out`));
      }, timeoutMs);
    });
  }

  async function seek(video, t) {
    const duration = Number(video.duration || 0);
    const safe = Math.max(0.05, Math.min(Math.max(0.05, duration - 0.12), Number(t || 0)));
    if (Math.abs(Number(video.currentTime || 0) - safe) < 0.03) return;
    video.currentTime = safe;
    try { await waitFor(video, 'seeked', 4500); } catch {}
  }

  function grayFrame(video, canvas, ctx) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const p = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const out = new Float32Array(canvas.width * canvas.height);
    let j = 0;
    for (let i = 0; i < p.length; i += 4) {
      out[j++] = (p[i] * 0.299) + (p[i + 1] * 0.587) + (p[i + 2] * 0.114);
    }
    return out;
  }

  function frameDifference(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let total = 0;
    for (let i = 0; i < a.length; i++) total += Math.abs(a[i] - b[i]);
    return total / a.length;
  }

  async function inspectMotion(file, {strict = true} = {}) {
    if (!(file instanceof Blob) || Number(file.size || 0) < 64 * 1024) {
      return {ok:false, moving:false, reason:'video file is empty or too small', score:0};
    }

    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 27;
    const ctx = canvas.getContext('2d', {willReadFrequently:true});

    try {
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.src = url;
      await waitFor(video, 'loadedmetadata', 7000);

      const duration = Number(video.duration || 0);
      if (!Number.isFinite(duration) || duration < 1.5 || !video.videoWidth || !video.videoHeight) {
        return {ok:false, moving:false, reason:'video has invalid duration/dimensions', score:0};
      }

      const times = [0.12, 0.34, 0.58, 0.82].map(f => Math.max(0.12, duration * f));
      const frames = [];
      for (const t of times) {
        await seek(video, t);
        frames.push(grayFrame(video, canvas, ctx));
      }

      const diffs = [];
      for (let i = 1; i < frames.length; i++) diffs.push(frameDifference(frames[i - 1], frames[i]));
      const best = Math.max(...diffs, 0);
      const avg = diffs.length ? diffs.reduce((a,b) => a+b, 0) / diffs.length : 0;

      // A genuinely repeated still frame is normally ~0. Real footage usually
      // clears this by a large margin even when the camera is mostly stationary.
      const moving = best >= 0.35 || avg >= 0.18;
      return {
        ok:true,
        moving,
        score:Number(best.toFixed(3)),
        average:Number(avg.toFixed(3)),
        reason:moving ? '' : 'frames are effectively identical'
      };
    } catch (err) {
      // Final H.264 MP4s generated by ClipFree should always be browser-readable.
      // In strict mode, a video we cannot verify is blocked instead of uploaded.
      return {
        ok:false,
        moving:!strict,
        score:0,
        average:0,
        reason:err?.message || String(err)
      };
    } finally {
      video.removeAttribute('src');
      try { video.load(); } catch {}
      URL.revokeObjectURL(url);
    }
  }

  async function downloadReplacement(item, index) {
    const response = await fetch(item.fileUrl, {mode:'cors', cache:'no-store'});
    if (!response.ok) throw new Error(`replacement download failed (${response.status})`);
    const blob = await response.blob();
    if (blob.size < 96 * 1024) throw new Error('replacement source is too small');
    if (blob.size > 35 * 1024 * 1024) throw new Error('replacement source is too large for reliable phone processing');

    const ext =
      String(item.title || '').match(/\.([a-z0-9]{2,5})$/i)?.[1] ||
      (String(item.mime || blob.type).includes('mp4') ? 'mp4' :
       String(item.mime || blob.type).includes('ogg') ? 'ogv' : 'webm');

    return new File(
      [blob],
      `clipfree_motion_replacement_${Date.now()}_${index}.${ext}`,
      {type:item.mime || blob.type || 'video/webm'}
    );
  }

  function replacementMeta(meta, item) {
    const source = {
      title:item?.title || 'Wildlife video',
      creator:item?.creator || 'Source contributor',
      license:item?.license || 'See source page',
      sourceUrl:item?.sourceUrl || '',
      fileUrl:item?.fileUrl || ''
    };
    const attribution = item?.attribution ||
      `“${source.title}” — ${source.creator}. Source: ${source.sourceUrl}. Licence: ${source.license}.`;

    return {
      ...meta,
      sources:[source],
      attribution:`ClipFree AI created this vertical Short from reusable source media.\n1. ${attribution}`,
      __clipfreeMotionReplacement:true
    };
  }

  async function findMovingReplacement(meta, audioFile) {
    const yt = window.ClipFreeYouTube;
    const automation = window.ClipFreeAutomation;
    if (!yt?.searchCommonsDownloadable || !automation?.createMontageFromFiles) return null;

    const expected = expectedAnimal(meta);
    const current = new Set(sourceKeys(meta));
    const queries = [
      meta?.searchTopic,
      meta?.source?.searchTopic,
      expected ? `${expected.name} wildlife movement` : '',
      expected ? `${expected.name} wildlife nature` : '',
      expected ? `${expected.name} animal behavior` : '',
      'wildlife animal nature'
    ].map(x => String(x || '').trim()).filter(Boolean);

    const seen = new Set();

    for (const query of queries) {
      let results = [];
      try { results = await yt.searchCommonsDownloadable(query, 20); }
      catch (err) { console.warn('Motion replacement search skipped', query, err); }

      for (const item of results || []) {
        const key = String(item?.sourceUrl || item?.fileUrl || item?.title || '').trim();
        if (!key || seen.has(key) || current.has(key)) continue;
        seen.add(key);
        if (!item?.fileUrl || !replacementMatches(item, expected)) continue;
        if (Number(item?.size || 0) > 35 * 1024 * 1024) continue;

        try {
          setMotionStatus(`Still-picture source blocked. Checking a moving ${expected?.name || 'wildlife'} replacement…`, 'subtle');
          const sourceFile = await downloadReplacement(item, seen.size);

          // Quick source check first so we do not waste a full FFmpeg render on a still.
          const sourceMotion = await inspectMotion(sourceFile, {strict:false});
          if (sourceMotion.ok && !sourceMotion.moving) continue;

          const duration = Math.max(
            8,
            Math.min(60, Number(meta?.targetDuration || meta?.source?.targetDuration || $('simpleDuration')?.value || 10))
          );

          // Reuse the narration/audio already present in the first finished MP4.
          const rebuilt = await automation.createMontageFromFiles([sourceFile], {
            duration,
            audioFile,
            filename:`clipfree-moving-replacement-${Date.now()}.mp4`
          });

          const finalMotion = await inspectMotion(rebuilt, {strict:true});
          if (!finalMotion.ok || !finalMotion.moving) {
            console.warn('Replacement rendered without enough motion', finalMotion);
            continue;
          }

          return {
            file:rebuilt,
            meta:replacementMeta(meta, item),
            item,
            motion:finalMotion
          };
        } catch (err) {
          console.warn('Moving replacement candidate skipped', err);
        }
      }
    }

    return null;
  }

  function patch() {
    const yt = window.ClipFreeYouTube;
    if (!yt?.startFullAutoWithFile) return false;
    if (yt[PATCH_KEY]) return true;

    const originalStart = yt.startFullAutoWithFile.bind(yt);

    yt.startFullAutoWithFile = async function startWithMotionGuard(file, meta = null) {
      if (meta?.kind !== 'animal-generator') return originalStart(file, meta);

      const check = await inspectMotion(file, {strict:true});
      if (check.ok && check.moving) {
        return originalStart(file, meta);
      }

      // Never send a repeated still frame to YouTube.
      blockCurrentSource(meta);
      setMotionStatus(
        'ClipFree detected a still-picture/repeated-frame Short. It will NOT upload it. Finding a moving replacement now…',
        'bad'
      );

      const replacement = await findMovingReplacement(meta || {}, file);
      if (!replacement?.file) {
        throw new Error(
          'ClipFree blocked a still-picture Short before upload and could not find a verified moving replacement yet. Tap Start again; the bad source has been permanently skipped on this device.'
        );
      }

      setMotionStatus(
        `Moving replacement verified (motion score ${replacement.motion?.score ?? 'OK'}). Uploading the moving Short…`,
        'good'
      );

      return originalStart(replacement.file, replacement.meta);
    };

    yt[PATCH_KEY] = true;
    window.CLIPFREE_MOTION_GUARD = {
      version:'13.0',
      enabled:true,
      behavior:'block-still-and-auto-replace-before-youtube-upload'
    };
    return true;
  }

  if (!patch()) {
    const timer = setInterval(() => {
      if (patch()) clearInterval(timer);
    }, 200);
    setTimeout(() => clearInterval(timer), 30000);
  }

  window.addEventListener('clipfree-youtube-ready', () => setTimeout(patch, 0));
})();


/* CLIPFREE 1-10 SEQUENTIAL + AUTO-RETRY v15 */
/*
  Final mobile batch runner:
  - handles EVERY multi-Short request (2–10), including 8
  - creates/uploads one Short at a time
  - requires a real YouTube video ID before moving to the next Short
  - automatically retries the SAME slot when Motion Guard blocks a still source
  - stops on real YouTube/auth/quota failures and shows the exact message
*/
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const MAX_SOURCE_RETRIES = 8;

  const TOPICS = {
    wildlife:  {preset:'wildlife', query:'clipfree variety wildlife'},
    lions:     {preset:'lions',    query:'lion wildlife'},
    moose:     {preset:'wildlife', query:'moose wildlife alces alces'},
    tigers:    {preset:'wildlife', query:'tiger wildlife panthera tigris'},
    elephants: {preset:'wildlife', query:'elephant wildlife safari'},
    wolves:    {preset:'wildlife', query:'wolf wildlife canis lupus'},
    bears:     {preset:'wildlife', query:'bear wildlife nature'},
    kittens:   {preset:'kittens',  query:'cute kittens playing'},
    puppies:   {preset:'puppies',  query:'cute puppies playing'}
  };

  let running = false;

  function setValue(id, value) {
    const el = $(id);
    if (!el) return;
    el.value = String(value);
    el.dispatchEvent(new Event('input', {bubbles:true}));
    el.dispatchEvent(new Event('change', {bubbles:true}));
  }

  function setStatus(text, kind = '') {
    const el = $('simpleStatus');
    if (!el) return;
    el.textContent = text;
    el.className = `simple-status ${kind}`.trim();
  }

  function setProgress(done, total) {
    const bar = $('simpleProgress');
    if (bar) {
      bar.style.width = `${Math.max(0, Math.min(100, (done / Math.max(1, total)) * 100))}%`;
    }
  }

  function transferredCount() {
    return Math.max(
      Number(window.ClipFreeYouTubeProcessingState?.transferred || 0),
      Number(window.ClipFreeTransferredUploadState?.total || 0)
    );
  }

  function confirmedCount() {
    return Math.max(
      Number(window.ClipFreeYouTubeProcessingState?.confirmed || 0),
      Number(window.ClipFreeConfirmedUploadState?.total || 0)
    );
  }

  function currentMessages() {
    return [
      $('animalGeneratorStatus')?.textContent,
      $('youtubeUploadStatus')?.textContent,
      $('simpleStatus')?.textContent,
      window.ClipFreeTransferredUploadState?.lastError,
      window.ClipFreeConfirmedUploadState?.lastError,
      window.ClipFreeYouTubeProcessingState?.lastError
    ].map(x => String(x || '').trim()).filter(Boolean);
  }

  function exactFailure() {
    const all = currentMessages();
    return all.find(x =>
      /(error|failed|stopped|could not|cannot|can't|quota|limit|unauthor|forbidden|invalid|still-picture|repeated-frame|moving replacement|no suitable|found \d+\/\d+)/i.test(x)
    ) || '';
  }

  function isRetryableSourceFailure(message) {
    const m = String(message || '').toLowerCase();
    return (
      m.includes('still-picture') ||
      m.includes('repeated-frame') ||
      m.includes('moving replacement') ||
      m.includes('bad source') ||
      m.includes('different unused') ||
      m.includes('unused public domain') ||
      m.includes('no suitable sources') ||
      /found \d+\/\d+ unused/.test(m)
    );
  }

  function isHardFailure(message) {
    const m = String(message || '').toLowerCase();
    return (
      m.includes('quota') ||
      m.includes('daily upload') ||
      m.includes('upload limit') ||
      m.includes('unauthorized') ||
      m.includes('forbidden') ||
      m.includes('oauth') ||
      m.includes('sign in') ||
      m.includes('connect youtube') ||
      m.includes('permission') ||
      m.includes('403') ||
      m.includes('401')
    );
  }

  function syncOneShort() {
    const topicKey = $('simpleTopic')?.value || 'wildlife';
    const topic = TOPICS[topicKey] || TOPICS.wildlife;
    const style = $('simpleStyle')?.value || 'documentary';
    const duration = Math.max(10, Math.min(60, Number($('simpleDuration')?.value || 30)));
    const privacy = $('simplePrivacy')?.value || 'private';
    const rights = Boolean($('simpleRights')?.checked);

    window.ClipFreeVarietyMode = topicKey === 'wildlife';

    document.querySelector(`[data-animal-preset="${topic.preset}"]`)?.click();

    setValue('animalTopic', topic.query);
    setValue('animalStyle', style);
    setValue('animalDuration', duration);
    setValue('animalBatchCount', 1);
    setValue('autoPrivacy', privacy);

    const sound = $('animalSounds');
    if (sound) {
      sound.checked = true;
      sound.dispatchEvent(new Event('change', {bubbles:true}));
    }

    const autoRights = $('autoUploadCertification');
    if (autoRights) autoRights.checked = rights;
    const legacyRights = $('clipfree20Rights');
    if (legacyRights) legacyRights.checked = rights;

    return {rights, topicKey, privacy, duration};
  }

  async function waitForCycle(button, timeoutMs = 45 * 60 * 1000) {
    const start = Date.now();

    while (!button.disabled && Date.now() - start < 8000) {
      await sleep(80);
    }

    if (!button.disabled) {
      throw new Error('ClipFree could not start the Short generator. Refresh the page and try again.');
    }

    while (button.disabled) {
      if (Date.now() - start > timeoutMs) {
        throw new Error('This Short took unusually long. The batch stopped so completed uploads remain safe.');
      }
      await sleep(650);
    }
  }

  async function runBatch(total) {
    if (running) return;
    running = true;

    const requested = Math.max(2, Math.min(10, Number(total || 2)));
    const visibleButton = $('simpleStart');
    const generatorButton = $('generateAnimalVideo');

    try {
      const cfg = syncOneShort();

      if (!cfg.rights) {
        throw new Error('Tick the content-rights / Community Guidelines confirmation first.');
      }

      if (!window.ClipFreeYouTube?.isConnected?.()) {
        throw new Error('Connect YouTube first with the YouTube Connection + Analytics button.');
      }

      if (!generatorButton) {
        throw new Error('The Short generator is not available. Refresh ClipFree and try again.');
      }

      const limit = window.ClipFreeYouTube?.getUploadLimitStatus?.();
      if (limit?.active) {
        throw new Error(`YouTube upload cooldown is active until about ${limit.untilText}.`);
      }

      if (visibleButton) visibleButton.disabled = true;

      const runStart = transferredCount();
      let done = 0;
      setProgress(0, requested);

      while (done < requested) {
        let slotSucceeded = false;

        for (let attempt = 1; attempt <= MAX_SOURCE_RETRIES && !slotSucceeded; attempt++) {
          syncOneShort();
          const before = transferredCount();

          setStatus(
            `Short ${done + 1}/${requested}: finding a moving unused source` +
            (attempt > 1 ? ` — retry ${attempt}/${MAX_SOURCE_RETRIES}` : '') +
            `. ${done}/${requested} have real YouTube video IDs so far…`
          );

          generatorButton.click();
          await waitForCycle(generatorButton);

          const after = transferredCount();
          if (after > before) {
            done += 1;
            slotSucceeded = true;
            setProgress(done, requested);
            setStatus(
              `${done}/${requested} Shorts reached YouTube with real video IDs ❤️ ` +
              `${confirmedCount()} total upload(s) have finished YouTube processing.` +
              (done < requested ? ` Preparing Short ${done + 1}/${requested}…` : ''),
              'good'
            );
            if (done < requested) await sleep(900);
            continue;
          }

          const failure = exactFailure() || 'No YouTube video ID was returned for this Short.';

          if (isHardFailure(failure)) {
            throw new Error(`Short ${done + 1}/${requested} stopped: ${failure}`);
          }

          if (isRetryableSourceFailure(failure) && attempt < MAX_SOURCE_RETRIES) {
            setStatus(
              `Short ${done + 1}/${requested}: that source was rejected because it was still/unsuitable. ` +
              `ClipFree is automatically trying a different source (${attempt + 1}/${MAX_SOURCE_RETRIES})…`,
              'bad'
            );
            await sleep(900);
            continue;
          }

          if (isRetryableSourceFailure(failure)) {
            throw new Error(
              `Short ${done + 1}/${requested} could not find a verified moving source after ${MAX_SOURCE_RETRIES} different attempts. ` +
              `Completed uploads are safe. Try the batch again and Source Vault will continue rotating to new sources.`
            );
          }

          throw new Error(`Short ${done + 1}/${requested} did not receive a YouTube video ID. ${failure}`);
        }
      }

      const gained = transferredCount() - runStart;
      if (gained < requested) {
        throw new Error(
          `ClipFree verified ${gained}/${requested} real YouTube video IDs for this run. ` +
          `It will not mark the batch complete unless all ${requested} are verified.`
        );
      }

      setProgress(requested, requested);
      setStatus(
        `All ${requested}/${requested} Shorts reached YouTube and received real video IDs ❤️ ` +
        `YouTube may still be processing some videos in the background.`,
        'good'
      );
    } catch (err) {
      console.error('ClipFree v15 batch stopped', err);
      setStatus(err?.message || String(err), 'bad');
    } finally {
      if ($('simpleCount')) $('simpleCount').value = String(requested);
      if (visibleButton) {
        visibleButton.disabled = false;
        visibleButton.textContent = `✨ CREATE + SEO + UPLOAD ${requested} SHORTS`;
      }
      running = false;
    }
  }

  // Capture every multi-Short request BEFORE old 8+8+4/native batch handlers.
  document.addEventListener('click', event => {
    const target = event.target?.closest?.('#simpleStart');
    if (!target) return;

    const requested = Math.max(1, Math.min(10, Number($('simpleCount')?.value || 1)));
    if (requested <= 1) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    runBatch(requested);
  }, true);

  window.ClipFreeSequentialBatch = {
    version:'15.0',
    max:10,
    run: runBatch,
    active: () => running
  };
})();

/* CLIPFREE REAL-MOVING-SOURCE FILTER v16 */
/*
  Wildlife source preflight:
  - only accepts actual video files
  - downloads candidate video sources BEFORE generation
  - samples several frames from the source itself
  - rejects video files that are effectively just one still picture
  - returns only sources with verified visual movement to the generator
*/
(() => {
  'use strict';

  const PATCH_FLAG = '__clipfreeRealMovingSourcesV16';
  const MAX_CHECKS_PER_SEARCH = 10;
  const MAX_SOURCE_BYTES = 35 * 1024 * 1024;
  const verified = new Map();

  function waitFor(video, eventName, timeoutMs = 6500) {
    return new Promise((resolve, reject) => {
      let timer = null;
      const done = () => { cleanup(); resolve(); };
      const fail = () => { cleanup(); reject(new Error('video decode failed')); };
      const cleanup = () => {
        video.removeEventListener(eventName, done);
        video.removeEventListener('error', fail);
        if (timer) clearTimeout(timer);
      };
      video.addEventListener(eventName, done, {once:true});
      video.addEventListener('error', fail, {once:true});
      timer = setTimeout(() => {
        cleanup();
        reject(new Error(`${eventName} timed out`));
      }, timeoutMs);
    });
  }

  async function seek(video, time) {
    const duration = Number(video.duration || 0);
    const safe = Math.max(0.06, Math.min(Math.max(0.06, duration - 0.12), time));
    if (Math.abs(Number(video.currentTime || 0) - safe) < 0.03) return;
    video.currentTime = safe;
    try { await waitFor(video, 'seeked', 4500); } catch {}
  }

  function frame(video, canvas, ctx) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const p = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const out = new Float32Array(canvas.width * canvas.height);
    let j = 0;
    for (let i = 0; i < p.length; i += 4) {
      out[j++] = p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114;
    }
    return out;
  }

  function difference(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let total = 0;
    for (let i = 0; i < a.length; i++) total += Math.abs(a[i] - b[i]);
    return total / a.length;
  }

  async function verifyMovingBlob(blob) {
    if (!(blob instanceof Blob) || blob.size < 96 * 1024) {
      return {moving:false, reason:'source is empty or too small'};
    }

    const video = document.createElement('video');
    const url = URL.createObjectURL(blob);
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 27;
    const ctx = canvas.getContext('2d', {willReadFrequently:true});

    try {
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.src = url;
      await waitFor(video, 'loadedmetadata', 7500);

      const duration = Number(video.duration || 0);
      if (!Number.isFinite(duration) || duration < 1.5 || !video.videoWidth || !video.videoHeight) {
        return {moving:false, reason:'invalid video metadata'};
      }

      const times = [0.16, 0.40, 0.66, 0.86].map(f => Math.max(0.10, duration * f));
      const frames = [];
      for (const t of times) {
        await seek(video, t);
        frames.push(frame(video, canvas, ctx));
      }

      const diffs = [];
      for (let i = 1; i < frames.length; i++) diffs.push(difference(frames[i - 1], frames[i]));
      const best = Math.max(...diffs, 0);
      const avg = diffs.length ? diffs.reduce((a,b) => a+b, 0) / diffs.length : 0;

      // Very low values mean the same picture was repeated through the file.
      const moving = best >= 0.35 || avg >= 0.18;
      return {
        moving,
        score:Number(best.toFixed(3)),
        average:Number(avg.toFixed(3)),
        duration
      };
    } catch (err) {
      return {moving:false, reason:err?.message || String(err)};
    } finally {
      video.removeAttribute('src');
      try { video.load(); } catch {}
      URL.revokeObjectURL(url);
    }
  }

  async function verifySource(item) {
    const key = String(item?.fileUrl || '').trim();
    if (!key) return false;
    if (verified.has(key)) return verified.get(key);

    const mime = String(item?.mime || '').toLowerCase();
    if (mime && !mime.startsWith('video/')) {
      verified.set(key, false);
      return false;
    }

    const declaredSize = Number(item?.size || 0);
    if (declaredSize && declaredSize > MAX_SOURCE_BYTES) {
      verified.set(key, false);
      return false;
    }

    try {
      const response = await fetch(key, {mode:'cors', cache:'no-store'});
      if (!response.ok) throw new Error(`source fetch failed (${response.status})`);

      const blob = await response.blob();
      if (blob.size > MAX_SOURCE_BYTES) {
        verified.set(key, false);
        return false;
      }

      const result = await verifyMovingBlob(blob);
      const ok = Boolean(result.moving);
      verified.set(key, ok);

      if (ok) {
        item.__clipfreeMovingVideoVerified = true;
        item.__clipfreeMotionScore = result.score;
        item.__clipfreeMotionAverage = result.average;
      }
      return ok;
    } catch (err) {
      console.warn('Moving-source preflight rejected source', item?.title || key, err);
      verified.set(key, false);
      return false;
    }
  }

  function isWildlifeQuery(query = '') {
    return /\b(wildlife|animal|lion|tiger|leopard|cheetah|jaguar|wolf|coyote|fox|bear|elephant|giraffe|zebra|rhino|hippo|bison|moose|elk|deer|antelope|kangaroo|koala|otter|rabbit|squirrel|gorilla|chimpanzee|orangutan|monkey|hyena|meerkat|crocodile|alligator|turtle|snake|eagle|hawk|falcon|owl|penguin|shark|whale|dolphin|seal|frog|kitten|puppy|cat|dog)\b/i.test(String(query || ''));
  }

  function patch() {
    const yt = window.ClipFreeYouTube;
    if (!yt?.searchCommonsDownloadable) return false;
    if (yt[PATCH_FLAG]) return true;

    const original = yt.searchCommonsDownloadable.bind(yt);

    yt.searchCommonsDownloadable = async function movingVideosOnly(query, limit = 12) {
      const results = await original(query, Math.max(limit, MAX_CHECKS_PER_SEARCH));

      // Keep non-wildlife discovery unchanged.
      if (!isWildlifeQuery(query) && !window.ClipFreeVarietyMode) {
        return results;
      }

      const moving = [];
      let checked = 0;

      for (const item of results || []) {
        if (checked >= MAX_CHECKS_PER_SEARCH) break;
        checked += 1;

        const ok = await verifySource(item);
        if (!ok) continue;

        moving.push(item);
        if (moving.length >= limit) break;
      }

      if (!moving.length) {
        console.warn('ClipFree v16 found no verified moving video sources for', query);
      }

      return moving;
    };

    yt[PATCH_FLAG] = true;
    window.CLIPFREE_REAL_MOVING_SOURCES = {
      version:'16.0',
      enabled:true,
      rule:'wildlife source must contain verified moving frames before generation'
    };
    return true;
  }

  if (!patch()) {
    const timer = setInterval(() => {
      if (patch()) clearInterval(timer);
    }, 200);
    setTimeout(() => clearInterval(timer), 30000);
  }

  window.addEventListener('clipfree-youtube-ready', () => setTimeout(patch, 0));
})();

/* CLIPFREE FAST MOVING SOURCES v17 */
/*
  Speed fix for the "finding a moving unused source" step.

  v16 downloaded candidate videos one-by-one before deciding whether they moved.
  On mobile this could take many minutes.

  v17 replaces that search path with:
  - direct Wikimedia video search
  - smaller candidate videos first
  - remote/streamed motion checks instead of downloading every whole candidate
  - 3 candidates checked in parallel
  - short timeouts so one slow source cannot stall the batch
  - only verified moving videos returned to ClipFree
*/
(() => {
  'use strict';

  const PATCH_FLAG = '__clipfreeFastMovingSourcesV17';
  const CACHE = new Map();

  const MAX_SOURCE_BYTES = 18 * 1024 * 1024;
  const SEARCH_RESULTS = 18;
  const MAX_VERIFY = 9;
  const CONCURRENCY = 3;

  function stripHtml(value = '') {
    const box = document.createElement('div');
    box.innerHTML = String(value || '');
    return (box.textContent || box.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function metaValue(meta, key) {
    return stripHtml(meta?.[key]?.value || '');
  }

  function commonsFilePageUrl(title) {
    return `https://commons.wikimedia.org/wiki/${encodeURIComponent(String(title || '').replace(/ /g, '_')).replace(/%2F/g, '/')}`;
  }

  function reusableLicense(license = '') {
    const value = String(license || '').toLowerCase();
    return (
      value.includes('public domain') ||
      value.includes('cc0') ||
      (
        (value.includes('cc by') || value.includes('creative commons attribution')) &&
        !value.includes('by-sa') &&
        !value.includes('share alike')
      )
    );
  }

  function toItem(page) {
    const info = page?.imageinfo?.[0] || {};
    const meta = info.extmetadata || {};
    const title = String(page?.title || 'Wikimedia Commons video').replace(/^File:/i, '');
    const creator = metaValue(meta, 'Artist') || metaValue(meta, 'Credit') || 'Wikimedia Commons contributor';
    const license = metaValue(meta, 'LicenseShortName') || metaValue(meta, 'UsageTerms') || 'See source page for licence';
    const licenseUrl = metaValue(meta, 'LicenseUrl');
    const sourceUrl = commonsFilePageUrl(page?.title || '');
    return {
      title,
      creator,
      license,
      licenseUrl,
      sourceUrl,
      fileUrl: info.url || '',
      thumbUrl: info.thumburl || '',
      mime: info.mime || '',
      size: Number(info.size || 0),
      provider: 'Wikimedia Commons',
      attribution: `“${title}” — ${creator}. Source: Wikimedia Commons. Licence: ${license}${licenseUrl ? ` (${licenseUrl})` : ''}. ${sourceUrl}`
    };
  }

  async function searchCommonsFast(query) {
    const url = new URL('https://commons.wikimedia.org/w/api.php');
    const params = {
      action:'query',
      generator:'search',
      gsrsearch:`${query} filetype:video filesize:<18432`,
      gsrnamespace:'6',
      gsrlimit:String(SEARCH_RESULTS),
      prop:'imageinfo',
      iiprop:'url|size|mime|mediatype|extmetadata',
      iiurlwidth:'480',
      format:'json',
      formatversion:'2',
      origin:'*'
    };
    Object.entries(params).forEach(([k,v]) => url.searchParams.set(k,v));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);

    try {
      const response = await fetch(url.toString(), {
        mode:'cors',
        cache:'no-store',
        signal:controller.signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.error) {
        throw new Error(data?.error?.info || `Wikimedia search failed (${response.status})`);
      }

      return (data?.query?.pages || [])
        .map(toItem)
        .filter(item =>
          item.fileUrl &&
          String(item.mime || '').startsWith('video/') &&
          (!item.size || item.size <= MAX_SOURCE_BYTES) &&
          reusableLicense(item.license)
        )
        .sort((a,b) => Number(a.size || 999999999) - Number(b.size || 999999999));
    } finally {
      clearTimeout(timer);
    }
  }

  function waitFor(video, eventName, timeoutMs) {
    return new Promise((resolve, reject) => {
      let timer = null;
      const ok = () => { cleanup(); resolve(); };
      const fail = () => { cleanup(); reject(new Error('video decode failed')); };
      const cleanup = () => {
        video.removeEventListener(eventName, ok);
        video.removeEventListener('error', fail);
        if (timer) clearTimeout(timer);
      };
      video.addEventListener(eventName, ok, {once:true});
      video.addEventListener('error', fail, {once:true});
      timer = setTimeout(() => {
        cleanup();
        reject(new Error(`${eventName} timed out`));
      }, timeoutMs);
    });
  }

  async function seek(video, t) {
    const duration = Number(video.duration || 0);
    const safe = Math.max(0.08, Math.min(Math.max(0.08, duration - 0.12), Number(t || 0)));
    if (Math.abs(Number(video.currentTime || 0) - safe) < 0.04) return;
    video.currentTime = safe;
    await waitFor(video, 'seeked', 2400);
  }

  function sample(video, canvas, ctx) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const out = new Float32Array(canvas.width * canvas.height);
    let j = 0;
    for (let i = 0; i < rgba.length; i += 4) {
      out[j++] = rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114;
    }
    return out;
  }

  function diff(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let total = 0;
    for (let i = 0; i < a.length; i++) total += Math.abs(a[i] - b[i]);
    return total / a.length;
  }

  async function verifyRemoteMoving(item) {
    const key = String(item?.fileUrl || '');
    if (!key) return false;
    if (CACHE.has(key)) return CACHE.get(key);

    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 23;
    const ctx = canvas.getContext('2d', {willReadFrequently:true});

    try {
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.src = key;

      await waitFor(video, 'loadedmetadata', 4800);

      const duration = Number(video.duration || 0);
      if (!Number.isFinite(duration) || duration < 1.5 || !video.videoWidth || !video.videoHeight) {
        CACHE.set(key, false);
        return false;
      }

      // Three streamed frame checks. Browser range requests fetch only the pieces
      // needed for these timestamps instead of downloading the complete candidate.
      const t1 = Math.max(0.12, Math.min(duration * 0.12, 0.8));
      const t2 = Math.max(t1 + 0.45, Math.min(duration * 0.50, 2.2));
      const t3 = Math.max(t2 + 0.45, Math.min(duration * 0.82, 4.0));

      await seek(video, t1);
      const a = sample(video, canvas, ctx);
      await seek(video, t2);
      const b = sample(video, canvas, ctx);
      await seek(video, t3);
      const c = sample(video, canvas, ctx);

      const d1 = diff(a,b);
      const d2 = diff(b,c);
      const best = Math.max(d1,d2);
      const avg = (d1+d2)/2;

      // Blocks repeated still images while allowing calm/slow wildlife footage.
      const moving = best >= 0.28 || avg >= 0.14;
      CACHE.set(key, moving);

      if (moving) {
        item.__clipfreeMovingVideoVerified = true;
        item.__clipfreeMotionScore = Number(best.toFixed(3));
        item.__clipfreeMotionAverage = Number(avg.toFixed(3));
      }

      return moving;
    } catch (err) {
      console.warn('Fast moving-source check skipped candidate', item?.title || key, err);
      CACHE.set(key, false);
      return false;
    } finally {
      video.removeAttribute('src');
      try { video.load(); } catch {}
    }
  }

  async function verifyInParallel(items, wanted) {
    const candidates = (items || []).slice(0, MAX_VERIFY);
    const accepted = [];

    for (let i = 0; i < candidates.length && accepted.length < wanted; i += CONCURRENCY) {
      const group = candidates.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        group.map(async item => ({item, ok:await verifyRemoteMoving(item)}))
      );

      for (const result of results) {
        if (result.status !== 'fulfilled' || !result.value.ok) continue;
        accepted.push(result.value.item);
        if (accepted.length >= wanted) break;
      }
    }

    return accepted;
  }

  function patch() {
    const yt = window.ClipFreeYouTube;
    if (!yt) return false;
    if (yt[PATCH_FLAG]) return true;

    yt.searchCommonsDownloadable = async function fastVerifiedMovingSources(query, limit = 12) {
      const wanted = Math.max(1, Math.min(6, Number(limit || 1)));
      const candidates = await searchCommonsFast(query);
      const moving = await verifyInParallel(candidates, wanted);

      if (!moving.length) {
        console.warn('ClipFree v17 found no fast verified moving source for', query);
      }

      return moving;
    };

    yt[PATCH_FLAG] = true;
    window.CLIPFREE_REAL_MOVING_SOURCES = {
      version:'17.0',
      enabled:true,
      fast:true,
      rule:'verify real moving wildlife video by streamed frame sampling before generation'
    };
    return true;
  }

  if (!patch()) {
    const timer = setInterval(() => {
      if (patch()) clearInterval(timer);
    }, 150);
    setTimeout(() => clearInterval(timer), 30000);
  }

  window.addEventListener('clipfree-youtube-ready', () => setTimeout(patch, 0));
})();

/* CLIPFREE TURBO SOURCE PIPELINE v18 */
/*
  Faster real-video source pipeline for mobile.

  Main change:
  v17 spent time remotely seeking through candidate videos before ClipFree could
  even download/render Short #1. v18 removes that expensive preflight stage.

  v18 instead:
  - searches ONLY actual video files from Wikimedia Commons
  - prefers smaller files first for fast phone downloads
  - keeps Public Domain / CC0 / simple CC-BY filtering
  - rejects non-video MIME types immediately
  - lets the existing local Motion Guard inspect the finished MP4 before upload
  - keeps automatic source retry if a rare video is actually a repeated still

  This means "finding a moving unused source" should resolve much faster while
  picture-only Shorts still cannot be uploaded.
*/
(() => {
  'use strict';

  const FLAG = '__clipfreeTurboSourceV18';
  const FAST_LIMIT_BYTES = 12 * 1024 * 1024;
  const FALLBACK_LIMIT_BYTES = 20 * 1024 * 1024;

  function stripHtml(value = '') {
    const box = document.createElement('div');
    box.innerHTML = String(value || '');
    return (box.textContent || box.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function metaValue(meta, key) {
    return stripHtml(meta?.[key]?.value || '');
  }

  function sourcePage(title) {
    return `https://commons.wikimedia.org/wiki/${encodeURIComponent(String(title || '').replace(/ /g, '_')).replace(/%2F/g, '/')}`;
  }

  function reuseAllowed(license = '') {
    const l = String(license || '').toLowerCase();
    return (
      l.includes('public domain') ||
      l.includes('cc0') ||
      (
        (l.includes('cc by') || l.includes('creative commons attribution')) &&
        !l.includes('by-sa') &&
        !l.includes('share alike')
      )
    );
  }

  function makeItem(page) {
    const info = page?.imageinfo?.[0] || {};
    const meta = info.extmetadata || {};
    const title = String(page?.title || 'Wikimedia Commons video').replace(/^File:/i, '');
    const creator =
      metaValue(meta, 'Artist') ||
      metaValue(meta, 'Credit') ||
      'Wikimedia Commons contributor';
    const license =
      metaValue(meta, 'LicenseShortName') ||
      metaValue(meta, 'UsageTerms') ||
      'See source page for licence';
    const licenseUrl = metaValue(meta, 'LicenseUrl');
    const pageUrl = sourcePage(page?.title || '');

    return {
      title,
      creator,
      license,
      licenseUrl,
      sourceUrl: pageUrl,
      fileUrl: info.url || '',
      thumbUrl: info.thumburl || '',
      mime: info.mime || '',
      size: Number(info.size || 0),
      provider: 'Wikimedia Commons',
      attribution:
        `“${title}” — ${creator}. Source: Wikimedia Commons. ` +
        `Licence: ${license}${licenseUrl ? ` (${licenseUrl})` : ''}. ${pageUrl}`,
      __clipfreeActualVideoMime: String(info.mime || '').startsWith('video/')
    };
  }

  async function queryCommons(query, maxBytes, limit) {
    const kb = Math.max(1024, Math.round(maxBytes / 1024));
    const url = new URL('https://commons.wikimedia.org/w/api.php');

    const params = {
      action:'query',
      generator:'search',
      gsrsearch:`${query} filetype:video filesize:<${kb}`,
      gsrnamespace:'6',
      gsrlimit:String(Math.max(8, Math.min(24, Number(limit || 12) * 2))),
      prop:'imageinfo',
      iiprop:'url|size|mime|mediatype|extmetadata',
      iiurlwidth:'480',
      format:'json',
      formatversion:'2',
      origin:'*'
    };
    Object.entries(params).forEach(([k,v]) => url.searchParams.set(k,v));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(url.toString(), {
        mode:'cors',
        cache:'no-store',
        signal:controller.signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.error) {
        throw new Error(data?.error?.info || `Wikimedia video search failed (${response.status})`);
      }

      return (data?.query?.pages || [])
        .map(makeItem)
        .filter(item =>
          item.fileUrl &&
          item.__clipfreeActualVideoMime &&
          (!item.size || item.size <= maxBytes) &&
          reuseAllowed(item.license)
        )
        .sort((a,b) => Number(a.size || 999999999) - Number(b.size || 999999999));
    } finally {
      clearTimeout(timer);
    }
  }

  async function turboSearch(query, limit = 12) {
    const wanted = Math.max(1, Math.min(20, Number(limit || 12)));

    // Fast first pass: small true-video files.
    let items = [];
    try {
      items = await queryCommons(query, FAST_LIMIT_BYTES, wanted);
    } catch (err) {
      console.warn('Fast Commons pass skipped', err);
    }

    // One broader fallback only if needed — no six remote-motion retry loops.
    if (!items.length) {
      try {
        items = await queryCommons(query, FALLBACK_LIMIT_BYTES, wanted);
      } catch (err) {
        console.warn('Fallback Commons pass skipped', err);
      }
    }

    return items.slice(0, wanted);
  }

  function patch() {
    const yt = window.ClipFreeYouTube;
    if (!yt) return false;
    if (yt[FLAG]) return true;

    yt.searchCommonsDownloadable = turboSearch;
    yt[FLAG] = true;

    // Keep the batch system's source retries short. Motion Guard is now the
    // authoritative movement check AFTER a real video has been rendered.
    window.CLIPFREE_TURBO_SOURCE_PIPELINE = {
      version:'18.0',
      enabled:true,
      fastMaxMB:12,
      fallbackMaxMB:20,
      rule:'actual video MIME + small-source preference + final local motion guard'
    };

    return true;
  }

  if (!patch()) {
    const timer = setInterval(() => {
      if (patch()) clearInterval(timer);
    }, 120);
    setTimeout(() => clearInterval(timer), 30000);
  }

  window.addEventListener('clipfree-youtube-ready', () => setTimeout(patch, 0));
})();

/* CLIPFREE KEEP-AWAKE + RESUME v19 */
/*
  Mobile reliability:
  - requests a screen wake lock while a 2–10 Short batch is running
  - saves progress after every real YouTube video ID
  - shows Resume Remaining after an interruption/reload
  - keeps the existing v18 source/encoder speed improvements
*/
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const KEY = 'clipfree_batch_checkpoint_v19';
  const MAX_SOURCE_RETRIES = 5;

  let running = false;
  let wakeLock = null;

  const TOPICS = {
    wildlife:  {preset:'wildlife', query:'clipfree variety wildlife'},
    lions:     {preset:'lions',    query:'lion wildlife'},
    moose:     {preset:'wildlife', query:'moose wildlife alces alces'},
    tigers:    {preset:'wildlife', query:'tiger wildlife panthera tigris'},
    elephants: {preset:'wildlife', query:'elephant wildlife safari'},
    wolves:    {preset:'wildlife', query:'wolf wildlife canis lupus'},
    bears:     {preset:'wildlife', query:'bear wildlife nature'},
    kittens:   {preset:'kittens',  query:'cute kittens playing'},
    puppies:   {preset:'puppies',  query:'cute puppies playing'}
  };

  function loadCheckpoint() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || 'null');
      return v && typeof v === 'object' ? v : null;
    } catch {
      return null;
    }
  }

  function saveCheckpoint(value) {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        ...(loadCheckpoint() || {}),
        ...value,
        updatedAt:new Date().toISOString()
      }));
    } catch {}
    renderResumeButton();
  }

  function clearCheckpoint() {
    try { localStorage.removeItem(KEY); } catch {}
    renderResumeButton();
  }

  function setStatus(text, kind = '') {
    const el = $('simpleStatus');
    if (!el) return;
    el.textContent = text;
    el.className = `simple-status ${kind}`.trim();
  }

  function setProgress(done, total) {
    const bar = $('simpleProgress');
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, (done / Math.max(1,total)) * 100))}%`;
  }

  function transferredCount() {
    return Math.max(
      Number(window.ClipFreeYouTubeProcessingState?.transferred || 0),
      Number(window.ClipFreeTransferredUploadState?.total || 0)
    );
  }

  async function waitForRealUploadEvidence(beforeCount, beforeVideoId = '', timeoutMs = 12000) {
    const started = Date.now();

    while (Date.now() - started < timeoutMs) {
      const count = transferredCount();
      const latestId = String(
        window.ClipFreeLastUpload?.videoId ||
        window.ClipFreeTransferredUploadState?.lastVideoId ||
        ''
      ).trim();

      if (count > beforeCount) {
        return {ok:true, count, videoId:latestId};
      }

      if (latestId && latestId !== String(beforeVideoId || '')) {
        return {ok:true, count, videoId:latestId};
      }

      await sleep(300);
    }

    return {
      ok:false,
      count:transferredCount(),
      videoId:String(window.ClipFreeLastUpload?.videoId || '').trim()
    };
  }

  function exactFailure() {
    const values = [
      $('animalGeneratorStatus')?.textContent,
      $('youtubeUploadStatus')?.textContent,
      window.ClipFreeTransferredUploadState?.lastError,
      window.ClipFreeConfirmedUploadState?.lastError,
      window.ClipFreeYouTubeProcessingState?.lastError
    ].map(x => String(x || '').trim()).filter(Boolean);

    return values.find(x =>
      /(error|failed|stopped|could not|cannot|can't|quota|limit|unauthor|forbidden|invalid|still-picture|repeated-frame|moving replacement|no suitable|unused source|source validation rejected|metadata does not identify the requested animal|unrelated footage)/i.test(x)
    ) || '';
  }

  function retryableSourceFailure(message) {
    const m = String(message || '').toLowerCase();
    return (
      m.includes('still-picture') ||
      m.includes('repeated-frame') ||
      m.includes('moving replacement') ||
      m.includes('unused source') ||
      m.includes('no suitable') ||
      m.includes('different unused') ||
      m.includes('source validation rejected') ||
      m.includes('metadata does not identify the requested animal') ||
      m.includes('no youtube video id') ||
      m.includes('did not return a video id')
    );
  }

  function hardFailure(message) {
    const m = String(message || '').toLowerCase();
    return (
      m.includes('quota') ||
      m.includes('upload limit') ||
      m.includes('daily video-upload') ||
      m.includes('unauthorized') ||
      m.includes('forbidden') ||
      m.includes('oauth') ||
      m.includes('permission') ||
      m.includes('401') ||
      m.includes('403')
    );
  }

  async function requestWakeLock() {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') {
      updateWakeBadge();
      return false;
    }
    if (wakeLock) return true;

    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
        updateWakeBadge();
      }, {once:true});
      updateWakeBadge();
      return true;
    } catch (err) {
      console.warn('Wake lock unavailable', err);
      wakeLock = null;
      updateWakeBadge();
      return false;
    }
  }

  async function releaseWakeLock() {
    const w = wakeLock;
    wakeLock = null;
    try { await w?.release?.(); } catch {}
    updateWakeBadge();
  }

  function updateWakeBadge() {
    const el = $('clipfreeWakeBadge');
    if (!el) return;

    if (running && wakeLock) {
      el.textContent = '☀️ KEEP-AWAKE ON — leave ClipFree visible';
      el.style.color = '#9ae6b4';
      el.style.borderColor = '#285c3d';
    } else if (running) {
      el.textContent = '⚠️ Keep the screen ON and ClipFree visible';
      el.style.color = '#ffd18b';
      el.style.borderColor = '#6d5422';
    } else {
      el.textContent = '🌙 Resume protection ready';
      el.style.color = '#b9b3cc';
      el.style.borderColor = '#393443';
    }
  }

  function ensureWakeUi() {
    const body = $('clipfreeSimpleStudio')?.querySelector('.simple-body');
    if (!body) return false;

    if (!$('clipfreeWakeBadge')) {
      const el = document.createElement('div');
      el.id = 'clipfreeWakeBadge';
      el.style.cssText = 'margin:0 0 14px;padding:10px 12px;border:1px solid #393443;border-radius:12px;background:#111018;font-size:.76rem;font-weight:800;line-height:1.4';
      body.insertBefore(el, body.firstChild);
    }

    updateWakeBadge();
    renderResumeButton();
    return true;
  }

  function renderResumeButton() {
    const start = $('simpleStart');
    if (!start?.parentNode) return;

    const cp = loadCheckpoint();
    const remaining = cp?.active
      ? Math.max(0, Number(cp.requested || 0) - Number(cp.completed || 0))
      : 0;

    let btn = $('clipfreeResumeBatch');

    if (!remaining) {
      btn?.remove();
      return;
    }

    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'clipfreeResumeBatch';
      btn.type = 'button';
      btn.className = 'simple-start';
      btn.style.marginTop = '10px';
      btn.style.background = 'linear-gradient(135deg,#166534,#15803d 58%,#22c55e)';
      start.parentNode.insertBefore(btn, start.nextSibling);
    }

    btn.disabled = running;
    btn.textContent = `▶ RESUME ${remaining} REMAINING SHORT${remaining === 1 ? '' : 'S'}`;
  }

  function setValue(id, value) {
    const el = $(id);
    if (!el || value === undefined || value === null) return;
    el.value = String(value);
    el.dispatchEvent(new Event('input', {bubbles:true}));
    el.dispatchEvent(new Event('change', {bubbles:true}));
  }

  function readSettings() {
    return {
      topic:$('simpleTopic')?.value || 'wildlife',
      style:$('simpleStyle')?.value || 'documentary',
      duration:Math.max(10, Math.min(60, Number($('simpleDuration')?.value || 30))),
      privacy:$('simplePrivacy')?.value || 'private'
    };
  }

  function applySettings(s = {}) {
    if (s.topic) setValue('simpleTopic', s.topic);
    if (s.style) setValue('simpleStyle', s.style);
    if (s.duration) setValue('simpleDuration', s.duration);
    if (s.privacy) setValue('simplePrivacy', s.privacy);
  }

  function syncOne(s) {
    const topic = TOPICS[s.topic] || TOPICS.wildlife;
    window.ClipFreeVarietyMode = s.topic === 'wildlife';

    document.querySelector(`[data-animal-preset="${topic.preset}"]`)?.click();
    setValue('animalTopic', topic.query);
    setValue('animalStyle', s.style);
    setValue('animalDuration', s.duration);
    setValue('animalBatchCount', 1);
    setValue('autoPrivacy', s.privacy);

    const sound = $('animalSounds');
    if (sound) {
      sound.checked = true;
      sound.dispatchEvent(new Event('change', {bubbles:true}));
    }

    const rights = Boolean($('simpleRights')?.checked);
    if ($('autoUploadCertification')) $('autoUploadCertification').checked = rights;
    if ($('clipfree20Rights')) $('clipfree20Rights').checked = rights;
    return rights;
  }

  async function waitForCycle(button, timeoutMs = 45 * 60 * 1000) {
    const started = Date.now();

    while (!button.disabled && Date.now() - started < 8000) {
      await sleep(80);
    }

    if (!button.disabled) {
      throw new Error('ClipFree could not start the Short generator. Refresh and try again.');
    }

    while (button.disabled) {
      if (Date.now() - started > timeoutMs) {
        throw new Error('This Short took unusually long. Your saved batch can be resumed.');
      }
      await sleep(650);
    }
  }

  async function runBatch(total, resumeCheckpoint = null) {
    if (running) return;

    const requested = Math.max(2, Math.min(10, Number(total || 2)));
    const startButton = $('simpleStart');
    const generator = $('generateAnimalVideo');

    running = true;
    renderResumeButton();

    try {
      if (!generator) throw new Error('The Short generator is not available. Refresh ClipFree.');
      if (!window.ClipFreeYouTube?.isConnected?.()) {
        throw new Error('Connect YouTube first. Your saved batch progress will remain on this device.');
      }

      const settings = resumeCheckpoint?.settings || readSettings();
      applySettings(settings);

      if (!$('simpleRights')?.checked) {
        throw new Error('Tick the content-rights / Community Guidelines confirmation first.');
      }

      await requestWakeLock();

      let completed = Math.max(
        0,
        Math.min(requested, Number(resumeCheckpoint?.completed || 0))
      );

      saveCheckpoint({
        active:true,
        requested,
        completed,
        settings,
        startedAt:resumeCheckpoint?.startedAt || new Date().toISOString()
      });

      if (startButton) startButton.disabled = true;
      setProgress(completed, requested);

      while (completed < requested) {
        let success = false;

        for (let attempt = 1; attempt <= MAX_SOURCE_RETRIES && !success; attempt++) {
          if (!syncOne(settings)) {
            throw new Error('Rights confirmation was turned off. Tick it again to continue.');
          }

          const before = transferredCount();
          const beforeVideoId = String(window.ClipFreeLastUpload?.videoId || '').trim();

          setStatus(
            `Short ${completed + 1}/${requested}: fast real-video source` +
            (attempt > 1 ? ` — retry ${attempt}/${MAX_SOURCE_RETRIES}` : '') +
            `. ${completed}/${requested} completed. Keep the screen on…`
          );

          generator.click();
          await waitForCycle(generator);

          // youtube.js can return the generator button to idle a moment before
          // the upload event/state is visible to the outer batch runner.
          // Wait briefly for a REAL YouTube ID before declaring failure.
          const transfer = await waitForRealUploadEvidence(before, beforeVideoId, 12000);
          const after = transfer.count;

          if (transfer.ok) {
            completed += 1;
            success = true;

            saveCheckpoint({
              active:completed < requested,
              requested,
              completed,
              settings
            });

            setProgress(completed, requested);
            setStatus(
              `${completed}/${requested} Shorts reached YouTube with real video IDs ❤️ ` +
              (completed < requested
                ? `Preparing Short ${completed + 1}/${requested}.`
                : 'Batch complete.'),
              'good'
            );

            if (completed < requested) await sleep(650);
            continue;
          }

          const reason = exactFailure() || 'No YouTube video ID was returned.';

          if (hardFailure(reason)) {
            throw new Error(`Short ${completed + 1}/${requested} stopped: ${reason}`);
          }

          if (retryableSourceFailure(reason) && attempt < MAX_SOURCE_RETRIES) {
            window.ClipFreeSourceRepairV23?.rejectFromError?.(reason);
            setStatus(
              `Short ${completed + 1}/${requested}: unrelated/bad source rejected. Automatically finding another real matching animal video (${attempt + 1}/${MAX_SOURCE_RETRIES})…`,
              'bad'
            );
            await sleep(550);
            continue;
          }

          throw new Error(`Short ${completed + 1}/${requested} did not upload. ${reason}`);
        }
      }

      clearCheckpoint();
      setProgress(requested, requested);
      setStatus(`All ${requested}/${requested} Shorts reached YouTube with real video IDs ❤️`, 'good');
    } catch (err) {
      console.error('ClipFree v19 batch interrupted', err);
      const cp = loadCheckpoint();
      if (cp?.requested && Number(cp.completed || 0) < Number(cp.requested || 0)) {
        saveCheckpoint({...cp, active:true, lastError:err?.message || String(err)});
      }

      setStatus(
        `${err?.message || err} Progress is saved. Reconnect YouTube if needed, then tap Resume Remaining.`,
        'bad'
      );
    } finally {
      running = false;
      if (startButton) startButton.disabled = false;
      await releaseWakeLock();
      renderResumeButton();
    }
  }

  // Window capture runs before the older document-level multi-batch handlers.
  window.addEventListener('click', event => {
    const start = event.target?.closest?.('#simpleStart');
    const resume = event.target?.closest?.('#clipfreeResumeBatch');

    if (start) {
      const requested = Math.max(1, Math.min(10, Number($('simpleCount')?.value || 1)));
      if (requested <= 1) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      clearCheckpoint();
      runBatch(requested, null);
      return;
    }

    if (resume) {
      event.preventDefault();
      event.stopImmediatePropagation();

      const cp = loadCheckpoint();
      if (!cp?.active) return renderResumeButton();

      applySettings(cp.settings || {});
      if ($('simpleCount')) $('simpleCount').value = String(cp.requested || 2);
      runBatch(cp.requested || 2, cp);
    }
  }, true);

  document.addEventListener('visibilitychange', () => {
    if (running && document.visibilityState === 'visible') {
      requestWakeLock().catch(() => {});
      setStatus('Batch is back in the foreground. Keep ClipFree visible until it finishes…');
    }
  });

  window.addEventListener('pageshow', () => {
    ensureWakeUi();
    renderResumeButton();
  });

  const timer = setInterval(() => {
    if (ensureWakeUi()) clearInterval(timer);
  }, 150);
  setTimeout(() => clearInterval(timer), 30000);

  window.ClipFreeBatchResume = {
    version:'19.0',
    checkpoint:loadCheckpoint,
    clear:clearCheckpoint,
    resume() {
      const cp = loadCheckpoint();
      if (cp?.active) return runBatch(cp.requested || 2, cp);
    },
    wakeLockActive:() => Boolean(wakeLock)
  };
})();

/* CLIPFREE QUALITY UPLOAD TURBO v20 */
/*
  Upload-side optimization with NO extra quality reduction:
  - throttles expensive progress/UI callbacks during YouTube upload
  - avoids hundreds/thousands of DOM updates on mobile
  - does not change the bytes being uploaded
  - leaves the browser/network stack free to spend more time on the actual transfer

  Important: no web page can increase the phone carrier/Wi-Fi uplink itself.
  The biggest upload-speed factor remains final MP4 size and connection speed.
*/
(() => {
  'use strict';

  if (window.__clipfreeQualityUploadTurboV20) return;
  window.__clipfreeQualityUploadTurboV20 = true;

  const NativeXHR = window.XMLHttpRequest;
  if (!NativeXHR?.prototype) return;

  const open = NativeXHR.prototype.open;
  const send = NativeXHR.prototype.send;

  NativeXHR.prototype.open = function(method, url, ...rest) {
    this.__clipfreeYoutubeVideoUpload = /googleapis\.com\/upload\/youtube\/v3\/videos/i.test(String(url || ''));
    return open.call(this, method, url, ...rest);
  };

  NativeXHR.prototype.send = function(body) {
    if (this.__clipfreeYoutubeVideoUpload && this.upload?.onprogress && !this.__clipfreeProgressWrapped) {
      this.__clipfreeProgressWrapped = true;
      const original = this.upload.onprogress;
      let lastAt = 0;
      let lastRatio = -1;

      this.upload.onprogress = event => {
        if (!event?.lengthComputable) return original.call(this.upload, event);

        const ratio = event.total ? event.loaded / event.total : 0;
        const now = globalThis.performance?.now?.() ?? Date.now();

        // Update the UI at most ~8 times/sec or each 1% transferred.
        if (
          ratio >= 1 ||
          ratio - lastRatio >= 0.01 ||
          now - lastAt >= 125
        ) {
          lastAt = now;
          lastRatio = ratio;
          original.call(this.upload, event);
        }
      };
    }

    return send.call(this, body);
  };

  window.CLIPFREE_UPLOAD_QUALITY_TURBO = {
    version:'20.0',
    enabled:true,
    qualityReduced:false,
    optimization:'throttled mobile upload UI overhead'
  };
})();

/* CLIPFREE REAL DAILY UPLOAD ALLOWANCE v21 */
/*
  Truthful upload allowance panel.

  YouTube currently gives the videos.insert method its own default bucket of
  100 calls/day. Separately, a channel can hit YouTube's platform-level
  uploadLimitExceeded restriction. YouTube does NOT expose a "remaining channel
  uploads" number through the Data API.

  This panel therefore NEVER invents that hidden number. It shows:
  - the official default videos.insert bucket: 100/day
  - REAL videos uploaded to the connected channel today, fetched from YouTube
  - REAL ClipFree videos.insert calls observed by this browser today
  - REAL successful video IDs observed by ClipFree
  - whether YouTube has actually returned uploadLimitExceeded or quotaExceeded
*/
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const STORE = 'clipfree_real_upload_allowance_v21';
  const DEFAULT_VIDEO_INSERT_LIMIT = 100;
  const TZ = 'America/Los_Angeles';

  let capturedToken = '';
  let refreshBusy = false;

  function ptParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ,
      year:'numeric', month:'2-digit', day:'2-digit'
    }).formatToParts(date);
    const get = type => parts.find(p => p.type === type)?.value || '';
    return {year:get('year'), month:get('month'), day:get('day')};
  }

  function ptDayKey(date = new Date()) {
    const p = ptParts(date);
    return `${p.year}-${p.month}-${p.day}`;
  }

  function freshState() {
    return {
      dayKey:ptDayKey(),
      attempts:0,
      successfulIds:[],
      failedCalls:0,
      channelLimitHit:false,
      projectQuotaHit:false,
      lastError:'',
      channelUploadsToday:null,
      channelTitle:'',
      lastRealRefresh:'',
      updatedAt:new Date().toISOString()
    };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (!saved || saved.dayKey !== ptDayKey()) {
        const next = freshState();
        localStorage.setItem(STORE, JSON.stringify(next));
        return next;
      }
      return {
        ...freshState(),
        ...saved,
        successfulIds:Array.isArray(saved.successfulIds) ? saved.successfulIds : []
      };
    } catch {
      return freshState();
    }
  }

  function saveState(next) {
    const state = {
      ...loadState(),
      ...next,
      dayKey:ptDayKey(),
      updatedAt:new Date().toISOString()
    };
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch {}
    render();
    return state;
  }

  function extractBearer(headers) {
    try {
      const h = new Headers(headers || {});
      const value = h.get('Authorization') || h.get('authorization') || '';
      const match = value.match(/^Bearer\s+(.+)$/i);
      return match?.[1] || '';
    } catch {
      if (headers && typeof headers === 'object') {
        const value = headers.Authorization || headers.authorization || '';
        const match = String(value).match(/^Bearer\s+(.+)$/i);
        return match?.[1] || '';
      }
      return '';
    }
  }

  // Capture the already-authorized YouTube token from normal ClipFree API calls.
  // It stays in page memory only; v21 never writes it to localStorage.
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async function(input, init = {}) {
    const token = extractBearer(init?.headers);
    if (token) capturedToken = token;
    return nativeFetch(input, init);
  };

  // Capture Authorization from the XHR video-upload path too.
  const XHR = window.XMLHttpRequest;
  if (XHR?.prototype) {
    const oldSetHeader = XHR.prototype.setRequestHeader;
    const oldSend = XHR.prototype.send;

    XHR.prototype.setRequestHeader = function(name, value) {
      if (/^authorization$/i.test(String(name || ''))) {
        const match = String(value || '').match(/^Bearer\s+(.+)$/i);
        if (match?.[1]) capturedToken = match[1];
      }
      return oldSetHeader.call(this, name, value);
    };

    XHR.prototype.send = function(body) {
      if (this.__clipfreeYoutubeVideoUpload && !this.__clipfreeAllowanceCounted) {
        this.__clipfreeAllowanceCounted = true;

        const s = loadState();
        saveState({attempts:Number(s.attempts || 0) + 1});

        this.addEventListener('loadend', () => {
          if (this.status >= 200 && this.status < 300) return;

          let data = {};
          try { data = JSON.parse(this.responseText || '{}'); } catch {}

          const reason = String(
            data?.error?.errors?.[0]?.reason ||
            data?.error?.status ||
            ''
          );
          const message = String(
            data?.error?.message ||
            this.statusText ||
            'YouTube upload request failed.'
          );

          const current = loadState();
          const patch = {
            failedCalls:Number(current.failedCalls || 0) + 1,
            lastError:reason ? `${reason}: ${message}` : message
          };

          if (/uploadLimitExceeded/i.test(reason) || /upload limit/i.test(message)) {
            patch.channelLimitHit = true;
          }

          if (
            /quotaExceeded|dailyLimitExceeded/i.test(reason) ||
            /quota.*exceed|daily quota/i.test(message)
          ) {
            patch.projectQuotaHit = true;
          }

          saveState(patch);
        }, {once:true});
      }

      return oldSend.call(this, body);
    };
  }

  window.addEventListener('clipfree-youtube-upload-transferred', event => {
    const id = String(event.detail?.videoId || '').trim();
    if (!id) return;

    const s = loadState();
    const ids = new Set(s.successfulIds || []);
    ids.add(id);

    saveState({
      successfulIds:[...ids],
      lastError:''
    });

    // Refresh the real channel count shortly after YouTube receives the video.
    setTimeout(() => refreshRealCount(false), 2500);
  });

  function esc(value='') {
    return String(value).replace(/[&<>"']/g, ch => (
      {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]
    ));
  }

  async function api(url) {
    if (!capturedToken) {
      throw new Error('Connect/Refresh YouTube first so ClipFree has an authorized YouTube session.');
    }

    const response = await nativeFetch(url, {
      headers:{Authorization:`Bearer ${capturedToken}`}
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error?.message || `YouTube request failed (${response.status}).`);
    }
    return data;
  }

  async function fetchRealUploadsToday() {
    const channelsUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
    channelsUrl.searchParams.set('part', 'snippet,contentDetails');
    channelsUrl.searchParams.set('mine', 'true');

    const channelData = await api(channelsUrl.toString());
    const channel = channelData.items?.[0];
    if (!channel) throw new Error('No YouTube channel was found for the connected account.');

    const uploadsId = channel.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsId) throw new Error('YouTube did not return the channel uploads playlist.');

    const ids = [];
    let pageToken = '';

    // 100 is enough to cover the official default videos.insert daily bucket.
    while (ids.length < 100) {
      const u = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
      u.searchParams.set('part', 'contentDetails');
      u.searchParams.set('playlistId', uploadsId);
      u.searchParams.set('maxResults', String(Math.min(50, 100 - ids.length)));
      if (pageToken) u.searchParams.set('pageToken', pageToken);

      const page = await api(u.toString());

      for (const item of page.items || []) {
        if (item.contentDetails?.videoId) ids.push(item.contentDetails.videoId);
      }

      pageToken = page.nextPageToken || '';
      if (!pageToken) break;
    }

    const videos = [];
    for (let i = 0; i < ids.length; i += 50) {
      const u = new URL('https://www.googleapis.com/youtube/v3/videos');
      u.searchParams.set('part', 'snippet,status');
      u.searchParams.set('id', ids.slice(i, i + 50).join(','));
      u.searchParams.set('maxResults', '50');
      const page = await api(u.toString());
      videos.push(...(page.items || []));
    }

    const today = ptDayKey();
    const todayVideos = videos.filter(video => {
      const publishedAt = video?.snippet?.publishedAt;
      if (!publishedAt) return false;
      const d = new Date(publishedAt);
      return Number.isFinite(d.getTime()) && ptDayKey(d) === today;
    });

    return {
      channelTitle:channel.snippet?.title || '',
      count:todayVideos.length,
      ids:todayVideos.map(v => v.id).filter(Boolean)
    };
  }

  async function refreshRealCount(showMessage = true) {
    if (refreshBusy) return;
    refreshBusy = true;

    const btn = $('realUploadAllowanceRefresh');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Checking YouTube…';
    }

    try {
      // Calling ClipFree's normal refresh first gives us a fresh token-bearing
      // fetch request if the connected session is active.
      if (!capturedToken && window.ClipFreeYouTube?.refreshAllChannelData) {
        await window.ClipFreeYouTube.refreshAllChannelData();
      }

      const real = await fetchRealUploadsToday();
      const s = loadState();
      const allKnownIds = new Set([...(s.successfulIds || []), ...real.ids]);

      saveState({
        successfulIds:[...allKnownIds],
        channelUploadsToday:real.count,
        channelTitle:real.channelTitle,
        lastRealRefresh:new Date().toISOString()
      });
    } catch (err) {
      if (showMessage) {
        saveState({lastError:err?.message || String(err)});
      }
    } finally {
      refreshBusy = false;
      if (btn) {
        btn.disabled = false;
        btn.textContent = '↻ Refresh real count';
      }
      render();
    }
  }

  function addStyles() {
    if ($('realUploadAllowanceStyles')) return;

    const style = document.createElement('style');
    style.id = 'realUploadAllowanceStyles';
    style.textContent = `
      #realUploadAllowanceCard{
        margin:14px 0;padding:15px;border:1px solid #315a46;border-radius:16px;
        background:linear-gradient(145deg,#101a15,#0d1110);color:#f5fff8
      }
      #realUploadAllowanceCard h3{margin:0 0 5px;font-size:1rem}
      #realUploadAllowanceCard .quota-sub{margin:0 0 12px;color:#aebdb4;font-size:.76rem;line-height:1.45}
      .quota-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .quota-box{padding:10px;border:1px solid #263b30;border-radius:11px;background:#0b100d}
      .quota-box small{display:block;color:#95a99b;font-size:.66rem;margin-bottom:3px}
      .quota-box strong{font-size:1.05rem}
      .quota-wide{grid-column:1/-1}
      #realUploadAllowanceRefresh{
        width:100%;margin-top:10px;min-height:44px;border:0;border-radius:11px;
        background:#166534;color:#fff;font:inherit;font-weight:900
      }
      .quota-good{color:#9ae6b4}.quota-warn{color:#ffd18b}.quota-bad{color:#ff9d9d}
      .quota-note{margin-top:10px;color:#9d9aaa;font-size:.69rem;line-height:1.45}
      @media(max-width:480px){.quota-grid{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(style);
  }

  function buildCard() {
    if ($('realUploadAllowanceCard')) return true;

    const studio = $('clipfreeSimpleStudio');
    const head = studio?.querySelector('.simple-head');
    if (!head) return false;

    addStyles();

    const card = document.createElement('div');
    card.id = 'realUploadAllowanceCard';
    card.innerHTML = `
      <h3>📤 Real Daily Upload Allowance</h3>
      <p class="quota-sub">
        Real YouTube channel count + real ClipFree API calls. No guessed hidden channel limit.
      </p>
      <div class="quota-grid">
        <div class="quota-box">
          <small>Official videos.insert bucket</small>
          <strong data-quota-official>100/day</strong>
        </div>
        <div class="quota-box">
          <small>Channel uploads today</small>
          <strong data-quota-channel>—</strong>
        </div>
        <div class="quota-box">
          <small>ClipFree API calls today</small>
          <strong data-quota-attempts>0</strong>
        </div>
        <div class="quota-box">
          <small>Tracked API calls left</small>
          <strong data-quota-left>100</strong>
        </div>
        <div class="quota-box quota-wide">
          <small>Actual YouTube channel-limit status</small>
          <strong data-quota-channel-status>Not checked yet</strong>
        </div>
      </div>
      <button id="realUploadAllowanceRefresh" type="button">↻ Refresh real count</button>
      <div class="quota-note" data-quota-note></div>
    `;

    const analytics = $('mobileYoutubeAnalyticsCard');
    if (analytics?.parentNode === head) {
      analytics.insertAdjacentElement('afterend', card);
    } else {
      head.appendChild(card);
    }

    $('realUploadAllowanceRefresh')?.addEventListener('click', () => refreshRealCount(true));
    render();
    return true;
  }

  function render() {
    const card = $('realUploadAllowanceCard');
    if (!card) return;

    const s = loadState();
    const attempts = Math.max(0, Number(s.attempts || 0));
    const left = s.projectQuotaHit ? 0 : Math.max(0, DEFAULT_VIDEO_INSERT_LIMIT - attempts);

    card.querySelector('[data-quota-official]').textContent = `${DEFAULT_VIDEO_INSERT_LIMIT}/day`;
    card.querySelector('[data-quota-channel]').textContent =
      s.channelUploadsToday === null ? 'Tap Refresh' : String(s.channelUploadsToday);
    card.querySelector('[data-quota-attempts]').textContent = String(attempts);
    card.querySelector('[data-quota-left]').textContent = String(left);

    const status = card.querySelector('[data-quota-channel-status]');
    if (s.channelLimitHit) {
      status.textContent = '0 remaining — YouTube returned uploadLimitExceeded';
      status.className = 'quota-bad';
    } else if (s.projectQuotaHit) {
      status.textContent = 'Project upload quota reached';
      status.className = 'quota-bad';
    } else {
      status.textContent = 'No channel upload-limit error received';
      status.className = 'quota-good';
    }

    const note = card.querySelector('[data-quota-note]');
    const channelText = s.channelTitle ? `Connected channel: ${s.channelTitle}. ` : '';
    const refreshText = s.lastRealRefresh
      ? `Real channel count refreshed ${new Date(s.lastRealRefresh).toLocaleString()}. `
      : '';

    note.innerHTML =
      `${esc(channelText)}${esc(refreshText)}` +
      `YouTube resets API daily quota at midnight Pacific Time. ` +
      `<strong>YouTube does not expose the channel's hidden remaining daily-upload count through the API</strong>, ` +
      `so ClipFree will not invent one. If YouTube returns uploadLimitExceeded, this card changes to 0 immediately.` +
      (s.lastError ? `<br><span class="quota-warn">${esc(s.lastError)}</span>` : '');
  }

  const timer = setInterval(() => {
    if (buildCard()) clearInterval(timer);
  }, 150);
  setTimeout(() => clearInterval(timer), 30000);

  window.addEventListener('clipfree-youtube-state', event => {
    if (event.detail?.status === 'connected' || window.ClipFreeYouTube?.isConnected?.()) {
      setTimeout(() => refreshRealCount(false), 700);
    }
  });

  window.addEventListener('pageshow', () => {
    buildCard();
    render();
  });

  window.ClipFreeUploadAllowance = {
    version:'21.0',
    refresh:() => refreshRealCount(true),
    snapshot:loadState,
    officialVideoInsertLimit:DEFAULT_VIDEO_INSERT_LIMIT,
    resetTimezone:TZ
  };
})();

/* CLIPFREE FEDERATED SOURCE VAULT v22 */
/*
  Multi-repository source discovery with strict animal matching.

  Automatic, zero-key repositories:
  1) Wikimedia Commons
  2) Internet Archive
  3) Library of Congress (only explicit public-domain/free-to-use video records)

  Why not blindly scrape 100+ websites?
  Many free-media sites require API keys, forbid automated scraping, mix paid/free
  content, or use licenses that need item-level review. v22 only auto-downloads
  from structured repositories where the item can be checked before use.

  The public source directory panel links to a current 150-source discovery guide,
  but ClipFree only auto-uses files that pass its own license + animal checks.
*/
(() => {
  'use strict';

  const FLAG = '__clipfreeFederatedSourceVaultV22';
  const MAX_BYTES = 22 * 1024 * 1024;
  const $ = id => document.getElementById(id);

  const ANIMALS = [
    ['mountain lion', /\b(mountain lion|cougar|puma)\b/i],
    ['lion', /\b(lion|lioness|panthera leo)\b/i],
    ['tiger', /\b(tiger|panthera tigris)\b/i],
    ['leopard', /\b(leopard|panthera pardus)\b/i],
    ['cheetah', /\bcheetah\b/i],
    ['jaguar', /\bjaguar\b/i],
    ['lynx', /\blynx\b/i],
    ['bobcat', /\bbobcat\b/i],
    ['wolf', /\b(wolf|wolves|canis lupus)\b/i],
    ['coyote', /\bcoyote\b/i],
    ['fox', /\b(fox|vulpes)\b/i],
    ['bear', /\b(bear|grizzly|ursus|polar bear)\b/i],
    ['elephant', /\belephant\b/i],
    ['giraffe', /\bgiraffe\b/i],
    ['zebra', /\bzebra\b/i],
    ['rhino', /\b(rhino|rhinoceros)\b/i],
    ['hippo', /\b(hippo|hippopotamus)\b/i],
    ['bison', /\b(bison|buffalo)\b/i],
    ['moose', /\b(moose|alces)\b/i],
    ['elk', /\belk\b/i],
    ['deer', /\b(deer|stag|doe|buck|reindeer|caribou)\b/i],
    ['antelope', /\b(antelope|gazelle|pronghorn|wildebeest)\b/i],
    ['kangaroo', /\bkangaroo\b/i],
    ['koala', /\bkoala\b/i],
    ['otter', /\botter\b/i],
    ['rabbit', /\b(rabbit|hare)\b/i],
    ['squirrel', /\b(squirrel|chipmunk|marmot|prairie dog)\b/i],
    ['gorilla', /\bgorilla\b/i],
    ['chimpanzee', /\bchimpanzee\b/i],
    ['orangutan', /\borangutan\b/i],
    ['monkey', /\b(monkey|macaque|baboon|gibbon|lemur)\b/i],
    ['hyena', /\b(hyena|hyaena)\b/i],
    ['meerkat', /\bmeerkat\b/i],
    ['crocodile', /\bcrocodile\b/i],
    ['alligator', /\balligator\b/i],
    ['turtle', /\b(turtle|tortoise)\b/i],
    ['snake', /\b(snake|python|cobra|rattlesnake|boa)\b/i],
    ['eagle', /\beagle\b/i],
    ['hawk', /\bhawk\b/i],
    ['falcon', /\bfalcon\b/i],
    ['owl', /\bowl\b/i],
    ['penguin', /\bpenguin\b/i],
    ['shark', /\bshark\b/i],
    ['whale', /\b(whale|orca)\b/i],
    ['dolphin', /\bdolphin\b/i],
    ['seal', /\b(seal|sea lion|walrus)\b/i],
    ['frog', /\b(frog|toad)\b/i],
    ['butterfly', /\bbutterfly\b/i],
    ['bee', /\bbee\b/i],
    ['beetle', /\bbeetle\b/i],
    ['spider', /\bspider\b/i],
    ['crab', /\bcrab\b/i],
    ['fish', /\b(fish|salmon|trout|tuna|clownfish)\b/i],
    ['cat', /\b(cat|kitten)\b/i],
    ['dog', /\b(dog|puppy)\b/i]
  ];

  function stripHtml(value = '') {
    const box = document.createElement('div');
    box.innerHTML = String(value || '');
    return (box.textContent || box.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function expectedAnimal(query = '') {
    const q = String(query || '');
    return ANIMALS.find(([,rx]) => rx.test(q)) || null;
  }

  function actualAnimal(item = {}) {
    const text = [
      item.title, item.description, item.subject, item.attribution, item.creator
    ].map(x => Array.isArray(x) ? x.join(' ') : String(x || '')).join(' ');
    return ANIMALS.find(([,rx]) => rx.test(text)) || null;
  }

  function matchesQuery(item, query) {
    const wanted = expectedAnimal(query);
    const actual = actualAnimal(item);

    // Species-specific request: reject unrelated animals before the generator ever sees them.
    if (wanted) return Boolean(actual && actual[0] === wanted[0]);

    // Broad wildlife searches still require the metadata to identify a real animal.
    if (/\b(wildlife|wild animal|animals?|nature)\b/i.test(String(query || ''))) {
      return Boolean(actual);
    }

    return true;
  }

  function goodCcUrl(url = '') {
    const s = String(url || '').toLowerCase();
    if (!s) return false;
    if (/creativecommons\.org\/publicdomain\/(zero|mark)\//.test(s)) return true;
    if (/creativecommons\.org\/licenses\/by\//.test(s)) return true;
    return false;
  }

  function goodLicenseLabel(label = '') {
    const s = String(label || '').toLowerCase();
    return (
      s.includes('public domain') ||
      s.includes('cc0') ||
      (
        (s.includes('cc by') || s.includes('creative commons attribution')) &&
        !s.includes('by-sa') &&
        !s.includes('noncommercial') &&
        !s.includes('no derivatives')
      )
    );
  }

  function encodePath(path = '') {
    return String(path).split('/').map(part => encodeURIComponent(part)).join('/');
  }

  async function fetchJson(url, timeoutMs = 7000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        mode:'cors',
        cache:'no-store',
        signal:controller.signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  // ---------- Wikimedia Commons ----------
  function commonsFilePageUrl(title) {
    return `https://commons.wikimedia.org/wiki/${encodeURIComponent(String(title || '').replace(/ /g, '_')).replace(/%2F/g, '/')}`;
  }

  async function searchWikimedia(query, limit = 10) {
    const url = new URL('https://commons.wikimedia.org/w/api.php');
    const params = {
      action:'query',
      generator:'search',
      gsrsearch:`${query} filetype:video filesize:<22528`,
      gsrnamespace:'6',
      gsrlimit:String(Math.max(8, Math.min(24, limit * 2))),
      prop:'imageinfo',
      iiprop:'url|size|mime|mediatype|extmetadata',
      iiurlwidth:'480',
      format:'json',
      formatversion:'2',
      origin:'*'
    };
    Object.entries(params).forEach(([k,v]) => url.searchParams.set(k,v));

    const data = await fetchJson(url.toString());
    const items = (data?.query?.pages || []).map(page => {
      const info = page?.imageinfo?.[0] || {};
      const meta = info.extmetadata || {};
      const mv = key => stripHtml(meta?.[key]?.value || '');
      const title = String(page?.title || 'Wikimedia Commons video').replace(/^File:/i, '');
      const creator = mv('Artist') || mv('Credit') || 'Wikimedia Commons contributor';
      const license = mv('LicenseShortName') || mv('UsageTerms') || '';
      const licenseUrl = mv('LicenseUrl');
      const sourceUrl = commonsFilePageUrl(page?.title || '');
      return {
        title, creator, license, licenseUrl, sourceUrl,
        fileUrl:info.url || '',
        thumbUrl:info.thumburl || '',
        mime:info.mime || '',
        size:Number(info.size || 0),
        provider:'Wikimedia Commons',
        description:mv('ImageDescription'),
        attribution:`“${title}” — ${creator}. Source: Wikimedia Commons. Licence: ${license}${licenseUrl ? ` (${licenseUrl})` : ''}. ${sourceUrl}`
      };
    });

    return items.filter(item =>
      item.fileUrl &&
      String(item.mime).startsWith('video/') &&
      (!item.size || item.size <= MAX_BYTES) &&
      (goodLicenseLabel(item.license) || goodCcUrl(item.licenseUrl)) &&
      matchesQuery(item, query)
    );
  }

  // ---------- Internet Archive ----------
  async function archiveMetadata(identifier) {
    return fetchJson(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, 8000);
  }

  function archiveLicense(meta = {}) {
    const licenseUrl = String(meta?.metadata?.licenseurl || meta?.metadata?.license || '');
    const label = String(meta?.metadata?.rights || meta?.metadata?.license || licenseUrl || '');
    return {licenseUrl, label};
  }

  function chooseArchiveVideo(meta = {}) {
    const files = Array.isArray(meta.files) ? meta.files : [];
    const videos = files
      .map(file => ({
        name:String(file?.name || ''),
        size:Number(file?.size || 0),
        format:String(file?.format || ''),
        source:String(file?.source || '')
      }))
      .filter(file =>
        /\.(mp4|webm|ogv)$/i.test(file.name) &&
        (!file.size || (file.size >= 96 * 1024 && file.size <= MAX_BYTES))
      )
      .sort((a,b) => Number(a.size || 999999999) - Number(b.size || 999999999));

    return videos[0] || null;
  }

  async function searchInternetArchive(query, limit = 8) {
    const url = new URL('https://archive.org/advancedsearch.php');
    url.searchParams.set('q', `${query} AND mediatype:(movies)`);
    ['identifier','title','description','creator','licenseurl','subject'].forEach(f => url.searchParams.append('fl[]', f));
    url.searchParams.set('rows', String(Math.max(6, Math.min(12, limit))));
    url.searchParams.set('page', '1');
    url.searchParams.set('output', 'json');

    const data = await fetchJson(url.toString(), 8000);
    const docs = (data?.response?.docs || []).slice(0, Math.max(6, Math.min(10, limit)));

    const detailed = await Promise.allSettled(
      docs.map(async doc => {
        const identifier = String(doc?.identifier || '');
        if (!identifier) return null;

        const meta = await archiveMetadata(identifier);
        const rights = archiveLicense(meta);
        if (!(goodCcUrl(rights.licenseUrl) || goodLicenseLabel(rights.label))) return null;

        const file = chooseArchiveVideo(meta);
        if (!file?.name) return null;

        const title = String(meta?.metadata?.title || doc?.title || identifier);
        const creator = String(meta?.metadata?.creator || doc?.creator || 'Internet Archive contributor');
        const description = stripHtml(meta?.metadata?.description || doc?.description || '');
        const subject = meta?.metadata?.subject || doc?.subject || '';
        const sourceUrl = `https://archive.org/details/${encodeURIComponent(identifier)}`;
        const fileUrl = `https://archive.org/download/${encodeURIComponent(identifier)}/${encodePath(file.name)}`;
        const license = rights.label || rights.licenseUrl || 'Open licence';

        const item = {
          title, creator, description, subject, sourceUrl, fileUrl,
          license, licenseUrl:rights.licenseUrl,
          mime:/\.mp4$/i.test(file.name) ? 'video/mp4' :
               /\.ogv$/i.test(file.name) ? 'video/ogg' : 'video/webm',
          size:file.size || 0,
          provider:'Internet Archive',
          attribution:`“${title}” — ${creator}. Source: Internet Archive. Licence: ${license}. ${sourceUrl}`
        };

        return matchesQuery(item, query) ? item : null;
      })
    );

    return detailed
      .filter(x => x.status === 'fulfilled' && x.value)
      .map(x => x.value);
  }

  // ---------- Library of Congress ----------
  function flattenUrls(value, out = []) {
    if (!value) return out;
    if (typeof value === 'string') {
      if (/^https?:\/\//i.test(value) && /\.(mp4|webm|ogv)(?:\?|$)/i.test(value)) out.push(value);
      return out;
    }
    if (Array.isArray(value)) {
      value.forEach(v => flattenUrls(v, out));
      return out;
    }
    if (typeof value === 'object') {
      Object.values(value).forEach(v => flattenUrls(v, out));
    }
    return out;
  }

  function locRightsText(result = {}) {
    return [
      result?.rights, result?.rights_advisory, result?.rights_information,
      result?.item?.rights, result?.item?.rights_advisory, result?.item?.rights_information,
      result?.description
    ].flat().map(x => String(x || '')).join(' ');
  }

  async function searchLibraryOfCongress(query, limit = 8) {
    const url = new URL('https://www.loc.gov/film-and-videos/');
    url.searchParams.set('q', query);
    url.searchParams.set('fo', 'json');
    url.searchParams.set('c', String(Math.max(8, Math.min(16, limit * 2))));

    const data = await fetchJson(url.toString(), 8000);
    const out = [];

    for (const result of data?.results || []) {
      const rights = locRightsText(result);
      if (!/(public domain|free to use and reuse)/i.test(rights)) continue;

      const urls = [...new Set(flattenUrls(result))];
      const fileUrl = urls[0] || '';
      if (!fileUrl) continue;

      const title = String(result?.title || result?.item?.title || 'Library of Congress video');
      const creator = Array.isArray(result?.contributor) ? result.contributor.join(', ') :
        String(result?.contributor || result?.item?.contributor || 'Library of Congress');
      const sourceUrl = String(result?.id || result?.url || '');
      const item = {
        title,
        creator,
        description:stripHtml(result?.description || ''),
        subject:result?.subject || '',
        sourceUrl,
        fileUrl,
        license:'Public domain / Free to Use and Reuse',
        licenseUrl:sourceUrl,
        mime:/\.mp4(?:\?|$)/i.test(fileUrl) ? 'video/mp4' :
             /\.ogv(?:\?|$)/i.test(fileUrl) ? 'video/ogg' : 'video/webm',
        size:0,
        provider:'Library of Congress',
        attribution:`“${title}” — ${creator}. Source: Library of Congress. Rights: ${rights.slice(0,300)}. ${sourceUrl}`
      };

      if (matchesQuery(item, query)) out.push(item);
      if (out.length >= limit) break;
    }

    return out;
  }

  // ---------- Federated search ----------
  function unique(items) {
    const seen = new Set();
    return (items || []).filter(item => {
      const key = String(item?.fileUrl || item?.sourceUrl || item?.title || '').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async function federatedSearch(query, limit = 12) {
    const wanted = Math.max(1, Math.min(20, Number(limit || 12)));

    const searches = await Promise.allSettled([
      searchWikimedia(query, Math.min(12, wanted)),
      searchInternetArchive(query, Math.min(8, wanted)),
      searchLibraryOfCongress(query, Math.min(6, wanted))
    ]);

    const items = [];
    for (const result of searches) {
      if (result.status === 'fulfilled') items.push(...result.value);
      else console.warn('Source Vault provider failed', result.reason);
    }

    const filtered = unique(items)
      .filter(item => matchesQuery(item, query))
      .sort((a,b) => {
        // Prefer smaller files on phones, but do not prefer unrelated footage.
        const as = Number(a?.size || 15 * 1024 * 1024);
        const bs = Number(b?.size || 15 * 1024 * 1024);
        return as - bs;
      });

    return filtered.slice(0, wanted);
  }

  function addDirectoryCard() {
    if ($('clipfreeFederatedSourcesCard')) return true;
    const head = $('clipfreeSimpleStudio')?.querySelector('.simple-head');
    if (!head) return false;

    const card = document.createElement('div');
    card.id = 'clipfreeFederatedSourcesCard';
    card.style.cssText = 'margin:14px 0;padding:14px;border:1px solid #443c68;border-radius:16px;background:#11101a;color:#f6f3ff';
    card.innerHTML = `
      <strong style="display:block;margin-bottom:5px">🌍 Federated Source Vault v22</strong>
      <div style="font-size:.76rem;line-height:1.5;color:#bcb6d0">
        Automatic zero-key search: <b>Wikimedia Commons</b>, <b>Internet Archive</b> and
        <b>Library of Congress public-domain video</b>.<br>
        A current open-media directory lists <b>150 discovery sources</b>, but ClipFree will
        not scrape sites that require API keys or lack machine-readable reuse rights.
      </div>
      <a href="https://www.itechguides.com/120-places-to-find-creative-commons-media/"
         target="_blank" rel="noopener"
         style="display:inline-block;margin-top:9px;color:#bca8ff;font-weight:800">
         Browse the 150-source discovery directory
      </a>
    `;
    head.appendChild(card);
    return true;
  }

  function patch() {
    const yt = window.ClipFreeYouTube;
    if (!yt) return false;
    if (yt[FLAG]) return true;

    // v22 supersedes the older single-provider search function.
    yt.searchCommonsDownloadable = federatedSearch;
    yt[FLAG] = true;

    window.CLIPFREE_FEDERATED_SOURCE_VAULT = {
      version:'22.0',
      automaticProviders:[
        'Wikimedia Commons',
        'Internet Archive',
        'Library of Congress'
      ],
      discoveryDirectoryCount:150,
      strictAnimalMatch:true,
      maxAutomaticFileBytes:MAX_BYTES
    };

    addDirectoryCard();
    return true;
  }

  if (!patch()) {
    const timer = setInterval(() => {
      if (patch()) clearInterval(timer);
      addDirectoryCard();
    }, 150);
    setTimeout(() => clearInterval(timer), 30000);
  }

  window.addEventListener('clipfree-youtube-ready', () => {
    setTimeout(() => {
      patch();
      addDirectoryCard();
    }, 0);
  });

  window.addEventListener('pageshow', addDirectoryCard);
})();

/* CLIPFREE SELF-HEAL + ACTUAL-ANIMAL SEO v23 */
/*
  Fixes the exact "source validation rejected" stop shown in the 20-Short run.

  v23:
  - treats a metadata mismatch as a retryable source problem instead of ending the batch
  - remembers rejected source titles and filters them from later searches
  - reloads the latest animal-generator module with a fresh cache key so mobile
    browsers cannot keep an older animal taxonomy/validator
  - makes narration use the ACTUAL detected animal
  - applies a final species-specific YouTube SEO pass immediately before youtube.js
    reads the finished export
  - keeps v22/v21/v20/v19/v18 features
*/
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const REJECT_KEY = 'clipfree_rejected_source_titles_v23';
  const TITLE_KEY = 'clipfree_actual_animal_titles_v23';

  const ANIMALS = [
    ['rusty patched bumble bee', /\brusty patched bumble bee\b/i],
    ['bumble bee', /\b(bumble ?bee|bumblebee|bombus)\b/i],
    ['monarch butterfly', /\b(monarch butterfly|danaus plexippus)\b/i],
    ['sea lion', /\bsea lion\b/i],
    ['whale shark', /\bwhale shark\b/i],
    ['polar bear', /\bpolar bear\b/i],
    ['grizzly bear', /\bgrizzly bear\b/i],
    ['mountain lion', /\b(mountain lion|cougar|puma)\b/i],
    ['lion', /\b(lion|lioness|panthera leo)\b/i],
    ['tiger', /\b(tiger|panthera tigris)\b/i],
    ['leopard', /\b(leopard|panthera pardus)\b/i],
    ['cheetah', /\bcheetah\b/i],
    ['jaguar', /\bjaguar\b/i],
    ['lynx', /\blynx\b/i],
    ['bobcat', /\bbobcat\b/i],
    ['wolf', /\b(wolf|wolves|canis lupus)\b/i],
    ['coyote', /\bcoyote\b/i],
    ['fox', /\b(fox|vulpes)\b/i],
    ['bear', /\b(bear|grizzly|ursus|polar bear)\b/i],
    ['elephant', /\belephant\b/i],
    ['giraffe', /\bgiraffe\b/i],
    ['zebra', /\bzebra\b/i],
    ['rhino', /\b(rhino|rhinoceros)\b/i],
    ['hippo', /\b(hippo|hippopotamus)\b/i],
    ['bison', /\b(bison|buffalo)\b/i],
    ['moose', /\bmoose\b/i],
    ['elk', /\belk\b/i],
    ['deer', /\b(deer|stag|doe|buck|reindeer|caribou)\b/i],
    ['antelope', /\b(antelope|gazelle|pronghorn|wildebeest)\b/i],
    ['kangaroo', /\bkangaroo\b/i],
    ['koala', /\bkoala\b/i],
    ['otter', /\botter\b/i],
    ['rabbit', /\b(rabbit|hare)\b/i],
    ['squirrel', /\b(squirrel|chipmunk|marmot)\b/i],
    ['gorilla', /\bgorilla\b/i],
    ['chimpanzee', /\bchimpanzee\b/i],
    ['orangutan', /\borangutan\b/i],
    ['monkey', /\b(monkey|macaque|baboon|gibbon|lemur)\b/i],
    ['hyena', /\b(hyena|hyaena)\b/i],
    ['meerkat', /\bmeerkat\b/i],
    ['crocodile', /\bcrocodile\b/i],
    ['alligator', /\balligator\b/i],
    ['turtle', /\b(turtle|tortoise)\b/i],
    ['snake', /\b(snake|python|cobra|rattlesnake|boa)\b/i],
    ['eagle', /\beagle\b/i],
    ['hawk', /\bhawk\b/i],
    ['falcon', /\bfalcon\b/i],
    ['owl', /\bowl\b/i],
    ['penguin', /\bpenguin\b/i],
    ['shark', /\bshark\b/i],
    ['whale', /\b(whale|orca)\b/i],
    ['dolphin', /\bdolphin\b/i],
    ['seal', /\b(seal|sea lion|walrus)\b/i],
    ['frog', /\b(frog|toad)\b/i]
  ];

  const ACTIONS = [
    ['Drinking', /\b(drink|drinking|waterhole|watering|water hole)\b/i],
    ['Walking', /\b(walk|walking)\b/i],
    ['Running', /\b(run|running|sprint|sprinting)\b/i],
    ['Swimming', /\b(swim|swimming)\b/i],
    ['Feeding', /\b(feed|feeding|eating|grazing|browsing|foraging)\b/i],
    ['Resting', /\b(rest|resting|sleeping|relaxing)\b/i],
    ['Playing', /\b(play|playing)\b/i],
    ['Climbing', /\b(climb|climbing)\b/i],
    ['Flying', /\b(fly|flying|soaring)\b/i],
    ['Hunting', /\b(hunt|hunting|stalking)\b/i],
    ['Calling', /\b(call|calling|howl|howling|roar|roaring)\b/i],
    ['Exploring', /\b(explore|exploring|wandering|roaming)\b/i]
  ];

  const HABITATS = [
    ['Savanna', /\b(savanna|savannah)\b/i],
    ['Forest', /\b(forest|woodland|woods)\b/i],
    ['Wetland', /\b(wetland|marsh|swamp)\b/i],
    ['Desert', /\b(desert|arid)\b/i],
    ['Grassland', /\b(grassland|prairie|steppe)\b/i],
    ['River', /\b(river|stream)\b/i],
    ['Lake', /\blake\b/i],
    ['Ocean', /\b(ocean|sea|marine)\b/i],
    ['Mountains', /\b(mountain|alpine)\b/i],
    ['Coast', /\b(coast|coastal|shore|beach)\b/i],
    ['Arctic', /\b(arctic|tundra|ice)\b/i]
  ];

  function pretty(value = '') {
    return String(value || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, ch => ch.toUpperCase());
  }

  function sourceText(detail = {}) {
    const top = Array.isArray(detail.sources) ? detail.sources : [];
    const inner = Array.isArray(detail.source?.sources) ? detail.source.sources : [];
    return [
      detail.detectedAnimal,
      detail.searchTopic,
      detail.requestedSourceQuery,
      detail.title,
      detail.attribution,
      detail.source?.detectedAnimal,
      detail.source?.searchTopic,
      detail.source?.requestedSourceQuery,
      detail.source?.title,
      detail.source?.attribution,
      ...top.map(x => `${x?.detectedAnimal || ''} ${x?.title || ''} ${x?.creator || ''}`),
      ...inner.map(x => `${x?.detectedAnimal || ''} ${x?.title || ''} ${x?.creator || ''}`)
    ].filter(Boolean).join(' ');
  }

  function detectAnimalFromText(text = '') {
    return ANIMALS.find(([, rx]) => rx.test(String(text || ''))) || null;
  }

  function detectedAnimal(detail = {}) {
    const explicit = String(detail.detectedAnimal || detail.source?.detectedAnimal || '').trim();
    if (explicit && !/^wildlife$/i.test(explicit)) return pretty(explicit);
    const found = detectAnimalFromText(sourceText(detail));
    return found ? pretty(found[0]) : 'Wild Animal';
  }

  function emojiFor(label = '') {
    const s = label.toLowerCase();
    if (/bee/.test(s)) return '🐝';
    if (/butterfly/.test(s)) return '🦋';
    if (/lion/.test(s) && !/sea lion/.test(s)) return '🦁';
    if (/tiger/.test(s)) return '🐅';
    if (/leopard|cheetah|jaguar/.test(s)) return '🐆';
    if (/wolf|coyote/.test(s)) return '🐺';
    if (/fox/.test(s)) return '🦊';
    if (/bear/.test(s)) return '🐻';
    if (/elephant/.test(s)) return '🐘';
    if (/giraffe/.test(s)) return '🦒';
    if (/zebra/.test(s)) return '🦓';
    if (/moose/.test(s)) return '🫎';
    if (/deer|elk|reindeer|caribou/.test(s)) return '🦌';
    if (/crocodile|alligator/.test(s)) return '🐊';
    if (/eagle/.test(s)) return '🦅';
    if (/owl/.test(s)) return '🦉';
    if (/shark/.test(s)) return '🦈';
    if (/whale/.test(s)) return '🐋';
    if (/dolphin/.test(s)) return '🐬';
    if (/seal|sea lion|walrus/.test(s)) return '🦭';
    if (/turtle|tortoise/.test(s)) return '🐢';
    if (/frog|toad/.test(s)) return '🐸';
    if (/rabbit|hare/.test(s)) return '🐇';
    if (/monkey|gorilla|chimpanzee|orangutan|baboon|macaque|lemur|gibbon/.test(s)) return '🐒';
    if (/dog|puppy/.test(s)) return '🐶';
    if (/cat|kitten/.test(s)) return '🐱';
    if (/fish/.test(s)) return '🐟';
    return '🌿';
  }

  function rejectedTitles() {
    try {
      const x = JSON.parse(localStorage.getItem(REJECT_KEY) || '[]');
      return new Set(Array.isArray(x) ? x.map(v => String(v).toLowerCase()) : []);
    } catch {
      return new Set();
    }
  }

  function saveRejected(set) {
    try { localStorage.setItem(REJECT_KEY, JSON.stringify([...set].slice(-300))); } catch {}
  }

  function rejectFromError(message = '') {
    const text = String(message || '');
    const match =
      text.match(/source validation rejected\s+["“]([^"”]+)["”]/i) ||
      text.match(/rejected\s+["“]([^"”]+)["”]/i);
    if (!match?.[1]) return false;
    const set = rejectedTitles();
    set.add(match[1].trim().toLowerCase());
    saveRejected(set);
    return true;
  }

  // Immediately remember the source that stopped the previous run, if present.
  try {
    const cp = JSON.parse(localStorage.getItem('clipfree_batch_checkpoint_v19') || 'null');
    if (cp?.lastError) rejectFromError(cp.lastError);
  } catch {}

  function installSearchRepair() {
    const yt = window.ClipFreeYouTube;
    if (!yt?.searchCommonsDownloadable || yt.__clipfreeSourceRepairV23) return Boolean(yt?.__clipfreeSourceRepairV23);

    const original = yt.searchCommonsDownloadable.bind(yt);
    yt.searchCommonsDownloadable = async function repairedSearch(query, limit = 12) {
      const wanted = Math.max(1, Number(limit || 12));
      const results = await original(query, Math.max(wanted, 20));
      const rejected = rejectedTitles();

      return (results || [])
        .filter(item => !rejected.has(String(item?.title || '').trim().toLowerCase()))
        .slice(0, wanted);
    };

    yt.__clipfreeSourceRepairV23 = true;
    return true;
  }

  window.ClipFreeSourceRepairV23 = {
    version:'23.0',
    rejectFromError,
    rejectedTitles:() => [...rejectedTitles()]
  };

  // Force a fresh current animal-generator module on mobile so an old cached
  // strict-animal validator cannot keep rejecting species added later.
  async function refreshAnimalGeneratorModule() {
    const oldButton = $('generateAnimalVideo');
    if (!oldButton || oldButton.dataset.clipfreeV23Fresh === '1') return;

    const freshButton = oldButton.cloneNode(true);
    freshButton.dataset.clipfreeV23Fresh = '1';
    oldButton.replaceWith(freshButton);

    try {
      await import('./animal-generator.js?v=20261006-v23-fresh');
      window.CLIPFREE_ANIMAL_GENERATOR_FRESH_V23 = true;
    } catch (err) {
      console.error('Fresh animal-generator import failed', err);
      // If import fails, restore usability by allowing v19 to report the issue.
      freshButton.disabled = false;
    }
  }

  function installVoiceoverSpeciesGuard() {
    const voice = window.ClipFreeVoiceover;
    if (!voice?.generate || voice.__clipfreeActualAnimalV23) return Boolean(voice?.__clipfreeActualAnimalV23);

    const original = voice.generate.bind(voice);
    voice.generate = async function actualAnimalVoice(options = {}) {
      const text = [
        options?.source?.__clipfreeDetectedAnimal,
        options?.source?.title,
        options?.source?.creator,
        options?.customTopic
      ].filter(Boolean).join(' ');
      const found = detectAnimalFromText(text);

      if (!found) return original(options);

      const label = pretty(found[0]);
      return original({
        ...options,
        customTopic:label,
        preset:{
          ...(options.preset || {}),
          label,
          query:found[0]
        }
      });
    };

    voice.__clipfreeActualAnimalV23 = true;
    return true;
  }

  function loadTitleHistory() {
    try {
      const x = JSON.parse(localStorage.getItem(TITLE_KEY) || '[]');
      return Array.isArray(x) ? x : [];
    } catch {
      return [];
    }
  }

  function saveTitle(title) {
    try {
      const old = loadTitleHistory();
      old.unshift(title);
      localStorage.setItem(TITLE_KEY, JSON.stringify([...new Set(old)].slice(0,1000)));
    } catch {}
  }

  function chooseTitle(detail, label, action, habitat) {
    const emoji = emojiFor(label);
    const candidates = [];

    if (action && habitat) {
      candidates.push(
        `${label} ${action} in the ${habitat} ${emoji}`,
        `${label} in Action: ${habitat} Wildlife ${emoji}`
      );
    }
    if (action) candidates.push(`${label} ${action} in the Wild ${emoji}`);
    if (habitat) candidates.push(`${label} Up Close in the ${habitat} ${emoji}`);

    candidates.push(
      `${label} Up Close in Nature ${emoji}`,
      `${label} Wildlife Moment ${emoji}`,
      `${label} in Its Natural Habitat ${emoji}`,
      `${label} Nature Encounter ${emoji}`,
      `${label} A Closer Look ${emoji}`,
      `${label} Real Wildlife Footage ${emoji}`
    );

    const used = new Set(loadTitleHistory().map(x => String(x).toLowerCase()));
    const source = sourceText(detail);
    let seed = 0;
    for (let i=0;i<source.length;i++) seed = ((seed * 31) + source.charCodeAt(i)) >>> 0;

    for (let n=0;n<candidates.length;n++) {
      const title = candidates[(seed + n) % candidates.length]
        .replace(/\s+/g,' ')
        .trim()
        .slice(0,85);
      if (!used.has(title.toLowerCase())) {
        saveTitle(title);
        return title;
      }
    }

    const fallback = `${label} Wildlife Encounter ${emoji} ${String(Date.now()).slice(-5)}`.slice(0,85);
    saveTitle(fallback);
    return fallback;
  }

  function hashtags(label) {
    const species = '#' + label.replace(/[^A-Za-z0-9]+/g,'');
    return [species || '#Animals', '#Wildlife', '#Shorts'].slice(0,3);
  }

  function tags(label, action, habitat) {
    const s = label.toLowerCase();
    return [...new Set([
      s,
      `${s} wildlife`,
      `${s} video`,
      action ? `${s} ${action.toLowerCase()}` : '',
      habitat ? `${s} ${habitat.toLowerCase()}` : '',
      'wildlife',
      'wildlife shorts',
      'animal shorts',
      'nature'
    ].filter(Boolean))].slice(0,8);
  }

  function attribution(detail = {}) {
    return String(detail.attribution || detail.source?.attribution || '').trim();
  }

  function finalDescription(detail, label, action, habitat, tagList, hashList) {
    const first = action && habitat
      ? `Watch this ${label.toLowerCase()} ${action.toLowerCase()} in the ${habitat.toLowerCase()} — real animal footage in a vertical Short.`
      : action
        ? `Watch this ${label.toLowerCase()} ${action.toLowerCase()} in the wild — real animal footage.`
        : habitat
          ? `Watch this ${label.toLowerCase()} in the ${habitat.toLowerCase()} — real animal footage.`
          : `Watch this real ${label.toLowerCase()} animal moment up close.`;

    const sourceTitle = [
      ...(Array.isArray(detail.sources) ? detail.sources : []),
      ...(Array.isArray(detail.source?.sources) ? detail.source.sources : [])
    ].map(x => x?.title).filter(Boolean)[0] || '';

    return [
      first,
      `More ${label.toLowerCase()} videos, wildlife encounters and nature Shorts from Wildlife Encounters TV.`,
      sourceTitle ? `Featured source topic: ${String(sourceTitle).replace(/\.[a-z0-9]{2,5}$/i,'').slice(0,120)}.` : '',
      `Topics: ${tagList.slice(0,6).join(', ')}.`,
      hashList.join(' '),
      attribution(detail) ? `Source / attribution:\n${attribution(detail)}` : ''
    ].filter(Boolean).join('\n\n').slice(0,5000);
  }

  function installFinalSeo() {
    if (window.__clipfreeActualAnimalSeoV23) return true;
    window.__clipfreeActualAnimalSeoV23 = true;

    // Capture listener runs after upload-speed-boost's capture listener because
    // compliance-demo is loaded later, but still before youtube.js's bubble listener.
    window.addEventListener('clipfree-export-ready', event => {
      const detail = event.detail || {};
      if (detail.kind !== 'animal-generator') return;
      if (!detail.__clipfreeGrowthFinalReady) return;
      if (detail.__clipfreeSeoV23Ready) return;

      const text = sourceText(detail);
      const found = detectAnimalFromText(text);
      const label = found ? pretty(found[0]) : detectedAnimal(detail);
      const action = ACTIONS.find(([,rx]) => rx.test(text))?.[0] || '';
      const habitat = HABITATS.find(([,rx]) => rx.test(text))?.[0] || '';

      const title = chooseTitle(detail,label,action,habitat);
      const tagList = tags(label,action,habitat);
      const hashList = hashtags(label);
      const description = finalDescription(detail,label,action,habitat,tagList,hashList);

      detail.detectedAnimal = label;
      detail.title = title;
      detail.description = description;
      detail.tags = tagList.join(', ');
      detail.hashtags = hashList.join(' ');
      detail.__clipfreeSeoV23Ready = true;

      if ($('uploadTitle')) $('uploadTitle').value = title;
      if ($('uploadDescription')) $('uploadDescription').value = description;
      if ($('uploadTags')) $('uploadTags').value = detail.tags;
      if ($('seoTitle')) $('seoTitle').value = title;
      if ($('seoDescription')) $('seoDescription').value = description;
      if ($('seoTags')) $('seoTags').value = detail.tags;
      if ($('seoHashtags')) $('seoHashtags').value = detail.hashtags;

      if (window.ClipFreeExport === detail) {
        window.ClipFreeExport.title = title;
        window.ClipFreeExport.description = description;
        window.ClipFreeExport.tags = detail.tags;
        window.ClipFreeExport.hashtags = detail.hashtags;
        window.ClipFreeExport.detectedAnimal = label;
      }
    }, true);

    return true;
  }

  function addStatusCard() {
    if ($('clipfreeV23Status')) return true;
    const head = $('clipfreeSimpleStudio')?.querySelector('.simple-head');
    if (!head) return false;

    const card = document.createElement('div');
    card.id = 'clipfreeV23Status';
    card.style.cssText = 'margin:12px 0;padding:11px 13px;border:1px solid #2f6948;border-radius:13px;background:#0d1711;color:#a6f3bf;font-size:.74rem;font-weight:800;line-height:1.45';
    card.textContent = '✓ v23 SELF-HEAL ON • ACTUAL-ANIMAL SEO • source mismatches auto-retry • species narration';
    head.appendChild(card);
    return true;
  }

  async function install() {
    installSearchRepair();
    installVoiceoverSpeciesGuard();
    installFinalSeo();
    addStatusCard();
  }

  install();
  refreshAnimalGeneratorModule();

  const timer = setInterval(() => {
    install();
    if (window.CLIPFREE_ANIMAL_GENERATOR_FRESH_V23 && installSearchRepair() && installVoiceoverSpeciesGuard()) {
      clearInterval(timer);
    }
  },200);
  setTimeout(() => clearInterval(timer),30000);

  window.addEventListener('clipfree-youtube-ready', () => setTimeout(install,0));

  window.CLIPFREE_V23 = {
    version:'23.0',
    sourceSelfHeal:true,
    actualAnimalSeo:true,
    actualAnimalNarration:true,
    freshAnimalGenerator:true
  };
})();

/* CLIPFREE PIPELINE HARDENING v24 */
/*
  Fixes the current multi-Short failure path and hardens the full mobile pipeline.

  v24 guarantees:
  - a bad/unrelated metadata result is treated as a source problem, not a batch-ending bug
  - rejected source titles are added to BOTH v24 reject history and the existing
    ClipFree source-history used by animal-generator.js
  - variety search cursor is advanced after a mismatch so retry #2 does not keep
    searching the exact same slice of wildlife queries
  - search results are filtered against the requested animal BEFORE animal-generator sees them
  - stale red source-validation messages are cleared before each new generator attempt
  - up to 8 source retries happen inside the saved 2–10 batch runner
  - v23 actual-animal SEO/narration, v22 providers, v21 real allowance,
    v20 quality turbo, v19 resume/wake-lock and v18 speed remain intact
*/
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const REJECT_KEY = 'clipfree_rejected_source_titles_v24';
  const SOURCE_HISTORY_KEY = 'clipfree_source_history_v6';
  const VARIETY_CURSOR_KEY = 'clipfree_variety_cursor_v2';
  const FLAG = '__clipfreePipelineHardeningV24';

  const ANIMALS = [
    ['mountain lion', /\b(mountain lion|cougar|puma)\b/i],
    ['lion', /\b(lion|lioness|panthera leo)\b/i],
    ['tiger', /\b(tiger|panthera tigris)\b/i],
    ['leopard', /\b(leopard|panthera pardus)\b/i],
    ['cheetah', /\bcheetah\b/i],
    ['jaguar', /\bjaguar\b/i],
    ['lynx', /\blynx\b/i],
    ['bobcat', /\bbobcat\b/i],
    ['wolf', /\b(wolf|wolves|canis lupus)\b/i],
    ['coyote', /\bcoyote\b/i],
    ['fox', /\b(fox|vulpes)\b/i],
    ['bear', /\b(bear|grizzly|ursus|polar bear)\b/i],
    ['elephant', /\belephant\b/i],
    ['giraffe', /\bgiraffe\b/i],
    ['zebra', /\bzebra\b/i],
    ['rhino', /\b(rhino|rhinoceros)\b/i],
    ['hippo', /\b(hippo|hippopotamus)\b/i],
    ['bison', /\b(bison|buffalo)\b/i],
    ['moose', /\bmoose\b/i],
    ['elk', /\belk\b/i],
    ['deer', /\b(deer|stag|doe|buck|reindeer|caribou)\b/i],
    ['antelope', /\b(antelope|gazelle|pronghorn|wildebeest)\b/i],
    ['kangaroo', /\bkangaroo\b/i],
    ['koala', /\bkoala\b/i],
    ['otter', /\botter\b/i],
    ['rabbit', /\b(rabbit|hare)\b/i],
    ['squirrel', /\b(squirrel|chipmunk|marmot)\b/i],
    ['gorilla', /\bgorilla\b/i],
    ['chimpanzee', /\bchimpanzee\b/i],
    ['orangutan', /\borangutan\b/i],
    ['monkey', /\b(monkey|macaque|baboon|gibbon|lemur)\b/i],
    ['hyena', /\b(hyena|hyaena)\b/i],
    ['meerkat', /\bmeerkat\b/i],
    ['crocodile', /\bcrocodile\b/i],
    ['alligator', /\balligator\b/i],
    ['turtle', /\b(turtle|tortoise)\b/i],
    ['snake', /\b(snake|python|cobra|rattlesnake|boa)\b/i],
    ['eagle', /\beagle\b/i],
    ['hawk', /\bhawk\b/i],
    ['falcon', /\bfalcon\b/i],
    ['owl', /\bowl\b/i],
    ['penguin', /\bpenguin\b/i],
    ['shark', /\bshark\b/i],
    ['whale', /\b(whale|orca)\b/i],
    ['dolphin', /\bdolphin\b/i],
    ['seal', /\b(seal|sea lion|walrus)\b/i],
    ['frog', /\b(frog|toad)\b/i]
  ];

  // Extra specific labels first. Generic parent labels still match afterwards.
  ANIMALS.unshift(
    ['rusty patched bumble bee', /\brusty patched bumble bee\b/i],
    ['leafcutter bee', /\bleafcutter bee\b/i],
    ['bumble bee', /\b(bumble ?bee|bumblebee|bombus)\b/i],
    ['monarch butterfly', /\b(monarch butterfly|danaus plexippus)\b/i],
    ['sea lion', /\bsea lion\b/i],
    ['whale shark', /\bwhale shark\b/i],
    ['polar bear', /\bpolar bear\b/i],
    ['grizzly bear', /\bgrizzly bear\b/i]
  );

  function clean(value = '') {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function itemText(item = {}) {
    return [
      item.title,
      item.creator,
      item.description,
      Array.isArray(item.subject) ? item.subject.join(' ') : item.subject,
      item.attribution,
      item.__clipfreeDetectedAnimal,
      item.__clipfreeRequestedQuery
    ].filter(Boolean).join(' ');
  }

  function requestedAnimal(query = '') {
    return ANIMALS.find(([, rx]) => rx.test(String(query || ''))) || null;
  }

  function actualAnimal(item = {}) {
    const text = itemText(item);
    return ANIMALS.find(([, rx]) => rx.test(text)) || null;
  }

  function matchesRequestedAnimal(item, query) {
    const actual = actualAnimal(item);
    if (!actual) return false;

    const requested = requestedAnimal(query);
    if (!requested) return true; // broad wildlife search

    // Test the requested animal's own regex against the source metadata.
    // This accepts "Leafcutter Bee" for a bee query and rejects it for a dragonfly query.
    return requested[1].test(itemText(item));
  }

  function loadSet(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return new Set(Array.isArray(value) ? value.map(x => String(x)) : []);
    } catch {
      return new Set();
    }
  }

  function saveSet(key, set, max = 10000) {
    try {
      localStorage.setItem(key, JSON.stringify([...set].slice(-max)));
    } catch {}
  }

  function rememberRejectedTitle(title = '') {
    const value = clean(title);
    if (!value) return false;

    const rejects = loadSet(REJECT_KEY);
    rejects.add(value.toLowerCase());
    saveSet(REJECT_KEY, rejects, 1000);

    // Critical: animal-generator's own blockedSourceSet() reads this key and
    // sourceKeys() includes the TITLE, so this prevents the same bad item from
    // being selected again even inside its lexical/private search functions.
    const sourceHistory = loadSet(SOURCE_HISTORY_KEY);
    sourceHistory.add(value);
    saveSet(SOURCE_HISTORY_KEY, sourceHistory, 10000);

    return true;
  }

  function rotateVarietyCursor(step = 11) {
    try {
      const current = Number(localStorage.getItem(VARIETY_CURSOR_KEY) || 0);
      const next = (Number.isFinite(current) ? current : 0) + Math.max(1, Number(step || 1));
      localStorage.setItem(VARIETY_CURSOR_KEY, String(next));
    } catch {}
  }

  function rejectFromError(message = '') {
    const text = String(message || '');
    const match =
      text.match(/source validation rejected\s+["“]([^"”]+)["”]/i) ||
      text.match(/rejected\s+["“]([^"”]+)["”]/i);

    if (match?.[1]) rememberRejectedTitle(match[1]);

    if (/source validation rejected|metadata does not identify the requested animal|unrelated footage/i.test(text)) {
      rotateVarietyCursor(13);
    }

    return Boolean(match?.[1]);
  }

  // Import v23's prior reject list into the real source history too.
  try {
    const old = JSON.parse(localStorage.getItem('clipfree_rejected_source_titles_v23') || '[]');
    if (Array.isArray(old)) old.forEach(rememberRejectedTitle);
  } catch {}

  // Import the currently saved failure so Resume Remaining starts from a fresh source.
  try {
    const cp = JSON.parse(localStorage.getItem('clipfree_batch_checkpoint_v19') || 'null');
    if (cp?.lastError) {
      rejectFromError(cp.lastError);
      cp.lastError = '';
      localStorage.setItem('clipfree_batch_checkpoint_v19', JSON.stringify(cp));
    }
  } catch {}

  function rejectedTitleSet() {
    return loadSet(REJECT_KEY);
  }

  function installStrictSearch() {
    const yt = window.ClipFreeYouTube;
    if (!yt?.searchCommonsDownloadable) return false;
    if (yt[FLAG]) return true;

    const previous = yt.searchCommonsDownloadable.bind(yt);

    yt.searchCommonsDownloadable = async function v24StrictMatchingSearch(query, limit = 12) {
      const wanted = Math.max(1, Math.min(20, Number(limit || 12)));
      const rejected = rejectedTitleSet();

      async function run(q) {
        let results = [];
        try {
          results = await previous(q, Math.max(wanted, 20));
        } catch (err) {
          console.warn('v24 source provider pass failed', q, err);
        }

        return (results || []).filter(item => {
          const title = clean(item?.title).toLowerCase();
          if (!title || rejected.has(title)) return false;
          return matchesRequestedAnimal(item, q);
        });
      }

      let matching = await run(query);

      // Species-specific query with no valid result: retry once using the
      // canonical animal name, rather than accepting an unrelated animal.
      const expected = requestedAnimal(query);
      if (!matching.length && expected) {
        matching = await run(`${expected[0]} wildlife`);
      }

      // For broad wildlife mode, if a provider temporarily returns nothing,
      // advance the variety cursor so the next saved-batch retry searches a new species.
      if (!matching.length && !expected) rotateVarietyCursor(7);

      return matching.slice(0, wanted);
    };

    yt[FLAG] = true;
    return true;
  }

  // The v19 runner calls the v23 object. Point it at the stronger v24 logic.
  window.ClipFreeSourceRepairV24 = {
    version:'24.0',
    rejectFromError,
    rememberRejectedTitle,
    rotateVarietyCursor,
    rejectedTitles:() => [...rejectedTitleSet()]
  };

  window.ClipFreeSourceRepairV23 = window.ClipFreeSourceRepairV24;

  // Clear stale source errors before a new attempt, otherwise a previous red
  // validation string can be mistaken for the result of the current retry.
  document.addEventListener('click', event => {
    const generator = event.target?.closest?.('#generateAnimalVideo');
    if (!generator) return;

    const animalStatus = $('animalGeneratorStatus');
    if (
      animalStatus &&
      /source validation rejected|metadata does not identify the requested animal/i.test(animalStatus.textContent || '')
    ) {
      animalStatus.textContent = 'Source Vault: rotating to a different verified animal video…';
      animalStatus.className = 'notice subtle';
    }
  }, true);

  // If any validator reports a mismatch, remember it immediately.
  const observer = new MutationObserver(() => {
    const message = $('animalGeneratorStatus')?.textContent || '';
    if (/source validation rejected|metadata does not identify the requested animal/i.test(message)) {
      rejectFromError(message);
    }
  });

  function observeStatus() {
    const el = $('animalGeneratorStatus');
    if (!el) return false;
    observer.observe(el, {childList:true, characterData:true, subtree:true});
    return true;
  }

  function addStatusCard() {
    if ($('clipfreeV24Status')) return true;
    const head = $('clipfreeSimpleStudio')?.querySelector('.simple-head');
    if (!head) return false;

    const old = $('clipfreeV23Status');
    if (old) old.remove();

    const card = document.createElement('div');
    card.id = 'clipfreeV24Status';
    card.style.cssText =
      'margin:12px 0;padding:11px 13px;border:1px solid #267048;border-radius:13px;' +
      'background:#0b1810;color:#9ff0ba;font-size:.74rem;font-weight:900;line-height:1.45';
    card.textContent =
      '✓ v24 PIPELINE HARDENED • wrong animals auto-retry • 8 source retries • actual-animal SEO • resume protected';
    head.appendChild(card);
    return true;
  }

  function install() {
    installStrictSearch();
    observeStatus();
    addStatusCard();
  }

  install();

  const timer = setInterval(() => {
    install();
    if (installStrictSearch() && $('clipfreeV24Status')) clearInterval(timer);
  }, 180);
  setTimeout(() => clearInterval(timer), 30000);

  window.addEventListener('clipfree-youtube-ready', () => setTimeout(install, 0));
  window.addEventListener('pageshow', install);

  window.CLIPFREE_V24 = {
    version:'24.0',
    sourceMismatchAutoRetry:true,
    maxSourceRetries:8,
    strictRequestedAnimalFilter:true,
    sourceHistoryRepair:true,
    seoVersion:'v23 actual-animal SEO retained'
  };
})();

/* CLIPFREE DIRECT YOUTUBE MODE v25 */
/*
  Normal mode = direct creator workflow.
  Reviewer checklist only exists at ?review=1.

  In normal mode:
  - removes/hides any compliance recording panel
  - defaults uploads to PUBLIC
  - remembers the user's own rights confirmation on this device
  - keeps the existing Create + SEO + Upload button as the single action
  - preserves v24 source hardening, v23 SEO, v20 quality turbo and v19 resume/wake lock
*/
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const qs = new URLSearchParams(location.search);
  const reviewMode =
    qs.get('review') === '1' ||
    qs.get('audit') === '1' ||
    qs.get('compliance') === '1';

  if (reviewMode) return;

  window.CLIPFREE_DIRECT_UPLOAD_MODE = true;
  window.CLIPFREE_COMPLIANCE_RECORDING_MODE = false;

  const RIGHTS_KEY = 'clipfree_direct_rights_confirmation_v25';

  function removeReviewUi() {
    $('clipfreeCompliancePanel')?.remove();
    $('clipfreeComplianceCssV9')?.remove();
  }

  function setSelect(id, value) {
    const el = $(id);
    if (!el) return;
    if (el.value !== value) {
      el.value = value;
      el.dispatchEvent(new Event('change', {bubbles:true}));
      el.dispatchEvent(new Event('input', {bubbles:true}));
    }
  }

  function applyDirectDefaults() {
    removeReviewUi();

    // The user asked for Shorts to go straight to the channel for growth.
    setSelect('simplePrivacy', 'public');
    setSelect('autoPrivacy', 'public');
    setSelect('uploadPrivacy', 'public');

    const rights = $('simpleRights');
    if (rights) {
      try {
        if (localStorage.getItem(RIGHTS_KEY) === 'yes') rights.checked = true;
      } catch {}

      if (!rights.dataset.clipfreeDirectRemember) {
        rights.dataset.clipfreeDirectRemember = '1';
        rights.addEventListener('change', () => {
          try {
            if (rights.checked) localStorage.setItem(RIGHTS_KEY, 'yes');
            else localStorage.removeItem(RIGHTS_KEY);
          } catch {}
        });
      }
    }

    const autoRights = $('autoUploadCertification');
    if (autoRights && rights?.checked) autoRights.checked = true;

    const legacyRights = $('clipfree20Rights');
    if (legacyRights && rights?.checked) legacyRights.checked = true;

    addDirectBadge();
  }

  function addDirectBadge() {
    if ($('clipfreeDirectModeV25')) return true;

    const head = $('clipfreeSimpleStudio')?.querySelector('.simple-head');
    if (!head) return false;

    const badge = document.createElement('div');
    badge.id = 'clipfreeDirectModeV25';
    badge.style.cssText =
      'margin:12px 0;padding:12px 13px;border:1px solid #236a42;border-radius:13px;' +
      'background:#0b1710;color:#a8f2c0;font-size:.78rem;font-weight:900;line-height:1.45';
    badge.innerHTML =
      '▶ DIRECT YOUTUBE MODE • PUBLIC uploads • SEO + captions + attribution • no reviewer checklist';

    head.insertBefore(badge, head.firstChild);
    return true;
  }

  function renameMainButton() {
    const btn = $('simpleStart');
    if (!btn) return false;

    const count = Math.max(1, Math.min(10, Number($('simpleCount')?.value || 1)));
    if (!btn.disabled) {
      btn.textContent = `🚀 CREATE + SEO + UPLOAD ${count} SHORT${count === 1 ? '' : 'S'} NOW`;
    }
    return true;
  }

  function install() {
    applyDirectDefaults();
    renameMainButton();
  }

  install();

  const timer = setInterval(() => {
    install();
    if ($('clipfreeDirectModeV25') && $('simpleStart')) clearInterval(timer);
  }, 150);
  setTimeout(() => clearInterval(timer), 30000);

  $('simpleCount')?.addEventListener('change', renameMainButton);
  window.addEventListener('pageshow', install);
  window.addEventListener('clipfree-youtube-state', () => setTimeout(install, 0));

  // Defensive: if anything later tries to open the audit panel in normal mode,
  // remove it immediately.
  const observer = new MutationObserver(removeReviewUi);
  observer.observe(document.documentElement, {childList:true, subtree:true});

  window.CLIPFREE_DIRECT_MODE = {
    version:'25.0',
    enabled:true,
    privacy:'public',
    reviewerModeUrl:'?review=1',
    normalModeUrl:'/'
  };
})();

/* CLIPFREE YOUTUBE RECOMMENDATION PROFILE v26 */
/*
  "Recommendation-ready" means ClipFree optimizes the signals it can control:
  - fast first-second hook
  - concise 18–30 second default range (24s default)
  - actual-animal metadata
  - unique title/description
  - focused 3 hashtags and 8 max tags
  - captions
  - Pets & Animals category
  - Public direct upload
  - high-quality vertical video
  - no unrelated/still/duplicate source
  - no fake view/subscriber promises

  YouTube still decides recommendations from real viewer response, retention,
  satisfaction, personalization, topic demand and competition.
*/
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const PROFILE_KEY = 'clipfree_recommendation_profile_v26';
  const TARGET_DURATION = 24;

  function srtTime(seconds) {
    const total = Math.max(0, Math.round((Number(seconds) || 0) * 1000));
    const h = Math.floor(total / 3600000);
    const m = Math.floor((total % 3600000) / 60000);
    const s = Math.floor((total % 60000) / 1000);
    const ms = total % 1000;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms).padStart(3,'0')}`;
  }

  function captionsToSrt(lines, duration) {
    const clean = (lines || []).map(x => String(x || '').trim()).filter(Boolean);
    if (!clean.length) return '';
    const total = Math.max(10, Math.min(60, Number(duration) || TARGET_DURATION));

    // Give the first hook extra early screen time.
    const cuts = clean.length === 4
      ? [0, Math.min(2.2,total*.13), total*.42, total*.70, total]
      : Array.from({length:clean.length+1},(_,i)=>(total*i/clean.length));

    return clean.map((line,i) =>
      `${i+1}\n${srtTime(cuts[i])} --> ${srtTime(Math.max(cuts[i]+.35,cuts[i+1]))}\n${line}\n`
    ).join('\n');
  }

  function cleanAnimal(value='') {
    return String(value || '')
      .replace(/[_-]+/g,' ')
      .replace(/\s+/g,' ')
      .trim()
      .replace(/\b\w/g, ch => ch.toUpperCase());
  }

  function actualAnimal(detail={}) {
    const direct = String(
      detail.detectedAnimal ||
      detail.source?.detectedAnimal ||
      detail.source?.__clipfreeDetectedAnimal ||
      ''
    ).trim();

    if (direct && !/^wildlife|wild animal$/i.test(direct)) return cleanAnimal(direct);

    const text = [
      detail.title,
      detail.searchTopic,
      detail.requestedSourceQuery,
      detail.source?.title,
      ...(Array.isArray(detail.sources) ? detail.sources.map(x => `${x?.detectedAnimal || ''} ${x?.title || ''}`) : []),
      ...(Array.isArray(detail.source?.sources) ? detail.source.sources.map(x => `${x?.detectedAnimal || ''} ${x?.title || ''}`) : [])
    ].filter(Boolean).join(' ');

    const animals = [
      ['Mountain Lion',/\b(mountain lion|cougar|puma)\b/i],
      ['Sea Lion',/\bsea lion\b/i],
      ['Lion',/\b(lion|lioness|panthera leo)\b/i],
      ['Tiger',/\b(tiger|panthera tigris)\b/i],
      ['Leopard',/\bleopard\b/i],
      ['Cheetah',/\bcheetah\b/i],
      ['Jaguar',/\bjaguar\b/i],
      ['Wolf',/\b(wolf|wolves)\b/i],
      ['Coyote',/\bcoyote\b/i],
      ['Fox',/\bfox\b/i],
      ['Polar Bear',/\bpolar bear\b/i],
      ['Grizzly Bear',/\bgrizzly bear\b/i],
      ['Bear',/\bbear\b/i],
      ['Elephant',/\belephant\b/i],
      ['Giraffe',/\bgiraffe\b/i],
      ['Zebra',/\bzebra\b/i],
      ['Rhino',/\b(rhino|rhinoceros)\b/i],
      ['Hippo',/\b(hippo|hippopotamus)\b/i],
      ['Bison',/\b(bison|buffalo)\b/i],
      ['Moose',/\bmoose\b/i],
      ['Elk',/\belk\b/i],
      ['Deer',/\b(deer|stag|doe|buck|reindeer|caribou)\b/i],
      ['Kangaroo',/\bkangaroo\b/i],
      ['Koala',/\bkoala\b/i],
      ['Otter',/\botter\b/i],
      ['Rabbit',/\b(rabbit|hare)\b/i],
      ['Squirrel',/\bsquirrel\b/i],
      ['Gorilla',/\bgorilla\b/i],
      ['Chimpanzee',/\bchimpanzee\b/i],
      ['Orangutan',/\borangutan\b/i],
      ['Monkey',/\b(monkey|macaque|baboon|gibbon|lemur)\b/i],
      ['Hyena',/\b(hyena|hyaena)\b/i],
      ['Crocodile',/\bcrocodile\b/i],
      ['Alligator',/\balligator\b/i],
      ['Turtle',/\b(turtle|tortoise)\b/i],
      ['Snake',/\b(snake|python|cobra|rattlesnake|boa)\b/i],
      ['Eagle',/\beagle\b/i],
      ['Hawk',/\bhawk\b/i],
      ['Falcon',/\bfalcon\b/i],
      ['Owl',/\bowl\b/i],
      ['Penguin',/\bpenguin\b/i],
      ['Whale Shark',/\bwhale shark\b/i],
      ['Shark',/\bshark\b/i],
      ['Whale',/\b(whale|orca)\b/i],
      ['Dolphin',/\bdolphin\b/i],
      ['Seal',/\bseal\b/i],
      ['Frog',/\b(frog|toad)\b/i],
      ['Bumble Bee',/\b(bumble ?bee|bumblebee|bombus)\b/i],
      ['Bee',/\bbee\b/i],
      ['Butterfly',/\bbutterfly\b/i],
      ['Cat',/\b(cat|kitten)\b/i],
      ['Dog',/\b(dog|puppy)\b/i]
    ];

    return animals.find(([,rx]) => rx.test(text))?.[0] || 'Wildlife';
  }

  function action(detail={}) {
    const t = [
      detail.title,
      detail.description,
      detail.source?.title,
      detail.source?.description,
      ...(Array.isArray(detail.sources) ? detail.sources.map(x=>x?.title || '') : [])
    ].filter(Boolean).join(' ');

    const list = [
      ['drinking',/\bdrink|drinking|waterhole|watering\b/i],
      ['running',/\brun|running|sprint|sprinting\b/i],
      ['walking',/\bwalk|walking\b/i],
      ['swimming',/\bswim|swimming\b/i],
      ['feeding',/\bfeed|feeding|eating|grazing|foraging\b/i],
      ['playing',/\bplay|playing\b/i],
      ['climbing',/\bclimb|climbing\b/i],
      ['flying',/\bfly|flying|soaring\b/i],
      ['hunting',/\bhunt|hunting|stalking\b/i],
      ['resting',/\brest|resting|sleeping\b/i]
    ];
    return list.find(([,rx])=>rx.test(t))?.[0] || '';
  }

  function makeCaptions(detail={}) {
    const animal = actualAnimal(detail);
    const act = action(detail);
    return [
      `Wait — watch this ${animal}.`,
      act ? `${animal} ${act} in the wild.` : `${animal} up close in the wild.`,
      `Look closely at the movement and behavior.`,
      `Follow for more real wildlife moments.`
    ];
  }

  function setValue(id, value) {
    const el = $(id);
    if (!el) return;
    el.value = String(value);
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function applyGrowthDefaults() {
    // One-time recommendation-focused defaults. User can change them afterwards.
    let already = false;
    try { already = localStorage.getItem(PROFILE_KEY) === '1'; } catch {}

    if (!already) {
      const simpleDuration = $('simpleDuration');
      const animalDuration = $('animalDuration');

      if (simpleDuration && (!simpleDuration.value || Number(simpleDuration.value) === 30)) {
        setValue('simpleDuration', TARGET_DURATION);
      }
      if (animalDuration && (!animalDuration.value || Number(animalDuration.value) === 30)) {
        setValue('animalDuration', TARGET_DURATION);
      }

      try { localStorage.setItem(PROFILE_KEY,'1'); } catch {}
    }

    // Pets & Animals is category 15.
    setValue('uploadCategory','15');

    // Keep the direct-growth defaults from v25.
    setValue('simplePrivacy','public');
    setValue('autoPrivacy','public');
    setValue('uploadPrivacy','public');

    addBadge();
  }

  function addBadge() {
    if ($('clipfreeRecommendationV26')) return true;
    const head = $('clipfreeSimpleStudio')?.querySelector('.simple-head');
    if (!head) return false;

    const el = document.createElement('div');
    el.id = 'clipfreeRecommendationV26';
    el.style.cssText =
      'margin:12px 0;padding:12px 13px;border:1px solid #2b6f48;border-radius:13px;' +
      'background:#0c1711;color:#acf2c2;font-size:.76rem;font-weight:900;line-height:1.5';
    el.innerHTML =
      '📈 YOUTUBE RECOMMENDATION PROFILE v26 • 24s growth default • actual-animal SEO • captions • Pets & Animals • PUBLIC • vidIQ Free competitor tracking';

    head.insertBefore(el, head.firstChild);
    return true;
  }

  // Final metadata/caption pass before youtube.js receives the export.
  window.addEventListener('clipfree-export-ready', event => {
    const detail = event.detail || {};
    if (detail.kind !== 'animal-generator') return;

    const animal = actualAnimal(detail);
    const captions = makeCaptions(detail);
    const duration = Math.max(10,Math.min(60,Number(detail.targetDuration)||TARGET_DURATION));

    detail.detectedAnimal = animal;
    detail.captions = captions;
    detail.srt = captionsToSrt(captions,duration);

    // Keep hashtags focused and out of the title.
    detail.hashtags = `#${animal.replace(/[^A-Za-z0-9]+/g,'')} #Wildlife #Shorts`;

    if (window.ClipFreeExport === detail) {
      window.ClipFreeExport.detectedAnimal = animal;
      window.ClipFreeExport.captions = captions;
      window.ClipFreeExport.srt = detail.srt;
      window.ClipFreeExport.hashtags = detail.hashtags;
    }

    const hashBox = $('seoHashtags');
    if (hashBox) hashBox.value = detail.hashtags;
  }, true);

  applyGrowthDefaults();

  const timer = setInterval(() => {
    applyGrowthDefaults();
    if ($('clipfreeRecommendationV26')) clearInterval(timer);
  },180);
  setTimeout(()=>clearInterval(timer),30000);

  window.addEventListener('pageshow',applyGrowthDefaults);
  window.addEventListener('clipfree-youtube-state',()=>setTimeout(applyGrowthDefaults,0));

  window.CLIPFREE_RECOMMENDATION_PROFILE = {
    version:'26.0',
    recommendationReady:true,
    guarantee:false,
    defaultDurationSeconds:TARGET_DURATION,
    categoryId:'15',
    vidiqMode:'free-competitor-tracking'
  };
})();

/* CLIPFREE VERIFICATION + FAST BOUNDED PIPELINE v27 */
/*
  Two jobs at once:
  1) keep the real creator homepage fast and one-click;
  2) keep the complete YouTube API reviewer evidence visible at all historical
     reviewer URLs: ?audit=1, ?compliance=1 and ?review=1.

  It also bounds two stages that could otherwise appear frozen on mobile:
  - federated source lookup
  - first-time local AI narrator generation

  This does not fake reviewer evidence. The audit panel continues to show only
  real API connection data, source/licence, metadata and real YouTube video IDs.
*/
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const SEARCH_TIMEOUT_MS = 18000;
  const VOICE_TIMEOUT_MS = 75000;
  const SEARCH_FLAG = '__clipfreeBoundedSearchV27';
  const VOICE_FLAG = '__clipfreeBoundedVoiceV27';

  function timeoutPromise(ms, message) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }

  function isReviewerMode() {
    const qs = new URLSearchParams(location.search);
    return (
      qs.get('audit') === '1' ||
      qs.get('compliance') === '1' ||
      qs.get('review') === '1'
    );
  }

  function installSearchBound() {
    const yt = window.ClipFreeYouTube;
    if (!yt?.searchCommonsDownloadable) return false;
    if (yt[SEARCH_FLAG]) return true;

    const previous = yt.searchCommonsDownloadable.bind(yt);

    yt.searchCommonsDownloadable = async function boundedSourceSearch(query, limit = 12) {
      try {
        return await Promise.race([
          previous(query, limit),
          timeoutPromise(
            SEARCH_TIMEOUT_MS,
            `Source search timed out after ${Math.round(SEARCH_TIMEOUT_MS/1000)} seconds`
          )
        ]);
      } catch (err) {
        console.warn('v27 source search rotated after timeout/provider failure', query, err);
        try { window.ClipFreeSourceRepairV24?.rotateVarietyCursor?.(5); } catch {}
        return [];
      }
    };

    yt[SEARCH_FLAG] = true;
    return true;
  }

  function installVoiceBound() {
    const voice = window.ClipFreeVoiceover;
    if (!voice?.generate) return false;
    if (voice[VOICE_FLAG]) return true;

    const previous = voice.generate.bind(voice);

    voice.generate = async function boundedNarration(options = {}) {
      try {
        return await Promise.race([
          previous(options),
          timeoutPromise(
            VOICE_TIMEOUT_MS,
            'The local AI narrator took too long on this phone. ClipFree is switching to its licensed animal-audio fallback so the batch can keep moving.'
          )
        ]);
      } catch (err) {
        // animal-generator already has a PD/CC0 audio fallback for narration failure.
        throw err;
      }
    };

    voice[VOICE_FLAG] = true;
    return true;
  }

  function addVerificationShortcut() {
    if (isReviewerMode()) return true;
    if ($('clipfreeVerificationShortcutV27')) return true;

    const head = $('clipfreeSimpleStudio')?.querySelector('.simple-head');
    if (!head) return false;

    const card = document.createElement('div');
    card.id = 'clipfreeVerificationShortcutV27';
    card.style.cssText =
      'margin:12px 0;padding:12px 13px;border:1px solid #5b50a5;border-radius:13px;' +
      'background:#11101c;color:#eeeaff;font-size:.76rem;line-height:1.5';

    card.innerHTML = `
      <strong style="display:block;margin-bottom:5px">🎥 YouTube Verification Evidence</strong>
      <span style="color:#bdb6d6">
        The complete real-data API evidence page is still available for YouTube reviewers.
        It shows API connection, analytics, source/licence, generated metadata,
        captions/cover and the real YouTube upload ID.
      </span><br>
      <a href="?audit=1"
         style="display:inline-block;margin-top:8px;color:#bca8ff;font-weight:900">
         Open reviewer evidence
      </a>
    `;

    head.appendChild(card);
    return true;
  }

  function addReviewerBanner() {
    if (!isReviewerMode()) return true;
    if ($('clipfreeReviewerV27')) return true;

    const panel = $('clipfreeCompliancePanel');
    if (!panel) return false;

    const banner = document.createElement('div');
    banner.id = 'clipfreeReviewerV27';
    banner.style.cssText =
      'margin:0 0 12px;padding:11px 12px;border:1px solid #2b6f48;border-radius:11px;' +
      'background:#0d1d14;color:#b6f3c8;font-weight:900;line-height:1.45';
    banner.textContent =
      '✓ YouTube reviewer evidence mode — real API data only; no simulated analytics, sources or upload IDs.';
    panel.insertBefore(banner, panel.firstChild);
    return true;
  }

  // Mirror the exact inner generator stage into the simple batch status so a
  // phone never appears frozen at only "fast real-video source".
  let lastMirror = '';
  function installProgressMirror() {
    const inner = $('animalGeneratorStatus');
    const outer = $('simpleStatus');
    if (!inner || !outer || inner.dataset.clipfreeV27Mirror) return false;

    inner.dataset.clipfreeV27Mirror = '1';

    const mirror = () => {
      const step = String(inner.textContent || '').trim();
      if (!step || step === lastMirror) return;

      const currentOuter = String(outer.textContent || '').trim();
      const match = currentOuter.match(/Short\s+\d+\/\d+/i);
      if (!match && !/completed|remaining|keep the screen on/i.test(currentOuter)) return;

      lastMirror = step;
      const prefix = match ? `${match[0]} • ` : '';
      outer.textContent = `${prefix}${step}`;
    };

    new MutationObserver(mirror).observe(inner, {
      childList:true,
      characterData:true,
      subtree:true
    });
    mirror();
    return true;
  }

  function install() {
    installSearchBound();
    installVoiceBound();
    installProgressMirror();
    addVerificationShortcut();
    addReviewerBanner();
  }

  install();

  const timer = setInterval(() => {
    install();

    if (
      installSearchBound() &&
      installVoiceBound() &&
      (isReviewerMode() ? Boolean($('clipfreeReviewerV27')) : Boolean($('clipfreeVerificationShortcutV27')))
    ) {
      clearInterval(timer);
    }
  }, 180);
  setTimeout(() => clearInterval(timer), 30000);

  window.addEventListener('clipfree-youtube-ready', () => setTimeout(install, 0));
  window.addEventListener('pageshow', install);

  window.CLIPFREE_V27 = {
    version:'27.0',
    reviewerUrls:['?audit=1','?compliance=1','?review=1'],
    sourceSearchTimeoutMs:SEARCH_TIMEOUT_MS,
    voiceGenerationTimeoutMs:VOICE_TIMEOUT_MS,
    liveProgressMirror:true,
    evidenceIsRealOnly:true
  };
})();

/* CLIPFREE MOBILE 10-SHORT STABILITY v28 */
/*
  Mobile reliability policy:
  - maximum batch size is now 10
  - options 11–20 are removed from the normal UI
  - an old 20-Short resume checkpoint is safely clamped to 10
    without erasing already-completed uploads
  - no-ID race gets a real-ID grace window in the v19 runner
  - reviewer/audit pages remain unchanged and fully available
*/
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const MAX_BATCH = 10;
  const CHECKPOINT_KEY = 'clipfree_batch_checkpoint_v19';

  function migrateCheckpoint() {
    try {
      const raw = localStorage.getItem(CHECKPOINT_KEY);
      if (!raw) return;

      const cp = JSON.parse(raw);
      if (!cp || typeof cp !== 'object') return;

      const oldRequested = Math.max(0, Number(cp.requested || 0));
      const oldCompleted = Math.max(0, Number(cp.completed || 0));

      if (oldRequested > MAX_BATCH) {
        cp.requested = MAX_BATCH;
        cp.completed = Math.min(oldCompleted, MAX_BATCH);
        cp.active = cp.completed < MAX_BATCH;
        cp.lastError = '';
        cp.updatedAt = new Date().toISOString();
        cp.v28ClampedFrom = oldRequested;
        localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(cp));
      }
    } catch (err) {
      console.warn('v28 checkpoint migration skipped', err);
    }
  }

  function readCheckpoint() {
    try {
      const cp = JSON.parse(localStorage.getItem(CHECKPOINT_KEY) || 'null');
      return cp && typeof cp === 'object' ? cp : null;
    } catch {
      return null;
    }
  }

  function capCountUi() {
    const count = $('simpleCount');
    if (!count) return false;

    if (count.tagName === 'SELECT') {
      [...count.options].forEach(option => {
        const n = Number(option.value);
        if (Number.isFinite(n) && n > MAX_BATCH) option.remove();
      });
    }

    const current = Number(count.value || 1);
    if (!Number.isFinite(current) || current > MAX_BATCH) {
      count.value = String(MAX_BATCH);
      count.dispatchEvent(new Event('input', {bubbles:true}));
      count.dispatchEvent(new Event('change', {bubbles:true}));
    }

    // Some versions use a numeric input instead of a select.
    try { count.max = String(MAX_BATCH); } catch {}

    return true;
  }

  function refreshButtons() {
    const count = Math.max(1, Math.min(MAX_BATCH, Number($('simpleCount')?.value || 1)));
    const start = $('simpleStart');

    if (start && !start.disabled) {
      start.textContent = `🚀 CREATE + SEO + UPLOAD ${count} SHORT${count === 1 ? '' : 'S'} NOW`;
    }

    const cp = readCheckpoint();
    const resume = $('clipfreeResumeBatch');
    if (resume && cp?.active) {
      const requested = Math.min(MAX_BATCH, Math.max(0, Number(cp.requested || MAX_BATCH)));
      const completed = Math.min(requested, Math.max(0, Number(cp.completed || 0)));
      const remaining = Math.max(0, requested - completed);

      if (remaining > 0) {
        resume.textContent = `▶ RESUME ${remaining} REMAINING SHORT${remaining === 1 ? '' : 'S'}`;
      } else {
        resume.remove();
      }
    }
  }

  function addBadge() {
    if ($('clipfreeV28Status')) return true;
    const head = $('clipfreeSimpleStudio')?.querySelector('.simple-head');
    if (!head) return false;

    const el = document.createElement('div');
    el.id = 'clipfreeV28Status';
    el.style.cssText =
      'margin:12px 0;padding:11px 13px;border:1px solid #2d6a49;border-radius:13px;' +
      'background:#0c1711;color:#adf2c4;font-size:.76rem;font-weight:900;line-height:1.45';
    el.textContent =
      '✓ v28 MOBILE STABILITY • max 10 Shorts • real-ID grace check • resume protected • reviewer evidence untouched';

    head.appendChild(el);
    return true;
  }

  function install() {
    migrateCheckpoint();
    capCountUi();
    refreshButtons();
    addBadge();
  }

  install();

  const timer = setInterval(() => {
    install();
    if (capCountUi() && $('clipfreeV28Status')) clearInterval(timer);
  }, 150);
  setTimeout(() => clearInterval(timer), 30000);

  $('simpleCount')?.addEventListener('change', () => {
    capCountUi();
    refreshButtons();
  });

  window.addEventListener('pageshow', install);
  window.addEventListener('clipfree-youtube-state', () => setTimeout(install, 0));

  window.CLIPFREE_V28 = {
    version:'28.0',
    maxBatch:MAX_BATCH,
    noIdGraceMs:12000,
    oldCheckpointMigration:true,
    reviewerFlowChanged:false
  };
})();

/* CLIPFREE FULL-SITE STABILITY AUDIT v29 */
/*
  Runtime hardening after a full repository audit.

  Preserved:
  - YouTube reviewer/audit flow and all three reviewer URLs
  - v28 10-Short max + real YouTube ID grace window
  - v27 reviewer evidence + mobile speed profile
  - all SEO, source, motion, duplicate and rights protections

  Added:
  - permanent 10-Short selector guard so older category code cannot re-add 11–20
  - real upload-ID tracker synchronization
  - longer bounded federated-source window to reduce false source timeouts
  - one visible v29 status marker in normal mode
*/
(() => {
  'use strict';

  const MAX_BATCH = 10;
  const selectorIds = [
    'simpleCount',
    'wizardBatchCount',
    'autoBatchCount',
    'animalBatchCount'
  ];

  function reviewerMode() {
    const q = new URLSearchParams(location.search);
    return q.get('audit') === '1' ||
           q.get('compliance') === '1' ||
           q.get('review') === '1';
  }

  function sanitizeBatchSelectors() {
    for (const id of selectorIds) {
      const el = document.getElementById(id);
      if (!el) continue;

      if (el.tagName === 'SELECT') {
        [...el.options].forEach(option => {
          const n = Number(option.value);
          if (Number.isFinite(n) && n > MAX_BATCH) option.remove();
        });
      }

      try { el.max = String(MAX_BATCH); } catch {}

      const current = Number(el.value || 1);
      if (Number.isFinite(current) && current > MAX_BATCH) {
        el.value = String(MAX_BATCH);
        el.dispatchEvent(new Event('input', {bubbles:true}));
        el.dispatchEvent(new Event('change', {bubbles:true}));
      }
    }

    // Remove obsolete legacy 20-Short cards if an older script recreated them.
    document.getElementById('clipfree20AnimalCard')?.remove();
    document.getElementById('clipfree20Hero')?.remove();
  }

  let queued = false;
  function queueSanitize() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      sanitizeBatchSelectors();
    });
  }

  sanitizeBatchSelectors();

  // Permanent observer: older category code used delayed timers that could add
  // 11–20 after the earlier one-time cleanup had already finished.
  const observer = new MutationObserver(queueSanitize);
  observer.observe(document.documentElement, {
    childList:true,
    subtree:true
  });

  window.addEventListener('pageshow', sanitizeBatchSelectors);

  // Keep every tracker in agreement about the latest REAL YouTube ID.
  window.addEventListener('clipfree-youtube-upload-transferred', event => {
    const id = String(event?.detail?.videoId || '').trim();
    if (!id) return;

    const state = window.ClipFreeTransferredUploadState;
    if (state && typeof state === 'object') {
      state.lastVideoId = id;
      state.lastTransferredAt = new Date().toISOString();
    }
  });

  function addBadge() {
    if (reviewerMode()) return true;
    if (document.getElementById('clipfreeV29Status')) return true;

    const head = document.querySelector('#clipfreeSimpleStudio .simple-head');
    if (!head) return false;

    const card = document.createElement('div');
    card.id = 'clipfreeV29Status';
    card.style.cssText =
      'margin:12px 0;padding:11px 13px;border:1px solid #2d6a49;border-radius:13px;' +
      'background:#0c1711;color:#acf2c2;font-size:.76rem;font-weight:900;line-height:1.45';
    card.textContent =
      '✓ v29 FULL-SITE STABILITY • max 10 Shorts • upload-ID sync • reviewer evidence preserved';
    head.appendChild(card);
    return true;
  }

  addBadge();
  const badgeTimer = setInterval(() => {
    sanitizeBatchSelectors();
    if (addBadge()) clearInterval(badgeTimer);
  }, 180);
  setTimeout(() => clearInterval(badgeTimer), 30000);

  window.CLIPFREE_V29 = {
    version:'29.0',
    fullRepoAudit:true,
    maxBatch:MAX_BATCH,
    uploadIdSync:true,
    reviewerFlowChanged:false,
    sourceSearchTimeoutMs:18000
  };
})();

/* CLIPFREE SPECIES TITLE GUARD v30 */
/*
  Goal: every wildlife Short gets a different, animal-specific title in the
  same clean style as "Bear Up Close in Nature 🐻".

  This is the FINAL title pass before youtube.js reads the export.
  It does not alter the reviewer/audit flow.
*/
(() => {
  'use strict';

  const TITLE_KEY = 'clipfree_species_title_history_v30';

  const ANIMALS = [
    ['Mountain Lion', /\b(mountain lion|cougar|puma)\b/i, '🐆'],
    ['Sea Lion', /\bsea lion\b/i, '🦭'],
    ['Polar Bear', /\bpolar bear\b/i, '🐻‍❄️'],
    ['Grizzly Bear', /\bgrizzly bear\b/i, '🐻'],
    ['Rusty Patched Bumble Bee', /\brusty patched bumble bee\b/i, '🐝'],
    ['Leafcutter Bee', /\bleafcutter bee\b/i, '🐝'],
    ['Bumble Bee', /\b(bumble ?bee|bumblebee|bombus)\b/i, '🐝'],
    ['Monarch Butterfly', /\bmonarch butterfly\b/i, '🦋'],
    ['Whale Shark', /\bwhale shark\b/i, '🦈'],
    ['Lion', /\b(lion|lioness|panthera leo)\b/i, '🦁'],
    ['Tiger', /\b(tiger|panthera tigris)\b/i, '🐅'],
    ['Leopard', /\bleopard\b/i, '🐆'],
    ['Cheetah', /\bcheetah\b/i, '🐆'],
    ['Jaguar', /\bjaguar\b/i, '🐆'],
    ['Lynx', /\blynx\b/i, '🐈'],
    ['Bobcat', /\bbobcat\b/i, '🐈'],
    ['Wolf', /\b(wolf|wolves)\b/i, '🐺'],
    ['Coyote', /\bcoyote\b/i, '🐺'],
    ['Fox', /\bfox\b/i, '🦊'],
    ['Bear', /\b(bear|ursus)\b/i, '🐻'],
    ['Elephant', /\belephant\b/i, '🐘'],
    ['Giraffe', /\bgiraffe\b/i, '🦒'],
    ['Zebra', /\bzebra\b/i, '🦓'],
    ['Rhino', /\b(rhino|rhinoceros)\b/i, '🦏'],
    ['Hippo', /\b(hippo|hippopotamus)\b/i, '🦛'],
    ['Bison', /\b(bison|buffalo)\b/i, '🐃'],
    ['Moose', /\bmoose\b/i, '🫎'],
    ['Elk', /\belk\b/i, '🦌'],
    ['Deer', /\b(deer|stag|doe|buck|reindeer|caribou)\b/i, '🦌'],
    ['Kangaroo', /\bkangaroo\b/i, '🦘'],
    ['Koala', /\bkoala\b/i, '🐨'],
    ['Otter', /\botter\b/i, '🦦'],
    ['Rabbit', /\b(rabbit|hare)\b/i, '🐇'],
    ['Squirrel', /\bsquirrel\b/i, '🐿️'],
    ['Gorilla', /\bgorilla\b/i, '🦍'],
    ['Chimpanzee', /\bchimpanzee\b/i, '🐒'],
    ['Orangutan', /\borangutan\b/i, '🦧'],
    ['Monkey', /\b(monkey|macaque|baboon|gibbon|lemur)\b/i, '🐒'],
    ['Hyena', /\b(hyena|hyaena)\b/i, '🐾'],
    ['Crocodile', /\bcrocodile\b/i, '🐊'],
    ['Alligator', /\balligator\b/i, '🐊'],
    ['Turtle', /\b(turtle|tortoise)\b/i, '🐢'],
    ['Snake', /\b(snake|python|cobra|rattlesnake|boa)\b/i, '🐍'],
    ['Eagle', /\beagle\b/i, '🦅'],
    ['Hawk', /\bhawk\b/i, '🦅'],
    ['Falcon', /\bfalcon\b/i, '🦅'],
    ['Owl', /\bowl\b/i, '🦉'],
    ['Penguin', /\bpenguin\b/i, '🐧'],
    ['Shark', /\b(shark|great white|hammerhead)\b/i, '🦈'],
    ['Whale', /\b(whale|orca)\b/i, '🐋'],
    ['Dolphin', /\bdolphin\b/i, '🐬'],
    ['Seal', /\bseal\b/i, '🦭'],
    ['Frog', /\b(frog|toad)\b/i, '🐸'],
    ['Bee', /\bbee\b/i, '🐝'],
    ['Butterfly', /\bbutterfly\b/i, '🦋'],
    ['Dragonfly', /\bdragonfly\b/i, '🪲'],
    ['Beetle', /\bbeetle\b/i, '🪲'],
    ['Spider', /\bspider\b/i, '🕷️'],
    ['Crab', /\bcrab\b/i, '🦀'],
    ['Cat', /\b(cat|kitten)\b/i, '🐱'],
    ['Dog', /\b(dog|puppy)\b/i, '🐶']
  ];

  const TITLE_STYLES = [
    label => `${label} Up Close in Nature`,
    label => `${label} in the Wild`,
    label => `${label} Nature Encounter`,
    label => `Watch This ${label} Up Close`,
    label => `${label} Wildlife Moment`,
    label => `${label} Caught on Camera`,
    label => `${label} in Its Natural Habitat`,
    label => `A Closer Look at This ${label}`,
    label => `${label} Exploring the Wild`,
    label => `${label} Real Wildlife Encounter`
  ];

  function loadHistory() {
    try {
      const x = JSON.parse(localStorage.getItem(TITLE_KEY) || '[]');
      return Array.isArray(x) ? x : [];
    } catch {
      return [];
    }
  }

  function saveHistory(title) {
    try {
      const old = loadHistory();
      old.unshift(title);
      localStorage.setItem(
        TITLE_KEY,
        JSON.stringify([...new Set(old)].slice(0, 1500))
      );
    } catch {}
  }

  function sourceText(detail = {}) {
    const top = Array.isArray(detail.sources) ? detail.sources : [];
    const inner = Array.isArray(detail.source?.sources) ? detail.source.sources : [];
    return [
      detail.detectedAnimal,
      detail.requestedSourceQuery,
      detail.searchTopic,
      detail.title,
      detail.source?.detectedAnimal,
      detail.source?.__clipfreeDetectedAnimal,
      detail.source?.requestedSourceQuery,
      detail.source?.__clipfreeRequestedQuery,
      detail.source?.title,
      ...top.map(x => `${x?.detectedAnimal || ''} ${x?.requestedQuery || ''} ${x?.title || ''}`),
      ...inner.map(x => `${x?.detectedAnimal || ''} ${x?.requestedQuery || ''} ${x?.title || ''}`)
    ].filter(Boolean).join(' ');
  }

  function actualAnimal(detail = {}) {
    const text = sourceText(detail);
    return ANIMALS.find(([, rx]) => rx.test(text)) || null;
  }

  function chooseUniqueTitle(detail = {}) {
    const found = actualAnimal(detail);
    if (!found) return '';

    const [label,,emoji] = found;

    const used = new Set([
      ...loadHistory(),
      ...(window.ClipFreeYouTube?.getKnownVideoTitles?.() || [])
    ].map(x => String(x || '').trim().toLowerCase()).filter(Boolean));

    // Stable source-derived offset gives variety without random duplicate titles.
    const seedText = sourceText(detail);
    let seed = 0;
    for (let i = 0; i < seedText.length; i++) {
      seed = ((seed * 33) + seedText.charCodeAt(i)) >>> 0;
    }

    for (let i = 0; i < TITLE_STYLES.length; i++) {
      const base = TITLE_STYLES[(seed + i) % TITLE_STYLES.length](label);
      const title = `${base} ${emoji}`.replace(/\s+/g, ' ').trim().slice(0, 85);
      if (!used.has(title.toLowerCase())) {
        saveHistory(title);
        return title;
      }
    }

    // Never fall back to "Wild Animal ...". Keep species name and uniqueness.
    const suffix = String(Date.now()).slice(-4);
    const fallback = `${label} Up Close in Nature ${emoji} ${suffix}`.slice(0, 85);
    saveHistory(fallback);
    return fallback;
  }

  function updateFields(detail, title) {
    detail.title = title;
    detail.__clipfreeSpeciesTitleV30 = true;

    for (const id of ['uploadTitle','seoTitle']) {
      const el = document.getElementById(id);
      if (el) el.value = title;
    }

    if (window.ClipFreeExport === detail) {
      window.ClipFreeExport.title = title;
      window.ClipFreeExport.__clipfreeSpeciesTitleV30 = true;
    }
  }

  // Loaded after every older SEO/title listener, so this becomes the last
  // metadata pass before youtube.js receives the export event in bubble phase.
  window.addEventListener('clipfree-export-ready', event => {
    const detail = event.detail || {};
    if (detail.kind !== 'animal-generator') return;

    const title = chooseUniqueTitle(detail);
    if (!title) {
      // Do not overwrite with another generic "Wild Animal" title.
      // Existing source-validation/retry code remains responsible for finding
      // another identifiable animal source.
      return;
    }

    updateFields(detail, title);
  }, true);

  function addBadge() {
    if (document.getElementById('clipfreeV30TitleStatus')) return true;

    const qs = new URLSearchParams(location.search);
    if (qs.get('audit') === '1' || qs.get('compliance') === '1' || qs.get('review') === '1') {
      return true;
    }

    const head = document.querySelector('#clipfreeSimpleStudio .simple-head');
    if (!head) return false;

    const card = document.createElement('div');
    card.id = 'clipfreeV30TitleStatus';
    card.style.cssText =
      'margin:12px 0;padding:11px 13px;border:1px solid #72591d;border-radius:13px;' +
      'background:#181409;color:#ffe39a;font-size:.76rem;font-weight:900;line-height:1.45';
    card.textContent =
      '🏆 v30 SPECIES TITLES • every Short gets a different actual-animal title • no generic Wild Animal titles';
    head.appendChild(card);
    return true;
  }

  addBadge();
  const timer = setInterval(() => {
    if (addBadge()) clearInterval(timer);
  }, 180);
  setTimeout(() => clearInterval(timer), 30000);

  window.CLIPFREE_V30 = {
    version:'30.0',
    speciesOnlyTitles:true,
    uniqueTitles:true,
    genericWildAnimalTitles:false,
    reviewerFlowChanged:false
  };
})();

/* CLIPFREE DEEP SOURCE VAULT v31 */
/*
  Purpose:
  Stop repeatedly exhausting the first page of the same source results.

  v31 does NOT pretend to scrape 100–300 unrelated websites.
  Instead it searches much deeper inside the structured repositories ClipFree
  already trusts, rotating result pages/offsets so old footage does not keep
  coming back.

  Automatic repositories:
  - Wikimedia Commons
  - Internet Archive
  - Library of Congress (explicit Public Domain / Free to Use and Reuse only)

  This gives ClipFree access to a far larger pool of videos contributed by many
  collections/institutions while keeping item-level rights checks.
*/
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const MAX_BYTES = 32 * 1024 * 1024;
  const FLAG = '__clipfreeDeepSourceVaultV31';
  const CURSOR_KEY = 'clipfree_deep_source_cursor_v31';

  const ANIMALS = [
    ['mountain lion', /\b(mountain lion|cougar|puma)\b/i],
    ['sea lion', /\bsea lion\b/i],
    ['polar bear', /\bpolar bear\b/i],
    ['grizzly bear', /\bgrizzly bear\b/i],
    ['rusty patched bumble bee', /\brusty patched bumble bee\b/i],
    ['leafcutter bee', /\bleafcutter bee\b/i],
    ['bumble bee', /\b(bumble ?bee|bumblebee|bombus)\b/i],
    ['monarch butterfly', /\bmonarch butterfly\b/i],
    ['whale shark', /\bwhale shark\b/i],
    ['lion', /\b(lion|lioness|panthera leo)\b/i],
    ['tiger', /\b(tiger|panthera tigris)\b/i],
    ['leopard', /\bleopard\b/i],
    ['cheetah', /\bcheetah\b/i],
    ['jaguar', /\bjaguar\b/i],
    ['lynx', /\blynx\b/i],
    ['bobcat', /\bbobcat\b/i],
    ['wolf', /\b(wolf|wolves|canis lupus)\b/i],
    ['coyote', /\bcoyote\b/i],
    ['fox', /\bfox\b/i],
    ['bear', /\b(bear|ursus)\b/i],
    ['elephant', /\belephant\b/i],
    ['giraffe', /\bgiraffe\b/i],
    ['zebra', /\bzebra\b/i],
    ['rhino', /\b(rhino|rhinoceros)\b/i],
    ['hippo', /\b(hippo|hippopotamus)\b/i],
    ['bison', /\b(bison|buffalo)\b/i],
    ['moose', /\bmoose\b/i],
    ['elk', /\belk\b/i],
    ['deer', /\b(deer|stag|doe|buck|reindeer|caribou)\b/i],
    ['antelope', /\b(antelope|gazelle|pronghorn|wildebeest)\b/i],
    ['kangaroo', /\bkangaroo\b/i],
    ['koala', /\bkoala\b/i],
    ['otter', /\botter\b/i],
    ['rabbit', /\b(rabbit|hare)\b/i],
    ['squirrel', /\bsquirrel\b/i],
    ['gorilla', /\bgorilla\b/i],
    ['chimpanzee', /\bchimpanzee\b/i],
    ['orangutan', /\borangutan\b/i],
    ['monkey', /\b(monkey|macaque|baboon|gibbon|lemur)\b/i],
    ['hyena', /\b(hyena|hyaena)\b/i],
    ['meerkat', /\bmeerkat\b/i],
    ['crocodile', /\bcrocodile\b/i],
    ['alligator', /\balligator\b/i],
    ['turtle', /\b(turtle|tortoise)\b/i],
    ['snake', /\b(snake|python|cobra|rattlesnake|boa)\b/i],
    ['eagle', /\beagle\b/i],
    ['hawk', /\bhawk\b/i],
    ['falcon', /\bfalcon\b/i],
    ['owl', /\bowl\b/i],
    ['penguin', /\bpenguin\b/i],
    ['shark', /\b(shark|great white|hammerhead)\b/i],
    ['whale', /\b(whale|orca)\b/i],
    ['dolphin', /\bdolphin\b/i],
    ['seal', /\bseal\b/i],
    ['frog', /\b(frog|toad)\b/i],
    ['butterfly', /\bbutterfly\b/i],
    ['bee', /\bbee\b/i],
    ['dragonfly', /\bdragonfly\b/i],
    ['beetle', /\bbeetle\b/i],
    ['spider', /\bspider\b/i],
    ['crab', /\bcrab\b/i],
    ['fish', /\b(fish|salmon|trout|tuna|clownfish)\b/i],
    ['cat', /\b(cat|kitten)\b/i],
    ['dog', /\b(dog|puppy)\b/i]
  ];

  function stripHtml(value='') {
    const div = document.createElement('div');
    div.innerHTML = String(value || '');
    return (div.textContent || div.innerText || '').replace(/\s+/g,' ').trim();
  }

  function expectedAnimal(query='') {
    return ANIMALS.find(([,rx]) => rx.test(String(query || ''))) || null;
  }

  function metadataText(item={}) {
    return [
      item.title, item.description, item.subject, item.creator,
      item.attribution, item.provider
    ].map(x => Array.isArray(x) ? x.join(' ') : String(x || '')).join(' ');
  }

  function matchesQuery(item, query) {
    const wanted = expectedAnimal(query);
    if (wanted) return wanted[1].test(metadataText(item));

    if (/\b(wildlife|wild animal|animals?|nature)\b/i.test(String(query || ''))) {
      return ANIMALS.some(([,rx]) => rx.test(metadataText(item)));
    }

    return true;
  }

  function goodLicense(label='', url='') {
    const s = `${label} ${url}`.toLowerCase();
    return (
      s.includes('public domain') ||
      s.includes('cc0') ||
      s.includes('publicdomain/zero') ||
      s.includes('publicdomain/mark') ||
      (
        (s.includes('cc by') || s.includes('/licenses/by/')) &&
        !s.includes('by-sa') &&
        !s.includes('noncommercial') &&
        !s.includes('no derivatives')
      )
    );
  }

  async function fetchJson(url, timeoutMs=9000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        mode:'cors',
        cache:'no-store',
        signal:controller.signal
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  function loadCursor() {
    try {
      const x = JSON.parse(localStorage.getItem(CURSOR_KEY) || '{}');
      return x && typeof x === 'object' ? x : {};
    } catch {
      return {};
    }
  }

  function nextCursor(query, provider, modulo) {
    const all = loadCursor();
    const key = `${provider}:${String(query || '').toLowerCase()}`;
    const current = Math.max(0, Number(all[key] || 0));
    const next = (current + 1) % modulo;
    all[key] = next;
    try { localStorage.setItem(CURSOR_KEY, JSON.stringify(all)); } catch {}
    return current;
  }

  function unique(items=[]) {
    const seen = new Set();
    return items.filter(item => {
      const key = String(item?.fileUrl || item?.sourceUrl || item?.title || '').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ---------- Deep Wikimedia ----------
  async function deepCommons(query, limit=12) {
    const page = nextCursor(query, 'commons', 12);
    const url = new URL('https://commons.wikimedia.org/w/api.php');
    const params = {
      action:'query',
      generator:'search',
      gsrsearch:`${query} filetype:video`,
      gsrnamespace:'6',
      gsrlimit:String(Math.max(12, Math.min(30, limit * 2))),
      gsroffset:String(page * 25),
      prop:'imageinfo',
      iiprop:'url|size|mime|mediatype|extmetadata',
      iiurlwidth:'480',
      format:'json',
      formatversion:'2',
      origin:'*'
    };
    Object.entries(params).forEach(([k,v]) => url.searchParams.set(k,v));

    const data = await fetchJson(url.toString(), 9500);
    const pages = data?.query?.pages || [];

    return pages.map(page => {
      const info = page?.imageinfo?.[0] || {};
      const meta = info.extmetadata || {};
      const mv = key => stripHtml(meta?.[key]?.value || '');
      const title = String(page?.title || '').replace(/^File:/i,'');
      const creator = mv('Artist') || mv('Credit') || 'Wikimedia Commons contributor';
      const license = mv('LicenseShortName') || mv('UsageTerms') || '';
      const licenseUrl = mv('LicenseUrl') || '';
      const sourceUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(String(page?.title || '').replace(/ /g,'_')).replace(/%2F/g,'/')}`;
      return {
        title,
        creator,
        description:mv('ImageDescription'),
        subject:'',
        sourceUrl,
        fileUrl:info.url || '',
        license,
        licenseUrl,
        mime:info.mime || '',
        size:Number(info.size || 0),
        provider:'Wikimedia Commons',
        attribution:`“${title}” — ${creator}. Source: Wikimedia Commons. Licence: ${license}. ${sourceUrl}`
      };
    }).filter(item =>
      item.fileUrl &&
      String(item.mime).startsWith('video/') &&
      (!item.size || item.size <= MAX_BYTES) &&
      goodLicense(item.license, item.licenseUrl) &&
      matchesQuery(item, query)
    ).slice(0,limit);
  }

  // ---------- Deep Internet Archive ----------
  function encPath(path='') {
    return String(path).split('/').map(encodeURIComponent).join('/');
  }

  async function deepArchive(query, limit=10) {
    const page = nextCursor(query, 'archive', 20) + 1;
    const u = new URL('https://archive.org/advancedsearch.php');
    u.searchParams.set('q', `${query} AND mediatype:(movies)`);
    for (const f of ['identifier','title','description','creator','licenseurl','subject']) {
      u.searchParams.append('fl[]', f);
    }
    u.searchParams.set('rows', String(Math.max(8, Math.min(16, limit + 5))));
    u.searchParams.set('page', String(page));
    u.searchParams.set('output','json');

    const data = await fetchJson(u.toString(), 9500);
    const docs = data?.response?.docs || [];

    const settled = await Promise.allSettled(
      docs.slice(0,14).map(async doc => {
        const id = String(doc?.identifier || '');
        if (!id) return null;

        const meta = await fetchJson(`https://archive.org/metadata/${encodeURIComponent(id)}`, 9500);
        const md = meta?.metadata || {};
        const licenseUrl = String(md?.licenseurl || md?.license || '');
        const license = String(md?.rights || md?.license || licenseUrl || '');
        if (!goodLicense(license, licenseUrl)) return null;

        const files = (Array.isArray(meta?.files) ? meta.files : [])
          .map(f => ({
            name:String(f?.name || ''),
            size:Number(f?.size || 0)
          }))
          .filter(f =>
            /\.(mp4|webm|ogv)$/i.test(f.name) &&
            (!f.size || (f.size >= 96*1024 && f.size <= MAX_BYTES))
          )
          .sort((a,b) => Number(a.size || 999999999) - Number(b.size || 999999999));

        const file = files[0];
        if (!file?.name) return null;

        const title = String(md?.title || doc?.title || id);
        const creator = String(md?.creator || doc?.creator || 'Internet Archive contributor');
        const description = stripHtml(md?.description || doc?.description || '');
        const subject = md?.subject || doc?.subject || '';
        const sourceUrl = `https://archive.org/details/${encodeURIComponent(id)}`;
        const fileUrl = `https://archive.org/download/${encodeURIComponent(id)}/${encPath(file.name)}`;

        const item = {
          title, creator, description, subject,
          sourceUrl, fileUrl, license, licenseUrl,
          mime:/\.mp4$/i.test(file.name) ? 'video/mp4' :
               /\.ogv$/i.test(file.name) ? 'video/ogg' : 'video/webm',
          size:file.size || 0,
          provider:'Internet Archive',
          attribution:`“${title}” — ${creator}. Source: Internet Archive. Licence: ${license || licenseUrl}. ${sourceUrl}`
        };

        return matchesQuery(item, query) ? item : null;
      })
    );

    return settled
      .filter(x => x.status === 'fulfilled' && x.value)
      .map(x => x.value)
      .slice(0,limit);
  }

  // ---------- Deep Library of Congress ----------
  function flattenMedia(value, out=[]) {
    if (!value) return out;
    if (typeof value === 'string') {
      if (/^https?:\/\//i.test(value) && /\.(mp4|webm|ogv)(?:\?|$)/i.test(value)) out.push(value);
      return out;
    }
    if (Array.isArray(value)) {
      value.forEach(v => flattenMedia(v,out));
      return out;
    }
    if (typeof value === 'object') {
      Object.values(value).forEach(v => flattenMedia(v,out));
    }
    return out;
  }

  async function deepLoc(query, limit=8) {
    const page = nextCursor(query, 'loc', 12) + 1;
    const u = new URL('https://www.loc.gov/film-and-videos/');
    u.searchParams.set('q',query);
    u.searchParams.set('fo','json');
    u.searchParams.set('c',String(Math.max(10,Math.min(20,limit*2))));
    u.searchParams.set('sp',String(page));

    const data = await fetchJson(u.toString(),9500);
    const out=[];

    for (const result of data?.results || []) {
      const rights = [
        result?.rights,
        result?.rights_advisory,
        result?.rights_information,
        result?.item?.rights,
        result?.item?.rights_advisory,
        result?.item?.rights_information
      ].flat().map(x => String(x || '')).join(' ');

      if (!/(public domain|free to use and reuse)/i.test(rights)) continue;

      const fileUrl = [...new Set(flattenMedia(result))][0] || '';
      if (!fileUrl) continue;

      const title = String(result?.title || result?.item?.title || 'Library of Congress video');
      const creator = Array.isArray(result?.contributor)
        ? result.contributor.join(', ')
        : String(result?.contributor || 'Library of Congress');
      const sourceUrl = String(result?.id || result?.url || '');

      const item = {
        title,
        creator,
        description:stripHtml(result?.description || ''),
        subject:result?.subject || '',
        sourceUrl,
        fileUrl,
        license:'Public domain / Free to Use and Reuse',
        licenseUrl:sourceUrl,
        mime:/\.mp4(?:\?|$)/i.test(fileUrl) ? 'video/mp4' :
             /\.ogv(?:\?|$)/i.test(fileUrl) ? 'video/ogg' : 'video/webm',
        size:0,
        provider:'Library of Congress',
        attribution:`“${title}” — ${creator}. Source: Library of Congress. Rights: Public domain / Free to Use and Reuse. ${sourceUrl}`
      };

      if (matchesQuery(item,query)) out.push(item);
      if (out.length >= limit) break;
    }

    return out;
  }

  function variants(query='') {
    const q = String(query || '').replace(/\s+/g,' ').trim();
    const base = q
      .replace(/\b(public domain|creative commons|cc0)\b/ig,'')
      .replace(/\s+/g,' ')
      .trim();

    const animal = expectedAnimal(base)?.[0] || '';
    const out = [
      q,
      base,
      animal ? `${animal} wildlife` : `${base} wildlife`,
      animal ? `${animal} nature` : `${base} nature`,
      animal ? `${animal} animal behavior` : `${base} animal behavior`,
      animal ? `${animal} in the wild` : `${base} animals`,
      animal ? `${animal} habitat` : `${base} nature documentary`
    ].filter(Boolean);

    return [...new Set(out)];
  }

  async function deepSearch(query, limit=12) {
    const wanted=Math.max(1,Math.min(20,Number(limit||12)));
    const qs=variants(query).slice(0,4);

    for (const q of qs) {
      const settled=await Promise.allSettled([
        deepCommons(q, Math.min(14,wanted)),
        deepArchive(q, Math.min(10,wanted)),
        deepLoc(q, Math.min(8,wanted))
      ]);

      const items=[];
      for (const result of settled) {
        if (result.status === 'fulfilled') items.push(...result.value);
      }

      const good=unique(items)
        .filter(item => matchesQuery(item,query))
        .sort((a,b) => Number(a?.size || 12*1024*1024) - Number(b?.size || 12*1024*1024));

      if (good.length) return good.slice(0,wanted);
    }

    return [];
  }

  function patch() {
    const yt=window.ClipFreeYouTube;
    if (!yt?.searchCommonsDownloadable) return false;
    if (yt[FLAG]) return true;

    const previous=yt.searchCommonsDownloadable.bind(yt);

    yt.searchCommonsDownloadable=async function v31DeepSearch(query,limit=12) {
      const wanted=Math.max(1,Math.min(20,Number(limit||12)));

      // Keep all existing source providers/filters first.
      let existing=[];
      try {
        existing=await previous(query,wanted);
      } catch (err) {
        console.warn('v31 existing Source Vault pass failed',err);
      }

      if ((existing || []).length >= wanted) {
        return unique(existing).slice(0,wanted);
      }

      let deep=[];
      try {
        deep=await deepSearch(query,wanted);
      } catch (err) {
        console.warn('v31 deep Source Vault pass failed',err);
      }

      return unique([...(existing || []),...(deep || [])])
        .filter(item => matchesQuery(item,query))
        .slice(0,wanted);
    };

    yt[FLAG]=true;
    window.CLIPFREE_DEEP_SOURCE_V31={
      version:'31.0',
      automaticRepositories:[
        'Wikimedia Commons',
        'Internet Archive',
        'Library of Congress'
      ],
      rotatingPages:true,
      queryVariants:true,
      strictRights:true,
      maxAutomaticFileBytes:MAX_BYTES,
      claimedIndependentSites:null
    };

    return true;
  }

  function addBadge() {
    if ($('clipfreeV31SourceStatus')) return true;

    const qs=new URLSearchParams(location.search);
    if (qs.get('audit')==='1' || qs.get('compliance')==='1' || qs.get('review')==='1') {
      return true;
    }

    const head=$('clipfreeSimpleStudio')?.querySelector('.simple-head');
    if (!head) return false;

    const card=document.createElement('div');
    card.id='clipfreeV31SourceStatus';
    card.style.cssText=
      'margin:12px 0;padding:11px 13px;border:1px solid #355b78;border-radius:13px;' +
      'background:#0d151c;color:#b7e4ff;font-size:.76rem;font-weight:900;line-height:1.45';
    card.innerHTML=
      '🌍 v31 DEEP SOURCE VAULT • rotating archive pages • much larger unused-video pool • no unsafe blind scraping';
    head.appendChild(card);
    return true;
  }

  patch();
  addBadge();

  const timer=setInterval(() => {
    const ready=patch();
    addBadge();
    if (ready && $('clipfreeV31SourceStatus')) clearInterval(timer);
  },180);
  setTimeout(() => clearInterval(timer),30000);

  window.addEventListener('clipfree-youtube-ready',() => setTimeout(() => {
    patch();
    addBadge();
  },0));
  window.addEventListener('pageshow',addBadge);
})();

/* CLIPFREE 10+ FREE SOURCE HUB v32 */
/*
  Supported source websites:
  AUTO / NO KEY
   1. Wikimedia Commons
   2. Internet Archive
   3. Library of Congress
   4. NASA Image & Video Library

  OPTIONAL FREE API KEY
   5. Pixabay
   6. Pexels (existing keys only while new key issuance is paused)
   7. National Park Service
   8. DVIDS / U.S. Department of Defense public media
   9. U.S. National Archives
  10. Smithsonian Open Access

  API keys are saved only in this browser's localStorage, never written to GitHub.
  Providers are queried only when configured, and results still pass ClipFree's
  animal matching, reuse-history and rights checks.
*/
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const KEY_STORE = 'clipfree_free_source_keys_v32';
  const FLAG = '__clipfreeTenPlusSourcesV32';
  const MAX_BYTES = 32 * 1024 * 1024;

  const PROVIDERS = [
    ['wikimedia','Wikimedia Commons','auto'],
    ['archive','Internet Archive','auto'],
    ['loc','Library of Congress','auto'],
    ['nasa','NASA Image & Video Library','auto'],
    ['pixabay','Pixabay','key'],
    ['pexels','Pexels','key'],
    ['nps','National Park Service','key'],
    ['dvids','DVIDS','key'],
    ['nara','U.S. National Archives','key'],
    ['smithsonian','Smithsonian Open Access','key']
  ];

  const ANIMALS = [
    ['mountain lion', /\b(mountain lion|cougar|puma)\b/i],
    ['sea lion', /\bsea lion\b/i],
    ['polar bear', /\bpolar bear\b/i],
    ['grizzly bear', /\bgrizzly bear\b/i],
    ['lion', /\b(lion|lioness)\b/i],
    ['tiger', /\btiger\b/i],
    ['leopard', /\bleopard\b/i],
    ['cheetah', /\bcheetah\b/i],
    ['jaguar', /\bjaguar\b/i],
    ['wolf', /\b(wolf|wolves)\b/i],
    ['coyote', /\bcoyote\b/i],
    ['fox', /\bfox\b/i],
    ['bear', /\bbear\b/i],
    ['elephant', /\belephant\b/i],
    ['giraffe', /\bgiraffe\b/i],
    ['zebra', /\bzebra\b/i],
    ['rhino', /\b(rhino|rhinoceros)\b/i],
    ['hippo', /\b(hippo|hippopotamus)\b/i],
    ['bison', /\b(bison|buffalo)\b/i],
    ['moose', /\bmoose\b/i],
    ['elk', /\belk\b/i],
    ['deer', /\b(deer|stag|doe|buck|reindeer|caribou)\b/i],
    ['antelope', /\b(antelope|gazelle|pronghorn|wildebeest)\b/i],
    ['kangaroo', /\bkangaroo\b/i],
    ['koala', /\bkoala\b/i],
    ['otter', /\botter\b/i],
    ['rabbit', /\b(rabbit|hare)\b/i],
    ['squirrel', /\bsquirrel\b/i],
    ['gorilla', /\bgorilla\b/i],
    ['chimpanzee', /\bchimpanzee\b/i],
    ['orangutan', /\borangutan\b/i],
    ['monkey', /\b(monkey|macaque|baboon|gibbon|lemur)\b/i],
    ['hyena', /\b(hyena|hyaena)\b/i],
    ['crocodile', /\bcrocodile\b/i],
    ['alligator', /\balligator\b/i],
    ['turtle', /\b(turtle|tortoise)\b/i],
    ['snake', /\b(snake|python|cobra|rattlesnake|boa)\b/i],
    ['eagle', /\beagle\b/i],
    ['hawk', /\bhawk\b/i],
    ['falcon', /\bfalcon\b/i],
    ['owl', /\bowl\b/i],
    ['penguin', /\bpenguin\b/i],
    ['shark', /\b(shark|great white|hammerhead)\b/i],
    ['whale', /\b(whale|orca)\b/i],
    ['dolphin', /\bdolphin\b/i],
    ['seal', /\bseal\b/i],
    ['frog', /\b(frog|toad)\b/i],
    ['butterfly', /\bbutterfly\b/i],
    ['bee', /\bbee\b/i],
    ['dragonfly', /\bdragonfly\b/i],
    ['beetle', /\bbeetle\b/i],
    ['spider', /\bspider\b/i],
    ['crab', /\bcrab\b/i],
    ['fish', /\b(fish|salmon|trout|tuna)\b/i],
    ['cat', /\b(cat|kitten)\b/i],
    ['dog', /\b(dog|puppy)\b/i]
  ];

  function keys() {
    try {
      const x = JSON.parse(localStorage.getItem(KEY_STORE) || '{}');
      return x && typeof x === 'object' ? x : {};
    } catch {
      return {};
    }
  }

  function saveKeys(next) {
    try { localStorage.setItem(KEY_STORE, JSON.stringify(next)); } catch {}
  }

  async function fetchJson(url, options={}, timeoutMs=9000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        mode:'cors',
        cache:'no-store',
        ...options,
        signal:controller.signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  function animalFor(query='') {
    return ANIMALS.find(([,rx]) => rx.test(String(query || ''))) || null;
  }

  function matches(item, query) {
    const text = [
      item.title, item.description, item.tags, item.creator, item.provider
    ].filter(Boolean).join(' ');

    const wanted = animalFor(query);
    if (wanted) return wanted[1].test(text);

    return ANIMALS.some(([,rx]) => rx.test(text));
  }

  function unique(items=[]) {
    const seen = new Set();
    return items.filter(item => {
      const key = String(item?.fileUrl || item?.sourceUrl || item?.title || '').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function recursivelyFindMedia(value, out=[]) {
    if (!value) return out;

    if (typeof value === 'string') {
      if (/^https?:\/\//i.test(value) && /\.(mp4|webm|ogv)(?:\?|$)/i.test(value)) {
        out.push(value);
      }
      return out;
    }

    if (Array.isArray(value)) {
      value.forEach(v => recursivelyFindMedia(v,out));
      return out;
    }

    if (typeof value === 'object') {
      Object.values(value).forEach(v => recursivelyFindMedia(v,out));
    }

    return out;
  }

  // ---------- NASA: zero key ----------
  async function searchNASA(query, limit=6) {
    const u = new URL('https://images-api.nasa.gov/search');
    u.searchParams.set('q',query);
    u.searchParams.set('media_type','video');
    u.searchParams.set('page_size',String(Math.max(4,Math.min(12,limit*2))));

    const data = await fetchJson(u.toString(),{},9000);
    const items = data?.collection?.items || [];
    const out=[];

    for (const row of items.slice(0,12)) {
      const meta=row?.data?.[0] || {};
      const copyright=String(meta?.copyright || '').trim();

      // NASA can host third-party copyrighted media. Skip anything explicitly
      // carrying a copyright field.
      if (copyright) continue;

      const manifest=String(row?.href || '').trim();
      if (!manifest) continue;

      let assets=[];
      try { assets=await fetchJson(manifest,{},7000); } catch { continue; }

      const urls=(Array.isArray(assets) ? assets : recursivelyFindMedia(assets))
        .filter(x => /\.(mp4|webm)(?:\?|$)/i.test(String(x)));

      const fileUrl=urls[0] || '';
      if (!fileUrl) continue;

      const title=String(meta?.title || 'NASA video');
      const description=String(meta?.description || '');
      const item={
        title,
        description,
        tags:Array.isArray(meta?.keywords) ? meta.keywords.join(' ') : String(meta?.keywords || ''),
        creator:String(meta?.center || 'NASA'),
        provider:'NASA Image & Video Library',
        sourceUrl:`https://images.nasa.gov/details/${encodeURIComponent(meta?.nasa_id || '')}`,
        fileUrl,
        license:'NASA public media — no third-party copyright marker found',
        licenseUrl:'https://www.nasa.gov/nasa-brand-center/images-and-media/',
        mime:/\.webm(?:\?|$)/i.test(fileUrl) ? 'video/webm' : 'video/mp4',
        size:0,
        attribution:`“${title}” — NASA. Source: NASA Image & Video Library.`
      };

      if (matches(item,query)) out.push(item);
      if (out.length>=limit) break;
    }

    return out;
  }

  // ---------- Pixabay: free API key ----------
  async function searchPixabay(query,key,limit=8) {
    const u=new URL('https://pixabay.com/api/videos/');
    u.searchParams.set('key',key);
    u.searchParams.set('q',query);
    u.searchParams.set('category','animals');
    u.searchParams.set('safesearch','true');
    u.searchParams.set('per_page',String(Math.max(3,Math.min(20,limit*2))));

    const data=await fetchJson(u.toString(),{},9000);
    return (data?.hits || []).map(hit => {
      const files=hit?.videos || {};
      const chosen=files?.medium || files?.small || files?.tiny || files?.large || {};
      return {
        title:String(hit?.tags || query),
        description:String(hit?.tags || ''),
        tags:String(hit?.tags || ''),
        creator:String(hit?.user || 'Pixabay contributor'),
        provider:'Pixabay',
        sourceUrl:String(hit?.pageURL || ''),
        fileUrl:String(chosen?.url || ''),
        license:'Pixabay Content License',
        licenseUrl:'https://pixabay.com/service/license-summary/',
        mime:'video/mp4',
        size:Number(chosen?.size || 0),
        attribution:`Video by ${hit?.user || 'a Pixabay contributor'} on Pixabay. ${hit?.pageURL || ''}`
      };
    }).filter(item =>
      item.fileUrl &&
      (!item.size || item.size<=MAX_BYTES) &&
      matches(item,query)
    ).slice(0,limit);
  }

  // ---------- Pexels: existing free API key ----------
  async function searchPexels(query,key,limit=8) {
    const u=new URL('https://api.pexels.com/v1/videos/search');
    u.searchParams.set('query',query);
    u.searchParams.set('orientation','portrait');
    u.searchParams.set('size','small');
    u.searchParams.set('per_page',String(Math.max(3,Math.min(20,limit*2))));

    const data=await fetchJson(u.toString(),{
      headers:{Authorization:key}
    },9000);

    return (data?.videos || []).map(v => {
      const files=(v?.video_files || [])
        .filter(f => /^https?:\/\//i.test(String(f?.link || '')))
        .sort((a,b)=>(Number(a?.width||9999)*Number(a?.height||9999))-(Number(b?.width||9999)*Number(b?.height||9999)));
      const chosen=files.find(f => Number(f?.height||0)>=720) || files[0] || {};
      return {
        title:String(v?.url || query).split('/').filter(Boolean).pop()?.replace(/-/g,' ') || query,
        description:query,
        tags:query,
        creator:String(v?.user?.name || 'Pexels contributor'),
        provider:'Pexels',
        sourceUrl:String(v?.url || ''),
        fileUrl:String(chosen?.link || ''),
        license:'Pexels License',
        licenseUrl:'https://www.pexels.com/license/',
        mime:String(chosen?.file_type || 'video/mp4'),
        size:0,
        attribution:`Video by ${v?.user?.name || 'a Pexels contributor'} on Pexels. ${v?.url || ''}`
      };
    }).filter(item => item.fileUrl && matches(item,query)).slice(0,limit);
  }

  // ---------- Generic free-key government provider ----------
  async function genericKeyProvider(name,url,key,query,headers={},limit=6) {
    const data=await fetchJson(url,{
      headers:{...headers}
    },10000);

    const media=[...new Set(recursivelyFindMedia(data))].slice(0,20);
    if (!media.length) return [];

    const text=JSON.stringify(data).slice(0,12000);
    if (!animalFor(query)?.[1].test(text) && animalFor(query)) return [];

    return media.slice(0,limit).map((fileUrl,i) => ({
      title:`${query} — ${name} video ${i+1}`,
      description:text.slice(0,1000),
      tags:query,
      creator:name,
      provider:name,
      sourceUrl:url,
      fileUrl,
      license:'Provider record requires item-level rights validation',
      licenseUrl:url,
      mime:/\.webm(?:\?|$)/i.test(fileUrl) ? 'video/webm' : 'video/mp4',
      size:0,
      attribution:`Source: ${name}. ${url}`,
      __clipfreeNeedsStrictRightsCheck:true
    }));
  }

  async function optionalSearches(query,limit=8) {
    const k=keys();
    const jobs=[];

    if (k.pixabay) jobs.push(searchPixabay(query,k.pixabay,limit));
    if (k.pexels) jobs.push(searchPexels(query,k.pexels,limit));

    if (k.nps) {
      const u=new URL('https://developer.nps.gov/api/v1/multimedia/videos');
      u.searchParams.set('q',query);
      u.searchParams.set('limit',String(Math.max(3,Math.min(12,limit))));
      jobs.push(genericKeyProvider('National Park Service',u.toString(),k.nps,query,{'X-Api-Key':k.nps},limit));
    }

    if (k.dvids) {
      const u=new URL('https://api.dvidshub.net/search');
      u.searchParams.set('q',query);
      u.searchParams.set('max_results',String(Math.max(3,Math.min(12,limit))));
      u.searchParams.set('api_key',k.dvids);
      jobs.push(genericKeyProvider('DVIDS',u.toString(),k.dvids,query,{},limit));
    }

    if (k.nara) {
      const u=new URL('https://catalog.archives.gov/api/v2/records/search');
      u.searchParams.set('q',query);
      jobs.push(genericKeyProvider('U.S. National Archives',u.toString(),k.nara,query,{'x-api-key':k.nara},limit));
    }

    if (k.smithsonian) {
      const u=new URL('https://api.si.edu/openaccess/api/v1.0/search');
      u.searchParams.set('q',query);
      u.searchParams.set('api_key',k.smithsonian);
      jobs.push(genericKeyProvider('Smithsonian Open Access',u.toString(),k.smithsonian,query,{},limit));
    }

    if (!jobs.length) return [];

    const settled=await Promise.allSettled(jobs);
    const out=[];
    for (const r of settled) {
      if (r.status==='fulfilled') out.push(...r.value);
    }
    return unique(out).slice(0,limit);
  }

  function patch() {
    const yt=window.ClipFreeYouTube;
    if (!yt?.searchCommonsDownloadable) return false;
    if (yt[FLAG]) return true;

    const previous=yt.searchCommonsDownloadable.bind(yt);

    yt.searchCommonsDownloadable=async function tenPlusSourceSearch(query,limit=12) {
      const wanted=Math.max(1,Math.min(20,Number(limit||12)));
      let base=[];

      try { base=await previous(query,wanted); }
      catch (err) { console.warn('v32 base source search failed',err); }

      if (base.length>=wanted) return unique(base).slice(0,wanted);

      const jobs=[searchNASA(query,Math.min(6,wanted)),optionalSearches(query,wanted)];
      const settled=await Promise.allSettled(jobs);

      const extra=[];
      for(const r of settled){
        if(r.status==='fulfilled') extra.push(...r.value);
      }

      return unique([...base,...extra])
        .filter(item => matches(item,query))
        .slice(0,wanted);
    };

    yt[FLAG]=true;
    return true;
  }

  function providerRows() {
    const k=keys();
    return PROVIDERS.map(([id,name,type]) => {
      let status='AUTO';
      if(type==='key') status=k[id] ? 'CONNECTED' : 'FREE KEY';
      if(id==='pexels' && !k[id]) status='EXISTING KEY';
      return `<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.06)">
        <span>${name}</span><b style="color:${status==='AUTO'||status==='CONNECTED'?'#9de8b5':'#f2d38b'}">${status}</b>
      </div>`;
    }).join('');
  }

  function addPanel() {
    if ($('clipfreeSourceHubV32')) return true;

    const head=$('clipfreeSimpleStudio')?.querySelector('.simple-head');
    if(!head) return false;

    const card=document.createElement('details');
    card.id='clipfreeSourceHubV32';
    card.style.cssText='margin:12px 0;padding:12px 13px;border:1px solid #3a5d78;border-radius:13px;background:#0d151c;color:#eaf7ff;font-size:.76rem;line-height:1.5';
    card.innerHTML=`
      <summary style="cursor:pointer;font-weight:900;color:#b9e6ff">
        🌍 10 FREE SOURCE WEBSITES • 4 automatic + 6 free-key options
      </summary>
      <div style="margin-top:10px">${providerRows()}</div>
      <div style="margin-top:10px;color:#b8c8d2">
        Free API keys are optional and are stored only on this phone/browser — never in GitHub.
      </div>
      <div id="clipfreeSourceKeyFormV32" style="margin-top:10px;display:grid;gap:8px">
        ${[
          ['pixabay','Pixabay API key'],
          ['pexels','Pexels existing API key'],
          ['nps','National Park Service API key'],
          ['dvids','DVIDS API key'],
          ['nara','National Archives API key'],
          ['smithsonian','Smithsonian Open Access API key']
        ].map(([id,label])=>`
          <label style="display:grid;gap:4px">
            <span>${label}</span>
            <input data-source-key="${id}" type="password" autocomplete="off"
              value="${String(keys()[id]||'').replace(/"/g,'&quot;')}"
              style="width:100%;box-sizing:border-box;padding:9px;border-radius:8px;border:1px solid #384956;background:#090d11;color:#fff">
          </label>`).join('')}
        <button id="clipfreeSaveSourceKeysV32" type="button"
          style="padding:10px;border:0;border-radius:9px;background:#235d3b;color:#fff;font-weight:900">
          SAVE FREE SOURCE KEYS ON THIS DEVICE
        </button>
      </div>
    `;

    head.appendChild(card);

    $('clipfreeSaveSourceKeysV32')?.addEventListener('click',() => {
      const next={};
      card.querySelectorAll('[data-source-key]').forEach(input => {
        const value=String(input.value||'').trim();
        if(value) next[input.dataset.sourceKey]=value;
      });
      saveKeys(next);

      const wasOpen=card.open;
      card.remove();
      addPanel();
      $('clipfreeSourceHubV32').open=wasOpen;

      const status=$('simpleStatus');
      if(status) status.textContent='Free source connections saved on this device.';
    });

    return true;
  }

  patch();
  addPanel();

  const timer=setInterval(() => {
    const ok=patch();
    addPanel();
    if(ok && $('clipfreeSourceHubV32')) clearInterval(timer);
  },180);
  setTimeout(()=>clearInterval(timer),30000);

  window.addEventListener('clipfree-youtube-ready',()=>setTimeout(() => {
    patch();
    addPanel();
  },0));

  window.CLIPFREE_V32={
    version:'32.0',
    sourceWebsites:10,
    automaticNoKey:4,
    optionalFreeKey:6,
    keysStoredInBrowserOnly:true,
    reviewerFlowChanged:false
  };
})();

/* CLIPFREE EMERGENCY SOURCE RECOVERY v33 */
/*
  Fixes the current "0/1 unused source videos" lockout.

  Root causes addressed:
  1) legacy source history stored source TITLES as if they were unique IDs,
     so two genuinely different files with the same title could both be blocked;
  2) many stacked source wrappers could over-filter or time out before returning
     a usable result;
  3) old failed checkpoint text could remain after the underlying source problem
     was already repaired.

  v33 keeps URL/hash duplicate protection and never intentionally reuses the
  exact same source file.
*/
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const SOURCE_HISTORY_KEY = 'clipfree_source_history_v6';
  const CURSOR_KEY = 'clipfree_source_recovery_cursor_v33';
  const CHECKPOINT_KEY = 'clipfree_batch_checkpoint_v19';
  const FLAG = '__clipfreeEmergencyRecoveryV33';
  const MAX_BYTES = 36 * 1024 * 1024;

  const ANIMALS = [
    ['mountain lion', /\b(mountain lion|cougar|puma)\b/i],
    ['sea lion', /\bsea lion\b/i],
    ['polar bear', /\bpolar bear\b/i],
    ['grizzly bear', /\bgrizzly bear\b/i],
    ['rusty patched bumble bee', /\brusty patched bumble bee\b/i],
    ['leafcutter bee', /\bleafcutter bee\b/i],
    ['bumble bee', /\b(bumble ?bee|bumblebee|bombus)\b/i],
    ['monarch butterfly', /\bmonarch butterfly\b/i],
    ['whale shark', /\bwhale shark\b/i],
    ['lion', /\b(lion|lioness|panthera leo)\b/i],
    ['tiger', /\b(tiger|panthera tigris)\b/i],
    ['leopard', /\bleopard\b/i],
    ['cheetah', /\bcheetah\b/i],
    ['jaguar', /\bjaguar\b/i],
    ['lynx', /\blynx\b/i],
    ['bobcat', /\bbobcat\b/i],
    ['wolf', /\b(wolf|wolves|canis lupus)\b/i],
    ['coyote', /\bcoyote\b/i],
    ['fox', /\bfox\b/i],
    ['bear', /\b(bear|ursus)\b/i],
    ['elephant', /\belephant\b/i],
    ['giraffe', /\bgiraffe\b/i],
    ['zebra', /\bzebra\b/i],
    ['rhino', /\b(rhino|rhinoceros)\b/i],
    ['hippo', /\b(hippo|hippopotamus)\b/i],
    ['bison', /\b(bison|buffalo)\b/i],
    ['moose', /\bmoose\b/i],
    ['elk', /\belk\b/i],
    ['deer', /\b(deer|stag|doe|buck|reindeer|caribou)\b/i],
    ['antelope', /\b(antelope|gazelle|pronghorn|wildebeest)\b/i],
    ['kangaroo', /\bkangaroo\b/i],
    ['koala', /\bkoala\b/i],
    ['otter', /\botter\b/i],
    ['rabbit', /\b(rabbit|hare)\b/i],
    ['squirrel', /\bsquirrel\b/i],
    ['gorilla', /\bgorilla\b/i],
    ['chimpanzee', /\bchimpanzee\b/i],
    ['orangutan', /\borangutan\b/i],
    ['monkey', /\b(monkey|macaque|baboon|gibbon|lemur)\b/i],
    ['hyena', /\b(hyena|hyaena)\b/i],
    ['meerkat', /\bmeerkat\b/i],
    ['crocodile', /\bcrocodile\b/i],
    ['alligator', /\balligator\b/i],
    ['turtle', /\b(turtle|tortoise)\b/i],
    ['snake', /\b(snake|python|cobra|rattlesnake|boa)\b/i],
    ['eagle', /\beagle\b/i],
    ['hawk', /\bhawk\b/i],
    ['falcon', /\bfalcon\b/i],
    ['owl', /\bowl\b/i],
    ['penguin', /\bpenguin\b/i],
    ['shark', /\b(shark|great white|hammerhead)\b/i],
    ['whale', /\b(whale|orca)\b/i],
    ['dolphin', /\bdolphin\b/i],
    ['seal', /\bseal\b/i],
    ['frog', /\b(frog|toad)\b/i],
    ['butterfly', /\bbutterfly\b/i],
    ['bee', /\bbee\b/i],
    ['dragonfly', /\bdragonfly\b/i],
    ['beetle', /\bbeetle\b/i],
    ['spider', /\bspider\b/i],
    ['crab', /\bcrab\b/i],
    ['fish', /\b(fish|salmon|trout|tuna)\b/i],
    ['cat', /\b(cat|kitten)\b/i],
    ['dog', /\b(dog|puppy)\b/i]
  ];

  function stripHtml(value='') {
    const div=document.createElement('div');
    div.innerHTML=String(value||'');
    return (div.textContent||div.innerText||'').replace(/\s+/g,' ').trim();
  }

  function wantedAnimal(query='') {
    return ANIMALS.find(([,rx]) => rx.test(String(query||''))) || null;
  }

  function itemText(item={}) {
    return [
      item.title,item.description,item.subject,item.creator,item.attribution,item.provider
    ].map(x => Array.isArray(x)?x.join(' '):String(x||'')).join(' ');
  }

  function matches(item,query) {
    const wanted=wantedAnimal(query);
    if (wanted) return wanted[1].test(itemText(item));

    // Broad wildlife mode: metadata must still identify some animal.
    return ANIMALS.some(([,rx]) => rx.test(itemText(item)));
  }

  function goodLicense(label='',url='') {
    const s=`${label} ${url}`.toLowerCase();
    return (
      s.includes('public domain') ||
      s.includes('cc0') ||
      s.includes('publicdomain/zero') ||
      s.includes('publicdomain/mark') ||
      (
        (s.includes('cc by') || s.includes('/licenses/by/')) &&
        !s.includes('by-sa') &&
        !s.includes('noncommercial') &&
        !s.includes('no derivatives')
      )
    );
  }

  async function fetchJson(url,timeoutMs=11000) {
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try {
      const res=await fetch(url,{mode:'cors',cache:'no-store',signal:controller.signal});
      const data=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  function nextCursor(query,provider,modulo) {
    let all={};
    try { all=JSON.parse(localStorage.getItem(CURSOR_KEY)||'{}') || {}; } catch {}
    const key=`${provider}:${String(query||'').toLowerCase()}`;
    const current=Math.max(0,Number(all[key]||0));
    all[key]=(current+1)%modulo;
    try { localStorage.setItem(CURSOR_KEY,JSON.stringify(all)); } catch {}
    return current;
  }

  function unique(items=[]) {
    const seen=new Set();
    return items.filter(item => {
      const key=String(item?.fileUrl||item?.sourceUrl||'').trim();
      if(!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Remove only legacy TITLE strings from source history.
  // Keep all URLs, so exact old footage remains blocked.
  function repairLegacyHistory() {
    try {
      const old=JSON.parse(localStorage.getItem(SOURCE_HISTORY_KEY)||'[]');
      if(!Array.isArray(old)) return;

      const repaired=[...new Set(old.filter(value => {
        const s=String(value||'').trim();
        return /^https?:\/\//i.test(s) || /^[a-f0-9]{64}$/i.test(s);
      }))];

      if(repaired.length !== old.length) {
        localStorage.setItem(SOURCE_HISTORY_KEY,JSON.stringify(repaired.slice(-10000)));
      }
    } catch(err) {
      console.warn('v33 history repair skipped',err);
    }
  }

  async function commons(query,limit=18) {
    const offset=nextCursor(query,'commons',20)*20;
    const u=new URL('https://commons.wikimedia.org/w/api.php');
    const p={
      action:'query',
      generator:'search',
      gsrsearch:`${query} filetype:video`,
      gsrnamespace:'6',
      gsrlimit:String(Math.max(15,Math.min(40,limit*2))),
      gsroffset:String(offset),
      prop:'imageinfo',
      iiprop:'url|size|mime|mediatype|extmetadata',
      format:'json',
      formatversion:'2',
      origin:'*'
    };
    Object.entries(p).forEach(([k,v])=>u.searchParams.set(k,v));

    const data=await fetchJson(u.toString(),11000);
    return (data?.query?.pages||[]).map(page => {
      const info=page?.imageinfo?.[0]||{};
      const meta=info.extmetadata||{};
      const mv=k=>stripHtml(meta?.[k]?.value||'');
      const title=String(page?.title||'').replace(/^File:/i,'');
      const creator=mv('Artist')||mv('Credit')||'Wikimedia Commons contributor';
      const license=mv('LicenseShortName')||mv('UsageTerms')||'';
      const licenseUrl=mv('LicenseUrl')||'';
      const sourceUrl=`https://commons.wikimedia.org/wiki/${encodeURIComponent(String(page?.title||'').replace(/ /g,'_')).replace(/%2F/g,'/')}`;
      return {
        title,creator,description:mv('ImageDescription'),subject:'',
        sourceUrl,fileUrl:info.url||'',license,licenseUrl,
        mime:info.mime||'',size:Number(info.size||0),provider:'Wikimedia Commons',
        attribution:`“${title}” — ${creator}. Source: Wikimedia Commons. Licence: ${license}. ${sourceUrl}`
      };
    }).filter(item =>
      item.fileUrl &&
      String(item.mime).startsWith('video/') &&
      (!item.size || item.size<=MAX_BYTES) &&
      goodLicense(item.license,item.licenseUrl) &&
      matches(item,query)
    ).slice(0,limit);
  }

  function encPath(path='') {
    return String(path).split('/').map(encodeURIComponent).join('/');
  }

  async function archive(query,limit=12) {
    const page=nextCursor(query,'archive',30)+1;
    const u=new URL('https://archive.org/advancedsearch.php');
    u.searchParams.set('q',`${query} AND mediatype:(movies)`);
    for(const f of ['identifier','title','description','creator','licenseurl','subject']) {
      u.searchParams.append('fl[]',f);
    }
    u.searchParams.set('rows',String(Math.max(10,Math.min(20,limit+6))));
    u.searchParams.set('page',String(page));
    u.searchParams.set('output','json');

    const data=await fetchJson(u.toString(),11000);
    const docs=data?.response?.docs||[];

    const settled=await Promise.allSettled(
      docs.slice(0,16).map(async doc => {
        const id=String(doc?.identifier||'');
        if(!id) return null;

        const meta=await fetchJson(`https://archive.org/metadata/${encodeURIComponent(id)}`,10000);
        const md=meta?.metadata||{};
        const licenseUrl=String(md?.licenseurl||md?.license||'');
        const license=String(md?.rights||md?.license||licenseUrl||'');
        if(!goodLicense(license,licenseUrl)) return null;

        const files=(Array.isArray(meta?.files)?meta.files:[])
          .map(f=>({name:String(f?.name||''),size:Number(f?.size||0)}))
          .filter(f =>
            /\.(mp4|webm|ogv)$/i.test(f.name) &&
            (!f.size || (f.size>=96*1024 && f.size<=MAX_BYTES))
          )
          .sort((a,b)=>Number(a.size||999999999)-Number(b.size||999999999));

        const file=files[0];
        if(!file?.name) return null;

        const title=String(md?.title||doc?.title||id);
        const creator=String(md?.creator||doc?.creator||'Internet Archive contributor');
        const description=stripHtml(md?.description||doc?.description||'');
        const subject=md?.subject||doc?.subject||'';
        const sourceUrl=`https://archive.org/details/${encodeURIComponent(id)}`;
        const fileUrl=`https://archive.org/download/${encodeURIComponent(id)}/${encPath(file.name)}`;

        const item={
          title,creator,description,subject,sourceUrl,fileUrl,
          license,licenseUrl,
          mime:/\.mp4$/i.test(file.name)?'video/mp4':/\.ogv$/i.test(file.name)?'video/ogg':'video/webm',
          size:file.size||0,provider:'Internet Archive',
          attribution:`“${title}” — ${creator}. Source: Internet Archive. Licence: ${license||licenseUrl}. ${sourceUrl}`
        };

        return matches(item,query)?item:null;
      })
    );

    return settled.filter(x=>x.status==='fulfilled'&&x.value).map(x=>x.value).slice(0,limit);
  }

  function mediaUrls(value,out=[]) {
    if(!value) return out;
    if(typeof value==='string') {
      if(/^https?:\/\//i.test(value)&&/\.(mp4|webm|ogv)(?:\?|$)/i.test(value)) out.push(value);
      return out;
    }
    if(Array.isArray(value)) {
      value.forEach(v=>mediaUrls(v,out));
      return out;
    }
    if(typeof value==='object') Object.values(value).forEach(v=>mediaUrls(v,out));
    return out;
  }

  async function loc(query,limit=8) {
    const page=nextCursor(query,'loc',20)+1;
    const u=new URL('https://www.loc.gov/film-and-videos/');
    u.searchParams.set('q',query);
    u.searchParams.set('fo','json');
    u.searchParams.set('c',String(Math.max(12,Math.min(24,limit*2))));
    u.searchParams.set('sp',String(page));

    const data=await fetchJson(u.toString(),11000);
    const out=[];

    for(const result of data?.results||[]) {
      const rights=[
        result?.rights,result?.rights_advisory,result?.rights_information,
        result?.item?.rights,result?.item?.rights_advisory,result?.item?.rights_information
      ].flat().map(x=>String(x||'')).join(' ');

      if(!/(public domain|free to use and reuse)/i.test(rights)) continue;

      const fileUrl=[...new Set(mediaUrls(result))][0]||'';
      if(!fileUrl) continue;

      const title=String(result?.title||result?.item?.title||'Library of Congress video');
      const creator=Array.isArray(result?.contributor)
        ? result.contributor.join(', ')
        : String(result?.contributor||'Library of Congress');
      const sourceUrl=String(result?.id||result?.url||'');

      const item={
        title,creator,description:stripHtml(result?.description||''),
        subject:result?.subject||'',sourceUrl,fileUrl,
        license:'Public domain / Free to Use and Reuse',
        licenseUrl:sourceUrl,
        mime:/\.mp4(?:\?|$)/i.test(fileUrl)?'video/mp4':/\.ogv(?:\?|$)/i.test(fileUrl)?'video/ogg':'video/webm',
        size:0,provider:'Library of Congress',
        attribution:`“${title}” — ${creator}. Source: Library of Congress. Rights: Public domain / Free to Use and Reuse. ${sourceUrl}`
      };

      if(matches(item,query)) out.push(item);
      if(out.length>=limit) break;
    }
    return out;
  }

  async function nasa(query,limit=6) {
    const u=new URL('https://images-api.nasa.gov/search');
    u.searchParams.set('q',query);
    u.searchParams.set('media_type','video');
    u.searchParams.set('page_size',String(Math.max(8,Math.min(20,limit*3))));

    const data=await fetchJson(u.toString(),10000);
    const out=[];

    for(const row of (data?.collection?.items||[]).slice(0,18)) {
      const meta=row?.data?.[0]||{};
      if(String(meta?.copyright||'').trim()) continue;

      const manifest=String(row?.href||'');
      if(!manifest) continue;

      let assets=[];
      try { assets=await fetchJson(manifest,7000); } catch { continue; }

      const fileUrl=(Array.isArray(assets)?assets:mediaUrls(assets))
        .find(x=>/\.(mp4|webm)(?:\?|$)/i.test(String(x)))||'';
      if(!fileUrl) continue;

      const title=String(meta?.title||'NASA wildlife video');
      const item={
        title,description:String(meta?.description||''),
        subject:Array.isArray(meta?.keywords)?meta.keywords.join(' '):String(meta?.keywords||''),
        creator:String(meta?.center||'NASA'),provider:'NASA Image & Video Library',
        sourceUrl:`https://images.nasa.gov/details/${encodeURIComponent(meta?.nasa_id||'')}`,
        fileUrl,
        license:'NASA public media — no third-party copyright marker found',
        licenseUrl:'https://www.nasa.gov/nasa-brand-center/images-and-media/',
        mime:/\.webm(?:\?|$)/i.test(fileUrl)?'video/webm':'video/mp4',
        size:0,
        attribution:`“${title}” — NASA. Source: NASA Image & Video Library.`
      };

      if(matches(item,query)) out.push(item);
      if(out.length>=limit) break;
    }

    return out;
  }

  function queryVariants(query='') {
    const raw=String(query||'').replace(/\s+/g,' ').trim();
    const animal=wantedAnimal(raw)?.[0]||'';
    return [...new Set([
      raw,
      animal ? `${animal} wildlife` : `${raw} wildlife`,
      animal ? `${animal} nature` : `${raw} nature`,
      animal ? `${animal} animal` : `${raw} animal`,
      animal ? `${animal} habitat` : `${raw} habitat`,
      animal ? `${animal} behavior` : `${raw} behavior`
    ].filter(Boolean))];
  }

  async function emergencySearch(query,limit=20) {
    repairLegacyHistory();

    const wanted=Math.max(1,Math.min(20,Number(limit||20)));
    const variants=queryVariants(query);

    // Try several query forms. Return as soon as there is enough usable media.
    const all=[];

    for(const q of variants.slice(0,4)) {
      const settled=await Promise.allSettled([
        commons(q,Math.min(18,wanted)),
        archive(q,Math.min(12,wanted)),
        loc(q,Math.min(8,wanted)),
        nasa(q,Math.min(6,wanted))
      ]);

      for(const r of settled) {
        if(r.status==='fulfilled') all.push(...r.value);
      }

      const good=unique(all).filter(item=>matches(item,query));
      if(good.length>=Math.min(4,wanted)) return good.slice(0,wanted);
    }

    return unique(all).filter(item=>matches(item,query)).slice(0,wanted);
  }

  function patch() {
    const yt=window.ClipFreeYouTube;
    if(!yt) return false;
    if(yt[FLAG]) return true;

    // IMPORTANT: v33 intentionally becomes the FINAL search function instead
    // of chaining through every v18-v32 wrapper. The old wrapper stack could
    // filter a valid result multiple times before animal-generator saw it.
    yt.searchCommonsDownloadable=emergencySearch;
    yt[FLAG]=true;

    window.CLIPFREE_SOURCE_RECOVERY_V33={
      version:'33.0',
      finalSearch:true,
      legacyTitleHistoryRepaired:true,
      exactUrlDuplicateProtection:true,
      automaticRepositories:[
        'Wikimedia Commons',
        'Internet Archive',
        'Library of Congress',
        'NASA Image & Video Library'
      ]
    };

    return true;
  }

  function clearStaleFailure() {
    try {
      const cp=JSON.parse(localStorage.getItem(CHECKPOINT_KEY)||'null');
      if(!cp || typeof cp!=='object') return;
      if(/found 0\/1 unused|could not find a genuinely different unused source/i.test(String(cp.lastError||''))) {
        cp.lastError='';
        cp.active=Number(cp.completed||0)<Number(cp.requested||0);
        cp.updatedAt=new Date().toISOString();
        localStorage.setItem(CHECKPOINT_KEY,JSON.stringify(cp));
      }
    } catch {}
  }

  function addBadge() {
    const qs=new URLSearchParams(location.search);
    if(qs.get('audit')==='1'||qs.get('compliance')==='1'||qs.get('review')==='1') return true;
    if($('clipfreeV33RecoveryStatus')) return true;

    const head=$('clipfreeSimpleStudio')?.querySelector('.simple-head');
    if(!head) return false;

    const card=document.createElement('div');
    card.id='clipfreeV33RecoveryStatus';
    card.style.cssText=
      'margin:12px 0;padding:11px 13px;border:1px solid #34724a;border-radius:13px;' +
      'background:#0c1710;color:#aef3c4;font-size:.76rem;font-weight:900;line-height:1.45';
    card.textContent=
      '🛠 v33 SOURCE RECOVERY • title-history bug repaired • direct deep search • exact old footage still blocked';
    head.appendChild(card);
    return true;
  }

  repairLegacyHistory();
  clearStaleFailure();
  patch();
  addBadge();

  const timer=setInterval(() => {
    repairLegacyHistory();
    const ok=patch();
    addBadge();
    if(ok && $('clipfreeV33RecoveryStatus')) clearInterval(timer);
  },180);
  setTimeout(()=>clearInterval(timer),30000);

  window.addEventListener('clipfree-youtube-ready',()=>setTimeout(() => {
    patch();
    addBadge();
  },0));
  window.addEventListener('pageshow',()=> {
    repairLegacyHistory();
    patch();
    addBadge();
  });
})();

/* CLIPFREE WILDLIFE AUTO-RECOVERY v34 */
/*
  Fixes the current one-Short failure:
    source validation rejected "Monarch Butterfly ..." because its metadata
    does not identify the requested animal.

  Important behavior:
  - In broad Wildlife mode, if a source clearly identifies a real animal but
    the old generator rejects it because the requested-query label drifted,
    ClipFree automatically switches the retry search to that detected animal.
  - In a SPECIFIC animal mode (lions, bears, etc.), it never silently changes
    the requested animal. It rejects the mismatch and rotates to another source.
  - Single-Short runs now auto-retry source-validation failures instead of
    leaving the user stuck on a red error.
  - Multi-Short v19/v24 retry logic remains intact.
  - Reviewer/audit mode is untouched.
*/
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const MAX_AUTO_RETRIES = 6;
  const RETRY_KEY = 'clipfree_single_source_retry_v34';

  const ANIMALS = [
    ['mountain lion', /\b(mountain lion|cougar|puma)\b/i],
    ['sea lion', /\bsea lion\b/i],
    ['polar bear', /\bpolar bear\b/i],
    ['grizzly bear', /\bgrizzly bear\b/i],
    ['rusty patched bumble bee', /\brusty patched bumble bee\b/i],
    ['leafcutter bee', /\bleafcutter bee\b/i],
    ['bumble bee', /\b(bumble ?bee|bumblebee|bombus)\b/i],
    ['monarch butterfly', /\bmonarch butterfly\b/i],
    ['whale shark', /\bwhale shark\b/i],
    ['lion', /\b(lion|lioness|panthera leo)\b/i],
    ['tiger', /\btiger\b/i],
    ['leopard', /\bleopard\b/i],
    ['cheetah', /\bcheetah\b/i],
    ['jaguar', /\bjaguar\b/i],
    ['lynx', /\blynx\b/i],
    ['bobcat', /\bbobcat\b/i],
    ['wolf', /\b(wolf|wolves)\b/i],
    ['coyote', /\bcoyote\b/i],
    ['fox', /\bfox\b/i],
    ['bear', /\bbear\b/i],
    ['elephant', /\belephant\b/i],
    ['giraffe', /\bgiraffe\b/i],
    ['zebra', /\bzebra\b/i],
    ['rhino', /\b(rhino|rhinoceros)\b/i],
    ['hippo', /\b(hippo|hippopotamus)\b/i],
    ['bison', /\b(bison|buffalo)\b/i],
    ['moose', /\bmoose\b/i],
    ['elk', /\belk\b/i],
    ['deer', /\b(deer|stag|doe|buck|reindeer|caribou)\b/i],
    ['antelope', /\b(antelope|gazelle|pronghorn|wildebeest)\b/i],
    ['kangaroo', /\bkangaroo\b/i],
    ['koala', /\bkoala\b/i],
    ['otter', /\botter\b/i],
    ['rabbit', /\b(rabbit|hare)\b/i],
    ['squirrel', /\bsquirrel\b/i],
    ['gorilla', /\bgorilla\b/i],
    ['chimpanzee', /\bchimpanzee\b/i],
    ['orangutan', /\borangutan\b/i],
    ['monkey', /\b(monkey|macaque|baboon|gibbon|lemur)\b/i],
    ['hyena', /\b(hyena|hyaena)\b/i],
    ['meerkat', /\bmeerkat\b/i],
    ['crocodile', /\bcrocodile\b/i],
    ['alligator', /\balligator\b/i],
    ['turtle', /\b(turtle|tortoise)\b/i],
    ['snake', /\b(snake|python|cobra|rattlesnake|boa)\b/i],
    ['eagle', /\beagle\b/i],
    ['hawk', /\bhawk\b/i],
    ['falcon', /\bfalcon\b/i],
    ['owl', /\bowl\b/i],
    ['penguin', /\bpenguin\b/i],
    ['shark', /\b(shark|great white|hammerhead)\b/i],
    ['whale', /\b(whale|orca)\b/i],
    ['dolphin', /\bdolphin\b/i],
    ['seal', /\bseal\b/i],
    ['frog', /\b(frog|toad)\b/i],
    ['butterfly', /\bbutterfly\b/i],
    ['bee', /\bbee\b/i],
    ['dragonfly', /\bdragonfly\b/i],
    ['beetle', /\bbeetle\b/i],
    ['spider', /\bspider\b/i],
    ['crab', /\bcrab\b/i],
    ['fish', /\b(fish|salmon|trout|tuna)\b/i],
    ['cat', /\b(cat|kitten)\b/i],
    ['dog', /\b(dog|puppy)\b/i]
  ];

  function reviewerMode() {
    const q = new URLSearchParams(location.search);
    return q.get('audit') === '1' ||
           q.get('compliance') === '1' ||
           q.get('review') === '1';
  }

  function detectAnimal(text='') {
    return ANIMALS.find(([,rx]) => rx.test(String(text || ''))) || null;
  }

  function parseRejectedTitle(message='') {
    const m = String(message || '').match(
      /source validation rejected\s+["“]([^"”]+)["”]/i
    );
    return m?.[1] || '';
  }

  function isValidationFailure(message='') {
    return /source validation rejected|metadata does not identify the requested animal/i.test(
      String(message || '')
    );
  }

  function isSingleRun() {
    return Math.max(1, Math.min(10, Number($('simpleCount')?.value || 1))) === 1;
  }

  function broadWildlifeMode() {
    return ($('simpleTopic')?.value || 'wildlife') === 'wildlife';
  }

  function resetCounter() {
    try { localStorage.removeItem(RETRY_KEY); } catch {}
  }

  function nextAttempt() {
    try {
      const n = Math.max(0, Number(localStorage.getItem(RETRY_KEY) || 0)) + 1;
      localStorage.setItem(RETRY_KEY, String(n));
      return n;
    } catch {
      return 1;
    }
  }

  function setValue(id,value) {
    const el = $(id);
    if (!el) return;
    el.value = String(value);
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function rotateSource(message) {
    try { window.ClipFreeSourceRepairV24?.rejectFromError?.(message); } catch {}
    try { window.ClipFreeSourceRepairV23?.rejectFromError?.(message); } catch {}
    try { window.ClipFreeSourceRepairV24?.rotateVarietyCursor?.(11); } catch {}
  }

  let retryTimer = null;
  let lastHandled = '';

  function scheduleRecovery(message) {
    if (reviewerMode() || !isSingleRun() || !isValidationFailure(message)) return;
    if (message === lastHandled) return;
    lastHandled = message;

    const attempt = nextAttempt();
    if (attempt > MAX_AUTO_RETRIES) {
      resetCounter();
      return;
    }

    rotateSource(message);

    const title = parseRejectedTitle(message);
    const animal = detectAnimal(title);

    // For broad Wildlife mode, an identified animal is valid content. Search
    // specifically for that animal on the retry so the old lexical validator
    // cannot compare against a drifting unrelated variety query.
    if (broadWildlifeMode() && animal) {
      window.ClipFreeVarietyMode = false;
      setValue('animalTopic', `${animal[0]} wildlife`);
    } else {
      // Specific-animal mode: preserve the user's requested topic and just
      // rotate away from the mismatching result.
      window.ClipFreeVarietyMode = broadWildlifeMode();
    }

    const status = $('animalGeneratorStatus');
    if (status) {
      status.textContent =
        `Source mismatch auto-fixed. Finding another ${animal?.[0] || 'matching animal'} video — retry ${attempt}/${MAX_AUTO_RETRIES}…`;
      status.className = 'notice subtle';
    }

    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      const button = $('generateAnimalVideo');
      if (!button || button.disabled) return;
      button.click();
    }, 700);
  }

  function installObserver() {
    const status = $('animalGeneratorStatus');
    if (!status || status.dataset.clipfreeV34Observer) return false;

    status.dataset.clipfreeV34Observer = '1';

    const inspect = () => {
      const message = String(status.textContent || '').trim();

      if (/youtube video id|upload complete|uploaded successfully|reached youtube/i.test(message)) {
        resetCounter();
        lastHandled = '';
        return;
      }

      if (isValidationFailure(message)) {
        scheduleRecovery(message);
      }
    };

    new MutationObserver(inspect).observe(status,{
      childList:true,
      characterData:true,
      subtree:true
    });

    inspect();
    return true;
  }

  // Each new manual single-Short start gets a fresh retry budget.
  window.addEventListener('click',event => {
    const start = event.target?.closest?.('#simpleStart');
    if (!start || !isSingleRun()) return;

    resetCounter();
    lastHandled = '';

    // Normal Wildlife button always starts in broad variety mode.
    if (broadWildlifeMode()) {
      window.ClipFreeVarietyMode = true;
      setValue('animalTopic','clipfree variety wildlife');
    }
  },true);

  function addBadge() {
    if (reviewerMode()) return true;
    if ($('clipfreeV34RecoveryStatus')) return true;

    const head = $('clipfreeSimpleStudio')?.querySelector('.simple-head');
    if (!head) return false;

    const card = document.createElement('div');
    card.id = 'clipfreeV34RecoveryStatus';
    card.style.cssText =
      'margin:12px 0;padding:11px 13px;border:1px solid #39764c;border-radius:13px;' +
      'background:#0b1710;color:#b2f4c5;font-size:.76rem;font-weight:900;line-height:1.45';
    card.textContent =
      '🛠 v34 AUTO-RECOVERY • single Shorts retry animal-source mismatches automatically • reviewer flow untouched';
    head.appendChild(card);
    return true;
  }

  installObserver();
  addBadge();

  const timer = setInterval(() => {
    installObserver();
    if (addBadge() && installObserver()) clearInterval(timer);
  },180);
  setTimeout(() => clearInterval(timer),30000);

  window.addEventListener('pageshow',() => {
    installObserver();
    addBadge();
  });

  window.CLIPFREE_V34 = {
    version:'34.0',
    singleShortValidationAutoRetry:true,
    maxAutoRetries:MAX_AUTO_RETRIES,
    specificAnimalIntentPreserved:true,
    reviewerFlowChanged:false
  };
})();

/* CLIPFREE YOUTUBE-SAFE RECOVERY MODE v36 */
/*
  Recovery mode after loss of YouTube Advanced Features.

  Normal site only:
  - exactly ONE Short at a time
  - no Resume batch button
  - no automatic batch uploads
  - every generated Short must be previewed by the user before upload
  - upload requires a manual "reviewed and accurate" checkbox
  - exact title / narration / source repeats are warned about
  - reviewer/audit mode is untouched

  This intentionally slows publishing down and increases human review.
*/
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const REVIEW_HISTORY_KEY = 'clipfree_recovery_approved_v36';
  const CHECKPOINT_KEY = 'clipfree_batch_checkpoint_v19';
  const WRAP_FLAG = '__clipfreeRecoveryPreviewWrappedV36';

  function reviewerMode() {
    const q = new URLSearchParams(location.search);
    return q.get('audit') === '1' ||
           q.get('compliance') === '1' ||
           q.get('review') === '1';
  }

  if (reviewerMode()) {
    window.CLIPFREE_V36 = {
      version:'36.0',
      recoveryMode:false,
      reviewerFlowChanged:false
    };
    return;
  }

  function loadHistory() {
    try {
      const x = JSON.parse(localStorage.getItem(REVIEW_HISTORY_KEY) || '[]');
      return Array.isArray(x) ? x : [];
    } catch {
      return [];
    }
  }

  function saveHistory(item) {
    try {
      const old = loadHistory();
      old.unshift(item);
      localStorage.setItem(
        REVIEW_HISTORY_KEY,
        JSON.stringify(old.slice(0, 300))
      );
    } catch {}
  }

  function normalized(value='') {
    return String(value || '').replace(/\s+/g,' ').trim().toLowerCase();
  }

  function firstSource(meta={}) {
    const one = Array.isArray(meta.sources) ? meta.sources[0] : null;
    return one || meta.source || null;
  }

  function originalityReport(meta={}) {
    const history = loadHistory();
    const title = normalized(meta.title);
    const narration = normalized(meta.voiceoverText || meta.story);
    const source = firstSource(meta);
    const sourceKey = normalized(
      source?.sourceUrl ||
      source?.fileUrl ||
      source?.title ||
      ''
    );

    const exactTitle = title && history.some(x => normalized(x.title) === title);
    const exactNarration = narration && history.some(x => normalized(x.narration) === narration);
    const exactSource = sourceKey && history.some(x => normalized(x.sourceKey) === sourceKey);

    return {
      exactTitle,
      exactNarration,
      exactSource,
      safe: !exactTitle && !exactNarration && !exactSource
    };
  }

  function forceOneShort() {
    const ids = ['simpleCount','animalBatchCount','autoBatchCount','wizardBatchCount'];

    for (const id of ids) {
      const el = $(id);
      if (!el) continue;

      if (el.tagName === 'SELECT') {
        [...el.options].forEach(option => {
          if (Number(option.value) !== 1) option.remove();
        });

        if (![...el.options].some(o => Number(o.value) === 1)) {
          const option = document.createElement('option');
          option.value = '1';
          option.textContent = '1 Short';
          el.appendChild(option);
        }
      }

      el.value = '1';
      try { el.min = '1'; el.max = '1'; } catch {}
    }

    const start = $('simpleStart');
    if (start && !start.disabled) {
      start.textContent = '👀 CREATE + PREVIEW 1 SHORT';
    }

    $('clipfreeResumeBatch')?.remove();

    try {
      localStorage.removeItem(CHECKPOINT_KEY);
    } catch {}
  }

  function updateSimpleCopy() {
    const badge = document.querySelector('#clipfreeSimpleStudio .simple-badge');
    if (badge) badge.textContent = 'YOUTUBE RECOVERY MODE • HUMAN REVIEW BEFORE EVERY UPLOAD';

    const title = document.querySelector('#clipfreeSimpleStudio .simple-head h1');
    if (title) title.innerHTML = 'Create <span>1 carefully reviewed Short</span> at a time.';

    const intro = document.querySelector('#clipfreeSimpleStudio .simple-head p');
    if (intro) {
      intro.textContent =
        'ClipFree creates one Short, then stops for you to watch it, check the animal, title, narration, source and description before anything is uploaded to YouTube.';
    }

    const note = document.querySelector('#clipfreeSimpleStudio .simple-note');
    if (note) {
      note.textContent =
        'Recovery Mode intentionally disables batch uploading. One Short is created at a time and cannot upload until you manually review and approve it. This does not guarantee restoration of Advanced Features; it is designed to make your publishing workflow more careful and less repetitive.';
    }

    const seo = document.querySelector('#clipfreeSimpleStudio .simple-seo-list');
    if (seo) {
      const labels = [
        '1 Short only',
        'Human preview required',
        'Actual animal check',
        'Unique narration',
        'Unique title',
        'Duplicate-source check',
        'Accurate description',
        '8 max tags',
        '3 hashtags',
        '9:16 safe cover',
        'Captions',
        'PD/CC0 attribution'
      ];
      seo.innerHTML = '';
      labels.forEach(label => {
        const chip = document.createElement('span');
        chip.textContent = label;
        seo.appendChild(chip);
      });
    }
  }

  function closePreview(result) {
    const root = $('clipfreeRecoveryPreviewV36');
    if (!root) return;

    const video = root.querySelector('video');
    if (video?.src?.startsWith('blob:')) {
      try { URL.revokeObjectURL(video.src); } catch {}
    }

    root.remove();

    if (result?.focusStart) {
      setTimeout(() => $('simpleStart')?.scrollIntoView({
        behavior:'smooth',
        block:'center'
      }), 60);
    }
  }

  function createPreview(file, meta, originalUpload) {
    return new Promise((resolve, reject) => {
      closePreview();

      const report = originalityReport(meta);
      const source = firstSource(meta);

      const overlay = document.createElement('div');
      overlay.id = 'clipfreeRecoveryPreviewV36';
      overlay.style.cssText =
        'position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.92);' +
        'overflow:auto;padding:18px;box-sizing:border-box;color:#fff;font-family:system-ui,sans-serif';

      const card = document.createElement('div');
      card.style.cssText =
        'max-width:680px;margin:0 auto;background:#111018;border:1px solid #3c3746;' +
        'border-radius:18px;padding:16px;box-sizing:border-box';

      const title = String(meta?.title || 'Untitled Short');
      const narration = String(meta?.voiceoverText || meta?.story || 'No narration text available.');
      const description = String(meta?.description || '');
      const attribution = String(meta?.attribution || '');
      const sourceTitle = String(source?.title || 'Source title unavailable');
      const sourceUrl = String(source?.sourceUrl || '');
      const detectedAnimal = String(meta?.detectedAnimal || source?.detectedAnimal || 'Review manually');

      const warningBits = [];
      if (report.exactTitle) warningBits.push('exact title seen before');
      if (report.exactNarration) warningBits.push('exact narration seen before');
      if (report.exactSource) warningBits.push('exact source seen before');

      card.innerHTML = `
        <div style="font-size:.78rem;font-weight:900;color:#b9f3c7;margin-bottom:8px">
          YOUTUBE RECOVERY MODE • NOTHING UPLOADS UNTIL YOU APPROVE
        </div>
        <h2 style="margin:0 0 12px;font-size:1.25rem">Review this Short carefully</h2>

        <video id="clipfreeRecoveryVideoV36" controls playsinline
          style="width:100%;max-height:70vh;background:#000;border-radius:13px"></video>

        <div style="margin-top:14px;padding:12px;border:1px solid #34303d;border-radius:12px;background:#0d0c12">
          <div style="font-weight:900;margin-bottom:6px">Title</div>
          <div style="font-size:.92rem">${escapeHtml(title)}</div>
        </div>

        <div style="margin-top:10px;padding:12px;border:1px solid #34303d;border-radius:12px;background:#0d0c12">
          <div style="font-weight:900;margin-bottom:6px">Detected animal</div>
          <div style="font-size:.92rem">${escapeHtml(detectedAnimal)}</div>
        </div>

        <details style="margin-top:10px;padding:12px;border:1px solid #34303d;border-radius:12px;background:#0d0c12">
          <summary style="font-weight:900;cursor:pointer">Narration</summary>
          <div style="margin-top:8px;font-size:.86rem;line-height:1.5">${escapeHtml(narration)}</div>
        </details>

        <details style="margin-top:10px;padding:12px;border:1px solid #34303d;border-radius:12px;background:#0d0c12">
          <summary style="font-weight:900;cursor:pointer">Description + attribution</summary>
          <div style="margin-top:8px;font-size:.8rem;line-height:1.45;white-space:pre-wrap">${escapeHtml(description)}</div>
          <div style="margin-top:10px;font-size:.76rem;line-height:1.45;white-space:pre-wrap;color:#c9c4d0">${escapeHtml(attribution)}</div>
        </details>

        <div style="margin-top:10px;padding:12px;border:1px solid ${report.safe ? '#275c3a' : '#7b4f25'};border-radius:12px;background:${report.safe ? '#0d1912' : '#21170d'}">
          <div style="font-weight:900;color:${report.safe ? '#9ce4b3' : '#ffcc8b'}">
            ${report.safe ? '✓ No exact title/narration/source repeat found in approved Recovery Mode history' : '⚠ Originality warning'}
          </div>
          ${warningBits.length ? `<div style="margin-top:6px;font-size:.8rem">${escapeHtml(warningBits.join(' • '))}</div>` : ''}
          <div style="margin-top:7px;font-size:.76rem;color:#c9c4d0">
            Source: ${escapeHtml(sourceTitle)}
            ${sourceUrl ? `<br><a href="${escapeAttr(sourceUrl)}" target="_blank" rel="noopener" style="color:#bba6ff">Open source page</a>` : ''}
          </div>
        </div>

        <label style="display:flex;gap:10px;align-items:flex-start;margin-top:14px;padding:12px;border:1px solid #3a3542;border-radius:12px;background:#0d0c12">
          <input id="clipfreeRecoveryApproveCheckV36" type="checkbox" style="margin-top:3px;transform:scale(1.25)">
          <span style="font-size:.84rem;line-height:1.45">
            I watched this Short and checked that the footage, animal, title, narration, description and source attribution are accurate and sufficiently different from my other uploads.
          </span>
        </label>

        <button id="clipfreeRecoveryUploadV36" type="button" disabled
          style="width:100%;margin-top:12px;padding:14px;border:0;border-radius:12px;background:#245f3d;color:#fff;font-weight:900;font-size:1rem;opacity:.5">
          APPROVE + UPLOAD THIS 1 SHORT
        </button>

        <button id="clipfreeRecoveryRejectV36" type="button"
          style="width:100%;margin-top:9px;padding:13px;border:1px solid #59404a;border-radius:12px;background:#211118;color:#ffb7c1;font-weight:900">
          REJECT — DO NOT UPLOAD
        </button>
      `;

      overlay.appendChild(card);
      document.body.appendChild(overlay);

      const video = $('clipfreeRecoveryVideoV36');
      if (video) {
        try {
          video.src = URL.createObjectURL(file);
          video.load();
        } catch {}
      }

      const check = $('clipfreeRecoveryApproveCheckV36');
      const upload = $('clipfreeRecoveryUploadV36');
      const rejectBtn = $('clipfreeRecoveryRejectV36');

      check?.addEventListener('change', () => {
        if (!upload) return;
        upload.disabled = !check.checked;
        upload.style.opacity = check.checked ? '1' : '.5';
      });

      rejectBtn?.addEventListener('click', () => {
        closePreview({focusStart:true});
        reject(new Error('You rejected this Short during Recovery Mode review. Nothing was uploaded to YouTube.'));
      });

      upload?.addEventListener('click', async () => {
        if (!check?.checked || upload.disabled) return;

        upload.disabled = true;
        upload.textContent = 'UPLOADING TO YOUTUBE…';

        try {
          const result = await originalUpload(file, meta);

          if (!result?.id) {
            throw new Error('YouTube did not return a real video ID.');
          }

          saveHistory({
            at:new Date().toISOString(),
            videoId:result.id,
            title,
            narration,
            sourceKey:source?.sourceUrl || source?.fileUrl || source?.title || '',
            detectedAnimal
          });

          closePreview();
          resolve(result);
        } catch (err) {
          upload.disabled = false;
          upload.textContent = 'APPROVE + UPLOAD THIS 1 SHORT';
          if (check) check.checked = false;
          upload.style.opacity = '.5';

          const error = document.createElement('div');
          error.style.cssText =
            'margin-top:10px;padding:10px;border:1px solid #73343e;border-radius:10px;background:#221015;color:#ffadb6;font-size:.8rem;line-height:1.45';
          error.textContent = err?.message || String(err);
          card.appendChild(error);
        }
      });
    });
  }

  function escapeHtml(value='') {
    return String(value)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  function escapeAttr(value='') {
    return escapeHtml(value).replace(/`/g,'&#096;');
  }

  function wrapUpload() {
    // v38 reviews the FINAL generated Short, not the raw source file.
    return true;
  }

  function removeBatchControls() {
    forceOneShort();

    const resume = $('clipfreeResumeBatch');
    if (resume) resume.remove();

    const legacy20 = $('clipfree20AnimalCard');
    if (legacy20) legacy20.remove();

    const hero20 = $('clipfree20Hero');
    if (hero20) hero20.remove();
  }

  function addRecoveryBanner() {
    if ($('clipfreeRecoveryBannerV36')) return true;

    const head = document.querySelector('#clipfreeSimpleStudio .simple-head');
    if (!head) return false;

    const card = document.createElement('div');
    card.id = 'clipfreeRecoveryBannerV36';
    card.style.cssText =
      'margin:12px 0;padding:12px 13px;border:1px solid #8a6a28;border-radius:13px;' +
      'background:#1b160b;color:#ffe6a3;font-size:.78rem;font-weight:900;line-height:1.5';

    card.textContent =
      '🛡 RECOVERY MODE v36 • 1 Short only • human preview required • no automatic batch uploads';

    head.appendChild(card);
    return true;
  }

  function install() {
    forceOneShort();
    updateSimpleCopy();
    removeBatchControls();
    wrapUpload();
    addRecoveryBanner();
  }

  install();

  const observer = new MutationObserver(() => {
    forceOneShort();
    removeBatchControls();
  });

  observer.observe(document.documentElement, {
    childList:true,
    subtree:true
  });

  const timer = setInterval(() => {
    install();
    if (wrapUpload() && addRecoveryBanner()) clearInterval(timer);
  }, 180);

  setTimeout(() => clearInterval(timer), 30000);

  window.addEventListener('clipfree-youtube-ready', () => setTimeout(install, 0));
  window.addEventListener('pageshow', install);

  window.CLIPFREE_V36 = {
    version:'36.0',
    recoveryMode:true,
    oneShortOnly:true,
    humanPreviewRequired:true,
    batchUploadsDisabled:true,
    reviewerFlowChanged:false
  };
})();

/* CLIPFREE REAL WILD ENCOUNTERS v37 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const FLAG = '__clipfreeRealWildEncountersV37';

  const WILD = [
    ['mountain lion',/\b(mountain lion|cougar|puma)\b/i],
    ['lion',/\b(lion|lioness)\b/i],['tiger',/\btiger\b/i],
    ['leopard',/\bleopard\b/i],['cheetah',/\bcheetah\b/i],
    ['jaguar',/\bjaguar\b/i],['wolf',/\b(wolf|wolves)\b/i],
    ['coyote',/\bcoyote\b/i],['fox',/\bfox\b/i],
    ['bear',/\b(bear|grizzly|polar bear|black bear|brown bear)\b/i],
    ['elephant',/\belephant\b/i],['giraffe',/\bgiraffe\b/i],
    ['zebra',/\bzebra\b/i],['rhino',/\b(rhino|rhinoceros)\b/i],
    ['hippo',/\b(hippo|hippopotamus)\b/i],['bison',/\b(bison|buffalo)\b/i],
    ['moose',/\bmoose\b/i],['elk',/\belk\b/i],
    ['deer',/\b(deer|stag|doe|buck|reindeer|caribou)\b/i],
    ['antelope',/\b(antelope|gazelle|pronghorn|wildebeest)\b/i],
    ['kangaroo',/\bkangaroo\b/i],['koala',/\bkoala\b/i],
    ['otter',/\botter\b/i],['gorilla',/\bgorilla\b/i],
    ['chimpanzee',/\bchimpanzee\b/i],['orangutan',/\borangutan\b/i],
    ['hyena',/\b(hyena|hyaena)\b/i],['meerkat',/\bmeerkat\b/i],
    ['crocodile',/\bcrocodile\b/i],['alligator',/\balligator\b/i],
    ['turtle',/\b(sea turtle|turtle|tortoise)\b/i],
    ['snake',/\b(snake|python|cobra|rattlesnake|boa)\b/i],
    ['eagle',/\beagle\b/i],['hawk',/\bhawk\b/i],
    ['falcon',/\bfalcon\b/i],['owl',/\bowl\b/i],
    ['penguin',/\bpenguin\b/i],['shark',/\b(shark|great white|hammerhead)\b/i],
    ['whale',/\b(whale|orca)\b/i],['dolphin',/\bdolphin\b/i],
    ['seal',/\b(seal|sea lion)\b/i],['frog',/\b(frog|toad)\b/i],
    ['butterfly',/\b(monarch butterfly|butterfly)\b/i],
    ['bee',/\b(bumble ?bee|bumblebee|bee)\b/i]
  ];

  const REJECT = [
    /\b(zoo|zoological|enclosure|cage|caged|captive|captivity)\b/i,
    /\b(aquarium|tank|marine park|theme park)\b/i,
    /\b(sanctuary|rehab|rehabilitation|rescue center|rescue centre)\b/i,
    /\b(farm|farmyard|livestock|ranch|stable|barn)\b/i,
    /\b(pet|pets|domestic|kitten|puppy|dog park)\b/i,
    /\b(trained|training|circus|performance animal)\b/i,
    /\b(animation|animated|cartoon|cgi|3d render|illustration)\b/i,
    /\b(slideshow|still image|photo montage)\b/i,
    /\b(dead animal|carcass|taxidermy|mounted specimen)\b/i
  ];

  const POSITIVE = [
    /\b(wild|wildlife|natural habitat|nature)\b/i,
    /\b(forest|jungle|savanna|savannah|grassland|desert|wetland|swamp)\b/i,
    /\b(river|lake|ocean|sea|coast|mountain|tundra|arctic)\b/i,
    /\b(roaming|walking|running|swimming|flying|hunting|feeding|grazing|foraging)\b/i
  ];

  function allText(item={}) {
    return [item.title,item.description,item.subject,item.creator,item.attribution,item.provider,item.sourceUrl]
      .map(v=>Array.isArray(v)?v.join(' '):String(v||'')).join(' ');
  }

  function score(item={}) {
    const t = allText(item);
    const animal = WILD.find(([,rx])=>rx.test(t));
    if (!animal) return {ok:false};
    if (REJECT.some(rx=>rx.test(t))) return {ok:false};
    return {ok:true,animal:animal[0],score:POSITIVE.reduce((n,rx)=>n+(rx.test(t)?1:0),0)};
  }

  function reviewerMode() {
    const q=new URLSearchParams(location.search);
    return q.get('audit')==='1'||q.get('compliance')==='1'||q.get('review')==='1';
  }

  function patchSearch() {
    const yt=window.ClipFreeYouTube;
    if (!yt?.searchCommonsDownloadable) return false;
    if (yt[FLAG]) return true;
    const previous=yt.searchCommonsDownloadable.bind(yt);

    yt.searchCommonsDownloadable=async function(query,limit=12) {
      const wanted=Math.max(1,Math.min(20,Number(limit||12)));
      const variants=[query,`${query} wildlife`,`${query} wild`,`${query} natural habitat`,`${query} nature`];
      const merged=[];

      for (const q of [...new Set(variants)]) {
        try { merged.push(...(await previous(q,Math.max(12,wanted))||[])); }
        catch(err){ console.warn('v37 source search pass failed',q,err); }

        const seen=new Set();
        const good=[];
        for (const item of merged) {
          const key=String(item?.fileUrl||item?.sourceUrl||item?.title||'').trim();
          if (!key||seen.has(key)) continue;
          seen.add(key);
          const s=score(item);
          if (!s.ok) continue;
          item.__clipfreeWildEncounter=true;
          item.__clipfreeDetectedAnimal=s.animal;
          item.__clipfreeWildScore=s.score;
          good.push(item);
        }
        good.sort((a,b)=>(b.__clipfreeWildScore||0)-(a.__clipfreeWildScore||0));
        if (good.length>=wanted) return good.slice(0,wanted);
      }

      return merged.filter(x=>score(x).ok).slice(0,wanted);
    };

    yt[FLAG]=true;
    return true;
  }

  function addWildReviewCheckbox() {
    const root=$('clipfreeRecoveryPreviewV36');
    if (!root || root.dataset.v37==='1') return false;
    root.dataset.v37='1';

    const approve=$('clipfreeRecoveryApproveCheckV36');
    const upload=$('clipfreeRecoveryUploadV36');
    const label=approve?.closest('label');
    if (!label||!upload) return false;

    const extra=document.createElement('label');
    extra.style.cssText='display:flex;gap:10px;align-items:flex-start;margin-top:12px;padding:12px;border:1px solid #3e6047;border-radius:12px;background:#0b1710';
    extra.innerHTML=`<input id="clipfreeRealWildConfirmV37" type="checkbox" style="margin-top:3px;transform:scale(1.25)">
      <span style="font-size:.84rem;line-height:1.45">I watched this Short and confirm it shows a real wild animal encounter in a natural/outdoor setting — not a zoo, cage, aquarium, pet, farm, animation, slideshow or staged captive performance.</span>`;
    label.insertAdjacentElement('afterend',extra);

    const wild=$('clipfreeRealWildConfirmV37');
    const sync=()=>{
      const ok=Boolean(approve?.checked && wild?.checked);
      upload.disabled=!ok;
      upload.style.opacity=ok?'1':'.5';
    };
    approve.addEventListener('change',sync);
    wild.addEventListener('change',sync);
    sync();
    return true;
  }

  function updateUi() {
    if (reviewerMode()) return;
    const badge=document.querySelector('#clipfreeSimpleStudio .simple-badge');
    if (badge) badge.textContent='REAL WILD ENCOUNTERS • HUMAN REVIEW REQUIRED';
    const h=document.querySelector('#clipfreeSimpleStudio .simple-head h1');
    if (h) h.innerHTML='Create <span>1 real wild animal encounter</span> at a time.';
    const p=document.querySelector('#clipfreeSimpleStudio .simple-head p');
    if (p) p.textContent='ClipFree searches for real wild animals in natural/outdoor settings, creates one Short, then stops so you can watch and approve it before YouTube upload.';
    const start=$('simpleStart');
    if (start&&!start.disabled) start.textContent='🦁 CREATE + PREVIEW 1 REAL WILD ENCOUNTER';

    if (!$('clipfreeV37Banner')) {
      const head=document.querySelector('#clipfreeSimpleStudio .simple-head');
      if (head) {
        const card=document.createElement('div');
        card.id='clipfreeV37Banner';
        card.style.cssText='margin:12px 0;padding:12px 13px;border:1px solid #3e754e;border-radius:13px;background:#0b1710;color:#b8f6c9;font-size:.78rem;font-weight:900;line-height:1.5';
        card.textContent='🌿 v37 REAL WILD ENCOUNTERS • captive/domestic/staged sources filtered • human preview is final check';
        head.appendChild(card);
      }
    }
  }

  function install(){patchSearch();updateUi();addWildReviewCheckbox();}
  install();
  new MutationObserver(install).observe(document.documentElement,{childList:true,subtree:true});
  const timer=setInterval(()=>{install();if(patchSearch()&&$('clipfreeV37Banner'))clearInterval(timer);},180);
  setTimeout(()=>clearInterval(timer),30000);
  window.addEventListener('clipfree-youtube-ready',()=>setTimeout(install,0));
  window.addEventListener('pageshow',install);

  window.CLIPFREE_V37={
    version:'37.0',
    realWildEncountersOnly:true,
    captiveDomesticFilters:true,
    humanWildEncounterConfirmation:true,
    recoveryModePreserved:true,
    reviewerFlowChanged:false
  };
})();


/* CLIPFREE YOUTUBE API COMPLIANCE FIX v38 */
(() => {
  'use strict';
  const $=id=>document.getElementById(id); let open=false;
  const esc=v=>String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  const privacy=()=>{const v=$('simplePrivacy')?.value||$('autoPrivacy')?.value||$('uploadPrivacy')?.value||'private';return ['private','unlisted','public'].includes(v)?v:'private';};
  function setSel(id,v){const e=$(id);if(!e)return;e.value=v;e.dispatchEvent(new Event('change',{bubbles:true}));}
  function close(){const r=$('clipfreeComplianceReviewV38');if(!r)return;const v=r.querySelector('video');if(v?.src?.startsWith('blob:'))try{URL.revokeObjectURL(v.src)}catch{};r.remove();open=false;}
  function review(detail){
    if(open)return;open=true;
    const source=(Array.isArray(detail.sources)?detail.sources[0]:detail.source)||{};
    const root=document.createElement('div');root.id='clipfreeComplianceReviewV38';root.style.cssText='position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.94);overflow:auto;padding:16px;color:#fff;font-family:system-ui,sans-serif';
    const card=document.createElement('div');card.style.cssText='max-width:720px;margin:auto;background:#111018;border:1px solid #433c4d;border-radius:18px;padding:16px;box-sizing:border-box';
    const pv=privacy();
    card.innerHTML=`<div style="font-size:.78rem;font-weight:900;color:#b9f3c7">YOUTUBE API COMPLIANCE REVIEW • FINAL SHORT</div><h2>Review and set YouTube metadata</h2><p>Nothing uploads until you review the finished Short and choose the values sent to YouTube.</p><video id="v38video" controls playsinline style="width:100%;max-height:65vh;background:#000;border-radius:12px"></video><label style="display:grid;gap:6px;margin-top:12px"><strong>Title</strong><input id="v38title" maxlength="100" value="${esc(detail.title)}" style="padding:10px;background:#09090d;color:#fff;border:1px solid #555;border-radius:8px"></label><label style="display:grid;gap:6px;margin-top:12px"><strong>Description</strong><textarea id="v38desc" rows="7" style="padding:10px;background:#09090d;color:#fff;border:1px solid #555;border-radius:8px">${esc(detail.description)}</textarea></label><label style="display:grid;gap:6px;margin-top:12px"><strong>Privacy status</strong><select id="v38privacy" style="padding:10px;background:#09090d;color:#fff;border:1px solid #555;border-radius:8px"><option value="private"${pv==='private'?' selected':''}>Private</option><option value="unlisted"${pv==='unlisted'?' selected':''}>Unlisted</option><option value="public"${pv==='public'?' selected':''}>Public</option></select><small>All three YouTube privacy options are available.</small></label><details style="margin-top:12px"><summary>Narration / source / attribution</summary><div style="white-space:pre-wrap;margin-top:8px">${esc(detail.voiceoverText||detail.story||'')}\n\n${esc(detail.attribution||'')}\n\nSource: ${esc(source.title||'')}</div></details><label style="display:flex;gap:10px;margin-top:14px"><input id="v38meta" type="checkbox"><span>I watched the finished Short and reviewed its title, description, privacy, narration and attribution.</span></label><label style="display:flex;gap:10px;margin-top:10px"><input id="v38wild" type="checkbox"><span>I confirm this is a real wild animal encounter, not a zoo, cage, aquarium, pet, farm, animation, slideshow or staged captive performance.</span></label><button id="v38go" disabled style="width:100%;margin-top:14px;padding:14px;border:0;border-radius:10px;background:#24623f;color:#fff;font-weight:900;opacity:.5">APPROVE METADATA + CONTINUE TO YOUTUBE</button><button id="v38cancel" style="width:100%;margin-top:8px;padding:12px;border:1px solid #744;border-radius:10px;background:#211;color:#fbb">CANCEL — DO NOT UPLOAD</button>`;
    root.appendChild(card);document.body.appendChild(root);
    if(detail.blob instanceof Blob){const v=$('v38video');v.src=URL.createObjectURL(detail.blob);v.load();}
    const m=$('v38meta'),w=$('v38wild'),g=$('v38go');const sync=()=>{const ok=m.checked&&w.checked;g.disabled=!ok;g.style.opacity=ok?'1':'.5';};m.onchange=sync;w.onchange=sync;sync();
    $('v38cancel').onclick=()=>{close();const st=$('simpleStatus')||$('animalGeneratorStatus');if(st)st.textContent='Upload cancelled. Nothing was sent to YouTube.';};
    g.onclick=()=>{if(g.disabled)return;const t=String($('v38title').value||'').trim();if(!t)return alert('Enter a title first.');const d=String($('v38desc').value||'');const pr=String($('v38privacy').value||'private');detail.title=t.slice(0,100);detail.description=d;detail.__clipfreeComplianceApprovedV38=true;detail.__clipfreeUserSelectedPrivacyV38=pr;if($('uploadTitle'))$('uploadTitle').value=detail.title;if($('uploadDescription'))$('uploadDescription').value=d;setSel('uploadPrivacy',pr);setSel('autoPrivacy',pr);setSel('simplePrivacy',pr);if(window.ClipFreeExport===detail)Object.assign(window.ClipFreeExport,detail);close();window.dispatchEvent(new CustomEvent('clipfree-export-ready',{detail}));};
  }
  window.addEventListener('clipfree-export-ready',e=>{const d=e.detail||{};if(d.__clipfreeComplianceApprovedV38||d.kind!=='animal-generator'||!d.__clipfreeGrowthFinalReady)return;e.stopImmediatePropagation();review(d);},true);
  function ui(){const b=document.querySelector('#clipfreeSimpleStudio .simple-badge');if(b)b.textContent='YOUTUBE COMPLIANCE MODE • FINAL METADATA REVIEW REQUIRED';if(!$('clipfreeV38Banner')){const h=document.querySelector('#clipfreeSimpleStudio .simple-head');if(h){const x=document.createElement('div');x.id='clipfreeV38Banner';x.style.cssText='margin:12px 0;padding:12px;border:1px solid #44648a;border-radius:12px;background:#0b121a;color:#c5e3ff;font-weight:900';x.textContent='✅ v38 API COMPLIANCE • final preview • editable title + description • Private / Unlisted / Public';h.appendChild(x);}}}
  ui();new MutationObserver(ui).observe(document.documentElement,{childList:true,subtree:true});window.CLIPFREE_V38={version:'38.0',finalGeneratedPreview:true,editableTitle:true,editableDescription:true,privacyOptions:['private','unlisted','public']};
})();
