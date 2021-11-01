/*! $Id: tabler.js 2017.03.20 tQuery.Exts $
*******************************************************************************
            Copyright (c) 铁皮工作室 2017 MIT License

                @Project: tQuery v0.1
                @Author:  风林子 zhliner@gmail.com
*******************************************************************************

	表格编辑器

	注记：
	尽量以$系方式操作表元素，以使得$的嵌入代理可适用至此。

	表格修改：
		表格只能以正行和整列的方式删除和添加；
		单元格不可以单独删除/添加，但可以擦除；
		表标题可以单独删除/添加；


&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&
*/


(function( $ ) {

	const
		// 矩阵存储。
		// - 表格元素与其矩阵应紧密关联；
		// - 保持编辑历史回退和再修改的良好对应；
		// {Element: Matrix}
		__Matrices = new WeakMap();


//
// 表格操作接口。
// 包含对表格及内部单元的所有操作。
// 会同步处理行列逻辑矩阵。
//
class Tabler {
	/**
	 * @param {Element} tbl 表格元素
	 */
	constructor( tbl ) {
		this._tbl = new Table(tbl);
		this._mtx = __Matrices.get(tbl) || __Matrices.set( tbl, new Matrix(tbl) );
	}


	/**
	 * 获取/删除表标题。
	 * - 传递参数为false表示删除标题；
	 * @param  {Boolean} exist 存在性，可选
	 * @return {Element|null} 表标题元素（如果存在）
	 */
	caption( exist ) {
		return exist === false ?
			this._tbl.caption(null) : this._tbl.caption;
	}


	/**
	 * 添加/更新表标题。
	 * - 如不没有表标题元素则插入一个新的；
	 * - html以源码方式插入，返回插入的子节点集；
	 * @param  {String} html 标题文本
	 * @return {[Node]} 更新的内容（节点集）
	 */
	updateCaption( html ) {
		return this._tbl.caption( html || '' );
	}


	/**
	 * 获取/删除表头。
	 * - 传递参数为false，删除表头元素；
	 * @param  {Boolean} exist 存在性，可选
	 * @return {Element|null} 表头元素（如果存在）
	 */
	thead( exist ) {
		if (exist !== false) {
			return this._tbl.tHead;
		}
		let _th = this._tbl.thead(null);

		if (_th) {
			this._removeRows(0, _th.rows.length);
		}
		return _th;
	}


	/**
	 * 添加/更新表头。
	 * - data可为一维（一行）或二维（多行）数组；
	 * - data里的数据成员一般为字符串，也可为DOM节点；
	 * - 节点数据会取其字符串表示，不影响原节点；
	 *   （元素：outerHTML, 文本节点：textContent）
	 * - data中多出的成员会与末尾单元简单合并；
	 *   注：此合并会让节点变成“[object HTML...]”形式。
	 *
	 * @param  {[String|Node]} data 行单元格数据集（1/2维）
	 * @return {[Element]} 插入的行元素集
	 */
	updateHead( data ) {
		let _tdss = this._tbl.dataTdss(
				data, this._mtx.width(), 'th'
			),
			_trs = this._tbl.createTrs(_tdss);

		// 捕获操作历史。
		this.thead(null);

		return this._insertRows(this._tbl.thead(_trs), 0);
	}


	/**
	 * 获取/删除表脚。
	 * - 传递参数为false，删除表脚元素；
	 * @param  {Boolean} exist 存在性，可选
	 * @return {Element|null} 表脚元素（如果存在）
	 */
	tfoot( exist ) {
		if (exist !== false) {
			return this._tbl.tFoot;
		}
		let _tf = this._tbl.tfoot(null);

		if (_tf) {
			let _len = _tf.rows.length;
			this._removeRows(this._mtx.height() - _len, _len);
		}
		return _tf;
	}


	/**
	 * 添加/更新表脚。
	 * （参数说明参考updateHead）
	 * @param  {[String|Node]} data 行单元格数据集（1/2维）
	 * @return {[Element]} 插入的行元素集
	 */
	updateFoot( data ) {
		let _tdss = this._tbl.dataTdss(
				data, this._mtx.width()
			),
			_trs = this._tbl.createTrs(_tdss);

		this.tfoot(null);

		return this._insertRows(this._tbl.tfoot(_trs));
	}


	/**
	 * 插入行集。
	 * - 插入新行时数据单元不含跨行单元格；
	 * - 起始下标idx未定义时为末尾插入；
	 * @param  {[String|Cellv]} data 行集数据（1/2维）
	 * @param  {Number} idx 位置下标，可选
	 * @return {[Element]} 插入的行元素集
	 */
	insertRows( data, idx ) {
		let _row = this._mtx.row(idx),
			_trs = this._tbl.createTrs(
				this._tbl.cloneTdss(data, _row.tds1())
			);

		return this._insertRows(_trs, idx);
	}


	/**
	 * 删除行集。
	 * @param  {Number} idx 位置下标
	 * @param  {Number} num 删除行数
	 * @return {[Element]} 删除的行元素集
	 */
	removeRows( idx, num ) {
		return this._removeRows(idx, num)
			.map( row => row.tr() );
	}


	/**
	 * 插入多列。
	 * - data为纵向单元格的数据集（列逻辑）；
	 * - 起始下标idx未定义时为末尾插入；
	 * @param  {[String|Cellv]} data 列数据集（1/2维）
	 * @param  {Number} idx 位置下标，可选
	 * @return {[[Element]]} 插入的行单元格序列集（2维）
	 */
	insertColumns( data, idx ) {
		let _col = this._mtx.column(idx),
			_tdss = this._tbl.cloneTdss(data, _col.tds1());

		return this._insertCols( toRowTds(_tdss), idx )
			.map( it => it.tds );
	}


	/**
	 * 删除多列。
	 * - 返回值为行单元格序列集（类似RowTds）；
	 * @param  {Number} idx 位置下标
	 * @param  {Number} num 删除的列数
	 * @return {[[Element]]} 删除的行单元格序列集（2维）
	 */
	removeColumns( idx, num ) {
		return this._removeCols(idx, num)
			.map( rp => rp.tds() );
	}


	/**
	 * 单元格扩展（水平）。
	 * - 仅支持向后（右）合并；
	 * - 返回null表示扩展区不整齐，未执行扩展；
	 * @param  {Element} td 当前单元格
	 * @param  {Number} num 扩展列数
	 * @return {[Element]|null} 删除的单元格集
	 */
	mergeHCells( td, num ) {
		let [_row, _col] = this._rowCol(td),
			_beg = _col + td.colSpan;

		let _rect = new CellRect(_row, _beg, td.rowSpan, num),
			_cps  = _rect.cps(this._mtx),
			_tds  = this._mtx.cell(_row, _col).rightExpand(_cps);

		if (_tds) {
			tracker(
				new BackRect(this._mtx, _row, _beg, _cps)
			);
			this._updateRect( [td], _rect );
		}
		return _tds;
	}


	/**
	 * 单元格扩展（垂直）。
	 * - 仅支持向下合并；
	 * @param  {Element} td 当前单元格
	 * @param  {Number} num 扩展行数
	 * @return {[Element]} 删除的单元格集
	 */
	mergeVCells( td, num ) {
		let [_row, _col] = this._rowCol(td),
			_beg = _row + td.rowSpan;

		let _rect = new CellRect(_beg, _col, num, td.colSpan),
			_rps  = _rect.rps(this._mtx),
			_tds  = this._mtx.cell(_row, _col).downExpand(_rps);

		if (_tds) {
			tracker(
				new BackRect(this._mtx, _beg, _col, _rps)
			);
			this._updateRect( [td], _rect );
		}
		return _tds;
	}


	/**
	 * 单元格切分（水平）
	 * - 基本为mergeHCells的逆操作；
	 * - 通常一次拆分为左右两个td，dist零值则全拆分；
	 * - 仅支持右侧切分；
	 * @param  {Element} td 目标单元格
	 * @param  {Number} dist 右侧距离（列数）
	 * @return {[Element]} 新的单元格集
	 */
	splitHCell( td, dist = 0 ) {
		dist = Math.min(dist, td.colSpan - 1);

		if (td.colSpan == 1 || dist < 0) {
			return;
		}
		let [_row, _col] = this._rowCol(td),
			_tag  = this._tbl.inHead(td) ? 'th' : 'td',
			_num  = dist ? td.colSpan - dist : 1,
			_rect = new CellRect(_row, _col+_num, td.rowSpan, dist || td.colSpan-1);

		tracker(
			this._backSplit(this._mtx, _rect)
		);

		return this._updateHRect(
			this._mtx.cell(_row, _col).rightSplit(dist, _tag),
			_rect
		);
	}


	/**
	 * 单元格切分（垂直）。
	 * - 基本为mergeVCells的逆操作；
	 * - 通常一次拆分为上下两个td，dist零值则全拆分；
	 * - 只支持下部切分；
	 * @param  {Element} td 目标单元格
	 * @param  {Number} dist 下部距离（行数）
	 * @return {[Element]} 新的单元格集
	 */
	splitVCell( td, dist = 0 ) {
		dist = Math.min(dist, td.rowSpan - 1);

		if (td.rowSpan == 1 || dist < 0) {
			return;
		}
		let [_row, _col] = this._rowCol(td),
			_num  = dist ? td.rowSpan - dist : 1,
			_refs = this._spanRefs(td, _row, _col),
			_rect = new CellRect(_row+_num, _col, dist || td.rowSpan-1, td.colSpan);

		tracker(
			this._backSplit(this._mtx, _rect)
		);

		return this._updateVRect(
			this._mtx.cell(_row, _col).downSplit(dist, _refs),
			_rect
		);
	}


	/**
	 * 修改表格行数。
	 * - 原大小不足时空值扩展；
	 * - 原大小超出时裁剪（截断）；
	 * @param {Number} num 目标行数
	 * @return {[Element]} 裁剪或增加的行元素集
	 */
	changeRows( num ) {
		return num > 0 &&
			this._changeSize( num, num-this._mtx.height(), 'Rows' );
	}


	/**
	 * 修改表格列数。
	 * （说明同上）
	 * @param  {Number} num 目标列数
	 * @return {[[Element]]} 裁剪或增加的单元格序列集（2维）
	 */
	changeCols( num ) {
		return num > 0 &&
			this._changeSize( num, num-this._mtx.width(), 'Columns' );
	}


	/**
	 * 计算单元格所在行次。
	 * - 对于跨行单元格，归属于所跨行集首行；
	 * @param  {Element} td 目标单元格
	 * @return {Number}
	 */
	rowIndex( td ) {
		return td.parentElement.rowIndex;
	}


	/**
	 * 提取单元格集所在行次集。
	 * @param  {[Element]} tds 单元格集
	 * @return {Set} 行次集
	 */
	rowIndexes( tds ) {
		return tds.reduce(
			(buf, td) => buf.add( this.rowIndex(td) ),
			new Set()
		);
	}


	/**
	 * 计算单元格所在列次。
	 * - 对于跨列单元格，归属于所跨列集首列
	 * - 返回-1表示不在矩阵中；
	 * @param  {Element} td 目标单元格
	 * @param  {Number} row 已知行次
	 * @return {Number}
	 */
	colIndex( td, row ) {
		let _i = -1;

		$.each(
			this._mtx.row(row).cells(),
			(it, i) => it.td() !== td || (_i = i, false)
		);
		return _i;
	}


	/**
	 * 提取单元格集所在列次集。
	 * @param  {[Element]} tds 单元格集
	 * @return {Set} 列次集
	 */
	colIndexes( tds ) {
		return tds.reduce(
			(buf, td) => buf.add( this.colIndex(td, this.rowIndex(td)) ),
			new Set()
		);
	}


	/**
	 * 获取指定下标的行元素。
	 * - 默认针对全表；
	 * - 传递body为数值取目标tbody；
	 * @param  {Number} idx 下标值
	 * @param  {Element|Number} body 表区域或特定tbody
	 * @return {Element} 行元素
	 */
	tr( idx, body ) {
		return this._tbl.tr( idx, body );
	}


	/**
	 * 提取表格行集。
	 * - 默认针对全表；
	 * - 传递body为数值取目标tbody；
	 *
	 * @param  {Number} beg 起始下标
	 * @param  {Number|null} end 结束下标，可选
	 * @param  {Element|Number} body 表区域或特定tbody
	 * @return {[Element]} 行元素集
	 */
	trs( beg, end, body ) {
		return this._tbl.trs( beg, end, body );
	}


	/**
	 * 获取目标行单元格集（无重复）。
	 * - 默认获取最后一行；
	 * - 逻辑行内的单元格不一定在相同行次的tr元素内；
	 *   （如跨行单元格）
	 * @param  {Number} idx 逻辑行次，可选
	 * @return {[Element]|null}
	 */
	row( idx ) {
		let _row = this._mtx.row(idx);
		return _row && _row.tds();
	}


	/**
	 * 获取连续行内的单元格集。
	 * - 包含在逻辑行内的单元格都会返回；
	 * - 返回Set，可能重复的单元格已唯一；
	 * @param  {Number} beg 起始下标
	 * @param  {Number} end 终点下标，可选
	 * @return {Set:Element} 单元格集
	 */
	rows( beg, end ) {
		return rcTds( this._mtx.rows(beg, end) );
	}


	/**
	 * 获取目标列单元格序列（无重复）。
	 * - 默认获取最后一列；
	 * @param  {Number} idx 逻辑列次，可选
	 * @return {[Element]}
	 */
	column( idx ) {
		return this._mtx.column(idx).tds();
	}


	/**
	 * 获取连续列内的单元格集。
	 * - 包含在逻辑列内的单元格都会包含；
	 * - 返回Set使得单元格已无重复；
	 * @param  {Number} beg 起始下标
	 * @param  {Number} end 终点下标，可选
	 * @return {Set:Element} 单元格集
	 */
	columns( beg, end ) {
		return rcTds( this._mtx.columns(beg, end) );
	}


	/**
	 * 获取表格行列数。
	 * @return {rows, cols} 行列数对象
	 */
	size() {
		return {
			rows: this._mtx.height(),
			cols: this._mtx.width()
		};
	}


	//-- 私有辅助 -------------------------------------------------------------


	/**
	 * 删除行集。
	 * 1. 调用矩阵的行删除操作；
	 * 2. 矩阵修改历史存储到追踪栈；
	 * @param  {Number} idx 起始下标
	 * @param  {Number} num 删除的行数
	 * @return {[Row]} 删除的逻辑行集
	 */
	_removeRows( idx, num ) {
		let _rows = this._mtx.removeRows(idx, num);

		tracker(
			new RowIns(this._mtx, idx, _rows)
		);
		return _rows;
	}


	/**
	 * 插入行集。
	 * 起始下标未定义时为末尾添加。
	 * 1. 调用矩阵的行插入操作；
	 * 2. 矩阵修改历史存储到追踪栈；
	 * @param  {[Element]} trs 待插入的行元素集
	 * @param  {Number} idx 起始下标，可选
	 * @return {[Element]} trs
	 */
	_insertRows( trs, idx ) {
		if (idx === undefined) {
			idx = this._mtx.height();
		}
		tracker(
			new RowDel(
				this._mtx,
				idx,
				this._mtx.insertRows(trs, idx).length
			)
		);
		return trs;
	}


	/**
	 * 删除列集。
	 * @param  {Number} idx 起始下标
	 * @param  {Number} num 删除的行数
	 * @return {[RowPart]} 删除的行单元片段集
	 */
	_removeCols( idx, num ) {
		let _rps = this._mtx.removeColumns(idx, num);

		tracker(
			new ColIns(this._mtx, idx, _rps)
		);
		return _rps;
	}


	/**
	 * 插入列集。
	 * @param  {[RowTds]} rtds 行单元格序列集
	 * @param  {Number} idx 起始下标，可选
	 * @return {[RowTds]} rtds
	 */
	_insertCols( rtds, idx ) {
		tracker(
			new ColDel(
				this._mtx,
				idx,
				this._mtx.insertColumns(rtds, idx)[0].size()
			)
		);
		return rtds;
	}


	/**
	 * 构造回退矩形。
	 * 注：用rps性能更好些。
	 * @param  {Matrix} mtx 目标矩阵引用
	 * @param  {CellRect} rect 单元矩形
	 * @return {BackRect} 回退矩形实例
	 */
	_backSplit( mtx, rect ) {
		return new BackRect(
			mtx, rect.row, rect.col, rect.rps( mtx )
		);
	}


	/**
	 * 单元矩阵更新。
	 * @param  {[Element]} tds 数据单元格集
	 * @param  {CellRect} rect 单元矩形区
	 * @return {[Element]} tds
	 */
	_updateRect( tds, rect ) {
		for ( let ri of $.range(rect.row, rect.rend-1) ) {
			this._updateCells(
				tds,
				this._mtx.row(ri),
				rect.col,
				rect.cend
			);
		}
		return tds;
	}


	/**
	 * 行片段单元更新。
	 * - 单元格集成员不足者取首个代替；
	 * @param  {[Element]} tds 数据单元格
	 * @param  {Row} row    目标逻辑行
	 * @param  {Number} beg 起始列次
	 * @param  {Number} end 终点列次
	 * @return {[Element]} tds
	 */
	_updateCells( tds, row, beg, end ) {
		let _i = 0;

		for ( let ci of $.range(beg, end - 1) ) {
			row.cell( ci, new Cell(tds[_i++] || tds[0]) );
		}
		return tds;
	}


	/**
	 * 矩形单元更新（横向）。
	 * - 单元格序列为左右序；
	 * 注：可直接复用_updateRect。
	 * @param  {Element|[Element]} tds 更新的单元格（集）
	 * @param  {CellRect} rect 单元矩形
	 * @return {[Element]} 更新的单元格集（tds）
	 */
	_updateHRect( tds, rect ) {
		if (tds.nodeType) {
			tds = [tds];
		}
		return this._updateRect( tds, rect );
	}


	/**
	 * 矩形单元更新（纵向）。
	 * - 单元格序列为上下序；
	 * @param  {Element|[Element]} tds 更新的单元格（集）
	 * @param  {CellRect} rect 单元矩形
	 * @return {[Element]} 更新的单元格集（tds）
	 */
	_updateVRect( tds, rect ) {
		if (tds.nodeType) {
			return this._updateRect([tds], rect);
		}
		let _i = 0;

		for ( let ri of $.range(rect.row, rect.rend-1) ) {
			this._updateCells(
				[ tds[_i++] ],
				this._mtx.row(ri),
				rect.col,
				rect.cend
			);
		}
		return tds;
	}


	/**
	 * 跨行单元格后续行插入参考。
	 * - 针对所跨行集范围，左右搜寻插入参考的单元格；
	 * - 从当前单元格所在行的下一行开始；
	 * - 参考单元格所在元素行与其逻辑行相同；
	 * 返回值：[{
	 *  	td:    参考单元格
	 *  	where: 插入位置/方法（after|before）
	 * }, ...]
	 * @param  {Element} td 源单元格
	 * @param  {Number} row 当前行次
	 * @param  {Number} col 当前列次
	 * @return {Array} 参考定义集
	 */
	_spanRefs( td, row, col ) {
		let _buf = [],
			_max = this._mtx.width(),
			_cxl = col - 1,
			_cxr = col + td.colSpan;

		for ( let n of $.range(row + 1, row + td.rowSpan-1) ) {
			let _ref = this._spanRef(n, _cxl, _cxr, _max);
			if (!_ref) break;
			_buf.push(_ref);
		}
		return _buf;
	}


	/**
	 * 搜寻参考单元格。
	 * @param  {Number} row  当前行次
	 * @param  {Number} coll 左起始列次
	 * @param  {Number} colr 右起始列次
	 * @param  {Number} end 列次终点（width）
	 * @return {Object} 参考配置{td, where}
	 */
	_spanRef( row, coll, colr, end ) {
		let _tr = this._tbl.tr(row);
		if (!_tr) return;

		return this._refLeft(_tr, row, coll) || this._refRight(_tr, row, colr, end);
	}


	/**
	 * 向左搜寻参考单元格。
	 * @param  {Element} tr 目标表格行
	 * @param  {Number} row 起始行次
	 * @param  {Number} col 起始列次
	 * @return {Object} 参考配置{td, where}
	 */
	_refLeft( tr, row, col ) {
		while (col >= 0) {
			let td = this._mtx.cell(row, col--).td();
			if (td.parentNode === tr) {
				return { td, where: 'after' };
			}
		}
	}


	/**
	 * 向右搜寻参考单元格。
	 * @param  {Element} tr 目标表格行
	 * @param  {Number} row 起始行次
	 * @param  {Number} col 起始列次
	 * @param  {Number} end 列次终点（width）
	 * @return {Object} 参考配置{td, where}
	 */
	_refRight( tr, row, col, end ) {
		while (col < end) {
			let td = this._mtx.cell(row, col++).td();
			if (td.parentNode === tr) {
				return { td, where: 'before' };
			}
		}
	}


	/**
	 * 返回单元格所在行列次。
	 * @param  {Element} td 目标单元格
	 * @return {[rows, cols]}
	 */
	_rowCol( td ) {
		let _row = this.rowIndex(td);
		return [
			_row,
			this.colIndex(td, _row)
		];
	}


	/**
	 * 修改表格大小。
	 * - len正值为末端扩展，负值为末端裁剪；
	 * @param  {Number} idx  起始下标
	 * @param  {Number} len  插入/删除长度
	 * @param  {String} name 操作辅助名（Rows|Columns）
	 * @return {[Element]|[[Element]]} 删除或插入的行元素/单元格序列集
	 */
	_changeSize( idx, len, name ) {
		if (len < 0) {
			// .removeRows|.removeColumns
			return this['remove' + name]( idx, -len );
		}
		if (len > 0) {
			// .insertRows|.insertColumns
			return this['insert' + name]( new Array(len).fill(['']) );
		}
	}
}


//
// 表格操作类。
// 对表格基本操作的封装，不涉及处理矩阵逻辑。
// 操作的是DOM元素本身。
//
class Table {
	/**
	 * @param {Element} tbl 表格元素
	 */
	constructor( tbl ) {
		this._tbl = tbl;
	}


	/**
	 * 添加/设置/删除表标题。
	 * - html以源码方式插入，返回插入的子节点集；
	 * - 传递参数null，删除标题元素；
	 * 注记：
	 * - 用$系接口新建标题以支持节点跟踪；
	 *
	 * @param  {String|null} html 标题文本
	 * @return {Element|Nodes|null} 删除的标题元素或插入的子节点集
	 */
	caption( html ) {
		let _el = this._tbl.caption;

		if (html === null) {
			return _el && $.detach(_el);
		}
		if (!_el) {
			_el = $.prepend(this._tbl, $.Element('caption'));
		}
		return $.html( _el, html );
	}


	/**
	 * 添加/更新/删除表头。
	 * - 传递null为参数，删除表头元素；
	 * @param  {[Element]|null} trs 行元素集
	 * @return {Element|[Element]|null} 删除的表头元素或更新的行元素集
	 */
	thead( trs ) {
		let _th = this._tbl.tHead;

		if (trs === null) {
			return _th && $.detach(_th);
		}
		return $.fill( _th || this._newTHead(), trs );
	}


	/**
	 * 添加/更新/删除表脚。
	 * - 传递null为参数，删除表脚元素；
	 * @param  {[Element]|null} trs 行元素集
	 * @return {Element|[Element]|null} 删除的表脚元素或更新的行元素集
	 */
	tfoot( trs ) {
		let _tf = this._tbl.tFoot;

		if (trs === null) {
			return _tf && $.detach(_tf);
		}
		if (!_tf) {
			_tf = $.append(this._tbl, $.Element('tfoot'));
		}
		return $.fill( _tf, trs );
	}


	/**
	 * 获取指定下标的行元素。
	 * - 默认针对全表；
	 * - 传递body为数值取目标tbody；
	 * @param  {Number} idx 下标值
	 * @param  {Element|Number} body 表区域或特定tbody
	 * @return {Element} 行元素
	 */
	tr( idx, body ) {
		return this._getBody(body).rows[idx];
	}


	/**
	 * 提取表格行集。
	 * @param  {Number} beg 起始下标
	 * @param  {Number|null} end 结束下标，可选
	 * @param  {Element|Number} body 表区域或特定tbody
	 * @return {[Element]} 行元素集
	 */
	trs( beg, end, body ) {
		let _rows = this._getBody(body).rows;

		//jshint eqnull:true
		if (end == null) {
			end = _rows.length;
		}
		return [...$.range(beg, end-1)].map( i => _rows[i] );
	}


	/**
	 * 创建表格行。
	 * @param  {[Element]} tds 单元格序列
	 * @return {Element} 行元素
	 */
	createTr( tds ) {
		return $.Element( 'tr', tds );
	}


	/**
	 * 创建表格行集。
	 * @param  {[[Element]]} tdss 单元格序列集（2维）
	 * @return {[Element]} 行元素集
	 */
	createTrs( tdss ) {
		return tdss.map(
			tds => $.Element( 'tr', tds )
		);
	}


	/**
	 * 从数据新建单元格集。
	 * @param  {[String|Node]} data 新单元数据序列
	 * @param  {String} tag 单元格标签
	 * @return {[Element]} 新单元格集
	 */
	dataTds( data, tag = 'td' ) {
		return data.map(
			dt => $.Element( tag, [dt] )
		);
	}


	/**
	 * 从数据新建单元格序列集。
	 * - 结果为新单元格的二维数组（多行/列成员）；
	 * @param  {Array} data 行数据集（1/2维）
	 * @param  {Number} num 单元格数量
	 * @param  {String} tag  单元格标签
	 * @return {[[Element]]} 新单元格序列集
	 */
	dataTdss( data, num, tag = 'td' ) {
		return rowsData(data, num)
			.map( dt => this.dataTds(dt, tag) );
	}


	/**
	 * 克隆赋值新建单元格集。
	 * - 克隆源单元格序列并赋新值（格式保持）；
	 * @param  {[String|Node]} data 新单元数据序列
	 * @param  {[Element]} tds 源单元格序列
	 * @return {[Element]} 新单元格集
	 */
	cloneTds( data, tds ) {
		return $(tds)
			.clone()
			.each( (td, i) => $.html(td, data[i]) ).get();
	}


	/**
	 * 克隆创建单元格序列集。
	 * - 参考已有单元格序列；
	 * - 结果为新单元格的二维数组（多行/列成员）；
	 * @param  {Array} data 行数据集（1/2维）
	 * @param  {Array} tds 参考单元格序列
	 * @return {[[Element]]} 单元格序列集
	 */
	cloneTdss( data, tds ) {
		return rowsData(data, tds.length)
			.map( dt => new this.cloneTds(dt, tds) );
	}


	/**
	 * 单元格是否在表头内。
	 * @param  {Element} td 目标单元格
	 * @return {Boolean}
	 */
	inHead( td ) {
		return td.parentNode.parentNode === this._tbl.tHead;
	}


	//-- 私有辅助 -------------------------------------------------------------


	/**
	 * 获取或删除元素。
	 * - val传递null删除目标元素；
	 * - val非null时返回元素本身；
	 * @param  {Element|null} el 目标元素
	 * @param  {null|Value...} val 值
	 * @return {Element|null}
	 */
	_getRemove( el, val ) {
		return val === null ? el && $.detach(el) : el;
	}


	/**
	 * 新建表头单元。
	 * @return {Element}
	 */
	_newTHead() {
		let _cap = tbl.caption,
			_the = $.Element('thead');

		return _cap ? $.after(_cap, _the) : $.prepend(this._tbl, _the);
	}


	/**
	 * 获取行容器。
	 * - 默认针对全表；
	 * - 传递body为数值取目标tbody；
	 * - body可能为tHead, tFoot, tBodies[...]；
	 *
	 * @param  {Element|Number} body 表区域或特定tbody
	 * @return {TableSection}
	 */
	_getBody( body ) {
		if (body === undefined) {
			return this._tbl;
		}
		return typeof body == 'number' ? this._tbl.tBodies[body] : body;
	}
}


//
// 逻辑行列矩阵。
// - 整齐行列，跨行与跨列的单元格重复存在；
// - 矩阵成员为Cell实例，便于跨行/列处理；
// - 由于单元格可跨行，应当取首行计算列数；
// 结构：{
//  	Matrix: [Row, Row...]
//  	Row: [Cell, Cell...]
// }
// 注：接口中所说行列皆指逻辑行和逻辑列。
//
class Matrix {
	/**
	 * @param {Element} tbl 目标表格
	 */
	constructor( tbl ) {
		// [Row]
		this._rc = buildRows(
			tbl.rows,
			new RowBuf( tdsSpan(tbl.rows[0].cells, 'colSpan') )
		);
	}


	/**
	 * 矩阵高度（行数）。
	 * @return {Number}
	 */
	height() {
		return this._rc.length;
	}


	/**
	 * 矩阵宽度（列数）
	 * @return {Number}
	 */
	width() {
		return this._rc[0].size();
	}


	/**
	 * 获取目标行。
	 * - 默认获取最后一行；
	 * @param  {Number} idx 行次（下标），可选
	 * @return {Row|null}
	 */
	row( idx ) {
		if (idx === undefined) {
			idx = this.height() - 1;
		}
		return this._rc[ idx ] || null;
	}


	/**
	 * 获取连续行集。
	 * @param  {Number} beg 起始下标
	 * @param  {Number} end 终点下标，可选
	 * @return {[Row]}
	 */
	rows( beg, end ) {
		return this._rc.slice(beg, end);
	}


	/**
	 * 获取目标列。
	 * - 默认获取最后一列；
	 * @param  {Number} idx 列次（下标），可选
	 * @return {Column}
	 */
	column( idx ) {
		if (idx === undefined) {
			idx = this.width() - 1;
		}
		return new Column( this._colCells(idx) );
	}


	/**
	 * 获取连续列集。
	 * @param  {Number} beg 起始下标
	 * @param  {Number} end 终点下标，可选
	 * @return {[Column]}
	 */
	columns( beg, end ) {
		let _buf = [];

		if (end === undefined) {
			end = this.width() - 1;
		}
		for ( let i of $.range(beg, end) ) {
			_buf.push( this.column(i) );
		}
		return _buf;
	}


	/**
	 * 插入元素行集。
	 * - 未指定起始下标idx时，为末尾添加；
	 * 1. 处理实际的元素行插入DOM；
	 * 2. 矩阵的插入逻辑；
	 * @param  {[Element]} trs 行元素集
	 * @param  {Number} idx 起始下标，可选
	 * @return {[Row]} 新行元素的逻辑行集
	 */
	insertRows( trs, idx ) {
		let _row = this.row(idx),
			_fun = idx === undefined ? 'after' : 'before';

		return _row &&
			this.rowsExtend( _row[_fun](trs), idx );
	}


	/**
	 * 矩阵行扩展。
	 * @param  {[Row]} rows 逻辑行集
	 * @param  {Number} idx 起始下标，可选
	 * @return {[Row]} rows
	 */
	rowsExtend( rows, idx ) {
		if (idx === undefined) {
			idx = this.height();
		}
		this._rc.splice( idx, 0, ...rows );

		return rows;
	}


	/**
	 * 删除行集。
	 * - 包含元素的DOM实际删除和矩阵逻辑处理；
	 * 注记：
	 * - 需要调用Row本身的删除逻辑处理跨行情况；
	 * @param  {Number} beg 起始下标
	 * @param  {Number} num 删除行数
	 * @return {[Row]} 删除的行集
	 */
	removeRows( beg, num ) {
		let _last = this.row(beg + num),
			_rows = this.rowsDelete(beg, num);

		return $.each(
			_rows,
			(row, i) => row.remove(i, _rows[i+1] || _last)
		);
	}


	/**
	 * 矩阵行删除。
	 * @param  {Number} beg 起始下标
	 * @param  {Number} num 删除行数
	 * @return {[Row]} 删除的行集
	 */
	rowsDelete( beg, num ) {
		return this._rc.splice( beg, num );
	}


	/**
	 * 插入列集。
	 * - 未指定起始下标idx时，为末尾添加；
	 * - 包含元素的DOM实际插入和矩阵逻辑处理；
	 * @param  {[RowTds]} rtds 行单元格序列集
	 * @param  {Number} idx 起始下标，可选
	 * @return {[RowPart]} 新插入的单元序列集
	 */
	insertColumns( rtds, idx ) {
		let _col = this.column(idx),
			_fun = idx === undefined ? 'after' : 'before';

		return _col &&
			this.colsExtend( _col[_fun](rtds), idx );
	}


	/**
	 * 矩阵列扩展。
	 * @param  {[RowPart]} rps 单元序列集
	 * @param  {Number} idx 起始下标，可选
	 * @return {[RowPart]} rps
	 */
	colsExtend( rps, idx ) {
		if (idx === undefined) {
			idx = this.width();
		}
		return $.each( rps, (rp, row) =>
			this._rc[row].insertCells(rp.cells(), idx)
		);
	}


	/**
	 * 删除列集
	 * 1. 删除DOM中的实际存在；
	 * 2. 删除矩阵中的成员；
	 * @param  {Number} beg 起始下标
	 * @param  {Number} num 删除列数
	 * @return {[RowPart]} 删除的单元序列集
	 */
	removeColumns( beg, num ) {
		$.each(
			this.columns(beg, beg + num),
			col => col.remove()
		);
		return this.colsDelete(beg, num);
	}


	/**
	 * 矩阵列删除。
	 * @param  {Number} beg 起始下标
	 * @param  {Number} num 删除列数
	 * @return {[RowPart]} 删除的单元序列集
	 */
	colsDelete( beg, num ) {
		return this._rc
		.reduce(
			(buf, row) => ( buf.push(row.removeCells(beg, num)), buf ),
			[]
		);
	}


	/**
	 * 获取/设置目标位置的单元（Cell）。
	 * - 主要用于Cell实例扩展/回退后更新矩阵；
	 * @param  {Number} row 行次
	 * @param  {NUmber} col 列次
	 * @param  {Cell} cell 单元实例，可选
	 * @return {Cell} 目标单元或被覆盖的单元
	 */
	cell( row, col, cell ) {
		return this._rc[row].cell(col, cell);
	}


	//-- 私有辅助 -------------------------------------------------------------


	/**
	 * 获取某列的单元集。
	 * @param  {Number} idx 下标
	 * @return {[Cell]}
	 */
	_colCells( idx ) {
		return this._rc.reduce(
			(buf, row) => ( buf.push(row.cell(idx)), buf ), []
		);
	}
}


//
// 行操作。
// - 每一行都包含完整列数的单元格；
// - 跨行的单元格会重复存在于多行中；
// - 处理td/tr的实际DOM插入与删除；
// - 接收的数据为已经构建好的行元素集；
//
class Row {
	/**
	 * @param {Element} tr 行元素
	 * @param {[Cell]} cells 列单元序列
	 */
	constructor( tr, cells ) {
		this._tr = tr;
		this._buf = cells;
	}


	//-- 元素操作 -------------------------------------------------------------


	/**
	 * 返回对应行元素。
	 * @return {Element}
	 */
	tr() {
		return this._tr;
	}


	/**
	 * 未跨行单元格集。
	 * - 返回 rowSpan=1 的单元格序列（不重复）；
	 * 注记：插入新行时，跨行单元格被忽略（原地扩展）；
	 * @return {[Element]}
	 */
	tds1() {
		return soleTds(this._buf, 'rowSpan');
	}


	/**
	 * 获取当前逻辑行全部单元格。
	 * - 逻辑行里的单元格可能不在当前tr元素内；
	 * @return {[Element]}
	 */
	tds() {
		return cellTds( this._buf );
	}


	/**
	 * 在前部插入行。
	 * - 跨行单元格仅增加rowSpan值；
	 * - 直接包含的跨行单元格需要移动到新首行；
	 * 注记：
	 * - 返回的行集用于上级更新矩阵；
	 * @param  {[Element]} tr 行元素集
	 * @return {[Row]} 插入的逻辑行集
	 */
	before( trs ) {
		let _rows = this._createRows(trs);
		// 先移动跨行单元格
		// UI闪动更友好（如果有）
		this.moveTds(_rows[0]);
		this._insertTrs(trs, 'before');

		return _rows;
	}


	/**
	 * 在后面添加行。
	 * - 参数说明类似before；
	 * - 但无需跨行检查/修改；
	 * @param  {[Element]} trs 行元素集
	 * @return {[Row]} 插入的逻辑行集
	 */
	after( trs ) {
		return this._createRows(
			this._insertTrs( trs, 'after' )
		);
	}


	/**
	 * 删除当前行。
	 * - 跨行的单元格仅递减其rowSpan值；
	 * - 跨行单元格所属首行删除时，需移动该单元格到下一行；
	 * - 先处理跨行单元格再删除行，UI影响更小；
	 * 注记：
	 * - 当前行在矩阵的删除由上级负责；
	 * @param  {Row} next 下一行（备用）
	 * @return {Element} 删除的行元素
	 */
	remove( next ) {
		this.expand(-1);
		return $.detach( this.moveTds(next).tr() );
	}


	/**
	 * 跨行单元格移动。
	 * - 检查跨行单元格，从当前行移动到目标行；
	 * - 对应列次，在目标位置之前插入；
	 * 注：因同时跨列的可能，逆向检查启动；
	 * @param  {Row} to  目标行
	 * @return {this} 当前行
	 */
	moveTds( to ) {
		if (!to) {
			return this;
		}
		for ( let i = to.size()-1; i >= 0; i-- ) {
			let _td = to.cell(i).td();
			// to的单元格在本行内
			if (_td.parentNode === this._tr) this._moveTd(to, i);
		}
		return this;
	}


	/**
	 * 跨行单元格扩展。
	 * @param  {Number} num 扩展值
	 * @return {[Element]} 扩展的单元格集
	 */
	expand( num = 1 ) {
		return cellExpand(this._buf, num, 'rowSpan');
	}


	/**
	 * 擦除当前行。
	 * - 单元格内容设置为txt或空；
	 * - 跨行单元格被同时处理（多行共享）；
	 * @param  {String} txt 替补内容
	 * @return {Row} 当前行
	 */
	erase( txt = '' ) {
		return cellsErase(this._buf, txt), this;
	}


	/**
	 * 清理当前行。
	 * - 当全部单元格都跨行时的整体缩减；
	 * - 保持单元格集中至少有一个未跨行；
	 * @return {void}
	 */
	clean() {
		cleanSpan(this._buf, 'rowSpan');
	}


	/**
	 * 行大小（逻辑列数）。
	 * @return {Number}
	 */
	size() {
		return this._buf.length;
	}


	//-- 矩阵适用 -------------------------------------------------------------
	// 矩阵以Row为行，Column以Row为基础。


	/**
	 * 获取/设置特定列次的单元。
	 * @param  {Number} col 列次（下标）
	 * @param  {Cell} cell 单元实例，可选
	 * @return {Cell} 目标单元或被覆盖的单元
	 */
	cell( col, cell ) {
		let _ori = this._buf[col];

		if (cell !== undefined) {
			this._buf[col] = cell;
		}
		return _ori;
	}


	/**
	 * 获取特定范围的单元序列。
	 * @param {Number} beg 起始下标
	 * @param {Number} end 终点下标，可选
	 * @return {[Cell]}
	 */
	cells( beg, end ) {
		return this._buf.slice(beg, end);
	}


	/**
	 * 插入单元序列。
	 * - 辅助用于列插入；
	 * @param  {[Cell]} cells 插入的单元集
	 * @param  {Number} idx 起始下标
	 * @return {this}
	 */
	insertCells( cells, idx ) {
		this._buf.splice(idx, 0, ...cells);
		return this;
	}


	/**
	 * 删除单元序列。
	 * - 辅助用于列删除；
	 * @param  {Number} beg 起始下标
	 * @param  {Number} num 删除数量
	 * @return {RowPart} 删除的单元序列
	 */
	removeCells( beg, num ) {
		return num > 0 &&
			new RowPart( this._buf.splice(beg, num) );
	}


	//-- 私有辅助 -------------------------------------------------------------


	/**
	 * 单元格移动。
	 * - 用于跨行单元格移动到跨行集首行；
	 * @param  {Row} to  目标行
	 * @param  {Number} i 当前下标
	 * @return {Element} 被移动的单元格
	 */
	_moveTd( to, i ) {
		let _to = to.cell(i + 1),
			_td = this._buf[i].td();

		return _to ? $.before(_to.td(), _td) : $.append(to.tr(), _td);
	}


	/**
	 * 插入表格行集。
	 * - 先插入再扩展跨行单元格，UI更友好；
	 *   （新行由短变至正常）
	 * @param  {[Element]} trs 表格行数据集
	 * @param  {String} where 插入位置（before|after）
	 * @return {[Element]} trs
	 */
	_insertTrs( trs, where ) {
		this.expand(
			$[where](this._tr, trs).length
		);
		return trs;
	}


	/**
	 * 创建逻辑行集。
	 * - 参考当前行创建相邻逻辑行集；
	 * - 用于新插入行元素时的逻辑行构造；
	 * @param  {Array} trs 行元素集
	 * @return {[Row]} 逻辑行集
	 */
	_createRows( trs ) {
		return buildRows(
			trs,
			new RowBuf( this.size() ).fill(this)
		);
	}
}


//
// 列操作封装。
// - 封装后独立操作，隔离复杂性；
// - 这是一个“虚”类，仅用于封装；
// - 列的插入直接参考相邻单元格处理；
// 注记：
// - 采用原始的矩阵引用，矩阵修改可见；
//
class Column {
	/**
	 * @param {[Cell]} cells 列单元序列
	 */
	constructor( cells ) {
		this._buf = cells;
	}


	/**
	 * 未跨列单元格集。
	 * - 返回 colSpan=1 的单元格序列（不重复）；
	 * 注记：插入新列时，跨列单元格原地扩展（不参考复制）；
	 * @return {[Element]}
	 */
	tds1() {
		return soleTds( this._buf, 'colSpan' );
	}


	/**
	 * 获取当前列全部单元格。
	 * @return {[Element]}
	 */
	tds() {
		return cellTds( this._buf );
	}


	/**
	 * 返回目标行次的单元。
	 * @param  {Number} row 目标行次
	 * @return {Cell}
	 */
	cell( row ) {
		if (row === undefined) {
			row = this._mtx.height() - 1;
		}
		return this._buf[ row ];
	}


	/**
	 * 获取特定范围的单元序列。
	 * @param  {Number} beg 起始下标
	 * @param  {Number} end 终点下标，可选
	 * @return {Array}
	 */
	cells( beg, end ) {
		return this._buf.slice(beg, end);
	}


	/**
	 * 在前部插入列（>=1）。
	 * - 跨列的单元格仅增加其colSpan值；
	 * @param  {[RowTds]} rtds 单元格序列集
	 * @return {[RowPart]} 新插入的行单元片段集
	 */
	before( rtds ) {
		return this._insertColumns(rtds, 'before');
	}


	/**
	 * 在后面添加列（>=1）。
	 * - 参数说明同上；
	 * - 逐次插入，数据逆序以校正DOM顺序；
	 * @param  {[RowTds]} rtds 单元格序列集
	 * @return {[RowPart]} 新插入的行单元片段集
	 */
	after( rtds ) {
		return this._insertColumns(rtds, 'after');
	}


	/**
	 * 删除当前列。
	 * - 跨列的单元格仅需递减其colSpan值；
	 * - 实际删除的单元格未跨列；
	 * @return {[Element]} 实际删除的单元格集
	 */
	remove() {
		this.expand(-1);
		return $( this.tds1() ).detach().get();
	}


	/**
	 * 跨列单元格扩展。
	 * @param  {Number} num 扩展值
	 * @return {[Element]} 扩展的单元格集
	 */
	expand( num = 1 ) {
		return cellExpand(this._buf, num, 'colSpan');
	}


	/**
	 * 清空当前列。
	 * - 单元格内容设置为txt或空；
	 * - 跨列单元格被同时处理（多列共享）；
	 * @param  {String} txt 替补内容
	 * @return {Column} 当前列
	 */
	erase( txt = '' ) {
		return cellsErase(this._buf, txt), this;
	}


	/**
	 * 清理当前列。
	 * - 当全部单元格都跨列时的整体缩减；
	 * - 保持单元格集中至少有一个未跨列；
	 * @return {void}
	 */
	clean() {
		cleanSpan(this._buf, 'colSpan');
	}


	/**
	 * 返回列大小。
	 * @return {Number}
	 */
	size() {
		return this._buf.length;
	}


	//-- 私有辅助 -------------------------------------------------------------


	/**
	 * 插入单元格序列。
	 * - 跨行单元格在后续行中实际不存在；
	 * - 无论如何都返回一个RowPart实例；
	 * @param  {Element} ref 参考单元格
	 * @param  {[Element]} tds 数据单元格集
	 * @param  {String} meth 插入方法
	 * @return {RowPart}
	 */
	_insertTds( ref, tds, meth ) {
		if (ref) {
			$[meth]( ref, tds );
		}
		return rowPart( tds, tds.length );
	}


	/**
	 * 插入多列。
	 * - 跨列的单元格仅增加其colSpan值；
	 * - 序列集内的单元格仅限于未跨列单元格；
	 * - 注意跨行单元格引用同一个新单元格；
	 * @param  {[RowTds]} rtds 单元格序列集
	 * @param  {String} meth 插入方法（before|after）
	 * @return {[RowPart]} 新插入的行单元片段集
	 */
	_insertColumns( rtds, meth ) {
		let _len = rtds[0].tds.length,
			_buf = [],
			_i = 0;

		cellNext( this._buf, 'colSpan',
			(td, i, rep) => {
				if (!rep) _i++;
				_buf.push( this._insertTds(rep && td, rtds[_i].tds, meth) );
			},
			td => _buf.push( rowPart([td], _len) )
		);
		this.expand( _len );

		return _buf;
	}
}


//
// 单元格操作。
// 注记：
// - 返回的单元序列用于上级矩阵更新；
// - 仅支持右侧（列）和下端（行）的操作；
//
class Cell {
	/**
	 * @param {Element} td 单元格元素
	 */
	constructor( td ) {
		this._td = td;
	}


	/**
	 * 向右扩展。
	 * 当前单元格可能跨行。
	 * - cps为完整的扩展逻辑列，不含当前单元格所属单元；
	 * - cps的长度为扩展的逻辑列大小（即colSpan增量）；
	 * - 返回null表示扩展区不整齐，未执行扩展；
	 * 注记：
	 * - 每个列片段的跨行合计应当相等；
	 * - 上级约束列片段集的规整（右侧跨列整齐）；
	 *
	 * @param  {[ColPart]} cps 列片段集
	 * @return {[Element]|null} 删除的单元格集
	 */
	rightExpand( cps ) {
		return cps &&
			this._expand( cps, 'colSpan', this._td.rowSpan );
	}


	/**
	 * 向下扩展。
	 * 当前单元格可能跨列。
	 * - （同上类似）
	 * 注记：
	 * - 每个行片段的跨列合计应当相等；
	 * - 上级约束行片段集的规整（底部跨行整齐）；
	 *
	 * @param  {[RowPart]} rps 行片段集
	 * @return {[Element]|null} 删除的单元格集
	 */
	downExpand( rps ) {
		return rps &&
			this._expand( rps, 'rowSpan', this._td.colSpan );
	}


	/**
	 * 右侧回退。
	 * 相同跨行（仅处理本行即可）。
	 * - 返回值不含当前单元格，集合为左右序；
	 * - 新的单元格内容为空；
	 * - num为0值表示完全拆分；
	 * @param  {Number} num 回退列数
	 * @param  {String} tag 新单元格标签（小写），可选
	 * @return {Element|Array} 新的单元格（集）
	 */
	rightSplit( num, tag = 'td' ) {
		let _cnt = num ? 1 : this._td.colSpan - 1,
			_tds = this._newTds(_cnt, 'rowSpan', tag);

		if (_tds.nodeType) {
			_tds.colSpan = num;
			this._td.colSpan -= num;
		} else {
			this._td.colSpan = 1;
		}
		return $.after(this._td, _tds);
	}


	/**
	 * 下部回退。
	 * 缩减跨行（在目标行里插入，非本行）。
	 * - 返回值不含当前单元格，集合为上下序；
	 * - ref的单元格序列也为上下序，不含当前行；
	 * - num为0值表示完全拆分，num非零，单拆分；
	 * - 新单元格从当前单元格克隆（行逻辑）；
	 *
	 * @param  {Number} num 回退行数
	 * @param  {Array} ref  跨行相邻列参考
	 * @return {Element|Array} 新的单元格（集）
	 */
	downSplit( num, ref ) {
		let _cnt = num ? 1 : this._td.rowSpan - 1,
			_tds = this._newTds(_cnt, 'colSpan');

		if (_tds.nodeType) {
			_tds.rowSpan = num;
			this._td.rowSpan -= num;
		} else {
			this._td.rowSpan = 1;
		}
		return this._backPuts( _tds, ref );
	}


	/**
	 * 清空当前单元格。
	 * @return {this}
	 */
	erase( txt = '' ) {
		$[txt === '' ? 'empty' : 'html'](this._td, txt);
		return this;
	}


	/**
	 * 返回单元格元素。
	 * @return {Element}
	 */
	td() {
		return this._td;
	}


	//-- 私有辅助 -------------------------------------------------------------


	/**
	 * 单元格扩展。
	 * - 行列片段集必须大小一致，规整扩展；
	 * - 单元序列应当连续和完整，由上级保证；
	 * - 目标片段中不包含当前单元格所属单元；
	 * - span：向右colSpan，向下rowSpan；
	 * @param  {[ColPart|RowPart]} list 片段集
	 * @param  {String} span 行/列跨度（rowSpan|colSpan）
	 * @param  {Number} val  列/行跨度对比值（.colSpan|.rowSpan）
	 * @return {[Element]|null} 删除的单元格集
	 */
	_expand( list, span, val ) {
		let $tds = null,
			_pas = list.every( it => it.size() == val );

		if (_pas) {
			$tds = $( rcTds(list) )
				.detach();

			// 集长度即为扩展的跨度大小
			this._td[span] += list.length;

			// 内容合并
			// 文本方式不影响原节点
			$.html(this._td, $tds.contents(), -2);
		}
		return $tds && $tds.get();
	}


	/**
	 * 创建新的单元格
	 * - 原则上克隆当前单元格；
	 * - 如果指定标签名且不同，则新建；
	 * - 内容填充为空；
	 * @param  {Number} num  单元格数
	 * @param  {String} span 新建复制的跨x属性（rowSpan|colSpan）
	 * @param  {String} tag  新单元格标签，可选
	 * @return {Element|Array} 新的单元格（集）
	 */
	_newTds( num, span, tag ) {
		let _tag = this._td.tagName.toLowerCase(),
			_td0 = null;

		if (tag && tag != _tag) {
			_td0 = $.Element(tag);
			_td0[span] = this._td[span];
		} else {
			_td0 = $.clone(this._td);
		}
		return num == 1 ? _td0 : this._clones(_td0, num-1);
	}


	/**
	 * 单元格多次克隆。
	 * - 结果集中包含克隆源本身；
	 * @param  {Element} src 源单元格
	 * @param  {Number} num 克隆数量
	 * @return {[Element]} 单元格集
	 */
	_clones( src, num ) {
		// 友好：
		// 多拆分时新单元格为空；
		src.textContent = '';

		let _tds = [src];

		while (0 <= num--) {
			_tds.push( $.clone(src) );
		}
		return _tds;
	}


	/**
	 * 行拆分插入列单元（集）。
	 * - 用于下端回退的单元格拆分插入；
	 * - 在当前单元格（this._td）已拆分后才调用；
	 *
	 * @param  {Element|Array} tds 拆分的新单元格（集）
	 * @param  {Array} ref 相邻列单元格参考集[{td, where}]
	 * @return {Element|Array} 新插入的单元格（集）
	 */
	_backPuts( tds, ref ) {
		if (tds.nodeType) {
			// _td.rowSpan已缩减
			let _it = ref[ this._td.rowSpan - 1 ];
			return $[ _it.where ]( _it.td, tds );
		}
		return $.each(
			tds,
			(td, i) => $[ ref[i].where ]( ref[i].td, td )
		);
	}
}



//
// 工具类。
///////////////////////////////////////////////////////////////////////////////


//
// 行单元格缓存。
// 辅助用于行单元格提取（处理跨行）。
// 一般在矩阵构建之初建立此缓存，且从首行开始处理。
// （首行无跨行的单元格缺失）
//
class RowBuf {
	/**
	 * @param {Number} cols 完整列数
	 */
	constructor( cols ) {
		this._buf = new Array(cols).fill({});
	}


	/**
	 * 行数据更新。
	 * - 当跨行计数递减为1时，更新单元格引用；
	 * 单元数据：{
	 *  	elem: 单元格元素
	 *  	rows: 跨行值（elem.rowSpan）
	 * }
	 * @param  {Element} tr 当前行元素
	 * @return {this}
	 */
	update( tr ) {
		let _cbuf = new ColBuf(tr);

		for ( let it of this._buf ) {
			if (it.rows > 1) {
				it.rows --;
			} else {
				it.elem = _cbuf.next();
				it.rows = it.elem.rowSpan;
			}
		}
		return this;
	}


	/**
	 * 填充重置。
	 * - 可用于重新计算的初始填充；
	 * @param  {Row} row 逻辑行
	 * @return {this}
	 */
	fill( row ) {
		$.each(
			row.cells(),
			(it, i) => {
				let elem = it.td();
				this._buf[i] = { elem, rows: elem.rowSpan };
			}
		);
		return this;
	}


	/**
	 * 提取单元格集。
	 * @return {Array}
	 */
	cells() {
		return this._buf.map( it => it.elem );
	}


	/**
	 * 缓存空间重置。
	 * @return {this}
	 */
	reset() {
		return this._buf.fill({}), this;
	}
}


//
// 列单元格缓存器。
// 用于逻辑列提取，配合RowBuf处理跨行与跨列。
//
class ColBuf {
	/**
	 * @param {Element} tr 原生tr行元素
	 */
	constructor( tr ) {
		this._tds = tr.cells;
		this._idx = 0;
		this._col = 0;
	}


	/**
	 * 获取下一个单元格。
	 * - 跨列的单元格在所属列持续返回；
	 * 注记：
	 * - 跨行后续行对应的单元格不在此列；
	 *   （由RowBuf跳过，不调用此接口）
	 * @return {Element}
	 */
	next() {
		let _td = this._tds[this._idx];

		if (!this._col) {
			this._col = _td.colSpan;
		}
		if (this._col == 1) this._idx ++;

		return this._col--, _td;
	}
}


//
// 行/列单元序列。
// 可用于单元格的行/列扩展。
//
class Cells {
	/**
	 * @param {[Cell]} cells 单元序列
	 * @param {String} span  跨行列属性（rowSpan|colSpan）
	 */
	constructor( cells, span ) {
		this._buf = cells;
		this._atn = span;
		this._tds = null;
	}


	/**
	 * 逻辑单元序列。
	 * @return {[Cell]}
	 */
	cells() {
		return this._buf;
	}


	/**
	 * 单元格集（不重复）
	 * @return {[Element]}
	 */
	tds() {
		return this._tds || ( this._tds = cellTds(this._buf) );
	}


	/**
	 * 实际所占行/列数。
	 * - 实际单元格可能超出单元序列集；
	 * @return {Number}
	 */
	size() {
		return tdsSpan( this.tds(), this._atn );
	}
}


//
// 行单元片段。
// 可用于单元格垂直扩展。
// - 自我约束跨列情况；
//
class RowPart extends Cells {
	/**
	 * @param {[Cell]} cells 列单元序列
	 */
	constructor( cells ) {
		// 监督跨列
		super(cells, 'colSpan');
	}


	/**
	 * 单元设置到矩阵。
	 * - 用于辅助行集回退到矩阵；
	 * @param  {Matrix} mtx 矩阵引用
	 * @param  {Number} row 起始行次
	 * @param  {Number} col 起始列次
	 * @return {[Cell]}
	 */
	puts( mtx, row, col ) {
		row = mtx.row(row);
		return $.each( this._buf, cell => row.cell(col++, cell) );
	}
}


//
// 列单元片段。
// 可用于单元格水平扩展。
// - 自我约束跨行情况；
//
class ColPart extends Cells {
	/**
	 * @param {[Cell]} cells 行单元序列
	 */
	constructor( cells ) {
		// 监督跨行
		super(cells, 'rowSpan');
	}


	/**
	 * 单元设置到矩阵。
	 * - 用于辅助列集回退到矩阵；
	 * @param  {Matrix} mtx 矩阵引用
	 * @param  {Number} row 起始行次
	 * @param  {Number} col 起始列次
	 * @return {[Cell]}
	 */
	puts( mtx, row, col ) {
		return $.each(
			this._buf, cell => mtx.cell(row++, col, cell)
		);
	}
}


//
// 单元矩形范围。
// - 在矩阵本身无行列插入/删除时有效；
// - 用于单元格扩展/切分的辅助操作（历史记录/更新等）；
//
class CellRect {
	/**
	 * @param {Number} row  起始行次
	 * @param {Number} col  起始列次
	 * @param {Number} rows 范围行数
	 * @param {Number} cols 范围列数
	 */
	constructor( row, col, rows, cols ) {
		this.row = row;
		this.col = col;

		this.rows = rows;
		this.cols = cols;

		this.rend = row + rows;
		this.cend = col + cols;
	}


	/**
	 * 获取全部行片段集。
	 * @param  {Matrix} mtx 矩阵引用
	 * @return {[RowPart]}
	 */
	rps( mtx ) {
		return this.rend <= mtx.height() &&
			[...$.range(0, this.rows-1)].map( i => this.rp(mtx, i) );
	}


	/**
	 * 获取全部列片段集。
	 * @param  {Matrix} mtx 矩阵引用
	 * @return {[ColPart]}
	 */
	cps( mtx ) {
		return this.cend <= mtx.width() &&
			[...$.range(0, this.cols-1)].map( i => this.cp(mtx, i) );
	}


	/**
	 * 获取目标行片段。
	 * @param  {Matrix} mtx 矩阵引用
	 * @param  {Number} idx 行次下标
	 * @return {RowPart}
	 */
	rp( mtx, idx ) {
		return new RowPart(
			mtx.row(this.row + idx).cells(this.col, this.cend)
		);
	}


	/**
	 * 获取目标列片段。
	 * @param  {Matrix} mtx 矩阵引用
	 * @param  {Number} idx 列次下标
	 * @return {ColPart}
	 */
	cp( mtx, idx ) {
		let _ci = this.col + idx;

		return new ColPart(
			mtx.rows(this.row, this.rend).map( row => row.cell(_ci) )
		);
	}
}


//
// 行单元格序列（片段）
// 注：仅用于类型表示清晰；
//
class RowTds {
	/**
	 * @param {[Element]} tds 单元格序列（同行）
	 */
	constructor( tds ) {
		this.tds = tds || [];
	}
}


//
// 工具：单元格值串。
// 包含指定的单元格标签名（$.table支持）。
//
class Cellv {
	/**
	 * @param {String} val 字符串值
	 * @param {String} tag 单元格标签名
	 */
	constructor( val, tag ) {
		this._val = val;
		this.tagName = tag;
	}

	toString() { return this._val; }
}


//
// 矩阵编辑回退
///////////////////////////////////////////////////////////////////////////////


//
// 矩形区域恢复。
// - 用于单元格扩展/切分的回退；
// - 区域为受影响而改变的行列段；
//
class BackRect {
	/**
	 * @param {Matrix} mtx  矩阵引用
	 * @param {Number} row  起始行次
	 * @param {Number} col  起始列次
	 * @param {[RowPart|ColPart]} data 行/列片段集
	 */
	constructor( mtx, row, col, data ) {
		this._mtx  = mtx;
		this._row  = row;
		this._col  = col;
		this._data = data;
	}


	back() {
		return $.each(
			this._data,
			its => its.puts(this._mtx, this._row, this._col)
		);
	}
}


class RowDel {
	/**
	 * @param {Matrix} mtx 矩阵引用
	 * @param {Number} idx 起始下标
	 * @param {Number} num 删除数量
	 */
	constructor( mtx, idx, num ) {
		this._mtx = mtx;
		this._beg = idx;
		this._num = num;
	}


	/**
	 * 标准回溯。
	 * @return {[Row]} 删除的逻辑行集
	 */
	back() {
		return this._mtx.rowsDelete( this._beg, this._num );
	}
}


class RowIns {
	/**
	 * @param {Matrix} mtx 矩阵引用
	 * @param {Number} idx 起始下标
	 * @param {[Row]} rows 逻辑行集
	 */
	constructor( mtx, idx, rows ) {
		this._mtx = mtx;
		this._beg = idx;
		this._data = rows;
	}


	/**
	 * 标准回溯
	 * @return {[Row]} 插入的逻辑行集
	 */
	back() {
		return this._mtx.rowsExtend( this._data, this._beg );
	}
}


class ColDel extends BackCol {
	/**
	 * @param {Matrix} mtx 矩阵引用
	 * @param {Number} idx 起始下标
	 * @param {Number} num 删除数量，可选
	 */
	constructor( mtx, idx, num ) {
		this._mtx = mtx;
		this._beg = idx;
		this._num = num;
	}


	/**
	 * 标准回溯。
	 * @return {[RowPart]} 删除的单元序列集
	 */
	back() {
		return this._mtx.colsDelete( this._beg, this._num );
	}
}


class ColIns extends BackCol {
	/**
	 * @param {Matrix} mtx 矩阵实例引用
	 * @param {Number} idx 起始列下标
	 * @param {[RowPart]} rps 行单元片段集
	 */
	constructor( mtx, idx, rps ) {
		this._mtx = mtx;
		this._beg = idx;
		this._rps = rps;
	}


	/**
	 * 回溯标准接口。
	 * @return {[RowPart]} 插入的单元片段集
	 */
	back() {
		return this._mtx.colsExtend( this._rps, this._beg );
	}
}



/**
 * 构造矩阵行集。
 * - 矩阵成员为Cell，行列数完整；
 * @param  {HTMLCollection|Array} trs 行元素集
 * @param  {RowBuf} rbuf 行缓存器
 * @return {[Row]} Row行集
 */
function buildRows( trs, rbuf ) {
	let _buf = [];

	$.each(
		trs,
		tr => _buf.push( buildRow(tr, rbuf) )
	);
	return _buf;
}


/**
 * 构造矩阵行。
 * @param  {Element} tr  行元素
 * @param  {RowBuf} rbuf 行缓存器
 * @return {Row} 矩阵行
 */
function buildRow( tr, rbuf ) {
	return new Row(
		tr,
		newCells( rbuf.update(tr).cells() )
	);
}


/**
 * 构造矩阵行单元集（Cell）。
 * @param  {Array} tds 行单元格集
 * @return {[Cell]}
 */
function newCells( tds ) {
	return tds.map( td => new Cell(td) );
}


/**
 * 创建行单元序列对象。
 * - 跨列单元格时，tds只包含一个成员；
 * - 跨列单元格被重复构建为单元对象；
 * @param  {Array} tds 单元格集
 * @param  {Number} num 单元数量
 * @return {RowPart}
 */
function rowPart( tds, num ) {
	let _buf = [],
		_idx = 0;

	while (num--) {
		_buf.push( tds[_idx++] || tds[0] );
	}
	return new RowPart(_buf);
}


/**
 * 单元序列扩展。
 * - 跨行列单元格扩展；
 * - 插入新行列时，跨行列单元格仅自身扩张；
 * @param  {[Cell]} cells 行列单元序列
 * @param  {Number} size 扩展单元数量
 * @param  {String} name 跨行列属性名（rowSpan|colSpan）
 * @return {[Cell]} cells
 */
function cellExpand( cells, size, name ) {
	let _buf = [];

	cellNext(cells, name, null, function(td, i, rep) {
		if (!rep) {
			_buf.push(td);
			td[name] += size;
		}
	});
	return _buf;
}


/**
 * 单元递进器。
 * - 逐个检查单元格是否跨行或跨列，调用回调；
 * 回调：(cell, i, repeat)
 * @param  {[Cell]} cells 单元序列
 * @param  {String} name  跨越属性名（rowSpan|colSpan）
 * @param  {Function} one 未跨行/列回调
 * @param  {Function} more 跨行/列回调
 * @return {[Cell]} cells 原单元序列
 */
function cellNext( cells, name, one, more ) {
	let _pre = null;

	return $.each(
		cells,
		function(it, i) {
			let _td = it.td(),
				_fn = _td[name] > 1 ? more : one;

			if (_fn) _fn(td, i, _pre === _td);
			_pre = _td;
		}
	);
}


/**
 * 单元集内容擦除。
 * @param  {Array} list Cell单元集
 * @param  {String} txt 替补内容
 * @return {Array} 原单元集list
 */
function cellsErase( list, txt ) {
	let _fn = txt === '' ?
		'empty' :
		'html';
	return $.each(list, it => $[_fn](it.td(), txt) );
}


/**
 * 清理单元跨行列属性。
 * - 全部单元格都跨行或跨列时缩减；
 * @param  {[Cell]} buf  单元集
 * @param  {String} name 属性名（rowSpan|colSpan）
 * @return {[Cell]|0} buf
 */
function cleanSpan( buf, name ) {
	let _min = Math.min(...cellSpan(buf, name)),
		_num = _min - 1;

	return _num && $.each(
		buf,
		it => it.td()[name] -= _num
	);
}


/**
 * 提取单元格跨行列值序列。
 * 注：仅用于检索最小跨行列值（Math.min）。
 * @param  {[Cell]} buf  单元集
 * @param  {String} name 属性名（rowSpan|colSpan）
 * @return {Iterator} 迭代器
 */
function* cellSpan( buf, name ) {
	let _n;

	for ( let it of buf ) {
		// 优化：只要有一个单元格未跨行列即终止。
		if ((_n = it.td()[name]) == 1) {
			return yield 1;
		}
		yield _n;
	}
}


/**
 * 单元格提取。
 * - 返回未跨行列的单元格序列；
 * - 跨行列的单元存储在可选的cells存储中；
 * @param  {[Cell]|Iterator} cells 目标集
 * @param  {String} name 属性名（rowSpan|colSpan）
 * @return {[Element]}
 */
function soleTds( cells, name ) {
	let _set = new Set();

	for ( let it of cells ) {
		let _td = it.td();

		if (_td[name] == 1) _set.add(_td);
	}
	return [ ..._set ];
}


/**
 * 提取单元格序列（不重复）。
 * @param  {[Cell]} cells 单元序列
 * @return {[Element]} 单元格集
 */
function cellTds( cells ) {
	return [...
		cells.reduce(
			(buf, it) => buf.add(it.td()), new Set()
		)
	];
}


/**
 * 行列（片段）单元格提取。
 * - 都拥有.tds接口；
 * @param  {[Row|RowPart|Column|ColPart]} list 行列单元组
 * @return {Set}
 */
function rcTds( list ) {
	return list.reduce(
		(set, it) => it.tds().reduce( (set, td) => set.add(td), set ),
		new Set()
	);
}


/**
 * 计算单元格序列行列数。
 * @param  {[Element]} tds 单元格序列
 * @param  {String} name 属性名（rowSpan|colSpan）
 * @return {Number}
 */
function tdsSpan( tds, name ) {
	return tds.reduce( (n, td) => n + td[name] , 0 );
}


/**
 * 列单元格序列集转换为行序列集。
 * - 即纵向单元集数组转为横向单元集数组；
 * @param  {[[Element]]} tdss 列单元格序列集（2维）
 * @return {[RowTds]}
 */
function toRowTds( tdss ) {
	let _buf = new Array( tdss[0].length )
		.fill([]);

	$.each(
		tdss,
		(col, i) => $.each( col, (td, j) => _buf[j][i] = td )
	);
	return _buf.map( tds => new RowTds(tds) );
}


/**
 * 构造行单元格数据集。
 * - 数据量不足时用sep补空；
 * - 数据量超出时用sep连接合并；
 * @param  {Array} data 单元格数据集
 * @param  {Number} cols 列数
 * @param  {String} sep  连接/补空字符串
 * @return {Array} 处理后的数据集
 */
function rowData( data, cols, sep = ' ' ) {
	let _dif = cols - data.length;
	if (!_dif) return data;

	if (_dif > 0) {
		return $.merge(data, new Array(_dif).fill(''));
	}
	_dif--;
	return $.merge( data.slice(0, _dif), data.slice(_dif).join(sep) );
}


/**
 * 按指定列数构造行集。
 * - rowData的多行版本；
 * - data为一维时表示单行；
 * - 未指定cols时返回二维的data；
 * @param  {Array} data 行单元格数据集（1/2维）
 * @param  {Number} cols 列数
 * @param  {String} sep  连接/补空字符串
 * @return {[Array]} 行单元格数值集
 */
function rowsData( data, cols, sep = ' ') {
	if (!$.isArray(data[0])) {
		data = [data];
	}
	return cols ? data.map( dt => rowData(dt, cols, sep) ) : data;
}



/**
 * 编辑历史追踪器支持。
 * - Object类型需要包含.back接口；
 * @param {Object|Function} back 回退操作
 */
function tracker( back ) {
	return $.Fx.Tracker && $.Fx.Tracker.push(back);
}



// Expose
///////////////////////////////////////////////////////////////////////////////


// 单元值
// 用于辅助定义单元格的数据，支持定制单元格标签名。
Tabler.Cellv = Cellv;


$.Fx.Tabler = Tabler;


})( tQuery.proxyOwner() );