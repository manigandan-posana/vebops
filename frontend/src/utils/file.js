// src/utils/file.js
// src/utils/file.js

/** Convert whatever we got into a Blob safely */
function toBlob(data, mime) {
  if (data instanceof Blob) return data;

  // If we got an ArrayBuffer or a TypedArray, wrap as-is (binary safe)
  if (data instanceof ArrayBuffer) return new Blob([data], { type: mime || 'application/octet-stream' });
  if (ArrayBuffer.isView(data)) return new Blob([data.buffer], { type: mime || 'application/octet-stream' });

  // If string, write raw bytes (not JSON/stringified), still binary-safe for PDF content already in Blob
  if (typeof data === 'string') return new Blob([data], { type: mime || 'application/octet-stream' });

  // Fallback
  return new Blob([data], { type: mime || 'application/octet-stream' });
}

/** Guess extension from a mime type (used only when needed) */
function guessExtension(mime) {
  if (!mime) return '';
  const m = mime.toLowerCase();
  if (m === 'application/pdf') return '.pdf';
  if (m === 'image/png') return '.png';
  if (m === 'image/jpeg' || m === 'image/jpg') return '.jpg';
  if (m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return '.docx';
  if (m === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return '.xlsx';
  if (m === 'application/zip') return '.zip';
  return '';
}

/** Sanitize filename and ensure an extension if none is present */
export function normalizeFilename(name, mime) {
  let safe = String(name || 'download')
    .replace(/[/\\?%*:|"<>]/g, '-')       // remove illegal chars
    .replace(/\s+/g, ' ')                 // collapse spaces
    .trim();

  // If no dot present (or ends with a dot), append an inferred extension
  if (!/\.[A-Za-z0-9]{2,6}$/.test(safe)) {
    const ext = guessExtension(mime);
    if (ext) safe += ext;
  }
  return safe || 'download';
}

/** Robust client-side download */
export function downloadBlob(data, filename, mime) {
  const blob = toBlob(data, mime || (data instanceof Blob ? data.type : undefined));
  const finalName = normalizeFilename(filename, blob.type);

  const url = (window.URL || window.webkitURL).createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = finalName;
  a.rel = 'noopener';

  // Safari sometimes needs the element in DOM and a real click event
  document.body.appendChild(a);
  try {
    a.click(); // most browsers
    // extra nudge for Safari
    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  } finally {
    a.remove();
    // short delay prevents some browsers from aborting the download
    setTimeout(() => (window.URL || window.webkitURL).revokeObjectURL(url), 1000);
  }
}

/** Parse RFC5987 and common filename patterns from Content-Disposition */
export function extractFilename(contentDisposition) {
  if (!contentDisposition) return null;

  // filename*=UTF-8''encoded
  const star = /filename\*\s*=\s*[^']*''([^;]+)/i.exec(contentDisposition);
  if (star && star[1]) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      // fall through if bad encoding
      return star[1].trim();
    }
  }

  // filename="quoted"
  const quoted = /filename\s*=\s*"([^"]+)"/i.exec(contentDisposition);
  if (quoted && quoted[1]) return quoted[1].trim();

  // filename=plain
  const plain = /filename\s*=\s*([^;]+)/i.exec(contentDisposition);
  if (plain && plain[1]) return plain[1].trim().replace(/^['"]|['"]$/g, '');

  return null;
}
