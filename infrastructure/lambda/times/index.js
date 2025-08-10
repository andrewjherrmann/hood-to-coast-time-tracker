const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  try {
    const { httpMethod, body, pathParameters, queryStringParameters } = event;
    
    switch (httpMethod) {
      case 'GET':
        if (pathParameters && pathParameters.teamId) {
          // Get times for specific team
          const times = await getTeamTimes(pathParameters.teamId, queryStringParameters?.year);
          return formatResponse(200, times);
        } else {
          // Get all times
          const times = await getAllTimes();
          return formatResponse(200, times);
        }
        
      case 'POST':
        const timeData = JSON.parse(body);
        const newTime = await createTime(timeData);
        return formatResponse(201, newTime);
        
      case 'PUT':
        const updateData = JSON.parse(body);
        const updatedTime = await updateTime(pathParameters.teamId, pathParameters.timestamp, updateData);
        return formatResponse(200, updatedTime);
        
      default:
        return formatResponse(405, { message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Times Lambda error:', error);
    return formatResponse(500, { message: 'Internal server error', error: error.message });
  }
};

async function getTeamTimes(teamId, year) {
  const params = {
    TableName: process.env.TIMES_TABLE,
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
  return result.Items.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

async function getAllTimes() {
  const params = {
    TableName: process.env.TIMES_TABLE
  };
  
  const result = await dynamodb.scan(params).promise();
  return result.Items;
}

async function createTime(timeData) {
  const time = {
    teamId: timeData.teamId,
    timestamp: timeData.timestamp || new Date().toISOString(),
    year: timeData.year || new Date().getFullYear(),
    legNumber: timeData.legNumber,
    runnerName: timeData.runnerName,
    startTime: timeData.startTime,
    finishTime: timeData.finishTime,
    actualTime: timeData.actualTime, // in minutes
    pace: timeData.pace, // minutes per mile
    notes: timeData.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const params = {
    TableName: process.env.TIMES_TABLE,
    Item: time
  };
  
  await dynamodb.put(params).promise();
  return time;
}

async function updateTime(teamId, timestamp, updateData) {
  const updateExpression = [];
  const expressionAttributeValues = {};
  const expressionAttributeNames = {};
  
  Object.keys(updateData).forEach(key => {
    if (key !== 'teamId' && key !== 'timestamp') {
      updateExpression.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = updateData[key];
    }
  });
  
  updateExpression.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();
  
  const params = {
    TableName: process.env.TIMES_TABLE,
    Key: { 
      teamId: teamId,
      timestamp: timestamp
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
