import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { calculatePowerFactorCorrection, formatNum } from '../calc';

interface PowerFactorLabProps {
  resetSignal: number;
}

interface RawPfState {
  activePowerKw: string;
  currentPf: string;
  targetPf: string;
}

const DEFAULT_PF_STATE: RawPfState = {
  activePowerKw: '250',
  currentPf: '0.72',
  targetPf: '0.95',
};

export default function PowerFactorLab({ resetSignal }: PowerFactorLabProps) {
  const [form, setForm] = useState<RawPfState>(DEFAULT_PF_STATE);

  useEffect(() => {
    if (resetSignal > 0) {
      setForm(DEFAULT_PF_STATE);
    }
  }, [resetSignal]);

  const parsedP = form.activePowerKw.trim() === '' ? NaN : Number(form.activePowerKw);
  const parsedPf1 = form.currentPf.trim() === '' ? NaN : Number(form.currentPf);
  const parsedPf2 = form.targetPf.trim() === '' ? NaN : Number(form.targetPf);

  const result = useMemo(
    () =>
      calculatePowerFactorCorrection({
        activePowerKw: parsedP,
        currentPf: parsedPf1,
        targetPf: parsedPf2,
      }),
    [parsedP, parsedPf1, parsedPf2]
  );

  // Power Triangle SVG Geometry
  const svgW = 620;
  const svgH = 330;
  const originX = 74;
  const originY = 278;
  const maxDrawW = 390;
  const maxDrawH = 220;

  const triangleGeom = useMemo(() => {
    if (!result.isValid) return null;

    // Keep P proportional and scale Q1 relative to P, capping vertical height cleanly
    const ratioQ1ToP = result.q1Kvar / parsedP;
    const ratioQ2ToP = result.q2Kvar / parsedP;

    let baseW = maxDrawW;
    let h1 = baseW * ratioQ1ToP;
    if (h1 > maxDrawH) {
      const scale = maxDrawH / h1;
      baseW = baseW * scale;
      h1 = maxDrawH;
    }
    // Ensure a minimum readable base width
    baseW = Math.max(baseW, 130);
    const h2 = baseW * ratioQ2ToP;

    const rightX = originX + baseW;
    const top1Y = originY - h1;
    const top2Y = originY - h2;

    // Arc paths for angles phi1 and phi2
    const arcRadius1 = Math.min(54, baseW * 0.28);
    const arcRadius2 = Math.min(34, baseW * 0.18);
    const phi1Rad = (result.phi1Deg * Math.PI) / 180;
    const phi2Rad = (result.phi2Deg * Math.PI) / 180;

    const arc1EndX = originX + arcRadius1 * Math.cos(phi1Rad);
    const arc1EndY = originY - arcRadius1 * Math.sin(phi1Rad);

    const arc2EndX = originX + arcRadius2 * Math.cos(phi2Rad);
    const arc2EndY = originY - arcRadius2 * Math.sin(phi2Rad);

    return {
      baseW,
      h1,
      h2,
      rightX,
      top1Y,
      top2Y,
      arcRadius1,
      arcRadius2,
      arc1EndX,
      arc1EndY,
      arc2EndX,
      arc2EndY,
    };
  }, [result, parsedP]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#1B283F] pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-[#8FA3BF]">
            <span className="font-mono-tech text-[#F5A623]">03.</span>
            <span>تجربة تحسين معامل القدرة</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tech" dir="ltr">
              Qc = P × (tan φ₁ − tan φ₂)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#F4F7FB]">
            تحسين معامل القدرة ومثلث القدرة
          </h1>
        </div>

        <div className="text-xs font-mono-tech text-[#8FA3BF]" dir="ltr">
          kW · kVAR · kVA
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Inputs Panel */}
        <section
          aria-label="مدخلات معامل القدرة"
          className="lg:col-span-5 rounded-xl border border-[#1B283F] bg-[#0B121E] p-5 sm:p-6 space-y-6"
        >
          {/* Active Power P */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="pf-power" className="text-sm font-semibold text-[#E6EDF7]">
                القدرة الفعّالة (P)
              </label>
              <div className="flex items-center gap-1.5" dir="ltr">
                <input
                  id="pf-power"
                  type="number"
                  min="1"
                  step="any"
                  value={form.activePowerKw}
                  onChange={(e) => setForm((p) => ({ ...p, activePowerKw: e.target.value }))}
                  className="w-24 rounded border border-[#243654] bg-[#060A12] px-2.5 py-1 text-right text-sm font-mono-tech text-[#F5A623] focus:border-[#F5A623] focus:outline-none"
                />
                <span className="font-mono-tech text-xs text-[#7E93B0]">kW</span>
              </div>
            </div>
            <input
              type="range"
              aria-label="منزلق القدرة الفعالة"
              min="10"
              max="2000"
              step="10"
              value={Number.isFinite(parsedP) ? Math.min(Math.max(parsedP, 10), 2000) : 10}
              onChange={(e) => setForm((p) => ({ ...p, activePowerKw: e.target.value }))}
              className="lab-slider w-full"
            />
            <div className="flex justify-between text-[11px] font-mono-tech text-[#64748B]" dir="ltr">
              <span>10 kW</span>
              <span>1000 kW</span>
              <span>2000 kW</span>
            </div>
          </div>

          <hr className="border-[#152035]" />

          {/* Current PF */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="pf-current" className="text-sm font-semibold text-[#E6EDF7]">
                معامل القدرة الحالي (cos φ₁)
              </label>
              <input
                id="pf-current"
                type="number"
                min="0.1"
                max="1"
                step="0.01"
                dir="ltr"
                value={form.currentPf}
                onChange={(e) => setForm((p) => ({ ...p, currentPf: e.target.value }))}
                className="w-24 rounded border border-[#243654] bg-[#060A12] px-2.5 py-1 text-right text-sm font-mono-tech text-[#22D3EE] focus:border-[#22D3EE] focus:outline-none"
              />
            </div>
            <input
              type="range"
              aria-label="منزلق معامل القدرة الحالي"
              min="0.3"
              max="0.99"
              step="0.01"
              value={Number.isFinite(parsedPf1) ? Math.min(Math.max(parsedPf1, 0.3), 0.99) : 0.72}
              onChange={(e) => setForm((p) => ({ ...p, currentPf: e.target.value }))}
              className="lab-slider lab-slider-cyan w-full"
            />
            <div className="flex justify-between text-[11px] font-mono-tech text-[#64748B]" dir="ltr">
              <span>0.30</span>
              <span>0.65</span>
              <span>0.99</span>
            </div>
          </div>

          {/* Target PF */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="pf-target" className="text-sm font-semibold text-[#E6EDF7]">
                معامل القدرة المستهدف (cos φ₂)
              </label>
              <input
                id="pf-target"
                type="number"
                min="0.1"
                max="1"
                step="0.01"
                dir="ltr"
                value={form.targetPf}
                onChange={(e) => setForm((p) => ({ ...p, targetPf: e.target.value }))}
                className="w-24 rounded border border-[#243654] bg-[#060A12] px-2.5 py-1 text-right text-sm font-mono-tech text-[#10B981] focus:border-[#10B981] focus:outline-none"
              />
            </div>
            <input
              type="range"
              aria-label="منزلق معامل القدرة المستهدف"
              min="0.5"
              max="1"
              step="0.01"
              value={Number.isFinite(parsedPf2) ? Math.min(Math.max(parsedPf2, 0.5), 1) : 0.95}
              onChange={(e) => setForm((p) => ({ ...p, targetPf: e.target.value }))}
              className="lab-slider w-full"
            />
            <div className="flex justify-between text-[11px] font-mono-tech text-[#64748B]" dir="ltr">
              <span>0.50</span>
              <span>0.85</span>
              <span>1.00</span>
            </div>
          </div>

          {/* Capacitor Result Focal Card */}
          <div className="rounded-lg border border-[#F5A623]/35 bg-[#060A12] p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#F5A623]">سعة المكثفات المطلوبة (Qc)</span>
              <span className="font-mono-tech text-[#7E93B0]" dir="ltr">
                Capacitor Bank
              </span>
            </div>
            <div className="flex items-baseline gap-2" dir="ltr">
              <span className="font-mono-tech text-3xl font-bold text-[#F5A623]">
                {result.isValid ? formatNum(result.requiredCapacitorKvar, 2) : '—'}
              </span>
              <span className="font-mono-tech text-sm text-[#9FB1C9]">kVAR</span>
            </div>
            {result.isValid && (
              <p className="text-xs text-[#9FB1C9]">
                يوفر هذا التحسين{' '}
                <span className="font-mono-tech font-semibold text-[#10B981]" dir="ltr">
                  {formatNum(result.savedApparentKva, 2)} kVA
                </span>{' '}
                من السعة الظاهرية بنسبة{' '}
                <span className="font-mono-tech font-semibold text-[#10B981]" dir="ltr">
                  {formatNum(result.savedApparentPct, 1)}%
                </span>
                .
              </p>
            )}
          </div>
        </section>

        {/* Power Triangle Visualization & Metrics */}
        <section
          aria-label="مثلث القدرة والنتائج"
          className="lg:col-span-7 space-y-6"
        >
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

          {/* Power Triangle Chart Card */}
          <div className="rounded-xl border border-[#1B283F] bg-[#0B121E] p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#152035] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#F4F7FB]">
                  مثلث القدرة الكهربائي (Power Triangle)
                </h2>
                <p className="text-xs text-[#8FA3BF]">
                  مقارنة القدرة التفاعلية والظاهرية قبل وبعد إضافة مكثفات التعويض
                </p>
              </div>
              {result.isValid && (
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#10B981]">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>تعويض فعّال</span>
                </div>
              )}
            </div>

            {triangleGeom && result.isValid ? (
              <div className="rounded-lg border border-[#162238] bg-[#060A12] p-3">
                <svg
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  className="w-full h-auto"
                  role="img"
                  aria-label="رسم مثلث القدرة قبل وبعد تحسين معامل القدرة"
                >
                  <defs>
                    <marker
                      id="capArrow"
                      markerWidth="8"
                      markerHeight="8"
                      refX="4"
                      refY="4"
                      orient="auto"
                    >
                      <path d="M0,1 L7,4 L0,7 Z" fill="#F5A623" />
                    </marker>
                  </defs>

                  {/* Subtle Oscilloscope Grid */}
                  <g stroke="#121C2E" strokeWidth="1">
                    {[60, 120, 180, 240].map((y) => (
                      <line key={`hy-${y}`} x1="30" y1={y} x2={svgW - 20} y2={y} />
                    ))}
                    {[120, 220, 320, 420, 520].map((x) => (
                      <line key={`vx-${x}`} x1={x} y1="20" x2={x} y2={svgH - 25} />
                    ))}
                  </g>

                  {/* Initial Triangle Fill */}
                  <polygon
                    points={`${originX},${originY} ${triangleGeom.rightX},${originY} ${triangleGeom.rightX},${triangleGeom.top1Y}`}
                    fill="#22D3EE"
                    fillOpacity="0.06"
                  />

                  {/* Corrected Triangle Fill */}
                  <polygon
                    points={`${originX},${originY} ${triangleGeom.rightX},${originY} ${triangleGeom.rightX},${triangleGeom.top2Y}`}
                    fill="#10B981"
                    fillOpacity="0.1"
                  />

                  {/* Base: Active Power P (Amber) */}
                  <line
                    x1={originX}
                    y1={originY}
                    x2={triangleGeom.rightX}
                    y2={originY}
                    stroke="#F5A623"
                    strokeWidth="3"
                  />

                  {/* Vertical Q2 (Emerald) */}
                  {triangleGeom.h2 > 1 && (
                    <line
                      x1={triangleGeom.rightX}
                      y1={originY}
                      x2={triangleGeom.rightX}
                      y2={triangleGeom.top2Y}
                      stroke="#10B981"
                      strokeWidth="2.5"
                    />
                  )}

                  {/* Vertical Qc compensation segment (Amber dashed + arrow) */}
                  {triangleGeom.h1 - triangleGeom.h2 > 6 && (
                    <line
                      x1={triangleGeom.rightX}
                      y1={triangleGeom.top1Y}
                      x2={triangleGeom.rightX}
                      y2={triangleGeom.top2Y + 4}
                      stroke="#F5A623"
                      strokeWidth="2.5"
                      strokeDasharray="5 3"
                      markerEnd="url(#capArrow)"
                    />
                  )}

                  {/* Hypotenuse S1 (Initial Apparent Power - Cyan) */}
                  <line
                    x1={originX}
                    y1={originY}
                    x2={triangleGeom.rightX}
                    y2={triangleGeom.top1Y}
                    stroke="#22D3EE"
                    strokeWidth="2.5"
                    strokeDasharray="6 4"
                  />

                  {/* Hypotenuse S2 (Target Apparent Power - Emerald) */}
                  <line
                    x1={originX}
                    y1={originY}
                    x2={triangleGeom.rightX}
                    y2={triangleGeom.top2Y}
                    stroke="#10B981"
                    strokeWidth="2.8"
                  />

                  {/* Angle Arc phi1 */}
                  {result.phi1Deg > 2 && (
                    <path
                      d={`M ${originX + triangleGeom.arcRadius1} ${originY} A ${triangleGeom.arcRadius1} ${triangleGeom.arcRadius1} 0 0 0 ${triangleGeom.arc1EndX} ${triangleGeom.arc1EndY}`}
                      fill="none"
                      stroke="#22D3EE"
                      strokeWidth="1.5"
                    />
                  )}

                  {/* Angle Arc phi2 */}
                  {result.phi2Deg > 2 && (
                    <path
                      d={`M ${originX + triangleGeom.arcRadius2} ${originY} A ${triangleGeom.arcRadius2} ${triangleGeom.arcRadius2} 0 0 0 ${triangleGeom.arc2EndX} ${triangleGeom.arc2EndY}`}
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="1.5"
                    />
                  )}

                  {/* Right Angle Square */}
                  <polyline
                    points={`${triangleGeom.rightX - 12},${originY} ${triangleGeom.rightX - 12},${originY - 12} ${triangleGeom.rightX},${originY - 12}`}
                    fill="none"
                    stroke="#64748B"
                    strokeWidth="1.2"
                  />

                  {/* Labels */}
                  <text
                    x={(originX + triangleGeom.rightX) / 2}
                    y={originY + 24}
                    textAnchor="middle"
                    fill="#F5A623"
                    fontSize="13"
                    className="font-mono-tech font-semibold"
                  >
                    P = {formatNum(parsedP, 1)} kW
                  </text>

                  {/* S1 Label */}
                  <text
                    x={(originX + triangleGeom.rightX) / 2 - 26}
                    y={(originY + triangleGeom.top1Y) / 2 - 12}
                    textAnchor="middle"
                    fill="#22D3EE"
                    fontSize="12"
                    className="font-mono-tech font-semibold"
                  >
                    S₁ = {formatNum(result.s1Kva, 1)} kVA
                  </text>

                  {/* S2 Label */}
                  <text
                    x={(originX + triangleGeom.rightX) / 2 + 12}
                    y={(originY + triangleGeom.top2Y) / 2 + 18}
                    textAnchor="middle"
                    fill="#10B981"
                    fontSize="12"
                    className="font-mono-tech font-semibold"
                  >
                    S₂ = {formatNum(result.s2Kva, 1)} kVA
                  </text>

                  {/* Qc Label on the right side of the vertical leg */}
                  {triangleGeom.h1 - triangleGeom.h2 > 8 && (
                    <text
                      x={triangleGeom.rightX + 14}
                      y={(triangleGeom.top1Y + triangleGeom.top2Y) / 2 + 4}
                      textAnchor="start"
                      fill="#F5A623"
                      fontSize="12"
                      className="font-mono-tech font-bold"
                    >
                      Qc = {formatNum(result.requiredCapacitorKvar, 1)} kVAR
                    </text>
                  )}

                  {/* Q2 Label */}
                  {triangleGeom.h2 > 14 && (
                    <text
                      x={triangleGeom.rightX + 14}
                      y={(originY + triangleGeom.top2Y) / 2 + 4}
                      textAnchor="start"
                      fill="#10B981"
                      fontSize="12"
                      className="font-mono-tech"
                    >
                      Q₂ = {formatNum(result.q2Kvar, 1)} kVAR
                    </text>
                  )}

                  {/* Angles summary inside top-left */}
                  <text
                    x="28"
                    y="38"
                    fill="#22D3EE"
                    fontSize="12"
                    className="font-mono-tech"
                  >
                    φ₁ = {formatNum(result.phi1Deg, 1)}°
                  </text>
                  <text
                    x="28"
                    y="58"
                    fill="#10B981"
                    fontSize="12"
                    className="font-mono-tech"
                  >
                    φ₂ = {formatNum(result.phi2Deg, 1)}°
                  </text>
                </svg>

                {/* Legend */}
                <div className="mt-2 flex flex-wrap items-center gap-4 border-t border-[#152035] pt-3 text-xs text-[#9FB1C9]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-xs bg-[#F5A623]" />
                    <span>القدرة الفعالة P والمكثف Qc</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-xs bg-[#22D3EE]" />
                    <span>القدرة قبل التحسين (S₁, Q₁)</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-xs bg-[#10B981]" />
                    <span>القدرة بعد التحسين (S₂, Q₂)</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-lg border border-[#162238] bg-[#060A12] text-sm text-[#7E93B0]">
                أدخل قيماً صحيحة لعرض مثلث القدرة.
              </div>
            )}
          </div>

          {/* Comparative KPI Grid */}
          {result.isValid && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="rounded-xl border border-[#1B283F] bg-[#0B121E] p-4">
                <span className="block text-xs text-[#8FA3BF]">Q₁ قبل التحسين</span>
                <div className="mt-1.5 flex items-baseline gap-1.5" dir="ltr">
                  <span className="font-mono-tech text-xl font-bold text-[#22D3EE]">
                    {formatNum(result.q1Kvar, 1)}
                  </span>
                  <span className="font-mono-tech text-xs text-[#7E93B0]">kVAR</span>
                </div>
              </div>

              <div className="rounded-xl border border-[#1B283F] bg-[#0B121E] p-4">
                <span className="block text-xs text-[#8FA3BF]">Q₂ بعد التحسين</span>
                <div className="mt-1.5 flex items-baseline gap-1.5" dir="ltr">
                  <span className="font-mono-tech text-xl font-bold text-[#10B981]">
                    {formatNum(result.q2Kvar, 1)}
                  </span>
                  <span className="font-mono-tech text-xs text-[#7E93B0]">kVAR</span>
                </div>
              </div>

              <div className="rounded-xl border border-[#1B283F] bg-[#0B121E] p-4">
                <span className="block text-xs text-[#8FA3BF]">S₁ الظاهرية قبل</span>
                <div className="mt-1.5 flex items-baseline gap-1.5" dir="ltr">
                  <span className="font-mono-tech text-xl font-bold text-[#22D3EE]">
                    {formatNum(result.s1Kva, 1)}
                  </span>
                  <span className="font-mono-tech text-xs text-[#7E93B0]">kVA</span>
                </div>
              </div>

              <div className="rounded-xl border border-[#1B283F] bg-[#0B121E] p-4">
                <span className="block text-xs text-[#8FA3BF]">S₂ الظاهرية بعد</span>
                <div className="mt-1.5 flex items-baseline gap-1.5" dir="ltr">
                  <span className="font-mono-tech text-xl font-bold text-[#10B981]">
                    {formatNum(result.s2Kva, 1)}
                  </span>
                  <span className="font-mono-tech text-xs text-[#7E93B0]">kVA</span>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
