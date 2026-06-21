# Restore procedure (verified runbook)

Backups are gzipped `pg_dump` logical dumps in the R2 bucket `$BACKUP_R2_BUCKET`,
named `velvich_crm_<UTC-timestamp>.sql.gz`, retained ≥30 days.

## 1. Pick a backup

```sh
aws --endpoint-url "$R2_ENDPOINT" s3 ls "s3://$BACKUP_R2_BUCKET/"
```

## 2. Download it

```sh
aws --endpoint-url "$R2_ENDPOINT" \
  s3 cp "s3://$BACKUP_R2_BUCKET/velvich_crm_20260621T020000Z.sql.gz" ./restore.sql.gz
```

## 3. Restore into a clean database

> Restoring overwrites data. Do this against a **fresh** DB or after taking a
> final dump of the current one.

```sh
# Create an empty target DB (example name velvich_crm_restore)
PGPASSWORD="$POSTGRES_PASSWORD" createdb -h "$POSTGRES_HOST" -U "$POSTGRES_USER" velvich_crm_restore

# Load the dump
gunzip -c restore.sql.gz | PGPASSWORD="$POSTGRES_PASSWORD" \
  psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d velvich_crm_restore
```

## 4. Point the app at the restored DB

Update `DATABASE_URL` to the restored database and restart the API:

```sh
docker compose -f infra/docker-compose.yml restart api
```

## 5. Verify

- `GET /api/health` returns `{ "db": "up" }`.
- Spot-check a known project's account totals and the latest monthly ledger
  closing balance against the figures recorded before the incident.

## Disaster-recovery test cadence

Run a full download → restore → verify against a scratch database **monthly** and
record the date in the ops log. A backup is only real once a restore has been
proven.
