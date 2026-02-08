# Muffin Serverless Terraform

A fully serverless, async message processing system built with AWS Lambda, API Gateway, and SQS, deployed via Terraform and TypeScript.

## 📋 Project Overview

This project implements an event-driven architecture where:
- **API Gateway** receives incoming webhook requests
- **Producer Lambda** validates requests and sends messages to SQS queues
- **Consumer Lambdas** process messages asynchronously from the queues
- **Authorization** via custom token-based authorizer

### Key Features
- ✅ Asynchronous message processing
- ✅ Token-based API authorization
- ✅ Dual SQS queue setup for flexible routing
- ✅ Auto-scaling Lambda workers
- ✅ Infrastructure as Code with Terraform
- ✅ Built with TypeScript for type safety

## 🏗️ Architecture
```
    ┌─────────────────┐
    │   API Gateway   │
    │   (/webhook)    │
    └────────┬────────┘
             │
    ┌────────▼────────┐
    │    Authorizer   │
    │(Token Validator)│
    └────────┬────────┘
             │
    ┌────────▼────────┐
    │ Producer Lambda │
    │  (API Handler)  │
    └────────┬────────┘
             │
    ┌────────┴────────────┐
    │                     │
┌───▼─────────┐     ┌─────▼──────┐
│ SQS Queue 1 │     │ SQS Queue 2 │
└───┬─────────┘     └─────┬──────┘
    │                     │
┌───▼───────────┐   ┌─────▼──────────┐
│  Consumer One │   │  Consumer Two  │
│(Worker Lambda)│   │ (Worker Lambda)│
└───────────────┘   └────────────────┘
```

## 📁 Project Structure
.
├── README.md # Project documentation
├── main.tf # Terraform infrastructure definition
├── package.json # Node.js dependencies & scripts
├── tsconfig.json # TypeScript configuration
├── src/
│ └── index.ts # Lambda handler functions (auth, producer, consumers)
├── dist/ # Compiled JavaScript (generated)
└── lambda_function.zip # Packaged Lambda code (generated)

# 🔧 Infrastructure Components

### 1. **SQS Queues**
- `my-task-queue-one`: Primary task queue
- `my-task-queue-two`: Secondary task queue
- Message retention: 1 day (86,400 seconds)
- Visibility timeout: 30 seconds

### 2. **Lambda Functions**

| Function | Handler | Purpose |
|----------|---------|---------|
| `api-authorizer` | `functions/auth.handler` | Validates incoming tokens |
| `producer-function` | `functions/producer.handler` | Receives webhooks, sends to SQS |
| `consumer-one-function` | `functions/consumerone.handler` | Processes Queue 1 messages |
| `consumer-two-function` | `functions/consumertwo.handler` | Processes Queue 2 messages |

### 3. **API Gateway**
- **Endpoint**: `https://{api-id}.execute-api.us-east-1.amazonaws.com/prod/webhook`
- **Method**: POST
- **Authorization**: Custom token-based authorizer
- **Authentication Header**: `Authorization: my-secret-token`

### 4. **IAM Permissions**
- Lambda execution role with SQS access
- CloudWatch Logs for debugging
- API Gateway invocation permissions

## 🚀 Getting Started

### Prerequisites
- Node.js 20.x or later
- Terraform 1.0+
- AWS Account with credentials configured
- AWS CLI

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd muffin-serverless-terraform
   ```

2. Install dependencies
   ```bash
   npm install
   npm install --save-dev @types/node
   ```

3. Build the project
   ```bash
   npm run build
   ```

4. Deploy with Terraform   
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```
   
## 💻 Development
Build
```bash
npm run build
```
Compiles TypeScript to JavaScript, bundles with esbuild, and minifies for Lambda.

Add Dependencies
```bash
npm install <package-name>
npm install --save-dev @types/<package-name>
```
TypeScript Configuration
The project uses strict TypeScript settings:
- Target: ES2020
- Module: CommonJS
- Strict mode: enabled
- Source maps: enabled for debugging

## 🌐 API Usage
Send a Message
```curl
curl -X POST https://{api-id}.execute-api.us-east-1.amazonaws.com/prod/webhook \
  -H "Authorization: my-secret-token" \
  -H "Content-Type: application/json" \
  -d '{"action": "process", "data": "example"}'
```
Response
```json
{
  "statusCode": 200,
  "body": "Message sent to queue"
}
```

## 🔐 Authorization
The API uses token-based authorization. The authorizer checks if the `Authorization` header matches `my-secret-token`.

To change the token:

1. Edit `index.ts` in the authHandler function
2. Change `my-secret-token` to your desired token
3. Run npm run build && terraform apply

## 🗑️ Cleanup
To destroy all AWS resources:
```bash
terraform destroy
```

