# Supprimer les publicités de MBox TV chez vous — guide

Ce dossier bloque les publicités de l'application MBox (`com.community.mbox.tv`)
**sans la modifier** : on coupe, au niveau du réseau, les domaines de régies et de
mesure qu'elle contacte. C'est la même technique qu'un bloqueur de pubs classique,
appliquée à un appareil ou à toute la maison.

## Que bloque-t-on ?

| Domaine | Rôle |
|---|---|
| `hisavana.com` | SDK publicitaire Hisavana (régie Transsion) |
| `eagllwin.com` | Matériaux publicitaires (images, vidéos des pubs) |
| `shalltry.com` | Gestion des campagnes publicitaires |
| `sunnbird.com` | Mini-apps / recommandations sponsorisées |
| `image.cnamedomain.com` | CDN d'images publicitaires |
| `googlesyndication.com`, `googleadservices.com` | Google Ads |
| `app-measurement.com` | Mesure / traçage Firebase |
| `graph.facebook.com` | SDK Facebook (traçage) |

## Ce qu'on ne bloque PAS (volontairement)

- `vip-api.opensubtitles.com` : sous-titres (fonctionnalité).
- `cdn2.palmplaystore.com`, `feature-api.palmplaystore.com` : visuels et contenu de
  l'app — les bloquer casserait l'interface.
- `upgrade-api.palmplaystore.com` : mises à jour de l'app (sécurité).
- `sportslive.wine` : source des flux sportifs.

## Option A — directement sur la box / TV Android (5 minutes, gratuit)

1. Installer **personalDNSfilter** ou **DNS66** (gratuits, open source, disponibles
   sur F-Droid) sur l'appareil Android TV.
2. Importer `hosts.txt` de ce dossier comme filtre local.
3. Activer le filtre : il crée un mini-VPN local qui filtre le DNS de l'appareil.
   Aucune donnée ne quitte l'appareil.

## Option B — sur le routeur (toute la maison)

Installer **Pi-hole** ou **AdGuard Home** sur le routeur (ou un Raspberry Pi) et
importer `adguard.txt` (règles génériques, jokers de sous-domaines inclus).

## Option C — DNS privé Android (sans rien installer)

1. Créer un compte gratuit sur **nextdns.io**.
2. Dans le tableau de bord, onglet Denylist, ajouter les domaines du tableau
   ci-dessus (sur NextDNS, bloquer `hisavana.com` couvre tous ses sous-domaines).
3. Sur l'appareil : Paramètres → Réseau et Internet → DNS privé → saisir l'adresse
   fournie (ex. `xxxxxx.dns.nextdns.io`).

## Si quelque chose casse

Il suffit de retirer le domaine fautif de la liste et de retester. La liste ne
contient que des domaines pub/traçage, mais les règles à jokers (option B/C) peuvent
avoir des effets de bord : en cas de visuels manquants dans l'app, retirez la ligne
correspondante.
