/* global define, describe, xdescribe, require, it, xit, before, after, beforeEach, afterEach, expect, Blob, doc, win, docEvaluate, DOMException, XPathException, documentEvaluate, documentCreateExpression, documentCreateNSResolver, checkNodeResult, checkNodeResultNamespace, parseNamespacesFromAttributes, window, filterAttributes, loadXMLFile, helpers, XPathJS*/
"use strict";

describe('Comparison operator', function() {

    it('correctly evaluates = and !=', function() {
        var result, input, i, expr, j, k,
            ops = ['=', '!='];

        input = [
            [
                ["1", "1"],
                [true, false], doc
            ],
            [
                ["1", "0"],
                [false, true], doc
            ],
            [
                ["1", "'1'"],
                [true, false], doc
            ],
            [
                ["1", "'0'"],
                [false, true], doc
            ],
            [
                ["1", "true()"],
                [true, false], doc
            ],
            [
                ["1", "false()"],
                [false, true], doc
            ],
            [
                ["0", "false()"],
                [true, false], doc
            ],
            [
                ["-10", "*"],
                [false, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')
            ],
            [
                ["4", "*"],
                [true, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')
            ],
            [
                ["4.3", "*"],
                [false, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')
            ],
            [
                ["0", "*"],
                [false, false], doc.getElementById('ComparisonOperatorCaseNodesetEmpty')
            ],

            [
                ["true()", "true()"],
                [true, false], doc
            ],
            [
                ["false()", "false()"],
                [true, false], doc
            ],
            [
                ["true()", "false()"],
                [false, true], doc
            ],
            [
                ["true()", "'1'"],
                [true, false], doc
            ],
            [
                ["true()", "''"],
                [false, true], doc
            ],
            [
                ["false()", "'0'"],
                [false, true], doc
            ],
            [
                ["false()", "''"],
                [true, false], doc
            ],
            [
                ["true()", "*"],
                [true, false], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')
            ],
            [
                ["false()", "*"],
                [false, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')
            ],
            [
                ["true()", "*"],
                [false, true], doc.getElementById('ComparisonOperatorCaseNodesetEmpty')
            ],
            [
                ["false()", "*"],
                [true, false], doc.getElementById('ComparisonOperatorCaseNodesetEmpty')
            ],

            [
                ["'1a'", "'1a'"],
                [true, false], doc
            ],
            [
                ["'1'", "'0'"],
                [false, true], doc
            ],
            [
                ["''", "''"],
                [true, false], doc
            ],
            [
                ["''", "'0'"],
                [false, true], doc
            ],
            [
                ["'aaa'", "*"],
                [true, true], doc.getElementById('ComparisonOperatorCaseNodesetStrings')
            ],
            [
                ["'bb'", "*"],
                [false, true], doc.getElementById('ComparisonOperatorCaseNodesetStrings')
            ],
            [
                ["''", "*"],
                [false, true], doc.getElementById('ComparisonOperatorCaseNodesetStrings')
            ],
            [
                ["''", "*"],
                [false, false], doc.getElementById('ComparisonOperatorCaseNodesetEmpty')
            ],

            [
                ["id('ComparisonOperatorCaseNodesetNegative5to5')/*", "id('ComparisonOperatorCaseNodesetEmpty')/*"],
                [false, false], doc
            ],
            [
                ["id('ComparisonOperatorCaseNodesetNegative5to5')/*", "id('ComparisonOperatorCaseNodeset4to8')/*"],
                [true, true], doc
            ],
            [
                ["id('ComparisonOperatorCaseNodesetNegative5to5')/*", "id('ComparisonOperatorCaseNodeset6to10')/*"],
                [false, true], doc
            ]
        ];

        for (k = 0; k < ops.length; k++) // different operators
        {
            for (j = 0; j < 2; j++) // switch parameter order
            {
                for (i = 0; i < input.length; i++) // all cases
                {
                    expr = input[i][0][j % 2] + " " + ops[k] + " " + input[i][0][(j + 1) % 2];
                    result = documentEvaluate(expr, input[i][2], null, win.XPathResult.BOOLEAN_TYPE, null);
                    expect(result.booleanValue).to.equal(input[i][1][k]);
                }
            }
        }
    });

    it('correctly evaluates <, <=, > and >=', function() {
        var result, input, i, expr, k,
            ops = ['<', '<=', '>', '>='];

        input = [
            [
                ["1", "2"],
                [true, true, false, false], doc
            ],
            [
                ["1", "1"],
                [false, true, false, true], doc
            ],
            [
                ["1", "0"],
                [false, false, true, true], doc
            ],
            [
                ["1", "'2'"],
                [true, true, false, false], doc
            ],
            [
                ["1", "'1'"],
                [false, true, false, true], doc
            ],
            [
                ["1", "'0'"],
                [false, false, true, true], doc
            ],
            [
                ["2", "true()"],
                [false, false, true, true], doc
            ],
            [
                ["1", "true()"],
                [false, true, false, true], doc
            ],
            [
                ["1", "false()"],
                [false, false, true, true], doc
            ],
            [
                ["0", "false()"],
                [false, true, false, true], doc
            ],
            [
                ["0", "true()"],
                [true, true, false, false], doc
            ],
            [
                ["-10", "*"],
                [true, true, false, false], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')
            ],
            [
                ["10", "*"],
                [false, false, true, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')
            ],
            [
                ["5", "*"],
                [false, true, true, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')
            ],
            [
                ["2", "*"],
                [true, true, true, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')
            ],
            [
                ["0", "*"],
                [false, false, false, false], doc.getElementById('ComparisonOperatorCaseNodesetEmpty')
            ],

            [
                ["true()", "2"],
                [true, true, false, false], doc
            ],
            [
                ["true()", "1"],
                [false, true, false, true], doc
            ],
            [
                ["false()", "1"],
                [true, true, false, false], doc
            ],
            [
                ["false()", "0"],
                [false, true, false, true], doc
            ],
            [
                ["true()", "0"],
                [false, false, true, true], doc
            ],
            [
                ["true()", "true()"],
                [false, true, false, true], doc
            ],
            [
                ["true()", "false()"],
                [false, false, true, true], doc
            ],
            [
                ["false()", "false()"],
                [false, true, false, true], doc
            ],
            [
                ["false()", "true()"],
                [true, true, false, false], doc
            ],
            [
                ["true()", "'1'"],
                [false, true, false, true], doc
            ],
            [
                ["true()", "''"],
                [false, false, false, false], doc
            ],
            [
                ["false()", "'0'"],
                [false, true, false, true], doc
            ],
            [
                ["false()", "''"],
                [false, false, false, false], doc
            ],
            [
                ["true()", "*"],
                [false, true, false, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')
            ],
            [
                ["true()", "*"],
                [false, false, true, true], doc.getElementById('ComparisonOperatorCaseNodesetEmpty')
            ],
            [
                ["false()", "*"],
                [true, true, false, false], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')
            ],
            [
                ["false()", "*"],
                [false, true, false, true], doc.getElementById('ComparisonOperatorCaseNodesetEmpty')
            ],

            [
                ["'2'", "1"],
                [false, false, true, true], doc
            ],
            [
                ["'1'", "1"],
                [false, true, false, true], doc
            ],
            [
                ["'0'", "1"],
                [true, true, false, false], doc
            ],
            [
                ["'1'", "true()"],
                [false, true, false, true], doc
            ],
            [
                ["''", "true()"],
                [false, false, false, false], doc
            ],
            [
                ["'0'", "false()"],
                [false, true, false, true], doc
            ],
            [
                ["''", "false()"],
                [false, false, false, false], doc
            ],
            [
                ["'1a'", "'1a'"],
                [false, false, false, false], doc
            ],
            [
                ["'1'", "'0'"],
                [false, false, true, true], doc
            ],
            [
                ["''", "''"],
                [false, false, false, false], doc
            ],
            [
                ["''", "'0'"],
                [false, false, false, false], doc
            ],
            [
                ["'4'", "*"],
                [true, true, true, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')
            ],
            [
                ["'aaa'", "*"],
                [false, false, false, false], doc.getElementById('ComparisonOperatorCaseNodesetStrings')
            ],
            [
                ["''", "*"],
                [false, false, false, false], doc.getElementById('ComparisonOperatorCaseNodesetEmpty')
            ],

            [
                ["*", "-10"],
                [false, false, true, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')
            ],
            [
                ["*", "10"],
                [true, true, false, false], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')
            ],
            [
                ["*", "5"],
                [true, true, false, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')
            ],
            [
                ["*", "2"],
                [true, true, true, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')
            ],
            [
                ["*", "0"],
                [false, false, false, false], doc.getElementById('ComparisonOperatorCaseNodesetEmpty')
            ],
            [
                ["*", "true()"],
                [false, true, false, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')
            ],
            [
                ["*", "true()"],
                [true, true, false, false], doc.getElementById('ComparisonOperatorCaseNodesetEmpty')
            ],
            [
                ["*", "false()"],
                [false, false, true, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')
            ],
            [
                ["*", "false()"],
                [false, true, false, true], doc.getElementById('ComparisonOperatorCaseNodesetEmpty')
            ],
            [
                ["*", "'4'"],
                [true, true, true, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')
            ],
            [
                ["*", "'aaa'"],
                [false, false, false, false], doc.getElementById('ComparisonOperatorCaseNodesetStrings')
            ],
            [
                ["*", "''"],
                [false, false, false, false], doc.getElementById('ComparisonOperatorCaseNodesetEmpty')
            ],
            [
                ["id('ComparisonOperatorCaseNodesetNegative5to5')/*", "id('ComparisonOperatorCaseNodesetEmpty')/*"],
                [false, false, false, false], doc
            ],
            [
                ["id('ComparisonOperatorCaseNodesetNegative5to5')/*", "id('ComparisonOperatorCaseNodeset4to8')/*"],
                [true, true, true, true], doc
            ],
            [
                ["id('ComparisonOperatorCaseNodesetNegative5to5')/*", "id('ComparisonOperatorCaseNodeset6to10')/*"],
                [true, true, false, false], doc
            ]
        ];

        for (k = 0; k < ops.length; k++) // different operators
        {
            for (i = 0; i < input.length; i++) // all cases
            {
                expr = input[i][0][0] + " " + ops[k] + " " + input[i][0][1];
                result = documentEvaluate(expr, input[i][2], null, win.XPathResult.BOOLEAN_TYPE, null);
                expect(result.booleanValue).to.equal(input[i][1][k]);
            }
        }
    });
});
