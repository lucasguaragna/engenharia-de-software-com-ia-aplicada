// esta classe é responsável por buscar os produtos no arquivo products.json
// e retornar os produtos para a aplicação
export class ProductService {
    // método assíncrono para buscar os produtos no arquivo products.json
    async getProducts() {
        const response = await fetch('./data/products.json');
        return await response.json();
    }

    // método assíncrono para buscar um produto específico através do seu ID    
    async getProductById(id) {
        const products = await this.getProducts();
        return products.find(product => product.id === id);
    }

    // método assíncrono para buscar uma lista de produtos através dos seus IDs 
    async getProductsByIds(ids) {
        const products = await this.getProducts();
        return products.filter(product => ids.includes(product.id));
    }
}
