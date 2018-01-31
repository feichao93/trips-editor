import './preloaded'
import { makeDOMDriver } from '@cycle/dom'
import { run } from '@cycle/run'
import 'normalize.css'
import App from './App'
import makeFileSaverDriver from './makeFileSaverDriver'
import makeFileDriver from './makeFileDriver'
import makeKeyboardDriver from './makeKeyboardDriver'
import makeWindowEventDriver from './makeWindowEventDriver'

run(App, {
  DOM: makeDOMDriver('#container'),
  FILE: makeFileDriver(),
  keyboard: makeKeyboardDriver(),
  mouseup: makeWindowEventDriver('mouseup'),
  mousemove: makeWindowEventDriver('mousemove'),
  SAVE: makeFileSaverDriver(),
})
