FROM prom/prometheus:latest

# Switch temporarily to root to copy files and adjust permissions
USER root

# Copy our configuration template and custom entrypoint script
COPY prometheus.yml /etc/prometheus/prometheus.template.yml
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

# Make the script executable and guarantee files are writable/readable by prometheus user
RUN chmod +x /usr/local/bin/entrypoint.sh && \
    chown -R nobody:nobody /etc/prometheus /prometheus

# Revert to standard unprivileged user for production security posture
USER nobody

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
