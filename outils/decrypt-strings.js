// Déchiffreur de chaînes du stub Ijiami — MovieBox 3.0.16
// Usage (depuis la racine du dépôt) : node outils/decrypt-strings.js
// Réplique l'algorithme de o00oOoo00O0oo0000oO0Oo / Ooo0o0000oo0oOooo :
// Base64 -> 4 clés dérivées (2 rotations + 2 mélangages Fisher-Yates) ->
// XOR par octet, sélecteur (i^165)&7 par blocs de 8, (i^60)&7 pour la queue.
const fs = require("fs");

const s = (arr) => arr.map((b) => b & 0xff);
const KEYS = {
  Zol6cSY: {
    k0: s([-37, 89, -13, -111, -110, -20, -83, -14, -125, 72, 59, -33, -54, -128, -125, 21]),
    k1: s([-47, 58, -90, 37, 22, -47, 88, -39, 78, -94, 55, -121, 31, -6, -38, -25]),
    k2: s([-22, -106, 50, 88, -18, -115, 8, -14, -100, 47, -127, 61, 13, 126, 27, 51]),
    k3: s([61, -27, 43, 120, -4, -12, -96, 91, -9, -31, -89, 109, 49, -114, 60, -21]),
  },
  RSIAZKuyY: {
    k0: s([105, -76, 8, 18, -46, -52, -44, -94, -78, -41, -110, 51, -108, -99, 10, 89]),
    k1: s([62, 46, 84, 67, 66, 1, 55, 2, -66, 55, -104, 121, -111, -83, 33, 127]),
    k2: s([66, -90, -111, 124, 68, -21, -21, 100, -62, -19, 52, 83, -85, 25, -115, -81]),
    k3: s([-2, -92, 24, -90, 1, 116, 16, 125, 83, 96, -128, -80, 126, -33, -40, 84]),
  },
  QMcx78qX: {
    k0: s([-29, -63, 121, 123, 32, -95, 100, -121, 82, 15, 87, 8, -122, 45, -101, -23]),
    k1: s([86, -38, -30, -115, 35, 46, -118, 6, -74, 67, 125, 123, 11, 127, -117, -52]),
    k2: s([29, 45, 109, 105, -16, 97, 115, -120, 46, -8, 84, -58, 13, 9, -125, -109]),
    k3: s([108, -97, -83, 76, 83, 18, -122, -56, 91, 61, -1, -120, -18, 126, 72, -74]),
  },
  Q72fXAapH: {
    k0: s([58, -108, -88, -98, -63, 18, -46, 24, 30, 126, 20, 29, -90, -68, 113, -102]),
    k1: s([4, 110, 40, -7, -79, 57, 74, 96, -43, -26, -61, -37, -88, 1, 73, 42]),
    k2: s([119, -94, -62, -3, 78, -47, -110, 73, 98, -115, -65, 77, -19, 99, 89, 94]),
    k3: s([9, -88, 55, 113, 58, -113, 20, -55, -87, 43, 18, -32, -36, 78, 82, 80]),
  },
};

function derive(keys) {
  const k0 = new Array(16), k1 = new Array(16);
  for (let i = 0; i < 16; i++) { k0[(3 + i) % 16] = keys.k0[i]; k1[(5 + i) % 16] = keys.k1[i]; }
  const k2 = keys.k2.slice();
  for (let i = 0; i < 16; i++) { const idx = (((k2[i] ^ 26) + i) % 16 + 16) % 16; const t = k2[i]; k2[i] = k2[idx]; k2[idx] = t; }
  const k3 = keys.k3.slice();
  for (let i = 0; i < 16; i++) { const idx = (((k3[i] ^ 13) + i) % 16 + 16) % 16; const t = k3[i]; k3[i] = k3[idx]; k3[idx] = t; }
  return { k0, k1, k2, k3 };
}

function T(c, sel, i, d) {
  const b0 = d.k0[i % 16], b1 = d.k1[i % 16], b2 = d.k2[i % 16], b3 = d.k3[i % 16];
  switch (sel) {
    case 0: return c ^ b0;
    case 1: return c ^ b1;
    case 2: return c ^ 0xff;
    case 3: return (c ^ b2) ^ b3;
    case 4: return (c ^ b0) ^ 0xaa;
    case 5: return (c ^ b1) ^ 0x55;
    case 6: return ((c ^ b2) ^ b3) ^ 0xff;
    default: return (c ^ 0x0f) ^ (b0 ^ b1);
  }
}

function decryptString(b64, className) {
  const d = derive(KEYS[className]);
  const data = Buffer.from(b64, "base64");
  const len = data.length, n8 = Math.floor(len / 8);
  const out = Buffer.alloc(len);
  for (let pos = 0; pos < n8 * 8; pos++) out[pos] = T(data[pos], (pos ^ 165) & 7, pos, d);
  for (let pos = n8 * 8; pos < len; pos++) out[pos] = T(data[pos], (pos ^ 60) & 7, pos, d);
  return out.toString("utf8");
}

// Auto-test : doit redonner le nom du package
console.log("[auto-test]", JSON.stringify(decryptString("7bT530nHH5LZFkd6GTpHkXOPARP5", "Q72fXAapH")), "(attendu: com.community.oneroom)");

const FUNC = { Q72fXAapH: "Ooo0o0000oo0oOooo", QMcx78qX: "O0000o000000oOoo", RSIAZKuyY: "o00oOoo00O0oo0000oO0Oo", Zol6cSY: "oOooo0o0ooooO00OoooO" };
for (const cls of Object.keys(KEYS)) {
  const src = fs.readFileSync(`sources/gj/hfr/xal/${cls}.java`, "utf8");
  const re = new RegExp(`${FUNC[cls]}\\("([^"]+)"\\)`, "g");
  let m, seen = new Set();
  console.log(`\n=== ${cls} ===`);
  while ((m = re.exec(src))) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    try { console.log(`  ${m[1].slice(0, 44).padEnd(44)} -> ${JSON.stringify(decryptString(m[1], cls))}`); }
    catch (e) { console.log(`  ${m[1]} -> ERREUR ${e.message}`); }
  }
}
