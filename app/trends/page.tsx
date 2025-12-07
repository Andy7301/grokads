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

interface AdSuggestion {
  headline: string
  copy: string
  audience: string
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
  const [adSuggestions, setAdSuggestions] = useState<Record<number, AdSuggestion[]>>({})
  const [loadingSuggestions, setLoadingSuggestions] = useState<Record<number, boolean>>({})
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null)

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

  const getImageFunctionUrl = () => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return process.env.NEXT_PUBLIC_IMAGE_FUNCTION_URL || 
        'http://localhost:5001/grokads-47abba/us-central1/generate_image'
    }
    return process.env.NEXT_PUBLIC_IMAGE_FUNCTION_URL || 
      'http://localhost:5001/grokads-47abba/us-central1/generate_image'
  }

  const TRENDS_FUNCTION_URL = getTrendsFunctionUrl()
  const AD_SUGGESTIONS_URL = getAdSuggestionsUrl()
  const IMAGE_FUNCTION_URL = getImageFunctionUrl()

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
    router.push(`/?prompt=${encodeURIComponent(trend.title)}`)
  }

  const handleGenerateImage = async (trend: Trend) => {
    try {
      const response = await fetch(IMAGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: `Create an engaging advertisement image for: ${trend.title}`,
          quality: 'medium',
          n: 1,
          response_format: 'url'
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // Navigate to home page with image data in sessionStorage
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('generatedImage', JSON.stringify(data))
          router.push('/')
        }
      }
    } catch (err) {
      console.error('Error generating image:', err)
    }
  }

  const handleGetAdSuggestions = async (trend: Trend) => {
    if (adSuggestions[trend.id]) {
      setExpandedTrend(expandedTrend === trend.id ? null : trend.id)
      return
    }

    setLoadingSuggestions({ ...loadingSuggestions, [trend.id]: true })
    
    try {
      const response = await fetch(AD_SUGGESTIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trend: trend.title }),
      })

      if (response.ok) {
        const data = await response.json()
        setAdSuggestions({ ...adSuggestions, [trend.id]: data.suggestions || [] })
        setExpandedTrend(trend.id)
      }
    } catch (err) {
      console.error('Error fetching ad suggestions:', err)
    } finally {
      setLoadingSuggestions({ ...loadingSuggestions, [trend.id]: false })
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
        gap: '12px',
        marginBottom: '24px',
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
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

                {/* Quick Actions Menu */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setActionMenuOpen(actionMenuOpen === trend.id ? null : trend.id)}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    ⚡ Quick Actions
                  </button>
                  
                  {actionMenuOpen === trend.id && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '8px',
                      background: 'rgba(0, 0, 0, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '12px',
                      padding: '8px',
                      minWidth: '200px',
                      zIndex: 1000,
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
                    }}>
                      <button
                        onClick={() => {
                          handleUseInAd(trend)
                          setActionMenuOpen(null)
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#ffffff',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '14px',
                          transition: 'all 0.2s',
                          marginBottom: '4px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        🎯 Use in Ad Generator
                      </button>
                      <button
                        onClick={() => {
                          handleGenerateImage(trend)
                          setActionMenuOpen(null)
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#ffffff',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '14px',
                          transition: 'all 0.2s',
                          marginBottom: '4px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        🖼️ Generate Image
                      </button>
                      <button
                        onClick={() => {
                          handleGetAdSuggestions(trend)
                          setActionMenuOpen(null)
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#ffffff',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '14px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        💡 Get AI Ad Suggestions
                      </button>
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
                  🎯 Generate Ad
                </button>
                <button
                  onClick={() => handleGenerateImage(trend)}
                  style={{
                    padding: '10px 20px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flex: '1',
                    minWidth: '140px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                    e.currentTarget.style.borderColor = '#ffffff'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                  }}
                >
                  🖼️ Generate Image
                </button>
                <button
                  onClick={() => handleGetAdSuggestions(trend)}
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
                  {loadingSuggestions[trend.id] ? '⏳ Loading...' : '💡 AI Suggestions'}
                </button>
              </div>

              {/* Ad Suggestions */}
              {expandedTrend === trend.id && adSuggestions[trend.id] && (
                <div style={{
                  marginTop: '20px',
                  padding: '20px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px'
                }}>
                  <h3 style={{ color: '#ffffff', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                    💡 AI-Generated Ad Suggestions
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {adSuggestions[trend.id].map((suggestion, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '16px',
                          background: 'rgba(0, 0, 0, 0.3)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        <h4 style={{ color: '#ffbb33', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                          {suggestion.headline}
                        </h4>
                        <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', lineHeight: '1.6', marginBottom: '8px' }}>
                          {suggestion.copy}
                        </p>
                        <div style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.7)'
                        }}>
                          👥 {suggestion.audience}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Click outside to close menu */}
      {actionMenuOpen !== null && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setActionMenuOpen(null)}
        />
      )}
    </div>
  )
}
