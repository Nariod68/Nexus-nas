# Nexus NAS — Linux 0.3.0

Nexus transforme un serveur Debian/Ubuntu en NAS administrable depuis un
navigateur sur le réseau local. La configuration se termine à l'écran : compte
administrateur, disques, premier partage et utilisateurs.

## Installation rapide

Sur Debian 12/13 ou Ubuntu 22.04/24.04 avec systemd, x86_64 ou ARM64,
copier cette ligne dans le terminal du serveur :

```bash
sudo apt-get update && sudo apt-get install -y curl && curl -fsSL https://raw.githubusercontent.com/Nariod68/Nexus-nas/main/scripts/install.sh -o /tmp/nexus-install.sh && sudo bash /tmp/nexus-install.sh
```

Si curl est déjà installé, commencer directement par curl. L'installateur télécharge
la dernière Release stable (ou main avant la première publication), installe les
composants et affiche l'adresse du serveur et un code de première installation.
Aucun disque n'est formaté pendant l'installation.

1. Depuis un ordinateur du même réseau, ouvrir l'adresse affichée, par exemple
   http://192.168.1.50:8080. Elle redirige vers https://192.168.1.50:8443.
2. Accepter le certificat local auto-signé du NAS. Il peut ensuite être remplacé
   par un certificat reconnu dans /etc/nexus/server.crt et server.key.
3. Saisir le code d'installation, choisir le nom du serveur et créer un compte.
4. Choisir le stockage système existant, ou préparer un disque inutilisé. Créer
   le premier partage, puis terminer.

Le code initial ne permet plus de reconfigurer le serveur après le setup.
Le nom choisi est annoncé via mDNS, par exemple https://nexus-nas.local:8443 ;
la résolution .local dépend du support mDNS du client. L'adresse IP fonctionne
indépendamment de mDNS. Un pare-feu peut nécessiter l'autorisation des ports
8080, 8443 et 445. Si UFW est déjà actif, l'installateur ouvre ces ports uniquement
pour les réseaux IPv4 privés.

L'installation nécessite Internet et sudo. Elle installe Node.js 22 avec
vérification SHA-256 dans un dossier dédié, Samba, les outils GPT/ext4, Avahi
et OpenSSL. Aucun npm install ni compilation ne sont nécessaires sur le NAS.

## Fonctions

- Connexions et déconnexions, rôles administrateur/utilisateur, mots de passe
  hachés avec scrypt, cookies HttpOnly/SameSite, expiration et tentatives limitées.
- Ajout, modification, réinitialisation, désactivation et réactivation des comptes
  Nexus/SMB ; révocation des sessions après modification du compte.
- Partages SMB privés avec permissions de lecture ou lecture/écriture par compte.
- Dépôt multiple et glisser-déposer, progression, téléchargement, création de
  dossiers, renommage de fichiers et retrait vers une corbeille.
- Restauration et vidage définitif de la corbeille. Les dépôts n'écrasent pas les
  fichiers existants. La corbeille occupe de l'espace jusqu'à son vidage.
- Partitionnement d'un disque entier en une ou plusieurs partitions GPT/ext4,
  formatage, montage et inscription persistante dans fstab.
- Recherche et installation de Releases GitHub depuis Paramètres, contrôle de
  santé, retour à la version précédente et suivi des opérations.
- Changement de nom et redémarrage du serveur avec confirmation explicite.

Le partitionnement détruit toutes les données du disque choisi. Il exige un plan
valable cinq minutes et la saisie de EFFACER /dev/nom-du-disque. Les disques montés
(dont le disque système), swap, RAID, LVM et chiffrés sont refusés.
Cette version gère des volumes ext4 indépendants ; elle ne crée pas de RAID,
ne redimensionne pas les volumes existants, et ne fournit pas encore de système
de sauvegarde ou de diagnostic SMART complet.

## Accéder aux fichiers par SMB

Créer les comptes dans Utilisateurs, puis accorder les droits dans Partages réseau.
Le mot de passe est identique sur le web et en SMB. Le nom SMB porte le préfixe
nx_ : pour alice dans Nexus, utiliser nx_alice en SMB.

- Windows : ouvrir \\adresse-du-nas\nom-du-partage dans l'Explorateur.
- Linux/macOS : ouvrir smb://adresse-du-nas/nom-du-partage.
- Navigateur : rubrique Fichiers de Nexus.

Les comptes SMB n'ont pas d'accès SSH. Les comptes Linux existants sont conservés.
Nexus refuse de prendre possession d'un compte nx_ existant hors de sa configuration.
Retirer un partage conserve ses fichiers. Les accès web sont suspendus si un
volume géré est déconnecté. Les fichiers internes .nexus-* et les liens symboliques
ne sont pas accessibles par SMB/web. Limite de dépôt : 50 Gio par fichier,
et l'espace effectivement disponible sur le volume.

## Mises à jour

Dans Paramètres, rechercher puis installer une nouvelle version. Nexus vérifie
la version, le manifeste et SHA-256, installe dans un nouveau dossier et contrôle
les services après redémarrage. Un échec entraîne le retour à la version précédente.
Les comptes et partages restent dans les dossiers de données. Les anciennes
versions sont conservées pour le retour arrière.

La confiance repose sur le dépôt GitHub et ses mainteneurs. SHA-256 vérifie
l'intégrité, sans signature indépendante. Le mécanisme met à jour Nexus ; les
mises à jour Linux et des paquets système restent celles du système.
Le workflow teste main et publie automatiquement une Release pour chaque nouveau
numéro de package.json. Une version déjà publiée n'est pas remplacée.

## Maintenance

```bash
sudo systemctl status nexus nexus-agent smbd
sudo journalctl -u nexus -u nexus-agent -n 100
```

- Configuration et certificat : /etc/nexus/.
- Application : /opt/nexus/current, versions dans /opt/nexus/releases/.
- Moteur Node : /opt/nexus/runtime/bin/node.
- Comptes web : /var/lib/nexus/state.json, accessible au service nexus.
- État agent, opérations et audit : /var/lib/nexus-agent/.
- Données : /srv/nexus/data et /srv/nexus/volumes/UUID.
- Samba : /etc/samba/nexus-shares.conf ; smb.conf préexistant conservé avec une
  sauvegarde smb.conf.before-nexus.

Le serveur web s'exécute sans root. L'agent root n'écoute que sur un socket Unix
accessible au compte système nexus et expose des actions déterminées, sans shell
ni exécuteur de commandes arbitraires. Les transferts s'effectuent en flux. Sur
Linux, les dossiers sont ouverts avec O_NOFOLLOW et des descripteurs épinglés.

Pour migrer une installation 0.2, lancer le nouvel installateur avec --upgrade.
Le mot de passe existant devient celui du compte admin. Synchroniser le mot de
passe de ce compte via Mon compte pour activer SMB avant de créer un partage.
Le retour arrière graphique vise les versions 0.3 et ultérieures.

## Développement et validation

```bash
npm ci
npm test
npx playwright install chromium
npm run test:browser
npm run release:pack
```

Les tests API couvrent setup, sessions, rôles, permissions, transferts, chemins,
paquets et protections de disque. Chromium parcourt l'interface avec un agent de
test sans accès aux disques. Sur une VM Linux jetable, GitHub Actions installe les
services et vérifie HTTPS, Samba et le partitionnement GPT/ext4 sur un fichier
attaché à un loop créé exclusivement pour ce test. Aucun disque physique n'est
ciblé par les tests. L'installation Windows reste une cible ultérieure.
