const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  try {
    const { httpMethod, body, pathParameters, queryStringParameters } = event;
    
    switch (httpMethod) {
      case 'GET':
        if (pathParameters && pathParameters.year) {
          // Get data for specific year
          const yearData = await getYearData(parseInt(pathParameters.year));
          return formatResponse(200, yearData);
        } else {
          // Get all years
          const years = await getAllYears();
          return formatResponse(200, years);
        }
        
      case 'POST':
        const yearData = JSON.parse(body);
        const newYear = await createYear(yearData);
        return formatResponse(201, newYear);
        
      default:
        return formatResponse(405, { message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Years Lambda error:', error);
    return formatResponse(500, { message: 'Internal server error', error: error.message });
  }
};

async function getYearData(year) {
  const params = {
    TableName: process.env.YEARS_TABLE,
    KeyConditionExpression: '#year = :year',
    ExpressionAttributeNames: {
      '#year': 'year'
    },
    ExpressionAttributeValues: {
      ':year': year
    }
  };
  
  const result = await dynamodb.query(params).promise();
  
  // Get teams and legs for this year
  const teams = await getTeamsForYear(year);
  const legs = await getLegsForYear(year);
  const times = await getTimesForYear(year);
  
  return {
    year,
    teams: teams.Items || [],
    legs: legs.Items || [],
    times: times.Items || [],
    summary: generateYearSummary(teams.Items || [], legs.Items || [], times.Items || [])
  };
}

async function getAllYears() {
  const params = {
    TableName: process.env.YEARS_TABLE
  };
  
  const result = await dynamodb.scan(params).promise();
  return result.Items.sort((a, b) => b.year - a.year);
}

async function createYear(yearData) {
  const year = {
    year: yearData.year,
    teamId: yearData.teamId,
    teamName: yearData.teamName,
    totalDistance: yearData.totalDistance,
    totalEstimatedTime: yearData.totalEstimatedTime,
    totalActualTime: yearData.totalActualTime,
    startTime: yearData.startTime,
    finishTime: yearData.finishTime,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const params = {
    TableName: process.env.YEARS_TABLE,
    Item: year
  };
  
  await dynamodb.put(params).promise();
  return year;
}

async function getTeamsForYear(year) {
  const params = {
    TableName: process.env.TEAMS_TABLE,
    FilterExpression: '#year = :year',
    ExpressionAttributeNames: {
      '#year': 'year'
    },
    ExpressionAttributeValues: {
      ':year': year
    }
  };
  
  return await dynamodb.scan(params).promise();
}

async function getLegsForYear(year) {
  const params = {
    TableName: process.env.LEGS_TABLE,
    FilterExpression: '#year = :year',
    ExpressionAttributeNames: {
      '#year': 'year'
    },
    ExpressionAttributeValues: {
      ':year': year
    }
  };
  
  return await dynamodb.scan(params).promise();
}

async function getTimesForYear(year) {
  const params = {
    TableName: process.env.TIMES_TABLE,
    FilterExpression: '#year = :year',
    ExpressionAttributeNames: {
      '#year': 'year'
    },
    ExpressionAttributeValues: {
      ':year': year
    }
  };
  
  return await dynamodb.scan(params).promise();
}

function generateYearSummary(teams, legs, times) {
  if (teams.length === 0) return null;
  
  const totalDistance = legs.reduce((sum, leg) => sum + (leg.legLength || 0), 0);
  const totalEstimatedTime = legs.reduce((sum, leg) => sum + (leg.estimatedTime || 0), 0);
  const totalActualTime = times.reduce((sum, time) => sum + (time.actualTime || 0), 0);
  
  const completedLegs = times.length;
  const totalLegs = legs.length;
  const completionRate = totalLegs > 0 ? (completedLegs / totalLegs) * 100 : 0;
  
  return {
    totalDistance,
    totalEstimatedTime,
    totalActualTime,
    completedLegs,
    totalLegs,
    completionRate: Math.round(completionRate * 100) / 100
  };
}

function formatResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    },
    body: JSON.stringify(body)
  };
}
