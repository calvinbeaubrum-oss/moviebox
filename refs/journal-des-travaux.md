# Journal des travaux — audit MovieBox & MBox TV

Ce journal documente **ce qui a réellement été exécuté**, session par session, avec l'état de chaque chantier (terminé / ouvert).

## 1. MovieBox 3.0.15 (non packée) — audit complet — TERMINÉ

- Décompilation intégrale avec jadx : **42 206 fichiers Java** obtenus (copie locale uniquement — code décompilé d'un tiers, non publié).
- Extraction des endpoints → [`data/endpoints_3.0.15_brut.txt`](../data/endpoints_3.0.15_brut.txt) et table.
- Dictionnaire API : **233 routes** cataloguées → [`03-api/dictionnaire-api.md`](../03-api/dictionnaire-api.md).
- Audit de télémétrie (flux légitimes vs pistage) → [`06-telemetrie/audit-telemetrie.md`](../06-telemetrie/audit-telemetrie.md).
- Cartographie des régies publicitaires + listes de blocage AdGuard / NextDNS → [`05-publicites/`](../05-publicites/reseaux-publicitaires.md).
- Logique VIP (paywall) → [`07-vip-paiements/logique-vip.md`](../07-vip-paiements/logique-vip.md).
- Guide de configuration légitime → [`10-guide-utilisateur/`](../10-guide-utilisateur/bloquer-publicites.md).
- Documents d'origine → [`doc-source/`](../doc-source/analyse-statique-endpoints-moviebox-3.0.15-16.md).
- Livrés d'abord dans 3 dépôts privés (`moviebox-preview`, `moviebox-audit`, `moviebox-config-guide`), puis consolidés ici.

## 2. MovieBox 3.0.16 (packée Ijiami) — TERMINÉ dans la limite du statique

- Inventaire certifié REA : **5 831 fichiers, 0 contradiction d'intégrité** (Evidence `ev_d3222dae…1854b`, graphe applicatif `agm_2f89a4f1…16133ad3`).
- Découverte du packer : `classes.dex` = **stub de 26 Ko (4 classes `gj.hfr.xal.*`)** + **payload chiffré `ijiami.dat` de 61,4 Mo** ; vraie classe `Application` : `com.transsion.subroom.app.SubRoomApp`.
- Extraction des 3 libs natives du packer (`assets/MSDvUDPFc/<abi>/`) : `libxybzvgn.so` (748 Ko, moteur), `libukdb5pgj.so` (215 Ko, `getOpCode`), `librpgi1i.so` (6 Ko, blob) — UPX à en-têtes falsifiés.
- **Dépackaging statique réussi** des deux libs principales : réimplémentation du décompresseur NRV2E_LE32 (UCL 1.03) + unfiltre UPX `ct26arm` (0x52) → ELF valides (1 093 840 / 986 896 octets) révélant un **interpréteur VMP** (piles thread-local 2 Mo, tables de handlers).
- Outils écrits pendant l'audit → [`outils/`](../outils/README.md) : déchiffreur de chaînes (**validé**), scan DEX, deux attaques sur le payload (**négatives, documentées**).
- Tentatives dynamiques : émulateur Google (Berberis/ndk_translation) → **SIGSEGV** dans le VMP (`berberis_HandleNoExec`) avant tout déchiffrement du DEX — 3 reproductions, tombstones archivées localement ; BlissOS/VirtualBox : écosystème incompatible (EGL cassé).
- Analyse complète → [`04-securite/packer-ijiami.md`](../04-securite/packer-ijiami.md) et [`04-securite/securite-et-secrets.md`](../04-securite/securite-et-secrets.md).

## 3. MBox TV (`com.community.mbox.tv`) v1.2.1.1020.03 — app sœur — TERMINÉ (statique)

- REA : inventaire **2 345 entrées, 0 contradiction d'intégrité** (Evidence `ev_9c005f77…` / `ev_faff7e83…`) ; test Flutter → **négatif** (pas de payload AOT Dart).
- JADX 1.5.6 (JDK 21) : **15 051 fichiers `.java`** (Kotlin/Jetpack Compose, obfuscation R8, lancement `com.transsion.subroom.activity.SplashActivity` → écosystème Transsion).
- Rapport sécurité : **6 constats**, dont TLS permissif (CRITIQUE) et WebViews publicitaires dangereuses (ÉLEVÉ) → [`11-mbox-tv/rapport-securite.md`](../11-mbox-tv/rapport-securite.md).
- Analyse de la porte VIP : le statut est **validé côté serveur uniquement** (commande créée serveur, paiement sur page web Transsion, polling) → [`11-mbox-tv/analyse-vip.md`](../11-mbox-tv/analyse-vip.md).
- Listes de blocage TV (différentes de la version mobile) → [`11-mbox-tv/blocage-pubs/`](../11-mbox-tv/blocage-pubs/GUIDE-BLOCAGE.md).

## 4. Consolidation publique — 2026-10-31 — TERMINÉ

- Un dépôt unique public : restructuration thématique, rédaction des secrets opérationnels, ajout des outils, du journal et de la section MBox TV.

## Chantiers ouverts (non terminés)

1. **Dévirtualisation de l'interpréteur VMP Ijiami** (analyse statique des tables de handlers des libs dépackées).
2. **Dump mémoire à l'exécution** sur appareil physique (frida/gdb) pour récupérer le DEX déchiffré en mémoire.
3. **Fiche d'identité détaillée de la 3.0.15** (seuls endpoints/API sont couverts pour cette version).
4. **Disponibilité des serveurs en temps réel** — hors périmètre d'un audit statique ; nécessiterait un monitoring séparé.
