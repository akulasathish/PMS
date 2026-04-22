# AWS App Runner Deployment & Production Observability

This document outlines the deployment architecture for the Cloud Beds PMS application, the industry-standard observability stack for production environments, and the pending roadmap items.

---

## 1. Deployment Workflow (ECR to App Runner)

The application is a Next.js (App Router) project, containerized using Docker, and deployed via AWS App Runner.

### The Deployment Steps:

1.  **Authentication:** Authenticate the local Docker CLI with AWS Elastic Container Registry (ECR).
    ```bash
    aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
    ```
2.  **Building the Image (With Build Args):** Next.js requires `NEXT_PUBLIC_` environment variables at *build time* for static prerendering. We build the image passing the real Supabase credentials.
    ```bash
    docker build \
      --build-arg NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT_ID>.supabase.co \
      --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY> \
      -t pms/app:latest .
    ```
3.  **Tagging and Pushing:** The local image is tagged for the remote repository and pushed to AWS ECR.
    ```bash
    docker tag pms/app:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/pms/app:latest
    docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/pms/app:latest
    ```
4.  **App Runner Execution:** AWS App Runner monitors the ECR repository. When the `latest` tag is updated, App Runner pulls the new image, provisions the compute resources, maps the internal port (3000) to a public HTTPS URL, and manages auto-scaling automatically.

---

## 2. Production Observability (The 8 Categories)

In the industry, "Observability" (o11y) is divided into 8 core categories to monitor, debug, and maintain production applications.

### 1. Metrics (The "Numbers")
*   **Purpose:** Tracks CPU, Memory, Request counts, and latency over time.
*   **Tools:** Prometheus + Grafana, AWS CloudWatch, Datadog.

### 2. Logging (The "Events")
*   **Purpose:** Text records of specific events (e.g., "User login failed").
*   **Tools:** Grafana Loki, ELK Stack (Elasticsearch, Logstash, Kibana), AWS CloudWatch Logs.

### 3. Tracing (The "Journey")
*   **Purpose:** Tracks the lifecycle of a single request across multiple services (Frontend -> Middleware -> DB).
*   **Tools:** Grafana Tempo, Jaeger, AWS X-Ray, Honeycomb.

### 4. Error Tracking / Exception Monitoring (The "Code")
*   **Purpose:** Pinpoints the exact line of code that crashed, including stack traces and local variables.
*   **Tools:** **Sentry** (Industry Standard), Bugsnag.

### 5. Synthetics & Uptime (The "Pulse")
*   **Purpose:** External pinging to ensure the website is reachable globally.
*   **Tools:** Better Stack, UptimeRobot, Pingdom.

### 6. Real User Monitoring (RUM) & Analytics (The "User")
*   **Purpose:** Tracks user clicks, page views, and frontend load times.
*   **Tools:** PostHog, Mixpanel, Google Analytics.

### 7. Security & Vulnerability Scanning (The "Shield")
*   **Purpose:** Scans Docker images and dependencies for known vulnerabilities.
*   **Tools:** Snyk, Trivy, AWS GuardDuty.

### 8. Incident Management / Alerting (The "Alarm")
*   **Purpose:** Routes critical alerts (e.g., DB down) to on-call engineers via SMS/Calls.
*   **Tools:** PagerDuty, Opsgenie.

---

## 3. DevOps Lifecycle & Automation (The Professional Way)

In a professional environment, manual commands are replaced by automated "Pipelines." DevOps is the bridge between writing code and running it reliably at scale.

### Core DevOps Categories:

1.  **Source Control Management (SCM):**
    *   **Goal:** Collaboration and versioning.
    *   **Practice:** Using Merge Requests (MRs) and branching strategies (e.g., GitFlow).
    *   **Tools:** GitLab (Current), GitHub.

2.  **Continuous Integration (CI):**
    *   **Goal:** "The Quality Gate." Every push triggers automated scripts.
    *   **Checks:** Linting (`npm run lint`), Type Checking (`tsc`), and Unit Testing.
    *   **Tools:** GitLab CI, GitHub Actions.

3.  **Artifact Management:**
    *   **Goal:** Storing the "finished product" (Docker images) securely.
    *   **Practice:** Versioning images with Git commit hashes (e.g., `app:bf6f749`) instead of just `latest`.
    *   **Tools:** AWS ECR (Current).

4.  **Infrastructure as Code (IaC):**
    *   **Goal:** Defining servers and services using code rather than clicking buttons in the AWS Console.
    *   **Tools:** Terraform, AWS CDK, Pulumi.

5.  **Continuous Deployment (CD):**
    *   **Goal:** Automating the rollout of new images to production.
    *   **Practice:** Blue/Green deployments (zero-downtime updates).
    *   **Tools:** AWS CodeDeploy, ArgoCD.

6.  **Secrets Management:**
    *   **Goal:** Securely storing sensitive keys (Supabase, Stripe) outside of the codebase.
    *   **Tools:** AWS Secrets Manager, HashiCorp Vault.

---

## 4. The "Perfect" Production Loop

This is the standard workflow used by top-tier engineering teams:

1.  **Push:** Developer pushes a feature branch to GitLab.
2.  **CI (Automated):** GitLab CI runs Lint, Type Checks, and Tests. The "Merge" button is blocked if they fail.
3.  **Review:** Peer engineers review the code for logic and security.
4.  **Merge:** Code is merged into `main`.
5.  **Build (Automated):** The CI/CD runner builds the Docker image and pushes it to AWS ECR.
6.  **Deploy (Automated):** The deployment tool (e.g., Terraform or CodeDeploy) updates AWS App Runner with the new image.
7.  **Monitor:** Prometheus/Grafana and Sentry watch for spikes in errors or latency.
8.  **Rollback:** If the new version is unstable, the system automatically reverts to the previous stable image in ECR.

---

## 5. Pending Works & Next Steps

1.  **n8n Workflow Automation Deployment**
    *   *Status:* **LIVE** (Running on AWS EC2 at http://18.206.46.206:5678).
    *   *Action:* All workflow JSONs imported and pointing to production Supabase/Resend credentials.
2.  **Sandbox Cleanup**
    *   *Status:* Local Prometheus and Grafana instances are currently configured via Docker Compose for learning.
    *   *Action:* Once experimentation is complete, run `docker-compose -f docker-compose.monitoring.yml down` and remove the sandbox files.
3.  **Production Error Tracking Integration**
    *   *Status:* App Runner is live, but unhandled exceptions currently fail silently.
    *   *Action:* Set up a Sentry project and wrap the Next.js app to capture runtime frontend and backend errors.
4.  **MVP Feature Completion (Tier 2/3)**
    *   *Status:* Tracking via Conductor.
    *   *Action:* Complete remaining feature parity modules as defined in the `conductor/tracks` plans.
