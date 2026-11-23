import {
  loadProgress,
  saveProgress,
  recordQuestionResult,
  resetProgress,
  loadSettings,
  saveSettings,
  loadLocalPacks,
  saveLocalPack
} from './storage.js';
import { filterQuestions, createSessionQuestions } from './quiz-engine.js';
import { evaluateOpenAnswerWithAI } from './ai-evaluator.js';

const state = {
  allQuestions: [],
  selectedSubthemes: new Set(),
  settings: loadSettings(),
  progress: loadProgress(),
  session: {
    questions: [],
    currentIndex: 0,
    mode: 'training',
    results: []
  }
};

const $ = id => document.getElementById(id);

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  $(viewId).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

async function loadCorpus() {
  const loadedQuestions = [];
  let packCount = 0;

  try {
    const manifestRes = await fetch('./data/manifest.json', { cache: 'no-cache' });
    if (manifestRes.ok) {
      const manifest = await manifestRes.json();
      for (const file of manifest.files || []) {
        try {
          const packRes = await fetch(`./data/${file}`, { cache: 'no-cache' });
          if (packRes.ok) {
            const pack = await packRes.json();
            if (Array.isArray(pack.questions)) {
              loadedQuestions.push(...pack.questions);
              packCount++;
            }
          }
        } catch (err) {
          console.warn('Impossible de charger le pack:', file, err);
        }
      }
    }
  } catch (err) {
    console.warn('Manifest distant indisponible (mode hors-ligne ou local):', err);
  }

  const localPacks = loadLocalPacks();
  for (const pack of localPacks) {
    if (Array.isArray(pack.questions)) {
      const existingIds = new Set(loadedQuestions.map(q => q.id));
      for (const q of pack.questions) {
        if (!existingIds.has(q.id)) loadedQuestions.push(q);
      }
      packCount++;
    }
  }

  state.allQuestions = loadedQuestions;
  $('corpus-status').textContent = `${loadedQuestions.length} question${loadedQuestions.length > 1 ? 's' : ''} (${packCount} lot${packCount > 1 ? 's' : ''})`;

  state.selectedSubthemes.clear();
  for (const q of state.allQuestions) {
    state.selectedSubthemes.add(`${q.theme}::${q.subtheme}`);
  }

  renderThemesTree();
  updateDashboardStats();
  updateMatchingCounter();
}

function updateDashboardStats() {
  state.progress = loadProgress();
  const total = state.allQuestions.length;
  let weak = 0;
  let mastered = 0;

  for (const q of state.allQuestions) {
    const rec = state.progress.history[q.id];
    if (rec?.lastResult === 'ko') weak++;
    else if (rec?.lastResult === 'ok') mastered++;
  }

  $('stat-total-questions').textContent = total;
  $('stat-weak-count').textContent = weak;
  $('stat-mastered-count').textContent = mastered;
}

