# Setting up HTTPS for `www.staysnc.online` with AWS EKS and ALB

This document outlines the step-by-step process for configuring DNS in AWS Route 53 and securing your Application Load Balancer (ALB) with HTTPS for an EKS-deployed application.

## I. Prerequisites

Before you begin, ensure you have the following in place:

1.  **Registered Domain Name:** Your domain (`staysync.online`) must be registered and managed by AWS Route 53.
2.  **AWS Account:** You need an AWS account with sufficient permissions for:
    *   AWS Route 53 (DNS management)
    *   AWS Certificate Manager (ACM)
    *   Elastic Load Balancing (ELB/ALB)
    *   Elastic Kubernetes Service (EKS)
3.  **EKS Cluster and Application:** Your EKS cluster should be running, and your application (e.g., `pms-frontend`) should be deployed and exposed via an Application Load Balancer (ALB).
4.  **Local Configuration:**
    *   `kubectl` command-line tool configured to interact with your EKS cluster.
    *   AWS CLI configured with appropriate credentials and default region (`ap-south-1` in this case).

---

## II. Step-by-Step Guide

Follow these steps in order to properly configure your DNS and HTTPS.

### Step 1: Create or Provision SSL/TLS Certificate in AWS Certificate Manager (ACM)

**Purpose:** To enable HTTPS for your domain by obtaining a trusted SSL/TLS certificate.

**Action:** Request a public certificate for your domain(s). It's best practice to request a wildcard certificate (e.g., `*.staysync.online`) to cover all subdomains, or specifically `www.staysync.online` and `staysync.online`. You will need to validate ownership of the domain, typically via DNS validation (recommended) or email validation.

1.  **Navigate to ACM:** Go to the AWS Certificate Manager (ACM) console.
2.  **Request a Certificate:** Click "Request a certificate" -> "Request a public certificate" -> "Next".
3.  **Add Domain Names:** Enter `staysync.online` and `*.staysync.online` (or `www.staysync.online` if you only need the www subdomain).
4.  **Validation Method:** Choose "DNS validation" (recommended).
5.  **Review and Request:** Review your request and click "Confirm and request".
6.  **Validate Domain:** Follow the instructions to add CNAME records to your Route 53 hosted zone for validation. ACM can often do this automatically if your domain is in Route 53. Wait for the certificate status to become "Issued".

**Output:** Note down the **Certificate ARN**. It will look similar to:
`arn:aws:acm:ap-south-1:ACCOUNT-ID:certificate/CERTIFICATE-ID`
*(Example: `arn:aws:acm:ap-south-1:401644592968:certificate/3c534d47-9b60-4554-8181-1e2736a438d9`)

### Step 2: Verify Application Load Balancer (ALB) and Target Group

**Purpose:** To confirm your EKS application is correctly exposed via an ALB and has a healthy target group to route traffic to.

**Action:**
1.  **Identify ALB DNS Name:** From your EKS service or ingress configuration, identify the DNS name of your ALB. It will typically look like `k8s-default-pmsfront-...elb.amazonaws.com`.
2.  **Get ALB ARN:** Use the AWS CLI to find the ALB's ARN using its DNS name and region.
    ```bash
    aws elbv2 describe-load-balancers --region ap-south-1 --query "LoadBalancers[?DNSName=='<YOUR_ALB_DNS_NAME>'].LoadBalancerArn" --output text
    ```
    *Replace `<YOUR_ALB_DNS_NAME>` with the actual DNS name of your ALB.*
    *(Example DNS Name: `k8s-default-pmsfront-6e4146d3c8-1496221305.ap-south-1.elb.amazonaws.com`)*
3.  **Identify Target Group ARN:** Use the AWS CLI to list target groups and find the one associated with your EKS service and ALB.
    ```bash
    aws elbv2 describe-target-groups --query "TargetGroups[*].[TargetGroupArn,TargetGroupName,LoadBalancerArns]" --region ap-south-1 --output json
    ```
    *Look for a `TargetGroupArn` whose `LoadBalancerArns` array includes your ALB's ARN.*

