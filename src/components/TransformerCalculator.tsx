import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Plus, Trash2, XCircle } from 'lucide-react';
import {
  NOMINAL_THREE_PHASE_V,
  SAUDI_BREAKER_RATINGS_A,
  TRANSFORMER_PRESETS_KVA,
  breakerAmpsToKva380V,
  calculateTransformerAndMeters,
  formatInt,
  formatNum,
  type LoadingStatus,
  type TransformerInputs,
  type TransformerType,
} from '../calc';

interface TransformerCalculatorProps {
  resetSignal: number;
}

interface BreakerRowState {
  id: string;
  breakerAmps: string;
  count: string;
}

interface RawFormState {
  transformerType: TransformerType;
  presetMode: string;
  customKva: string;
  breakerRows: BreakerRowState[];
  diversityFactor: string;
  maxAllowedLoadingPct: string;
}

const DEFAULT_BREAKER_ROWS: BreakerRowState[] = [
  { id: 'row-100', breakerAmps: '100', count: '10' },
  { id: 'row-150', breakerAmps: '150', count: '2' },
  { id: 'row-200', breakerAmps: '200', count: '1' },
  { id: 'row-300', breakerAmps: '300', count: '0' },
  { id: 'row-400', breakerAmps: '400', count: '0' },
];

const DEFAULT_FORM: RawFormState = {
  transformerType: 'pad-mounted',
  presetMode: '1000',
  customKva: '750',
  breakerRows: DEFAULT_BREAKER_ROWS,
  diversityFactor: '0.6',
  maxAllowedLoadingPct: '80',
};

const PRESET_TYPE_LABELS: Record<number, string> = {
  100: '100 kVA — هوائي (Pole-mounted)',
  200: '200 kVA — هوائي (Pole-mounted)',
  300: '300 kVA — هوائي / أرضي',
  500: '500 kVA — أرضي (Pad-mounted)',
  1000: '1000 kVA — أرضي (Pad-mounted)',
  1500: '1500 kVA — أرضي (Pad-mounted)',
};

function parseField(val: string): number {
  if (val.trim() === '') return NaN;
  return Number(val);
}

function getStatusMeta(status: LoadingStatus, maxAllowed: number) {
  if (status === 'safe') {
    return {
      color: '#10B981',
      textClass: 'text-[#10B981]',
      borderClass: 'border-[#10B981]/35 bg-[#10B981]/10',
      label: 'تحميل آمن (أقل من 70%)',
      Icon: CheckCircle2,
    };
  }
  if (status === 'warning') {
    return {
      color: '#F5A623',
      textClass: 'text-[#F5A623]',
      borderClass: 'border-[#F5A623]/35 bg-[#F5A623]/10',
      label: `ضمن الحد المسموح (70% – ${formatNum(maxAllowed, 0)}%)`,
      Icon: AlertTriangle,
    };
  }
  return {
    color: '#EF4444',
    textClass: 'text-[#EF4444]',
    borderClass: 'border-[#EF4444]/40 bg-[#EF4444]/10',
    label: `تجاوز الحد المسموح (أعلى من ${formatNum(maxAllowed, 0)}%)`,
    Icon: XCircle,
  };
}

