import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { MongoClient } from 'mongodb';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const mongoUri = process.env.MONGODB_URI;
let mongoClient = null;
let mongoDb = null;

async function getMongoCollection(collectionName) {
  if (!mongoUri) return null;
  if (!mongoClient) {
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    mongoDb = mongoClient.db(process.env.MONGODB_DB || 'engineer-movement-report');
  }
  return mongoDb.collection(collectionName);
}

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
  const tenantId = event.queryStringParameters?.tenantId || 'default';
  const limit = Number(event.queryStringParameters?.limit || 7);
  const startKey = event.queryStringParameters?.startKey || null;

  const reportsCollection = await getMongoCollection('reports');
  if (reportsCollection) {
    const items = await reportsCollection
      .find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    const normalizedItems = items.map((item) => ({ ...item, id: item.reportId || item._id?.toString?.() || item.id }));
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ items: normalizedItems, nextToken: null }),
    };
  }

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
    headers: corsHeaders,
    body: JSON.stringify({
      items: result.Items || [],
      nextToken: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : null,
    }),
  };
};
