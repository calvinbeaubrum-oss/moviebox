# 02bis — Hôtes/IP, GSLB, en-têtes, signature, authentification, sockets

## 1. Hôtes et adresses

### Flotte API (contenu)
| Hôte | Rôle |
|---|---|
| `api6.aoneroom.com` | **Base par défaut release** (CacheIpPool) |
| `api3`, `api4`, `api4sg`, `api5`, `api6sg`, `api7`, `api8.aoneroom.com` | répliques/régions (hints QUIC `ig/c.java`) |
| `api.inmoviebox.com` | domaine alternatif |
| `test-mse-api.aoneroom.com` | staging (IP fallback pinnée : **8.219.92.106**) |
| `pacdn.aoneroom.com` | CDN images (client Glide dédié, Cronet/QUIC) |
| `test-acdn.aoneroom.com` | CDN assets de test |
| `i-api.aoneroom.com` / `i-api-test.aoneroom.com` | API images/médias |
| `h5-static.aoneroom.com` | pages H5 (privacy, terms) |
| `pbcdn.aoneroom.com` | CDN images (configs `appTab.json`…) |

### Hôtes transverses
| Hôte | Rôle |
|---|---|
| `gslb.shalltry.com` (+ bootstrap `dsu.shalltry.com`, `dsc.shalltry.com`, `api.twibida.com`) | résolution de domaines |
| `apigateway.tmctool.com` | passerelle (signature + télémétrie `/gateway/metric/add`) |
| `app-manage-api.shalltry.com` | gestion app |
| `api.paynicorn.com`, `cashier-serverweb.paynicorn.com/api/cancelPay` | paiements |
| `feature-api|test-feature-api.palmplaystore.com`, `upgrade-api|test-upgrade-api.palmplaystore.com` | PalmPlay store |
| `vip-api.opensubtitles.com/api/v1/` | sous-titres |
| `api.byte-app.com`, `app-oss.byte-app.com`, `api-static.byte-app.com` | mini-apps |
| `api.eagllwin.com`, `api.sunnbird.com`, `api-fat1.dlight-app.com`, `transsion-miniapp-android-cdn.oss-eu-central-1.aliyuncs.com` | mini-apps TMC |
| `100000.miniapp.transsion.com` | mini-app |
| `sportsnow.top` | TV sport live (H5) |
| `h5.dlight-app.com` | pages légales |
| `oneroom-77885.appspot.com` + Firebase (API key `AIzaSyDoUlg4QWx_EYkLV9IoIzaRvysnE_7G_EQ`, project `oneroom-77885`) | Firebase |
| `maps.googleapis.com` | Places (nearby) |
| `t.me/moviebox_request` | support |

### Adresses IP en dur
- `8.219.92.106` → `test-mse-api.aoneroom.com` (CacheIpPool, fallback test)
- Aucune autre IP en dur : tout passe par DNS + GSLB

## 2. GSLB — résolution dynamique des domaines

```
POST https://gslb.shalltry.com/gslb/domain/convert
X-Gslb-Sign: SHA256_hex(packageName + SHA256_hex(gaid))
Content-Type: application/json

{"appId":"com.community.oneroom",
 "key":"<SHA256_hex(gaid)>",           // gaid : GAID sinon UUID (SP gslb/deviceID)
 "oldKey":"<SHA256_hex(ancien gaid)>"|"",
 "domains":["api6.aoneroom.com",...],  // hôtes demandés
 "mcc":"<MCC>","locale":"<pays>","language":"<lang>","model":"<Build.MODEL>"}
```
Réponse : `{"code":200,"data":{"domainPairs":{...},"overrideFlag":bool,"expireTime":ms,"country":"..."}}`
→ persisté `files/gslb_<process>`, intervalle `expireTime` (min 24 h), 4 tentatives/sync.
→ **Chaque appel API** voit son host réécrit : `url.replace(hôte_origine, hôte_résolu)` (interceptor `ig.c`, et suppression du query param `host`).

Seed initial (map vide) : `dsu.shalltry.com`, `dsc.shalltry.com`, `api.twibida.com` → tous marqués `blank` jusqu'au premier sync réussi.

## 3. En-têtes HTTP (ordre des interceptors OkHttp : `kg/c.java`)

