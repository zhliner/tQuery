# 接口参考

## 基本工具

### [$.Element( tag, data, ns, doc? ): Element](docs/$.Element.md)

创建一个 `tag` 名称的元素，支持源码（`html`）内容和属性数据配置指定。

- `tag: String` 标签名称。
- `data: String | Object` 元素的源码内容或属性配置对象。
- `ns: String` 元素的名称空间，可选。
- `doc?: Document` 元素所属文档，可选。

可指定所属名称空间和所属文档对象。如果数据源 `data` 包含节点，源节点通常会被移出DOM原来的位置。


### $.elem( tag, text, doc? ): Element

简单地创建一个 `tag` 名称的元素，仅支持文本内容。它是上面 `.Element(...)` 方法的极简版，用于对效率需求较高的场景。

- `tag: String` 标签名称。
- `text: String` 元素的文本内容。
- `doc?: Document` 元素所属文档，可选。

> **注**：同样地，该方法也有一个集合版。


### [$.Text( data, hasbr?, doc? ): Text|[Node]](docs/$.TextNode.md)

创建一个文本节点。

- `data: String | [String] | Node | [Node]` 文本节点的数据内容。
- `hasbr?: Boolean` 是否支持换行元素（`<br>`）创建，可选。如果为真，返回值将是一个节点数组。
- `doc?: Document` 文本节点所属文档，可选。

数据源为节点时取其文本（`textContent`）值，数组单元取值为字符串后以一个换行符（`\n`）串连。


### [$.fragment( data, clean, doc? ): DocumentFragment](docs/$.fragment.md)

用源码创建一个文档片段，或封装其它数据源（如节点/集）为一个文档片段。

- `data: String | Node | .Iterator` 源码或数据源。
- `clean: Function | "svg" | null` 节点清理函数或SVG指示，可选。
- `doc?: Document` 文档片段所属文档，可选。

用源码创建时，默认会移除 `<script>`、`<style>`、`<link>` 三种元素，同时也会清除掉 `onerror`, `onload`, `onabort` 三个脚本类特性定义。如果不需要对创建的文档片段做任何清理，可传递 `clean` 为一个非null的任意假值（保留 `null` 为占位实参，便于后续传递 `doc`）。如果需要创建一个SVG文档片段，传递 `clean` 值为 `svg` 字符串。

节点清理函数接口：`function( DocumentFragment ): void`，其中唯一的实参为尚未导入当前文档（`document.adoptNode()`）的文档片段。

> **注：**
> 创建SVG文档片段或简单封装数据为文档片段时无清理功能。


### [$.svg( tag, opts, doc? ): Element](docs/$.svg.md)

创建SVG系元素。

- `tag: String | Object` SVG系元素标签名或 `<svg>` 根元素配置对象。
- `opts: Object` SVG系元素配置对象，可选。
- `doc?: Document` 元素所属文档，可选。

创建 `<svg>` 根元素时，`tag` 参数为特性配置对象而不是标签名，如：`$.svg({width: 200, height: 100})` 创建一个宽200像素，高100像素的 `<svg>` 根容器元素。

> **注：**
> 系统会自动采用 `http://www.w3.org/2000/svg` 名称空间创建SVG元素。


### [$.table( cols, rows, th0, doc? ): Table](docs/$.table.md)

创建一个指定行列数的空表格（封装为 `Table` 实例），或封装一个已有的规范表格元素为 `Table` 实例。

- `cols: Number | Element` 表格的列数（不含列头）或一个已有的表格元素。
- `rows: Number` 表格的行数，可选。
- `th0: Boolean` 是否添加列头（首列为 `<th>`）。如果为真，表格至少需要有1行。可选。
- `doc?: Document` 表格元素所属文档，可选。

返回的 `Table` 类实例仅提供简单的表格操作（不支持单元格合并/拆分），另外也不支持单元格的内容操作，而需要由外部的 `.html()` 或 `.text()` 来实现。这让 `Table` 的实现简单并轻量。


### [$.Table](docs/$.table.md#table-接口)

即由 `$.table()` 创建并返回的实例所属的类，这里导出以用于外部可能的需要。


### [$.script( data, box, doc? ): Element | Promise](docs/$.script.md)

插入一个 `<script>` 脚本元素。

- `data: String | Object` 脚本代码或一个配置对象。
- `box: Element` 包含脚本元素的容器元素，可选。
- `doc?: Document` 脚本元素所属文档，可选。

传入文本内容或一个包含 `text` 属性及其值的配置对象时，创建一个内联的 `<script>` 元素插入容器并返回该元素。传递一个包含 `.src` 属性及其值的配置对象时，创建一个引入外部资源的脚本元素插入到容器，返回一个 `Promise` 实例。`Promise.then()` 的实参为新创建的脚本元素。

脚本插入的目标容器 `box` 可选，默认插入 `document.head` 元素内，未明确指定 `box` 时，插入的 `<script>` 是临时的，执行后会自动移除。


### [$.style( data, next, doc? ): Element | Promise](docs/$.style.md)

构造并插入一个包含内容的 `<style>` 样式元素，或者一个引入外部CSS资源的 `<link href=...>` 元素。

- `data: String | Object` 样式代码或一个配置对象。
- `next: Element` 样式元素插入参考的下一个元素（插入之前），可选。默认插入到 `document.head` 内末尾。
- `doc?: Document` 元素元素所属文档，可选。

如果 `data` 是一个配置对象，通常包含如下成员：

```js
href:  String   // <link>元素的CSS资源定位。
rel:   String   // <link>元素的属性（stylesheet）。可选。
text:  String   // <style>元素的CSS代码。这也是创建<style>或<link>的判断依据。
scope: Boolean  // <style>元素的一个可选属性。
```

传入配置对象创建一个 `<link>` 元素时插入时，返回一个承诺对象（Promise），否则返回创建的 `<style>` 元素本身。


### [$.loadin( el, next, box ): Promise](docs/$.loadin.md)

载入元素的外部资源（通用）。

- `el: Element` 待载入资源的目标元素，比如一个 `<img>`。
- `next: Node` 目标元素插入的下一个元素/节点参考。
- `box: Element` 目标元素插入的容器元素，当无法用 `next` 指定位置时采用，可选。

**注意**：元素需要能够触发 `load` 和 `error` 事件。返回一个承诺对象，其中的 `resolve` 回调由 `load` 事件触发，`reject` 回调由 `error` 事件触发。


### $.isXML( it ): Boolean

检查目标是否为一个 XML 节点。

- `it: Element | Object` 待检测的目标，一个元素或其它文档对象。

```html
<svg baseProfile="full" width="300" height="200">
    <rect width="50%" height="100%" fill="orangered"></rect>
</svg>
```

```js
let rect = $.get('rect');
$.isXML( rect );  // true
$.isXML( document.body );  // false
```


### [$.contains( box, node, strict ): Boolean](docs/$.contains.md)

检查目标节点 `node` 是否包含在 `box` 元素之内。默认情况下，目标节点为容器时也返回真（DOM行为）。

- `box: Element` 是否包含目标节点的容器元素。
- `node: Node` 待检测的目标节点。
- `strict: Boolean` 是否严格子级约束（不含容器测试），可选。

与标准的元素 `.contains` 方法稍有差异，增加了严格子级约束选项。**注**：也与 `jQuery.contains()` 的行为稍有不同。


### $.cloneEvents( to, src, evns ): Element

把元素 `src` 上绑定的事件处理器克隆到 `to` 元素上。

- `to: Element` 事件处理器克隆到的目标元素，不影响它上面原有绑定的事件处理器。
- `src: Element` 事件处理器克隆的来源元素（其上绑定的事件处理器将被克隆）。
- `evns: String|Function` 过滤待克隆事件处理器的事件名序列（空格分隔）或过滤函数，可选。

事件处理器的克隆与元素的种类无关（如：`<input>` 上的事件处理器可克隆到 `<p>` 上，即便该事件并不会在 `<p>` 上发生）。克隆仅限于元素自身上的绑定，不包含子孙元素上的事件处理器。过滤函数接口：`function(conf:Object): Boolean`，其中 conf 为内部存储的事件配置对象。

```js
{
    name: String        // 事件名
    selector: String    // 委托选择器（可能前置>）
    once: Boolean       // 绑定为单次执行
    handle: Function    // 用户的事件处理函数
    capture: Boolean    // 是否注册为捕获
}
```

返回克隆了事件处理器的目标元素，如果源元素上没有事件绑定，静默返回。


### [$.controls( form, names, clean ): [Element]](docs/$.controls.md)

获取表单元素 `form` 内的控件元素集。未传递名称时，仅返回可提交的控件序列。

- `form: Element` 目标表单元素。
- `names: String` 指定的控件名序列（空格分隔），可选。
- `clean: Boolean` 清理无效的目标（`null` 成员），可选。

可提交类控件是指包含 `name` 特性（`Attribute`）定义的控件元素。对于 `input:checkbox` 类控件，即便它们中一个都没有被选中，也不影响它们是可提交类控件。

> **注：**<br>
> 同名的控件在表单中是一个**数组**的逻辑，返回集中只保留其首个成员，`.val()` 方法可正常取到值。


### $.changes( frm, extra?, evn? ): void

检查表单的控件的值是否已变化（与默认值不同）并激发其 `changed` 事件通知，事件向上冒泡且可取消。

- `frm: Element` 表单元素。
- `extra: Value` 发送到每一个控件的通知事件的附加数据，可选。
- `evn: String`  发送的事件名，默认为 `changed`。你可以使用自己的名称，但通常不必要。可选。

表单内每一个可提交的命名控件都会被检查，如果控件值未变则没有后果，如果所有的控件都保持原样，调用就只是静默通过。这是一个简单的工具，可用于表单的reset事件处理中，发现哪些控件值已经变化，或者任何你想知道的时候。

> **注：**
> 目标控件或表单上需要绑定 `changed` 或你定制的事件来做监听处理。


### $.textNodes( el, trim ): [Text]

提取目标元素内的文本节点集。

- `el: Element` 目标元素。
- `trim: Boolean` 文本清理（`.trim()`）后比较（会忽略空白节点），可选

会扁平化子元素内的所有文本节点，按其在 DOM 中的顺序排列。


### [$.serialize( form, names ): [Array2]](docs/$.serialize.md)

序列化表单内可提交类控件的名称和值。

- `form: Element` 目标表单元素。
- `names: String` 指定要处理的控件名序列（空格分隔）。可选，默认全部。

注意：这与表单的提交逻辑相关，因此只有实际会提交的值才会被序列化。返回一个**名/值对**（`[name, value]`）双成员数组（`Array2`）的数组。


### [$.queryURL( target ): String](docs/$.queryURL.md)

用数据源构造 `URL` 查询串（即 `URL` 中 `?` 之后的部分）。

- `target: Element | [Array2] | Object | Map` 构造查询串的表单元素或数据源。

数据源可以是一个表单元素、一个**名/值对**数组的数组（`$.serialize()` 的返回值）、一个**键/值对**对象、或者是一个 `Map实例`。如果直接传入一个表单元素，系统会自动提取表单内可提交控件的**名/值对**集合。


### $.unique( nodes, comp? ): Array

集合去重&排序。

