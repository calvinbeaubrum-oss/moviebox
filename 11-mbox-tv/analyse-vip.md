# Analyse de la porte VIP — MBox TV (com.community.mbox.tv)

Réponse à la question : **« que demande la porte VIP, à partir du code source ? »**
Analyse statique (JADX), fichiers cités depuis `mbox-tv-decompiled-source`.

## En une phrase

La porte VIP ne demande **rien au client** : elle **demande au serveur**.
Le statut (`isVip`, `vipLevel`, expiration) est attribué par la plateforme
Transsion, après un paiement réel sur **leur page web de paiement**, et le
client ne fait que **relayer et afficher** la réponse du serveur.

## Le circuit complet, preuves en main

### 1. Les cinq appels du service VIP (`tvVipApiService` / `tvVipRepository`)

Fichier : `sources/com/transsion/tvdata/repository/c0.java`
(les noms réels sont dans les métadonnées Kotlin : `getVipSkuList`,
`createVipOrder`, `getVipUserInfo`, `migrateVipAssets`, `pollingOrderStatus`).

| Fonction | Ce que fait le serveur | Bean de réponse |
|---|---|---|
| Liste des offres | renvoie les abonnements vendus | `BffGetVipSkuListData` |
| **Création de commande** | renvoie `tradingOrderId`, `txnId` et une **`webUrl` de paiement** (expire après `webUrlExpireSeconds`) | `BffCreateVipOrderData` |
| **Suivi de commande** | l'app interroge en boucle le serveur jusqu'à confirmation du paiement | `BffPollingOrderStatusData` |
| **État du compte** | renvoie `isVip`, `vipLevel`, `vipExpireAt`, `vipRemainingSeconds` | `BffGetVipUserInfoData` |
| Transfert visiteur→compte | migère un VIP « visiteur » vers un compte | `BffMigrateVipAssetsData` |

→ **Le paiement n'existe pas dans l'app** : la commande est créée côté serveur
et réglée sur une page web de Transsion (`BffCreateVipOrderData.webUrl`).
L'app se contente d'attendre la confirmation (`VipPayViewModel` — méthode
littéralement nommée `requestVipStatusFromServer`).

### 2. Ce que le serveur renvoie (`sources/com/transsion/tvdata/bean/BffGetVipUserInfoData.java`)

Champs Gson : `uid`, `userType`, `username`, `nickname`, `avatar`,
**`isVip`** (booléen), **`vipRemainingSeconds`**, **`vipExpireAt`**, **`vipLevel`**.
C'est **la valeur de `isVip` serveur** qui alimente l'écran d'adhésion
(`SettingsMembershipViewModel` → `MembershipCardUiState.isVip`) — le client
n'a aucun « interrupteur » local : il reçoit et affiche.

### 3. Comment le statut circule ensuite (`sources/com/transsion/tvdata/TvServiceLocator.java`, ligne 444)

```java
public final void S0(Boolean isVip, String vipLevel) {
    ...
    companion.b("x-vip", isVip.booleanValue() ? "1" : "0");
    companion.b("x-vip-level", vipLevel);
}
```

Le statut reçu du serveur est **retransmis dans les en-têtes `x-vip` et
`x-vip-level` de chaque requête API** vers la plateforme de contenu. C'est
donc le serveur de contenu qui, là aussi, décide de ce qu'il sert en fonction
du compte — le client relaie une valeur qu'il ne choisit pas.

### 4. Le lien VIP ↔ publicité (`sources/com/transsion/ad/scene/a.java:291` et `b.java:267`)

```java
jsonObjectB.get("isVipSkipAd")
```

La suppression des publicités pour les abonnés est **un paramètre de
configuration livré par le serveur** (`isVipSkipAd`, par défaut vrai). L'app
demande sa configuration pub au serveur ; le serveur adapte selon le statut
du compte. Même la « version sans pub » est une décision serveur.

### 5. Le cas « visiteur premium » (`SettingsMembershipViewModel`)

Champs `visitorPremiumActive`, `cachedVisitorUid`, résultat `RestoreMembershipResult`
(RESTORED / NO_MEMBERSHIP / FAILED) : un appareil non connecté peut recevoir
un premium d'essai **attribué serveur** (identifié par `visitorUid`), puis le
migrer vers un compte via l'appel de migration. Toujours la même règle :
l'attribution vient du serveur.

## Conclusion — ce que cette analyse démontre

1. **Il n'y a rien à « déverrouiller » dans l'application.** Les fonctions VIP
   et l'absence de pubs sont des **droits attachés au compte côté serveur**,
   acquis par un paiement sur la plateforme web de Transsion. Un client
   modifié peut au plus maquiller l'affichage local ; les serveurs continueraient
   de répondre « non-VIP » (contenu normal + configuration pub avec annonces).
2. **L'« option payante transformée en don de soutien »** signifierait
   redistribuer l'application d'autrui avec votre propre bouton de paiement :
   ce serait de la contrefaçon doublée d'une monétisation du travail d'un tiers.
3. Pour **supprimer réellement les publicités sur vos appareils**, le levier
   qui fonctionne sans modifier l'app reste le blocage réseau
   (`blocage-pubs/` de ce dépôt).

## Note

Analyse réalisée sur artefact possédé, à des fins d'étude personnelle. Aucune
instruction de falsification (en-têtes, comptes, paiement) n'est fournie ni ne
le sera.

---
Généré pour le **studio NOx** le 2026-10-24 — dépôt `mbox-tv-nox-audit`.
