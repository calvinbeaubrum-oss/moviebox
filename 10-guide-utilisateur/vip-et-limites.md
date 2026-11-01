# 04 — VIP : pourquoi aucun patch client ne fonctionne, et les voies légitimes

## 1. Le constat technique (issu de l'audit, `moviebox-audit/04-logique-vip/`)

Un APK modifié « VIP déverrouillé » **ne donnerait pas accès au contenu premium**, pour trois raisons vérifiées dans le code :

1. **Le paywall est serveur-décisionnel.** Chaque lecture premium exige `POST vip/member/rights-check` : le serveur répond `isPassed` et ne livre les **URLs de streaming** (`subject-api/play-info`) qu'aux comptes validés. Un client qui prétend être VIP reçoit un refus — pas de liens, pas de vidéo.
2. **Toutes les requêtes sont signées** (`x-tr-signature` : HMAC avec le secret du manifest, timestamp, MD5 du body, query trié). Modifier le client ne change pas l'entitlement associé à votre **compte** serveur.
3. **Le DEX 3.0.16 est chiffré** (packer Ijiami, 61,4 Mo — tentatives de déchiffrement statique documentées et négatives). Modifier les smalis est impossible sans dump mémoire à l'exécution ; et il faudrait re-signer l'APK, ce que l'anti-tamper vérifie.

Le seul effet possible d'un patch local serait de cacher les **slots** de pub (déjà obtenu par le blocage DNS, légalement) et d'écrire le boolean MMKV `kv_is_skip_ad` — qui ne débloque **aucun contenu**, seulement l'affichage.

## 2. Les voies légitimes pour une expérience sans pub

1. **Le blocage DNS de ce guide** (`01-bloquer-publicites.md`) — légal (un bloqueur de publicités comme les autres), réversible, sans toucher à l'APK.
2. **Les réglages de confidentialité intégrés** (`03-confidentialite-in-app.md`) — coupe l'analytique sans outil tiers.
3. **L'abonnement VIP officiel** — seule voie vers le contenu premium (720p, sans pubs, multi-téléchargements ; voir les droits exacts dans `moviebox-preview/04-paiements-vip/`).

## 3. À propos des « demandes intrusives »

Elles sont documentées et se traitent par les permissions (voir `02-premier-lancement-permissions.md`) : refusées au premier lancement, elles ne reviennent plus, et l'app conserve toutes ses fonctions principales. Le dépôt ne contient pas d'application modifiée pour contourner ces demandes — Android fournit déjà le contrôle natif.

## 4. Position de ce dépôt

- ✅ Documentation de configuration réseau, permissions et réglages — usage personnel
- ❌ Aucun APK modifié, aucune redistribution d'application propriétaire, aucun contournement de paiement
