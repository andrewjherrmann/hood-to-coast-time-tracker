# Planned Enhancements

Tracking planned improvements and features for the Hood to Coast Time Tracker.

---

## 1. Federated Authentication & Admin Management

**Priority:** High  
**Status:** Not Started

- Implement federated login via Google and Microsoft (no direct username/password)
- Build an admin management console for inviting users
- Runners can be marked as "admin" to grant invite/management privileges
- Remove or replace current auth placeholder with real identity provider integration

---

## 2. Runner Historical View

**Priority:** Medium  
**Status:** Not Started

- Add ability to view historical races, legs, and times per runner
- Runner profile page showing past performance across races
- Useful for tracking improvement over time

---

## 3. Race Detail View (Completed Races)

**Priority:** High  
**Status:** Not Started

- Clicking a race tile should navigate to a detail view
- Show legs, runners, times, and results for that race
- Currently no interaction on completed race tiles — need full drill-down

---

## 4. Mobile App Support

**Priority:** Medium  
**Status:** Research Needed

- Explore publishing to Android (Google Play) and Apple (App Store)
- Evaluate options: PWA, Capacitor (Quasar native), or React Native rewrite
- Quasar already supports Capacitor builds — likely the shortest path

---

## 5. Library & Security Updates

**Priority:** High  
**Status:** Ongoing

- Audit and update npm dependencies across all packages (web-app, infrastructure, lambdas)
- Address any known vulnerabilities
- Keep Quasar, Vue, CDK, and Lambda runtimes current

---

## 6. Pull Request Review Items

**Priority:** Medium  
**Status:** TODO — Review PRs for suggestions

- Review merged/open PR comments and suggestions
- Extract actionable items and add here
- *(Need to review GitHub PR history for specific items)*

---

## 7. Automated CI/CD Pipeline

**Priority:** High  
**Status:** Not Started

- **Development branch** → auto-deploy to dev environment
- **Main branch** → auto-deploy to production
- Seed production data from dev data
- Likely GitHub Actions or AWS CodePipeline
- Need to define environment separation in CDK stack

---

## Notes

- Items will be promoted to GitHub Issues once priorities and scope are solidified.
- This file is for early brainstorming and tracking.

---

## 8. Dedicated AWS Account Bootstrap Repo

**Priority:** Medium  
**Status:** Not Started

- Create a separate repo (e.g. `aws-account-bootstrap`) to own account-global AWS resources
- Move the GitHub Actions OIDC provider (`token.actions.githubusercontent.com`) out of this project's CDK stack and into the bootstrap repo
- Any future project in the same AWS account can reference the shared OIDC provider ARN rather than managing it themselves
- Also a good home for: shared IAM policies, budget alerts, account-wide SCPs, Cost Explorer tags
- Currently using a `HoodToCoastSharedStack` in this repo as a stopgap — migrate once bootstrap repo exists

