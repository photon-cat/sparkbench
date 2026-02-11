import type { PinSignalInfo } from '../pin';

export type PinElectricalType =
  | 'input'
  | 'output'
  | 'bidirectional'
  | 'passive'
  | 'power_in'
  | 'power_out'
  | 'tri_state'
  | 'open_collector';

export interface ICPinDefinition {
  name: string;
  number: number;
  type: PinElectricalType;
  inverted?: boolean;
  clock?: boolean;
  signals?: PinSignalInfo[];
  description?: string;
}

export interface ICDefinition {
  name: string;
  description?: string;
  pins: {
    left: ICPinDefinition[];
    right: ICPinDefinition[];
    top?: ICPinDefinition[];
    bottom?: ICPinDefinition[];
  };
}
