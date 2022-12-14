import {
    AttributeEqualsSelector,
    ClassSelector,
    IdSelector,
    parseSelector,
    PseudoFunction1ArgEquationSelector,
    PseudoFunction1ArgSelector,
    Selector,
    TagSelector,
} from './css-selectors.js';

class Elemental extends String {
    readonly args: Selector[];
    constructor(...args:Array<Selector>) {
        super(args.join(''));
        this.args = args;
    }
}

function reduce_parseSelector({ret, elemental}:{ret: Array<Elemental | Selector>, elemental: Array<Selector>}, selector: Selector, _si: number, _parsed: Array<Selector>): { ret: (Selector | Elemental)[]; elemental: Selector[]; } {
    switch(selector.kind) {
        case 'relationship':
            if(elemental.length) { ret.push(new Elemental(...elemental)); elemental = []; }
            ret.push(selector);
            break;
        case 'elemental':
            elemental.push(selector);
            break;
    }
    return {ret, elemental};
}

function groupParseSelector(selectorText:string): (Selector | Elemental)[] {
    const {ret, elemental} = parseSelector(selectorText).reduce(
        reduce_parseSelector,
        {
            ret: new Array<Elemental | Selector>(),
            elemental: new Array<Selector>(),
        }
    );

    if(elemental.length) { ret.push(new Elemental(...elemental)); }
    return ret;
}

function safeQSA(selector:string):Element[] | null {
    try{
        return Array.from(document.querySelectorAll(selector));
    } catch(err) {
        return null;
    }
}

function make_missing_elements(selector: Elemental, textContent?: string): Array<HTMLElement> {
    const firstSelector = selector.args.shift();
    if(firstSelector === undefined) throw new TypeError('firstSelector undefined');
    if(!(firstSelector instanceof TagSelector)) throw new TypeError(`!(firstSelector instanceof TagSelector)`);
    const firstElementalPart: TagSelector = firstSelector;
    const newElement: HTMLElement = document.createElement(`${firstElementalPart}`);

    if(textContent !== undefined) {
        newElement.textContent = textContent;
    }

    const newElements = [];
    for(const elementalPart of selector.args) {
        if(elementalPart instanceof IdSelector) {
            newElement.id = elementalPart.slice(1);
        } else if(elementalPart instanceof ClassSelector) {
            newElement.classList.add(elementalPart.slice(1));
        } else if(elementalPart instanceof AttributeEqualsSelector) {
            newElement.setAttribute(elementalPart.executed[1], elementalPart.executed[2]);
        } else if(elementalPart instanceof PseudoFunction1ArgEquationSelector) {
            const {
                func,
                offset,
                offsetSign,
                scalar,
                scalarSign,
                signedOffset,
                signedScalar,
                varname,
            }= elementalPart.executed.groups;

            const signedOffsetNum = parseInt(((signedOffset === '-')?'-1':signedOffset), 10);
            const signedScalarNum = parseInt(((signedScalar === '-')?'-1':signedScalar), 10);

            if(func === 'nth-last-child' && varname === 'n' && (!Number.isNaN(signedOffsetNum)) && (!Number.isNaN(signedScalarNum)) && signedScalarNum === -1) {
                // console.log({
                //     func,
                //     signedOffsetNum,
                //     // signedScalarNum,
                //     varname,
                // });
                while(newElements.length < signedOffsetNum) {
                    const importedNode = document.importNode(newElement, true);
                    newElements.push(importedNode);
                }
            } else {
                console.log('unhandled', elementalPart.executed[0], {
                    func,
                    signedOffset,
                    signedScalar,
                    varname,
                });
            }
        } else if(elementalPart instanceof PseudoFunction1ArgSelector) {
            console.log('unhandled', elementalPart);
        } else {
            console.log('unhandled', elementalPart);
        }
    }
    return newElements.length > 0?newElements:[newElement];
}

function flatMap_previousSelector(frag: DocumentFragment, psN: Element): Array<Element> {
    const curFrag: DocumentFragment = frag.cloneNode(true) as DocumentFragment;
    const kids = Array.from(curFrag.children);
    psN.append(curFrag);
    return kids;
}

function append_to_previousSelector(selector: Elemental, previousSelector: Array<Element>, textContent?: string): Array<Element> {
    const missing_elements = make_missing_elements(selector, textContent);
    const frag = document.createDocumentFragment();
    missing_elements.map((missing_element: HTMLElement)=> frag.appendChild(document.importNode(missing_element, true)));

    return previousSelector.flatMap(flatMap_previousSelector.bind(null, frag));
}

function reduce_groupParseSelector(textContent: string | undefined, previousSelector: Array<Element>, selector: (Selector | Elemental), si: number, parsed: (Selector | Elemental)[]): Array<Element> {
    const partialArray = parsed.slice(0, si + 1);
    const partial = partialArray.join('');
    const selected = safeQSA(partial);
    if(selected === null) {
        return previousSelector;
    }
    if(selected.length > 0) {
        return selected;
    }
    if(!(selector instanceof Elemental)) {
        return selected;
    }

    if(previousSelector === undefined) throw new TypeError('creating an element requires previousSelector to be defined');
    const textContentn = ((si + 1) === parsed.length)?textContent:undefined;
    return append_to_previousSelector(selector, previousSelector, textContentn);
}

function for_each_cssRule(cssRule: CSSStyleRule, _cssRuleIndex: number): void {
    const textContent = (cssRule.style.content.length)?JSON.parse(cssRule.style.content):undefined;
    groupParseSelector(cssRule.selectorText).reduce(reduce_groupParseSelector.bind(null, textContent), new Array<Element>());
}

function for_each_styleSheet(styleSheet: CSSStyleSheet, _styleSheetIndex: number): void {
    Array.prototype.forEach.call(styleSheet.cssRules, for_each_cssRule);
}

function CssToHtml(): void {
    //console.log('loaded');
    Array.prototype.forEach.call(document.styleSheets, for_each_styleSheet);
}

/* document.addEventListener("DOMContentLoaded", CssToHtml); */

//window load is better event for lack of problems with displaying
window.addEventListener("load", CssToHtml);
