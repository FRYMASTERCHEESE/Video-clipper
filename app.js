import { FFmpeg } from 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js';
import { fetchFile, toBlobURL } from 'https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js';
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/+esm';

env.allowLocalModels = false;
env.useBrowserCache = true;

const $ = (id) => document.getElementById(id);
const videoInput = $('videoInput');
const preview = $('preview');
const emptyPreview = $('emptyPreview');
const autoMode = $('autoMode');
const autoExport = $('autoExport');
const aiButton = $('aiButton');
const exportButton = $('exportButton');
const startTime = $('startTime');
const endTime = $('endTime');
const ratio = $('ratio');
const clipLength = $('clipLength');
const statusText = $('statusText');
const statusHint = $('statusHint');
const progressBar = $('progressBar');
const highlightsEl = $('highlights');
const highlightCount = $('highlightCount');
const transcriptEl = $('transcript');
const copyTranscript = $('copyTranscript');
const downloadPanel = $('downloadPanel');
const downloadLink = $('downloadLink');
const copySeo = $('copySeo');
const downloadSeo = $('downloadSeo');
const downloadSrt = $('downloadSrt');
const seoTitle = $('seoTitle');
const seoDescription = $('seoDescription');
const seoTags = $('seoTags');
const seoHashtags = $('seoHashtags');

let inputFile = null;
let inputName = 'input.mp4';
let ffmpeg = null;
let transcriber = null;
let transcriptChunks = [];
let transcriptText = '';
let outputUrl = null;
let videoObjectUrl = null;
let currentHighlights = [];
let selectedHighlightIndex = -1;
let analysisRunning = false;
let exportRunning = false;
let sourceMeta = null;

function setStatus(text, progress = null, hint = null) {
  statusText.textContent = text;
  if (progress !== null) progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
  if (hint) statusHint.textContent = hint;
}

function fmt(seconds = 0) {
  seconds = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[ch]));
}

function getInputExtension(file) {
  const name = file?.name || '';
  const match = name.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : 'mp4';
}

function baseFileName(name = '') {
  return name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanSourceTitle(name = '') {
  return baseFileName(String(name || '').replace(/^File:/i, '')).replace(/\b(?:webm|mp4|ogv|mov)$/i, '').trim();
}

function autoPickScore(duration, targetLength, hasMetadata = false) {
  const closeness = Math.max(0, 20 - Math.abs(Number(duration || 0) - Number(targetLength || 0)) * 0.8);
  const metadataBonus = hasMetadata ? 8 : 0;
  return Math.max(72, Math.min(96, Math.round(68 + closeness + metadataBonus)));
}

function buildStoryChunks(meta, duration) {
  const captions = Array.isArray(meta?.captions) ? meta.captions.filter(Boolean) : [];
  const storySentences = String(meta?.story || '')
    .split(/(?<=[.!?])\s+/)
    .map(x => x.trim())
    .filter(Boolean);
  const lines = (captions.length ? captions : storySentences).slice(0, 6);
  if (!lines.length) return [];
  const total = Math.max(1, Number(duration || 1));
  const chunk = total / lines.length;
  return lines.map((line, i) => ({
    text: line,
    timestamp: [Math.max(0, i * chunk), Math.min(total, (i + 1) * chunk)],
  }));
}

async function ensureFFmpeg() {
  if (ffmpeg?.loaded) return ffmpeg;
  setStatus('Loading video engine', 8, 'First run downloads the free FFmpeg WebAssembly engine.');
  ffmpeg = new FFmpeg();
  ffmpeg.on('progress', ({ progress }) => {
    if (Number.isFinite(progress) && exportRunning) progressBar.style.width = `${Math.round(progress * 100)}%`;
  });
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  // The @ffmpeg/ffmpeg module itself is loaded from a CDN, but browsers do not
  // allow its default Worker to be created cross-origin. Serve the class worker
  // from this GitHub Pages site instead, while keeping the large core/wasm files
  // on the CDN as blob URLs.
  const classWorkerURL = new URL('./ffmpeg-worker.js', window.location.href).href;
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    classWorkerURL,
  });
  return ffmpeg;
}

async function ensureTranscriber() {
  if (transcriber) return transcriber;
  setStatus('Loading AI model', 15, 'Downloading the free Whisper model. This is usually slowest the first time.');
  transcriber = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny.en', {
    dtype: 'q8',
    device: navigator.gpu ? 'webgpu' : 'wasm',
    progress_callback: (p) => {
      if (p?.progress != null) setStatus('Loading AI model', 15 + (p.progress * 0.25));
    }
  });
  return transcriber;
}

