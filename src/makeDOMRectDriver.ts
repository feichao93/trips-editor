import xs, { Stream, MemoryStream } from 'xstream'
import fromEvent from 'xstream/extra/fromEvent'

const init = {
  left: 0,
  top: 0,
  bottom: 0,
  right: 0,
  height: window.innerHeight,
  width: window.innerWidth,
} as DOMRect

export default function makeDOMRectDriver(selector: string) {
  return function DOMRectDriver(trigger$: Stream<any>): MemoryStream<DOMRect> {
    const resize$ = fromEvent(window as any, 'resize')
    return xs
      .create<DOMRect>({
        start(listener) {
          xs.merge(resize$, trigger$).addListener({
            next() {
              const element = document.querySelector(selector)
              if (element != null) {
                listener.next(element.getBoundingClientRect() as DOMRect)
              }
            },
          })
        },
        stop() {},
      })
      .startWith(init)
  }
}
