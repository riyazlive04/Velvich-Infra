#!/usr/bin/env sh
# Daily logical backup: pg_dump -> gzip -> Cloudflare R2, with retention pruning.
# Schedule via cron on the VPS, e.g.:
#   0 2 * * *  /repo/infra/scripts/backup.sh >> /var/log/velvich-backup.log 2>&1
#
# Required env (loaded from .env): POSTGRES_*, BACKUP_R2_BUCKET, BACKUP_RETENTION_DAYS,
# and R2 credentials (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY).
set -eu

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="velvich_crm_${STAMP}.sql.gz"
TMP="/tmp/${FILE}"

echo "[backup] dumping ${POSTGRES_DB} ..."
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h "${POSTGRES_HOST:-postgres}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
  --no-owner --no-privileges | gzip -9 > "${TMP}"

echo "[backup] uploading to s3://${BACKUP_R2_BUCKET}/${FILE} ..."
AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
aws --endpoint-url "${R2_ENDPOINT}" s3 cp "${TMP}" "s3://${BACKUP_R2_BUCKET}/${FILE}"

rm -f "${TMP}"

# Prune backups older than retention window.
CUTOFF_DAYS="${BACKUP_RETENTION_DAYS:-30}"
echo "[backup] pruning objects older than ${CUTOFF_DAYS} days ..."
AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
aws --endpoint-url "${R2_ENDPOINT}" s3 ls "s3://${BACKUP_R2_BUCKET}/" | while read -r line; do
  created="$(echo "$line" | awk '{print $1}')"
  name="$(echo "$line" | awk '{print $4}')"
  [ -z "$name" ] && continue
  created_epoch="$(date -d "$created" +%s 2>/dev/null || echo 0)"
  cutoff_epoch="$(date -d "-${CUTOFF_DAYS} days" +%s)"
  if [ "$created_epoch" -lt "$cutoff_epoch" ] && [ "$created_epoch" -ne 0 ]; then
    echo "[backup] deleting old ${name}"
    AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
      aws --endpoint-url "${R2_ENDPOINT}" s3 rm "s3://${BACKUP_R2_BUCKET}/${name}"
  fi
done

echo "[backup] done: ${FILE}"