- `nodes: [Node] | Iterator | Object | .values` 待去重排序的集合。
- `comp?: Function | null | true` 排序时用的比较函数。可选，非节点时传递 `null` 获取默认的规则。

可用于DOM树上的节点/元素集合，此时传递 `comp` 值为 `true`。可用于普通的值集合，`comp` 传递 `null` 获取默认的比较规则（`UTF-16` 代码单元值序列）。未传递 `comp` 值时无排序能力（仅去重）。

```js
$.unique( [3, 11, 2, 11, 12] );
// [3, 11, 2, 12]

$.unique( [3, 11, 2, 11, 12], null );
// [11, 12, 2, 3]

$.unique( [3, 11, 2, 11, 12], (a, b) => a - b );
// [2, 3, 11, 12]
```


### [$.ready( handle ): this](docs/$.ready.md)

文档载入就绪后的回调绑定。

- `handle: Function` 就绪回调函数。

可以绑定多个回调，系统会按绑定的先后顺序逐个执行。若文档已载入并且未被 `hold`（`$.holdReady(true)` 执行后），会立即执行该回调。

本接口仅适用于文档的初始载入就绪，不适用其它元素的载入就绪，如 `<img>`。


### [$.holdReady( hold ): void](docs/$.holdReady.md)

暂停或恢复 `.ready()` 注册的就绪回调的执行。

- `hold: Boolean` 停止/恢复通知，`true` 表示 `hold`，`false` 表示释放。

应当在页面加载的前段调用，传递 `true` 暂停 `.ready()` 注册的就绪回调的执行，传递 `false` 则恢复，可以多次调用 `.holdReady(true)`，但恢复时则需要调用等量次数的 `.holdReady(false)`。

如果文档已就绪并已调用 `ready()` 注册的回调，本操作无效（同 jQuery）。


### config( option? ): Object

配置 tQuery 节点变化定制事件是否开启（默认值 `null`，关闭）。

- `option: Object` 配置对象。目前支持 `varyevent:Boolean` 和 `bindevent:Boolean` 两个选项。

```js
option: {
    varyevent: Boolean,  // 节点变化类事件，true 开启，false 关闭。
    bindevent: Boolean,  // 事件注册类事件，true 开启，false 关闭。
}
```

#### 返回值

如果无参数调用，返回内部原始的配置对象（如 `{varyevent: null, bindevent: null}`）。否则返回配置前的对象（副本）。


### $.Fx = {}

一个空的功能扩展区，由外部扩展使用。这只是一个名称空间约定。



## 基本操作

### [$( its, ctx ): Collector](docs/$().md)

通用的节点元素查询器，即 `$(...)` 调用，返回一个 `Collector` 实例。

- `its: String | Node | [Node] | .values | Value` 待查询/封装的值或集合。
- `ctx: Element | Document` 元素查询上下文，可选。默认为 `document`。

查询目标 `its` 支持CSS选择器、节点/元素集（简单打包）、拥有 `.values()` 接口的对象（如：`Set`）等。传递CSS选择器时返回一个元素集合，传递其它集合时返回该集合的 `Collector` 封装。

也可以传递一个单纯的值，除 `null` 和 `undefined` 外，非字符串的 `its` 实参会构造一个仅包含该值的 `Collector` 实例，如：`$(false)` => `Collector[false]` （**注**：这与jQuery稍有不同）。


## 前置说明

> #### 关于单元素版和集合版
>
> 以下接口以单元素版（仅针对单个元素）的方法为索引，它们被定义在 `$` 函数对象上。集合版是指 `$()` 调用的返回值类型（`Collector`）的方法，它们作为类方法存在。
> 两者有部分接口名称和功能相同，集合版仅仅是单元素版的简单重复执行，它们的详细使用说明会被书写在同一个文档中。
>
> 如 `.nextAll`：
> - 单元素版：`$.nextAll( el, slr )` 返回元素 `el` 的后续兄弟元素，`slr` 为匹配过滤。
> - 集 合 版：`$(...).nextAll( slr )` 检索集合内每一个元素的后续兄弟元素，`slr` 为匹配过滤。返回一个排序并去除了重复元素的集合。



## 节点查询

### [$.get( slr, ctx? ): Element | null](docs/$.get.md)

查询单个元素（ID定位或 `.querySelector` 检索，效率较高）。

- `slr: String` 目标元素选择器。
- `ctx?: Element | Document` 查询目标元素的上下文元素或文档。可选，默认为 `document`。

明确传递 `ctx` 为假值（不含 `undefined`）时返回该假值。

**注**：预先导入Sizzle时支持非标准的CSS选择器。


### [$.find( slr, ctx?, andOwn? ): [Element]](docs/$.find.md)

在上下文元素内查询和选择器匹配的元素集。

- `slr: String` 目标元素选择器。
- `ctx?: Element | Document` 查询目标元素的上下文元素或文档。可选，默认为 `document`。
- `andOwn?: Boolean` 是否包含上下文元素自身的匹配测试。可选，默认为 `false`。

传递 `andOwn` 实参为 `true` 会测试选择器是否匹配上下文元素自身，这在某些场景下会更方便使用。明确传递 `ctx` 为假值（不含 `undefined`）时返回一个空数组。



## 集合过滤

集合仅适用于数组，如果需要支持类数组或 `Set` 等类型，可先构造为 `Collector` 实例使用（集合版）。


### [$.filter( list, fltr ): [Element] | [Value]](docs/$.filter.md)

对集合 `list` 中的成员用 `fltr` 匹配过滤，返回一个匹配成员的新数组。

- `list: [Element] | [Value]` 目标集。
- `fltr: String | Array | Function | Value` 匹配过滤的条件，可以是一个选择器、数组、测试函数或一个具体的值。

这是一个通用的匹配过滤方法，可用于任意值的集合。各种匹配条件的含义：

- 字符串表示CSS选择器，仅适用于元素集。
- 数组表示成员包含，可用于任意值的集合。
- 测试函数表示自定义判断，返回真时为匹配。
- 其它值用于全等测试，相等则为匹配。


### [$.not( list, fltr ): [Element] | [Value]](docs/$.not.md)

对集合 `list` 中的成员用 `fltr` 匹配排除，返回排除匹配项之后剩余成员的新数组。

- `list: [Element] | [Value]` 目标集。
- `fltr: String | Array | Function | Value` 匹配排除条件。

类似 `$.filter()`，这也是一个通用的方法，可用于任意值的集合。各种匹配条件的含义：

- 字符串表示CSS选择器，仅适用于元素集。匹配则排除。
- 数组表示成员包含，可用于任意值的集合。包含则排除。
- 测试函数表示自定义排除，返回真时成员被排除。
- 其它值用于全等测试，相等的项被排除。


### [$.has( sub ): Collector](docs/$.has.md)

对集合 `els` 中的元素用 `sub` 执行**包含**匹配过滤。返回一个测试成功成员的新数组。

- `els: [Element]` 元素集。
- `sub: String | Node` 用于包含测试的选择器或子节点。

> **注：**<br>
> 包含的意思是 **`sub` 作为子级节点存在，或者作为选择器可与子级元素匹配**。



## 节点遍历

### [$.prev( el, slr, until ): Element | null](docs/$.prev.md)

获取 `el` 的前一个（匹配的）兄弟元素。

- `el: Element` 取值的目标源元素，不适用文本节点。
- `slr: String | Function` 匹配测试的选择器或函数，可选。
- `until: Boolean` 是否持续测试。

这是 `$.next()` 方法的逆向版，其它说明相同。


### [$.prevAll( el, slr ): [Element]](docs/$.prevAll.md)

获取 `el` 前部的全部兄弟元素。

- `el: Element` 取值的目标源元素，不适用文本节点。
- `slr: String | Function` 匹配测试的选择器或函数，可选。

这是 `$.nextAll()` 方法的逆向版。可用 `slr` 进行匹配过滤，匹配者入选。始终会返回一个数组，即便没有任何匹配。测试函数接口和说明同前。未传递 `slr` 时表示不执行过滤，返回全集。

> **注：**
> 结果集会保持DOM的逆向顺序（即：靠近 `el` 的元素在前）。


### [$.prevUntil( el, slr ): [Element]](docs/$.prevUntil.md)

获取 `el` 的前端兄弟元素，直到 `slr` 匹配（不包含 `slr` 匹配的元素）。

- `el: Element` 取值的目标源元素，不适用文本节点。
- `slr: String | Element | Function` 终点匹配测试的选择器或元素或测试函数，可选。

这是方法 `$.nextUntil` 的逆向版。始终会返回一个数组，如果最开始的前一个元素就匹配或为 `null`，会返回一个空数组。测试函数接口和说明同前。

> **注：**
> 结果集会保持DOM的逆向顺序（即：靠近 `el` 的元素在前）。


### $.prevNode( node, comment?, trim? ): Node

获取 `node` 节点之前一个兄弟节点：包含元素、文本节点和可选的注释节点。

- `node: Node` 参考节点。
- `comment?: Boolean` 是否包含注释节点，可选。
- `trim?: Boolean` 对文本节点是否清理后判断（忽略纯空白文本），可选。

传递 trim 为真可以忽略纯空白文本节点。


### $.prevNodes( node, comment?, trim? ): [Node]

获取 `node` 节点之前的兄弟节点集：包含元素、文本节点和可选的注释节点。

- `node: Node` 参考节点。
- `comment?: Boolean` 是否包含注释节点，可选。
- `trim?: Boolean` 对文本节点是否清理后判断（忽略纯空白文本），可选。

传递 trim 为真可以忽略纯空白文本节点。


### [$.next( el, slr, until ): Element | null](docs/$.next.md)

获取 `el` 的下一个（匹配的）兄弟元素。

- `el: Element` 开始的目标元素。
- `slr: String | Function` 匹配测试的选择器或函数，可选。
- `until: Boolean` 是否持续测试。

如果未传递 `slr`，则无条件匹配 `el` 的下一个兄弟元素。如果传递 `until` 为真，则尝试持续测试直到匹配或抵达末尾（返回 `null`），否则仅针对下一个兄弟元素。

测试函数接口：`function(el:Element, i:Number): Boolean`，`i` 为顺序迭代的兄弟元素序位（`el` 处计为 `0`）。

> **注：**
> 比 `jQuery.next(slr)` 稍有增强，后者仅测试 `el` 的下一个兄弟元素。


### [$.nextAll( el, slr ): [Element]](docs/$.nextAll.md)

获取 `el` 的后续全部兄弟元素。

- `el: Element` 取值的目标源元素，不适用文本节点。
- `slr: String | Function` 匹配测试的选择器或函数，可选。

可用 `slr` 进行匹配过滤，匹配者入选。始终会返回一个数组，即便没有任何匹配（此时为一个空数组）。匹配测试函数接口为：`function( el:Element, i:Number ): Boolean`，`i` 为后续元素顺序计数（从 `el` 开始计数为 `0`）。

如果未传递 `slr` 表示不执行过滤，因此会返回一个全集。


### [$.nextUntil( el, slr ): [Element]](docs/$.nextUntil.md)

获取 `el` 的后续兄弟元素，直到 `slr` 匹配（不包含 `slr` 匹配的元素）。

- `el: Element` 取值的目标源元素，不适用文本节点。
- `slr: String | Element | Function` 终点匹配测试的选择器或元素或测试函数，可选。

