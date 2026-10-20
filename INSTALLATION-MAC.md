# Pupuce sur son Mac

Pupuce et Hermes tournent sur le Mac. Le modèle est appelé via le fournisseur API choisi pendant l’installation. Aucun VPS, tunnel ou compte Vercel n’est nécessaire. Internet reste nécessaire pour l’IA et les catalogues. Les extraits envoyés à l’assistant sont transmis au fournisseur choisi.

## À préparer avant le rendez-vous

- Un Mac Apple Silicon (Mac Neo inclus), Internet et une session utilisateur normale.
- Une clé API personnelle et du crédit chez le fournisseur choisi, ainsi que le nom d’un modèle compatible avec les outils Hermes. Choisir le fournisseur dans l’assistant Hermes ; aucun fournisseur n’est imposé par Pupuce. Un abonnement ChatGPT seul ne fournit pas de crédit API.
- Prévoir le temps de télécharger Node, Hermes et les dépendances la première fois. Aucun modèle lourd n’est téléchargé.

## Installer une seule fois

1. Télécharger le dépôt depuis GitHub : **Code → Download ZIP**, décompresser puis ouvrir le dossier. Ou utiliser `git clone https://github.com/hemvall/PupuceIntelligence.git`.
2. Ouvrir **Installer-Pupuce.command**. Si Finder ne l’exécute pas, ouvrir Terminal, taper `bash ` (avec un espace), glisser le fichier dans Terminal puis appuyer sur Entrée. Si macOS bloque l’ouverture d’un fichier téléchargé, utiliser son action **Ouvrir** / les réglages de confidentialité après avoir vérifié son origine. Ne pas désactiver Gatekeeper.
3. L’installation utilise une copie durable dans `~/Library/Application Support/PupuceIntelligence/app`. Le dossier téléchargé pourra ensuite être supprimé. Node 22 (au minimum 22.13 pour la lecture PDF) est installé dans ce même espace si nécessaire, sans sudo ni Homebrew. L’archive est vérifiée avec la somme SHA-256 publiée par Node.
4. Si les outils de développement Apple sont absents, accepter leur installation et relancer le fichier une fois celle-ci terminée. Hermes a besoin de Git et peut avoir besoin d’un compilateur pour ses dépendances.
5. Dans l’assistant **Hermes model**, choisir le fournisseur, le modèle puis renseigner la clé directement dans le Terminal. Elle n’est jamais demandée par GitHub ni intégrée au dépôt.
6. Dans **Hermes tools**, configurer le jeu d’outils de la plateforme API Server pour la recherche documentaire. Activer les outils web souhaités ; certains demandent une clé de recherche supplémentaire. Ne pas activer les outils terminal ou de contrôle du Mac pour ce profil. La conversation à partir des documents sélectionnés fonctionne sans recherche web autonome. Les outils navigateur/contrôle du Mac ne sont pas installés par le bootstrap.
7. Le navigateur s’ouvre automatiquement. Accepter le petit test de réponse IA pour vérifier **Pupuce → Hermes → fournisseur → réponse**. Ce test effectue un véritable appel au modèle et peut être facturé par le fournisseur. En cas de refus du test, l’installation vérifie seulement que les services répondent : la génération reste à valider.

Le profil Hermes est isolé dans `~/Library/Application Support/PupuceIntelligence/hermes` via `HERMES_HOME`. Les réglages d’un éventuel Hermes déjà installé ne sont pas écrasés. Les clés de service sont générées automatiquement, réutilisées lors d’une réinstallation et conservées dans des fichiers accessibles uniquement à l’utilisateur. Le code d’accès ne doit pas être recopié à chaque lancement : un cookie HttpOnly est remis au navigateur par le lanceur local. Ce mécanisme est désactivé sur l’hébergement Vercel.

## Chaque jour

- Double-cliquer **Pupuce.command** sur le Bureau. Le lanceur démarre Hermes et Pupuce, attend leur disponibilité et ouvre l’atelier. Le Terminal peut être fermé après le message « Pupuce est prête ».
- Garder le Mac éveillé pendant une recherche. Après une veille, relancer le raccourci ; une recherche interrompue peut devoir être soumise à nouveau.
- **Arrêter-Pupuce.command** arrête les deux services démarrés par le lanceur. Cela interrompt aussi les recherches actives. Aucune exécution automatique au démarrage du Mac n’est installée.
- **Configurer-IA.command** arrête les services et permet de changer le fournisseur/modèle. Relancer ensuite Pupuce.
- **Diagnostic-Pupuce.command** indique l’état des services et propose un test réel de réponse. Il n’affiche pas les clés.

