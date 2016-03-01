/* global doc, win, expect, docEvaluate, XMLHttpRequest */
"use strict";

var helpers = {
        getNextChildElementNode: function(parentNode) {
            var childNode = parentNode.firstChild;
            while (childNode.nodeName == '#text') {
                childNode = childNode.nextSibling;
            }
            return childNode;
        },

        setAttribute: function(node, namespace, name, value) {
            if (node.setAttributeNS) {
                // for XML documents
                node.setAttributeNS(namespace, name, value);
            } else {
                // normal HTML documents
                node.setAttribute(name, value);
            }
        },

        xhtmlResolver: {
            lookupNamespaceURI: function(prefix) {
                var namespaces = {
                    'xhtml': 'http://www.w3.org/1999/xhtml',
                    'ns2': 'http://asdf/'
                };

                if (namespaces[prefix]) {
                    return namespaces[prefix];
                }

                var resolver = documentCreateNSResolver(doc.documentElement);
                return resolver.lookupNamespaceURI(prefix);
            }
        },

        getComparableNode: function(node) {
            switch (node.nodeType) {
                case 2: // attribute
                case 13: // namespace
                    // TODO: IE support
                    //return node.ownerElement;
                    throw new Error('Internal Error: getComparableNode - Node type not implemented: ' + node.nodeType);
                    break;

                case 3: // text
                case 4: // CDATASection
                case 7: // processing instruction
                case 8: // comment
                    return node.parentNode;
                    break;

                case 1: // element
                case 9: // document
                    // leave as is
                    return node;
                    break;

                default:
                    throw new Error('Internal Error: getComparableNode - Node type not supported: ' + node.nodeType);
                    break;
            }
        },

        /**
         * @see http://ejohn.org/blog/comparing-document-position/
         */
        comparePosition: function(a, b) {
            var a2,
                b2,
                result,
                ancestor,
                i,
                item;

            // check for native implementation
            if (a.compareDocumentPosition) {
                return a.compareDocumentPosition(b);
            }

            if (a === b) {
                return 0;
            }

            a2 = helpers.getComparableNode(a);
            b2 = helpers.getComparableNode(b);

            // handle document case
            if (a2.nodeType === 9) {
                if (b2.nodeType === 9) {
                    if (a2 !== b2) {
                        return 1; // different documents
                    } else {
                        result = 0; // same nodes
                    }
                } else {
                    if (a2 !== b2.ownerDocument) {
                        return 1; // different documents
                    } else {
                        result = 4 + 16; // a2 before b2, a2 contains b2
                    }
                }
            } else {
                if (b2.nodeType === 9) {
                    if (b2 !== a2.ownerDocument) {
                        return 1; // different documents
                    } else {
                        result = 2 + 8; // b2 before a2, b2 contains a2
                    }
                } else {
                    if (a2.ownerDocument !== b2.ownerDocument) {
                        return 1; // different documents
                    } else {
                        // do a contains comparison for element nodes
                        if (!a2.contains || typeof a2.sourceIndex === 'undefined' || !b2.contains || typeof b2.sourceIndex === 'undefined') {
                            throw new Error('Cannot compare elements. Neither "compareDocumentPosition" nor "contains" available.');
                        } else {
                            result =
                                (a2 != b2 && a2.contains(b2) && 16) +
                                (a2 != b2 && b2.contains(a2) && 8) +
                                (a2.sourceIndex >= 0 && b2.sourceIndex >= 0 ? (a2.sourceIndex < b2.sourceIndex && 4) + (a2.sourceIndex > b2.sourceIndex && 2) : 1) +
                                0;
                        }
                    }
                }
            }

            if (a === a2) {
                if (b === b2) {
                    return result;
                } else {
                    // if a contains b2 or a == b2
                    if (result === 0 || (result & 16) === 16) {
                        // return result
                        return result;
                    }
                    // else if b2 contains a
                    else if ((result & 8) === 8) {
                        // find (ancestor-or-self::a) that is direct child of b2
                        ancestor = a;
                        while (ancestor.parentNode !== b2) {
                            ancestor = ancestor.parentNode;
                        }

                        // return "a pre b" or "b pre a" depending on which is occurs first in b2.childNodes
                        for (i = 0; i < b2.childNodes.length; i++) {
                            item = b2.childNodes.item(i);
                            if (item === ancestor) {
                                return 4;
                            } else if (item === b) {
                                return 2;
                            }
                        }

                        throw new Error('Internal Error: should not get to here. 1');
                    } else {
                        // return result
                        return result;
                    }
                }
            } else {
                if (b === b2) {
                    // if b contains a2 or b == a2
                    if (result === 0 || (result & 8) === 8) {
                        // return result
                        return result;
                    }
                    // else if a2 contains b
                    else if ((result & 16) === 16) {
                        // find (ancestor-or-self::b) that is direct child of a2
                        ancestor = b;
                        while (ancestor.parentNode !== a2) {
                            ancestor = ancestor.parentNode;
                        }

                        // return "a pre b" or "b pre a" depending on which is occurs first in a2.childNodes
                        for (i = 0; i < a2.childNodes.length; i++) {
                            item = a2.childNodes.item(i);
                            if (item === ancestor) {
                                return 2;
                            } else if (item === a) {
                                return 4;
                            }
                        }

                        throw new Error('Internal Error: should not get to here. 2');
                    } else {
                        // return result
                        return result;
                    }
                } else {
                    // if a2 contains b2
                    if ((result & 16) === 16) {
                        // return "a pre b" or "b pre a" depending on a or (ancestor-or-self::b2) occurs first in a2.childNodes
                        ancestor = b2;
                        while (ancestor.parentNode !== a2) {
                            ancestor = ancestor.parentNode;
                        }

                        for (i = 0; i < a2.childNodes.length; i++) {
                            item = a2.childNodes.item(i);
                            if (item === ancestor) {
                                return 2;
                            } else if (item === a) {
                                return 4;
                            }
                        }

                        throw new Error('Internal Error: should not get to here. 3');
                    }
                    // else if b2 contains a2
                    if ((result & 8) === 8) {
                        // return "a pre b" or "b pre a" depending on b or (ancestor-or-self::a2) occurs first in b2.childNodes
                        ancestor = a2;
                        while (ancestor.parentNode !== b2) {
                            ancestor = ancestor.parentNode;
                        }

                        for (i = 0; i < b2.childNodes.length; i++) {
                            item = b2.childNodes.item(i);
                            if (item === ancestor) {
                                return 4;
                            } else if (item === b) {
                                return 2;
                            }
                        }

                        throw new Error('Internal Error: should not get to here. 3');
                    }
                    // else if a2 === b2
                    else if (result === 0) {
                        // return "a pre b" or "b pre a" depending on a or b occurs first in a2.childNodes
                        for (i = 0; i < a2.childNodes.length; i++) {
                            item = a2.childNodes.item(i);
                            if (item === b) {
                                return 2;
                            } else if (item === a) {
                                return 4;
                            }
                        } //

                        throw new Error('Internal Error: should not get to here. 4');
                    }
                    // else
                    else {
                        // return result
                        return result;
                    }
                }
            }

            throw new Error('Internal Error: should not get to here. 5');
        },

        getAllNodes: function(node) {
            var nodes = [],
                i;

            node = (node || doc);

            nodes.push(node);

            for (i = 0; i < node.childNodes.length; i++) {
                nodes.push.apply(nodes, helpers.getAllNodes(node.childNodes.item(i)));
            }

            return nodes;
        }
    },
    documentEvaluate = function(expression, contextNode, resolver, type, result) {
        return docEvaluate.call(doc, expression, contextNode, resolver, type, result);
    },

    documentCreateExpression = function(expression, resolver) {
        return doc.createExpression.call(doc, expression, resolver);
    },

    documentCreateNSResolver = function(node) {
        return doc.createNSResolver.call(doc, node);
    },

    filterAttributes = function(attributes) {
        var i, name,
            specifiedAttributes = [];

        for (i = 0; i < attributes.length; i++) {
            if (!attributes[i].specified) {
                // ignore non-specified attributes
                continue;
            }

            name = attributes[i].nodeName.split(':');

            if (name[0] === 'xmlns') {
                // ignore namespaces
                continue;
            }

            specifiedAttributes.push(attributes[i]);
        }

        return specifiedAttributes;
    },

    filterSpecifiedAttributes = function(attributes) {
        var specifiedAttributes = [],
            i,
            name;

        for (i = 0; i < attributes.length; i++) {
            if (!attributes[i].specified) {
                // ignore non-specified attributes
                continue;
            }

            specifiedAttributes.push(attributes[i]);
        }

        return specifiedAttributes;
    },

    checkNodeResultNamespace = function(expression, contextNode, expectedResult, resolver) {
        var j, result, item, res;

        res = (!resolver) ? null : resolver;

        result = documentEvaluate(expression, contextNode, res, win.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

        expect(result.snapshotLength).to.equal(expectedResult.length);

        for (j = 0; j < result.snapshotLength; j++) {
            item = result.snapshotItem(j);
            expect(item.nodeName).to.equal('#namespace');
            expect(item.localName).to.equal(expectedResult[j][0]);
            expect(item.namespaceURI).to.equal(expectedResult[j][1]);
        }
    },

    checkNodeResult = function(expression, contextNode, expectedResult, resolver) {
        var result, j, item, res;

        res = (!resolver) ? null : resolver;

        result = documentEvaluate(expression, contextNode, res, win.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

        expect(result.snapshotLength).to.equal(expectedResult.length);

        for (j = 0; j < result.snapshotLength; j++) {
            item = result.snapshotItem(j);
            expect(item).to.deep.equal(expectedResult[j]);
        }
    },

    parseNamespacesFromAttributes = function(attributes, namespaces) {
        var i,
            name;

        for (i = attributes.length - 1; i >= 0; i--) {
            name = attributes.item(i).nodeName.split(':');

            if (name[0] === 'xmlns') {
                if (name.length == 1) {
                    namespaces.unshift(['', attributes.item(i).nodeValue]);
                } else {
                    namespaces.push([name[1], attributes.item(i).nodeValue]);
                }
            }
        }
    },

    snapshotToArray = function(result) {
        var i,
            nodes = [];

        for (i = 0; i < result.snapshotLength; i++) {
            nodes.push(result.snapshotItem(i));
        }

        return nodes;
    };
/*
loadXMLFile = function(url, callback) {
    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            callback(this.response);
        }
    };

    xhr.open('GET', url);
    xhr.responseType = 'text';
    xhr.send();
};
*/
