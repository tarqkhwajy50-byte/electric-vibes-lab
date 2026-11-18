/**
 * Pure electrical engineering calculation functions for Electric Vibes Lab.
 * Calibrated to Saudi distribution network standards (380 V 3-phase / 220 V 1-phase).
 * All numeric outputs use Western digits (0-9).
 */

export const NOMINAL_THREE_PHASE_V = 380;
export const NOMINAL_SINGLE_PHASE_V = 220;

export type TransformerType = 'pad-mounted' | 'pole-mounted';

export const TRANSFORMER_PRESETS_KVA = [100, 200, 300, 500, 1000, 1500] as const;

export const SAUDI_BREAKER_RATINGS_A = [
  30, 50, 60, 70, 100, 125, 150, 200, 250, 300, 400, 500, 600, 800,
] as const;

export const STANDARD_CABLE_SIZES_MM2 = [
  1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300,
] as const;

export type ConductorMaterial = 'copper' | 'aluminium';
export type PhaseSystem = 'single' | 'three';
export type LoadingStatus = 'safe' | 'warning' | 'overload';

export interface BreakerGroupInput {
  id: string;
  label?: string;
  breakerAmps: number;
  count: number;
}

export interface TransformerInputs {
  transformerKva: number;
  transformerType: TransformerType;
  breakerGroups: BreakerGroupInput[];
  diversityFactor: number;
  maxAllowedLoadingPct: number;
}

export interface BreakerGroupBreakdown {
  id: string;
  breakerAmps: number;
  count: number;
  kvaPerMeter: number;
  totalKva: number;
  maxMetersOnlyAtThisSize: number;
}

export interface TransformerCalculationStep {
  title: string;
  formula: string;
  substitution: string;
  resultText: string;
}

export interface TransformerResult {
  isValid: boolean;
  errors: string[];
  groupBreakdowns: BreakerGroupBreakdown[];
  totalMeters: number;
  totalConnectedAmps: number;
  totalConnectedLoadKva: number;
  diversifiedDemandKva: number;
  loadingPercentage: number;
  loadingStatus: LoadingStatus;
  maxMetersWeighted: number;
  standardSizeCapacities: { breakerAmps: number; kvaPerMeter: number; maxMeters: number }[];
  fullLoadSecondaryCurrentA: number;
  demandSecondaryCurrentA: number;
  allowedCapacityKva: number;
  steps: TransformerCalculationStep[];
}

export interface VoltageDropInputs {
  currentA: number;
  lengthM: number;
  cableSizeMm2: number;
  material: ConductorMaterial;
  phase: PhaseSystem;
}

export interface VoltageDropPoint {
  lengthM: number;
  dropV: number;
  dropPct: number;
}

export interface VoltageDropResult {
  isValid: boolean;
  errors: string[];
  nominalVoltageV: number;
  resistivityOhmMm2PerM: number;
  voltageDropV: number;
  voltageDropPct: number;
  receivingVoltageV: number;
  isExceedingLimit: boolean;
  maxSafeLengthM: number;
  curvePoints: VoltageDropPoint[];
}

export interface PowerFactorInputs {
  activePowerKw: number;
  currentPf: number;
  targetPf: number;
}

export interface PowerFactorResult {
  isValid: boolean;
  errors: string[];
  phi1Deg: number;
  phi2Deg: number;
  q1Kvar: number;
  q2Kvar: number;
  s1Kva: number;
  s2Kva: number;
  requiredCapacitorKvar: number;
  savedApparentKva: number;
  savedApparentPct: number;
  currentReductionPct: number;
}

/**
 * Formats numbers using Western digits (0-9) with fixed decimal places.
 */
