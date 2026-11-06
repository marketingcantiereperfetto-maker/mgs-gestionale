#!/usr/bin/env bash
# Prima volta per queste versioni: salva le immagini usate, la cache le conserva per i giri dopo.
set -euo pipefail
mapfile -t images < <(docker ps --filter "name=_mgs-gestionale" --format '{{.Image}}' | sort -u)
mapfile -t extra < <(docker images --format '{{.Repository}}:{{.Tag}}' | grep 'supabase/pg_prove' || true)
docker save "${images[@]}" "${extra[@]}" -o /tmp/immagini-supabase.tar
ls -lh /tmp/immagini-supabase.tar
