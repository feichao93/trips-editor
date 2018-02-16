import './preloaded'
import { makeDOMDriver } from '@cycle/dom'
import { run } from '@cycle/run'
import 'normalize.css'
import App from './App'
import makeDOMRectDriver from './makeDOMRectDriver'
import makeFileDriver from './makeFileDriver'
import makeFileSaverDriver from './makeFileSaverDriver'
import makeKeyboardDriver from './makeKeyboardDriver'
import makeWindowEventDriver from './makeWindowEventDriver'

run(App, {
  DOM: makeDOMDriver('#container'),
  FILE: makeFileDriver(),
  keyboard: makeKeyboardDriver(),
  mouseup: makeWindowEventDriver('mouseup'),
  mousemove: makeWindowEventDriver('mousemove'),
  SAVE: makeFileSaverDriver(),
  svgDOMRect: makeDOMRectDriver('.svg'),
})
