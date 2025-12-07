'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface CampaignStrategy {
  overview: string
  positioning: string
  messaging_pillars: string[]
  audience_insights: string
  channels: string[]
  budget_allocation: Record<string, string>
  success_metrics: string[]
}

interface AdVariant {
  headline: string
  copy: string
  cta: string
  visual_style?: string
  emotion?: string
  angle?: string
}

export default function StudioPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'campaign' | 'variants' | 'trend-pipeline'>('campaign')
  
  // Campaign Builder State
  const [product, setProduct] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [budget, setBudget] = useState('Medium')
  const [goals, setGoals] = useState<string[]>(['awareness', 'conversions'])
  const [numVariants, setNumVariants] = useState(10)
  const [campaignLoading, setCampaignLoading] = useState(false)
  const [campaignResult, setCampaignResult] = useState<{strategy: CampaignStrategy, variants: AdVariant[]} | null>(null)
  
  // Variants Generator State
  const [variantPrompt, setVariantPrompt] = useState('')
  const [variantCount, setVariantCount] = useState(10)
  const [variantsLoading, setVariantsLoading] = useState(false)
  const [generatedVariants, setGeneratedVariants] = useState<AdVariant[]>([])
  
  // Trend Pipeline State
  const [trendProduct, setTrendProduct] = useState('')
  const [trendPipelineLoading, setTrendPipelineLoading] = useState(false)
  const [trendAdResult, setTrendAdResult] = useState<any>(null)
  
  const [error, setError] = useState('')

  const getFunctionUrl = (functionName: string) => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return `http://localhost:5001/grokads-47abba/us-central1/${functionName}`
    }
    return `http://localhost:5001/grokads-47abba/us-central1/${functionName}`
  }

  const handleBuildCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    setCampaignLoading(true)
    setError('')
    setCampaignResult(null)

    try {
      const response = await fetch(getFunctionUrl('build_campaign'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product,
          target_audience: targetAudience,
          budget,
          goals,
          num_variants: numVariants
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to build campaign')
      }

      const data = await response.json()
      setCampaignResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setCampaignLoading(false)
    }
  }

  const handleGenerateVariants = async (e: React.FormEvent) => {
    e.preventDefault()
    setVariantsLoading(true)
    setError('')
    setGeneratedVariants([])

    try {
      const response = await fetch(getFunctionUrl('generate_variants'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: variantPrompt,
          num_variants: variantCount,
          personalization: {}
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate variants')
      }

      const data = await response.json()
      setGeneratedVariants(data.variants || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setVariantsLoading(false)
    }
  }

  const handleTrendPipeline = async (e: React.FormEvent) => {
    e.preventDefault()
    setTrendPipelineLoading(true)
    setError('')
    setTrendAdResult(null)

    try {
      const response = await fetch(getFunctionUrl('trend_to_ad_pipeline'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: trendProduct,
          woeid: '23424977'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate trend ad')
      }

      const data = await response.json()
      setTrendAdResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setTrendPipelineLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: '1200px', margin: '20px auto', padding: '0 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '36px', fontWeight: '700' }}>🎯 Grok Ads Studio</h1>
          <p style={{ margin: '8px 0 0 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '16px' }}>
            AI-Powered Advertising Platform
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/" style={{ 
            color: 'rgba(255, 255, 255, 0.8)', 
            textDecoration: 'none',
            padding: '10px 20px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}>
            ← Home
          </Link>
          <Link href="/trends" style={{ 
            color: 'rgba(255, 255, 255, 0.8)', 
            textDecoration: 'none',
            padding: '10px 20px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}>
            Trends →
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '32px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        {[
          { id: 'campaign', label: '🚀 Campaign Builder', desc: 'Full-funnel strategy' },
          { id: 'variants', label: '✨ Variant Generator', desc: '10-50 personalized ads' },
          { id: 'trend-pipeline', label: '🔥 Trend Pipeline', desc: 'Real-time trend → ad' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '12px 24px',
              background: activeTab === tab.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #ffffff' : '2px solid transparent',
              color: activeTab === tab.id ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? '600' : '400',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '4px'
            }}
          >
            <span>{tab.label}</span>
            <span style={{ fontSize: '11px', opacity: 0.7 }}>{tab.desc}</span>
          </button>
        ))}
      </div>

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
          {error}
        </div>
      )}

      {/* Campaign Builder Tab */}
      {activeTab === 'campaign' && (
        <div>
          <form onSubmit={handleBuildCampaign} style={{ marginBottom: '32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>
                  Product/Service *
                </label>
                <input
                  type="text"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  required
                  placeholder="e.g., AI-powered productivity app"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>
                  Target Audience *
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  required
                  placeholder="e.g., Gen Z professionals, 25-35"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>
                  Budget
                </label>
                <select
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}
                >
                  <option value="Low">Low ($1K-$10K)</option>
                  <option value="Medium">Medium ($10K-$50K)</option>
                  <option value="High">High ($50K+)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>
                  Number of Variants
                </label>
                <input
                  type="number"
                  value={numVariants}
                  onChange={(e) => setNumVariants(parseInt(e.target.value) || 10)}
                  min="1"
                  max="50"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>
                Campaign Goals
              </label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {['awareness', 'conversions', 'engagement', 'retention'].map(goal => (
                  <label key={goal} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={goals.includes(goal)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setGoals([...goals, goal])
                        } else {
                          setGoals(goals.filter(g => g !== goal))
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ color: '#ffffff', fontSize: '14px', textTransform: 'capitalize' }}>{goal}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={campaignLoading}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: campaignLoading ? 'rgba(255, 255, 255, 0.3)' : '#ffffff',
                color: campaignLoading ? 'rgba(0, 0, 0, 0.5)' : '#000000',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: campaignLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {campaignLoading ? '🚀 Building Campaign...' : '🚀 Build Full Campaign'}
            </button>
          </form>

          {campaignResult && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '16px',
              padding: '32px',
              marginTop: '32px'
            }}>
              <h2 style={{ color: '#ffffff', fontSize: '24px', marginBottom: '24px' }}>
                📊 Campaign Strategy
              </h2>
              
              {campaignResult.strategy && (
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ color: '#ffbb33', fontSize: '18px', marginBottom: '8px' }}>Overview</h3>
                    <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6' }}>
                      {campaignResult.strategy.overview || 'No overview available'}
                    </p>
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ color: '#ffbb33', fontSize: '18px', marginBottom: '8px' }}>Positioning</h3>
                    <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6' }}>
                      {campaignResult.strategy.positioning || 'No positioning available'}
                    </p>
                  </div>
                  
                  {campaignResult.strategy.messaging_pillars && (
                    <div style={{ marginBottom: '16px' }}>
                      <h3 style={{ color: '#ffbb33', fontSize: '18px', marginBottom: '8px' }}>Messaging Pillars</h3>
                      <ul style={{ color: 'rgba(255, 255, 255, 0.8)', paddingLeft: '20px' }}>
                        {campaignResult.strategy.messaging_pillars.map((pillar, i) => (
                          <li key={i} style={{ marginBottom: '4px' }}>{pillar}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <h2 style={{ color: '#ffffff', fontSize: '24px', marginBottom: '24px', marginTop: '32px' }}>
                ✨ Generated Ad Variants ({campaignResult.variants?.length || 0})
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {campaignResult.variants?.map((variant, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '20px'
                    }}
                  >
                    <h4 style={{ color: '#ffffff', fontSize: '16px', marginBottom: '12px', fontWeight: '600' }}>
                      {variant.headline}
                    </h4>
                    <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', lineHeight: '1.6', marginBottom: '12px' }}>
                      {variant.copy}
                    </p>
                    <div style={{
                      display: 'inline-block',
                      padding: '6px 12px',
                      background: '#ffffff',
                      color: '#000000',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {variant.cta}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Variants Generator Tab */}
      {activeTab === 'variants' && (
        <div>
          <form onSubmit={handleGenerateVariants} style={{ marginBottom: '32px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>
                Ad Prompt *
              </label>
              <textarea
                value={variantPrompt}
                onChange={(e) => setVariantPrompt(e.target.value)}
                required
                placeholder="Describe your product or service..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>
                Number of Variants (1-50)
              </label>
              <input
                type="number"
                value={variantCount}
                onChange={(e) => setVariantCount(parseInt(e.target.value) || 10)}
                min="1"
                max="50"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '14px'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={variantsLoading}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: variantsLoading ? 'rgba(255, 255, 255, 0.3)' : '#ffffff',
                color: variantsLoading ? 'rgba(0, 0, 0, 0.5)' : '#000000',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: variantsLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {variantsLoading ? `✨ Generating ${variantCount} Variants...` : `✨ Generate ${variantCount} Variants`}
            </button>
          </form>

          {generatedVariants.length > 0 && (
            <div>
              <h2 style={{ color: '#ffffff', fontSize: '24px', marginBottom: '24px' }}>
                ✨ Generated Variants ({generatedVariants.length})
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {generatedVariants.map((variant, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      padding: '20px'
                    }}
                  >
                    <h4 style={{ color: '#ffffff', fontSize: '16px', marginBottom: '12px', fontWeight: '600' }}>
                      {variant.headline}
                    </h4>
                    <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', lineHeight: '1.6', marginBottom: '12px' }}>
                      {variant.copy}
                    </p>
                    <div style={{
                      display: 'inline-block',
                      padding: '6px 12px',
                      background: '#ffffff',
                      color: '#000000',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      marginBottom: '8px'
                    }}>
                      {variant.cta}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trend Pipeline Tab */}
      {activeTab === 'trend-pipeline' && (
        <div>
          <form onSubmit={handleTrendPipeline} style={{ marginBottom: '32px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>
                Your Product/Service
              </label>
              <input
                type="text"
                value={trendProduct}
                onChange={(e) => setTrendProduct(e.target.value)}
                placeholder="e.g., AI productivity tool"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '14px'
                }}
              />
              <p style={{ marginTop: '8px', color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                Leave empty to use the top trending topic
              </p>
            </div>

            <button
              type="submit"
              disabled={trendPipelineLoading}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: trendPipelineLoading ? 'rgba(255, 255, 255, 0.3)' : '#ffffff',
                color: trendPipelineLoading ? 'rgba(0, 0, 0, 0.5)' : '#000000',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: trendPipelineLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {trendPipelineLoading ? '🔥 Generating Trend Ad...' : '🔥 Generate from Latest Trend'}
            </button>
          </form>

          {trendAdResult && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '16px',
              padding: '32px'
            }}>
              <div style={{ marginBottom: '20px' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  background: 'rgba(255, 68, 0, 0.2)',
                  color: '#ff4400',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  marginBottom: '16px'
                }}>
                  🔥 Trending: {trendAdResult.trend}
                </span>
              </div>

              {trendAdResult.ad && (
                <div>
                  <h2 style={{ color: '#ffffff', fontSize: '24px', marginBottom: '16px' }}>
                    {trendAdResult.ad.headline}
                  </h2>
                  <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '16px', lineHeight: '1.6', marginBottom: '20px' }}>
                    {trendAdResult.ad.copy}
                  </p>
                  <div style={{
                    display: 'inline-block',
                    padding: '10px 20px',
                    background: '#ffffff',
                    color: '#000000',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '20px'
                  }}>
                    {trendAdResult.ad.cta}
                  </div>
                  
                  <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                    <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', marginBottom: '8px' }}>
                      <strong>Trend Connection:</strong> {trendAdResult.ad.trend_connection}
                    </p>
                    <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', marginBottom: '8px' }}>
                      <strong>Viral Potential:</strong> {trendAdResult.ad.viral_potential}
                    </p>
                    <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                      <strong>Urgency Level:</strong> {trendAdResult.ad.urgency_level}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

