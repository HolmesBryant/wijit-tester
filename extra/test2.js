export class TestTwo extends HTMLElement {
	#elem;

	constructor() {
		super();
	}

	connectedCallback() {
		// console.log('Test2 connected');
	}

	/**
	 * Gets the value of elem
	 * @return {HTMLElement} An HTML element
	 *
	 * @test self.elem instanceof HTMLElement // true
	 */
	get elem () { return this.#elem; }

	/**
	 * Sets the value of elem
	 * @param  {HTMLElement} value An HTML element
	 * @test (self => {
	 		self.elem = 'div';
	 		return self.elem instanceof HTMLElement;
	 	})(self) // true
	 */
	set elem (value) {
		if (typeof value === 'string') {
			this.#elem = document.createElement(value);
		} else {
			this.#elem = value;
		}

	}
}

document.addEventListener('DOMContentLoaded', customElements.define('test-two', TestTwo));
