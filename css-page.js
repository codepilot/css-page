import { AllSelector, AttributeContainsSelector, AttributeContainsWordSelector, AttributeEndsWithSelector, AttributeEqualsSelector, AttributeNotEqualsSelector, AttributePrefixSelector, AttributeSelector, AttributeStartsWithSelector, ChildSelector, ClassSelector, DescendantSelector, IdSelector, MultipleSelector, NextAdjacentSelector, NextSiblingsSelector, parseSelector, PseudoFunction1ArgQuotedSelector, PseudoFunction1ArgEquationSelector, PseudoFunction1ArgSelector, PseudoFunctionSelector, PseudoSelector, TagSelector, } from './css-selectors.js';
function getKindOfSelector(selector) {
    switch (true) {
        case selector instanceof ChildSelector:
        case selector instanceof AllSelector:
        case selector instanceof DescendantSelector:
        case selector instanceof NextAdjacentSelector:
        case selector instanceof NextSiblingsSelector:
        case selector instanceof MultipleSelector:
            return 'relationship';
        case selector instanceof TagSelector:
        case selector instanceof IdSelector:
        case selector instanceof ClassSelector:
        case selector instanceof PseudoSelector:
        case selector instanceof PseudoFunctionSelector:
        case selector instanceof PseudoFunction1ArgQuotedSelector:
        case selector instanceof PseudoFunction1ArgEquationSelector:
        case selector instanceof PseudoFunction1ArgSelector:
        case selector instanceof AttributeSelector:
        case selector instanceof AttributeEqualsSelector:
        case selector instanceof AttributeNotEqualsSelector:
        case selector instanceof AttributePrefixSelector:
        case selector instanceof AttributeContainsSelector:
        case selector instanceof AttributeContainsWordSelector:
        case selector instanceof AttributeEndsWithSelector:
        case selector instanceof AttributeStartsWithSelector:
            return 'elemental';
        default:
            throw new TypeError(`selector ${selector.constructor.name} unknown`);
    }
}
class Elemental extends String {
    args;
    constructor(...args) {
        super(args.join(''));
        this.args = args;
    }
}
function groupParseSelector(selectorText) {
    const ret = [];
    let elemental = [];
    parseSelector(selectorText).forEach((selector, _si, _parsed) => {
        const kind = getKindOfSelector(selector);
        //console.log(kind, selector);
        switch (kind) {
            case 'relationship':
                if (elemental.length) {
                    ret.push(new Elemental(...elemental));
                    elemental = [];
                }
                ret.push(selector);
                break;
            case 'elemental':
                elemental.push(selector);
                break;
        }
    });
    if (elemental.length) {
        ret.push(new Elemental(...elemental));
        elemental = [];
    }
    return ret;
}
//console.log(groupParseSelector('body>div.test1>span.redText'));
//    return;
function safeQSA(selector) {
    try {
        return Array.from(document.querySelectorAll(selector));
    }
    catch (err) {
        return null;
    }
}
function make_missing_elements(selector, textContent) {
    const firstSelector = selector.args.shift();
    if (firstSelector === undefined)
        throw new TypeError('firstSelector undefined');
    if (!(firstSelector instanceof TagSelector))
        throw new TypeError(`!(firstSelector instanceof TagSelector)`);
    const firstElementalPart = firstSelector;
    const newElement = document.createElement(`${firstElementalPart}`);
    if (textContent !== undefined) {
        newElement.textContent = textContent;
    }
    const newElements = [];
    for (const elementalPart of selector.args) {
        if (elementalPart instanceof IdSelector) {
            newElement.id = elementalPart.slice(1);
        }
        else if (elementalPart instanceof ClassSelector) {
            newElement.classList.add(elementalPart.slice(1));
        }
        else if (elementalPart instanceof AttributeEqualsSelector) {
            newElement.setAttribute(elementalPart.executed[1], elementalPart.executed[2]);
        }
        else if (elementalPart instanceof PseudoFunction1ArgEquationSelector) {
            const { func, offset, offsetSign, scalar, scalarSign, signedOffset, signedScalar, varname, } = elementalPart.executed.groups;
            const signedOffsetNum = parseInt(((signedOffset === '-') ? '-1' : signedOffset), 10);
            const signedScalarNum = parseInt(((signedScalar === '-') ? '-1' : signedScalar), 10);
            if (func === 'nth-last-child' && varname === 'n' && (!Number.isNaN(signedOffsetNum)) && (!Number.isNaN(signedScalarNum)) && signedScalarNum === -1) {
                // console.log({
                //     func,
                //     signedOffsetNum,
                //     // signedScalarNum,
                //     varname,
                // });
                while (newElements.length < signedOffsetNum) {
                    const importedNode = document.importNode(newElement, true);
                    newElements.push(importedNode);
                }
            }
            else {
                console.log('unhandled', elementalPart.executed[0], {
                    func,
                    signedOffset,
                    signedScalar,
                    varname,
                });
            }
        }
        else if (elementalPart instanceof PseudoFunction1ArgSelector) {
            console.log('unhandled', elementalPart);
        }
        else {
            console.log('unhandled', elementalPart);
        }
    }
    return newElements.length > 0 ? newElements : [newElement];
}
function append_to_previousSelector(selector, previousSelector, textContent) {
    const missing_elements = make_missing_elements(selector, textContent);
    const frag = document.createDocumentFragment();
    missing_elements.map((missing_element) => frag.appendChild(document.importNode(missing_element, true)));
    return previousSelector.flatMap((psN) => {
        const curFrag = frag.cloneNode(true);
        const kids = Array.from(curFrag.children);
        psN.append(curFrag);
        return kids;
    });
}
function reduce_groupParseSelector(textContent, previousSelector, selector, si, parsed) {
    const partialArray = parsed.slice(0, si + 1);
    const partial = partialArray.join('');
    const selected = safeQSA(partial);
    if (selected === null) {
        return previousSelector;
    }
    if (selected.length > 0) {
        return selected;
    }
    if (!(selector instanceof Elemental)) {
        return selected;
    }
    if (previousSelector === undefined)
        throw new TypeError('creating an element requires previousSelector to be defined');
    const textContentn = ((si + 1) === parsed.length) ? textContent : undefined;
    return append_to_previousSelector(selector, previousSelector, textContentn);
}
function for_each_cssRule(cssRule, _cssRuleIndex) {
    const textContent = (cssRule.style.content.length) ? JSON.parse(cssRule.style.content) : undefined;
    groupParseSelector(cssRule.selectorText).reduce(reduce_groupParseSelector.bind(null, textContent), new Array());
}
function for_each_styleSheet(styleSheet, _styleSheetIndex) {
    Array.prototype.forEach.call(styleSheet.cssRules, for_each_cssRule);
}
function CssToHtml() {
    //console.log('loaded');
    Array.prototype.forEach.call(document.styleSheets, for_each_styleSheet);
}
/* document.addEventListener("DOMContentLoaded", CssToHtml); */
//window load is better event for lack of problems with displaying
window.addEventListener("load", CssToHtml);
//# sourceMappingURL=css-page.js.map