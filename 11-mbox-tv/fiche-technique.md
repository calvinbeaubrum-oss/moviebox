# Fiche technique — MBox TV (`com.community.mbox.tv`)

Application Android TV de la même famille que MovieBox (écosystème Transsion / PalmPlay). Analyse statique du 2026-10-24, publiée ici à titre de documentation.

## Artefact

| Champ | Valeur |
|---|---|
| Fichier APK | `com.community.mbox.tv-release-1.2.1.1020-of-50040019.apk` (36 969 310 octets) |
| **SHA-256** | `096e1d5b44938fd91b9675dccf2d781c2965c8bc172f8c6038130d0dfda1e2ae` |
| Package | `com.community.mbox.tv` |
| versionName / versionCode | `1.2.1.1020.03` / `50040019` |
| minSdk / targetSdk | 23 (Android 6) / 35 (Android 15) |

*(Binaire non redistribué ici — l'empreinte permet de vérifier un exemplaire obtenu par ses propres moyens.)*

## Méthode d'analyse

- **REA (reverse-engineer-anything)** : inventaire complet — 2 345 entrées, 0 contradiction d'intégrité (Evidence `ev_9c005f77…` / `ev_faff7e83…`) ; détection Flutter → **négative** (pas de payload AOT Dart).
- **JADX 1.5.6** (JDK 21 Adoptium) : décompilation DEX → Java — 15 051 fichiers `.java`, ressources décodées (manifeste, assets, libs natives).

## Constats clés (statiques — aucune exécution)

- Application **Kotlin / Jetpack Compose** (modules BaseLib, BaseUI, Login, Player, TvData, TvUi, VideoSubtitle, adnetwork…), très obfusquée par **R8** (code applicatif dispersé en packages `a`, `b`, `c`… ; `com.community.mbox.tv` ne contient plus que `R.java`).
- **Activité de lancement** : `com.transsion.subroom.activity.SplashActivity` → écosystème **Transsion** (Tecno/Infinix/Itel) ; paquets `com.transsnet.{flow,launcherlib,login,loginapi}` présents.
- **Composants déclarés** : 70 activités, 17 services, 14 receivers, 10 providers.
- **Permissions notables** : `REQUEST_INSTALL_PACKAGES` (auto-mise à jour par APK hors store), `CAMERA`, `READ/WRITE_EXTERNAL_STORAGE`, `RECEIVE_BOOT_COMPLETED`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `USE_FULL_SCREEN_INTENT`, `ACCESS_ADSERVICES_AD_ID`/`ACCESS_ADSERVICES_ATTRIBUTION` (pistes publicitaires).
- **Bibliothèques natives** (`lib/`, arm64-v8a + armeabi-v7a) : `libalivcffmpeg.so` + `libsaasCorePlayer.so` (lecteurs AliPlayer), `libavcodec.so`/`libavformat.so` (FFmpeg).
- **SDK tiers visibles** : Jetpack Compose, Firebase (analytics), OkHttp/Retrofit/Okio, Glide, Facebook, Alibaba AliPlayer, zxing (QR via caméra).

## Résultats de l'audit

- Constats de sécurité : [`rapport-securite.md`](rapport-securite.md) — 6 constats, dont 2 vraies failles.
- Porte VIP : [`analyse-vip.md`](analyse-vip.md) — validée côté serveur uniquement.
- Blocage des publicités sans modifier l'app : [`blocage-pubs/GUIDE-BLOCAGE.md`](blocage-pubs/GUIDE-BLOCAGE.md) + listes `hosts.txt` / `adguard.txt` (spécifiques TV, différentes de celles de la version mobile).

## Limites

- Analyse **purement statique** : aucun comportement d'exécution établi (pas d'émulateur, pas de trafic observé).
- La décompilation JADX est une reconstruction partielle (commentaires `jadx WARN`, code parfois échoué).
- La couche native (`.so`) n'est pas décompilée.
