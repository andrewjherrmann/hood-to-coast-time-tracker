# Hood to Coast Time Tracker - Backend Infrastructure

This document describes the backend infrastructure for the Hood to Coast Time Tracker application, built using AWS CDK.

## 🏗️ Architecture Overview

The backend consists of:
- **API Gateway**: RESTful API with API key authentication
- **DynamoDB**: NoSQL database for storing race, team, runner, and leg data
- **Lambda Functions**: Serverless compute for API endpoints (when implemented)
- **Route53**: DNS management for custom domains
- **ACM**: SSL certificates for HTTPS

## 🌐 API Endpoints

### Base URLs
- **Development**: `https://htcapi.dev.your-domain.com` (configure for your domain)
- **Production**: `https://htcapi.your-domain.com` (configure for your domain)

### Authentication
All API endpoints require an API key passed in the `X-Api-Key` header.

### Available Endpoints

#### Races
- `GET /races` - List all races
- `POST /races` - Create a new race

#### Teams
- `GET /teams` - List all teams
- `POST /teams` - Create a new team

#### Runners
- `GET /runners` - List all runners
- `POST /runners` - Create a new runner

#### Legs
- `GET /legs` - List all legs
- `POST /legs` - Create a new leg

## 📊 Data Models

### Race
```json
{
  "id": "string",
  "name": "string",
  "year": "number",
  "location": "string",
  "description": "string",
  "status": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

### Team
```json
{
  "id": "string",
  "name": "string",
  "raceId": "string",
  "captainName": "string",
  "captainEmail": "string",
  "division": "string",
  "status": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

### Runner
```json
{
  "id": "string",
  "name": "string",
  "teamId": "string",
  "raceId": "string",
  "email": "string",
  "experience": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

### Leg
```json
{
  "id": "string",
  "name": "string",
  "raceId": "string",
  "teamId": "string",
  "runnerId": "string",
  "legNumber": "number",
  "distance": "number",
  "difficulty": "string",
  "status": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

## 🚀 Deployment

### Prerequisites
- AWS CLI configured with appropriate permissions
- Node.js and Yarn installed
- CDK CLI installed globally

### Configuration
Before deploying, configure your domain settings in the deployment scripts:
- Update `$DomainName` and `$Subdomain` variables in the PowerShell scripts
- Or pass them as CDK context parameters

### Deploy Backend Only
```powershell
.\scripts\deploy-backend.ps1 -Environment development -Region us-east-1
```

### Deploy Everything
```powershell
.\scripts\deploy-complete.ps1 -Environment development -Region us-east-1
```

## 🧪 Testing

### Test API Endpoints
Use the test script with your actual API URL and key:

```powershell
.\scripts\test-api.ps1 -ApiUrl "https://htcapi.dev.your-domain.com" -ApiKey "your-api-key-here"
```

### Manual Testing
Test endpoints using curl or any HTTP client:

```bash
# Get races
curl -H "X-Api-Key: your-api-key" \
     https://htcapi.dev.your-domain.com/races

# Create a race
curl -X POST \
     -H "X-Api-Key: your-api-key" \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Race","year":2025}' \
     https://htcapi.dev.your-domain.com/races
```

## 🔑 API Key Management

### Get API Key ID
```bash
aws ssm get-parameter --name "/development/htc/api-key-id" --region us-east-1
```

### Get API Key Value
```bash
aws apigateway get-api-key --api-key YOUR_KEY_ID --include-value --region us-east-1
```

### Create New API Key
```bash
aws apigateway create-api-key --name "new-api-key" --description "New API key"
```

## 📈 Monitoring

### CloudWatch Logs
- API Gateway access logs
- Lambda function logs (when implemented)

### CloudWatch Metrics
- API Gateway request count and latency
- DynamoDB read/write capacity and throttling

## 🔒 Security

### API Key Authentication
- All endpoints require a valid API key
- Keys are associated with usage plans for rate limiting

### CORS Configuration
- Configured to allow requests from frontend domains
- Supports preflight OPTIONS requests

### Rate Limiting
- Default: 100 requests per second, 200 burst
- Configurable through usage plans

## 🛠️ Troubleshooting

### Common Issues

#### 403 Forbidden
- Check if API key is valid and included in `X-Api-Key` header
- Verify API key is associated with usage plan
- Check if usage plan is associated with API stage

#### 500 Internal Server Error
- Check CloudWatch logs for Lambda function errors
- Verify DynamoDB table permissions
- Check API Gateway integration configuration

### Debugging Steps
1. Check API Gateway method configuration
2. Verify usage plan associations
3. Test API key validity
4. Check CloudWatch logs
5. Verify DynamoDB table status

## 🔮 Future Enhancements

### Planned Features
- [ ] Full CRUD operations for all resources
- [ ] Lambda function integration
- [ ] User authentication with Cognito
- [ ] Real-time updates with WebSockets
- [ ] Advanced querying and filtering
- [ ] Bulk operations
- [ ] Data validation and sanitization
- [ ] Request/response compression
- [ ] API versioning
- [ ] Advanced monitoring and alerting

### Performance Optimizations
- [ ] DynamoDB query optimization
- [ ] Lambda function optimization
- [ ] API Gateway caching
- [ ] CDN integration

## 📚 Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [API Gateway Developer Guide](https://docs.aws.amazon.com/apigateway/)
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/dynamodb/)
- [Lambda Developer Guide](https://docs.aws.amazon.com/lambda/)
