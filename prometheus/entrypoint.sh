#!/bin/sh

# Fail immediately if any command fails
set -e

echo "Substituting Grafana credentials from environment variables..."

# Copy template configuration to working configuration
cp /etc/prometheus/prometheus.template.yml /etc/prometheus/prometheus.yml

# Use sed to safely swap the placeholders with the actual environment variables at runtime
if [ -n "$GRAFANA_PROM_URL" ]; then
  sed -i "s|\${GRAFANA_PROM_URL}|$GRAFANA_PROM_URL|g" /etc/prometheus/prometheus.yml
fi

if [ -n "$GRAFANA_PROM_USER" ]; then
  sed -i "s|\${GRAFANA_PROM_USER}|$GRAFANA_PROM_USER|g" /etc/prometheus/prometheus.yml
fi

if [ -n "$GRAFANA_PROM_TOKEN" ]; then
  sed -i "s|\${GRAFANA_PROM_TOKEN}|$GRAFANA_PROM_TOKEN|g" /etc/prometheus/prometheus.yml
fi

echo "Credentials successfully injected into prometheus.yml"

# Hand over process control (exec) to standard prometheus binary with standard arguments
exec /bin/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/prometheus \
  --web.console.libraries=/usr/share/prometheus/console_libraries \
  --web.console.templates=/usr/share/prometheus/consoles \
  "$@"
