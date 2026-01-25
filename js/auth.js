/**
 * Модул за автентикация (frontend)
 */

const Auth = {
    user: null,
    
    /**
     * Инициализация
     */
    async init() {
        await this.checkAuth();
        this.bindEvents();
        this.updateUI();
    },
    
    /**
     * Свързване на събития
     */
    bindEvents() {
        // Auth tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const authType = e.target.dataset.auth;
                this.switchAuthTab(authType);
            });
        });
        
        // Login form
        document.getElementById('login-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.login(new FormData(e.target));
        });
        
        // Register form
        document.getElementById('register-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.register(new FormData(e.target));
        });
        
        // Modal close
        document.querySelector('.modal-close')?.addEventListener('click', () => {
            this.closeModal();
        });
        
        // Close on overlay click
        document.getElementById('auth-modal')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal();
            }
        });
    },
    
    /**
     * Превключване между login/register
     */
    switchAuthTab(type) {
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.auth === type);
        });
        
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.toggle('active', form.id === `${type}-form`);
        });
        
        // Изчистваме грешките
        document.getElementById('login-error').textContent = '';
        document.getElementById('register-error').textContent = '';
    },
    
    /**
     * Отваряне на модала
     */
    openModal() {
        document.getElementById('auth-modal').classList.add('active');
    },
    
    /**
     * Затваряне на модала
     */
    closeModal() {
        document.getElementById('auth-modal').classList.remove('active');
    },
    
    /**
     * Проверка на автентикация
     */
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
    
    /**
     * Вход
     */
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
                
                // Презареждаме историята ако е активен таба
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
    
    /**
     * Регистрация
     */
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
    
    /**
     * Изход
     */
    async logout() {
        try {
            await fetch('php/auth.php?action=logout');
            this.user = null;
            this.updateUI();
            
            // Изчистваме историята
            if (typeof History !== 'undefined') {
                History.clear();
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    },
    
    /**
     * Обновяване на UI според състоянието
     */
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
    
    /**
     * Escape XML special chars
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
    
    /**
     * Проверка дали е логнат
     */
    isLoggedIn() {
        return this.user !== null;
    }
};
