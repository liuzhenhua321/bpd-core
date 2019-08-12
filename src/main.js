/**
 * 入口文件
 * @author ctank
 */
import './assets/styles/bpd-core.scss'

import eventBus from './core/eventBus'
import draw from './draw/draw'

import $ from './utils/slimJQ'
import Ids from './utils/ids'
import { loadFont, setExportData } from './utils/utils'

import BpmnXML from './features/xml'
import Background from './features/background'
import Direction from './features/direction'
import Record from './features/record'
import ShapeAnchor from './features/anchor'
import ShapeSelect from './features/select'
import ShapeDrag from './features/drag'
import Snapline from './features/snapline'
import Tooltip from './features/tooltip'
import Hand from './features/hand'
import GroupPanel from './features/group-panel'
import HotKey from './features/hotkey'
import I18n from './features/i18n'

// 流程图模板
const DEFAULT_DEFINITION =
  '<?xml version="1.0" encoding="UTF-8"?>' +
  '<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
  'xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
  'xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" ' +
  'xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" ' +
  'targetNamespace="http://bpmn.io/schema/bpmn"' +
  '></bpmn:definitions>'

// 默认属性
const DEFAULT_OPTIONS = {
  ids: new Ids([32, 36, 1]),
  // 容器
  container: '',
  // 宽
  width: '100%',
  // 高
  height: '100%',
  // 比例
  scale: 1,
  // 只读
  readonly: false,
  // 页面样式
  pageStyle: {
    // 背景色
    backgroundColor: '255,255,255',
    // 高度
    height: 5000,
    // 宽度
    width: 5000
  },
  //
  // local: 'zh_TW',
  // 功能配置
  config: {},
  // bpmn样式
  bpmnStyle: {},
  // 图形样式
  shapeStyle: [],
  // 流程图定义
  definition: DEFAULT_DEFINITION || '',
  // 扩展属性
  extensions: {},
  // 过滤
  filter: [],
  // 支持节点
  bpmns: [
    'StartEvent',
    'UserTask',
    'ServiceTask',
    'ReceiveTask',
    'CallActivity',
    'ExclusiveGateway',
    'InclusiveGateway',
    'ParallelGateway',
    'ComplexGateway',
    'EndEvent',
    'TerminateEndEvent'
  ]
}

let IS_FONTLOAD = false

/**
 * 创建容器
 * @param {*} options
 */
const createContainer = options => {
  const container = $(options.container)
  if (!options.container || container.length <= 0) {
    throw new Error('Can not find container: ' + options.container)
  }
  const designerBox = $(
    '<div class="bpd-container"><div class="bpd-layout"><div class="bpd-designer"></div></div></div>'
  )
  designerBox.css({
    width: options.width,
    height: options.height
  })

  container.append(designerBox)

  // 初始化画布位置
  designerBox.find('.bpd-layout').css({
    top: (-options.pageStyle.height + container.height()) / 2,
    left: (-options.pageStyle.width + container.width()) / 2
  })

  return designerBox
}

/**
 * 初始化功能
 * @param {*} $container
 * @param {*} options
 */
const initFeatures = ($container, options) => {
  // 快捷键
  const hotKey = new HotKey()
  // 国际化
  const i18n = new I18n(options.local)
  // xml
  const bpmnXML = new BpmnXML(options.extensions)
  // 背景
  const background = new Background(
    $container,
    options,
    options.config.background
  )
  // 手
  const hand = new Hand($container, options.pageStyle)
  // 非只读状态时
  if (!options.readonly) {
    // 锚点
    const shapeAnchor = new ShapeAnchor($container, options.config.anchor)
    // 对齐
    const snapline = new Snapline($container, options.config.snapline)
    // 流向
    const direction = new Direction($container, options.config.direction)
    // 选择
    const shapeSelect = new ShapeSelect($container, options.config.select)
    // 记录
    const record = new Record()
    // 提示
    const tooltip = new Tooltip($container, options.config.tooltip)
    // 拖动
    const shapeDrag = new ShapeDrag(options, $container)
    // 组面板
    const groupPanel = new GroupPanel($container, options)
  }
}

