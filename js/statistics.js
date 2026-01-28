const Statistics = {
    analyze(input) {
        const stats = XmlParser.analyze(input);
        return this.formatStats(stats);
    },

    formatStats(stats) {
        return {
            overview: {
                totalElements: stats.totalElements,
                uniqueElements: Object.keys(stats.elements).length,
                totalClasses: Object.values(stats.classes).reduce((a, b) => a + b, 0),
                uniqueClasses: Object.keys(stats.classes).length,
                totalAttributes: Object.values(stats.attributes).reduce((a, b) => a + b, 0),
                uniqueAttributes: Object.keys(stats.attributes).length,
                maxDepth: stats.maxDepth,
                textNodes: stats.textNodes
            },
            elements: this.sortByCount(stats.elements),
            classes: this.sortByCount(stats.classes),
            attributes: this.sortByCount(stats.attributes),
            topClasses: this.getTop(stats.classes, 10),
            topElements: this.getTop(stats.elements, 10)
        };
    },

    sortByCount(obj) {
        return Object.entries(obj)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }));
    },

    getTop(obj, n) {
        return this.sortByCount(obj).slice(0, n);
    },

    render(stats) {
        return `
            <div class="stats-section">
                <h4>Общ преглед</h4>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="value">${stats.overview.totalElements}</div>
                        <div class="label">Елементи</div>
                    </div>
                    <div class="stat-card">
                        <div class="value">${stats.overview.uniqueElements}</div>
                        <div class="label">Уникални тагове</div>
                    </div>
                    <div class="stat-card">
                        <div class="value">${stats.overview.uniqueClasses}</div>
                        <div class="label">CSS класове</div>
                    </div>
                    <div class="stat-card">
                        <div class="value">${stats.overview.uniqueAttributes}</div>
                        <div class="label">Атрибути</div>
                    </div>
                    <div class="stat-card">
                        <div class="value">${stats.overview.maxDepth}</div>
                        <div class="label">Макс. дълбочина</div>
                    </div>
                    <div class="stat-card">
                        <div class="value">${stats.overview.textNodes}</div>
                        <div class="label">Текстови възли</div>
                    </div>
                </div>
            </div>

            <div class="stats-section">
                <h4>Топ 10 елементи</h4>
                <ul class="stats-list">
                    ${stats.topElements.map(el => `
                        <li>
                            <span class="name">&lt;${el.name}&gt;</span>
                            <span class="count">${el.count}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>

            <div class="stats-section">
                <h4>Топ 10 CSS класове</h4>
                ${stats.topClasses.length > 0 ? `
                    <ul class="stats-list">
                        ${stats.topClasses.map(cls => `
                            <li>
                                <span class="name">.${cls.name}</span>
                                <span class="count">${cls.count}</span>
                            </li>
                        `).join('')}
                    </ul>
                ` : '<p class="empty-state">Няма намерени CSS класове</p>'}
            </div>

            <div class="stats-section">
                <h4>Всички атрибути</h4>
                ${stats.attributes.length > 0 ? `
                    <ul class="stats-list">
                        ${stats.attributes.map(attr => `
                            <li>
                                <span class="name">${attr.name}</span>
                                <span class="count">${attr.count}</span>
                            </li>
                        `).join('')}
                    </ul>
                ` : '<p class="empty-state">Няма намерени атрибути</p>'}
            </div>
        `;
    }
};
