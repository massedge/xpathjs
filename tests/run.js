/**
 * Copyright (C) 2011 Andrej Pavlovic
 *
 * This file is part of XPathJS.
 *
 * XPathJS is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * XPathJS is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

YUI().use("node", "test-console", function (Y) {
	
	Y.on("domready", init); 
	
	function init()
	{
		var useNative = !!getParameterFromUrl(location.href, "native"),
			useXml = !!getParameterFromUrl(location.href, "xml"),
			testUrl = "tests.php?native=" + ((useNative) ? 1 : 0) + "&xml=" + ((useXml) ? 1 : 0)
		;
		
		// highlight current settings
		Y.one(".setting" + ((useNative) ? 1 : 0) + ((useXml) ? 1 : 0))
			.addClass("setting-current")
		;
		
		var iframe = Y.one(document.createElement('iframe'))
				.setStyle('display', 'none')
				.appendTo(Y.one("#testContainer")),
			iframeLoaded = function() {
				attachScripts(iframe._node.contentWindow, useNative, useXml);
			}
		;
		
		// @see http://www.nczonline.net/blog/2009/09/15/iframes-onload-and-documentdomain/
		if (iframe._node.attachEvent) {
			iframe._node.attachEvent("onload", iframeLoaded);
		} else {
			iframe.set('onload', iframeLoaded);
		}
		
		iframe.set('src', testUrl);
	}
	
	function attachScripts(win, useNative, useXml) {
		var scripts = [
			"http://yui.yahooapis.com/3.5.0/build/yui/yui-min.js",
			"tests.js"
		];
		
		if (!useNative) {
			scripts.push("../src/engine.js");
			scripts.push("../build/parser.js");
		}
		
		// load all xpath scripts for this library
		Y.Get.script(scripts, {
			onSuccess: function (e) {
				// remove script tags
				e.purge();
				
				if (!useNative) {
					// initialize xpathjs
					win.XPathJS.bindDomLevel3XPath(
						win.XPathJS.createDomLevel3XPathBindings({
							'case-sensitive': (useXml) ? true : false
						})
					);
				}
				
				runTests(win);
			},
			win: win
		});
	}
	
	function runTests(win) {
		//create the console
		var r = new Y.Test.Console({
			newestOnTop : false,
			style: 'inline', // to anchor in the example content
			height: '500px',
			width: '100%',
			consoleLimit: 1000,
			filters: {
				pass: true
			}
		});
		
		/**
		 * @see http://yuilibrary.com/projects/yui3/ticket/2531085
		 */
		Y.Console.FOOTER_TEMPLATE = Y.Console.FOOTER_TEMPLATE.replace('id="{id_guid}">', 'id="{id_guid}" />');
		
		r.render('#testLogger');
		
		win.YUI({useBrowserConsole: false}).use('xpathjs-test', "node", "test", "event", function (Y2) {
			
			Y2.on("yui:log", function(e) {
				Y.log(e.msg, e.cat, e.src);
			});
			
			Y2.Test.Runner.add(Y2.XPathJS.Test.generateTestSuite(win, win.document, win.document.evaluate));
		
			//run the tests
			Y2.Test.Runner.run();
		});
	}
	
	function getParameterFromUrl(url, param) {
		var regexp = new RegExp("(?:\\?|&)" + param + "(?:$|&|=)([^&#]*)");
			value = regexp.exec(url)
		;
		
		if (value === null)
			return 0;
		
		return parseInt(value[1]);
	}
});
