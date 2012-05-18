<?php
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

$serve_xml = !empty($_GET['xml']);

if ($serve_xml)
	header('Content-Type: application/xhtml+xml');
?>
<!DOCTYPE html>
<!-- some comment -->
<html xml:lang="en-us" xmlns="http://www.w3.org/1999/xhtml" xmlns:ev="http://some-namespace.com/nss">
	<head>
		<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
		<title>xpath-test</title>
	</head>
	<body class="yui3-skin-sam">
		<div id="testXPathNSResolver">
			<div id="testXPathNSResolverNode" xmlns:xforms="http://www.w3.org/2002/xforms">
				<div xmlns="http://www.w3.org/TR/REC-html40">
					<div></div>
				</div>
				<xforms:model>
				  <xforms:instance>
				    <ecommerce xmlns="">
				      <method/>
				      <number/>
				      <expiry/>
				    </ecommerce>
				  </xforms:instance>
				  <xforms:submission action="http://example.com/submit" method="post" id="submit" includenamespaceprefixes=""/>
				</xforms:model>
			</div>
		</div>
		<div id="testXPathEvaluate">
			<div>some text</div>
		</div>
		
		<div id="testLang" xml:lang="sr-Cyrl-bg">
			<div lang="fr">
				<div id="testLang2"></div>
			</div>
			<div id="testLang3" xml:lang="sl"></div>
			<div id="testLang4"></div>
		</div>
		
		<div id="testFunctionNodeset">
			<div id="testFunctionNodeset2">
				<p>1</p>
				<p>2</p>
				<p>3</p>
				<p>4</p>
			</div>
			
			<div id="testFunctionNodesetElement">aaa</div>
			<div id="testFunctionNodesetElementPrefix"><ev:div2></ev:div2></div>
			<div id="testFunctionNodesetElementNested"><span>bbb</span>sss<span></span><div>ccc<span>ddd</span></div></div>
			<div id="testFunctionNodesetComment"><!-- hello world --></div>
			<div id="testFunctionNodesetText">here is some text</div>
			<div id="testFunctionNodesetProcessingInstruction"><?php echo '<?xml-stylesheet type="text/xml" href="test.xsl"?>' ?></div>
			<div id="testFunctionNodesetCData"><![CDATA[some cdata]]></div>
			<div id="testFunctionNodesetAttribute" ev:class="123" width="  1   00%  "></div>
			<div id="testFunctionNodesetNamespace" xmlns:asdf="http://www.123.com/"></div>
		</div>
		
		<div id="FunctionStringCase">
			<div id="FunctionStringCaseStringNodesetElement">aaa</div>
			<div id="FunctionStringCaseStringNodesetElementNested"><span>bbb</span>sss<span></span><div>ccc<span>ddd</span></div></div>
			<div id="FunctionStringCaseStringNodesetComment"><!-- hello world --></div>
			<div id="FunctionStringCaseStringNodesetText">here is some text</div>
			<div id="FunctionStringCaseStringNodesetProcessingInstruction"><?php echo '<?xml-stylesheet type="text/xml" href="test.xsl"?>' ?></div>
			<div id="FunctionStringCaseStringNodesetCData"><![CDATA[some cdata]]></div>
			<div id="FunctionStringCaseStringNodesetAttribute" class="123" width="  1   00%  "></div>
			<div id="FunctionStringCaseStringNodesetNamespace" xmlns:asdf="http://www.123.com/"></div>
			<div id="FunctionStringCaseStringLength1"></div>
			<div id="FunctionStringCaseStringLength2">asdf</div>
			<div id="FunctionStringCaseStringNormalizeSpace1"></div>
			<div id="FunctionStringCaseStringNormalizeSpace2">   </div>
			<div id="FunctionStringCaseStringNormalizeSpace3">  a  b  </div>
			<div id="FunctionStringCaseStringNormalizeSpace4">  a 
				 bc  c
			</div>
		</div>
		
		<div id="FunctionNumberCase">
			<div id="FunctionNumberCaseNumber">123</div>
			<div id="FunctionNumberCaseNotNumber">  a a  </div>
			<div id="FunctionNumberCaseNumberMultiple">
				<div>-10</div>
				<div>11</div>
				<div>99</div>
			</div>
			<div id="FunctionNumberCaseNotNumberMultiple">
				<div>-10</div>
				<div>11</div>
				<div>a</div>
			</div>
		</div>
		
		<div id="XPathExpressionEvaluateCase">
			<div id="testContextNodeParameter" style="display:block;">
				<div id="testContextNodeParameterText">some text</div>
				<div id="testContextNodeParameterCData"><![CDATA[aa<strong>some text</strong>]]></div>
				<div id="testContextNodeParameterComment"><!-- here is comment --></div>
				<div id="testContextNodeParameterProcessingInstruction"><?php echo '<?xml-stylesheet type="text/xml" href="test.xsl"?>' ?></div>
				<div id="testContextNodeParameterNamespace" xmlns:asdf="http://some-namespace/"></div>
			</div>
		</div>
		
		<div id="StepAxisCase">
			
			<div id="testStepAxisNodeElement"></div>
			<div id="testStepAxisNodeAttribute" style="sss:asdf;" width="100%"></div>
			<div id="testStepAxisNodeCData"><![CDATA[aa<strong>some text</strong>]]><div></div>asdf</div>
			<div id="testStepAxisNodeComment"><!-- here is comment --><div></div>asdf</div>
			<div id="testStepAxisNodeProcessingInstruction"><?php echo '<?xml-stylesheet type="text/xml" href="test.xsl"?>' ?><div></div>asdf</div>
			<div id="testStepAxisNodeNamespace" xmlns:asdf="http://some-namespace/" width="100%"></div>
			
			<div id="testStepAxisChild">
				some text
				<![CDATA[aa<strong>some text</strong>]]>
				<div></div>
				<div></div>
				<div></div>
				<div></div>
				<div></div>
			</div>
			
			<div id="testStepAxisDescendant">
				<div>
					<div></div>
					<div></div>
					<div></div>
					<div>
						<div></div>
						<div></div>
						<!-- here is comment -->
					</div>
				</div>
				<div></div>
			</div>
			
			<div id="testStepAxisAttribute">
				<div id="testStepAxisNodeAttribute0"></div>
				<div id="testStepAxisNodeAttribute1" class="test 123"></div>
				<div id="testStepAxisNodeAttribute3" style="aaa" class="test 123" width="100%"></div>
				<div id="testStepAxisNodeAttributeStartXml" xmlnswidth="100%" xml="sss"></div>
				
				<div id="testStepAxisNodeNamespace0"></div>
				<div id="testStepAxisNodeNamespace1" xmlns:a="asdf"></div>
				<div id="testStepAxisNodeNamespace1b" xmlns:a="asdf"></div>
				<div id="testStepAxisNodeNamespace1defaultContainer"><div xmlns="asdf"></div></div>
				<div id="testStepAxisNodeNamespace1defaultContainer2"><div xmlns=""></div></div>
				<div id="testStepAxisNodeNamespace3" xmlns:a="asdf" xmlns:b="asdf2" xmlns:c="asdf3"></div>
				<div id="testStepAxisNodeNamespace3defaultContainer"><div xmlns:a="asdf" xmlns="asdf2" xmlns:c="asdf3"></div></div>
				<div id="testStepAxisNodeNamespaceXmlOverride" xmlns:ev="http://some-other-namespace/"></div>
				
				<div id="testStepAxisNodeAttrib1Ns1" class="test 123" xmlns:a="asdf"></div>
				<div id="testStepAxisNodeAttrib1Ns1reversed" xmlns:a="asdf" class="test 123"></div>
				<div id="testStepAxisNodeAttrib2Ns1" style="aaa" class="test 123" xmlns:c="asdf3"></div>
				<div id="testStepAxisNodeAttrib2Ns1reversedContainer"><div style="aaa" xmlns="asdf" class="test 123"></div></div>
				<div id="testStepAxisNodeAttrib2Ns2Container"><div xmlns:a="asdf" xmlns="asdf2" style="aaa" class="test 123"></div></div>
			</div>
		</div>
			
		<div id="FunctionNodesetIdCase">
			<div id="FunctionNodesetIdCaseSimple"></div>
			<div id="FunctionNodesetIdCaseNoDefaultNamespaceContainer"><div id="FunctionNodesetIdCaseNoDefaultNamespace" xmlns=""></div></div>
			<div id="FunctionNodesetIdCaseXhtmlDefaultNamespaceContainer"><div id="FunctionNodesetIdCaseXhtmlDefaultNamespace" xmlns="http://www.w3.org/1999/xhtml"></div></div>
			<div id="FunctionNodesetIdCaseXhtmlNamespaceContainer"><div xhtml:id="FunctionNodesetIdCaseXhtmlNamespace" xmlns:xhtml="http://www.w3.org/1999/xhtml"></div></div>
			<div id="FunctionNodesetIdCaseXhtmlNamespaceParentContainer" xmlns:xhtml="http://www.w3.org/1999/xhtml"><div xhtml:id="FunctionNodesetIdCaseXhtmlNamespaceParent"></div></div>
			<div id="FunctionNodesetIdXmlNamespaceContainer"><div xml:id="FunctionNodesetIdXmlNamespace" xmlns=""></div></div>
			
			<div>
				<div id="FunctionNodesetIdCaseMultiple1"></div>
				<div id="FunctionNodesetIdCaseMultiple2"></div>
				<div id="FunctionNodesetIdCaseMultiple3"></div>
				<div id="FunctionNodesetIdCaseMultiple4"></div>
			</div>
		
			<div id="FunctionNodesetIdCaseNodeset"><p>FunctionNodesetIdCaseMultiple2</p><p>FunctionNodesetIdCaseMultiple1</p><p>FunctionNodesetIdCaseMultiple2 FunctionNodesetIdCaseMultiple4</p><p>FunctionNodesetIdCaseMultiple3</p></div>
		</div>
		
		<div id="StepNodeTestNodeTypeCase">
			some text
			<div></div>
			<div>
				<div></div>
			</div>
			<!-- comment --><!-- comment -->
			asdf
			asdfsdf sdf 
			<div></div>
			<?php echo '<?xml-stylesheet type="text/xml" href="test.xsl"?>' ?>
			<div></div>
			sdfsdf
			<![CDATA[aa<strong>some text</strong>]]>
			<!-- comment -->
			<div></div>
			<?php echo '<?custom-process-instruct type="text/xml" href="test.xsl"?>' ?>
			<div></div>
		</div>
		
		<div id="StepNodeTestCaseNameTest">
			<div id="StepNodeTestCaseNameTestAttribute" ev:attrib1="value" ev:attrib2="value2" xml:attrib2="something" xml:sss="something2" attrib3="asdf" xmlns:ns2="http://asdf/" ns2:attrib4="Hello world"></div>
			<div id="StepNodeTestCaseNameTestNamespace" xmlns:ns1="test-123" xmlns:ns2="http://asdf/" ev:attrib1="value" xml:attrib2="something" attrib3="asdf"></div>
			<div id="StepNodeTestCaseNameTestChild"><div xmlns="http://asdf/"></div><ev:div xmlns:ev="http://asdf/"></ev:div><ev:span xmlns:ev="http://asdf/"></ev:span>
				<div></div>
				asdf
				<!-- asdf -->
				asdf
				<div></div>
				
				<div></div>
				asas
				<div></div>
			</div>
			
			<div id="StepNodeTestCaseNameTest1">
				<div id="StepNodeTestCaseNameTest2">
					<div id="StepNodeTestCaseNameTest3"></div>
				</div>
			</div>
			
			<div id="StepNodeTestCaseNameTestNoNamespace"><div xmlns=""><div><div></div></div></div></div>
		</div>
		
		<div id="LocationPathCase">
			<div id="LocationPathCaseText">some text</div>
			<div id="LocationPathCaseComment"><!-- some comment --></div>
			<div id="LocationPathCaseCData"><![CDATA[some cdata]]></div>
			<div id="LocationPathCaseProcessingInstruction"><?php echo '<?xml-stylesheet type="text/xml" href="test.xsl"?>' ?></div>
			<div id="LocationPathCaseAttribute" class="123" width="100%"></div>
			<div id="LocationPathCaseNamespace" xmlns:asdf="http://www.123.com/"></div>
			
			<div id="LocationPathCaseDuplicates"></div>
			
			<div id="LocationPathCaseAttributeParent"><div attr="aa"></div><div attr="aa3a" attr2="sss"></div><div attr2="adda"></div><div attr4="aa"></div></div>
			
			<div id="LocationPathCaseNamespaceParent"><div xmlns="http://asdss/"></div><div xmlns:aa="http://saa/" xmlns:a2="hello/world" xmlns:ab="hello/world2"></div><div></div><div xmlns:aa="http://saa/"></div></div>
		</div>
		
		<div id="ComparisonOperatorCase">
			<div id="ComparisonOperatorCaseNodesetNegative5to5">
				<div>-5</div>
				<div>-4</div>
				<div>-3</div>
				<div>-2</div>
				<div>-1</div>
				<div>0</div>
				<div>1</div>
				<div>2</div>
				<div>3</div>
				<div>4</div>
				<div>5</div>
			</div>
			
			<div id="ComparisonOperatorCaseNodeset6to10">
				<div>6</div>
				<div>7</div>
				<div>8</div>
				<div>9</div>
				<div>10</div>
			</div>
			
			<div id="ComparisonOperatorCaseNodeset4to8">
				<div>4</div>
				<div>5</div>
				<div>6</div>
				<div>7</div>
				<div>8</div>
			</div>
			
			<div id="ComparisonOperatorCaseNodesetEmpty">
			</div>
			
			<div id="ComparisonOperatorCaseNodesetStrings">
				<div>aaa</div>
				<div>bbb</div>
				<div>cccccc</div>
				<div>ddd</div>
				<div>eee</div>
			</div>
		</div>
		
		<div id="UnionOperatorTestCase">
			<div id="eee10">
				<div id="eee20">
					<div>
						<div id="eee25"></div>
					</div>
				</div>
				<div id="eee30">
					<div id="eee35"></div>
					<div id="eee40" class="sss"></div>
				</div>
			</div>
			<div id="eee50"></div>
			
			<div id="nss10">
				<div id="nss20">
					<div id="nss25" xmlns:asdf="http://asdf.com/" align="right"></div>
					<div xmlns:asdf="http://asdf.com/" id="nss30"></div>
				</div>
				<div id="nss40" xmlns:asdf="sss" xmlns:asdf2="sdfsdf"></div>
			</div>
		</div>
	</body>
</html>
<!-- some comment -->
