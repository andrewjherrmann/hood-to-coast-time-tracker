# Pipeline Setup Guide

## 1. Create the OIDC Identity Provider in AWS

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

## 2. Create the IAM Deploy Role

Create a role with a trust policy scoped to your repo and branch:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/YOUR_REPO:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

**Key security point:** The `sub` condition restricts role assumption to pushes to `main` only. PRs from forks cannot assume this role.

## 3. Least-Privilege Permissions for the Role

The CDK stack automatically creates the deploy role with scoped permissions. If you need to create it manually, here's a properly scoped policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CDKBootstrap",
      "Effect": "Allow",
      "Action": ["sts:AssumeRole"],
      "Resource": "arn:aws:iam::ACCOUNT_ID:role/cdk-*"
    },
    {
      "Sid": "CloudFormation",
      "Effect": "Allow",
      "Action": [
        "cloudformation:DescribeStacks",
        "cloudformation:GetTemplate",
        "cloudformation:CreateChangeSet",
        "cloudformation:DescribeChangeSet",
        "cloudformation:ExecuteChangeSet",
        "cloudformation:DeleteChangeSet",
        "cloudformation:DescribeStackEvents"
      ],
      "Resource": "arn:aws:cloudformation:us-east-1:ACCOUNT_ID:stack/HoodToCoastStack/*"
    },
    {
      "Sid": "S3Deploy",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::ENVIRONMENT-hood-to-coast-website-ACCOUNT_ID",
        "arn:aws:s3:::ENVIRONMENT-hood-to-coast-website-ACCOUNT_ID/*"
      ]
    },
    {
      "Sid": "CloudFrontInvalidation",
      "Effect": "Allow",
      "Action": ["cloudfront:CreateInvalidation"],
      "Resource": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
    }
  ]
}
```

> Note: Replace ACCOUNT_ID, ENVIRONMENT, and DISTRIBUTION_ID with your actual values. The CDK stack handles this automatically via the `GithubActionsDeployRole` construct.

## 4. Configure GitHub Repository

### Secrets
| Name | Value |
|------|-------|
| `AWS_ROLE_ARN` | `arn:aws:iam::ACCOUNT_ID:role/github-actions-deploy` |

### Variables (per environment)
| Name | Value |
|------|-------|
| `AWS_REGION` | `us-east-1` |
| `DOMAIN_NAME` | `your-domain.com` (optional) |
| `SUBDOMAIN` | `htcapi.dev` (optional) |

## 5. Configure GitHub Environments

1. Go to **Settings → Environments**
2. Create `development` environment (no restrictions needed)
3. Create `production` environment with:
   - Required reviewers (at least 1)
   - Deployment branch rule: only `main`
   - Optional: wait timer (e.g., 5 minutes)

This ensures production deploys via `workflow_dispatch` require manual approval.

## 6. Branch Protection & Access Control

### Keep repo public but restrict write access

1. Go to **Settings → General** — keep visibility **Public**
2. Go to **Settings → Collaborators and teams**
   - Only add invited users/teams with Write or Maintain roles
   - Anyone can fork and read, but only collaborators can push or merge
3. Go to **Settings → Actions → General → Fork pull request workflows**
   - Select "Require approval for all outside collaborators"
   - This prevents fork PRs from running workflows (and accessing secrets) without maintainer approval

### Branch protection rules

Go to **Settings → Branches → Add rule** for each:

**`main` branch:**
- ✅ Require a pull request before merging
- ✅ Require approvals (at least 1)
- ✅ Require status checks to pass (select "Lint & Build" CI job)
- ✅ Require branches to be up to date before merging
- ✅ Restrict who can push to matching branches (only admins/deploy bot)
- ❌ Allow force pushes — disabled
- ❌ Allow deletions — disabled

**`development` branch:**
- ✅ Restrict who can push to matching branches (invited collaborators only)
- ❌ Allow force pushes — disabled
- ❌ Allow deletions — disabled

> Direct pushes (feature merges) to `development` trigger CI + deploy to dev.  
> Only PRs into `main` trigger production deploys after review.

## 6. Keeping Actions Up to Date

Actions are pinned to commit SHAs for security. To update:

1. Check the release page for the action
2. Find the full commit SHA for the new version tag
3. Update the SHA in the workflow file
4. Keep the version comment (e.g., `# v4.2.2`) for readability

Consider using [Dependabot](https://docs.github.com/en/code-security/dependabot) to automate this:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```
