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

{
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
}

XPath
	= _ expr:Expr _ {
		return {
			 tree: expr
			,nsPrefixes: nsPrefixes
		}
	}

// http://www.w3.org/TR/xpath/

LocationPath // 1
	= RelativeLocationPath
	/ AbsoluteLocationPath

AbsoluteLocationPath // 2
	= AbbreviatedAbsoluteLocationPath
	/ '/' path:(_ RelativeLocationPath)? {
		return {
			 type: '/'
			,args: [
				null,
				(path) ? path[1] : null
			]
		};
	}

RelativeLocationPath // 3, 11
	= expr:Step repeatedExpr:( _ ('//' / '/') _ Step)* {
		var i;
		
		for(i=0; i < repeatedExpr.length; i++)
		{
			expr = expandSlashAbbrev(repeatedExpr[i][1], expr, repeatedExpr[i][3]);
		}
		
		return expr;
	}

Step // 4
	= axis:AxisSpecifier _ node:NodeTest predicate:(_ Predicate)* {
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
	}
	/ AbbreviatedStep

AxisSpecifier // 5
	= axis:AxisName _ '::' {
		return axis;
	}
	/ aas:AbbreviatedAxisSpecifier {
		return (aas.length) ? aas : 'child';
	}

AxisName // 6
	= 'ancestor-or-self'
	/ 'ancestor'
	/ 'attribute'
	/ 'child'
	/ 'descendant-or-self'
	/ 'descendant'
	/ 'following-sibling'
	/ 'following'
	/ 'namespace'
	/ 'parent'
	/ 'preceding-sibling'
	/ 'preceding'
	/ 'self'

NodeTest // 7
	= nodeType:NodeType _ '(' _ ')' {
		return {
			 type: 'nodeType'
			,args: [
				nodeType,
				[]
			]
		};
	}
	/ pi:'processing-instruction' _ '(' _ arg:Literal _ ')' {
		return {
			 type: 'nodeType'
			,args: [
				pi,
				[arg]
			]
		};
	}
	/ nt:NameTest {
		return nt;
	}

Predicate // 8
	= '[' _ expr:PredicateExpr _ ']' {
		return expr;
	}

PredicateExpr // 9
	= Expr

AbbreviatedAbsoluteLocationPath // 10
	= '//' _ path:RelativeLocationPath {
		return expandSlashAbbrev('//', null, path);
	}

AbbreviatedStep // 12
	= abbrev:('..' / '.') {
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
	}

AbbreviatedAxisSpecifier // 13
	= attribute:'@'? {
		return (attribute) ? 'attribute' : '';
	}

Expr // 14
	= expr:OrExpr {
		return expr;
	}

PrimaryExpr // 15
	= vr:VariableReference {
		return vr;
	}
	/ '(' _ expr:Expr _ ')' {
		return expr;
	}
	/ l:Literal {
		return l;
	}
	/ n:Number {
		return n;
	}
	/ FunctionCall

FunctionCall // 16
	= name:FunctionName _ '(' arg:( _ Argument ( _ ',' _ Argument )* )? _ ')' {
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
	}

Argument // 17
	= Expr

UnionExpr // 18
	= expr:PathExpr repeatedExpr:( _ '|' _ PathExpr)* {
		return expressionSimplifier(expr, repeatedExpr, 1, 3);
	}

PathExpr // 19
	= expr:FilterExpr path:( _ ('//' / '/') _ RelativeLocationPath)? {
		if (!path)
			return expr;
		
		return expandSlashAbbrev(path[1], expr, path[3]);
	}
	/ path:LocationPath {
		return path;
	}

FilterExpr // 20
	= expr:PrimaryExpr repeatedExpr:(_ Predicate)* {
		return predicateExpression(expr, 'child', repeatedExpr, 1);
	}

OrExpr // 21
	= expr:AndExpr repeatedExpr:(_ 'or' _ AndExpr)* {
		return expressionSimplifier(expr, repeatedExpr, 1, 3);
	}

AndExpr // 22
	= expr:EqualityExpr repeatedExpr:(_ 'and' _ EqualityExpr)* {
		return expressionSimplifier(expr, repeatedExpr, 1, 3);
	}

EqualityExpr // 23
	= expr:RelationalExpr repeatedExpr:( _ ('=' / '!=') _ RelationalExpr)* {
		return expressionSimplifier(expr, repeatedExpr, 1, 3);
	}

RelationalExpr // 24
	= expr:AdditiveExpr repeatedExpr:( _ ('<=' / '<' / '>=' / '>') _ AdditiveExpr)* {
		return expressionSimplifier(expr, repeatedExpr, 1, 3);
	}

AdditiveExpr // 25
	= expr:MultiplicativeExpr repeatedExpr:( _ ('+' / '-') _ MultiplicativeExpr )* {
		return expressionSimplifier(expr, repeatedExpr, 1, 3);
	}

MultiplicativeExpr // 26
	= expr:UnaryExpr repeatedExpr:( _ ( MultiplyOperator / 'div' / 'mod' ) _ UnaryExpr )* {
		return expressionSimplifier(expr, repeatedExpr, 1, 3);
	}

