import { useEffect, useRef } from 'react'

const MAX_FONT_PX = 21
const MIN_FONT_PX = 13
const STEP_PX = 0.5

/** Shrinks an element's font size (down to a floor) so `text` stays on one
 * line instead of wrapping, re-measuring whenever its container resizes. */
export function useShrinkToFit(text: string) {
  const ref = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const el = ref.current
    const container = el?.parentElement
    if (!el || !container) return

    function fit() {
      if (!el) return
      let size = MAX_FONT_PX
      el.style.fontSize = `${size}px`
      while (el.scrollWidth > el.clientWidth && size > MIN_FONT_PX) {
        size -= STEP_PX
        el.style.fontSize = `${size}px`
      }
    }

    const observer = new ResizeObserver(fit)
    observer.observe(container)
    return () => observer.disconnect()
  }, [text])

  return ref
}
