/**
 * ============================================================
 * AcademiaPro - Cockpit Controller (Ultra Compact & Informativo)
 * ============================================================
 */

class CockpitApp {
    constructor() {
        this.apiBase = this.resolveApiBase();
        this.currentView = 'cockpit';

        // Estados
        this.alunos = { page: 1, limit: 12, total: 0, items: [] };
        this.cursos = { page: 1, limit: 12, total: 0, items: [] };
        this.turmas = { page: 1, limit: 10, total: 0, items: [] };

        this.allAlunos = [];
        this.allCursos = [];
        this.pendingDelete = null;

        this.init();
    }

    resolveApiBase() {
        if (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '3000')) {
            return 'http://localhost:3000';
        }
        return '';
    }

    async init() {
        this.bindEvents();
        await this.checkApiStatus();
        await this.refreshAll();

        setInterval(() => this.checkApiStatus(), 30000);
    }

    bindEvents() {
        // Alternador de Visualização
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchView(btn.dataset.view);
            });
        });

        // Botão Atualizar
        document.getElementById('btnRefresh').addEventListener('click', () => {
            this.showToast('Atualizando dados...', 'info');
            this.refreshAll();
        });

        // Filtros Cockpit
        document.getElementById('cockpitSearchAlunos').addEventListener('input', (e) => {
            this.filterCockpitAlunos(e.target.value);
        });

        document.getElementById('cockpitSearchCursos').addEventListener('input', (e) => {
            this.filterCockpitCursos(e.target.value);
        });

        document.getElementById('cockpitSearchTurmas').addEventListener('input', (e) => {
            this.filterCockpitTurmas(e.target.value);
        });

        // Paginação Cockpit Alunos
        document.getElementById('cockpitAlunoPrev').addEventListener('click', () => {
            if (this.alunos.page > 1) { this.alunos.page--; this.loadAlunos(); }
        });
        document.getElementById('cockpitAlunoNext').addEventListener('click', () => {
            const max = Math.ceil(this.alunos.total / this.alunos.limit);
            if (this.alunos.page < max) { this.alunos.page++; this.loadAlunos(); }
        });

        // Paginação Cockpit Cursos
        document.getElementById('cockpitCursoPrev').addEventListener('click', () => {
            if (this.cursos.page > 1) { this.cursos.page--; this.loadCursos(); }
        });
        document.getElementById('cockpitCursoNext').addEventListener('click', () => {
            const max = Math.ceil(this.cursos.total / this.cursos.limit);
            if (this.cursos.page < max) { this.cursos.page++; this.loadCursos(); }
        });

        // Paginação Cockpit Turmas
        document.getElementById('cockpitTurmaPrev').addEventListener('click', () => {
            if (this.turmas.page > 1) { this.turmas.page--; this.loadTurmas(); }
        });
        document.getElementById('cockpitTurmaNext').addEventListener('click', () => {
            const max = Math.ceil(this.turmas.total / this.turmas.limit);
            if (this.turmas.page < max) { this.turmas.page++; this.loadTurmas(); }
        });

        // Formulário de Matrícula Cockpit (Regra de Ouro)
        document.getElementById('cockpitQuickEnrollForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleQuickEnroll();
        });

        document.getElementById('quickSelectCurso').addEventListener('change', (e) => {
            this.updateVacancyIndicator(e.target.value);
        });

        // Formulários Modais
        document.getElementById('formAluno').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveAluno();
        });

        document.getElementById('formCurso').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCurso();
        });

        // Confirmação de Exclusão
        document.getElementById('btnConfirmDelete').addEventListener('click', () => {
            if (this.pendingDelete) {
                this.pendingDelete();
                this.pendingDelete = null;
                this.closeModal('modalConfirmDelete');
            }
        });

        // Esc para fechar modais
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-backdrop.show').forEach(m => m.classList.remove('show'));
            }
        });

        // Formulários de Contas
        document.getElementById('formRegistrar').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegistrar();
        });

        document.getElementById('formLogin').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
    }

    switchView(viewName) {
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
        const activePanel = document.getElementById(views[viewName] || 'viewCockpit');
        if (activePanel) activePanel.classList.add('active');

        // Renderiza views dedicadas se necessário
        if (viewName === 'alunos') this.renderFullAlunos();
        if (viewName === 'cursos') this.renderFullCursos();
        if (viewName === 'turmas') this.renderFullTurmas();
    }

    async checkApiStatus() {
        const badge = document.getElementById('apiStatusBadge');
        const text = document.getElementById('apiStatusText');
        try {
            const res = await fetch(`${this.apiBase}/`, { headers: { 'Accept': 'application/json' } });
            if (res.ok) {
                badge.className = 'api-status-badge';
                text.textContent = 'Online';
            } else {
                throw new Error();
            }
        } catch {
            badge.className = 'api-status-badge offline';
            text.textContent = 'Offline';
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
    // CARREGAMENTO DE DADOS
    // ============================================================
    async loadAlunos() {
        try {
            const res = await fetch(`${this.apiBase}/alunos?page=${this.alunos.page}&limit=${this.alunos.limit}`);
            const data = await res.json();
            this.alunos.items = data.dados || [];
            this.alunos.total = data.paginacao?.total || 0;

            document.getElementById('metricAlunos').textContent = this.alunos.total;
            document.getElementById('cockpitAlunosCount').textContent = this.alunos.total;

            this.renderCockpitAlunos(this.alunos.items);
            this.renderPaginationInfo('cockpitAlunosPagInfo', 'cockpitAlunoPageNum', 'cockpitAlunoPrev', 'cockpitAlunoNext', data.paginacao);
            if (this.currentView === 'alunos') this.renderFullAlunos();
        } catch (err) {
            console.error('Erro alunos:', err);
        }
    }

    async loadCursos() {
        try {
            const res = await fetch(`${this.apiBase}/cursos?page=${this.cursos.page}&limit=${this.cursos.limit}`);
            const data = await res.json();
            this.cursos.items = data.dados || [];
            this.cursos.total = data.paginacao?.total || 0;

            document.getElementById('metricCursos').textContent = this.cursos.total;
            document.getElementById('cockpitCursosCount').textContent = this.cursos.total;

            this.renderCockpitCursos(this.cursos.items);
            this.renderPaginationInfo('cockpitCursosPagInfo', 'cockpitCursoPageNum', 'cockpitCursoPrev', 'cockpitCursoNext', data.paginacao);
            if (this.currentView === 'cursos') this.renderFullCursos();
        } catch (err) {
            console.error('Erro cursos:', err);
        }
    }

    async loadTurmas() {
        try {
            const res = await fetch(`${this.apiBase}/turmas?page=${this.turmas.page}&limit=${this.turmas.limit}`);
            const data = await res.json();
            this.turmas.items = data.dados || [];
            this.turmas.total = data.paginacao?.total || 0;

            document.getElementById('metricMatriculas').textContent = this.turmas.total;
            document.getElementById('cockpitTurmasCount').textContent = this.turmas.total;

            this.renderCockpitTurmas(this.turmas.items);
            this.renderPaginationInfo('cockpitTurmasPagInfo', 'cockpitTurmaPageNum', 'cockpitTurmaPrev', 'cockpitTurmaNext', data.paginacao);
            if (this.currentView === 'turmas') this.renderFullTurmas();
        } catch (err) {
            console.error('Erro turmas:', err);
        }
    }

    async loadSelectOptions() {
        try {
            const [rA, rC] = await Promise.all([
                fetch(`${this.apiBase}/alunos?limit=100`),
                fetch(`${this.apiBase}/cursos?limit=100`)
            ]);
            const dA = await rA.json();
            const dC = await rC.json();

            this.allAlunos = dA.dados || [];
            this.allCursos = dC.dados || [];

            // Preenche select do quick enroll
            const sA = document.getElementById('quickSelectAluno');
            sA.innerHTML = '<option value="">-- Selecione o Aluno --</option>' +
                this.allAlunos.map(a => `<option value="${a.id}">${this.escapeHtml(a.nome)} (#${a.id})</option>`).join('');

            const sC = document.getElementById('quickSelectCurso');
            sC.innerHTML = '<option value="">-- Selecione o Curso --</option>' +
                this.allCursos.map(c => {
                    const tag = c.vagas > 0 ? `[${c.vagas} vaga(s)]` : `[ESGOTADO]`;
                    return `<option value="${c.id}" data-vagas="${c.vagas}">${this.escapeHtml(c.nome)} ${tag}</option>`;
                }).join('');

            this.updateVacancyIndicator('');
        } catch (err) {
            console.error(err);
        }
    }

    updateRibbonMetrics() {
        let vagasLivres = 0;
        this.allCursos.forEach(c => { vagasLivres += (parseInt(c.vagas, 10) || 0); });
        document.getElementById('metricVagas').textContent = vagasLivres;
    }

    // ============================================================
    // RENDERIZADORES DO COCKPIT
    // ============================================================
    renderCockpitAlunos(alunos) {
        const tbody = document.getElementById('cockpitAlunosBody');
        if (!alunos || alunos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center muted">Nenhum aluno cadastrado.</td></tr>`;
            return;
        }

        tbody.innerHTML = alunos.map(a => {
            const initials = this.getInitials(a.nome);
            const dtNasc = a.nascimento ? this.formatDate(a.nascimento) : '<span class="muted">-</span>';
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
                        <div class="btn-group-row">
                            <button class="btn-icon-xs" title="Matricular neste aluno" onclick="app.presetEnrollAluno(${a.id})">
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5">
                                    <path d="M12 5v14M5 12h14"/>
                                </svg>
                            </button>
                            <button class="btn-icon-xs" title="Ver Cursos Inscritos" onclick="app.viewAlunoHistorico(${a.id})">
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                                </svg>
                            </button>
                            <button class="btn-icon-xs" title="Editar" onclick="app.openEditAluno(${a.id})">
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                            <button class="btn-icon-xs danger" title="Excluir" onclick="app.confirmDeleteAluno(${a.id}, '${this.escapeHtml(a.nome)}')">
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderCockpitCursos(cursos) {
        const container = document.getElementById('cockpitCursosContainer');
        if (!cursos || cursos.length === 0) {
            container.innerHTML = `<p class="muted text-center" style="padding:20px;">Nenhum curso cadastrado.</p>`;
            return;
        }

        container.innerHTML = cursos.map(c => {
            const vagas = parseInt(c.vagas, 10) || 0;
            // Estimativa visual de capacidade base padrão 30 ou base de vagas
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
                        <div class="btn-group-row">
                            <button class="btn-icon-xs" title="Editar Curso" onclick="app.openEditCurso(${c.id})">
                                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                            <button class="btn-icon-xs danger" title="Excluir Curso" onclick="app.confirmDeleteCurso(${c.id}, '${this.escapeHtml(c.nome)}')">
                                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2">
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

    renderCockpitTurmas(turmas) {
        const tbody = document.getElementById('cockpitTurmasBody');
        if (!turmas || turmas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center muted">Nenhuma matrícula registrada.</td></tr>`;
            return;
        }

        tbody.innerHTML = turmas.map(t => `
            <tr>
                <td><strong>${this.escapeHtml(t.aluno_nome)}</strong></td>
                <td><span class="badge-tag-sm">${this.escapeHtml(t.curso_nome)}</span></td>
                <td class="text-xs">${this.formatDate(t.data_matricula)}</td>
                <td class="text-right">
                    <button class="btn btn-xs btn-danger" onclick="app.confirmCancelarMatricula(${t.matricula_id}, '${this.escapeHtml(t.aluno_nome)}', '${this.escapeHtml(t.curso_nome)}')">
                        Cancelar
                    </button>
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

        info.textContent = `${pag.total} registros`;
        num.textContent = `${pag.pagina_atual}/${pag.total_paginas || 1}`;

        btnP.disabled = pag.pagina_atual <= 1;
        btnN.disabled = pag.pagina_atual >= pag.total_paginas;
    }

    // ============================================================
    // REGRA DE OURO: VALIDAÇÃO EM TEMPO REAL & MATRÍCULA
    // ============================================================
    updateVacancyIndicator(cursoId) {
        const box = document.getElementById('quickVacancyIndicator');
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
            box.innerHTML = `<strong>✅ Vagas disponíveis: ${curso.vagas}.</strong> Transação ACID pronta para efetivar vínculo.`;
        }
    }

    presetEnrollAluno(alunoId) {
        this.switchView('cockpit');
        const select = document.getElementById('quickSelectAluno');
        select.value = alunoId;
        document.getElementById('quickSelectCurso').focus();
        this.showToast('Aluno selecionado no formulário de matrícula!', 'info');
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
            const res = await fetch(`${this.apiBase}/turmas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aluno_id: alunoId, curso_id: cursoId })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.erro || 'Falha na matrícula');

            this.showToast('✅ ' + (data.mensagem || 'Matrícula realizada com sucesso!'), 'success');
            document.getElementById('cockpitQuickEnrollForm').reset();
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
        document.getElementById('quickSelectAluno').focus();
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
        try {
            const res = await fetch(`${this.apiBase}/alunos/${id}`);
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
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, nascimento })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.erro || 'Falha ao salvar aluno');

            this.showToast(isEdit ? 'Aluno atualizado com sucesso!' : 'Aluno cadastrado!', 'success');
            this.closeModal('modalAluno');
            await this.refreshAll();
        } catch (err) {
            this.showToast(err.message, 'error');
        }
    }

    confirmDeleteAluno(id, nome) {
        document.getElementById('confirmDeleteMsg').textContent = `Deseja realmente excluir o aluno "${nome}"?`;
        document.getElementById('confirmDeleteWarn').style.display = 'block';

        this.pendingDelete = async () => {
            try {
                const res = await fetch(`${this.apiBase}/alunos/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.erro || 'Falha ao excluir');

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
            const res = await fetch(`${this.apiBase}/turmas/aluno/${alunoId}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.erro || 'Erro ao consultar');

            document.getElementById('histAlunoNome').textContent = data.aluno.nome;
            document.getElementById('histAlunoEmail').textContent = `${data.aluno.email} • ${data.total_matriculas} matrícula(s)`;

            const list = document.getElementById('histCursosList');
            if (data.matriculas.length === 0) {
                list.innerHTML = `<p class="muted text-center" style="padding:15px;">Nenhuma matrícula ativa.</p>`;
            } else {
                list.innerHTML = data.matriculas.map(m => `
                    <div class="compact-list-item">
                        <div>
                            <strong>${this.escapeHtml(m.curso_nome)}</strong>
                            <div class="muted text-xs">Inscrito em: ${this.formatDate(m.data_matricula)}</div>
                        </div>
                        <button class="btn btn-xs btn-danger" onclick="app.confirmCancelarMatricula(${m.matricula_id}, '${this.escapeHtml(data.aluno.nome)}', '${this.escapeHtml(m.curso_nome)}')">Cancelar</button>
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
        try {
            const res = await fetch(`${this.apiBase}/cursos/${id}`);
            const curso = await res.json();
            this.openCursoModal(curso);
        } catch (err) {
            this.showToast('Erro ao carregar curso', 'error');
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
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, descricao, vagas })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.erro || 'Falha ao salvar');

            this.showToast(isEdit ? 'Curso atualizado!' : 'Curso criado!', 'success');
            this.closeModal('modalCurso');
            await this.refreshAll();
        } catch (err) {
            this.showToast(err.message, 'error');
        }
    }

    confirmDeleteCurso(id, nome) {
        document.getElementById('confirmDeleteMsg').textContent = `Deseja realmente excluir o curso "${nome}"?`;
        document.getElementById('confirmDeleteWarn').style.display = 'block';

        this.pendingDelete = async () => {
            try {
                const res = await fetch(`${this.apiBase}/cursos/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.erro || 'Falha ao excluir');

                this.showToast('Curso removido!', 'success');
                await this.refreshAll();
            } catch (err) {
                this.showToast(err.message, 'error');
            }
        };
        this.openModal('modalConfirmDelete');
    }

    confirmCancelarMatricula(id, aluno, curso) {
        document.getElementById('confirmDeleteMsg').textContent = `Cancelar matrícula de "${aluno}" em "${curso}"?`;
        document.getElementById('confirmDeleteWarn').style.display = 'none';

        this.pendingDelete = async () => {
            try {
                const res = await fetch(`${this.apiBase}/turmas/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.erro || 'Falha ao cancelar');

                this.showToast('Matrícula cancelada!', 'success');
                this.closeModal('modalHistorico');
                await this.refreshAll();
            } catch (err) {
                this.showToast(err.message, 'error');
            }
        };
        this.openModal('modalConfirmDelete');
    }

    // ============================================================
    // CONTAS: REGISTRAR E LOGIN (bcrypt)
    // ============================================================
    async handleRegistrar() {
        const nome  = document.getElementById('registrarNome').value.trim();
        const email = document.getElementById('registrarEmail').value.trim();
        const senha = document.getElementById('registrarSenha').value;

        const btn    = document.getElementById('btnRegistrar');
        const result = document.getElementById('registrarResult');

        btn.disabled = true;
        btn.textContent = 'Criando conta...';
        result.style.display = 'none';

        try {
            const res  = await fetch(`${this.apiBase}/contas/registrar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, senha })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.mensagem || 'Falha ao criar conta');

            result.className = 'conta-result success';
            result.textContent = `✅ Conta criada! ID: #${data.id} — ${data.nome} (${data.email})`;
            result.style.display = 'block';
            document.getElementById('formRegistrar').reset();
            this.showToast('Conta criada com sucesso!', 'success');
        } catch (err) {
            result.className = 'conta-result error';
            result.textContent = `❌ ${err.message}`;
            result.style.display = 'block';
            this.showToast(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Criar Conta';
        }
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value.trim();
        const senha = document.getElementById('loginSenha').value;

        const btn    = document.getElementById('btnLogin');
        const result = document.getElementById('loginResult');

        btn.disabled = true;
        btn.textContent = 'Verificando...';
        result.style.display = 'none';

        try {
            const res  = await fetch(`${this.apiBase}/contas/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.mensagem || 'Credenciais inválidas');

            result.className = 'conta-result success';
            result.textContent = `✅ ${data.mensagem}`;
            result.style.display = 'block';
            document.getElementById('formLogin').reset();
            this.showToast('Login realizado!', 'success');
        } catch (err) {
            result.className = 'conta-result error';
            result.textContent = `❌ ${err.message}`;
            result.style.display = 'block';
            this.showToast(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Entrar';
        }
    }

    // ============================================================
    // VISTAS FULL DETALHADAS (QUANDO ATIVADAS)
    // ============================================================
    renderFullAlunos() {
        const tbody = document.getElementById('fullAlunosTableBody');
        tbody.innerHTML = this.alunos.items.map(a => `
            <tr>
                <td><span class="badge-tag-sm">#${a.id}</span></td>
                <td><strong>${this.escapeHtml(a.nome)}</strong></td>
                <td><span style="font-family:var(--font-mono); font-size:11.5px;">${this.escapeHtml(a.email)}</span></td>
                <td>${a.nascimento ? this.formatDate(a.nascimento) : '-'}</td>
                <td class="text-right">
                    <button class="btn btn-xs btn-secondary" onclick="app.viewAlunoHistorico(${a.id})">Cursos</button>
                    <button class="btn btn-xs btn-secondary" onclick="app.openEditAluno(${a.id})">Editar</button>
                    <button class="btn btn-xs btn-danger" onclick="app.confirmDeleteAluno(${a.id}, '${this.escapeHtml(a.nome)}')">Excluir</button>
                </td>
            </tr>
        `).join('');
    }

    renderFullCursos() {
        const grid = document.getElementById('fullCursosGrid');
        grid.innerHTML = this.cursos.items.map(c => `
            <div class="curso-compact-item" style="padding:14px;">
                <div class="curso-item-header">
                    <strong style="font-size:13.5px;">${this.escapeHtml(c.nome)}</strong>
                    <span class="curso-item-badge ${c.vagas > 0 ? 'badge-vagas-abertas' : 'badge-vagas-esgotadas'}">${c.vagas} vagas</span>
                </div>
                <p class="muted" style="margin:8px 0; font-size:11.5px;">${this.escapeHtml(c.descricao || 'Sem descrição')}</p>
                <div class="btn-group-row" style="margin-top:10px;">
                    <button class="btn btn-xs btn-secondary" onclick="app.openEditCurso(${c.id})">Editar</button>
                    <button class="btn btn-xs btn-danger" onclick="app.confirmDeleteCurso(${c.id}, '${this.escapeHtml(c.nome)}')">Excluir</button>
                </div>
            </div>
        `).join('');
    }

    renderFullTurmas() {
        const tbody = document.getElementById('fullTurmasTableBody');
        tbody.innerHTML = this.turmas.items.map(t => `
            <tr>
                <td><span class="badge-tag-sm">#${t.matricula_id}</span></td>
                <td><strong>${this.escapeHtml(t.aluno_nome)}</strong></td>
                <td>${this.escapeHtml(t.aluno_email)}</td>
                <td><span class="badge-tag-sm">${this.escapeHtml(t.curso_nome)}</span></td>
                <td>${this.formatDate(t.data_matricula)}</td>
                <td class="text-right">
                    <button class="btn btn-xs btn-danger" onclick="app.confirmCancelarMatricula(${t.matricula_id}, '${this.escapeHtml(t.aluno_nome)}', '${this.escapeHtml(t.curso_nome)}')">Cancelar</button>
                </td>
            </tr>
        `).join('');
    }

    // ============================================================
    // FILTROS COCKPIT
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
        const t = document.createElement('div');
        t.className = `toast-item ${type}`;
        t.textContent = msg;
        shelf.appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0';
            setTimeout(() => t.remove(), 200);
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
