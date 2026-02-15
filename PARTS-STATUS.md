# SparkBench Parts Simulation & Test Status

## Fully Simulated & Tested

| Part | Simulation | Test Project |
|------|-----------|-------------|
| wokwi-led | GPIO pin state → visual | simon-game |
| wokwi-pushbutton | INPUT_PULLUP, keyboard shortcuts | simon-game |
| wokwi-potentiometer | ADC channel voltage | potentiometer-test |
| wokwi-slide-potentiometer | ADC channel voltage | (shares pot logic) |
| wokwi-slide-switch | Toggle state for HC165 inputs | 74hc165-input |
| wokwi-ssd1306 | Full I2C controller, GDDRAM | ssd1306-demo |
| wokwi-74hc595 | Serial-in/parallel-out, daisy chain | 74hc595-test, simon-game |
| wokwi-74hc165 | Parallel-in/serial-out | 74hc165-input |
| wokwi-7segment | Segment values via HC595 outputs | simon-game |
| wokwi-servo | PWM pulse width → angle, visual rotation | servo-test |
| wokwi-dht22 | One-wire protocol, temp/humidity sliders | dht22-test |
| wokwi-mpu6050 | I2C register map, accel/gyro sliders | mpu6050-test |
| wokwi-ky-040 | Quadrature CLK/DT signals, SW button | encodertest |

## Simulated But Not Tested

| Part | Simulation | What's Missing |
|------|-----------|---------------|
| wokwi-buzzer | GPIO pin state → `hasSignal` visual | No test project; **no audio output** |

## Not Simulated (Visual Only)

### High Priority — Common Arduino Parts
| Part | What's Needed |
|------|--------------|
| wokwi-lcd1602 | I2C character display controller |
| wokwi-lcd2004 | I2C character display controller |
| wokwi-rgb-led | 3-pin GPIO → color mixing |
| wokwi-neopixel | WS2812 single-wire protocol |
| wokwi-membrane-keypad | Matrix scanning simulation |
| wokwi-analog-joystick | Dual ADC axes + button |

### Medium Priority — Sensors
| Part | What's Needed |
|------|--------------|
| wokwi-hc-sr04 | Trigger/echo ultrasonic protocol |
| wokwi-pir-motion-sensor | Digital output toggle |
| wokwi-photoresistor-sensor | ADC light level |
| wokwi-ntc-temperature-sensor | ADC temperature curve |

### Low Priority — Logic/Advanced
| Part | What's Needed |
|------|--------------|
| wokwi-gate-not/and/or/xor/nand/nor/xnor | Combinational logic |
| wokwi-flip-flop-d/dr/dsr | Sequential logic |
| wokwi-mux-2 | Signal routing |
| wokwi-clock-generator | Periodic signal |
| wokwi-neopixel-matrix | WS2812 matrix protocol |
| wokwi-led-ring | Addressable LED ring |
| wokwi-led-bar-graph | Multi-LED bar |
| wokwi-stepper-motor | 4-phase step sequencing |
| wokwi-relay-module | Switching logic |
| wokwi-dip-switch-8 | 8-bit parallel input |
| wokwi-ili9341 | SPI TFT display |
| wokwi-microsd-card | SPI SD card |

## Audio Status

The buzzer (`wokwi-buzzer`) currently only tracks pin state visually (`hasSignal`).
There is **no audio output** — no Web Audio API (AudioContext/OscillatorNode) implementation exists.
To add audio: listen for `tone()` frequency via timer PWM output, create an oscillator at that frequency.
