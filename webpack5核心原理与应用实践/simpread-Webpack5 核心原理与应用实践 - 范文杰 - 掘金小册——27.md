> 本文由 [简悦 SimpRead](http://ksria.com/simpread/) 转码， 原文地址 [juejin.cn](https://juejin.cn/book/7115598540721618944/section/7119036016274440192?enter_from=course_center&utm_source=course_center)

> 回顾最近几节内容，Webpack 运行过程中首先会根据 Module 之间的引用关系构建 ModuleGraph 对象；接下来按照若干内置规则将 Module 组织进不同 Chunk 对象中，形成 ChunkGraph 关系图。

回顾最近几节内容，Webpack 运行过程中首先会根据 `Module` 之间的引用关系构建 `ModuleGraph` 对象；接下来按照若干内置规则将 `Module` 组织进不同 `Chunk` 对象中，形成 `ChunkGraph` 关系图。

接着，构建流程将来到最后一个重要步骤：生成产物代码，这个过程会将所有 `Module` 内容一一转换为适当的产物代码形态，并以 `Chunk` 为单位合并 `Module` 产物代码，之后根据 `Module` 中出现的特性依赖，补充相应运行时代码，最终构建出我们日常所见的 Webpack Bundle 代码文件。

本文将深入分析这个过程的源码，详细剖析模块转译、运行时依赖分析、产物合并的具体实现逻辑。

什么是模块转译？
--------

众所周知，Webpack 的打包功能并不是将原始文件代码 “复制 - 粘贴” 到产物文件那么简单，为了确保代码能在不同环境 —— 多种版本的浏览器、Node、Electron 等正常运行，构建时需要对模块源码适当做一些转换操作，这一点在大多数构建产物的内容中都有所体现，例如：

![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3276ff5d31014f7d913f07b6bc61e4ab~tplv-k3u1fbpfcp-jj-mark:2268:0:0:0:q75.awebp)

示例包含 `index.js`、`name.js` 两个 JS 代码模块，经过 Webpack 构建后生成如图右侧所示的产物文件，文件自上而下包含三块内容：

*   `name.js` 模块对应的、函数形态的转译代码；
*   Webpack 按需注入的运行时代码；
*   `index.js` 模块对应的 IIFE（立即执行函数） 转译代码。

其中，`name.js`、`index.js` 对应的产物代码，与源码相比，虽然语义与功能都基本相同，但表现形式发生了较大变化，例如 `index.js` 编译前后的内容：

![](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/72e8b113bab844e9acf2e5d682339590~tplv-k3u1fbpfcp-jj-mark:2268:0:0:0:q75.awebp)

*   整个模块被包裹进 IIFE（立即执行函数）中；
*   添加 `__webpack_require__.r(__webpack_exports__);` 语句，用于适配 ESM 规范；
*   源码中的 `import` 语句被转译为 `__webpack_require__` 函数调用；
*   源码 `console` 语句所使用的 `name` 变量被转译为 `_name__WEBPACK_IMPORTED_MODULE_0__.default` ；
*   添加若干注释。

编译前后代码功能逻辑相同，但替换掉这些 ES 高级特性之后，却能让应用平稳运行在低版本浏览器中，那么，这种代码转换功能具体是怎么实现的呢？

模块转译主流程
-------

在上一章《[Chunk：三种产物的打包逻辑](https://juejin.cn/book/7115598540721618944/section/7119035921680302115 "https://juejin.cn/book/7115598540721618944/section/7119035921680302115")》中，我们已经介绍了 `compilation.seal` 函数内会调用 `buildChunkGraph` 生成 Chunk 依赖关系图，之后 Webpack 就可以分析出：

*   需要输出那些 Chunk；
*   每个 Chunk 包含那些 Module，以及每个 Module 经过 Loader 翻译后的代码内容；
*   Chunk 与 Chunk 之间的父子依赖关系。

在此之后 `seal` 函数会开始触发一堆优化钩子，借助插件对 ChunkGraph 做诸如合并、拆分、删除无效 Chunk 等优化操作，并在最后调用 [compilation.codeGeneration](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2FCompilation.js%23L3160-L3162 "https://github1s.com/webpack/webpack/blob/HEAD/lib/Compilation.js#L3160-L3162") 方法：

```
class Compilation {
  seal(callback) {
    
    for (const [name, { dependencies, includeDependencies, options }] of this.entries) {
      
    }
    for (const [name,{options: { dependOn, runtime },},] of this.entries) {
      
    }
    
    buildChunkGraph(this, chunkGraphInit);
    
    this.hooks.optimize.call();
    

    this.hooks.optimizeTree.callAsync(this.chunks, this.modules, (err) => {
      
      this.hooks.optimizeChunkModules.callAsync(this.chunks, this.modules, (err) => {
          
          this.hooks.beforeCodeGeneration.call();
          
          this.codeGeneration();
        }
      );
    });
  }
}


```

`codeGeneration` 方法负责生成最终的资产代码，主要流程：

![](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/6a5888bf286248adaf7b627310aebbd9~tplv-k3u1fbpfcp-jj-mark:2268:0:0:0:q75.awebp)

有三个关键步骤。

*   **单模块转译**：这一步主要用于计算模块实际输出代码，遍历 `compilation.modules` 数组，[调用](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2FCompilation.js%23L3326-L3327 "https://github1s.com/webpack/webpack/blob/HEAD/lib/Compilation.js#L3326-L3327") `module` 对象的 [codeGeneration](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2FNormalModule.js%23L1172-L1173 "https://github1s.com/webpack/webpack/blob/HEAD/lib/NormalModule.js#L1172-L1173") 方法，执行模块转译计算：
    *   [调用](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2FNormalModule.js%23L1204-L1205 "https://github1s.com/webpack/webpack/blob/HEAD/lib/NormalModule.js#L1204-L1205") `JavascriptGenerator` 的 [generate](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2Fjavascript%2FJavascriptGenerator.js%23L89-L90 "https://github1s.com/webpack/webpack/blob/HEAD/lib/javascript/JavascriptGenerator.js#L89-L90") 方法；
    *   [遍历](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2Fjavascript%2FJavascriptGenerator.js%23L111-L112 "https://github1s.com/webpack/webpack/blob/HEAD/lib/javascript/JavascriptGenerator.js#L111-L112") `module` 对象的 `dependencies` 与 `presentationalDependencies` 数组；
    *   [执行](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2Fjavascript%2FJavascriptGenerator.js%23L206-L207 "https://github1s.com/webpack/webpack/blob/HEAD/lib/javascript/JavascriptGenerator.js#L206-L207") 每个数组项 `dependeny` 对象对应的 `template.apply` 方法，方法中视情况可能产生三种副作用：
        *   直接修改模块 `source` 数据，如 [ConstDependency.Template](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2Fdependencies%2FConstDependency.js%23L100-L101 "https://github1s.com/webpack/webpack/blob/HEAD/lib/dependencies/ConstDependency.js#L100-L101")；
        *   将结果记录到 `initFragments` 数组如 [HarmonyExportSpecifierDependency](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2Fdependencies%2FHarmonyExportSpecifierDependency.js%23L97-L99 "https://github1s.com/webpack/webpack/blob/HEAD/lib/dependencies/HarmonyExportSpecifierDependency.js#L97-L99")；
        *   将运行时依赖记录到 `runtimeRequirements` 数组如 [HarmonyImportDependency](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2Fdependencies%2FHarmonyImportDependency.js%23L105-L106 "https://github1s.com/webpack/webpack/blob/HEAD/lib/dependencies/HarmonyImportDependency.js#L105-L106")。
*   **收集运行时依赖**：计算模块运行时，首先调用 `compilation.processRuntimeRequirements` 方法，将上一步生成的 `runtimeRequirements` 数组一一转换为 `RuntimeModule` 对象，并挂载到 `ChunkGroup` 中。
*   **模块合并**：调用 `compilation.createChunkAssets` 方法，以 Chunk 为单位，将相应的所有 `module` 及 `runtimeModule` 按规则塞进「**产物框架**」 中，最终合并输出成完整的 Bundle 文件。

这些就是 Webpack 最终消费 ModuleGraph 与 ChunkGraph，生成最终产物代码的关键过程，总结而言，就是先遍历所有模块依赖对象，收集模块编译结果与运行时依赖，之后将这些内容合并在一起输出为 Bundle 文件。

下面我们逐一展开，了解每个步骤的细节。

单模块转译
-----

「**模块转译**」 操作从 `module.codeGeneration` 调用开始，对应到上述流程图的：

![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f6d0eb4a736b493b86fc8c6945f8534a~tplv-k3u1fbpfcp-jj-mark:2268:0:0:0:q75.awebp)

这个过程首先调用 `JavascriptGenerator.generate` 函数，遍历模块的 `dependencies` 数组，依次调用依赖对象对应的 `Template` 子类 `apply` 方法更新模块内容，说起来有点绕，我将重要步骤抽取为如下伪代码：

```
class JavascriptGenerator {
    generate(module, generateContext) {
        
        const source = new ReplaceSource(module.originalSource());
        const { dependencies, presentationalDependencies } = module;
        const initFragments = [];
        for (const dependency of [...dependencies, ...presentationalDependencies]) {
            
            const template = generateContext.dependencyTemplates.get(dependency.constructor);
            
            
            template.apply(dependency, source, {initFragments})
        }
        
        return InitFragment.addToSource(source, initFragments, generateContext);
    }
}


class xxxDependency extends Dependency {}


const xxxDependency.Template = class xxxDependencyTemplate extends Template {
    apply(dep, source, {initFragments}) {
        
        source.replace(dep.range[0], dep.range[1] - 1, 'some thing')
        
        initFragments.push(new xxxInitFragment())
    }
}


```

从上述伪代码可以看出，`JavascriptGenerator.generate` 函数的逻辑相对比较固化：

1.  初始化 `source`、`initFragments` 等变量；
2.  遍历 `module` 对象的依赖数组，找到每个 `dependency` 对应的 `template` 对象，调用 `template.apply` 函数修改模块内容；
3.  调用 `InitFragment.addToSource` 方法，合并 `source` 与 `initFragments` 数组，生成最终结果。

这里的重点是 `JavascriptGenerator.generate` 函数并不操作 `module` 源码，它仅仅提供一个执行框架，真正处理模块内容转译的逻辑都在 `xxxDependencyTemplate` 对象的 `apply` 函数实现，如上例伪代码中 24-28 行。

每个 `Dependency` 子类都会挂载一个 `Template` 子类，且通常这两个类都会写在同一个文件中，例如 [ConstDependency](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2Fdependencies%2FConstDependency.js%23L83-L84 "https://github1s.com/webpack/webpack/blob/HEAD/lib/dependencies/ConstDependency.js#L83-L84") 与 `ConstDependencyTemplate`；`NullDependency` 与 `NullDependencyTemplate`。

Webpack 从「构建」(make) 阶段开始，就会通过 `Dependency` 子类记录不同情况下模块之间的依赖关系；到「封装」(seal) 阶段再通过 `Template` 子类修改 `module` 代码，最终 `Module`、`Template`、 `JavascriptGenerator`、`Dependency` 四个关键类形成如下交互关系：

![](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/683c91eefab04caf8875b859a7f7910c~tplv-k3u1fbpfcp-jj-mark:2268:0:0:0:q75.awebp)

`Template` 对象会通过三种方法影响产物代码：

*   直接操作 `source` 对象，修改模块代码，该对象最初的内容等于模块的源码，经过多个 `Template.apply` 函数流转后逐渐被替换成新的代码形式；
*   操作 `initFragments` 数组，在模块源码之外插入补充代码片段；
*   将运行时依赖记录到 `runtimeRequirements` 数组。

其中第 1、2 种操作所产生的副作用，最终都会被传入 `InitFragment.addToSource` 函数，合并成最终结果。

> **通过 `source` 修改模块代码：**

先来看看 `source` 操作，[webpack-sources](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fwebpack%2Fwebpack-sources "https://github.com/webpack/webpack-sources") 是 Webpack 中用于编辑字符串的一套工具类库，它提供了一系列代码编辑方法，包括：

*   字符串合并、替换、插入等；
*   模块代码缓存、sourcemap 映射、hash 计算等。

Webpack 内部以及社区的很多插件、loader 都会使用 [webpack-sources](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fwebpack%2Fwebpack-sources "https://github.com/webpack/webpack-sources") 库编辑代码内容，包括上文介绍的 `Template.apply` 体系。逻辑上，在启动模块代码生成流程时，Webpack 会先用模块原始内容[初始化](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2Fjavascript%2FJavascriptGenerator.js%23L95-L96 "https://github1s.com/webpack/webpack/blob/HEAD/lib/javascript/JavascriptGenerator.js#L95-L96") `Source` 对象，即：

```
const source = new ReplaceSource(module.originalSource());


```

之后，不同 `Dependency` 子类按序、按需更改 `source` 内容，例如 [HarmonyImportSpecifierDependency](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2Fdependencies%2FHarmonyImportSpecifierDependency.js "https://github1s.com/webpack/webpack/blob/HEAD/lib/dependencies/HarmonyImportSpecifierDependency.js") 中：

```
HarmonyImportSpecifierDependency.Template = class HarmonyImportSpecifierDependencyTemplate extends (
  HarmonyImportDependency.Template
) {
  apply(dependency, source, templateContext) {
    const dep =  (dependency);
    
    const ids = dep.getIds(moduleGraph);
    const exportExpr = this._getCodeForIds(dep, source, templateContext, ids);
    const range = dep.range;
    if (dep.shorthand) {
      source.insert(range[1], `: ${exportExpr}`);
    } else {
      source.replace(range[0], range[1] - 1, exportExpr);
    }
  }
};


```

举个例子，对于下面这段简单代码：

```
import bar from "./bar";
console.log(bar);


```

会产生 `HarmonyImportSpecifierDependency` 与 `ConstDependency` 两个依赖对象，之后：

```
import bar from "./bar";
console.log(bar);


import bar from "./bar";
console.log(_bar__WEBPACK_IMPORTED_MODULE_1__["default"]);


console.log(_bar__WEBPACK_IMPORTED_MODULE_1__["default"]);


```

可以看出，这部分逻辑的效果与 Babel 类似，会直接修改模块源码，实现语言层面的向下兼容。但这还不够，还需要将这段代码包裹进 Webpack 的模块框架中，这部分工作将由 `initFragments` 数组完成。

> **`initFragments` 数组的作用：**

上面我们聊到，除直接操作 `source` 外，`Template.apply` 中还可能通过 `initFragments` 数组达成修改模块产物的效果。`initFragments` 数组项为 [InitFragment](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2FInitFragment.js "https://github1s.com/webpack/webpack/blob/HEAD/lib/InitFragment.js") 子类实例，它们带有两个关键函数：`getContent`、`getEndContent`，分别用于获取代码片段的头尾部分。

例如 `HarmonyImportDependencyTemplate` 的 [apply](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2Fdependencies%2FHarmonyImportDependency.js%23L310-L311 "https://github1s.com/webpack/webpack/blob/HEAD/lib/dependencies/HarmonyImportDependency.js#L310-L311") 函数中：

```
HarmonyImportDependency.Template = class HarmonyImportDependencyTemplate extends (
  ModuleDependency.Template
) {
  apply(dependency, source, templateContext) {
    
    templateContext.initFragments.push(
        new ConditionalInitFragment(
          importStatement[0] + importStatement[1],
          InitFragment.STAGE_HARMONY_IMPORTS,
          dep.sourceOrder,
          key,
          runtimeCondition
        )
      );
    
  }
 }


```

也就是根据模块需求，不断增加新的代码片段 `initFragments`，所有 `Dependency` 执行完毕后，接着就需要调用 `InitFragment.addToSource` 函数将两者合并为模块产物。`addToSource` 的核心代码如下：

```
class InitFragment {
  static addToSource(source, initFragments, generateContext) {
    
    const sortedFragments = initFragments
      .map(extractFragmentIndex)
      .sort(sortFragmentWithIndex);
    

    const concatSource = new ConcatSource();
    const endContents = [];
    for (const fragment of sortedFragments) {
        
      concatSource.add(fragment.getContent(generateContext));
      const endContent = fragment.getEndContent(generateContext);
      if (endContent) {
        endContents.push(endContent);
      }
    }

    
    concatSource.add(source);
    
    for (const content of endContents.reverse()) {
      concatSource.add(content);
    }
    return concatSource;
  }
}


```

可以看到，`addToSource` 函数的逻辑：

*   遍历 `initFragments` 数组，按顺序合并 `fragment.getContent()` 的产物；
*   合并 `source` 对象；
*   遍历 `initFragments` 数组，按顺序合并 `fragment.getEndContent()` 的产物。

所以，模块代码合并操作主要就是用 `initFragments` 数组一层一层包裹住模块代码 `source`，而两者都在 `Template.apply` 层面维护。还是上面那个简单例子，经过这段 `Template` 处理后，最终转化为：

```
import bar from "./bar";
console.log(bar);


import bar from "./bar";
console.log(_bar__WEBPACK_IMPORTED_MODULE_1__["default"]);


console.log(_bar__WEBPACK_IMPORTED_MODULE_1__["default"]);


 var _bar__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__( "./src/bar.js");
console.log(_bar__WEBPACK_IMPORTED_MODULE_1__["default"]);


```

简单总结一下，Webpack 生成 ModuleGraph 与 ChunkGraph 后，会立即开始遍历所有 `Dependency` 对象，依次调用对象的静态方法 `template.apply` 修改 `module` 代码，最后再将所有变更后的 `source` 与模块脚手架 `initFragments` 合并为最终产物，完成从单个模块的源码形态到产物形态的转变。

> **自定义 `Template.apply` 示例：**

「**模块转译**」 步骤流程比较长，整体逻辑很复杂，为了加深理解，接下来我们尝试开发一个简单的 Banner 插件：实现在每个模块前自动插入一段字符串。实现上，插件主要涉及 `Dependency`、`Template`、`hooks` 对象，代码：

```
const { Dependency, Template } = require("webpack");

class DemoDependency extends Dependency {
  constructor() {
    super();
  }
}

DemoDependency.Template = class DemoDependencyTemplate extends Template {
  apply(dependency, source) {
    const today = new Date().toLocaleDateString();
    source.insert(0, `/* Author: Tecvan */
/* Date: ${today} */
`);
  }
};

module.exports = class DemoPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap("DemoPlugin", (compilation) => {
      
      compilation.dependencyTemplates.set(
        DemoDependency,
        new DemoDependency.Template()
      );
      compilation.hooks.succeedModule.tap("DemoPlugin", (module) => {
        
        module.addDependency(new DemoDependency());
      });
    });
  }
};


```

示例插件的关键步骤：

*   编写 `DemoDependency` 与 `DemoDependencyTemplate` 类，其中 `DemoDependency` 仅做示例用，没有实际功能；`DemoDependencyTemplate` 则在其 `apply` 中调用 `source.insert` 插入字符串，如示例代码第 10-14 行；
*   使用 `compilation.dependencyTemplates` 注册 `DemoDependency` 与 `DemoDependencyTemplate` 的映射关系；
*   使用 `thisCompilation` 钩子取得 `compilation` 对象；
*   使用 `succeedModule` 钩子订阅 `module` 构建完毕事件，并调用 `module.addDependency` 方法添加 `DemoDependency` 依赖。

完成上述操作后，`module` 对象的产物在生成过程就会调用到 `DemoDependencyTemplate.apply` 函数，插入我们定义好的字符串，效果如：

![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e9bb7223e90c4054bb50f95c74191dd8~tplv-k3u1fbpfcp-jj-mark:2268:0:0:0:q75.awebp)

感兴趣的同学也可以直接阅读 Webpack 仓库的如下文件，学习更多用例：

*   [ConstDependency](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2Fdependencies%2FConstDependency.js%23L92-L93 "https://github1s.com/webpack/webpack/blob/HEAD/lib/dependencies/ConstDependency.js#L92-L93")：一个简单示例，可学习 `source` 的更多操作方法；
*   [HarmonyExportSpecifierDependency](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2Fdependencies%2FHarmonyExportSpecifierDependency.js%23L86-L87 "https://github1s.com/webpack/webpack/blob/HEAD/lib/dependencies/HarmonyExportSpecifierDependency.js#L86-L87")：一个较简单的示例，可学习 `initFragments` 数组的更多用法；
*   [HarmonyImportDependency](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2Fdependencies%2FHarmonyImportDependency.js%23L253-L254 "https://github1s.com/webpack/webpack/blob/HEAD/lib/dependencies/HarmonyImportDependency.js#L253-L254")：一个较复杂但使用率极高的示例，可综合学习 `source`、`initFragments` 数组的用法。

收集运行时模块
-------

为了正常、正确运行业务项目，Webpack 需要将开发者编写的业务代码以及支撑、调配这些业务代码的 **运行时** 一并打包到产物（bundle）中，以建筑作类比的话，业务代码相当于砖瓦水泥，是看得见摸得着能直接感知的逻辑；运行时相当于掩埋在砖瓦之下的钢筋地基，通常不需要关注，但决定了整座建筑的功能、质量。

大多数 Webpack 特性都需要特定钢筋地基才能跑起来，包括：异步加载、HMR、WASM、Module Federation 等。即使没有用到这些特性，仅仅是最简单的模块导入导出，也都需要生成若干模拟 CMD 模块化方案运行时代码，例如：

```
export default 'a module';


import name from './a'
console.log(name)


```

打包结果：

![](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/df188ee10e674b068e4bd4ea654aa923~tplv-k3u1fbpfcp-jj-mark:2268:0:0:0:q75.awebp)

可以看出，整个 Bundle 被包裹在一个立即执行函数中，函数内部从上到下依次定义：

*   `__webpack_modules__` 对象，包含了除入口外的所有模块，如示例中的 `a.js` 模块；
*   `__webpack_module_cache__` 对象，用于存储被引用过的模块；
*   `__webpack_require__` 函数，实现模块引用 (require) 逻辑；
*   `__webpack_require__.d` ，工具函数，实现将模块导出的内容附加的模块对象上；
*   `__webpack_require__.o` ，工具函数，判断对象属性用；
*   `__webpack_require__.r` ，工具函数，在 ESM 模式下声明 ESM 模块标识；
*   最后的 IIFE，对应 entry 模块即上述示例的 `index.js` ，用于启动整个应用。

这几个 `__webpack_` 开头奇奇怪怪的函数可以统称为 Webpack 运行时代码，作用如前面所说的，是搭起整个业务项目的骨架，就上述简单示例所罗列出来的几个函数、对象而言，它们协作构建起一个简单的模块化体系，从而实现 ES Module 规范所声明的模块化特性。

上述函数、对象构成了 Webpack 运行时最基本的能力 —— 模块化，假如代码中用到更多 Webpack 特性，则会相应地注入更多运行时模块代码，例如：

*   使用异步加载时，注入 `__webpack_require__.e`、`__webpack_require__.f` 等模块；
*   使用 HMR 时，注入 `__webpack_require__.hmrF`、`webpack/runtime/hot` 等模块。

那么，Webpack 是如何收集运行时依赖，并将之合并到最终产物中的呢？

> **收集运行时依赖：**

早在「构建」阶段，Webpack 就已经开始在持续收集运行时依赖，例如，在一个非常简单的模块导入语句中：

```
import bar from './bar';


```

Webpack 在处理上述代码 AST 时，会相应生成多个依赖对象，比较重要的有：

*   `HarmonyImportSideEffectDependency`：主要的 Dependency 对象，Webpack 会为该对象创建相应的 `NormalModule` 实例，从而递归处理新模块代码；
*   [HarmonyCompatibilityDependency](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2Fdependencies%2FHarmonyCompatibilityDependency.js%23L72-L73 "https://github1s.com/webpack/webpack/blob/HEAD/lib/dependencies/HarmonyCompatibilityDependency.js#L72-L73")：运行时模块依赖，对应的 [Template.apply](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2Fdependencies%2FHarmonyCompatibilityDependency.js%23L72-L73 "https://github1s.com/webpack/webpack/blob/HEAD/lib/dependencies/HarmonyCompatibilityDependency.js#L72-L73") 函数会在生成代码时记录相应运行时需求。

本质上，这是一个基于静态代码分析的方式收集依赖的过程。当所有模块处理完毕，收集到所有运行时依赖，进入 `codeGeneration` 函数后，Webpack 会进一步将这些依赖对象挂载到 Chunk 中：

![](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/098592e677784728ba6c4947235b0460~tplv-k3u1fbpfcp-jj-mark:2268:0:0:0:q75.awebp)

这个过程集中 `compilation.processRuntimeRequirements` 函数，函数中包含三次循环：

*   第一次循环遍历所有 module，收集所有 module 的 runtime 依赖；
*   第二次循环遍历所有 chunk，将 chunk 下所有 module 的 runtime 统一收录到 chunk 中；
*   第三次循环遍历所有 runtime chunk，收集其对应的子 chunk 下所有 runtime 依赖，之后遍历所有依赖并发布 `runtimeRequirementInTree` 钩子，（主要是） `RuntimePlugin` 插件订阅该钩子并根据依赖类型创建对应的 `RuntimeModule` 子类实例。

**[第一次循环：收集模块依赖](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2FCompilation.js%23L3392-L3393 "https://github1s.com/webpack/webpack/blob/HEAD/lib/Compilation.js#L3392-L3393")：**

在上述「模块转译主流程」中，我们聊到 `Template.apply` 函数可能修改模块的 `runtimeRequirements` 数组，最终形成如下结构：

![](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4ced49e0b3764a4aaf168db7bae8c1cb~tplv-k3u1fbpfcp-jj-mark:2268:0:0:0:q75.awebp)

这个过程相当于将模块的 Runtime Dependency 都转化为 `__webpack_require__` 等枚举值，并调用 `compilation.processRuntimeRequirements` 进入第一重循环，将上述 `runtimeRequirements` 数组 [挂载](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2FCompilation.js%23L3447-L3448 "https://github1s.com/webpack/webpack/blob/HEAD/lib/Compilation.js#L3447-L3448") 到 `ChunkGraph` 对象中。

**[第二次循环：整合 chunk 依赖](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2FCompilation.js%23L3463-L3464 "https://github1s.com/webpack/webpack/blob/HEAD/lib/Compilation.js#L3463-L3464")：**

第一次循环针对 module 收集依赖，第二次循环则遍历 chunk 数组，收集将其对应所有 module 的 runtime 依赖，例如：

![](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f1d02df6676942acac39290096af3d4c~tplv-k3u1fbpfcp-jj-mark:2268:0:0:0:q75.awebp)

示例图中，`module a` 包含两个运行时依赖；`module b` 包含一个运行时依赖，则经过第二次循环整合后，对应的 `chunk` 会包含两个模块所包含的三个运行时依赖。

**[第三次循环：依赖标识转 RuntimeModule 对象](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2FCompilation.js%23L3483-L3484 "https://github1s.com/webpack/webpack/blob/HEAD/lib/Compilation.js#L3483-L3484")：**

源码中，第三次循环的代码最少但逻辑最复杂，大致上执行三个操作：

*   遍历所有 runtime chunk，收集其所有子 chunk 的 runtime 依赖；
*   为该 runtime chunk 下的所有依赖发布 `runtimeRequirementInTree` 钩子；
*   `RuntimePlugin` 监听钩子，并根据 runtime 依赖的标识信息创建对应的 `RuntimeModule` 子类对象，并将对象加入到 `ModuleDepedencyGraph` /`ChunkGraph` 体系中管理。

至此，runtime 依赖完成了从 module 内容解析，到收集，到创建依赖对应的 `Module` 子类，再将 `Module` 加入到 `ModuleDepedencyGraph` /`ChunkGraph` 体系的全流程，业务代码及运行时代码对应的模块依赖关系图完全 ready，可以准备进入下一阶段 —— 合并最终产物。

合并最终产物
------

讲完单个模块转译以及运行时模块收集过程后，我们终于来到最后一步：

![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/67a464acdc17450487c13f649c7d9b4f~tplv-k3u1fbpfcp-jj-mark:2268:0:0:0:q75.awebp)

流程图中，`compilation.codeGeneration` 函数执行完毕 —— 也就是模块转译阶段完成后，模块的转译结果会一一保存到 `compilation.codeGenerationResults` 对象中，之后会启动一个新的执行流程 —— **模块合并打包**。

**模块合并打包**过程会将 chunk 对应的 module 及 runtimeModule 按规则塞进**模板框架**中，最终合并输出成完整的 bundle 文件，例如上例中：

![](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/37ce17c38d524705b0f4dfbb7f408782~tplv-k3u1fbpfcp-jj-mark:2268:0:0:0:q75.awebp)

示例右边 bundle 文件中，红框框出来的部分为用户代码文件及运行时模块生成的产物，其余部分撑起了一个 IIFE 形式的运行框架，即为**模板框架**，也就是：

```
(() => { 
    "use strict";
    var __webpack_modules__ = ({
        "module-a": ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
            
        }),
        "module-b": ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
            
        })
    });
    
    var __webpack_module_cache__ = {};
    
    function __webpack_require__(moduleId) {
        
    }
    
    
    
    var __webpack_exports__ = {};
    
    (() => {
        
    })();
})();


```

捋一下这里的逻辑，运行框架包含如下关键部分：

*   最外层是一个 IIFE 包裹；
*   一个记录了除 `entry` 外的其它模块代码的 `__webpack_modules__` 对象，对象的 key 为模块标志符；值为模块转译后的代码；
*   一个极度简化的 CMD 实现： `__webpack_require__` 函数；
*   最后，一个包裹了 `entry` 代码的 IIFE 函数。

**模块转译** 是将 `module` 转译为可以在宿主环境如浏览器上运行的代码形式；**收集运行时模块** 负责决定整个 Bundle 需要的骨架代码；而 **模块合并** 操作则串联这些 `modules` ，使之整体符合开发预期，能够正常运行整个应用逻辑。接下来，我们揭晓这部分代码的生成原理。

**模块合并主流程：**

在 `compilation.codeGeneration` 执行完毕，即所有用户代码模块做完转译，运行时模块都收集完毕作后，`seal` 函数调用 `compilation.createChunkAssets` 函数，触发 `renderManifest` 钩子，`JavascriptModulesPlugin` 插件监听到这个钩子消息后开始组装 bundle，伪代码：

```
class Compilation {
  seal() {
    
    this.codeGenerationResults = this.codeGeneration(this.modules);
    
    this.createChunkAssets();
  }

  createChunkAssets() {
    
    for (const chunk of this.chunks) {
      
      const res = this.hooks.renderManifest.call([], {
        chunk,
        codeGenerationResults: this.codeGenerationResults,
        ...others,
      });
      
      this.emitAsset(res.render(), ...others);
    }
  }
}


class JavascriptModulesPlugin {
  apply() {
    compiler.hooks.compilation.tap("JavascriptModulesPlugin", (compilation) => {
      compilation.hooks.renderManifest.tap("JavascriptModulesPlugin", (result, options) => {
          
          const render = () =>
            
            
            this.renderMain(options);

          result.push({ render  });
          return result;
        }
      );
    });
  }

  renderMain() {}

  renderChunk() {}
}


```

这里的核心逻辑是，`compilation` 以 `renderManifest` 钩子方式对外发布 bundle 打包需求； `JavascriptModulesPlugin` 监听这个钩子，按照 chunk 的内容特性，调用不同的打包函数。

> 💡提示：上述仅针对 Webpack5 有效，在 Webpack4 中，打包逻辑集中在 `MainTemplate` 完成。

`JavascriptModulesPlugin` 内置的打包函数有：

*   `renderMain`：打包主 chunk 时使用；
*   `renderChunk`：打包子 chunk ，如异步模块 chunk 时使用。

两个打包函数实现的逻辑接近，都是按顺序拼接各个模块，下面简单介绍下 `renderMain` 的实现。

**`JavascriptModulesPlugin.renderMain` 函数：**

`renderMain` 函数涉及比较多场景判断，原始代码很长很绕，我摘了几个重点步骤：

```
class JavascriptModulesPlugin {
  renderMain(renderContext, hooks, compilation) {
    const { chunk, chunkGraph, runtimeTemplate } = renderContext;

    const source = new ConcatSource();
    
    
    
    
    const bootstrap = this.renderBootstrap(renderContext, hooks);

    
    const chunkModules = Template.renderChunkModules(
      renderContext,
      inlinedModules
        ? allModules.filter((m) => !inlinedModules.has(m))
        : allModules,
      (module) =>
        this.renderModule(
          module,
          renderContext,
          hooks,
          allStrict ? "strict" : true
        ),
      prefix
    );

    
    const runtimeModules =
      renderContext.chunkGraph.getChunkRuntimeModulesInOrder(chunk);

    
    
    const beforeStartup = Template.asString(bootstrap.beforeStartup) + "\n";
    source.add(
      new PrefixSource(
        prefix,
        useSourceMap
          ? new OriginalSource(beforeStartup, "webpack/before-startup")
          : new RawSource(beforeStartup)
      )
    );

    
    if (runtimeModules.length > 0) {
      for (const module of runtimeModules) {
        compilation.codeGeneratedModules.add(module);
      }
    }
    
    for (const m of chunkModules) {
      const renderedModule = this.renderModule(m, renderContext, hooks, false);
      source.add(renderedModule)
    }

    
    if (
      hasEntryModules &&
      runtimeRequirements.has(RuntimeGlobals.returnExportsFromRuntime)
    ) {
      source.add(`${prefix}return __webpack_exports__;\n`);
    }

    return source;
  }
}


```

核心逻辑为：

*   先计算出 bundle CMD 代码，即 `__webpack_require__` 函数；
*   计算出当前 chunk 下，除 entry 外其它模块代码 `chunkModules`；
*   计算出运行时模块代码；
*   开始执行合并操作，子步骤有：
    *   合并 CMD 代码；
    *   合并 runtime 模块代码；
    *   遍历 `chunkModules` 变量，合并除 entry 外其它模块代码；
    *   合并 entry 模块代码。
*   返回结果。

总结：先计算出不同组成部分的产物形态，之后按顺序拼接打包，输出合并后的版本。

至此，Webpack 完成 bundle 的转译、打包流程，后续调用 `compilation.emitAsset`，将产物内容输出到 `output` 指定的路径即可，Webpack 单次编译打包过程就结束了。

总结
--

从《[Init、Make、Seal：真正读懂 Webpack 核心流程](https://juejin.cn/book/7115598540721618944/section/7119035873802813475 "https://juejin.cn/book/7115598540721618944/section/7119035873802813475")》开始，我们花了四节篇幅，终于讲完了 Webpack 构建主流程中方方面面的原理，划重点：

*   Webpack 构建过程可以简单划分为 Init、Make、Seal 三个阶段；
*   Init 阶段负责初始化 Webpack 内部若干插件与状态，逻辑比较简单；
*   Make 阶段解决资源读入问题，这个阶段会从 Entry —— 入口模块开始，递归读入、解析所有模块内容，并根据模块之间的依赖关系构建 ModuleGraph —— 模块关系图对象；
*   Seal 阶段更复杂：
    *   一方面，根据 ModuleGraph 构建 ChunkGraph；
    *   另一方面，开始遍历 ChunkGraph，转译每一个模块代码；
    *   最后，将所有模块与模块运行时依赖合并为最终输出的 Bundle —— 资产文件。

这些内容都是介绍 Webpack 实现原理的文章，可能并不能马上解决你在业务中正在面临的现实问题，但放到更长的时间维度，这些内容所呈现的知识、思维、思辨过程可能能够长远地给到你：

*   分析、理解复杂开源代码的能力；
*   理解 Webpack 架构及实现细节，下次遇到问题的时候能根据表象迅速定位到根源；
*   理解 Webpack 为 hooks、loader 提供的上下文，能够更通畅地理解其它开源组件，甚至能够自如地实现自己的组件。

所以，希望你能沿着这个思路，反复、仔细阅读这些章节，深入理解底层实现原理，成为真正意义上的 Webpack 专家。

思考题
---

Dependency、Module 之间是什么关系？为什么需要设计 Dependency 这个看似可有可无的结构？