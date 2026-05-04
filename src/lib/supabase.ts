import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias. ' +
    'Configure-as em Vercel → Settings → Environment Variables (produção) ou no arquivo .env local (desenvolvimento). ' +
    'Veja README.md para o passo a passo.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
