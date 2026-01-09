import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { productService } from '../services/productService';
import Rating from '../components/Rating';
import './../styles/ProductPage.css';

const ProductPage = () => {
    const { slug } = useParams();
    const [product, setProduct] = useState(null);
    const [error, setError] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await productService.getBySlug(slug);
                setProduct(response);
            } catch (error) {
                setError(error.message);
                console.error("Failed to fetch product:", error);
            }
        };

        fetchProduct();
    }, [slug]);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getImageUrl = (imageName) => {
        return new URL(`/src/assets/${imageName}`, import.meta.url).href;
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const renderAvailabilityCalendar = () => {
        if (!product) return null;

        const availabilityMap = product.availability || {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const limitDate = new Date();
        limitDate.setDate(today.getDate() + 90);

        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const monthName = currentMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun

        const days = [];
        // Empty cells for start of month
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(<div key={`empty-${i}`} style={{ height: '50px' }}></div>);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            
            const isPast = date < today;
            
            let bgColor = '#f9fafb'; // gray-50
            let borderColor = '#e5e7eb'; // gray-200
            let textColor = '#9ca3af'; // gray-400
            let stockText = null;

            if (!isPast) {
                const stockCount = availabilityMap[dateKey] !== undefined ? availabilityMap[dateKey] : 1;
                const isOut = stockCount === 0;

                if (isOut) {
                    bgColor = '#f3f4f6'; // gray-100
                    borderColor = '#e5e7eb'; // gray-200
                    textColor = '#6b7280'; // gray-500
                } else {
                    bgColor = '#dcfce7'; // green-100
                    borderColor = '#bbf7d0'; // green-200
                    textColor = '#16a34a'; // green-600
                }
                stockText = <span style={{ fontSize: '0.65rem', fontWeight: 'bold' }}>Stock:{stockCount}</span>;
            }

            days.push(
                <div key={dateKey} style={{
                    height: '50px',
                    border: `1px solid ${borderColor}`,
                    backgroundColor: bgColor,
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: textColor,
                    fontSize: '0.8rem'
                }}>
                    <span style={{ fontWeight: '600' }}>{d}</span>
                    {stockText}
                </div>
            );
        }

        return (
            <div style={{ marginLeft: isMobile ? '0' : '70px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', fontWeight: 'bold' }}>Availability Calendar</h3>
                <div style={{ width: '100%', maxWidth: '350px', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', backgroundColor: 'white', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <button 
                            onClick={prevMonth} 
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                            disabled={currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear()}
                        >
                            &lt;
                        </button>
                        <h4 style={{ fontWeight: 'bold', color: '#374151', margin: 0 }}>{monthName}</h4>
                        <button 
                            onClick={nextMonth} 
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                            disabled={currentMonth.getFullYear() > limitDate.getFullYear() || (currentMonth.getFullYear() === limitDate.getFullYear() && currentMonth.getMonth() >= limitDate.getMonth())}
                        >&gt;</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '8px' }}>
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                            <div key={day} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: '#6b7280' }}>{day}</div>
                        ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                        {days}
                    </div>
                </div>
            </div>
        );
    };

    if (error) {
        return <div className="product-page-container">Error: {error}</div>;
    }

    if (!product) {
        return <div className="product-page-container">Loading...</div>;
    }

    return (
        <div className="product-page-container" style={{ width: '100%', minHeight: '100vh', padding: '90px 20px 20px 20px', display: 'flex', flexDirection: 'column', border: 'none', boxShadow: 'none', backgroundColor: '#ffffff', marginTop: '0' }}>
            <h1 className="product-title" style={{ textAlign: 'center', marginBottom: '10px', marginTop: 0 }}>{product.name}</h1>
            {/* Top Section: Image and Description */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '40px', marginBottom: '20px', alignItems: isMobile ? 'stretch' : 'flex-start' }}>
                <div className="product-image-section" style={{ flex: '1' }}>
                    {product.imageUrls && product.imageUrls.length > 0 && (
                        <img src={getImageUrl(product.imageUrls[0])} alt={product.name} className="product-main-image" style={{ width: '100%', borderRadius: '8px' }} />
                    )}
                </div>
                
                <div className="product-description-section" style={{ flex: '1' }}>
                    <div className="product-page-pricing" style={{ margin: '1rem 0' }}>
                        <p className="price-tag"><strong>Daily Rate:</strong> ₹{product.dailyRate}</p>
                        <p className="price-tag"><strong>Weekly Rate:</strong> ₹{product.weeklyRate}</p>
                        <p className="price-tag"><strong>Monthly Rate:</strong> ₹{product.monthlyRate}</p>
                        <p className="price-tag"><strong>Refundable Security Deposit:</strong> ₹{product.securityDeposit}</p>
                        <p className="price-tag" style={{border: `1px solid #e5e7eb`, padding: `8px`}}><strong><quote> Initially pay security deposit only. While returning the cycle we deduct rental from the deposit and refund the balance.</quote></strong></p>
                    </div>
                    <h3>Description</h3> 
                    <Rating value={product.averageRating} />
                    <p className="product-page-description"><strong> {product.description}   </strong></p>
                    <div className="product-meta">
                        <p><strong>Size:   {product.size}</strong></p>
                        {product.minHeightFt && (
                            <p><strong>Suitable for height:      {product.minHeightFt}' {product.minHeightInch}" - {product.maxHeightFt}' {product.maxHeightInch}" </strong></p>
                        )}
                        <p><strong>Type: {product.type}</strong></p>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Calendar and Ordering Placeholder */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '40px', alignItems: isMobile ? 'stretch' : 'flex-start' }}>
                <div className="product-calendar-section" style={{ flex: '1' }}>
                    {renderAvailabilityCalendar()}
                </div>

                <div className="product-ordering-section" style={{ flex: '1' }}>
                    {/* Future Ordering Section */}
                </div>
            </div>
        </div>
    );
};

export default ProductPage;
