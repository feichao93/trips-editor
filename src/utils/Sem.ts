import { Record, Set } from 'immutable'
import { h } from '@cycle/dom'
import { Point, AppConfig } from '../interfaces'

const SemRecord = Record({
  label: '',
  show: true,
  tags: Set<string>(),
  dx: 0,
  dy: 0,
  fontSize: 20,
})

export default class Sem extends SemRecord {
  static fromJS(object: any) {
    return new Sem(object).update('tags', Set)
  }

  showLabel() {
    return this.label.length > 0 && this.show
  }

  renderLabel(x: number, y: number, config: AppConfig) {
    if (this.label && this.show) {
      const lines = this.label.split('\\n')
      return h(
        'g',
        {
          key: 'label',
          attrs: {
            transform: `translate(${x + this.dx}, ${y + this.dy + this.fontSize})`,
            'font-size': this.fontSize,
          },
        },
        lines.map((txt, i) => h('text', { key: i, attrs: { dy: i * this.fontSize * 1.2 } }, txt)),
      )
    } else {
      return null
    }
  }
}
