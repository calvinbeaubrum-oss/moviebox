# Fiche d'identité — MovieBox

## 3.0.16 (version analysée, packée)

| Champ | Valeur |
|---|---|
| Fichier | `moviebox-v-3.0.16.0708.03.apk` |
| Package | `com.community.oneroom` |
| versionCode / Name | `50020115` / `3.0.16.0708.03` |
| Taille / SHA-256 | 65 916 806 o / `fa2acf749122de64ea491452a247f9444b86a0cf05deafe7836bd25b0a1f2101` |
| Signature | `META-INF/ONEROOM.RSA` (PalmPlay / Transsion) |
| Application manifest | `gj.hfr.xal.QMcx78qX` (stub Ijiami) → vraie app : `com.transsion.subroom.app.SubRoomApp` |
| Component factory | `gj.hfr.xal.Q72fXAapH` (intercepte la création de tous les composants) |
| minSdk / targetSdk | 23 / 35 (Android 15) |
| `usesCleartextTraffic` | **true** + `network_security_config` sans pinning (`overridePins="true"`) |
| Build | AGP 8.6.0, Git `fcfe582c3bb33c02a845ad75575c34a421328ba1`, Tinker `tinker_id_50020115` |
| Protection | Packer **Ijiami** (爱加密) : DEX chiffré 61,4 Mo, libs natives `assets/MSDvUDPFc/<abi>/` (UPX falsifié) |

## Permissions : 57 (44 en 3.0.15, +13 en 3.0.16)

Les plus notables : `REQUEST_INSTALL_PACKAGES` (installe des APK), `SYSTEM_ALERT_WINDOW` (pubs flottantes), `USE_FULL_SCREEN_INTENT`, `READ+WRITE_CALENDAR`, `RECORD_AUDIO`, `CAMERA`, `ACCESS_FINE_LOCATION` (+ scan Wi-Fi `NEARBY_WIFI_DEVICES`, `MANAGE_WIFI_NETWORK_SELECTION`), `READ_MEDIA_*` (médiathèque), `GET_ACCOUNTS`/`AUTHENTICATE_ACCOUNTS` (compte système), `WRITE_SETTINGS`, `RECEIVE_BOOT_COMPLETED` + `WAKE_LOCK` + `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` (démarrage auto, survie arrière-plan), `com.android.vending.BILLING`, `POST_NOTIFICATIONS`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`.

## Composants manifest (structure)

- **Activités** (~120) : Splash, Main, DeepLinkHandler, vidéo (Stream/Movie/UGC/Music/Local detail), shorttv, player (longvideo + `ResolutionUnlockActivity`), room/*, usercenter/*, search, publish, downloader, mini-apps (`:mini` ×4 process), ads test, RewardsCenter, payment (TranPay/PayWeb)
- **Services** : MediaService (mediaPlayback), DemoDownloadService (dataSync), DownloadGuardService, TinkerPatchService (`:patch`), SoLoadService (`:dyso`), H5Update, AccountService/AccountSyncService, FCMMessageService, AthenaTrackService, Firebase Components
- **Receivers** : widgets (HotSubject, Play, SportSchedule), BootReceiver (priorité max), PushTriggerReceiver, AppMeasurement, FirebaseInstanceId
- **Providers** : FileProvider×5, HisavanaContent/Config, AccountSync (`…storage.account.sync`), **FastCleanerProvider** (`…storage.contacts.sync`, ContactDirectory → annuaire de contacts système), FirebaseInit, TheRouter
- **Deep links** : `oneroom://com.community.oneroom`, `oneroom://com.community.moviebox`, `oneroom://member/adtask` ; App Links https (12 hôtes, autoVerify) : `v/h5.aoneroom.com`, `moviebox.ng`, `v.moviebox.ng`, `m.mvbrowse.com`, `moviebox.biz`, `moviebox.ac`, `movie-box.tv`, `moviebox.ph`, `v.moviebox.ph`, `moviebox.club`, `movieboxhd.net`
- **Modules Transsion embarqués** (versions manifest) : athena 3.1.1.4 (APM), http 1.0.53.01, gslb 1.0.3.2, coreutil 1.0.61.09, json 1.0.5.01, push 2.0.2.01, hisavana 3.6.0.1, crypto 1.0.9.01, tinker 1.9.15.2, mini-app SDK 12.0.14-mb
