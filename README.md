# Wijit-Tester Web Component

A test runner for web components.

## Work in Progress!!

More instructions will come ... eventually.

This is a test runner and (optional) web component that tests web components. The tests are not written in a seperate file, but rather in docblock style comments in the code itself.

**The component must be importable, meaning there must be an "export" statement before the component definition.**

    // example of an importable component
    export class MyComponent {
      ....
    }

## Setup
Setup is minimal.
- Create an HTML file.
- Import the "wijit-tester" script.
- Add a `<wijit-tester>` tag with some attributes.
- Press the "Start" button on the web page.

### example

    // tests.html
    <html>
      <head>
        ...
        <script type="module" src="wijit-tester.js"></script>
      </head>
      <body>
          <wijit-tester
            file="./path/to/test-component.js"
            module="TestComponent"
            tag="test-component"
            only-errors="false"
            line-numbers="true"
            stop-on-error="false"
            use-console="false">
          </wijit-tester>
      </body>
    </html>

## Writing Tests

You write your tests in docblock style comments in the code itself.

- The format is: @test expression which returns a result // expected value
- The "result" side of the test can include more than one expression. If this is the case, the last expression must explicitly return a value.
- The "expected value" can be any data type, or an expression.
- When you need to reference the instance of the component you are testing, use the word "self" instead of "this".

## Examples

    export class MyElem extends HTMLElement {
      /**
       * Constructor
       * @test self instanceOf MyElem // true
       */
      constructor() {
        super();
      }
      ....
      /**
       * Description of fooBar
       *
       * @param   {string} value - A string value
       * @returns {string}       - Returns value + 'bar'
       *
       * @test self.fooBar( 'foo' ) // 'foobar'
       * @test typeof self.fooBar( 'bar' ) === string // true
       */
      foobar(value) {
        return value + 'bar';
      }
    }

## Notes

### Miltiline Tests

If your test expression is rather long, you may distribute it over several lines as long as there are no erroneous characters at the start of each line.

    // This works
    /**
     * @test
       const foo = 'bar';
       return foo // bar
     */

    // This throws an error
    /**
     * @test
     * const foo = 'bar';
     * return foo // 'bar'
     */

### No Reset on Certain Tests

By default, the test runner resets the instance you are testing between each test, so each test is working on a fresh instance of your module. If you would like to run one or more tests without reseting the instance, precede the test expression(s) with the word "noreset"

    class MyElem extends HTMLElement {
      #prop = 'foo';
      ....
      /**
       * @test self.#prop = 'bar'; return self.#prop // 'bar'
       * @test self.#prop // 'foo'
       * @test self.#prop = 'baz'; return self.#prop // 'baz'
       * @test noreset self.#prop // 'baz'
       */
    }

### Async Methods

In order to test async methods, you must return a self-executing async function which returns the result of your method.

**Important**
Results from async tests will not appear in the expected position of the list of results. Since async functions operate **asynchronously**, the execution of the other tests will continue until the async test completes its operation. As a result, the async test results will appear much later in the result que.

    /**
     * ...
     * @test return async function() {
     	  return await self.fetchFile( '/path/to/file.txt' );
     	  }( self )  // 'the result'
     */
    async fetchFile( url ) {
    	const response = await fetch( url );
    	return await response.text();
    }

 ### Slot Change Events

 If you want to test the result of a 'slotchange' event, you must create two tests. The first test sets the textContent/innerHTML of the element and will return a value which was present **before** the slot change triggered. For the second test, you must precede the expression with the keyword "noreset", then return the result of whatever the slot change triggered.

    class MyElem extends HTMLElement {
    	#text = 'foo';
    	....
      /**
       * @test self.textContent = 'baz'; return self.#text // 'foo'
       *
   		 * @test noreset self.#text // 'baz'
       */
    	connectedCallback() {
 				const slot = this.shadowRoot.querySelector( 'slot' );
    		slot.addEventListener( 'slotchange', event => {
      		const nodes = slot.assignedNodes();
      		if ( nodes[0] ) this.#text = nodes[0].textContent;
    		});
    	}
    }
