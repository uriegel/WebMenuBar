export class Menubar extends HTMLElement {
    constructor() {
        super()

        var style = document.createElement("style")
        document.head.appendChild(style)
        style.sheet.insertRule(`:root {
            --menubar-color: black;
            --menubar-background-color: white;
            --menubar-hover-color: lightblue;
            --menubar-selected-color: white;
            --menubar-selected-background-color: blue;
            --menubar-border-color: lightgray;
            --menubar-separator-color: lightgray;
            --menubar-shadow-color: rgba(0, 0, 0, 0.2);
        }`)

        this.isAccelerated = false
        this.isKeyboardActivated = false
        this.selectedIndex = -1
        this.attachShadow({ mode: 'open' })

        const template = document.createElement('template')
        template.innerHTML = ` 
            <style>
                .menubar {
                    user-select: none;
                    cursor: default;
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    height: 100%;
                }
                .invisible {
                    display: none;
                }
            </style>
            <ul class="menubar">
                <slot></slot>
            </ul>
        `
        this.shadowRoot.appendChild(template.content.cloneNode(true))
        this.style.outline = "none"
        this.setAttribute("tabindex", "-1")

        const items = Array.from(document.querySelectorAll('menubar-submenu'))
        this.itemCount = items.length
        items.forEach((n, i) => n.setAttribute("index", i))
        this.mnemonics = items.map((n, i) => {
            const header = n.getAttribute("header")
            const pos = header.indexOf('_')
            const key = pos != -1 ? header[pos + 1].toLowerCase() : null
            return ({key, index: i})
        })

        this.menubar = this.shadowRoot.querySelector('ul')
        this.autoMode = this.getAttribute("automode") == "true"
        if (this.autoMode)
            this.menubar.classList.add("invisible")
        this.getShortcuts()
    }

    get isAccelerated()  {
        return this._isAccelerated
    }
    set isAccelerated(value) {
        this._isAccelerated = value
        const items = Array.from(document.querySelectorAll('menubar-menuitem'))
        items.forEach(n => n.setAttribute("is-accelerated", value))
        const mainitems = Array.from(document.querySelectorAll('menubar-submenu'))
        mainitems.forEach(n => n.setAttribute("is-accelerated", value))
    }

    get isKeyboardActivated()  {
        return this._isKeyboardActivated
    }
    set isKeyboardActivated(value) {
        this._isKeyboardActivated = value
        const items = Array.from(document.querySelectorAll('menubar-submenu'))
        items.forEach(n => n.setAttribute("is-keyboard-activated", value))
    }
    
    get selectedIndex()  {
        return this._selectedIndex
    }
    set selectedIndex(value) {
        this._selectedIndex = value
        const items = Array.from(document.querySelectorAll('menubar-submenu'))
        items.forEach(n => n.setAttribute("selected-index", value))
    }

    connectedCallback() {
        document.addEventListener("keydown", evt => {
            if (this.autoMode && evt.keyCode == 18) { // alt
                if (this.menubar.classList.contains("invisible"))
                    this.menubar.classList.remove("invisible")
                else
                    this.menubar.classList.add("invisible")
                evt.preventDefault()
                evt.stopPropagation()
            }            
            if (evt.which == 18 && !evt.repeat && evt.code == "AltLeft") { // Alt 
                if (this.isAccelerated) {
                    this.closeMenu()
                    return
                }
                if (!this.isKeyboardActivated) {
                    if (this.selectedIndex == -1)
                        this.isKeyboardActivated = true
                    this.isAccelerated = true
                    this.lastActive = document.activeElement
                    this.focus()
                }
                evt.preventDefault()
                evt.stopPropagation()                
            }
            else if (evt.which == 27) // ESC
                this.closeMenu()
            else
                this.checkShortcut(evt)
        }, true)
        document.addEventListener("keyup", evt => {
            if (evt.which == 18) { // Alt 
                if (this.isKeyboardActivated && this.selectedIndex == -1) 
                    this.selectedIndex = 0
                evt.preventDefault()
                evt.stopPropagation()
            }
        }, true)

        this.addEventListener("menubar-item-mouseover", evt => {
            if (evt.detail.mainmenu && this.selectedIndex != -1)
                this.selectedIndex = evt.detail.index
        })
        this.addEventListener("menubar-item-mousedown", () => {
            if (!this.lastActive)
                this.lastActive = document.activeElement
        })
        this.addEventListener("menubar-clicked", evt => {
            this.isKeyboardActivated = false
            this.selectedIndex = evt.detail.index
        })
        this.addEventListener("menubar-executed", () => this.closeMenu())
        this.addEventListener("focusout", () => this.closeMenu())

        this.addEventListener("keydown", evt => {
            switch (evt.which) {
                case 37: // <-
                    this.selectedIndex--
                    if (this.selectedIndex == -1)
                        this.selectedIndex = this.itemCount - 1
                    evt.preventDefault()
                    evt.stopPropagation()
                    break
                case 39: // ->
                    this.selectedIndex++
                    if (this.selectedIndex == this.itemCount)
                        this.selectedIndex = 0
                    evt.preventDefault()
                    evt.stopPropagation()
                    break
                case 13: // Enter
                case 32: // Space                
                case 40: //  |d
                    if (this.isKeyboardActivated) {
                        this.isKeyboardActivated = false
                        evt.preventDefault()
                        evt.stopPropagation()
                        break
                    }
                default: {
                    if (this.isAccelerated) {
                        const items = this.mnemonics.filter(n => n.key == evt.key).map(n => n.index)
                        if (items.length > 0) {
                            this.selectedIndex = items[0]
                            this.isKeyboardActivated = false
                            evt.preventDefault()
                            evt.stopPropagation()
                            break
                        }
                    }
                    const items = Array.from(document.querySelectorAll('menubar-submenu'))
                    items.forEach(n => n.onKeyDown(evt))
                }
                break
            }
        })
    }

    closeMenu() {
        this.stopKeyboardActivated()
        this.selectedIndex = -1
        if (this.lastActive)
            this.lastActive.focus()
        this.lastActive = null
        if (!this.menubar.classList.contains("invisible")) {
            if (this.autoMode)
                this.menubar.classList.add("invisible")
//            setTimeout(() => this.$emit('resize'))
        }        
    }

    stopKeyboardActivated() {
        this.isKeyboardActivated = false
        this.isAccelerated = false
    }

    getShortcuts() {
        const getShortcut = text => {

            const getKey = k => k.length == 1 ? k.toLowerCase() : k

            if (!text)
                return  null
            var parts = text.split("+")
            if (parts.length == 1)
                return {
                    ctrl: false,
                    shift: false,
                    alt: false,
                    val: getKey(parts[0])
                }
            else
                return {
                    ctrl: parts[0] == "Strg" || parts[0] == "Ctrl",
                    shift: parts[0] == "Shift",
                    alt: parts[0] == "Alt",
                    val: getKey(parts[1])
                }
        }

        const items = Array.from(document.querySelectorAll('menubar-menuitem'))
            .map(n => ({ shortcut: getShortcut(n.getAttribute("shortcut")), menuitem: n }))
            .filter(n => n.shortcut)

        this.shortcuts = new Map()
        items.forEach(i => {
            const list = this.shortcuts.get(i.shortcut.val)
            if (list)
                this.shortcuts.set(i.shortcut.val, [...list, i])
            else
                this.shortcuts.set(i.shortcut.val, [i])
        })
    }

    checkShortcut(evt) {
        const shortcuts = this.shortcuts.get(evt.key)
        if (shortcuts) {
            const shortcut = shortcuts.filter(n => n.shortcut.ctrl == evt.ctrlKey && n.shortcut.alt == evt.altKey)
            if (shortcut.length == 1) {
                shortcut[0].menuitem.executeCommand()
                evt.preventDefault()
                evt.stopPropagation()
            }
        }
    }
}

customElements.define('menubar-mainmenu', Menubar)

// TODO Submenu zoom-level
// TODO Resize event when automode