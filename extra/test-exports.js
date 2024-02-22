export function testFunction (arg) {
	return `testFunction_${arg}`;
}

export class TestClass {
	#elem;

	constructor() {
		return this;
	}

	getBaz () {
		return 'Baz';
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
