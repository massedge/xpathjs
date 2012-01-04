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
  * [Benchmarked](http://www.pokret.org/xpathjs/benchmark/) against other XPath implementations.

Getting Started
--------

  1. Download [build/xpathjs.min.js](https://raw.github.com/andrejpavlovic/xpathjs/master/build/xpathjs.min.js) file.
  
  2. Include xpathjs.min.js in the \<head> of your HTML document.
     NOTE: Make sure HTML document is in strict mode i.e. it has a !DOCTYPE declaration at the top!
  
  3. Initialize XPathJS:
     
     ```javascript
    // bind XPath methods to document and window objects
    // NOTE: This will overwrite native XPath implementation if it exists
    XPathJS.bindDomLevel3XPath();
    ```
     
  4. You can now use XPath expressions to query the DOM:
     
     ```javascript
    var result = document.evaluate(
        '//ul/li/text()', // XPath expression
        document, // context node
        null, // namespace resolver
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE
    );
    
    // loop through results
    for (var i = 0; i < result.snapshotLength; i++) {
        var node = result.snapshotItem(i);
        alert(node.nodeValue);
    }
    ```

Take a look at some [working examples](http://www.pokret.org/xpathjs/examples/) to get a better idea of how to use XPathJS.

We would strongly recommend for you to take a look at the [**CAVEATS**](https://github.com/andrejpavlovic/xpathjs/blob/master/CAVEATS.md) document to get a better understanding of XPathJS limitations.

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
--------

We have released XPathJS under the AGPLv3. Note that we sell commercial licenses as well. You will need to sign a contributor agreement when contributing code due to the dual-license nature of the project.

Alternatives
--------

Here are some other javascript-based XPath alternatives out there:

  * [JavaScript-XPath](http://coderepos.org/share/wiki/JavaScript-XPath) - fastest
  * [Llama's XPath.js](http://llamalab.com/js/xpath/) - tiniest
  * [Cameron McCormack](http://mcc.id.au/xpathjs) - non-standard interface, but should have namespace support
  * [Google AJAXSLT](http://goog-ajaxslt.sourceforge.net/) - oldest

Build
--------

In order to build the code yourself, you will need the following tools:

  1. [Apache Ant](http://ant.apache.org/)
  2. [Node.js](http://nodejs.org/)
  3. [PEG.js](http://pegjs.majda.cz/) (_npm install --global pegjs_)

Once the tools are installed, do the following:

```bash
git clone https://github.com/andrejpavlovic/xpathjs.git
cd xpathjs
git submodule init
git submodule update
ant build
```

NOTE: Currently the build script only works in Windows, but it can be easily adjusted to work in Linux. Take a look at [build.xml](https://github.com/andrejpavlovic/xpathjs/blob/master/build.xml) file.
