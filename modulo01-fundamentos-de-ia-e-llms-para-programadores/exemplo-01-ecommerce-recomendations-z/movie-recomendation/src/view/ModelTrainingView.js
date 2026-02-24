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
        let finalHtml = '';
        users.forEach(user => {
            let historyHtml = '';
            if (user.watchedMovies && user.watchedMovies.length > 0) {
                user.watchedMovies.forEach(movie => {
                    const genresStr = Array.isArray(movie.genres) ? movie.genres.join(', ') : (movie.genres || 'N/A');
                    const rating = movie.vote_average || 'N/A';
                    const runtime = movie.runtime ? `${movie.runtime} min` : 'N/A';
                    const budget = movie.budget ? `$${movie.budget.toLocaleString()}` : 'N/A';
                    const pop = movie.popularity ? movie.popularity.toFixed(1) : 'N/A';
                    const lang = movie.original_language ? movie.original_language.toUpperCase() : 'N/A';

                    const tooltipContent = `⭐ ${rating} | ⏱ ${runtime} | 💰 ${budget} | 📈 ${pop} | 🌍 ${lang} | 🎭 ${genresStr}`.replace(/"/g, '&quot;');

                    historyHtml += `<span class="badge bg-secondary text-light me-1 mb-1" style="background-color: rgba(255,255,255,0.1) !important; border: 1px solid rgba(255,255,255,0.2);" data-bs-toggle="tooltip" data-bs-html="true" data-bs-placement="top" title="${tooltipContent}">${movie.name}</span>`;
                });
            }

            finalHtml += `
                <div class="user-watched-history-summary">
                    <h6>${user.name} (Age: ${user.age})</h6>
                    <div class="watched-history-badges">
                        ${historyHtml || '<span class="text-secondary">No watched movies</span>'}
                    </div>
                </div>
            `;
        });

        this.#allUsersWatchedHistoryList.innerHTML = finalHtml;

        // Initialize tooltips safely
        try {
            if (typeof bootstrap !== 'undefined') {
                const tooltipTriggerList = [].slice.call(this.#allUsersWatchedHistoryList.querySelectorAll('[data-bs-toggle="tooltip"]'));
                tooltipTriggerList.map(function (tooltipTriggerEl) {
                    return new bootstrap.Tooltip(tooltipTriggerEl);
                });
            }
        } catch (e) {
            console.warn("Could not initialize tooltips:", e);
        }
    }
}
