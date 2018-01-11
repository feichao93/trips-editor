import xs, { Stream } from 'xstream'

const MouseTrap = require('mousetrap')

export class ShortcutSource {
  shortcut<T = null>(key: string | string[], t: T = null): Stream<T> {
    return this.makeStream(key, undefined, t)
  }
  keydown<T = null>(key: string | string[], t: T = null): Stream<T> {
    return this.makeStream(key, 'keydown', t)
  }
  keyup<T = null>(key: string | string[], t: T = null): Stream<T> {
    return this.makeStream(key, 'keyup', t)
  }
  keypress<T = null>(key: string | string[], t: T = null): Stream<T> {
    return this.makeStream(key, 'keypress', t)
  }
  // TODO isolate

  private makeStream<T>(key: string | string[], type: string, t: T) {
    return xs.create<T>({
      start(listener) {
        MouseTrap.bind(key, () => listener.next(t), type)
      },
      stop() {
        MouseTrap.unbind(key)
      },
    })
  }
}

export default function makeShortcutDriver() {
  return function shortcutDriver() {
    return new ShortcutSource()
  }
}
