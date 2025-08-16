// Simple Lambda function for GET /races endpoint
// Returns static data (no DynamoDB integration yet)

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    const { httpMethod } = event;
    
    if (httpMethod === 'GET') {
      // Return the same static data as our MockIntegration
      const response = {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify({
          races: [
            {
              id: 'race_1',
              name: 'Hood to Coast 2024',
              year: 2024,
              location: 'Portland, OR',
              status: 'upcoming'
            },
            {
              id: 'race_2', 
              name: 'Hood to Coast 2023',
              year: 2023,
              location: 'Portland, OR',
              status: 'completed'
            }
          ],
          count: 2
        })
      };
      
      console.log('Response:', JSON.stringify(response, null, 2));
      return response;
    }
    
    // For now, only support GET method
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