export function formatNum(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Formats integer counts using Western digits (0-9).
 */
export function formatInt(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return Math.round(value).toLocaleString('en-US');
}

/**
 * Converts a 3-phase 380 V meter/breaker rating (Amperes) into apparent power (kVA):
 * S_meter = (√3 × 380 × I_breaker) / 1000  [kVA]
 */
export function breakerAmpsToKva380V(breakerAmps: number): number {
  if (!Number.isFinite(breakerAmps) || breakerAmps <= 0) return 0;
  return (Math.sqrt(3) * NOMINAL_THREE_PHASE_V * breakerAmps) / 1000;
}

/**
 * Transformer & Saudi Meter Breakers Calculations (3-Phase 380 V):
 * 1) Meter Apparent Power from Breaker Rating (A) at 380 V:
 *    S_meter = (√3 × 380 × I_breaker) / 1000  [kVA]
 * 2) Total Connected Load:
 *    S_connected = Σ (N_i × S_meter_i)  [kVA]
 * 3) Diversified Demand:
 *    S_demand = S_connected × DF  [kVA]
 * 4) Transformer Loading Percentage:
 *    Loading_% = (S_demand / S_transformer) × 100  [%]
 * 5) Allowed Transformer Demand:
 *    S_allowed = S_transformer × (Max_Allowed_% / 100)  [kVA]
 * 6) Maximum Number of Meters (weighted average meter load):
 *    L_avg = S_connected / Total_Meters  [kVA/meter]
 *    Max_Meters = floor((S_allowed / DF) / L_avg)
 * 7) Full-Load Secondary Current at 380 V (Three-Phase):
 *    I = (S_transformer × 1000) / (√3 × 380)  [A]
 */
export function calculateTransformerAndMeters(inputs: TransformerInputs): TransformerResult {
  const errors: string[] = [];

  if (!Number.isFinite(inputs.transformerKva) || inputs.transformerKva <= 0) {
    errors.push('قدرة المحوّل يجب أن تكون قيمة موجبة أكبر من صفر (kVA).');
  }
  if (!Number.isFinite(inputs.diversityFactor) || inputs.diversityFactor <= 0 || inputs.diversityFactor > 1) {
    errors.push('معامل التزامن (DF) يجب أن يكون أكبر من 0 ولا يتجاوز 1.');
  }
  if (
    !Number.isFinite(inputs.maxAllowedLoadingPct) ||
    inputs.maxAllowedLoadingPct <= 0 ||
    inputs.maxAllowedLoadingPct > 100
  ) {
    errors.push('نسبة التحميل القصوى المسموح بها يجب أن تكون بين 1% و 100%.');
  }

  if (inputs.breakerGroups.length === 0) {
    errors.push('يجب إضافة فئة واحدة على الأقل من قواطع العدادات.');
  }

  inputs.breakerGroups.forEach((group, idx) => {
    if (!Number.isFinite(group.breakerAmps) || group.breakerAmps <= 0) {
      errors.push(`سعة القاطع في الصف رقم ${idx + 1} يجب أن تكون أكبر من صفر (A).`);
    }
    if (!Number.isFinite(group.count) || group.count < 0) {
      errors.push(`عدد العدادات للقاطع ${group.breakerAmps || idx + 1} A لا يمكن أن يكون قيمة سالبة.`);
    }
  });

  const totalMeters = inputs.breakerGroups.reduce(
    (sum, g) => sum + (Number.isFinite(g.count) && g.count > 0 ? g.count : 0),
    0
  );

  if (totalMeters <= 0 && errors.length === 0) {
    errors.push('يجب إدخال عداد واحد على الأقل في إحدى سعات القواطع لحساب التحميل.');
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
      groupBreakdowns: [],
      totalMeters: 0,
      totalConnectedAmps: 0,
      totalConnectedLoadKva: 0,
      diversifiedDemandKva: 0,
      loadingPercentage: 0,
      loadingStatus: 'safe',
      maxMetersWeighted: 0,
      standardSizeCapacities: [],
      fullLoadSecondaryCurrentA: 0,
      demandSecondaryCurrentA: 0,
      allowedCapacityKva: 0,
      steps: [],
    };
  }

  // Allowed transformer capacity: S_allowed = S_transformer × (maxAllowedLoadingPct / 100)
  const allowedCapacityKva = inputs.transformerKva * (inputs.maxAllowedLoadingPct / 100);

  // Max connected load allowed before diversity: S_max_connected = S_allowed / DF
  const maxConnectedAllowedKva = allowedCapacityKva / inputs.diversityFactor;

  const groupBreakdowns: BreakerGroupBreakdown[] = inputs.breakerGroups.map((g) => {
    // S_meter = (√3 × 380 × I_breaker) / 1000
    const kvaPerMeter = breakerAmpsToKva380V(g.breakerAmps);
    const totalKva = g.count * kvaPerMeter;
    const maxMetersOnlyAtThisSize = Math.floor(maxConnectedAllowedKva / kvaPerMeter);
    return {
      id: g.id,
      breakerAmps: g.breakerAmps,
      count: g.count,
      kvaPerMeter,
      totalKva,
      maxMetersOnlyAtThisSize,
    };
  });

  const totalConnectedAmps = inputs.breakerGroups.reduce(
    (sum, g) => sum + g.count * g.breakerAmps,
    0
  );

  // Total connected load: S_connected = Σ (N_i × S_meter_i)
  const totalConnectedLoadKva = groupBreakdowns.reduce((sum, b) => sum + b.totalKva, 0);

  // Diversified demand: S_demand = S_connected × DF
  const diversifiedDemandKva = totalConnectedLoadKva * inputs.diversityFactor;

  // Transformer loading %: Loading_% = (S_demand / S_transformer) × 100
  const loadingPercentage = (diversifiedDemandKva / inputs.transformerKva) * 100;

  let loadingStatus: LoadingStatus = 'safe';
  if (loadingPercentage > inputs.maxAllowedLoadingPct) {
    loadingStatus = 'overload';
  } else if (loadingPercentage >= 70) {
    loadingStatus = 'warning';
  }

  // Weighted average load per meter: L_avg = S_connected / Total_Meters
  const averageLoadPerMeterKva = totalConnectedLoadKva / totalMeters;
  const maxMetersWeighted = Math.floor(maxConnectedAllowedKva / averageLoadPerMeterKva);

  // Standard Saudi breaker sizes capacity table (100A, 150A, 200A, 300A, 400A)
  const referenceSizes = [100, 150, 200, 300, 400];
  const standardSizeCapacities = referenceSizes.map((amps) => {
    const kvaPerMeter = breakerAmpsToKva380V(amps);
    return {
      breakerAmps: amps,
      kvaPerMeter,
      maxMeters: Math.floor(maxConnectedAllowedKva / kvaPerMeter),
    };
  });

  // Full-load secondary current at 380 V: I = (S × 1000) / (√3 × 380)
  const fullLoadSecondaryCurrentA =
    (inputs.transformerKva * 1000) / (Math.sqrt(3) * NOMINAL_THREE_PHASE_V);
  const demandSecondaryCurrentA =
    (diversifiedDemandKva * 1000) / (Math.sqrt(3) * NOMINAL_THREE_PHASE_V);

  const activeSummaryTerms = groupBreakdowns
    .filter((b) => b.count > 0)
    .map((b) => `(${formatInt(b.count)} × ${formatNum(b.kvaPerMeter, 2)})`)
    .join(' + ');

  const steps: TransformerCalculationStep[] = [
    {
      title: '1. تحويل سعة قاطع العداد (A) إلى قدرة ظاهرية عند جهد 380 V ثلاثي الطور',
      formula: 'S_meter = (√3 × 380 × I_breaker) / 1000',
      substitution: groupBreakdowns
        .filter((b) => b.count > 0)
        .map((b) => `${formatInt(b.breakerAmps)}A → ${formatNum(b.kvaPerMeter, 2)} kVA`)
        .join(' ، '),
      resultText: `${formatInt(totalMeters)} عداد`,
    },
    {
      title: '2. حساب الحمل الكلي المتصل (Connected Load)',
      formula: 'S_connected = Σ (N_i × S_meter_i)',
      substitution: activeSummaryTerms || '0',
      resultText: `${formatNum(totalConnectedLoadKva, 2)} kVA`,
    },
    {
      title: '3. تطبيق معامل التزامن لحساب الطلب الفعلي (Diversified Demand)',
      formula: 'S_demand = S_connected × DF',
      substitution: `${formatNum(totalConnectedLoadKva, 2)} × ${formatNum(inputs.diversityFactor, 2)}`,
      resultText: `${formatNum(diversifiedDemandKva, 2)} kVA`,
    },
    {
      title: '4. حساب نسبة تحميل المحوّل (Transformer Loading %)',
      formula: 'Loading_% = (S_demand / S_transformer) × 100',
      substitution: `(${formatNum(diversifiedDemandKva, 2)} / ${formatNum(inputs.transformerKva, 0)}) × 100`,
      resultText: `${formatNum(loadingPercentage, 2)} %`,
    },
    {
      title: '5. حساب تيار الجانب الثانوي الكامل عند 380 V',
      formula: 'I = (S_transformer × 1000) / (√3 × 380)',
      substitution: `(${formatNum(inputs.transformerKva, 0)} × 1000) / (1.732 × 380)`,
      resultText: `${formatNum(fullLoadSecondaryCurrentA, 2)} A`,
    },
    {
      title: '6. أقصى عدد عدادات يتحمله المحوّل وفق نسبة التحميل المسموحة',
      formula: 'Max_Meters = floor((S_transformer × Limit% / DF) / L_avg)',
      substitution: `floor((${formatNum(allowedCapacityKva, 1)} / ${formatNum(inputs.diversityFactor, 2)}) / ${formatNum(averageLoadPerMeterKva, 2)})`,
      resultText: `${formatInt(maxMetersWeighted)} عداد`,
    },
  ];

  return {
    isValid: true,
    errors: [],
    groupBreakdowns,
    totalMeters,
    totalConnectedAmps,
    totalConnectedLoadKva,
    diversifiedDemandKva,
    loadingPercentage,
    loadingStatus,
    maxMetersWeighted,
    standardSizeCapacities,
    fullLoadSecondaryCurrentA,
    demandSecondaryCurrentA,
    allowedCapacityKva,
    steps,
  };
}

