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
            return this.replaceTemplate(this.#movieTemplate, {
                ...movie,
                movie: JSON.stringify(movie)
            });
        }).join('');

        this.#watchedMoviesList.innerHTML = html;
        this.attachWatchedMovieClickHandlers();
    }

    addWatchedMovie(movie) {

        if (this.#watchedMoviesList.innerHTML.includes('No watched movies found')) {
            this.#watchedMoviesList.innerHTML = '';
        }

        const movieHtml = this.replaceTemplate(this.#movieTemplate, {
            ...movie,
            movie: JSON.stringify(movie)
        });

        this.#watchedMoviesList.insertAdjacentHTML('afterbegin', movieHtml);

        const newMovie = this.#watchedMoviesList.firstElementChild.querySelector('.watched-movie');
        newMovie.classList.add('watched-movie-highlight');

        setTimeout(() => {
            newMovie.classList.remove('watched-movie-highlight');
        }, 1000);

        this.attachWatchedMovieClickHandlers();
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
