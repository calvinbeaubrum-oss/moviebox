# 02 — Réseau : endpoints REST (233 déclarations)

> Tables complètes : `data/endpoints_3.0.15_table.txt` (triée) et `data/endpoints_3.0.15_brut.txt` (brut, avec classes et lignes).
> Base : `https://api6.aoneroom.com` (release) / `https://test-mse-api.aoneroom.com` (debug). Voir `hosts-et-gslb.md`.

## Carte des préfixes

| Préfixe | Nb | Rôle |
|---|---|---|
| `/wefeed-mobile-bff` | 204 | BFF principal : contenu, social, user, monétisation, config |
| `/wefeed-fm-bff` | 4 | FM/audio (playlists, subjects) |
| `/wefeed-short-bff` | 1 | shorts |
| `/infras-mobile-bff` | 1 | init infra (`v1/init`) |
| `/open-api` | 2 | paiement Paynicorn |
| `trade/checkout|extend` | 5 | TranPay (caisse) |
| `/{appPath}`, `/{dynamicPath}` | 3 | config/check-update dynamiques |
| `appUpgrade*` | 4 | mises à jour |
| `/app`, `/bff`, `/cloudBackup`, `/distribute` | 5 | jeux, backup, distribution |

## Routes par domaine (extraction intégrale)

### Contenu films/séries — `subject-api`
- **Fiche & lecture** : `GET get`, `GET resource`, `GET resource-position`, `GET play-info`, `GET season-info`, `GET staff-info`, `GET staff-related`, `GET staff-subject-list`, `GET see-list-v2`, `POST have-seen`, `POST want-to-see`, `POST want-to-see-staff`, `GET dub-info`, `GET get-ext-captions`, `GET get-stream-captions`, `GET subtitle-search`
- **Découverte** : `POST list`, `GET filter-items`, `POST detail-rec`, `POST daily-movie-rec`, `POST play-related-rec`, `POST trending/v2`, `GET bottom-tab`, `POST widget`, `GET genre-top` (aussi fm-bff)
- **Recherche** : `POST search`, `POST search/v2`, `GET search-rank`, `GET search-rank/v2`, `GET search-suggest`
- **Téléchargement** : `POST start-download-resource`, `POST finish-download-resource`

### Shorts & UGC
- `GET shorts/get-info`, `POST shorts/reel`, `POST shorts/most-trending`, `GET shorts/mini-list`, `GET shorts/get-mini-captions`, `POST shorts/favorite`, `GET shorts/favorite-list`, `GET shorts/dub-info`
- `GET ugc/video/get|play|caption|download|first-by-subject|list/by-my|list/by-user`, `POST ugc/video/play-multi`, `POST ugc/video/start-download`, `GET ugc/video/finish-download` (rel.)
- `POST ugc/trending/home|by-hashtag|channel|subscribe`, `GET ugc/trending/immersive|by-download|filter-edu|by-ugc-video`, `GET ugc/search/{result,suggest,everyone,rank}`, `GET ugc/category/lev1-sub-list`, `GET ugc/collection/{play-list,download-list,resolution}`, `GET ugc/operating/{tab-operating,genre-top,tab-rank-list}`, `GET ugc-video/list/likes`

### Social (posts, commentaires, groupes, abonnements)
- Posts : `GET post/explore|nearby|get|list-by-tab|list/group|list-trending/group|list/likes|list/subject|list/user|list/user/my|count/subject`, `POST post/list/immersive(/v2)|list/correlation`, `POST post/create`, `POST post/delete`
- Commentaires : `POST comment`, `GET comment/list`, `POST comment/like`, `POST comment/ugc-video`, `DELETE comment(/ugc-video)`, `POST comment/user/list`
- Likes : `POST interactive/ugc-video/like`, `POST interactive/post/like`
- Groupes : `POST group/create|join|leave|update|visit|list/class|list/community-entrance|list/nearby|list/subject`, `GET group/get|exist|rank|list/my/v2|list/search|list/user`
- Abonnements : `GET subscription/subscription|feed|stats|status|v1/followings`, `POST subscription/subscription`
- Communauté : `GET community/tab|trending-entrance`, `GET location/near-address` (Google Places en amont)

