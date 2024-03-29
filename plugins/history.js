;//! $ID: history.js 2022.05.12 tQuery.Plugins $
//++++++++++++++++++++++++++++++++++++++++++++++++++
//  Project: DOM-history v0.2.0
//  E-Mail:  zhliner@gmail.com
//  Copyright (c) 2020 - 2022 铁皮工作室  MIT License
//
//////////////////////////////////////////////////////////////////////////////
//
//  节点树修改监听/记录历史。
//  利用 tQuery 节点变化定制事件机制，跟踪对节点的修改，创建历史记录以便于撤销。
//
//  改变之前的事件可能因为其它处理器阻止改变，所以需要监听改变后的事件，
//  它们包括：
//  - 特性变化：attrdone
//  - 属性变化：propdone
//  - 样式变化：styledone
//  - 类名变化：classdone
//  - 内容变化：nodeok, detached, emptied, normalized
//
//  - 事件处理绑定变化：bound, unbound
//
//  适用前提
//  --------
//  限于tQuery接口调用，如果用户直接调用DOM接口修改节点则无法跟踪。
//
//  使用：
//  - 配置 tQuery.config() 以支持定制事件的激发。
//  - 创建一个全局的 History 实例作为事件处理器，绑定上面的事件到目标根元素上。
//  - 籍由事件的触发，会自动记录该元素及其子孙元素的变化历史。
//  - 调用 .back(n) 即可回退 DOM 的变化。
//
//  注意：
//  back即为undo的逻辑，redo需要用户自己编写（比如操作实例化）。
//  监听事件通常绑定在上层容器上，因此脱离节点树的节点的变化无法监听。
//
//
///////////////////////////////////////////////////////////////////////////////
//

const $ = window.$;


//
// 变化处理器映射。
// event-type: function(event): {.back}
//
const __Handles = {
    // 简单变化。
    attrdone:   ev => switchType( ev.target, ev.detail, Attr ),
    propdone:   ev => switchType( ev.target, ev.detail, Prop ),
    styledone:  ev => new Style( ev.target, ev.detail ),
    classdone:  ev => new Class( ev.target, ev.detail[2] ),

    // 节点变化。
    nodesdone:  ev => new Nodesdone( ev.detail[0] ),
    // 冗余无害（方便用户）
    // 因为如果donesdone的.back()已经移除节点，再次移除无害。
    nodeok:     ev => new Nodesdone( [ev.target] ),
    detach:     ev => new Remove( ev.target ),
    emptied:    ev => new Emptied( ev.target, ev.detail ),
    // 事前提取信息。
    // 自己处理，浏览器会忽略纯空文本节点。
    normalize:  ev => ev.preventDefault() || new Normalize( ev.target ),

    // 事件绑定变化。
    bound:      ev => new Bound( ev.target, ...ev.detail ),
    unbound:    ev => new Unbound( ev.target, ...ev.detail ),
};



//
// 历史记录器。
// 汇集节点改变的回溯（.back）操作实例。
//
class History {
    /**
     * 构造一个记录器。
     * 缓存池长度由外部管理（.prune）。
     */
    constructor() {
        this._buf = [];
    }


    /**
     * 事件触发处理器。
     * @param {Event} ev 定制事件对象
     */
    handleEvent( ev ) {
        let _o = __Handles[ev.type]( ev );

        if ( _o.changed() ) {
            this._buf.push( _o );
        }
        ev.stopPropagation();  // 避免重复记录。
    }


    /**
     * 回溯操作。
     * @param {Number} n 回溯项数
     */
    back( n ) {
        n > 0 && callBack( () => this._backs(this._buf, n) );
    }


    /**
     * 获取当前缓存池大小。
     * @return {Number}
     */
    size() {
        return this._buf.length;
    }


    /**
     * 缓存池头部剪除。
     * @param {Number} n 清除数量
     */
    prune( n ) {
        if ( n > 0 ) {
            this._buf.splice( 0, n );
        }
    }


