import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";

// Pages
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import SpaceOverview from "@/pages/SpaceOverview";
import SubmitTestimonial from "@/pages/SubmitTestimonial";
import WallOfLove from "@/pages/WallOfLove";
import ForgotPassword from "./pages/ForgotPassword";

// List of known TrustFlow domains (add your production domains here)
const KNOWN_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'trustflow.app',
  'www.trustflow.app',
  'proofwalls.preview.emergentagent.com',
];

// Check if current hostname is a custom domain
const isCustomDomain = () => {
  const hostname = window.location.hostname;
  // Check if it's a known domain or a GitHub Codespaces URL
  if (KNOWN_DOMAINS.some(d => hostname.includes(d))) return false;
  if (hostname.includes('.app.github.dev')) return false;
  if (hostname.includes('.vercel.app')) return false;
  if (hostname.includes('.netlify.app')) return false;
  return true;
};

// Custom Domain Handler Component
const CustomDomainHandler = () => {
  const [loading, setLoading] = useState(true);
  const [spaceData, setSpaceData] = useState(null);
  const [error, setError] = useState(null);
  const API_BASE = process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const resolveCustomDomain = async () => {
      try {
        const hostname = window.location.hostname;
        // Call API to resolve custom domain
        const res = await fetch(`${API_BASE}/api/custom-domains/resolve?domain=${hostname}`);
        const data = await res.json();
        
        if (data.status === 'success' && data.space) {
          setSpaceData(data.space);
        } else {
          setError('Domain not configured');
        }
      } catch (err) {
        console.error('Failed to resolve custom domain:', err);
        setError('Failed to resolve domain');
      } finally {
        setLoading(false);
      }
    };
    
    resolveCustomDomain();
  }, [API_BASE]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !spaceData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Domain Not Configured</h1>
          <p className="text-gray-600">This domain is not connected to any space.</p>
        </div>
      </div>
    );
  }

  // Render the submit form for this space
  // Pass the slug via URL simulation or direct prop
  const path = window.location.pathname;
  
  if (path === '/submit' || path === '/') {
    return <SubmitTestimonial customSlug={spaceData.slug} />;
  }
  
  if (path === '/wall') {
    return <WallOfLove customSpaceId={spaceData.id} />;
  }
  
  // Default: show submit form
  return <SubmitTestimonial customSlug={spaceData.slug} />;
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword/>}/>
      <Route path="/signup" element={<Signup />} />

      
      {/* Public Submission Portal */}
      <Route path="/submit/:slug" element={<SubmitTestimonial />} />
      
      {/* Widget Embed Route */}
      <Route path="/widget/:spaceId" element={<WallOfLove />} />
      
      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/:spaceId"
        element={
          <ProtectedRoute>
            <SpaceOverview />
          </ProtectedRoute>
        }
      />
      
      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  // Check if user is accessing via custom domain
  if (isCustomDomain()) {
    return (
      <BrowserRouter>
        <CustomDomainHandler />
        <Toaster />
      </BrowserRouter>
    );
  }

  // Normal TrustFlow app
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
