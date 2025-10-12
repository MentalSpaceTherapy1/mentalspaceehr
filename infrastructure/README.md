# MentalSpace EHR - AWS Infrastructure

HIPAA-compliant infrastructure for MentalSpace EHR

## Cost: $82-132/month (vs $600/month Supabase Team)

## Quick Start

1. Bootstrap CDK:
   cd infrastructure
   cdk bootstrap

2. Deploy:
   cdk deploy

3. Save the outputs (User Pool ID, API endpoint, etc.)

## What's Created

- VPC with private subnets
- Aurora Serverless v2 PostgreSQL
- S3 for file storage
- Cognito for authentication
- API Gateway
- All HIPAA-compliant with encryption

See full README after deployment.
