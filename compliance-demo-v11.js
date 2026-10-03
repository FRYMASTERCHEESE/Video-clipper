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

    // Audit runs use an exact species instead of the broad variety search.
    // This makes the recording deterministic and prevents unrelated "wildlife"
    // search results from ever being submitted as the demo Short.
    set('simpleTopic', 'lions');
    set('simpleCount', 1);
    set('simpleDuration', 10);
    set('simplePrivacy', 'private');
    window.CLIPFREE_COMPLIANCE_EXACT_ANIMAL = 'lion';

    const rights = $('simpleRights');
    if (rights) rights.checked = false; // Reviewer can see the user tick it manually.

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