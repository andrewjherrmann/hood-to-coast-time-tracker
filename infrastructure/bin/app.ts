#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { HoodToCoastStack } from '../lib/hood-to-coast-stack';
import { getEnvironmentConfig } from '../config/environments';

const app = new cdk.App();

// Get environment from command line argument or default to development
const targetEnvironment = process.argv[2] || 'development';
const config = getEnvironmentConfig(targetEnvironment);

console.log(`Deploying to environment: ${targetEnvironment}`);
console.log(`Domain: ${config.subdomain}.${config.domainName}`);
console.log(`Region: ${config.region}`);

new HoodToCoastStack(app, 'HoodToCoastStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: config.region 
  },
  domainName: config.domainName,
  subdomain: config.subdomain,
  environment: config.environment,
  description: config.description
});

// Add tags to all resources
cdk.Tags.of(app).add('Project', 'HoodToCoastTracker');
cdk.Tags.of(app).add('Environment', config.environment);
cdk.Tags.of(app).add('Team', config.teamName);
