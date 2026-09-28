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
  rights?.addEventListener('change', () => {
    const official = $('autoUploadCertification');
    if (official) official.checked = Boolean(rights.checked);
  });

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

    if (!rights?.checked && requested > NATIVE_BATCH_MAX) {
      alert('Tick the rights / Community Guidelines confirmation in the 20 Stunning Shorts card first.');
      document.querySelector('#clipfree20AnimalCard')?.scrollIntoView({behavior:'smooth',block:'center'});
      return;
    }

    const officialRights = $('autoUploadCertification');
    if (officialRights && rights?.checked) officialRights.checked = true;

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

        setBulkStatus(`Round ${i + 1}/${chunks.length}: creating ${chunk} Short${chunk === 1 ? '' : 's'} (${bulk.completed}/${requested} complete)…`, bulk.completed);

        bulk.internalClick = true;
        try {
          button.click();
        } finally {
          bulk.internalClick = false;
        }

        await waitForCycle(button, kind);
        bulk.completed = Math.min(requested, bulk.completed + chunk);
        setBulkStatus(`${bulk.completed}/${requested} Shorts finished. Preparing the next round…`, bulk.completed, 'good');
        await sleep(1000);
      }

      setBulkStatus(`All ${requested} Shorts finished ❤️ Check YouTube Studio for their final visibility/status.`, requested, 'good');
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
    if (rights) rights.checked = Boolean($('autoUploadCertification')?.checked);
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
