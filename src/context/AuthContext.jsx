import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_BASE_URL, setUnauthorizedHandler } from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('savecircle_user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    // Shown on the login screen after an automatic sign-out, so the user knows
    // why they were returned there instead of it happening silently.
    const [sessionMessage, setSessionMessage] = useState('');

    useEffect(() => {
        if (user) {
            localStorage.setItem('savecircle_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('savecircle_user');
        }
    }, [user]);

    // If any API call returns 401, the stored token is no longer valid. Clear the
    // session so the user is returned to the login screen rather than being stuck
    // on a page where every request fails with "Not authorized, token failed".
    useEffect(() => {
        setUnauthorizedHandler(() => {
            setUser((current) => {
                if (current) {
                    setSessionMessage('Your session expired. Please sign in again.');
                }
                return null;
            });
        });
        return () => setUnauthorizedHandler(null);
    }, []);

    const login = async (email, password) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (response.ok) {
                setSessionMessage('');
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
        setSessionMessage('');
        setUser(null);
        localStorage.removeItem('savecircle_user');
    };

    return (
        <AuthContext.Provider value={{ user, setUser, login, logout, sessionMessage, setSessionMessage }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
