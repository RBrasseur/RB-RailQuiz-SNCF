/**
 * Évalue une réponse libre en utilisant la clé API personnelle de l'utilisateur
 * (Gemini, OpenAI, Anthropic ou endpoint compatible OpenAI).
 */
export async function evaluateOpenAnswerWithAI({ question, userAnswer, settings }) {
  const { aiProvider, apiKey, customUrl, customModel } = settings;
  if (!aiProvider || aiProvider === 'none' || !apiKey) {
    throw new Error('Aucune clé API configurée.');
  }

  const criteriaText = (question.keyPoints || [])
    .map((kp, i) => `${i + 1}. [${kp.critical ? 'CRITIQUE' : 'Complémentaire'}] ${kp.label}`)
    .join('
');

  const systemPrompt =
    "Tu es un instructeur habilité réglementation ferroviaire SNCF. " +
    "Évalue avec rigueur et bienveillance la réponse d'un conducteur de train face au corrigé officiel. " +
    "Réponds UNIQUEMENT en JSON valide avec la structure suivante : " +
    '{"isValid": boolean, "scorePercent": number, "matchedPoints": string[], "missingPoints": string[], "comment": string}. ' +
    "isValid doit être true uniquement si tous les points CRITIQUES sont respectés sans erreur dangereuse.";

  const userPrompt =
    `QUESTION : ${question.prompt}
` +
    (question.context ? `CONTEXTE : ${question.context}
` : '') +
    `
CORRIGÉ OFFICIEL : ${question.explanation}
` +
    `
POINTS CLÉS ATTENDUS :
${criteriaText}
` +
    `
RÉPONSE DU CANDIDAT :
${userAnswer}`;

  let rawText = '';

  if (aiProvider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}

${userPrompt}` }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
      })
    });
    if (!res.ok) throw new Error(`Erreur API Gemini (${res.status})`);
    const data = await res.json();
    rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } else if (aiProvider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 1024,
        temperature: 0.1,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });
    if (!res.ok) throw new Error(`Erreur API Anthropic (${res.status})`);
    const data = await res.json();
    rawText = data?.content?.[0]?.text || '';
  } else {
    const endpoint =
      aiProvider === 'openai'
        ? 'https://api.openai.com/v1/chat/completions'
        : customUrl;
    const model =
      aiProvider === 'openai'
        ? 'gpt-4o-mini'
        : customModel || 'gpt-4o-mini';

    if (!endpoint) throw new Error("URL d'endpoint personnalisé manquante.");

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });
    if (!res.ok) throw new Error(`Erreur API (${res.status})`);
    const data = await res.json();
    rawText = data?.choices?.[0]?.message?.content || '';
  }

  const cleaned = rawText.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}
