import { ArrowLeft, Cpu, Activity, Triangle } from 'lucide-react';
import type { LabPage } from './Navbar';

interface HomePageProps {
  onNavigate: (page: LabPage) => void;
}

interface LabModuleCard {
  id: LabPage;
  index: string;
  category: string;
  title: string;
  description: string;
  formulaPreview: string;
  units: string;
  actionLabel: string;
  accent: 'amber' | 'cyan';
  icon: typeof Cpu;
}

const LAB_MODULES: LabModuleCard[] = [
  {
    id: 'transformer',
    index: '01',
    category: 'توزيع القدرة · 380 V',
    title: 'حاسبة المحوّل والعدادات',
    description:
      'احسب الحمل الكلي المتصل انطلاقاً من سعات قواطع العدادات بالأمبير (100A – 400A) ونسبة تحميل المحوّل (أرضي أو هوائي) وتيار الثانوي عند 380 V.',
    formulaPreview: 'I = S / (√3 × 380)',
    units: 'kVA · A · %',
    actionLabel: 'فتح الحاسبة',
    accent: 'amber',
    icon: Cpu,
  },
  {
    id: 'voltage-drop',
    index: '02',
    category: 'تجربة الكابلات · أحادي وثلاثي الطور',
    title: 'هبوط الجهد في الكيبل',
    description:
      'اختبر تأثير التيار وطول الكيبل ومقطع الموصل ومادته (نحاس أو ألمنيوم) على نسبة هبوط الجهد مع منحنى حي وتنبيه فوري عند تجاوز 5%.',
    formulaPreview: 'ΔV = (k × L × I × ρ) / A',
    units: 'V · % · m · mm²',
    actionLabel: 'بدء التجربة',
    accent: 'cyan',
    icon: Activity,
  },
  {
    id: 'power-factor',
    index: '03',
    category: 'تحليل القدرة التفاعلية · مثلث القدرة',
    title: 'تحسين معامل القدرة',
    description:
      'حدّد سعة المكثفات المطلوبة للانتقال من معامل القدرة الحالي إلى المستهدف مع رسم حي لمثلث القدرة يوضح P و Q و S قبل وبعد التحسين.',
    formulaPreview: 'Qc = P × (tan φ₁ − tan φ₂)',
    units: 'kW · kVAR · kVA',
    actionLabel: 'بدء التجربة',
    accent: 'amber',
    icon: Triangle,
  },
];

