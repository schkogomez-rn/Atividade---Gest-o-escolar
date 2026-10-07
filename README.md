# 🏫 API de Gestão Escolar

API REST construída com **Node.js + Express + PostgreSQL**, seguindo arquitetura em camadas com separação rigorosa de responsabilidades.

## 📁 Estrutura do Projeto

```
public/                        → FRONTEND MODERNO (Interface Web)
├── index.html                 → Interface de visualização e dashboards
├── style.css                  → Estilos, design system responsivo e temas
└── app.js                     → Integração com a API REST e modais
src/
├── config/
│   └── db.js                  → Pool de conexão com o PostgreSQL
├── repositories/              → CAMADA DE DADOS (apenas SQL)
│   ├── alunoRepository.js
│   ├── cursoRepository.js
│   └── turmaRepository.js     → Contém a transação de matrícula
├── controllers/               → CAMADA DE NEGÓCIO (validações + HTTP)
│   ├── alunoController.js
│   ├── cursoController.js
│   └── turmaController.js     → Aplica a Regra de Ouro (vagas)
├── routes/                    → CAMADA DE ROTEAMENTO (apenas mapeamento)
│   ├── alunoRoutes.js
│   ├── cursoRoutes.js
│   └── turmaRoutes.js
├── app.js                     → Configuração do Express + arquivos estáticos
└── server.js                  → Ponto de entrada (inicia o servidor)
database.sql                   → Script de criação do banco + dados mock
```

## ⚙️ Como Rodar

### 1. Configure o Banco de Dados

Abra o **pgAdmin** ou o **psql** e execute:

```sql
CREATE DATABASE gestao_escolar;
```

Depois execute o script completo em `database.sql`.

### 2. Configure o `.env`

Edite o arquivo `.env` com suas credenciais do PostgreSQL:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=SUA_SENHA_AQUI
DB_NAME=gestao_escolar
PORT=3000
```

### 3. Inicie o Servidor

```bash
npm start
# ou, com auto-reload:
npm run dev
```

### 4. Acesse a Interface Web (Frontend)

Com o servidor rodando, abra o seu navegador em:
👉 **`http://localhost:3000`**

A interface conta com:
- 📊 **Dashboard Completo**: Indicadores (KPIs) em tempo real, vagas restantes e últimas matrículas.
- 👩‍🎓 **Gestão de Alunos**: Listagem paginada, busca instantânea, criação, edição, histórico de matrículas e exclusão.
- 📚 **Grade de Cursos**: Cards dinâmicos com contagem de vagas em tempo real e criação/edição.
- 🎓 **Matrículas & Turmas**: Interface direta para a **Regra de Ouro** (verificação de vagas, transação ACID e bloqueio de duplicatas) com feedbacks visuais e cancelamento.

---

## 📡 Endpoints da API

### 👩‍🎓 Alunos — `/alunos`

| Método | Rota         | Descrição                        |
|--------|--------------|----------------------------------|
| GET    | `/alunos`    | Lista todos os alunos (paginação) |
| POST   | `/alunos`    | Cria um novo aluno               |
| GET    | `/alunos/:id`| Busca aluno por ID               |
| PUT    | `/alunos/:id`| Atualiza aluno por ID            |
| DELETE | `/alunos/:id`| Remove aluno por ID              |

**Query params de paginação:** `?page=1&limit=10`

**Body para criar/atualizar:**
```json
{
  "nome": "João Silva",
  "email": "joao@email.com",
  "nascimento": "2001-05-20"
}
```

---

### 📚 Cursos — `/cursos`

| Método | Rota         | Descrição                        |
|--------|--------------|----------------------------------|
| GET    | `/cursos`    | Lista todos os cursos (paginação) |
| POST   | `/cursos`    | Cria um novo curso               |
| GET    | `/cursos/:id`| Busca curso por ID               |
| PUT    | `/cursos/:id`| Atualiza curso por ID            |
| DELETE | `/cursos/:id`| Remove curso por ID              |

**Body para criar/atualizar:**
```json
{
  "nome": "Desenvolvimento Web",
  "descricao": "Curso completo de web",
  "vagas": 30
}
```

---

### 🎓 Turmas (Matrículas) — `/turmas`

| Método | Rota                      | Descrição                          |
|--------|---------------------------|------------------------------------|
| GET    | `/turmas`                 | Lista todas as matrículas          |
| POST   | `/turmas`                 | ⭐ Realiza uma matrícula            |
| GET    | `/turmas/:id`             | Busca matrícula por ID             |
| DELETE | `/turmas/:id`             | Cancela matrícula                  |
| GET    | `/turmas/aluno/:alunoId`  | Lista cursos de um aluno           |

**Body para matricular:**
```json
{
  "aluno_id": 1,
  "curso_id": 2
}
```

---

## ⭐ Regra de Ouro — Controle de Vagas

A matrícula de um aluno em um curso segue este fluxo de validação:

```
POST /turmas
  │
  ├─ ❌ aluno_id ou curso_id ausentes? → 400 Bad Request
  ├─ ❌ Aluno não existe?              → 404 Not Found
  ├─ ❌ Curso não existe?              → 404 Not Found
  ├─ ❌ Curso sem vagas?               → 409 Conflict
  ├─ ❌ Aluno já matriculado?          → 409 Conflict
  │
  └─ ✅ Tudo OK → Executa TRANSAÇÃO:
       BEGIN
         UPDATE cursos SET vagas = vagas - 1 WHERE id = ? AND vagas > 0
         INSERT INTO turmas (aluno_id, curso_id) VALUES (?, ?)
       COMMIT
```

A **transação** garante que, mesmo em caso de falha no meio da operação, o banco volta ao estado original (ROLLBACK automático).

---

## 🧪 Exemplos de Teste (Insomnia / Postman)

```bash
# Listar alunos (página 2, 5 por página)
GET http://localhost:3000/alunos?page=2&limit=5

# Criar aluno
POST http://localhost:3000/alunos
Body: { "nome": "Maria Teste", "email": "maria@teste.com", "nascimento": "2000-01-01" }

# Matricular aluno no curso
POST http://localhost:3000/turmas
Body: { "aluno_id": 1, "curso_id": 1 }

# Ver cursos de um aluno
GET http://localhost:3000/turmas/aluno/1
```
