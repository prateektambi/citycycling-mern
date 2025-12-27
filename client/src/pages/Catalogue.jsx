import React, { useState, useEffect } from 'react';
import './../styles/Catalogue.css';

const Catalogue = () => {
    const [products, setProducts] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await fetch('/api/products');
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                setProducts(data);
            } catch (error) {
                setError(error.message);
                console.error("Failed to fetch products:", error);
            }
        };

        fetchProducts();
    }, []);

    const getImageUrl = (imageName) => {
        // Vite requires this specific pattern for dynamically loading assets.
        return new URL(`/src/assets/${imageName}`, import.meta.url).href;
    };

    if (error) {
        return <div className="catalogue-container">Error: {error}</div>;
    }

    return (
        <div className="catalogue-container">
            <h1>Our Fleet</h1>
            <div className="product-grid">
                {products.map(product => (
                    <div key={product._id} className="product-card">
                        {product.imageUrls && product.imageUrls.length > 0 && (
                            <img 
                                src={getImageUrl(product.imageUrls[0])} 
                                alt={product.name} 
                                className="product-thumbnail"
                            />
                        )}
                        <h3 className="product-name">{product.name}</h3>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Catalogue;
