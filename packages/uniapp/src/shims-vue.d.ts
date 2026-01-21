/// <reference types="@dcloudio/types" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_APP_VERSION: string
  readonly VITE_OPENCODE_SERVER_HOST: string
  readonly VITE_OPENCODE_SERVER_PORT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __UNI__: {
  platform: 'Web' | 'App' | 'mp-weixin' | 'mp-alipay' | 'mp-baidu' | 'mp-toutiao'
}

declare module '*.json' {
  const value: any
  export default value
}

declare module '@hyoga/uni-socket.io' {
  import { Socket, Manager } from 'socket.io-client'
  interface SocketIOStatic {
    (url: string, options?: any): Socket
    Manager: typeof Manager
  }
  const socketIO: SocketIOStatic
  export default socketIO
}
