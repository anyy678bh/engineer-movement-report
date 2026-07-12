import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'OPTIONS,GET,POST',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ ok: true }),
    };
  }

  const tableName = process.env.REPORTS_TABLE;
  const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
  const tenantId = body.tenantId || 'default';
  const reportId = body.reportId || crypto.randomUUID();

  const item = {
    pk: `tenant#${tenantId}`,
    sk: `report#${reportId}`,
    tenantId,
    reportId,
    userEmail: body.userEmail || 'unknown@example.com',
    companyName: body.companyName,
    location: body.location,
    transportType: body.transportType,
    machineType: body.machineType,
    serviceRendered: body.serviceRendered,
    createdAt: new Date().toISOString(),
  };

  await ddb.send(new PutCommand({ TableName: tableName, Item: item }));

  return {
    statusCode: 201,
    headers: corsHeaders,
    body: JSON.stringify({ success: true, item }),
  };
};
