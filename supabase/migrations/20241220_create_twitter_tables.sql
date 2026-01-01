-- 创建抓取任务表
create table crawl_tasks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    target_accounts jsonb not null,
    like_threshold integer default 50,
    retweet_threshold integer default 50,
    frequency varchar(20) default 'daily' check (frequency in ('hourly', 'daily', 'weekly')),
    status varchar(20) default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- 创建推文结果表
create table tweet_results (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references crawl_tasks(id) on delete cascade,
    tweet_id varchar(100) unique not null,
    content text not null,
    author varchar(100) not null,
    author_username varchar(100) not null,
    like_count integer default 0,
    retweet_count integer default 0,
    reply_count integer default 0,
    media_urls jsonb default '[]',
    tweet_created_at timestamp with time zone not null,
    crawled_at timestamp with time zone default now()
);

-- 创建归档内容表
create table archived_content (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    tweet_result_id uuid not null references tweet_results(id) on delete cascade,
    archive_type varchar(50) not null check (archive_type in ('best-practices', 'image-stream')),
    categories jsonb default '[]',
    archived_at timestamp with time zone default now()
);

-- 创建索引
CREATE INDEX idx_crawl_tasks_user_id ON crawl_tasks(user_id);
CREATE INDEX idx_crawl_tasks_status ON crawl_tasks(status);
CREATE INDEX idx_crawl_tasks_created_at ON crawl_tasks(created_at DESC);

CREATE INDEX idx_tweet_results_task_id ON tweet_results(task_id);
CREATE INDEX idx_tweet_results_like_count ON tweet_results(like_count DESC);
CREATE INDEX idx_tweet_results_created_at ON tweet_results(tweet_created_at DESC);
CREATE INDEX idx_tweet_results_author ON tweet_results(author_username);

CREATE INDEX idx_archived_content_user_id ON archived_content(user_id);
CREATE INDEX idx_archived_content_type ON archived_content(archive_type);
CREATE INDEX idx_archived_content_archived_at ON archived_content(archived_at DESC);

-- 确保同一推文不会被重复归档
CREATE UNIQUE INDEX idx_archived_content_unique ON archived_content(user_id, tweet_result_id, archive_type);

-- 权限设置
GRANT SELECT ON crawl_tasks TO anon;
GRANT SELECT ON tweet_results TO anon;
GRANT SELECT ON archived_content TO anon;

GRANT ALL PRIVILEGES ON crawl_tasks TO authenticated;
GRANT ALL PRIVILEGES ON tweet_results TO authenticated;
GRANT ALL PRIVILEGES ON archived_content TO authenticated;