# 🏛️ Architect's Playbook: The RE-PMS EKS Deployment

This document is the definitive record of how the RE-PMS application was deployed from local development to a production-grade Amazon Elastic Kubernetes Service (EKS) cluster using AWS Fargate.

It explains the "Why" behind the "How."

---

## Phase 1: The Infrastructure (Terraform)
        
**The Goal:** Build the physical "Building" and the "Neighborhood."

We used **Terraform (Infrastructure as Code)** to prevent human error. Instead of clicking buttons in the AWS Console, we wrote `.tf` files.

### 1. providers.tf
*   **What it does:** Tells Terraform to connect to AWS in the us-east-1 region.
*   **Why:** You must specify the region so the resources are created in the correct data center.

### 2. vpc.tf (The Network)
*   **What it does:** Creates a Virtual Private Cloud (VPC) named pms-vpc.
*   **Why:** You never put a database or internal app on the public internet. We created 3 "Private Subnets" (where your app lives securely) and 3 "Public Subnets" (where the Load Balancer lives to receive internet traffic).

### 3. iam.tf (The Security Badges)
*   **What it does:** Creates two AWS IAM Roles.
*   **Why:** Computers need ID badges too.
    *   **EKS Cluster Role:** Allows the Kubernetes "Brain" to talk to AWS.
    *   **Fargate Execution Role:** Allows the "Worker" servers to pull your Docker image from ECR securely.

### 4. eks.tf (The Brain and the Muscle)
*   **What it does:** Instructs AWS to spin up the EKS Control Plane (pms-production) and attaches the Fargate Profile.
*   **Why:** We chose Fargate so you don't have to manage EC2 instances. The Fargate profile says: "Any app in this cluster runs on serverless compute."

### 5. backend.tf (The Memory)
*   **What it does:** Tells Terraform to save its state (its memory of what it built) in an AWS S3 bucket instead of on your laptop.
*   **Why:** Without this, if your laptop broke, you would lose the ability to manage your AWS cluster.

---

## Phase 2: The Security Handshakes (CLI)

**The Goal:** Give the Kubernetes "Brain" the power to create AWS resources (like URLs).

Even though Terraform built the cluster, the cluster itself was "dumb." It didn't have the permission to build a Load Balancer (the public URL). We fixed this with three critical commands:

### 1. The OIDC Handshake
```bash
eksctl utils associate-iam-oidc-provider --cluster pms-production --region us-east-1 --approve
```
*   **Why:** OIDC (OpenID Connect) creates a trusted bridge between Kubernetes and AWS IAM. It allows Kubernetes pods to "assume" AWS roles.

### 2. The IAM Policy Download & Creation
```bash
aws iam create-policy --policy-name AWSLoadBalancerControllerIAMPolicy --policy-document file://iam_policy.json
```
*   **Why:** The AWS Load Balancer Controller (the robot that builds your URL) needs a massive, 80-line list of explicit permissions. We downloaded this JSON from AWS and created the policy.

### 3. The Service Account Binding
```bash
eksctl create iamserviceaccount --name aws-load-balancer-controller --namespace kube-system --cluster pms-production --role-name AmazonEKSLoadBalancerControllerRole --attach-policy-arn [POLICY_ARN] --approve
```
*   **Why:** This links the AWS IAM Policy directly to the Kubernetes software inside your cluster. Now, the controller is legally authorized to build firewalls and URLs on your behalf.

---

## Phase 3: The Application Deployment (Kubernetes)

**The Goal:** Tell the cluster to pull your code and turn it on.

We used kubectl (the Kubernetes remote control) to push three "Blueprints" (YAML files) into the cluster.

### 1. secrets.yaml (or kubectl create secret)
*   **What it does:** Creates an encrypted vault inside the cluster holding your SUPABASE_URL and RESEND_API_KEY.
*   **Why:** You must never hardcode passwords in your Docker image. The cluster securely injects them into your app when it boots up.

### 2. k8s/deployment.yaml
*   **What it does:** Tells the cluster: "Go to ECR, download the pms/app:latest image, and run 2 copies (replicas) of it."
*   **Why 2 replicas?** High Availability. If one crashes, the other takes the traffic while a replacement spins up.

### 3. k8s/service.yaml & k8s/ingress.yaml
*   **What they do:** 
    *   The **Service** creates an internal bridge to the 2 running copies.
    *   The **Ingress** asks the Load Balancer Controller to generate the public AWS URL.
*   **Why:** Without these, your app would be running securely in the cloud, but the internet would have no way to access it.
