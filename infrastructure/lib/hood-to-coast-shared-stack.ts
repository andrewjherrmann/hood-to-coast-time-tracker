import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

/**
 * Account-global shared resources that must exist before any environment stack.
 * Deploy once with: npx cdk deploy HoodToCoastStack-shared
 * Never tear this down while env stacks are active.
 *
 * TODO: Migrate to a dedicated aws-account-bootstrap repo so this OIDC provider
 * can be shared across all projects in the account. See ENHANCEMENTS.md #8.
 */
export class HoodToCoastSharedStack extends cdk.Stack {
  public readonly githubOidcProvider: iam.IOpenIdConnectProvider;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // GitHub OIDC provider is account-global — only one can exist per account.
    // Owned here so it survives independent dev/prod stack deploys and teardowns.
    this.githubOidcProvider = new iam.OpenIdConnectProvider(this, 'GithubOidcProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });

    new cdk.CfnOutput(this, 'OidcProviderArn', {
      value: this.githubOidcProvider.openIdConnectProviderArn,
      description: 'GitHub Actions OIDC Provider ARN',
      exportName: 'HtcGithubOidcProviderArn',
    });
  }
}
