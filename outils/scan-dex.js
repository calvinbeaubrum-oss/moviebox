// Scan du classes.dex de MovieBox 3.0.16 : magic DEX, cohérence du header, entropie par blocs.
// Usage : node outils/scan-dex.js classes-3.0.16.dex
// Le classes.dex contient un stub DEX de ~26 Ko (4 classes) suivi du payload chiffré ijiami.dat.
const fs = require("fs");
const arg = process.argv[2] || "classes-3.0.16.dex";
if (/[\\/]/.test(arg) || arg.includes("..")) {
  console.error("Refusé : nom de fichier simple attendu (sans /, \\ ni ..) — exécutez depuis le dossier contenant le DEX.");
  process.exit(2);
}
const path = arg;
const buf = fs.readFileSync(path);
console.log("taille:", buf.length);
const needles = ["dex\n035\0", "dex\n036\0", "dex\n037\0", "dex\n038\0", "dex\n039\0"];
const positions = [];
for (const n of needles) {
  const needle = Buffer.from(n, "latin1");
  let idx = -1;
  while ((idx = buf.indexOf(needle, idx + 1)) !== -1) positions.push({ offset: idx, magic: n.replace(/\n/g, "\\n") });
}
positions.sort((a, b) => a.offset - b.offset);
console.log("occurrences magic DEX:", positions.length);
for (const p of positions) {
  const after = buf.subarray(p.offset, p.offset + 112);
  console.log(`offset=${p.offset} (0x${p.offset.toString(16)}) magic=${p.magic} header.file_size=${after.readUInt32LE(0x20)} header_size=${after.readUInt32LE(0x24)} map_off=${after.readUInt32LE(0x34)} class_defs=${after.readUInt32LE(0x60)}`);
}
// Marqueur du packer
const ij = buf.indexOf(Buffer.from("ijiami.dat", "latin1"));
console.log("marqueur ijiami.dat à:", ij !== -1 ? `0x${ij.toString(16)}` : "absent");
// Entropie par blocs de 4 Mo (8 = aléatoire pur)
console.log("--- entropie par bloc de 4 Mo (bits/octet) ---");
for (let off = 0; off < buf.length; off += 4 * 1024 * 1024) {
  const chunk = buf.subarray(off, off + 4 * 1024 * 1024);
  const freq = new Array(256).fill(0);
  for (const b of chunk) freq[b]++;
  let h = 0;
  for (const f of freq) if (f) { const p = f / chunk.length; h -= p * Math.log2(p); }
  console.log(`bloc ${off / 1048576} Mo : entropie=${h.toFixed(2)}`);
}