export default function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14 space-y-12">
      {/* Hero Bench Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch rounded-xl border border-[#1B283F] bg-[#0B121E] p-6 sm:p-8 lg:p-10">
        <div className="lg:col-span-7 flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#8FA3BF]">
              <span>Electric Vibes Lab</span>
              <span aria-hidden="true">·</span>
              <span>أدوات هندسة القوى الكهربائية</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tech text-[#22D3EE]" dir="ltr">
                380 V / 220 V · 60 Hz
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-bold leading-[1.25] text-[#F4F7FB] [text-wrap:balance]">
              المعمل الكهربائي التفاعلي لحسابات الأحمال والشبكات
            </h1>

            <p className="max-w-2xl text-base leading-relaxed text-[#9FB1C9]">
              منصة حسابية وتجريبية سريعة لمهندسي الكهرباء لمحاكاة تحميل محوّلات التوزيع،
              ومراقبة هبوط الجهد عبر الكابلات، وحساب مكثفات تحسين معامل القدرة بدقة لحظية.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('transformer')}
              className="inline-flex items-center gap-2.5 rounded-md bg-[#F5A623] px-5 py-3 text-sm font-semibold text-[#060A12] hover:bg-[#FBBF24] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]"
            >
              <span>ابدأ بحاسبة المحوّل</span>
              <ArrowLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('voltage-drop')}
              className="inline-flex items-center gap-2 rounded-md border border-[#243654] bg-[#080E18] px-5 py-3 text-sm font-medium text-[#E6EDF7] hover:border-[#22D3EE]/60 hover:text-[#22D3EE] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]"
            >
              <span>تجربة هبوط الجهد</span>
            </button>
          </div>
        </div>

        {/* Oscilloscope Dual-Trace Visual Preview */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-lg border border-[#1B283F] bg-[#060A12] p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-[#8FA3BF] pb-3 border-b border-[#152035]">
            <span>مؤشر الإشارة المرجعي</span>
            <span className="font-mono-tech text-[#22D3EE]" dir="ltr">
              Vrms · Phase A/B
            </span>
          </div>

          <div className="my-4 w-full">
            <svg
              viewBox="0 0 420 170"
              className="w-full h-44"
              role="img"
              aria-label="رسم موجة جهد وتيار على راسم الإشارة"
            >
              {/* Grid lines */}
              <g stroke="#162238" strokeWidth="1">
                <line x1="0" y1="25" x2="420" y2="25" />
                <line x1="0" y1="55" x2="420" y2="55" />
                <line x1="0" y1="85" x2="420" y2="85" stroke="#223352" strokeDasharray="4 4" />
                <line x1="0" y1="115" x2="420" y2="115" />
                <line x1="0" y1="145" x2="420" y2="145" />
                <line x1="70" y1="10" x2="70" y2="160" />
                <line x1="140" y1="10" x2="140" y2="160" />
                <line x1="210" y1="10" x2="210" y2="160" stroke="#223352" strokeDasharray="4 4" />
                <line x1="280" y1="10" x2="280" y2="160" />
                <line x1="350" y1="10" x2="350" y2="160" />
              </g>

              {/* Channel 1: Voltage Wave (Amber) */}
              <path
                d="M 10 85 C 45 20, 75 20, 110 85 C 145 150, 175 150, 210 85 C 245 20, 275 20, 310 85 C 345 150, 375 150, 410 85"
                fill="none"
                stroke="#F5A623"
                strokeWidth="2.4"
                strokeLinecap="round"
              />

              {/* Channel 2: Current Wave phase-shifted (Cyan) */}
              <path
                d="M 10 112 C 42 48, 72 32, 108 62 C 142 90, 174 138, 210 112 C 244 86, 274 32, 310 62 C 346 92, 376 138, 410 112"
                fill="none"
                stroke="#22D3EE"
                strokeWidth="2"
                strokeDasharray="6 4"
                strokeLinecap="round"
              />

              {/* Phase shift marker */}
              <line x1="110" y1="30" x2="110" y2="140" stroke="#F5A623" strokeOpacity="0.35" strokeWidth="1" />
              <line x1="136" y1="30" x2="136" y2="140" stroke="#22D3EE" strokeOpacity="0.35" strokeWidth="1" />
              <circle cx="110" cy="85" r="3.5" fill="#F5A623" />
              <circle cx="136" cy="85" r="3.5" fill="#22D3EE" />
            </svg>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#152035] text-xs">
            <div>
              <span className="block text-[#7E93B0]">جهد الطور الثلاثي</span>
              <span className="font-mono-tech font-semibold text-[#F5A623]" dir="ltr">
                380 V
              </span>
            </div>
            <div>
              <span className="block text-[#7E93B0]">جهد الطور الأحادي</span>
              <span className="font-mono-tech font-semibold text-[#22D3EE]" dir="ltr">
                220 V
              </span>
            </div>
            <div>
              <span className="block text-[#7E93B0]">الحد المسموح للهبوط</span>
              <span className="font-mono-tech font-semibold text-[#E6EDF7]" dir="ltr">
                5.0 %
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Sections Grid */}
      <section aria-labelledby="lab-sections-heading" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#1B283F] pb-4">
          <div>
            <h2 id="lab-sections-heading" className="text-xl sm:text-2xl font-bold text-[#F4F7FB]">
              أقسام المعمل والتجارب الهندسية
            </h2>
            <p className="mt-1 text-sm text-[#8FA3BF]">
              اختر الحاسبة أو التجربة لبدء إدخال المعطيات ومراقبة النتائج والمنحنيات مباشرة.
            </p>
          </div>
          <span className="text-xs font-mono-tech text-[#7E93B0]" dir="ltr">
            3 Interactive Modules
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {LAB_MODULES.map((mod) => {
            const Icon = mod.icon;
            const isAmber = mod.accent === 'amber';
            return (
              <article
                key={mod.id}
                className="group flex flex-col justify-between rounded-xl border border-[#1B283F] bg-[#0B121E] p-6 transition-colors hover:border-[#2B4063]"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-[#8FA3BF]">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono-tech font-semibold ${
                          isAmber ? 'text-[#F5A623]' : 'text-[#22D3EE]'
                        }`}
                      >
                        {mod.index}.
                      </span>
                      <span>{mod.category}</span>
                    </div>
                    <Icon
                      className={`h-4 w-4 ${
                        isAmber ? 'text-[#F5A623]' : 'text-[#22D3EE]'
                      }`}
                    />
                  </div>

                  <h3 className="text-xl font-bold text-[#F4F7FB]">{mod.title}</h3>

                  <p className="text-sm leading-relaxed text-[#9FB1C9]">{mod.description}</p>
                </div>

                <div className="mt-6 space-y-4 pt-4 border-t border-[#152035]">
                  <div className="flex items-center justify-between gap-2 rounded-md bg-[#060A12] border border-[#162238] px-3 py-2">
                    <span className="text-[11px] text-[#7E93B0]">المعادلة</span>
                    <code
                      className={`font-mono-tech text-xs ${
                        isAmber ? 'text-[#F5A623]' : 'text-[#22D3EE]'
                      }`}
                      dir="ltr"
                    >
                      {mod.formulaPreview}
                    </code>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="font-mono-tech text-xs text-[#7E93B0]" dir="ltr">
                      {mod.units}
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate(mod.id)}
                      className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 ${
                        isAmber
                          ? 'bg-[#F5A623] text-[#060A12] hover:bg-[#FBBF24] focus-visible:ring-[#F5A623]'
                          : 'bg-[#22D3EE] text-[#060A12] hover:bg-[#67E8F9] focus-visible:ring-[#22D3EE]'
                      }`}
                    >
                      <span>{mod.actionLabel}</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
