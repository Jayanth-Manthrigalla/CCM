// src/App.js
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import './fontawesome'; // Import FontAwesome initialization
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import Home from './pages/Home';
import ChronicCareManagement from './pages/services/ChronicCareManagement';
import CaseManagement from './pages/services/CaseManagement';
import BehavioralHealth from './pages/services/BehavioralHealth';
import RemotePatientMonitoring from './pages/services/RemotePatientMonitoring';
import AboutUs from './pages/AboutUs';
import Hospitals from './pages/WhoWeHelp/Hospitals';
import PrivatePractices from './pages/WhoWeHelp/PrivatePractices';
import Insurance from './pages/WhoWeHelp/Insurance';
import ThirdPartyAdmin from './pages/WhoWeHelp/ThirdPartyAdmin';
import CaseManagementGroups from './pages/WhoWeHelp/CaseManagementGroups';

// Add these imports if the components exist
import AdminLogin from './pages/AdminLogin';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import AdminDashboard from './pages/AdminDashboard';
import AcceptInvite from './pages/AcceptInvite';
import ContactSection from './components/ContactSection';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function App() {
  // Scroll to top on route change

  function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [pathname]);
    return null;
  }

  return (
    <Router>
      <ScrollToTop />
      <div className="App">
        <NavBar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/services/chronic-care-management" element={<ChronicCareManagement />} />
          <Route path="/services/case-management" element={<CaseManagement />} />
          <Route path="/services/behavioral-health" element={<BehavioralHealth />} />
          <Route path="/services/remote-patient-monitoring" element={<RemotePatientMonitoring />} />
          <Route path="/who-we-help/hospitals" element={<Hospitals />} />
          <Route path="/who-we-help/private-practices" element={<PrivatePractices />} />
          <Route path="/who-we-help/insurance-groups" element={<Insurance />} />
          <Route path="/who-we-help/third-party-administrator" element={<ThirdPartyAdmin />} />
          <Route path="/who-we-help/case-management-groups" element={<CaseManagementGroups />} />
          <Route path="/contact" element={<ContactSection />} />
          {/* your existing routes */}
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route
            path="/admin-dashboard"
            element={
              <AdminProtectedRoute>
                <AdminDashboard />
              </AdminProtectedRoute>
            }
          />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
