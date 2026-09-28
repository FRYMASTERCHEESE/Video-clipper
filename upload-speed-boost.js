/* ClipFree AI — upload speed boost
   Speeds the 1–20 wildlife Shorts workflow without removing SEO, captions,
   thumbnails, attribution, duplicate protection, or YouTube confirmation.
   It avoids re-analyzing and re-encoding an animal montage that is already
   rendered as a vertical upload-ready video.
*/
(() => {
  'use strict';

  const PATCH_FLAG = '__clipfreeUploadSpeedBoostV1';
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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

  async function waitForPreviewReady(timeoutMs = 3500) {
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
    const duration = Math.max(1, Number(meta.targetDuration || $('animalDuration')?.value || 60));
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
      kind: 'animal-generator',
      blob: file,
      filename: file?.name || `clipfree-wildlife-short-${Number(meta.batchIndex || 0) + 1}.mp4`,
      title: fallbackTitle.slice(0, 100),
      description,
      tags: String(meta.tags || ''),
      hashtags: String(meta.hashtags || '#Shorts #Wildlife #Animals'),
      captions,
      srt: String(meta.srt || '') || captionsToSrt(captions, duration),
      thumbnailBlob: meta.thumbnailBlob || null,
      source: { ...meta },
      targetDuration: duration,
      __clipfreeFastUploadReady: true,
      createdAt: new Date().toISOString(),
    };
  }

  function setFastStatus(message) {
    const el = $('animalGeneratorStatus') || $('simpleStatus') || $('youtubeUploadStatus');
    if (el) el.textContent = message;
  }

  function patchAutomation() {
    const automation = window.ClipFreeAutomation;
    if (!automation?.loadVideoFile) return false;
    if (automation[PATCH_FLAG]) return true;

    const originalLoadVideoFile = automation.loadVideoFile.bind(automation);

    automation.loadVideoFile = async function fastLoadVideoFile(file, meta = null, autoStart = true) {
      const isRenderedAnimalMontage = Boolean(
        autoStart &&
        file &&
        meta?.kind === 'animal-generator' &&
        /video\/(mp4|webm|ogg)/i.test(String(file.type || 'video/mp4'))
      );

      if (!isRenderedAnimalMontage) {
        return originalLoadVideoFile(file, meta, autoStart);
      }

      setFastStatus('⚡ Fast path: video is already rendered — skipping duplicate AI analysis and second encode…');

      // Load only for preview/thumbnail generation. Do NOT run the expensive
      // transcription + second FFmpeg export again.
      await originalLoadVideoFile(file, meta, false);
      await waitForPreviewReady();

      const detail = buildFastExport(file, meta || {});
      window.ClipFreeExport = detail;

      // The existing Growth Engine still receives this event first and keeps
      // the accurate animal detection, researched SEO, cover, attribution and
      // no-repeat protections. youtube.js then uploads the final redispatched
      // package through its normal verified queue.
      window.dispatchEvent(new CustomEvent('clipfree-export-ready', { detail }));
      return detail;
    };

    automation[PATCH_FLAG] = true;
    window.CLIPFREE_UPLOAD_SPEED_BOOST = {
      enabled: true,
      version: '1.0',
      mode: 'skip-duplicate-animal-reencode',
    };

    const badge = document.querySelector('#clipfreeSimpleStudio .simple-badge');
    if (badge && !/FAST/i.test(badge.textContent || '')) {
      badge.textContent = `${badge.textContent || 'GROWTH MODE'} • FAST UPLOAD`;
    }
    return true;
  }

  if (!patchAutomation()) {
    const timer = setInterval(() => {
      if (patchAutomation()) clearInterval(timer);
    }, 200);
    setTimeout(() => clearInterval(timer), 30000);
  }

  // Re-apply after page-level tools announce readiness.
  window.addEventListener('clipfree-youtube-ready', () => setTimeout(patchAutomation, 0));
})();
