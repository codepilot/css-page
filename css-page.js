import { AttributeEqualsSelector, ClassSelector, IdSelector, parseSelector, PseudoFunction1ArgEquationSelector, PseudoFunction1ArgSelector, TagSelector, } from './css-selectors.js';
class Elemental extends String {
    args;
    constructor(...args) {
        super(args.join(''));
        this.args = args;
    }
}
function reduce_parseSelector({ ret, elemental }, selector, _si, _parsed) {
    switch (selector.kind) {
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
    return { ret, elemental };
}
function groupParseSelector(selectorText) {
    const { ret, elemental } = parseSelector(selectorText).reduce(reduce_parseSelector, {
        ret: new Array(),
        elemental: new Array(),
    });
    if (elemental.length) {
        ret.push(new Elemental(...elemental));
    }
    return ret;
}
function safeQSA(selector) {
    try {
        return Array.from(document.querySelectorAll(selector));
    }
    catch (err) {
        return null;
    }
}
let uniqueVal = 0;
function make_missing_elements(selector, textContent) {
    const firstSelector = selector.args.shift();
    if (firstSelector === undefined)
        throw new TypeError('firstSelector undefined');
    if (!(firstSelector instanceof TagSelector))
        throw new TypeError(`!(firstSelector instanceof TagSelector)`);
    const firstElementalPart = firstSelector;
    const newElement = document.createElement(`${firstElementalPart}`);
    if (textContent !== undefined) {
        if (typeof textContent === 'string') {
            newElement.textContent = textContent;
        }
        else {
            const curUnique = `${uniqueVal++}`;
            newElement.dataset['uniqueVal'] = curUnique;
            textContent.then((value) => {
                const selectors = document.querySelectorAll(`[data-unique-val="${curUnique}"]`);
                selectors.forEach((el) => {
                    el.style.content = 'unset';
                    el.textContent = JSON.stringify(value);
                    // (el as HTMLElement).style.content = (`json ${value}`);
                });
                // console.log('json', value, selectors);
                // newElement.textContent = `${value}`;
            });
        }
    }
    const modifiers = {
        id: undefined,
        classes: new Set(),
        attrs: new Map(),
        multiplier: 1,
    };
    // const newElements = [];
    for (const elementalPart of selector.args) {
        if (elementalPart instanceof IdSelector) {
            modifiers.id = elementalPart.slice(1);
        }
        else if (elementalPart instanceof ClassSelector) {
            modifiers.classes.add(elementalPart.slice(1));
        }
        else if (elementalPart instanceof AttributeEqualsSelector) {
            modifiers.attrs.set(elementalPart.executed[1], elementalPart.executed[2]);
        }
        else if (elementalPart instanceof PseudoFunction1ArgEquationSelector) {
            const { func, offset, offsetSign, scalar, scalarSign, signedOffset, signedScalar, varname, } = elementalPart.executed.groups;
            const signedOffsetNum = parseInt(((signedOffset === '-') ? '-1' : signedOffset), 10);
            const signedScalarNum = parseInt(((signedScalar === '-') ? '-1' : signedScalar), 10);
            if (func === 'nth-last-child' && varname === 'n' && (!Number.isNaN(signedOffsetNum)) && (!Number.isNaN(signedScalarNum)) && signedScalarNum === -1) {
                modifiers.multiplier = signedOffsetNum;
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
    if (modifiers.id !== undefined)
        newElement.id = modifiers.id;
    if (modifiers.classes.size > 0)
        newElement.classList.add(...(modifiers.classes));
    modifiers.attrs.forEach((v, k) => newElement.setAttribute(k, v));
    return Array.from(new Array(modifiers.multiplier), (_v, k) => { const ret = document.importNode(newElement, true); ret.setAttribute('data-child-index', `${k}`); return ret; });
}
function flatMap_previousSelector(frag, psN) {
    const curFrag = frag.cloneNode(true);
    const kids = Array.from(curFrag.children);
    psN.append(curFrag);
    return kids;
}
function append_to_previousSelector(selector, previousSelector, textContent) {
    const missing_elements = make_missing_elements(selector, textContent);
    const frag = document.createDocumentFragment();
    missing_elements.map((missing_element) => frag.appendChild(document.importNode(missing_element, true)));
    return previousSelector.flatMap(flatMap_previousSelector.bind(null, frag));
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
    if (cssRule instanceof CSSImportRule) {
        return for_each_styleSheet(cssRule.styleSheet, 0);
    }
    const func_regex = /^(?<func_name>[a-z]+)\((?<func_args>[^)]*)\)$/;
    const func_result = func_regex.exec(cssRule.style.content);
    if (func_result !== null) {
        const func_name = func_result?.groups?.['func_name'];
        const func_args = func_result?.groups?.['func_args'];
        console.log({ func_name, func_args });
        if (func_name === 'url' && func_args !== undefined) {
            const data_url = JSON.parse(func_args);
            console.log({ data_url });
            const data_promise = fetch(data_url).then((value) => value.json());
            const textContent = data_promise;
            groupParseSelector(cssRule.selectorText).reduce(reduce_groupParseSelector.bind(null, textContent), new Array());
        }
        else {
            const textContent = undefined;
            groupParseSelector(cssRule.selectorText).reduce(reduce_groupParseSelector.bind(null, textContent), new Array());
        }
    }
    else {
        const textContent = (cssRule.style.content.length) ? JSON.parse(cssRule.style.content) : undefined;
        groupParseSelector(cssRule.selectorText).reduce(reduce_groupParseSelector.bind(null, textContent), new Array());
    }
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