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

YUI().use('xpathjs-test', "node", "test-console", "test", function (Y) {
	
	//create the console
	var r = new Y.Test.Console({
		newestOnTop : false,
		style: 'inline', // to anchor in the example content
		height: '800px',
		width: '100%',
		consoleLimit: 1000,
		filters: {
			pass: true
		}
	});
	
	/**
	 * @see http://yuilibrary.com/projects/yui3/ticket/2531085
	 */
	Y.Console.FOOTER_TEMPLATE = Y.Console.FOOTER_TEMPLATE.replace('id="{id_guid}">', 'id="{id_guid}" />');

	r.render('#testLogger');

	Y.Test.Runner.add(Y.xpathjs.test.DomXPathSuite);

	//run the tests
	Y.Test.Runner.run();
});
