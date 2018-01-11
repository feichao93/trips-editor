import { DOMSource } from '@cycle/dom'
import { VNode } from 'snabbdom/vnode'
import { Stream } from 'xstream'
import '../styles/inspector.styl'

export interface Sources {
  DOM: DOMSource
  interaction: Stream<string>
}

export interface Sinks {
  DOM: Stream<VNode>
}

export default function Inspector(sources: Sources): Sinks {
  const vdom$ = sources.interaction.map(interaction => (
    <div className="inspector">
      <p>Current Interaction: {interaction} </p>
    </div>
  ))
  return {
    DOM: vdom$,
  }
}
