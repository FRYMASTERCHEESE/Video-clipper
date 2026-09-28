/* ClipFree AI — ORIGINALITY LITE v7
   Uses original AI narration + accurate captions + PD/CC0 attribution as the
   transformation layer without a second FFmpeg encode.
*/
(() => {
  'use strict';

  const clean = v => String(v || '').replace(/\s+/g,' ').trim();

  function sourceCount(detail) {
    const a = Array.isArray(detail?.source?.sources) ? detail.source.sources.length : 0;
    const b = Array.isArray(detail?.sources) ? detail.sources.length : 0;
    return Math.max(a,b,1);
  }

  function hasAttribution(detail) {
    return Boolean(
      clean(detail?.attribution) ||
      clean(detail?.source?.attribution) ||
      (Array.isArray(detail?.source?.sources) && detail.source.sources.some(x => clean(x?.sourceUrl)))
    );
  }

  window.addEventListener('clipfree-export-ready', event => {
    const detail = event.detail || window.ClipFreeExport;
    if (!detail || detail.kind !== 'animal-generator') return;
    if (detail.__originalityLiteV7) return;

    const originalVoice = Boolean(
      detail.originalVoiceover ||
      detail.source?.originalVoiceover ||
      detail.audioType === 'original-ai-voiceover' ||
      detail.source?.audioType === 'original-ai-voiceover'
    );

    const attributionOk = hasAttribution(detail);
    const count = sourceCount(detail);

    detail.originality = {
      mode:'original-narration-plus-edit',
      originalVoiceover:originalVoice,
      sourceCount:count,
      attributionPresent:attributionOk,
      extraVideoEncode:false,
      guarantee:false
    };

    // Do not force a single-source Short Private solely because it uses one
    // PD/CC0 source when it also contains newly written AI narration, new SEO,
    // captions and a fresh vertical edit. YouTube still makes the final policy
    // and monetization decisions.
    const note = originalVoice
      ? 'Original narration and edit created specifically for this Short.'
      : 'Edited wildlife Short with source attribution.';

    if (attributionOk) {
      const d = String(detail.description || '').trim();
      if (!d.toLowerCase().includes('original narration and edit')) {
        detail.description = `${d}\n\n${note}`.trim().slice(0,5000);
      }
    }

    detail.__premiumProcessed = detail.__premiumProcessed || false;
    detail.__originalityProcessed = true;
    detail.__originalityLiteV7 = true;

    if (window.ClipFreeExport === detail) Object.assign(window.ClipFreeExport, detail);
  }, true);

  window.ClipFreeOriginalityGuard = {
    version:'7.0-lite',
    policyGoal:'meaningful transformation with original narration, captions, editing and attribution',
    extraVideoEncode:false,
    guarantee:false
  };
})();