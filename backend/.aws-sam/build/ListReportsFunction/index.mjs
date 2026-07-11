import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  const tableName = process.env.REPORTS_TABLE;
  const tenantId = event.queryStringParameters?.tenantId || 'default';
  const limit = Number(event.queryStringParameters?.limit || 7);
  const startKey = event.queryStringParameters?.startKey || null;

  const params = {
    TableName: tableName,
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: {
      ':pk': `tenant#${tenantId}`,
    },
    ScanIndexForward: false,
    Limit: limit,
  };

  if (startKey) {
    params.ExclusiveStartKey = JSON.parse(Buffer.from(startKey, 'base64').toString('utf8'));
  }

  const result = await ddb.send(new QueryCommand(params));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: result.Items || [],
      nextToken: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : null,
    }),
  };
};
