---
name: react-component
description: "Cria componentes React com TypeScript e Tailwind seguindo os padrões do projeto. Use quando pedirem para criar um componente, tela, ou página."
---

# Criar Componente React

## Estrutura obrigatória

Todo componente deve seguir este template:

1. Imports no topo
2. Interface de Props com export
3. Componente funcional com export default
4. Usar Tailwind para styling

## Template
```tsx
import { useState } from 'react'

export interface NomeComponenteProps {
  // props aqui
}

export default function NomeComponente({ ...props }: NomeComponenteProps) {
  return (
    <div className="...">
      {/* conteúdo */}
    </div>
  )
}
```

## Regras
- Sempre tipar as props
- Usar export default
- Arquivo em kebab-case: `nome-componente.tsx`
- Componente em PascalCase: `NomeComponente`