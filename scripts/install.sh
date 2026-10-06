#!/usr/bin/env bash
set -euo pipefail
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
[[ $(id -u) == 0 ]] || { echo 'Lancer avec sudo bash install.sh'; exit 1; }
[[ $(uname -s) == Linux && -f /etc/debian_version ]] || { echo 'Cette installation vise Debian 12/13 ou Ubuntu 22.04/24.04 et versions suivantes.'; exit 1; }
command -v systemctl >/dev/null || { echo 'systemd requis'; exit 1; }
upgrade=false
[[ ${1:-} == --upgrade ]] && upgrade=true
if [[ -e /opt/nexus/current || -L /opt/nexus/current ]]; then
  $upgrade || { echo 'Nexus est déjà installé. Utilisez les mises à jour dans Paramètres, ou --upgrade pour migrer une installation 0.2.'; exit 1; }
fi
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
export DEBIAN_FRONTEND=noninteractive
echo 'Installation des composants Linux…'
apt-get update -qq
apt-get install -y -qq ca-certificates curl tar xz-utils util-linux fdisk e2fsprogs samba avahi-daemon openssl

source_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
if [[ ! -f "$source_dir/package.json" || ! -d "$source_dir/agent" ]]; then
  # A standalone script downloads the same trusted repository. Prefer a stable
  # published release; before the first release, bootstrap from main.
  release_tag=$(curl -fsSL https://api.github.com/repos/Nariod68/Nexus-nas/releases/latest | sed -n 's/.*"tag_name": *"\(v[0-9]*\.[0-9]*\.[0-9]*\)".*/\1/p' | head -1) || release_tag=''
  if [[ -n $release_tag ]]; then archive="https://github.com/Nariod68/Nexus-nas/archive/refs/tags/${release_tag}.tar.gz"; else archive='https://github.com/Nariod68/Nexus-nas/archive/refs/heads/main.tar.gz'; fi
  curl --fail --location --retry 3 "$archive" -o "$work/source.tar.gz"
  mkdir "$work/source"
  tar -xzf "$work/source.tar.gz" --strip-components=1 -C "$work/source" --no-same-owner
  source_dir="$work/source"
fi
[[ -f "$source_dir/agent/main.js" ]] || { echo 'Les sources téléchargées ne correspondent pas à Nexus 0.3 ou supérieur'; exit 1; }
case $(uname -m) in x86_64) node_arch=x64 ;; aarch64|arm64) node_arch=arm64 ;; *) echo 'Architecture compatible : x86_64 ou ARM64'; exit 1 ;; esac
install -d -m 755 /opt/nexus/releases /etc/nexus /srv/nexus /srv/nexus/data /srv/nexus/volumes
if [[ ! -x /opt/nexus/runtime/bin/node ]]; then
  echo 'Installation du moteur Node.js dédié à Nexus…'
  curl -fsSL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt -o "$work/SHASUMS256.txt"
  node_archive=$(awk -v suffix="linux-${node_arch}.tar.xz" '$2 ~ suffix"$" { print $2; exit }' "$work/SHASUMS256.txt")
  [[ $node_archive =~ ^node-v22\.[0-9]+\.[0-9]+-linux-(x64|arm64)\.tar\.xz$ ]] || { echo 'Archive Node.js invalide'; exit 1; }
  curl --fail --location --retry 3 "https://nodejs.org/dist/latest-v22.x/$node_archive" -o "$work/$node_archive"
  (cd "$work" && awk -v file="$node_archive" '$2 == file' SHASUMS256.txt | sha256sum -c -)
  mkdir /opt/nexus/runtime
  tar -xJf "$work/$node_archive" --strip-components=1 -C /opt/nexus/runtime --no-same-owner
