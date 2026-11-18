import { useState } from 'react';
import Navbar, { type LabPage } from './components/Navbar';
import HomePage from './components/HomePage';
import TransformerCalculator from './components/TransformerCalculator';
import VoltageDropLab from './components/VoltageDropLab';
import PowerFactorLab from './components/PowerFactorLab';

export default function App() {
  const [currentPage, setCurrentPage] = useState<LabPage>('home');
  const [resetSignals, setResetSignals] = useState<Record<LabPage, number>>({
    home: 0,
    transformer: 0,
    'voltage-drop': 0,
    'power-factor': 0,
  });

  const handleNavigate = (page: LabPage) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetCurrentLab = () => {
    setResetSignals((prev) => ({
      ...prev,
      [currentPage]: prev[currentPage] + 1,
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#060A12] text-[#E6EDF7] oscilloscope-grid">
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onResetCurrentLab={handleResetCurrentLab}
      />

      <main className="flex-1">
        {currentPage === 'home' && <HomePage onNavigate={handleNavigate} />}
        {currentPage === 'transformer' && (
          <TransformerCalculator resetSignal={resetSignals.transformer} />
        )}
        {currentPage === 'voltage-drop' && (
          <VoltageDropLab resetSignal={resetSignals['voltage-drop']} />
        )}
        {currentPage === 'power-factor' && (
          <PowerFactorLab resetSignal={resetSignals['power-factor']} />
        )}
      </main>

      <footer className="border-t border-[#1B283F] bg-[#060A12]/90">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-3 px-4 py-5 sm:px-6 text-xs text-[#7E93B0]">
          <span>المعمل الكهربائي · Electric Vibes Lab</span>
          <span>أداة تعليمية وحسابية لمهندسي الكهرباء · القيم الافتراضية للتجربة فقط</span>
        </div>
      </footer>
    </div>
  );
}
