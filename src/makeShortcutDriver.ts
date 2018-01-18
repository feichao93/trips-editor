import { fromJS, Map } from 'immutable'
import xs, { Stream } from 'xstream'

const MouseTrap = require('mousetrap')

export class ShortcutSource {
  shortcut(key: string | string[]): Stream<KeyboardEvent> {
    return this.getStream(key, undefined)
  }
  keydown(key: string | string[]): Stream<KeyboardEvent> {
    return this.getStream(key, 'keydown')
  }
  keyup(key: string | string[]): Stream<KeyboardEvent> {
    return this.getStream(key, 'keyup')
  }
  keypress(key: string | string[]): Stream<KeyboardEvent> {
    return this.getStream(key, 'keypress')
  }

  isPressing(key: string): Stream<boolean> {
    const streamKey = fromJS({ type: 'ispressing', key })
    if (!this.streamMap.has(streamKey)) {
      const keypress$ = this.getStream(key, 'keypress')
      const keyup$ = this.getStream(key, 'keyup')
      const stream = xs
        .merge(keypress$.mapTo(true), keyup$.mapTo(false))
        .startWith(false)
        .dropRepeats()
      this.streamMap = this.streamMap.set(streamKey, stream)
    }
    return this.streamMap.get(streamKey)
  }

  private streamMap = Map<string, Stream<any>>()

  private getStream<T>(key: string | string[], type: string) {
    const streamKey = fromJS({ type, key })
    if (!this.streamMap.has(streamKey)) {
      const stream = xs.create({
        start(listener) {
          MouseTrap.bind(
            key,
            (e: KeyboardEvent, combo: string | string[]) => listener.next(e),
            type,
          )
        },
        stop() {},
      })
      this.streamMap = this.streamMap.set(streamKey, stream)
    }
    return this.streamMap.get(streamKey)
  }
}

export default function makeShortcutDriver() {
  return function shortcutDriver() {
    return new ShortcutSource()
  }
}
