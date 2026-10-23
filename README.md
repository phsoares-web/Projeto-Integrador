# Projeto Integrador — Transcreve

Aplicação web para transcrição de fala em português, com API Express e persistência MySQL através do Prisma ORM 7.

## Requisitos

- Node.js 22 ou superior
- npm
- MySQL 8 (ou MariaDB compatível)

## Preparar o banco de dados

Crie o banco MySQL antes de aplicar a migração:

```sql
CREATE DATABASE projeto_integrador
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Copie `.env.example` para `.env` e ajuste `DATABASE_URL` com as credenciais do seu MySQL:

```env
DATABASE_URL="mysql://usuario:senha@localhost:3306/projeto_integrador"
PORT=3000
```

Se a senha tiver caracteres especiais (por exemplo `@`, `#`, `/` ou `:`), codifique-os em percent-encoding na URL.

## Instalar e executar em desenvolvimento

```bash
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run dev
```

A aplicação fica disponível em `http://localhost:3000`. O front-end de transcrição usa reconhecimento de voz do navegador; dê permissão ao microfone quando solicitado.

## Produção

Após configurar `DATABASE_URL` no ambiente de produção e compilar o projeto:

```bash
npm ci
npm run build
npm run prisma:migrate:deploy
npm start
```

`npm run build` gera o Prisma Client antes de compilar o TypeScript. Em produção, aplique apenas as migrações versionadas com `prisma migrate deploy`.

## Comandos Prisma

- `npm run prisma:generate`: gera/atualiza o cliente TypeScript após alterações ao schema.
- `npm run prisma:migrate -- --name nome_da_migracao`: cria e aplica uma migração local.
- `npm run prisma:migrate:deploy`: aplica migrações pendentes num ambiente de deploy.
- `npm run prisma:migrate:status`: consulta o estado das migrações.
- `npm run prisma:studio`: abre a interface visual para consultar os dados.

## API de textos

Todas as rotas estão sob `/api` e recebem/devolvem JSON.

- `POST /api/texto` — cria texto. Corpo: `{"profId":1,"titulo":"Aula de hoje","texto":"Conteúdo transcrito...","materia":"Português"}`.
- `GET /api/texto/:id` — consulta um texto pelo identificador.
- `PUT /api/texto/:id` — altera `titulo`, `texto` e/ou `materia`.
- `DELETE /api/texto/:id` — apaga um texto.

A tabela `Text` é criada pela migração inicial em `prisma/migrations/`.
