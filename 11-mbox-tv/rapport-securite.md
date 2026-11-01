# Rapport d'audit sécurité — MBox TV (com.community.mbox.tv) v1.2.1.1020.03

Audit **statique** du code décompilé (JADX). Aucune exécution, aucun trafic observé :
les constats sont des faits de code ; les impacts restent à confirmer dynamiquement.

## F1 — Configuration réseau permissive — CRITIQUE

`resources/res/xml/network_security_config.xml` :

- `cleartextTrafficPermitted="true"` en `base-config` : HTTP en clair autorisé pour
  **toute** l'application.
- `overridePins="true"` : le **certificate pinning est désactivé**, même là où le
  code l'établit.
- Un `<domain>aoneroom.com</domain>` orphelin (structure XML non standard).

**Impact** : sur un réseau hostile (Wi-Fi public, routeur compromis), un attaquant
positionné peut intercepter ou altérer le trafic de l'application (attaque MITM).

**Correctif (pour l'éditeur)** : `cleartextTrafficPermitted="false"` par défaut,
ré-autorisation domaine par domaine si nécessaire, suppression de `overridePins`.

## F2 — WebViews publicitaires à surface dangereuse — ÉLEVÉ

SDK publicitaire Hisavana (`com.cloud.hisavana.sdk`) :

- `addJavascriptInterface(...)` dans `TAdWebFormsActivity`, `AgentPageLandingActivity`,
  `PersonalCloseAdActivity` et classes utilitaires (`sdk/o.java`, `sdk/r.java`) : un
  pont Java↔JS est exposé aux pages publicitaires — du contenu distant **non fiable**.
- `InteractiveWebView` / `ActionWebView` : `setAllowFileAccess(true)` et/ou
  `setAllowUniversalAccessFromFileURLs(true)` : le JS distant peut lire des fichiers
  locaux.
- `onReceivedSslError` surchargé dans 5 classes du SDK (activités de pub) : à vérifier
  si `handler.proceed()` est appelé sur erreur de certificat (bypass SSL classique).

**Impact** : une régie compromise (ou un MITM couplé à F1) peut exfiltrer des données
locales ou piloter le pont JS.

**Correctif** : pont JS minimal annoté `@JavascriptInterface` et restreint, accès
fichiers désactivé dans les WebViews, refus des certificats invalides.

## F3 — Mise à jour automatique hors store — MOYEN

Permission `REQUEST_INSTALL_PACKAGES` + endpoints d'upgrade
(`upgrade-api.palmplaystore.com`, `test-upgrade-api.palmplaystore.com`) : l'app
télécharge et installe elle-même ses APK. Le canal observé est en HTTPS, mais combiné
à F1 (pinning désactivé, clairtext permis) la chaîne de confiance de la mise à jour
est affaiblie. Un canal de MAJ compromis = prise de contrôle totale de l'application
par un attaquant réseau.

## F4 — Clé API Google en dur — FAIBLE

`AIzaSyDoUlg4QWx_EYkLV9IoIzaRvysnE_7G_EQ` (`resources/res/values/strings.xml`).
Usage classique Firebase ; le risque réel dépend des restrictions appliquées côté
console Google (bundle, APIs autorisées, quotas). Correctif : restreindre la clé.

## F5 — Surface d'attaque exportée — FAIBLE À MOYEN

Composants exportés : `MainActivity`, `SplashActivity`, `DeepLinkHandler`,
`MusicIntentReceiver`, `MediaService` (+ composants de bibliothèques).
`DeepLinkHandler` mérite un audit des intents profonds entrants (validation des URI).

## F6 — Divers et confidentialité

- Permission fantôme `android.permission.FPOST_NOTIFICATIONS` (typo, ignorée par le
  système) en plus de la bonne `POST_NOTIFICATIONS`.
- `USE_FULL_SCREEN_INTENT` : notifications plein écran — vecteur d'intrusion
  marketing.
- Traçage croisé : Firebase (`app-measurement.com`), SDK Facebook
  (`graph.facebook.com`), identifiant publicitaire (`AD_ID`, `ACCESS_ADSERVICES_*`).
- Mécanisme VIP : statut obtenu auprès du serveur Transsion
  (`SettingsMembershipViewModel`, `BffGetVipUserInfoData`) et sous-titres via l'API
  VIP d'OpenSubtitles (`nk/b.java` → `vip-api.opensubtitles.com/api/v1/...`).
  Le premium est **verrouillé côté serveur** ; il n'est pas débrayable côté client.

## Méthodologie

Inventaire du manifeste décodé, lecture de la config réseau de sécurité, recherche
par motifs (bypass SSL, ponts JS WebView, accès fichiers, secrets en dur, composants
exportés), inventaire complet des domaines contactés.
Base : dépôt privé `mbox-tv-decompiled-source` (REA + JADX 1.5.6).

---
Rapport généré pour le **studio NOx** le 2026-10-24.
