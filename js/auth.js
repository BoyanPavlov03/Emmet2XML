const Auth = {
    user: null,

    async init() {
        await this.checkAuth();
        this.bindEvents();
        this.updateUI();
    },

    bindEvents() {

        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const authType = e.target.dataset.auth;
                this.switchAuthTab(authType);
            });
        });

        document.getElementById('login-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.login(new FormData(e.target));
        });

        document.getElementById('register-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.register(new FormData(e.target));
        });

        document.querySelector('.modal-close')?.addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('auth-modal')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal();
            }
        });
    },

    switchAuthTab(type) {
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.auth === type);
        });

        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.toggle('active', form.id === `${type}-form`);
        });

        document.getElementById('login-error').textContent = '';
        document.getElementById('register-error').textContent = '';
    },

    openModal() {
        document.getElementById('auth-modal').classList.add('active');
    },

    closeModal() {
        document.getElementById('auth-modal').classList.remove('active');
    },

    async checkAuth() {
        try {
            const response = await fetch('php/auth.php?action=check');
            const data = await response.json();

            if (data.loggedIn && data.user) {
                this.user = data.user;
            } else {
                this.user = null;
            }
        } catch (error) {
            console.error('Auth check error:', error);
            this.user = null;
        }
    },

    async login(formData) {
        const errorEl = document.getElementById('login-error');
        errorEl.textContent = '';

        try {
            const response = await fetch('php/auth.php?action=login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: formData.get('username'),
                    password: formData.get('password')
                })
            });

            const data = await response.json();

            if (data.success) {
                this.user = data.user;
                this.closeModal();
                this.updateUI();

                if (typeof History !== 'undefined') {
                    History.load();
                }
            } else {
                errorEl.textContent = data.error || 'Грешка при вход';
            }
        } catch (error) {
            errorEl.textContent = 'Грешка при връзка със сървъра';
            console.error('Login error:', error);
        }
    },

    async register(formData) {
        const errorEl = document.getElementById('register-error');
        errorEl.textContent = '';

        try {
            const response = await fetch('php/auth.php?action=register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: formData.get('username'),
                    email: formData.get('email'),
                    password: formData.get('password'),
                    password_confirm: formData.get('password_confirm')
                })
            });

            const data = await response.json();

            if (data.success) {
                this.user = data.user;
                this.closeModal();
                this.updateUI();
            } else {
                errorEl.textContent = data.error || 'Грешка при регистрация';
            }
        } catch (error) {
            errorEl.textContent = 'Грешка при връзка със сървъра';
            console.error('Register error:', error);
        }
    },

    async logout() {
        try {
            await fetch('php/auth.php?action=logout');
            this.user = null;
            this.updateUI();

            const historyList = document.getElementById('history-list');
            if (historyList) {
                historyList.innerHTML = '<p class="empty-state">Влез в акаунта си за да видиш историята.</p>';
            }

            const rulesList = document.getElementById('rules-list');
            if (rulesList) {
                rulesList.innerHTML = '<p class="empty-state">Влез в акаунта си за да видиш правилата.</p>';
            }

            if (typeof App !== 'undefined') {
                App.selectedHistoryItem = null;
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    },

    updateUI() {
        const authSection = document.getElementById('auth-section');

        if (this.user) {
            authSection.innerHTML = `
                <div class="user-info">
                    <span class="user-name">${this.escapeHtml(this.user.username)}</span>
                    <button class="btn-small" id="btn-logout">Изход</button>
                </div>
            `;

            document.getElementById('btn-logout')?.addEventListener('click', () => {
                this.logout();
            });
        } else {
            authSection.innerHTML = `
                <button class="btn-primary" id="btn-login">Вход</button>
            `;

            document.getElementById('btn-login')?.addEventListener('click', () => {
                this.openModal();
            });
        }
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    isLoggedIn() {
        return this.user !== null;
    }
};
