# RailQuiz SNCF — Entraînement Réglementation Ferroviaire

Application Web Progressive (PWA) 100 % statique, conçue pour GitHub Pages, fonctionnant hors-ligne sur PC, tablette et smartphone.

## Déploiement sur GitHub Pages (en 2 minutes)

1. Décompressez l'archive `railquiz-sncf.zip`.
2. Sur GitHub, créez un nouveau dépôt (ex. `railquiz-sncf`).
3. Cliquez sur **Add file → Upload files**, puis glissez-déposez **tout le contenu** situé à l'intérieur du dossier `railquiz-sncf/` (`index.html`, `manifest.webmanifest`, `sw.js`, `README.md`, ainsi que les dossiers `css/`, `js/`, `data/`, `icons/`).
4. Validez le commit (**Commit changes**).
5. Allez dans **Settings → Pages → Build and deployment** :
   - **Source** : `Deploy from a branch`
   - **Branch** : `main` / `/ (root)`
   - Cliquez sur **Save**.
6. Votre application est en ligne sous 1 minute à l'adresse `https://<votre-pseudo>.github.io/railquiz-sncf/`.

## Ajout de nouveaux lots de questions (issus de vos PDF SNCF)

1. Placez le fichier `.json` généré dans le dossier `data/` de votre dépôt GitHub.
2. Ajoutez le nom du fichier dans le tableau `"files"` de `data/manifest.json` (et supprimez `"demo-reglementation.json"` une fois vos premiers vrais lots ajoutés).
3. Vous pouvez aussi tester un fichier `.json` localement avant publication via **Paramètres & IA → Importer un fichier de questions JSON local**.

## Mode Hors-ligne & Correction IA

- **Sans configuration** : les QCM piochent aléatoirement 3 distracteurs parmi un pool de 6 à 8 mauvaises réponses plausibles, et les questions à réponse libre s'auto-évaluent via une check-list de points clés réglementaires.
- **Avec clé API personnelle (optionnel)** : dans **Paramètres & IA**, vous pouvez saisir une clé Gemini, OpenAI, Anthropic ou compatible OpenAI. La clé est stockée uniquement dans votre navigateur (`localStorage`) et n'est jamais envoyée sur GitHub.
