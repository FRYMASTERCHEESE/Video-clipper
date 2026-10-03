// ClipFree AI — Category Pages Wizard
// Step-by-step setup with Back/Next buttons. It fills the existing ClipFree controls.

(() => {
  const $ = id => document.getElementById(id);
  const pages = [...document.querySelectorAll('[data-wizard-page]')];
  const dots = [...document.querySelectorAll('[data-wizard-dot]')];
  const choices = [...document.querySelectorAll('.category-choice')];
  const back = $('wizardBack');
  const next = $('wizardNext');
  const label = $('wizardPageLabel');
  const summary = $('wizardSummary');

  if (!pages.length || !back || !next) return;

  let page = 0;
  let category = '';
  let topic = '';
  let style = 'documentary';

  const categoryNames = {
    lions:'Lions', wildlife:'Wildlife', kittens:'Kittens', puppies:'Puppies',
    tigers:'Tigers', elephants:'Elephants', wolves:'Wolves', bears:'Bears'
  };

  const presetMap = {
    lions:'lions',
    wildlife:'wildlife',
    kittens:'kittens',
    puppies:'puppies',
    tigers:'wildlife',
    elephants:'wildlife',
    wolves:'wildlife',
    bears:'wildlife'
  };

  function addStyles() {
    if (document.getElementById('categoryWizardStyles')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'categoryWizardStyles';
    styleEl.textContent = `
      .category-wizard-card{overflow:hidden}
      .category-wizard-progress{display:flex;justify-content:center;gap:12px;margin:0 0 20px}
      .category-wizard-progress span{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#1a1725;border:1px solid #3b315d;color:#9b9baa;font-weight:800}
      .category-wizard-progress span.active{background:#6d47ff;color:#fff;border-color:#8d72ff}
      .category-wizard-page{display:none}
      .category-wizard-page.active{display:block}
      .category-choice-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:16px}
      .category-choice{appearance:none;text-align:left;border:1px solid #373347;background:#111019;color:#fff;padding:16px;border-radius:14px;min-height:112px;cursor:pointer;font:inherit}
      .category-choice:hover,.category-choice.selected{border-color:#8d72ff;background:#1a1630;transform:translateY(-1px)}
      .category-choice strong,.category-choice span{display:block}.category-choice strong{margin:8px 0 4px}.category-choice span{font-size:.78rem;color:#aaa6b6;line-height:1.35}
      .category-wizard-nav{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:24px;padding-top:18px;border-top:1px solid #272432}
      #wizardPageLabel{font-size:.84rem;color:#9b9baa;font-weight:700}
      .wizard-final-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px}
      .category-wizard-form{margin-top:12px}
      @media(max-width:820px){.category-choice-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:520px){.category-choice-grid{grid-template-columns:1fr}.category-wizard-nav{position:sticky;bottom:8px;background:#0b0b10;padding:12px;border:1px solid #272432;border-radius:14px;z-index:5}}
    `;
    document.head.appendChild(styleEl);
  }

  function render() {
    pages.forEach((el, i) => el.classList.toggle('active', i === page));
    dots.forEach((el, i) => el.classList.toggle('active', i <= page));
    back.disabled = page === 0;
    next.style.display = page === pages.length - 1 ? 'none' : '';
    label.textContent = `Page ${page + 1} of ${pages.length}`;
    if (page === 3) refreshSummary();
  }

  function setChoice(groupSelector, selected) {
    document.querySelectorAll(groupSelector).forEach(btn => {
      btn.classList.toggle('selected', btn === selected);
    });
  }

  function setValue(id, value) {
    const el = $(id);
    if (!el || value == null) return;
    el.value = String(value);
    el.dispatchEvent(new Event('input', { bubbles:true }));
    el.dispatchEvent(new Event('change', { bubbles:true }));
  }

  function clickPreset(preset) {
    const btn = document.querySelector(`[data-animal-preset="${preset}"]`);
    if (btn) btn.click();
  }

  function applyToClipFree() {
    const batch = $('wizardBatchCount')?.value || '3';
    const privacy = $('wizardPrivacy')?.value || 'private';

    setValue('autoTopic', topic);
    setValue('autoBatchCount', batch);
    setValue('autoPrivacy', privacy);

    setValue('animalTopic', topic);
    setValue('animalBatchCount', batch);
    setValue('animalStyle', style);
    clickPreset(presetMap[category] || 'wildlife');

    // Premium Auto reads these for packaging metadata.
    window.ClipFreeWizardSelection = {
      category,
      categoryName: categoryNames[category] || category,
      topic,
      style,
      batchCount: Number(batch),
      privacy,
      targetMarkets: ['United States','Canada','United Kingdom','Australia','New Zealand'],
      metadataLanguage: 'en'
    };
  }

  function refreshSummary() {
    applyToClipFree();
    const batch = $('wizardBatchCount')?.value || '3';
    const privacy = $('wizardPrivacy')?.value || 'private';
    const name = categoryNames[category] || 'Not chosen';
    summary.innerHTML = `
      <strong>Ready:</strong> ${name} • ${style} • ${batch} Short${batch === '1' ? '' : 's'} • ${privacy}<br>
      <span style="color:#aaa6b6">Automatic titles, brighter text thumbnails, English metadata, tags and hashtags stay enabled.</span>
    `;
  }

  choices.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.category) {
        category = btn.dataset.category;
        topic = btn.dataset.topic || '';
        setChoice('[data-category]', btn);
      }
      if (btn.dataset.style) {
        style = btn.dataset.style;
        setChoice('[data-style]', btn);
      }
    });
  });

  next.addEventListener('click', () => {
    if (page === 0 && !category) {
      alert('Choose a category first.');
      return;
    }
    if (page === 1 && !style) {
      alert('Choose a style first.');
      return;
    }
    page = Math.min(pages.length - 1, page + 1);
    render();
  });

  back.addEventListener('click', () => {
    page = Math.max(0, page - 1);
    render();
  });

  $('wizardStartAnimal')?.addEventListener('click', () => {
    applyToClipFree();
    document.querySelector('#animal-generator')?.scrollIntoView({ behavior:'smooth', block:'start' });
  });

  $('wizardStartAuto')?.addEventListener('click', () => {
    applyToClipFree();
    document.querySelector('#autopilot')?.scrollIntoView({ behavior:'smooth', block:'start' });
  });

  $('wizardBatchCount')?.addEventListener('change', refreshSummary);
  $('wizardPrivacy')?.addEventListener('change', refreshSummary);

  addStyles();
  render();
})();


/* ==========================================================================
   ClipFree AI — 20 Stunning Shorts Mode
   Added 28 September 2026
   - Lets existing 8-item engines run 20 Shorts safely as 8 + 8 + 4.
   - Adds a one-tap Wildlife 20 button.
   - Builds stronger black/gold WETV-style thumbnails.
   - Keeps every upload sequential to reduce mobile memory pressure.
   - In 20-mode, skips automatic playlist insertion to preserve daily quota.
   ========================================================================== */

