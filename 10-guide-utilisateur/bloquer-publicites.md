# 01 — Bloquer les publicités par le réseau

Principe : les 6 régies pub de MovieBox (Pangle/ByteDance, Hisavana, EagllWin/Sunnbird, Mintegral, Vungle, Facebook AN + PalmPlay) chargent leurs créations depuis ~30 domaines. En bloquant la résolution DNS de ces domaines, les demandes de pub échouent et les emplacements restent vides. Le contenu (films, shorts, listes) passe par d'autres domaines (`aoneroom.com`, `byte-app.com`) — **ne pas les bloquer**.

## Option A — AdGuard Android (recommandé : VPN local, sans root)

1. Installez **AdGuard pour Android** (depuis adguard.com — la version complète n'est pas sur le Play Store ; l'essai gratuit suffit, le filtrage reste actif après).
2. Ouvrez AdGuard → **Protection** → activez.
3. **Filtrage** → **Règles utilisateur** → icône ✏️ → collez tout le contenu de **`../05-publicites/adguard-hosts.txt`** → Enregistrer.
4. (Optionnel) **Filtrage** → Serveurs DNS → choisissez un serveur AdGuard « Sans publicité » pour un filtrage système supplémentaire.
5. Accordez la demande de **VPN local** (c'est ainsi qu'AdGuard filtre sans root ; aucune donnée ne sort).

### Vérification
Lancez MovieBox : les emplacements de bannières/interstitiels restent vides, les pubs récompensées bouclent sur « chargement ». Les films/shorts/listes chargent normalement.

## Option B — NextDNS (filtre au niveau DNS, marche même hors app)

1. Créez un compte sur nextdns.io → **Denylist** → collez les domaines de **`../05-publicites/nextdns-hosts.txt`** (un par ligne).
2. Reliez le téléphone : installez l'app **NextDNS** (Play Store) et activez le profil, **ou** Paramètres Android → Réseau → **DNS privé** → entrez `[votre-id].dns.nextdns.io`.
3. Redémarrez le Wi-Fi/données mobiles pour purger le cache DNS.

### Avantage / limite
- Avantage : filtre aussi les autres apps, pas de VPN actif.
- Limite : ne bloque pas les connexions qui ne passent pas par le DNS système (Mintegral utilise un socket TCP direct sur le port 9377 — non filtrable par DNS).

## Option C — DNS privé simple (sans compte)

Paramètres Android → **DNS privé** → `dns.adguard-dns.com` (AdGuard DNS sans compte). Bloque les grandes régies connues mais **pas** nos domaines spécifiques (Hisavana, EagllWin, PalmPlay…) — moins efficace que A ou B.

## Ce qui reste après blocage (honnêteté)

| Élément | Bloqué par DNS ? | Pourquoi |
|---|---|---|
| Bannières/interstitiels/récompensées AdMob-Pangle-Hisavana-EagllWin-Vungle | ✅ oui | leurs domaines sont dans la liste |
| Pubs Mintegral | ⚠️ partiel | API via DNS, mais reporting sur socket TCP 9377 direct |
| Créatives servies depuis les CDNs de contenu | ⚠️ partiel | un même CDN peut servir l'app |
| Télémétrie native du lecteur Aliyun | ❌ | code natif, hors DNS |
| Récompenses « regarder une pub » | ❌ ne fonctionneront plus | c'est le but — utilisez `welfare-center` hors pub si disponible |

Si une liste bloque trop (une section de l'app ne charge plus), retirez le domaine correspondant dans AdGuard/NextDNS : chaque domaine est documenté par régie dans `moviebox-audit/03-eradication-pub/domaines-publicitaires.md`.
