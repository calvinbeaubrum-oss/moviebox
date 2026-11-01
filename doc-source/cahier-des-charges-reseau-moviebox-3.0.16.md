# Cahier des charges réseau — MovieBox v3.0.16 (`com.community.oneroom`)

**Cible** : `moviebox-v-3.0.16.0708.03.apk` (SHA-256 `fa2acf74…f2101`, 65 916 806 octets, signature `META-INF/ONEROOM.RSA` / PalmPlay-Transsion).
**Objet** : cartographie exhaustive des interactions avec les infrastructures distantes, en vue d'une réimplémentation.
**Date d'analyse** : 30 octobre 2026. Méthode : analyse statique complète du dépôt décompilé (`sources/`, `resources/`, `AUDIT/`, `outils/`) — 6 272 fichiers.

---

## 0. Périmètre réel de l'analyse — à lire avant tout

La v3.0.16 est **packée Ijiami** : le `classes.dex` (61,5 Mo) ne contient que 4 classes visibles (`gj.hfr.xal.*`) ; les ~42 000 classes Java applicatives sont dans un payload chiffré (`ijiami.dat`, déchiffrement natif dans `libxybzvgn.so`). Tentatives de déchiffrement statique documentées et **négatives** (voir `AUDIT/analyse-packer-ijiami.md` §6).

Conséquence honnête sur ce document :

| Information | Statut |
|---|---|
| Hosts/API de la flotte backend, CDN, deep links, infra mini-apps, Firebase, SDK tiers | ✅ **Extraits** (manifest, layouts debug, assets, configs) |
| Contrats de données embarqués (fallbacks JSON, protobuf, secrets) | ✅ **Extraits, structures exactes** |
| Chemins de sortie natifs + anti-analyse du chargeur | ✅ **Extraits** (code visible) |
| **Routes REST exactes de l'API de contenu** (`/xxx/yyy`) de la flotte `aoneroom.com` | ❌ **Non extractibles statiquement** — elles vivent dans le DEX chiffré. Seule la flotte d'hôtes, le sélecteur de debug et les fallbacks embarqués sont certifiés. Les routes sont récupérables par (a) l'audit 3.0.15 (42 206 fichiers Java disponibles, septembre 2026), (b) MITM dynamique (trafic autorisé en clair, voir §3.7), ou (c) dump DEX à l'exécution |
| Sockets/WebSocket de Room/Live (salons, TV live) | ❌ Idem — composants identifiés (`com.transsion.room.*`, `TvLiveDetailActivity`), endpoints non visibles |

Ce document est le cahier des charges de **tout ce qui est certifié** ; les routes REST doivent être branchées dessus après observation dynamique.

---

## 1. Endpoints, routes et domaines

### 1.1 Flotte API backend principale (contenu vidéo)

Révélée par le sélecteur de debug `res/layout/dialog_lab_http_host.xml` (dialogue « host select » du `LaboratoryActivity` / `DevActivity`, accessible depuis `com.transsion.usercenter.laboratory`) — c'est la liste **autorisée par le client** de ses hosts d'API :

| Host | Rôle |
|---|---|
| `api3.aoneroom.com` | **Host par défaut** (« current host ») |
| `api4.aoneroom.com` | API production (réplique) |
| `api4sg.aoneroom.com` | API production **Singapour** (routage régional) |
| `api6.aoneroom.com` | API production (réplique) |
| `api.inmoviebox.com` | API production (domaine alternatif) |
| `api7.aoneroom.com` | API production (réplique) |
| `api8.aoneroom.com` | API production (réplique) |
| `test-mse-api.aoneroom.com` | **Staging / tests** (« mse ») |
| *(champ libre)* | Le dialog permet de **surcharger l'hôte** par un host arbitraire (`et_custom_host` + `Reset`) — toute réimplémentation doit prévoir un host configurable |

La métadonnée `tran_gslb_version 1.0.3.2` (manifest) indique un module **GSLB** Transsion (répartition géographique) qui effectue la rotation entre ces hosts — la sélection n'est donc pas figée : le client interroge d'abord un GSLB puis bascule sur l'hôte retenu.