    /**
     * 检查实例是否为节点自身变化。
     * 目标数量内有任一实例为节点自身变化即为真。
     * @param  {Number} i 起始下标（从0开始计数）
     * @param  {Number} n 检测数量
     * @return {Boolean}
     */
    hasNode( i, n ) {
        return this._buf.slice( i, i+n ).some( o => o.isNodes() );
    }


    /**
     * 清空缓存池。
     * @return {void}
     */
    clear() {
        this._buf.length = 0;
    }


    //-- 私有辅助 ----------------------------------------------------------------


    /**
     * 批量回退。
     * @param {[.back]} buf 实例集引用
     * @param {Number} n 回退数量
     */
    _backs( buf, n ) {
        buf.splice( -n )
        .reverse()
        .forEach( obj => obj.back() );
    }
}


//
// 基础操作类。
// 注意：调用回退（.back）接口时需要关闭定制事件激发。
///////////////////////////////////////////////////////////////////////////////


//
// 元素特性修改。
// 关联事件：attrdone
//
class Attr {
    /**
     * 注：name已为完整的名称。
     * @param {Element} el 目标元素
     * @param {String} name 目标特性名（最终）
     * @param {String|null} val 之前的值
     */
    constructor( el, [name, val] ) {
        this._el = el;
        this._name = name;
        this._old = val;
    }


    back() {
        if ( this._old === null ) {
            return this._el.removeAttribute( this._name );
        }
        this._el.setAttribute( this._name, this._old );
    }


    /**
     * 特性值是否已改变。
     */
    changed() {
        return this._el.getAttribute( this._name ) !== this._old;
    }


    isNodes() {
        return false;
    }
}


//
// 元素属性修改。
// 关联事件：propdone
//
class Prop {
    /**
     * val为数组时，操作的是<select multiple>
     * @param {Element} el 目标元素
     * @param {String} name 目标属性名（最终）
     * @param {Value|[Value]} val 之前的值
     * @param {Boolean} dname 是否为data名称（驼峰式）
     */
    constructor( el, [name, val, dname] ) {
        this._el = el;
        this._name = name;
        this._old = val;
        this._isdn = dname;
    }


    back() {
        if ( this._isdn ) {
            this._el.dataset[ this._name ] = this._old;
        } else {
            this._el[ this._name ] = this._old;
        }
    }


    /**
     * 属性值是否已改变。
     */
    changed() {
        if ( this._isdn ) {
            return this._el.dataset[ this._name ] !== this._old;
        }
        return this._el[ this._name ] !== this._old;
    }


    isNodes() {
        return false;
    }
}


//
// 内联样式修改。
// 关联事件：styledone
//
class Style {
    /**
     * @param {Element} el 目标元素
     * @param {String} name 样式属性名
     * @param {String} val 之前的样式值（已规范）
     */
    constructor( el, [name, val] ) {
        this._el = el;
        this._name = name;
        this._old = val;
    }


    // 注记：
    // 浏览器在设置样式时会自动调整style特性值本身。
    // 因此这里并不寻求恢复style的原始特性值。
    back() {
        this._el.style[ this._name ] = this._old;
        this._el.style.cssText || this._el.removeAttribute( 'style' );
    }


    /**
     * 样式值是否已改变。
     */
    changed() {
        return this._el.style[ this._name ] !== this._old;
    }


    isNodes() {
        return false;
    }
}


//
// 元素类名修改。
// 关联事件：classdone
//
class Class {
    /**
     * @param {Element} el 目标元素
     * @param {[String]} old 之前的类名集
     */
    constructor( el, old ) {
        this._el = el;
        this._ns = old;
    }


    back() {
        this._el.removeAttribute( 'class' );

        this._ns.length &&
        this._ns.forEach( n => this._el.classList.add(n) );
    }


    /**
     * 类名集是否已改变。
     */
    changed() {
        let _set = new Set(
            this._el.classList
        );
        return this._ns.length !== _set.size || this._ns.some( n => !_set.has(n) );
    }


    isNodes() {
        return false;
    }
}


