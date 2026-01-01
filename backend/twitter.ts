import { createClient } from '@supabase/supabase-js'
import type { Request, Response } from 'express'

function getSupabase() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase env missing: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(supabaseUrl, supabaseServiceKey)
}

const TWITTER_API_BASE = 'https://api.twitter.com/2'

interface TwitterUser { id: string; name: string; username: string; profile_image_url?: string }

interface Tweet {
  id: string
  text: string
  author_id: string
  created_at: string
  media_urls?: string[]
  public_metrics: { retweet_count: number; reply_count: number; like_count: number; quote_count: number; bookmark_count?: number; impression_count?: number }
}

export async function getUserFollowing(userId: string, bearerToken?: string): Promise<TwitterUser[]> {
  try {
    const supabase = getSupabase()
    const { data: user } = await supabase.from('users').select('twitter_id').eq('id', userId).single()
    if (!user?.twitter_id) throw new Error('User has not connected Twitter account')
    const response = await fetch(`${TWITTER_API_BASE}/users/${user.twitter_id}/following?max_results=100&user.fields=id,name,username,profile_image_url`, {
      headers: { Authorization: `Bearer ${bearerToken || process.env.TWITTER_BEARER_TOKEN || ''}`, 'Content-Type': 'application/json' },
    })
    if (!response.ok) throw new Error(`Twitter API error: ${response.status}`)
    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Error fetching user following:', error)
    return []
  }
}

export async function getUserTweets(username: string, maxResults: number = 10, bearerToken?: string): Promise<{ user: TwitterUser, tweets: Tweet[] } | null> {
  try {
    const userResponse = await fetch(`${TWITTER_API_BASE}/users/by/username/${username}?user.fields=id,name,username,profile_image_url`, {
      headers: { Authorization: `Bearer ${bearerToken || process.env.TWITTER_BEARER_TOKEN || ''}`, 'Content-Type': 'application/json' },
    })
    if (!userResponse.ok) throw new Error(`Twitter API error: ${userResponse.status}`)
    const userData = await userResponse.json()
    if (!userData.data) return null
    const user = userData.data as TwitterUser
    
    const tweetsResponse = await fetch(`${TWITTER_API_BASE}/users/${user.id}/tweets?max_results=${maxResults}&tweet.fields=id,text,created_at,author_id,public_metrics&exclude=replies`, {
      headers: { Authorization: `Bearer ${bearerToken || process.env.TWITTER_BEARER_TOKEN || ''}`, 'Content-Type': 'application/json' },
    })
    if (!tweetsResponse.ok) throw new Error(`Twitter API error: ${tweetsResponse.status}`)
    const tweetsData = await tweetsResponse.json()
    return { user, tweets: tweetsData.data || [] }
  } catch (error) {
    console.error('Error fetching user tweets:', error)
    return null
  }
}

export async function getMultipleUsersTweets(usernames: string[], bearerToken?: string): Promise<Record<string, { user: TwitterUser, tweets: Tweet[] }>> {
  const results: Record<string, { user: TwitterUser, tweets: Tweet[] }> = {}
  for (const username of usernames) {
    try { 
      const data = await getUserTweets(username, 10, bearerToken)
      if (data) results[username] = data
    } catch (error) { 
      console.error(`Error fetching tweets for ${username}:`, error) 
    }
  }
  return results
}

export function calculateEngagementScore(tweet: Tweet): number {
  const m = tweet.public_metrics
  return m.retweet_count * 4 + (m.quote_count || 0) * 3 + m.reply_count * 2 + m.like_count
}

