# Senac Transcreve

Aplicação web que transforma a fala do professor em texto **em tempo real**, para que alunos surdos ou com deficiência auditiva acompanhem a aula lendo. As aulas podem ser salvas na conta do usuário, que também pode gerar e editar um **resumo** de cada aula.

Feito com Node.js + Express 5, páginas EJS, Prisma ORM 7 e MySQL.

### Equipe
| Intregrantes | Cargos |
| :-----------: | :-----: |
| Paulo Henrique | Líder Técnico |
| Caio Lincoln - Emanuel Guerra | Back-end |
| João Maria - Jose Victor | Front-end |
| Rafael Azafe | QA\Testes |

## Funcionalidades

| Quem | O que pode fazer |
|---|---|
| **Visitante** | Usar a transcrição na página inicial (sem salvar). |
| **Aluno / Professor** | Transcrever e salvar aulas; ver, buscar e excluir as próprias aulas em **Minhas aulas**; gerar automaticamente, editar e salvar o resumo de cada aula. |
| **Administrador** | Painel com números do sistema; listar usuários, mudar o tipo da conta (aluno, professor, admin) e excluir contas; listar e excluir aulas. |

Todos entram pela **mesma tela de login**: o administrador vai para `/admin` e alunos/professores vão para `/minhas-aulas`.

Recursos de acessibilidade na transcrição: guia visual de como começar, medidor de som (mostra se o microfone está captando a voz do professor), aviso visual quando não há fala, reinício automático do reconhecimento, ajuste do tamanho da letra e rolagem automática.

---

## Como fazer o sistema funcionar

### 1. Requisitos

- **Node.js 22** ou superior (já vem com o npm)
- **MySQL 8** (ou MariaDB compatível) rodando na máquina
- **Google Chrome** ou **Microsoft Edge** para usar a transcrição (o Firefox não tem reconhecimento de voz)

### 2. Criar o banco de dados

No MySQL (Workbench, terminal `mysql` ou outro cliente), execute:

```sql
CREATE DATABASE projeto_integrador
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

### 3. Configurar o arquivo `.env`

Copie o modelo:

```bash
cp .env.example .env        # Linux / macOS / Git Bash
copy .env.example .env      # Prompt de Comando do Windows
```

Abra o `.env` e preencha:

```env
DATABASE_URL="mysql://root:SUA_SENHA@localhost:3306/projeto_integrador"
PORT=3000
SESSION_SECRET="cole-aqui-um-texto-aleatorio-com-32-caracteres-ou-mais"
```

- **Porta:** o MySQL usa **3306**. Não use 5432, que é a porta do PostgreSQL.
- **Senha com caracteres especiais:** troque-os pelo código correspondente na URL: `@` → `%40`, `#` → `%23`, `/` → `%2F`, `:` → `%3A`. Exemplo: a senha `abc@01` vira `abc%4001`.
- **SESSION_SECRET:** gere um valor com
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

### 4. Instalar as dependências e preparar o banco

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
```

- `prisma:generate` gera o cliente do Prisma (pasta `generated/prisma`).
- `prisma:migrate:deploy` cria todas as tabelas no banco a partir de `prisma/migrations/`.

Para conferir se deu certo: `npm run prisma:migrate:status` deve dizer que o banco está atualizado.

### 5. Iniciar o servidor

```bash
npm run dev
```

Acesse **http://localhost:3000**. O servidor reinicia sozinho quando você altera arquivos `.ts`.

### 6. Criar o primeiro administrador

O cadastro público só cria contas de **aluno** ou **professor**. Para ter um administrador, use o script:

```bash
# Promove uma conta que já existe:
npm run admin:criar -- email@exemplo.com

# Ou cria uma conta de administrador nova:
npm run admin:criar -- admin@exemplo.com "SenhaForte123" "Nome do Admin"
```

Depois, entre em `/login` com esse e-mail. Você será levado ao painel `/admin`.

### 7. Usar a transcrição

1. Coloque o aparelho perto do professor.
2. Na página inicial, toque em **Iniciar transcrição** e **permita o uso do microfone** quando o navegador perguntar.
3. Confira o **medidor de som**: as barras laranja se mexem quando o professor fala.
4. Logado como aluno ou professor, dê um título e clique em **Salvar aula**. Em **Minhas aulas**, use **Gerar resumo automático**, ajuste o texto e clique em **Salvar resumo**.

> O microfone só funciona em `http://localhost` ou em sites com **HTTPS**. Ao publicar o sistema, use HTTPS.

---

## Produção

```bash
npm ci
npm run build                 # gera o cliente Prisma e compila o TypeScript para dist/
npm run prisma:migrate:deploy # aplica as migrações pendentes
npm start                     # roda dist/src/serve.js
```

Em produção, defina `NODE_ENV=production`, `DATABASE_URL` e `SESSION_SECRET` (obrigatório) nas variáveis de ambiente.

## Comandos disponíveis

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com recarga automática |
| `npm run build` | Gera o Prisma Client e compila o projeto |
| `npm start` | Inicia a versão compilada |
| `npm run prisma:generate` | Atualiza o Prisma Client depois de mudar o `schema.prisma` |
| `npm run prisma:migrate -- --name nome` | Cria e aplica uma nova migração (desenvolvimento) |
| `npm run prisma:migrate:deploy` | Aplica migrações pendentes |
| `npm run prisma:migrate:status` | Mostra o estado das migrações |
| `npm run prisma:studio` | Abre uma interface visual para ver os dados |
| `npm run admin:criar -- email [senha] [nome]` | Cria ou promove um administrador |

