# 02 — Audit complet de la télémétrie

Chaque flux : destination → données exactes → déclencheur → classification **🟢 technique légitime** / **🔴 pistage-profilage** / **🟠 mixte**.
Méthode : lecture directe du code décompilé 3.0.15 (les chemins `com\...` sont dans les sources). Payloads exacts là où le code les montre ; explicitement signalé sinon.

---

## Flux 1 — 🔴→🟠 Athena (analytics maison Transsion) — le flux principal

**Destination** : `POST dsu.shalltry.com` / `dsc.shalltry.com` (+ variantes `-test`) — résolus via GSLB ; batch local en MMKV `AthenaKV` + SQLite `athena.db` si offline ; canal alternatif AIDL vers l'app système Transsion (`AthenaTrackService`).

**Identifiants** : un `athena_id` par app + un **OneID/`tsid` cross-app** (voir Flux 10) ; chaque upload porte `opid, tsid, vaid, gaid, tuid, osver, aver, build, lang, brand, model, net, uts, mcc, mnc, ekey`.

**Événements automatiques du SDK** :
| Événement | Données | Déclencheur | Classe |
|---|---|---|---|
| `device` | `iid`/`iid2` (**IMEI hashés**), `isd`/`isd2` (**IMSI hashés**), `aid` (ANDROID_ID hashé), `sn` (serial), `chip` | 6 s après init | `AthenaAnalytics.W()` :480-562 (réflexion `getImei`, `getSubscriberId`, `Settings.Secure.android_id`, `Build.getSerial()`) |
| `device_id_transfer` | `pre_gaid` + **`sn` serial BRUT non hashé** | changement d'athena_id | `enatha/anehat.java:48` |
| `location` | `lng`, `lat` (2 déc.), `geono` (geohash), **`cellidlist`** (cellules + signal) | one-shot silencieux au démarrage | `enatha/enatha.java:446-487` |
| `app_launch`, `app_heartbeat` | — | init / toutes les heures | `AthenaAnalytics.java:169,374` |
| `page_enter/page_view/app_active` | `purl` (Activity), `s_id`, durée | lifecycle | `ga/athena.java:181-229` |

