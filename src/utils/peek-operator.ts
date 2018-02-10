import { Operator, Stream, InternalListener } from 'xstream'

const NO = {}

class PeekListener<T, U> implements InternalListener<U> {
  constructor(private p: PeekOperator<T, U>) {}

  _n(u: U) {
    const p = this.p
    if (p.out === NO) {
      return
    }
    p.lastVal = u
  }

  _e(err: any) {
    this.p._e(err)
  }

  _c() {
    this.p.peekStream._remove(this)
  }
}

class PeekOperator<T, U> implements Operator<T, U> {
  public type = 'peek'
  ins: Stream<T>
  out: Stream<U> = NO as any
  lastVal = NO as U
  peekStream: Stream<U> = NO as any
  il: PeekListener<T, U>

  constructor(ins: Stream<T>, peekStream: Stream<U>) {
    this.ins = ins
    this.peekStream = peekStream
  }

  _start(out: Stream<U>): void {
    this.out = out
    this.il = new PeekListener(this)
    this.peekStream._add(this.il)
    this.ins._add(this)
  }

  _stop(): void {
    this.ins._remove(this)
    this.peekStream._remove(this.il)
    this.out = null
  }

  _n(t: T) {
    if (this.out === NO) {
      return
    }
    if (this.lastVal === NO) {
      return
    }
    this.out._n(this.lastVal)
  }

  _e(err: any) {
    if (this.out) {
      this.out._e(err)
    }
  }

  _c() {
    if (this.out) {
      this.out._c()
    }
  }
}
export default function peek<T, U>(peekStream: Stream<U>) {
  return function peekOperator(ins: Stream<T>) {
    return new Stream<U>(new PeekOperator<T, U>(ins, peekStream))
  }
}