(() => {
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const NATIVE_BATCH_MAX = 8;
  const TWENTY = 20;

  const bulk = {
    active: false,
    kind: '',
    total: 0,
    completed: 0,
    exportSeq: 0,
    internalClick: false,
    seenTitles: new Set(),
  };

  window.ClipFree20State = bulk;
  window.ClipFreeConfirmedUploadState = window.ClipFreeConfirmedUploadState || {
    total: 0,
    ids: [],
    lastError: ''
  };

  window.ClipFreeTransferredUploadState = window.ClipFreeTransferredUploadState || {
    total: 0,
    ids: [],
    failed: 0,
    failedIds: [],
    lastError: ''
  };

  if (!window.__clipfreeUploadTrackerListenersV5) {
    window.__clipfreeUploadTrackerListenersV5 = true;

    window.addEventListener('clipfree-youtube-upload-transferred', event => {
      const id = String(event?.detail?.videoId || '').trim();
      if (!id) return;
      const s = window.ClipFreeTransferredUploadState;
      if (!s.ids.includes(id)) {
        s.ids.push(id);
        s.total += 1;
      }
    });

    window.addEventListener('clipfree-youtube-upload-confirmed', event => {
      const id = String(event?.detail?.videoId || '').trim();
      if (!id) return;
      const s = window.ClipFreeConfirmedUploadState;
      if (!s.ids.includes(id)) {
        s.ids.push(id);
        s.total += 1;
      }
      s.lastError = '';
    });

    window.addEventListener('clipfree-youtube-upload-failed', event => {
      const id = String(event?.detail?.videoId || '').trim();
      const msg = String(event?.detail?.message || 'YouTube could not process an uploaded Short.');
      const t = window.ClipFreeTransferredUploadState;
      if (id && !t.failedIds.includes(id)) {
        t.failedIds.push(id);
        t.failed += 1;
      }
      t.lastError = msg;
      window.ClipFreeConfirmedUploadState.lastError = msg;
    });
  }

  function addOption(select, value) {
    if (!select || [...select.options].some(o => Number(o.value) === value)) return;
    const option = document.createElement('option');
    option.value = String(value);
    option.textContent = `${value} Shorts`;
    select.appendChild(option);
  }

  ['wizardBatchCount','autoBatchCount','animalBatchCount'].forEach(id => {
    const select = $(id);
    for (let n = 9; n <= TWENTY; n++) addOption(select, n);
  });

  function addStyles() {
    if ($('clipfree20Styles')) return;
    const style = document.createElement('style');
    style.id = 'clipfree20Styles';
    style.textContent = `
      .clipfree20-card{
        margin-top:16px;padding:18px;border-radius:18px;
        border:1px solid #76571d;
        background:
          radial-gradient(circle at 88% 0%,rgba(255,196,68,.18),transparent 34%),
          linear-gradient(145deg,#17130b,#0c0c11 52%,#17130b);
        box-shadow:0 18px 60px rgba(0,0,0,.28),inset 0 0 0 1px rgba(255,215,115,.04)
      }
      .clipfree20-title{display:flex;align-items:center;gap:10px;margin-bottom:7px}
      .clipfree20-title strong{font-size:1.08rem;color:#fff}
      .clipfree20-title span{font-size:.7rem;font-weight:900;letter-spacing:.08em;padding:5px 8px;border-radius:999px;background:#2a1f0b;color:#ffd978;border:1px solid #745820}
      .clipfree20-card p{margin:0 0 13px;color:#aaa7a0;line-height:1.5;font-size:.84rem}
      .clipfree20-main{
        width:100%;min-height:56px;border:0;border-radius:13px;cursor:pointer;
        background:linear-gradient(135deg,#ffcf58,#b78316);color:#161006;
        font:inherit;font-weight:950;font-size:1rem;letter-spacing:.01em;
        box-shadow:0 10px 35px rgba(220,164,36,.18)
      }
      .clipfree20-main:disabled{opacity:.62;cursor:wait}
      .clipfree20-rights{display:flex;gap:9px;align-items:flex-start;margin:12px 0;color:#d7d2c5;font-size:.8rem;line-height:1.4}
      .clipfree20-rights input{margin-top:3px}
      .clipfree20-progress{margin-top:12px;height:8px;border-radius:999px;background:#242018;overflow:hidden}
      .clipfree20-progress>div{height:100%;width:0;background:linear-gradient(90deg,#b78316,#ffd56b);transition:width .35s ease}
      .clipfree20-status{margin-top:9px;font-size:.78rem;color:#c3bba8;line-height:1.45}
      .clipfree20-good{color:#9ae6b4}
      .clipfree20-bad{color:#ff9d9d}
      .clipfree20-quota{margin-top:9px;padding:9px 10px;border-radius:10px;background:#111016;border:1px solid #302b23;color:#a9a397;font-size:.72rem;line-height:1.45}
      .clipfree20-hero{
        background:linear-gradient(135deg,#ffcf58,#b78316)!important;color:#171006!important;
        border-color:#d09a28!important
      }
      @media(max-width:520px){.clipfree20-card{padding:14px}.clipfree20-main{font-size:.93rem}}
    `;
    document.head.appendChild(style);
  }

  addStyles();

  function insertTwentyCard() {
    const animalButton = $('generateAnimalVideo');
    const animalForm = animalButton?.closest('.card-body');
    if (animalForm && !$('clipfree20AnimalCard')) {
      const card = document.createElement('div');
      card.id = 'clipfree20AnimalCard';
      card.className = 'clipfree20-card';
      card.innerHTML = `
        <div class="clipfree20-title"><strong>✨ 20 Stunning Shorts</strong><span>WETV MODE</span></div>
        <p>Create and upload 20 vertical wildlife Shorts one at a time. ClipFree automatically runs three safe rounds (8 + 8 + 4), keeps SEO/attribution, and generates a stronger black-and-gold thumbnail for every Short.</p>
        <label class="clipfree20-rights"><input id="clipfree20Rights" type="checkbox"> <span>I confirm I have the rights to upload the selected/reusable content and it complies with the YouTube Community Guidelines.</span></label>
        <button id="clipfree20AnimalButton" class="clipfree20-main" type="button">✨ Create 20 Stunning Wildlife Shorts</button>
        <div class="clipfree20-progress"><div id="clipfree20Bar"></div></div>
        <div id="clipfree20Status" class="clipfree20-status">Ready. Connect YouTube first, keep this tab open, then tap the button once.</div>
        <div class="clipfree20-quota"><strong>Quota Saver:</strong> 20-mode keeps captions and custom thumbnails, but skips automatic playlist insertion during the batch. This saves roughly 1,000 general YouTube API quota units across 20 uploads.</div>
      `;
      animalForm.appendChild(card);
    }

    const hero = document.querySelector('.hero-actions');
    if (hero && !$('clipfree20Hero')) {
      const button = document.createElement('button');
      button.id = 'clipfree20Hero';
      button.type = 'button';
      button.className = 'secondary clipfree20-hero';
      button.textContent = '✨ Create 20 Stunning Shorts';
      button.addEventListener('click', () => {
        document.querySelector('[data-animal-preset="wildlife"]')?.click();
        const select = $('animalBatchCount');
        if (select) select.value = '20';
        document.querySelector('#animal-generator')?.scrollIntoView({behavior:'smooth',block:'start'});
      });
      hero.prepend(button);
    }
  }

  insertTwentyCard();

  const rights = $('clipfree20Rights');

  // RIGHTS FIX v8:
  // The final single-screen cleanup removes the old 20-Short card from the DOM.
  // Earlier code kept a reference to that removed checkbox, so it could stay
  // false even when the VISIBLE Simple Studio checkbox was ticked.
  function rightsConfirmed() {
    return Boolean(
      $('simpleRights')?.checked ||
      $('autoUploadCertification')?.checked ||
      $('clipfree20Rights')?.checked
    );
  }

  function syncRightsEverywhere(value) {
    const checked = Boolean(value);
    const simple = $('simpleRights');
    const official = $('autoUploadCertification');
    const legacy = $('clipfree20Rights');
    if (simple) simple.checked = checked;
    if (official) official.checked = checked;
    if (legacy) legacy.checked = checked;
  }

  rights?.addEventListener('change', () => {
    syncRightsEverywhere(rights.checked);
  });

  document.addEventListener('change', event => {
    const id = event?.target?.id;
    if (id === 'simpleRights' || id === 'autoUploadCertification' || id === 'clipfree20Rights') {
      syncRightsEverywhere(Boolean(event.target.checked));
    }
  }, true);

  function setBulkStatus(text, done = bulk.completed, kind = '') {
    const status = $('clipfree20Status');
    const bar = $('clipfree20Bar');
    if (status) {
      status.textContent = text;
      status.className = `clipfree20-status ${kind ? `clipfree20-${kind}` : ''}`.trim();
    }
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, bulk.total ? (done / bulk.total) * 100 : 0))}%`;
  }

  function connected() {
    try {
      return Boolean(window.ClipFreeYouTube?.isConnected?.());
    } catch {
      return false;
    }
  }

  function statusText(kind) {
    if (kind === 'animal') return $('animalGeneratorStatus')?.textContent || '';
    return `${$('autoStatusText')?.textContent || ''} ${$('autoStatusDetail')?.textContent || ''}`;
  }

  async function waitForCycle(button, kind) {
    const began = Date.now();
    while (!button.disabled && Date.now() - began < 6000) await sleep(80);

    const timeout = Date.now() + (4 * 60 * 60 * 1000);
    while (button.disabled) {
      if (Date.now() > timeout) throw new Error('This batch has taken unusually long. Keep the completed uploads and retry the remaining Shorts.');
      await sleep(700);
    }

    const text = statusText(kind);
    if (/(quota|failed|stopped|needs attention|could not upload|error)/i.test(text)) {
      throw new Error(text || 'The batch stopped before every Short finished.');
    }
  }

  function splitBatches(total) {
    const chunks = [];
    let left = total;
    while (left > 0) {
      const n = Math.min(NATIVE_BATCH_MAX, left);
      chunks.push(n);
      left -= n;
    }
    return chunks;
  }

  async function runChunked(kind, requested = TWENTY) {
    if (bulk.active) return;
    requested = Math.max(1, Math.min(TWENTY, Number(requested) || TWENTY));

    const select = kind === 'animal' ? $('animalBatchCount') : $('autoBatchCount');
    const button = kind === 'animal' ? $('generateAnimalVideo') : $('autoFindCreateUpload');
    if (!select || !button) return;

    if (!connected()) {
      alert('Connect YouTube first using the Connect YouTube button at the top, then start the 20-Short batch.');
      return;
    }

    if (!rightsConfirmed() && requested > NATIVE_BATCH_MAX) {
      alert('Tick the visible rights / Community Guidelines confirmation first.');
      $('simpleRights')?.scrollIntoView({behavior:'smooth',block:'center'});
      return;
    }

    syncRightsEverywhere(true);

    const chunks = splitBatches(requested);
    const originalValue = select.value;
    bulk.active = true;
    bulk.kind = kind;
    bulk.total = requested;
    bulk.completed = 0;
    bulk.exportSeq = 0;
    bulk.seenTitles.clear();

    const masterButton = $('clipfree20AnimalButton');
    if (masterButton) masterButton.disabled = true;

    try {
      setBulkStatus(`Starting ${requested} Shorts. Keep this tab open — Round 1 of ${chunks.length} is preparing…`, 0);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        select.value = String(chunk);
        select.dispatchEvent(new Event('change', {bubbles:true}));

        const transferredBefore = Number(window.ClipFreeTransferredUploadState?.total || 0);
        setBulkStatus(`Round ${i + 1}/${chunks.length}: creating ${chunk} Short${chunk === 1 ? '' : 's'} (${bulk.completed}/${requested} uploaded to YouTube)…`, bulk.completed);

        bulk.internalClick = true;
        try {
          button.click();
        } finally {
          bulk.internalClick = false;
        }

        await waitForCycle(button, kind);

        const transferredAfter = Number(window.ClipFreeTransferredUploadState?.total || 0);
        const transferredThisRound = Math.max(0, transferredAfter - transferredBefore);
        bulk.completed = Math.min(requested, bulk.completed + transferredThisRound);

        if (transferredThisRound < chunk) {
          const lastError = window.ClipFreeTransferredUploadState?.lastError || window.ClipFreeConfirmedUploadState?.lastError || '';
          throw new Error(
            `YouTube returned video IDs for ${transferredThisRound}/${chunk} uploads in this round. ` +
            `${lastError || 'The batch will stop here instead of pretending the missing uploads reached YouTube.'}`
          );
        }

        const processed = Number(window.ClipFreeConfirmedUploadState?.total || 0);
        setBulkStatus(`${bulk.completed}/${requested} Shorts uploaded to YouTube. ${processed} processed successfully so far. Preparing the next round…`, bulk.completed, 'good');
        await sleep(1000);
      }

      setBulkStatus(`All ${requested} Shorts reached YouTube and received video IDs ❤️ YouTube may still be processing some of them in the background.`, requested, 'good');
    } catch (err) {
      console.error('ClipFree 20-mode stopped', err);
      setBulkStatus(`Stopped after ${bulk.completed}/${requested}. ${err?.message || err}`, bulk.completed, 'bad');
    } finally {
      select.value = String(requested <= TWENTY ? requested : originalValue);
      select.dispatchEvent(new Event('change', {bubbles:true}));
      bulk.active = false;
      bulk.kind = '';
      if (masterButton) masterButton.disabled = false;
    }
  }

  $('clipfree20AnimalButton')?.addEventListener('click', () => {
    document.querySelector('[data-animal-preset="wildlife"]')?.click();
    const select = $('animalBatchCount');
    if (select) select.value = '20';
    runChunked('animal', 20);
  });

  // Make the normal Generate button understand 9–20 selections.
  $('generateAnimalVideo')?.addEventListener('click', (event) => {
    if (bulk.internalClick) return;
    const count = Number($('animalBatchCount')?.value || 1);
    if (count <= NATIVE_BATCH_MAX) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    runChunked('animal', count);
  }, true);

  // Make FULL AUTO free-video batches understand 9–20 selections.
  $('autoFindCreateUpload')?.addEventListener('click', (event) => {
    if (bulk.internalClick) return;
    const count = Number($('autoBatchCount')?.value || 1);
    if (count <= NATIVE_BATCH_MAX) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    runChunked('auto', count);
  }, true);

  // Keep the legal confirmation synchronized in both directions.
  $('autoUploadCertification')?.addEventListener('change', () => {
    syncRightsEverywhere(Boolean($('autoUploadCertification')?.checked));
  });

  /* ------------------------- QUOTA SAVER ------------------------- */

  // The existing YouTube uploader can add every finished Short to a playlist.
  // In a 20-item batch that costs extra general quota. While 20-mode is active,
  // make the upload playlist selector behave as "No playlist". Normal mode is unchanged.
  const playlist = $('uploadPlaylist');
  if (playlist) {
    const valueDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    if (valueDescriptor?.get && valueDescriptor?.set) {
      Object.defineProperty(playlist, 'value', {
        configurable: true,
        get() {
          return bulk.active ? '' : valueDescriptor.get.call(this);
        },
        set(value) {
          valueDescriptor.set.call(this, bulk.active ? '' : value);
        }
      });
    }
  }

  /* ---------------------- UNIQUE SEO TITLES ---------------------- */

  const variations = [
    'Wild Encounter','Natural Habitat','Close Wildlife View','Nature Moment',
    'Safari Scene','Animal Watch','Wildlife Focus','Habitat Moment',
    'Nature Close-Up','Wildlife Scene','In the Wild','Wildlife Spotlight',
    'Nature Encounter','Animal Moment','Wildlife Watch','Natural World',
    'Wildlife Close-Up','Habitat Watch','Wildlife Feature','Nature Spotlight'
  ];

  function cleanTitle(value = '') {
    return String(value || '')
      .replace(/\s*#Shorts\b/ig, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function buildUniqueTitle(detail) {
    bulk.exportSeq += 1;
    const variation = variations[(bulk.exportSeq - 1) % variations.length];
    let base = cleanTitle(detail?.title || $('uploadTitle')?.value || 'Amazing Wildlife Moment');
    if (base.length > 48) base = base.slice(0, 48).replace(/\s+\S*$/, '');
    let candidate = `${base} • ${variation} #Shorts`;

    let suffix = 2;
    while (bulk.seenTitles.has(candidate.toLowerCase())) {
      const numberedBase = base.length > 43 ? base.slice(0,43).replace(/\s+\S*$/,'') : base;
      candidate = `${numberedBase} • ${variation} ${suffix} #Shorts`;
      suffix += 1;
    }
    if (candidate.length > 100) candidate = `${candidate.slice(0, 91).replace(/\s+\S*$/, '')} #Shorts`;
    bulk.seenTitles.add(candidate.toLowerCase());
    return candidate;
  }

  function syncTitle(detail, title) {
    detail.title = title;
    const uploadTitle = $('uploadTitle');
    const seoTitle = $('seoTitle');
    if (uploadTitle) uploadTitle.value = title;
    if (seoTitle) seoTitle.value = title;
    if (window.ClipFreeExport === detail) window.ClipFreeExport.title = title;
  }

  /* --------------------- STUNNING THUMBNAILS --------------------- */

  function roundedRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrapText(ctx, text, maxWidth, maxLines = 2) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth) {
        line = test;
      } else {
        if (line) lines.push(line);
        line = word;
        if (lines.length >= maxLines - 1) break;
      }
    }
    if (line && lines.length < maxLines) lines.push(line);
    return lines;
  }

  async function makeStunningThumbnail(detail) {
    const video = $('preview');
    if (!video?.videoWidth || !video?.videoHeight) return detail?.thumbnailBlob || null;

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const targetRatio = 1280 / 720;
    const ratio = vw / vh;
    let sx = 0, sy = 0, sw = vw, sh = vh;

    if (ratio > targetRatio) {
      sw = vh * targetRatio;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / targetRatio;
      sy = (vh - sh) / 2;
    }

    ctx.filter = 'saturate(1.34) contrast(1.14) brightness(1.04)';
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 1280, 720);
    ctx.filter = 'none';

    const bottom = ctx.createLinearGradient(0, 250, 0, 720);
    bottom.addColorStop(0, 'rgba(0,0,0,0)');
    bottom.addColorStop(.55, 'rgba(0,0,0,.28)');
    bottom.addColorStop(1, 'rgba(0,0,0,.90)');
    ctx.fillStyle = bottom;
    ctx.fillRect(0, 180, 1280, 540);

    const side = ctx.createLinearGradient(0, 0, 700, 0);
    side.addColorStop(0, 'rgba(0,0,0,.56)');
    side.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, 760, 720);

    // Gold brand rail.
    const rail = ctx.createLinearGradient(0, 110, 0, 650);
    rail.addColorStop(0, '#ffe39a');
    rail.addColorStop(.5, '#d4a12f');
    rail.addColorStop(1, '#8d6210');
    ctx.fillStyle = rail;
    roundedRect(ctx, 48, 108, 10, 514, 5);
    ctx.fill();

    // WETV badge.
    roundedRect(ctx, 78, 72, 360, 58, 16);
    ctx.fillStyle = 'rgba(7,7,8,.82)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,210,91,.72)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = '900 25px Arial, sans-serif';
    ctx.fillStyle = '#ffd769';
    ctx.textBaseline = 'middle';
    ctx.fillText('WILDLIFE ENCOUNTERS TV', 102, 101);

    // SHORTS badge.
    roundedRect(ctx, 1040, 72, 160, 58, 16);
    ctx.fillStyle = 'rgba(7,7,8,.82)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.32)';
    ctx.stroke();
    ctx.font = '900 25px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('SHORTS', 1120, 101);
    ctx.textAlign = 'left';

    const title = cleanTitle(detail?.title || $('uploadTitle')?.value || 'Amazing Wildlife Moment');
    ctx.font = '900 76px Arial, sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,.9)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 3;

    const lines = wrapText(ctx, title.toUpperCase(), 1070, 2);
    const baseY = 545 - ((lines.length - 1) * 86);
    lines.forEach((line, i) => {
      ctx.lineWidth = 12;
      ctx.strokeStyle = 'rgba(0,0,0,.72)';
      ctx.strokeText(line, 88, baseY + (i * 88), 1080);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(line, 88, baseY + (i * 88), 1080);
    });

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.font = '800 26px Arial, sans-serif';
    ctx.fillStyle = '#ffd769';
    ctx.fillText('REAL WILDLIFE • VERTICAL SHORT', 90, 658);

    return await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .95));
  }

  // site.js already runs its SEO optimizer in capture phase. This listener is
  // loaded after site.js, so on the final dispatch it can add unique titles
  // after SEO optimization but before youtube.js performs the upload.
  window.addEventListener('clipfree-export-ready', (event) => {
    const detail = event.detail || {};
    if (window.CLIPFREE_GROWTH_ENGINE_ACTIVE) return;
    const shouldStyle = bulk.active || detail?.source?.kind === 'animal-generator';
    if (!shouldStyle) return;

    if (detail.__clipfreeStunningReady) {
      if (bulk.active) syncTitle(detail, buildUniqueTitle(detail));
      return;
    }

    event.stopImmediatePropagation();
    Promise.resolve()
      .then(() => makeStunningThumbnail(detail))
      .then(blob => {
        if (blob) detail.thumbnailBlob = blob;
      })
      .catch(err => console.warn('Stunning thumbnail fallback used', err))
      .finally(() => {
        detail.__clipfreeStunningReady = true;
        window.dispatchEvent(new CustomEvent('clipfree-export-ready', {detail}));
      });
  }, true);

  window.ClipFree20 = {
    runAnimal20: () => runChunked('animal', 20),
    runAuto20: () => runChunked('auto', 20),
  };
})();

/* CLIPFREE SIMPLE ALL-IN-ONE MODE */
/* Keeps the existing engine underneath, but presents one clean 1–20 Shorts screen. */

