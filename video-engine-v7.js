/* ClipFree AI — SPEED + QUALITY VIDEO ENGINE v7
   Single-pass animal Short encoder:
   - one H.264 encode instead of montage encode + second export encode
   - adaptive 1080x1920 / 720x1280 based on device capacity
   - AAC 48 kHz stereo
   - Fast Start MP4, yuv420p, BT.709, High Profile
   - no app watermark
*/
import { FFmpeg } from 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js';
import { fetchFile, toBlobURL } from 'https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js';

(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  let fastFFmpeg = null;

  function status(text) {
    const el = $('animalGeneratorStatus') || $('simpleStatus') || $('statusText');
    if (el) el.textContent = text;
  }

  function deviceProfile() {
    const memory = Number(navigator.deviceMemory || 4);
    const cores = Number(navigator.hardwareConcurrency || 4);

    // Mobile upload turbo: keep audit Shorts at true vertical HD while making
    // the MP4 smaller so encoding + transfer to YouTube finishes faster.
    if (window.CLIPFREE_COMPLIANCE_RECORDING_MODE) {
      return {
        width:720, height:1280, fps:30, crf:25, preset:'superfast',
        maxrate:'1600k', bufsize:'3200k', audioBitrate:'96k',
        label:'720p Audit Upload Turbo'
      };
    }

    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');

    // v27 mobile balance: 720p vertical HD is still YouTube-Shorts quality,
    // while avoiding the huge WebAssembly cost of software-encoding 1080x1920
    // on a phone. Desktop/high-capacity systems keep 1080p below.
    if (mobile) {
      return {
        width:720, height:1280, fps:30, crf:19, preset:'superfast',
        maxrate:'3000k', bufsize:'6000k', audioBitrate:'128k',
        label:'720p Mobile Fast Recommendation HQ'
      };
    }

    const high = memory >= 8 && cores >= 8;
    return high
      ? {
          width:1080, height:1920, fps:30, crf:20, preset:'superfast',
          maxrate:'4500k', bufsize:'9000k', audioBitrate:'160k',
          label:'1080p Recommendation HQ'
        }
      : {
          width:720, height:1280, fps:30, crf:20, preset:'superfast',
          maxrate:'2800k', bufsize:'5600k', audioBitrate:'128k',
          label:'720p Recommendation HQ'
        };
  }

  async function ensureFastFFmpeg() {
    if (fastFFmpeg?.loaded) return fastFFmpeg;
    status('Loading the optimized video engine…');
    fastFFmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    const classWorkerURL = new URL('./ffmpeg-worker.js', window.location.href).href;
    await fastFFmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      classWorkerURL
    });
    return fastFFmpeg;
  }

  function inputExt(file) {
    const name = String(file?.name || '');
    return name.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase() ||
      (String(file?.type || '').includes('webm') ? 'webm' :
       String(file?.type || '').includes('ogg') ? 'ogv' : 'mp4');
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
    const total = Math.max(1, Number(duration) || 30);
    const step = total / lines.length;
    return lines.map((line, i) => {
      const a = i * step;
      const b = Math.max(a + .25, Math.min(total, (i + 1) * step));
      return `${i + 1}\n${srtTime(a)} --> ${srtTime(b)}\n${line}\n`;
    }).join('\n');
  }

  async function waitPreview(file, timeoutMs = 7000) {
    const preview = $('preview');
    if (!preview) return;
    if (preview.videoWidth && Number.isFinite(preview.duration)) return;

    await new Promise(resolve => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        preview.removeEventListener('loadedmetadata', finish);
        preview.removeEventListener('canplay', finish);
        resolve();
      };
      preview.addEventListener('loadedmetadata', finish, {once:true});
      preview.addEventListener('canplay', finish, {once:true});
      setTimeout(finish, timeoutMs);
    });
  }

  async function encodeSingleSource(sourceFile, audioFile, options = {}) {
    const ff = await ensureFastFFmpeg();
    const profile = deviceProfile();
    const seconds = Math.max(10, Math.min(60, Number(options.duration) || 30));

    const sourceName = `v7_source.${inputExt(sourceFile)}`;
    const audioName = `v7_audio.${inputExt(audioFile) || 'wav'}`;
    const outputName = 'v7_final_short.mp4';

    for (const name of [sourceName, audioName, outputName]) {
      try { await ff.deleteFile(name); } catch {}
    }

    await ff.writeFile(sourceName, await fetchFile(sourceFile));
    await ff.writeFile(audioName, await fetchFile(audioFile));

    const vf = [
      `scale=${profile.width}:${profile.height}:force_original_aspect_ratio=increase:flags=bicubic`,
      `crop=${profile.width}:${profile.height}`,
      `fps=${profile.fps}`,
      'setsar=1'
    ].join(',');

    status(`Encoding ${profile.label} once — video + narration together…`);

    const videoRateArgs = profile.maxrate
      ? ['-maxrate', profile.maxrate, '-bufsize', profile.bufsize]
      : [];

    await ff.exec([
      '-i', sourceName,
      '-i', audioName,
      '-t', seconds.toFixed(2),
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-vf', vf,

      '-c:v', 'libx264',
      '-preset', profile.preset,
      '-crf', String(profile.crf),
      ...videoRateArgs,
      '-pix_fmt', 'yuv420p',
      '-profile:v', 'high',
      '-level', '4.1',
      '-bf', '2',
      '-g', String(profile.fps * 2),
      '-sc_threshold', '0',
      '-threads', '0',

      '-color_primaries', 'bt709',
      '-color_trc', 'bt709',
      '-colorspace', 'bt709',

      '-c:a', 'aac',
      '-b:a', profile.audioBitrate || '128k',
      '-ar', '48000',
      '-ac', '2',
      '-af', `volume=0.98,apad=pad_dur=${seconds.toFixed(2)}`,

      '-movflags', '+faststart',
      '-avoid_negative_ts', 'make_zero',
      outputName
    ]);

    const data = await ff.readFile(outputName);
    const blob = new Blob([data], {type:'video/mp4'});
    if (blob.size < 64 * 1024) throw new Error('The optimized video encoder returned an unexpectedly small MP4.');

    const file = new File(
      [blob],
      options.filename || `clipfree-v7-${Date.now()}.mp4`,
      {type:'video/mp4'}
    );

    file.clipfreeUsedAnimalSound = true;
    file.clipfreeFinalNormalized = true;
    file.clipfreeSourceCount = 1;
    file.clipfreeVideoProfile = profile.label;
    return file;
  }

  function buildPreparedExport(file, meta = {}) {
    const duration = Math.max(10, Math.min(60, Number(meta.targetDuration) || 30));
    const captions = Array.isArray(meta.captions) ? [...meta.captions] : [];
    const attribution = String(meta.attribution || '').trim();
    const title = String(meta.title || meta.presetLabel || 'Wildlife Short').trim().slice(0,100);

    return {
      ...meta,
      kind:'animal-generator',
      blob:file,
      filename:file.name || `clipfree-v7-${Date.now()}.mp4`,
      title,
      description:[
        String(meta.story || '').trim(),
        '#Shorts #Wildlife #Animals',
        attribution ? `Source / attribution:\n${attribution}` : ''
      ].filter(Boolean).join('\n\n').slice(0,5000),
      tags:String(meta.tags || ''),
      hashtags:String(meta.hashtags || '#Shorts #Wildlife #Animals'),
      captions,
      srt:String(meta.srt || '') || captionsToSrt(captions, duration),
      thumbnailBlob:meta.thumbnailBlob || null,
      source:{...meta},
      targetDuration:duration,
      __clipfreeV7Prepared:true,
      createdAt:new Date().toISOString()
    };
  }

  function install() {
    const a = window.ClipFreeAutomation;
    if (!a?.createMontageFromFiles || !a?.loadVideoFile) return false;
    if (a.__clipfreeSpeedQualityV7) return true;

    const originalMontage = a.createMontageFromFiles.bind(a);
    const originalLoad = a.loadVideoFile.bind(a);

    a.createMontageFromFiles = async function(files, options = {}) {
      const usable = Array.from(files || []).filter(Boolean);

      if (usable.length === 1 && options.audioFile) {
        return encodeSingleSource(usable[0], options.audioFile, options);
      }

      return originalMontage(files, options);
    };

    a.loadVideoFile = async function(file, meta = null, automatic = true) {
      const prepared = Boolean(
        automatic &&
        file?.clipfreeFinalNormalized &&
        meta?.kind === 'animal-generator'
      );

      if (!prepared) return originalLoad(file, meta, automatic);

      status('Final MP4 ready — skipping the unnecessary second video encode…');
      await originalLoad(file, meta, false);
      await waitPreview(file);

      const detail = buildPreparedExport(file, meta || {});
      window.ClipFreeExport = detail;
      window.dispatchEvent(new CustomEvent('clipfree-export-ready', {detail}));
      return detail;
    };

    a.__clipfreeSpeedQualityV7 = true;
    window.CLIPFREE_VIDEO_ENGINE_V7 = {
      enabled:true,
      version:'7.5-fast-verification-v27',
      profile:deviceProfile(),
      singlePass:true
    };

    return true;
  }

  if (!install()) {
    const timer = setInterval(() => {
      if (install()) clearInterval(timer);
    }, 150);
    setTimeout(() => clearInterval(timer), 30000);
  }

  window.addEventListener('clipfree-youtube-ready', () => setTimeout(install, 0));
})();
