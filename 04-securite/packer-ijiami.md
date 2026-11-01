# Analyse du packer Ijiami — MovieBox v3.0.16

Analyse statique du 24 octobre 2026. Cible : `moviebox-v-3.0.16.0708.03.apk`
(SHA-256 `fa2acf749122de64ea491452a247f9444b86a0cf05deafe7836bd25b0a1f2101`).

## 1. Pourquoi jadx ne sort que 6 fichiers Java

Le `classes.dex` (61 519 288 octets) contient en réalité deux choses concaténées :

| Zone | Taille | Contenu |
|---|---|---|
| 0 → ~26 936 octets | ~26 Ko | **Stub DEX valide** : header cohérent (file_size = 61 519 288, header_size = 112, endian 0x12345678, map_off = 26 740), **4 classes seulement** |
| ~26 936 → fin | 61,4 Mo | **Payload chiffré** du packer Ijiami |

jadx charge le DEX, n'y trouve que 4 classes (`gj.hfr.xal.Q72fXAapH`, `QMcx78qX`, `RSIAZKuyY`, `Zol6cSY`), génère `R.java` depuis les ressources et `DebugProbesKt.java` depuis `DebugProbesKt.bin`, puis s'arrête proprement — le reste du fichier n'est pas du DEX.

## 2. Le chargeur (stub) — `sources/gj/hfr/xal/`

- `Q72fXAapH extends AppComponentFactory` : s'installe via `android:appComponentFactory` dans le manifest ; détourne la création de tous les composants (activities, services, providers) avant de rendre la main à `androidx.core.app.CoreComponentFactory`.
- `QMcx78qX extends Application` : l'« application » visible du manifest. Référence par réflexion la vraie application masquée `com.transsion.subroom.app.SubRoomApp` et le module Ijiami `com.ijm.dataencryption.DETool` (méthode `loadDEso`).
- `RSIAZKuyY` : charge les librairies natives du packer (chemins déchiffrés ci-dessous), expose les méthodes natives `al`, `b2b`, `l`, `m`, `r`, `ra`, `sa`.
- `Zol6cSY` : utilitaire de déchiffrement de chaînes.

Le code est bourré de leurres (`obj.hashCode()` dans des try/catch vides) — signature d'un obfuscateur de packer commercial.

## 3. Chaînes du chargeur déchiffrées

L'algorithme (identique dans les 4 classes, clés différentes par classe) : Base64 → dérivation de 4 clés de 16 octets (2 rotations + 2 mélanges Fisher-Yates paramétrés) → XOR octet par octet avec sélecteur `(i ^ 165) & 7` par blocs de 8, `(i ^ 60) & 7` pour la queue. Répliqué dans `outils/decrypt-strings.js` (validé : la chaîne chiffrée redonne `com.community.oneroom`).

| Classe | Chaîne chiffrée (Base64) | Valeur |
|---|---|---|
| Q72fXAapH | `7bT530nHH5LZFkd6GTpHkXOPARP5` | `com.community.oneroom` |
| Q72fXAapH | `7bT5317aE5HfC0dhDjpbiuyp+55HhhOP3FZ9ewJGR5B7vB4M` | `com.transsion.subroom.app.SubRoomApp` |
| Q72fXAapH | `77Xwg0XBFoeCG0F8BTpJj/71155YzTGQwQhBYAV6XLl3nhoT5n0=` | `androidx.core.app.CoreComponentFactory` |
| RSIAZKuyY | `A8yS1AdxVYUQcNKkpNE=` | `/libxybzvgn.so` |
| RSIAZKuyY | `A8yS1ApjU51TZ9vg+c2Q` | `/libukdb5pgj.so` |
| QMcx78qX | `T0LqurgKirKLitC0Qgd4nAEU6vCgEMeHoazcl2E5EIzo` | `assets/MSDvUDPFc/%s/libxybzvgn.so` |
| QMcx78qX | `T0LqurgKirKLitC0Qgd4nAEU6vCgEMeKs6rE1HYwVNH0MQ==` | `assets/MSDvUDPFc/%s/libukdb5pgj.so` |
| QMcx78qX | `TV708aUTyNG8r9KAYzldjVdB7bajF4u7TiKLuGM=` | `com.ijm.dataencryption.DETool` |
| QMcx78qX | `Ql74u4g81pA=` | `loadDEso` |
| QMcx78qX | `AUHrsK9W1ppnEMu6bsaM` | `/proc/self/maps` (anti-analyse) |
| QMcx78qX | `AV3wvfpNipOxrMeTcnlNkA==` | `/lib64/libart.so` (crochets du runtime) |

