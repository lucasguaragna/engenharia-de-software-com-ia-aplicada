export class UserController {
    #userService;
    #userView;
    #events;
    constructor({
        userView,
        userService,
        events,
    }) {
        this.#userView = userView;
        this.#userService = userService;
        this.#events = events;
    }

    static init(deps) {
        return new UserController(deps);
    }

    async renderUsers(nonTrainedUser) {
        const users = await this.#userService.getDefaultUsers();

        this.#userService.addUser(nonTrainedUser);
        const defaultAndNonTrained = [nonTrainedUser, ...users];

        this.#userView.renderUserOptions(defaultAndNonTrained);
        this.setupCallbacks();
        this.setupWatchedMovieObserver();

        this.#events.dispatchUsersUpdated({ users: defaultAndNonTrained });

    }

    setupCallbacks() {
        this.#userView.registerUserSelectCallback(this.handleUserSelect.bind(this));
        this.#userView.registerWatchedMovieRemoveCallback(this.handleWatchedMovieRemove.bind(this));
    }

    setupWatchedMovieObserver() {

        this.#events.onWatchedMovieAdded(
            async (...data) => {
                return this.handleWatchedMovieAdded(...data);
            }
        );

    }

    async handleUserSelect(userId) {
        const user = await this.#userService.getUserById(userId);
        this.#events.dispatchUserSelected(user);
        return this.displayUserDetails(user);
    }

    async handleWatchedMovieAdded({ user, movie }) {
        const updatedUser = await this.#userService.getUserById(user.id);
        updatedUser.watchedMovies.push({
            ...movie
        })

        await this.#userService.updateUser(updatedUser);

        const lastWatched = updatedUser.watchedMovies[updatedUser.watchedMovies.length - 1];
        this.#userView.addWatchedMovie(lastWatched);
        this.#events.dispatchUsersUpdated({ users: await this.#userService.getUsers() });
    }

    async handleWatchedMovieRemove({ userId, movie }) {
        const user = await this.#userService.getUserById(userId);
        const index = user.watchedMovies.findIndex(item => item.id === movie.id);

        if (index !== -1) {
            user.watchedMovies.splice(index, 1); // directly remove one item at the found index
            await this.#userService.updateUser(user);

            const updatedUsers = await this.#userService.getUsers();
            this.#events.dispatchUsersUpdated({ users: updatedUsers });
        }
    }


    async displayUserDetails(user) {
        this.#userView.renderUserDetails(user);
        this.#userView.renderWatchedMovies(user.watchedMovies);

    }

    getSelectedUserId() {
        return this.#userView.getSelectedUserId();
    }
}