始终会返回一个数组，如果最开始的下一个元素就匹配或为 `null`，会返回一个空数组。匹配测试函数接口为：`function( el:Element, i:Number ): Boolean`，`i` 为后续元素顺序计数（从 `el` 开始计数为 `0`）。


### $.nextNode( node, comment?, trim ): Node

获取 `node` 节点之后下一个兄弟节点：包含元素、文本节点和可选的注释节点。

- `node: Node` 参考节点。
- `comment?: Boolean` 是否包含注释节点，可选。
- `trim?: Boolean` 对文本节点是否清理后判断（忽略纯空白文本），可选。

传递 trim 为真可以忽略纯空白文本节点。


### $.nextNodes( node, comment?, trim ): [Node]

获取 `node` 节点之后的兄弟节点集：包含元素、文本节点和可选的注释节点。

- `node: Node` 参考节点。
- `comment?: Boolean` 是否包含注释节点，可选。
- `trim?: Boolean` 对文本节点是否清理后判断（忽略纯空白文本），可选。

传递 trim 为真可以忽略纯空白文本节点。


### [$.children( el, slr ): [Element] | Element | undefined](docs/$.children.md)

获取 `el` 的直接子元素（集）。

- `el: Element` 取值的目标父元素。
- `slr: String | Number` 子元素匹配选择器或指定的位置下标，可选。

可用 `slr` 对子元素集进行匹配过滤，匹配者入选。也可以指定一个具体的下标位置获取单个子元素（支持负数从末尾算起），但这样可能导致位置超出范围，此时会返回一个 `undefined` 值。

允许直接指定位置下标可能更高效，这样就避免了使用位置选择器过滤，并且会直接返回一个元素。


### [$.contents( el, idx, comment?, trim ): [Node] | Node | undefined](docs/$.contents.md)

获取 `el` 元素的内容，包含其中的子元素、文本节点和可选的注释节点。

- `el: Element` 取值的目标父元素。
- `idx: Number | String | '' | null` 子节点的位置下标（相对于取值的集合），兼容字符串数字。可选。
- `comment?: Boolean` 是否包含注释节点，可选。
- `trim?: Boolean` 对文本节点是否清理后判断（忽略纯空白文本），可选。

可指定仅返回某个具体位置的子节点，位置计数针对取值的集合（可能包含注释节点）。从0开始，支持负值从末尾算起。位置下标超出范围时返回一个 `undefined` 值。

空串的 `idx` 实参是一个特殊值，表示取内部的纯文本（非空）节点。
如果需要包含注释节点（实参 `comment` 为 `true`），而又不需要指定 `idx` 的值，可设置 `idx` 为 `null` 占位。

传递 `trim` 为真可以忽略内容全部为空白（如换行、空格等）的文本节点，因此计数也不包含。


### [$.siblings( el, slr ): [Element](docs/$.siblings.md)

获取 `el` 元素的兄弟元素。始终返回一个数组。

- `el: Element` 取值的参考元素。
- `slr: String | Function` 匹配过滤函数或选择器，可选。

可用 `slr` 进行匹配过滤，匹配者入选。`el` 需要存在一个父元素，否则兄弟的逻辑不成立，抛出异常。


### $.siblingNodes( node, comment?, trim? ): [Node]

获取 `node` 节点的兄弟节点集。包含元素、文本节点和可选的注释节点。

- `node: Node` 参考节点。
- `comment?: Boolean` 是否包含注释节点，可选。
- `trim?: Boolean` 对文本节点是否清理后判断（忽略纯空白文本），可选。

传递 trim 为真可以忽略纯空白文本节点。


### [$.parent( el, slr ): Element | null](docs/$.parent.md)

获取 `el` 元素的直接父元素。

- `el: Element` 取值的目标元素。
- `slr: String | Function` 测试是否匹配的选择器或自定义的测试函数，可选。

如果父元素匹配 `slr` 选择器，或自定义的测试函数返回真，则测试成功，返回该父元素，否则返回 `null`。


### [$.parents( el, slr ): [Element]](docs/$.parents.md)

获取 `el` 元素的上级元素集。

- `el: Element` 取值的目标元素。
- `slr: String | Function` 测试是否匹配的选择器或自定义的测试函数，可选。

从父元素开始匹配测试，结果集保持从内向外的逐层顺序。如果 `slr` 为测试函数，接口为：`function(el:Element, i:Number): Boolean`，首个实参为上级元素自身，第二个实参为向上递进的层级计数（直接父元素为 `1`）。


### [$.parentsUntil( el, slr ): [Element]](docs/$.parentsUntil.md)

汇集 `el` 元素的全部上级元素，直到 `slr` 匹配（不含匹配的元素）。

- `el: Element` 取值的目标元素。
- `slr: String | Function | Element | [Element]` 测试终点匹配的选择器、或自定义的测试函数、或一个目标元素或一个元素的数组，可选。

从父元素开始匹配测试，结果集保持从内向外的逐层顺序。如果 `slr` 为测试函数，接口为：`function(el:Element, i:Number): Boolean`，首个实参为上级元素自身，第二个实参为向上递进的层级计数（直接父元素为 `1`）。


### [$.closest( el, slr ): Element | null](docs/$.closest.md)

获取 `el` 最近的父级匹配元素。

- `el: Element` 取值的目标元素。
- `slr: String | Function | Element | [Element]` 目标匹配选择器、或自定义的测试函数、或一个目标元素或一个元素的数组，可选。

向上逐级检查父级元素是否匹配，返回最先匹配的目标元素。会从 `el` 元素自身开始测试匹配（同标准 Element:closest），如果抵达 `document` 或 `DocumentFragment` 会返回 `null`。如果未传入 `slr`，匹配当前元素自身（与 Element.closest 稍有不同）。

如果 `slr` 是一个自定义的测试函数，接口为：`function(el:Element, i:Number): Boolean`，首个实参为递进的元素自身，第二个实参为向上递进的层级计数（当前元素时为 `0`）。


### [$.offsetParent( el ): Element](docs/$.offsetParent.md)

获取 `el` 最近的父级定位元素。

- `el: Element` 取值的目标源元素。

从父元素开始检查，如果最终没有匹配返回文档根元素（`<html>`，同 jQuery）。如果当前元素属于 `<svg>` 的子元素，则返回 `<svg>` 根容器元素（与普通的HTML节点相区分）。

与元素原生的 `offsetParent` 属性稍有不同，不管元素是否隐藏（`display:none`），都会返回 `position` 为非 `static` 的容器元素。

> **注：**
> 元素原生的 `offsetParent` 属性在元素隐藏时值为 `null`。



## 节点操作

### [$.before( node, cons, clone, event, eventdeep ): Node | [Node]](docs/$.before.md)

在 `node` 元素或文本节点的前面插入节点/集。

- `node: Node` 插入参考的目标节点/元素。
- `cons: Node | [Node] | Set | Iterator | Function` 插入的数据源（支持 `Collector`，下同）。
- `clone: Boolean` 内容节点是否为克隆方式。可选，默认 `false`。
- `event: Boolean` 内容元素上绑定的事件处理器是否同时克隆。可选，默认 `false`。
- `eventdeep: Boolean` 内容元素的子孙元素上绑定的事件处理器是否同时克隆。可选，默认 `false`。

数据源支持节点、节点集、`Set` 集合、返回节点的迭代器，或是一个返回节点/集的取值回调。回调接口：`function( node ): Node | [Node]`，实参为参考节点 `node`。与jQuery不同，这里不支持HTML源码实时构建元素节点（**注**：应使用 `.html()` 接口），仅支持现成的节点/元素。

克隆参数（`clone`）适用于文本节点和元素，元素为深层克隆。事件克隆参数 `event` 和 `eventdeep` 仅适用于元素。接口返回插入的内容节点/元素（集），它们可能克隆而来。

> **关联：**<br>
> `Collector.insertBefore( to, clone, event, eventdeep ): Collector`<br>
> 将集合自身作为数据源，插入到目标节点 `to` 之前，返回目标节点的 `Collector` 封装。<br>
> 如果传递克隆实参为真，克隆的节点集会构造一个 `Collector` 实例嵌入原集合和返回集合之间（链栈上多一个中间层）。<br>


### [$.after( node, cons, clone, event, eventdeep ): Node | [Node]](docs/$.after.md)

在 `node` 元素或文本节点的后面插入节点/集。

- `node: Node` 插入参考的目标节点/元素。
- `cons: Node | [Node] | Set | Iterator | Function` 插入的数据源。
- `clone: Boolean` 内容节点是否为克隆方式。可选，默认 `false`。
- `event: Boolean` 内容元素上绑定的事件处理器是否同时克隆。可选，默认 `false`。
- `eventdeep: Boolean` 内容元素的子孙元素上绑定的事件处理器是否同时克隆。可选，默认 `false`。

数据源支持节点、节点集、`Set` 集合、返回节点的迭代器，或是一个返回节点/集的取值回调。回调接口：`function( node ): Node | [Node]`，实参为参考节点 `node`。

不支持HTML源码实时构建元素节点，仅支持现成的节点/元素。克隆参数（`clone`）适用于文本节点和元素，元素为深层克隆。事件克隆参数 `event` 和 `eventdeep` 仅适用于元素。接口返回插入的内容节点/元素（集），它们可能克隆而来。

> **关联：**<br>
> `Collector.insertAfter( to, clone, event, eventdeep ): Collector`<br>
> 将集合自身作为数据源，插入到目标节点 `to` 之后，返回目标节点的 `Collector` 封装。<br>
> 如果传递克隆实参为真，克隆的节点集会构造一个 `Collector` 实例嵌入原集合和返回集合之间（链栈上多一个中间层）。<br>


### [$.prepend( el, cons, clone, event, eventdeep ): Node | [Node]](docs/$.prepend.md)

在 `el` 元素内的前端插入节点/集。

- `el: Element` 插入到的目标容器元素。
- `cons: Node | [Node] | Set | Iterator | Function` 插入的数据源。
- `clone: Boolean` 内容节点是否为克隆方式。可选，默认 `false`。
- `event: Boolean` 内容元素上绑定的事件处理器是否同时克隆。可选，默认 `false`。
- `eventdeep: Boolean` 内容元素的子孙元素上绑定的事件处理器是否同时克隆。可选，默认 `false`。

数据源支持节点、节点集、`Set` 集合、返回节点的迭代器，或是一个返回节点/集的取值回调。回调接口：`function( el ): Node | [Node]`，实参为目标容器元素 `el`。

不支持HTML源码实时构建元素节点，仅支持现成的节点/元素。克隆参数（`clone`）适用于文本节点和元素，元素为深层克隆。事件克隆参数 `event` 和 `eventdeep` 仅适用于元素。接口返回插入的内容节点/元素（集），它们可能克隆而来。

> **关联：**<br>
> `Collector.prependTo( to, clone, event, eventdeep ): Collector`<br>
> 将集合自身作为数据源，插入目标元素 `to` 内的前端，返回目标元素的 `Collector` 封装。<br>
> 如果传递克隆实参为真，克隆的节点集会构造一个 `Collector` 实例嵌入原集合和返回集合之间（链栈上多一个中间层）。<br>


