/*! $Id: tracker.js 2017.03.20 tQuery.Exts $
*******************************************************************************
            Copyright (c) 铁皮工作室 2017 MIT License

                @Project: tQuery v0.1
                @Author:  风林子 zhliner@gmail.com
*******************************************************************************

	节点修改跟踪器

	覆盖有改变节点（移动，属性/样式修改）能力的API，记录相关参考，
	提供节点数据恢复的能力。
	节点树的变化可回溯，可用于交互文档演示中的回退，或节点树编辑撤销。

	接口：
		back() 	历史回溯，操作实例接口。
		push() 	外部添加支持back接口操作实例，
				或一个回溯函数（将被自动封装为支持back）。

	节点数据
	--------
	 	API:
	 		before, after, prepend, append, fill, replace,
	 		html, text, table, detach, remove, empty, normalize
	 	注：
	 	- wrap系列由上面操作完成；
	 	- 元素参考前兄弟节点或父元素；
	属性变化
	--------
	 	API: addClass, removeClass, toggleClass, attr, prop, removeAttr, val
	样式修改
	--------
	 	API: css, offset
	其它
	----
	 	API: scrollTop, scrollLeft

	使用：
		1. 在页面中引入本文件；
		2. 调用$.Fx.Tracker的相关接口；


	注记：
	本扩展不能跟踪元素contenteditable为真时的文本编辑行为；
	（除非用一个新的元素替代后再编辑）

	注意：
	如果用户直接调用DOM接口对节点进行修改，此处无法跟踪。
	会修改节点的DOM接口大致如下：
		Node: {
			textContent,
			appendChild, removeChild, replaceChild, insertBefore,
			normalize,
		}
		Element: {
			innerHTML, outerHTML,
			scrollTop, scrollLeft,
			insertAdjacentHTML,
			setAttribute, removeAttribute,
		}
		ParentNode: {
			append, prepend,
		}
		ChildNode: {
			before, after, remove, replaceWith
		}
		EventTarget: {
			addEventListener, removeEventListener
		}
		style：CSSStyleDeclaration


&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&
*/