/**
 * Cable Voltage Drop Calculation (Saudi Distribution Standards):
 * Conductor resistivity at operating temperature (~70°C):
 *   - Copper:    ρ = 0.0225 Ω·mm²/m
 *   - Aluminium: ρ = 0.0360 Ω·mm²/m
 *
 * Single-phase (V_n = 220 V):
 *   ΔV = (2 × L × I × ρ) / A
 *
 * Three-phase (V_n = 380 V):
 *   ΔV = (√3 × L × I × ρ) / A
 *
 * Percentage Drop:
 *   ΔV_% = (ΔV / V_n) × 100
 */
export function calculateVoltageDrop(inputs: VoltageDropInputs): VoltageDropResult {
  const errors: string[] = [];

  if (!Number.isFinite(inputs.currentA) || inputs.currentA <= 0) {
    errors.push('قيمة التيار الكهربائي يجب أن تكون أكبر من صفر (A).');
  }
  if (!Number.isFinite(inputs.lengthM) || inputs.lengthM <= 0) {
    errors.push('طول الكيبل يجب أن يكون أكبر من صفر (m).');
  }
  if (!Number.isFinite(inputs.cableSizeMm2) || inputs.cableSizeMm2 <= 0) {
    errors.push('مقطع الكيبل يجب أن يكون أكبر من صفر (mm²).');
  }

  const nominalVoltageV =
    inputs.phase === 'single' ? NOMINAL_SINGLE_PHASE_V : NOMINAL_THREE_PHASE_V;
  const resistivityOhmMm2PerM = inputs.material === 'copper' ? 0.0225 : 0.036;

  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
      nominalVoltageV,
      resistivityOhmMm2PerM,
      voltageDropV: 0,
      voltageDropPct: 0,
      receivingVoltageV: nominalVoltageV,
      isExceedingLimit: false,
      maxSafeLengthM: 0,
      curvePoints: [],
    };
  }

  const phaseFactor = inputs.phase === 'single' ? 2 : Math.sqrt(3);

  // ΔV = (k × L × I × ρ) / A
  const voltageDropV =
    (phaseFactor * inputs.lengthM * inputs.currentA * resistivityOhmMm2PerM) / inputs.cableSizeMm2;

  // ΔV_% = (ΔV / V_n) × 100
  const voltageDropPct = (voltageDropV / nominalVoltageV) * 100;
  const receivingVoltageV = Math.max(0, nominalVoltageV - voltageDropV);

  // Max safe length at 5% limit: L_max = (0.05 × V_n × A) / (k × I × ρ)
  const maxSafeLengthM =
    (0.05 * nominalVoltageV * inputs.cableSizeMm2) /
    (phaseFactor * inputs.currentA * resistivityOhmMm2PerM);

  const maxChartLength = Math.max(200, Math.ceil((inputs.lengthM * 1.4) / 50) * 50);
  const curvePoints = generateVoltageDropCurve(
    { ...inputs, lengthM: maxChartLength },
    10
  );

  return {
    isValid: true,
    errors: [],
    nominalVoltageV,
    resistivityOhmMm2PerM,
    voltageDropV,
    voltageDropPct,
    receivingVoltageV,
    isExceedingLimit: voltageDropPct > 5,
    maxSafeLengthM,
    curvePoints,
  };
}

