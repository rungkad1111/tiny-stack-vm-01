// A faithful interpreter for make.fun's tiny stack ISA.
// run(program, input) -> { o: stdout bytes, e: exit code }
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function run(P: Uint8Array, inp: Uint8Array) {
  const n = P.length;
  const S = new Int32Array(256), C = new Int32Array(64);
  const M = new Int32Array(256), O = new Uint8Array(65536);
  let s = 0, c = 0, ol = 0, ip = 0, pc = 0, st = 0;
  const T = (e: number) => ({ o: O.slice(0, ol), e });
  for (;;) {
    if (st === 1e6) return T(10); // step limit first
    if (pc < 0 || pc >= n) return T(9); // then the pc range
    const op = P[pc];
    if (!(op < 8 || (op >= 0x10 && op <= 0x22) || (op >= 0x30 && op <= 0x34) ||
      op === 0x40 || op === 0x41 || (op >= 0x50 && op <= 0x53))) return T(5);
    const im = op === 1 ? 1 : op === 2 ? 4 : op >= 0x30 && op <= 0x33 ? 2 : 0;
    if (pc + im >= n) return T(9); // a cut-off immediate
    st++;
    const nx = pc + 1 + im;
    pc = nx;
    const rel = im === 2 ? ((P[nx - 2] | (P[nx - 1] << 8)) << 16) >> 16 : 0;
    switch (op) {
      case 0x00: return T(0); // HALT
      case 0x01: // PUSH8
        if (s > 255) return T(3);
        S[s++] = (P[nx - 1] << 24) >> 24; break;
      case 0x02: // PUSH32
        if (s > 255) return T(3);
        S[s++] = P[nx - 4] | (P[nx - 3] << 8) | (P[nx - 2] << 16) | (P[nx - 1] << 24); break;
      case 0x03: if (s < 1) return T(2); s--; break; // POP
      case 0x04: // DUP
        if (s < 1) return T(2);
        if (s > 255) return T(3);
        S[s] = S[s - 1]; s++; break;
      case 0x05: { // SWAP
        if (s < 2) return T(2);
        const t = S[s - 1]; S[s - 1] = S[s - 2]; S[s - 2] = t; break;
      }
      case 0x06: // OVER
        if (s < 2) return T(2);
        if (s > 255) return T(3);
        S[s] = S[s - 2]; s++; break;
      case 0x07: { // ROT: ( a b c -- b c a )
        if (s < 3) return T(2);
        const t = S[s - 3]; S[s - 3] = S[s - 2]; S[s - 2] = S[s - 1]; S[s - 1] = t; break;
      }
      case 0x17: if (s < 1) return T(2); S[s - 1] = -S[s - 1]; break; // NEG (store wraps)
      case 0x1b: if (s < 1) return T(2); S[s - 1] = ~S[s - 1]; break; // NOT
      case 0x30: pc = nx + rel; break; // JMP
      case 0x31: case 0x32: { // JZ / JNZ
        if (s < 1) return T(2);
        const v = S[--s];
        if ((op === 0x31) === (v === 0)) pc = nx + rel;
        break;
      }
      case 0x33: // CALL
        if (c > 63) return T(7);
        C[c++] = nx; pc = P[nx - 2] | (P[nx - 1] << 8); break;
      case 0x34: if (c < 1) return T(8); pc = C[--c]; break; // RET
      case 0x40: { // LOAD
        if (s < 1) return T(2);
        const a = S[s - 1];
        if (a < 0 || a > 255) return T(6);
        S[s - 1] = M[a]; break;
      }
      case 0x41: { // STORE: ( v addr -- )
        if (s < 2) return T(2);
        const a = S[s - 1];
        if (a < 0 || a > 255) return T(6);
        M[a] = S[s - 2]; s -= 2; break;
      }
      case 0x50: { // PRINT
        if (s < 1) return T(2);
        const w = String(S[s - 1]);
        if (ol + w.length > 65536) return T(11); // writes none of its bytes
        s--;
        for (let i = 0; i < w.length; i++) O[ol++] = w.charCodeAt(i);
        break;
      }
      case 0x51: // PUTC
        if (s < 1) return T(2);
        if (ol === 65536) return T(11);
        O[ol++] = S[--s] & 255; break;
      case 0x52: // IN
        if (s > 255) return T(3);
        S[s++] = ip < inp.length ? inp[ip++] : -1; break;
      case 0x53: if (s < 1) return T(2); return T(S[--s] & 255); // EXIT
      default: { // binary ops: pop b, then a, push the result
        if (s < 2) return T(2);
        const b = S[s - 1], a = S[s - 2];
        let r: number;
        if (op >= 0x13 && op <= 0x16 && !b) return T(4); // DIV/MOD/DIVU/MODU by zero
        switch (op) {
          case 0x10: r = a + b; break;
          case 0x11: r = a - b; break;
          case 0x12: r = Math.imul(a, b); break; // exact low 32 bits
          case 0x13: r = (a / b) | 0; break; // truncates; |0 re-wraps 2^31
          case 0x14: r = b === -1 ? 0 : a % b; break; // sign of a
          case 0x15: r = ((a >>> 0) / (b >>> 0)) | 0; break;
          case 0x16: r = ((a >>> 0) % (b >>> 0)) | 0; break;
          case 0x18: r = a & b; break;
          case 0x19: r = a | b; break;
          case 0x1a: r = a ^ b; break;
          case 0x1c: r = a << (b & 31); break;
          case 0x1d: r = a >> (b & 31); break;
          case 0x1e: r = (a >>> (b & 31)) | 0; break;
          case 0x20: r = a === b ? 1 : 0; break;
          case 0x21: r = a < b ? 1 : 0; break;
          default: r = (a >>> 0) < (b >>> 0) ? 1 : 0; // 0x22 LTU
        }
        s--;
        S[s - 1] = r;
      }
    }
  }
}

// Entry point: one output pair per input program. Runs only when this file
// is executed directly, never when a harness imports run().
const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const D = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
if (process.argv[1]?.endsWith('main.ts'))
  for (const id of readdirSync(I).sort()) {
    const r = run(readFileSync(join(I, id, 'program.bin')), readFileSync(join(I, id, 'input.bin')));
    mkdirSync(join(D, id), { recursive: true });
    writeFileSync(join(D, id, 'stdout.bin'), r.o);
    writeFileSync(join(D, id, 'exit.txt'), r.e + '\n');
  }
