const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({ region: 'us-east-1' });
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Sample race data
const sampleRaces = [
  {
    id: 'race_1',
    name: 'Hood to Coast 2024',
    year: 2024,
    location: 'Portland, OR',
    status: 'upcoming',
    startDate: '2024-08-23',
    endDate: '2024-08-24',
    description: 'The 43rd annual Hood to Coast Relay',
    maxTeams: 1050,
    registrationOpen: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'race_2',
    name: 'Hood to Coast 2023',
    year: 2023,
    location: 'Portland, OR',
    status: 'completed',
    startDate: '2023-08-25',
    endDate: '2023-08-26',
    description: 'The 42nd annual Hood to Coast Relay',
    maxTeams: 1050,
    registrationOpen: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'race_3',
    name: 'Hood to Coast 2022',
    year: 2022,
    location: 'Portland, OR',
    status: 'completed',
    startDate: '2022-08-26',
    endDate: '2022-08-27',
    description: 'The 41st annual Hood to Coast Relay',
    maxTeams: 1050,
    registrationOpen: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

async function populateRaces() {
  console.log('Populating races table with sample data...');
  
  try {
    for (const race of sampleRaces) {
      const params = {
        TableName: 'development-htc-races',
        Item: race
      };
      
      console.log(`Adding race: ${race.name}`);
      await dynamodb.put(params).promise();
      console.log(`✓ Added race: ${race.name}`);
    }
    
    console.log('\n✅ Successfully populated races table!');
    
    // Verify the data was added
    const scanParams = {
      TableName: 'development-htc-races'
    };
    
    const result = await dynamodb.scan(scanParams).promise();
    console.log(`\n📊 Total races in table: ${result.Count}`);
    console.log('Races:', result.Items.map(r => ({ id: r.id, name: r.name, year: r.year, status: r.status })));
    
  } catch (error) {
    console.error('❌ Error populating races table:', error);
    process.exit(1);
  }
}

// Run the population script
populateRaces();
