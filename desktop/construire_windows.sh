#!/bin/sh
# Reconstruit Yak-elec-pro.exe (Windows 10/11, 64 bits) depuis le dossier du projet. Nécessite Go et Python 3.
set -e
cd "$(dirname "$0")/.."
python3 build.py
python3 desktop/make_icon.py
cp dist/yak-elec-pro.html desktop/app.html
cd desktop
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -ldflags "-H=windowsgui -s -w" -o ../dist/Yak-elec-pro.exe .
echo "OK : dist/Yak-elec-pro.exe"
