# 04 — Analyse de la logique des droits VIP (le paywall)

Sources : `mb15/sources/com/transsion/member/**`, `memberapi/**`, `baselib/kids/**`, `commercialization/task/DownloadInterceptAdHelper.java`. Tout est lecture directe du code décompilé.

## 1. Verdict central : le paywall est SERVEUR-DÉCISIONNEL, cache local

**L'application ne décide JAMAIS seule si vous êtes VIP.** Le modèle est :

```
[App]  POST /wefeed-mobile-bff/vip/member/rights-check  ──►  [Serveur]
        (scène demandée : SCENE_AD, SCENE_HDDL, SCENE_MULTIDL…)      │
[App]  ◄── MemberCheckResult {                                       │
          isPassed : Boolean          ← LA décision (true = droit accordé)
          vipEnable, vipPayEnable,    ← le VIP existe-t-il / est-il achetable
          interceptType : "OP_AD"|"OP_INSTALL"|…  ← quelle interception si refusé
          memberPrice, currency,      ← offre d'upsell
          memberRights[],             ← liste des droits
          multiDownloadLimit : Int    ← limite de téléchargements parallèles
          vipAdScenes[], pointUrl, inviteH5Url, inviteRewardDays, threeInOnePopup
       }                                                              │
[Cache MMKV]  kv_is_skip_ad, kv_is_enable_member, kv_is_pay_enable_member,
              kv_parallel_download_task_num, kv_invite_*, kv_point_url
[Exécution]  les modules (ads, downloader, player) lisent le CACHE, pas le serveur
```

Il n'existe **aucun jeton VIP signé** ni validation cryptographique locale : l'état VIP est un simple **boolean en cache** (`kv_is_skip_ad`) alimenté par la réponse serveur et invalidé à la déconnexion. C'est un point de conception faible (voir §6).

## 2. Les deux canaux de vérification

### Canal A — cache éphémère au démarrage : `checkShowAdState`
`MemberProvider.checkShowAdState()` (`MemberProvider$checkShowAdState$1.java`) appelle `rights-check` **sans scène** puis écrit dans MMKV (`w.f45126a.b()`) :
| Clé MMKV | Source | Lecture | Défaut |
|---|---|---|---|
| `kv_is_skip_ad` | `MemberCheckResult.isPassed` | `MemberProvider.e()` (interface `im.b`) : « sauter les pubs » | **false** |
| `kv_is_enable_member` | `getVipEnable` | `MemberProvider:676` (la boutique VIP est-elle offerte dans ce build/pays) | **true** |
| `kv_is_pay_enable_member` | `getVipPayEnable` | `MemberProvider.c()` (paiement activé) | false |
| `kv_parallel_download_task_num` | `getMultiDownloadLimit` | `MemberProvider.B()` : nb de téléchargements simultanés | **1** |
| `kv_invite_Reward_Days`, `kv_invite_H5_Url`, `kv_point_url` | champs équivalents | programme de parrainage/points | "" |

