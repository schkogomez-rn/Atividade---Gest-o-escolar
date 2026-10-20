/**
 * ============================================================
 * AcademiaPro - Cockpit Controller com Autenticação JWT & RBAC
 * Sistema de acesso individualizado com login obrigatório
 * e permissões visuais por cargo (admin, secretaria, professor)
 * ============================================================
 */

class CockpitApp {
    constructor() {
        this.apiBase = this.resolveApiBase();
        this.currentView = 'cockpit';

        // Estado de autenticação (Crachá JWT)
        this.token = localStorage.getItem('academiapro_token') || null;
        this.usuario = null;

        // Estados de paginação e listas
        this.alunos = { page: 1, limit: 10, total: 0, items: [] };
        this.cursos = { page: 1, limit: 10, total: 0, items: [] };
        this.turmas = { page: 1, limit: 10, total: 0, items: [] };

        this.allAlunos = [];
        this.allCursos = [];
        this.pendingDelete = null;

        // Mapa de permissões por cargo
        this.permissoes = {
            admin: {
                label: 'Administrador',
                descricao: 'Você possui controle total de criação, edição e exclusão.',
                criarAluno: true,
                editarAluno: true,
                deletarAluno: true,
                criarCurso: true,
                editarCurso: true,
                deletarCurso: true,
                matricular: true,
                cancelarMatricula: true,
                gerenciarContas: true
            },
            secretaria: {
                label: 'Secretaria',
                descricao: 'Você pode matricular alunos e gerenciar dados cadastrais.',
                criarAluno: true,
                editarAluno: true,
                deletarAluno: false,
                criarCurso: false,
                editarCurso: false,
                deletarCurso: false,
                matricular: true,
                cancelarMatricula: false,
                gerenciarContas: false
            },
            professor: {
                label: 'Professor',
                descricao: 'Modo de visualização e consulta docente liberado.',
                criarAluno: false,
                editarAluno: false,
                deletarAluno: false,
                criarCurso: false,
                editarCurso: false,
                deletarCurso: false,
                matricular: false,
                cancelarMatricula: false,
                gerenciarContas: false
            }
        };

        this.init();
    }

