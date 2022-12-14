export class Selector extends String {
    constructor(str) {
        super(str);
    }
    get regex() {
        return /.*/;
    }
    test(str) {
        //console.log({line:8, this: this});
        return this.regex.test(str);
    }
    exec(str) {
        return this.regex.exec(str);
    }
    execFirst(str) {
        const execFirstResult = this.exec(str)?.[0];
        console.assert(execFirstResult !== undefined, { execFirstResult });
        if (execFirstResult === undefined)
            throw new TypeError('execFirstResult may not be undefined');
        return execFirstResult;
    }
    create(str) {
        const creator = this.constructor;
        return new creator(this.execFirst(str) || '');
    }
}
export class ExecutedSelector extends Selector {
    executed;
    constructor(str) {
        super(str);
        this.executed = this.exec(str);
    }
}
export class ChildSelector extends Selector {
    get regex() {
        return /^\s*\>\s*/;
    }
}
export class AllSelector extends Selector {
    get regex() {
        return /^\*/;
    }
}
export class DescendantSelector extends Selector {
    get regex() {
        return /^\s+/;
    }
}
export class NextAdjacentSelector extends Selector {
    get regex() {
        return /^\s*\+\s*/;
    }
}
export class NextSiblingsSelector extends Selector {
    get regex() {
        return /^\s*\~\s*/;
    }
}
export class MultipleSelector extends Selector {
    get regex() {
        return /^,/;
    }
}
export class TagSelector extends ExecutedSelector {
    get regex() {
        return /^([A-Za-z][A-Za-z0-9]*)/;
    }
}
export class IdSelector extends ExecutedSelector {
    get regex() {
        return /^#([A-Za-z][A-Za-z0-9]*)/;
    }
}
export class ClassSelector extends ExecutedSelector {
    get regex() {
        return /^\.([A-Za-z][A-Za-z0-9]*)/;
    }
}
export class PseudoSelector extends ExecutedSelector {
    get regex() {
        return /^\:([A-Za-z][-A-Za-z0-9]*[A-Za-z0-9]+)/;
    }
}
export class PseudoElement extends ExecutedSelector {
    get regex() {
        return /^\:\:([A-Za-z][-A-Za-z0-9]*[A-Za-z0-9]+)/;
    }
}
export class PseudoFunctionSelector extends ExecutedSelector {
    get regex() {
        return /^\:([A-Za-z][-A-Za-z0-9]*[A-Za-z0-9]+)\(\)/;
    }
}
export class PseudoFunction1ArgQuotedSelector extends ExecutedSelector {
    get regex() {
        return /^\:([A-Za-z][-A-Za-z0-9]*[A-Za-z0-9]+)\(\"([^"]*)\"\)/;
    }
}
export class PseudoFunction1ArgSelector extends ExecutedSelector {
    get regex() {
        return /^\:(?<func>[A-Za-z][-A-Za-z0-9]*[A-Za-z0-9]+)\((?<arg>[^)]+)\)/;
    }
}
export class PseudoFunction1ArgEquationSelector extends ExecutedSelector {
    get regex() {
        return /^\:(?<func>[A-Za-z][-A-Za-z0-9]*[A-Za-z0-9]+)\(((?<signedScalar>(?<scalarSign>[+-]?)(?<scalar>\d*))?(?<varname>[a-z]+)?(?<signedOffset>(?<offsetSign>[+-])(?<offset>\d*))?)\)/;
    }
}
export class AttributeSelector extends ExecutedSelector {
    get regex() {
        return /^\[([A-Za-z][A-Za-z0-9]*)]/;
    }
}
export class AttributeEqualsSelector extends ExecutedSelector {
    get regex() {
        return /^\[([A-Za-z][A-Za-z0-9]*)=\"([^"]*)\"\]/;
    }
}
export class AttributeNotEqualsSelector extends ExecutedSelector {
    get regex() {
        return /^\[([A-Za-z][A-Za-z0-9]*)\!=\"([^"]*)\"\]/;
    }
}
export class AttributePrefixSelector extends ExecutedSelector {
    get regex() {
        return /^\[([A-Za-z][A-Za-z0-9]*)\|=\"([^"]*)\"\]/;
    }
}
export class AttributeContainsSelector extends ExecutedSelector {
    get regex() {
        return /^\[([A-Za-z][A-Za-z0-9]*)\*=\"([^"]*)\"\]/;
    }
}
export class AttributeContainsWordSelector extends ExecutedSelector {
    get regex() {
        return /^\[([A-Za-z][A-Za-z0-9]*)\~=\"([^"]*)\"\]/;
    }
}
export class AttributeEndsWithSelector extends ExecutedSelector {
    get regex() {
        return /^\[([A-Za-z][A-Za-z0-9]*)\$=\"([^"]*)\"\]/;
    }
}
export class AttributeStartsWithSelector extends ExecutedSelector {
    get regex() {
        return /^\[([A-Za-z][A-Za-z0-9]*)\^=\"([^"]*)\"\]/;
    }
}
export const listOfSelectors = [
    TagSelector, ChildSelector, AllSelector, NextAdjacentSelector, NextSiblingsSelector, DescendantSelector,
    IdSelector, ClassSelector,
    AttributeSelector, AttributeEqualsSelector, AttributeNotEqualsSelector, AttributePrefixSelector, AttributeContainsSelector, AttributeContainsWordSelector, AttributeEndsWithSelector, AttributeStartsWithSelector,
    MultipleSelector,
    PseudoFunction1ArgQuotedSelector, PseudoFunction1ArgEquationSelector, PseudoFunction1ArgSelector, PseudoFunctionSelector, PseudoSelector, PseudoElement,
];
;
function tryAllSelectors(remainingString) {
    for (const curSelectorClass of listOfSelectors) {
        const curSelector = new curSelectorClass;
        if (curSelector.test(remainingString)) {
            const tagResult = curSelector.execFirst(remainingString);
            const remainingStringReplacement = remainingString.slice(tagResult.length);
            return {
                curSelectorClass,
                curSelector,
                tagResult,
                remainingStringReplacement,
            };
        }
    }
    throw (new Error(`remainingString: ${JSON.stringify(remainingString)}`));
}
export function parseSelector(selector) {
    const ret = [];
    let remainingString = selector;
    while (remainingString.length) {
        const { curSelectorClass, curSelector, tagResult, remainingStringReplacement } = tryAllSelectors(remainingString);
        remainingString = remainingStringReplacement;
        if (curSelectorClass === DescendantSelector && (ret.length === 0 || ret[ret.length - 1] instanceof MultipleSelector)) {
        }
        else {
            ret.push(curSelector.create(tagResult || ''));
        }
    }
    //console.log({ret});
    return ret;
}
// console.log(parseSelector('body>svg'));
function testParser(...tests) {
    for (const { test, result } of tests) {
        const parsed = parseSelector(test);
        // console.log(test, parsed, result[0], (new result[0]).exec(test));
        console.assert(result.length === parsed.length);
        console.assert(parsed[0] instanceof result[0]);
        if (result.length !== parsed.length || !(parsed[0] instanceof result[0])) {
            console.log({ test, result, parsed, 'result[0]': result[0], 'parsed[0]': parsed[0], 'instanceof': parsed[0] instanceof result[0] });
            continue;
        }
    }
}
if (false)
    testParser({ test: '*', result: [AllSelector] }, { test: ':animated', result: [PseudoSelector] }, { test: '[name|="value"]', result: [AttributePrefixSelector] }, { test: '[name*="value"]', result: [AttributeContainsSelector] }, { test: '[name~="value"]', result: [AttributeContainsWordSelector] }, { test: '[name$="value"]', result: [AttributeEndsWithSelector] }, { test: '[name="value"]', result: [AttributeEqualsSelector] }, { test: '[name!="value"]', result: [AttributeNotEqualsSelector] }, { test: '[name^="value"]', result: [AttributeStartsWithSelector] }, { test: ':button', result: [PseudoSelector] }, { test: ':checkbox', result: [PseudoSelector] }, { test: ':checked', result: [PseudoSelector] }, { test: 'parent > child', result: [TagSelector, ChildSelector, TagSelector] }, { test: '.class', result: [ClassSelector] }, { test: ':contains("text")', result: [PseudoFunction1ArgQuotedSelector] }, { test: 'ancestor descendant', result: [TagSelector, DescendantSelector, TagSelector] }, { test: ':disabled', result: [PseudoSelector] }, { test: 'element', result: [TagSelector] }, { test: ':empty', result: [PseudoSelector] }, { test: ':enabled', result: [PseudoSelector] }, { test: ':nth-last-child(3n+1)', result: [PseudoFunction1ArgEquationSelector] }, { test: ':eq(1)', result: [PseudoFunction1ArgEquationSelector] }, { test: ':eq(1)', result: [PseudoFunction1ArgEquationSelector] }, { test: ':even', result: [PseudoSelector] }, { test: ':file', result: [PseudoSelector] }, { test: ':first-child', result: [PseudoSelector] }, { test: ':first-of-type', result: [PseudoSelector] }, { test: ':first', result: [PseudoSelector] }, { test: ':focus', result: [PseudoSelector] }, { test: ':gt(1)', result: [PseudoFunction1ArgEquationSelector] }, { test: '[name]', result: [AttributeSelector] }, 
    //{test: ':has(body>svg)', result: [AllSelector]},//jQuery Extension, nested selector
    { test: ':header', result: [PseudoSelector] }, { test: ':hidden', result: [PseudoSelector] }, { test: '#id', result: [IdSelector] }, { test: ':image', result: [PseudoSelector] }, { test: ':input', result: [PseudoSelector] }, { test: ':lang(en-us)', result: [PseudoFunction1ArgSelector] }, { test: ':last-child', result: [PseudoSelector] }, { test: ':last-of-type', result: [PseudoSelector] }, { test: ':last', result: [PseudoSelector] }, { test: ':lt(1)', result: [PseudoFunction1ArgEquationSelector] }, { test: '[name="value"][name2="value2"]', result: [AttributeEqualsSelector, AttributeEqualsSelector] }, { test: 'selector1, selector2, selectorN', result: [TagSelector, MultipleSelector, TagSelector, MultipleSelector, TagSelector] }, { test: 'prev + next', result: [TagSelector, NextAdjacentSelector, TagSelector] }, { test: 'prev ~ siblings', result: [TagSelector, NextSiblingsSelector, TagSelector] }, 
    //{test: ':not(div>a:not(a:empty))', result: [PseudoFunction1ArgSelector]},//nested selector
    { test: ':nth-child(4n)', result: [PseudoFunction1ArgEquationSelector] }, { test: ':nth-last-child(3)', result: [PseudoFunction1ArgEquationSelector] }, { test: ':nth-last-of-type(2)', result: [PseudoFunction1ArgEquationSelector] }, { test: ':nth-of-type(1)', result: [PseudoFunction1ArgEquationSelector] }, { test: ':odd', result: [PseudoSelector] }, { test: ':only-child', result: [PseudoSelector] }, { test: ':only-of-type', result: [PseudoSelector] }, { test: ':parent', result: [PseudoSelector] }, { test: ':radio', result: [PseudoSelector] }, { test: ':reset', result: [PseudoSelector] }, { test: ':root', result: [PseudoSelector] }, { test: ':selected', result: [PseudoSelector] }, { test: ':submit', result: [PseudoSelector] }, { test: ':target', result: [PseudoSelector] }, { test: ':text', result: [PseudoSelector] }, { test: ':visible', result: [PseudoSelector] }, { test: '::before', result: [PseudoElement] }, { test: '::after', result: [PseudoElement] });
//# sourceMappingURL=css-selectors.js.map