1. **`jg.c` — HeaderInterceptor**
   - `X-Client-Info` : JSON (`jg/b.java`) = `package_name, version_name, version_code, os=android, os_version, install_ch, device_id, install_store, gaid, brand, model, system_language, net, region, timezone, sp_code` (+ extras) — `device_id` = MMKV `apkdeviceid` → `MD5(android_id)` → `MD5(UUID)` ; `gaid` = MMKV `apkgaid` → GAID → UUID
   - `X-Client-Status`: `"1"`/`"0"` (consentement)
   - ré-émission des headers dynamiques registry : `X-Play-Mode`, `X-Family-Mode`, `X-Idle-Data`, `x-md-global-color` (posés par `StartupManager`)
2. **`ig.c` — DynamicHostInterceptor** : réécrit le host (CacheIpPool) + retire le query param `host`
3. **`GatewayInterceptor`** : `x-tr-signature` (+ `Host: <origine>:443` en mode gateway, gzip des métriques)
4. **`ig.a`** : consomme le pseudo-header `multiple_base_url` (redirige un appel vers un autre host)
5. **`com.transsion.baselib.net.f`** : auth (ci-dessous)

Autres headers vus : `X-Country/X-Gaid/X-Language/X-Model/X-VersionCode/X-CPU` (API aha, HeaderMap), `X-Ugc-Enabled` (UGC), `ACCESS-KEY` (upgrade), `X-Gslb-Sign` (GSLB). **Pas de User-Agent custom** (okhttp/4.x par défaut ; `player2024` pour les sous-titres ; UA Cronet pour QUIC).

## 4. Authentification des requêtes

### Utilisateur connecté
`Authorization: Bearer <token>` — token du bean `UserInfo` (réponses login/register/third-login), stockage local chiffré AES (TCrypterSdk).

### Invité (token vide)
`X-Client-Token: <millis>,<MD5_hex(reverse(String(millis)))>` — construit par `baselib/net/f.java` (reverse de chaîne = `b0.g()`, MD5 = `wg/a.java`).

### Signature universelle `x-tr-signature` (GatewayInterceptor + GatewaySignManager)
Chaîne signée (join `\n`) :
1. `METHOD` majuscule
2. header `accept` ("" si absent)
3. `content-type` ("" si absent)
4. `content-length` ("" si absent)
5. timestamp = `System.currentTimeMillis() + time_offset` (offset persisté SP `time_offset`, resync sur erreur `GW.4410`)
6. `MD5_hex(body)` — si body > 102 400 o : MD5 des 102 400 premiers octets
7. `path?query` — query URL-décodé puis **trié alphabétiquement par clé** (`k=v&k=v`)

`x-tr-signature: <timestamp>|2|<Base64(HMAC)>` — HMAC `HmacMD5` par défaut (`HmacSHA1`/`HmacSHA256` via header `x-tr-signature-method`), **clé = Base64.decode(gateway_secret_online)** = `**RÉDACTÉ**` (manifest). AppID : `4U01pxRu278GqCZKY9`. Test : `gateway_secret_test` = `**RÉDACTÉ**`.

⚠️ Ces secrets sont extraits de l'APK : ils authentifient le **client**, pas l'utilisateur.

## 5. Sockets / WebSockets — verdict

**AUCUN socket distant dans le code applicatif** (31 903 fichiers balayés) :
- `okhttp3.WebSocket` : présent (lib) mais jamais instancié ; zéro `ws://`/`wss://` distant
- Pas de MQTT (0 occurrence), Netty, gRPC ; RTSP présent dans l'ancien ExoPlayer mais jamais appelé
- **Rooms** = feeds HTTP ; **TV Live** = HLS/DASH (HTTP) ; **push** = FCM + TPush

Sockets existants (non-app) :
- **9890** : serveur HTTP+websocket LOCAL du transfert Wi-Fi entre téléphones (`zt/h.java`, keepalive `/pingpong`, `client-<ts>`/`server-<ts>`) — LAN uniquement
- **9377** : TCP Mintegral (reporting pub, protocole binaire maison)
- localhost : proxy cache vidéo danikula (port auto)

## 6. Sécurité TLS

- TrustManager **permissif** (`lg/a.java` : `checkServerTrusted` vide) + hostname verifier custom
- `usesCleartextTraffic=true` + `network_security_config` sans pinning (`overridePins="true"`)
- ⇒ MITM sans effort (CA utilisateur acceptée en debug, HTTP clair autorisé globalement)
