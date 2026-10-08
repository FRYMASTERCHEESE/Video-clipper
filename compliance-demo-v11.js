/* CLIPFREE FAST BOOTSTRAP v40
   Normal site: tiny first-load layer.
   Reviewer routes: load the preserved full reviewer build only when needed.
*/
const __cfQuery = new URLSearchParams(location.search);
const __cfReviewer =
  __cfQuery.get('audit') === '1' ||
  __cfQuery.get('compliance') === '1' ||
  __cfQuery.get('review') === '1';

if (__cfReviewer) {
  import('./compliance-demo-review-v39.js?v=20261009-review39')
    .catch(err => console.error('ClipFree reviewer module failed to load', err));
} else {
  (() => {
    'use strict';

    const $ = id => document.getElementById(id);
    let runtimePromise = null;
    let runtimeReady = false;
    let reviewOpen = false;
    let wildPatched = false;

    const WILD = [
      ['mountain lion',/\b(mountain lion|cougar|puma)\b/i],
      ['sea lion',/\bsea lion\b/i],
      ['polar bear',/\bpolar bear\b/i],
      ['grizzly bear',/\bgrizzly bear\b/i],
      ['lion',/\b(lion|lioness)\b/i],
      ['tiger',/\btiger\b/i],
      ['leopard',/\bleopard\b/i],
      ['cheetah',/\bcheetah\b/i],
      ['jaguar',/\bjaguar\b/i],
      ['lynx',/\blynx\b/i],
      ['bobcat',/\bbobcat\b/i],
      ['wolf',/\b(wolf|wolves)\b/i],
      ['coyote',/\bcoyote\b/i],
      ['fox',/\bfox\b/i],
      ['bear',/\b(bear|black bear|brown bear)\b/i],
      ['elephant',/\belephant\b/i],
      ['giraffe',/\bgiraffe\b/i],
      ['zebra',/\bzebra\b/i],
      ['rhino',/\b(rhino|rhinoceros)\b/i],
      ['hippo',/\b(hippo|hippopotamus)\b/i],
      ['bison',/\b(bison|buffalo)\b/i],
      ['moose',/\bmoose\b/i],
      ['elk',/\belk\b/i],
      ['deer',/\b(deer|stag|doe|buck|reindeer|caribou)\b/i],
      ['antelope',/\b(antelope|gazelle|pronghorn|wildebeest)\b/i],
      ['kangaroo',/\bkangaroo\b/i],
      ['koala',/\bkoala\b/i],
      ['otter',/\botter\b/i],
      ['gorilla',/\bgorilla\b/i],
      ['chimpanzee',/\bchimpanzee\b/i],
      ['orangutan',/\borangutan\b/i],
      ['hyena',/\b(hyena|hyaena)\b/i],
      ['meerkat',/\bmeerkat\b/i],
      ['crocodile',/\bcrocodile\b/i],
      ['alligator',/\balligator\b/i],
      ['turtle',/\b(sea turtle|turtle|tortoise)\b/i],
      ['snake',/\b(snake|python|cobra|rattlesnake|boa)\b/i],
      ['eagle',/\beagle\b/i],
      ['hawk',/\bhawk\b/i],
      ['falcon',/\bfalcon\b/i],
      ['owl',/\bowl\b/i],
      ['penguin',/\bpenguin\b/i],
      ['shark',/\b(shark|great white|hammerhead)\b/i],
      ['whale',/\b(whale|orca)\b/i],
      ['dolphin',/\bdolphin\b/i],
      ['seal',/\bseal\b/i],
      ['frog',/\b(frog|toad)\b/i],
      ['butterfly',/\b(monarch butterfly|butterfly)\b/i],
      ['bee',/\b(bumble ?bee|bumblebee|bee)\b/i]
    ];

    const REJECT = [
      /\b(zoo|zoological|enclosure|cage|caged|captive|captivity)\b/i,
      /\b(aquarium|tank|marine park|theme park)\b/i,
      /\b(farm|farmyard|livestock|ranch|stable|barn)\b/i,
      /\b(pet|pets|domestic|kitten|puppy|dog park)\b/i,
      /\b(trained|training|circus|performance animal)\b/i,
      /\b(animation|animated|cartoon|cgi|3d render|illustration)\b/i,
      /\b(slideshow|still image|photo montage)\b/i
    ];

    function sourceText(item={}) {
      return [
        item.title,item.description,item.subject,item.creator,
        item.attribution,item.provider,item.sourceUrl
      ].map(v => Array.isArray(v) ? v.join(' ') : String(v || '')).join(' ');
    }

    function isRealWild(item={}) {
      const t = sourceText(item);
      if (!WILD.some(([,rx]) => rx.test(t))) return false;
      return !REJECT.some(rx => rx.test(t));
    }

    function installWildFilter() {
      if (wildPatched) return true;
      const yt = window.ClipFreeYouTube;
      if (!yt?.searchCommonsDownloadable) return false;

      const previous = yt.searchCommonsDownloadable.bind(yt);
      yt.searchCommonsDownloadable = async (query,limit=12) => {
        const wanted = Math.max(1,Math.min(20,Number(limit||12)));
        const variants = [...new Set([
          query,
          `${query} wildlife`,
          `${query} wild`,
          `${query} natural habitat`
        ])];

        const seen = new Set();
        const good = [];

        for (const q of variants) {
          let found = [];
          try { found = await previous(q, Math.max(wanted,12)); }
          catch (err) { console.warn('v40 source search pass failed',err); }

          for (const item of found || []) {
            const key = String(item?.fileUrl || item?.sourceUrl || item?.title || '').trim();
            if (!key || seen.has(key) || !isRealWild(item)) continue;
            seen.add(key);
            good.push(item);
          }
          if (good.length >= wanted) break;
        }

        return good.slice(0,wanted);
      };

      wildPatched = true;
      return true;
    }

    function capTen() {
      const select = $('simpleCount');
      if (!select) return false;
      [...select.options].forEach(o => {
        if (Number(o.value) > 10) o.remove();
      });
      if (Number(select.value) > 10) select.value = '10';
      return true;
    }

    function addBanner() {
      if ($('clipfreeV40Banner')) return true;
      const head = document.querySelector('#clipfreeSimpleStudio .simple-head');
      if (!head) return false;
      const box = document.createElement('div');
      box.id = 'clipfreeV40Banner';
      box.style.cssText =
        'margin:10px 0;padding:10px 12px;border:1px solid #3c6d50;border-radius:12px;' +
        'background:#0b1710;color:#b8f6c9;font-size:.76rem;font-weight:900';
      box.textContent =
        '⚡ v40 FAST LOAD • heavy reviewer code loads only on review URLs • normal uploads + Resume preserved';
      head.appendChild(box);
      return true;
    }

    function loadRuntime() {
      if (runtimePromise) return runtimePromise;

      runtimePromise = import('./clipfree-runtime-v40.js?v=20261009-runtime40')
        .then(() => {
          runtimeReady = true;
          capTen();
          installWildFilter();
          addBanner();
          window.CLIPFREE_V40.runtimeReady = true;
        })
        .catch(err => {
          runtimePromise = null;
          console.error('ClipFree lazy runtime failed to load',err);
          throw err;
        });

      return runtimePromise;
    }

    // If the user is fast and presses Start before the lazy runtime is ready,
    // hold that click briefly, load the runtime, then replay the click once.
    window.addEventListener('click', event => {
      const start = event.target?.closest?.('#simpleStart');
      if (!start || runtimeReady || start.dataset.v40Replay === '1') return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const originalText = start.textContent;
      start.disabled = true;
      start.textContent = '⚡ Loading upload tools…';

      loadRuntime().then(() => {
        start.disabled = false;
        start.textContent = originalText;
        start.dataset.v40Replay = '1';
        start.click();
        delete start.dataset.v40Replay;
      }).catch(err => {
        start.disabled = false;
        start.textContent = originalText;
        const status = $('simpleStatus');
        if (status) {
          status.textContent = `Upload tools could not load: ${err?.message || err}`;
          status.className = 'simple-status bad';
        }
      });
    }, true);

    // ---------------- final YouTube compliance review ----------------
    function esc(value='') {
      return String(value)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;')
        .replace(/'/g,'&#039;');
    }

    function privacyValue() {
      const v =
        $('simplePrivacy')?.value ||
        $('autoPrivacy')?.value ||
        $('uploadPrivacy')?.value ||
        'private';
      return ['private','unlisted','public'].includes(v) ? v : 'private';
    }

    function setPrivacy(v) {
      for (const id of ['simplePrivacy','autoPrivacy','uploadPrivacy']) {
        const el = $(id);
        if (!el) continue;
        el.value = v;
        el.dispatchEvent(new Event('change',{bubbles:true}));
      }
    }

    function closeReview() {
      const root = $('clipfreeV40Review');
      if (!root) return;
      const video = root.querySelector('video');
      if (video?.src?.startsWith('blob:')) {
        try { URL.revokeObjectURL(video.src); } catch {}
      }
      root.remove();
      reviewOpen = false;
    }

    function showReview(detail) {
      if (reviewOpen) return;
      reviewOpen = true;

      const source = (Array.isArray(detail.sources) ? detail.sources[0] : detail.source) || {};
      const pv = privacyValue();

      const root = document.createElement('div');
      root.id = 'clipfreeV40Review';
      root.style.cssText =
        'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.94);' +
        'overflow:auto;padding:14px;box-sizing:border-box;color:#fff;font-family:system-ui,sans-serif';

      const card = document.createElement('div');
      card.style.cssText =
        'max-width:720px;margin:auto;background:#111018;border:1px solid #433c4d;' +
        'border-radius:16px;padding:14px;box-sizing:border-box';

      card.innerHTML = `
        <div style="font-size:.76rem;font-weight:900;color:#b9f3c7">FINAL YOUTUBE REVIEW</div>
        <h2 style="margin:8px 0">Review the finished Short</h2>
        <video id="v40video" controls playsinline
          style="width:100%;max-height:62vh;background:#000;border-radius:11px"></video>

        <label style="display:grid;gap:5px;margin-top:12px"><strong>Title</strong>
          <input id="v40title" maxlength="100" value="${esc(detail.title || '')}"
            style="padding:10px;background:#09090d;color:#fff;border:1px solid #555;border-radius:8px">
        </label>

        <label style="display:grid;gap:5px;margin-top:10px"><strong>Description</strong>
          <textarea id="v40desc" rows="6"
            style="padding:10px;background:#09090d;color:#fff;border:1px solid #555;border-radius:8px">${esc(detail.description || '')}</textarea>
        </label>

        <label style="display:grid;gap:5px;margin-top:10px"><strong>Privacy</strong>
          <select id="v40privacy"
            style="padding:10px;background:#09090d;color:#fff;border:1px solid #555;border-radius:8px">
            <option value="private"${pv==='private'?' selected':''}>Private</option>
            <option value="unlisted"${pv==='unlisted'?' selected':''}>Unlisted</option>
            <option value="public"${pv==='public'?' selected':''}>Public</option>
          </select>
        </label>

        <details style="margin-top:10px"><summary>Source / narration / attribution</summary>
          <div style="white-space:pre-wrap;font-size:.78rem;margin-top:8px">
${esc(detail.voiceoverText || detail.story || '')}

${esc(detail.attribution || '')}

Source: ${esc(source.title || '')}
          </div>
        </details>

        <label style="display:flex;gap:10px;margin-top:12px">
          <input id="v40meta" type="checkbox">
          <span>I watched the finished Short and reviewed its title, description and privacy.</span>
        </label>

        <label style="display:flex;gap:10px;margin-top:9px">
          <input id="v40wild" type="checkbox">
          <span>I confirm this is a real wild-animal encounter and not obvious zoo/cage/pet/animation footage.</span>
        </label>

        <button id="v40upload" disabled
          style="width:100%;margin-top:12px;padding:13px;border:0;border-radius:10px;background:#24623f;color:#fff;font-weight:900;opacity:.5">
          APPROVE + UPLOAD TO YOUTUBE
        </button>
        <button id="v40cancel"
          style="width:100%;margin-top:8px;padding:11px;border:1px solid #744;border-radius:10px;background:#211;color:#fbb">
          CANCEL — DO NOT UPLOAD
        </button>
      `;

      root.appendChild(card);
      document.body.appendChild(root);

      if (detail.blob instanceof Blob) {
        const video = $('v40video');
        video.src = URL.createObjectURL(detail.blob);
        video.load();
      }

      const meta = $('v40meta');
      const wild = $('v40wild');
      const go = $('v40upload');

      const sync = () => {
        const ok = Boolean(meta?.checked && wild?.checked);
        go.disabled = !ok;
        go.style.opacity = ok ? '1' : '.5';
      };
      meta.onchange = sync;
      wild.onchange = sync;
      sync();

      $('v40cancel').onclick = () => {
        closeReview();
        const status = $('simpleStatus') || $('animalGeneratorStatus');
        if (status) status.textContent = 'Upload cancelled. Nothing was sent to YouTube.';
      };

      go.onclick = () => {
        if (go.disabled) return;
        const title = String($('v40title')?.value || '').trim();
        if (!title) return alert('Enter a title first.');

        detail.title = title.slice(0,100);
        detail.description = String($('v40desc')?.value || '');
        detail.__clipfreeV40Approved = true;
        detail.__clipfreeUserSelectedPrivacy = String($('v40privacy')?.value || 'private');

        if ($('uploadTitle')) $('uploadTitle').value = detail.title;
        if ($('uploadDescription')) $('uploadDescription').value = detail.description;
        setPrivacy(detail.__clipfreeUserSelectedPrivacy);

        if (window.ClipFreeExport === detail) Object.assign(window.ClipFreeExport,detail);

        closeReview();
        window.dispatchEvent(new CustomEvent('clipfree-export-ready',{detail}));
      };
    }

    window.addEventListener('clipfree-export-ready', event => {
      const detail = event.detail || {};
      if (detail.__clipfreeV40Approved) return;
      if (detail.kind !== 'animal-generator') return;
      if (!detail.__clipfreeGrowthFinalReady) return;

      event.stopImmediatePropagation();
      showReview(detail);
    }, true);

    // Fast first paint: only poll briefly for UI creation; no permanent observer.
    let tries = 0;
    const uiTimer = setInterval(() => {
      tries += 1;
      const ready = capTen() && addBanner();
      if (ready || tries >= 40) clearInterval(uiTimer);
    }, 100);

    // Load heavier upload/recovery helpers after first paint, not during it.
    const lazy = () => loadRuntime().catch(() => {});
    if ('requestIdleCallback' in window) {
      requestIdleCallback(lazy,{timeout:1800});
    } else {
      setTimeout(lazy,1200);
    }

    window.addEventListener('clipfree-youtube-ready', () => {
      installWildFilter();
    });

    window.CLIPFREE_V40 = {
      version:'40.0',
      fastBootstrap:true,
      reviewerCodeLazy:true,
      runtimeLazy:true,
      runtimeReady:false,
      maxShorts:10,
      finalMetadataReview:true,
      realWildFilter:true
    };
  })();
}
