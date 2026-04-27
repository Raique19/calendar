import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
  'https://chhkpyuxdiqtajovptbj.supabase.co',
  'sb_publishable_TnFzDmic777vE0A4Khh3gw_6IWSnPAR'
)

export { supabase }
