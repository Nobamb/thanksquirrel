import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

function getPublicStorageUrl(bucketName, imageName) {
  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${imageName}`;
}

// Storage URL generator for images
export function getImageUrl(imageName) {
  return getPublicStorageUrl('thanksquirrel-image', imageName);
}

export function getWebpageImageUrl(imageName) {
  return getPublicStorageUrl('thanksquirrel-webpage-image', imageName);
}
