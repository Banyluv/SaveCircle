import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_BASE_URL } from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('savecircle_user');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    useEffect(() => {
        if (user) {
            localStorage.setItem('savecircle_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('savecircle_user');
        }
    }, [user]);

    const login = async (email, password) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (response.ok) {
                setUser(data);
                // Persist synchronously so subsequent authFetch calls have the token
                localStorage.setItem('savecircle_user', JSON.stringify(data));
                return { success: true };
            }
            return { success: false, message: data.message || 'Login failed' };
        } catch (error) {
            return { success: false, message: 'Unable to reach backend. Make sure the server is running.' };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('savecircle_user');
    };

    return (
        <AuthContext.Provider value={{ user, setUser, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