    resolveApiBase() {
        if (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '3000')) {
            return 'http://localhost:3000';
        }
        return '';
    }

    // ============================================================
    // INICIALIZAÇÃO E FLUXO DE LOGIN OBRIGATÓRIO
    // ============================================================

    async init() {
        this.bindLoginScreenEvents();
        this.bindEvents();
        await this.checkApiStatus();

        // Verifica se já existe token salvo (sessão anterior)
        if (this.token) {
            const valido = await this.carregarPerfil();
            if (valido) {
                this.entrarNoSistema();
            } else {
                // Token expirado ou inválido: mostra login
                this.logout(true);
                this.mostrarTelaLogin();
            }
        } else {
            this.mostrarTelaLogin();
        }

        setInterval(() => this.checkApiStatus(), 30000);
    }

    mostrarTelaLogin() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
    }

    async entrarNoSistema() {
        // Esconde login, mostra o sistema principal
        document.getElementById('loginScreen').style.display = 'none';
        const appContainer = document.getElementById('appContainer');
        appContainer.style.display = 'flex';
        appContainer.classList.add('fade-in');

        // Aplica permissões visuais baseadas no cargo
        this.aplicarPermissoesVisuais();
        this.atualizarHeaderUsuario();
        this.atualizarCardCracha();

        // Carrega dados
        await this.refreshAll();
    }

    // ============================================================
    // TELA DE LOGIN (PÁGINA DE ENTRADA)
    // ============================================================

    bindLoginScreenEvents() {
        const formLogin = document.getElementById('formLoginScreen');
        if (formLogin) {
            formLogin.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLoginScreen();
            });
        }
    }

    async quickLoginScreen(email, senha) {
        document.getElementById('loginScreenEmail').value = email;
        document.getElementById('loginScreenSenha').value = senha;
        await this.handleLoginScreen();
    }

    async handleLoginScreen() {
        const email = document.getElementById('loginScreenEmail').value.trim();
        const senha = document.getElementById('loginScreenSenha').value;
        const btn = document.getElementById('btnLoginScreen');
        const errorBox = document.getElementById('loginScreenError');

        btn.disabled = true;
        btn.innerHTML = `
            <svg class="spin-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Autenticando...
        `;
        errorBox.style.display = 'none';

        try {
            const res = await fetch(`${this.apiBase}/contas/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.mensagem || 'Credenciais inválidas');

            this.token = data.token;
            localStorage.setItem('academiapro_token', data.token);

            await this.carregarPerfil();
            await this.entrarNoSistema();

            this.showToast(`Bem-vindo(a), ${this.usuario?.nome}! Perfil: ${this.usuario?.cargo?.toUpperCase()}`, 'success');
        } catch (err) {
            errorBox.textContent = `❌ ${err.message}`;
            errorBox.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10 17 15 12 10 7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                Entrar
            `;
        }
    }

    // ============================================================
    // AUTENTICAÇÃO JWT E FETCH COM TRATAMENTO RBAC
    // ============================================================

    authHeaders(extra = {}) {
        const headers = { 'Content-Type': 'application/json', ...extra };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    async authFetch(url, options = {}) {
        const opts = {
            ...options,
            headers: this.authHeaders(options.headers || {})
        };

        const res = await fetch(url, opts);

        // Erro 401: Token inválido ou ausente (1º Segurança)
        if (res.status === 401) {
            const data = await res.json().catch(() => ({}));
            this.showToast(`🔒 ${data.mensagem || 'Sessão expirada. Faça login novamente.'}`, 'error');
            this.logout(true);
            this.mostrarTelaLogin();
            throw new Error('Não autenticado');
        }

        // Erro 403: Acesso Negado pelo RBAC (2º Segurança)
        if (res.status === 403) {
            const data = await res.json().catch(() => ({}));
            const msg = data.mensagem || 'Acesso negado (403 Forbidden). Seu cargo não permite esta ação.';
            this.showToast(`⛔ ${msg}`, 'error');
            throw new Error(msg);
        }

        return res;
    }

    async carregarPerfil() {
        try {
            const res = await fetch(`${this.apiBase}/contas/perfil`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!res.ok) return false;

            this.usuario = await res.json();
            return true;
        } catch {
            return false;
        }
    }

    // ============================================================
    // SISTEMA DE PERMISSÕES VISUAIS POR CARGO (RBAC FRONTEND)
    // ============================================================

    getPermissao(acao) {
        const cargo = this.usuario?.cargo || 'professor';
        return this.permissoes[cargo]?.[acao] || false;
    }

    aplicarPermissoesVisuais() {
        const cargo = this.usuario?.cargo || 'professor';
        const perms = this.permissoes[cargo] || this.permissoes.professor;

        // === Abas de Navegação ===
        // Aba "Contas & RBAC" - apenas admin
        document.querySelectorAll('.rbac-admin-only').forEach(el => {
            el.style.display = perms.gerenciarContas ? '' : 'none';
        });

        // === Botões de Criar Aluno ===
        document.querySelectorAll('.rbac-aluno-create').forEach(el => {
            el.style.display = perms.criarAluno ? '' : 'none';
        });

        // === Botões de Criar Curso ===
        document.querySelectorAll('.rbac-curso-create').forEach(el => {
            el.style.display = perms.criarCurso ? '' : 'none';
        });

        // === Formulário de Matrícula Rápida ===
        document.querySelectorAll('.rbac-enroll').forEach(el => {
            el.style.display = perms.matricular ? '' : 'none';
        });

        // === Ribbon de Informações de Perfil ===
        const ribbonInfo = document.getElementById('ribbonPerfilInfo');
        if (ribbonInfo) {
            ribbonInfo.textContent = perms.descricao;
        }
        const flashTag = document.querySelector('.flash-tag');
        if (flashTag) {
            flashTag.textContent = `⚡ RBAC ATIVO • PERFIL [${cargo.toUpperCase()}]`;
        }
    }

    atualizarHeaderUsuario() {
        const container = document.getElementById('userProfileArea');
        if (!container) return;

        if (!this.usuario) {
            container.innerHTML = '';
            return;
        }

        const initials = this.getInitials(this.usuario.nome);
        const cargoBadgeClass = `badge-cargo-${this.usuario.cargo || 'professor'}`;

        container.innerHTML = `
            <div class="user-profile-pill">
                <div class="user-avatar-sm">${initials}</div>
                <div class="user-info-sm" style="display:flex; align-items:center; gap:6px;">
                    <strong>${this.escapeHtml(this.usuario.nome)}</strong>
                    <span class="badge-cargo-tag ${cargoBadgeClass}">${(this.usuario.cargo || 'User').toUpperCase()}</span>
                </div>
                <button class="btn-logout" onclick="app.logout()" title="Sair / Desconectar">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                </button>
            </div>
        `;
    }

    atualizarCardCracha() {
        const box = document.getElementById('crachaConteudo');
        if (!box) return;

        if (!this.usuario) {
            box.innerHTML = `
                <div class="muted text-center" style="padding:15px 0;">
                    <p>Nenhum crachá ativo no momento.</p>
                </div>
            `;
            return;
        }

        const cargo = this.usuario.cargo || 'professor';
        const perms = this.permissoes[cargo] || this.permissoes.professor;
        const cargoBadgeClass = `badge-cargo-${cargo}`;

        // Gera lista de permissões visuais
        const permList = [
            { label: 'Criar Alunos', value: perms.criarAluno },
            { label: 'Editar Alunos', value: perms.editarAluno },
            { label: 'Excluir Alunos', value: perms.deletarAluno },
            { label: 'Criar Cursos', value: perms.criarCurso },
            { label: 'Editar Cursos', value: perms.editarCurso },
            { label: 'Excluir Cursos', value: perms.deletarCurso },
            { label: 'Matricular', value: perms.matricular },
            { label: 'Cancelar Matrícula', value: perms.cancelarMatricula },
            { label: 'Gerenciar Contas', value: perms.gerenciarContas },
        ];

        const permTags = permList.map(p =>
            `<span class="perm-tag ${p.value ? 'allow' : 'deny'}">${p.value ? '✓' : '✗'} ${p.label}</span>`
        ).join('');

        box.innerHTML = `
            <div class="cracha-card-visual">
                <div class="cracha-head">
                    <span class="badge-cargo-tag ${cargoBadgeClass}">CRACHÁ OFICIAL • ${cargo.toUpperCase()}</span>
                    <span style="font-family:var(--font-mono); font-size:11px; color:#818cf8;">ID #${this.usuario.id}</span>
                </div>
                <div class="cracha-info-row">
                    <strong>${this.escapeHtml(this.usuario.nome)}</strong>
                    <span>${this.escapeHtml(this.usuario.email)}</span>
                </div>
                <div class="cracha-permissoes">
                    <div style="margin-bottom:6px;"><strong>Permissões do Perfil:</strong></div>
                    <div class="permission-ribbon">${permTags}</div>
                </div>
            </div>
        `;
    }

    logout(silencioso = false) {
        this.token = null;
        this.usuario = null;
        localStorage.removeItem('academiapro_token');

        // Limpa formulário da tela de login
        const formLogin = document.getElementById('formLoginScreen');
        if (formLogin) formLogin.reset();
        const errorBox = document.getElementById('loginScreenError');
        if (errorBox) errorBox.style.display = 'none';

        // Volta para tela de login
        this.mostrarTelaLogin();

        if (!silencioso) {
            this.showToast('Crachá devolvido. Você foi desconectado do sistema.', 'info');
        }
    }

    // ============================================================
    // EVENTOS E NAVEGAÇÃO
    // ============================================================

    bindEvents() {
        // Seletor de abas
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchView(btn.dataset.view);
            });
        });

        // Botão Atualizar
        const btnRefresh = document.getElementById('btnRefresh');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => {
                this.showToast('Sincronizando dados...', 'info');
                this.refreshAll();
            });
        }

        // Formulário de Registrar Conta
        const formRegistrar = document.getElementById('formRegistrar');
        if (formRegistrar) {
            formRegistrar.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegistrar();
            });
        }

        // Filtros Cockpit
        const sAlunos = document.getElementById('cockpitSearchAlunos');
        if (sAlunos) sAlunos.addEventListener('input', (e) => this.filterCockpitAlunos(e.target.value));

        const sCursos = document.getElementById('cockpitSearchCursos');
        if (sCursos) sCursos.addEventListener('input', (e) => this.filterCockpitCursos(e.target.value));

        const sTurmas = document.getElementById('cockpitSearchTurmas');
        if (sTurmas) sTurmas.addEventListener('input', (e) => this.filterCockpitTurmas(e.target.value));

        // Paginação Cockpit Alunos
        document.getElementById('cockpitAlunoPrev')?.addEventListener('click', () => {
            if (this.alunos.page > 1) { this.alunos.page--; this.loadAlunos(); }
        });
        document.getElementById('cockpitAlunoNext')?.addEventListener('click', () => {
            const max = Math.ceil(this.alunos.total / this.alunos.limit);
            if (this.alunos.page < max) { this.alunos.page++; this.loadAlunos(); }
        });

        // Paginação Cockpit Cursos
        document.getElementById('cockpitCursoPrev')?.addEventListener('click', () => {
            if (this.cursos.page > 1) { this.cursos.page--; this.loadCursos(); }
        });
        document.getElementById('cockpitCursoNext')?.addEventListener('click', () => {
            const max = Math.ceil(this.cursos.total / this.cursos.limit);
            if (this.cursos.page < max) { this.cursos.page++; this.loadCursos(); }
        });

        // Paginação Cockpit Turmas
        document.getElementById('cockpitTurmaPrev')?.addEventListener('click', () => {
            if (this.turmas.page > 1) { this.turmas.page--; this.loadTurmas(); }
        });
        document.getElementById('cockpitTurmaNext')?.addEventListener('click', () => {
            const max = Math.ceil(this.turmas.total / this.turmas.limit);
            if (this.turmas.page < max) { this.turmas.page++; this.loadTurmas(); }
        });

        // Matrícula Cockpit
        document.getElementById('cockpitQuickEnrollForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleQuickEnroll();
        });

        document.getElementById('quickSelectCurso')?.addEventListener('change', (e) => {
            this.updateVacancyIndicator(e.target.value);
        });

        // Modais
        document.getElementById('formAluno')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveAluno();
        });

        document.getElementById('formCurso')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCurso();
        });

        document.getElementById('btnConfirmDelete')?.addEventListener('click', () => {
            if (this.pendingDelete) {
                this.pendingDelete();
                this.pendingDelete = null;
                this.closeModal('modalConfirmDelete');
            }
        });

        // Fechar com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-backdrop.show').forEach(m => m.classList.remove('show'));
            }
        });
    }

    switchView(viewName) {
        // Verifica se o usuário pode acessar a vista
        if (viewName === 'contas' && !this.getPermissao('gerenciarContas')) {
            this.showToast('⛔ Acesso restrito. Apenas administradores podem acessar esta seção.', 'error');
            return;
        }

        this.currentView = viewName;
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });

        const views = {
            cockpit: 'viewCockpit',
            alunos:  'viewAlunos',
            cursos:  'viewCursos',
            turmas:  'viewTurmas',
            contas:  'viewContas'
        };

        document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
        const target = document.getElementById(views[viewName] || 'viewCockpit');
        if (target) target.classList.add('active');

        if (viewName === 'alunos') this.renderFullAlunos();
        if (viewName === 'cursos') this.renderFullCursos();
        if (viewName === 'turmas') this.renderFullTurmas();
        if (viewName === 'contas') this.carregarListaContas();
    }

    async checkApiStatus() {
        const badge = document.getElementById('apiStatusBadge');
        const text = document.getElementById('apiStatusText');
        try {
            const res = await fetch(`${this.apiBase}/`, { headers: { 'Accept': 'application/json' } });
            if (res.ok) {
                if (badge) badge.className = 'api-status-badge';
                if (text) text.textContent = 'Online';
            } else {
                throw new Error();
            }
        } catch {
            if (badge) badge.className = 'api-status-badge offline';
            if (text) text.textContent = 'Offline';
        }
    }

    async refreshAll() {
        await Promise.all([
            this.loadAlunos(),
            this.loadCursos(),
            this.loadTurmas(),
            this.loadSelectOptions()
        ]);
        this.updateRibbonMetrics();
    }

    // ============================================================
    // CARREGAMENTO DE DADOS COM AUTENTICAÇÃO
    // ============================================================

    async loadAlunos() {
        try {
            const res = await this.authFetch(`${this.apiBase}/alunos?page=${this.alunos.page}&limit=${this.alunos.limit}`);
            const data = await res.json();
            this.alunos.items = data.dados || [];
            this.alunos.total = data.paginacao?.total || 0;

            document.getElementById('metricAlunos').textContent = this.alunos.total;
            document.getElementById('cockpitAlunosCount').textContent = this.alunos.total;

            this.renderCockpitAlunos(this.alunos.items);
            this.renderPaginationInfo('cockpitAlunosPagInfo', 'cockpitAlunoPageNum', 'cockpitAlunoPrev', 'cockpitAlunoNext', data.paginacao);
            if (this.currentView === 'alunos') this.renderFullAlunos();
        } catch (err) {
            console.warn('Alunos:', err.message);
        }
    }

    async loadCursos() {
        try {
            const res = await this.authFetch(`${this.apiBase}/cursos?page=${this.cursos.page}&limit=${this.cursos.limit}`);
            const data = await res.json();
            this.cursos.items = data.dados || [];
            this.cursos.total = data.paginacao?.total || 0;

            document.getElementById('metricCursos').textContent = this.cursos.total;
            document.getElementById('cockpitCursosCount').textContent = this.cursos.total;

            this.renderCockpitCursos(this.cursos.items);
            this.renderPaginationInfo('cockpitCursosPagInfo', 'cockpitCursoPageNum', 'cockpitCursoPrev', 'cockpitCursoNext', data.paginacao);
            if (this.currentView === 'cursos') this.renderFullCursos();
        } catch (err) {
            console.warn('Cursos:', err.message);
        }
    }

    async loadTurmas() {
        try {
            const res = await this.authFetch(`${this.apiBase}/turmas?page=${this.turmas.page}&limit=${this.turmas.limit}`);
            const data = await res.json();
            this.turmas.items = data.dados || [];
            this.turmas.total = data.paginacao?.total || 0;

            document.getElementById('metricMatriculas').textContent = this.turmas.total;
            document.getElementById('cockpitTurmasCount').textContent = this.turmas.total;

            this.renderCockpitTurmas(this.turmas.items);
            this.renderPaginationInfo('cockpitTurmasPagInfo', 'cockpitTurmaPageNum', 'cockpitTurmaPrev', 'cockpitTurmaNext', data.paginacao);
            if (this.currentView === 'turmas') this.renderFullTurmas();
        } catch (err) {
            console.warn('Turmas:', err.message);
        }
    }

    async loadSelectOptions() {
        try {
            const [rA, rC] = await Promise.all([
                this.authFetch(`${this.apiBase}/alunos?limit=100`),
                this.authFetch(`${this.apiBase}/cursos?limit=100`)
            ]);
            const dA = await rA.json();
            const dC = await rC.json();

            this.allAlunos = dA.dados || [];
            this.allCursos = dC.dados || [];

            const sA = document.getElementById('quickSelectAluno');
            if (sA) {
                sA.innerHTML = '<option value="">-- Selecione o Aluno --</option>' +
                    this.allAlunos.map(a => `<option value="${a.id}">${this.escapeHtml(a.nome)} (#${a.id})</option>`).join('');
            }

            const sC = document.getElementById('quickSelectCurso');
            if (sC) {
                sC.innerHTML = '<option value="">-- Selecione o Curso --</option>' +
                    this.allCursos.map(c => {
                        const tag = c.vagas > 0 ? `[${c.vagas} vaga(s)]` : `[ESGOTADO]`;
                        return `<option value="${c.id}">${this.escapeHtml(c.nome)} ${tag}</option>`;
                    }).join('');
            }

            this.updateVacancyIndicator('');
        } catch (err) {
            console.warn('Select options:', err.message);
        }
    }

    updateRibbonMetrics() {
        let vagasLivres = 0;
        this.allCursos.forEach(c => { vagasLivres += (parseInt(c.vagas, 10) || 0); });
        const mVagas = document.getElementById('metricVagas');
        if (mVagas) mVagas.textContent = vagasLivres;
    }

    // ============================================================
    // REGISTRAR CONTA (apenas admin)
    // ============================================================

    async handleRegistrar() {
        const nome = document.getElementById('registrarNome').value.trim();
        const email = document.getElementById('registrarEmail').value.trim();
        const senha = document.getElementById('registrarSenha').value;
        const cargo = document.getElementById('registrarCargo').value;

        const btn = document.getElementById('btnRegistrar');
        const result = document.getElementById('registrarResult');

        btn.disabled = true;
        btn.textContent = 'Processando...';
        result.style.display = 'none';

        try {
            const res = await this.authFetch(`${this.apiBase}/contas/registrar`, {
                method: 'POST',
                body: JSON.stringify({ nome, email, senha, cargo })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.mensagem || 'Falha ao cadastrar');

            result.className = 'conta-result success';
            result.textContent = `✅ Conta criada com sucesso para ${data.nome} com cargo [${data.cargo}]!`;
            result.style.display = 'block';

            this.showToast(`Conta de ${data.nome} criada com sucesso!`, 'success');
            document.getElementById('formRegistrar').reset();
            this.carregarListaContas();
        } catch (err) {
            result.className = 'conta-result error';
            result.textContent = `❌ ${err.message}`;
            result.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Criar Conta';
        }
    }

    async carregarListaContas() {
        const container = document.getElementById('listaContasContainer');
        if (!container) return;

        try {
            const res = await this.authFetch(`${this.apiBase}/contas`);
            const contas = await res.json();

            if (!Array.isArray(contas) || contas.length === 0) {
                container.innerHTML = '<p class="muted text-center" style="padding:15px 0;">Nenhuma conta encontrada.</p>';
                return;
            }

            container.innerHTML = contas.map(c => {
                const cargoBadge = `badge-cargo-${c.cargo || 'professor'}`;
                const isSelf = this.usuario && this.usuario.id === c.id;
                return `
                    <div class="conta-list-item">
                        <div class="conta-list-info">
                            <strong>${this.escapeHtml(c.nome)} ${isSelf ? '(Você)' : ''}</strong>
                            <span>${this.escapeHtml(c.email)}</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="badge-cargo-tag ${cargoBadge}">${(c.cargo || 'professor').toUpperCase()}</span>
                            ${!isSelf ? `<button class="btn btn-xs btn-danger" onclick="app.confirmRemoverConta(${c.id}, '${this.escapeHtml(c.nome)}')">Remover</button>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        } catch (err) {
            container.innerHTML = `<p class="muted text-center" style="padding:15px 0;">Erro ao carregar contas.</p>`;
        }
    }

    confirmRemoverConta(id, nome) {
        document.getElementById('confirmDeleteMsg').textContent = `Deseja realmente remover a conta de "${nome}"?`;
        document.getElementById('confirmDeleteWarn').style.display = 'none';

        this.pendingDelete = async () => {
            try {
                const res = await this.authFetch(`${this.apiBase}/contas/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.mensagem || 'Falha ao remover conta');

                this.showToast('Conta removida com sucesso!', 'success');
                this.carregarListaContas();
            } catch (err) {
                this.showToast(err.message, 'error');
            }
        };
        this.openModal('modalConfirmDelete');
    }

    // ============================================================
    // RENDERIZADORES DO COCKPIT (COM PERMISSÕES VISUAIS)
    // ============================================================

    renderCockpitAlunos(alunos) {
        const tbody = document.getElementById('cockpitAlunosBody');
        if (!tbody) return;

        if (!alunos || alunos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center muted">Nenhum aluno encontrado.</td></tr>`;
            return;
        }

        const canEdit = this.getPermissao('editarAluno');
        const canDelete = this.getPermissao('deletarAluno');
        const canEnroll = this.getPermissao('matricular');

        tbody.innerHTML = alunos.map(a => {
            const initials = this.getInitials(a.nome);
            const dtNasc = a.nascimento ? this.formatDate(a.nascimento) : '<span class="muted">-</span>';

            let acoes = `
                <button class="btn-icon-xs" title="Ver Cursos Inscritos" onclick="app.viewAlunoHistorico(${a.id})">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                    </svg>
                </button>
            `;

            if (canEnroll) {
                acoes = `
                    <button class="btn-icon-xs" title="Matricular este aluno" onclick="app.presetEnrollAluno(${a.id})">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M12 5v14M5 12h14"/>
                        </svg>
                    </button>
                ` + acoes;
            }

            if (canEdit) {
                acoes += `
                    <button class="btn-icon-xs" title="Editar Aluno" onclick="app.openEditAluno(${a.id})">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                `;
            }

            if (canDelete) {
                acoes += `
                    <button class="btn-icon-xs danger" title="Excluir Aluno" onclick="app.confirmDeleteAluno(${a.id}, '${this.escapeHtml(a.nome)}')">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                `;
            }

            return `
                <tr>
                    <td>
                        <div class="aluno-cell">
                            <div class="avatar-mini">${initials}</div>
                            <div class="aluno-cell-info">
                                <strong>${this.escapeHtml(a.nome)}</strong>
                                <span>${this.escapeHtml(a.email)}</span>
                            </div>
                        </div>
                    </td>
                    <td class="text-xs">${dtNasc}</td>
                    <td class="text-right">
                        <div class="btn-group-row">${acoes}</div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderCockpitCursos(cursos) {
        const container = document.getElementById('cockpitCursosContainer');
        if (!container) return;

        if (!cursos || cursos.length === 0) {
            container.innerHTML = `<p class="muted text-center" style="padding:20px;">Nenhum curso cadastrado.</p>`;
            return;
        }

        const canEdit = this.getPermissao('editarCurso');
        const canDelete = this.getPermissao('deletarCurso');

        container.innerHTML = cursos.map(c => {
            const vagas = parseInt(c.vagas, 10) || 0;
            const maxCap = Math.max(30, vagas + 5);
            const ocupacaoPct = Math.min(100, Math.round(((maxCap - vagas) / maxCap) * 100));

            let badgeClass = 'badge-vagas-abertas';
            let barColor = 'green';
            let statusText = `${vagas} vaga(s)`;

            if (vagas <= 0) {
                badgeClass = 'badge-vagas-esgotadas';
                barColor = 'red';
                statusText = 'ESGOTADO';
            } else if (vagas <= 3) {
                badgeClass = 'badge-vagas-poucas';
                barColor = 'amber';
                statusText = `Últimas ${vagas} vagas`;
            }

            let acoesCurso = '';
            if (canEdit) {
                acoesCurso += `
                    <button class="btn-icon-xs" title="Editar Curso" onclick="app.openEditCurso(${c.id})">
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                `;
            }
            if (canDelete) {
                acoesCurso += `
                    <button class="btn-icon-xs danger" title="Excluir Curso" onclick="app.confirmDeleteCurso(${c.id}, '${this.escapeHtml(c.nome)}')">
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                `;
            }

            return `
                <div class="curso-compact-item">
                    <div class="curso-item-header">
                        <strong class="curso-item-title">${this.escapeHtml(c.nome)}</strong>
                        <span class="curso-item-badge ${badgeClass}">${statusText}</span>
                    </div>

                    <div class="progress-occupancy">
                        <div class="progress-track">
                            <div class="progress-fill ${barColor}" style="width: ${vagas === 0 ? 100 : (100 - ocupacaoPct)}%"></div>
                        </div>
                    </div>

                    <div class="curso-item-meta">
                        <span class="curso-item-desc">${this.escapeHtml(c.descricao || 'Sem descrição')}</span>
                        ${acoesCurso ? `<div class="btn-group-row">${acoesCurso}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderCockpitTurmas(turmas) {
        const tbody = document.getElementById('cockpitTurmasBody');
        if (!tbody) return;

        if (!turmas || turmas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center muted">Nenhuma matrícula registrada.</td></tr>`;
            return;
        }

        const canCancel = this.getPermissao('cancelarMatricula');

        tbody.innerHTML = turmas.map(t => `
            <tr>
                <td><strong>${this.escapeHtml(t.aluno_nome)}</strong></td>
                <td><span class="badge-tag-sm">${this.escapeHtml(t.curso_nome)}</span></td>
                <td class="text-xs">${this.formatDate(t.data_matricula)}</td>
                <td class="text-right">
                    ${canCancel ? `
                        <button class="btn btn-xs btn-danger" onclick="app.confirmCancelarMatricula(${t.matricula_id}, '${this.escapeHtml(t.aluno_nome)}', '${this.escapeHtml(t.curso_nome)}')">
                            Cancelar
                        </button>
                    ` : '<span class="muted text-xs">Consulta</span>'}
                </td>
            </tr>
        `).join('');
    }

    renderPaginationInfo(infoId, numId, prevBtnId, nextBtnId, pag) {
        if (!pag) return;
        const info = document.getElementById(infoId);
        const num = document.getElementById(numId);
        const btnP = document.getElementById(prevBtnId);
        const btnN = document.getElementById(nextBtnId);

        if (info) info.textContent = `${pag.total} registros`;
        if (num) num.textContent = `${pag.pagina_atual}/${pag.total_paginas || 1}`;

        if (btnP) btnP.disabled = pag.pagina_atual <= 1;
        if (btnN) btnN.disabled = pag.pagina_atual >= pag.total_paginas;
    }

    // ============================================================
    // REGRA DE OURO: MATRÍCULA
    // ============================================================

    updateVacancyIndicator(cursoId) {
        const box = document.getElementById('quickVacancyIndicator');
        if (!box) return;

        if (!cursoId) {
            box.className = 'vacancy-indicator-bar';
            box.innerHTML = '<span class="muted">Selecione o curso para conferir as vagas em tempo real.</span>';
            return;
        }

        const curso = this.allCursos.find(c => c.id == cursoId);
        if (!curso) return;

        if (curso.vagas <= 0) {
            box.className = 'vacancy-indicator-bar err';
            box.innerHTML = `<strong>❌ Bloqueado pela Regra de Ouro:</strong> Curso esgotado (0 vagas disponíveis).`;
        } else {
            box.className = 'vacancy-indicator-bar ok';
            box.innerHTML = `<strong>✅ Vagas disponíveis: ${curso.vagas}.</strong> Transação ACID pronta para efetivar matrícula.`;
        }
    }

    presetEnrollAluno(alunoId) {
        this.switchView('cockpit');
        const select = document.getElementById('quickSelectAluno');
        if (select) {
            select.value = alunoId;
            document.getElementById('quickSelectCurso')?.focus();
            this.showToast('Aluno selecionado no formulário de matrícula!', 'info');
        }
    }

    async handleQuickEnroll() {
        const alunoId = parseInt(document.getElementById('quickSelectAluno').value, 10);
        const cursoId = parseInt(document.getElementById('quickSelectCurso').value, 10);

        if (!alunoId || !cursoId) {
            this.showToast('Selecione um aluno e um curso.', 'error');
            return;
        }

        const btn = document.getElementById('btnSubmitQuickEnroll');
        btn.disabled = true;
        btn.textContent = 'Processando ACID...';

        try {
            const res = await this.authFetch(`${this.apiBase}/turmas`, {
                method: 'POST',
                body: JSON.stringify({ aluno_id: alunoId, curso_id: cursoId })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.erro || data.mensagem || 'Falha na matrícula');

            this.showToast('✅ ' + (data.mensagem || 'Matrícula realizada com sucesso!'), 'success');
            document.getElementById('cockpitQuickEnrollForm')?.reset();
            this.updateVacancyIndicator('');

            await this.refreshAll();
        } catch (err) {
            this.showToast(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Confirmar Matrícula';
        }
    }

    quickOpenEnrollModal() {
        this.switchView('cockpit');
        document.getElementById('quickSelectAluno')?.focus();
    }

    // ============================================================
    // MODAIS DE CRIAÇÃO / EDIÇÃO / EXCLUSÃO
    // ============================================================

    openAlunoModal(aluno = null) {
        document.getElementById('formAluno').reset();
        document.getElementById('alunoId').value = aluno ? aluno.id : '';
        document.getElementById('modalAlunoTitle').textContent = aluno ? 'Editar Aluno' : 'Cadastrar Aluno';

        if (aluno) {
            document.getElementById('alunoNome').value = aluno.nome;
            document.getElementById('alunoEmail').value = aluno.email;
            if (aluno.nascimento) {
                const d = new Date(aluno.nascimento);
                document.getElementById('alunoNascimento').value = d.toISOString().split('T')[0];
            }
        }
        this.openModal('modalAluno');
    }

    async openEditAluno(id) {
        if (!this.getPermissao('editarAluno')) {
            this.showToast('⛔ Seu perfil não permite editar alunos.', 'error');
            return;
        }
        try {
            const res = await this.authFetch(`${this.apiBase}/alunos/${id}`);
            const aluno = await res.json();
            this.openAlunoModal(aluno);
        } catch (err) {
            this.showToast('Erro ao carregar dados do aluno', 'error');
        }
    }

    async saveAluno() {
        const id = document.getElementById('alunoId').value;
        const nome = document.getElementById('alunoNome').value.trim();
        const email = document.getElementById('alunoEmail').value.trim();
        const nascimento = document.getElementById('alunoNascimento').value || null;

        const isEdit = !!id;
        const url = isEdit ? `${this.apiBase}/alunos/${id}` : `${this.apiBase}/alunos`;
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const res = await this.authFetch(url, {
                method,
                body: JSON.stringify({ nome, email, nascimento })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.erro || data.mensagem || 'Falha ao salvar aluno');

            this.showToast(isEdit ? 'Aluno atualizado com sucesso!' : 'Aluno cadastrado com sucesso!', 'success');
            this.closeModal('modalAluno');
            await this.refreshAll();
        } catch (err) {
            this.showToast(err.message, 'error');
        }
    }

    confirmDeleteAluno(id, nome) {
        if (!this.getPermissao('deletarAluno')) {
            this.showToast('⛔ Seu perfil não permite excluir alunos.', 'error');
            return;
        }

        document.getElementById('confirmDeleteMsg').textContent = `Deseja realmente excluir o aluno "${nome}"?`;
        document.getElementById('confirmDeleteWarn').style.display = 'block';

        this.pendingDelete = async () => {
            try {
                const res = await this.authFetch(`${this.apiBase}/alunos/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.erro || data.mensagem || 'Falha ao excluir');

                this.showToast('Aluno removido com sucesso!', 'success');
                await this.refreshAll();
            } catch (err) {
                this.showToast(err.message, 'error');
            }
        };
        this.openModal('modalConfirmDelete');
    }

    async viewAlunoHistorico(alunoId) {
        try {
            const res = await this.authFetch(`${this.apiBase}/turmas/aluno/${alunoId}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.erro || data.mensagem || 'Erro ao consultar histórico');

            document.getElementById('histAlunoNome').textContent = data.aluno.nome;
            document.getElementById('histAlunoEmail').textContent = `${data.aluno.email} • ${data.total_matriculas} matrícula(s)`;

            const list = document.getElementById('histCursosList');
            const canCancel = this.getPermissao('cancelarMatricula');

            if (data.matriculas.length === 0) {
                list.innerHTML = `<p class="muted text-center" style="padding:15px;">Nenhuma matrícula ativa.</p>`;
            } else {
                list.innerHTML = data.matriculas.map(m => `
                    <div class="compact-list-item">
                        <div>
                            <strong>${this.escapeHtml(m.curso_nome)}</strong>
                            <div class="muted text-xs">Inscrito em: ${this.formatDate(m.data_matricula)}</div>
                        </div>
                        ${canCancel ? `<button class="btn btn-xs btn-danger" onclick="app.confirmCancelarMatricula(${m.matricula_id}, '${this.escapeHtml(data.aluno.nome)}', '${this.escapeHtml(m.curso_nome)}')">Cancelar</button>` : ''}
                    </div>
                `).join('');
            }
            this.openModal('modalHistorico');
        } catch (err) {
            this.showToast(err.message, 'error');
        }
    }

    openCursoModal(curso = null) {
        document.getElementById('formCurso').reset();
        document.getElementById('cursoId').value = curso ? curso.id : '';
        document.getElementById('modalCursoTitle').textContent = curso ? 'Editar Curso' : 'Criar Curso';

        if (curso) {
            document.getElementById('cursoNome').value = curso.nome;
            document.getElementById('cursoDescricao').value = curso.descricao || '';
            document.getElementById('cursoVagas').value = curso.vagas;
        }
        this.openModal('modalCurso');
    }

    async openEditCurso(id) {
        if (!this.getPermissao('editarCurso')) {
            this.showToast('⛔ Seu perfil não permite editar cursos.', 'error');
            return;
        }
        try {
            const res = await this.authFetch(`${this.apiBase}/cursos/${id}`);
            const curso = await res.json();
            this.openCursoModal(curso);
        } catch (err) {
            this.showToast('Erro ao carregar dados do curso', 'error');
        }
    }

    async saveCurso() {
        const id = document.getElementById('cursoId').value;
        const nome = document.getElementById('cursoNome').value.trim();
        const descricao = document.getElementById('cursoDescricao').value.trim();
        const vagas = parseInt(document.getElementById('cursoVagas').value, 10);

        const isEdit = !!id;
        const url = isEdit ? `${this.apiBase}/cursos/${id}` : `${this.apiBase}/cursos`;
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const res = await this.authFetch(url, {
                method,
                body: JSON.stringify({ nome, descricao, vagas })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.erro || data.mensagem || 'Falha ao salvar curso');

            this.showToast(isEdit ? 'Curso atualizado com sucesso!' : 'Curso criado com sucesso!', 'success');
            this.closeModal('modalCurso');
            await this.refreshAll();
        } catch (err) {
            this.showToast(err.message, 'error');
        }
    }

    confirmDeleteCurso(id, nome) {
        if (!this.getPermissao('deletarCurso')) {
            this.showToast('⛔ Seu perfil não permite excluir cursos.', 'error');
            return;
        }

        document.getElementById('confirmDeleteMsg').textContent = `Deseja realmente excluir o curso "${nome}"?`;
        document.getElementById('confirmDeleteWarn').style.display = 'block';

        this.pendingDelete = async () => {
            try {
                const res = await this.authFetch(`${this.apiBase}/cursos/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.erro || data.mensagem || 'Falha ao excluir curso');

                this.showToast('Curso removido com sucesso!', 'success');
                await this.refreshAll();
            } catch (err) {
                this.showToast(err.message, 'error');
            }
        };
        this.openModal('modalConfirmDelete');
    }

    confirmCancelarMatricula(id, aluno, curso) {
        if (!this.getPermissao('cancelarMatricula')) {
            this.showToast('⛔ Seu perfil não permite cancelar matrículas.', 'error');
            return;
        }

        document.getElementById('confirmDeleteMsg').textContent = `Cancelar matrícula de "${aluno}" em "${curso}"?`;
        document.getElementById('confirmDeleteWarn').style.display = 'none';

        this.pendingDelete = async () => {
            try {
                const res = await this.authFetch(`${this.apiBase}/turmas/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.erro || data.mensagem || 'Falha ao cancelar');

                this.showToast('Matrícula cancelada com sucesso!', 'success');
                this.closeModal('modalHistorico');
                await this.refreshAll();
            } catch (err) {
                this.showToast(err.message, 'error');
            }
        };
        this.openModal('modalConfirmDelete');
    }

    // ============================================================
    // VISTAS DETALHADAS FULL (COM PERMISSÕES)
    // ============================================================

    renderFullAlunos() {
        const tbody = document.getElementById('fullAlunosTableBody');
        if (!tbody) return;

        const canEdit = this.getPermissao('editarAluno');
        const canDelete = this.getPermissao('deletarAluno');

        tbody.innerHTML = this.alunos.items.map(a => `
            <tr>
                <td><span class="badge-tag-sm">#${a.id}</span></td>
                <td><strong>${this.escapeHtml(a.nome)}</strong></td>
                <td><span style="font-family:var(--font-mono); font-size:11.5px;">${this.escapeHtml(a.email)}</span></td>
                <td>${a.nascimento ? this.formatDate(a.nascimento) : '-'}</td>
                <td class="text-right">
                    <button class="btn btn-xs btn-secondary" onclick="app.viewAlunoHistorico(${a.id})">Cursos</button>
                    ${canEdit ? `<button class="btn btn-xs btn-secondary" onclick="app.openEditAluno(${a.id})">Editar</button>` : ''}
                    ${canDelete ? `<button class="btn btn-xs btn-danger" onclick="app.confirmDeleteAluno(${a.id}, '${this.escapeHtml(a.nome)}')">Excluir</button>` : ''}
                </td>
            </tr>
        `).join('');
    }

    renderFullCursos() {
        const grid = document.getElementById('fullCursosGrid');
        if (!grid) return;

        const canEdit = this.getPermissao('editarCurso');
        const canDelete = this.getPermissao('deletarCurso');

        grid.innerHTML = this.cursos.items.map(c => `
            <div class="curso-compact-item" style="padding:14px;">
                <div class="curso-item-header">
                    <strong style="font-size:13.5px;">${this.escapeHtml(c.nome)}</strong>
                    <span class="curso-item-badge ${c.vagas > 0 ? 'badge-vagas-abertas' : 'badge-vagas-esgotadas'}">${c.vagas} vagas</span>
                </div>
                <p class="muted" style="margin:8px 0; font-size:11.5px;">${this.escapeHtml(c.descricao || 'Sem descrição')}</p>
                <div class="btn-group-row" style="margin-top:10px;">
                    ${canEdit ? `<button class="btn btn-xs btn-secondary" onclick="app.openEditCurso(${c.id})">Editar</button>` : ''}
                    ${canDelete ? `<button class="btn btn-xs btn-danger" onclick="app.confirmDeleteCurso(${c.id}, '${this.escapeHtml(c.nome)}')">Excluir</button>` : ''}
                </div>
            </div>
        `).join('');
    }

    renderFullTurmas() {
        const tbody = document.getElementById('fullTurmasTableBody');
        if (!tbody) return;

        const canCancel = this.getPermissao('cancelarMatricula');

        tbody.innerHTML = this.turmas.items.map(t => `
            <tr>
                <td><span class="badge-tag-sm">#${t.matricula_id}</span></td>
                <td><strong>${this.escapeHtml(t.aluno_nome)}</strong></td>
                <td>${this.escapeHtml(t.aluno_email)}</td>
                <td><span class="badge-tag-sm">${this.escapeHtml(t.curso_nome)}</span></td>
                <td>${this.formatDate(t.data_matricula)}</td>
                <td class="text-right">
                    ${canCancel ? `<button class="btn btn-xs btn-danger" onclick="app.confirmCancelarMatricula(${t.matricula_id}, '${this.escapeHtml(t.aluno_nome)}', '${this.escapeHtml(t.curso_nome)}')">Cancelar</button>` : '<span class="muted text-xs">Consulta</span>'}
                </td>
            </tr>
        `).join('');
    }

    // ============================================================
    // FILTROS
    // ============================================================

    filterCockpitAlunos(q) {
        const term = q.toLowerCase().trim();
        const filtered = this.alunos.items.filter(a => a.nome.toLowerCase().includes(term) || a.email.toLowerCase().includes(term));
        this.renderCockpitAlunos(filtered);
    }

    filterCockpitCursos(q) {
        const term = q.toLowerCase().trim();
        const filtered = this.cursos.items.filter(c => c.nome.toLowerCase().includes(term) || (c.descricao && c.descricao.toLowerCase().includes(term)));
        this.renderCockpitCursos(filtered);
    }

    filterCockpitTurmas(q) {
        const term = q.toLowerCase().trim();
        const filtered = this.turmas.items.filter(t => t.aluno_nome.toLowerCase().includes(term) || t.curso_nome.toLowerCase().includes(term));
        this.renderCockpitTurmas(filtered);
    }

    // ============================================================
    // UTILS
    // ============================================================

    openModal(id) {
        const m = document.getElementById(id);
        if (m) m.classList.add('show');
    }

    closeModal(id) {
        const m = document.getElementById(id);
        if (m) m.classList.remove('show');
    }

    showToast(msg, type = 'info') {
        const shelf = document.getElementById('toastShelf');
        if (!shelf) return;
        const t = document.createElement('div');
        t.className = `toast-item ${type}`;
        t.textContent = msg;
        shelf.appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0';
            setTimeout(() => t.remove(), 250);
        }, 3500);
    }

    getInitials(name) {
        if (!name) return 'A';
        const parts = name.trim().split(' ');
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        } catch {
            return dateStr;
        }
    }

    escapeHtml(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }
}

const app = new CockpitApp();
