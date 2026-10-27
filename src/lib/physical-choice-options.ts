import { hardwareCatalog } from "./physical-catalog";
import type { PhysicalCategory } from "./physical-domain";

// These are design directions, not verified parts or compatibility claims.
const designOptions: Partial<Record<PhysicalCategory, readonly string[]>> = {
  controller: ["Microcontroller board (exact model to be selected)", "Single-board Linux computer", "Industrial PLC", "Existing controller supplied by customer"],
  sensors: ["Distance / proximity sensor", "Temperature / humidity sensor", "Position encoder", "Limit switch", "Force / load sensor", "Pressure sensor", "IMU / motion sensor", "Camera / vision sensor"],
  actuators: ["DC gear motor", "Stepper motor", "Servo motor", "Linear actuator", "Solenoid", "Pump / valve", "Relay-switched load"],
  mechanical: ["3D-printed enclosure / structure", "Sheet-metal enclosure / frame", "Machined parts", "Extrusion frame", "Off-the-shelf chassis", "Existing machine retrofit"],
  power: ["Regulated external DC supply", "USB-powered system", "Rechargeable battery system", "Existing machine DC supply", "Separate logic and actuator supplies"],
  communication: ["Wired UART / serial", "I2C peripheral bus", "SPI peripheral bus", "CAN bus", "RS-485 / Modbus", "Ethernet", "Wi-Fi", "Bluetooth LE"],
  interface: ["Physical buttons and status LEDs", "Rotary encoder and display", "Touchscreen", "Local web interface", "Industrial HMI", "Existing operator panel"],
  companion: ["Local browser dashboard", "Desktop companion application", "Mobile companion application", "Command-line service tool", "Integration with an existing application"],
  control: ["Finite-state machine", "Timed / event-driven sequence", "PID control", "Motion / trajectory control", "Human-operated control with interlocks"],
  tools: ["CAD and mechanical drawings", "PCB schematic and layout", "Firmware build and debugger", "Circuit simulation", "Mechanical / motion simulation", "Bench measurement and test tooling"],
  learning: ["Rule-based perception (no training)", "Pretrained model inference", "Computer vision model adaptation", "Imitation learning", "Reinforcement learning in simulation"],
};

export function physicalChoiceOptions(category: PhysicalCategory): string[] {
  return [...new Set([...hardwareCatalog.filter(entry => entry.category === category).map(entry => entry.name), ...(designOptions[category] ?? [])])];
}
