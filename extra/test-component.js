import {TestClass, testFunction} from './test-exports.js';

export class TestComponent extends HTMLElement {
	#bool = true;
	#str = 'a string';
	#foo = 'foo';
	#elem = HTMLElement;
	#num = 9;

	/**
	 * Description of someProperty
	 * @type {String}
	 *
	 * @test self.someProperty = 'other value';
	 		 return self.someProperty;
	 	 	 // 'other value'
	 */
	someProperty = 'some value';
	static observerAttributes = ['bool', 'str', 'foo', 'elem', 'num'];

	constructor () {
		super();
		this.attachShadow ({ mode:'open' });
		this.bool = this.getAttribute('bool') || this.bool;
		this.str = this.getAttribute('str') || this.str;
		this.foo = this.getAttribute('foo') || this.foo;
		this.elem = this.getAttribute('elem') || this.elem;
		this.num = this.getAttribute('num') || this.num;
		this.shadowRoot.innerHTML = `
			<article>
				<header><slot name="title"></slot></header>
				<div><slot></slot></div>
			</article>
		`;
	}

	connectedCallback () {
		const titleSlot = this.shadowRoot.querySelector('[name=title]');
		const titleElems = titleSlot.assignedElements();
		this.doBar (titleElems);
	}

	attributeChangedCallback (attr, oldval, newval) {
		this[attr] = newval;
	}

	/**
	 * An async function
	 * test self.asyncFunction () // 'testFunction_foo';
	 * test self.asyncFunction () instanceof Promise // true
	 */
	async asyncFunction () {
		const imports = await import ('./test-exports.js');
		return imports.testFunction ('foo');
	}

	/**
	 * Creates a new instance of TestClass
	 * @return {String} Should return an instance of TestClass
	 * @remarks This method instanciates a new TestClass which was imported via an import statement at first line of the file.
	 *
	 * The test function doesn't have access to TestClass so we have to import it.
	 * @test fn = async () => {
	         const mods = await import ('../extra/test-exports.js');
	         return self.newInstance() instanceof mods.TestClass;
	    };
	    return fn(self); // true
	 */
	newInstance () {
		return new TestClass();
	}

	/**
	 * [testFunctionImport description]
	 * @param  {String} arg A string
	 * @return {String}     Should return 'testFunction_' + arg;
	 *
	 * @test self.testFunctionImport ('foo') // 'testFunction_foo'
	 */
	testFunctionImport (arg) {
		return testFunction(arg);
	}

	/**
	 * Does something with a node list
	 * @param  {NodeList} nodeList A node list
	 * @return {NodeList}          The node list
	 *
	 * @test self.doBar (self.childNodes) instanceof NodeList // true
	 */
	doBar (nodeList) {
		for (const node of nodeList) {
			// do something with node
		}

		return nodeList;
	}

	/**
	 * Returns a boolean
	 * @param  {Boolean}  value A Boolean
	 * @return {Boolean}       	The Boolean
	 *
	 * @test typeof self.isBool ('true') === 'boolean' // true
	 * @test self.isBool ('true') // true
	 * @test self.isBool ('false') // true
	 * @test self.isBool (false) // false
	 */
	isBool (value) {
		return !!value;
	}

	/**
	 * Returns a string
	 * @param  {String}  value 	A string
	 * @return {String}       	The string
	 *
	 * @test typeof self.isString ('foo') === 'string' // true
	 */
	isString (value) {
		return '' + value;
	}

	/**
	 * This fails the test
	 * @param  {Any} value Any value
	 * @return {null}
	 *
	 * @test self.failsTest () // !null
	 */
	failsTest (value) {
		return null;
	}

	/**
	 * Should return 'foo'
	 * @param  {String}  value 	A string
	 * @return {String}       	The string
	 *
	 * @test self.isFoo () // 'foo'
	 */
	isFoo () {
		return 'foo';
	}

	/**
	 * Creates an HTML div element and returns it
	 * @return {HTMLElement} A div element
	 *
	 * @test self.isElem ('div') instanceof HTMLDivElement // true
	 * @test self.isElem ('foo-bar') instanceof HTMLElement // true
	 */
	isElem (value) {
		return document.createElement (value);
	}

	/**
	 * Should return a number
	 * @param  {Number}  value 	A number
	 * @return {Number}       	The number
	 *
	 * @test self.isNumber (1) // 1
	 * @test self.isNumber ('1') // 1
	 * @test isNaN (self.isNumber ('foo') ) // true
	 */
	isNumber (value) {
		return parseFloat(value);
	}

	/**
	 * Gets the value of bool
	 * @return {Boolean} A boolean value
	 *
	 * @test typeof self.bool === 'boolean' // true
	 */
	get bool () { return this.#bool; }

	/**
	 * Sets the value of bool
	 * @param  {Boolean} value A boolean value
	 *
	 * @test self.bool = true;
	 		 return typeof self.bool === 'boolean';
	 		 // true
	 */
	set bool (value) { this.#bool = value; }

	/**
	 * Gets the value of str
	 * @return {String} A string
	 *
	 * @test typeof self.str === 'string' // true
	 */
	get str () { return this.#str; }

	/**
	 * Sets the value of str
	 * @param  {String} value A string
	 *
	 * @test self.str = 'bar';
	   		 return self.str;
	   		 // 'bar'
	 */
	set str (value) { this.#str = value; }

	/**
	 * Gets the value of foo
	 * @return {String} 'foo'
	 *
	 * @test self.foo // 'foo'
	 */
	get foo () { return this.#foo; }

	/**
	 * Sets the value of foo
	 * @param  {String} value This should be 'foo';
	 *
	 * @test self.foo = 'bar';
			 return self.foo;
			 // 'foo'
	 */
	set foo (value) { this.#foo = value; }

	/**
	 * Gets the value of elem
	 * @return {HTMLElement} An HTML element
	 *
	 * @test self.elem // HTMLElement
	 */
	get elem () { return this.#elem; }

	/**
	 * Sets the value of elem
	 * @param  {HTMLElement} value An HTML element
	 * @test self.elem = 'div';
	 		 return self.elem instanceof HTMLDivElement;
	 		 // document.createElement ('div') instanceof HTMLDivElement
	 */
	set elem (value) {
		if (typeof value === 'string') {
			this.#elem = document.createElement(value);
		} else {
			this.#elem = value;
		}
	}

	/**
	 * Gets the value of num
	 * @return {Number} A number
	 *
	 * @test typeof self.num === 'number' && !isNaN (self.num) // true
	 */
	get num () {return this.#num; }

	/**
	 * Sets the value of num
	 * @param  {Number} value A number
	 *
	 * @test self.num = 9; return self.num; // 9
	 * @test self.num = 9.5; return typeof self.num === 'number'; // true
	 * @test self.num = 'foo'; return isNaN(self.num); // true
	 * @test self.num = '20'; return self.num;
	 */
	set num (value) {
		if (typeof value === 'number' && !isNaN(value)) {
			this.#num = value;
		} else {
			this.#num = parseFloat(value);
		}
	}
}

document.addEventListener('DOMContentLoaded', customElements.define('test-component', TestComponent));
