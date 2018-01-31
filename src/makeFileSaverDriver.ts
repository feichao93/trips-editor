import { Stream } from 'xstream'
import { SaveConfig } from './interfaces'
import { saveAs } from 'file-saver'

export default function makeFileSaverDriver() {
  return function fileSaverDriver(saveConfig$: Stream<SaveConfig>) {
    saveConfig$.addListener({
      next(config) {
        saveAs(config.blob, config.filename)
      },
    })
  }
}
