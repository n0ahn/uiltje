#!/usr/bin/env bash
# Zips src/ and ai/ into uiltje-ai.zip and copies the zip file to the clipboard.
# Works on macOS, Linux (xclip or wl-copy) and Windows (Git Bash).
set -euo pipefail
cd "$(dirname "$0")"

OUT="uiltje-ai.zip"
rm -f "$OUT"

# 1. Zip
if command -v zip >/dev/null 2>&1; then
  zip -rq "$OUT" src ai -x "*.DS_Store"
elif command -v powershell.exe >/dev/null 2>&1; then
  powershell.exe -NoProfile -Command "Compress-Archive -Path src,ai -DestinationPath '$OUT' -Force"
else
  echo "No zip tool found (install zip)." >&2
  exit 1
fi

# 2. Copy the file itself to the clipboard
case "$(uname -s)" in
  Darwin)
    osascript -e "set the clipboard to (POSIX file \"$PWD/$OUT\")"
    ;;
  Linux)
    if command -v wl-copy >/dev/null 2>&1; then
      printf 'file://%s/%s\n' "$PWD" "$OUT" | wl-copy -t text/uri-list
    elif command -v xclip >/dev/null 2>&1; then
      printf 'copy\nfile://%s/%s' "$PWD" "$OUT" | xclip -selection clipboard -t x-special/gnome-copied-files
    else
      echo "Zip created, but install xclip or wl-copy for clipboard support." >&2
      exit 0
    fi
    ;;
  MINGW*|MSYS*|CYGWIN*)
    powershell.exe -NoProfile -Command "Set-Clipboard -Path '$(cygpath -w "$PWD/$OUT")'"
    ;;
  *)
    echo "Zip created, clipboard not supported on this OS." >&2
    exit 0
    ;;
esac

echo "Copied $OUT to clipboard."