**Événements métier app** (tid 2570 « Oneroom », pub 6525 « mb_ad ») : `app_start` (source launch/deeplink/**push**, canal utm), `app_stop` (durée), `login_active` (**userId + userType**), `notification`, `download`, `pip`, `minitv_play`, stats widget… via façade `qi/h.java`. Le compte est lié : `AthenaAnalytics.Z(accountType, account)`.
**Attribution** : install referrer Play (timestamps click/install) → `attribution/ReferrerTask.java`.
**Pont WebView** : `AthenaJsInterface` expose `getGAID()`, `getVAID()`, `track()` aux pages H5.

**Verdict** : les événements d'usage sont fonctionnels, mais **IMEI/IMSI/ANDROID_ID/serial + GAID/VAID + cellidlist + geohash = pistage matériel persistant** avec fédération cross-app (OneID). Le serial **brut** dans `device_id_transfer` est le point le plus sensible.

## Flux 2 — 🟠 OneID Transsion (identité cross-app)

**Destination** : `ire-oneid.shalltry.com` (fallback `oneid-dev-sg.shalltry.com`), `bz/l.java:13`.
**Données** : fingerprint complet — brand/model/rom/ram/battery/screen, `ro.build.fingerprint`, baseband, langue, timezone, **gsf android_id + hdid**, **liste des applications installées** (`AppIdInfo`) — échangé contre `odid`/`tsid`.
**Usage** : `tsid` joint à chaque upload Athena → fédération d'identité entre toutes les apps Transsion du téléphone.
**Verdict** : 🔴 **profilage cross-app** (aucune fonctionnalité MovieBox ne l'exige).

## Flux 3 — 🟢 Firebase Analytics / Crashlytics / Performance

**Destination** : `app-measurement.com/a`, crashlytics Firebase — projet `oneroom-77885`.
**Données** : `screen_view` (12+ écrans : HomeFragment:1566, ShortTvVideoFragment:1011, DownloadMainFragment:400…), événements `download_click` (`subject_id`, `resource_id`, `play_type`), `long_video_play`, métriques mémoire attachées à chaque event (`max_heap`, `rss`…), `setUserId` (userId compte, sinon id device), Firebase Performance instrumente même les requêtes Athena/GSLB.
**Kill switch** : `e.p(boolean)` coupe Analytics+Crashlytics (exposé dans les settings privacy).
**Verdict** : 🟢 technique (crash/perf/UX) ; le setUserId crée un lien compte↔device standard.

## Flux 4 — 🟠 APMInsight (Pangle/ByteDance)

**Destination** : config dynamique Pangle → `*/settings/get`, `*/monitor/collect/c/{exception,crash,native_bin_crash}`.
**Données** : crashes du SDK pub + `host_appid=10000001`, device_id Pangle, `render_type`. Initialisé par `openadsdk/ApmHelper.java:200`.
**Verdict** : 🟢 technique (stabilité du SDK pub) mais géré par ByteDance.

## Flux 5 — 🟠 Télémétrie BFF (i-api.aoneroom.com)

| Endpoint | Données | Déclencheur | Verdict |
|---|---|---|---|
| `POST statistics/user-operation` | `{opType:int}` — opérations VIP/membership | `MemberProvider.n(OpType)` :569 | 🟠 |
| `POST message/report` | accusé de réception push (msgId…) | réception push (`PushRegisterManager.y`) | 🟢 |
| `POST retrieve_client_logs/report` (+ `GET client_logs_retrieve/config`, `GET upload/sts-token/v2`) | **zip des logs du téléphone** envoyé vers OSS | **commande push `clientLogsRetrieve`** ou feedback | 🟠 sensible (contenu des logs non auditable ici) |
| `POST search-anaylze/seek` | `{q: mot-clé, before:bool}` | chaque recherche (`SearchResultViewModel:166`) | 🟠 historique des recherches |
| Push register | `{firebaseToken, twibidaClientId, notifySwitchOff}` | démarrage | 🟢 |

## Flux 6 — 🟠 Télémétrie de visionnage (profil de consommation)

Par lecture (`postdetail/layer/local/c0.java:688,933` + doublon Firebase `long_video_play`) : `play_duration`, `total_duration`, `play_complete` (%), `video_complete`, **`seek_count`**, `buffer_count`, `buffer_time`, `pause_count/duration`, `video_bitrate`, `audio_bitrate`, `app_to_background`, `subject_id`, `resource_id`, `play_type` + variantes `_middlepage/_fullscreen/_pip`. Idem UGC (`ugcvideodetail/hepler/a.java:208`), audio (`audio/player/a.java:95`), PiP.
L'historique de visionnage local (Room, `HistoricalPlayRecordViewModel`) n'a **pas d'envoi direct** trouvé — c'est l'agrégat par lecture qui part.
**Verdict** : 🟠 fonctionnel pour les recommandations, mais constitue un profil de consommation complet côté serveur.

## Flux 7 — 🟠 Localisation

- Permissions : `ACCESS_FINE_LOCATION`, `COARSE`, `ACCESS_MEDIA_LOCATION`
- Collecte : `LocationPlaceHelper` (FusedLocation + Geocoder + **Google Places** NAME/ADDRESS/LAT_LNG :223)
- Envois fonctionnels : `GET location/near-address?lat&lon`, `GET post/nearby`, `POST group/list/nearby`, `GET post/explore?lon&lat`, payload posts `lat/lon/poiName`
- Envoi Athena : événement `location` (lat/lng + **cellidlist**) — cf. Flux 1
**Verdict** : nearby/posts = 🟢 fonctionnel (opt-in) ; le flux Athena = 🔴 profilage silencieux.

## Flux 8 — 🟢 X-Client-Info (chaque requête BFF)

`package_name, version_name, version_code, os, os_version, install_ch, device_id, install_store, gaid, brand, model, system_language, net, region, timezone, sp_code`.
**Verdict** : 🟢 nécessaire au routage/personnalisation — mais transporte le `gaid` systématiquement.

## Flux 9 — ⚪ Absences notables

**Aucun** AppsFlyer, **aucun** Adjust, pas de Facebook AppEvents (seulement `com/facebook/biddingkit` → `an.facebook.com` pour l'enchère pub). TPush : enveloppe `PushRequest` non auditable en Java.

## Flux 10 — ⚪ Non déterminables en statique

- Destination finale de la télémétrie **native Aliyun** (`builddatas.json` → événements 2000090-92 du lecteur : consommés par le code natif du player)
- URL de l'APM Pangle (résolue à runtime)
- Contenu chiffré des payloads TPush

---

## Synthèse décisionnelle

| Pour bloquer le pistage sans casser l'app | Bloquer | Conserver |
|---|---|---|
| Identifiants matériels & cross-app | `dsu/dsc.shalltry.com` (Athena), `ire-oneid.shalltry.com` (OneID) | `gslb.shalltry.com` (nécessaire au routage) |
| Profilage pub | voir `03-eradication-pub/` | — |
| Géoloc silencieuse | refuser la permission (l'app dégrade proprement) | — |
| Télémétrie Firebase | désactivable in-app (settings privacy, `e.p(false)`) | — |
