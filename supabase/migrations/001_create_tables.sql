-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    twitter_id VARCHAR(50) UNIQUE,
    twitter_username VARCHAR(50),
    plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'premium', 'enterprise')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户关注表
CREATE TABLE user_following (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    twitter_user_id VARCHAR(50) NOT NULL,
    twitter_username VARCHAR(50) NOT NULL,
    display_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, twitter_user_id)
);

-- 每日摘要表
CREATE TABLE daily_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    summary_date DATE NOT NULL,
    sentiment_distribution JSONB,
    total_tweets INTEGER DEFAULT 0,
    positive_count INTEGER DEFAULT 0,
    negative_count INTEGER DEFAULT 0,
    neutral_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, summary_date)
);

-- 推文分析表
CREATE TABLE tweet_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    summary_id UUID NOT NULL REFERENCES daily_summaries(id) ON DELETE CASCADE,
    tweet_id VARCHAR(50) UNIQUE NOT NULL,
    author_username VARCHAR(50) NOT NULL,
    tweet_content TEXT NOT NULL,
    retweet_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    engagement_score FLOAT DEFAULT 0,
    sentiment_analysis JSONB,
    tweet_created_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 订阅表
CREATE TABLE subscription (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('free', 'premium', 'enterprise')),
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    payment_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_twitter_id ON users(twitter_id);
CREATE INDEX idx_user_following_user_id ON user_following(user_id);
CREATE INDEX idx_user_following_twitter_id ON user_following(twitter_user_id);
CREATE INDEX idx_daily_summaries_user_id ON daily_summaries(user_id);
CREATE INDEX idx_daily_summaries_date ON daily_summaries(summary_date);
CREATE INDEX idx_tweet_analysis_summary_id ON tweet_analysis(summary_id);
CREATE INDEX idx_tweet_analysis_author ON tweet_analysis(author_username);
CREATE INDEX idx_tweet_analysis_engagement ON tweet_analysis(engagement_score DESC);
CREATE INDEX idx_subscription_user_id ON subscription(user_id);
CREATE INDEX idx_subscription_active ON subscription(is_active);

-- 启用行级安全
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_following ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tweet_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription ENABLE ROW LEVEL SECURITY;

-- 创建策略
-- 用户只能查看和修改自己的数据
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- 用户只能查看和管理自己的关注列表
CREATE POLICY "Users can view own following" ON user_following FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own following" ON user_following FOR ALL USING (auth.uid() = user_id);

-- 用户只能查看自己的摘要
CREATE POLICY "Users can view own summaries" ON daily_summaries FOR SELECT USING (auth.uid() = user_id);

-- 用户只能查看自己的推文分析
CREATE POLICY "Users can view own tweet analysis" ON tweet_analysis FOR SELECT USING (EXISTS (
  SELECT 1 FROM daily_summaries WHERE daily_summaries.id = tweet_analysis.summary_id AND daily_summaries.user_id = auth.uid()
));

-- 用户只能查看自己的订阅信息
CREATE POLICY "Users can view own subscription" ON subscription FOR SELECT USING (auth.uid() = user_id);

-- 授权访问
GRANT SELECT ON users TO anon;
GRANT ALL PRIVILEGES ON users TO authenticated;
GRANT SELECT ON user_following TO anon;
GRANT ALL PRIVILEGES ON user_following TO authenticated;
GRANT SELECT ON daily_summaries TO anon;
GRANT ALL PRIVILEGES ON daily_summaries TO authenticated;
GRANT SELECT ON tweet_analysis TO anon;
GRANT ALL PRIVILEGES ON tweet_analysis TO authenticated;
GRANT SELECT ON subscription TO anon;
GRANT ALL PRIVILEGES ON subscription TO authenticated;