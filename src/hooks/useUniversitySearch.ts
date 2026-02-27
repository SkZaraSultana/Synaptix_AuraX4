import { useState, useEffect, useRef } from 'react'

type University = {
  name: string
  country: string
}

// Expanded fallback list of popular universities
const FALLBACK_UNIVERSITIES: University[] = [
  // Indian Universities
  { name: 'Amrita Vishwa Vidyapeetham', country: 'India' },
  { name: 'VIT University (Vellore Institute of Technology)', country: 'India' },
  { name: 'Indian Institute of Technology Delhi', country: 'India' },
  { name: 'Indian Institute of Technology Bombay', country: 'India' },
  { name: 'Indian Institute of Technology Madras', country: 'India' },
  { name: 'Indian Institute of Technology Kanpur', country: 'India' },
  { name: 'Indian Institute of Technology Kharagpur', country: 'India' },
  { name: 'Delhi University', country: 'India' },
  { name: 'Jawaharlal Nehru University', country: 'India' },
  { name: 'Birla Institute of Technology', country: 'India' },
  { name: 'Manipal Institute of Technology', country: 'India' },
  { name: 'SRM Institute of Science and Technology', country: 'India' },
  { name: 'Chandigarh University', country: 'India' },
  { name: 'PES University', country: 'India' },
  { name: 'NIT Trichy', country: 'India' },
  { name: 'NIT Warangal', country: 'India' },
  // International Universities
  { name: 'Massachusetts Institute of Technology', country: 'United States' },
  { name: 'Stanford University', country: 'United States' },
  { name: 'Harvard University', country: 'United States' },
  { name: 'University of California, Berkeley', country: 'United States' },
  { name: 'Carnegie Mellon University', country: 'United States' },
  { name: 'University of Cambridge', country: 'United Kingdom' },
  { name: 'Oxford University', country: 'United Kingdom' },
  { name: 'ETH Zurich', country: 'Switzerland' },
  { name: 'University of Toronto', country: 'Canada' },
]

// Track if API has failed before - skip API calls after first failure
let apiDisabled = false

export function useUniversitySearch(query: string, debounceMs = 500) {
  const [universities, setUniversities] = useState<University[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!query || query.length < 2) {
      setUniversities([])
      return
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true)
      setError(null)
      
      // Use fallback by default since API is unreliable
      // Only try API once per session, then use fallback
      const useFallback = apiDisabled || query.length < 3

      if (!useFallback && !apiDisabled) {
        // Try API once
        abortControllerRef.current = new AbortController()
        const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), 3000) // 3s timeout

        try {
          const response = await fetch(
            `https://universities.hipolabs.com/search?name=${encodeURIComponent(query)}`,
            {
              signal: abortControllerRef.current.signal,
              mode: 'cors',
            }
          )
          clearTimeout(timeoutId)

          if (response.ok) {
            const data = await response.json()
            if (data && Array.isArray(data) && data.length > 0) {
              setUniversities(data.slice(0, 10))
              setLoading(false)
              return // Success, exit early
            }
          }
        } catch (fetchError: any) {
          clearTimeout(timeoutId)
          if (!fetchError.name || fetchError.name !== 'AbortError') {
            // Mark API as disabled after first real failure
            apiDisabled = true
          }
        }
      }

      // Use fallback (either because API failed or we're skipping it)
      const filtered = FALLBACK_UNIVERSITIES.filter(u =>
        u.name.toLowerCase().includes(query.toLowerCase())
      )
      setUniversities(filtered.length > 0 ? filtered : FALLBACK_UNIVERSITIES.slice(0, 10))
      setLoading(false)
    }, debounceMs)

    return () => {
      clearTimeout(timeoutId)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [query, debounceMs])

  return { universities, loading, error }
}
