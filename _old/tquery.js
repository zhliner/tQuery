/*! $Id: tquery.js 2016.03.08 tQuery $
*******************************************************************************
            Copyright (c) 铁皮工作室 2017 MIT License

                @Project: tQuery v0.1.1
                @Author:  风林子 zhliner@gmail.com
*******************************************************************************

	节点查询器

	类似jQuery接口，但仅包含：DOM选择、DOM操作、CSS属性、Event。
	即省略jQuery里的Ajax（Fetch）、$.Deferred（Promise）、Effect（CSS3）等。
	注：括号里为JS/HTML5原生技术。

	实现：
	事件为DOM原生事件（无侵入），元素上不存储任何数据（垃圾回收）。

	注：
	IE/Edge 的 NodeList/HtmlCollection 不支持 Symbol.iterator，
	因此有关元素的原生集合，统一为Array形式。


&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&
*/

(function( window, undefined ) {

	const
		Doc = window.document,

		// 主要用于扩展选择器。
		Sizzle = window.Sizzle,

		isArr = Array.isArray,

		// 转为数组。
		// 无条件转换，仅用于DOM原生元素集类。
		// @param {LikeArray|null} its
		Arr = its => Array.from(its || ''),

		// 类数组检测转换。
		// 如果原参数为数组，直接返回。类数组才会转换。
		// @param {Array|LikeArray|...} its
		$A = its => isArr(its) ? its : arrLike(its) && Array.from(its),

		// 单一目标。
		// slr: 包含前置#字符。
		// @return {Element|0}
		$id = slr => Doc.getElementById(slr.substring(1)),

		// 简单选择器。
		// @return {Array}
		$tag = ( tag, ctx ) => Arr( ctx.getElementsByTagName(tag) ),

		// 简单选择器。
		// slr: 包含前置.字符
		// @return {Array}
		$class = ( slr, ctx ) => Arr( ctx.getElementsByClassName(slr.substring(1)) ),

		// 检索元素或元素集。
		// 选择器支持“>”表示上下文元素直接子元素。
		// fn: {String} querySelector[All]
		$find = ( slr, ctx, fn ) => slr[0] == '>' ? $sub( slr, ctx, s => ctx[fn](s) ) : ctx[fn]( slr || null ),

		// 单一目标。
		// slr首字符>表示当前上下文子元素限定。
		// 如“>p”表示ctx的直接子元素里的p元素。
		// @return {Element|null}
		$one = function( slr, ctx ) {
			if (__reID.test(slr)) {
				return $id(slr);
			}
			return $find(slr, ctx || Doc, 'querySelector');
		},

		// 多目标。
		// slr首字符>表示当前上下文子元素限定。
		// @return {Array|Element}
		$all = Sizzle || function( slr, ctx ) {
			ctx = ctx || Doc;

			if (__reID.test(slr)) {
				return $id(slr) || [];
			}
			let _els;
			if (__reTAG.test(slr)) {
				_els = $tag(slr, ctx);
			}
			else if (__reCLASS.test(slr)) {
				_els = $class(slr, ctx);
			}
			else {
				_els = $find(slr, ctx, 'querySelectorAll');
			}
			return Arr(_els);
		};


	const
		// 返回目标的类型。
		// 注：返回的是目标对象构造函数的名称，不会转为小写；
		// @param  {mixed} val 目标数据
		// @return {String} 类型名（如 "String", "Array"）
		$type = function( val ) {
			return (val === null || val === undefined) ?
				val + '' :
				val.constructor.name;
		},

		// 元素匹配判断。
		// - 如果不存在matches，外部提供polyfill；
		// @param  {Element} el
		// @param  {Selector|Element} slr
		// @return {Boolean}
		$is = Sizzle && Sizzle.matchesSelector || function( el, slr ) {
			if (typeof slr != 'string') {
				return el === slr;
			}
			return slr[0] != '>' && el.matches(slr);
		},

		// 去除重复并排序。
		// @param {Elements|Iterator} els
		// @return {Array} 结果集（新数组）
		uniqueSort = Sizzle && Sizzle.uniqueSort || function( els ) {
			return els.length > 1 ?
				[...new Set( values(els) )].sort(sortElements) : els;
		};


	const
		// http://www.w3.org/TR/css3-selectors/#whitespace
		whitespace = "[\\x20\\t\\r\\n\\f]",

		// identifier: http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
		identifier 	= "(?:\\\\.|[\\w-]|[^\0-\\xa0])+",

		// otherwise createTextNode.
		rhtml = /<|&#?\w+;/,

		// 像素值表示
		rpixel = /^[+-]?\d[\d.e]*px$/i,

		// Support: IE <=10 - 11, Edge 12 - 13
		// In IE/Edge using regex groups here causes severe slowdowns.
		// See https://connect.microsoft.com/IE/feedback/details/1736512/
		noInnerhtml = /<script|<style|<link/i,

		// SVG元素名称空间。
		svgNS = 'http://www.w3.org/2000/svg',

		// 简单选择器。
		// 用于原生ID/Class/Tag优先检索。
		__reID 		= new RegExp( "^#(" + identifier + ")$" ),
		__reCLASS 	= new RegExp( "^\\.(" + identifier + ")$" ),
		__reTAG 	= new RegExp( "^(" + identifier + "|[*])$" ),

		// 空白匹配
		__chSpace 	= new RegExp( whitespace + "+", "g" ),

		// data系属性包含简写的匹配。
		// 如：-val => data-val
		__dataName 	= new RegExp( "^(?:data)?-(" + identifier + ")+$" ),

		// 私有存储 {Element: String}
		// 用于toggleClass整体切换元素类名。
		__classNames = new WeakMap();


	const
		version = 'tQuery-0.1/tpb-0.3',

		// 内部标识
		// 临时属性名（合法怪异）
		hackFix = '__tquery20161227--' + Date.now(),

		// 自我标志
		ownerToken = Symbol && Symbol() || hackFix,

		//
		// 位置值定义。
		// 用于插入元素的位置指定，可以混用名称与数值。
		// {
		//  	before 	= 1 	参考元素之前
		//  	after  	= -1 	参考元素之后
		//  	begin  	= 2 	参考元素内起始点（头部）
		//  	prepend = 2 	同上
		//  	end 	= -2  	参考元素内结束点（末尾）
		//  	append 	= -2	同上
		//  	fill 	= 0 	内容填充（覆盖，清除原有）
		//  	replace = '' 	替换
		// }
		// 示意：
		//   // 1
		//   <p>
		//    	// 2
		//    	<span>...</span>
		//    	// -2
		//   </p>
		//   // -1
		//
		// 理解（记忆）：
		//   1： 表示与目标同级，只有1个层次。负值反向取末尾。
		//   2： 表示为目标子级元素，2个层次。负值取末尾。
		//   0： 清空原有数据后填充（清零）。
		//   '': 替换，脱离但有所保持（位置）。
		//
		Wheres = {
			'before': 	 1,
			'after': 	-1,
			'begin': 	 2,
			'prepend': 	 2,
			'end': 		-2,
			'append': 	-2,
			'fill': 	 0,
			'replace': 	'',

			'1': 1,  '-1': -1,  '2': 2,  '-2': -2, '0': 0, '': '',
		};



/**
 * 子级限定检索。
 * - 会对上下文元素设置临时唯一属性；
 * - 子级限定兼容“>*”非标准选择器；
 * 例：
 *  	ol/li/ol/li，ctx 假设为第一个<ol>
 * 检索：
 *   - Sizzle('>li', ctx)  => 返回上级<li>
 *   - ctx.querySelectorAll('>li')  => 语法错误
 *   - $sub('>li', ctx, 'querySelectorAll')  => 同Slizzle（在$all中调用）
 *
 * 注意：
 * 与jQuery/Sizzle的细微不同：
 * - Sizzle('ol>li', ctx)  => 返回末尾一个<li>（ctx:ol不检测匹配）
 * - ctx.querySelectorAll('ol>li')  => 返回两级<li>（ctx:ol参与检测匹配）
 *
 * - Sizzle('>li', ctx) =>
 * 	 	返回ctx子级<li>元素集，无孙级<li>
 * - $all('>li', ctx) =>
 *  	会尝试匹配孙级<li>，但ctx已被hack一个临时属性，选择器变形如：
 * 		'OL[__tquery20161227--1492870889566] >li'
 *   	即便二级<ol>有属性，其<li>匹配成功可能性也极低，
 *   	因此视为与 Sizzle 等同。
 *
 * @param  {Selector} slr 目标选择器
 * @param  {Element} ctx  父容器元素
 * @param  {Function} handle 检索回调
 * @return {Value} handle 的返回值
 */
function $sub( slr, ctx, handle ) {
	if (ctx.nodeType != 1) {
		return null;
	}
	try {
		return handle( `${ctx.nodeName}[${hackAttr(ctx)}] ` + slr );
	}
	catch (e) {
		console.error(e);
	}
	finally {
		hackAttrClear(ctx);
	}
}


/**
 * 临时hack属性标记。
 * - 针对选择器首个字符为“>”时的非标准选择器；
 * - 添加临时属性名，便于构造合法准确的选择器；
 * 注记：
 * - 简单的前置标签名存在误差，需插入一个临时属性名限定；
 * - 检索前添加属性名，检索后即时删除（finally）；
 *
 * querySelector[All]特性：
 * - ctx.querySelector('>li') => 语法错误。
 * - ctx.querySelector('ol>li') => 也匹配子级“ol>li”结构
 *
 * Hack：
 * - ctx.querySelector('ol[tempXXX] >li ...') => 合法
 *
 * @param  {Element} ctx 上下文容器元素
 * @return {String} 属性选择器
 */
function hackAttr( ctx ) {
	if (!ctx.hasAttribute( hackFix )) {
		ctx[ ownerToken ] = true;
		ctx.setAttribute( hackFix, '' );
	}
	return hackFix;
}


/**
 * 临时hack属性清除。
 * - 与hackAttr配套使用；
 * 注记：
 *   另用ownerToken设置可靠标识，
 *   预防原始节点存在hackFix属性名的情况。
 *
 * @param {Element} ctx 上下文容器元素
 */
function hackAttrClear( ctx ) {
	if (ctx[ ownerToken ]) {
		delete ctx[ ownerToken ];
		ctx.removeAttribute( hackFix );
	}
}


/**
 * DOM查询器（Query）。
 * - 查询结果为集合，如果仅需一个元素可用.One；
 * its: {
 *  	Selector 	选择器查询
 *  	Element 	元素包装
 *  	Elements 	元素集（类数组）包装
 *  	.values 	支持values接口的迭代器（如Set）
 *  	Function 	DOM ready回调
 *  	Queue		当前实例或已封装对象
 *  	...... 		无效参数，构造一个空集
 * }
 * @param  {Mixed} its
 * @param  {Element|Queue} ctx 查询上下文
 * @return {Queue}
 */
function $( its, ctx, _$ ) {
	its = its || '';
	_$ = _$ || tQuery;

	// 最优先
	if (typeof its == 'string') {
		return new Queue( $all(its.trim(), ctx), null, _$ );
	}
	if (isQueue(its)) {
		return its;
	}
	// 初始就绪
	if ( isFunc(its) ) {
		return _$.ready(its);
	}
	return new Queue( its, null, _$ );
}


// 原始$存储。
const tQuery = $;


// 代理存储。
let $Proxy = $;


/**
 * 应用代理设置。
 * - 设置对$调用的代理；
 * @param  {Object} handles 代理定义集
 * @return {Object} handles
 */
function proxyApply( handles ) {
	handles.apply = (fn, self, a) =>
		Reflect.apply(fn, self, [a[0], a[1], $Proxy]);

	return handles;
}


/**
 * 获取/设置嵌入代理。
 * - 由外部定义内部$的代理配置；
 * - 代理应用到$和Queue实例上，其行为由外部控制；
 * - 无参数调用时返回先前的代理实例；
 * 注：
 * - 这是一个特别的接口，允许外部嵌入代理控制；
 * - 可用于$系和$()系的操作跟踪；
 *
 * @param  {Object} handles 代理定义集
 * @return {Proxy} 代理器实例
 */
$.proxyOwner = function( handles ) {
	if (handles === undefined) {
		return $Proxy;
	}
	return ( $Proxy = new Proxy($Proxy, proxyApply(handles)) );
};


//
// 功能扩展区
// 外部扩展用，名称空间约定。
//
$.Fx = {};



//
// 集中定义。
// - 基本工具；
// - DOM相关操作的单元素版；
// 注：
// - 返回this和返回$是不同的，因为$可能被代理；
//
const $Methods = {

	//== 基本工具 =============================================================
	// 该部分没有集合版。


	/**
	 * 创建DOM元素。
	 * - 传递data为数组表示内容填充[String|Node]；
	 * - data字符串数据作为源码html方式插入；
	 * - data节点数据作为内容被简单的插入（移动）；
	 * - 支持名称空间。如创建SVG元素（http://www.w3.org/2000/svg）；
	 * - data配置对象支持3个特别属性：html, text, node；
	 * data配置: {
	 *  	html: 	值为源码
	 *  	text: 	值为文本
	 *  	node: 	值为节点/集（移动插入）
	 *  	.... 	特性（Attribute）值
	 * }
	 * data数组: [
	 *  	{String} html方式填充
	 *  	{Node}   节点移动插入
	 *
	 *  	// 混合成员
	 *  	// 取首个成员类型
	 *  	{Node, String} 节点。节点仍为移动
	 *  	{String, Node} 字符串。节点为取其outerHTML
	 * ]
	 * @param  {String} tag   标签名
	 * @param  {Object|Array|LikeArray|String|Node} data 配置对象或数据（集）
	 * @param  {String} ns    所属名称空间
	 * @param  {Document} doc 所属文档
	 * @return {Element} 新元素
	 */
	Element( tag, data, ns, doc = Doc ) {
		let _el = ns ?
			doc.createElementNS(ns, tag) :
			doc.createElement(tag);

		return this.type(data) == 'Object' ?
			// 注记：
			// 因支持嵌入代理，故传入this。
			setElem(this, _el, data) : fillElem(this, _el, data);
	},


	/**
	 * 创建一个文本节点。
	 * - 如果参数为节点元素，取其文本创建；
	 * @param  {String|Node} code 文本或节点元素
	 * @param  {Document} doc 所属文档
	 * @return {Node} 新文本节点
	 */
	Text( code, doc = Doc ) {
		return doc.createTextNode(
			code.nodeType ? code.textContent : code
		);
	},


	/**
	 * 查询单个元素。
	 * - 先尝试$one（querySelector或ID定位）；
	 * - 失败后尝试Sizzle（非标准CSS选择器时）；
	 * @param  {Selector} slr 选择器
	 * @param  {Element} ctx 查询上下文
	 * @return {Element|null}
	 */
	One( slr, ctx ) {
		try {
			return $one(slr.trim(), ctx);
		}
		catch(e) {
			console.warn(e);
		}
		return Sizzle && Sizzle(slr, ctx)[0] || null;
	},


	/**
	 * 创建文档片段。
	 * - 脚本元素被强制清理，存储至script中；
	 * - 脚本元素包括：script, style, link三种类型；
	 * @param  {String} html 源码
	 * @param  {Array} script 脚本元素存储
	 * @param  {Document} doc 所属文档
	 * @return {DocumentFragment} 文档片段
	 */
	create( html, script, doc = Doc ) {
		if (typeof html != 'string') {
			return null;
		}
		return buildFragment(html, doc, script);
	},


	/**
	 * SVG系元素创建。
	 * - opts特性配置参数同.Element；
	 * - 若配置内容包含节点，注意名称空间的一致性；
	 * - 创建svg元素本身时标签名可省略，即首个参数为配置对象；
	 *   如：$.svg( {width: ...} )
	 * opts: {
	 *  	html: 	值为源码
	 *  	text: 	值为文本
	 *  	node: 	值为节点/集（移动插入）
	 *  	.... 	特性（Attribute）值
	 * }
	 * @param  {String} tag SVG子元素标签或svg元素配置，可选
	 * @param  {Object} opts 元素特性配置（Attribute），可选
	 * @return {Element} 新元素
	 */
	svg( tag, opts, doc = Doc ) {
		if (typeof tag != 'string') {
			opts = tag;
			tag = 'svg';
		}
		return setElem(this, doc.createElementNS(svgNS, tag), opts);
	},


	/**
	 * 创建表格。
	 * rows（二维数组）：
	 * - 数组成员为单元格数组，定义每一行；
	 * - 支持在列数据单元上设置单元格标签名（tagName）；
	 * - 单元格数据类型：{
	 *   	字符串：  直接赋值
	 *   	元素：    取innerHTML
	 *   	文本节点：取textContent
	 *   	....	  取其字符串表达
	 * }
	 * style: {
	 *   	2  	[thead, tbody] rows首行为thead，剩余行为tbody
	 *   	3 	[thead, tbody, tfoot] rows首尾行分别为thead/tfoot，其余为tbody
	 *   	1 	[tbody] 仅含tbody单元，默认
	 *   	-2 	[tbody, tfoot] 无表头但有表脚，非常规结构
	 * }
	 * @param  {Array} rows 行列数据集
	 * @param  {String} caption 表标题，可选
	 * @param  {Number} style 新表样式，可选
	 * @return {Element} 表格元素
	 */
	table( rows, caption, style, doc = Doc ) {
		let _tbl = doc.createElement('table'),
			_body = _tbl.createTBody();

		if (!rows) return _tbl;

		if (caption) {
			_tbl.createCaption().innerHTML = caption;
		}
		switch (style) {
			case 3:
			case -2:
				tableRow(rows.pop(), 'td', _tbl.createTFoot().insertRow());
				if (style < 0) break;
				/* falls through */
			case 2:
				tableRow(rows.shift(), 'th', _tbl.createTHead().insertRow());
		}
		// tbody...
		for ( let cols of rows ) {
			tableRow(cols, 'td', _body.insertRow());
		}
		return _tbl;
	},


	/**
	 * 通用遍历。
	 * - 回调返回false终止遍历，其它值为continue逻辑；
	 * - 适用于数组/类数组、Map/Set、普通对象和包含.entries的实例；
	 * - 注：Queue集合版可直接使用该接口；
	 * handle：(
	 *  	值/元素,
	 *  	键/下标,
	 *  	迭代对象自身
	 * )
	 * - 与jQuery不同，因箭头函数的出现，不自动绑定this；
	 * - 参数与数组forEach标准接口相似，this也由外部传入；
	 *
	 * @param  {Array|LikeArray|Object|[.entries]} obj 迭代目标
	 * @param  {Function} handle 迭代回调（val, key）
	 * @param  {Object} self 迭代回调内的this
	 * @return {Object} 迭代的目标对象
	 */
	each( obj, handle, self ) {
		if (self) {
			handle = handle.bind(self);
		}
		for ( let [k, v] of entries(obj) ) {
			if (handle(v, k, obj) === false) break;
		}
		return obj;
	},


	/**
	 * 构造范围序列
	 * - 序列为[beg:end]，end作为最后一个值存在；
	 * - 如果beg为字符串，则构造字符Uncode范围序列；
	 * - 构造字符范围时，数值end表示长度而非终点值；
	 * @param  {Number|String} beg 起始值
	 * @param  {Number|String} end 末尾值或长度
	 * @param  {Boolean} toArr 直接生成数组
	 * @return {Iterator} 范围生成器
	 */
	range( beg, end = beg, toArr = false ) {
		let _iter = typeof beg == 'number' ?
			rangeNumber( beg, end-beg + 1 ) : rangeChar( beg.codePointAt(0), end );

		return toArr ? [..._iter] : _iter;
	},


	/**
	 * 当前时间毫秒数。
	 * - 自纪元开始后的毫秒数（与时区无关）；
	 * - 传递json为真，返回JSON标准格式串；
	 * @param  {Boolean} json JSON格式串
	 * @return {Number|String}
	 */
	now( json ) {
		return json ? new Date().toJSON() : Date.now();
	},


	/**
	 * 检查XML节点。
	 * - 是否在XML文档中，或者是一个XML文档；
	 * 注：copy from Sizzle.isXML
	 * @param  {Element|Document} el
	 * @return {Boolean}
	 */
	isXML( el ) {
		let _docElem = el && (el.ownerDocument || el).documentElement;
		return _docElem ? _docElem.nodeName !== "HTML" : false;
	},


	/**
	 * 文档就绪绑定。
	 * - 可以绑定多个，将会按绑定先后逐个调用；
	 * - 若文档已载入并且未被hold，会立即执行；
	 *
	 * @param  {Function} handle 用户调用
	 * @return {this}
	 */
	ready( handle ) {
		if (handle === this) {
			return;
		}
		domReady.bind(
			handle,
			() => (domReady.ready(), domReady.loaded = true)
		);
		return this;
	},


	/**
	 * 就绪把持。
	 * - 只在文档载入后才会就绪调用（可能释放较早）；
	 * - 如果文档已经就绪调用，本操作无效（同jQuery）；
	 * @param {Boolean} hold 持有或释放
	 */
	holdReady( hold ) {
		domReady.waits += hold ? 1 : -1;
		return domReady.loaded && domReady.ready();
	},


	/**
	 * 插入脚本元素。
	 * - 用源码构建脚本元素并插入容器元素，返回脚本元素本身；
	 * - 也可直接传递一个脚本元素，返回Promise对象，then参数为脚本元素；
	 * - 如果未指定容器，导入之后会被移出DOM；
	 *   容器基本上只是一个保留标志，脚本导入位置并不重要。
	 * 注记：
	 * - 其它节点插入方法排除脚本源码，因此单独支持；
	 * - 克隆的脚本元素修改属性后再插入，浏览器不会执行；
	 *
	 * @param  {String|Element} code 脚本代码或脚本元素
	 * @param  {Element} box DOM容器元素，可选
	 * @return {Element|Promise} 脚本元素或承诺对象
	 */
	script( code, box ) {
		if (typeof code == 'string') {
			let _el = switchInsert(
					this.Element('script', { text: code }),
					box || Doc.head
				);
			return box ? _el : detach(_el);
		}
		return code.nodeType == 1 &&
			loadElement(this, code, box || Doc.head, null, !box);
	},


	/**
	 * 插入样式元素。
	 * - 构建样式元素填入内容并插入DOM；
	 * - 默认插入head内部末尾，否则插入next之前；
	 * - 也可直接传递构造好的样式元素，返回一个Promise对象；
	 * - 用源码构造插入时，返回构造的样式元素；
	 *
	 * @param  {String|Element} code 样式代码或样式元素
	 * @param  {Element} next 参考元素，可选
	 * @return {Element|Promise} 样式元素或承诺对象
	 */
	style( code, next = Doc.head ) {
		if (typeof code == 'string') {
			return switchInsert(
				this.Element('style', { text: code }),
				Doc.head,
				next
			);
		}
		return code.nodeType == 1 && loadElement(this, code, Doc.head, next);
	},


	/**
	 * 元素动画启动。
	 * - 对Element.animate()接口的简单封装；
	 *   （提供简单常用的默认值）
	 * @param  {Element} el  动画元素
	 * @param  {Array|Object} kfs 关键帧配置集/对象
	 * @param  {Object} opts 动画配置选项
	 * @return {Animation} 动画实例
	 */
	animate( el, kfs, opts ) {
		return el.animate(
			kfs,
			Object.assign(
				{ duration: 2000, iterations: Infinity },
				opts
			)
		);
	},



	//== DOM 节点遍历 =========================================================
	// 参数：
	// {Filter} fltr 指可用于$.filter的筛选参数。{Selector|Function|Element|Array}


	/**
	 * 查找匹配的元素集。
	 * @param  {Selector} slr 选择器
	 * @param  {Boolean} self 扩展匹配自身
	 * @return {Array}
	 */
	find( el, slr, self ) {
		let _els = $all(slr.trim(), el),
			_box = [];

		if (self && $is(el, slr)) {
			_box = [el];
		}
		return _box.concat(_els);
	},


	/**
	 * 下一个兄弟元素。
	 * - 可能没有或不匹配；
	 * @param  {Selector} slr 选择器，可选
	 * @return {Element|null}
	 */
	next( el, slr ) {
		return _next(el, slr, 'nextElementSibling');
	},


	/**
	 * 后续全部兄弟。
	 * - 可选的用slr进行匹配过滤；
	 * @param  {Selector} slr 选择器，可选
	 * @return {Array}
	 */
	nextAll( el, slr ) {
		return _nextAll(el, slr, 'nextElementSibling');
	},


	/**
	 * 后续兄弟...直到。
	 * - 获取后续全部兄弟元素，直到slr但不包含；
	 * @param  {Selector|Element} slr 选择器或元素，可选
	 * @param  {Filter} fltr 进阶筛选，可选
	 * @return {Array}
	 */
	nextUntil( el, slr, fltr ) {
		return this.filter(
			_nextUntil(el, slr, 'nextElementSibling'), fltr
		);
	},


	/**
	 * 前一个兄弟元素。
	 * - 可能没有或不匹配；
	 * @param  {Selector} slr 选择器，可选
	 * @return {Element|null}
	 */
	prev( el, slr ) {
		return _next(el, slr, 'previousElementSibling');
	},


	/**
	 * 前部全部兄弟。
	 * - 可选的用slr进行匹配过滤；
	 * 注：结果集会保持逆向顺序（靠近起点的元素在前）；
	 * @param  {Selector} slr 选择器，可选
	 * @return {Array}
	 */
	prevAll( el, slr ) {
		return _nextAll(el, slr, 'previousElementSibling');
	},


	/**
	 * 前端兄弟...直到。
	 * - 获取前端全部兄弟元素，直到slr但不包含；
	 * 注：结果集成员会保持逆向顺序；
	 * @param  {Selector|Element} slr 选择器或元素，可选
	 * @param  {Filter} fltr 进阶筛选，可选
	 * @return {Array}
	 */
	prevUntil( el, slr, fltr ) {
		return this.filter(
			_nextUntil(el, slr, 'previousElementSibling'), fltr
		);
	},


	/**
	 * 获取直接子元素集。
	 * @param  {Filter} fltr 过滤器，可选
	 * @return {Array}
	 */
	children( el, fltr ) {
		return this.filter( el.children, fltr );
	},


	/**
	 * 获取当前元素的兄弟元素。
	 * - 目标元素需要在一个父元素之内才有意义；
	 * @param  {Filter} fltr 过滤器，可选
	 * @return {Array}
	 */
	siblings( el, fltr ) {
		let _els = Arr(el.parentElement.children);
		_els.splice(_els.indexOf(el), 1);

		return this.filter(_els, fltr);
	},


	/**
	 * 获取直接父元素。
	 * - 会用可选的选择器或回调或元素检查是否匹配；
	 * @param  {Selector|Element|Function} slr 选择器或元素或测试函数，可选
	 * @return {Element|null}
	 */
	parent( el, slr ) {
		let _pel = el.parentNode;

		if ( isFunc(slr) ) {
			return slr(_pel) ? _pel : null;
		}
		return !slr || $is(_pel, slr) ? _pel : null;
	},


	/**
	 * 汇集当前元素的全部上级元素，直到匹配。
	 * - 从父元素开始检查匹配；
	 * - 不包含终止匹配的父级元素；
	 * - 允许slr为空无需匹配（同jQ.parents）；
	 * @param  {Element} el  当前元素
	 * @param  {Filter} slr  终止匹配
	 * @param  {Filter} fltr 进阶过滤器
	 * @return {Array}
	 */
	parentsUntil( el, slr, fltr ) {
		let _buf = [],
			_fun = getFltr(slr);

		while ( (el = el.parentElement) && (!_fun || !_fun(el)) ) {
			_buf.push(el);
		}
		return this.filter(_buf, fltr);
	},


	/**
	 * 最近匹配父级元素。
	 * - 向上逐级检查父级元素是否匹配；
	 * - 从当前元素自身开始测试；
	 * - 如果抵达document或DocumentFragment会返回null；
	 * @param  {Filter} slr 匹配选择器
	 * @return {Element|null}
	 */
	closest( el, slr ) {
		if (el.closest && typeof slr == 'string') {
			return el.closest( slr );
		}
		let _fun = getFltr(slr);

		while (el && !_fun(el)) {
			el = el.parentElement;
		}
		return el;
	},


	/**
	 * 获取最近父级定位元素。
	 * - 从父元素开始检查匹配；
	 * - 如果最终没有匹配返回文档根（同jQuery）；
	 * - 如果当前元素属于SVG子节点，会返回svg元素本身；
	 *   （SVG节点定位由属性配置，与style无关）
	 * 最近上级定位元素：
	 *   CSS::position: relative|absolute|fixed
	 * 注记：
	 * 元素原生拥有offsetParent属性。
	 * 不管是否隐藏，只要position被设置为非static即是。
	 *
	 * @return {Element|null}
	 */
	offsetParent( el ) {
		// html
		let _end = el.ownerDocument.documentElement;

		while ( (el = el.parentElement) ) {
			if (getStyles(el).position != 'static' || el.nodeName == 'svg') break;
		}
		return el || _end;
	},


	//-- DOM 节点过滤 ---------------------------------------------------------
	// 集合操作，也即Queue的免实例化版。


	/**
	 * 过滤元素集。
	 * - 如果没有过滤条件，返回原始集；
	 * - 如果目标集不为数组或类数组，原样返回；
	 * @param  {Elements} els 目标元素集
	 * @param  {Selector|Function|Element|Array} fltr 筛选条件
	 * @return {Array}
	 */
	filter( els, fltr ) {
		if (!fltr || !els.length) {
			return $A(els);
		}
		if ( isQueue(els) ) {
			els = els.get();
		}
		return $A(els).filter( getFltr(fltr) );
	},


	/**
	 * 包含过滤。
	 * - 目标元素（集）被本集合中元素作为子级元素包含；
	 * - 或目标选择器与集合中元素的子级元素匹配；
	 * 测试调用：func(el)
	 * @param  {Elements} els 目标元素集
	 * @param  {Filter} slr 筛选器
	 * @return {Array}
	 */
	has( els, slr ) {
		let _f = slr;

		if (!_f || !els.length) {
			return els;
		}
		if (typeof _f == 'string') {
			_f = el => this.find(el, slr).length;
		}
		else if (_f.length) {
			_f = el => slr.some( e => this.contains(el, e) );
		}
		else if (_f.nodeType) {
			_f = el => slr !== el && this.contains(el, slr);
		}
		return isFunc(_f) && $A(els).filter(_f);
	},


	/**
	 * 排除过滤。
	 * - 从集合中移除匹配的元素；
	 * @param  {Elements} els 目标元素集
	 * @param  {Filter} slr 筛选器
	 * @return {Array|false}
	 */
	not( els, slr ) {
		let _f = slr;

		if (!_f || !els.length) {
			return els;
		}
		if (typeof _f == 'string') {
			_f = el => !$is(el, slr);
		}
		else if (_f.length) {
			_f = el => slr.indexOf(el) < 0;
		}
		else if (_f.nodeType) {
			_f = el => el !== slr;
		}
		return isFunc(_f) && $A(els).filter(_f);
	},


	//-- DOM 节点操作 ---------------------------------------------------------
	// 注：before after prepend append replace fill 见后统一定义


	/**
	 * 外层包裹。
	 * - 在目标节点外包一层元素（容器）；
	 * - 包裹容器可以是一个现有的元素或html结构字符串或取值函数；
	 * - 包裹采用结构字符串时，会递进至最深层子元素为容器；
	 * - 直接提供或返回元素，会被视为父容器，内容插入前端（与jQuery异）；
	 * @param  {Node} node 目标节点
	 * @param  {Html|Element|Function} box 包裹容器
	 * @return {Element|false} 包裹容器元素
	 */
	wrap( node, box ) {
		return node.nodeType <= 3 && wrapData(this, node, box, node);
	},


	/**
	 * 内层包裹。
	 * - 在目标元素内嵌一层包裹元素（即对内容wrap）；
	 * @param  {Element} el 目标元素
	 * @param  {Html|Element|Function} box 包裹容器
	 * @return {Element|false} 包裹容器元素
	 */
	wrapInner( el, box ) {
		return el.nodeType == 1 && wrapData(this, el, box, el.childNodes);
	},


	/**
	 * 元素解包裹。
	 * - 用元素内容替换元素本身（内容上升到父级）；
	 * @param  {Element} el 容器元素
	 * @return {Array} 容器子节点集
	 */
	unwrap( el ) {
		return el.nodeType == 1 && this.replace(el, this.contents(el));
	},


	/**
	 * 节点移出DOM。
	 * - 仅文本节点和元素有效；
	 * @param  {Node} node 节点元素
	 * @return {Node} 原节点引用
	 */
	detach( node ) {
		return remove(node, false);
	},


	/**
	 * 删除节点。
	 * - 删除后不再返回原节点引用；
	 * @param  {Node} node 节点元素
	 * @return {this}
	 */
	remove( node ) {
		return remove(node, true), this;
	},


	/**
	 * 清空元素内容。
	 * - 仅适用于元素节点；
	 * @param  {Element} el 目标元素
	 * @return {this}
	 */
	empty( el ) {
		if (el.nodeType == 1) el.textContent = '';
		return this;
	},


	/**
	 * 内容节点规范化。
	 * - 元素同名Api的封装，清理相邻文本节点；
	 * - 此为节点修改操作，封装供代理嵌入使用；
	 * one参数：
	 * - 它是一个告知，说明实际仅有子元素层级会被修改；
	 * - 它用于告知嵌入的代理，以便于优化性能；
	 * - 如果你不明白它的具体用意，简单忽略即可；
	 * 注记：
	 *   没有办法控制DOM原生normalize接口合并哪些节点，
	 *   因此只能籍由用户主动告知。
	 * @param  {Element} el  目标元素
	 * @param  {Boolean} one 仅直接子节点有合并
	 * @return {this|one} this或告知值
	 */
	normalize( el, one ) {
		if (el.nodeType == 1) el.normalize();
		return one || this;
	},


	/**
	 * 节点克隆。
	 * - event和deep两个参数仅适用于元素节点；
	 * - 元素节点默认深层克隆（包含子节点一起）；
	 * - 可选注册事件是否一起克隆；
	 * @param  {Node}  el 目标节点
	 * @param  {Boolean}  event 事件克隆，可选
	 * @param  {Boolean} deep 深层克隆，可选
	 * @return {Node} 克隆的新节点
	 */
	clone( el, event, deep = true ) {
		let _new = el.cloneNode(deep);

		if (!event || el.nodeType != 1) {
			return _new;
		}
		let _src = [el],
			_des = [_new];

		if (deep) {
			_src.push( ...$tag('*', el) );
			_des.push( ...$tag('*', _new) );
		}
		for (let i = 0; i < _src.length; i++) {
			Event.clone(_des[i], _src[i]);
		}
		return _new;
	},


	/**
	 * 获取/转换元素内容。
	 * - 可传递一个加工函数对内容做定制处理；
	 * - 默认的加工函数返回子元素、文本和注释节点；
	 * 加工函数：
	 * - 参数：直接子节点；
	 * - 返回数组时成员被提取，返回null被忽略；
	 * @param  {Element} el 容器元素
	 * @param  {Function} proc 加工函数
	 * @return {Array}
	 */
	contents( el, proc ) {
		proc = proc || usualNode;
		return this.map( el.childNodes, nd => proc(nd) );
	},


	/**
	 * 包含检查。
	 * - 检查容器节点是否包含目标节点；
	 * - 目标即是容器本身也为真（与DOM标准相同）；
	 * 注：与jQuery.contains有所不同；
	 * @param  {Node} box 容器节点
	 * @param  {Node} node 检查目标
	 * @return {Boolean}
	 */
	contains( box, node ) {
		let _nt = node.nodeType;

		if (_nt != 1 && _nt != 3) {
			return false;
		}
		return box.contains ?
			box.contains(node) :
			box === node || box.compareDocumentPosition(node) & 16;
	},


	//-- DOM 属性操作 ---------------------------------------------------------


	/**
	 * 类名添加。
	 * - 支持空格分隔的类名序列；
	 * - 支持回调函数获取类名：func(oldName)；
	 * @param  {String|Function} names
	 * @return {this}
	 */
	addClass( el, names ) {
		if ( isFunc(names) ) {
			names = names( el.getAttribute('class') );
		}
		names.trim()
			.split(__chSpace)
			.forEach( function(it) { this.add(it); }, el.classList );

		return this;
	},


	/**
	 * 移除类名。
	 * - 支持空格分隔的类名序列；
	 * - 支持回调函数获取类名：func(oldName)；
	 * - 未指定名称移除全部类名（删除class属性）；
	 * @param  {String|Function} names
	 * @return {this}
	 */
	removeClass( el, names ) {
		if (! names) {
			el.removeAttribute('class');
			return this;
		}
		if ( isFunc(names) ) {
			names = names( el.getAttribute('class') );
		}
		names.trim()
			.split(__chSpace)
			.forEach( function(it) { this.remove(it); }, el.classList );

		return this;
	},


	/**
	 * 类名切换。
	 * - 支持空格分隔的多个类名；
	 * - 支持回调函数获取类名：func(oldName)；
	 * - 无参数调用时，操作针对整个类名集；
	 * - val也作为整体操作时的强制设定（Boolean）；
	 * 注记：
	 * - 暂不依赖toggle的第二个参数；
	 * - 可正确处理SVG元素的class类属性；
	 *
	 * @param  {String|Boolean|Function} val 目标值，可选
	 * @param  {Boolean} force 强制设定，可选
	 * @return {this}
	 */
	toggleClass( el, val, force ) {
		let _cls = el.getAttribute('class');

		if ( isFunc(val) ) {
			val = val(_cls);
		}
		if (val && typeof val == 'string') {
			return clsToggle(this, el, val.trim(), force);
		}
		if (_cls) {
			// 私有存储
			__classNames.set(el, _cls);
		}
		this.attr( el, 'class',
			!val && _cls ? null : __classNames.get(el) || null
		);
		return this;
	},


	/**
	 * 类名匹配检查。
	 * - 空格分隔的多个类名为And关系；
	 * 注：
	 * - jQuery中同名方法里空格没有分隔符作用；
	 * @param  {String} names
	 * @return {Boolean}
	 */
	hasClass( el, names ) {
		return names.trim()
			.split(__chSpace)
			.every(
				it => el.classList.contains(it)
			);
	},


	/**
	 * 特性获取/修改（Attribute）
	 * name: {
	 *  	xx 		普通名称
	 *  	data-x 	data系名称
	 *  	-xx 	data系名称简写
	 *  	{Array} 	名称集（获取时）
	 *  	{Object} 	名/值对象（设置时）
	 * }
	 * - value未定义时为获取。支持名称数组，返回一个Map；
	 * - value有值时为设置，value支持回调取得新值；
	 * - name为名值对对象时，内部值也可为回调函数，与其键对应；
	 * - value回调参数（oldval, el）；
	 * - value传递null会删除目标特性；
	 *
	 * @param  {String|Array|Object} name 名称（集）或名/值对象
	 * @param  {String|Number|Boolean|Function|null} value 新值或回调函数
	 * @return {Value|Map|this}
	 */
	attr( el, name, value ) {
		if (value !== undefined || $type(name) == 'Object') {
			hookSets(el, name, value, elemAttr);
			return this;
		}
		return hookGets(el, name, elemAttr);
	},


	/**
	 * 属性获取/修改（Property）。
	 * - name说明同attr；
	 * - 与attr不同，value传递null会赋值为null（而非删除）；
	 *
	 * @param  {String|Array|Object} name
	 * @param  {String|Number|Boolean|Function|null} value
	 * @return {Value|Map|this}
	 */
	prop( el, name, value ) {
		if (value !== undefined || $type(name) == 'Object') {
			hookSets(el, name, value, elemProp);
			return this;
		}
		return hookGets(el, name, elemProp);
	},


	/**
	 * 删除特性（集）。
	 * - 支持data系特性名的简写形式；
	 * 注：与jQuery不同，多个名称传递一个数组（而非空格分隔）；
	 * @param  {Element} el 目标元素
	 * @param  {String|Array} names 名称（集）
	 * @return {this}
	 */
	removeAttr( el, names ) {
		if (!names) return this;

		if (typeof names == 'string') {
			names = [names.trim()];
		}
		for (let ss of names) {
			let _dn = ss.match(__dataName);
			if (_dn) ss = 'data-' + _dn[1];
			el.removeAttribute( ss );
		}
		return this;
	},


	/**
	 * 获取/设置元素值。
	 * - 基本针对表单控件的value操作（val或可视为value简写）；
	 * 特例：
	 * select {
	 *   	set: 选中同值的option项（清除其它），
	 *   	 	 Array：multiple时支持数组多选。
	 *   	get: 获取选中项的值（option），multiple时为数组。
	 * }
	 * input:radio {
	 *  	set: 检索同组元素，选中与值匹配的项。
	 *  	get: 检索同组元素，返回选中的项的值。
	 *  	 	 注：同组指同一form下同名的控件元素。
	 * }
	 * input:checkbox {
	 *  	set: 检索同组元素，匹配项选中（非匹配项取消选中）。
	 *  	 	 Array：支持同名多复选框（组）。
	 *  	 	 注：单纯的取消选中，传递value为null即可。
	 *  	get: 检索同组元素，返回选中的项的值或值数组（重名时）。
	 * }
	 * optgroup {
	 *  	set: 选中该组内匹配的option元素，
	 *  		 Array：支持数组多匹配。
	 *  		 注：如果是单选表，实际是最后一项匹配有效。
	 *  	get: 获取该组内选中的option元素的值。
	 *  		 注：返回值数组，与上级select是否定义多选无关。
	 * }
	 * option {
	 *  	set/get: 空操作。不可单独设置/获取。
	 *  	 		 如果需要修改value，应当使用prop。
	 * }
	 * 注：对于单选/复选的同组控件，只需对其中任一元素操作。
	 *
	 * @param  {Element} el 目标元素
	 * @param  {Mixed|Array|Function} value 匹配值/集或回调
	 * @return {Value|this}
	 */
	val( el, value ) {
		let _hook = valHooks[el.type] ||
			valHooks[el.nodeName.toLowerCase()];

		if (value === undefined) {
			return _hook ? _hook.get(el) : el.value;
		}
		if ( isFunc(value) ) {
			value = value(_hook ? _hook.get(el) : el.value);
		}
		if (_hook) {
			_hook.set(el, value);
		} else {
			el.value = value;
		}
		return this;
	},


	//-- DOM 文本操作 ---------------------------------------------------------


	/**
	 * 提取/设置元素源码。
	 * - 禁止脚本<script>，样式<style>，连接<link>元素插入；
	 * - 源数据为节点时，取其outerHTML，多个节点取值串接；
	 * - 数据源也可为字符串数组或字符串与节点的混合数组；
	 * - where值含义详见上Wheres注释；
	 * 另：
	 * - 若传递el实参为假值，返回转义后的html。
	 *   如：< 转义为‘&lt;’
	 *
	 * 取值回调：
	 * - 取值函数接收原节点为参数，可返回字符串、节点或节点集；
	 * - 返回的节点数据取其outerHTML源码；
	 *
	 * @param  {Element} el 容器元素
	 * @param  {String|Node[s]|Array|Function} code 数据源或取值函数
	 * @param  {String|Number} where 插入位置
	 * @param  {String} sep 多段连接符
	 * @return {String|Array} 源码或插入的节点集
	 */
	html( el, code, where = 0, sep = ' ' ) {
		if (code === undefined) {
			return el.innerHTML;
		}
		if ( isFunc(code) ) {
			code = code( el );
		}
		if (typeof code != 'string') {
			code = outerHtml(code, sep);
		}
		if (noInnerhtml.test(code)) {
			console.error(`the code contains forbidden tag`);
		}
		if (! el) {
			return textHtml(code);
		}
		return Insert(
			el,
			// 会忽略脚本代码
			code && buildFragment(code, el.ownerDocument, null),
			Wheres[where]
		);
	},


	/**
	 * 提取/设置元素文本内容。
	 * - 设置时以文本方式插入，HTML视为文本；
	 * - 源数据为节点时，提取其文本（textContent）插入；
	 * - 数据源也可为字符串或节点或其混合的数组；
	 * 另：
	 * - 若传递el实参为假值，返回解析html后的文本。
	 *   如：&lt; 解析为‘<’
	 *
	 * 注：
	 * 新的DOM规范中有类似Api：
	 *   > ParentNode.append/prepend
	 *   > ChildNode.after/before
	 * 但对待节点的方式不同。
	 *
	 * @param  {Element} el 容器元素
	 * @param  {String|Nodes[s]|Array|Function} code 源数据或取值函数
	 * @param  {String|Number} where 插入位置
	 * @param  {String} sep 多段连接符
	 * @return {String|Node} 源码或插入的文本节点
	 */
	text( el, code, where = 0, sep = ' ' ) {
		if (code === undefined) {
			return el.textContent;
		}
		if ( isFunc(code) ) {
			code = code( el );
		}
		if (typeof code != 'string') {
			code = nodeText(code, sep);
		}
		if (! el) {
			return htmlText(code);
		}
		return Insert(
			el,
			code && el.ownerDocument.createTextNode(code),
			Wheres[where]
		);
	},


	//== CSS 属性 =============================================================
	// height/width
	// innerHeight/innerWidth/outerHeight/outerWidth
	// 定义见后集中设置。


	/**
	 * 获取/设置元素样式。
	 * - 设置为内联样式（style），获取计算后的样式；
	 * - 支持一个名称数组获取属性，返回一个Map实例；
	 * - 设置样式值为空串，会删除该样式；
	 * - 名称传递一个键值对象，依键值定义设置样式；
	 * - 键值定义中的值依然可以为回调取值函数；
	 * - 取值函数：fn.bind(el)( oldval, cso )
	 * 注记：
	 * - Edge/Chrome/FF已支持短横线样式属性名；
	 *
	 * @param  {String|Array|Object} names 样式名（集）或名值对象
	 * @param  {String|Number|Function} val 设置值或取值函数
	 * @return {String|Map|this}
	 */
	css( el, names, val ) {
		let _cso = getStyles(el);

		if (val !== undefined || $type(names) == 'Object') {
			cssSets(el, names, val, _cso);
			return this;
		}
		return cssGets(_cso, names);
	},


	/**
	 * 获取/设置元素偏移。
	 * - 相对于文档根元素；
	 * - 返回值格式：{top, left}；
	 * - 设置值也用同样格式指定；
	 * @param  {Object} val 设置配置
	 * @return {Object|this}
	 */
	offset( el, val ) {
		let _cur = getOffset(el);

		if (val === undefined) {
			return _cur;
		}
		if ( isFunc(val) ) {
			val = val( _cur );
		}
		val = useOffset( _cur, val, calcOffset(this, el) );

		if (this.css(el, 'position') == 'static') {
			el.style.position = "relative";
		}
		// val: Object
		return this.css(el, val);
	},


	/**
	 * 获取相对位置。
	 * - 相对于上层含定位属性的元素；
	 * - 包含元素外边距（从外边距左上角算）；
	 * 注记：
	 * - 元素相关属性el.offsetTop/Left（未用）。
	 * - 不处理元素为window/document的情况（同jQuery）；
	 * @return {Object} {top, left}
	 */
	position( el ) {
		let _cso = getStyles(el);

		if (_cso.position == "fixed") {
			// getBoundingClientRect
			// - 参考边框左上角计算，不含外边距；
			// - 此时已与滚动无关；
			return toPosition(el.getBoundingClientRect(), _cso);
		}
		let _cur = this.offset(),
			_pel = this.offsetParent(el),
			_pot = _pel.offset(),
			_pcs = getStyles(_pel),
			_new = {
				top:  _cur.top - (_pot ? _pot.top + parseFloat(_pcs.borderTopWidth) : 0),
				left: _cur.left - (_pot ? _pot.left + parseFloat(_pcs.borderLeftWidth) : 0)
			};

		return toPosition(_new, _cso);
	},


	/**
	 * 获取/设置水平滚动条。
	 * @param  {Element|Window|Document} el
	 * @param  {Number} val
	 * @return {Number|this}
	 */
	scrollLeft( el, val ) {
		let _win = getWindow(el);

		if (val === undefined) {
			return _win ? _win.pageXOffset : el.scrollLeft;
		}
		scrollSet(_win || el, val, _win ? 'X' : 'L');

		return this;
	},


	/**
	 * 获取/设置垂直滚动条。
	 * @param  {Element|Window|Document} el
	 * @param  {Number} val
	 * @return {Number|this}
	 */
	scrollTop( el, val ) {
		let _win = getWindow(el);

		if (val === undefined) {
			return _win ? _win.pageYOffset : el.scrollTop;
		}
		scrollSet(_win || el, val, _win ? 'Y' : 'T');

		return this;
	},



	//== 事件扩展 =============================================================
	// 事件名支持空格分隔的名称序列；
	// 事件名暂不支持名称空间；


	/**
	 * 绑定事件处理。
	 * - 多次绑定同一个事件名和相同的调用函数是有效的；
	 * @param  {Element} el 目标元素
	 * @param  {String} evn 事件名（序列）
	 * @param  {String} slr 委托选择器，可选
	 * @param  {Function} handle 处理函数
	 * @return {this}
	 */
	on( el, evn, slr, handle ) {
		eventBinds('on', el, evn, slr, handle);
		return this;
	},


	/**
	 * 移除事件绑定。
	 * @param  {Element} el 目标元素
	 * @param  {String} evn 事件名（序列）
	 * @param  {String} slr 委托选择器，可选
	 * @param  {Function} handle 事件处理函数，可选
	 * @return {this}
	 */
	off( el, evn, slr, handle ) {
		eventBinds('off', el, evn, slr, handle);
		return this;
	},


	/**
	 * 单次绑定。
	 * @param  {Element} el 目标元素
	 * @param  {String} evn 事件名（序列）
	 * @param  {String} slr 委托选择器，可选
	 * @param  {Function} handle 处理函数
	 * @return {this}
	 */
	one( el, evn, slr, handle ) {
		eventBinds('one', el, evn, slr, handle);
		return this;
	},


	/**
	 * 排他性单次绑定。
	 * - 在事件触发执行之前不会再绑定相同evn和slr处理；
	 * @param  {Element} el 目标元素
	 * @param  {String} evn 事件名（序列）
	 * @param  {String} slr 委托选择器，可选
	 * @param  {Function} handle 处理函数
	 * @return {this}
	 */
	once( el, evn, slr, handle ) {
		eventBinds('once', el, evn, slr, handle);
		return this;
	},


	/**
	 * 事件激发。
	 * - evn可以是一个已经构造好的事件对象（仅发送）；
	 * - 事件默认冒泡并且可被取消；
	 * - 支持原生事件的处理，并可获取传递数据；
	 * - 事件处理函数返回false，可取消原生事件的激发；
	 * 注记：
	 * isTrigger标志为对原生事件对象唯一的侵入。
	 *
	 * @param  {Element} el 目标元素
	 * @param  {String|Event..} evn 事件名或事件对象
	 * @param  {Mixed} extra 发送数据
	 * @param  {Bollean} bubble 是否冒泡
	 * @param  {Bollean} cancelable 是否可取消
	 * @return {this}
	 */
	trigger( el, evn, extra, bubble = true, cancelable = true ) {
		if (!el || !evn) {
			return;
		}
		if (typeof evn == 'string') {
			if (evn in el && !Event.inBound(el, evn)) {
				return el[evn](), this;
			}
			evn = new CustomEvent(evn, {
				detail: 	extra,
				bubbles: 	bubble,
				cancelable: cancelable,
			});
		}
		evn.isTrigger = true;

		el.dispatchEvent( evn );
		return this;
	},

};

// 合并入...
Object.assign($, $Methods);


//
// 6种插入方式。
// 注：数据仅为节点。
///////////////////////
[
	'before',
	'after',
	'prepend',
	'append',
	'replace',  //jQuery: replaceWith
	'fill',  	//jQuery: html(elem)
]
.forEach(function( name ) {
	/**
	 * 在元素的相应位置添加节点（集）。
	 * - 默认不会采用克隆方式（原节点会脱离DOM）；
	 * - 传递clone为真，会克隆节点（默认包含注册事件）；
	 * - 如果无需包含事件，需明确传递event为false；
	 * - 仅元素适用于事件克隆（event参数）；
	 * 取值回调：
	 * - 取值函数接受原节点作为参数；
	 * - 取值函数可返回节点或节点集（含Queue），不支持字符串；
	 *
	 * @param  {Element} el 目标元素
	 * @param  {Node[s]|Queue|Function|Set|Iterator} cons 数据节点（集）或回调
	 * @param  {Boolean} clone 数据节点克隆
	 * @param  {Boolean} event 是否克隆注册事件
	 * @return {Node|Array} 新插入的节点（集）
	 */
	$[name] = function ( el, cons, clone, event = true ) {
		return Insert(
			el,
			domManip( this, el, cons, clone, event ),
			Wheres[name]
		);
	};
});


//
// 数值尺寸取值（Float）
// innerHeight/innerWidth
// outerHeight/outerWidth
/////////////////////////////
[
	['Height', 	'inner'],
	['Width', 	'inner'],
	['Height', 	'outer'],
	['Width', 	'outer'],
]
.forEach(function( its ) {
	let _t = its[0].toLowerCase(),
		_n = its[1] + its[0];

	$[_n] = function( el, margin ) {
		return _rectWin(el, its[0], its[1]) || _rectDoc(el, its[0]) || _rectElem(el, _t, _n, margin);
	};
});


//
// 数值尺寸设置/取值（Float）
// height/width
/////////////////////////////
[
	['height', 	'Height'],
	['width', 	'Width'],
]
.forEach(function( its ) {
	let _n = its[0];
	/**
	 * 获取/设置元素的高宽度。
	 * - 始终针对内容部分（不管box-sizing）；
	 * - 设置值可包含任意单位，纯数值视为像素单位；
	 * - 获取时返回数值。便于数学计算；
	 * 注记：
	 * box-sizing {
	 *  	content-box: css:height = con-height（默认）
	 *  	border-box:  css:height = con-height + padding + border
	 * }
	 * @param  {String|Number} val 设置值
	 * @return {Number|this}
	 */
	$[_n] = function( el, val ) {
		if (val !== undefined) {
			return _elemRectSet(el, _n, val), this;
		}
		return _rectWin(el, its[1], 'inner') || _rectDoc(el, its[1]) || _elemRect(el, _n);
	};
});


//
// 可调用事件。
///////////////////
[
	'click',
	'dblclick',
	'select',
	'focus',
	'blur',
	'submit',
	'reset',
]
.forEach(function( name ) {
	$[name] = el => (name in el) && el[name]() || this;
});


/**
 * 获取窗口尺寸。
 * @param  {Window} el   获取目标
 * @param  {String} name 尺寸名称（Height|Width）
 * @param  {String} type 取值类型（inner|outer）
 * @return {Number|false}
 */
function _rectWin( el, name, type ) {
	return isWindow(el) && (
		type == 'outer' ?
		el['inner' + name] :
		el.document.documentElement['client' + name]
	);
}


/**
 * 获取文档尺寸。
 * scroll[Width/Height] or offset[Width/Height] or client[Width/Height]
 * 最大者。
 * @param  {Document} el 获取目标
 * @param  {String} name 尺寸名称（Height|Width）
 * @return {Number|undefined}
 */
function _rectDoc( el, name ) {
	if (el.nodeType != 9) {
		return;
	}
	let _html = el.documentElement;

	return Math.max(
		el.body[ "scroll" + name ], _html[ "scroll" + name ],
		el.body[ "offset" + name ], _html[ "offset" + name ],
		_html[ "client" + name ]
	);
}


/**
 * 获取元素尺寸。
 * （innerHeight/innerWidth）
 * （outerHeight/outerWidth）
 * @param  {Window} el   获取目标
 * @param  {String} type 取值类型（height|width）
 * @param  {String} name 取值名称
 * @return {Number|false}
 */
function _rectElem( el, type, name, margin ) {
	let _cso = getStyles(el);
	return boxSizing[ _cso.boxSizing ].get(el, type, name, _cso, margin);
}


/**
 * 获取元素尺寸（height/width）。
 * @param  {Element} el  目标元素
 * @param  {String} name 尺寸名称（height|width）
 * @return {Number}
 */
function _elemRect( el, name ) {
	let _cso = getStyles(el);
	return boxSizing[ _cso.boxSizing ].get(el, name, name, _cso);
}


/**
 * 设置元素尺寸（height|width）。
 * - 支持非像素单位设置；
 * @param  {Element} el  目标元素
 * @param  {String} name 设置类型/名称
 * @param  {String|Number} val 尺寸值
 * @return {Number}
 */
function _elemRectSet( el, name, val ) {
	let _cso = getStyles(el),
		_inc = boxSizing[ _cso.boxSizing ].set(el, name, val, _cso);

	// 非像素设置时微调
	if (_inc) el.style[name] = parseFloat(_cso[name]) + _inc + 'px';
}


/**
 * 获取兄弟元素。
 * - 可能没有或不匹配；
 * @param  {Selector} slr 选择器，可选
 * @param  {String} dir 方向（nextElementSibling|previousElementSibling）
 * @return {Element|null}
 */
function _next( el, slr, dir ) {
	let _el = el[dir];
	if (! slr) return _el;

	return _el && $is(_el, slr) ? _el : null;
}

/**
 * dir方向全部兄弟。
 * - 可选的用slr进行匹配过滤；
 * @param  {Selector} slr 选择器，可选
 * @param  {String} dir 方向（同上）
 * @return {Array}
 */
function _nextAll( el, slr, dir ) {
	let _els = [];

	while ( (el = el[dir]) ) {
		if (! slr) _els.push(el);
		else if ($is(el, slr)) _els.push(el);
	}
	return _els;
}

/**
 * dir方向兄弟元素...直到。
 * - 获取dir方向全部兄弟元素，直到slr但不包含；
 * @param  {Selector|Element} slr 选择器或元素，可选
 * @param  {String} dir 方向（同上）
 * @return {Array}
 */
function _nextUntil( el, slr, dir ) {
	let _els = [];

	while ( (el = el[dir]) ) {
		if (slr && $is(el, slr)) break;
		_els.push(el);
	}
	return _els;
}



//
// 继承自数组。
// 部分功能函数重定义，大部分保留。
//
class Queue extends Array {
	/**
	 * 构造结果队列。
	 * - 如果没有元素传入，obj应当为数值0；
	 * @param {Element[s]|Array|0} obj 元素（集）
	 * @param {Queue} prev 前一个实例引用
	 * @param {tQuery} $ 当前$引用
	 */
	constructor( obj, prev, $ ) {
		// 注记：
		// 某些实现中，Array原生map类调用会再次调用此构造，
		// 故预构造为数组（容错）
		super(
			...(superArgs(obj) || [0])
		);
		this.prevQueue = prev;
		// 代理嵌入用
		this.$ = $ || prev && prev.$;
	}


	// next( slr ) {}
	// nextAll( slr ) {}
	// nextUntil( se, flr ) {}
	// prev( slr ) {}
	// prevAll( slr ) {}
	// prevUntil( slr, flr ) {}
	// children( sf ) {}
	// contents() {}
	// siblings( sf ) {}
	// parent( sf ) {}
	// parentsUntil
	// closest( sf /*, ctx*/ ) {}
	// offsetParent() {}
	// filter( slr ) {}
	// has( slr ) {}
	// not( slr ) {}
	// is( slr ) { /* 占位：后续覆盖 */ }

	// map( fun ) {}
	// slice( start, end ) {}

	// appendTo( to, clone, event = true ) {}
	// prependTo( to, clone, event = true ) {}
	// insertAfter( to, clone, event = true ) {}
	// insertBefore( to, clone, event = true ) {}
	// replaceAll( to, clone, event = true ) {}
	// fillTo( to, clone, event = true ) {}

	// empty() {}
	// clone( event, deep = true ) {}

	// addClass( sf ) {}
	// removeClass( sf ) {}
	// toggleClass( its, force ) {}
	// hasClass( str ) {}

	// attr( its, value = undefined ) {}
	// removeAttr( names ) {}
	// prop( its, value = undefined ) {}

	// val( values = undefined) {}
	// html( code = undefined ) {}
	// text( code = undefined ) {}
	// css( name, value = undefined ) {}
	// height( val = undefined ) {}
	// innerHeight() {}
	// outerHeight( margin ) {}
	// width( val = undefined ) {}
	// innerWidth() {}
	// outerWidth( margin ) {}
	// offset( val = undefined ) {}
	// position() {}
	// scrollLeft( val ) {}
	// scrollTop( val = undefined ) {}

	// on( evn, slr, data, handler ) {}
	// off( evn, slr, handler = false ) {}
	// one( evn, slr, data, handler ) {}
	// trigger( evn, extra ) {}


	/**
	 * 用一个容器包裹集合里的元素。
	 * - 目标容器可以是一个元素或HTML结构字符串或取值函数；
	 * - 取值函数需要返回一个HTML结构字符串或元素；
	 * - 如果目标元素没有父元素（游离），其将替换集合中的首个元素；
	 * 注记：
	 * - 调用$系成员，使得$的代理有效（如果有）；
	 * @param  {Element|String|Function} box 目标容器
	 * @return {Queue}
	 */
	wrapAll( box ) {
		if (isFunc(box)) box = box(this);

		if (typeof box == 'string') {
			box = buildFragment(box).firstElementChild;
		}
		if (!box.parentNode) {
			this.$.replace(this[0], box);
		}
		this.$.append( deepChild(box), this );

		return new Queue( box, this );
	}


	/**
	 * 让集合中的元素脱离DOM。
	 * - 脱离的元素会作为一个新集合被压入栈；
	 * 注记：（同上）
	 * @param  {Filter} fltr 筛选器
	 * @return {Queue}
	 */
	detach( fltr ) {
		let _els = fltr ?
			this.$.filter(this, fltr) : this;

		return new Queue( removes(this.$, _els), this );
	}


	/**
	 * 删除节点集。
	 * - 如果传递slr进行筛选，剩余的元素作为一个集合压入栈。
	 *   否则新的集合为空（只有addBack、end操作有意义）。
	 * 注记：（同上）
	 * @param  {Filter} fltr 筛选器
	 * @return {Queue}
	 */
	remove( fltr ) {
		let _els = fltr ? this.$.filter(this, fltr) : this;

		return new Queue(
			exclude( this, removes(this.$, _els) ),
 			this
		);
	}


	//-- 集合/栈操作 ----------------------------------------------------------


	/**
	 * 用特定下标的成员构造一个新实例。
	 * - 下标超出集合大小时构造一个空集合；
	 * @param  {Number} idx 下标值，支持负数
	 * @return {Queue}
	 */
	eq( idx ) {
	 	if (idx >= this.length) {
	 		return new Queue(0, this);
	 	}
		return new Queue( this[idx < 0 ? this.length+idx : idx], this );
	}


	/**
	 * 用集合的首个成员构造一个新集合。
	 * @return {Queue}
	 */
	first() {
		return new Queue( this[0], this );
	}


	/**
	 * 用集合的最后一个成员构造一个新集合。
	 * @return {Queue}
	 */
	last() {
		return new Queue( this[this.length-1], this );
	}


	/**
	 * 添加新元素。
	 * - 返回一个添加了新成员的新集合；
	 * - 仅在添加了新成员后才需要重新排序；
	 * - 总是会构造一个新的实例返回（同jQuery）；
	 * @param {Selector|Element[s]|Queue} its 目标内容
	 */
	add( its, ctx = Doc ) {
		let _els = $(its, ctx);
		_els = _els.length ? uniqueSort( this.concat(_els) ) : this;

		return new Queue( _els, this );
	}


	/**
	 * 构造上一个集合和当前集合的新集合。
	 * @param {Selector|Function} slr 选择器或过滤函数
	 */
	addBack( slr ) {
		let _new = this.$.filter(this.prevQueue, slr);
		_new = _new.length ? uniqueSort( _new.concat(this) ) : this;

		return new Queue( _new, this );
	}


	/**
	 * 返回上一个集合（Queue封装）。
	 * @return {Queue}
	 */
	end() {
		return this.prevQueue;
	}


	/**
	 * 迭代回调。
	 * - 对集合内每一个元素应用回调（el, i, this）；
	 * @param  {Function} handle 回调函数
	 * @param  {Object} self 回调函数内的this
	 * @return {Queue} this
	 */
	each( handle, self ) {
		return this.$.each(this, handle, self);
	}


	/**
	 * 获取元素或集合。
	 * - 获取特定下标位置的元素，支持负数倒数计算；
	 * - 未指定下标返回集合的一个新的数组表示（Queue继承自数组）；
	 * @param  {Number} idx 下标值（支持负数）
	 * @return {Element|Array}
	 */
	get( idx ) {
		return idx === undefined ?
			Array.from(this) :
			this[ idx < 0 ? this.length+idx : idx ];
	}

}


Queue.prototype.version = version;

// 已封装标志。
Queue.prototype[ ownerToken ] = true;



/**
 * Queue原型扩展。
 * 获取的节点集入栈，返回一个新实例。
 * - 由$.xx单元素版扩展到Queue原型空间；
 * - 保持类声明里函数不可枚举特性（enumerable）；
 * - 仅用于$.xx返回节点（集）的调用；
 * @param {Array} list 定义名清单（方法）
 * @param {Function} get 获取元素回调
 */
function QuEx( list, get ) {
	list
	.forEach(function( fn ) {
		Object.defineProperty(Queue.prototype, fn, {
			value: function(...rest) {
				return new Queue( get(this.$, fn, this, ...rest), this );
			},
			enumerable: false,
		});
	});
}


//
// 过滤：封装版
// 源数据即为集合，封装为实例。
///////////////////////////////////////
QuEx([
		'has',
		'not',
		'filter',
	],
	($, fn, els, slr) => $[fn](els, slr)
);


//
// 检索：单入版
// 结果集去重排序。
// 注：成员调用返回单个元素或null。
///////////////////////////////////////
QuEx([
		'next',
		'prev',
		'parent',
		'closest',
		'offsetParent',
	],
	// 可能重复，排序清理
	($, fn, els, ...rest) =>
		uniqueSort(
			// jshint eqnull:true
			els.map( el => $[fn](el, ...rest) )
			.filter( el => el != null )
		)
);


//
// 检索：集合版（排序）
// 结果集去重排序。
// 注：成员调用返回集合或节点。
///////////////////////////////////
QuEx([
		'find',
		'nextAll',
		'nextUntil',
		'prevAll',
		'prevUntil',
		'siblings',
		'parentsUntil',
	],
	// 可能重复，排序清理
	($, fn, els, ...rest) => {
			let _buf = els.reduce(
				(buf, el) => buf.concat( $[fn](el, ...rest) ),
				[]
			);
			return els.length > 1 ? uniqueSort(_buf) : _buf;
		}
);


//
// 取值：集合版（无需排序）
// - 返回的数据被合并（同jQuery）；
// 注：成员调用返回集合或节点。
///////////////////////////////////
QuEx([
		'clone',
		'children',
		'contents',
	],
	($, fn, els, ...rest) =>
		els.reduce( (buf, el) => buf.concat( $[fn](el, ...rest) ), [] )
);



/**
 * Queue原型扩展。
 * 在原型上直接赋值一个函数，设置为不可枚举。
 * @param {Array} list 定义名清单（方法）
 * @param {Function} get 获取目标函数
 */
function QuExf( list, get ) {
	list
	.forEach(function( fn ) {
		Object.defineProperty(Queue.prototype, fn, {
			value: get(fn),
			enumerable: false,
		});
	});
}


//
// 取值。
// 获取的数据为值，返回一个值集合。
// 值的位置与原集合中元素位置一一对应。
///////////////////////////////////////
QuExf([
		'is',  	// 返回集合，用.every(x=>x)或.some(x=>x)判断
		'hasClass',
		'innerHeight',
		'outerHeight',
		'innerWidth',
		'outerWidth',
		'position',

		// 纯操作，但取返回值
		'animate',
	],
	fn =>
	function(...rest) {
		return this.map( el => this.$[fn](el, ...rest) );
	}
);


//
// 单纯操作。
// 返回当前实例本身。
///////////////////////////////////////
QuExf([
		'empty',
		'addClass',
		'removeClass',
		'toggleClass',
		'removeAttr',
		'on',
		'off',
		'one',
		'once',
		'trigger',
		'normalize',

		// 节点插入（多对多）
		'before',
		'after',
		'prepend',
		'append',
		'replace',
		'fill',

		// 元素原生事件激发
		'click',
		'dblclick',
		'select',
		'focus',
		'blur',
		'submit',
		'reset',
	],
	fn =>
	function(...rest) {
		for ( let el of this ) this.$[fn](el, ...rest);
		return this;
	}
);


//
// 设置/获取值（有目标）。
// 设置与获取两种操作合二为一的成员。
// 返回的数组成员与集合元素一一对应。
///////////////////////////////////////
QuExf([
		'attr',
		'prop',
		'css',
	],
	fn =>
	function( its, val ) {
		let _buf = this.map(
			el => this.$[fn](el, its, val)
		);
		return _buf[0] === this.$ ? this : _buf;
	}
);


//
// 取值/属性修改。
// 设置与获取两种操作合二为一的成员。
// 返回的数组成员与集合元素一一对应。
///////////////////////////////////////
QuExf([
		'val',
		'height',
		'width',
		'offset',
		'scrollLeft',
		'scrollTop',
	],
	fn =>
	function( val ) {
		return val === undefined ? this.map( el => this.$[fn](el) ) :
			(
				this.forEach( el => this.$[fn](el, val) ),
				this
			);
	}
);


//
// 取值/内容修改。
// 设置与获取两种操作合二为一。
// 取值返回的数组成员与集合元素一一对应。
// 设置时返回的新节点构造为一个一维数组。
// @return {[Value|Node]}
////////////////////////////////////////////
QuExf([
		'html',
		'text',
	],
	fn =>
	function( val, ...rest ) {
		let _vs = this.map(
			el => this.$[fn](el, val, ...rest)
		);
		// 节点集扁平化（设置时）。
		return val === undefined ? _vs : [].concat(..._vs);
	}
);



//
// 集合版6种插入方式。
// 与单元素版对应但主从关系互换。
// （多对一）
///////////////////////////////////////
[
	['insertBefore', 	'before'],
	['insertAfter', 	'after'],
	['prependTo', 		'prepend'],
	['appendTo', 		'append'],
	['replaceAll', 		'replace'],
	['fillTo', 			'fill'],
]
.forEach(function( names ) {
	Object.defineProperty(Queue.prototype, [names[0]], {
		/**
		 * 将集合中的元素插入相应位置。
		 * - 默认不会采用克隆方式（原节点会脱离DOM）；
		 * - 传递clone为真，会克隆节点（默认包含注册事件）；
		 * - 如果无需包含事件，需明确传递event为false；
		 * @param  {Element} to 目标元素
		 * @param  {Boolean} clone 数据节点克隆
		 * @param  {Boolean} event 是否克隆注册事件
		 * @return {Queue} 实例自身
		 */
		value: function( to, clone, event = true ) {
			this.$[ names[1] ]( to, this, clone, event );
			return this;
		},
		enumerable: false,
	});
});



//
// 基本工具。
///////////////////////////////////////////////////////////////////////////////


/**
 * 是否在数组中。
 * @param {Array|LikeArray} arr 数组/类数组
 * @return {Boolean}
 */
function inArray( arr, val ) {
	for ( let i = 0; i < arr.length; i++ ) {
		if (arr[i] === val) return true;
	}
	return false;
}


/**
 * 是否为纯数字。
 * from jQuery 3.x
 * @param  {Mixed}  obj 测试目标
 * @return {Boolean}
 */
function isNumeric( obj ) {
	let _t = typeof obj;
	return ( _t === "number" || _t === "string" ) &&
		!isNaN( obj - parseFloat( obj ) );
}


//
// 是否为窗口。
//
function isWindow( obj ) {
	return obj !== null && obj === obj.window;
}


/**
 * 通用某一为真。
 * - 类似数组同名函数功能，扩展到普通对象；
 * - 适用数组/类数组/普通对象/.entries接口对象；
 * - 比较函数接收值/键两个参数，类似each；
 * 注记：
 * - 原则上为只读接口，不传递目标自身；
 *
 * @param  {Array|LikeArray|Object|.entries} iter 迭代目标
 * @param  {Function} comp 比较函数
 * @param  {Object} self 回调内的this
 * @return {Boolean}
 */
function iterSome( iter, comp, self ) {
	if (self) {
		comp = comp.bind(self);
	}
	for ( let [k, v] of entries(iter) ) {
		if (comp(v, k)) return true;
	}
	return false;
}


//
// 是否为函数。
//
function isFunc( val ) {
	return typeof val === 'function';
}


/**
 * 类数组检测（简单）。
 * - 只要length为数值，且非零值存在序列即可；
 * 注：字符串也被视为类数组。
 * @param  {Mixed} obj 检查目标
 * @return {Boolean}
 */
function arrLike( obj ) {
	let _len = !!obj && obj.length;

	return _len === 0 || typeof _len == 'number' &&
		// Object封装兼容字符串
		(_len - 1) in Object( obj );
}


//
// 选择器判断函数构造。
// 测试调用：func(elem)
// @param  {String|Function|Element|Array}
// @return {Function}
//
function getFltr( its ) {
	if (!its || isFunc(its)) {
		return its;
	}
	if (its.nodeType || typeof its == 'string') {
		return e => $is(e, its);
	}
    return ( e => its.indexOf(e) >= 0 );
}


/**
 * 是否为Queue实例。
 * @param  {Mixed} obj 测试对象
 * @return {LikeBool}
 */
function isQueue( obj ) {
    return obj && obj[ ownerToken ];
}


/**
 * 测试构造Queue基类参数。
 * - 返回false表示参数不合法；
 * @param  {Array|LikeArray|Element|[.values]} obj 目标对象
 * @return {Iterator|false} 可迭代对象
 */
function superArgs( obj ) {
	if (obj.nodeType) {
		return [ obj ];
	}
	return isFunc(obj.values) ? obj.values() : $A(obj);
}


/**
 * 像素值转换数值。
 * - 像素单位转为纯数值；
 * - 非像素或数值返回null；
 * @param  {String|Number} val
 * @return {Number|null}
 */
function pixelNumber( self, val ) {
	return isNumeric(val) || rpixel.test(val) ? parseFloat(val) : null;
}


/**
 * 构造范围数字序列。
 * @param  {Number} beg 起始值
 * @param  {Number} len 长度
 * @return {Iterator} 范围生成器
 */
function* rangeNumber( beg, len ) {
	if (len > 0) while (len--) yield beg++;
}


/**
 * 构造Unicode范围字符序列。
 * - len为终点字符时，其本身包含在范围内（末尾）；
 * @param  {Number} beg 起始字符码值
 * @param  {Number|String} len 长度或终点字符
 * @return {Iterator} 范围生成器
 */
function* rangeChar( beg, len ) {
	if (typeof len == 'string') {
		len = len.codePointAt(0) - beg + 1;
	}
	if (len > 0) while (len--) yield String.fromCodePoint(beg++);
}


/**
 * 获取键值对迭代器。
 * - 扩展适用类数组和普通对象；
 * @param  {Array|LikeArray|Object|.entries} obj 迭代目标
 * @return {Iterator} 迭代器
 */
function entries( obj ) {
	if (obj.entries) {
		return obj.entries();
	}
	let _arr = $A(obj);
	return _arr && _arr.entries() || Object.entries(obj);
}


/**
 * 获取值迭代器。
 * - 扩展适用类数组和普通对象；
 * @param  {Array|LikeArray|Object|.values} obj 迭代目标
 * @return {Iterator} 迭代器
 */
function values( obj ) {
	if (obj.values) {
		return obj.values();
	}
	let _arr = $A(obj);
	return _arr && _arr[Symbol.iterator]() || Object.values(obj);
}


/**
 * 元素内容填充。
 * - 检查数据成员类型以首个成员为依据；
 * - 节点数据会导致其从原位置脱离；
 * @param  {Object} self 当前调用域
 * @param  {Element} el 目标元素
 * @param  {Array|Node|String} data 数据集
 * @return {Element} el
 */
function fillElem( self, el, data ) {
	if (!data) return el;

	let _fn = data.nodeType || data[0].nodeType ?
		'fill' :
		'html';

	return self[_fn](el, data), el;
}


/**
 * 从配置设置元素。
 * - 支持text/html/node名称设置元素文本/源码/节点；
 * - 设置到元素的特性上（Attribute）；
 * @param  {Object} self 当前调用域
 * @param  {Element} el 目标元素
 * @param  {Object|Map|.entries} conf 配置对象
 * @return {Element} el
 */
function setElem( self, el, conf ) {
	if (!conf) return el;

	for ( let [k, v] of entries(conf) ) {
		switch (k) {
		case 'html':
			el.innerHTML = v; break;
		case 'text':
			el.textContent = v; break;
		case 'node':
			self.fill(el, v); break;
		default:
			elemAttr.set(el, k, v);
		}
	}
	return el;
}


/**
 * 表格行单元格追加。
 * - 支持在数据单元上设置单元格标签名（tagName）；
 * - 设置的标签名应该只是th或td（大小写）；
 * - 数据集也支持有.values接口的对象（如Set）；
 * @param  {[String|Node|.toString]|.values} data 单元格数据集
 * @param  {String} tag 单元格标签，可选
 * @param  {Element|Document} tr 行元素或文档对象，可选
 * @return {Element} tr
 */
function tableRow( data, tag, tr = Doc ) {
	if (tr.nodeType == 9) {
		tr = tr.createElement('tr');
	}
	if (!data || !data.length) {
		return tr;
	}
	let _ith = tr => tr.appendChild( $.Element('th') ),
		_itd = tr => tr.insertCell(),
		_fns = {
			th: _ith,
			TH: _ith,
			td: _itd,
			TD: _itd,
		};
	for ( let dt of values(data) ) {
		$.html(
			_fns[ dt.tagName || tag || 'td' ](tr),
			itemString(dt)
		);
	}
	return tr;
}


/**
 * 取目标文本或源码。
 * - 目标为元素时取innerHTML；
 * - 目标为文本节点，取textContent；
 * - 非法目标返回其字符串表示；
 * @param  {Element|String} its 取值目标
 * @return {String|false} 结果文本或非法目标
 */
function itemString( its ) {
	if (typeof its == 'string') {
		return its;
	}
	let _nt = its.nodeType;

	if (_nt == 1) return its.innerHTML;
	if (_nt == 3) return its.textContent;

	return '' + its;
}


/**
 * 获取计算样式。
 * @param  {Element} el
 * @return {CSSStyleDeclaration}
 */
function getStyles( el ) {
	// Support: IE <=11 only, Firefox <=30 (#15098, #14150)
	// IE throws on elements created in popups
	// FF meanwhile throws on frame elements through "defaultView.getComputedStyle"
	var view = el.ownerDocument.defaultView;

	if ( !view || !view.opener ) {
		view = window;
	}

	return view.getComputedStyle(el);
}


/**
 * 节点按DOM中顺序排序。
 * - 外部保证节点已经去除重复；
 * @param  {Node} a
 * @param  {Node} b
 * @return {Number} [-1, 0, 1]
 */
function sortElements( a, b ) {
	let _comp = a.compareDocumentPosition( b );

	if (_comp & 1) {
		throw new Error('Can not compare nodes between two different documents');
	}
	// 子元素时浏览器返回20，包含16和4
	return _comp & 4 ? -1 : 1;
}


//
// 名称转换。
// 用于CSS属性名和data系prop名称。
//
function camelCase( name ) {
	return name
		// Support: IE <=9 - 11, Edge 12 - 13
		// Microsoft forgot to hump their vendor prefix (#9572)
		.replace( /^-ms-/, "ms-" )
		// 短横线分隔转为驼峰表示。
		.replace( /-[a-z]/g, cc => cc[1].toUpperCase() );
}


/**
 * 获取样式值（集）。
 * @param  {CSSStyleDeclaration} cso 计算样式集
 * @param  {String|Array} names 样式名（集）
 * @return {String|Map}
 */
function cssGets( cso, names ) {
	if (typeof names == 'string') {
		return cso[names];
	}
    return names.reduce( (map, n) => map.set(n, cso[n]), new Map() );
}


/**
 * 设置样式值。
 * @param  {Element} el 目标元素
 * @param  {String|Object} name 样式名或名值对对象
 * @param  {String|Number|Function} val 设置值或取值回调
 * @param  {CSSStyleDeclaration} cso 计算样式集
 * @return {void}
 */
function cssSets( el, name, val, cso ) {
    if (typeof name == 'string') {
    	return ( el.style[name] = cssFunc(val, cso, name, el) );
    }
    for (let [n, v] of Object.entries(name)) {
    	el.style[n] = cssFunc(v, cso, n, el);
    }
}


/**
 * 样式回调取值。
 * - 若为函数才取值计算；
 * - 若为纯数值构造为像素值表示；
 * @param  {Function|Value} its 回调函数或简单值
 * @param  {CSSStyleDeclaration} cso 计算样式集
 * @param  {String} key 样式键名
 * @return {String|Number} 计算样式值
 * @return {Element} 当前元素
 */
function cssFunc( its, cso, key, el ) {
    let _val = isFunc(its) ?
    	its.bind(el)( cso[key], cso ) : its;

    return isNumeric(_val) ? +_val + 'px' : _val;
}


/**
 * 选择性插入。
 * - 首选插入next之前，否则box内末尾添加；
 * - 主要用于样式元素选择性插入；
 * @param  {Node} node 待插入节点
 * @param  {Element} box 容器元素
 * @param  {Element} next 下一个参考元素
 * @return {Node} 插入节点
 */
function switchInsert( node, box, next ) {
	if (!next || next === box) {
		return box.appendChild(node);
	}
	return next.parentNode.insertBefore(node, next);
}


/**
 * 载入元素。
 * - 绑定载入成功与错误的处理，返回一个承诺对象；
 * - 主要用于脚本/样式元素的载入回调；
 * 承诺.then(el)
 * @param  {Object} self 当前调用域
 * @param  {Element} el  目标元素
 * @param  {Element} box 容器元素
 * @param  {Element} next 下一个参考元素
 * @param  {Boolean} tmp 临时插入（成功后移除）
 * @return {Promise}
 */
function loadElement( self, el, box, next, tmp ) {
    return new Promise( function(resolve, reject) {
    	self.on(el, {
    		'load':  () => resolve( tmp && detach(el) || el ),
    		'error': err => reject(err),
    	});
    	switchInsert(el, box, next);
    });
}


/**
 * 检查表格行获取适当容器。
 * - 若初始容器不是表格，则可忽略；
 * - 应对表格行直接插入table的情况；
 *
 * @param  {Element} box 原容器元素
 * @param  {Element} con 内容元素
 * @return {Element} 合适的容器元素
 */
function trParent( box, con ) {
	if (box.nodeName.toLowerCase() == 'table' &&
		con.nodeName.toLowerCase() == 'tr') {
		return $tag('tbody', box)[0] || box;
	}
	return box;
}


/**
 * 提取最深层子元素。
 * @param  {Element} el 目标元素
 * @return {Element}
 */
function deepChild( el ) {
	let _sub = el.firstElementChild;
	if (!_sub) return el;

	return deepChild(_sub);
}


/**
 * 删除节点元素。
 * - 默认保持引用（不被垃圾回收）；
 * - 引用存储在__nodeDetach空间；
 * @param {Node} node 目标节点
 * @param {Boolean} deleted 彻底删除
 */
function remove( node, deleted ) {
	let _box = node.parentNode;

	if (!_box || node.nodeType > 8) {
		return;
	}
	if (! deleted) {
		return _box.removeChild(node);
	}
	_box.removeChild(node);
}


/**
 * 删除元素集。
 * @param  {Object} self 当前调用域
 * @param  {Array} list  元素集
 * @return {Array} list
 */
function removes( self, list ) {
	return $.each( list, el => self.remove(el) );
}


/**
 * 集合排除。
 * - 子集全部为总集内的成员；
 * @param  {Array} list 总集
 * @param  {Array} sets 去除子集
 * @return {Array}
 */
function exclude( list, sets ) {
	if (sets.length == list.length) {
		return [];
	}
	return sets.length ? list.filter( it => sets.indexOf(it) < 0 ) : list;
}


/**
 * 内容包裹。
 * - 包裹容器可以是一个现有的元素或html结构字符串或取值函数；
 * - 包裹采用结构字符串时，会递进至最深层子元素为容器；
 * - box直接传递或返回元素时被视为父容器，但内容前插（与jQuery异）；
 * - 取值函数参数：将被包裹的数据（Node|NodeList）
 * 注记：
 * - 对提供的容器支持为前部插入有更好的可用性；
 *
 * @param  {Object} self 当前调用域
 * @param  {Node} rep 替换点节点
 * @param  {Element|String|Function} box 包裹容器或取值函数
 * @param  {Node[s]} data 被包裹数据
 * @return {Element} 包裹容器元素
 */
function wrapData( self, rep, box, data ) {
	if ( isFunc(box) ) {
		box = box(data);
	}
	let _end = box;

	if (typeof box == 'string') {
		box = buildFragment(box).firstElementChild;
		_end = deepChild(box);
	}
	self.replace(rep, box).prepend(_end, data);

	return box;
}


/**
 * 类名切换。
 * - 支持空格分隔的多个类名；
 * @param  {Object} self 调用域对象
 * @param  {Element} el  目标元素
 * @param  {String} name 类名称
 * @param  {Boolean} force 强制设定，可选
 * @return {Object} self
 */
function clsToggle( self, el, name, force ) {
	if (typeof force == 'boolean') {
		return force ? self.addClass(el, name) : self.removeClass(el, name);
	}
	name.split(__chSpace)
		.forEach(
			function(it) { this.toggle(it); },
			el.classList
		);
	return self;
}


/**
 * 通用赋值。
 * - 调用目标域内的set设置值，接口：set(el, key, value)
 * - 值可为回调取值，接口：value( get(el, key), el )
 * 参数：
 * - name支持字符串或一个名/值对象（Object）；
 * - value为一个新值或获取新值的回调函数；
 * - 名/值对象中的值依然可以是回调函数（与键对应）；
 * 注记：
 * - 设置时name不存在空格分隔序列的形式；
 *
 * @param {Element} el 目标元素
 * @param {String|Object} name 名称或名/值对象
 * @param {Mixed|Function} value 设置值或回调函数
 * @param {Object} scope 适用域对象
 */
function hookSets( el, name, value, scope ) {
	if (typeof name == 'string') {
		name = { [name]: value };
	}
	for (let [_k, _v] of Object.entries(name)) {
		if (isFunc(_v)) {
			_v = _v(scope.get(el, _k), el);
		}
		scope.set(el, _k, _v);
	}
}


/**
 * 通用多取值。
 * - 循环名称集取值，返回一个名称为键的Map实例；
 * - Map内成员的顺序与属性名一致，可能有用；
 * @param  {Element} el 目标元素
 * @param  {String|Array} name 名称（集）
 * @param  {Object} scope 适用域对象
 * @return {String|Map} 值或Map实例
 */
function hookGets( el, name, scope ) {
	if (typeof name == 'string') {
		return scope.get(el, name);
	}
	return name.reduce(
		(map, n) => map.set(n, scope.get(el, n)), new Map()
	);
}


/**
 * 偏移坐标转为位置坐标。
 * - 偏移坐标不含外边距，位置坐标从外边距左上角算起；
 * - 两者坐标都用 {top, left} 表示；
 * @param  {Object} offset 元素偏移坐标
 * @param  {CSSStyleDeclaration} css 元素计算样式对象
 * @return {Object} 位置坐标对象
 */
function toPosition( offset, css ) {
	return {
		top:  offset.top - parseFloat(css.marginTop),
		left: offset.left - parseFloat(css.marginLeft)
	};
}


/**
 * 获取元素的偏移坐标。
 * - 相对于文档根元素；
 * 返回值格式：{
 *  	top:  number,
 *  	left: number
 * }
 * @param  {Element} el 目标元素
 * @return {Object}
 */
function getOffset( el ) {
	// Return zeros for disconnected and hidden (display: none) elements (gh-2310)
	// Support: IE <=11 only
	// Running getBoundingClientRect on a disconnected node in IE throws an error
	if (!el.getClientRects().length) {
		return { top: 0, left: 0 };
	}
	let _doc  = el.ownerDocument,
		_win  = _doc.defaultView,
		_root = _doc.documentElement,
		_rect = el.getBoundingClientRect();

	return {
		top:  _rect.top + _win.pageYOffset - _root.clientTop,
		left: _rect.left + _win.pageXOffset - _root.clientLeft
	};
}


/**
 * 计算最终使用偏移坐标。
 * - 用户指定的非法坐标值忽略；
 * @param  {Object} cur  当前实际偏移
 * @param  {Object} conf 用户坐标配置
 * @param  {Object} self 元素样式坐标
 * @return {Object} 坐标对象：{top, left}
 */
function useOffset( cur, conf, self ) {
	let _use = {};

	if (typeof conf.top == 'number') {
		_use.top = (conf.top - cur.top) + self.top;
	}
	if (typeof conf.left == 'number') {
		_use.left = (conf.left - cur.left) + self.left;
	}
	return _use;
}


/**
 * 计算元素当前偏移样式值。
 * - 指样式设定的计算结果；
 * - 返回 {top, left}
 * @param  {Object} self 当前调用域
 * @param  {Element} el 目标元素
 * @return {Object}
 */
function calcOffset( self, el ) {
	let _cso = getStyles(el);

	// 包含定位属性，获取明确值。
	if ((_cso.position == 'absolute' || _cso.position == 'fixed') &&
		(_top + _left).indexOf('auto')) {
		let _pos = self.position(el);
		return {
			top:  _pos.top,
			left: _pos.left
		};
	}
	return {
		top:  parseFloat(_cso.top) || 0,
		left: parseFloat(_cso.left) || 0
	};
}


/**
 * 测试获取窗口对象。
 * @param  {Element|Window|Document} el
 * @return {Window|null}
 */
function getWindow( el ) {
	if (isWindow(el))
		return el;

	return el.nodeType == 9 ? el.defaultView : null;
}


/**
 * 设置窗口/元素滚动条。
 * @param {Element|Window} dom 目标对象
 * @param {Number} val 设置值
 * @param {String} xy  位置标志
 */
function scrollSet( dom, val, xy ) {
	switch (xy) {
	case 'T':
		return (dom.scrollTop = val);
	case 'Y':
		return dom.scrollTo(dom.pageXOffset, val);
	case 'L':
		return (dom.scrollLeft = val);
	case 'X':
		return dom.scrollTo(val, dom.pageYOffset);
	}
}


/**
 * 检查并返回普通节点。
 * - 普通节点包含元素/文本/注释节点；
 * @param  {Node} node 目标节点
 * @return {Node|null}
 */
function usualNode( node ) {
	let _nt = node.nodeType;
	return (_nt == 1 || _nt == 3 || _nt == 8) ? node : null;
}


/**
 * 提取节点源码/文本。
 * - 适用于元素节点和文本节点；
 * - 多个节点取值简单连接；
 * - 非节点类型被字符串化；
 * @param  {Node[s]|[String]|Set|Iterator} nodes 节点（集）
 * @param  {String} sep 连接字符
 * @return {String}
 */
function outerHtml( nodes, sep ) {
	let _buf = [];
	nodes = nodes.nodeType ?
		[nodes] : values(nodes);

	for ( let nd of nodes ) {
		if (nd.nodeType == 1) _buf.push( nd.outerHTML );
		else if (nd.nodetyp == 3) _buf.push( nd.textContent );
		// 字符串化
		else _buf.push('' + nd);
	}
	return _buf.join(sep);
}


/**
 * 提取节点文本。
 * @param  {Node[s]|[String]|Set|Iterator} nodes 节点（集）
 * @param  {String} sep 连接字符
 * @return {String}
 */
function nodeText( nodes, sep ) {
	if (nodes.nodeType) {
		return nodes.textContent;
	}
	let _buf = [];

	for ( let nd of values(nodes) ) {
		// 字符串化
		_buf.push(nd.textContent || '' + nd);
	}
	return _buf.join(sep);
}


/**
 * 将文本转义为html源码。
 * - 转义HTML特殊字符为实体表示；
 * - 返回值按html方式插入获得原样文本；
 *
 * @param  {String} code 任意文本
 * @param  {Document} doc 文档对象
 * @return {String} 转义后源码
 */
function textHtml( code, doc = Doc ) {
    let _box = doc.createElement('div');

    if (_box.append) {
    	_box.append(code);
    } else {
	    _box.textContent = code;
    }
    return _box.innerHTML;
}


/**
 * 将html源码解析为文本。
 * 如： &lt; 解析为‘<’
 * @param  {String} code 源码
 * @param  {Document} doc 文档对象
 * @return {String}
 */
function htmlText( code, doc = Doc ) {
    let _box = doc.createElement('div');

    try {
	    _box.innerHTML = code;
    }
    catch (e) {
    	return console.error(e);
    }
    return _box.textContent;
}


/**
 * 通用节点/文档片段插入。
 * - 返回实际插入内容（节点集）的引用或null；
 * - 参考节点ref一般在文档树（DOM）内；
 * @param {Node} ref 参考节点
 * @param {Node|Fragment} data 节点或文档片段
 * @param {String|Number} where 插入位置
 * @return {Node|Array|null} 内容元素（集）
 */
function Insert( ref, data, where = 0 ) {
	if (!data || !ref) return;

	let _call = insertHandles[where],
		_revs = _call && data.nodeType == 11 ?
			Arr(data.childNodes) :
			data;

	return _call && _call(data, ref, ref.parentNode) && _revs;
}


//
// 6类插入函数集。
// frag可以是文档片段或元素或文本节点。
//
const insertHandles = {
	// replace
	'': ( node, ref, box ) => box && box.replaceChild(node, ref),

	// fill
	'0': function( node, ref /*, box*/) {
		if (ref.nodeType == 1) {
			ref.textContent = '';
			return ref.appendChild(node);
		}
	},

	// before
	'1': ( node, ref, box ) => box && box.insertBefore(node, ref),

	// after
	'-1': ( node, ref, box ) => box && box.insertBefore(node, ref.nextSibling),

	// end/append
	'-2': function( node, ref, box, _pos ) {
		if (ref.nodeType == 1) {
			ref = trParent(ref, node.firstChild);
			return ref.insertBefore(node, _pos || null);
		}
	},

	// begin/prepend
	'2': ( node, ref, box ) => insertHandles[-2](node, ref, box, ref.firstChild),
};


/**
 * DOM 通用操作。
 * - 取参数序列构造文档片段，向回调传递（node, Fragment）；
 * - 回调完成各种逻辑的插入行为（append，after...）；
 * - 参数序列可以是一个取值函数，参数为目标元素；
 *   注：取值函数仅允许一个；
 * 注：
 * - args也可以是一个可迭代的节点序列，如：
 *   NodeList，HTMLCollection，Array，Queue等。
 *
 * - 取值回调可返回节点或节点集，但不能再是函数；
 *
 * @param  {Object} self 当前调用域
 * @param  {Node} node 目标节点（元素或文本节点）
 * @param  {Node[s]|Queue|Function|Set|Iterator} cons 内容
 * @param  {Function} callback 操作回调
 * @return {Node|Fragment|null} 待插入节点或文档片段
 */
function domManip( self, node, cons, clone, event ) {
	// 优先处理单节点
	if (cons.nodeType) {
		return clone ? self.clone(cons, event, true) : cons;
	}
	if ( isFunc(cons) ) {
		cons = cons(node);
	}
	return fragmentNodes(
		cons,
		nd => clone && self.clone(nd, event, true),
		node.ownerDocument
	);
}


/**
 * 节点集构造文档片段。
 * - 只接受元素、文本节点、注释和文档片段数据；
 * @param  {Nodes|Set|Iterator} nodes 节点集/迭代器
 * @param  {Function} get 取值回调
 * @param  {Document} doc 文档对象
 * @return {Fragment|null}
 */
function fragmentNodes( nodes, get, doc ) {
	// 注记：
	// 因存在节点移出可能，不可用values原生迭代；
	// 扩展运算符用于Set数据。
	nodes = $A(nodes) || [...nodes];

	let _all = doc.createDocumentFragment();

	for ( let n of nodes ) {
		let _nd = get && get(n) || n;

		if (_nd && (usualNode(_nd) || _nd.nodeType == 11)) {
	    	_all.appendChild(_nd);
		}
	}
	return _all.childNodes.length ? _all : null;
}


/**
 * 构建文档片段。
 * - 源码中的脚本元素被提取出来，存储在exbuf中（如果提供）；
 * - 脚本元素包含“script，style，link”三种；
 * - 源码解析异常会静默失败，返回null；
 * @param  {String} code 源码
 * @param  {Document} doc 文档对象
 * @param  {Array} xbuf 脚本存储空间
 * @return {Fragment|Node} 节点/片段
 */
function buildFragment( code, doc, xbuf ) {
	let _frag = doc.createDocumentFragment();

	if (!rhtml.test( code )) {
		_frag.appendChild( doc.createTextNode(code) );
		return _frag;
	}
	let _box = doc.createElement("div");
	try {
		_box.innerHTML = code;
	}
	catch (e) {
		console.error(e);
		return null;
	}
	// pick script...
	for ( let _tmp of $all('script, style, link', _box)) {
		if (xbuf) xbuf.push(_tmp);
		remove(_tmp);
	}
	// force remove.
	for (let _del of $all('html, head, body', _box)) {
		remove(_del);
		console.warn('html, head, body was denied.');
	}
	// 注记：
	// 不可用values迭代，节点的移出会影响迭代次数！
	for ( let _node of Arr(_box.childNodes) ) {
		_frag.appendChild( _node );
	}
	return _frag;
}



//
// 特性（Attribute）操作封装。
// 包含对data-*系特性的处理。
//
const elemAttr = {
	/**
	 * 获取特性值。
	 * - 特性名可能为data系简写形式；
	 * - 如果属性不存在，返回null；
	 * @param  {Element} el 目标元素
	 * @param  {String} name 特性名
	 * @return {Mixed} 特性值
	 */
	get( el, name ) {
		let _ns = name.match(__dataName);
		return el.getAttribute( _ns ? 'data-' + _ns[1] : name );
	},


	/**
	 * 设置特性。
	 * - name不存在空格分隔序列的形式；
	 * - 部分属性为Boolean性质，特别处理（boolHook）；
	 * - 特性名可能为data系简写形式；
	 *
	 * @param {Element} el 目标元素
	 * @param {String} name 特性名
	 * @param {Mixed} value 设置值
	 */
	set( el, name, value ) {
		return boolAttr.test(name) ?
			boolHook.set(el, value, name) : this.setAttr(el, name, value);
	},


	/**
	 * 设置/删除特性。
	 * - 如果value为null，则删除该特性；
	 * - 特性名可能为data系简写形式；
	 * @param {Element} el 目标元素
	 * @param {String} name 特性名
	 * @param {Mixed} value 目标值
	 */
	setAttr( el, name, value ) {
		let _ns = name.match(__dataName);
		if (_ns) {
			name = 'data-' + _ns[1];
		}
		if (value === null) {
			el.removeAttribute(name);
		} else {
			el.setAttribute(name, value);
		}
	},

};


//
// 属性（Property）操作封装。
// 包含对dataset系属性的处理。
//
const elemProp = {
	/**
	 * 获取属性值。
	 * - 属性名可能为data系简写形式；
	 * @param  {Element} el  目标元素
	 * @param  {String} name 属性名
	 * @return {Mixed} 结果值
	 */
	get( el, name ) {
		let _ns = name.match(__dataName);
		if (_ns) {
			// 名称解析短横线为驼峰式
			return el.dataset[ camelCase(_ns[1]) ];
		}
		name = propFix[name] || name;
		let _hook = propHooks[name];

		return _hook ? _hook.get(el) : el[name];
	},


	/**
	 * 设置属性。
	 * - 属性名可能为data系简写形式；
	 * @param {Element} el  目标元素
	 * @param {String} name 属性名
	 * @param {Mixed} value 设置值
	 */
	set( el, name, value ) {
		let _ns = name.match(__dataName);
		if (_ns) {
			// 名称解析短横线为驼峰式
			el.dataset[ camelCase(_ns[1]) ] = value;
		} else {
			el[ propFix[name] || name ] = value;
		}
	},

};



//!from jQuery 2.x or 3.x
const
	focusable = /^(?:input|select|textarea|button)$/i,
	propFix = {
		'for':   'htmlFor',
		'class': 'className',
		// 取消支持。
		// 由用户提供正确名称。一致性（驼峰名称不止这些）。
		// 'tabindex': 			'tabIndex',
		// 'readonly': 			'readOnly',
		// 'maxlength': 		'maxLength',
		// 'cellspacing': 		'cellSpacing',
		// 'cellpadding': 		'cellPadding',
		// 'rowspan': 			'rowSpan',
		// 'colspan': 			'colSpan',
		// 'usemap': 			'useMap',
		// 'frameborder': 		'frameBorder',
		// 'contenteditable': 	'contentEditable',
	},
	booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",
	boolAttr = new RegExp("^(?:" + booleans + ")$", "i"),
	boolHook = {
		set: function( el, val, name ) {
			if ( val === false ) {
				el.removeAttribute(name);
			} else {
				el.setAttribute(name, name);
			}
		}
	};

const propHooks = {
	tabIndex: {
		get: function( el ) {
			return el.hasAttribute( "tabindex" ) || focusable.test( el.nodeName ) || el.href ?
				parseInt(el.tabIndex) || 0 :
				-1;
		}
	}
};


//
// val操作特例。
//
// 单选按钮有组属性值，且没有“包容”元素可操作，
// 所以操作目标只能是按钮本身（任一成员皆可）。
//
// 复选框按钮允许同名成组，因此需要考虑组操作。
//
// option也有组属特点，但其有包容元素（select），
// 因此设计仅允许操作其容器元素，而屏蔽单独操作。
//
const valHooks = {

	// 会依所属组判断操作。
	radio: {
		// 返回选中项的值，仅一项。
		get: function( el ) {
			let _res = el.form[el.name];
			if (!_res) return;

			if (_res.nodeType) {
				_res = [_res];
			}
			else if (_res.value !== undefined) {
				return _res.value;
			}
			for (let _re of _res) {
				if (_re.checked) return _re.value;
			}
		},

		// val仅为值，不支持数组。
		// 注：采用严格相等比较。
		set: function( el, val ) {
			let _res = el.form[el.name];
			if (!_res) return;

			if (_res.nodeType) {
				_res = [_res];
			}
			for (let _re of _res) {
				if (val === _re.value) return (_re.checked = true);
			}
		}
	},

	checkbox: {
		// 单一成员时返回值或null（未选中）；
		// 重名多成员时返回值数组（可能为空）；
		// 注：返回undefined是因为缺乏name定义。
		get: function( el ) {
			let _cbs = el.form[el.name];
			if (!_cbs) return;

			if (_cbs.nodeType) {
				return _cbs.checked ? _cbs.value : null;
			}
			let _buf = [];
			for (let _cb of _cbs) {
				if (_cb.checked) _buf.push(_cb.value);
			}
			return _buf;
		},

		// 支持同名多复选。
		// 支持值数组匹配。
		set: function( el, val ) {
			let _cbs = el.form[el.name];
			if (!_cbs) return;

			if (_cbs.nodeType) {
				_cbs.checked = val === _cbs.value;
				return;
			}
			if (!isArr(val)) {
				val = [val];
			}
			for (let _cb of _cbs) {
				_cb.checked = inArray(val, _cb.value);
			}
		}
	},

	// 空操作占位。
	// 不可单独选取/取消选取。
	option: {
		get: function() {},
		set: function() {}
	},

	optgroup: {
		// 始终返回一个数组。
		get: function() {
			let _buf = [];
			for (let _op of el.children) {
				if (_op.selected) _buf.push(_op.value);
			}
			return _buf;
		},

		// 支持值数组匹配。
		// 不检测上级select类型。
		set: function( el, val ) {
			if (typeof val == 'string') {
				val = [val];
			}
			for (let _op of el.children) {
				if (inArray(val, _op.value)) _op.selected = true;
			}
		}
	},

	select: {
		// 单选列表返回一个值，
		// 多选列表返回一个值数组（可能为空）。
		get: function( el ) {
			if (el.type == 'select-one') {
				return el.options[el.selectedIndex].value;
			}
			if (el.selectedOptions) {
				return Arr(el.selectedOptions).map( o => o.value );
			}
			let _vals = [];
			for (let _op of el.options) {
				if (_op.selected) _vals.push(_op.value);
			}
			return _vals;
		},

		// 多选列表支持一个匹配值数组。
		// 会清除其它已选取项。
		set: function( el, val ) {
			el.selectedIndex = -1;

			if (el.type == 'select-one') {
				if (el.value !== undefined) {
					return (el.value = val);
				}
				for (let _op of el.options) {
					if (_op.value == val) return (_op.selected = true);
				}
				return;
			}
			if (typeof val == 'string') {
				val = [val];
			}
			for (let _op of el.options) {
				if (inArray(val, _op.value)) _op.selected = true;
			}
		}
	}
};



//
// boxSizing相关值。
//
const boxMargin = {
	height: css => parseFloat(css.marginTop) + parseFloat(css.marginBottom),
	width:  css => parseFloat(css.marginLeft) + parseFloat(css.marginRight)
};

const boxBorder = {
	height: css => parseFloat(css.borderTopWidth) + parseFloat(css.borderBottomWidth),
	width:  css => parseFloat(css.borderLeftWidth) + parseFloat(css.borderRightWidth)
};

const boxPadding = {
	height: css => parseFloat(css.paddingTop) + parseFloat(css.paddingBottom),
	width:  css => parseFloat(css.paddingLeft) + parseFloat(css.paddingRight)
};


//
// 矩形取值：目标差距。
//
const withRect = {
	height: 	 css => boxPadding.height(css) + boxBorder.height(css),
	innerHeight: css => boxBorder.height(css),
	outerHeight: (css, margin) => margin ? -boxMargin.height(css) : 0,

	width: 	 	 css => boxPadding.width(css) + boxBorder.width(css),
	innerWidth:  css => boxBorder.width(css),
	outerWidth:  (css, margin) => margin ? -boxMargin.width(css) : 0,
};


//
// CSS取值：目标差距。
//
const withCss = {
	height: 	 () => 0,
	innerHeight: css => boxPadding.height(css),
	outerHeight: (css, margin) => boxPadding.height(css) + boxBorder.height(css) + (margin ? boxMargin.height(css) : 0),

	width: 	 	 () => 0,
	innerWidth:  css => boxPadding.width(css),
	outerWidth:  (css, margin) => boxPadding.width(css) + boxBorder.width(css) + (margin ? boxMargin.width(css) : 0),
};


//
// 注记：
// - 未使用元素的offsetHeight属性；
// - 全部使用计算后样式值，浮点数；
//
const boxSizing = {
	// 内容盒模型。
	'content-box': {
		/**
		 * 通用取值。
		 * name为求值目标名称（height|innerHeight...）。
		 * margin参数仅用于outer/Height|Width系求值。
		 *
		 * @param  {Element} el 目标元素
		 * @param  {String} type 取值类型（height|width）
		 * @param  {String} name 求值名称
		 * @param  {CSSStyleDeclaration} css 样式声明实例
		 * @param  {Boolean} margin 包含Margin
		 * @return {Number}
		 */
		get: function( el, type, name, css, margin ) {
			let _cv = parseFloat( css[type] );
			return _cv ? _cv + withCss[name](css, margin) : rectSize(el, type) - withRect[name](css, margin);
		},


		/**
		 * 设置高宽值。
		 * @param {Element} el 目标元素
		 * @param {String} name 设置类型名（height|width）
		 */
		set: (el, name, val) => {
			el.style[name] = isNumeric(val) ? val+'px' : val;
		},
	},


	// 边框盒模型。
	'border-box': {
		/**
		 * 通用取值（参数说明同上）。
		 */
		get: function( el, type, name, css, margin ) {
			return ( parseFloat( css[type] ) || rectSize(el, type) ) - withRect[name](css, margin);
		},


		/**
		 * 返回非0值表示需要二次设置。
		 * - val非数值或像素单位时先试探性设置，返回补充高度；
		 * - 仅用于height/width；
		 * 注：非像素单位难以转换计算，故用此方法。
		 * @param  {String} name 设置类型名（height|width）
		 * @param  {String|Number} val
		 * @return {Number}
		 */
		set: (el, name, val, css) => {
			let _pb2 = boxPadding[name](css) + boxBorder[name](css),
				_num = pixelNumber(val);

			el.style[name] = _num ? (_num + _pb2 + 'px') : val;
			return _num ? 0 : _pb2;
		},
	}
};


/**
 * 矩形高宽值。
 * - 取矩形尺寸，已经包含了边框和内补丁；
 * - 用于CSS里高宽值为auto时（inline）的情形；
 * @param  {Element} el 目标元素
 * @param  {String} name 取值类型（height|width）
 * @return {Number}
 */
function rectSize( el, name ) {
	return el.getClientRects().length && el.getBoundingClientRect()[name];
}




//
// 事件处理。
// 注：也适用于非元素上事件的绑定，如Animation实例。
///////////////////////////////////////////////////////////////////////////////

const Event = {
	//
	// 绑定记录。
	// 以元素为键的弱引用存储 {Element: Map}
	// Map(
	//    key 				value
	//    ----------------------------------------------
	//    bound-handler: 	{ event, handle, selector }
	// )
	// 注记：
	// 因为一个元素上的事件调用量属于小规模，
	// 简单处理，用有唯一性的绑定调用句柄作为键索引。
	//
	store: new WeakMap(),


	//
	// 原生已调用标记。
	// 用于trigger激发时调用元素上原生事件状态。
	// {Element: ev.defaultPrevented}
	//
	called: new WeakMap(),


	//
	// 单次排他性绑定标记（once）
	// { Element: Map{flag: count} }
	//
	onces: new WeakMap(),


	//
	// 捕获定义。
	// 非冒泡事件，委托时注册为捕获。
	//
	captures: {
		focus: 		true,
		blur: 		true,
		mouseenter: true,
		mouseleave: true,
	},


	//
	// 委托绑定转交。
	// 部分浏览器不支持focusin/focusout。
	//
	sendon: {
		focusin: 	'focus',
		focusout: 	'blur',
	},


	/**
	 * 绑定事件调用。
	 * @param {Element} el 目标元素
	 * @param {String} evn 事件名
	 * @param {String} slr 委托选择器，可选
	 * @param {Function|Object} handle 处理函数/对象
	 */
	on( el, evn, slr, handle ) {
		let [_evn, _cap] = this._evncap(evn, slr);

		el.addEventListener(
			_evn,
			this.buffer(el, _evn, slr, handle),
			_cap
		);
		return this;
	},


	/**
	 * 移除事件绑定。
	 * - 同时会删除对应的存储记录；
	 * @param {Element} el 目标元素
	 * @param {String} evn 事件名
	 * @param {String} slr 委托选择器，可选
	 * @param {Function|Object} handle 处理函数/对象，可选
	 */
	off( el, evn, slr, handle ) {
		let [_evn, _cap] = this._evncap(evn, slr),
			_map = this.store.get(el);

		if (_map) {
			for ( let fn of this.handles(_map, _evn, slr, handle) ) {
				el.removeEventListener(_evn, fn, _cap);
				_map.delete(fn);
			}
		}
		return this;
	},


	/**
	 * 单次绑定执行。
	 * - 执行一次之后删除绑定；
	 * - 连续的多次绑定是有效的，排他性单次绑定参考.once；
	 * 注：记录绑定以便检查状态；
	 */
	one( el, evn, slr, handle ) {
		let [_evn, _cap] = this._evncap(evn, slr),
			_fun = this._handler(handle, slr),
			_map = this._boundMap(el, this.onces),
			_flg = evn + slr;

		el.addEventListener(
			_evn,
			function _one(...a) {
				el.removeEventListener(_evn, _one, _cap);
				this._onceFlag(_map, _flg, null);
				return _fun(...a);
			}.bind(this),
			_cap
		);
		return this._onceFlag(_map, _flg);
	},


	/**
	 * 排他性单次绑定。
	 * - 以事件名和选择器为标识，在事件触发前不再绑定；
	 * - 事件触发后绑定自动删除，然后可再次被绑定；
	 * - 仅适用one/once绑定方式，与on方式无关；
	 */
	once( el, evn, slr, handle ) {
		return this._matchOnce(el, evn, slr) || this.one( el, evn, slr, handle );
	},


	/**
	 * 事件绑定克隆。
	 * @param  {Element} to  目标元素
	 * @param  {Element} src 事件源元素
	 * @return {Element} 目标元素
	 */
	clone( to, src ) {
		let _fns = this.store.get(src);

		if (_fns) {
			for ( let [f, v] of _fns ) {
				let _evn = v.event;
				to.addEventListener(_evn, f, !!this.captures[_evn]);
			}
		}
		return to;
	},


	/**
	 * 是否已绑定事件处理。
	 * - 无检查条件时返回真，检查是否绑定任意事件；
	 * 注：暂不支持处理函数本身的检查匹配；
	 * @param  {Element} el 目标元素
	 * @param  {String} evn 事件名，可选
	 * @param  {String} slr 委托选择器，可选
	 * @return {Boolean}
	 */
	inBound( el, evn, slr ) {
		return this._matchOnce(el, evn, slr) || this._matchOn(el, evn, slr);
	},


	/**
	 * 缓存调用句柄。
	 * - 在绑定记录区用两个键（evn, handle）分别存储；
	 * - 事件名键为字符串，调用句柄键为函数；
	 * @param  {Element} el 事件目标元素
	 * @param  {String} evn 事件名
	 * @param  {String} slr 委托选择器
	 * @param  {Function} handle 用户调用
	 * @return {Function} 实际绑定调用
	 */
	buffer( el, evn, slr, handle ) {
		return this.addItem(
			this._boundMap(el, this.store),
			this._handler(handle, slr), evn, handle, slr
		);
	},


	/**
	 * 添加值存储。
	 * @param  {Map} buf 当前元素存储区
	 * @param  {Function} bound 绑定调用
	 * @param  {String} evn 事件名
	 * @param  {Function} handle 用户调用
	 * @param  {String} slr 选择器
	 * @return {Function|Object} 绑定调用/对象
	 */
	addItem( buf, bound, evn, handle, slr ) {
		buf.set(bound, {
			event: evn,
			handle: handle,
			selector: slr,
		});
		return bound;
	},


	/**
	 * 提取匹配的绑定调用集。
	 * @param  {Map} buf 存储集
	 * @param  {String} evn 事件名
	 * @param  {String} slr 选择器
	 * @param  {Function|Object} handle 用户调用句柄/对象
	 * @return {Array} 绑定集[Function]
	 */
	handles( buf, evn, slr, handle ) {
		let _list = [],
			_fltr = this._filter(evn, slr, handle);

		// 遍历查询
		for ( let [f, v] of buf ) {
			if ( _fltr(v) ) _list.push(f);
		}
		return _list;
	},


	/**
	 * 匹配委托目标。
	 * - slr限于子级匹配，支持“>*”直接子元素选择器；
	 * - 只返回最深的匹配元素，因此外部调用最多一次；
	 * 注记：
	 *   仅匹配一次可对节点树的嵌套产生约束，鼓励设计师
	 *   尽量构造浅的节点树层次。
	 *
	 * @param  {Event} ev 原生事件对象
	 * @param  {String} slr 选择器
	 * @return {Element|null} 匹配元素
	 */
	delegate( ev, slr ) {
		let _box = ev.currentTarget;

		return $sub( slr, _box,
			ss => this._closest( ss, ev.target, _box )
		);
	},


	/**
	 * 事件目标对象集。
	 * @param  {Event} ev 事件对象（原生）
	 * @param  {Element} cur 当前目标元素
	 * @return {Object}
	 */
	targets( ev, cur ) {
		return {
			origin:   ev.target,
			delegate: ev.currentTarget,
			current:  cur,
		};
	},


	//-- 私有辅助 -------------------------------------------------------------


	/**
	 * 构造事件处理句柄。
	 * - 返回函数由事件触发调用：func(ev)
	 * - 每次返回的是一个新的处理函数；
	 * - 支持EventListener接口，此时this为接口实现者本身；
	 * @param  {Function} handle 用户调用
	 * @param  {String} slr 选择器串，可选
	 * @return {Function} 处理函数
	 */
	_handler( handle, slr = null ) {
		if ( !isFunc(handle) ) {
			// EventListener
			handle = handle.handleEvent.bind(handle);
		}
		return this._wrapCall.bind(this, handle, slr);
	},


	/**
	 * 构造检测过滤函数。
	 * - 三个检查条件可任意组合；
	 * - 无参数调用返回真（是否绑定任意事件）；
	 * @param  {String} evn 事件名，可选
	 * @param  {String} slr 选择器，可选
	 * @param  {Function|Object} handle 用户调用句柄/对象，可选
	 * @return {Function} 过滤函数
	 */
	_filter( evn, slr, handle ) {
		let _f1 = it => it.event == evn,
			_f2 = it => it.selector == slr,
			_f3 = it => it.handle === handle,
			_fns = [];

		if (evn) _fns.push(_f1);
		if (slr) _fns.push(_f2);
		if (handle) _fns.push(_f3);

		return it => _fns.every( fn => fn(it) );
	},


	/**
	 * On绑定匹配检查。
	 * - 无检查条件时返回真，检查是否绑定任意事件；
	 * 注：暂不支持处理函数本身的检查匹配；
	 * @param  {Element} el 目标元素
	 * @param  {String} evn 事件名，可选
	 * @param  {String} slr 委托选择器，可选
	 * @return {Boolean}
	 */
	_matchOn( el, evn, slr ) {
		let _map = this.store.get(el);
		return _map && iterSome( _map, this._filter(evn, slr) );
	},


	/**
	 * one/once绑定匹配检查。
	 * （说明同_matchOn）
	 * @param  {Element} el 目标元素
	 * @param  {String} evn 事件名，可选
	 * @param  {String} slr 委托选择器，可选
	 * @return {Boolean} 是否存在
	 */
	_matchOnce( el, evn, slr ) {
		let _map = this.onces.get(el);
		return _map && _map.has( evn + slr );
	},


	/**
	 * 单次绑定标记操作。
	 * - 设置state为null表示减除计数；
	 * - 计数减为1时删除标记记录本身；
	 * @param {Map} map 标记计数映射
	 * @param {String} flg 标记串
	 * @param {undefined|null} state 减除或递增（默认递增）
	 */
	_onceFlag( map, flg, state ) {
		let _cnt = map.get(flg) || 0;

		if (state !== null) {
			return map.set(flg, _cnt + 1);
		}
		return _cnt > 1 ? map.set(flg, _cnt-1) : map.delete(flg);
	},


	/**
	 * 获取元素绑定存储映射。
	 * @param  {Element} el 关联元素
	 * @param  {WeakMap} store 存储区
	 * @return {Map}
	 */
	_boundMap( el, store ) {
		let _map = store.get(el);

		if (!_map) {
			_map = new Map();
			store.set(el, _map);
		}
		return _map;
	},


	/**
	 * 获取事件名与捕获模式。
	 * - 根据是否委托返回调整后的值；
	 * 注：仅在委托模式下才需要调整事件名和捕获模式；
	 * @param  {String} evn 原始事件名
	 * @param  {String} slr 选择器
	 * @return {Array} 值对
	 */
	_evncap( evn, slr ) {
		if (slr) {
			evn = this.sendon[evn] || evn;
		}
		return [
			evn,
			slr ? !!this.captures[evn] : false
		];
	},


	/**
	 * 封装调用。
	 * 注记：
	 *   trigger激发的事件与原生事件同名时，
	 *   临时存储该原生调用状态，避免重复调用处理函数。
	 *
	 * @param  {Function} handle 用户处理函数
	 * @param  {String} slr 委托选择器
	 * @param  {Event} ev 原生事件对象
	 * @return {Boolean}
	 */
	_wrapCall( handle, slr, ev ) {
		let _cur = slr === null ?
			ev.currentTarget : this.delegate(ev, slr);

		if (this.called.has(_cur)) {
			// 原生事件调用导致的激发...
			// 事件处理逻辑已经执行过一次
			return this._nativeCalled(ev, _cur);
		}
		return _cur &&
			handle.bind(_cur)(ev, this.targets(ev, _cur), slr) !== false &&
			// 可能trigger的事件为原生事件
			this._nativeCall(ev, _cur);
	},


	/**
	 * 原生事件已调用处理。
	 * 用于trigger激发与原生事件同名的自定义事件时。
	 * - 停止冒泡，因为取而代之的自定义事件会冒泡；
	 * - 事件处理函数里的默认行为取消延伸执行；
	 */
	_nativeCalled( ev, el ) {
		ev.stopPropagation();

		if ( this.called.get(el) ) {
			ev.preventDefault();
		}
		this.called.delete( el );
	},


	/**
	 * 原生事件调用。
	 * - 用于trigger激发元素上原生事件的调用；
	 * - submit调用不会激发submit事件，故排除；
	 * - 记忆当前事件默认行为是否取消，以向后延续；
	 * @param {Event} ev 原生事件对象
	 */
	_nativeCall( ev, el ) {
		if (!ev.isTrigger || !(ev.type in el)) {
			return;
		}
		if (ev.type == 'submit') {
			return el.submit();
		}
		this.called.set(el, ev.defaultPrevented);
		// e.g. click focus blur...
		el[ ev.type ]();
	},


	/**
	 * 向上匹配父级元素。
	 * - 从自身开始匹配测试；
	 * - 如果抵达容器元素，返回null；
	 * - 外部应保证根容器元素包含起点元素；
	 *
	 * @param  {Selector} slr 选择器
	 * @param  {Element} cur  起点元素
	 * @param  {Element} root 限制根容器
	 * @return {Element|null}
	 */
	_closest( slr, cur, root ) {
		while (cur !== root) {
			if ($is(cur, slr)) return cur;
			cur = cur.parentNode;
		}
		return null;
	},

};


/**
 * 事件批量绑定/解绑。
 * - 用于事件的on/off/one批量操作；
 * - evn支持“事件名序列: 处理函数”配置对象；
 *   此时slr依然有效（全局适用）。
 * @param {String} type 操作类型（on|off|one）
 * @param {Element} el  目标元素
 * @param {String|Object} evn 事件名（序列）或配置对象
 * @param {String} slr  委托选择器
 * @param {Function} handle 事件处理函数
 */
function eventBinds( type, el, evn, slr, handle ) {
	if (!el || !evn) {
		return;
	}
	if (typeof evn == 'string') {
		evnsBatch(type, el, evn, slr, handle);
		return;
	}
	for ( let [n, f] of Object.entries(evn) ) {
		evnsBatch(type, el, n, slr, f);
	}
}


/**
 * 批量绑定/解绑（事件名序列）。
 * - 多个事件名对应于一个处理函数；
 * @param {String} type 操作类型（on|off|one）
 * @param {Element} el  目标元素
 * @param {String} evn  事件名（序列）
 * @param {String} slr  委托选择器
 * @param {Function} handle 事件处理函数
 */
function evnsBatch( type, el, evn, slr, handle ) {
	if (! evn) return;

	for ( let name of evn.split(__chSpace) ) {
		Event[type](el, name, slr, handle);
	}
}



//
// 就绪载入部分。
// 相关接口：$.ready, $.holdReady
///////////////////////////////////

const domReady = {
	//
	// 基本成员/状态。
	//
	bounds: [], 	// 绑定句柄集
	waits: 	0,  	// 就绪等待
	passed: false, 	// 就绪已调用
	loaded: false, 	// 文档已载入


	/**
	 * 就绪调用。
	 * 如果就绪调用已实施，新的绑定立即执行。
	 */
	ready() {
		if (this.waits && !this.passed) {
			return;
		}
		while (this.bounds.length) this.bounds.shift()();
		this.passed = true;
	},


	/**
	 * 绑定就绪操作。
	 * 如果文档已载入完毕，立即尝试就绪调用；
	 * @param {Function} handle 用户就绪调用
	 * @param {Function} bound 待绑定的处理函数
	 */
	bind( handle, bound ) {
		this.bounds.push(
			() => this.completed(handle, bound)
		);
		document.addEventListener( "DOMContentLoaded", bound );
		window.addEventListener( "load", bound );

		return this.loaded && this.ready();
	},


	/**
	 * 绑定释放并最终调用。
	 * @param {Function} handle 用户就绪调用
	 * @param {Function} bound  绑定句柄
	 */
	completed( handle, bound ) {
		window.removeEventListener( "load", bound );
		document.removeEventListener( "DOMContentLoaded", bound );
		return handle && handle($);
	},

};


//
// 实用工具集
///////////////////////////////////////////////////////////////////////////////


$.isArray = isArr;
$.isNumeric = isNumeric;
$.is = $is;
$.type = $type;
$.inArray = inArray;
$.some = iterSome;
$.unique = uniqueSort;

// 是否已绑定
// 注：仅检查通过.on接口的绑定。
// $.isBound = Event.inBound.bind(Event);

// 表格行创建&填充
$.tr = tableRow;


/**
 * data属性名匹配。
 * 返回“data-”之后的prop格式名（驼峰）。
 * @return {String}
 */
$.dataName = function( str = '' ) {
	let _ns = str.match(__dataName);
	return _ns && camelCase( _ns[1] ) || '';
};


/**
 * 构造选择器。
 * - 仅支持标签&属性选择器；
 * 匹配符：{
 *  	~ 	空格分隔的单词匹配
 *  	| 	-分隔的词组前置匹配
 *  	* 	字串包含匹配
 *  	^ 	头部字串匹配
 *  	$ 	尾部字串匹配
 * }
 * @param  {String} tag  标签名
 * @param  {String} attr 属性名
 * @param  {String} val  属性值
 * @param  {String} op   属性匹配符
 * @return {String}
 */
$.selector = function( tag, attr, val = '', op = '' ) {
	if (!attr) return tag;

	let _ns = attr.match(__dataName);
	if (_ns) {
		attr = 'data-' + _ns[1];
	}
	return `${tag || ''}[${attr}` + (val && `${op}="${val}"`) + ']';
};


/**
 * 多数组合并。
 * - 将后续数组或数据合并到第一个数组；
 * - 如果数据来源不是数组，直接添加为成员；
 * - 返回首个参数数组本身；
 * @param  {Array} des 目标数组
 * @param  {...Array} src 数据源集序列
 * @return {Array} des
 */
$.merge = (des, ...src) => (des.push( ...[].concat(...src) ), des);


/**
 * Map转换为Object对象。
 * @param  {Map} map Map实例
 * @return {Object}
 */
$.mapObj = function( map ) {
	let _o = {};
	if (map) {
		for ( let [k, v] of map ) _o[k] = v;
	}
	return _o;
};


/**
 * 通用全部为真。
 * - 参考iterSome；
 * @param  {Array|LikeArray|Object|.entries} iter 迭代目标
 * @param  {Function} comp 比较函数
 * @param  {Object} self 回调内的this
 * @return {Boolean}
 */
$.every = function( iter, comp, self ) {
	if (self) {
		comp = comp.bind(self);
	}
	for ( let [k, v] of entries(iter) ) {
		if (!comp(v, k)) return false;
	}
	return true;
};


/**
 * 集合转换。
 * - 支持.entries接口的内置对象包括Map,Set系列；
 * - 回调返回undefined或null的条目被忽略；
 * - 回调可以返回一个数组，其成员被提取添加；
 * - 最终返回一个转换后的值数组；
 *
 * 注：功能与jQuery.map相同，接口略有差异。
 *
 * @param  {Array|LikeArray|Object|.entries} iter 迭代目标
 * @param  {Function} fun 转换函数
 * @param  {Object} self 回调内的this
 * @return {Array}
 */
$.map = function( iter, fun, self ) {
	if (self) {
		fun = fun.bind(self);
	}
	let _tmp = [];

	for ( let [k, v] of entries(iter) ) {
		v = fun(v, k);
		// undefined == null
		// jshint eqnull:true
		if (v != null) _tmp.push(v);
	}
	// 一级扁平化
	return [].concat(..._tmp);
};


/**
 * 创建一个新的对象。
 * - 新对象基于首个参数base为原型；
 * - 新对象是后续对象的浅拷贝合并；
 * @param  {Object} base 原型对象
 * @param  {...Object} data 源数据序列
 * @return {Object}
 */
$.object = function( base, ...data ) {
	return Object.assign( Object.create(base || null), ...data );
};


/**
 * 获取：对象的原型
 * 设置：设置对象的原型并返回该对象。
 * @param  {Object} obj  目标对象
 * @param  {Object} base 原型对象
 * @return {Object} obj
 */
$.proto = function( obj, base ) {
	return base === undefined ?
		Object.getPrototypeOf(obj) : Object.setPrototypeOf(obj, base);
};



//
// Expose
// 输出2个同值成员到全局：window.[
//  	$,
//  	tQuery
// ]
///////////////////////////////////////////////////////////////////////////////


let _w$ = window.$,
	_tQ = window.tQuery;


/**
 * 收回外部引用赋值。
 * 默认保留tQuery变量，传递all为真全部释放。
 * @return {tQuery}
 */
$.noConflict = function( all ) {
	if ( window.$ === $ ) window.$ = _w$;
	if ( all && window.tQuery === $ ) window.tQuery = _tQ;

	return $;
};


window.$ = window.tQuery = tQuery;


})( window );