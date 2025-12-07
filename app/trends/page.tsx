'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Trend {
  id: number
  title: string
  category: string
  change: number
  description: string
}

export default function TrendsPage() {
  const [trends, setTrends] = useState<Trend[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    // Simulate loading trends data
    setTimeout(() => {
      const mockTrends: Trend[] = [
        {
          id: 1,
          title: 'AI-Generated Content',
          category: 'technology',
          change: 45,
          description: 'Marketers are increasingly using AI to create personalized ad content at scale'
        },
        {
          id: 2,
          title: 'Video-First Advertising',
          category: 'format',
          change: 32,
          description: 'Short-form video ads are dominating social media platforms'
        },
        {
          id: 3,
          title: 'Sustainability Messaging',
          category: 'theme',
          change: 28,
          description: 'Brands are emphasizing eco-friendly practices in their campaigns'
        },
        {
          id: 4,
          title: 'Interactive Ads',
          category: 'format',
          change: 23,
          description: 'Engagement rates are higher with interactive and shoppable ad formats'
        },
        {
          id: 5,
          title: 'Micro-Influencers',
          category: 'strategy',
          change: 19,
          description: 'Smaller influencers with niche audiences are proving more effective'
        },
        {
          id: 6,
          title: 'Voice Search Optimization',
          category: 'technology',
          change: 15,
          description: 'Optimizing ads for voice-activated devices and assistants'
        }
      ]
      setTrends(mockTrends)
      setLoading(false)
    }, 800)
  }, [])

  const categories = ['all', 'technology', 'format', 'theme', 'strategy']
  const filteredTrends = selectedCategory === 'all' 
    ? trends 
    : trends.filter(trend => trend.category === selectedCategory)

  return (
    <div className="container" style={{ maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1>Advertising Trends</h1>
        <Link 
          href="/" 
          style={{ 
            color: 'rgba(255, 255, 255, 0.8)', 
            textDecoration: 'none',
            fontSize: '14px',
            padding: '8px 16px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '6px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#ffffff'
            e.currentTarget.style.color = '#ffffff'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'
          }}
        >
          ← Back to Home
        </Link>
      </div>

      <div style={{ marginBottom: '24px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            style={{
              padding: '8px 16px',
              background: selectedCategory === category 
                ? '#ffffff' 
                : 'rgba(0, 0, 0, 0.5)',
              color: selectedCategory === category 
                ? '#000000' 
                : 'rgba(255, 255, 255, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              textTransform: 'capitalize',
              transition: 'all 0.2s',
              fontWeight: selectedCategory === category ? '600' : '400'
            }}
          >
            {category}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255, 255, 255, 0.6)' }}>
          Loading trends...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredTrends.map(trend => (
            <div
              key={trend.id}
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '20px',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)'
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '600', margin: 0 }}>
                  {trend.title}
                </h2>
                <div style={{
                  background: trend.change > 30 ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 152, 0, 0.2)',
                  color: trend.change > 30 ? '#4caf50' : '#ff9800',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  +{trend.change}%
                </div>
              </div>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
                {trend.description}
              </p>
              <div style={{ marginTop: '12px' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  textTransform: 'capitalize'
                }}>
                  {trend.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

