import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import {
  STANDARD_CABLE_SIZES_MM2,
  calculateVoltageDrop,
  formatNum,
  type ConductorMaterial,
  type PhaseSystem,
} from '../calc';

interface VoltageDropLabProps {
  resetSignal: number;
}

interface RawDropState {
  currentA: string;
  lengthM: string;
  cableSizeMm2: string;
  material: ConductorMaterial;
  phase: PhaseSystem;
}

const DEFAULT_DROP_STATE: RawDropState = {
  currentA: '85',
  lengthM: '120',
  cableSizeMm2: '35',
  material: 'copper',
  phase: 'three',
};

export default function VoltageDropLab({ resetSignal }: VoltageDropLabProps) {
  const [form, setForm] = useState<RawDropState>(DEFAULT_DROP_STATE);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (resetSignal > 0) {
      setForm(DEFAULT_DROP_STATE);
      setHoverIndex(null);
    }
  }, [resetSignal]);

  const parsedCurrent = form.currentA.trim() === '' ? NaN : Number(form.currentA);
  const parsedLength = form.lengthM.trim() === '' ? NaN : Number(form.lengthM);
  const parsedSize = form.cableSizeMm2.trim() === '' ? NaN : Number(form.cableSizeMm2);

  const result = useMemo(
    () =>
      calculateVoltageDrop({
        currentA: parsedCurrent,
        lengthM: parsedLength,
        cableSizeMm2: parsedSize,
        material: form.material,
        phase: form.phase,
      }),
    [parsedCurrent, parsedLength, parsedSize, form.material, form.phase]
  );

  // Closest standard size index for the cable size slider
  const sizeSliderIdx = useMemo(() => {
    const val = Number.isFinite(parsedSize) ? parsedSize : 35;
    let bestIdx = 0;
    let bestDiff = Infinity;
    STANDARD_CABLE_SIZES_MM2.forEach((sz, idx) => {
      const diff = Math.abs(sz - val);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = idx;
      }
    });
    return bestIdx;
  }, [parsedSize]);

  // SVG Chart dimensions
  const chartW = 640;
  const chartH = 290;
  const padL = 54;
  const padR = 24;
  const padT = 24;
  const padB = 42;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const chartMeta = useMemo(() => {
    if (!result.isValid || result.curvePoints.length === 0) {
      return null;
    }
    const pts = result.curvePoints;
    const maxLen = pts[pts.length - 1].lengthM || 200;
    const rawMaxPct = Math.max(8, pts[pts.length - 1].dropPct * 1.12);
    const maxPct = Math.ceil(rawMaxPct);

    const toX = (len: number) => padL + (len / maxLen) * plotW;
    const toY = (pct: number) => padT + plotH - (Math.min(pct, maxPct) / maxPct) * plotH;

    const polylinePoints = pts.map((p) => `${toX(p.lengthM)},${toY(p.dropPct)}`).join(' ');
    const areaPath = `M ${toX(0)},${toY(0)} ${pts
      .map((p) => `L ${toX(p.lengthM)},${toY(p.dropPct)}`)
      .join(' ')} L ${toX(maxLen)},${toY(0)} Z`;

    const limitY = toY(5);
    const activeX = toX(parsedLength);
    const activeY = toY(result.voltageDropPct);

    return {
      pts,
      maxLen,
      maxPct,
      toX,
      toY,
      polylinePoints,
      areaPath,
      limitY,
      activeX,
      activeY,
    };
  }, [result, parsedLength, plotW, plotH]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#1B283F] pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-[#8FA3BF]">
            <span className="font-mono-tech text-[#22D3EE]">02.</span>
            <span>تجربة هبوط الجهد في الكيبل</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tech" dir="ltr">
              ΔV Limit ≤ 5%
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#F4F7FB]">
            هبوط الجهد في الكيبل الكهربائي
          </h1>
        </div>

        <div className="text-xs font-mono-tech text-[#8FA3BF]" dir="ltr">
          ρ_Cu = 0.0225 · ρ_Al = 0.036 Ω·mm²/m
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Panel */}
        <section
          aria-label="متغيرات تجربة الكيبل"
          className="lg:col-span-5 rounded-xl border border-[#1B283F] bg-[#0B121E] p-5 sm:p-6 space-y-6"
        >
          {/* Phase Selector */}
          <div className="space-y-2">
            <span className="block text-sm font-semibold text-[#E6EDF7]">نظام الطور</span>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#060A12] border border-[#162238] p-1">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, phase: 'single' }))}
                className={`rounded-md py-2 px-3 text-xs font-semibold transition-colors ${
                  form.phase === 'single'
                    ? 'bg-[#22D3EE] text-[#060A12]'
                    : 'text-[#9FB1C9] hover:text-[#E6EDF7]'
                }`}
              >
                أحادي الطور (220 V)
              </button>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, phase: 'three' }))}
                className={`rounded-md py-2 px-3 text-xs font-semibold transition-colors ${
                  form.phase === 'three'
                    ? 'bg-[#22D3EE] text-[#060A12]'
                    : 'text-[#9FB1C9] hover:text-[#E6EDF7]'
                }`}
              >
                ثلاثي الطور (380 V)
              </button>
            </div>
          </div>

          {/* Material Selector */}
          <div className="space-y-2">
            <span className="block text-sm font-semibold text-[#E6EDF7]">مادة الموصل</span>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#060A12] border border-[#162238] p-1">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, material: 'copper' }))}
                className={`rounded-md py-2 px-3 text-xs font-semibold transition-colors ${
                  form.material === 'copper'
                    ? 'bg-[#F5A623] text-[#060A12]'
                    : 'text-[#9FB1C9] hover:text-[#E6EDF7]'
                }`}
              >
                نحاس (Copper)
              </button>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, material: 'aluminium' }))}
                className={`rounded-md py-2 px-3 text-xs font-semibold transition-colors ${
                  form.material === 'aluminium'
                    ? 'bg-[#F5A623] text-[#060A12]'
                    : 'text-[#9FB1C9] hover:text-[#E6EDF7]'
                }`}
              >
                ألمنيوم (Aluminium)
              </button>
            </div>
          </div>

          <hr className="border-[#152035]" />

          {/* Current Slider + Numeric Input */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="drop-current" className="text-sm font-semibold text-[#E6EDF7]">
                التيار الكهربائي (I)
              </label>
              <div className="flex items-center gap-1.5" dir="ltr">
                <input
                  id="drop-current"
                  type="number"
                  min="1"
                  max="1000"
                  step="any"
                  value={form.currentA}
                  onChange={(e) => setForm((p) => ({ ...p, currentA: e.target.value }))}
                  className="w-24 rounded border border-[#243654] bg-[#060A12] px-2.5 py-1 text-right text-sm font-mono-tech text-[#F5A623] focus:border-[#F5A623] focus:outline-none"
                />
                <span className="font-mono-tech text-xs text-[#7E93B0]">A</span>
              </div>
            </div>
            <input
              type="range"
              aria-label="منزلق التيار الكهربائي"
              min="1"
              max="500"
              step="1"
              value={Number.isFinite(parsedCurrent) ? Math.min(Math.max(parsedCurrent, 1), 500) : 1}
              onChange={(e) => setForm((p) => ({ ...p, currentA: e.target.value }))}
              className="lab-slider w-full"
            />
            <div className="flex justify-between text-[11px] font-mono-tech text-[#64748B]" dir="ltr">
              <span>1 A</span>
              <span>250 A</span>
              <span>500 A</span>
            </div>
          </div>

          {/* Length Slider + Numeric Input */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="drop-length" className="text-sm font-semibold text-[#E6EDF7]">
                طول الكيبل (L)
              </label>
              <div className="flex items-center gap-1.5" dir="ltr">
                <input
                  id="drop-length"
                  type="number"
                  min="1"
                  max="2000"
                  step="any"
                  value={form.lengthM}
                  onChange={(e) => setForm((p) => ({ ...p, lengthM: e.target.value }))}
                  className="w-24 rounded border border-[#243654] bg-[#060A12] px-2.5 py-1 text-right text-sm font-mono-tech text-[#22D3EE] focus:border-[#22D3EE] focus:outline-none"
                />
                <span className="font-mono-tech text-xs text-[#7E93B0]">m</span>
              </div>
            </div>
            <input
              type="range"
              aria-label="منزلق طول الكيبل"
              min="1"
              max="500"
              step="1"
              value={Number.isFinite(parsedLength) ? Math.min(Math.max(parsedLength, 1), 500) : 1}
              onChange={(e) => setForm((p) => ({ ...p, lengthM: e.target.value }))}
              className="lab-slider lab-slider-cyan w-full"
            />
            <div className="flex justify-between text-[11px] font-mono-tech text-[#64748B]" dir="ltr">
              <span>1 m</span>
              <span>250 m</span>
              <span>500 m</span>
            </div>
          </div>

          {/* Cable Size Slider + Numeric Input */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="drop-size" className="text-sm font-semibold text-[#E6EDF7]">
                مقطع الكيبل (A)
              </label>
              <div className="flex items-center gap-1.5" dir="ltr">
                <input
                  id="drop-size"
                  type="number"
                  min="0.5"
                  step="any"
                  value={form.cableSizeMm2}
                  onChange={(e) => setForm((p) => ({ ...p, cableSizeMm2: e.target.value }))}
                  className="w-24 rounded border border-[#243654] bg-[#060A12] px-2.5 py-1 text-right text-sm font-mono-tech text-[#E6EDF7] focus:border-[#F5A623] focus:outline-none"
                />
                <span className="font-mono-tech text-xs text-[#7E93B0]">mm²</span>
              </div>
            </div>
            <input
              type="range"
              aria-label="منزلق مقطع الكيبل القياسي"
              min="0"
              max={STANDARD_CABLE_SIZES_MM2.length - 1}
              step="1"
              value={sizeSliderIdx}
              onChange={(e) => {
                const chosen = STANDARD_CABLE_SIZES_MM2[Number(e.target.value)];
                setForm((p) => ({ ...p, cableSizeMm2: String(chosen) }));
              }}
              className="lab-slider w-full"
            />
            <div className="flex justify-between text-[11px] font-mono-tech text-[#64748B]" dir="ltr">
              <span>1.5 mm²</span>
              <span>35 mm²</span>
              <span>300 mm²</span>
            </div>
          </div>
        </section>

        {/* Live Telemetry & Chart Column */}
        <section
          aria-label="نتائج ومنحنى هبوط الجهد"
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
                <span>خطأ في المدخلات</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-[#FCA5A5]">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 5% Warning Banner */}
          {result.isValid && result.isExceedingLimit && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-[#EF4444]/50 bg-[#EF4444]/12 p-4 text-[#FCA5A5]"
            >
              <AlertTriangle className="h-5 w-5 text-[#EF4444] shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="font-bold text-[#EF4444]">
                  تحذير: هبوط الجهد تجاوز الحد المسموح (5%)
                </p>
                <p>
                  الهبوط الحالي{' '}
                  <span className="font-mono-tech font-bold text-[#F4F7FB]" dir="ltr">
                    {formatNum(result.voltageDropPct, 2)} %
                  </span>{' '}
                  يتعدى المعيار الهندسي. يُنصح بزيادة مقطع الكيبل أو تقليل الطول إلى أقل من{' '}
                  <span className="font-mono-tech font-bold text-[#F4F7FB]" dir="ltr">
                    {formatNum(result.maxSafeLengthM, 1)} m
                  </span>
                  .
                </p>
              </div>
            </div>
          )}

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="rounded-xl border border-[#1B283F] bg-[#0B121E] p-4">
              <span className="block text-xs text-[#8FA3BF]">هبوط الجهد (V)</span>
              <div className="mt-1.5 flex items-baseline gap-1.5" dir="ltr">
                <span className="font-mono-tech text-2xl font-bold text-[#F5A623]">
                  {result.isValid ? formatNum(result.voltageDropV, 2) : '—'}
                </span>
                <span className="font-mono-tech text-xs text-[#7E93B0]">V</span>
              </div>
            </div>

            <div className="rounded-xl border border-[#1B283F] bg-[#0B121E] p-4">
              <span className="block text-xs text-[#8FA3BF]">نسبة الهبوط (%)</span>
              <div className="mt-1.5 flex items-baseline gap-1.5" dir="ltr">
                <span
                  className={`font-mono-tech text-2xl font-bold ${
                    !result.isValid
                      ? 'text-[#64748B]'
                      : result.isExceedingLimit
                      ? 'text-[#EF4444]'
                      : 'text-[#10B981]'
                  }`}
                >
                  {result.isValid ? formatNum(result.voltageDropPct, 2) : '—'}
                </span>
                <span className="font-mono-tech text-xs text-[#7E93B0]">%</span>
              </div>
            </div>

            <div className="rounded-xl border border-[#1B283F] bg-[#0B121E] p-4">
              <span className="block text-xs text-[#8FA3BF]">الجهد عند الحمل</span>
              <div className="mt-1.5 flex items-baseline gap-1.5" dir="ltr">
                <span className="font-mono-tech text-2xl font-bold text-[#22D3EE]">
                  {result.isValid ? formatNum(result.receivingVoltageV, 1) : '—'}
                </span>
                <span className="font-mono-tech text-xs text-[#7E93B0]">V</span>
              </div>
            </div>

            <div className="rounded-xl border border-[#1B283F] bg-[#0B121E] p-4">
              <span className="block text-xs text-[#8FA3BF]">أقصى طول آمن (5%)</span>
              <div className="mt-1.5 flex items-baseline gap-1.5" dir="ltr">
                <span className="font-mono-tech text-2xl font-bold text-[#E6EDF7]">
                  {result.isValid ? formatNum(result.maxSafeLengthM, 1) : '—'}
                </span>
                <span className="font-mono-tech text-xs text-[#7E93B0]">m</span>
              </div>
            </div>
          </div>

          {/* Live Oscilloscope Chart: Drop vs Length */}
          <div className="rounded-xl border border-[#1B283F] bg-[#0B121E] p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#152035] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#F4F7FB]">
                  منحنى هبوط الجهد مقابل طول الكيبل
                </h2>
                <p className="text-xs text-[#8FA3BF]">
                  مرر المؤشر على الرسم لقراءة الهبوط بدقة عند أي مسافة
                </p>
              </div>
              {result.isValid && (
                <div
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                    result.isExceedingLimit ? 'text-[#EF4444]' : 'text-[#10B981]'
                  }`}
                >
                  {result.isExceedingLimit ? (
                    <>
                      <XCircle className="h-4 w-4" />
                      <span>خارج النطاق المسموح</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>ضمن النطاق الآمن (≤ 5%)</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {chartMeta ? (
              <div className="relative rounded-lg border border-[#162238] bg-[#060A12] p-3">
                <svg
                  viewBox={`0 0 ${chartW} ${chartH}`}
                  className="w-full h-auto cursor-crosshair select-none"
                  role="img"
                  aria-label="رسم بياني يوضح تغير نسبة هبوط الجهد مع تغير طول الكيبل"
                  onMouseLeave={() => setHoverIndex(null)}
                >
                  <defs>
                    <linearGradient id="dropAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={result.isExceedingLimit ? '#EF4444' : '#22D3EE'}
                        stopOpacity="0.28"
                      />
                      <stop
                        offset="100%"
                        stopColor={result.isExceedingLimit ? '#EF4444' : '#22D3EE'}
                        stopOpacity="0.02"
                      />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Y-grid ticks */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const pctVal = chartMeta.maxPct * ratio;
                    const y = chartMeta.toY(pctVal);
                    return (
                      <g key={idx}>
                        <line
                          x1={padL}
                          y1={y}
                          x2={chartW - padR}
                          y2={y}
                          stroke="#162238"
                          strokeWidth="1"
                        />
                        <text
                          x={padL - 8}
                          y={y + 4}
                          textAnchor="end"
                          fill="#7E93B0"
                          fontSize="11"
                          className="font-mono-tech"
                        >
                          {formatNum(pctVal, 1)}%
                        </text>
                      </g>
                    );
                  })}

                  {/* Vertical X-grid ticks */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const lenVal = chartMeta.maxLen * ratio;
                    const x = chartMeta.toX(lenVal);
                    return (
                      <g key={idx}>
                        <line
                          x1={x}
                          y1={padT}
                          x2={x}
                          y2={chartH - padB}
                          stroke="#162238"
                          strokeWidth="1"
                        />
                        <text
                          x={x}
                          y={chartH - padB + 18}
                          textAnchor="middle"
                          fill="#7E93B0"
                          fontSize="11"
                          className="font-mono-tech"
                        >
                          {Math.round(lenVal)} m
                        </text>
                      </g>
                    );
                  })}

                  {/* 5% Danger Limit Line */}
                  {chartMeta.maxPct >= 5 && (
                    <g>
                      <line
                        x1={padL}
                        y1={chartMeta.limitY}
                        x2={chartW - padR}
                        y2={chartMeta.limitY}
                        stroke="#EF4444"
                        strokeWidth="1.5"
                        strokeDasharray="6 4"
                      />
                      <text
                        x={chartW - padR - 6}
                        y={chartMeta.limitY - 6}
                        textAnchor="end"
                        fill="#EF4444"
                        fontSize="11"
                        className="font-mono-tech font-semibold"
                      >
                        5.0% Limit
                      </text>
                    </g>
                  )}

                  {/* Area under curve */}
                  <path d={chartMeta.areaPath} fill="url(#dropAreaGrad)" />

                  {/* Main Voltage Drop Curve */}
                  <polyline
                    fill="none"
                    stroke={result.isExceedingLimit ? '#EF4444' : '#22D3EE'}
                    strokeWidth="2.5"
                    points={chartMeta.polylinePoints}
                  />

                  {/* Current Operating Point */}
                  <line
                    x1={chartMeta.activeX}
                    y1={padT}
                    x2={chartMeta.activeX}
                    y2={chartH - padB}
                    stroke="#F5A623"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx={chartMeta.activeX}
                    cy={chartMeta.activeY}
                    r="5.5"
                    fill="#F5A623"
                    stroke="#060A12"
                    strokeWidth="2"
                  />

                  {/* Interactive Hover Targets */}
                  {chartMeta.pts.map((pt, idx) => {
                    const cx = chartMeta.toX(pt.lengthM);
                    const cy = chartMeta.toY(pt.dropPct);
                    const sliceW = plotW / chartMeta.pts.length;
                    return (
                      <g key={idx}>
                        {hoverIndex === idx && (
                          <>
                            <line
                              x1={cx}
                              y1={padT}
                              x2={cx}
                              y2={chartH - padB}
                              stroke="#E6EDF7"
                              strokeOpacity="0.4"
                              strokeWidth="1"
                            />
                            <circle cx={cx} cy={cy} r="4.5" fill="#E6EDF7" />
                          </>
                        )}
                        <rect
                          x={cx - sliceW / 2}
                          y={padT}
                          width={sliceW}
                          height={plotH}
                          fill="transparent"
                          onMouseEnter={() => setHoverIndex(idx)}
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Crosshair Readout Bar */}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#152035] pt-2.5 text-xs text-[#9FB1C9]">
                  {hoverIndex !== null && chartMeta.pts[hoverIndex] ? (
                    <div className="flex items-center gap-4 font-mono-tech" dir="ltr">
                      <span className="text-[#E6EDF7]">
                        L = {formatNum(chartMeta.pts[hoverIndex].lengthM, 0)} m
                      </span>
                      <span className="text-[#22D3EE]">
                        ΔV = {formatNum(chartMeta.pts[hoverIndex].dropV, 2)} V
                      </span>
                      <span
                        className={
                          chartMeta.pts[hoverIndex].dropPct > 5
                            ? 'text-[#EF4444]'
                            : 'text-[#10B981]'
                        }
                      >
                        {formatNum(chartMeta.pts[hoverIndex].dropPct, 2)} %
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 font-mono-tech" dir="ltr">
                      <span className="text-[#F5A623]">
                        Active: L = {formatNum(parsedLength, 0)} m
                      </span>
                      <span className="text-[#E6EDF7]">
                        ΔV = {formatNum(result.voltageDropV, 2)} V ({formatNum(result.voltageDropPct, 2)}%)
                      </span>
                    </div>
                  )}

                  <span className="font-mono-tech text-[11px] text-[#7E93B0]" dir="ltr">
                    V_nom = {result.nominalVoltageV} V
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex h-56 items-center justify-center rounded-lg border border-[#162238] bg-[#060A12] text-sm text-[#7E93B0]">
                أدخل قيماً صحيحة موجبة لعرض منحنى هبوط الجهد.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