(() => {
  const $ = id => document.getElementById(id);
  if ($('clipfreeSimpleStudio')) return;

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  const TOPICS = {
    wildlife: { label:'🌍 Different animals — no repeats', preset:'wildlife', query:'clipfree variety wildlife' },
    lions:    { label:'🦁 Lions',        preset:'lions',    query:'lion wildlife' },
    moose:    { label:'🫎 Moose',        preset:'wildlife', query:'moose wildlife alces alces' },
    tigers:   { label:'🐅 Tigers',       preset:'wildlife', query:'tiger wildlife panthera tigris' },
    elephants:{ label:'🐘 Elephants',    preset:'wildlife', query:'elephant wildlife safari' },
    wolves:   { label:'🐺 Wolves',       preset:'wildlife', query:'wolf wildlife canis lupus' },
    bears:    { label:'🐻 Bears',        preset:'wildlife', query:'bear wildlife nature' },
    kittens:  { label:'🐱 Kittens',      preset:'kittens',  query:'cute kittens playing' },
    puppies:  { label:'🐶 Puppies',      preset:'puppies',  query:'cute puppies playing' },
  };

  function injectStyles() {
    if ($('clipfreeSimpleStyles')) return;
    const s = document.createElement('style');
    s.id = 'clipfreeSimpleStyles';
    s.textContent = `
      body.clipfree-simple-mode{background:#08080d}
      body.clipfree-simple-mode main>section:not(#clipfreeSimpleStudio):not(#setup){display:none!important}
      body.clipfree-simple-mode #setup{display:none!important}
      body.clipfree-simple-mode.show-advanced #setup{display:block!important}
      body.clipfree-simple-mode footer{display:none!important}
      body.clipfree-simple-mode .topbar nav>a:not(.pill[href="#setup"]){display:none!important}
      body.clipfree-simple-mode .topbar nav .pill[href="#setup"]{display:inline-flex!important}
      body.clipfree-simple-mode #topYoutubeConnection{position:sticky;top:0;z-index:30}
      .simple-shell{max-width:880px;margin:24px auto 70px;padding:0 16px}
      .simple-card{
        border:1px solid #2d2937;border-radius:24px;overflow:hidden;
        background:
          radial-gradient(circle at 90% -10%,rgba(116,79,255,.22),transparent 30%),
          radial-gradient(circle at 8% 0%,rgba(255,199,76,.12),transparent 26%),
          linear-gradient(180deg,#121119,#0c0c12);
        box-shadow:0 24px 80px rgba(0,0,0,.36)
      }
      .simple-head{padding:24px 22px 14px;border-bottom:1px solid #26232f}
      .simple-badge{
        display:inline-flex;padding:6px 10px;border-radius:999px;
        background:#211a37;border:1px solid #513d91;color:#c8baff;
        font-size:.72rem;font-weight:900;letter-spacing:.08em
      }
      .simple-head h1{font-size:clamp(1.7rem,6vw,3rem);line-height:1.04;margin:14px 0 10px;color:#fff}
      .simple-head h1 span{background:linear-gradient(90deg,#ffe08a,#9c7dff);-webkit-background-clip:text;background-clip:text;color:transparent}
      .simple-head p{margin:0;color:#a9a6b3;line-height:1.55}
      .simple-connected{display:flex;align-items:center;gap:8px;margin-top:14px;font-size:.82rem;font-weight:800;color:#8ce3aa}
      .simple-dot{width:9px;height:9px;border-radius:50%;background:currentColor;box-shadow:0 0 18px currentColor}
      .simple-body{padding:22px}
      .simple-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
      .simple-field{display:grid;gap:7px}
      .simple-field span{font-size:.78rem;color:#aaa7b3;font-weight:800}
      .simple-field select{
        width:100%;appearance:auto;background:#111018;color:#fff;border:1px solid #393542;
        border-radius:14px;padding:14px 14px;font:inherit;min-height:54px
      }
      .simple-check{
        grid-column:1/-1;display:flex;align-items:flex-start;gap:11px;padding:13px 14px;
        border:1px solid #322e3c;border-radius:14px;background:#100f16;color:#d3d0da;
        font-size:.83rem;line-height:1.42
      }
      .simple-check input{margin-top:3px;width:18px;height:18px;flex:0 0 auto}
      .simple-seo-box{
        grid-column:1/-1;padding:14px;border-radius:15px;border:1px solid #443822;
        background:linear-gradient(135deg,rgba(255,207,88,.08),rgba(124,92,255,.08))
      }
      .simple-seo-box strong{display:block;color:#ffe08a;margin-bottom:7px}
      .simple-seo-list{display:flex;gap:7px;flex-wrap:wrap}
      .simple-seo-list span{
        padding:6px 8px;border-radius:999px;background:#17151d;border:1px solid #302c38;
        color:#cbc7d3;font-size:.7rem;font-weight:800
      }
      .simple-start{
        grid-column:1/-1;width:100%;border:0;border-radius:16px;min-height:66px;padding:14px;
        cursor:pointer;font:inherit;font-size:1.03rem;font-weight:950;color:#fff;
        background:linear-gradient(135deg,#7a4dff,#5d43df 58%,#9d6fff);
        box-shadow:0 14px 38px rgba(100,66,230,.26)
      }
      .simple-start:disabled{opacity:.58;cursor:wait}
      .simple-progress{grid-column:1/-1;height:9px;border-radius:999px;background:#23212c;overflow:hidden}
      .simple-progress>div{height:100%;width:0;background:linear-gradient(90deg,#7b55ff,#ffd56b);transition:width .35s ease}
      .simple-status{
        grid-column:1/-1;padding:13px 14px;border-radius:14px;background:#111018;border:1px solid #2e2a37;
        color:#aaa7b3;font-size:.8rem;line-height:1.45
      }
      .simple-status.good{border-color:#24573a;color:#8ee2aa;background:#0d1a13}
      .simple-status.bad{border-color:#6d333b;color:#ff9ea8;background:#211015}
      .simple-note{grid-column:1/-1;color:#777482;font-size:.7rem;line-height:1.5}
      .simple-advanced{
        grid-column:1/-1;border:1px solid #34303d;border-radius:13px;background:#111018;color:#c8c5ce;
        padding:11px 14px;font:inherit;font-weight:800;cursor:pointer
      }
      @media(max-width:650px){
        .simple-shell{margin-top:12px;padding:0 10px}
        .simple-head{padding:20px 17px 13px}.simple-body{padding:17px}
        .simple-grid{grid-template-columns:1fr}
        .simple-check,.simple-seo-box,.simple-start,.simple-progress,.simple-status,.simple-note,.simple-advanced{grid-column:1}
      }
    `;
    document.head.appendChild(s);
  }

  function buildUi() {
    injectStyles();
    document.body.classList.add('clipfree-simple-mode');

    const main = document.querySelector('main');
    if (!main) return;

    const section = document.createElement('section');
    section.id = 'clipfreeSimpleStudio';
    section.className = 'simple-shell';

    const countOptions = Array.from({length:20}, (_,i) => {
      const n = i + 1;
      return `<option value="${n}"${n === 20 ? ' selected' : ''}>${n} Short${n === 1 ? '' : 's'}</option>`;
    }).join('');

    const topicOptions = Object.entries(TOPICS)
      .map(([key,v]) => `<option value="${key}">${v.label}</option>`).join('');

    section.innerHTML = `
      <div class="simple-card">
        <div class="simple-head">
          <span class="simple-badge">ALL-IN-ONE YOUTUBE SHORTS AUTOMATION</span>
          <h1>Create <span>1–20 Shorts</span> from one screen.</h1>
          <p>Choose the animal/topic, style, length, number of Shorts and visibility. ClipFree creates the 9:16 video, original AI narration, SEO package, captions, thumbnail, attribution and YouTube upload automatically.</p>
          <div id="simpleConnection" class="simple-connected"><span class="simple-dot"></span><span>Checking YouTube connection…</span></div>
        </div>

        <div class="simple-body">
          <div class="simple-grid">
            <label class="simple-field"><span>Animal / topic</span>
              <select id="simpleTopic">${topicOptions}</select>
            </label>

            <label class="simple-field"><span>Style</span>
              <select id="simpleStyle">
                <option value="documentary" selected>Wildlife documentary</option>
                <option value="dramatic">Dramatic / epic</option>
                <option value="cute">Cute & wholesome</option>
                <option value="calm">Calm / relaxing</option>
              </select>
            </label>

            <label class="simple-field"><span>Length</span>
              <select id="simpleDuration">
                                <option value="10">About 10 seconds</option>
<option value="15">About 15 seconds</option>
                <option value="24">About 24 seconds</option>
                <option value="30" selected>About 30 seconds</option>
                <option value="45">About 45 seconds</option>
                <option value="60">About 60 seconds</option>
              </select>
            </label>

            <label class="simple-field"><span>How many Shorts?</span>
              <select id="simpleCount">${countOptions}</select>
            </label>

            <label class="simple-field"><span>YouTube visibility</span>
              <select id="simplePrivacy">
                <option value="public" selected>Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
              </select>
            </label>

            <label class="simple-field"><span>Audio on every Short</span>
              <select id="simpleSounds">
                <option value="on" selected>Original AI voiceover • PD/CC0 sound fallback</option>
              </select>
            </label>

            <div class="simple-seo-box">
              <strong>✓ YouTube SEO is always included</strong>
              <div class="simple-seo-list">
                <span>Unique title</span><span>Description</span><span>Tags</span><span>Hashtags</span>
                <span>9:16 Short</span><span>Captions</span><span>Thumbnail</span><span>Attribution</span>
                <span>Original AI voiceover</span><span>No app watermark</span><span>Single-pass encode</span><span>Adaptive HD quality</span>
                <span>Pets & Animals</span><span>Channel CTA</span>
              </div>
            </div>

            <label class="simple-check">
              <input id="simpleRights" type="checkbox">
              <span>I confirm I have the rights to upload this content and it complies with the YouTube Community Guidelines.</span>
            </label>

            <button id="simpleStart" class="simple-start" type="button">✨ CREATE + SEO + UPLOAD 20 SHORTS</button>

            <div class="simple-progress"><div id="simpleProgress"></div></div>
            <div id="simpleStatus" class="simple-status">Ready. Choose your settings, tick the rights confirmation, then tap the purple button once.</div>

            <div class="simple-note">
              SEO can improve how clearly YouTube understands and packages a video, but no link, hidden code or metadata setting can guarantee a specific number of subscribers, views or watch hours. Viewer response and YouTube’s recommendation systems determine distribution.
            </div>

            <button id="simpleAdvanced" class="simple-advanced" type="button">Advanced setup / diagnostics</button>
          </div>
        </div>
      </div>
    `;

    main.insertBefore(section, main.firstChild);

    const setupLink = document.querySelector('.topbar nav .pill[href="#setup"]');
    if (setupLink) {
      setupLink.textContent = 'Advanced';
      setupLink.addEventListener('click', event => {
        event.preventDefault();
        document.body.classList.toggle('show-advanced');
        if (document.body.classList.contains('show-advanced')) {
          document.querySelector('#setup')?.scrollIntoView({behavior:'smooth',block:'start'});
        }
      });
    }
  }

  buildUi();

  function setUnderlyingValue(id, value) {
    const el = $(id);
    if (!el) return;
    el.value = String(value);
    el.dispatchEvent(new Event('input', {bubbles:true}));
    el.dispatchEvent(new Event('change', {bubbles:true}));
  }

  function clickPreset(name) {
    document.querySelector(`[data-animal-preset="${name}"]`)?.click();
  }

  function isConnected() {
    try { return Boolean(window.ClipFreeYouTube?.isConnected?.()); }
    catch { return false; }
  }

  function updateConnectionLabel() {
    const el = $('simpleConnection');
    if (!el) return;
    if (isConnected()) {
      const title = window.ClipFreeYouTube?.getChannelTitle?.() || 'YouTube';
      el.style.color = '#8ce3aa';
      el.innerHTML = `<span class="simple-dot"></span><span>${title} connected ✓</span>`;
    } else {
      el.style.color = '#ffbc76';
      el.innerHTML = `<span class="simple-dot"></span><span>YouTube not connected — the Start button will open Google sign-in.</span>`;
    }
  }

  setInterval(updateConnectionLabel, 1800);
  setTimeout(updateConnectionLabel, 600);

  function syncSimpleToEngine() {
    const topic = TOPICS[$('simpleTopic')?.value] || TOPICS.wildlife;
    const style = $('simpleStyle')?.value || 'documentary';
    const duration = $('simpleDuration')?.value || '30';
    const count = $('simpleCount')?.value || '1';
    const privacy = $('simplePrivacy')?.value || 'public';
    const sounds = true;
    const rights = Boolean($('simpleRights')?.checked);
    window.ClipFreeVarietyMode = $('simpleTopic')?.value === 'wildlife';

    clickPreset(topic.preset);
    setUnderlyingValue('animalTopic', topic.query);
    setUnderlyingValue('animalStyle', style);
    setUnderlyingValue('animalDuration', duration);
    setUnderlyingValue('animalBatchCount', count);
    setUnderlyingValue('autoPrivacy', privacy);

    const soundToggle = $('animalSounds');
    if (soundToggle) {
      soundToggle.checked = sounds;
      soundToggle.dispatchEvent(new Event('change', {bubbles:true}));
    }

    const autoRights = $('autoUploadCertification');
    if (autoRights) autoRights.checked = rights;

    const old20Rights = $('clipfree20Rights');
    if (old20Rights) old20Rights.checked = rights;

    return {topic, style, duration:Number(duration), count:Number(count), privacy, sounds, rights};
  }

  function updateStartLabel() {
    const n = Number($('simpleCount')?.value || 1);
    const b = $('simpleStart');
    if (b) b.textContent = `✨ CREATE + SEO + UPLOAD ${n} SHORT${n === 1 ? '' : 'S'}`;
  }

  $('simpleCount')?.addEventListener('change', updateStartLabel);
  updateStartLabel();

  // Growth Mode defaults to Public, matching this channel's publishing workflow.
  // YouTube may still force Private while the separate Data API compliance review is pending.
  setTimeout(() => {
    if ($('simplePrivacy')) $('simplePrivacy').value = 'public';
    setUnderlyingValue('autoPrivacy', 'public');
  }, 400);

  function setSimpleStatus(text, kind = '') {
    const el = $('simpleStatus');
    if (!el) return;
    el.textContent = text;
    el.className = `simple-status ${kind}`.trim();
  }

  function setSimpleProgress(value) {
    const bar = $('simpleProgress');
    if (bar) bar.style.width = `${Math.max(0,Math.min(100,Number(value)||0))}%`;
  }

  function hiddenProgressValue() {
    const bulk = window.ClipFree20State;
    if (bulk?.active && bulk.total) return (Number(bulk.completed || 0) / Number(bulk.total)) * 100;

    const raw = $('animalGeneratorProgress')?.style?.width || '0';
    const n = Number(String(raw).replace('%',''));
    return Number.isFinite(n) ? n : 0;
  }

  function hiddenStatusText() {
    const t = $('animalGeneratorStatus')?.textContent?.trim();
    const b = window.ClipFree20State;
    if (b?.active && b.total) {
      return `${b.completed || 0}/${b.total} Shorts uploaded to YouTube so far. ${t || 'ClipFree is working…'}`;
    }
    return t || 'ClipFree is working…';
  }

  async function ensureConnected() {
    if (isConnected()) return;
    setSimpleStatus('Opening Google sign-in to connect YouTube…');
    if (!window.ClipFreeYouTube?.connectYoutube) {
      throw new Error('YouTube tools are still loading. Wait a few seconds and tap Start again.');
    }
    await window.ClipFreeYouTube.connectYoutube();
    await sleep(500);
    if (!isConnected()) throw new Error('YouTube connection did not finish. Approve Google access, then tap Start again.');
  }

  async function monitorRun(nativeButton, requested, confirmedStart = 0) {
    const deadline = Date.now() + (6 * 60 * 60 * 1000);
    await sleep(350);

    let started = false;
    while (Date.now() < deadline) {
      const bulkActive = Boolean(window.ClipFree20State?.active);
      const nativeBusy = Boolean(nativeButton?.disabled);
      if (bulkActive || nativeBusy) started = true;

      setSimpleProgress(hiddenProgressValue());
      setSimpleStatus(hiddenStatusText());

      if (started && !bulkActive && !nativeBusy) break;
      await sleep(700);
    }

    const finalText = hiddenStatusText();
    if (/(failed|stopped|quota|error|needs attention|could not)/i.test(finalText)) {
      throw new Error(finalText);
    }

    const transferredTotal = Number(window.ClipFreeTransferredUploadState?.total || 0);
    const transferredStart = Number(window.__clipfreeSimpleTransferredStart || 0);
    const transferredThisRun = Math.max(0, transferredTotal - transferredStart);

    const confirmedTotal = Number(window.ClipFreeConfirmedUploadState?.total || 0);
    const confirmedThisRun = Math.max(0, confirmedTotal - Number(confirmedStart || 0));

    if (transferredThisRun < requested) {
      const lastError = window.ClipFreeTransferredUploadState?.lastError || window.ClipFreeConfirmedUploadState?.lastError || '';
      throw new Error(
        `Only ${transferredThisRun}/${requested} Shorts from this run reached YouTube and received video IDs. ` +
        `${lastError || 'ClipFree will not pretend the missing uploads succeeded.'}`
      );
    }

    setSimpleProgress(100);
    if (confirmedThisRun >= requested) {
      setSimpleStatus(`${requested}/${requested} Shorts uploaded and processed successfully by YouTube ❤️`, 'good');
    } else {
      setSimpleStatus(
        `${requested}/${requested} Shorts uploaded to YouTube with real video IDs. ${confirmedThisRun}/${requested} have finished processing so far; YouTube is still processing the rest in the background.`,
        'good'
      );
    }
  }

  $('simpleStart')?.addEventListener('click', async () => {
    const simpleStart = $('simpleStart');
    if (simpleStart?.disabled) return;

    try {
      const cfg = syncSimpleToEngine();

      const uploadLimit = window.ClipFreeYouTube?.getUploadLimitStatus?.();
      if (uploadLimit?.active) {
        setSimpleStatus(
          `YouTube's daily upload limit is still in its cooldown window. To avoid wasting video processing, ClipFree has paused new renders until about ${uploadLimit.untilText}.`,
          'bad'
        );
        return;
      }

      if (!cfg.rights) {
        setSimpleStatus('Tick the content-rights / Community Guidelines confirmation first.', 'bad');
        $('simpleRights')?.scrollIntoView({behavior:'smooth',block:'center'});
        return;
      }

      simpleStart.disabled = true;
      setSimpleProgress(1);

      await ensureConnected();
      updateConnectionLabel();

      // Re-sync after OAuth because the page may have refreshed YouTube UI state.
      syncSimpleToEngine();

      const nativeButton = $('generateAnimalVideo');
      if (!nativeButton) throw new Error('The animal Shorts engine is not available. Refresh ClipFree and try again.');

      const confirmedStart = Number(window.ClipFreeConfirmedUploadState?.total || 0);
      window.__clipfreeSimpleTransferredStart = Number(window.ClipFreeTransferredUploadState?.total || 0);
      setSimpleStatus(`Starting ${cfg.count} SEO-optimized Short${cfg.count === 1 ? '' : 's'}… Keep this tab open.`);
      nativeButton.click();

      await monitorRun(nativeButton, cfg.count, confirmedStart);
    } catch (err) {
      console.error('Simple Shorts Studio', err);
      setSimpleStatus(err?.message || String(err), 'bad');
    } finally {
      if (simpleStart) simpleStart.disabled = false;
    }
  });

  $('simpleAdvanced')?.addEventListener('click', () => {
    document.body.classList.toggle('show-advanced');
    const open = document.body.classList.contains('show-advanced');
    $('simpleAdvanced').textContent = open ? 'Hide advanced setup' : 'Advanced setup / diagnostics';
    if (open) document.querySelector('#setup')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
})();

/* CLIPFREE SEO LINKS + TREND-AWARE BOOST */
/*
  Trend pack refreshed from current YouTube wildlife keyword/video research
  on 28–29 September 2026. It stays conservative: trend terms are only added
  when they match the actual subject/source, so metadata does not claim events
  that the video does not show.
*/

(() => {
  const $ = id => document.getElementById(id);

  const CURRENT_TREND_TAGS = [
    'wildlife shorts',
    'animal shorts',
    'wildlife',
    'wild animals',
    'animal moments'
  ];

  const SPECIES = [
    {
      re:/\b(lion|lions|lioness|lionesses|panthera leo)\b/i,
      tags:['lion wildlife','lion encounter','lion shorts','big cats','lion pride','african lion'],
      hashes:['#Lions','#BigCats']
    },
    {
      re:/\b(moose|alces alces)\b/i,
      tags:['moose wildlife','moose in the wild','moose shorts','alces alces','north american wildlife'],
      hashes:['#Moose','#Wildlife']
    },
    {
      re:/\b(tiger|tigers|panthera tigris)\b/i,
      tags:['tiger wildlife','tiger in the wild','tiger shorts','big cats','panthera tigris'],
      hashes:['#Tigers','#BigCats']
    },
    {
      re:/\b(elephant|elephants|loxodonta|elephas)\b/i,
      tags:['elephant wildlife','elephants in the wild','elephant shorts','safari wildlife'],
      hashes:['#Elephants','#Safari']
    },
    {
      re:/\b(wolf|wolves|canis lupus)\b/i,
      tags:['wolf wildlife','wolves in the wild','wolf shorts','canis lupus','wild predators'],
      hashes:['#Wolves','#Wildlife']
    },
    {
      re:/\b(bear|bears|ursus)\b/i,
      tags:['bear wildlife','bears in the wild','bear shorts','wildlife encounters'],
      hashes:['#Bears','#Wildlife']
    },
    {
      re:/\b(kitten|kittens|cat|cats|feline)\b/i,
      tags:['cute kittens','kitten shorts','cat shorts','cute animals','kittens playing'],
      hashes:['#Kittens','#Cats']
    },
    {
      re:/\b(puppy|puppies|dog|dogs|canine)\b/i,
      tags:['cute puppies','puppy shorts','dog shorts','cute animals','puppies playing'],
      hashes:['#Puppies','#Dogs']
    }
  ];

  function uniq(items) {
    const seen = new Set();
    return items.filter(item => {
      const key = String(item || '').trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function sourceText(detail = {}) {
    const source = detail?.source || window.ClipFreeSource || {};
    return [
      detail?.title,
      detail?.description,
      source?.title,
      source?.searchTopic,
      source?.story,
      ...(Array.isArray(source?.sources) ? source.sources.map(x => x?.title || '') : []),
      $('animalTopic')?.value,
      $('autoTopic')?.value
    ].filter(Boolean).join(' ');
  }

  function parseTags(value) {
    if (Array.isArray(value)) return value.map(String);
    return String(value || '').split(',').map(x => x.trim()).filter(Boolean);
  }

  function parseHashes(value) {
    return String(value || '')
      .split(/\s+/)
      .filter(x => /^#[A-Za-z0-9_]+$/.test(x));
  }

  function trendTermsFor(detail) {
    const text = sourceText(detail);
    const tags = [...CURRENT_TREND_TAGS];
    const hashes = ['#Shorts','#Wildlife','#Animals'];

    for (const species of SPECIES) {
      if (species.re.test(text)) {
        tags.unshift(...species.tags);
        hashes.unshift(...species.hashes);
        break;
      }
    }

    // Add action/comparison terms only when the actual source/title supports them.
    const hasLion = /\b(lion|lions|lioness|panthera leo)\b/i.test(text);
    const hasTiger = /\b(tiger|tigers|panthera tigris)\b/i.test(text);
    const hasFight = /\b(fight|fighting|battle|clash|attack|attacking)\b/i.test(text);

    if (hasLion && hasTiger) tags.unshift('lion vs tiger','lion and tiger');
    if (hasLion && hasTiger && hasFight) tags.unshift('lion vs tiger fight');
    if (hasLion && hasFight) tags.unshift('lion fight','lion attack');

    return {
      tags: uniq(tags).slice(0, 8),
      hashes: uniq(hashes).slice(0, 3)
    };
  }

  function channelIdentity() {
    const raw = document.querySelector('#channelSnapshot .channel-title p')?.textContent?.trim() || '';
    if (!raw) return {base:'', subscribe:'', shorts:''};

    let base = '';
    if (/^@/.test(raw)) base = `https://www.youtube.com/${raw}`;
    else if (/^UC[A-Za-z0-9_-]{20,}$/.test(raw)) base = `https://www.youtube.com/channel/${raw}`;

    if (!base) return {base:'', subscribe:'', shorts:''};
    return {
      base,
      subscribe:`${base}?sub_confirmation=1`,
      shorts:`${base}/shorts`
    };
  }

  function shortsPlaylistUrl() {
    const options = [...($('uploadPlaylist')?.options || [])];
    const match = options.find(o => o.value && /\bshort/i.test(o.textContent || ''));
    return match?.value ? `https://www.youtube.com/playlist?list=${encodeURIComponent(match.value)}` : '';
  }

  function latestVideoUrl() {
    const href = document.querySelector('#videoAuditTable a[href*="youtube.com/watch?v="]')?.href || '';
    return href;
  }

  function removeOldSeoLinkBlock(description = '') {
    return String(description || '')
      .replace(/\n{0,2}---\nWATCH MORE ON WILDLIFE ENCOUNTERS TV[\s\S]*?---\n?/i, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function buildLinkBlock() {
    const channel = channelIdentity();
    const playlist = shortsPlaylistUrl();
    const latest = latestVideoUrl();
    const lines = [];

    if (channel.base) lines.push(`Channel: ${channel.base}`);
    if (playlist) lines.push(`More wildlife Shorts: ${playlist}`);
    else if (channel.shorts) lines.push(`More wildlife Shorts: ${channel.shorts}`);
    if (latest) lines.push(`Watch next: ${latest}`);
    if (channel.subscribe) lines.push(`Subscribe: ${channel.subscribe}`);

    if (!lines.length) return '';

    return [
      '---',
      'WATCH MORE ON WILDLIFE ENCOUNTERS TV',
      ...lines,
      '---'
    ].join('\n');
  }

  function naturalKeywordSentence(detail, trends) {
    const title = String(detail?.title || '').replace(/\s*#Shorts\b/i,'').trim();
    const top = trends.tags.slice(0, 4).join(', ');
    if (!top) return '';
    return `Related topics: ${top}.${title ? ` This Short features ${title}.` : ''}`;
  }

  function applyTrendSeo(detail = {}) {
    if (!detail || typeof detail !== 'object') return;

    const trends = trendTermsFor(detail);
    const existingTags = parseTags(detail.tags);
    const mergedTags = uniq([...existingTags, ...trends.tags]).slice(0, 8);
    const existingHashes = parseHashes(detail.hashtags);
    const mergedHashes = uniq([...existingHashes, ...trends.hashes]).slice(0, 3);

    let description = removeOldSeoLinkBlock(detail.description || '');
    const keywordSentence = naturalKeywordSentence(detail, trends);

    // Only add the keyword sentence when it is not already represented.
    if (keywordSentence && !/Related topics:/i.test(description)) {
      const attrIndex = description.search(/\n\nSource\s*\/?\s*attribution:/i);
      if (attrIndex >= 0) {
        description =
          `${description.slice(0, attrIndex).trim()}\n\n${keywordSentence}\n\n${description.slice(attrIndex).trim()}`;
      } else {
        description = `${description}\n\n${keywordSentence}`.trim();
      }
    }

    const links = buildLinkBlock();
    if (links) description = `${description}\n\n${links}`.trim();

    // Keep the final hashtag block clean and limited.
    description = description
      .replace(/(?:\s*#[A-Za-z0-9_]+){3,}\s*$/g, '')
      .trim();
    if (mergedHashes.length) description += `\n\n${mergedHashes.join(' ')}`;

    detail.description = description.slice(0, 5000);
    detail.tags = mergedTags.join(', ');
    detail.hashtags = mergedHashes.join(' ');
    detail.__clipfreeTrendSeoReady = true;

    // Synchronize visible/hidden upload fields before YouTube's uploader reads them.
    const uploadDescription = $('uploadDescription');
    const uploadTags = $('uploadTags');
    const seoDescription = $('seoDescription');
    const seoTags = $('seoTags');
    const seoHashtags = $('seoHashtags');

    if (uploadDescription) uploadDescription.value = detail.description;
    if (uploadTags) uploadTags.value = detail.tags;
    if (seoDescription) seoDescription.value = detail.description;
    if (seoTags) seoTags.value = detail.tags;
    if (seoHashtags) seoHashtags.value = detail.hashtags;

    if (window.ClipFreeExport === detail) {
      window.ClipFreeExport.description = detail.description;
      window.ClipFreeExport.tags = detail.tags;
      window.ClipFreeExport.hashtags = detail.hashtags;
    }
  }

  // Loaded after the normal SEO optimizer and stunning-thumbnail listener.
  // On the re-dispatched export event, this becomes the final metadata pass
  // before youtube.js performs the upload.
  window.addEventListener('clipfree-export-ready', event => {
    try {
      const detail = event.detail || {};
      if (window.CLIPFREE_GROWTH_ENGINE_ACTIVE) return;
      if (detail.__clipfreeTrendSeoReady) return;
      applyTrendSeo(detail);
    } catch (err) {
      console.warn('Trend-aware SEO/link boost skipped', err);
    }
  }, true);

  // Show the user what is permanently enabled in the Simple interface.
  setTimeout(() => {
    const box = document.querySelector('#clipfreeSimpleStudio .simple-seo-list');
    if (box && !box.querySelector('[data-trend-seo]')) {
      ['Trend-aware keywords','Channel link','Shorts/playlist link','Watch-next link','Subscribe link']
        .forEach(label => {
          const chip = document.createElement('span');
          chip.dataset.trendSeo = '1';
          chip.textContent = label;
          box.appendChild(chip);
        });
    }

    const note = document.querySelector('#clipfreeSimpleStudio .simple-note');
    if (note) {
      note.textContent =
        'SEO + trend-aware packaging is automatic. The current wildlife trend pack was refreshed from current YouTube keyword/video research on 28–29 September 2026. ClipFree only adds trend terms that match the actual subject, and automatically includes channel, Shorts/playlist, watch-next and subscribe links when your connected-channel data is available. No metadata can guarantee Home-page placement, views or subscribers.';
    }
  }, 700);
})();

/* CLIPFREE ONE-OF-EVERYTHING + NO-DUPLICATES FINAL */
(() => {
  const $ = id => document.getElementById(id);
  const USED_KEY = 'clipfree_unique_visual_sources_v3';
  const patched = { youtube:false };

  // ONE visible workflow. The older sections remain hidden only because the existing
  // engine still needs their DOM controls in the background.
  const style = document.createElement('style');
  style.id = 'clipfreeOneEverythingCss';
  style.textContent = `
    body.clipfree-simple-mode main > section:not(#clipfreeSimpleStudio){display:none!important}
    body.clipfree-simple-mode #clipfreeSimpleStudio{display:block!important}
    body.clipfree-simple-mode #clipfree20AnimalCard,
    body.clipfree-simple-mode #clipfree20Hero,
    body.clipfree-simple-mode .simple-advanced{display:none!important}
    body.clipfree-simple-mode footer{display:none!important}
    #clipfreeSimpleStudio .simple-card{max-width:820px;margin:0 auto}
    #clipfreeSimpleStudio .simple-seo-list span{white-space:normal;text-align:center}
  `;
  document.head.appendChild(style);

  function ensureBatchOptions() {
    ['animalBatchCount','autoBatchCount','wizardBatchCount'].forEach(id => {
      const select = $(id);
      if (!select) return;
      for (let n = 1; n <= 20; n++) {
        if (![...select.options].some(o => Number(o.value) === n)) {
          const option = document.createElement('option');
          option.value = String(n);
          option.textContent = `${n} Short${n === 1 ? '' : 's'}`;
          select.appendChild(option);
        }
      }
    });
  }

  function loadUsed() {
    try {
      const arr = JSON.parse(localStorage.getItem(USED_KEY) || '[]');
      return new Set(Array.isArray(arr) ? arr.filter(Boolean) : []);
    } catch {
      return new Set();
    }
  }

  function saveUsed(set) {
    try {
      localStorage.setItem(USED_KEY, JSON.stringify([...set].slice(-1000)));
    } catch {}
  }

  function sourceKey(item) {
    return String(item?.sourceUrl || item?.fileUrl || item?.title || '').trim();
  }

  function unique(items) {
    const seen = new Set();
    return (items || []).filter(item => {
      const key = sourceKey(item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function queryVariants(query) {
    const q = String(query || '').trim();
    const lower = q.toLowerCase();
    const variants = [q];

    if (/\blion/.test(lower)) variants.push('lion pride wildlife','african lion wildlife','lioness wildlife','panthera leo wildlife');
    else if (/\bmoose|alces/.test(lower)) variants.push('moose wildlife','alces alces nature','moose wetland wildlife');
    else if (/\btiger/.test(lower)) variants.push('tiger wildlife','panthera tigris wildlife','wild tiger nature');
    else if (/\belephant/.test(lower)) variants.push('elephant wildlife','african elephant safari','elephant herd nature');
    else if (/\bwolf|wolves/.test(lower)) variants.push('wolf wildlife','canis lupus nature','wolves wildlife');
    else if (/\bbear/.test(lower)) variants.push('bear wildlife','wild bear nature','ursus wildlife');
    else if (/\bkitten|cat/.test(lower)) variants.push('kitten playing','cute kittens','young cat playing');
    else if (/\bpuppy|dog/.test(lower)) variants.push('puppy playing','cute puppies','young dog playing');
    else variants.push('wild animals wildlife nature','wildlife animals nature','animal wildlife habitat','wild animals in nature');

    return [...new Set(variants.filter(Boolean))];
  }

  async function patchYouTubeTools() {
    if (patched.youtube || !window.ClipFreeYouTube) return;
    const originalSearch = window.ClipFreeYouTube.searchCommonsDownloadable;
    const originalUpload = window.ClipFreeYouTube.startFullAutoWithFile;
    if (typeof originalSearch !== 'function' || typeof originalUpload !== 'function') return;

    patched.youtube = true;

    // Build a larger UNIQUE source pool from several relevant Wikimedia searches.
    window.ClipFreeYouTube.searchCommonsDownloadable = async (query, limit = 20) => {
      const wanted = Math.max(24, Math.min(60, Number(limit) || 20));
      const used = loadUsed();
      const pool = [];

      for (const q of queryVariants(query)) {
        let results = [];
        try {
          results = await originalSearch(q, 20);
        } catch (err) {
          console.warn('Unique-source search skipped:', q, err);
          continue;
        }

        for (const item of unique(results)) {
          const key = sourceKey(item);
          if (!key || used.has(key)) continue;
          if (pool.some(x => sourceKey(x) === key)) continue;
          pool.push(item);
        }
        if (pool.length >= wanted) break;
      }

      return pool.slice(0, wanted);
    };

    // Never upload source footage that ClipFree already uploaded before.
    window.ClipFreeYouTube.startFullAutoWithFile = async (file, meta = {}) => {
      const used = loadUsed();
      const sources = Array.isArray(meta?.sources) ? meta.sources : [];
      const keys = sources.map(sourceKey).filter(Boolean);
      const repeat = keys.find(key => used.has(key));

      if (repeat) {
        throw new Error('Duplicate protection stopped this Short because its source footage was already uploaded. ClipFree will not intentionally post the same source again.');
      }

      let result;
      try {
        result = await originalUpload(file, meta);
      } catch (err) {
        window.ClipFreeConfirmedUploadState.lastError = err?.message || String(err);
        throw err;
      }

      if (!result?.id) {
        const err = new Error('YouTube did not return a video ID, so this Short is NOT counted as uploaded.');
        window.ClipFreeConfirmedUploadState.lastError = err.message;
        throw err;
      }

      const transferred = window.ClipFreeTransferredUploadState;
      if (!transferred.ids.includes(result.id)) {
        transferred.ids.push(result.id);
        transferred.total += 1;
      }

      for (const key of keys) used.add(key);
      saveUsed(used);
      return result;
    };

    console.info('ClipFree unique-source protection is active.');
  }

  ensureBatchOptions();
  const patchTimer = setInterval(() => {
    ensureBatchOptions();
    patchYouTubeTools().catch(console.warn);
    if (patched.youtube) clearInterval(patchTimer);
  }, 500);
  setTimeout(() => clearInterval(patchTimer), 30000);

  // Research-led UI: one SEO block, no duplicate controls.
  setTimeout(() => {
    document.body.classList.add('clipfree-simple-mode');

    const badge = document.querySelector('#clipfreeSimpleStudio .simple-badge');
    if (badge) badge.textContent = '1–20 SHORTS • ONE SCREEN • UNIQUE SOURCES';

    const head = document.querySelector('#clipfreeSimpleStudio .simple-head p');
    if (head) head.textContent =
      'Choose the topic, style, length, 1–20 Shorts and visibility once. ClipFree finds different reusable source footage, builds each 9:16 Short, applies researched YouTube SEO and uploads sequentially.';

    const box = document.querySelector('#clipfreeSimpleStudio .simple-seo-list');
    if (box) {
      box.innerHTML = '';
      [
        'Unique source footage',
        'Unique title',
        'Unique description',
        '1–2 main search phrases',
        '3 relevant hashtags',
        'Minimal relevant tags',
        '9:16 cover',
        'Captions',
        'Attribution',
        'Channel links'
      ].forEach(label => {
        const chip = document.createElement('span');
        chip.textContent = label;
        box.appendChild(chip);
      });
    }

    const note = document.querySelector('#clipfreeSimpleStudio .simple-note');
    if (note) note.textContent =
      'YouTube SEO research refreshed 29 Sep 2026. Official YouTube guidance says title, thumbnail and description are more important for discovery than tags, and Shorts Search also considers whether metadata matches the search plus whether viewers click and watch. Current wildlife keyword research shows strong interest in wildlife shorts, animal shorts and wildlife. ClipFree uses trend terms only when they match the actual animal/topic.';
  }, 800);

  function wrapText(ctx, text, maxWidth, maxLines = 3) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth) {
        line = test;
      } else {
        if (line) lines.push(line);
        line = word;
        if (lines.length >= maxLines - 1) break;
      }
    }
    if (line && lines.length < maxLines) lines.push(line);
    return lines;
  }

  // Better 9:16 cover so the text stays inside the mobile Shorts crop.
  async function makePortraitCover(detail) {
    const video = $('preview');
    if (!video?.videoWidth || !video?.videoHeight) return detail?.thumbnailBlob || null;

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const targetRatio = 1080 / 1920;
    const ratio = vw / vh;
    let sx = 0, sy = 0, sw = vw, sh = vh;

    if (ratio > targetRatio) {
      sw = vh * targetRatio;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / targetRatio;
      sy = (vh - sh) / 2;
    }

    ctx.filter = 'saturate(1.25) contrast(1.12) brightness(1.03)';
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 1080, 1920);
    ctx.filter = 'none';

    const gradient = ctx.createLinearGradient(0, 650, 0, 1760);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(.5, 'rgba(0,0,0,.25)');
    gradient.addColorStop(1, 'rgba(0,0,0,.88)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 600, 1080, 1160);

    // Central safe area only.
    ctx.fillStyle = 'rgba(7,7,9,.78)';
    ctx.strokeStyle = 'rgba(236,188,68,.85)';
    ctx.lineWidth = 3;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(74, 130, 500, 84, 22);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(74, 130, 500, 84);
      ctx.strokeRect(74, 130, 500, 84);
    }

    ctx.font = '900 31px Arial, sans-serif';
    ctx.fillStyle = '#f4ca62';
    ctx.textBaseline = 'middle';
    ctx.fillText('WILDLIFE ENCOUNTERS TV', 103, 172);

    let title = String(detail?.title || 'Wildlife Moment')
      .replace(/\s*#Shorts\b/ig, '')
      .replace(/\s*\|.*$/, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();

    if (title.length > 55) title = title.slice(0,55).replace(/\s+\S*$/, '') + '…';

    ctx.font = '900 78px Arial, sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,.92)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 4;

    const lines = wrapText(ctx, title, 880, 3);
    const startY = 1280 - ((lines.length - 1) * 98);
    lines.forEach((line, i) => {
      const y = startY + i * 102;
      ctx.lineWidth = 14;
      ctx.strokeStyle = 'rgba(0,0,0,.72)';
      ctx.strokeText(line, 92, y, 890);
      ctx.fillStyle = '#fff';
      ctx.fillText(line, 92, y, 890);
    });

    ctx.shadowBlur = 0;
    ctx.font = '800 34px Arial, sans-serif';
    ctx.fillStyle = '#f4ca62';
    ctx.fillText('WILDLIFE • NATURE • SHORTS', 92, 1655);

    return await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .92));
  }

  // This runs after the existing landscape thumbnail pass and replaces it with
  // a portrait-safe cover before youtube.js receives the final export event.
  window.addEventListener('clipfree-export-ready', event => {
    const detail = event.detail || {};
    if (window.CLIPFREE_GROWTH_ENGINE_ACTIVE) return;
    if (detail.__clipfreePortraitSafeReady || detail.kind !== 'animal-generator') return;

    event.stopImmediatePropagation();
    Promise.resolve()
      .then(() => makePortraitCover(detail))
      .then(blob => {
        if (blob) detail.thumbnailBlob = blob;
      })
      .catch(err => console.warn('Portrait cover fallback used', err))
      .finally(() => {
        detail.__clipfreePortraitSafeReady = true;
        if (window.ClipFreeExport === detail) window.ClipFreeExport.thumbnailBlob = detail.thumbnailBlob;
        window.dispatchEvent(new CustomEvent('clipfree-export-ready', { detail }));
      });
  }, true);
})();

/* CLIPFREE ACTUAL-ANIMAL TITLE + SEO FIX */
/*
  Final metadata safety pass:
  - Species is inferred from the ACTUAL Wikimedia source title/attribution.
  - A Lions preset can never label coyote/fox/wolf/etc footage as a lion.
  - Species-specific searches reject obviously mismatched source titles.
  - Title, first description lines, tags, hashtags, captions and cover all use
    the detected animal instead of the UI preset.
*/
(() => {
  const $ = id => document.getElementById(id);

  const ANIMALS = [
    { key:'mountain-lion', label:'Mountain Lion', emoji:'🐾', re:/\b(mountain lion|cougar|puma|panther)\b/i,
      tags:['mountain lion','cougar','wildlife','big cat','wild animals','nature'], hashes:['#MountainLion','#Wildlife','#Shorts'] },
    { key:'coyote', label:'Coyote', emoji:'🐺', re:/\b(coyote|canis latrans)\b/i,
      tags:['coyote','coyote wildlife','coyote shorts','wildlife','wild animals','nature'], hashes:['#Coyote','#Wildlife','#Shorts'] },
    { key:'wolf', label:'Wolf', emoji:'🐺', re:/\b(wolf|wolves|canis lupus)\b/i,
      tags:['wolf','wolf wildlife','wolves','wildlife','wild animals','nature'], hashes:['#Wolf','#Wildlife','#Shorts'] },
    { key:'fox', label:'Fox', emoji:'🦊', re:/\b(fox|vulpes)\b/i,
      tags:['fox','fox wildlife','wild fox','wildlife','wild animals','nature'], hashes:['#Fox','#Wildlife','#Shorts'] },
    { key:'lion', label:'Lion', emoji:'🦁', re:/\b(lion|lioness|lionesses|panthera leo)\b/i,
      tags:['lion','lion wildlife','lion shorts','big cats','wildlife','nature'], hashes:['#Lion','#Wildlife','#Shorts'] },
    { key:'tiger', label:'Tiger', emoji:'🐅', re:/\b(tiger|panthera tigris)\b/i,
      tags:['tiger','tiger wildlife','tiger shorts','big cats','wildlife','nature'], hashes:['#Tiger','#Wildlife','#Shorts'] },
    { key:'leopard', label:'Leopard', emoji:'🐆', re:/\b(leopard|panthera pardus)\b/i,
      tags:['leopard','leopard wildlife','big cats','wildlife','wild animals','nature'], hashes:['#Leopard','#Wildlife','#Shorts'] },
    { key:'cheetah', label:'Cheetah', emoji:'🐆', re:/\b(cheetah|acinonyx jubatus)\b/i,
      tags:['cheetah','cheetah wildlife','big cats','wildlife','wild animals','nature'], hashes:['#Cheetah','#Wildlife','#Shorts'] },
    { key:'moose', label:'Moose', emoji:'🫎', re:/\b(moose|alces alces)\b/i,
      tags:['moose','moose wildlife','moose shorts','wildlife','wild animals','nature'], hashes:['#Moose','#Wildlife','#Shorts'] },
    { key:'elk', label:'Elk', emoji:'🦌', re:/\b(elk|wapiti|cervus canadensis)\b/i,
      tags:['elk','elk wildlife','wildlife','wild animals','nature'], hashes:['#Elk','#Wildlife','#Shorts'] },
    { key:'deer', label:'Deer', emoji:'🦌', re:/\b(deer|doe|stag|buck)\b/i,
      tags:['deer','deer wildlife','wildlife','wild animals','nature'], hashes:['#Deer','#Wildlife','#Shorts'] },
    { key:'bear', label:'Bear', emoji:'🐻', re:/\b(bear|ursus|grizzly|black bear|polar bear)\b/i,
      tags:['bear','bear wildlife','wildlife','wild animals','nature'], hashes:['#Bear','#Wildlife','#Shorts'] },
    { key:'bison', label:'Bison', emoji:'🐃', re:/\b(bison|buffalo)\b/i,
      tags:['bison','bison wildlife','wildlife','wild animals','nature'], hashes:['#Bison','#Wildlife','#Shorts'] },
    { key:'elephant', label:'Elephant', emoji:'🐘', re:/\b(elephant|loxodonta|elephas)\b/i,
      tags:['elephant','elephant wildlife','wildlife','safari','wild animals','nature'], hashes:['#Elephant','#Wildlife','#Shorts'] },
    { key:'giraffe', label:'Giraffe', emoji:'🦒', re:/\b(giraffe|giraffa)\b/i,
      tags:['giraffe','giraffe wildlife','wildlife','safari','wild animals','nature'], hashes:['#Giraffe','#Wildlife','#Shorts'] },
    { key:'zebra', label:'Zebra', emoji:'🦓', re:/\b(zebra|equus quagga|equus zebra)\b/i,
      tags:['zebra','zebra wildlife','wildlife','safari','wild animals','nature'], hashes:['#Zebra','#Wildlife','#Shorts'] },
    { key:'hyena', label:'Hyena', emoji:'🐾', re:/\b(hyena|hyaena)\b/i,
      tags:['hyena','hyena wildlife','wildlife','wild animals','nature'], hashes:['#Hyena','#Wildlife','#Shorts'] },
    { key:'crocodile', label:'Crocodile', emoji:'🐊', re:/\b(crocodile|crocodylus)\b/i,
      tags:['crocodile','crocodile wildlife','wildlife','reptiles','wild animals','nature'], hashes:['#Crocodile','#Wildlife','#Shorts'] },
    { key:'alligator', label:'Alligator', emoji:'🐊', re:/\b(alligator)\b/i,
      tags:['alligator','alligator wildlife','wildlife','reptiles','wild animals','nature'], hashes:['#Alligator','#Wildlife','#Shorts'] },
    { key:'eagle', label:'Eagle', emoji:'🦅', re:/\b(eagle|bald eagle|golden eagle)\b/i,
      tags:['eagle','eagle wildlife','wildlife','birds','wild animals','nature'], hashes:['#Eagle','#Wildlife','#Shorts'] },
    { key:'owl', label:'Owl', emoji:'🦉', re:/\b(owl|owls)\b/i,
      tags:['owl','owl wildlife','wildlife','birds','wild animals','nature'], hashes:['#Owl','#Wildlife','#Shorts'] },
    { key:'shark', label:'Shark', emoji:'🦈', re:/\b(shark|sharks)\b/i,
      tags:['shark','shark wildlife','marine life','ocean wildlife','wild animals','nature'], hashes:['#Shark','#Wildlife','#Shorts'] },
    { key:'whale', label:'Whale', emoji:'🐋', re:/\b(whale|whales)\b/i,
      tags:['whale','whale wildlife','marine life','ocean wildlife','wild animals','nature'], hashes:['#Whale','#Wildlife','#Shorts'] },
    { key:'dolphin', label:'Dolphin', emoji:'🐬', re:/\b(dolphin|dolphins)\b/i,
      tags:['dolphin','dolphin wildlife','marine life','ocean wildlife','wild animals','nature'], hashes:['#Dolphin','#Wildlife','#Shorts'] },
    { key:'seal', label:'Seal', emoji:'🦭', re:/\b(seal|seals|sea lion)\b/i,
      tags:['seal','seal wildlife','marine life','ocean wildlife','wild animals','nature'], hashes:['#Seal','#Wildlife','#Shorts'] },
    { key:'turtle', label:'Turtle', emoji:'🐢', re:/\b(turtle|tortoise)\b/i,
      tags:['turtle','turtle wildlife','wildlife','reptiles','wild animals','nature'], hashes:['#Turtle','#Wildlife','#Shorts'] },
    { key:'snake', label:'Snake', emoji:'🐍', re:/\b(snake|serpent|python|cobra|rattlesnake)\b/i,
      tags:['snake','snake wildlife','wildlife','reptiles','wild animals','nature'], hashes:['#Snake','#Wildlife','#Shorts'] },
    { key:'raccoon', label:'Raccoon', emoji:'🦝', re:/\b(raccoon|procyon lotor)\b/i,
      tags:['raccoon','raccoon wildlife','wildlife','wild animals','nature'], hashes:['#Raccoon','#Wildlife','#Shorts'] },
    { key:'rabbit', label:'Rabbit', emoji:'🐇', re:/\b(rabbit|hare|cottontail)\b/i,
      tags:['rabbit','rabbit wildlife','wildlife','wild animals','nature'], hashes:['#Rabbit','#Wildlife','#Shorts'] },
    { key:'fish', label:'Wild Fish', emoji:'🐟', re:/\b(fish|trout|salmon|minnow|pikeminnow|bass)\b/i,
      tags:['wild fish','fish wildlife','aquatic wildlife','wildlife','nature'], hashes:['#Fish','#Wildlife','#Shorts'] }
  ];

  const TITLE_VARIANTS = [
    'Caught on Camera',
    'In the Wild',
    'Up Close',
    'Wildlife Encounter',
    'Natural Behavior',
    'In Its Natural Habitat',
    'Wildlife Moment',
    'Nature Encounter'
  ];

  function sourceText(detail) {
    const sources = Array.isArray(detail?.sources) ? detail.sources : [];
    return sources.map(s => `${s?.title || ''} ${s?.creator || ''} ${s?.sourceUrl || ''}`).join(' ');
  }

  function detectAnimal(text) {
    const value = String(text || '');
    return ANIMALS.find(a => a.re.test(value)) || null;
  }

  function expectedAnimalFromQuery(query) {
    const value = String(query || '');
    return ANIMALS.find(a => a.re.test(value)) || null;
  }

  function cleanSourceTitle(value) {
    return String(value || '')
      .replace(/\.[a-z0-9]{2,5}$/i, '')
      .replace(/[_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\(\d{6,}\)/g, '')
      .trim();
  }

  function channelLinks() {
    const raw = document.querySelector('#channelSnapshot .channel-title p')?.textContent?.trim() || '';
    let base = '';
    if (/^@/.test(raw)) base = `https://www.youtube.com/${raw}`;
    else if (/^UC[A-Za-z0-9_-]{20,}$/.test(raw)) base = `https://www.youtube.com/channel/${raw}`;
    return base ? {
      base,
      shorts: `${base}/shorts`,
      subscribe: `${base}?sub_confirmation=1`
    } : null;
  }

  function buildAccurateTitle(animal, detail) {
    const i = Math.max(0, Number(detail?.batchIndex || 0)) % TITLE_VARIANTS.length;
    const variant = TITLE_VARIANTS[i];
    return `${animal.label} ${variant} ${animal.emoji} | Wildlife Short #Shorts`.slice(0, 100);
  }

  function buildAccurateDescription(animal, detail) {
    const links = channelLinks();
    const sourceTitle = cleanSourceTitle(detail?.sources?.[0]?.title || '');
    const firstLine = `${animal.label} wildlife footage captured in a real animal moment.`;
    const secondLine = `Watch this ${animal.label.toLowerCase()} in its environment and discover more wildlife Shorts from Wildlife Encounters TV.`;

    const parts = [
      firstLine,
      secondLine
    ];

    if (sourceTitle) parts.push(`Source clip: ${sourceTitle}.`);

    if (links) {
      parts.push(
        `More wildlife Shorts: ${links.shorts}`,
        `Subscribe: ${links.subscribe}`
      );
    }

    parts.push(animal.hashes.join(' '));

    if (detail?.attribution) {
      parts.push(`Source / attribution:\n${detail.attribution}`);
    }

    return parts.join('\n\n').slice(0, 5000);
  }

  function buildAccurateStory(animal) {
    return `${animal.label}s are part of the natural world around us. This Short focuses on the actual ${animal.label.toLowerCase()} shown in the source footage, with clear wildlife context rather than unrelated animal labels.`;
  }

  function buildAccurateCaptions(animal) {
    return [
      `${animal.label} ${animal.emoji}`,
      `${animal.label} in the wild`,
      'Real wildlife footage',
      'Wildlife worth protecting'
    ];
  }

  function syncFields(detail) {
    if ($('uploadTitle')) $('uploadTitle').value = detail.title || '';
    if ($('uploadDescription')) $('uploadDescription').value = detail.description || '';
    if ($('uploadTags')) $('uploadTags').value = detail.tags || '';
    if ($('seoTitle')) $('seoTitle').value = detail.title || '';
    if ($('seoDescription')) $('seoDescription').value = detail.description || '';
    if ($('seoTags')) $('seoTags').value = detail.tags || '';
    if ($('seoHashtags')) $('seoHashtags').value = detail.hashtags || '';
  }

  // Filter species-specific searches so "lion wildlife" cannot silently return
  // a coyote/fish/etc and then get uploaded as a lion.
  function patchSearchFilter() {
    const yt = window.ClipFreeYouTube;
    if (!yt || yt.__clipfreeSpeciesFilter || typeof yt.searchCommonsDownloadable !== 'function') return false;

    const original = yt.searchCommonsDownloadable.bind(yt);
    yt.searchCommonsDownloadable = async (query, limit = 20) => {
      const results = await original(query, limit);
      const expected = expectedAnimalFromQuery(query);

      if (!expected) return results;

      const filtered = (results || []).filter(item => {
        const actual = detectAnimal(`${item?.title || ''} ${item?.attribution || ''}`);
        return actual?.key === expected.key;
      });

      // Accuracy first: return fewer correct sources instead of unrelated animals.
      return filtered;
    };
    yt.__clipfreeSpeciesFilter = true;
    return true;
  }

  const patchTimer = setInterval(() => {
    if (patchSearchFilter()) clearInterval(patchTimer);
  }, 400);
  setTimeout(() => clearInterval(patchTimer), 30000);

  function wrapText(ctx, text, maxWidth, maxLines = 3) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth) line = test;
      else {
        if (line) lines.push(line);
        line = word;
        if (lines.length >= maxLines - 1) break;
      }
    }
    if (line && lines.length < maxLines) lines.push(line);
    return lines;
  }

  async function makeAccurateCover(detail, animal) {
    const video = $('preview');
    if (!video?.videoWidth || !video?.videoHeight) return detail?.thumbnailBlob || null;

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');

    const vw = video.videoWidth, vh = video.videoHeight;
    const target = 1080 / 1920;
    const ratio = vw / vh;
    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (ratio > target) { sw = vh * target; sx = (vw - sw) / 2; }
    else { sh = vw / target; sy = (vh - sh) / 2; }

    ctx.filter = 'saturate(1.28) contrast(1.14) brightness(1.04)';
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 1080, 1920);
    ctx.filter = 'none';

    const shade = ctx.createLinearGradient(0, 760, 0, 1760);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(.52, 'rgba(0,0,0,.28)');
    shade.addColorStop(1, 'rgba(0,0,0,.88)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 650, 1080, 1110);

    ctx.font = '900 84px Arial, sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,.94)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 4;

    const headline = `${animal.label.toUpperCase()} ${animal.emoji}`;
    const lines = wrapText(ctx, headline, 860, 2);
    const y0 = 1280 - ((lines.length - 1) * 105);
    lines.forEach((line, i) => {
      const y = y0 + i * 108;
      ctx.lineWidth = 15;
      ctx.strokeStyle = 'rgba(0,0,0,.76)';
      ctx.strokeText(line, 95, y, 880);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(line, 95, y, 880);
    });

    ctx.shadowBlur = 0;
    ctx.font = '900 36px Arial, sans-serif';
    ctx.fillStyle = '#f2c65c';
    ctx.fillText('WILDLIFE ENCOUNTERS TV', 96, 1580);

    ctx.font = '800 30px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('REAL WILDLIFE • SHORTS', 96, 1640);

    return await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .93));
  }

  // Final metadata pass. It intentionally ignores the UI preset if the actual
  // source file identifies a different animal.
  window.addEventListener('clipfree-export-ready', event => {
    const detail = event.detail || {};
    if (window.CLIPFREE_GROWTH_ENGINE_ACTIVE) return;
    if (detail.__clipfreeActualAnimalReady || detail.kind !== 'animal-generator') return;

    const actual = detectAnimal(sourceText(detail));
    if (!actual) {
      // If the source title is too vague to identify the animal, never pretend it is a lion.
      detail.title = `Wildlife Moment Caught on Camera | Wildlife Short #Shorts`;
      detail.description = [
        'A real wildlife moment captured from reusable source footage.',
        'The source metadata did not identify the animal clearly enough for ClipFree to make a species claim.',
        '#Wildlife #Animals #Shorts',
        detail?.attribution ? `Source / attribution:\n${detail.attribution}` : ''
      ].filter(Boolean).join('\n\n').slice(0,5000);
      detail.tags = 'wildlife, wildlife shorts, animal shorts, wild animals, nature';
      detail.hashtags = '#Wildlife #Animals #Shorts';
      detail.story = 'A real wildlife moment shown without guessing the species.';
      detail.captions = ['Wildlife moment', 'Real animal footage', 'Nature up close', 'Wildlife worth protecting'];
      detail.searchTopic = 'wildlife shorts';
      detail.__clipfreeActualAnimalReady = true;
      syncFields(detail);
      if (window.ClipFreeExport === detail) Object.assign(window.ClipFreeExport, detail);
      return;
    }

    event.stopImmediatePropagation();

    detail.title = buildAccurateTitle(actual, detail);
    detail.description = buildAccurateDescription(actual, detail);
    detail.tags = actual.tags.join(', ');
    detail.hashtags = actual.hashes.join(' ');
    detail.story = buildAccurateStory(actual);
    detail.captions = buildAccurateCaptions(actual);
    detail.searchTopic = `${actual.label.toLowerCase()} wildlife`;
    detail.detectedAnimal = actual.label;

    syncFields(detail);

    Promise.resolve(makeAccurateCover(detail, actual))
      .then(blob => { if (blob) detail.thumbnailBlob = blob; })
      .catch(err => console.warn('Accurate animal cover fallback used', err))
      .finally(() => {
        detail.__clipfreeActualAnimalReady = true;
        if (window.ClipFreeExport === detail) Object.assign(window.ClipFreeExport, detail);
        window.dispatchEvent(new CustomEvent('clipfree-export-ready', { detail }));
      });
  }, true);

  setTimeout(() => {
    const note = document.querySelector('#clipfreeSimpleStudio .simple-note');
    if (note) note.textContent =
      'Title safety is ON: ClipFree now identifies the animal from the actual Wikimedia source metadata before upload. If the source says Coyote, the title/description/hashtags/captions say Coyote — never Lion. If the animal cannot be identified confidently from source metadata, ClipFree uses a generic Wildlife title instead of guessing.';
  }, 900);
})();

/* CLIPFREE STRICT PUBLIC-DOMAIN + HIGHEST-RELEVANT-KEYWORDS */
/*
  Strict rights mode:
  - Wikimedia Commons: accept ONLY Public Domain / CC0
  - Internet Archive: accept ONLY items whose metadata says Public Domain / CC0
  - No Pexels/Pixabay in this mode because those are free-licensed, not copyright-free.
  - ClipFree adds no watermark.
  - Source-embedded logos/marks cannot be guaranteed absent from metadata alone.

  SEO research snapshot: 28–29 Sep 2026.
  High-volume relevant terms are used only when the actual animal/video supports them.
*/
(() => {
  const $ = id => document.getElementById(id);

  const HIGH_VOLUME = {
    broad: [
      'animals',          // ~1.89M est. monthly searches
      'wildlife',         // ~672K
      'animal facts',     // ~499K - only when educational narration/captions are present
      'wild animals',     // ~492K
      'wildlife documentary', // ~447K - only documentary style
      'animal shorts',    // ~225K
      'wildlife shorts'   // ~47.6K, strong recent growth
    ],
    species: {
      tiger: ['tiger','wildlife','wild animals','wildlife documentary','animal shorts','wildlife shorts','big cats'],
      lion: ['lion','wildlife','wild animals','wildlife documentary','animal shorts','wildlife shorts','big cats'],
      coyote: ['coyote','wildlife','wild animals','animal shorts','wildlife shorts','animals'],
      moose: ['moose','wildlife','wild animals','animal shorts','wildlife shorts','animals'],
      wolf: ['wolf','wildlife','wild animals','animal shorts','wildlife shorts','animals'],
      fox: ['fox','wildlife','wild animals','animal shorts','wildlife shorts','animals'],
      bear: ['bear','wildlife','wild animals','animal shorts','wildlife shorts','animals'],
      elephant: ['elephant','wildlife','wild animals','wildlife documentary','animal shorts','wildlife shorts'],
      giraffe: ['giraffe','wildlife','wild animals','wildlife documentary','animal shorts','wildlife shorts'],
      zebra: ['zebra','wildlife','wild animals','wildlife documentary','animal shorts','wildlife shorts'],
      crocodile: ['crocodile','wildlife','wild animals','animal shorts','wildlife shorts','animals'],
      shark: ['shark','wildlife','animals','animal shorts','wildlife shorts','ocean wildlife'],
      eagle: ['eagle','wildlife','wild animals','animal shorts','wildlife shorts','animals'],
      'mountain lion': ['mountain lion','wildlife','wild animals','big cats','animal shorts','wildlife shorts'],
      leopard: ['leopard','wildlife','wild animals','big cats','animal shorts','wildlife shorts'],
      cheetah: ['cheetah','wildlife','wild animals','big cats','animal shorts','wildlife shorts']
    }
  };

  function normalizeAnimal(value='') {
    const s = String(value).toLowerCase();
    if (/mountain lion|cougar|puma/.test(s)) return 'mountain lion';
    const keys = Object.keys(HIGH_VOLUME.species);
    return keys.find(k => new RegExp(`\\b${k.replace(' ','\\s+')}\\b`,'i').test(s)) || '';
  }

  function actualAnimal(detail) {
    const source = (detail?.sources || []).map(x => `${x?.title || ''} ${x?.sourceUrl || ''}`).join(' ');
    return normalizeAnimal(`${detail?.detectedAnimal || ''} ${source}`);
  }

  function hashtagsFor(animal) {
    const speciesHash = animal ? '#' + animal.replace(/\s+/g,'') .replace(/\b\w/g, c => c.toUpperCase()) : '#Animals';
    return [speciesHash, '#Wildlife', '#Shorts'];
  }

  function strongestTags(animal, detail) {
    const base = HIGH_VOLUME.species[animal] || ['animals','wildlife','wild animals','animal shorts','wildlife shorts'];
    const style = String($('simpleStyle')?.value || $('animalStyle')?.value || '').toLowerCase();
    const educational = /documentary|calm/.test(style) || Array.isArray(detail?.captions);
    const tags = [...base];

    if (educational && !tags.includes('animal facts')) tags.splice(2, 0, 'animal facts');
    if (style === 'documentary' && !tags.includes('wildlife documentary')) tags.splice(2, 0, 'wildlife documentary');

    // Keep only the strongest accurate terms. No stuffing.
    return [...new Set(tags)].slice(0, 8);
  }

  function strongestTitle(animal, detail) {
    const pretty = animal ? animal.replace(/\b\w/g, c => c.toUpperCase()) : 'Wild Animal';
    const variants = [
      'Caught on Camera',
      'Up Close',
      'In the Wild',
      'Natural Behavior',
      'Wildlife Encounter',
      'Wildlife Moment',
      'In Its Natural Habitat',
      'Nature Encounter'
    ];
    const i = Math.max(0, Number(detail?.batchIndex || 0)) % variants.length;
    return `${pretty} ${variants[i]} | Wildlife #Shorts`.slice(0, 100);
  }

  function strongestDescription(animal, detail, tags, hashes) {
    const pretty = animal ? animal.replace(/\b\w/g, c => c.toUpperCase()) : 'Wild animal';
    const first = `${pretty} wildlife footage in a real animal moment.`;
    const second = `Watch more wildlife, wild animals and animal Shorts from Wildlife Encounters TV.`;
    const third = tags.includes('animal facts')
      ? `Educational wildlife context and animal facts are included with the Short.`
      : '';

    const old = String(detail?.description || '');
    const idx = old.search(/Source\s*\/?\s*attribution:/i);
    const attribution = idx >= 0 ? old.slice(idx) : (detail?.attribution ? `Source / attribution:\n${detail.attribution}` : '');

    return [first, second, third, hashes.join(' '), attribution].filter(Boolean).join('\n\n').slice(0,5000);
  }

  // Final high-volume SEO pass, after the actual-animal detector.
  window.addEventListener('clipfree-export-ready', event => {
    const detail = event.detail || {};
    if (window.CLIPFREE_GROWTH_ENGINE_ACTIVE) return;
    if (detail.__clipfreeHighestKeywordReady || detail.kind !== 'animal-generator') return;

    const animal = actualAnimal(detail);
    const tags = strongestTags(animal, detail);
    const hashes = hashtagsFor(animal);

    detail.title = strongestTitle(animal, detail);
    detail.tags = tags.join(', ');
    detail.hashtags = hashes.join(' ');
    detail.description = strongestDescription(animal, detail, tags, hashes);
    detail.__clipfreeHighestKeywordReady = true;

    if ($('uploadTitle')) $('uploadTitle').value = detail.title;
    if ($('uploadDescription')) $('uploadDescription').value = detail.description;
    if ($('uploadTags')) $('uploadTags').value = detail.tags;
    if ($('seoTitle')) $('seoTitle').value = detail.title;
    if ($('seoDescription')) $('seoDescription').value = detail.description;
    if ($('seoTags')) $('seoTags').value = detail.tags;
    if ($('seoHashtags')) $('seoHashtags').value = detail.hashtags;
    if (window.ClipFreeExport === detail) Object.assign(window.ClipFreeExport, detail);
  }, false);

  function publicDomainOrCC0(item) {
    const license = String(item?.license || item?.licenseUrl || '').toLowerCase();
    return license.includes('public domain') ||
      license.includes('cc0') ||
      license.includes('zero/1.0') ||
      license.includes('publicdomain/mark');
  }

  function keyOf(item) {
    return String(item?.sourceUrl || item?.fileUrl || item?.title || '').trim().toLowerCase();
  }

  function uniq(items) {
    const seen = new Set();
    return (items || []).filter(x => {
      const k = keyOf(x);
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  function encodeArchiveQuery(query) {
    const q = String(query || '').trim().replace(/"/g,'');
    // Strict copyright-free filter only.
    return `mediatype:movies AND (${q}) AND (licenseurl:http*zero* OR licenseurl:http*publicdomain*)`;
  }

  async function archiveSearch(query, limit = 20) {
    const url = new URL('https://archive.org/advancedsearch.php');
    url.searchParams.set('q', encodeArchiveQuery(query));
    ['identifier','title','creator','licenseurl','collection'].forEach(f => url.searchParams.append('fl[]', f));
    url.searchParams.set('rows', String(Math.max(10, Math.min(100, Number(limit) * 3))));
    url.searchParams.set('page', '1');
    url.searchParams.set('output', 'json');

    const res = await fetch(url.toString(), { cache:'no-store' });
    if (!res.ok) throw new Error(`Internet Archive search failed (${res.status}).`);
    const data = await res.json();
    const docs = data?.response?.docs || [];
    const out = [];

    // Inspect metadata only until we have enough downloadable PD/CC0 video files.
    for (const doc of docs.slice(0, 30)) {
      if (out.length >= limit) break;

      const lic = String(doc.licenseurl || '').toLowerCase();
      if (!(lic.includes('zero') || lic.includes('publicdomain'))) continue;

      try {
        const metaRes = await fetch(`https://archive.org/metadata/${encodeURIComponent(doc.identifier)}`, { cache:'no-store' });
        if (!metaRes.ok) continue;
        const meta = await metaRes.json();
        const metadata = meta?.metadata || {};
        const metaLic = String(metadata.licenseurl || doc.licenseurl || '').toLowerCase();
        if (!(metaLic.includes('zero') || metaLic.includes('publicdomain'))) continue;

        const files = (meta?.files || []).filter(f => {
          const name = String(f?.name || '');
          const format = String(f?.format || '').toLowerCase();
          const source = String(f?.source || '').toLowerCase();
          const extOk = /\.(mp4|webm|ogv)$/i.test(name);
          const videoFmt = /mpeg4|h\.?264|webm|ogg video/.test(format);
          const derivativeOk = source === 'original' || source === 'derivative' || !source;
          const size = Number(f?.size || 0);
          return derivativeOk && (extOk || videoFmt) && (!size || size <= 80 * 1024 * 1024);
        });

        const file = files.sort((a,b) => Number(a.size || 0) - Number(b.size || 0))[0];
        if (!file?.name) continue;

        const title = String(metadata.title || doc.title || query || 'Public domain wildlife video');
        const creator = String(metadata.creator || doc.creator || 'Internet Archive contributor');
        const sourceUrl = `https://archive.org/details/${doc.identifier}`;
        const fileUrl = `https://archive.org/download/${encodeURIComponent(doc.identifier)}/${file.name.split('/').map(encodeURIComponent).join('/')}`;

        out.push({
          title,
          creator,
          license: metaLic.includes('zero') ? 'CC0 / Public Domain Dedication' : 'Public Domain',
          licenseUrl: metadata.licenseurl || doc.licenseurl || '',
          sourceUrl,
          fileUrl,
          mime: /\.webm$/i.test(file.name) ? 'video/webm' : /\.ogv$/i.test(file.name) ? 'video/ogg' : 'video/mp4',
          size: Number(file.size || 0),
          provider:'Internet Archive',
          attribution:`“${title}” — ${creator}. Source: Internet Archive. Rights: ${metaLic.includes('zero') ? 'CC0 / Public Domain Dedication' : 'Public Domain'}. ${sourceUrl}`
        });
      } catch (err) {
        console.warn('Archive metadata item skipped', doc.identifier, err);
      }
    }

    return uniq(out);
  }

  function patchStrictSources() {
    const yt = window.ClipFreeYouTube;
    if (!yt || yt.__clipfreeStrictPD || typeof yt.searchCommonsDownloadable !== 'function') return false;

    const original = yt.searchCommonsDownloadable.bind(yt);

    yt.searchCommonsDownloadable = async (query, limit = 20) => {
      const wanted = Math.max(1, Math.min(40, Number(limit) || 20));

      const [commonsResult, archiveResult] = await Promise.allSettled([
        original(query, Math.min(20, wanted)),
        archiveSearch(query, Math.min(20, wanted))
      ]);

      // Wikimedia's old search allows CC BY too, so enforce PD/CC0 here.
      const commons = commonsResult.status === 'fulfilled'
        ? (commonsResult.value || []).filter(publicDomainOrCC0)
        : [];
      const archive = archiveResult.status === 'fulfilled' ? archiveResult.value : [];

      return uniq([...commons, ...archive]).slice(0, wanted);
    };

    yt.__clipfreeStrictPD = true;
    return true;
  }

  const timer = setInterval(() => {
    if (patchStrictSources()) clearInterval(timer);
  }, 500);
  setTimeout(() => clearInterval(timer), 30000);

  setTimeout(() => {
    const box = document.querySelector('#clipfreeSimpleStudio .simple-seo-list');
    if (box) {
      box.innerHTML = '';
      [
        'Highest relevant keywords only',
        'Actual animal first',
        '8 max tags',
        '3 hashtags',
        'Public Domain / CC0 only',
        'Wikimedia + Internet Archive',
        'No ClipFree watermark',
        'Duplicate protection'
      ].forEach(label => {
        const chip = document.createElement('span');
        chip.textContent = label;
        box.appendChild(chip);
      });
    }

    const note = document.querySelector('#clipfreeSimpleStudio .simple-note');
    if (note) note.textContent =
      'STRICT RIGHTS MODE: ClipFree now accepts only source media marked Public Domain or CC0 from Wikimedia Commons and Internet Archive. It does not use Pexels/Pixabay in this mode because those are free-licensed but still copyrighted. SEO uses only the highest-volume relevant terms that accurately match the animal/video.';
  }, 900);
})();

/* CLIPFREE GROWTH ENGINE FINAL */
/*
  Goal: one clean workflow that makes up to 20 materially different wildlife Shorts.
  Final-pass rules:
  1) use unused Public Domain / CC0 source footage only
  2) identify the ACTUAL animal from source metadata
  3) derive action + habitat from source text where possible
  4) create an original educational hook/story/captions
  5) generate an accurate unique title + concise SEO description
  6) use only high-demand RELEVANT keywords
  7) keep all cover text inside the vertical safe area
  8) remember recent title/source combinations to avoid repeats
*/
(() => {
  const $ = id => document.getElementById(id);
  window.CLIPFREE_GROWTH_ENGINE_ACTIVE = true;

  const TITLE_HISTORY_KEY = 'clipfree_title_history_v4';
  const CONTENT_HISTORY_KEY = 'clipfree_content_history_v4';

  const SPECIES = [
    {
      key:'mountain lion', label:'Mountain Lion', emoji:'🐾',
      re:/\b(mountain lion|cougar|puma|puma concolor)\b/i,
      facts:[
        'Mountain lions are powerful ambush predators built for short bursts of speed.',
        'They use large home ranges and are usually solitary.'
      ],
      keywords:['mountain lion','wildlife','wild animals','big cats','animal shorts','wildlife shorts']
    },
    {
      key:'coyote', label:'Coyote', emoji:'🐺',
      re:/\b(coyote|canis latrans)\b/i,
      facts:[
        'Coyotes are highly adaptable canids found across much of North America.',
        'They communicate with howls, yips and body language.'
      ],
      keywords:['coyote','wildlife','wild animals','animals','animal shorts','wildlife shorts']
    },
    {
      key:'wolf', label:'Wolf', emoji:'🐺',
      re:/\b(wolf|wolves|canis lupus)\b/i,
      facts:[
        'Wolves are social canids that often live and hunt in family groups.',
        'Scent, posture and vocalizations help wolves communicate across distance.'
      ],
      keywords:['wolf','wildlife','wild animals','animals','animal shorts','wildlife shorts']
    },
    {
      key:'fox', label:'Fox', emoji:'🦊',
      re:/\b(fox|vulpes)\b/i,
      facts:[
        'Foxes rely on sharp hearing and smell to find food.',
        'Many fox species are most active around dawn, dusk or at night.'
      ],
      keywords:['fox','wildlife','wild animals','animals','animal shorts','wildlife shorts']
    },
    {
      key:'lion', label:'Lion', emoji:'🦁',
      re:/\b(lion|lioness|lionesses|panthera leo)\b/i,
      facts:[
        'Lions are the most social of the big cats and often live in prides.',
        'A lion pride can coordinate resting, territory defence and hunting.'
      ],
      keywords:['lion','wildlife','wild animals','big cats','animal shorts','wildlife shorts']
    },
    {
      key:'tiger', label:'Tiger', emoji:'🐅',
      re:/\b(tiger|panthera tigris)\b/i,
      facts:[
        'Tigers are solitary big cats and strong swimmers.',
        'Their stripe patterns are unique to each individual.'
      ],
      keywords:['tiger','wildlife','wild animals','big cats','animal shorts','wildlife shorts']
    },
    {
      key:'leopard', label:'Leopard', emoji:'🐆',
      re:/\b(leopard|panthera pardus)\b/i,
      facts:[
        'Leopards are powerful climbers that can carry prey into trees.',
        'Their spotted coats help them blend into many different habitats.'
      ],
      keywords:['leopard','wildlife','wild animals','big cats','animal shorts','wildlife shorts']
    },
    {
      key:'cheetah', label:'Cheetah', emoji:'🐆',
      re:/\b(cheetah|acinonyx jubatus)\b/i,
      facts:[
        'Cheetahs are built for rapid acceleration over short distances.',
        'Their long tails help with balance during high-speed turns.'
      ],
      keywords:['cheetah','wildlife','wild animals','big cats','animal shorts','wildlife shorts']
    },
    {
      key:'moose', label:'Moose', emoji:'🫎',
      re:/\b(moose|alces alces)\b/i,
      facts:[
        'Moose are the largest members of the deer family.',
        'They are strong swimmers and often feed on aquatic plants.'
      ],
      keywords:['moose','wildlife','wild animals','animals','animal shorts','wildlife shorts']
    },
    {
      key:'elk', label:'Elk', emoji:'🦌',
      re:/\b(elk|wapiti|cervus canadensis)\b/i,
      facts:[
        'Elk are large members of the deer family that often form herds.',
        'Male elk use loud bugling calls during the breeding season.'
      ],
      keywords:['elk','wildlife','wild animals','animals','animal shorts','wildlife shorts']
    },
    {
      key:'deer', label:'Deer', emoji:'🦌',
      re:/\b(deer|doe|stag|buck)\b/i,
      facts:[
        'Deer rely on excellent hearing and smell to detect danger.',
        'Many deer species are most active around dawn and dusk.'
      ],
      keywords:['deer','wildlife','wild animals','animals','animal shorts','wildlife shorts']
    },
    {
      key:'bear', label:'Bear', emoji:'🐻',
      re:/\b(bear|ursus|grizzly|black bear|polar bear)\b/i,
      facts:[
        'Bears have an exceptional sense of smell.',
        'Bear diets vary widely by species, habitat and season.'
      ],
      keywords:['bear','wildlife','wild animals','animals','animal shorts','wildlife shorts']
    },
    {
      key:'elephant', label:'Elephant', emoji:'🐘',
      re:/\b(elephant|loxodonta|elephas)\b/i,
      facts:[
        'Elephants use low-frequency calls that can travel long distances.',
        'Elephant herds have complex social relationships and strong family bonds.'
      ],
      keywords:['elephant','wildlife','wild animals','animals','wildlife documentary','animal shorts','wildlife shorts']
    },
    {
      key:'giraffe', label:'Giraffe', emoji:'🦒',
      re:/\b(giraffe|giraffa)\b/i,
      facts:[
        'Giraffes use their long necks to browse leaves high above the ground.',
        'Their patterned coats help break up their outline in woodland and savanna.'
      ],
      keywords:['giraffe','wildlife','wild animals','animals','wildlife documentary','animal shorts','wildlife shorts']
    },
    {
      key:'zebra', label:'Zebra', emoji:'🦓',
      re:/\b(zebra|equus quagga|equus zebra)\b/i,
      facts:[
        'Every zebra has a unique stripe pattern.',
        'Zebras often stay in groups that can help individuals detect predators.'
      ],
      keywords:['zebra','wildlife','wild animals','animals','wildlife documentary','animal shorts','wildlife shorts']
    },
    {
      key:'bison', label:'Bison', emoji:'🐃',
      re:/\b(bison|buffalo)\b/i,
      facts:[
        'Bison are massive grazing mammals adapted to open grasslands.',
        'Their thick shoulder muscles help power their large heads and forequarters.'
      ],
      keywords:['bison','wildlife','wild animals','animals','animal shorts','wildlife shorts']
    },
    {
      key:'hyena', label:'Hyena', emoji:'🐾',
      re:/\b(hyena|hyaena)\b/i,
      facts:[
        'Spotted hyenas live in complex social groups called clans.',
        'Hyenas have powerful jaws and communicate with many different calls.'
      ],
      keywords:['hyena','wildlife','wild animals','animals','animal shorts','wildlife shorts']
    },
    {
      key:'crocodile', label:'Crocodile', emoji:'🐊',
      re:/\b(crocodile|crocodylus)\b/i,
      facts:[
        'Crocodiles are ambush predators that can remain very still in water.',
        'Their eyes and nostrils sit high on the head, helping them watch while mostly submerged.'
      ],
      keywords:['crocodile','wildlife','wild animals','animals','animal shorts','wildlife shorts']
    },
    {
      key:'alligator', label:'Alligator', emoji:'🐊',
      re:/\b(alligator)\b/i,
      facts:[
        'Alligators spend much of their time in freshwater wetlands.',
        'They regulate body temperature by moving between sun, shade and water.'
      ],
      keywords:['alligator','wildlife','wild animals','animals','animal shorts','wildlife shorts']
    },
    {
      key:'eagle', label:'Eagle', emoji:'🦅',
      re:/\b(eagle|bald eagle|golden eagle)\b/i,
      facts:[
        'Eagles have excellent long-distance vision.',
        'Their broad wings help them soar efficiently while searching for food.'
      ],
      keywords:['eagle','wildlife','wild animals','animals','birds','animal shorts','wildlife shorts']
    },
    {
      key:'owl', label:'Owl', emoji:'🦉',
      re:/\b(owl|owls)\b/i,
      facts:[
        'Many owls have specialized feathers that reduce flight noise.',
        'Forward-facing eyes give owls strong depth perception.'
      ],
      keywords:['owl','wildlife','wild animals','animals','birds','animal shorts','wildlife shorts']
    },
    {
      key:'shark', label:'Shark', emoji:'🦈',
      re:/\b(shark|sharks)\b/i,
      facts:[
        'Sharks use several senses to detect movement and prey in the ocean.',
        'Different shark species occupy habitats from coastal shallows to the open sea.'
      ],
      keywords:['shark','animals','wildlife','ocean wildlife','marine life','animal shorts','wildlife shorts']
    },
    {
      key:'whale', label:'Whale', emoji:'🐋',
      re:/\b(whale|whales)\b/i,
      facts:[
        'Whales are air-breathing mammals that must surface regularly.',
        'Many whale species use sound to communicate across large distances.'
      ],
      keywords:['whale','animals','wildlife','ocean wildlife','marine life','animal shorts','wildlife shorts']
    },
    {
      key:'dolphin', label:'Dolphin', emoji:'🐬',
      re:/\b(dolphin|dolphins)\b/i,
      facts:[
        'Dolphins are social marine mammals with sophisticated communication.',
        'Many species use echolocation to navigate and find prey.'
      ],
      keywords:['dolphin','animals','wildlife','ocean wildlife','marine life','animal shorts','wildlife shorts']
    },
    {
      key:'seal', label:'Seal', emoji:'🦭',
      re:/\b(seal|seals|sea lion)\b/i,
      facts:[
        'Seals are streamlined marine mammals adapted for efficient swimming.',
        'They haul out on land or ice to rest, breed or care for young.'
      ],
      keywords:['seal','animals','wildlife','ocean wildlife','marine life','animal shorts','wildlife shorts']
    }
  ];

  const ACTIONS = [
    ['drinking',/\b(drink|drinking|waterhole|watering|water hole)\b/i],
    ['roaming',/\b(roam|roaming|wandering)\b/i],
    ['walking',/\b(walk|walking)\b/i],
    ['running',/\b(run|running|sprinting)\b/i],
    ['swimming',/\b(swim|swimming)\b/i],
    ['feeding',/\b(feed|feeding|eating|grazing|browsing)\b/i],
    ['resting',/\b(rest|resting|sleeping|relaxing)\b/i],
    ['playing',/\b(play|playing)\b/i],
    ['crossing',/\b(cross|crossing)\b/i],
    ['climbing',/\b(climb|climbing)\b/i],
    ['flying',/\b(fly|flying|soaring)\b/i],
    ['hunting',/\b(hunt|hunting|stalking)\b/i],
    ['calling',/\b(call|calling|howl|howling|roar|roaring)\b/i]
  ];

  const HABITATS = [
    ['African Savanna',/\b(savanna|savannah)\b/i],
    ['Wetland',/\b(wetland|marsh|swamp)\b/i],
    ['Forest',/\b(forest|woodland|woods)\b/i],
    ['Desert',/\b(desert|arid)\b/i],
    ['Grassland',/\b(grassland|prairie|steppe)\b/i],
    ['River',/\b(river|stream)\b/i],
    ['Lake',/\b(lake)\b/i],
    ['Ocean',/\b(ocean|sea|marine)\b/i],
    ['Mountain Habitat',/\b(mountain|alpine)\b/i],
    ['Coast',/\b(coast|coastal|shore|beach)\b/i],
    ['Arctic',/\b(arctic|ice|tundra)\b/i]
  ];

  function loadJson(key, fallback=[]) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function sourceText(detail) {
    return (detail?.sources || []).map(s =>
      `${s?.title || ''} ${s?.creator || ''} ${s?.sourceUrl || ''} ${s?.license || ''}`
    ).join(' ');
  }

  function detectSpecies(detail) {
    const text = `${detail?.detectedAnimal || ''} ${sourceText(detail)}`;
    return SPECIES.find(s => s.re.test(text)) || null;
  }

  function detectAction(text) {
    return ACTIONS.find(([,re]) => re.test(text))?.[0] || '';
  }

  function detectHabitat(text) {
    return HABITATS.find(([,re]) => re.test(text))?.[0] || '';
  }

  function titleHistory() {
    const arr = loadJson(TITLE_HISTORY_KEY, []);
    return Array.isArray(arr) ? arr : [];
  }

  function rememberTitle(title) {
    const arr = titleHistory().filter(x => x !== title);
    arr.unshift(title);
    saveJson(TITLE_HISTORY_KEY, arr.slice(0, 300));
  }

  function contentHistory() {
    const arr = loadJson(CONTENT_HISTORY_KEY, []);
    return Array.isArray(arr) ? arr : [];
  }

  function rememberContent(detail, title) {
    const first = detail?.sources?.[0] || {};
    const item = {
      source:String(first.sourceUrl || first.fileUrl || first.title || ''),
      title:String(title || ''),
      at:Date.now()
    };
    const arr = contentHistory().filter(x => x.source !== item.source && x.title !== item.title);
    arr.unshift(item);
    saveJson(CONTENT_HISTORY_KEY, arr.slice(0, 1000));
  }

  function makeTitle(species, action, habitat, detail) {
    const channelTitles = window.ClipFreeYouTube?.getKnownVideoTitles?.() || [];
    const used = new Set([
      ...titleHistory(),
      ...channelTitles
    ].map(x => String(x).trim().toLowerCase()).filter(Boolean));

    const label = species?.label || 'Wild Animal';
    const emoji = species?.emoji || '🌿';
    const capAction = action ? action[0].toUpperCase()+action.slice(1) : '';
    const place = habitat ? `the ${habitat}` : 'the wild';

    const candidates = [];
    if (action && habitat) candidates.push(
      `${label} ${capAction} in ${place} ${emoji} #Shorts`,
      `Watch This ${label} ${capAction} in ${place} ${emoji} #Shorts`,
      `${label} ${capAction}: A Wild Moment in ${place} ${emoji} #Shorts`
    );
    if (action) candidates.push(
      `${label} ${capAction} in the Wild ${emoji} #Shorts`,
      `Wild ${label} ${capAction} Caught on Camera ${emoji} #Shorts`
    );
    if (habitat) candidates.push(
      `Wild ${label} in ${place} ${emoji} #Shorts`,
      `${label} Exploring ${place} ${emoji} #Shorts`,
      `A ${label} Moment From ${place} ${emoji} #Shorts`
    );

    candidates.push(
      `Wild ${label} Up Close ${emoji} #Shorts`,
      `${label} Caught on Camera ${emoji} #Shorts`,
      `${label} Natural Behavior in the Wild ${emoji} #Shorts`,
      `${label} Wildlife Encounter ${emoji} #Shorts`,
      `${label} in Its Natural Habitat ${emoji} #Shorts`,
      `A Closer Look at Wild ${label} ${emoji} #Shorts`,
      `Incredible ${label} Wildlife Moment ${emoji} #Shorts`,
      `Watch a Wild ${label} in Action ${emoji} #Shorts`,
      `${label} Roaming Free in Nature ${emoji} #Shorts`,
      `Real ${label} Behavior in Nature ${emoji} #Shorts`,
      `${label} Encounter in the Wild ${emoji} #Shorts`,
      `This ${label} Moment Was Caught in the Wild ${emoji} #Shorts`,
      `Wildlife Close-Up: ${label} ${emoji} #Shorts`,
      `${label} Living Wild ${emoji} #Shorts`,
      `Nature in Action: ${label} ${emoji} #Shorts`,
      `A Rare Look at a Wild ${label} ${emoji} #Shorts`,
      `${label} in the Wild — Natural Behavior ${emoji} #Shorts`,
      `Amazing ${label} Moment From Nature ${emoji} #Shorts`,
      `Wild ${label} Seen Up Close ${emoji} #Shorts`,
      `${label} Wildlife Footage You Have to See ${emoji} #Shorts`
    );

    const uniqueCandidates=[...new Set(candidates.map(x=>x.slice(0,100)))];
    const index = Math.max(0, Number(detail?.batchIndex || 0));
    const rotated = [...uniqueCandidates.slice(index % uniqueCandidates.length), ...uniqueCandidates.slice(0, index % uniqueCandidates.length)];
    const chosen = rotated.find(t => !used.has(t.toLowerCase()));

    if(chosen) return chosen;

    // Last-resort collision breaker. It stays descriptive instead of repeating an old title.
    const suffix = String((Date.now() + index) % 100000).padStart(5,'0');
    return `${label} Wildlife Encounter ${emoji} #Shorts ${suffix}`.slice(0,100);
  }

  function accurateHashtags(species) {
    const speciesTag = species
      ? '#' + species.label.replace(/[^A-Za-z0-9]/g,'')
      : '#Animals';
    return [speciesTag, '#Wildlife', '#Shorts'];
  }

  function accurateTags(species, style) {
    const tags = species?.keywords?.length
      ? [...species.keywords]
      : ['animals','wildlife','wild animals','animal shorts','wildlife shorts'];

    if (style === 'documentary' && !tags.includes('wildlife documentary')) {
      tags.splice(Math.min(3,tags.length),0,'wildlife documentary');
    }

    if (species?.facts?.length && !tags.includes('animal facts')) {
      tags.splice(Math.min(3,tags.length),0,'animal facts');
    }

    return [...new Set(tags)].slice(0,8);
  }

  function channelLinks() {
    const raw = document.querySelector('#channelSnapshot .channel-title p')?.textContent?.trim() || '';
    let base = '';
    if (/^@/.test(raw)) base = `https://www.youtube.com/${raw}`;
    else if (/^UC[A-Za-z0-9_-]{20,}$/.test(raw)) base = `https://www.youtube.com/channel/${raw}`;
    if (!base) return [];

    return [
      `More wildlife Shorts: ${base}/shorts`,
      `Subscribe: ${base}?sub_confirmation=1`
    ];
  }

  function makeDescription(species, action, habitat, detail, tags, hashes) {
    const label = species?.label || 'Wild animal';
    const verb = action ? ` ${action}` : '';
    const place = habitat ? ` in the ${habitat}` : ' in its natural environment';

    const intro = `${label}${verb}${place} in a real wildlife moment.`;
    const educational = species?.facts?.length
      ? `Quick wildlife fact: ${species.facts[0]}`
      : 'Watch this real wildlife moment and observe the animal’s natural behavior.';

    const sourceTitle = String(detail?.sources?.[0]?.title || '')
      .replace(/\.[a-z0-9]{2,5}$/i,'')
      .replace(/[_]+/g,' ')
      .replace(/\s+/g,' ')
      .trim();

    const old = String(detail?.description || '');
    const attrIndex = old.search(/Source\s*\/?\s*attribution:/i);
    const attribution = attrIndex >= 0
      ? old.slice(attrIndex)
      : (detail?.attribution ? `Source / attribution:\n${detail.attribution}` : '');

    return [
      intro,
      educational,
      `More ${label.toLowerCase()} videos, wildlife, wild animals and animal Shorts from Wildlife Encounters TV.`,
      sourceTitle ? `Source clip: ${sourceTitle}.` : '',
      ...channelLinks(),
      hashes.join(' '),
      attribution
    ].filter(Boolean).join('\n\n').slice(0,5000);
  }

  function makeStory(species, action, habitat) {
    const label = species?.label || 'wild animal';
    const fact1 = species?.facts?.[0] || 'Wild animals adapt their behavior to the conditions around them.';
    const fact2 = species?.facts?.[1] || 'Observing wildlife from a distance helps protect both animals and people.';
    const place = habitat ? ` in the ${habitat}` : '';
    const behavior = action ? ` while ${action}` : '';

    return `${label}${behavior}${place}. ${fact1} ${fact2}`;
  }

  function makeCaptions(species, action, habitat) {
    const label = species?.label || 'Wild animal';
    const emoji = species?.emoji || '🌿';
    const lines = [
      `${label} ${emoji}`,
      action ? `${action[0].toUpperCase()+action.slice(1)} in the wild` : 'A real wildlife moment',
      species?.facts?.[0] || 'Observe the animal’s natural behavior',
      species?.facts?.[1] || 'Wildlife worth protecting'
    ];

    if (habitat) lines[1] = `${lines[1]} • ${habitat}`;
    return lines;
  }

  function syncFields(detail) {
    if ($('uploadTitle')) $('uploadTitle').value = detail.title || '';
    if ($('uploadDescription')) $('uploadDescription').value = detail.description || '';
    if ($('uploadTags')) $('uploadTags').value = detail.tags || '';
    if ($('seoTitle')) $('seoTitle').value = detail.title || '';
    if ($('seoDescription')) $('seoDescription').value = detail.description || '';
    if ($('seoTags')) $('seoTags').value = detail.tags || '';
    if ($('seoHashtags')) $('seoHashtags').value = detail.hashtags || '';
  }

  async function makeCover(detail, species, action) {
    const video = $('preview');
    if (!video?.videoWidth || !video?.videoHeight) return detail?.thumbnailBlob || null;

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const target = 1080/1920;
    const ratio = vw/vh;
    let sx=0, sy=0, sw=vw, sh=vh;
    if (ratio > target) {
      sw = vh*target;
      sx = (vw-sw)/2;
    } else {
      sh = vw/target;
      sy = (vh-sh)/2;
    }

    ctx.filter = 'saturate(1.22) contrast(1.12) brightness(1.04)';
    ctx.drawImage(video,sx,sy,sw,sh,0,0,1080,1920);
    ctx.filter = 'none';

    const g = ctx.createLinearGradient(0,650,0,1740);
    g.addColorStop(0,'rgba(0,0,0,0)');
    g.addColorStop(.48,'rgba(0,0,0,.18)');
    g.addColorStop(1,'rgba(0,0,0,.88)');
    ctx.fillStyle=g;
    ctx.fillRect(0,620,1080,1120);

    // Keep all copy well away from Shorts UI/crop edges.
    const label=(species?.label || 'Wildlife').toUpperCase();
    const sub=(action ? action.toUpperCase() : 'WILDLIFE MOMENT');

    ctx.textBaseline='alphabetic';
    ctx.shadowColor='rgba(0,0,0,.95)';
    ctx.shadowBlur=18;
    ctx.shadowOffsetY=4;

    ctx.font='900 82px Arial, sans-serif';
    ctx.lineWidth=14;
    ctx.strokeStyle='rgba(0,0,0,.76)';
    ctx.fillStyle='#fff';
    ctx.strokeText(label,90,1330,890);
    ctx.fillText(label,90,1330,890);

    ctx.shadowBlur=0;
    ctx.font='900 38px Arial, sans-serif';
    ctx.fillStyle='#f2c65c';
    ctx.fillText(sub,92,1415,890);

    ctx.font='800 30px Arial, sans-serif';
    ctx.fillStyle='#fff';
    ctx.fillText('WILDLIFE ENCOUNTERS TV',92,1600,890);

    return await new Promise(resolve => canvas.toBlob(resolve,'image/jpeg',.93));
  }

  // Make sure the one-screen selector really contains every number 1–20.
  function ensureTwenty() {
    const simple = $('simpleCount');
    if (simple) {
      for (let n=1;n<=20;n++) {
        if (![...simple.options].some(o => Number(o.value)===n)) {
          const opt=document.createElement('option');
          opt.value=String(n);
          opt.textContent=`${n} Short${n===1?'':'s'}`;
          simple.appendChild(opt);
        }
      }
    }
    ['animalBatchCount','autoBatchCount','wizardBatchCount'].forEach(id => {
      const select=$(id);
      if (!select) return;
      for (let n=1;n<=20;n++) {
        if (![...select.options].some(o => Number(o.value)===n)) {
          const opt=document.createElement('option');
          opt.value=String(n);
          opt.textContent=`${n} Short${n===1?'':'s'}`;
          select.appendChild(opt);
        }
      }
    });
  }

  ensureTwenty();
  setTimeout(ensureTwenty,500);

  // FINAL metadata/content pass. This fires after the earlier actual-species pass
  // and before youtube.js sees the final redispatched export.
  window.addEventListener('clipfree-export-ready', event => {
    const detail=event.detail || {};
    if (detail.__clipfreeGrowthFinalReady || detail.kind!=='animal-generator') return;

    // Final Growth Engine owns species detection/SEO/cover generation.
    event.stopImmediatePropagation();

    const species=detectSpecies(detail);

    if (window.CLIPFREE_COMPLIANCE_RECORDING_MODE && !species) {
      detail.__clipfreeGrowthFinalReady = false;
      const msg = 'Compliance safety stopped this Short: the source metadata does not identify an animal clearly enough. ClipFree will search again instead of uploading unrelated footage.';
      const status = $('animalGeneratorStatus') || $('simpleStatus');
      if (status) {
        status.textContent = msg;
        status.className = 'notice bad';
      }
      console.error(msg, detail?.sources || []);
      return;
    }

    const text=sourceText(detail);
    const action=detectAction(text);
    const habitat=detectHabitat(text);
    const style=String($('simpleStyle')?.value || $('animalStyle')?.value || '').toLowerCase();

    const tags=accurateTags(species,style);
    const hashes=accurateHashtags(species);
    const title=makeTitle(species,action,habitat,detail);

    detail.title=title;
    detail.tags=tags.join(', ');
    detail.hashtags=hashes.join(' ');
    detail.description=makeDescription(species,action,habitat,detail,tags,hashes);
    detail.story=makeStory(species,action,habitat);
    detail.captions=makeCaptions(species,action,habitat);
    detail.searchTopic=species ? `${species.label.toLowerCase()} wildlife` : 'wildlife';
    detail.detectedAnimal=species?.label || detail.detectedAnimal || 'Wildlife';

    syncFields(detail);

    Promise.resolve(makeCover(detail,species,action))
      .then(blob => { if (blob) detail.thumbnailBlob=blob; })
      .catch(err => console.warn('Growth cover fallback used',err))
      .finally(() => {
        detail.__clipfreeGrowthFinalReady=true;
        rememberTitle(title);
        rememberContent(detail,title);
        if (window.ClipFreeExport===detail) Object.assign(window.ClipFreeExport,detail);
        window.dispatchEvent(new CustomEvent('clipfree-export-ready',{detail}));
      });
  }, true);

  // Make the single visible screen explain exactly what happens.
  setTimeout(() => {
    const badge=document.querySelector('#clipfreeSimpleStudio .simple-badge');
    if (badge) badge.textContent='MAX MODE • 1–20 UNIQUE WILDLIFE SHORTS';

    const p=document.querySelector('#clipfreeSimpleStudio .simple-head p');
    if (p) p.textContent=
      'Choose the topic, style, length, amount and visibility once. ClipFree finds unused Public Domain/CC0 footage, identifies the real animal, rejects repeated sources, builds a unique SEO package and 9:16 cover, uploads one at a time, then waits for YouTube processing confirmation before counting a Short as successful.';

    const box=document.querySelector('#clipfreeSimpleStudio .simple-seo-list');
    if (box) {
      box.innerHTML='';
      [
        'Unused PD/CC0 source',
        'Actual animal detection',
        'Original hook + facts',
        'Unique title',
        'Accurate description',
        'Highest relevant keywords',
        '8 max tags',
        '3 hashtags',
        '9:16 safe cover',
        'Captions',
        'Attribution',
        'Source + file fingerprint duplicate protection'
      ].forEach(label => {
        const chip=document.createElement('span');
        chip.textContent=label;
        box.appendChild(chip);
      });
    }

    const note=document.querySelector('#clipfreeSimpleStudio .simple-note');
    if (note) note.textContent=
      'Growth Mode copies the STRUCTURE of your successful wildlife Shorts, not the same footage. It now checks source URLs AND a SHA-256 fingerprint of the downloaded source file before upload, and it avoids titles already used in ClipFree or loaded from your connected YouTube channel. SEO stays accurate to the actual animal/video.';
  },900);
})();


/* CLIPFREE CONFIRMED-UPLOAD UI NOTE */
(() => {
  setTimeout(() => {
    const note = document.querySelector('#clipfreeSimpleStudio .simple-note');
    if (note) {
      note.textContent =
        'The progress counter now counts ONLY uploads that return a real YouTube video ID. If YouTube rejects an upload, ClipFree stops and shows the real error instead of saying it was uploaded. Google OAuth is verified. YouTube Data API compliance is a separate review; while that review is pending, YouTube may still force API uploads to Private.';
    }
  }, 1000);
})();

/* CLIPFREE FINAL SINGLE-SCREEN CLEANUP */
(() => {
  const $ = id => document.getElementById(id);

  // The old sections stay in the DOM only as hidden engine plumbing.
  // The user sees ONE workflow, not duplicate wizards/cards/buttons.
  const style = document.createElement('style');
  style.id = 'clipfreeFinalSingleScreenCss';
  style.textContent = `
    body.clipfree-simple-mode main > section:not(#clipfreeSimpleStudio){display:none!important}
    body.clipfree-simple-mode #clipfreeSimpleStudio{display:block!important}
    body.clipfree-simple-mode #setup{display:none!important}
    body.clipfree-simple-mode footer{display:none!important}
    body.clipfree-simple-mode .topbar nav{display:none!important}
    #clipfree20AnimalCard,#clipfree20Hero,.clipfree20-card,.simple-advanced{display:none!important}
    #clipfreeSimpleStudio .simple-card{max-width:820px;margin:0 auto}
  `;
  document.head.appendChild(style);

  function removeDuplicateVisibleUi() {
    document.querySelectorAll('#clipfree20AnimalCard,#clipfree20Hero,.clipfree20-card').forEach(el => el.remove());

    // Keep exactly one SEO chip of each label.
    const box = document.querySelector('#clipfreeSimpleStudio .simple-seo-list');
    if (box) {
      const labels = [
        'Different source every Short',
        'Skips sources already on your channel',
        'Actual animal detection',
        'Unique title',
        'Accurate description',
        'Highest relevant keywords',
        '8 max tags',
        '3 hashtags',
        '9:16 safe cover',
        'Captions',
        'PD/CC0 attribution'
      ];
      box.innerHTML = '';
      labels.forEach(label => {
        const chip = document.createElement('span');
        chip.textContent = label;
        box.appendChild(chip);
      });
    }

    const advanced = $('simpleAdvanced');
    if (advanced) advanced.remove();

    const head = document.querySelector('#clipfreeSimpleStudio .simple-head p');
    if (head) head.textContent =
      'Choose the topic, style, length, amount and visibility once. “Different animals” rotates through a large wildlife source vault, skips anything already used on your channel, creates one unique Short per source, adds accurate SEO and uploads sequentially.';

    const note = document.querySelector('#clipfreeSimpleStudio .simple-note');
    if (note) note.textContent =
      'Source Vault searches large Public Domain/CC0 repositories using a rotating wildlife query bank. It does not download thousands at once; it keeps searching new unused sources over time and permanently skips source URLs already found in your YouTube descriptions or ClipFree history.';
  }

  removeDuplicateVisibleUi();
  setTimeout(removeDuplicateVisibleUi, 700);
  setTimeout(removeDuplicateVisibleUi, 2200);

  // Older patches can recreate legacy cards after load. Remove them immediately.
  const observer = new MutationObserver(() => {
    document.querySelectorAll('#clipfree20AnimalCard,#clipfree20Hero,.clipfree20-card').forEach(el => el.remove());
  });
  observer.observe(document.documentElement, {subtree:true, childList:true});
})();
