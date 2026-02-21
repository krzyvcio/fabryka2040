// simulation/bifurcation.ts – Bifurcation Analysis for NEUROFORGE-7

import { SimulationState, SimulationParams, derivatives, rk4Step } from './rk4.js';
import { computeJacobian, computeEigenvalues, analyzeStability } from './stability.js';

const DEFAULT_PARAMS: SimulationParams = {
  alpha: 0.15,
  beta: 0.1,
  gamma: 0.3,
  delta: 0.2,
  epsilon: 0.25,
};

const INITIAL_STATE: SimulationState = {
  tension: 0.5,
  stress: 0.3,
  entropy: 0.2,
  autonomy: 0.1,
  trust: 0.5,
};

export interface BifurcationData {
  parameter: string;
  value: number;
  stability: 'stable' | 'marginally-stable' | 'unstable';
}

export function bifurcationScan(paramRange: [number, number], steps: number): BifurcationData[] {
  const [epsilonMin, epsilonMax] = paramRange;
  const stepSize = (epsilonMax - epsilonMin) / (steps - 1);
  const data: BifurcationData[] = [];

  for (let i = 0; i < steps; i++) {
    const epsilon = epsilonMin + i * stepSize;
    const params: SimulationParams = { ...DEFAULT_PARAMS, epsilon };
    const fixedPoint = findEquilibrium(INITIAL_STATE, params);
    const jacobian = computeJacobian(fixedPoint, params);
    const eigenvalues = computeEigenvalues(jacobian);
    const stabilityResult = analyzeStability(eigenvalues);

    let stability: 'stable' | 'marginally-stable' | 'unstable';
    if (stabilityResult.isStable) stability = 'stable';
    else if (stabilityResult.isMarginallyStable) stability = 'marginally-stable';
    else stability = 'unstable';

    data.push({ parameter: 'epsilon', value: parseFloat(epsilon.toFixed(4)), stability });
  }

  return data;
}

function findEquilibrium(state: SimulationState, params: SimulationParams): SimulationState {
  let current = { ...state };
  const dt = 0.1;

  for (let i = 0; i < 500; i++) {
    current = rk4Step(current, dt, params);
    current.tension = Math.max(0, Math.min(1, current.tension));
    current.stress = Math.max(0, Math.min(1, current.stress));
    current.entropy = Math.max(0, Math.min(1, current.entropy));
    current.autonomy = Math.max(0, Math.min(1, current.autonomy));
    current.trust = Math.max(0, Math.min(1, current.trust));
  }

  return current;
}

export function findCriticalPoint(data: BifurcationData[]): number {
  if (data.length < 2) return -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i - 1].stability !== data[i].stability) {
      return data[i].value;
    }
  }

  return -1;
}

export function plotBifurcationDiagram(data: BifurcationData[]): string {
  const width = 60;
  const height = 15;
  const stable = '■', marginal = '□', unstable = '●', empty = ' ';

  const values = data.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal;

  let diagram = '\n  BIFURCATION DIAGRAM - NEUROFORGE-7\n  ==============================\n\n';

  const grid: string[][] = Array.from({ length: height }, () => Array(width).fill(empty));

  for (const d of data) {
    const x = Math.floor(((d.value - minVal) / range) * (width - 1));
    const y = d.stability === 'stable' ? height - 1 : d.stability === 'marginally-stable' ? Math.floor(height / 2) : 0;
    if (x >= 0 && x < width && y >= 0 && y < height) {
      grid[y][x] = d.stability === 'stable' ? stable : d.stability === 'marginally-stable' ? marginal : unstable;
    }
  }

  for (let row = 0; row < height; row++) {
    diagram += row === height - 1 ? 'S ' : row === Math.floor(height / 2) ? 'M ' : row === 0 ? 'U ' : '  ';
    diagram += '│' + grid[row].join('') + '│\n';
  }

  diagram += '  └' + '─'.repeat(width) + '┘\n';
  diagram += `      epsilon: ${minVal.toFixed(2)} → ${maxVal.toFixed(2)}\n\n`;
  diagram += `  LEGEND: ${stable} Stable  ${marginal} Marginal  ${unstable} Unstable\n`;

  const cp = findCriticalPoint(data);
  if (cp > 0) diagram += `\n  CRITICAL POINT: epsilon = ${cp.toFixed(4)}\n`;

  return diagram;
}

export function analyzeBifurcationRegion(paramRange: [number, number]): { data: BifurcationData[]; criticalPoint: number; diagram: string } {
  const data = bifurcationScan(paramRange, 50);
  const criticalPoint = findCriticalPoint(data);
  const diagram = plotBifurcationDiagram(data);
  return { data, criticalPoint, diagram };
}
