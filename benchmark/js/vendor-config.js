// library configuration
libs = [
	{
		name: "Native",
		scripts: [
			"js/dummy.js"
		],
		evaluate: function(win, expression, contextNode, resolver, type, result) {
			return win.document.evaluate(expression, contextNode, resolver, type, result);
		}
	},
	{
		name: "XpathJS",
		link: "https://github.com/andrejpavlovic/xpathjs",
		scripts: [
			"../build/xpathjs.min.js"
		],
		initFn: function(win) {
			win.XPathJS.bindDomLevel3XPath(
				win.XPathJS.createDomLevel3XPathBindings({
					'unique-ids': {
						'' : 'id'
					}
				})
			);
		},
		createExpression: function(win, expression, resolver) {
			return win.document.createExpression.call(document, expression, resolver);
		},
		evaluateExpression: function(win, expression, contextNode, type, result) {
			return expression.evaluate(contextNode, type, result);
		},
		evaluate: function(win, expression, contextNode, resolver, type, result) {
			return win.document.evaluate(expression, contextNode, resolver, type, result);
		}
	},
	{
		name: "JavaScript-XPath",
		link: "http://coderepos.org/share/wiki/JavaScript-XPath",
		scripts: [
			"vendor/javascript-xpath/javascript-xpath-0.1.12-cmp.js"
		],
		evaluate: function(win, expression, contextNode, resolver, type, result) {
			return win.document.evaluate(expression, contextNode, resolver, type, result);
		}
	},
	{
		name: "Llama Lab's XPath.js",
		link: "http://llamalab.com/js/xpath/",
		scripts: [
			"vendor/llamalab/Array.js",
			"vendor/llamalab/XPath.min.js"
		],
		evaluate: function(win, expression, contextNode, resolver, type, result) {
			return win.document.evaluate(expression, contextNode, resolver, type, result);
		}
	},
	{
		name: "Google AJAXSLT",
		link: "http://code.google.com/p/ajaxslt/",
		scripts: [
			"vendor/google-ajaxslt/util.js",
			"vendor/google-ajaxslt/xmltoken.js",
			"vendor/google-ajaxslt/dom.js",
			"vendor/google-ajaxslt/xpath.js"
		],
		evaluate: function(win, expression, contextNode, resolver, type, result) {
			var nl = win.xpathEval(expression, new win.ExprContext(contextNode));
			nl.snapshotLength = nl.value.length;
			nl.snapshotItem = function (i) { return this.value[i] };
			return nl;
		}
	},
	{
		name: "Cameron McCormack",
		link: "http://mcc.id.au/xpathjs",
		scripts: [
			"vendor/mccormack/xpath.js"
		],
		initFn: function(win) {
			win.xpathParser = new win.XPathParser();
		},
		evaluate: function(win, expression, contextNode, resolver, type, result) {
			var xpath = win.xpathParser.parse(expression);
			var context = new win.XPathContext();
			context.expressionContextNode = contextNode;
			var result =  xpath.evaluate(context);
			var nodes = result.toArray();
			nodes.snapshotLength = nodes.length;
			return nodes;
		}
	}
];

if (!document.evaluate){
	// no native support, so remove that lib from testing
	libs.shift();
}
