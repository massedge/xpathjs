// test configuration
speedTests = [
	{ expression: 'id("level10")/ancestor::*' },
	{ expression: 'id("level10")/ancestor::SPAN' },
	{ expression: 'id("level10")/ancestor-or-self::SPAN' },
	{ expression: '//attribute::*' },
	{ expression: 'child::HTML/child::BODY/child::H1' },
	{ expression: 'descendant::node()' },
	{ expression: 'descendant-or-self::SPAN' },
	{ expression: 'id("first")/following::text()' },
	{ expression: 'id("first")/following-sibling::node()' },
	{ expression: 'id("level10")/parent::node()' },
	{ expression: 'id("last")/preceding::text()' },
	{ expression: 'id("last")/preceding-sibling::node()' },
	{ expression: '/HTML/BODY/H1/self::node()' },
	{ expression: '//*[@name]' },
	{ expression: 'id("pet")/SELECT[@name="species"]/OPTION[@selected]/@value' },
	{ expression: 'descendant::INPUT[@name="name"]/@value' },
	{ expression: 'id("pet")/INPUT[@name="gender" and @checked]/@value' },
	{ expression: '//TEXTAREA[@name="description"]/text()' },
	{ expression: 'id("div1")|id("div2")|id("div3 div4 div5")' },
	{ expression: '//LI[1]' },
	{ expression: '//LI[last()]/text()' },
	{ expression: '//LI[position() mod 2]/@class' },
	{ expression: '//text()[.="foo"]' },
	{ expression: 'descendant-or-self::SPAN[position() > 2]' },
	{ expression: 'descendant::*[contains(@class," fruit ")]' }
];

