Javascript就像一台精妙运作的机器，我们可以用它来完成一切天马行空的构思。

我们对javascript生态了如指掌，却常忽视javascript本身。这台机器，究竟是哪些零部件在支持着它运行？

—— 这时你需要懂得抽象语法树（AST）。

AST在日常业务中也许很难涉及到，但当你不止于想做一个工程师，而想做工程师的工程师，写出类似webpack、vue-cli前端自动化的工具，或者有批量修改源码的工程需求，那你必须懂得AST。

事实上，在javascript世界中，你可以认为抽象语法树(AST)是最底层。 再往下，就是关于转换和编译的“黑魔法”领域了。

## 人生第一次拆解Javascript

小时候，当我们拿到一个螺丝刀和一台机器，人生中最令人怀念的梦幻时刻便开始了：

我们把机器，拆成一个一个小零件，一个个齿轮与螺钉，用巧妙的机械原理衔接在一起...

当我们把它重新照不同的方式组装起来，这时，机器重新又跑动了起来——世界在你眼中如获新生。

![image](http://img.hb.aicdn.com/1a930d490f341bb87a9eeedc3235ec3b527af0893eee0-41DK2A_fw658)

通过抽象语法树解析，我们可以像童年时拆解玩具一样，透视Javascript这台机器的运转，并且重新按着你的意愿来组装。

** 现在，我们拆解一个简单的add函数**
```
function add(a, b) {
    return a + b
}
```
首先，我们拿到的这个语法块，是一个FunctionDeclaration。

用力拆开，它成了三块：
- 一个id，就是它的名字，即add
- 两个params，就是它的参数，即[a, b]
- 一块body，也就是大括号内的一堆东西

add没办法继续拆下去了，它是一个最基础Identifier（标志）对象
```
{
    name: 'add'
    type: 'identifier'
    ...
}
```

params继续拆下去，其实是两个Identifier组成的数组。之后也没办法拆下去了
```
[
    {
        name: 'a'
        type: 'identifier'
        ...
    },
    {
        name: 'b'
        type: 'identifier'
        ...
    }
]
```

接下来，我们继续拆开body
我们发现，body其实是一个BlockStatement对象，用来表示是`{return a + b}`

打开Blockstatement，里面藏着一个ReturnStatement对象，用来表示`return a + b`

继续打开ReturnStatement,里面是一个BinaryExpression，用来表示`a + b`

继续打开BinaryExpression，它成了三部分，`left`，`operator`，`right`

- `operator` 即`+`
- `left` 里面装的，是Identifier对象 `a`
- `right` 里面装的，是Identifer对象 `b`

就这样，我们把一个简单的add函数拆解完毕，用图表示就是

![image](http://note.youdao.com/yws/res/8692/8B0AA4E0C64F4E6B9691B2DDAB097CCC)

看！抽象语法树(Abstract Syntax Tree)，的确是一种标准的树结构。

那么，上面我们提到的Identifier、Blockstatement、ReturnStatement、BinaryExpression， 这一个个小部件的说明书去哪查？

**请查看 [AST对象文档](https://developer.mozilla.org/en-US/docs/Mozilla/Projects/SpiderMonkey/Parser_API#Node_objects)**


### 送给你的AST螺丝刀：Recast

输入命令：
```
npm i recast -S
```
你即可获得一把操纵语法树的螺丝刀

接下来，你可以在任意js文件下操纵这把螺丝刀，我们新建一个demo.js示意：

**parse.js**
```
// 给你一把"螺丝刀"——recast
const recast = require("recast");

// 你的"机器"——一段代码
// 我们使用了很奇怪格式的代码，想测试是否能维持代码结构
const code =
  `
  function add(a, b) {
    return a +
      // 有什么奇怪的东西混进来了
      b",
  }
  `
// 用螺丝刀解析机器
const ast = recast.parse(code);

// ast可以处理很巨大的代码文件
// 但我们现在只需要代码块的第一个body，即add函数
const add  = ast.program.body[0]

console.log(add)
```

输入`node parse.js`你可以查看到add函数的结构，与之前所述一致，通过[AST对象文档](https://developer.mozilla.org/en-US/docs/Mozilla/Projects/SpiderMonkey/Parser_API#Node_objects)可查到它的具体属性：
```
FunctionDeclaration{
    type: 'FunctionDeclaration',
    id: ...
    params: ...
    body: ...
}
```
你也可以继续使用console.log透视它的更内层，如：
```
console.log(add.params[0])
```
```
console.log(add.body.body[0].argument.left)
```

## recast.types.builders 制作模具

一个机器，你只会拆开重装，不算本事。

拆开了，还能改装，才算上得了台面。

recast.types.builders里面提供了不少“模具”，让你可以轻松地拼接成新的机器。

最简单的例子，我们想把之前的`function add(a, b){...}`声明，改成匿名函数式声明`const add = function(a ,b){...}`

如何改装？

第一步，我们创建一个VariableDeclaration变量声明对象，声明头为const， 内容为一个即将创建的VariableDeclarator对象。

第二步，创建一个VariableDeclarator，放置add.id在左边， 右边是将创建的FunctionDeclaration对象

第三步，我们创建一个FunctionDeclaration，如前所述的三个组件，id params body中，因为是匿名函数id设为空，params使用add.params，body使用add.body。

这样，就创建好了`const add = function(){}`的AST对象。

在之前的parse.js代码之后，加入以下代码
```
// 引入变量声明，变量符号，函数声明三种“模具”
const {variableDeclaration, variableDeclarator, functionExpression} = recast.types.builders

// 将准备好的组件置入模具，并组装回原来的ast对象。
ast.program.body[0] = variableDeclaration("const", [
  variableDeclarator(add.id, functionExpression(
    null, // Anonymize the function expression.
    add.params,
    add.body
  ))
]);

//将AST对象重新转回可以阅读的代码
const output = recast.print(ast).code;

console.log(output)
```
可以看到，我们打印出了
```
const add = function(a, b) {
  return a +
    // 有什么奇怪的东西混进来了
    b
};

```

最后一行
```
const output = recast.print(ast).code;
```
其实是recast.parse的逆向过程，具体公式为
```
recast.print(recast.parse(source)).code === source
```
打印出来还保留着“原装”的函数内容，连注释都没有变。

我们其实也可以打印出美化格式的代码段：
```
const output = recast.prettyPrint(ast, { tabWidth: 2 }).code
```

输出为
```
const add = function(a, b) {
  return a + b;
};

```

> 现在，你是不是已经产生了“我可以通过AST树生成任何js代码”的幻觉？

> 我郑重告诉你，这不是幻觉。

## 实战进阶：命令行修改js文件
除了parse/print/builder以外，Recast的三项主要功能：
- run: 通过命令行读取js文件，并转化成ast以供处理。
- tnt： 通过assert()和check()，可以验证ast对象的类型。
- visit: 遍历ast树，获取有效的AST对象并进行更改。

我们通过一个系列小务来学习全部的recast工具库：

创建一个用来示例文件，假设是demo.js

**demo.js**
```
function add(a, b) {
  return a + b
}

function sub(a, b) {
  return a - b
}

function commonDivision(a, b) {
  while (b !== 0) {
    if (a > b) {
      a = sub(a, b)
    } else {
      b = sub(b, a)
    }
  }
  return a
}
```

### recast.run —— 命令行文件读取

新建一个名为`read.js`的文件，写入
**read.js**
```
recast.run( function(ast, printSource){
    printSource(ast)
})
```

命令行输入
```
node read demo.js
```
我们查以看到js文件内容打印在了控制台上。

我们可以知道，`node read`可以读取`demo.js`文件，并将demo.js内容转化为ast对象。

同时它还提供了一个`printSource`函数，随时可以将ast的内容转换回源码，以方便调试。

### recast.visit —— AST节点遍历

**read.js**
```
#!/usr/bin/env node
const recast  = require('recast')

recast.run(function(ast, printSource) {
  recast.visit(ast, {
      visitExpressionStatement: function({node}) {
        console.log(node)
        return false
      }
    });
});
```


recast.visit将AST对象内的节点进行逐个遍历。

**注意**

- 你想操作函数声明，就使用visitFunctionDelaration遍历，想操作赋值表达式，就使用visitExpressionStatement。 只要在 [AST对象文档](https://developer.mozilla.org/en-US/docs/Mozilla/Projects/SpiderMonkey/Parser_API#Node_objects)中定义的对象，在前面加visit，即可遍历。
- 通过node可以取到AST对象
- 每个遍历函数后必须加上return false，或者选择以下写法，否则报错：

```
#!/usr/bin/env node
const recast  = require('recast')

recast.run(function(ast, printSource) {
  recast.visit(ast, {
      visitExpressionStatement: function(path) {
        const node = path.node
        printSource(node)
        this.traverse(path)
      }
    })
});
```

调试时，如果你想输出AST对象，可以`console.log(node)`

如果你想输出AST对象对应的源码，可以`printSource(node)`

命令行输入`
node read demo.js`进行测试。


> #!/usr/bin/env node 在所有使用recast.run的文件顶部都需要加入这一行，它的意义我们最后再讨论。

### TNT —— 判断AST对象类型

TNT，即recast.types.namedTypes，就像它的名字一样火爆，它用来判断AST对象是否为指定的类型。

TNT.Node.assert()，就像在机器里埋好的炸药，当机器不能完好运转时（类型不匹配），就炸毁机器(报错退出)

TNT.Node.check()，则可以判断类型是否一致，并输出False和True

上述Node可以替换成任意AST对象，例如TNT.ExpressionStatement.check(),TNT.FunctionDeclaration.assert()

**read.js**
```
#!/usr/bin/env node
const recast = require("recast");
const TNT = recast.types.namedTypes

recast.run(function(ast, printSource) {
  recast.visit(ast, {
      visitExpressionStatement: function(path) {
        const node = path.value
        // 判断是否为ExpressionStatement，正确则输出一行字。
        if(TNT.ExpressionStatement.check(node)){
          console.log('这是一个ExpressionStatement')
        }
        this.traverse(path);
      }
    });
});
```
**read.js**
```
#!/usr/bin/env node
const recast = require("recast");
const TNT = recast.types.namedTypes

recast.run(function(ast, printSource) {
  recast.visit(ast, {
      visitExpressionStatement: function(path) {
        const node = path.node
        // 判断是否为ExpressionStatement，正确不输出，错误则全局报错
        TNT.ExpressionStatement.assert(node)
        this.traverse(path);
      }
    });
});
```
命令行输入`
node read demo.js`进行测试。

### 实战：用AST修改源码，导出全部方法


exportific.js

现在，我们希望将demo中的function全部

我们想让这个文件中的函数改写成能够全部导出的形式，例如
```
function add (a, b) {
    return a + b
}
```
想改变为
```
exports.add = (a, b) => {
  return a + b
}
```

除了使用fs.read读取文件、正则匹配替换文本、fs.write写入文件这种笨拙的方式外，我们可以==用AST优雅地解决问题==。

查询[AST对象文档](https://developer.mozilla.org/en-US/docs/Mozilla/Projects/SpiderMonkey/Parser_API#Node_objects)

#### 首先，我们先用builders凭空实现一个键头函数
**exportific.js**
```
#!/usr/bin/env node
const recast = require("recast");
const {
  identifier:id,
  expressionStatement,
  memberExpression,
  assignmentExpression,
  arrowFunctionExpression,
  blockStatement
} = recast.types.builders

recast.run(function(ast, printSource) {
  // 一个块级域 {}
  console.log('\n\nstep1:')
  printSource(blockStatement([]))

  // 一个键头函数 ()=>{}
  console.log('\n\nstep2:')
  printSource(arrowFunctionExpression([],blockStatement([])))

  // add赋值为键头函数  add = ()=>{}
  console.log('\n\nstep3:')
  printSource(assignmentExpression('=',id('add'),arrowFunctionExpression([],blockStatement([]))))

  // exports.add赋值为键头函数  exports.add = ()=>{}
  console.log('\n\nstep4:')
  printSource(assignmentExpression('=',memberExpression(id('exports'),id('add')),
    arrowFunctionExpression([],blockStatement([]))))
});
```
上面写了我们一步一步推断出`exports.add = ()=>{}`的过程，从而得到具体的AST结构体。

使用`node exportific demo.js`运行可查看结果。

接下来，只需要在获得的最终的表达式中，把id('add')替换成遍历得到的函数名，把参数替换成遍历得到的函数参数，把blockStatement([])替换为遍历得到的函数块级作用域，就成功地改写了所有函数！

另外，我们需要注意，在commonDivision函数内，引用了sub函数，应改写成exports.sub

**exportific.js**
```
#!/usr/bin/env node
const recast = require("recast");
const {
  identifier: id,
  expressionStatement,
  memberExpression,
  assignmentExpression,
  arrowFunctionExpression
} = recast.types.builders

recast.run(function (ast, printSource) {
  // 用来保存遍历到的全部函数名
  let funcIds = []
  recast.types.visit(ast, {
    // 遍历所有的函数定义
    visitFunctionDeclaration(path) {
      //获取遍历到的函数名、参数、块级域
      const node = path.node
      const funcName = node.id
      const params = node.params
      const body = node.body

      // 保存函数名
      funcIds.push(funcName.name)
      // 这是上一步推导出来的ast结构体
      const rep = expressionStatement(assignmentExpression('=', memberExpression(id('exports'), funcName),
        arrowFunctionExpression(params, body)))
      // 将原来函数的ast结构体，替换成推导ast结构体
      path.replace(rep)
      // 停止遍历
      return false
    }
  })


  recast.types.visit(ast, {
    // 遍历所有的函数调用
    visitCallExpression(path){
      const node = path.node;
      // 如果函数调用出现在函数定义中，则修改ast结构
      if (funcIds.includes(node.callee.name)) {
        node.callee = memberExpression(id('exports'), node.callee)
      }
      // 停止遍历
      return false
    }
  })
  // 打印修改后的ast源码
  printSource(ast)
})
```

### 一步到位，发一个最简单的exportific前端工具

上面讲了那么多，仍然只体现在理论阶段。

但通过简单的改写，就能通过recast制作成一个名为exportific的源码编辑工具。

以下代码添加作了两个小改动
1. 添加说明书--help，以及添加了--rewrite模式，可以直接覆盖文件或默认为导出*.export.js文件。
2. 将之前代码最后的 printSource(ast)替换成  writeASTFile(ast,filename,rewriteMode)

**exportific.js**
```
#!/usr/bin/env node
const recast = require("recast");
const {
  identifier: id,
  expressionStatement,
  memberExpression,
  assignmentExpression,
  arrowFunctionExpression
} = recast.types.builders

const fs = require('fs')
const path = require('path')
// 截取参数
const options = process.argv.slice(2)

//如果没有参数，或提供了-h 或--help选项，则打印帮助
if(options.length===0 || options.includes('-h') || options.includes('--help')){
  console.log(`
    采用commonjs规则，将.js文件内所有函数修改为导出形式。

    选项： -r  或 --rewrite 可直接覆盖原有文件
    `)
  process.exit(0)
}

// 只要有-r 或--rewrite参数，则rewriteMode为true
let rewriteMode = options.includes('-r') || options.includes('--rewrite')

// 获取文件名
const clearFileArg = options.filter((item)=>{
  return !['-r','--rewrite','-h','--help'].includes(item)
})

// 只处理一个文件
let filename = clearFileArg[0]

const writeASTFile = function(ast, filename, rewriteMode){
  const newCode = recast.print(ast).code
  if(!rewriteMode){
    // 非覆盖模式下，将新文件写入*.export.js下
    filename = filename.split('.').slice(0,-1).concat(['export','js']).join('.')
  }
  // 将新代码写入文件
  fs.writeFileSync(path.join(process.cwd(),filename),newCode)
}


recast.run(function (ast, printSource) {
  let funcIds = []
  recast.types.visit(ast, {
    visitFunctionDeclaration(path) {
      //获取遍历到的函数名、参数、块级域
      const node = path.node
      const funcName = node.id
      const params = node.params
      const body = node.body

      funcIds.push(funcName.name)
      const rep = expressionStatement(assignmentExpression('=', memberExpression(id('exports'), funcName),
        arrowFunctionExpression(params, body)))
      path.replace(rep)
      return false
    }
  })


  recast.types.visit(ast, {
    visitCallExpression(path){
      const node = path.node;
      if (funcIds.includes(node.callee.name)) {
        node.callee = memberExpression(id('exports'), node.callee)
      }
      return false
    }
  })

  writeASTFile(ast,filename,rewriteMode)
})
```
现在尝试一下
```
node exportific demo.js
```
已经可以在当前目录下找到源码变更后的`demo.export.js`文件了。

### npm发包
编辑一下package.json文件
```
{
  "name": "exportific",
  "version": "0.0.1",
  "description": "改写源码中的函数为可exports.XXX形式",
  "main": "exportific.js",
  "bin": {
    "exportific": "./exportific.js"
  },
  "keywords": [],
  "author": "wanthering",
  "license": "ISC",
  "dependencies": {
    "recast": "^0.15.3"
  }
}
```
注意bin选项，它的意思是将全局命令`exportific`指向当前目录下的`exportific.js`

之后，只要哪个js文件想导出来使用，就`exportific XXX.js`一下。

这是在本地的玩法，想和大家一起分享这个前端小工具，只需要发布npm包就行了。

同时，一定要注意exportific.js文件头有
```
#!/usr/bin/env node
```
否则在使用时将报错。

#### 接下来，正式发布npm包！

如果你已经有了npm 帐号，请使用`npm login`登录

如果你还没有npm帐号 https://www.npmjs.com/signup 非常简单就可以注册npm

然后，输入
`npm publish`

没有任何繁琐步骤，丝毫审核都没有，你就发布了一个实用的前端小工具exportific 。任何人都可以通过
```
npm i exportific -g
```
全局安装这一个插件。

提示：==在试验教程时，请不要和我的包重名，修改一下发包名称。==

### 结语

我们对javascript再熟悉不过，但透过AST的视角，最普通的js语句，却焕发出精心动魄的美感。你可以通过它批量构建任何javascript代码！

童年时，这个世界充满了新奇的玩具，再普通的东西在你眼中都如同至宝。如今，计算机语言就是你手中的大玩具，一段段AST对象的拆分组装，构建出我们所生活的网络世界。

所以不得不说软件工程师是一个幸福的工作，你心中住的仍然是那个午后的少年，永远有无数新奇等你发现，永远有无数梦想等你构建。

![image](http://img.hb.aicdn.com/0f68442335482d9440e083598738a8a547a9763542cbd-zUQyLm_fw658)