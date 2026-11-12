import { cloneElement, options, toChildArray } from 'preact'
import type { ComponentChildren, VNode } from 'preact'
import { Router as OriginalRouter, route as originalRoute, getCurrentUrl as originalUrl } from 'preact-router-original'
export * from 'preact-router-original'
import type { RouterProps } from 'preact-router-original'

export const prefix = '/misode'
export function localUrl(url: string) {
  return url.startsWith('/') && !url.startsWith('//') && url !== prefix && !url.startsWith(prefix + '/')
    ? prefix + url : url
}
function appUrl(url: string) {
  return url === prefix ? '/' : url.startsWith(prefix + '/') ? url.slice(prefix.length) : url
}
export function getCurrentUrl() { return appUrl(originalUrl()) }
export function route(url: string | { url: string, replace?: boolean }, replace?: boolean) {
  return typeof url === 'string'
    ? originalRoute(localUrl(url), replace)
    : originalRoute({ ...url, url: localUrl(url.url) })
}
export function Router(props: RouterProps & { children?: ComponentChildren }) {
  const children = toChildArray(props.children).map(child => {
    if (typeof child !== 'object' || child === null) return child
    const vnode = child as VNode<{ path?: string }>
    return vnode.props.path ? cloneElement(vnode, { path: localUrl(vnode.props.path) }) : vnode
  })
  return <OriginalRouter {...props}>{children}</OriginalRouter>
}

// Cover both router Links and ordinary anchors, including dynamically generated cards.
const previousHook = options.vnode
options.vnode = vnode => {
  previousHook?.(vnode)
  const props = vnode.props as { href?: string, 'data-native'?: boolean }
  if (!props['data-native'] && typeof props.href === 'string') props.href = localUrl(props.href)
}
