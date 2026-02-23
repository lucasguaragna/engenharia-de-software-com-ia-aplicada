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
    const prices = products.map(p => p.price)

    const minAge = Math.min(...ages)
    const maxAge = Math.max(...ages)

    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)

    const colors = [...new Set(products.map(p => p.color))]
    const categories = [...new Set(products.map(p => p.category))]

    debugger

    // 🏷️ Criamos um mapa de nomes para números (Label Encoding)
    // Redes neurais não entendem texto, então convertemos cada cor e categoria em um ID numérico.
    // Exemplo: { "Azul": 0, "Verde": 1 }
    // .map() percorre a lista e transforma cada item em um novo formato (neste caso, pares [nome, índice])
    // Object.fromEntries() converte essa lista de pares em um objeto literal para busca rápida { nome: índice }
    const colorsIndex = Object.fromEntries(
        colors.map((color, index) => [color, index])
    )
    const categoriesIndex = Object.fromEntries(
        categories.map((category, index) => [category, index])
    )

    // Computar a média de idade dos comprados por produto
    // (ajuda a personalizar)
    const midAge = (minAge + maxAge) / 2
    const ageSums = {}
    const ageCounts = {}

    users.forEach(user => {
        user.purchases.forEach(p => {
            ageSums[p.name] = (ageSums[p.name] || 0) + user.age
            ageCounts[p.name] = (ageCounts[p.name] || 0) + 1
        })
    })

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

function encodeProduct(product, context) {
    const price = tf.tensor1d([normalize(
        product.price,
        context.minPrice,
        context.maxPrice
    )])
}

async function trainModel({ users }) {
    console.log('Training model with users:', users);
    postMessage({ type: workerEvents.progressUpdate, progress: { progress: 1 } });
    const products = await (await fetch('/data/products.json')).json()

    const context = makeContext(products, users)
    
    context.productVectors catalog.map(product => {
     return {
        name: product.name,
        meta: {...product},
        vector: encodeProduct(product, context)
     }   
    })
    
    postMessage({ type: workerEvents.progressUpdate, progress: { progress: 100 } });
    postMessage({ type: workerEvents.trainingComplete });
}
function recommend({ user }) {

    // postMessage({
    //     type: workerEvents.recommend,
    //     user,
    //     recommendations: sortedItems
    // });

}
const handlers = {
    [workerEvents.trainModel]: trainModel,
    [workerEvents.recommend]: recommend,
};

self.onmessage = e => {
    const { action, ...data } = e.data;
    if (handlers[action]) handlers[action](data);
};
