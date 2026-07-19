import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
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
  const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
  const tenantId = body.tenantId || 'default';
  const reportId = body.reportId || crypto.randomUUID();
  const createdAt = body.createdAt || new Date().toISOString();

  const item = {
    pk: `tenant#${tenantId}`,
    sk: `report#${reportId}`,
    tenantId,
    reportId,
    userEmail: body.userEmail || 'unknown@example.com',
    date: body.date || createdAt,
    companyName: body.companyName || '',
    engineerName: body.engineerName || '',
    location: body.location || '',
    transportType: body.transportType || '',
    vehiclePlateNumber: body.vehiclePlateNumber || '',
    machineType: body.machineType || '',
    serviceRendered: body.serviceRendered || '',
    hoursSpent: body.hoursSpent ?? 0,
    otherEngineerNames: Array.isArray(body.otherEngineerNames) ? body.otherEngineerNames : [],
    createdAt,
  };

  const reportsCollection = await getMongoCollection('reports');
  if (reportsCollection) {
    await reportsCollection.updateOne(
      { tenantId, reportId },
      { $set: { ...item, _id: item.reportId } },
      { upsert: true }
    );
  } else {
    await ddb.send(new PutCommand({ TableName: tableName, Item: item }));
  }

  return {
    statusCode: 201,
    headers: corsHeaders,
    body: JSON.stringify({ success: true, item }),
  };
};