Liste complète dans la sortie de `outils/decrypt-strings.js`. La mention `com.ijm.dataencryption.DETool` identifie formellement le packer **Ijiami**.

## 4. Format du payload (au-delà de l'octet 26 936 de `classes.dex`)

```
0x6938 : "ijiami.dat\0\0"          (magic du packer)
0x6944 : 00 00 00 00
0x6948 : 04 00 00 00               (version ?)
0x694C : 70 4C AA 03               (taille du bloc chiffré = 61 492 336)
0x6950 : "d8a6fd5a664a7f199562db04eb302609"  (empreinte hex 32 chars)
0x6970 : données chiffrées (61 492 296 octets)
```

Entropie du bloc chiffré : ~5,7–6,3 bits/octet (ni chiffré fort ~8, ni DEX brut pur) — compatible avec un chiffrement par blocs/flux maison. Des motifs répétés (`b7 6d e2`, `38 6d e2`) suggèrent des zones de zéros du DEX original passées dans un flux de clé à courte portée.

## 5. Librairies natives du packer

Extraites de `assets/MSDvUDPFc/arm64-v8a/` (copies dans `libs-packer/`) :

- `libxybzvgn.so` — 747 728 octets, moteur principal (contient les chaînes `ijiami`, `ijiami.dat`, `dex`)
- `libukdb5pgj.so` — 214 768 octets, rôle secondaire (chargé en secours selon l'ABI)
- `librpgi1i.so` — 5 952 octets, petite lib annexe

Le chargeur Java teste l'ABI (`arm64-v8a`, `armeabi`, `x86`, `x86_64` via `ro.product.cpu.abi`/`SUPPORTED_ABIS`) et charge la lib correspondante ; les chemins `/system/bin/linker`, `/lib64/libart.so`, `/proc/self/maps` servent aux vérifications anti-tampering/anti-debug de la lib.

## 6. Tentatives de déchiffrement statique (documentées, négatives)

1. **XOR à clé périodique courte (4/8/12/16/32)** — attaque par texte connu (magic `dex\n035\0`) : clé candidate `22 a2 22 e6 22 a6 a2 e2` obtenue, mais le header déchiffré est incohérent (header_size ≠ 112). Négatif. → `outils/xor-break.js`
2. **Algorithme maison du stub réappliqué au payload** avec les 4 jeux de clés des 4 classes (variantes sélecteur 165 et 60) : aucun ne redonne le magic DEX. Négatif. → `outils/stub-algo-test.js`

Conclusion : le déchiffrement du payload dépend des transformations de `libxybzvgn.so` (ARM64).

## 7. Pistes pour aller plus loin

- Analyser `libxybzvgn.so` (Ghidra : installation présente en `C:\Users\marcu\reverse_tools\ghidra_12.1.4_PUBLIC`) : partir des xrefs de la chaîne `ijiami.dat`, remonter à la routine de déchiffrement, répliquer l'algo.
- Alternative dynamique : exécuter l'app sur un émulateur/appareil et dumper le DEX en mémoire (BlackDex / FRIDA-DEXDump). L'émulateur local était hors service au dernier audit (qemu zombie, reboot requis).
- Comparer avec la 3.0.15 (`moviebox-3.0.15-audit-src-2026-09-13.tar.gz`, 42 206 fichiers Java) pour identifier les classes ajoutées/modifiées : la 3.0.16 ajoute vraisemblablement le module Ijiami et les nouvelles permissions, le reste du code devant être proche.
