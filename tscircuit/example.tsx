export default () => (
  <board width="20mm" height="20mm">
    <resistor
      name="R1"
      resistance="10kohm"
      footprint="0402"
      pcbX={-5}
      pcbY={0}
    />
    <capacitor
      name="C1"
      capacitance="100nF"
      footprint="0402"
      pcbX={5}
      pcbY={0}
    />
    <trace from=".R1 > .pin2" to=".C1 > .pin1" />
  </board>
)
