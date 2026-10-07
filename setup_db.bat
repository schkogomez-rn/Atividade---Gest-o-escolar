@echo off
set PGPASSWORD=BemVindo!

echo Criando tabelas e inserindo dados no banco "postgres"...
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -h localhost -p 5432 -U postgres -d postgres -f database.sql

echo.
echo Concluido!
pause
