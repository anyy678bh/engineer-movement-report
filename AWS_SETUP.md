# AWS setup plan for the Engineer Movement Report

## Recommended services
- Amplify Hosting for the frontend
- Cognito for authentication and user sign-up/sign-in
- API Gateway + Lambda for report APIs
- DynamoDB for storing movement reports in a multi-tenant design

## Multi-tenant data model
Use a single DynamoDB table with records shaped like this:
- pk: tenant#<tenantId>
- sk: report#<reportId>
- tenantId
- reportId
- userEmail
- companyName
- location
- transportType
- machineType
- serviceRendered
- createdAt

## Deployment skeleton included
- amplify.yml for Amplify hosting
- backend/template.yaml for Lambda, API Gateway, Cognito, and DynamoDB
- backend/lambda/createReport/index.mjs for saving a report
- backend/lambda/listReports/index.mjs for listing reports

## Next deployment steps
1. Create a Cognito User Pool and App Client.
2. Deploy the SAM template from the backend folder.
3. Connect the frontend to the deployed API endpoint.
4. Publish the site in Amplify Hosting.

## Example deployment commands
```bash
cd backend
sam build
sam deploy --guided
```
