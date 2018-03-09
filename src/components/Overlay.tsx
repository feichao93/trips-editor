import { div, DOMSource, VNode } from '@cycle/dom'
import { Stream } from 'xstream'
import '../styles/Overlay.styl'

export interface Sources {
  overlayType: Stream<string>
  DOM: DOMSource
}

export interface Sinks {
  DOM: Stream<VNode>
  closeOverlay: Stream<any>
}

const tripsUrl = 'https://longaspire.github.io/trips/'

declare const BUILD_VERSION: string
declare const BUILD_TIME: string

export default function Overlay({ overlayType: overlayType$, DOM: domSource }: Sources): Sinks {
  return {
    DOM: overlayType$.map(type => (
      <div className="overlay">
        <div className={'content' + (type === 'about' ? ' show' : '')}>
          <button className="close">CLOSE</button>
          <h1>Editor</h1>
          <p>
            A simple SVG editor which focuses on editing polygons/polylines and attaching semantic
            data to them. This simple editor is part of{' '}
            <a href={tripsUrl} target="_blank">
              TRIPS
            </a>.
          </p>
          <p>
            If you're interested in this editor, you can view documentation on{' '}
            <a href="https://github.com/shinima/editor" target="_blank">
              GitHub
            </a>. There is also{' '}
            <a href="https://zhuanlan.zhihu.com/p/34026505" target="_blank">
              an article in Chinese
            </a>{' '}
            describing undo/redo functionalities in this editor.
          </p>
          <p>Version: {BUILD_VERSION}</p>
          <p>Date: {BUILD_TIME}</p>
          <p>License: MIT</p>
        </div>
        <div className={'content' + (type === 'shortcut' ? ' show' : '')}>
          <button className="close">CLOSE</button>
          <h1>Shortcut</h1>
          <div className="shortcut-list">
            <p>
              <b>ESC</b> Abort current interaction and return back to idle
            </p>
            <p>
              <b>S / G / H</b> Switch among semantic tabs
            </p>
            <p>
              <b>Ctrl + C / Ctrl + V</b> Copy and paste
            </p>
            <p>
              <b>Ctrl + Z / Ctrl + Y</b> Undo and redo
            </p>
            <p>
              <b>L / R / P</b> Start drawing line / rectangle / polygon
            </p>
            <p>
              <b>B</b> Toggle lock
            </p>
            <p>
              <b>E</b> Toggle selection mode
            </p>
            <p>
              <b>Num 1 / 2 / 3</b> Zoom
            </p>
          </div>
        </div>
      </div>
    )),
    closeOverlay: domSource.select('.close').events('click'),
  }
}
