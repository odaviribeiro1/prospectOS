import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const missingSupabaseUrl = !import.meta.env.VITE_SUPABASE_URL
const missingSupabaseAnon = !import.meta.env.VITE_SUPABASE_ANON_KEY

if (missingSupabaseUrl || missingSupabaseAnon) {
  document.body.innerHTML = `
    <div style="padding: 40px; font-family: 'Instrument Sans', system-ui, sans-serif; max-width: 640px; margin: 60px auto; color: #F8FAFC; background: #0B1220; border: 1px solid rgba(59,130,246,0.25); border-radius: 16px;">
      <h1 style="margin: 0 0 16px; font-size: 24px;">⚠️ Configuração ausente</h1>
      <p style="margin: 0 0 12px; line-height: 1.55;">
        As variáveis <code style="background:#1E293B;padding:2px 6px;border-radius:4px;">VITE_SUPABASE_URL</code>
        e <code style="background:#1E293B;padding:2px 6px;border-radius:4px;">VITE_SUPABASE_ANON_KEY</code>
        não foram encontradas no ambiente.
      </p>
      <p style="margin: 0 0 12px; line-height: 1.55;">
        Configure-as em <strong>Vercel → Settings → Environment Variables</strong> e refaça o deploy do projeto.
      </p>
      <p style="margin: 0; line-height: 1.55; color: #94A3B8;">
        Veja o passo a passo completo no <code style="background:#1E293B;padding:2px 6px;border-radius:4px;">README.md</code>.
      </p>
    </div>
  `
  throw new Error('Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias.')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