class BPDCore {
  constructor(options = {}) {
    this.version = '1.1.0-beta.4'
    // 配置
    this.options = Object.assign({}, DEFAULT_OPTIONS, options)
    // 容器
    this.$container = createContainer(this.options)
    // 初始化功能
    initFeatures(this.$container, this.options)
    // 绘图
    this.draw = draw(this.options, this.$container)
    // 检查字体载入
    loadFont('bpmn', () => {
      IS_FONTLOAD = true
    })

    this.init()
  }

  init(callback = () => {}) {
    this.importBpmn(this.options.definition, callback)
  }

  /**
   * 创建图形
   * @param {Event} event
   */
  createShape(event, callback = () => {}) {
    const target = $(event.target)
    if (target.hasClass('readonly') || this.options.readonly) {
      return
    }
    const shapeName = target.attr('shapeName')
    if (!shapeName || shapeName === '') {
      throw new Error('shapeName error')
    }
    this.draw.createShape(shapeName, callback)
  }

  /**
   * 获取全部元素
   */
  getAllElement() {
    const elements = []
    const elementObj = eventBus.trigger('element.get')
    for (let id in elementObj) {
      const element = setExportData(elementObj[id])
      elements.push(element)
    }
    return elements
  }

  /**
   * 获取根元素
   */
  getRootElement() {
    let root = eventBus.trigger('process.get')
    if (root) {
      return setExportData(root)
    }
    return null
  }

  /**
   * 根据类型获取选中元素之前的元素
   * @param {Object} element
   * @param {String} bpmn
   */
  getFrontElementsByBpmn(element, bpmn) {
    return this.getFrontElements(
      eventBus.trigger('element.get', element.id)
    ).filter(element => element.bpmnName === bpmn)
  }

  /**
   * 获取选中元素之前的元素
   * @param {Object} element
   * @return {Object} 选中元素前一个节点元素
   */
  getFrontElement(element) {
    if (!element) {
      throw new Error('select element error')
    }
    let frontElement = null
    const frontElements = this.getFrontElements(
      eventBus.trigger('element.get', element.id)
    )
    frontElements.forEach(ele => {
      if (!frontElement && ele.bpmnName !== 'SequenceFlow') {
        frontElement = ele
      }
    })
    return frontElement
  }

  /**
   * 获取选中元素之前的全部元素
   * @param {Object} element
   */
  getFrontElements(element) {
    if (!element) {
      throw new Error('select element error')
    }
    const getFront = (elements, fronts = [], isStart = false) => {
      const elems = []
      if (!isStart) {
        elements.forEach(ele => {
          if (ele.shape.bpmnName === 'SequenceFlow') {
            if (ele.data.sourceRef && ele.sourceRef !== '') {
              const element =
                eventBus.trigger('element.get', ele.data.sourceRef) || []
              let hasElement = false
              fronts.forEach(ele => {
                if (ele.data.id === element.data.id) {
                  hasElement = true
                }
              })
              if (!hasElement) {
                elems.push(element)
                fronts.push(element)
              }
            }
          } else {
            const linkerIds =
              eventBus.trigger('connections.get', ele.data.id) || []
            linkerIds.forEach(id => {
              const linker = eventBus.trigger('element.get', id)
              if (linker.data.targetRef === ele.data.id) {
                let hasElement = false
                fronts.forEach(ele => {
                  if (ele.data.id === linker.data.id) {
                    hasElement = true
                  }
                })
                if (!hasElement) {
                  elems.push(linker)
                  fronts.push(linker)
                }
              }
            })
          }
        })

        if (elems.length <= 0) {
          return getFront(elems, fronts, true)
        } else {
          return getFront(elems, fronts)
        }
      } else {
        return fronts
      }
    }
    const frontElements = getFront([element])

    for (let i = 0; i < frontElements.length; i += 1) {
      frontElements[i] = setExportData(frontElements[i])
    }
    return frontElements
  }

