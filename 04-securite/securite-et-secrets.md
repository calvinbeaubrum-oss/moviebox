# 06 — Sécurité : packer, secrets, TLS

## 1. Le packer Ijiami (3.0.16)

Analyse complète : `doc-source/analyse-packer-ijiami.md`.

Résumé :
- `classes.dex` = stub 26 Ko (4 classes `gj.hfr.xal.*`) + payload chiffré `ijiami.dat` 61,4 Mo (header : taille 61 492 336, empreinte `d8a6fd5a664a7f199562db04eb302609`)
- Chaîne de démarrage : `AppComponentFactory` intercepte tout → extraction CRC des libs depuis `assets/MSDvUDPFc/<abi>/` vers `filesDir` → anti-analyse `/proc/self/maps` (libart, libaoc, linker64) → natives `RSIAZKuyY.{l,r,ra,m,sa,b2b,al}` → déchiffrement par `com.ijm.dataencryption.DETool.loadDEso` (VMP)
- Libs natives du packer : `libxybzvgn.so` (748 Ko, moteur), `libukdb5pgj.so` (215 Ko, `getOpCode`), `librpgi1i.so` (6 Ko, blob de données) — **UPX à en-têtes falsifiés**
- **Dépackaging réussi (statique)** : réimplémentation du décompresseur NRV2E_LE32 (UCL 1.03) + unfiltre UPX `ct26arm` (0x52) → les deux libs principales dépackées (1 093 840 / 986 896 octets, ELF valides). Le code dépacké révèle un **interpréteur VMP** (piles thread-local 2 Mo, tables de handlers) — dévirtualisation statique non tentée
- Tentatives dynamiques : émulateur Google (Berberis/ndk_translation) → **SIGSEGV** dans le VMP (`berberis_HandleNoExec`) avant tout déchiffrement du DEX — 3 reproductions, tombstones archivées. BlissOS/VirtualBox : écosystème incompatible (EGL cassé). 

## 2. Secrets extraits de l'APK (manifest/ressources) — ⚠️ CONFIDENTIEL

| Secret | Valeur | Usage |
|---|---|---|
| `gateway_secret_online` | `**RÉDACTÉ**` | clé HMAC de **toutes** les requêtes (`x-tr-signature`) |
| `gateway_secret_test` | `**RÉDACTÉ**` | idem, environnement test |
| AppID gateway | `4U01pxRu278GqCZKY9` | identifiant client passerelle |
| `tpush_app_id` / `tpush_app_key` | `**RÉDACTÉ**` / `**RÉDACTÉ**` | push Transsion |
| AdMob `APPLICATION_ID` | `ca-app-pub-5464101117258718~2034480240` | publicité |
| Aliyun VOD license | `**RÉDACTÉ**` + `assets/license.crt` (chiffré) | lecteur |
| Firebase API key / app_id | `AIzaSyDoUlg4QWx_EYkLV9IoIzaRvysnE_7G_EQ` / `1:696179319202:android:95d8023b7c40a39d1d52fb` | Firebase (public par design) |
| OAuth client | `696179319202-hekemrrgc6kdd33tfr0sktarq53808ga.apps.googleusercontent.com` | Google Sign-In |
| Crashlytics mapping | `99ea5c7e7e2a4988b856917e6a9a3f17` | déobfuscation stack traces |
| tinker_id | `tinker_id_50020115` | hotpatch |

⇒ Tous authentifient le **client** (pas l'utilisateur). Les valeurs opérationnelles ci-dessus sont rédactées dans ce dépôt public (voir README, section « Politique de rédaction »).

## 3. TLS et transport

- `usesCleartextTraffic="true"` (HTTP en clair autorisé partout)
- `network_security_config.xml` : `overridePins="true"` sur les ancres système → **pinning désactivé** ; domaine de confiance custom : `aoneroom.com` (+ sous-domaines) ; debug : CA utilisateur acceptée
- Code : TrustManager permissif (`checkServerTrusted` vide, `lg/a.java`) + hostname verifier custom
- Cronet/QUIC en transport alternatif (hints flotte API)
- ⇒ Interception MITM triviale (mitmproxy/Charles) sur un appareil où l'app tourne

## 4. Anti-analyse (packer)

- Détection `/proc/self/maps` : `/lib64/libart.so`, `/lib64/libaoc.so`, `/bin/linker64` (hook/injection)
- Leurre de code : `new Object().hashCode()` en try/catch vides, automates à états
- Chaînes chiffrées (Base64 → 4 clés 16 o par rotations + Fisher-Yates → XOR sélecteur `(i^165)&7` puis `(i^60)&7`) — déchiffreur répliqué validé
- Émulation statique de l'algorithme maison du stub appliqué au payload : négative (voir audit)
