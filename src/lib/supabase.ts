import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserFollowing = {
  id: string
  user_id: string
  twitter_user_id: string
  twitter_username: string
  display_name: string | null
  created_at?: string
}

export type DailySummary = {
  id: string
  user_id: string
  summary_date: string
  total_tweets: number
  positive_count: number
  negative_count: number
  neutral_count: number
  sentiment_distribution?: {
    positive: number
    negative: number
    neutral: number
  } | null
  created_at?: string
}

export type TweetAnalysis = {
  id: string
  summary_id: string
  author_username: string
  tweet_content: string
  like_count: number
  retweet_count: number
  reply_count: number
  engagement_score: number
  sentiment_analysis?: {
    sentiment?: 'positive' | 'negative' | 'neutral'
  } | null
  created_at?: string
}