### [$.append( el, cons, clone, event, eventdeep ): Node | [Node]](docs/$.append.md)

在 `el` 元素内的末尾插入节点/集。

- `el: Element` 插入到的目标容器元素。
- `cons: Node | [Node] | Set | Iterator | Function` 插入的数据源。
- `clone: Boolean` 内容节点是否为克隆方式。可选，默认 `false`。
- `event: Boolean` 内容元素上绑定的事件处理器是否同时克隆。可选，默认 `false`。
- `eventdeep: Boolean` 内容元素的子孙元素上绑定的事件处理器是否同时克隆。可选，默认 `false`。

数据源支持节点、节点集、`Set` 集合、返回节点的迭代器，或是一个返回节点/集的取值回调。回调接口：`function( el ): Node | [Node]`，实参为目标容器元素 `el`。

不支持HTML源码实时构建元素节点，仅支持现成的节点/元素。克隆参数（`clone`）适用于文本节点和元素，元素为深层克隆。事件克隆参数 `event` 和 `eventdeep` 仅适用于元素。接口返回插入的内容节点/元素（集），它们可能克隆而来。

> **关联：**<br>
> `Collector.appendTo( to, clone, event, eventdeep ): Collector`<br>
> 将集合自身作为数据源，添加到目标元素 `to` 内的末尾，返回目标元素的 `Collector` 封装。<br>
> 如果传递克隆实参为真，克隆的节点集会构造一个 `Collector` 实例嵌入原集合和返回集合之间（链栈上多一个中间层）。<br>


### [$.replace( node, cons, clone, event, eventdeep ): Node | [Node]](docs/$.replace.md)

用数据源节点/集替换 `node` 元素或文本节点。

- `node: Node` 被替换的目标节点/元素。
- `cons: Node | [Node] | Set | Iterator | Function` 替换用的内容数据。
- `clone: Boolean` 内容节点是否为克隆方式。可选，默认 `false`。
- `event: Boolean` 内容元素上绑定的事件处理器是否同时克隆。可选，默认 `false`。
- `eventdeep: Boolean` 内容元素的子孙元素上绑定的事件处理器是否同时克隆。可选，默认 `false`。

数据源支持节点、节点集、`Set` 集合、返回节点的迭代器，或是一个返回节点/集的取值回调。回调接口：`function( node ): Node | [Node]`，实参为替换的目标节点 `node`。

不支持HTML源码实时构建元素节点，仅支持现成的节点/元素。克隆参数（`clone`）适用于文本节点和元素，元素为深层克隆。事件克隆参数 `event` 和 `eventdeep` 仅适用于元素。接口返回替换成的内容节点/元素（集），它们可能克隆而来。

> **关联：**<br>
> `Collector.replaceAll( node, clone, event, eventdeep ): Collector`<br>
> 将集合自身作为数据源，替换目标节点 `node`，返回目标节点的 `Collector` 封装。<br>
> 如果传递克隆实参为真，克隆的节点集会构造一个 `Collector` 实例嵌入原集合和返回集合之间（链栈上多一个中间层）。<br>


### [$.fill( el, cons, clone, event, eventdeep ): Node | [Node]](docs/$.fill.md)

在 `el` 元素内填充节点/集，会清除原来的内容。

- `el: Element` 填充到的目标容器元素。
- `cons: Node | [Node] | Set | Iterator | Function` 填充的数据源。
- `clone: Boolean` 内容节点是否为克隆方式。可选，默认 `false`。
- `event: Boolean` 内容元素上绑定的事件处理器是否同时克隆。可选，默认 `false`。
- `eventdeep: Boolean` 内容元素的子孙元素上绑定的事件处理器是否同时克隆。可选，默认 `false`。

数据源支持节点、节点集、`Set` 集合、返回节点的迭代器，或是一个返回节点/集的取值回调。回调接口：`function( el ): Node | [Node]`，实参为填充到的容器元素 `el`。

不支持HTML源码实时构建元素节点，仅支持现成的节点/元素。克隆参数（`clone`）适用于文本节点和元素，元素为深层克隆。事件克隆参数 `event` 和 `eventdeep` 仅适用于元素。接口返回填充的内容节点/元素（集），它们可能克隆而来。

> **关联：**<br>
> `Collector.fillTo( el, clone, event, eventdeep ): Collector`<br>
> 将集合自身作为数据源，填充到目标元素 `el` 内（清除原有），返回目标元素的 `Collector` 封装。<br>
> 如果传递克隆实参为真，克隆的节点集会构造一个 `Collector` 实例嵌入原集合和返回集合之间（链栈上多一个中间层）。<br>


### [$.wrap( node, box, clone, event, eventdeep ): Element](docs/$.wrap.md)

在 `node` 之外包裹一个容器元素。

- `node: Node | String` 节点或文本内容。
- `box: HTML | Element | Function` 包裹目标内容的容器元素、HTML结构源码或取值回调。
- `clone: Boolean` 是否克隆容器元素。可选，默认 `false`。
- `event: Boolean` 是否克隆容器元素上绑定的事件处理器。可选，默认 `false`。
- `eventdeep: Boolean` 是否克隆容器元素子孙元素上绑定的事件处理器。可选，默认 `false`。

如果 `node` 是DOM中的一个节点，`box` 容器元素会替换 `node` 原来的位置。被包裹的内容也可以是文本，它们会被自动创建为文本节点。

包裹容器可以是一个现有的元素、一个HTML字符串（将被创建为元素）、或一个返回包裹元素或HTML字符串的函数。如果包裹容器是由结构化HTML创建且包含子元素，最终的包裹元素会递进到首个最深层子元素，而初始的包裹容器（根）则会替换 `node` 节点原来的位置。返回包裹内容的（根）容器元素。


### [$.wrapInner( el, box, clone, event, eventdeep ): Element](docs/$.wrapInner.md)

在 `el` 的内容之外包裹一个容器元素，包裹容器会成为 `el` 唯一的子元素。

- `el: Element` 内容被包含的元素。
- `box: HTML | Element | Function` 包裹目标内容的容器元素、或HTML结构字符串、或一个取值回调。
- `clone: Boolean` 是否克隆容器元素。可选，默认 `false`。
- `event: Boolean` 是否克隆容器元素上绑定的事件处理器。可选，默认 `false`。
- `eventdeep: Boolean` 是否克隆容器元素子孙元素上绑定的事件处理器。可选，默认 `false`。

包裹容器可以是一个现有的元素、一个HTML字符串（将被创建为元素）、或一个返回包裹元素或HTML字符串的函数。如果包裹容器是由结构化HTML创建且包含子元素，最终的包裹元素会递进到首个最深层子元素，而初始的包裹容器（根）则会成为 `el` 唯一的子元素。返回包裹内容的（根）容器元素。


### [$.unwrap( el, clean ): [Node]](docs/$.unwrap.md)

将 `el` 元素的内容解包裹提升到 `el` 原来的位置。

- `el: Element` 内容被解包的容器元素。
- `clean: Boolean` 是否清理返回集（清除空白文本节点和注释节点）。

元素所包含的全部内容（包括注释节点）会一并提升。可以传递 `clean` 为真来清除返回集内的注释节点和纯空白的文本节点。

> **注：**
> 传递 `clean` 为真仅是对返回集进行清理（友好），没有更多的含义。


### [$.remove( node ): Node](docs/$.remove.md)

将节点（通常为元素或文本节点）移出DOM文档树。

- `node: Node` 将被移出的节点。

返回被移出DOM文档树的节点。**注**：注释节点也适用。


### [$.empty( el, clean ): [Node] | Value](docs/$.empty.md)

清空 `el` 元素的内容，包括元素、文本节点和注释节点等全部内容。

- `el: Element` 内容将被清除的容器元素。
- `clean: Boolean` 是否清理返回集（清除空白文本节点和注释节点）。

返回被清空的子节点集（全部内容）。仅对元素类型有效，传递其它非法实参返回该实参本身。

> **注：**
> 传递 `clean` 为真仅是对返回集进行清理，不会影响 `empty` 清空全部内容的逻辑。


### [$.normalize( el, depth? ): Element](docs/$.normalize.md)

对元素 `el` 的内容执行规范化（normalize），即合并内容中的相邻文本节点。

- `el: Element` 执行操作的容器元素。

这是元素原生同名接口的简单封装，但提供了可选的定制事件通知机制。


### [$.clone( node, event, deep?, eventdeep? ): Node](docs/$.clone.md)

对 `node` 节点/元素进行克隆。

- `node: Node` 待克隆的目标节点或元素。
- `event: Boolean` 是否同时克隆元素上绑定的事件处理器。可选，默认 `false`。
- `deep?: Boolean` 是否深层克隆子孙节点/元素。可选，默认 `true`。
- `eventdeep?: Boolean` 是否同时克隆子孙元素上绑定的事件处理器。需要在 `deep` 为 `true` 时才有意义。可选，默认 `false`。

三个布尔值参数 `event`、`deep` 和 `eventdeep` 仅适用于元素。返回新克隆的节点/元素。


### [$.scrollTop( el, val, inc ): Number|void](docs/$.scrollTop.md)

获取或设置 `el` 元素（文档或窗口）的垂直滚动条位置。

- `el: Document | Window | Element` 包含滚动条的文档、窗口或元素。
- `val: Number` 滚动到的目标位置，从顶部算起，单位为像素。
- `inc: Boolean` 是否为增量模式。


### [$.scrollLeft( el, val, inc ): Number|void](docs/$.scrollLeft.md)

获取或设置 `el` 元素（文档或窗口）的水平滚动条位置。

- `el: Document | Window | Element` 包含滚动条的文档、窗口或元素。
- `val: Number` 滚动到的目标位置，从左侧端算起，单位为像素。
- `inc: Boolean` 是否为增量模式。


## 元素属性

### [$.addClass( el, names ): Element](docs/$.addClass.md)

在 `el` 元素上添加类名，多个类名可用空格分隔。

- `el: Element` 操作的目标元素。
- `names: String | Function` 类名称或一个返回类名称的取值回调。

获取类名称的取值回调函数接口：`function( [name] ): String`，实参为当前已有类名数组。返回操作目标自身（`el`）。


### [$.removeClass( el, names ): Element](docs/$.removeClass.md)

移除 `el` 元素上的类名，多个类名可用空格分隔，未指定名称（`undefined | null`）时移除全部类名。

- `el: Element` 操作的目标元素。
- `names: String | Function` 类名称或一个返回类名称的取值回调。

支持回调函数获取需要移除的类名，接口：`function( [name] ): String`，实参为当前已有类名数组。如果元素上已无类名，`class` 特性（Attribute）本身会被删除。


### [$.toggleClass( el, val, force ): Element](docs/$.toggleClass.md)

对 `el` 元素上的类名进行切换（有则删除无则添加）。

- `el: Element` 操作的目标元素。
- `val: String | Function` 欲切换的类名称（序列）或取值回调。无值时指针对整个类名特性切换。
- `force: Boolean` 目标名称的类名直接添加（`true`）或移除（`false`）。

支持空格分隔的多个类名，支持回调函数获取类名，接口：`function( [name] ): String`，实参为当前已有类名数组。


### [$.hasClass( el, names ): Boolean](docs/$.hasClass.md)

检查 `el` 元素是否包含目标类名。返回一个布尔值。

