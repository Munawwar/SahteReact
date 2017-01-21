/*global window, $, nunjucks, skateDomDiff*/

(function (factory) {
    window.Ninja = factory();
}(function () {
    var Ninja = {
        /**
         * String formatting
         * @param {String} str String with placeholders
         * @param {Object|...} arg If object then you can use {propertyName} as placeholder.
         * Else you can supply n number of args and use {argument index} as placholder
         * @method format
         * @example
         *
         *     Ninja.format('<div class="{0}">', 'box');
         *     Ninja.format('<div class="{cls}">', {cls: 'box'});
         *     //output of both: <div class="box">
         *
         */
        format: function (str, arg) {
            if (typeof arg !== 'object') {
                arg = Array.prototype.slice.call(arguments, 1);
            }
            return str.replace(/(^|[^\\])\{(\w+)\}/g, function (m, p, index) {
                var x = arg[index];
                return (p || '') + (x !== undefined ? x : '');
            });
        },

        /*Dom helpers*/
        /**
         * Converts html string to a document fragment.<br/>
         * The html string and arguments are first sent to Ninja.format to get the
         * final html string.
         * @param {String} html
         * @param {...} Any number of arguments that will be passed on to Ninja.format. Check Ninja.format documentation for more information.
         * @return {DocumentFragment}
         * @method dom
         */
        dom: function (html) {
            var frag = document.createDocumentFragment();
            $.parseHTML(Ninja.format.apply(this, arguments)).forEach(function (node) {
                frag.appendChild(node);
            });
            return frag;
        }
    };

    Ninja.View = function (config) {
        this.id = Ninja.View.generateUId();
        this._data = {};
        this.setConfig(config);

        var data = this.data;
        delete this.data;
        Object.defineProperty(this, 'data', {
            configurable: false,
            set: function (data) {
                data.$view = this;
                this._data = data;
                this.render();
            },
            get: function () {
                return this._data;
            }
        });
        //Trigger render.
        if (data) {
            this.data = data;
        }
    };

    // Methods and properties
    Object.assign(Ninja.View.prototype, {
        /**
         * The data object.
         * This is a private variable accessed through this.data
         * setter/getter.
         */
        _data: null,

        /**
         * The name of the preconmpiled nunjucks template to use.
         */
        template: null,

        /**
         * (Optional) The elment to replace (on first render).
         */
        target: null,

        /**
         * Sets config.
         */
        setConfig: function (config) {
            Object.assign(this, config);
        },

        /**
         * Set data on this.data (using Object.assign), and re-render.
         */
        assign: function (data) {
            Object.assign(this.data, data);
            this.render();
        },

        /**
         * Deep merge data with this.data, and re-render.
         */
        merge: function (data) {
            $.extend(true, this.data, data);
            this.render();
        },

        getHTML: function () {
            if (window.nunjucks) {
                return window.nunjucks.render(this.template, this.data);
            } else if (window.swig) {
                return window.swig.run(window.swig._precompiled[this.template], this.data, this.template);
            }
        },

        /**
         * Render view.
         * If this.target or node paramter is specified, then replaces that node and attaches the
         * rendered DOM to document (or document fragment). Else the render is in-memory.
         *
         * @param {Node} [node] The node to replace. If not sepcified, then searches
         * for the selector specified at this.target.
         *
         * @private
         */
        render: function () {
            // Step 1: Remove event listeners
            // Step 2: Note the currently focused element
            // Step 3: Render/Update UI.
            // Step 4: Resolve references
            // Step 5: Re-focus
            // Step 6: Re-attach listeners

            var source = this.el;

            // Step 1: Find input field focus, remember it's id attribute, so that it
            // can be refocused later.
            var focusId = document.activeElement.id;

            // Step 2: Remove event listeners before patch.
            if (source) {
                [source].concat(Array.from(source.querySelectorAll('*')))
                    .forEach(function (node) {
                        if (node.nodeType === 1) {
                            $(node).off();
                        }
                    }, this);
            }

            // Step 3: Render/Update UI
            var view = Ninja.dom(this.getHTML()),
                el = view.firstElementChild;

            // Update existing DOM.
            if (source) {
                var parent = source.parentNode,
                    childIndex = Array.from(parent.childNodes).indexOf(source);

                //Update UI (using DOM diff & patch).
                skateDomDiff.merge({
                    source: source,
                    destination: el
                });
                this.el = parent.childNodes[childIndex];
            } else {
                this.el = el;
            }

            this.el.ninjaView = this;

            // Step 4. Resolve element ref and refs.
            // Note:
            // ref creates a reference to the node as property on the view.
            // refs creates an array property on the view, into which the node is pushed.
            Array.from(this.el.querySelectorAll('[ref]')).forEach(function (node) {
                this[node.getAttribute('ref')] = node;
            }, this);

            var refs = Array.from(this.el.querySelectorAll('[refs]'));
            //Empty references first.
            refs.forEach(function (node) {
                this[node.getAttribute('ref')] = [];
            }, this);
            //Create reference.
            refs.forEach(function (node) {
                this[node.getAttribute('ref')].push(node);
            }, this);

            // Step 5: Re-focus
            if (focusId) {
                var focusEl = document.getElementById(focusId);
                if (focusEl) {
                    focusEl.focus();
                }
            }

            // Step 6: Attach event listeners.
            [this.el].concat(Array.from(this.el.querySelectorAll('*')))
                .forEach(function (node) {
                    if (node.nodeType === 1) {
                        Array.from(node.attributes).forEach(function (attr) {
                            if (attr.name.startsWith('on-')) {
                                $(node).on(attr.name.replace(/on-/, ''), this[attr.value].bind(this));
                            }
                        }, this);
                    }
                }, this);
        },

        mount: function (node) {
            if (!this.el) {
                return this.render(node);
            }

            if (!node && typeof this.target === 'string' && this.target) {
                node = document.querySelector(this.target);
            }

            //Return if already mounted.
            if (this.el && node === this.el) {
                return;
            }

            if (node && node.parentNode) {
                var parent = node.parentNode,
                    childIndex = Array.from(parent.childNodes).indexOf(node);

                //Update UI (using DOM diff & patch).
                skateDomDiff.merge({
                    source: node,
                    destination: this.el
                });
                this.el = parent.childNodes[childIndex];
                this.el.ninjaView = this;
            }
        }
    });

    // Static methods and properties
    Object.assign(Ninja.View, {
        uid: 1,
        generateUId: function () {
            var id = 'view-' + Ninja.View.uid;
            Ninja.View.uid += 1;
            return id;
        }
    });

    return Ninja;
}));
