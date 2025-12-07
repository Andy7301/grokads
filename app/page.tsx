'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Home() {
  const [prompt, setPrompt] = useState('')
  const [generatedAd, setGeneratedAd] = useState('')
  const [videoData, setVideoData] = useState<any>(null)
  const [imageData, setImageData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [error, setError] = useState('')

  // For local development with Firebase emulators, use localhost
  // For production, use the deployed Cloud Run URL
  const getFunctionUrl = () => {
    // Check if we're running locally
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return process.env.NEXT_PUBLIC_FUNCTION_URL || 
        'http://localhost:5001/grokads-47abba/us-central1/generate_ad'
    }
    // Production URL
    return 'https://generate-ad-k344u2ipmq-uc.a.run.app'
  }
  
  const FUNCTION_URL = getFunctionUrl()
  
  // Image generation function URL
  const getImageFunctionUrl = () => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return process.env.NEXT_PUBLIC_IMAGE_FUNCTION_URL || 
        'http://localhost:5001/grokads-47abba/us-central1/generate_image'
    }
    return process.env.NEXT_PUBLIC_IMAGE_FUNCTION_URL || 
      'http://localhost:5001/grokads-47abba/us-central1/generate_image'
  }
  
  const IMAGE_FUNCTION_URL = getImageFunctionUrl()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setGeneratedAd('')
    setVideoData(null)
    setImageData(null)

    try {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate ad')
      }

      const data = await response.json()
      
      // Handle video response
      if (data.video) {
        setVideoData(data.video)
        setGeneratedAd('')
      } else if (data.ad) {
        // Fallback for text ad (if still supported)
        setGeneratedAd(data.ad)
        setVideoData(null)
      }
      
      setPrompt('') // Clear the prompt after successful generation
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while generating the ad')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateImage = async () => {
    if (!prompt.trim()) return
    
    setImageLoading(true)
    setError('')
    setImageData(null)
    setVideoData(null)
    setGeneratedAd('')

    try {
      const response = await fetch(IMAGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt,
          quality: 'medium', // Can be 'low', 'medium', or 'high'
          n: 1,
          response_format: 'url' // or 'b64_json'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate image')
      }

      const data = await response.json()
      setImageData(data)
      setPrompt('') // Clear the prompt after successful generation
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while generating the image')
    } finally {
      setImageLoading(false)
    }
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0 }}>Grok Ads</h1>
        <Link 
          href="/trends" 
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
          View Trends →
        </Link>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="prompt">Describe your ad...</label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Create a social media ad for a new coffee shop opening in downtown, targeting millennials who love artisanal coffee..."
            required
            disabled={loading}
          />
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="submit" disabled={loading || imageLoading} style={{ flex: 1 }}>
            {loading ? 'Generating Video...' : 'Generate Video'}
          </button>
          <button 
            type="button" 
            onClick={handleGenerateImage}
            disabled={loading || imageLoading || !prompt.trim()}
            style={{ 
              flex: 1,
              background: loading || imageLoading ? 'rgba(255, 255, 255, 0.3)' : '#ffffff',
              color: loading || imageLoading ? 'rgba(0, 0, 0, 0.5)' : '#000000'
            }}
          >
            {imageLoading ? 'Generating Image...' : 'Generate Image'}
          </button>
        </div>
      </form>
      
      {imageLoading && (
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(76, 175, 80, 0.1)',
          border: '1px solid rgba(76, 175, 80, 0.3)',
          borderRadius: '8px',
          color: '#4caf50',
          textAlign: 'center'
        }}>
          Generating image...
        </div>
      )}

      {error && (
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(244, 67, 54, 0.2)',
          border: '1px solid rgba(244, 67, 54, 0.5)',
          borderRadius: '8px',
          color: '#ff5252'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {videoData && (
        <div style={{
          marginTop: '24px',
          padding: '24px',
          background: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '12px'
        }}>
          <h2 style={{ 
            color: '#ffffff', 
            fontSize: '20px', 
            marginBottom: '16px',
            fontWeight: '600'
          }}>
            Generated Video
          </h2>
          {videoData.video_base64 ? (
            <div style={{ marginBottom: '16px' }}>
              <video 
                controls 
                style={{
                  width: '100%',
                  maxWidth: '800px',
                  borderRadius: '8px',
                  background: '#000'
                }}
              >
                <source 
                  src={`data:${videoData.mime_type || 'video/mp4'};base64,${videoData.video_base64}`} 
                  type={videoData.mime_type || 'video/mp4'} 
                />
                Your browser does not support the video tag.
              </video>
              <button
                onClick={() => {
                  const byteCharacters = atob(videoData.video_base64)
                  const byteNumbers = new Array(byteCharacters.length)
                  for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i)
                  }
                  const byteArray = new Uint8Array(byteNumbers)
                  const blob = new Blob([byteArray], { type: videoData.mime_type || 'video/mp4' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `grok-ad-${Date.now()}.${videoData.mime_type?.includes('mp4') ? 'mp4' : 'webm'}`
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                }}
                style={{
                  marginTop: '12px',
                  padding: '10px 20px',
                  background: 'rgba(76, 175, 80, 0.2)',
                  border: '1px solid rgba(76, 175, 80, 0.5)',
                  borderRadius: '6px',
                  color: '#4caf50',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(76, 175, 80, 0.3)'
                  e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.7)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(76, 175, 80, 0.2)'
                  e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.5)'
                }}
              >
                ↓ Download Video
              </button>
            </div>
          ) : videoData.video_url ? (
            <div style={{ marginBottom: '16px' }}>
              <video 
                controls 
                style={{
                  width: '100%',
                  maxWidth: '800px',
                  borderRadius: '8px',
                  background: '#000'
                }}
              >
                <source src={videoData.video_url} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <button
                onClick={() => {
                  const a = document.createElement('a')
                  a.href = videoData.video_url
                  a.download = `grok-ad-${Date.now()}.mp4`
                  a.target = '_blank'
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                }}
                style={{
                  marginTop: '12px',
                  padding: '10px 20px',
                  background: 'rgba(76, 175, 80, 0.2)',
                  border: '1px solid rgba(76, 175, 80, 0.5)',
                  borderRadius: '6px',
                  color: '#4caf50',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(76, 175, 80, 0.3)'
                  e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.7)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(76, 175, 80, 0.2)'
                  e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.5)'
                }}
              >
                ↓ Download Video
              </button>
            </div>
          ) : (
            <div style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '14px',
              marginBottom: '16px',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '6px'
            }}>
              Video ID: {videoData.id}<br />
              Status: {videoData.status || 'Processing...'}<br />
              {videoData.status !== 'completed' && (
                <span>Your video is being generated. Please check back shortly.</span>
              )}
            </div>
          )}
          {videoData.prompt && (
            <div style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '14px',
              marginBottom: '16px',
              fontStyle: 'italic'
            }}>
              Prompt: "{videoData.prompt}"
            </div>
          )}
          <button
            onClick={() => {
              setVideoData(null)
              setError('')
            }}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '6px',
              color: 'rgba(255, 255, 255, 0.8)',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
            }}
          >
            Clear
          </button>
        </div>
      )}

      {generatedAd && (
        <div style={{
          marginTop: '24px',
          padding: '24px',
          background: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '12px'
        }}>
          <h2 style={{ 
            color: '#ffffff', 
            fontSize: '20px', 
            marginBottom: '16px',
            fontWeight: '600'
          }}>
            Generated Ad
          </h2>
          <div style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '16px',
            lineHeight: '1.8',
            whiteSpace: 'pre-wrap'
          }}>
            {generatedAd}
          </div>
          <button
            onClick={() => {
              setGeneratedAd('')
              setError('')
            }}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '6px',
              color: 'rgba(255, 255, 255, 0.8)',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
            }}
          >
            Clear
          </button>
        </div>
      )}

      {imageData && imageData.data && imageData.data.length > 0 && (
        <div style={{
          marginTop: '24px',
          padding: '24px',
          background: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '12px'
        }}>
          <h2 style={{ 
            color: '#ffffff', 
            fontSize: '20px', 
            marginBottom: '16px',
            fontWeight: '600'
          }}>
            Generated Image
          </h2>
          {imageData.data.map((image: any, index: number) => (
            <div key={index} style={{ marginBottom: '20px' }}>
              {image.url ? (
                <div>
                  <img 
                    src={image.url} 
                    alt={`Generated image ${index + 1}`}
                    style={{
                      width: '100%',
                      maxWidth: '800px',
                      borderRadius: '8px',
                      marginBottom: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                  />
                  <button
                    onClick={() => {
                      const a = document.createElement('a')
                      a.href = image.url
                      a.download = `grok-image-${Date.now()}.png`
                      a.target = '_blank'
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                    }}
                    style={{
                      padding: '10px 20px',
                      background: 'rgba(76, 175, 80, 0.2)',
                      border: '1px solid rgba(76, 175, 80, 0.5)',
                      borderRadius: '6px',
                      color: '#4caf50',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(76, 175, 80, 0.3)'
                      e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.7)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(76, 175, 80, 0.2)'
                      e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.5)'
                    }}
                  >
                    ↓ Download Image
                  </button>
                </div>
              ) : image.b64_json ? (
                <div>
                  <img 
                    src={`data:image/png;base64,${image.b64_json}`} 
                    alt={`Generated image ${index + 1}`}
                    style={{
                      width: '100%',
                      maxWidth: '800px',
                      borderRadius: '8px',
                      marginBottom: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                  />
                  <button
                    onClick={() => {
                      const byteCharacters = atob(image.b64_json)
                      const byteNumbers = new Array(byteCharacters.length)
                      for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i)
                      }
                      const byteArray = new Uint8Array(byteNumbers)
                      const blob = new Blob([byteArray], { type: 'image/png' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `grok-image-${Date.now()}.png`
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                      URL.revokeObjectURL(url)
                    }}
                    style={{
                      padding: '10px 20px',
                      background: 'rgba(76, 175, 80, 0.2)',
                      border: '1px solid rgba(76, 175, 80, 0.5)',
                      borderRadius: '6px',
                      color: '#4caf50',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(76, 175, 80, 0.3)'
                      e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.7)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(76, 175, 80, 0.2)'
                      e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.5)'
                    }}
                  >
                    ↓ Download Image
                  </button>
                </div>
              ) : null}
              {image.revised_prompt && (
                <div style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '12px',
                  marginTop: '8px',
                  fontStyle: 'italic',
                  padding: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '4px'
                }}>
                  <strong>Revised prompt:</strong> {image.revised_prompt}
                </div>
              )}
            </div>
          ))}
          <button
            onClick={() => {
              setImageData(null)
              setError('')
            }}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '6px',
              color: 'rgba(255, 255, 255, 0.8)',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
            }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}

