'use client'

import { useState } from 'react'

export default function Home() {
  const [prompt, setPrompt] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Prompt submitted:', prompt)
    // You can add more functionality here later
  }

  return (
    <div className="container">
      <h1>Grok Ads</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="prompt">Describe your ad...</label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Create a social media ad for a new coffee shop opening in downtown, targeting millennials who love artisanal coffee..."
            required
          />
        </div>
        <button type="submit">Generate Ad</button>
      </form>
    </div>
  )
}

