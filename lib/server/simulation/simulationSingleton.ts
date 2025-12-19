/**
 * Simulation Singleton - Phase 8
 *
 * Maintains a singleton instance of SimulationController for API access
 */

import type { SimulationController } from "./SimulationController";

let simulationControllerInstance: SimulationController | null = null;

/**
 * Set the simulation controller instance
 * Called during system initialization when simulation mode is active
 *
 * @param controller The SimulationController instance
 */
export function setSimulationController(controller: SimulationController): void {
  simulationControllerInstance = controller;
  console.log(`[Simulation Singleton] Controller instance set`);
}

/**
 * Get the simulation controller instance (if exists)
 *
 * @returns SimulationController instance or null if not initialized
 */
export function getSimulationController(): SimulationController | null {
  return simulationControllerInstance;
}