function renderThemesTree() {
  const container = $('themes-tree');
  container.innerHTML = '';

  const tree = new Map();
  for (const q of state.allQuestions) {
    if (!tree.has(q.theme)) tree.set(q.theme, new Map());
    const subMap = tree.get(q.theme);
    subMap.set(q.subtheme, (subMap.get(q.subtheme) || 0) + 1);
  }

  if (tree.size === 0) {
    container.innerHTML = '<p class="hint">Aucune question disponible. Ajoutez un fichier JSON dans /data/ ou importez-en un dans Paramètres.</p>';
    return;
  }

  for (const [theme, subMap] of tree.entries()) {
    const group = document.createElement('div');
    group.className = 'theme-group';

    const subKeys = [...subMap.keys()].map(sub => `${theme}::${sub}`);
    const allChecked = subKeys.every(k => state.selectedSubthemes.has(k));
    const totalInTheme = [...subMap.values()].reduce((a, b) => a + b, 0);

    const header = document.createElement('div');
    header.className = 'theme-header';
    header.innerHTML = `
      <label class="theme-label-wrap">
        <input type="checkbox" class="chk-theme" ${allChecked ? 'checked' : ''} />
        <span>${escapeHtml(theme)}</span>
      </label>
      <span class="count-pill">${totalInTheme} q.</span>
    `;

    const themeChk = header.querySelector('.chk-theme');
    themeChk.addEventListener('change', () => {
      for (const k of subKeys) {
        if (themeChk.checked) state.selectedSubthemes.add(k);
        else state.selectedSubthemes.delete(k);
      }
      renderThemesTree();
      updateMatchingCounter();
    });

    const subList = document.createElement('div');
    subList.className = 'subthemes-list';

    for (const [subtheme, count] of subMap.entries()) {
      const key = `${theme}::${subtheme}`;
      const item = document.createElement('label');
      item.className = 'subtheme-item';
      item.innerHTML = `
        <span>
          <input type="checkbox" ${state.selectedSubthemes.has(key) ? 'checked' : ''} />
          ${escapeHtml(subtheme)}
        </span>
        <span class="count-pill">${count}</span>
      `;
      const chk = item.querySelector('input');
      chk.addEventListener('change', () => {
        if (chk.checked) state.selectedSubthemes.add(key);
        else state.selectedSubthemes.delete(key);
        renderThemesTree();
        updateMatchingCounter();
      });
      subList.appendChild(item);
    }

    group.appendChild(header);
    group.appendChild(subList);
    container.appendChild(group);
  }
}

function getCurrentFilterConfig() {
  return {
    selectedSubthemes: state.selectedSubthemes,
    scope: $('cfg-scope').value,
    type: $('cfg-type').value,
    progress: state.progress
  };
}

function updateMatchingCounter() {
  const matching = filterQuestions(state.allQuestions, getCurrentFilterConfig());
  $('available-matching-info').textContent = `${matching.length} question${matching.length > 1 ? 's' : ''} correspondante${matching.length > 1 ? 's' : ''}`;
  $('btn-start-quiz').disabled = matching.length === 0;
}

function startQuiz(customQuestions = null) {
  const matching = customQuestions || filterQuestions(state.allQuestions, getCurrentFilterConfig());
  if (matching.length === 0) return;

  const maxCount = parseInt($('cfg-count').value, 10);
  state.session = {
    questions: createSessionQuestions(matching, maxCount),
    currentIndex: 0,
    mode: $('cfg-mode').value,
    results: []
  };

  showView('view-quiz');
  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  const { questions, currentIndex } = state.session;
  const q = questions[currentIndex];
  const total = questions.length;

  $('quiz-counter').textContent = `Question ${currentIndex + 1} / ${total}`;
  $('quiz-theme-badge').textContent = `${q.theme} • ${q.subtheme}`;
  $('quiz-progress-fill').style.width = `${((currentIndex + 1) / total) * 100}%`;

  $('question-type-label').textContent = q.type === 'qcm' ? 'QCM' : 'Réponse libre';
  $('question-refs-preview').textContent =
    state.session.mode === 'training' && q.sources?.length ? q.sources[0].doc : '';
  $('question-prompt').textContent = q.prompt;

  if (q.context) {
    $('question-context').textContent = q.context;
    $('question-context').classList.remove('hidden');
  } else {
    $('question-context').classList.add('hidden');
  }

  $('zone-qcm').classList.add('hidden');
  $('zone-open').classList.add('hidden');
  $('zone-self-check').classList.add('hidden');
  $('zone-exam-recorded').classList.add('hidden');
  $('zone-feedback').classList.add('hidden');
  $('ai-feedback-detail').classList.add('hidden');
  $('btn-next-question').classList.add('hidden');
  $('btn-next-question').textContent =
    currentIndex === total - 1 ? 'Terminer et voir le bilan' : 'Question suivante →';

  if (q.type === 'qcm') {
    renderQcmQuestion(q);
  } else {
    renderOpenQuestion(q);
  }
}

function renderQcmQuestion(q) {
  const zone = $('zone-qcm');
  zone.innerHTML = '';
  zone.classList.remove('hidden');

  q.renderedChoices.forEach((choice, idx) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = choice.text;
    btn.addEventListener('click', () => handleQcmSelection(q, idx));
    zone.appendChild(btn);
  });
}

