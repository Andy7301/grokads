'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function Home() {
  const searchParams = useSearchParams()
  const [prompt, setPrompt] = useState('')
  const [generatedAd, setGeneratedAd] = useState('')
  const [videoData, setVideoData] = useState<any>(null)
  const [imageData, setImageData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Text overlay state
  const [overlayText, setOverlayText] = useState('')
  const [overlayPosition, setOverlayPosition] = useState({ x: 50, y: 50 })
  const [overlayFontSize, setOverlayFontSize] = useState(50)
  const [overlayColor, setOverlayColor] = useState('#ffffff')
  const [overlayStrokeColor, setOverlayStrokeColor] = useState('#000000')
  const [overlayStrokeWidth, setOverlayStrokeWidth] = useState(2)
  const [showOverlayControls, setShowOverlayControls] = useState(false)
  const [processingOverlay, setProcessingOverlay] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)

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
  
  // Text overlay function URL
  const getTextOverlayFunctionUrl = () => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return process.env.NEXT_PUBLIC_TEXT_OVERLAY_FUNCTION_URL || 
        'http://localhost:5001/grokads-47abba/us-central1/add_text_overlay'
    }
    return process.env.NEXT_PUBLIC_TEXT_OVERLAY_FUNCTION_URL || 
      'http://localhost:5001/grokads-47abba/us-central1/add_text_overlay'
  }
  
  const TEXT_OVERLAY_FUNCTION_URL = getTextOverlayFunctionUrl()
  
  // Handle video container click to set overlay position
  const handleVideoContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoContainerRef.current || !showOverlayControls) return
    
    const rect = videoContainerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    
    setOverlayPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) })
  }
  
  // Handle download with text overlay
  const handleDownloadWithOverlay = async () => {
    if (!videoData || !overlayText.trim()) {
      setError('Please enter text for the overlay')
      return
    }
    
    setProcessingOverlay(true)
    setError('')
    
    try {
      // Get video base64 or URL
      let videoInput: { video_base64?: string; video_url?: string } = {}
      
      if (videoData.video_base64) {
        videoInput.video_base64 = videoData.video_base64
      } else if (videoData.video_url) {
        videoInput.video_url = videoData.video_url
      } else {
        throw new Error('No video data available')
      }
      
      // Get video dimensions for position calculation
      const video = videoRef.current
      if (!video) {
        throw new Error('Video element not found')
      }
      
      // Wait for video metadata if not loaded
      if (!video.videoWidth || !video.videoHeight) {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Video metadata not available'))
          }, 5000)
          
          const onLoadedMetadata = () => {
            clearTimeout(timeout)
            video.removeEventListener('loadedmetadata', onLoadedMetadata)
            resolve(true)
          }
          
          video.addEventListener('loadedmetadata', onLoadedMetadata)
          if (video.readyState >= 1) {
            clearTimeout(timeout)
            video.removeEventListener('loadedmetadata', onLoadedMetadata)
            resolve(true)
          }
        })
      }
      
      // Calculate absolute position from percentage
      // Use natural video dimensions
      const videoWidth = video.videoWidth || 800
      const videoHeight = video.videoHeight || 600
      const absoluteX = (overlayPosition.x / 100) * videoWidth
      const absoluteY = (overlayPosition.y / 100) * videoHeight
      
      // Call backend to add text overlay
      const response = await fetch(TEXT_OVERLAY_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...videoInput,
          text: overlayText,
          position_x: Math.round(absoluteX),
          position_y: Math.round(absoluteY),
          font_size: overlayFontSize,
          font_color: overlayColor,
          stroke_color: overlayStrokeColor,
          stroke_width: overlayStrokeWidth,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add text overlay')
      }
      
      const data = await response.json()
      
      // Download the processed video
      if (data.video_base64) {
        const byteCharacters = atob(data.video_base64)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: data.mime_type || 'video/mp4' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `grok-ad-with-overlay-${Date.now()}.mp4`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing the video')
    } finally {
      setProcessingOverlay(false)
    }
  }

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
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link 
            href="/studio" 
            style={{ 
              color: 'rgba(255, 255, 255, 0.8)', 
              textDecoration: 'none',
              fontSize: '14px',
              padding: '8px 16px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
          >
            🎯 Studio →
          </Link>
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
          >
            Trends →
          </Link>
        </div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ 
              color: '#ffffff', 
              fontSize: '20px', 
              margin: 0,
              fontWeight: '600'
            }}>
              Generated Video
            </h2>
            <button
              onClick={() => setShowOverlayControls(!showOverlayControls)}
              style={{
                padding: '8px 16px',
                background: showOverlayControls ? 'rgba(33, 150, 243, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                border: `1px solid ${showOverlayControls ? 'rgba(33, 150, 243, 0.5)' : 'rgba(255, 255, 255, 0.3)'}`,
                borderRadius: '6px',
                color: showOverlayControls ? '#2196f3' : 'rgba(255, 255, 255, 0.8)',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
            >
              {showOverlayControls ? '✕ Hide Overlay' : '✏️ Add Text Overlay'}
            </button>
          </div>
          
          {videoData.video_base64 ? (
            <div style={{ marginBottom: '16px' }}>
              <div 
                ref={videoContainerRef}
                onClick={handleVideoContainerClick}
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: '100%',
                  maxWidth: '800px',
                  cursor: showOverlayControls ? 'crosshair' : 'default'
                }}
              >
                <video 
                  ref={videoRef}
                  controls 
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    background: '#000',
                    display: 'block'
                  }}
                >
                <source 
                  src={`data:${videoData.mime_type || 'video/mp4'};base64,${videoData.video_base64}`} 
                  type={videoData.mime_type || 'video/mp4'} 
                />
                Your browser does not support the video tag.
              </video>
              {showOverlayControls && overlayText && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${overlayPosition.x}%`,
                    top: `${overlayPosition.y}%`,
                    transform: 'translate(-50%, -50%)',
                    color: overlayColor,
                    fontSize: `${overlayFontSize}px`,
                    fontWeight: 'bold',
                    // Use CSS text-stroke to better match backend MoviePy stroke rendering
                    WebkitTextStroke: `${overlayStrokeWidth}px ${overlayStrokeColor}`,
                    // Fallback textShadow for browsers that don't support text-stroke
                    textShadow: overlayStrokeWidth > 0 
                      ? `-${overlayStrokeWidth}px -${overlayStrokeWidth}px 0 ${overlayStrokeColor}, ${overlayStrokeWidth}px -${overlayStrokeWidth}px 0 ${overlayStrokeColor}, -${overlayStrokeWidth}px ${overlayStrokeWidth}px 0 ${overlayStrokeColor}, ${overlayStrokeWidth}px ${overlayStrokeWidth}px 0 ${overlayStrokeColor}`
                      : 'none',
                    paintOrder: 'stroke fill',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                    fontFamily: 'Arial, sans-serif', // Match default backend font
                    lineHeight: 1.2 // Match backend line height
                  }}
                >
                  {overlayText}
                </div>
              )}
              </div>
              
              {showOverlayControls && (
                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', marginBottom: '6px' }}>
                      Overlay Text
                    </label>
                    <input
                      type="text"
                      value={overlayText}
                      onChange={(e) => setOverlayText(e.target.value)}
                      placeholder="Enter text to overlay..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.9)', fontSize: '12px', marginBottom: '6px' }}>
                        Font Size: {overlayFontSize}px
                      </label>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={overlayFontSize}
                        onChange={(e) => setOverlayFontSize(Number(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.9)', fontSize: '12px', marginBottom: '6px' }}>
                        Stroke Width: {overlayStrokeWidth}px
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        value={overlayStrokeWidth}
                        onChange={(e) => setOverlayStrokeWidth(Number(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.9)', fontSize: '12px', marginBottom: '6px' }}>
                        Text Color
                      </label>
                      <input
                        type="color"
                        value={overlayColor}
                        onChange={(e) => setOverlayColor(e.target.value)}
                        style={{
                          width: '100%',
                          height: '40px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.9)', fontSize: '12px', marginBottom: '6px' }}>
                        Stroke Color
                      </label>
                      <input
                        type="color"
                        value={overlayStrokeColor}
                        onChange={(e) => setOverlayStrokeColor(e.target.value)}
                        style={{
                          width: '100%',
                          height: '40px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      />
                    </div>
                  </div>
                  
                  <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px', marginBottom: '12px' }}>
                    💡 Click on the video to position the text overlay
                  </div>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  onClick={handleDownloadWithOverlay}
                  disabled={processingOverlay || !overlayText.trim()}
                  style={{
                    padding: '10px 20px',
                    background: processingOverlay || !overlayText.trim() ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.3)',
                    border: '1px solid rgba(76, 175, 80, 0.5)',
                    borderRadius: '6px',
                    color: processingOverlay || !overlayText.trim() ? 'rgba(76, 175, 80, 0.5)' : '#4caf50',
                    cursor: processingOverlay || !overlayText.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    flex: 1
                  }}
                >
                  {processingOverlay ? '⏳ Processing...' : '↓ Download with Overlay'}
                </button>
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
                    padding: '10px 20px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '6px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
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
                  ↓ Download Original
                </button>
              </div>
            </div>
          ) : videoData.video_url ? (
            <div style={{ marginBottom: '16px' }}>
              <div 
                ref={videoContainerRef}
                onClick={handleVideoContainerClick}
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: '100%',
                  maxWidth: '800px',
                  cursor: showOverlayControls ? 'crosshair' : 'default'
                }}
              >
                <video 
                  ref={videoRef}
                  controls 
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    background: '#000',
                    display: 'block'
                  }}
                >
                <source src={videoData.video_url} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              {showOverlayControls && overlayText && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${overlayPosition.x}%`,
                    top: `${overlayPosition.y}%`,
                    transform: 'translate(-50%, -50%)',
                    color: overlayColor,
                    fontSize: `${overlayFontSize}px`,
                    fontWeight: 'bold',
                    // Use CSS text-stroke to better match backend MoviePy stroke rendering
                    WebkitTextStroke: `${overlayStrokeWidth}px ${overlayStrokeColor}`,
                    // Fallback textShadow for browsers that don't support text-stroke
                    textShadow: overlayStrokeWidth > 0 
                      ? `-${overlayStrokeWidth}px -${overlayStrokeWidth}px 0 ${overlayStrokeColor}, ${overlayStrokeWidth}px -${overlayStrokeWidth}px 0 ${overlayStrokeColor}, -${overlayStrokeWidth}px ${overlayStrokeWidth}px 0 ${overlayStrokeColor}, ${overlayStrokeWidth}px ${overlayStrokeWidth}px 0 ${overlayStrokeColor}`
                      : 'none',
                    paintOrder: 'stroke fill',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                    fontFamily: 'Arial, sans-serif', // Match default backend font
                    lineHeight: 1.2 // Match backend line height
                  }}
                >
                  {overlayText}
                </div>
              )}
              </div>
              
              {showOverlayControls && (
                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', marginBottom: '6px' }}>
                      Overlay Text
                    </label>
                    <input
                      type="text"
                      value={overlayText}
                      onChange={(e) => setOverlayText(e.target.value)}
                      placeholder="Enter text to overlay..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.9)', fontSize: '12px', marginBottom: '6px' }}>
                        Font Size: {overlayFontSize}px
                      </label>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={overlayFontSize}
                        onChange={(e) => setOverlayFontSize(Number(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.9)', fontSize: '12px', marginBottom: '6px' }}>
                        Stroke Width: {overlayStrokeWidth}px
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        value={overlayStrokeWidth}
                        onChange={(e) => setOverlayStrokeWidth(Number(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.9)', fontSize: '12px', marginBottom: '6px' }}>
                        Text Color
                      </label>
                      <input
                        type="color"
                        value={overlayColor}
                        onChange={(e) => setOverlayColor(e.target.value)}
                        style={{
                          width: '100%',
                          height: '40px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.9)', fontSize: '12px', marginBottom: '6px' }}>
                        Stroke Color
                      </label>
                      <input
                        type="color"
                        value={overlayStrokeColor}
                        onChange={(e) => setOverlayStrokeColor(e.target.value)}
                        style={{
                          width: '100%',
                          height: '40px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      />
                    </div>
                  </div>
                  
                  <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px', marginBottom: '12px' }}>
                    💡 Click on the video to position the text overlay
                  </div>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  onClick={handleDownloadWithOverlay}
                  disabled={processingOverlay || !overlayText.trim()}
                  style={{
                    padding: '10px 20px',
                    background: processingOverlay || !overlayText.trim() ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.3)',
                    border: '1px solid rgba(76, 175, 80, 0.5)',
                    borderRadius: '6px',
                    color: processingOverlay || !overlayText.trim() ? 'rgba(76, 175, 80, 0.5)' : '#4caf50',
                    cursor: processingOverlay || !overlayText.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    flex: 1
                  }}
                >
                  {processingOverlay ? '⏳ Processing...' : '↓ Download with Overlay'}
                </button>
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
                    padding: '10px 20px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '6px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
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
                  ↓ Download Original
                </button>
              </div>
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
              setOverlayText('')
              setShowOverlayControls(false)
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

