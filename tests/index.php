<!DOCTYPE html>
<html>
	<head>
		<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
		<title>xpath-test</title>
		
		<link rel="stylesheet" href="https://yui-s.yahooapis.com/3.5.0/build/cssreset/cssreset.css" type="text/css" />
		<link rel="stylesheet" href="https://yui-s.yahooapis.com/3.5.0/build/cssfonts/cssfonts.css" type="text/css" />
		<link rel="stylesheet" href="https://yui-s.yahooapis.com/3.5.0/build/cssbase/cssbase.css" type="text/css" />
		
		<script src="https://yui-s.yahooapis.com/3.5.0/build/yui/yui-min.js" type="text/javascript"></script>
		<script src="run.js" type="text/javascript"></script>
		
		<style type="text/css">
			.setting-current td,
			.setting-current th {
				background-color: #00FF11;
			}
		</style>
	</head>
	<body class="yui3-skin-sam">
		<p>
			<table>
				<tr>
					<th>&nbsp;</th>
					<th>Use Native</th>
					<th>Serve as "application/xhtml+xml"</th>
				</tr>
				<tr class="setting00">
					<th><a href="?native=0&amp;xml=0">Run</a></th>
					<td>No</td>
					<td>No</td>
				</tr>
				<tr class="setting10">
					<th><a href="?native=1&amp;xml=0">Run</a></th>
					<td>Yes</td>
					<td>No</td>
				</tr>
				<tr class="setting01">
					<th><a href="?native=0&amp;xml=1">Run</a></th>
					<td>No</td>
					<td>Yes</td>
				</tr>
				<tr class="setting11">
					<th><a href="?native=1&amp;xml=1">Run</a></th>
					<td>Yes</td>
					<td>Yes</td>
				</tr>
			</table>
		</p>
		<div id="testLogger"></div>
		<div id="testContainer"></div>
	</body>
</html>