fi
node=/opt/nexus/runtime/bin/node
version=$($node -p 'JSON.parse(require("fs").readFileSync(process.argv[1])).version' "$source_dir/package.json")
[[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || exit 1
getent passwd nexus >/dev/null || useradd --system --home-dir /var/lib/nexus --shell /usr/sbin/nologin nexus
target="/opt/nexus/releases/v${version}-$(date +%s)"
mkdir "$target"
cp "$source_dir/"{package.json,index.html,app.js,live.js,console.js,styles.css,nexus-icon.svg} "$target/"
cp -r "$source_dir/server" "$source_dir/scripts" "$source_dir/agent" "$source_dir/deploy" "$target/"
chown -R root:root "$target"
chmod -R u=rwX,go=rX "$target"
$node --check "$target/server/main.js"
if $upgrade; then realpath /opt/nexus/current > /opt/nexus/previous; fi
ln -s "$target" /opt/nexus/.new-current
mv -Tf /opt/nexus/.new-current /opt/nexus/current
if [[ ! -f /etc/nexus/nexus.env ]]; then
  token=$($node -e 'console.log(require("crypto").randomBytes(18).toString("hex"))')
  umask 077
  printf 'NEXUS_SETUP_TOKEN=%s\nNEXUS_HOST=0.0.0.0\nNEXUS_PORT=8080\nNEXUS_TLS_PORT=8443\nNEXUS_STORAGE_PATH=/srv/nexus\nNEXUS_TLS_CERT=/etc/nexus/server.crt\nNEXUS_TLS_KEY=/etc/nexus/server.key\n' "$token" > /etc/nexus/nexus.env
elif $upgrade; then
  echo 'Configuration existante conservée. Le mot de passe 0.2 devient celui du compte admin.'
fi
if [[ ! -f /etc/nexus/server.key ]]; then
  ip=$(hostname -I | awk '{print $1}')
  san="DNS:nexus-nas.local,DNS:$(hostname),IP:127.0.0.1"
  [[ $ip =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] && san="$san,IP:$ip"
  openssl req -x509 -newkey rsa:3072 -sha256 -days 825 -nodes -keyout /etc/nexus/server.key -out /etc/nexus/server.crt -subj '/CN=Nexus NAS' -addext "subjectAltName=$san" >/dev/null 2>&1
  chown root:nexus /etc/nexus/server.key
  chmod 640 /etc/nexus/server.key
fi
touch /etc/samba/nexus-shares.conf
if ! grep -q '/etc/samba/nexus-shares.conf' /etc/samba/smb.conf; then
  cp -p /etc/samba/smb.conf /etc/samba/smb.conf.before-nexus
  { printf '[global]\n   include = /etc/samba/nexus-shares.conf\n'; cat /etc/samba/smb.conf.before-nexus; } > /etc/samba/smb.conf
fi
testparm -s >/dev/null
install -m 644 "$source_dir/deploy/nexus.service" /etc/systemd/system/nexus.service
install -m 644 "$source_dir/deploy/nexus-agent.service" /etc/systemd/system/nexus-agent.service
systemctl daemon-reload
systemctl enable --now avahi-daemon smbd nexus-agent nexus
systemctl restart nexus-agent nexus
# Open only private IPv4 networks if the user already enabled UFW.
if command -v ufw >/dev/null && ufw status | grep -q 'Status: active'; then
  for network in 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16; do
    for port in 8080 8443 445; do ufw allow from "$network" to any port "$port" proto tcp >/dev/null; done
  done
fi
sleep 2
systemctl is-active --quiet nexus-agent nexus || { journalctl -u nexus -u nexus-agent -n 30 --no-pager; exit 1; }
echo
echo 'Nexus est prêt. Ouvrez depuis un ordinateur du même réseau :'
for address in $(hostname -I); do [[ $address =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] && echo "  http://$address:8080 (redirige vers HTTPS sur 8443)"; done
echo '  https://nexus-nas.local:8443 (après avoir choisi ce nom dans le setup)'
echo 'Le certificat local est auto-signé : validez son avertissement dans votre navigateur.'
if [[ -n ${token:-} ]]; then echo "Code de première installation : $token"; else echo 'Compte existant conservé.'; fi
echo 'La suite se fait dans le navigateur. Aucun disque n’a été formaté par cet installateur.'
