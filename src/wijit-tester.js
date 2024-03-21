/**
 * @class WijitTester
 * @extends HTMLElement
 * @description A test runner for web components
 * @author Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 */
export class WijitTester extends HTMLElement {
	/**
   	 * Abort controller for event listeners.
   	 *
   	 * @public
   	 * @readonly
   	 */
	abortController = new AbortController();
	reloadAbortController = new AbortController();

	/**
	 * The full text of the component being tested. This is populated when lineNumbers == true;
	 * @private
	 * @type {string}
	 */
	fullCode;

	/**
     * Unique ID for this test run.
     *
     * @public
     * @readonly
     * @type {string}
     */
	testScriptId = 'wt_' + Math.random().toString(36).substring(2, 8);

	/**
     * Total number of tests to execute.
     *
     * @public
     * @readonly
     * @type {number}
     */
	totalTests = 0;

	/**
     * Timestamp of test start.
     *
     * @public
     * @readonly
     * @type {number}
     */
	startTime;

	/**
     * Flag indicating if testing is paused.
     *
     * @public
     * @type {boolean}
     */
	paused = false;

	/**
	 * Name of custom error event
	 * @public
	 * @type {String}
	 */
	errorEvent = 'testError';

	/**
	 * Name of custom "test failed" event
	 * @public
	 * @type {String}
	 */
	failEvent = 'testFailed';

	/**
	 * Name of custom "test passed" event
	 * @public
	 * @type {String}
	 */
	passEvent = 'testPassed';

	/**
	 * Name of custom event fired when full text of script is loaded. Only fires when "lineNumbers" is true.
	 * @public
	 * @type {String}
	 */
	scriptLoadEvent = 'scriptLoaded';

	/**
     * (Private) Flag indicating if line numbers should be shown.
     *
     * @private
     * @type {boolean}
     */
	#lineNumbers = false;

	/**
     * (Private) The name of the module to test.
     *
     * @private
     * @type {string}
     */
	#module = '';

	/**
     * (Private) Flag indicating if only errors should be shown.
     *
     * @private
     * @type {boolean}
     */
	#onlyErrors = false;

	/**
	 * The value of the "file" input, which is the path to the file being tested.
	 * @private
	 * @type {String}
	 */
	#file = '';

	/**
     * Flag indicating if testing should stop on error.
     * @private
     * @type {boolean}
     */
	#stopOnError = false;

	/**
     * The custom tag name associated with the component.
     * @private
     * @type {string}
     */
	#tag = '';

	/**
     * Flag indicating if console output should be used.
     * @private
     * @type {boolean}
     */
	#useConsole = false;

	/**
	 * Object serving as a template for error reporting
	 * @private
	 * @type {object}
	 */
	errorInfo = {
		verdict : null,
		expected : 'No error ... duh',
		result : "D'oh!",
		description: null,
		idx: null,
		line: null
	}

	/**
   * List of observed attributes for this element.
   *
   * @public
   * @static
   * @readonly
   * @type {string[]}
   */
	static observedAttributes = [
		'file',
		'line-numbers',
		'module',
		'only-errors',
		'stop-on-error',
		'tag',
		'use-console'
	];

	/**
	 * Constructor
	 */
	constructor () {
		super();
		this.attachShadow ( { mode:'open' } );
		if ( this.hasAttribute( 'file' ) ) this.file = this.getAttribute( 'file' );
		this.module = this.getAttribute( 'module' ) || '';
		this.tag = this.getAttribute( 'tag' ) || '';
		this.stopOnError = this.getAttribute( 'stop-on-error' ) || this.stopOnError;
		this.onlyErrors = this.getAttribute( 'only-errors' ) || this.onlyErrors;
		this.useConsole = this.getAttribute( 'use-console' ) || this.useConsole;
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					--accent-color: turquoise;
					--bg1-color: whitesmoke;
					--bg2-color: white;
					--bg3-color: gainsboro;
					--border-color: silver;
					--error-color: hotpink;
					--fail-color: pink;
					--pass-color: palegreen;
					--text-color: rgb(60,60,60);
					--trans-color: rgba(255,255,255,0.9);
					--minheight: 35px;

					background-color: var(--bg1-color);
					border-radius: 10px;
					color: var(--text-color);
					display: block;
					font-family: sans-serif;
					font-size: 16px;
					height: inherit;
					overflow: auto
					padding: 10px;
				}

				@media (prefers-color-scheme: dark) {
					:host {
						--bg1-color: rgb(20, 20, 20);
						--bg2-color: rgb(40,40,40);
						--bg3-color: rgb(60, 60, 60);
						--border-color: dimgray;
						--error-color: darkred;
						--pass-color: darkslategray;
						--fail-color: firebrick;
						--text-color: rgb(240, 240, 240);
						--trans-color: rgba(40,40,40,0.7);
					}
				}

				/****** Backgrounds ******/

					.sticky
					{ background-color: var(--bg1-color); }

					input,
					output
					{ background-color: var(--bg2-color) }

					button,
					*[title]:after,
					*[title]::before,
					input[type="file"]::file-selector-button
					{ background-color: var(--bg3-color) }

					details {
						background-color: var(--trans-color);
					}

					.ERROR
					{ background-color: var(--error-color)}

					.fail
					{ background-color: var(--fail-color); }

					.pass
					{ background-color: var(--pass-color); }

					summary:hover,
					.active
					{ background-color: var(--accent-color); }

