# AtelierHub

Base do MVP do AtelierHub em `Next.js`, `Prisma` e `PostgreSQL`.

## Stack atual

- `Next.js`
- `Prisma`
- `Tailwind CSS` + `shadcn/ui`
- Auth com `e-mail e senha`
- App fora do Docker
- PostgreSQL em Docker para desenvolvimento local
- `PM2` como process manager alvo da VPS

## Desenvolvimento local

### 1. Configurar ambiente

Copie o exemplo de ambiente:

```bash
cp .env.example .env
```

### 2. Subir o PostgreSQL local

```bash
docker compose -f docker-compose.dev.yml up -d
```

Isso sobe um PostgreSQL em:

- host: `localhost`
- porta: `5432`
- database: `atelierhub_staging`
- user: `postgres`
- password: `postgres`

### 3. Gerar o client do Prisma

```bash
npm run db:generate
```

### 4. Aplicar a migration inicial

```bash
npx prisma db execute --file prisma/migrations/0001_init_auth_core/migration.sql --schema prisma/schema.prisma
```

### 5. Rodar o seed

```bash
npm run db:seed
```

Usuário inicial padrão:

- e-mail: `admin@atelierhub.local`
- senha: `12345678`

### 6. Rodar o projeto

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Scripts úteis

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run db:generate
npm run db:seed
```

## Referências do projeto

- [Regras de negócio, páginas e arquitetura](./docs/regras-negocio-arquitetura-e-paginas.md)
- [Mapa mental e modelo de dados](./docs/mapa-mental-e-modelo-dados.md)
- [Backlog técnico do MVP](./docs/backlog-tecnico-mvp.md)
