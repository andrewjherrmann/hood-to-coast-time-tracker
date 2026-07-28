#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { HoodToCoastStack } from '../lib/hood-to-coast-stack';
import { getEnvironmentConfig } from '../config/environments';

const app = new cdk.App();

// Get environment from command line argument or default to development
const targetEnvironment = process.argv[2] || 'development';
const baseConfig = getEnvironmentConfig(targetEnvironment);

// Get domain configuration from context parameters
const domainName = app.node.tryGetContext('domainName');
const subdomain = app.node.tryGetContext('subdomain');
const useCustomDomain = domainName && subdomain; // Auto-detect if we should use custom domain

console.log(`Deploying to environment: ${targetEnvironment}`);
console.log(`Region: ${baseConfig.region}`);
console.log(`Use Custom Domain: ${useCustomDomain}`);
if (useCustomDomain) {
  console.log(`Domain: ${subdomain}.${domainName}`);
}

new HoodToCoastStack(app, 'HoodToCoastStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: baseConfig.region 
  },
  domainName: domainName,
  subdomain: subdomain,
  region: baseConfig.region,
  environment: baseConfig.environment,
  useCustomDomain: useCustomDomain,
  mockMode: baseConfig.mockMode,
  generateEnvFile: baseConfig.generateEnvFile,
  description: baseConfig.description
});

// Add tags to all resources
cdk.Tags.of(app).add('Project', 'HoodToCoastTracker');
cdk.Tags.of(app).add('Environment', baseConfig.environment);