					output {
						background-image:
							linear-gradient(rgba(255,255,255, 0.5), rgba(0,0,0,0.5)),
							url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEzIiBoZWlnaHQ9IjUzNCIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgNTEzIDUzNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJtNTEyIDE3NGMzLjQgOS4wNyAwLjUzMiAxOS4yLTYuODEgMjUuN2wtMzIuOSAyOS4zYy04LjE5IDcuNDEtMTIuMSAxOC4zLTExLjYgMjkuMSAwLjEwNiAzLjAyIDAuMjEzIDYuMDUgMC4yMTMgOS4xOCAwIDMuMTMtMC4xMDYgNi4xNS0wLjIxMyA5LjE4LTAuNTMyIDExIDMuMyAyMS44IDExLjYgMjkuMWwzMi45IDI5LjNjNy4zNCA2LjQ3IDEwLjIgMTYuNiA2LjgxIDI1LjctNC42OCAxMi40LTEwLjMgMjQuMy0xNi44IDM1LjhsLTUgOC40NWMtNy4wMiAxMS41LTE0LjkgMjIuMy0yMy41IDMyLjUtNi4yNyA3LjUxLTE2LjcgMTAtMjYuMSA3LjA5bC00Mi4yLTEzLjFjLTEwLjYtMy4zNC0yMi4xLTEuMTUtMzEuNiA0LjgtNS4yMSAzLjIzLTEwLjUgNi4zNi0xNi4xIDkuMDctOS44OSA1LjAxLTE3LjUgMTMuOC0yMCAyNC40bC05LjQ2IDQyLjVjLTIuMTMgOS40OS05LjU3IDE3LTE5LjQgMTguNi0xNC43IDIuNC0yOS44IDMuNjUtNDUuMiAzLjY1LTE1LjQgMC0zMC41LTEuMjUtNDUuMi0zLjY1LTkuNzgtMS41Ni0xNy4yLTkuMDctMTkuNC0xOC42bC05LjQ2LTQyLjVjLTIuMzQtMTAuNi0xMC4xLTE5LjQtMjAtMjQuNC01LjUzLTIuODItMTAuOC01Ljg0LTE2LjEtOS4wNy05LjM2LTUuOTUtMjEtOC4xNC0zMS42LTQuOGwtNDIuMSAxMy4yYy05LjM2IDIuOTItMTkuOCAwLjMxMy0yNi4xLTcuMDktOC42MS0xMC4yLTE2LjUtMjEuMS0yMy41LTMyLjVsLTUtOC40NWMtNi40OS0xMS41LTEyLjEtMjMuNC0xNi44LTM1LjgtMy40LTkuMDctMC41MzItMTkuMiA2LjgxLTI1LjdsMzIuOS0yOS4zYzguMTktNy40MSAxMi4xLTE4LjMgMTEuNi0yOS4xLTAuMTA2LTMuMDItMC4yMTMtNi4wNS0wLjIxMy05LjE4IDAtMy4xMyAwLjEwNi02LjE1IDAuMjEzLTkuMTggMC41MzItMTEtMy4zLTIxLjgtMTEuNi0yOS4xbC0zMi45LTI5LjRjLTcuMzQtNi40Ny0xMC4yLTE2LjYtNi44MS0yNS43IDQuNjgtMTIuNCAxMC4zLTI0LjMgMTYuOC0zNS44bDUtOC40NWM3LjAyLTExLjUgMTQuOS0yMi4zIDIzLjUtMzIuNSA2LjI3LTcuNTEgMTYuNy0xMCAyNi4xLTcuMDlsNDIuMiAxMy4xYzEwLjYgMy4zNCAyMi4xIDEuMTUgMzEuNi00LjggNS4yMS0zLjIzIDEwLjUtNi4zNiAxNi4xLTkuMDcgOS44OS01LjAxIDE3LjUtMTMuOCAyMC0yNC40bDkuNDYtNDIuNWMyLjEzLTkuNDkgOS41Ny0xNyAxOS40LTE4LjYgMTQuNy0yLjUgMjkuOC0zLjc2IDQ1LjItMy43NiAxNS40IDAgMzAuNSAxLjI1IDQ1LjIgMy42NSA5Ljc4IDEuNTYgMTcuMiA5LjA3IDE5LjQgMTguNmw5LjQ2IDQyLjVjMi4zNCAxMC42IDEwIDE5LjQgMjAgMjQuNCA1LjUzIDIuODIgMTAuOCA1Ljg0IDE2LjEgOS4wNyA5LjM2IDUuOTUgMjEgOC4wMyAzMS42IDQuOGw0Mi4yLTEzLjFjOS4zNi0yLjkyIDE5LjgtMC4zMTMgMjYuMSA3LjA5IDguNjEgMTAuMiAxNi41IDIxLjEgMjMuNSAzMi41bDUgOC40NWM2LjQ5IDExLjUgMTIuMSAyMy40IDE2LjggMzUuOHoiLz48cGF0aCBkPSJtMzY1IDQ1N2MtNi44Ni0xLjk3LTExLjMtNC40OS0xNS4yLTguNjctMy42Ni0zLjkzLTcuNDMtOS43OC0zMC4zLTQ3LjEtOC4yOS0xMy41LTE1LjUtMjUuMS0xNi4xLTI1LjctMC42MzQtMC42OC0xNS41LTIuMzktMzguOS00LjQ5LTIwLjgtMS44Ni0zOS44LTMuNi00Mi4xLTMuODdsLTQuMTktMC40NzctMTUuNyAxOS4xYy0xOC4xIDIyLTI3LjIgMzIuMS0zMS4zIDM0LjctOCA0Ljk4LTE5LjQgNi4yNS0zMS42IDMuNTQtNzMuMi0xNi4zLTk0LjEtMjEuMy05OS4yLTI0LTEyLjEtNi4yMy0xOS4yLTIxLjQtMTYuNy0zNS42IDEuMjMtNi45OSAzLjU5LTExLjggOC40MS0xNy4xIDUuNTQtNi4xNCAxMi4zLTkuMTcgMjEuNS05LjYyIDcuODktMC4zOSAxNy43IDEuNSA2NC44IDEyLjUgMTAuMSAyLjM3IDE4LjcgNC4zIDE5LjEgNC4zIDAuNzcyIDAgMTEtMTIuNyAxMS0xMy42IDAtMC4zNzQtMS40NC0yLjQ4LTMuMjEtNC42OS03LjExLTguODctMTAuMi0yMS42LTcuODgtMzEuOSAxLjE3LTUuMDkgMTQuMS0zNi43IDI3LjItNjYuMyAzLjg2LTguNzYgNy4wMi0xNi40IDcuMDItMTcgMC0wLjU5Ni00LjY4LTIuNjgtMTAuNC00LjY0cy0xNi41LTUuNjQtMjQtOC4xOWwtMTMuNi00LjYzLTcuNjQgOC43M2MtNC4yIDQuOC0xMi4yIDE0LTE3LjggMjAuNS0xMy43IDE1LjgtMTUuNyAxNy42LTIyLjYgMjEtNS4wMiAyLjQ0LTcuMDYgMi44OS0xMi45IDIuODktMTIuMyAwLTIxLjctNS45Ni0yNy4xLTE3LjItMi43MS01LjYzLTMuMDItNy4xMS0yLjk5LTE0LjMgMC4wMjU3LTYuODYgMC40MDItOC43OSAyLjU1LTEzLjEgMi45My01Ljg3IDIuMTMtNC45IDI5LjctMzYuMSAyNC45LTI4LjIgMjUuMS0yOC4zIDMyLjgtMzIuMyA1LjQ1LTIuNzggNi43NC0zLjA1IDE0LjMtMy4wMSA4LjE0IDAuMDM4OSA5LjIyIDAuMzM0IDQ0LjMgMTIgMTkuOCA2LjYgMzYuMiAxMS44IDM2LjYgMTEuNiAwLjM4OC0wLjI0NSAwLjM2MS0yLjI2LTAuMDU4OC00LjQ4LTIuMjYtMTEuOSAwLjc1MS0zMi41IDYuOS00Ny4yIDQuNTgtMTEgMTQuMy0yMy43IDI0LjYtMzIuMSA2LjcyLTUuNSAxOS44LTEyLjMgMjguMi0xNC42IDguNC0yLjM1IDI3LjktMi44MSAzNi41LTAuODYgMTIuMyAyLjc5IDEzLjkgMi44IDIwLjEgMC4xMSA3LjA1LTMuMDMgOS41LTMuMDkgMTIuMS0wLjI3NSAyLjk2IDMuMjIgMi43NCA5LjA3LTAuNDkzIDEzbC0yLjUgMy4wNCA3LjQ4LTAuNDQzYzkuODEtMC41OCAxNS44LTMuNTQgMjIuNy0xMS4yIDMuMjctMy42MiA1Ljg1LTUuNjYgNy4xNS01LjY2IDIuODYgMCA3Ljk0IDUuNTMgOS4xNCA5Ljk3IDEuNDEgNS4xNyAxLjI2IDE2LjEtMC4yODIgMjEuMy0zLjA3IDEwLjMtMTEuNSAyMy0xNy40IDI2LjNsLTIuMyAxLjI2IDIuMiA4LjE3YzguNTkgMzEuOC0zLjA2IDY3LjMtMjguMiA4NS45LTMuOTYgMi45My00IDMuMDEtMS44NSAzLjg1IDEuMjEgMC40NzMgMTEuMSA0LjUyIDIyIDkgMTAuOSA0LjQ3IDIwLjYgOC4xNCAyMS41IDguMTRzMjAuNS05LjY2IDQzLjUtMjEuNWw0MS44LTIxLjUgNy40OCAwLjE2NmMxNyAwLjM3OCAyOC44IDEwLjEgMzEuNyAyNiAxLjY1IDkuMTgtMS43MSAyMC4yLTguMTIgMjYuNy0zLjA1IDMuMS0xOC4xIDExLjMtMjMuNCAxMi43LTIuMTkgMC41OTYtNC42MSAxLjYzLTUuMzcgMi4yOS0wLjc2MyAwLjY2MS0yLjQzIDEuNDYtMy43IDEuNzdzLTE2IDcuNzctMzIuOCAxNi42Yy0xNi44IDguOC0zMy4yIDE3LTM2LjUgMTguMS05LjMgMy4yNS0xNi44IDIuODctMjkuMi0xLjQ4LTkuMDQtMy4xOC01Mi42LTE5LjktNjQuOC0yNC44bC00Ljc1LTEuOTMtMy43MyA4LjIxYy01LjY4IDEyLjUtMTAuNCAyMy41LTEwLjQgMjQuNCAwIDAuNDQyIDEyLjYgMiAyOCAzLjQ3IDMwLjkgMi45NCAzOC4yIDQuMTcgNDUuNSA3LjU1IDkuMDEgNC4yMiAxMy4xIDkuNjkgNDAuNiA1NC44IDE0LjMgMjMuNCAyNi4zIDQ0LjIgMjcgNDYuNiAxLjkzIDYuNTQgMS42NCAxNS40LTAuNjk2IDIxLjgtNS40MSAxNC44LTIyLjggMjMuOS0zNy41IDE5Ljd6bS03Ni0yNThjMjIuNi05LjA5IDM0LjMtMzMuMyAyOC43LTU5LTEuNTgtNy4xNy0xLjQ1LTcuMDktOS4zMi02LjAzLTIwLjYgMi43OC00Ni40LTQuNTItNjIuNS0xNy43LTIuMTItMS43NC00LjI0LTMuMTUtNC43Mi0zLjE1LTEuNjcgMC0xMC4yIDEwLjEtMTIuNiAxNC45LTcuMTcgMTQuNS02LjggMzUuNiAwLjg1MSA0OSAzLjQ1IDYuMDIgMTAuNiAxMy43IDE2LjIgMTcuNCAxMi4zIDguMDYgMzAuMyAxMCA0My41IDQuNjl6bS00Mi45LTI5LjNjLTEuMzMtMS4wNy0yLjg5LTMuNTYtMy40Ny01LjUzLTIuOTktMTAuMiA5Ljc1LTE3LjUgMTctOS43MiAzLjI0IDMuNDYgNC4wMSA3LjYxIDIuMSAxMS40LTIuODQgNS42MS0xMSA3LjYzLTE1LjYgMy44OHptMzguMS0wLjgyMWMtMi4yNS0yLjMtMi43LTMuNTMtMi43LTcuMzkgMC0zLjU4IDAuNDcxLTUuMDggMi4wOC02LjYyIDcuMDgtNi43OCAxNy4zLTIuODcgMTcuMyA2LjYxIDAgMy0wLjYyNiA0LjM5LTMuMTQgNi45Ni00LjI2IDQuMzYtOS41NyA0LjUzLTEzLjYgMC40NTF6IiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMTAiLz48L3N2Zz4K");
						background-attachment: fixed;
						background-position: bottom;
						background-repeat: no-repeat;
					}

