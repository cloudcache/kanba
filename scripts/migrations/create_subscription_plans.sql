-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  interval TEXT NOT NULL DEFAULT 'month' CHECK (interval IN ('month', 'year')),
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  project_limit INTEGER NOT NULL DEFAULT 1,
  task_limit INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_price ON subscription_plans(price);

-- Insert default plans
INSERT INTO subscription_plans (id, name, description, price, currency, interval, features, project_limit, task_limit, is_active)
VALUES 
  ('free', 'Free', 'Basic features for individuals', 0, 'usd', 'month', '["1 Project", "100 Tasks", "Basic Support"]'::jsonb, 1, 100, true),
  ('pro', 'Pro', 'Unlimited features for professionals', 4.90, 'usd', 'month', '["Unlimited Projects", "Unlimited Tasks", "Priority Support", "Advanced Analytics", "API Access"]'::jsonb, -1, -1, true)
ON CONFLICT (id) DO NOTHING;