## Segurança

- **Senhas** guardadas apenas como hash bcrypt; o hash nunca é enviado ao navegador.
- **Login por cookie** `httpOnly` assinado (HMAC com `SESSION_SECRET`), `SameSite=Lax` e `Secure` em produção.
- **Limite de tentativas** (em memória):
  - 5 senhas erradas na mesma conta (e-mail + IP) → bloqueio de **15 minutos**, mesmo que a senha certa seja digitada depois;
  - 30 tentativas de login por IP a cada 15 minutos (impede testar muitas contas);
  - 5 cadastros por IP por hora.

  Ao bloquear, a API responde `429` com o cabeçalho `Retry-After`. Os contadores zeram se o servidor reiniciar.
- **Sem vazamento de contas:** a mensagem e o tempo de resposta do login são os mesmos para e-mail inexistente e senha errada.
- **CSRF:** pedidos que alteram dados vindos de outro site (cabeçalho `Origin` diferente) são recusados com `403`; `PUT`/`PATCH` exigem JSON.
- **Permissões:** cada rota confere o tipo de conta; aluno/professor só acessam as próprias aulas; o cadastro público não cria administradores.
- **Cabeçalhos:** `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` (microfone só no próprio site) e HSTS em produção; o cabeçalho `X-Powered-By` foi removido.
- **Atrás de proxy**, defina `TRUST_PROXY=1` para que o limite de tentativas use o IP real do visitante.

## Problemas comuns

| Erro / sintoma | Solução |
|---|---|
| `P1001: Can't reach database server` | O MySQL não está rodando ou a porta/host no `DATABASE_URL` está errada (use `3306`). |
| `P1000: Authentication failed` | Usuário ou senha errados no `DATABASE_URL`, ou senha com caractere especial sem codificar. |
| `Table ... doesn't exist` | Faltou rodar `npm run prisma:migrate:deploy`. |
| `Cannot find module '../../generated/prisma/client'` | Faltou rodar `npm run prisma:generate`. |
| Aviso `SESSION_SECRET não definido` | Defina `SESSION_SECRET` no `.env`; sem ele os logins expiram ao reiniciar. |
| "Muitas tentativas... Tente novamente em 15 minutos" | O limite de login foi atingido. Espere o tempo indicado (ou reinicie o servidor em desenvolvimento). |
| Botão de transcrição desativado | Use Google Chrome ou Microsoft Edge. |
| "O microfone está bloqueado" | Clique no cadeado ao lado do endereço do site e permita o microfone. |
| Medidor parado enquanto o professor fala | Aproxime o aparelho de quem fala ou verifique se o microfone certo está selecionado no sistema. |

---

## Páginas

| Rota | Acesso |
|---|---|
| `/` | Todos: transcrição |
| `/login`, `/cadastro` | Visitantes (quem já está logado é redirecionado) |
| `/minhas-aulas` | Aluno e professor |
| `/admin` | Administrador |

## API

Todas as rotas ficam sob `/api` e usam JSON. O login cria um cookie `httpOnly` que identifica o usuário nas chamadas seguintes.

**Conta**

- `POST /api/cadastro`: `{ nome, email, senha, tipo }` (`tipo`: `ALUNO` ou `PROFESSOR`). Já deixa a pessoa logada.
- `POST /api/login`: `{ email, senha, lembrar }`. Responde com o usuário e o `destino` (área de cada tipo).
- `POST /api/logout`
- `GET /api/me`: usuário logado.

**Aulas e resumos** (aluno/professor, somente as próprias aulas)

- `GET /api/me/textos`: lista as aulas do usuário.
- `POST /api/texto`: `{ titulo, texto, materia }`. Cria uma aula.
- `GET /api/texto/:id`: aula com o resumo (o admin também pode ver).
- `PUT /api/texto/:id`: altera `titulo`, `texto` e/ou `materia`.
- `DELETE /api/texto/:id`: exclui a aula (o admin também pode excluir).
- `POST /api/texto/:id/resumo/gerar`: sugere um resumo a partir da transcrição (não salva).
- `PUT /api/texto/:id/resumo`: `{ conteudo }`. Salva ou atualiza o resumo.
- `DELETE /api/texto/:id/resumo`: exclui o resumo.

**Administração** (somente admin)

- `GET /api/admin/resumo`: totais de usuários, aulas e resumos.
- `GET /api/admin/usuarios`, `PATCH /api/admin/usuarios/:id` (`{ tipo }`), `DELETE /api/admin/usuarios/:id`
- `GET /api/admin/aulas`

## Estrutura do projeto

```
prisma/              schema e migrações do banco
scripts/             script para criar administrador
public/              CSS, JavaScript do navegador e imagens
src/
  app.ts, serve.ts   configuração e inicialização do Express
  lib/               conexão com o banco (prisma.ts) e sessão/login (sessao.ts)
  models/            validação de usuário e texto
  repositories/      acesso ao banco
  controllers/       regras de cada rota
  routers/           definição das rotas (páginas, API, admin)
  services/          gerador de resumos
  views/             páginas EJS (+ partials com cabeçalho e rodapé)
```