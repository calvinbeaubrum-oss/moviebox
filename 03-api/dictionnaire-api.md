# 01 — Dictionnaire API : fonctionnalités → requêtes → utilité

Base des appels : `https://api6.aoneroom.com` (release, réécrit dynamiquement par GSLB). Format : réponse `BaseDto<T>` = `{code, message, data}`. Toutes les requêtes portent `X-Client-Info` + `x-tr-signature` (+ `Authorization: Bearer` si connecté, `X-Client-Token` si invité).

---

## A. Démarrage & configuration de l'app

| Fonctionnalité | Requête | Utilité |
|---|---|---|
| Initialisation infra (première chose au lancement) | `POST /infras-mobile-bff/v1/init` | Enregistre l'installation (device_id, gaid, canal, store) et récupère la configuration runtime (flags, URLs de services). Sans lui, l'app tourne en mode dégradé |
| Config dynamique de l'app | `GET /{dynamicPath}/app/config` | Récupère les paramètres distants (features flags, seuils, toggles) — le `dynamicPath` varie par canal/build |
| Liste des H5 embarqués | `GET /{dynamicPath}/activity/embedded-h5-list/v2` | Pages web packagées à télécharger/mettre à jour silencieusement |
| Mise à jour de l'app | `GET appUpgrade/{pkgName}.json` (+ `EE1`, `Ind`), `POST app/upgrade/issued`, `GET {appPath}/app/check-update` | Vérifie les nouvelles versions par store (le pkgName dans l'URL cible le store : Play, PalmPlay EE1, Inde) et remonte que la mise à jour a été proposée/émise |
| Résolution des domaines | `POST gslb.shalltry.com/gslb/domain/convert` | GSLB : mappe les hôtes API vers les meilleurs serveurs de la région (voir `moviebox-preview/02-reseau/`) |
| Onglets de l'app | `GET /wefeed-mobile-bff/tab-operating` (+ `ugc/operating/tab-operating`) | La barre d'onglets et les sous-onglets (Home, Trending, Movie, TV, Fight Zone…) sont **configurés par le serveur** — le `appTab.json` local n'est qu'un fallback |
| Classements par onglet | `GET tab/ranking-list`, `GET ugc/operating/tab-rank-list` | Contenu classé pour les onglets à classement |

## B. Catalogue films / séries / TV (subject-api)