//
// 事件已绑定。
// 关联事件：bound
//
class Bound {
    /**
     * 注记：
     * 不需区分是否为单次（one）绑定。
     * @param {Element} el 目标元素
     * @param {String} evn 目标事件名
     * @param {String} slr 委托选择器
     * @param {Function|EventListener} handle 事件处理器（用户）
     * @param {Object} opts 绑定配置集
     */
    constructor( el, evn, slr, handle, opts ) {
        this._el = el;
        this._evn = evn;
        this._slr = slr;
        this._handle = handle;
        this._cap = opts.capture;
    }


    /**
     * 如果为克隆绑定，由EventClone处理。
     */
    back() {
        $.off(
            this._el,
            this._evn, this._slr, this._handle,
            this._cap
        );
    }


    /**
     * 绑定状况是否已改变。
     * 外部已保证确实有绑定操作才会激发事件，因此无条件返回true。
     */
    changed() {
        return true;
    }


    isNodes() {
        return false;
    }
}


//
// 事件已解绑。
// 关联事件：unbound
//
class Unbound {
    /**
     * @param {Element} el 目标元素
     * @param {String} evn 目标事件名
     * @param {String} slr 委托选择器
     * @param {Function|EventListener} handle 事件处理器（用户）
     * @param {Object} opts 绑定配置集
     */
    constructor( el, evn, slr, handle, opts ) {
        this._el = el;
        this._evn = evn;
        this._slr = slr;
        this._handle = handle;
        this._cap = opts.capture;
        this._opts = opts;
    }


    back() {
        if ( this._opts.once ) {
            $.one( this._el, this._evn, this._slr, this._handle, this._cap );
        }
        else {
            // ._opts 多余成为无害。
            $.on( this._el, this._evn, this._slr, this._handle, this._cap, this._opts );
        }

    }


    /**
     * 绑定状况是否已改变。
     * 外部已保证确实已绑定才会解绑，因此返回true。
     */
    changed() {
        return true;
    }


    isNodes() {
        return false;
    }
}



//
// 节点操作类。
// 因为DOM节点是移动式操作，故仅需记录节点的脱离行为。
//////////////////////////////////////////////////////////////////////////////


//
// 节点变化基类。
// 提供标识以标记改变的是节点自身。
// 可用于警告用户节点引用可能丢失。
//
class Nodes {
    /**
     * tQuery库已保证确实有变化才会触发事件，
     * 因此简单返回true即可。
     */
    changed() {
        return true;
    }


    /**
     * 节点标识。
     */
    isNodes() {
        return true;
    }
}


//
// 节点已进入。
// 关联事件：nodesdone
// 数据节点已事先脱离DOM。
// 适用方法：.prepend, .append, .before, .after, replace
//
class Nodesdone extends Nodes {
    /**
     * @param {[Node]} nodes 已插入节点集
     */
    constructor( nodes ) {
        super();
        this._nodes = nodes;
    }


    back() {
        this._nodes.forEach( nd => nd.remove() );
    }
}


//
// 节点待移除。
// 关联事件：detach
//
class Remove extends Nodes {
    /**
     * @param {Node} node 待移除的节点
     */
    constructor( node ) {
        super();
        this._node = node;
        this._prev = node.previousSibling;
        this._box = node.parentNode;
    }


    back() {
        if ( this._prev ) {
            return this._prev.after( this._node );
        }
        this._box.prepend( this._node );
    }
}


//
// 元素已清空。
// 关联事件：emptied
// 注记：
// 已经为空的元素不会触发事件。
//
class Emptied extends Nodes {
    /**
     * @param {Element} el 容器元素
     * @param {[Node]} subs 子节点集
     */
    constructor( el, subs ) {
        super();
        this._box = el;
        this._data = subs;
    }


    back() {
        this._data.length > 0 && this._box.prepend( ...this._data );
    }
}


//
// 两个特殊属性/特性修改。
// 即 $.prop()|.attr() 中的 text|html 设置。
//
class Fillx2 extends Nodes {
    /**
     * @param {Element} el 目标元素
     * @param {[Node]} old 之前的内容
     */
    constructor( el, old ) {
        super();
        this._box = el;
        this._nds = old;
    }


