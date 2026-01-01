## 1. 架构设计

```mermaid
graph TD
  A[用户浏览器] --> B[React前端应用]
  B --> C[后端API服务]
  C --> D[Supabase数据库]
  C --> E[Twitter API服务]
  C --> F[AI分析服务]
  C --> G[邮件通知服务]

  subgraph "前端层"
    B
  end

  subgraph "后端服务层"
    C
    F
    G
  end

  subgraph "数据层"
    D
  end

  subgraph "外部服务层"
    E
  end
```

## 2. 技术描述

- **前端**: React@18 + TypeScript + TailwindCSS@3 + Vite
- **初始化工具**: vite-init
- **后端**: Node.js@18 + Express@4 + TypeScript
- **数据库**: Supabase (PostgreSQL)
- **身份验证**: Supabase Auth + Twitter OAuth
- **任务调度**: node-cron
- **AI分析**: OpenAI API / Hugging Face
- **邮件服务**: Nodemailer + SendGrid

## 3. 路由定义

| 路由 | 用途 |
|-------|---------|
| / | 登录页，用户认证入口 |
| /dashboard | 每日摘要页，显示分析结果 |
| /rankings | 排行榜页，展示作者和话题排名 |
| /settings | 设置页，管理关注列表和偏好 |
| /profile | 用户资料页，管理账号信息 |
| /api/auth/* | 认证相关API路由 |
| /api/twitter/* | Twitter数据获取API |
| /api/analytics/* | 分析结果API |

## 4. API定义

### 4.1 认证API

**用户登录**
```
POST /api/auth/login
```

请求参数：
| 参数名 | 参数类型 | 是否必需 | 描述 |
|-----------|-------------|-------------|-------------|
| email | string | true | 用户邮箱地址 |
| password | string | true | 用户密码 |

响应：
| 参数名 | 参数类型 | 描述 |
|-----------|-------------|-------------|
| token | string | JWT访问令牌 |
| user | object | 用户信息对象 |
| expiresIn | number | 令牌有效期（秒） |

### 4.2 Twitter数据API

**获取关注用户推文**
```
GET /api/twitter/following-tweets
```

请求头：
```
Authorization: Bearer {jwt_token}
```

查询参数：
| 参数名 | 参数类型 | 是否必需 | 描述 |
|-----------|-------------|-------------|-------------|
| date | string | false | 日期（YYYY-MM-DD），默认当天 |
| limit | number | false | 返回数量限制，默认50 |

响应：
| 参数名 | 参数类型 | 描述 |
|-----------|-------------|-------------|
| tweets | array | 推文对象数组 |
| totalCount | number | 推文总数 |
| analysisDate | string | 分析日期 |

### 4.3 分析结果API

**获取每日摘要**
```
GET /api/analytics/daily-summary
```

请求头：
```
Authorization: Bearer {jwt_token}
```

查询参数：
| 参数名 | 参数类型 | 是否必需 | 描述 |
|-----------|-------------|-------------|-------------|
| date | string | false | 摘要日期，默认昨天 |

响应：
| 参数名 | 参数类型 | 描述 |
|-----------|-------------|-------------|
| summary | object | 摘要数据对象 |
| sentiment | object | 情绪分析结果 |
| keywords | array | 关键词数组 |
| topAuthors | array | 热门作者数组 |

## 5. 服务器架构图

```mermaid
graph TD
  A[客户端请求] --> B[认证中间件]
  B --> C[路由控制器]
  C --> D[业务服务层]
  D --> E[数据访问层]
  E --> F[(Supabase数据库)]
  D --> G[Twitter API客户端]
  D --> H[AI分析服务]
  D --> I[邮件服务]

  subgraph "Express服务器"
    B
    C
    D
    E
  end

  subgraph "外部服务"
    F
    G
    H
    I
  end
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
  USERS ||--o{ USER_FOLLOWING : follows
  USERS ||--o{ DAILY_SUMMARIES : owns
  USERS ||--o{ SUBSCRIPTION : has
  DAILY_SUMMARIES ||--o{ TWEET_ANALYSIS : contains
  TWEET_ANALYSIS ||--o{ SENTIMENT_SCORES : has

  USERS {
    uuid id PK
    string email UK
    string password_hash
    string twitter_id UK
    string twitter_username
    string plan
    timestamp created_at
    timestamp updated_at
  }

  USER_FOLLOWING {
    uuid id PK
    uuid user_id FK
    string twitter_user_id
    string twitter_username
    string display_name
    timestamp created_at
  }

  DAILY_SUMMARIES {
    uuid id PK
    uuid user_id FK
    date summary_date
    jsonb sentiment_distribution
    integer total_tweets
    integer positive_count
    integer negative_count
    integer neutral_count
    timestamp created_at
  }

  TWEET_ANALYSIS {
    uuid id PK
    uuid summary_id FK
    string tweet_id
    string author_username
    text tweet_content
    integer retweet_count
    integer like_count
    integer reply_count
    float engagement_score
    jsonb sentiment_analysis
    timestamp tweet_created_at
  }

  SENTIMENT_SCORES {
    uuid id PK
    uuid tweet_analysis_id FK
    string sentiment_type
    float score
    string model_used
    timestamp created_at
  }

  SUBSCRIPTION {
    uuid id PK
    uuid user_id FK
    string plan_type
    timestamp start_date
    timestamp end_date
    boolean is_active
    string payment_status
  }
```

### 6.2 数据定义语言

请参考 `trans/supabase/README.md` 中的迁移文件路径。

## 7. 定时任务配置

示例：每日凌晨2点执行推文获取与分析、每周日凌晨3点清理过期数据。

