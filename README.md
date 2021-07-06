## Pepper

Reuse your server side templates on the client side. Pepper some client-side JS after serving the HTML.

Use template libraries like mustache, handlebars, jade.. (any that can compile to JS)

Benefit of mustache/handlebars is that it runs on several server-side languages, making SSR more possible if you don't want to or cannot use JS on server-side.

### Example

```html
<!DOCTYPE html>
<html>
    <head>
        <script src="https://unpkg.com/udomdiff@1.1.0/min.js"></script>
        <script src="pepper.js"></script>
    </head>
    <body>
        <div id="node-to-sync"></div>
        <script>
            var view = new Pepper({
                getHtml: (data) => `<div>${data.text}</div>`,
                data: { text: 'Test' },
                target: '#node-to-sync', // optional
                
                onClick: function () {
                    console.log('Clicked!');
                }
            });
            view.mount();
            // or if you want to only hydrate, call view.hydrate()
            // or if no target specified, do view.append(document.body)
        </script>
    </body>
</html>
```

**Important note**: The template HTML should be wrapped inside a single HTML tag. In other words, Pepper assumes the template has a single root element. If not, then Pepper would take the first element (as root) and ignore the rest.

### Update data and view

```js
view.data = { text: 'Test 2' }; // uses setter to detect change
```
Or use `view.assign()` to not overwrite existing props

`view.assign`'s signature is exactly like `Object.assign()`.

**Note**: Updating states updates the DOM immediately (synchronous/blocking call). So it is generally a good idea to reduce state changes to a single call per user action.. for example a click action would call `view.assign()` only once. You can use temporary objects if needed to reduce calls.

### Refs to DOM nodes

```html
<div on-click="onClick">
    <span ref="spanEl">{{ text }}</span>
</div>
```

Now you can use `this.spanEl` (inside a view method) or `view.spanEl` (from outside) to access the span element.

### Debug access

One can do `rootElement.pepperInstance` to get access to the view object from the developer tools. It is only for
debugging purposes. Never use it in code.

### Pepper State Store - AKA performance improvement for large views

Pepper comes with a simplified global state store, so that you can have multiple views with common states stored in it. Updating the store data will re-render connected views automatically.

```js
// initialize global store
Pepper.store.assign({
    counter: 1
});

// create some views that use the store data.
var view1 = new Pepper({
    // if you want to be able to access a property from the store, then
    // you need to explicitly "connect" to that property. This is a performance
    // optimization (like redux).
    connect: ['counter'],
    getHtml: data => `<div><span>Counter = ${ data.counter }</span></div>`,
    target: '#myview1',
    mount: true,
});
var view2 = new Pepper({
    getHtml: `<div><span>Counter = ${ data.counter }</span></div>`,
    connect: ['counter'],
    target: '#myview2',
    mount: true,
});

// demonstrating how updating one data source, re-renders multiple views
// so.. update counter
var incrementCounterAction = function () {
    Pepper.store.assign({
        counter: Pepper.store.data.counter + 1
    });
};
window.setInterval(incrementCounterAction, 1000);
```

Note that if you don't "connect" your view to specific properties from the Pepper store, then you cannot access those property at all.

Also note; I have moved the code that manipulates the central store (data side effects) to separate function(s) (i.e action). Even though this is completely optional, I would recommended always doing it that way, since it is later easier to find out what's manipulating the central store. If you put this code in the view it gets mixed with UI code and would be harder to find later.

Important note: This is a performance optimization in disguise. You can naively put all your HTML within a single Pepper view and all the states within it.
But that could take a hit on rendering performance. So Pepper Store gives you an option to make smaller views, while keeping the rest of the HTML static, and refresh only the views that needs a refresh (with some manual "connecting" from the developer's end).

### Security

Templates allow script and style tags. Therefore do not execute untrusted HTML (without running it through an HTML sanitizer first).

### Browser compatibility

Supports every browser as GOV UK (2021) - https://www.gov.uk/service-manual/technology/designing-for-different-browsers-and-devices#browsers-to-test-in-from-january-2021

(currently includes IE 11, Safari 12 and Samsung Internet)

*But* for IE 11, you either need to include jquery or [parseHtml() function](./parseHTML.js) (extracted out from jquery).