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

YUI({useBrowserConsole: false}).use("node", "xpathjs-test", "io", "get", "test", function (Y) {
	
	Y.on("domready", init); 
	
	function init()
	{
		// configure frames
		Y.io("test.html", {
		//Y.io("../tests/index.php", {
			on: {
				success: function(transactionid, response, arguments) {
					var content = response.responseText,
						numOfLibsInitialized = 0;
					
					// load an iframe for each xpath library
					Y.Array.each(libs, function(lib, i){
						lib.iframe = initializeTestFrame(lib, response.responseText, function() {
							numOfLibsInitialized++;
							
							if (numOfLibsInitialized >= libs.length)
							{
								// all iframes have been initialized (one for each library), so proceed to run tests
								runSpeedTests(libs, Y.one("#benchmarkSpeed"));
								//runCorrectnessTests(libs, Y.one("#benchmarkCorrectness"));
							}
						});
					});
				}
			}
		});
	}
	
	function runCorrectnessTests(libs, containerNode)
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
			
			lib.testSuite = Y.XPathJS.Test.generateTestSuite(
				lib.iframe.contentWindow,
				lib.iframe.contentWindow.document,
				function(expression, contextNode, resolver, type, result) {
					return lib.evaluate(lib.iframe.contentWindow, expression, contextNode, resolver, type, result);
				}
			);
		});
		
		// create row headers, use first lib
		Y.Array.each(libs[0].testSuite.items, function(testCase){
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
					Y.Test.Runner.add(libs[currentLibIndex].testSuite);
					currentLibIndex++;
					Y.Test.Runner.run();
				}
			}
		;
		
		Y.Test.Runner.subscribe("fail", handleTestResult);
		Y.Test.Runner.subscribe("pass", handleTestResult);
		Y.Test.Runner.subscribe("ignore", handleTestResult);
		Y.Test.Runner.subscribe("complete", handleTestComplete);
		
		// run tests
		handleTestComplete();
	}
	
	function runSpeedTests(libs, containerNode)
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
	}
	
	function initializeTestFrame(lib, htmlContent, finishedCallback)
	{
		// create iframe
		var iframe = Y.one(document.createElement('iframe')).setStyle('display', 'none');
		Y.one(document.body).append(iframe);
		
		var win = iframe._node.contentWindow;
		var doc = win.document;
		
		// populate content
		doc.open();
		doc.write(htmlContent);
		doc.close();
		
		// load all xpath scripts for this library
		Y.Get.script(lib.scripts, {
			onSuccess: function (e) {
				e.purge();
				
				if (lib.initFn)
				{
					// initialize library
					lib.initFn(win);
				}
				
				finishedCallback();
			},
			win: win
		});
		
		return iframe._node;
	}
	
	function round(n, d) {
		if (isNaN(n)) return n;
		if (typeof d == "undefined") d = 2;
		var p = Math.pow(10,d);
		return Math.round(n*p)/p;
	}
});
