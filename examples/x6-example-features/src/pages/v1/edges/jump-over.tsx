import React from 'react'
import { v1 } from '@antv/x6'
import '../../index.less'
import '../index.less'

export default class Example extends React.Component {
  private container: HTMLDivElement

  componentDidMount() {
    const graph = new v1.Graph({
      container: this.container,
      width: 1000,
      height: 600,
      gridSize: 10,
    })

    const rect = graph.createNode({
      type: 'rect',
      x: 100,
      y: 50,
      width: 70,
      height: 30,
      attrs: {
        body: { fill: 'lightgray' },
        label: { text: 'rect', magnet: true },
      },
    })

    for (let i = 0; i < 6; i++) {
      const source = rect.clone().translate(i * 100, i * 10)
      graph.addNode(source)

      const target = source.clone().translate(0, 200)
      graph.addNode(target)

      const edge = graph.createEdge({
        source,
        target,
        type: 'edge',
      })

      if (i % 2 === 0) {
        edge.prop('connector', {
          name: 'jumpover',
          args: { jump: 'gap' },
        })
        edge.attr('line/stroke', 'red')
      }

      graph.addEdge(edge)
    }

    const crossRectA = rect.clone().pos(16, 100)
    graph.addNode(crossRectA)

    const crossRectB = rect.clone().pos(16, 200)
    graph.addNode(crossRectB)

    graph.addEdge({
      type: 'edge',
      source: crossRectA,
      target: crossRectB,
      connector: { name: 'jumpover' },
      attrs: {
        line: {
          stroke: 'red',
        },
      },
      vertices: [
        { x: 700, y: 190 },
        { x: 700, y: 280 },
      ],
    })
  }

  refContainer = (container: HTMLDivElement) => {
    this.container = container
  }

  render() {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#ffffff',
        }}
      >
        <div ref={this.refContainer} className="x6-graph" />
      </div>
    )
  }
}
