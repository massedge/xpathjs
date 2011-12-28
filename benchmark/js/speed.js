// test configuration
speedTests = [
	{ expression: 'id("level10")/ancestor::*' },
	{ expression: 'id("level10")/ancestor::SPAN' },
	{ expression: 'id("level10")/ancestor-or-self::SPAN' },
	//{ expression: '//attribute::*' },
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

YUI().use("node", "io", "get", function (Y) {
	
	Y.on("domready", init); 
	
	function init()
	{
		// create table
		var table = Y.one(document.createElement("table"));
		Y.one("#benchmarkSpeed").append(table);
		
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
		
		// configure frames
		Y.io("test.html", {
			on: {
				success: function(transactionid, response, arguments) {
					var iframes = [],
						content = response.responseText,
						numOfLibsInitialized = 0;
					
					Y.Array.each(libs, function(lib, i){
						iframes[i] = initializeTestFrame(lib, response.responseText, function() {
							numOfLibsInitialized++;
							
							if (numOfLibsInitialized >= libs.length)
							{
								// run test
								runSpeedTests(table, iframes);
							}
						});
					});
				}
			}
		});
	}
	
	function runSpeedTests(table, iframes)
	{
		var timeTotals = [],
			nodeTotals = [];
		
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
					win = iframes[index].contentWindow;
				
				//try {
					// start timer
					time = new Date().valueOf();
					
					for(i = 0; i < 10; i++)
					{
						result = lib.evaluate(iframes[index].contentWindow, test.expression, win.document, null, 7);
					}
					
					time = (new Date().valueOf() - time) / i;
					numOfNodes = result.snapshotLength;
					
					if (!timeTotals[index]) timeTotals[index] = 0;
					timeTotals[index] += time;
					
					if (!nodeTotals[index]) nodeTotals[index] = 0;
					nodeTotals[index] += numOfNodes;
				/*}
				catch (e) {
					time = 0;
					numOfNodes = e.message;
				}
				*/
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
			onSuccess: function () {
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
