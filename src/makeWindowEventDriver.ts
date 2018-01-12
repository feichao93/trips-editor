import xs, { Stream } from 'xstream'

export default function makeWindowEventDriver<K extends keyof WindowEventMap>(
  eventType: K,
): () => Stream<WindowEventMap[K]> {
  let callback: any
  return function eventStream() {
    return xs.create({
      start(observer) {
        callback = (e: WindowEventMap[K]) => observer.next(e)
        window.addEventListener(eventType, callback)
      },
      stop() {
        window.removeEventListener(eventType, callback)
      },
    })
  }
}
