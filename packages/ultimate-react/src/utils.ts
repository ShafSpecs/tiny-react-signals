import type { BindingFunction } from "./core"

export const textBinding: BindingFunction<string> = (element, value) => {
	element.textContent = value
}

export const htmlBinding: BindingFunction<string> = (element, value) => {
	element.innerHTML = value
}

export const classBinding: BindingFunction<string> = (element, value) => {
	element.className = value
}

export const styleBinding =
	(property: string): BindingFunction<string> =>
	(element, value) => {
		;(element.style as unknown as Record<string, string>)[property] = value
	}

export const attributeBinding =
	(attribute: string): BindingFunction<string> =>
	(element, value) => {
		element.setAttribute(attribute, value)
	}

export const visibilityBinding: BindingFunction<boolean> = (element, value) => {
	element.style.display = value ? "" : "none"
}

export const colorBinding: BindingFunction<number> = (element, value) => {
	const hue = (value * 36) % 360
	element.style.backgroundColor = `hsl(${hue}, 70%, 60%)`
}

export const scaleBinding: BindingFunction<number> = (element, value) => {
	const scale = 0.5 + value / 100
	element.style.transform = `scale(${scale})`
}

export const progressBinding: BindingFunction<number> = (element, value) => {
	element.style.width = `${value}%`
	element.style.backgroundColor = value > 50 ? "#4CAF50" : "#FF9800"
}
