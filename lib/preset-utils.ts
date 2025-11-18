/**
 * Utility functions for Filter Presets
 * Handles dynamic calculation of top regions and segments
 */

import type { ComparisonData, DataRecord, FilterState } from './types'

/**
 * Calculate top regions based on market value for a specific year
 * @param data - The comparison data
 * @param year - The year to evaluate (default 2024)
 * @param topN - Number of top regions to return (default 3)
 * @returns Array of top region names
 */
export function getTopRegionsByMarketValue(
  data: ComparisonData | null,
  year: number = 2024,
  topN: number = 3
): string[] {
  if (!data) return []

  // Get all value data records
  const records = data.data.value.geography_segment_matrix

  // Calculate total market value by region for the specified year
  const regionTotals = new Map<string, number>()

  records.forEach((record: DataRecord) => {
    const geography = record.geography
    const value = record.time_series[year] || 0

    // Skip global level (India)
    if (geography === 'India' || geography === 'Global') return

    // Only consider region-level geographies
    if (record.geography_level === 'region') {
      const currentTotal = regionTotals.get(geography) || 0
      regionTotals.set(geography, currentTotal + value)
    }
  })
  
  // If no regions found, check if we can identify regions from geography names
  if (regionTotals.size === 0 && data) {
    const regions = data.dimensions?.geographies?.regions || []
    // Try to find regions by name matching
    records.forEach((record: DataRecord) => {
      const geography = record.geography
      if (regions.includes(geography)) {
        const value = record.time_series[year] || 0
        const currentTotal = regionTotals.get(geography) || 0
        regionTotals.set(geography, currentTotal + value)
      }
    })
  }

  // Sort regions by total value and get top N
  const sortedRegions = Array.from(regionTotals.entries())
    .sort((a, b) => b[1] - a[1]) // Sort by value descending
    .slice(0, topN)
    .map(([region]) => region)

  // Debug logging
  if (typeof window !== 'undefined') {
    console.log(`📊 Top Markets Preset: Found ${sortedRegions.length} regions`, sortedRegions)
  }

  return sortedRegions
}

/**
 * Get all first-level segments for a given segment type
 * @param data - The comparison data
 * @param segmentType - The segment type to get segments for
 * @returns Array of first-level segment names
 */
export function getFirstLevelSegments(
  data: ComparisonData | null,
  segmentType: string
): string[] {
  if (!data) return []

  const segmentDimension = data.dimensions.segments[segmentType]
  if (!segmentDimension) return []

  // For "By End-Use*Product Type", we need to get segments from actual data records
  // because the hierarchy structure is complex (B2B/B2C > Category > Subcategory > ...)
  if (segmentType === 'By End-Use*Product Type') {
    // Get unique segments from data records
    const records = data.data.value.geography_segment_matrix
    const uniqueSegments = new Set<string>()
    
    records
      .filter(r => r.segment_type === segmentType)
      .forEach(r => {
        // Extract first-level segment (after B2B/B2C prefix)
        const parts = r.segment.split(' > ')
        if (parts.length >= 2) {
          // Skip B2B/B2C prefix and get the first category
          const firstLevel = parts[1] // e.g., "Food & Beverage"
          if (firstLevel) {
            uniqueSegments.add(firstLevel)
          }
        }
      })
    
    return Array.from(uniqueSegments).sort()
  }

  const hierarchy = segmentDimension.hierarchy || {}
  const allSegments = segmentDimension.items || []

  // Find root segments (those that are parents but not children of any other segment)
  const allChildren = new Set(Object.values(hierarchy).flat())
  const firstLevelSegments: string[] = []

  // Add all segments that have children but are not children themselves
  Object.keys(hierarchy).forEach(parent => {
    if (!allChildren.has(parent) && hierarchy[parent].length > 0) {
      firstLevelSegments.push(parent)
    }
  })

  // Also add standalone segments that are neither parents nor children
  allSegments.forEach(segment => {
    if (!allChildren.has(segment) && !hierarchy[segment]) {
      firstLevelSegments.push(segment)
    }
  })

  return firstLevelSegments.length > 0 ? firstLevelSegments.sort() : allSegments.sort()
}

/**
 * Get the first available segment type from the data
 * @param data - The comparison data
 * @returns The first segment type name or null
 */
export function getFirstSegmentType(data: ComparisonData | null): string | null {
  if (!data || !data.dimensions.segments) return null
  
  const segmentTypes = Object.keys(data.dimensions.segments)
  return segmentTypes.length > 0 ? segmentTypes[0] : null
}

/**
 * Calculate top regions based on CAGR (Compound Annual Growth Rate)
 * @param data - The comparison data
 * @param topN - Number of top regions to return (default 2)
 * @returns Array of top region names sorted by CAGR
 */
