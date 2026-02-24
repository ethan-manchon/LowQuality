# LowQuality

## Présentation du projet
LowQuality est une extension de navigateur (Manifest V3) qui force automatiquement la qualité YouTube à 144p afin de réduire la consommation de données et l'impact énergétique du streaming.

L'extension suit le temps réellement regardé, estime les économies réalisées (données, énergie, équivalent recharges téléphone) et affiche ces statistiques dans un popup avec un graphique par jour.

## Fonctionnalités
- Forçage automatique de la qualité YouTube à 144p sur les pages vidéo.
- Overlay d'information lors du chargement d'une vidéo avec 2 actions:
	- repasser en 1080p,
	- conserver 144p.
- Option d'auto-fermeture de l'overlay après 10 secondes.
- Suivi du temps visionné réel (play / pause / fin).
- Calcul des économies estimées:
	- données économisées (Mo / Go),
	- énergie économisée (Wh / kWh),
	- équivalent en recharges téléphone.
- Tableau de bord dans le popup:
	- totaux cumulés,
	- historique journalier (7 jours, 30 jours, tout),
	- réinitialisation des statistiques.

## Comment ça fonctionne
1. Détection d'une vidéo YouTube (hors Shorts).
2. Passage en qualité 144p.
3. Démarrage du suivi du temps réellement regardé.
4. En fin de lecture / fermeture / changement de vidéo, calcul et sauvegarde des économies.
5. Consultation des résultats depuis le popup.

## Calcul des économies (estimation)
Constantes utilisées dans le script:
- 1080p: 12 Mbps
- 144p: 0,2 Mbps
- Intensité énergétique: 0,015 kWh / Go
- 1 recharge téléphone: 0,015 kWh

Formules principales:
- Données économisées = données(1080p) - données(144p)
- Énergie économisée = Go économisés × 0,015
- Recharges téléphone = énergie économisée / 0,015

Ces valeurs sont des estimations pédagogiques et non une mesure physique exacte.

## Installation
1. Télécharger le fichier ZIP du projet.
2. Ouvrir `chrome://extensions` (ou la page équivalente selon votre navigateur).
3. Activer le **Mode développeur**.
4. Cliquer sur **Charger l'extension non empaquetée**.
5. Sélectionner le dossier téléchargé.
6. Relancer votre navigateur.

## Utilisation
- Ouvrir une vidéo YouTube classique (pas un Short).
- L'extension applique 144p automatiquement.
- Utiliser l'overlay pour conserver 144p ou revenir en 1080p.
- Cliquer sur l'icône de l'extension pour voir les statistiques.
- Activer/désactiver l'auto-fermeture depuis le popup.
- Utiliser le bouton **Réinitialiser** pour remettre les compteurs à zéro.

## Données stockées (local)
Les données sont enregistrées dans `chrome.storage.local`:
- `installDate`: date d'installation.
- `autoDismiss`: état de l'auto-fermeture de l'overlay.
- `dailySavings`: économies par jour.
- `totalSavings`: totaux cumulés.

Aucune synchronisation cloud n'est utilisée par défaut.

## Structure du projet
- `manifest.json`: configuration de l'extension (MV3).
- `background.js`: service worker (initialisation storage, messages popup).
- `content.js`: logique YouTube (forçage qualité, tracking, overlay, sauvegarde).
- `overlay.css`: styles de l'overlay injecté dans YouTube.
- `popup.html`: structure de l'interface popup.
- `popup.css`: styles du popup.
- `popup.js`: chargement et affichage des statistiques.
- `chart.js`: mini librairie de graphique (canvas, sans dépendances).
- `icons/`: icônes de l'extension.

## Permissions utilisées
- `storage`: sauvegarde des préférences et statistiques.
- `activeTab`: interaction avec l'onglet actif.
- `host_permissions` sur `*.youtube.com`: exécution du content script sur YouTube.

## Compatibilité
- Conçu pour Chrome/Chromium (Manifest V3).
- Peut fonctionner sur d'autres navigateurs Chromium compatibles extensions.

## Limites connues
- Ne cible pas les vidéos Shorts.
- Le forçage de qualité dépend du player YouTube et peut évoluer si YouTube change son interface.
- Les économies affichées sont des estimations.