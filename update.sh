#!/usr/bin/env bash
# Applies the newest zip from ./updates to this project.
# Usage: ./update.sh            (newest zip in ./updates)
#        ./update.sh path.zip   (a specific zip)
# Overwritten files are saved in ./.update-backup/<timestamp>/ so you can undo.
set -euo pipefail

cd "$(dirname "$0")"

zip="${1:-}"
if [ -z "$zip" ]; then
  zip="$(ls -t updates/*.zip 2>/dev/null | head -n 1 || true)"
fi
if [ -z "$zip" ] || [ ! -f "$zip" ]; then
  echo "Geen zip gevonden. Zet de download in ./updates/ en probeer opnieuw." >&2
  exit 1
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
unzip -q "$zip" -d "$tmp"

# Some zip tools wrap everything in one folder: step into it.
root="$tmp"
if [ "$(ls -A "$tmp" | wc -l | tr -d ' ')" = "1" ] && [ -d "$tmp/$(ls -A "$tmp")" ] && [ ! -d "$tmp/src" ] && [ ! -d "$tmp/ai" ]; then
  root="$tmp/$(ls -A "$tmp")"
fi

stamp="$(date +%Y%m%d-%H%M%S)"
backup=".update-backup/$stamp"
mkdir -p "$backup"

echo "Update: $zip"
changed=0
while IFS= read -r -d '' file; do
  rel="${file#"$root"/}"
  case "$rel" in DELETE.txt|__MACOSX/*|*.DS_Store) continue ;; esac
  if [ -e "$rel" ]; then
    mkdir -p "$backup/$(dirname "$rel")"
    cp -p "$rel" "$backup/$rel"
    status="aangepast"
  else
    status="nieuw"
  fi
  mkdir -p "$(dirname "$rel")"
  cp -p "$file" "$rel"
  echo "  $status: $rel"
  changed=$((changed + 1))
done < <(find "$root" -type f -print0)

if [ -f "$root/DELETE.txt" ]; then
  while IFS= read -r rel || [ -n "$rel" ]; do
    [ -z "$rel" ] && continue
    case "$rel" in /*|*..*) echo "  overgeslagen (onveilig pad): $rel"; continue ;; esac
    if [ -e "$rel" ]; then
      mkdir -p "$backup/$(dirname "$rel")"
      cp -p "$rel" "$backup/$rel"
      rm -f "$rel"
      echo "  verwijderd: $rel"
    fi
  done < "$root/DELETE.txt"
fi

rmdir "$backup" 2>/dev/null || true
echo "Klaar: $changed bestand(en). Draai nu: npm run check"
[ -d "$backup" ] && echo "Back-up van overschreven bestanden: $backup"