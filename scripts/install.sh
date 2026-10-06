#!/usr/bin/env bash
set -euo pipefail
[[ $(id -u) == 0 ]] || { echo 'Lancer avec sudo bash scripts/install.sh'; exit 1; }
[[ $(uname -s) == Linux ]] || { echo 'Linux requis'; exit 1; }
command -v node >/dev/null || { echo 'Installer Node.js 22 ou supérieur avant Nexus'; exit 1; }
node -e 'if(Number(process.versions.node.split(".")[0]) < 22) process.exit(1)' || { echo 'Node.js 22 minimum'; exit 1; }
command -v systemctl >/dev/null || { echo 'systemd requis'; exit 1; }
[[ ! -e /opt/nexus/current && ! -L /opt/nexus/current ]] || { echo 'Déjà installé. Utiliser scripts/update.js pour les mises à jour.'; exit 1; }
source_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
version=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1])).version' "$source_dir/package.json")
[[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || exit 1
getent passwd nexus >/dev/null || useradd --system --home-dir /var/lib/nexus --shell /usr/sbin/nologin nexus
install -d -m 755 /opt/nexus/releases /etc/nexus
target="/opt/nexus/releases/v${version}"
mkdir "$target"
cp "$source_dir/"{package.json,index.html,app.js,live.js,styles.css,nexus-icon.svg} "$target/"
cp -r "$source_dir/server" "$source_dir/scripts" "$target/"
chown -R root:root "$target"
chmod -R u=rwX,go=rX "$target"
ln -s "$target" /opt/nexus/current
if [[ ! -f /etc/nexus/nexus.env ]]; then
  password=$(node -e 'console.log(require("crypto").randomBytes(24).toString("hex"))')
  umask 077
  printf 'NEXUS_ADMIN_PASSWORD=%s\nNEXUS_HOST=127.0.0.1\nNEXUS_PORT=8080\nNEXUS_STORAGE_PATH=/\n' "$password" > /etc/nexus/nexus.env
fi
install -m 644 "$source_dir/deploy/nexus.service" /etc/systemd/system/nexus.service
systemctl daemon-reload
systemctl enable --now nexus
echo 'Nexus installé sur http://127.0.0.1:8080'
echo 'Mot de passe dans /etc/nexus/nexus.env (sudo cat /etc/nexus/nexus.env).'
echo 'Consulter README.md pour accéder depuis un autre ordinateur.'
