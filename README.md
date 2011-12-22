XPathJS
=======

XPathJS is a pure JavaScript implementation of [XPath 1.0](http://www.w3.org/TR/xpath/) and [DOM Level 3 XPath](http://www.w3.org/TR/DOM-Level-3-XPath/) specifications.

Features
--------

  * Works in all major browsers: IE6+, Firefox, Chrome, Safari, Opera
  * Supports XML namespaces!
  * No external dependencies, include just a single .js file
  * Regression tested against [hundreds of unit test cases](http://www.pokret.org/xpathjs/tests/).
  * Works in pages served as both, _text/html_ and _application/xhtml+xml_ content types.

Getting Started
--------

  1. Download [build/xpathjs.min.js](https://raw.github.com/andrejpavlovic/xpathjs/master/build/xpathjs.min.js) file.
  
  2. Include xpathjs.min.js in the \<head> of your HTML document.
     NOTE: Make sure HTML document is in standards mode i.e. it has a !DOCTYPE declaration at the top!
  
  3. Initialize XPathJS:
     
         // bind XPath methods to document and window objects
         XPathJS.bindDomLevel3XPath(
             
             // initialize XPath methods
             XPathJS.createDomLevel3XPathBindings({
                 
                 // treat XPath expressions as case-insensitive
                 'case-sensitive': false
             })
         );
     
     NOTE: This will overwrite native XPath implementation if it exists.
     
  4. You can now use XPath expressions to query the DOM:
     
        var result = document.evaluate(
            '//ul/li/text()', // XPath expression
            document, // context node
            null, // namespace resolver
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE
        );
        
        for (var i = 0; i < result.snapshotLength; i++) {
            var node = result.snapshotItem(i);
            alert(node.nodeValue);
        }

You will find some [working examples here](http://www.pokret.org/xpathjs/examples/).

More examples, configuration options, and caveat info coming soon...

Background
--------

So how did XPathJS come to be? Well originally we were looking for an implementation of a cross-browser [XForms](http://www.w3.org/TR/xforms/) solution in hopes to alleviate the pain and complexity that comes with creating normal HTML forms. Unfortunately, we found out that there is neither an XForms engine that is fully implemented, nor does it support all browsers. So we thought, ok let's try to build our own! Then we realized that XForms makes extensive use of XPath. And again, we could not find a fully functional cross-browser XPath implementation. Long story short, that's how XPathJS was born.

By releasing XPathJS, we hope to help promote the adoption of open standards in the community.

Development
--------

  * [Project website](http://www.pokret.org/products/xpathjs-javascript-based-xpath-library/)
  * [Source code](https://github.com/andrejpavlovic/xpathjs)
  * [Issue tracker](https://github.com/andrejpavlovic/xpathjs/issues)

XPathJS is developed by [Andrej Pavlovic](mailto:andrej.pavlovic@pokret.org). You are more than welcome to contribute by [logging issues](https://github.com/andrejpavlovic/xpathjs/issues), [sending pull requests](http://help.github.com/send-pull-requests/), or [just giving feedback](mailto:andrej.pavlovic@pokret.org).

License
-------

We have released XPathJS under the AGPLv3. Note that we sell commercial licenses as well. You will need to sign a contributor agreement when contributing code due to the dual-license nature of the project.

Alternatives
--------

Here are some other javascript-based XPath alternatives out there:

  * [Llama's XPath.js](http://llamalab.com/js/xpath/)
  * [JavaScript-XPath](http://coderepos.org/share/wiki/JavaScript-XPath)
  * [Google AJAXSLT](http://goog-ajaxslt.sourceforge.net/)
  * [Cameron McCormack](http://mcc.id.au/xpathjs)
