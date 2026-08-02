#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { HoodToCoastStack } from '../lib/hood-to-coast-stack';
import { getEnvironmentConfig } from '../config/environments';

const app = new cdk.App();

// Get environment from env var or command line argument, default to development
const targetEnvironment = process.env.TARGET_ENVIRONMENT || process.argv[2] || 'development';
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

// Use environment-specific stack name so dev and prod can coexist as separate stacks
const stackName = `HoodToCoastStack-${targetEnvironment}`;

new HoodToCoastStack(app, stackName, {
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