Modules HTTP maison Transsion associés : `tran_http_version 1.0.53.01`, `tran_coreutil_version 1.0.61.09`, `tran_json_version 1.0.5.01` (pile HTTP/JSON propriétaire, distincte d'OkHttp qui coexiste pour Glide et les SDK).

### 1.2 CDN et médias

| Host | Rôle | Preuve |
|---|---|---|
| `pbcdn.aoneroom.com` | CDN d'images/contenus (paths `/image/AAAA/MM/JJ/<hash>.png|gif`) | `appTab.json`, 16 occurrences |
| `test-acdn.aoneroom.com` | CDN d'assets **de test** | `skulist.json` |
| `v.aoneroom.com`, `h5.aoneroom.com`, `v.moviebox.*` | Web H5 et pages vidéo (deep links autoVerify, §1.4) | manifest |
| `sportsnow.top` | **TV sportive live** ouverte en onglet H5 (`?currentTagId=<id>&currentTagName=<nom>&from=home_top_tab&utm_source=mb_app_inner`) | `appTab.json` |

### 1.3 Infra « mini-apps » (SDK TMC / EagllWin)

Tout est déclaré en `meta-data` du manifest — valeurs exactes :

| Clé manifest | Valeur |
|---|---|
| `MINI_CONFIG_BASE_URL` / `MINI_CONFIG_BASE_API_HOST` | `https://api.eagllwin.com/` / `api.eagllwin.com` (config SDK mini-app + dépôt des formulaires pub : `AD_SUBMIT_FORM=https://api.eagllwin.com`) |
| `MINI_APP_BASE_URL` / `MINI_APP_HOST_URL` / `MINI_BASE_V8_URL` | `https://api.byte-app.com/` / `api.byte-app.com` (API plate-forme mini-apps) |
| `MINI_APP_STATIC_URL` | `https://api-static.byte-app.com/` |
| `MINI_BASE_OSS_URL` / `MINI_APPINFO_CDN_URL` | `https://app-oss.byte-app.com/` (stockage des paquets mini-apps, §3.4) |
| `MINI_BASE_LOGIN_API_URL` / `MINI_BASE_LOGIN_API_HOST` | `https://api.sunnbird.com/` / `api.sunnbird.com` (auth mini-apps) |
| `MINI_BASE_UPLOAD_URL` | `https://api-fat1.dlight-app.com/` (upload) |
| `MINI_CDN_URL` | `https://transsion-miniapp-android-cdn.oss-eu-central-1.aliyuncs.com/` (CDN OSS Europe) |
| `MINI_API_WORK_MODE` / `SDK_VERSION` | `online` / `12.0.14-mb` |

Processus séparé `:mini` (multiprogress `MiniSubActivity1-4`), V8 comme moteur (`WORKER_TYPE=webview`).

### 1.4 Deep links et schémas d'entrée

- Schéma privé : `oneroom://com.community.oneroom/…` et `oneroom://com.community.moviebox/…` → `DeepLinkHandler` (`com.transsion.subroom.deeplink.DeepLinkHandler`).
- Schéma de récompense : `oneroom://member/adtask` → `RewardsCenterActivity`.
- **App Links https autoVerify (12 hosts)** : `v.aoneroom.com`, `h5.aoneroom.com`, `moviebox.ng`, `v.moviebox.ng`, `m.mvbrowse.com`, `moviebox.biz`, `moviebox.ac`, `movie-box.tv`, `moviebox.ph`, `v.moviebox.ph`, `moviebox.club`, `movieboxhd.net`.
- Routing interne (TheRouter, `assets/therouter/routeMap.json`) : `/loginapi/select_country`, `/Login/Api`, `/download/panel_activity`, `/download/play_history`, `/download/transfer`, `/download/ugc_my_downloads`, `/download/ugc_collection_list`, `/download/series_list`, `/download/provider`, `/wrapperAd/WrapperAdProvider`, `/web/web`, `/stream/details`, `/playvideo/detail`, `/playvideo/music_detail`, `/profile/*` (setting, feedback, watch_option, privacy_data, notice…), etc. Ces paths sont utilisés aussi bien par les deep links oneroom:// que par le pont JS natif.

### 1.5 Google / Firebase (projet `oneroom-77885`)

| Élément | Valeur |
|---|---|
| `google_api_key` / `google_crash_reporting_api_key` | `AIzaSyDoUlg4QWx_EYkLV9IoIzaRvysnE_7G_EQ` |
| `google_app_id` | `1:696179319202:android:95d8023b7c40a39d1d52fb` |
| `project_id` | `oneroom-77885` |
| `google_storage_bucket` | `oneroom-77885.appspot.com` |
| `default_web_client_id` / `google_client_token` (OAuth) | `696179319202-hekemrrgc6kdd33tfr0sktarq53808ga.apps.googleusercontent.com` |
| Crashlytics mapping file id | `99ea5c7e7e2a4988b856917e6a9a3f17` |
| Services embarqués | Firebase **Performance** (proto §3.3), **Crashlytics + NDK**, **Remote Config**, **Messaging/FCM** (`FirebaseInstanceIdReceiver` c2dm), **Sessions**, **Installations**, **ABT**, Datatransport/CCT backend |
| Google | Play **Billing 6.1.0** (`com.android.vending.BILLING`, phenotype billingclient), **Sign-In**, **Places** (AutocompleteActivity), Cronet via GMS (`PlayServicesCronetProvider`), Measurement/AppMeasurement, Privacy Sandbox (`ACCESS_ADSERVICES_*`, `ga_ad_services_config.xml` : `<attribution allowAllToAccess="true"/>`) |

Push complémentaire Transsion : **TPush** (`tpush_app_id **RÉDACTÉ**`, `tpush_app_key **RÉDACTÉ**`, service FCM-relais `FCMMessageService`) et **mpush** (`SdkPushClickActivity`, `PushTriggerReceiver` sur SCREEN_ON/USER_PRESENT/CONNECTIVITY_CHANGE).

### 1.6 Réseaux publicitaires embarqués (6)

| Réseau | Empreintes |
|---|---|
| **AdMob** (Google) | `com.google.android.gms.ads.APPLICATION_ID = ca-app-pub-5464101117258718~2034480240`, `INTEGRATION_MANAGER=webview` |
| **Pangle / ByteDance** 7.1.1.4 | `com.bytedance.sdk.openadsdk.*` (TTRewardVideo, TTInterstitial, TTLandingPage…), `libpglarmor.so`, `libtobEmbedPagEncrypt.so`, JS injectés `byteh5monitor/prefetch/privacy.aio.min.js` |
| **Mintegral / MBridge** | `com.mbridge.msdk.*`, récepteur réseau `NetWorkChangeReceiver` |
| **Vungle** | `com.vungle.ads.*`, provider `com.community.oneroom.vungle-provider`, OMSDK (`res/raw/omsdk_v1*.js`, `omid_session_client_v1_5_3.js`) |
| **Hisavana** (Transsion) 3.6.0.1 | `com.cloud.hisavana.sdk.*`, providers `…oneroom.HisavanaContentProvider/ConfigContentProvider/FileProvider`, A/B tiers `assets/hisavana_ab_data.json` (projet **79**), clé RSA `assets/hisavana_rsa_public_key.pem` (chiffrée), `assets/hisavana_rsa_public_key.pem` + `hisavana_provider_paths.xml` |
| **EagllWin / TMC buyout** | `com.transsion.ad.bidding.*` (splash/interstitial/video/h5), `WrapperAdProvider`, landing `BiddingHisavanaSplashActivity` |

### 1.7 Télémétrie et APM Transsion

- **Athena / APMInsight** : `tran_athena_version 3.1.1.4`, service AIDL `com.transsion.athena.aidl.AthenaTrackService`, libs natives `libapminsighta.so` / `libapminsightb.so`. Le fichier `assets/builddatas.json` est sa carte d'instrumentation (§4.5).
- **NMS** : `libnms.so` (monitoring réseau, empreinte ByteDance interne `git.byted.org`).

### 1.8 Sockets

Aucun endpoint WebSocket/GraphQL/gRPC **visible** dans les ressources (les 307 mentions `.proto` sont les protos standards `google/protobuf`). Les fonctions Room/TvLive (salons sociaux, TV live) impliquent vraisemblablement des sockets, leurs endpoints sont dans le DEX chiffré — à relever par MITM.

---

## 2. Contrats de données (structures exactes embarquées)

### 2.1 Configuration des onglets — `assets/appTab.json` (fallback hors-ligne de la config serveur)

```json
{ "bottomTabs": [ { "name": "Home", "btTabCode": "HOME", "btTabType": "BT_HOME",
    "icon": { "selectIcon": "<url pbcdn>", "defaultIcon": "<url>", "defaultIconDark": "",
              "defaultBigIcon": "", "selectBigIcon": "<url>" },
    "operateTabId": 0, "statusWhite": true, "blackTheme": false,
    "subTabs": [ { "tabId": 37, "name": "🤼FightZone", "type": "OperateTab", "url": "",
        "tabCode": "Wrestling", "nameImage": null, "selectNameImage": null,
        "displayType": "REDIRECT", "isEducationTab": false,
        "gatherTabIcon": null, "gatherTabIconSelect": null, "appendName": false },
      { "tabId": 27, "name": "Live", "type": "H5Tab",
        "url": "https://sportsnow.top/?currentTagId=…&utm_source=mb_app_inner", … } ] } ] }
```
Types de sous-onglets observés : `OperateTab`, `H5Tab`, `TrenTab`, `ShortTvTab`, `NovelTab`, `SubjTab`. `BT_*` racines : `BT_HOME`, `BT_NOVEL` (NovelHub), `BT_OPERATE` (Fight Zone), `BT_DOWNLOADS`, `BT_ME`. Le serveur livre ce même schéma (l'app démarre avec ce fallback puis synchronise).

### 2.2 Room (UGC social) — `assets/room_top_tab.json`

```json
{ "defTabId": "explore", "version": "2493811379",
  "items": [ { "tabId": "explore", "name": "Explore", "type": "post", "url": "", "badge": null },
             { "tabId": "images", "name": "Images", "type": "post", … },
             { "tabId": "nearby", "name": "Nearby", "type": "post", … } ] }
```
Le champ `version` sert de token de synchronisation incrémentale.

### 2.3 Abonnement Premium — `assets/skulist.json` (contrat Google Play Billing)

```json
{ "skuList": null,
  "memberRights": [ { "icon": "<url test-acdn>", "description": "No disturbing ads" },
                    { "icon": "…", "description": "Enjoy 720P quality videos" },
                    { "icon": "…", "description": "Multi downloads at once" } ] }
```
`skuList` est rempli par le serveur (SKUs Billing réels) ; en dur il est `null`. Chaînes de bannière premium : `member_banner_unlock_title`, `member_banner_vip_btn_content` (Renew), rappels d'expiration jour/heures/mois (`member_banner_remind_*`).

### 2.4 Sous-titres — `assets/sub_def_la.json`

Table des langues de sous-titres : `{ "lan": "en|hi|fr|in_id|pt|ar|ur|bn|pa|ha|sw|zh|ru", "lanIOS3": "eng|hin|fre|ind|por|ara|urd|ben|pan|hau|swa|chi|rus", "lanName": "<libellé>" }`.

### 2.5 Géolocalisation réseau — `assets/local_mcc.json` (+ `sdk_country_cc_mcc.json`)

`[ { "Country": "France", "Mcc": "208", "Iso": "fr", "CountryCode": "33" }, … ]` — mapping MCC→pays utilisé pour le ciblage géographique des contenus/pubs (complété par `ACCESS_FINE_LOCATION` et le scan Wi-Fi `NEARBY_WIFI_DEVICES`/`MANAGE_WIFI_NETWORK_SELECTION`).

### 2.6 A/B testing Hisavana — `assets/hisavana_ab_data.json`

```json
[ { "project_id": 79, "domain_start_pos": 1000, "layer_id": 539, "white_list": {},
    "vars": [ { "var_id": 7661, "exp_id": 3976, "buckets": [], "info": {"isChangeEwRequestStrategy":"false"},
                "countries": ["all"], "languages": ["all"], "versions": ["all"] },
              { "var_id": 7662, "exp_id": 3976, "buckets": [23,45,56,…], "info": {"isChangeEwRequestStrategy":"true"}, … } ],
    "updated_at": 1779159862 } ]
```
Le bucketing se fait par position de l'ID de device dans les plages `buckets` ; `isChangeEwRequestStrategy` pilote la stratégie de requête « EW » du SDK pub. Toute réimplémentation doit répliquer ce mécanisme de tirage déterministe.

### 2.7 Événements analytiques — `assets/builddatas.json`

```json
{ "name": "report", "version": 1, "report": [
  { "classname": "IPlayTempleView", "method": "alertShow",    "key": "2000090" },
  { "classname": "IPlayTempleView", "method": "alertDismiss", "key": "2000091" },
  { "classname": "IPlayTempleView", "method": "play",         "key": "2000092" } ] }
```
Interception par instrumentation des vues de lecture : chaque méthode listée déclenche l'envoi de l'événement `key` vers le canal de reporting (Athena). Le `version` sert d'invalidation de la carte.

### 2.8 Profil utilisateur — intérêts

`res/values/arrays.xml` : 12 intérêts (`interest`) couplés à des UUID serveur (`interestId`) : Sport `462593c9-00c8-4ccd-9f20-89e9119bfd7a` (partagé avec Food & Beverage), Animal & Plant `f92990d0-e600-4aa3-86cf-ee2bdd22043e`, Gaming `e867e3f1-…`, Fitness `21ab1926-…`, Music `b3003260-…`, Art `0bb473e6-…`, Travel `4c2691e7-…`, Comedy `7482d81c-…`, Fashion `ffd32482-…`, Animation `237b415ea9574e1d80a533616abc81ca` (32 chars, UUID sans tirets). Ces UUID sont les valeurs exactes envoyées au backend à l'onboarding.

### 2.9 Télémétrie Firebase Performance — `firebase/perf/v1/perf_metric.proto`

Contrat protobuf complet (extrait de la structure) :

```
PerfMetric { ApplicationInfo application_info; TraceMetric trace_metric;
             NetworkRequestMetric network_request_metric; GaugeMetric gauge_metric; TransportInfo transport_info; }
ApplicationInfo { google_app_id, app_instance_id, AndroidApplicationInfo android_app_info (package_name, sdk_version, version_name), application_process_state }
TraceMetric { name, is_auto, client_start_time_us, duration_us, subtraces[], perf_sessions[] }
NetworkRequestMetric { url, http_method, request_payload_bytes, response_payload_bytes,
                       http_response_code, response_content_type, client_start_time_us,
                       time_to_request_completed_us, time_to_response_initiated_us,
                       time_to_response_completed_us, perf_sessions[] }
GaugeMetric { session_id, GaugeMetadata (process_name, cpu_clock_rate_khz, cpu_processor_count,
              device_ram_size_kb, max_app_java_heap_memory_kb), CpuMetricReading[], AndroidMemoryReading[] }
PerfSession { session_id, SessionVerbosity[] }
```

### 2.10 Mini-apps — contrats protobuf-JSON (`assets/mini_offline/*/…json`)

Enveloppe avec `@type:type.googleapis.com/miniapp.platform.consumer.*` :
- `FrameInfoResponseData { appId:"100000", deployVersion:"12.0.1", packageUrl:"https://app-oss.byte-app.com/app/apppackage/<appId>/<version>_<sha1>.zip", developer, releaseTime(ms), packageSize }`
- `AppinfoResponseData { appId:"1000681057309249536", name:"NovelHub", deployVersion, logo:<url OSS?x-oss-process=image/resize…>, mainUrl, packageUrl, developer, expiresTime, releaseTime, permissions: { api:["__internalLogin","getUserInfo"], group:"INTERNAL", hosts:[], scopesV2:[ { scopeName:"network", userAuthorization:false, validityTime:-1 }, { scopeName:"readPhotosAlbum", userAuthorization:true, validityTime:2592000000 }, { scopeName:"scanCode"… }, { scopeName:"basicAbility"… } ] } }`

Modèle de sécurité : capabilities déclaratives (`api`), scopes avec durée de validité (30 j pour les photos), groupe `INTERNAL`.

### 2.11 Secrets et jetons d'authentification (extraits du manifest — à replacer en coffre)

| Secret | Valeur littérale dans l'APK |
|---|---|
| `gateway_secret_test` | `**RÉDACTÉ**` |
| `gateway_secret_online` | `**RÉDACTÉ**` |
| `tpush_app_id` / `tpush_app_key` | `**RÉDACTÉ**` / `**RÉDACTÉ**` |
| AdMob `APPLICATION_ID` | `ca-app-pub-5464101117258718~2034480240` |
| Aliyun VOD `com.aliyun.alivc_license.licensekey` | `**RÉDACTÉ**` (+ `licensefile=assets/license.crt`, fichier chiffré) |
| Compte système | AccountAuthenticator `accountType=com.community.oneroom.accounttype`, SyncAdapter `contentAuthority=com.community.oneroom.account.sync` (`supportsUploading=true`) → le device **pousse** des données par ce canal |
| Canal | `CHANNEL=official` (meta-data d'attribution) |

⚠️ **Remarque sécurité** : les secrets de passerelle de paiement (TranPay / `PayWebActivity`, `gateway_secret_*`) sont en clair dans le manifest de l'APK — un secret client embarqué n'est jamais confidentiel ; toute réimplémentation doit garder ces opérations côté serveur.

### 2.12 En-têtes et cookies

Aucun header personnalisé n'est observable dans les ressources (ils sont construits dans le DEX chiffré par le module `tran_http`). Points certifiés : pile OkHttp (ressources `okhttp3/internal/publicsuffix/publicsuffixes.gz`), intercepteur logging (`META-INF/okhttp-logging-interceptor.kotlin_module`), Cronet/QUIC optionnel via GMS, et **`usesCleartextTraffic="true"`** global.

---

## 3. Configuration transport et sécurité

`res/xml/network_security_config.xml` (littéral) :

```xml
<network-security-config>
    <domain includeSubdomains="true">aoneroom.com</domain>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors><certificates overridePins="true" src="system"/></trust-anchors>
    </base-config>
    <debug-overrides>
        <trust-anchors><certificates overridePins="true" src="user"/></trust-anchors>
    </debug-overrides>
</network-security-config>
```

Conséquences : (1) tout le trafic HTTP en clair est autorisé — un MITM applicatif est trivial ; (2) `overridePins="true"` sur les ancres système **désactive l'effet de tout certificate pinning** déclaré ailleurs ; (3) `aoneroom.com` (tous sous-domaines) est explicitement listé — c'est le domaine de confiance applicatif ; (4) en build debug, les CA utilisateur sont acceptées (MITM mitmproxy/Charles sans frida).

---

## 4. Logique métier locale (interception, gating, modules tiers)

### 4.1 Chaîne de démarrage packée (Ijiami) — pipeline exact

1. `android:appComponentFactory="gj.hfr.xal.Q72fXAapH"` intercepte la création de **tous** les composants. `instantiateClassLoader` appelle la native `al(classLoader, appInfo, "com.community.oneroom", "com.transsion.subroom.app.SubRoomApp")` qui retourne un ClassLoader branché sur le DEX déchiffré ; les `instantiateActivity/Service/Provider/Receiver` sont délégués à `androidx.core.app.CoreComponentFactory` chargé par ce classloader.
2. `gj.hfr.xal.QMcx78qX` (Application du manifest) : `attachBaseContext` → chronométrage (`gST/gET`) → `l(context)` :
   - détermine l'ABI (`Build.SUPPORTED_ABIS` puis `ro.product.cpu.abi`), et lit l'octet `e_machine` (offset 18) du linker ELF `/system/bin/linker|linker64` pour choisir la variante de déchiffrement des chaînes (carte : `0xBD→arm64-v8a`, `0x03→x86`, `0x28→armeabi`, `0x3E→x86_64`) ;
   - **anti-analyse** `il()` : lecture de `/proc/self/maps` et détection de `/lib64/libart.so`, `/lib64/libaoc.so`, `/bin/linker64` (détection d'injection/hook) — le résultat change la variante de lib chargée ;
   - extraction par CRC des libs du packer depuis l'APK : `assets/MSDvUDPFc/<abi>/libxybzvgn.so` et `…/libukdb5pgj.so` → fichiers `libxybzvgn.so` / `libukdb5pgj.so` dans `getFilesDir()` (les 3 mêmes libs sont miroir en `AUDIT/libs-packer/` ; toutes **packées UPX**).
3. `RSIAZKuyY.l/r/ra` charge les libs natives ; `sp()` appelle par réflexion `com.ijm.dataencryption.DETool.loadDEso(apkPath, filesDir, "com.community.oneroom")` — c'est la routine de déchiffrement du payload `ijiami.dat` (header : magic `ijiami.dat\0`, taille 61 492 336, empreinte `d8a6fd5a664a7f199562db04eb302609`).
4. `onCreate` → `ra(...)` puis délégation à la vraie application **`com.transsion.subroom.app.SubRoomApp`** (instanciée par le component factory, gardée dans `QMcx78qX.n`).
5. Obfuscation : chaque méthode est pavée de leurres (`new Object().hashCode()` dans try/catch vides) et d'automates à états (`switch` sur `i5`) ; les chaînes sont chiffrées (Base64 → 4 clés 16 o par rotations + Fisher-Yates → XOR par sélecteur `(i^165)&7` puis `(i^60)&7`) — répliqué et validé dans `outils/decrypt-strings.js`.

### 4.2 Données chiffrées au repos dans les assets (déchiffrées à l'exécution)

`assets/dic`, `assets/labresencscfg`, `assets/watch_info.js`, `assets/WebViewJavascriptBridge.js`, `assets/ShellJSBridge/byteh5bridge_v240815.aio.min.js`, `assets/license.crt` (licence Aliyun VOD), `assets/rsa_public_key.pem` = `assets/hisavana_rsa_public_key.pem` (417 o, identiques, chiffrées), `assets/lable_art_xxx.lab`, les binaires `assets/C90ie74Rj` (181 296 o), `assets/DIaO1FTS` (87 536 o), `assets/Wic8HNcb` (313 536 o), et les PNG à 0 octet (`cfg_cjdk_md_fes.png`, `cfg_legacy_eddts.png`, `xxx_ali_cloud_adapter.png`, `c_r_xxx_kt.png` — placeholders). `shell_data__xxxyyy.png` (76 o) est une copie du header du payload Ijiami. Le fichier `labresencscfg` (« laboratory resource encryption config ») est vraisemblablement la clé de déchiffrement de cette famille. Toute réimplémentation doit reproduire ce schéma de ressources chiffrées si elle vise la compatibilité binaire, sinon les remplacer par des ressources lisibles.

### 4.3 Modules locaux de mise à jour / gating qui déclenchent des téléchargements

| Module | Comportement |
|---|---|
| **Tinker hotpatch 1.9.15.2** (`:patch`) | `TinkerPatchService`, `CustomResultService`, stubs hotplug d'activités (`STDStub_00…`) : téléchargement et application de patchs DEX à chaud (patch server de Transsion ; `TINKER_ID=tinker_id_50020115`). Point de contrôle majeur : un patch peut réécrire toute la logique. |
| **WeCloud SoLoader** (`:dyso`) | `com.wecloud.load.lib.SoLoadService` charge dynamiquement des `.so` ; asset `libK58dcVX.so` (+ variantes `_arm64/_x86/_x86_64`) **packée UPX** — module de code natif téléchargé/embarqué exécuté hors DEX. |
| **H5Update** | `com.cloud.h5update.service.LocalH5UpdateService(+)JobService` : mise à jour silencieuse de bundles web H5. |
| **Premium/abonnement** | Gating local visible : `ResolutionUnlockActivity` (déverrouillage de résolution par pub/abonnement), `SubscriptionActivity/ListActivity`, `RewardsCenterActivity` (tâches pub → récompenses), `MemberActivity`, `PointsHistoryActivity`, paiement via **Play Billing 6.1.0** + **TranPay** (`com.tn.tranpay.*`) + `PayWebActivity` (web pay). La validation serveur renvoyée est appliquée localement (bannière `member_banner_*`). |
| **Compte & Sync** | `AccountService` (authenticator) + `AccountSyncService` (SyncAdapter, `supportsUploading=true`) + `AccountSyncContentProvider` (`…storage.account.sync`) ; **`FastCleanerProvider`** exposé sur `…storage.contacts.sync` comme ContactDirectory (`android.content.ContactDirectory=true`) → l'app s'enregistre comme annuaire de contacts système (lecture contacts justifiée par ce provider). |
| **Laboratoire / debug** | `LaboratoryActivity`, `MccActivity`, `DevActivity`, `LabMiniAppSDKTestActivity` + dialog host override (§1.1) : l'app embarque son propre outil d'injection d'hôte. |
| **Téléchargements** | `DownloadGuardService` (survie arrière-plan), `ForegroundService` downloader, `analysing_array` (§4.5). |
| **Persistance** | MMKV (`libmmkv.so`), Room (`MultiInstanceInvalidationService`), DataStore, WorkManager. |

### 4.4 SDK tiers par empreinte (pour bloquage firewall / réimplémentation)

Google GMS (ads+measurement+auth+places+cronet+billing), Firebase (perf/crashlytics/RC/FCM/sessions/installations/datatransport), Pangle/ByteDance (lib natives chiffrées `tobEmbedPagEncrypt`, armor), Mintegral/MBridge, Vungle+OMSDK, Hisavana, TMC mini-apps, Tencent Tinker, Jersey/JAX-RS client (META-INF/services `javax.ws.rs.*` → `f5.b`), OkHttp/Okio, Glide (+ modules OkHttp/Cronet/WebP), ijkplayer/ExoPlayer/media3 (libs `libijk*.so`, `libsaasCorePlayer.so`, `libsaasDownloader.so`, `libalivcffmpeg.so` — Aliyun), APMInsight/NMS,coil? non détecté, TheRouter, BlankJ utilcode, zxing, mmkv.

### 4.5 Sources de contenu & instrumentation déclarée

- `analysing_array` / `long_vod_analysing_array` : `fzmovie.net`, `netnaija.com`, `1377x.to`, `123moviesfree.net`, `eztvtorrent.co`, `downloads-anymovies.co` — sites pirates référencés par la fonctionnalité « analyse de téléchargement » (les animations `download_analyzing_*.json` accompagnent un flux d'analyse de liens). Utile pour comprendre la provenance des contenus UGC/PUGC.
- Canaux de support : `https://t.me/moviebox_request` (Telegram, chaîne officielle), partages vers WhatsApp/Instagram/Xender/Telegram (paquets déclarés dans `<queries>`), store `com.transsnet.store` (PalmPlay), `InAppBillingService.BIND` (facturation store alternatif).

---

## 5. Plan de réimplémentation (ce que ce cahier des charges impose)

1. **Gateway API** : flotte `api3/4/4sg/6/7/8.aoneroom.com` + `api.inmoviebox.com` derrière un GSLB maison ; host injectable (contrat du `LaboratoryActivity`).
2. **Config applicative** : répliquer les schémas §2.1–2.3 (tabs, room tabs, SKUs) comme documents versionnés, même en cas de changement d'hébergeur (les URLs d'icônes pointent vers `pbcdn.aoneroom.com` — à réhéberger).
3. **Auth** : identité Google/Firebase (client OAuth §1.5) OU remplacement propre ; jetons FCM/TPush pour le push ; secret de passerelle paiement côté serveur uniquement.
4. **Télémétrie** : si on conserve Firebase Perf, le proto §2.9 est le contrat exact ; sinon le retrancher — l'app fonctionne sans (mode `report` désactivable).
5. **Transport** : rétablir `cleartextTrafficPermitted=false` + pinning réel (le binaire original ne peut pas prétendre à une sécurisation : pinning désactivé).
6. **Routes REST de contenu** : les extraire par MITM sur l'APK original (trafic en clair + CA utilisateur acceptée en debug) puis les brancher sur la flotte documentée ici ; croiser avec l'audit 3.0.15 (42 206 fichiers) pour les constantes d'API.
7. **Retirer** : Ijiami (l'inversion du packer n'apporte rien à une réimplémentation), Tinker/WeCloud/H5Update (chaînes de mise à jour à chaud incompatibles avec un audit), ContactDirectory `FastCleanerProvider`, les 6 réseaux pub et APMInsight/Athena si le produit ne les veut pas.

---

## Annexe A — Récapitulatif des domaines observés

**Backend contenu** : `api3/4/4sg/6/7/8.aoneroom.com`, `api.inmoviebox.com`, `test-mse-api.aoneroom.com`
**CDN/web** : `pbcdn.aoneroom.com`, `test-acdn.aoneroom.com`, `h5.aoneroom.com`, `v.aoneroom.com`, `moviebox.ng` (+`v.`), `moviebox.ph` (+`v.`), `m.mvbrowse.com`, `moviebox.biz`, `moviebox.ac`, `moviebox.club`, `movieboxhd.net`, `movie-box.tv`, `sportsnow.top`, `t.me`
**Mini-apps/TMC** : `api.eagllwin.com`, `api.byte-app.com`, `api-static.byte-app.com`, `app-oss.byte-app.com`, `api.sunnbird.com`, `api-fat1.dlight-app.com`, `transsion-miniapp-android-cdn.oss-eu-central-1.aliyuncs.com`
**Google** : `oneroom-77885.appspot.com`, services GMS/Firebase standards
**Contenus référencés** : `fzmovie.net`, `netnaija.com`, `1377x.to`, `123moviesfree.net`, `eztvtorrent.co`, `downloads-anymovies.co`

## Annexe B — Fichiers chiffrés/obscurcis non décodés (limites)

`classes.dex` > octet 26 936 (payload Ijiami 61,4 Mo) ; `assets/dic` ; `assets/labresencscfg` ; `assets/watch_info.js` ; `assets/WebViewJavascriptBridge.js` ; `assets/ShellJSBridge/byteh5bridge_v240815.aio.min.js` ; `assets/license.crt` ; `assets/rsa_public_key.pem` ; `assets/hisavana_rsa_public_key.pem` ; `assets/lable_art_xxx.lab` ; `assets/C90ie74Rj` ; `assets/DIaO1FTS` ; `assets/Wic8HNcb` ; `libK58dcVX*.so` (UPX) ; `libxybzvgn.so`/`libukdb5pgj.so` (UPX). Routes REST exactes et endpoints socket : à acquérir dynamiquement.

*Rapport produit par analyse statique du dépôt `movi-box-main` (6 272 fichiers), avec les outils d'audit fournis (`outils/decrypt-strings.js` validé). Limites assumées : aucune route REST interne n'a été inventée ; tout ce qui est au-dessus provient de fichiers lus directement.*

---

## MISE À JOUR — 31 octobre 2026 : extraction statique des routes (3.0.15 → 3.0.16)

Le rapport **[analyse-statique-endpoints-moviebox-3.0.15-16.md](analyse-statique-endpoints-moviebox-3.0.15-16.md)** complète ce document : **233 déclarations d'endpoints Retrofit** extraites des sources 3.0.15 (non packée), avec :
- la **flotte API confirmée dans le code** : `https://api6.aoneroom.com` (base release), `test-mse-api.aoneroom.com` (IP `8.219.92.106`), rotation `api3/api4/api4sg/api5/api6sg/api7/api8.aoneroom.com` + `api.inmoviebox.com` (hints QUIC), `pacdn.aoneroom.com` (images), `i-api.aoneroom.com` ;
- le **GSLB** : bootstrap `dsu.shalltry.com`/`dsc.shalltry.com`/`api.twibida.com` → `POST gslb.shalltry.com/gslb/domain/convert` (body `appId/key/oldKey/domains/mcc/locale/language/model`, header `X-Gslb-Sign = SHA256(pkg+SHA256(gaid))`, réponse `domainPairs`) ;
- la **signature de requête** `x-tr-signature: <ts>|2|HMAC-MD5_b64(method
accept
content-type
content-length
ts
MD5(body)
path?query_trié)` clé = `Base64(gateway_secret_online)`, AppID `4U01pxRu278GqCZKY9`, gateway `apigateway.tmctool.com` ;
- les **headers** : `X-Client-Info` (JSON device), `Authorization: Bearer <token>` (connecté) / `X-Client-Token: <ts>,<MD5(reverse(ts))>` (invité), `X-Client-Status`, `X-Play-Mode`… ;
- le **schéma auth** : `user-api/{get-sms-code,check-sms-code,login,register,third-login,logout,profile/v1-3}` → bean `UserInfo{userId,token,shortId,…}`, header de réponse `X-User` ;
- **zéro websocket/socket distant** (Rooms = HTTP, Live = HLS/DASH, push = FCM ; le seul websocket est local au transfert LAN, port 9890) ;
- sous-titres tierce partie : `vip-api.opensubtitles.com` (UA `player2024`) ; paiements : `api.paynicorn.com`, `cashier-serverweb.paynicorn.com`, `trade/checkout/*`.

Reste non extractible statiquement (confirmé) : corps JSON exacts par appel, réponses réelles, rotation GSLB effective, routes éventuellement ajoutées dans la 3.0.16 → MITM ou dump DEX requis.
