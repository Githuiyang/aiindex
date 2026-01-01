export const MOCK_USERS = {
  eviljer: {
    id: '987654321',
    name: 'Jerlin',
    username: 'eviljer',
    profile_image_url: 'https://pbs.twimg.com/profile_images/1488569786/owl_400x400.jpg', // Placeholder owl
  },
  jeremylv: {
    id: '123456789',
    name: 'Jeremy Le Van',
    username: 'jeremylv',
    profile_image_url: 'https://pbs.twimg.com/profile_images/123456789/avatar_400x400.jpg', // Placeholder
  },
}

export const MOCK_TWEETS = [
  {
    id: 'tweet_eviljer_1',
    author_id: '987654321',
    text: 'Context window management is the new memory management. As LLMs grow, how we feed them relevant info becomes the bottleneck, not the model size itself. #AI #Engineering',
    created_at: '2023-10-27T10:00:00Z',
    public_metrics: {
      retweet_count: 120,
      reply_count: 45,
      like_count: 850,
      quote_count: 12,
    },
  },
  {
    id: 'tweet_eviljer_2',
    author_id: '987654321',
    text: 'Design systems are not just about UI components. They are about the shared language between designers and developers. Consistency in code leads to consistency in experience.',
    created_at: '2023-10-26T14:30:00Z',
    public_metrics: {
      retweet_count: 89,
      reply_count: 23,
      like_count: 620,
      quote_count: 5,
    },
  },
  {
    id: 'tweet_eviljer_3',
    author_id: '987654321',
    text: 'Just shipped a new feature using Vercel AI SDK. The streaming response experience is magical when combined with optimistic UI updates. ⚡️',
    created_at: '2023-10-25T09:15:00Z',
    public_metrics: {
      retweet_count: 56,
      reply_count: 18,
      like_count: 430,
      quote_count: 8,
    },
  },
  {
    id: 'tweet_jeremylv_1',
    author_id: '123456789',
    text: 'Sunrise in Kyoto. The colors are unreal today.',
    created_at: '2023-10-28T06:00:00Z',
    public_metrics: {
      retweet_count: 10,
      reply_count: 5,
      like_count: 120,
      quote_count: 1,
    },
  },
]
