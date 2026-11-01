// Tentative (négative, documentée) : cassage du payload ijiami.dat par XOR à clé périodique courte.
// Usage : node outils/xor-break.js [classes.dex]
// Attaque par texte connu : le vrai DEX commence par "dex\n035\0" et header_size=112, endian=0x12345678.
// Résultat : la clé candidate 22 a2 22 e6 22 a6 a2 e2 (8 octets) ne redonne PAS un header cohérent —
// le chiffrement n'est pas un XOR périodique simple. Voir 04-securite/packer-ijiami.md.
const fs = require("fs");
const path = process.argv[2] || "classes-3.0.16.dex";
const buf = fs.readFileSync(path);

const DATA_OFF = 0x6970; // début des données chiffrées, après le marqueur ijiami.dat
const payload = buf.subarray(DATA_OFF);
console.log("taille payload:", payload.length);

const magic = Buffer.from("dex\n035\0", "latin1");
const key8 = Buffer.alloc(8);
for (let i = 0; i < 8; i++) key8[i] = payload[i] ^ magic[i];
console.log("clé 8 octets candidate (known-plaintext magic):", key8.toString("hex"));

const dec = Buffer.alloc(112);
for (let i = 0; i < 112; i++) dec[i] = payload[i] ^ key8[i % 8];
console.log(`header déchiffré avec clé8 : magic="${dec.subarray(0, 8).toString("latin1").replace(/\n/g, "\\n")}" file_size=${dec.readUInt32LE(0x20)} header_size=${dec.readUInt32LE(0x24)} (attendu 112) endian=0x${dec.readUInt32LE(0x28).toString(16)} (attendu 0x12345678)`);
const ok = dec.readUInt32LE(0x24) === 112 && dec.readUInt32LE(0x28) === 0x12345678;
console.log("verdict:", ok ? "cohérent — le payload serait un simple XOR 8" : "NON cohérent — le chiffrement n'est pas un XOR périodique de 8 octets");
if (ok) {
  const out = Buffer.alloc(payload.length);
  for (let i = 0; i < payload.length; i++) out[i] = payload[i] ^ key8[i % 8];
  fs.writeFileSync("real-dex.dex", out);
  console.log("DEX déchiffré écrit : real-dex.dex");
}