**Output:** Note down the **ALB ARN** and **Target Group ARN**.
*(Example ALB ARN: `arn:aws:elasticloadbalancing:ap-south-1:401644592968:loadbalancer/app/k8s-default-pmsfront-6e4146d3c8/6bec7dc0d9c87803`)*
*(Example Target Group ARN: `arn:aws:elasticloadbalancing:ap-south-1:401644592968:targetgroup/k8s-default-pmsfront-4de5cc047d/5b71a25e72576f5c`)*

### Step 3: Configure Route 53 A Record (Alias)

**Purpose:** To point your custom domain (`www.staysnc.online`) to your AWS Application Load Balancer.

**Action:**
1.  **Navigate to Route 53:** Go to the AWS Route 53 console.
2.  **Select Hosted Zone:** Click on "Hosted zones" and select `staysync.online`.
3.  **Create/Edit Record:**
    *   Click "Create record" or select an existing `www.staysnc.online` record to edit.
    *   **Record Name:** Enter `www`.
    *   **Record Type:** Choose `A - Routes traffic to an IPv4 address and some AWS resources`.
    *   **Alias:** Enable "Alias".
    *   **Route traffic to:** Select "Alias to Application and Classic Load Balancer".
    *   **Region:** Select the region where your ALB is deployed (`ap-south-1`).
    *   **Choose Load Balancer:** Select your ALB from the dropdown list.
    *   Click "Create records" or "Save changes".
4.  **Verify No Conflicting Records:** Ensure there are no other `A` records for `www.staysnc.online` or `www.staysnc.online.staysnc.online.` that might conflict. If found, delete them.

**Tools:** AWS Management Console (Route 53).

### Step 4: Create HTTPS Listener on the ALB

**Purpose:** To enable your ALB to accept incoming encrypted traffic on the standard HTTPS port (443) and decrypt it using your SSL certificate before forwarding it to your application.

**Action:** Use the AWS CLI to create the HTTPS listener.
```bash
aws elbv2 create-listener 
    --load-balancer-arn <YOUR_ALB_ARN> 
    --protocol HTTPS 
    --port 443 
    --certificates CertificateArn=<YOUR_CERTIFICATE_ARN> 
    --default-actions Type=forward,TargetGroupArn=<YOUR_TARGET_GROUP_ARN> 
    --region ap-south-1
```
    *Replace `<YOUR_ALB_ARN>`, `<YOUR_CERTIFICATE_ARN>`, and `<YOUR_TARGET_GROUP_ARN>` with the ARNs you noted in Step 1 and Step 2.*

**Output:** A successful command will return details of the newly created listener, including its ARN.

### Step 5: (Optional) Redirect HTTP to HTTPS

**Purpose:** To ensure all traffic uses HTTPS.

**Action:** Modify your existing HTTP listener (port 80) to redirect all traffic to HTTPS (port 443).

1.  **Get HTTP Listener ARN:** First, you need the ARN of your HTTP listener (port 80).
    ```bash
    aws elbv2 describe-listeners --load-balancer-arn <YOUR_ALB_ARN> --query "Listeners[?Port==`80`].ListenerArn" --output text --region ap-south-1
    ```
    *Replace `<YOUR_ALB_ARN>` with your ALB's ARN.*
2.  **Modify HTTP Listener to Redirect:**
    ```bash
    aws elbv2 modify-listener 
    --listener-arn <YOUR_HTTP_LISTENER_ARN> 
    --default-actions Type=redirect,RedirectConfig='{StatusCode=HTTP_301,Protocol=HTTPS,Port=443,Host=#{host},Path=/#{path},Query=#{query}}' 
    --region ap-south-1
    ```
    *Replace `<YOUR_HTTP_LISTENER_ARN>` with the ARN obtained in the previous step.*

### Step 6: Test Access

**Purpose:** To verify that `www.staysnc.online` is now accessible via HTTPS.

**Action:**
1.  **Clear Caches:** Clear your browser's cache and DNS cache on your local machine.
2.  **Access Website:** Open a browser and navigate to `https://www.staysnc.online`.
3.  **Verify HTTPS:** Ensure the connection is secure (look for the padlock icon in the browser's address bar).
4.  **Test HTTP (if redirect implemented):** Navigate to `http://www.staysnc.online` and verify that it automatically redirects to `https://www.staysnc.online`.

---