function handleQcmSelection(q, selectedIdx) {
  const buttons = [...$('zone-qcm').querySelectorAll('.option-btn')];
  buttons.forEach(b => (b.disabled = true));

  const chosen = q.renderedChoices[selectedIdx];
  const isCorrect = Boolean(chosen.isCorrect);

  if (state.session.mode === 'training') {
    buttons.forEach((b, i) => {
      if (q.renderedChoices[i].isCorrect) b.classList.add('correct');
      else if (i === selectedIdx) b.classList.add('wrong');
    });
  } else {
    buttons[selectedIdx].classList.add('selected');
  }

  finalizeQuestionAnswer(q, isCorrect, chosen.text);
}

function renderOpenQuestion() {
  $('zone-open').classList.remove('hidden');
  $('open-answer-input').value = '';
  $('open-answer-input').disabled = false;
  $('btn-submit-open-offline').disabled = false;

  const hasAI = state.settings.aiProvider !== 'none' && Boolean(state.settings.apiKey);
  $('btn-submit-open-ai').classList.toggle('hidden', !hasAI);
  $('btn-submit-open-ai').disabled = false;
  $('btn-submit-open-ai').textContent = '✨ Corriger avec mon IA';
}

function openOfflineSelfCheck(q) {
  const userText = $('open-answer-input').value.trim();
  if (!userText) {
    alert('Saisissez votre réponse avant de comparer avec les points clés.');
    return;
  }

  $('open-answer-input').disabled = true;
  $('btn-submit-open-offline').disabled = true;
  $('btn-submit-open-ai').disabled = true;

  const list = $('checklist-criteria');
  list.innerHTML = '';
  (q.keyPoints || []).forEach((kp, idx) => {
    const label = document.createElement('label');
    label.className = 'criterion-item';
    label.innerHTML = `
      <input type="checkbox" data-idx="${idx}" />
      <span>
        ${escapeHtml(kp.label)}
        ${kp.critical ? '<span class="criterion-critical">[ESSENTIEL]</span>' : ''}
      </span>
    `;
    list.appendChild(label);
  });

  $('zone-self-check').classList.remove('hidden');
}

async function handleOpenAiEvaluation(q) {
  const userText = $('open-answer-input').value.trim();
  if (!userText) {
    alert('Saisissez votre réponse avant de lancer la correction IA.');
    return;
  }

  const btnAi = $('btn-submit-open-ai');
  btnAi.disabled = true;
  btnAi.textContent = 'Analyse réglementaire en cours...';

  try {
    const result = await evaluateOpenAnswerWithAI({
      question: q,
      userAnswer: userText,
      settings: state.settings
    });

    $('open-answer-input').disabled = true;
    $('btn-submit-open-offline').disabled = true;

    const detailBox = $('ai-feedback-detail');
    const matched = Array.isArray(result.matchedPoints) ? result.matchedPoints.map(escapeHtml).join(' ; ') : '';
    const missing = Array.isArray(result.missingPoints) ? result.missingPoints.map(escapeHtml).join(' ; ') : '';

    detailBox.innerHTML = `
      <p><strong>Évaluation IA (${escapeHtml(result.scorePercent ?? '?')}%) :</strong> ${escapeHtml(result.comment || '')}</p>
      ${matched ? `<p>✅ <strong>Validé :</strong> ${matched}</p>` : ''}
      ${missing ? `<p>⚠️ <strong>Oublis / Imprécisions :</strong> ${missing}</p>` : ''}
    `;
    detailBox.classList.remove('hidden');

    finalizeQuestionAnswer(q, Boolean(result.isValid), userText);
  } catch (err) {
    alert(`Échec de la correction IA (${err.message}). Basculez sur la vérification hors-ligne par points clés.`);
    btnAi.disabled = false;
    btnAi.textContent = '✨ Corriger avec mon IA';
  }
}

