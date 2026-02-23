import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
import { workerEvents } from '../events/constants.js';
import { MovieService } from '../service/MovieService.js';

let _globalCtx = {};
let _model = null;

const WEIGHTS = {
    budget: 0.1,
    popularity: 0.2,
    runtime: 0.1,
    vote_average: 0.2,
    genres: 0.3,
    original_language: 0.1,
};

const normalize = (value, min, max) => (value - min) / ((max - min) || 1);

function makeContext(movies, users) {
    movies.forEach(p => {
        if (typeof p.genres === 'string') {
            try {
                p.genres = JSON.parse(p.genres.replace(/'/g, '"')).map(g => g.name);
            } catch (e) {
                p.genres = [];
            }
        } else if (!p.genres) {
            p.genres = [];
        }
    });

    const budgets = movies.map(p => p.budget || 0);
    const minBudget = Math.min(...budgets);
    const maxBudget = Math.max(...budgets);

    const popularities = movies.map(p => p.popularity || 0);
    const minPopularity = Math.min(...popularities);
    const maxPopularity = Math.max(...popularities);

    const runtimes = movies.map(p => p.runtime || 0);
    const minRuntime = Math.min(...runtimes);
    const maxRuntime = Math.max(...runtimes);

    const votes = movies.map(p => p.vote_average || 0);
    const minVote = Math.min(...votes);
    const maxVote = Math.max(...votes);

    const allGenres = [...new Set(movies.flatMap(p => p.genres || []))];
    const original_languages = [...new Set(movies.map(p => p.original_language))];

    const genresIndex = Object.fromEntries(allGenres.map((g, index) => [g, index]));
    const languagesIndex = Object.fromEntries(original_languages.map((l, index) => [l, index]));

    const dimentions = 4 + allGenres.length + original_languages.length;

    return {
        movies,
        users,
        genresIndex,
        languagesIndex,
        minBudget, maxBudget,
        minPopularity, maxPopularity,
        minRuntime, maxRuntime,
        minVote, maxVote,
        numGenres: allGenres.length,
        numLanguages: original_languages.length,
        dimentions
    };
}

const oneHotWeighted = (index, lenght, weight) => {
    if (lenght < 2) {
        return tf.tensor1d([1]).cast('float32').mul(weight);
    }
    return tf.oneHot(index, lenght).cast('float32').mul(weight);
};

const multiHotWeighted = (indices, length, weight) => {
    const arr = new Array(length).fill(0);
    indices.forEach(idx => { if (idx !== undefined) arr[idx] = 1; });
    return tf.tensor1d(arr).cast('float32').mul(weight);
};

function encodeMovie(movie, context) {
    const budget = tf.tensor1d([normalize(movie.budget || 0, context.minBudget, context.maxBudget) * WEIGHTS.budget]);
    const popularity = tf.tensor1d([normalize(movie.popularity || 0, context.minPopularity, context.maxPopularity) * WEIGHTS.popularity]);
    const runtime = tf.tensor1d([normalize(movie.runtime || 0, context.minRuntime, context.maxRuntime) * WEIGHTS.runtime]);
    const vote = tf.tensor1d([normalize(movie.vote_average || 0, context.minVote, context.maxVote) * WEIGHTS.vote_average]);
    
    const genreIndices = (movie.genres || []).map(g => context.genresIndex[g]);
    const genre = multiHotWeighted(genreIndices, context.numGenres, WEIGHTS.genres);
    
    const language = oneHotWeighted(context.languagesIndex[movie.original_language] || 0, context.numLanguages, WEIGHTS.original_language);

    return tf.concat1d([budget, popularity, runtime, vote, genre, language]);
}

function encodeUser(user, context) {
    const userMovies = user.watchedMovies.map(p => 
        context.movies.find(prod => String(prod.id) === String(p.id)) || p
    ).filter(p => !Number.isNaN(Number(p.budget)));

    if(userMovies.length) {
        return tf.stack(
            userMovies.map(
                movie => encodeMovie(movie, context)
            )
        ).mean(0)
        .reshape([
            1,
            context.dimentions
        ]);
    }

    return tf.zeros([1, context.dimentions]);
}

function createTraningData(context) {
    const inputs = [];
    const labels = [];

    context.users
        .filter(user => user.watchedMovies.length)
        .forEach(user => {
            const userVector = encodeUser(user, context).dataSync();
            context.movies.forEach(movie => {
                const movieVector = encodeMovie(movie, context).dataSync();
                
                const label = user.watchedMovies.some(
                    watchedMovie => String(watchedMovie.id) === String(movie.id) ? 1 : 0
                );

                inputs.push([...userVector, ...movieVector]);
                labels.push(label);
            });
        });

    return {
        xs: tf.tensor2d(inputs),
        ys: tf.tensor2d(labels, [ labels.length, 1]),
        inputDimension: context.dimentions * 2
    };
}

// Configuração e treinamento da rede neural
async function configureNeuralNetAndTrain(trainingData) {
    const model = tf.sequential()
    // Camada de entrada
    model.add(tf.layers.dense({
        inputShape: [trainingData.inputDimension],
        units: 128,
        activation: 'relu'
    }))
    // Camada oculta 1
    model.add(tf.layers.dense({
        units: 64,
        activation: 'relu'
    }))
    // Camada oculta 2
    model.add(tf.layers.dense({
        units: 32,
        activation: 'relu'
    })) 
    // Camada de saída
    model.add(tf.layers.dense({
        units: 1, // 1 pois queremos somente uma saída
        activation: 'sigmoid' // sigmoid pois queremos uma saída entre 0 e 1
    }))

    // Compilação do modelo
    model.compile({
        optimizer: tf.train.adam(0.01), // adam é um otimizador 
        // que ajusta os pesos do modelo
        loss: 'binaryCrossentropy', // binaryCrossentropy é uma função de perda 
        // que mede a diferença entre a saída do modelo e a saída real
        metrics: ['accuracy'] // accuracy é uma métrica que mede a precisão do modelo
    })
    
    await model.fit(trainingData.xs, trainingData.ys, {
        epochs: 15, // Reduzido de 100 para 15 para melhor performance no browser
        batchSize: 64, // Aumentado para lidar mais rápido com 4800+ filmes
        shuffle: true,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                postMessage({ 
                    type: workerEvents.trainingLog, 
                    epoch: epoch,
                    loss: logs.loss,
                    accuracy: logs.acc
                });
            }
        }
    })
    return model
}

