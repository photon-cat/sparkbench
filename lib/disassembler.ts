// AVR Disassembler - decodes opcodes into human-readable mnemonics

export interface DisassembledInstruction {
  address: number;     // word address
  opcode: number;      // raw opcode
  opcode2?: number;    // second word for 2-word instructions
  mnemonic: string;
  operands: string;
  size: number;        // 1 or 2 words
  bytes: string;       // hex representation
}

function reg(n: number): string {
  return `r${n}`;
}

function hex8(n: number): string {
  return '0x' + (n & 0xff).toString(16).padStart(2, '0');
}

function hex16(n: number): string {
  return '0x' + (n & 0xffff).toString(16).padStart(4, '0');
}

function wordAddr(n: number): string {
  return '0x' + ((n * 2) & 0xffff).toString(16).padStart(4, '0');
}

function isTwoWord(opcode: number): boolean {
  return (
    (opcode & 0xfe0f) === 0x9000 || // LDS
    (opcode & 0xfe0f) === 0x9200 || // STS
    (opcode & 0xfe0e) === 0x940e || // CALL
    (opcode & 0xfe0e) === 0x940c    // JMP
  );
}

// Sign-extend a k-bit number
function signExtend(value: number, bits: number): number {
  const mask = 1 << (bits - 1);
  return (value ^ mask) - mask;
}

// Branch name aliases based on SREG bit
const brbcNames = ['BRCC', 'BRNE', 'BRPL', 'BRVC', 'BRGE', 'BRHC', 'BRTC', 'BRID'];
const brbsNames = ['BRCS', 'BREQ', 'BRMI', 'BRVS', 'BRLT', 'BRHS', 'BRTS', 'BRIE'];

