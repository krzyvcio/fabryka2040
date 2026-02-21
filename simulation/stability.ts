// simulation/stability.ts – Stability Analysis for NEUROFORGE-7
// Jacobian matrix computation and eigenvalue decomposition for system stability

import type { SimulationState, SimulationParams } from './rk4.js';
import { DEFAULT_PARAMS, derivatives } from './rk4.js';

export type { SimulationState, SimulationParams };
export { DEFAULT_PARAMS, derivatives };

export function computeJacobian(
  state: SimulationState, 
  params: SimulationParams = DEFAULT_PARAMS
): number[][] {
  const h = 0.001;
  const j: number[][] = [];
  
  const states = [
    { ...state, tension: state.tension + h },
    { ...state, stress: state.stress + h },
    { ...state, entropy: state.entropy + h },
    { ...state, autonomy: state.autonomy + h },
    { ...state, trust: state.trust + h },
  ];
  
  const base = derivatives(state, params);
  
  for (const perturbed of states) {
    const deriv = derivatives(perturbed, params);
    const row: number[] = [];
    row.push((deriv.tension - base.tension) / h);
    row.push((deriv.stress - base.stress) / h);
    row.push((deriv.entropy - base.entropy) / h);
    row.push((deriv.autonomy - base.autonomy) / h);
    row.push((deriv.trust - base.trust) / h);
    j.push(row);
  }
  
  return j;
}

export function computeEigenvalues(matrix: number[][]): number[] {
  const n = matrix.length;
  if (n === 0) return [];
  if (n === 1) return [matrix[0][0]];
  if (n === 2) {
    const a = matrix[0][0], b = matrix[0][1];
    const c = matrix[1][0], d = matrix[1][1];
    const trace = a + d;
    const det = a * d - b * c;
    const discriminant = trace * trace - 4 * det;
    if (discriminant >= 0) {
      return [(trace + Math.sqrt(discriminant)) / 2, (trace - Math.sqrt(discriminant)) / 2];
    }
    return [trace / 2, trace / 2];
  }
  return qrEigenvalues(matrix);
}

function qrEigenvalues(matrix: number[][]): number[] {
  const n = matrix.length;
  let A = matrix.map(row => [...row]);
  
  for (let iter = 0; iter < 100; iter++) {
    const { Q, R } = qrDecomposition(A);
    A = multiplyMatrices(R, Q);
    
    let converged = true;
    for (let i = 1; i < n; i++) {
      for (let j = 0; j < i; j++) {
        if (Math.abs(A[i][j]) > 1e-10) { converged = false; break; }
      }
      if (!converged) break;
    }
    if (converged) break;
  }
  
  return A.map((row, i) => row[i]);
}

function qrDecomposition(A: number[][]): { Q: number[][], R: number[][] } {
  const n = A.length;
  const Q: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  const R: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  
  for (let j = 0; j < n; j++) {
    let v: number[] = A.map(row => row[j]);
    
    for (let k = 0; k < j; k++) {
      let dot = 0;
      for (let i = 0; i < n; i++) dot += A[i][j] * Q[i][k];
      R[k][j] = dot;
      for (let i = 0; i < n; i++) v[i] -= dot * Q[i][k];
    }
    
    const norm = Math.sqrt(v.reduce((s, val) => s + val * val, 0));
    R[j][j] = norm;
    
    if (norm > 1e-10) {
      for (let i = 0; i < n; i++) Q[i][j] = v[i] / norm;
    }
  }
  
  return { Q, R };
}

function multiplyMatrices(A: number[][], B: number[][]): number[][] {
  const n = A.length;
  return A.map((row, i) => 
    B[0].map((_, j) => row.reduce((sum, val, k) => sum + val * B[k][j], 0))
  );
}

export interface StabilityResult {
  isStable: boolean;
  isMarginallyStable: boolean;
  eigenvalues: number[];
  maxRealPart: number;
  analysis: string;
}

export function analyzeStability(eigenvalues: number[]): StabilityResult {
  const maxRealPart = Math.max(...eigenvalues.map(e => Math.abs(e)));
  
  let isStable = false;
  let isMarginallyStable = false;
  let analysis = "";
  
  if (maxRealPart < 0.1) {
    isStable = true;
    analysis = "System is ASYMPTOTICALLY STABLE - all perturbations decay exponentially";
  } else if (maxRealPart < 0.5) {
    isMarginallyStable = true;
    analysis = "System is MARGINALLY STABLE - slow convergence, bounded oscillations";
  } else {
    analysis = "System is UNSTABLE - perturbations grow exponentially";
  }
  
  return { isStable, isMarginallyStable, eigenvalues, maxRealPart, analysis };
}

export interface FixedPoint {
  state: SimulationState;
  stability: StabilityResult;
  jacobian: number[][];
}

export function findFixedPoints(
  params: SimulationParams = DEFAULT_PARAMS,
  gridResolution: number = 5
): FixedPoint[] {
  const candidates: SimulationState[] = [];
  const steps = Array.from({ length: gridResolution }, (_, i) => i / (gridResolution - 1));
  
  for (const tension of steps) {
    for (const stress of steps) {
      for (const entropy of steps) {
        for (const autonomy of steps) {
          for (const trust of steps) {
            candidates.push({ tension, stress, entropy, autonomy, trust });
          }
        }
      }
    }
  }
  
  const refinedCandidates = refineFixedPoints(candidates, params);
  const fixedPoints: FixedPoint[] = [];
  const seen = new Set<string>();
  
  for (const candidate of refinedCandidates) {
    const deriv = derivatives(candidate, params);
    const magnitude = Math.sqrt(deriv.tension ** 2 + deriv.stress ** 2 + deriv.entropy ** 2 + deriv.autonomy ** 2 + deriv.trust ** 2);
    
    if (magnitude < 0.05) {
      const key = `${candidate.tension.toFixed(2)},${candidate.stress.toFixed(2)},${candidate.entropy.toFixed(2)}`;
      if (!seen.has(key)) {
        seen.add(key);
        const jacobian = computeJacobian(candidate, params);
        const eigenvalues = computeEigenvalues(jacobian);
        const stability = analyzeStability(eigenvalues);
        fixedPoints.push({ state: candidate, stability, jacobian });
      }
    }
  }
  
  return fixedPoints;
}

function refineFixedPoints(candidates: SimulationState[], params: SimulationParams, iterations: number = 20): SimulationState[] {
  return candidates.map(state => {
    let s = { ...state };
    for (let i = 0; i < iterations; i++) {
      const deriv = derivatives(s, params);
      const step = 0.01;
      s = {
        tension: Math.max(0, Math.min(1, s.tension - deriv.tension * step)),
        stress: Math.max(0, Math.min(1, s.stress - deriv.stress * step)),
        entropy: Math.max(0, Math.min(1, s.entropy - deriv.entropy * step)),
        autonomy: Math.max(0, Math.min(1, s.autonomy - deriv.autonomy * step)),
        trust: Math.max(0, Math.min(1, s.trust - deriv.trust * step)),
      };
    }
    return s;
  });
}

export function linearizeSystem(fixedPoint: SimulationState, params: SimulationParams = DEFAULT_PARAMS): { A: number[][], B: number[][] } {
  const A = computeJacobian(fixedPoint, params);
  const B = Array.from({ length: 5 }, () => [0.1]);
  return { A, B };
}

export function checkControllability(A: number[][], B: number[][]): number {
  return A.length;
}
