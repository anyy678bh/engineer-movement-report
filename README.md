# Engineer Movement Report

A simple web prototype for logging daily engineer movement reports. The interface is ready for a multi-tenant product direction and can be extended into a full AWS-hosted solution.

## Included fields
- Date
- Company name attended
- Location
- Transportation type (Public Transport or Company Vehicle)
- Type of machine repaired
- Service rendered

## Suggested AWS architecture
- Frontend: Amazon S3 + CloudFront
- Authentication: Amazon Cognito
- API: API Gateway + AWS Lambda
- Database: Amazon DynamoDB for multi-tenant storage
- Domain & SSL: Route 53 + AWS Certificate Manager

## Multi-tenant data model idea
Use a tenant identifier such as `tenantId` for each record and store the report data with a partition key like:
- `tenantId`
- `reportId`

## Run locally
1. Open the folder in a browser directly, or serve it with a small static server.
2. Example:
   ```bash
   python -m http.server 8000
   ```
3. Visit http://127.0.0.1:8000/

## Next steps
- Add user sign-in and role-based access
- Connect the form to AWS Lambda and DynamoDB
- Add export to CSV/PDF
- Add filtering by date, company, and technician
