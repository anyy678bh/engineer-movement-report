# Backend deployment notes

## Prerequisites
- AWS CLI installed and configured
- AWS SAM CLI installed

## Deploy
```bash
cd backend
sam build
sam deploy
```

## What gets deployed
- API Gateway endpoints for creating and listing reports
- Lambda functions for report create/list operations
- DynamoDB table for reports
- Cognito User Pool and App Client
