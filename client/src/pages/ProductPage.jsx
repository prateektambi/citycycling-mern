import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Rating from '../components/Rating';
import './../styles/ProductPage.css';

const ProductPage = () => {
    const { slug } = useParams();
    const [product, setProduct] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await fetch(`/api/products/${slug}`);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                setProduct(data);
            } catch (error) {
                setError(error.message);
                console.error("Failed to fetch product:", error);
            }
        };

        fetchProduct();
    }, [slug]);

    const getImageUrl = (imageName) => {
        return new URL(`/src/assets/${imageName}`, import.meta.url).href;
    };

    if (error) {
        return <div className="product-page-container">Error: {error}</div>;
    }

    if (!product) {
        return <div className="product-page-container">Loading...</div>;
    }

    return (
        <div className="product-page-container">
            <div className="product-image-section">
                {product.imageUrls && product.imageUrls.length > 0 && (
                    <img src={getImageUrl(product.imageUrls[0])} alt={product.name} className="product-main-image" />
                )}
            </div>
            <div className="product-details-section">
                <h1 className="product-title">{product.name}</h1>
                <Rating value={product.averageRating} />

                <h3>Description</h3>
                <p className="product-page-description">{product.description}</p>
                <div className="product-meta">
                    <p><strong>Size:</strong> {product.size}</p>
                    {product.minHeightFt && (
                        <p><strong>Suitable for height:</strong> {product.minHeightFt}' {product.minHeightInch}" - {product.maxHeightFt}' {product.maxHeightInch}"</p>
                    )}
                    <p><strong>Type:</strong> {product.type}</p>
                </div>
                <div className="product-page-pricing">
                    <p className="price-tag"><strong>Daily Rate:</strong> ₹{product.dailyRate}</p>
                    <p className="price-tag"><strong>Weekly Rate:</strong> ₹{product.weeklyRate}</p>
                    <p className="price-tag"><strong>Monthly Rate:</strong> ₹{product.monthlyRate}</p>
                </div>
                <button className="product-cta-button">Rent Now</button>
            </div>
        </div>
    );
};

export default ProductPage;
