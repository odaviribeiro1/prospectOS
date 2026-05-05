# Customizations

Este diretório é o local **único e seguro** para customizações de código que você quer fazer na sua instância sem causar conflitos com atualizações do upstream.

## Por que existe

Quando você puxa atualizações do upstream (via UPDATE.md), o Git tenta mesclar as mudanças do projeto principal com seu código local. Se você editar arquivos fora deste diretório, vai conflitar quando puxar atualizações.

**Regra simples:** o upstream nunca edita arquivos dentro de `src/customizations/`. Tudo aqui é seu.

## Como usar

- Crie hooks, componentes e helpers próprios aqui.
- Importe-os no resto da aplicação normalmente:
  ```ts
  import { meuHook } from '@/customizations/hooks/meuHook'
  ```
  Se este projeto não tiver alias `@/` configurado, use caminho relativo:
  ```ts
  import { meuHook } from '../customizations/hooks/meuHook'
  ```
- Para sobrescrever comportamento: copie o componente original para cá, edite, e atualize as importações no resto da aplicação para apontar para a versão customizada.

## Limites

Customizações que exigem editar arquivos de domínio (ex.: alterar lógica de uma Edge Function existente, mudar comportamento de um componente core) **não cabem aqui** — vão precisar de merge manual quando atualizar.

Para essas, recomendado: abra issue ou PR no upstream sugerindo a customização como feature opcional.
