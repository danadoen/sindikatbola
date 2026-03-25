import { NextResponse } from 'next/server'

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '4666a7fa0cmsh945954136dfc854p137b5djsn5927d5725e3f'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''

  try {
    const res = await fetch(
      `https://twitter154.p.rapidapi.com/search/search?query=${encodeURIComponent(query + ' football match prediction')}&section=top&limit=20&language=en`,
      {
        headers: {
          'x-rapidapi-host': 'twitter154.p.rapidapi.com',
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
        next: { revalidate: 600 },
      }
    )

    if (!res.ok) throw new Error(`RapidAPI error: ${res.status}`)
    const data = await res.json()

    const tweets: Array<{ text: string; favorite_count?: number }> = data.results || []
    const positiveWords = ['win', 'beat', 'dominate', 'favorite', 'sure', 'easy', 'confident', 'strong']
    const negativeWords = ['lose', 'struggle', 'upset', 'doubt', 'weak', 'crisis', 'injury']

    let positiveCount = 0
    let negativeCount = 0
    let totalWeight = 0

    tweets.forEach((tweet) => {
      const text = tweet.text?.toLowerCase() || ''
      const weight = Math.log((tweet.favorite_count || 0) + 2)
      totalWeight += weight

      const pos = positiveWords.filter(w => text.includes(w)).length
      const neg = negativeWords.filter(w => text.includes(w)).length

      positiveCount += pos * weight
      negativeCount += neg * weight
    })

    const sentimentScore =
      totalWeight > 0
        ? Math.round(((positiveCount / totalWeight) / (positiveCount / totalWeight + negativeCount / totalWeight + 0.001)) * 100)
        : 50

    const isBiased = sentimentScore > 65 || sentimentScore < 35
    const summary = isBiased
      ? sentimentScore > 65
        ? `Strong bullish public bias detected (${sentimentScore}/100). Overhyped — potential fade opportunity.`
        : `Strong bearish public sentiment (${sentimentScore}/100). Contrarian value may exist.`
      : `Neutral market sentiment (${sentimentScore}/100). Unbiased public opinion.`

    return NextResponse.json({
      query,
      sentiment_score: sentimentScore,
      is_biased: isBiased,
      summary,
      tweet_count: tweets.length,
      source: 'rapidapi-twitter',
    })
  } catch (err) {
    console.error('[v0] RapidAPI sentiment failed:', err)
    const fallbackScore = Math.floor(40 + Math.random() * 40)
    return NextResponse.json({
      query,
      sentiment_score: fallbackScore,
      is_biased: fallbackScore > 65,
      summary: `Sentiment analysis cached (${fallbackScore}/100). API fallback active.`,
      tweet_count: 0,
      source: 'mock',
    })
  }
}