function confirmOfflineSelfCheck(q) {
  const checkboxes = [...$('checklist-criteria').querySelectorAll('input[type="checkbox"]')];
  const keyPoints = q.keyPoints || [];

  let allCriticalChecked = true;
  checkboxes.forEach((chk, idx) => {
    if (keyPoints[idx]?.critical && !chk.checked) {
      allCriticalChecked = false;
    }
  });

  $('zone-self-check').classList.add('hidden');
  finalizeQuestionAnswer(q, allCriticalChecked, $('open-answer-input').value.trim());
}

function finalizeQuestionAnswer(q, isCorrect, userAnswerText) {
  recordQuestionResult(q.id, isCorrect);
  state.session.results.push({
    question: q,
    isCorrect,
    userAnswer: userAnswerText
  });

  if (state.session.mode === 'training') {
    showQuestionFeedback(q, isCorrect);
  } else {
    $('zone-exam-recorded').classList.remove('hidden');
  }
  $('btn-next-question').classList.remove('hidden');
}

function showQuestionFeedback(q, isCorrect) {
  const banner = $('feedback-banner');
  banner.className = `feedback-banner ${isCorrect ? 'ok' : 'ko'}`;
  banner.textContent = isCorrect
    ? '✓ Réponse validée conforme à la réglementation'
    : '✗ Réponse incomplète ou non conforme — À revoir';

  $('feedback-explanation').textContent = q.explanation;

  const sourcesUl = $('feedback-sources');
  sourcesUl.innerHTML = '';
  (q.sources || []).forEach(src => {
    const li = document.createElement('li');
    li.textContent = `${src.doc}${src.ref ? ' — ' + src.ref : ''}`;
    sourcesUl.appendChild(li);
  });

  $('zone-feedback').classList.remove('hidden');
}

function nextQuestionOrFinish() {
  if (state.session.currentIndex < state.session.questions.length - 1) {
    state.session.currentIndex++;
    renderCurrentQuestion();
  } else {
    renderSessionSummary();
  }
}

function renderSessionSummary() {
  showView('view-summary');
  updateDashboardStats();

  const results = state.session.results;
  const total = results.length;
  const okCount = results.filter(r => r.isCorrect).length;
  const pct = total ? Math.round((okCount / total) * 100) : 0;

  $('summary-score-pct').textContent = `${pct}%`;
  $('summary-score-detail').textContent = `${okCount} / ${total}`;

  if (pct === 100) $('summary-message').textContent = 'Maîtrise complète sur cette série.';
  else if (pct >= 80) $('summary-message').textContent = 'Très bon niveau, quelques points de détail à consolider.';
  else $('summary-message').textContent = 'Des prescriptions importantes nécessitent une révision ciblée.';

  const failedQuestions = results.filter(r => !r.isCorrect).map(r => r.question);
  const retryBtn = $('btn-retry-errors');
  retryBtn.classList.toggle('hidden', failedQuestions.length === 0);
  retryBtn.onclick = () => startQuiz(failedQuestions);

  const list = $('summary-list');
  list.innerHTML = '';
  results.forEach((r, idx) => {
    const div = document.createElement('div');
    div.className = `summary-item ${r.isCorrect ? 'ok' : 'ko'}`;
    const refs = (r.question.sources || [])
      .map(s => `${s.doc}${s.ref ? ' (' + s.ref + ')' : ''}`)
      .join(' | ');
    div.innerHTML = `
      <strong>${idx + 1}. [${r.isCorrect ? 'OK' : 'À REVOIR'}] ${escapeHtml(r.question.prompt)}</strong>
      <p style="margin:0.35rem 0;font-size:0.9rem;">${escapeHtml(r.question.explanation)}</p>
      <small class="ref-tag">Sources : ${escapeHtml(refs)}</small>
    `;
    list.appendChild(div);
  });
}

