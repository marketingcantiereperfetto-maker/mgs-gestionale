#!/usr/bin/env bash
# Avvia il Supabase locale con le stesse versioni del cloud. Se la cache ha le immagini, si
# caricano da lì invece di scaricarle. Le chiavi locali non si stampano nel registro.
set -euo pipefail
mkdir -p supabase/.temp
printf %s "${SUPABASE_POSTGRES_VERSION}" >supabase/.temp/postgres-version
printf %s "${SUPABASE_GOTRUE_VERSION}" >supabase/.temp/gotrue-version
printf %s "${SUPABASE_REST_VERSION}" >supabase/.temp/rest-version
printf %s "${SUPABASE_STORAGE_VERSION}" >supabase/.temp/storage-version
if [ "${1:-}" = "true" ]; then
  start=$(date +%s)
  docker load -i /tmp/immagini-supabase.tar
  echo "Immagini caricate dalla cache in $(($(date +%s) - start)) secondi."
fi
start=$(date +%s)
if ! npx supabase start >/tmp/avvio-supabase.log 2>&1; then
  grep -viE 'key|secret|jwt|postgresql://' /tmp/avvio-supabase.log
  exit 1
fi
echo "Supabase locale avviato in $(($(date +%s) - start)) secondi."
docker ps --format '{{.Image}}' | sort -u