- `el: Element` 待检查的目标元素。
- `names: String` 待测试的目标类名（序列）。

类名实参 `names` 支持空格分隔的多个类名指定，其间关系为 `And` 的逻辑，即：`AA BB` 与 `BB AA` 效果相同。


### $.classAll( el ): [String]

获取元素 `el` 的类名集。注意不是 `$.attr(el, 'class')` 的结果，而是一个名称数组。非元素实参返回一个 `null`。本接口也有**集合版**，返回集合内各元素对应的类名数组（二维）。

- `el: Element` 取值的目标元素。

如果元素上没有任何 `class` 的定义，返回一个空数组。


### [$.attribute( el, names, value ): Value | Object | Element](docs/$.attribute.md)

获取或修改 `el` 元素的特性（Attribute）值。**注**：`Attribute` 这里译为特性，后面的 `Property` 译为属性。

- `el: Element` 操作的目标元素。
- `names: String | [String] | Object | Map` 名称序列或**名/值**对配置对象。字符串名称也支持空格分隔的多个名称，但若为名称数组，则名称为具体名。
- `value: Value | [Value] | Function | null` 设置的特性值（集）或返回单个值的取值回调。传递 `null` 值会删除目标特性。

当 `value` 未定义且 `names` 为字符串或字符串数组时为获取特性值。当 `value` 传递值或 `names` 为 **名:值** 对配置对象时为设置特性值。

- 取值时：`names` 为单个名称或空格分隔的多个名称或单名称数组。返回一个 **名:值** 对象，其中名称保持原始传入形式。
- 设置时：`names` 为字符串名称或名称数组且 `value` 有值，或者为 `名/值对` 配置对象（`Object | Map`）。所有情况下 `value` 都可以是一个取值函数。

支持两个特别的特性名 `html` 和 `text`，分别用于表达元素内的源码和文本，支持 `data-xx` 系名称的简写形式 `-xx`（前置短横线）。

设置时名称对应的值如果是 `undefined`，会简单忽略该属性的设置（而不是设置为字符串undefined）。返回操作的目标元素自身（即实参 `el`）。


### $.attr( el, name, value ): Value | Element

获取或设置 `el` 元素的特性值。

- `el: Element` 目标元素
- `name: String` 特性名（单个）。支持 `data-x` 系名称简写，支持 `text` 和 `html` 两个特殊名称。
- `value: Value | Function | null` 要设置的特性值或取值回调，传递 `null` 会移除目标特性。

这是 `.attribute()` 的轻量版，但比元素原生 `.getAttribute()` 和 `.setAttribute()` 功能更强。

设置时返回操作的目标元素自身（即实参 `el`）。


### $.xattr( el, name ): Value | Object

剪取元素的特性。获取特性值的同时会移除该特性。

- `el: Element` 目标元素
- `name: String` 特性名，支持空格分隔多个名称。支持 `data-x` 系名称简写。**注**：不支持 `text` 和 `html` 名称。

如果名称为多个，返回一个值集，否则返回一个单值。

> **集合版：**<br>
> 声明：`$( name: String|[String]): Collector`。<br>
> 名称支持数组形式，与集合元素一一对应。名称本身（可能为数组成员）支持空格分隔的名称序列。<br>


### [$.property( el, names, value ): Object | Element](docs/$.property.md)

获取或修改 `el` 元素的属性（Property）值。

- `el: Element` 操作的目标元素。
- `names: String | [String] | Object | Map` 名称序列或**名/值**对配置对象。名称支持 `data-x` 系简写形式和两个个特殊名称：`text`、`html`。
- `value: Value | [Value] | Function | null` 设置的属性值（集）或返回单个值的取值回调。

当 `value` 未定义且 `names` 为字符串或字符串数组时为获取属性值。当 `value` 传递值或 `names` 为 **名:值** 对配置对象时为设置属性值。

- 取值时：`names` 为单个名称或空格分隔的多个名称或单名称数组。返回一个 **名:值** 对象，其中名称保持原始传入形式。
- 设置时：`names` 为字符串名称或名称数组且 `value` 有值，或者为 `名/值对` 配置对象（`Object | Map`），所有情况下 `value` 都可以是一个取值函数。

与 `$.attribute()` 相同，支持两个特别的属性名 `html` 和 `text`，分别用于表达元素内的源码和文本，支持 `data-xx` 系名称的简写形式 `-xx`（前置短横线）。

> **注：**<br>
> 部分常见的需要转换的属性名会自动转换（如：`class` => `clasName`），因此两种形式皆可使用。但并不是所有的名称都会自动转换。<br>
> 特殊的属性名除了 `html, text` 外，`selected` 还适用选单 `<select>` 元素，返回选取的 `<option>` 子元素（集）。另外还有一个 `checkedNode` 属性，返回当前选取的按钮控件，适用单选和复选框。<br>
> 设置时名称对应的值如果是 `undefined`，会简单忽略该属性的设置。<br>


### $.prop( el, name, value ): Value | Element

获取或设置 `el` 元素的属性值。

- `el: Element` 目标元素
- `name: String` 属性名（单个）。支持 `data-x` 系名称简写，同上支持 `text`、`html` 和 `selected` 三个特殊名称。
- `value: Value | Function | null` 要设置的属性值或取值回调，传递 `null` 通常会让目标属性恢复默认状态。

这是 `.property()` 的轻量版，效率稍高一些。


### [$.removeAttr( el, names ): Element](docs/$.removeAttr.md)

删除 `el` 元素上一个或多个特性（Attribute）。

- `el: Element` 操作的目标元素。
- `names: String | Function` 要删除的目标特性名（序列）或取值回调。

这实际上是 `$.attr(el, name, null)` 调用的简化版，效率稍高一些。支持 `data-` 系特性名的简写形式和空格分隔的多名称序列。取值回调接口：`function( el ): String`。

返回被操作的目标元素自身（即实参 `el`）。

> **注：**
> 不支持特殊的特性名 `html` 和 `text`。


### $.toggleAttr( el, name, val, i ): Element

在 `el` 元素上切换 `name` 特性的值。支持两个特殊特性名 `text` 和 `html` 分别表示操作元素的内部文本（`textContent`）和源码（`innerHTML`）。

- `el: Element` 目标元素。
- `name: String` 目标特性，仅支持单个名称。
- `val: Value | [Value] | Function | null` 切换对比值（对）或取值回调，可选。
- `i: Boolean` 相等比较是否忽略大小写。

如果 `val` 为简单值（非数组和非 `null`），目标特性值为有无切换（相等则为空，为空则设置）。`val` 可以是一个二元数组，其 `val[0]` 成员用于对比，`val[1]` 用于候选：如果原值与 `val[0]` 相等则设置为 `val[1]`，否则设置为 `val[0]` 自身。如果 `val` 未定义或为 `null`，则为特性名自身的有无切换。

`val` 也可以是一个取值回调，接口：`function( old, el ): Value | [Value] | null`，返回值用于切换对比。

返回被操作的目标元素自身（即实参 `el`）。

> **集合版：**<br>
> 对每一个元素执行对比/设置操作，因为单元素版的值本身可以为数组，不支持元素成员与值数组单元的一一对应模式。


### [$.val( el, value ): Value | [Value] | Element](docs/$.val.md)

表单控件的取值或状态设置。

- `el: Element` 操作的表单控件元素。
- `value: Value | [Value] | Function` 设置的值或值集，或返回设置值（集）的回调。

部分控件（如 `input:radio`, `input:checkbox`, `<section>`）的设置为选中或取消选中，部分控件（如 `input:text`, `input:password`, `<textarea>`）则为设置 `value` 值本身。对于多选控件（如 `<select multiple>`），`value` 可以传递为一个值数组，用于同时选定多个条目。

取值和设置都会依循严格的表单提交（`submit`）逻辑：

- 未选中的的控件（如单个复选框）不会被提交，因此取值时返回 `null`。
- `disabled` 的控件值也不会被提交，取值时也返回 `null`，设置时被忽略。
- 无名称（`name` 属性）定义的控件不会被提交，因此取值时返回 `undefined`，设置时被忽略。

> **注：**<br>
> 对于选取类控件，若设置为 `null` 会清除全部选取（包括 `disabled` 状态的）。<br>
> 该接口应当仅用于表单内控件，如需无条件获取或设置控件的 `value` 特性（或属性），请使用 `.attr()/.prop()` 接口。<br>



## 文本操作

### [$.html( el, code, where?, sep? ): String | [Node]](docs/$.html.md)

提取或设置 `el` 元素的HTML源码，如果传递 `el` 为字符串，则为源码转换（如 `<` 到 `&lt;`）。

- `el: String | Element` 待操作的目标元素，或待转换的文本。
- `code: String | [String] | Node | [Node] | Function | .values` 待设置的HTML源码或节点数据源，或返回源码/节点的取值回调。可选，未定义时为取值。
- `where?: String | Number` 源码插入的位置或代码。可选，默认为 `fill`（值 `0`）。
- `sep?: String` 数据源为数组时各单元的连接符。可选，默认为一个空格。

设置源码时的取值回调接口：`function( el ): String | [String] | Node | [Node] | .values`。

**设置行为：**

- 数据源为字符串时，会自动移除脚本类元素 `<script>`、`<style>`、`<link>` 和元素上的脚本类特性：`onerror`, `onload`, `onabort`。
- 源数据为文本节点或元素时，取其 `textContent` 或 `outerHTML` 值作为赋值源码（可视为一种简单的克隆）。
- 数据源也可是字符串/节点/元素的数组或集合（需支持 `.values` 接口），取值成员之间以指定的分隔符串连（默认空格）。

与 jQuery 中同名接口不同，这里可以指定内容插入的位置（相对于 `el` 元素）：`before|after|prepend|append|fill|replace` 等，并且因为只是**文本逻辑**，原节点不受影响。

返回新创建的节点集（数组）或转换后的HTML源码。


### [$.text( el, code, where?, sep? ): String | Node](docs/$.text.md)

提取或设置 `el` 元素的文本内容，如果传递 `el` 为字符串，则为将源码解码为文本（如 `&lt;` 到 `<`）。

- `el: String | Element` 待操作的目标元素，或待解码的HTML源码。
- `code: String | [String] | Node | [Node] | Function | .values` 待设置的内容文本或节点数据源，或返回文本/节点的取值回调。可选，未定义时为取值。
- `where?: String | Number` 内容文本插入的位置或代码。可选，默认为 `fill`（值 `0`）。
- `sep?: String` 数据源为数组时各单元的连接符。可选，默认为一个空格。

设置内容时的取值回调接口：`function( el ): String | [String] | Node | [Node] | .values`。

**设置行为：**

- 字符串以文本方式插入，HTML源码视为文本（原样展示在页面中）。
- 源数据为文本节点或元素时，提取其文本（`textContent`）内容。**注**：与 `.html()` 接口稍有不同。
- 数据源也可是字符串/节点/元素的数组或集合（支持 `.values`），集合成员间以目标连接符串连。

与 `.html()` 接口类似，同样支持在指定的位置（`before|after|begin|end|prepend|append|fill|replace`）插入文本（**注**：实际上已被创建为一个文本节点）。

返回新创建的文本节点或源码解码后的文本。



## CSS 相关

