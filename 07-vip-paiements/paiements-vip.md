# 04 — Paiements, VIP et points

## 1. Trois canaux de paiement

| Canal | SDK / routes | Détail |
|---|---|---|
| **Google Play Billing** | Billing 6.1.0 (`com.android.billingclient`), phenotype `com.android.billingclient` | Commande : `POST /wefeed-mobile-bff/money/gp-trading-order/create` → polling : `POST /wefeed-money/gp-purchase-result/polling` (nom réel : `POST /wefeed-mobile-bff/money/gp-purchase-result/polling`) ; SKU : `GET /wefeed-mobile-bff/money/sku-list/get` (fallback local `assets/skulist.json` avec `skuList: null` — la vraie liste vient du serveur) |
| **Paynicorn** | `GET|POST /open-api/payment/order/paynicorn`, `POST /wefeed-mobile-bff/money/paynicorn-trading-order/create` + `…/paynicorn-purchase-result/polling` | Hôtes : `api.paynicorn.com`, caisse web `cashier-serverweb.paynicorn.com/api/cancelPay` ; UI `PayWebActivity`, `TranPayWebActivity` |
| **TranPay (Transsion)** | `trade/checkout/{cashierPay, loadConfig, txnInfo, cancel}`, `GET trade/extend/transaction/currencyinfo`, `GET trade/checkout/txnInfo` | UI `com.tn.tranpay.*` (PayActivity, TranPayWebActivity) |

Secrets de passerelle (extraits du manifest — authentifient le client) :
- `gateway_secret_online = **RÉDACTÉ**`
- `gateway_secret_test   = **RÉDACTÉ**`
(→ aussi utilisés comme clé HMAC de `x-tr-signature`, voir `02-reseau/`)

## 2. Le VIP — ce qu'il débloque

### Droits listés (`assets/skulist.json` — memberRights)
1. **« No disturbing ads »** — plus de pubs perturbatrices
2. **« Enjoy 720P quality videos »** — déverrouillage de la qualité 720p (sinon plafonnée)
3. **« Multi downloads at once »** — téléchargements parallèles

Bannière in-app : « **Unlock Premium Benefits** — No ads · HD · Premium Contents » ; rappels d'expiration (`member_banner_remind_day/hour/month`), bouton Renew.

### Gating (contrôle d'accès) côté app
- `ResolutionUnlockActivity` (thème transparent) : déverrouillage de la résolution pendant la lecture (pub ou VIP)
- `profile/consume-judge` : le serveur juge si la consommation (lecture/dl) est autorisée
- `POST /wefeed-mobile-bff/vip/member/rights-check` : vérification des droits avant contenu premium
- Souscription : `SubscriptionActivity`, `GET/POST subscription/subscription`, `GET subscription/status`
- Monnaie : `GET money/coin-log`, `POST money/exchange/order` — points gagnés par tâches pub convertis en achats

### Centre de récompenses (boucle pub → points → VIP)
`RewardsCenterActivity` (deep link `oneroom://member/adtask`), routes `activity/{task-list, ad-task-list, global-task, welfare-center, check-in, lottery/draw|prize-claim|prize-redeem|draw-code-redeem, fission/bind, promo-code-bind, download-task-receive, rewards-receive}` + `PointsHistoryActivity`, `MemberActivity`.

## 3. Flux de commande typique
1. App liste les offres : `money/sku-list/get` (SKU Play + offres serveur)
2. Création d'ordre : `money/gp-trading-order/create` (ou paynicorn)
3. Achat côté Google/Paynicorn
4. Polling de confirmation : `money/*-purchase-result/polling`
5. Droits actifs : `vip/member/rights-check` + `profile/consume-judge` à chaque lecture
6. Renouvellement : bannières de rappel (`member_banner_*`), `vip/member/rewards-receive`