				/***** Accents *****/
					progress
					{ accent-color: var(--accent-color); }

				/****** Borders ******/

					button,
					input,
					output,
					*[title]::after,
					*[title]::before,
					input[type="file"]::file-selector-button
					{ border: 1px solid var(--border-color); }

					button,
					output,
					input,
					*[title]::before
					{ border-radius: 10px; }

					*[title]::after {
						border-radius: 50%;
					}

					output details:first-child summary {
						border-radius: 10px 10px 0 0;
					}

					input[type="file"]::file-selector-button
					{ border-radius: 10px 0 0 10px; }

				/****** Text ******/
					input,
					button
					{ color: var(--text-color); }

					svg
					{ fill: var(--text-color); }

					*[title]::after
					{ color: var(--accent-color); }

				/****** Cursors ******/
					button,
					label[title],
					summary,
					input[type="file"]::file-selector-button
					{ cursor: pointer; }

					button:disabled
					{
						cursor: not-allowed;
						opacity: 0.5;
					}

				/****** Shadows ******/

					summary:hover,
					details[open] > summary,
					button:not(:disabled):hover,
					input[type="file"]::file-selector-button:hover
					{ box-shadow: 2px 2px 5px black; }

					.active,
					summary:active,
					details[open] > summary:active,
					button:not(:disabled):active,
					input[type="file"]::file-selector-button:active
					{ box-shadow: inset 2px 2px 5px black; }

				/****** Structure ******/
					*[data-tooltip] {
						position: relative;
					}

					*[data-tooltip]::after {
						aspect-ratio: 1/1;
						content: "?";
						display: inline;
						padding: 2px;
						z-index: 2;
					}

					*[data-tooltip]::before {
						content: attr(title);
						display: none;
						font-weight: normal;
						height: max-content;
						max-width: 10rem;
						padding: .25rem;
						position: absolute;
						right: 0;
						top: 1rem;
						z-index: 99;
					}

					*[data-tooltip]:hover::before,
					*[data-tooltip]:active::before {
						display: block;
					}

					article {
						display: grid;
						gap: 10px;
						grid-template-columns: 1fr;
						grid-template-rows: max-content max-content 1fr;
						overflow: visible;
						min-height: 100%;
						padding: .5rem;
					}

					button {
						align-items: center;
						display: flex;
						justify-content: center;
					}

					button,
					progress {
						flex: 1;
						flex-basis: 35px;
						font-weight: bold;
						min-height: 35px;
					}

					code {
						padding: 0 1rem;
					}

					details[open] {
						padding-bottom: 1rem;
					}

					details[open] summary {
						margin-bottom: 1rem;
					}

					div {
						display: flex;
						flex: 1;
						flex-direction: column;
						gap: 10px;
					}

					input {
						height: 35px;
					}

					input[type="file"]::file-selector-button {
						font-weight: bold;
						min-height: 35px;
					}