### [$.css( el, name, val ): String | Object | Element](docs/$.css.md)

获取或设置 `el` 元素的样式。

- `el: Element` 操作的目标元素。
- `name: String` 待取值的样式名（单个），或设置时的目标样式名（单个）。
- `val: Value | Function` 设置的样式值或取值回调，空串表示删除目标样式。可选。

获取时为元素计算后的样式值，设置时为设置元素的内联样式（`style` 特性）。取值回调接口：`function( oldval, el ): Value`。

设置时返回被操作的目标元素自身（即实参 `el`）。


### $.cssGets( el, name ): Object

获取 `el` 元素的样式集。

- `el: Element` 目标元素。
- `name: String` 待取值的样式名序列（空格分隔）。

这是 `.css()` 取值的增强版。无论 `name` 是否为多个名称，始终会返回一个 **名:值** 对对象。


### $.cssSets( el, name, val ): Element

设置 `el` 元素的样式集。

- `el: Element` 操作的目标元素。
- `name: String | Object | Map | null` 空格分隔的样式名序列或 **名:值** 对配置对象。
- `val: Value | [Value] | Function` 设置的样式值（集）或取值回调，空串表示删除目标样式。

这是 `.css()` 设置的增强版，如果 `name` 包含多个样式名，`val` 可以是一个数组，分别对应到不同的样式。传递 `name` 为 `null` 会删除全部样式（`style` 特性本身）。

`name` 可以是一个名值对对象或Map实例，值依然可以是一个取值回调。取值回调接口：`function( oldval, el ): Value`。

返回被操作的目标元素自身（即实参 `el`）。


### [$.offset( el, pair ): Object | Element](docs/$.offset.md)

获取或设置 `el` 元素相对于文档的位置偏移。

- `el: Element` 操作的目标元素。
- `pair: Object | [x, y] | Function | null` 设置的位置配置或取值回调。

偏移定义采用一个包含 `top` 和 `left` 键名的对象（如 `{top:200, left:10}`），位置计算不包含元素的外边距（`margin`），但包含边框。获取的值可能不是一个整数。

设置元素偏移时，元素的 `position` 值不能是 `static`，否则会没有效果。`pair` 也可以是一个取值回调，接口：`function( curVal ): Object`。传递 `pair` 为 `null` 会清除偏移设置并返回之前的偏移值。

设置时返回被目标元素自身（即实参 `el`）。


### [$.position( el, margin ): Object](docs/$.position.md)

获取 `el` 元素相对于上层定位元素边框内左上角的位置（不含外边距）。

- `el: Element` 取值的目标元素。
- `margin: Boolean` 是否包含外边距（从外边距的右上角算起）。

返回一个包含 `top` 和 `left` 键名及其值的对象，值为浮点数（单位像素）。

> **注：**<br>
> 上层定位元素是指上层容器元素的样式中 `position` 值非默认的 `static`。


### [$.height( el, val, inc ): Number | Element](docs/$.height.md)

获取或设置 `el` 元素的内容高度（与 `box-sizing` 无关）。

- `el: Element` 操作的目标元素。
- `val: String | Number | Function` 要设置的高度值，数值的单位为像素，可以是一个取值回调。
- `inc: Boolean` 是否为增量模式。

设置的字符串值可以包含任意单位，获取的值为纯数值（像素），以方便直接用于计算。仅适用于元素。

如果 `val` 是取值回调，接口为：`function( curr-height ): String | Number`，实参为当前的高度值，`this` 为当前元素。

> **注：**<br>
> 与jQuery稍有不同，传递 `val` 为 `null` 会删除高度样式，而jQuery中只是忽略。

**背景知识：**

- `box-sizing` 值为 `content-box` 时： **CSS:height** = 内容高度（默认）
- `box-sizing` 值为 `border-box` 时：**CSS:height** = 内容高度 + padding宽度 + border宽度


### [$.width( el, val, inc ): Number | Element](docs/$.width.md)

获取或设置 `el` 元素的内容宽度（与 `box-sizing` 无关）。

- `el: Element` 操作的目标元素。
- `val: String | Number | Function` 要设置的宽度值，数值的单位为像素，可以是一个取值回调。
- `inc: Boolean` 是否为增量模式。

设置的字符串值可以包含任意单位，获取的值为纯数值（像素），以方便直接用于计算。仅适用于元素。

如果 `val` 是取值回调，接口为：`function( curr-width ): String | Number`，实参为当前的宽度值，`this` 为当前元素。


### [$.innerHeight( el ): Number](docs/$.innerHeight.md)

获取 `el` 元素的内部高度（包含 `padding` 部分但不包含 `border` 部分）。

- `el: Element` 取值的目标元素。

**注**：该接口不包含设置目标高度的功能，如果需要请使用 `$.height` 接口。


### [$.innerWidth( el ): Number](docs/$.innerWidth.md)

获取 `el` 元素的内部宽度（包含 `padding` 部分但不包含 `border` 部分）。

- `el: Element` 取值的目标元素。

**注**：该接口不包含设置目标宽度的功能，如果需要请使用 `$.width` 接口。


### [$.outerHeight( el, margin? ): Number](docs/$.outerHeight.md)

获取 `el` 元素的外围高度（包含 `border` 部分，可选的包含 `margin` 部分）。

- `el: Element` 取值的目标元素。
- `margin?: Boolean` 是否包含 `margin` 部分。

**注**：该接口不包含设置目标高度的功能，如果需要请使用 `$.height` 接口。


### [$.outerWidth( el, margin? ): Number](docs/$.outerWidth.md)

获取 `el` 元素的外围宽度（包含 `border` 部分，可选的包含 `margin` 部分）。

- `el: Element` 取值的目标元素。
- `margin?: Boolean` 是否包含 `margin` 部分。

**注**：该接口不包含设置目标宽度的功能，如果需要请使用 `$.width` 接口。


## 事件接口

### [$.on( el, evn, slr, handle, cap? ): this](docs/$.on.md)

在 `el` 元素（文档或窗口）上绑定 `evn` 事件的处理器 `handle`。

- `el: Element | Document | Window` 绑定到的目标元素、文档或窗口。
- `evn: String | Object` 目标事件名（序列）或 {事件名: 处理器} 配置对象。
- `slr: String` 委托绑定的选择器。如果不是委托方式，可传递任意假值。
- `handle: Function | EventListener | false | null` 事件处理函数或实现了 `EventListener` 接口的对象或2个特殊值。
- `cap: Boolean` 是否为捕获，可选。默认会智能处理：无 `slr` 时为 false，有 `slr` 时不可冒泡的事件为 true。

实参 `evn` 支持空格分隔的多个事件名同时指定。实参 `slr` 为非空字符串时为委托绑定（`delegate`），事件冒泡到匹配该选择器的元素时触发调用。`handle` 支持两个特殊值，它们分别对应两个预定义的处理器：

- `false` 表示「**停止事件默认行为**」的处理器。
- `null` 表示「**停止事件默认行为并停止事件冒泡**」的处理器。

在同一个元素上，相同 `事件名/选择器/处理器/捕获方式` 不能多次绑定（仅首次有效），这与DOM事件处理的默认行为相同。`handle` 处理器的接口：`function( ev, elo ): Value | false`，其中：`ev` 为原生事件对象，`elo` 为事件相关联元素的对象，内容如下：

```js
elo: {
    target: Element     // 事件起源元素（event.target）
    current: Element    // 触发处理器调用的元素（event.currentTarget 或 slr 匹配的元素）
    delegate: Element   // 绑定委托的元素（event.currentTarget），仅在委托模式下有值。
    selector: String    // 委托匹配选择器，仅在委托模式下有值。
}
```

> **注：**<br>
> 实现 `EventListener` 接口是指对象中包含 `.handleEvent()` 方法，其中的 `this` 为该对象自身。函数处理器内的 `this` 没有特别含义（并不指向 `elo.current`）。<br>
> 委托选择器 `slr` 并不包含绑定事件元素自身的匹配，仅限于测试内部的子孙元素。这在限定匹配目标仅为内部元素时很有用（选择器为 `*`）。<br>
> 作为特例，支持 `slr` 前置 `~` 字符表示选择器仅测试事件起点元素（`event.target`），此时可以匹配委托元素自身（如果它就是 `event.target` 的话）。单独的一个 `~` 表示起点必须是委托元素。<br>


### [$.one( el, evn, slr, handle, cap? ): this](docs/$.one.md)

在 `el` 上绑定一个单次执行的处理器（执行后自动解绑）。各个参数的含义与 `$.on()` 接口相同。

> **注**：<br>
> 在事件触发（然后自动解绑）之前，可用 `$.off()` 主动移除该绑定。


### [$.off( el, evn, slr, handle, cap? ): this](docs/$.off.md)

移除 `el` 上绑定的事件处理器。可选地，可以传递 `evn`、`slr`、`handle` 限定移除需要匹配的条件（`===` 比较）。

- `el: Element | Document | Window` 移除绑定的目标元素、文档或窗口。
- `evn: String | Object` 目标事件名（序列）或 {事件名: 处理器} 配置对象限定。可选。
- `slr: String` 委托绑定时的选择器限定。明确传递 `null` 表示仅匹配非委托的绑定，其它假值则类似 `undefined`（不区分是否委托），可选。
- `handle: Function | EventListener | false | null` 事件处理器匹配限定。可选。
- `cap: Boolean` 绑定时是否明确为捕获，可选。如果绑定时未指定，此时也当无值。

只能移除用 `.on()` 和 `.one()` 接口绑定的事件处理器。如果不传入任何匹配条件，会移除 `el` 上绑定的全部事件处理器。


### [$.trigger( el, evn, extra?, bubble?, cancelable? ): this](docs/$.trigger.md)

手动激发 `el` 上的 `evn` 事件。

- `el: Element | Document | Window` 激发事件的目标元素、文档或窗口对象。
- `evn: String | CustomEvent` 激发的事件名（单个）、或一个已经构建好的自定义事件对象。
- `extra?: Value` 激发事件附带的额外数据，它们会存放在事件对象的 `detail` 属性上。
- `bubble?: Boolean` 激发的事件是否可以冒泡。可选，默认 `false`（不冒泡）。
- `cancelable?: Boolean` 激发的事件是否可以取消（调用 `.preventDefault()`）。可选，默认 `true`（可以取消）。

> **注：**<br>
> 元素上的普通方法（如 `submit`, `load`）也可以激发，但需要预先绑定同名的自定义事件处理器。处理器内部可以调用 `ev.preventDefault()` 或返回 `false` 阻断该方法的调用。<br>
> 原生事件激发也可以携带参数，如：`trigger(box, scroll, [x, y])`，激发滚动条滚动到指定的位置（实际上只是调用了 `box.scroll(x, y)` 并触发 `scroll` 事件）。<br>


## 原生事件调用

在浏览器的 DOM 元素中，有 `10` 个事件可以在元素上直接调用（`click, blur, focus, select, load, play, pause, scroll, reset, submit`），其中除了 `load()` 和 `submit()` 外，其它调用都会在元素上触发一个同名的事件。如果你愿意，这些方法可以直接在元素上调用，但这里也把它们作为基本接口纳入：