| Fonctionnalité | Requête(s) | Utilité |
|---|---|---|
| Fiche d'un film/série | `GET subject-api/get` | Métadonnées complètes d'un titre (synopsis, casting, épisodes) — point d'entrée de toute page détail |
| Ressources lisibles/téléchargeables | `GET subject-api/resource` | Liste les fichiers vidéo par qualité/résolution pour un titre — c'est ICI que sont livrées les URLs de streaming |
| Position de reprise | `GET subject-api/resource-position` | Reprend la lecture là où l'utilisateur s'est arrêté (sync serveur du marque-page) |
| Lecture | `GET subject-api/play-info` | Session de lecture : URLs HLS/DASH finales, DRM, sous-titres embarqués |
| Saisons/épisodes | `GET subject-api/season-info`, `GET see-list-v2` | Liste des épisodes et de ce qui a été vu |
| Casting | `GET subject-api/staff-info`, `staff-related`, `staff-subject-list` | Fiches acteurs/réalisateurs et leurs autres titres |
| Découverte | `POST subject-api/list`, `GET filter-items`, `POST daily-movie-rec`, `POST detail-rec`, `POST play-related-rec`, `POST trending/v2` | Listes filtrées (genre/pays/année) et recommandations (quotidienne, liée au titre en cours, trending) — alimentent les carrousels |
| Recherche catalogue | `POST subject-api/search(/v2)`, `GET search-rank(/v2)`, `GET search-suggest`, `GET subtitle-search` | Recherche plein texte, tops de recherche (trends), suggestions en frappe, recherche de sous-titres |
| Interactions | `POST want-to-see`, `want-to-see-staff`, `have-seen`, `GET dub-info` | "À voir" / "Déjà vu" (avec possibilité d'attacher lat/lon/POI — avis géolocalisés), doublage |
| Téléchargement offline | `POST subject-api/start-download-resource`, `POST finish-download-resource` | Ouvre une session de téléchargement serveur-side puis la clôture — le serveur sait ce qui est téléchargé |

## C. Shorts / UGC (TikTok-like)

| Fonctionnalité | Requête(s) | Utilité |
|---|---|---|
| Feed shorts | `POST shorts/reel`, `POST shorts/most-trending`, `GET shorts/mini-list`, `GET shorts/get-info` | Le feed vertical immersive et ses vues mini |
| Favoris | `POST shorts/favorite`, `GET shorts/favorite-list` | Bookmarks |
| Sous-titres courts | `GET shorts/get-mini-captions`, `GET wefeed-short-bff/shorts/get-mini-captions` | Légendes des clips |
| Vidéos UGC | `GET ugc/video/get`, `GET ugc/video/play`, `POST ugc/video/play-multi`, `GET ugc/video/first-by-subject` | Lecture UGC (unitaire et enchaînée) |
| Publier / gérer ses vidéos | `GET ugc/video/list/by-my`, `by-user`, `POST ugc/video/start-download`, `GET finish-download (rel.)`, `GET ugc/video/caption|download` | Gestion de son propre contenu et téléchargement |
| Découverte UGC | `POST ugc/trending/home|by-hashtag|channel|subscribe`, `GET ugc/trending/immersive|by-download|filter-edu|by-ugc-video` | Trends par hashtag/chaîne, feed éducation aux filtres |
| Recherche UGC | `GET ugc/search/{result,suggest,everyone,rank}`, `GET ugc/category/lev1-sub-list`, `GET ugc/collection/{play-list,download-list,resolution}` | Recherche créateurs/contenus, collections |
| Médias | `GET playlist/content`, `POST music/like`, `GET music/like-list` | Playlists musique de fond, likes |

## D. Social (posts, groupes, messagerie)

| Fonctionnalité | Requête(s) | Utilité |
|---|---|---|
| Feed communautaire | `GET post/explore`, `post/nearby?lon&lat`, `post/get`, `post/list-by-tab`, `post/list/group`, `post/list-trending/group`, `post/list/likes|subject|user(|my)`, `POST post/list/immersive(/v2)`, `POST post/list/correlation`, `GET post/count/subject` | Les fils "Explore/Immersive/Nearby" — nearby et explore envoient les coordonnées GPS |
| Publier | `POST post/create`, `POST post/delete` | Publication (texte/images/vidéo + géoloc optionnelle) |
| Commentaires | `POST comment`, `GET comment/list`, `POST comment/like`, `POST comment/ugc-video`, `DELETE comment(/ugc-video)`, `POST comment/user/list` | Commentaires sur posts et vidéos UGC |
| Likes | `POST interactive/ugc-video/like`, `POST interactive/post/like`, `GET ugc-video/list/likes`, `GET post/list/likes` | J'aime |
| Groupes | `POST group/create|join|leave|update|visit|list/{class,community-entrance,nearby,subject}`, `GET group/{get,exist,rank,list/my/v2,list/search,list/user}` | Groupes communautaires (cercles), dont nearby (géoloc) |
| Abonnements créateurs | `GET subscription/{subscription,feed,stats,status,v1/followings}`, `POST subscription/subscription` | S'abonner à un créateur et suivre son feed |
| Messagerie interne | `GET message/{internal/list,has-new,notify-bar/v2,push/local/list}`, `POST message/report` | Notifications in-app et remontée d'état push |

## E. Utilisateur & authentification (user-api)

| Fonctionnalité | Requête(s) | Utilité |
|---|---|---|
| Vérifier existence compte | `POST user-api/check-phone-account`, `check-mail-account` | Avant login/register : le numéro/mail existe-t-il déjà ? |
| Code SMS | `POST user-api/get-sms-code`, `POST check-sms-code` | Envoi et validation du code OTP (auth par téléphone, adapté aux marchés sans email) |
| Inscription / connexion | `POST user-api/register`, `POST user-api/login`, `POST user-api/third-login` | Création de compte et connexion (third-login = Google/Facebook) ; renvoient `UserInfo{userId, token, shortId…}` |
| Mot de passe | `POST user-api/reset-password` | Réinitialisation |
| Session | `POST user-api/logout`, `GET user-api/info` | Déconnexion (invalide le token), re-fetch du profil |
| Profil | `GET user-api/profile(/v2,/v3)`, `POST user-api/modify`, `POST user-api/submit-prefer`, `POST user-api/block|unblock` | Lecture/édition du profil, préférences de contenu, blocage d'utilisateurs. La v3 est la plus riche (utilisée par les pages profils) |

## F. Monétisation (arguent, VIP, activités)

| Fonctionnalité | Requête(s) | Utilité |
|---|---|---|
| Catalogue VIP | `GET money/sku-list/get` | SKUs Play Billing + offres serveur (durées/prix) |
| Achat Google | `POST money/gp-trading-order/create`, `POST money/gp-purchase-result/polling` | Créer l'ordre serveur puis confirmer l'achat (polling du reçu) |
| Achat Paynicorn | `GET|POST open-api/payment/order/paynicorn`, `POST money/paynicorn-trading-order/create`, `POST money/paynicorn-purchase-result/polling` | Paiement mobile money (Afrique) — caisse web externe |
| Caisse TranPay | `POST trade/checkout/cashierPay|loadConfig|cancel`, `GET trade/checkout/txnInfo`, `GET trade/extend/transaction/currencyinfo` | Checkout Transsion (devise, txn) |
| État VIP | `GET vip/member/detail`, `POST vip/member/rights-check`, `GET vip/member/rewards-receive`, `POST profile/consume-judge` | Détail de l'abonnement (isActive, expiry…), vérification des droits par scène, réclamer des récompenses, juge de consommation (kids mode) |
| Points & tâches | `GET money/coin-log`, `POST money/exchange/order`, `GET activity/task-list|ad-task-list|global-task|welfare-center|entrance|fission/reward-list|lottery/*`, `POST activity/check-in|lottery/draw|prize-claim|…|rewards-receive|promo-code-bind|fission/bind|download-task-receive` | Économie de points : regarder des pubs / télécharger / s'enregistrer = points ; loterie ; parrainage (fission) |
| A/B config pub VIP | contenu de `vip/member/rights-check` (`vipAdScenes`, `interceptType`) | Décide quelle interception pub appliquer aux non-VIP par scène |

## G. Système & divers

| Fonctionnalité | Requête(s) | Utilité |
|---|---|---|
| Upload (avatars, vidéos UGC, logs) | `GET upload/sts-token/v2` | Jeton temporaire STS Aliyun OSS pour uploader directement au bucket |
| Partage | `POST share/shorturl`, `GET share/longurl` | Liens courts de partage (trackés) |
| Analytics recherche | `POST search-anaylze/seek` | Remonte les mots-clés tapés (analytique comportementale) |
| Feedback | `GET feedback/label/list`, `POST feedback/commit|report` | Support utilisateur |
| Logs client | `GET client_logs_retrieve/config`, `POST retrieve_client_logs/report`, `GET upload/sts-token/v2` | **L'app peut être commandée à distance (push) de zipper et envoyer ses logs** |
| Jeux embarqués | `POST bff/game.moviebox`, `GET app/game/movie-box/detail/game`, `api.ahagamecenter.com` | Mini-jeux H5 |
| Backup | `POST cloudBackup/system` | Sauvegarde cloud des données app |
| Distribution | `POST distribute/active/mb|candidate` | Attribution/distribution de l'app (install referrer) |
| Géo | `GET location/near-address`, `GET post/nearby`, `POST group/list/nearby` | Reverse geocoding et contenus proches |
| TV live | `GET live/match-detail`, `live/sub-upcomming-match` | Matchs sportifs (flux via sportsnow.top/HLS) |
| Éducation | `GET learning/{my-course,prefer-options}`, `POST learning/{add-course,submit-prefer}` | Cours (section éducation) |
| Sous-titres externes | `GET vip-api.opensubtitles.com/api/v1/{subtitles,download}` | Recherche/téléchargement de sous-titres tierce partie (UA `player2024`) |

---

**Total : 233 déclarations (219 paths uniques).** Dump complet par classe : `moviebox-preview/data/endpoints_3.0.15_table.txt`.
