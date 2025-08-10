const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  try {
    const { httpMethod, body, pathParameters, queryStringParameters } = event;
    
    switch (httpMethod) {
      case 'GET':
        if (pathParameters && pathParameters.teamId) {
          // Get legs for specific team
          const legs = await getTeamLegs(pathParameters.teamId, queryStringParameters?.year);
          return formatResponse(200, legs);
        } else {
          // Get all legs
          const legs = await getAllLegs();
          return formatResponse(200, legs);
        }
        
      case 'POST':
        const legData = JSON.parse(body);
        const newLeg = await createLeg(legData);
        return formatResponse(201, newLeg);
        
      case 'PUT':
        const updateData = JSON.parse(body);
        const updatedLeg = await updateLeg(pathParameters.teamId, pathParameters.legNumber, updateData);
        return formatResponse(200, updatedLeg);
        
      default:
        return formatResponse(405, { message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Legs Lambda error:', error);
    return formatResponse(500, { message: 'Internal server error', error: error.message });
  }
};

async function getTeamLegs(teamId, year) {
  const params = {
    TableName: process.env.LEGS_TABLE,
    KeyConditionExpression: 'teamId = :teamId',
    ExpressionAttributeValues: {
      ':teamId': teamId
    }
  };
  
  if (year) {
    params.FilterExpression = '#year = :year';
    params.ExpressionAttributeNames = { '#year': 'year' };
    params.ExpressionAttributeValues[':year'] = parseInt(year);
  }
  
  const result = await dynamodb.query(params).promise();
  return result.Items.sort((a, b) => a.legNumber - b.legNumber);
}

async function getAllLegs() {
  const params = {
    TableName: process.env.LEGS_TABLE
  };
  
  const result = await dynamodb.scan(params).promise();
  return result.Items;
}

async function createLeg(legData) {
  const leg = {
    teamId: legData.teamId,
    legNumber: legData.legNumber,
    year: legData.year || new Date().getFullYear(),
    runnerName: legData.runnerName,
    legLength: legData.legLength, // in miles
    difficulty: legData.difficulty, // E, M, H, VH
    estimatedPace: legData.estimatedPace, // minutes per mile
    estimatedTime: legData.estimatedTime, // in minutes
    actualStartTime: legData.actualStartTime,
    actualFinishTime: legData.actualFinishTime,
    actualTime: legData.actualTime, // in minutes
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const params = {
    TableName: process.env.LEGS_TABLE,
    Item: leg
  };
  
  await dynamodb.put(params).promise();
  return leg;
}

async function updateLeg(teamId, legNumber, updateData) {
  const updateExpression = [];
  const expressionAttributeValues = {};
  const expressionAttributeNames = {};
  
  Object.keys(updateData).forEach(key => {
    if (key !== 'teamId' && key !== 'legNumber') {
      updateExpression.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = updateData[key];
    }
  });
  
  updateExpression.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();
  
  const params = {
    TableName: process.env.LEGS_TABLE,
    Key: { 
      teamId: teamId,
      legNumber: parseInt(legNumber)
    },
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  };
  
  const result = await dynamodb.update(params).promise();
  return result.Attributes;
}

function formatResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    },
    body: JSON.stringify(body)
  };
}
