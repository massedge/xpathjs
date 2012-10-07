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

/* global window */
/* global XPathJS */

XPathJS = (function(){
	var XPathException,
		XPathEvaluator,
		XPathExpression,
		XPathNSResolver,
		XPathResult,
		XPathNamespace,
		module,
		evaluateExpressionTree,
		expressions,
		functions,
		Context,
		namespaceCache = [],
		
		NAMESPACE_URI_XML = 'http://www.w3.org/XML/1998/namespace',
		NAMESPACE_URI_XMLNS = 'http://www.w3.org/2000/xmlns/',
		NAMESPACE_URI_XHTML = 'http://www.w3.org/1999/xhtml',
		
		// XPath types
		BaseType,
		BooleanType,
		StringType,
		NumberType,
		NodeSetType,
		
		// HACK: track expression currently being evaluated
		currentExpression,
		
		/**
		 * @param {Node} node
		 * @return {Node}
		 */
		nodeOwnerDocument = function(node)
		{
			return node.ownerDocument;
		},
		
		/**
		 * Return all direct children of given node, but only those explicitly
		 * allowed by XPath specification.
		 *
		 * @param {Node} node
		 * @return {Array} List of nodes in document order.
		 */
		nodeChildren = function(node)
		{
			var nodes = [],
				filterSupportedNodeTypes = function(nodes, types)
				{
					var item, i, filteredNodes = [];
					
					for(i=0; i < nodes.length; i++)
					{
						item = nodes.item(i);
						if (false !== arrayIndexOf(item.nodeType, types))
						{
							filteredNodes.push(item);
						}
					}
					
					return filteredNodes;
				}
			;
			
			switch(node.nodeType)
			{
				/**
				 * @see http://www.w3.org/TR/xpath/#element-nodes
				 *
				 * The children of an element node are the element nodes, comment nodes, processing
				 * instruction nodes and text nodes for its content.
				 */
				case 1: // element,
					nodes = filterSupportedNodeTypes(node.childNodes, supportedChildNodeTypes = [
						1, // element
						3, // text
						4, // CDATASection
						7, // processing instruction
						8  // comment
					]);
					break;
				
				/**
				 * @see http://www.w3.org/TR/xpath/#root-node
				 *
				 * The element node for the document element is a child of the root node. The root
				 * node also has as children processing instruction and comment nodes for
				 * processing instructions and comments that occur in the prolog and
				 * after the end of the document element.
				 */
				case 9: // document
					nodes = filterSupportedNodeTypes(node.childNodes, supportedChildNodeTypes = [
						1, // element
						7, // processing instruction
						8  // comment
					]);
					break;
				
				case 2: // attribute
				case 3: // text
				case 4: // CDATASection
				case 7: // processing instruction
				case 8: // comment
				case 13: // namespace
					break;
				
				default:
					throw new Error('Internal Error: nodeChildren - unsupported node type: ' + node.nodeType);
					break;
			}
			
			return nodes;
		},
		
		/**
		 * Return all decendants of given node.
		 *
		 * @param {Node} node
		 * @return {Array} List of nodes in document order.
		 */
		nodeDescendant = function(node)
		{
			var nodes,
				i,
				nodes2 = []
			;
			
			nodes = nodeChildren(node);
			
			for(i = 0; i < nodes.length; i++)
			{
				nodes2.push(nodes[i]);
				nodes2.push.apply(nodes2, nodeDescendant(nodes[i]));
			}
			
			return nodes2;
		},
		
		/**
		 * Return parent of given node if there is one.
		 *
		 * @param {Node} node
		 * @return {Node}
		 */
		nodeParent = function(node)
		{
			/**
			 * All nodes, except Attr, Document, DocumentFragment, Entity, and Notation may have a parent.
			 *
			 * @see http://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-1060184317
			 */
			var element
			;
			
			switch(node.nodeType)
			{
				case 1: // element
				case 3: // text
				case 4: // CDATAsection
				case 7: // processing instruction
				case 8: // comment
				case 9: // document
					return node.parentNode;
					break;
				
				case 2: // Node.ATTRIBUTE_NODE
					// DOM 2 has ownerElement
					if (node.ownerElement) {
						return node.ownerElement;
					}
					
					// Other DOM 1 implementations must search the entire document...
					element = nodeAttributeSearch(node.ownerDocument, true, function(element, attribute) {
						if (attribute === node)
						{
							return true;
						}
					});
					
					return element;
					break;
				
				case 13: // Node.NAMESPACE_NODE
					return node.ownerElement;
					break;
				
				default:
					throw new Error('Internal Error: nodeParent - node type not supported: ' + node.type);
					break;
			}
		},
		
		
		/**
		 * Return ancestors of given node.
		 *
		 * @param {Node} node
		 * @return {Array} List of nodes in reverse document order
		 */
		nodeAncestor = function(node)
		{
			var parent,
				nodes = []
			;
			
			while(parent = nodeParent(node))
			{
				nodes.push(parent);
				node = parent;
			}
			
			return nodes;
		},
		
		/**
		 * Return following siblings of given node.
		 *
		 * @param {Node} node
		 * @return {Array} List of nodes in document order
		 */
		nodeFollowingSibling = function(node)
		{
			return nodeXSibling(node, 'nextSibling');
		},
		
		/**
		 * Return preceding siblings of given node.
		 *
		 * @param {Node} node
		 * @return {Array} List of nodes in reverse document order
		 */
		nodePrecedingSibling = function(node)
		{
			return nodeXSibling(node, 'previousSibling');
		},
		
		nodeXSibling = function(node, type)
		{
			var sibling,
				nodes = []
			;
			
			while (sibling = node[type])
			{
				switch(sibling.nodeType)
				{
					case 1: // element
					case 3: // text
					case 4: // CDATAsection
					case 7: // processing instruction
					case 8: // comment
					case 9: // document
						nodes.push(sibling);
						break;
						
					default:
						// don't add it
						break;
				}
				
				node = sibling;
			}
			
			return nodes;
		},
		
		/**
		 * Return following nodes of given node in document order excluding direct descendants.
		 *
		 * @param {Node} node
		 * @return {Array} List of nodes in document order
		 */
		nodeFollowing = function(node)
		{
			var nodes = [],
				parents,
				i,
				siblings,
				j
			;
			
			parents = nodeAncestor(node);
			parents.unshift(node);
			
			for(i=0; i < parents.length; i++)
			{
				siblings = nodeFollowingSibling(parents[i]);
				for(j=0; j < siblings.length; j++)
				{
					nodes.push(siblings[j]);
					nodes.push.apply(nodes, nodeDescendant(siblings[j]));
				}
			}
			
			return nodes;
		},
		
		/**
		 * Return preceding nodes of given node excluding direct ancestors.
		 *
		 * @param {Node} node
		 * @return {Array} List of nodes in reverse document order
		 */
		nodePreceding = function(node)
		{
			var nodes = [],
				parents,
				i,
				siblings,
				j
			;
			
			parents = nodeAncestor(node);
			parents.unshift(node);
			
			for(i=0; i < parents.length; i++)
			{
				siblings = nodePrecedingSibling(parents[i]);
				for(j=0; j < siblings.length; j++)
				{
					nodes.push.apply(nodes, nodeDescendant(siblings[j]).reverse());
					nodes.push(siblings[j]);
				}
			}
			
			return nodes;
		},
		
		/**
		 * Return owner document of node, or node itself if document
		 *
		 * @param {Node} node
		 * @return {Document} 
		 */
		nodeOwnerDocument = function(node)
		{
			switch(node.nodeType)
			{
				case 9: // document
					return node;
					
				default:
					return node.ownerDocument
			}
		},
		
		/**
		 * Return attributes of given element in document order regardless of whether they may be namespace nodes or not.
		 * 
		 * @return {Array} List of attribute nodes in document order
		 */
		nodeGetAttributes = function(node) 
		{
			var nodes = [],
				i
			;
			
			if (node.nodeType === 1) // element
			{
				for(i=0; i<node.attributes.length; i++)
				{
					if (!node.attributes[i].specified)
					{
						continue;
					}
					
					nodes.push(node.attributes[i]);
				}
			}
			
			// sort attributes if compareDocumentPosition available
			if (nodes.length > 1 && nodes[0].compareDocumentPosition) {
				nodes.sort(function(a, b) {
					var position = a.compareDocumentPosition(b);
					
					if ((position & 2) == 2) return 1;
					else if ((position & 4) == 4) return -1;
					else return 0;
				});
			}
			
			return nodes;
		},
		
		/**
		 * Return attributes of given element (no namespaces of course). Empty array otherwise
		 *
		 * @param {Node} node
		 * @return {Array} List of attribute nodes in document order
		 */
		nodeAttribute = function(node)
		{
			var allAttributeNodes = nodeGetAttributes(node),
				nodes = [],
				i
			;
			
			for(i = 0; i < allAttributeNodes.length; i++)
			{
				if (false === isNamespaceAttributeNode(allAttributeNodes[i]))
				{
					nodes.push(allAttributeNodes[i]);
				}
			}
			
			return nodes;
		},
		
		/**
		 * Return namespace nodes of given element node. Empty array otherwise
		 *
		 * @param {Node} node
		 * @param {Array} (optional) List of namespace nodes (in document order) to include
		 * @return {Array} List of namespace nodes in document order
		 */
		nodeNamespace = function(node, nsNodes)
		{
			var nodes = (nsNodes || []),
				allAttributeNodes,
				i,
				name,
				item
			;
			
			if (node.nodeType === 1) // element
			{
				/**
				 * IE puts all namespaces inside document.namespaces for HTML node
				 *
				 * @see http://msdn.microsoft.com/en-us/library/ms537470(VS.85).aspx
				 * @see http://msdn.microsoft.com/en-us/library/ms535854(v=VS.85).aspx
				 */
				if (node.ownerDocument.documentElement === node && typeof node.ownerDocument.namespaces === 'object')
				{
					for(i=node.ownerDocument.namespaces.length-1; i>=0; i--)
					{
						item = node.ownerDocument.namespaces.item(i);
						insertNamespaceIfNotDeclared.call(this, nodes, item.name, item.urn, node);
					}
				}
				
				allAttributeNodes = nodeGetAttributes(node);
				
				for(i = allAttributeNodes.length-1; i>=0; i--)
				{
					if (false === (name = isNamespaceAttributeNode(allAttributeNodes[i])))
					{
						continue;
					}
					
					/**
					 * Check the default namespace
					 *
					 * @see http://www.w3.org/TR/xml-names/#defaulting
					 */
					if (name.length === 1)
					{
						insertNamespaceIfNotDeclared.call(this, nodes, '', allAttributeNodes[i].nodeValue, node);
						continue;
					}
					
					/**
					 * Normal attribute checking for namespace declarations
					 */
					insertNamespaceIfNotDeclared.call(this, nodes, name[1], allAttributeNodes[i].nodeValue, node);
				}
				
				/**
				 * ... resolving the namespaceURI from a given prefix using the
				 * current information available in the node's hierarchy ...
				 *
				 * @see http://www.w3.org/TR/DOM-Level-3-XPath/xpath.html#XPathEvaluator-createNSResolver
				 */
				nodeNamespace.call(this, node.parentNode, nodes);
				
				// finished with tracking down all nodes
				if (nsNodes === undefined)
				{
					// always need this namespace
					insertNamespaceIfNotDeclared.call(this, nodes, 'xml', NAMESPACE_URI_XML, node);
					
					// if the default namespace is empty, remove it
					if (nodes[0] && nodes[0].prefix === '' && nodes[0].namespaceURI === '')
					{
						nodes.shift();
					}
				}
				
				if (nsNodes === undefined)
				{
					// before returning to original caller, we need to ensure all namespace nodes are
					// specific to this parent node
					for(i = 0; i < nodes.length; i++)
					{
						if (nodes[i].ownerElement !== node)
						{
							nodes[i] = createNamespaceNode(nodes[i].prefix, nodes[i].nodeValue, node);
						}
					}
				}
			}
			
			return nodes;
		},
		
		insertNamespaceIfNotDeclared = function(namespaces, prefix, ns, parent)
		{
			var i, namespace;
			
			if (!this.opts['case-sensitive'])
			{
				prefix = prefix.toLowerCase();
			}
			
			for(i=0; i < namespaces.length; i++)
			{
				if (namespaces[i].prefix === prefix)
				{
					// namespace already set, do not allow it to be overwritten
					return false;
				}
			}
			
			namespace = createNamespaceNode(prefix, ns, parent);
			
			if (prefix === '' && ns !== null)
			{
				namespaces.unshift(namespace);
			}
			else
			{
				namespaces.push(namespace);
			}
			
			return true;
		},
		
		isNamespaceAttributeNode = function(node)
		{
			var name = node.nodeName.split(':');
			
			if (name[0] === 'xmlns')
			{
				return name;
			}
			
			return false;
		},
		
		nodeIdAttribute = function(node, attribute)
		{
			var i,
				j,
				attributes,
				namespaces,
				ns,
				name,
				id
			;
			
			if (node.nodeType === 1)
			{
				attributes = (!attribute) ? nodeAttribute(node) : [attribute];
				namespaces = nodeNamespace.call(this, node);
				
				for(i=0; i<attributes.length; i++)
				{
					name = attributes[i].nodeName.split(':');
					
					if (name.length === 1)
					{
						// set default namespace
						name[1] = name[0];
						name[0] = '';
					}
					
					// check namespace of attribute
					ns = null;
					for(j=0; j < namespaces.length; j++)
					{
						if (namespaces[j].prefix === name[0])
						{
							ns = namespaces[j].namespaceURI;
							break;
						}
					}
					
					if (ns === null)
						ns = '';
					
					if (this.opts['unique-ids'][ns] === name[1])
					{
						// found it
						return attributes[i];
					}
				}
			}
			
			return null;
		},
		
		nodeAttributeSearch = function(startNode, stopAfterFirstMatch, fn)
		{
			var i,
				j,
				elements,
				element,
				matches = [];
			;
			
			// TODO: Possibly cache attribute nodes
			elements = startNode.getElementsByTagName("*");
			for (i = 0; i < elements.length; i++) {
				element = elements.item(i);
				if (element.nodeType != 1 /*Node.ELEMENT_NODE*/)
				{
					continue;
				}
				for (j = 0; j < element.attributes.length; j++) {
					if (!element.attributes[j].specified)
					{
						continue;
					}
					
					if (fn(element, element.attributes[j]) === true)
					{
						if (stopAfterFirstMatch)
						{
							return element;
						}
						else
						{
							matches.push(element);
							break;
						}
					}
				}
			}
			
			if (stopAfterFirstMatch)
			{
				return null;
			}
			else
			{
				return matches;
			}
		},
		
		nodeExpandedName = function(node)
		{
			var name,
				namespaces,
				i,
				qname
			;
			
			switch(node.nodeType)
			{
				/**
				 * There is an element node for every element in the document. An element node has an
				 * expanded-name computed by expanding the QName of the element specified in the
				 * tag in accordance with the XML Namespaces Recommendation [XML Names]. The namespace
				 * URI of the element's expanded-name will be null if the QName has no prefix and there
				 * is no applicable default namespace.
				 */
				case 1: // element
					/**
					 * @see http://tanalin.com/en/articles/ie-version-js/
					 */
					if (typeof node.scopeName != 'undefined' && /* < IE9 */ !document.addEventListener)
					{
						/**
						 * IE specific
						 *
						 * @see http://msdn.microsoft.com/en-us/library/ms534388(v=vs.85).aspx
						 */
						qname = {
							prefix: (node.scopeName == 'HTML') ? '' : node.scopeName,
							name: node.nodeName
						}
					}
					else
					{
						// other browsers
						name = node.nodeName.split(':');
						
						// check for namespace prefix
						if (name.length == 1)
						{
							qname = {
								prefix: '',
								name: name[0]
							};
						}
						else
						{
							qname = {
								prefix: name[0],
								name: name[1]
							};
						}
					}
					
					if (!this.opts['case-sensitive'])
					{
						qname.prefix = qname.prefix.toLowerCase();
						qname.name = qname.name.toLowerCase();
					}
					
					// resolve namespace
					namespaces = nodeNamespace.call(this, node);
					
					for(i=0; i < namespaces.length; i++)
					{
						if (namespaces[i].prefix === qname.prefix)
						{
							qname.ns = namespaces[i].namespaceURI;
							return qname;
						}
					}
					
					if (qname.prefix === '')
					{
						qname.ns = null;
						return qname;
					}
					
					throw new Error('Internal Error: nodeExpandedName - Failed to expand namespace prefix "' + qname.prefix + '" on element: ' + node.nodeName);
					break;
				
				case 2: // attribute
					name = node.nodeName.split(':');
					
					// check for namespace prefix
					if (name.length == 1)
					{
						/**
						 * The namespace URI of the attribute's name will be null if
						 * the QName of the attribute does not have a prefix.
						 */
						return {
							prefix: '',
							ns: null,
							name: name[0]
						};
					}
					
					qname = {
						prefix: name[0],
						name: name[1]
					};
					
					if (!this.opts['case-sensitive'])
					{
						qname.prefix = qname.prefix.toLowerCase();
						qname.name = qname.name.toLowerCase();
					}
					
					// resolve namespace
					namespaces = nodeNamespace.call(this, nodeParent(node)); // attribute
					
					for(i=0; i < namespaces.length; i++)
					{
						if (namespaces[i].prefix === qname.prefix)
						{
							qname.ns = namespaces[i].namespaceURI;
							return qname;
						}
					}
					
					throw new Error('Internal Error: nodeExpandedName - Failed to expand namespace prefix "' + qname.prefix + '" on attribute: ' + node.nodeName);
					break;
					
				case 13: // namespace
					return {
						prefix: null,
						ns: null,
						name: ((!this.opts['case-sensitive']) ? node.prefix : node.prefix.toLowerCase())
					}
					break;
				
				case 7: // processing instruction
					return {
						prefix: null,
						ns: null,
						name: ((!this.opts['case-sensitive']) ? node.target : node.target.toLowerCase())
					}
					break;
				
				default:
					return false;
					break;
			}
		},
		
		nodeStringValue = function(node)
		{
			var i,
				nodeset,
				value = ''
			;
			
			switch(node.nodeType)
			{
				/**
				 * The string-value of the root node is the concatenation of the string-values of all
				 * text node descendants of the root node in document order.
				 */
				case 9: // document
				/**
				 * The string-value of an element node is the concatenation of the string-values of all
				 * text node descendants of the element node in document order.
				 */
				case 1: // element
					nodeset = evaluateExpressionTree(
						new Context(node, 1, 1, {}, {}, {}), {
							type: 'step',
							args: [
								'descendant',
								{
									type: 'nodeType',
									args: [
										'text',
										[]
									]
								}
							]
						}
					);
					
					nodeset.sortDocumentOrder();
					
					for(i=0; i< nodeset.value.length; i++)
					{
						value += nodeset.value[i].data;
					}
					
					return value;
					break;
				
				/**
				 * The string-value is the normalized value as specified by the XML Recommendation [XML].
				 * An attribute whose normalized value is a zero-length string is not treated specially:
				 * it results in an attribute node whose string-value is a zero-length string.
				 *
				 * @see http://www.w3.org/TR/1998/REC-xml-19980210#AVNormalize
				 */
				case 2: // attribute
					return node.nodeValue;
					break;
				
				/**
				 * The string-value of a namespace node is the namespace URI that is being bound to the
				 * namespace prefix;
				 * TODO-FUTURE: if it is relative, it must be resolved just like a namespace URI in an expanded-name.
				 */
				case 13: // namespace
					return node.namespaceURI;
					break;
				
				/**
				 * The string-value of a processing instruction node is the part of the processing instruction following
				 * the target and any whitespace. It does not include the terminating ?>.
				 */
				case 7: // processing instruction
				/**
				 * The string-value of comment is the content of the comment not including the opening <!-- or the closing -->.
				 */
				case 8: // comment
				/**
				 * The string-value of a text node is the character data. A text node always has at least one character of data.
				 */
				case 3: // text
				case 4: // CDATAsection
					return node.data;
					break;
				
				default:
					throw new Error('Internal Error: nodeStringValue does not support node type: ' + node.nodeType);
					break;
			}
		},
		
		createError = function(code, name, message)
		{
			var err = new Error(message);
			err.name = name;
			err.code = code;
			return err;
		},
		
		/**
		 * @param {Object} needle
		 * @param {Array} haystack
		 * @return {Number}
		 */
		arrayIndexOf = function(needle, haystack)
		{
			var i = haystack.length;
			while (i--) {
				if (haystack[i] === needle) {
					return i;
				}
			}
			return false;
		},
		
		/**
		 * @see http://www.w3.org/TR/xpath/#booleans
		 */
		compareOperator = function(left, right, operator, compareFunction)
		{
			var i,
				j,
				leftValues,
				rightValues,
				result
			;
			
			if (left instanceof NodeSetType)
			{
				if (right instanceof NodeSetType)
				{
					/**
					 * If both objects to be compared are node-sets, then the comparison
					 * will be true if and only if there is a node in the first node-set
					 * and a node in the second node-set such that the result of performing
					 * the comparison on the string-values of the two nodes is true.
					 */
					rightValues = right.stringValues();
					leftValues = left.stringValues();
					
					for(i=0; i < leftValues.length; i++)
					{
						for(j=0; j < rightValues.length; j++)
						{
							result = compareOperator(leftValues[i], rightValues[j], operator, compareFunction);
							if (result.toBoolean())
							{
								return result;
							}
						}
					}
				}
				else
				{
					/**
					 * If one object to be compared is a node-set and the other is a number,
					 * then the comparison will be true if and only if there is a node in the node-set
					 * such that the result of performing the comparison on the number to be compared
					 * and on the result of converting the string-value of that node to a
					 * number using the number function is true.
					 */
					if (right instanceof NumberType)
					{
						leftValues = left.stringValues();
						
						for(i=0; i < leftValues.length; i++)
						{
							result = compareOperator(new NumberType(leftValues[i].toNumber()), right, operator, compareFunction);
							if (result.toBoolean())
							{
								return result;
							}
						}
					}
					/**
					 * If one object to be compared is a node-set and the other is a string, then the
					 * comparison will be true if and only if there is a node in the node-set such
					 * that the result of performing the comparison on the string-value of
					 * the node and the other string is true.
					 */
					else if (right instanceof StringType)
					{
						leftValues = left.stringValues();
						
						for(i=0; i < leftValues.length; i++)
						{
							result = compareOperator(leftValues[i], right, operator, compareFunction);
							if (result.toBoolean())
							{
								return result;
							}
						}
					}
					/**
					 * If one object to be compared is a node-set and the other is a boolean, then the comparison
					 * will be true if and only if the result of performing the comparison on the boolean
					 * and on the result of converting the node-set to a boolean using the boolean function is true.
					 */
					else
					{
						return compareOperator(new BooleanType(left.toBoolean()), right, operator, compareFunction);
					}
				}
			}
			else
			{
				if (right instanceof NodeSetType)
				{
					/**
					 * If one object to be compared is a node-set and the other is a number,
					 * then the comparison will be true if and only if there is a node in the node-set
					 * such that the result of performing the comparison on the number to be compared
					 * and on the result of converting the string-value of that node to a
					 * number using the number function is true.
					 */
					if (left instanceof NumberType)
					{
						rightValues = right.stringValues();
						
						for(i=0; i < rightValues.length; i++)
						{
							result = compareOperator(left, new NumberType(rightValues[i].toNumber()), operator, compareFunction);
							if (result.toBoolean())
							{
								return result;
							}
						}
					}
					/**
					 * If one object to be compared is a node-set and the other is a string, then the
					 * comparison will be true if and only if there is a node in the node-set such
					 * that the result of performing the comparison on the string-value of
					 * the node and the other string is true.
					 */
					else if (left instanceof StringType)
					{
						rightValues = right.stringValues();
						
						for(i=0; i < rightValues.length; i++)
						{
							result = compareOperator(left, rightValues[i], operator, compareFunction);
							if (result.toBoolean())
							{
								return result;
							}
						}
					}
					/**
					 * If one object to be compared is a node-set and the other is a boolean, then the comparison
					 * will be true if and only if the result of performing the comparison on the boolean
					 * and on the result of converting the node-set to a boolean using the boolean function is true.
					 */
					else
					{
						return compareOperator(left, new BooleanType(right.toBoolean()), operator, compareFunction);
					}
				}
				else
				{
					switch(operator)
					{
						/**
						 * When neither object to be compared is a node-set and the operator is = or !=,
						 * then the objects are compared by converting them to a common type as
						 * follows and then comparing them.
						 */
						case '=':
						case '!=':
							/**
							 * If at least one object to be compared is a boolean, then each object to be
							 * compared is converted to a boolean as if by applying the boolean function.
							 */
							if (left instanceof BooleanType || right instanceof BooleanType)
							{
								return new BooleanType(compareFunction(left.toBoolean(), right.toBoolean()));
							}
							/**
							 * Otherwise, if at least one object to be compared is a number, then each object
							 * to be compared is converted to a number as if by applying the number function.
							 */
							else if (left instanceof NumberType || right instanceof NumberType)
							{
								return new BooleanType(compareFunction(left.toNumber(), right.toNumber()));
							}
							
							/**
							 * Otherwise, both objects to be compared are converted to strings
							 * as if by applying the string function.
							 */
							return new BooleanType(compareFunction(left.toString(), right.toString()));
							
							break;
						
						/**
						 * When neither object to be compared is a node-set and the operator is <=, <, >= or >,
						 * then the objects are compared by converting both objects to numbers and comparing
						 * the numbers according to IEEE 754.
						 */
						default:
							return new BooleanType(compareFunction(left.toNumber(), right.toNumber()));
							break;
					}
				}
			}
			
			return new BooleanType(false);
		},
		
		getComparableNode = function(node)
		{
			switch(node.nodeType)
			{
				case 2: // attribute
				case 3: // text
				case 4: // CDATASection
				case 7: // processing instruction
				case 8: // comment
					return nodeParent(node);
					break;
				
				case 1: // element
				case 9: // document
					// leave as is
					return node;
					break;
				
				case 13: // namespace
				default:
					throw new Error('Internal Error: getComparableNode - Node type not supported: ' + node.nodeType);
					break;
			}
		},
		
		compareDocumentPosition = function(a, b)
		{
			var result, nodes, i;
			
			if (a.nodeType == 13 &&
				b.nodeType == 13 &&
				a.ownerElement == b.ownerElement
			) {
				// identical
				if (a === b) return 0;
				
				nodes = nodeNamespace.call(currentExpression, a.ownerElement);
				
				for(i=0; i < nodes.length; i++)
				{
					if (nodes[i] === a)
					{
						result = 4;
						break;
					}
					else if (nodes[i] === b)
					{
						result = 2;
						break;
					}
				}
			}
			else
			{
				if (a.nodeType == 13) a = a.ownerElement;
				if (b.nodeType == 13) b = b.ownerElement;
				
				result = compareDocumentPositionNoNamespace(a, b);
			}
			
			return result;
		},
		
		/**
		 * @see http://ejohn.org/blog/comparing-document-position/
		 */
		compareDocumentPositionNoNamespace = function(a, b)
		{
			var a2,
				b2,
				result,
				i,
				item,
				compareOriginalVsComparableNode = function(a, a2, b, b2, result, v16, v8, v4, v2) {
					// if a contains b2 or a == b2
					if (result === 0 || (result & v16) === v16)
					{
						// return result
						return v4 + v16;
					}
					// else if b2 contains a
					else if ((result & v8) === v8)
					{
						// since b != b2, b is an attribute
						// and since a == a2, a is a node,
						// so b has to come before a
						return v2;
					}
					else
					{
						// return result
						return result;
					}
				}
			;
			
			// check for native implementation
			if (a.compareDocumentPosition)
			{
				return a.compareDocumentPosition(b);
			}
			
			if (a === b)
			{
				return 0;
			}
			
			a2 = getComparableNode(a);
			b2 = getComparableNode(b);
			
			// handle document case
			if (a2.nodeType === 9)
			{
				if (b2.nodeType === 9)
				{
					if (a2 !== b2)
					{
						return 1; // different documents
					}
					else
					{
						result = 0; // same nodes
					}
				}
				else
				{
					if (a2 !== b2.ownerDocument)
					{
						return 1; // different documents
					}
					else
					{
						result = 4 + 16; // a2 before b2, a2 contains b2
					}
				}
			}
			else
			{
				if (b2.nodeType === 9)
				{
					if (b2 !== a2.ownerDocument)
					{
						return 1; // different documents
					}
					else
					{
						result = 2 + 8 // b2 before a2, b2 contains a2
					}
				}
				else
				{
					if (a2.ownerDocument !== b2.ownerDocument)
					{
						return 1; // different documents
					}
					else
					{
						// do a contains comparison for element nodes
						if (!a2.contains || typeof a2.sourceIndex === 'undefined' || !b2.contains || typeof b2.sourceIndex === 'undefined')
						{
							throw new Error('Cannot compare elements. Neither "compareDocumentPosition" nor "contains" available.');
						}
						else
						{
							result = 
								(a2 != b2 && a2.contains(b2) && 16) +
								(a2 != b2 && b2.contains(a2) && 8) +
								(a2.sourceIndex >= 0 && b2.sourceIndex >= 0
									? (a2.sourceIndex < b2.sourceIndex && 4) + (a2.sourceIndex > b2.sourceIndex && 2)
									: 1 ) +
								0 ;
						}
					}
				}
			}
			
			if (a === a2 && b === b2)
			{
				return result;
			}
			else if (a === a2)
			{
				return compareOriginalVsComparableNode(a, a2, b, b2, result, 16, 8, 4, 2);
			}
			else if (b === b2)
			{
				return compareOriginalVsComparableNode(b, b2, a, a2, result, 8, 16, 2, 4);
			}
			else
			{
				// if a2 contains b2
				if ((result & 16) === 16)
				{
					// since a and b are attributes, a has to come before b
					return 4;
				}
				// else if b2 contains a2
				else if ((result & 8) === 8)
				{
					// since a and b are attributes, b has to come before a
					return 2;
				}
				// else if a2 === b2
				else if (result === 0)
				{
					// since a and b are attributes, and both have the same parent
					// find out which attribute comes first
					
					// return "a pre b" or "b pre a" depending on a or b occurs first in a2.childNodes
					for(i=0; i<a2.attributes.length; i++)
					{
						item = a2.attributes[i];
						if (!item.specified) continue;
						
						if (item === b)
						{
							return 2;
						}
						else if (item === a)
						{
							return 4;
						}
					}
					
					throw new Error('Internal Error: compareDocumentPosition failed to sort attributes.');
				}	
				// else
				else
				{
					// return result
					return result;
				}
			}
			
			throw new Error('Internal Error: compareDocumentPosition failed to sort nodes.');
		},
		
		nodeSupported = function(contextNode)
		{
			if (!contextNode) {
				throw createError(9, 'NOT_SUPPORTED_ERR', 'Context node was not supplied.');
			}
			else if (
					contextNode.nodeType != 9 && // Document
					contextNode.nodeType != 1 && // Element
					contextNode.nodeType != 2 && // Attribute
					contextNode.nodeType != 3 && // Text
					contextNode.nodeType != 4 && // CDATASection
					contextNode.nodeType != 8 && // Comment
					contextNode.nodeType != 7 && // ProcessingInstruction
					contextNode.nodeType != 13   // XPathNamespace
			) {
				throw createError(9, 'NOT_SUPPORTED_ERR', 'The supplied node type is not supported. (nodeType: ' + contextNode.nodeType + ')');
			}
			else if (contextNode.nodeType == 2 && !contextNode.specified)
			{
				throw createError(9, 'NOT_SUPPORTED_ERR', 'The supplied node is a non-specified attribute node. Only specified attribute nodes are supported.');
			}
		},
		
		createNamespaceNode = function(prefix, ns, parent)
		{
			var i, namespaceNode;
			
			for(i = 0; i < namespaceCache.length; i++)
			{
				namespaceNode = namespaceCache[i];
				
				if (namespaceNode.prefix === prefix &&
					namespaceNode.nodeValue === ns &&
					namespaceNode.ownerElement === parent)
				{
					// we have already created this namespace node, so use this one
					return namespaceNode;
				}
			}
			
			// no such node created in the past, so create it now
			namespaceNode = new XPathNamespace(prefix, ns, parent);
			
			// add node to cache
			namespaceCache.push(namespaceNode);
			
			return namespaceNode;
		}
	;
	
	BaseType = function(value, type, supports)
	{
		this.value = value;
		this.type = type;
		this.supports = supports
	}
	
	BaseType.prototype = {
		value: null,
		type: null,
		supports: [],
		
		toBoolean: function() {
			throw new Error('Unable to convert "' + this.type + '" to "boolean".');
		},
		
		toString: function() {
			throw new Error('Unable to convert "' + this.type + '" to "string".');
		},
		
		toNumber: function() {
			throw new Error('Unable to convert "' + this.type + '" to "number".');
		},
		
		toNodeSet: function() {
			throw new Error('Unable to convert "' + this.type + '" to "node-set".');
		},
		
		/**
		 * Check if this type can be converted to a particular javascript type.
		 */
		canConvertTo: function(type)
		{
			return false !== arrayIndexOf(type, this.supports);
		}
	}
	
	BooleanType = function(value)
	{
		BaseType.call(this, value, 'boolean', [
			'boolean',
			'string',
			'number'
		]);
	}
	BooleanType.prototype = new BaseType;
	BooleanType.constructor = BooleanType;
	BooleanType.prototype.toBoolean = function() {
		return this.value;
	}
	/**
	 * The boolean false value is converted to the string false. The boolean true value is converted to the string true.
	 */
	BooleanType.prototype.toString = function() {
		return (this.value === true) ? 'true' : 'false';
	}
	/**
	 * boolean true is converted to 1; boolean false is converted to 0
	 */
	BooleanType.prototype.toNumber = function() {
		return (this.value) ? 1 : 0;
	}
	
	NodeSetType = function(value, documentOrder)
	{
		BaseType.call(this, value, 'node-set', [
			'boolean',
			'string',
			'number',
			'node-set'
		]);
		
		this.docOrder = (documentOrder || 'unsorted');
	}
	NodeSetType.prototype = new BaseType;
	NodeSetType.constructor = NodeSetType;
	/**
	 * a node-set is true if and only if it is non-empty
	 */
	NodeSetType.prototype.toBoolean = function() {
		return (this.value.length > 0) ? true : false;
	}
	/**
	 * A node-set is converted to a string by returning the string-value of the node
	 * in the node-set that is first in document order. If the node-set
	 * is empty, an empty string is returned.
	 */
	NodeSetType.prototype.toString = function() {
		if (this.value.length < 1)
		{
			return '';
		}
		
		this.sortDocumentOrder();
		return nodeStringValue(this.value[0]);
	}
	/**
	 * a node-set is first converted to a string as if by a call to the string
	 * function and then converted in the same way as a string argument
	 */
	NodeSetType.prototype.toNumber = function() {
		return (new StringType(this.toString())).toNumber();
	}
	NodeSetType.prototype.toNodeSet = function() {
		return this.value;
	}
	NodeSetType.prototype.sortDocumentOrder = function() {
		switch(this.docOrder)
		{
			case 'document-order':
				// already sorted
				break;
				
			case 'reverse-document-order':
				// reverse the order
				this.value.reverse();
				break;
				
			default:
				this.value.sort(function(a, b) {
					var result = compareDocumentPosition(a, b);
					
					if ( (result & 4) == 4 ) // a before b
					{
						return -1;
					}
					else if ( (result & 2) == 2 ) // b before a
					{
						return 1;
					}
					else
					{
						throw new Error('NodeSetType.sortDocumentOrder - unexpected compare result: ' + result);
					}
				});
				break;
		}
		
		this.docOrder = 'document-order';
	}
	NodeSetType.prototype.sortReverseDocumentOrder = function() {
		switch(this.docOrder)
		{
			case 'document-order':
				// reverse the order
				this.value.reverse();
				break;
				
			case 'reverse-document-order':
				// already sorted
				break;
				
			default:
				this.sortDocumentOrder();
				this.value.reverse();
				break;
		}
		
		this.docOrder = 'reverse-document-order';
	}
	
	NodeSetType.prototype.append = function(nodeset) {
		var length,
			i = 0,
			j = 0,
			result
		;
		
		if(!nodeset instanceof NodeSetType)
		{
			throw new Error('NodeSetType can be passed into NodeSetType.append method');
		}
		
		// use merge sort algorithm
		this.sortDocumentOrder();
		nodeset.sortDocumentOrder();
		
		while(i < this.value.length && j < nodeset.value.length)
		{
			result = compareDocumentPosition(this.value[i], nodeset.value[j]);
			
			if (result == 0) // same nodes
			{
				// ignore duplicates
				j++
			}
			else if ( (result & 4) == 4 ) // a before b
			{
				i++;
			}
			else if ( (result & 2) == 2 ) // b before a
			{
				this.value.splice(i, 0, nodeset.value[j]);
				i++;
				j++;
			}
			else
			{
				throw new Error('Internal Error: NodeSetType.append - unable to sort nodes. (result: ' + result + ')');
			}
		}
		
		// append remaining elements
		for (;j < nodeset.value.length; j++)
		{
			this.value.push(nodeset.value[j]);
		}
		
		this.docOrder = 'document-order';
	}
	
	NodeSetType.prototype.stringValues = function()
	{
		var i,
			values = []
		;
		
		for(i=0; i < this.value.length; i++)
		{
			values.push(new StringType(nodeStringValue(this.value[i])));
		}
		
		return values;
	}
	
	StringType = function(value)
	{
		BaseType.call(this, value, 'string', [
			'boolean',
			'string',
			'number'
		]);
	}
	StringType.prototype = new BaseType;
	StringType.constructor = StringType;
	/**
	 * a string is true if and only if its length is non-zero
	 */
	StringType.prototype.toBoolean = function() {
		return (this.value.length > 0) ? true : false;
	}
	StringType.prototype.toString = function() {
		return this.value;
	}
	/**
	 * a string that consists of optional whitespace followed by an optional minus sign
	 * followed by a Number followed by whitespace is converted to the IEEE 754 number
	 * that is nearest (according to the IEEE 754 round-to-nearest rule) to the mathematical
	 * value represented by the string; any other string is converted to NaN
	 */
	StringType.prototype.toNumber = function() {
		var result;
							
		// Digits ('.' Digits?)?
		result = this.value.match(/^[ \t\r\n]*(-?[0-9]+(?:[.][0-9]*)?)[ \t\r\n]*$/)
		if (result !== null)
		{
			return parseFloat(result[1]);
		}
		
		// '.' Digits
		result = this.value.match(/^[ \t\r\n]*(-?[.][0-9]+)[ \t\r\n]*$/)
		if (result !== null)
		{
			return parseFloat(result[1]);
		}
		
		// Invalid number
		return Number.NaN;
	}
	
	NumberType = function(value)
	{
		BaseType.call(this, value, 'number', [
			'boolean',
			'string',
			'number'
		]);
	}
	NumberType.prototype = new BaseType;
	NumberType.constructor = NumberType;
	/**
	 * a number is true if and only if it is neither positive or negative zero nor NaN
	 */
	NumberType.prototype.toBoolean = function() {
		return (this.value !== 0 && !isNaN(this.value)) ? true : false;
	}
	/**
	 * A number is converted to a string as follows:
	 *     NaN is converted to the string NaN
	 *     positive zero is converted to the string 0
	 *     negative zero is converted to the string 0
	 *     positive infinity is converted to the string Infinity
	 *     negative infinity is converted to the string -Infinity
	 *     if the number is an integer, the number is represented in decimal form as a Number with no decimal point
	 *     and no leading zeros, preceded by a minus sign (-) if the number is negative ...
	 *     otherwise, the number is represented in decimal form as a Number
	 */
	NumberType.prototype.toString = function() {
		return this.value.toString();
	}
	NumberType.prototype.toNumber = function() {
		return this.value;
	}
	
	/**
	 * A new exception has been created for exceptions specific to these XPath interfaces.
	 *
	 * @see http://www.w3.org/TR/DOM-Level-3-XPath/xpath.html#XPathException
	 * 
	 */
	XPathException = function(code, message)
	{
		var err;
		
		/**
		 * @type {number}
		 */
		this.code = code;
		
		switch(this.code)
		{
			case XPathException.INVALID_EXPRESSION_ERR:
				this.name = 'INVALID_EXPRESSION_ERR';
				break;
				
			case XPathException.TYPE_ERR:
				this.name = 'TYPE_ERR';
				break;
			
			default:
				err = new Error('Unsupported XPathException code: ' + this.code);
				err.name = 'XPathExceptionInternalError';
				throw err;
				break;
		}
		
		this.message = (message || "");
	}
	
	XPathException.prototype.toString = function() {
		return 'XPathException: "' + this.message + '"'
			+ ', code: "' + this.code + '"'
			+ ', name: "' + this.name + '"'
		;
	}
	
	/**
	 * If the expression has a syntax error or otherwise is not a legal expression
	 * according to the rules of the specific XPathEvaluator or contains specialized
	 * extension functions or variables not supported by this implementation.
	 *
	 * @see http://www.w3.org/TR/DOM-Level-3-XPath/xpath.html#INVALID_EXPRESSION_ERR
	 */
	XPathException.INVALID_EXPRESSION_ERR = 51;
	
	/**
	 * If the expression cannot be converted to return the specified type.
	 *
	 * @see http://www.w3.org/TR/DOM-Level-3-XPath/xpath.html#TYPE_ERR
	 */
	XPathException.TYPE_ERR = 52;
	
	/**
	 * The evaluation of XPath expressions is provided by XPathEvaluator. In a DOM
	 * implementation which supports the XPath 3.0 feature, as described above,
	 * the XPathEvaluator interface will be implemented on the same object which
	 * implements the Document interface permitting it to be obtained by the usual
	 * binding-specific method such as casting or by using the DOM Level 3
	 * getInterface method. In this case the implementation obtained from the Document
	 * supports the XPath DOM module and is compatible with the XPath 1.0 specification.
	 *
	 * Evaluation of expressions with specialized extension functions or variables
	 * may not work in all implementations and is, therefore, not portable.
	 * XPathEvaluator implementations may be available from other sources that
	 * could provide specific support for specialized extension functions or variables
	 * as would be defined by other specifications.
	 *
	 * @see http://www.w3.org/TR/DOM-Level-3-XPath/xpath.html#XPathEvaluator
	 */
	XPathEvaluator = function(options)
	{
		var option, defaultOption, found;
		
		for (option in options)
		{
			found = false;
			for(defaultOption in this.opts)
			{
				if (option === defaultOption)
				{
					this.opts[option] = options[option];
					found = true;
					break;
				}
			}
			if (found)
				continue;
			
			throw new Error('Unsupported option: ' + option);
		}
		
		// define unique ids
		this.opts['unique-ids'][NAMESPACE_URI_XML] = 'id';
		this.opts['unique-ids'][NAMESPACE_URI_XHTML] = 'id';
	}
	XPathEvaluator.prototype = {
		opts: {
			/**
			 * List of unique ID for each namespace
			 *
			 * @see http://www.w3.org/TR/xpath/#unique-id
			 */
			'unique-ids': {},
			
			/**
			 * Specifies whether node name tests should be case sensitive
			 */
			'case-sensitive': false
		},
		
		/**
		 * Creates a parsed XPath expression with resolved namespaces. This is
		 * useful when an expression will be reused in an application since it
		 * makes it possible to compile the expression string into a more efficient
		 * internal form and preresolve all namespace prefixes which occur within
		 * the expression.
		 *
		 * @see http://www.w3.org/TR/DOM-Level-3-XPath/xpath.html#XPathEvaluator-createExpression
		 * @param {string} expression The XPath expression string to be parsed.
		 * @param {XPathNSResolver} resolver The resolver permits translation of all prefixes,
		 *        including the xml namespace prefix, within the XPath expression into
		 *        appropriate namespace URIs. If this is specified as null, any namespace
		 *        prefix within the expression will result in DOMException being thrown
		 *        with the code NAMESPACE_ERR.
		 * @return {XPathExpression} The compiled form of the XPath expression.
		 * @exception {XPathException} INVALID_EXPRESSION_ERR: Raised if the expression is not
		 *        legal according to the rules of the XPathEvaluator.
		 * @exception {DOMException} NAMESPACE_ERR: Raised if the expression contains namespace
		 *        prefixes which cannot be resolved by the specified XPathNSResolver.
		 */
		createExpression: function(expression, resolver)
		{
			var tree,
				message,
				i,
				nsMapping = {},
				prefix
			;
			
			// Parse the expression
			try {
				tree = XPathJS._parser.parse(expression);
			} catch(err) {
				message = 'The expression is not a legal expression.';
				if (err instanceof XPathJS._parser.SyntaxError)
				{
					message += ' (line: ' + err.line + ', character: ' + err.column + ')';
				}
				else
				{
					// this shouldn't happen, but it's here just in case
					message += ' (' + err.message + ')';
				}
				throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, message);
			}
			
			// Resolve namespaces if any
			if (tree.nsPrefixes.length > 0)
			{
				// ensure resolver supports lookupNamespaceURI function
				if (typeof resolver != 'object' ||
					typeof resolver.lookupNamespaceURI === 'undefined')
				{
					throw new XPathException(XPathException.INVALID_EXPRESSION_ERR,
						"No namespace resolver provided or lookupNamespaceURI function not supported."
					);
				}
				
				for(i=0; i < tree.nsPrefixes.length; i++)
				{
					prefix = tree.nsPrefixes[i];
					nsMapping[prefix] = resolver.lookupNamespaceURI(prefix);
					
					if (nsMapping[prefix] === null)
					{
						throw createError(14, 'NAMESPACE_ERR', 'Undefined namespace prefix "' + prefix + '" in the context of the given resolver.');
					}
				}
			}
			
			return new XPathExpression(tree, nsMapping, this.opts);
		}
		
		/**
		 * Adapts any DOM node to resolve namespaces so that an XPath expression
		 * can be easily evaluated relative to the context of the node where it
		 * appeared within the document. This adapter works like the DOM Level 3
		 * method lookupNamespaceURI on nodes in resolving the namespaceURI from a
		 * given prefix using the current information available in the node's
		 * hierarchy at the time lookupNamespaceURI is called. also correctly
		 * resolving the implicit xml prefix.
		 *
		 * @see http://www.w3.org/TR/DOM-Level-3-XPath/xpath.html#XPathEvaluator-createNSResolver
		 * @param {Node} nodeResolver The node to be used as a context for namespace resolution.
		 * @return {XPathNSResolver} Resolves namespaces with respect to the definitions in scope for a specified node.
		 */
		,createNSResolver: function(nodeResolver)
		{
			return new XPathNSResolver(nodeResolver);
		}
		
		/**
		 * Evaluates an XPath expression string and returns a result of the specified type if possible.
		 *
		 * @see http://www.w3.org/TR/DOM-Level-3-XPath/xpath.html#XPathEvaluator-evaluate
		 * @param {string} expression The XPath expression string to be parsed and evaluated.
		 * @param {Node} contextNode The context is context node for the evaluation of this XPath expression.
		 *        If the XPathEvaluator was obtained by casting the Document then this must
		 *        be owned by the same document and must be a Document, Element, Attribute,
		 *        Text, CDATASection, Comment, ProcessingInstruction, or XPathNamespace node.
		 *        If the context node is a Text or a CDATASection, then the context is
		 *        interpreted as the whole logical text node as seen by XPath, unless the node
		 *        is empty in which case it may not serve as the XPath context.
		 * @param {XPathNSResolver} resolver The resolver permits translation of all prefixes, including the
		 *        xml namespace prefix, within the XPath expression into appropriate namespace
		 *        URIs. If this is specified as null, any namespace prefix within the
		 *        expression will result in DOMException being thrown with the code NAMESPACE_ERR.
		 * @param {number} type If a specific type is specified, then the result will be returned as the corresponding type.
		 *        For XPath 1.0 results, this must be one of the codes of the XPathResult interface.
		 * @param {XPathResult} result The result specifies a specific result object which may be reused and
		 *        returned by this method. If this is specified as nullor the implementation does
		 *        not reuse the specified result, a new result object will be constructed and returned.
		 * @return {XPathResult} The result of the evaluation of the XPath expression.
		 * @exception {XPathException} INVALID_EXPRESSION_ERR: Raised if the expression is not
		 *        legal according to the rules of the XPathEvaluator.
		 *        TYPE_ERR: Raised if the result cannot be converted to return the specified type.
		 * @exception {Error} NAMESPACE_ERR: Raised if the expression contains namespace prefixes
		 *        which cannot be resolved by the specified XPathNSResolver.
		 *        WRONG_DOCUMENT_ERR: The Node is from a document that is not supported by this XPathEvaluator.
		 *        NOT_SUPPORTED_ERR: The Node is not a type permitted as an XPath context node or the request
		 *        type is not permitted by this XPathEvaluator.
		 */
		,evaluate: function(expression, contextNode, resolver, type, result)
		{
			// create expression
			var expression = this.createExpression(expression, resolver);
			
			// evaluate expression
			return expression.evaluate(contextNode, type, result);
		}
	};
	
	/**
	 * The XPathExpression interface represents a parsed and resolved XPath expression.
	 *
	 * @see http://www.w3.org/TR/DOM-Level-3-XPath/xpath.html#XPathExpression
	 */
	XPathExpression = function(parsedExpression, namespaceMapping, options) {
		this.parsedExpression = parsedExpression;
		this.namespaceMapping = namespaceMapping;
		this.opts = options || {};
	}
	
	XPathExpression.prototype = {
		/**
		 * Parsed expression tree
		 *
		 * @type {Object}
		 */
		parsedExpression: null,
		
		/**
		 * Mapping of prefixes to namespaces
		 *
		 * @type {Object}
		 */
		namespaceMapping: null,
		
		/**
		 * Options used to tweak expression evaluation
		 *
		 * @type {Object}
		 */
		opts: {},
		
		/**
		 * Evaluates this XPath expression and returns a result.
		 *
		 * @see http://www.w3.org/TR/DOM-Level-3-XPath/xpath.html#XPathExpression-evaluate
		 * @param {Node} contextNode The context is context node for the evaluation of this XPath expression.
		 *        If the XPathEvaluator was obtained by casting the Document then this must
		 *        be owned by the same document and must be a Document, Element, Attribute,
		 *        Text, CDATASection, Comment, ProcessingInstruction, or XPathNamespace node.
		 *        If the context node is a Text or a CDATASection, then the context is
		 *        interpreted as the whole logical text node as seen by XPath, unless the node
		 *        is empty in which case it may not serve as the XPath context.
		 * @param {number} type If a specific type is specified, then the result will be
		 *        coerced to return the specified type relying on XPath conversions and
		 *        fail if the desired coercion is not possible. This must be one of the
		 *        type codes of XPathResult.
		 * @param {XPathResult} result The result specifies a specific result object which may be reused and
		 *        returned by this method. If this is specified as nullor the implementation does
		 *        not reuse the specified result, a new result object will be constructed and returned.
		 * @return {XPathResult} The result of the evaluation of the XPath expression.
		 * @exception {XPathException} TYPE_ERR: Raised if the result cannot be converted to return the specified type.
		 * @exception {Error} WRONG_DOCUMENT_ERR: The Node is from a document that is not supported by this XPathEvaluator.
		 *        NOT_SUPPORTED_ERR: The Node is not a type permitted as an XPath context node or the request
		 *        type is not permitted by this XPathEvaluator.
		 */
		evaluate: function(contextNode, type, result)
		{
			var context;
			
			// HACK: track current expression being evaluated
			currentExpression = this;
			
			// check if our implementation supports this node type
			nodeSupported(contextNode);
			
			context = new Context(contextNode, 1, 1, {}, functions, this.namespaceMapping, this.opts);
			
			return XPathResult.factory(
				context,
				type,
				evaluateExpressionTree(context, this.parsedExpression.tree)
			)
		}
	}
	
	/**
	 * Expression evaluation occurs with respect to a context.
	 *
	 * @see http://www.w3.org/TR/xpath/#dt-context-node
	 */
	Context = function(node, position, size, vars, functions, namespaceMap, options)
	{
		this.node = node;
		this.pos = position;
		this.size = size;
		this.vars = vars;
		this.fns = functions;
		this.nsMap = namespaceMap;
		this.opts = options || {};
	}
	
	Context.prototype = {
		// a node (the context node)
		node: null,
		
		// a pair of non-zero positive integers (the context position and the context size)
		pos: null,
		size: null,
		
		// a set of variable bindings
		vars: null,
		
		// a function library
		fns: null,
		
		// the set of namespace declarations in scope for the expression
		nsMap: null,
		
		// Options used to tweak expression evaluation
		opts: null,
		
		clone: function(node, position, size)
		{
			return new Context(
				node || this.node,
				(typeof position != 'undefined') ? position : this.pos,
				(typeof size != 'undefined') ? size : this.size,
				this.vars,
				this.fns,
				this.nsMap,
				this.opts
			);
		}
	};
	
	/**
	 * The XPathNSResolver interface permit prefix strings in the expression to be
	 * properly bound to namespaceURI strings. XPathEvaluator can construct an
	 * implementation of XPathNSResolver from a node, or the interface may be
	 * implemented by any application. 
	 *
	 * @see http://www.w3.org/TR/DOM-Lstring-3-XPath/xpath.html#XPathNSResolver
	 */
	XPathNSResolver = function(nodeResolver)
	{
		nodeSupported(nodeResolver);
		this.node = nodeResolver;
	}
	
	XPathNSResolver.prototype = {
		
		/**
		 * Node used as a reference to resolve prefix to a namespace.
		 *
		 * @type {Node}
		 */
		node: null,
		
		/**
		 * Look up the namespace URI associated to the given namespace prefix.
		 * The XPath evaluator must never call this with a null or empty argument,
		 * because the result of doing this is undefined.
		 *
		 * @see http://www.w3.org/TR/DOM-Level-3-XPath/xpath.html#XPathNSResolver-lookupNamespaceURI
		 * @param {string} prefix The prefix to look for.
		 * @return {string} Returns the associated namespace URI or null if none is found.
		 */
		lookupNamespaceURI: function(prefix)
		{
			var node = this.node
				,i
				,namespace
				,tmpNode
			;
			
			switch(prefix)
			{
				case 'xml': // http://www.w3.org/TR/REC-xml-names/#xmlReserved
					return NAMESPACE_URI_XML;
					break;
				
				case 'xmlns': // http://www.w3.org/TR/REC-xml-names/#xmlReserved
					return NAMESPACE_URI_XMLNS;
					break;
				
				default:
					switch(this.node.nodeType)
					{
						case 9: // Node.DOCUMENT_NODE
							node = node.documentElement;
							break;
							
						case 1: // Node.ELEMENT_NODE
							// leave as is
							break;
							
						default:
							node = nodeParent(node);
							break;
					}
					
					if (node != null && node.nodeType == 1 /*Node.ELEMENT_NODE*/)
					{
						/**
						 * Check the default namespace
						 *
						 * @see http://www.w3.org/TR/xml-names/#defaulting
						 */
						if ('' == prefix)
						{
							namespace = node.getAttribute('xmlns');
							if (namespace  !== null)
							{
								return namespace;
							}
						} else {
							/**
							 * IE puts all namespaces inside document.namespaces for HTML node
							 *
							 * @see http://msdn.microsoft.com/en-us/library/ms537470(VS.85).aspx
							 * @see http://msdn.microsoft.com/en-us/library/ms535854(v=VS.85).aspx
							 */
							if (node.ownerDocument.documentElement === node && typeof node.ownerDocument.namespaces === 'object')
							{
								for(i=0; i<node.ownerDocument.namespaces.length; i++)
								{
									namespace = node.ownerDocument.namespaces.item(i);
									if (namespace.name == prefix)
									{
										return namespace.urn;
									}
								}
							}
							
							/**
							 * Normal attribute checking for namespace declarations
							 */
							for(i=0; i<node.attributes.length; i++)
							{
								if (!node.attributes[i].specified)
								{
									continue;
								}
								if ('xmlns:' + prefix == node.attributes[i].nodeName)
								{
									return node.attributes[i].nodeValue;
								}
							}
						}
						
						/**
						 * ... resolving the namespaceURI from a given prefix using the
						 * current information available in the node's hierarchy ...
						 *
						 * @see http://www.w3.org/TR/DOM-Level-3-XPath/xpath.html#XPathEvaluator-createNSResolver
						 */
						if (node.ownerDocument.documentElement !== node && node.parentNode)
						{
							// HACK: Maybe replace with a function call and pass in prefix with parentNode
							tmpNode = this.node;
							this.node = node.parentNode;
							namespace = this.lookupNamespaceURI(prefix);
							this.node = tmpNode;
							return namespace;
						}
					}
					return null;
					break;
			}
		}
	}
	
	expressions = {
		'/': function(left, right)
		{
			var type,
				i,
				nodeset,
				nodeset2,
				resultNodeset,
				newContext
			;
			
			// Evaluate left
			if (left === null)
			{
				// A / by itself selects the root node of the document containing the context node.
				nodeset = new NodeSetType([nodeOwnerDocument(this.node)], 'document-order');
			}
			else
			{
				nodeset = evaluateExpressionTree(this, left);
				
				if (!nodeset instanceof NodeSetType)
				{
					throw new Error('Left side of path separator (/) must be of node-set type. (type: ' + nodeset.type + ')');
				}
			}
			
			// Evaluate right with respect to left
			if (right === null)
			{
				resultNodeset = nodeset;
			}
			else
			{
				/**
				 * If it is followed by a relative location path, then the location path selects
				 * the set of nodes that would be selected by the relative location path relative
				 * to the root node of the document containing the context node.
				 */
				
				resultNodeset = new NodeSetType([], 'document-order');
				
				for(i=0; i<nodeset.value.length; i++)
				{
					newContext = this.clone(nodeset.value[i]);
					nodeset2 = evaluateExpressionTree(newContext, right);
				
					if (!nodeset2 instanceof NodeSetType)
					{
						throw new Error('Right side of path separator (/) must be of node-set type. (type: ' + nodeset2.type + ')');
					}
					
					resultNodeset.append(nodeset2);
				}
			}
			
			return resultNodeset;
		},
		
		step: function(axis, nodeTest)
		{
			var nodeset,
				i,
				node,
				nodes,
				qname,
				nodeType,
				expandedName
			;
			
			/*
			 * @ see http://www.w3.org/TR/xpath/#axes
			 */
			switch(axis)
			{
				/*
				 * the child axis contains the children of the context node
				 */
				case 'child':
					nodeset = new NodeSetType(nodeChildren(this.node), 'document-order');
					break;
				
				/*
				 * the descendant axis contains the descendants of the context
				 * node; a descendant is a child or a child of a child and so on;
				 * thus the descendant axis never contains attribute or namespace nodes
				 */
				case 'descendant':
					nodeset = new NodeSetType(nodeDescendant(this.node), 'document-order');
					break;
				
				/*
				 * the parent axis contains the parent of the context node, if there is one
				 */
				case 'parent':
					node = nodeParent(this.node);
					nodeset = new NodeSetType((!node) ? [] : [node], 'document-order');
					break;
				
				/*
				 * the ancestor axis contains the ancestors of the context node; the ancestors
				 * of the context node consist of the parent of context node and the parent's
				 * parent and so on; thus, the ancestor axis will always include the root node,
				 * unless the context node is the root node
				 */
				case 'ancestor':
					nodeset = new NodeSetType(nodeAncestor(this.node), 'reverse-document-order');
					break;
				
				/*
				 * the following-sibling axis contains all the following siblings of the context node;
				 * if the context node is an attribute node or namespace node, the following-sibling axis is empty
				 */
				case 'following-sibling':
					nodeset = new NodeSetType(nodeFollowingSibling(this.node), 'document-order');
					break;
				
				/*
				 * the preceding-sibling axis contains all the preceding siblings of the context node; if the
				 * context node is an attribute node or namespace node, the preceding-sibling axis is empty
				 */
				case 'preceding-sibling':
					nodeset = new NodeSetType(nodePrecedingSibling(this.node), 'reverse-document-order');
					break;
				
				/*
				 * the following axis contains all nodes in the same document as the context node that are after
				 * the context node in document order, excluding any descendants and excluding attribute
				 * nodes and namespace nodes
				 */
				case 'following':
					nodeset = new NodeSetType(nodeFollowing(this.node), 'document-order');
					break;
				
				/*
				 * the preceding axis contains all nodes in the same document as the context node that are before 
				 * the context node in document order, excluding any ancestors and excluding attribute 
				 * nodes and namespace nodes
				 */
				case 'preceding':
					nodeset = new NodeSetType(nodePreceding(this.node), 'reverse-document-order');
					break;
				
				/*
				 * the attribute axis contains the attributes of the context node; the axis will 
				 * be empty unless the context node is an element
				 */
				case 'attribute':
					nodeset = new NodeSetType(nodeAttribute(this.node), 'document-order');
					break;
				
				/*
				 * the namespace axis contains the namespace nodes of the context node; the axis 
				 * will be empty unless the context node is an element
				 */
				case 'namespace':
					nodeset = new NodeSetType(nodeNamespace.call(this, this.node), 'document-order');
					break;
				
				/*
				 * the self axis contains just the context node itself
				 */
				case 'self':
					nodeset = new NodeSetType([this.node], 'document-order');
					break;
				
				/*
				 * the descendant-or-self axis contains the context node and the descendants of the context node
				 */
				case 'descendant-or-self':
					nodes = nodeDescendant(this.node);
					nodes.unshift(this.node);
					nodeset = new NodeSetType(nodes, 'document-order');
					break;
				
				/*
				 * the ancestor-or-self axis contains the context node and the ancestors of the context node; 
				 * thus, the ancestor axis will always include the root node
				 */
				case 'ancestor-or-self':
					nodes = nodeAncestor(this.node);
					nodes.unshift(this.node);
					nodeset = new NodeSetType(nodes, 'reverse-document-order');
					break;
				
				default:
					throw new Error("Axis type not supported: " + axis);
					break;
			}
			
			switch(nodeTest.type)
			{
				case 'nodeType':
					if (nodeTest.args[0] == 'node')
					{
						// leave node as is
						break;
					}
					
					for(i=nodeset.value.length-1; i>=0; i--)
					{
						// TODO-FUTURE: perhaps move the switch outside of the loop
						switch(nodeTest.args[0])
						{
							case 'text':
								if (nodeset.value[i].nodeType != 3 && // text
									nodeset.value[i].nodeType != 4 // cdata
								) {
									nodeset.value.splice(i, 1);
								}
								break;
							
							case 'comment':
								if (nodeset.value[i].nodeType != 8) // comment
								{
									nodeset.value.splice(i, 1);
								}
								break;
							
							case 'processing-instruction':
								if (nodeset.value[i].nodeType != 7 || // processing-instruction
									(nodeTest.args[1].length > 0 &&
										evaluateExpressionTree(this, nodeTest.args[1][0]) != nodeset.value[i].nodeName) // name
								) {
									nodeset.value.splice(i, 1);
								}
								break;
						}
					}
					break;
					
				case 'name':
					qname = evaluateExpressionTree(this, nodeTest);
					
					/**
					 * Every axis has a principal node type. If an axis can contain elements, then the
					 * principal node type is element; otherwise, it is the type of the nodes
					 * that the axis can contain.
					 *
					 * @see http://www.w3.org/TR/xpath/#node-tests
					 */
					switch(axis)
					{
						// For the attribute axis, the principal node type is attribute.
						case 'attribute':
							nodeType = 2;
							break;
						
						// For the namespace axis, the principal node type is namespace.
						case 'namespace':
							nodeType = 13;
							break;
						
						// For other axes, the principal node type is element.
						default:
							nodeType = 1;
							break;
					}
					
					for(i=nodeset.value.length-1; i>=0; i--)
					{
						if (nodeset.value[i].nodeType != nodeType)
						{
							// not of principal node type, so remove node
							nodeset.value.splice(i, 1);
							continue;
						}
						
						// *
						if (qname.ns === null && qname.name === null)
						{
							continue;
						}
						
						// get expanded name
						expandedName = nodeExpandedName.call(this, nodeset.value[i]);
						
						// check namespace
						//alert(expandedName.ns + ' ' + qname.ns + "\r\n" + expandedName.name + ' ' + qname.name);
						if (expandedName === false || expandedName.ns !== qname.ns)
						{
							// namespaces don't match
							nodeset.value.splice(i, 1);
							continue;
						}
						
						// check name
						if (qname.name !== null &&
							// TODO: provide option for case sensitivity
							expandedName.name.toLowerCase() != qname.name.toLowerCase()
						) {
							// names don't match
							nodeset.value.splice(i, 1);
						}
					}
					break;
					
				default:
					throw new Error('NodeTest type not supported in step: ' + nodeTest.type);
					break;
			}
			
			return nodeset;
		},
		
		/**
		 * @see http://www.w3.org/TR/xpath/#predicates
		 */
		predicate: function(axis, expr, predicateExprs)
		{
			var nodeset,
				i,
				result,
				j,
				k,
				length
			;
			
			// Evaluate expression
			nodeset = evaluateExpressionTree(this, expr);
			
			// Ensure we get a node-set
			if (!nodeset instanceof NodeSetType)
			{
				throw new Error('Expected "node-set", got: ' + nodeset.type);
			}
			
			/**
			 * A predicate filters a node-set with respect to an axis to produce a new node-set.
			 */
			switch(axis)
			{
				case 'ancestor':
				case 'ancestor-or-self':
				case 'preceding':
				case 'preceding-sibling':
					nodeset.sortReverseDocumentOrder();
					break;
					
				default:
					nodeset.sortDocumentOrder();
					break;
			}
			
			for (j=0; j<predicateExprs.length; j++)
			{
				/**
				 * For each node in the node-set to be filtered, ...
				 */
				for(i=0,k=1, length=nodeset.value.length; i<nodeset.value.length;k++)
				{
					/**
					 * ... the PredicateExpr is evaluated with that node as the context node, with the
					 * number of nodes in the node-set as the context size, and with the proximity
					 * position of the node in the node-set with respect to the axis as the context
					 * position; if PredicateExpr evaluates to true for that node, the node is
					 * included in the new node-set; otherwise, it is not included.
					 */
					result = evaluateExpressionTree(this.clone(nodeset.value[i], k, length), predicateExprs[j]);
					
					/**
					 * If the result is a number, the result will be converted to true if the number
					 * is equal to the context position and will be converted to false otherwise;
					 */
					if (result instanceof NumberType)
					{
						if (result.value != k)
						{
							nodeset.value.splice(i, 1);
							continue;
						}
					}
					
					/**
					 * if the result is not a number, then the result will be converted as
					 * if by a call to the boolean function.
					 */
					else if (!result.toBoolean())
					{
						nodeset.value.splice(i, 1);
						continue;
					}
					
					i++;
				}
			}

			return nodeset;
		},
		
		/**
		 * @see http://www.w3.org/TR/xpath/#section-Function-Calls
		 */
		'function': function(name, args)
		{
			var qname,
				argVals = [],
				formatName = function(qname)
				{
					return ((qname.ns !== null) ? '{' + qname.ns + '}' : '{}') + qname.name;
				},
				formatFnArgs = function(args)
				{
					var i,
						types = [],
						type
					;
					
					for(i=0; i < args.length; i++)
					{
						type = (args[i].t === undefined) ? 'object' : args[i].t;
						
						if (args[i].r !== false) // required
						{
							if (args[i].rep === true)
							{
								type += '+'; // one or more
							}
						}
						else
						{
							if (args[i].rep === true)
							{
								type += '*'; // zero or more
							}
							else
							{
								type += '?' // optional
							}
						}
						
						types.push(type);
					}
					
					return '(' + types.join(', ') + ')';
				},
				fnInfo,
				i,
				j = 0,
				argTypes = [],
				val
			;
			
			/**
			 * Does the function exist?
			 * TODO-FUTURE: this should be done during createExpression, not evaluate
			 */
			qname = evaluateExpressionTree(this, name);
			
			if (qname.ns === null)
			{
				// since we cannot use null as key
				qname.ns = '';
			}
			
			if (!this.fns[qname.ns] || !this.fns[qname.ns][qname.name])
			{
				throw new Error('Function "' + formatName(qname) + '" does not exist.');
			}
			
			fnInfo = this.fns[qname.ns][qname.name];
			
			/**
			 * Does the supplied number of arguments match what the function expects?
			 * TODO-FUTURE: this should be done during createExpression, not evaluate
			 */
			if (!fnInfo.args) fnInfo.args = [];

			for(i=0, j=0; i < fnInfo.args.length; j++, i++)
			{
				if (args[j] === undefined)
				{
					// no supplied arg
					if (fnInfo.args[i].r !== false) // required
					{
						// not enough supplied args
						throw new Error('Function "' + formatName(qname) + '" expects ' + formatFnArgs(fnInfo.args) + '.');
					}
				}
				else
				{
					// has supplied arg
					argTypes.push(
						(fnInfo.args[i].t === undefined) ? 'object' : fnInfo.args[i].t
					);
				}
				
				if (fnInfo.args[i].rep === true)
				{
					// repeated args
					for(;j < args.length; j++)
					{
						argTypes.push(
							(fnInfo.args[i].t === undefined) ? 'object' : fnInfo.args[i].t
						);
					}
					break;
				}
			}
			
			if (argTypes.length < args.length)
			{
				// too many supplied args
				throw new Error('Function "' + formatName(qname) + '" expects ' + formatFnArgs(fnInfo.args) + '.');
			}
			
			// Evaluate args
			for(i=0; i<args.length; i++)
			{
				// Evaluate expression
				val = evaluateExpressionTree(this, args[i]);
				
				if (argTypes[i] !== 'object' && !val.canConvertTo(argTypes[i]))
				{
					// TODO-FUTURE: supported arg types should be checked during createExpression
					throw new Error('Function "' + formatName(qname) + '" expects ' + formatFnArgs(fnInfo.args) + '.' +
						'Cannot convert "' + val.type + '" to "' + argTypes[i] +'".' );
				}
				
				argVals.push(val);
			}
			
			result = fnInfo.fn.apply(this, argVals);
			
			if (!result instanceof BaseType)
			{
				throw new Error('Function "' + formatName(qname) + '" did not return a value that inherits from BaseType.');
			}
			else if (fnInfo.ret !== 'object' && !result.canConvertTo(fnInfo.ret))
			{
				throw new Error('Function "' + formatName(qname) + '" return "' + result.type + '" type that cannot be converted to "' + fnInfo.ret + '".');
			}
			
			return result;
		},
		
		'|': function(left, right)
		{
			left = evaluateExpressionTree(this, left);
			right = evaluateExpressionTree(this, right);
			
			if (typeof left == 'undefined' ||
				typeof right == 'undefined' ||
				!left instanceof NodeSetType ||
				!right instanceof NodeSetType)
			{
				throw new Error('Unable to perform union on non-"node-set" types.');
			}
			
			left.append(right);
			return left;
		},
		
		/**
		 * An or expression is evaluated by evaluating each operand and converting its value to a boolean
		 * as if by a call to the boolean function. The result is true if either value is true and
		 * false otherwise. The right operand is not evaluated if the left operand evaluates to true.
		 *
		 * @see http://www.w3.org/TR/xpath/#booleans
		 * @return {BooleanType}
		 */
		or: function(left, right)
		{
			if (evaluateExpressionTree(this, left).toBoolean())
			{
				return new BooleanType(true);
			}
			
			return new BooleanType(evaluateExpressionTree(this, right).toBoolean());
		},
		
		/**
		 * An and expression is evaluated by evaluating each operand and converting its value to a boolean
		 * as if by a call to the boolean function. The result is true if both values are true and
		 * false otherwise. The right operand is not evaluated if the left operand evaluates to false.
		 *
		 * @see http://www.w3.org/TR/xpath/#booleans
		 * @return {BooleanType}
		 */
		and: function(left, right)
		{
			if (evaluateExpressionTree(this, left).toBoolean())
			{
				return new BooleanType(evaluateExpressionTree(this, right).toBoolean());
			}
			
			return new BooleanType(false);
		},
		
		'=': function(left, right)
		{
			return compareOperator.call(this, evaluateExpressionTree(this, left), evaluateExpressionTree(this, right), '=', function(left, right) {
				return left == right;
			});
		},
		
		'!=': function(left, right)
		{
			return compareOperator.call(this, evaluateExpressionTree(this, left), evaluateExpressionTree(this, right), '!=', function(left, right) {
				return left != right;
			});
		},
		
		'<=': function(left, right)
		{
			return compareOperator.call(this, evaluateExpressionTree(this, left), evaluateExpressionTree(this, right), '<=', function(left, right) {
				return left <= right;
			});
		},
		
		'<': function(left, right)
		{
			return compareOperator.call(this, evaluateExpressionTree(this, left), evaluateExpressionTree(this, right), '<', function(left, right) {
				return left < right;
			});
		},
		
		'>=': function(left, right)
		{
			return compareOperator.call(this, evaluateExpressionTree(this, left), evaluateExpressionTree(this, right), '>=', function(left, right) {
				return left >= right;
			});
		},
		
		'>': function(left, right)
		{
			return compareOperator.call(this, evaluateExpressionTree(this, left), evaluateExpressionTree(this, right), '>', function(left, right) {
				return left > right;
			});
		},
		
		'+': function(left, right)
		{
			return new NumberType(
				evaluateExpressionTree(this, left).toNumber()
				+
				evaluateExpressionTree(this, right).toNumber()
			);
		},
		
		'-': function(left, right)
		{
			return new NumberType(
				evaluateExpressionTree(this, left).toNumber()
				-
				evaluateExpressionTree(this, right).toNumber()
			);
		},
		
		div: function(left, right)
		{
			return new NumberType(
				evaluateExpressionTree(this, left).toNumber()
				/
				evaluateExpressionTree(this, right).toNumber()
			);
		},
		
		mod: function(left, right)
		{
			return new NumberType(
				evaluateExpressionTree(this, left).toNumber()
				%
				evaluateExpressionTree(this, right).toNumber()
			);
		},
		
		'*': function(left, right)
		{
			return new NumberType(
				evaluateExpressionTree(this, left).toNumber()
				*
				evaluateExpressionTree(this, right).toNumber()
			);
		},
		
		/**
		 * @param {String} string
		 * @return {String}
		 */
		string: function(string)
		{
			return new StringType(string);
		},
		
		/**
		 * @param {Number} number
		 * @return {Number}
		 */
		number: function(number)
		{
			return new NumberType(number);
		},
		
		'$': function(name)
		{
			throw new Error("TODO: Not implemented.16");
		},
		
		/**
		 * @param {String} ns
		 * @param {String} name
		 * @return {Object}
		 */
		name: function(prefix, name)
		{
			var ns = null;
			
			if (prefix !== null)
			{
				ns = this.nsMap[prefix];
				if (!ns)
				{
					throw new Error('Namespace prefix "' + prefix + '" is not mapped to a namespace.');
				}
			}
			
			return {
				ns: ns,
				name: name
			};
		}
	}
	
	functions = {
		/**
		 * Core Function Library
		 *
		 * This section describes functions that XPath implementations must always include in the function library that is used to evaluate expressions.
		 * Each function in the function library is specified using a function prototype, which gives the return type, the name of the function, and the type of the arguments. If an argument type is followed by a question mark, then the argument is optional; otherwise, the argument is required.
		 */
		'' : {
			// Node Set Functions
			
			last: {
				/**
				 * The last function returns a number equal to the context size from the expression evaluation context.
				 *
				 * @see http://www.w3.org/TR/xpath/#function-last
				 * @return {NumberType}
				 */
				fn: function()
				{
					return new NumberType(this.size);
				},
				
				ret: 'number'
			},
			
			position: {
				/**
				 * The position function returns a number equal to the context position from the expression evaluation context.
				 *
				 * @see http://www.w3.org/TR/xpath/#function-position
				 * @return {NumberType}
				 */
				fn: function()
				{
					return new NumberType(this.pos);
				},
				
				ret: 'number'
			},
			
			count: {
				/**
				 * The count function returns the number of nodes in the argument node-set.
				 *
				 * @see http://www.w3.org/TR/xpath/#function-count
				 * @param {NodeSetType} nodeset
				 * @return {NumberType}
				 */
				fn: function(nodeset)
				{
					return new NumberType(nodeset.toNodeSet().length);
				},
				
				args: [
					{t: 'node-set'}
				],
				
				ret: 'number'
			},
			
			id: {
				/**
				 * The id function selects elements by their unique ID.
				 *
				 * @see http://www.w3.org/TR/xpath/#function-id
				 * @param {BaseType} object
				 * @return {NodeSetType}
				 */
				fn: function(object)
				{
					var context = this,
						ids = [],
						i,
						j,
						node,
						nodes = [],
						value,
						splitStringByWhitespace = function(str)
						{
							var i,
								// split string by whitespace (#x20 | #x9 | #xD | #xA)+
								chunks = str.split(/[\u0020\u0009\u000D\u000A]+/)
							;
							
							for(i = chunks.length - 1; i >= 0; i--)
							{
								// trim left/right
								if (chunks[i].length == 0)
								{
									chunks.splice(i, 1);
								}
							}
							
							return chunks;
						}
					;
					
					if (object instanceof NodeSetType)
					{
						/**
						 * When the argument to id is of type node-set, then the result is the
						 * union of the result of applying id to the string-value of
						 * each of the nodes in the argument node-set.
						 */
						for(i=0; i<object.value.length; i++)
						{
							ids.push.apply(ids, splitStringByWhitespace(nodeStringValue(object.value[i])));
						}
					}
					else
					{
						/**
						 * When the argument to id is of any other type, the argument is
						 * converted to a string as if by a call to the string function
						 */
						object = object.toString();
						
						/**
						 * the string is split into a whitespace-separated list of tokens
						 */
						
						// split string by whitespace (#x20 | #x9 | #xD | #xA)+
						ids = splitStringByWhitespace(object);
					}
					
					// remove duplicate ids
					for(i=ids.length-1; i>=0; i--)
					{
						for(j=i-1; j >= 0; j--)
						{
							if (ids[i] == ids[j] && i != j)
							{
								ids.splice(i, 1);
								break;
							}
						}
					}
					
					/**
					 * the result is a node-set containing the elements in the same document
					 * as the context node that have a unique ID equal to any of the tokens in the list.
					 *
					 * An element node may have a unique identifier (ID). This is the value of the
					 * attribute that is declared in the DTD as type ID.
					 */
					for(i=0; i<ids.length; i++)
					{
						node = nodeOwnerDocument(this.node).getElementById(ids[i]);
						
						if (node)
						{
							// ensure that this node does indeed have a valid id attibute in namespace scope
							if (nodeIdAttribute.call(this, node))
							{
								nodes.push(node);
								continue;
							}
						}
						
						// node not found by id, need to search manually
						nodeAttributeSearch(nodeOwnerDocument(this.node), true, function(element, attribute) {
							
							var idAttribute = nodeIdAttribute.call(context, element, attribute);
							
							if (idAttribute && idAttribute.nodeValue == ids[i])
							{
								nodes.push(element);
								return true;
							}
						});
					}
					
					return new NodeSetType(nodes);
				},
				
				args: [
					{}
				],
				
				ret: 'node-set'
			},
			
			'local-name': {
				/**
				 * The local-name function returns the local part of the expanded-name
				 * of the node in the argument node-set that is first in document order.
				 *
				 * @see http://www.w3.org/TR/xpath/#function-local-name
				 * @param {NodeSetType} nodeset
				 * @return {StringType}
				 */
				fn: function(nodeset)
				{
					var qname,
						localName = ''
					;
					
					/**
					 * If the argument is omitted, it defaults to a node-set with the context node as its only member.
					 */
					if (arguments.length == 0)
					{
						nodeset = new NodeSetType([this.node]);
					}
					
					/**
					 * If the argument node-set is empty or the first node has no expanded-name, an empty string is returned.
					 */
					if (nodeset.toNodeSet().length > 0)
					{
						nodeset.sortDocumentOrder();
						qname = nodeExpandedName.call(this, nodeset.value[0]);
						
						if (qname !== false)
						{
							localName = qname.name;
						}
					}
					
					return new StringType(localName);
				},
				
				args: [
					{t: 'node-set', r: false}
				],
				
				ret: 'string'
			},
			
			'namespace-uri': {
				/**
				 * The namespace-uri function returns the namespace URI of the expanded-name
				 * of the node in the argument node-set that is first in document order.
				 *
				 * The string returned by the namespace-uri function will be empty
				 * except for element nodes and attribute nodes.
				 *
				 * @see http://www.w3.org/TR/xpath/#function-namespace-uri
				 * @param {NodeSetType} nodeset
				 * @return {StringType}
				 */
				fn: function(nodeset)
				{
					var qname,
						namespaceURI = ''
					;
					
					/**
					 * If the argument is omitted, it defaults to a node-set with the context node as its only member.
					 */
					if (arguments.length == 0)
					{
						nodeset = new NodeSetType([this.node]);
					}
					
					/**
					 * If the argument node-set is empty, the first node has no expanded-name,
					 * or the namespace URI of the expanded-name is null, an empty string is returned.
					 */
					if (nodeset.toNodeSet().length > 0)
					{
						nodeset.sortDocumentOrder();
						qname = nodeExpandedName.call(this, nodeset.value[0]);
						
						if (qname !== false && qname.ns !== null)
						{
							namespaceURI = qname.ns;
						}
					}
					
					return new StringType(namespaceURI);
				},
				
				args: [
					{t: 'node-set', r: false}
				],
				
				ret: 'string'
			},
			
			name: {
				/**
				 * The name function returns a string containing a QName representing the expanded-name
				 * of the node in the argument node-set that is first in document order.
				 *
				 * The string returned by the name function will be the same as the string returned
				 * by the local-name function except for element nodes and attribute nodes.
				 *
				 * @see http://www.w3.org/TR/xpath/#function-name
				 * @param {NodeSetType} nodeset
				 * @param {StringType}
				 */
				fn: function(nodeset)
				{
					var qname,
						name = ''
					;
					
					/**
					 * If the argument is omitted, it defaults to a node-set with the context node as its only member.
					 */
					if (arguments.length == 0)
					{
						nodeset = new NodeSetType([this.node]);
					}
					
					if (nodeset.toNodeSet().length > 0)
					{
						nodeset.sortDocumentOrder();
						qname = nodeExpandedName.call(this, nodeset.value[0]);
						
						if (qname !== false)
						{
							name = (qname.prefix && qname.prefix.length > 0)
								? qname.prefix + ':' + qname.name
								: qname.name
							;
						}
					}
					
					return new StringType(name);
				},
				
				args: [
					{t: 'node-set', r: false}
				],
				
				ret: 'string'
			},
			
			// String functions
			
			string: {
				/**
				 * The string function converts an object to a string.
				 *
				 * @see http://www.w3.org/TR/xpath/#function-string
				 * @param {BaseType} object
				 * @return {StringType}
				 */
				fn: function(object)
				{
					/**
					 * If the argument is omitted, it defaults to a node-set with the context node as its only member.
					 */
					if (arguments.length == 0)
					{
						object = new NodeSetType([this.node], 'document-order');
					}
					
					return new StringType(object.toString());
				},
				
				args: [
					{t: 'object', r: false}
				],
				
				ret: 'string'
			},
			
			concat: {
				/**
				 * The concat function returns the concatenation of its arguments.
				 *
				 * @see http://www.w3.org/TR/xpath/#function-concat
				 * @param {StringType} str1
				 * @param {StringType} str2
				 * @return {StringType}
				 */
				fn: function(str1, str2 /*, str3 ... */)
				{
					var i,
						value = ''
					;
					
					for(i=0; i < arguments.length; i++)
					{
						value += arguments[i].toString();
					}
					
					return new StringType(value);
				},
				
				args: [
					{t: 'string'},
					{t: 'string'},
					{t: 'string', r: false, rep: true}
				],
				
				ret: 'string'
			},
			
			'starts-with': {
				/**
				 * The starts-with function returns true if the first argument string
				 * starts with the second argument string, and otherwise returns false.
				 *
				 * @see http://www.w3.org/TR/xpath/#function-starts-with
				 * @param {StringType} haystack
				 * @param {StringType} needle
				 * @return {StringType}
				 */
				fn: function(haystack, needle)
				{
					return new BooleanType(haystack.toString().substr(0, (needle = needle.toString()).length) == needle);
				},
				
				args: [
					{t: 'string'},
					{t: 'string'}
				],
				
				ret: 'string'
			},
			
			contains: {
				/**
				 * The contains function returns true if the first argument string
				 * contains the second argument string, and otherwise returns false.
				 *
				 * @see http://www.w3.org/TR/xpath/#function-contains
				 * @param {StringType} haystack
				 * @param {StringType} needle
				 * @return {StringType}
				 */
				fn: function(haystack, needle)
				{
					return new BooleanType(haystack.toString().indexOf(needle = needle.toString()) != -1);
				},
				
				args: [
					{t: 'string'},
					{t: 'string'}
				],
				
				ret: 'string'
			},
			
			'substring-before': {
				/**
				 * The substring-before function returns the substring of the first argument
				 * string that precedes the first occurrence of the second argument string
				 * in the first argument string, or the empty string if the first argument
				 * string does not contain the second argument string.
				 *
				 * @see http://www.w3.org/TR/xpath/#function-substring-before
				 * @param {StringType} haystack
				 * @param {StringType} needle
				 * @return {StringType}
				 */
				fn: function(haystack, needle)
				{
					haystack = haystack.toString();
					needle = haystack.indexOf(needle.toString());
					return new StringType(needle == -1 ?  '' : haystack.substr(0, needle));
				},
				
				args: [
					{t: 'string'},
					{t: 'string'}
				],
				
				ret: 'string'
			},
			
			'substring-after': {
				/**
				 * The substring-after function returns the substring of the first argument
				 * string that follows the first occurrence of the second argument string
				 * in the first argument string, or the empty string if the first argument
				 * string does not contain the second argument string.
				 *
				 * @see http://www.w3.org/TR/xpath/#function-substring-after
				 * @param {StringType} haystack
				 * @param {StringType} needle
				 * @return {StringType}
				 */
				fn: function(haystack, needle)
				{
					var pos;
					
					haystack = haystack.toString();
					needle = needle.toString();
					pos = haystack.indexOf(needle);
					
					return new StringType(pos == -1 ?  '' : haystack.substr(pos + needle.length));
				},
				
				args: [
					{t: 'string'},
					{t: 'string'}
				],
				
				ret: 'string'
			},
			
			substring: {
				/**
				 * The substring function returns the substring of the first argument
				 * starting at the position specified in the second argument
				 * with length specified in the third argument.
				 *
				 * @see http://www.w3.org/TR/xpath/#function-substring
				 * @param {StringType} str
				 * @param {NumberType} start
				 * @param {NumberType} length
				 * @return {StringType}
				 */
				fn: function(str, start, length)
				{
					str = str.toString();
					
					start = Math.round(start.toNumber()) - 1;
					
					return new StringType(
						isNaN(start)
							? ''
							: ((arguments.length == 2)
								? str.substring(start < 0 ? 0 : start)
								: str.substring(start < 0 ? 0 : start, start + Math.round(length.toNumber()))
							)
					);
				},
				
				args: [
					{t: 'string'},
					{t: 'number'},
					{t: 'number', r: false}
				],
				
				ret: 'string'
			},
			
			'string-length': {
				/**
				 * The string-length returns the number of characters in the string.
				 *
				 * @see http://www.w3.org/TR/xpath/#function-string-length
				 * @param {StringType} str
				 * @return {NumberType}
				 */
				fn: function(str)
				{
					str = (arguments.length == 0)
						? nodeStringValue(this.node)
						: str.toString()
					;
					return new NumberType(str.length);
				},
				
				args: [
					{t: 'string', r: false}
				],
				
				ret: 'number'
			},
			
			'normalize-space': {
				/**
				 * The normalize-space function returns the argument string with whitespace
				 * normalized by stripping leading and trailing whitespace and replacing
				 * sequences of whitespace characters by a single space.
				 *
				 * @see http://www.w3.org/TR/xpath/#function-normalize-space
				 * @param {StringType} str
				 * @return {StringType}
				 */
				fn: function(str)
				{
					str = (arguments.length == 0)
						? nodeStringValue(this.node)
						: str.toString()
					;
					return new StringType(str.replace(/^[\u0020\u0009\u000D\u000A]+/,'').replace(/[\u0020\u0009\u000D\u000A]+$/,'').replace(/[\u0020\u0009\u000D\u000A]+/g, ' '));
				},
				
				args: [
					{t: 'string', r: false}
				],
				
				ret: 'string'
			},
							
			translate: {
				/**
				 * The translate function returns the first argument string with occurrences
				 * of characters in the second argument string replaced by the character
				 * at the corresponding position in the third argument string.
				 *
				 * @see http://www.w3.org/TR/xpath/#function-normalize-space
				 * @param {StringType} haystack
				 * @param {StringType} search
				 * @param {StringType} replace
				 * @return {StringType}
				 */
				fn: function(haystack, search, replace)
				{
					var result = '',
						i,
						j,
						x
					;
					
					haystack = haystack.toString();
					search = search.toString();
					replace = replace.toString();
					
					for(i = 0; i < haystack.length; i++)
					{
						if ((j = search.indexOf(x = haystack.charAt(i))) == -1 ||
							(x = replace.charAt(j)))
							result += x;
					}
					
					return new StringType(result);
				},
				
				args: [
					{t: 'string'},
					{t: 'string'},
					{t: 'string'}
				],
				
				ret: 'string'
			},
			
			// Boolean Functions
			
			'boolean': {
				/**
				 * The boolean function converts its argument to a boolean.
				 *
				 * @see http://www.w3.org/TR/xpath/#function-boolean
				 * @param {BaseType}
				 * @return {BooleanType} 
				 */
				fn: function(object)
				{
					return new BooleanType(object.toBoolean());
				},
				
				args: [
					{r: true}
				],
				
				ret: 'boolean'
			},
			
			not: {
				/**
				 * The not function returns true if its argument is false, and false otherwise.
				 *
				 * @see http://www.w3.org/TR/xpath/#function-not
				 * @param {BooleanType}
				 * @return {BooleanType} 
				 */
				fn: function(bool)
				{
					return new BooleanType(!bool.toBoolean());
				},
				
				args: [
					{t: 'boolean'}
				],
				
				ret: 'boolean'
			},
			
			'true': {
				/**
				 * The true function returns true.
				 *
				 * @see http://www.w3.org/TR/xpath/#function-true
				 * @return {BooleanType} 
				 */
				fn: function()
				{
					return new BooleanType(true);
				},
				
				ret: 'boolean'
			},
			
			'false': {
				/**
				 * The false function returns false.
				 *
				 * @see http://www.w3.org/TR/xpath/#function-false
				 * @return {BooleanType} 
				 */
				fn: function()
				{
					return new BooleanType(false);
				},
				
				ret: 'boolean'
			},
			
			/**
			 * The lang function returns true or false depending on whether the language
			 * of the context node as specified by xml:lang attributes is the same
			 * as or is a sublanguage of the language specified by the argument string.
			 *
			 * @see http://www.w3.org/TR/xpath/#function-lang
			 * @param {StringType}
			 * @return {BooleanType} 
			 */
			lang: {
				fn: function(string)
				{
					var node = this.node,
						attributes,
						attributeName,
						attributeValueParts,
						langParts = string.toString().toLowerCase().split('-'),
						namespaceNodes,
						i,
						j,
						partsEqual
					;
					
					for(;node.nodeType != 9; node = nodeParent(node)) // document node
					{
						attributes = nodeAttribute(node);
						
						for(i = 0; i < attributes.length; i++)
						{
							// parse attribute name and namespace prefix
							attributeName = attributes[i].nodeName.split(':');
							if (attributeName.length === 1)
							{
								// set default namespace
								attributeName[1] = attributeName[0];
								attributeName[0] = '';
							}
							
							// compare attribute name
							if (attributeName[1] == 'lang')
							{
								attributeValueParts = attributes[i].nodeValue.toLowerCase().split('-');
								
								if (attributeValueParts.length < langParts.length)
									continue;
								
								// compare attribute value
								partsEqual = true;
								for(j=0; j < langParts.length; j++)
								{
									if (langParts[j] != attributeValueParts[j])
									{
										partsEqual = false;
										break;
									}
								}
								
								if (partsEqual)
								{
									// ensure xml namespace
									namespaceNodes = nodeNamespace.call(this, node);
									
									for(j=0; j < namespaceNodes.length; j++)
									{
										if(namespaceNodes[j].prefix == attributeName[0]
											&& namespaceNodes[j].nodeValue == NAMESPACE_URI_XML)
										{
											return new BooleanType(true);
										}
									}
								}
							}
						}
					}
					
					return new BooleanType(false);
				},
				
				args: [
					{t: 'string'}
				],
				
				ret: 'boolean'
			},
			
			// Number Functions
			
			number: {
				/**
				 * The number function converts its argument to a number.
				 *
				 * @see http://www.w3.org/TR/xpath/#function-number
				 * @param {BaseType} object
				 * @return {NumberType}
				 */
				fn: function(object)
				{
					/**
					 * If the argument is omitted, it defaults to a node-set with the context node as its only member.
					 */
					if (arguments.length == 0)
					{
						object = new NodeSetType([this.node], 'document-order');
					}
					
					return new NumberType(object.toNumber());
				},
				
				args: [
					{t: 'object', r: false}
				],
				
				ret: 'number'
			},
			
			sum: {
				/**
				 * The sum function returns the sum, for each node in the argument node-set,
				 * of the result of converting the string-values of the node to a number.
				 *
				 * @see http://www.w3.org/TR/xpath/#function-sum
				 * @param {NodeSetType} 
				 * @return {NumberType}
				 */
				fn: function(nodeset)
				{
					var i,
						sum = 0;
					;
					
					nodeset = nodeset.toNodeSet();
					
					for(i = 0; i < nodeset.length; i++)
					{
						sum += (new StringType(nodeStringValue(nodeset[i]))).toNumber();
					}
					
					return new NumberType(sum);
				},
				
				args: [
					{t: 'node-set'}
				],
				
				ret: 'number'
			},
			
			floor: {
				/**
				 * The floor function returns the largest (closest to positive infinity)
				 * number that is not greater than the argument and that is an integer.
				 *
				 * @see http://www.w3.org/TR/xpath/#function-floor
				 * @param {NumberType} 
				 * @return {NumberType}
				 */
				fn: function(number)
				{
					return new NumberType(Math.floor(number));
				},
				
				args: [
					{t: 'number'}
				],
				
				ret: 'number'
			},
			
			ceiling: {
				/**
				 * The ceiling function returns the smallest (closest to negative infinity)
				 * number that is not less than the argument and that is an integer.
				 *
				 * @see http://www.w3.org/TR/xpath/#function-ceiling
				 * @param {NumberType} 
				 * @return {NumberType}
				 */
				fn: function(number)
				{
					return new NumberType(Math.ceil(number));
				},
				
				args: [
					{t: 'number'}
				],
				
				ret: 'number'
			},
			
			round: {
				/**
				 * The round function returns the number that is closest
				 * to the argument and that is an integer.
				 *
				 * @see http://www.w3.org/TR/xpath/#function-round
				 * @param {NumberType} 
				 * @return {NumberType}
				 */
				fn: function(number)
				{
					return new NumberType(Math.round(number));
				},
				
				args: [
					{t: 'number'}
				],
				
				ret: 'number'
			}
		}
	};
	
	/**
	 * Evaluate parsed expression tree.
	 *
	 * @param {Object} context
	 * @param {Object} tree
	 * @return {Object}
	 */
	evaluateExpressionTree = function(context, tree)
	{
		if (typeof expressions[tree.type] != 'function')
		{
			throw new Error('Internal Error: Expression type does not exist: ' + tree.type);
		}
		
		return expressions[tree.type].apply(context, tree.args)
	}
	
	/**
	 * The XPathResult interface represents the result of the evaluation of a
	 * XPath 1.0 expression within the context of a particular node. Since
	 * evaluation of an XPath expression can result in various result types,
	 * this object makes it possible to discover and manipulate the type
	 * and value of the result.
	 *
	 * @see http://www.w3.org/TR/DOM-Level-3-XPath/xpath.html#XPathResult
	 *
	 * @param {Context} context
	 * @param {Number} type
	 * @param {BaseType} value
	 */
	XPathResult = function(context, type, value)
	{
		switch(type)
		{
			case XPathResult.NUMBER_TYPE:
				this.resultType = XPathResult.NUMBER_TYPE;
				this.numberValue = value.toNumber();
				break;
				
			case XPathResult.STRING_TYPE:
				this.resultType = XPathResult.STRING_TYPE;
				this.stringValue = value.toString();
				break;
			
			case XPathResult.BOOLEAN_TYPE:
				this.resultType = XPathResult.BOOLEAN_TYPE;
				this.booleanValue = value.toBoolean();
				break;
			
			case XPathResult.UNORDERED_NODE_ITERATOR_TYPE:
			case XPathResult.ORDERED_NODE_ITERATOR_TYPE:
			case XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE:
			case XPathResult.ORDERED_NODE_SNAPSHOT_TYPE:
			case XPathResult.ANY_UNORDERED_NODE_TYPE:
			case XPathResult.FIRST_ORDERED_NODE_TYPE:
				if (!value instanceof NodeSetType)
				{
					throw new Error('Expected result of type "node-set", got: "' + value.type + '"');
				}
				
				this.resultType = type;
				
				switch(type)
				{
					case XPathResult.UNORDERED_NODE_ITERATOR_TYPE:
					case XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE:
						this._value = value.toNodeSet();
						this.snapshotLength = this._value.length;
						break;
					
					case XPathResult.ORDERED_NODE_ITERATOR_TYPE:
					case XPathResult.ORDERED_NODE_SNAPSHOT_TYPE:
						// ensure in document order
						value.sortDocumentOrder();
						
						this._value = value.toNodeSet();
						this.snapshotLength = this._value.length;
						break;
					
					case XPathResult.ANY_UNORDERED_NODE_TYPE:
						value = value.toNodeSet();
						this.singleNodeValue = (value.length) ? value[0] : null;
						break;
					
					case XPathResult.FIRST_ORDERED_NODE_TYPE:
						// ensure in document order
						value.sortDocumentOrder();
						value = value.toNodeSet();
						this.singleNodeValue = (value.length) ? value[0] : null;
						break;
					
					default:
						throw new XPathException(XPathException.TYPE_ERR, 'XPath result type not supported. (type: ' + type + ')');
						break;
				}
				
				break;
			
			default:
				throw new XPathException(XPathException.TYPE_ERR, 'XPath result type not supported. (type: ' + type + ')');
				break;
		};
	}
	
	XPathResult.factory = function(context, type, value)
	{
		var result;
		
		if (type !== XPathResult.ANY_TYPE)
		{
			return new XPathResult(context, type, value);
		}
		
		// handle any type result
		if (value instanceof NodeSetType)
		{
			result = new XPathResult(context, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, value);
		}
		else if (value instanceof NumberType)
		{
			result = new XPathResult(context, XPathResult.NUMBER_TYPE, value);
		}
		else if (value instanceof BooleanType)
		{
			result = new XPathResult(context, XPathResult.BOOLEAN_TYPE, value);
		}
		else if (value instanceof StringType)
		{
			result = new XPathResult(context, XPathResult.STRING_TYPE, value);
		}
		else
		{
			throw new XPathException(XPathException.TYPE_ERR, 'Internal Error: Unsupported value type: ' + typeof value);
		}
		
		return result;
	}
	
	XPathResult.prototype = {
		/**
		 * A code representing the type of this result, as defined by the type constants.
		 *
		 * @see http://www.w3.org/TR/DOM-Level-3-XPath/xpath.html#XPathResult-resultType
		 * @type {number}
		 */
		resultType: null,
		
		/**
		 * The value of this number result.
		 *
		 * @see http://www.w3.org/TR/DOM-Level-3-XPath/xpath.html#XPathResult-numberValue
		 * @type {number}
		 */
		numberValue: null,
		
		/**
		 * The value of this string result.
		 *
		 * @see http://www.w3.org/TR/DOM-Level-3-XPath/xpath.html#XPathResult-stringValue
		 * @type {String}
		 */
		stringValue: null,
		
		/**
		 * The value of this boolean result.
		 *
		 * @see http://www.w3.org/TR/DOM-Level-3-XPath/xpath.html#XPathResult-booleanValue
		 * @type {boolean}
		 */
		booleanValue: null,
		
		/**
		 * The value of this single node result, which may be null.
		 *
		 * @see http://www.w3.org/TR/DOM-Level-3-XPath/xpath.html#XPathResult-singleNodeValue
		 * @type {Node}
		 */
		singleNodeValue: null,
		
		/**
		 * Signifies that the iterator has become invalid. True if resultType is
		 * UNORDERED_NODE_ITERATOR_TYPE or ORDERED_NODE_ITERATOR_TYPE and the
		 * document has been modified since this result was returned.
		 *
		 * @see http://www.w3.org/TR/DOM-Level-3-XPath/xpath.html#XPathResult-invalid-iterator-state
		 * @type {boolean}
		 */
		invalidIteratorState: null,
		
		/**
		 * The number of nodes in the result snapshot.
		 *
		 * @see http://www.w3.org/TR/DOM-Level-3-XPath/xpath.html#XPathResult-snapshot-length
		 * @type {number}
		 */
		snapshotLength: null,
		
		_iteratorIndex: 0,
		
		iterateNext: function()
		{
			if (
				this.resultType != XPathResult.UNORDERED_NODE_ITERATOR_TYPE &&
				this.resultType != XPathResult.ORDERED_NODE_ITERATOR_TYPE
			) {
				throw new XPathException(XPathException.TYPE_ERR, 'iterateNext() method may only be used with results of type UNORDERED_NODE_ITERATOR_TYPE or ORDERED_NODE_ITERATOR_TYPE');
			}
			
			if (this._iteratorIndex < this._value.length)
			{
				return this._value[this._iteratorIndex++];
			}
			
			return null;
		},
		
		snapshotItem: function(index)
		{
			if (
				this.resultType != XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE &&
				this.resultType != XPathResult.ORDERED_NODE_SNAPSHOT_TYPE
			) {
				throw new XPathException(XPathException.TYPE_ERR, 'snapshotItem() method may only be used with results of type UNORDERED_NODE_SNAPSHOT_TYPE or ORDERED_NODE_SNAPSHOT_TYPE');
			}
			
			return this._value[index];
		}
	}
	
	/**
	 * XPathResultType
	 *
	 * An integer indicating what type of result this is.
	 *
	 * If a specific type is specified, then the result will be returned as the corresponding
	 * type, using XPath type conversions where required and possible.
	 */
	
	XPathResult.ANY_TYPE = 0;
	XPathResult.NUMBER_TYPE = 1;
	XPathResult.STRING_TYPE = 2;
	XPathResult.BOOLEAN_TYPE = 3;
	XPathResult.UNORDERED_NODE_ITERATOR_TYPE = 4;
	XPathResult.ORDERED_NODE_ITERATOR_TYPE = 5;
	XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE = 6;
	XPathResult.ORDERED_NODE_SNAPSHOT_TYPE = 7;
	XPathResult.ANY_UNORDERED_NODE_TYPE = 8;
	XPathResult.FIRST_ORDERED_NODE_TYPE = 9;
	
	/**
	 * The XPathNamespace interface is returned by XPathResult interfaces to
	 * represent the XPath namespace node type that DOM lacks. There is no public
	 * constructor for this node type. Attempts to place it into a hierarchy or a
	 * NamedNodeMap result in a DOMException with the code HIERARCHY_REQUEST_ERR.
	 * This node is read only, so methods or setting of attributes that would
	 * mutate the node result in a DOMException with the code NO_MODIFICATION_ALLOWED_ERR.
	 *
	 * @see http://www.w3.org/TR/DOM-Level-3-XPath/xpath.html#XPathNamespace
	 * @param {string} prefix Prefix of the namespace represented by the node.
	 * @param {string} namespaceURI Namespace URI of the namespace represented by the node.
	 * @param {Element} ownerElement The Element on which the namespace was in scope when it was requested.
	 */
	XPathNamespace = function(prefix, namespaceURI, ownerElement)
	{
		if(ownerElement.nodeType != 1)
		{
			throw new Error('Internal Error: XPathNamespace owner element must be an Element node.');
		}
		this.ownerElement = ownerElement;
		
		// ownerDocument matches the ownerDocument of the ownerElement even if the element is later adopted.
		// TODO-FUTURE: ownerDocument == ownerElement.ownerDocument when ownerElement changes ownerDocument
		this.ownerDocument = ownerElement.ownerDocument;
		
		// nodeName is always the string "#namespace".
		this.nodeName = '#namespace';
		
		// prefix is the prefix of the namespace represented by the node.
		this.prefix = prefix;
		
		// localName is the same as prefix.
		this.localName = prefix;
		
		// nodeType is equal to XPATH_NAMESPACE_NODE.
		this.nodeType = XPathNamespace.XPATH_NAMESPACE_NODE
		
		// namespaceURI is the namespace URI of the namespace represented by the node.
		this.namespaceURI = namespaceURI;
		
		// nodeValue is the same as namespaceURI.
		this.nodeValue = namespaceURI;
		
		// adoptNode, cloneNode, and importNode fail on this node type by raising a DOMException with the code NOT_SUPPORTED_ERR.
		// TODO-FUTURE: implement exceptions above, see: http://www.w3.org/TR/DOM-Level-3-Core/
		
		// TODO-FUTURE: find all other attributes of Node not set above, and set the to null or false
		// see: http://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-1950641247
	}
	
	/**
	 * An integer indicating which type of node this is.
	 *
	 * Note: There is currently only one type of node which is specific to XPath. The numbers in this list must not collide with the values assigned to core node types.
	 * 
	 * @see http://www.w3.org/TR/DOM-Level-3-XPath/xpath.html#XPATH_NAMESPACE_NODE
	 * @property {number} The node is a Namespace.
	 */
	XPathNamespace.XPATH_NAMESPACE_NODE = 13;
	
	module = {
		XPathException: XPathException,
		XPathEvaluator: XPathEvaluator,
		XPathNSResolver: XPathNSResolver,
		XPathExpression: XPathExpression,
		XPathResult: XPathResult,
		XPathNamespace: XPathNamespace,
		
		/**
		 * Get the current list of DOM Level 3 XPath window and document objects
		 * that are in use.
		 *
		 * @return {Object} List of DOM Level 3 XPath window and document objects
		 *         that are currently in use.
		 */
		getCurrentDomLevel3XPathBindings: function()
		{
			return {
				'window': {
					XPathException: window.XPathException,
					XPathExpression: window.XPathExpression,
					XPathNSResolver: window.XPathNSResolver,
					XPathResult: window.XPathResult,
					XPathNamespace: window.XPathNamespace
				},
				'document': {
					createExpression: document.createExpression,
					createNSResolver: document.createNSResolver,
					evaluate: document.evaluate
				}
			}
		},
		
		/**
		 * Get the list of DOM Level 3 XPath objects that are implemented by
		 * the XPathJS module.
		 *
		 * @return {Object} List of DOM Level 3 XPath objects implemented by
		 *         the XPathJS module.
		 */
		createDomLevel3XPathBindings: function(options)
		{
			var evaluator = new XPathEvaluator(options)
			;
			
			return {
				'window': {
					XPathException: XPathException,
					XPathExpression: XPathExpression,
					XPathNSResolver: XPathNSResolver,
					XPathResult: XPathResult,
					XPathNamespace: XPathNamespace
				},
				'document': {
					createExpression: function() {
						return evaluator.createExpression.apply(evaluator, arguments);
					},
					createNSResolver: function() {
						return evaluator.createNSResolver.apply(evaluator, arguments);
					},
					evaluate: function() {
						return evaluator.evaluate.apply(evaluator, arguments);
					}
				}
			}
		},
		
		/**
		 * Bind DOM Level 3 XPath interfaces to the DOM.
		 *
		 * @param {Object} bindings List of new DOM Level 3 XPath objects and functions
		 *         that will replace the existing ones. If empty,
		 *         createDomLevel3XPathBindings() will be used.
		 * @return List of original DOM Level 3 XPath objects that has been replaced
		 */
		bindDomLevel3XPath: function(bindings)
		{
			var newBindings = (bindings || module.createDomLevel3XPathBindings()),
				currentBindings = module.getCurrentDomLevel3XPathBindings(),
				i
			;
			
			for(i in newBindings['window'])
			{
				window[i] = newBindings['window'][i];
			}
			
			for(i in newBindings['document'])
			{
				document[i] = newBindings['document'][i];
			}
			
			return currentBindings;
		}
	}
	
	return module;
	
})();
XPathJS._parser = (function(){
  /*
   * Generated by PEG.js 0.7.0.
   *
   * http://pegjs.majda.cz/
   */
  
  function quote(s) {
    /*
     * ECMA-262, 5th ed., 7.8.4: All characters may appear literally in a
     * string literal except for the closing quote character, backslash,
     * carriage return, line separator, paragraph separator, and line feed.
     * Any character may appear in the form of an escape sequence.
     *
     * For portability, we also escape escape all control and non-ASCII
     * characters. Note that "\0" and "\v" escape sequences are not used
     * because JSHint does not like the first and IE the second.
     */
     return '"' + s
      .replace(/\\/g, '\\\\')  // backslash
      .replace(/"/g, '\\"')    // closing quote character
      .replace(/\x08/g, '\\b') // backspace
      .replace(/\t/g, '\\t')   // horizontal tab
      .replace(/\n/g, '\\n')   // line feed
      .replace(/\f/g, '\\f')   // form feed
      .replace(/\r/g, '\\r')   // carriage return
      .replace(/[\x00-\x07\x0B\x0E-\x1F\x80-\uFFFF]/g, escape)
      + '"';
  }
  
  var result = {
    /*
     * Parses the input with a generated parser. If the parsing is successfull,
     * returns a value explicitly or implicitly specified by the grammar from
     * which the parser was generated (see |PEG.buildParser|). If the parsing is
     * unsuccessful, throws |PEG.parser.SyntaxError| describing the error.
     */
    parse: function(input, startRule) {
      var parseFunctions = {
        "XPath": parse_XPath,
        "LocationPath": parse_LocationPath,
        "AbsoluteLocationPath": parse_AbsoluteLocationPath,
        "RelativeLocationPath": parse_RelativeLocationPath,
        "Step": parse_Step,
        "AxisSpecifier": parse_AxisSpecifier,
        "AxisName": parse_AxisName,
        "NodeTest": parse_NodeTest,
        "Predicate": parse_Predicate,
        "AbbreviatedAbsoluteLocationPath": parse_AbbreviatedAbsoluteLocationPath,
        "AbbreviatedStep": parse_AbbreviatedStep,
        "AbbreviatedAxisSpecifier": parse_AbbreviatedAxisSpecifier,
        "Expr": parse_Expr,
        "PrimaryExpr": parse_PrimaryExpr,
        "FunctionCall": parse_FunctionCall,
        "UnionExpr": parse_UnionExpr,
        "PathExpr": parse_PathExpr,
        "FilterExpr": parse_FilterExpr,
        "OrExpr": parse_OrExpr,
        "AndExpr": parse_AndExpr,
        "EqualityExpr": parse_EqualityExpr,
        "RelationalExpr": parse_RelationalExpr,
        "AdditiveExpr": parse_AdditiveExpr,
        "MultiplicativeExpr": parse_MultiplicativeExpr,
        "UnaryExpr": parse_UnaryExpr,
        "Literal": parse_Literal,
        "Number": parse_Number,
        "Digits": parse_Digits,
        "MultiplyOperator": parse_MultiplyOperator,
        "FunctionName": parse_FunctionName,
        "VariableReference": parse_VariableReference,
        "NameTest": parse_NameTest,
        "NodeType": parse_NodeType,
        "S": parse_S,
        "_": parse__,
        "QName": parse_QName,
        "PrefixedName": parse_PrefixedName,
        "UnprefixedName": parse_UnprefixedName,
        "NCName": parse_NCName,
        "NameStartChar": parse_NameStartChar,
        "NameChar": parse_NameChar,
        "Name": parse_Name
      };
      
      if (startRule !== undefined) {
        if (parseFunctions[startRule] === undefined) {
          throw new Error("Invalid rule name: " + quote(startRule) + ".");
        }
      } else {
        startRule = "XPath";
      }
      
      var pos = 0;
      var reportFailures = 0;
      var rightmostFailuresPos = 0;
      var rightmostFailuresExpected = [];
      
      function padLeft(input, padding, length) {
        var result = input;
        
        var padLength = length - input.length;
        for (var i = 0; i < padLength; i++) {
          result = padding + result;
        }
        
        return result;
      }
      
      function escape(ch) {
        var charCode = ch.charCodeAt(0);
        var escapeChar;
        var length;
        
        if (charCode <= 0xFF) {
          escapeChar = 'x';
          length = 2;
        } else {
          escapeChar = 'u';
          length = 4;
        }
        
        return '\\' + escapeChar + padLeft(charCode.toString(16).toUpperCase(), '0', length);
      }
      
      function matchFailed(failure) {
        if (pos < rightmostFailuresPos) {
          return;
        }
        
        if (pos > rightmostFailuresPos) {
          rightmostFailuresPos = pos;
          rightmostFailuresExpected = [];
        }
        
        rightmostFailuresExpected.push(failure);
      }
      
      function parse_XPath() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse__();
        if (result0 !== null) {
          result1 = parse_Expr();
          if (result1 !== null) {
            result2 = parse__();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, expr) {
        		return {
        			 tree: expr
        			,nsPrefixes: nsPrefixes
        		}
        	})(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_LocationPath() {
        var result0;
        
        result0 = parse_RelativeLocationPath();
        if (result0 === null) {
          result0 = parse_AbsoluteLocationPath();
        }
        return result0;
      }
      
      function parse_AbsoluteLocationPath() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        
        result0 = parse_AbbreviatedAbsoluteLocationPath();
        if (result0 === null) {
          pos0 = pos;
          pos1 = pos;
          if (input.charCodeAt(pos) === 47) {
            result0 = "/";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"/\"");
            }
          }
          if (result0 !== null) {
            pos2 = pos;
            result1 = parse__();
            if (result1 !== null) {
              result2 = parse_RelativeLocationPath();
              if (result2 !== null) {
                result1 = [result1, result2];
              } else {
                result1 = null;
                pos = pos2;
              }
            } else {
              result1 = null;
              pos = pos2;
            }
            result1 = result1 !== null ? result1 : "";
            if (result1 !== null) {
              result0 = [result0, result1];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
          if (result0 !== null) {
            result0 = (function(offset, path) {
          		return {
          			 type: '/'
          			,args: [
          				null,
          				(path) ? path[1] : null
          			]
          		};
          	})(pos0, result0[1]);
          }
          if (result0 === null) {
            pos = pos0;
          }
        }
        return result0;
      }
      
      function parse_RelativeLocationPath() {
        var result0, result1, result2, result3, result4, result5;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_Step();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse__();
          if (result2 !== null) {
            if (input.substr(pos, 2) === "//") {
              result3 = "//";
              pos += 2;
            } else {
              result3 = null;
              if (reportFailures === 0) {
                matchFailed("\"//\"");
              }
            }
            if (result3 === null) {
              if (input.charCodeAt(pos) === 47) {
                result3 = "/";
                pos++;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\"/\"");
                }
              }
            }
            if (result3 !== null) {
              result4 = parse__();
              if (result4 !== null) {
                result5 = parse_Step();
                if (result5 !== null) {
                  result2 = [result2, result3, result4, result5];
                } else {
                  result2 = null;
                  pos = pos2;
                }
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse__();
            if (result2 !== null) {
              if (input.substr(pos, 2) === "//") {
                result3 = "//";
                pos += 2;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\"//\"");
                }
              }
              if (result3 === null) {
                if (input.charCodeAt(pos) === 47) {
                  result3 = "/";
                  pos++;
                } else {
                  result3 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"/\"");
                  }
                }
              }
              if (result3 !== null) {
                result4 = parse__();
                if (result4 !== null) {
                  result5 = parse_Step();
                  if (result5 !== null) {
                    result2 = [result2, result3, result4, result5];
                  } else {
                    result2 = null;
                    pos = pos2;
                  }
                } else {
                  result2 = null;
                  pos = pos2;
                }
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, expr, repeatedExpr) {
        		var i;
        		
        		for(i=0; i < repeatedExpr.length; i++)
        		{
        			expr = expandSlashAbbrev(repeatedExpr[i][1], expr, repeatedExpr[i][3]);
        		}
        		
        		return expr;
        	})(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Step() {
        var result0, result1, result2, result3, result4, result5;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_AxisSpecifier();
        if (result0 !== null) {
          result1 = parse__();
          if (result1 !== null) {
            result2 = parse_NodeTest();
            if (result2 !== null) {
              result3 = [];
              pos2 = pos;
              result4 = parse__();
              if (result4 !== null) {
                result5 = parse_Predicate();
                if (result5 !== null) {
                  result4 = [result4, result5];
                } else {
                  result4 = null;
                  pos = pos2;
                }
              } else {
                result4 = null;
                pos = pos2;
              }
              while (result4 !== null) {
                result3.push(result4);
                pos2 = pos;
                result4 = parse__();
                if (result4 !== null) {
                  result5 = parse_Predicate();
                  if (result5 !== null) {
                    result4 = [result4, result5];
                  } else {
                    result4 = null;
                    pos = pos2;
                  }
                } else {
                  result4 = null;
                  pos = pos2;
                }
              }
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, axis, node, predicate) {
        		return predicateExpression({
        			type: 'step',
        			args: [
        				axis,
        				node
        			]},
        			axis,
        			predicate,
        			1
        		);
        	})(pos0, result0[0], result0[2], result0[3]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        if (result0 === null) {
          result0 = parse_AbbreviatedStep();
        }
        return result0;
      }
      
      function parse_AxisSpecifier() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_AxisName();
        if (result0 !== null) {
          result1 = parse__();
          if (result1 !== null) {
            if (input.substr(pos, 2) === "::") {
              result2 = "::";
              pos += 2;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"::\"");
              }
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, axis) {
        		return axis;
        	})(pos0, result0[0]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        if (result0 === null) {
          pos0 = pos;
          result0 = parse_AbbreviatedAxisSpecifier();
          if (result0 !== null) {
            result0 = (function(offset, aas) {
          		return (aas.length) ? aas : 'child';
          	})(pos0, result0);
          }
          if (result0 === null) {
            pos = pos0;
          }
        }
        return result0;
      }
      
      function parse_AxisName() {
        var result0;
        
        if (input.substr(pos, 16) === "ancestor-or-self") {
          result0 = "ancestor-or-self";
          pos += 16;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"ancestor-or-self\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 8) === "ancestor") {
            result0 = "ancestor";
            pos += 8;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"ancestor\"");
            }
          }
          if (result0 === null) {
            if (input.substr(pos, 9) === "attribute") {
              result0 = "attribute";
              pos += 9;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"attribute\"");
              }
            }
            if (result0 === null) {
              if (input.substr(pos, 5) === "child") {
                result0 = "child";
                pos += 5;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"child\"");
                }
              }
              if (result0 === null) {
                if (input.substr(pos, 18) === "descendant-or-self") {
                  result0 = "descendant-or-self";
                  pos += 18;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"descendant-or-self\"");
                  }
                }
                if (result0 === null) {
                  if (input.substr(pos, 10) === "descendant") {
                    result0 = "descendant";
                    pos += 10;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"descendant\"");
                    }
                  }
                  if (result0 === null) {
                    if (input.substr(pos, 17) === "following-sibling") {
                      result0 = "following-sibling";
                      pos += 17;
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"following-sibling\"");
                      }
                    }
                    if (result0 === null) {
                      if (input.substr(pos, 9) === "following") {
                        result0 = "following";
                        pos += 9;
                      } else {
                        result0 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"following\"");
                        }
                      }
                      if (result0 === null) {
                        if (input.substr(pos, 9) === "namespace") {
                          result0 = "namespace";
                          pos += 9;
                        } else {
                          result0 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"namespace\"");
                          }
                        }
                        if (result0 === null) {
                          if (input.substr(pos, 6) === "parent") {
                            result0 = "parent";
                            pos += 6;
                          } else {
                            result0 = null;
                            if (reportFailures === 0) {
                              matchFailed("\"parent\"");
                            }
                          }
                          if (result0 === null) {
                            if (input.substr(pos, 17) === "preceding-sibling") {
                              result0 = "preceding-sibling";
                              pos += 17;
                            } else {
                              result0 = null;
                              if (reportFailures === 0) {
                                matchFailed("\"preceding-sibling\"");
                              }
                            }
                            if (result0 === null) {
                              if (input.substr(pos, 9) === "preceding") {
                                result0 = "preceding";
                                pos += 9;
                              } else {
                                result0 = null;
                                if (reportFailures === 0) {
                                  matchFailed("\"preceding\"");
                                }
                              }
                              if (result0 === null) {
                                if (input.substr(pos, 4) === "self") {
                                  result0 = "self";
                                  pos += 4;
                                } else {
                                  result0 = null;
                                  if (reportFailures === 0) {
                                    matchFailed("\"self\"");
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_NodeTest() {
        var result0, result1, result2, result3, result4, result5, result6;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_NodeType();
        if (result0 !== null) {
          result1 = parse__();
          if (result1 !== null) {
            if (input.charCodeAt(pos) === 40) {
              result2 = "(";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"(\"");
              }
            }
            if (result2 !== null) {
              result3 = parse__();
              if (result3 !== null) {
                if (input.charCodeAt(pos) === 41) {
                  result4 = ")";
                  pos++;
                } else {
                  result4 = null;
                  if (reportFailures === 0) {
                    matchFailed("\")\"");
                  }
                }
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, nodeType) {
        		return {
        			 type: 'nodeType'
        			,args: [
        				nodeType,
        				[]
        			]
        		};
        	})(pos0, result0[0]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        if (result0 === null) {
          pos0 = pos;
          pos1 = pos;
          if (input.substr(pos, 22) === "processing-instruction") {
            result0 = "processing-instruction";
            pos += 22;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"processing-instruction\"");
            }
          }
          if (result0 !== null) {
            result1 = parse__();
            if (result1 !== null) {
              if (input.charCodeAt(pos) === 40) {
                result2 = "(";
                pos++;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\"(\"");
                }
              }
              if (result2 !== null) {
                result3 = parse__();
                if (result3 !== null) {
                  result4 = parse_Literal();
                  if (result4 !== null) {
                    result5 = parse__();
                    if (result5 !== null) {
                      if (input.charCodeAt(pos) === 41) {
                        result6 = ")";
                        pos++;
                      } else {
                        result6 = null;
                        if (reportFailures === 0) {
                          matchFailed("\")\"");
                        }
                      }
                      if (result6 !== null) {
                        result0 = [result0, result1, result2, result3, result4, result5, result6];
                      } else {
                        result0 = null;
                        pos = pos1;
                      }
                    } else {
                      result0 = null;
                      pos = pos1;
                    }
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
          if (result0 !== null) {
            result0 = (function(offset, pi, arg) {
          		return {
          			 type: 'nodeType'
          			,args: [
          				pi,
          				[arg]
          			]
          		};
          	})(pos0, result0[0], result0[4]);
          }
          if (result0 === null) {
            pos = pos0;
          }
          if (result0 === null) {
            pos0 = pos;
            result0 = parse_NameTest();
            if (result0 !== null) {
              result0 = (function(offset, nt) {
            		return nt;
            	})(pos0, result0);
            }
            if (result0 === null) {
              pos = pos0;
            }
          }
        }
        return result0;
      }
      
      function parse_Predicate() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.charCodeAt(pos) === 91) {
          result0 = "[";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"[\"");
          }
        }
        if (result0 !== null) {
          result1 = parse__();
          if (result1 !== null) {
            result2 = parse_Expr();
            if (result2 !== null) {
              result3 = parse__();
              if (result3 !== null) {
                if (input.charCodeAt(pos) === 93) {
                  result4 = "]";
                  pos++;
                } else {
                  result4 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"]\"");
                  }
                }
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, expr) {
        		return expr;
        	})(pos0, result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_AbbreviatedAbsoluteLocationPath() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 2) === "//") {
          result0 = "//";
          pos += 2;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"//\"");
          }
        }
        if (result0 !== null) {
          result1 = parse__();
          if (result1 !== null) {
            result2 = parse_RelativeLocationPath();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, path) {
        		return expandSlashAbbrev('//', null, path);
        	})(pos0, result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_AbbreviatedStep() {
        var result0;
        var pos0;
        
        pos0 = pos;
        if (input.substr(pos, 2) === "..") {
          result0 = "..";
          pos += 2;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"..\"");
          }
        }
        if (result0 === null) {
          if (input.charCodeAt(pos) === 46) {
            result0 = ".";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\".\"");
            }
          }
        }
        if (result0 !== null) {
          result0 = (function(offset, abbrev) {
        		/*
        		 * @see http://www.w3.org/TR/xpath/#path-abbrev
        		 */
        		var result = {
        			type: 'step',
        			args: [
        				'self', // assume .
        				{
        					type: 'nodeType',
        					args: [
        						'node',
        						[]
        					]
        				}
        			]
        		}
        		
        		if (abbrev == '..')
        		{
        			result.args[0] = 'parent';
        		}
        		
        		return result;
        	})(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_AbbreviatedAxisSpecifier() {
        var result0;
        var pos0;
        
        pos0 = pos;
        if (input.charCodeAt(pos) === 64) {
          result0 = "@";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"@\"");
          }
        }
        result0 = result0 !== null ? result0 : "";
        if (result0 !== null) {
          result0 = (function(offset, attribute) {
        		return (attribute) ? 'attribute' : '';
        	})(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Expr() {
        var result0;
        var pos0;
        
        pos0 = pos;
        result0 = parse_OrExpr();
        if (result0 !== null) {
          result0 = (function(offset, expr) {
        		return expr;
        	})(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_PrimaryExpr() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1;
        
        pos0 = pos;
        result0 = parse_VariableReference();
        if (result0 !== null) {
          result0 = (function(offset, vr) {
        		return vr;
        	})(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        if (result0 === null) {
          pos0 = pos;
          pos1 = pos;
          if (input.charCodeAt(pos) === 40) {
            result0 = "(";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"(\"");
            }
          }
          if (result0 !== null) {
            result1 = parse__();
            if (result1 !== null) {
              result2 = parse_Expr();
              if (result2 !== null) {
                result3 = parse__();
                if (result3 !== null) {
                  if (input.charCodeAt(pos) === 41) {
                    result4 = ")";
                    pos++;
                  } else {
                    result4 = null;
                    if (reportFailures === 0) {
                      matchFailed("\")\"");
                    }
                  }
                  if (result4 !== null) {
                    result0 = [result0, result1, result2, result3, result4];
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
          if (result0 !== null) {
            result0 = (function(offset, expr) {
          		return expr;
          	})(pos0, result0[2]);
          }
          if (result0 === null) {
            pos = pos0;
          }
          if (result0 === null) {
            pos0 = pos;
            result0 = parse_Literal();
            if (result0 !== null) {
              result0 = (function(offset, l) {
            		return l;
            	})(pos0, result0);
            }
            if (result0 === null) {
              pos = pos0;
            }
            if (result0 === null) {
              pos0 = pos;
              result0 = parse_Number();
              if (result0 !== null) {
                result0 = (function(offset, n) {
              		return n;
              	})(pos0, result0);
              }
              if (result0 === null) {
                pos = pos0;
              }
              if (result0 === null) {
                result0 = parse_FunctionCall();
              }
            }
          }
        }
        return result0;
      }
      
      function parse_FunctionCall() {
        var result0, result1, result2, result3, result4, result5, result6, result7, result8, result9;
        var pos0, pos1, pos2, pos3;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_FunctionName();
        if (result0 !== null) {
          result1 = parse__();
          if (result1 !== null) {
            if (input.charCodeAt(pos) === 40) {
              result2 = "(";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"(\"");
              }
            }
            if (result2 !== null) {
              pos2 = pos;
              result3 = parse__();
              if (result3 !== null) {
                result4 = parse_Expr();
                if (result4 !== null) {
                  result5 = [];
                  pos3 = pos;
                  result6 = parse__();
                  if (result6 !== null) {
                    if (input.charCodeAt(pos) === 44) {
                      result7 = ",";
                      pos++;
                    } else {
                      result7 = null;
                      if (reportFailures === 0) {
                        matchFailed("\",\"");
                      }
                    }
                    if (result7 !== null) {
                      result8 = parse__();
                      if (result8 !== null) {
                        result9 = parse_Expr();
                        if (result9 !== null) {
                          result6 = [result6, result7, result8, result9];
                        } else {
                          result6 = null;
                          pos = pos3;
                        }
                      } else {
                        result6 = null;
                        pos = pos3;
                      }
                    } else {
                      result6 = null;
                      pos = pos3;
                    }
                  } else {
                    result6 = null;
                    pos = pos3;
                  }
                  while (result6 !== null) {
                    result5.push(result6);
                    pos3 = pos;
                    result6 = parse__();
                    if (result6 !== null) {
                      if (input.charCodeAt(pos) === 44) {
                        result7 = ",";
                        pos++;
                      } else {
                        result7 = null;
                        if (reportFailures === 0) {
                          matchFailed("\",\"");
                        }
                      }
                      if (result7 !== null) {
                        result8 = parse__();
                        if (result8 !== null) {
                          result9 = parse_Expr();
                          if (result9 !== null) {
                            result6 = [result6, result7, result8, result9];
                          } else {
                            result6 = null;
                            pos = pos3;
                          }
                        } else {
                          result6 = null;
                          pos = pos3;
                        }
                      } else {
                        result6 = null;
                        pos = pos3;
                      }
                    } else {
                      result6 = null;
                      pos = pos3;
                    }
                  }
                  if (result5 !== null) {
                    result3 = [result3, result4, result5];
                  } else {
                    result3 = null;
                    pos = pos2;
                  }
                } else {
                  result3 = null;
                  pos = pos2;
                }
              } else {
                result3 = null;
                pos = pos2;
              }
              result3 = result3 !== null ? result3 : "";
              if (result3 !== null) {
                result4 = parse__();
                if (result4 !== null) {
                  if (input.charCodeAt(pos) === 41) {
                    result5 = ")";
                    pos++;
                  } else {
                    result5 = null;
                    if (reportFailures === 0) {
                      matchFailed("\")\"");
                    }
                  }
                  if (result5 !== null) {
                    result0 = [result0, result1, result2, result3, result4, result5];
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, name, arg) {
        		var i, args = [];
        		if (arg)
        		{
        			args.push(arg[1]);
        			for (i=0; i < arg[2].length; i++)
        			{
        				args.push(arg[2][i][3]);
        			}
        		}
        		return {
        			 type: 'function'
        			,args: [
        				name,
        				args
        			]
        		};
        	})(pos0, result0[0], result0[3]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_UnionExpr() {
        var result0, result1, result2, result3, result4, result5;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_PathExpr();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse__();
          if (result2 !== null) {
            if (input.charCodeAt(pos) === 124) {
              result3 = "|";
              pos++;
            } else {
              result3 = null;
              if (reportFailures === 0) {
                matchFailed("\"|\"");
              }
            }
            if (result3 !== null) {
              result4 = parse__();
              if (result4 !== null) {
                result5 = parse_PathExpr();
                if (result5 !== null) {
                  result2 = [result2, result3, result4, result5];
                } else {
                  result2 = null;
                  pos = pos2;
                }
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse__();
            if (result2 !== null) {
              if (input.charCodeAt(pos) === 124) {
                result3 = "|";
                pos++;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\"|\"");
                }
              }
              if (result3 !== null) {
                result4 = parse__();
                if (result4 !== null) {
                  result5 = parse_PathExpr();
                  if (result5 !== null) {
                    result2 = [result2, result3, result4, result5];
                  } else {
                    result2 = null;
                    pos = pos2;
                  }
                } else {
                  result2 = null;
                  pos = pos2;
                }
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, expr, repeatedExpr) {
        		return expressionSimplifier(expr, repeatedExpr, 1, 3);
        	})(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_PathExpr() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_FilterExpr();
        if (result0 !== null) {
          pos2 = pos;
          result1 = parse__();
          if (result1 !== null) {
            if (input.substr(pos, 2) === "//") {
              result2 = "//";
              pos += 2;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"//\"");
              }
            }
            if (result2 === null) {
              if (input.charCodeAt(pos) === 47) {
                result2 = "/";
                pos++;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\"/\"");
                }
              }
            }
            if (result2 !== null) {
              result3 = parse__();
              if (result3 !== null) {
                result4 = parse_RelativeLocationPath();
                if (result4 !== null) {
                  result1 = [result1, result2, result3, result4];
                } else {
                  result1 = null;
                  pos = pos2;
                }
              } else {
                result1 = null;
                pos = pos2;
              }
            } else {
              result1 = null;
              pos = pos2;
            }
          } else {
            result1 = null;
            pos = pos2;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, expr, path) {
        		if (!path)
        			return expr;
        		
        		return expandSlashAbbrev(path[1], expr, path[3]);
        	})(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        if (result0 === null) {
          pos0 = pos;
          result0 = parse_LocationPath();
          if (result0 !== null) {
            result0 = (function(offset, path) {
          		return path;
          	})(pos0, result0);
          }
          if (result0 === null) {
            pos = pos0;
          }
        }
        return result0;
      }
      
      function parse_FilterExpr() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_PrimaryExpr();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse__();
          if (result2 !== null) {
            result3 = parse_Predicate();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse__();
            if (result2 !== null) {
              result3 = parse_Predicate();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, expr, repeatedExpr) {
        		return predicateExpression(expr, 'child', repeatedExpr, 1);
        	})(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_OrExpr() {
        var result0, result1, result2, result3, result4, result5;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_AndExpr();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse__();
          if (result2 !== null) {
            if (input.substr(pos, 2) === "or") {
              result3 = "or";
              pos += 2;
            } else {
              result3 = null;
              if (reportFailures === 0) {
                matchFailed("\"or\"");
              }
            }
            if (result3 !== null) {
              result4 = parse__();
              if (result4 !== null) {
                result5 = parse_AndExpr();
                if (result5 !== null) {
                  result2 = [result2, result3, result4, result5];
                } else {
                  result2 = null;
                  pos = pos2;
                }
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse__();
            if (result2 !== null) {
              if (input.substr(pos, 2) === "or") {
                result3 = "or";
                pos += 2;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\"or\"");
                }
              }
              if (result3 !== null) {
                result4 = parse__();
                if (result4 !== null) {
                  result5 = parse_AndExpr();
                  if (result5 !== null) {
                    result2 = [result2, result3, result4, result5];
                  } else {
                    result2 = null;
                    pos = pos2;
                  }
                } else {
                  result2 = null;
                  pos = pos2;
                }
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, expr, repeatedExpr) {
        		return expressionSimplifier(expr, repeatedExpr, 1, 3);
        	})(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_AndExpr() {
        var result0, result1, result2, result3, result4, result5;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_EqualityExpr();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse__();
          if (result2 !== null) {
            if (input.substr(pos, 3) === "and") {
              result3 = "and";
              pos += 3;
            } else {
              result3 = null;
              if (reportFailures === 0) {
                matchFailed("\"and\"");
              }
            }
            if (result3 !== null) {
              result4 = parse__();
              if (result4 !== null) {
                result5 = parse_EqualityExpr();
                if (result5 !== null) {
                  result2 = [result2, result3, result4, result5];
                } else {
                  result2 = null;
                  pos = pos2;
                }
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse__();
            if (result2 !== null) {
              if (input.substr(pos, 3) === "and") {
                result3 = "and";
                pos += 3;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\"and\"");
                }
              }
              if (result3 !== null) {
                result4 = parse__();
                if (result4 !== null) {
                  result5 = parse_EqualityExpr();
                  if (result5 !== null) {
                    result2 = [result2, result3, result4, result5];
                  } else {
                    result2 = null;
                    pos = pos2;
                  }
                } else {
                  result2 = null;
                  pos = pos2;
                }
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, expr, repeatedExpr) {
        		return expressionSimplifier(expr, repeatedExpr, 1, 3);
        	})(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_EqualityExpr() {
        var result0, result1, result2, result3, result4, result5;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_RelationalExpr();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse__();
          if (result2 !== null) {
            if (input.charCodeAt(pos) === 61) {
              result3 = "=";
              pos++;
            } else {
              result3 = null;
              if (reportFailures === 0) {
                matchFailed("\"=\"");
              }
            }
            if (result3 === null) {
              if (input.substr(pos, 2) === "!=") {
                result3 = "!=";
                pos += 2;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\"!=\"");
                }
              }
            }
            if (result3 !== null) {
              result4 = parse__();
              if (result4 !== null) {
                result5 = parse_RelationalExpr();
                if (result5 !== null) {
                  result2 = [result2, result3, result4, result5];
                } else {
                  result2 = null;
                  pos = pos2;
                }
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse__();
            if (result2 !== null) {
              if (input.charCodeAt(pos) === 61) {
                result3 = "=";
                pos++;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\"=\"");
                }
              }
              if (result3 === null) {
                if (input.substr(pos, 2) === "!=") {
                  result3 = "!=";
                  pos += 2;
                } else {
                  result3 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"!=\"");
                  }
                }
              }
              if (result3 !== null) {
                result4 = parse__();
                if (result4 !== null) {
                  result5 = parse_RelationalExpr();
                  if (result5 !== null) {
                    result2 = [result2, result3, result4, result5];
                  } else {
                    result2 = null;
                    pos = pos2;
                  }
                } else {
                  result2 = null;
                  pos = pos2;
                }
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, expr, repeatedExpr) {
        		return expressionSimplifier(expr, repeatedExpr, 1, 3);
        	})(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_RelationalExpr() {
        var result0, result1, result2, result3, result4, result5;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_AdditiveExpr();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse__();
          if (result2 !== null) {
            if (input.substr(pos, 2) === "<=") {
              result3 = "<=";
              pos += 2;
            } else {
              result3 = null;
              if (reportFailures === 0) {
                matchFailed("\"<=\"");
              }
            }
            if (result3 === null) {
              if (input.charCodeAt(pos) === 60) {
                result3 = "<";
                pos++;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\"<\"");
                }
              }
              if (result3 === null) {
                if (input.substr(pos, 2) === ">=") {
                  result3 = ">=";
                  pos += 2;
                } else {
                  result3 = null;
                  if (reportFailures === 0) {
                    matchFailed("\">=\"");
                  }
                }
                if (result3 === null) {
                  if (input.charCodeAt(pos) === 62) {
                    result3 = ">";
                    pos++;
                  } else {
                    result3 = null;
                    if (reportFailures === 0) {
                      matchFailed("\">\"");
                    }
                  }
                }
              }
            }
            if (result3 !== null) {
              result4 = parse__();
              if (result4 !== null) {
                result5 = parse_AdditiveExpr();
                if (result5 !== null) {
                  result2 = [result2, result3, result4, result5];
                } else {
                  result2 = null;
                  pos = pos2;
                }
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse__();
            if (result2 !== null) {
              if (input.substr(pos, 2) === "<=") {
                result3 = "<=";
                pos += 2;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\"<=\"");
                }
              }
              if (result3 === null) {
                if (input.charCodeAt(pos) === 60) {
                  result3 = "<";
                  pos++;
                } else {
                  result3 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"<\"");
                  }
                }
                if (result3 === null) {
                  if (input.substr(pos, 2) === ">=") {
                    result3 = ">=";
                    pos += 2;
                  } else {
                    result3 = null;
                    if (reportFailures === 0) {
                      matchFailed("\">=\"");
                    }
                  }
                  if (result3 === null) {
                    if (input.charCodeAt(pos) === 62) {
                      result3 = ">";
                      pos++;
                    } else {
                      result3 = null;
                      if (reportFailures === 0) {
                        matchFailed("\">\"");
                      }
                    }
                  }
                }
              }
              if (result3 !== null) {
                result4 = parse__();
                if (result4 !== null) {
                  result5 = parse_AdditiveExpr();
                  if (result5 !== null) {
                    result2 = [result2, result3, result4, result5];
                  } else {
                    result2 = null;
                    pos = pos2;
                  }
                } else {
                  result2 = null;
                  pos = pos2;
                }
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, expr, repeatedExpr) {
        		return expressionSimplifier(expr, repeatedExpr, 1, 3);
        	})(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_AdditiveExpr() {
        var result0, result1, result2, result3, result4, result5;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_MultiplicativeExpr();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse__();
          if (result2 !== null) {
            if (input.charCodeAt(pos) === 43) {
              result3 = "+";
              pos++;
            } else {
              result3 = null;
              if (reportFailures === 0) {
                matchFailed("\"+\"");
              }
            }
            if (result3 === null) {
              if (input.charCodeAt(pos) === 45) {
                result3 = "-";
                pos++;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\"-\"");
                }
              }
            }
            if (result3 !== null) {
              result4 = parse__();
              if (result4 !== null) {
                result5 = parse_MultiplicativeExpr();
                if (result5 !== null) {
                  result2 = [result2, result3, result4, result5];
                } else {
                  result2 = null;
                  pos = pos2;
                }
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse__();
            if (result2 !== null) {
              if (input.charCodeAt(pos) === 43) {
                result3 = "+";
                pos++;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\"+\"");
                }
              }
              if (result3 === null) {
                if (input.charCodeAt(pos) === 45) {
                  result3 = "-";
                  pos++;
                } else {
                  result3 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"-\"");
                  }
                }
              }
              if (result3 !== null) {
                result4 = parse__();
                if (result4 !== null) {
                  result5 = parse_MultiplicativeExpr();
                  if (result5 !== null) {
                    result2 = [result2, result3, result4, result5];
                  } else {
                    result2 = null;
                    pos = pos2;
                  }
                } else {
                  result2 = null;
                  pos = pos2;
                }
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, expr, repeatedExpr) {
        		return expressionSimplifier(expr, repeatedExpr, 1, 3);
        	})(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_MultiplicativeExpr() {
        var result0, result1, result2, result3, result4, result5;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_UnaryExpr();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse__();
          if (result2 !== null) {
            result3 = parse_MultiplyOperator();
            if (result3 === null) {
              if (input.substr(pos, 3) === "div") {
                result3 = "div";
                pos += 3;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\"div\"");
                }
              }
              if (result3 === null) {
                if (input.substr(pos, 3) === "mod") {
                  result3 = "mod";
                  pos += 3;
                } else {
                  result3 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"mod\"");
                  }
                }
              }
            }
            if (result3 !== null) {
              result4 = parse__();
              if (result4 !== null) {
                result5 = parse_UnaryExpr();
                if (result5 !== null) {
                  result2 = [result2, result3, result4, result5];
                } else {
                  result2 = null;
                  pos = pos2;
                }
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse__();
            if (result2 !== null) {
              result3 = parse_MultiplyOperator();
              if (result3 === null) {
                if (input.substr(pos, 3) === "div") {
                  result3 = "div";
                  pos += 3;
                } else {
                  result3 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"div\"");
                  }
                }
                if (result3 === null) {
                  if (input.substr(pos, 3) === "mod") {
                    result3 = "mod";
                    pos += 3;
                  } else {
                    result3 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"mod\"");
                    }
                  }
                }
              }
              if (result3 !== null) {
                result4 = parse__();
                if (result4 !== null) {
                  result5 = parse_UnaryExpr();
                  if (result5 !== null) {
                    result2 = [result2, result3, result4, result5];
                  } else {
                    result2 = null;
                    pos = pos2;
                  }
                } else {
                  result2 = null;
                  pos = pos2;
                }
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, expr, repeatedExpr) {
        		return expressionSimplifier(expr, repeatedExpr, 1, 3);
        	})(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_UnaryExpr() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        result0 = parse_UnionExpr();
        if (result0 !== null) {
          result0 = (function(offset, expr) {
        		return expr;
        	})(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        if (result0 === null) {
          pos0 = pos;
          pos1 = pos;
          if (input.charCodeAt(pos) === 45) {
            result0 = "-";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"-\"");
            }
          }
          if (result0 !== null) {
            result1 = parse__();
            if (result1 !== null) {
              result2 = parse_UnaryExpr();
              if (result2 !== null) {
                result0 = [result0, result1, result2];
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
          if (result0 !== null) {
            result0 = (function(offset, expr) {
          		return {
          			 type: '*' // multiply
          			,args: [
          				{
          					type: 'number',
          					args: [
          						-1
          					]
          				},
          				expr
          			]
          		}
          	})(pos0, result0[2]);
          }
          if (result0 === null) {
            pos = pos0;
          }
        }
        return result0;
      }
      
      function parse_Literal() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.charCodeAt(pos) === 34) {
          result0 = "\"";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"\\\"\"");
          }
        }
        if (result0 !== null) {
          result1 = [];
          if (/^[^"]/.test(input.charAt(pos))) {
            result2 = input.charAt(pos);
            pos++;
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("[^\"]");
            }
          }
          while (result2 !== null) {
            result1.push(result2);
            if (/^[^"]/.test(input.charAt(pos))) {
              result2 = input.charAt(pos);
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("[^\"]");
              }
            }
          }
          if (result1 !== null) {
            if (input.charCodeAt(pos) === 34) {
              result2 = "\"";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"\\\"\"");
              }
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, literals) {
        		return {
        			type: 'string',
        			args: [
        				literals.join('')
        			]
        		};
        	})(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        if (result0 === null) {
          pos0 = pos;
          pos1 = pos;
          if (input.charCodeAt(pos) === 39) {
            result0 = "'";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"'\"");
            }
          }
          if (result0 !== null) {
            result1 = [];
            if (/^[^']/.test(input.charAt(pos))) {
              result2 = input.charAt(pos);
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("[^']");
              }
            }
            while (result2 !== null) {
              result1.push(result2);
              if (/^[^']/.test(input.charAt(pos))) {
                result2 = input.charAt(pos);
                pos++;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("[^']");
                }
              }
            }
            if (result1 !== null) {
              if (input.charCodeAt(pos) === 39) {
                result2 = "'";
                pos++;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\"'\"");
                }
              }
              if (result2 !== null) {
                result0 = [result0, result1, result2];
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
          if (result0 !== null) {
            result0 = (function(offset, literals) {
          		return {
          			type: 'string',
          			args: [
          				literals.join('')
          			]
          		};
          	})(pos0, result0[1]);
          }
          if (result0 === null) {
            pos = pos0;
          }
        }
        return result0;
      }
      
      function parse_Number() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_Digits();
        if (result0 !== null) {
          pos2 = pos;
          if (input.charCodeAt(pos) === 46) {
            result1 = ".";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\".\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_Digits();
            result2 = result2 !== null ? result2 : "";
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos2;
            }
          } else {
            result1 = null;
            pos = pos2;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, digits, decimals) {
        		return {
        			 type: 'number'
        			,args: [
        				(decimals) ? parseFloat(digits + '.' + decimals[1]) : parseInt(digits)
        			]
        		};
        	})(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        if (result0 === null) {
          pos0 = pos;
          pos1 = pos;
          if (input.charCodeAt(pos) === 46) {
            result0 = ".";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\".\"");
            }
          }
          if (result0 !== null) {
            result1 = parse_Digits();
            if (result1 !== null) {
              result0 = [result0, result1];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
          if (result0 !== null) {
            result0 = (function(offset, digits) {
          		return {
          			type: 'number',
          			args: [
          				parseFloat('.' + digits)
          			]
          		};
          	})(pos0, result0[1]);
          }
          if (result0 === null) {
            pos = pos0;
          }
        }
        return result0;
      }
      
      function parse_Digits() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        if (/^[0-9]/.test(input.charAt(pos))) {
          result1 = input.charAt(pos);
          pos++;
        } else {
          result1 = null;
          if (reportFailures === 0) {
            matchFailed("[0-9]");
          }
        }
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            if (/^[0-9]/.test(input.charAt(pos))) {
              result1 = input.charAt(pos);
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("[0-9]");
              }
            }
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset, digits) {
        		return digits.join('');
        	})(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_MultiplyOperator() {
        var result0;
        
        if (input.charCodeAt(pos) === 42) {
          result0 = "*";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"*\"");
          }
        }
        return result0;
      }
      
      function parse_FunctionName() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_QName();
        if (result0 !== null) {
          result1 = (function(offset, name) { // - NodeType
          		var i;
          		
          		// exclude NodeType names
          		if (lastQNameParsed.args[0] === null) // no namespace
          		{
          			for(i=0; i<nodeTypeNames.length; i++)
          			{
          				if (lastQNameParsed.args[1] == nodeTypeNames[i]) // name
          				{
          					// Reserved NodeType name used, so don't allow this function name
          					return false;
          				}
          			}
          		}
          		
          		// function name ok
          		return true;
          	})(pos, result0) ? "" : null;
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, name) {
        		(name.args[0] === '')
        			? name = {  // NOTE: apparently "name.args[0] = null" doesn't work well because NameTest get's screwed up...
        				 type: name.type
        				,args: [
        					null,
        					name.args[1]
        				]
        			}
        			: trackNsPrefix(name.args[0])
        		;
        		return name;
        	})(pos0, result0[0]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_VariableReference() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.charCodeAt(pos) === 36) {
          result0 = "$";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"$\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_QName();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, name) {
        		trackNsPrefix(name.args[0]);
        		
        		return {
        			 type: '$'
        			,args: [
        				name
        			]
        		};
        	})(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_NameTest() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        if (input.charCodeAt(pos) === 42) {
          result0 = "*";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"*\"");
          }
        }
        if (result0 !== null) {
          result0 = (function(offset) {
        		return {
        			 type: 'name'
        			,args: [
        				null,
        				null
        			]
        		};
        	})(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        if (result0 === null) {
          pos0 = pos;
          pos1 = pos;
          result0 = parse_NCName();
          if (result0 !== null) {
            if (input.charCodeAt(pos) === 58) {
              result1 = ":";
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\":\"");
              }
            }
            if (result1 !== null) {
              if (input.charCodeAt(pos) === 42) {
                result2 = "*";
                pos++;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\"*\"");
                }
              }
              if (result2 !== null) {
                result0 = [result0, result1, result2];
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
          if (result0 !== null) {
            result0 = (function(offset, ns) {
          		trackNsPrefix(ns);
          		return {
          			 type: 'name'
          			,args: [
          				ns,
          				null
          			]
          		};
          	})(pos0, result0[0]);
          }
          if (result0 === null) {
            pos = pos0;
          }
          if (result0 === null) {
            pos0 = pos;
            result0 = parse_QName();
            if (result0 !== null) {
              result0 = (function(offset, name) {
            		trackNsPrefix(name.args[0]);
            		return name;
            	})(pos0, result0);
            }
            if (result0 === null) {
              pos = pos0;
            }
          }
        }
        return result0;
      }
      
      function parse_NodeType() {
        var result0;
        
        if (input.substr(pos, 7) === "comment") {
          result0 = "comment";
          pos += 7;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"comment\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 4) === "text") {
            result0 = "text";
            pos += 4;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"text\"");
            }
          }
          if (result0 === null) {
            if (input.substr(pos, 22) === "processing-instruction") {
              result0 = "processing-instruction";
              pos += 22;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"processing-instruction\"");
              }
            }
            if (result0 === null) {
              if (input.substr(pos, 4) === "node") {
                result0 = "node";
                pos += 4;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"node\"");
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_S() {
        var result0, result1;
        
        if (/^[ \t\r\n]/.test(input.charAt(pos))) {
          result1 = input.charAt(pos);
          pos++;
        } else {
          result1 = null;
          if (reportFailures === 0) {
            matchFailed("[ \\t\\r\\n]");
          }
        }
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            if (/^[ \t\r\n]/.test(input.charAt(pos))) {
              result1 = input.charAt(pos);
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("[ \\t\\r\\n]");
              }
            }
          }
        } else {
          result0 = null;
        }
        return result0;
      }
      
      function parse__() {
        var result0;
        
        result0 = parse_S();
        result0 = result0 !== null ? result0 : "";
        return result0;
      }
      
      function parse_QName() {
        var result0;
        var pos0;
        
        pos0 = pos;
        result0 = parse_PrefixedName();
        if (result0 === null) {
          result0 = parse_UnprefixedName();
        }
        if (result0 !== null) {
          result0 = (function(offset, name) {
        		lastQNameParsed = name;
        		return name;
        	})(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_PrefixedName() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_NCName();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 58) {
            result1 = ":";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\":\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_NCName();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, ns, name) {
        		return {
        			 type: 'name'
        			,args: [
        				ns,
        				name
        			]
        		};
        	})(pos0, result0[0], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_UnprefixedName() {
        var result0;
        var pos0;
        
        pos0 = pos;
        result0 = parse_NCName();
        if (result0 !== null) {
          result0 = (function(offset, name) {
        		return {
        			 type: 'name'
        			,args: [
        				null,
        				name
        			]
        		};
        	})(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_NCName() {
        var result0;
        
        result0 = parse_Name();
        return result0;
      }
      
      function parse_NameStartChar() {
        var result0;
        
        if (/^[A-Z]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[A-Z]");
          }
        }
        if (result0 === null) {
          if (input.charCodeAt(pos) === 95) {
            result0 = "_";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"_\"");
            }
          }
          if (result0 === null) {
            if (/^[a-z]/.test(input.charAt(pos))) {
              result0 = input.charAt(pos);
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("[a-z]");
              }
            }
            if (result0 === null) {
              if (/^[\xC0-\xD6]/.test(input.charAt(pos))) {
                result0 = input.charAt(pos);
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("[\\xC0-\\xD6]");
                }
              }
              if (result0 === null) {
                if (/^[\xD8-\xF6]/.test(input.charAt(pos))) {
                  result0 = input.charAt(pos);
                  pos++;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("[\\xD8-\\xF6]");
                  }
                }
                if (result0 === null) {
                  if (/^[\xF8-\u02FF]/.test(input.charAt(pos))) {
                    result0 = input.charAt(pos);
                    pos++;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("[\\xF8-\\u02FF]");
                    }
                  }
                  if (result0 === null) {
                    if (/^[\u0370-\u037D]/.test(input.charAt(pos))) {
                      result0 = input.charAt(pos);
                      pos++;
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("[\\u0370-\\u037D]");
                      }
                    }
                    if (result0 === null) {
                      if (/^[\u037F-\u1FFF]/.test(input.charAt(pos))) {
                        result0 = input.charAt(pos);
                        pos++;
                      } else {
                        result0 = null;
                        if (reportFailures === 0) {
                          matchFailed("[\\u037F-\\u1FFF]");
                        }
                      }
                      if (result0 === null) {
                        if (/^[\u200C-\u200D]/.test(input.charAt(pos))) {
                          result0 = input.charAt(pos);
                          pos++;
                        } else {
                          result0 = null;
                          if (reportFailures === 0) {
                            matchFailed("[\\u200C-\\u200D]");
                          }
                        }
                        if (result0 === null) {
                          if (/^[\u2070-\u218F]/.test(input.charAt(pos))) {
                            result0 = input.charAt(pos);
                            pos++;
                          } else {
                            result0 = null;
                            if (reportFailures === 0) {
                              matchFailed("[\\u2070-\\u218F]");
                            }
                          }
                          if (result0 === null) {
                            if (/^[\u2C00-\u2FEF]/.test(input.charAt(pos))) {
                              result0 = input.charAt(pos);
                              pos++;
                            } else {
                              result0 = null;
                              if (reportFailures === 0) {
                                matchFailed("[\\u2C00-\\u2FEF]");
                              }
                            }
                            if (result0 === null) {
                              if (/^[\u3001-\uD7FF]/.test(input.charAt(pos))) {
                                result0 = input.charAt(pos);
                                pos++;
                              } else {
                                result0 = null;
                                if (reportFailures === 0) {
                                  matchFailed("[\\u3001-\\uD7FF]");
                                }
                              }
                              if (result0 === null) {
                                if (/^[\uF900-\uFDCF]/.test(input.charAt(pos))) {
                                  result0 = input.charAt(pos);
                                  pos++;
                                } else {
                                  result0 = null;
                                  if (reportFailures === 0) {
                                    matchFailed("[\\uF900-\\uFDCF]");
                                  }
                                }
                                if (result0 === null) {
                                  if (/^[\uFDF0-\uFFFD]/.test(input.charAt(pos))) {
                                    result0 = input.charAt(pos);
                                    pos++;
                                  } else {
                                    result0 = null;
                                    if (reportFailures === 0) {
                                      matchFailed("[\\uFDF0-\\uFFFD]");
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_NameChar() {
        var result0;
        
        result0 = parse_NameStartChar();
        if (result0 === null) {
          if (input.charCodeAt(pos) === 45) {
            result0 = "-";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"-\"");
            }
          }
          if (result0 === null) {
            if (input.charCodeAt(pos) === 46) {
              result0 = ".";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\".\"");
              }
            }
            if (result0 === null) {
              if (/^[0-9]/.test(input.charAt(pos))) {
                result0 = input.charAt(pos);
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("[0-9]");
                }
              }
              if (result0 === null) {
                if (/^[\xB7]/.test(input.charAt(pos))) {
                  result0 = input.charAt(pos);
                  pos++;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("[\\xB7]");
                  }
                }
                if (result0 === null) {
                  if (/^[\u0300-\u036F]/.test(input.charAt(pos))) {
                    result0 = input.charAt(pos);
                    pos++;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("[\\u0300-\\u036F]");
                    }
                  }
                  if (result0 === null) {
                    if (/^[\u203F-\u2040]/.test(input.charAt(pos))) {
                      result0 = input.charAt(pos);
                      pos++;
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("[\\u203F-\\u2040]");
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_Name() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_NameStartChar();
        if (result0 !== null) {
          result1 = [];
          result2 = parse_NameChar();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_NameChar();
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, startchar, chars) {
        		return startchar + chars.join('');
        	})(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      
      function cleanupExpected(expected) {
        expected.sort();
        
        var lastExpected = null;
        var cleanExpected = [];
        for (var i = 0; i < expected.length; i++) {
          if (expected[i] !== lastExpected) {
            cleanExpected.push(expected[i]);
            lastExpected = expected[i];
          }
        }
        return cleanExpected;
      }
      
      function computeErrorPosition() {
        /*
         * The first idea was to use |String.split| to break the input up to the
         * error position along newlines and derive the line and column from
         * there. However IE's |split| implementation is so broken that it was
         * enough to prevent it.
         */
        
        var line = 1;
        var column = 1;
        var seenCR = false;
        
        for (var i = 0; i < Math.max(pos, rightmostFailuresPos); i++) {
          var ch = input.charAt(i);
          if (ch === "\n") {
            if (!seenCR) { line++; }
            column = 1;
            seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            line++;
            column = 1;
            seenCR = true;
          } else {
            column++;
            seenCR = false;
          }
        }
        
        return { line: line, column: column };
      }
      
      
      	var expressionSimplifier = function(left, right, rightTypeIndex, rightPartIndex)
      	{
      		var  i, j
      			,result = {
      				type: '',
      				args: []
      			}
      		;
      
      		result.args.push(left);
      		for(i = 0; i < right.length; i++)
      		{
      			switch(typeof rightTypeIndex)
      			{
      				case 'string':
      					result.type = rightTypeIndex;
      					break;
      
      				case 'object':
      					result.type = right[i][rightTypeIndex[0]];
      					for(j=1; j < rightTypeIndex.length; j++)
      					{
      						result.type = result.type[rightTypeIndex[j]];
      					}
      					break;
      
      				default:
      					result.type = right[i][rightTypeIndex];
      					break;
      			}
      			result.args.push(
      				(typeof rightPartIndex == 'undefined') ? right[i] : right[i][rightPartIndex]
      			);
      			
      			result = {
      				type: '',
      				args:[
      					result
      				]
      			};
      		}
      		
      		return result.args[0];
      	}
      	
      	,predicateExpression = function(expr, axis, predicate, predicateIndex)
      	{
      		var predicates = [];
      		
      		if (predicate.length < 1)
      		{
      			return expr;
      		}
      		
      		for (i=0; i < predicate.length; i++)
      		{
      			predicates.push(predicate[i][predicateIndex]);
      		}
      		
      		return {
      			type: 'predicate',
      			args: [
      				axis,
      				expr,
      				predicates
      			]
      		}
      	}
      
      	// Track all namespace prefixes used in the expression
      	,nsPrefixes = []
      	
      	,trackNsPrefix = function(ns)
      	{
      		var  i
      			,nsPrefixExists = false
      		;
      		
      		if (ns === null) return;
      
      		// add namespace to the list of namespaces
      		for (i = 0; i < nsPrefixes.length; i++) {
      			if (nsPrefixes[i] === ns) {
      				nsPrefixExists = true;
      				break;
      			}
      		}
      
      		if (!nsPrefixExists)
      		{
      			nsPrefixes.push(ns);
      		}
      	}
      	
      	,lastQNameParsed
      	,nodeTypeNames = [
      		'comment',
      		'text',
      		'processing-instruction',
      		'node'
      	]
      	,expandSlashAbbrev = function(slash, left, right)
      	{
      		if (slash == '/')
      		{
      			return {
      				type: '/',
      				args: [
      					left,
      					right
      				]
      			};
      		}
      		
      		// slash == '//'
      		return {
      			type: '/',
      			args: [
      				{
      					type: '/',
      					args: [
      						left,
      						{
      							type: 'step',
      							args: [
      								'descendant-or-self',
      								{
      									type: 'nodeType',
      									args: [
      										'node',
      										[]
      									]
      								}
      							]
      						}
      					]
      				},
      				right
      			]
      		};
      	}
      	;
      
      
      var result = parseFunctions[startRule]();
      
      /*
       * The parser is now in one of the following three states:
       *
       * 1. The parser successfully parsed the whole input.
       *
       *    - |result !== null|
       *    - |pos === input.length|
       *    - |rightmostFailuresExpected| may or may not contain something
       *
       * 2. The parser successfully parsed only a part of the input.
       *
       *    - |result !== null|
       *    - |pos < input.length|
       *    - |rightmostFailuresExpected| may or may not contain something
       *
       * 3. The parser did not successfully parse any part of the input.
       *
       *   - |result === null|
       *   - |pos === 0|
       *   - |rightmostFailuresExpected| contains at least one failure
       *
       * All code following this comment (including called functions) must
       * handle these states.
       */
      if (result === null || pos !== input.length) {
        var offset = Math.max(pos, rightmostFailuresPos);
        var found = offset < input.length ? input.charAt(offset) : null;
        var errorPosition = computeErrorPosition();
        
        throw new this.SyntaxError(
          cleanupExpected(rightmostFailuresExpected),
          found,
          offset,
          errorPosition.line,
          errorPosition.column
        );
      }
      
      return result;
    },
    
    /* Returns the parser source code. */
    toSource: function() { return this._source; }
  };
  
  /* Thrown when a parser encounters a syntax error. */
  
  result.SyntaxError = function(expected, found, offset, line, column) {
    function buildMessage(expected, found) {
      var expectedHumanized, foundHumanized;
      
      switch (expected.length) {
        case 0:
          expectedHumanized = "end of input";
          break;
        case 1:
          expectedHumanized = expected[0];
          break;
        default:
          expectedHumanized = expected.slice(0, expected.length - 1).join(", ")
            + " or "
            + expected[expected.length - 1];
      }
      
      foundHumanized = found ? quote(found) : "end of input";
      
      return "Expected " + expectedHumanized + " but " + foundHumanized + " found.";
    }
    
    this.name = "SyntaxError";
    this.expected = expected;
    this.found = found;
    this.message = buildMessage(expected, found);
    this.offset = offset;
    this.line = line;
    this.column = column;
  };
  
  result.SyntaxError.prototype = Error.prototype;
  
  return result;
})();