  /**
   * 更新元素属性
   * @param {String} id
   * @param {Object} data
   */
  updateProperties(id, data, callback = () => {}) {
    data.extensions.forEach(dataExtension => {
      dataExtension.$type = dataExtension.name
      delete dataExtension.name
    })

    const element = eventBus.trigger('element.get', id)

    if (!element) {
      return
    }

    const original = Object.assign({}, data.original)
    for (let key in original) {
      element.data[key] = original[key]
    }

    const { extensionElements } = element.data
    const extensions = []
    if (!extensionElements.values) {
      extensionElements.values = []
    }
    extensionElements.values.forEach(shapeExtension => {
      let hasExtension = false
      data.extensions.forEach(dataExtension => {
        if (dataExtension.$type === shapeExtension.$type) {
          hasExtension = true
        }
      })
      if (!hasExtension) {
        extensions.push(shapeExtension)
      }
    })

    extensionElements.values = [...extensions, ...data.extensions]

    if (element.shape.bpmnName === 'SequenceFlow') {
    } else {
      eventBus.trigger('shape.render', {
        type: element.shape.bpmnName,
        element
      })
    }

    callback()
  }

  /**
   * 更新流程属性,目前仅支持标题和扩展属性
   * @param {Object} data
   */
  updateProcessProperties(data, callback = () => {}) {
    data.extensions.forEach(dataExtension => {
      dataExtension.$type = dataExtension.name
      delete dataExtension.name
    })

    const process = eventBus.trigger('process.get')

    if (!process) {
      return
    }

    const original = Object.assign({}, data.original)
    for (let key in original) {
      process[key] = original[key]
    }

    const extensions = []
    if (!process.extensionElements.values) {
      process.extensionElements.values = []
    }
    process.extensionElements.values.forEach(shapeExtension => {
      let hasExtension = false
      data.extensions.forEach(dataExtension => {
        if (dataExtension.$type === shapeExtension.$type) {
          hasExtension = true
        }
      })
      if (!hasExtension) {
        extensions.push(shapeExtension)
      }
    })

    process.extensionElements.values = [...extensions, ...data.extensions]

    callback()
  }

  updataLineStyle(id, style) {
    this.draw.updataLineStyle(id, style)
  }

  destroy() {
    this.$container.remove()
    this.draw.cancel()
    eventBus.trigger('key.clear')
    eventBus.destroy()
  }

  /**
   * 激活手模式
   */
  activateHand() {
    eventBus.trigger('hand.activate')
    this.draw.resetState()
  }

  /**
   * 激活选择模式
   */
  activateSelect() {
    if (!this.options.readonly) {
      eventBus.trigger('hand.destroy')
      eventBus.trigger('shape.multiSelect', {
        state: this.draw.state
      })
      this.draw.changeState('multiSelect')
    }
  }

  /**
   * 导入Bpmn
   */
  importBpmn(xmlStr, callback = () => {}) {
    const self = this
    let fontLoadCheck = setInterval(() => {
      if (IS_FONTLOAD) {
        clearInterval(fontLoadCheck)
        eventBus.trigger('model.import', xmlStr, (err, definitions) => {
          if (err) {
            console.log(err)
          } else {
            self.draw.render(definitions)
            // self.exportBpmn(function(xmlStrUpdated) {
            //   console.log('导出回调', xmlStrUpdated)
            // })
            // 执行回调
            callback()
          }
        })
      }
    }, 1000)
  }
  /**
   * 导出Bpmn
   */
  exportBpmn(callback = () => {}) {
    const self = this
    const definitions = this.draw.designer.createDefinition()
    eventBus.trigger('model.export', definitions, (err, xmlStrUpdated) => {
      if (err) {
        console.log(err, xmlStrUpdated)
      }
      callback(xmlStrUpdated)
    })
  }
}

export default BPDCore

window.BPDCore = BPDCore