    back() {
        this._box.textContent = '';
        this._box.append( ...this._nds );
    }


    /**
     * 内容值是否已改变。
     * 改变之前和之后任一时刻有值即为真。
     * 注：值本身没有可比较性。
     */
    changed() {
        return this._nds.length > 0 || this._box.textContent !== '';
    }
}


//
// 元素规范化之前。
// 关联事件：normalize
// 处理.normalize()将有的变化。
//
class Normalize extends Nodes {
    /**
     * 提取相邻文本节点集分组。
     * 对每一组提前处理。
     * @param {Element} el 事件主元素
     */
    constructor( el ) {
        super();

        let _all = $.textNodes( el )
            .filter(
                (nd, i, arr) => adjacent(nd, arr[i - 1], arr[i + 1])
            );
        this._buf = adjacentTeam(_all).map( nodes => new Texts(nodes) );
    }


    back() {
        this._buf.forEach( obj => obj.back() );
    }


    /**
     * 覆盖基类实现。
     * 确有相邻的文本节点才会改变。
     */
    changed() {
        return this._buf.length > 0;
    }
}



//
// 工具类：
// 相邻文本节点处理。
// 浏览器会忽略纯空（无值）的文本节点，因此自己处理。
// 注记：
// 原生DOM接口.normalize()执行后，不会影响节点上的选取（Range）。
// 此处忽略该特性（不作延续）。
//
class Texts {
    /**
     * nodes为一组相邻文本节点集。
     * 注意：创建实例即实施手动规范化。
     * @param {[Text]} nodes 节点集
     */
    constructor( nodes ) {
        let _nd0 = nodes.shift(),
            _tx0 = _nd0.textContent,
            _all = _nd0.wholeText;

        this._ref = _nd0;
        this._txt0 = _tx0;
        this._data = nodes;

        nodes.forEach(
            nd => nd.remove()
        );
        _nd0.textContent = _all;
    }


    back() {
        this._ref.textContent = this._txt0;
        this._ref.after( ...this._data );
    }
}


//
// 工具函数
///////////////////////////////////////////////////////////////////////////////


/**
 * 相邻节点过滤器。
 * 检查集合中的节点是否为相邻节点。
 * @param  {Node} cur 当前节点
 * @param  {Node|undefined} prev 集合中前一个节点
 * @param  {Node|undefined} next 集合中下一个节点
 * @return {Boolean}
 */
function adjacent( cur, prev, next ) {
    // null !== undefined
    return cur.previousSibling === prev || cur.nextSibling === next;
}


/**
 * 相邻节点集分组。
 * 源节点集中包含了多组不同的相邻节点。
 * @param  {[Node]} nodes 有序节点集
 * @return {[[Node]]}
 */
function adjacentTeam( nodes ) {
    if ( nodes.length == 0 ) {
        return [];
    }
    let _sub = [nodes.shift()],
        _buf = [_sub];

    for ( const nd of nodes ) {
        if ( nd.previousSibling === _sub[_sub.length-1] ) {
            _sub.push( nd );
            continue;
        }
        _buf.push( (_sub = [nd]) );
    }
    return _buf;
}


/**
 * 判断创建特殊属性设置类。
 * @param  {Element} el 目标元素
 * @param  {[Value]} data 传送的数据
 * @param  {Class} T  待定类（Attr|Prop）
 * @return {Fillx2|T}
 */
function switchType( el, data, T ) {
    return ( data[0] === 'text' || data[0] === 'html' ) ? new Fillx2( el, data[1] ) : new T( el, data );
}


/**
 * 调用回溯函数。
 * 需要临时关闭节点变化跟踪。
 * @param {Function} handle 回调操作
 */
function callBack( handle ) {
    let _old = $.config({
        varyevent: null,
        bindevent: null,
    });
    try {
        return handle();
    }
    finally { $.config( _old ) }
}


History.version = 'v0.2.0';

// 友好导出备用。
History.Normalize = Normalize;


export default History;
