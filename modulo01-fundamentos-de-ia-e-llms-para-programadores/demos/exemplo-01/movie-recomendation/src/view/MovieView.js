import { View } from './View.js';

export class MovieView extends View {
    // DOM elements
    #movieList = document.querySelector('#movieList');

    #buttons;
    // Templates and callbacks
    #movieTemplate;
    #onWatchMovie;

    constructor() {
        super();
        this.init();
    }

    async init() {
        this.#movieTemplate = await this.loadTemplate('./src/view/templates/movie-card.html');
    }

    onUserSelected(user) {
        // Enable buttons if a user is selected, otherwise disable them
        this.setButtonsState(user.id ? false : true);
    }

    registerWatchMovieCallback(callback) {
        this.#onWatchMovie = callback;
    }

    render(movies, disableButtons = true) {
        if (!this.#movieTemplate) return;
        const html = movies.map(movie => {
            return this.replaceTemplate(this.#movieTemplate, {
                id: movie.id,
                name: movie.name,
                genres: (movie.genres || []).map(g => g.name || g).join(', '),
                vote_average: movie.vote_average,
                runtime: movie.runtime,
                overview: (movie.overview || '').substring(0, 100) + '...',
                movie: JSON.stringify(movie).replace(/'/g, '&apos;').replace(/"/g, '&quot;')
            });
        }).join('');

        this.#movieList.innerHTML = html;
        this.attachWatchButtonListeners();

        // Disable all buttons by default
        this.setButtonsState(disableButtons);
    }

    setButtonsState(disabled) {
        if (!this.#buttons) {
            this.#buttons = document.querySelectorAll('.watch-now-btn');
        }
        this.#buttons.forEach(button => {
            button.disabled = disabled;
        });
    }

    attachWatchButtonListeners() {
        this.#buttons = document.querySelectorAll('.watch-now-btn');
        this.#buttons.forEach(button => {

            button.addEventListener('click', (event) => {
                const movie = JSON.parse(button.dataset.movie);
                const originalText = button.innerHTML;

                button.innerHTML = '<i class="bi bi-check-circle-fill"></i> Watched';
                button.classList.remove('btn-primary');
                button.classList.add('btn-success');
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.classList.remove('btn-success');
                    button.classList.add('btn-primary');
                }, 500);
                this.#onWatchMovie(movie, button);

            });
        });
    }
}
