import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  const tableName = process.env.USER_PROFILES_TABLE;
  const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
  const tenantId = event.queryStringParameters?.tenantId || body.tenantId || 'default';

  if (event.httpMethod === 'GET') {
    const userId = event.queryStringParameters?.userId || body.userId;
    if (!userId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ message: 'Missing userId' }),
      };
    }

    try {
      const result = await ddb.send(new GetCommand({ TableName: tableName, Key: { userId, tenantId } }));
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(result.Item || {}),
      };
    } catch (error) {
      console.error('Profile GET failed', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ message: 'Profile lookup failed' }),
      };
    }
  }

  const item = {
    userId: body.userId,
    tenantId,
    fullName: body.fullName || '',
    department: body.department || '',
    idCardNumber: body.idCardNumber || '',
    emailAddress: body.emailAddress || body.email || '',
    createdAt: body.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await ddb.send(new PutCommand({ TableName: tableName, Item: item }));

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, item }),
    };
  } catch (error) {
    console.error('Profile save failed', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'Profile save failed' }),
    };
  }
};