export function getTopRegionsByCAGR(
  data: ComparisonData | null,
  topN: number = 2
): string[] {
  if (!data) return []

  // Get all value data records
  const records = data.data.value.geography_segment_matrix

  // Calculate average CAGR for each region
  const regionCAGRs = new Map<string, number[]>()

  records.forEach((record: DataRecord) => {
    const geography = record.geography

    // Skip global level (India)
    if (geography === 'India' || geography === 'Global') return

    // Only consider region-level geographies
    if (record.geography_level === 'region' && record.cagr !== undefined && record.cagr !== null) {
      const cagrs = regionCAGRs.get(geography) || []
      cagrs.push(record.cagr)
      regionCAGRs.set(geography, cagrs)
    }
  })
  
  // If no regions found, check if we can identify regions from geography names
  if (regionCAGRs.size === 0 && data) {
    const regions = data.dimensions?.geographies?.regions || []
    records.forEach((record: DataRecord) => {
      const geography = record.geography
      if (regions.includes(geography) && record.cagr !== undefined && record.cagr !== null) {
        const cagrs = regionCAGRs.get(geography) || []
        cagrs.push(record.cagr)
        regionCAGRs.set(geography, cagrs)
      }
    })
  }

  // Calculate average CAGR for each region
  const avgCAGRs = Array.from(regionCAGRs.entries()).map(([region, cagrs]) => ({
    region,
    avgCAGR: cagrs.reduce((a, b) => a + b, 0) / cagrs.length
  }))

  // Sort regions by average CAGR and get top N
  const sortedRegions = avgCAGRs
    .sort((a, b) => b.avgCAGR - a.avgCAGR) // Sort by CAGR descending
    .slice(0, topN)
    .map(item => item.region)

  return sortedRegions
}

/**
 * Calculate top countries based on CAGR (Compound Annual Growth Rate)
 * @param data - The comparison data
 * @param topN - Number of top countries to return (default 5)
 * @returns Array of top country names sorted by CAGR
 */
export function getTopCountriesByCAGR(
  data: ComparisonData | null,
  topN: number = 5
): string[] {
  if (!data) return []

  // Get all value data records
  const records = data.data.value.geography_segment_matrix

  // Calculate average CAGR for each country
  const countryCAGRs = new Map<string, number[]>()

  records.forEach((record: DataRecord) => {
    const geography = record.geography

    // Skip global (India) and region levels
    if (geography === 'India' || geography === 'Global') return

    // Only consider country-level geographies
    if (record.geography_level === 'country' && record.cagr !== undefined && record.cagr !== null) {
      const cagrs = countryCAGRs.get(geography) || []
      cagrs.push(record.cagr)
      countryCAGRs.set(geography, cagrs)
    }
  })
  
  // If no countries found, check if we can identify countries from geography names
  if (countryCAGRs.size === 0 && data) {
    const regions = data.dimensions?.geographies?.regions || []
    const allGeos = data.dimensions?.geographies?.all_geographies || []
    const countries = allGeos.filter(geo => geo !== 'India' && !regions.includes(geo))
    
    records.forEach((record: DataRecord) => {
      const geography = record.geography
      if (countries.includes(geography) && record.cagr !== undefined && record.cagr !== null) {
        const cagrs = countryCAGRs.get(geography) || []
        cagrs.push(record.cagr)
        countryCAGRs.set(geography, cagrs)
      }
    })
  }

  // Calculate average CAGR for each country
  const avgCAGRs = Array.from(countryCAGRs.entries()).map(([country, cagrs]) => ({
    country,
    avgCAGR: cagrs.reduce((a, b) => a + b, 0) / cagrs.length
  }))

  // Sort countries by average CAGR and get top N
  const sortedCountries = avgCAGRs
    .sort((a, b) => b.avgCAGR - a.avgCAGR) // Sort by CAGR descending
    .slice(0, topN)
    .map(item => item.country)

  return sortedCountries
}

/**
 * Create dynamic filter configuration for Top Market preset
 * @param data - The comparison data
 * @returns Partial FilterState with dynamic values
 */
export function createTopMarketFilters(data: ComparisonData | null): Partial<FilterState> {
  if (!data) {
    return {
      viewMode: 'geography-mode',
      geographies: [],
      segments: [],
      yearRange: [2024, 2028],
      dataType: 'value',
      businessType: 'B2B'
    }
  }

  // Simple approach: Get top 3 regions by market value
  const topRegions = getTopRegionsByMarketValue(data, 2024, 3)
  const selectedGeographies = topRegions.length > 0 ? topRegions : ['West India', 'South India', 'North India']

  // Dynamically find segments that exist for the selected geographies
  const records = data.data.value.geography_segment_matrix
  const segmentsForGeos = new Set<string>()
  
  records.forEach(record => {
    if (selectedGeographies.includes(record.geography) && 
        record.segment_type === 'By End-Use*Product Type' &&
        record.segment.startsWith('B2B >')) {
      segmentsForGeos.add(record.segment)
    }
  })
  
  // Get first 5 segments that actually exist, sorted by market value
  const availableSegments = Array.from(segmentsForGeos)
    .map(segment => {
      // Calculate total value for this segment across selected geographies
      const totalValue = records
        .filter(r => r.segment === segment && selectedGeographies.includes(r.geography))
        .reduce((sum, r) => sum + (r.time_series?.[2024] || 0), 0)
      return { segment, totalValue }
    })
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5)
    .map(item => item.segment)

  console.log('📊 Top Markets Preset:', {
    geographies: selectedGeographies,
    segments: availableSegments,
    totalRecords: records.length,
    foundSegments: availableSegments.length
  })

  return {
    viewMode: 'geography-mode',
    geographies: selectedGeographies,
    segments: availableSegments.length > 0 ? availableSegments : [],
    segmentType: 'By End-Use*Product Type',
    yearRange: [2024, 2028],
    dataType: 'value',
    businessType: 'B2B'
  }
}

