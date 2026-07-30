#!/usr/bin/env bash
# Hace que Nala arranque sola al iniciar sesion. Para sacarla:
#   rm ~/.config/autostart/nala.desktop
set -e

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$HOME/.config/autostart"
ELECTRON="$RAIZ/node_modules/.bin/electron"

if [ ! -x "$ELECTRON" ]; then
  echo "falta electron: corré npm install en $RAIZ" >&2
  exit 1
fi

mkdir -p "$DEST"
cat > "$DEST/nala.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=Nala
Comment=Nala, viviendo en el escritorio
Exec=$ELECTRON $RAIZ --no-sandbox
Icon=$RAIZ/assets/icon.png
Terminal=false
X-GNOME-Autostart-enabled=true
# Unos segundos de aire: si arranca junto con la sesion, todavia no hay
# escritorio donde ponerse y la ventana puede quedar mal ubicada.
X-GNOME-Autostart-Delay=10
DESKTOP

echo "listo -> $DEST/nala.desktop"
echo "arranca sola en el proximo inicio de sesion."
