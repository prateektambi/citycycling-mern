import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './../styles/Catalogue.css';
import { productService } from '../services/productService';

const bikeTypes = ['MTB', 'Road Bike', 'Hybrid'];

const Catalogue = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [error, setError] = useState(null);

    // --- Filter States ---
    const [selectedTypes, setSelectedTypes] = useState(() => {
        const types = searchParams.get('types');
        return types ? types.split(',') : bikeTypes;
    });
    const [heightFt, setHeightFt] = useState(searchParams.get('heightFt') || '');
    const [heightIn, setHeightIn] = useState(searchParams.get('heightIn') || '');
    const [availabilityFilter, setAvailabilityFilter] = useState(searchParams.get('availability') || 'all'); // all, today, weekend

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await productService.getAll();
                setProducts(response);
            } catch (error) {
                setError(error.message);
                console.error("Failed to fetch products:", error);
            }
        };
        fetchProducts();
    }, []);

    // Sync filters to URL
    useEffect(() => {
        const params = new URLSearchParams();
        
        const isAllTypesSelected = selectedTypes.length === bikeTypes.length && selectedTypes.every(t => bikeTypes.includes(t));
        if (!isAllTypesSelected && selectedTypes.length > 0) {
            params.set('types', selectedTypes.join(','));
        }

        if (heightFt) params.set('heightFt', heightFt);
        if (heightIn) params.set('heightIn', heightIn);
        if (availabilityFilter !== 'all') params.set('availability', availabilityFilter);

        if (searchParams.toString() !== params.toString()) {
            setSearchParams(params, { replace: true });
        }
    }, [selectedTypes, heightFt, heightIn, availabilityFilter, setSearchParams, searchParams]);

    // Helper: Check availability for a specific date range
    const checkStockInRange = (product, days) => {
        const today = new Date();
        for (let i = 0; i < days; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            // Accessing the availability Map from the Product Model
            if (product.availability && product.availability[dateStr] > 0) {
                return true;
            }
        }
        return false;
    };

    // Helper: Check availability for specific dates
    const checkStockOnDates = (product, dates) => {
        return dates.some(date => {
            const dateStr = date.toISOString().split('T')[0];
            return product.availability && product.availability[dateStr] > 0;
        });
    };

    // --- Filtering Logic ---
    const filteredProducts = useMemo(() => {
        let weekendDates = [];
        if (availabilityFilter === 'weekend') {
            const today = new Date();
            const day = today.getDay();
            
            if (day === 5) { // Friday
                weekendDates.push(new Date(today));
                const sat = new Date(today); sat.setDate(today.getDate() + 1); weekendDates.push(sat);
                const sun = new Date(today); sun.setDate(today.getDate() + 2); weekendDates.push(sun);
            } else if (day === 6) { // Saturday
                weekendDates.push(new Date(today));
                const sun = new Date(today); sun.setDate(today.getDate() + 1); weekendDates.push(sun);
            } else if (day === 0) { // Sunday
                weekendDates.push(new Date(today));
            } else {
                const diff = 5 - day;
                const nextFriday = new Date(today);
                nextFriday.setDate(today.getDate() + diff);
                weekendDates.push(new Date(nextFriday));
                const sat = new Date(nextFriday); sat.setDate(nextFriday.getDate() + 1); weekendDates.push(sat);
                const sun = new Date(nextFriday); sun.setDate(nextFriday.getDate() + 2); weekendDates.push(sun);
            }
        }

        return products.filter(product => {
            // 1. Type Filter
            const matchesType = selectedTypes.length === 0 || selectedTypes.includes(product.type);

            // 2. Height Filter logic
            let matchesHeight = true;
            if (heightFt !== '') {
                const riderTotalInches = (parseInt(heightFt) * 12) + (parseInt(heightIn) || 0);
                const minInches = (product.minHeightFt * 12) + (product.minHeightInch || 0);
                const maxInches = (product.maxHeightFt * 12) + (product.maxHeightInch || 0);
                matchesHeight = riderTotalInches >= minInches && riderTotalInches <= maxInches;
            }

            // 3. Availability Filter
            let matchesAvailability = true;
            if (availabilityFilter === 'today') {
                matchesAvailability = checkStockInRange(product, 2);
            } else if (availabilityFilter === 'weekend') {
                matchesAvailability = checkStockOnDates(product, weekendDates);
            } else if (availabilityFilter === '7Day') {
                matchesAvailability = checkStockInRange(product, 7);
            }

            return matchesType && matchesHeight && matchesAvailability;
        });
    }, [products, selectedTypes, heightFt, heightIn, availabilityFilter]);

    const getImageUrl = (imageName) => {
        return new URL(`/src/assets/${imageName}`, import.meta.url).href;
    };

    const clearFilters = () => {
        setSelectedTypes(bikeTypes);
        setHeightFt('');
        setHeightIn('');
        setAvailabilityFilter('all');
    };

    if (error) return <div className="catalogue-container">Error: {error}</div>;

    return (
        <div className="catalogue-container">
            <h1>Our Fleet</h1>

            {/* --- Filter Bar --- */}
            <div className="filter-bar">
                <div className="filter-item">
                    <label>Bike Type</label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {bikeTypes.map(type => (
                            <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedTypes.includes(type)}
                                    onChange={() => setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])}
                                />
                                {type}
                            </label>
                        ))}
                    </div>
                </div>

                <div className="filter-item">
                    <label>Your Height</label>
                    <div className="height-inputs">
                        <select value={heightFt} onChange={(e) => setHeightFt(e.target.value)}>
                            <option value="">Feet</option>
                            {[3, 4, 5, 6].map(ft => <option key={ft} value={ft}>{ft} ft</option>)}
                        </select>
                        <select value={heightIn} onChange={(e) => setHeightIn(e.target.value)}>
                            <option value="0">Inches</option>
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(inch => (
                                <option key={inch} value={inch}>{inch} in</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="filter-item">
                    <label>Availability</label>
                    <div className="toggle-group">
                        <button 
                            className={availabilityFilter === 'all' ? 'active' : ''} 
                            onClick={() => setAvailabilityFilter('all')}
                        >Anytime</button>
                        <button 
                            className={availabilityFilter === 'today' ? 'active' : ''} 
                            onClick={() => setAvailabilityFilter('today')}
                        >Today-Tomorrow</button>
                        <button 
                            className={availabilityFilter === 'weekend' ? 'active' : ''} 
                            onClick={() => setAvailabilityFilter('weekend')}
                        >Weekend</button>
                        <button 
                            className={availabilityFilter === '7Day' ? 'active' : ''} 
                            onClick={() => setAvailabilityFilter('7Day')}
                        >7 Days</button>
                    </div>
                </div>

                <div className="filter-item">
                    <button onClick={clearFilters} style={{ padding: '0.6rem 1rem', cursor: 'pointer', background: '#fff', border: '1px solid #ccc', borderRadius: '4px', fontWeight: 'bold', color: '#555' }}>
                        Clear All
                    </button>
                </div>
            </div>

            {/* --- Product Grid --- */}
            <div className="product-grid">
                {filteredProducts.map(product => (
                    <Link to={`/product/${product.slug}`} key={product._id} className="product-card-link">
                        <div className="product-card">
                            {product.imageUrls && product.imageUrls.length > 0 && (
                                <img 
                                    src={getImageUrl(product.imageUrls[0])} 
                                    alt={product.name} 
                                    className="product-thumbnail"
                                />
                            )}
                            <h3 className="product-name">{product.name} ({product.size})</h3>
                            <p className="product-pricing">
                                ₹{product.dailyRate}/day | ₹{product.weeklyRate}/week
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
            {filteredProducts.length === 0 && (
                <p className="no-results">No bikes match your current filters. Try adjusting your height or type.</p>
            )}
        </div>
    );
};

export default Catalogue;