## SahteReact

Reuse your server side templates on the client side.. react-ish style.

Uses template libraries (like nunjucks, liquid js, doT, swig..) and dom diff.

( "Sahte" means "fake" in Turkish ;) )

SahteReact is pretty small - at the moment SahteReact + doT template library minified & gzipped weighs only 4.4 KB

### Why?

Reason 1:
You are working on a shopify template that uses liquid template language. Shopify fortunately gives API to implement a custom front-end but you don't want to maintain a custom front-end. You want to stick to shopify's FE as much as posssible. You do have control over the server liquid js (part of your shopify template) and all you want more is to reuse them on the browser.

Reason 2:
You page is mostly static. You are probbaly using a static site generator like jekyll that uses a templating language. You don't think it is necessary to switch a dynamic FE framework like React/Gatsby and all you need is to add some pockets of interactivity without writing the view twice - once on server (via templating) and another on the client (via JS).

Reason 3: Legacy project
I was working on a project that was using swig & jquery and was difficult to refactor to React or Vue.
This library can reduce the amount of jquery needed to update the view, by reusing the server-side templates on the browser wherever possible.

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

### Global state manager - Sahte Store

SahteReact comes with a simplified global state store, so that you can have multiple views with common states stored in it. Updating the store data will re-render connected views automatically.

```js
// initialize global store
SahteStore.assign({
    counter: {
        value: 1
    }
});

// create some views that use the store data.
var view1 = new SahteReact({
    // if you want to be able to access a property from the store, then
    // you need to explicitly "connect" to that property. This is a performance
    // optimization (like redux selectors).
    connect: ['counter'],
    template: `<div><span>Counter = {{= it.counter.value }}</span></div>`,
    target: '#myview1'
});
var view2 = new SahteReact({
    connect: ['counter'],
    template: `<div><span>Counter = {{= it.counter.value }}</span></div>`,
    target: '#myview2'
});
view1.mount();
view2.mount();

// demonstrating how updating one data source, re-renders multiple views
// so.. update counter
var incrementCounterAction = function () {
    SahteStore.assign({
        counter: {
            value: SahteStore.data.counter.value + 1
        }
    });
};
window.setInterval(incrementCounterAction, 1000);
```

Note that if you don't "connect" your view to specific properties from the sahte store, then you cannot access those property at all. Your templating engine would throw errors.

Also note; I have moved the code that manipulates the central store (data side effects) to separate function(s) (i.e action). Even though this is completely optional, I would recommended always doing it that way, since it is later easier to find out what's manipulating the central store. If you put this code in the view it gets mixed with UI code and would be harder to find later.

Important note: This whole thing is a disguised performance optimization. You can naively put your entire page's HTML and states into a single SahteReact view.
But.. that means any state change wil re-render entire page and that could be slow render performance. So Sahte Store gives you an option to make multiple views mounted to specific parts of a page, sharing global states, and refresh only the views that needs refresh (with some manual "connecting" from the developer's end).

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
