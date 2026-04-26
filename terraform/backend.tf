terraform {
  backend "s3" {
    bucket         = "pms-terraform-state-401644592968"
    key            = "eks-cluster/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "pms-terraform-locks"
    encrypt        = true
  }
}
