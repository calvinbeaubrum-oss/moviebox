# MovieBox — Audit statique & documentation technique

Audit indépendant, **purement statique**, de l'application Android MovieBox (package `com.community.oneroom`, éditeur PalmPlay / Transsion), versions **3.0.15** et **3.0.16**. Ce dépôt consolide l'ensemble des analyses : identité de l'app, réseau & endpoints, schéma d'authentification, télémétrie, publicité, logique VIP/paiements, packer Ijiami, sécurité TLS.

> **Ce dépôt ne contient ni l'APK, ni les clés opérationnelles de l'application** (voir « Politique de rédaction »). Il documente, à des fins de transparence et de protection de la vie privée, ce que fait l'application installée sur un appareil.

---

## Cartographie du dépôt

| Dossier | Contenu |
|---|---|
| `01-app/` | Fiche d'identité (package, signature, composants manifest, permissions) |
| `02-reseau/` | Endpoints découverts, domaines GSLB, schéma de signature `x-tr-signature`, authentification utilisateur |
| `03-api/` | Dictionnaire complet de l'API (routes BFF, méthodes, paramètres) |
| `04-securite/` | Secrets intégrés au manifest (rédactés), TLS/pinning, packer **Ijiami** et dépackaging statique |
| `05-publicites/` | Réseaux publicitaires embarqués, listes de blocage prêtes à l'emploi (AdGuard / NextDNS) |
| `06-telemetrie/` | Audit de la télémétrie : flux légitimes vs pistage |
| `07-vip-paiements/` | Chaîne VIP/paiements (TransPay, web) et logique de gating côté client |
| `08-assets-medias/` | Assets, CDNs, ressources et clés de configuration (rédactées si opérationnelles) |
| `09-logique-metier/` | Logique locale de l'app (catalogue, cache, compteur) |
| `10-guide-utilisateur/` | Guide légitime : bloquer les pubs par DNS, permissions, confidentialité in-app, limites VIP |
| `data/` | Dumps bruts des endpoints extraits du code 3.0.15 |
| `doc-source/` | Documents d'analyse d'origine (endpoints 3.0.15/16, cahier des charges réseau 3.0.16) |
| `refs/` | Méthodologie, limites et **journal des travaux** (ce qui a été exécuté, session par session) |
| `outils/` | Scripts d'analyse maison : déchiffreur Ijiami (validé), scan DEX, attaques documentées, script Ghidra |
| `11-mbox-tv/` | App sœur MBox TV (`com.community.mbox.tv`) : fiche technique, rapport sécurité, analyse VIP, blocage pubs TV |

---

## Synthèse des découvertes

- **Packer Ijiami (3.0.16)** : `classes.dex` n'est qu'un stub de 26 Ko ; le vrai code (61,4 Mo) est chiffré dans `ijiami.dat`, déverrouillé par des libs natives UPX à en-têtes falsifiés + interpréteur VMP. **Dépackaging statique réussi** pour les deux libs principales ; la dévirtualisation VMP n'a pas été tentée. Détails : `04-securite/packer-ijiami.md`.
- **Signature de toutes les requêtes API** : header `x-tr-signature: <timestamp>|2|<Base64(HMAC)>`, HMAC-MD5 par défaut (SHA1/SHA256 optionnels), clé issue du manifest `gateway_secret_online` (via l'AppID `4U01pxRu278GqCZKY9`, passerelle `apigateway.tmctool.com`). **La clé est rédactée dans ce dépôt** — le schéma est documenté, pas exploitable.
- **Réseau** : catalogue complet des endpoints (BFF vidéo, recherche, utilisateurs, paiements, mini-apps) dans `02-reseau/endpoints.md` et `03-api/dictionnaire-api.md` ; dumps bruts dans `data/`.
- **Sécurité transport défaillante côté app** : `usesCleartextTraffic="true"`, pinning désactivé (`overridePins="true"`), `TrustManager` permissif (`checkServerTrusted` vide) → interception MITM triviale de l'app par l'opérateur du réseau.
- **Permissions : 57 demandées** (3.0.16), dont `REQUEST_INSTALL_PACKAGES`, `SYSTEM_ALERT_WINDOW`, lecture du calendrier, microphone, caméra, localisation fine, médiathèque, contacts via provider, démarrage auto.
- **Publicité** : réseaux tiers catalogués + listes de blocage DNS prêtes à l'emploi (`05-publicites/adguard-hosts.txt`, `nextdns-hosts.txt`).
- **Télémétrie** : distinction entre flux légitimes (crash, performance) et pistage marketing, avec les points de blocage recommandés (`06-telemetrie/`).
- **VIP/paiements** : la logique de gating VIP est côté client (chaîne paiements TransPay, endpoints `user-api/*`) ; le détail est documenté à titre d'audit, sans procédure de contournement.

---

## Outils & méthode d'analyse

Tout ce qui a été exécuté pour produire ces résultats est documenté et reproductible :

- **Journal des travaux** : [`refs/journal-des-travaux.md`](refs/journal-des-travaux.md) — session par session, chantiers terminés et chantiers ouverts.
- **Scripts maison** : [`outils/README.md`](outils/README.md) — déchiffreur des chaînes du stub Ijiami (validé), scan du DEX, deux attaques sur le payload chiffré (négatives, documentées), script Ghidra de dump de décompilation.
- **Chaîne d'outils** : REA (inventaires certifiés par empreinte), jadx 1.5.6, UPX 5.3.0 + réimplémentation NRV2E_LE32, Ghidra (ARM64).

## Serveurs & endpoints

Domaines catalogués lors de l'audit statique (extraits du code) :

| Domaine | Rôle observé |
|---|---|
| `gslb.shalltry.com` | GSLB (répartition de charge, module Transsion `gslb 1.0.3.2`) |
| `api6.aoneroom.com` | API principale (BFF) |
| `test-mse-api.aoneroom.com` | Environnement de test |
| `apigateway.tmctool.com` | Passerelle API (signature `x-tr-signature`) |
| `aoneroom.com` + sous-domaines | Domaine de confiance TLS déclaré par l'app |
| `api.byte-app.com`, `api-static.byte-app.com`, `app-oss.byte-app.com`, `api-fat1.dlight-app.com` | Services catalogués (rôle détaillé dans `data/` et `doc-source/`) |
| `api.eagllwin.com`, `api.sunnbird.com`, `sportsnow.top` | Services catalogués |
| `transsion-miniapp-android-cdn.oss-eu-central-1.aliyuncs.com` | CDN Aliyun (mini-apps embarquées) |
| `moviebox.ng`, `moviebox.biz`, `moviebox.ac`, `moviebox.club`, `moviebox.ph`, `movieboxhd.net`, `movie-box.tv`, `m.mvbrowse.com`, `v/h5.aoneroom.com` | App Links web (autoVerify) |

**Disponibilité** : cet audit est statique — la disponibilité des serveurs n'est pas surveillée en temps réel ici. Les fichiers `data/endpoints_3.0.15_*.txt` et `02-reseau/endpoints.md` listent l'intégralité des routes découvertes dans le code.

**Accès aux serveurs** : le schéma d'authentification exact (headers, ordre de signature, HMAC, AppID) est décrit dans `02-reseau/hosts-gslb-signature-auth.md`. La clé de signature n'y figure pas : le dépôt documente le protocole, il ne fournit pas de mode d'emploi d'appels directs aux serveurs.

---

## APK

Ce dépôt **ne redistribue pas** le binaire de l'application (fichier propriétaire d'un éditeur tiers). Pour permettre la vérification, voici son empreinte d'origine :