- `$.click( el ): Element`: 模拟用户对元素的点击。
- `$.blur( el ): Element`: 让元素失去焦点。
- `$.focus( el ): Element`: 让元素获得焦点。
- `$.select( el ): Element`: 对于可输入文本的控件，让文本被选中。
- `$.load( el ): Element`: 载入元素引用的媒体文件，主要适用 `<video>` 和 `<audio>` 元素。
- `$.play( el ): Element`: 媒体继续播放，适用元素同上。
- `$.pause( el ): Element`: 媒体播放暂停，适用元素同上。
- `$.scroll( el, pair ): Object|Element`: 获取或设置元素的滚动条位置，`pair` 支持 `{top, left}` 格式对象，也可以是一个 `[水平, 垂直]` 距离的二元数组。
- `$.reset( el ): Element`: 表单重置。
- `$.submit( el ): Element`: 提交表单。

对于单元素版，实现上就是在元素上简单的调用而已。对于集合版，遵循通常一致的逻辑：对集合内每一个元素分别调用。

如果不是为了取值，返回目标元素自身（即实参 `el`）。


## 集合专用

### .slice( beg, end ): Collector

集合切片，覆盖继承于数组的同名方法。

- `beg: Number` 切片位置的起始下标。
- `end: Number` 切片位置的终点下标（不含终点位置的成员）。

与父类 `Array.slice()` 的差异就是对切片返回的子集进行了封装，支持对 `Collector` 实例链栈的操作（如：`.end()` 获取前一个集合）。


### .concat( ...rest ): Collector

集合连接，覆盖继承于数组的同名方法。

- `rest: Value | [Value]` 不定数量的实参，支持简单值和值数组。

与父类 `Array.concat()` 的差异就是对连接返回的新数组进行了封装，支持对 `Collector` 实例链栈的操作。


### .map( proc ): Collector

针对集合内成员逐一调用处理函数，返回处理函数的返回值的集合。

- `proc: Function` 成员处理函数，接口：`function( val, index, this ): Value`。

> **注意：**
> 回调返回的 `null` 和 `undefined` 值会被忽略（不进入返回集内）。


### [.sort( comp? ): Collector](docs/$().sort.md)

集合内成员排序，覆盖继承于数组的同名方法。

- `comp?: Function | null` 集合内成员排序比较的回调函数。可选，默认采用DOM节点排序规则。

集合内成员可以是元素也可以是普通的值。主要用于元素，此时无需传递 `comp` 排序函数。传递 `comp` 为 `null` 可重置为普通的排序规则（浏览器环境）。


### .reverse(): Collector

集合成员反转，覆盖继承于数组的同名方法。

与父类 `Array.reverse()` 原生方法不同，这里不会修改集合自身，而是返回一个新的成员已反转的集合，支持链栈操作。


### .flat( deep? ): Collector

集合成员扁平化。包括可能的元素去重排序能力。

- `deep: Number | true` 深度值或节点去重排序指示。可选，默认 `1`。传递 `true` 指示节点去重排序（扁平化深度为 `1`）。

当把 `deep` 作为深度值时，仅在数组支持 `.flat()` 方法的环境下大于 `1` 的值才有效。


### [.wrapAll( box, clone, event, eventdeep ): Collector](docs/$().wrapAll.md)

用一个容器 `box` 包裹集合里的节点数据。

- `box: HTML | Element | Function` 包容集合成员的容器元素、HTML结构串、或返回容器元素或HTML的取值回调。
- `clone: boolean` 容器元素是否克隆，仅限于直接传递的元素实参（不针对取值回调返回的元素）。可选，默认 `false`。
- `event: boolean` 是否同时克隆容器元素上绑定的事件处理器。可选，默认 `false`。
- `eventdeep: boolean` 是否同时克隆容器元素子孙元素上绑定的事件处理器。可选，默认 `false`。

被包裹的节点/元素会脱离DOM原位置，容器元素会替换集合中首个节点在DOM中的位置。

如果容器元素是用HTML串构造出来的且包含子元素，则最终实际包裹数据的容器元素会递进到首个最深层子元素。
如果包裹容器是一个已经存在的元素，该元素会被直接使用，且包裹内容时使用的是前插（`.prepend()`）方式（原内容会被保留）。


### .first( slr ): Value | null

获取集合内首个匹配的成员，无实参时返回集合内首个成员。

- `slr: String | Element | Function` 用于匹配测试的选择器、元素或测试函数。可选。

测试函数接口为：`function( Element ): Boolean`，返回真时为匹配。


### .last( slr ): Value | null

获取集合内逆向首个匹配的成员，无实参时返回集合内最后一个成员。

- `slr: String | Element | Function` 用于匹配测试的选择器、元素或测试函数。可选。

测试函数接口：`function( Element ): Boolean`，返回真时为匹配。


### .item( idx ): Value | [Value] | undefined

获取集合内的某个成员，如果未指定目标位置，返回整个集合的一个数组副本。

- `idx: Number` 目标成员的位置下标，支持负数从末尾算起。

> **注：**
> 兼容字符串数字，但空串不为0值。-1表示末尾最后一个。超出下标范围时返回一个undefined。


### .add( its, unique ): Collector

往当前集合中添加新的成员，返回一个添加了新成员的新 `Collector` 实例。

- `its: String | Element | NodeList | Collector` 待添加元素的选择器或值成员或一个值集合。
- `unique: Boolean` 结果集是否去重排序。仅适用于DOM节点集。

总是会构造一个新的集合返回。如果没有指示去重排序，后期可以通过调用 `.unique(true)` 完成。

> **注：**<br>
> 字符串实参会被视为CSS选择器，因此并不能直接添加字符串成员（作为普通集合时）。


### .addBack( slr, unique ): Collector

在当前集合的基础上添加前一个集合的成员。

- `slr: String | Function` 前一个集合成员的选择器或筛选函数。
- `unique: Boolean` 结果集是否去重排序。仅适用于DOM节点集。

总是会返回一个新的 `Collector` 实例，即便新加入的集合为空。筛选函数接口：`function( v:Value, i:Number, o:Collector ): Boolean`。

与 `.add()` 相同，默认情况下返回集不会自动去重排序，可传递 `unique` 为真或后期调用 `.unique(true)` 实现。


### .end( n? ): Collector

返回集合内 `Collector` 实例链栈上的倒数第 `n` 个集合。

- `n?: Number` 倒数计数的层级数。可选，默认值为 `1`。

值 `0` 表示末端的当前集，传递任意负值返回集合链栈的起始集。



## 实用工具

### [$.embedProxy( getter ): tQuery | Proxy](docs/$.embedProxy.md)

对 `window.$` 嵌入 `get` 代理。

- `getter: Function` 成员方法获取函数，接口：`function( name ): Function`，实参 `name` 即为当前调用的目标方法。

这使得可由外部定义 `$` 成员的调用集覆盖，从而替换 `$` 成员方法的默认行为。如覆盖默认的 `$.hasClass()` 方法：

```js
let hasClassX = function( el, name ) {};
$.embedProxy( fn => fn == 'hasClass' ? hasClassX : null );
```

`getter` 返回的方法应当与目标方法有相同的声明和兼容的功能实现。


### [$.each( obj, handle, thisObj ): obj](docs/$.each.md)

通用的遍历执行工具。返回遍历的对象自身。

- `obj: Array | Object | .entries` 遍历的目标集合，包括 `Collector` 实例。
- `handle: Function` 遍历迭代执行的处理函数。
- `thisObj: Any` 处理函数内的 `this` 绑定目标。

处理函数接口：`function(value, key, obj)`，实参分别为：值，键，迭代对象自身。处理函数返回 `false` 时会中断迭代。


### [$.map( obj, proc, thisObj ): [Value]](docs/$.map.md)

对集合内的成员逐一执行回调函数，回调函数的返回值汇集成一个集合，这个集合就是最终的返回值。

- `obj: Array | Object | .entries` 迭代处理的目标集合，包括 `Collector` 实例。
- `proc: Function` 回调处理器函数，接口：`function( val, key, obj ): Value | [Value]`。
- `thisObj: Any` 回调处理器函数内的 `this` 绑定目标。

> **注意：**
> 回调返回的 `null` 和 `undefined` 值会被忽略（不进入返回集内）。


### $.every( obj, test, thisObj ): Boolean

迭代集合内的每一个成员执行测试函数，如果都返回真则最终结果为真。

- `obj: Array | Object | .entries` 迭代测试的目标集合，支持 `Collector` 实例。
- `test: Function` 回调测试函数，接口：`function( val, key, obj ): Boolean`。
- `thisObj: Any` 回调测试函数内的 `this` 绑定目标。


### $.some( obj, test, thisObj ): Boolean

迭代集合内的每一个成员执行测试函数，如果有一个返回真则最终结果为真。

- `obj: Array | Object | .entries` 迭代测试的目标集合，支持 `Collector` 实例。
- `test: Function` 回调测试函数，接口：`function( val, key, obj ): Boolean`。
- `thisObj: Any` 回调测试函数内的 `this` 绑定目标。


### $.handles( el, evn? ): Object | [Function|EventListener] | undefined

提取元素上绑定事件的原始处理器。如果未指定事件名，则检索全部注册项，返回一个对象：`{evn: [Function|EventListener]}`。如果未绑定任何事件处理器（仅限于 `.on()|.one()` 绑定），返回 `undefined`。

- param  {Element} el 目标元素。
- param  {String} evn 事件名，可选。仅限单个事件名。

这可以让用户查看元素上绑定了哪些处理器，并且也可以方便复用它们。


### [$.Counter( proc, n, step ): Function](docs/$.Counter.md)

封装用户的处理器函数包含一个自动计数器，返回一个封装后的处理器函数，接口：`function( count, ... )`。

- `proc: Function` 被封装的处理器函数，首个实参将变为递增的计数值。
- `n?: Number` 递增计数的起始值。可选，默认值为 `1`。
- `step?: Number` 计数递增的幅度（步进值）。可选，默认值为 `1`。

这会要求用户的处理器函数的首个实参为计数值（自动递增）设计。计数的起始值可以在封装中指定，每次递增的幅度（步进值）也可以由用户指定。

> **注：**<br>
> 主要用在封装单元素版方法的回调函数获得集合版调用时的成员迭代计数。


### $.dataName( attr ): String

转换元素的 `data-` 系特性名为标准的驼峰式名称（不含 `data-` 前缀），即返回的值可以直接用于元素的 `.dataset` 成员取值。

- `attr: String` 待处理的data特性名，可以是完整（如 `data-id-val`）或简写的形式（如 `-id-val`）。

例：
```js
$.dataName('data-id-val');   // 'idVal'
$.dataName('-abc-def-xxx');  // 'abcDefXxx'
```


### $.slr( tag, attr, val?, op? ): String

根据选择器的各个组成部分构造一个完整的 `标签[特性]` 选择器。

- `tag: String` 标签名。
- `attr?: String` 特性名，可选。
- `val?: String|null` 特性值，可选。明确传递 `null` 表示无属性部分。
- `op?: String` 匹配方式（`~ | * ^ $`），可选。

支持 `data-` 系特性名的简写形式。

```js
$.slr( 'p', '-val', 'xyz');         // "p[data-val="xyz"]"
$.slr( 'p', 'title', 'test', '*');  // "p[title*="test"]"
```


### $.tags( code ): String

