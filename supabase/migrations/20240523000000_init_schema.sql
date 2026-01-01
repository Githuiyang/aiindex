-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Practices Table
CREATE TABLE IF NOT EXISTS practices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  description TEXT,
  url VARCHAR(500),
  logo_url VARCHAR(500),
  tags VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practices_user_id ON practices(user_id);
CREATE INDEX IF NOT EXISTS idx_practices_created_at ON practices(created_at DESC);

-- Images Table
CREATE TABLE IF NOT EXISTS images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  prompt TEXT,
  image_url VARCHAR(500) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_images_user_id ON images(user_id);
CREATE INDEX IF NOT EXISTS idx_images_created_at ON images(created_at DESC);

-- Posts Table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  tags VARCHAR(500),
  published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published) WHERE published = true;

-- Crawled Tweets Table
CREATE TABLE IF NOT EXISTS crawled_tweets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tweet_id VARCHAR(100) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  author VARCHAR(100) NOT NULL,
  like_count INTEGER DEFAULT 0,
  retweet_count INTEGER DEFAULT 0,
  processed BOOLEAN DEFAULT false,
  processed_to_type VARCHAR(50),
  processed_to_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crawled_tweets_user_id ON crawled_tweets(user_id);
CREATE INDEX IF NOT EXISTS idx_crawled_tweets_processed ON crawled_tweets(processed);
CREATE INDEX IF NOT EXISTS idx_crawled_tweets_created_at ON crawled_tweets(created_at DESC);

-- Row Level Security
ALTER TABLE practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawled_tweets ENABLE ROW LEVEL SECURITY;

-- Policies for Practices
CREATE POLICY "Users can view all practices" ON practices FOR SELECT USING (true);
CREATE POLICY "Users can insert their own practices" ON practices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own practices" ON practices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own practices" ON practices FOR DELETE USING (auth.uid() = user_id);

-- Policies for Images
CREATE POLICY "Users can view all images" ON images FOR SELECT USING (true);
CREATE POLICY "Users can insert their own images" ON images FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own images" ON images FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own images" ON images FOR DELETE USING (auth.uid() = user_id);

-- Policies for Posts
CREATE POLICY "Users can view published posts" ON posts FOR SELECT USING (published = true);
CREATE POLICY "Users can view their own posts" ON posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own posts" ON posts FOR DELETE USING (auth.uid() = user_id);

-- Policies for Crawled Tweets
CREATE POLICY "Users can view their own crawled tweets" ON crawled_tweets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert crawled tweets" ON crawled_tweets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own crawled tweets" ON crawled_tweets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own crawled tweets" ON crawled_tweets FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions (Adjusting for Supabase roles)
GRANT SELECT ON practices TO anon;
GRANT ALL ON practices TO authenticated;
GRANT SELECT ON images TO anon;
GRANT ALL ON images TO authenticated;
GRANT SELECT ON posts TO anon;
GRANT ALL ON posts TO authenticated;
GRANT ALL ON crawled_tweets TO authenticated;
