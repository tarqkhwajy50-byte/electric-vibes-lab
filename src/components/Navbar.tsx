import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export type LabPage = 'home' | 'transformer' | 'voltage-drop' | 'power-factor';

interface NavbarProps {
  currentPage: LabPage;
  onNavigate: (page: LabPage) => void;
  onResetCurrentLab?: () => void;
}

const NAV_ITEMS: { id: LabPage; label: string }[] = [
  { id: 'home', label: 'الرئيسية' },
  { id: 'transformer', label: 'المحوّل والعدادات' },
  { id: 'voltage-drop', label: 'هبوط الجهد' },
  { id: 'power-factor', label: 'معامل القدرة' },
];

export default function Navbar({
  currentPage,
  onNavigate,
  onResetCurrentLab,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSelectPage = (page: LabPage) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#1B283F] bg-[#060A12]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => handleSelectPage('home')}
          className="text-lg font-bold tracking-tight text-[#F5A623] hover:text-[#FBBF24] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623] rounded-sm"
        >
          المعمل الكهربائي
        </button>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7" aria-label="التنقل الرئيسي">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectPage(item.id)}
                className={`relative py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE] rounded-sm ${
                  isActive
                    ? 'text-[#E6EDF7]'
                    : 'text-[#8FA3BF] hover:text-[#E6EDF7]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[17px] h-[2px] bg-[#F5A623]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action (plus mobile menu button on small screens) */}
        <div className="flex items-center gap-3 shrink-0">
          {currentPage === 'home' ? (
            <button
              type="button"
              onClick={() => handleSelectPage('transformer')}
              className="hidden sm:inline-flex items-center justify-center rounded-md bg-[#F5A623] px-4 py-2 text-xs font-semibold text-[#060A12] hover:bg-[#FBBF24] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]"
            >
              افتح الحاسبة
            </button>
          ) : (
            <button
              type="button"
              onClick={onResetCurrentLab}
              className="inline-flex items-center justify-center rounded-md border border-[#243654] bg-[#0B121E] px-4 py-2 text-xs font-semibold text-[#22D3EE] hover:border-[#22D3EE]/60 hover:bg-[#101B2D] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]"
            >
              إعادة ضبط القيم
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex md:hidden items-center justify-center rounded-md border border-[#1B283F] bg-[#0B121E] p-2.5 text-[#E6EDF7] hover:border-[#22D3EE]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]"
            aria-label={mobileMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation panel */}
      {mobileMenuOpen && (
        <nav
          aria-label="قائمة الجوال"
          className="md:hidden border-t border-[#1B283F] bg-[#080D17] px-4 py-3"
        >
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectPage(item.id)}
                  className={`flex items-center justify-between rounded-md px-3 py-3 text-sm font-medium transition-colors text-right ${
                    isActive
                      ? 'bg-[#111B2E] text-[#F5A623]'
                      : 'text-[#B5C4D8] hover:bg-[#0E1626] hover:text-[#E6EDF7]'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && <span className="text-xs font-mono-tech">نشط</span>}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