(function( $ ) {

	const
		// 追踪历史存储
		// [Node|Nodes|Attr|Prop|Value|Style|Scroll|xxx] 实例
		// 注：仅在修改时记录。
		__History = [],

		// 代理追踪集。
		// 成员调用返回false表示未拦截（无关）。
		__Handles = {},

		// 排除清单。
		// 清单中的条目不被跟踪记录。
		__Exclude = {
			func: new Set(),  // 函数名集
			attr: new Set(),  // 特性名集
			prop: new Set(),  // 属性名集
		};


	// 当前代理存储
	let $Proxy = null;


//
// 节点操作（前置记录）
///////////////////////////////////////////////////////////////////////////////

// 数据节点
[
	'before',
	'after',
	'prepend',
	'append',
	'fill',
	'replace',
]
.forEach( function(fn) {
	__Handles[fn] = function( el, cons/*, clone, event*/ ) {
		if (typeof cons == 'function') {
			cons = cons(el);
		}
		// 节点可能为克隆，
		// 需要在新插入的位置处理节点集。
		return pushStack( new Node2(cons) );
	};
});


// 自身内部
[
	'html',
	'text',
]
.forEach( function(fn) {
	__Handles[fn] = function( el, code, where/*, sep*/ ) {
		if (!el || code === undefined) {
			return false;
		}
		// fill/replace方式需要跟踪节点丢失。
		// 新插入的节点集需要处理。
		return pushStack( new Node2(whereData(el, where)) );
	};
});


//
// 自身内部
// 原始返回代理$
//
__Handles.normalize = function( el, one ) {
	let _val = abutTexts(el, !one);
	if (_val) pushStack( new NormText(_val) );
};


//
// 自身内部
// 原始返回代理$
//
__Handles.empty = function( el ) {
	pushStack( new Node2($.contents(el)) );
};


//
// 节点自身
// 原始返回调用结果。
//
__Handles.detach = function( el ) {
	return pushStack( new Node(el) ), false;
};

//
// 节点自身
// 原始返回代理$
//
__Handles.remove = function( el ) {
	pushStack( new Node(el) );
};


//
// 类名修改。
// 原始返回代理$
///////////////////////////////////////////////////////////////////////////////

[
	'addClass',
	'removeClass',
	'toggleClass',
]
.forEach( function(fn) {
	__Handles[fn] = function( el ) {
		if (__Exclude.attr.has('class') || __Exclude.prop.has('className')) {
			return false;
		}
		pushStack( new Attr(el, 'class') );
	};
});


//
// 属性/特性修改。
// 取值/设置同一个Api，排除取值调用。
// 原始返回代理$（设置时）
///////////////////////////////////////////////////////////////////////////////

__Handles.attr = function( el, names, val ) {
	if (val === undefined && $.type(names) != 'Object') {
		return false;
	}
	if (!__Exclude.attr.has(names)) pushStack( new Attr(el, keyNames(names)) );
};


__Handles.prop = function(el, names, val) {
	if (val === undefined && $.type(names) != 'Object') {
		return false;
	}
	if (!__Exclude.prop.has(names)) pushStack( new Prop(el, keyNames(names)) );
};


__Handles.removeAttr = function( el, names ) {
	if (!__Exclude.attr.has(names)) pushStack( new Attr(el, names) );
};


__Handles.val = function(el, val) {
	if (val === undefined) {
		return false;
	}
	if (!__Exclude.prop.has('value')) pushStack( new Value(el) );
};


//
// 样式修改。
// 取值/设置合一，排除取值调用。
// 原始返回代理$（设置时）
///////////////////////////////////////////////////////////////////////////////

__Handles.css = function( el, names, val ) {
	if (val === undefined && $.type(names) != 'Object') {
		return false;
	}
	pushStack( new Style(el) );
};


__Handles.offset = function( el, val ) {
	if (val === undefined) {
		return false;
	}
	pushStack( new Style(el) );
};


//
// 滚动条修改。
// 取值/设置合一，排除取值调用。
// 原始返回代理$（设置时）
///////////////////////////////////////////////////////////////////////////////

[
	'scrollTop',
	'scrollLeft',
]
.forEach( function(fn) {
	__Handles[fn] = function( el, val ) {
		if (val === undefined) {
			return false;
		}
		pushStack( new Scroll(el, fn) );
	};
});


//
// 事件绑定/解绑。
// 原始返回代理$
///////////////////////////////////////////////////////////////////////////////

__Handles.on = function( ...args ) {
	pushStack( new Event( 'off', ...args ) );
};


__Handles.off = function( ...args ) {
	pushStack( new Event( 'on', ...args ) );
};



/**
 * 获取键名（集）。
 * @param  {String|Object} item 提取目标
 * @return {String|Array}
 */
function keyNames( item ) {
	return typeof item == 'string' ? item : Object.keys(item);
}


/**
 * 从位置获取被移除数据。
 * - 其它位置不会有节点数据被移除；
 * @param  {Node|Element} el
 * @param  {String|Number} where 位置值
 * @return {Node|Element|Array|null}
 */
function whereData( el, where ) {
	switch (where) {
		case 'fill':
		case 0: return $.contents(el);
		case 'replace':
		case '': return el;
	}
	return null;
}


/**
 * 提取集合中的首个成员。
 * @param  {Set|Iterator} set 集合/迭代器
 * @return {Value} 首个成员
 */
function first( set ) {
	return set.values().next().value;
}


/**
 * 相邻文本节点集。
 * - 若文本节点相邻则提取；
 * - 检测容器节点内全部文本节点；
 * 注：$.normalize操作的跟踪；
 * @param  {Element} box 容器元素
 * @param  {Boolean} all 包含全部子元素内
 * @return {[Set]} 相邻节点集数组
 */
function abutTexts( box, all ) {
	let _buf = [],
		_set = new Set(),
		_pre;  // undefined

	$.each(
		textNodes(box, all),
		tn => {
			_set = abutPush(_buf, abutSet(tn, _pre, _set), _set);
			_pre = tn;
		}
	);
	// 最后一个补入
	if (_set.size) _buf.push(_set);

	return _buf.length && _buf;
}


/**
 * 相邻节点添加。
 * @param  {Node} cur 当前节点
 * @param  {Node} pre 前一个节点
 * @param  {Set} set  存储容器
 * @return {Set|false}
 */
function abutSet( cur, pre, set ) {
	return cur.previousSibling === pre && set.add(pre).add(cur);
}


/**
 * 节点集压入。
 * - 如果节点不再相邻，cur为假；
 * - 原集合有值时才压入存储；
 * - 返回原空集合或一个新集合（如果压入）；
 * @param  {Array} buf 外部存储
 * @param  {Set|false} cur 当前集合或否
 * @param  {Set} set 原节点集合
 * @return {Set} 存储节点的集合
 */
function abutPush( buf, cur, set ) {
	if (cur || !set.size) {
		return set;
	}
	return buf.push(set) && new Set();
}


/**
 * 获取文本节点。
 * @param  {Element} box 容器元素
 * @param  {Boolean} all 包含全部子孙节点
 * @return {Queue} 文本节点集
 */
function textNodes( box, all ) {
	let $els = all ?
		$('*', box).add(box) : $(box);

	return $els.contents( nd => nd.nodeType == 3 ? nd : null );
}


/**
 * 提取节点引用参考。
 * @param  {Node} node 目标节点
 * @return {Array} [prev, parend]
 */
function nodeRefs( node ) {
	return [
		node.previousSibling,
		node.previousSibling || node.parentNode
	];
}


/**
 * 操作实例压入历史栈。
 * - 返回操作实例可用于原始调用后赋值；
 *   （需要处理改变后值的情况）
 * 操作类：{
 *   	Node, Node2, NormText/Texts,
 *   	Attr, Prop, Value, Style,
 *   	Scroll, Event
 * }
 * @param  {Node|Node2...} obj 修改操作实例
 * @return {Node|Node2...} 操作实例
 */
function pushStack( obj ) {
	return __History.push(obj), obj;
}


/**
 * 代理调用。
 * - 代理调用返回false表示未被代理，
 *   或明确要求返回原调用结果；
 * - 若调用返回代理操作实例，也返回原调用结果；
 * - 被代理时，默认返回嵌入代理的$对象；
 * 注：
 * __Handles中的代理仅追踪修改操作（追踪变化）。
 *
 * @param  {...Mixed} args 原生参数序列
 * @return {Proxy$|Value}
 */
function proxyCall( ...args ) {
	let _x = __Handles[this](...args),
		_v = $[this](...args);

	if (_x === false) {
		// 未被代理|要求原结果返回
		return _v;
	}
	// 代理返回操作实例时也返回原调用结果。
	// 默认返回$代理对象
	return _x ? (_x.value = _v) : $Proxy;
}


/**
 * 名称清理。
 * - 清除包含在排除名单中的条目；
 * @param  {Array} names 名称集
 * @param  {String} type 名称类型（attr|prop）
 * @return {Array}
 */
function cleanList( names, type ) {
	if (!$.isArray(names)) {
		return names;
	}
	return names.filter( n => !this.has(n), __Exclude[type] );
}


/**
 * 获取代理调用函数。
 * - 仅部分函数可被代理；
 * - 仅对白名单里的函数进行代理；
 *
 * @param  {String} fn 目标函数名
 * @return {Function} 代理函数
 */
function proxyHandle( fn ) {
	return !__Exclude.func.has(fn) && __Handles[fn] && proxyCall.bind(fn);
}



//
// 基础类定义。
///////////////////////////////////////////////////////////////////////////////

class History {

	constructor() {
		this._buf = __History;
	}


	/**
	 * 开启追踪。
	 * 代理存储在私有域全局变量$Proxy中。
	 * @return {$Proxy}
	 */
	start() {
		$Proxy = $.proxyOwner({
			get: (its, k, r) => proxyHandle(k) || Reflect.get(its, k, r)
		});
		return this;
	}


	/**
	 * 回退。
	 * @param  {Number} cnt 回退步数
	 * @param  {Array} buf  回退数据存储，可选
	 * @return {Array|this} 回退数据或this
	 */
	back( cnt = 1, buf = null ) {
		while (0 < cnt-- && this._buf.length) {
			let _dt = this._buf.pop().back();
			if (buf) buf.push(_dt);
		}
		return buf || this;
	}


	/**
	 * 跳转到。
	 * - 支持负数从末尾计算，-1为末尾；
	 * - 跳转到的下标位置的操作已经被回退（pop）；
	 *
	 * @param  {Number} idx 操作历史下标
	 * @param  {Array} buf  回退数据存储，可选
	 * @return {Array|this} 回退数据或this
	 */
	goto( idx, buf ) {
		let _cnt = idx < 0 ? -idx : this._buf.length - idx;
		return this.back(_cnt, buf);
	}


	/**
	 * 修改操作历史栈大小。
	 * @return {Number}
	 */
	size() {
		return this._buf.length;
	}


	/**
	 * 清空修改操作历史栈。
	 * @return {this}
	 */
	clear() {
		return this._buf.length = 0, this;
	}


	/**
	 * 清除头部数据段。
	 * @param  {Number} len 清除长度
	 * @return {Array} 清除的部分
	 */
	shift( len = 1 ) {
		return this._buf.splice(0, len);
	}


	/**
	 * 外部压入接口。
	 * - 压入一个函数或包含back接口的对象；
	 * - 供外部补充$系之外的回退操作；
	 * - 返回压入后栈的大小或无接口时返回false；
	 * 注：
	 * - 接口返回的数据可以在回退时被收集；
	 *
	 * @param  {Object|Function} item 目标对象
	 * @return {Number|false}
	 */
	push( item ) {
		let _obj = item;

		if (typeof _obj == 'function') {
			_obj = { back: item };
		}
		return _obj.back ? this._buf.push(_obj) : false;
	}


	/**
	 * 设置/获取排除清单。
	 * - 传递list为null，清空排除名单；
	 * @param  {String} type 排除类型（func|attr|prop）
	 * @param  {Array|Set} list 名称清单
	 * @return {Array}
	 */
	exclude( type, list ) {
		if (list === undefined) {
			return [ ...__Exclude[type] ];
		}
		if (list === null) {
			return __Exclude[type].clear();
		}
		list.forEach( n => __Exclude[type].add(n) );
	}
}


//
// 节点单操作。
// - 仅包含恢复到DOM中的行为；
// @data {Node} 节点元素
//
class Node {
	/**
	 * @param {Node|null} data 数据节点
	 */
	constructor( data ) {
		if (data) {
			[this._prev, this._box] = nodeRefs(data);
		}
		this._data = data;
	}


	back() {
		if (this._prev) {
			$.after(this._prev, this._data);
		}
		// 可能为离散节点
		else if (this._box) {
			$.prepend(this._box, this._data);
		}
		return this._data;
	}
}


//
// 节点双操作。
// - 包含新内容的移除和原节点的恢复；
// @data  {Array} 节点集
// @value {Node[s]} 调用返回值存储
//
class Node2 {
	/**
	 * @param {Node|Array|null} data 数据（集）
	 */
	constructor( data ) {
		this._data = data;

		if (!$.isArray(data)) {
			data = [data];
		}
		this._sets = data.map( nd => new Node(nd) );

		this.value = null;
	}


	back() {
		if (this.value) {
			$(this.value).remove();
		}
		this._sets.forEach( it => it.back() );

		return this._data;
	}
}


//
// 文本节点恢复。
// 处理normalize的回退（单个）。
// @data {Set} 文本节点集
//
class Texts {
	/**
	 * 节点数据为集合时，会传递first求取参考节点；
	 * 否则为单个节点，直接求取其参考。
	 * @param {Set} set 文本节点集
	 */
	constructor( set ) {
		[this._prev, this._box] = nodeRefs( first(set) );
		this._data = set;
	}


	//
	// 规范化后的文本节点只有一个，
	// 先删除后恢复，UI动静较小。
	//
	back() {
		if (this._prev) {
			$.remove(this._prev.nextSibling);
			$.after(this._prev, this._data);
		} else {
			$.remove(this._box.firstChild);
			$.prepend(this._box, this._data);
		}
		return this._data;
	}
}


//
// 规范化文本。
// 处理normalize的回退。
//
class NormText {
	/**
	 * 相邻文本节点集序列。
	 * @param {[Set]} sets 节点集数组
	 */
	constructor( sets ) {
		this._data = sets;
		this._sets = sets.map( it => new Texts(it) );
	}


	back() {
		this._sets.forEach( it => it.back() );
		return this._data;
	}
}


//
// 特性操作类。
// 注记：单个字符串名称已在__Handles中检查过滤。
// @data {Map} 特性值（集）
//
class Attr {
	/**
	 * @param {Element} el 目标元素
	 * @param {String|Array} 特性名（集）
	 */
	constructor( el, names ) {
		this._data = $.attr(el, cleanList(names, 'attr'));
		// 无属性的设置值为null
		if (this._data === undefined) {
			this._data = null;
		}
		this._el = el;
		this._names = names;
	}


	back() {
		if ($.isArray(this._names)) {
			$.attr(this._el, $.mapObj(this._data));
		} else {
			$.attr(this._el, this._names, this._data);
		}
		return this._data;
	}
}


//
// 属性操作类。
// 注记：（类似同Attr）
// @data {Map} 属性值（集）
//
class Prop {
	/**
	 * @param {Element} el 目标元素
	 * @param {String|Array} 属性名（集）
	 */
	constructor( el, names ) {
		this._data = $.prop(el, cleanList(names, 'prop'));
		this._el = el;
		this._names = names;
	}


	back() {
		if ($.isArray(this._names)) {
			$.prop(this._el, $.mapObj(this._data));
		} else {
			$.prop(this._el, this._names, this._data);
		}
		return this._data;
	}
}


//
// 值属性操作。
// @data {String|Boolean|Number|Array} value属性值
//
class Value {
	constructor( el ) {
		this._data = $.val(el);
		this._el = el;
	}


	back() {
		$.val(this._el, this._data);
		return this._data;
	}
}


//
// 内联样式操作。
// @data {String} 样式属性全值
//
class Style {
	/**
	 * @param {Element} el 目标元素
	 */
	constructor( el ) {
		this._data = el.style.cssText;
		this._el = el;
	}


	back() {
		this._el.style.cssText = this._data;
		return this._data;
	}
}


//
// 滚动条操作。
// @data {Number} 当前位置
//
class Scroll {
	/**
	 * @param {Element} box 滚动容器
	 * @param {String} fn 滚动函数名（scrollTop|scrollLeft）
	 */
	constructor( box, fn ) {
		this._data = $[fn](box);
		this._box = box;
		this._fn = fn;
	}


	back() {
		$[this._fn](this._box, this._data);
		return this._data;
	}
}


//
// 事件监听操作。
//
class Event {
	/**
	 * @param {String} op  操作类型（on|off）
	 * @param {...Mixed} args $.on|.off参数序列
	 */
	constructor( op, ...args ) {
		this._op = op;
		this._data = args;
	}


	back() {
		$[this._op](...this._data);
		return this._data;
	}
}


// Expose
///////////////////////////////////////////////////////////////////////////////

$.Fx.Tracker = new History().start();


})( tQuery.proxyOwner() );