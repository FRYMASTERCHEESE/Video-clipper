/* CLIPFREE HUMAN UPLOAD APPROVAL GATE v42
   Safety rule:
   - Generated animal Shorts may prepare in the browser.
   - The actual YouTube videos.insert upload request is HELD until the user
     explicitly presses the final "APPROVE + UPLOAD TO YOUTUBE" button.
   - One approval token permits one video upload only.
   - Manual non-animal uploads are not intercepted.
*/
(() => {
  'use strict';

  if (window.__clipfreeApprovalGateV42) return;
  window.__clipfreeApprovalGateV42 = true;

  const NativeXHR = window.XMLHttpRequest;
  if (!NativeXHR?.prototype) return;

  const nativeOpen = NativeXHR.prototype.open;
  const nativeSend = NativeXHR.prototype.send;

  const pending = new Set();

  window.__clipfreeUploadApprovalTokens =
    Number(window.__clipfreeUploadApprovalTokens || 0);

  function isYouTubeVideoUpload(xhr) {
    return Boolean(xhr?.__clipfreeV42VideoUpload);
  }

  function isGeneratedAnimalFlow() {
    const exp = window.ClipFreeExport;
    return (
      window.__clipfreeRequireHumanApproval === true ||
      document.getElementById('clipfreeV40Review') ||
      exp?.kind === 'animal-generator'
    );
  }

  function takeToken() {
    const n = Number(window.__clipfreeUploadApprovalTokens || 0);
    if (n <= 0) return false;
    window.__clipfreeUploadApprovalTokens = n - 1;
    return true;
  }

  function actuallySend(xhr, body) {
    if (!xhr || xhr.__clipfreeV42ActuallySent) return;
    xhr.__clipfreeV42ActuallySent = true;
    pending.delete(xhr);
    nativeSend.call(xhr, body);
  }

  function flushApprovedUpload() {
    if (!pending.size) return;

    for (const xhr of [...pending]) {
      if (!takeToken()) break;
      actuallySend(xhr, xhr.__clipfreeV42HeldBody);
    }
  }

  function cancelHeldUploads() {
    window.__clipfreeUploadApprovalTokens = 0;

    for (const xhr of [...pending]) {
      pending.delete(xhr);
      xhr.__clipfreeV42HeldBody = null;

      // xhrUpload() listens for onerror, so this cleanly rejects the waiting
      // Promise and lets ClipFree end the cancelled job without sending bytes.
      try {
        if (typeof xhr.onerror === 'function') {
          xhr.onerror(new Event('error'));
        }
      } catch {}
    }
  }

  NativeXHR.prototype.open = function(method, url, ...rest) {
    const text = String(url || '');
    this.__clipfreeV42VideoUpload =
      String(method || '').toUpperCase() === 'POST' &&
      /https:\/\/www\.googleapis\.com\/upload\/youtube\/v3\/videos(?:\?|$)/i.test(text);

    return nativeOpen.call(this, method, url, ...rest);
  };

  NativeXHR.prototype.send = function(body) {
    if (!isYouTubeVideoUpload(this) || !isGeneratedAnimalFlow()) {
      return nativeSend.call(this, body);
    }

    if (takeToken()) {
      return actuallySend(this, body);
    }

    this.__clipfreeV42HeldBody = body;
    pending.add(this);

    try {
      window.dispatchEvent(new CustomEvent('clipfree-upload-held-for-review', {
        detail: { pending: pending.size }
      }));
    } catch {}

    // Intentionally do NOT send yet.
    return undefined;
  };

  window.addEventListener('clipfree-human-upload-approved', flushApprovedUpload);
  window.addEventListener('clipfree-human-upload-cancelled', cancelHeldUploads);

  window.CLIPFREE_UPLOAD_APPROVAL_GATE_V42 = {
    version: '42.0',
    enabled: true,
    pendingCount: () => pending.size,
    approvalTokens: () => Number(window.__clipfreeUploadApprovalTokens || 0)
  };
})();
