import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
import { workerEvents } from '../events/constants.js';
let _globalCtx = {};
let _model = null
// Pesos para cada característica
const WEIGHTS = {
    category: 0.4,
    color: 0.3,
    price: 0.2,
    age: 0.1,
};

// 🔢 Normalize continuous values (price, age) to 0–1 range
// Why? Keeps all features balanced so no one dominates training
// Formula: (val - min) / (max - min)
// Example: price=129.99, minPrice=39.99, maxPrice=199.99 → 0.56
const normalize = (value, min, max) => (value - min) / ((max - min) || 1)

// 🧠 Cria o "cérebro" do sistema
// Recebe todos os produtos e usuários e calcula estatísticas
// para normalizar os dados
function makeContext(products, users) {
    const ages = users.map(u => u.age)
    const minAge = Math.min(...ages)
    const maxAge = Math.max(...ages)

    const prices = products.map(p => p.price)
    // ... é o spread operator, que expande o array prices em vários argumentos
    // então Math.min(...prices) é o mesmo que Math.min(price1, price2, price3, ...)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)

    const colors = [...new Set(products.map(p => p.color))]
    const categories = [...new Set(products.map(p => p.category))]

    // Label Encoding: transforma categorias e cores em números
    // Object.fromEntries transforma um array de pares [chave, valor] em um objeto
    // colors.map((color, index) => [color, index]) cria um array de pares [color, index]
    // Exemplo: [['red', 0], ['blue', 1], ['green', 2]]
    const colorsIndex = Object.fromEntries(
        colors.map((color, index) => [color, index])
    )
    const categoriesIndex = Object.fromEntries(
        categories.map((category, index) => [category, index])
    )

    const midAge = (minAge + maxAge) / 2
    const ageSums = {}
    const ageCounts = {}

    // Calcula a idade média de cada produto
    // ageSums é um objeto que armazena a soma das idades 
    //      dos usuários que compraram cada produto
    // ageCounts é um objeto que armazena a quantidade 
    //      de usuários que compraram cada produto
    users.forEach(user => {
        user.purchases.forEach(p => {
            ageSums[p.name] = (ageSums[p.name] || 0) + user.age
            ageCounts[p.name] = (ageCounts[p.name] || 0) + 1
        })
    })

    // productAvgAgeNorm é um objeto que armazena a idade média de cada produto
    // normalize é uma função que normaliza os valores contínuos (preço, idade) 
    // para o intervalo 0–1
    const productAvgAgeNorm = Object.fromEntries(
        products.map(product => {
            const avg = ageCounts[product.name] ?
                ageSums[product.name] / ageCounts[product.name] :
                midAge

            return [product.name, normalize(avg, minAge, maxAge)]
        })
    )

    return {
        products,
        users,
        colorsIndex,
        categoriesIndex,
        productAvgAgeNorm,
        minAge,
        maxAge,
        minPrice,
        maxPrice,
        numCategories: categories.length,
        numColors: colors.length,
        // price + age + colors + categories
        dimentions: 2 + categories.length + colors.length
    }
}

// Cria um vetor one-hot e multiplica pelo peso
const oneHotWeighted = (index, lenght, weight) => 
    tf.oneHot(index, lenght).cast('float32').mul(weight)
   

// 🏷️ Cria um vetor numérico (tensor) para cada produto
// O vetor é uma sequência de números que representa o produto
// Exemplo: [0.5, 0.2, 0.1, 0.3]
function encodeProduct(product, context) {
    // normalizando price
    const price = tf.tensor1d([
        normalize(
            product.price,
            context.minPrice,
            context.maxPrice
        ) * WEIGHTS.price
    ])
    
    // normalizando age
    const age = tf.tensor1d([
        (
            context.productAvgAgeNorm[product.name] ?? 0.5
        ) * WEIGHTS.age
    ])

    // normalizando category
    const category = oneHotWeighted(
        context.categoriesIndex[product.category],
        context.numCategories,
        WEIGHTS.category
    )
    // normalizando color
    const color = oneHotWeighted(
        context.colorsIndex[product.color],
        context.numColors,
        WEIGHTS.color
    )
    // concatenando todos os vetores
    // tf usa isso para criar o vetor do produto
    return tf.concat1d([price, age, category, color])
}
// usada para criar o vetor do usuário
// relaciona os produtos que o usuário comprou
function encodeUser(user,context) {
    if(user.purchases.length) {
        return tf.stack(
            user.purchases.map(
                product => encodeProduct(product, context)
            )
        ).mean(0)
        .reshape([
            1,
            context.dimentions
        ])
    }

    return tf.concat1d(
        [
            tf.zeros([1]),
            tf.tensor1d([
                normalize(user.age, context.minAge, context.maxAge)
                * WEIGHTS.age
            ]),
            tf.zeros([context.numCategories]), // categoria ignorada
            tf.zeros([context.numColors]) // cor ignorada
        ]
    ).reshape([1, context.dimentions])
}

