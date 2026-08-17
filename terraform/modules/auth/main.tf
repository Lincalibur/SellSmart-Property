resource "aws_cognito_user_pool" "this" {
  name = "${var.project_name}-${var.environment}"

  username_attributes     = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = true
  }

  mfa_configuration = var.cognito_mfa

  software_token_mfa_configuration {
    enabled = true
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }
}

resource "aws_cognito_user_pool_client" "web" {
  name         = "${var.project_name}-web"
  user_pool_id = aws_cognito_user_pool.this.id

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  generate_secret        = false
  prevent_user_existence_errors = "ENABLED"
}

# Role groups per MVP-SPEC.md #2. Admin and Service Provider require MFA
# regardless of the pool-wide default (see docs/Infrastructure-Hosting-Plan.md #4)
# -- enforced at the application layer during sign-in for now, since Cognito
# groups themselves don't carry per-group MFA policy.
resource "aws_cognito_user_group" "seller" {
  name         = "seller"
  user_pool_id = aws_cognito_user_pool.this.id
  description  = "Property sellers"
}

resource "aws_cognito_user_group" "buyer" {
  name         = "buyer"
  user_pool_id = aws_cognito_user_pool.this.id
  description  = "Property buyers"
}

resource "aws_cognito_user_group" "provider" {
  name         = "provider"
  user_pool_id = aws_cognito_user_pool.this.id
  description  = "Service providers (conveyancers, bond originators, etc.) -- MFA required at sign-in"
}

resource "aws_cognito_user_group" "admin" {
  name         = "admin"
  user_pool_id = aws_cognito_user_pool.this.id
  description  = "Back-office administrators -- MFA required at sign-in"
}
