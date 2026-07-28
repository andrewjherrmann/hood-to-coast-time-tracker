# Hood to Coast Time Tracker

A mobile-friendly app for tracking Hood to Coast relay race times and historical records.

## Project Structure

This project is organized into two main directories:

- **`web-app/`** - The Quasar/Vue.js frontend application
- **`infrastructure/`** - AWS CDK infrastructure code

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- Yarn >= 1.22.0
- AWS CLI configured (for infrastructure deployment)

### Development

1. **Install all dependencies:**
   ```bash
   yarn install:all
   ```

2. **Start the development server:**
   ```bash
   yarn dev
   ```
   This will start the Quasar dev server at http://localhost:9000/

3. **Build the application:**
   ```bash
   yarn build
   ```

### Infrastructure

1. **Deploy infrastructure:**
   ```bash
   yarn deploy:infra
   ```

2. **Synthesize CDK:**
   ```bash
   yarn synth:infra
   ```

3. **Destroy infrastructure:**
   ```bash
   yarn destroy:infra
   ```

## Features

- Track relay race times and legs
- Historical data viewing
- Team management
- Mobile-friendly interface
- AWS-hosted backend with Lambda and DynamoDB

## License

[Add your license here]
