/* global define, describe, xdescribe, require, it, xit, before, after, beforeEach, afterEach, expect, Blob, doc, win, docEvaluate, documentEvaluate, documentCreateNSResolver, checkNodeResult, checkNodeResultNamespace, parseNamespacesFromAttributes, window, filterAttributes, loadXMLFile, helpers, XPathJS*/
"use strict";

describe('axes', function() {

    var h;

    before(function() {

        h = {
            getNodeAttribute: function() {
                var attribute,
                    node = doc.getElementById('testStepAxisNodeAttribute'),
                    i;

                for (i = 0; i < node.attributes.length; i++) {
                    if (node.attributes[i].specified) {
                        attribute = node.attributes[i];
                        break;
                    }
                }

                expect(attribute).is.an('object');

                return attribute;
            },

            getNodeComment: function() {
                return doc.getElementById('testStepAxisNodeComment').firstChild;
            },

            getNodeCData: function() {
                return doc.getElementById('testStepAxisNodeCData').firstChild;
            },

            getNodeProcessingInstruction: function() {
                return doc.getElementById('testStepAxisNodeProcessingInstruction').firstChild;
            },

            getNodeNamespace: function() {
                var result;

                result = documentEvaluate("namespace::node()", doc.getElementById('testStepAxisNodeNamespace'), null, win.XPathResult.ANY_UNORDERED_NODE_TYPE, null);
                return result.singleNodeValue;
            },

            followingSiblingNodes: function(node) {
                var nodes = [],
                    i;

                while (node = node.nextSibling) {
                    nodes.push(node);
                }

                return nodes;
            },

            precedingSiblingNodes: function(node) {
                var nodes = [],
                    i;

                while (node = node.previousSibling) {
                    if (node.nodeType == 10)
                        continue;
                    nodes.push(node);
                }

                nodes.reverse();

                return nodes;
            },

            followingNodes: function(node) {
                var nodes = [],
                    i,
                    nodesAll,
                    result,
                    node2;

                nodesAll = helpers.getAllNodes();

                for (i = 0; i < nodesAll.length; i++) {
                    node2 = nodesAll[i]; //
                    if (node2.nodeType == 10) // document type node
                        continue; //
                    result = helpers.comparePosition(node, node2);
                    if (4 === result) {
                        nodes.push(node2);
                    }
                }

                return nodes;
            },

            precedingNodes: function(node) {
                var nodes = [],
                    i,
                    nodesAll,
                    result,
                    node2;

                nodesAll = helpers.getAllNodes();

                for (i = 0; i < nodesAll.length; i++) {
                    node2 = nodesAll[i];

                    if (node2.nodeType == 10) // document type node
                        continue;

                    result = helpers.comparePosition(node, node2);
                    if (2 == result) {
                        nodes.push(node2);
                    }
                }

                return nodes;
            }

        };
    });

    describe('self axis', function() {

        it('works with document context', function() {
            checkNodeResult("self::node()", doc, [doc]);
        });

        it('works with documentElement context', function() {
            checkNodeResult("self::node()", doc.documentElement, [doc.documentElement]);
        });

        it('works with element context', function() {
            checkNodeResult("self::node()", doc.getElementById('testStepAxisChild'), [doc.getElementById('testStepAxisChild')]);
        });

        it('works with element attribute context', function() {
            checkNodeResult("self::node()", h.getNodeAttribute(), [h.getNodeAttribute()]);
        });

        it('works with CData context', function() {
            checkNodeResult("self::node()", h.getNodeCData(), [h.getNodeCData()]);
        });

        it('works with comment context', function() {
            checkNodeResult("self::node()", h.getNodeComment(), [h.getNodeComment()]);
        });

        it('works with node processing instruction context', function() {
            checkNodeResult("self::node()", h.getNodeProcessingInstruction(), [h.getNodeProcessingInstruction()]);
        });

        xit('works with node namespace context', function() {
            checkNodeResult("self::node()", h.getNodeNamespace(), [h.getNodeNamespace()]);
        });

        it('works with document fragment context', function() {
            var fragment = doc.createDocumentFragment();
            var test = function() {
                checkNodeResult("self::node()", fragment, [fragment]);
            };
            expect(test).to.throw(win.Error);
        });

    });

    describe('child axis', function() {

        it('works with document context', function() {
            var i, expectedResult = [];

            for (i = 0; i < doc.childNodes.length; i++) {
                if (doc.childNodes.item(i).nodeType == 1 ||
                    doc.childNodes.item(i).nodeType == 8) {
                    expectedResult.push(doc.childNodes.item(i));
                }
            }

            checkNodeResult("child::node()", doc, expectedResult);
        });

        it('works with documentElement context', function() {
            checkNodeResult("child::node()", doc.documentElement, doc.documentElement.childNodes);
        });

        it('works with element context', function() {
            checkNodeResult("child::node()", doc.getElementById('testStepAxisChild'),
                doc.getElementById('testStepAxisChild').childNodes);
        });

        it('works with attribute context', function() {
            checkNodeResult("child::node()", h.getNodeAttribute(), []);
        });

        it('works with CData context', function() {
            checkNodeResult("child::node()", h.getNodeCData(), []);
        });

        it('works with a comment context', function() {
            checkNodeResult("child::node()", h.getNodeComment(), []);
        });

        it('works with a processing instruction context', function() {
            checkNodeResult("child::node()", h.getNodeProcessingInstruction(), []);
        });

        xit('works with a namespace context', function() {
            checkNodeResult("child::node()", this.getNodeNamespace(), []);
        });

    });

    describe('descendendant axis', function() {

        it('works with Element context', function() {
            var descendantNodes = function(node) {
                var nodes = [],
                    i;

                for (i = 0; i < node.childNodes.length; i++) {
                    nodes.push(node.childNodes.item(i));
                    nodes.push.apply(nodes, descendantNodes(node.childNodes.item(i)));
                }

                return nodes;
            };

            checkNodeResult("descendant::node()", doc.getElementById('testStepAxisDescendant'),
                descendantNodes(doc.getElementById('testStepAxisDescendant')));
        });

        it('works with attribute context', function() {
            checkNodeResult("descendant::node()", h.getNodeAttribute(), []);
        });

        it('works with CData context', function() {
            checkNodeResult("descendant::node()", h.getNodeCData(), []);
        });

        it('works with a comment context', function() {
            checkNodeResult("descendant::node()", h.getNodeComment(), []);
        });

        it('works with a processing instruction context', function() {
            checkNodeResult("descendant::node()", h.getNodeProcessingInstruction(), []);
        });

        xit('works with namespace context', function() {
            checkNodeResult("descendant::node()", h.getNodeNamespace(), []);
        });

    });

    describe('descendant-or-self axis', function() {

        it('works with element context', function() {
            var nodes,
                descendantNodes = function(node) {
                    var nodes = [],
                        i;
                    for (i = 0; i < node.childNodes.length; i++) {
                        nodes.push(node.childNodes.item(i));
                        nodes.push.apply(nodes, descendantNodes(node.childNodes.item(i)));
                    }
                    return nodes;
                };
            nodes = descendantNodes(doc.getElementById('testStepAxisDescendant'));
            nodes.unshift(doc.getElementById('testStepAxisDescendant'));
            checkNodeResult("descendant-or-self::node()", doc.getElementById('testStepAxisDescendant'), nodes);
        });

        it('works with attribute context', function() {
            checkNodeResult("descendant-or-self::node()", h.getNodeAttribute(), [
                h.getNodeAttribute()
            ]);
        });

        it('works with CDATA context', function() {
            checkNodeResult("descendant-or-self::node()", h.getNodeCData(), [
                h.getNodeCData()
            ]);
        });

        it('works with a comment context', function() {
            checkNodeResult("descendant-or-self::node()", h.getNodeComment(), [
                h.getNodeComment()
            ]);
        });

        it('works with element context', function() {
            checkNodeResult("descendant-or-self::node()", h.getNodeProcessingInstruction(), [
                h.getNodeProcessingInstruction()
            ]);
        });

        xit('works with a namspace context', function() {
            checkNodeResult("descendant-or-self::node()", h.getNodeNamespace(), [
                h.getNodeNamespace()
            ]);
        });

    });

    describe('parent axis', function() {

        it('works with a document context', function() {
            checkNodeResult("parent::node()", doc, []);
        });

        it('works with a documentElement context', function() {
            checkNodeResult("parent::node()", doc.documentElement, [doc]);
        });

        it('works with an element context', function() {
            checkNodeResult("parent::node()", doc.getElementById('testStepAxisNodeElement'), [doc.getElementById('StepAxisCase')]);
        });

        it('works with an attribute context', function() {
            checkNodeResult("parent::node()", h.getNodeAttribute(), [doc.getElementById('testStepAxisNodeAttribute')]);
        });

        it('works with a CData context', function() {
            checkNodeResult("parent::node()", h.getNodeCData(), [doc.getElementById('testStepAxisNodeCData')]);
        });

        it('works with a comment context', function() {
            checkNodeResult("parent::node()", h.getNodeComment(), [doc.getElementById('testStepAxisNodeComment')]);
        });

        it('works with a processing instruction', function() {
            checkNodeResult("parent::node()", h.getNodeProcessingInstruction(), [doc.getElementById('testStepAxisNodeProcessingInstruction')]);
        });

        xit('works with a namespace', function() {
            checkNodeResult("parent::node()", h.getNodeNamespace(), [doc.getElementById('testStepAxisNodeNamespace')]);
        });

    });

    describe('ancestor axis', function() {

        it('works for a cocument context', function() {
            checkNodeResult("ancestor::node()", doc, []);
        });

        it('works for a documentElement context', function() {
            checkNodeResult("ancestor::node()", doc.documentElement, [
                doc
            ]);
        });

        it('works for an element context', function() {
            checkNodeResult("ancestor::node()", doc.getElementById('testStepAxisNodeElement'), [
                doc,
                doc.documentElement,
                doc.querySelector('body'),
                doc.getElementById('StepAxisCase')
            ]);
        });

        it('works for an attribute context', function() {
            checkNodeResult("ancestor::node()", h.getNodeAttribute(), [
                doc,
                doc.documentElement,
                doc.querySelector('body'),
                doc.getElementById('StepAxisCase'),
                doc.getElementById('testStepAxisNodeAttribute')
            ]);
        });

        it('works for a CDATA context', function() {
            checkNodeResult("ancestor::node()", h.getNodeCData(), [
                doc,
                doc.documentElement,
                doc.querySelector('body'),
                doc.getElementById('StepAxisCase'),
                doc.getElementById('testStepAxisNodeCData')
            ]);
        });

        it('works for a comment context', function() {
            checkNodeResult("ancestor::node()", h.getNodeComment(), [
                doc,
                doc.documentElement,
                doc.querySelector('body'),
                doc.getElementById('StepAxisCase'),
                doc.getElementById('testStepAxisNodeComment')
            ]);
        });

        it('works for a processing instruction context', function() {
            checkNodeResult("ancestor::node()", h.getNodeProcessingInstruction(), [
                doc,
                doc.documentElement,
                doc.querySelector('body'),
                doc.getElementById('StepAxisCase'),
                doc.getElementById('testStepAxisNodeProcessingInstruction')
            ]);
        });

        xit('works for a namespace context ', function() {
            checkNodeResult("ancestor::node()", h.getNodeNamespace(), [
                doc,
                doc.documentElement,
                doc.querySelector('body'),
                doc.getElementById('StepAxisCase'),
                doc.getElementById('testStepAxisNodeNamespace')
            ]);
        });

    });

    describe('ancestor-or-self axis', function() {

        it('works for document context', function() {
            checkNodeResult("ancestor-or-self::node()", doc, [
                doc
            ]);
        });

        it('works for documentElement context', function() {
            checkNodeResult("ancestor-or-self::node()", doc.documentElement, [
                doc,
                doc.documentElement
            ]);
        });

        it('works for an element context', function() {
            checkNodeResult("ancestor-or-self::node()", doc.getElementById('testStepAxisNodeElement'), [
                doc,
                doc.documentElement,
                doc.querySelector('body'),
                doc.getElementById('StepAxisCase'),
                doc.getElementById('testStepAxisNodeElement')
            ]);
        });

        it('works for an attribute context', function() {
            checkNodeResult("ancestor-or-self::node()", h.getNodeAttribute(), [
                doc,
                doc.documentElement,
                doc.querySelector('body'),
                doc.getElementById('StepAxisCase'),
                doc.getElementById('testStepAxisNodeAttribute'),
                h.getNodeAttribute()
            ]);
        });

        it('works for a CDATA context', function() {
            checkNodeResult("ancestor-or-self::node()", h.getNodeCData(), [
                doc,
                doc.documentElement,
                doc.querySelector('body'),
                doc.getElementById('StepAxisCase'),
                doc.getElementById('testStepAxisNodeCData'),
                h.getNodeCData()
            ]);
        });

        it('works for a comment context', function() {
            checkNodeResult("ancestor-or-self::node()", h.getNodeComment(), [
                doc,
                doc.documentElement,
                doc.querySelector('body'),
                doc.getElementById('StepAxisCase'),
                doc.getElementById('testStepAxisNodeComment'),
                h.getNodeComment()
            ]);
        });

        it('works for processingInstruction context', function() {
            checkNodeResult("ancestor-or-self::node()", h.getNodeProcessingInstruction(), [
                doc,
                doc.documentElement,
                doc.querySelector('body'),
                doc.getElementById('StepAxisCase'),
                doc.getElementById('testStepAxisNodeProcessingInstruction'),
                h.getNodeProcessingInstruction()
            ]);
        });

        xit('works for namespace context', function() {
            checkNodeResult("ancestor-or-self::node()", h.getNodeNamespace(), [
                doc,
                doc.documentElement,
                doc.querySelector('body'),
                doc.getElementById('StepAxisCase'),
                doc.getElementById('testStepAxisNodeNamespace'),
                h.getNodeNamespace()
            ]);
        });

    });

    describe('following-sibling axis', function() {

        it('works for a document context', function() {
            checkNodeResult("following-sibling::node()", doc, []);
        });

        it('works for a documentElement context', function() {
            checkNodeResult("following-sibling::node()", doc.documentElement, h.followingSiblingNodes(doc.documentElement));
        });

        it('works for an element: context', function() {
            checkNodeResult("following-sibling::node()", doc.getElementById('testStepAxisNodeElement'), h.followingSiblingNodes(doc.getElementById('testStepAxisNodeElement')));
        });

        it('works for an attribute context', function() {
            checkNodeResult("following-sibling::node()", h.getNodeAttribute(), []);
        });

        it('works for a CDATA context', function() {
            checkNodeResult("following-sibling::node()", h.getNodeCData(), h.followingSiblingNodes(h.getNodeCData()));
        });

        it('works for a comment context', function() {
            checkNodeResult("following-sibling::node()", h.getNodeComment(), h.followingSiblingNodes(h.getNodeComment()));
        });

        it('works for a processing instruction', function() {
            checkNodeResult("following-sibling::node()", h.getNodeProcessingInstruction(), h.followingSiblingNodes(h.getNodeProcessingInstruction()));
        });

        xit('works for a namespace context', function() {
            checkNodeResult("following-sibling::node()", h.getNodeNamespace(), []);
        });

    });


    describe('preceding-sibling axis', function() {

        it('works for a document context', function() {
            checkNodeResult("preceding-sibling::node()", doc, []);
        });

        it('works for a documentElement context', function() {
            checkNodeResult("preceding-sibling::node()", doc.documentElement, h.precedingSiblingNodes(doc.documentElement));
        });

        it('works for a Element context', function() {
            checkNodeResult("preceding-sibling::node()", doc.getElementById('testStepAxisNodeElement'), h.precedingSiblingNodes(doc.getElementById('testStepAxisNodeElement')));
        });

        it('works for a Attribute context', function() {
            checkNodeResult("preceding-sibling::node()", h.getNodeAttribute(), []);
        });

        it('works for a CData context', function() {
            checkNodeResult("preceding-sibling::node()", h.getNodeCData(), h.precedingSiblingNodes(h.getNodeCData()));
        });

        it('works for a Comment context', function() {
            checkNodeResult("preceding-sibling::node()", h.getNodeComment(), h.precedingSiblingNodes(h.getNodeComment()));
        });

        it('works for a ProcessingInstruction context', function() {
            checkNodeResult("preceding-sibling::node()", h.getNodeProcessingInstruction(), h.precedingSiblingNodes(h.getNodeProcessingInstruction()));
        });

        xit('works for a Namespace context', function() {
            checkNodeResult("preceding-sibling::node()", h.getNodeNamespace(), []);
        });

    });

    describe('following axis', function() {

        it('works for a document context', function() {
            checkNodeResult("following::node()", doc, []);
        });

        it('works for a documentElement context', function() {
            checkNodeResult("following::node()", doc.documentElement, h.followingNodes(doc.documentElement));
        });

        it('works for an element context', function() {
            checkNodeResult("following::node()", doc.getElementById('testStepAxisNodeElement'), h.followingNodes(doc.getElementById('testStepAxisNodeElement')));
        });

        it('works for an attribute context', function() {
            checkNodeResult("following::node()", h.getNodeAttribute(), h.followingNodes(doc.getElementById('testStepAxisNodeAttribute')));
        });

        it('works for a CDATA context', function() {
            checkNodeResult("following::node()", h.getNodeCData(), h.followingNodes(h.getNodeCData()));
        });

        it('works for a comment context', function() {
            checkNodeResult("following::node()", h.getNodeComment(), h.followingNodes(h.getNodeComment()));
        });

        it('works for a processing instruction context', function() {
            checkNodeResult("following::node()", h.getNodeProcessingInstruction(), h.followingNodes(h.getNodeProcessingInstruction()));
        });

        xit('works for a namespace context', function() {
            checkNodeResult("following::node()", h.getNodeNamespace(), h.followingNodes(doc.getElementById('testStepAxisNodeNamespace')));
        });

    });

    describe('preceding axis', function() {

        it('works for a document context', function() {
            checkNodeResult("preceding::node()", doc, []);
        });

        it('works for a documentElement context', function() {
            checkNodeResult("preceding::node()", doc.documentElement, h.precedingNodes(doc.documentElement));
        });

        it('works for an element context', function() {
            checkNodeResult("preceding::node()", doc.getElementById('testStepAxisNodeElement'), h.precedingNodes(doc.getElementById('testStepAxisNodeElement')));
        });

        it('works for an attribute context', function() {
            checkNodeResult("preceding::node()", h.getNodeAttribute(), h.precedingNodes(doc.getElementById('testStepAxisNodeAttribute')));
        });

        it('works for a CDATA context', function() {
            checkNodeResult("preceding::node()", h.getNodeCData(), h.precedingNodes(h.getNodeCData()));
        });

        it('works for a Comment context', function() {
            checkNodeResult("preceding::node()", h.getNodeComment(), h.precedingNodes(h.getNodeComment()));
        });

        it('works for a processing instruction context', function() {
            checkNodeResult("preceding::node()", h.getNodeProcessingInstruction(), h.precedingNodes(h.getNodeProcessingInstruction()));
        });

        xit('works for a Namespace context', function() {
            checkNodeResult("preceding::node()", h.getNodeNamespace(), h.precedingNodes(doc.getElementById('testStepAxisNodeNamespace')));
        });

    });

    describe('attribute axis', function() {

        it('works for a document context', function() {
            checkNodeResult("attribute::node()", doc, []);
        });

        it('works for an attribute context', function() {
            checkNodeResult("attribute::node()", h.getNodeAttribute(), []);
        });

        it('works for a CDATA context', function() {
            checkNodeResult("attribute::node()", h.getNodeCData(), []);
        });

        it('works for a comment context', function() {
            checkNodeResult("attribute::node()", h.getNodeComment(), []);
        });

        it('works for a processing instruction context', function() {
            checkNodeResult("attribute::node()", h.getNodeProcessingInstruction(), []);
        });

        xit('works for a namespace context', function() {
            checkNodeResult("attribute::node()", h.getNodeNamespace(), []);
        });

        it('works for a 0 context', function() {
            checkNodeResult("attribute::node()", doc.getElementById('testStepAxisNodeAttribute0'), filterAttributes(doc.getElementById('testStepAxisNodeAttribute0').attributes));
        });

        it('works for a 1 context', function() {
            checkNodeResult("attribute::node()", doc.getElementById('testStepAxisNodeAttribute1'), filterAttributes(doc.getElementById('testStepAxisNodeAttribute1').attributes));
        });

        it('works for a 3: context', function() {
            checkNodeResult("attribute::node()", doc.getElementById('testStepAxisNodeAttribute3'), filterAttributes(doc.getElementById('testStepAxisNodeAttribute3').attributes));
        });

        it('works for a StartXml context', function() {
            checkNodeResult("attribute::node()", doc.getElementById('testStepAxisNodeAttributeStartXml'), filterAttributes(doc.getElementById('testStepAxisNodeAttributeStartXml').attributes));
        });

    });

    describe('namespace axis', function() {

        it('works for a document context', function() {
            checkNodeResultNamespace("namespace::node()", doc, []);
        });

        it('works for an attribute context', function() {
            checkNodeResultNamespace("namespace::node()", h.getNodeAttribute(), []);
        });

        it('works for a CDATA context', function() {
            checkNodeResultNamespace("namespace::node()", h.getNodeCData(), []);
        });

        it('works for a comment context', function() {
            checkNodeResultNamespace("namespace::node()", h.getNodeComment(), []);
        });

        it('works for a processing instruction context', function() {
            checkNodeResultNamespace("namespace::node()", h.getNodeProcessingInstruction(), []);
        });

        it('works for a namespace context', function() {
            checkNodeResultNamespace("namespace::node()", h.getNodeNamespace(), []);
        });

        it('works for a document element context', function() {
            checkNodeResultNamespace("namespace::node()", doc.documentElement, [
                ['', 'http://www.w3.org/1999/xhtml'],
                ['ev', 'http://some-namespace.com/nss'],
                ['xml', 'http://www.w3.org/XML/1998/namespace']
            ]);
        });

        it('works for a 0 context', function() {
            checkNodeResultNamespace("namespace::node()", doc.getElementById('testStepAxisNodeNamespace0'), [
                ['', 'http://www.w3.org/1999/xhtml'],
                ['ev', 'http://some-namespace.com/nss'],
                ['xml', 'http://www.w3.org/XML/1998/namespace']
            ]);
        });

        it('works for a 1 context', function() {
            checkNodeResultNamespace("namespace::node()", doc.getElementById('testStepAxisNodeNamespace1'), [
                ['', 'http://www.w3.org/1999/xhtml'],
                ['a', 'asdf'],
                ['ev', 'http://some-namespace.com/nss'],
                ['xml', 'http://www.w3.org/XML/1998/namespace']
            ]);
        });

        it('works for a 1 default context', function() {
            checkNodeResultNamespace("namespace::node()", doc.getElementById('testStepAxisNodeNamespace1defaultContainer').firstChild, [
                ['', 'asdf'],
                ['ev', 'http://some-namespace.com/nss'],
                ['xml', 'http://www.w3.org/XML/1998/namespace']
            ]);
        });

        it('works for a 1 default 2 context', function() {
            checkNodeResultNamespace("namespace::node()", doc.getElementById('testStepAxisNodeNamespace1defaultContainer2').firstChild, [
                ['ev', 'http://some-namespace.com/nss'],
                ['xml', 'http://www.w3.org/XML/1998/namespace']
            ]);
        });

        it('works for a 3 context', function() {
            var namespaces = [],
                contextNode = doc.getElementById('testStepAxisNodeNamespace3');

            namespaces.push(['', 'http://www.w3.org/1999/xhtml']);
            parseNamespacesFromAttributes(contextNode.attributes, namespaces);
            namespaces.push(['ev', 'http://some-namespace.com/nss']);
            namespaces.push(['xml', 'http://www.w3.org/XML/1998/namespace']);

            checkNodeResultNamespace("namespace::node()", contextNode, namespaces);
        });

        it('works for a 3 default context', function() {
            var namespaces = [],
                contextNode = doc.getElementById('testStepAxisNodeNamespace3defaultContainer').firstChild;

            parseNamespacesFromAttributes(contextNode.attributes, namespaces);
            namespaces.push(['ev', 'http://some-namespace.com/nss']);
            namespaces.push(['xml', 'http://www.w3.org/XML/1998/namespace']);

            checkNodeResultNamespace("namespace::node()", contextNode, namespaces);
        });

        it('works with an element context that overrides the namespace', function() {
            checkNodeResultNamespace("namespace::node()", doc.getElementById('testStepAxisNodeNamespaceXmlOverride'), [
                ['', 'http://www.w3.org/1999/xhtml'],
                ['ev', 'http://some-other-namespace/'],
                ['xml', 'http://www.w3.org/XML/1998/namespace']
            ]);
        });

        it('works with "NoNamespaceNodeSharingAmongstElements" context', function() {
            var j, result, result2, item, item2, expectedResult;

            expectedResult = [
                ['', 'http://www.w3.org/1999/xhtml'],
                ['a', 'asdf'],
                ['ev', 'http://some-namespace.com/nss'],
                ['xml', 'http://www.w3.org/XML/1998/namespace']
            ];

            result = documentEvaluate("namespace::node()", doc.getElementById('testStepAxisNodeNamespace1'), null, win.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            result2 = documentEvaluate("namespace::node()", doc.getElementById('testStepAxisNodeNamespace1b'), null, win.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null); //
            expect(result.snapshotLength).to.equal(expectedResult.length);
            expect(result2.snapshotLength).to.equal(expectedResult.length);

            for (j = 0; j < result.snapshotLength; j++) {
                item = result.snapshotItem(j);
                item2 = result2.snapshotItem(j);

                expect(item.nodeName).to.equal('#namespace');
                expect(item2.nodeName).to.equal('#namespace');

                expect(item.localName).to.equal(expectedResult[j][0]);
                expect(item2.localName).to.equal(expectedResult[j][0]);

                expect(item.namespaceURI).to.equal(expectedResult[j][1]);
                expect(item2.namespaceURI).to.equal(expectedResult[j][1]);

                expect(item2).to.not.deep.equal(item);
            }
        });

        it('works with "SameNamespaceNodeOnSameElement" context', function() {
            var j, result, result2, item, item2, expectedResult;

            expectedResult = [
                ['', 'http://www.w3.org/1999/xhtml'],
                ['a', 'asdf'],
                ['ev', 'http://some-namespace.com/nss'],
                ['xml', 'http://www.w3.org/XML/1998/namespace']
            ];

            result = documentEvaluate("namespace::node()", doc.getElementById('testStepAxisNodeNamespace1'), null, win.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            result2 = documentEvaluate("namespace::node()", doc.getElementById('testStepAxisNodeNamespace1'), null, win.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

            for (j = 0; j < result.snapshotLength; j++) {
                item = result.snapshotItem(j);
                item2 = result2.snapshotItem(j);

                expect(item.nodeName).to.equal('#namespace');
                expect(item.localName).to.equal(expectedResult[j][0]);
                expect(item.namespaceURI).to.equal(expectedResult[j][1]);
                expect(item2).to.deep.equal(item);
            }
        });

    });

    describe('attribute && namespace axes', function() {

        it('works for Attrib1Ns1', function() {
            var attributes = [],
                i,
                contextNode;

            contextNode = doc.getElementById('testStepAxisNodeAttrib1Ns1');

            for (i = 0; i < contextNode.attributes.length; i++) {
                if (!contextNode.attributes[i].specified) {
                    continue;
                }
                if (contextNode.attributes.item(i).nodeName.substring(0, 5) !== 'xmlns') {
                    attributes.push(contextNode.attributes.item(i));
                }
            }

            checkNodeResult("attribute::node()", contextNode, attributes); //

            checkNodeResultNamespace("namespace::node()", contextNode, [
                ['', 'http://www.w3.org/1999/xhtml'],
                ['a', 'asdf'],
                ['ev', 'http://some-namespace.com/nss'],
                ['xml', 'http://www.w3.org/XML/1998/namespace']
            ]);
        });

        it('works for Attrib1Ns1reversed', function() {
            var attributes = [],
                i,
                contextNode;

            contextNode = doc.getElementById('testStepAxisNodeAttrib1Ns1reversed');

            for (i = 0; i < contextNode.attributes.length; i++) {
                if (!contextNode.attributes[i].specified) {
                    continue;
                }
                if (contextNode.attributes.item(i).nodeName.substring(0, 5) !== 'xmlns') {
                    attributes.push(contextNode.attributes.item(i));
                }
            }

            checkNodeResult("attribute::node()", contextNode, attributes);

            checkNodeResultNamespace("namespace::node()", contextNode, [
                ['', 'http://www.w3.org/1999/xhtml'],
                ['a', 'asdf'],
                ['ev', 'http://some-namespace.com/nss'],
                ['xml', 'http://www.w3.org/XML/1998/namespace']
            ]);
        });

        it('works for NodeAttrib2Ns1', function() {
            var attributes = [],
                i,
                contextNode;

            contextNode = doc.getElementById('testStepAxisNodeAttrib2Ns1');

            for (i = 0; i < contextNode.attributes.length; i++) {
                if (!contextNode.attributes[i].specified) {
                    continue;
                }
                if (contextNode.attributes.item(i).nodeName.substring(0, 5) !== 'xmlns') {
                    attributes.push(contextNode.attributes.item(i));
                }
            }

            checkNodeResult("attribute::node()", contextNode, attributes); //
            checkNodeResultNamespace("namespace::node()", contextNode, [
                ['', 'http://www.w3.org/1999/xhtml'],
                ['c', 'asdf3'],
                ['ev', 'http://some-namespace.com/nss'],
                ['xml', 'http://www.w3.org/XML/1998/namespace']
            ]);
        });

        it('works for Attrib2Ns1reversed', function() {
            var attributes = [],
                i,
                contextNode;

            contextNode = doc.getElementById('testStepAxisNodeAttrib2Ns1reversedContainer').firstChild;

            for (i = 0; i < contextNode.attributes.length; i++) {
                if (!contextNode.attributes[i].specified) {
                    continue;
                }
                if (contextNode.attributes.item(i).nodeName.substring(0, 5) !== 'xmlns') {
                    attributes.push(contextNode.attributes.item(i));
                }
            }

            checkNodeResult("attribute::node()", contextNode, attributes);

            checkNodeResultNamespace("namespace::node()", contextNode, [
                ['', 'asdf'],
                ['ev', 'http://some-namespace.com/nss'],
                ['xml', 'http://www.w3.org/XML/1998/namespace']
            ]);
        });

        it('works for NodeAttrib2Ns2', function() {
            var attributes = [],
                i,
                contextNode;

            contextNode = doc.getElementById('testStepAxisNodeAttrib2Ns2Container').firstChild;

            for (i = 0; i < contextNode.attributes.length; i++) {
                if (!contextNode.attributes[i].specified) {
                    continue;
                }
                if (contextNode.attributes.item(i).nodeName.substring(0, 5) !== 'xmlns') {
                    attributes.push(contextNode.attributes.item(i));
                }
            }

            checkNodeResult("attribute::node()", contextNode, attributes);

            checkNodeResultNamespace("namespace::node()", contextNode, [
                ['', 'asdf2'],
                ['a', 'asdf'],
                ['ev', 'http://some-namespace.com/nss'],
                ['xml', 'http://www.w3.org/XML/1998/namespace']
            ]);

        });
    });
});
