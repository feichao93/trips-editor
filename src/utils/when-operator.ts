import { Operator, Stream, InternalListener } from 'xstream'

const NO = {}

class WhenOperatorListener<T, U> implements InternalListener<U> {
  constructor(private p: WhenOperator<T, U>) {}

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

class WhenOperator<T, U> implements Operator<T, T> {
  public type = 'when'
  ins: Stream<T>
  out: Stream<T> = NO as any
  lastVal = NO as U
  peekStream: Stream<U> = NO as any
  il: WhenOperatorListener<T, U>
  filterFn: (u: U) => boolean

  constructor(ins: Stream<T>, peekStream: Stream<U>, filterFn: (u: U) => boolean) {
    this.ins = ins
    this.peekStream = peekStream
    this.filterFn = filterFn
  }

  _start(out: Stream<T>): void {
    this.out = out
    this.il = new WhenOperatorListener(this)
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
    if (this.filterFn(this.lastVal)) {
      this.out._n(t)
    }
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

/**
 *  `a$.when($b, fn)` is equivalent to
 *  ```
 *  a$.compose(sampleCombine($b))
 *    .filter(([a, b]) => fn(b))
 *    .map(([a, b]) => a)
 *  ```
 */
export default function when<T, U>(peekStream: Stream<U>, filterFn: (u: U) => boolean) {
  return function whenOperator(ins: Stream<T>) {
    return new Stream<T>(new WhenOperator<T, U>(ins, peekStream, filterFn))
  }
}