export function disassembleInstruction(progMem: Uint16Array, pc: number): DisassembledInstruction {
  const opcode = progMem[pc];
  const twoWord = isTwoWord(opcode);
  const opcode2 = twoWord && pc + 1 < progMem.length ? progMem[pc + 1] : undefined;
  const size = twoWord ? 2 : 1;

  let bytes: string;
  if (twoWord && opcode2 !== undefined) {
    bytes = opcode.toString(16).padStart(4, '0') + ' ' + opcode2.toString(16).padStart(4, '0');
  } else {
    bytes = opcode.toString(16).padStart(4, '0');
  }

  const result: DisassembledInstruction = {
    address: pc,
    opcode,
    opcode2,
    mnemonic: '???',
    operands: '',
    size,
    bytes,
  };

  // Extract common fields
  const d5 = (opcode & 0x1f0) >> 4;           // 5-bit dest register
  const r5 = (opcode & 0xf) | ((opcode & 0x200) >> 5); // 5-bit source register
  const d4 = ((opcode & 0xf0) >> 4) + 16;     // 4-bit dest (r16-r31)
  const K8 = (opcode & 0xf) | ((opcode & 0xf00) >> 4); // 8-bit immediate
  const A6 = (opcode & 0xf) | ((opcode & 0x600) >> 5);  // 6-bit IO address
  const A5 = (opcode & 0xf8) >> 3;             // 5-bit IO address
  const b3 = opcode & 7;                        // 3-bit bit number
  const q6 = (opcode & 7) | ((opcode & 0xc00) >> 7) | ((opcode & 0x2000) >> 8); // 6-bit displacement

  if (opcode === 0x0000) {
    result.mnemonic = 'NOP';
  } else if ((opcode & 0xfc00) === 0x1c00) {
    // ADC (also ROL when d==r)
    if (d5 === r5) {
      result.mnemonic = 'ROL';
      result.operands = reg(d5);
    } else {
      result.mnemonic = 'ADC';
      result.operands = `${reg(d5)}, ${reg(r5)}`;
    }
  } else if ((opcode & 0xfc00) === 0x0c00) {
    // ADD (also LSL when d==r)
    if (d5 === r5) {
      result.mnemonic = 'LSL';
      result.operands = reg(d5);
    } else {
      result.mnemonic = 'ADD';
      result.operands = `${reg(d5)}, ${reg(r5)}`;
    }
  } else if ((opcode & 0xff00) === 0x9600) {
    // ADIW
    const pair = 2 * ((opcode & 0x30) >> 4) + 24;
    const K = (opcode & 0xf) | ((opcode & 0xc0) >> 2);
    result.mnemonic = 'ADIW';
    result.operands = `${reg(pair)}, ${K}`;
  } else if ((opcode & 0xfc00) === 0x2000) {
    // AND (also TST when d==r)
    if (d5 === r5) {
      result.mnemonic = 'TST';
      result.operands = reg(d5);
    } else {
      result.mnemonic = 'AND';
      result.operands = `${reg(d5)}, ${reg(r5)}`;
    }
  } else if ((opcode & 0xf000) === 0x7000) {
    result.mnemonic = 'ANDI';
    result.operands = `${reg(d4)}, ${hex8(K8)}`;
  } else if ((opcode & 0xfe0f) === 0x9405) {
    result.mnemonic = 'ASR';
    result.operands = reg(d5);
  } else if ((opcode & 0xff8f) === 0x9488) {
    // BCLR
    const s = (opcode & 0x70) >> 4;
    const names = ['CLC', 'CLZ', 'CLN', 'CLV', 'CLS', 'CLH', 'CLT', 'CLI'];
    result.mnemonic = names[s];
  } else if ((opcode & 0xfe08) === 0xf800) {
    result.mnemonic = 'BLD';
    result.operands = `${reg(d5)}, ${b3}`;
  } else if ((opcode & 0xfc00) === 0xf400) {
    // BRBC
    const s = opcode & 7;
    const k = signExtend((opcode & 0x1f8) >> 3, 7);
    result.mnemonic = brbcNames[s];
    result.operands = wordAddr(pc + k + 1);
  } else if ((opcode & 0xfc00) === 0xf000) {
    // BRBS
    const s = opcode & 7;
    const k = signExtend((opcode & 0x1f8) >> 3, 7);
    result.mnemonic = brbsNames[s];
    result.operands = wordAddr(pc + k + 1);
  } else if ((opcode & 0xff8f) === 0x9408) {
    // BSET
    const s = (opcode & 0x70) >> 4;
    const names = ['SEC', 'SEZ', 'SEN', 'SEV', 'SES', 'SEH', 'SET', 'SEI'];
    result.mnemonic = names[s];
  } else if ((opcode & 0xfe08) === 0xfa00) {
    result.mnemonic = 'BST';
    result.operands = `${reg(d5)}, ${b3}`;
  } else if ((opcode & 0xfe0e) === 0x940e) {
    // CALL
    const k = (opcode2 ?? 0) | ((opcode & 1) << 16) | ((opcode & 0x1f0) << 13);
    result.mnemonic = 'CALL';
    result.operands = wordAddr(k);
  } else if ((opcode & 0xff00) === 0x9800) {
    result.mnemonic = 'CBI';
    result.operands = `${hex8(A5)}, ${b3}`;
  } else if ((opcode & 0xfe0f) === 0x9400) {
    result.mnemonic = 'COM';
    result.operands = reg(d5);
  } else if ((opcode & 0xfc00) === 0x1400) {
    result.mnemonic = 'CP';
    result.operands = `${reg(d5)}, ${reg(r5)}`;
  } else if ((opcode & 0xfc00) === 0x0400) {
    result.mnemonic = 'CPC';
    result.operands = `${reg(d5)}, ${reg(r5)}`;
  } else if ((opcode & 0xf000) === 0x3000) {
    result.mnemonic = 'CPI';
    result.operands = `${reg(d4)}, ${hex8(K8)}`;
  } else if ((opcode & 0xfc00) === 0x1000) {
    result.mnemonic = 'CPSE';
    result.operands = `${reg(d5)}, ${reg(r5)}`;
  } else if ((opcode & 0xfe0f) === 0x940a) {
    result.mnemonic = 'DEC';
    result.operands = reg(d5);
  } else if (opcode === 0x9519) {
    result.mnemonic = 'EICALL';
  } else if (opcode === 0x9419) {
    result.mnemonic = 'EIJMP';
  } else if (opcode === 0x95d8) {
    result.mnemonic = 'ELPM';
  } else if ((opcode & 0xfe0f) === 0x9006) {
    result.mnemonic = 'ELPM';
    result.operands = `${reg(d5)}, Z`;
  } else if ((opcode & 0xfe0f) === 0x9007) {
    result.mnemonic = 'ELPM';
    result.operands = `${reg(d5)}, Z+`;
  } else if ((opcode & 0xfc00) === 0x2400) {
    // EOR (also CLR when d==r)
    if (d5 === r5) {
      result.mnemonic = 'CLR';
      result.operands = reg(d5);
    } else {
      result.mnemonic = 'EOR';
      result.operands = `${reg(d5)}, ${reg(r5)}`;
    }
  } else if ((opcode & 0xff88) === 0x0308) {
    const d = ((opcode & 0x70) >> 4) + 16;
    const r = (opcode & 7) + 16;
    result.mnemonic = 'FMUL';
    result.operands = `${reg(d)}, ${reg(r)}`;
  } else if ((opcode & 0xff88) === 0x0380) {
    const d = ((opcode & 0x70) >> 4) + 16;
    const r = (opcode & 7) + 16;
    result.mnemonic = 'FMULS';
    result.operands = `${reg(d)}, ${reg(r)}`;
  } else if ((opcode & 0xff88) === 0x0388) {
    const d = ((opcode & 0x70) >> 4) + 16;
    const r = (opcode & 7) + 16;
    result.mnemonic = 'FMULSU';
    result.operands = `${reg(d)}, ${reg(r)}`;
  } else if (opcode === 0x9509) {
    result.mnemonic = 'ICALL';
  } else if (opcode === 0x9409) {
    result.mnemonic = 'IJMP';
  } else if ((opcode & 0xf800) === 0xb000) {
    result.mnemonic = 'IN';
    result.operands = `${reg(d5)}, ${hex8(A6)}`;
  } else if ((opcode & 0xfe0f) === 0x9403) {
    result.mnemonic = 'INC';
    result.operands = reg(d5);
  } else if ((opcode & 0xfe0e) === 0x940c) {
    // JMP
    const k = (opcode2 ?? 0) | ((opcode & 1) << 16) | ((opcode & 0x1f0) << 13);
    result.mnemonic = 'JMP';
    result.operands = wordAddr(k);
  } else if ((opcode & 0xfe0f) === 0x9206) {
    result.mnemonic = 'LAC';
    result.operands = `Z, ${reg(d5)}`;
  } else if ((opcode & 0xfe0f) === 0x9205) {
    result.mnemonic = 'LAS';
    result.operands = `Z, ${reg(d5)}`;
  } else if ((opcode & 0xfe0f) === 0x9207) {
    result.mnemonic = 'LAT';
    result.operands = `Z, ${reg(d5)}`;
  } else if ((opcode & 0xf000) === 0xe000) {
    // LDI
    result.mnemonic = 'LDI';
    result.operands = `${reg(d4)}, ${hex8(K8)}`;
  } else if ((opcode & 0xfe0f) === 0x9000) {
    // LDS
    result.mnemonic = 'LDS';
    result.operands = `${reg(d5)}, ${hex16(opcode2 ?? 0)}`;
  } else if ((opcode & 0xfe0f) === 0x900c) {
    result.mnemonic = 'LD';
    result.operands = `${reg(d5)}, X`;
  } else if ((opcode & 0xfe0f) === 0x900d) {
    result.mnemonic = 'LD';
    result.operands = `${reg(d5)}, X+`;
  } else if ((opcode & 0xfe0f) === 0x900e) {
    result.mnemonic = 'LD';
    result.operands = `${reg(d5)}, -X`;
  } else if ((opcode & 0xfe0f) === 0x8008) {
    result.mnemonic = 'LD';
    result.operands = `${reg(d5)}, Y`;
  } else if ((opcode & 0xfe0f) === 0x9009) {
    result.mnemonic = 'LD';
    result.operands = `${reg(d5)}, Y+`;
  } else if ((opcode & 0xfe0f) === 0x900a) {
    result.mnemonic = 'LD';
    result.operands = `${reg(d5)}, -Y`;
  } else if ((opcode & 0xd208) === 0x8008 && q6 !== 0) {
    result.mnemonic = 'LDD';
    result.operands = `${reg(d5)}, Y+${q6}`;
  } else if ((opcode & 0xfe0f) === 0x8000) {
    result.mnemonic = 'LD';
    result.operands = `${reg(d5)}, Z`;
  } else if ((opcode & 0xfe0f) === 0x9001) {
    result.mnemonic = 'LD';
    result.operands = `${reg(d5)}, Z+`;
  } else if ((opcode & 0xfe0f) === 0x9002) {
    result.mnemonic = 'LD';
    result.operands = `${reg(d5)}, -Z`;
  } else if ((opcode & 0xd208) === 0x8000 && q6 !== 0) {
    result.mnemonic = 'LDD';
    result.operands = `${reg(d5)}, Z+${q6}`;
  } else if (opcode === 0x95c8) {
    result.mnemonic = 'LPM';
  } else if ((opcode & 0xfe0f) === 0x9004) {
    result.mnemonic = 'LPM';
    result.operands = `${reg(d5)}, Z`;
  } else if ((opcode & 0xfe0f) === 0x9005) {
    result.mnemonic = 'LPM';
    result.operands = `${reg(d5)}, Z+`;
  } else if ((opcode & 0xfe0f) === 0x9406) {
    result.mnemonic = 'LSR';
    result.operands = reg(d5);
  } else if ((opcode & 0xfc00) === 0x2c00) {
    result.mnemonic = 'MOV';
    result.operands = `${reg(d5)}, ${reg(r5)}`;
  } else if ((opcode & 0xff00) === 0x0100) {
    const rd = 2 * ((opcode & 0xf0) >> 4);
    const rr = 2 * (opcode & 0xf);
    result.mnemonic = 'MOVW';
    result.operands = `${reg(rd)}, ${reg(rr)}`;
  } else if ((opcode & 0xfc00) === 0x9c00) {
    result.mnemonic = 'MUL';
    result.operands = `${reg(d5)}, ${reg(r5)}`;
  } else if ((opcode & 0xff00) === 0x0200) {
    const d = ((opcode & 0xf0) >> 4) + 16;
    const r = (opcode & 0xf) + 16;
    result.mnemonic = 'MULS';
    result.operands = `${reg(d)}, ${reg(r)}`;
  } else if ((opcode & 0xff88) === 0x0300) {
    const d = ((opcode & 0x70) >> 4) + 16;
    const r = (opcode & 7) + 16;
    result.mnemonic = 'MULSU';
    result.operands = `${reg(d)}, ${reg(r)}`;
  } else if ((opcode & 0xfe0f) === 0x9401) {
    result.mnemonic = 'NEG';
    result.operands = reg(d5);
  } else if ((opcode & 0xfc00) === 0x2800) {
    result.mnemonic = 'OR';
    result.operands = `${reg(d5)}, ${reg(r5)}`;
  } else if ((opcode & 0xf000) === 0x6000) {
    result.mnemonic = 'ORI';
    result.operands = `${reg(d4)}, ${hex8(K8)}`;
  } else if ((opcode & 0xf800) === 0xb800) {
    result.mnemonic = 'OUT';
    result.operands = `${hex8(A6)}, ${reg(d5)}`;
  } else if ((opcode & 0xfe0f) === 0x900f) {
    result.mnemonic = 'POP';
    result.operands = reg(d5);
  } else if ((opcode & 0xfe0f) === 0x920f) {
    result.mnemonic = 'PUSH';
    result.operands = reg(d5);
  } else if ((opcode & 0xf000) === 0xd000) {
    const k = signExtend(opcode & 0xfff, 12);
    result.mnemonic = 'RCALL';
    result.operands = wordAddr(pc + k + 1);
  } else if (opcode === 0x9508) {
    result.mnemonic = 'RET';
  } else if (opcode === 0x9518) {
    result.mnemonic = 'RETI';
  } else if ((opcode & 0xf000) === 0xc000) {
    const k = signExtend(opcode & 0xfff, 12);
    result.mnemonic = 'RJMP';
    result.operands = wordAddr(pc + k + 1);
  } else if ((opcode & 0xfe0f) === 0x9407) {
    result.mnemonic = 'ROR';
    result.operands = reg(d5);
  } else if ((opcode & 0xfc00) === 0x0800) {
    result.mnemonic = 'SBC';
    result.operands = `${reg(d5)}, ${reg(r5)}`;
  } else if ((opcode & 0xf000) === 0x4000) {
    result.mnemonic = 'SBCI';
    result.operands = `${reg(d4)}, ${hex8(K8)}`;
  } else if ((opcode & 0xff00) === 0x9a00) {
    result.mnemonic = 'SBI';
    result.operands = `${hex8(A5)}, ${b3}`;
  } else if ((opcode & 0xff00) === 0x9900) {
    result.mnemonic = 'SBIC';
    result.operands = `${hex8(A5)}, ${b3}`;
  } else if ((opcode & 0xff00) === 0x9b00) {
    result.mnemonic = 'SBIS';
    result.operands = `${hex8(A5)}, ${b3}`;
  } else if ((opcode & 0xff00) === 0x9700) {
    const pair = 2 * ((opcode & 0x30) >> 4) + 24;
    const K = (opcode & 0xf) | ((opcode & 0xc0) >> 2);
    result.mnemonic = 'SBIW';
    result.operands = `${reg(pair)}, ${K}`;
  } else if ((opcode & 0xfe08) === 0xfc00) {
    result.mnemonic = 'SBRC';
    result.operands = `${reg(d5)}, ${b3}`;
  } else if ((opcode & 0xfe08) === 0xfe00) {
    result.mnemonic = 'SBRS';
    result.operands = `${reg(d5)}, ${b3}`;
  } else if (opcode === 0x9588) {
    result.mnemonic = 'SLEEP';
  } else if (opcode === 0x95e8) {
    result.mnemonic = 'SPM';
  } else if (opcode === 0x95f8) {
    result.mnemonic = 'SPM';
    result.operands = 'Z+';
  } else if ((opcode & 0xfe0f) === 0x9200) {
    // STS
    result.mnemonic = 'STS';
    result.operands = `${hex16(opcode2 ?? 0)}, ${reg(d5)}`;
  } else if ((opcode & 0xfe0f) === 0x920c) {
    result.mnemonic = 'ST';
    result.operands = `X, ${reg(d5)}`;
  } else if ((opcode & 0xfe0f) === 0x920d) {
    result.mnemonic = 'ST';
    result.operands = `X+, ${reg(d5)}`;
  } else if ((opcode & 0xfe0f) === 0x920e) {
    result.mnemonic = 'ST';
    result.operands = `-X, ${reg(d5)}`;
  } else if ((opcode & 0xfe0f) === 0x8208) {
    result.mnemonic = 'ST';
    result.operands = `Y, ${reg(d5)}`;
  } else if ((opcode & 0xfe0f) === 0x9209) {
    result.mnemonic = 'ST';
    result.operands = `Y+, ${reg(d5)}`;
  } else if ((opcode & 0xfe0f) === 0x920a) {
    result.mnemonic = 'ST';
    result.operands = `-Y, ${reg(d5)}`;
  } else if ((opcode & 0xd208) === 0x8208 && q6 !== 0) {
    result.mnemonic = 'STD';
    result.operands = `Y+${q6}, ${reg(d5)}`;
  } else if ((opcode & 0xfe0f) === 0x8200) {
    result.mnemonic = 'ST';
    result.operands = `Z, ${reg(d5)}`;
  } else if ((opcode & 0xfe0f) === 0x9201) {
    result.mnemonic = 'ST';
    result.operands = `Z+, ${reg(d5)}`;
  } else if ((opcode & 0xfe0f) === 0x9202) {
    result.mnemonic = 'ST';
    result.operands = `-Z, ${reg(d5)}`;
  } else if ((opcode & 0xd208) === 0x8200 && q6 !== 0) {
    result.mnemonic = 'STD';
    result.operands = `Z+${q6}, ${reg(d5)}`;
  } else if ((opcode & 0xfc00) === 0x1800) {
    result.mnemonic = 'SUB';
    result.operands = `${reg(d5)}, ${reg(r5)}`;
  } else if ((opcode & 0xf000) === 0x5000) {
    result.mnemonic = 'SUBI';
    result.operands = `${reg(d4)}, ${hex8(K8)}`;
  } else if ((opcode & 0xfe0f) === 0x9402) {
    result.mnemonic = 'SWAP';
    result.operands = reg(d5);
  } else if (opcode === 0x95a8) {
    result.mnemonic = 'WDR';
  } else if ((opcode & 0xfe0f) === 0x9204) {
    result.mnemonic = 'XCH';
    result.operands = `Z, ${reg(d5)}`;
  } else if (opcode === 0x9598) {
    result.mnemonic = 'BREAK';
  }

  return result;
}

export function disassembleProgram(progMem: Uint16Array, maxAddr?: number): DisassembledInstruction[] {
  const instructions: DisassembledInstruction[] = [];
  const end = maxAddr ?? progMem.length;

  let pc = 0;
  while (pc < end) {
    // Skip trailing zeros (empty program space)
    if (progMem[pc] === 0 && pc > 0) {
      // Check if rest is all zeros
      let allZero = true;
      for (let i = pc; i < Math.min(pc + 16, end); i++) {
        if (progMem[i] !== 0) { allZero = false; break; }
      }
      if (allZero) {
        // Include one NOP then stop
        instructions.push(disassembleInstruction(progMem, pc));
        break;
      }
    }

    const inst = disassembleInstruction(progMem, pc);
    instructions.push(inst);
    pc += inst.size;
  }
  return instructions;
}
