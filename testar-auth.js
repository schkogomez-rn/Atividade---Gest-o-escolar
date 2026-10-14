/**
 * Script de teste automatizado para os 3 passos de autenticação JWT
 * Execute: node testar-auth.js
 */
const http = require('http');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Função auxiliar para fazer requisições HTTP
function request(method, path, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = data;
                try {
                    parsed = JSON.parse(data);
                } catch (e) {}
                resolve({ status: res.statusCode, data: parsed });
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    console.log('====================================================');
    console.log('🧪 INICIANDO TESTES DO CRACHÁ (JWT)');
    console.log('====================================================\n');

    // 0. Garantir uma conta para teste
    const credenciais = {
        nome: 'Aluno Teste',
        email: `teste_${Date.now()}@escola.com`,
        senha: 'senhaSuperSecreta123'
    };

    console.log('📋 Preparando: Criando conta temporária para o teste...');
    const regRes = await request('POST', '/contas/registrar', {}, credenciais);
    if (regRes.status !== 201) {
        console.error('❌ Falha ao registrar conta de teste:', regRes);
        return;
    }
    console.log(`✅ Conta criada com sucesso: ${credenciais.email}\n`);

    // ============================================================
    // TESTE 1: Pegando o Crachá (Login)
    // ============================================================
    console.log('----------------------------------------------------');
    console.log('👉 TESTE 1: Pegando o Crachá (POST /contas/login)');
    console.log('----------------------------------------------------');
    const loginRes = await request('POST', '/contas/login', {}, {
        email: credenciais.email,
        senha: credenciais.senha
    });

    console.log(`Status HTTP: ${loginRes.status}`);
    console.log('Resposta do Servidor:', loginRes.data);

    const token = loginRes.data && loginRes.data.token;
    if (!token) {
        console.error('❌ Erro: Token não recebido no login!');
        return;
    }
    console.log('\n🎫 Crachá (Token JWT) obtido com sucesso:');
    console.log(token);
    console.log('\n✅ TESTE 1 PASSOU COM SUCESSO!\n');

    // ============================================================
    // TESTE 2: Tentando entrar na sala sem crachá (Falha 401)
    // ============================================================
    console.log('----------------------------------------------------');
    console.log('👉 TESTE 2: Tentando entrar sem crachá (GET /contas/perfil)');
    console.log('----------------------------------------------------');
    const semTokenRes = await request('GET', '/contas/perfil');

    console.log(`Status HTTP retornado: ${semTokenRes.status} (Esperado: 401)`);
    console.log('Resposta do Servidor:', semTokenRes.data);

    if (semTokenRes.status === 401) {
        console.log('🛡️  O segurança barrou a entrada conforme esperado!');
        console.log('✅ TESTE 2 PASSOU COM SUCESSO!\n');
    } else {
        console.error('❌ TESTE 2 FALHOU: Deveria retornar status 401.');
    }

    // ============================================================
    // TESTE 3: Mostrando o Crachá (Sucesso 200)
    // ============================================================
    console.log('----------------------------------------------------');
    console.log('👉 TESTE 3: Mostrando o Crachá Bearer (GET /contas/perfil)');
    console.log('----------------------------------------------------');
    const comTokenRes = await request('GET', '/contas/perfil', {
        'Authorization': `Bearer ${token}`
    });

    console.log(`Status HTTP retornado: ${comTokenRes.status} (Esperado: 200)`);
    console.log('Dados do Perfil retornados pelo Controller:', comTokenRes.data);

    if (comTokenRes.status === 200 && comTokenRes.data && comTokenRes.data.email === credenciais.email) {
        console.log('🎉 O segurança liberou a porta e os dados do usuário foram retornados!');
        console.log('✅ TESTE 3 PASSOU COM SUCESSO!\n');
    } else {
        console.error('❌ TESTE 3 FALHOU: Não retornou os dados esperados.');
    }

    console.log('====================================================');
    console.log('🏆 TODOS OS TESTES FORAM CONCLUÍDOS!');
    console.log('====================================================');
}

runTests().catch(err => {
    if (err.code === 'ECONNREFUSED') {
        console.error('❌ O servidor não está rodando em http://localhost:3000. Inicie com "npm run dev" ou "npm start" antes de rodar o teste.');
    } else {
        console.error('❌ Erro durante os testes:', err);
    }
});
