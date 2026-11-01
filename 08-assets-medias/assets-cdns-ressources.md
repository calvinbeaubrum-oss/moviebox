# 05 — Assets, médias, CDNs et configurations embarquées

## 1. CDNs de contenu
| CDN | Usage | Chemins |
|---|---|---|
| `pbcdn.aoneroom.com` | images/contenus prod | `/image/AAAA/MM/JJ/<hash>.png|gif` |
| `test-acdn.aoneroom.com` | assets de test | icônes VIP (webp), vidéo test `/media/video/2022/08/11/<hash>-sd.mp4` |
| `pacdn.aoneroom.com` | images (client Glide Cronet dédié) | — |
| `app-oss.byte-app.com` | paquets mini-apps | `/app/apppackage/<appId>/<version>_<sha>.zip`, logos `/platform/register/app/logo/…?x-oss-process=image/resize…` |
| `transsion-miniapp-android-cdn.oss-eu-central-1.aliyuncs.com` | CDN OSS mini-apps (Europe) | — |
| Streaming | URLs livrées à l'exécution par `subject-api/play-info` / `ugc/video/play` | HLS `.m3u8`, DASH, DRM PlayReady |

## 2. Configurations JSON embarquées (fallbacks hors-ligne — schémas = contrats serveur)
| Fichier (`assets/`) | Contenu |
|---|---|
| `appTab.json` | Onglets : `bottomTabs[]{name, btTabCode, btTabType(BT_HOME/BT_NOVEL/BT_OPERATE/BT_DOWNLOADS/BT_ME), icon{}, subTabs[]{tabId, name, type(OperateTab/H5Tab/TrenTab/ShortTvTab/NovelTab/SubjTab), tabCode, url, displayType:REDIRECT, isEducationTab, gatherTabIcon…}}` — 5 onglets racine, 16 sous-onglets Home |
| `room_top_tab.json` | Room UGC : `defTabId:explore, version, items[]{tabId(explore/images/nearby), type:post}` |
| `skulist.json` | Billing : `skuList:null` (serveur), `memberRights[]{icon, description}` (les 3 droits VIP) |
| `sub_def_la.json` | Sous-titres : 13 langues `{lan, lanIOS3, lanName}` (en,hi,fr,in_id,pt,ar,ur,bn,pa,ha,sw,zh,ru) |
| `local_mcc.json` | MCC→pays : `{Country, Mcc, Iso, CountryCode}` |
| `sdk_country_cc_mcc.json` | Mapping pays étendu (SDK) |
| `hisavana_ab_data.json` | A/B pub Hisavana : `project_id:79, layers, vars[{var_id, exp_id, buckets[], info{isChangeEwRequestStrategy}, countries, versions}]` |
| `builddatas.json` | Instrumentation : `report[{classname:IPlayTempleView, method:alertShow/alertDismiss/play, key:2000090-92}]` |
| `therouter/routeMap.json` | Routing interne : `/loginapi/select_country`, `/Login/Api`, `/download/*`, `/wrapperAd/WrapperAdProvider`, `/web/web`, `/stream/details`, `/playvideo/*`, `/profile/*` |
| `mini_offline/<id>/*.json` | Mini-apps : `FrameInfoResponseData` / `AppinfoResponseData` (protobuf-JSON), scopes `network/readPhotosAlbum/scanCode/basicAbility` |
| `appTab.json` (Live tab) | TV sport : `https://sportsnow.top/?currentTagId=…&utm_source=mb_app_inner` |

## 3. Arrays de ressources notables (`res/values/`)
- `analysing_array` / `long_vod_analysing_array` : **sites pirates référencés** par l'analyseur de téléchargement : `fzmovie.net`, `netnaija.com`, `1377x.to`, `123moviesfree.net`, `eztvtorrent.co`, `downloads-anymovies.co`
- `interest` + `interestId` : 12 intérêts onboarding avec UUID serveur (ex. Sport `462593c9-00c8-4ccd-9f20-89e9119bfd7a`)
- Chaînes clés : `google_api_key=AIzaSyDoUlg4QWx_EYkLV9IoIzaRvysnE_7G_EQ`, `google_app_id=1:696179319202:android:…`, `project_id=oneroom-77885`, `default_web_client_id=696179319202-hekemrrgc6kdd33tfr0sktarq53808ga.apps.googleusercontent.com`, `crashlytics.mapping_file_id=99ea5c7e…`, `t.me/moviebox_request`

## 4. Assets chiffrés au repos (déchiffrés à l'exécution)
`dic`, `labresencscfg` (config de déchiffrement), `watch_info.js`, `WebViewJavascriptBridge.js`, `ShellJSBridge/byteh5bridge_v240815.aio.min.js`, `license.crt` (licence Aliyun VOD, clé `**RÉDACTÉ**`), `rsa_public_key.pem` = `hisavana_rsa_public_key.pem` (417 o, identiques, chiffrés), `lable_art_xxx.lab`, binaires `C90ie74Rj` (181 296 o), `DIaO1FTS` (87 536 o), `Wic8HNcb` (313 536 o), PNG placeholder 0 octet (`cfg_cjdk_md_fes.png`…), `shell_data__xxxyyy.png` (header du payload Ijiami).
**Packée** : `libK58dcVX*.so` (WeCloud SoLoader, ELF ARM/UPX modifié).

## 5. Librairies natives (`lib/arm64-v8a`)
Lecture/encodage : `libalivcffmpeg`, `libijk{ffmpeg,player,sdl}`, `libav{codec,format,util}`, `libsw{resample,scale}`, `libsaas{CorePlayer,Downloader}` (Transsion SaaS), `libmedia3ext`, `libmediainfo`, `libgav1JNI` (AV1), `libimg_utils`
Sécurité/télémétrie : `libapminsight{a,b}.so` (Athena APM), `libnms.so` (monitoring réseau), `libpglarmor.so` + `libtobEmbedPagEncrypt.so` (Pangle)
Autres : `libmmkv` (stockage), `libcrashlytics*`, `libglide-webp`, `libandroidx.graphics.path`, `lib{buffer,file_lock}_pgl.so`
