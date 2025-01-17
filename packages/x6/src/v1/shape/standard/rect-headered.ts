import { NodeRegistry } from '../../registry'
import { bodyAttr, labelAttr } from './util'

export const HeaderedRect = NodeRegistry.register('rect-headered', {
  markup: [
    {
      tagName: 'rect',
      selector: 'body',
    },
    {
      tagName: 'rect',
      selector: 'header',
    },
    {
      tagName: 'text',
      selector: 'headerText',
    },
    {
      tagName: 'text',
      selector: 'bodyText',
    },
  ],
  attrs: {
    body: {
      ...bodyAttr,
      refWidth: '100%',
      refHeight: '100%',
    },
    header: {
      ...bodyAttr,
      refWidth: '100%',
      height: 30,
      stroke: '#000000',
    },
    headerText: {
      ...labelAttr,
      refX: '50%',
      refY: 15,
      fontSize: 16,
    },
    bodyText: {
      ...labelAttr,
      refY2: 15,
    },
  },
})
