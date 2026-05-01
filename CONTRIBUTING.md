# Contribuindo

Obrigado pelo interesse em contribuir com o Agentise Leads.

## Rodando localmente

```bash
git clone https://github.com/<seu-usuario>/agentise-leads.git
cd agentise-leads
npm install
cp .env.example .env.local   # preencha as variáveis VITE_*
npm run dev
```

Para Edge Functions e migrations, siga o passo a passo do [README](./README.md#setup-self-hosted--passo-a-passo).

## Padrão de commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/):

- `feat:` nova funcionalidade
- `fix:` correção de bug
- `chore:` tarefas auxiliares (build, deps, config)
- `refactor:` refatoração sem mudar comportamento
- `docs:` apenas documentação

Mensagem em PT-BR, no infinitivo. Ex.: `feat: adicionar exportação de leads em CSV`.

## Branch model

- `main` — produção, sempre estável
- `dev` — branch de integração
- Feature branches: `feat/<nome-curto>` (ex.: `feat/exportar-csv`)

## Abrindo PR

1. Crie um branch a partir de `dev`.
2. Garanta que `npm run build` e `npm run lint` passam localmente.
3. Descreva a mudança no corpo do PR (o que muda, por quê, como testar).
4. Anexe screenshots se o PR mexer em UI.
5. Marque @odaviribeiro1 para revisão.

## Reportando issues

Abra uma issue com **descrição** (o que aconteceu vs. esperado), **reprodução** (passos numerados) e **ambiente** (Node, navegador, SO). Para vulnerabilidades, não abra issue pública — envie e-mail para `seguranca@agentise.com.br`.
