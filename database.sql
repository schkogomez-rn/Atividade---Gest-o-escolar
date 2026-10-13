-- ============================================================
-- SCRIPT DE SETUP DO BANCO DE DADOS - Gestão Escolar
-- Execute este script no PostgreSQL para criar as tabelas
-- e inserir os dados de teste (mock).
-- ============================================================

-- Cria o banco de dados (execute separadamente, se necessário)
-- CREATE DATABASE gestao_escolar;

-- Remove as tabelas se já existirem (para recriação limpa)
DROP TABLE IF EXISTS turmas CASCADE;
DROP TABLE IF EXISTS alunos CASCADE;
DROP TABLE IF EXISTS cursos CASCADE;
DROP TABLE IF EXISTS contas CASCADE;

-- ============================================================
-- TABELA: contas (autenticação com bcrypt)
-- ============================================================
CREATE TABLE contas (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(100) NOT NULL,
    email       VARCHAR(100) UNIQUE NOT NULL,
    senha_hash  VARCHAR(255) NOT NULL
);

-- ============================================================
-- TABELA: cursos
-- ============================================================
CREATE TABLE cursos (
    id        SERIAL PRIMARY KEY,
    nome      VARCHAR(100) NOT NULL,
    descricao TEXT,
    vagas     INTEGER NOT NULL DEFAULT 30,
    CHECK (vagas >= 0)  -- Garante que vagas nunca fique negativo
);

-- ============================================================
-- TABELA: alunos
-- ============================================================
CREATE TABLE alunos (
    id         SERIAL PRIMARY KEY,
    nome       VARCHAR(100) NOT NULL,
    email      VARCHAR(150) NOT NULL UNIQUE,
    nascimento DATE
);

-- ============================================================
-- TABELA: turmas (tabela intermediária - Aluno <-> Curso)
-- ============================================================
CREATE TABLE turmas (
    id           SERIAL PRIMARY KEY,
    aluno_id     INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    curso_id     INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    data_matricula TIMESTAMP DEFAULT NOW(),
    UNIQUE (aluno_id, curso_id)  -- Um aluno não pode se matricular duas vezes no mesmo curso
);

-- ============================================================
-- DADOS DE TESTE: Cursos
-- ============================================================
INSERT INTO cursos (nome, descricao, vagas) VALUES
('Desenvolvimento Web Full Stack', 'Aprenda HTML, CSS, JavaScript, Node.js e React do zero ao avançado.', 5),
('Banco de Dados com PostgreSQL', 'Modelagem de dados, SQL avançado, stored procedures e otimização de queries.', 3),
('Python para Data Science', 'Pandas, NumPy, Matplotlib e introdução ao Machine Learning com Scikit-learn.', 4),
('UX/UI Design', 'Prototipação, pesquisa com usuários, Figma e design systems modernos.', 6),
('Cibersegurança Essencial', 'Fundamentos de segurança, criptografia, redes e ethical hacking.', 2),
('Desenvolvimento Mobile com React Native', 'Crie apps para iOS e Android com React Native e Expo.', 4),
('DevOps e Cloud Computing', 'Docker, Kubernetes, CI/CD, AWS e práticas de DevOps modernas.', 3),
('Java Spring Boot', 'Desenvolvimento de APIs REST robustas com Spring Boot e Spring Security.', 5);

-- ============================================================
-- DADOS DE TESTE: Alunos (20 alunos mockados)
-- ============================================================
INSERT INTO alunos (nome, email, nascimento) VALUES
('Ana Clara Souza', 'ana.clara@email.com', '2001-03-15'),
('Bruno Henrique Lima', 'bruno.lima@email.com', '2000-07-22'),
('Carla Fernanda Rocha', 'carla.rocha@email.com', '1999-11-08'),
('Diego Martins Pereira', 'diego.pereira@email.com', '2002-01-30'),
('Eduarda Costa Santos', 'eduarda.santos@email.com', '2001-06-17'),
('Felipe Augusto Nunes', 'felipe.nunes@email.com', '1998-09-25'),
('Gabriela Oliveira Cruz', 'gabriela.cruz@email.com', '2003-04-12'),
('Hugo Alexandre Dias', 'hugo.dias@email.com', '2000-12-03'),
('Isabela Moreira Campos', 'isabela.campos@email.com', '1999-08-19'),
('João Victor Almeida', 'joao.almeida@email.com', '2002-05-07'),
('Larissa Pinto Ferreira', 'larissa.ferreira@email.com', '2001-10-28'),
('Marcos Vinicius Ramos', 'marcos.ramos@email.com', '1997-02-14'),
('Natália Gomes Barbosa', 'natalia.barbosa@email.com', '2003-07-31'),
('Otávio Rodrigues Leal', 'otavio.leal@email.com', '2000-03-22'),
('Paula Cristina Melo', 'paula.melo@email.com', '1999-01-09'),
('Rafael Torres Mendes', 'rafael.mendes@email.com', '2002-08-16'),
('Sara Beatriz Cardoso', 'sara.cardoso@email.com', '2001-12-04'),
('Thiago Luiz Correia', 'thiago.correia@email.com', '1998-06-20'),
('Valentina Freitas Araújo', 'valentina.araujo@email.com', '2003-09-11'),
('William Nascimento Silva', 'william.silva@email.com', '2000-04-05');
