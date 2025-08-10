const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  try {
    const { httpMethod, body, pathParameters } = event;
    
    switch (httpMethod) {
      case 'GET':
        if (pathParameters && pathParameters.teamId) {
          // Get specific team
          const team = await getTeam(pathParameters.teamId);
          return formatResponse(200, team);
        } else {
          // Get all teams
          const teams = await getAllTeams();
          return formatResponse(200, teams);
        }
        
      case 'POST':
        const teamData = JSON.parse(body);
        const newTeam = await createTeam(teamData);
        return formatResponse(201, newTeam);
        
      case 'PUT':
        const updateData = JSON.parse(body);
        const updatedTeam = await updateTeam(pathParameters.teamId, updateData);
        return formatResponse(200, updatedTeam);
        
      default:
        return formatResponse(405, { message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Teams Lambda error:', error);
    return formatResponse(500, { message: 'Internal server error', error: error.message });
  }
};

async function getTeam(teamId) {
  const params = {
    TableName: process.env.TEAMS_TABLE,
    Key: { teamId }
  };
  
  const result = await dynamodb.get(params).promise();
  return result.Item;
}

async function getAllTeams() {
  const params = {
    TableName: process.env.TEAMS_TABLE
  };
  
  const result = await dynamodb.scan(params).promise();
  return result.Items;
}

async function createTeam(teamData) {
  const team = {
    teamId: teamData.teamId || generateTeamId(),
    teamName: teamData.teamName,
    year: teamData.year || new Date().getFullYear(),
    startTime: teamData.startTime,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const params = {
    TableName: process.env.TEAMS_TABLE,
    Item: team
  };
  
  await dynamodb.put(params).promise();
  return team;
}

async function updateTeam(teamId, updateData) {
  const updateExpression = [];
  const expressionAttributeValues = {};
  const expressionAttributeNames = {};
  
  Object.keys(updateData).forEach(key => {
    if (key !== 'teamId') {
      updateExpression.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = updateData[key];
    }
  });
  
  updateExpression.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();
  
  const params = {
    TableName: process.env.TEAMS_TABLE,
    Key: { teamId },
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  };
  
  const result = await dynamodb.update(params).promise();
  return result.Attributes;
}

function generateTeamId() {
  return `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
