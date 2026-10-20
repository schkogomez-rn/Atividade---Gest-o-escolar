// src/middlewares/roleMiddleware.js
// ------------------------------------------------------------
// 2º Segurança: O Segurança da Função / Cargo (RBAC)
// Verifica se o usuário logado tem permissão para a ação.
// ------------------------------------------------------------

// Esta função recebe quais cargos podem acessar a rota (Ex: 'admin', 'secretaria')
const autorizarCargos = (...cargosPermitidos) => {
    
    // Ela retorna um middleware configurado
    return (req, res, next) => {
        // Pega o cargo que foi descoberto pelo middleware de autenticação (authMiddleware)
        const cargoUsuario = req.usuario_cargo;

        // Se o cargo do usuário NÃO estiver na lista de permitidos, bloqueia!
        if (!cargosPermitidos.includes(cargoUsuario)) {
            return res.status(403).json({ 
                mensagem: 'Acesso negado (403 Forbidden). Apenas usuários com o perfil [' + cargosPermitidos.join(', ') + '] têm acesso a este recurso.' 
            });
        }

        // Se o cargo estiver correto, libera a passagem para o Controller!
        next();
    };
};

// Suporta tanto require('./roleMiddleware') quanto { autorizarCargos } = require('./roleMiddleware')
autorizarCargos.autorizarCargos = autorizarCargos;

module.exports = autorizarCargos;
