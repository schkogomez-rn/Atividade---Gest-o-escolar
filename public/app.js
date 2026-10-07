/**
 * ============================================================
 * AcademiaPro - Gestão Escolar Frontend Controller
 * ============================================================
 */

class SchoolApp {
    constructor() {
        // Detecta a URL base da API
        this.apiBase = this.resolveApiBase();

        // Estado da aplicação
        this.currentTab = 'dashboard';
        this.alunosState = { page: 1, limit: 10, total: 0, items: [] };
        this.cursosState = { page: 1, limit: 12, total: 0, items: [] };
        this.turmasState = { page: 1, limit: 10, total: 0, items: [] };

        // Todos os itens para os dropdowns de seleção
        this.allAlunosList = [];
        this.allCursosList = [];

        // Referência para ação de exclusão pendente
        this.pendingDeleteAction = null;

        this.init();
    }

    resolveApiBase() {
        const origin = window.location.origin;
        // Se estiver rodando via file:// ou Live Server em outra porta, direciona para o backend Node
        if (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '3000')) {
            return 'http://localhost:3000';
        }
        return '';
    }

    async init() {
        this.bindEvents();
        await this.checkApiStatus();
        await this.refreshAllData();

        // Intervalo de verificação de status a cada 30 segundos
        setInterval(() => this.checkApiStatus(), 30000);
    }

    // ============================================================
    // BINDING DE EVENTOS & NAVEGAÇÃO
    // ============================================================
    bindEvents() {
        // Navegação das Abas
        document.querySelectorAll('.nav-item').forEach(button => {
            button.addEventListener('click', (e) => {
                const tab = button.dataset.tab;
                this.navigateTab(tab);
            });
        });

        // Mobile menu toggle
        const mobileBtn = document.getElementById('mobileMenuBtn');
        const sidebar = document.querySelector('.sidebar');
        if (mobileBtn && sidebar) {
            mobileBtn.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }

        // Botão Atualizar Geral
        document.getElementById('btnRefreshAll').addEventListener('click', () => {
            this.showToast('Atualizando dados...', 'info');
            this.refreshAllData();
        });

        // Botão Nova Matrícula Rápida
        document.getElementById('btnQuickEnroll').addEventListener('click', () => {
            this.navigateTab('turmas');
            const select = document.getElementById('selectAlunoMatricula');
            if (select) select.focus();
        });

        // --- ABA ALUNOS ---
        document.getElementById('btnNovoAluno').addEventListener('click', () => {
            this.openAlunoModal();
        });

        document.getElementById('formAluno').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSaveAluno();
        });

        document.getElementById('searchAlunos').addEventListener('input', (e) => {
            this.filterAlunosTable(e.target.value);
        });

        document.getElementById('btnAlunoPrev').addEventListener('click', () => {
            if (this.alunosState.page > 1) {
                this.alunosState.page--;
                this.loadAlunos();
            }
        });

        document.getElementById('btnAlunoNext').addEventListener('click', () => {
            const maxPage = Math.ceil(this.alunosState.total / this.alunosState.limit);
            if (this.alunosState.page < maxPage) {
                this.alunosState.page++;
                this.loadAlunos();
            }
        });

        // --- ABA CURSOS ---
        document.getElementById('btnNovoCurso').addEventListener('click', () => {
            this.openCursoModal();
        });

        document.getElementById('formCurso').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSaveCurso();
        });

        document.getElementById('searchCursos').addEventListener('input', (e) => {
            this.filterCursosCards(e.target.value);
        });

        document.getElementById('btnCursoPrev').addEventListener('click', () => {
            if (this.cursosState.page > 1) {
                this.cursosState.page--;
                this.loadCursos();
            }
        });

        document.getElementById('btnCursoNext').addEventListener('click', () => {
            const maxPage = Math.ceil(this.cursosState.total / this.cursosState.limit);
            if (this.cursosState.page < maxPage) {
                this.cursosState.page++;
                this.loadCursos();
            }
        });

        // --- ABA MATRÍCULAS / TURMAS ---
        document.getElementById('formMatricular').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleMatricular();
        });

        document.getElementById('selectCursoMatricula').addEventListener('change', (e) => {
            this.updateCursoVagasPreview(e.target.value);
        });

        document.getElementById('searchMatriculas').addEventListener('input', (e) => {
            this.filterTurmasTable(e.target.value);
        });

        document.getElementById('btnTurmaPrev').addEventListener('click', () => {
            if (this.turmasState.page > 1) {
                this.turmasState.page--;
                this.loadTurmas();
            }
        });

        document.getElementById('btnTurmaNext').addEventListener('click', () => {
            const maxPage = Math.ceil(this.turmasState.total / this.turmasState.limit);
            if (this.turmasState.page < maxPage) {
                this.turmasState.page++;
                this.loadTurmas();
            }
        });

        // Confirmação de exclusão
        document.getElementById('btnConfirmDeleteAction').addEventListener('click', () => {
            if (this.pendingDeleteAction) {
                this.pendingDeleteAction();
                this.pendingDeleteAction = null;
                this.closeModal('modalConfirmDelete');
            }
        });

        // Fechar modais ao teclar ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-backdrop.show').forEach(m => {
                    m.classList.remove('show');
                });
            }
        });
    }

    navigateTab(tabName) {
        this.currentTab = tabName;

        // Atualiza botões do menu
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Atualiza panes
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `tab-${tabName}`);
        });

        // Atualiza títulos do topo
        const titles = {
            dashboard: { title: 'Visão Geral', sub: 'Acompanhe métricas, vagas de cursos e matrículas em tempo real' },
            alunos: { title: 'Gestão de Alunos', sub: 'Cadastro, edição, histórico de matrículas e consulta de alunos' },
            cursos: { title: 'Grade de Cursos', sub: 'Gerenciamento de cursos e controle de vagas disponíveis' },
            turmas: { title: 'Matrículas & Turmas', sub: 'Efetivação de matrículas com validação de vagas (Regra de Ouro)' }
        };

        const t = titles[tabName] || titles.dashboard;
        document.getElementById('page-title').textContent = t.title;
        document.getElementById('page-subtitle').textContent = t.sub;

        // Fecha sidebar no mobile após navegar
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    }

    // ============================================================
    // API CALLS & STATUS
    // ============================================================
    async checkApiStatus() {
        const badge = document.getElementById('api-status-badge');
        const text = document.getElementById('api-status-text');
        const indicator = badge.querySelector('.status-indicator');

        try {
            const res = await fetch(`${this.apiBase}/`, {
                headers: { 'Accept': 'application/json' }
            });

            if (res.ok) {
                indicator.className = 'status-indicator online ping-live';
                text.textContent = 'API Conectada';
            } else {
                throw new Error('Status ' + res.status);
            }
        } catch (err) {
            indicator.className = 'status-indicator offline';
            text.textContent = 'Desconectado';
        }
    }

    async refreshAllData() {
        await Promise.all([
            this.loadAlunos(),
            this.loadCursos(),
            this.loadTurmas(),
            this.loadDropdownOptions()
        ]);
        this.updateDashboardMetrics();
    }

    // ============================================================
    // ALUNOS
    // ============================================================
    async loadAlunos() {
        const tbody = document.getElementById('alunosTableBody');
        try {
            const res = await fetch(`${this.apiBase}/alunos?page=${this.alunosState.page}&limit=${this.alunosState.limit}`);
            if (!res.ok) throw new Error('Erro ao buscar alunos');
            const data = await res.json();

            this.alunosState.items = data.dados || [];
            this.alunosState.total = data.paginacao?.total || 0;

            document.getElementById('nav-alunos-count').textContent = this.alunosState.total;
            document.getElementById('kpi-total-alunos').textContent = this.alunosState.total;

            this.renderAlunosTable(this.alunosState.items);
            this.renderAlunosPagination(data.paginacao);
        } catch (err) {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color:var(--rose)">Falha ao carregar alunos da API. Verifique a conexão com o banco.</td></tr>`;
        }
    }

    renderAlunosTable(alunos) {
        const tbody = document.getElementById('alunosTableBody');
        if (!alunos || alunos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center muted">Nenhum aluno encontrado.</td></tr>`;
            return;
        }

        tbody.innerHTML = alunos.map(aluno => {
            const dataFormatada = aluno.nascimento ? this.formatDate(aluno.nascimento) : '<span class="muted">Não informada</span>';
            return `
                <tr>
                    <td><span class="badge-tag">#${aluno.id}</span></td>
                    <td><strong>${this.escapeHtml(aluno.nome)}</strong></td>
                    <td><span style="font-family:var(--font-mono); font-size:0.83rem;">${this.escapeHtml(aluno.email)}</span></td>
                    <td>${dataFormatada}</td>
                    <td class="text-right">
                        <button class="btn-icon" title="Ver Cursos Inscritos" onclick="app.viewAlunoCursos(${aluno.id})">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                            </svg>
                        </button>
                        <button class="btn-icon" title="Editar Aluno" onclick="app.openEditAlunoModal(${aluno.id})">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="btn-icon danger" title="Excluir Aluno" onclick="app.confirmDeleteAluno(${aluno.id}, '${this.escapeHtml(aluno.nome)}')">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderAlunosPagination(p) {
        if (!p) return;
        const info = document.getElementById('alunosPaginationInfo');
        const indicator = document.getElementById('alunoPageIndicator');
        const btnPrev = document.getElementById('btnAlunoPrev');
        const btnNext = document.getElementById('btnAlunoNext');

        info.textContent = `Mostrando ${this.alunosState.items.length} de ${p.total} alunos cadastrados`;
        indicator.textContent = `Página ${p.pagina_atual} de ${p.total_paginas || 1}`;

        btnPrev.disabled = p.pagina_atual <= 1;
        btnNext.disabled = p.pagina_atual >= p.total_paginas;
    }

    filterAlunosTable(query) {
        const q = query.toLowerCase().trim();
        if (!q) {
            this.renderAlunosTable(this.alunosState.items);
            return;
        }

        const filtered = this.alunosState.items.filter(a => 
            a.nome.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)
        );
        this.renderAlunosTable(filtered);
    }

    openAlunoModal(aluno = null) {
        const modal = document.getElementById('modalAluno');
        const title = document.getElementById('modalAlunoTitle');
        const form = document.getElementById('formAluno');

        form.reset();
        document.getElementById('alunoId').value = aluno ? aluno.id : '';

        if (aluno) {
            title.textContent = 'Editar Aluno';
            document.getElementById('alunoNome').value = aluno.nome;
            document.getElementById('alunoEmail').value = aluno.email;
            if (aluno.nascimento) {
                // Formata para YYYY-MM-DD
                const d = new Date(aluno.nascimento);
                document.getElementById('alunoNascimento').value = d.toISOString().split('T')[0];
            }
        } else {
            title.textContent = 'Cadastrar Novo Aluno';
        }

        this.openModal('modalAluno');
    }

    async openEditAlunoModal(id) {
        try {
            const res = await fetch(`${this.apiBase}/alunos/${id}`);
            if (!res.ok) throw new Error('Não foi possível obter dados do aluno');
            const aluno = await res.json();
            this.openAlunoModal(aluno);
        } catch (err) {
            this.showToast(err.message, 'error');
        }
    }

    async handleSaveAluno() {
        const id = document.getElementById('alunoId').value;
        const nome = document.getElementById('alunoNome').value.trim();
        const email = document.getElementById('alunoEmail').value.trim();
        const nascimento = document.getElementById('alunoNascimento').value || null;

        const payload = { nome, email, nascimento };
        const isEdit = !!id;
        const url = isEdit ? `${this.apiBase}/alunos/${id}` : `${this.apiBase}/alunos`;
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.erro || 'Falha ao salvar aluno');
            }

            this.showToast(isEdit ? 'Aluno atualizado com sucesso!' : 'Aluno cadastrado com sucesso!', 'success');
            this.closeModal('modalAluno');
            await this.loadAlunos();
            await this.loadDropdownOptions();
            this.updateDashboardMetrics();
        } catch (err) {
            this.showToast(err.message, 'error');
        }
    }

    confirmDeleteAluno(id, nome) {
        document.getElementById('confirmDeleteMessage').textContent = `Deseja realmente remover o aluno "${nome}"?`;
        document.getElementById('confirmDeleteWarning').style.display = 'block';
        document.getElementById('confirmDeleteWarning').textContent = '⚠️ As matrículas deste aluno também serão excluídas em cascata.';

        this.pendingDeleteAction = async () => {
            try {
                const res = await fetch(`${this.apiBase}/alunos/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.erro || 'Erro ao remover aluno');

                this.showToast(data.mensagem || 'Aluno removido com sucesso!', 'success');
                await this.refreshAllData();
            } catch (err) {
                this.showToast(err.message, 'error');
            }
        };

        this.openModal('modalConfirmDelete');
    }

    async viewAlunoCursos(alunoId) {
        try {
            const res = await fetch(`${this.apiBase}/turmas/aluno/${alunoId}`);
            const data = await res.json();

            if (!res.ok) throw new Error(data.erro || 'Erro ao buscar matrículas do aluno');

            document.getElementById('historicoAlunoNome').textContent = data.aluno.nome;
            document.getElementById('historicoAlunoEmail').textContent = `${data.aluno.email} • ${data.total_matriculas} curso(s) matriculado(s)`;

            const list = document.getElementById('historicoAlunoList');
            if (data.matriculas.length === 0) {
                list.innerHTML = `<p class="muted text-center" style="padding:20px 0;">Este aluno ainda não possui matrículas ativas em nenhum curso.</p>`;
            } else {
                list.innerHTML = data.matriculas.map(m => `
                    <div class="historico-card">
                        <div>
                            <strong>${this.escapeHtml(m.curso_nome)}</strong>
                            <p class="muted" style="font-size:0.8rem; margin-top:2px;">Matriculado em: ${this.formatDate(m.data_matricula)}</p>
                        </div>
                        <div class="tag tag-emerald">Inscrito</div>
                    </div>
                `).join('');
            }

            this.openModal('modalHistoricoAluno');
        } catch (err) {
            this.showToast(err.message, 'error');
        }
    }

    // ============================================================
    // CURSOS
    // ============================================================
    async loadCursos() {
        const container = document.getElementById('cursosCardsContainer');
        try {
            const res = await fetch(`${this.apiBase}/cursos?page=${this.cursosState.page}&limit=${this.cursosState.limit}`);
            if (!res.ok) throw new Error('Erro ao carregar cursos');
            const data = await res.json();

            this.cursosState.items = data.dados || [];
            this.cursosState.total = data.paginacao?.total || 0;

            document.getElementById('nav-cursos-count').textContent = this.cursosState.total;
            document.getElementById('kpi-total-cursos').textContent = this.cursosState.total;

            this.renderCursosCards(this.cursosState.items);
            this.renderCursosPagination(data.paginacao);
        } catch (err) {
            console.error(err);
            container.innerHTML = `<p style="color:var(--rose)">Falha ao carregar cursos da API.</p>`;
        }
    }

    renderCursosCards(cursos) {
        const container = document.getElementById('cursosCardsContainer');
        if (!cursos || cursos.length === 0) {
            container.innerHTML = `<p class="muted">Nenhum curso cadastrado.</p>`;
            return;
        }

        container.innerHTML = cursos.map(curso => {
            let vagasBadge = '';
            if (curso.vagas <= 0) {
                vagasBadge = `<span class="tag tag-rose">Esgotado (0 vagas)</span>`;
            } else if (curso.vagas <= 3) {
                vagasBadge = `<span class="tag tag-amber">Últimas ${curso.vagas} vaga(s)</span>`;
            } else {
                vagasBadge = `<span class="tag tag-emerald">${curso.vagas} vagas abertas</span>`;
            }

            return `
                <div class="course-card">
                    <div class="course-card-top">
                        <div class="course-header">
                            <span class="badge-tag">#${curso.id}</span>
                            ${vagasBadge}
                        </div>
                        <h4>${this.escapeHtml(curso.nome)}</h4>
                        <p>${this.escapeHtml(curso.descricao || 'Sem descrição cadastrada.')}</p>
                    </div>
                    <div class="course-card-bottom">
                        <small class="muted">Capacidade atual</small>
                        <div class="course-actions">
                            <button class="btn-icon" title="Editar Curso" onclick="app.openEditCursoModal(${curso.id})">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                            <button class="btn-icon danger" title="Excluir Curso" onclick="app.confirmDeleteCurso(${curso.id}, '${this.escapeHtml(curso.nome)}')">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderCursosPagination(p) {
        if (!p) return;
        const info = document.getElementById('cursosPaginationInfo');
        const indicator = document.getElementById('cursoPageIndicator');
        const btnPrev = document.getElementById('btnCursoPrev');
        const btnNext = document.getElementById('btnCursoNext');

        info.textContent = `Mostrando ${this.cursosState.items.length} de ${p.total} cursos cadastrados`;
        indicator.textContent = `Página ${p.pagina_atual} de ${p.total_paginas || 1}`;

        btnPrev.disabled = p.pagina_atual <= 1;
        btnNext.disabled = p.pagina_atual >= p.total_paginas;
    }

    filterCursosCards(query) {
        const q = query.toLowerCase().trim();
        if (!q) {
            this.renderCursosCards(this.cursosState.items);
            return;
        }

        const filtered = this.cursosState.items.filter(c => 
            c.nome.toLowerCase().includes(q) || (c.descricao && c.descricao.toLowerCase().includes(q))
        );
        this.renderCursosCards(filtered);
    }

    openCursoModal(curso = null) {
        const form = document.getElementById('formCurso');
        form.reset();
        document.getElementById('cursoId').value = curso ? curso.id : '';

        const title = document.getElementById('modalCursoTitle');
        if (curso) {
            title.textContent = 'Editar Curso';
            document.getElementById('cursoNome').value = curso.nome;
            document.getElementById('cursoDescricao').value = curso.descricao || '';
            document.getElementById('cursoVagas').value = curso.vagas;
        } else {
            title.textContent = 'Criar Novo Curso';
        }

        this.openModal('modalCurso');
    }

    async openEditCursoModal(id) {
        try {
            const res = await fetch(`${this.apiBase}/cursos/${id}`);
            if (!res.ok) throw new Error('Não foi possível obter dados do curso');
            const curso = await res.json();
            this.openCursoModal(curso);
        } catch (err) {
            this.showToast(err.message, 'error');
        }
    }

    async handleSaveCurso() {
        const id = document.getElementById('cursoId').value;
        const nome = document.getElementById('cursoNome').value.trim();
        const descricao = document.getElementById('cursoDescricao').value.trim();
        const vagas = parseInt(document.getElementById('cursoVagas').value, 10);

        const payload = { nome, descricao, vagas };
        const isEdit = !!id;
        const url = isEdit ? `${this.apiBase}/cursos/${id}` : `${this.apiBase}/cursos`;
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.erro || 'Falha ao salvar curso');

            this.showToast(isEdit ? 'Curso atualizado com sucesso!' : 'Curso criado com sucesso!', 'success');
            this.closeModal('modalCurso');
            await this.loadCursos();
            await this.loadDropdownOptions();
            this.updateDashboardMetrics();
        } catch (err) {
            this.showToast(err.message, 'error');
        }
    }

    confirmDeleteCurso(id, nome) {
        document.getElementById('confirmDeleteMessage').textContent = `Deseja realmente remover o curso "${nome}"?`;
        document.getElementById('confirmDeleteWarning').style.display = 'block';
        document.getElementById('confirmDeleteWarning').textContent = '⚠️ Ao remover o curso, todas as matrículas associadas a ele serão canceladas automaticamente.';

        this.pendingDeleteAction = async () => {
            try {
                const res = await fetch(`${this.apiBase}/cursos/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.erro || 'Erro ao remover curso');

                this.showToast(data.mensagem || 'Curso removido com sucesso!', 'success');
                await this.refreshAllData();
            } catch (err) {
                this.showToast(err.message, 'error');
            }
        };

        this.openModal('modalConfirmDelete');
    }

    // ============================================================
    // MATRÍCULAS / TURMAS (REGRA DE OURO)
    // ============================================================
    async loadTurmas() {
        const tbody = document.getElementById('turmasTableBody');
        try {
            const res = await fetch(`${this.apiBase}/turmas?page=${this.turmasState.page}&limit=${this.turmasState.limit}`);
            if (!res.ok) throw new Error('Erro ao carregar matrículas');
            const data = await res.json();

            this.turmasState.items = data.dados || [];
            this.turmasState.total = data.paginacao?.total || 0;

            document.getElementById('nav-turmas-count').textContent = this.turmasState.total;
            document.getElementById('kpi-total-matriculas').textContent = this.turmasState.total;

            this.renderTurmasTable(this.turmasState.items);
            this.renderTurmasPagination(data.paginacao);
            this.renderDashboardRecentMatriculas(this.turmasState.items.slice(0, 5));
        } catch (err) {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color:var(--rose)">Falha ao carregar matrículas.</td></tr>`;
        }
    }

    renderTurmasTable(turmas) {
        const tbody = document.getElementById('turmasTableBody');
        if (!turmas || turmas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center muted">Nenhuma matrícula registrada.</td></tr>`;
            return;
        }

        tbody.innerHTML = turmas.map(t => `
            <tr>
                <td><span class="badge-tag">#${t.matricula_id}</span></td>
                <td>
                    <strong>${this.escapeHtml(t.aluno_nome)}</strong>
                    <div class="muted" style="font-size:0.75rem;">${this.escapeHtml(t.aluno_email)}</div>
                </td>
                <td>
                    <span class="tag tag-indigo">${this.escapeHtml(t.curso_nome)}</span>
                </td>
                <td>${this.formatDate(t.data_matricula)}</td>
                <td class="text-right">
                    <button class="btn btn-sm btn-danger" onclick="app.confirmCancelarMatricula(${t.matricula_id}, '${this.escapeHtml(t.aluno_nome)}', '${this.escapeHtml(t.curso_nome)}')">
                        Cancelar
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderTurmasPagination(p) {
        if (!p) return;
        const info = document.getElementById('turmasPaginationInfo');
        const indicator = document.getElementById('turmaPageIndicator');
        const btnPrev = document.getElementById('btnTurmaPrev');
        const btnNext = document.getElementById('btnTurmaNext');

        info.textContent = `Mostrando ${this.turmasState.items.length} de ${p.total} matrículas`;
        indicator.textContent = `Página ${p.pagina_atual} de ${p.total_paginas || 1}`;

        btnPrev.disabled = p.pagina_atual <= 1;
        btnNext.disabled = p.pagina_atual >= p.total_paginas;
    }

    filterTurmasTable(query) {
        const q = query.toLowerCase().trim();
        if (!q) {
            this.renderTurmasTable(this.turmasState.items);
            return;
        }

        const filtered = this.turmasState.items.filter(t => 
            t.aluno_nome.toLowerCase().includes(q) ||
            t.curso_nome.toLowerCase().includes(q) ||
            t.aluno_email.toLowerCase().includes(q)
        );
        this.renderTurmasTable(filtered);
    }

    async loadDropdownOptions() {
        try {
            // Busca lista ampla de alunos e cursos para preencher os selects
            const [resAlunos, resCursos] = await Promise.all([
                fetch(`${this.apiBase}/alunos?limit=100`),
                fetch(`${this.apiBase}/cursos?limit=100`)
            ]);

            const dataAlunos = await resAlunos.json();
            const dataCursos = await resCursos.json();

            this.allAlunosList = dataAlunos.dados || [];
            this.allCursosList = dataCursos.dados || [];

            // Popula select de alunos
            const selectAluno = document.getElementById('selectAlunoMatricula');
            selectAluno.innerHTML = `<option value="">-- Selecione o Aluno --</option>` + 
                this.allAlunosList.map(a => `<option value="${a.id}">${this.escapeHtml(a.nome)} (${this.escapeHtml(a.email)})</option>`).join('');

            // Popula select de cursos
            const selectCurso = document.getElementById('selectCursoMatricula');
            selectCurso.innerHTML = `<option value="">-- Selecione o Curso --</option>` + 
                this.allCursosList.map(c => {
                    const tagVagas = c.vagas > 0 ? `[${c.vagas} vaga(s)]` : `[ESGOTADO]`;
                    return `<option value="${c.id}" data-vagas="${c.vagas}">${this.escapeHtml(c.nome)} ${tagVagas}</option>`;
                }).join('');

            this.updateCursoVagasPreview('');
        } catch (err) {
            console.error('Erro ao popular selects:', err);
        }
    }

    updateCursoVagasPreview(cursoId) {
        const preview = document.getElementById('vagasPreview');
        if (!cursoId) {
            preview.className = 'vagas-preview-info';
            preview.textContent = 'Selecione um curso para verificar o número de vagas disponíveis.';
            return;
        }

        const curso = this.allCursosList.find(c => c.id == cursoId);
        if (!curso) return;

        if (curso.vagas <= 0) {
            preview.className = 'vagas-preview-info alert-warning';
            preview.style.background = 'rgba(239, 68, 68, 0.15)';
            preview.style.borderColor = 'rgba(239, 68, 68, 0.4)';
            preview.style.color = '#fca5a5';
            preview.textContent = `❌ Este curso está com as vagas ESGOTADAS (0 vagas). O sistema rejeitará a matrícula.`;
        } else {
            preview.className = 'vagas-preview-info';
            preview.style.background = 'rgba(16, 185, 129, 0.15)';
            preview.style.borderColor = 'rgba(16, 185, 129, 0.4)';
            preview.style.color = '#6ee7b7';
            preview.textContent = `✅ Vagas disponíveis: ${curso.vagas}. Pronto para matricular!`;
        }
    }

    async handleMatricular() {
        const aluno_id = parseInt(document.getElementById('selectAlunoMatricula').value, 10);
        const curso_id = parseInt(document.getElementById('selectCursoMatricula').value, 10);

        if (!aluno_id || !curso_id) {
            this.showToast('Por favor, selecione um aluno e um curso.', 'error');
            return;
        }

        const btnSubmit = document.getElementById('btnSubmitMatricula');
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `Processando transação...`;

        try {
            const res = await fetch(`${this.apiBase}/turmas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aluno_id, curso_id })
            });

            const data = await res.json();

            if (!res.ok) {
                // Erro 409 conflito (sem vagas ou matrícula duplicada) ou outros erros
                throw new Error(data.erro || 'Falha ao efetuar matrícula');
            }

            this.showToast('✅ ' + (data.mensagem || 'Matrícula efetuada com sucesso!'), 'success');
            document.getElementById('formMatricular').reset();
            this.updateCursoVagasPreview('');

            await this.refreshAllData();
        } catch (err) {
            this.showToast(err.message, 'error');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Confirmar Matrícula</span>
            `;
        }
    }

    confirmCancelarMatricula(id, alunoNome, cursoNome) {
        document.getElementById('confirmDeleteMessage').textContent = `Deseja cancelar a matrícula de "${alunoNome}" no curso "${cursoNome}"?`;
        document.getElementById('confirmDeleteWarning').style.display = 'none';

        this.pendingDeleteAction = async () => {
            try {
                const res = await fetch(`${this.apiBase}/turmas/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.erro || 'Erro ao cancelar matrícula');

                this.showToast(data.mensagem || 'Matrícula cancelada com sucesso!', 'success');
                await this.refreshAllData();
            } catch (err) {
                this.showToast(err.message, 'error');
            }
        };

        this.openModal('modalConfirmDelete');
    }

    // ============================================================
    // DASHBOARD WIDGETS
    // ============================================================
    updateDashboardMetrics() {
        // Calcula total de vagas em aberto e cursos esgotados
        let totalVagasAbertas = 0;
        let cursosEsgotados = 0;

        this.allCursosList.forEach(c => {
            totalVagasAbertas += parseInt(c.vagas, 10) || 0;
            if (c.vagas <= 0) cursosEsgotados++;
        });

        document.getElementById('kpi-vagas-abertas').textContent = totalVagasAbertas;
        document.getElementById('kpi-cursos-esgotados').textContent = `${cursosEsgotados} curso(s) esgotado(s)`;

        // Renderiza lista de status por curso no dashboard
        const dashCursos = document.getElementById('dash-courses-vagas');
        if (this.allCursosList.length === 0) {
            dashCursos.innerHTML = `<p class="muted text-center">Nenhum curso disponível.</p>`;
        } else {
            dashCursos.innerHTML = this.allCursosList.slice(0, 5).map(c => {
                let badge = c.vagas > 0 
                    ? `<span class="tag tag-emerald">${c.vagas} vaga(s)</span>`
                    : `<span class="tag tag-rose">Esgotado</span>`;
                return `
                    <div class="vagas-item">
                        <div class="vagas-item-info">
                            <strong>${this.escapeHtml(c.nome)}</strong>
                            <span>Capacidade: ${c.vagas} vagas</span>
                        </div>
                        ${badge}
                    </div>
                `;
            }).join('');
        }
    }

    renderDashboardRecentMatriculas(recentes) {
        const tbody = document.getElementById('dash-recent-matriculas');
        if (!recentes || recentes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center muted">Nenhuma matrícula recente.</td></tr>`;
            return;
        }

        tbody.innerHTML = recentes.map(m => `
            <tr>
                <td><strong>${this.escapeHtml(m.aluno_nome)}</strong></td>
                <td><span class="tag tag-indigo">${this.escapeHtml(m.curso_nome)}</span></td>
                <td>${this.formatDate(m.data_matricula)}</td>
                <td><span class="tag tag-emerald">Ativa</span></td>
            </tr>
        `).join('');
    }

    // ============================================================
    // MODAL UTILS
    // ============================================================
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('show');
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('show');
    }

    // ============================================================
    // TOAST SYSTEM
    // ============================================================
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️'
        };

        toast.innerHTML = `
            <span>${icons[type] || '🔔'}</span>
            <div style="flex:1;">${this.escapeHtml(message)}</div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // ============================================================
    // FORMATTERS & HELPERS
    // ============================================================
    formatDate(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        } catch {
            return dateString;
        }
    }

    escapeHtml(str) {
        if (typeof str !== 'string') return str;
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

// Inicializa a aplicação
const app = new SchoolApp();
