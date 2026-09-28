/* ClipFree AI — FAST + SAFE upload reliability patch
   Version 2.1 — 29 September 2026

   Goals:
   - keep the existing fast animal-Short upload path
   - validate a rendered MP4 before sending it to YouTube
   - automatically fall back to the normal safe re-encode if the MP4 is unhealthy
   - stop same-looking finished footage being uploaded twice in a batch
   - automatically search for a different PD/CC0 source when a visual duplicate is detected
   - guarantee a different final title when an existing/batch title collides
*/
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const PATCH_FLAG = '__clipfreeFastSafeUploadV21';
  const TITLE_HISTORY_KEY = 'clipfree_final_upload_title_history_v21';
  const TITLE_CURSOR_KEY = 'clipfree_final_upload_title_cursor_v21';
  const VISUAL_HISTORY_KEY = 'clipfree_visual_fingerprint_history_v21';
  const REJECTED_SOURCE_KEY = 'clipfree_visual_rejected_sources_v21';

  const sessionVisuals = [];
  const sessionSources = new Set();

  function setStatus(message) {
    const el = $('animalGeneratorStatus') || $('simpleStatus') || $('youtubeUploadStatus');
    if (el) el.textContent = message;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function loadJson(key, fallback = []) {
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

  function srtTime(seconds) {
    const total = Math.max(0, Math.round((Number(seconds) || 0) * 1000));
    const h = Math.floor(total / 3600000);
    const m = Math.floor((total % 3600000) / 60000);
    const s = Math.floor((total % 60000) / 1000);
    const ms = total % 1000;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms).padStart(3,'0')}`;
  }

  function captionsToSrt(captions, duration) {
    const lines = Array.isArray(captions)
      ? captions.map(x => String(x || '').trim()).filter(Boolean)
      : [];
    if (!lines.length) return '';

    const total = Math.max(1, Number(duration) || 60);
    const step = total / lines.length;
    return lines.map((text, i) => {
      const start = i * step;
      const end = Math.max(start + 0.25, Math.min(total, (i + 1) * step));
      return `${i + 1}\n${srtTime(start)} --> ${srtTime(end)}\n${text}\n`;
    }).join('\n');
  }

  async function mp4HeaderLooksValid(file) {
    if (!file?.slice) return false;
    const type = String(file.type || '').toLowerCase();
    if (type && !type.includes('mp4')) return true;

    try {
      const buf = await file.slice(0, 128).arrayBuffer();
      const bytes = new Uint8Array(buf);
      let ascii = '';
      for (const byte of bytes) ascii += String.fromCharCode(byte);
      return ascii.includes('ftyp');
    } catch {
      return false;
    }
  }

  async function getVideoMetadata(file, timeoutMs = 9000) {
    return new Promise(resolve => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      let done = false;
      let timer = null;

      const finish = result => {
        if (done) return;
        done = true;
        if (timer) clearTimeout(timer);
        video.onloadedmetadata = null;
        video.onerror = null;
        video.removeAttribute('src');
        try { video.load(); } catch {}
        URL.revokeObjectURL(url);
        resolve(result);
      };

      timer = setTimeout(
        () => finish({ ok:false, reason:'video metadata timed out' }),
        timeoutMs
      );

      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.onloadedmetadata = () => {
        const duration = Number(video.duration || 0);
        const width = Number(video.videoWidth || 0);
        const height = Number(video.videoHeight || 0);
        if (!Number.isFinite(duration) || duration < 2 || width < 2 || height < 2) {
          finish({ ok:false, reason:'video metadata is incomplete' });
          return;
        }
        finish({ ok:true, duration, width, height });
      };
      video.onerror = () => finish({
        ok:false,
        reason:'browser could not decode the rendered video'
      });
      video.src = url;
    });
  }

  async function inspectRenderedVideo(file) {
    if (!file || Number(file.size || 0) < 64 * 1024) {
      return { ok:false, reason:'rendered video is empty or too small' };
    }

    if (!(await mp4HeaderLooksValid(file))) {
      return { ok:false, reason:'MP4 header is invalid' };
    }

    const meta = await getVideoMetadata(file);
    if (!meta.ok) return meta;

    return { ok:true, ...meta };
  }

  async function waitForEvent(target, eventName, timeoutMs) {
    return new Promise((resolve, reject) => {
      let timer = null;
      const done = event => {
        cleanup();
        resolve(event);
      };
      const cleanup = () => {
        target.removeEventListener(eventName, done);
        if (timer) clearTimeout(timer);
      };
      target.addEventListener(eventName, done, { once:true });
      timer = setTimeout(() => {
        cleanup();
        reject(new Error(`${eventName} timed out`));
      }, timeoutMs);
    });
  }

  async function sampleFrame(video, time, canvas, ctx) {
    const safe = Math.max(0, Math.min(
      Math.max(0, Number(video.duration || 0) - 0.15),
      Number(time || 0)
    ));

    if (Math.abs(video.currentTime - safe) > 0.05) {
      video.currentTime = safe;
      try {
        await waitForEvent(video, 'seeked', 4500);
      } catch {}
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let out = '';

    for (let i = 0; i < rgba.length; i += 4) {
      const gray = (rgba[i] * 0.299) + (rgba[i + 1] * 0.587) + (rgba[i + 2] * 0.114);
      const nibble = Math.max(0, Math.min(15, Math.round(gray / 17)));
      out += nibble.toString(16);
    }
    return out;
  }

  async function visualFingerprint(file, timeoutMs = 12000) {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 9;
    const ctx = canvas.getContext('2d', { willReadFrequently:true });
    let timer = null;

    try {
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.src = url;

      await Promise.race([
        waitForEvent(video, 'loadedmetadata', timeoutMs),
        waitForEvent(video, 'error', timeoutMs).then(() => {
          throw new Error('video decode failed');
        })
      ]);

      const duration = Number(video.duration || 0);
      if (!Number.isFinite(duration) || duration < 2) return '';

      const a = await sampleFrame(video, Math.max(0.3, duration * 0.22), canvas, ctx);
      const b = await sampleFrame(video, Math.max(0.6, duration * 0.68), canvas, ctx);
      return `${a}${b}`;
    } catch (err) {
      console.warn('Visual fingerprint skipped', err);
      return '';
    } finally {
      if (timer) clearTimeout(timer);
      video.removeAttribute('src');
      try { video.load(); } catch {}
      URL.revokeObjectURL(url);
    }
  }

  function fingerprintDistance(a, b) {
    if (!a || !b || a.length !== b.length) return Infinity;
    let total = 0;
    for (let i = 0; i < a.length; i++) {
      total += Math.abs(parseInt(a[i], 16) - parseInt(b[i], 16));
    }
    return total / a.length;
  }

  function looksDuplicateFingerprint(fp) {
    if (!fp) return false;
    const saved = loadJson(VISUAL_HISTORY_KEY, []);
    const candidates = [...sessionVisuals, ...(Array.isArray(saved) ? saved : [])];
    return candidates.some(old => fingerprintDistance(fp, old) <= 0.72);
  }

  function rememberFingerprint(fp) {
    if (!fp) return;
    sessionVisuals.push(fp);
    if (sessionVisuals.length > 30) sessionVisuals.shift();

    const saved = loadJson(VISUAL_HISTORY_KEY, []);
    const next = [fp, ...(Array.isArray(saved) ? saved : []).filter(x => x !== fp)].slice(0, 300);
    saveJson(VISUAL_HISTORY_KEY, next);
  }

  function sourceKeysFromMeta(meta = {}) {
    const sources = Array.isArray(meta.sources) ? meta.sources : [];
    return sources.flatMap(item => [
      item?.sourceUrl,
      item?.fileUrl,
      item?.title
    ]).map(x => String(x || '').trim()).filter(Boolean);
  }

  function rejectedSourceSet() {
    return new Set(loadJson(REJECTED_SOURCE_KEY, []).map(x => String(x || '').trim()).filter(Boolean));
  }

  function rejectSources(meta = {}) {
    const set = rejectedSourceSet();
    for (const key of sourceKeysFromMeta(meta)) set.add(key);
    saveJson(REJECTED_SOURCE_KEY, [...set].slice(-2000));
  }

  function sourceItemKeys(item = {}) {
    return [
      item.fileUrl,
      item.sourceUrl,
      item.title
    ].map(x => String(x || '').trim()).filter(Boolean);
  }

  async function downloadReplacement(item, index = 0) {
    if (!item?.fileUrl) throw new Error('Replacement source has no downloadable video file.');
    const response = await fetch(item.fileUrl, { mode:'cors', cache:'no-store' });
    if (!response.ok) throw new Error(`Replacement source download failed (${response.status}).`);
    const blob = await response.blob();
    if (blob.size < 64 * 1024) throw new Error('Replacement source was too small.');
    if (blob.size > 45 * 1024 * 1024) throw new Error('Replacement source was too large for reliable phone processing.');

    const raw = String(item.title || `replacement-${index}`);
    const ext =
      raw.match(/\.([a-z0-9]{2,5})$/i)?.[1] ||
      (String(item.mime || blob.type).includes('mp4') ? 'mp4' :
       String(item.mime || blob.type).includes('ogg') ? 'ogv' : 'webm');

    return new File(
      [blob],
      `clipfree_replacement_${Date.now()}_${index}.${ext}`,
      { type:item.mime || blob.type || 'video/webm' }
    );
  }

  async function findReplacement(meta = {}, excluded = new Set()) {
    const yt = window.ClipFreeYouTube;
    if (!yt?.searchCommonsDownloadable) return null;

    const rejected = rejectedSourceSet();
    const label = String(meta.detectedAnimal || meta.presetLabel || '').trim();
    const searchTopic = String(meta.searchTopic || '').trim();

    const queries = [
      searchTopic,
      label ? `${label} wildlife nature` : '',
      label ? `${label} natural habitat` : '',
      'wildlife animal nature public domain',
      'wild animals natural habitat'
    ].filter(Boolean);

    for (const query of queries) {
      let results = [];
      try {
        results = await yt.searchCommonsDownloadable(query, 20);
      } catch (err) {
        console.warn('Replacement search skipped', query, err);
      }

      for (const item of results || []) {
        const keys = sourceItemKeys(item);
        if (!keys.length) continue;
        if (keys.some(k => excluded.has(k) || rejected.has(k) || sessionSources.has(k))) continue;
        return item;
      }
    }

    return null;
  }

  function buildReplacementMeta(meta = {}, item) {
    const source = {
      title:item?.title || 'Wildlife source',
      creator:item?.creator || '',
      license:item?.license || '',
      sourceUrl:item?.sourceUrl || '',
      fileUrl:item?.fileUrl || ''
    };

    const attribution = item?.attribution ||
      `“${source.title}” — ${source.creator || 'source contributor'}. ${source.sourceUrl || ''}`;

    return {
      ...meta,
      sources:[source],
      attribution,
      title: meta.title || source.title,
      searchTopic: meta.searchTopic || `${source.title} wildlife`,
      __clipfreeReplacementSource:true
    };
  }

  async function makeDifferentMontage(meta, excluded) {
    const automation = window.ClipFreeAutomation;
    if (!automation?.createMontageFromFiles) return null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const item = await findReplacement(meta, excluded);
      if (!item) return null;

      for (const key of sourceItemKeys(item)) excluded.add(key);

      try {
        setStatus(`Duplicate-looking footage blocked. Finding a different source (${attempt + 1}/5)…`);
        const replacementFile = await downloadReplacement(item, attempt);
        const montage = await automation.createMontageFromFiles([replacementFile], {
          duration: Math.max(12, Number(meta.targetDuration || $('animalDuration')?.value || 60)),
          filename:`clipfree-different-source-${Date.now()}-${attempt + 1}.mp4`
        });

        const health = await inspectRenderedVideo(montage);
        if (!health.ok) continue;

        const fp = await visualFingerprint(montage);
        if (fp && looksDuplicateFingerprint(fp)) {
          for (const key of sourceItemKeys(item)) {
            sessionSources.add(key);
          }
          continue;
        }

        return {
          file:montage,
          meta:buildReplacementMeta(meta, item),
          fp,
          item
        };
      } catch (err) {
        console.warn('Different-source replacement failed', err);
      }
    }

    return null;
  }

  function cleanTitle(value = '') {
    return String(value || '')
      .replace(/\s*#Shorts\b/ig, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function animalLabel(detail = {}) {
    const explicit = String(detail.detectedAnimal || detail.source?.detectedAnimal || '').trim();
    if (explicit && !/^wildlife$/i.test(explicit)) return explicit;

    const text = [
      detail.title,
      detail.source?.title,
      detail.source?.searchTopic,
      ...(Array.isArray(detail.source?.sources) ? detail.source.sources.map(x => x?.title || '') : []),
      ...(Array.isArray(detail.sources) ? detail.sources.map(x => x?.title || '') : [])
    ].filter(Boolean).join(' ');

    const animals = [
      ['Mountain Lion', /\b(mountain lion|cougar|puma)\b/i],
      ['Lion', /\b(lion|lioness|panthera leo)\b/i],
      ['Tiger', /\b(tiger|panthera tigris)\b/i],
      ['Leopard', /\b(leopard|panthera pardus)\b/i],
      ['Cheetah', /\b(cheetah|acinonyx jubatus)\b/i],
      ['Wolf', /\b(wolf|wolves|canis lupus)\b/i],
      ['Coyote', /\b(coyote|canis latrans)\b/i],
      ['Fox', /\b(fox|vulpes)\b/i],
      ['Bear', /\b(bear|grizzly|ursus|polar bear)\b/i],
      ['Elephant', /\b(elephant|loxodonta|elephas)\b/i],
      ['Giraffe', /\b(giraffe|giraffa)\b/i],
      ['Zebra', /\b(zebra|equus quagga|equus zebra)\b/i],
      ['Moose', /\b(moose|alces alces)\b/i],
      ['Deer', /\b(deer|doe|stag|buck)\b/i],
      ['Bison', /\b(bison|buffalo)\b/i],
      ['Hyena', /\b(hyena|hyaena)\b/i],
      ['Crocodile', /\b(crocodile|crocodylus)\b/i],
      ['Alligator', /\balligator\b/i],
      ['Eagle', /\beagle\b/i],
      ['Owl', /\bowl\b/i],
      ['Shark', /\bshark\b/i],
      ['Whale', /\bwhale\b/i],
      ['Dolphin', /\bdolphin\b/i],
      ['Seal', /\b(seal|sea lion)\b/i]
    ];

    return animals.find(([, re]) => re.test(text))?.[0] || 'Wildlife';
  }

  const TITLE_VARIANTS = [
    'Caught on Camera',
    'Up Close in Nature',
    'A Wild Encounter',
    'Natural Behavior',
    'In Its Natural Habitat',
    'Wildlife Moment',
    'Roaming Free',
    'Nature in Action',
    'A Closer Look',
    'Real Wildlife Footage',
    'Wildlife Close-Up',
    'An Amazing Nature Moment',
    'Seen in the Wild',
    'A Rare Wild Moment',
    'Life in the Wild',
    'Exploring the Wild',
    'Wildlife Spotlight',
    'Nature Encounter',
    'Wildlife Watch',
    'Living Wild'
  ];

  function uniqueFinalTitle(detail = {}) {
    const current = String(detail.title || '').trim();
    const local = loadJson(TITLE_HISTORY_KEY, []);
    const known = window.ClipFreeYouTube?.getKnownVideoTitles?.() || [];
    const used = new Set(
      [...local, ...known]
        .map(x => String(x || '').trim().toLowerCase())
        .filter(Boolean)
    );

    if (current && !used.has(current.toLowerCase())) {
      local.unshift(current);
      saveJson(TITLE_HISTORY_KEY, [...new Set(local)].slice(0, 600));
      return current;
    }

    const label = animalLabel(detail);
    let cursor = Number(localStorage.getItem(TITLE_CURSOR_KEY) || 0);
    if (!Number.isFinite(cursor) || cursor < 0) cursor = 0;
    const batchIndex = Math.max(0, Number(detail.batchIndex ?? detail.source?.batchIndex ?? 0));

    for (let offset = 0; offset < TITLE_VARIANTS.length; offset++) {
      const variant = TITLE_VARIANTS[(cursor + batchIndex + offset) % TITLE_VARIANTS.length];
      const candidate = `${label} ${variant} #Shorts`.slice(0, 100);
      if (!used.has(candidate.toLowerCase())) {
        try {
          localStorage.setItem(
            TITLE_CURSOR_KEY,
            String((cursor + offset + 1) % TITLE_VARIANTS.length)
          );
        } catch {}

        local.unshift(candidate);
        saveJson(TITLE_HISTORY_KEY, [...new Set(local)].slice(0, 600));
        return candidate;
      }
    }

    const suffix = new Date().toISOString().replace(/\D/g, '').slice(-8);
    const fallback = `${label} Wildlife Encounter ${suffix} #Shorts`.slice(0, 100);
    local.unshift(fallback);
    saveJson(TITLE_HISTORY_KEY, [...new Set(local)].slice(0, 600));
    return fallback;
  }

  function installTitleGuard() {
    if (window.__clipfreeFinalTitleGuardV21) return;
    window.__clipfreeFinalTitleGuardV21 = true;

    window.addEventListener('clipfree-export-ready', event => {
      const detail = event.detail || {};
      if (detail.kind !== 'animal-generator') return;
      if (!detail.__clipfreeGrowthFinalReady) return;
      if (detail.__clipfreeFinalTitleGuardReadyV21) return;

      const title = uniqueFinalTitle(detail);
      detail.title = title;

      if ($('uploadTitle')) $('uploadTitle').value = title;
      if ($('seoTitle')) $('seoTitle').value = title;
      if (window.ClipFreeExport === detail) window.ClipFreeExport.title = title;

      detail.__clipfreeFinalTitleGuardReadyV21 = true;
    }, true);
  }

  async function waitForPreviewReady(timeoutMs = 5000) {
    const video = $('preview');
    if (!video) return;
    if (video.videoWidth && Number.isFinite(video.duration)) return;

    await new Promise(resolve => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        video.removeEventListener('loadedmetadata', finish);
        video.removeEventListener('canplay', finish);
        resolve();
      };
      video.addEventListener('loadedmetadata', finish, { once:true });
      video.addEventListener('canplay', finish, { once:true });
      setTimeout(finish, timeoutMs);
    });
  }

  function buildFastExport(file, meta = {}) {
    const duration = Math.max(
      1,
      Number(meta.targetDuration || $('animalDuration')?.value || 60)
    );
    const captions = Array.isArray(meta.captions) ? [...meta.captions] : [];
    const fallbackTitle = String(meta.title || meta.presetLabel || 'Wildlife Moment').trim();
    const attribution = String(meta.attribution || '').trim();
    const story = String(meta.story || '').trim();

    const description = [
      story || `${fallbackTitle} captured in a wildlife Short.`,
      '#Shorts #Wildlife #Animals',
      attribution ? `Source / attribution:\n${attribution}` : ''
    ].filter(Boolean).join('\n\n').slice(0, 5000);

    return {
      ...meta,
      kind:'animal-generator',
      blob:file,
      filename:file?.name || `clipfree-wildlife-short-${Number(meta.batchIndex || 0) + 1}.mp4`,
      title:fallbackTitle.slice(0, 100),
      description,
      tags:String(meta.tags || ''),
      hashtags:String(meta.hashtags || '#Shorts #Wildlife #Animals'),
      captions,
      srt:String(meta.srt || '') || captionsToSrt(captions, duration),
      thumbnailBlob:meta.thumbnailBlob || null,
      source:{ ...meta },
      targetDuration:duration,
      __clipfreeFastUploadReady:true,
      __clipfreeLocalVideoValidated:true,
      createdAt:new Date().toISOString()
    };
  }

  function patchAutomation() {
    const automation = window.ClipFreeAutomation;
    if (!automation?.loadVideoFile) return false;
    if (automation[PATCH_FLAG]) return true;

    const originalLoadVideoFile = automation.loadVideoFile.bind(automation);

    automation.loadVideoFile = async function fastSafeLoad(file, meta = null, autoStart = true) {
      const isRenderedAnimalMontage = Boolean(
        autoStart &&
        file &&
        meta?.kind === 'animal-generator' &&
        /video\/(mp4|webm|ogg)/i.test(String(file.type || 'video/mp4'))
      );

      if (!isRenderedAnimalMontage) {
        return originalLoadVideoFile(file, meta, autoStart);
      }

      setStatus('Checking finished video before YouTube upload…');
      const health = await inspectRenderedVideo(file);

      if (!health.ok) {
        setStatus(`Safe path: ${health.reason}. Re-encoding once before upload…`);
        return originalLoadVideoFile(file, meta, true);
      }

      setStatus(`⚡ Healthy ${Math.round(health.duration)}s video confirmed — using fast upload path…`);

      await originalLoadVideoFile(file, meta, false);
      await waitForPreviewReady();

      const detail = buildFastExport(file, meta || {});
      window.ClipFreeExport = detail;
      window.dispatchEvent(new CustomEvent('clipfree-export-ready', { detail }));
      return detail;
    };

    automation[PATCH_FLAG] = true;

    window.CLIPFREE_UPLOAD_SPEED_BOOST = {
      enabled:true,
      version:'2.1',
      mode:'validated-fast-upload-safe-fallback-visual-dedupe'
    };

    const badge = document.querySelector('#clipfreeSimpleStudio .simple-badge');
    if (badge) badge.textContent = 'GROWTH MODE • FAST + SAFE • NO DUPLICATE FOOTAGE';

    return true;
  }

  function patchYouTubeStart() {
    const yt = window.ClipFreeYouTube;
    if (!yt?.startFullAutoWithFile || yt.__clipfreeVisualDedupeV21) return false;

    const originalStart = yt.startFullAutoWithFile.bind(yt);

    yt.startFullAutoWithFile = async function startWithVisualDedupe(file, meta = null) {
      const isAnimal = meta?.kind === 'animal-generator';

      if (!isAnimal) {
        return originalStart(file, meta);
      }

      const excluded = new Set([
        ...sourceKeysFromMeta(meta),
        ...sessionSources,
        ...rejectedSourceSet()
      ]);

      let chosenFile = file;
      let chosenMeta = meta;
      let fp = await visualFingerprint(chosenFile);

      if (fp && looksDuplicateFingerprint(fp)) {
        rejectSources(meta);

        const replacement = await makeDifferentMontage(meta, excluded);
        if (!replacement?.file) {
          throw new Error(
            'ClipFree blocked duplicate-looking footage before upload, but could not find a different unused Public Domain/CC0 source yet. Tap Start again and Source Vault will rotate to new searches.'
          );
        }

        chosenFile = replacement.file;
        chosenMeta = replacement.meta;
        fp = replacement.fp || await visualFingerprint(chosenFile);
        for (const key of sourceItemKeys(replacement.item)) sessionSources.add(key);
      }

      const result = await originalStart(chosenFile, chosenMeta);

      if (result?.id) {
        if (fp) rememberFingerprint(fp);
        for (const key of sourceKeysFromMeta(chosenMeta)) sessionSources.add(key);
      }

      return result;
    };

    yt.__clipfreeVisualDedupeV21 = true;
    return true;
  }

  function install() {
    installTitleGuard();
    const a = patchAutomation();
    const y = patchYouTubeStart();
    return a && y;
  }

  if (!install()) {
    const timer = setInterval(() => {
      if (install()) clearInterval(timer);
    }, 200);
    setTimeout(() => clearInterval(timer), 30000);
  }

  window.addEventListener('clipfree-youtube-ready', () => {
    setTimeout(install, 0);
  });
})();