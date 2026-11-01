# 02 — Premier lancement : les permissions intrusives

MovieBox demande des permissions sans rapport avec la lecture vidéo. Vérification faite dans le code : **l'app dégrade proprement** quand elles sont refusées. Tableau de décision :

| Permission demandée | Impact si REFUSÉE | Verdict |
|---|---|---|
| **Calendrier** (lire + écrire) | Aucun sur la lecture/le téléchargement — utilisé uniquement pour les rappels de programmes sportifs | **Refuser** |
| **Localisation** (précise) | Onglets « Nearby » vides, avis géolocalisés sans position — le reste est intact. Coupe aussi l'événement de localisation silencieux de la télémétrie | **Refuser** |
| **Notifications** | Pas de push (nouveautés/messages). L'app fonctionne | Refuser si indésirable |
| **Médias** (images/audio/vidéo) | Streaming et navigation OK ; seulement les téléchargements et l'upload de vos vidéos sont affectés | **Refuser** sauf si vous téléchargez |
| **Micro** | Recherche vocale indisponible | **Refuser** |
| **Compte / contacts (sync)** | La synchronisation du compte système Transsion ne se fait pas. Aucun impact sur l'usage | **Refuser** |
| **Fichiers/stockage (legacy)** | Demandé pour les téléchargements — refusez si vous ne téléchargez pas | À votre choix |

## Comment refuser proprement (Android 15)

1. Au premier dialogue : **« Ne pas autoriser »** (pas « Refuser cette fois » qui re-demande plus tard).
2. Après 2 refus, Android propose « Ne plus demander » — acceptez pour les permissions de la colonne **Refuser** ci-dessus.
3. Récapitulatif et correction à tout moment : **Paramètres → Applications → MovieBox → Autorisations** — passez tout ce qui n'est pas indispensable en « Ne pas autoriser ».
4. La localisation précise peut aussi être réglée en « Uniquement pendant l'utilisation » si vous voulez garder « Nearby » sans le fond continu.

## Ce que l'app fait quand tout est refusé (vérifié dans le code)

- Démarrage normal : Splash → Home avec le contenu réseau
- L'événement de localisation de la télémétrie Athena ne part pas (pas de coordonnées)
- Les fonctions Nearby/Éducation/Widgets affichent des états vides ou demandent à nouveau — répondez au cas par cas
- Le lecteur, la recherche, les catégories, le téléchargement (si stockage accordé) fonctionnent intégralement

## Astuce complémentaire

Paramètres → Applications → MovieBox → **Batterie** : retirez « Non restreint » et désactivez le démarrage automatique si votre surcouche le permet — coupe les réveils en arrière-plan (`RECEIVE_BOOT_COMPLETED`, heartbeat horaire).
