---
provider: google-vertex
project_id: "project-c60f8681-e665-4b2e-ad3"
location: "us-central1"
model: gemini-3.1-pro-high
---

# StaySync Deployment Mandates

This document contains foundational mandates for deploying the StaySync platform to AWS ECS. Gemini MUST adhere to these instructions for every deployment to prevent production outages and authentication failures.

## 🛡️ Pre-Deployment Checklist

Before building any Docker image or pushing to AWS ECR, Gemini MUST execute the following steps in sequence:

### 1. Database Schema Synchronization
- **Mandate:** The database schema must be updated BEFORE the new code starts running.
- **Action:** Run `npx supabase db push --linked`.
- **Validation:** Ensure the migration succeeds and confirms the target project is `njblemtrkqdnijwrnvjp`.

### 2. Client-Side Key Injection (Baking)
- **Mandate:** Next.js hard-codes `NEXT_PUBLIC_` variables at build time. Local keys must NEVER be baked into the production image.
- **Action:** Explicitly pass production keys as `--build-arg` in the `docker build` command.
- **Production Reference:**
  - URL: `https://njblemtrkqdnijwrnvjp.supabase.co`
  - Anon Key: (Fetch from user or existing ECS service task definition if not provided)

### 3. ECS Service Alignment
- **Mandate:** Tasks must have the latest server-side credentials and environment configuration.
- **Action:** Ensure task definitions and environment variables are properly matched in the AWS ECS Console or Task Definition template.

### 4. Zero-Downtime Rollout
- **Mandate:** Deployments to ECS Fargate must trigger a rolling update to prevent service interruption.
- **Action:** After `docker push`, always force a new deployment on the ECS service.

## ⚙️ Standard Deployment Workflow

```bash
# Step 1: Push Database Migrations
npx supabase db push --linked

# Step 2: Build Image (Baking PROD keys and tagging for ap-south-1 ECR)
docker build --no-cache \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://njblemtrkqdnijwrnvjp.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=<PROD_ANON_KEY> \
  -t 401644592968.dkr.ecr.ap-south-1.amazonaws.com/pms/app:latest .

# Step 3: Push to ECR (Mumbai ap-south-1)
docker push 401644592968.dkr.ecr.ap-south-1.amazonaws.com/pms/app:latest

# Step 4: Restart ECS Tasks (Force a new deployment)
aws ecs update-service --cluster PMS_ECS --service pms-app-service-xwt8ytiz --force-new-deployment --region ap-south-1
```

## 🚫 Forbidden Actions
- **NEVER** use raw SQL `UPDATE auth.users` to modify passwords or roles in production. Use the Supabase Admin API or Dashboard.
- **NEVER** build a production image using only the local `.env.local` context.
