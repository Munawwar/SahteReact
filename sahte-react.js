/*global window, $*/

(function (factory) {
    window.SahteReact = factory();
    window.SahteStore = window.SahteReact.store;
})(function () {
    const idMap = new WeakMap();
    var utils = {
        // Deep merge helper
        merge: function merge(out) {
            out = out || {};
            for (var argIndex = 1; argIndex < arguments.length; argIndex += 1) {
                var obj = arguments[argIndex];
                if (!obj || typeof val !== 'object') {
                    continue;
                }
                var keys = Object.keys(obj);
                for (var keyIndex = 1; keyIndex < keys.length; keyIndex += 1) {
                    var key = keys[keyIndex];
                    var val = obj[key];
                    out[key] = (typeof val === 'object' && val !== null)
                        ? utils.merge(out[key], val)
                        : val;
                }
            }
            return out;
        },

        /**
         * Generates an unique alpha-numeric identifier.<br/>
         * To get the same permutation as RFC-4122 use len=24.
         * @param {Number} [len=11] Length of the UUID.
         * @return {String} The UUID
         * @method uuid
         */
        uuid: function (len = 11) {
            return 'x'.repeat(len).replace(/x/g, function () {
                return (Math.random() * 36 | 0).toString(36);
            });
        },

        /**
         * Send in any object (including function, DOM Nodes or whatever) and get a unique id.
         * If you send the object again, the same id will be returned as the last time.
         * This does not leak memory.
         * @method getUID
         */
        getUID: function getUID(obj, create = true) {
            var id = idMap.get(obj);
            if (!id && create) {
                id = utils.uuid();
                idMap.set(obj, id);
            }
            return id;
        },

        /*Dom helpers*/
        /**
         * Converts html string to a document fragment.
         * @param {String} html
         * @return {DocumentFragment}
         * @method dom
         */
        dom: function dom(html) {
            const supportsTemplate = 'content' in document.createElement('template');
            if (supportsTemplate) {
                var templateTag = document.createElement('template');
                templateTag.innerHTML = html;
                return templateTag.content;
            } else if (window.jQuery && window.jQuery.parseHTML) { // IE 11 (jquery fallback)
                var frag = document.createDocumentFragment();
                var nodes = window.jQuery.parseHTML(html);
                nodes.forEach(function (node) {
                    frag.appendChild(node);
                });
                return frag;
            } else { // fallback to our parseHTML function which we extracted out from jquery)
                return window.parseHTML(html);
            }
        },

        /**
         * Helper to attach handleEvent object event listener to element.
         * @param {HTMLElement} node
         * @param {Object} context
         * @param {String} eventName
         * @param {Function} func
         * @method dom
         */
        on: function on(node, context, eventName, func) {
            node._bindings = node._bindings || {};
            node._bindings[eventName] = func;
            // add func to id mapping
            utils.getUID(func);
            node.addEventListener(eventName, context);
        },
        
        /**
         * Removes all event handlers on node. Ensure same context is passed as it
         * was for on() method, else the event listeners wont get removed.
         */
        off: function off(node, context) {
            if (node._bindings) {
                Object.keys(node._bindings).forEach(function (eventName) {
                    node.removeEventListener(eventName, context);
                });
                delete node._bindings;
            }
        }
    };

    /**
     * @template DataType
     * @param {Object} config 
     * @param {HTMLElement} config.target
     * @param {DataType} config.data
     * @param {(data: DataType) => String} config.getHtml
     * @param {Boolean} [config.mount=false]
     * @param {Boolean} [config.hydrate=false]
     * @param {String[]} config.connect
     */
    var SahteReact = function (config) {
        this.id = SahteReact.generateUId();
        this._data = {};
        var data = config.data;
        if (data && typeof data === 'object') {
            this._data = data;
        }
        var mount = config.mount;
        var hydrate = config.hydrate;
        
        delete config.data;
        delete config.mount;
        delete config.hydrate;
        Object.assign(this, config);

        Object.defineProperty(this, 'data', {
            configurable: false,
            set: function (data) {
                this._data = data;
                this.render();
            },
            get: function () {
                return this._data;
            }
        });
        if (hydrate) {
            this.hydrate()
        } else if (mount) {
            this.mount();
        }
    };

    // Static methods and properties
    Object.assign(SahteReact, {
        uid: 1,
        utils: utils,
        generateUId: function () {
            var id = 'view-' + SahteReact.uid;
            SahteReact.uid += 1;
            return id;
        },

        getHtml: function () { return ''; },

        // a global store for Sahte views (it's like a singleton global redux store)
        // it only does a shallow (i.e level 1) equality check of the store data properties
        // for notifying relevant connected views to re-render
        store: {
            _data: {},
            subscribers: [],
            subscribe: function (func, propsToListenFor, context) {
                if (typeof func !== 'function' || !Array.isArray(propsToListenFor)) {
                    return;
                }
                var alreadyAdded = this.subscribers.some(function (subscriber) {
                    return (subscriber.callback === func && (context === undefined || context === subscriber.context));
                });
                if (!alreadyAdded) {
                    this.subscribers.push({
                        callback: func,
                        props: propsToListenFor,
                        context: context
                    });
                }
            },
            unsubscribe: function (func, context) {
                this.subscribers = this.subscribers.filter(function (subscriber) {
                    return !(subscriber.callback === func && (context === undefined || context === subscriber.context));
                });
            },
            assign: function (newData) {
                if (typeof newData !== 'object') {
                    return;
                }
                var currentData = this._data;
                var changedProps = Object.keys(newData).filter(function (prop) {
                    return currentData[prop] !== newData[prop];
                });
                Object.assign(this._data, newData);
                this.notify(changedProps);
            },
            notify: function (changedProps) {
                var changedPropsLookup = changedProps.reduce(function (acc, prop) {
                    acc[prop] = 1;
                    return acc;
                }, {});
                this.subscribers.forEach(function (subscriber) {
                    var matches = subscriber.props.some(function (prop) {
                        if (typeof prop !== 'string') {
                            return false;
                        }
                        return changedPropsLookup[prop];
                    });
                    if (matches) {
                        subscriber.callback.call(subscriber.context);
                    }
                });
            }
        }
    });

    Object.defineProperty(SahteReact.store, 'data', {
        configurable: false,
        set: function (data) {
            if (typeof data !== 'object') {
                return;
            }
            var currentData = this._data;
            var changedProps = Object.keys(data).filter(function (prop) {
                return currentData[prop] !== data[prop];
            });
            this._data = data;
            this.notify(changedProps);
        },
        get: function () {
            return this._data;
        }
    });


    // Methods and properties
    Object.assign(SahteReact.prototype, {
        /**
         * The data object.
         * This is a private variable accessed through this.data
         * setter/getter.
         */
        _data: null,

        /**
         * (Optional) The elment to replace (on first render).
         */
        target: null,

        /**
         * (Optional) An array of props to listen to from SahteReact.store (it's a global state store)
         * This instance will re-render (when mounted) when the specified props change in the global store
         * Example: ['cart', 'wishlist']
         */
        connect: null,
        
        /**
         * Set data on this.data (using Object.assign), and re-render.
         */
        assign: function () {
            var args = Array.prototype.slice.call(arguments);
            Object.assign.apply(Object, [this.data].concat(args));
            this.render();
        },

        /**
         * Deep merge data with this.data, and re-render.
         */
        merge: function (data) {
            utils.merge(this.data, data);
            this.render();
        },

        handleEvent: function handleEvent(event) {
            var node = event.currentTarget;
            var self = this;
            const func = node._bindings[event.type];
            // check if array was not tampered
            if (utils.getUID(func, false)) {
                func.call(self, event);
            }
        },

        /**
         * Render view.
         * If this.target or node paramter is specified, then replaces that node and attaches the
         * rendered DOM to document (or document fragment).
         *
         * @private
         */
        render: function render() {
            // Step 1: Remove event listeners
            // Step 2: Note the currently focused element
            // Step 3: Render/Update UI.
            // Step 4: Resolve references
            // Step 5: Re-focus
            // Step 6: Re-attach listeners

            var target = this.el;

            // Step 1: Find input field focus, remember it's id attribute, so that it
            // can be refocused later.
            var focusId = document.activeElement.id;

            // Step 2: Remove event listeners before patch.
            if (target) {
                [target].concat(Array.from(target.querySelectorAll('*')))
                    .forEach(function (node) {
                        if (node.nodeType === 1) {
                            utils.off(node, this);
                        }
                    }, this);
            }

            // Step 3: Render/Update UI
            var storeData = SahteReact.store._data;
            var storeDataSubset = (this.connect || []).reduce(function (acc, prop) {
                acc[prop] = storeData[prop];
                return acc;
            }, {});
            var data = Object.assign(storeDataSubset, this.data);
            var view = utils.dom(this.getHtml(data));
            var el = view.firstElementChild;

            // Update existing DOM.
            if (target) {
                var parent = target.parentNode,
                    childIndex = Array.from(parent.childNodes).indexOf(target);

                // Update UI using https://github.com/WebReflection/domdiff
                window.domdiff(
                    parent,
                    [target],
                    [el],
                );
                this.el = parent.childNodes[childIndex];
            } else {
                this.el = el;
            }

            // Step 4: Re-focus
            if (focusId) {
                var focusEl = document.getElementById(focusId);
                if (focusEl) {
                    focusEl.focus();
                }
            }

            this.domHydrate();
        },

        /**
         * @private
         */
        domHydrate: function domHydrate() {
            // Doing step 5 and 6 from render() function
            // Step 5: Resolve references
            // Step 6: Attach listeners
            var self = this;

            // TODO: only set this on debug mode
            self.el.sahteReactInstance = self;

            // Step 5. Resolve element ref and refs.
            // Note:
            // ref creates a reference to the node as property on the view.
            // refs creates an array property on the view, into which the node is pushed.
            Array.from(self.el.querySelectorAll('[ref]')).forEach(function (node) {
                self[node.getAttribute('ref')] = node;
            });

            var refs = Array.from(self.el.querySelectorAll('[refs]'));
            // Reset references first
            refs.forEach(function (node) {
                self[node.getAttribute('ref')] = [];
            });
            // Create reference.
            refs.forEach(function (node) {
                self[node.getAttribute('ref')].push(node);
            });

            // Step 6: Attach event listeners.
            [self.el].concat(Array.from(self.el.querySelectorAll('*')))
                .forEach(function (node) {
                    if (node.nodeType === 1) {
                        Array.from(node.attributes).forEach(function (attr) {
                            if (attr.name.startsWith('on-')) {
                                var eventName = attr.name.replace(/on-/, '');
                                utils.on(node, self, eventName, self[attr.value]);
                            }
                        });
                    }
                });
        },

        /**
         * @param {Boolean} [hydrateOnly=false] does a full render by default. 'Hydration' only
         * attaches event listeners and resolves refs.
         * @returns 
         */
        mount: function mount(hydrateOnly = false) {
            if (this.connect) {
                SahteReact.store.subscribe(this.render, this.connect, this);
            }

            var node = this.target;
            if (typeof node === 'string') {
                node = document.querySelector(node);
            }

            // Return if already mounted.
            if (this.el && node === this.el) {
                return;
            }

            if (node && node.parentNode) {
                this.el = node;
                if (hydrateOnly) {
                    this.domHydrate();
                } else { // full render
                    this.render();
                }
            }
        },

        hydrate: function hydrate(data) {
            if (arguments.length > 0 && data && typeof data === 'object') {
                this._data = data;
            }
            this.mount(true);
        },

        append: function append(node) {
            if (this.connect) {
                SahteReact.store.subscribe(this.render, this.connect, this);
            }

            if (!this.el) {
                this.render();
            }
            node.appendChild(this.el);
        },

        unmount: function unmount() {
            SahteReact.store.unsubscribe(this.render, this.connect);
            this.el.parentNode.removeChild(this.el);
        }
    });

    return SahteReact;
});