function clearGeneratedState() {
  transcriptChunks = [];
  transcriptText = '';
  currentHighlights = [];
  selectedHighlightIndex = -1;
  highlightsEl.className = 'highlights empty-list';
  highlightsEl.textContent = 'Upload a video to automatically find highlights.';
  transcriptEl.className = 'transcript empty-list';
  transcriptEl.textContent = 'Your transcript will appear here.';
  highlightCount.textContent = '0 clips';
  copyTranscript.disabled = true;
  downloadPanel.classList.add('hidden');
  [seoTitle, seoDescription, seoTags, seoHashtags].forEach(el => el.value = '');
  setSeoButtons(false);
}

function setSeoButtons(enabled) {
  copySeo.disabled = !enabled;
  downloadSeo.disabled = !enabled;
  downloadSrt.disabled = !enabled;
  document.querySelectorAll('.copy-field').forEach(btn => btn.disabled = !enabled);
}

async function loadVideoFile(file, meta = null, autoStart = autoMode.checked) {
  if (!file) return;
  if (autoStart) {
    autoMode.checked = true;
    autoExport.checked = true;
    ratio.value = '9:16';
  }
  inputFile = file;
  inputName = `input.${getInputExtension(file)}`;
  sourceMeta = meta && typeof meta === 'object' ? { ...meta } : null;
  window.ClipFreeSource = sourceMeta;
  clearGeneratedState();

  if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
  videoObjectUrl = URL.createObjectURL(file);
  preview.src = videoObjectUrl;
  preview.style.display = 'block';
  emptyPreview.style.display = 'none';
  aiButton.disabled = false;
  exportButton.disabled = false;
  setStatus('Video ready', 0, autoStart ? 'FULL AUTO will start as soon as the video metadata is ready.' : 'Run automatic AI or set start/end times manually.');

  preview.onloadedmetadata = async () => {
    const duration = Number.isFinite(preview.duration) ? preview.duration : 30;
    startTime.max = duration;
    endTime.max = duration;
    endTime.value = Math.min(Number(clipLength.value), duration).toFixed(1);
    if (autoStart) await runAutomaticAnalysis(true);
  };
}

videoInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  await loadVideoFile(file, null, autoMode.checked);
});

function pcmFromAudioBuffer(audioBuffer) {
  if (audioBuffer.numberOfChannels === 1) return new Float32Array(audioBuffer.getChannelData(0));
  const length = audioBuffer.length;
  const mono = new Float32Array(length);
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) mono[i] += data[i] / audioBuffer.numberOfChannels;
  }
  return mono;
}

