resource "aws_eks_cluster" "pms" {
  name     = "pms-production"
  role_arn = aws_iam_role.eks_cluster.arn

  vpc_config {
    subnet_ids = module.vpc.private_subnets
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy
  ]
}

resource "aws_eks_fargate_profile" "pms" {
  cluster_name           = aws_eks_cluster.pms.name
  fargate_profile_name   = "pms-profile"
  pod_execution_role_arn = aws_iam_role.fargate_execution.arn
  subnet_ids             = module.vpc.private_subnets

  selector {
    namespace = "default"
  }
}
