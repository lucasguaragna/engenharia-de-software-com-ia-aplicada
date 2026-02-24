import Papa from 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm';

// esta classe é responsável por buscar os filmes no arquivo movies.csv
// e retornar os filmes para a aplicação
export class MovieService {
    // método assíncrono para buscar os filmes no arquivo movies.csv
    async getMovies() {
        if (this.movies) return this.movies;

        const response = await fetch('/data/movies.csv');
        const csvText = await response.text();

        return new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                preview: 104, // Limitar a leitura aos primeiros 52 filmes apenas
                complete: (results) => {
                    this.movies = results.data.map(movie => {
                        let parsedGenres = [];
                        if (typeof movie.genres === 'string') {
                            try {
                                parsedGenres = JSON.parse(movie.genres.replace(/'/g, '"')).map(g => g.name || g);
                            } catch (e) {
                                parsedGenres = movie.genres.split(' ').filter(g => g.trim() !== '');
                            }
                        } else if (Array.isArray(movie.genres)) {
                            parsedGenres = movie.genres;
                        }

                        return {
                            id: movie.id,
                            name: movie.title, 
                            budget: movie.budget,
                            genres: parsedGenres,
                            original_language: movie.original_language,
                            popularity: movie.popularity,
                            runtime: movie.runtime,
                            vote_average: movie.vote_average,
                            overview: movie.overview,
                            director: movie.director
                        };
                    });
                    resolve(this.movies);
                },
                error: (error) => {
                    reject(error);
                }
            });
        });
    }

    // método assíncrono para buscar um filme específico através do seu ID    
    async getMovieById(id) {
        const movies = await this.getMovies();
        return movies.find(movie => movie.id === id || movie.id === String(id) || movie.id === Number(id));
    }

    // método assíncrono para buscar uma lista de filmes através dos seus IDs 
    async getMoviesByIds(ids) {
        const movies = await this.getMovies();
        const stringIds = ids.map(String);
        return movies.filter(movie => ids.includes(movie.id) || stringIds.includes(String(movie.id)));
    }
}