					label {
						font-weight: bold;
						text-align: center;
					}

					output {
						display: block;
						min-height: 100%;
					}

					progress {
						width: 100%;
					}

					section {
						display: flex;
						flex-direction: column;
						flex-wrap: wrap;
						gap: 10px;
						overflow: visible;
					}

					section:first-child {
						border-bottom: 4px solid var(--bg3-color);
						padding-bottom: 1rem;
					}

					summary {
						padding: .5rem;
						white-space: pre-line;
						overflow-wrap: anywhere;
					}

					.hidden {
						display: none;
					}

					.icon {
						aspect-ratio: 1/1;
						max-width: 45px;
					}

					.row {
						flex-direction: row;
					}

					.sticky {
						padding: 10px;
						position: sticky;
						top: 0;
					}

					#reload,
					#start,
					#pause {
						flex: 0 0 4rem;
						transition: all .25s;
					}

					#start {
						font-size: 1.5rem;
					}
			</style>

			<form id="form"></form>
			<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">
				<!-- Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2023 Fonticons, Inc. -->
				<symbol id="reload-icon" viewBox="0 0 512 512">
					<path d="M89.1 202.6c7.7-21.8 20.2-42.3 37.8-59.8c62.5-62.5 163.8-62.5 226.3 0L370.3 160H320c-17.7 0-32 14.3-32 32s14.3 32 32 32H447.5c0 0 0 0 0 0h.4c17.7 0 32-14.3 32-32V64c0-17.7-14.3-32-32-32s-32 14.3-32 32v51.2L398.4 97.6c-87.5-87.5-229.3-87.5-316.8 0C57.2 122 39.6 150.7 28.8 181.4c-5.9 16.7 2.9 34.9 19.5 40.8s34.9-2.9 40.8-19.5zM23 289.3c-5 1.5-9.8 4.2-13.7 8.2c-4 4-6.7 8.8-8.1 14c-.3 1.2-.6 2.5-.8 3.8c-.3 1.7-.4 3.4-.4 5.1V448c0 17.7 14.3 32 32 32s32-14.3 32-32V396.9l17.6 17.5 0 0c87.5 87.4 229.3 87.4 316.7 0c24.4-24.4 42.1-53.1 52.9-83.7c5.9-16.7-2.9-34.9-19.5-40.8s-34.9 2.9-40.8 19.5c-7.7 21.8-20.2 42.3-37.8 59.8c-62.5 62.5-163.8 62.5-226.3 0l-.1-.1L109.6 352H160c17.7 0 32-14.3 32-32s-14.3-32-32-32H32.4c-1.6 0-3.2 .1-4.8 .3s-3.1 .5-4.6 1z"/>
				</symbol>
				<symbol id="play-icon" viewBox="0 0 384 512"><path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"/>
				</symbol>
				<symbol id="pause-icon" viewBox="0 0 320 512"><path d="M48 64C21.5 64 0 85.5 0 112V400c0 26.5 21.5 48 48 48H80c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H48zm192 0c-26.5 0-48 21.5-48 48V400c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H240z"/>
				</symbol>
			</svg>

			<article>
				<section class="row" id="inputs">
						<div>
							<label
							for="file-input"
							data-tooltip="true"
							title="Relative or absolute path to file containing exported module(s)"
							>
								Path to Module
							</label>
							<input required
								value="${this.file}"
								type="text"
								id="file-input"
								list="file-datalist"
								name="file"
								form="form">
							<datalist id="file-datalist"></datalist>
						</div>

						<div>
							<label
							for="module-input"
							data-tooltip="true"
							title="The name of the exported module. If it is the default export, enter 'default'"
							>
								Module Name
							</label>
							<input required
								value="${this.module}"
								type="text"
								id="module-input"
								list="module-datalist"
								name="module"
								autocomplete="false"
								form="form">
							<datalist id="module-datalist"></datalist>
						</div>

						<div>
							<label
							for="tag-input"
							data-tooltip="true"
							title="If this is a Custom Element, enter the tag name of the element"
							>
								Tag Name
							</label>
							<input
							value="${this.tag}"
							id="tag-input"
							autocomplete="false"
							name="tag"
							form="form">
						</div>
				</section>

				<section class="sticky row" id="controls">
					<button id="reload" class="hidden" title="Reload">
						<svg class="icon">
							<use xlink:href="#reload-icon"></use>
						</svg>
					</button>

					<button id="start" type="submit" form="form" title="Start">
						<svg class="icon">
							<use xlink:href="#play-icon"></use>
						</svg>
					</button>

					<button disabled id="pause" title="Pause / Resume">
						<svg class="icon">
							<use xlink:href="#pause-icon"></use>
						</svg>
					</button>

					<div id="progress-container">
						<label for="progress">
							<span id="current">0</span>
							of
							<span id="total">x</span>
							<code>( <span id="time">00:00:00:000</span> )</code>
						</label>
						<progress id="progress" min="0">0</progress>
					</div>
				</section>

				<section>
					<output></output>
				</section>
			</article>
			<div class="hidden">
				<slot id="options"></slot>
			</div>
		`;

		const progressContainer = this.shadowRoot.querySelector( '#progress-container' );
		if ( this.useConsole ) {
			progressContainer.classList.add( 'hidden' );
		}
	}

	/**
  	 * Called when the element is inserted into the DOM.
  	 */
	connectedCallback () {
		const pauseBtn = this.shadowRoot.querySelector( '#pause' );
		const reloadBtn = this.shadowRoot.querySelector( '#reload' );
		const form = this.shadowRoot.querySelector( 'form' );
		const fileInput = this.shadowRoot.querySelector( '#file-input' );
		const moduleinput = this.shadowRoot.querySelector( '#module-input' );
		const tagInput = this.shadowRoot.querySelector( '#tag-input' );
		const optionsContent = this.textContent;
		this.checkForSearchQuery();
		this.setupOptions( optionsContent );

		if (form.file.value) this.file = form.file.value;
		if ( this.lineNumbers ) this.loadFullText (this.file);

		// The main event. When the form is submitted via [Enter] or pressing the Start button, the process starts.
		form.addEventListener ('submit', (event) => {
			this.init (event);
		}, { signal:this.abortController.signal });

		fileInput.addEventListener ('focus', event => {
			event.target.value = null;
		}, { signal:this.abortController.signal });

		fileInput.addEventListener ('change', event => {
			if (this.lineNumbers) this.loadFullText (event.target.value);
			this.addModuleList(event.target.value);
		}, { signal:this.abortController.signal });

		moduleinput.addEventListener ('focus', event => {
			event.target.value = null;
			tagInput.value = null;
		}, { signal:this.abortController.signal });

		tagInput.addEventListener ('focus', event => {
			event.target.select();
		}, { signal:this.abortController.signal });

		pauseBtn.addEventListener ('click', () => this.pause (),
			{ signal:this.abortController.signal });

		reloadBtn.addEventListener ('click', () => {
			location.search = this.setSearchQuery();
		}, { signal:this.reloadAbortController.signal });

		this.addEventListener (this.passEvent, event => {
			this.addResult (event)
		}, { signal:this.abortController.signal });

		this.addEventListener (this.failEvent, event => {
			this.addResult(event)
			if (this.stopOnError) {
				this.pause();
			}
		}, { signal:this.abortController.signal });

		this.addEventListener (this.errorEvent, event => {
			this.addResult(event);
			this.done();
			console.error (`Nope, not feelin it ... (line: ${event.detail.line}) ${event.detail.description}`)
		}, { signal:this.abortController.signal });
	}

	/**
	 * Called when the element is removed from the DOM
	 * @return {[type]} [description]
	 */
	disconnectedCallback () {
		this.abortController.abort();
		this.reloadAbortController.abort();
	}

	/**
	 * Called when an observed attribute changes
	 * @param  {String} attr   The attribute name
	 * @param  {String} oldval The attribute's previous value
	 * @param  {String} newval The attribute's new value
	 */
	attributeChangedCallback( attr, oldval, newval ) {
		attr = attr.replace(/-./g, (match) => match.toUpperCase()[1]);
		this[attr] = newval;
	}

	setSearchQuery() {
		const moduleName = this.shadowRoot.querySelector('#module-input').value;
		const tag = this.shadowRoot.querySelector('#tag-input').value;
		return encodeURI(`?file=${this.file}&module=${moduleName}&tag=${tag}`);
	}

	checkForSearchQuery() {
		if ( location.search ) {
			const pathInput = this.shadowRoot.querySelector('#file-input');
			const moduleInput = this.shadowRoot.querySelector('#module-input');
			const tagInput = this.shadowRoot.querySelector('#tag-input')
			const params = new URLSearchParams( location.search );
			pathInput.value = params.get( 'file' );
			this.file = params.get( 'file' );
			moduleInput.value = params.get( 'module' );
			tagInput.value = params.get( 'tag');
		}
	}

	setupOptions( optionsContent ) {
		try {
			const options = JSON.parse( optionsContent );
			if (options.modules) {
				this.addFileList (options.modules);
			}
		} catch (error) {
			this.sendError (
				error,
				"Error Reading Options",
				0,
				null,
				"A parsable JSON string"
			)
		}
	}

	addFileList( files = [] ) {
		files = files.flat();
		const filelist = this.shadowRoot.querySelector('#file-datalist');
		const host = location.host;
		for (const item of files) {
			const idx = (item.indexOf (host) > -1) ? item.indexOf(host) + host.length : 0;
			const display = item.substring (idx);
			filelist.insertAdjacentHTML ('beforeend', `<option value="${item}">${display}</option>`)
		}
	}

	async addModuleList( path ) {
		const modlist = this.shadowRoot.querySelector('#module-datalist');
		try {
			const mods = await import (path);
			for (const mod of  Object.entries(mods)) {
				modlist.insertAdjacentHTML ('beforeend', `<option>${mod[0]}</option>`);
			}
		} catch (error) {
			// console.error (error);
			this.sendError (
				error,
				"Error Loading Module List",
				0,
				null,
				`A list of modules exported from: ${path}`
			)
		}
	}

	/**
 	 * Initializes the module.
 	 *
 	 * This method is called on form submit.
 	 * 1. Prevents default form submission behavior.
 	 * 2. Records the start time of the run.
 	 * 3. Extracts user input values for tag, URL, and module name.
 	 * 4. Asynchronously loads the module script using `loadModule`.
 	 * 5. Creates a new script element and sets its attributes.
 	 * 6. Extracts test definitions from the loaded module.
 	 * 7. Calls `setup` to prepare the UI for the run.
 	 * 8. Sets the script content to import necessary modules and expose the test runner globally.
 	 * 9. Appends the script element to the shadow DOM.
 	 * 10. Calls `initTestRunner` to start the test execution with the extracted tests and tag.
 	 *
 	 * @param {Event} event The submit event from the form.
 	 */
	async init( event ) {
		event.preventDefault();
		this.startTime = Date.now();
		this.file = event.target.file.value;
		const tag = event.target.tag.value;
		const moduleName = event.target.module.value;
		const component = await this.loadModule( this.file, moduleName );
		const tests = this.getTests( component );

		if ( tests.size === 0 ) {
			try {
				throw( 'No Tests Found' );
			} catch (error) {
				this.sendError( error, 'No tests were found', '', 0, '... some tests?' );
			}
		} else {
			this.setup();
			this.initTestRunner( tests, tag );
		}
	}

	/**
 	 * Asynchronously loads a module script and retrieves the specified component.
 	 *
 	 * This method attempts to import the module script provided by `url` and extracts the component with the name `moduleName`.
 	 * If the module is loaded successfully, the extracted component is returned.
 	 * If there is an error during loading or extraction, the error is logged and re-thrown.
 	 *
 	 * @param {string} url The URL of the module script.
 	 * @param {string} moduleName The name of the component to export from the module.
 	 * @returns {Promise<any>} A promise that resolves with the extracted component or rejects with an error.
 	 *
 	 */
	async loadModule( url, moduleName ) {
		try {
			const response = await import (url);
			const component = response[moduleName];
			return component;
		} catch (error) {
			this.sendError (
				error,
				`Could not load file at ${url} or could not load ${moduleName}`,
				null,
				null,
				Object (moduleName)
			);
			throw error;
		}
	}

	async loadFullText( url ) {
		try {
			const response = await fetch (url);
			this.fullCode = await response.text();
			const evt = new CustomEvent(this.scriptLoadEvent, { detail:this.fullCode } );
			document.dispatchEvent(evt);
		} catch (error) {
			this.sendError (
				error,
				`Could not load ${url}`,
				null,
				null,
				`The text loaded from ${url}`
			);
		}
	}

	/**
 	 * Extracts test definitions from a component's code.
 	 *
 	 * Parses the component's source code to identify test functions marked with the `test` annotation.
 	 * It groups tests based on their function bodies and extracts expected results and line numbers (if enabled).
 	 *
 	 * @param {any} component The component to extract tests from.
 	 * @returns {Map<string, Set<Array<Function|string|number>>>}
 	 *   A map where keys are unique test function bodies and values are sets of arrays containing:
 	 *   - The test function wrapped in a closure with access to the component instance.
 	 *   - The expected result.
 	 *   - The line number where the test was found (if `this.lineNumbers` is true).
 	 *
 	 * @test self.getTests(self).size // 8
 	 */
	getTests( component ) {
		let i = 0, line = null;
		const tests = new Map();
		const regex = /\*\s+@test([\s\S]*?)\/\/\s+([^\n]*)/g;
		const code = component.toString();
		const matches = code.matchAll (regex);

		for (const match of matches) {
			if (this.lineNumbers) line = this.getLineNum (regex, match[0], this.fullCode);
			const expected = match[2].trim();
			const func = match[1].trim();
			if (! tests.has (func)) tests.set (func, new Set());
			const item = tests.get (func);
			item.add ([func, expected, line]);
			i++;
		}

		this.totalTests = i;
		return tests;
	}

	/**
 	 * Prepares the user interface for the test run.
 	 *
 	 * This method updates the UI elements to reflect the number of tests and disables/enables buttons accordingly.
 	 */
	setup() {
		const startBtn = this.shadowRoot.querySelector('#start');
		const pauseBtn = this.shadowRoot.querySelector('#pause');
		const totalContainer = this.shadowRoot.querySelector('#total');
		const progress = this.shadowRoot.querySelector('#progress');
		totalContainer.textContent = this.totalTests;
		progress.setAttribute('max', this.totalTests);
		startBtn.classList.add( 'hidden' );
		startBtn.disabled = true;
		pauseBtn.disabled = false;
	}

	/**
 	 * Initializes and starts the test runner.
 	 *
 	 * This method attempts to create a new `WijitTestRunner` instance and starts the test execution.
 	 * It handles cases where `WijitTestRunner` is not yet available and retries for a limited time.
 	 *
 	 * @param {Map<string, Set<Array<Function|string|number>>>} tests A map containing the extracted test definitions.
 	 * @param {string} tag The tag name of the custom element to test.
 	 *
 	 * @test self.initTestRunner(new Map([[]]), 'wijit-tester') instanceof WijitTestRunner // true
 	 */
	initTestRunner( tests, tag ) {
		const tester = new WijitTestRunner( tests, tag, this );
		tester.useConsole = self.useConsole;
		tester.onlyErrors = self.onlyErrors;
		this.startTests( tests, tester );
		return tester;
	}

	/**
 	 * Starts the execution of all tests within the provided map.
 	 *
 	 * This method iterates through each test definition in the `tests` map and calls the `doTest` method of the `tester` instance to execute the test.
 	 * It uses `async/await` to pause execution if this.paused is true
 	 *
 	 * @param {Map<string, Set<Array<Function|string|number>>>} tests A map containing the extracted test definitions.
 	 * @param {WijitTestRunner} tester The instance of the `WijitTestRunner` to execute the tests.
 	 */
	async startTests( tests, tester ) {
		for (const [key, items] of tests) {
			for (const [func, predicted, line] of items) {
				await this.pauseIfNeeded();
				tester.doTest (func, predicted, line);
			}
		}
	}

	/**
 	 * Updates the UI with the results of a completed test.
 	 *
 	 * This method receives an event object containing test result data (`event.detail`) and processes it.
 	 * It updates the UI based on the test verdict:
 	 *
 	 * - If `onlyErrors` is enabled and the verdict is "pass", only updates the current test number and progress.
 	 * - Otherwise, creates a detailed breakdown of the test result, including description, expected and actual values, line number (if available), and verdict.
 	 *
 	 * Additionally, the method updates the current test number and progress bar value. Finally, it calls the `done` method if all tests have finished.
 	 *
 	 * @param {Event} event The event object containing test result data.
 	 * @param {object} event.detail The test result data.
 	 * @param {string} event.detail.verdict The test verdict ("pass", "fail", "error").
 	 * @param {string} event.detail.description The test description.
 	 * @param {string} event.detail.expected The expected result.
 	 * @param {string} event.detail.result The actual result.
 	 * @param {number} event.detail.idx The index of the test.
 	 * @param {number} event.detail.line (Optional) The line number where the test is defined.
 	 */
	addResult( event ) {
		const data = event.detail;
		const idx = data.idx;
		if (!this.useConsole) {
			const verdict = data.verdict;
			const currentContainer = this.shadowRoot.querySelector('#current');
			const progress = this.shadowRoot.querySelector('progress');
			const output = this.shadowRoot.querySelector('output');

			if (this.onlyErrors && verdict === 'pass') {
				currentContainer.textContent = idx;
				progress.value = idx;
			} else {
				const line = (data.line) ? ` | <b>Line:</b> ${data.line}` : '';
				const template = `
					<details>
						<summary class="${verdict}"> ${idx} <b>${verdict}:</b> <br>${data.description} </summary>
						<code>
							\t<b>Result:</b> ${data.result} (${typeof data.result}) | <b>Expected:</b> ${data.expected} (${typeof data.expected}) ${line}
						</code>
					</details>
				`;

				output.insertAdjacentHTML('afterbegin', template);
				currentContainer.textContent = idx;
				progress.value = idx;
			}
		}

		if (idx === this.totalTests) this.done();
	}

	/**
 	 * Pauses/Resumes the current operation when the "pause" button is clicked.
 	 *
 	 * @returns {Promise<void>} A promise that resolves when the pause is cancelled.
 	 */
	async pauseIfNeeded() {
		if (this.paused) {
			await new Promise (resolve => {
				const pauseBtn = this.shadowRoot.querySelector('#pause');
				pauseBtn.addEventListener('click', resolve, { signal:this.abortController.signal });
			});
			this.paused = false;
		}
	}

	/**
	 * Sets this.paused to be the opposite of its current (true|false) value
	 * and changes the text on the pause button
	 */
	pause() {
		const pauseBtn = this.shadowRoot.querySelector('#pause');
		this.paused = !this.paused;
		pauseBtn.classList.toggle ('active');
	}

	sendError( error, description, idx, line, expected ) {
		const info = this.errorInfo;
		info.verdict = 'ERROR';
		info.result = error.toString();
		info.expected = expected || info.expected;
		info.idx = idx;
		info.line = line;
		info.description = description;
		const evt = new CustomEvent(this.errorEvent, { detail: info });
		this.dispatchEvent(evt);
	}

	/**
 	 * Gets the line number corresponding to a given index in a string.
 	 * This method assumes the string is utf-8 encoded, and calculates the line number based on the number of newlines encountered before the specified index.
 	 *
 	 * @param {string} string 	- The text content to search.
 	 * @param {number} index 	- The character index within the string.
 	 * @returns {number} 		- The line number corresponding to the index (starting from 1).
 	 *
 	 * @test self.getLineNum(/^getLineNum/g, 'getLineNum', 'get line number: getLineNum') // 0
	 */
	getLineNum( regex, textToMatch, fullText ) {
		let line = 0;
		const matches = fullText.matchAll (regex);
		for (const match of matches) {
			if (match[0] === textToMatch) {
				line = fullText
				.substring (0, match.index)
				.split ('\n')
				.length;
				break;
			}
		}

		return line;
	}

	/**
	 * Converts milliseconds into hours, minutes, seconds and milliseconds
	 * @param  {number} milliseconds The number of milliseconds
	 * @return {object}              An object containing {hours, minutes, seconds, milliseconds}
	 *
	 * @test JSON.stringify (self.convertTime(123456789) ) // '{"hours":34,"minutes":17,"seconds":36,"milliseconds":789}'
	 */
	convertTime( milliseconds ) {
		return {
			hours: Math.floor(milliseconds / 3600000),
			minutes: Math.floor((milliseconds % 3600000) / 60000),
			seconds: Math.floor(((milliseconds % 3600000) % 60000) / 1000),
			milliseconds: milliseconds % 1000
		}
	}

	/**
 	 * Calculates and displays the total test execution time.
 	 *
 	 * This method calculates the elapsed time since the `startTime` was set and formats it into a human-readable string (hours:minutes:seconds:milliseconds).
 	 * It then updates the UI element with the formatted time.
 	 */
	done() {
		const total = this.convertTime(Date.now() - this.startTime);
		const str = `${total.hours} : ${total.minutes} : ${total.seconds} : ${total.milliseconds}`;
		const container = this.shadowRoot.querySelector('#time');
		const pauseBtn = this.shadowRoot.querySelector('#pause');
		const reloadBtn = this.shadowRoot.querySelector('#reload');
		container.textContent = str;
		this.abortController.abort();
		reloadBtn.classList.remove('hidden');
		pauseBtn.disabled = true;
	}

	/**
 	 * Gets the value of the private `path` property.
 	 *
 	 * @returns {string} The path value.
 	 */
	get file() { return this.#file; }

	/**
	 * Sets the value of the private `path` property
	 * @param  {string} value The file path or url to a module
	 */
	set file( value ) {
		this.#file = value;
	}

	get lineNumbers() { return this.#lineNumbers; }

	set lineNumbers( value ) {
		switch (value) {
		case false:
		case 'false':
			value = false;
			break;
		default:
			value = true;
			break;
		}

		this.#lineNumbers = value;
	}

	/**
	 * Gets the value of the private `module` property
	 * @return {string} - The name of the module
	 */
	get module() { return this.#module; }

	/**
	 * Sets the value of the private `module` property
	 * @param  {string} - value The name of the module
	 */
	set module( value ) {
		this.#module = value;
	}

	/**
	 * Gets the value of the private `tag` property
	 * @return {string} - The name of the tag
	 */
	get tag() { return this.#tag; }

	/**
	 * Sets the value of the private `tag` property
	 * @param  {string} value - The name of the custom tag associated with this.module (ie. my-customtag)
	 */
	set tag( value ) {
		this.#tag = value;
	}

	/**
	 * Gets the value of the private `stopOnError` property
	 * @return {boolean}
	 */
	get stopOnError() { return this.#stopOnError; }

	/**
	 * Sets the private `stopOnError` property. If true, operations are paused when a test fails.
	 * @param  {string | boolean} value - 'false' or false = false, anything else = true
	 */
	set stopOnError( value ) {
		switch (value) {
		case 'false':
		case false:
			value = false;
			break;
		default:
			value = true;
			break;
		}

		this.#stopOnError = value;
	}

	/**
	 * Gets the value of the private `onlyErrors` property
	 * @return {boolean}
	 */
	get onlyErrors() { return this.#onlyErrors; }

	/**
	 * Sets the value of the onlyErrors property. If true, only failed tests are shown.
	 * @param  {string | boolean} value - 'false' or false = false, anything else = true
	 * @return {[type]}       [description]
	 */
	set onlyErrors( value ) {
		switch (value) {
		case 'false':
		case false:
			value = false;
			break;
		default:
			value = true;
			break;
		}

		this.#onlyErrors = value;
	}

	/**
	 * Gets the value of the property `useConsole`
	 * @return {boolean}
	 */
	get useConsole() { return this.#useConsole; }

	/**
	 * Sets the value of the property `useConsole`. If true, test results will be logged using console.debug() instead of being output as HTML.
	 * @param  {string | boolean} value - 'false' or false = false, anything else = true
	 */
	set useConsole(value) {
		const progressContainer = this.shadowRoot.querySelector('#progress-container');
		switch (value) {
		case 'false':
		case false:
			value = false;
			if (progressContainer) progressContainer.classList.remove('hidden');
			break;
		default:
			value = true;
			if (progressContainer) progressContainer.classList.add('hidden');
			break;
		}

		this.#useConsole = value;
	}
}

document.addEventListener ('DOMContentLoaded', customElements.define('wijit-tester', WijitTester));

/**
 * @class WijitTestRunner
 * @description A test runner for modules
 * @author Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 */
export class WijitTestRunner {
	/**
   	 * The caller object that triggered the test run.
   	 *
   	 * @type {Object}
   	 */
	caller;

	/**
   	 * The instance of the module under test.
   	 *
   	 * @type {Object}
   	 */
	instance;

	mocks = new Set();
	addIdx = true;

	/**
   	 * Timestamp of when the test run started.
   	 *
   	 * @type {number}
   	 */
	startTime = Date.now();

	/**
	 * A map containing all the defined tests, where keys are unique test names and values are arrays of test definition objects.
	 *
	 * @type {Map<string, Array<Object>>}
	 */
	tests = new Map();

	/**
   	 * Whether to log test results to the console.
   	 *
   	 * @type {boolean}
   	 * @default true
   	 */
	useConsole = true;

	/**
   	 * Whether to only report failed tests.
   	 *
   	 * @type {boolean}
   	 * @default true
   	 */
	onlyErrors = true;

	/**
	 * Whether to reset the instance being tested on each test.
	 *
	 * @type {Boolean}
	 * @default true
	 */
	reset = true;

	/**
     * The sequential test number (starting from 1) for the current test run.
     *
     * @type {number}
     */
	testNum = 1;

	testResults = {
		verdict : null,
		expected : 'No error ... duh',
		result : "D'oh!",
		description: null,
		idx: null,
		line: null
	}

	testSubject;

	failEvent = 'testFailed';
	passEvent = 'testPassed';
	errorEvent = 'testError';

	/**
	 * Constructor
	 * @param  {Map} tests 							- A Map of test definitions
	 * @param  {string | object} tagNameOrModule 	- The (string) tag name associated with a web component or the (object) astual module to test
	 * @param  {object} caller          			- The object that triggered the test. Defaults to the document object.
	 */
	constructor ( tests, testSubject, caller = document ) {
		this.tests = tests;
		this.caller = caller;
		this.testSubject = testSubject;
		this.init ();
	}

	/**
 	 * Initializes the instance of the component or web component to be tested.
 	 *
 	 * This method accepts either a string representing a custom element tag name or a module with a constructor. It sets the `this.instance` property accordingly.
 	 *
 	 * @param {string | Object} [instance=this.instance] - The initial instance to use. If not provided, defaults to the existing `this.instance`.
 	 * @throws {Error} If the provided `instance` is neither a string nor a module with a constructor.
 	 */
	init ( testSubject = this.testSubject ) {
		if (typeof testSubject === 'string') {
			// instance is a tag name (custom element)
			this.instance = this.setCustomElement (testSubject);
		} else if (testSubject.constructor) {
			// instance has a constructor
			this.instance = new testSubject;
		} else if (typeof testSubject === 'function' || testSubject instanceof Object) {
			// exported function or object
			this.instance = testSubject;
		} else {
			this.instance = false;
			this.sendError (
				`( type: ${typeof testSubject} ) ( ${testSubject.toString()} )`,
				'Neither a (string) Custom Element, nor a module with a constructor was provided',
				this.testNum,
				null,
				'An exported tag name, function, object or module with constructor'
			);
		}
	}

	/**
 	 * Creates a custom element instance based on the provided tag name.
 	 *
 	 * This method checks if the given `tagName` is registered in the `customElements.registry`. If found, it creates a new element using `document.createElement`, appends it to the document body, and returns the created instance.
 	 *
 	 * @param {string} tagName 	- The tag name of the custom element to create.
 	 * @returns {HTMLElement} 	- The created custom element instance.
 	 * @throws {Error} If the provided `tagName` is not found in the `customElements.registry`.
 	 */
	setCustomElement ( tagName ) {
		const existing = document.body.querySelector ( `${tagName}` );
		const mod = customElements.get( tagName );

		if ( !mod ) {
			const msg = `[ ${tagName} ] not found in customElementRegistry`
			this.sendError (
				false,
				msg,
				null,
				null,
				"A Web Component or Custom Element instance"
			);
		} else {
			if ( existing ) existing.remove();
			if (document) {
				const elem = document.createElement( tagName );
				document.body.append( elem );
				return elem;
			} else {
				return new mod();
			}
		}
	}

	/**
 	 * Executes the specified tests or all available tests.
 	 *
 	 * This method iterates through the provided `tests` (or the `this.tests` map if none are provided) and runs each test using the `doTest` method. It then calculates the total execution time and formats it, returning the formatted time string if `useConsole` is false, or logging it to the console if `useConsole` is true.
 	 *
 	 * @param {Map<string, Array<Object>> | Array<Array<Object>>} [tests=this.tests] 	- The tests to run. If not provided, all tests from the `this.tests` map are used.
 	 * @returns {string} (Optional) 	- The formatted total execution time string if `useConsole` is false.
 	 */
	run ( tests = this.tests ) {
		const startTime = Date.now();

		for (const [key, items] of tests) {
			for (const [func, predicted] of items) {
				this.doTest (func, predicted, key);
			}
		}

		const endTime = Date.now();
		const elapsed = endTime - startTime;
		const time = this.convertTime(elapsed);
		const str = `Total time: ${time.hours} : ${time.minutes} : ${time.seconds} : ${time.milliseconds}`;

		if (this.useConsole) {
			console.debug ('##########################################');
			console.debug (str);
		} else {
			return str;
		}
	}

	setMock( func, predicted, line ) {
		this.mocks.add( [func, predicted, line] );
	}

	/**
 	 * Executes a single test and reports the results.
 	 *
 	 * This method takes a test function, its expected result, and an optional line number as input. It initializes the instance using `this.init`, extracts the test description/function, and attempts to execute the function.
 	 * The method uses a Promise-based approach to handle asynchronous results. It then compares the actual result with the expected result and determines the verdict ("pass" or "fail").
 	 * Depending on the `useConsole` property and verdict, it either logs the result to the console or dispatches custom events to the caller (`testfailed` for failures, `testcompleted` for a completed test).
 	 * Finally, it increments the test number and optionally logs the elapsed time since the start of the test run.
 	 *
 	 * @param {function} 	func 				- The test function to execute.
 	 * @param {any} 		predicted 		- The expected result of the test.
 	 * @param {number} 	[line = null] - The line number where the test is defined (if available).
 	 */
	doTest( func, predicted, line = null ) {
		let noreset = '';

		if (func.indexOf('mock') > -1) {
			func = func.replace('mock', '').trim();
			this.setMock(func, predicted, line);
			return;
		}

		if (func.indexOf('noreset') > -1  || !this.reset) {
			func = func.replace('noreset', '').trim();
			noreset = 'noreset ';
		} else {
			this.init ();
			if (this.mocks.size > 0) {
				const entries = this.mocks.values();
				const entry = entries.next().value;
				this.getResult(entry[0], `Mock: ${entry[0]}`, this.testNum, entry[2])
				.then (result => {
					if (this.addIdx) this.testNum++;
					this.addIdx = false;
				});
			}
		}

		const self = this.instance;
		self.WijitTestRunner = this;
		let desc = func.toString().replace(/function anonymous[^\{]+\{(\s*return)?|\}$/g, '');
		desc = noreset + desc + ` //  ${predicted}`;

		this.getResult (func, desc, this.testNum, line)
		.then (result => {
			let evt;
			const info = this.testResults;
			info.expected = this.getExpected (predicted, desc, this.testNum, line)

			try {
				info.verdict = (result == info.expected) ? 'pass' : 'fail';
			} catch (error) {
				this.sendError (
					error,
					desc,
					this.testNum,
					line,
					info.expected
				);
			}

			info.result = result;
			info.idx = this.testNum;
			info.line = line;
			info.description = desc;

			switch (info.verdict) {
				case 'pass':
					evt = new CustomEvent (this.passEvent, { detail: info });
					this.caller.dispatchEvent (evt);
					break;
				case 'fail':
					evt = new CustomEvent (this.failEvent, { detail: info });
					this.caller.dispatchEvent (evt);
					break;
			}

			if (this.useConsole) {
				if (this.onlyErrors && info.verdict === 'pass') return;
				const style = (info.verdict === 'pass') ? 'color:limegreen;font-weight:bold' : 'color: red;font-weight:bold';
				const time = this.convertTime(Date.now() - this.startTime);
				const elapsed = `${time.hours} : ${time.minutes} : ${time.seconds} : ${time.milliseconds}`;
				console.debug (`%c${info.verdict}`, style, elapsed, info);
			}

			this.testNum++;
		});
	}

	/**
	 * Convert every test result into a Promise to simplify processing of both non-async/async tests
	 * @param  {any} result 	- The result returned from a test function
	 * @return {Promise}        - A (fulfilled) Promise.
	 */
	getResult( func, description, idx, line ) {
		let result;
		const self = this.instance;
		func = this.funFactory (func, idx, line, description);
		try {
			result = func (self);
		} catch (error) {
			this.sendError (error, description, idx, line);
		}

		return Promise.resolve(func(self));
	}

	getExpected( predicted, description, idx, line ) {
		const self = this.instance;
		const func = this.funFactory (predicted, idx, line, description);
		try {
			return func (self)
		} catch (error) {
			this.sendError (error, description, idx, line, predicted);
		}
	}

	funFactory( str, i, line, expected ) {
		const regex = /\breturn\b/;
		str = (regex.test(str)) ? str : 'return ' + str;
		try {
			return Function ('self', str);
		} catch (error) {
			this.sendError (error, str, i, line, expected)
		}
	}

	sendError( errorOrResult, line, expected = '...', description, idx ) {
		const info = this.testResults;
		info.verdict = 'ERROR';
		info.result = errorOrResult.toString();
		info.expected = expected || info.expected;
		info.idx = idx || this.testNum;
		info.line = line;
		info.description = description;
		const evt = new CustomEvent(this.errorEvent, { detail: info });
		this.caller.dispatchEvent(evt);
		this.testNum++;
	}

	/**
	 * Converts milliseconds into hours, minutes, seconds and milliseconds
	 * @param  {number} milliseconds 	- The number of milliseconds
	 * @return {object}              	- An object with the properties {hours, minutes, seconds, milliseconds}
	 */
	convertTime( milliseconds ) {
		return {
			hours: Math.floor(milliseconds / 3600000),
			minutes: Math.floor((milliseconds % 3600000) / 60000),
			seconds: Math.floor(((milliseconds % 3600000) % 60000) / 1000),
			milliseconds: milliseconds % 1000
		}
	}
}
