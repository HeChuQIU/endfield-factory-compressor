import { init } from 'z3-solver'

type Z3Api = {
  Context: new (name: string) => any
}

let initPromise: Promise<Z3Api> | null = null

export async function getZ3Api(onProgress?: (stage: string) => void): Promise<Z3Api> {
  if (!initPromise) {
    initPromise = (async () => {
      onProgress?.('加载 Z3 模块…')
      const api = await init()
      return api as Z3Api
    })()
  }

  const api = await initPromise
  onProgress?.('Z3 模块已就绪')
  return api
}

export async function createContext(): Promise<any> {
  const api = await getZ3Api()
  return new api.Context('endfield')
}
