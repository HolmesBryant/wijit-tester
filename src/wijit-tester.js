/**
 * @class WijitTester
 * @extends HTMLElement
 * @description A custom element for performing unit and integration tests for web components
 * @author Holmes Bryant <webbmaastaa@gmail.com>
 * @license GPL-3.0
 */
export class WijitTester extends HTMLElement {
	abortController = new AbortController();
	testScriptId = 'wt_' + Math.random().toString(36).substring(2, 8);
	totalTests = 0;
	startTime;
	paused = false;
	#lineNumbers = false;
	#module = '';
	#onlyErrors = false;
	#path = '';
	#stopOnError = false;
	#tag = '';
	#useConsole = false;
	static observedAttributes = [
		'path',
		'line-numbers',
		'module',
		'only-errors',
		'stop-on-error',
		'tag',
		'use-console'
	];

	constructor () {
		super();
		this.attachShadow ({ mode:'open' });
		this.path = this.getAttribute('path') || '';
		this.module = this.getAttribute('module') || '';
		this.tag = this.getAttribute('tag') || '';
		this.stopOnError = this.getAttribute('stop-on-error') || this.stopOnError;
		this.onlyErrors = this.getAttribute('only-errors') || this.onlyErrors;
		this.useConsole = this.getAttribute('use-console') || this.useConsole;
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					--bg1-color: whitesmoke;
					--bg2-color: white;
					--bg3-color: gainsboro;
					--trans-color: rgba(255,255,255,0.9);
					--border-color: silver;
					--text-color: rgb(60,60,60);
					--fail-color: pink;
					--pass-color: palegreen;
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
						--text-color: rgb(240, 240, 240);
						--trans-color: rgba(40,40,40,0.7);
						--pass-color: darkslategray;
						--fail-color: firebrick;
					}
				}

				/****** Backgrounds ******/

					.sticky
					{ background-color: var(--bg1-color); }

					input,
					output
					{ background-color: var(--bg2-color) }

					button,
					input[type="file"]::file-selector-button
					{ background-color: var(--bg3-color) }

					details {
						background-color: var(--trans-color);
					}

					.fail
					{ background-color: var(--fail-color); }

					.pass
					{ background-color: var(--pass-color); }

					output {
						border: 1px solid orange;
						background-image:
							linear-gradient(rgba(255,255,255, 0.5), rgba(0,0,0,0.5)),
							url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEzIiBoZWlnaHQ9IjUzNCIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgNTEzIDUzNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJtNTEyIDE3NGMzLjQgOS4wNyAwLjUzMiAxOS4yLTYuODEgMjUuN2wtMzIuOSAyOS4zYy04LjE5IDcuNDEtMTIuMSAxOC4zLTExLjYgMjkuMSAwLjEwNiAzLjAyIDAuMjEzIDYuMDUgMC4yMTMgOS4xOCAwIDMuMTMtMC4xMDYgNi4xNS0wLjIxMyA5LjE4LTAuNTMyIDExIDMuMyAyMS44IDExLjYgMjkuMWwzMi45IDI5LjNjNy4zNCA2LjQ3IDEwLjIgMTYuNiA2LjgxIDI1LjctNC42OCAxMi40LTEwLjMgMjQuMy0xNi44IDM1LjhsLTUgOC40NWMtNy4wMiAxMS41LTE0LjkgMjIuMy0yMy41IDMyLjUtNi4yNyA3LjUxLTE2LjcgMTAtMjYuMSA3LjA5bC00Mi4yLTEzLjFjLTEwLjYtMy4zNC0yMi4xLTEuMTUtMzEuNiA0LjgtNS4yMSAzLjIzLTEwLjUgNi4zNi0xNi4xIDkuMDctOS44OSA1LjAxLTE3LjUgMTMuOC0yMCAyNC40bC05LjQ2IDQyLjVjLTIuMTMgOS40OS05LjU3IDE3LTE5LjQgMTguNi0xNC43IDIuNC0yOS44IDMuNjUtNDUuMiAzLjY1LTE1LjQgMC0zMC41LTEuMjUtNDUuMi0zLjY1LTkuNzgtMS41Ni0xNy4yLTkuMDctMTkuNC0xOC42bC05LjQ2LTQyLjVjLTIuMzQtMTAuNi0xMC4xLTE5LjQtMjAtMjQuNC01LjUzLTIuODItMTAuOC01Ljg0LTE2LjEtOS4wNy05LjM2LTUuOTUtMjEtOC4xNC0zMS42LTQuOGwtNDIuMSAxMy4yYy05LjM2IDIuOTItMTkuOCAwLjMxMy0yNi4xLTcuMDktOC42MS0xMC4yLTE2LjUtMjEuMS0yMy41LTMyLjVsLTUtOC40NWMtNi40OS0xMS41LTEyLjEtMjMuNC0xNi44LTM1LjgtMy40LTkuMDctMC41MzItMTkuMiA2LjgxLTI1LjdsMzIuOS0yOS4zYzguMTktNy40MSAxMi4xLTE4LjMgMTEuNi0yOS4xLTAuMTA2LTMuMDItMC4yMTMtNi4wNS0wLjIxMy05LjE4IDAtMy4xMyAwLjEwNi02LjE1IDAuMjEzLTkuMTggMC41MzItMTEtMy4zLTIxLjgtMTEuNi0yOS4xbC0zMi45LTI5LjRjLTcuMzQtNi40Ny0xMC4yLTE2LjYtNi44MS0yNS43IDQuNjgtMTIuNCAxMC4zLTI0LjMgMTYuOC0zNS44bDUtOC40NWM3LjAyLTExLjUgMTQuOS0yMi4zIDIzLjUtMzIuNSA2LjI3LTcuNTEgMTYuNy0xMCAyNi4xLTcuMDlsNDIuMiAxMy4xYzEwLjYgMy4zNCAyMi4xIDEuMTUgMzEuNi00LjggNS4yMS0zLjIzIDEwLjUtNi4zNiAxNi4xLTkuMDcgOS44OS01LjAxIDE3LjUtMTMuOCAyMC0yNC40bDkuNDYtNDIuNWMyLjEzLTkuNDkgOS41Ny0xNyAxOS40LTE4LjYgMTQuNy0yLjUgMjkuOC0zLjc2IDQ1LjItMy43NiAxNS40IDAgMzAuNSAxLjI1IDQ1LjIgMy42NSA5Ljc4IDEuNTYgMTcuMiA5LjA3IDE5LjQgMTguNmw5LjQ2IDQyLjVjMi4zNCAxMC42IDEwIDE5LjQgMjAgMjQuNCA1LjUzIDIuODIgMTAuOCA1Ljg0IDE2LjEgOS4wNyA5LjM2IDUuOTUgMjEgOC4wMyAzMS42IDQuOGw0Mi4yLTEzLjFjOS4zNi0yLjkyIDE5LjgtMC4zMTMgMjYuMSA3LjA5IDguNjEgMTAuMiAxNi41IDIxLjEgMjMuNSAzMi41bDUgOC40NWM2LjQ5IDExLjUgMTIuMSAyMy40IDE2LjggMzUuOHoiLz48cGF0aCBkPSJtMzY1IDQ1N2MtNi44Ni0xLjk3LTExLjMtNC40OS0xNS4yLTguNjctMy42Ni0zLjkzLTcuNDMtOS43OC0zMC4zLTQ3LjEtOC4yOS0xMy41LTE1LjUtMjUuMS0xNi4xLTI1LjctMC42MzQtMC42OC0xNS41LTIuMzktMzguOS00LjQ5LTIwLjgtMS44Ni0zOS44LTMuNi00Mi4xLTMuODdsLTQuMTktMC40NzctMTUuNyAxOS4xYy0xOC4xIDIyLTI3LjIgMzIuMS0zMS4zIDM0LjctOCA0Ljk4LTE5LjQgNi4yNS0zMS42IDMuNTQtNzMuMi0xNi4zLTk0LjEtMjEuMy05OS4yLTI0LTEyLjEtNi4yMy0xOS4yLTIxLjQtMTYuNy0zNS42IDEuMjMtNi45OSAzLjU5LTExLjggOC40MS0xNy4xIDUuNTQtNi4xNCAxMi4zLTkuMTcgMjEuNS05LjYyIDcuODktMC4zOSAxNy43IDEuNSA2NC44IDEyLjUgMTAuMSAyLjM3IDE4LjcgNC4zIDE5LjEgNC4zIDAuNzcyIDAgMTEtMTIuNyAxMS0xMy42IDAtMC4zNzQtMS40NC0yLjQ4LTMuMjEtNC42OS03LjExLTguODctMTAuMi0yMS42LTcuODgtMzEuOSAxLjE3LTUuMDkgMTQuMS0zNi43IDI3LjItNjYuMyAzLjg2LTguNzYgNy4wMi0xNi40IDcuMDItMTcgMC0wLjU5Ni00LjY4LTIuNjgtMTAuNC00LjY0cy0xNi41LTUuNjQtMjQtOC4xOWwtMTMuNi00LjYzLTcuNjQgOC43M2MtNC4yIDQuOC0xMi4yIDE0LTE3LjggMjAuNS0xMy43IDE1LjgtMTUuNyAxNy42LTIyLjYgMjEtNS4wMiAyLjQ0LTcuMDYgMi44OS0xMi45IDIuODktMTIuMyAwLTIxLjctNS45Ni0yNy4xLTE3LjItMi43MS01LjYzLTMuMDItNy4xMS0yLjk5LTE0LjMgMC4wMjU3LTYuODYgMC40MDItOC43OSAyLjU1LTEzLjEgMi45My01Ljg3IDIuMTMtNC45IDI5LjctMzYuMSAyNC45LTI4LjIgMjUuMS0yOC4zIDMyLjgtMzIuMyA1LjQ1LTIuNzggNi43NC0zLjA1IDE0LjMtMy4wMSA4LjE0IDAuMDM4OSA5LjIyIDAuMzM0IDQ0LjMgMTIgMTkuOCA2LjYgMzYuMiAxMS44IDM2LjYgMTEuNiAwLjM4OC0wLjI0NSAwLjM2MS0yLjI2LTAuMDU4OC00LjQ4LTIuMjYtMTEuOSAwLjc1MS0zMi41IDYuOS00Ny4yIDQuNTgtMTEgMTQuMy0yMy43IDI0LjYtMzIuMSA2LjcyLTUuNSAxOS44LTEyLjMgMjguMi0xNC42IDguNC0yLjM1IDI3LjktMi44MSAzNi41LTAuODYgMTIuMyAyLjc5IDEzLjkgMi44IDIwLjEgMC4xMSA3LjA1LTMuMDMgOS41LTMuMDkgMTIuMS0wLjI3NSAyLjk2IDMuMjIgMi43NCA5LjA3LTAuNDkzIDEzbC0yLjUgMy4wNCA3LjQ4LTAuNDQzYzkuODEtMC41OCAxNS44LTMuNTQgMjIuNy0xMS4yIDMuMjctMy42MiA1Ljg1LTUuNjYgNy4xNS01LjY2IDIuODYgMCA3Ljk0IDUuNTMgOS4xNCA5Ljk3IDEuNDEgNS4xNyAxLjI2IDE2LjEtMC4yODIgMjEuMy0zLjA3IDEwLjMtMTEuNSAyMy0xNy40IDI2LjNsLTIuMyAxLjI2IDIuMiA4LjE3YzguNTkgMzEuOC0zLjA2IDY3LjMtMjguMiA4NS45LTMuOTYgMi45My00IDMuMDEtMS44NSAzLjg1IDEuMjEgMC40NzMgMTEuMSA0LjUyIDIyIDkgMTAuOSA0LjQ3IDIwLjYgOC4xNCAyMS41IDguMTRzMjAuNS05LjY2IDQzLjUtMjEuNWw0MS44LTIxLjUgNy40OCAwLjE2NmMxNyAwLjM3OCAyOC44IDEwLjEgMzEuNyAyNiAxLjY1IDkuMTgtMS43MSAyMC4yLTguMTIgMjYuNy0zLjA1IDMuMS0xOC4xIDExLjMtMjMuNCAxMi43LTIuMTkgMC41OTYtNC42MSAxLjYzLTUuMzcgMi4yOS0wLjc2MyAwLjY2MS0yLjQzIDEuNDYtMy43IDEuNzdzLTE2IDcuNzctMzIuOCAxNi42Yy0xNi44IDguOC0zMy4yIDE3LTM2LjUgMTguMS05LjMgMy4yNS0xNi44IDIuODctMjkuMi0xLjQ4LTkuMDQtMy4xOC01Mi42LTE5LjktNjQuOC0yNC44bC00Ljc1LTEuOTMtMy43MyA4LjIxYy01LjY4IDEyLjUtMTAuNCAyMy41LTEwLjQgMjQuNCAwIDAuNDQyIDEyLjYgMiAyOCAzLjQ3IDMwLjkgMi45NCAzOC4yIDQuMTcgNDUuNSA3LjU1IDkuMDEgNC4yMiAxMy4xIDkuNjkgNDAuNiA1NC44IDE0LjMgMjMuNCAyNi4zIDQ0LjIgMjcgNDYuNiAxLjkzIDYuNTQgMS42NCAxNS40LTAuNjk2IDIxLjgtNS40MSAxNC44LTIyLjggMjMuOS0zNy41IDE5Ljd6bS03Ni0yNThjMjIuNi05LjA5IDM0LjMtMzMuMyAyOC43LTU5LTEuNTgtNy4xNy0xLjQ1LTcuMDktOS4zMi02LjAzLTIwLjYgMi43OC00Ni40LTQuNTItNjIuNS0xNy43LTIuMTItMS43NC00LjI0LTMuMTUtNC43Mi0zLjE1LTEuNjcgMC0xMC4yIDEwLjEtMTIuNiAxNC45LTcuMTcgMTQuNS02LjggMzUuNiAwLjg1MSA0OSAzLjQ1IDYuMDIgMTAuNiAxMy43IDE2LjIgMTcuNCAxMi4zIDguMDYgMzAuMyAxMCA0My41IDQuNjl6bS00Mi45LTI5LjNjLTEuMzMtMS4wNy0yLjg5LTMuNTYtMy40Ny01LjUzLTIuOTktMTAuMiA5Ljc1LTE3LjUgMTctOS43MiAzLjI0IDMuNDYgNC4wMSA3LjYxIDIuMSAxMS40LTIuODQgNS42MS0xMSA3LjYzLTE1LjYgMy44OHptMzguMS0wLjgyMWMtMi4yNS0yLjMtMi43LTMuNTMtMi43LTcuMzkgMC0zLjU4IDAuNDcxLTUuMDggMi4wOC02LjYyIDcuMDgtNi43OCAxNy4zLTIuODcgMTcuMyA2LjYxIDAgMy0wLjYyNiA0LjM5LTMuMTQgNi45Ni00LjI2IDQuMzYtOS41NyA0LjUzLTEzLjYgMC40NTF6IiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMTAiLz48L3N2Zz4K");
						background-attachment: fixed;
						background-position: bottom;
						background-repeat: no-repeat;
					}

				/****** Borders ******/

					button,
					input,
					output,
					input[type="file"]::file-selector-button
					{ border: 1px solid var(--border-color); }

					button,
					output,
					input
					{ border-radius: 10px; }

					output details:first-child summary {
						border-radius: 10px 10px 0 0;
					}

					input[type="file"]::file-selector-button
					{ border-radius: 10px 0 0 10px; }

				/***** Accents *****/
					progress
					{ accent-color: turquoise; }

				/****** Text ******/
					input,
					button
					{ color: var(--text-color); }

				/****** Cursors ******/
					button,
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

					summary:active,
					details[open] > summary:active,
					button:not(:disabled):active,
					input[type="file"]::file-selector-button:active
					{ box-shadow: inset 2px 2px 5px black; }

				/****** Structure ******/

				article {
					display: grid;
					gap: 10px;
					grid-template-columns: 1fr;
					grid-template-rows: max-content max-content 1fr;
					overflow: visible;
					min-height: 100%;
					padding: .5rem;
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
					overflow: visible;
				}

				progress {
					width: 100%;
				}

				section {
					display: flex;
					flex-direction: column;
					gap: 10px;
					overflow: visible;
				}

				section:first-child {
					border-bottom: 4px solid var(--bg3-color);
					padding-bottom: 1rem;
				}

				summary {
					padding: .5rem;
				}

				.hidden {
					display: none;
				}

				.row {
					flex-direction: row;
				}

				.sticky {
					padding: 10px;
					position: sticky;
					top: 0;
				}

				#start,
				#pause {
					flex: 0 0 4rem;
					font-size: 2rem;
					font-weight: boldest;
					transition: all .25s;
				}

				#start {
					font-size: 1.5rem;
				}
			</style>

			<form id="form"></form>
			<article>
				<section class="row">
						<div>
							<label for="file">Path to Module</label>
							<input required value="${this.path}" type="text" id="file" name="file" form="form">
						</div>

						<div>
							<label for="module">Module Name</label>
							<input required value="${this.module}" id="module" name="module" form="form">
						</div>

						<div>
							<label for="tag">Tag Name</label>
							<input required value="${this.tag}" id="tag" name="tag" form="form">
						</div>
				</section>

				<section class="sticky row">

					<button id="start" type="submit" form="form">▶︎</button>
					<button disabled id="pause">||</button>

					<div id="progress-container">
						<label for="progress">
							<span id="current">0</span>
							of
							<span id="total">x</span>
							<code>( <span id="time">time</span> )</code>
						</label>
						<progress id="progress" min="0">0</progress>
					</dv>
				</section>

				<section>
					<output></output>
				</section>
			</article>
		`;
		const progressContainer = this.shadowRoot.querySelector('#progress-container');
		if (this.useConsole) {
			progressContainer.classList.add('hidden');
		}
	}

	connectedCallback () {
		this.startBtn = this.shadowRoot.querySelector('#start');
		this.pauseBtn = this.shadowRoot.querySelector('#pause');
		this.progress = this.shadowRoot.querySelector('#progress');
		this.currentNum = this.shadowRoot.querySelector('#current');
		this.totalNum = this.shadowRoot.querySelector('#total');
		this.progress = this.shadowRoot.querySelector('progress');
		this.output = this.shadowRoot.querySelector('output');
		const form = this.shadowRoot.querySelector('form');

		form.addEventListener ('submit', (event) => this.init (event), { signal:this.abortController.signal });
		this.pauseBtn.addEventListener ('click', () => this.pause (), { signal:this.abortController.signal });
		this.addEventListener ('testcompleted', (event) => this.addResult (event), { signal:this.abortController.signal });
		this.addEventListener ('testfailed', event => {
			if (this.stopOnError) {
				this.pause();
				this.done();
			}
		}, { signal:this.abortController.signal });
	}

	disconnectedCallback () {
		this.abortController.abort();
	}

	attributeChangedCallback(attr, oldval, newval) {
		attr = attr.replace(/-./g, (match) => match.toUpperCase()[1]);
		this[attr] = newval;
	}

	async init (event) {
		event.preventDefault();
		this.startTime = Date.now();
		const tag = event.target.tag.value;
		const url = event.target.file.value;
		const moduleName = event.target.module.value;
		const component = await this.loadFile (url, moduleName);
		const script = document.createElement('script');
		const tests = this.getTests (component);

		this.setup();
		script.setAttribute('type', 'module');
		script.textContent = `
			import {WijitTestRunner} from '${import.meta.url}';
		 	import {${moduleName} as component} from '${url}';
		 	window.WijitTestRunner = WijitTestRunner;
		`;
		this.shadowRoot.append(script);
		this.initTestRunner (tests, tag);
	}

	async loadFile (url, moduleName) {
		try {
			const response = await import (url);
			const component = response[moduleName];
			return component;
		} catch (error) {
			const details = [0, 'fail', ['Error', Error], ['Object', Object], error.toString()];
			this.addResult (this.customError(details));
			throw error;
		}
	}

	addScript (content, testScriptId = this.testScriptId) {
		const script = document.createElement('script');
		script.id = testScriptId;
		script.setAttribute ('type', 'module');
		script.textContent = content;
		document.body.append (script);
	}

	setInstance (value) {
		this.tag = value;
		let i = 1, component;

		return new Promise ((resolve, reject) => {
			const interval = setInterval (() => {
				const elem = document.createElement(value);
				const component = customElements.get(value);
				document.body.prepend(elem);
				if (component) {
					clearInterval(interval);
					resolve (elem);
				} else if (i < 5) {
					i++;
				} else {
					clearInterval(interval)
					reject (new Error (`${value} not found in customElementRegistry`));
				}
			}, 100)
		});
	}

	getTests (component) {
		let i = 0, line = null;
		const tests = new Map();
		const regex = /@test([\s\S]*?)\/\/\s*([^\n]*)/g
		const code = component.toString();
		const matches = code.matchAll (regex);

		for (const match of matches) {
			if (this.lineNumbers) line = this.getLineNum(code, match.index);
			const func = `return ${match[1].trim()}`;
			const expected = match[2].trim();

			if (! tests.has (func)) {
				tests.set (func, new Set());
			}

			const item = tests.get (func);
			item.add ([Function ('self', func), expected, line]);
			i++;
		}

		this.totalTests = i;
		return tests;
	}

	setup () {
		const totalContainer = this.shadowRoot.querySelector('#total');
		totalContainer.textContent = this.totalTests;
		this.progress.setAttribute('max', this.totalTests);
		this.startBtn.disabled = true;
		this.pauseBtn.disabled = false;
	}

	initTestRunner (tests, tag) {
		let i = 1, interval;
		const output = this.shadowRoot.querySelector('output');
		output.innerHTML = '';

		if (window.WijitTestRunner) {
			const tester = new WijitTestRunner (tests, tag, this);
			tester.useConsole = this.useConsole;
			tester.onlyErrors = this.onlyErrors;
			this.startTests (tests, tester);
		} else {
			interval = setInterval (() => {
				i++;
				if (window.WijitTestRunner) {
					clearInterval (interval);
					const tester = new WijitTestRunner (tests, tag, this);
					tester.useConsole = this.useConsole;
					tester.onlyErrors = this.onlyErrors;
					this.startTests (tests, tester);
				} else if (i > 100) {
					clearInterval (interval);
					console.error ('Could not instantiate WijitTestRunner');
				}
			}, 10);
		}
	}

	async startTests (tests, tester) {
		for (const [key, items] of tests) {
			for (const [func, predicted, line] of items) {
				await this.pauseIfNeeded();
				tester.doTest (func, predicted, line);
			}
		}
	}

	addResult (event) {
		const data = event.detail;
		const progress = this.shadowRoot.querySelector('progress');
		const currentContainer = this.shadowRoot.querySelector('#current');
		const idx = data.idx;
		const verdict = data.verdict;
		if (this.onlyErrors && verdict === 'pass') {
			currentContainer.textContent = idx;
			progress.value = idx;
		} else {
			const output = this.shadowRoot.querySelector('output');
			const detail = document.createElement('details');
			const summary = document.createElement('summary');
			const description = data.description.replace(/{return|}$/g, '');
			const expected = `<b>Expected:</b> ${data.expected} (${typeof data.expected})`;
			const result = `<b>Result:</b> ${data.result} (${typeof data.result})`;
			const line = (data.line) ? ` | <b>Line:</b> ${data.line}` : '';
			summary.classList.add(verdict);
			summary.innerHTML = `${idx} <b>${verdict}:</b> ${description}`;
			detail.innerHTML = `<code>\t${result} | ${expected}${line}</code>`;
			detail.prepend (summary);
			output.prepend(detail);
			currentContainer.textContent = idx;
			progress.value = idx;
		}

		if (idx === this.totalTests) this.done();
	}

	async pauseIfNeeded () {
		if (this.paused) {
			await new Promise (resolve => {
				this.pauseBtn.addEventListener('click', resolve, { signal:this.abortController.signal });
			});
			this.paused = false;
		}
	}

	pause () {
		this.paused = !this.paused;
		this.pauseBtn.textContent = this.paused ? '▶' : '||';
	}

	customError (details = []) {
		return new CustomEvent ('customError', { detail: details });
	}

	getLineNum (string, index) {
		return string.substring (0, index).split ('\n').length + 2;
	}

	convertTime (milliseconds) {
		return {
			hours: Math.floor(milliseconds / 3600000),
			minutes: Math.floor((milliseconds % 3600000) / 60000),
			seconds: Math.floor(((milliseconds % 3600000) % 60000) / 1000),
			milliseconds: milliseconds % 1000
		}
	}

	done () {
		const total = this.convertTime(Date.now() - this.startTime);
		const str = `${total.hours} : ${total.minutes} : ${total.seconds} : ${total.milliseconds}`;
		const container = this.shadowRoot.querySelector('#time');
		container.textContent = str;
	}

	get path () { return this.#path; }
	set path (value) {
		this.#path = value;
	}

	get module () { return this.#module; }
	set module (value) {
		this.#module = value;
	}

	get tag () { return this.#tag; }
	set tag (value) {
		this.#tag = value;
	}

	get stopOnError () { return this.#stopOnError; }
	set stopOnError (value) {
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

	get onlyErrors () { return this.#onlyErrors; }
	set onlyErrors (value) {
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

	get useConsole () { return this.#useConsole; }
	set useConsole (value) {
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
 * @description A class for performing unit and integration tests for web components
 * @author Holmes Bryant <webbmaastaa@gmail.com>
 * @license GPL-3.0
 */
export class WijitTestRunner {
	caller;
	instance;
	startTime = Date.now();
	testEvent = 'testEvent';
	tests = new Map();
	useConsole = true;
	onlyErrors = true;
	testNum = 1;

	constructor (tests, tagNameOrModule, caller = document) {
		this.tests = tests;
		this.instance = tagNameOrModule;
		this.caller = caller;
		this.init ();
	}

	init (instance = this.instance) {
		if (typeof instance === 'string') {
			// instance is a tag name (custom element)
			this.instance = this.setCustomElement (instance);
		} else if (instance.constructor) {
			// instance has a constructor
			this.instance = new instance;
		} else {
			console.error ('Neither a (string) tag name nor a module with a constructor was provided');
		}
	}

	setCustomElement (tagName) {
		if (customElements.get (tagName)) {
			const elem = document.createElement (tagName);
			document.body.append (elem);
			return elem;
		} else {
			throw new Error (`[ ${tagName} ] not found in customElementRegistry`);
		}
	}

	run (tests = this.tests) {
		const startTime = Date.now();

		for (const [key, items] of tests) {
			for (const [func, predicted] of items) {
				this.doTest (func, predicted, key);
			}
		}

		const endTime = Date.now();
		const elapsed = endTime - startTime;
		const time = this.convertTime(elapsed);
		console.debug ('##########################################');
		console.debug (`Total time: ${time.hours} : ${time.minutes} : ${time.seconds} : ${time.milliseconds}`);
	}

	doTest(func, predicted, line) {
		this.init (this.instance.constructor);
		const self = this.instance;
		let outcome;
		let desc = func.toString().replace(/^[^{]+\{\s*return|\(self\s*=>\s*|\)\s*\(\s*self\s*\)|\n|\t|}$/g, '');
		desc += ` //  ${predicted}`;
		try {
			outcome = func(self);
		} catch (error) {
			const errorEvent = new CustomEvent('testfailed');
			if (this.caller) this.caller.dispatchEvent(errorEvent, {detail: error});
		}
		this.getResult(func(self))
		.then (result => {
			const expected = Function('self', `return ${predicted}`)();
			const verdict = (result == expected) ? 'pass' : 'fail';
			const ret = {
				verdict: verdict,
				expected: expected,
				result: result,
				description: desc,
				idx: this.testNum,
				line: line
			};

			if (verdict === 'fail') {
				const failEvent = new CustomEvent('testfailed');
				if (this.caller) this.caller.dispatchEvent(failEvent, {detail: ret});
			}


			if (this.useConsole) {
				if (this.onlyErrors && verdict === 'pass') return;
				const style = (verdict === 'pass') ? 'color:lime' : 'color: red';
				const exp = `Expected: ${expected} (${typeof expected})`;
				const res = `<b>Result:</b> ${result} (${typeof result})`;
				console.debug (`%c${verdict}`, style, ret);
			} else {
				const event = new CustomEvent('testcompleted', {
					detail: ret
				});

				if (this.caller) this.caller.dispatchEvent (event);
			}

			this.testNum++;
			if (this.useConsole) {
				const time = this.convertTime(Date.now() - this.startTime);
				console.debug (`${time.hours} : ${time.minutes} : ${time.seconds} : ${time.milliseconds}`);
			}
		});
	}

	/**
	 * Convert every test result into a Promise to simplify processing of both non-async/async tests
	 * @param  {[type]} result [description]
	 * @return {[type]}        [description]
	 */
	getResult(result) {
		return Promise.resolve(result);
	}

	convertTime (milliseconds) {
		return {
			hours: Math.floor(milliseconds / 3600000),
			minutes: Math.floor((milliseconds % 3600000) / 60000),
			seconds: Math.floor(((milliseconds % 3600000) % 60000) / 1000),
			milliseconds: milliseconds % 1000
		}
	}
}
