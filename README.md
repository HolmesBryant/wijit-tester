# Wijit-Tester Web Component

A test runner for web components.

## Work in Progress!!
More documentation will come ... eventually.

This is a test runner and (optional) web component that tests web components. The tests are not written in a seperate file, but rather in docblock style comments in the code itself.


## Features
- Use as a web component or just import the WijitTestRunner class and use pure javascript.
- When used as a web component, write your tests within jsdoc or docblock style comments right in your code instead of writing seperate test scripts.
- Can handle form submissions
- Can hdndle async functions and methods
- Can handle slotchange events

**The component must be importable, meaning there must be an "export" statement before the component definition.**

    // example of an importable component
    export class MyComponent {
      ....
    }

## Setup
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
       * @test self instanceof MyElem // true
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

### Errors

Errors occur when there is a problem parsing a test. This usually means there is some error in the code in the test itself. Some common mistakes are:
 - A line of a milti-line test begins with an asterix ("\*") or some other erroneous character.
 - A multi-statement test doesn't include a return statement.
 - The test uses "this" instead of "self".

If you are having trouble tracking down an error, check the console. Traces in the console will tell you if the error is being thrown from the test script or the script being tested.

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

### Creating Mocks

You can create a test (called a mock) that runs before each subsequent test is run. This is useful for setting some conditions that are common to all tests that follow the mock test so you don't have to recreate the conditions for every test. In order to add a mock test, add the word 'mock' after '@test'. The mock must include a return statement and end with a double slash (//).

This mock will not appear in the test results unless it throws an error.

If the mock is adding elements to the DOM, you must first check for the presence of the element before adding it. Since the mock runs before each test, a new element will be added each time a new test is run if you don't first check to see if it already exists.

Note: The code associated with the mock will NOT run before any tests that appear **before** the mock statement, so if you want the code to run before every test, add the mock before you add any tests.

    // Example mock test for a custom element
    /**
     * ....
     * @test mock
       let div = self.querySelector('#test-div');
       if (div) {
         return;
       } else {
         div = document.createElement('div');
         div.id="test-div";
         self.append(div);
         return;
       } //
     */

### Async Functions

In order to test async functions, you must return a self-executing async function which returns the result of your function.

    /**
     * ...
     * @test return async function() {
     	  return await self.fetchFile( 'file.txt' );
     	  }( self )  // 'the result'
     */
    async fetchFile( url ) {
    	const response = await fetch( url );
    	return await response.text();
    }

**Note**
Results from async tests will not appear in the expected position of the list of results. Since async functions operate **asynchronously**, the execution of the other tests will continue until the async test completes its operation. Consequently, the async test results will appear much later in the result que.

#### Catching Errors in Async Tests

The test runner cannot catch errors that occur within the code of an asyncronous test. If you wish to catch such errors and (optionally) show them in the test results display, you must add your own try...catch block.

    /**
     * ....
     * @test return async function() {
          try {
            const response = await self.fetchData( 'file.txt' );
            some faulty code
          } catch (error) {
            const line_number_of_test_in_code = 1234;
            self.WijitTestRunner.sendError(error, line_number_of_test_in_code)
          }
        }( self )  // 'the result'
     */

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

