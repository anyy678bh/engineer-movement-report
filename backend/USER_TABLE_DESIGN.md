# User and tenant data design

## Cognito
Use Amazon Cognito User Pool for:
- login
- sign up
- password reset
- email verification

## DynamoDB user profile table
Table name: engineer-user-profiles

Primary key:
- userId (partition key)
- tenantId (sort key)

Suggested attributes:
- fullName
- department
- idCardNumber
- email
- createdAt
- updatedAt

## DynamoDB reports table
Table name: engineer-movement-reports

Primary key:
- pk = tenant#<tenantId>
- sk = report#<reportId>

Suggested attributes:
- tenantId
- reportId
- userEmail
- companyName
- location
- transportType
- machineType
- serviceRendered
- createdAt
