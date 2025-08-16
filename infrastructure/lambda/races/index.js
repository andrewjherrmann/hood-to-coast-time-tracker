const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Lambda function for races endpoint with full CRUD operations
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    const { httpMethod, pathParameters, body } = event;
    
    switch (httpMethod) {
      case 'GET':
        return await handleGet(event);
      case 'POST':
        return await handlePost(event);
      case 'PUT':
        return await handlePut(event);
      case 'DELETE':
        return await handleDelete(event);
      default:
        return {
          statusCode: 405,
          headers: getCorsHeaders(),
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: getCorsHeaders(),
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

// Helper function for CORS headers
function getCorsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  };
}

// GET - List all races or get specific race
async function handleGet(event) {
  const { pathParameters } = event;
  
  if (pathParameters && pathParameters.id) {
    // Get specific race
    const params = {
      TableName: process.env.RACES_TABLE_NAME,
      Key: { id: pathParameters.id }
    };
    
    const result = await dynamodb.get(params).promise();
    
    if (!result.Item) {
      return {
        statusCode: 404,
        headers: getCorsHeaders(),
        body: JSON.stringify({ error: 'Race not found' })
      };
    }
    
    return {
      statusCode: 200,
      headers: getCorsHeaders(),
      body: JSON.stringify({ race: result.Item })
    };
  } else {
    // List all races
    const params = {
      TableName: process.env.RACES_TABLE_NAME
    };
    
    const result = await dynamodb.scan(params).promise();
    
    return {
      statusCode: 200,
      headers: getCorsHeaders(),
      body: JSON.stringify({
        races: result.Items || [],
        count: result.Count || 0
      })
    };
  }
}

// POST - Create new race
async function handlePost(event) {
  const raceData = JSON.parse(event.body || '{}');
  
  // Generate unique ID if not provided
  if (!raceData.id) {
    raceData.id = `race_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Add timestamps
  raceData.createdAt = new Date().toISOString();
  raceData.updatedAt = new Date().toISOString();
  
  const params = {
    TableName: process.env.RACES_TABLE_NAME,
    Item: raceData
  };
  
  await dynamodb.put(params).promise();
  
  return {
    statusCode: 201,
    headers: getCorsHeaders(),
    body: JSON.stringify({
      message: 'Race created successfully',
      race: raceData
    })
  };
}

// PUT - Update existing race
async function handlePut(event) {
  const { pathParameters } = event;
  
  if (!pathParameters || !pathParameters.id) {
    return {
      statusCode: 400,
      headers: getCorsHeaders(),
      body: JSON.stringify({ error: 'Race ID is required' })
    };
  }
  
  const raceData = JSON.parse(event.body || '{}');
  raceData.id = pathParameters.id;
  raceData.updatedAt = new Date().toISOString();
  
  const params = {
    TableName: process.env.RACES_TABLE_NAME,
    Item: raceData
  };
  
  await dynamodb.put(params).promise();
  
  return {
    statusCode: 200,
    headers: getCorsHeaders(),
    body: JSON.stringify({
      message: 'Race updated successfully',
      race: raceData
    })
  };
}

// DELETE - Delete race
async function handleDelete(event) {
  const { pathParameters } = event;
  
  if (!pathParameters || !pathParameters.id) {
    return {
      statusCode: 400,
      headers: getCorsHeaders(),
      body: JSON.stringify({ error: 'Race ID is required' })
    };
  }
  
  const params = {
    TableName: process.env.RACES_TABLE_NAME,
    Key: { id: pathParameters.id }
  };
  
  await dynamodb.delete(params).promise();
  
  return {
    statusCode: 200,
    headers: getCorsHeaders(),
    body: JSON.stringify({
      message: 'Race deleted successfully',
      id: pathParameters.id
    })
  };
}
