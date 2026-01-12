import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import Analysis from './pages/Analysis';
import './App.css';

function App() {
  const [financialData, setFinancialData] = useState(null);

  const handleDataLoaded = (data) => {
    // Receive pre-processed financial data from Reports
    // Data includes: sessionId, rawData, kpis, charts, report
    console.log('Financial data loaded:', data);
    setFinancialData(data);
  };

  return (
    <Router>
      <div className="app-layout">
        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="main-content">
          <Routes>
            <Route
              path="/"
              element={<Dashboard financialData={financialData} />}
            />
            <Route
              path="/reports"
              element={<Reports onDataLoaded={handleDataLoaded} />}
            />
            <Route
              path="/analysis"
              element={<Analysis financialData={financialData} />}
            />
            <Route
              path="/upload"
              element={<Reports onDataLoaded={handleDataLoaded} />}
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