伪标签源码（由 `[]` 包围）转化为正常的HTML源码。

- `code: String` 待转换的代码。

可用于元素属性值中直观地包含标签源码，这只是一种简单的替换。如果代码中需要包含 `[]` 本身，可以前置 `\` 转义。

```html
<a id="testa" href="#" title="[a] is a \[link\]">Click me</a>
```

```js
let ttl = $.attr( $.get('#testa'), 'title');
// "[a] is a \[link\]"

$.tags( ttl );
// "<a> is a [link]"
```


### $.split( str, sep, cnt, qs ): [String]

拆分字符串，与 `String.split` 不同之处在于当 `sep` 为空串时，原串拆分支持4子节 Unicode 码点。

- `str: String` 待拆分字符串。
- `sep: String` 分隔符字符串。
- `cnt: Number` 拆分出的最多片数。
- `qs: Boolean` 是否支持 **字符串格式内** 忽略（此时 `sep` 仅限于单字符）。

```js
$.split( '😀😁😂🤣😃😄', '' );
// [
//     '😀',
//     '😁',
//     '😂',
//     '🤣',
//     '😃',
//     '😄',
// ]


$.split( '<p data-v="e.g. n>51">a paragraph.</p>', '>', 3 );
// 普通切分：
// [
//     '<p data-v="n',      // 从属性值内切分
//     '51"',
//     'a paragraph.</p'    // 末尾的 > 不包含
// ]

$.split( '<p data-v="e.g. n>51">a paragraph.</p>', '>', 3, true );
// 字符串格式内忽略：
// [
//     '<p data-v="n>51',   // 属性值被引号包围，> 被忽略
//     'a paragraph.</p',
//     ''                   // 末尾的 > 切分出一个空串
// ]
// 注：
// 这种特性很有用，可用于正确切分HTML标签组。
// 但分隔符仅限于单个字符。
```


### Spliter( sep ): Splter

导出字符串切分工具类 `Splter`，支持用单个字符切分时，可以忽略目标字符串内 **字符串格式内** 的分隔符，即：如果目标字符在由单/双引号和撇号（反引号）包围的 **字符串** 内，会被忽略。

- `sep: String` 切分字符（必须是单个字符，支持4字节Unicode字符）。


#### `*split( fmt, cnt ) : Iterator`

切分字符串，返回一个切分集合的迭代器。

- `fmt: String` 待切分目标字符串。
- `cnt: Number` 切分的最大次数。注意不是最多片数：切分1次为2片，2次为3片。

> **注意：**<br>
> 与 `String.split()` 接口不同，切分 **次数** 的逻辑意味着未完成的切分会原样保留，而不是丢弃。<br>
> 这里是返回一个迭代器而不是数组。如果希望保留 `String.split()` 切分 **片数** 的逻辑，可使用上面的 `$.split()` 接口。<br>


#### `index( ch ): Number`

查找目标字符在字符串内的下标位置。

- `ch: String` 待检查字符（单个），如存在于内部字符串格式内时，会被忽略。

> **注：**
> 如果仅使用该接口，创建 `Spliter` 实例时可以不用传递分隔符 `sep`。


### $.kvsMap( map, kname?, vname? ): [Object]

将一个 `Map` 实例转换为用目标键/值名称索引实例内键和值的对象的数组。

- `map: Map` 待转换的 `Map` 实例。
- `kname?: String` 实例内键的索引键名。可选，默认值为 `name`。
- `vname?: String` 实例内值的索引键名。可选，默认值为 `value`。

即 `Map` 实例内每一个键/值用 `{ [kname]: key, [vname]: value }` 引用，全部的键/值对引用形成一个二元对象的数组。如：

```js
let map = new Map().set('A', 'aaa').set('B', 'bbb');

$.kvsMap(map, 'name', 'value');
// [
//     { name: 'A', value: 'aaa' },
//     { name: 'B', value: 'bbb' },
// ]

$.kvsMap(map);
// 同上，直接采用默认的键/值索引名。
```


### $.mergeArray( des, ...src ): Array

合并多个数组成员到首个实参数组内。返回合并后的首个实参数组。

- `des: Array` 合并到的目标数组。
- `...src: Array | Value` 不定数量的待合并值或数组。

```js
$.mergeArray( [], 123, [1,3,5], 'xyz' );
// [ 123, 1, 3, 5, "xyz" ]
```


### $.assign( target, ...sources ): target

用 `sources` 中的最后一个实参为处理器，过滤/处理源对象中的每个属性（包括 `Symbol` 类型）及其值，返回的结果（`[v, k]`）被应用到 `target` 对象上。

- `target: Object` 被赋值的目标对象。也是最终的返回值。
- `...sources: [Object]` 数据源对象序列。最后一个可能为处理器，接口：`function(v, k, src, target): [v, k] | null`。

最后一个实参为处理器是可选的，如果只是普通对象，就与原生的 `Object.assign()` 没有区别。

处理器应当返回一个 `[值, 键]` 的二元数组，其中键成员是可选的（如为 `null|undefined` 则延用原来的键）。如果返回一个假值，会略过该属性的拷贝。

```js
let src = { a: 'aaa', _a: 'AAA' };

$.assign(
    {}, src,
    (v, k) => k[0] == '_' && [v, k.toUpperCase()]
);
// { _A: "AAA" }
// 过滤并修改了键名。

src[Symbol('x')] = 'hello';

$.assign( {}, src, { a: 10 } );
// { a: 10, _a: "AAA", Symbol(x): "hello" }
// 无处理器，即普通的赋值，同名覆盖。


$.assign( {}, src, (v, k) => k.length && [v] );
// { a: "aaa", _a: "AAA" }
// 滤掉了 Symbol 类型属性。
```


### $.object( base, ...data ): Object

基于首个实参对象为原型，创建一个新的对象。后续对象的成员将被复制到新对象上。

- `base: Object` 新对象的原型。
- `...data: Object` 待复制成员的任意对象。

注意复制是浅层的（采用 `Object.assign()` 赋值的结果）。传递首个实参为 `null` 可以创建一个没有原型的简单对象。


### $.proto( target, base ): Object

获取或设置目标对象 `target` 的原型对象。

- `target: Object` 取值或操作的目标对象。
- `base: Object` 待设置的原型对象。可选。

第二个实参 `base` 未定义时为获取，返回 `target` 的原型对象。否则为设置 `base` 为 `target` 的原型对象，返回被设置的 `target` 对象。

这种设置可能在需要自定义对象的取值作用域链时有用，比如从子对象上读取父对象的其它成员：

```js
let A = { B: { x: 10, y: 20 }, C: 'ccc' },
    B = A.B;

B.x;  // 10
B.C;  // undefined

$.proto(B, A);
B.C;  // 'ccc'
```


### [$.range( beg, size, step? ): Iterator | null](docs/$.range.md)

构造目标范围内一个连续的值序列。

- `beg: Number | String` 范围的起始值或 `Unicode` 码点。
- `size: Number | String` 范围的大小或终止的 `Unicode` 码点（包括该码点）。
- `step?: Boolean` 序列成员间的步进值（增量）。可选，默认为 `1`。

适用于数值和 `Unicode` 码点值类型，返回一个迭代器，如果 `size` 小于零，返回 `null`。

> **注：**
> 如果 `size` 为 `Unicode` 终止码点，`step` 无意义（强制为 `1` 或 `-1`）。

```js
[...$.range(10, 10)];
// [ 10, 11, 12, 13, 14, 15, 16, 17, 18, 19 ]

[...$.range('①', 10)];
// [ "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩" ]

[...$.range('A', 'F')];
// ["A", "B", "C", "D", "E", "F"]

[...$.range('F', 'A')];
// ["F", "E", "D", "C", "B", "A"]
```


### [$.now( json: Boolean ): String | Number](docs/$.now.md)

返回当前时间的时间戳：自 `1970-01-01T00:00:00` 开始后的毫秒数（与时区无关）。

- `json: Boolean` 是否返回为标准的JSON格式串（ISO-8601）。

```js
$.now();
// 1564744242828

$.now(true);
// "2019-08-02T11:10:42.828Z"
```


### $.paths( el, end, slp, slr ): [Number]

提取元素路径上各层父级元素的位置序列。位置计数从1开始，主要用于辅助构造 `nth-child()` 或 `nth-of-type()` 定位选择器。

- `el: Element` 起点元素（节点树向下末端的元素）。
- `end: Element | String` 上层终止根元素（逆向上溯的终点根，不含）。
- `slp: String` 父级匹配选择器，可选。
- `slr: String` 同级参考选择器，可选。即位置计数参考该匹配集。

> **注记：**<br>
> 可用于辅助构造元素的定位，如提取大纲视图创建目录。<br>
> 与严格的 DOM 节点树不同，这里的路径可以只是逻辑上的：父级匹配选择器提供了 **跨级** 的能力，同级参考选择器则让位置变得 **相对**。


### $.intoView( el, y, x ): void

滚动元素到当前视口。

- `el: Element` 待滚动元素。
- `y: Number | String | true | false` 垂直方向上的位置标识。
- `x: Number | String` 水平方向上的位置标识。

> 位置（y|x）含义：
> - `0`     就近显示（如果需要）（`nearest`）。
> - `1`     视口起点位置（`start`）。
> - `-1`    视口末尾位置（`end`）。
> - `2`     居中显示，默认（`center`）。
> - `true`  居中显示（如果需要），仅适用 scrollIntoViewIfNeeded （Safari）。
> - `false` 就近显示（如果需要），同上。

默认行为与 `scrollIntoView/scrollIntoViewIfNeeded` 规范一致。


### $.isArray( obj ): Boolean

测试目标对象 `obj` 是否为数组。

- `obj: Any` 待测试的任意目标。

这只是对 `Array.isArray()` 的简单封装而已。


### $.isNumeric( val ): Boolean

测试目标值是否为纯数字。

- `val: Any` 待测试的任意值。

空串虽然与0相等（`==`），但空串并不是数字。


### $.isFunction( obj ): Boolean

测试实参目标是否为一个函数。

- `obj: Any` 待测试的任意目标。

可容错某些浏览器对 `<object>` 元素的错误判断（`typeof`）。


### $.isCollector( obj ): Boolean

测试实参目标是否为一个 `Collector` 实例。

- `obj: Any` 待测试的任意目标。

用 `$.type(obj) == 'Collector'` 也可以判断出来，但这里没有名称冲突且效率也更高一些。


### $.is( el, slr ): Boolean

测试元素 `el` 是否与 `slr` 匹配。

- `el: Element` 待测试的目标元素。
- `slr: String | Element` 匹配测试用的CSS选择器或一个元素，为元素是指与目标相同（`===`）。


### $.type( val ): String

返回实参值的具体构造类型。

- `val: Any` 获取其类型的任意目标值。

求取的是目标值的构造函数名，如：`$.type(123) => "Number"`，而不是 `typeof` 运算符的返回值。另外有两个特例：`null => "null"`、`undefined => "undefined"`。


### $.siblingNth( el, slr? ): Number

检查获取目标元素在兄弟元素中的位置（从1开始）。

- `el: Element` 目标元素。注：仅限于元素，不包含其它如文本节点。
- `slr: String` 选择器匹配约束，仅匹配的元素才计数。可选。
