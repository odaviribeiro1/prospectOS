// Em Tailwind v4, a configuração é principalmente via CSS (@theme no index.css).
// Este arquivo mantém compatibilidade com ferramentas que leem o config.
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
}

export default config
