// Multiple payment proofs per buyer. `proofUrl` stays the primary proof (every
// legacy reader keys off it); `proofUrls` holds the full ordered list.

export const MAX_PAYMENT_PROOFS = 3;

// Full proof list for a profile, tolerating legacy single-proof docs.
export function normalizeProofUrls(profile = {}) {
  const list = Array.isArray(profile?.proofUrls)
    ? profile.proofUrls.filter((url) => typeof url === 'string' && url.trim() !== '')
    : [];
  if (list.length > 0) return list.slice(0, MAX_PAYMENT_PROOFS);
  const single = typeof profile?.proofUrl === 'string' ? profile.proofUrl.trim() : '';
  return single ? [single] : [];
}

// Append a new proof; refuses past the cap (caller shows the toast).
export function appendProofUrl(urls = [], url = '', max = MAX_PAYMENT_PROOFS) {
  const clean = String(url || '').trim();
  if (!clean) return null;
  const list = (urls || []).filter((entry) => typeof entry === 'string' && entry.trim() !== '');
  if (list.length >= max) return null;
  return [...list, clean];
}

// Replace one slot in place; index must exist.
export function replaceProofUrlAt(urls = [], index = 0, url = '') {
  const clean = String(url || '').trim();
  const list = (urls || []).filter((entry) => typeof entry === 'string' && entry.trim() !== '');
  if (!clean || index < 0 || index >= list.length) return null;
  const next = [...list];
  next[index] = clean;
  return next;
}

// Remove one slot. Returns the shorter list (possibly empty); null on bad index.
// Callers enforce the "keep at least one proof" policy — this only does the removal.
export function removeProofUrlAt(urls = [], index = 0) {
  const list = (urls || []).filter((entry) => typeof entry === 'string' && entry.trim() !== '');
  if (index < 0 || index >= list.length) return null;
  return list.filter((_, i) => i !== index);
}

// Firestore payload keeping proofUrl (primary) and proofUrls in lockstep.
export function buildProofUrlsPayload(urls = []) {
  const list = (urls || []).filter((entry) => typeof entry === 'string' && entry.trim() !== '');
  return {
    proofUrls: list.slice(0, MAX_PAYMENT_PROOFS),
    proofUrl: list[0] || null,
  };
}

// One shape for every export surface (Sheet push, CSV). `all` feeds the Drive
// archiver in the Apps Script; `joined` is the human-readable cell.
export function buildProofExportFields(customer = {}) {
  const all = normalizeProofUrls(customer);
  return {
    primary: all[0] || '',
    all,
    joined: all.join(' | '),
    count: all.length,
  };
}
