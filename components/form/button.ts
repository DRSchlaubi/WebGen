import { asWebGenComponent, HTMLComponent } from "../../core/components.ts";
import { css } from "../../core/cssTemplate.ts";
import { alwaysRef, asRef, Refable, Reference } from "../../core/state.ts";

export enum ButtonMode {
    Primary = "primary",
    Secondary = "secondary",
    Text = "text"
}

@asWebGenComponent("button")
export class ButtonComponent extends HTMLComponent {
    #disabled = asRef(false);
    constructor(label: Refable<string>, mode: Reference<ButtonMode> = asRef(ButtonMode.Primary)) {
        super();

        const button = document.createElement("button");

        this.shadowRoot?.append(button);

        this.useListener(mode, (newMode, oldMode) => {
            if (oldMode) {
                button.classList.remove(oldMode);
            }
            button.setAttribute("mode", newMode);
        });

        this.useListener(alwaysRef(label), (newLabel) => {
            button.textContent = newLabel;
        });

        this.useListener(this.#disabled, (disabled) => {
            button.disabled = disabled;
        });

        this.shadowRoot?.adoptedStyleSheets.push(css`
            button {
                all: unset;
                display: grid;
                place-items: center;
                --wg-internal-button-bg: var(--wg-button-background-color, var(--wg-primary));
                --wg-internal-button-fg: var(--wg-button-text-color, var(--wg-primary-text));
                background-color: var(--wg-internal-button-bg);
                color: var(--wg-internal-button-fg);
                padding: var(--wg-button-padding, 0 18px);
                height: var(--wg-button-height, 36px);
                border-radius: var(--wg-button-box-shadow, var(--wg-radius-tiny));
                outline: 0px solid color-mix(in srgb, var(--wg-internal-button-bg), transparent 50%);
                transition: all 250ms ease;
                user-select: none;
            }
            button:not(:disabled) {
                cursor: pointer;
            }
            button:disabled {
                --wg-internal-button-bg: var(--wg-button-disabled-color, hsl(0deg 0% 20%));
                --wg-internal-button-fg: var(--wg-button-disabled-text-color, hsl(0deg 0% 40%));
            }
            button:not(:disabled):hover,
            button:not(:disabled):focus-visible {
                outline: 5px solid color-mix(in srgb, var(--wg-internal-button-bg), transparent 50%);
            }
            button:not(:disabled):active {
                outline: 3px solid color-mix(in srgb, var(--wg-internal-button-bg), transparent 50%);
                transform: translate(0, 2px);
            }

            button[mode="secondary"] {
                --wg-internal-button-bg: color-mix(in srgb, var(--wg-button-background-color, var(--wg-primary)), transparent 90%);
                --wg-internal-button-fg: var(--wg-button-background-color, var(--wg-primary));
            }
            button[mode="secondary"]:hover,
            button[mode="secondary"]:focus-visible {
                --wg-internal-button-bg: color-mix(in srgb, var(--wg-button-background-color, var(--wg-primary)), transparent 80%);
                outline: 0px solid color-mix(in srgb, var(--wg-internal-button-bg), transparent 50%);
            }

            button[mode="text"] {
                --wg-internal-button-bg: transparent;
                --wg-internal-button-fg: var(--wg-button-text-color, var(--wg-primary));
            }

            button[mode="text"]:hover,
            button[mode="text"]:focus-visible {
                --wg-internal-button-bg: color-mix(in srgb, var(--wg-button-background-color, var(--wg-primary)), transparent 80%);
                outline: 0px solid color-mix(in srgb, var(--wg-internal-button-bg), transparent 50%);
            }
        `);
    }

    make() {
        const obj = {
            ...super.make(),
            setDisabled: (disabled: Refable<boolean>) => {
                this.useListener(alwaysRef(disabled), (newDisabled) => {
                    this.#disabled.value = newDisabled;
                });
                return obj;
            }
        };
        return obj;
    }
}

export function PrimaryButton(label: Refable<string>) {
    return new ButtonComponent(label, asRef(ButtonMode.Primary)).make();
}

export function SecondaryButton(label: Refable<string>) {
    return new ButtonComponent(label, asRef(ButtonMode.Secondary)).make();
}

export function TextButton(label: Refable<string>) {
    return new ButtonComponent(label, asRef(ButtonMode.Text)).make();
}