export async function handleGetFollowingTweets(req: Request, res: Response) {
  try {
    const userId = (req as Request & { user?: { id?: string } }).user?.id
    const source = (req.query.source as string) || (process.env.TWITTER_BEARER_TOKEN || req.headers['x-twitter-bearer-token'] ? 'real' : '')
    const headerBearer = (req.headers['x-twitter-bearer-token'] as string | undefined)?.trim()
    const effectiveBearer = source === 'rapidapi' 
        ? (req.headers['x-rapidapi-key'] as string | undefined)?.trim() 
        : (headerBearer || process.env.TWITTER_BEARER_TOKEN);

    // Parse Strategy Params
    const targetType = (req.query.target_type as string) || 'following'; // 'timeline' | 'following'
    const targetHandle = (req.query.target_handle as string)?.trim() || '';
    const minLikes = parseInt(req.query.min_likes as string) || 50;
    const minRetweets = parseInt(req.query.min_retweets as string) || 10;
    const minReplies = parseInt(req.query.min_replies as string) || 5;
    const minBookmarks = parseInt(req.query.min_bookmarks as string) || 5;

    const date = (req.query.date as string) || new Date().toISOString().split('T')[0]
    if (!userId && !effectiveBearer) return res.status(401).json({ error: '未授权：请先登录，或填写 API Key。' })

    const limit = parseInt(req.query.limit as string) || 50

    if (source === 'rapidapi' || (source === 'real' && effectiveBearer)) {
      let tweets: Tweet[] = [];
      let targetUser: TwitterUser | null = null;

      // 1. Resolve Target User (Only for official API or RapidAPI timeline)
      if (targetHandle && source === 'real') {
        // If handle is provided, fetch that user first (Official API)
        const userResp = await fetch(`${TWITTER_API_BASE}/users/by/username/${targetHandle}`, {
          headers: { Authorization: `Bearer ${effectiveBearer}`, 'Content-Type': 'application/json' },
        });
        if (userResp.ok) {
           const userData = await userResp.json();
           if (userData.data) targetUser = userData.data;
        } else {
           console.error(`Failed to resolve target user ${targetHandle}: ${userResp.status}`);
        }
      }

      // 2. Execution Strategy
      if (source === 'rapidapi') {
        // RapidAPI Implementation
        // We will use 'twitter241' as it's more stable for timelines
        
        let tweets: Tweet[] = [];
        
        if (targetType === 'timeline' || targetType === 'following') {
            const rapidUrl = `https://twitter241.p.rapidapi.com/user-tweets?user=${targetUser?.id || targetHandle}&count=40`;
            // 如果 targetHandle 是数字ID则直接用，否则先获取ID (但我们上面已经resolve了)
            // 实际上 twitter241 接口需要 user ID。
            // 我们在 "1. Resolve Target User" 步骤可能用官方API失败了（因为没配官方Token），
            // 所以这里如果是 RapidAPI 模式，我们需要先通过 RapidAPI 获取 User ID。
            
            let finalUserId = targetUser?.id;
            if (!finalUserId && source === 'rapidapi') {
               const userUrl = `https://twitter241.p.rapidapi.com/user?username=${targetHandle}`;
               console.log(`Resolving user ${targetHandle} via RapidAPI: ${userUrl}`);
               const uResp = await fetch(userUrl, {
                  headers: {
                     'x-rapidapi-key': effectiveBearer,
                     'x-rapidapi-host': 'twitter241.p.rapidapi.com'
                  }
               });
               if (uResp.ok) {
                  const uData = await uResp.json();
                  // 路径: result.data.user.result.rest_id
                  finalUserId = uData.result?.data?.user?.result?.rest_id;
                  
                  // 顺便补全 targetUser 信息，方便后面展示
                  const legacy = uData.result?.data?.user?.result?.legacy || {};
                  targetUser = {
                     id: finalUserId,
                     name: legacy.name || targetHandle,
                     username: legacy.screen_name || targetHandle,
                     profile_image_url: uData.result?.data?.user?.result?.avatar?.image_url
                  };
               } else {
                  console.error(`RapidAPI user resolution failed: ${uResp.status}`);
               }
            }
            
            if (!finalUserId) {
               console.error(`Failed to find user ID for handle: ${targetHandle}`);
               return res.status(404).json({ error: `RapidAPI 模式下未找到用户 @${targetHandle}，可能是账号不存在或被冻结。` });
            }

            // Decide which API endpoint to call based on strategy
            let tweetsUrl = '';
            
            if (targetType === 'following') {
               // Strategy: Get user's following list, then fetch their tweets
               // But RapidAPI twitter241 doesn't have a direct "following's tweets" endpoint.
               // We need to:
               // 1. Get followings (https://twitter241.p.rapidapi.com/following?user=xxx&count=20)
               // 2. Fetch tweets for top N followings
               
               console.log(`Fetching followings for user ${finalUserId}...`);
               const followingUrl = `https://twitter241.p.rapidapi.com/following?user=${finalUserId}&count=20`;
               const fResp = await fetch(followingUrl, {
                  headers: { 'x-rapidapi-key': effectiveBearer, 'x-rapidapi-host': 'twitter241.p.rapidapi.com' }
               });
               
               if (!fResp.ok) {
                  throw new Error(`RapidAPI following fetch error: ${fResp.status}`);
               }
               
               const fData = await fResp.json();
               // Parse following list
               // Note: The structure might vary. Safely access it.
               const instructions = fData.result?.timeline?.timeline?.instructions || [];
               const entries = instructions.flatMap((i: any) => i.entries || []);
               const followings = entries
                  .filter((e: any) => e.entryId.startsWith('user-'))
                  .map((e: any) => e.content?.itemContent?.user_results?.result?.rest_id)
                  .filter(Boolean)
                  .slice(0, 5); // Limit to top 5 to save API calls
               
               if (followings.length === 0) {
                  console.log('No followings found in response:', JSON.stringify(fData).slice(0, 200));
                  return res.json({ tweets: [], message: '该用户没有关注任何人，或关注列表不可见。' });
               }
               
               console.log(`Found ${followings.length} followings. Fetching their tweets...`);
               
               // Fetch tweets for each following (Parallel)
               const tasks = followings.map((fid: string) => 
                  fetch(`https://twitter241.p.rapidapi.com/user-tweets?user=${fid}&count=10`, {
                     headers: { 'x-rapidapi-key': effectiveBearer, 'x-rapidapi-host': 'twitter241.p.rapidapi.com' }
                  }).then(r => r.json().catch(err => {
                      console.error(`Failed to parse JSON for user ${fid}:`, err);
                      return {};
                  }))
               );
               
               const results = await Promise.all(tasks);
               
               // Merge all tweets
               const allRawTweets: any[] = [];
               results.forEach((r: any) => {
                  if (!r || !r.result) return;
                  const inst = r.result?.timeline?.instructions || [];
                  const ents = inst.flatMap((i: any) => i.entries || []);
                  ents.forEach((entry: any) => {
                     if (entry.content?.entryType === 'TimelineTimelineItem') {
                        const tr = entry.content.itemContent?.tweet_results?.result;
                        if (tr) allRawTweets.push(tr);
                     }
                  });
               });
               
               // Process merged tweets
               tweets = allRawTweets.map((t: any) => {
                  const legacy = t.legacy || {};
                  const core = t.core?.user_results?.result?.legacy || {};
                  const media = legacy.extended_entities?.media || legacy.entities?.media || [];
                  const media_urls = media.map((m: any) => m.media_url_https).filter(Boolean);

                  return {
                     id: legacy.id_str,
                     text: legacy.full_text || '',
                     author_id: t.rest_id,
                     created_at: new Date(legacy.created_at).toISOString(),
                     media_urls,
                     public_metrics: {
                        retweet_count: legacy.retweet_count || 0,
                        reply_count: legacy.reply_count || 0,
                        like_count: legacy.favorite_count || 0,
                        quote_count: legacy.quote_count || 0,
                        bookmark_count: legacy.bookmark_count || 0,
                        impression_count: 0
                     },
                     _author_info: {
                        id: t.rest_id,
                        name: core.name,
                        username: core.screen_name,
                        profile_image_url: t.core?.user_results?.result?.avatar?.image_url
                     }
                  };
               }).filter(t => t.id);

            } else {
               // Default: Timeline
               tweetsUrl = `https://twitter241.p.rapidapi.com/user-tweets?user=${finalUserId}&count=40`;
               console.log(`Fetching tweets via RapidAPI: ${tweetsUrl}`);
               const rapidResp = await fetch(tweetsUrl, {
                  headers: {
                     'x-rapidapi-key': effectiveBearer,
                     'x-rapidapi-host': 'twitter241.p.rapidapi.com'
                  }
               });
               
               if (!rapidResp.ok) {
                  const errTxt = await rapidResp.text();
                  console.error(`RapidAPI tweets fetch error: ${rapidResp.status} ${errTxt}`);
                  throw new Error(`RapidAPI error: ${rapidResp.status} ${errTxt}`);
               }
               
               const rData = await rapidResp.json();
               console.log('RapidAPI response structure keys:', Object.keys(rData));
               
               const instructions = rData.result?.timeline?.instructions || [];
               const entries = instructions.flatMap((i: any) => i.entries || []);
               
               const rawTweets: any[] = [];
               
               entries.forEach((entry: any) => {
                  // 1. Tweet
                  if (entry.content?.entryType === 'TimelineTimelineItem') {
                     const tweetResult = entry.content.itemContent?.tweet_results?.result;
                     if (tweetResult) rawTweets.push(tweetResult);
                  }
                  // 2. Conversation (Thread)
                  else if (entry.content?.entryType === 'TimelineTimelineModule') {
                      const items = entry.content.items || [];
                      items.forEach((item: any) => {
                          const tweetResult = item.item.itemContent?.tweet_results?.result;
                          if (tweetResult) rawTweets.push(tweetResult);
                      });
                  }
               });

               // Transform RapidAPI (Twitter241) format to our Tweet format
               tweets = rawTweets.map((t: any) => {
                  const legacy = t.legacy || {};
                  const core = t.core?.user_results?.result?.legacy || {};
                  const media = legacy.extended_entities?.media || legacy.entities?.media || [];
                  const media_urls = media.map((m: any) => m.media_url_https).filter(Boolean);
                  
                  return {
                     id: legacy.id_str,
                     text: legacy.full_text || '',
                     author_id: t.rest_id, 
                     created_at: new Date(legacy.created_at).toISOString(),
                     media_urls,
                     public_metrics: {
                        retweet_count: legacy.retweet_count || 0,
                        reply_count: legacy.reply_count || 0,
                        like_count: legacy.favorite_count || 0,
                        quote_count: legacy.quote_count || 0,
                        bookmark_count: legacy.bookmark_count || 0,
                        impression_count: 0 
                     },
                     _author_info: {
                        id: t.rest_id,
                        name: core.name || targetHandle,
                        username: core.screen_name || targetHandle,
                        profile_image_url: t.core?.user_results?.result?.avatar?.image_url
                     }
                  };
               }).filter(t => t.id);
            }

            // Filter and Sort (Common logic)
            const adapted = tweets.map(t => ({
              id: t.id,
              author_id: t.author_id,
              author_name: (t as any)._author_info.name,
              author_username: (t as any)._author_info.username,
              author_profile_image_url: (t as any)._author_info.profile_image_url,
              tweet_content: t.text,
              media_urls: t.media_urls,
              retweet_count: t.public_metrics?.retweet_count || 0,
              like_count: t.public_metrics?.like_count || 0,
              reply_count: t.public_metrics?.reply_count || 0,
              quote_count: t.public_metrics?.quote_count || 0,
              bookmark_count: t.public_metrics?.bookmark_count || 0,
              tweet_created_at: t.created_at,
           }));

           const filtered = adapted.filter(t => 
               t.like_count >= minLikes || 
               t.retweet_count >= minRetweets || 
               t.reply_count >= minReplies ||
               t.bookmark_count >= minBookmarks
           );

           const top = filtered.sort((a, b) => b.like_count - a.like_count).slice(0, limit);
           
           if (top.length === 0) {
               return res.json({ 
                 tweets: [], 
                 totalCount: 0, 
                 analysisDate: date,
                 message: `RapidAPI 连接成功，但没有推文满足当前阈值条件。`
               })
            }

           return res.json({ tweets: top, totalCount: top.length, analysisDate: date });
           
        } else {
           return res.status(400).json({ error: 'RapidAPI 模式暂时不支持此策略。' });
        }
      }

      if (targetType === 'timeline') {
         // Case A: Fetch User's Timeline
         // If we have a targetUser (from handle), use it. 
         // If not, and we have a userId (from supabase), try to get linked twitter_id?
         // But here we rely on Bearer Token primarily for "public" data or explicit handle.
         
         if (targetUser) {
            const tData = await getUserTweets(targetUser.username, 20, effectiveBearer);
            if (tData) {
               // Map tweets to include user info for uniform structure
               tweets = tData.tweets.map(t => ({...t, author_id: targetUser!.id})); // Author is targetUser
               // We need to attach user info to each tweet for display, 
               // but `getUserTweets` returns {user, tweets}.
               // We will normalize later.
            }
         } else {
            if (targetHandle) {
               return res.status(404).json({ error: `未找到用户 @${targetHandle}，请检查拼写或确认该账号是否存在/公开。` });
            }
            return res.status(400).json({ error: '选择“指定用户时间线”策略时必须填写目标账号（不含 @）。' });
         }

      } else {
         // Case B: Following's Top Tweets
         let usernames: string[] = [];
         
         if (targetUser) {
             // Fetch following of targetUser
             const followingResp = await fetch(`${TWITTER_API_BASE}/users/${targetUser.id}/following?max_results=20`, {
                 headers: { Authorization: `Bearer ${effectiveBearer}` },
             });
             if (followingResp.ok) {
                 const fData = await followingResp.json();
                 if (fData.data) usernames = fData.data.map((u: TwitterUser) => u.username);
             }
         } else if (userId) {
             // Use Supabase connected user
             const supabase = getSupabase();
             const { data: following } = await supabase.from('user_following').select('twitter_username').eq('user_id', userId);
             if (following) usernames = following.map(f => f.twitter_username);
         } else {
             // Attempt to get user from Token (for OAuth User Context)
             const meResp = await fetch(`${TWITTER_API_BASE}/users/me`, {
                 headers: { Authorization: `Bearer ${effectiveBearer}` },
             });
             
             if (meResp.ok) {
                 const meData = await meResp.json();
                 if (meData.data) {
                    // Found "me", fetch following
                    const followingResp = await fetch(`${TWITTER_API_BASE}/users/${meData.data.id}/following?max_results=20`, {
                        headers: { Authorization: `Bearer ${effectiveBearer}` },
                    });
                    if (followingResp.ok) {
                        const fData = await followingResp.json();
                        if (fData.data) usernames = fData.data.map((u: TwitterUser) => u.username);
                    }
                 }
             } else {
                 // Fallback failed. App-only token cannot use /users/me
                 return res.status(400).json({ 
                     error: '当前访问令牌为应用级（App-only），无法自动识别“我是谁”。请在“目标账号”中填写你要分析的用户名（不含 @）。' 
                 });
             }
         }

         if (usernames.length > 0) {
             const map = await getMultipleUsersTweets(usernames, effectiveBearer);
             // Flatten map to tweets
             // Note: getMultipleUsersTweets returns { username: { user, tweets } }
             // We need to preserve user info
             const flattened = Object.values(map).flatMap(({ user, tweets }) => (tweets || []).map(t => ({
                ...t,
                _author_info: user // Attach temp user info
             })));
             
             // We can use this directly
             // But wait, the previous code mapped it differently.
             // Let's adapt the mapping logic below.
             
             // Re-map to match the structure we need below
             const adapted = flattened.map(t => ({
                id: t.id,
                author_id: t.author_id,
                author_name: t._author_info.name,
                author_username: t._author_info.username,
                author_profile_image_url: t._author_info.profile_image_url,
                tweet_content: t.text,
                retweet_count: t.public_metrics?.retweet_count || 0,
                like_count: t.public_metrics?.like_count || 0,
                reply_count: t.public_metrics?.reply_count || 0,
                quote_count: t.public_metrics?.quote_count || 0,
                bookmark_count: t.public_metrics?.bookmark_count || 0,
                tweet_created_at: t.created_at,
             }));

             // Filter!
             const filtered = adapted.filter(t => 
                 t.like_count >= minLikes || 
                 t.retweet_count >= minRetweets || 
                 t.reply_count >= minReplies ||
                 t.bookmark_count >= minBookmarks
             );

             const top = filtered.sort((a, b) => (b.like_count + b.retweet_count * 2) - (a.like_count + a.retweet_count * 2)).slice(0, limit);

             if (top.length === 0) {
                return res.json({ 
                  tweets: [], 
                  totalCount: 0, 
                  analysisDate: date,
                  message: `连接成功，但没有推文满足阈值条件（点赞≥${minLikes}，转发≥${minRetweets}，回复≥${minReplies}，收藏≥${minBookmarks}）。`
                })
             }
             return res.json({ tweets: top, totalCount: top.length, analysisDate: date });
         }
      }

      // If we are here, it means Timeline strategy was used and we need to process `tweets` from that block
      // Or we need to handle the case where we fetched timeline tweets but didn't return yet.
      // Let's unify the return structure.
      
      if (targetType === 'timeline' && targetUser && tweets.length > 0) {
          const adapted = tweets.map(t => ({
              id: t.id,
              author_id: targetUser!.id,
              author_name: targetUser!.name,
              author_username: targetUser!.username,
              author_profile_image_url: targetUser!.profile_image_url,
              tweet_content: t.text,
              retweet_count: t.public_metrics?.retweet_count || 0,
              like_count: t.public_metrics?.like_count || 0,
              reply_count: t.public_metrics?.reply_count || 0,
              quote_count: t.public_metrics?.quote_count || 0,
              bookmark_count: t.public_metrics?.bookmark_count || 0,
              tweet_created_at: t.created_at,
           }));

           const filtered = adapted.filter(t => 
               t.like_count >= minLikes || 
               t.retweet_count >= minRetweets || 
               t.reply_count >= minReplies ||
               t.bookmark_count >= minBookmarks
           );

           const top = filtered.sort((a, b) => b.like_count - a.like_count).slice(0, limit);
           
           if (top.length === 0) {
               return res.json({ 
                 tweets: [], 
                 totalCount: 0, 
                 analysisDate: date,
                 message: `已抓到 @${targetHandle} 的推文，但没有满足当前阈值条件。请降低阈值后重试。`
               })
            }

           return res.json({ tweets: top, totalCount: top.length, analysisDate: date });
      }

      return res.json({ tweets: [], totalCount: 0, analysisDate: date, message: '使用当前策略未找到数据。请调整抓取策略或目标账号。' })
    }

    return res.json({ tweets: [], totalCount: 0, analysisDate: date, message: '没有可用的数据来源：请登录或填写 Twitter 访问令牌。' })
  } catch (error) {
    console.error('Error in handleGetFollowingTweets:', error)
    res.status(500).json({ error: '服务器内部错误' })
  }
}