export default function TransformerCalculator({ resetSignal }: TransformerCalculatorProps) {
  const [form, setForm] = useState<RawFormState>(DEFAULT_FORM);

  useEffect(() => {
    if (resetSignal > 0) {
      setForm(DEFAULT_FORM);
    }
  }, [resetSignal]);

  const parsedInputs: TransformerInputs = useMemo(() => {
    const transformerKva =
      form.presetMode === 'custom'
        ? parseField(form.customKva)
        : Number(form.presetMode);

    return {
      transformerKva,
      transformerType: form.transformerType,
      breakerGroups: form.breakerRows.map((row) => ({
        id: row.id,
        breakerAmps: parseField(row.breakerAmps),
        count: parseField(row.count),
      })),
      diversityFactor: parseField(form.diversityFactor),
      maxAllowedLoadingPct: parseField(form.maxAllowedLoadingPct),
    };
  }, [form]);

  const result = useMemo(
    () => calculateTransformerAndMeters(parsedInputs),
    [parsedInputs]
  );

  const statusMeta = getStatusMeta(
    result.loadingStatus,
    Number.isFinite(parsedInputs.maxAllowedLoadingPct)
      ? parsedInputs.maxAllowedLoadingPct
      : 80
  );

  // Semicircular gauge math (0% to 120% visual scale)
  const gaugeMaxPct = 120;
  const clampedPct = Math.min(Math.max(result.loadingPercentage, 0), gaugeMaxPct);
  const arcLength = Math.PI * 84;
  const filledArc = (clampedPct / gaugeMaxPct) * arcLength;
  const limitAngleRad =
    Math.PI -
    (Math.min(Math.max(parsedInputs.maxAllowedLoadingPct || 80, 0), gaugeMaxPct) /
      gaugeMaxPct) *
      Math.PI;
  const limitMarkerX = 110 + 84 * Math.cos(limitAngleRad);
  const limitMarkerY = 105 - 84 * Math.sin(limitAngleRad);

  const safeAngleRad = Math.PI - (70 / gaugeMaxPct) * Math.PI;
  const safeMarkerX = 110 + 84 * Math.cos(safeAngleRad);
  const safeMarkerY = 105 - 84 * Math.sin(safeAngleRad);

  const handleSelectType = (type: TransformerType) => {
    setForm((prev) => {
      const currentVal = Number(prev.presetMode);
      let nextPreset = prev.presetMode;
      if (type === 'pole-mounted' && currentVal > 300) {
        nextPreset = '300';
      } else if (type === 'pad-mounted' && currentVal < 300) {
        nextPreset = '500';
      }
      return {
        ...prev,
        transformerType: type,
        presetMode: nextPreset,
      };
    });
  };

  const handleUpdateRow = (id: string, field: 'breakerAmps' | 'count', value: string) => {
    setForm((prev) => ({
      ...prev,
      breakerRows: prev.breakerRows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      ),
    }));
  };

  const handleAddRow = () => {
    const usedAmps = new Set(form.breakerRows.map((r) => Number(r.breakerAmps)));
    const nextStandard =
      SAUDI_BREAKER_RATINGS_A.find((a) => !usedAmps.has(a)) ?? 100;
    setForm((prev) => ({
      ...prev,
      breakerRows: [
        ...prev.breakerRows,
        {
          id: `row-${Date.now()}`,
          breakerAmps: String(nextStandard),
          count: '1',
        },
      ],
    }));
  };

  const handleRemoveRow = (id: string) => {
    setForm((prev) => {
      if (prev.breakerRows.length <= 1) return prev;
      return {
        ...prev,
        breakerRows: prev.breakerRows.filter((r) => r.id !== id),
      };
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
      {/* Page Title & Experiment Note */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#1B283F] pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-[#8FA3BF]">
            <span className="font-mono-tech text-[#F5A623]">01.</span>
            <span>شبكة التوزيع السعودية</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tech" dir="ltr">
              {NOMINAL_THREE_PHASE_V} V 3-Phase / 220 V 1-Phase
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#F4F7FB]">
            حاسبة المحوّل وقواطع العدادات
          </h1>
        </div>

        <div className="inline-flex items-center gap-2 rounded-md border border-[#243654] bg-[#0B121E] px-3.5 py-2 text-xs text-[#22D3EE]">
          <Info className="h-4 w-4 shrink-0" />
          <span>القيم الافتراضية للتجربة فقط</span>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Inputs Panel */}
        <section
          aria-label="مدخلات المحوّل وقواطع العدادات"
          className="lg:col-span-5 rounded-xl border border-[#1B283F] bg-[#0B121E] p-5 sm:p-6 space-y-6"
        >
          {/* Transformer Type Selector */}
          <div className="space-y-2">
            <span className="block text-sm font-semibold text-[#E6EDF7]">
              نوع محوّل التوزيع
            </span>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#060A12] border border-[#162238] p-1">
              <button
                type="button"
                onClick={() => handleSelectType('pad-mounted')}
                className={`rounded-md py-2 px-3 text-xs font-semibold transition-colors ${
                  form.transformerType === 'pad-mounted'
                    ? 'bg-[#F5A623] text-[#060A12]'
                    : 'text-[#9FB1C9] hover:text-[#E6EDF7]'
                }`}
              >
                أرضي (Pad-mounted)
              </button>
              <button
                type="button"
                onClick={() => handleSelectType('pole-mounted')}
                className={`rounded-md py-2 px-3 text-xs font-semibold transition-colors ${
                  form.transformerType === 'pole-mounted'
                    ? 'bg-[#F5A623] text-[#060A12]'
                    : 'text-[#9FB1C9] hover:text-[#E6EDF7]'
                }`}
              >
                هوائي (Pole-mounted)
              </button>
            </div>
            <p className="text-[11px] text-[#7E93B0]">
              {form.transformerType === 'pole-mounted'
                ? 'المحوّلات الهوائية القياسية عادةً بسعات 100 – 300 kVA.'
                : 'المحوّلات الأرضية المدمجة عادةً بسعات 300 – 1500 kVA.'}
            </p>
          </div>

          {/* Transformer Capacity */}
          <div className="space-y-2.5">
            <label
              htmlFor="transformer-rating"
              className="flex items-center justify-between text-sm font-semibold text-[#E6EDF7]"
            >
              <span>قدرة المحوّل القياسية</span>
              <span className="font-mono-tech text-xs text-[#7E93B0]" dir="ltr">
                kVA
              </span>
            </label>

            <select
              id="transformer-rating"
              value={form.presetMode}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, presetMode: e.target.value }))
              }
              className="w-full rounded-md border border-[#243654] bg-[#060A12] px-3.5 py-2.5 text-sm text-[#E6EDF7] focus:border-[#F5A623] focus:outline-none"
            >
              {TRANSFORMER_PRESETS_KVA.map((kva) => (
                <option key={kva} value={String(kva)}>
                  {PRESET_TYPE_LABELS[kva] ?? `${kva} kVA`}
                </option>
              ))}
              <option value="custom">قيمة مخصصة (Custom kVA)</option>
            </select>

            {form.presetMode === 'custom' && (
              <div className="space-y-1.5">
                <label
                  htmlFor="custom-transformer-kva"
                  className="block text-xs text-[#9FB1C9]"
                >
                  أدخل قدرة المحوّل المخصصة (kVA)
                </label>
                <input
                  id="custom-transformer-kva"
                  type="number"
                  min="1"
                  step="any"
                  dir="ltr"
                  value={form.customKva}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, customKva: e.target.value }))
                  }
                  className="w-full rounded-md border border-[#243654] bg-[#060A12] px-3.5 py-2 text-sm font-mono-tech text-[#F5A623] focus:border-[#F5A623] focus:outline-none"
                />
              </div>
            )}
          </div>

          <hr className="border-[#152035]" />

          {/* Saudi Meter Breaker Ratings */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[#E6EDF7]">
                  سعات قواطع العدادات (3-Phase 380V)
                </h2>
                <p className="text-[11px] text-[#7E93B0]">
                  اختر سعة القاطع بالأمبير (A) وأدخل عدد العدادات لكل مقاس
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1 rounded-md border border-[#243654] bg-[#060A12] px-2.5 py-1.5 text-xs font-medium text-[#22D3EE] hover:border-[#22D3EE]/60 transition-colors shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>إضافة سعة</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {form.breakerRows.map((row, idx) => {
                const ampsNum = parseField(row.breakerAmps);
                const countNum = parseField(row.count);
                const kvaPerMeter = breakerAmpsToKva380V(ampsNum);
                const rowKva =
                  Number.isFinite(countNum) && countNum > 0
                    ? countNum * kvaPerMeter
                    : 0;
                const isStandard = (SAUDI_BREAKER_RATINGS_A as readonly number[]).includes(
                  ampsNum
                );

                return (
                  <div
                    key={row.id}
                    className="rounded-lg border border-[#162238] bg-[#060A12] p-3 space-y-2"
                  >
                    <div className="grid grid-cols-12 gap-2.5 items-end">
                      <div className="col-span-6">
                        <label
                          htmlFor={`breaker-${row.id}`}
                          className="block text-[11px] text-[#7E93B0] mb-1"
                        >
                          سعة القاطع (A)
                        </label>
                        <select
                          id={`breaker-${row.id}`}
                          value={isStandard ? String(ampsNum) : row.breakerAmps}
                          onChange={(e) =>
                            handleUpdateRow(row.id, 'breakerAmps', e.target.value)
                          }
                          dir="ltr"
                          className="w-full rounded border border-[#223352] bg-[#0B121E] px-2.5 py-1.5 text-sm font-mono-tech text-[#E6EDF7] focus:border-[#F5A623] focus:outline-none"
                        >
                          {SAUDI_BREAKER_RATINGS_A.map((a) => (
                            <option key={a} value={String(a)}>
                              {a} A
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-4">
                        <label
                          htmlFor={`count-${row.id}`}
                          className="block text-[11px] text-[#7E93B0] mb-1"
                        >
                          عدد العدادات
                        </label>
                        <input
                          id={`count-${row.id}`}
                          type="number"
                          min="0"
                          step="1"
                          dir="ltr"
                          value={row.count}
                          onChange={(e) =>
                            handleUpdateRow(row.id, 'count', e.target.value)
                          }
                          className="w-full rounded border border-[#223352] bg-[#0B121E] px-2.5 py-1.5 text-sm font-mono-tech text-[#F5A623] focus:border-[#F5A623] focus:outline-none"
                        />
                      </div>

                      <div className="col-span-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.id)}
                          disabled={form.breakerRows.length <= 1}
                          aria-label={`حذف الصف ${idx + 1}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#1E2B45] text-[#7E93B0] hover:border-[#EF4444]/50 hover:text-[#EF4444] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div
                      className="flex items-center justify-between text-[11px] text-[#8FA3BF] pt-1 border-t border-[#121B2E]"
                      dir="ltr"
                    >
                      <span>
                        1 Meter = {formatNum(kvaPerMeter, 2)} kVA
                      </span>
                      <span className="font-mono-tech text-[#22D3EE]">
                        Total: {formatNum(rowKva, 2)} kVA
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <hr className="border-[#152035]" />

          {/* Diversity Factor & Max Loading % */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="diversity-factor"
                className="flex items-center justify-between text-xs font-medium text-[#E6EDF7]"
              >
                <span>معامل التزامن (DF)</span>
                <span className="font-mono-tech text-[#7E93B0]" dir="ltr">
                  0.1 – 1.0
                </span>
              </label>
              <input
                id="diversity-factor"
                type="number"
                min="0.05"
                max="1"
                step="0.05"
                dir="ltr"
                value={form.diversityFactor}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, diversityFactor: e.target.value }))
                }
                className="w-full rounded-md border border-[#243654] bg-[#060A12] px-3 py-2 text-sm font-mono-tech text-[#22D3EE] focus:border-[#22D3EE] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="max-loading-pct"
                className="flex items-center justify-between text-xs font-medium text-[#E6EDF7]"
              >
                <span>الحد الأقصى للتحميل</span>
                <span className="font-mono-tech text-[#7E93B0]" dir="ltr">
                  %
                </span>
              </label>
              <input
                id="max-loading-pct"
                type="number"
                min="1"
                max="100"
                step="1"
                dir="ltr"
                value={form.maxAllowedLoadingPct}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, maxAllowedLoadingPct: e.target.value }))
                }
                className="w-full rounded-md border border-[#243654] bg-[#060A12] px-3 py-2 text-sm font-mono-tech text-[#F5A623] focus:border-[#F5A623] focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* Results & Gauge Column */}
        <section
          aria-label="نتائج المحوّل والعدادات"
          className="lg:col-span-7 space-y-6"
        >
          {/* Validation Errors */}
          {!result.isValid && (
            <div
              role="alert"
              className="rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/10 p-5 space-y-2"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-[#EF4444]">
                <XCircle className="h-5 w-5 shrink-0" />
                <span>تحقق من صحة المدخلات</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-[#FCA5A5]">
                {result.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Gauge & Primary Readout Card */}
          <div className="rounded-xl border border-[#1B283F] bg-[#0B121E] p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#152035] pb-4">
              <div>
                <h2 className="text-base font-bold text-[#F4F7FB]">
                  مؤشر تحميل المحوّل والقدرة الفعلية
                </h2>
                <p className="text-xs text-[#8FA3BF]">
                  {form.transformerType === 'pad-mounted'
                    ? 'محوّل أرضي (Pad-mounted)'
                    : 'محوّل هوائي (Pole-mounted)'}{' '}
                  ·{' '}
                  <span className="font-mono-tech" dir="ltr">
                    {Number.isFinite(parsedInputs.transformerKva)
                      ? `${formatInt(parsedInputs.transformerKva)} kVA`
                      : '—'}{' '}
                    @ {NOMINAL_THREE_PHASE_V} V
                  </span>
                </p>
              </div>
              {result.isValid && (
                <div
                  className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold ${statusMeta.borderClass} ${statusMeta.textClass}`}
                >
                  <statusMeta.Icon className="h-4 w-4 shrink-0" />
                  <span>{statusMeta.label}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Semicircular SVG Gauge */}
              <div className="md:col-span-6 flex flex-col items-center justify-center rounded-lg border border-[#162238] bg-[#060A12] p-4">
                <svg
                  viewBox="0 0 220 130"
                  className="w-full max-w-[260px]"
                  role="img"
                  aria-label={`مؤشر نسبة تحميل المحول ${formatNum(result.loadingPercentage, 1)} بالمئة`}
                >
                  <path
                    d="M 26 105 A 84 84 0 0 1 194 105"
                    fill="none"
                    stroke="#18243A"
                    strokeWidth="14"
                    strokeLinecap="round"
                  />

                  {result.isValid && (
                    <path
                      d="M 26 105 A 84 84 0 0 1 194 105"
                      fill="none"
                      stroke={statusMeta.color}
                      strokeWidth="14"
                      strokeLinecap="round"
                      strokeDasharray={`${filledArc} ${arcLength}`}
                    />
                  )}

                  <circle cx={safeMarkerX} cy={safeMarkerY} r="3.5" fill="#10B981" />
                  <circle cx={limitMarkerX} cy={limitMarkerY} r="4" fill="#EF4444" />

                  <text
                    x="110"
                    y="82"
                    textAnchor="middle"
                    className="font-mono-tech font-bold"
                    fill={result.isValid ? statusMeta.color : '#64748B'}
                    fontSize="26"
                  >
                    {result.isValid ? `${formatNum(result.loadingPercentage, 1)}%` : '—'}
                  </text>
                  <text
                    x="110"
                    y="102"
                    textAnchor="middle"
                    fill="#8FA3BF"
                    fontSize="10"
                  >
                    نسبة التحميل الحالية
                  </text>

                  <text x="20" y="124" textAnchor="middle" fill="#64748B" fontSize="10" className="font-mono-tech">
                    0%
                  </text>
                  <text x="110" y="12" textAnchor="middle" fill="#64748B" fontSize="10" className="font-mono-tech">
                    60%
                  </text>
                  <text x="196" y="124" textAnchor="middle" fill="#64748B" fontSize="10" className="font-mono-tech">
                    120%
                  </text>
                </svg>

                <div className="mt-2 flex items-center gap-4 text-[11px] text-[#8FA3BF]">
                  <span>أخضر &lt; 70%</span>
                  <span aria-hidden="true">·</span>
                  <span>الحد المسموح {formatNum(parsedInputs.maxAllowedLoadingPct || 80, 0)}%</span>
                </div>
              </div>

              {/* 4 Key KPI Tiles */}
              <div className="md:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="rounded-lg border border-[#162238] bg-[#060A12] p-4">
                  <span className="block text-xs text-[#8FA3BF]">الحمل الكلي المتصل</span>
                  <div className="mt-1.5 flex items-baseline gap-1.5" dir="ltr">
                    <span className="font-mono-tech text-2xl font-bold text-[#E6EDF7]">
                      {result.isValid ? formatNum(result.totalConnectedLoadKva, 1) : '—'}
                    </span>
                    <span className="font-mono-tech text-xs text-[#7E93B0]">kVA</span>
                  </div>
                  <span className="mt-1 block text-[11px] text-[#7E93B0]" dir="ltr">
                    Σ Amps: {result.isValid ? `${formatInt(result.totalConnectedAmps)} A` : '—'}
                  </span>
                </div>

                <div className="rounded-lg border border-[#162238] bg-[#060A12] p-4">
                  <span className="block text-xs text-[#8FA3BF]">الطلب بعد التزامن</span>
                  <div className="mt-1.5 flex items-baseline gap-1.5" dir="ltr">
                    <span className="font-mono-tech text-2xl font-bold text-[#F5A623]">
                      {result.isValid ? formatNum(result.diversifiedDemandKva, 1) : '—'}
                    </span>
                    <span className="font-mono-tech text-xs text-[#7E93B0]">kVA</span>
                  </div>
                </div>

                <div className="rounded-lg border border-[#162238] bg-[#060A12] p-4">
                  <span className="block text-xs text-[#8FA3BF]">
                    تيار المحوّل عند {NOMINAL_THREE_PHASE_V} V
                  </span>
                  <div className="mt-1.5 flex items-baseline gap-1.5" dir="ltr">
                    <span className="font-mono-tech text-2xl font-bold text-[#22D3EE]">
                      {result.isValid ? formatNum(result.fullLoadSecondaryCurrentA, 1) : '—'}
                    </span>
                    <span className="font-mono-tech text-xs text-[#7E93B0]">A</span>
                  </div>
                  <span className="mt-1 block text-[11px] text-[#7E93B0]" dir="ltr">
                    Demand: {result.isValid ? `${formatNum(result.demandSecondaryCurrentA, 1)} A` : '—'}
                  </span>
                </div>

                <div className="rounded-lg border border-[#162238] bg-[#060A12] p-4">
                  <span className="block text-xs text-[#8FA3BF]">أقصى عدد عدادات</span>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="font-mono-tech text-2xl font-bold text-[#E6EDF7]" dir="ltr">
                      {result.isValid ? formatInt(result.maxMetersWeighted) : '—'}
                    </span>
                    <span className="text-xs text-[#7E93B0]">عداد (بالمزيج)</span>
                  </div>
                  <span className="mt-1 block text-[11px] text-[#7E93B0]">
                    الحالي: <span className="font-mono-tech">{formatInt(result.totalMeters)}</span> عداد
                  </span>
                </div>
              </div>
            </div>

            {/* Standard Saudi Breaker Capacity Table */}
            {result.isValid && (
              <div className="space-y-2.5 pt-4 border-t border-[#152035]">
                <h3 className="text-xs font-semibold text-[#9FB1C9]">
                  أقصى عدد عدادات يستوعبها المحوّل في حال توحيد سعة القاطع (عند {NOMINAL_THREE_PHASE_V} V):
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                  {result.standardSizeCapacities.map((item) => (
                    <div
                      key={item.breakerAmps}
                      className="rounded-md bg-[#060A12] border border-[#162238] p-2.5 text-center space-y-1"
                    >
                      <span className="block font-mono-tech font-semibold text-[#22D3EE]" dir="ltr">
                        {item.breakerAmps} A
                      </span>
                      <span className="block font-mono-tech text-base font-bold text-[#E6EDF7]">
                        {formatInt(item.maxMeters)} عداد
                      </span>
                      <span className="block font-mono-tech text-[10px] text-[#7E93B0]" dir="ltr">
                        ({formatNum(item.kvaPerMeter, 1)} kVA)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Step-by-Step Arabic Explanation */}
          {result.isValid && (
            <div className="rounded-xl border border-[#1B283F] bg-[#0B121E] p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#152035] pb-3">
                <h2 className="text-base font-bold text-[#F4F7FB]">
                  خطوات الحساب التفصيلية
                </h2>
                <span className="font-mono-tech text-xs text-[#7E93B0]" dir="ltr">
                  S_allowed = {formatNum(result.allowedCapacityKva, 1)} kVA
                </span>
              </div>

              <div className="space-y-3">
                {result.steps.map((step, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-[#162238] bg-[#060A12] p-4 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#E6EDF7]">
                        {step.title}
                      </span>
                      <span
                        className="font-mono-tech text-sm font-bold text-[#F5A623]"
                        dir="ltr"
                      >
                        {step.resultText}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#8FA3BF] pt-1">
                      <code className="font-mono-tech text-[#22D3EE]" dir="ltr">
                        {step.formula}
                      </code>
                      <span className="font-mono-tech text-[#9FB1C9]" dir="ltr">
                        = {step.substitution}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
