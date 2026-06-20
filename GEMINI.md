---
provider: google-vertex
project_id: "project-c60f8681-e665-4b2e-ad3"
location: "us-central1"
model: gemini-3.1-pro-high
---

# StaySync Deployment Mandates

This document contains foundational mandates for deploying the StaySync platform to AWS EKS. Gemini MUST adhere to these instructions for every deployment to prevent production outages and authentication failures.

## 🛡️ Pre-Deployment Checklist
... [Keep the rest of your file exactly as it is] ...











# StaySync Deployment Mandates

This document contains foundational mandates for deploying the StaySync platform to AWS EKS. Gemini MUST adhere to these instructions for every deployment to prevent production outages and authentication failures.

## 🛡️ Pre-Deployment Checklist

Before building any Docker image or pushing to AWS ECR, Gemini MUST execute the following steps in sequence:

### 1. Database Schema Synchronization
- **Mandate:** The database schema must be updated BEFORE the new code starts running.
- **Action:** Run `npx supabase db push --linked`.
- **Validation:** Ensure the migration succeeds and confirms the target project is `xjsuwjivetlmzzbngeuy`.

### 2. Client-Side Key Injection (Baking)
- **Mandate:** Next.js hard-codes `NEXT_PUBLIC_` variables at build time. Local keys must NEVER be baked into the production image.
- **Action:** Explicitly pass production keys as `--build-arg` in the `docker build` command.
- **Production Reference:**
  - URL: `https://xjsuwjivetlmzzbngeuy.supabase.co`
  - Anon Key: (Fetch from user or existing EKS secret if not provided)

### 3. Kubernetes Secret Alignment
- **Mandate:** Pods must have the latest server-side credentials.
- **Action:** If keys have changed, update the `pms-prod-secrets` generic secret using `kubectl apply`.

### 4. Zero-Downtime Rollout
- **Mandate:** Deployments to EKS must trigger a rolling update to prevent service interruption.
- **Action:** After `docker push`, always run `kubectl rollout restart deployment pms-frontend`.

## ⚙️ Standard Deployment Workflow

```bash
# Step 1: Push Database Migrations
npx supabase db push --linked

# Step 2: Build Image (Baking PROD keys)
docker build --no-cache \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://xjsuwjivetlmzzbngeuy.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=<PROD_ANON_KEY> \
  -t 401644592968.dkr.ecr.us-east-1.amazonaws.com/pms/app:latest .

# Step 3: Push to ECR
docker push 401644592968.dkr.ecr.us-east-1.amazonaws.com/pms/app:latest

# Step 4: Restart EKS Pods
kubectl rollout restart deployment pms-frontend
```

## 🚫 Forbidden Actions
- **NEVER** use raw SQL `UPDATE auth.users` to modify passwords or roles in production. Use the Supabase Admin API or Dashboard.
- **NEVER** build a production image using only the local `.env.local` context.
