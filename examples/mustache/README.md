Compiling mustache template to JS function:

Using hogan.js
```sh
npm i -g hogan.js
hulk button.mustache --variable mustacheTemplates > button.js
```


For templates that are not using partials use minstache.js
```sh
npm i -g minstache terser
minstache < button.mustache > button.js
# convert it to hogan.js style
sed -E 's/module.exports = /(window.mustacheTemplates = window.mustacheTemplates || {})["button"] = { render: /' button.js > button.jstemp
echo "}" >> button.jstemp;
terser button.jstemp -mc -o button.js
rm button.jstemp
```