### Utilisateur & auth — `user-api` (17 routes)
- Auth : `POST login`, `POST register`, `POST third-login`, `POST logout`, `POST get-sms-code`, `POST check-sms-code`, `POST check-phone-account`, `POST check-mail-account`, `POST reset-password`
- Profil : `GET info`, `GET profile(/v2,/v3)`, `POST modify`, `POST submit-prefer`, `POST block`, `POST unblock`
- Réponses : bean `UserInfo { userId, token, username, nickname, avatar, gender, birthday, age, country, province, cc, userType, pcc, shortId, phone, email }` ; header de réponse `X-User`

### Monétisation (money, VIP, activités, paiements)
- **Argent** : `GET money/sku-list/get`, `POST money/gp-trading-order/create`, `POST money/gp-purchase-result/polling` (Play Billing), `POST money/paynicorn-trading-order/create`, `POST money/paynicorn-purchase-result/polling`, `GET money/coin-log`, `POST money/exchange/order` (échange de points)
- **VIP** : `GET vip/member/detail`, `POST vip/member/rights-check`, `GET vip/member/rewards-receive`, `POST profile/consume-judge` (droit de consommation)
- **Activités/récompenses** : `GET activity/task-list|ad-task-list|global-task|welfare-center|entrance|fission/reward-list|lottery/user-info|lottery/user-activity-info`, `POST activity/check-in|lottery/draw|lottery/draw-code-redeem|lottery/prize-claim|lottery/prize-redeem|rewards-receive|promo-code-bind|fission/bind|download-task-receive|ad-dada-set-default`

### Système / config
- `GET tab-operating`, `GET tab/ranking-list`, `GET {dynamicPath}/app/config`, `GET {dynamicPath}/activity/embedded-h5-list/v2`, `GET {appPath}/app/check-update`, `GET appUpgrade/{pkgName}.json` (+ `EE1`, `Ind`), `POST app/upgrade/issued`, `POST infras-mobile-bff/v1/init`
- Messagerie : `GET message/internal/list|has-new|notify-bar/v2|push/local/list`, `POST message/report`
- Stats/logs : `POST statistics/user-operation`, `GET client_logs_retrieve/config`, `POST retrieve_client_logs/report`
- Feedback : `GET feedback/label/list`, `POST feedback/commit|report`
- Divers : `POST search-anaylze/seek` (sic), `GET sniff/config`, `GET share/shorturl|longurl`, `GET upload/sts-token/v2` (STS upload OSS Aliyun), `POST bff/game.moviebox`, `GET app/game/movie-box/detail/game`, `POST cloudBackup/system`, `POST distribute/active/mb|candidate`, `GET playlist/content`, `GET live/match-detail|sub-upcomming-match`, `GET music/like-list`, `POST music/like`, `GET learning/*`, `GET profile/preference-options`, `POST profile/preference-submit`, `POST complete/search`

### Hors BFF (hébergements tiers)
- Sous-titres : `GET vip-api.opensubtitles.com/api/v1/subtitles?query=`, `GET /api/v1/download` (UA `player2024`)
- Paiement : `GET|POST open-api/payment/order/paynicorn`, `GET trade/checkout/txnInfo`, `POST trade/checkout/{cashierPay,loadConfig,cancel}`, `GET trade/extend/transaction/currencyinfo`
- PalmPlay : `feature-api|test-feature-api.palmplaystore.com`, `upgrade-api|test-upgrade-api.palmplaystore.com`
- Mini-apps : `api.byte-app.com`, `app-oss.byte-app.com`, `api-static.byte-app.com`, `api.sunnbird.com` (login), `api-fat1.dlight-app.com` (upload), `api.eagllwin.com`, `100000.miniapp.transsion.com`
- Divers : `app-manage-api.shalltry.com`, `sportsnow.top` (live sport H5), `t.me/moviebox_request` (support), Google Places `maps.googleapis.com` (nearby)

## Lecteur vidéo

HLS (`.m3u8`) et DASH via media3/ExoPlayer + Aliyun (LiveShift) ; DRM PlayReady (manifests Microsoft DRM) ; proxy cache local danikula ; sous-titres TTML. Les URLs de lecture sont **livrées à l'exécution** par `subject-api/play-info`, `ugc/video/play`, `ugc/video/play-multi` (non extractibles statiquement).
