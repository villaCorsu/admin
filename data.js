/**
 * ============================================================
 *  Villa Corsu — Source des données
 *  Version : 1.3
 *
 *  Lecture directe Google Sheets via l'API gviz/tq (JSONP natif).
 *  Prérequis : Sheet partagé "Tout le monde possédant le lien → Lecteur"
 * ============================================================
 */

const APP_VERSION = "1.6";
const SHEET_ID    = "1Xvaq75grdyDXzmqrOL1fgOxjxaJHfoWXgvopg2Oh2vw";
const SHEET_GID   = "0";
const GVIZ_BASE   = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq`;

// ── Données de secours ────────────────────────────────────────
const FALLBACK_DATA = [
  { arr: "16/02/2025", dep: "21/02/2025", name: "Anne-Sophie",  nat: "Français",   vis: 6, prix: 626  },
  { arr: "23/03/2025", dep: "30/03/2025", name: "Propriétaire", nat: "Français",   vis: 2, prix: 0    },
  { arr: "04/04/2025", dep: "11/04/2025", name: "Christelle",   nat: "Français",   vis: 5, prix: 877  },
  { arr: "11/04/2025", dep: "17/04/2025", name: "Frédéric",     nat: "Français",   vis: 5, prix: 780  },
  { arr: "17/04/2025", dep: "23/04/2025", name: "Aleister",     nat: "Français",   vis: 5, prix: 780  },
  { arr: "23/04/2025", dep: "02/05/2025", name: "Rachel",       nat: "Français",   vis: 5, prix: 1118 },
  { arr: "14/05/2025", dep: "21/05/2025", name: "Alain",        nat: "Français",   vis: 3, prix: 1089 },
  { arr: "21/05/2025", dep: "28/05/2025", name: "Propriétaire", nat: "Français",   vis: 2, prix: 0    },
  { arr: "14/06/2025", dep: "28/06/2025", name: "Élodie",       nat: "Français",   vis: 5, prix: 2583 },
  { arr: "05/07/2025", dep: "19/07/2025", name: "Mattéo",       nat: "Italien",    vis: 7, prix: 3316 },
  { arr: "19/07/2025", dep: "06/08/2025", name: "Propriétaire", nat: "Français",   vis: 4, prix: 0    },
  { arr: "07/08/2025", dep: "21/08/2025", name: "Laura",        nat: "Italien",    vis: 6, prix: 3518 },
  { arr: "21/08/2025", dep: "25/08/2025", name: "Émilie",       nat: "Français",   vis: 5, prix: 1108 },
  { arr: "30/08/2025", dep: "05/09/2025", name: "Karin",        nat: "Autrichien", vis: 5, prix: 1108 },
  { arr: "07/09/2025", dep: "21/09/2025", name: "Magalie",      nat: "Français",   vis: 3, prix: 2111 },
  { arr: "23/09/2025", dep: "29/09/2025", name: "Yves",         nat: "Canadien",   vis: 6, prix: 954  },
  { arr: "29/09/2025", dep: "11/10/2025", name: "Sébastien",    nat: "Suisse",     vis: 4, prix: 1378 },
  { arr: "11/10/2025", dep: "19/10/2025", name: "Propriétaire", nat: "Français",   vis: 4, prix: 0    },
  { arr: "23/10/2025", dep: "31/10/2025", name: "Loic",         nat: "Français",   vis: 4, prix: 915  },
  { arr: "01/11/2025", dep: "07/11/2025", name: "Lorens",       nat: "Français",   vis: 5, prix: 626  },
  { arr: "11/11/2025", dep: "29/11/2025", name: "Minéa",        nat: "Finlandais", vis: 2, prix: 1552 },
  { arr: "04/07/2026", dep: "18/07/2026", name: "Régina",       nat: "Français",   vis: 6, prix: 3374 },
  { arr: "18/07/2026", dep: "31/07/2026", name: "Propriétaire", nat: "Français",   vis: 3, prix: 0    },
  { arr: "01/08/2026", dep: "15/08/2026", name: "Sylvain",      nat: "Français",   vis: 5, prix: 3537 },
  { arr: "15/08/2026", dep: "22/08/2026", name: "Rachel",       nat: "Français",   vis: 4, prix: 1750 },
  { arr: "30/08/2026", dep: "12/09/2026", name: "Sylvain",      nat: "Français",   vis: 6, prix: 2313 },
  { arr: "28/09/2026", dep: "12/10/2026", name: "Sébastien",    nat: "Français",   vis: 4, prix: 1841 },
];

// ── Helpers ───────────────────────────────────────────────────
function pad(n) { return n < 10 ? "0" + n : String(n); }

function findCol(cols, candidates) {
  for (const cand of candidates) {
    const i = cols.findIndex(c => c.includes(cand));
    if (i >= 0) return i;
  }
  return -1;
}

/**
 * Extrait une date depuis une cellule gviz.
 *
 * gviz renvoie les dates de 4 façons selon la version et le navigateur :
 *   A) cell.v = objet Date JS natif  (cas le plus fréquent)
 *   B) cell.v = "Date(2025,0,16)"    (chaîne — mois 0-indexé)
 *   C) cell.f = "16/01/2025"         (valeur formatée — toujours présente)
 *   D) cell.v = nombre série Excel   (rare)
 *
 * On essaie dans l'ordre A → B → C → D.
 */
function gvizDate(cell) {
  if (!cell || cell.v === null || cell.v === undefined) return null;

  // A — Objet Date JS natif (gviz l'instancie côté client)
  if (cell.v instanceof Date) {
    const d = cell.v;
    if (isNaN(d.getTime())) return null;
    return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear();
  }

  // B — Chaîne "Date(YYYY,M,D)" — mois 0-indexé
  if (typeof cell.v === "string") {
    const m = cell.v.match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2})\)/);
    if (m) {
      return pad(+m[3]) + "/" + pad(+m[2] + 1) + "/" + m[1];
    }
    // Chaîne déjà au format JJ/MM/AAAA
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cell.v.trim())) return cell.v.trim();
  }

  // C — Valeur formatée cell.f (toujours une chaîne lisible)
  if (cell.f) {
    const f = String(cell.f).trim();
    // Format JJ/MM/AAAA ou JJ-MM-AAAA
    const mf = f.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (mf) return pad(+mf[1]) + "/" + pad(+mf[2]) + "/" + mf[3];
    // Essai Date() standard sur la valeur formatée
    const d = new Date(f);
    if (!isNaN(d.getTime())) return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear();
  }

  // D — Nombre série (timestamp Excel / Sheets)
  if (typeof cell.v === "number") {
    const d = new Date(Math.round((cell.v - 25569) * 86400 * 1000));
    return pad(d.getUTCDate()) + "/" + pad(d.getUTCMonth() + 1) + "/" + d.getUTCFullYear();
  }

  return null;
}

function gvizStr(cell) {
  if (!cell || cell.v === null || cell.v === undefined) return "";
  // Préférer cell.f (valeur formatée) pour les chaînes — plus propre
  return String(cell.f !== undefined && cell.f !== null ? cell.f : cell.v).trim();
}

function gvizNum(cell) {
  if (!cell || cell.v === null || cell.v === undefined) return 0;
  return parseFloat(String(cell.v).replace(/[\s\u00a0]/g, "").replace(",", ".")) || 0;
}

// ── Parser principal ──────────────────────────────────────────
function gvizJsonToBookings(response) {
  const table = response.table;
  if (!table || !table.cols) throw new Error("Réponse gviz sans table.cols");

  const rows = table.rows || [];
  if (rows.length === 0) throw new Error("Le Sheet ne contient aucune ligne de données");

  // Détection des colonnes sur les labels ET les ids
  const colKeys = table.cols.map(c => (c.label || c.id || "").trim().toLowerCase());

  const iArr  = findCol(colKeys, ["arrivée","arrivee","arr","arrival","checkin","check-in"]);
  const iDep  = findCol(colKeys, ["départ","depart","dep","departure","checkout","check-out"]);
  const iName = findCol(colKeys, ["locataire","nom","name","tenant","client","prénom","prenom"]);
  const iNat  = findCol(colKeys, ["nationalité","nationalite","nat","nationality","pays"]);
  const iVis  = findCol(colKeys, ["visiteurs","vis","personnes","guests","nb","nombre"]);
  const iPrix = findCol(colKeys, ["prix","price","montant","tarif","total"]);

  // Si les 3 colonnes obligatoires ne sont pas trouvées par label,
  // on tente une détection par position (A=0, B=1, C=2…) en supposant
  // l'ordre standard du Sheet : Arrivée | Départ | locataire | Nat | Vis | Prix
  const arrIdx  = iArr  >= 0 ? iArr  : 0;
  const depIdx  = iDep  >= 0 ? iDep  : 1;
  const nameIdx = iName >= 0 ? iName : 2;
  const natIdx  = iNat  >= 0 ? iNat  : 3;
  const visIdx  = iVis  >= 0 ? iVis  : 4;
  const prixIdx = iPrix >= 0 ? iPrix : 5;

  const data = [];
  for (const row of rows) {
    if (!row || !row.c) continue;
    const c = row.c;

    const arr  = gvizDate(c[arrIdx]);
    const dep  = gvizDate(c[depIdx]);
    const name = gvizStr(c[nameIdx]);

    if (!arr || !dep || !name) continue;

    data.push({
      arr,
      dep,
      name,
      nat:  gvizStr(c[natIdx]),
      vis:  gvizNum(c[visIdx]),
      prix: gvizNum(c[prixIdx]),
    });
  }
  return data;
}

// ── Chargement JSONP gviz ─────────────────────────────────────
function loadViaGvizJsonp(timeoutMs) {
  return new Promise((resolve, reject) => {
    const cbName = "__vcGviz" + Date.now();
    const script  = document.createElement("script");
    let   settled = false;

    const cleanup = () => {
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true; cleanup();
      reject(new Error("Timeout " + timeoutMs + "ms — Sheet inaccessible ?"));
    }, timeoutMs);

    window[cbName] = (response) => {
      if (settled) return;
      settled = true; clearTimeout(timer); cleanup();
      try {
        if (response.status === "error") {
          const msg = (response.errors || []).map(e => e.detailed_message || e.message).join("; ") || "Erreur gviz";
          return reject(new Error(msg));
        }
        const rows = gvizJsonToBookings(response);
        if (rows.length === 0) return reject(new Error("0 réservation trouvée — vérifiez le Sheet"));
        resolve(rows);
      } catch(e) {
        reject(e);
      }
    };

    script.onerror = () => {
      if (settled) return;
      settled = true; clearTimeout(timer); cleanup();
      reject(new Error("Sheet inaccessible — vérifiez le partage en lecture publique"));
    };

    script.src = GVIZ_BASE
      + "?gid=" + SHEET_GID
      + "&tqx=responseHandler:" + cbName
      + "&t=" + Date.now();
    document.head.appendChild(script);
  });
}

async function loadSheetData() {
  return loadViaGvizJsonp(12000);
}