À la **déconnexion**, `ObserveLoginAction.java:129` remet `kv_is_skip_ad` à **false** (le VIP est donc lié au compte, pas à l'appareil).

### Canal B — vérification à la volée par scène : `checkMemberRights(sceneType)`
Interface `im.b` exposée à tous les modules (`d0.java` = factory). Six scènes déclarées (`MemberSceneType`) :
| Scène | Quand | Effet si non-VIP |
|---|---|---|
| `SCENE_AD` | affichage d'une pub récompensée | interception |
| `SCENE_START_RESOLUTION` | démarrage d'une lecture haute qualité | upsell 720p |
| `SCENE_HDDL` | téléchargement HD | interception |
| `SCENE_MULTIDL` | téléchargement parallèle au-delà de la limite | interception |
| `SCENE_PREDL` | pré-téléchargement | interception |
| `SCENE_STREAM_ACTIVATE` | activation du streaming | interception |

Le flux affiche `CheckMemberRightsLoadingDialog` (spinner) pendant l'appel réseau, puis branche sur `it.isPassed()` :
- **TRUE** → callback succès (`aVar.e()`) — le contenu s'ouvre
- **FALSE** → lecture de **`interceptType`** (le serveur choisit l'arme commerciale) :
  - `"OP_AD"` → montrer une **pub** (souvent récompensée) pour débloquer
  - `"OP_INSTALL"` → demander d'**installer une application** (palmplaystore — `DownloadInterceptAdHelper.java:126-130` : `interceptType` comparé à `OpType.OP_INSTALL.getValue()`/`OP_AD`)
  - sinon → dialog d'upsell (`MemberMiddleStateDialog`, prix `memberPrice`/`currency`)

## 3. L'état d'abonnement lui-même : `vip/member/detail`
Bean `MemberInfo` : `isActive (boolean)`, `memberType (int)`, `durationType (int)`, `isAutoRenew (boolean)`, `expiryDate`, `nextRenewDate`, `daysLeft (Integer)`, `point (int)`. Version courte enParcelable : `MemberBriefInfo {isActive, memberType, expiryDate}`. Les bannières d'expiration (`member_banner_remind_*`) consomment `daysLeft`. `userType` du profil (`BffUserInfo`, `UserInfo`) complète : `userType == 0` = utilisateur standard, valeurs ≠ 0 = comptes spéciaux (tests/admins vus dans les conditions de `UserProfileFragment:726-745`).

## 4. Les scènes concrètes où le paywall mord
1. **Publicités** : chaque affichage pub vérifie `im.b.e()` (`kv_is_skip_ad`) — VIP ⇒ les loaders de pub sont court-circuités.
2. **Résolution 720p** : `ResolutionUnlockActivity` + `SCENE_START_RESOLUTION` — l'upsell est infléchi par `memberPrice/currency` du rights-check.
3. **Téléchargements** : limite parallèle = `kv_parallel_download_task_num` (défaut **1**) ; HD = `SCENE_HDDL` ; interception pub/install par `interceptType` (`DownloadInterceptAdHelper`).
4. **Streaming** : `SCENE_STREAM_ACTIVATE` (activation d'un flux).
5. **Mode enfants** : `profile/consume-judge` + `baselib/kids/ConsumeJudge*` — le serveur valide chaque achat/consommation depuis un profil enfant.

## 5. Après achat
`money/gp-trading-order/create` → Play Billing → `money/gp-purchase-result/polling` (reçu validé serveur) → `MemberFragment$handlePurchaseSucceed` → re-fetch `vip/member/detail` + re-run `checkShowAdState` → MMKV mis à jour → les gates s'ouvrent. `MemberViewModel.redeem/redeemProduct` : échange de points contre VIP (`money/exchange/order`).

## 6. Lecture sécurité (théorique)
- **Point de confiance unique** : les booleans MMKV (`kv_is_skip_ad`, `kv_parallel_download_task_num`) sont lus **sans vérification d'intégrité**. Sur un appareil rooté, écrire `kv_is_skip_ad=true` (MMKV est un fichier dans `/data/data/.../mmkv/`) ouvre la désactivation des pubs **côté client uniquement** — mais les contenus premium restent protégés car leurs URLs sont livrées par le serveur (play-info) **après** `rights-check` côté serveur. Le paywall contenu est serveur ; le paywall « confort » (pubs, limite de téléchargements parallèles) est client.
- **Aucune signature** du `MemberCheckResult` : la validité repose sur la communication HTTPS (elle-même à TrustManager permissif — cf. `06-securite`).
- Le serveur garde le contrôle réel via `rights-check` appelé à chaque scène : la fraude locale ne donne accès ni au HD (URLs non livrées) ni aux contenus premium.

## 7. Schéma récapitulatif
```
Lecture 720p            Téléchargement HD         Téléchargement //         Pub
      │                        │                        │                    │
      ▼                        ▼                        ▼                    ▼
SCENE_START_RESOLUTION   SCENE_HDDL              SCENE_MULTIDL           SCENE_AD
      └───────────────────────┬───────────────────────────┬───────────────────┘
                              ▼                            ▼
              CheckMemberRightsLoadingDialog      (cache direct im.b.e()/B())
                              ▼
        POST vip/member/rights-check {sceneType}
                              ▼
        isPassed=false ? → interceptType OP_AD/OP_INSTALL/upsell(memberPrice)
        isPassed=true ?  → contenu déverrouillé (URLs livrées par play-info)
                              ▼
        Cache MMKV mis à jour (kv_is_skip_ad, kv_parallel_download_task_num…)
                              ▼
        Déconnexion → kv_is_skip_ad=false (ObserveLoginAction)
```