## 📊 Monitoring
CloudWatch Logs are automatically created for all Lambda functions. View logs:
```bash
aws logs tail /aws/lambda/api-authorizer --follow
aws logs tail /aws/lambda/producer-function --follow
aws logs tail /aws/lambda/consumer-one-function --follow
aws logs tail /aws/lambda/consumer-two-function --follow
```

## 📦 Build & Deployment Pipeline
1. Source Code Change → index.ts
2. Trigger Build → `npm run build` (esbuild)
3. Create Archive → Lambda code zipped
4. Deploy → Terraform applies changes
5. Update Lambda Functions → New code deployed automatically


## 🛠️ Customization
Change Queue URLs
Edit the environment variables in `main.tf` under the producer function:
```bash
environment {
  variables = {
    QUEUE_ONE_URL = aws_sqs_queue.task_queue_one.id
    QUEUE_TWO_URL = aws_sqs_queue.task_queue_two.id
  }
}
```

Add More Consumers
1. Create a new consumer handler in `index.ts`
2. Add a new Lambda function in `main.tf`
3. Create an event source mapping in `main.tf`
4. Run `terraform apply`

Adjust SQS Settings

Modify message retention and visibility timeout in main.tf:
```bash
resource "aws_sqs_queue" "task_queue_one" {
  name                      = "my-task-queue-one"
  message_retention_seconds = 86400
  visibility_timeout_seconds = 30
}
```

## 📝 Environment Variables
Set these in main.tf for the producer function:

- `QUEUE_ONE_URL`: URL of the first SQS queue
- `QUEUE_TWO_URL`: URL of the second SQS queue

Access in code:
```
const queueUrl = process.env.QUEUE_ONE_URL;
```

## 🐛 Troubleshooting
"Cannot find name 'process'"
Install Node.js type definitions:

```bash
npm install --save-dev @types/node
```

Lambda timeout
Increase timeout in `main.tf`:
```
timeout = 60  # seconds
```

SQS permission denied
Verify IAM policy includes:

- `sqs:SendMessage`
- `sqs:ReceiveMessage`
- `sqs:DeleteMessage`

I don't have file editing tools enabled, so I can't directly edit the README.md file. However, here's the complete updated README content you should add:

```markdown
# Muffin Serverless Terraform

A fully serverless, async message processing system built with AWS Lambda, API Gateway, and SQS, deployed via Terraform and TypeScript.

## 📋 Project Overview

This project implements an event-driven architecture where:
- **API Gateway** receives incoming webhook requests
- **Producer Lambda** validates requests and sends messages to SQS queues
- **Consumer Lambdas** process messages asynchronously from the queues
- **Authorization** via custom token-based authorizer

### Key Features
- ✅ Asynchronous message processing
- ✅ Token-based API authorization
- ✅ Dual SQS queue setup for flexible routing
- ✅ Auto-scaling Lambda workers
- ✅ Infrastructure as Code with Terraform
- ✅ Built with TypeScript for type safety

## 🏗️ Architecture

```
┌─────────────────┐
│  API Gateway    │
│    (/webhook)   │
└────────┬────────┘
         │
    ┌────▼────────────────┐
    │   Authorizer        │
    │   (Token Validator) │
    └────┬───────────────┘
         │
    ┌────▼──────────────┐
    │  Producer Lambda  │
    │  (API Handler)    │
    └────┬──────────────┘
         │
    ┌────┴──────────────┬──────────────┐
    │                   │              │
┌───▼─────────┐  ┌─────▼──────┐      │
│ SQS Queue 1 │  │ SQS Queue 2 │      │
└───┬─────────┘  └─────┬──────┘      │
    │                  │             │
┌───▼──────────────┐ ┌─▼────────────┐
│ Consumer One     │ │ Consumer Two  │
│ (Worker Lambda)  │ │ (Worker Lmda) │
└──────────────────┘ └───────────────┘
```

## 📁 Project Structure

```
.
├── README.md               # Project documentation
├── main.tf                 # Terraform infrastructure definition
├── package.json            # Node.js dependencies & scripts
├── tsconfig.json           # TypeScript configuration
├── src/
│   └── index.ts           # Lambda handler functions (auth, producer, consumers)
├── dist/                  # Compiled JavaScript (generated)
└── lambda_function.zip    # Packaged Lambda code (generated)
```

## 🔧 Infrastructure Components

### 1. **SQS Queues**
- `my-task-queue-one`: Primary task queue
- `my-task-queue-two`: Secondary task queue
- Message retention: 1 day (86,400 seconds)
- Visibility timeout: 30 seconds

### 2. **Lambda Functions**

| Function | Handler | Purpose |
|----------|---------|---------|
| `api-authorizer` | `functions/auth.handler` | Validates incoming tokens |
| `producer-function` | `functions/producer.handler` | Receives webhooks, sends to SQS |
| `consumer-one-function` | `functions/consumerone.handler` | Processes Queue 1 messages |
| `consumer-two-function` | `functions/consumertwo.handler` | Processes Queue 2 messages |

### 3. **API Gateway**
- **Endpoint**: `https://{api-id}.execute-api.us-east-1.amazonaws.com/prod/webhook`
- **Method**: POST
- **Authorization**: Custom token-based authorizer
- **Authentication Header**: `Authorization: my-secret-token`

