# RailQuiz Lineas SNCF — by RB (V5)

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
