/**
 * ============================================================
 *  Villa Corsu — Source des données
 *  Version : 3.5
 *
 *  Lecture d'un fichier CSV local : reservations.csv
 *  Le fichier doit être à la racine du projet (même dossier
 *  que index.html) et respecter ce format :
 *
 *  Arrivée;Départ;Locataire;Nationalité;Visiteurs;Prix
 *  16/02/2025;21/02/2025;Anne-Sophie;Français;6;626
 *  ...
 *
 *  Séparateur : point-virgule (;) ou virgule (,) — auto-détecté.
 *  Encodage   : UTF-8 (enregistrez depuis Excel avec "CSV UTF-8").
 * ============================================================
 */

const APP_VERSION = "3.5";

// ── Données de secours (affichées si reservations.csv inaccessible) ──
const FALLBACK_DATA = [
  { arr: "16/02/2025", dep: "21/02/2025", name: "Anne-Sophie",  nat: "Français",     vis: 6, prix: 626  },
  { arr: "23/03/2025", dep: "30/03/2025", name: "Propriétaire", nat: "Français",     vis: 2, prix: 0    },
  { arr: "04/04/2025", dep: "11/04/2025", name: "Christelle",   nat: "Français",     vis: 5, prix: 877  },
  { arr: "11/04/2025", dep: "17/04/2025", name: "Frédéric",     nat: "Français",     vis: 5, prix: 780  },
  { arr: "17/04/2025", dep: "23/04/2025", name: "Aleister",     nat: "Français",     vis: 5, prix: 780  },
  { arr: "23/04/2025", dep: "02/05/2025", name: "Rachel",       nat: "Français",     vis: 5, prix: 1118 },
  { arr: "14/05/2025", dep: "21/05/2025", name: "Alain",        nat: "Français",     vis: 3, prix: 1089 },
  { arr: "21/05/2025", dep: "28/05/2025", name: "Propriétaire", nat: "Français",     vis: 2, prix: 0    },
  { arr: "14/06/2025", dep: "28/06/2025", name: "Élodie",       nat: "Français",     vis: 5, prix: 2583 },
  { arr: "05/07/2025", dep: "19/07/2025", name: "Mattéo",       nat: "Italien",      vis: 7, prix: 3316 },
  { arr: "19/07/2025", dep: "06/08/2025", name: "Propriétaire", nat: "Français",     vis: 4, prix: 0    },
  { arr: "07/08/2025", dep: "21/08/2025", name: "Laura",        nat: "Italien",      vis: 6, prix: 3518 },
  { arr: "21/08/2025", dep: "25/08/2025", name: "Émilie",       nat: "Français",     vis: 5, prix: 1108 },
  { arr: "30/08/2025", dep: "05/09/2025", name: "Karin",        nat: "Autrichien",   vis: 5, prix: 1108 },
  { arr: "07/09/2025", dep: "21/09/2025", name: "Magalie",      nat: "Français",     vis: 3, prix: 2111 },
  { arr: "23/09/2025", dep: "29/09/2025", name: "Yves",         nat: "Canadien",     vis: 6, prix: 954  },
  { arr: "29/09/2025", dep: "11/10/2025", name: "Sébastien",    nat: "Suisse",       vis: 4, prix: 1378 },
  { arr: "11/10/2025", dep: "19/10/2025", name: "Propriétaire", nat: "Français",     vis: 4, prix: 0    },
  { arr: "23/10/2025", dep: "31/10/2025", name: "Loic",         nat: "Français",     vis: 4, prix: 915  },
  { arr: "01/11/2025", dep: "07/11/2025", name: "Lorens",       nat: "Français",     vis: 5, prix: 626  },
  { arr: "11/11/2025", dep: "29/11/2025", name: "Minéa",        nat: "Finlandais",   vis: 2, prix: 1552 },
  { arr: "18/04/2026", dep: "24/04/2026", name: "Karen",        nat: "Néerlandais",  vis: 4, prix: 915  },
  { arr: "28/04/2026", dep: "03/05/2026", name: "Propriétaire", nat: "Français",     vis: 4, prix: 0    },
  { arr: "27/05/2026", dep: "03/06/2026", name: "Ronan",        nat: "Français",     vis: 6, prix: 1176 },
  { arr: "13/06/2026", dep: "26/06/2026", name: "Karl",         nat: "Autrichien",   vis: 3, prix: 2091 },
  { arr: "04/07/2026", dep: "18/07/2026", name: "Régina",       nat: "Français",     vis: 6, prix: 3374 },
  { arr: "18/07/2026", dep: "31/07/2026", name: "Propriétaire", nat: "Français",     vis: 3, prix: 0    },
  { arr: "01/08/2026", dep: "15/08/2026", name: "Sylvain",      nat: "Français",     vis: 5, prix: 3537 },
  { arr: "15/08/2026", dep: "22/08/2026", name: "Rachel",       nat: "Français",     vis: 4, prix: 1750 },
  { arr: "30/08/2026", dep: "12/09/2026", name: "Sylvain",      nat: "Français",     vis: 6, prix: 2313 },
  { arr: "28/09/2026", dep: "12/10/2026", name: "Sébastien",    nat: "Français",     vis: 4, prix: 1841 },
];

