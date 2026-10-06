# Nexus NAS

Nexus est une interface web pour un NAS personnel Linux. La version **0.2.0**
ajoute un service réel : connexion administrateur, état du serveur, disques,
configuration Samba existante, comptes Linux et recherche de publications GitHub.

Cette première version est une **console de supervision en lecture seule**,
installable sur un Linux existant. La création des partages et utilisateurs,
le formatage, le RAID, SMART, les sauvegardes et les actions système restent
à développer. Leurs boutons sont désactivés en mode connecté. Les informations
indisponibles sont indiquées comme telles, sans inventer de bonne santé disque.
Windows sera une cible ultérieure.

## Essayer sur Linux

Prérequis : Node.js 22 ou supérieur. Aucun npm install nécessaire.
Linux avec systemd est requis pour l'installation permanente. lsblk (util-linux),
getent et systemctl fournissent les données Linux. Samba et testparm sont optionnels :
Nexus lit une configuration existante, sans installer Samba ni créer de partage.

```bash
read -rsp 'Mot de passe Nexus (16 caractères minimum) : ' NEXUS_ADMIN_PASSWORD
echo
export NEXUS_ADMIN_PASSWORD
npm start
```

Ouvrir http://127.0.0.1:8080. Les sessions sont en mémoire, expirent après huit
heures et sont révoquées au redémarrage. Le mot de passe reste hors du navigateur.
Ouvrir directement index.html conserve la maquette avec ses valeurs fictives.
Un serveur statique ne suffit pas pour le mode connecté : celui-ci attend l'API.

## Installer sur le NAS

Télécharger les sources du dépôt https://github.com/Nariod68/Nexus-nas,
puis, depuis leur dossier :

```bash
sudo bash scripts/install.sh
sudo systemctl status nexus
sudo cat /etc/nexus/nexus.env
```

Le script crée le compte système nexus sans connexion interactive, un service
systemd non privilégié et un mot de passe aléatoire. Les fichiers installés sont
détenus par root. Il refuse d'écraser une installation existante.

- Application : /opt/nexus/current, lien vers /opt/nexus/releases/.
- Configuration et mot de passe : /etc/nexus/nexus.env, accessible uniquement à root.
- Journaux : sudo journalctl -u nexus.
- Stockage surveillé : NEXUS_STORAGE_PATH=/, à remplacer par le point de montage
  des données, par exemple /srv/nas. Les capacités représentent ce système de
  fichiers, pas la somme des disques physiques.

Depuis un autre ordinateur, utiliser d'abord un tunnel SSH :

```bash
ssh -L 8080:127.0.0.1:8080 utilisateur@adresse-du-nas
```

Puis ouvrir http://127.0.0.1:8080 sur cet ordinateur. Pour un accès habituel,
placer un reverse proxy HTTPS devant le service local et définir dans nexus.env :
NEXUS_PUBLIC_ORIGIN=https://nas.example et NEXUS_SECURE_COOKIE=1.
Le proxy doit transmettre Host et Origin. Nexus ne fait pas confiance aux en-têtes
forwarded. Redémarrer après modification : sudo systemctl restart nexus.

NEXUS_HOST, NEXUS_PORT et NEXUS_STORAGE_PATH sont configurables. Pour le contrôle
de santé des mises à jour, conserver une écoute incluant 127.0.0.1. Les fichiers
personnels ne sont pas servis par l'API. Les comptes affichés sont les comptes
Linux, distincts de l'administrateur Nexus. Les partages reflètent la configuration
Samba ; leur accessibilité depuis un client n'est pas contrôlée.

## Publier sur GitHub

Le dépôt prévu est Nariod68/Nexus-nas, déjà référencé dans la maquette.
Le changer dans server/releases.js et app.js si nécessaire. Cette préparation
locale ne publie pas les fichiers : ajouter le dossier au dépôt, y compris
.github/workflows/release.yml.

1. Exécuter npm test et npm run release:pack.
2. Mettre à jour la version de package.json pour chaque nouvelle publication.
3. Pousser un tag correspondant exactement, par exemple v0.2.0.

```bash
git tag v0.2.0
git push origin v0.2.0
```

GitHub Actions teste sous Ubuntu et crée une Release stable avec
nexus-v0.2.0.json et nexus-v0.2.0.json.sha256. Le paquet contient les seuls fichiers
applicatifs autorisés en base64. Pour la première installation, télécharger les
sources de la Release. Les mises à jour utilisent le paquet dédié.
Un commit seul ne déclenche pas de mise à jour chez les utilisateurs.

## Mettre à jour

Le bouton dans Paramètres cherche la dernière Release stable depuis le serveur.
Pour l'installer dans le terminal du NAS :

```bash
sudo node /opt/nexus/current/scripts/update.js
```

L'outil refuse les versions anciennes ou identiques. Il vérifie SHA-256, le digest
GitHub si présent, les noms de fichiers et la version du paquet. Il conserve
l'ancien dossier, bascule le lien courant, redémarre le service et contrôle sa
réponse. Un échec déclenche le retour à la version précédente. /etc/nexus reste
intact. SHA-256 assure l'intégrité, pas une signature indépendante : la confiance
repose sur le dépôt GitHub et ses mainteneurs.

Retour manuel à la version précédente :

```bash
sudo node /opt/nexus/current/scripts/update.js --rollback
```

Les anciennes versions sont conservées. Un verrou empêche les mises à jour
simultanées. Après une interruption brutale, vérifier les processus et l'état
de l'installation avant de retirer /opt/nexus/.update-lock. Le mécanisme met à
jour Nexus, pas Linux ou Samba.

## Vérification

```bash
npm test
node --check app.js
node --check live.js
bash -n scripts/install.sh
npm run release:pack
```

Les tests couvrent les sessions, origines étrangères, limites de connexion,
fichiers privés, lecture système et paquets corrompus ou contenant des chemins
inattendus. GitHub Actions les exécute sur Linux. L'installation systemd et la
récupération après un redémarrage raté doivent encore être validées sur une VM Linux
avant l'utilisation sur un NAS contenant des données importantes.
