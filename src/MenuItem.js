export class MenuItem extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })

        const template = document.createElement('template')
        template.innerHTML = ` 
            <style>
                .menuitemtext {
                    display: flex;
                    flex-grow: 1;
                }
                #menuItem.selected {
                    background-color: var(--menubar-selected-background-color);
                    color: var(--menubar-selected-color);
                }
                .selector {
                    display: none;
                }                
                .submenu-item .selector {
                    display: inline-block;
                    opacity: 0;
                    padding: 0px 7px;
                }                
                .submenu-item.checkbox.is-checked .selector {
                    opacity: 1;
                }
                .submenu-item .spacer {
                    flex-grow: 1;
                    min-width: 20px;
                }                
                .accelerated-active.accelerated {
                    text-decoration: underline;
                }
                #menuItem {
                    padding: 2px 5px;
                    align-items: center;
                    height: 100%;
                    display: flex;                    
                }
                #menuItem.submenu-item {
                    padding: 5px 20px 5px 0px;
                }
            </style>
            <div id="menuItem">
                <div id="text" class="menuitemtext">
                    <span class="selector">✓</span>
                    <div>
                        <span id="pretext"></span><span id="mnemonictext" class="accelerated"></span><span id="posttext"></span>
                    </div>
                    <span class="spacer"> </span>
                    <span id="shortcut"></span>
                </div>
            </div>
        `

        this.shadowRoot.appendChild(template.content.cloneNode(true))
        this.index = Number.parseInt(this.getAttribute("index"))
        this.menuItem = this.shadowRoot.getElementById("menuItem")
        const pretext = this.shadowRoot.getElementById("pretext")
        this.mnemonicText = this.shadowRoot.getElementById("mnemonictext")
        const posttext = this.shadowRoot.getElementById("posttext")
        const textParts = getTextParts(this.getAttribute("text"))
        this.action = this.getAttribute("action")
        const setChecked = this.getAttribute("setChecked")
        if (setChecked)
            setTimeout(() => eval(`${setChecked}(this)`))
        pretext.innerText = textParts[0]
        this.mnemonicText.innerText = textParts[1]
        posttext.innerText = textParts[2]
        this.isCheckbox = this.getAttribute("checkbox") != null
        const menuItem = this.shadowRoot.getElementById("menuItem")
        if (this.isCheckbox)
            menuItem.classList.add("checkbox")
        this.mainmenu = this.getAttribute("mainmenu") == "true"        
        if (!this.mainmenu) 
            menuItem.classList.add("submenu-item")
        const shortcut = this.shadowRoot.getElementById("shortcut")
        shortcut.innerText = this.getAttribute("shortcut")
                         
        function getTextParts(text) {
            const pos = text.indexOf('_')
            if (pos == -1) 
                return ["", "", text]
            else if (pos == 0) 
                return ["", text[1], text.substring(2)]
            else 
                return [ 
                    text.substring(0, pos), 
                    text[pos + 1], 
                    text.substring(pos + 2)
                ]
        }
    }

    static get observedAttributes() {
        return ['is-accelerated', 'selected-index']
    }

    attributeChangedCallback(attributeName, oldValue, newValue) {
        switch (attributeName) {
            case "is-accelerated":
                if (oldValue != newValue)
                    this.handleIsAccelerated(newValue)
                break
            case "selected-index":
                if (oldValue != newValue) {
                    const selectedIndex = Number.parseInt(newValue)
                    if (selectedIndex == this.index)
                        this.menuItem.classList.add("selected")
                    else
                        this.menuItem.classList.remove("selected")
                }
                break
        }
    }

    connectedCallback() {
        this.addEventListener("click", () => this.executeCommand())

        this.addEventListener("mousedown", () => this.dispatchEvent(new CustomEvent('menubar-item-mousedown', {
            bubbles: true,
            composed: true
        })))

        this.addEventListener("mouseover", () => this.dispatchEvent(new CustomEvent('menubar-item-mouseover', {
            bubbles: true,
            composed: true,
            detail: {
                mainmenu: this.mainmenu,
                index: this.index
            }
        })))
    }

    get isChecked()  {
        return this._isChecked
    }
    set isChecked(value) {
        this._isChecked = value
        if (this.isChecked)
            this.menuItem.classList.add("is-checked")
        else
            this.menuItem.classList.remove("is-checked")
    }

    getMnemonic() {
        return this.mnemonicText.innerText ? this.mnemonicText.innerText.toLowerCase() : null
    }

    executeCommand() {
        if (this.mainmenu) {
            this.dispatchEvent(new CustomEvent('menubar-clicked', {
                bubbles: true,
                composed: true,
                detail: { index: this.index }
            }))
        } else {
            this.dispatchEvent(new CustomEvent('menubar-executed', {
                bubbles: true,
                composed: true
            }))

            if (!this.isCheckbox) {
                if (this.action)
                    eval(`${this.action}()`)
            } else {
                this.isChecked = !this.isChecked
                if (this.action)
                    eval(`${this.action}(${this.isChecked})`)
            }
        }
    }

    handleIsAccelerated(value) {
        if (value == "true") 
            this.mnemonicText.classList.add("accelerated-active")
        else 
            this.mnemonicText.classList.remove("accelerated-active")
    }
}

customElements.define('menubar-menuitem', MenuItem)