YUI({useBrowserConsole: false}).use("node", "xpathjs-vendor-config", "xpathjs-test", "get", "test", function (Y) {
	
	var libs = Y.XPathJS.Test.Vendor.getAll();
	
	Y.on("domready", init); 
	
	function init()
	{
		runTest(libs, "test.html", runSpeedTests, Y.one("#benchmarkSpeed"), function() {
			runTest(libs, "../tests/tests.php", runCorrectnessTests, Y.one("#benchmarkCorrectness"), function() {}, {quasiXpath: false});
		}, {quasiXpath: true});
	}
	
	function runTest(libs, testUrl, testFn, renderNode, finishedCallback, options) {
		var numOfLibsInitialized = 0;
		
		// load an iframe for each xpath library
		Y.Array.each(libs, function(lib, i){
			lib.iframe = initializeTestFrame(lib, testUrl, function() {
				numOfLibsInitialized++;
				
				if (numOfLibsInitialized >= libs.length)
				{
					// all iframes have been initialized (one for each library), so proceed to run tests
					testFn(libs, renderNode, finishedCallback);
				}
			}, options);
		});
	}
	
	function runCorrectnessTests(libs, containerNode, finishedCallback)
	{
		// create table
		var table = Y.one(document.createElement("table"));
		containerNode.append(table);
		
		// create library name header
		var libraryNameHeader = Y.Node.create('<tr><th>Test Name</th></tr>');
		table.append(libraryNameHeader);
		
		Y.Array.each(libs, function(lib){
			var titleNode = Y.one(document.createTextNode(lib.name));
			
			if (lib.link) {
				titleNode = Y.one(document.createElement("a")).append(
					titleNode
				).setAttrs({"href": lib.link, "target": "_blank"});
			}
			
			libraryNameHeader.append(
				Y.Node.create('<th></th>').append(titleNode)
			);
		});
		
		// create row headers, use first lib
		Y.Array.each(Y.XPathJS.Test.generateTestSuite().items, function(testCase){
			table.append(
				Y.Node.create('<tr></tr>').append(
					Y.Node.create('<th></th>')
						.setAttribute("colspan", libs.length + 1)
						.append(
							Y.one(document.createTextNode(testCase.name))
						)
				)
			)
			
			Y.Object.each(testCase, function(test, testName) {
				if (testName.substring(0, 4) != "test")
					return;
				
				table.append(
					Y.Node.create('<tr></tr>').append(
						Y.Node.create('<th></th>')
							.append(
								Y.one(document.createTextNode(testName))
							)
					)
				);
			});
		});
		
		var rows = table.all("tr"),
			currentTestCase = null,
			currentLibIndex = 0;
			currentRow = 1,
			handleTestResult = function(data) {
				if (currentTestCase !== data.testCase) {
					// skip row
					currentRow++;
					currentTestCase = data.testCase;
				}
				
				rows.item(currentRow).append(
					Y.Node.create('<td></td>')
						.addClass('status')
						.addClass('status-' + data.type)
						.append(
							Y.one(document.createTextNode(data.type))
						)
				);
				
				currentRow++;
			},
			handleTestComplete = function() {
				// reset test runner
				Y.Test.Runner.clear();
				currentTestCase = null;
				currentRow = 1;
				
				if (currentLibIndex < libs.length)
				{
					var lib = libs[currentLibIndex],
						win = lib.iframe.contentWindow
					;
					
					win.YUI({useBrowserConsole: false}).use("xpathjs-test", "xpathjs-vendor-config", "node", "test", "event", function (Y2) {
						var lib2 = Y2.XPathJS.Test.Vendor.getByIndex(currentLibIndex);
						
						var suite = Y2.XPathJS.Test.generateTestSuite(
							win,
							win.document,
							function(expression, contextNode, resolver, type, result) {
								return lib2.evaluate(win, expression, contextNode, resolver, type, result);
							}
						);
						
						Y2.Test.Runner.subscribe("fail", handleTestResult);
						Y2.Test.Runner.subscribe("pass", handleTestResult);
						Y2.Test.Runner.subscribe("ignore", handleTestResult);
						Y2.Test.Runner.subscribe("complete", handleTestComplete);
						
						Y2.Test.Runner.add(suite);
						
						currentLibIndex++;
					
						// run the tests
						Y2.Test.Runner.run();
					});
				}
			}
		;
		
		// run tests
		handleTestComplete();
	}
	
	function runSpeedTests(libs, containerNode, finishedCallback)
	{
		var timeTotals = [],
			nodeTotals = [];
		
		// create table
		var table = Y.one(document.createElement("table"));
		containerNode.append(table);
		
		// create library name header
		var libraryNameHeader = Y.Node.create('<tr><th rowspan="2">Expression</th></tr>');
		table.append(libraryNameHeader);
		
		var resultHeader = Y.Node.create('<tr></tr>');
		table.append(resultHeader);
		
		Y.Array.each(libs, function(lib){
			var titleNode = Y.one(document.createTextNode(lib.name));
			
			if (lib.link) {
				titleNode = Y.one(document.createElement("a")).append(
					titleNode
				).setAttrs({"href": lib.link, "target": "_blank"});
			}
			
			libraryNameHeader.append(
				Y.Node.create('<th colspan="2"></th>').append(titleNode)
			);
			
			resultHeader.append(Y.Node.create("<th>Time</th><th>Nodes</th>"));
		});
		
		Y.Array.each(speedTests, function(test)
		{
			var row = Y.one(document.createElement("tr"));
			table.append(row);
			
			row.append(
				Y.one(document.createElement("th")).append(
					Y.one(document.createTextNode(test.expression))
				).addClass("expression")
			);
			
			Y.Array.each(libs, function(lib, index){
				var result, time, numOfNodes, i,
					win = lib.iframe.contentWindow;
				
				try {
					// start timer
					time = new Date().valueOf();
					
					for(i = 0; i < 10; i++)
					{
						result = lib.evaluate(lib.iframe.contentWindow, test.expression, win.document, null, 7);
					}
					
					time = (new Date().valueOf() - time) / i;
					numOfNodes = result.snapshotLength;
					
					if (!timeTotals[index]) timeTotals[index] = 0;
					timeTotals[index] += time;
					
					if (!nodeTotals[index]) nodeTotals[index] = 0;
					nodeTotals[index] += numOfNodes;
				}
				catch (e) {
					time = 0;
					numOfNodes = e.message;
				}
				
				row.append(
					Y.one(document.createElement("td")).append(
						document.createTextNode(round(time))
					)
				).append(
					Y.one(document.createElement("td")).append(
						document.createTextNode(numOfNodes)
					)
				);
			});
		});
		
		var row = Y.one(document.createElement("tr"));
		table.append(row);
		
		row.append(
			Y.Node.create("<td>TOTALS</td>")
		);
			
		Y.Array.each(libs, function(lib, index){
			row.append(
				Y.one(document.createElement("td")).append(
					document.createTextNode(round(timeTotals[index]))
				)
			).append(
				Y.one(document.createElement("td")).append(
					document.createTextNode(nodeTotals[index])
				)
			);
		});
		
		finishedCallback();
	}
	
	function initializeTestFrame(lib, testUrl, finishedCallback, options)
	{
		// create iframe
		var iframe = Y.one(document.createElement('iframe'))
				.setStyle('display', 'none')
				.appendTo(Y.one(document.body)),
			iframeLoaded = function() {
				var win = iframe._node.contentWindow;
				
				// load all xpath scripts for this library
				lib.scripts.unshift("../tests/tests.js");
				lib.scripts.unshift("../benchmark/js/vendor-config.js");
				lib.scripts.unshift("http://yui.yahooapis.com/3.5.0/build/yui/yui-min.js");
				
				Y.Get.script(lib.scripts, {
					onSuccess: function (e) {
						e.purge();
						
						if (lib.initFn)
						{
							// initialize library
							lib.initFn(win, options);
						}
						
						finishedCallback();
					},
					win: win
				});
			}
		;
		
		// @see http://www.nczonline.net/blog/2009/09/15/iframes-onload-and-documentdomain/
		if (iframe._node.attachEvent) {
			iframe._node.attachEvent("onload", iframeLoaded);
		} else {
			iframe.set('onload', iframeLoaded);
		}
		
		iframe.set('src', testUrl);
		
		return iframe._node;
	}
	
	function round(n, d) {
		if (isNaN(n)) return n;
		if (typeof d == "undefined") d = 2;
		var p = Math.pow(10,d);
		return Math.round(n*p)/p;
	}
});
