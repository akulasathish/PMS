'use server'

import { createClient } from '@/lib/supabase/server'

export async function getRevenueData(propertyId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_30_day_revenue', {
    p_property_id: propertyId
  })

  if (error) {
    console.error('Error fetching revenue data:', error)
    return { success: false, error: 'Failed to fetch revenue data' }
  }

  // Ensure dates are string formatted and parse numerics correctly for the frontend chart
  const formattedData = data.map((row: any) => ({
    date: row.daily_date,
    revenue: parseFloat(row.revenue) || 0
  }))

  return { success: true, data: formattedData }
}
