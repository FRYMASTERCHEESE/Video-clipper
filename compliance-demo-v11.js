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


/* CLIPFREE 1-20 SEQUENTIAL + AUTO-RETRY v15 */
/*
  Final mobile batch runner:
  - handles EVERY multi-Short request (2–20), including 8
  - creates/uploads one Short at a time
  - requires a real YouTube video ID before moving to the next Short
  - automatically retries the SAME slot when Motion Guard blocks a still source
  - stops on real YouTube/auth/quota failures and shows the exact message
*/
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const MAX_SOURCE_RETRIES = 6;

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

    const requested = Math.max(2, Math.min(20, Number(total || 2)));
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

    const requested = Math.max(1, Math.min(20, Number($('simpleCount')?.value || 1)));
    if (requested <= 1) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    runBatch(requested);
  }, true);

  window.ClipFreeSequentialBatch = {
    version:'15.0',
    max:20,
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
