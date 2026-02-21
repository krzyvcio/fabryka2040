// simulation/rk4.ts – Runge-Kutta 4 Integration for NEUROFORGE-7
// Numerical integration for differential equations simulation

export interface SimulationState {
  tension: number;
  stress: number;
  entropy: number;
  autonomy: number;
  trust: number;
}

export interface SimulationParams {
  alpha: number;
  beta: number;
  gamma: number;
  delta: number;
  epsilon: number;
}

const DEFAULT_PARAMS: SimulationParams = {
  alpha: 0.15,
  beta: 0.1,
  gamma: 0.3,
  delta: 0.2,
  epsilon: 0.25,
};

export { DEFAULT_PARAMS };

export function derivatives(state: SimulationState, params: SimulationParams = DEFAULT_PARAMS): SimulationState {
  const { alpha, beta, gamma, delta, epsilon } = params;
  
  return {
    tension: -alpha * state.entropy - beta * state.stress,
    stress: gamma * state.tension - delta * state.entropy,
    entropy: epsilon * state.stress - alpha * state.trust,
    autonomy: 0.02 * state.entropy,
    trust: -alpha * state.entropy - beta * state.stress,
  };
}

export function rk4Step(state: SimulationState, dt: number, params: SimulationParams = DEFAULT_PARAMS): SimulationState {
  const k1 = derivatives(state, params);
  
  const state2: SimulationState = {
    tension: state.tension + k1.tension * dt / 2,
    stress: state.stress + k1.stress * dt / 2,
    entropy: state.entropy + k1.entropy * dt / 2,
    autonomy: state.autonomy + k1.autonomy * dt / 2,
    trust: state.trust + k1.trust * dt / 2,
  };
  const k2 = derivatives(state2, params);
  
  const state3: SimulationState = {
    tension: state.tension + k2.tension * dt / 2,
    stress: state.stress + k2.stress * dt / 2,
    entropy: state.entropy + k2.entropy * dt / 2,
    autonomy: state.autonomy + k2.autonomy * dt / 2,
    trust: state.trust + k2.trust * dt / 2,
  };
  const k3 = derivatives(state3, params);
  
  const state4: SimulationState = {
    tension: state.tension + k3.tension * dt,
    stress: state.stress + k3.stress * dt,
    entropy: state.entropy + k3.entropy * dt,
    autonomy: state.autonomy + k3.autonomy * dt,
    trust: state.trust + k3.trust * dt,
  };
  const k4 = derivatives(state4, params);
  
  return {
    tension: state.tension + (k1.tension + 2 * k2.tension + 2 * k3.tension + k4.tension) * dt / 6,
    stress: state.stress + (k1.stress + 2 * k2.stress + 2 * k3.stress + k4.stress) * dt / 6,
    entropy: state.entropy + (k1.entropy + 2 * k2.entropy + 2 * k3.entropy + k4.entropy) * dt / 6,
    autonomy: state.autonomy + (k1.autonomy + 2 * k2.autonomy + 2 * k3.autonomy + k4.autonomy) * dt / 6,
    trust: state.trust + (k1.trust + 2 * k2.trust + 2 * k3.trust + k4.trust) * dt / 6,
  };
}

export function simulateTrajectory(
  initialState: SimulationState,
  steps: number,
  dt: number = 0.1,
  params: SimulationParams = DEFAULT_PARAMS
): SimulationState[] {
  const trajectory: SimulationState[] = [initialState];
  let current = initialState;
  
  for (let i = 0; i < steps; i++) {
    current = rk4Step(current, dt, params);
    
    current.tension = Math.max(0, Math.min(1, current.tension));
    current.stress = Math.max(0, Math.min(1, current.stress));
    current.entropy = Math.max(0, Math.min(1, current.entropy));
    current.autonomy = Math.max(0, Math.min(1, current.autonomy));
    current.trust = Math.max(0, Math.min(1, current.trust));
    
    trajectory.push({ ...current });
  }
  
  return trajectory;
}

export function computeJacobian(state: SimulationState, params: SimulationParams = DEFAULT_PARAMS): number[][] {
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
    } else {
      return [trace / 2, trace / 2];
    }
  }
  
  return [0, 0, 0, 0, 0];
}

export interface StabilityResult {
  isStable: boolean;
  eigenvalues: number[];
  analysis: string;
}

export function analyzeStability(eigenvalues: number[]): StabilityResult {
  const maxRealPart = Math.max(...eigenvalues.map(e => Math.abs(e)));
  
  const isStable = maxRealPart < 0.1;
  
  let analysis = "";
  if (isStable) {
    analysis = "System is STABLE - perturbations decay over time";
  } else if (maxRealPart < 0.5) {
    analysis = "System is MARGINALLY STABLE - slow convergence";
  } else {
    analysis = "System is UNSTABLE - perturbations grow exponentially";
  }
  
  return { isStable, eigenvalues, analysis };
}

export interface FixedPoint {
  state: SimulationState;
  stability: StabilityResult;
}

export function findFixedPoints(params: SimulationParams = DEFAULT_PARAMS): FixedPoint[] {
  const candidates: SimulationState[] = [
    { tension: 0, stress: 0, entropy: 0, autonomy: 0, trust: 0 },
    { tension: 0.5, stress: 0.3, entropy: 0.2, autonomy: 0.1, trust: 0.5 },
    { tension: 0.7, stress: 0.5, entropy: 0.4, autonomy: 0.3, trust: 0.3 },
    { tension: 0.9, stress: 0.8, entropy: 0.7, autonomy: 0.5, trust: 0.1 },
  ];
  
  const fixedPoints: FixedPoint[] = [];
  
  for (const candidate of candidates) {
    const deriv = derivatives(candidate, params);
    const magnitude = Math.sqrt(
      deriv.tension ** 2 + deriv.stress ** 2 + deriv.entropy ** 2 + 
      deriv.autonomy ** 2 + deriv.trust ** 2
    );
    
    if (magnitude < 0.1) {
      const jacobian = computeJacobian(candidate, params);
      const eigenvalues = computeEigenvalues(jacobian);
      const stability = analyzeStability(eigenvalues);
      
      fixedPoints.push({ state: candidate, stability });
    }
  }
  
  return fixedPoints;
}
