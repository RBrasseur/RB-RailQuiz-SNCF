const STORAGE_KEYS = {
  PROGRESS: 'railquiz_sncf_progress_v1',
  SETTINGS: 'railquiz_sncf_settings_v1',
  LOCAL_PACKS: 'railquiz_sncf_local_packs_v1'
};

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    return raw ? JSON.parse(raw) : { history: {} };
  } catch {
    return { history: {} };
  }
}

export function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
}

export function recordQuestionResult(questionId, isCorrect) {
  const progress = loadProgress();
  const prev = progress.history[questionId] || { attempts: 0, failures: 0, lastResult: null, lastSeen: null };
  progress.history[questionId] = {
    attempts: prev.attempts + 1,
    failures: isCorrect ? prev.failures : prev.failures + 1,
    lastResult: isCorrect ? 'ok' : 'ko',
    lastSeen: new Date().toISOString()
  };
  saveProgress(progress);
  return progress;
}

export function resetProgress() {
  localStorage.removeItem(STORAGE_KEYS.PROGRESS);
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return raw
      ? JSON.parse(raw)
      : { theme: 'dark', aiProvider: 'none', apiKey: '', customUrl: '', customModel: '' };
  } catch {
    return { theme: 'dark', aiProvider: 'none', apiKey: '', customUrl: '', customModel: '' };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

export function loadLocalPacks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_PACKS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalPack(pack) {
  const packs = loadLocalPacks();
  const idx = packs.findIndex(p => p.packId === pack.packId);
  if (idx >= 0) packs[idx] = pack;
  else packs.push(pack);
  localStorage.setItem(STORAGE_KEYS.LOCAL_PACKS, JSON.stringify(packs));
}
