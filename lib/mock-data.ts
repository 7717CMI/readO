import type { ComparisonData } from './types'
import { generateRealisticData } from './generate-realistic-data'

/**
 * Creates realistic mock data for the India Spices Market
 * Loads dimensions and generates comprehensive data for all charts
 */
export async function createMockData(): Promise<ComparisonData> {
  try {
    // Load dimensions data
    const response = await fetch('/jsons/india-spices-dimensions.json', {
      cache: 'no-cache',
      headers: {
        'Accept': 'application/json',
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch dimensions: ${response.status}`)
    }
    
    const text = await response.text()
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      throw new Error('Received HTML instead of JSON')
    }
    
    const dimensionsData = JSON.parse(text)
    
    // Generate realistic data based on dimensions
    const data = await generateRealisticData(dimensionsData)
    
    return data
  } catch (error) {
    console.error('Failed to load or generate data:', error)
    
    // Fallback to empty structure if generation fails
    const currentYear = new Date().getFullYear()
    const startYear = currentYear - 5
    const baseYear = currentYear
    const forecastYear = currentYear + 5

    return {
      metadata: {
        market_name: 'Spices Market',
        market_type: 'Country',
        industry: 'CMFE',
        years: Array.from({ length: forecastYear - startYear + 1 }, (_, i) => startYear + i),
        start_year: startYear,
        base_year: baseYear,
        forecast_year: forecastYear,
        historical_years: [startYear, startYear + 1, startYear + 2, startYear + 3, baseYear - 1],
        forecast_years: Array.from({ length: forecastYear - baseYear + 1 }, (_, i) => baseYear + i),
        currency: 'INR',
        value_unit: 'Cr.',
        volume_unit: 'Kilo Tons',
        has_value: true,
        has_volume: true
      },
      dimensions: {
        geographies: {
          global: ['India'],
          regions: [],
          countries: {},
          all_geographies: ['India']
        },
        segments: {
          'By End-Use*Product Type': {
            type: 'hierarchical',
            items: [],
            hierarchy: {},
            b2b_hierarchy: {},
            b2c_hierarchy: {},
            b2b_items: [],
            b2c_items: []
          }
        }
      },
      data: {
        value: {
          geography_segment_matrix: []
        },
        volume: {
          geography_segment_matrix: []
        }
      }
    }
  }
}

