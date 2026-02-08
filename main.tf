terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
    archive = { source = "hashicorp/archive", version = "~> 2.0" }
  }
}

provider "aws" {
  region = "us-east-1"
}

# ---------------------------------------------------------------------------
# 1. TypeScript Build & Zip (Unchanged)
# ---------------------------------------------------------------------------

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

# ---------------------------------------------------------------------------
# 2. IAM Role (Shared by all 3 functions)
# ---------------------------------------------------------------------------

resource "aws_iam_role" "lambda_exec" {
  name = "edge_lambda_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_policy" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# ---------------------------------------------------------------------------
# 3. Lambda Functions (Split into 3)
# ---------------------------------------------------------------------------
# Secure Function
resource "aws_lambda_function" "secure_hello" {
  function_name = "secure-hello"
  filename      = data.archive_file.lambda_zip.output_path
  role          = aws_iam_role.lambda_exec.arn
  handler       = "index.secureHandler" # Looks for secureHandler export
  runtime       = "nodejs20.x"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
}

# Authorizer Function
resource "aws_lambda_function" "authorizer" {
  function_name = "api-authorizer"
  filename      = data.archive_file.lambda_zip.output_path
  role          = aws_iam_role.lambda_exec.arn
  handler       = "functions/auth.handler"
  runtime       = "nodejs20.x"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
}

# ---------------------------------------------------------------------------
# 4. Edge-Optimized REST API Gateway
# ---------------------------------------------------------------------------

resource "aws_api_gateway_rest_api" "edge_api" {
  name        = "edge-optimized-api"
  description = "This API uses CloudFront edge locations"
  endpoint_configuration { types = ["EDGE"] }
}

# --- The Authorizer Definition ---
resource "aws_api_gateway_authorizer" "demo_auth" {
  name           = "demo-authorizer"
  rest_api_id    = aws_api_gateway_rest_api.edge_api.id
  authorizer_uri = aws_lambda_function.authorizer.invoke_arn
  
  # API Gateway will cache the result based on this header
  identity_source = "method.request.header.Authorization"
  
  # TTL (Time to Live) for cache in seconds (0 = disable caching)
  authorizer_result_ttl_in_seconds = 0
}

# --- Route 1: /hello (Public) ---
resource "aws_api_gateway_resource" "hello_resource" {
  rest_api_id = aws_api_gateway_rest_api.edge_api.id
  parent_id   = aws_api_gateway_rest_api.edge_api.root_resource_id
  path_part   = "hello"
}

resource "aws_api_gateway_method" "hello_method" {
  rest_api_id   = aws_api_gateway_rest_api.edge_api.id
  resource_id   = aws_api_gateway_resource.hello_resource.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "hello_integration" {
  rest_api_id = aws_api_gateway_rest_api.edge_api.id
  resource_id = aws_api_gateway_resource.hello_resource.id
  http_method = aws_api_gateway_method.hello_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.public_hello.invoke_arn
}

# --- Route 2: /secure-hello (Protected) ---
resource "aws_api_gateway_resource" "secure_resource" {
  rest_api_id = aws_api_gateway_rest_api.edge_api.id
  parent_id   = aws_api_gateway_rest_api.edge_api.root_resource_id
  path_part   = "secure-hello"
}

resource "aws_api_gateway_method" "secure_method" {
  rest_api_id   = aws_api_gateway_rest_api.edge_api.id
  resource_id   = aws_api_gateway_resource.secure_resource.id
  http_method   = "GET"
  
  # Attach the Authorizer here
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.demo_auth.id
}

resource "aws_api_gateway_integration" "secure_integration" {
  rest_api_id = aws_api_gateway_rest_api.edge_api.id
  resource_id = aws_api_gateway_resource.secure_resource.id
  http_method = aws_api_gateway_method.secure_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.secure_hello.invoke_arn
}

# ---------------------------------------------------------------------------
# 5. Deployment & Stage
# ---------------------------------------------------------------------------

resource "aws_api_gateway_deployment" "deployment" {
  rest_api_id = aws_api_gateway_rest_api.edge_api.id

  # IMPORTANT: Update trigger to watch ALL new resources
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.hello_resource.id,
      aws_api_gateway_method.hello_method.id,
      aws_api_gateway_integration.hello_integration.id,
      aws_api_gateway_resource.secure_resource.id,
      aws_api_gateway_method.secure_method.id,
      aws_api_gateway_integration.secure_integration.id,
      aws_api_gateway_authorizer.demo_auth.id
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.deployment.id
  rest_api_id   = aws_api_gateway_rest_api.edge_api.id
  stage_name    = "prod"
}

# ---------------------------------------------------------------------------
# 6. Permissions (Allow API Gateway to Invoke Lambdas)
# ---------------------------------------------------------------------------
resource "aws_lambda_permission" "allow_secure" {
  statement_id  = "AllowSecure"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.secure_hello.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.edge_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "allow_authorizer" {
  statement_id  = "AllowAuthorizer"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.authorizer.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.edge_api.execution_arn}/*/*"
}

# ---------------------------------------------------------------------------
# 7. Outputs
# ---------------------------------------------------------------------------

output "public_url" {
  value = "${aws_api_gateway_stage.prod.invoke_url}/hello"
}

output "secure_url" {
  value = "${aws_api_gateway_stage.prod.invoke_url}/secure-hello"
}