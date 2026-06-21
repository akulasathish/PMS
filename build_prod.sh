#!/bin/bash
# Exit on any error
set -e

echo "=== Step 1: Building Docker Image (Baking flat keys) ==="
docker build --no-cache \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="https://njblemtrkqdnijwrnvjp.supabase.co" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qYmxlbXRya3Fkbmlqd3JudmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MjUzODgsImV4cCI6MjA5NTEwMTM4OH0.kmxA7b6F3yqvcjRGtX3ezJ9wWgDbqXaxD2xenVkoUcI" \
  -t 401644592968.dkr.ecr.ap-south-1.amazonaws.com/pms/app:latest .

echo "=== Step 2: Pushing Image to ECR ==="
docker push 401644592968.dkr.ecr.ap-south-1.amazonaws.com/pms/app:latest

echo "=== Step 3: Triggering rolling update in ECS ==="
aws ecs update-service \
  --cluster PMS_ECS \
  --service pms-app-service-xwt8ytiz \
  --force-new-deployment \
  --region ap-south-1

echo "=== Done! Image has been rebuilt and deployment triggered. ==="
