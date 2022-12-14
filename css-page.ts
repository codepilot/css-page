import {
    AllSelector,
    AttributeContainsSelector,
    AttributeContainsWordSelector,
    AttributeEndsWithSelector,
    AttributeEqualsSelector,
    AttributeNotEqualsSelector,
    AttributePrefixSelector,
    AttributeSelector,
    AttributeStartsWithSelector,
    ChildSelector,
    ClassSelector,
    DescendantSelector,
    IdSelector,
    MultipleSelector,
    NextAdjacentSelector,
    NextSiblingsSelector,
    parseSelector,
    PseudoFunction1ArgQuotedSelector,
    PseudoFunction1ArgSelector,
    PseudoFunctionSelector,
    PseudoSelector,
    Selector,
    TagSelector,
} from './css-selectors.js';

function getKindOfSelector(selector: Selector) {
    switch(true) {
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
    readonly args: Selector[];
    constructor(...args:Array<Selector>) {
        super(args.join(''));
        this.args = args;
    }
}

function groupParseSelector(selectorText:string) {
    const ret = [];
    let elemental: Array<Selector> = [];
    parseSelector(selectorText).forEach((selector, _si, _parsed) => {
        const kind = getKindOfSelector(selector);
        //console.log(kind, selector);
        switch(kind) {
            case 'relationship':
                if(elemental.length) { ret.push(new Elemental(...elemental)); elemental = []; }
                ret.push(selector);
                break;
            case 'elemental':
                elemental.push(selector);
                break;
        }
    });
    if(elemental.length) { ret.push(new Elemental(...elemental)); elemental = []; }
    return ret;
}

//console.log(groupParseSelector('body>div.test1>span.redText'));

//    return;

function safeQSA(selector:string):Element[] | null {
    try{
        return Array.from(document.querySelectorAll(selector));
    } catch(err) {
        return null;
    }
}

function CssToHtml() {
    //console.log('loaded');
    Array.prototype.forEach.call(document.styleSheets, (styleSheet, _styleSheetIndex)=> {
        Array.prototype.forEach.call(styleSheet.cssRules, (cssRule, _cssRuleIndex)=> {
            let previousSelector: Array<Element>;
            groupParseSelector(cssRule.selectorText).forEach((selector, si, parsed) => {
                const partialArray = parsed.slice(0, si + 1);
                const partial = parsed.slice(0, si + 1).join('');
                //try {
                    let selected = safeQSA(partial);
                    if(selected === null) { return; }
                    if(selected.length === 0) {
                        //console.log('need to create', selector, 'in', previousSelector);
                        if(selector instanceof Elemental) {
                            //console.log('elemental selector', selector);
                            let newElement: HTMLElement;
                            selector.args.forEach((elementalPart:Selector) => {
                                if(elementalPart instanceof TagSelector) {
                                    newElement = document.createElement(`${elementalPart}`);
                                    //selected = newElement;
                                } else if(elementalPart instanceof IdSelector) {
                                    newElement.id = elementalPart.slice(1);
                                } else if(elementalPart instanceof ClassSelector) {
                                    newElement.classList.add(elementalPart.slice(1));
                                } else if(elementalPart instanceof AttributeEqualsSelector) {
                                    newElement.setAttribute(elementalPart.executed[1], elementalPart.executed[2]);
                                } else {
                                    console.log('unhandled', elementalPart);
                                }
                            });
                            //console.log({previousSelector, newElement});
                            selected = Array.from(previousSelector, (psN:Element)=> psN.appendChild(document.importNode(newElement, true)));
                        }
                    } else {
                        //console.log({selector, partialArray, partial, selected});                        
                    }
                    previousSelector = selected;
               // } catch( err ) {
                    //console.log('errA', err);
               // }
            });
            try {
                if(cssRule.style.content.length) {
                    //console.log('content', cssRule.style.content, previousSelector, cssRule.style);
                    if(previousSelector!!) {
                        previousSelector.forEach((psN:Element) => psN.innerHTML = JSON.parse(cssRule.style.content));
                    }
                }
            } catch(err) {
                //console.log('errB', err);
            }
        })
    });
}

/* document.addEventListener("DOMContentLoaded", CssToHtml); */

//window load is better event for lack of problems with displaying
window.addEventListener("load", CssToHtml);
