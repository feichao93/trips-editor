import xs, { Stream } from 'xstream'
import { ZIndexOp } from './State'

export type UIIntent = UIIntent.ALL

export namespace UIIntent {
  export type ALL = 'toggle-lock' | Edit | ApplyStylePreset | ChangeZIndex | ToggleSemanticLabel

  export interface Edit {
    type: 'edit'
    field: string
    value: string
  }

  export interface ApplyStylePreset {
    type: 'apply-style-preset'
    name: string
  }

  export interface ChangeZIndex {
    type: 'change-z-index'
    op: ZIndexOp
  }

  export interface ToggleSemanticLabel {
    type: 'toggle-semantic-label'
    label: string
  }
}

export default class UIClass {
  private intent$: Stream<UIIntent> = xs.create()

  intent<T>(interestedType: string): Stream<T> {
    return this.intent$.filter(intent => {
      if (typeof intent === 'string') {
        return intent === interestedType
      } else {
        return intent.type === interestedType
      }
    }) as any
  }

  imitate(intentSource$: Stream<UIIntent>) {
    this.intent$.imitate(intentSource$)
  }
}