/**
 * Generates voltage drop curve points from L = 0 to inputs.lengthM.
 * Formula per point: ΔV(L) = (k × L × I × ρ) / A
 */
export function generateVoltageDropCurve(
  inputs: VoltageDropInputs,
  steps = 10
): VoltageDropPoint[] {
  const nominalVoltageV =
    inputs.phase === 'single' ? NOMINAL_SINGLE_PHASE_V : NOMINAL_THREE_PHASE_V;
  const resistivity = inputs.material === 'copper' ? 0.0225 : 0.036;
  const phaseFactor = inputs.phase === 'single' ? 2 : Math.sqrt(3);

  const points: VoltageDropPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const l = (inputs.lengthM * i) / steps;
    const dropV = (phaseFactor * l * inputs.currentA * resistivity) / inputs.cableSizeMm2;
    const dropPct = (dropV / nominalVoltageV) * 100;
    points.push({ lengthM: l, dropV, dropPct });
  }
  return points;
}

/**
 * Power Factor Correction Calculation:
 * 1) Phase Angles:
 *    φ₁ = arccos(PF_current)
 *    φ₂ = arccos(PF_target)
 * 2) Reactive Power Before & After:
 *    Q₁ = P × tan(φ₁)  [kVAR]
 *    Q₂ = P × tan(φ₂)  [kVAR]
 * 3) Apparent Power Before & After:
 *    S₁ = P / PF_current  [kVA]
 *    S₂ = P / PF_target   [kVA]
 * 4) Required Capacitor Bank:
 *    Q_c = Q₁ - Q₂ = P × (tan(φ₁) - tan(φ₂))  [kVAR]
 */
