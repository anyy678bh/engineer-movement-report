import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const s3Client = new S3Client({});

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'OPTIONS,GET,POST',
};

function sanitizeFileName(fileName) {
  return String(fileName || 'profile').replace(/[^a-zA-Z0-9._-]/g, '_');
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ ok: true }),
    };
  }

  const path = event.path || event.rawPath || '';
  const tableName = process.env.USER_PROFILES_TABLE;
  const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
  const tenantId = event.queryStringParameters?.tenantId || body.tenantId || 'default';

  if (path.endsWith('/profile/image-upload')) {
    const userId = body.userId;
    const fileName = body.fileName || 'profile.jpg';
    const contentType = body.contentType || 'image/jpeg';
    const bucketName = process.env.PROFILE_IMAGES_BUCKET;

    if (!bucketName) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Profile image bucket not configured' }),
      };
    }

    if (!userId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Missing userId' }),
      };
    }

    const imageKey = `profiles/${tenantId}/${userId}/${Date.now()}-${sanitizeFileName(fileName)}`;
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: imageKey,
      ContentType: contentType,
    });

    try {
      const uploadUrl = await getSignedUrl(s3Client, uploadCommand, { expiresIn: 3600 });
      const imageUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${imageKey}`;

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ uploadUrl, imageUrl, imageKey }),
      };
    } catch (error) {
      console.error('Presigned URL generation failed', error);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Failed to generate presigned URL', error: error.message }),
      };
    }
  }

  if (path.endsWith('/profile/image-remove')) {
    const bucketName = process.env.PROFILE_IMAGES_BUCKET;
    const imageKey = body.imageKey;

    if (!bucketName || !imageKey) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Missing image key or bucket' }),
      };
    }

    try {
      await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: imageKey }));
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true }),
      };
    } catch (error) {
      console.error('Profile image remove failed', error);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Profile image removal failed' }),
      };
    }
  }

  if (event.httpMethod === 'GET') {
    const userId = event.queryStringParameters?.userId || body.userId;
    if (!userId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Missing userId' }),
      };
    }

    try {
      const result = await ddb.send(new GetCommand({ TableName: tableName, Key: { userId, tenantId } }));
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(result.Item || {}),
      };
    } catch (error) {
      console.error('Profile GET failed', error);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Profile lookup failed' }),
      };
    }
  }

  const item = {
    userId: body.userId || body.emailAddress || 'unknown@example.com',
    tenantId,
    fullName: body.fullName || '',
    department: body.department || '',
    idCardNumber: body.idCardNumber || '',
    emailAddress: body.emailAddress || body.email || '',
    profileImageUrl: body.profileImageUrl || '',
    profileImageKey: body.profileImageKey || '',
    createdAt: body.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await ddb.send(new PutCommand({ TableName: tableName, Item: item }));

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, item }),
    };
  } catch (error) {
    console.error('Profile save failed', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Profile save failed' }),
    };
  }
};