async function trainModel({ users }) {
    console.log('Training model with users:', users);
    postMessage({ type: workerEvents.progressUpdate, progress: { progress: 1 } });

    const movieService = new MovieService();
    const movies = await movieService.getMovies();

    // cria o contexto
    const context = makeContext(movies, users)
    
    // cria os vetores dos filmes
    context.movieVectors = movies.map(movie => {
     return {
        name: movie.name,
        meta: {...movie}, 
        vector: encodeMovie(movie, context).dataSync()
     }   
    })
    // salva o contexto global
    _globalCtx = context

    // cria os dados de treinamento
    const trainingData = createTraningData(context)

    // treina o modelo
    _model = await configureNeuralNetAndTrain(trainingData)
    
    // avisa que o treinamento foi concluído
    postMessage({ type: workerEvents.progressUpdate, progress: { progress: 100 } });
    postMessage({ type: workerEvents.trainingComplete });
}

// função de recomendação: recebe um usuário e retorna os filmes recomendados
function recommend({ user }) {
    if (!_model) return;
    const context = _globalCtx
    // 1️⃣ Converta o usuário fornecido no vetor de features codificadas
    //    (preço ignorado, idade normalizada, categorias ignoradas)
    //    Isso transforma as informações do usuário no mesmo formato numérico
    //    que foi usado para treinar o modelo.

    const userVector = encodeUser(user, context).dataSync()

    // Em aplicações reais:
    //  Armazene todos os vetores de filmes em um banco de dados vetorial (como Postgres, Neo4j ou Pinecone)
    //  Consulta: Encontre os 200 filmes mais próximos do vetor do usuário
    //  Execute _model.predict() apenas nesses filmes

    // 2️⃣ Crie pares de entrada: para cada filme, concatene o vetor do usuário
    //    com o vetor codificado do filme.
    //    Por quê? O modelo prevê o "score de compatibilidade" para cada par (usuário, filme).

    const inputs = context.movieVectors.map(({ vector }) => {
        return [...userVector, ...vector]
    })

    // 3️⃣ Converta todos esses pares (usuário, filme) em um único Tensor.
    //    Formato: [numFilmes, inputDim]
    const inputTensor = tf.tensor2d(inputs)

    // 4️⃣ Rode a rede neural treinada em todos os pares (usuário, filme) de uma vez.
    //    O resultado é uma pontuação para cada filme entre 0 e 1.
    //    Quanto maior, maior a probabilidade do usuário querer aquele filme.
    const predictions = _model.predict(inputTensor)

    // 5️⃣ Extraia as pontuações para um array JS normal.
    const scores = predictions.dataSync()
    const recommendations = context.movieVectors.map((item, index) => {
        return {
            ...item.meta,
            name: item.name,
            score: scores[index] // previsão do modelo para este filme
        }
    })

    console.log(`[Worker] Previsões geradas para usuário ${user.name}:`, recommendations.slice(0, 3).map(r => `${r.name}: ${r.score}`));

    // memory cleanup
    userVector.dispose?.();
    inputTensor.dispose();
    predictions.dispose();

    const sortedItems = recommendations
        .sort((a, b) => b.score - a.score)

    // 8️⃣ Envie a lista ordenada de filmes recomendados
    //    para a thread principal (a UI pode exibi-los agora).
    postMessage({
        type: workerEvents.recommend,
        user,
        recommendations: sortedItems
    });

}
const handlers = {
    [workerEvents.trainModel]: trainModel,
    [workerEvents.recommend]: recommend,
};

self.onmessage = e => {
    const { action, ...data } = e.data;
    if (handlers[action]) handlers[action](data);
};
