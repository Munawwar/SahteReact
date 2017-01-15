## Ninja

A client-side library to keep UI in sync.

Uses nunjucks and skatejs/dom-diff.

### Example

mytemplate.html (precompile it to mytemplate.js using nunjucks  `precompile` tool)
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

        <script src="skatejs-dom-diff.js"></script>
        <script src="nunjucks-slim.min.js"></script>
        <script src="ninja.js"></script>

        <script src="mytemplate.js"></script>
    </head>
    <body>
        <div id="node-to-change"></div>
        <script>
            var view = new Ninja.View({
                template: 'mytemplate',
                data: { text: 'Test' },
                target: '#node-to-change',

                onClick: function () {
                    console.log('Clicked!');
                }
            });
            view.mount();
        </script>
    </body>
</html>
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