function createTraningData(context) {
    const inputs = []
    const labels = []

    context.users
        .filter(user => user.purchases.length)
        .forEach(user => {
            // cria o vetor do usuário
            const userVector = encodeUser(user, context).dataSync()
            context.products.forEach(product => {
                const productVector = encodeProduct(product, context).dataSync()
                
                const label = user.purchases.some(
                    purchase => purchase.name === product.name ?
                    1 :
                    0
                )

                // concatenando todos os vetores
                inputs.push([...userVector, ...productVector])
                labels.push(label)

            })
        })

    return {
        xs: tf.tensor2d(inputs),
        ys: tf.tensor2d(labels, [ labels.length, 1]),
        inputDimension: context.dimentions * 2
    }
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
        optimizer: tf.train.adam(0.01), // adam é um otimizador que ajusta os pesos do modelo
        loss: 'binaryCrossentropy', // binaryCrossentropy é uma função de perda que mede a diferença entre a saída do modelo e a saída real
        metrics: ['accuracy'] // accuracy é uma métrica que mede a precisão do modelo
    })
    
    await model.fit(trainingData.xs, trainingData.ys, {
        epochs: 100,
        batchSize: 32,
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
    const products = await (await fetch('/data/products.json')).json()

    const context = makeContext(products, users)
    
    context.productVectors = products.map(product => {
     return {
        name: product.name,
        meta: {...product}, 
        vector: encodeProduct(product, context).dataSync()
     }   
    })
        
    _globalCtx = context

    const trainingData = createTraningData(context)

    _model = await configureNeuralNetAndTrain(trainingData)
    
    postMessage({ type: workerEvents.progressUpdate, progress: { progress: 100 } });

    postMessage({ type: workerEvents.trainingComplete });
}
function recommend({ user }) {
    if (!_model) return;
    const context = _globalCtx
    // 1️⃣ Converta o usuário fornecido no vetor de features codificadas
    //    (preço ignorado, idade normalizada, categorias ignoradas)
    //    Isso transforma as informações do usuário no mesmo formato numérico
    //    que foi usado para treinar o modelo.

    const userVector = encodeUser(user, context).dataSync()

    // Em aplicações reais:
    //  Armazene todos os vetores de produtos em um banco de dados vetorial (como Postgres, Neo4j ou Pinecone)
    //  Consulta: Encontre os 200 produtos mais próximos do vetor do usuário
    //  Execute _model.predict() apenas nesses produtos

    // 2️⃣ Crie pares de entrada: para cada produto, concatene o vetor do usuário
    //    com o vetor codificado do produto.
    //    Por quê? O modelo prevê o "score de compatibilidade" para cada par (usuário, produto).


    const inputs = context.productVectors.map(({ vector }) => {
        return [...userVector, ...vector]
    })

    // 3️⃣ Converta todos esses pares (usuário, produto) em um único Tensor.
    //    Formato: [numProdutos, inputDim]
    const inputTensor = tf.tensor2d(inputs)

    // 4️⃣ Rode a rede neural treinada em todos os pares (usuário, produto) de uma vez.
    //    O resultado é uma pontuação para cada produto entre 0 e 1.
    //    Quanto maior, maior a probabilidade do usuário querer aquele produto.
    const predictions = _model.predict(inputTensor)

    // 5️⃣ Extraia as pontuações para um array JS normal.
    const scores = predictions.dataSync()
    const recommendations = context.productVectors.map((item, index) => {
        return {
            ...item.meta,
            name: item.name,
            score: scores[index] // previsão do modelo para este produto
        }
    })

    const sortedItems = recommendations
        .sort((a, b) => b.score - a.score)

    // 8️⃣ Envie a lista ordenada de produtos recomendados
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