Ouvrir Pupuce avec le raccourci du Bureau (**http://127.0.0.1:3210**). Tous les dossiers, cours importés, sources, notes, conversations, documents modifiables et images intégrées sont **enregistrés automatiquement dans `~/Documents/PupuceIntelligence/atelier.json`**. Aucun export manuel n’est nécessaire. Le sous-dossier `Historique` conserve les dix versions précédentes. Les images provenant d’URL externes restent des liens ; les images importées dans les documents sont incluses dans la sauvegarde. Les clés API restent séparées dans la configuration Hermes.

Au premier lancement de cette version, les données déjà présentes dans ce navigateur sont récupérées automatiquement si aucun atelier n’existe encore sur disque. Ensuite, le fichier du Mac est prioritaire et peut être retrouvé depuis un autre navigateur ouvert avec le raccourci. Pour les données créées sur Vercel ou dans un autre navigateur avant cette mise à jour, télécharger une copie depuis cet ancien atelier puis la restaurer une fois dans Pupuce locale. Une restauration remplace l’atelier courant ; l’ancienne version reste dans Historique.

Attendre « Enregistré » avant de fermer une modification. En cas d’erreur de disque, d’autorisation macOS ou de conflit entre fenêtres, un message s’affiche : garder l’onglet ouvert et télécharger une copie si nécessaire. Ne pas utiliser deux fenêtres pour modifier simultanément l’atelier. Pour mettre à jour une installation existante, relancer `Installer-Pupuce.command` depuis la nouvelle version du dépôt ; les dossiers dans Documents sont conservés.

## Rédiger et exporter

Dans **Mon document**, ouvrir **Structure et rédaction**, ajuster le plan puis choisir **Rédiger le dossier complet**. Hermes propose un brouillon à relire ; cliquer sur **Adopter** ou **Remplacer mon document** pour l’ouvrir dans l’éditeur. Les illustrations accessibles du corpus sont incorporées ; d’autres peuvent être ajoutées avec **Image**. Les boutons **Word** et **PDF** exportent le contenu actuel avec les images.

L’exemple Cabanel est modifiable sans appel IA via **Partir du dossier Cabanel**. La version précédente d’un document remplacé peut être rétablie. L’export JSON des réglages inclut désormais les documents et les images.

## Dépannage

- **Port 3210 ou 8642 occupé** : arrêter l’autre application qui utilise ce port. Pupuce ne tue pas les processus qui ne lui appartiennent pas.
- **Pas de réponse du modèle** : vérifier le fournisseur, le modèle, le crédit et la clé avec Configurer-IA, puis relancer Pupuce et Diagnostic.
- **Recherche web indisponible** : utiliser `HERMES_HOME="$HOME/Library/Application Support/PupuceIntelligence/hermes" hermes tools` pour revoir les outils API Server et leurs éventuelles clés. Les recherches intégrées du Met/Open Library sont indépendantes des outils Hermes.
- **Hermes déjà actif ailleurs** : arrêter son API sur le port 8642 ou modifier sa configuration avant de lancer Pupuce. Le lanceur refuse de réutiliser un service inconnu.
- **Journaux** : `~/Library/Application Support/PupuceIntelligence/logs/hermes.log` et `pupuce.log`. Ils peuvent contenir du contenu de recherche ou des diagnostics du fournisseur ; ne pas les publier en entier.
- **Échec du téléchargement** : vérifier Internet puis relancer Installer-Pupuce. Une installation incomplète n’est pas annoncée comme prête.

## Mise à jour et suppression

Pour mettre à jour, arrêter Pupuce, télécharger la nouvelle version puis relancer Installer-Pupuce.command. Les clés et le profil existants sont conservés ; le fournisseur peut être gardé en répondant `n` à la question de reconfiguration. Hermes lui-même n’est pas mis à jour silencieusement ; utiliser son outil de mise à jour officiel lorsque nécessaire.

Pour supprimer l’installation : lancer Arrêter-Pupuce, puis supprimer les quatre raccourcis du Bureau et le dossier `~/Library/Application Support/PupuceIntelligence`. Un Hermes installé par son installeur officiel peut aussi avoir un lanceur dans `~/.local/bin` et un magasin de dépendances partagé : suivre sa documentation officielle pour le désinstaller. Les dossiers dans `~/Documents/PupuceIntelligence` ne sont pas supprimés par ces opérations.

## Périmètre et validation

Cette installation active le pont IA existant. Elle permet d’importer des PDF, Word .docx, images et fichiers texte dans les dossiers. Les originaux sont conservés ; le texte des PDF et Word est extrait localement. Les images et scans sans texte ne sont pas analysés automatiquement (pas d’OCR). La synchronisation entre appareils et l’enregistrement automatique des trouvailles Hermes dans la bibliothèque restent à ajouter. Le dossier Cabanel reste un contenu éditorial préparé.

Les tests automatisés couvrent les restrictions de la session locale, les secrets générés/conservés et le pont Hermes avec un service simulé. Le test proposé sur le Mac valide la véritable génération API. Le lancement natif Finder et l’installation officielle de Hermes doivent être vérifiés sur le Mac cible ; ils ne sont pas simulés comme une validation réelle.

Références officielles : [installation Hermes](https://hermes-agent.nousresearch.com/docs/getting-started/installation), [API Server](https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server).

