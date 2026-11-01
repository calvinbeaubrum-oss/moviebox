# Refs — Méthodologie, sources et limites

## Méthode
1. **Corpus** : code décompilé 3.0.15 (jadx, 31 903 fichiers `mb15/sources/`) + ressources 3.0.16 (manifest 2 168 lignes, assets).
2. **Sweeps** : greps ciblés (annotations Retrofit, interceptors OkHttp, WebView JS bridges, `/proc`, `getImei/getSubscriberId`, `logEvent`, domaines des packages pub) + lecture des classes métier (member/, gslb/, http/, crypto/).
3. **Agents parallèles** : deux balayages indépendants (télémétrie ; domaines pub) avec obligation de citer classe:ligne, classification fournie puis revue.
4. **Croisement 3.0.15 ↔ 3.0.16** : manifest 3.0.16 (mêmes composants + 13 permissions de plus), dialogue debug des hôtes identique (`dialog_lab_http_host.xml`).

## Fiabilité par section
| Section | Fiabilité | Note |
|---|---|---|
| Dictionnaire API (233 routes) | Haute (chaînes littérales compilées) | Corps JSON exacts : déductibles des beans mais à confirmer au MITM |
| Télémétrie (destinations, champs) | Haute pour ce qui est cité classe:ligne | Payload `message/report`, télémétrie native Aliyun, URL APM Pangle : **non déterminables statiquement** (signalé) |
| Domaines pub | Haute pour les « vus dans le code » ; « probables » séparés explicitement (Mintegral = 0 domaine en dur) | Socket TCP Mintegral 9377 non filtrable DNS |
| Logique VIP | Haute (flux complet classe:ligne) | Comportement serveur réel (algorithme isPassed) non observable |

## Limites générales
- Analyse **statique** : aucun payload réseau capturé en direct (l'émulateur Google crash sur le packer Ijiami 3.0.16 — voir `moviebox-preview/06-securite/`) ; la 3.0.15 non packée reste le support de vérité.
- Obfuscation R8 : les noms `a.java`/`b.java` font référence aux fichiers réels décompilés ; les chaînes (routes, clés MMKV, headers) ne sont pas obfusquées.
- Le module Ijiami ajouté en 3.0.16 pourrait embarquer sa propre télémétrie (non auditable sans dump DEX).
