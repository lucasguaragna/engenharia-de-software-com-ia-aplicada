import { View } from './View.js';

export class UserView extends View {
    #userSelect = document.querySelector('#userSelect');
    #userAge = document.querySelector('#userAge');
    #watchedMoviesList = document.querySelector('#watchedMoviesList');

    #movieTemplate;
    #onUserSelect;
    #onWatchedMovieRemove;
    #watchedMovieElements = [];

    constructor() {
        super();
        this.init();
    }

    async init() {
        this.#movieTemplate = await this.loadTemplate('./src/view/templates/watched-movie.html');
        this.attachUserSelectListener();
    }

    registerUserSelectCallback(callback) {
        this.#onUserSelect = callback;
    }

    registerWatchedMovieRemoveCallback(callback) {
        this.#onWatchedMovieRemove = callback;
    }

    renderUserOptions(users) {
        const options = users.map(user => {
            return `<option value="${user.id}">${user.name}</option>`;
        }).join('');

        this.#userSelect.innerHTML += options;
    }

    renderUserDetails(user) {
        this.#userAge.value = user.age;
    }

    renderWatchedMovies(watchedMovies) {
        if (!this.#movieTemplate) return;

        if (!watchedMovies || watchedMovies.length === 0) {
            this.#watchedMoviesList.innerHTML = '<p>No watched movies found.</p>';
            return;
        }

        const html = watchedMovies.map(movie => {
            const genresStr = Array.isArray(movie.genres) ? movie.genres.join(', ') : (movie.genres || 'N/A');
            const rating = movie.vote_average || 'N/A';
            const runtime = movie.runtime ? `${movie.runtime} min` : 'N/A';
            const budget = movie.budget ? `$${movie.budget.toLocaleString()}` : 'N/A';
            const pop = movie.popularity ? movie.popularity.toFixed(1) : 'N/A';
            const lang = movie.original_language ? movie.original_language.toUpperCase() : 'N/A';
            
            const tooltipContent = `⭐ ${rating} | ⏱ ${runtime} | 💰 ${budget} | 📈 ${pop} | 🌍 ${lang} | 🎭 ${genresStr}`.replace(/"/g, '&quot;');

            return this.replaceTemplate(this.#movieTemplate, {
                genres: genresStr,
                vote_average: rating,
                runtime: runtime,
                budget: budget,
                popularity: pop,
                original_language: lang,
                overview: movie.overview || 'No overview available.',
                ...movie,
                tooltip_html: `data-bs-toggle="tooltip" data-bs-html="true" data-bs-placement="top" title="${tooltipContent}"`,
                movie: JSON.stringify(movie).replace(/'/g, '&apos;').replace(/"/g, '&quot;')
            });
        }).join('');

        this.#watchedMoviesList.innerHTML = html;
        this.attachWatchedMovieClickHandlers();

        // Initialize tooltips
        const tooltipTriggerList = [].slice.call(this.#watchedMoviesList.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    addWatchedMovie(movie) {

        if (this.#watchedMoviesList.innerHTML.includes('No watched movies found')) {
            this.#watchedMoviesList.innerHTML = '';
        }

        const genresStr = Array.isArray(movie.genres) ? movie.genres.join(', ') : (movie.genres || 'N/A');
        const rating = movie.vote_average || 'N/A';
        const runtime = movie.runtime ? `${movie.runtime} min` : 'N/A';
        const budget = movie.budget ? `$${movie.budget.toLocaleString()}` : 'N/A';
        const pop = movie.popularity ? movie.popularity.toFixed(1) : 'N/A';
        const lang = movie.original_language ? movie.original_language.toUpperCase() : 'N/A';
        
        const tooltipContent = `⭐ ${rating} | ⏱ ${runtime} | 💰 ${budget} | 📈 ${pop} | 🌍 ${lang} | 🎭 ${genresStr}`.replace(/"/g, '&quot;');

        const movieHtml = this.replaceTemplate(this.#movieTemplate, {
            genres: genresStr,
            vote_average: rating,
            runtime: runtime,
            budget: budget,
            popularity: pop,
            original_language: lang,
            overview: movie.overview || 'No overview available.',
            ...movie,
            tooltip_html: `data-bs-toggle="tooltip" data-bs-html="true" data-bs-placement="top" title="${tooltipContent}"`,
            movie: JSON.stringify(movie).replace(/'/g, '&apos;').replace(/"/g, '&quot;')
        });

        this.#watchedMoviesList.insertAdjacentHTML('afterbegin', movieHtml);

        const newMovie = this.#watchedMoviesList.firstElementChild.querySelector('.watched-movie');
        if(newMovie){
           newMovie.classList.add('watched-movie-highlight');
           setTimeout(() => {
               newMovie.classList.remove('watched-movie-highlight');
           }, 1000);
        }

        this.attachWatchedMovieClickHandlers();
        
        // Initialize tooltips for the new element
        const tooltipTriggerList = [].slice.call(this.#watchedMoviesList.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    attachUserSelectListener() {
        this.#userSelect.addEventListener('change', (event) => {
            const userId = event.target.value ? Number(event.target.value) : null;

            if (userId) {
                if (this.#onUserSelect) {
                    this.#onUserSelect(userId);
                }
            } else {
                this.#userAge.value = '';
                this.#watchedMoviesList.innerHTML = '';
            }
        });
    }

    attachWatchedMovieClickHandlers() {
        this.#watchedMovieElements = [];

        const movieElements = document.querySelectorAll('.watched-movie');

        movieElements.forEach(movieElement => {
            this.#watchedMovieElements.push(movieElement);

            movieElement.onclick = (event) => {

                const movie = JSON.parse(movieElement.dataset.movie);
                const userId = this.getSelectedUserId();
                const element = movieElement.closest('.col-md-6');

                this.#onWatchedMovieRemove({ element, userId, movie });

                element.style.transition = 'opacity 0.5s ease';
                element.style.opacity = '0';

                setTimeout(() => {
                    element.remove();

                    if (document.querySelectorAll('.watched-movie').length === 0) {
                        this.renderWatchedMovies([]);
                    }

                }, 500);

            }
        });
    }

    getSelectedUserId() {
        return this.#userSelect.value ? Number(this.#userSelect.value) : null;
    }
}
