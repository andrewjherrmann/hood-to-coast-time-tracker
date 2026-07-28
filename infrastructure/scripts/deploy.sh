#!/bin/bash

# Deployment script for Hood to Coast Time Tracker
# Usage: ./deploy.sh [environment] [action]
# Environment: development, production
# Action: deploy, destroy, diff, synth (default: deploy)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${1:-development}
ACTION=${2:-deploy}

# Validate environment
VALID_ENVIRONMENTS=("development" "production")
if [[ ! " ${VALID_ENVIRONMENTS[@]} " =~ " ${ENVIRONMENT} " ]]; then
    echo -e "${RED}Error: Invalid environment '${ENVIRONMENT}'${NC}"
    echo "Valid environments: ${VALID_ENVIRONMENTS[*]}"
    exit 1
fi

# Validate action
VALID_ACTIONS=("deploy" "destroy" "diff" "synth")
if [[ ! " ${VALID_ACTIONS[@]} " =~ " ${ACTION} " ]]; then
    echo -e "${RED}Error: Invalid action '${ACTION}'${NC}"
    echo "Valid actions: ${VALID_ACTIONS[*]}"
    exit 1
fi

echo -e "${BLUE}=== Hood to Coast Time Tracker Deployment ===${NC}"
echo -e "${YELLOW}Environment:${NC} ${ENVIRONMENT}"
echo -e "${YELLOW}Action:${NC} ${ACTION}"
echo -e "${YELLOW}Region:${NC} $(node -e "console.log(require('./config/environments').environments['${ENVIRONMENT}'].region)")"
echo -e "${YELLOW}Domain:${NC} $(node -e "console.log(require('./config/environments').environments['${ENVIRONMENT}'].subdomain + '.' + require('./config/environments').environments['${ENVIRONMENT}'].domainName)")"
echo ""

# Check if we're about to destroy production
if [[ "$ENVIRONMENT" == "production" && "$ACTION" == "destroy" ]]; then
    echo -e "${RED}⚠️  WARNING: You are about to DESTROY the PRODUCTION environment! ⚠️${NC}"
    read -p "Are you absolutely sure? Type 'yes' to confirm: " confirmation
    if [[ "$confirmation" != "yes" ]]; then
        echo -e "${YELLOW}Deployment cancelled.${NC}"
        exit 0
    fi
fi

# Build the project
echo -e "${BLUE}Building project...${NC}"
yarn build

# Execute the CDK command
echo -e "${BLUE}Executing CDK ${ACTION}...${NC}"
case $ACTION in
    "deploy")
        yarn cdk deploy -- --require-approval never
        ;;
    "destroy")
        yarn cdk destroy -- --force
        ;;
    "diff")
        yarn cdk diff
        ;;
    "synth")
        yarn cdk synth
        ;;
esac

echo -e "${GREEN}✅ ${ACTION} completed successfully for ${ENVIRONMENT} environment!${NC}"