UnaryExpr // 27
	= expr:UnionExpr {
		return expr;
	}
	/ '-' _ expr:UnaryExpr {
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
	}

/*
ExprToken // 28 (not used)
	= '(' \ ')' \ '[' \ ']' \ '.' \ '..' \ '@' \ ',' \ '::'	
			\ NameTest	
			\ NodeType	
			\ Operator	
			\ FunctionName	
			\ AxisName	
			\ Literal	
			\ Number	
			\ VariableReference
*/

Literal // 29
	= '"' literals:[^"]* '"' {
		return {
			type: 'string',
			args: [
				literals.join('')
			]
		};
	}
	/ '\'' literals:[^']* '\'' {
		return {
			type: 'string',
			args: [
				literals.join('')
			]
		};
	}

Number // 30
	= digits:Digits decimals:('.' Digits?)? {
		return {
			 type: 'number'
			,args: [
				(decimals) ? parseFloat(digits + '.' + decimals[1]) : parseInt(digits)
			]
		};
	}
	/ '.' digits:Digits {
		return {
			type: 'number',
			args: [
				parseFloat('.' + digits)
			]
		};
	}

Digits // 31
	= digits:[0-9]+ {
		return digits.join('');
	}

/*
Operator // 32 (not used)
	= OperatorName	
			\ MultiplyOperator	
			\ '/' \ '//' \ '|' \ '+' \ '-' \ '=' \ '!=' \ '<' \ '<=' \ '>' \ '>='	

OperatorName // 33 (not used)
	= 'and' \ 'or' \ 'mod' \ 'div'
*/

MultiplyOperator // 34
	= '*'

FunctionName // 35
	= name:QName & { // - NodeType
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
	} {
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
	}

VariableReference // 36
	= '$' name:QName {
		trackNsPrefix(name.args[0]);
		
		return {
			 type: '$'
			,args: [
				name
			]
		};
	}

NameTest // 37
	= '*' {
		return {
			 type: 'name'
			,args: [
				null,
				null
			]
		};
	}
	/ ns:NCName ':' '*' {
		trackNsPrefix(ns);
		return {
			 type: 'name'
			,args: [
				ns,
				null
			]
		};
	}
	/ name:QName {
		trackNsPrefix(name.args[0]);
		return name;
	}

NodeType // 38
	= 'comment'
	/ 'text'
	/ 'processing-instruction'
	/ 'node'

ExprWhitespace // 39
	= S



// http://www.w3.org/TR/REC-xml/#NT-S

S // 3
	= [\u0020\u0009\u000D\u000A]+

_ // optional space
	= S?

// http://www.w3.org/TR/REC-xml-names/#NT-QName

QName // 7
	= name:(PrefixedName / UnprefixedName) {
		lastQNameParsed = name;
		return name;
	}

PrefixedName // 8
	= ns:Prefix ':' name:LocalPart {
		return {
			 type: 'name'
			,args: [
				ns,
				name
			]
		};
	}

UnprefixedName // 9
	= name:LocalPart {
		return {
			 type: 'name'
			,args: [
				null,
				name
			]
		};
	}

Prefix // 10
	= NCName

LocalPart // 11
	= NCName



// http://www.w3.org/TR/REC-xml-names/#NT-NCName

NCName // 4
	= name:Name // - (Char* ':' Char*)
/* An XML Name, minus the ': */



// http://www.w3.org/TR/REC-xml/#NT-Name

NameStartChar // 4 (without ':')
	= [A-Z]
	/ '_'
	/ [a-z]
	/ [\u00C0-\u00D6]
	/ [\u00D8-\u00F6]
	/ [\u00F8-\u02FF]
	/ [\u0370-\u037D]
	/ [\u037F-\u1FFF]
	/ [\u200C-\u200D]
	/ [\u2070-\u218F]
	/ [\u2C00-\u2FEF]
	/ [\u3001-\uD7FF]
	/ [\uF900-\uFDCF]
	/ [\uFDF0-\uFFFD]
	
	/* ECMAScript Language Specifiction defines UnicodeEscapeSequence as
	 * "\u HexDigit HexDigit HexDigit HexDigit" and while we could use
	 * surrogate pairs, no browser supports surrogate pairs natively
	 * in regular expression or otherwise, so avoid including them for now.
	 * 
	 * Also PegJS (v0.6.2) doesn't support parsing of unicode expression (\u) longer than 4 chars
	 * 
	 * @see http://stackoverflow.com/questions/3744721/javascript-strings-outside-of-the-bmp
	 */
	// [\u10000-\uEFFFF]

NameChar // 4a
	= NameStartChar
	/ '-'
	/ '.'
	/ [0-9]
	/ [\u00B7]
	/ [\u0300-\u036F]
	/ [\u203F-\u2040]

Name // 5
	= startchar:NameStartChar chars:(NameChar)* {
		return startchar + chars.join('');
	}
