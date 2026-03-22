import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Storage URL generator for images
export function getImageUrl(imageName) {
  return `${supabaseUrl}/storage/v1/object/public/thanksquirrel-image/${imageName}`;
}
