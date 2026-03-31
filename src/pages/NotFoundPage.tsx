import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Button } from '../components/ui/button'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4 text-center">
      <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <Search className="h-10 w-10 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Página não encontrada</h1>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        A página que você está procurando não existe ou foi movida.
      </p>
      <Button onClick={() => navigate('/metricas')}>
        ← Voltar ao Dashboard
      </Button>
    </div>
  )
}
