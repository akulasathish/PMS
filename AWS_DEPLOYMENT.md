# RE-PMS Engine 2026: AWS Deployment Guide

This guide details the "Production-Ready" deployment path using **AWS Amplify** for the Next.js frontend and **Supabase Cloud** for the backend engine.

---

## Phase 1: Migrate Database to Supabase Cloud

1.  **Create Project:** Go to [Supabase.com](https://supabase.com) and create a new project (Region: `ap-south-1` Mumbai for India).
2.  **Link Local CLI:** Run `npx supabase login` then `npx supabase link --project-ref your-project-ref`.
3.  **Push Schema:** Run `npx supabase db push`. This will physically move all our tables, RLS policies, and triggers from your laptop to the AWS-hosted Supabase cloud.
4.  **Storage:** Create the `guest-ids` bucket in the Supabase Cloud dashboard and set it to **Public**.

---

## Phase 2: Deploy Frontend to AWS Amplify

1.  **Connect Git:** Push your code to GitLab. In the AWS Console, open **AWS Amplify**, click "New App" -> "Host Web App", and connect your GitLab repository.
2.  **Environment Variables:** In the Amplify Settings, you **must** add these secrets from your Supabase Cloud dashboard:
    *   `NEXT_PUBLIC_SUPABASE_URL`
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    *   `SUPABASE_SERVICE_ROLE_KEY`
3.  **Build Settings:** Amplify will auto-detect Next.js. Ensure the build command is `npm run build`.
4.  **Deployment:** Click "Save and Deploy". AWS will provision a global CDN and SSL certificate (HTTPS) for you automatically.

---

## Phase 3: Deployment Options Comparison

### Option A: AWS Amplify (Recommended)
*   **Pros:** Automatically handles Next.js Server Actions and SSR. Auto-deploys every time you push to GitLab.
*   **Cons:** Less control over the underlying server OS.

### Option B: AWS App Runner (Containerized)
*   **How:** Use our `Dockerfile` to build an image, push it to **AWS ECR**, and tell App Runner to run it.
*   **Best for:** High-security enterprise clients who demand "Virtual Private Cloud" (VPC) isolation.

### Option C: AWS RDS + ECS (Full AWS)
*   **Warning:** This is the most expensive path. You would replace Supabase with:
    *   **Auth:** AWS Cognito.
    *   **Database:** AWS RDS Postgres.
    *   **Storage:** AWS S3.
    *   **Note:** This requires rewriting ~30% of the current codebase to remove Supabase dependencies.

---

## Final Production Checklist
- [ ] Change `window.location.origin` logic to use your production domain.
- [ ] Enable **Point-in-Time Recovery (PITR)** in Supabase for hotel data safety.
- [ ] Set up a custom domain (e.g., `pms.yourcompany.com`) in AWS Amplify Route 53.
- [ ] Rotate the `SUPABASE_SERVICE_ROLE_KEY` after deployment for security.
