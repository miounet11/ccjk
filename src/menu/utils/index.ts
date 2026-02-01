/**
 * 菜单系统工具模块
 */

// 项目检测器
export { detectProjectInfo } from './project-detector.js'

// UX 辅助工具
export {
  createSpinner,
  showProgress,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showTip,
  showDivider,
  showTitle,
  showList,
  showKeyValue,
  confirm,
  input,
  select,
  multiSelect,
  clearScreen,
  pause,
} from './ux-helpers.js'
