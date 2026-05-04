# RE-PMS Engine 2026: EKS Cluster Runbook

This document details how to manage and monitor the production EKS Fargate cluster.

## 📊 Monitoring Stack (Prometheus & Grafana)

We use **Helm** to install the monitoring stack into a dedicated namespace called `monitoring`.

### 1. Install Helm (If not installed)
On Arch Linux:
```bash
sudo pacman -S helm
```

### 2. Add Repositories
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

### 3. Install Prometheus
```bash
kubectl create namespace monitoring
helm install prometheus prometheus-community/prometheus \
  --namespace monitoring \
  --set server.persistentVolume.enabled=false \
  --set alertmanager.persistentVolume.enabled=false
```

### 4. Install Grafana
```bash
helm install grafana grafana/grafana \
  --namespace monitoring \
  --set persistence.enabled=false \
  --set adminPassword='your-secure-password'
```

### 5. Access the Dashboards
To view Grafana from your laptop, use port-forwarding:
```bash
kubectl port-forward deployment/grafana 3001:3000 -n monitoring
```
Then open: `http://localhost:3001`

---

## 🚀 Application Lifecycle

### Manual Deployment (Testing)
To manually push a change to the cluster without using GitLab:
```bash
kubectl apply -f k8s/
```

### View Logs
```bash
kubectl logs -l app=pms-frontend -f
```

### Check System Health
```bash
kubectl get pods -A
```

---

## 🔒 Secret Management

To update Supabase or Resend keys:
1. Delete the old secret: `kubectl delete secret pms-prod-secrets`
2. Re-create: `kubectl create secret generic pms-prod-secrets --from-literal=KEY=VALUE...`
3. Restart pods: `kubectl rollout restart deployment/pms-frontend`
