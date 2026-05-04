# RE-PMS Engine 2026: Enterprise Deployment Strategy

This document outlines the professional Infrastructure-as-Code (IaC) and cloud-native deployment strategy for the RE-PMS platform.

## 🏛️ Cloud Architecture (Production)
Our production environment is built for scale, high availability, and 99.9% uptime.

| Service | Role | Why we use it |
| :--- | :--- | :--- |
| **AWS EKS** | Container Orchestrator | The industry standard for managing Dockerized microservices at scale. |
| **AWS Fargate** | Serverless Compute | Eliminates server maintenance (no EC2 patching) and provides per-container isolation and auto-scaling. |
| **AWS ECR** | Image Registry | Secure, private storage for our immutable Docker versioned images. |
| **Supabase Cloud** | DB & Auth Engine | Managed PostgreSQL with built-in Row-Level Security (RLS) for bulletproof multi-tenancy. |
| **n8n (Dockerized)** | Logic Orchestrator | Handles event-driven automation (GST math, PDF generation) without cluttering the core app. |

## 🛠️ Deployment Toolchain
| Tool | Usage | Why we use it |
| :--- | :--- | :--- |
| **Terraform** | Infrastructure-as-Code | Ensures our entire cloud (VPC, EKS, IAM) is version-controlled and repeatable. |
| **Docker** | Containerization | Guarantees "Works on my machine" consistency from local dev to AWS EKS. |
| **kubectl** | Cluster Management | The primary CLI tool for deploying and inspecting applications inside EKS. |
| **GitLab CI/CD** | Automated SDLC | Automates the Test -> Build -> Deploy pipeline upon every code push. |

---

## 📊 Observability & Monitoring
We follow the "Three Pillars of Observability" to ensure system health:

1. **Error Tracking (Sentry):**
   * **Role:** Real-time exception catching.
   * **Why:** Instantly notifies the team of frontend or backend crashes with exact stack traces.
2. **Infrastructure Metrics (Prometheus):**
   * **Role:** Time-series data collection.
   * **Why:** Tracks CPU, RAM, and network health of our Kubernetes pods.
3. **Visualization (Grafana):**
   * **Role:** The "Control Room" dashboard.
   * **Why:** Transforms Prometheus numbers into real-time health charts for the engineering team.

---

## 🚀 The Deployment Lifecycle (SDLC)

1. **Infrastructure Provisioning:** 
   * Run `terraform apply` to build the VPC and EKS Cluster.
   * State is stored securely in an AWS S3 bucket with DynamoDB locking.
2. **Schema Synchronization:**
   * Run `npx supabase db push` to synchronize local migrations with Supabase Cloud.
3. **Application Deployment:**
   * CI/CD pipeline builds the Docker image.
   * Image is tagged and pushed to AWS ECR.
   * `kubectl apply` updates the EKS cluster with the latest version.
4. **Automation Setup:**
   * n8n workflows are imported via JSON to ensure consistent event-driven logic.

---

*Current Status: **Pilot / Testing Phase***
*Lead Architect: **Solo Developer***