async function extractAudio() {
  const ff = await ensureFFmpeg();
  try { await ff.deleteFile(inputName); } catch {}
  try { await ff.deleteFile('audio.wav'); } catch {}
  await ff.writeFile(inputName, await fetchFile(inputFile));
  setStatus('Extracting speech audio', 30, 'Preparing lightweight 16 kHz speech audio for the AI model.');
  await ff.exec(['-i', inputName, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', 'audio.wav']);
  const wav = await ff.readFile('audio.wav');
  const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
  const decoded = await audioContext.decodeAudioData(wav.buffer.slice(0));
  const pcm = pcmFromAudioBuffer(decoded);
  await audioContext.close();
  return pcm;
}

function normalizeChunks(result) {
  const raw = Array.isArray(result?.chunks) ? result.chunks : [];
  if (!raw.length && result?.text) {
    return [{ text: result.text.trim(), timestamp: [0, preview.duration || 30] }];
  }
  return raw.map((c, i) => {
    let [s, e] = c.timestamp || [0, null];
    if (s == null) s = i ? raw[i - 1]?.timestamp?.[1] || 0 : 0;
    if (e == null) e = Math.min((s || 0) + 8, preview.duration || (s + 8));
    return { text: (c.text || '').trim(), timestamp: [Number(s) || 0, Number(e) || Number(s) + 5] };
  }).filter(c => c.text);
}

function renderTranscript() {
  transcriptEl.className = 'transcript';
  transcriptEl.innerHTML = transcriptChunks.map(c => `<span class="segment"><time>${fmt(c.timestamp[0])}</time>${escapeHtml(c.text)}</span>`).join('');
  transcriptText = transcriptChunks.map(c => c.text).join(' ').replace(/\s+/g, ' ').trim();
  copyTranscript.disabled = !transcriptText;
}

function scoreText(text, duration, targetLength) {
  const t = text.toLowerCase();
  const words = t.match(/[a-z0-9']+/g) || [];
  const hookTerms = ['how','why','secret','best','worst','never','always','crazy','mistake','truth','problem','wait','watch','look','here is','here\'s','you need','did you know','imagine','important','finally','biggest','easy','fast','money','free','warning','surprise','exactly','first','top','stop','start','because','this is'];
  const hookHits = hookTerms.reduce((n, term) => n + (t.includes(term) ? 1 : 0), 0);
  const question = (text.match(/\?/g) || []).length;
  const exclaim = (text.match(/!/g) || []).length;
  const density = duration > 0 ? words.length / duration : 0;
  const targetBonus = Math.max(0, 16 - Math.abs(duration - targetLength) * 0.6);
  const openerBonus = /^(wait|watch|look|here|this|how|why|did you know|the|i|you)/i.test(text.trim()) ? 6 : 0;
  return Math.round(words.length * 0.45 + density * 16 + hookHits * 8 + question * 4 + exclaim * 3 + targetBonus + openerBonus);
}

function buildHighlights() {
  if (!transcriptChunks.length) return [];
  const target = Math.max(20, Math.min(60, Number(clipLength.value) || 45));
  const minDuration = Math.max(12, target * 0.55);
  const maxDuration = Math.min(65, target + 12);
  const candidates = [];

  for (let i = 0; i < transcriptChunks.length; i++) {
    const start = transcriptChunks[i].timestamp[0];
    let end = start;
    let text = '';
    for (let j = i; j < transcriptChunks.length; j++) {
      end = transcriptChunks[j].timestamp[1];
      const duration = end - start;
      if (duration > maxDuration) break;
      text += ` ${transcriptChunks[j].text}`;
      if (duration >= minDuration) {
        candidates.push({ start, end, text: text.trim(), score: scoreText(text, duration, target) });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const picked = [];
  for (const c of candidates) {
    const overlaps = picked.some(p => Math.max(p.start, c.start) < Math.min(p.end, c.end) - 5);
    if (!overlaps) picked.push(c);
    if (picked.length >= 6) break;
  }
  return picked.sort((a, b) => b.score - a.score);
}

function renderHighlights(items) {
  currentHighlights = items;
  highlightCount.textContent = `${items.length} clip${items.length === 1 ? '' : 's'}`;
  if (!items.length) {
    highlightsEl.className = 'highlights empty-list';
    highlightsEl.textContent = 'No strong suggestions were found. You can still set start/end times manually.';
    return;
  }

  highlightsEl.className = 'highlights';
  highlightsEl.innerHTML = items.map((c, idx) => `
    <article class="highlight" data-index="${idx}">
      <div class="highlight-top"><span>${idx === 0 ? '★ Best pick • ' : ''}${fmt(c.start)} – ${fmt(c.end)} • ${Math.round(c.end - c.start)}s</span><span class="score">${c.scoreLabel || `score ${c.score}`}</span></div>
      <p>${escapeHtml(c.text.slice(0, 230))}${c.text.length > 230 ? '…' : ''}</p>
    </article>
  `).join('');

  [...highlightsEl.querySelectorAll('.highlight')].forEach(card => {
    card.addEventListener('click', () => selectHighlight(Number(card.dataset.index), true));
  });
}

function selectHighlight(index, play = false) {
  const item = currentHighlights[index];
  if (!item) return;
  selectedHighlightIndex = index;
  highlightsEl.querySelectorAll('.highlight').forEach((x, i) => x.classList.toggle('active', i === index));
  startTime.value = item.start.toFixed(1);
  endTime.value = item.end.toFixed(1);
  preview.currentTime = item.start;
  generateSeoForText(item.text);
  if (play) preview.play().catch(() => {});
}

const STOPWORDS = new Set(`a an and are as at be been but by can could did do does for from had has have he her hers him his how i if in into is it its just me more most my no not of on or our ours out over really so than that the their them then there these they this those to too up us very was we were what when where which who why will with would you your yours im ive im youre yeah yes like get got gonna dont didnt cant wont thats theres heres okay ok right one two three also about after again all am any because before being below between both during each few further here itself myself once only other same she should some such through under until while yourself ourselves`.split(/\s+/));

function wordsFrom(text) {
  return String(text).toLowerCase().replace(/['’]/g, '').match(/[a-z0-9][a-z0-9-]{2,}/g) || [];
}

function getKeywords(text, max = 10) {
  const words = wordsFrom(text).filter(w => !STOPWORDS.has(w) && !/^\d+$/.test(w));
  const freq = new Map();
  words.forEach(w => freq.set(w, (freq.get(w) || 0) + 1));
  const singles = [...freq.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).map(([w]) => w);

  const bigrams = [];
  for (let i = 0; i < words.length - 1; i++) {
    if (words[i] !== words[i + 1]) bigrams.push(`${words[i]} ${words[i + 1]}`);
  }
  const bf = new Map();
  bigrams.forEach(b => bf.set(b, (bf.get(b) || 0) + 1));
  const phrases = [...bf.entries()].sort((a, b) => b[1] - a[1]).filter(([, count]) => count > 1).map(([p]) => p);

  return [...new Set([...phrases, ...singles])].slice(0, max);
}

function cleanSentence(text) {
  return String(text)
    .replace(/\s+/g, ' ')
    .replace(/^[,.;:!?\s-]+|[,.;:\s-]+$/g, '')
    .replace(/\b(um+|uh+|erm|ah+)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(text) {
  const keepLower = new Set(['a','an','and','as','at','but','by','for','in','of','on','or','the','to','with']);
  return text.split(/\s+/).map((word, i) => {
    if (!word) return word;
    if (i > 0 && keepLower.has(word.toLowerCase())) return word.toLowerCase();
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

function makeSeoTitle(text) {
  const sentences = cleanSentence(text).split(/(?<=[.!?])\s+/).map(cleanSentence).filter(Boolean);
  let candidate = sentences.find(s => s.length >= 25 && s.length <= 78) || sentences[0] || cleanSentence(text);
  candidate = candidate.replace(/[.!?]+$/g, '');
  const words = candidate.split(/\s+/).filter(Boolean);
  if (words.length > 11) candidate = words.slice(0, 11).join(' ');
  candidate = titleCase(candidate);
  if (candidate.length > 68) candidate = candidate.slice(0, 65).replace(/\s+\S*$/, '') + '…';
  return candidate || 'Must-See Video Highlight';
}

function hashtagify(keyword) {
  const cleaned = keyword.replace(/[^a-z0-9 ]/gi, ' ').trim().split(/\s+/).slice(0, 3).map((part, i) => {
    const x = part.toLowerCase();
    return i === 0 ? x : x.charAt(0).toUpperCase() + x.slice(1);
  }).join('');
  return cleaned ? `#${cleaned}` : '';
}

function generateSeoForText(text) {
  const clean = cleanSentence(text);
  const keywords = getKeywords(clean, 10);
  const fileTopic = baseFileName(inputFile?.name || '');
  const sourceTitle = cleanSourceTitle(sourceMeta?.title || '');
  const title = sourceMeta?.kind === 'animal-generator' && sourceMeta?.title
    ? cleanSourceTitle(sourceMeta.title).slice(0, 100)
    : (!transcriptText.trim() && sourceTitle ? makeSeoTitle(sourceTitle) : makeSeoTitle(clean));
  const excerpt = clean.length > 340 ? `${clean.slice(0, 337).replace(/\s+\S*$/, '')}…` : clean;
  const hashtags = [...new Set(['#Shorts', ...keywords.slice(0, 4).map(hashtagify).filter(Boolean)])].join(' ');
  const tagItems = [...new Set([
    ...keywords,
    ...keywords.slice(0, 4).map(k => `${k} shorts`),
    ...(fileTopic ? [fileTopic, `${fileTopic} shorts`] : []),
    'youtube shorts',
    'short video'
  ])].filter(Boolean);

  const attribution = sourceMeta?.attribution ? `\n\nSource / attribution:\n${sourceMeta.attribution}` : '';
  seoTitle.value = title;
  seoDescription.value = `${title}\n\n${excerpt}\n\n${hashtags}${attribution}`.slice(0, 5000);
  seoTags.value = tagItems.join(', ').slice(0, 480);
  seoHashtags.value = hashtags;
  setSeoButtons(true);
}

function getSelectedText() {
  return currentHighlights[selectedHighlightIndex]?.text || transcriptText || '';
}

async function runAutomaticAnalysis(fromUpload = false) {
  if (!inputFile || analysisRunning) return;
  analysisRunning = true;
  aiButton.disabled = true;
  exportButton.disabled = true;
  downloadPanel.classList.add('hidden');

  try {
    if (sourceMeta?.kind === 'animal-generator' && (sourceMeta?.story || sourceMeta?.captions?.length)) {
      const duration = Number.isFinite(preview.duration) ? preview.duration : Number(clipLength.value) || 24;
      const target = Math.min(Math.max(9, Number(sourceMeta?.targetDuration) || Number(clipLength.value) || 24), Math.max(1, duration));
      transcriptChunks = buildStoryChunks(sourceMeta, target);
      renderTranscript();
      const text = sourceMeta?.story || transcriptText || cleanSourceTitle(sourceMeta?.title || inputFile?.name || '') || 'Animal Short';
      const score = autoPickScore(target, target, true);
      renderHighlights([{ start: 0, end: target, text, score, scoreLabel: `AUTO score ${score}` }]);
      selectHighlight(0, false);
      setStatus('Animal Short package ready', 88, autoExport.checked ? 'Vertical 9:16 montage, story captions, SEO and thumbnail are ready. Exporting now…' : 'Animal Short is ready to export.');
      if (autoExport.checked) await exportSelectedClip(true);
      else setStatus('Automatic animal package complete', 100, 'Story captions, SEO and thumbnail are ready.');
      return;
    }

    const pcm = await extractAudio();
    const asr = await ensureTranscriber();
    setStatus('Transcribing with AI', 55, 'This runs on your device. Longer videos take longer, especially on phones.');
    const result = await asr(pcm, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
      language: 'en',
      task: 'transcribe'
    });

    transcriptChunks = normalizeChunks(result);
    renderTranscript();
    const picks = buildHighlights();
    renderHighlights(picks);

    if (picks[0]) {
      selectHighlight(0, false);
      setStatus('Best clip + YouTube SEO ready', 88, autoExport.checked ? 'Auto-exporting the best clip now…' : 'Review the selected clip or export it when ready.');
      if (autoExport.checked) await exportSelectedClip(true);
      else setStatus('Automatic AI complete', 100, 'Best clip selected and YouTube SEO generated.');
    } else {
      const duration = Number.isFinite(preview.duration) ? preview.duration : Number(clipLength.value) || 45;
      const target = Math.min(Math.max(12, Number(clipLength.value) || 45), Math.max(1, duration));
      const fallbackStart = Math.max(0, (duration - target) * 0.35);
      const fallbackEnd = Math.min(duration, fallbackStart + target);
      const fallbackText = transcriptText.trim() || sourceMeta?.story || cleanSourceTitle(sourceMeta?.title || '') || baseFileName(inputFile?.name || '') || 'Video highlight';
      const fallbackScore = autoPickScore(fallbackEnd - fallbackStart, target, Boolean(sourceMeta));
      renderHighlights([{ start: fallbackStart, end: fallbackEnd, text: fallbackText, score: fallbackScore, scoreLabel: `AUTO score ${fallbackScore}` }]);
      selectHighlight(0, false);
      setStatus('Fallback highlight ready', 88, autoExport.checked ? 'No strong spoken highlight was found, so FULL AUTO selected a timed clip and is exporting it now…' : 'A timed fallback clip is selected.');
      if (autoExport.checked) await exportSelectedClip(true);
      else setStatus('Automatic analysis complete', 100, 'Timed fallback clip selected and YouTube SEO generated.');
    }
  } catch (err) {
    console.error(err);
    if (autoMode.checked && autoExport.checked && inputFile && Number.isFinite(preview.duration) && preview.duration > 0) {
      try {
        const duration = preview.duration;
        const target = Math.min(Math.max(12, Number(clipLength.value) || 45), duration);
        const start = Math.max(0, (duration - target) * 0.35);
        const end = Math.min(duration, start + target);
        const text = sourceMeta?.story || cleanSourceTitle(sourceMeta?.title || '') || baseFileName(inputFile?.name || '') || 'Video highlight';
        const fallbackScore = autoPickScore(end - start, target, Boolean(sourceMeta));
        renderHighlights([{ start, end, text, score: fallbackScore, scoreLabel: `AUTO score ${fallbackScore}` }]);
        selectHighlight(0, false);
        setStatus('Using no-transcript fallback', 75, 'Speech AI could not finish, so FULL AUTO is creating a timed clip with source-based SEO instead.');
        await exportSelectedClip(true);
        return;
      } catch (fallbackErr) {
        console.error('Fallback export failed', fallbackErr);
      }
    }
    setStatus('AI could not finish', 0, 'This device could not finish the automatic workflow. Try a shorter or smaller source video.');
    if (!fromUpload) alert(`AI processing could not finish on this device.\n\n${err?.message || err}`);
  } finally {
    analysisRunning = false;
    aiButton.disabled = false;
    exportButton.disabled = false;
  }
}

aiButton.addEventListener('click', () => runAutomaticAnalysis(false));

function getVideoFilter(format) {
  if (format === '9:16') return 'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280';
  if (format === '1:1') return 'scale=900:900:force_original_aspect_ratio=increase,crop=900:900';
  if (format === '16:9') return 'scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720';
  return null;
}

async function waitForSeek(targetTime) {
  if (!Number.isFinite(preview.duration) || !preview.videoWidth) return;
  const safe = Math.max(0, Math.min(targetTime, Math.max(0, preview.duration - 0.05)));
  if (Math.abs(preview.currentTime - safe) < 0.05) return;
  await new Promise((resolve) => {
    let done = false;
    const finish = () => { if (done) return; done = true; preview.removeEventListener('seeked', finish); resolve(); };
    preview.addEventListener('seeked', finish, { once: true });
    preview.currentTime = safe;
    setTimeout(finish, 1800);
  });
}

function wrapCanvasText(ctx, text, maxWidth, maxLines = 3) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
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

async function buildAutoThumbnail(title) {
  try {
    if (!preview.videoWidth || !preview.videoHeight) return null;
    const oldTime = preview.currentTime;
    const start = Math.max(0, Number(startTime.value) || 0);
    const end = Math.max(start, Number(endTime.value) || start);
    await waitForSeek(start + Math.max(0, end - start) * 0.45);
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    const vw = preview.videoWidth;
    const vh = preview.videoHeight;
    const targetRatio = canvas.width / canvas.height;
    const videoRatio = vw / vh;
    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (videoRatio > targetRatio) {
      sw = vh * targetRatio;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / targetRatio;
      sy = (vh - sh) / 2;
    }
    ctx.drawImage(preview, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const gradient = ctx.createLinearGradient(0, 350, 0, 720);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,.82)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 300, 1280, 420);
    const badgeText = sourceMeta?.kind === 'animal-generator' ? 'WILDLIFE SHORT' : 'NEW SHORT';
    ctx.font = '800 30px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.96)';
    ctx.fillText(badgeText, 82, 430);
    ctx.fillStyle = 'rgba(0,0,0,.58)';
    ctx.fillRect(66, 382, Math.max(235, ctx.measureText(badgeText).width + 44), 64);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(badgeText, 88, 426);
    ctx.font = '900 74px Arial, sans-serif';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = 'rgba(0,0,0,.82)';
    ctx.shadowBlur = 16;
    const cleanTitle = cleanSourceTitle(title || '') || 'Amazing Animal Moment';
    const lines = wrapCanvasText(ctx, cleanTitle, 1110, 3);
    const lineHeight = 86;
    const startY = 660 - (lines.length - 1) * lineHeight;
    lines.forEach((line, i) => ctx.fillText(line, 80, startY + i * lineHeight, 1110));
    preview.currentTime = oldTime;
    return await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .9));
  } catch (err) {
    console.warn('Thumbnail generation skipped', err);
    return null;
  }
}

async function exportSelectedClip(isAutomatic = false) {
  if (!inputFile || exportRunning) return;
  const start = Math.max(0, Number(startTime.value) || 0);
  const end = Math.max(start + 0.2, Number(endTime.value) || Math.min(start + 30, preview.duration || start + 30));
  const duration = end - start;
  if (duration <= 0) return alert('End time must be after start time.');

  exportRunning = true;
  exportButton.disabled = true;
  aiButton.disabled = true;
  downloadPanel.classList.add('hidden');

  try {
    const ff = await ensureFFmpeg();
    try { await ff.deleteFile(inputName); } catch {}
    try { await ff.deleteFile('output.mp4'); } catch {}
    await ff.writeFile(inputName, await fetchFile(inputFile));
    const filter = getVideoFilter(ratio.value);
    const args = ['-ss', start.toFixed(3), '-i', inputName, '-t', duration.toFixed(3)];
    if (filter) args.push('-vf', filter);
    args.push('-c:v','libx264','-preset','ultrafast','-crf','24','-c:a','aac','-b:a','128k','-movflags','+faststart','output.mp4');
    setStatus(isAutomatic ? 'Auto-exporting best clip' : 'Exporting clip', 10, 'Encoding locally. Keep this tab open until it finishes.');
    await ff.exec(args);
    const data = await ff.readFile('output.mp4');
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    const outputBlob = new Blob([data.buffer], { type: 'video/mp4' });
    outputUrl = URL.createObjectURL(outputBlob);
    downloadLink.href = outputUrl;
    const safeTitle = (seoTitle.value || 'clipfree-ai-youtube-short').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 58);
    const outputFilename = `${safeTitle || 'clipfree-ai-youtube-short'}.mp4`;
    downloadLink.download = outputFilename;
    const thumbnailBlob = await buildAutoThumbnail(seoTitle.value || 'YouTube Short');
    window.ClipFreeExport = {
      blob: outputBlob,
      filename: outputFilename,
      title: seoTitle.value || 'YouTube Short',
      description: seoDescription.value || '',
      tags: seoTags.value || '',
      hashtags: seoHashtags.value || '',
      srt: buildSelectedSrt(),
      thumbnailBlob,
      source: sourceMeta ? { ...sourceMeta } : null,
      createdAt: new Date().toISOString(),
    };
    window.dispatchEvent(new CustomEvent('clipfree-export-ready', { detail: window.ClipFreeExport }));
    downloadPanel.classList.remove('hidden');
    setStatus('Automatic clip ready', 100, 'No watermark was added. The clip is also ready in the YouTube Upload section.');
  } catch (err) {
    console.error(err);
    setStatus('Export failed', 0, 'Try a shorter clip, Original format, or a smaller source video.');
    if (!isAutomatic) alert(`Clip export failed.\n\n${err?.message || err}`);
  } finally {
    exportRunning = false;
    exportButton.disabled = false;
    aiButton.disabled = false;
  }
}

async function createMontageFromFiles(files, options = {}) {
  const usable = Array.from(files || []).filter(Boolean).slice(0, 4);
  if (!usable.length) throw new Error('No source clips were provided for the montage.');
  const ff = await ensureFFmpeg();
  const targetSeconds = Math.max(9, Math.min(32, Number(options.duration) || 24));
  const perClip = Math.max(3, targetSeconds / usable.length);
  const segments = [];
  setStatus('Building animal montage', 18, `Preparing ${usable.length} reusable source clip${usable.length === 1 ? '' : 's'}…`);

  for (let i = 0; i < usable.length; i++) {
    const file = usable[i];
    const ext = getInputExtension(file);
    const inName = `montage_input_${i}.${ext}`;
    const outName = `montage_segment_${i}.mp4`;
    try { await ff.deleteFile(inName); } catch {}
    try { await ff.deleteFile(outName); } catch {}
    await ff.writeFile(inName, await fetchFile(file));
    try {
      await ff.exec([
        '-i', inName, '-t', perClip.toFixed(2),
        '-vf', 'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=24',
        '-an', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '24', '-pix_fmt', 'yuv420p', outName
      ]);
      segments.push(outName);
    } catch (err) {
      console.warn('Skipping montage source that could not be converted', file?.name, err);
    }
  }

  if (!segments.length) throw new Error('The browser could not convert any of the selected animal source clips. Try again with another topic.');
  const concatName = 'montage_list.txt';
  const silentName = 'animal-montage-silent.mp4';
  const montageName = 'animal-montage.mp4';
  for (const name of [concatName, silentName, montageName, 'animal_sound_input']) { try { await ff.deleteFile(name); } catch {} }
  const listText = segments.map(name => `file '${name}'`).join('\n');
  await ff.writeFile(concatName, new TextEncoder().encode(listText));
  await ff.exec(['-f', 'concat', '-safe', '0', '-i', concatName, '-c', 'copy', '-movflags', '+faststart', silentName]);

  let usedAnimalSound = false;
  if (options.audioFile) {
    const audioExt = getInputExtension(options.audioFile) || 'ogg';
    const audioName = `animal_sound_input.${audioExt}`;
    try { await ff.deleteFile(audioName); } catch {}
    await ff.writeFile(audioName, await fetchFile(options.audioFile));
    const fadeOutAt = Math.max(0.5, targetSeconds - 0.8).toFixed(2);
    try {
      await ff.exec([
        '-i', silentName, '-stream_loop', '-1', '-i', audioName,
        '-map', '0:v:0', '-map', '1:a:0', '-t', targetSeconds.toFixed(2),
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
        '-af', `volume=0.82,afade=t=in:st=0:d=0.35,afade=t=out:st=${fadeOutAt}:d=0.8`,
        '-movflags', '+faststart', '-shortest', montageName
      ]);
      usedAnimalSound = true;
    } catch (err) {
      console.warn('Real animal sound could not be mixed; keeping the visual montage', err);
    }
  }
  if (!usedAnimalSound) {
    await ff.exec(['-i', silentName, '-c', 'copy', '-movflags', '+faststart', montageName]);
  }

  const data = await ff.readFile(montageName);
  const blob = new Blob([data.buffer], { type: 'video/mp4' });
  const file = new File([blob], options.filename || 'clipfree-ai-animal-short.mp4', { type: 'video/mp4' });
  file.clipfreeUsedAnimalSound = usedAnimalSound;
  setStatus('Animal montage ready', 45, usedAnimalSound ? 'Vertical 9:16 montage created with real open-licensed animal audio.' : 'Vertical 9:16 montage created. No matching animal audio could be mixed, so the video remains clean and ready for captions.');
  return file;
}

window.ClipFreeAutomation = {
  loadVideoFile,
  runAutomaticAnalysis,
  exportSelectedClip,
  createMontageFromFiles,
  setSourceMeta(meta) {
    sourceMeta = meta && typeof meta === 'object' ? { ...meta } : null;
    window.ClipFreeSource = sourceMeta;
    if (transcriptText) generateSeoForText(getSelectedText());
  },
  getState() {
    return {
      hasInput: Boolean(inputFile),
      analysisRunning,
      exportRunning,
      source: sourceMeta ? { ...sourceMeta } : null,
    };
  },
};

exportButton.addEventListener('click', () => exportSelectedClip(false));

copyTranscript.addEventListener('click', async () => {
  if (!transcriptText) return;
  await navigator.clipboard.writeText(transcriptText);
  const old = copyTranscript.textContent;
  copyTranscript.textContent = 'Copied';
  setTimeout(() => copyTranscript.textContent = old, 1300);
});

async function copyText(text, button, doneLabel = 'Copied') {
  if (!text) return;
  await navigator.clipboard.writeText(text);
  const old = button.textContent;
  button.textContent = doneLabel;
  setTimeout(() => button.textContent = old, 1300);
}

document.querySelectorAll('.copy-field').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const field = $(btn.dataset.copy);
    copyText(field?.value || '', btn);
  });
});

copySeo.addEventListener('click', () => {
  const all = `TITLE\n${seoTitle.value}\n\nDESCRIPTION\n${seoDescription.value}\n\nTAGS\n${seoTags.value}\n\nHASHTAGS\n${seoHashtags.value}`;
  copyText(all, copySeo, 'Copied all');
});

function downloadTextFile(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

downloadSeo.addEventListener('click', () => {
  const all = `YOUTUBE TITLE\n${seoTitle.value}\n\nDESCRIPTION\n${seoDescription.value}\n\nTAGS / KEYWORDS\n${seoTags.value}\n\nHASHTAGS\n${seoHashtags.value}\n`;
  downloadTextFile('youtube-seo-pack.txt', all);
});

function srtTime(seconds) {
  const msTotal = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(msTotal / 3600000);
  const m = Math.floor((msTotal % 3600000) / 60000);
  const s = Math.floor((msTotal % 60000) / 1000);
  const ms = msTotal % 1000;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms).padStart(3,'0')}`;
}

function buildSelectedSrt() {
  const start = Math.max(0, Number(startTime.value) || 0);
  const end = Math.max(start, Number(endTime.value) || preview.duration || start);
  const included = transcriptChunks.filter(c => c.timestamp[1] > start && c.timestamp[0] < end);
  if (included.length) {
    return included.map((c, i) => {
      const relStart = Math.max(0, c.timestamp[0] - start);
      const relEnd = Math.max(relStart + 0.2, Math.min(end, c.timestamp[1]) - start);
      return `${i + 1}\n${srtTime(relStart)} --> ${srtTime(relEnd)}\n${c.text.trim()}\n`;
    }).join('\n');
  }

  const fallbackCaptions = Array.isArray(sourceMeta?.captions) ? sourceMeta.captions.map(x => String(x || '').trim()).filter(Boolean) : [];
  if (!fallbackCaptions.length) return '';
  const total = Math.max(1, end - start);
  const segment = total / fallbackCaptions.length;
  return fallbackCaptions.map((text, i) => {
    const relStart = i * segment;
    const relEnd = Math.min(total, (i + 1) * segment);
    return `${i + 1}\n${srtTime(relStart)} --> ${srtTime(Math.max(relStart + 0.2, relEnd))}\n${text}\n`;
  }).join('\n');
}

downloadSrt.addEventListener('click', () => {
  const srt = buildSelectedSrt();
  if (!srt) return alert('No timestamped transcript is available for this clip yet.');
  downloadTextFile('youtube-short-captions.srt', srt, 'application/x-subrip;charset=utf-8');
});

[startTime, endTime].forEach(input => {
  input.addEventListener('change', () => {
    if (!transcriptChunks.length) return;
    const start = Number(startTime.value) || 0;
    const end = Number(endTime.value) || start;
    const text = transcriptChunks.filter(c => c.timestamp[1] > start && c.timestamp[0] < end).map(c => c.text).join(' ');
    if (text.trim()) generateSeoForText(text);
  });
});
