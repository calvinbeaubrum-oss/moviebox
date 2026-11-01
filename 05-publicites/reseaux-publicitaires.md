# 03 — Publicités : les régies embarquées

L'application embarque **6 à 7 SDK publicitaires** (médiation maison `com.transsion.ad.*` + `wrapperad`). Les créations sont servies selon des plans configurés serveur (activités de test `TestAd*Activity` complètes dans le manifest, config `TestAdMccActivity`).

## Réseaux identifiés (manifest + libs + ressources)

| # | Réseau | Version | Preuves |
|---|---|---|---|
| 1 | **AdMob (Google)** | GMS ads | `APPLICATION_ID = ca-app-pub-5464101117258718~2034480240`, `AdActivity`, `INTEGRATION_MANAGER=webview`, `AppMeasurement*` |
| 2 | **Pangle (ByteDance)** | 7.1.1.4 | `com.bytedance.sdk.openadsdk.*` (TTRewardVideo, TTInterstitial, TTLandingPage, TTAppOpenAd…), `BinderPoolService`, libs `libpglarmor.so`, `libtobEmbedPagEncrypt.so`, JS injectés `byteh5monitor/prefetch/privacy.aio.min.js` |
| 3 | **Mintegral (MBridge)** | — | `com.mbridge.msdk.*` (MBRewardVideo, LoadingActivity), `NetWorkChangeReceiver`, **socket TCP 9377** (reporting, protocole binaire maison) |
| 4 | **Hisavana (Transsion)** | 3.6.0.1 | `com.cloud.hisavana.sdk.*`, providers `…oneroom.HisavanaContentProvider/ConfigContentProvider/FileProvider`, A/B `assets/hisavana_ab_data.json` (projet **79**, bucketing déterministe par device), clé RSA `assets/hisavana_rsa_public_key.pem`, `tran_hisavana_version` |
| 5 | **EagllWin / TMC buyout** | SDK 12.0.14-mb | `com.transsion.ad.bidding.*` (splash/interstitial/video/h5), `WrapperAdProvider` (TheRouter `/wrapperAd/WrapperAdProvider`), `AppLaunchProxyActivity`, config `api.eagllwin.com`, formulaires pub `AD_SUBMIT_FORM` |
| 6 | **Vungle (Liftoff)** | — | `com.vungle.ads.*` (VungleActivity), provider `…oneroom.vungle-provider`, OMSDK `res/raw/omsdk_v1*.js`, `omid_session_client_v1_5_3.js`, config `config.ads.vungle.com` |
| 7 | **Meta Bidding** | — | mentionné dans l'audit 3.0.15 (Audience Network) |

### Privacy Sandbox (Android)
`ACCESS_ADSERVICES_ATTRIBUTION`, `ACCESS_ADSERVICES_AD_ID`, `ga_ad_services_config.xml` : `<attribution allowAllToAccess="true"/>` (toutes les sources peuvent lire l'attribution).

## Types d'annonces servies
Splash (au démarrage — `BiddingBuyOutSplashActivity`, HisavanaSplash), interstitiels plein/half écran, récompensées (rewarded), natives (liste, multiple), bannières, icônes, H5/landing pages, vidéo auto-fullscreen, "irregular view", playables (TTLandingPage/PlayableLandingPage).

## Mécanique de médiation maison
- `com.transsion.ad.test.ad_config.*` : plans/scarlets par MCC (géolocalisation), scènes — la config des régies arrive **du serveur** (dialogue de debug `TestAdPlansActivity`, `TestAdOtherConfigActivity`)
- `WrapperAdProvider` : SSR/buyout — l'app achète l'inventaire et revend
- `X-Client-Info` (header réseau) alimente le ciblage (device, région, gaid)
- AB testing Hisavana : `hisavana_ab_data.json` embarqué (fallback), vars `isChangeEwRequestStrategy` etc., bucketing par `domain_start_pos` + buckets de hash device
-_pub "installer" : `AppLaunchProxyActivity` + `REQUEST_INSTALL_PACKAGES` (pubs qui installent des APK)

## Les pubs côté utilisateur
- Bannières/interstitiels dans les listes et lecteurs
- **Récompensées** : visionnage → points/récompenses (boucle `RewardsCenterActivity`, `activity/ad-task-list`, `download-task-receive`)
- Sans VIP : pubs partout (voir `04-paiements-vip`)
- Pubs flottantes possibles (`SYSTEM_ALERT_WINDOW`) et plein écran sur écran verrouillé (`USE_FULL_SCREEN_INTENT`)
