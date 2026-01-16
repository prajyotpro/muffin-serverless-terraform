terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
    archive = { source = "hashicorp/archive", version = "~> 2.0" }
  }
}

provider "aws" { region = "us-east-1" }

# --- 1. BUILD & ZIP ---
resource "null_resource" "build_lambda" {
  triggers = {
    src_hash = filemd5("${path.module}/src/index.ts")
    pkg_hash = filemd5("${path.module}/package.json")
  }
  provisioner "local-exec" {
    command = "npm install && npm run build"
    working_dir = path.module
  }
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/dist/index.js"
  output_path = "${path.module}/lambda_function.zip"
  depends_on  = [null_resource.build_lambda]
}

# --- 2. SQS QUEUE 
resource "aws_sqs_queue" "task_queue" {
  name                      = "my-task-queue"
  message_retention_seconds = 86400 # 1 day
  visibility_timeout_seconds = 30   # How long a worker has to finish before retry
}

# --- 3. IAM ROLE & PERMISSIONS ---
resource "aws_iam_role" "lambda_exec" {
  name = "sqs_lambda_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# Basic Logging Permission
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# SQS Permission (Allow Lambdas to Send and Receive)
resource "aws_iam_role_policy" "sqs_policy" {
  name = "lambda_sqs_policy"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.task_queue.arn
      }
    ]
  })
}

# --- 4. LAMBDA FUNCTIONS ---

# Function A: Authorizer
resource "aws_lambda_function" "authorizer" {
  function_name = "api-authorizer"
  filename      = data.archive_file.lambda_zip.output_path
  role          = aws_iam_role.lambda_exec.arn
  handler       = "index.authHandler"
  runtime       = "nodejs20.x"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
}

# Function B: PRODUCER (The API Handler)
resource "aws_lambda_function" "producer" {
  function_name = "producer-function"
  filename      = data.archive_file.lambda_zip.output_path
  role          = aws_iam_role.lambda_exec.arn
  handler       = "index.producerHandler"
  runtime       = "nodejs20.x"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  # We pass the Queue URL as an environment variable so code knows where to send
  environment {
    variables = {
      QUEUE_URL = aws_sqs_queue.task_queue.id
    }
  }
}

# Function C: CONSUMER (The Worker)
resource "aws_lambda_function" "consumer" {
  function_name = "consumer-function"
  filename      = data.archive_file.lambda_zip.output_path
  role          = aws_iam_role.lambda_exec.arn
  handler       = "index.consumerHandler"
  runtime       = "nodejs20.x"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
}

# --- 5. SQS TRIGGER (Connect Queue to Consumer) ---
# This makes AWS automatically invoke the consumer when data arrives
resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  event_source_arn = aws_sqs_queue.task_queue.arn
  function_name    = aws_lambda_function.consumer.arn
  batch_size       = 1 # Process 1 message at a time (Increase for batching)
}

# --- 6. API GATEWAY SETUP ---

resource "aws_api_gateway_rest_api" "edge_api" {
  name        = "async-api"
  endpoint_configuration { types = ["EDGE"] }
}

resource "aws_api_gateway_authorizer" "demo_auth" {
  name           = "demo-authorizer"
  rest_api_id    = aws_api_gateway_rest_api.edge_api.id
  authorizer_uri = aws_lambda_function.authorizer.invoke_arn
  identity_source = "method.request.header.Authorization"
  authorizer_result_ttl_in_seconds = 0
}

# Resource: /submit-job
resource "aws_api_gateway_resource" "job_resource" {
  rest_api_id = aws_api_gateway_rest_api.edge_api.id
  parent_id   = aws_api_gateway_rest_api.edge_api.root_resource_id
  path_part   = "submit-job"
}

resource "aws_api_gateway_method" "job_method" {
  rest_api_id   = aws_api_gateway_rest_api.edge_api.id
  resource_id   = aws_api_gateway_resource.job_resource.id
  http_method   = "POST"
  
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.demo_auth.id
}

resource "aws_api_gateway_integration" "job_integration" {
  rest_api_id = aws_api_gateway_rest_api.edge_api.id
  resource_id = aws_api_gateway_resource.job_resource.id
  http_method = aws_api_gateway_method.job_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.producer.invoke_arn
}

# --- 7. DEPLOYMENT & PERMISSIONS ---

resource "aws_lambda_permission" "api_gw_prod" {
  statement_id  = "AllowProducer"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.producer.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.edge_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gw_auth" {
  statement_id  = "AllowAuth"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.authorizer.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.edge_api.execution_arn}/*/*"
}

resource "aws_api_gateway_deployment" "deployment" {
  rest_api_id = aws_api_gateway_rest_api.edge_api.id
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_integration.job_integration.id,
      aws_api_gateway_authorizer.demo_auth.id
    ]))
  }
  lifecycle { create_before_destroy = true }
}

resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.deployment.id
  rest_api_id   = aws_api_gateway_rest_api.edge_api.id
  stage_name    = "prod"
}

# --- 8. OUTPUT ---
output "job_url" {
  value = "${aws_api_gateway_stage.prod.invoke_url}/submit-job"
}