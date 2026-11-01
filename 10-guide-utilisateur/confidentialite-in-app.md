# 03 — Confidentialité : les réglages intégrés de l'application

MovieBox embarque un interrupteur de confidentialité natif qui coupe une partie de la télémétrie **sans rien installer**.

## 1. Le réglage intégré (coupe Firebase)

**Chemin dans l'app** : Profil → **Paramètres → Confidentialité / Privacy Data** (`SettingPrivacyDataActivity`).

- L'interrupteur de confidentialité coupe **Firebase Analytics + Crashlytics** (écrans, événements `long_video_play`/`download_click`, rapports de crash) via `e.p(false)`.
- Les rapports de crash/erreurs réseau restent techniquement liés à votre ID device tant que Crashlytics tourne — le réglage les désactive.

## 2. La télémétrie qui ne passe PAS par ce réglage (et comment la couper)

| Flux | Destination | Coupable via DNS ? |
|---|---|---|
| **Athena** (événements device/usage — IMEI/IMSI hashés, serial, cellules) | `dsu.shalltry.com`, `dsc.shalltry.com` | Oui — bloquer `shalltry.com` (voir avertissement ci-dessous) |
| **OneID** (fingerprint cross-app : apps installées, build, gsf id) | `ire-oneid.shalltry.com` | Oui — même domaine racine |
| **GSLB** (résolution de domaines : gaid hashé, mcc, model) | `gslb.shalltry.com` | ⚠️ nécessaire au routage — ne bloquez-le que si vous acceptez le repli sur `api6.aoneroom.com` par défaut |
| Télémétrie native lecteur Aliyun | résolue à l'exécution (code natif) | ❌ non filtrable par DNS |

### Avertissement important sur `shalltry.com`
Bloquer `shalltry.com` coupe **Athena + OneID + GSLB ensemble** (même domaine racine). Conséquences :
- L'app bascule sur ses hôtes par défaut (`api6.aoneroom.com`) : le contenu fonctionne.
- Les événements de télémétrie sont **mis en file locale** (MMKV/SQLite) et partiront dès que le blocage est levé. Pour une éradication totale, le blocage doit rester permanent.

Recommandation : commencez par la liste standard (`../05-publicites/nextdns-hosts.txt`) ; ajoutez `shalltry.com` uniquement si vous acceptez ce comportement.

## 3. La géolocalisation

Refuser la permission localisation (voir `02-premier-lancement-permissions.md`) coupe à la fois les fonctions « Nearby » et l'événement de localisation silencieux de la télémétrie. C'est le geste le plus efficace pour la géo.

## 4. Récapitulatif de ce qui part encore après tout ça

| Flux | État après guide complet |
|---|---|
| Firebase Analytics/Crashlytics | coupé (réglage in-app) |
| Athena device/location, OneID | coupé si `shalltry.com` bloqué (sinon actif) |
| Requêtes pub | coupées (listes standard) |
| Télémétrie native Aliyun / socket Mintegral 9377 | résiduel (non filtrable par DNS) |
| `X-Client-Info` (device_id, gaid, région) sur chaque requête BFF | **inevitable** — c'est le contrat du client avec l'API |