// ── Helpers ───────────────────────────────────────────────────
function pad(n) { return n < 10 ? "0" + n : String(n); }

/**
 * Normalise une date en JJ/MM/AAAA.
 * Accepte : JJ/MM/AAAA  JJ-MM-AAAA  JJ.MM.AAAA  AAAA-MM-JJ
 */
function normalizeDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();

  // JJ/MM/AAAA ou JJ-MM-AAAA ou JJ.MM.AAAA
  let m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (m) return pad(+m[1]) + "/" + pad(+m[2]) + "/" + m[3];

  // AAAA-MM-JJ (ISO, format par défaut d'Excel en CSV)
  m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m) return pad(+m[3]) + "/" + pad(+m[2]) + "/" + m[1];

  return null;
}

function normalizeNum(raw) {
  if (!raw) return 0;
  return parseFloat(String(raw).replace(/[\s\u00a0]/g, "").replace(",", ".")) || 0;
}

// ── Détection automatique du séparateur (;  ou  ,) ───────────
function detectSep(line) {
  const sc = (line.match(/;/g) || []).length;
  const cc = (line.match(/,/g) || []).length;
  return sc >= cc ? ";" : ",";
}

// ── Détection de colonne par entête (insensible accents/casse) ──
function findCol(headers, candidates) {
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const cand of candidates) {
    const i = headers.findIndex(h => norm(h).includes(norm(cand)));
    if (i >= 0) return i;
  }
  return -1;
}

// ── Parser CSV → tableau de réservations ─────────────────────
function parseCsv(text) {
  // Retire le BOM UTF-8 qu'Excel ajoute parfois
  const clean = text.replace(/^\uFEFF/, "").trim();
  const lines = clean.split(/\r?\n/).filter(l => l.trim() !== "");
  if (lines.length < 2) throw new Error("CSV vide ou sans lignes de données");

  const sep     = detectSep(lines[0]);
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ""));

  // Mapping colonnes (fallback sur position standard si entête non trouvé)
  const arrIdx  = Math.max(findCol(headers, ["arrivée","arrivee","arr","arrival","checkin"]),  0);
  const depIdx  = Math.max(findCol(headers, ["départ","depart","dep","departure","checkout"]), 1);
  const nameIdx = Math.max(findCol(headers, ["locataire","nom","name","tenant","client"]),     2);
  const natIdx  = findCol(headers, ["nationalité","nationalite","nat","nationality","pays"]);
  const visIdx  = findCol(headers, ["visiteurs","vis","personnes","guests","nb"]);
  const prixIdx = findCol(headers, ["prix","price","montant","tarif","total"]);

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim().replace(/^"|"$/g, ""));
    const arr  = normalizeDate(cols[arrIdx]);
    const dep  = normalizeDate(cols[depIdx]);
    const name = (cols[nameIdx] || "").trim();
    if (!arr || !dep || !name) continue;

    data.push({
      arr,
      dep,
      name,
      nat:  natIdx  >= 0 ? (cols[natIdx]  || "") : "",
      vis:  visIdx  >= 0 ? normalizeNum(cols[visIdx])  : 0,
      prix: prixIdx >= 0 ? normalizeNum(cols[prixIdx]) : 0,
    });
  }

  if (data.length === 0) throw new Error("Aucune réservation valide trouvée dans le CSV");
  return data;
}

// ── Chargement du CSV ─────────────────────────────────────────
async function loadSheetData() {
  const url = "https://villacorsu.github.io/admin/reservations.csv?t=" + Date.now();
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Fichier reservations.csv introuvable (HTTP " + res.status + ")");
  const text = await res.text();
  return parseCsv(text);
}
