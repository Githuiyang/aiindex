import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase env missing: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

export const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '')
