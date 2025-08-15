#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { HoodToCoastStack } from '../lib/hood-to-coast-stack';
import { getEnvironmentConfig } from '../config/environments';
import { getLocalEnvironmentConfig } from '../config/local';

const app = new cdk.App();

// Get environment from command line argument or default to development
const targetEnvironment = process.argv[2] || 'development';
const baseConfig = getEnvironmentConfig(targetEnvironment);
const config = getLocalEnvironmentConfig(targetEnvironment);

console.log(`Deploying to environment: ${targetEnvironment}`);
console.log(`Region: ${config.region}`);
console.log(`Use Custom Domain: ${config.useCustomDomain}`);

new HoodToCoastStack(app, 'HoodToCoastStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: config.region 
  },
  domainName: config.domainName,
  subdomain: config.subdomain,
  region: config.region,
  environment: config.environment,
  useCustomDomain: config.useCustomDomain,
  mockMode: config.mockMode,
  generateEnvFile: config.generateEnvFile,
  description: config.description
});

// Add tags to all resources
cdk.Tags.of(app).add('Project', 'HoodToCoastTracker');
cdk.Tags.of(app).add('Environment', config.environment);
cdk.Tags.of(app).add('Team', config.teamName);
