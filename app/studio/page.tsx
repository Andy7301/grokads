'use client'

import { useState, useEffect } from 'react'
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
  image_prompt?: string
  video_prompt?: string
}

export default function StudioPage() {
  const router = useRouter()
  
  // Campaign Builder State
  const [product, setProduct] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [budget, setBudget] = useState('Medium')
  const [goals, setGoals] = useState<string[]>(['awareness', 'conversions'])
  const [numVariants, setNumVariants] = useState(10)
  const [campaignLoading, setCampaignLoading] = useState(false)
  const [campaignResult, setCampaignResult] = useState<{strategy: CampaignStrategy, variants: AdVariant[]} | null>(null)
  
  const [error, setError] = useState('')

  // Load campaign from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCampaign = localStorage.getItem('grokads_campaign_result')
      const savedFormData = localStorage.getItem('grokads_campaign_form')
      
      if (savedCampaign) {
        try {
          const campaign = JSON.parse(savedCampaign)
          setCampaignResult(campaign)
        } catch (e) {
          console.error('Failed to load saved campaign:', e)
        }
      }
      
      if (savedFormData) {
        try {
          const formData = JSON.parse(savedFormData)
          setProduct(formData.product || '')
          setTargetAudience(formData.targetAudience || '')
          setBudget(formData.budget || 'Medium')
          setGoals(formData.goals || ['awareness', 'conversions'])
          setNumVariants(formData.numVariants || 10)
        } catch (e) {
          console.error('Failed to load saved form data:', e)
        }
      }
    }
  }, [])

  // Save campaign to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && campaignResult) {
      localStorage.setItem('grokads_campaign_result', JSON.stringify(campaignResult))
    }
  }, [campaignResult])

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const formData = {
        product,
        targetAudience,
        budget,
        goals,
        numVariants
      }
      localStorage.setItem('grokads_campaign_form', JSON.stringify(formData))
    }
  }, [product, targetAudience, budget, goals, numVariants])

  const getFunctionUrl = (functionName: string) => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return `http://localhost:5001/grokads-47abba/us-central1/${functionName}`
    }
    return `http://localhost:5001/grokads-47abba/us-central1/${functionName}`
  }

  const handleExportCampaign = () => {
    if (!campaignResult) return

    const exportData = {
      campaign: campaignResult,
      formData: {
        product,
        targetAudience,
        budget,
        goals,
        numVariants
      },
      exportedAt: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `campaign-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleCopyCampaign = async () => {
    if (!campaignResult) return

    const exportData = {
      campaign: campaignResult,
      formData: {
        product,
        targetAudience,
        budget,
        goals,
        numVariants
      },
      exportedAt: new Date().toISOString()
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2))
      alert('Campaign copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy:', err)
      alert('Failed to copy campaign to clipboard')
    }
  }

  const handleClearCampaign = () => {
    if (confirm('Are you sure you want to clear the current campaign? This cannot be undone.')) {
      setCampaignResult(null)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('grokads_campaign_result')
        localStorage.removeItem('grokads_campaign_form')
      }
    }
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


  return (
    <div className="container" style={{ maxWidth: '1200px', margin: '20px auto', padding: '0 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '36px', fontWeight: '700' }}>🎯 Viralize Studio</h1>
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

      {/* Campaign Builder */}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ color: '#ffffff', fontSize: '24px', margin: 0, marginBottom: '4px' }}>
                    📊 Campaign Strategy
                  </h2>
                  <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', margin: 0 }}>
                    💾 Auto-saved to browser storage
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleExportCampaign}
                    style={{
                      padding: '8px 16px',
                      background: 'rgba(33, 150, 243, 0.2)',
                      border: '1px solid rgba(33, 150, 243, 0.4)',
                      borderRadius: '6px',
                      color: '#2196f3',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(33, 150, 243, 0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(33, 150, 243, 0.2)'
                    }}
                  >
                    💾 Export JSON
                  </button>
                  <button
                    onClick={handleCopyCampaign}
                    style={{
                      padding: '8px 16px',
                      background: 'rgba(76, 175, 80, 0.2)',
                      border: '1px solid rgba(76, 175, 80, 0.4)',
                      borderRadius: '6px',
                      color: '#4caf50',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(76, 175, 80, 0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(76, 175, 80, 0.2)'
                    }}
                  >
                    📋 Copy
                  </button>
                  <button
                    onClick={handleClearCampaign}
                    style={{
                      padding: '8px 16px',
                      background: 'rgba(244, 67, 54, 0.2)',
                      border: '1px solid rgba(244, 67, 54, 0.4)',
                      borderRadius: '6px',
                      color: '#f44336',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(244, 67, 54, 0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(244, 67, 54, 0.2)'
                    }}
                  >
                    🗑️ Clear
                  </button>
                </div>
              </div>
              
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
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                {campaignResult.variants?.map((variant, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <h4 style={{ color: '#ffffff', fontSize: '16px', marginBottom: '4px', fontWeight: '600' }}>
                      {variant.headline}
                    </h4>
                    <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', lineHeight: '1.6', marginBottom: '8px' }}>
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
                      marginBottom: '12px',
                      width: 'fit-content'
                    }}>
                      {variant.cta}
                    </div>
                    
                    {/* Image and Video Prompt Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                      {variant.image_prompt && (
                        <div style={{
                          padding: '10px',
                          background: 'rgba(33, 150, 243, 0.1)',
                          border: '1px solid rgba(33, 150, 243, 0.3)',
                          borderRadius: '8px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                            <span style={{ color: '#2196f3', fontSize: '12px', fontWeight: '600' }}>🖼️ Image Prompt:</span>
                            <button
                              onClick={() => router.push(`/?prompt=${encodeURIComponent(variant.image_prompt!)}`)}
                              style={{
                                padding: '4px 10px',
                                background: 'rgba(33, 150, 243, 0.2)',
                                border: '1px solid rgba(33, 150, 243, 0.4)',
                                borderRadius: '4px',
                                color: '#2196f3',
                                fontSize: '11px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s'
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
                          <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', lineHeight: '1.4', margin: 0, fontStyle: 'italic' }}>
                            "{variant.image_prompt}"
                          </p>
                        </div>
                      )}
                      
                      {variant.video_prompt && (
                        <div style={{
                          padding: '10px',
                          background: 'rgba(156, 39, 176, 0.1)',
                          border: '1px solid rgba(156, 39, 176, 0.3)',
                          borderRadius: '8px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                            <span style={{ color: '#9c27b0', fontSize: '12px', fontWeight: '600' }}>🎬 Video Prompt:</span>
                            <button
                              onClick={() => router.push(`/?prompt=${encodeURIComponent(variant.video_prompt!)}`)}
                              style={{
                                padding: '4px 10px',
                                background: 'rgba(156, 39, 176, 0.2)',
                                border: '1px solid rgba(156, 39, 176, 0.4)',
                                borderRadius: '4px',
                                color: '#9c27b0',
                                fontSize: '11px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s'
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
                          <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', lineHeight: '1.4', margin: 0, fontStyle: 'italic' }}>
                            "{variant.video_prompt}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
  )
}

