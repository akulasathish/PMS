# EKS Application Deployment Commands Guide

This document outlines the sequence of commands to deploy your application to an AWS EKS cluster with Fargate, exposed via an Application Load Balancer (ALB).

**Before you begin:**
*   Ensure you have followed the instructions in `eks-deployment-scripts-and-files.md` to create the necessary JSON and YAML files.
*   Replace all placeholders like `<YOUR_AWS_ACCOUNT_ID>` and `<YOUR_PRODUCTION_SUPABASE_ANON_KEY>` with your actual values.
*   Ensure your local project root is `/home/sathish/Desktop/ishitham-projects/pms/`.

---

## Setup Environment Variables (Execute these first)

```bash
export AWS_REGION="ap-south-1"
export CLUSTER_NAME="pms-production"

# Retrieve EKS Cluster Details - Crucial for subsequent steps
export EKS_VPC_ID=$(aws eks describe-cluster --name $CLUSTER_NAME --region $AWS_REGION --query "cluster.resourcesVpcConfig.vpcId" --output text)
export EKS_OIDC_ISSUER=$(aws eks describe-cluster --name $CLUSTER_NAME --region $AWS_REGION --query "cluster.identity.oidc.issuer" --output text)
export EKS_OIDC_ID=$(echo $EKS_OIDC_ISSUER | sed -e 's|https://oidc.eks.ap-south-1.amazonaws.com/id/||')

# Your AWS Account ID
export AWS_ACCOUNT_ID="401644592968" # Replace with your actual AWS Account ID

# Production Supabase Details
export NEXT_PUBLIC_SUPABASE_URL="https://njblemtrkqdnijwrnvjp.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="<YOUR_PRODUCTION_SUPABASE_ANON_KEY>" # IMPORTANT: Replace with your actual key
```

---

## 1. Create EKS Cluster (with Fargate)

**Note:** This command creates your EKS cluster, VPC, and Fargate profiles. It takes 20-30 minutes or more.

```bash
eksctl create cluster --name $CLUSTER_NAME --region $AWS_REGION --fargate --version 1.35
```

---

## 2. Configure kubectl

Update your kubeconfig to point to the newly created EKS cluster.

```bash
aws eks update-kubeconfig --name $CLUSTER_NAME --region $AWS_REGION
```

---

## 3. Create IAM Policy for AWS Load Balancer Controller

**Prerequisite:** Ensure `aws_lb_controller_policy.json` is created as per `eks-deployment-scripts-and-files.md`.

```bash
aws iam create-policy --policy-name AWSLoadBalancerControllerIAMPolicy --policy-document file://aws_lb_controller_policy.json --region $AWS_REGION
```

---

## 4. Register OIDC Provider in IAM

```bash
aws iam create-open-id-connect-provider 
  --url $EKS_OIDC_ISSUER 
  --thumbprint-list 9e99a4820149397e1f4864c8442e032502d1a3c8 
  --client-id-list sts.amazonaws.com 
  --region $AWS_REGION
```

---

## 5. Create IAM Role for ALB Controller Service Account

**Prerequisite:** Ensure `trust_policy.json` is created as per `eks-deployment-scripts-and-files.md`.

```bash
aws iam create-role --role-name aws-load-balancer-controller --assume-role-policy-document file://trust_policy.json --region $AWS_REGION
```

---

## 6. Attach Policy to Role

```bash
aws iam attach-role-policy --role-name aws-load-balancer-controller --policy-arn arn:aws:iam::$AWS_ACCOUNT_ID:policy/AWSLoadBalancerControllerIAMPolicy --region $AWS_REGION
```

---

## 7. Create Kubernetes Service Account for ALB Controller

```bash
kubectl create serviceaccount aws-load-balancer-controller -n kube-system
```

---

## 8. Annotate Service Account with IAM Role ARN

```bash
kubectl annotate serviceaccount aws-load-balancer-controller -n kube-system 
  eks.amazonaws.com/role-arn=arn:aws:iam::$AWS_ACCOUNT_ID:role/aws-load-balancer-controller
```

---

## 9. Deploy AWS Load Balancer Controller (using Helm)

**Note:** This uses `image.tag=v3.4.0` as a likely compatible version for Kubernetes 1.35.

```bash
helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm upgrade aws-load-balancer-controller eks/aws-load-balancer-controller 
  -n kube-system 
  --set clusterName=$CLUSTER_NAME 
  --set serviceAccount.create=false 
  --set serviceAccount.name=aws-load-balancer-controller 
  --set image.repository=602401143452.dkr.ecr.ap-south-1.amazonaws.com/amazon/aws-load-balancer-controller 
  --set image.tag=v3.4.0 
  --set region=$AWS_REGION 
  --set vpcId=$EKS_VPC_ID 
  --set enableShield=false 
  --set enableWaf=false 
  --set enableWafv2=false 
  --set logLevel=debug 
  --set args="{--cluster-name=$CLUSTER_NAME,--ingress-class=alb,--aws-region=$AWS_REGION,--aws-vpc-id=$EKS_VPC_ID,--enable-shield=false,--enable-waf=false,--enable-wafv2=false,--log-level=debug}"
```

---

## 10. Create ECR Repository (if not already existing)

```bash
aws ecr create-repository --repository-name pms/app --region $AWS_REGION
```

---

## 11. Build Docker Image

```bash
docker build --no-cache 
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" 
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" 
  -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/pms/app:latest .
```

---

## 12. Push Docker Image to ECR

```bash
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/pms/app:latest
```

---

## 13. Tag Subnets for ALB Controller

Retrieve subnet IDs from your VPC:

```bash
# Get Public Subnet IDs (look for "MapPublicIpOnLaunch": true)
PUBLIC_SUBNETS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$EKS_VPC_ID" --region $AWS_REGION --query "Subnets[?MapPublicIpOnLaunch==`true`].SubnetId" --output text)

# Get Private Subnet IDs (look for "MapPublicIpOnLaunch": false)
PRIVATE_SUBNETS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$EKS_VPC_ID" --region $AWS_REGION --query "Subnets[?MapPublicIpOnLaunch==`false`].SubnetId" --output text)
```

Apply the tags:

```bash
aws ec2 create-tags --resources $PUBLIC_SUBNETS --tags Key=kubernetes.io/cluster/$CLUSTER_NAME,Value=owned Key=kubernetes.io/role/elb,Value=1 --region $AWS_REGION
aws ec2 create-tags --resources $PRIVATE_SUBNETS --tags Key=kubernetes.io/cluster/$CLUSTER_NAME,Value=owned Key=kubernetes.io/role/internal-elb,Value=1 --region $AWS_REGION
```

---

## 14. Deploy Application Kubernetes Manifests

**Prerequisites:** Ensure `pms_frontend_deployment_service.yaml` and `pms_frontend_ingress.yaml` are created as per `eks-deployment-scripts-and-files.md`.

```bash
kubectl apply -f /home/sathish/Desktop/ishitham-projects/pms/pms_frontend_deployment_service.yaml
kubectl apply -f /home/sathish/Desktop/ishitham-projects/pms/pms_frontend_ingress.yaml
```

---

## 15. Monitor Ingress for ALB Address

Continuously check the Ingress status until an address appears.

```bash
kubectl get ingress pms-frontend-ingress
```

Once an address appears (e.g., `k8s-default-...elb.amazonaws.com`), your application is live at that URL.

---
