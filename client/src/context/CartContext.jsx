import React, { createContext, useState, useEffect, useContext } from 'react';
import API from '../api/axiosConfig';
import { AuthContext } from './AuthContext';
import { useNavigate } from 'react-router-dom';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [cart, setCart] = useState({ items: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        // We set up the interceptor to sign the user out if their token is invalid, but we only want
        // to pass the navigate function if we need it here. However, authContext usually handles this.
        // Doing the interceptor setup here was problematic, moved back to AuthContext.
        
        if (user) {
            refreshCart();
        } else {
            setCart({ items: [] });
        }
    }, [user]);

    const refreshCart = async () => {
        setLoading(true);
        try {
            const res = await API.get('/api/cart');
            setCart(res.data || { items: [] });
            setError(null);
        } catch (err) {
            console.error('Error fetching cart:', err);
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = async (productId, quantity, startDate, endDate) => {
        setLoading(true);
        try {
            await API.post('/api/cart/add', {
                productId,
                quantity: quantity || 1,
                startDate: new Date(startDate).toISOString(),
                endDate: new Date(endDate).toISOString()
            });
            await refreshCart();
            return { success: true };
        } catch (err) {
            console.error('Error adding to cart:', err);
            return { 
                success: false, 
                message: err.response?.data?.message || err.message || 'Failed to add to cart' 
            };
        } finally {
            setLoading(false);
        }
    };

    const updateDates = async (itemId, startDate, endDate) => {
        setLoading(true);
        try {
            await API.put(`/api/cart/item/${itemId}`, {
                startDate: new Date(startDate).toISOString(),
                endDate: new Date(endDate).toISOString()
            });
            await refreshCart();
            return { success: true };
        } catch (err) {
            console.error('Error updating cart item dates:', err);
            return { 
                success: false, 
                message: err.response?.data?.message || err.message || 'Failed to update dates' 
            };
        } finally {
            setLoading(false);
        }
    };

    const updateQuantity = async (itemId, quantity) => {
        setLoading(true);
        try {
            // We also need to send startDate and endDate when updating quantity
            // to pass validation, so we should fetch the item from the current cart state
            const item = cart.items.find(i => i._id === itemId);
            if (!item) throw new Error("Item not found in cart");
            
            await API.put(`/api/cart/item/${itemId}`, {
                startDate: item.startDate,
                endDate: item.endDate,
                quantity: quantity
            });
            await refreshCart();
            return { success: true };
        } catch (err) {
            console.error('Error updating cart item quantity:', err);
            return { 
                success: false, 
                message: err.response?.data?.message || err.message || 'Failed to update quantity' 
            };
        } finally {
            setLoading(false);
        }
    };

    const removeFromCart = async (itemId) => {
        setLoading(true);
        try {
            await API.delete(`/api/cart/item/${itemId}`);
            await refreshCart();
            return { success: true };
        } catch (err) {
            console.error('Error removing from cart:', err);
            return { 
                success: false, 
                message: err.response?.data?.message || err.message || 'Failed to remove from cart' 
            };
        } finally {
            setLoading(false);
        }
    };

    const clearCart = async () => {
        setLoading(true);
        try {
            await API.delete('/api/cart');
            setCart({ items: [] });
            return { success: true };
        } catch (err) {
            console.error('Error clearing cart:', err);
            return { 
                success: false, 
                message: err.response?.data?.message || err.message || 'Failed to clear cart' 
            };
        } finally {
            setLoading(false);
        }
    };

    return (
        <CartContext.Provider value={{
            cart,
            cartCount: cart.items?.length || 0,
            loading,
            error,
            refreshCart,
            addToCart,
            updateDates,
            updateQuantity,
            removeFromCart,
            clearCart
        }}>
            {children}
        </CartContext.Provider>
    );
};
