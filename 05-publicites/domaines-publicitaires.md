# 03 — Éradication de la publicité : domaines par régie

Extraction statique des sources 3.0.15 (`mb15/sources/`) — chaque domaine est classé **[vu dans le code]** ou **[probable — SDK standard, hosts dynamiques]**.

## Pangle / ByteDance — vus dans le code
| Domaine | Rôle | Source |
|---|---|---|
| `api16-access-ttp.tiktokpangle.us` (+ `-b`, `api16-access-ttp.tiktokpangle-b.us`) | API ads US | `openadsdk/core/sP.java`, `core/settings/*` |
| `api16-access-sg.pangle.io` | API ads SG | `core/settings/TEQ.java` |
| `api16-endcard-pack-sg.pangle.io` | endcards | idem |
| `lf-static.tiktokpangle-cdn-us.com` | CDN statique US (8 occurrences) | idem |
| `sf16-static.i18n-pglstatp.com` | CDN statique | idem |
| `sf16-scmcdn-sg.ibytedtos.com` | CDN settings | idem |
| `p16-sign-sg.tiktokcdn.com` | créatives/vidéos | idem |
| `gecko16-normal-useast5.tiktokv.us` | config Gecko | idem |
| `www.pangleglobal.com` | policy/doc | strings |

Note : le SDK Pangle embarque son propre APM (`com/apm/insight`, endpoints `/settings/get`, `/monitor/collect/c/*`) dont l'URL est résolue à runtime, et un **préchargeur** (`com/bykv/vk/openvk/preload/geckox`) dont la liste d'exclusion mentionne `connect.facebook.net`, `analytics.tiktok.com`, `google-analytics.com` (faux positifs — à ne pas bloquer sur cette seule base).

## Hisavana (Transsion) — vus dans le code
`api.hisavana.com`, `api.test.hisavana.com`, `api.fat1.hisavana.com`, `fast-api.hisavana.com`, `fra-api.hisavana.com`, `ind-api.hisavana.com`, `cc-api.hisavana.com`, `www.hisavana.com`, `hisavana-adx.transacme.com` (ADX, `net/NetGroup.java`), `material-static-oss.eagllwin.com`, `transsion-eagllwin-material-static-test.oss-ap-southeast-1.aliyuncs.com` (créatives test).
Intégrée au télémètre maison : Athena tid **8765** (`AthenaTracker.java:2595`).

## EagllWin / Sunnbird (TMC) — vus dans le code
`api.eagllwin.com` (prod, cleartext autorisé dans le manifest 3.0.16 !), `api.pre|test|fat1.eagllwin.com`, `api-fat0101.eagllwin.com`, `creative.eagllwin.com`, `api.sunnbird.com`, `api.pre|test.sunnbird.com`, `minproject(.test).sunnbird.com` (`TH5Update.java`, `i7/a.java`).

## Vungle (Liftoff) — vus dans le code
`config.ads.vungle.com` (config), `logs.ads.vungle.com` (`/sdk/metrics`, `/sdk/error_logs`), `events.ads.vungle.com`, `adx.ads.vungle.com` (`/api/ads`) — `VungleApiClient.java`.

## Mintegral (MBridge) — **aucun domaine en dur**
Les hosts sont construits dynamiquement/config serveur (`com/mbridge/msdk/**`). Domaines standards du SDK 15+ à bloquer : `mintegral.com`, `madserving.com` (ex. `wv.mbridge.madserving.com`), + socket TCP **9377** (non filtrable par DNS).

## Facebook Audience Network — bidding seulement
`an.facebook.com`, `www.facebook.com` (`biddingkit/bidder/c.java`). Pas de SDK AN complet (pas de `fbcdn` en code).

## Google — tracking pub résiduel
`pagead2.googlesyndication.com` (ping `gmob-apps`, `gms/ads/identifier/zza.java`), `www.googleadservices.com` (conversions, `gms/measurement/internal/zzbh.java`), `app-measurement.com` (Firebase). **Aucun `doubleclick.net` ni `admob` réseau** en dur — l'AdMob "complet" n'est pas embarqué (seul l'identifiant publicitaire GAID est collecté).

## PalmPlay / PS (distribution d'apps = installations sponsorisées)
`cdn2|test-cdn.palmplaystore.com`, `feature-api|test-feature-api.palmplaystore.com` (A/B pub), `empower-api|test-empower-api|ind-empower-api.palmplaystore.com`, `test-upgrade-api.palmplaystore.com`.

## Listes prêtes à l'emploi
- **`adguard-hosts.txt`** — format `||domaine^` (AdGuard/uBlock)
- **`nextdns-hosts.txt`** — domaines nus (NextDNS)

## Avertissements de blocage
1. **Ne pas bloquer** `aoneroom.com`, `byte-app.com`, `paynicorn.com`, `palmplaystore.com` si vous utilisez les fonctions correspondantes (les 2 premiers = tout le contenu ; palmplaystore = aussi les mises à jour d'app).
2. `ads.vungle.com` (wildcard) couvre tout le SDK Vungle 7 — sans effet de bord connu hors pub.
3. Bloquer `shalltry.com` (optionnel) coupe **Athena (télémétrie) + OneID + GSLB** : l'app bascule alors sur les hôtes par défaut (`api6.aoneroom.com`) et les événements télémétrie sont mis en file locale — l'app fonctionne mais la télémétrie partira au premier déblocage réseau (purge locale). Pour une éradication **totale**, combiner DNS + désactivation des permissions (localisation) + settings privacy de l'app (coupe Firebase).
4. Le socket TCP Mintegral **9377** n'est pas filtrable par DNS (couche blocage app/pare-feu type NetGuard requis).
5. Pubs servies aussi **depuis les CDNs de contenu** (`p16-sign-sg.tiktokcdn.com` etc.) : les bloquer peut casser des vignettes si un même CDN sert l'app.
