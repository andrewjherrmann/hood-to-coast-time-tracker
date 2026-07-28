const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, ScanCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

// Allowed origins for CORS - must match API Gateway configuration
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:9000,http://localhost:3000').split(',');

// Maximum request body size (10KB)
const MAX_BODY_SIZE = 10240;

// Allowed fields for race data
const ALLOWED_RACE_FIELDS = ['name', 'year', 'location', 'description', 'status', 'startDate', 'endDate', 'maxTeams', 'registrationOpen'];

// Lambda function for races endpoint with full CRUD operations
exports.handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || '';

  try {
    const { httpMethod } = event;

    switch (httpMethod) {
      case 'GET':
        return await handleGet(event, origin);
      case 'POST':
        return await handlePost(event, origin);
      case 'PUT':
        return await handlePut(event, origin);
      case 'DELETE':
        return await handleDelete(event, origin);
      default:
        return {
          statusCode: 405,
          headers: getCorsHeaders(origin),
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

  } catch (error) {
    console.error('Error:', error.message);
    return {
      statusCode: 500,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

// Helper function for CORS headers - only allows configured origins
function getCorsHeaders(origin) {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  };
}

// Validate and sanitize race input data
function validateRaceData(data, isUpdate = false) {
  const errors = [];

  if (!isUpdate && !data.name) {
    errors.push('name is required');
  }
  if (data.name && (typeof data.name !== 'string' || data.name.length > 200)) {
    errors.push('name must be a string with max 200 characters');
  }
  if (data.year !== undefined && (typeof data.year !== 'number' || data.year < 1980 || data.year > 2100)) {
    errors.push('year must be a number between 1980 and 2100');
  }
  if (data.location && (typeof data.location !== 'string' || data.location.length > 200)) {
    errors.push('location must be a string with max 200 characters');
  }
  if (data.description && (typeof data.description !== 'string' || data.description.length > 1000)) {
    errors.push('description must be a string with max 1000 characters');
  }
  if (data.status && !['upcoming', 'active', 'completed', 'cancelled'].includes(data.status)) {
    errors.push('status must be one of: upcoming, active, completed, cancelled');
  }

  return errors;
}

// Strip unknown fields from input
function sanitizeRaceData(data) {
  const sanitized = {};
  for (const field of ALLOWED_RACE_FIELDS) {
    if (data[field] !== undefined) {
      sanitized[field] = data[field];
    }
  }
  return sanitized;
}

// Parse and validate request body
function parseBody(event) {
  if (!event.body) {
    return { error: 'Request body is required' };
  }
  if (event.body.length > MAX_BODY_SIZE) {
    return { error: 'Request body too large' };
  }
  try {
    return { data: JSON.parse(event.body) };
  } catch {
    return { error: 'Invalid JSON in request body' };
  }
}

// GET - List all races or get specific race
async function handleGet(event, origin) {
  const { pathParameters } = event;

  if (pathParameters && pathParameters.id) {
    const result = await dynamodb.send(new GetCommand({
      TableName: process.env.RACES_TABLE_NAME,
      Key: { id: pathParameters.id }
    }));

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: getCorsHeaders(origin),
        body: JSON.stringify({ error: 'Race not found' })
      };
    }

    return {
      statusCode: 200,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({ race: result.Item })
    };
  } else {
    // List races with pagination (default limit 50)
    const limit = Math.min(parseInt(event.queryStringParameters?.limit) || 50, 100);
    const scanParams = {
      TableName: process.env.RACES_TABLE_NAME,
      Limit: limit,
    };

    if (event.queryStringParameters?.nextToken) {
      scanParams.ExclusiveStartKey = JSON.parse(
        Buffer.from(event.queryStringParameters.nextToken, 'base64').toString()
      );
    }

    const result = await dynamodb.send(new ScanCommand(scanParams));

    const response = {
      races: result.Items || [],
      count: result.Count || 0,
    };

    if (result.LastEvaluatedKey) {
      response.nextToken = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
    }

    return {
      statusCode: 200,
      headers: getCorsHeaders(origin),
      body: JSON.stringify(response)
    };
  }
}

// POST - Create new race
async function handlePost(event, origin) {
  const { data, error } = parseBody(event);
  if (error) {
    return {
      statusCode: 400,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({ error })
    };
  }

  const validationErrors = validateRaceData(data);
  if (validationErrors.length > 0) {
    return {
      statusCode: 400,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({ error: 'Validation failed', details: validationErrors })
    };
  }

  const raceData = sanitizeRaceData(data);
  raceData.id = `race_${crypto.randomUUID()}`;
  raceData.createdAt = new Date().toISOString();
  raceData.updatedAt = new Date().toISOString();

  await dynamodb.send(new PutCommand({
    TableName: process.env.RACES_TABLE_NAME,
    Item: raceData
  }));

  return {
    statusCode: 201,
    headers: getCorsHeaders(origin),
    body: JSON.stringify({
      message: 'Race created successfully',
      race: raceData
    })
  };
}

// PUT - Update existing race
async function handlePut(event, origin) {
  const { pathParameters } = event;

  if (!pathParameters || !pathParameters.id) {
    return {
      statusCode: 400,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({ error: 'Race ID is required' })
    };
  }

  const { data, error } = parseBody(event);
  if (error) {
    return {
      statusCode: 400,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({ error })
    };
  }

  const validationErrors = validateRaceData(data, true);
  if (validationErrors.length > 0) {
    return {
      statusCode: 400,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({ error: 'Validation failed', details: validationErrors })
    };
  }

  // Fetch existing item to preserve fields not in the update
  const existing = await dynamodb.send(new GetCommand({
    TableName: process.env.RACES_TABLE_NAME,
    Key: { id: pathParameters.id }
  }));

  if (!existing.Item) {
    return {
      statusCode: 404,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({ error: 'Race not found' })
    };
  }

  const updatedData = {
    ...existing.Item,
    ...sanitizeRaceData(data),
    id: pathParameters.id,
    createdAt: existing.Item.createdAt,
    updatedAt: new Date().toISOString()
  };

  await dynamodb.send(new PutCommand({
    TableName: process.env.RACES_TABLE_NAME,
    Item: updatedData
  }));

  return {
    statusCode: 200,
    headers: getCorsHeaders(origin),
    body: JSON.stringify({
      message: 'Race updated successfully',
      race: updatedData
    })
  };
}

// DELETE - Delete race
async function handleDelete(event, origin) {
  const { pathParameters } = event;

  if (!pathParameters || !pathParameters.id) {
    return {
      statusCode: 400,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({ error: 'Race ID is required' })
    };
  }

  await dynamodb.send(new DeleteCommand({
    TableName: process.env.RACES_TABLE_NAME,
    Key: { id: pathParameters.id }
  }));

  return {
    statusCode: 200,
    headers: getCorsHeaders(origin),
    body: JSON.stringify({
      message: 'Race deleted successfully',
      id: pathParameters.id
    })
  };
}
