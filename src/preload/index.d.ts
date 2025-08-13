import { ElectronAPI } from '@electron-toolkit/preload'
import { FrontendAPI } from '../types/api'

declare global {
  interface Window {
    electron: ElectronAPI
    api: FrontendAPI
  }
}
