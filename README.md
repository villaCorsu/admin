# 🏡 Villa Corsu — Calendrier des réservations

Calendrier interactif hébergé sur **GitHub Pages**, synchronisé directement avec Google Sheets — sans Apps Script, sans proxy, sans configuration technique.

---

## 📦 Contenu du package

```
villa-corsu-calendar/
├── index.html    ← Page principale
├── style.css     ← Styles (responsive, dark mode)
├── calendar.js   ← Logique du calendrier
├── data.js       ← Lecture Google Sheets (gviz API)
├── setup.html    ← Guide de configuration + outil de test
└── README.md     ← Ce fichier
```

---

## 🔌 Étape 1 — Partager le Google Sheet (2 minutes)

C'est la **seule configuration** nécessaire.

1. Ouvrez le [Google Sheet](https://docs.google.com/spreadsheets/d/1Xvaq75grdyDXzmqrOL1fgOxjxaJHfoWXgvopg2Oh2vw)
2. Cliquez sur **« Partager »** (bouton en haut à droite)
3. Dans **« Accès général »** → cliquez **« Limité »** → choisissez **« Tout le monde possédant le lien »**
4. Vérifiez que le rôle est **« Lecteur »**
5. Cliquez **OK**

> C'est tout. Aucun Apps Script, aucune clé API, aucun proxy.

**Comment ça fonctionne :** le calendrier utilise l'API **Google Visualization Query** (`gviz/tq`) qui expose nativement le Sheet en JSONP dès qu'il est partagé en lecture. C'est la même API qu'utilise Google Charts en interne — stable et maintenue par Google.

---

## 🚀 Étape 2 — Déployer sur GitHub Pages

### Créer un dépôt GitHub

1. [github.com](https://github.com) → **New repository**
2. Nom : `villa-corsu-calendar` → **Public** → **Create**

### Uploader les 5 fichiers

Dans le dépôt → **"uploading an existing file"** → glissez :
`index.html`, `style.css`, `calendar.js`, `data.js`, `setup.html` → **Commit changes**

### Activer GitHub Pages

**Settings → Pages → Source : branche `main`, dossier `/ (root)` → Save**

Votre calendrier sera disponible à :
```
https://VOTRE_USERNAME.github.io/villa-corsu-calendar/
```

---

## ✏️ Ajouter une réservation

Éditez votre **Google Sheet** normalement — ajoutez une ligne :

| Arrivée | Départ | locataire | Nationalité | Visiteurs | Prix |
|---------|--------|-----------|-------------|-----------|------|
| 01/06/2026 | 08/06/2026 | Jean-Pierre | Belge | 4 | 980 |

Puis cliquez **Sync** dans le calendrier → mise à jour instantanée.

---

## 🔍 Tester / Diagnostiquer

Ouvrez `setup.html` dans votre navigateur → bouton **"Lancer le test de connexion"**.

---

## 🎨 Fonctionnalités v1.3

- Synchro directe Google Sheets sans Apps Script (API gviz/tq)
- Bouton Sync manuel + synchro automatique au chargement
- Check-in ▶ et check-out ◀ visibles sur le calendrier
- Vue calendrier 12 mois + vue liste
- Statistiques : revenus, séjours, taux d'occupation
- Navigation par année · Responsive · Dark mode
