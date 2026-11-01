// Tentative (négative, documentée) : réappliquer l'algorithme de chiffrement des chaînes du stub
// Ijiami au payload chiffré, avec les 4 jeux de clés des 4 classes du chargeur.
// Usage : node outils/stub-algo-test.js [classes.dex]
// Résultat : aucun jeu de clés ne redonne le magic "dex\n035\0" — le déchiffrement du payload
// dépend des transformations de la lib native libxybzvgn.so. Voir 04-securite/packer-ijiami.md.
const fs = require("fs");
const arg = process.argv[2] || "classes-3.0.16.dex";
if (/[\\/]/.test(arg) || arg.includes("..")) {
  console.error("Refusé : nom de fichier simple attendu (sans /, \\ ni ..) — exécutez depuis le dossier contenant le DEX.");
  process.exit(2);
}
const path = arg;
const buf = fs.readFileSync(path);
const payload = buf.subarray(0x6970);
const s = (arr) => arr.map((b) => b & 0xff);

const KEYS = {
  Zol6cSY: [s([-37,89,-13,-111,-110,-20,-83,-14,-125,72,59,-33,-54,-128,-125,21]), s([-47,58,-90,37,22,-47,88,-39,78,-94,55,-121,31,-6,-38,-25]), s([-22,-106,50,88,-18,-115,8,-14,-100,47,-127,61,13,126,27,51]), s([61,-27,43,120,-4,-12,-96,91,-9,-31,-89,109,49,-114,60,-21])],
  RSIAZKuyY: [s([105,-76,8,18,-46,-52,-44,-94,-78,-41,-110,51,-108,-99,10,89]), s([62,46,84,67,66,1,55,2,-66,55,-104,121,-111,-83,33,127]), s([66,-90,-111,124,68,-21,-21,100,-62,-19,52,83,-85,25,-115,-81]), s([-2,-92,24,-90,1,116,16,125,83,96,-128,-80,126,-33,-40,84])],
  QMcx78qX: [s([-29,-63,121,123,32,-95,100,-121,82,15,87,8,-122,45,-101,-23]), s([86,-38,-30,-115,35,46,-118,6,-74,67,125,123,11,127,-117,-52]), s([29,45,109,105,-16,97,115,-120,46,-8,84,-58,13,9,-125,-109]), s([108,-97,-83,76,83,18,-122,-56,91,61,-1,-120,-18,126,72,-74])],
  Q72fXAapH: [s([58,-108,-88,-98,-63,18,-46,24,30,126,20,29,-90,-68,113,-102]), s([4,110,40,-7,-79,57,74,96,-43,-26,-61,-37,-88,1,73,42]), s([119,-94,-62,-3,78,-47,-110,73,98,-115,-65,77,-19,99,89,94]), s([9,-88,55,113,58,-113,20,-55,-87,43,18,-32,-36,78,82,80])],
};

function derive([k0r, k1r, k2r, k3r]) {
  const k0 = new Array(16), k1 = new Array(16);
  for (let i = 0; i < 16; i++) { k0[(3 + i) % 16] = k0r[i]; k1[(5 + i) % 16] = k1r[i]; }
  const k2 = k2r.slice();
  for (let i = 0; i < 16; i++) { const idx = (((k2[i] ^ 26) + i) % 16 + 16) % 16; const t = k2[i]; k2[i] = k2[idx]; k2[idx] = t; }
  const k3 = k3r.slice();
  for (let i = 0; i < 16; i++) { const idx = (((k3[i] ^ 13) + i) % 16 + 16) % 16; const t = k3[i]; k3[i] = k3[idx]; k3[idx] = t; }
  return { k0, k1, k2, k3 };
}
function T(c, sel, i, d) {
  const b0 = d.k0[i % 16], b1 = d.k1[i % 16], b2 = d.k2[i % 16], b3 = d.k3[i % 16];
  switch (sel) {
    case 0: return c ^ b0; case 1: return c ^ b1; case 2: return c ^ 0xff;
    case 3: return (c ^ b2) ^ b3; case 4: return (c ^ b0) ^ 0xaa;
    case 5: return (c ^ b1) ^ 0x55; case 6: return ((c ^ b2) ^ b3) ^ 0xff;
    default: return (c ^ 0x0f) ^ (b0 ^ b1);
  }
}

const magic = "dex\n035\0";
let gagnant = null;
for (const [name, raw] of Object.entries(KEYS)) {
  const d = derive(raw);
  for (const [label, selfn] of [["A:165", (i) => (i ^ 165) & 7], ["B:60", (i) => (i ^ 60) & 7]]) {
    let out = "";
    for (let i = 0; i < 8; i++) out += String.fromCharCode(T(payload[i], selfn(i), i, d) & 0xff);
    const ok = out === magic;
    console.log(`${name} variante ${label}: "${out.replace(/\n/g, "\\n").replace(/\0/g, "\\0")}" ${ok ? "*** MATCH ***" : ""}`);
    if (ok) gagnant = { name, selfn, d };
  }
}
if (!gagnant) {
  for (const [name, raw] of Object.entries(KEYS)) {
    const d = derive(raw);
    for (const [kname, k] of [["k0", d.k0], ["k1", d.k1], ["k2", d.k2], ["k3", d.k3]]) {
      let out = "";
      for (let i = 0; i < 8; i++) out += String.fromCharCode((payload[i] ^ k[i % 16]) & 0xff);
      if (out === magic) { console.log(`*** MATCH XOR simple ${name}.${kname}: ${Buffer.from(k).toString("hex")} ***`); gagnant = { name, kname, k }; }
    }
  }
}
if (!gagnant) console.log("\nAucun match — le chiffrement du payload n'est pas celui du stub (il faut analyser libxybzvgn.so).");
else {
  const out = Buffer.alloc(payload.length);
  if (gagnant.selfn) for (let i = 0; i < payload.length; i++) out[i] = T(payload[i], gagnant.selfn(i), i, gagnant.d);
  else for (let i = 0; i < payload.length; i++) out[i] = payload[i] ^ gagnant.k[i % 16];
  fs.writeFileSync("real-dex.dex", out);
  console.log("DEX déchiffré écrit : real-dex.dex | magic:", JSON.stringify(out.subarray(0, 8).toString("latin1")));
}
