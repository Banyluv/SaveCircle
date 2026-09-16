import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import UpdatePrompt from './components/UpdatePrompt.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
        {/* Mounted outside App so an out-of-date app is still offered the
            update on the login screen — e.g. when it cannot reach the server
            because the address changed. Renders nothing except in the packaged
            Android app when the server has a newer build. */}
        <UpdatePrompt />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
