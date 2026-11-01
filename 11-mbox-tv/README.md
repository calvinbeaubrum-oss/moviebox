# MBox TV — audit sécurité & blocage publicitaire (studio NOx)

Analyse de l'application Android TV « MBox »
(`com.community.mbox.tv`, v1.2.1.1020.03, écosystème Transsion).

But : supprimer les publicités de l'application **sans la modifier** (blocage réseau
chez vous) et documenter les failles et bugs de sécurité identifiés dans son code.

## Contenu

| Fichier | Rôle |
|---|---|
| `RAPPORT-SECURITE.md` | Audit statique : 6 constats, dont 2 vraies failles |
| `blocage-pubs/hosts.txt` | Liste de blocage au format hosts (personalDNSfilter, DNS66, Pi-hole) |
| `blocage-pubs/adguard.txt` | Les mêmes règles au format AdGuard (jokers domaine) |
| `blocage-pubs/GUIDE-BLOCAGE.md` | Guide d'application en 5 min (TV, routeur ou DNS privé) |

## Pourquoi ce dépôt (et pas une application modifiée)

- Le code analysé provient de la **décompilation d'un binaire commercial tiers**
  (JADX). Cette sortie ne peut pas être recompilée en APK, et modifier puis
  redistribuer l'application (retrait des pubs, déblocage du premium, re-branding)
  serait une contrefaçon au détriment de son éditeur — même dans un dépôt privé.
- Le statut « premium » est de toute façon **validé côté serveur** (BFF Transsion +
  API VIP OpenSubtitles) : aucun client modifié ne peut le rendre gratuit.
- Le blocage réseau des régies publicitaires est, lui, parfaitement légal pour un
  usage personnel et efficace : c'est la solution retenue ici.

## Limites

Analyse **statique** uniquement (aucune exécution, aucun trafic observé).
Base : dépôt privé `mbox-tv-decompiled-source` (REA + JADX 1.5.6).

---
Généré le 2026-10-24 pour le **studio NOx**.
