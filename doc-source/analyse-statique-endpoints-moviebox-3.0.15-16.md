# Analyse statique comparative — Endpoints MovieBox 3.0.15 → 3.0.16

**Objet** : extraction des routes REST, headers, authentification et sockets depuis les sources décompilées de la 3.0.15 (non packée, 31 903 fichiers, `mb15/`), croisée avec l'audit 3.0.16 (manifest + ressources, déjà certifié).
**Date** : 31 octobre 2026. **Méthode** : analyse statique (annotations Retrofit survivant à l'obfuscation R8 + lecture des interceptors/gateways).
**Fiabilité** : les routes ci-dessous sont **les définitions exactes compilées dans l'APK** (chaînes littérales non obfusquées). La 3.0.16 ne pouvant pas être décompilée (Ijiami), elles sont certifiées pour la 3.0.15 ; le dialogue debug « host select » de la **3.0.16** (`dialog_lab_http_host.xml`) liste exactement les mêmes hôtes API que le code 3.0.15 (`api3/api4/api4sg/api6/api7/api8/test-mse-api.aoneroom.com` + `api.inmoviebox.com`), ce qui conforte la continuité de l'API entre les deux versions.

---

## 1. Architecture réseau du client

| Composant | Détail |
|---|---|
| Client HTTP | OkHttp 4.x (`kg/c.java`, `j()`) + Cronet/QUIC en transport alternatif |
| Base URL (release) | `https://api6.aoneroom.com` (`CacheIpPool`, défaut compilé) |
| Base URL (test) | `https://test-mse-api.aoneroom.com` (IP pinnée en fallback : `8.219.92.106`) |
| Rotation d'hôtes | `ig.c` (DynamicHostInterceptor) réécrit le host via CacheIpPool et **supprime le query param `host`** des requêtes ; pseudo-header `@Header("multiple_base_url")` pour rediriger ponctuellement un appel vers un autre host |
| Flotte (hints QUIC) | `api3/api4/api4sg/api5/api6/api6sg/api7/api8.aoneroom.com`, `api.inmoviebox.com`, `pacdn.aoneroom.com` (images, client Glide dédié), `i-api.aoneroom.com` (+ `i-api-test`), `h5-static.aoneroom.com`, `app-oss/api-static/api.byte-app.com`, `api.sunnbird.com`, `api-fat1.dlight-app.com` |
| GSLB | **Bootstrap** : `dsu.shalltry.com`, `dsc.shalltry.com`, `api.twibida.com` → **sync** : `POST https://gslb.shalltry.com/gslb/domain/convert` (persisté dans `files/gslb_<process>`, intervalle 24 h, 4 tentatives) |
| Sécurité TLS | TrustManager **permissif** (`lg/a.java`, `checkServerTrusted` vide) + hostname verifier custom → MITM trivial (cohérent avec `network_security_config` de la 3.0.16) |

### 1.1 Requête GSLB (résolution de domaine)

```
POST https://gslb.shalltry.com/gslb/domain/convert
X-Gslb-Sign: SHA256_hex(packageName + SHA256_hex(gaid))

{
  "appId": "com.community.oneroom",
  "key":    "<SHA256_hex(gaid)>",          // gaid = GAID pub, sinon UUID de secours (SP "gslb"/deviceID)
  "oldKey": "<SHA256_hex(ancien gaid)>" ou "",
  "domains": ["api6.aoneroom.com", ...],   // hôtes à résoudre
  "mcc": "<MCC SIM>", "locale": "<pays>", "language": "<lang>", "model": "<Build.MODEL>"
}
```
Réponse : `{"code":200, "data":{"domainPairs":{"api6.aoneroom.com":"<hôte résolu>", ...}, "overrideFlag":bool, "expireTime":<ms>, "country":"<pays>"}}` → chaque URL d'appel subit `url.replace(domain_origin, domain_résolu)`.

---

## 2. En-têtes HTTP (interceptors, ordre d'exécution)

Ordre : `jg.c` (headers) → `ig.c` (host dynamique) → `GatewayInterceptor` (signature) → `ig.a` (multiple_base_url) → `com.transsion.baselib.net.f` (auth).

### 2.1 `X-Client-Info` (toujours envoyé) — JSON sérialisé dans le header
Champs construits par `jg/b.java` : `package_name`, `version_name`, `version_code`, `os=android`, `os_version`, `install_ch` (canal), `device_id` (MMKV `apkdeviceid` → sinon `MD5(android_id)` → sinon `MD5(UUID)`), `install_store`, `gaid` (MMKV `apkgaid` → GAID → UUID), `brand`, `model`, `system_language`, `net` (réseau), `region`, `timezone`, `sp_code` + extras dynamiques.
### 2.2 Identification / authentification
| Header | Quand | Valeur |
|---|---|---|
| `Authorization` | utilisateur connecté | `Bearer <token>` (token du bean `UserInfo`, stocké via TCrypterSdk AES local) |
| `X-Client-Token` | invité (non connecté) | `<millis>,<MD5_hex(reverse(String(millis)))>` |
| `X-Client-Status` | toujours | `"1"`/`"0"` (consentement) |
| `x-tr-signature` | **toutes** les requêtes | `<timestamp>|2|<HMAC_base64>` — voir §2.3 |
| `X-Play-Mode`, `X-Family-Mode`, `X-Idle-Data`, `x-md-global-color` | contextuels | registry dynamique (`StartupManager`) |
| `X-Country`, `X-Gaid`, `X-Language`, `X-Model`, `X-VersionCode`, `X-CPU` | API aha games | `@HeaderMap` |
| `X-Ugc-Enabled` | API UGC | flag |
| `ACCESS-KEY` | API upgrade | clé statique |
| `X-Gslb-Sign` | requêtes GSLB | `SHA256_hex(packageName + SHA256_hex(gaid))` |
| `Host: <origine>:443` | mode gateway | forcé par GatewayInterceptor |
| `X-User` | **réponse** du login | lu par `com/transsnet/login/q.java` |

### 2.3 Signature `x-tr-signature` (anti-falsification de requête)
Chaîne signée (champs joints par `\n`, ordre strict) :
1. `METHOD` majuscules — 2. header `accept` — 3. `content-type` — 4. `content-length` — 5. `timestamp` (millis + `time_offset` persisté, resynchronisé sur erreur gateway `GW.4410`) — 6. `MD5_hex(body)` (si body > 102 400 o : MD5 des 102 400 premiers octets) — 7. `path?query` avec query trié alphabétiquement par clé (`k=v&k=v`).

HMAC : `HmacMD5` par défaut (alternatives `HmacSHA1`/`HmacSHA256` via header `x-tr-signature-method`), clé = `Base64.decode(gateway_secret_online)` (valeur du manifest : `**RÉDACTÉ**`), sortie `Base64(NO_WRAP)`. Header final : `x-tr-signature: <timestamp>|2|<hmac>`.
AppID gateway : `4U01pxRu278GqCZKY9` (SP `appid`), hôte gateway : `apigateway.tmctool.com` (télémétrie `/gateway/metric/add`, gzip).

⚠️ Ces deux secrets sont extraits de l'APK (manifest) — ils authentifient le client, pas l'utilisateur.

---

## 3. Routes REST (233 déclarations, 219 paths uniques — 3.0.15)

Bases : `/wefeed-mobile-bff/*` = BFF principal (contenu, social, monétisation) ; `/wefeed-fm-bff` = FM/audio ; `/wefeed-short-bff` = shorts ; `/infras-mobile-bff` = infra/config ; `/open-api` + `trade/*` = paiements. Toutes sous `https://<host résolu>`.

### 3.1 Contenu films/séries (subject-api)
```
GET  /wefeed-mobile-bff/subject-api/get                     GET   /wefeed-mobile-bff/subject-api/resource
GET  /wefeed-mobile-bff/subject-api/resource-position       GET   /wefeed-mobile-bff/subject-api/play-info
POST /wefeed-mobile-bff/subject-api/list                    GET   /wefeed-mobile-bff/subject-api/filter-items
GET  /wefeed-mobile-bff/subject-api/season-info             GET   /wefeed-mobile-bff/subject-api/staff-info
GET  /wefeed-mobile-bff/subject-api/staff-related           GET   /wefeed-mobile-bff/subject-api/staff-subject-list
POST /wefeed-mobile-bff/subject-api/detail-rec              POST  /wefeed-mobile-bff/subject-api/daily-movie-rec
POST /wefeed-mobile-bff/subject-api/play-related-rec        POST  /wefeed-mobile-bff/subject-api/trending/v2
GET  /wefeed-mobile-bff/subject-api/search                  POST  /wefeed-mobile-bff/subject-api/search/v2
GET  /wefeed-mobile-bff/subject-api/search-rank(/v2)        GET   /wefeed-mobile-bff/subject-api/search-suggest
GET  /wefeed-mobile-bff/subject-api/subtitle-search         GET   /wefeed-mobile-bff/subject-api/get-ext-captions
GET  /wefeed-mobile-bff/subject-api/get-stream-captions     GET   /wefeed-mobile-bff/subject-api/dub-info
POST /wefeed-mobile-bff/subject-api/start-download-resource POST  /wefeed-mobile-bff/subject-api/finish-download-resource
GET  /wefeed-mobile-bff/subject-api/see-list-v2             POST  /wefeed-mobile-bff/subject-api/have-seen
POST /wefeed-mobile-bff/subject-api/want-to-see            POST  /wefeed-mobile-bff/subject-api/want-to-see-staff
POST /wefeed-mobile-bff/subject-api/widget                  GET   /wefeed-mobile-bff/subject-api/bottom-tab
GET  /wefeed-mobile-bff/subject-api/genre-top (fm-bff)      POST  /wefeed-mobile-bff/subject-api/genre-top
```

### 3.2 Shorts / UGC
```
GET  /wefeed-mobile-bff/shorts/get-info                     POST  /wefeed-mobile-bff/shorts/reel
POST /wefeed-mobile-bff/shorts/most-trending                GET   /wefeed-mobile-bff/shorts/mini-list
GET  /wefeed-mobile-bff/shorts/get-mini-captions            POST  /wefeed-mobile-bff/shorts/favorite
GET  /wefeed-mobile-bff/shorts/favorite-list                GET   /wefeed-mobile-bff/shorts/dub-info
GET  /wefeed-mobile-bff/ugc/video/get                       GET   /wefeed-mobile-bff/ugc/video/play
POST /wefeed-mobile-bff/ugc/video/play-multi                 GET   /wefeed-mobile-bff/ugc/video/caption
GET  /wefeed-mobile-bff/ugc/video/download                  POST  /wefeed-mobile-bff/ugc/video/start-download
GET  /wefeed-mobile-bff/ugc/video/finish-download (rel.)    GET   /wefeed-mobile-bff/ugc/video/list/by-my
GET  /wefeed-mobile-bff/ugc/video/list/by-user              GET   /wefeed-mobile-bff/ugc/video/first-by-subject
POST /wefeed-mobile-bff/ugc/trending/home                   GET   /wefeed-mobile-bff/ugc/trending/immersive
POST /wefeed-mobile-bff/ugc/trending/by-hashtag             GET   /wefeed-mobile-bff/ugc/trending/by-download
POST /wefeed-mobile-bff/ugc/trending/channel                POST  /wefeed-mobile-bff/ugc/trending/subscribe
GET  /wefeed-mobile-bff/ugc/trending/filter-edu             GET   /wefeed-mobile-bff/ugc/trending/by-ugc-video
GET  /wefeed-mobile-bff/ugc/search/result                   GET   /wefeed-mobile-bff/ugc/search/suggest
GET  /wefeed-mobile-bff/ugc/search/everyone                 GET   /wefeed-mobile-bff/ugc/search/rank
GET  /wefeed-mobile-bff/ugc/category/lev1-sub-list          GET   /wefeed-mobile-bff/ugc/collection/play-list
GET  /wefeed-mobile-bff/ugc/collection/download-list        GET   /wefeed-mobile-bff/ugc/collection/resolution
GET  /wefeed-mobile-bff/ugc/operating/tab-operating         GET   /wefeed-mobile-bff/ugc/operating/genre-top
GET  /wefeed-mobile-bff/ugc/operating/tab-rank-list
```

### 3.3 Social (post/comment/group/abonnements)
```
GET  /wefeed-mobile-bff/post/explore                        GET   /wefeed-mobile-bff/post/nearby
GET  /wefeed-mobile-bff/post/get                            GET   /wefeed-mobile-bff/post/list-by-tab
GET  /wefeed-mobile-bff/post/list/group                     GET   /wefeed-mobile-bff/post/list-trending/group
POST /wefeed-mobile-bff/post/list/immersive(/v2)            GET   /wefeed-mobile-bff/post/list/likes
GET  /wefeed-mobile-bff/post/list/subject                   GET   /wefeed-mobile-bff/post/list/user(/my)
POST /wefeed-mobile-bff/post/list/correlation               GET   /wefeed-mobile-bff/post/count/subject
POST /wefeed-mobile-bff/post/create                         POST  /wefeed-mobile-bff/post/delete
POST /wefeed-mobile-bff/comment(/list, /like, /ugc-video…)  POST  /wefeed-mobile-bff/interactive/ugc-video/like
POST /wefeed-mobile-bff/interactive/post/like               GET   /wefeed-mobile-bff/ugc-video/list/likes
POST /wefeed-mobile-bff/group/create|join|leave|update|visit GET  /wefeed-mobile-bff/group/get|exist|rank|list/*
GET  /wefeed-mobile-bff/subscription/subscription           POST  /wefeed-mobile-bff/subscription/subscription
GET  /wefeed-mobile-bff/subscription/feed|stats|status|v1/followings
GET  /wefeed-mobile-bff/community/tab|trending-entrance
```

### 3.4 Utilisateur / auth (user-api)
```
POST /wefeed-mobile-bff/user-api/get-sms-code               POST  /wefeed-mobile-bff/user-api/check-sms-code
POST /wefeed-mobile-bff/user-api/check-phone-account        POST  /wefeed-mobile-bff/user-api/check-mail-account
POST /wefeed-mobile-bff/user-api/register                   POST  /wefeed-mobile-bff/user-api/login
POST /wefeed-mobile-bff/user-api/third-login                POST  /wefeed-mobile-bff/user-api/logout
POST /wefeed-mobile-bff/user-api/reset-password             GET   /wefeed-mobile-bff/user-api/info
GET  /wefeed-mobile-bff/user-api/profile(/v2,/v3)           POST  /wefeed-mobile-bff/user-api/modify
POST /wefeed-mobile-bff/user-api/block | /unblock           POST  /wefeed-mobile-bff/user-api/submit-prefer
```
**Bean UserInfo (réponse login/register)** : `userId, token, username, nickname, avatar, gender, birthday, age, country, province, cc, userType, pcc, shortId, phone, email`. Header de réponse login : `X-User`. Invité = token vide → header `X-Client-Token` (§2.2).

### 3.5 Monétisation / VIP / récompenses
```
GET  /wefeed-mobile-bff/money/sku-list/get                  POST  /wefeed-mobile-bff/money/gp-trading-order/create
POST /wefeed-mobile-bff/money/gp-purchase-result/polling    POST  /wefeed-mobile-bff/money/paynicorn-trading-order/create
POST /wefeed-mobile-bff/money/paynicorn-purchase-result/polling
GET  /wefeed-mobile-bff/money/coin-log                      POST  /wefeed-mobile-bff/money/exchange/order
GET  /wefeed-mobile-bff/vip/member/detail                   POST  /wefeed-mobile-bff/vip/member/rights-check
GET  /wefeed-mobile-bff/vip/member/rewards-receive          GET|POST /open-api/payment/order/paynicorn
POST trade/checkout/cashierPay | loadConfig | txnInfo | cancel    GET trade/checkout/txnInfo
GET  trade/extend/transaction/currencyinfo
GET|POST /wefeed-mobile-bff/activity/* (task-list, ad-task-list, global-task, welfare-center,
         check-in, lottery/*, fission/*, rewards-receive, promo-code-bind, download-task-receive)
```

### 3.6 Système / config / divers
```
GET  /wefeed-mobile-bff/tab-operating                       GET   /wefeed-mobile-bff/tab/ranking-list
GET  /{dynamicPath}/app/config                              GET   /{dynamicPath}/activity/embedded-h5-list/v2
GET  /{appPath}/app/check-update                            GET   appUpgrade/{pkgName}.json (+ EE1, Ind)
POST app/upgrade/issued                                     POST  /infras-mobile-bff/v1/init
POST /bff/game.moviebox                                     GET   /app/game/movie-box/detail/game
POST /cloudBackup/system                                    POST  /distribute/active/mb | /distribute/candidate
GET  /wefeed-mobile-bff/upload/sts-token/v2 (upload OSS)    GET   /wefeed-mobile-bff/location/near-address
GET  /wefeed-mobile-bff/share/shorturl                      GET   /wefeed-mobile-bff/share/longurl
POST /wefeed-mobile-bff/search-anaylze/seek (sic)           GET   /wefeed-mobile-bff/sniff/config
GET  /wefeed-mobile-bff/feedback/label/list                 POST  /wefeed-mobile-bff/feedback/commit|report
GET  /wefeed-mobile-bff/message/* (internal/list, has-new, notify-bar/v2, push/local/list)
POST /wefeed-mobile-bff/message/report                      POST  /wefeed-mobile-bff/statistics/user-operation
GET  /wefeed-mobile-bff/client_logs_retrieve/config         POST  /wefeed-mobile-bff/retrieve_client_logs/report
GET  /wefeed-mobile-bff/music/like-list                     POST  /wefeed-mobile-bff/music/like
GET  /wefeed-mobile-bff/playlist/content                    GET   /wefeed-mobile-bff/live/match-detail|sub-upcomming-match
GET  /wefeed-mobile-bff/learning/*                          GET   /wefeed-mobile-bff/profile/preference-options
POST /wefeed-mobile-bff/profile/preference-submit           POST  /wefeed-mobile-bff/profile/consume-judge
POST /wefeed-mobile-bff/complete/search
```

### 3.7 Sous-titres et hébergements tiers (hors BFF)
| Hôte | Usage |
|---|---|
| `vip-api.opensubtitles.com/api/v1/subtitles?query=` et `/api/v1/download` | recherche/téléchargement de sous-titres (UA `player2024`) |
| `api.paynicorn.com`, `cashier-serverweb.paynicorn.com/api/cancelPay` | paiements Paynicorn |
| `app-manage-api.shalltry.com` | gestion app |
| `feature-api/test-feature-api.palmplaystore.com`, `upgrade-api/test-upgrade-api.palmplaystore.com` | PalmPlay store |
| `100000.miniapp.transsion.com` | mini-apps |
| `h5.dlight-app.com/outside/privacy-policy`, `h5-static.aoneroom.com` (privacy/terms) | pages légales |
| streaming vidéo | HLS/DASH via media3/ExoPlayer + Aliyun — URLs livrées par `subject-api/play-info` / `ugc/video/play` (manifests `.m3u8`, DRM PlayReady `schemas.microsoft.com/DRM/...`) |

---

## 4. Sockets / WebSockets

**Aucun socket distant dans le code applicatif.** Preuves :
- `okhttp3.WebSocket` présent mais **jamais instancié** par l'app ; aucun `ws://`/`wss://` en dur (hors lib interne).
- Pas de MQTT (0 occurrence), pas de Netty, pas de gRPC, pas de RTSP appelé.
- **Rooms** = feeds HTTP (pas de chat temps réel) ; **TV/Live** = HLS/DASH sur HTTP ; **push** = FCM + TPush.
- Le seul websocket est **local** : transfert de fichiers entre téléphones (`/pingpong`, port **9890**, keepalive texte `client-<ts>`/`server-<ts>`, AndroidAsync) — LAN uniquement.
- Sockets tiers : Mintegral (TCP **9377**, reporting pub), proxy vidéo local danikula (localhost).

---

## 5. Ce qui exige une exécution dynamique (limites franches de la statique)

1. **Les corps de requête exacts** (JSON) par endpoint : les beans existent dans les sources mais l'assemblage effectif (champs optionnels, pagination, tri) varie par appel — visible de façon fiable sur un MITM.
2. **Les réponses réelles** (schémas de contenu, URLs de streaming finales, formats des CDN `pacdn`/`acdn`).
3. **Le comportement réel du GSLB** (quels hôtes `domainPairs` renvoyés par région — la table est vidée au premier lancement).
4. **La rotation `X-Client-Token` invité** côté serveur (validité, fenêtre de temps).
5. **D'éventuelles routes ajoutées dans la 3.0.16 elle-même** (le module ajouté est Ijiami + nouvelles permissions ; le dialogue debug 3.0.16 liste les mêmes hôtes API, ce qui suggère une surface identique — mais seul un MITM ou le dump DEX 3.0.16 le prouverait à 100 %).

---

## 6. Références de fichiers (sources 3.0.15, `mb15/sources/`)

| Sujet | Fichiers |
|---|---|
| Client + interceptors | `kg/c.java`, `jg/c.java`, `jg/b.java`, `ig/c.java`, `ig/a.java`, `com/transsion/baselib/net/f.java` |
| Signature | `com/transsion/api/gateway/interceptor/GatewayInterceptor.java`, `GatewaySignManager`, `sercurity/{a,b,c,d}.java` |
| GSLB | `com/transsion/gslb/{GslbSdk,DomainManager,Worker,Utils}.java`, `com/transsion/core/utils/c.java` |
| Hosts | `com/tn/lib/net/dns/or/CacheIpPool.java` |
| Auth | `nx/a.java` (interface), `com/transsnet/login/q.java` (X-User), `com/transsnet/loginapi/bean/UserInfo.java` |
| Device IDs | `tg/b.java` |
| Extraction brute | `reverse_tools/mb16_ghidra/endpoints_3.0.15.txt` (261 décl.), `endpoints_final.txt` (table triée) |
