'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Trend {
  id: number
  title: string
  category: string
  change: number
  description: string
  tweet_volume?: number
}

interface PromptSuggestions {
  image_prompt: string
  video_prompt: string
}

const LOCATIONS = [
  { name: 'Worldwide', woeid: '1' },
  { name: 'United States', woeid: '23424977' },
  { name: 'United Kingdom', woeid: '23424975' },
  { name: 'Canada', woeid: '23424775' },
  { name: 'Australia', woeid: '23424748' },
  { name: 'Germany', woeid: '23424829' },
  { name: 'France', woeid: '23424819' },
  { name: 'Japan', woeid: '23424856' },
  { name: 'India', woeid: '23424848' },
  { name: 'Brazil', woeid: '23424768' },
]

export default function TrendsPage() {
  const router = useRouter()
  const [trends, setTrends] = useState<Trend[]>([])
  const [filteredTrends, setFilteredTrends] = useState<Trend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('23424977') // Default to US
  const [expandedTrend, setExpandedTrend] = useState<number | null>(null)
  const [promptSuggestions, setPromptSuggestions] = useState<Record<number, PromptSuggestions>>({})
  const [loadingSuggestions, setLoadingSuggestions] = useState<Record<number, boolean>>({})
  const [yourProduct, setYourProduct] = useState('') // User's product/topic to link with trends

  const getTrendsFunctionUrl = () => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return process.env.NEXT_PUBLIC_TRENDS_FUNCTION_URL || 
        'http://localhost:5001/grokads-47abba/us-central1/get_trends'
    }
    return process.env.NEXT_PUBLIC_TRENDS_FUNCTION_URL || 
      'http://localhost:5001/grokads-47abba/us-central1/get_trends'
  }

  const getAdSuggestionsUrl = () => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:5001/grokads-47abba/us-central1/get_trend_ad_suggestions'
    }
    return 'http://localhost:5001/grokads-47abba/us-central1/get_trend_ad_suggestions'
  }

  const TRENDS_FUNCTION_URL = getTrendsFunctionUrl()
  const AD_SUGGESTIONS_URL = getAdSuggestionsUrl()

  const fetchTrends = async (woeid: string) => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch(`${TRENDS_FUNCTION_URL}?woeid=${woeid}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch trends')
      }

      const data = await response.json()
      
      const mappedTrends: Trend[] = data.trends.map((trend: any, index: number) => ({
        id: trend.id || index + 1,
        title: trend.title,
        category: 'trending',
        change: trend.change || 10,
        description: trend.description || `Trending on X${trend.tweet_volume ? ` with ${trend.tweet_volume.toLocaleString()} tweets` : ''}`,
        tweet_volume: trend.tweet_volume || 0
      }))
      
      setTrends(mappedTrends)
      setFilteredTrends(mappedTrends)
    } catch (err) {
      console.error('Error fetching trends:', err)
      setError(err instanceof Error ? err.message : 'Failed to load trends')
      
        // Fallback to mock data
      const mockTrends: Trend[] = [
        {
          id: 1,
          title: 'AI-Generated Content',
          category: 'trending',
          change: 45,
          description: 'Marketers are increasingly using AI to create personalized ad content at scale',
          tweet_volume: 125000
        },
        {
          id: 2,
          title: 'Video-First Advertising',
          category: 'trending',
          change: 32,
          description: 'Short-form video ads are dominating social media platforms',
          tweet_volume: 89000
        },
        {
          id: 3,
          title: 'Sustainability Messaging',
          category: 'trending',
          change: 28,
          description: 'Brands are emphasizing eco-friendly practices in their campaigns',
          tweet_volume: 67000
        },
        {
          id: 4,
          title: 'Interactive Ads',
          category: 'trending',
          change: 23,
          description: 'Engagement rates are higher with interactive and shoppable ad formats',
          tweet_volume: 45000
        },
        {
          id: 5,
          title: 'Micro-Influencers',
          category: 'trending',
          change: 19,
          description: 'Smaller influencers with niche audiences are proving more effective',
          tweet_volume: 32000
        },
        {
          id: 6,
          title: 'Voice Search Optimization',
          category: 'trending',
          change: 15,
          description: 'Optimizing ads for voice-activated devices and assistants',
          tweet_volume: 21000
        }
      ]
      
      setTrends(mockTrends)
      setFilteredTrends(mockTrends)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrends(selectedLocation)
  }, [selectedLocation])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTrends(trends)
    } else {
      const filtered = trends.filter(trend =>
        trend.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trend.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredTrends(filtered)
    }
  }, [searchQuery, trends])

  const handleUseInAd = (trend: Trend) => {
    // Combine trend with user's product if provided
    const prompt = yourProduct.trim() 
      ? `Create an ad for ${yourProduct} related to the trending topic: ${trend.title}`
      : trend.title
    router.push(`/?prompt=${encodeURIComponent(prompt)}`)
  }

  const handleGetPrompts = async (trend: Trend) => {
    if (promptSuggestions[trend.id]) {
      setExpandedTrend(expandedTrend === trend.id ? null : trend.id)
      return
    }

    setLoadingSuggestions({ ...loadingSuggestions, [trend.id]: true })
    
    try {
      // Combine trend with user's product if provided
      const trendText = yourProduct.trim()
        ? `${trend.title} (for ${yourProduct})`
        : trend.title
      
      const response = await fetch(AD_SUGGESTIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trend: trendText }),
      })

      if (response.ok) {
        const data = await response.json()
        setPromptSuggestions({ ...promptSuggestions, [trend.id]: data.prompts || {} })
        setExpandedTrend(trend.id)
      }
    } catch (err) {
      console.error('Error fetching prompts:', err)
    } finally {
      setLoadingSuggestions({ ...loadingSuggestions, [trend.id]: false })
    }
  }

  const handleGenerateFromPrompt = (prompt: string, type: 'image' | 'video') => {
    if (type === 'image') {
      router.push(`/?prompt=${encodeURIComponent(prompt)}`)
    } else {
      // For video, navigate to home page with prompt
      router.push(`/?prompt=${encodeURIComponent(prompt)}`)
    }
  }

  const getTweetVolumeColor = (volume: number) => {
    if (volume > 100000) return '#ff4444'
    if (volume > 50000) return '#ff8800'
    if (volume > 10000) return '#ffbb33'
    return 'rgba(255, 255, 255, 0.6)'
  }

  return (
    <div className="container" style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 20px' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '700' }}>🔥 Trending Topics</h1>
        <Link 
          href="/" 
          style={{ 
            color: 'rgba(255, 255, 255, 0.8)', 
            textDecoration: 'none',
            fontSize: '14px',
            padding: '10px 20px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            transition: 'all 0.2s',
            fontWeight: '500'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#ffffff'
            e.currentTarget.style.color = '#ffffff'
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          ← Back to Home
        </Link>
      </div>

      {/* Controls Bar */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          {/* Location Selector */}
          <div style={{ flex: '1', minWidth: '200px' }}>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '14px',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#ffffff'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'}
            >
              {LOCATIONS.map(loc => (
                <option key={loc.woeid} value={loc.woeid} style={{ background: '#1a1a1a', color: '#ffffff' }}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div style={{ flex: '2', minWidth: '250px' }}>
            <input
              type="text"
              placeholder="Search trends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#ffffff'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'}
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchTrends(selectedLocation)}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: loading ? 'rgba(255, 255, 255, 0.2)' : '#ffffff',
              color: loading ? 'rgba(255, 255, 255, 0.5)' : '#000000',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)'
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#ffffff'
              }
            }}
          >
            {loading ? '🔄' : '↻ Refresh'}
          </button>
        </div>

        {/* Your Product/Topic Input */}
        <div style={{
          padding: '16px',
          background: 'rgba(156, 39, 176, 0.1)',
          border: '1px solid rgba(156, 39, 176, 0.3)',
          borderRadius: '12px',
          marginBottom: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ color: '#9c27b0', fontSize: '16px' }}>🎯</span>
            <label style={{ color: '#9c27b0', fontSize: '14px', fontWeight: '600' }}>
              Your Product/Service (Optional)
            </label>
          </div>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', marginBottom: '12px', marginTop: '4px' }}>
            Enter your product or service. When you click "Generate Ad" on any trend, it will create an ad combining the trend with your product.
          </p>
          <input
            type="text"
            placeholder="e.g., Sustainable Fashion Brand, AI Productivity Tool, Fitness App..."
            value={yourProduct}
            onChange={(e) => setYourProduct(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(156, 39, 176, 0.5)',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.2s'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#9c27b0'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(156, 39, 176, 0.5)'}
          />
          {yourProduct.trim() && (
            <div style={{
              marginTop: '8px',
              padding: '8px 12px',
              background: 'rgba(156, 39, 176, 0.2)',
              borderRadius: '6px',
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.8)'
            }}>
              ✓ Will be combined with trends when generating ads/images
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          background: 'rgba(244, 67, 54, 0.2)',
          border: '1px solid rgba(244, 67, 54, 0.5)',
          borderRadius: '8px',
          color: '#ff5252',
          fontSize: '14px'
        }}>
          <strong>Note:</strong> {error}. Showing fallback data.
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255, 255, 255, 0.6)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔥</div>
          <div>Loading trending topics...</div>
        </div>
      ) : filteredTrends.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255, 255, 255, 0.6)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <div>No trends found matching your search.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredTrends.map((trend, index) => (
            <div
              key={trend.id}
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '16px',
                padding: '24px',
                transition: 'all 0.3s',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)'
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {/* Trend Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: index < 3 ? 'linear-gradient(135deg, #ff6b6b, #ff8e53)' : 'rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: '700',
                      flexShrink: 0
                    }}>
                      {index + 1}
                    </span>
                    <h2 
                      style={{ 
                        color: '#ffffff', 
                        fontSize: '22px', 
                        fontWeight: '700', 
                        margin: 0,
                        cursor: 'pointer',
                        transition: 'color 0.2s'
                      }}
                      onClick={() => handleUseInAd(trend)}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ffbb33'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#ffffff'}
                    >
                      {trend.title}
                    </h2>
                  </div>
                  
                  {/* Tweet Volume Badge */}
                  {trend.tweet_volume && trend.tweet_volume > 0 && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: getTweetVolumeColor(trend.tweet_volume),
                      fontWeight: '600',
                      marginTop: '8px'
                    }}>
                      <span>📊</span>
                      <span>{trend.tweet_volume.toLocaleString()} tweets</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '15px', lineHeight: '1.6', margin: '0 0 16px 0' }}>
                {trend.description}
              </p>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleUseInAd(trend)}
                  style={{
                    padding: '10px 20px',
                    background: '#ffffff',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flex: '1',
                    minWidth: '140px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)'
                    e.currentTarget.style.transform = 'scale(1.02)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff'
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                >
                  ⚡ Quick Ad
                </button>
                <button
                  onClick={() => handleGetPrompts(trend)}
                  disabled={loadingSuggestions[trend.id]}
                  style={{
                    padding: '10px 20px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: loadingSuggestions[trend.id] ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    flex: '1',
                    minWidth: '140px',
                    opacity: loadingSuggestions[trend.id] ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!loadingSuggestions[trend.id]) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                      e.currentTarget.style.borderColor = '#ffffff'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loadingSuggestions[trend.id]) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                    }
                  }}
                >
                  {loadingSuggestions[trend.id] ? '⏳ Loading...' : '💡 AI Prompts'}
                </button>
              </div>

              {/* Image and Video Prompts */}
              {expandedTrend === trend.id && promptSuggestions[trend.id] && (
                <div style={{
                  marginTop: '20px',
                  padding: '20px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px'
                }}>
                  <h3 style={{ color: '#ffffff', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                    💡 AI-Generated Prompts
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {promptSuggestions[trend.id].image_prompt && (
                      <div
                        style={{
                          padding: '16px',
                          background: 'rgba(33, 150, 243, 0.1)',
                          borderRadius: '8px',
                          border: '1px solid rgba(33, 150, 243, 0.3)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                          <h4 style={{ color: '#2196f3', fontSize: '16px', fontWeight: '600', margin: 0 }}>
                            🖼️ Image Prompt
                          </h4>
                          <button
                            onClick={() => handleGenerateFromPrompt(promptSuggestions[trend.id].image_prompt, 'image')}
                            style={{
                              padding: '6px 12px',
                              background: 'rgba(33, 150, 243, 0.2)',
                              border: '1px solid rgba(33, 150, 243, 0.4)',
                              borderRadius: '6px',
                              color: '#2196f3',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(33, 150, 243, 0.3)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(33, 150, 243, 0.2)'
                            }}
                          >
                            Generate Image →
                          </button>
                        </div>
                        <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', lineHeight: '1.6', margin: 0, fontStyle: 'italic' }}>
                          "{promptSuggestions[trend.id].image_prompt}"
                        </p>
                      </div>
                    )}
                    {promptSuggestions[trend.id].video_prompt && (
                      <div
                        style={{
                          padding: '16px',
                          background: 'rgba(156, 39, 176, 0.1)',
                          borderRadius: '8px',
                          border: '1px solid rgba(156, 39, 176, 0.3)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                          <h4 style={{ color: '#9c27b0', fontSize: '16px', fontWeight: '600', margin: 0 }}>
                            🎬 Video Prompt
                          </h4>
                          <button
                            onClick={() => handleGenerateFromPrompt(promptSuggestions[trend.id].video_prompt, 'video')}
                            style={{
                              padding: '6px 12px',
                              background: 'rgba(156, 39, 176, 0.2)',
                              border: '1px solid rgba(156, 39, 176, 0.4)',
                              borderRadius: '6px',
                              color: '#9c27b0',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(156, 39, 176, 0.3)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(156, 39, 176, 0.2)'
                            }}
                          >
                            Generate Video →
                          </button>
                        </div>
                        <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', lineHeight: '1.6', margin: 0, fontStyle: 'italic' }}>
                          "{promptSuggestions[trend.id].video_prompt}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
