# SENAC-LAB
## Descrição
Senac-Lab é uma plataformar web desenvolvida especialmente para promover a inclusão escolar e acadêmica. O foco principal do site é transcrever a fala dos professores em tempo real, garantindo que alunos com deficiência auditiva tenham acesso imediato ao conteúdo em sala de aula.

### Equipe
| Intregrantes | Cargos |
| :-----------: | :-----: |
| Paulo Henrique | Líder Técnico |
| Caio Lincoln - Emanuel Guerra | Back-end |
| João Maria - Jose Victor | Front-end |
| Rafael Azafe | QA\Testes |

### Tecnologia Utilizadas
| Categorias | Tecnologias |
| :--------: | :---------: |

### Como Instalar 
1- Clonar o Respositório:
```bash
git clone https://github.com/khsd098/Projeto-integrador
```
2- Entrando na Pasta:
```bash
cd Projeto-integrador
```
3- Instalanado as Dependência:
```bash
npm install
```
4- Executando o Projeto:
```
npm run dev
```

### ScreenShots

### Tabela de Rotas
| Método | Rota | Descrição | Status |
| :----: | :--: | :-------: | :----: |
| Post | /cadastro | Faz o cadastro do cliente | 201/400/404 |
| Post | /login | Faz o login do cliente | 200/404/401/400 |
| Get | /usuario/:id | pega o usuario | 200/404/400 |
| Get | /texto/:id | pega um texto | 200/404/400/500 |
| Post | /texto | salva um texto | 201/400/404/500 |
| Post | /texto/:id | atualiza um texto | 200/404/403/401/400/500 |
| Delete | /text/:id | deleta um texto | 200/404/403/400/500 |
