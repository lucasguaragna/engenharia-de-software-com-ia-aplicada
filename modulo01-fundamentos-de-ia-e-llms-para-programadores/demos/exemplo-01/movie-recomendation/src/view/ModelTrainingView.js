import { View } from './View.js';

export class ModelView extends View {
    #trainModelBtn = document.querySelector('#trainModelBtn');
    #watchedHistoryArrow = document.querySelector('#watchedHistoryArrow');
    #watchedHistoryDiv = document.querySelector('#watchedHistoryDiv');
    #allUsersWatchedHistoryList = document.querySelector('#allUsersWatchedHistoryList');
    #runRecommendationBtn = document.querySelector('#runRecommendationBtn');
    #onTrainModel;
    #onRunRecommendation;

    constructor() {
        super();
        this.attachEventListeners();
    }

    registerTrainModelCallback(callback) {
        this.#onTrainModel = callback;
    }
    registerRunRecommendationCallback(callback) {
        this.#onRunRecommendation = callback;
    }

    attachEventListeners() {
        this.#trainModelBtn.addEventListener('click', () => {
            this.#onTrainModel();
        });
        this.#runRecommendationBtn.addEventListener('click', () => {
            this.#onRunRecommendation();
        });

        this.#watchedHistoryDiv.addEventListener('click', () => {
            const historyList = this.#allUsersWatchedHistoryList;

            const isHidden = window.getComputedStyle(historyList).display === 'none';

            if (isHidden) {
                historyList.style.display = 'block';
                this.#watchedHistoryArrow.classList.remove('bi-chevron-down');
                this.#watchedHistoryArrow.classList.add('bi-chevron-up');
            } else {
                historyList.style.display = 'none';
                this.#watchedHistoryArrow.classList.remove('bi-chevron-up');
                this.#watchedHistoryArrow.classList.add('bi-chevron-down');
            }
        });

    }
    enableRecommendButton() {
        this.#runRecommendationBtn.disabled = false;
    }
    updateTrainingProgress(progress) {
        this.#trainModelBtn.disabled = true;
        this.#trainModelBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Training...';

        if (progress.progress === 100) {
            this.#trainModelBtn.disabled = false;
            this.#trainModelBtn.innerHTML = '<i class="bi bi-cpu"></i> Train Model';
        }
    }

    renderAllUsersWatchedHistory(users) {
        const html = users.map(user => {
            const historyHtml = user.watchedMovies.map(watchedMovie => {
                return `<span class="badge bg-light text-dark me-1 mb-1">${watchedMovie.name}</span>`;
            }).join('');

            return `
                <div class="user-watched-history-summary">
                    <h6>${user.name} (Age: ${user.age})</h6>
                    <div class="watched-history-badges">
                        ${historyHtml || '<span class="text-muted">No watched movies</span>'}
                    </div>
                </div>
            `;
        }).join('');

        this.#allUsersWatchedHistoryList.innerHTML = html;
    }
}
