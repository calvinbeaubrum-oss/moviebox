# 07 — Logique métier locale (ce qui tourne sur le téléphone)

## 1. Mises à jour à chaud (points de contrôle majeurs)
| Module | Process | Mécanisme |
|---|---|---|
| **Tinker 1.9.15.2** (Tencent) | `:patch` | Hotpatch DEX téléchargé + appliqué à chaud (`TinkerPatchService`, stubs hotplug d'activités, `TINKER_ID=tinker_id_50020115`) — peut réécrire toute la logique |
| **WeCloud SoLoader** | `:dyso` | `com.wecloud.load.lib.SoLoadService` charge des `.so` dynamiques (asset `libK58dcVX*.so`, UPX) |
| **H5Update** | — | `LocalH5UpdateService(+JobService)` : mise à jour silencieuse des bundles web |
| **Upgrade SDK** | — | `appUpgrade/{pkgName}.json` (3 variantes de store), `app/upgrade/issued`, `ACCESS-KEY` header |

## 2. Compte système et contacts (ingénierie sociale des permissions)
- `AccountService` (AccountAuthenticator, type `com.community.oneroom.accounttype`) + `AccountSyncService` (SyncAdapter, `supportsUploading=true`) → **le device pousse des données** via la synchronisation
- **`FastCleanerProvider`** sur `…storage.contacts.sync` déclaré `android.content.ContactDirectory=true` → l'app s'enregistre comme **annuaire de contacts du système** (justification du READ_CONTACTS implicite)
- `BootReceiver` (priorité 2147483647) : BOOT_COMPLETED, MEDIA_MOUNTED… → démarrage auto

## 3. Gating premium (voir 04)
`ResolutionUnlockActivity` (résolution), `vip/member/rights-check`, `profile/consume-judge`, bannières `member_banner_*`, RewardsCenter (`oneroom://member/adtask`).

## 4. Laboratoire / debug embarqué
- `LaboratoryActivity`, `DevActivity`, `MccActivity`, `LabMiniAppSDKTestActivity`
- **Sélecteur d'hôte API** (`dialog_lab_http_host.xml`) : api3 (défaut), test-mse-api, api4, api4sg, api6, api.inmoviebox.com, api7, api8 + **champ libre de surcharge** + Reset
- Test pub complet (`TestAd*Activity` ×20) : plans, scènes, MCC

## 5. Persistance et IPC
MMKV (`apkdeviceid`, `apkgaid`, `time_offset`, `appid`), Room (MultiInstanceInvalidationService), DataStore, WorkManager, `MessengerUtils` (IPC `com.community.oneroom.messenger`), mini-apps en process `:mini` (V8, IPC multiprogress ×4), `:patch` (Tinker), `:dyso` (WeCloud)

## 6. Télémétrie / analytique
| Canal | Cible |
|---|---|
| **Athena / APMInsight** 3.1.1.4 | service AIDL `AthenaTrackService`, libs `libapminsight{a,b}.so`, carte d'événements `assets/builddatas.json` (keys 2000090-92 = alertShow/alertDismiss/play) |
| **Firebase Performance** | proto `perf_metric.proto` embarqué (PerfMetric/TraceMetric/NetworkRequestMetric/GaugeMetric) |
| **Crashlytics** (+NDK) | mapping file `99ea5c7e…` |
| **NMS** (`libnms.so`) | monitoring réseau (empreinte ByteDance) |
| `statistics/user-operation`, `message/report`, `retrieve_client_logs/report` | reporting HTTP BFF |
| `builddatas.json` | instrumentation déclarative des vues lecteur |

## 7. Fonctions utilitaires de l'app
- Transfert Wi-Fi entre téléphones (hotspot, HTTP+WS local port 9890, `WifiP2P*Activity`)
- Mini-apps (SDK TMC : V8, multiprocess, permissions déclaratives `scopesV2`, login `__internalLogin`)
- Lecteur : ijkplayer/media3/Aliyun, DRM PlayReady, sous-titres (opensubtitles VIP + `subject-api/*captions`), vitesse/pixel format configurables
- Éducation (`edcation/*`), novels (BT_NOVEL), sport (`SportSchedulePreviewWidget`), widgets d'écran d'accueil ×3
- QR code (zxing), localisation (Google Places, `location/near-address`), upload vidéo (STS Aliyun via `upload/sts-token/v2`)