function bindEvents() {
  $('btn-theme').addEventListener('click', () => {
    state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
    saveSettings(state.settings);
    applyTheme(state.settings.theme);
  });

  const goHome = () => {
    updateDashboardStats();
    updateMatchingCounter();
    showView('view-setup');
  };
  $('btn-home').addEventListener('click', goHome);
  $('btn-home').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goHome();
    }
  });

  $('btn-select-all').addEventListener('click', () => {
    for (const q of state.allQuestions) {
      state.selectedSubthemes.add(`${q.theme}::${q.subtheme}`);
    }
    renderThemesTree();
    updateMatchingCounter();
  });

  $('btn-select-none').addEventListener('click', () => {
    state.selectedSubthemes.clear();
    renderThemesTree();
    updateMatchingCounter();
  });

  ['cfg-scope', 'cfg-type'].forEach(id => {
    $(id).addEventListener('change', updateMatchingCounter);
  });

  $('btn-start-quiz').addEventListener('click', () => startQuiz());

  $('btn-submit-open-offline').addEventListener('click', () => {
    openOfflineSelfCheck(state.session.questions[state.session.currentIndex]);
  });

  $('btn-submit-open-ai').addEventListener('click', () => {
    handleOpenAiEvaluation(state.session.questions[state.session.currentIndex]);
  });

  $('btn-confirm-self-check').addEventListener('click', () => {
    confirmOfflineSelfCheck(state.session.questions[state.session.currentIndex]);
  });

  $('btn-next-question').addEventListener('click', nextQuestionOrFinish);

  $('btn-quit-quiz').addEventListener('click', () => {
    if (confirm('Quitter la session en cours ?')) {
      goHome();
    }
  });

  $('btn-back-setup').addEventListener('click', goHome);

  $('btn-settings').addEventListener('click', () => {
    $('ai-provider').value = state.settings.aiProvider || 'none';
    $('ai-api-key').value = state.settings.apiKey || '';
    $('ai-custom-url').value = state.settings.customUrl || '';
    $('ai-custom-model').value = state.settings.customModel || '';
    toggleCustomAiFields();
    showView('view-settings');
  });

  $('btn-close-settings').addEventListener('click', () => showView('view-setup'));

  function toggleCustomAiFields() {
    const isCustom = $('ai-provider').value === 'custom';
    $('ai-custom-url-group').classList.toggle('hidden', !isCustom);
    $('ai-custom-model-group').classList.toggle('hidden', !isCustom);
  }
  $('ai-provider').addEventListener('change', toggleCustomAiFields);

  $('btn-save-settings').addEventListener('click', () => {
    state.settings.aiProvider = $('ai-provider').value;
    state.settings.apiKey = $('ai-api-key').value.trim();
    state.settings.customUrl = $('ai-custom-url').value.trim();
    state.settings.customModel = $('ai-custom-model').value.trim();
    saveSettings(state.settings);
    $('settings-saved-msg').classList.remove('hidden');
    setTimeout(() => $('settings-saved-msg').classList.add('hidden'), 2500);
  });

  $('import-questions-file').addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const pack = JSON.parse(text);
      if (!Array.isArray(pack.questions)) throw new Error('Format JSON invalide (tableau "questions" manquant).');
      pack.packId = pack.packId || file.name;
      saveLocalPack(pack);
      await loadCorpus();
      alert(`${pack.questions.length} question(s) importée(s) avec succès !`);
    } catch (err) {
      alert(`Erreur d'import : ${err.message}`);
    } finally {
      e.target.value = '';
    }
  });

  $('btn-export-progress').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(loadProgress(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `railquiz-progression-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  $('import-progress-file').addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data.history) throw new Error('Fichier de progression invalide.');
      saveProgress(data);
      updateDashboardStats();
      updateMatchingCounter();
      alert('Progression restaurée avec succès.');
    } catch (err) {
      alert(`Erreur : ${err.message}`);
    } finally {
      e.target.value = '';
    }
  });

  $('btn-reset-progress').addEventListener('click', () => {
    if (confirm('Effacer tout votre historique de réponses et vos statistiques ?')) {
      resetProgress();
      updateDashboardStats();
      updateMatchingCounter();
    }
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

applyTheme(state.settings.theme);
bindEvents();
loadCorpus();
