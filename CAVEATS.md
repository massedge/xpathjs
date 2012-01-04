XPathJS - Caveats
=======

While we strive to make XPathJS conform as closely as possible to [XPath 1.0](http://www.w3.org/TR/xpath/) and [DOM Level 3 XPath](http://www.w3.org/TR/DOM-Level-3-XPath/) specifications, we have to work within the technical limits of the browser.

We strongly recommend that anyone using XPathJS take a quick glance at the notes and issues below as it's good to keep them in mind while using the library.


Namespaces and id()
--------

In order to find an element by id, that element must belong to a namespace.

For example:

```html
<!DOCTYPE HTML>
<html xmlns="http://www.w3.org/1999/xhtml">
	<head>
		<script src="../build/xpathjs.js" type="text/javascript"></script>
	</head>
	<body>
		<div id="myDiv"></div>
		
		<script type="text/javascript">
			XPathJS.bindDomLevel3XPath();
			
			if (document.evaluate("id('myDiv')", document, null, 3).booleanValue)
			{
				// we will find it
				alert("Found myDiv!");
			}
		</script>
	</body>
</html>
```

Now, if we remove _xmlns="http://www.w3.org/1999/xhtml"_ in the example above, _id('myDiv')_ will not find the div element. This is because the _id_ attribute now belongs to the empty namespace.

By default, the following attributes are treated as an id in respective namespaces:

```javascript
{
	"http://www.w3.org/XML/1998/namespace" => "id"
	"http://www.w3.org/1999/xhtml" => "id"
}
```

You can also add your own id definitions like in the following example:

```html
<!DOCTYPE HTML>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:myns="http://www.pokret.org/example">
	<head>
		<script src="../build/xpathjs.js" type="text/javascript"></script>
	</head>
	<body>
		<div id="myDiv" myns:myid="mySpecialDiv"></div>
		
		<script type="text/javascript">
			XPathJS.bindDomLevel3XPath( // bind XPathJS
				
				XPathJS.createDomLevel3XPathBindings({ // create XPathJS functions
					
					'unique-ids': { // configure attributes to be used as IDs
						'http://www.pokret.org/example': 'myid'
					}
				})
			);
			
			if (document.evaluate("id('mySpecialDiv')", document, null, 3).booleanValue)
			{
				// we will find it
				alert("Found mySpecialDiv!");
			}
		</script>
	</body>
</html>
```

Suggested reading:

  * [id() function](http://www.w3.org/TR/xpath/#function-id)
  * [Applying Namespaces to Elements and Attributes](http://www.w3.org/TR/REC-xml-names/#scoping-defaulting)

Getting Checkbox and Radio Button Values
--------

Expressions such as **option[@selected]** or **input[@checked]** should not be used to check whether a checkbox or radio button are currently selected. Use the corresponding javascript properties on the option or input object to check if selected.

Example:

```javascript
// get all options
var result = document.evaluate('option', document, null, 7, null);

for (var j = 0; j < result.snapshotLength; j++) {
	var item = result.snapshotItem(j);

	// check option property
	if (item.selected)
	{
		alert('Selected:' + item.value);
		break;
	}
}
```

This also applies to _@value_ and _@disabled_. All of these should be treated as node properties, not attributes.

See how jquery deals with element properties vs attributes [using the prop() instead of attr() function](http://api.jquery.com/prop/).



Only Strict Mode Supported
--------

Please ensure that a doctype is declared at the top of the document when using XPathJS as we only support [strict mode](http://www.quirksmode.org/css/quirksmode.html).



Only _Specified_ Attribute Supported
--------

[Specified attributes](http://reference.sitepoint.com/javascript/Attr/specified) are those that are explicitly set in HTML or via Javascript. IE8 and below tend to set _default_ attribute values on nodes, so that each node may have 80 or more attributes, all of which have the value null.

XPathJS only works with specified attributes in order to improve performance and avoid including meaningless attribute nodes in the result.



Order of Attributes
--------

The [order of attributes](http://reference.sitepoint.com/javascript/Node/attributes) can vary from browser to browser.

Example:

```html
<div class="asdf" style="color:blue;"></div>
```

Call XPathJS:

```javascript
document.evaluate('//div/attribute::*', document, null, 7);
```

May return **class** then **style** attribute in Chrome, while it returns **style**, then **class** in Firefox.

The order of attributes usually doesn't matter, but this is something to keep in mind.

No DTD Support
--------

Any DTD declaration beyond the DOCTYPE will be ignored.

Example:

```html
<!DOCTYPE html [
	<!ATTLIST img myid ID #REQUIRED>
]>
```

The ATTLIST declaration will have no effect on XPathJS.


IE6 - Exception Bug
--------

Exceptions that originate from a function attached to the _document_ object will not propagate outside of the function. This is important to note in calls such as:

```javascript
document.createExpression('/div/+++', null);
```

Since the above is an invalid XPath expression, an INVALID_EXPRESSION_ERR will be thrown in all browsers except IE6. IE6 will just ignore the expection.

The only way to ensure that exceptions are thrown in all browsers including IE6 is to either not attach XPath functions to *document*, or to call the function like so:

```javascript
document.createExpresssion.call(document, '/div/span', null);
```

See [Stack Overflow discussion](http://stackoverflow.com/questions/7459173/ie6-try-catch-block-does-not-work-on-custom-document-somefunction-call) for more details.
