# RailQuiz Lineas SNCF — by RB (V6 — 9 grands thèmes regroupés)

## Nouveautés V5
- **Chargement robuste multi-formats + Auto-découverte GitHub Pages** :
  - Lit `questions-index.json` (à la racine ou dans `data/`) quel que soit le format exact de la liste (`files`, `packs`, `lots`, tableau simple ou objets).
  - Si `questions-index.json` est absent, mal nommé ou en erreur, bascule automatiquement sur l'auto-découverte des fichiers `.json` présents dans votre dépôt GitHub public.
  - Affiche un **diagnostic précis** (erreur HTTP 404, erreur de syntaxe JSON, clés trouvées) dès qu'un fichier pose problème.
- **Partage par QR Code 100 % hors-ligne** : bouton QR dédié dans la barre du haut, générant un QR code noir sur fond blanc directement sur l'appareil + partage natif Android / copie du lien.
- **Sécurité anti-écrasement** : cette archive ne contient volontairement ni `questions-index.json` ni fichier de démonstration, pour ne jamais écraser vos 13 lots sur GitHub.
- **Rafraîchissement d'icône Android (`?v=5`)** et purge automatique du cache Service Worker (`v5`).

## Mise à jour sur GitHub Pages
1. Décompressez `railquiz-sncf-v5.zip`.
2. Sur votre dépôt GitHub : **Add file → Upload files**, glissez-déposez tous les fichiers de l'archive (`index.html`, `sw.js`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png`, `README.md`) à la racine, puis **Commit changes**.
3. Attendez 30 à 60 secondes puis rechargez l'application.

## Correctif V5.1
- Correction d'une erreur de syntaxe JavaScript qui bloquait le démarrage sur « Chargement... ».
- Chargement des 13 lots en parallèle (démarrage quasi instantané).
- Purge automatique du cache Service Worker (`v5-1`).

## Correctif V5.2 (Compatibilité iOS / iPhone / iPad)
- Balises méta Apple PWA (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`).
- Marges de sécurité `env(safe-area-inset-*)` pour Dynamic Island, encoche et barre d'accueil iPhone.
- Taille `16px` sur tous les champs (`input`, `select`, `textarea`) pour supprimer le zoom automatique intempestif de Safari iOS.
- `touch-action: manipulation` sur les boutons et rappel discret d'installation Safari dans la fenêtre QR Code.
- Cache Service Worker mis à jour (`v5-2`).

## Nouveautés V6 (Regroupement automatique en 9 grands thèmes)
- Regroupement automatique de tous vos lots JSON (sans rien modifier aux fichiers de questions) en **9 grands thèmes métiers** triés dans un ordre logique :
  1. Signalisation
  2. ETCS
  3. Manœuvres
  4. Circulation & Conduite
  5. Composition, Freinage & Essais
  6. Dispositifs de sécurité (hors ETCS)
  7. Avaries matériel, Frein & Engin moteur
  8. Incidents, Caténaire & Secours
  9. Sécurité personnel, Com. & Doc.
- Les thèmes détaillés restent accessibles en **sous-thèmes** dès qu'on déplie un grand thème (repliés par défaut pour un accueil ultra-lisible).
- Recherche insensible aux accents sur les thèmes, sous-thèmes, anciens noms de thèmes, énoncés et codes de fiches.
- Cache Service Worker mis à jour (`v6`).
