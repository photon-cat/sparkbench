import { analog, GND, i2c, spi, usart, VCC } from '../pin';
import type { ICDefinition } from './types';

export const IC_74HC595: ICDefinition = {
  name: '74HC595',
  description: '8-bit shift register with output latches',
  pins: {
    left: [
      { name: 'SER', number: 14, type: 'input', description: 'Serial data input' },
      {
        name: 'SRCLK',
        number: 11,
        type: 'input',
        clock: true,
        description: 'Shift register clock',
      },
      {
        name: 'RCLK',
        number: 12,
        type: 'input',
        clock: true,
        description: 'Storage register clock',
      },
      {
        name: 'SRCLR',
        number: 10,
        type: 'input',
        inverted: true,
        description: 'Shift register clear',
      },
      { name: 'OE', number: 13, type: 'input', inverted: true, description: 'Output enable' },
      { name: 'VCC', number: 16, type: 'power_in', signals: [VCC()] },
      { name: 'GND', number: 8, type: 'power_in', signals: [GND()] },
    ],
    right: [
      { name: 'QA', number: 15, type: 'output' },
      { name: 'QB', number: 1, type: 'output' },
      { name: 'QC', number: 2, type: 'output' },
      { name: 'QD', number: 3, type: 'output' },
      { name: 'QE', number: 4, type: 'output' },
      { name: 'QF', number: 5, type: 'output' },
      { name: 'QG', number: 6, type: 'output' },
      { name: 'QH', number: 7, type: 'output' },
      { name: "QH'", number: 9, type: 'output', description: 'Serial output' },
    ],
  },
};

export const IC_74HC00: ICDefinition = {
  name: '74HC00',
  description: 'Quad 2-input NAND gate',
  pins: {
    left: [
      { name: '1A', number: 1, type: 'input' },
      { name: '1B', number: 2, type: 'input' },
      { name: '2A', number: 4, type: 'input' },
      { name: '2B', number: 5, type: 'input' },
      { name: '3A', number: 9, type: 'input' },
      { name: '3B', number: 10, type: 'input' },
      { name: '4A', number: 12, type: 'input' },
      { name: '4B', number: 13, type: 'input' },
      { name: 'VCC', number: 14, type: 'power_in', signals: [VCC()] },
      { name: 'GND', number: 7, type: 'power_in', signals: [GND()] },
    ],
    right: [
      { name: '1Y', number: 3, type: 'output' },
      { name: '2Y', number: 6, type: 'output' },
      { name: '3Y', number: 8, type: 'output' },
      { name: '4Y', number: 11, type: 'output' },
    ],
  },
};

export const IC_MPU6050: ICDefinition = {
  name: 'MPU6050',
  description: '6-axis IMU (accelerometer + gyroscope)',
  pins: {
    left: [
      { name: 'VCC', number: 1, type: 'power_in', signals: [VCC()] },
      { name: 'GND', number: 2, type: 'power_in', signals: [GND()] },
      { name: 'SCL', number: 3, type: 'input', signals: [i2c('SCL')] },
      { name: 'SDA', number: 4, type: 'bidirectional', signals: [i2c('SDA')] },
    ],
    right: [
      { name: 'XCL', number: 5, type: 'output', description: 'Aux I2C clock' },
      { name: 'XDA', number: 6, type: 'bidirectional', description: 'Aux I2C data' },
      { name: 'AD0', number: 7, type: 'input', description: 'I2C address select' },
      { name: 'INT', number: 8, type: 'output', description: 'Interrupt output' },
    ],
  },
};

export const IC_ATMEGA328P: ICDefinition = {
  name: 'ATmega328P',
  description: '8-bit AVR microcontroller',
  pins: {
    left: [
      { name: 'PC6', number: 1, type: 'bidirectional' },
      { name: 'PD0', number: 2, type: 'bidirectional', signals: [usart('RX')] },
      { name: 'PD1', number: 3, type: 'bidirectional', signals: [usart('TX')] },
      { name: 'PD2', number: 4, type: 'bidirectional' },
      { name: 'PD3', number: 5, type: 'bidirectional', signals: [{ type: 'pwm' }] },
      { name: 'PD4', number: 6, type: 'bidirectional' },
      { name: 'VCC', number: 7, type: 'power_in', signals: [VCC()] },
      { name: 'GND', number: 8, type: 'power_in', signals: [GND()] },
      { name: 'PB6', number: 9, type: 'bidirectional' },
      { name: 'PB7', number: 10, type: 'bidirectional' },
      { name: 'PD5', number: 11, type: 'bidirectional', signals: [{ type: 'pwm' }] },
      { name: 'PD6', number: 12, type: 'bidirectional', signals: [{ type: 'pwm' }] },
      { name: 'PD7', number: 13, type: 'bidirectional' },
      { name: 'PB0', number: 14, type: 'bidirectional' },
    ],
    right: [
      { name: 'PC5', number: 28, type: 'bidirectional', signals: [i2c('SCL'), analog(5)] },
      { name: 'PC4', number: 27, type: 'bidirectional', signals: [i2c('SDA'), analog(4)] },
      { name: 'PC3', number: 26, type: 'bidirectional', signals: [analog(3)] },
      { name: 'PC2', number: 25, type: 'bidirectional', signals: [analog(2)] },
      { name: 'PC1', number: 24, type: 'bidirectional', signals: [analog(1)] },
      { name: 'PC0', number: 23, type: 'bidirectional', signals: [analog(0)] },
      { name: 'GND', number: 22, type: 'power_in', signals: [GND()] },
      { name: 'AREF', number: 21, type: 'passive' },
      { name: 'AVCC', number: 20, type: 'power_in', signals: [VCC()] },
      { name: 'PB5', number: 19, type: 'bidirectional', signals: [spi('SCK')] },
      { name: 'PB4', number: 18, type: 'bidirectional', signals: [spi('MISO')] },
      {
        name: 'PB3',
        number: 17,
        type: 'bidirectional',
        signals: [spi('MOSI'), { type: 'pwm' }],
      },
      {
        name: 'PB2',
        number: 16,
        type: 'bidirectional',
        signals: [spi('SS'), { type: 'pwm' }],
      },
      { name: 'PB1', number: 15, type: 'bidirectional', signals: [{ type: 'pwm' }] },
    ],
  },
};

export const ALL_DEFINITIONS: ICDefinition[] = [
  IC_74HC595,
  IC_74HC00,
  IC_MPU6050,
  IC_ATMEGA328P,
];