### 4. **IAM Permissions**
- Lambda execution role with SQS access
- CloudWatch Logs for debugging
- API Gateway invocation permissions

## 🚀 Getting Started

### Prerequisites
- Node.js 20.x or later
- Terraform 1.0+
- AWS Account with credentials configured
- AWS CLI

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd muffin-serverless-terraform
   ```

2. **Install dependencies**
   ```bash
   npm install
   npm install --save-dev @types/node
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Deploy with Terraform**
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

## 💻 Development

### Build
```bash
npm run build
```
Compiles TypeScript to JavaScript, bundles with esbuild, and minifies for Lambda.

### Add Dependencies
```bash
npm install <package-name>
npm install --save-dev @types/<package-name>
```

### TypeScript Configuration
The project uses strict TypeScript settings:
- Target: ES2020
- Module: CommonJS
- Strict mode: enabled
- Source maps: enabled for debugging

## 🌐 API Usage

### Send a Message
```bash
curl -X POST https://{api-id}.execute-api.us-east-1.amazonaws.com/prod/webhook \
  -H "Authorization: my-secret-token" \
  -H "Content-Type: application/json" \
  -d '{"action": "process", "data": "example"}'
```

### Response
```json
{
  "statusCode": 200,
  "body": "Message sent to queue"
}
```

## 🔐 Authorization

The API uses token-based authorization. The authorizer checks if the `Authorization` header matches `my-secret-token`.

**To change the token:**
1. Edit index.ts in the `authHandler` function
2. Change `'my-secret-token'` to your desired token
3. Run `npm run build && terraform apply`

## 🗑️ Cleanup

To destroy all AWS resources:
```bash
terraform destroy
```

## 📊 Monitoring

CloudWatch Logs are automatically created for all Lambda functions. View logs:
```bash
aws logs tail /aws/lambda/api-authorizer --follow
aws logs tail /aws/lambda/producer-function --follow
aws logs tail /aws/lambda/consumer-one-function --follow
aws logs tail /aws/lambda/consumer-two-function --follow
```

## 📦 Build & Deployment Pipeline

1. **Source Code Change** → index.ts
2. **Trigger Build** → `npm run build` (esbuild)
3. **Create Archive** → Lambda code zipped
4. **Deploy** → Terraform applies changes
5. **Update Lambda Functions** → New code deployed automatically

## 🛠️ Customization

### Change Queue URLs
Edit the environment variables in main.tf under the producer function:
```hcl
environment {
  variables = {
    QUEUE_ONE_URL = aws_sqs_queue.task_queue_one.id
    QUEUE_TWO_URL = aws_sqs_queue.task_queue_two.id
  }
}
```

### Add More Consumers
1. Create a new consumer handler in index.ts
2. Add a new Lambda function in main.tf
3. Create an event source mapping in main.tf
4. Run `terraform apply`

### Adjust SQS Settings
Modify message retention and visibility timeout in main.tf:
```hcl
resource "aws_sqs_queue" "task_queue_one" {
  name                      = "my-task-queue-one"
  message_retention_seconds = 86400
  visibility_timeout_seconds = 30
}
```

## 📝 Environment Variables

Set these in main.tf for the producer function:
- `QUEUE_ONE_URL`: URL of the first SQS queue
- `QUEUE_TWO_URL`: URL of the second SQS queue

Access in code:
```typescript
const queueUrl = process.env.QUEUE_ONE_URL;
```

## 🐛 Troubleshooting

### "Cannot find name 'process'"
Install Node.js type definitions:
```bash
npm install --save-dev @types/node
```

### Lambda timeout
Increase timeout in main.tf:
```hcl
timeout = 60  # seconds
```

### SQS permission denied
Verify IAM policy includes:
- `sqs:SendMessage`
- `sqs:ReceiveMessage`
- `sqs:DeleteMessage`

## 📚 References

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [AWS SQS Documentation](https://docs.aws.amazon.com/sqs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/)

## 📄 License

ISC

## 👤 Author

Prajyot Khandeparkar

---

**Status**: Production Ready | **Last Updated**: January 2026