/**
 * Create dynamic filter configuration for Growth Leaders preset
 * Identifies top 2 regions with highest CAGR and uses first segment type with all first-level segments
 */
export function createGrowthLeadersFilters(data: ComparisonData | null): Partial<FilterState> {
  if (!data) {
    return {
      viewMode: 'geography-mode',
      geographies: [],
      segments: [],
      yearRange: [2024, 2032],
      dataType: 'value',
      businessType: 'B2B'
    }
  }

  // Get top 2 regions with highest CAGR
  const topRegions = getTopRegionsByCAGR(data, 2)
  const selectedGeographies = topRegions.length > 0 ? topRegions : ['West India', 'East India']

  // Dynamically find segments that exist for the selected geographies
  const records = data.data.value.geography_segment_matrix
  const segmentsForGeos = new Set<string>()
  
  records.forEach(record => {
    if (selectedGeographies.includes(record.geography) && 
        record.segment_type === 'By End-Use*Product Type' &&
        record.segment.startsWith('B2B >')) {
      segmentsForGeos.add(record.segment)
    }
  })
  
  // Get top 3 segments by CAGR that actually exist
  const availableSegments = Array.from(segmentsForGeos)
    .map(segment => {
      // Calculate average CAGR for this segment across selected geographies
      const segmentRecords = records.filter(
        r => r.segment === segment && selectedGeographies.includes(r.geography) && r.cagr !== undefined && r.cagr !== null
      )
      const avgCAGR = segmentRecords.length > 0
        ? segmentRecords.reduce((sum, r) => sum + (r.cagr || 0), 0) / segmentRecords.length
        : 0
      return { segment, avgCAGR }
    })
    .sort((a, b) => b.avgCAGR - a.avgCAGR)
    .slice(0, 3)
    .map(item => item.segment)

  console.log('📊 Growth Leaders Preset:', {
    geographies: selectedGeographies,
    segments: availableSegments,
    foundSegments: availableSegments.length
  })

  return {
    viewMode: 'geography-mode',
    geographies: selectedGeographies,
    segments: availableSegments.length > 0 ? availableSegments : [],
    segmentType: 'By End-Use*Product Type',
    yearRange: [2024, 2032],
    dataType: 'value',
    businessType: 'B2B'
  }
}

/**
 * Create dynamic filter configuration for Emerging Markets preset
 * Identifies top 5 countries with highest CAGR and uses first segment type with all first-level segments
 */
export function createEmergingMarketsFilters(data: ComparisonData | null): Partial<FilterState> {
  if (!data) {
    return {
      viewMode: 'geography-mode',
      geographies: [],
      segments: [],
      yearRange: [2024, 2032],
      dataType: 'value',
      businessType: 'B2B'
    }
  }

  // Get top 5 countries with highest CAGR
  const topCountries = getTopCountriesByCAGR(data, 5)
  const selectedGeographies = topCountries.length > 0
    ? topCountries
    : ['Odisha', 'Uttar Pradesh', 'Assam', 'Tamil Nadu', 'Maharashtra']

  // Dynamically find segments that exist for the selected geographies
  const records = data.data.value.geography_segment_matrix
  const segmentsForGeos = new Set<string>()
  
  records.forEach(record => {
    if (selectedGeographies.includes(record.geography) && 
        record.segment_type === 'By End-Use*Product Type' &&
        record.segment.startsWith('B2B >')) {
      segmentsForGeos.add(record.segment)
    }
  })
  
  // Get top 5 segments by CAGR that actually exist
  const availableSegments = Array.from(segmentsForGeos)
    .map(segment => {
      // Calculate average CAGR for this segment across selected geographies
      const segmentRecords = records.filter(
        r => r.segment === segment && selectedGeographies.includes(r.geography) && r.cagr !== undefined && r.cagr !== null
      )
      const avgCAGR = segmentRecords.length > 0
        ? segmentRecords.reduce((sum, r) => sum + (r.cagr || 0), 0) / segmentRecords.length
        : 0
      return { segment, avgCAGR }
    })
    .sort((a, b) => b.avgCAGR - a.avgCAGR)
    .slice(0, 5)
    .map(item => item.segment)

  console.log('📊 Emerging Markets Preset:', {
    geographies: selectedGeographies,
    segments: availableSegments,
    foundSegments: availableSegments.length
  })

  return {
    viewMode: 'geography-mode',
    geographies: selectedGeographies,
    segments: availableSegments.length > 0 ? availableSegments : [],
    segmentType: 'By End-Use*Product Type',
    yearRange: [2024, 2032],
    dataType: 'value',
    businessType: 'B2B'
  }
}
