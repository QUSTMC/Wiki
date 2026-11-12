// Injected into McdocRenderer at build time; uses its existing Preact hooks.
function QustCompletionInput({ options, value, onValue, onCommit, className, id }: {
  options: string[], value: string, onValue: (value: string) => void,
  onCommit: (value: string) => void, className: string, id: string,
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [anchor, setAnchor] = useState<HTMLInputElement | null>(null)
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, height: 280 })
  const query = value.toLowerCase()
  const matches = useMemo(() => {
    const visible: string[] = []
    let count = 0
    for (const option of options) {
      if (query && !option.toLowerCase().includes(query)) continue
      count++
      if (visible.length < 60) visible.push(option)
    }
    return { visible, count }
  }, [options, query])
  useEffect(() => { setActive(-1) }, [query])
  useEffect(() => {
    if (!open || !anchor) return
    const close = () => setOpen(false)
    const outside = (e: Event) => {
      if (e.target instanceof Node && !anchor.contains(e.target) && !(e.target instanceof Element && e.target.closest('[data-qust-completions]'))) close()
    }
    const reposition = () => {
      const r = anchor.getBoundingClientRect()
      const width = Math.min(Math.max(r.width, 300), innerWidth - 16)
      const below = innerHeight - r.bottom - 12
      const above = r.top - 12
      const height = Math.min(280, Math.max(below, above))
      setPosition({ left: Math.max(8, Math.min(r.left, innerWidth - width - 8)), top: below >= Math.min(280, above) ? r.bottom + 4 : Math.max(8, r.top - height - 4), width, height })
    }
    reposition()
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', close)
    const scroll = (e: Event) => { if (!(e.target instanceof Element && e.target.closest('[data-qust-completions]'))) close() }
    window.addEventListener('scroll', scroll, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', scroll, true)
    }
  }, [open, anchor])
  useEffect(() => {
    if (active >= 0) document.getElementById(id + '-option-' + active)?.scrollIntoView({ block: 'nearest' })
  }, [active, id])
  const choose = (option: string) => { onValue(option); onCommit(option); setOpen(false); setActive(-1) }
  return <>
    <input ref={setAnchor} class={className} value={value} role="combobox" aria-autocomplete="list"
      aria-label="资源标识符" aria-expanded={open} aria-controls={open ? id : undefined}
      aria-activedescendant={open && active >= 0 ? id + '-option-' + active : undefined}
      autocomplete="off" spellcheck={false}
      onFocus={() => setOpen(true)}
      onClick={() => setOpen(true)}
      onInput={e => { onValue(e.currentTarget.value); setOpen(true); setActive(-1) }}
      onBlur={() => { setOpen(false); onCommit(anchor?.value ?? value) }}
      onKeyDown={e => {
        if (e.isComposing) return
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault(); e.stopPropagation(); setOpen(true)
          setActive(i => Math.max(0, Math.min(matches.visible.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1))))
        } else if (e.key === 'Enter') {
          e.preventDefault(); e.stopPropagation()
          if (open && active >= 0 && matches.visible[active]) choose(matches.visible[active])
          else { onCommit(e.currentTarget.value); setOpen(false) }
        } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false) }
        else if (e.key === 'Tab') setOpen(false)
      }} />
    {open && qustCreatePortal(<div data-qust-completions class="qust-completions" style={{ left: position.left, top: position.top, width: position.width, maxHeight: position.height }}>
      <div role="listbox" id={id} aria-label="资源标识符候选">
        {matches.visible.map((option, index) => <div role="option" id={id + '-option-' + index} aria-selected={index === active}
          class="qust-completion-option" key={option}
          onMouseDown={e => e.preventDefault()}
          onClick={() => choose(option)}>{option}</div>)}
      </div>
      <div class="qust-completion-status" role="status">{matches.count === 0 ? '无匹配项，可直接输入自定义标识符' : matches.count > 60 ? `显示前 60 / ${matches.count} 项，请继续输入以筛选` : `${matches.count} 项`}</div>
    </div>, document.body)}
  </>
}
