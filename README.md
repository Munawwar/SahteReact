## SahteReact

Reuse your server side templates on the client side.. react-ish style.

Uses template libraries (like nunjucks, doT or swig) and dom diff.

( "Sahte" means "fake" in Turkish ;) )

Sahte React is pretty small - at the moment Sahte React + doT template library minified & gzipped weighs only 3.88 KB

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
        <script src="sahte-react.js"></script>

        <script src="mytemplate.js"></script>
    </head>
    <body>
        <div id="node-to-sync"></div>
        <script>
            var view = new SahteReact({
                template: 'mytemplate',
                data: { text: 'Test' },
                target: '#node-to-sync', // optional

                onClick: function () {
                    console.log('Clicked!');
                }
            });
            view.mount();
            // or if you don't want to use target prop, but want to append to document body:
            // view.append(document.body)
        </script>
    </body>
</html>
```

**Important note**: The template HTML should be wrapped inside a single HTML tag. In other words, SahteReact assumes the template has a single root element. If not, then Sahte would take the first element (as root) and ignore the rest.

**Note 2**: `view.mount()` or `view.append()` will update DOM immediately (synchronous/blocking call).

### But I want to use X templating engine!!

Simplest way to achieve this is to override SahteReact's default `getHTML()` methods.

```js
SahteReact.prototype.getHTML = function (data) {
  return myFunkyTemplateEngine(this.template, data);
};
```

Hoewever if your templating engine supports pre-compiling (which makes rendering much faster), then it's better to set it up like so:
```js
SahteReact.compile = function (template) {
  return myFunkyTemplateEngine.compile(template);
};

SahteReact.prototype.getHTML = function (data) {
  return this.template(data);
};
```

If you don't want to use any template engine then override your `getHTML()` function per instance
(and don't set `template` property on the instance of course)

```js
var view = new SahteReact({
    // ...
    
    getHTML: function (data) {
        return `<div>${data.text}</div>`;
    }
});
```

### How to update the view?

```js
view.data = { text: 'Test 2' }; //uses setter to detect change
```
Or use `view.assign()` to not overwrite existing props

`view.assign`'s signature is exactly like `Object.assign()`.

**Note**: Updating states updates the DOM immediately (synchronous/blocking call). So it is generally a good idea to reduce state changes to a single call per user action.. for example a click action would call `view.assign()` only once. You can use temporary objects if needed to reduce calls.

### Quick access to DOM nodes

```html
<div on-click="onClick">
    <span ref="spanEl">{{ text }}</span>
</div>
```

Now you can use `this.spanEl` (inside a view method) or `view.spanEl` (from outside) to access the span element.

### Debug access

One can do `rootElement.sahteReactInstance` to get access to the view object from the developer tools. It is only for
debugging purposes. Never use it in code.

### Sahte "Redux"

Sahte React comes with a simplified singleton redux-like state store, so that you can have multiple views with common states stored in there. Updating the store data will re-render connected views automatically.

If you don't "connect" your view to specific properties, then changes to those states will not cause the view to refresh.

```js
// initialize global store
SahteStore.assign({
    counter: {
        value: 1
    }
});

// create some views that use the store data.
// all of the store's properties are accessible through property named 'props'
// from within the view.
var view1 = new SahteReact({
    template: `<div><span>Counter = {{= it.props.counter.value }}</span></div>`,
    // furthermore, if you want the component to get updated when the store data changes
    // you need to explicitly "connect" to that property.. i.e you must say which properties
    // of the store should cause this view to re-render. This is a performance optimization
    // like redux.
    connect: ['counter'],
    target: '#myview1'
});
var view2 = new SahteReact({
    template: `<div><span>Counter = {{= it.props.counter.value }}</span></div>`,
    connect: ['counter'],
    target: '#myview2'
});
view1.mount();
view2.mount();

// demonstrating how updating one data source, re-renders multiple views
// so.. update counter
window.setInterval(function () {
    SahteStore.assign({
        counter: {
            value: SahteStore.data.counter.value + 1
        }
    });
}, 1000);
```
This whole thing is a disguised performance optimization. You can naively put all your HTML within a single SahteReact view and the states within it.
But.. that could take a hit on rendering performance. So Sahte "Redux" gives you an option to make multiple views and refresh only the views that needs refresh (with some manual "connecting").


### Template precompiling for tests folder

nunjucks example:
```
nunjucks/bin/precompile --name mytemplate mytemplate.html > mytemplate.js
```

swig example:
```
swig/bin/swig.js compile mytemplate.html --wrap-start="swig._precompiled = swig._precompiled || {};
swig._precompiled['mytemplate'] = " > mytemplate.js
```