export function calculatePowerFactorCorrection(inputs: PowerFactorInputs): PowerFactorResult {
  const errors: string[] = [];

  if (!Number.isFinite(inputs.activePowerKw) || inputs.activePowerKw <= 0) {
    errors.push('القدرة الفعّالة (P) يجب أن تكون أكبر من صفر (kW).');
  }
  if (!Number.isFinite(inputs.currentPf) || inputs.currentPf <= 0 || inputs.currentPf > 1) {
    errors.push('معامل القدرة الحالي يجب أن يكون أكبر من 0 وأقل من أو يساوي 1.');
  }
  if (!Number.isFinite(inputs.targetPf) || inputs.targetPf <= 0 || inputs.targetPf > 1) {
    errors.push('معامل القدرة المستهدف يجب أن يكون أكبر من 0 وأقل من أو يساوي 1.');
  }
  if (
    Number.isFinite(inputs.currentPf) &&
    Number.isFinite(inputs.targetPf) &&
    inputs.currentPf > 0 &&
    inputs.targetPf > 0 &&
    inputs.targetPf < inputs.currentPf
  ) {
    errors.push('معامل القدرة المستهدف يجب أن يكون أكبر من أو يساوي معامل القدرة الحالي.');
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
      phi1Deg: 0,
      phi2Deg: 0,
      q1Kvar: 0,
      q2Kvar: 0,
      s1Kva: 0,
      s2Kva: 0,
      requiredCapacitorKvar: 0,
      savedApparentKva: 0,
      savedApparentPct: 0,
      currentReductionPct: 0,
    };
  }

  // φ₁ = arccos(PF₁), φ₂ = arccos(PF₂)
  const phi1Rad = Math.acos(inputs.currentPf);
  const phi2Rad = Math.acos(inputs.targetPf);

  const phi1Deg = (phi1Rad * 180) / Math.PI;
  const phi2Deg = (phi2Rad * 180) / Math.PI;

  // Q₁ = P × tan(φ₁), Q₂ = P × tan(φ₂)
  const q1Kvar = inputs.activePowerKw * Math.tan(phi1Rad);
  const q2Kvar = inputs.activePowerKw * Math.tan(phi2Rad);

  // S₁ = P / PF₁, S₂ = P / PF₂
  const s1Kva = inputs.activePowerKw / inputs.currentPf;
  const s2Kva = inputs.activePowerKw / inputs.targetPf;

  // Q_c = Q₁ - Q₂
  const requiredCapacitorKvar = Math.max(0, q1Kvar - q2Kvar);

  const savedApparentKva = Math.max(0, s1Kva - s2Kva);
  const savedApparentPct = s1Kva > 0 ? (savedApparentKva / s1Kva) * 100 : 0;
  const currentReductionPct = savedApparentPct;

  return {
    isValid: true,
    errors: [],
    phi1Deg,
    phi2Deg,
    q1Kvar,
    q2Kvar,
    s1Kva,
    s2Kva,
    requiredCapacitorKvar,
    savedApparentKva,
    savedApparentPct,
    currentReductionPct,
  };
}
