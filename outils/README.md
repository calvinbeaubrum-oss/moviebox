# Outils d'analyse — packer Ijiami & MovieBox 3.0.16

Scripts écrits pendant l'audit pour produire et reproduire les constats. Prérequis : **Node.js ≥ 18**.

| Script | Rôle | Résultat obtenu |
|---|---|---|
| [`decrypt-strings.js`](decrypt-strings.js) | Déchiffreur des chaînes du stub Ijiami : Base64 → 4 clés dérivées (2 rotations + 2 mélanges Fisher-Yates) → XOR par octet, sélecteurs `(i^165)&7` (blocs de 8) puis `(i^60)&7` (queue) | **Validé** — déchiffrement exact des chaînes des 4 classes du chargeur (auto-test : `com.community.oneroom`) |
| [`scan-dex.js`](scan-dex.js) | Diagnostic du `classes.dex` : occurrences du magic DEX, cohérence des headers, entropie par blocs de 4 Mo, marqueur `ijiami.dat` | Confirme : stub ~26 Ko (4 classes) + payload chiffré 61,4 Mo après le marqueur (offset `0x6970`) |
| [`xor-break.js`](xor-break.js) | Attaque par texte connu contre le payload chiffré (magic `dex\n035\0`, `header_size=112`, `endian=0x12345678`) | **Négative, documentée** — la clé candidate de 8 octets ne redonne pas un header cohérent : le chiffrement n'est pas un XOR périodique simple |
| [`stub-algo-test.js`](stub-algo-test.js) | Réapplication de l'algorithme de chiffrement des chaînes du stub (4 jeux de clés, 2 variantes de sélecteur) au payload | **Négative, documentée** — le déchiffrement du payload dépend des transformations de `libxybzvgn.so` |
| [`ghidra/DecompDump.java`](ghidra/DecompDump.java) | Script Ghidra : décompilation récursive (profondeur 3, ≤ 400 fonctions) des libs natives dépackées, avec création de fonctions à la volée | Utilisé sur les ELF dépackés (ARM64) |

## Usage

```bash
node outils/decrypt-strings.js            # nécessite les sources extraites du stub (jadx → sources/gj/hfr/xal/*.java)
node outils/scan-dex.js classes-3.0.16.dex
node outils/xor-break.js classes-3.0.16.dex
node outils/stub-algo-test.js classes-3.0.16.dex
```

Dans Ghidra : exécuter `DecompDump.java` avec en arguments le chemin de sortie puis les adresses hexadécimales de départ.

## Chaîne d'outils complète (non redistribuée ici — téléchargeable en amont)

- **REA (reverse-engineer-anything)** — inventaires certifiés par empreinte (0 contradiction d'intégrité sur les deux APK)
- **jadx 1.5.6** (JDK 21) — décompilation DEX → Java
- **UPX 5.3.0** (win64) + **réimplémentation du décompresseur NRV2E_LE32 (UCL 1.03)** et unfiltre UPX `ct26arm` — dépackaging statique des libs Ijiami (algorithme décrit dans [`04-securite/packer-ijiami.md`](../04-securite/packer-ijiami.md))
- **Ghidra** — analyse des ELF dépackés

Le payload `ijiami.dat`, les libs natives du packer et les APK restent hors dépôt (binaires de l'éditeur, non redistribuables) — le journal des travaux décrit comment les obtenir et les extraire localement.