| Champ | Valeur |
|---|---|
| Fichier | `moviebox-v-3.0.16.0708.03.apk` |
| Package | `com.community.oneroom` |
| versionCode / versionName | `50020115` / `3.0.16.0708.03` |
| Taille | 65 916 806 octets |
| **SHA-256** | `fa2acf749122de64ea491452a247f9444b86a0cf05deafe7836bd25b0a1f2101` |
| Signature | `META-INF/ONEROOM.RSA` (PalmPlay / Transsion) |

Version 3.0.15 : endpoints et dictionnaire API couverts (`data/`, `03-api/`) ; fiche d'identité détaillée non consolidée.

Restent également hors dépôt, pour la même raison (binaires/contenus de l'éditeur) : le code décompilé intégral (42 206 fichiers Java pour la 3.0.15, 15 051 pour MBox TV), les trois librairies natives du packer et les APK eux-mêmes. Le journal des travaux et les outils permettent de reproduire ces extractions localement.

---

## Politique de rédaction

Pour rester **public et ouvert à tous**, ce dépôt retire les valeurs qui permettraient d'appeler les serveurs de l'éditeur sans autorisation :

- ❌ `gateway_secret_online` / `gateway_secret_test` (clés HMAC qui signent **toutes** les requêtes API)
- ❌ Identifiants push Transsion (`tpush_app_id` / `tpush_app_key`)
- ❌ Licence lecteur vidéo Aliyun VOD

Sont conservées (publiques par design, présentes dans tout APK équivalent) : clé Firebase, identifiants OAuth, identifiant AdMob, identifiant Crashlytics, AppID passerelle (inutilisable sans la clé HMAC).

**Raisons** : (1) publier des identifiants opérationnels d'un service tiers facilite un accès non autorisé et expose le dépôt comme ses contributeurs ; (2) les valeurs finiraient révoquées sous 48 h par la détection de fuites de GitHub, rendant le dépôt obsolete ; (3) la méthodologie d'extraction depuis l'APK reste entièrement documentée — chacun peut reproduire localement.

---

## Guide utilisateur légitime

Le dossier `10-guide-utilisateur/` fournit la partie utile sans modification de l'app : bloquer les publicités par DNS (listes AdGuard/NextDNS incluses), comprendre les permissions, paramètres de confidentialité in-app, fonctionnement et limites du VIP.

---

## Limites connues

- Analyse **statique uniquement** : les tentatives dynamiques sur émulateur ont échoué (SIGSEGV dans le VMP Ijiami) — voir `04-securite/packer-ijiami.md`.
- Dévirtualisation de l'interpréteur VMP non tentée.
- La disponibilité des serveurs et les comportements réseau réels (3.0.16) nécessiteraient une capture MITM sur appareil — hors périmètre de ce dépôt public.
- Chantiers ouverts (dévirtualisation VMP, dump mémoire à l'exécution, fiche 3.0.15, monitoring serveurs) : listés dans [`refs/journal-des-travaux.md`](refs/journal-des-travaux.md).

## Licence

Documentation et listes publiées sous licence **MIT** (voir [LICENSE](LICENSE)). MovieBox est une marque de son éditeur ; ce dépôt est indépendant et non affilié.
