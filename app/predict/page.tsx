'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Prediction {
  ctr: number
  conversion_rate: number
  cpc: number
  cpa: number
  engagement_score: number
  risk_factors: string[]
  recommendations: string[]
  confidence: number
}

export default function PredictPage() {
  const [ad, setAd] = useState({ headline: '', copy: '', cta: '' })
  const [targetAudience, setTargetAudience] = useState('General')
  const [channel, setChannel] = useState('social_media')
  const [budget, setBudget] = useState(1000)
  const [loading, setLoading] = useState(false)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [error, setError] = useState('')

  const getFunctionUrl = () => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:5001/grokads-47abba/us-central1/predict_performance'
    }
    return 'http://localhost:5001/grokads-47abba/us-central1/predict_performance'
  }

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setPrediction(null)

    try {
      const response = await fetch(getFunctionUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ad,
          target_audience: targetAudience,
          channel,
          budget
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to predict performance')
      }

      const data = await response.json()
      setPrediction(data.prediction)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '36px', fontWeight: '700' }}>📊 Performance Predictor</h1>
          <p style={{ margin: '8px 0 0 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '16px' }}>
            Predict ad performance before spending
          </p>
        </div>
        <Link href="/studio" style={{ 
          color: 'rgba(255, 255, 255, 0.8)', 
          textDecoration: 'none',
          padding: '10px 20px',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          ← Studio
        </Link>
      </div>

      <form onSubmit={handlePredict} style={{
        background: 'rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '32px'
      }}>
        <h2 style={{ color: '#ffffff', fontSize: '20px', marginBottom: '24px' }}>Ad Content</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>
            Headline *
          </label>
          <input
            type="text"
            value={ad.headline}
            onChange={(e) => setAd({ ...ad, headline: e.target.value })}
            required
            placeholder="Enter ad headline"
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

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>
            Ad Copy *
          </label>
          <textarea
            value={ad.copy}
            onChange={(e) => setAd({ ...ad, copy: e.target.value })}
            required
            rows={4}
            placeholder="Enter ad copy"
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
            Call-to-Action *
          </label>
          <input
            type="text"
            value={ad.cta}
            onChange={(e) => setAd({ ...ad, cta: e.target.value })}
            required
            placeholder="e.g., Learn More, Buy Now"
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>
              Target Audience
            </label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Gen Z, 25-35"
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
              Channel
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
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
              <option value="social_media">Social Media</option>
              <option value="search">Search</option>
              <option value="display">Display</option>
              <option value="video">Video</option>
              <option value="email">Email</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>
              Budget ($)
            </label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(parseFloat(e.target.value) || 1000)}
              min="100"
              step="100"
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

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px 24px',
            background: loading ? 'rgba(255, 255, 255, 0.3)' : '#ffffff',
            color: loading ? 'rgba(0, 0, 0, 0.5)' : '#000000',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '📊 Predicting...' : '📊 Predict Performance'}
        </button>
      </form>

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

      {prediction && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '16px',
          padding: '32px'
        }}>
          <h2 style={{ color: '#ffffff', fontSize: '24px', marginBottom: '24px' }}>
            📊 Performance Prediction
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#ffbb33', fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
                {prediction.ctr.toFixed(2)}%
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>CTR</div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#4caf50', fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
                {prediction.conversion_rate.toFixed(2)}%
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>Conversion Rate</div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#2196f3', fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
                ${prediction.cpc.toFixed(2)}
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>CPC</div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#ff9800', fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
                ${prediction.cpa.toFixed(2)}
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>CPA</div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#9c27b0', fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
                {prediction.engagement_score}
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>Engagement Score</div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#00bcd4', fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
                {prediction.confidence}%
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>Confidence</div>
            </div>
          </div>

          {prediction.risk_factors && prediction.risk_factors.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ color: '#ff5252', fontSize: '18px', marginBottom: '12px' }}>⚠️ Risk Factors</h3>
              <ul style={{ color: 'rgba(255, 255, 255, 0.8)', paddingLeft: '20px' }}>
                {prediction.risk_factors.map((risk, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{risk}</li>
                ))}
              </ul>
            </div>
          )}

          {prediction.recommendations && prediction.recommendations.length > 0 && (
            <div>
              <h3 style={{ color: '#4caf50', fontSize: '18px', marginBottom: '12px' }}>💡 Optimization Recommendations</h3>
              <ul style={{ color: 'rgba(255, 255, 255, 0.8)', paddingLeft: '20px' }}>
                {prediction.recommendations.map((rec, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

