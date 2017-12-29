## Ninja

A client-side library to keep UI in sync.

Uses template libraries (like nunjucks, doT or swig) and dom diff.

### Why?

I am working on a project that is using swig & jquery and is difficult to refactor to React or Vue.
So.. improvising... this library can reduce the amount of jquery needed to update the view, by
reusing the server-side swig templates on the browser wherever possible.

### Example

mytemplate.html (precompile it to mytemplate.js using nunjucks  `precompile` tool or swig `compile` CLI)
```html
<div on-click="onClick">
    {{ text }}
</div>
```

index.html:
```html
<!DOCTYPE html>
<html>
    <head>
        <script src="jquery.js"></script>

        <script src="template-library/nunjucks-slim.min.js"></script>
        <script src="dom-diff.js"></script>
        <script src="ninja.js"></script>

        <script src="mytemplate.js"></script>
    </head>
    <body>
        <div id="node-to-sync"></div>
        <script>
            var view = new Ninja.View({
                template: 'mytemplate',
                data: { text: 'Test' },
                target: '#node-to-sync',

                onClick: function () {
                    console.log('Clicked!');
                }
            });
            view.mount();
        </script>
    </body>
</html>
```

### Precompiling command

nunjucks example:
```
nunjucks/bin/precompile --name mytemplate mytemplate.html > mytemplate.js
```

swig example:
```
swig/bin/swig.js compile mytemplate.html --wrap-start="swig._precompiled = swig._precompiled || {};
swig._precompiled['mytemplate'] = " > mytemplate.js
```

### How to update the view?

```
view.data = { text: 'Test 2'}; //uses setter to detect change
```
Or use view.assign() or view.merge();

view.assign uses Object.assign, and view.merge does deep merge.

### Quick access to DOM nodes

```html
<div on-click="onClick">
    <span ref="spanEl">{{ text }}</span>
</div>
```

Now you can use `this.spanEl` (inside a view method) or 'view.spanEl` (from outside) to access the span element.

### Debug access

One can do `rootElement.ninjaView` to get access to the view object from the developer tools. It is only for
debugging purposes. Never use it in code.
