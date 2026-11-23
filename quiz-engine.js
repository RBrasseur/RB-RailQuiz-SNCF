export function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Prépare une question QCM en piochant aléatoirement N distracteurs
 * dans le pool complet (6 à 8 mauvaises réponses plausibles) et en mélangeant l'ordre.
 */
export function buildQcmChoices(question, distractorCount = 3) {
  const pool = Array.isArray(question.distractors) ? question.distractors : [];
  const pickedDistractors = shuffleArray(pool).slice(0, Math.min(distractorCount, pool.length));
  const choices = [
    { text: question.correctAnswer, isCorrect: true },
    ...pickedDistractors.map(text => ({ text, isCorrect: false }))
  ];
  return shuffleArray(choices);
}

export function filterQuestions(allQuestions, { selectedSubthemes, scope, type, progress }) {
  return allQuestions.filter(q => {
    const key = `${q.theme}::${q.subtheme}`;
    if (!selectedSubthemes.has(key)) return false;

    if (type !== 'mixed' && q.type !== type) return false;

    const record = progress.history[q.id];
    if (scope === 'weak') {
      if (!record || record.lastResult !== 'ko') return false;
    } else if (scope === 'unseen') {
      if (record) return false;
    }
    return true;
  });
}

export function createSessionQuestions(filteredQuestions, maxCount) {
  const shuffled = shuffleArray(filteredQuestions);
  const selected = shuffled.slice(0, maxCount);
  return selected.map(q => ({
    ...q,
    renderedChoices: q.type === 'qcm' ? buildQcmChoices(q, 3) : null
  }));
}
